import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// serviceWorkerRegistration 파일을 import 해야 합니다.
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 이 부분의 주석을 풀거나, unregister()를 register()로 변경합니다.
// serviceWorker.unregister(); -> serviceWorkerRegistration.register();
serviceWorkerRegistration.register();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
