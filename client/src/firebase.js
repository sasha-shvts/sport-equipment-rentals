import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAJUEr4yBWq4iMheDIfjKe-7SJ9dTtbjvg",
  authDomain: "sportrent-5cf71.firebaseapp.com",
  projectId: "sportrent-5cf71",
  storageBucket: "sportrent-5cf71.firebasestorage.app",
  messagingSenderId: "567010790959",
  appId: "1:567010790959:web:31b9c8391b0b107002cef6",
  measurementId: "G-WHNS517H98"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;