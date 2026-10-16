// ==========================
// MOVIE CARDS + CAROUSEL ROWS
// ==========================
(function (MyFlix) {
    const { escapeHtml, posterUrl, yearOf, PLACEHOLDER_POSTER } = MyFlix.utils;

    /**
     * Build one poster card.
     * options.actions: [{ label, className, onClick(btn), disabled, title }]
     * options.extra:   optional DOM node shown above the buttons (e.g. stars)
     * options.badge:   optional small label in the poster corner
     */
    function createMovieCard(show, options = {}) {
        const card = document.createElement("article");
        card.className = "movie-card";
        card.dataset.id = show.id;

        const rating = show.rating?.average;
        card.innerHTML = `
            <button type="button" class="poster-btn" aria-label="View details for ${escapeHtml(show.name)}">
                <img src="${escapeHtml(posterUrl(show))}" alt="" loading="lazy">
                ${options.badge ? `<span class="card-badge">${escapeHtml(options.badge)}</span>` : ""}
                ${rating ? `<span class="card-rating">★ ${rating.toFixed(1)}</span>` : ""}
            </button>
            <h3>${escapeHtml(show.name)}</h3>
            <p>${escapeHtml(yearOf(show))}</p>
            <div class="card-actions"></div>
        `;

        // Swap in the placeholder if the poster URL is broken.
        const img = card.querySelector("img");
        img.addEventListener("error", () => {
            if (!img.src.endsWith(PLACEHOLDER_POSTER)) img.src = PLACEHOLDER_POSTER;
        }, { once: true });

        card.querySelector(".poster-btn").addEventListener("click", () => MyFlix.details.open(show));

        const actionsEl = card.querySelector(".card-actions");
        if (options.extra) actionsEl.before(options.extra);

        (options.actions || []).forEach(action => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = action.className || "";
            btn.textContent = action.label;
            if (action.title) btn.title = action.title;
            btn.disabled = Boolean(action.disabled);
            btn.addEventListener("click", () => action.onClick(btn));
            actionsEl.appendChild(btn);
        });

        return card;
    }

    // Show a message (empty, loading, error) inside a row.
    function setRowMessage(row, text, kind = "empty") {
        row.innerHTML = `<p class="row-message ${kind}">${escapeHtml(text)}</p>`;
    }

    // Wire up every ‹ › arrow: <button class="scroll-btn" data-target="row-id" data-dir="-1">
    function initScrollButtons() {
        document.querySelectorAll(".scroll-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const row = document.getElementById(btn.dataset.target);
                if (!row) return;
                row.scrollBy({ left: Number(btn.dataset.dir) * row.clientWidth * 0.8, behavior: "smooth" });
            });
        });
    }

    // The standard "Save" button used by search results and recommendations.
    function saveAction(show) {
        const saved = MyFlix.favourites.has(show.id);
        return {
            label: saved ? "✓ In My List" : "+ My List",
            className: "save-btn",
            disabled: saved,
            onClick: () => MyFlix.favourites.add(show)
        };
    }

    MyFlix.cards = { createMovieCard, setRowMessage, initScrollButtons, saveAction };
})(window.MyFlix = window.MyFlix || {});
