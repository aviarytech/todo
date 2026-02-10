import { lazy, Suspense, useState, useEffect } from 'react'
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useSettings } from './hooks/useSettings'
import { AuthGuard } from './components/auth/AuthGuard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProfileBadge } from './components/ProfileBadge'
import { OfflineIndicator } from './components/offline/OfflineIndicator'
import { ToastContainer } from './components/notifications/Toast'
import { Settings } from './components/Settings'
import { AppLockGuard } from './components/AppLockGuard'
import { useSwipeBack } from './hooks/useSwipeBack'
import { initDeepLinks } from './lib/deeplinks'
import { initPushNotifications } from './lib/pushNotifications'

// Lazy-loaded routes for better code splitting
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })))
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })))
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })))
const ListView = lazy(() => import('./pages/ListView').then(m => ({ default: m.ListView })))
const JoinList = lazy(() => import('./pages/JoinList').then(m => ({ default: m.JoinList })))
const PublicList = lazy(() => import('./pages/PublicList').then(m => ({ default: m.PublicList })))
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })))
const Templates = lazy(() => import('./pages/Templates').then(m => ({ default: m.Templates })))
const PriorityFocus = lazy(() => import('./pages/PriorityFocus').then(m => ({ default: m.PriorityFocus })))

/**
 * Authenticated layout wrapper with header and navigation.
 * Features dark mode support and improved styling.
 */
function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { haptic, darkMode, toggleDarkMode } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 transition-colors">
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-amber-500 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 safe-area-inset-top">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link 
            to="/app" 
            onClick={() => haptic('light')}
            className="flex items-center gap-2 text-xl font-black text-amber-900 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
          >
            <span className="text-2xl">💩</span>
            <span className="bg-gradient-to-r from-amber-700 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
              Poo App
            </span>
          </Link>
          
          <div className="flex items-center gap-2">
            {/* Settings button */}
            <button
              onClick={() => {
                haptic('light');
                setIsSettingsOpen(true);
              }}
              className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              aria-label="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Dark mode quick toggle */}
            <button
              onClick={() => {
                haptic('light');
                toggleDarkMode();
              }}
              className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <ProfileBadge />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="container mx-auto px-4 py-6 safe-area-inset-bottom flex-1">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      {/* Settings modal */}
      {isSettingsOpen && <Settings onClose={() => setIsSettingsOpen(false)} />}
    </div>
  )
}

/**
 * Protected route wrapper combining AuthGuard with authenticated layout.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </AuthGuard>
  )
}

/**
 * Loading fallback for lazy-loaded routes.
 */
function PageLoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl animate-bounce-slow mb-4">💩</div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto"></div>
        </div>
      </div>
    </div>
  )
}

function App() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Enable swipe-right from left edge to go back (mobile PWA)
  useSwipeBack()

  // Initialize deep links for mobile
  useEffect(() => {
    initDeepLinks(navigate)
  }, [navigate])

  // Initialize push notifications after user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      initPushNotifications();
    }
  }, [isAuthenticated]);

  return (
    <AppLockGuard>
      <OfflineIndicator />
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          {/* Public routes - accessible without authentication */}
          <Route path="/login" element={isAuthenticated ? <Navigate to="/app" replace /> : <Login />} />
          <Route path="/join/:listId/:token" element={<JoinList />} />
          <Route path="/public/:did" element={<PublicList />} />

          {/* Landing page for unauthenticated, redirect to app if logged in */}
          <Route path="/" element={isAuthenticated ? <Navigate to="/app" replace /> : <Landing />} />

          {/* Protected routes - require authentication */}
          <Route path="/app" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
          <Route path="/priority" element={<ProtectedRoute><PriorityFocus /></ProtectedRoute>} />
          <Route path="/list/:id" element={<ProtectedRoute><ListView /></ProtectedRoute>} />

          {/* Fallback - redirect to app (AuthGuard will handle login redirect if needed) */}
          <Route path="*" element={<ProtectedRoute><Navigate to="/app" replace /></ProtectedRoute>} />
        </Routes>
      </Suspense>
      <ToastContainer />
    </AppLockGuard>
  )
}

export default App
