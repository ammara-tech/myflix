// ==========================
// APP SETTINGS
// ==========================
(function (MyFlix) {
    MyFlix.config = {
        // Optional API keys. Leave empty: anyone can add their own in
        // Profile → Settings, where they're saved only in that browser.
        // Anything typed here is visible to everyone who views the site.
        tmdbApiKey: "",   // https://www.themoviedb.org/settings/api  (movies, trailers, where to watch)
        omdbApiKey: "",   // https://www.omdbapi.com/apikey.aspx        (IMDb, Rotten Tomatoes, Metacritic)
        traktClientId: "", // https://trakt.tv/oauth/applications       (Trending Today rows)
        fanartApiKey: "", // https://fanart.tv/get-an-api-key/         (title logos on banners)

        // Country used for "Where to watch" (ISO code). ZA = South Africa.
        defaultRegion: "ZA",

        // Free public server that connects watch-party guests to each other.
        peerjsScript: "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"
    };
})(window.MyFlix = window.MyFlix || {});
