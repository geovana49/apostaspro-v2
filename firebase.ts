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

import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from "firebase/firestore";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.info("[Firebase] Inicializando cache single-tab para projeto:", firebaseConfig.projectId);

// Initialize Firebase services
export const auth = getAuth(app);
export const storage = getStorage(app);

// [STABLE] Usa protocolos modernos para velocidade e Single-Tab para evitar travas de lock
// Nota: ForceLongPolling ativado para maior resiliência em redes móveis instáveis
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager(),
    cacheSizeBytes: 100 * 1024 * 1024 // 100MB limit for better mobile performance
  }),
  experimentalForceLongPolling: true
});

export default app;
