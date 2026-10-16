// ==========================
// APP ENTRY POINT
// ==========================
// Scripts load in order from index.html (settings → data → helpers → APIs
// → UI → pages → main). Plain <script defer> files, not ES modules, so the
// app still works when index.html is opened straight from disk.
document.addEventListener("DOMContentLoaded", () => {
    const M = window.MyFlix;

    M.theme.init();
    M.details.init();
    M.player.init();
    M.party.init();
    M.mood.init();
    M.settings.init();
    M.router.init();
    M.tracker.init();
    M.pwa.init();

    // Keep every + / ✓ My List button in sync.
    M.store.onChange(what => { if (what === "list") M.cards.refreshListButtons(); });
});
