import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-storage.js";

// Usamos la configuración con las claves directamente en el código.
const firebaseConfig = {
  apiKey: "AIzaSyAc67SnyZbFNUx87O2tG5w2i03XrNVjh1U",
  authDomain: "life--plants-app.firebaseapp.com",
  projectId: "life--plants-app",
  storageBucket: "life--plants-app.firebasestorage.app",
  messagingSenderId: "417038226730",
  appId: "1:417038226730:web:d0ac86a563c2a34380ba53",
  measurementId: "G-809BLBFNPP"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage, app };