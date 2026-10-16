// ==========================
// CINEMA MODE (VIDEO PLAYER)
// ==========================
(function (MyFlix) {
    const BINGE_INTERVAL_MS = 12000;

    const films = MyFlix.films;
    const filmOrder = Object.keys(films);

    let player, status, liveBadge, bingeBtn, cards;
    let currentKey = filmOrder[0];
    let bingeTimer = null;
    let loadToken = 0;   // ignores stale play() results when films are switched quickly

    function setStatus(text) {
        status.textContent = text;
    }

    function highlight(key) {
        cards.forEach(c => c.classList.toggle("active", c.dataset.film === key));
    }

    function playFilm(key) {
        const film = films[key];
        if (!film) return;

        currentKey = key;
        highlight(key);
        const token = ++loadToken;
        setStatus(`Loading: ${film.title}`);

        if (player.getAttribute("src") !== film.url) {
            player.src = film.url;
        } else {
            player.currentTime = 0;
        }

        player.play()
            .then(() => {
                if (token === loadToken) setStatus(`Playing: ${film.title}`);
            })
            .catch(err => {
                if (token !== loadToken || err.name === "AbortError") return;
                setStatus("Press ▶ on the player to start.");
            });
    }

    function nextFilm() {
        const index = (filmOrder.indexOf(currentKey) + 1) % filmOrder.length;
        playFilm(filmOrder[index]);
    }

    function setBinge(on) {
        clearInterval(bingeTimer);
        bingeTimer = on ? setInterval(nextFilm, BINGE_INTERVAL_MS) : null;
        bingeBtn.classList.toggle("active", on);
        bingeBtn.setAttribute("aria-pressed", String(on));
        if (on) nextFilm();
        else setStatus(player.paused ? "Auto-Binge off" : `Playing: ${films[currentKey].title}`);
    }

    function init() {
        player = document.getElementById("cinema-player");
        status = document.getElementById("cinema-status");
        liveBadge = document.getElementById("cinema-badge");
        bingeBtn = document.getElementById("cinema-binge");
        cards = document.querySelectorAll(".film-card");

        player.muted = true;
        player.playsInline = true;

        cards.forEach(card => {
            card.addEventListener("click", () => {
                setBinge(false);
                playFilm(card.dataset.film);
            });
        });

        document.getElementById("cinema-play").addEventListener("click", () => {
            if (player.getAttribute("src") && player.paused) {
                player.play().catch(() => {});
            } else if (!player.getAttribute("src")) {
                playFilm(currentKey);
            }
        });
        document.getElementById("cinema-next").addEventListener("click", () => {
            setBinge(false);
            nextFilm();
        });
        bingeBtn.addEventListener("click", () => setBinge(bingeTimer === null));

        player.addEventListener("play", () => liveBadge.classList.add("on"));
        player.addEventListener("pause", () => liveBadge.classList.remove("on"));
        player.addEventListener("error", () => {
            if (player.getAttribute("src")) setStatus("This video couldn't be loaded. Try another film.");
        });

        setStatus("Select a film to begin");
    }

    MyFlix.cinema = { init };
})(window.MyFlix = window.MyFlix || {});
