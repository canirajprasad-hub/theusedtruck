import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyC0bOkxkpGnd09A7P2j8h6w23qwlTuwsaI",
  authDomain: "theusedtruck-23744.firebaseapp.com",
  projectId: "theusedtruck-23744",
  storageBucket: "theusedtruck-23744.firebasestorage.app",
  messagingSenderId: "768793247559",
  appId: "1:768793247559:web:3f0ab356b5bc4cf3b09662"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
