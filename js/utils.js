// ==========================
// SHARED HELPERS
// ==========================
(function (MyFlix) {
    const PLACEHOLDER_POSTER = "assets/no-poster.svg";

    // Escape text before putting it into innerHTML, so a show title
    // like "<b>Hi</b>" is shown as text instead of being run as HTML.
    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    // Lower-case, drop punctuation and a leading "the", collapse spaces.
    // "The Queen's Gambit" -> "queens gambit"
    function normalizeAnswer(text) {
        return String(text ?? "")
            .toLowerCase()
            .replace(/['’]/g, "")
            .replace(/[^a-z0-9]+/g, " ")
            .trim()
            .replace(/^the\s+/, "");
    }

    function posterUrl(show) {
        return show.image?.medium || PLACEHOLDER_POSTER;
    }

    function yearOf(show) {
        return show.premiered ? show.premiered.slice(0, 4) : "Unknown year";
    }

    // localStorage can throw (private mode, full quota) or hold bad JSON.
    const storage = {
        read(key, fallback) {
            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : fallback;
            } catch {
                return fallback;
            }
        },
        write(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch {
                /* storage unavailable: keep working in memory */
            }
        }
    };

    // Briefly add a CSS class (for shake / glitch effects).
    function flashClass(el, className, ms = 500) {
        if (!el) return;
        el.classList.remove(className);
        void el.offsetWidth; // restart the animation if it is already running
        el.classList.add(className);
        setTimeout(() => el.classList.remove(className), ms);
    }

    MyFlix.utils = { escapeHtml, normalizeAnswer, posterUrl, yearOf, storage, flashClass, PLACEHOLDER_POSTER };
})(window.MyFlix = window.MyFlix || {});
