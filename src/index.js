import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Tailwind CSS를 포함한 기본 CSS 파일
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);