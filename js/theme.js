// ==========================
// LIGHT / DARK THEME
// ==========================
// Loaded in <head> (not deferred) so the saved theme is applied before
// the page paints — no white flash when you prefer dark, or vice versa.
(function (MyFlix) {
    const KEY = "myflixTheme";

    function saved() {
        try { return localStorage.getItem(KEY); } catch { return null; }
    }

    function preferred() {
        return saved() || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    }

    function apply(theme) {
        document.documentElement.dataset.theme = theme;
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = theme === "light" ? "#f4f4f6" : "#141414";
        const btn = document.getElementById("theme-toggle");
        if (btn) {
            btn.textContent = theme === "light" ? "🌙" : "☀️";
            btn.setAttribute("aria-label", theme === "light" ? "Switch to dark theme" : "Switch to light theme");
            btn.title = btn.getAttribute("aria-label");
        }
    }

    function toggle() {
        const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
        try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
        apply(next);
    }

    function init() {
        apply(preferred());
        document.getElementById("theme-toggle").addEventListener("click", toggle);
        // Follow the system setting until the user picks one themselves.
        matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
            if (!saved()) apply(preferred());
        });
    }

    apply(preferred());
    MyFlix.theme = { init, toggle };
})(window.MyFlix = window.MyFlix || {});
