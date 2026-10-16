// ==========================
// LOCAL DATA STORE
// ==========================
// Everything the user saves lives in this browser's localStorage:
//   myflixList      My List items (want / watched + star rating)
//   myflixEpisodes  watched episodes per TV show (episode tracker)
//   myflixProgress  where you stopped in each Classic film
//   myflixHistory   what you watched and for how long (Stats page)
//   myflixSettings  API keys, region, profile name
(function (MyFlix) {
    const { storage } = MyFlix.utils;
    const K = {
        list: "myflixList",
        oldList: "favouriteMovies",
        episodes: "myflixEpisodes",
        progress: "myflixProgress",
        history: "myflixHistory",
        settings: "myflixSettings"
    };

    const listeners = new Set();
    function emit(what) {
        listeners.forEach(fn => {
            try { fn(what); } catch (err) { console.error(err); }
        });
    }
    function onChange(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    }

    // ---------- settings ----------
    let settings = storage.read(K.settings, {});
    if (typeof settings !== "object" || !settings) settings = {};

    function getSetting(name) {
        if (settings[name]) return settings[name];
        const cfg = MyFlix.config || {};
        return { tmdbKey: cfg.tmdbApiKey, omdbKey: cfg.omdbApiKey, traktKey: cfg.traktClientId, fanartKey: cfg.fanartApiKey, region: cfg.defaultRegion, name: "" }[name] || "";
    }
    function setSetting(name, value) {
        settings[name] = typeof value === "string" ? value.trim() : value;
        storage.write(K.settings, settings);
        emit("settings");
    }

    // ---------- My List ----------
    function loadList() {
        let list = storage.read(K.list, null);
        if (!Array.isArray(list)) {
            // Migrate from older versions (TVMaze shows saved as "favouriteMovies").
            const old = storage.read(K.oldList, []);
            list = (Array.isArray(old) ? old : [])
                .filter(s => s && s.id != null)
                .map(s => ({
                    key: `tv:${s.id}`, kind: "tv", id: s.id, name: s.name,
                    year: s.premiered ? +s.premiered.slice(0, 4) : null,
                    poster: s.image?.medium || null, backdrop: null,
                    genres: s.genres || [], rating: s.rating?.average || null, runtime: null,
                    status: s.status === "watched" ? "watched" : "want",
                    myRating: s.myRating || 0, addedAt: s.addedAt || Date.now()
                }));
            storage.write(K.list, list);
        }
        return list;
    }
    let list = loadList();

    // Only keep the fields we display.
    function slim(t) {
        return {
            key: t.key, kind: t.kind, id: t.id, name: t.name, year: t.year || null,
            poster: t.poster || null, backdrop: t.backdrop || null, genres: t.genres || [],
            rating: t.rating || null, runtime: t.runtime || null
        };
    }

    const listApi = {
        all: () => list.slice(),
        get: key => list.find(i => i.key === key) || null,
        has: key => list.some(i => i.key === key),
        add(title, status = "want") {
            const existing = listApi.get(title.key);
            if (existing) return listApi.setStatus(title.key, status);
            list.push({ ...slim(title), status, myRating: 0, addedAt: Date.now() });
            if (status === "watched") logWatch(title, title.runtime || 0);
            save(`Added to ${status === "watched" ? "Watched" : "My List"}`);
        },
        remove(key) {
            list = list.filter(i => i.key !== key);
            save("Removed from My List", "x");
        },
        toggle(title) {
            if (listApi.has(title.key)) listApi.remove(title.key);
            else listApi.add(title);
        },
        setStatus(key, status) {
            const item = listApi.get(key);
            if (!item || item.status === status) return;
            item.status = status;
            if (status === "watched") {
                item.watchedAt = Date.now();
                logWatch(item, item.runtime || 0);
            }
            save(status === "watched" ? "Marked as watched" : "Moved to My List");
        },
        rate(key, stars) {
            const item = listApi.get(key);
            if (!item) return;
            item.myRating = item.myRating === stars ? 0 : stars;
            save(null);
        }
    };

    function save(message, icon) {
        storage.write(K.list, list);
        if (message) MyFlix.utils.toast(message, icon);
        emit("list");
    }

    // ---------- episode tracker ----------
    // { [showId]: { name, poster, watched: [episodeId, ...], minutes: {episodeId: runtime} } }
    let episodes = storage.read(K.episodes, {});
    if (typeof episodes !== "object" || !episodes) episodes = {};

    const episodeApi = {
        shows: () => Object.entries(episodes).map(([id, v]) => ({ id: +id, ...v })),
        isWatched: (showId, epId) => Boolean(episodes[showId]?.watched.includes(epId)),
        count: showId => episodes[showId]?.watched.length || 0,
        setWatched(show, episode, watched) {
            const entry = episodes[show.id] ||= { name: show.name, poster: show.poster || null, genres: show.genres || [], watched: [], minutes: {} };
            const has = entry.watched.includes(episode.id);
            if (watched && !has) {
                entry.watched.push(episode.id);
                entry.minutes[episode.id] = episode.runtime || 0;
                entry.lastAt = Date.now();
                logWatch({ key: `tv:${show.id}`, kind: "tv", name: show.name, genres: show.genres }, episode.runtime || 0, "episode");
            } else if (!watched && has) {
                entry.watched = entry.watched.filter(id => id !== episode.id);
                delete entry.minutes[episode.id];
            }
            storage.write(K.episodes, episodes);
            emit("episodes");
        },
        setMany(show, eps, watched) {
            eps.forEach(ep => {
                const entry = episodes[show.id];
                const has = entry?.watched.includes(ep.id);
                if (watched !== Boolean(has)) episodeApi.setWatched(show, ep, watched);
            });
        },
        unfollow(showId) {
            delete episodes[showId];
            storage.write(K.episodes, episodes);
            emit("episodes");
        }
    };

    // ---------- classic film progress ----------
    let progress = storage.read(K.progress, {});
    if (typeof progress !== "object" || !progress) progress = {};
    const progressApi = {
        get: id => progress[id] || null,
        all: () => Object.entries(progress).map(([id, p]) => ({ id, ...p })),
        set(id, time, duration) {
            if (!duration) return;
            // Finished (last 3%)? Clear it so it doesn't sit in Continue Watching.
            if (time / duration > 0.97) delete progress[id];
            else progress[id] = { time, duration, updatedAt: Date.now() };
            storage.write(K.progress, progress);
        },
        clear(id) {
            delete progress[id];
            storage.write(K.progress, progress);
            emit("progress");
        }
    };

    // ---------- watch history (for Stats) ----------
    let history = storage.read(K.history, []);
    if (!Array.isArray(history)) history = [];

    function logWatch(title, minutes, type = title.kind) {
        history.push({
            key: title.key, kind: title.kind, type, name: title.name,
            genres: title.genres || [], minutes: Math.round(minutes || 0), at: Date.now()
        });
        if (history.length > 2000) history = history.slice(-2000);
        storage.write(K.history, history);
        emit("history");
    }

    // The player calls this as you watch a Classic (minutes actually watched).
    function addWatchTime(title, minutes) {
        const last = history[history.length - 1];
        if (last && last.key === title.key && last.type === "play" && Date.now() - last.at < 6 * 3600e3) {
            last.minutes += minutes;
            last.at = Date.now();
        } else {
            history.push({ key: title.key, kind: title.kind, type: "play", name: title.name, genres: title.genres || [], minutes, at: Date.now() });
        }
        storage.write(K.history, history);
    }

    function resetAll() {
        Object.values(K).forEach(k => storage.remove(k));
        ["myflixHighScores", "myflixCache"].forEach(k => storage.remove(k));
        location.reload();
    }

    MyFlix.store = {
        onChange, emit, getSetting, setSetting, resetAll,
        list: listApi, episodes: episodeApi, progress: progressApi,
        history: () => history.slice(), logWatch, addWatchTime
    };
})(window.MyFlix = window.MyFlix || {});
