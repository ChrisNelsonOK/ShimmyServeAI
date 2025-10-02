import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './hooks/useAuth.tsx';
import { ToastProvider } from './components/Common/Toast.tsx';
import { ErrorBoundary } from './components/Common/ErrorBoundary.tsx';
import { initializeEnvironment } from './utils/envValidation.ts';
import { initializeCSRF } from './utils/csrfProtection.ts';
import { realLoggingService } from './services/realLoggingService.ts';
import './index.css';

// Initialize application with production security features
try {
  console.log('🚀 Starting ShimmyServe application...');
  console.log('🔐 Initializing security features...');
  
  // Initialize production security features
  initializeEnvironment();
  initializeCSRF();
  
  // Initialize real logging service
  console.log('📝 Starting real logging service...');
  realLoggingService.startCapturing();
  realLoggingService.startAutoFlush();
  realLoggingService.info('system', 'ShimmyServe AI application started successfully');
  
  console.log('✅ Application initialization complete');
} catch (error) {
  console.error('❌ Failed to initialize application:', error);
  realLoggingService.error('system', `Application initialization failed: ${error}`);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);