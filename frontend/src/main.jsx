import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { api } from './services/tauriApi';

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const errorMsg = event?.error?.stack || event?.message || 'Unknown window error';
    api.logClientMessage('error', `Uncaught Window Error: ${errorMsg}`);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason?.stack || event?.reason?.message || String(event?.reason);
    api.logClientMessage('error', `Unhandled Promise Rejection: ${reason}`);
  });

  api.logClientMessage('info', 'SystemPilot React application mounted');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
