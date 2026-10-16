// ==========================
// FULL-SCREEN PLAYER (Classic Cinema)
// ==========================
// Keyboard: Space/K play-pause · ←/→ 10s · ↑/↓ volume · F fullscreen · M mute · Esc close
(function (MyFlix) {
    const { escapeHtml, formatClock, toast } = MyFlix.utils;
    const icon = (...a) => MyFlix.icon(...a);
    const store = MyFlix.store;

    let root, video, els = {};
    let current = null;        // title being played
    let hideTimer = null, saveTimer = null, upNextTimer = null;
    let lastTick = 0, watchedSeconds = 0;
    let retried = false;
    let suppressEvents = false; // true while applying watch-party commands
    const localListeners = new Set();

    // ---------- build ----------
    function build() {
        root = document.getElementById("player");
        root.innerHTML = `
            <video class="player-video" playsinline preload="metadata"></video>
            <div class="player-loading hidden"><div class="spinner"></div><p>Finding the best copy on the Internet Archive…</p></div>
            <div class="player-message hidden"></div>
            <div class="player-resume hidden">
                <p>Continue watching <strong data-resume-title></strong>?</p>
                <div class="player-resume-actions">
                    <button type="button" class="btn btn--play" data-act="resume">${icon("play")}<span>Resume from <span data-resume-time></span></span></button>
                    <button type="button" class="btn btn--grey" data-act="restart">${icon("rotate-ccw")}<span>Start over</span></button>
                </div>
            </div>
            <div class="player-upnext hidden">
                <span class="label">Up next</span>
                <strong data-upnext-title></strong>
                <div class="player-upnext-actions">
                    <button type="button" class="btn btn--play" data-act="next-now">${icon("play")}<span>Play now</span></button>
                    <button type="button" class="btn btn--grey" data-act="next-cancel">Cancel</button>
                </div>
                <span class="upnext-count" data-upnext-count></span>
            </div>
            <div class="player-top">
                <button type="button" class="player-btn" data-act="close" aria-label="Back">${icon("arrow-left")}</button>
                <div class="player-heading"><span class="player-title"></span><span class="player-sub"></span></div>
                <div class="party-chip hidden" data-party-chip>${icon("users")}<span></span></div>
            </div>
            <div class="player-center">
                <button type="button" class="player-big" data-act="toggle" aria-label="Play or pause">${icon("play")}</button>
            </div>
            <div class="player-bottom">
                <div class="player-scrub">
                    <input type="range" class="scrub" min="0" max="1000" value="0" step="1" aria-label="Seek">
                    <div class="scrub-buffer"></div>
                    <span class="player-time">0:00 / 0:00</span>
                </div>
                <div class="player-controls">
                    <button type="button" class="player-btn" data-act="toggle" aria-label="Play" data-play-btn>${icon("play")}</button>
                    <button type="button" class="player-btn" data-act="back10" aria-label="Back 10 seconds">${icon("rotate-ccw")}<span class="ten">10</span></button>
                    <button type="button" class="player-btn" data-act="fwd10" aria-label="Forward 10 seconds">${icon("rotate-cw")}<span class="ten">10</span></button>
                    <div class="volume">
                        <button type="button" class="player-btn" data-act="mute" aria-label="Mute" data-mute-btn>${icon("volume-2")}</button>
                        <input type="range" class="volume-range" min="0" max="1" step="0.05" value="1" aria-label="Volume">
                    </div>
                    <span class="player-now"></span>
                    <span class="spacer"></span>
                    <button type="button" class="player-btn" data-act="next" aria-label="Next film" title="Next film">${icon("skip-forward")}</button>
                    <button type="button" class="player-btn player-btn--cc" data-act="subs" aria-label="Subtitles" title="Subtitles (C)" aria-haspopup="true" aria-expanded="false"><span class="cc">CC</span></button>
                    <button type="button" class="player-btn" data-act="party" aria-label="Watch party" title="Watch party">${icon("users")}</button>
                    <button type="button" class="player-btn" data-act="fullscreen" aria-label="Full screen" data-fs-btn>${icon("maximize")}</button>
                </div>
            </div>`;

        video = root.querySelector("video");
        els = {
            loading: root.querySelector(".player-loading"),
            message: root.querySelector(".player-message"),
            resume: root.querySelector(".player-resume"),
            upnext: root.querySelector(".player-upnext"),
            title: root.querySelector(".player-title"),
            sub: root.querySelector(".player-sub"),
            now: root.querySelector(".player-now"),
            scrub: root.querySelector(".scrub"),
            buffer: root.querySelector(".scrub-buffer"),
            time: root.querySelector(".player-time"),
            big: root.querySelector(".player-big"),
            playBtn: root.querySelector("[data-play-btn]"),
            muteBtn: root.querySelector("[data-mute-btn]"),
            volume: root.querySelector(".volume-range"),
            fsBtn: root.querySelector("[data-fs-btn]"),
            partyChip: root.querySelector("[data-party-chip]")
        };

        root.addEventListener("click", onClick);
        root.addEventListener("mousemove", showControls);
        root.addEventListener("touchstart", showControls, { passive: true });
        video.addEventListener("click", () => toggle());
        video.addEventListener("dblclick", toggleFullscreen);
        video.addEventListener("play", () => { updatePlayIcons(); emitLocal("play"); scheduleHide(); });
        video.addEventListener("pause", () => { updatePlayIcons(); emitLocal("pause"); showControls(); saveProgress(); });
        video.addEventListener("seeked", () => emitLocal("seek"));
        video.addEventListener("timeupdate", onTime);
        video.addEventListener("progress", onBuffer);
        video.addEventListener("waiting", () => root.classList.add("is-buffering"));
        video.addEventListener("playing", () => root.classList.remove("is-buffering"));
        video.addEventListener("ended", onEnded);
        video.addEventListener("error", onVideoError);
        video.addEventListener("volumechange", updateVolumeIcon);

        els.scrub.addEventListener("input", () => {
            if (video.duration) video.currentTime = (els.scrub.value / 1000) * video.duration;
        });
        els.volume.addEventListener("input", () => {
            video.volume = +els.volume.value;
            video.muted = video.volume === 0;
        });
        document.addEventListener("keydown", onKey);
        MyFlix.subtitles.init(root, video);
        document.addEventListener("fullscreenchange", () => {
            els.fsBtn.innerHTML = icon(document.fullscreenElement ? "minimize" : "maximize");
        });
    }

    // ---------- open / play ----------
    async function play(title, { startAt = null, fromParty = false } = {}) {
        if (!title.film) return MyFlix.details.open(title);
        current = title;
        retried = false;
        watchedSeconds = 0;
        hideOverlays();
        root.classList.remove("hidden");
        document.documentElement.classList.add("player-open");
        els.title.textContent = title.name;
        els.sub.textContent = [title.year, MyFlix.utils.formatRuntime(title.runtime), title.licence].filter(Boolean).join(" · ");
        els.now.innerHTML = `<strong>${escapeHtml(title.name)}</strong>`;
        video.removeAttribute("src");
        video.load();
        els.loading.classList.remove("hidden");
        showControls();

        try {
            const source = await MyFlix.archive.resolve(title.film);
            if (current !== title) return;
            current.source = source;
            video.src = source.url;
            MyFlix.subtitles.attach(title, source);
            video.poster = "";
            els.loading.classList.add("hidden");

            const saved = store.progress.get(title.id);
            if (startAt != null) {
                video.currentTime = startAt;
                if (!fromParty) video.play().catch(() => {});
            } else if (saved && saved.time > 30) {
                askResume(saved);
            } else {
                video.play().catch(() => showControls());
            }
            emitLocal("load");
        } catch (err) {
            if (current !== title) return;
            els.loading.classList.add("hidden");
            showMessage(err.message);
        }
    }

    function askResume(saved) {
        els.resume.querySelector("[data-resume-title]").textContent = current.name;
        els.resume.querySelector("[data-resume-time]").textContent = formatClock(saved.time);
        els.resume.classList.remove("hidden");
        els.resume.dataset.time = saved.time;
    }

    function close() {
        if (!current) return;
        saveProgress();
        flushWatchTime();
        clearTimeout(upNextTimer);
        video.pause();
        video.removeAttribute("src");
        video.load();
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        root.classList.add("hidden");
        document.documentElement.classList.remove("player-open");
        current = null;
        MyFlix.subtitles.detach();
        store.emit("progress");
        if (MyFlix.party.active()) MyFlix.party.leave();
    }

    // ---------- controls ----------
    function toggle() {
        if (!video.src) return;
        if (video.paused) video.play().catch(() => {});
        else video.pause();
    }

    function seekBy(sec) {
        if (!video.duration) return;
        video.currentTime = Math.min(video.duration, Math.max(0, video.currentTime + sec));
        showControls();
    }

    function toggleFullscreen() {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else root.requestFullscreen?.().catch(() => {});
    }

    function nextTitle() {
        if (!current) return null;
        // Episodes / cartoons carry their row as a queue: play the next one.
        if (current.queue?.length) {
            const i = current.queue.findIndex(t => t.key === current.key);
            const next = current.queue[(i + 1) % current.queue.length];
            return next && next.key !== current.key ? { ...next, queue: current.queue } : null;
        }
        const g = current.film.genres[0];
        if (!g) return null;
        const same = MyFlix.classics.filter(f => f.genres.includes(g));
        const i = same.findIndex(f => f.id === current.id);
        const next = same[(i + 1) % same.length];
        return next && next.id !== current.id ? MyFlix.models.fromClassic(next) : null;
    }

    function onClick(e) {
        const btn = e.target.closest("[data-act]");
        if (!btn) return;
        showControls();
        switch (btn.dataset.act) {
            case "close": close(); break;
            case "toggle": toggle(); break;
            case "back10": seekBy(-10); break;
            case "fwd10": seekBy(10); break;
            case "mute": video.muted = !video.muted; break;
            case "fullscreen": toggleFullscreen(); break;
            case "party": MyFlix.party.openPanel(current); break;
            case "next": { const n = nextTitle(); if (n) play(n); break; }
            case "resume":
                els.resume.classList.add("hidden");
                video.currentTime = +els.resume.dataset.time;
                video.play().catch(() => {});
                break;
            case "restart":
                els.resume.classList.add("hidden");
                video.currentTime = 0;
                video.play().catch(() => {});
                break;
            case "next-now": { clearTimeout(upNextTimer); const n = nextTitle(); if (n) play(n); break; }
            case "next-cancel": clearTimeout(upNextTimer); els.upnext.classList.add("hidden"); break;
            case "retry":
                MyFlix.archive.forget(current.film);
                play(current);
                break;
        }
    }

    function onKey(e) {
        if (!current || root.classList.contains("hidden")) return;
        if (e.target.closest("input, textarea") && e.target.type !== "range") return;
        const k = e.key.toLowerCase();
        const handled = {
            " ": toggle, k: toggle,
            arrowleft: () => seekBy(-10), arrowright: () => seekBy(10),
            arrowup: () => { video.volume = Math.min(1, video.volume + 0.1); video.muted = false; },
            arrowdown: () => { video.volume = Math.max(0, video.volume - 0.1); },
            f: toggleFullscreen, m: () => { video.muted = !video.muted; },
            c: () => MyFlix.subtitles.toggle(),
            escape: () => { if (!document.fullscreenElement) close(); }
        }[k];
        if (handled) {
            e.preventDefault();
            handled();
            showControls();
        }
    }

    // ---------- UI updates ----------
    function showControls() {
        root.classList.add("show-controls");
        scheduleHide();
    }
    function scheduleHide() {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            if (!video.paused) root.classList.remove("show-controls");
        }, 3000);
    }

    function updatePlayIcons() {
        const name = video.paused ? "play" : "pause";
        els.playBtn.innerHTML = icon(name);
        els.big.innerHTML = icon(name);
        els.playBtn.setAttribute("aria-label", video.paused ? "Play" : "Pause");
        root.classList.toggle("is-paused", video.paused);
    }

    function updateVolumeIcon() {
        els.muteBtn.innerHTML = icon(video.muted || video.volume === 0 ? "volume-x" : "volume-2");
        els.volume.value = video.muted ? 0 : video.volume;
    }

    function onTime() {
        if (!video.duration) return;
        els.scrub.value = Math.round((video.currentTime / video.duration) * 1000);
        els.scrub.style.setProperty("--pos", `${(video.currentTime / video.duration) * 100}%`);
        els.time.textContent = `${formatClock(video.currentTime)} / ${formatClock(video.duration)}`;

        // count real watch time for Stats
        const now = video.currentTime;
        const delta = now - lastTick;
        if (!video.paused && delta > 0 && delta < 2) watchedSeconds += delta;
        lastTick = now;
        if (watchedSeconds >= 60) flushWatchTime();

        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveProgress, 4000);
    }

    function onBuffer() {
        if (!video.duration || !video.buffered.length) return;
        const end = video.buffered.end(video.buffered.length - 1);
        els.buffer.style.width = `${(end / video.duration) * 100}%`;
    }

    function saveProgress() {
        if (current && video.duration && video.currentTime > 5) {
            store.progress.set(current.id, video.currentTime, video.duration, { kind: current.kind, name: current.name, year: current.year });
        }
    }

    function flushWatchTime() {
        if (current && watchedSeconds >= 30) {
            store.addWatchTime(current, Math.round(watchedSeconds / 60) || 1);
            watchedSeconds = 0;
        }
    }

    function onEnded() {
        saveProgress();
        flushWatchTime();
        store.progress.clear(current.id);
        const n = nextTitle();
        if (!n || MyFlix.party.active()) return;
        els.upnext.querySelector("[data-upnext-title]").textContent = n.name;
        els.upnext.classList.remove("hidden");
        let left = 10;
        const tick = () => {
            els.upnext.querySelector("[data-upnext-count]").textContent = `Starts in ${left}s`;
            if (left-- <= 0) return play(n);
            upNextTimer = setTimeout(tick, 1000);
        };
        tick();
    }

    function onVideoError() {
        if (!current || !video.getAttribute("src")) return;
        if (!retried) {
            // That copy failed: forget it and search the Archive for another.
            retried = true;
            MyFlix.archive.forget(current.film);
            toast("That copy didn't load, trying another…", "refresh-cw");
            const t = current;
            current = null;
            play(t);
            return;
        }
        showMessage(`“${current.name}” couldn't be streamed right now. The Internet Archive may be busy.`);
    }

    function showMessage(text) {
        els.message.innerHTML = `
            <p>${escapeHtml(text)}</p>
            <div class="player-resume-actions">
                <button type="button" class="btn btn--play" data-act="retry">${icon("refresh-cw")}<span>Try again</span></button>
                <button type="button" class="btn btn--grey" data-act="close">${icon("arrow-left")}<span>Back</span></button>
            </div>
            ${current?.source?.page ? `<a href="${escapeHtml(current.source.page)}" target="_blank" rel="noopener">Open on archive.org</a>` : ""}`;
        els.message.classList.remove("hidden");
    }

    function hideOverlays() {
        [els.loading, els.message, els.resume, els.upnext].forEach(el => el.classList.add("hidden"));
        clearTimeout(upNextTimer);
    }

    // ---------- watch party hooks ----------
    function emitLocal(type) {
        if (suppressEvents || !current) return;
        localListeners.forEach(fn => fn({ type, film: current.id, time: video.currentTime, playing: !video.paused }));
    }
    function onLocal(fn) { localListeners.add(fn); return () => localListeners.delete(fn); }

    // Apply a state sent by the party host. Only nudges time if we drifted.
    async function applyRemote(state) {
        suppressEvents = true;
        try {
            if (!current || current.id !== state.film) {
                const film = MyFlix.classics.find(f => f.id === state.film);
                if (!film) return;
                await play(MyFlix.models.fromClassic(film), { startAt: state.time, fromParty: true });
                hideOverlays();
            }
            if (!video.src) return;
            if (Math.abs(video.currentTime - state.time) > 1.5) video.currentTime = state.time;
            if (state.playing && video.paused) await video.play().catch(() => {});
            if (!state.playing && !video.paused) video.pause();
        } finally {
            setTimeout(() => { suppressEvents = false; }, 300);
        }
    }

    function state() {
        return current ? { film: current.id, time: video.currentTime, playing: !video.paused } : null;
    }

    function setPartyLabel(text) {
        els.partyChip.classList.toggle("hidden", !text);
        els.partyChip.querySelector("span").textContent = text || "";
    }

    MyFlix.player = { init: build, play, close, onLocal, applyRemote, state, setPartyLabel, current: () => current };
})(window.MyFlix = window.MyFlix || {});
