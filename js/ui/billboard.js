// ==========================
// BILLBOARD (the big hero banner at the top of a page)
// ==========================
(function (MyFlix) {
    const { escapeHtml, truncate, safeImg } = MyFlix.utils;
    const icon = (...a) => MyFlix.icon(...a);

    /**
     * Render a hero for one title into `el`.
     * opts.image: wide background image URL
     * opts.portrait: a poster to show when no wide image exists
     * opts.kicker: small label above the title ("Classic Cinema", "#1 in TV today")
     */
    function render(el, title, opts = {}) {
        const image = opts.image || title.backdropLarge || title.backdrop;
        const portrait = !image && (opts.portrait || title.posterLarge || title.poster);
        const playable = MyFlix.actions.canPlay(title);

        el.className = `billboard ${portrait ? "billboard--portrait" : ""}`;
        el.innerHTML = `
            <div class="billboard-media">
                ${image ? `<img class="billboard-img" src="${escapeHtml(image)}" alt="">` : ""}
                ${portrait ? `<img class="billboard-blur" src="${escapeHtml(portrait)}" alt=""><img class="billboard-poster" src="${escapeHtml(portrait)}" alt="">` : ""}
                <div class="billboard-vignette"></div>
            </div>
            <div class="billboard-content">
                ${opts.kicker ? `<p class="billboard-kicker"><span class="kicker-mark">M</span>${escapeHtml(opts.kicker)}</p>` : ""}
                <h1 class="billboard-title">${escapeHtml(title.name)}</h1>
                <p class="billboard-meta">
                    ${title.rating ? `<span class="match">${icon("star")} ${escapeHtml(title.rating)}</span>` : ""}
                    ${title.year ? `<span>${escapeHtml(title.year)}</span>` : ""}
                    ${title.runtime ? `<span>${escapeHtml(MyFlix.utils.formatRuntime(title.runtime))}</span>` : ""}
                    ${(title.genres || []).slice(0, 3).map(g => `<span class="genre">${escapeHtml(g)}</span>`).join("")}
                </p>
                <p class="billboard-overview">${escapeHtml(truncate(title.overview, 220))}</p>
                <div class="billboard-actions">
                    ${playable
                        ? `<button type="button" class="btn btn--play" data-act="play">${icon("play")}<span>Play</span></button>`
                        : `<button type="button" class="btn btn--play" data-act="info">${icon("play")}<span>${title.kind === "tv" ? "Episodes" : "Watch"}</span></button>`}
                    <button type="button" class="btn btn--grey" data-act="info">${icon("info")}<span>More Info</span></button>
                    <button type="button" class="btn btn--ghost" data-act="list" data-list-key="${escapeHtml(title.key)}" data-labelled="1"></button>
                </div>
            </div>`;

        el.querySelectorAll("img").forEach(img => safeImg(img, ""));
        el.querySelector(".billboard-img")?.addEventListener("error", () => el.classList.add("billboard--noimg"));
        // onclick (not addEventListener) so re-rendering doesn't stack handlers
        el.onclick = e => {
            const btn = e.target.closest("[data-act]");
            if (!btn) return;
            const act = btn.dataset.act;
            if (act === "play") MyFlix.actions.play(title);
            if (act === "info") MyFlix.actions.info(title);
            if (act === "list") MyFlix.actions.toggleList(title);
        };
        MyFlix.cards.refreshListButtons();
        applyLogo(el.querySelector(".billboard-title"), title);
    }

    // Swap a plain-text title for a fanart.tv logo when one exists.
    // The text stays for screen readers and shows again if the image fails.
    function applyLogo(titleEl, t) {
        if (!titleEl || !MyFlix.fanart.enabled()) return;
        MyFlix.fanart.logoFor(t).then(url => {
            if (!url || !titleEl.isConnected) return;
            const img = new Image();
            img.className = "title-logo";
            img.alt = "";
            img.onload = () => {
                if (!titleEl.isConnected) return;
                titleEl.classList.add("has-logo");
                titleEl.innerHTML = `<span class="sr-only">${escapeHtml(t.name)}</span>`;
                titleEl.prepend(img);
            };
            img.src = url;
        }).catch(() => {});
    }

    function skeleton(el) {
        el.className = "billboard billboard--loading";
        el.innerHTML = `<div class="billboard-media"><div class="billboard-vignette"></div></div>`;
    }

    MyFlix.billboard = { render, skeleton, applyLogo };
})(window.MyFlix = window.MyFlix || {});
