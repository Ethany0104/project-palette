import React, { useState, useEffect } from 'react';
// onAuthStateChanged를 통해 사용자의 로그인 상태를 실시간으로 감지합니다.
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
// signOut 함수를 가져와 로그아웃 기능에 사용합니다.
import { db, auth, signOut } from '../services/firebase';

import { LoginScreen } from './LoginScreen';
import { CalendarView } from './CalendarView';
import { MemoPanel } from './MemoPanel';
import { AllModals } from './AllModals';

/**
 * @file CalendarPage.js
 * @description
 * 캘린더의 메인 페이지. Google 인증 상태를 확인하고, 권한이 있는 경우에만 캘린더를 보여줍니다.
 * @param {object} props - 컴포넌트 props
 * @param {string} props.calendarId - 표시할 캘린더의 Firestore 문서 ID
 */
export function CalendarPage({ calendarId }) {
  // --- 상태 관리 ---
  const [user, setUser] = useState(null); // Firebase Auth에서 받아온 사용자 정보
  const [isAuthorized, setIsAuthorized] = useState(false); // 현재 사용자가 캘린더에 접근 권한이 있는지 여부
  const [isLoading, setIsLoading] = useState(true); // 인증 및 권한 확인 로딩 상태
  const [userName, setUserName] = useState(''); // 현재 사용자의 이름

  const [currentDate, setCurrentDate] = useState(new Date());
  const [legends, setLegends] = useState([]);
  const [events, setEvents] = useState([]);
  
  const [isLegendModalOpen, setLegendModalOpen] = useState(false);
  const [isEventDetailModalOpen, setEventDetailModalOpen] = useState(false);
  const [isLegendPanelModalOpen, setLegendPanelModalOpen] = useState(false);
  
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventMemo, setEventMemo] = useState('');
  const [selectionRange, setSelectionRange] = useState({ start: null, end: null });

  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // --- useEffect 훅 ---
  
  // 컴포넌트 마운트 시 Firebase의 인증 상태 변경을 감지하는 리스너 설정
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 사용자가 로그인되어 있으면, 캘린더 접근 권한이 있는지 확인
        setUser(firebaseUser);
        await checkAuthorization(firebaseUser);
      } else {
        // 사용자가 로그아웃 상태이면, 모든 관련 상태 초기화
        setUser(null);
        setIsAuthorized(false);
        setIsLoading(false);
      }
    });

    return () => unsubscribe(); // 컴포넌트 언마운트 시 리스너 정리
  }, [calendarId]);

  // 사용자가 권한을 얻었을 때 (isAuthorized가 true일 때) 캘린더 데이터(범례, 이벤트)를 구독
  useEffect(() => {
    if (!calendarId || !isAuthorized) {
        // 데이터 구독 중지 (예: 로그아웃 시)
        setLegends([]);
        setEvents([]);
        return;
    };

    // 범례 데이터 실시간 구독
    const unsubLegends = onSnapshot(collection(db, 'calendars', calendarId, 'legends'), (snapshot) => {
        setLegends(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    // 이벤트 데이터 실시간 구독
    const unsubEvents = onSnapshot(collection(db, 'calendars', calendarId, 'events'), (snapshot) => {
        setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { 
        unsubLegends(); 
        unsubEvents(); 
    };
  }, [calendarId, isAuthorized]);

  // --- 함수 ---

  /**
   * 사용자가 이 캘린더에 접근할 권한이 있는지 확인하는 함수.
   * @param {object} firebaseUser - Firebase Auth에서 받은 사용자 객체
   */
  const checkAuthorization = async (firebaseUser) => {
    setIsLoading(true);
    try {
        const userDocRef = doc(db, 'calendars', calendarId, 'allowedUsers', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
            setIsAuthorized(true);
            setUserName(userDocSnap.data().name || firebaseUser.displayName); // Firestore에 저장된 이름 우선 사용
        } else {
            setIsAuthorized(false);
        }
    } catch (error) {
        console.error("권한 확인 중 에러:", error);
        setIsAuthorized(false);
    } finally {
        setIsLoading(false);
    }
  };

  /**
   * LoginScreen에서 로그인 성공 시 호출되는 콜백.
   * @param {object} authorizedUserData - Firestore의 allowedUsers에서 가져온 사용자 데이터
   */
  const handleLoginSuccess = (authorizedUserData) => {
    setIsAuthorized(true);
    setUserName(authorizedUserData.name);
    // onAuthStateChanged가 이미 user 상태를 설정했으므로 여기서는 권한 상태만 갱신
  };
  
  /**
   * 로그아웃 버튼 클릭 시 실행되는 핸들러.
   */
  const handleLogout = async () => {
      try {
          await signOut(auth);
          // onAuthStateChanged 리스너가 나머지 상태(user, isAuthorized 등)를 자동으로 처리
      } catch (error) {
          console.error("로그아웃 에러:", error);
      }
  };

  const requestConfirm = (title, message, onConfirm) => setConfirmModal({ isOpen: true, title, message, onConfirm });
  const closeConfirmModal = () => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const handleConfirm = () => { if(confirmModal.onConfirm) confirmModal.onConfirm(); closeConfirmModal(); };

  const handleDateClick = (fullDate) => {
    if (!fullDate) return;
    if (!selectionRange.start) {
      setSelectionRange({ start: fullDate, end: null });
    } else if (selectionRange.start && !selectionRange.end) {
      let start = selectionRange.start; let end = fullDate;
      if (new Date(end) < new Date(start)) [start, end] = [end, start];
      setSelectionRange({ start, end });
      if (isEditingEvent && editingEvent) handleUpdateEvent({ ...editingEvent, startDate: start, endDate: end });
      else setLegendModalOpen(true);
    } else {
      setSelectionRange({ start: fullDate, end: null });
    }
  };

  const handleLegendSelect = async (legendId) => {
    if (!calendarId || !selectionRange.start || !selectionRange.end) return;
    try {
      await addDoc(collection(db, 'calendars', calendarId, 'events'), {
        startDate: selectionRange.start, endDate: selectionRange.end, legendId, memo: '', createdBy: userName, createdAt: serverTimestamp()
      });
      setLegendModalOpen(false);
      setSelectionRange({ start: null, end: null });
    } catch (error) { console.error("일정 추가 중 에러:", error); }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setEventMemo(event.memo || '');
    setEventDetailModalOpen(true);
  };
  
  const handleSaveMemo = async () => {
    if (!calendarId || !selectedEvent) return;
    try {
      await updateDoc(doc(db, 'calendars', calendarId, 'events', selectedEvent.id), { memo: eventMemo });
      setEventDetailModalOpen(false);
      setSelectedEvent(null);
    } catch (error) { console.error("메모 저장 중 에러:", error); }
  };

  const handleDeleteEvent = () => {
    if (!calendarId || !selectedEvent) return;
    requestConfirm('일정 삭제 확인', '정말로 이 일정을 삭제하시겠습니까?', async () => {
      try {
        await deleteDoc(doc(db, 'calendars', calendarId, 'events', selectedEvent.id));
        setEventDetailModalOpen(false);
        setSelectedEvent(null);
      } catch (error) { console.error("일정 삭제 중 에러:", error); }
    });
  };

  const handleStartEditEvent = () => {
    setEditingEvent(selectedEvent);
    setIsEditingEvent(true);
    setEventDetailModalOpen(false);
    setSelectionRange({ start: null, end: null });
  };
  
  const handleUpdateEvent = async (updatedEventData) => {
    if (!calendarId || !editingEvent) return;
    try {
      await updateDoc(doc(db, 'calendars', calendarId, 'events', editingEvent.id), updatedEventData);
    } catch (error) { console.error("이벤트 업데이트 중 에러:", error); }
    finally {
      setIsEditingEvent(false); setEditingEvent(null); setSelectionRange({ start: null, end: null }); setSelectedEvent(null);
    }
  };

  const changeMonth = (delta) => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  
  // --- 렌더링 로직 ---

  if (isLoading) {
    return <div className="w-full h-screen flex justify-center items-center"><p>인증 정보를 확인하는 중...</p></div>;
  }
  
  // 사용자가 로그인 했고, 이 캘린더에 접근 권한이 있는 경우 캘린더 UI를 보여줌
  if (user && isAuthorized) {
    const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    return (
      <div className="bg-gray-50 min-h-screen font-sans p-4 sm:p-8 flex justify-center items-start" id="app-container">
        <div className="w-full max-w-7xl mx-auto bg-white p-4 sm:p-6 rounded-xl shadow-lg print:shadow-none print:p-0">
          <header className="flex flex-wrap justify-between items-center mb-6 print:hidden gap-y-4">
            <h1 className="text-3xl font-bold text-gray-800 w-full sm:w-auto order-1">🎨 Palette Calendar</h1>
            <div className="flex items-center gap-2 sm:gap-4 order-3 sm:order-2">
              <button onClick={() => changeMonth(-1)} className="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">&lt; 이전 달</button>
              <button onClick={() => changeMonth(1)} className="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">다음 달 &gt;</button>
            </div>
            <div className="flex items-center gap-2 order-2 sm:order-3 w-full sm:w-auto justify-between">
              <div className='flex items-center gap-2'>
                <button onClick={() => setLegendPanelModalOpen(true)} className="bg-indigo-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-indigo-600">범례 관리</button>
                <button onClick={() => window.print()} className="bg-green-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-green-600">인쇄</button>
              </div>
              <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 hidden sm:inline">환영합니다, {userName}님</span>
                  <button onClick={handleLogout} className="bg-gray-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-gray-600">로그아웃</button>
              </div>
            </div>
          </header>
          
          <main className="flex flex-col sm:flex-row sm:gap-6" id="main-content">
            <section id="calendar-container" className="w-full sm:w-1/2 flex-shrink-0 space-y-4">
              <CalendarView
                  date={currentDate} events={events} legends={legends} onDateClick={handleDateClick}
                  onEventClick={handleEventClick} selectionRange={selectionRange} isEditingEvent={isEditingEvent}
              />
              <CalendarView
                  date={nextMonthDate} events={events} legends={legends} onDateClick={handleDateClick}
                  onEventClick={handleEventClick} selectionRange={selectionRange} isEditingEvent={isEditingEvent}
              />
            </section>
            <section id="memo-container" className="w-full sm:w-1/2 flex-shrink-0 flex">
               <MemoPanel calendarId={calendarId} date={currentDate} />
            </section>
          </main>
        </div>

        {(selectionRange.start && !selectionRange.end) && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white p-4 rounded-lg shadow-2xl z-50 print:hidden animate-fade-in-up">
              <div>
                  <p className="font-semibold text-gray-800">{isEditingEvent ? '수정할 날짜의 시작일을 선택했습니다.' : '시작일: ' + selectionRange.start}</p>
                  <p className="text-sm text-gray-600">종료일을 선택하거나, 아래 버튼으로 취소하세요.</p>
              </div>
              <button onClick={() => { setSelectionRange({start: null, end: null}); setIsEditingEvent(false); setEditingEvent(null); }} className="bg-red-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-red-600">선택 취소</button>
          </div>
        )}

        <AllModals 
          modals={{ confirmModal, isLegendModalOpen, isEventDetailModalOpen, isLegendPanelModalOpen }}
          handlers={{ closeConfirmModal, handleConfirm, setLegendModalOpen, setSelectionRange, handleLegendSelect, setEventDetailModalOpen, handleSaveMemo, handleStartEditEvent, handleUpdateEvent, handleDeleteEvent, setLegendPanelModalOpen, requestConfirm }}
          data={{ legends, selectedEvent, eventMemo, setEventMemo, calendarId }}
        />
        
        <style>{`
          @keyframes fade-in-up { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
          .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
          @media print { @page { size: A4 portrait; margin: 10mm; } body, #app-container { background-color: white !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .print\\:hidden { display: none !important; } #main-content { display: flex !important; flex-direction: row !important; align-items: stretch; justify-content: space-between !important; gap: 0 !important; width: 100%; height: 100%; } #calendar-container { width: 48% !important; display: flex !important; flex-direction: column !important; gap: 0.25rem !important; page-break-inside: avoid; } #memo-container { width: 48% !important; height: 100%; display: flex; padding: 0 !important; } .break-inside-avoid { break-inside: avoid; } .memo-panel-container { width: 100%; height: 100%; display: flex; flex-direction: column; break-inside: avoid; padding: 0 !important; margin: 0 !important; border: none !important; box-sizing: border-box; } .memo-panel-container .bg-gray-100, .memo-panel-content { border: none !important; box-shadow: none !important; border-radius: 0 !important; } }
        `}</style>
      </div>
    );
  }
  
  // 위 조건에 해당하지 않으면 (로그아웃 상태이거나, 권한이 없으면) 로그인 화면을 보여줌
  return <LoginScreen calendarId={calendarId} onLoginSuccess={handleLoginSuccess} />;
}
