import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ServerWakeNote from './components/ServerWakeNote.jsx';
import './styles/main.css';
import './styles/mobile.css'; // phone and tablet fixes, loaded last
import './utils/theme'; // light / dark mode, also follows the computer's setting on every page

// Notifications, handovers and messages load inside AppLayout, only once someone is signed in
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <ToastProvider>
        <App />
        <ServerWakeNote />
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
);
