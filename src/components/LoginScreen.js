import React, { useState } from 'react';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';

export function LoginScreen({ calendarId, onLoginSuccess }) {
    const [name, setName] = useState('');
    const [phoneSuffix, setPhoneSuffix] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!name.trim() || !phoneSuffix.trim() || !calendarId) {
            setError('이름과 휴대폰 번호 뒷 4자리를 모두 입력해주세요.');
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            const usersRef = collection(db, 'calendars', calendarId, 'allowedUsers');
            const q = query(usersRef, where("name", "==", name.trim()), where("phoneSuffix", "==", phoneSuffix.trim()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setError('접근 권한이 없습니다. 관리자에게 문의하세요.');
                setIsLoading(false);
                return;
            }
            
            const userDoc = querySnapshot.docs[0];
            const currentUser = auth.currentUser;

            if (currentUser) {
                await setDoc(doc(db, 'calendars', calendarId, 'allowedUsers', userDoc.id), { uid: currentUser.uid }, { merge: true });
                sessionStorage.setItem(`palette-calendar-auth-${calendarId}`, JSON.stringify({ isLoggedIn: true, name: userDoc.data().name }));
                onLoginSuccess(userDoc.data().name);
            } else {
                 setError('인증 정보를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.');
            }
        } catch (err) {
            console.error("로그인 중 에러:", err);
            setError('로그인 중 오류가 발생했습니다.');
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
                    <input type="text" placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500"/>
                    <input type="text" placeholder="휴대폰 번호 뒷 4자리" value={phoneSuffix} onChange={(e) => setPhoneSuffix(e.target.value)} maxLength="4" className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500"/>
                    <button onClick={handleLogin} disabled={isLoading} className="w-full bg-blue-500 text-white font-semibold py-3 rounded-md hover:bg-blue-600 disabled:bg-blue-300">
                        {isLoading ? '확인 중...' : '입장하기'}
                    </button>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                </div>
                 <p className="text-xs text-gray-400 text-center mt-6">이 캘린더는 허용된 사용자만 접근할 수 있습니다.</p>
            </div>
        </div>
    );
}
