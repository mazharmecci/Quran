// app.js — Quran Learning Premium Reader (cyan-blue theme)

import { getPage, getPageCount } from './firestore.js';

const state = {
  settings: {
    showArabic: true,
    showTransliteration: false,
    theme: 'day', // default cyan-blue theme
  },
  session: {
    pageIndex: 0,     // 0-based
    ayahIndex: 0,
    bookmarks: new Set(),
  },
  data: {
    pages: [],        // current page only: [page]
    totalPages: 604,  // fallback; will try to load from Firestore
  },
};

const el = {
  toggleArabic: document.getElementById('toggleArabic'),
  toggleTransliteration: document.getElementById('toggleTransliteration'),
  toggleTheme: document.getElementById('toggleTheme'),
  prevPage: document.getElementById('prevPage'),
  nextPage: document.getElementById('nextPage'),
  pageLabel: document.getElementById('pageLabel'),
  pageCount: document.getElementById('pageCount'),
  ayahRef: document.getElementById('ayahRef'),
  ayahMeta: document.getElementById('ayahMeta'),
  ayahTextEn: document.getElementById('ayahTextEn'),
  ayahTextAr: document.getElementById('ayahTextAr'),
  progressText: document.getElementById('progressText'),
  bookmarkBtn: document.getElementById('bookmarkBtn'),
  copyBtn: document.getElementById('copyBtn'),
  shareBtn: document.getElementById('shareBtn'),
  pageInput: document.getElementById('pageInput'),
  jumpBtn: document.getElementById('jumpBtn'),
  resetBtn: document.getElementById('resetBtn'),
  surahMeta: document.getElementById('surahMeta'),
  readerProgress: document.getElementById('readerProgress'),
};

// Utilities
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const formatPercent = (num) => `${Math.round(num * 100)}%`;

// Persistence
const persistKey = 'quran-learning-session';
function saveSession() {
  const payload = {
    settings: state.settings,
    session: {
      pageIndex: state.session.pageIndex,
      ayahIndex: state.session.ayahIndex,
      bookmarks: Array.from(state.session.bookmarks),
    },
  };
  localStorage.setItem(persistKey, JSON.stringify(payload));
}
function loadSession() {
  const raw = localStorage.getItem(persistKey);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.settings) state.settings = parsed.settings;
    if (parsed.session) {
      state.session.pageIndex = parsed.session.pageIndex ?? 0;
      state.session.ayahIndex = parsed.session.ayahIndex ?? 0;
      state.session.bookmarks = new Set(parsed.session.bookmarks ?? []);
    }
  } catch { /* ignore */ }
}

// Theme
function applyTheme() {
  document.body.style.background =
    'radial-gradient(1200px 800px at 20% -10%, #f0f6fb 0%, #f3f7fb 40%, #eef4fa 100%)';
  el.toggleTheme.textContent = 'Theme: Day';
  el.toggleTheme.setAttribute('aria-pressed', 'false');
}

// Rendering helpers
function renderMeta(page) {
  const pageNumber = page.pageNumber ?? (state.session.pageIndex + 1);
  el.pageLabel.textContent = `Page ${pageNumber}`;
  el.pageCount.textContent = `of ${state.data.totalPages}`;
  el.surahMeta.textContent = `Surah ${page.surahNumber} • ${page.surahName}`;
  el.ayahMeta.textContent = `Juz ${page.juz} • Page ${pageNumber}`;
}

function renderAyah(page, ayahIndex) {
  const ayah = page.ayat[ayahIndex];
  el.ayahRef.textContent = `Surah ${page.surahNumber} • ${page.surahName} — Ayah ${ayah.ayahNumber}`;
  el.ayahTextEn.textContent = ayah.english;

  // Arabic
  if (state.settings.showArabic) {
    el.ayahTextAr.style.display = 'block';
    el.ayahTextAr.textContent = ayah.arabic;
    el.toggleArabic.textContent = 'Arabic: On';
    el.toggleArabic.setAttribute('aria-pressed', 'true');
  } else {
    el.ayahTextAr.style.display = 'none';
    el.toggleArabic.textContent = 'Arabic: Off';
    el.toggleArabic.setAttribute('aria-pressed', 'false');
  }

  // Transliteration
  const existingTrans = document.getElementById('ayahTrans');
  if (existingTrans) existingTrans.remove();
  if (state.settings.showTransliteration) {
    const trans = document.createElement('div');
    trans.id = 'ayahTrans';
    trans.style.marginTop = '8px';
    trans.style.color = '#2b6cb0';
    trans.style.fontSize = '16px';
    trans.textContent = ayah.transliteration;
    el.ayahTextEn.insertAdjacentElement('afterend', trans);
    el.toggleTransliteration.textContent = 'Transliteration: On';
    el.toggleTransliteration.setAttribute('aria-pressed', 'true');
  } else {
    el.toggleTransliteration.textContent = 'Transliteration: Off';
    el.toggleTransliteration.setAttribute('aria-pressed', 'false');
  }
}

function renderProgress(pageIndex, ayahIndex) {
  const page = state.data.pages[0];
  el.progressText.textContent = `Ayah ${ayahIndex + 1} of ${page.ayat.length}`;

  // Per-page progress only (since we only hold one page in memory)
  const percent = ayahIndex / (page.ayat.length - 1 || 1);
  el.readerProgress.textContent = `${formatPercent(percent)} read`;
}

function render() {
  if (!state.data.pages.length) return;
  const page = state.data.pages[0];

  const ayahIndex = clamp(
    state.session.ayahIndex,
    0,
    page.ayat.length - 1
  );

  renderMeta(page);
  renderAyah(page, ayahIndex);
  renderProgress(state.session.pageIndex, ayahIndex);

  // Prev/Next buttons across pages
  const isFirstPage = state.session.pageIndex === 0 && ayahIndex === 0;
  const isLastPage =
    state.session.pageIndex === state.data.totalPages - 1 &&
    ayahIndex === page.ayat.length - 1;

  el.prevPage.disabled = isFirstPage;
  el.nextPage.disabled = isLastPage;

  saveSession();
}

// Firestore loader
async function loadPage(pageNumber) {
  const page = await getPage(pageNumber);
  if (!page) return;

  state.data.pages = [page];
  state.session.pageIndex = pageNumber - 1; // session uses 0-based
  state.session.ayahIndex = 0;

  el.pageCount.textContent = `of ${state.data.totalPages}`;
  render();
}

// Navigation
async function goPrev() {
  const pageNumber = state.session.pageIndex + 1;
  const page = state.data.pages[0];

  if (state.session.ayahIndex > 0) {
    state.session.ayahIndex--;
    render();
    return;
  }

  if (pageNumber > 1) {
    const targetPage = pageNumber - 1;
    await loadPage(targetPage);
  }
}

async function goNext() {
  const pageNumber = state.session.pageIndex + 1;
  const page = state.data.pages[0];

  if (state.session.ayahIndex < page.ayat.length - 1) {
    state.session.ayahIndex++;
    render();
    return;
  }

  if (pageNumber < state.data.totalPages) {
    const targetPage = pageNumber + 1;
    await loadPage(targetPage);
  }
}

async function jumpToPage(num) {
  const target = clamp(num, 1, state.data.totalPages);
  await loadPage(target);
}

// Actions
async function copyAyah() { /* same as before */ }
function shareAyah() { /* same as before */ }
function toggleBookmark() { /* same as before */ }

// Toast
function toast(message) { /* same as before */ }

// Event bindings
function bindEvents() {
  el.prevPage.addEventListener('click', () => goPrev());
  el.nextPage.addEventListener('click', () => goNext());
  el.jumpBtn.addEventListener('click', () => {
    const val = parseInt(el.pageInput.value, 10);
    if (!Number.isNaN(val)) jumpToPage(val);
  });
  el.pageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = parseInt(el.pageInput.value, 10);
      if (!Number.isNaN(val)) jumpToPage(val);
    }
  });

  el.copyBtn.addEventListener('click', copyAyah);
  el.shareBtn.addEventListener('click', shareAyah);
  el.bookmarkBtn.addEventListener('click', toggleBookmark);

  el.toggleArabic.addEventListener('click', () => {
    state.settings.showArabic = !state.settings.showArabic;
    render();
  });

  el.toggleTransliteration.addEventListener('click', () => {
    state.settings.showTransliteration = !state.settings.showTransliteration;
    render();
  });

  el.toggleTheme.addEventListener('click', () => {
    state.settings.theme = 'day';
    applyTheme();
    render();
  });

  el.resetBtn.addEventListener('click', async () => {
    localStorage.removeItem(persistKey);
    state.session.pageIndex = 0;
    state.session.ayahIndex = 0;
    state.session.bookmarks = new Set();
    state.settings = { showArabic: true, showTransliteration: false, theme: 'day' };
    applyTheme();
    await loadPage(1);
    toast('Session reset');
  });

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'ArrowRight') goNext();
  });
}

// Init
(async function init() {
  loadSession();
  bindEvents();
  applyTheme();

  // Try to get total pages from Firestore helper
  try {
    const total = await getPageCount();
    if (typeof total === 'number' && total > 0) {
      state.data.totalPages = total;
    }
  } catch {
    // keep fallback 604
  }

  await loadPage((state.session.pageIndex || 0) + 1);
})();
