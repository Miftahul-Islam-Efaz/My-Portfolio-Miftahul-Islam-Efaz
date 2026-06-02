import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress ResizeObserver errors from @react-three/fiber and polyfill fetch errors
const hideBenignErrors = (e: ErrorEvent) => {
  if (e.message.includes('ResizeObserver loop') || e.message.includes('Cannot set property fetch of #<Window>')) {
    e.preventDefault(); // Prevents the error from showing up in the console / overlay
    e.stopImmediatePropagation();
  }
};
window.addEventListener('error', hideBenignErrors);

const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && (args[0].includes('ResizeObserver loop') || args[0].includes('Cannot set property fetch of #<Window>'))) return;
  originalError(...args);
};

const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('THREE.Clock: This module has been deprecated')) return;
  if (typeof args[0] === 'string' && args[0].includes('Please ensure that the container has a non-static position')) return;
  originalWarn(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
