// ==========================
// SUBTITLES (for Free Classics)
// ==========================
// Sources, in order:
//   1. subtitle files that come with the film (Internet Archive item or the
//      maker's site, e.g. Blender's official Tears of Steel subtitles)
//   2. a .srt / .vtt file you load from your own device (saved per film)
// Subtitles are drawn in our own overlay so size, background and timing
// can be adjusted. Keyboard: C turns them on/off.
(function (MyFlix) {
    const { escapeHtml, storage, toast } = MyFlix.utils;
    const icon = (...a) => MyFlix.icon(...a);
    const PREFS_KEY = "myflixSubPrefs";
    const SAVED_KEY = "myflixSubs";
    const MAX_SAVED_BYTES = 400_000;

    let prefs = { on: false, lang: "en", size: "m", bg: true, ...storage.read(PREFS_KEY, {}) };
    let video, overlay, menu, btn, fileInput;
    let film = null;
    let tracks = [];          // [{ id, label, lang, url?, vtt?, status }]
    let activeId = null;
    let trackEl = null;
    let offset = 0;           // seconds (+ = later)
    const textCache = new Map();

    const savePrefs = () => storage.write(PREFS_KEY, prefs);

    // ---------- format conversion ----------
    // SRT -> WebVTT: add the header, use "." for milliseconds, drop cue numbers.
    function toVtt(text) {
        const clean = String(text).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
        if (/^WEBVTT/.test(clean)) return clean + "\n";
        const body = clean
            .split(/\n{2,}/)
            .map(block => {
                const lines = block.split("\n");
                if (/^\d+$/.test(lines[0].trim()) && /-->/.test(lines[1] || "")) lines.shift();
                if (lines[0]) lines[0] = lines[0].replace(/(\d\d:\d\d:\d\d),(\d{1,3})/g, "$1.$2").replace(/(^|\s)(\d\d?:\d\d),(\d{1,3})/g, "$1$2.$3");
                return lines.join("\n");
            })
            .join("\n\n");
        return `WEBVTT\n\n${body}\n`;
    }

    // Shift every timestamp in a VTT by `secs` (for out-of-sync files).
    function shiftVtt(vtt, secs) {
        if (!secs) return vtt;
        const fmt = t => {
            t = Math.max(0, t);
            const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = (t % 60).toFixed(3).padStart(6, "0");
            return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s}`;
        };
        const parse = ts => {
            const p = ts.split(":").map(Number);
            return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
        };
        return vtt.replace(/((?:\d+:)?\d\d:\d\d\.\d{1,3})\s*-->\s*((?:\d+:)?\d\d:\d\d\.\d{1,3})/g,
            (_, a, b) => `${fmt(parse(a) + secs)} --> ${fmt(parse(b) + secs)}`);
    }

    // ---------- saved (user-loaded) subtitles ----------
    function savedFor(filmId) {
        return storage.read(SAVED_KEY, {})[filmId] || null;
    }
    function saveFor(filmId, label, vtt) {
        if (vtt.length > MAX_SAVED_BYTES) return false;
        const all = storage.read(SAVED_KEY, {});
        all[filmId] = { label, vtt, at: Date.now() };
        // keep the 12 most recent
        const keys = Object.keys(all).sort((a, b) => all[b].at - all[a].at);
        keys.slice(12).forEach(k => delete all[k]);
        storage.write(SAVED_KEY, all);
        return true;
    }
    function forget(filmId) {
        const all = storage.read(SAVED_KEY, {});
        delete all[filmId];
        storage.write(SAVED_KEY, all);
    }

    // ---------- loading + showing a track ----------
    async function textOf(track) {
        if (track.vtt) return track.vtt;
        if (textCache.has(track.url)) return textCache.get(track.url);
        const res = await fetch(track.url, { mode: "cors" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const vtt = toVtt(await res.text());
        textCache.set(track.url, vtt);
        return vtt;
    }

    function clearTrack() {
        if (trackEl) {
            URL.revokeObjectURL(trackEl.src);
            trackEl.remove();
            trackEl = null;
        }
        overlay.innerHTML = "";
    }

    async function select(id, { quiet = false } = {}) {
        clearTrack();
        activeId = null;
        if (id == null) {
            prefs.on = false;
            savePrefs();
            renderMenu();
            updateButton();
            return;
        }
        const t = tracks.find(x => x.id === id);
        if (!t) return;
        const forFilm = currentFilmId;
        t.status = "loading";
        renderMenu();
        try {
            const vtt = shiftVtt(await textOf(t), offset);
            if (forFilm !== currentFilmId) return; // film changed meanwhile
            trackEl = document.createElement("track");
            trackEl.kind = "subtitles";
            trackEl.label = t.label;
            trackEl.srclang = t.lang || "und";
            trackEl.src = URL.createObjectURL(new Blob([vtt], { type: "text/vtt" }));
            video.appendChild(trackEl);
            const tt = trackEl.track;
            tt.mode = "hidden";            // we draw cues ourselves
            tt.addEventListener("cuechange", () => render(tt));
            trackEl.addEventListener("load", () => render(tt));
            activeId = id;
            t.status = "ok";
            prefs.on = true;
            prefs.lang = t.lang || prefs.lang;
            savePrefs();
        } catch {
            t.status = "error";
            if (!quiet) toast("Those subtitles couldn't be loaded here. Download the file, then use “Load from device”.", "x");
        }
        renderMenu();
        updateButton();
    }

    function render(textTrack) {
        overlay.innerHTML = "";
        const cues = textTrack.activeCues || [];
        for (const cue of cues) {
            const line = document.createElement("span");
            line.className = "sub-line";
            // getCueAsHTML only allows WebVTT's safe tags (<i>, <b>, <u>…)
            line.appendChild(cue.getCueAsHTML ? cue.getCueAsHTML() : document.createTextNode(cue.text));
            overlay.appendChild(line);
        }
    }

    function applyStyle() {
        overlay.dataset.size = prefs.size;
        overlay.classList.toggle("no-bg", !prefs.bg);
    }

    // ---------- menu ----------
    function updateButton() {
        btn.classList.toggle("is-on", activeId != null);
        btn.setAttribute("aria-pressed", String(activeId != null));
    }

    function renderMenu() {
        const item = (id, label, extra = "") => `
            <button type="button" class="subs-item ${activeId === id ? "is-on" : ""}" role="menuitemradio" aria-checked="${activeId === id}" data-sub="${id ?? "off"}">
                <span class="tick">${activeId === id ? icon("check") : ""}</span><span>${escapeHtml(label)}</span>${extra}
            </button>`;
        const status = t => t.status === "loading" ? `<span class="muted small loading-dots"></span>`
            : t.status === "error" && t.url ? `<a class="subs-dl" href="${escapeHtml(t.url)}" target="_blank" rel="noopener" download title="Download this subtitle file">${icon("download")}</a>` : "";
        menu.innerHTML = `
            <p class="subs-heading">Subtitles</p>
            <div class="subs-list" role="menu">
                ${item(null, "Off")}
                ${tracks.map(t => item(t.id, t.label, status(t))).join("")}
                ${tracks.length ? "" : `<p class="subs-empty muted small">No subtitles come with this film. Load your own .srt or .vtt file below.</p>`}
            </div>
            <button type="button" class="subs-load" data-sub-act="load">${icon("download")} Load from device (.srt, .vtt)</button>
            ${savedFor(film?.id) ? `<button type="button" class="subs-forget" data-sub-act="forget">Remove my saved file</button>` : ""}
            <div class="subs-options">
                <div class="subs-row"><span>Size</span>
                    ${["s", "m", "l"].map(sz => `<button type="button" class="chip chip--sm ${prefs.size === sz ? "is-on" : ""}" data-size="${sz}">${{ s: "Small", m: "Medium", l: "Large" }[sz]}</button>`).join("")}
                </div>
                <div class="subs-row"><span>Background</span>
                    <button type="button" class="chip chip--sm ${prefs.bg ? "is-on" : ""}" data-bg="1">On</button>
                    <button type="button" class="chip chip--sm ${prefs.bg ? "" : "is-on"}" data-bg="0">Off</button>
                </div>
                <div class="subs-row"><span>Timing</span>
                    <button type="button" class="chip chip--sm" data-offset="-0.5" aria-label="Show subtitles earlier">−0.5s</button>
                    <span class="subs-offset">${offset > 0 ? "+" : ""}${offset.toFixed(1)}s</span>
                    <button type="button" class="chip chip--sm" data-offset="0.5" aria-label="Show subtitles later">+0.5s</button>
                </div>
            </div>`;
    }

    function toggleMenu(open = menu.classList.contains("hidden")) {
        menu.classList.toggle("hidden", !open);
        btn.setAttribute("aria-expanded", String(open));
        if (open) renderMenu();
    }

    async function loadFile(file) {
        if (!file || !film) return;
        if (!/\.(srt|vtt)$/i.test(file.name)) return toast("Please choose a .srt or .vtt subtitle file", "x");
        const vtt = toVtt(await file.text());
        if (!/-->/.test(vtt)) return toast("That file doesn't look like subtitles", "x");
        const label = `My file: ${file.name.replace(/\.(srt|vtt)$/i, "")}`.slice(0, 40);
        tracks = tracks.filter(t => t.id !== "mine");
        tracks.push({ id: "mine", label, lang: prefs.lang, vtt });
        const stored = saveFor(film.id, label, vtt);
        await select("mine");
        toast(stored ? "Subtitles loaded and saved for next time" : "Subtitles loaded", "circle-check");
    }

    // ---------- public: attach to a film ----------
    let currentFilmId = null;
    function attach(title, source) {
        film = title;
        currentFilmId = title.id;
        offset = 0;
        clearTrack();
        activeId = null;
        tracks = (source?.subtitles || []).map((t, i) => ({ ...t, id: `t${i}` }));
        const mine = savedFor(title.id);
        if (mine) tracks.push({ id: "mine", label: mine.label, lang: prefs.lang, vtt: mine.vtt });
        btn.classList.remove("hidden");
        updateButton();
        // Turn them on automatically if you had subtitles on last time.
        if (prefs.on && tracks.length) {
            const pick = tracks.find(t => t.id === "mine") || tracks.find(t => t.lang === prefs.lang) || null;
            if (pick) select(pick.id, { quiet: true });
        }
    }

    function detach() {
        clearTrack();
        film = null;
        currentFilmId = null;
        tracks = [];
        activeId = null;
        toggleMenu(false);
    }

    function toggle() {
        if (activeId != null) return select(null);
        const pick = tracks.find(t => t.lang === prefs.lang && t.status !== "error") || tracks.find(t => t.status !== "error");
        if (pick) select(pick.id);
        else toggleMenu(true);
    }

    function init(playerRoot, videoEl) {
        video = videoEl;
        overlay = document.createElement("div");
        overlay.className = "player-subs";
        overlay.setAttribute("aria-live", "off");
        playerRoot.appendChild(overlay);

        btn = playerRoot.querySelector("[data-act='subs']");
        menu = document.createElement("div");
        menu.className = "subs-menu hidden";
        playerRoot.appendChild(menu);

        fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".srt,.vtt,text/vtt,application/x-subrip";
        fileInput.hidden = true;
        playerRoot.appendChild(fileInput);
        fileInput.addEventListener("change", () => {
            loadFile(fileInput.files[0]);
            fileInput.value = "";
        });

        btn.addEventListener("click", e => { e.stopPropagation(); toggleMenu(); });
        menu.addEventListener("click", e => {
            e.stopPropagation();
            const b = e.target.closest("[data-sub],[data-sub-act],[data-size],[data-bg],[data-offset]");
            if (!b) return;
            if (b.dataset.sub) select(b.dataset.sub === "off" ? null : b.dataset.sub);
            if (b.dataset.subAct === "load") fileInput.click();
            if (b.dataset.subAct === "forget") {
                forget(film.id);
                tracks = tracks.filter(t => t.id !== "mine");
                if (activeId === "mine") select(null); else renderMenu();
            }
            if (b.dataset.size) { prefs.size = b.dataset.size; savePrefs(); applyStyle(); renderMenu(); }
            if (b.dataset.bg) { prefs.bg = b.dataset.bg === "1"; savePrefs(); applyStyle(); renderMenu(); }
            if (b.dataset.offset) {
                offset = Math.round((offset + Number(b.dataset.offset)) * 10) / 10;
                if (activeId != null) select(activeId); else renderMenu();
            }
        });
        document.addEventListener("click", e => {
            if (!menu.classList.contains("hidden") && !e.target.closest(".subs-menu,[data-act='subs']")) toggleMenu(false);
        });

        // Drop a subtitle file onto the player.
        playerRoot.addEventListener("dragover", e => { if (film) e.preventDefault(); });
        playerRoot.addEventListener("drop", e => {
            if (!film) return;
            e.preventDefault();
            loadFile(e.dataTransfer.files[0]);
        });
        applyStyle();
    }

    MyFlix.subtitles = { init, attach, detach, toggle, toVtt, shiftVtt };
})(window.MyFlix = window.MyFlix || {});
