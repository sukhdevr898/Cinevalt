import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely handle aborted play() promises when media elements are paused or removed from DOM
if (typeof window !== 'undefined' && typeof HTMLMediaElement !== 'undefined') {
  const originalPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    const playPromise = originalPlay.apply(this);
    if (playPromise && typeof playPromise.catch === 'function') {
      return playPromise.catch((err: any) => {
        // AbortError is expected when component unmounts or pause is called during playback startup
        if (
          err?.name === 'AbortError' ||
          (typeof err?.message === 'string' && err.message.includes('interrupted'))
        ) {
          return;
        }
        throw err;
      });
    }
    return playPromise;
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason?.name === 'AbortError' ||
      (typeof event.reason?.message === 'string' && event.reason.message.includes('interrupted'))
    ) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

