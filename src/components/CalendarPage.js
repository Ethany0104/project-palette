import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, signOut } from '../services/firebase';

import { CalendarView } from './CalendarView';
import { MemoPanel } from './MemoPanel';
import { AllModals } from './AllModals';

/**
 * @file CalendarPage.js
 * @description 캘린더의 메인 페이지. 소유자와 방문자를 구분하여 읽기/쓰기 권한을 제어합니다.
 * @param {object} props - 컴포넌트 props
 * @param {string} props.calendarId - 표시할 캘린더의 ID (소유자의 UID)
 * @param {object} props.user - 현재 로그인된 사용자 객체 (from App.js)
 */
export function CalendarPage({ calendarId, user }) {
  // --- 상태 관리 ---
  const [isOwner, setIsOwner] = useState(false); // 현재 사용자가 이 캘린더의 소유자인지 여부
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
  
  // calendarId 또는 user props가 변경될 때마다 소유권 여부를 확인합니다.
  useEffect(() => {
    // 로그인된 사용자의 UID와 현재 보고 있는 캘린더의 ID(소유자 UID)를 비교합니다.
    setIsOwner(user?.uid === calendarId);
  }, [calendarId, user]);

  // 캘린더 ID가 유효할 때, 캘린더 데이터(범례, 이벤트)를 구독합니다.
  useEffect(() => {
    if (!calendarId) return;

    const unsubLegends = onSnapshot(collection(db, 'calendars', calendarId, 'legends'), (snapshot) => {
        setLegends(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubEvents = onSnapshot(collection(db, 'calendars', calendarId, 'events'), (snapshot) => {
        setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { 
        unsubLegends(); 
        unsubEvents(); 
    };
  }, [calendarId]);

  // --- 함수 ---

  const handleLogout = async () => {
      try {
          await signOut(auth);
          // App.js의 onAuthStateChanged가 로그아웃을 감지하고 로그인 화면으로 자동 전환합니다.
      } catch (error) {
          console.error("로그아웃 에러:", error);
      }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        alert('캘린더 주소가 복사되었습니다. 다른 사람에게 공유해보세요!');
    }, (err) => {
        console.error('클립보드 복사 실패:', err);
        alert('주소 복사에 실패했습니다.');
    });
  };

  const requestConfirm = (title, message, onConfirm) => setConfirmModal({ isOpen: true, title, message, onConfirm });
  const closeConfirmModal = () => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const handleConfirm = () => { if(confirmModal.onConfirm) confirmModal.onConfirm(); closeConfirmModal(); };

  const handleDateClick = (fullDate) => {
    if (!isOwner || !fullDate) return; // 소유자가 아니면 아무 동작도 하지 않음
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
    if (!isOwner || !selectionRange.start || !selectionRange.end) return;
    try {
      await addDoc(collection(db, 'calendars', calendarId, 'events'), {
        startDate: selectionRange.start, endDate: selectionRange.end, legendId, memo: '', createdBy: user.displayName, createdAt: serverTimestamp()
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
    if (!isOwner || !selectedEvent) return;
    try {
      await updateDoc(doc(db, 'calendars', calendarId, 'events', selectedEvent.id), { memo: eventMemo });
      setEventDetailModalOpen(false);
      setSelectedEvent(null);
    } catch (error) { console.error("메모 저장 중 에러:", error); }
  };

  const handleDeleteEvent = () => {
    if (!isOwner || !selectedEvent) return;
    requestConfirm('일정 삭제 확인', '정말로 이 일정을 삭제하시겠습니까?', async () => {
      try {
        await deleteDoc(doc(db, 'calendars', calendarId, 'events', selectedEvent.id));
        setEventDetailModalOpen(false);
        setSelectedEvent(null);
      } catch (error) { console.error("일정 삭제 중 에러:", error); }
    });
  };

  const handleStartEditEvent = () => {
    if (!isOwner) return;
    setEditingEvent(selectedEvent);
    setIsEditingEvent(true);
    setEventDetailModalOpen(false);
    setSelectionRange({ start: null, end: null });
  };
  
  const handleUpdateEvent = async (updatedEventData) => {
    if (!isOwner || !editingEvent) return;
    try {
      await updateDoc(doc(db, 'calendars', calendarId, 'events', editingEvent.id), updatedEventData);
    } catch (error) { console.error("이벤트 업데이트 중 에러:", error); }
    finally {
      setIsEditingEvent(false); setEditingEvent(null); setSelectionRange({ start: null, end: null }); setSelectedEvent(null);
    }
  };

  const changeMonth = (delta) => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  
  const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

  return (
    <div className="bg-gray-50 min-h-screen font-sans p-4 sm:p-8 flex justify-center items-start" id="app-container">
      <div className="w-full max-w-7xl mx-auto bg-white p-4 sm:p-6 rounded-xl shadow-lg print:shadow-none print:p-0">
        <header className="flex flex-wrap justify-between items-center mb-6 print:hidden gap-y-4">
          <div className="flex items-center gap-4 order-1">
            <h1 className="text-3xl font-bold text-gray-800">🎨 Palette Calendar</h1>
            {!isOwner && <span className="text-sm font-bold text-white bg-yellow-500 px-3 py-1 rounded-full">읽기 전용</span>}
          </div>
          <div className="flex items-center gap-2 sm:gap-4 order-3 sm:order-2">
            <button onClick={() => changeMonth(-1)} className="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">&lt; 이전 달</button>
            <button onClick={() => changeMonth(1)} className="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">다음 달 &gt;</button>
          </div>
          <div className="flex items-center gap-2 order-2 sm:order-3 w-full sm:w-auto justify-between">
            <div className='flex items-center gap-2'>
              {isOwner && <button onClick={() => setLegendPanelModalOpen(true)} className="bg-indigo-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-indigo-600">범례 관리</button>}
              <button onClick={handleShare} className="bg-green-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-green-600">공유</button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 hidden sm:inline">{user?.displayName}</span>
              <button onClick={handleLogout} className="bg-gray-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-gray-600">로그아웃</button>
            </div>
          </div>
        </header>
        
        <main className="flex flex-col sm:flex-row sm:gap-6" id="main-content">
          <section id="calendar-container" className="w-full sm:w-1/2 flex-shrink-0 space-y-4">
            <CalendarView date={currentDate} events={events} legends={legends} onDateClick={handleDateClick} onEventClick={handleEventClick} selectionRange={selectionRange} isEditingEvent={isEditingEvent} isOwner={isOwner} />
            <CalendarView date={nextMonthDate} events={events} legends={legends} onDateClick={handleDateClick} onEventClick={handleEventClick} selectionRange={selectionRange} isEditingEvent={isEditingEvent} isOwner={isOwner} />
          </section>
          <section id="memo-container" className="w-full sm:w-1/2 flex-shrink-0 flex">
             <MemoPanel calendarId={calendarId} date={currentDate} isOwner={isOwner} />
          </section>
        </main>
      </div>

      {(isOwner && selectionRange.start && !selectionRange.end) && (
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
        data={{ legends, selectedEvent, eventMemo, setEventMemo, calendarId, isOwner }}
      />
      
      <style>{`@keyframes fade-in-up { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } } .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; } @media print { @page { size: A4 portrait; margin: 10mm; } body, #app-container { background-color: white !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .print\\:hidden { display: none !important; } #main-content { display: flex !important; flex-direction: row !important; align-items: stretch; justify-content: space-between !important; gap: 0 !important; width: 100%; height: 100%; } #calendar-container { width: 48% !important; display: flex !important; flex-direction: column !important; gap: 0.25rem !important; page-break-inside: avoid; } #memo-container { width: 48% !important; height: 100%; display: flex; padding: 0 !important; } .break-inside-avoid { break-inside: avoid; } .memo-panel-container { width: 100%; height: 100%; display: flex; flex-direction: column; break-inside: avoid; padding: 0 !important; margin: 0 !important; border: none !important; box-sizing: border-box; } .memo-panel-container .bg-gray-100, .memo-panel-content { border: none !important; box-shadow: none !important; border-radius: 0 !important; } }`}</style>
    </div>
  );
}

