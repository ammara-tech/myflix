// ==========================
// ANILIST API (anime) — free, no key
// ==========================
// GraphQL: one POST can ask for several lists at once, which keeps us well
// inside AniList's rate limit. Docs: https://docs.anilist.co
(function (MyFlix) {
    const URL = "https://graphql.anilist.co";
    const memo = new Map();

    // Fields every anime card needs.
    const CARD = `
        id idMal format status episodes duration averageScore popularity genres isAdult
        title { romaji english }
        coverImage { large extraLarge color }
        bannerImage
        description(asHtml: false)
        season seasonYear startDate { year }
        nextAiringEpisode { episode airingAt timeUntilAiring }
        studios(isMain: true) { nodes { name } }
    `;

    async function query(q, variables = {}, minutes = 30) {
        const key = q + JSON.stringify(variables);
        const hit = memo.get(key);
        if (hit && hit.until > Date.now()) return hit.promise;
        const promise = fetch(URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ query: q, variables })
        }).then(async res => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.errors) throw new Error(data.errors?.[0]?.message || `AniList responded with ${res.status}`);
            return data.data;
        });
        promise.catch(() => memo.delete(key));
        memo.set(key, { promise, until: Date.now() + minutes * 60e3 });
        return promise;
    }

    // Which anime season is it now (and next)?
    function seasonOf(date = new Date()) {
        const m = date.getMonth();
        const season = m < 3 ? "WINTER" : m < 6 ? "SPRING" : m < 9 ? "SUMMER" : "FALL";
        return { season, year: date.getFullYear() };
    }
    function nextSeason() {
        const d = new Date();
        d.setMonth(d.getMonth() + 3);
        return seasonOf(d);
    }

    // Everything the Anime page needs, in ONE request.
    function home() {
        const now = seasonOf();
        const next = nextSeason();
        return query(`
            query ($season: MediaSeason, $year: Int, $nextSeason: MediaSeason, $nextYear: Int) {
                trending: Page(perPage: 20) { media(type: ANIME, sort: TRENDING_DESC, isAdult: false) { ${CARD} } }
                season: Page(perPage: 20) { media(type: ANIME, season: $season, seasonYear: $year, sort: POPULARITY_DESC, isAdult: false) { ${CARD} } }
                airing: Page(perPage: 20) { media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC, isAdult: false) { ${CARD} } }
                top: Page(perPage: 20) { media(type: ANIME, sort: SCORE_DESC, isAdult: false) { ${CARD} } }
                movies: Page(perPage: 20) { media(type: ANIME, format: MOVIE, sort: POPULARITY_DESC, isAdult: false) { ${CARD} } }
                upcoming: Page(perPage: 20) { media(type: ANIME, season: $nextSeason, seasonYear: $nextYear, sort: POPULARITY_DESC, isAdult: false) { ${CARD} } }
            }`, { season: now.season, year: now.year, nextSeason: next.season, nextYear: next.year })
            .then(d => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.media])));
    }

    function byGenre(genre, perPage = 20) {
        return query(`query ($genre: String) { Page(perPage: ${perPage}) { media(type: ANIME, genre: $genre, sort: POPULARITY_DESC, isAdult: false) { ${CARD} } } }`, { genre })
            .then(d => d.Page.media);
    }

    function search(q) {
        return query(`query ($q: String) { Page(perPage: 18) { media(type: ANIME, search: $q, isAdult: false, sort: SEARCH_MATCH) { ${CARD} } } }`, { q }, 10)
            .then(d => d.Page.media);
    }

    // Full details for the More Info pop-up.
    function details(id) {
        return query(`query ($id: Int) { Media(id: $id, type: ANIME) {
            ${CARD}
            trailer { id site }
            externalLinks { site url type language color }
            characters(sort: ROLE, perPage: 12) { edges { role node { name { full } image { medium } } voiceActors(language: JAPANESE) { name { full } } } }
            recommendations(sort: RATING_DESC, perPage: 9) { nodes { mediaRecommendation { ${CARD} } } }
            relations { edges { relationType node { id type format title { romaji english } coverImage { large } } } }
            source
        } }`, { id }, 60).then(d => d.Media);
    }

    // Look up anime by their MyAnimeList ids (used with Jikan's top list).
    function byMalIds(ids) {
        return query(`query ($ids: [Int]) { Page(perPage: ${ids.length}) { media(type: ANIME, idMal_in: $ids, isAdult: false) { ${CARD} } } }`, { ids }, 60)
            .then(d => {
                const byMal = new Map(d.Page.media.map(m => [m.idMal, m]));
                return ids.map(id => byMal.get(id)).filter(Boolean);
            });
    }

    // AniList genres used for rows on the Anime page.
    const GENRES = ["Action", "Romance", "Comedy", "Fantasy", "Sci-Fi", "Slice of Life", "Sports", "Mystery", "Psychological"];

    MyFlix.anilist = { home, byGenre, byMalIds, search, details, seasonOf, GENRES };
})(window.MyFlix = window.MyFlix || {});
