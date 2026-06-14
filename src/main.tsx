// Legacy storage migration — MUST run before any store module is imported.
// This side-effect import rewrites `scrutix-*` localStorage keys to `atlasbanx-*`.
import './lib/migrateLegacyStorage';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initAtlasErrorMonitor } from './lib/atlasErrorMonitor';

// Remonte les erreurs vers la console Atlas Studio (Error Monitor + Bug-Triage).
initAtlasErrorMonitor('atlasbanx');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
