import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '@fontsource-variable/inter';
import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-devanagari/600.css';
import '@fontsource/noto-sans-telugu/400.css';
import '@fontsource/noto-sans-telugu/600.css';
import './index.css';
import App from './App';
import { StoreProvider } from './lib/store';

// Theme before first paint (light default; the toggle in the top bar stores the choice).
try { if (localStorage.getItem('bw-theme') === 'dark') document.documentElement.classList.add('dark'); } catch { /* private mode */ }

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </HashRouter>
  </React.StrictMode>,
);
