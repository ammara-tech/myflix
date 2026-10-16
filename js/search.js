// ==========================
// SEARCH + GENRE FILTER
// ==========================
(function (MyFlix) {
    const { escapeHtml } = MyFlix.utils;
    const { createMovieCard, setRowMessage } = MyFlix.cards;
    const favourites = MyFlix.favourites;

    const START_MESSAGE = "Search for a show above, or pick a genre below to browse.";

    let els = {};
    let searchTerm = "";
    let shows = [];          // results of the current search or catalog browse
    let selectedGenre = null;
    let activeGenreCard = null;
    let pending = null;      // AbortController for the in-flight request

    // ---------- filtering ----------
    function matchesGenre(show, genre) {
        const inGenres = show.genres?.some(g => genre.matches.includes(g));
        const inTypes = genre.types?.includes(show.type);
        return Boolean(inGenres || inTypes);
    }

    function visibleShows() {
        return selectedGenre ? shows.filter(s => matchesGenre(s, selectedGenre)) : shows;
    }

    // ---------- rendering ----------
    function updateTitle() {
        const parts = [];
        if (searchTerm) parts.push(`“${searchTerm}”`);
        if (selectedGenre) parts.push(selectedGenre.title);
        els.title.textContent = parts.length ? `Results: ${parts.join(" · ")}` : "Search Results";
    }

    function render() {
        updateTitle();
        const list = visibleShows();
        els.results.innerHTML = "";

        if (!searchTerm && !selectedGenre) {
            setRowMessage(els.results, START_MESSAGE);
            return;
        }
        if (!list.length) {
            const msg = selectedGenre && searchTerm
                ? `No ${selectedGenre.title} titles match “${searchTerm}”. Try another genre or clear the filter.`
                : "No results found. Try a different search.";
            setRowMessage(els.results, msg);
            return;
        }

        list.forEach(show => {
            const saved = favourites.has(show.id);
            els.results.appendChild(createMovieCard(show, {
                label: saved ? "✓ In My List" : "Save Favourite",
                className: "save-btn",
                disabled: saved,
                onClick: () => favourites.add(show)
            }));
        });
    }

    // ---------- loading ----------
    async function load(fetcher) {
        pending?.abort();
        const controller = new AbortController();
        pending = controller;
        setRowMessage(els.results, "Loading…", "loading");

        try {
            shows = await fetcher(controller.signal);
            render();
            els.results.scrollLeft = 0;
        } catch (err) {
            if (err.name === "AbortError") return; // a newer request replaced this one
            shows = [];
            setRowMessage(els.results, "Couldn't reach the movie database. Check your connection and try again.", "error");
            console.warn(err);
        } finally {
            if (pending === controller) pending = null;
        }
    }

    function runSearch() {
        const term = els.input.value.trim();
        if (!term) {
            els.input.focus();
            setRowMessage(els.results, "Type a movie or show name first.", "error");
            return;
        }
        searchTerm = term;
        load(signal => MyFlix.api.searchShows(term, signal));
    }

    function clearAll() {
        pending?.abort();
        els.input.value = "";
        searchTerm = "";
        shows = [];
        setGenre(null);
        render();
    }

    // ---------- genres ----------
    function setGenre(genre, card) {
        activeGenreCard?.classList.remove("active");
        activeGenreCard?.setAttribute("aria-pressed", "false");
        selectedGenre = genre;
        activeGenreCard = genre ? card : null;

        if (genre) {
            card.classList.add("active");
            card.setAttribute("aria-pressed", "true");
            els.genreInfo.innerHTML = `
                <b style="color:${genre.color}">${escapeHtml(genre.title)}</b><br>
                ${escapeHtml(genre.description)}
                <span class="genre-hint">Click again to clear the filter.</span>`;
        } else {
            els.genreInfo.textContent = "Pick a genre to filter your results.";
        }
    }

    function onGenreClick(genre, card) {
        const turningOff = selectedGenre === genre;
        setGenre(turningOff ? null : genre, card);

        if (!searchTerm) {
            // No search yet: browse popular shows in this genre instead.
            if (turningOff) {
                shows = [];
                render();
            } else {
                load(signal => MyFlix.api.getCatalog(signal));
            }
        } else {
            render();
            els.results.scrollLeft = 0;
        }
        els.results.closest("section").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function renderGenres() {
        els.genreRow.innerHTML = "";
        MyFlix.genres.forEach(genre => {
            const card = document.createElement("button");
            card.type = "button";
            card.className = "category-card";
            card.textContent = genre.title;
            card.setAttribute("aria-pressed", "false");
            card.addEventListener("click", () => onGenreClick(genre, card));
            els.genreRow.appendChild(card);
        });
    }

    // ---------- init ----------
    function init() {
        els = {
            form: document.getElementById("search-form"),
            input: document.getElementById("search-input"),
            clear: document.getElementById("clear-btn"),
            results: document.getElementById("movie-results"),
            title: document.getElementById("results-title"),
            genreRow: document.getElementById("genreRow"),
            genreInfo: document.getElementById("genreInfo")
        };

        els.form.addEventListener("submit", e => {
            e.preventDefault();
            runSearch();
        });
        els.clear.addEventListener("click", clearAll);

        // Keep "Save" buttons in sync when My List changes.
        favourites.onChange(() => {
            if (shows.length) render();
        });

        renderGenres();
        setGenre(null);
        render();
    }

    MyFlix.search = { init };
})(window.MyFlix = window.MyFlix || {});
