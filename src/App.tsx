import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { AuthGuard } from './components/auth/AuthGuard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProfileBadge } from './components/ProfileBadge'
import { OfflineIndicator } from './components/offline/OfflineIndicator'
import { ToastContainer } from './components/notifications/Toast'
import { Home } from './pages/Home'
import { ListView } from './pages/ListView'
import { JoinList } from './pages/JoinList'
import { Login } from './pages/Login'
import { PublicList } from './pages/PublicList'

/**
 * Authenticated layout wrapper with header and navigation.
 * Used by AuthGuard for protected routes.
 */
function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="text-xl font-bold hover:text-gray-700">
            Lisa
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

function App() {
  const { isAuthenticated } = useAuth()

  return (
    <>
      <OfflineIndicator />
      <Routes>
        {/* Public routes - accessible without authentication */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/join/:listId/:token" element={<JoinList />} />
        <Route path="/public/:did" element={<PublicList />} />

        {/* Protected routes - require authentication */}
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/list/:id" element={<ProtectedRoute><ListView /></ProtectedRoute>} />

        {/* Fallback - redirect to home (AuthGuard will handle login redirect if needed) */}
        <Route path="*" element={<ProtectedRoute><Navigate to="/" replace /></ProtectedRoute>} />
      </Routes>
      <ToastContainer />
    </>
  )
}

export default App
