// ==========================
// APP ENTRY POINT
// ==========================
// Scripts are loaded in order from index.html (data → helpers → features → main).
// Plain <script defer> files are used instead of ES modules so the app
// still works when index.html is opened straight from disk.
document.addEventListener("DOMContentLoaded", () => {
    const { favourites, search, game, cinema, cards } = window.MyFlix;

    cards.initScrollButtons();
    favourites.init();
    search.init();
    game.init();
    cinema.init();
});
