// ==UserScript==
// @name         IMDb Watch, Download & Subtitles
// @namespace    https://www.imdb.com/
// @version      3.0.fork
// @description  Watch, Download and Subtitle buttons on IMDb title pages.
// @author       https://greasyfork.org/en/users/1083784-mrrobot, Myst1cX (fork)
// @license      MIT
// @match        *://*.imdb.com/title/*
// @grant        GM_xmlhttpRequest
// @connect      www.themoviedb.org
// @connect      sub.wyzie.io
// @homepageURL  https://github.com/Myst1cX/IMDb-Watch-Download-Subtitles
// @supportURL   https://github.com/Myst1cX/IMDb-Watch-Download-Subtitles/issues
// @updateURL    https://raw.githubusercontent.com/Myst1cX/IMDb-Watch-Download-Subtitles/main/IMDb-Watch-Download-Subtitles.user.js
// @downloadURL  https://raw.githubusercontent.com/Myst1cX/IMDb-Watch-Download-Subtitles/main/IMDb-Watch-Download-Subtitles.user.js
// ==/UserScript==

// THIS USERSCRIPT IS NO LONGER AVAILABLE ON GREASYFORK - I REUPLOADED IT HERE AND REDIRECTED THE RAW URLS TO THIS GITHUB REPO. THE ORIGINAL AUTHOR IS CREDITED IN THE METADATA.
// ORIGINAL LINK: https://greasyfork.org/en/scripts/569920-imdb-watch-download-subtitles/versions

(function () {
  'use strict';
  function getImdbId() {
    return location.pathname.split('/').filter(Boolean)[1] || null;
  }
  function getSeasonFromUrl() {
    return parseInt(new URLSearchParams(location.search).get('season') || '1', 10);
  }
  function getTitleText() {
    return document.querySelector('title')?.textContent || '';
  }
  function getCleanTitle() {
    let title = getTitleText();
    title = title
      .replace(/- IMDb/i, '')
      .replace(/- Episode list/i, '')
      .replace(/- Episodes/i, '')
      .replace(/Episodes/i, '')
      .replace(/TV Series/i, '')
      .replace(/TV Mini Series/i, '')
      .trim();
    title = title.replace(/\s+\(/g, '(').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
    return title.replace(/[\\/:*?"<>|]/g, '');
  }
  function parseEpisode(card, defSeason) {
    const txt = card.querySelector('.ipc-title__text, .image, .info, .hover-over-image')?.textContent
      || card.textContent;
    let m = txt.match(/S(\d+)\.E(\d+)/i);
    if (m) return { s: +m[1], e: +m[2] };
    m = txt.match(/Episode\s+(\d+)/i);
    if (m) return { s: defSeason, e: +m[1] };
    return { s: defSeason, e: Array.from(card.parentNode.children).indexOf(card) + 1 };
  }
  const tmdbCache = new Map();
  function getTmdbInfo(imdbId) {
    if (!tmdbCache.has(imdbId)) {
      tmdbCache.set(imdbId, new Promise(resolve => {
        GM_xmlhttpRequest({
          method: 'HEAD',
          url: `https://www.themoviedb.org/redirect?external_source=imdb_id&external_id=${imdbId}`,
          onload(r) {
            try {
              const parts = new URL(r.finalUrl).pathname.split('/').filter(Boolean);
              if (parts.length >= 2 && (parts[0] === 'movie' || parts[0] === 'tv')) {
                const id = parseInt(parts[1].split('-')[0], 10);
                if (!isNaN(id)) return resolve({ type: parts[0], id });
              }
            } catch {}
            resolve(null);
          },
          onerror: () => resolve(null)
        });
      }));
    }
    return tmdbCache.get(imdbId);
  }
  const PLAYERS_IMDB = [
    {
      name: 'Src', color: '#125784', textColor: '#bad8eb',
      movie: id => `https://vsembed.ru/embed/movie/${id}`,
      tv: (id, s, e) => `https://vsembed.ru/embed/tv/${id}?season=${s}&episode=${e}`
    },
    {
      name: 'Rock', color: '#ff6b35', textColor: '#fff',
      movie: id => `https://vidrock.net/movie/${id}`,
      tv: (id, s, e) => `https://vidrock.net/tv/${id}/${s}/${e}`
    },
    {
      name: 'Fast', color: '#6C63FF', textColor: '#fff',
      movie: id => `https://vidfast.pro/movie/${id}?sub=en`,
      tv: (id, s, e) => `https://vidfast.pro/tv/${id}/${s}/${e}?sub=en`
    }
  ];
  const PLUS_PARAMS = 'autoplay=true&autonext=false&nextbutton=true&poster=true&title=true' +
    '&watchparty=false&chromecast=false&episodelist=true&servericon=true&setting=true&pip=false' +
    '&hideprimarycolor=true&hidesecondarycolor=true&hideiconcolor=true&hideprogresscontrol=true' +
    '&hideiconset=true&hideautonext=true&hidechromecast=true&hidepip=true' +
    '&primarycolor=6C63FF&secondarycolor=9F9BFF&iconcolor=FFFFFF' +
    '&logourl=https%3A%2F%2Fi.ibb.co%2F67wTJd9R%2Fpngimg-com-netflix-PNG11.png' +
    '&font=Roboto&fontcolor=FFFFFF&fontsize=22&opacity=0.5';
  const PLAYERS_TMDB = [
    {
      name: 'Easy', color: '#125784', textColor: '#fff',
      movie: id => `https://player.videasy.net/movie/${id}`,
      tv: (id, s, e) => `https://player.videasy.net/tv/${id}/${s}/${e}?nextEpisode=true&episodeSelector=true`
    },
    {
      name: 'King', color: '#ff6b35', textColor: '#fff',
      movie: id => `https://www.vidking.net/embed/movie/${id}`,
      tv: (id, s, e) => `https://www.vidking.net/embed/tv/${id}/${s}/${e}?nextEpisode=true&episodeSelector=true`
    },
    {
      name: 'Ify', color: '#e91e63', textColor: '#fff',
      movie: id => `https://player.vidify.top/embed/movie/${id}?poster=true&chromecast=false&pip=false`,
      tv: (id, s, e) => `https://player.vidify.top/embed/tv/${id}/${s}/${e}?poster=true&chromecast=false&pip=false`
    },
    {
      name: 'Plus', color: '#6C63FF', textColor: '#fff',
      movie: id => `https://player.vidplus.to/embed/movie/${id}?${PLUS_PARAMS}`,
      tv: (id, s, e) => `https://player.vidplus.to/embed/tv/${id}/${s}/${e}?${PLUS_PARAMS}`
    }
  ];
  function createPlayerBtn(name, bgColor, textColor, url) {
    const btn = document.createElement('button');
    btn.textContent = name;
    Object.assign(btn.style, {
      display: 'block', width: '100%',
      padding: '4px 10px', margin: '2px 0',
      background: bgColor, color: textColor,
      border: 'none', borderRadius: '6px',
      fontWeight: 'bold', fontSize: '13px',
      cursor: 'pointer', textAlign: 'center'
    });
    btn.addEventListener('click', e => { e.stopPropagation(); window.open(url, '_blank'); });
    return btn;
  }
  function makePlayerDropdown(extraCSS) {
    const dd = document.createElement('div');
    dd.style.cssText = `
      background: white; border: 1px solid #ccc; border-radius: 6px;
      padding: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      min-width: 80px; display: none; flex-direction: column; ${extraCSS}
    `;
    return dd;
  }
  function attachToggle(triggerBtn, dd, scopeEl) {
    let closeListener = null;
    triggerBtn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      const isOpen = dd.style.display === 'flex';
      if (isOpen) {
        dd.style.display = 'none';
        if (closeListener) { document.removeEventListener('click', closeListener); closeListener = null; }
      } else {
        dd.style.display = 'flex';
        setTimeout(() => {
          closeListener = ev => {
            if (!dd.contains(ev.target) && !triggerBtn.contains(ev.target)) {
              dd.style.display = 'none';
              document.removeEventListener('click', closeListener);
              closeListener = null;
            }
          };
          document.addEventListener('click', closeListener);
        }, 0);
      }
    });
  }
  function buildWyzieUrl(id, s, e) {
    let url = `https://sub.wyzie.io/search?id=${id}&language=en&format=srt&source=opensubtitles,subf2m&key=wyzie-c7985a9bbee82f5948cd8662a4fc4d5d`;
    if (s && e) url += `&season=${s}&episode=${e}`;
    return url;
  }
  function fetchWyzie(url, cb) {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      onload: r => {
        try {
          const json = JSON.parse(r.responseText);
          const subs = (Array.isArray(json) ? json : []).map(item => ({
            url: item.url,
            source: (item.source || '').toLowerCase(),
            fileName: item.fileName || null
          })).filter(s => s.url).slice(0, 25);
          cb(subs);
        } catch { cb([]); }
      },
      onerror: () => cb([])
    });
  }
  function fetchText(url, cb) {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      onload: r => cb(r.responseText),
      onerror: () => cb('')
    });
  }
  function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  function createSubButton(index, url, fallbackName, s, e, source, fileName) {
    const btn = document.createElement('button');
    btn.textContent = `Sub ${index}`;
    const isSubf2m = source === 'subf2m';
    Object.assign(btn.style, {
      padding: '6px',
      background: isSubf2m ? '#1a3a5c' : '#2e2e2e',
      color: '#fff',
      border: isSubf2m ? '1px solid #4a90d9' : 'none',
      borderRadius: '6px',
      fontWeight: 'bold',
      fontSize: '12px',
      cursor: 'pointer'
    });
    btn.title = source ? `Source: ${source}` : '';
    btn.onclick = ev => {
      ev.stopPropagation();
      fetchText(url, txt => {
        let filename;
        if (isSubf2m) {
          const epTag = s && e ? `_S${String(s).padStart(2, '0')}E${String(e).padStart(2, '0')}` : '';
          filename = `${fallbackName}${epTag}_${index}_subf2m.srt`;
        } else {
          filename = fileName || (() => {
            const epTag = s && e ? `_S${String(s).padStart(2, '0')}E${String(e).padStart(2, '0')}` : '';
            return `${fallbackName}${epTag}_${index}.srt`;
          })();
        }
        downloadText(filename, txt);
      });
    };
    return btn;
  }
  function buildSubDropdown(card, subs, s, e) {
    let box = card.querySelector('.wyzie-dd');
    if (box) box.remove();
    box = document.createElement('div');
    box.className = 'wyzie-dd';
    box.style.cssText = `
      position: absolute; right: 8px; bottom: 50%;
      background: white; border: 1px solid #ccc; border-radius: 6px;
      padding: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000; display: grid; grid-template-columns: repeat(2, 1fr);
      gap: 6px; min-width: 140px;
    `;
    const baseName = getCleanTitle();
    if (!subs.length) {
      const empty = document.createElement('div');
      empty.textContent = 'No subtitles';
      empty.style.gridColumn = 'span 2';
      empty.style.fontSize = '12px';
      box.appendChild(empty);
    } else {
      const counters = {};
      subs.forEach(sub => {
        const src = sub.source || 'other';
        counters[src] = (counters[src] || 0) + 1;
        box.appendChild(createSubButton(counters[src], sub.url, baseName, s, e, sub.source, sub.fileName));
      });
    }
    card.appendChild(box);
    return box;
  }
  function insertEpisodeWatchButtons() {
    const imdbId = getImdbId();
    if (!imdbId) return;
    const season = getSeasonFromUrl();
    const tmdbPromise = getTmdbInfo(imdbId);
    document.querySelectorAll('.episode-item-wrapper, .list_item').forEach(card => {
      if (card.querySelector('.watch-ep-btn')) return;
      const ep = parseEpisode(card, season);
      if (!ep) return;
      if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
      const dd = makePlayerDropdown('position: absolute; right: 8px; bottom: 50%; z-index: 10000;');
      PLAYERS_IMDB.forEach(p => dd.appendChild(
        createPlayerBtn(p.name, p.color, p.textColor, p.tv(imdbId, ep.s, ep.e))
      ));
      const btn = document.createElement('button');
      btn.className = 'watch-ep-btn';
      btn.textContent = 'Watch';
      Object.assign(btn.style, {
        position: 'absolute', right: '8px', bottom: '8px',
        padding: '4px 10px', background: '#125784', color: '#bad8eb',
        border: 'none', cursor: 'pointer', fontWeight: 'bold',
        borderRadius: '6px', fontSize: '12px', zIndex: '9999', opacity: '0.95'
      });
      attachToggle(btn, dd, card);
      card.appendChild(dd);
      card.appendChild(btn);
      tmdbPromise.then(info => {
        if (!info || info.type !== 'tv' || dd.dataset.tmdbDone) return;
        dd.dataset.tmdbDone = '1';
        PLAYERS_TMDB.forEach(p => dd.appendChild(
          createPlayerBtn(p.name, p.color, p.textColor, p.tv(info.id, ep.s, ep.e))
        ));
      });
    });
  }
  function insertEpisodeDownloadButtons() {
    const imdbId = getImdbId();
    if (!imdbId) return;
    const season = getSeasonFromUrl();
    document.querySelectorAll('.episode-item-wrapper, .list_item').forEach(card => {
      if (card.querySelector('.vf-dl-btn')) return;
      const ep = parseEpisode(card, season);
      if (!ep) return;
      if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
      const btn = document.createElement('a');
      btn.className = 'vf-dl-btn';
      btn.textContent = 'Download';
      btn.href = `https://dl.vidsrc.vip/tv/${imdbId}/${ep.s}/${ep.e}`;
      btn.target = '_blank';
      Object.assign(btn.style, {
        position: 'absolute', right: '8px', bottom: '36px',
        padding: '4px 10px', background: '#125784', color: '#bad8eb',
        border: 'none', cursor: 'pointer', fontWeight: 'bold',
        borderRadius: '6px', fontSize: '12px', zIndex: '9999',
        opacity: '0.95', textDecoration: 'none', display: 'block'
      });
      card.appendChild(btn);
    });
  }
  function insertEpisodeSubButtons() {
    const imdbId = getImdbId();
    if (!imdbId) return;
    const season = getSeasonFromUrl();
    document.querySelectorAll('.episode-item-wrapper, .list_item').forEach(card => {
      if (card.querySelector('.wyzie-btn')) return;
      const ep = parseEpisode(card, season);
      if (!ep) return;
      if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
      const btn = document.createElement('button');
      btn.className = 'wyzie-btn';
      btn.textContent = 'Subs';
      Object.assign(btn.style, {
        position: 'absolute', right: '8px', bottom: '64px',
        padding: '4px 10px', background: '#2e2e2e', color: '#fff',
        border: 'none', cursor: 'pointer', fontWeight: 'bold',
        borderRadius: '6px', fontSize: '12px', zIndex: '9999'
      });
      let dropdown = null;
      btn.onclick = ev => {
        ev.stopPropagation();
        ev.preventDefault();
        if (dropdown) { dropdown.remove(); dropdown = null; return; }
        fetchWyzie(buildWyzieUrl(imdbId, ep.s, ep.e), subs => {
          dropdown = buildSubDropdown(card, subs, ep.s, ep.e);
        });
      };
      document.addEventListener('click', ev => {
        if (dropdown && !dropdown.contains(ev.target)) { dropdown.remove(); dropdown = null; }
      });
      card.appendChild(btn);
    });
  }
  function styleEpisodeGuide() {
    const link = document.querySelector('a[href*="/episodes"]');
    if (!link || link.dataset.wbStyled) return;
    link.textContent = 'Episode guide (Watch)';
    Object.assign(link.style, {
      display: 'inline-block', padding: '8px 12px',
      marginLeft: '4px', marginRight: '6px',
      background: '#125784', color: '#bad8eb',
      fontWeight: 'bold', borderRadius: '6px', textDecoration: 'none'
    });
    link.dataset.wbStyled = 'true';
  }
  function addMovieWatchButton() {
    if (document.getElementById('watch-main-btn')) return;
    const imdbId = getImdbId();
    if (!imdbId) return;
    const container = document.createElement('div');
    container.style.cssText = 'position: fixed; bottom: 10px; right: 10px; z-index: 10003; font-family: Arial;';
    const dd = makePlayerDropdown('position: absolute; right: 0; bottom: 100%; margin-bottom: 4px; z-index: 10004;');
    PLAYERS_IMDB.forEach(p => dd.appendChild(
      createPlayerBtn(p.name, p.color, p.textColor, p.movie(imdbId))
    ));
    const btn = document.createElement('button');
    btn.id = 'watch-main-btn';
    btn.textContent = 'Watch';
    Object.assign(btn.style, {
      padding: '10px 14px', background: '#125784', color: '#bad8eb',
      border: 'none', borderRadius: '6px', fontWeight: 'bold',
      cursor: 'pointer', filter: 'drop-shadow(0 10px 8px rgba(0,0,0,0.2))'
    });
    attachToggle(btn, dd, container);
    container.appendChild(dd);
    container.appendChild(btn);
    document.body.appendChild(container);
    getTmdbInfo(imdbId).then(info => {
      if (!info || info.type !== 'movie') return;
      PLAYERS_TMDB.forEach(p => dd.appendChild(
        createPlayerBtn(p.name, p.color, p.textColor, p.movie(info.id))
      ));
    });
  }
  function addMovieDownloadButton() {
    if (document.getElementById('vf-dl-main-btn')) return;
    const imdbId = getImdbId();
    if (!imdbId) return;
    const btn = document.createElement('a');
    btn.id = 'vf-dl-main-btn';
    btn.textContent = 'Download';
    btn.href = `https://dl.vidsrc.vip/movie/${imdbId}`;
    btn.target = '_blank';
    Object.assign(btn.style, {
      fontFamily: 'Arial', position: 'fixed', bottom: '60px', right: '10px',
      padding: '10px 14px', background: '#125784', color: '#bad8eb',
      border: 'none', cursor: 'pointer', fontWeight: 'bold',
      borderRadius: '6px', zIndex: '10001', display: 'block',
      textDecoration: 'none', filter: 'drop-shadow(0 10px 8px rgba(0,0,0,0.2))'
    });
    document.body.appendChild(btn);
  }
  function addMovieSubButton() {
    if (document.getElementById('wyzie-movie-btn')) return;
    const imdbId = getImdbId();
    if (!imdbId) return;
    const container = document.createElement('div');
    container.id = 'wyzie-movie-container';
    container.style.cssText = 'position: fixed; bottom: 110px; right: 10px; z-index: 10002; font-family: Arial;';
    const btn = document.createElement('button');
    btn.id = 'wyzie-movie-btn';
    btn.textContent = 'Subs';
    Object.assign(btn.style, {
      padding: '10px 14px', background: '#2e2e2e', color: '#fff',
      border: 'none', borderRadius: '6px', fontWeight: 'bold',
      cursor: 'pointer', filter: 'drop-shadow(0 10px 8px rgba(0,0,0,0.2))'
    });
    const dd = document.createElement('div');
    dd.id = 'wyzie-movie-dd';
    dd.style.cssText = `
      position: absolute; right: 0; bottom: 100%; margin-bottom: 4px;
      background: white; border: 1px solid #ccc; border-radius: 6px;
      padding: 6px; display: none;
      grid-template-columns: repeat(2, 1fr); gap: 6px;
      min-width: 140px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10003;
    `;
    btn.onclick = e => {
      e.stopPropagation();
      dd.style.display = dd.style.display === 'grid' ? 'none' : 'grid';
      if (dd.childElementCount) return;
      dd.innerHTML = 'Loading...';
      fetchWyzie(buildWyzieUrl(imdbId), subs => {
        dd.innerHTML = '';
        const baseName = getCleanTitle();
        if (!subs.length) {
          dd.innerHTML = "<div style='grid-column:span 2;font-size:12px;'>No subtitles</div>";
          return;
        }
        const counters = {};
        subs.forEach(sub => {
          const src = sub.source || 'other';
          counters[src] = (counters[src] || 0) + 1;
          dd.appendChild(createSubButton(counters[src], sub.url, baseName, null, null, sub.source, sub.fileName));
        });
      });
    };
    document.addEventListener('click', ev => {
      if (!container.contains(ev.target)) dd.style.display = 'none';
    });
    container.appendChild(dd);
    container.appendChild(btn);
    document.body.appendChild(container);
  }
  function init() {
    const titleText = getTitleText();
    const isEpisodes = location.pathname.includes('/episodes');
    const isTvSeries = titleText.includes('TV Series') || titleText.includes('TV Mini Series');
    if (isEpisodes) {
      insertEpisodeWatchButtons();
      insertEpisodeDownloadButtons();
      insertEpisodeSubButtons();
      new MutationObserver(() => {
        insertEpisodeWatchButtons();
        insertEpisodeDownloadButtons();
        insertEpisodeSubButtons();
      }).observe(document.body, { childList: true, subtree: true });
    } else if (isTvSeries) {
      styleEpisodeGuide();
    } else {
      addMovieWatchButton();
      addMovieDownloadButton();
      addMovieSubButton();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
