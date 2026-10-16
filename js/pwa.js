// ==========================
// INSTALLABLE APP (PWA)
// ==========================
// Registers the service worker (offline support) and enables "Install app"
// when the browser allows it. Service workers only run on http(s) — e.g.
// GitHub Pages or Live Server — not when index.html is opened from disk.
(function (MyFlix) {
    let deferredPrompt = null;

    function setInstallVisible(on) {
        document.querySelectorAll("[data-act='install']").forEach(b => b.classList.toggle("hidden", !on));
    }

    async function install() {
        if (!deferredPrompt) {
            MyFlix.utils.toast(/iphone|ipad/i.test(navigator.userAgent) ? "On iPhone: Share → Add to Home Screen" : "Use your browser menu → Install MYFLIX", "download");
            return;
        }
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        setInstallVisible(false);
    }

    function init() {
        setInstallVisible(false);
        if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
            navigator.serviceWorker.register("sw.js").catch(err => console.warn("Service worker failed:", err));
        }
        window.addEventListener("beforeinstallprompt", e => {
            e.preventDefault();
            deferredPrompt = e;
            setInstallVisible(true);
        });
        window.addEventListener("appinstalled", () => {
            setInstallVisible(false);
            MyFlix.utils.toast("MYFLIX installed", "circle-check");
        });
    }

    MyFlix.pwa = { init, install };
})(window.MyFlix = window.MyFlix || {});
