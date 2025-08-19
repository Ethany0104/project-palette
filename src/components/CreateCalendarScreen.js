import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * @file CreateCalendarScreen.js
 * @description
 * 사용자가 새로운 캘린더를 생성할 수 있는 UI와 로직을 제공하는 컴포넌트입니다.
 */
export function CreateCalendarScreen() {
    const [calendarName, setCalendarName] = useState('');
    const [adminName, setAdminName] = useState('');
    const [phoneSuffix, setPhoneSuffix] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [newCalendarUrl, setNewCalendarUrl] = useState('');

    /**
     * '만들기' 버튼 클릭 시 실행되는 핸들러 함수.
     * Firestore에 새로운 캘린더와 초기 관리자 정보를 생성합니다.
     */
    const handleCreateCalendar = async () => {
        if (!calendarName.trim() || !adminName.trim() || !phoneSuffix.trim()) {
            setError('모든 필드를 입력해주세요.');
            return;
        }
        setIsLoading(true);
        setError('');
        setNewCalendarUrl('');

        try {
            // 1. 'calendars' 컬렉션에 새로운 캘린더 문서를 추가합니다.
            const calendarDocRef = await addDoc(collection(db, 'calendars'), {
                name: calendarName.trim(),
                createdAt: serverTimestamp(),
                createdBy: adminName.trim(),
            });

            // 2. 방금 생성된 캘린더 문서의 ID를 가져옵니다.
            const newCalendarId = calendarDocRef.id;

            // 3. 생성된 캘린더 아래에 'allowedUsers' 하위 컬렉션을 만들고,
            //    입력된 관리자 정보를 첫 번째 사용자로 추가합니다.
            const usersCollectionRef = collection(db, 'calendars', newCalendarId, 'allowedUsers');
            await addDoc(usersCollectionRef, {
                name: adminName.trim(),
                phoneSuffix: phoneSuffix.trim(),
                role: 'admin', // 관리자 역할 부여
            });

            // 4. 성공 시, 사용자에게 공유할 수 있는 새 캘린더 URL을 생성하여 보여줍니다.
            const url = `${window.location.origin}/c/${newCalendarId}`;
            setNewCalendarUrl(url);

        } catch (err) {
            console.error("캘린더 생성 중 에러:", err);
            setError('캘린더 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // 생성된 URL을 클립보드에 복사하는 함수
    const copyToClipboard = () => {
        navigator.clipboard.writeText(newCalendarUrl).then(() => {
            alert('주소가 클립보드에 복사되었습니다!');
        }, (err) => {
            console.error('클립보드 복사 실패:', err);
            alert('복사에 실패했습니다.');
        });
    };

    return (
        <div className="w-full min-h-screen flex justify-center items-center bg-gray-100 p-4">
            <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">🎨</h1>
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">새 Palette Calendar 만들기</h2>
                
                {newCalendarUrl ? (
                    <div className="text-center">
                        <p className="text-green-600 font-semibold mb-4">캘린더가 성공적으로 생성되었습니다!</p>
                        <p className="text-sm text-gray-600 mb-2">아래 주소를 공유하여 다른 사람들을 초대하세요.</p>
                        <div className="bg-gray-100 p-3 rounded-md mb-4 break-all">
                            <a href={newCalendarUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{newCalendarUrl}</a>
                        </div>
                        <button onClick={copyToClipboard} className="w-full bg-green-500 text-white font-semibold py-3 rounded-md hover:bg-green-600">
                            주소 복사하기
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <input type="text" placeholder="캘린더 이름 (예: 우리 가족 일정)" value={calendarName} onChange={(e) => setCalendarName(e.target.value)} className="w-full p-3 border rounded-md focus:ring-2 focus:ring-indigo-500"/>
                        <input type="text" placeholder="내 이름 (관리자)" value={adminName} onChange={(e) => setAdminName(e.target.value)} className="w-full p-3 border rounded-md focus:ring-2 focus:ring-indigo-500"/>
                        <input type="text" placeholder="내 휴대폰 번호 뒷 4자리" value={phoneSuffix} onChange={(e) => setPhoneSuffix(e.target.value)} maxLength="4" className="w-full p-3 border rounded-md focus:ring-2 focus:ring-indigo-500"/>
                        <button onClick={handleCreateCalendar} disabled={isLoading} className="w-full bg-indigo-500 text-white font-semibold py-3 rounded-md hover:bg-indigo-600 disabled:bg-indigo-300">
                            {isLoading ? '생성 중...' : '만들기'}
                        </button>
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    </div>
                )}
                 <p className="text-xs text-gray-400 text-center mt-6">캘린더를 만든 사람이 관리자가 됩니다.</p>
            </div>
        </div>
    );
}
