import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration
// Replace these with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyAguqSW6KK892KVQZ-jWwK8VAYkAGm8ftA",
  authDomain: "anchorpoint-application.firebaseapp.com",
  projectId: "anchorpoint-application",
  storageBucket: "anchorpoint-application.firebasestorage.app",
  messagingSenderId: "885746233140",
  appId: "1:885746233140:web:458abf422b478bebc97f61",
  measurementId: "G-91G5K7ZBMD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;