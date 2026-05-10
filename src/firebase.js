// firebase.js placeholder - add your firebase config here

// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
  import {
    getFirestore,
    collection,
    addDoc,
    doc,
    getDoc,
    getDocs,
    setDoc,
    query,
    where,
    orderBy,
    updateDoc,
    onSnapshot,
  } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDlVIUn4_4Pp_qvHV4m-RRc7rAutMiQIfs",
  authDomain: "d-r-y-8a3e5.firebaseapp.com",
  projectId: "d-r-y-8a3e5",
  storageBucket: "d-r-y-8a3e5.firebasestorage.app",
  messagingSenderId: "233794678109",
  appId: "1:233794678109:web:e936010605166668de4cb4",
  measurementId: "G-GL5ZFDLVV8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  updateDoc,
  onSnapshot
};