// ==========================
// CARDS + ROWS (Netflix-style sliders)
// ==========================
(function (MyFlix) {
    const { escapeHtml, safeImg, PLACEHOLDER_POSTER } = MyFlix.utils;
    const icon = (...a) => MyFlix.icon(...a);

    // ---------- shared actions ----------
    const actions = {
        info: title => MyFlix.details.open(title),
        play: title => MyFlix.player.play(title),
        toggleList: title => MyFlix.store.list.toggle(title),
        canPlay: title => Boolean(title.film)
    };
    MyFlix.actions = actions;

    // Classic films have no poster until Wikipedia answers, so show a
    // typographic "Criterion-style" poster meanwhile.
    function typePoster(title) {
        return `
            <div class="type-poster">
                <span class="tp-kicker">${escapeHtml(title.kind === "classic" ? "Classic" : "MYFLIX")}</span>
                <span class="tp-title">${escapeHtml(title.name)}</span>
                <span class="tp-year">${escapeHtml(title.year || "")}</span>
            </div>`;
    }

    // Swap in a Wikipedia poster for a classic when it arrives.
    function lazyClassicPoster(title, mediaEl, wide) {
        MyFlix.wiki.summary(title.name, title.year, "film").then(w => {
            const src = w?.image;
            if (!src || !mediaEl.isConnected) return;
            const img = safeImg(new Image());
            img.alt = "";
            img.className = wide ? "card-img card-img--contain" : "card-img";
            img.onload = () => {
                mediaEl.querySelector(".type-poster")?.classList.add("faded");
                mediaEl.prepend(img);
            };
            img.src = src;
        }).catch(() => {});
    }

    function metaLine(title) {
        const bits = [];
        if (title.rating) bits.push(`<span class="match">${icon("star")} ${title.rating.toFixed ? title.rating.toFixed(1) : title.rating}</span>`);
        if (title.kind === "classic") bits.push(`<span class="pill pill--free">Free</span>`);
        if (title.year) bits.push(`<span>${escapeHtml(title.year)}</span>`);
        if (title.runtime) bits.push(`<span>${escapeHtml(MyFlix.utils.formatRuntime(title.runtime))}</span>`);
        return bits.join("");
    }

    /**
     * One card.
     * variant: "poster" (2:3) · "wide" (16:9) · "top10" (big number + poster)
     * opts.rank: number for top10 · opts.progress: 0..1 progress bar · opts.subtitle
     */
    function createCard(title, variant = "poster", opts = {}) {
        const card = document.createElement("article");
        card.className = `card card--${variant}`;
        card.dataset.key = title.key;

        const wide = variant === "wide";
        const imgSrc = wide ? (title.backdrop || title.poster) : title.poster;
        const inList = MyFlix.store.list.has(title.key);
        const playable = actions.canPlay(title);
        const genres = (title.genres || []).slice(0, 3).map(escapeHtml).join('<i class="dot"></i>');

        card.innerHTML = `
            ${variant === "top10" ? `<span class="rank" aria-hidden="true">${opts.rank}</span>` : ""}
            <button type="button" class="card-media" aria-label="${escapeHtml(title.name)} – more info">
                ${imgSrc ? `<img class="card-img ${wide && !title.backdrop ? "card-img--contain" : ""}" src="${escapeHtml(imgSrc)}" alt="" loading="lazy">` : typePoster(title)}
                ${title.kind === "classic" ? `<span class="badge-free">${icon("sparkles")} Free</span>` : ""}
                ${wide || opts.showTitle ? `<span class="card-title-overlay">${escapeHtml(title.name)}${opts.subtitle ? `<small>${escapeHtml(opts.subtitle)}</small>` : ""}</span>` : ""}
                ${opts.progress != null ? `<span class="progress"><span style="width:${Math.round(opts.progress * 100)}%"></span></span>` : ""}
            </button>
            <div class="card-hover">
                <div class="card-hover-actions">
                    ${playable ? `<button type="button" class="circle circle--primary" data-act="play" aria-label="Play ${escapeHtml(title.name)}">${icon("play")}</button>` : ""}
                    <button type="button" class="circle" data-act="list" data-list-key="${escapeHtml(title.key)}" aria-label="${inList ? "Remove from" : "Add to"} My List">${icon(inList ? "check" : "plus")}</button>
                    <button type="button" class="circle circle--end" data-act="info" aria-label="More info">${icon("chevron-down")}</button>
                </div>
                <p class="card-hover-title">${escapeHtml(title.name)}</p>
                <p class="card-hover-meta">${metaLine(title)}</p>
                ${genres ? `<p class="card-hover-genres">${genres}</p>` : ""}
            </div>
        `;

        const media = card.querySelector(".card-media");
        const img = card.querySelector(".card-img");
        if (img) safeImg(img);
        if (!imgSrc && title.kind === "classic") lazyClassicPoster(title, media, wide);

        media.addEventListener("click", () => (opts.onClick ? opts.onClick(title) : actions.info(title)));
        card.querySelector(".card-hover").addEventListener("click", e => {
            const btn = e.target.closest("[data-act]");
            if (!btn) return;
            e.stopPropagation();
            if (btn.dataset.act === "play") actions.play(title);
            if (btn.dataset.act === "list") actions.toggleList(title);
            if (btn.dataset.act === "info") actions.info(title);
        });
        return card;
    }

    // Keep every "+ / ✓" button on the page in sync with My List.
    function refreshListButtons() {
        document.querySelectorAll("[data-list-key]").forEach(btn => {
            const has = MyFlix.store.list.has(btn.dataset.listKey);
            btn.innerHTML = btn.dataset.labelled
                ? `${icon(has ? "check" : "plus")}<span>${has ? "In My List" : "My List"}</span>`
                : icon(has ? "check" : "plus");
            btn.setAttribute("aria-label", `${has ? "Remove from" : "Add to"} My List`);
            btn.classList.toggle("is-on", has);
        });
    }

    function skeletons(n, variant) {
        return Array.from({ length: n }, () => `<div class="card card--${variant} skeleton" aria-hidden="true"><div class="card-media"></div></div>`).join("");
    }

    /**
     * A titled, horizontally scrolling row.
     * opts: { title, subtitle, variant, load: () => Promise<title[]>, items, empty, hideIfEmpty,
     *         cardOpts: (title, i) => opts, onExplore, id }
     */
    function createRow(opts) {
        const variant = opts.variant || "poster";
        const row = document.createElement("section");
        row.className = `row row--${variant}`;
        if (opts.id) row.id = opts.id;
        row.innerHTML = `
            <div class="row-head">
                <h2 class="row-title">${escapeHtml(opts.title)}${opts.onExplore ? `<button type="button" class="row-explore">Explore all ${icon("chevron-right")}</button>` : ""}</h2>
                ${opts.subtitle ? `<p class="row-subtitle">${escapeHtml(opts.subtitle)}</p>` : ""}
            </div>
            <div class="row-slider">
                <button type="button" class="row-arrow row-arrow--prev" aria-label="Previous">${icon("chevron-left")}</button>
                <div class="row-track">${skeletons(variant === "wide" ? 4 : 7, variant)}</div>
                <button type="button" class="row-arrow row-arrow--next" aria-label="Next">${icon("chevron-right")}</button>
            </div>`;

        const track = row.querySelector(".row-track");
        const prev = row.querySelector(".row-arrow--prev");
        const next = row.querySelector(".row-arrow--next");
        const page = dir => track.scrollBy({ left: dir * track.clientWidth * 0.9, behavior: "smooth" });
        prev.addEventListener("click", () => page(-1));
        next.addEventListener("click", () => page(1));
        const updateArrows = () => {
            prev.classList.toggle("hidden-arrow", track.scrollLeft < 10);
            next.classList.toggle("hidden-arrow", track.scrollLeft + track.clientWidth >= track.scrollWidth - 10);
        };
        track.addEventListener("scroll", updateArrows, { passive: true });
        row.querySelector(".row-explore")?.addEventListener("click", opts.onExplore);

        function fill(items) {
            track.innerHTML = "";
            row.classList.remove("hidden");
            if (!items?.length) {
                // hide (not remove): the row may not be on the page yet
                if (opts.hideIfEmpty) { row.classList.add("hidden"); return; }
                track.innerHTML = `<p class="row-empty">${escapeHtml(opts.empty || "Nothing here yet.")}</p>`;
                updateArrows();
                return;
            }
            items.forEach((t, i) => track.appendChild(createCard(t, variant, { rank: i + 1, ...(opts.cardOpts?.(t, i) || {}) })));
            requestAnimationFrame(updateArrows);
        }

        const start = () => opts.load().then(fill).catch(err => {
            if (opts.hideIfEmpty) { row.classList.add("hidden"); return; }
            track.innerHTML = `<p class="row-empty row-empty--error">${escapeHtml(err.code === "NO_KEY" ? err.message : "Couldn't load this row. Check your connection.")}</p>`;
        });

        if (opts.items) fill(opts.items);
        else if (opts.load && opts.lazy && "IntersectionObserver" in window) {
            // Only fetch when the row is about to scroll into view (saves API calls).
            const io = new IntersectionObserver(entries => {
                if (entries.some(e => e.isIntersecting)) { io.disconnect(); start(); }
            }, { rootMargin: "400px 0px" });
            io.observe(row);
        } else if (opts.load) start();
        row.fill = fill;
        return row;
    }

    // A responsive grid of cards (search results, "More like this", My List).
    function createGrid(items, variant = "poster", cardOpts) {
        const grid = document.createElement("div");
        grid.className = `card-grid card-grid--${variant}`;
        items.forEach((t, i) => grid.appendChild(createCard(t, variant, cardOpts?.(t, i) || {})));
        return grid;
    }

    MyFlix.cards = { createCard, createRow, createGrid, refreshListButtons, typePoster, PLACEHOLDER_POSTER };
})(window.MyFlix = window.MyFlix || {});
