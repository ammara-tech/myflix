// ==========================
// TMDB TRAILERS
// ==========================
// Finds popular movies for a genre on TMDB and returns their YouTube
// trailer. Needs a TMDB key (config.js or the settings box on the page).
(function (MyFlix) {
    const { storage } = MyFlix.utils;
    const BASE = "https://api.themoviedb.org/3";
    const KEY_STORAGE = "myflixTmdbKey";

    const movieLists = new Map();   // genre key -> { movies, index }
    const trailerCache = new Map(); // movie id -> trailer or null

    function getKey() {
        return storage.read(KEY_STORAGE, "") || MyFlix.config?.tmdbApiKey || "";
    }

    function setKey(key) {
        storage.write(KEY_STORAGE, key.trim());
        movieLists.clear();
        trailerCache.clear();
    }

    function isEnabled() {
        return Boolean(getKey());
    }

    // TMDB accepts either a short v3 "API key" or a long v4 "Read Access Token".
    async function tmdb(path, params = {}) {
        const key = getKey();
        const url = new URL(BASE + path);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        const headers = {};
        if (key.length > 40) headers.Authorization = `Bearer ${key}`;
        else url.searchParams.set("api_key", key);

        const res = await fetch(url, { headers });
        if (res.status === 401) throw new Error("TMDB rejected the key. Check it in the Real trailers settings.");
        if (!res.ok) throw new Error(`TMDB responded with ${res.status}`);
        return res.json();
    }

    // Quick check used by the settings form.
    async function testKey() {
        await tmdb("/configuration");
    }

    async function moviesFor(genreKey) {
        if (!movieLists.has(genreKey)) {
            const film = MyFlix.films[genreKey];
            const page = 1 + Math.floor(Math.random() * 3); // a bit of variety each visit
            const data = await tmdb("/discover/movie", {
                with_genres: film.tmdbGenres,
                sort_by: "popularity.desc",
                include_adult: "false",
                "vote_count.gte": "200",
                page
            });
            movieLists.set(genreKey, { movies: data.results || [], index: -1 });
        }
        return movieLists.get(genreKey);
    }

    async function trailerFor(movie) {
        if (!trailerCache.has(movie.id)) {
            const data = await tmdb(`/movie/${movie.id}/videos`);
            const youtube = (data.results || []).filter(v => v.site === "YouTube");
            const pick =
                youtube.find(v => v.type === "Trailer" && v.official) ||
                youtube.find(v => v.type === "Trailer") ||
                youtube.find(v => v.type === "Teaser") ||
                null;
            trailerCache.set(movie.id, pick);
        }
        return trailerCache.get(movie.id);
    }

    // Returns the next movie in this genre that has a trailer:
    // { title, year, overview, youtubeKey, tmdbUrl }
    async function nextTrailer(genreKey) {
        const list = await moviesFor(genreKey);
        for (let tries = 0; tries < list.movies.length; tries++) {
            list.index = (list.index + 1) % list.movies.length;
            const movie = list.movies[list.index];
            const trailer = await trailerFor(movie);
            if (trailer) {
                return {
                    title: movie.title,
                    year: movie.release_date?.slice(0, 4) || "",
                    overview: movie.overview || "",
                    youtubeKey: trailer.key,
                    tmdbUrl: `https://www.themoviedb.org/movie/${movie.id}`
                };
            }
        }
        throw new Error("No trailers found for this genre.");
    }

    MyFlix.trailers = { getKey, setKey, isEnabled, testKey, nextTrailer };
})(window.MyFlix = window.MyFlix || {});
