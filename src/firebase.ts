import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "",
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || "",
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID || ""
};

const app = initializeApp(firebaseConfig);
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);


