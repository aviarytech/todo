import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'
import { SettingsProvider } from './hooks/useSettings'
import { registerServiceWorker } from './lib/sw-registration'
import { initDarkMode } from './lib/storage'
import './index.css'
import App from './App.tsx'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

// Initialize dark mode early to avoid a flash on load
initDarkMode();

// Register service worker for offline support
registerServiceWorker({
  onUpdate: () => {
    console.log('App update available. Refresh to get the latest version.');
  },
  onSuccess: () => {
    console.log('App is ready for offline use.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <AuthProvider>
        <ToastProvider>
          <SettingsProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </SettingsProvider>
        </ToastProvider>
      </AuthProvider>
    </ConvexProvider>
  </StrictMode>,
)
