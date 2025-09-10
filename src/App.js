import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './services/firebase';

import { LoginScreen } from './components/LoginScreen';
import { CalendarPage } from './components/CalendarPage';

/**
 * @file App.js
 * @description
 * 애플리케이션의 메인 컨트롤 타워 역할을 하는 최상위 컴포넌트입니다.
 * 사용자의 인증 상태를 감지하고, 그에 따라 로그인 화면 또는 개인 캘린더 페이지를 렌더링합니다.
 * 최초 로그인 시 사용자의 캘린더를 자동으로 생성합니다.
 */
function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 컴포넌트 마운트 시 사용자의 로그인 상태를 구독합니다.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 사용자가 로그인한 경우, 해당 사용자의 캘린더가 있는지 확인하고 없으면 생성합니다.
        await checkAndCreateCalendarForUser(firebaseUser);
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe(); // 클린업 함수로 구독 해제
  }, []);

  /**
   * 신규 사용자를 위해 캘린더와 기본 데이터를 생성하는 함수
   * @param {object} firebaseUser - Firebase Auth에서 받은 사용자 객체
   */
  const checkAndCreateCalendarForUser = async (firebaseUser) => {
    const calendarDocRef = doc(db, 'calendars', firebaseUser.uid);
    const calendarDocSnap = await getDoc(calendarDocRef);

    // 해당 유저의 캘린더가 존재하지 않으면 새로 생성합니다.
    if (!calendarDocSnap.exists()) {
      console.log(`새 사용자(${firebaseUser.email})를 위한 캘린더를 생성합니다.`);
      try {
        // 캘린더 문서 생성
        await setDoc(calendarDocRef, {
          ownerUid: firebaseUser.uid,
          ownerName: firebaseUser.displayName,
          createdAt: serverTimestamp(),
        });

        // 캘린더 하위에 'legends'(범례) 서브컬렉션 생성 및 기본 데이터 추가
        const legendsCollectionRef = collection(db, 'calendars', firebaseUser.uid, 'legends');
        await addDoc(legendsCollectionRef, { name: '중요', color: '#ef4444' });
        await addDoc(legendsCollectionRef, { name: '휴가', color: '#22c55e' });
        await addDoc(legendsCollectionRef, { name: '회의', color: '#3b82f6' });

      } catch (error) {
        console.error("캘린더 자동 생성 중 에러:", error);
      }
    }
  };

  /**
   * 현재 URL 경로를 기반으로 렌더링할 컴포넌트를 결정합니다.
   */
  const renderContent = () => {
    if (isLoading) {
      return <div className="w-full h-screen flex justify-center items-center"><p>로딩 중...</p></div>;
    }

    if (!user) {
      // 로그아웃 상태이면 항상 로그인 화면을 보여줍니다.
      return <LoginScreen />;
    }

    // 로그인 상태이면 URL 경로에 따라 적절한 페이지를 보여줍니다.
    const path = window.location.pathname;
    
    if (path.startsWith('/c/')) {
      const calendarId = path.split('/c/')[1].split('/')[0];
      if (calendarId) {
        // 특정 캘린더 ID로 접근한 경우, 해당 캘린더 페이지를 렌더링합니다.
        // CalendarPage에 현재 로그인된 user 객체를 props로 넘겨주어 소유권 확인에 사용합니다.
        return <CalendarPage calendarId={calendarId} user={user} />;
      }
    }
    
    // 기본 경로('/')로 접근했거나 유효하지 않은 경로인 경우,
    // 로그인한 사용자 자신의 캘린더로 리디렉션합니다.
    // 페이지를 새로고침하지 않고 URL만 변경하기 위해 history.replaceState를 사용합니다.
    window.history.replaceState({}, '', `/c/${user.uid}`);
    return <CalendarPage calendarId={user.uid} user={user} />;
  };

  return renderContent();
}

export default App;
