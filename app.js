// app.js — Quran Learning Premium Reader (cyan-blue theme)

const state = {
  settings: {
    showArabic: true,
    showTransliteration: false,
    theme: 'day', // default cyan-blue theme
  },
  session: {
    pageIndex: 0,
    ayahIndex: 0,
    bookmarks: new Set(),
  },
  data: {
    pages: [], // will be loaded from Firestore or JSON
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
  el.pageLabel.textContent = `Page ${page.pageNumber}`;
  el.pageCount.textContent = `of ${state.data.pages.length}`;
  el.surahMeta.textContent = `Surah ${page.surahNumber} • ${page.surahName}`;
  el.ayahMeta.textContent = `Juz ${page.juz} • Page ${page.pageNumber}`;
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
  const pages = state.data.pages;
  const page = pages[pageIndex];
  el.progressText.textContent = `Ayah ${ayahIndex + 1} of ${page.ayat.length}`;
  const totalAyat = pages.reduce((sum, p) => sum + p.ayat.length, 0);
  const readIndex = pages.slice(0, pageIndex).reduce((sum, p) => sum + p.ayat.length, 0) + ayahIndex;
  const percent = totalAyat ? readIndex / totalAyat : 0;
  el.readerProgress.textContent = `${formatPercent(percent)} read`;
}

function render() {
  const pages = state.data.pages;
  const pageIndex = clamp(state.session.pageIndex, 0, pages.length - 1);
  const page = pages[pageIndex];
  const ayahIndex = clamp(state.session.ayahIndex, 0, page.ayat.length - 1);

  renderMeta(page);
  renderAyah(page, ayahIndex);
  renderProgress(pageIndex, ayahIndex);

  el.prevPage.disabled = pageIndex === 0 && ayahIndex === 0;
  el.nextPage.disabled = pageIndex === pages.length - 1 && ayahIndex === page.ayat.length - 1;

  saveSession();
}

// Navigation
function goPrev() {
  if (state.session.ayahIndex > 0) {
    state.session.ayahIndex--;
  } else if (state.session.pageIndex > 0) {
    state.session.pageIndex--;
    state.session.ayahIndex = state.data.pages[state.session.pageIndex].ayat.length - 1;
  }
  render();
}
function goNext() {
  const page = state.data.pages[state.session.pageIndex];
  if (state.session.ayahIndex < page.ayat.length - 1) {
    state.session.ayahIndex++;
  } else if (state.session.pageIndex < state.data.pages.length - 1) {
    state.session.pageIndex++;
    state.session.ayahIndex = 0;
  }
  render();
}
function jumpToPage(num) {
  const idx = clamp(num - 1, 0, state.data.pages.length - 1);
  state.session.pageIndex = idx;
  state.session.ayahIndex = 0;
  render();
}

// Actions
async function copyAyah() { /* same as before */ }
function shareAyah() { /* same as before */ }
function toggleBookmark() { /* same as before */ }

// Toast
function toast(message) { /* same as before */ }

// Event bindings
function bindEvents() {
  el.prevPage.addEventListener('click', goPrev);
  el.nextPage.addEventListener('click', goNext);
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
    // For now we keep only cyan-blue "day" theme
    state.settings.theme = 'day';
    applyTheme();
    render();
  });

  el.resetBtn.addEventListener('click', () => {
    localStorage.removeItem(persistKey);
    state.session.pageIndex = 0;
    state.session.ayahIndex = 0;
    state.session.bookmarks = new Set();
    state.settings = { showArabic: true, showTransliteration: false, theme: 'day' };
    applyTheme();
    render();
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

  // Demo data for now — replace with Firestore loader
  state.data.pages = [
    {
      pageNumber: 1,
      surahNumber: 1,
      surahName: 'Al-Fatihah',
      juz: 1,
      ayat: [
        {
          ayahNumber: 1,
          arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
          english: 'In the name of Allah—the Most Compassionate, Most Merciful.',
          transliteration: 'Bismi Allāhi ar-Raḥmāni ar-Raḥīm',
        },
        {
          ayahNumber: 2,
          arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
          english: 'All praise is for Allah—Lord of all worlds,',
          transliteration: 'Al-ḥamdu lillāhi rabbi l-ʿālamīn',
        },
      ],
    },
    {
      pageNumber: 2,
      surahNumber: 1,
      surahName: 'Al-Fatihah',
      juz: 1,
      ayat: [
        {
          ayahNumber: 3,
          arabic: 'الرَّحْمَٰنِ الرَّحِيمِ',
          english: 'the Most Compassionate, Most Merciful,',
          transliteration: 'Ar-Raḥmāni ar-Raḥīm',
        },
        {
          ayahNumber: 4,
          arabic: 'مَالِكِ يَوْمِ الدِّينِ',
          english: 'Master of the Day of Judgment.',
          transliteration: 'Māliki yawmi d-dīn',
        },
      ],
    },
  ];

  el.pageCount.textContent = `of ${state.data.pages.length}`;
  render();
})();
