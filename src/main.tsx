import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { BrandingProvider } from './lib/branding';
import { initDisplayPrefs } from './lib/panelPrefs';
import './styles/global.css';

initDisplayPrefs();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrandingProvider>
      <App />
    </BrandingProvider>
  </StrictMode>,
);
