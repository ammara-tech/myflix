// ==========================
// CINEMA FILM LIBRARY
// ==========================
// Keys match the data-film attributes on the .film-card buttons.
// Every genre currently points at the same open-licence sample video;
// swap in a different URL per genre when you have one.
(function (MyFlix) {
    const SAMPLE =
        "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v";

    MyFlix.films = {
        action: { title: "Action & Adventure", url: SAMPLE },
        drama: { title: "Drama", url: SAMPLE },
        comedy: { title: "Comedy", url: SAMPLE },
        horror: { title: "Horror", url: SAMPLE },
        scifi: { title: "Sci-Fi", url: SAMPLE },
        romance: { title: "Romance", url: SAMPLE },
        thriller: { title: "Thriller", url: SAMPLE },
        mystery: { title: "Mystery", url: SAMPLE },
        fantasy: { title: "Fantasy", url: SAMPLE },
        animation: { title: "Animation", url: SAMPLE },
        crime: { title: "Crime", url: SAMPLE },
        documentary: { title: "Documentary", url: SAMPLE },
        family: { title: "Family", url: SAMPLE },
        war: { title: "War", url: SAMPLE },
        western: { title: "Western", url: SAMPLE }
    };
})(window.MyFlix = window.MyFlix || {});
