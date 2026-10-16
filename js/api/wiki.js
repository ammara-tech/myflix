// ==========================
// WIKIPEDIA (summaries, posters, "Did you know?" trivia) — free, no key
// ==========================
(function (MyFlix) {
    const { getJson, cached } = MyFlix.utils;
    const API = "https://en.wikipedia.org/w/api.php";

    // Find the Wikipedia article for a title.
    async function findPage(name, year, kind) {
        const hint = kind === "tv" || kind === "tmdbtv" ? "TV series" : "film";
        const q = `${name} ${year || ""} ${hint}`.trim();
        const data = await getJson(`${API}?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=5&format=json&origin=*`);
        const hits = data.query?.search || [];
        const want = name.toLowerCase().replace(/[^a-z0-9]/g, "");
        // Prefer a result whose title starts with the show/film name.
        const best = hits.find(h => h.title.toLowerCase().replace(/[^a-z0-9]/g, "").startsWith(want)) || hits[0];
        return best?.title || null;
    }

    // { title, extract, url, image } for a film or show (cached for 30 days).
    function summary(name, year, kind) {
        return cached(`wiki:${kind}:${name}:${year || ""}`, 30, async () => {
            const page = await findPage(name, year, kind);
            if (!page) return null;
            const data = await getJson(
                `${API}?action=query&prop=extracts|pageimages|info&exintro=1&explaintext=1&piprop=original|thumbnail&pithumbsize=500&inprop=url&redirects=1&titles=${encodeURIComponent(page)}&format=json&origin=*`
            );
            const p = Object.values(data.query?.pages || {})[0];
            if (!p || p.missing !== undefined) return null;
            return {
                title: p.title,
                extract: p.extract || "",
                url: p.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title)}`,
                image: p.thumbnail?.source || null,
                imageLarge: p.original?.source || null
            };
        });
    }

    // Pick up to `n` interesting sentences for "Did you know?".
    function trivia(extract, n = 3) {
        if (!extract) return [];
        const sentences = extract.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+(?=\s|$)/g) || [];
        const interesting = /\b(first|only|award|oscar|academy|record|based on|inspired|originally|banned|lost|restored|remake|budget|box office|nominated|won|considered|influential|landmark|cult|preserved|registry|debut)\b/i;
        const picks = sentences.slice(1).filter(s => interesting.test(s) && s.length > 40 && s.length < 320);
        return (picks.length ? picks : sentences.slice(1, 1 + n)).slice(0, n).map(s => s.trim());
    }

    MyFlix.wiki = { summary, trivia };
})(window.MyFlix = window.MyFlix || {});
