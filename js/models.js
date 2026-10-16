// ==========================
// TITLE MODEL
// ==========================
// TVMaze shows, TMDB movies and Classic films all look different. These
// helpers turn each into one shape the whole app understands:
// { key, kind, id, name, year, poster, backdrop, genres, rating, runtime, overview }
// kind: "tv" (TVMaze show) · "movie" (TMDB movie) · "tmdbtv" (TMDB show) · "classic"
(function (MyFlix) {
    const { stripHtml } = MyFlix.utils;

    const TMDB_IMG = "https://image.tmdb.org/t/p/";
    const TMDB_GENRES = {
        28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary",
        18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
        9648: "Mystery", 10749: "Romance", 878: "Science Fiction", 10770: "TV Movie", 53: "Thriller",
        10752: "War", 37: "Western", 10759: "Action & Adventure", 10762: "Kids", 10763: "News",
        10764: "Reality", 10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics"
    };

    function tmdbImage(path, size = "w342") {
        return path ? `${TMDB_IMG}${size}${path}` : null;
    }

    function fromTvmaze(show) {
        return {
            key: `tv:${show.id}`,
            kind: "tv",
            id: show.id,
            name: show.name,
            year: show.premiered ? +show.premiered.slice(0, 4) : null,
            poster: show.image?.medium || null,
            posterLarge: show.image?.original || show.image?.medium || null,
            backdrop: null,
            genres: show.genres || [],
            rating: show.rating?.average || null,
            runtime: show.averageRuntime || show.runtime || null,
            overview: stripHtml(show.summary),
            network: show.network?.name || show.webChannel?.name || null,
            status: show.status,
            imdb: show.externals?.imdb || null,
            raw: show
        };
    }

    function fromTmdb(item, mediaType) {
        const type = item.media_type || mediaType || (item.title ? "movie" : "tv");
        const date = item.release_date || item.first_air_date || "";
        return {
            key: type === "movie" ? `movie:${item.id}` : `tmdbtv:${item.id}`,
            kind: type === "movie" ? "movie" : "tmdbtv",
            id: item.id,
            name: item.title || item.name,
            year: date ? +date.slice(0, 4) : null,
            poster: tmdbImage(item.poster_path, "w342"),
            posterLarge: tmdbImage(item.poster_path, "w780"),
            backdrop: tmdbImage(item.backdrop_path, "w780"),
            backdropLarge: tmdbImage(item.backdrop_path, "original"),
            genres: item.genres?.map(g => g.name) || (item.genre_ids || []).map(id => TMDB_GENRES[id]).filter(Boolean),
            rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : null,
            runtime: item.runtime || item.episode_run_time?.[0] || null,
            overview: item.overview || "",
            raw: item
        };
    }

    function fromClassic(film) {
        return {
            key: `classic:${film.id}`,
            kind: "classic",
            id: film.id,
            name: film.title,
            year: film.year,
            poster: null,      // filled lazily from Wikipedia (see classics page)
            backdrop: null,
            genres: film.genres.map(g => MyFlix.classicGenres[g]),
            rating: null,
            runtime: film.runtime,
            overview: film.description,
            licence: film.licence,
            film
        };
    }

    // AniList anime -> MYFLIX title
    function fromAnilist(a) {
        return {
            key: `anime:${a.id}`,
            kind: "anime",
            id: a.id,
            name: a.title?.english || a.title?.romaji || "Untitled",
            altName: a.title?.english && a.title.romaji !== a.title.english ? a.title.romaji : null,
            year: a.seasonYear || a.startDate?.year || null,
            poster: a.coverImage?.large || null,
            posterLarge: a.coverImage?.extraLarge || a.coverImage?.large || null,
            backdrop: a.bannerImage || null,
            backdropLarge: a.bannerImage || null,
            genres: a.genres || [],
            rating: a.averageScore ? Math.round(a.averageScore) / 10 : null,
            runtime: a.duration || null,
            overview: stripHtml(a.description || "").replace(/\(Source:[^)]*\)/gi, "").trim(),
            format: a.format, episodes: a.episodes, status: a.status,
            nextAiring: a.nextAiringEpisode || null,
            studio: a.studios?.nodes?.[0]?.name || null,
            malId: a.idMal || null,
            raw: a
        };
    }

    // Internet Archive search result -> MYFLIX title (playable in the player).
    // extra: { genre, min (minutes), queueName }
    function runtimeMinutes(r) {
        if (!r) return null;
        const s = String(Array.isArray(r) ? r[0] : r);
        const parts = s.match(/(\d+):(\d+)(?::(\d+))?/);
        if (parts) return parts[3] ? +parts[1] * 60 + +parts[2] + +parts[3] / 60 : +parts[1] + +parts[2] / 60;
        const mins = s.match(/(\d+(?:\.\d+)?)\s*min/i);
        return mins ? +mins[1] : null;
    }
    function fromArchive(doc, extra = {}) {
        const id = doc.identifier;
        const title = String(Array.isArray(doc.title) ? doc.title[0] : doc.title || id).replace(/\s+/g, " ").trim();
        const year = +(doc.year || String(doc.date || "").slice(0, 4)) || null;
        const runtime = runtimeMinutes(doc.runtime);
        const desc = stripHtml(Array.isArray(doc.description) ? doc.description.join(" ") : doc.description || "");
        return {
            key: `archive:${id}`,
            kind: "archive",
            id,
            name: title,
            year,
            poster: MyFlix.archive.thumb(id),
            backdrop: MyFlix.archive.thumb(id),
            genres: extra.genre ? [extra.genre] : [],
            rating: null,
            runtime: runtime ? Math.round(runtime) : null,
            overview: desc.length > 400 ? desc.slice(0, 397).replace(/\s+\S*$/, "") + "…" : desc,
            licence: "Internet Archive public-domain collection",
            film: {
                id, title, year, runtime: runtime || extra.min || 10, genres: [], description: desc,
                licence: "Internet Archive public-domain collection",
                archiveIds: [id], noSearch: true, minMB: (extra.min ?? 1) * 0.8
            }
        };
    }

    // Rebuild a full title from a saved My List item (which only keeps a few fields).
    function fromKey(key) {
        const [kind, id] = key.split(":");
        if (kind === "archive") {
            const item = MyFlix.store.list.get(key) || MyFlix.store.progress.get(id)?.meta || {};
            return fromArchive({ identifier: key.slice(8), title: item.name, year: item.year });
        }
        if (kind === "classic") {
            const film = MyFlix.classics.find(f => f.id === id);
            return film ? fromClassic(film) : null;
        }
        return MyFlix.store.list.get(key) || { key, kind, id: +id, name: "" };
    }

    MyFlix.models = { fromTvmaze, fromTmdb, fromClassic, fromAnilist, fromArchive, fromKey, tmdbImage, TMDB_GENRES };
})(window.MyFlix = window.MyFlix || {});
