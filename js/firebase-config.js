import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAc67SnyZbFNUx87O2tG5w2i03XrNVjh1U",
  authDomain: "life--plants-app.firebaseapp.com",
  projectId: "life--plants-app",
  storageBucket: "life--plants-app.firebasestorage.app",
  messagingSenderId: "417038226730",
  appId: "1:417038226730:web:d0ac86a563c2a34380ba53",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };