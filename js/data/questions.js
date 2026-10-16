// ==========================
// GUESSING GAME QUESTIONS
// ==========================
// Answers are compared loosely (case, punctuation and a leading "the"
// are ignored), so write them however reads naturally.
(function (MyFlix) {
    MyFlix.questions = {
        movies: [
            { question: "This film follows a man who can manipulate dreams through multiple layers of reality.", answer: "Inception", hint: "Christopher Nolan directed it." },
            { question: "A South Korean thriller where a poor family infiltrates a wealthy household.", answer: "Parasite", hint: "Won Best Picture." },
            { question: "A group of superheroes attempts to reverse a universe-wide catastrophe.", answer: "Avengers: Endgame", hint: "Marvel." },
            { question: "A man survives alone on Mars using science and potatoes.", answer: "The Martian", hint: "Matt Damon stars." },
            { question: "A psychological thriller centered around a ballerina losing grip on reality.", answer: "Black Swan", hint: "Bird title." },
            { question: "A replicant-hunting officer uncovers a secret that could change society.", answer: "Blade Runner 2049", hint: "Ryan Gosling." },
            { question: "A young drummer is pushed to his limits by an abusive music instructor.", answer: "Whiplash", hint: "Jazz." },
            { question: "A lawyer defends a man accused of a crime in 1930s Alabama.", answer: "To Kill a Mockingbird", hint: "Based on a famous novel." }
        ],
        series: [
            { question: "A chemistry teacher begins producing illegal substances after a diagnosis.", answer: "Breaking Bad", hint: "Walter White." },
            { question: "Teenagers uncover a government conspiracy involving another dimension.", answer: "Stranger Things", hint: "The Upside Down." },
            { question: "A chess prodigy rises through the ranks while battling addiction.", answer: "The Queen's Gambit", hint: "Chess." },
            { question: "A heist drama involving red jumpsuits and masks.", answer: "Money Heist", hint: "Spanish series." },
            { question: "A wealthy family fights over control of a media empire.", answer: "Succession", hint: "Roy family." },
            { question: "Contestants compete in deadly games for a cash prize.", answer: "Squid Game", hint: "South Korea." },
            { question: "A fantasy series involving monster hunters and destiny.", answer: "The Witcher", hint: "Geralt." },
            { question: "An anthology series exploring technology's dark side.", answer: "Black Mirror", hint: "Every episode differs." }
        ]
    };
})(window.MyFlix = window.MyFlix || {});
