import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import './styles/main.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Service worker registration for PWA offline support
if ('serviceWorker' in navigator && (process.env.NODE_ENV === 'production' || window.location.protocol.startsWith('http'))) {
  window.addEventListener('load', () => {
    const swUrl = new URL('sw.js', window.location.href).href;
    navigator.serviceWorker.register(swUrl).catch(err => {
      console.warn('[QnA] Service worker registration failed:', err);
    });
  });
}
