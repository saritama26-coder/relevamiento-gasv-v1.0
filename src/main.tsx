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

// El Service Worker de producción es administrado por vite-plugin-pwa.
// No se eliminan registros ni cachés: pueden contener recursos necesarios para el modo offline.

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
