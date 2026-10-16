// ==========================
// FREE CARTOONS, TV, DOCUMENTARIES & ANIME (Internet Archive)
// ==========================
// Each row/series is a search inside one of the Internet Archive's public-
// domain collections, so new uploads show up automatically:
//   classic_cartoons        vintage cartoons (1930s–40s)
//   classic_tv              TV episodes whose copyright lapsed
//   classic_tv_commercials  old TV adverts
//   prelinger               the Prelinger Archives (educational, industrial,
//                           travel and ephemeral films, dedicated to the public domain)
//   feature_films           public-domain feature films
// `q` is the Archive search query; `min` is the shortest runtime (minutes)
// worth playing, used to skip trailers and clips.
(function (MyFlix) {
    MyFlix.freeArchive = {
        cartoons: [
            { id: "popeye", title: "Popeye the Sailor", q: "title:(popeye) AND collection:(classic_cartoons)", min: 4 },
            { id: "betty-boop", title: "Betty Boop", q: "title:(betty boop) AND collection:(classic_cartoons)", min: 4 },
            { id: "superman", title: "Superman (Fleischer Studios)", q: "title:(superman) AND collection:(classic_cartoons)", min: 6 },
            { id: "bugs", title: "Bugs Bunny & Friends", q: "title:(bugs bunny OR daffy OR porky) AND collection:(classic_cartoons)", min: 4 },
            { id: "casper", title: "Casper & Noveltoons", q: "title:(casper OR noveltoons) AND collection:(classic_cartoons)", min: 4 },
            { id: "felix", title: "Felix the Cat", q: "title:(felix the cat) AND collection:(classic_cartoons)", min: 4 },
            { id: "mighty-mouse", title: "Mighty Mouse & Terrytoons", q: "title:(mighty mouse OR terrytoons) AND collection:(classic_cartoons)", min: 4 },
            { id: "woody", title: "Woody Woodpecker & Walter Lantz", q: "title:(woody woodpecker OR andy panda) AND collection:(classic_cartoons)", min: 4 },
            { id: "color-classics", title: "Color Classics & Fairy Tales", q: "title:(color classic OR rainbow parade OR fairy tale) AND collection:(classic_cartoons)", min: 4 },
            { id: "all-cartoons", title: "Most Watched Cartoons", q: "collection:(classic_cartoons)", min: 4 }
        ],

        // TV series: each opens a page of episodes.
        tvShows: [
            { id: "bonanza", title: "Bonanza", years: "1959–1973", genre: "Western", q: "title:(bonanza) AND collection:(classic_tv)", min: 20,
              description: "The Cartwright family runs the Ponderosa ranch near Virginia City, Nevada." },
            { id: "beverly-hillbillies", title: "The Beverly Hillbillies", years: "1962–1971", genre: "Comedy", q: "title:(beverly hillbillies) AND collection:(classic_tv)", min: 15,
              description: "A backwoods family strikes oil and moves to a Beverly Hills mansion." },
            { id: "dick-van-dyke", title: "The Dick Van Dyke Show", years: "1961–1966", genre: "Comedy", q: "title:(dick van dyke) AND collection:(classic_tv)", min: 15,
              description: "A comedy writer juggles his job on a TV variety show and family life in the suburbs." },
            { id: "lucy-show", title: "The Lucy Show", years: "1962–1968", genre: "Comedy", q: "title:(lucy show) AND collection:(classic_tv)", min: 15,
              description: "Lucille Ball as a widowed mother getting into one scheme after another." },
            { id: "andy-griffith", title: "The Andy Griffith Show", years: "1960–1968", genre: "Comedy", q: "title:(andy griffith) AND collection:(classic_tv)", min: 15,
              description: "Life in the small town of Mayberry with its easygoing sheriff and his son Opie." },
            { id: "petticoat-junction", title: "Petticoat Junction", years: "1963–1970", genre: "Comedy", q: "title:(petticoat junction) AND collection:(classic_tv)", min: 15,
              description: "A widow and her three daughters run a hotel at a remote railway stop." },
            { id: "sherlock-1954", title: "Sherlock Holmes (1954)", years: "1954–1955", genre: "Mystery", q: "title:(sherlock holmes) AND collection:(classic_tv)", min: 20,
              description: "Ronald Howard and H. Marion Crawford as Holmes and Watson, filmed in France." },
            { id: "lone-ranger", title: "The Lone Ranger", years: "1949–1957", genre: "Western", q: "title:(lone ranger) AND collection:(classic_tv)", min: 20,
              description: "A masked Texas Ranger and his friend Tonto bring outlaws to justice." },
            { id: "cisco-kid", title: "The Cisco Kid", years: "1950–1956", genre: "Western", q: "title:(cisco kid) AND collection:(classic_tv)", min: 20,
              description: "Cisco and his sidekick Pancho ride the Old West helping people in trouble." },
            { id: "dragnet", title: "Dragnet", years: "1951–1959", genre: "Crime", q: "title:(dragnet) AND collection:(classic_tv)", min: 20,
              description: "Sergeant Joe Friday works real-life-inspired cases with the LAPD. Just the facts." },
            { id: "flash-gordon-tv", title: "Flash Gordon (1954)", years: "1954–1955", genre: "Sci-Fi", q: "title:(flash gordon) AND collection:(classic_tv)", min: 20,
              description: "Flash, Dale and Dr Zarkov patrol the galaxy for the Galactic Bureau of Investigation." },
            { id: "space-patrol", title: "Space Patrol", years: "1950–1955", genre: "Sci-Fi", q: "title:(space patrol OR rocky jones) AND collection:(classic_tv)", min: 20,
              description: "Space rangers keep order across the solar system in early TV sci-fi." },
            { id: "annie-oakley", title: "Annie Oakley", years: "1954–1957", genre: "Western", q: "title:(annie oakley) AND collection:(classic_tv)", min: 20,
              description: "The sharpshooter keeps the peace in the town of Diablo, Arizona." },
            { id: "ozzie-harriet", title: "The Adventures of Ozzie and Harriet", years: "1952–1966", genre: "Comedy", q: "title:(ozzie and harriet) AND collection:(classic_tv)", min: 20,
              description: "A real-life family plays itself in one of TV's longest-running sitcoms." },
            { id: "serials", title: "Movie Serials", years: "1930s–1940s", genre: "Adventure", q: "(title:(chapter) AND (title:(flash gordon) OR title:(buck rogers) OR title:(phantom) OR title:(zorro))) AND collection:(feature_films OR classic_tv)", min: 12,
              description: "Cliffhanger chapters starring Flash Gordon, Buck Rogers and other heroes." }
        ],

        documentaries: [
            { id: "space", title: "Science & the Space Age", q: "collection:(prelinger) AND (subject:(science) OR subject:(space) OR title:(atom OR rocket OR space))", min: 6 },
            { id: "cities", title: "Cities & Travel of the Past", q: "collection:(prelinger) AND (subject:(cities) OR subject:(travel) OR title:(city OR tour))", min: 6 },
            { id: "everyday", title: "Everyday Life in the 1950s", q: "collection:(prelinger) AND year:[1945 TO 1965] AND (subject:(family) OR subject:(teenagers) OR subject:(social guidance))", min: 6 },
            { id: "cars", title: "Cars, Trains & Planes", q: "collection:(prelinger) AND (subject:(automobiles) OR subject:(aviation) OR subject:(railroads))", min: 6 },
            { id: "war-docs", title: "Wartime Films", q: "collection:(prelinger OR feature_films) AND (subject:(world war) OR title:(war))", min: 10 },
            { id: "commercials", title: "Classic TV Commercials", q: "collection:(classic_tv_commercials)", min: 0.4 }
        ],

        // Open (Creative Commons) and early public-domain animation in an anime style.
        anime: [
            { id: "open-anime", title: "Open Anime & Indie Animation", q: "(title:(morevna) OR title:(pepper carrot) OR subject:(anime)) AND collection:(opensource_movies OR animationandcartoons)", min: 2 },
            { id: "early-japanese", title: "Early Japanese Animation", q: "(subject:(japanese animation) OR title:(namakura OR momotaro OR japanese cartoon)) AND mediatype:(movies)", min: 1 }
        ],

        // Official free anime channels (licensed, link out). Some are region-locked.
        animeChannels: [
            { id: "muse", name: "Muse Asia", color: "#1d4ed8", url: "https://www.youtube.com/results?search_query=Muse+Asia+full+episodes", tags: ["YouTube", "Asia"], description: "Licensed full episodes of popular anime on YouTube. Mainly available in Asia." },
            { id: "anione", name: "Ani-One Asia", color: "#f97316", url: "https://www.youtube.com/results?search_query=Ani-One+Asia+full+episodes", tags: ["YouTube", "Asia"], description: "Official free anime episodes and premieres on YouTube for viewers in Asia." },
            { id: "gundam", name: "GundamInfo", color: "#0f766e", url: "https://www.youtube.com/results?search_query=GundamInfo+official", tags: ["YouTube", "Mecha"], description: "Bandai Namco's official channel, with free Gundam series in many regions." },
            { id: "tubi-anime", name: "Tubi Anime", color: "#7408ff", url: "https://tubitv.com/category/anime", tags: ["Free with ads"], description: "A large free anime section on Tubi, in countries where Tubi operates." },
            { id: "pluto-anime", name: "Pluto TV Anime", color: "#fff200", ink: "#000", url: "https://pluto.tv/", tags: ["Live channels"], description: "24/7 anime channels on Pluto TV, in countries where it operates." },
            { id: "retrocrush", name: "RetroCrush", color: "#e11d48", url: "https://www.retrocrush.tv/", tags: ["Retro anime", "Free tier"], description: "Classic and cult anime from the 60s to the 2000s, with a free ad-supported tier in supported regions." }
        ]
    };

    // Retro TV: decades and channels. Each channel searches a collection,
    // narrowed to the chosen decade when the Archive knows the year.
    MyFlix.retroTv = {
        decades: [
            { id: "1920s", label: "1920s", from: 1920, to: 1929 },
            { id: "1930s", label: "1930s", from: 1930, to: 1939 },
            { id: "1940s", label: "1940s", from: 1940, to: 1949 },
            { id: "1950s", label: "1950s", from: 1950, to: 1959 },
            { id: "1960s", label: "1960s", from: 1960, to: 1969 },
            { id: "1970s", label: "1970s", from: 1970, to: 1979 }
        ],
        channels: [
            { num: 2, name: "Cartoon Corner", icon: "sparkles", q: "collection:(classic_cartoons)", min: 3 },
            { num: 3, name: "Sitcom Central", icon: "laugh", q: "collection:(classic_tv) AND (subject:(comedy) OR subject:(sitcom) OR title:(show))", min: 12 },
            { num: 4, name: "Frontier Westerns", icon: "mountain", q: "collection:(classic_tv OR feature_films) AND (subject:(western) OR title:(ranger OR cisco OR bonanza OR oakley))", min: 12 },
            { num: 5, name: "Sci-Fi Theatre", icon: "rocket", q: "collection:(classic_tv OR feature_films OR SciFi_Horror) AND (subject:(science fiction) OR title:(space OR flash gordon OR rocket))", min: 10 },
            { num: 6, name: "Movie of the Week", icon: "film", q: "collection:(feature_films)", min: 50 },
            { num: 7, name: "Newsreel & Documentary", icon: "globe", q: "collection:(prelinger)", min: 5 },
            { num: 8, name: "Commercial Break", icon: "tv", q: "collection:(classic_tv_commercials)", min: 0.3 }
        ]
    };
})(window.MyFlix = window.MyFlix || {});
