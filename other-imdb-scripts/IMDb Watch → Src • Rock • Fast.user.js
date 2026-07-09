// ==UserScript==
// @name         IMDb Watch → Src • Rock • Fast
// @namespace    https://www.imdb.com/
// @version      1.2
// @description  "Watch" button opens dropdown with colored Src/Rock/Fast. Perfectly aligned.
// @match        https://*.imdb.com/title/*
// @match        https://m.imdb.com/title/*
// @grant        none
// @downloadURL https://update.greasyfork.org/scripts/565477/IMDb%20Watch%20%E2%86%92%20Src%20%E2%80%A2%20Rock%20%E2%80%A2%20Fast.user.js
// @updateURL https://update.greasyfork.org/scripts/565477/IMDb%20Watch%20%E2%86%92%20Src%20%E2%80%A2%20Rock%20%E2%80%A2%20Fast.meta.js
// ==/UserScript==

(function () {
  "use strict";

  // === Player Config with UNIQUE COLORS ===
  const PLAYERS = {
    src: {
      name: "Src",
      color: "#125784",     // Original VidSrc
      textColor: "#bad8eb",
      movie: id => `https://vsembed.ru/embed/movie/${id}`,
      tv: (id, s, e) => `https://vsembed.ru/embed/tv/${id}?season=${s}&episode=${e}`
    },
    rock: {
      name: "Rock",
      color: "#ff6b35",     // Original VidRock
      textColor: "#fff",
      movie: id => `https://vidrock.net/movie/${id}`,
      tv: (id, s, e) => `https://vidrock.net/tv/${id}/${s}/${e}`
    },
    fast: {
      name: "Fast",
      color: "#6C63FF",     // Original VidFast
      textColor: "#fff",
      movie: id => `https://vidfast.pro/movie/${id}?sub=en`,
      tv: (id, s, e) => `https://vidfast.pro/tv/${id}/${s}/${e}?sub=en`
    }
  };

  function getImdbId() {
    return location.pathname.split("/").filter(Boolean)[1] || null;
  }

  function getSeasonFromUrl() {
    return parseInt(new URLSearchParams(location.search).get("season") || "1", 10);
  }

  function findEpisodeCards() {
    return document.querySelectorAll(".episode-item-wrapper, .list_item");
  }

  function parseEpisode(card, defSeason) {
    const txt = card.querySelector(".ipc-title__text, .image, .info, .hover-over-image")?.textContent || card.textContent;
    let m = txt.match(/S(\d+)\.E(\d+)/i);
    if (m) return { s: +m[1], e: +m[2] };
    m = txt.match(/Episode\s+(\d+)/i);
    if (m) return { s: defSeason, e: +m[1] };
    return { s: defSeason, e: Array.from(card.parentNode.children).indexOf(card) + 1 };
  }

  function createPlayerBtn(name, bgColor, textColor, url) {
    const btn = document.createElement("button");
    btn.textContent = name;
    Object.assign(btn.style, {
      display: "block",
      width: "100%",
      padding: "6px 10px",
      margin: "2px 0",
      background: bgColor,
      color: textColor,
      border: "none",
      borderRadius: "6px",
      fontWeight: "bold",
      fontSize: "13px",
      cursor: "pointer",
      textAlign: "center"
    });
    btn.onclick = e => {
      e.stopPropagation();
      window.open(url, "_blank");
    };
    return btn;
  }

  // === Per-Episode Dropdown ===
  function insertEpisodeButtons() {
    const imdbId = getImdbId();
    if (!imdbId) return;
    const season = getSeasonFromUrl();

    findEpisodeCards().forEach(card => {
      if (card.querySelector(".watch-ep-btn")) return;

      const ep = parseEpisode(card, season);
      if (!ep) return;

      if (getComputedStyle(card).position === "static")
        card.style.position = "relative";

      const watchBtn = document.createElement("button");
      watchBtn.className = "watch-ep-btn";
      watchBtn.textContent = "Watch";
      Object.assign(watchBtn.style, {
        position: "absolute",
        right: "8px",
        bottom: "8px",
        padding: "6px 12px",
        background: "#125784",
        color: "#bad8eb",
        border: "none",
        cursor: "pointer",
        fontWeight: "bold",
        borderRadius: "6px",
        fontSize: "13px",
        zIndex: 9999,
        opacity: 0.95
      });

      const dropdown = document.createElement("div");
      dropdown.style.cssText = `
        position: absolute;
        right: 8px;
        bottom: 50%;
        background: white;
        border: 1px solid #ccc;
        border-radius: 6px;
        padding: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        min-width: 80px;
        display: none;
        flex-direction: column;
        margin-bottom: 0;
      `;

      Object.keys(PLAYERS).forEach(key => {
        const p = PLAYERS[key];
        const url = p.tv(imdbId, ep.s, ep.e);
        dropdown.appendChild(createPlayerBtn(p.name, p.color, p.textColor, url));
      });

      watchBtn.onclick = e => {
        e.stopPropagation();
        e.preventDefault();
        dropdown.style.display = dropdown.style.display === "none" ? "flex" : "none";
      };

      const close = ev => {
        if (!card.contains(ev.target)) {
          dropdown.style.display = "none";
          document.removeEventListener("click", close);
        }
      };
      watchBtn.addEventListener("click", () => {
        setTimeout(() => document.addEventListener("click", close), 0);
      });

      card.appendChild(dropdown);
      card.appendChild(watchBtn);
    });
  }

  // === Style Episode Guide ===
  function styleEpisodeGuide() {
    const guideLink = document.querySelector('a[href*="/episodes"]');
    if (!guideLink || guideLink.dataset.styled) return;

    guideLink.textContent = "Episode guide (Watch)";
    Object.assign(guideLink.style, {
      display: "inline-block",
      padding: "8px 12px",
      marginLeft: "4px",
      marginRight: "6px",
      background: "#125784",
      color: "#bad8eb",
      border: "none",
      cursor: "pointer",
      fontWeight: "bold",
      borderRadius: "6px",
      textDecoration: "none"
    });
    guideLink.dataset.styled = "true";
  }

  // === Floating Movie Button ===
  function addMainButton() {
    if (document.getElementById("watch-main-btn")) return;

    const imdbId = getImdbId();
    if (!imdbId) return;

    const isMovie = !document.title.includes("TV Series") && !document.title.includes("TV Mini Series") && !document.title.includes("Episode");

    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      z-index: 10001;
      font-family: Arial;
    `;

    const watchBtn = document.createElement("button");
    watchBtn.id = "watch-main-btn";
    watchBtn.textContent = "Watch";
    Object.assign(watchBtn.style, {
      padding: "10px 14px",
      background: "#125784",
      color: "#bad8eb",
      border: "none",
      borderRadius: "6px",
      fontWeight: "bold",
      cursor: "pointer",
      filter: "drop-shadow(0 10px 8px rgba(0,0,0,0.2))"
    });

    const dropdown = document.createElement("div");
    dropdown.style.cssText = `
      position: absolute;
      right: 0;
      bottom: 100%;
      background: white;
      border: 1px solid #ccc;
      border-radius: 6px;
      padding: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      min-width: 80px;
      display: none;
      flex-direction: column;
      margin-bottom: 0;
    `;

    Object.keys(PLAYERS).forEach(key => {
      const p = PLAYERS[key];
      const url = isMovie ? p.movie(imdbId) : p.tv(imdbId, 1, 1);
      dropdown.appendChild(createPlayerBtn(p.name, p.color, p.textColor, url));
    });

    watchBtn.onclick = e => {
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === "none" ? "flex" : "none";
    };

    const close = ev => {
      if (!container.contains(ev.target)) {
        dropdown.style.display = "none";
        document.removeEventListener("click", close);
      }
    };
    watchBtn.addEventListener("click", () => {
      setTimeout(() => document.addEventListener("click", close), 0);
    });

    container.appendChild(dropdown);
    container.appendChild(watchBtn);
    document.body.appendChild(container);
  }

  // === Init ===
  function init() {
    const isEpisodes = location.pathname.includes("/episodes");
    const isTvSeries = document.title.includes("TV Series") || document.title.includes("TV Mini Series");

    if (isEpisodes) {
      insertEpisodeButtons();
      const mo = new MutationObserver(() => insertEpisodeButtons());
      mo.observe(document.body, { childList: true, subtree: true });
    } else if (isTvSeries) {
      styleEpisodeGuide();
    } else {
      addMainButton();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();