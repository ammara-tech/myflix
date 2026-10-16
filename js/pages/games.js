// ==========================
// GAMES PAGE: Guess the Title
// ==========================
// Modes: Movies · Series (hand-written) · Live TV (TVMaze summaries)
//        Film Trivia (Wikipedia articles about films)
(function (MyFlix) {
    const { normalizeAnswer, escapeHtml, flashClass, stripHtml, storage, shuffle } = MyFlix.utils;
    const icon = (...a) => MyFlix.icon(...a);

    const POINTS_CORRECT = 10;
    const POINTS_WITH_HINT = 5;
    const HINT_PENALTY = 2;
    const STREAK_BONUS = 10;
    const STREAK_FOR_BONUS = 3;
    const SECONDS = 30;
    const SECONDS_PER_BONUS_POINT = 3;
    const HIGH_SCORE_KEY = "myflixHighScores";

    const MODES = {
        movies: { title: "Movies", icon: "film", note: "Hand-picked film descriptions" },
        series: { title: "Series", icon: "tv", note: "Hand-picked TV descriptions" },
        live: { title: "Live TV", icon: "monitor-play", note: "Endless questions from real TVMaze summaries" },
        trivia: { title: "Film Trivia", icon: "library", note: "Guess the film from its Wikipedia article" }
    };

    const state = {
        running: false, mode: "movies", score: 0, streak: 0, current: null, lastIndex: -1,
        used: new Set(), hintUsed: false, answered: false, timeLeft: 0, timerId: null, newBest: false, token: 0
    };
    let highScores = storage.read(HIGH_SCORE_KEY, {});
    if (typeof highScores !== "object" || !highScores) highScores = {};
    let els = {};

    const best = () => highScores[state.mode] || 0;

    // ---------- page ----------
    function render(view) {
        stopTimer();
        state.running = false;
        view.innerHTML = `
            <div class="page-header"><h1>Games</h1></div>
            <section class="game">
                <div class="game-screen">
                    <div class="game-top">
                        <span class="game-brand">${icon("gamepad-2")} Guess the Title</span>
                        <span class="game-live"><span class="dot-live"></span>Live</span>
                    </div>
                    <div class="mode-tabs" role="group" aria-label="Game mode">
                        ${Object.entries(MODES).map(([k, m]) => `<button type="button" class="mode-tab ${k === state.mode ? "is-on" : ""}" data-mode="${k}" aria-pressed="${k === state.mode}">${icon(m.icon)}<span>${m.title}</span></button>`).join("")}
                    </div>
                    <div class="game-body">
                        <div class="game-intro">
                            <h2>Can you name it?</h2>
                            <p class="muted" data-intro>${escapeHtml(MODES[state.mode].note)}. 30 seconds per question, bonus points for speed and streaks.</p>
                        </div>
                        <div class="game-play hidden">
                            <div class="game-timer"><div class="timer-track"><div class="timer-fill"></div></div><span class="timer-text">30s</span></div>
                            <p class="game-question" aria-live="polite"></p>
                            <form class="game-form">
                                <input type="text" class="game-input" placeholder="Type the title…" aria-label="Your answer" autocomplete="off">
                                <button type="submit" class="btn btn--play" data-g="submit">Submit</button>
                            </form>
                            <p class="game-feedback" aria-live="polite"></p>
                        </div>
                        <p class="game-score"></p>
                    </div>
                    <div class="game-controls">
                        <button type="button" class="btn btn--play" data-g="start">${icon("play")}<span>Start</span></button>
                        <button type="button" class="btn btn--grey" data-g="next">${icon("skip-forward")}<span>Next</span></button>
                        <button type="button" class="btn btn--grey" data-g="hint">${icon("lightbulb")}<span>Hint</span></button>
                        <button type="button" class="btn btn--ghost" data-g="stop">Stop</button>
                    </div>
                </div>
                <aside class="game-side">
                    <h2>${icon("trophy")} High scores</h2>
                    <ul class="scoreboard"></ul>
                    <h2>${icon("info")} How to play</h2>
                    <ul class="rules">
                        <li>${POINTS_CORRECT} points per correct answer, ${POINTS_WITH_HINT} if you used a hint (hints cost ${HINT_PENALTY}).</li>
                        <li>+1 point for every ${SECONDS_PER_BONUS_POINT} seconds left on the clock.</li>
                        <li>+${STREAK_BONUS} for every answer once you're on a streak of ${STREAK_FOR_BONUS}.</li>
                        <li>Spelling of punctuation, capitals and “The” doesn't matter.</li>
                    </ul>
                </aside>
            </section>`;

        const $ = s => view.querySelector(s);
        els = {
            screen: $(".game-screen"), intro: $(".game-intro"), introText: $("[data-intro]"), play: $(".game-play"),
            question: $(".game-question"), input: $(".game-input"), feedback: $(".game-feedback"), score: $(".game-score"),
            timerFill: $(".timer-fill"), timerText: $(".timer-text"), board: $(".scoreboard"),
            start: $('[data-g="start"]'), next: $('[data-g="next"]'), hint: $('[data-g="hint"]'), stop: $('[data-g="stop"]'), submit: $('[data-g="submit"]')
        };

        view.querySelector(".game").addEventListener("click", e => {
            const m = e.target.closest("[data-mode]");
            if (m) return setMode(m.dataset.mode);
            const b = e.target.closest("[data-g]");
            if (!b || b.type === "submit") return;
            ({ start, next: () => state.running && loadQuestion(), hint: showHint, stop })[b.dataset.g]?.();
        });
        view.querySelector(".game-form").addEventListener("submit", e => { e.preventDefault(); submit(); });

        updateScore();
        updateControls();
        renderBoard();
    }

    function renderBoard() {
        els.board.innerHTML = Object.entries(MODES).map(([k, m]) =>
            `<li class="${k === state.mode ? "is-on" : ""}">${icon(m.icon)}<span>${m.title}</span><strong>${highScores[k] || 0}</strong></li>`).join("");
    }

    // ---------- helpers ----------
    function updateScore() {
        els.score.innerHTML = `<span>Score <strong>${state.score}</strong></span><span>Streak <strong>${state.streak}</strong></span><span>Best <strong>${best()}</strong></span>`;
    }
    const setFeedback = html => { els.feedback.innerHTML = html; };

    function updateControls() {
        const live = state.running, waiting = live && !state.current;
        els.start.querySelector("span").textContent = live ? "Restart" : "Start";
        els.stop.disabled = !live;
        els.hint.disabled = !live || waiting || state.hintUsed || state.answered;
        els.submit.disabled = !live || waiting || state.answered;
        els.next.disabled = !live || waiting;
    }

    function successFlash() {
        const f = document.createElement("div");
        f.className = "success-flash";
        document.body.appendChild(f);
        setTimeout(() => f.remove(), 300);
    }

    function saveHighScore() {
        if (state.score <= best()) return false;
        highScores[state.mode] = state.score;
        storage.write(HIGH_SCORE_KEY, highScores);
        renderBoard();
        return true;
    }

    // ---------- timer ----------
    function renderTimer() {
        els.timerFill.style.width = `${(state.timeLeft / SECONDS) * 100}%`;
        els.timerFill.classList.toggle("low", state.timeLeft <= 10);
        els.timerText.textContent = `${state.timeLeft}s`;
    }
    function stopTimer() { clearInterval(state.timerId); state.timerId = null; }
    function startTimer() {
        stopTimer();
        state.timeLeft = SECONDS;
        renderTimer();
        state.timerId = setInterval(() => {
            if (!els.timerFill?.isConnected) return stopTimer(); // left the page
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
        setFeedback(`<span class="wrong">${icon("timer")} Time's up!</span> It was <strong>${escapeHtml(state.current.answer)}</strong>.`);
        flashClass(els.screen, "shake");
        updateScore();
        updateControls();
    }

    // ---------- question sources ----------
    function pickCurated() {
        const pool = MyFlix.questions[state.mode];
        let i = Math.floor(Math.random() * pool.length);
        if (pool.length > 1 && i === state.lastIndex) i = (i + 1) % pool.length;
        state.lastIndex = i;
        return pool[i];
    }

    // Hide the title's own words inside a description.
    function redact(text, name) {
        const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        let out = text.replace(new RegExp(esc(name), "gi"), "▇▇▇");
        name.split(/\s+/).map(w => w.replace(/^\W+|\W+$/g, "")).filter(w => w.length >= 3 && !/^(the|and|of)$/i.test(w))
            .forEach(w => { out = out.replace(new RegExp(`\\b${esc(w)}\\b`, "gi"), "▇▇▇"); });
        return out;
    }
    function shorten(text, max = 240) {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        let out = "";
        for (const s of sentences) {
            if ((out + s).length > max && out) break;
            out += s;
        }
        return out.length > max + 40 ? out.slice(0, max).trim() + "…" : out.trim();
    }

    async function pickLive() {
        const cat = await MyFlix.tvmaze.catalog();
        const pool = cat.slice(0, 300).filter(s => !state.used.has(`tv${s.id}`) && stripHtml(s.summary).length > 60);
        if (!pool.length) { state.used.clear(); return pickLive(); }
        const show = pool[Math.floor(Math.random() * pool.length)];
        state.used.add(`tv${show.id}`);
        const net = show.network?.name || show.webChannel?.name;
        return {
            question: shorten(redact(stripHtml(show.summary), show.name)),
            answer: show.name,
            hint: `Premiered ${show.premiered?.slice(0, 4) || "?"}${net ? ` on ${net}` : ""} · ${(show.genres || []).slice(0, 3).join(", ")}`
        };
    }

    // Wikipedia trivia: classics + (with a TMDB key) popular films.
    async function pickTrivia() {
        let films = MyFlix.classics.map(f => ({ name: f.title, year: f.year }));
        if (MyFlix.tmdb.enabled()) {
            try {
                const top = await MyFlix.tmdb.topRatedMovies();
                films = films.concat(top.map(m => ({ name: m.title, year: +(m.release_date || "").slice(0, 4) })));
            } catch { /* classics only */ }
        }
        for (const f of shuffle(films.filter(f => !state.used.has(`w${f.name}`))).slice(0, 4)) {
            state.used.add(`w${f.name}`);
            const w = await MyFlix.wiki.summary(f.name, f.year, "film").catch(() => null);
            if (!w?.extract || w.extract.length < 120) continue;
            const body = w.extract.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ");
            return { question: shorten(redact(body, f.name), 260), answer: f.name, hint: `Released ${f.year}` };
        }
        if (state.used.size > films.length - 2) state.used.clear();
        throw new Error("Couldn't load a trivia question.");
    }

    async function loadQuestion() {
        const token = ++state.token;
        stopTimer();
        Object.assign(state, { current: null, hintUsed: false, answered: false });
        els.input.value = "";
        setFeedback("");

        if (state.mode === "live" || state.mode === "trivia") {
            els.question.innerHTML = `<span class="loading-dots">Loading a question</span>`;
            updateControls();
            try {
                const q = state.mode === "live" ? await pickLive() : await pickTrivia();
                if (token !== state.token || !state.running) return;
                state.current = q;
            } catch {
                if (token !== state.token) return;
                setFeedback(`<span class="wrong">Couldn't reach the internet, so here's a Movies question instead.</span>`);
                state.current = MyFlix.questions.movies[Math.floor(Math.random() * MyFlix.questions.movies.length)];
            }
        } else {
            state.current = pickCurated();
        }

        els.question.textContent = state.current.question;
        updateControls();
        startTimer();
        els.input.focus({ preventScroll: true });
    }

    // ---------- actions ----------
    function start() {
        Object.assign(state, { running: true, score: 0, streak: 0, lastIndex: -1, newBest: false });
        els.intro.classList.add("hidden");
        els.play.classList.remove("hidden");
        updateScore();
        loadQuestion();
    }

    function stop() {
        if (!state.running) return;
        state.running = false;
        state.current = null;
        state.token++;
        stopTimer();
        const record = state.score > 0 && state.score >= best();
        els.introText.innerHTML = record
            ? `${icon("trophy")} Final score <strong>${state.score}</strong>, a new ${MODES[state.mode].title} high score!`
            : `Final score <strong>${state.score}</strong>. Your best is ${best()}. Press Start to play again.`;
        els.play.classList.add("hidden");
        els.intro.classList.remove("hidden");
        updateScore();
        updateControls();
    }

    function showHint() {
        if (!state.running || !state.current || state.hintUsed || state.answered) return;
        state.hintUsed = true;
        state.score = Math.max(0, state.score - HINT_PENALTY);
        const a = state.current.answer;
        const shape = a.replace(/[A-Za-z0-9]/g, (c, i) => (i === 0 ? c.toUpperCase() : "_"));
        setFeedback(`<span class="hint">${icon("lightbulb")} ${escapeHtml(shape)} · ${escapeHtml(state.current.hint)} (−${HINT_PENALTY})</span>`);
        updateScore();
        updateControls();
    }

    function submit() {
        if (!state.running || !state.current || state.answered) return;
        const guess = normalizeAnswer(els.input.value);
        if (!guess) return setFeedback(`<span class="hint">Type an answer first.</span>`);

        if (guess === normalizeAnswer(state.current.answer)) {
            stopTimer();
            state.answered = true;
            state.streak++;
            const base = state.hintUsed ? POINTS_WITH_HINT : POINTS_CORRECT;
            const speed = Math.floor(state.timeLeft / SECONDS_PER_BONUS_POINT);
            const streak = state.streak >= STREAK_FOR_BONUS ? STREAK_BONUS : 0;
            state.score += base + speed + streak;
            const extras = [speed && `+${speed} speed`, streak && `+${streak} streak`].filter(Boolean);
            let msg = `<span class="correct">${icon("circle-check")} Correct! It was ${escapeHtml(state.current.answer)}.</span>`;
            if (extras.length) msg += ` <span class="hint">${extras.join(" · ")}</span>`;
            if (saveHighScore() && !state.newBest) {
                state.newBest = true;
                msg += `<br><span class="hint">${icon("trophy")} New high score!</span>`;
            }
            setFeedback(msg);
            flashClass(els.screen, "glow");
            successFlash();
        } else {
            state.streak = 0;
            setFeedback(`<span class="wrong">${icon("x")} Not quite.</span> <span class="hint">Hint: ${escapeHtml(state.current.hint)}</span>`);
            flashClass(els.screen, "shake");
        }
        updateScore();
        updateControls();
    }

    function setMode(mode) {
        state.mode = mode;
        document.querySelectorAll(".mode-tab").forEach(b => {
            b.classList.toggle("is-on", b.dataset.mode === mode);
            b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
        });
        state.lastIndex = -1;
        if (!state.running) els.introText.textContent = `${MODES[mode].note}. 30 seconds per question, bonus points for speed and streaks.`;
        updateScore();
        renderBoard();
        if (state.running) loadQuestion();
    }

    (MyFlix.pages = MyFlix.pages || {}).games = { title: "Games", render };
})(window.MyFlix = window.MyFlix || {});
