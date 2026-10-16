// ==========================
// FREE, LEGAL STREAMING SERVICES
// ==========================
// These services don't allow their players inside other websites, so
// MYFLIX links out to them (new tab). Availability differs per country;
// with a TMDB key, MYFLIX checks live which ones carry a title in yours.
//
// tmdbNames: how TMDB / JustWatch name the service (used to match its data)
// search:    link to search the service for a title ({q} = title), when known
(function (MyFlix) {
    MyFlix.freeServices = [
        {
            id: "tubi", name: "Tubi", color: "#7408ff",
            url: "https://tubitv.com/",
            search: "https://tubitv.com/search/{q}",
            tmdbNames: ["Tubi TV", "Tubi"],
            tags: ["Movies", "TV", "No account"],
            description: "One of the biggest free on-demand libraries: action, comedy, horror and classics, no account needed."
        },
        {
            id: "pluto", name: "Pluto TV", color: "#fff200", ink: "#000",
            url: "https://pluto.tv/",
            tmdbNames: ["Pluto TV"],
            tags: ["Live channels", "On demand"],
            description: "Hundreds of free live channels plus a large on-demand catalogue. Feels like cable TV."
        },
        {
            id: "plex", name: "Plex", color: "#e5a00d", ink: "#000",
            url: "https://www.plex.tv/watch-free/",
            tmdbNames: ["Plex", "Plex Channel"],
            tags: ["Movies", "TV", "Live channels"],
            description: "Thousands of free movies, series and documentaries, plus live channels. An optional account syncs across devices."
        },
        {
            id: "roku", name: "The Roku Channel", color: "#6c3c97",
            url: "https://therokuchannel.roku.com/",
            search: "https://therokuchannel.roku.com/search/{q}",
            tmdbNames: ["The Roku Channel", "Roku Channel"],
            tags: ["Movies", "Classic TV", "Live news"],
            description: "Free ad-supported movies, classic series and live news, right in your web browser."
        },
        {
            id: "crackle", name: "Crackle", color: "#f58220", ink: "#000",
            url: "https://www.crackle.com/",
            tmdbNames: ["Crackle"],
            tags: ["Hollywood movies", "Cult classics"],
            description: "Free Hollywood films, cult classics, thrillers and original series."
        },
        {
            id: "youtube", name: "YouTube Movies & TV", color: "#ff0033",
            url: "https://www.youtube.com/feed/storefront",
            search: "https://www.youtube.com/results?search_query={q}+full+movie",
            tmdbNames: ["YouTube", "YouTube Free", "YouTube Premium"],
            tags: ["Movies", "TV", "With ads"],
            description: "A rotating selection of full-length free movies and shows (with ads) in the official Movies & TV hub."
        },
        {
            id: "kanopy", name: "Kanopy", color: "#0f6fde",
            url: "https://www.kanopy.com/",
            tmdbNames: ["Kanopy"],
            tags: ["Library card", "Ad-free", "Documentaries"],
            description: "Ad-free indie films, classic cinema and documentaries, free with a participating library card or university login."
        },
        {
            id: "viki", name: "Rakuten Viki", color: "#1e5bff",
            url: "https://www.viki.com/",
            search: "https://www.viki.com/search?q={q}",
            tmdbNames: ["Rakuten Viki", "Viki"],
            tags: ["K-drama", "C-drama", "Asian movies"],
            description: "Licensed Korean, Chinese, Japanese and Thai dramas and movies, free with ads and fan-made subtitles."
        }
    ];

    // Find the service entry for a provider name coming from TMDB.
    MyFlix.serviceFor = providerName => {
        const n = (providerName || "").toLowerCase();
        return MyFlix.freeServices.find(s => s.tmdbNames.some(t => t.toLowerCase() === n)) || null;
    };

    // "ZA" -> "South Africa"
    MyFlix.regionName = code => {
        try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code; } catch { return code; }
    };

    // Best link for watching `title` on `service`.
    MyFlix.serviceLink = (service, title) =>
        service.search && title ? service.search.replace("{q}", encodeURIComponent(title)) : service.url;
})(window.MyFlix = window.MyFlix || {});
