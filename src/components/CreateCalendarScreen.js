import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp, getFirestore, doc, setDoc } from 'firebase/firestore';
// Firebase 서비스 파일에서 Google 인증 관련 모듈들을 가져옵니다.
import { auth, googleProvider, signInWithPopup } from '../services/firebase';

/**
 * @file CreateCalendarScreen.js
 * @description
 * 사용자가 Google 계정으로 로그인하고 새로운 캘린더를 생성하는 화면입니다.
 * 기존의 이름/전화번호 입력 방식에서 Google OAuth 기반으로 변경되었습니다.
 */
export function CreateCalendarScreen() {
    const [calendarName, setCalendarName] = useState('');
    const [user, setUser] = useState(null); // Google 로그인 사용자 정보를 저장할 상태
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [newCalendarUrl, setNewCalendarUrl] = useState('');

    /**
     * 'Google 계정으로 시작하기' 버튼 클릭 시 실행되는 핸들러.
     * Firebase의 signInWithPopup을 사용하여 Google 로그인 창을 띄웁니다.
     */
    const handleGoogleSignIn = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            setUser(result.user); // 로그인 성공 시 사용자 정보를 상태에 저장
            setError('');
        } catch (error) {
            console.error("Google 로그인 에러:", error);
            setError("Google 로그인에 실패했습니다. 팝업이 차단되었는지 확인해주세요.");
        }
    };

    /**
     * '만들기' 버튼 클릭 시 실행되는 핸들러.
     * Firestore에 새로운 캘린더와 로그인된 Google 계정을 관리자로 추가합니다.
     */
    const handleCreateCalendar = async () => {
        if (!calendarName.trim()) {
            setError('캘린더 이름을 입력해주세요.');
            return;
        }
        if (!user) {
            setError('먼저 Google 계정으로 로그인해야 합니다.');
            return;
        }

        setIsLoading(true);
        setError('');
        setNewCalendarUrl('');

        const db = getFirestore();

        try {
            // 1. 'calendars' 컬렉션에 새 캘린더 문서 추가
            const calendarDocRef = await addDoc(collection(db, 'calendars'), {
                name: calendarName.trim(),
                createdAt: serverTimestamp(),
                createdBy: user.displayName, // 생성자는 Google 계정의 이름
                creatorUid: user.uid, // 생성자의 UID
            });

            const newCalendarId = calendarDocRef.id;

            // 2. 생성된 캘린더의 'allowedUsers' 하위 컬렉션에 관리자(생성자) 정보 추가
            // 문서를 생성할 때 ID를 사용자의 UID로 지정하여 중복을 방지하고 조회를 쉽게 합니다.
            await setDoc(doc(db, 'calendars', newCalendarId, 'allowedUsers', user.uid), {
                name: user.displayName,
                email: user.email,
                uid: user.uid, // 명시적으로 uid 저장
                role: 'admin', // 관리자 역할 부여
            });

            // 3. 성공 시 사용자에게 공유할 URL 생성
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
                        {!user ? (
                             <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-semibold py-3 rounded-md hover:bg-gray-50">
                                <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                                Google 계정으로 시작하기
                            </button>
                        ) : (
                            <>
                                <div className="text-center bg-gray-100 p-3 rounded-md">
                                    <p className="text-sm text-gray-600">로그인 계정:</p>
                                    <p className="font-semibold text-gray-800">{user.displayName} ({user.email})</p>
                                </div>
                                <input type="text" placeholder="캘린더 이름 (예: 우리 가족 일정)" value={calendarName} onChange={(e) => setCalendarName(e.target.value)} className="w-full p-3 border rounded-md focus:ring-2 focus:ring-indigo-500"/>
                                <button onClick={handleCreateCalendar} disabled={isLoading} className="w-full bg-indigo-500 text-white font-semibold py-3 rounded-md hover:bg-indigo-600 disabled:bg-indigo-300">
                                    {isLoading ? '생성 중...' : '만들기'}
                                </button>
                            </>
                        )}
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    </div>
                )}
                 <p className="text-xs text-gray-400 text-center mt-6">캘린더를 만든 사람이 관리자가 됩니다.</p>
            </div>
        </div>
    );
}
