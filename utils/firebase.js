import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// SUBSTITUI estes valores pelo teu firebaseConfig do Firebase Console:
// Firebase Console → Definições do projeto → As tuas apps → Web → SDK setup
// ─────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: 'AIzaSyB6fdkIhTXGB7TdbUyg7xhQ_6D2qpzQJ_E',
  authDomain: 'tripsplit-69c8d.firebaseapp.com',
  projectId: 'tripsplit-69c8d',
  storageBucket: 'tripsplit-69c8d.firebasestorage.app',
  messagingSenderId: '927132450855',
  appId: '1:927132450855:web:804eb3e2339868da104e02',
};

const app = initializeApp(firebaseConfig);

// Usa AsyncStorage para persistir a sessão entre reinícios da app
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
});
