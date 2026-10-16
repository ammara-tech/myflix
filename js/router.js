// ==========================
// ROUTER (#/ pages) + NAVIGATION
// ==========================
// Pages: #/  #/tv  #/movies  #/classics  #/my-list  #/games  #/stats
//        #/search?q=…  #/party/CODE
(function (MyFlix) {
    const { debounce } = MyFlix.utils;
    let view, currentRoute = null, renderToken = 0;

    function parse() {
        const hash = location.hash.replace(/^#\/?/, "");
        const [path, query = ""] = hash.split("?");
        const [name, arg] = path.split("/");
        return { name: name || "home", arg, params: new URLSearchParams(query) };
    }

    function go(path) {
        if (location.hash === `#/${path}`) refresh();
        else location.hash = `/${path}`;
    }

    async function render() {
        const route = parse();
        const pages = MyFlix.pages;

        if (route.name === "party") {
            MyFlix.party.joinFromLink(route.arg);
            history.replaceState(null, "", "#/classics");
            route.name = "classics";
        }

        const page = pages[route.name] || pages.home;
        const token = ++renderToken;
        currentRoute = route;
        view.innerHTML = "";
        view.className = `view view--${route.name}`;
        window.scrollTo({ top: 0 });
        MyFlix.nav.setActive(route.name);
        document.title = `${page.title ? page.title + " – " : ""}MYFLIX`;
        try {
            await page.render(view, route, () => token === renderToken);
        } catch (err) {
            console.error(err);
            view.innerHTML = `<p class="row-empty row-empty--error page-error">Something went wrong loading this page.</p>`;
        }
        // Move focus to the new page for screen readers, but don't steal it from the search box.
        if (!document.activeElement?.closest("input, textarea, select")) view.focus({ preventScroll: true });
    }

    const refresh = () => render();

    // ---------- nav ----------
    const nav = {
        setActive(name) {
            document.querySelectorAll("[data-route]").forEach(a => {
                const on = a.dataset.route === name;
                a.classList.toggle("active", on);
                if (on) a.setAttribute("aria-current", "page");
                else a.removeAttribute("aria-current");
            });
        },
        closeMenus() {
            document.querySelectorAll(".menu.open").forEach(m => m.classList.remove("open"));
            document.querySelectorAll("[aria-expanded='true']").forEach(b => b.setAttribute("aria-expanded", "false"));
        },
        init() {
            const header = document.querySelector(".nav");
            const onScroll = () => header.classList.toggle("nav--solid", window.scrollY > 10);
            window.addEventListener("scroll", onScroll, { passive: true });
            onScroll();

            // Search box that expands like Netflix's
            const box = document.querySelector(".search-box");
            const input = box.querySelector("input");
            box.querySelector(".search-toggle").addEventListener("click", () => {
                box.classList.add("open");
                input.focus();
            });
            input.addEventListener("blur", () => { if (!input.value) box.classList.remove("open"); });
            input.addEventListener("keydown", e => {
                if (e.key === "Escape") { input.value = ""; input.blur(); box.classList.remove("open"); }
            });
            const searchGo = debounce(() => {
                const q = input.value.trim();
                if (q) {
                    const target = `#/search?q=${encodeURIComponent(q)}`;
                    if (location.hash !== target) location.hash = target;
                } else if (parse().name === "search") go("");
            }, 350);
            input.addEventListener("input", searchGo);
            box.addEventListener("submit", e => e.preventDefault());

            // Dropdown menus (bell, profile)
            document.querySelectorAll("[data-menu]").forEach(btn => {
                const menu = document.getElementById(btn.dataset.menu);
                btn.addEventListener("click", e => {
                    e.stopPropagation();
                    const open = !menu.classList.contains("open");
                    nav.closeMenus();
                    menu.classList.toggle("open", open);
                    btn.setAttribute("aria-expanded", String(open));
                });
            });
            document.addEventListener("click", e => {
                if (!e.target.closest(".menu")) nav.closeMenus();
            });
            document.addEventListener("keydown", e => { if (e.key === "Escape") nav.closeMenus(); });

            // Profile menu actions
            document.getElementById("profile-menu").addEventListener("click", e => {
                const b = e.target.closest("[data-act]");
                if (!b) return;
                nav.closeMenus();
                ({
                    settings: () => MyFlix.settings.open(),
                    theme: () => MyFlix.theme.toggle(),
                    party: () => MyFlix.party.joinFromLink(""),
                    install: () => MyFlix.pwa.install()
                })[b.dataset.act]?.();
            });
            document.querySelectorAll("[data-act='mood']").forEach(b => b.addEventListener("click", () => MyFlix.mood.open()));

            const updateAvatar = () => {
                const n = MyFlix.store.getSetting("name");
                document.querySelectorAll(".avatar-initial").forEach(a => { a.textContent = n ? n.charAt(0).toUpperCase() : ""; });
            };
            updateAvatar();
            MyFlix.store.onChange(w => w === "settings" && updateAvatar());
        }
    };

    function init() {
        view = document.getElementById("view");
        nav.init();
        window.addEventListener("hashchange", render);
        render();
    }

    MyFlix.nav = nav;
    MyFlix.router = { init, go, refresh, current: () => currentRoute };
    MyFlix.pages = MyFlix.pages || {};
})(window.MyFlix = window.MyFlix || {});
