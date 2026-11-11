import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { loadSettings } from './lib/settings';
import { applyTheme, SettingsProvider } from './state/SettingsProvider';
import { StatsProvider } from './state/StatsProvider';
import { WorldGeoProvider } from './state/WorldGeoProvider';

// Apply the stored theme before first paint so there is no light/dark flash.
applyTheme(loadSettings().theme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <StatsProvider>
          <WorldGeoProvider>
            <App />
          </WorldGeoProvider>
        </StatsProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
);
