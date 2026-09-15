(function(){
  "use strict";

  const STORAGE_KEY = "mcu-tracker-state-v1";
  const PHASE_COLORS = [
    "#8b2f2f","#2f5d8b","#3f7a4d","#7a4d9f","#b0752f","#2f7a7a","#9f4d7a","#4d5a9f"
  ];

  function colorForFilm(id){ return PHASE_COLORS[id % PHASE_COLORS.length]; }

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){}
    return { lang: "en", theme: "dark", entries: {} };
  }
  function saveState(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){}
  }

  let state = loadState();
  let activeFilmId = null;
  let currentView = "home";

  const el = (sel, root) => (root||document).querySelector(sel);
  const els = (sel, root) => Array.from((root||document).querySelectorAll(sel));

  function entry(id){
    if(!state.entries[id]) state.entries[id] = { watched: false, rating: 0, notes: "" };
    return state.entries[id];
  }

  function formatRuntime(min, lang){
    if(min == null) return "";
    const h = Math.floor(min/60), m = min%60;
    if(lang === "de") return `${h}h ${m}m`;
    if(lang === "ru") return `${h}ч ${m}м`;
    return `${h}h ${m}m`;
  }

  /* ---------- i18n apply ---------- */
  function applyI18n(){
    const lang = state.lang;
    document.body.setAttribute("data-lang", lang);
    els("[data-i18n]").forEach(n => { n.textContent = t(lang, n.getAttribute("data-i18n")); });
    els("[data-i18n-placeholder]").forEach(n => { n.setAttribute("placeholder", t(lang, n.getAttribute("data-i18n-placeholder"))); });
    els("[data-i18n-aria]").forEach(n => { n.setAttribute("aria-label", t(lang, n.getAttribute("data-i18n-aria"))); });
    els("#langSegmented button").forEach(b => b.classList.toggle("active", b.dataset.lang === lang));
    renderAll();
  }

  /* ---------- Theme ---------- */
  function applyTheme(){
    document.body.setAttribute("data-theme", state.theme);
    els("#themeSegmented button").forEach(b => b.classList.toggle("active", b.dataset.themeChoice === state.theme));
  }

  /* ---------- Poster helper ---------- */
  function posterNode(film, lang){
    const wrap = document.createElement("div");
    wrap.className = "poster";
    wrap.style.background = `linear-gradient(155deg, ${colorForFilm(film.id)}, rgba(0,0,0,0.55))`;
    const img = document.createElement("img");
    img.src = `assets/posters/${film.id}.jpg`;
    img.alt = "";
    img.loading = "lazy";
    img.onerror = () => { img.remove(); };
    wrap.appendChild(img);
    const label = document.createElement("div");
    label.className = "poster-fallback-title";
    label.textContent = localizedTitle(lang, film);
    wrap.appendChild(label);
    return wrap;
  }

  /* ---------- Timeline (home view) ---------- */
  function currentFilmId(){
    // "current" = first not-watched film in release order
    const f = MCU_FILMS.find(f => !entry(f.id).watched && !f.upcoming);
    return f ? f.id : null;
  }

  function renderHome(){
    const lang = state.lang;
    const rowsWrap = el("#timelineRows");
    rowsWrap.innerHTML = "";
    const curId = currentFilmId();

    // group into rows of 11 like the reference, per saga
    const CHUNK = 11;
    for(let i=0;i<MCU_FILMS.length;i+=CHUNK){
      const rowFilms = MCU_FILMS.slice(i, i+CHUNK);
      const row = document.createElement("div");
      row.className = "timeline-row";
      rowFilms.forEach(film => {
        const wrap = document.createElement("div");
        wrap.className = "node-wrap";

        const connector = document.createElement("div");
        connector.className = "connector" + (film.branch ? " dashed" : "");
        wrap.appendChild(connector);

        const e = entry(film.id);
        const node = document.createElement("button");
        node.className = "node";
        if(e.watched) node.classList.add("watched");
        if(film.id === curId) node.classList.add("current");
        if(film.upcoming) node.classList.add("upcoming");
        node.textContent = film.id;
        node.setAttribute("aria-label", localizedTitle(lang, film));
        node.addEventListener("click", () => openDrawer(film.id));
        wrap.appendChild(node);

        const label = document.createElement("div");
        label.className = "node-label";
        label.textContent = localizedTitle(lang, film);
        wrap.appendChild(label);

        const yr = document.createElement("div");
        yr.className = "node-year";
        yr.textContent = film.year;
        wrap.appendChild(yr);

        row.appendChild(wrap);
      });
      rowsWrap.appendChild(row);
    }

    // saga header reflects the saga of the "current" film, else Infinity by default
    const curFilm = MCU_FILMS.find(f => f.id === curId) || MCU_FILMS[MCU_FILMS.length-1];
    const sagaKey = SAGAS[curFilm.saga].key;
    el("#sagaTitle").textContent = t(lang, sagaKey);
    const watchedCount = MCU_FILMS.filter(f => entry(f.id).watched).length;
    el("#sagaCount").textContent = `${watchedCount} / ${MCU_FILMS.length}`;
    el("#progressFill").style.width = `${(watchedCount / MCU_FILMS.length) * 100}%`;
  }

  /* ---------- Grid view ---------- */
  function renderGrid(){
    const lang = state.lang;
    const wrap = el("#gridWrap");
    wrap.innerHTML = "";
    MCU_FILMS.forEach(film => {
      const e = entry(film.id);
      const card = document.createElement("div");
      card.className = "grid-card" + (e.watched ? " is-watched" : "");
      card.appendChild(posterNode(film, lang));
      const body = document.createElement("div");
      body.className = "gc-body";
      const title = document.createElement("div");
      title.className = "gc-title";
      title.textContent = localizedTitle(lang, film);
      const year = document.createElement("div");
      year.className = "gc-year";
      year.textContent = film.year;
      body.appendChild(title); body.appendChild(year);
      card.appendChild(body);
      card.addEventListener("click", () => openDrawer(film.id));
      wrap.appendChild(card);
    });
  }

  /* ---------- Bookmarks (watched films) view ---------- */
  function renderBookmarks(){
    const lang = state.lang;
    const wrap = el("#bookmarksWrap");
    wrap.innerHTML = "";
    const watched = MCU_FILMS.filter(f => entry(f.id).watched);
    if(watched.length === 0){
      const empty = document.createElement("div");
      empty.className = "empty-hint";
      empty.textContent = lang === "de" ? "Noch nichts gesehen." : lang === "ru" ? "Пока ничего не просмотрено." : "Nothing watched yet.";
      wrap.appendChild(empty);
      return;
    }
    watched.forEach(film => {
      const card = document.createElement("div");
      card.className = "grid-card is-watched";
      card.appendChild(posterNode(film, lang));
      const body = document.createElement("div");
      body.className = "gc-body";
      const title = document.createElement("div");
      title.className = "gc-title";
      title.textContent = localizedTitle(lang, film);
      const year = document.createElement("div");
      year.className = "gc-year";
      const e = entry(film.id);
      year.textContent = film.year + (e.rating ? "  " + "★".repeat(e.rating) : "");
      body.appendChild(title); body.appendChild(year);
      card.appendChild(body);
      card.addEventListener("click", () => openDrawer(film.id));
      wrap.appendChild(card);
    });
  }

  /* ---------- Stats view ---------- */
  function renderStats(){
    const lang = state.lang;
    const wrap = el("#statsGrid");
    wrap.innerHTML = "";
    const watchedFilms = MCU_FILMS.filter(f => entry(f.id).watched);
    const watched = watchedFilms.length;
    const remaining = MCU_FILMS.length - watched;
    const totalMinutes = watchedFilms.reduce((sum,f) => sum + (f.runtime||0), 0);
    const hours = (totalMinutes/60).toFixed(1);
    const ratings = watchedFilms.map(f => entry(f.id).rating).filter(r => r > 0);
    const avgRating = ratings.length ? (ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1) : "—";

    const cards = [
      [watched, t(lang,"statsWatched")],
      [remaining, t(lang,"statsRemaining")],
      [hours, t(lang,"statsHours")],
      [avgRating, t(lang,"statsAvgRating")],
    ];
    cards.forEach(([value,label]) => {
      const c = document.createElement("div");
      c.className = "stat-card";
      const v = document.createElement("div"); v.className = "stat-value"; v.textContent = value;
      const l = document.createElement("div"); l.className = "stat-label"; l.textContent = label;
      c.appendChild(v); c.appendChild(l);
      wrap.appendChild(c);
    });
  }

  function renderAll(){
    renderHome();
    renderGrid();
    renderBookmarks();
    renderStats();
    if(activeFilmId != null) fillDrawer(activeFilmId);
  }

  /* ---------- Drawer ---------- */
  function fillDrawer(id){
    const lang = state.lang;
    const film = MCU_FILMS.find(f => f.id === id);
    const e = entry(id);
    el("#drawerId").textContent = String(film.id).padStart(2,"0");
    el("#drawerTitle").textContent = localizedTitle(lang, film);
    const rt = film.upcoming ? t(lang,"upcoming") : formatRuntime(film.runtime, lang);
    el("#drawerMeta").textContent = `${film.year} · ${rt}`;

    const posterHolder = el("#drawerPoster");
    posterHolder.innerHTML = "";
    posterHolder.appendChild(posterNode(film, lang));

    els("#starsRow button").forEach(btn => {
      const val = Number(btn.dataset.star);
      btn.classList.toggle("filled", val <= e.rating);
    });
    el("#notesInput").value = e.notes || "";

    const watchedBtn = el("#watchedBtn");
    const upcomingNote = el("#upcomingNote");
    if(film.upcoming && !e.watched){
      watchedBtn.disabled = true;
      watchedBtn.style.opacity = 0.5;
      upcomingNote.hidden = false;
    } else {
      watchedBtn.disabled = false;
      watchedBtn.style.opacity = 1;
      upcomingNote.hidden = true;
    }
    watchedBtn.classList.toggle("is-watched", e.watched);
    watchedBtn.textContent = e.watched ? t(lang,"markUnwatched") : t(lang,"markWatched");
  }

  function openDrawer(id){
    activeFilmId = id;
    fillDrawer(id);
    el("#drawer").classList.add("open");
    el("#scrim").classList.add("show");
  }
  function closeDrawer(){
    el("#drawer").classList.remove("open");
    el("#scrim").classList.remove("show");
    activeFilmId = null;
  }

  /* ---------- View switching ---------- */
  function switchView(view){
    currentView = view;
    els(".view").forEach(v => v.classList.remove("active"));
    el(`#view-${view}`).classList.add("active");
    els(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  }

  /* ---------- Wire up events ---------- */
  function init(){
    applyTheme();
    applyI18n();

    els(".nav-btn").forEach(btn => btn.addEventListener("click", () => switchView(btn.dataset.view)));

    el("#themeToggle").addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      applyTheme(); saveState();
    });

    el("#drawerClose").addEventListener("click", closeDrawer);
    el("#scrim").addEventListener("click", closeDrawer);

    els("#starsRow button").forEach(btn => {
      btn.addEventListener("click", () => {
        if(activeFilmId == null) return;
        const e = entry(activeFilmId);
        const val = Number(btn.dataset.star);
        e.rating = (e.rating === val) ? 0 : val; // click same star to clear
        saveState();
        fillDrawer(activeFilmId);
      });
    });

    let notesTimer = null;
    el("#notesInput").addEventListener("input", (ev) => {
      if(activeFilmId == null) return;
      const e = entry(activeFilmId);
      e.notes = ev.target.value;
      clearTimeout(notesTimer);
      notesTimer = setTimeout(saveState, 300);
    });

    el("#watchedBtn").addEventListener("click", () => {
      if(activeFilmId == null) return;
      const e = entry(activeFilmId);
      e.watched = !e.watched;
      saveState();
      fillDrawer(activeFilmId);
      renderHome(); renderGrid(); renderBookmarks(); renderStats();
    });

    el("#langSegmented").addEventListener("click", (ev) => {
      const btn = ev.target.closest("button[data-lang]");
      if(!btn) return;
      state.lang = btn.dataset.lang;
      saveState();
      applyI18n();
    });

    el("#themeSegmented").addEventListener("click", (ev) => {
      const btn = ev.target.closest("button[data-theme-choice]");
      if(!btn) return;
      state.theme = btn.dataset.themeChoice;
      applyTheme(); saveState();
    });

    el("#resetBtn").addEventListener("click", () => {
      const lang = state.lang;
      if(confirm(t(lang,"settingsResetConfirm"))){
        state.entries = {};
        saveState();
        renderAll();
      }
    });

    // iOS install hint
    const isStandalone = window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if(isIOS && !isStandalone && !localStorage.getItem("mcu-install-dismissed")){
      el("#installToast").hidden = false;
    }
    el("#installDismiss").addEventListener("click", () => {
      el("#installToast").hidden = true;
      localStorage.setItem("mcu-install-dismissed","1");
    });

    if("serviceWorker" in navigator){
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(()=>{});
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
