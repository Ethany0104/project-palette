import React, { useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
// Firebase 서비스 파일에서 Google 인증 관련 모듈들을 가져옵니다.
import { db, auth, googleProvider, signInWithPopup } from '../services/firebase';

/**
 * @file LoginScreen.js
 * @description
 * 사용자가 Google 계정으로 캘린더에 로그인하는 화면입니다.
 * 기존의 이름/전화번호 입력 방식에서 Google OAuth 기반으로 변경되었습니다.
 * @param {object} props - 컴포넌트 props
 * @param {string} props.calendarId - 접근하려는 캘린더의 ID
 * @param {function} props.onLoginSuccess - 로그인 및 권한 확인 성공 시 호출될 콜백 함수
 */
export function LoginScreen({ calendarId, onLoginSuccess }) {
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    /**
     * 'Google 계정으로 입장' 버튼 클릭 시 실행되는 핸들러.
     * Google 로그인을 시도하고, 성공하면 해당 캘린더에 접근 권한이 있는지 확인합니다.
     */
    const handleGoogleLogin = async () => {
        if (!calendarId) {
            setError('유효하지 않은 캘린더 접근입니다.');
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            // 1. Google 로그인 팝업을 띄워 사용자 인증
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            if (!user) {
                throw new Error("Google 계정 정보를 가져올 수 없습니다.");
            }

            // 2. 인증된 사용자가 이 캘린더에 접근할 권한이 있는지 확인
            // 'allowedUsers' 컬렉션에서 사용자의 UID와 일치하는 문서가 있는지 조회
            const userDocRef = doc(db, 'calendars', calendarId, 'allowedUsers', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                // 3. 권한이 있으면 onLoginSuccess 콜백을 호출하여 메인 페이지로 이동
                 onLoginSuccess(userDocSnap.data());
            } else {
                 // 4. 권한이 없으면 에러 메시지 표시
                setError('이 캘린더에 접근할 권한이 없습니다. 관리자에게 문의하세요.');
            }
            
        } catch (err) {
            console.error("Google 로그인 또는 권한 확인 중 에러:", err);
            if (err.code === 'auth/popup-closed-by-user') {
                 setError('로그인 팝업이 닫혔습니다. 다시 시도해주세요.');
            } else {
                 setError('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full h-screen flex justify-center items-center bg-gray-100">
            <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-lg">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">🎨</h1>
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Palette Calendar</h2>
                <div className="space-y-4">
                     <button onClick={handleGoogleLogin} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-semibold py-3 rounded-md hover:bg-gray-50 disabled:bg-gray-200">
                        {isLoading ? '확인 중...' : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                                Google 계정으로 입장
                            </>
                        )}
                    </button>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                </div>
                 <p className="text-xs text-gray-400 text-center mt-6">이 캘린더는 허용된 사용자만 접근할 수 있습니다.</p>
            </div>
        </div>
    );
}
