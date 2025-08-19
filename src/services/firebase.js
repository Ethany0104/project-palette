import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/* global __firebase_config */ // ESLint에게 Canvas 환경의 전역 변수를 알려줍니다.
const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : {
      apiKey: process.env.REACT_APP_API_KEY,
      authDomain: process.env.REACT_APP_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_PROJECT_ID,
      storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_APP_ID,
      measurementId: process.env.REACT_APP_MEASUREMENT_ID
    };

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);