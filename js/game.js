// ==========================
// MOVIE + SERIES GUESSING GAME
// ==========================
(function (MyFlix) {
    const { normalizeAnswer, escapeHtml, flashClass } = MyFlix.utils;

    const POINTS_CORRECT = 10;
    const POINTS_WITH_HINT = 5;
    const HINT_PENALTY = 2;
    const STREAK_BONUS = 10;   // extra points per correct answer once the streak reaches 3
    const STREAK_FOR_BONUS = 3;

    const state = {
        running: false,
        mode: "movies",
        score: 0,
        streak: 0,
        current: null,
        lastIndex: -1,
        hintUsed: false,
        answered: false
    };

    let els = {};

    // ---------- display helpers ----------
    function updateScore() {
        els.score.textContent = `Score: ${state.score} | Streak: ${state.streak}`;
    }

    function setFeedback(html) {
        els.feedback.innerHTML = html;
    }

    function updateControls() {
        const live = state.running;
        els.start.textContent = live ? "↻ Restart" : "▶ Start Game";
        els.stop.disabled = !live;
        els.hint.disabled = !live || state.hintUsed || state.answered;
        els.submit.disabled = !live || state.answered;
    }

    function successFlash() {
        const flash = document.createElement("div");
        flash.className = "success-flash";
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 250);
    }

    // ---------- questions ----------
    function loadQuestion() {
        const pool = MyFlix.questions[state.mode];

        // Pick a random question that isn't the one we just showed.
        let index = Math.floor(Math.random() * pool.length);
        if (pool.length > 1 && index === state.lastIndex) {
            index = (index + 1) % pool.length;
        }
        state.lastIndex = index;
        state.current = pool[index];
        state.hintUsed = false;
        state.answered = false;

        els.question.textContent = state.current.question;
        els.guess.value = "";
        setFeedback("");
        updateControls();
        els.guess.focus({ preventScroll: true });
    }

    // ---------- actions ----------
    function start() {
        state.running = true;
        state.score = 0;
        state.streak = 0;
        state.lastIndex = -1;

        els.featured.classList.add("hidden");
        els.gameScreen.classList.remove("hidden");
        updateScore();
        loadQuestion();
    }

    function stop() {
        if (!state.running) return;
        state.running = false;
        state.current = null;

        els.featuredText.textContent = `Game over. Final score: ${state.score}. Press Start to play again.`;
        els.gameScreen.classList.add("hidden");
        els.featured.classList.remove("hidden");
        els.guess.value = "";
        setFeedback("");
        updateControls();
    }

    function showHint() {
        if (!state.running || state.hintUsed || state.answered) return;

        state.hintUsed = true;
        state.score = Math.max(0, state.score - HINT_PENALTY);

        const firstLetter = state.current.answer.charAt(0).toUpperCase();
        setFeedback(`<span class="hint">Hint: starts with “${escapeHtml(firstLetter)}” (−${HINT_PENALTY} points)</span>`);
        updateScore();
        updateControls();
    }

    function submit() {
        if (!state.running || state.answered) return;

        const guess = normalizeAnswer(els.guess.value);
        if (!guess) {
            setFeedback(`<span class="hint">Type an answer first.</span>`);
            return;
        }

        if (guess === normalizeAnswer(state.current.answer)) {
            state.answered = true;   // stops points being farmed by re-submitting
            state.streak++;
            state.score += state.hintUsed ? POINTS_WITH_HINT : POINTS_CORRECT;
            if (state.streak >= STREAK_FOR_BONUS) state.score += STREAK_BONUS;

            setFeedback(`<span class="correct">Correct! It was ${escapeHtml(state.current.answer)}.</span><br>Press Next for another.`);
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

    function setMode(mode) {
        state.mode = mode;
        els.movieMode.classList.toggle("active", mode === "movies");
        els.seriesMode.classList.toggle("active", mode === "series");
        els.movieMode.setAttribute("aria-pressed", String(mode === "movies"));
        els.seriesMode.setAttribute("aria-pressed", String(mode === "series"));
        state.lastIndex = -1;
        if (state.running) loadQuestion();
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
            movieMode: $("movie-mode"),
            seriesMode: $("series-mode")
        };

        els.start.addEventListener("click", start);
        els.stop.addEventListener("click", stop);
        els.hint.addEventListener("click", showHint);
        els.submit.addEventListener("click", submit);
        els.next.addEventListener("click", () => state.running && loadQuestion());
        els.movieMode.addEventListener("click", () => setMode("movies"));
        els.seriesMode.addEventListener("click", () => setMode("series"));
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
