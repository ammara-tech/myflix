// ==========================
// SHOW DETAILS POPUP
// ==========================
(function (MyFlix) {
    const { escapeHtml, stripHtml, posterUrl, yearOf, PLACEHOLDER_POSTER } = MyFlix.utils;

    let dialog, body;
    let current = null;      // the show currently open
    let pending = null;      // AbortController for the details request

    // ---------- small builders ----------
    function metaLine(show) {
        const parts = [
            yearOf(show),
            show.network?.name || show.webChannel?.name,
            show.averageRuntime || show.runtime ? `${show.averageRuntime || show.runtime} min` : null,
            show.status,
            show.language
        ].filter(Boolean);
        return parts.map(escapeHtml).join(" · ");
    }

    function genreChips(show) {
        if (!show.genres?.length) return "";
        return `<ul class="chips">${show.genres.map(g => `<li>${escapeHtml(g)}</li>`).join("")}</ul>`;
    }

    function castHtml(cast) {
        if (!cast?.length) return `<p class="muted">No cast information.</p>`;
        return `<ul class="cast-grid">${cast.slice(0, 12).map(({ person, character }) => `
            <li>
                <img src="${escapeHtml(person.image?.medium || PLACEHOLDER_POSTER)}" alt="" loading="lazy">
                <strong>${escapeHtml(person.name)}</strong>
                <span>${escapeHtml(character?.name || "")}</span>
            </li>`).join("")}</ul>`;
    }

    function seasonsHtml(seasons) {
        if (!seasons?.length) return `<p class="muted">No season information.</p>`;
        return seasons.map(s => `
            <details class="season" data-season-id="${s.id}">
                <summary>
                    Season ${escapeHtml(s.number)}
                    <span class="muted">${s.episodeOrder ? `${s.episodeOrder} episodes` : ""}
                    ${s.premiereDate ? ` · ${escapeHtml(s.premiereDate.slice(0, 4))}` : ""}</span>
                </summary>
                <ol class="episodes"><li class="muted">Loading episodes…</li></ol>
            </details>`).join("");
    }

    // ---------- list buttons inside the popup ----------
    function renderListActions() {
        const box = body.querySelector(".details-actions");
        if (!box || !current) return;
        const fav = MyFlix.favourites;
        const item = fav.get(current.id);

        box.innerHTML = "";
        const add = (label, cls, onClick) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = cls;
            b.textContent = label;
            b.addEventListener("click", onClick);
            box.appendChild(b);
        };

        if (!item) {
            add("+ Want to Watch", "", () => fav.add(current, "want"));
            add("✓ Already Watched", "btn-secondary", () => fav.add(current, "watched"));
        } else if (item.status === "want") {
            add("✓ Mark as Watched", "watched-btn", () => fav.setStatus(current.id, "watched"));
            add("Remove from My List", "btn-secondary", () => fav.remove(current.id));
        } else {
            add("↩ Want to Rewatch", "btn-secondary", () => fav.setStatus(current.id, "want"));
            add("Remove from My List", "btn-secondary", () => fav.remove(current.id));
        }
    }

    // ---------- rendering ----------
    function render(show, { loading = false, error = false } = {}) {
        const poster = show.image?.original || posterUrl(show);
        const rating = show.rating?.average;
        const summary = stripHtml(show.summary);

        body.innerHTML = `
            <div class="details-hero">
                <img class="details-poster" src="${escapeHtml(poster)}" alt="${escapeHtml(show.name)} poster">
                <div class="details-info">
                    <h2 id="details-title">${escapeHtml(show.name)}</h2>
                    <p class="details-meta">${metaLine(show)}</p>
                    ${rating ? `<p class="details-rating">★ ${rating.toFixed(1)} <span class="muted">/ 10 on TVMaze</span></p>` : ""}
                    ${genreChips(show)}
                    <div class="details-actions"></div>
                </div>
            </div>
            <section>
                <h3>Summary</h3>
                <p>${loading ? "Loading…" : escapeHtml(summary || "No summary available.")}</p>
            </section>
            ${error ? `<p class="row-message error">Couldn't load the full details. Check your connection.</p>` : ""}
            ${loading || error ? "" : `
                <section><h3>Cast</h3>${castHtml(show._embedded?.cast)}</section>
                <section><h3>Seasons &amp; Episodes</h3>${seasonsHtml(show._embedded?.seasons)}</section>
            `}
        `;

        const img = body.querySelector(".details-poster");
        img.addEventListener("error", () => { img.src = PLACEHOLDER_POSTER; }, { once: true });

        body.querySelectorAll(".season").forEach(el => {
            el.addEventListener("toggle", () => el.open && loadEpisodes(el), { once: false });
        });

        renderListActions();
    }

    async function loadEpisodes(seasonEl) {
        if (seasonEl.dataset.loaded) return;
        seasonEl.dataset.loaded = "1";
        const list = seasonEl.querySelector(".episodes");
        try {
            const episodes = await MyFlix.api.getSeasonEpisodes(seasonEl.dataset.seasonId);
            list.innerHTML = episodes.length
                ? episodes.map(ep => `
                    <li>
                        <strong>${escapeHtml(ep.number ?? "Special")}. ${escapeHtml(ep.name)}</strong>
                        <span class="muted">${escapeHtml(ep.airdate || "")}${ep.runtime ? ` · ${ep.runtime} min` : ""}</span>
                        ${ep.summary ? `<p>${escapeHtml(stripHtml(ep.summary))}</p>` : ""}
                    </li>`).join("")
                : `<li class="muted">No episodes listed.</li>`;
        } catch {
            delete seasonEl.dataset.loaded;
            list.innerHTML = `<li class="wrong">Couldn't load episodes. Close and reopen to retry.</li>`;
        }
    }

    // ---------- open / close ----------
    async function open(show) {
        pending?.abort();
        current = show;
        render(show, { loading: true });
        if (!dialog.open) dialog.showModal();
        body.scrollTop = 0;

        const controller = new AbortController();
        pending = controller;
        try {
            const full = await MyFlix.api.getShowDetails(show.id, controller.signal);
            if (current?.id !== show.id) return;
            current = full;
            render(full);
        } catch (err) {
            if (err.name !== "AbortError") render(show, { error: true });
        }
    }

    function close() {
        pending?.abort();
        if (dialog.open) dialog.close();
    }

    function init() {
        dialog = document.getElementById("details-dialog");
        body = dialog.querySelector(".details-body");

        dialog.querySelector(".details-close").addEventListener("click", close);
        // Click on the dark backdrop (outside the panel) closes it.
        dialog.addEventListener("click", e => {
            if (e.target === dialog) close();
        });
        dialog.addEventListener("close", () => { current = null; });

        // Keep the buttons right when My List changes from inside the popup.
        MyFlix.favourites.onChange(renderListActions);
    }

    MyFlix.details = { init, open, close };
})(window.MyFlix = window.MyFlix || {});
