import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProfileBadge } from './components/ProfileBadge'
import { Home } from './pages/Home'
import { ListView } from './pages/ListView'
import { JoinList } from './pages/JoinList'
import { Login } from './pages/Login'
import { PublicList } from './pages/PublicList'

function App() {
  const { isAuthenticated, isLoading } = useAuth()

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  // Unauthenticated users see the login page (but public lists are accessible)
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/join/:listId/:token" element={<JoinList />} />
        <Route path="/public/:did" element={<PublicList />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Authenticated users see the main app
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
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/list/:id" element={<ListView />} />
            <Route path="/join/:listId/:token" element={<JoinList />} />
            <Route path="/public/:did" element={<PublicList />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}

export default App
