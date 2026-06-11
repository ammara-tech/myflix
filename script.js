// ==========================
// MOVIE APP
// ==========================
document.addEventListener("DOMContentLoaded", () => {
// DOM
const searchInput = document.querySelector("#search-input");
const clearBtn = document.querySelector("#clear-btn");
const movieResults = document.querySelector("#movie-results");
const favouritesList = document.querySelector("#favourites-list");

// STATE
let favourites = JSON.parse(localStorage.getItem("favouriteMovies")) || [];
let allMovies = [];
let selectedGenre = null;

// ==========================
// TOOLTIP (OPTIONAL FUTURE USE)
// ==========================
const tooltip = document.createElement("div");
tooltip.classList.add("tooltip");
document.body.appendChild(tooltip);

// ==========================
// FETCH MOVIES
// ==========================
async function fetchMovies(searchTerm) {
    const res = await fetch(
        `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(searchTerm)}`
    );

    const data = await res.json();
    allMovies = data.map(item => item.show);

    applyFilters();
}

// ==========================
// FILTER SYSTEM
// ==========================
function applyFilters() {
    let filtered = allMovies;

    if (selectedGenre) {
        filtered = filtered.filter(movie =>
            movie.genres?.some(g =>
                g.toLowerCase().includes(selectedGenre.toLowerCase())
            )
        );
    }

    renderMovies(filtered);
}

// ==========================
// RENDER MOVIES
// ==========================
function renderMovies(movies) {
    movieResults.innerHTML = "";

    movies.forEach(movie => {
        const card = document.createElement("div");
        card.className = "movie-card";

        card.innerHTML = `
            <img src="${movie.image?.medium || 'https://via.placeholder.com/300x450?text=No+Image'}" />
            <h3>${movie.name}</h3>
            <p>${movie.premiered || "Unknown year"}</p>
            <button class="save-btn">Save Favourite</button>
        `;

        card.querySelector(".save-btn").addEventListener("click", () => {
            saveFavourite(movie);
        });

        movieResults.appendChild(card);
    });
}

// ==========================
// SEARCH
// ==========================
function searchMovies() {
    const term = searchInput.value.trim();

    if (!term) {
        alert("Enter a movie name");
        return;
    }

    selectedGenre = null;
    fetchMovies(term);
}

// ENTER SEARCH SUPPORT
document.querySelector("#search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    searchMovies();
});

// ==========================
// CLEAR SEARCH
// ==========================
clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    movieResults.innerHTML = "";
    selectedGenre = null;
});

// ==========================
// FAVOURITES SYSTEM
// ==========================
function saveFavourite(movie) {
    if (favourites.some(f => f.id === movie.id)) return;

    favourites.push(movie);
    syncFavourites();
}

function removeFavourite(id) {
    favourites = favourites.filter(f => f.id !== id);
    syncFavourites();
}

function syncFavourites() {
    localStorage.setItem("favouriteMovies", JSON.stringify(favourites));
    renderFavourites();
    updateFavouritesUI();
}

// ==========================
// RENDER FAVOURITES
// ==========================
function renderFavourites() {
    favouritesList.innerHTML = "";

    favourites.forEach(movie => {
        const card = document.createElement("div");
        card.className = "movie-card";

        card.innerHTML = `
            <img src="${movie.image?.medium || 'https://via.placeholder.com/300x450?text=No+Image'}" />
            <h3>${movie.name}</h3>
            <p>${movie.premiered || "Unknown year"}</p>
            <button class="remove-btn">Remove</button>
        `;

        card.querySelector(".remove-btn").addEventListener("click", () => {
            removeFavourite(movie.id);
        });

        favouritesList.appendChild(card);
    });

    updateFavouritesUI();
}

// ==========================
// SEARCH RESULTS AND MY LIST BUTTONS
// ==========================
window.scrollRow = function (id, direction) {
    const row = document.getElementById(id);
    if (!row) return;

    const scrollAmount = 300;

    row.scrollBy({
        left: direction * scrollAmount,
        behavior: "smooth"
    });
};

// ==========================
// UI STATE
// ==========================
function updateFavouritesUI() {
    const empty = document.querySelector(".empty-state");
    if (!empty) return;

    empty.style.display = favourites.length ? "none" : "block";
}

// ==========================
// GENRE SYSTEM
// ==========================
const genres = [
    { title: "Action & Adventure", color: "#e50914", description: "High-stakes action, epic journeys, and nonstop thrills." },
    { title: "Drama", color: "#b3001b", description: "Powerful stories driven by emotion, conflict, and real-life struggles." },
    { title: "Comedy", color: "#f39c12", description: "Light, funny stories packed with humor and feel-good moments." },
    { title: "Horror", color: "#2c3e50", description: "Chilling tales designed to scare, shock, and keep you on edge." },
    { title: "Sci-Fi", color: "#00bcd4", description: "Futuristic worlds, advanced tech, and mind-bending ideas." },

    { title: "Romance", color: "#ff4d6d", description: "Love stories, deep connections, and emotional relationships." },
    { title: "Thriller", color: "#8e44ad", description: "High tension, twists, and edge-of-your-seat suspense." },
    { title: "Mystery", color: "#34495e", description: "Unsolved cases, hidden clues, and shocking revelations." },
    { title: "Fantasy", color: "#9b59b6", description: "Magical worlds, mythical creatures, and epic adventures." },
    { title: "Animation", color: "#f1c40f", description: "Animated stories full of imagination for all ages." },
    { title: "Crime", color: "#7f8c8d", description: "Dark investigations, criminal minds, and justice stories." },
    { title: "Documentary", color: "#16a085", description: "Real stories, real people, real events from the world." },
    { title: "Family", color: "#27ae60", description: "Fun, safe entertainment for all ages to enjoy together." },
    { title: "War", color: "#c0392b", description: "Battlefield stories and the human cost of conflict." },
    { title: "Western", color: "#d35400", description: "Outlaws, cowboys, and life on the untamed frontier." }
];

// ==========================
// RENDER GENRES
// ==========================
const genreRow = document.getElementById("genreRow");
const genreInfo = document.getElementById("genreInfo");

let activeGenreCard = null;

function renderGenres() {
    genreRow.innerHTML = "";

    genres.forEach(g => {
        const card = document.createElement("div");
        card.className = "category-card";
        card.textContent = g.title;

        card.addEventListener("click", () => {

            if (activeGenreCard) {
                activeGenreCard.classList.remove("active");
            }

            card.classList.add("active");
            activeGenreCard = card;

            selectedGenre = g.title;
            genreInfo.innerHTML = `
                <b style="color:${g.color}">${g.title}</b><br>
                ${g.description}
            `;

            applyFilters();
        });

        genreRow.appendChild(card);
    });
}
// ===============================
// CINEMA MODE (CLEAN + STABLE)
// ===============================

const cinemaPlayer = document.getElementById("cinema-player");
const cinemaStatus = document.getElementById("cinema-status");

cinemaPlayer.muted = true;
cinemaPlayer.playsInline = true;

// ===============================
// FILM DATABASE
// ===============================
const BBB =
"https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v";

const films = {
    action:{title:"Action",url:BBB},
    drama:{title:"Drama",url:BBB},
    comedy:{title:"Comedy",url:BBB},
    horror:{title:"Horror",url:BBB},
    scifi:{title:"Sci-Fi",url:BBB},
    romance:{title:"Romance",url:BBB},
    thriller:{title:"Thriller",url:BBB},
    mystery:{title:"Mystery",url:BBB},
    fantasy:{title:"Fantasy",url:BBB},
    animation:{title:"Animation",url:BBB},
    crime:{title:"Crime",url:BBB},
    documentary:{title:"Documentary",url:BBB},
    family:{title:"Family",url:BBB},
    war:{title:"War",url:BBB},
    western:{title:"Western",url:BBB}
};

let currentKey = "action";
let bingeMode = false;

const filmOrder = Object.keys(films);

// ===============================
// LOAD VIDEO
// ===============================
function loadVideo(film) {
    cinemaStatus.textContent = "Loading: " + film.title;

    cinemaPlayer.pause();
    cinemaPlayer.src = "";
    cinemaPlayer.load();

    setTimeout(() => {
        cinemaPlayer.src = film.url;
        cinemaPlayer.load();

        cinemaPlayer.play()
            .then(() => {
                cinemaStatus.textContent = "Playing: " + film.title;
            })
            .catch(() => {
                cinemaStatus.textContent = "Click Play to start";
            });
    }, 200);
}

// ===============================
// PLAY FILM BY KEY
// ===============================
function playFilm(key) {
    const film = films[key];
    if (!film) return;

    currentKey = key;
    loadVideo(film);
}

// ===============================
// NEXT FILM
// ===============================
function nextFilm() {
    let index = filmOrder.indexOf(currentKey);
    index = (index + 1) % filmOrder.length;
    playFilm(filmOrder[index]);
}

// ===============================
// BINGE MODE
// ===============================
function runBinge() {
    if (!bingeMode) return;

    nextFilm();

    setTimeout(runBinge, 12000);
}

// ===============================
// CLICK HANDLERS (MATCH data-film)
// ===============================
document.querySelectorAll(".film-card").forEach(btn => {
    btn.addEventListener("click", () => {
        const key = btn.dataset.film;
        bingeMode = false;
        playFilm(key);
    });
});

// ===============================
// CONTROLS
// ===============================
document.getElementById("cinema-play")?.addEventListener("click", () => {
    bingeMode = false;
    playFilm(currentKey);
});

document.getElementById("cinema-next")?.addEventListener("click", () => {
    bingeMode = false;
    nextFilm();
});

document.getElementById("cinema-binge")?.addEventListener("click", () => {
    bingeMode = !bingeMode;

    cinemaStatus.textContent = bingeMode
        ? "🍿 Auto-Binge Mode ON"
        : "Auto-Binge Mode OFF";

    if (bingeMode) runBinge();
});

// ===============================
// START
// ===============================
cinemaPlayer.removeAttribute("src");
cinemaPlayer.load();

cinemaStatus.textContent = "Select a film to begin";

// ======================================
// MOVIE + SERIES GUESSING GAME:
// ==========================
// DOM ELEMENTS
// ==========================

const startGameBtn = document.getElementById("start-game");
const stopGameBtn = document.getElementById("stop-game");
const submitGuessBtn = document.getElementById("submit-guess");
const nextQuestionBtn = document.getElementById("next-question");

const featuredScreen = document.getElementById("featured-screen");
const gameScreen = document.getElementById("game-screen");

const guessInput = document.getElementById("guess-input");
const feedback = document.getElementById("game-feedback");
const scoreDisplay = document.getElementById("score");
const questionDisplay = document.getElementById("game-question");

const movieModeBtn = document.getElementById("movie-mode");
const seriesModeBtn = document.getElementById("series-mode");

// ==========================
// GAME STATE
// ==========================

let gameMode = "movies";
let score = 0;
let streak = 0;
let currentQuestion = null;
let hintUsed = false;

// ==========================
// QUESTIONS
// ==========================

const movieQuestions = [
{
question: "This film follows a man who can manipulate dreams through multiple layers of reality.",
answer: "inception",
hint: "Christopher Nolan directed it."
},
{
question: "A South Korean thriller where a poor family infiltrates a wealthy household.",
answer: "parasite",
hint: "Won Best Picture."
},
{
question: "A group of superheroes attempts to reverse a universe-wide catastrophe.",
answer: "avengers endgame",
hint: "Marvel."
},
{
question: "A man survives alone on Mars using science and potatoes.",
answer: "the martian",
hint: "Matt Damon stars."
},
{
question: "A psychological thriller centered around a ballerina losing grip on reality.",
answer: "black swan",
hint: "Bird title."
},
{
question: "A detective investigates dreams and memory in a futuristic city.",
answer: "blade runner 2049",
hint: "Ryan Gosling."
},
{
question: "A young drummer is pushed to his limits by an abusive music instructor.",
answer: "whiplash",
hint: "Jazz."
},
{
question: "A lawyer defends a man accused of murder in 1950s Alabama.",
answer: "to kill a mockingbird",
hint: "Based on a famous novel."
}
];

const seriesQuestions = [
{
question: "A chemistry teacher begins producing illegal substances after a diagnosis.",
answer: "breaking bad",
hint: "Walter White."
},
{
question: "Teenagers uncover a government conspiracy involving another dimension.",
answer: "stranger things",
hint: "The Upside Down."
},
{
question: "A chess prodigy rises through the ranks while battling addiction.",
answer: "the queens gambit",
hint: "Chess."
},
{
question: "A heist drama involving red jumpsuits and masks.",
answer: "money heist",
hint: "Spanish series."
},
{
question: "A wealthy family fights over control of a media empire.",
answer: "succession",
hint: "Roy family."
},
{
question: "Contestants compete in deadly games for a cash prize.",
answer: "squid game",
hint: "South Korea."
},
{
question: "A fantasy series involving monster hunters and destiny.",
answer: "the witcher",
hint: "Geralt."
},
{
question: "An anthology series exploring technology's dark side.",
answer: "black mirror",
hint: "Every episode differs."
}
];

// ==========================
// EFFECTS
// ==========================

function screenShake() {
    const tv = document.querySelector(".tv-screen");

    tv.classList.add("shake");

    setTimeout(() => {
        tv.classList.remove("shake");
    }, 500);
}

function glitchEffect() {
    const tv = document.querySelector(".tv-screen");

    tv.classList.add("glitch");

    setTimeout(() => {
        tv.classList.remove("glitch");
    }, 500);
}

function createSuccessFlash() {

    const flash = document.createElement("div");

    flash.style.position = "fixed";
    flash.style.inset = "0";
    flash.style.background = "rgba(0,255,120,0.15)";
    flash.style.pointerEvents = "none";
    flash.style.zIndex = "9999";

    document.body.appendChild(flash);

    setTimeout(() => {
        flash.remove();
    }, 250);
}

// ==========================
// QUESTION LOADER
// ==========================

function loadQuestion() {

    const pool =
        gameMode === "movies"
            ? movieQuestions
            : seriesQuestions;

    currentQuestion =
        pool[Math.floor(Math.random() * pool.length)];

    questionDisplay.textContent =
        currentQuestion.question;

    feedback.innerHTML = "";

    guessInput.value = "";

    hintUsed = false;
}

// ==========================
// HINT SYSTEM
// ==========================

function showHint() {

    if (!currentQuestion || hintUsed) return;

    hintUsed = true;

    const firstLetter =
        currentQuestion.answer.charAt(0).toUpperCase();

    score = Math.max(0, score - 2);

    feedback.innerHTML =
        `<span class="hint">Hint: Starts with "${firstLetter}"</span>`;

    scoreDisplay.textContent =
        `Score: ${score} | Streak: ${streak}`;
}

// Create hint button
const hintBtn = document.createElement("button");
hintBtn.textContent = "Hint";
hintBtn.classList.add("hint-btn");

document.querySelector(".tv-controls").appendChild(hintBtn);

hintBtn.addEventListener("click", showHint);

// ==========================
// START GAME
// ==========================

startGameBtn.addEventListener("click", () => {

    featuredScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    score = 0;
    streak = 0;

    scoreDisplay.textContent =
        `Score: ${score} | Streak: ${streak}`;

    loadQuestion();
});

// ==========================
// STOP GAME
// ==========================

stopGameBtn.addEventListener("click", () => {

    featuredScreen.classList.remove("hidden");
    gameScreen.classList.add("hidden");

    feedback.textContent = "";
    guessInput.value = "";

    streak = 0;
});

// ==========================
// SUBMIT ANSWER
// ==========================

submitGuessBtn.addEventListener("click", () => {

    if (!currentQuestion) return;

    const answer =
        guessInput.value.trim().toLowerCase();

    if (answer === currentQuestion.answer.toLowerCase()) {

        score += hintUsed ? 5 : 10;
        streak++;

        if (streak >= 3) {
            score += 10;
        }

        feedback.innerHTML =
            "<span class='correct'>Correct Answer</span>";

        scoreDisplay.textContent =
            `Score: ${score} | Streak: ${streak}`;

        glitchEffect();
        createSuccessFlash();

    } else {

        streak = 0;

        feedback.innerHTML =
            `<span class='wrong'>Incorrect<br><br>Hint: ${currentQuestion.hint}</span>`;

        scoreDisplay.textContent =
            `Score: ${score} | Streak: ${streak}`;

        screenShake();
    }
});

// ==========================
// NEXT QUESTION
// ==========================

nextQuestionBtn.addEventListener("click", loadQuestion);

// ==========================
// MODE SWITCHING
// ==========================

movieModeBtn.addEventListener("click", () => {

    gameMode = "movies";

    movieModeBtn.classList.add("active");
    seriesModeBtn.classList.remove("active");

    loadQuestion();
});

seriesModeBtn.addEventListener("click", () => {

    gameMode = "series";

    gameModeBtn = "series";

    seriesModeBtn.classList.add("active");
    movieModeBtn.classList.remove("active");

    loadQuestion();
});

// ==========================
// ENTER KEY SUPPORT
// ==========================

guessInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        submitGuessBtn.click();
    }
});
// ==========================
// INIT
// ==========================
renderGenres();
renderFavourites();
updateFavouritesUI();
});