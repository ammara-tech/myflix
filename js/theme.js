// ==========================
// LIGHT / DARK THEME
// ==========================
// Loaded in <head> (not deferred) so the saved theme applies before the
// page paints. MYFLIX is dark by default, like a cinema.
(function (MyFlix) {
    const KEY = "myflixTheme";

    function saved() {
        try { return localStorage.getItem(KEY); } catch { return null; }
    }

    function apply(theme) {
        document.documentElement.dataset.theme = theme;
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = theme === "light" ? "#f5f5f1" : "#141414";
        document.querySelectorAll("[data-theme-label]").forEach(el => {
            el.innerHTML = `${MyFlix.icon ? MyFlix.icon(theme === "light" ? "moon" : "sun") : ""}<span>${theme === "light" ? "Dark mode" : "Light mode"}</span>`;
        });
    }

    function toggle() {
        const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
        try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
        apply(next);
    }

    apply(saved() || "dark");
    MyFlix.theme = { init: () => apply(saved() || "dark"), toggle };
})(window.MyFlix = window.MyFlix || {});
