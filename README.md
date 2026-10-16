# 🎬 MYFLIX – Movie Finder & Interactive Cinema App

A Netflix-inspired web app to search movies and shows, build a watch list, get recommendations, play a movie guessing game, and watch real trailers — all inside a cinematic UI.

Built with plain HTML, CSS and JavaScript. Show data comes from TVMaze, trailers from TMDB, and everything you save stays in your browser (localStorage).

## ✨ Features

**🔎 Search** – live TVMaze search with posters, ratings and years.

**ℹ️ Show details popup** – click any poster for the summary, genres, network, rating, cast, and every season with its episodes.

**📋 My List** – two tabs: **Want to Watch** and **Watched**. Mark shows as watched and give them 1–5 stars (click the same star again to clear).

**💡 Because you saved…** – recommendations based on the genres in My List. Shows you rated highly count more; low ratings count less.

**🎭 Genre explorer** – 15 genres. Filters your search results, or browses popular shows when you haven't searched.

**🎮 Guessing game**
- Movies, Series, and **Live TVMaze** mode (endless questions from real show summaries with the title hidden)
- 30-second countdown with a speed bonus
- Streak bonus, hints with a point penalty
- High score saved per mode

**🎞 Cinema mode** – pick a genre to watch **real trailers** from TMDB, back to back with Auto-Binge. Without a TMDB key it plays a sample video.

**🌗 Light / dark theme** – follows your device setting until you choose one with the ☀️/🌙 button.

**📱 Installable app** – works offline for anything you've already loaded and can be installed to your phone or desktop (needs the site to be hosted, see below).

## 🎞 Turning on real trailers

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/signup).
2. Go to **Settings → API** and request an API key (choose "Developer", personal use).
3. On MYFLIX, open **Cinema → 🎞 Real trailers (TMDB key)**, paste the key and press **Save key**.

The key is saved only in that browser. If you'd rather have trailers work for every visitor, put the key in `js/config.js` — but anyone can see it there, so only do that with a key you're happy to share.

## 🚀 Running it

- **Quickest:** double-click `index.html`. Everything works except offline mode and installing.
- **Full experience:** use the Live Server extension in VS Code, or host it on GitHub Pages.

### Hosting on GitHub Pages (needed for "Install app")
1. On GitHub open the repo → **Settings → Pages**.
2. Under "Build and deployment", choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
3. After a minute your site is at `https://ammara-tech.github.io/myflix/`.
4. Open it in Chrome/Edge and press **⬇ Install app** in the top bar (on iPhone: Share → Add to Home Screen).

When you change any file later, bump `CACHE_VERSION` at the top of `sw.js` (e.g. `myflix-v2`) so installed copies pick up the update.

## 📁 Project structure

```
myflix/
├── index.html              # Page layout
├── manifest.webmanifest    # App name + icons for installing
├── sw.js                   # Service worker (offline cache)
├── assets/                 # Icons and the "no poster" image
├── css/
│   ├── base.css            # Theme colours (dark + light), reset, buttons, toast
│   ├── layout.css          # Nav, hero, section cards, My List tabs, footer
│   ├── carousel.css        # Rows, movie cards, star ratings
│   ├── details.css         # Show details popup
│   ├── game.css            # Guessing game TV + countdown
│   ├── explore.css         # Genre grid
│   └── cinema.css          # Trailer player + TMDB settings
└── js/
    ├── theme.js            # Light/dark theme (loads first, in <head>)
    ├── config.js           # Optional TMDB key
    ├── data/
    │   ├── genres.js       # Genre list + TVMaze genre mapping
    │   ├── questions.js    # Hand-written game questions
    │   └── films.js        # Cinema genres + TMDB genre ids
    ├── utils.js            # Shared helpers (escaping, storage, toast…)
    ├── api.js              # TVMaze requests
    ├── cards.js            # Movie card + carousel arrows
    ├── favourites.js       # My List tabs + ratings
    ├── details.js          # Show details popup
    ├── search.js           # Search + genre filter
    ├── recommendations.js  # "Because you saved…" row
    ├── game.js             # Guessing game
    ├── trailers.js         # TMDB trailer lookup
    ├── cinema.js           # Cinema player
    ├── pwa.js              # Install button + service worker
    └── main.js             # Starts everything
```

Scripts are plain `<script defer>` files (not ES modules), so the app still works when you double-click `index.html`. Keep the order in `index.html`.

## 🌐 APIs used

- [TVMaze](https://www.tvmaze.com/api) – search, show details, cast, seasons, episodes (free, no key, CC BY-SA)
- [TMDB](https://www.themoviedb.org/documentation/api) – movie trailers (free key). This product uses the TMDB API but is not endorsed or certified by TMDB.

## 👨‍💻 Author

Ammara Badat · © 2026 MYFLIX Project

## 📜 License

This project is for educational and personal portfolio use.
