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
        const minBytes = Math.max(4, film.runtime * 1.2) * 1e6; // skip clips and trailers
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

    async function tryItem(identifier, film) {
        try {
            const meta = await getJson(`${BASE}/metadata/${encodeURIComponent(identifier)}`);
            if (!meta?.files || meta.is_dark) return null;
            const file = bestFile(meta.files, film);
            if (!file) return null;
            return {
                identifier,
                url: `${BASE}/download/${encodeURIComponent(identifier)}/${file.name.split("/").map(encodeURIComponent).join("/")}`,
                poster: `${BASE}/services/img/${encodeURIComponent(identifier)}`,
                page: `${BASE}/details/${encodeURIComponent(identifier)}`
            };
        } catch {
            return null;
        }
    }

    async function searchIds(film, withYear) {
        const title = film.title.replace(/[":()]/g, " ").replace(/\s+/g, " ").trim();
        let q = `title:(${title}) AND mediatype:(movies) AND NOT title:(trailer)`;
        if (withYear) q += ` AND year:[${film.year - 1} TO ${film.year + 1}]`;
        const url = `${BASE}/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&sort[]=downloads+desc&rows=8&output=json`;
        const data = await getJson(url);
        return (data.response?.docs || []).map(d => d.identifier);
    }

    async function resolve(film) {
        return cached(`archive:${film.id}`, 30, async () => {
            for (const id of film.archiveIds || []) {
                const hit = await tryItem(id, film);
                if (hit) return hit;
            }
            for (const withYear of [true, false]) {
                let ids = [];
                try { ids = await searchIds(film, withYear); } catch { /* try next */ }
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

    MyFlix.archive = { resolve, forget };
})(window.MyFlix = window.MyFlix || {});
