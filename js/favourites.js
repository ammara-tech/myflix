// ==========================
// MY LIST (WANT TO WATCH / WATCHED + STAR RATINGS)
// ==========================
(function (MyFlix) {
    const { storage, toast } = MyFlix.utils;
    const { createMovieCard, setRowMessage } = MyFlix.cards;
    const STORAGE_KEY = "favouriteMovies";

    const TABS = {
        want: { label: "Want to Watch", empty: "Nothing here yet. Search for a show and press “+ My List”." },
        watched: { label: "Watched", empty: "Shows you mark as watched appear here, ready to rate." }
    };

    let favourites = load();
    let activeTab = "want";
    const listeners = [];
    let els = {};

    // Older versions saved items without a status: treat them as "want".
    function load() {
        const saved = storage.read(STORAGE_KEY, []);
        if (!Array.isArray(saved)) return [];
        return saved
            .filter(item => item && item.id != null)
            .map(item => ({ ...item, status: item.status === "watched" ? "watched" : "want", myRating: item.myRating || 0 }));
    }

    // Only keep the fields we display, so localStorage stays small.
    function slim(show, status) {
        return {
            id: show.id,
            name: show.name,
            premiered: show.premiered || null,
            genres: show.genres || [],
            type: show.type || null,
            rating: show.rating?.average ? { average: show.rating.average } : null,
            image: show.image ? { medium: show.image.medium } : null,
            status,
            myRating: 0,
            addedAt: Date.now()
        };
    }

    // ---------- public API ----------
    function all() { return favourites.slice(); }
    function get(id) { return favourites.find(f => f.id === id) || null; }
    function has(id) { return Boolean(get(id)); }

    function add(show, status = "want") {
        const existing = get(show.id);
        if (existing) {
            if (existing.status !== status) setStatus(show.id, status);
            return;
        }
        favourites.push(slim(show, status));
        toast(`Added “${show.name}” to ${TABS[status].label}`);
        sync();
    }

    function remove(id) {
        favourites = favourites.filter(f => f.id !== id);
        sync();
    }

    function setStatus(id, status) {
        const item = get(id);
        if (!item || item.status === status) return;
        item.status = status;
        toast(`Moved “${item.name}” to ${TABS[status].label}`);
        sync();
    }

    function setRating(id, stars) {
        const item = get(id);
        if (!item) return;
        item.myRating = item.myRating === stars ? 0 : stars; // click the same star again to clear
        sync();
    }

    function onChange(fn) { listeners.push(fn); }

    function sync() {
        storage.write(STORAGE_KEY, favourites);
        render();
        listeners.forEach(fn => fn());
    }

    // ---------- star rating widget ----------
    function createStars(item) {
        const wrap = document.createElement("div");
        wrap.className = "stars";
        wrap.setAttribute("role", "group");
        wrap.setAttribute("aria-label", `Your rating for ${item.name}`);

        for (let n = 1; n <= 5; n++) {
            const star = document.createElement("button");
            star.type = "button";
            star.className = "star" + (n <= item.myRating ? " filled" : "");
            star.textContent = "★";
            star.setAttribute("aria-label", `${n} star${n > 1 ? "s" : ""}`);
            star.setAttribute("aria-pressed", String(n === item.myRating));
            star.addEventListener("click", () => setRating(item.id, n));
            wrap.appendChild(star);
        }
        return wrap;
    }

    // ---------- rendering ----------
    function renderTabs() {
        els.tabs.forEach(tab => {
            const key = tab.dataset.tab;
            const count = favourites.filter(f => f.status === key).length;
            const selected = key === activeTab;
            tab.classList.toggle("active", selected);
            tab.setAttribute("aria-selected", String(selected));
            tab.tabIndex = selected ? 0 : -1;
            tab.querySelector(".count").textContent = count;
        });
    }

    function render() {
        renderTabs();
        els.list.innerHTML = "";

        const items = favourites
            .filter(f => f.status === activeTab)
            .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

        if (!items.length) {
            setRowMessage(els.list, TABS[activeTab].empty);
            return;
        }

        items.forEach(item => {
            const watched = item.status === "watched";
            els.list.appendChild(createMovieCard(item, {
                extra: watched ? createStars(item) : null,
                actions: [
                    watched
                        ? { label: "↩ Rewatch", className: "btn-secondary", title: "Move back to Want to Watch", onClick: () => setStatus(item.id, "want") }
                        : { label: "✓ Watched", className: "watched-btn", onClick: () => setStatus(item.id, "watched") },
                    { label: "✕", className: "remove-btn", title: `Remove ${item.name}`, onClick: () => remove(item.id) }
                ]
            }));
        });
    }

    function selectTab(key) {
        activeTab = key;
        render();
        els.list.scrollLeft = 0;
    }

    function init() {
        els = {
            list: document.getElementById("favourites-list"),
            tabs: document.querySelectorAll(".list-tab")
        };

        els.tabs.forEach(tab => {
            tab.addEventListener("click", () => selectTab(tab.dataset.tab));
            // Arrow keys move between tabs (standard tab-list behaviour).
            tab.addEventListener("keydown", e => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                const next = tab.dataset.tab === "want" ? "watched" : "want";
                selectTab(next);
                document.querySelector(`.list-tab[data-tab="${next}"]`).focus();
            });
        });

        render();
    }

    MyFlix.favourites = { init, add, remove, has, get, all, setStatus, setRating, onChange };
})(window.MyFlix = window.MyFlix || {});
