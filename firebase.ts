import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCgUrOfbvQj9SoL8gjrRzb5MXTi6pZEkzA",
  authDomain: "minhasapostaspro.firebaseapp.com",
  projectId: "minhasapostaspro",
  storageBucket: "minhasapostaspro.firebasestorage.app",
  messagingSenderId: "502045078642",
  appId: "1:502045078642:web:b5366b7a43f91911f87eeb"
};

import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
    cacheSizeBytes: 50 * 1024 * 1024 // 50MB limit
  })
});

export default app;
