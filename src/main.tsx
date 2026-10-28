import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Keep the shared two-decimal formatter without inline JavaScript in index.html.
// Inline HTML scripts can leave a stale Vite html-proxy module in AI Studio previews.
if (typeof window !== 'undefined') {
  (window as any).Gsv2d = (value: unknown) => {
    const number = parseFloat(String(value ?? '').replace(',', '.'));
    return Number.isNaN(number) ? value : number.toFixed(2);
  };
}

// Limpieza de Service Workers y CacheStorage sin recarga previa (no bloqueante)
if (typeof window !== 'undefined') {
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => {
          Promise.all(regs.map((r) => r.unregister())).catch(() => {});
        })
        .catch((e) => {
          console.warn('Limpieza SW/caché:', e);
        });
    }
    if ('caches' in window) {
      caches
        .keys()
        .then((keys) => {
          Promise.all(keys.map((k) => caches.delete(k))).catch(() => {});
        })
        .catch((e) => {
          console.warn('Limpieza SW/caché:', e);
        });
    }
  } catch (e) {
    console.warn('Limpieza SW/caché:', e);
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
