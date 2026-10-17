// ==========================
// NETFLIX IMPORT (your own data download, no password)
// ==========================
// Netflix has no public API (it closed in 2014), so MYFLIX can't log in to
// an account. Instead members import the data Netflix lets them download:
//
//   1. Quick:  Account → Profile → Viewing activity → "Download all"
//              → NetflixViewingHistory.csv   (columns: Title, Date)
//   2. Full:   Account → "Download your personal information"
//              → a .zip with CONTENT_INTERACTION/ViewingActivity.csv,
//                MyList.csv and Ratings.csv (all profiles)
//
// Everything is read in the browser and saved only in this browser.
(function (MyFlix) {
    const { storage, cached } = MyFlix.utils;
    const KEY = "myflixNetflix";

    // ---------- tiny ZIP reader (no library) ----------
    // Supports stored (0) and deflate (8) entries via DecompressionStream.
    async function unzip(file, wanted) {
        const buf = new Uint8Array(await file.arrayBuffer());
        const view = new DataView(buf.buffer);
        let eocd = -1;
        for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) {
            if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
        }
        if (eocd < 0) throw new Error("That doesn't look like a zip file.");
        const count = view.getUint16(eocd + 10, true);
        let ptr = view.getUint32(eocd + 16, true);
        const out = {};
        const decoder = new TextDecoder("utf-8");
        for (let n = 0; n < count; n++) {
            if (view.getUint32(ptr, true) !== 0x02014b50) break;
            const method = view.getUint16(ptr + 10, true);
            const compSize = view.getUint32(ptr + 20, true);
            const nameLen = view.getUint16(ptr + 28, true);
            const extraLen = view.getUint16(ptr + 30, true);
            const commentLen = view.getUint16(ptr + 32, true);
            const localOffset = view.getUint32(ptr + 42, true);
            const name = decoder.decode(buf.subarray(ptr + 46, ptr + 46 + nameLen));
            ptr += 46 + nameLen + extraLen + commentLen;

            const base = name.split("/").pop();
            if (!wanted.includes(base)) continue;
            const lNameLen = view.getUint16(localOffset + 26, true);
            const lExtraLen = view.getUint16(localOffset + 28, true);
            const start = localOffset + 30 + lNameLen + lExtraLen;
            const data = buf.subarray(start, start + compSize);
            let bytes;
            if (method === 0) bytes = data;
            else if (method === 8) {
                if (!("DecompressionStream" in window)) throw new Error("Your browser can't open zip files. Unzip it first and upload the CSV files instead.");
                const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
                bytes = new Uint8Array(await new Response(stream).arrayBuffer());
            } else continue;
            // Prefer the CONTENT_INTERACTION copy if a name appears twice.
            if (!out[base] || /CONTENT_INTERACTION/i.test(name)) out[base] = decoder.decode(bytes);
        }
        return out;
    }

    // ---------- CSV ----------
    function parseCsv(text) {
        const rows = [];
        let row = [], field = "", quoted = false;
        text = text.replace(/^﻿/, "");
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (quoted) {
                if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
                else if (c === '"') quoted = false;
                else field += c;
            } else if (c === '"') quoted = true;
            else if (c === ",") { row.push(field); field = ""; }
            else if (c === "\n" || c === "\r") {
                if (c === "\r" && text[i + 1] === "\n") i++;
                row.push(field); field = "";
                if (row.length > 1 || row[0] !== "") rows.push(row);
                row = [];
            } else field += c;
        }
        if (field !== "" || row.length) { row.push(field); rows.push(row); }
        if (!rows.length) return [];
        const head = rows.shift().map(h => h.trim());
        return rows.map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
    }

    // ---------- dates & durations ----------
    // Quick download uses the account's date format (e.g. 10/15/26 or 15/10/2026).
    function dateParser(samples) {
        let dayFirst = null;
        for (const s of samples) {
            const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
            if (!m) continue;
            if (+m[1] > 12) { dayFirst = true; break; }
            if (+m[2] > 12) { dayFirst = false; break; }
        }
        if (dayFirst === null) dayFirst = !/^en-US/i.test(navigator.language || "");
        return s => {
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) return Date.parse(s.replace(" ", "T") + (s.length > 10 ? "Z" : ""));
            const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
            if (!m) return Date.parse(s) || 0;
            const [d, mo] = dayFirst ? [+m[1], +m[2]] : [+m[2], +m[1]];
            const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
            return Date.UTC(y, mo - 1, d, 12);
        };
    }
    const toMinutes = hms => {
        const p = String(hms || "").split(":").map(Number);
        return p.length === 3 ? p[0] * 60 + p[1] + p[2] / 60 : 0;
    };

    // ---------- titles ----------
    // "Stranger Things: Season 4: Chapter One: The Hellfire Club"
    //   -> { show: "Stranger Things", episode: "Season 4: Chapter One: …" }
    const SERIES_MARK = /:\s*(Season|Series|Part|Volume|Vol\.|Book|Collection|Chapter|Limited Series|Miniseries|Episode)\b/i;
    function splitTitle(title, prefixCounts) {
        const m = title.match(SERIES_MARK);
        if (m) return { show: title.slice(0, m.index).trim(), episode: title.slice(m.index + 1).trim() };
        // "Show: Episode name" when the same prefix appears for many rows
        const i = title.indexOf(": ");
        if (i > 0) {
            const prefix = title.slice(0, i);
            if ((prefixCounts.get(prefix) || 0) >= 3) return { show: prefix, episode: title.slice(i + 2).trim() };
        }
        return { show: null, episode: null };
    }

    const slug = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // ---------- build the summary from raw rows ----------
    // views: [{ title, at, minutes?, bookmark?, latest? }]
    function summarise(views, myListRows, ratingRows) {
        const prefixCounts = new Map();
        views.forEach(v => {
            const i = v.title.indexOf(": ");
            if (i > 0) prefixCounts.set(v.title.slice(0, i), (prefixCounts.get(v.title.slice(0, i)) || 0) + 1);
        });

        const titles = new Map(); // slug -> entry
        for (const v of views) {
            const { show, episode } = splitTitle(v.title, prefixCounts);
            const name = show || v.title;
            const id = slug(name);
            const e = titles.get(id) || { id, name, type: show ? "series" : "movie", views: 0, minutes: 0, firstAt: v.at, lastAt: 0, lastEpisode: null, bookmark: 0, episodes: new Set() };
            e.views++;
            e.minutes += v.minutes || 0;
            e.firstAt = Math.min(e.firstAt, v.at);
            if (episode) e.episodes.add(episode);
            if (v.at >= e.lastAt) {
                e.lastAt = v.at;
                e.lastEpisode = episode;
                e.bookmark = v.bookmark || 0;
            }
            titles.set(id, e);
        }

        // Ratings: thumbs up / two thumbs up / stars ≥ 4 mark a favourite.
        const ratings = new Map();
        for (const r of ratingRows) {
            const thumbs = +r["Thumbs Value"] || 0;
            const stars = +r["Star Value"] || 0;
            const score = thumbs ? { 1: 1, 2: 4, 3: 5 }[thumbs] || 0 : stars;
            if (score) ratings.set(slug(r["Title Name"] || ""), score);
        }

        const myList = myListRows.map(r => ({
            id: slug(r["Title Name"] || r.Title || ""),
            name: r["Title Name"] || r.Title || "",
            addedAt: Date.parse((r["Utc Title Add Date"] || "").replace(" ", "T")) || 0
        })).filter(x => x.name);

        const now = Date.now();
        const all = [...titles.values()].map(e => {
            // Finished? Movies: watched ≥ 70 min in total or bookmark ≥ 75 min.
            const finishedMovie = e.type === "movie" && (e.minutes >= 70 || e.bookmark >= 75);
            return {
                id: e.id, name: e.name, type: e.type, views: e.views,
                minutes: Math.round(e.minutes), firstAt: e.firstAt, lastAt: e.lastAt,
                lastEpisode: e.lastEpisode, episodes: e.episodes.size,
                bookmark: Math.round(e.bookmark),
                finished: e.type === "movie" ? finishedMovie : false,
                rating: ratings.get(e.id) || 0
            };
        }).sort((a, b) => b.lastAt - a.lastAt);

        // Continue watching: series watched in the last 120 days, plus
        // movies started recently but not finished (needs bookmark data).
        const hasBookmarks = views.some(v => v.bookmark);
        const continueWatching = all.filter(t =>
            now - t.lastAt < 120 * 864e5 &&
            (t.type === "series" || (hasBookmarks && !t.finished && t.bookmark > 3))
        ).slice(0, 20);

        return { titles: all, continueWatching: continueWatching.map(t => t.id), myList, hasBookmarks };
    }

    // ---------- reading the files the member picked ----------
    async function readFiles(files) {
        const texts = {};
        for (const f of files) {
            if (/\.zip$/i.test(f.name)) Object.assign(texts, await unzip(f, ["ViewingActivity.csv", "MyList.csv", "Ratings.csv"]));
            else if (/\.csv$/i.test(f.name)) texts[f.name.split("/").pop()] = await f.text();
        }

        let viewRows = [], quick = false;
        const viewing = texts["ViewingActivity.csv"];
        if (viewing) viewRows = parseCsv(viewing);
        // The quick download can be renamed; detect it by its columns.
        const quickText = Object.entries(texts).find(([name, t]) => name !== "ViewingActivity.csv" && /^﻿?"?Title"?,"?Date"?/i.test(t.trim()));
        if (!viewRows.length && quickText) { viewRows = parseCsv(quickText[1]); quick = true; }

        const myListRows = texts["MyList.csv"] ? parseCsv(texts["MyList.csv"]) : [];
        const ratingRows = texts["Ratings.csv"] ? parseCsv(texts["Ratings.csv"]) : [];
        if (!viewRows.length && !myListRows.length) {
            throw new Error("No Netflix data found. Choose NetflixViewingHistory.csv, or the .zip from “Download your personal information”.");
        }
        const profiles = [...new Set([...viewRows, ...myListRows, ...ratingRows].map(r => r["Profile Name"]).filter(Boolean))];
        return { viewRows, myListRows, ratingRows, quick, profiles };
    }

    // Turn raw rows for one profile into the saved summary.
    function build(raw, profile) {
        const mine = r => !profile || !r["Profile Name"] || r["Profile Name"] === profile;
        let views;
        if (raw.quick) {
            const parseDate = dateParser(raw.viewRows.slice(0, 200).map(r => r.Date));
            views = raw.viewRows.map(r => ({ title: r.Title, at: parseDate(r.Date) })).filter(v => v.title);
        } else {
            views = raw.viewRows
                .filter(mine)
                .filter(r => !r["Supplemental Video Type"])        // skip trailers, previews, recaps
                .map(r => ({
                    title: r.Title,
                    at: Date.parse((r["Start Time"] || "").replace(" ", "T") + "Z") || 0,
                    minutes: toMinutes(r.Duration),
                    bookmark: toMinutes(r.Bookmark)
                }))
                .filter(v => v.title && v.minutes >= 1);
        }
        const s = summarise(views, raw.myListRows.filter(mine), raw.ratingRows.filter(mine));
        return { ...s, profile: profile || null, importedAt: Date.now(), source: raw.quick ? "quick" : "full" };
    }

    // ---------- matching titles to TVMaze / TMDB ----------
    let chain = Promise.resolve();
    const queued = fn => {
        const run = chain.then(fn);
        chain = run.catch(() => {}).then(() => new Promise(r => setTimeout(r, 260))); // TVMaze allows ~20 calls / 10s
        return run;
    };

    function match(entry) {
        return cached(`nfmatch:${entry.type}:${entry.id}`, 60, () => queued(async () => {
            if (entry.type === "series" || !MyFlix.tmdb.enabled()) {
                try {
                    const show = await MyFlix.tvmaze.singleSearch(entry.name);
                    if (show && (entry.type === "series" || slug(show.name) === entry.id)) return { kind: "tv", id: show.id };
                } catch { /* fall through */ }
            }
            if (MyFlix.tmdb.enabled()) {
                const hits = await MyFlix.tmdb.search(entry.name).catch(() => []);
                const exact = hits.find(h => slug(h.title || h.name || "") === entry.id) || hits[0];
                if (exact) return { kind: exact.media_type === "movie" ? "movie" : "tmdbtv", id: exact.id, raw: { ...exact } };
            }
            return null;
        }));
    }

    // MYFLIX title for a Netflix entry (matched art if possible).
    async function titleFor(entry) {
        let m = null;
        try { m = await match(entry); } catch { /* offline */ }
        let t = null;
        if (m?.kind === "tv") {
            try { t = MyFlix.models.fromTvmaze(await MyFlix.tvmaze.show(m.id)); } catch { /* fall back */ }
        } else if (m?.raw) t = MyFlix.models.fromTmdb(m.raw, m.kind === "movie" ? "movie" : "tv");
        if (!t) t = { key: `netflix:${entry.id}`, kind: "netflix", id: entry.id, name: entry.name, year: null, genres: [], overview: "" };
        t.netflix = { url: watchUrl(entry.name), lastEpisode: entry.lastEpisode, lastAt: entry.lastAt, type: entry.type };
        return t;
    }

    const watchUrl = name => `https://www.netflix.com/search?q=${encodeURIComponent(name)}`;

    // ---------- saved data ----------
    const data = () => storage.read(KEY, null);
    const connected = () => Boolean(data());
    function save(summary) {
        storage.write(KEY, summary);
        MyFlix.store.emit("netflix");
    }
    function disconnect() {
        storage.remove(KEY);
        MyFlix.store.emit("netflix");
    }
    function find(name) {
        const d = data();
        if (!d || !name) return null;
        const id = slug(name);
        return d.titles.find(t => t.id === id) || d.myList.find(t => t.id === id) || null;
    }

    // Rows for Home / My List (resolved lazily so art loads as you scroll).
    const rowLoaders = {
        continueWatching: () => {
            const d = data();
            if (!d) return Promise.resolve([]);
            const byId = new Map(d.titles.map(t => [t.id, t]));
            return Promise.all(d.continueWatching.map(id => titleFor(byId.get(id))));
        },
        myList: () => {
            const d = data();
            if (!d) return Promise.resolve([]);
            return Promise.all(d.myList.slice().sort((a, b) => b.addedAt - a.addedAt).slice(0, 30).map(x => titleFor({ ...x, type: "unknown" })));
        },
        recent: () => {
            const d = data();
            if (!d) return Promise.resolve([]);
            return Promise.all(d.titles.slice(0, 30).map(titleFor));
        },
        favourites: () => {
            const d = data();
            if (!d) return Promise.resolve([]);
            return Promise.all(d.titles.filter(t => t.rating >= 4).slice(0, 30).map(titleFor));
        }
    };

    function stats() {
        const d = data();
        if (!d) return null;
        return {
            titles: d.titles.length,
            series: d.titles.filter(t => t.type === "series").length,
            movies: d.titles.filter(t => t.type === "movie").length,
            hours: Math.round(d.titles.reduce((s, t) => s + t.minutes, 0) / 60),
            myList: d.myList.length,
            since: Math.min(...d.titles.map(t => t.firstAt).filter(Boolean))
        };
    }

    MyFlix.netflix = { readFiles, build, save, data, connected, disconnect, find, titleFor, rows: rowLoaders, stats, watchUrl, slug, parseCsv, unzip, summarise };
})(window.MyFlix = window.MyFlix || {});
