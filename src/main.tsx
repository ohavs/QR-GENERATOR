import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ConfirmProvider } from './components/ui/Confirm';
import { ToastProvider } from './hooks/useToast';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('לא נמצא אלמנט השורש #root');

createRoot(container).render(
  <StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </ToastProvider>
  </StrictMode>,
);
