import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: 'var(--surface)',
          color: 'var(--text-strong)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          fontSize: '13.5px',
          fontWeight: 500,
          padding: '10px 14px',
          boxShadow: 'var(--shadow-lg)',
          fontFamily: 'Inter, sans-serif',
        },
        success: { iconTheme: { primary: 'var(--success)', secondary: '#fff' } },
        error:   { iconTheme: { primary: 'var(--danger)', secondary: '#fff' } },
        duration: 3000,
      }}
    />
    <App />
  </React.StrictMode>
);
