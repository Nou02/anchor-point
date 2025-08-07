import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration
// Replace these with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyA_JWaNHkylrHexzQqmMdqK96_TsekcUec",
  authDomain: "anchorpoint-application-e0322.firebaseapp.com",
  projectId: "anchorpoint-application-e0322",
  storageBucket: "anchorpoint-application-e0322.firebasestorage.app",
  messagingSenderId: "16995630285",
  appId: "1:16995630285:web:7b6258575d6b459ff8fd84",
  measurementId: "G-YDBDDESKBE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;