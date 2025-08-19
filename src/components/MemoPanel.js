import React, { useState, useEffect, useCallback, useRef } from 'react';
import { onSnapshot, setDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * @file MemoPanel.js
 * @description
 * 월별 메모를 표시하고 편집하는 컴포넌트입니다.
 * 안정적인 저장 로직과 데이터 동기화 로직을 갖춘 리치 텍스트 에디터가 구현되어 있습니다.
 */

// 서식 적용을 위한 툴바 버튼 컴포넌트
const ToolbarButton = ({ onCommand, icon }) => {
    const onMouseDown = (e) => {
        e.preventDefault();
        onCommand();
    };
    return (
        <button onMouseDown={onMouseDown} className="px-3 py-1 rounded text-gray-700 hover:bg-gray-200 font-bold">
            {icon}
        </button>
    );
};

export function MemoPanel({ calendarId, date }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    // Firestore의 데이터를 저장하기 위한 React 상태 변수
    const [memoContent, setMemoContent] = useState('');
    const memoDocId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const debounceTimeout = useRef(null);
    const editorRef = useRef(null);
    const isFocused = useRef(false); // 사용자가 에디터에 포커스 중인지 추적

    // 1. Firestore에서 데이터를 구독하고 state를 업데이트하는 useEffect
    useEffect(() => {
        if (!calendarId) return;
        setIsLoading(true);
        const docRef = doc(db, 'calendars', calendarId, 'monthlyMemos', memoDocId);
        
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            const remoteContent = docSnap.exists() ? docSnap.data().content || '' : '';
            // Firestore에서 가져온 내용으로 state를 업데이트합니다.
            setMemoContent(remoteContent);
            setIsLoading(false);
        }, (error) => {
            console.error("메모 로딩 중 에러:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [calendarId, memoDocId]);

    // 2. state(memoContent)의 변경사항을 DOM(에디터)에 동기화하는 useEffect
    useEffect(() => {
        // 사용자가 편집 중이 아닐 때, 그리고 state와 DOM의 내용이 다를 때만 동기화합니다.
        // 이것이 새로고침 후 내용이 표시되게 하는 핵심 로직입니다.
        if (editorRef.current && !isFocused.current && memoContent !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = memoContent;
        }
    }, [memoContent]); // memoContent가 변경될 때마다 실행됩니다.

    // 메모를 Firestore에 저장하는 함수
    const saveMemo = useCallback(async () => {
        if (!calendarId || !editorRef.current) return;
        
        const currentContent = editorRef.current.innerHTML;
        setIsSaving(true);

        try {
            const docRef = doc(db, 'calendars', calendarId, 'monthlyMemos', memoDocId);
            await setDoc(docRef, { content: currentContent }, { merge: true });
        } catch (error) {
            console.error("메모 저장 중 에러:", error);
        } finally {
            setTimeout(() => setIsSaving(false), 500);
        }
    }, [calendarId, memoDocId]);
    
    // 에디터 내용이 변경될 때 호출되는 핸들러 (디바운스 로직)
    const handleMemoChange = useCallback(() => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(saveMemo, 1500);
    }, [saveMemo]);

    // 툴바의 서식 버튼을 클릭했을 때 실행되는 핸들러
    const handleFormatCommand = useCallback((command) => {
        document.execCommand(command, false, null);
        if (editorRef.current) {
            editorRef.current.focus();
            handleMemoChange(); // 서식 적용 후에도 저장 로직 트리거
        }
    }, [handleMemoChange]);

    return (
        <div className="memo-panel-container flex flex-col w-full h-full border-t-2 sm:border-t-0 sm:border-l-2 border-dashed border-gray-300 pt-4 sm:pt-0 sm:px-4 mt-8 sm:mt-0">
            <div className="flex justify-between items-center mb-2">
                 <h2 className="text-2xl font-bold text-center print:text-xl print:mb-2">{`${date.getFullYear()}년 ${date.getMonth() + 1}월 메모`}</h2>
                 <span className="text-sm text-gray-500 pr-2">{isSaving ? '저장 중...' : '자동 저장됨'}</span>
            </div>
            
            {/* 서식 툴바 */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-t-md border border-b-0 border-gray-300">
                <ToolbarButton onCommand={() => handleFormatCommand('bold')} icon="B" />
                <ToolbarButton onCommand={() => handleFormatCommand('italic')} icon="I" />
                <ToolbarButton onCommand={() => handleFormatCommand('underline')} icon="U" />
                <ToolbarButton onCommand={() => handleFormatCommand('strikeThrough')} icon="S" />
            </div>

            {/* 리치 텍스트 에디터 영역 */}
            <div className="memo-panel-content w-full flex-grow border border-gray-300 rounded-b-md p-3 bg-white overflow-y-auto">
                {isLoading ? <p className="text-gray-500">메모를 불러오는 중...</p> : 
                    <div
                        ref={editorRef}
                        className="w-full h-full focus:outline-none"
                        contentEditable={true}
                        onInput={handleMemoChange}
                        onFocus={() => isFocused.current = true}
                        onBlur={() => isFocused.current = false}
                    />
                }
            </div>
        </div>
    );
}
