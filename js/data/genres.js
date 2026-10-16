// ==========================
// GENRES + MOODS
// ==========================
(function (MyFlix) {
    // One shared genre list used across TV (TVMaze), Movies (TMDB) and Classics.
    // tvmaze: TVMaze genre names (and show `types` for Animation/Documentary)
    // tmdb:   TMDB movie genre ids ("|" = OR)
    // classic: key in MyFlix.classicGenres
    MyFlix.genres = [
        { key: "action", title: "Action & Adventure", tvmaze: ["Action", "Adventure"], tmdb: "28|12", classic: "action" },
        { key: "comedy", title: "Comedy", tvmaze: ["Comedy"], tmdb: "35", classic: "comedy" },
        { key: "drama", title: "Drama", tvmaze: ["Drama"], tmdb: "18", classic: "drama" },
        { key: "horror", title: "Horror", tvmaze: ["Horror"], tmdb: "27", classic: "horror" },
        { key: "scifi", title: "Sci-Fi", tvmaze: ["Science-Fiction"], tmdb: "878", classic: "scifi" },
        { key: "romance", title: "Romance", tvmaze: ["Romance"], tmdb: "10749", classic: "romance" },
        { key: "thriller", title: "Thriller", tvmaze: ["Thriller", "Espionage"], tmdb: "53", classic: "thriller" },
        { key: "crime", title: "Crime", tvmaze: ["Crime", "Legal"], tmdb: "80", classic: "crime" },
        { key: "mystery", title: "Mystery", tvmaze: ["Mystery", "Supernatural"], tmdb: "9648", classic: "mystery" },
        { key: "fantasy", title: "Fantasy", tvmaze: ["Fantasy"], tmdb: "14", classic: "fantasy" },
        { key: "animation", title: "Animation", tvmaze: ["Anime"], tvmazeTypes: ["Animation"], tmdb: "16", classic: "animation" },
        { key: "documentary", title: "Documentary", tvmaze: ["History", "Nature"], tvmazeTypes: ["Documentary"], tmdb: "99", classic: "documentary" },
        { key: "family", title: "Family", tvmaze: ["Family", "Children"], tmdb: "10751", classic: "family" },
        { key: "war", title: "War", tvmaze: ["War"], tmdb: "10752", classic: "war" },
        { key: "western", title: "Western", tvmaze: ["Western"], tmdb: "37", classic: "western" }
    ];

    MyFlix.genreByKey = key => MyFlix.genres.find(g => g.key === key);

    // Does a TVMaze show belong to one of our genres?
    MyFlix.tvShowInGenre = (show, genre) =>
        Boolean(show.genres?.some(g => genre.tvmaze.includes(g)) || genre.tvmazeTypes?.includes(show.type));

    // Mood picker: each mood maps to a few genres.
    MyFlix.moods = [
        { key: "feelgood", title: "Feel-good", icon: "smile", genres: ["comedy", "family", "romance"] },
        { key: "thrilling", title: "On the edge", icon: "zap", genres: ["thriller", "action", "crime"] },
        { key: "scary", title: "Scare me", icon: "ghost", genres: ["horror", "mystery"] },
        { key: "romantic", title: "Romantic", icon: "heart", genres: ["romance", "drama"] },
        { key: "mindbending", title: "Mind-bending", icon: "brain", genres: ["scifi", "mystery", "fantasy"] },
        { key: "laugh", title: "Make me laugh", icon: "laugh", genres: ["comedy", "animation"] },
        { key: "cry", title: "A good cry", icon: "cloud-rain", genres: ["drama", "romance", "war"] },
        { key: "family", title: "Family night", icon: "users", genres: ["family", "animation", "fantasy"] },
        { key: "epic", title: "Epic adventure", icon: "mountain", genres: ["action", "fantasy", "western", "war"] },
        { key: "learn", title: "Learn something", icon: "lightbulb", genres: ["documentary"] }
    ];
})(window.MyFlix = window.MyFlix || {});
