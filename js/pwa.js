// ==========================
// INSTALLABLE APP (PWA)
// ==========================
// Registers the service worker (offline support) and shows an
// "Install app" button when the browser allows installing.
// Service workers only run on http(s) — e.g. GitHub Pages or Live Server —
// not when index.html is opened straight from disk.
(function (MyFlix) {
    let deferredPrompt = null;

    function init() {
        const btn = document.getElementById("install-btn");

        if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
            navigator.serviceWorker.register("sw.js").catch(err => console.warn("Service worker failed:", err));
        }

        // Chrome / Edge / Android fire this when the app can be installed.
        window.addEventListener("beforeinstallprompt", e => {
            e.preventDefault();
            deferredPrompt = e;
            btn.classList.remove("hidden");
        });

        btn.addEventListener("click", async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
            btn.classList.add("hidden");
        });

        window.addEventListener("appinstalled", () => {
            btn.classList.add("hidden");
            MyFlix.utils.toast("MYFLIX installed 🎉");
        });
    }

    MyFlix.pwa = { init };
})(window.MyFlix = window.MyFlix || {});
