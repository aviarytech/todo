import { useAuth } from '@clerk/clerk-react'
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import SignInButton from './components/SignInButton'
import SignUpButton from './components/SignUpButton'
import UserButton from './components/UserButton'

function App() {
  const { isSignedIn, userId } = useAuth()
  const user = useQuery(api.auth.getCurrentUser)

  return (
    <div className="app">
      <header className="app-header">
        <h1>Todo App</h1>
        <div className="auth-section">
          {isSignedIn ? (
            <>
              <UserButton />
              <div className="auth-state">
                <p>Signed in as: {userId}</p>
                {user && <p>Convex auth: {user.authenticated ? 'Active' : 'Inactive'}</p>}
              </div>
            </>
          ) : (
            <div className="auth-actions">
              <SignInButton />
              <SignUpButton />
            </div>
          )}
        </div>
      </header>
      <main>
        {isSignedIn ? (
          <div className="content">
            <h2>Welcome! You are authenticated.</h2>
            <p>Your authentication state is working correctly.</p>
            {user && (
              <div className="auth-info">
                <p>Convex authentication is active.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="content">
            <h2>Please sign in to continue</h2>
            <p>Use the buttons above to sign in or create an account.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
