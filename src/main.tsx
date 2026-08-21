import { Capacitor } from '@capacitor/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { startShareIntentBridge } from './capacitor/shareIntent';
import App from './App.tsx';
import './index.css';

if (!Capacitor.isNativePlatform()) {
  registerSW({ immediate: true });
}

startShareIntentBridge();

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element #root was not found');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
