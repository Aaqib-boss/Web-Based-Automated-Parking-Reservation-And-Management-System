import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    console.error('CRITICAL CLIENT ERROR:', e.error || e.message);
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('CRITICAL UNHANDLED REJECTION:', e.reason);
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
