import React from 'react';
import { CreateCalendarScreen } from './components/CreateCalendarScreen';
import { CalendarPage } from './components/CalendarPage';

/**
 * @file App.js
 * @description
 * 애플리케이션의 메인 진입점 역할을 하는 라우터 컴포넌트입니다.
 * URL 경로를 확인하여 새 캘린더 생성 화면 또는 특정 캘린더 페이지를 렌더링합니다.
 */
function App() {
  const path = window.location.pathname;

  // URL 경로가 '/c/'와 ID로 시작하면, 해당 ID의 캘린더 페이지를 보여줍니다.
  // 예: /c/calendar123
  if (path.startsWith('/c/')) {
    const id = path.split('/c/')[1].split('/')[0];
    if (id) {
      return <CalendarPage calendarId={id} />;
    }
  }
  
  // 그 외의 모든 경우 (기본 경로 포함), 새 캘린더 생성 화면을 보여줍니다.
  return <CreateCalendarScreen />;
}

export default App;
