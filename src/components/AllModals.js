import React, { useState } from 'react';
import { addDoc, collection, writeBatch, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { getTextColorForBackground } from '../utils/helpers';
import { db } from '../services/firebase';

// ConfirmModal
function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60]">
      <div className="bg-white p-6 rounded-lg shadow-xl w-11/12 max-w-sm">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-md hover:bg-gray-400">취소</button>
          <button onClick={onConfirm} className="bg-red-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-red-600">확인</button>
        </div>
      </div>
    </div>
  );
}

// LegendPanel
function LegendPanel({ calendarId, legends, requestConfirm }) {
  const [newLegendName, setNewLegendName] = useState('');
  const [newLegendColor, setNewLegendColor] = useState('#d3d3d3');

  const handleAddLegend = async () => {
    if (!newLegendName.trim() || !calendarId) return;
    try {
      await addDoc(collection(db, 'calendars', calendarId, 'legends'), { name: newLegendName.trim(), color: newLegendColor });
      setNewLegendName(''); setNewLegendColor('#d3d3d3');
    } catch (error) { console.error("범례 추가 중 에러:", error); }
  };

  const handleDeleteLegend = (legendId) => {
    requestConfirm('범례 삭제 확인', '정말로 이 범례를 삭제하시겠습니까? 관련된 모든 일정이 함께 삭제됩니다.', async () => {
      try {
        const batch = writeBatch(db);
        const q = query(collection(db, 'calendars', calendarId, 'events'), where("legendId", "==", legendId));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => batch.delete(doc.ref));
        batch.delete(doc(db, 'calendars', calendarId, 'legends', legendId));
        await batch.commit();
      } catch (error) { console.error("범례 삭제 중 에러:", error); }
    });
  };

  return (
    <div className="p-1">
      <h2 className="text-xl font-bold mb-4 text-gray-700">범례 관리</h2>
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <input type="color" value={newLegendColor} onChange={(e) => setNewLegendColor(e.target.value)} className="w-10 h-10 rounded-md cursor-pointer border-gray-300" />
        <input type="text" placeholder="범례 이름 (예: 마감)" value={newLegendName} onChange={(e) => setNewLegendName(e.target.value)} className="flex-grow p-2 border rounded-md focus:ring-2 focus:ring-blue-500" />
        <button onClick={handleAddLegend} className="bg-blue-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-600">추가</button>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
        {legends.map(legend => (
          <div key={legend.id} className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm border">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: legend.color }}></div>
              <span className="text-gray-800">{legend.name}</span>
            </div>
            <button onClick={() => handleDeleteLegend(legend.id)} className="text-red-500 hover:text-red-700 font-bold text-xl">&times;</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AllModals({ modals, handlers, data }) {
    const { confirmModal, isLegendModalOpen, isEventDetailModalOpen, isLegendPanelModalOpen } = modals;
    const { closeConfirmModal, handleConfirm, setLegendModalOpen, setSelectionRange, handleLegendSelect, setEventDetailModalOpen, handleSaveMemo, handleStartEditEvent, handleUpdateEvent, handleDeleteEvent, setLegendPanelModalOpen, requestConfirm } = handlers;
    // data 객체에서 isOwner를 받아 권한 제어에 사용합니다.
    const { legends, selectedEvent, eventMemo, setEventMemo, calendarId, isOwner } = data;

    return (
        <>
            <ConfirmModal isOpen={confirmModal.isOpen} onClose={closeConfirmModal} onConfirm={handleConfirm} title={confirmModal.title} message={confirmModal.message} />

            {isOwner && isLegendModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={() => { setLegendModalOpen(false); setSelectionRange({ start: null, end: null }); }}>
                    <div className="bg-white p-6 rounded-lg shadow-xl w-11/12 max-w-sm" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4">어떤 일정인가요?</h3>
                        <div className="space-y-2">
                            {legends.map(legend => (
                                <button key={legend.id} onClick={() => handleLegendSelect(legend.id)} className="w-full text-left p-3 rounded-md transition-colors" style={{ backgroundColor: legend.color, color: getTextColorForBackground(legend.color) }}>
                                    {legend.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {isEventDetailModalOpen && selectedEvent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={() => setEventDetailModalOpen(false)}>
                    <div className="bg-white p-6 rounded-lg shadow-xl w-11/12 max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: legends.find(l => l.id === selectedEvent.legendId)?.color }}></div>
                                <h3 className="text-xl font-bold">{legends.find(l => l.id === selectedEvent.legendId)?.name}</h3>
                            </div>
                            <button onClick={() => setEventDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
                        </div>
                        <p className="text-sm text-gray-500 mb-2 font-semibold">{selectedEvent.startDate} ~ {selectedEvent.endDate}</p>
                        {/* 메모 textarea는 소유자가 아닐 경우 읽기 전용(readOnly)으로 설정합니다. */}
                        <textarea value={eventMemo} onChange={(e) => setEventMemo(e.target.value)} readOnly={!isOwner} className={`w-full h-32 p-2 border rounded-md mb-4 ${!isOwner ? 'bg-gray-100' : ''}`} placeholder={isOwner ? "세부 내용을 입력하세요..." : "메모 내용"}></textarea>
                        
                        {/* 소유자인 경우에만 수정/삭제 버튼들을 보여줍니다. */}
                        {isOwner && (
                            <>
                                <div className="bg-gray-50 p-3 rounded-md mb-4">
                                    <h4 className="font-semibold text-sm mb-2">일정 수정</h4>
                                    <div className="flex gap-2">
                                        <button onClick={handleStartEditEvent} className="flex-1 bg-gray-200 text-gray-800 font-semibold px-4 py-2 rounded-md hover:bg-gray-300 text-sm">날짜 변경</button>
                                        <select onChange={(e) => handleUpdateEvent({ legendId: e.target.value })} value={selectedEvent.legendId} className="flex-1 bg-gray-200 text-gray-800 font-semibold px-2 py-2 rounded-md hover:bg-gray-300 text-sm">
                                            {legends.map(legend => <option key={legend.id} value={legend.id}>{legend.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <button onClick={handleDeleteEvent} className="bg-red-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-red-600">일정 삭제</button>
                                    <button onClick={handleSaveMemo} className="bg-blue-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-600">메모 저장</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {isOwner && isLegendPanelModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={() => setLegendPanelModalOpen(false)}>
                    <div className="bg-gray-50 p-6 rounded-lg shadow-xl w-11/12 max-w-lg" onClick={e => e.stopPropagation()}>
                        <LegendPanel calendarId={calendarId} legends={legends} requestConfirm={requestConfirm} />
                        <button onClick={() => setLegendPanelModalOpen(false)} className="mt-4 w-full bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-md hover:bg-gray-400">닫기</button>
                    </div>
                </div>
            )}
        </>
    );
}
