// firestore.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCJpTl4RkE0xpnYI1sbw4FiHVLW1v5rDt4",
  authDomain: "iquran-353f8.firebaseapp.com",
  projectId: "iquran-353f8",
  storageBucket: "iquran-353f8.firebasestorage.app",
  messagingSenderId: "26234939648",
  appId: "1:26234939648:web:019850134557d210306be5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function getPage(pageNumber) {
  const ref = doc(db, 'pages', String(pageNumber));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

export async function getPageCount() {
  // If you store total pages in a config doc, read it here.
  // Otherwise, hardcode 604 or maintain a `surahs` index.
  return 604;
}
