// ==========================
// APP SETTINGS
// ==========================
(function (MyFlix) {
    MyFlix.config = {
        // Optional TMDB key for real trailers in Cinema mode.
        // Get one free at https://www.themoviedb.org/settings/api
        //
        // You can leave this empty: visitors can paste their own key in the
        // "Real trailers" box on the page (it's saved in their browser only).
        // Anything you put here is visible to everyone who views the site,
        // so only use a key you're happy to share publicly.
        tmdbApiKey: ""
    };
})(window.MyFlix = window.MyFlix || {});
