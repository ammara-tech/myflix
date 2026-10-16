// ==========================
// CINEMA FILM LIBRARY
// ==========================
// Keys match the data-film attributes on the .film-card buttons.
// `tmdbGenres` are TMDB genre ids ("|" means OR) used to find real trailers.
// `url` is the sample video played when no TMDB key is set.
(function (MyFlix) {
    const SAMPLE =
        "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v";

    MyFlix.films = {
        action: { title: "Action & Adventure", tmdbGenres: "28|12", url: SAMPLE },
        drama: { title: "Drama", tmdbGenres: "18", url: SAMPLE },
        comedy: { title: "Comedy", tmdbGenres: "35", url: SAMPLE },
        horror: { title: "Horror", tmdbGenres: "27", url: SAMPLE },
        scifi: { title: "Sci-Fi", tmdbGenres: "878", url: SAMPLE },
        romance: { title: "Romance", tmdbGenres: "10749", url: SAMPLE },
        thriller: { title: "Thriller", tmdbGenres: "53", url: SAMPLE },
        mystery: { title: "Mystery", tmdbGenres: "9648", url: SAMPLE },
        fantasy: { title: "Fantasy", tmdbGenres: "14", url: SAMPLE },
        animation: { title: "Animation", tmdbGenres: "16", url: SAMPLE },
        crime: { title: "Crime", tmdbGenres: "80", url: SAMPLE },
        documentary: { title: "Documentary", tmdbGenres: "99", url: SAMPLE },
        family: { title: "Family", tmdbGenres: "10751", url: SAMPLE },
        war: { title: "War", tmdbGenres: "10752", url: SAMPLE },
        western: { title: "Western", tmdbGenres: "37", url: SAMPLE }
    };
})(window.MyFlix = window.MyFlix || {});
