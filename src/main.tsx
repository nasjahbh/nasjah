import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ensureLatestVersionLoaded } from './version';

// Invalidate obsolete browser caches if a new version is detected
ensureLatestVersionLoaded();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

