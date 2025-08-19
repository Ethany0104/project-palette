import React, { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase';

import { LoginScreen } from './LoginScreen';
import { CalendarView } from './CalendarView';
import { MemoPanel } from './MemoPanel';
import { AllModals } from './AllModals';

/**
 * @file CalendarPage.js
 * @description
 * 특정 캘린더 ID에 대한 전체 뷰(로그인, 캘린더, 메모 등)를 관리하고 렌더링하는 메인 페이지 컴포넌트입니다.
 * 기존 App.js의 핵심 로직이 이 컴포넌트로 이전되었습니다.
 * @param {object} props - 컴포넌트 props
 * @param {string} props.calendarId - 표시할 캘린더의 Firestore 문서 ID
 */
export function CalendarPage({ calendarId }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

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

  const requestConfirm = (title, message, onConfirm) => setConfirmModal({ isOpen: true, title, message, onConfirm });
  const closeConfirmModal = () => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const handleConfirm = () => { if(confirmModal.onConfirm) confirmModal.onConfirm(); closeConfirmModal(); };

  useEffect(() => {
    // 세션 스토리지에서 현재 캘린더에 대한 인증 정보 확인
    const savedAuth = sessionStorage.getItem(`palette-calendar-auth-${calendarId}`);
    if (savedAuth) {
      const { isLoggedIn, name } = JSON.parse(savedAuth);
      if (isLoggedIn) {
        setIsLoggedIn(true);
        setUserName(name);
      }
    }

    // Firebase 인증 상태 변경 리스너 설정
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // 사용자가 없으면 익명으로 로그인 시도
        signInAnonymously(auth).catch((error) => console.error("익명 로그인 에러:", error));
      }
      setIsAuthLoading(false); // 인증 상태 확인 완료
    });

    return () => unsubscribe(); // 컴포넌트 언마운트 시 리스너 정리
  }, [calendarId]);

  useEffect(() => {
    // 캘린더 ID가 없거나 로그인이 안된 상태면 데이터 구독 안함
    if (!calendarId || !isLoggedIn) return;

    // 범례 데이터 실시간 구독
    const unsubLegends = onSnapshot(collection(db, 'calendars', calendarId, 'legends'), (snapshot) => {
        setLegends(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    // 이벤트 데이터 실시간 구독
    const unsubEvents = onSnapshot(collection(db, 'calendars', calendarId, 'events'), (snapshot) => {
        setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 컴포넌트 언마운트 시 구독 정리
    return () => { 
        unsubLegends(); 
        unsubEvents(); 
    };
  }, [calendarId, isLoggedIn]);

  const handleLoginSuccess = (name) => {
    setIsLoggedIn(true);
    setUserName(name);
    // 로그인 성공 시 세션 스토리지에 정보 저장
    sessionStorage.setItem(`palette-calendar-auth-${calendarId}`, JSON.stringify({ isLoggedIn: true, name }));
  };

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
  
  if (isAuthLoading) return <div className="w-full h-screen flex justify-center items-center"><p>로딩 중...</p></div>;
  if (!isLoggedIn) return <LoginScreen calendarId={calendarId} onLoginSuccess={handleLoginSuccess} />;

  const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

  return (
    <div className="bg-gray-50 min-h-screen font-sans p-4 sm:p-8 flex justify-center items-start" id="app-container">
      <div className="w-full max-w-7xl mx-auto bg-white p-4 sm:p-6 rounded-xl shadow-lg print:shadow-none print:p-0">
        <header className="flex flex-wrap justify-between items-center mb-6 print:hidden gap-y-4">
          <h1 className="text-3xl font-bold text-gray-800 w-full sm:w-auto">🎨 Palette Calendar</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => changeMonth(-1)} className="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">&lt; 이전 달</button>
            <button onClick={() => changeMonth(1)} className="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">다음 달 &gt;</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLegendPanelModalOpen(true)} className="bg-indigo-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-indigo-600">범례 관리</button>
            <button onClick={() => window.print()} className="bg-green-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-green-600">인쇄하기</button>
          </div>
        </header>
        
        <main className="flex flex-col sm:flex-row sm:gap-6" id="main-content">
          <section id="calendar-container" className="w-full sm:w-1/2 flex-shrink-0 space-y-4">
            <CalendarView
                date={currentDate}
                events={events}
                legends={legends}
                onDateClick={handleDateClick}
                onEventClick={handleEventClick}
                selectionRange={selectionRange}
                isEditingEvent={isEditingEvent}
            />
            <CalendarView
                date={nextMonthDate}
                events={events}
                legends={legends}
                onDateClick={handleDateClick}
                onEventClick={handleEventClick}
                selectionRange={selectionRange}
                isEditingEvent={isEditingEvent}
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
        @media print { 
            @page { 
                size: A4 portrait; 
                margin: 10mm; 
            } 
            body, #app-container { 
                background-color: white !important; 
                padding: 0 !important; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
            } 
            .print\\:hidden { 
                display: none !important; 
            } 
            #main-content { 
                display: flex !important; 
                flex-direction: row !important; 
                align-items: stretch; 
                justify-content: space-between !important;
                gap: 0 !important;
                width: 100%; 
                height: 100%; 
            } 
            #calendar-container { 
                width: 48% !important;
                display: flex !important; 
                flex-direction: column !important; 
                gap: 0.25rem !important; 
                page-break-inside: avoid; 
            } 
            #memo-container { 
                width: 48% !important;
                height: 100%; 
                display: flex; 
                padding: 0 !important; 
            } 
            .break-inside-avoid { 
                break-inside: avoid; 
            } 
            .memo-panel-container { 
                width: 100%; 
                height: 100%; 
                display: flex; 
                flex-direction: column; 
                break-inside: avoid; 
                padding: 0 !important; 
                margin: 0 !important; 
                border: none !important; /* 부모 컨테이너의 테두리를 제거 */
                box-sizing: border-box;
            }
            /* 툴바와 컨텐츠의 개별 테두리를 제거합니다. */
            .memo-panel-container .bg-gray-100, /* 툴바 타겟 */
            .memo-panel-content {
                border: none !important;
                box-shadow: none !important;
                border-radius: 0 !important;
            }
        }
      `}</style>
    </div>
  );
}
