import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import App from './App.tsx';
import PrivacyPolicy from './screens/PrivacyPolicy.tsx';
import './index.css';

const root = document.getElementById('root')!;
const isPrivacyPolicy = window.location.href.includes('privacy-policy');

GoogleAuth.initialize({
  clientId: '94817684781-sojeh06ql6q72brl1ml58erpetc8hobr.apps.googleusercontent.com',
  scopes: ['profile', 'email'],
  grantOfflineAccess: Capacitor.getPlatform() === 'web',
});

createRoot(root).render(
  <StrictMode>
    {isPrivacyPolicy ? <PrivacyPolicy /> : <App />}
  </StrictMode>,
);
