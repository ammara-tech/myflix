// ==========================
// INTERNET ARCHIVE (free, legal classic films) — no key
// ==========================
// Finds a playable MP4 for a Classic film:
//  1. try the film's known archiveIds
//  2. otherwise search archive.org by title + year
// The answer is remembered for 30 days so the next play starts instantly.
(function (MyFlix) {
    const { getJson, cached } = MyFlix.utils;
    const BASE = "https://archive.org";

    // Rank the MP4 files in one Archive item; best first.
    function bestFile(files, film) {
        // skip clips and trailers (browse items set their own minimum)
        const minBytes = (film.minMB != null ? film.minMB : Math.max(4, film.runtime * 1.2)) * 1e6;
        const mp4s = files.filter(f =>
            /\.mp4$/i.test(f.name) &&
            !/trailer|sample|preview|clip|_thumb/i.test(f.name) &&
            (!f.size || +f.size >= minBytes)
        );
        const score = f => {
            const fmt = (f.format || "").toLowerCase();
            if (fmt.includes("h.264") && !fmt.includes("hd")) return 3;   // good quality, streams well
            if (fmt.includes("512kb")) return 2;                            // small, very reliable
            if (fmt.includes("mpeg4")) return 1.5;
            return 1;
        };
        return mp4s.sort((a, b) => score(b) - score(a))[0] || null;
    }

    // Guess a readable language name from a subtitle file name.
    const LANGS = [
        [/(^|[^a-z])(en|eng|english)([^a-z]|$)/i, "en", "English"], [/(^|[^a-z])(es|spa|spanish|espanol)([^a-z]|$)/i, "es", "Español"],
        [/(^|[^a-z])(fr|fre|fra|french)([^a-z]|$)/i, "fr", "Français"], [/(^|[^a-z])(de|ger|deu|german)([^a-z]|$)/i, "de", "Deutsch"],
        [/(^|[^a-z])(pt|por|portuguese)([^a-z]|$)/i, "pt", "Português"], [/(^|[^a-z])(it|ita|italian)([^a-z]|$)/i, "it", "Italiano"],
        [/(^|[^a-z])(nl|dut|dutch)([^a-z]|$)/i, "nl", "Nederlands"], [/(^|[^a-z])(ru|rus|russian)([^a-z]|$)/i, "ru", "Русский"],
        [/(^|[^a-z])(ja|jp|jpn|japanese)([^a-z]|$)/i, "ja", "日本語"], [/(^|[^a-z])(zh|chi|chs|cht|chinese)([^a-z]|$)/i, "zh", "中文"]
    ];
    function subtitleTrack(identifier, name) {
        const base = name.replace(/\.(srt|vtt)$/i, "");
        const hit = LANGS.find(([re]) => re.test(base));
        return {
            lang: hit ? hit[1] : "und",
            label: hit ? hit[2] : `Subtitles (${base.length > 24 ? base.slice(0, 22) + "…" : base})`,
            url: `${BASE}/download/${encodeURIComponent(identifier)}/${name.split("/").map(encodeURIComponent).join("/")}`
        };
    }

    async function tryItem(identifier, film) {
        try {
            const meta = await getJson(`${BASE}/metadata/${encodeURIComponent(identifier)}`);
            if (!meta?.files || meta.is_dark) return null;
            const file = bestFile(meta.files, film);
            if (!file) return null;
            const subtitles = meta.files
                .filter(f => /\.(srt|vtt)$/i.test(f.name))
                .map(f => subtitleTrack(identifier, f.name));
            return {
                identifier,
                subtitles,
                url: `${BASE}/download/${encodeURIComponent(identifier)}/${file.name.split("/").map(encodeURIComponent).join("/")}`,
                poster: `${BASE}/services/img/${encodeURIComponent(identifier)}`,
                page: `${BASE}/details/${encodeURIComponent(identifier)}`
            };
        } catch {
            return null;
        }
    }

    // The Archive's curated film collections: searched first so a generic
    // title like "Summer" doesn't match a random home video.
    const FILM_COLLECTIONS = "feature_films OR classic_cartoons OR film_noir OR silent_films OR SciFi_Horror OR Comedy_Films OR classic_tv OR prelinger OR opensource_movies OR animationandcartoons OR publicdomainmovies";

    async function searchIds(film, withYear, curated) {
        const title = film.title.replace(/[":()!?.,']/g, " ").replace(/\s+/g, " ").trim();
        let q = `title:(${title}) AND mediatype:(movies) AND NOT title:(trailer)`;
        if (withYear) q += ` AND year:[${film.year - 1} TO ${film.year + 1}]`;
        if (curated) q += ` AND collection:(${FILM_COLLECTIONS})`;
        const url = `${BASE}/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&sort[]=downloads+desc&rows=8&output=json`;
        const data = await getJson(url);
        return (data.response?.docs || []).map(d => d.identifier);
    }

    async function resolve(film) {
        // Films hosted by their makers (e.g. Blender) play straight from there.
        if (film.direct) {
            return Promise.resolve({ identifier: null, url: film.direct, poster: null, page: film.direct.replace(/[^/]+$/, ""), subtitles: film.subtitles || [] });
        }
        return cached(`archive:${film.id}`, 30, async () => {
            for (const id of film.archiveIds || []) {
                const hit = await tryItem(id, film);
                if (hit) return hit;
            }
            if (film.noSearch) throw new Error(`“${film.title}” isn't available on the Internet Archive right now.`);
            // Curated collections with the year, then any film with the year, then curated without.
            for (const [withYear, curated] of [[true, true], [true, false], [false, true]]) {
                let ids = [];
                try { ids = await searchIds(film, withYear, curated); } catch { /* try next */ }
                for (const id of ids.slice(0, 5)) {
                    const hit = await tryItem(id, film);
                    if (hit) return hit;
                }
            }
            throw new Error(`Couldn't find a playable copy of “${film.title}” on the Internet Archive right now.`);
        });
    }

    // Forget a cached file (e.g. the video failed to load) so the next try searches again.
    function forget(film) {
        MyFlix.utils.uncache(`archive:${film.id}`);
    }

    // ---------- browsing (cartoons, TV, documentaries, Retro TV) ----------
    const FIELDS = ["identifier", "title", "year", "date", "description", "downloads", "runtime", "subject"];

    // Search the Archive. Returns raw docs; cached for 12 hours.
    function search(q, { rows = 40, page = 1, from = null, to = null, sort = "downloads desc" } = {}) {
        let query = `(${q}) AND mediatype:(movies)`;
        if (from) query += ` AND year:[${from} TO ${to}]`;
        const url = `${BASE}/advancedsearch.php?q=${encodeURIComponent(query)}&${FIELDS.map(f => `fl[]=${f}`).join("&")}&sort[]=${encodeURIComponent(sort)}&rows=${rows}&page=${page}&output=json`;
        return cached(`ias:${url}`, 0.5, async () => (await getJson(url)).response?.docs || []);
    }

    // Item details for the More Info pop-up.
    function meta(identifier) {
        return cached(`iam:${identifier}`, 7, async () => {
            const m = await getJson(`${BASE}/metadata/${encodeURIComponent(identifier)}/metadata`);
            return m.result || m.metadata || {};
        });
    }

    MyFlix.archive = { resolve, forget, search, meta, thumb: id => `${BASE}/services/img/${encodeURIComponent(id)}`, page: id => `${BASE}/details/${encodeURIComponent(id)}` };
})(window.MyFlix = window.MyFlix || {});
