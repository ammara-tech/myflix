// ==========================
// MOVIE + SERIES GUESSING GAME
// ==========================
(function (MyFlix) {
    const { normalizeAnswer, escapeHtml, flashClass, stripHtml, storage, yearOf } = MyFlix.utils;

    const POINTS_CORRECT = 10;
    const POINTS_WITH_HINT = 5;
    const HINT_PENALTY = 2;
    const STREAK_BONUS = 10;      // extra points per correct answer once the streak reaches 3
    const STREAK_FOR_BONUS = 3;
    const SECONDS_PER_QUESTION = 30;
    const SECONDS_PER_BONUS_POINT = 3; // 1 bonus point for every 3 seconds left
    const HIGH_SCORE_KEY = "myflixHighScores";

    const MODE_NAMES = { movies: "Movies", series: "Series", live: "Live TVMaze" };

    const state = {
        running: false,
        mode: "movies",
        score: 0,
        streak: 0,
        current: null,
        lastIndex: -1,
        usedLiveIds: new Set(),
        hintUsed: false,
        answered: false,
        timeLeft: 0,
        timerId: null,
        newBestShown: false,
        loadToken: 0
    };

    let highScores = storage.read(HIGH_SCORE_KEY, {});
    if (typeof highScores !== "object" || highScores === null) highScores = {};

    let els = {};

    // ---------- display helpers ----------
    function best() {
        return highScores[state.mode] || 0;
    }

    function updateScore() {
        els.score.textContent = `Score: ${state.score} | Streak: ${state.streak} | Best (${MODE_NAMES[state.mode]}): ${best()}`;
    }

    function setFeedback(html) {
        els.feedback.innerHTML = html;
    }

    function updateControls() {
        const live = state.running;
        const waiting = live && !state.current; // live question still loading
        els.start.textContent = live ? "↻ Restart" : "▶ Start Game";
        els.stop.disabled = !live;
        els.hint.disabled = !live || waiting || state.hintUsed || state.answered;
        els.submit.disabled = !live || waiting || state.answered;
        els.next.disabled = !live || waiting;
    }

    function successFlash() {
        const flash = document.createElement("div");
        flash.className = "success-flash";
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 250);
    }

    function saveHighScore() {
        if (state.score <= best()) return false;
        highScores[state.mode] = state.score;
        storage.write(HIGH_SCORE_KEY, highScores);
        return true;
    }

    // ---------- countdown ----------
    function renderTimer() {
        const pct = (state.timeLeft / SECONDS_PER_QUESTION) * 100;
        els.timerBar.style.width = `${pct}%`;
        els.timerBar.classList.toggle("low", state.timeLeft <= 10);
        els.timerText.textContent = `${state.timeLeft}s`;
    }

    function stopTimer() {
        clearInterval(state.timerId);
        state.timerId = null;
    }

    function startTimer() {
        stopTimer();
        state.timeLeft = SECONDS_PER_QUESTION;
        els.timer.classList.remove("hidden");
        renderTimer();
        state.timerId = setInterval(() => {
            state.timeLeft--;
            renderTimer();
            if (state.timeLeft <= 0) timeUp();
        }, 1000);
    }

    function timeUp() {
        stopTimer();
        if (!state.running || state.answered) return;
        state.answered = true;
        state.streak = 0;
        setFeedback(`<span class="wrong">⏰ Time's up!</span> It was <b>${escapeHtml(state.current.answer)}</b>.<br>Press Next for another.`);
        flashClass(els.tv, "shake");
        updateScore();
        updateControls();
    }

    // ---------- question sources ----------
    function pickCurated() {
        const pool = MyFlix.questions[state.mode];
        // Pick a random question that isn't the one we just showed.
        let index = Math.floor(Math.random() * pool.length);
        if (pool.length > 1 && index === state.lastIndex) {
            index = (index + 1) % pool.length;
        }
        state.lastIndex = index;
        return pool[index];
    }

    // Hide the show's own name inside its summary.
    function redact(text, name) {
        const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const words = name.split(/\s+/).filter(w => w.replace(/\W/g, "").length >= 3 && !/^(the|and|of)$/i.test(w));
        let out = text.replace(new RegExp(escapeRe(name), "gi"), "▇▇▇");
        words.forEach(w => {
            const clean = w.replace(/^\W+|\W+$/g, "");
            if (clean) out = out.replace(new RegExp(`\\b${escapeRe(clean)}\\b`, "gi"), "▇▇▇");
        });
        return out;
    }

    // Keep the first sentence or two, up to ~220 characters.
    function shorten(text) {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        let out = "";
        for (const s of sentences) {
            if ((out + s).length > 220 && out) break;
            out += s;
        }
        return out.length > 260 ? out.slice(0, 257).trim() + "…" : out.trim();
    }

    async function pickLive() {
        const catalog = await MyFlix.api.getCatalog();
        const candidates = catalog
            .slice(0, 300)
            .filter(s => !state.usedLiveIds.has(s.id) && stripHtml(s.summary).length > 60);

        if (!candidates.length) {
            state.usedLiveIds.clear();
            return pickLive();
        }

        const show = candidates[Math.floor(Math.random() * candidates.length)];
        state.usedLiveIds.add(show.id);

        const network = show.network?.name || show.webChannel?.name;
        const genres = show.genres?.length ? ` · ${show.genres.slice(0, 3).join(", ")}` : "";
        return {
            question: shorten(redact(stripHtml(show.summary), show.name)),
            answer: show.name,
            hint: `Premiered ${yearOf(show)}${network ? ` on ${network}` : ""}${genres}`
        };
    }

    // ---------- questions ----------
    async function loadQuestion() {
        const token = ++state.loadToken;
        stopTimer();
        state.current = null;
        state.hintUsed = false;
        state.answered = false;
        els.guess.value = "";
        setFeedback("");

        if (state.mode === "live") {
            els.question.textContent = "Loading a live question from TVMaze…";
            els.timer.classList.add("hidden");
            updateControls();
            try {
                const q = await pickLive();
                if (token !== state.loadToken || !state.running) return;
                state.current = q;
            } catch {
                if (token !== state.loadToken) return;
                setFeedback(`<span class="wrong">Couldn't reach TVMaze, so here's a Series question instead.</span>`);
                setMode("series", { silent: true });
                state.current = pickCurated();
            }
        } else {
            state.current = pickCurated();
        }

        els.question.textContent = state.current.question;
        updateControls();
        startTimer();
        els.guess.focus({ preventScroll: true });
    }

    // ---------- actions ----------
    function start() {
        state.running = true;
        state.score = 0;
        state.streak = 0;
        state.lastIndex = -1;
        state.newBestShown = false;

        els.featured.classList.add("hidden");
        els.gameScreen.classList.remove("hidden");
        updateScore();
        loadQuestion();
    }

    function stop() {
        if (!state.running) return;
        state.running = false;
        state.current = null;
        state.loadToken++;
        stopTimer();

        const isBest = state.score > 0 && state.score >= best();
        els.featuredText.textContent = isBest
            ? `Game over. Final score: ${state.score} — a new ${MODE_NAMES[state.mode]} high score! 🏆`
            : `Game over. Final score: ${state.score}. Your best is ${best()}. Press Start to play again.`;
        els.gameScreen.classList.add("hidden");
        els.featured.classList.remove("hidden");
        els.guess.value = "";
        setFeedback("");
        updateScore();
        updateControls();
    }

    function showHint() {
        if (!state.running || !state.current || state.hintUsed || state.answered) return;

        state.hintUsed = true;
        state.score = Math.max(0, state.score - HINT_PENALTY);

        const firstLetter = state.current.answer.charAt(0).toUpperCase();
        setFeedback(`<span class="hint">Hint: starts with “${escapeHtml(firstLetter)}” (−${HINT_PENALTY} points)</span>`);
        updateScore();
        updateControls();
    }

    function submit() {
        if (!state.running || !state.current || state.answered) return;

        const guess = normalizeAnswer(els.guess.value);
        if (!guess) {
            setFeedback(`<span class="hint">Type an answer first.</span>`);
            return;
        }

        if (guess === normalizeAnswer(state.current.answer)) {
            stopTimer();
            state.answered = true;   // stops points being farmed by re-submitting
            state.streak++;
            const base = state.hintUsed ? POINTS_WITH_HINT : POINTS_CORRECT;
            const timeBonus = Math.floor(state.timeLeft / SECONDS_PER_BONUS_POINT);
            const streakBonus = state.streak >= STREAK_FOR_BONUS ? STREAK_BONUS : 0;
            state.score += base + timeBonus + streakBonus;

            const extras = [timeBonus && `+${timeBonus} speed`, streakBonus && `+${streakBonus} streak`].filter(Boolean);
            let msg = `<span class="correct">Correct! It was ${escapeHtml(state.current.answer)}.</span>`;
            if (extras.length) msg += ` <span class="hint">(${extras.join(", ")})</span>`;
            if (saveHighScore() && !state.newBestShown) {
                state.newBestShown = true;
                msg += `<br><span class="hint">🏆 New high score!</span>`;
            }
            setFeedback(msg + `<br>Press Next for another.`);
            flashClass(els.tv, "glitch");
            successFlash();
        } else {
            state.streak = 0;
            setFeedback(`<span class="wrong">Incorrect</span><br><span class="hint">Hint: ${escapeHtml(state.current.hint)}</span>`);
            flashClass(els.tv, "shake");
        }

        updateScore();
        updateControls();
    }

    function setMode(mode, { silent = false } = {}) {
        state.mode = mode;
        els.modeBtns.forEach(btn => {
            const on = btn.dataset.mode === mode;
            btn.classList.toggle("active", on);
            btn.setAttribute("aria-pressed", String(on));
        });
        state.lastIndex = -1;
        updateScore();
        if (state.running && !silent) loadQuestion();
    }

    // ---------- init ----------
    function init() {
        const $ = id => document.getElementById(id);
        els = {
            tv: document.querySelector(".hero-tv .tv-screen"),
            start: $("start-game"),
            stop: $("stop-game"),
            hint: $("hint-btn"),
            submit: $("submit-guess"),
            next: $("next-question"),
            featured: $("featured-screen"),
            featuredText: $("featured-text"),
            gameScreen: $("game-screen"),
            guess: $("guess-input"),
            feedback: $("game-feedback"),
            score: $("score"),
            question: $("game-question"),
            timer: $("game-timer"),
            timerBar: document.querySelector("#game-timer .timer-fill"),
            timerText: document.querySelector("#game-timer .timer-text"),
            modeBtns: document.querySelectorAll(".mode-btn")
        };

        els.start.addEventListener("click", start);
        els.stop.addEventListener("click", stop);
        els.hint.addEventListener("click", showHint);
        els.submit.addEventListener("click", submit);
        els.next.addEventListener("click", () => state.running && loadQuestion());
        els.modeBtns.forEach(btn => btn.addEventListener("click", () => setMode(btn.dataset.mode)));
        els.guess.addEventListener("keydown", e => {
            if (e.key === "Enter") {
                e.preventDefault();
                submit();
            }
        });

        updateScore();
        updateControls();
    }

    MyFlix.game = { init };
})(window.MyFlix = window.MyFlix || {});
