import { useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { useIdentity } from './hooks/useIdentity'
import { useAuth } from './hooks/useAuth'
import { ErrorBoundary } from './components/ErrorBoundary'
import { IdentitySetup } from './components/IdentitySetup'
import { MigrationPrompt } from './components/auth/MigrationPrompt'
import { hasDismissedMigration } from './lib/migration'
import { ProfileBadge } from './components/ProfileBadge'
import { Home } from './pages/Home'
import { ListView } from './pages/ListView'
import { JoinList } from './pages/JoinList'

function App() {
  const { hasIdentity, isLoading: identityLoading } = useIdentity()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [migrationDismissed, setMigrationDismissed] = useState(hasDismissedMigration)

  // Combined loading state
  const isLoading = identityLoading || authLoading

  // Show migration prompt if:
  // 1. User has legacy localStorage identity
  // 2. User is NOT authenticated with Turnkey
  // 3. User hasn't dismissed the prompt this session
  const shouldShowMigrationPrompt =
    hasIdentity && !isAuthenticated && !migrationDismissed

  // Show loading state while checking localStorage
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Show identity setup for new users (no localStorage identity) */}
      {!hasIdentity && !isAuthenticated && <IdentitySetup />}

      {/* Show migration prompt for existing localStorage users */}
      {shouldShowMigrationPrompt && (
        <MigrationPrompt onDismiss={() => setMigrationDismissed(true)} />
      )}

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
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}

export default App
