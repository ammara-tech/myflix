// ==========================
// GENRE DATA
// ==========================
// `matches` lists the TVMaze genre names that belong to each category.
// `types` lists TVMaze show types (TVMaze treats Animation and Documentary
// as show types, not genres).
(function (MyFlix) {
    MyFlix.genres = [
        { title: "Action & Adventure", color: "#e50914", matches: ["Action", "Adventure"], description: "High-stakes action, epic journeys, and nonstop thrills." },
        { title: "Drama", color: "#b3001b", matches: ["Drama"], description: "Powerful stories driven by emotion, conflict, and real-life struggles." },
        { title: "Comedy", color: "#f39c12", matches: ["Comedy"], description: "Light, funny stories packed with humor and feel-good moments." },
        { title: "Horror", color: "#2c3e50", matches: ["Horror"], description: "Chilling tales designed to scare, shock, and keep you on edge." },
        { title: "Sci-Fi", color: "#00bcd4", matches: ["Science-Fiction"], description: "Futuristic worlds, advanced tech, and mind-bending ideas." },
        { title: "Romance", color: "#ff4d6d", matches: ["Romance"], description: "Love stories, deep connections, and emotional relationships." },
        { title: "Thriller", color: "#8e44ad", matches: ["Thriller", "Espionage"], description: "High tension, twists, and edge-of-your-seat suspense." },
        { title: "Mystery", color: "#34495e", matches: ["Mystery", "Supernatural"], description: "Unsolved cases, hidden clues, and shocking revelations." },
        { title: "Fantasy", color: "#9b59b6", matches: ["Fantasy"], description: "Magical worlds, mythical creatures, and epic adventures." },
        { title: "Animation", color: "#f1c40f", matches: ["Anime"], types: ["Animation"], description: "Animated stories full of imagination for all ages." },
        { title: "Crime", color: "#7f8c8d", matches: ["Crime", "Legal"], description: "Dark investigations, criminal minds, and justice stories." },
        { title: "Documentary", color: "#16a085", matches: ["History", "Nature"], types: ["Documentary"], description: "Real stories, real people, real events from the world." },
        { title: "Family", color: "#27ae60", matches: ["Family", "Children"], description: "Fun, safe entertainment for all ages to enjoy together." },
        { title: "War", color: "#c0392b", matches: ["War"], description: "Battlefield stories and the human cost of conflict." },
        { title: "Western", color: "#d35400", matches: ["Western"], description: "Outlaws, cowboys, and life on the untamed frontier." }
    ];
})(window.MyFlix = window.MyFlix || {});
