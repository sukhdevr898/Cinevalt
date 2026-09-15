import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely handle media play() promises and benign browser media errors
if (typeof window !== 'undefined' && typeof HTMLMediaElement !== 'undefined') {
  const isIgnorableMediaError = (err: any) => {
    if (!err) return false;
    const name = typeof err?.name === 'string' ? err.name : '';
    const message = typeof err?.message === 'string' ? err.message : (typeof err === 'string' ? err : '');
    return (
      name === 'AbortError' ||
      name === 'NotSupportedError' ||
      name === 'NotAllowedError' ||
      message.includes('interrupted') ||
      message.includes('no supported source') ||
      message.includes('play()') ||
      message.includes('user didn\'t interact')
    );
  };

  const originalPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    const playPromise = originalPlay.apply(this);
    if (playPromise && typeof playPromise.catch === 'function') {
      return playPromise.catch((err: any) => {
        if (isIgnorableMediaError(err)) {
          return;
        }
        throw err;
      });
    }
    return playPromise;
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isIgnorableMediaError(event.reason)) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

