// seedQuran.js
// Usage examples:
//   node seedQuran.js quran.page.1.json
//   node seedQuran.js quran.page.1.json quran.page.2.json quran.pages.json

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

if (process.argv.length < 3) {
  console.error('❌ Please provide one or more JSON files containing Quran pages.');
  console.error('   Example: node seedQuran.js quran.page.1.json quran.page.2.json');
  process.exit(1);
}

const serviceAccount = require('./iquran.json'); // your Firebase service account

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

async function seedPages(pages) {
  const batchSize = 400;
  let batch = db.batch();
  let count = 0;

  for (const page of pages) {
    if (!page.pageNumber || !Array.isArray(page.ayat)) {
      console.warn(`⚠️ Skipping invalid page:`, page.pageNumber);
      continue;
    }

    const docRef = db.collection('pages').doc(String(page.pageNumber));

    const normalizedAyat = page.ayat.map((a, i) => ({
      ayahNumber: a.ayahNumber ?? i + 1,
      arabic: a.arabic ?? '',
      english: a.english ?? '',
      transliteration: a.transliteration ?? '',
      audioUrl: a.audioUrl ?? '',
      tags: Array.isArray(a.tags) ? a.tags : [],
    }));

    batch.set(docRef, {
      pageNumber: page.pageNumber,
      juz: page.juz ?? null,
      surahNumber: page.surahNumber ?? null,
      surahName: page.surahName ?? '',
      ayat: normalizedAyat,
    });

    count++;
    if (count % batchSize === 0) {
      await batch.commit();
      console.log(`✅ Committed ${count} pages so far...`);
      batch = db.batch();
    }
  }

  if (count % batchSize !== 0) {
    await batch.commit();
    console.log(`✅ Committed final batch. Total pages: ${count}`);
  }
}

async function main() {
  let totalPages = 0;

  for (let i = 2; i < process.argv.length; i++) {
    const dataPath = process.argv[i];
    const absPath = path.resolve(dataPath);

    console.log(`📖 Loading file: ${absPath}`);
    const raw = fs.readFileSync(absPath, 'utf8');
    let pages = JSON.parse(raw);

    if (!Array.isArray(pages)) {
      pages = [pages]; // wrap single object
    }

    await seedPages(pages);
    totalPages += pages.length;
  }

  console.log(`🎉 Seeding complete. Total pages processed: ${totalPages}`);
}

main().catch(err => {
  console.error('❌ Error during seeding:', err);
  process.exit(1);
});
