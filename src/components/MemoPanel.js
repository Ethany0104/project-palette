import React, { useState, useEffect, useCallback, useRef } from 'react';
import { onSnapshot, setDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

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

/**
 * @param {object} props
 * @param {string} props.calendarId
 * @param {Date} props.date
 * @param {boolean} props.isOwner - 현재 사용자가 캘린더 소유자인지 여부
 */
export function MemoPanel({ calendarId, date, isOwner }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [memoContent, setMemoContent] = useState('');
    const memoDocId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const debounceTimeout = useRef(null);
    const editorRef = useRef(null);
    // isFocused는 이제 소유자일 때만 의미가 있으므로, isOwner와 함께 사용됩니다.
    const isFocused = useRef(false);

    useEffect(() => {
        if (!calendarId) return;
        setIsLoading(true);
        const docRef = doc(db, 'calendars', calendarId, 'monthlyMemos', memoDocId);
        
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            const remoteContent = docSnap.exists() ? docSnap.data().content || '' : '';
            setMemoContent(remoteContent);
            setIsLoading(false);
        }, (error) => {
            console.error("메모 로딩 중 에러:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [calendarId, memoDocId]);

    useEffect(() => {
        // 에디터 DOM의 내용이 Firestore 데이터와 다를 경우, DOM을 업데이트합니다.
        // 소유자가 편집 중일 때는 강제로 덮어쓰지 않도록 isFocused 플래그를 확인합니다.
        if (editorRef.current && (!isFocused.current || !isOwner) && memoContent !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = memoContent;
        }
    }, [memoContent, isOwner]);

    const saveMemo = useCallback(async () => {
        // isOwner가 false이면 저장 로직을 실행하지 않습니다.
        if (!isOwner || !calendarId || !editorRef.current) return;
        
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
    }, [calendarId, memoDocId, isOwner]);
    
    const handleMemoChange = useCallback(() => {
        if (!isOwner) return;
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(saveMemo, 1500);
    }, [saveMemo, isOwner]);

    const handleFormatCommand = useCallback((command) => {
        if (!isOwner) return;
        document.execCommand(command, false, null);
        if (editorRef.current) {
            editorRef.current.focus();
            handleMemoChange();
        }
    }, [handleMemoChange, isOwner]);

    return (
        <div className="memo-panel-container flex flex-col w-full h-full border-t-2 sm:border-t-0 sm:border-l-2 border-dashed border-gray-300 pt-4 sm:pt-0 sm:px-4 mt-8 sm:mt-0">
            <div className="flex justify-between items-center mb-2">
                 <h2 className="text-2xl font-bold text-center print:text-xl print:mb-2">{`${date.getFullYear()}년 ${date.getMonth() + 1}월 메모`}</h2>
                 {isOwner && <span className="text-sm text-gray-500 pr-2">{isSaving ? '저장 중...' : '자동 저장됨'}</span>}
            </div>
            
            {/* 소유자일 경우에만 서식 툴바를 보여줍니다. */}
            {isOwner && (
                <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-t-md border border-b-0 border-gray-300">
                    <ToolbarButton onCommand={() => handleFormatCommand('bold')} icon="B" />
                    <ToolbarButton onCommand={() => handleFormatCommand('italic')} icon="I" />
                    <ToolbarButton onCommand={() => handleFormatCommand('underline')} icon="U" />
                    <ToolbarButton onCommand={() => handleFormatCommand('strikeThrough')} icon="S" />
                </div>
            )}

            <div className={`w-full flex-grow border border-gray-300 p-3 bg-white overflow-y-auto ${isOwner ? 'rounded-b-md' : 'rounded-md'}`}>
                {isLoading ? <p className="text-gray-500">메모를 불러오는 중...</p> : 
                    <div
                        ref={editorRef}
                        className="w-full h-full focus:outline-none"
                        // isOwner가 true일 때만 contentEditable을 활성화합니다.
                        contentEditable={isOwner}
                        onInput={handleMemoChange}
                        onFocus={() => { if(isOwner) isFocused.current = true; }}
                        onBlur={() => { if(isOwner) isFocused.current = false; }}
                        // 소유자가 아닐 경우, 편집이 불가능함을 시각적으로 알려주는 스타일을 추가할 수 있습니다.
                        style={{ cursor: isOwner ? 'text' : 'default' }}
                    />
                }
            </div>
        </div>
    );
}
