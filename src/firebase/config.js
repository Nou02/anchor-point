import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration
// Replace these with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyCutUNST9077qJMd4wl2cx4fp2w7A6vdk8",
  authDomain: "apwebapp-4d1cd.firebaseapp.com",
  projectId: "apwebapp-4d1cd",
  storageBucket: "apwebapp-4d1cd.firebasestorage.app",
  messagingSenderId: "983336254442",
  appId: "1:983336254442:web:b65e3d6583e2f964961093",
  measurementId: "G-MDK1LF97B0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;