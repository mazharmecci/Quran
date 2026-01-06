// seedQuran.js
// Usage: node seedQuran.js path/to/quran-pages.json

const fs = require('fs');
const admin = require('firebase-admin');

if (process.argv.length < 3) {
  console.error('Provide path to quran-pages.json');
  process.exit(1);
}

const dataPath = process.argv[2];
const serviceAccount = require('./iquran.json'); // rename your downloaded JSON

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

async function seedPages(pages) {
  const batchSize = 400; // safe batch size
  let batch = db.batch();
  let count = 0;

  for (const page of pages) {
    const docRef = db.collection('pages').doc(String(page.pageNumber));
    // Validate minimal fields
    if (!page.pageNumber || !page.ayat || !Array.isArray(page.ayat)) {
      console.warn(`Skipping invalid page:`, page.pageNumber);
      continue;
    }
    // Normalize ayat fields
    const normalizedAyat = page.ayat.map(a => ({
      ayahNumber: a.ayahNumber,
      arabic: a.arabic,
      english: a.english,
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
      console.log(`Committed ${count} pages...`);
      batch = db.batch();
    }
  }

  if (count % batchSize !== 0) {
    await batch.commit();
    console.log(`Committed final batch. Total pages: ${count}`);
  }
}

async function main() {
  const raw = fs.readFileSync(dataPath, 'utf8');
  const pages = JSON.parse(raw);

  if (!Array.isArray(pages)) {
    throw new Error('JSON must be an array of page objects');
  }

  await seedPages(pages);
  console.log('Seeding complete.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
