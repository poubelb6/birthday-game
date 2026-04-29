import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import PrivacyPolicy from './screens/PrivacyPolicy.tsx';
import './index.css';

const root = document.getElementById('root')!;
const isPrivacyPolicy = window.location.pathname === '/privacy-policy';

createRoot(root).render(
  <StrictMode>
    {isPrivacyPolicy ? <PrivacyPolicy /> : <App />}
  </StrictMode>,
);
