
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCgUrOfbvQj9SoL8gjrRzb5MXTi6pZEkzA",
  authDomain: "minhasapostaspro.firebaseapp.com",
  projectId: "minhasapostaspro",
  storageBucket: "minhasapostaspro.firebasestorage.app",
  messagingSenderId: "502045078642",
  appId: "1:502045078642:web:b5366b7a43f91911f87eeb"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
