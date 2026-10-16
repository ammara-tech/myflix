// ==========================
// MOVIE CARDS + CAROUSEL ROWS
// ==========================
(function (MyFlix) {
    const { escapeHtml, posterUrl, yearOf, PLACEHOLDER_POSTER } = MyFlix.utils;

    // Build one poster card. `action` is { label, className, onClick, disabled }.
    function createMovieCard(show, action) {
        const card = document.createElement("article");
        card.className = "movie-card";

        card.innerHTML = `
            <img src="${escapeHtml(posterUrl(show))}" alt="${escapeHtml(show.name)} poster" loading="lazy">
            <h3>${escapeHtml(show.name)}</h3>
            <p>${escapeHtml(yearOf(show))}</p>
            <button type="button" class="${action.className}">${escapeHtml(action.label)}</button>
        `;

        // Swap in the placeholder if the poster URL is broken.
        const img = card.querySelector("img");
        img.addEventListener("error", () => {
            if (!img.src.endsWith(PLACEHOLDER_POSTER)) img.src = PLACEHOLDER_POSTER;
        }, { once: true });

        const btn = card.querySelector("button");
        btn.disabled = Boolean(action.disabled);
        btn.addEventListener("click", () => action.onClick(btn));

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

    MyFlix.cards = { createMovieCard, setRowMessage, initScrollButtons };
})(window.MyFlix = window.MyFlix || {});
