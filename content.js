(() => {
  "use strict";

  let state = {
    filterMode: "all",
    searchQuery: "",
    lastUrl: "",
    injected: false,
  };

  function getEpisodeList() {
    return document.querySelector('[data-testid="show-all-episode-list"]');
  }

  function getEpisodeRows(container) {
    return Array.from(container.querySelectorAll('li[role="row"]'));
  }

  function isExclusive(row) {
    const titleLink = row.querySelector('a[href^="/episode/"]');
    if (!titleLink) return false;
    return /patreon\s*exclusive/i.test(titleLink.textContent);
  }

  function getSearchText(row) {
    const titleLink = row.querySelector('a[href^="/episode/"]');
    return (titleLink?.textContent?.trim() || "").toLowerCase();
  }

  function injectControls(container) {
    if (document.getElementById("sef-controls")) return;

    const controls = document.createElement("div");
    controls.id = "sef-controls";
    controls.style.cssText = "display:flex !important; visibility:visible !important; opacity:1 !important; position:relative !important; z-index:9999 !important; padding:12px 0; margin:4px 0 8px 0; gap:12px; align-items:center;";
    controls.innerHTML = `
      <div class="sef-tabs">
        <button class="sef-tab sef-tab-active" data-filter="all">Tutti</button>
        <button class="sef-tab" data-filter="exclusive">Patreon Exclusive</button>
        <button class="sef-tab" data-filter="free">Liberi</button>
      </div>
      <input type="text" id="sef-search" class="sef-search-input" placeholder="Cerca tra gli episodi..." />
      <span id="sef-counter" class="sef-counter"></span>
    `;

    container.insertBefore(controls, container.firstChild);

    document.getElementById("sef-search").addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      applyFilters();
    });

    controls.querySelectorAll(".sef-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        state.filterMode = tab.dataset.filter;
        controls
          .querySelectorAll(".sef-tab")
          .forEach((t) => t.classList.toggle("sef-tab-active", t === tab));
        applyFilters();
      });
    });

    state.injected = true;
  }

  function applyFilters() {
    const container = getEpisodeList();
    if (!container) return;

    const treegrid = container.querySelector('ul[role="treegrid"]');
    const isFiltering = state.filterMode !== "all" || state.searchQuery;

    if (treegrid) {
      treegrid.classList.toggle("sef-filtering-active", isFiltering);
    }

    const rows = getEpisodeRows(container);
    let visible = 0, exclusive = 0, total = rows.length;

    for (const row of rows) {
      const excl = isExclusive(row);
      if (excl) exclusive++;

      const text = getSearchText(row);
      const query = state.searchQuery.toLowerCase();

      let show = true;
      if (state.filterMode === "exclusive") show = excl;
      if (state.filterMode === "free") show = !excl;
      if (query) show = show && text.includes(query);

      row.classList.toggle("sef-episode-hidden", !show);
      row.classList.toggle("sef-episode-visible", show);
      row.classList.toggle(
        "sef-episode-highlight",
        show && excl && state.filterMode === "all" && !query
      );

      if (show) visible++;
    }

    const counter = document.getElementById("sef-counter");
    if (counter) {
      if (state.filterMode === "all" && !state.searchQuery) {
        counter.textContent = `${exclusive} esclusivi su ${total}`;
      } else {
        counter.textContent = `${visible} di ${total}`;
      }
    }
  }

  function cleanup() {
    const controls = document.getElementById("sef-controls");
    if (controls) controls.remove();
    const container = getEpisodeList();
    if (container) {
      const treegrid = container.querySelector('ul[role="treegrid"]');
      if (treegrid) treegrid.classList.remove("sef-filtering-active");
      getEpisodeRows(container).forEach((row) => {
        row.classList.remove("sef-episode-hidden", "sef-episode-visible", "sef-episode-highlight");
      });
    }
    state.injected = false;
  }

  function isShowPage() {
    return /\/show\//.test(window.location.pathname);
  }

  function trySetup() {
    if (state.injected) return;
    if (!isShowPage()) return;
    const container = getEpisodeList();
    if (!container) return;
    injectControls(container);
    applyFilters();
  }

  function checkNavigation() {
    const url = window.location.href;
    if (url === state.lastUrl) return;
    state.lastUrl = url;
    state.filterMode = "all";
    state.searchQuery = "";
    cleanup();
  }

  function init() {
    state.lastUrl = window.location.href;

    let debounceTimer = null;
    const observer = new MutationObserver(() => {
      checkNavigation();
      if (isShowPage() && !state.injected) trySetup();
      if (isShowPage() && state.injected) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyFilters, 300);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setInterval(() => {
      checkNavigation();
      if (isShowPage() && !state.injected) trySetup();
    }, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
