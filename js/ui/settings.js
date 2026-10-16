// ==========================
// SETTINGS (API keys, region, profile, theme, reset)
// ==========================
(function (MyFlix) {
    const { escapeHtml, toast } = MyFlix.utils;
    const icon = (...a) => MyFlix.icon(...a);
    const store = MyFlix.store;

    const REGIONS = { ZA: "South Africa", US: "United States", GB: "United Kingdom", AU: "Australia", CA: "Canada", IN: "India", NG: "Nigeria", KE: "Kenya", DE: "Germany", FR: "France" };
    let dialog, body;

    function keyField(id, label, help, link, enabled) {
        return `
            <div class="setting">
                <div class="setting-head">
                    <label for="${id}">${label}</label>
                    <span class="status ${enabled ? "status--on" : ""}">${icon(enabled ? "circle-check" : "key-round")}${enabled ? "Connected" : "Not set"}</span>
                </div>
                <p class="muted">${help} <a href="${link}" target="_blank" rel="noopener">Get a free key</a>.</p>
                <form class="key-form" data-key="${id}">
                    <input id="${id}" type="password" autocomplete="off" placeholder="${enabled ? "Saved. Paste a new key to replace it" : "Paste your key"}">
                    <button type="submit" class="btn btn--small">Save</button>
                    ${enabled ? `<button type="button" class="btn btn--small btn--grey" data-clear="${id}">Remove</button>` : ""}
                </form>
                <p class="form-msg" data-msg="${id}"></p>
            </div>`;
    }

    function render() {
        const region = store.getSetting("region") || "ZA";
        body.innerHTML = `
            <h2>${icon("settings")} Settings</h2>
            <div class="setting">
                <label for="set-name">Profile name</label>
                <p class="muted">Shown to friends in watch parties.</p>
                <input id="set-name" type="text" maxlength="20" value="${escapeHtml(store.getSetting("name"))}" placeholder="Your name">
            </div>
            ${keyField("tmdbKey", "TMDB", "Unlocks the Movies page, trailers, backdrops and “Where to watch”.", "https://www.themoviedb.org/settings/api", MyFlix.tmdb.enabled())}
            ${keyField("omdbKey", "OMDb", "Adds IMDb, Rotten Tomatoes and Metacritic scores.", "https://www.omdbapi.com/apikey.aspx", MyFlix.omdb.enabled())}
            <div class="setting">
                <label for="set-region">Where to watch country</label>
                <select id="set-region">${Object.entries(REGIONS).map(([k, v]) => `<option value="${k}" ${k === region ? "selected" : ""}>${v}</option>`).join("")}</select>
            </div>
            <div class="setting setting--row">
                <div><label>Appearance</label><p class="muted">Dark like a cinema, or light.</p></div>
                <button type="button" class="btn btn--small btn--grey" data-act="theme">${icon(document.documentElement.dataset.theme === "light" ? "moon" : "sun")}<span>Switch to ${document.documentElement.dataset.theme === "light" ? "dark" : "light"}</span></button>
            </div>
            <div class="setting setting--row">
                <div><label>Reset MYFLIX</label><p class="muted">Clears My List, episodes, stats, scores and keys on this device.</p></div>
                <button type="button" class="btn btn--small btn--danger" data-act="reset">Reset</button>
            </div>
            <p class="muted small">Keys are stored only in this browser. Data from TVMaze, TMDB, OMDb, Wikipedia and the Internet Archive.</p>`;
    }

    async function saveKey(id, value) {
        const msg = body.querySelector(`[data-msg="${id}"]`);
        if (!value) return;
        const previous = store.getSetting(id);
        store.setSetting(id, value);
        msg.textContent = "Checking…";
        try {
            if (id === "tmdbKey") await MyFlix.tmdb.testKey();
            else await MyFlix.omdb.testKey(value);
            toast(`${id === "tmdbKey" ? "TMDB" : "OMDb"} connected`, "circle-check");
            render();
            MyFlix.router.refresh();
        } catch (err) {
            store.setSetting(id, previous || "");
            msg.textContent = err.status === 401 || /invalid/i.test(err.message)
                ? "That key didn't work. Double-check it and try again."
                : "Couldn't reach the service to check the key. Try again later.";
        }
    }

    function open() {
        render();
        if (!dialog.open) dialog.showModal();
    }

    function init() {
        dialog = document.getElementById("settings-modal");
        body = dialog.querySelector(".modal-panel-body");
        dialog.addEventListener("click", e => {
            if (e.target === dialog) return dialog.close();
            const b = e.target.closest("[data-act],[data-clear]");
            if (!b) return;
            if (b.dataset.clear) {
                store.setSetting(b.dataset.clear, "");
                render();
                MyFlix.router.refresh();
            }
            if (b.dataset.act === "close") dialog.close();
            if (b.dataset.act === "theme") { MyFlix.theme.toggle(); render(); }
            if (b.dataset.act === "reset" && confirm("Reset everything on this device? This can't be undone.")) store.resetAll();
        });
        dialog.addEventListener("submit", e => {
            const form = e.target.closest(".key-form");
            if (!form) return;
            e.preventDefault();
            saveKey(form.dataset.key, form.querySelector("input").value.trim());
        });
        dialog.addEventListener("change", e => {
            if (e.target.id === "set-name") store.setSetting("name", e.target.value);
            if (e.target.id === "set-region") { store.setSetting("region", e.target.value); MyFlix.router.refresh(); }
        });
    }

    MyFlix.settings = { init, open };
})(window.MyFlix = window.MyFlix || {});
