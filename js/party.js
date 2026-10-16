// ==========================
// WATCH PARTY (watch a Classic in sync with friends)
// ==========================
// Uses PeerJS (WebRTC). Browsers connect directly to each other; PeerJS's
// free public server only introduces them. The host is in charge: guests'
// play / pause / seek go to the host, who sends the new state to everyone.
(function (MyFlix) {
    const { escapeHtml, toast } = MyFlix.utils;
    const icon = (...a) => MyFlix.icon(...a);
    const PREFIX = "myflix-party-";

    let peer = null, role = null, code = null;
    let hostConn = null;            // guest → host connection
    const guests = new Map();       // host: conn → name
    let unhookPlayer = null, heartbeat = null;
    let panel, els = {};

    const myName = () => MyFlix.store.getSetting("name") || "Guest";
    const active = () => Boolean(peer && role);

    // ---------- PeerJS loader ----------
    function loadPeerJs() {
        if (window.Peer) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = MyFlix.config.peerjsScript;
            s.onload = resolve;
            s.onerror = () => reject(new Error("Couldn't load the watch-party library. Check your connection."));
            document.head.appendChild(s);
        });
    }

    function makeCode() {
        const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
        return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    }

    const inviteLink = () => `${location.origin}${location.pathname}#/party/${code}`;

    // ---------- panel UI ----------
    function buildPanel() {
        panel = document.createElement("aside");
        panel.className = "party-panel hidden";
        panel.setAttribute("aria-label", "Watch party");
        panel.innerHTML = `
            <div class="party-head">
                <h3>${icon("users")} Watch Party</h3>
                <button type="button" class="player-btn" data-pact="hide" aria-label="Hide party panel">${icon("x")}</button>
            </div>
            <div class="party-body">
                <div class="party-start">
                    <p class="muted">Watch this film together. Everyone's player stays in sync, and you can chat while you watch.</p>
                    <label class="field"><span>Your name</span><input type="text" class="party-name" maxlength="20" autocomplete="nickname"></label>
                    <button type="button" class="btn btn--play btn--block" data-pact="host">${icon("users")}<span>Start a party</span></button>
                    <div class="or"><span>or join one</span></div>
                    <div class="party-join-row">
                        <input type="text" class="party-code-input" maxlength="6" placeholder="Party code" aria-label="Party code" autocapitalize="characters">
                        <button type="button" class="btn btn--grey" data-pact="join">Join</button>
                    </div>
                </div>
                <div class="party-live hidden">
                    <div class="party-code-box">
                        <span class="label">Party code</span>
                        <strong data-code></strong>
                        <button type="button" class="btn btn--small btn--grey" data-pact="copy">${icon("link")}<span>Copy invite link</span></button>
                    </div>
                    <p class="party-status muted" data-status></p>
                    <ul class="party-members" data-members></ul>
                    <div class="party-reactions">
                        ${["heart", "laugh", "ghost", "flame", "thumbs-up"].map(n => `<button type="button" class="circle" data-react="${n}" aria-label="React ${n}">${icon(n)}</button>`).join("")}
                    </div>
                    <ol class="party-chat" data-chat aria-live="polite"></ol>
                    <form class="party-chat-form">
                        <input type="text" maxlength="200" placeholder="Say something…" aria-label="Chat message">
                        <button type="submit" class="player-btn" aria-label="Send">${icon("send")}</button>
                    </form>
                    <button type="button" class="btn btn--small btn--ghost btn--block" data-pact="leave">Leave party</button>
                </div>
            </div>`;
        document.getElementById("player").appendChild(panel);

        els = {
            start: panel.querySelector(".party-start"),
            live: panel.querySelector(".party-live"),
            name: panel.querySelector(".party-name"),
            codeInput: panel.querySelector(".party-code-input"),
            code: panel.querySelector("[data-code]"),
            status: panel.querySelector("[data-status]"),
            members: panel.querySelector("[data-members]"),
            chat: panel.querySelector("[data-chat]"),
            form: panel.querySelector(".party-chat-form")
        };

        panel.addEventListener("click", e => {
            const b = e.target.closest("[data-pact],[data-react]");
            if (!b) return;
            if (b.dataset.react) return react(b.dataset.react);
            ({ hide: hidePanel, host: () => startHost(), join: () => join(els.codeInput.value), copy: copyInvite, leave })[b.dataset.pact]?.();
        });
        els.form.addEventListener("submit", e => {
            e.preventDefault();
            const input = els.form.querySelector("input");
            const text = input.value.trim();
            if (!text) return;
            input.value = "";
            sendChat(text);
        });
        els.name.addEventListener("change", () => MyFlix.store.setSetting("name", els.name.value));
    }

    function showPanel() {
        panel.classList.remove("hidden");
        els.name.value = MyFlix.store.getSetting("name") || "";
        els.start.classList.toggle("hidden", active());
        els.live.classList.toggle("hidden", !active());
    }
    function hidePanel() { panel.classList.add("hidden"); }

    function setStatus(text) { els.status.textContent = text; }

    function renderMembers(names) {
        els.members.innerHTML = names.map((n, i) =>
            `<li><span class="avatar avatar--${i % 5}">${escapeHtml(n.charAt(0).toUpperCase())}</span>${escapeHtml(n)}${i === 0 ? ' <span class="pill">Host</span>' : ""}</li>`).join("");
        MyFlix.player.setPartyLabel(`${names.length} watching`);
    }

    function addChat(name, text, system = false) {
        const li = document.createElement("li");
        li.className = system ? "system" : "";
        li.innerHTML = system ? escapeHtml(text) : `<strong>${escapeHtml(name)}</strong> ${escapeHtml(text)}`;
        els.chat.appendChild(li);
        els.chat.scrollTop = els.chat.scrollHeight;
    }

    function floatReaction(name, iconName) {
        const el = document.createElement("div");
        el.className = "reaction-float";
        el.style.left = `${10 + Math.random() * 70}%`;
        el.innerHTML = `${icon(iconName)}<span>${escapeHtml(name)}</span>`;
        document.getElementById("player").appendChild(el);
        setTimeout(() => el.remove(), 2600);
    }

    // ---------- messaging ----------
    function broadcast(msg, except) {
        guests.forEach((_, conn) => { if (conn !== except && conn.open) conn.send(msg); });
    }
    function memberNames() { return [myName(), ...guests.values()]; }

    function broadcastState() {
        const s = MyFlix.player.state();
        if (s) broadcast({ t: "state", ...s });
    }

    function handleMessage(msg, conn) {
        switch (msg.t) {
            case "hello":
                guests.set(conn, String(msg.name || "Guest").slice(0, 20));
                addChat(null, `${guests.get(conn)} joined`, true);
                broadcast({ t: "members", names: memberNames() });
                renderMembers(memberNames());
                broadcastState();
                break;
            case "members": renderMembers(msg.names); break;
            case "state": MyFlix.player.applyRemote(msg); break;
            case "control":
                MyFlix.player.applyRemote(msg).then(() => broadcastState());
                break;
            case "chat":
                addChat(msg.name, msg.text);
                if (role === "host") broadcast(msg, conn);
                break;
            case "react":
                floatReaction(msg.name, msg.icon);
                if (role === "host") broadcast(msg, conn);
                break;
            case "ended":
                addChat(null, "The host ended the party", true);
                leave(true);
                break;
        }
    }

    function sendChat(text) {
        const msg = { t: "chat", name: myName(), text };
        addChat(msg.name, text);
        if (role === "host") broadcast(msg);
        else hostConn?.send(msg);
    }

    function react(iconName) {
        const msg = { t: "react", name: myName(), icon: iconName };
        floatReaction(msg.name, iconName);
        if (role === "host") broadcast(msg);
        else hostConn?.send(msg);
    }

    function copyInvite() {
        navigator.clipboard?.writeText(inviteLink()).then(
            () => toast("Invite link copied", "link"),
            () => toast(`Party code: ${code}`, "link")
        );
    }

    // ---------- host ----------
    async function startHost(attempt = 0) {
        if (els.name.value.trim()) MyFlix.store.setSetting("name", els.name.value);
        try {
            await loadPeerJs();
        } catch (err) { return toast(err.message, "x"); }
        if (!MyFlix.player.current()) return toast("Start a film first", "film");

        code = makeCode();
        role = "host";
        peer = new window.Peer(PREFIX + code);
        showPanel();
        els.code.textContent = code;
        setStatus("Setting up…");
        renderMembers([myName()]);

        peer.on("open", () => {
            setStatus("Share the code or link. Friends join from MYFLIX → Watch party.");
            addChat(null, "Party started", true);
        });
        peer.on("connection", conn => {
            conn.on("data", msg => handleMessage(msg, conn));
            conn.on("close", () => {
                const name = guests.get(conn);
                guests.delete(conn);
                if (name) addChat(null, `${name} left`, true);
                broadcast({ t: "members", names: memberNames() });
                renderMembers(memberNames());
            });
        });
        peer.on("error", err => {
            if (err.type === "unavailable-id" && attempt < 3) {
                cleanup();
                return startHost(attempt + 1);
            }
            setStatus(`Connection problem: ${err.type || err.message}`);
        });

        unhookPlayer = MyFlix.player.onLocal(() => broadcastState());
        heartbeat = setInterval(broadcastState, 5000);
    }

    // Called from the details modal: open the film, then the party panel.
    async function host(title) {
        await MyFlix.player.play(title);
        showPanel();
    }

    // ---------- guest ----------
    async function join(rawCode) {
        const c = String(rawCode || "").trim().toUpperCase();
        if (c.length < 4) return toast("Enter the 6-character party code", "x");
        if (els.name.value.trim()) MyFlix.store.setSetting("name", els.name.value);
        try {
            await loadPeerJs();
        } catch (err) { return toast(err.message, "x"); }

        cleanup();
        code = c;
        role = "guest";
        peer = new window.Peer();
        showPanel();
        els.code.textContent = code;
        setStatus("Connecting to the party…");

        peer.on("open", () => {
            hostConn = peer.connect(PREFIX + code, { reliable: true });
            hostConn.on("open", () => {
                setStatus("Connected. The host controls playback, but anyone can pause.");
                hostConn.send({ t: "hello", name: myName() });
                addChat(null, "You joined the party", true);
            });
            hostConn.on("data", msg => handleMessage(msg, hostConn));
            hostConn.on("close", () => {
                if (role === "guest") {
                    addChat(null, "Disconnected from the host", true);
                    setStatus("The party has ended.");
                }
            });
        });
        peer.on("error", err => {
            setStatus(err.type === "peer-unavailable" ? "No party found with that code." : `Connection problem: ${err.type || err.message}`);
        });

        unhookPlayer = MyFlix.player.onLocal(e => {
            if (e.type !== "load" && hostConn?.open) hostConn.send({ t: "control", film: e.film, time: e.time, playing: e.playing });
        });
    }

    // Open the player in "joining" mode (from an invite link or the profile menu).
    function joinFromLink(c) {
        document.getElementById("player").classList.remove("hidden");
        document.documentElement.classList.add("player-open");
        showPanel();
        els.codeInput.value = c || "";
        if (c) join(c);
    }

    // ---------- leaving ----------
    function cleanup() {
        unhookPlayer?.();
        unhookPlayer = null;
        clearInterval(heartbeat);
        guests.clear();
        hostConn = null;
        try { peer?.destroy(); } catch { /* ignore */ }
        peer = null;
    }

    function leave(silent) {
        if (role === "host") broadcast({ t: "ended" });
        cleanup();
        role = null;
        code = null;
        MyFlix.player.setPartyLabel("");
        els.chat.innerHTML = "";
        if (!silent) toast("You left the watch party", "users");
        if (!panel.classList.contains("hidden")) showPanel();
    }

    function openPanel() {
        if (panel.classList.contains("hidden")) showPanel();
        else hidePanel();
    }

    MyFlix.party = { init: buildPanel, host, join, joinFromLink, leave, active, openPanel };
})(window.MyFlix = window.MyFlix || {});
