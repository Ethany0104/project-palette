import React, { useState } from 'react';
// Firebase 서비스 파일에서 Google 인증 관련 모듈들을 가져옵니다.
import { auth, googleProvider, signInWithPopup } from '../services/firebase';

/**
 * @file LoginScreen.js
 * @description
 * 사용자가 Google 계정으로 서비스에 로그인하는 화면입니다.
 * 특정 캘린더에 대한 접근 제어가 아닌, 앱 전체에 대한 인증을 담당합니다.
 */
export function LoginScreen() {
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    /**
     * 'Google 계정으로 시작하기' 버튼 클릭 시 실행되는 핸들러.
     * Google 로그인 팝업을 띄우며, 성공 시 App.js의 onAuthStateChanged 리스너가 후속 처리를 담당합니다.
     */
    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            await signInWithPopup(auth, googleProvider);
            // 로그인 성공 후의 로직(캘린더 생성, 리디렉션 등)은 App.js에서 처리하므로
            // 이 컴포넌트에서는 별도의 콜백 함수 호출이 필요 없습니다.
        } catch (err) {
            console.error("Google 로그인 중 에러:", err);
            if (err.code === 'auth/popup-closed-by-user') {
                 setError('로그인 팝업이 닫혔습니다. 다시 시도해주세요.');
            } else {
                 setError('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
            }
            setIsLoading(false); // 에러 발생 시 로딩 상태 해제
        }
        // 성공 시에는 onAuthStateChanged가 감지하여 전체 화면이 전환되므로 로딩 상태를 여기서 해제할 필요가 없습니다.
    };

    return (
        <div className="w-full h-screen flex justify-center items-center bg-gray-100">
            <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-lg">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">🎨</h1>
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Palette Calendar</h2>
                <p className="text-center text-gray-600 mb-8">Google 계정으로 로그인하고<br/>나만의 일정을 관리해보세요.</p>
                <div className="space-y-4">
                     <button onClick={handleGoogleLogin} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-semibold py-3 rounded-md hover:bg-gray-50 disabled:bg-gray-200">
                        {isLoading ? '로그인 중...' : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                                Google 계정으로 시작하기
                            </>
                        )}
                    </button>
                    {error && <p className="text-red-500 text-sm text-center mt-4">{error}</p>}
                </div>
            </div>
        </div>
    );
}

