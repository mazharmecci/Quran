// app.js
// Quran Learning — Premium Reader
// Modular state, clean rendering, and brand-consistent polish.

const state = {
  settings: {
    showArabic: true,
    showTransliteration: false,
    theme: 'night', // 'night' | 'day'
  },
  session: {
    pageIndex: 0, // zero-based
    ayahIndex: 0, // ayah within current page
    bookmarks: new Set(),
  },
  // Demo dataset: page-by-page with ayah-per-card.
  // Replace with real data loader (e.g., Firestore or static JSON).
  data: {
    pages: [
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
    ],
  },
};

// DOM refs
const el = {
  toggleArabic: document.getElementById('toggleArabic'),
  toggleTransliteration: document.getElementById('toggleTransliteration'),
  toggleTheme: document.getElementById('toggleTheme'),
  prevPage: document.getElementById('prevPage'),
  nextPage: document.getElementById('nextPage'),
  pageLabel: document.getElementById('pageLabel'),
  pageCount: document.getElementById('pageCount'),
  ayahCard: document.getElementById('ayahCard'),
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
  } catch {
    // ignore
  }
}

// Theme
  state.settings.theme = 'day';
  function applyTheme() {
    document.body.style.background =
      'radial-gradient(1200px 800px at 20% -10%, #f0f6fb 0%, #f3f7fb 40%, #eef4fa 100%)';
    el.toggleTheme.textContent = 'Theme: Day';
    el.toggleTheme.setAttribute('aria-pressed', 'false');
  }

// Rendering
function render() {
  const pages = state.data.pages;
  const pageIndex = clamp(state.session.pageIndex, 0, pages.length - 1);
  const page = pages[pageIndex];

  // Page indicator
  el.pageLabel.textContent = `Page ${page.pageNumber}`;
  el.pageCount.textContent = `of ${pages.length}`;

  // Surah meta
  el.surahMeta.textContent = `Surah ${page.surahNumber} • ${page.surahName}`;
  el.ayahMeta.textContent = `Juz ${page.juz} • Page ${page.pageNumber}`;

  // Ayah selection (one ayah per card)
  const ayahIndex = clamp(state.session.ayahIndex, 0, page.ayat.length - 1);
  const ayah = page.ayat[ayahIndex];

  el.ayahRef.textContent = `Surah ${page.surahNumber} • ${page.surahName} — Ayah ${ayah.ayahNumber}`;

  // English text
  el.ayahTextEn.textContent = ayah.english;

  // Arabic visibility
  if (state.settings.showArabic) {
    el.ayahTextAr.style.display = 'block';
    el.ayahTextAr.textContent = ayah.arabic;
    el.toggleArabic.textContent = 'Arabic: On';
    el.toggleArabic.setAttribute('aria-pressed', 'true');
  } else {
    el.ayahTextAr.style.display = 'none';
    el.ayahTextAr.textContent = '';
    el.toggleArabic.textContent = 'Arabic: Off';
    el.toggleArabic.setAttribute('aria-pressed', 'false');
  }

  // Transliteration (inline hint below English)
  const existingTrans = document.getElementById('ayahTrans');
  if (existingTrans) existingTrans.remove();
  if (state.settings.showTransliteration) {
    const trans = document.createElement('div');
    trans.id = 'ayahTrans';
    trans.style.marginTop = '8px';
    trans.style.color = '#cfd7e3';
    trans.style.fontSize = '16px';
    trans.style.letterSpacing = '0.2px';
    trans.textContent = ayah.transliteration;
    el.ayahTextEn.insertAdjacentElement('afterend', trans);
    el.toggleTransliteration.textContent = 'Transliteration: On';
    el.toggleTransliteration.setAttribute('aria-pressed', 'true');
  } else {
    el.toggleTransliteration.textContent = 'Transliteration: Off';
    el.toggleTransliteration.setAttribute('aria-pressed', 'false');
  }

  // Progress
  el.progressText.textContent = `Ayah ${ayahIndex + 1} of ${page.ayat.length}`;
  const totalAyat = pages.reduce((sum, p) => sum + p.ayat.length, 0);
  const readIndex = pages.slice(0, pageIndex).reduce((sum, p) => sum + p.ayat.length, 0) + ayahIndex;
  const percent = totalAyat ? readIndex / totalAyat : 0;
  el.readerProgress.textContent = `${formatPercent(percent)} read`;

  // Buttons state
  el.prevPage.disabled = pageIndex === 0 && ayahIndex === 0;
  el.nextPage.disabled = pageIndex === pages.length - 1 && ayahIndex === page.ayat.length - 1;

  saveSession();
}

// Navigation
function goPrev() {
  const pages = state.data.pages;
  let p = state.session.pageIndex;
  let a = state.session.ayahIndex;

  if (a > 0) {
    state.session.ayahIndex = a - 1;
  } else if (p > 0) {
    state.session.pageIndex = p - 1;
    state.session.ayahIndex = pages[p - 1].ayat.length - 1;
  }
  render();
}
function goNext() {
  const pages = state.data.pages;
  let p = state.session.pageIndex;
  let a = state.session.ayahIndex;

  if (a < pages[p].ayat.length - 1) {
    state.session.ayahIndex = a + 1;
  } else if (p < pages.length - 1) {
    state.session.pageIndex = p + 1;
    state.session.ayahIndex = 0;
  }
  render();
}
function jumpToPage(num) {
  const pages = state.data.pages;
  const idx = clamp(num - 1, 0, pages.length - 1);
  state.session.pageIndex = idx;
  state.session.ayahIndex = 0;
  render();
}

// Actions
async function copyAyah() {
  const pages = state.data.pages;
  const page = pages[state.session.pageIndex];
  const ayah = page.ayat[state.session.ayahIndex];
  const text = [
    `Surah ${page.surahNumber} • ${page.surahName} — Ayah ${ayah.ayahNumber}`,
    ayah.english,
    state.settings.showArabic ? ayah.arabic : null,
    state.settings.showTransliteration ? ayah.transliteration : null,
  ].filter(Boolean).join('\n\n');
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied ayah to clipboard');
  } catch {
    toast('Copy failed—your browser blocked clipboard access');
  }
}
function shareAyah() {
  const pages = state.data.pages;
  const page = pages[state.session.pageIndex];
  const ayah = page.ayat[state.session.ayahIndex];
  const shareData = {
    title: `Ayah ${ayah.ayahNumber} — ${page.surahName}`,
    text: ayah.english,
    url: location.href,
  };
  if (navigator.share) {
    navigator.share(shareData).catch(() => {});
  } else {
    copyAyah();
  }
}
function toggleBookmark() {
  const key = `${state.session.pageIndex}:${state.session.ayahIndex}`;
  if (state.session.bookmarks.has(key)) {
    state.session.bookmarks.delete(key);
    toast('Bookmark removed');
  } else {
    state.session.bookmarks.add(key);
    toast('Bookmarked ayah');
  }
  saveSession();
}

// Toast (minimal, non-intrusive)
let toastTimer = null;
function toast(message) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.position = 'fixed';
    t.style.bottom = '20px';
    t.style.left = '50%';
    t.style.transform = 'translateX(-50%)';
    t.style.padding = '10px 14px';
    t.style.borderRadius = '12px';
    t.style.background = 'rgba(20,26,34,0.9)';
    t.style.border = '1px solid rgba(255,255,255,0.08)';
    t.style.color = '#e8edf4';
    t.style.fontSize = '13px';
    t.style.boxShadow = '0 10px 24px rgba(0,0,0,0.35)';
    t.style.zIndex = '100';
    document.body.appendChild(t);
  }
  t.textContent = message;
  t.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.opacity = '0'; }, 1600);
}

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
    state.settings.theme = state.settings.theme === 'night' ? 'day' : 'night';
    applyTheme();
    render();
  });

  el.resetBtn.addEventListener('click', () => {
    localStorage.removeItem(persistKey);
    state.session.pageIndex = 0;
    state.session.ayahIndex = 0;
    state.session.bookmarks = new Set();
    state.settings = { showArabic: true, showTransliteration: false, theme: 'night' };
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
(function init() {
  loadSession();
  bindEvents();
  applyTheme();
  // Page count label
  el.pageCount.textContent = `of ${state.data.pages.length}`;
  render();
})();
