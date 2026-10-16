// ==========================
// CINEMA MODE
// ==========================
// With a TMDB key: plays real YouTube trailers for the chosen genre.
// Without one: plays the sample video, like before.
(function (MyFlix) {
    const { escapeHtml, toast } = MyFlix.utils;
    const trailers = MyFlix.trailers;

    const SAMPLE_BINGE_MS = 12000;        // sample mode: switch genre every 12s
    const TRAILER_FALLBACK_MS = 4 * 60e3; // trailer mode: skip on after 4 min if "ended" never arrives

    const films = MyFlix.films;
    const filmOrder = Object.keys(films);

    let els = {};
    let currentKey = filmOrder[0];
    let binge = false;
    let bingeTimer = null;
    let loadToken = 0;   // ignores stale results when films are switched quickly

    // ---------- helpers ----------
    function setStatus(text) {
        els.status.textContent = text;
    }

    function highlight(key) {
        els.cards.forEach(c => c.classList.toggle("active", c.dataset.film === key));
    }

    function setBadge(on) {
        els.badge.classList.toggle("on", on);
    }

    function showVideo() {
        els.frame.classList.add("hidden");
        els.frame.src = "about:blank";
        els.player.classList.remove("hidden");
        els.nowPlaying.classList.add("hidden");
    }

    function showFrame() {
        els.player.pause();
        els.player.classList.add("hidden");
        els.frame.classList.remove("hidden");
    }

    function scheduleBinge(ms) {
        clearTimeout(bingeTimer);
        if (binge) bingeTimer = setTimeout(advance, ms);
    }

    // ---------- sample video mode ----------
    function playSample(key) {
        const film = films[key];
        const token = ++loadToken;
        showVideo();
        setStatus(`Loading: ${film.title}`);

        if (els.player.getAttribute("src") !== film.url) els.player.src = film.url;
        else els.player.currentTime = 0;

        els.player.play()
            .then(() => { if (token === loadToken) setStatus(`Playing: ${film.title} (sample video)`); })
            .catch(err => {
                if (token !== loadToken || err.name === "AbortError") return;
                setStatus("Press ▶ on the player to start.");
            });
        scheduleBinge(SAMPLE_BINGE_MS);
    }

    // ---------- trailer mode ----------
    async function playTrailer(key) {
        const film = films[key];
        const token = ++loadToken;
        clearTimeout(bingeTimer);
        setStatus(`Finding a ${film.title} trailer…`);

        try {
            const t = await trailers.nextTrailer(key);
            if (token !== loadToken) return;

            showFrame();
            const params = new URLSearchParams({ autoplay: "1", mute: "1", rel: "0", enablejsapi: "1", playsinline: "1" });
            if (location.origin.startsWith("http")) params.set("origin", location.origin);
            els.frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(t.youtubeKey)}?${params}`;

            els.nowPlaying.innerHTML = `
                <strong>${escapeHtml(t.title)}</strong> ${t.year ? `<span class="muted">(${escapeHtml(t.year)})</span>` : ""}
                <p>${escapeHtml(t.overview.length > 220 ? t.overview.slice(0, 217) + "…" : t.overview)}</p>
                <a href="${escapeHtml(t.tmdbUrl)}" target="_blank" rel="noopener">More on TMDB ↗</a>`;
            els.nowPlaying.classList.remove("hidden");
            setStatus(`${film.title} trailer: ${t.title}`);
            setBadge(true);
            scheduleBinge(TRAILER_FALLBACK_MS);
        } catch (err) {
            if (token !== loadToken) return;
            setStatus(`${err.message} Playing the sample video instead.`);
            playSample(key);
        }
    }

    // Ask the YouTube player to send us its state, so Auto-Binge can move on
    // when a trailer ends (or skip one that can't be embedded).
    function listenToYouTube() {
        els.frame.addEventListener("load", () => {
            if (els.frame.classList.contains("hidden")) return;
            els.frame.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
        });
        window.addEventListener("message", e => {
            if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin, location.href).hostname || "")) return;
            let data;
            try { data = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch { return; }
            const playerState = data?.event === "onStateChange" ? data.info : data?.info?.playerState;
            if (playerState === 1) setBadge(true);
            if (playerState === 2) setBadge(false);
            if (playerState === 0 && binge) advance();
            if (data?.event === "onError") {
                setStatus("That trailer can't play here. Trying the next one…");
                playTrailer(currentKey);
            }
        });
    }

    // ---------- shared controls ----------
    function playFilm(key) {
        if (!films[key]) return;
        currentKey = key;
        highlight(key);
        if (trailers.isEnabled()) playTrailer(key);
        else playSample(key);
    }

    // Trailer mode: next trailer in the same genre.
    // Sample mode: next genre (all genres share the sample video).
    function advance() {
        if (trailers.isEnabled()) {
            playTrailer(currentKey);
        } else {
            const index = (filmOrder.indexOf(currentKey) + 1) % filmOrder.length;
            playFilm(filmOrder[index]);
        }
    }

    function setBinge(on) {
        binge = on;
        clearTimeout(bingeTimer);
        els.bingeBtn.classList.toggle("active", on);
        els.bingeBtn.setAttribute("aria-pressed", String(on));
        if (on) {
            toast(trailers.isEnabled() ? "Auto-Binge on: trailers play back to back" : "Auto-Binge on");
            advance();
        } else {
            setStatus("Auto-Binge off");
        }
    }

    // ---------- TMDB settings box ----------
    function renderSettings() {
        const has = trailers.isEnabled();
        els.keyInput.value = "";
        els.keyInput.placeholder = has ? "Key saved ✓ (paste a new one to replace)" : "Paste your TMDB API key";
        els.removeKey.classList.toggle("hidden", !has);
        els.modeLabel.textContent = has ? "Real trailers from TMDB" : "Sample video (add a TMDB key for real trailers)";
    }

    function initSettings() {
        els.keyForm.addEventListener("submit", async e => {
            e.preventDefault();
            const key = els.keyInput.value.trim();
            if (!key) return;
            const previous = trailers.getKey();
            trailers.setKey(key);
            els.keyMsg.textContent = "Checking key…";
            try {
                await trailers.testKey();
                els.keyMsg.textContent = "Key saved. Pick a genre to watch real trailers.";
                renderSettings();
            } catch (err) {
                trailers.setKey(previous);
                els.keyMsg.textContent = err.message.includes("rejected")
                    ? "That key didn't work. Double-check it on TMDB."
                    : "Couldn't reach TMDB to check the key. Try again later.";
            }
        });
        els.removeKey.addEventListener("click", () => {
            trailers.setKey("");
            els.keyMsg.textContent = "Key removed. Using the sample video.";
            showVideo();
            renderSettings();
        });
        renderSettings();
    }

    // ---------- init ----------
    function init() {
        const $ = id => document.getElementById(id);
        els = {
            player: $("cinema-player"),
            frame: $("trailer-frame"),
            status: $("cinema-status"),
            badge: $("cinema-badge"),
            bingeBtn: $("cinema-binge"),
            nowPlaying: $("now-playing"),
            cards: document.querySelectorAll(".film-card"),
            keyForm: $("tmdb-form"),
            keyInput: $("tmdb-key"),
            removeKey: $("tmdb-remove"),
            keyMsg: $("tmdb-msg"),
            modeLabel: $("cinema-mode-label")
        };

        els.player.muted = true;
        els.player.playsInline = true;

        els.cards.forEach(card => {
            card.addEventListener("click", () => {
                if (binge) setBinge(false);
                playFilm(card.dataset.film);
            });
        });

        $("cinema-play").addEventListener("click", () => {
            if (!els.frame.classList.contains("hidden")) return; // YouTube has its own play button
            if (els.player.getAttribute("src") && els.player.paused) els.player.play().catch(() => {});
            else if (!els.player.getAttribute("src")) playFilm(currentKey);
        });
        $("cinema-next").addEventListener("click", () => {
            highlight(currentKey);
            advance();
        });
        els.bingeBtn.addEventListener("click", () => setBinge(!binge));

        els.player.addEventListener("play", () => setBadge(true));
        els.player.addEventListener("pause", () => setBadge(false));
        els.player.addEventListener("error", () => {
            if (els.player.getAttribute("src")) setStatus("This video couldn't be loaded. Try another film.");
        });

        listenToYouTube();
        initSettings();
        setStatus("Select a film to begin");
    }

    MyFlix.cinema = { init };
})(window.MyFlix = window.MyFlix || {});
