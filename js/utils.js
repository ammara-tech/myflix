// ==========================
// SHARED HELPERS
// ==========================
(function (MyFlix) {
    const PLACEHOLDER_POSTER = "assets/no-poster.svg";

    // Escape text before putting it into innerHTML, so a title like
    // "<b>Hi</b>" shows as text instead of running as HTML.
    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    // "The Queen's Gambit" -> "queens gambit" (for comparing game answers)
    function normalizeAnswer(text) {
        return String(text ?? "")
            .toLowerCase()
            .normalize("NFD").replace(/[̀-ͯ]/g, "")
            .replace(/['’]/g, "")
            .replace(/&/g, " and ")
            .replace(/[^a-z0-9]+/g, " ")
            .trim()
            .replace(/^(the|a|an)\s+/, "");
    }

    // TVMaze/Wikipedia text can contain HTML; turn it into plain text.
    function stripHtml(html) {
        if (!html) return "";
        const doc = new DOMParser().parseFromString(html, "text/html");
        return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
    }

    function truncate(text, max) {
        if (!text || text.length <= max) return text || "";
        return text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
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
        },
        remove(key) {
            try { localStorage.removeItem(key); } catch { /* ignore */ }
        }
    };

    // Cache slow lookups (Wikipedia, Archive, OMDb) in localStorage for `days`.
    const CACHE_KEY = "myflixCache";
    let cache = storage.read(CACHE_KEY, {});
    async function cached(key, days, loader) {
        const hit = cache[key];
        if (hit && hit.until > Date.now()) return hit.value;
        const value = await loader();
        cache[key] = { value, until: Date.now() + days * 864e5 };
        // keep the cache from growing forever
        const keys = Object.keys(cache);
        if (keys.length > 400) keys.slice(0, 100).forEach(k => delete cache[k]);
        storage.write(CACHE_KEY, cache);
        return value;
    }
    function uncache(key) {
        delete cache[key];
        storage.write(CACHE_KEY, cache);
    }
    function clearCache() {
        cache = {};
        storage.remove(CACHE_KEY);
    }

    async function getJson(url, options = {}) {
        const res = await fetch(url, options);
        if (!res.ok) {
            const err = new Error(`${new URL(url).hostname} responded with ${res.status}`);
            err.status = res.status;
            throw err;
        }
        return res.json();
    }

    // Restart a CSS animation class (shake / glitch effects).
    function flashClass(el, className, ms = 500) {
        if (!el) return;
        el.classList.remove(className);
        void el.offsetWidth;
        el.classList.add(className);
        setTimeout(() => el.classList.remove(className), ms);
    }

    function debounce(fn, ms) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), ms);
        };
    }

    function shuffle(list) {
        const a = list.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function formatRuntime(minutes) {
        if (!minutes) return "";
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return h ? `${h}h ${m}m` : `${m}m`;
    }

    // "in 2d 5h", "in 3h 10m", "in 12m"
    function timeUntil(date) {
        const ms = new Date(date) - Date.now();
        if (ms <= 0) return "now";
        const mins = Math.round(ms / 60000);
        const d = Math.floor(mins / 1440);
        const h = Math.floor((mins % 1440) / 60);
        const m = mins % 60;
        if (d) return `in ${d}d ${h}h`;
        if (h) return `in ${h}h ${m}m`;
        return `in ${m}m`;
    }

    function formatClock(seconds) {
        if (!isFinite(seconds)) return "0:00";
        seconds = Math.max(0, Math.floor(seconds));
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = String(seconds % 60).padStart(2, "0");
        return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
    }

    // Pop-up message at the bottom of the screen.
    let toastEl, toastTimer;
    function toast(message, iconName = "check") {
        if (!toastEl) {
            toastEl = document.createElement("div");
            toastEl.className = "toast";
            toastEl.setAttribute("role", "status");
            document.body.appendChild(toastEl);
        }
        toastEl.innerHTML = `${MyFlix.icon(iconName)}<span>${escapeHtml(message)}</span>`;
        toastEl.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
    }

    // Set an <img> source with a fallback if it fails to load.
    function safeImg(img, fallback = PLACEHOLDER_POSTER) {
        img.addEventListener("error", () => {
            if (!img.src.endsWith(fallback)) img.src = fallback;
        }, { once: true });
        return img;
    }

    MyFlix.utils = {
        escapeHtml, normalizeAnswer, stripHtml, truncate, storage, cached, uncache, clearCache, getJson,
        flashClass, debounce, shuffle, formatRuntime, timeUntil, formatClock, toast, safeImg,
        PLACEHOLDER_POSTER
    };
})(window.MyFlix = window.MyFlix || {});
