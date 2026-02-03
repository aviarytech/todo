import { lazy, Suspense } from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { AuthGuard } from './components/auth/AuthGuard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProfileBadge } from './components/ProfileBadge'
import { OfflineIndicator } from './components/offline/OfflineIndicator'
import { ToastContainer } from './components/notifications/Toast'

// Static imports for frequently used routes
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Landing } from './pages/Landing'

// Lazy-loaded routes for better code splitting
const ListView = lazy(() => import('./pages/ListView').then(m => ({ default: m.ListView })))
const JoinList = lazy(() => import('./pages/JoinList').then(m => ({ default: m.JoinList })))
const PublicList = lazy(() => import('./pages/PublicList').then(m => ({ default: m.PublicList })))

/**
 * Authenticated layout wrapper with header and navigation.
 * Used by AuthGuard for protected routes.
 */
function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2 text-xl font-bold text-amber-900 hover:text-amber-700">
            <span>💩</span> PooApp
          </Link>
          <ProfileBadge />
        </div>
      </header>
      <main className="container mx-auto p-4">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded w-64"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

function App() {
  const { isAuthenticated } = useAuth()

  return (
    <>
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
          <Route path="/list/:id" element={<ProtectedRoute><ListView /></ProtectedRoute>} />

          {/* Fallback - redirect to app (AuthGuard will handle login redirect if needed) */}
          <Route path="*" element={<ProtectedRoute><Navigate to="/app" replace /></ProtectedRoute>} />
        </Routes>
      </Suspense>
      <ToastContainer />
    </>
  )
}

export default App
