// ==========================
// CONNECT NETFLIX (import window)
// ==========================
// Reuses the existing modal, setting, button and chip styles.
(function (MyFlix) {
    const { escapeHtml, toast } = MyFlix.utils;
    const icon = (...a) => MyFlix.icon(...a);
    const nf = () => MyFlix.netflix;

    let dialog, body, raw = null;

    const fmtDate = ms => (ms ? new Date(ms).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "—");

    // ---------- screens ----------
    function renderStart(error = "") {
        const connected = nf().connected();
        body.innerHTML = `
            <h2>${icon("link")} Connect Netflix</h2>
            <p class="muted">Netflix doesn't let other apps sign in to your account, so MYFLIX never asks for your Netflix password. Instead, bring in the data Netflix lets you download. It stays in this browser only.</p>

            ${connected ? connectedSummary() : ""}

            <div class="setting">
                <label>Option 1 · Quick (2 minutes)</label>
                <p class="muted">Your viewing history. Gives you Continue Watching and everything you've watched.</p>
                <ol class="nf-steps">
                    <li>Open <a href="https://www.netflix.com/viewingactivity" target="_blank" rel="noopener">netflix.com/viewingactivity</a> and choose your profile.</li>
                    <li>Scroll to the bottom and click <strong>Download all</strong>.</li>
                    <li>Drop the file <code>NetflixViewingHistory.csv</code> below.</li>
                </ol>
            </div>
            <div class="setting">
                <label>Option 2 · Everything (Netflix emails it, can take a few days)</label>
                <p class="muted">Adds your Netflix <strong>My List</strong>, ratings and exactly where you stopped each title, for every profile.</p>
                <ol class="nf-steps">
                    <li>Go to <a href="https://www.netflix.com/account/getmyinfo" target="_blank" rel="noopener">Account → Download your personal information</a> and submit the request.</li>
                    <li>When Netflix emails you, download the <strong>.zip</strong>.</li>
                    <li>Drop the .zip below (no need to unzip it).</li>
                </ol>
            </div>

            <label class="nf-drop" tabindex="0">
                <input type="file" accept=".csv,.zip,text/csv,application/zip" multiple hidden>
                ${icon("download")}
                <strong>Drop your Netflix file here</strong>
                <span class="muted small">or click to choose · .csv or .zip</span>
            </label>
            <p class="form-msg" role="alert">${escapeHtml(error)}</p>`;
        wireDrop();
    }

    function connectedSummary() {
        const s = nf().stats();
        const d = nf().data();
        return `
            <div class="setting setting--row nf-connected">
                <div>
                    <label>${icon("circle-check")} Netflix connected${d.profile ? ` · ${escapeHtml(d.profile)}` : ""}</label>
                    <p class="muted">${s.titles} titles · ${s.hours} hours watched${s.myList ? ` · ${s.myList} in your Netflix List` : ""} · imported ${fmtDate(d.importedAt)}</p>
                </div>
                <button type="button" class="btn btn--small btn--danger" data-nf="disconnect">Disconnect</button>
            </div>
            <p class="muted small">To update, drop a newer download below.</p>`;
    }

    function renderProfiles() {
        body.innerHTML = `
            <h2>${icon("users")} Which profile is yours?</h2>
            <p class="muted">Your download includes ${raw.profiles.length} profiles. Pick one to bring into MYFLIX.</p>
            <div class="nf-profiles">
                ${raw.profiles.map((p, i) => `
                    <button type="button" class="nf-profile" data-profile="${escapeHtml(p)}">
                        <span class="avatar avatar--${i % 5}">${escapeHtml(p.charAt(0).toUpperCase())}</span>
                        <span>${escapeHtml(p)}</span>
                    </button>`).join("")}
            </div>`;
    }

    function renderReview(summary) {
        const s = { titles: summary.titles.length, series: summary.titles.filter(t => t.type === "series").length, myList: summary.myList.length, cw: summary.continueWatching.length };
        const finished = summary.titles.filter(t => t.type === "movie" && t.finished).length;
        body.innerHTML = `
            <h2>${icon("circle-check")} Ready to import</h2>
            <p class="muted">${summary.profile ? `Profile <strong>${escapeHtml(summary.profile)}</strong> · ` : ""}${s.titles} titles (${s.series} series) · ${s.cw} to continue watching${s.myList ? ` · ${s.myList} in your Netflix List` : ""}</p>
            ${summary.source === "quick" ? `<p class="hint-line">${icon("lightbulb")} The quick download has no My List or progress. Use Option 2 later to add them.</p>` : ""}
            <div class="setting">
                <label class="nf-check"><input type="checkbox" data-opt="list" ${s.myList ? "checked" : "disabled"}> Add my Netflix List to MYFLIX My List</label>
                <label class="nf-check"><input type="checkbox" data-opt="watched" ${finished ? "" : "disabled"}> Mark ${finished} finished movies as Watched</label>
                <p class="muted small">Netflix rows (Continue Watching, your List, recently watched) appear on Home either way.</p>
            </div>
            <div class="pick-actions">
                <button type="button" class="btn btn--play" data-nf="import">${icon("download")}<span>Import</span></button>
                <button type="button" class="btn btn--grey" data-nf="back">Back</button>
            </div>
            <p class="form-msg" role="status"></p>`;
        body.dataset.pending = JSON.stringify(summary);
    }

    // ---------- actions ----------
    async function handleFiles(files) {
        if (!files?.length) return;
        const msg = body.querySelector(".form-msg");
        msg.style.color = "var(--text-muted)";
        msg.textContent = "Reading your file…";
        try {
            raw = await nf().readFiles([...files]);
            if (raw.profiles.length > 1) return renderProfiles();
            renderReview(nf().build(raw, raw.profiles[0] || null));
        } catch (err) {
            renderStart(err.message || "Couldn't read that file.");
        }
    }

    async function doImport() {
        const summary = JSON.parse(body.dataset.pending || "null");
        if (!summary) return;
        const addList = body.querySelector('[data-opt="list"]')?.checked;
        const markWatched = body.querySelector('[data-opt="watched"]')?.checked;
        const msg = body.querySelector(".form-msg");
        nf().save(summary);

        // Optional: copy titles into MYFLIX's own My List (matched ones only).
        const jobs = [];
        if (addList) jobs.push(...summary.myList.map(x => ({ entry: { ...x, type: "unknown" }, status: "want" })));
        if (markWatched) jobs.push(...summary.titles.filter(t => t.type === "movie" && t.finished).map(t => ({ entry: t, status: "watched" })));
        let added = 0;
        for (let i = 0; i < jobs.length; i++) {
            msg.textContent = `Matching titles… ${i + 1}/${jobs.length}`;
            const t = await nf().titleFor(jobs[i].entry);
            if (t.kind !== "netflix" && !MyFlix.store.list.has(t.key)) {
                MyFlix.store.list.add(t, jobs[i].status);
                added++;
            }
        }
        dialog.close();
        toast(`Netflix connected${added ? ` · ${added} added to My List` : ""}`, "circle-check");
        MyFlix.router.go("");
    }

    function wireDrop() {
        const drop = body.querySelector(".nf-drop");
        const input = drop.querySelector("input");
        input.addEventListener("change", () => handleFiles(input.files));
        drop.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
        ["dragenter", "dragover"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add("is-over"); }));
        ["dragleave", "drop"].forEach(t => drop.addEventListener(t, () => drop.classList.remove("is-over")));
        drop.addEventListener("drop", e => { e.preventDefault(); handleFiles(e.dataTransfer.files); });
    }

    function open() {
        raw = null;
        renderStart();
        if (!dialog.open) dialog.showModal();
    }

    function init() {
        dialog = document.getElementById("netflix-modal");
        body = dialog.querySelector(".modal-panel-body");
        dialog.addEventListener("click", e => {
            if (e.target === dialog) return dialog.close();
            const b = e.target.closest("[data-nf],[data-profile],[data-act='close']");
            if (!b) return;
            if (b.dataset.act === "close") return dialog.close();
            if (b.dataset.profile) return renderReview(nf().build(raw, b.dataset.profile));
            switch (b.dataset.nf) {
                case "import": doImport(); break;
                case "back": renderStart(); break;
                case "disconnect":
                    if (confirm("Remove your Netflix data from MYFLIX? Titles you already added to My List stay.")) {
                        nf().disconnect();
                        renderStart();
                        toast("Netflix disconnected", "x");
                    }
                    break;
            }
        });
    }

    MyFlix.netflixConnect = { init, open };
})(window.MyFlix = window.MyFlix || {});
