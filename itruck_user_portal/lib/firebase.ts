import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA8KcsfoLaardz3YxcVVTWM9FK57LYQnkY",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "trucks99-d90e5",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "trucks99-d90e5.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "717941782466",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:717941782466:web:d87b98d3b7692131234abc",
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const getFirebaseMessaging = async () => {
  if (typeof window === "undefined") return null;
  
  try {
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
  } catch (error) {
    console.error("Firebase messaging not supported:", error);
  }
  return null;
};
