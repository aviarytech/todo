import { Routes, Route } from 'react-router-dom'
import { useIdentity } from './hooks/useIdentity'
import { IdentitySetup } from './components/IdentitySetup'
import { ProfileBadge } from './components/ProfileBadge'

function App() {
  const { hasIdentity, isLoading } = useIdentity()

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
      {!hasIdentity && <IdentitySetup />}

      <header className="bg-white shadow-sm p-4">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Lisa</h1>
          <ProfileBadge />
        </div>
      </header>

      <main className="container mx-auto p-4">
        <Routes>
          <Route path="/" element={<div>Home placeholder</div>} />
          <Route path="/list/:id" element={<div>ListView placeholder</div>} />
          <Route path="/join/:listId/:token" element={<div>JoinList placeholder</div>} />
        </Routes>
      </main>
    </div>
  )
}

export default App
