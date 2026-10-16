// ==========================
// RETRO TV (Watch Free → Retro TV)
// ==========================
// Pick a decade, then flip channels like an old television. Each channel
// plays random public-domain videos from the Internet Archive for that era.
// Keyboard: ↑/↓ change channel · P power.
(function (MyFlix) {
    const { escapeHtml, shuffle, toast } = MyFlix.utils;
    const icon = (...a) => MyFlix.icon(...a);
    const PREF_KEY = "myflixRetro";

    let els = null;
    let state = { decade: "1950s", channel: 0, on: false };
    let current = null;
    let token = 0;
    let staticRaf = null;
    let osdTimer = null;
    const recent = [];          // identifiers played lately (avoid repeats)
    const playlists = new Map();

    const D = () => MyFlix.retroTv;
    const decade = () => D().decades.find(d => d.id === state.decade) || D().decades[3];
    const channel = () => D().channels[state.channel];

    // ---------- playlist for a channel + decade ----------
    async function playlist() {
        const key = `${state.channel}|${state.decade}`;
        if (playlists.has(key)) return playlists.get(key);
        const ch = channel();
        const dec = decade();
        let docs = await MyFlix.archive.search(ch.q, { rows: 60, from: dec.from, to: dec.to });
        // Plenty of uploads have no year: fall back to the whole channel.
        if (docs.length < 4) docs = docs.concat(await MyFlix.archive.search(ch.q, { rows: 60 }));
        const titles = docs.map(d => MyFlix.models.fromArchive(d, { min: ch.min, genre: ch.name }));
        playlists.set(key, titles);
        return titles;
    }

    async function tune() {
        const my = ++token;
        showStatic(true);
        showOsd();
        els.info.innerHTML = `<span class="loading-dots">Tuning</span>`;
        updateGuide();
        try {
            const list = await playlist();
            if (my !== token) return;
            if (!list.length) throw new Error("Nothing on this channel right now.");
            // pick something we haven't seen lately
            const pool = shuffle(list).filter(t => !recent.includes(t.id));
            for (const t of (pool.length ? pool : list).slice(0, 4)) {
                try {
                    const src = await MyFlix.archive.resolve(t.film);
                    if (my !== token) return;
                    current = t;
                    recent.push(t.id);
                    if (recent.length > 30) recent.shift();
                    els.video.src = src.url;
                    await els.video.play().catch(() => {});
                    showStatic(false);
                    els.info.innerHTML = `<strong>${escapeHtml(t.name)}</strong>${t.year ? ` <span class="muted">${t.year}</span>` : ""}`;
                    els.full.disabled = false;
                    els.list.disabled = false;
                    els.list.dataset.listKey = t.key;
                    MyFlix.cards.refreshListButtons();
                    return;
                } catch { /* try the next one */ }
            }
            throw new Error("Couldn't tune in. Try another channel.");
        } catch (err) {
            if (my !== token) return;
            els.info.textContent = err.message;
        }
    }

    function changeChannel(delta) {
        if (!state.on) return power(true);
        const n = D().channels.length;
        state.channel = (state.channel + delta + n) % n;
        save();
        tune();
    }

    function setChannel(i) {
        state.channel = i;
        save();
        if (!state.on) power(true); else tune();
    }

    function setDecade(id) {
        state.decade = id;
        save();
        els.root.querySelectorAll("[data-decade]").forEach(b => b.classList.toggle("is-on", b.dataset.decade === id));
        els.dial.style.setProperty("--turn", `${D().decades.findIndex(d => d.id === id) * 40 - 100}deg`);
        if (state.on) tune();
    }

    function power(on = !state.on) {
        state.on = on;
        els.root.classList.toggle("is-on", on);
        els.powerLed.classList.toggle("on", on);
        if (on) {
            els.root.querySelector(".retro-poweroverlay")?.remove();
            tune();
        } else {
            token++;
            els.video.pause();
            els.video.removeAttribute("src");
            els.video.load();
            showStatic(false);
            els.info.textContent = "Off";
        }
    }

    // ---------- effects ----------
    function showStatic(on) {
        els.static.classList.toggle("show", on);
        cancelAnimationFrame(staticRaf);
        if (!on) return;
        const ctx = els.static.getContext("2d");
        const { width: w, height: h } = els.static;
        const img = ctx.createImageData(w, h);
        const draw = () => {
            for (let i = 0; i < img.data.length; i += 4) {
                const v = Math.random() * 255;
                img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
                img.data[i + 3] = 255;
            }
            ctx.putImageData(img, 0, 0);
            if (els.static.classList.contains("show") && els.static.isConnected) staticRaf = requestAnimationFrame(draw);
        };
        draw();
    }

    function showOsd() {
        const ch = channel();
        els.osd.innerHTML = `<span class="osd-num">CH ${String(ch.num).padStart(2, "0")}</span><span class="osd-name">${escapeHtml(ch.name)} · ${decade().label}</span>`;
        els.osd.classList.add("show");
        clearTimeout(osdTimer);
        osdTimer = setTimeout(() => els.osd.classList.remove("show"), 3000);
        els.chNum.textContent = String(ch.num).padStart(2, "0");
    }

    function updateGuide() {
        els.root.querySelectorAll("[data-ch]").forEach(b => {
            const on = +b.dataset.ch === state.channel;
            b.classList.toggle("is-on", on);
            b.setAttribute("aria-pressed", String(on));
        });
    }

    function save() {
        MyFlix.utils.storage.write(PREF_KEY, { decade: state.decade, channel: state.channel });
    }

    // ---------- page ----------
    function render(view, live) {
        Object.assign(state, MyFlix.utils.storage.read(PREF_KEY, {}), { on: false });
        if (!D().channels[state.channel]) state.channel = 0;

        const root = document.createElement("section");
        root.className = "retro";
        root.innerHTML = `
            <div class="retro-room">
                <div class="tv-set">
                    <div class="tv-cabinet">
                        <div class="tv-screen-wrap">
                            <video class="retro-video" playsinline></video>
                            <canvas class="retro-static" width="160" height="120" aria-hidden="true"></canvas>
                            <div class="retro-scan" aria-hidden="true"></div>
                            <div class="retro-osd" aria-live="polite"></div>
                            <div class="retro-poweroverlay">
                                <button type="button" class="btn btn--play" data-r="power">${icon("tv")}<span>Turn on the TV</span></button>
                                <p>Pick a decade, then flip channels with the knob, the guide, or ↑ ↓ keys.</p>
                            </div>
                        </div>
                        <div class="tv-panel">
                            <span class="tv-brand">MYFLIX</span>
                            <span class="tv-speaker" aria-hidden="true"></span>
                            <div class="tv-knobs">
                                <div class="knob-group">
                                    <button type="button" class="knob-btn" data-r="up" aria-label="Channel up">${icon("chevron-left")}</button>
                                    <span class="ch-display" aria-label="Channel"><span data-chnum>--</span></span>
                                    <button type="button" class="knob-btn" data-r="down" aria-label="Channel down">${icon("chevron-right")}</button>
                                </div>
                                <span class="knob knob--decade" aria-hidden="true"><span class="knob-mark"></span></span>
                                <button type="button" class="power-btn" data-r="power" aria-label="Power"><span class="power-led"></span></button>
                            </div>
                        </div>
                    </div>
                    <div class="tv-legs" aria-hidden="true"><span></span><span></span></div>
                </div>

                <aside class="retro-guide">
                    <h2>${icon("radio-tower")} Retro TV</h2>
                    <p class="muted small">Random public-domain programmes from the Internet Archive, by decade. Most uploads from the '70s onwards aren't public domain, so later decades have less on.</p>
                    <div class="decade-pills" role="group" aria-label="Decade">
                        ${D().decades.map(d => `<button type="button" class="chip" data-decade="${d.id}">${d.label}</button>`).join("")}
                    </div>
                    <ol class="guide-list" aria-label="Channels">
                        ${D().channels.map((c, i) => `
                            <li><button type="button" class="guide-item" data-ch="${i}" aria-pressed="false">
                                <span class="guide-num">${String(c.num).padStart(2, "0")}</span>${icon(c.icon)}<span>${escapeHtml(c.name)}</span>
                            </button></li>`).join("")}
                    </ol>
                    <div class="now-on">
                        <span class="label">Now showing</span>
                        <p class="now-on-title" data-info>Off</p>
                        <div class="now-on-actions">
                            <button type="button" class="btn btn--small btn--grey" data-r="next">${icon("shuffle")}<span>Something else</span></button>
                            <button type="button" class="btn btn--small btn--grey" data-r="full" disabled>${icon("maximize")}<span>Full screen</span></button>
                            <button type="button" class="circle" data-r="list" data-list-key="" aria-label="My List" disabled>${icon("plus")}</button>
                        </div>
                    </div>
                </aside>
            </div>`;
        view.appendChild(root);

        els = {
            root,
            video: root.querySelector(".retro-video"),
            static: root.querySelector(".retro-static"),
            osd: root.querySelector(".retro-osd"),
            info: root.querySelector("[data-info]"),
            chNum: root.querySelector("[data-chnum]"),
            dial: root.querySelector(".knob--decade"),
            powerLed: root.querySelector(".power-led"),
            full: root.querySelector('[data-r="full"]'),
            list: root.querySelector('[data-r="list"]')
        };

        root.addEventListener("click", e => {
            const b = e.target.closest("[data-r],[data-ch],[data-decade]");
            if (!b) return;
            if (b.dataset.decade) return setDecade(b.dataset.decade);
            if (b.dataset.ch != null) return setChannel(+b.dataset.ch);
            switch (b.dataset.r) {
                case "power": power(); break;
                case "up": changeChannel(-1); break;
                case "down": changeChannel(1); break;
                case "next": if (state.on) tune(); else power(true); break;
                case "full":
                    if (!current) return;
                    els.video.pause();
                    MyFlix.player.play({ ...current, queue: null });
                    break;
                case "list": if (current) MyFlix.store.list.toggle(current); break;
            }
        });
        els.video.addEventListener("ended", () => state.on && tune());
        els.video.addEventListener("error", () => { if (state.on && els.video.getAttribute("src")) tune(); });

        setDecade(state.decade);
        updateGuide();
        els.chNum.textContent = String(channel().num).padStart(2, "0");
    }

    // ↑/↓ to change channel while Retro TV is on screen.
    document.addEventListener("keydown", e => {
        const playerOpen = document.documentElement.classList.contains("player-open");
        if (!els?.root?.isConnected || playerOpen || e.target.closest("input, textarea, select")) return;
        if (e.key === "ArrowUp") { e.preventDefault(); changeChannel(-1); }
        if (e.key === "ArrowDown") { e.preventDefault(); changeChannel(1); }
        if (e.key.toLowerCase() === "p") power();
    });

    MyFlix.retroTv.render = render;
})(window.MyFlix = window.MyFlix || {});
