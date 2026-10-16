// ==========================
// APP ENTRY POINT
// ==========================
// Scripts are loaded in order from index.html (data → helpers → features → main).
// Plain <script defer> files are used instead of ES modules so the app
// still works when index.html is opened straight from disk.
document.addEventListener("DOMContentLoaded", () => {
    const M = window.MyFlix;

    M.theme.init();
    M.cards.initScrollButtons();
    M.favourites.init();
    M.details.init();
    M.search.init();
    M.recommendations.init();
    M.game.init();
    M.cinema.init();
    M.pwa.init();
});
