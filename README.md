# MYFLIX

A Netflix-style streaming app built with plain HTML, CSS and JavaScript. Browse TV shows and movies, stream legendary films for free, track the episodes you've watched, see where to stream anything in South Africa, and play movie games.

## Features

**Browse like Netflix**
- Hero billboard, Top 10 rows with big rank numbers, hover previews, and "Explore all" for each row
- Pages: Home, TV Shows, Movies, Free Classics, My List, Games, plus Stats and Search
- Genre dropdowns, an expanding search box, and a mobile bottom tab bar

**Free Classic Cinema**
- 33 public-domain and Creative Commons films, with at least 2 in every genre (Nosferatu, Metropolis, The General, His Girl Friday, Night of the Living Dead, Sintel and more)
- *The MYFLIX Theatre*: pick a genre, then pick a film, and it plays
- Full-screen player:
  - Resume where you left off, ±10s skip, keyboard shortcuts
  - "Up next" countdown at the end of a film
  - Themed collections: Silent Era, Film Noir Nights, Monster Classics, Under 20 Minutes…

**Watch Party**: watch a classic in sync with friends using a 6-letter party code or invite link, with live chat and reactions.

**More Info pop-up**
- Combines five sources: TVMaze, TMDB, OMDb, Wikipedia and the Internet Archive
- Shows the cast, the trailer, and IMDb / Rotten Tomatoes / Metacritic scores
- Shows **where to watch in South Africa** (Netflix, Showmax, Prime Video…), "Did you know?" facts, and "More like this"

**Episode tracker**
- Tick off episodes, and "Continue Watching" shows your next one
- The bell lists new episodes airing in the next two weeks, with a countdown

**My List**: Want to Watch and Watched tabs, 1–5 star ratings, and "Because you saved…" recommendations.

**Mood picker** (dice icon): choose a mood, spin the wheel, and get tonight's pick.

**Games**: Guess the Title in four modes (Movies, Series, Live TV, and Film Trivia from Wikipedia), with a timer, streak and speed bonuses, and high scores.

**Your Stats**: hours watched, top genres, a 14-day activity chart, and badges to unlock.

**Also**
- Light/dark theme
- Installable as an app, with offline support
- Professional line icons throughout (no emojis)

## API keys (optional, free)

Everything except the Movies page works with no keys. Add them in **Profile → Settings & API keys**. They're saved only in your browser.

| Service | Unlocks | Get a key |
|---|---|---|
| TMDB | Movies page, trailers, backdrops, where to watch | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) |
| OMDb | IMDb, Rotten Tomatoes, Metacritic scores | [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx) |

TVMaze, Wikipedia and the Internet Archive need no key. You *can* put keys in `js/config.js` so every visitor gets them, but anyone can read that file on a public site.

## Running it

- **Quickest:** double-click `index.html`. Everything works except offline mode and installing.
- **Full experience:** use VS Code's Live Server extension, or host on GitHub Pages.

### GitHub Pages
1. Repo → **Settings → Pages** → Deploy from a branch → `main` / root → Save.
2. The site appears at `https://ammara-tech.github.io/myflix/`.
3. Open it in Chrome/Edge → Profile menu → **Install app** (iPhone: Share → Add to Home Screen).

After changing files, bump `CACHE_VERSION` in `sw.js` so installed copies update.

## How the free films work

`js/data/classics.js` lists each film's title, year, runtime, genres and description. When you press Play, `js/api/archive.js` asks the Internet Archive for that film's video files and picks the best MP4. It tries any known item IDs first, then searches by title and year. The answer is remembered for 30 days. If a copy fails to load, the player automatically tries another.

To add a film, add an entry to `MyFlix.classics`. Only use films that are public domain or Creative Commons.

## Project structure

```
myflix/
├── index.html               Page shell: nav, dialogs, player, script order
├── manifest.webmanifest     App name + icons for installing
├── sw.js                    Service worker (offline cache)
├── assets/                  Icons, favicon, "no poster" image
├── css/
│   ├── base.css             Design tokens (dark + light), buttons, chips, toast
│   ├── nav.css              Top bar, menus, mobile tab bar, footer
│   ├── billboard.css        Hero banner
│   ├── rows.css             Rows, cards, hover previews, Top 10, grids
│   ├── modal.css            More Info, mood picker, settings
│   ├── player.css           Full-screen player + watch party
│   ├── pages.css            Theatre, My List, tracker, stats
│   └── games.css            Games page
└── js/
    ├── theme.js             Light/dark (loads first)
    ├── config.js            Optional keys, region
    ├── icons.js             Lucide icon sprite
    ├── data/                Classic films, genres + moods, quiz questions
    ├── utils.js             Helpers (escaping, caching, toast…)
    ├── store.js             Everything saved in localStorage
    ├── models.js            Turns TVMaze/TMDB/classic data into one shape
    ├── api/                 tvmaze, tmdb, omdb, wiki, archive
    ├── ui/                  cards, billboard, details, player, mood, settings
    ├── party.js             Watch party (PeerJS)
    ├── recommend.js         "Because you saved…"
    ├── tracker.js           Up next + new-episode bell
    ├── router.js            #/ pages + navigation
    ├── pages/               helpers, browse (Home/TV/Movies/Classics), library (My List/Search/Stats), games
    ├── pwa.js               Install + service worker
    └── main.js              Starts everything
```

Scripts are plain `<script defer>` files (not ES modules), so opening `index.html` from disk works. Keep the order in `index.html`.

## Credits

- TV data: [TVMaze](https://www.tvmaze.com/api) (CC BY-SA)
- Movies: [TMDB](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability by JustWatch.
- Scores: [OMDb](https://www.omdbapi.com/)
- Facts: [Wikipedia](https://www.wikipedia.org/) (CC BY-SA)
- Films: [Internet Archive](https://archive.org/details/feature_films)
- Icons: [Lucide](https://lucide.dev) (ISC)
- Fonts: Inter and Bebas Neue (Google Fonts)
- Watch party: [PeerJS](https://peerjs.com/)

© 2026 Ammara Badat. Built for learning and portfolio use.
