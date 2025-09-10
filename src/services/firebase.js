import { initializeApp } from 'firebase/app';
// Google 인증에 필요한 모듈들을 가져옵니다.
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/* global __firebase_config */ // ESLint에게 Canvas 환경의 전역 변수를 알려줍니다.

// Canvas 환경이 아닐 경우 (로컬 개발 환경), .env 파일에서 환경 변수를 사용합니다.
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
const db = getFirestore(app);
const auth = getAuth(app);

// Google 인증 제공자 인스턴스를 생성합니다.
const googleProvider = new GoogleAuthProvider();

// 생성된 인스턴스들을 다른 파일에서 사용할 수 있도록 export 합니다.
export { db, auth, googleProvider, signInWithPopup, signOut };
