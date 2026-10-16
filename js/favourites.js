// ==========================
// MY LIST (FAVOURITES)
// ==========================
(function (MyFlix) {
    const { storage } = MyFlix.utils;
    const { createMovieCard, setRowMessage } = MyFlix.cards;
    const STORAGE_KEY = "favouriteMovies";

    let favourites = storage.read(STORAGE_KEY, []);
    if (!Array.isArray(favourites)) favourites = [];

    const listeners = [];
    let listEl;

    // Only keep the fields we display, so localStorage stays small.
    function slim(show) {
        return {
            id: show.id,
            name: show.name,
            premiered: show.premiered || null,
            genres: show.genres || [],
            image: show.image ? { medium: show.image.medium } : null
        };
    }

    function has(id) {
        return favourites.some(f => f.id === id);
    }

    function add(show) {
        if (has(show.id)) return;
        favourites.push(slim(show));
        sync();
    }

    function remove(id) {
        favourites = favourites.filter(f => f.id !== id);
        sync();
    }

    // Other modules (search results) can react when the list changes.
    function onChange(fn) {
        listeners.push(fn);
    }

    function sync() {
        storage.write(STORAGE_KEY, favourites);
        render();
        listeners.forEach(fn => fn());
    }

    function render() {
        listEl.innerHTML = "";

        if (!favourites.length) {
            setRowMessage(listEl, "Your list is empty. Search for a show and press Save to add it here.");
            return;
        }

        favourites.forEach(show => {
            listEl.appendChild(createMovieCard(show, {
                label: "Remove",
                className: "remove-btn",
                onClick: () => remove(show.id)
            }));
        });
    }

    function init() {
        listEl = document.getElementById("favourites-list");
        render();
    }

    MyFlix.favourites = { init, add, remove, has, onChange };
})(window.MyFlix = window.MyFlix || {});
