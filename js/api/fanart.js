// ==========================
// FANART.TV (transparent title logos) — free personal key
// ==========================
// Get a key at https://fanart.tv/get-an-api-key/ and paste it in Settings.
// Used to show a stylised logo instead of plain text on hero banners.
(function (MyFlix) {
    const { getJson, cached } = MyFlix.utils;
    const BASE = "https://webservice.fanart.tv/v3";

    const key = () => MyFlix.store.getSetting("fanartKey");
    const enabled = () => Boolean(key());

    // Prefer an English HD logo with the most likes.
    function pick(list) {
        if (!list?.length) return null;
        const sorted = list.slice().sort((a, b) => (+b.likes || 0) - (+a.likes || 0));
        return (sorted.find(l => l.lang === "en") || sorted.find(l => !l.lang || l.lang === "00") || sorted[0]).url;
    }

    function movieLogo(tmdbOrImdbId) {
        if (!enabled() || !tmdbOrImdbId) return Promise.resolve(null);
        return cached(`fanart:m:${tmdbOrImdbId}`, 14, async () => {
            try {
                const d = await getJson(`${BASE}/movies/${encodeURIComponent(tmdbOrImdbId)}?api_key=${encodeURIComponent(key())}`);
                return pick(d.hdmovielogo) || pick(d.movielogo);
            } catch (err) {
                if (err.status === 404) return null;
                throw err;
            }
        });
    }

    function tvLogo(tvdbId) {
        if (!enabled() || !tvdbId) return Promise.resolve(null);
        return cached(`fanart:tv:${tvdbId}`, 14, async () => {
            try {
                const d = await getJson(`${BASE}/tv/${encodeURIComponent(tvdbId)}?api_key=${encodeURIComponent(key())}`);
                return pick(d.hdtvlogo) || pick(d.clearlogo);
            } catch (err) {
                if (err.status === 404) return null;
                throw err;
            }
        });
    }

    // Logo for any MYFLIX title (movie, TVMaze show or TMDB show).
    async function logoFor(t) {
        if (!enabled() || !t) return null;
        try {
            if (t.kind === "movie") return await movieLogo(t.id);
            if (t.kind === "tv") {
                const tvdb = t.raw?.externals?.thetvdb ?? (await MyFlix.tvmaze.show(t.id)).externals?.thetvdb;
                return await tvLogo(tvdb);
            }
            if (t.kind === "tmdbtv" && MyFlix.tmdb.enabled()) {
                const tv = await MyFlix.tmdb.tv(t.id);
                return await tvLogo(tv.external_ids?.tvdb_id);
            }
        } catch { /* no logo is fine */ }
        return null;
    }

    async function testKey(k) {
        const res = await fetch(`${BASE}/movies/603?api_key=${encodeURIComponent(k)}`);
        if (res.status === 401 || res.status === 403) throw Object.assign(new Error("Invalid key"), { status: 401 });
        if (!res.ok && res.status !== 404) throw new Error(`fanart.tv responded with ${res.status}`);
    }

    MyFlix.fanart = { enabled, logoFor, testKey };
})(window.MyFlix = window.MyFlix || {});
