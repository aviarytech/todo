import { useAuth, useUser, SignInButton, SignUpButton, SignOutButton } from '@clerk/clerk-react'
import { useConvexAuth } from 'convex/react'
import './App.css'

function App() {
  const { isSignedIn, userId } = useAuth()
  const { user } = useUser()
  const { isLoading: convexLoading, isAuthenticated: convexAuthenticated } = useConvexAuth()

  return (
    <div className="app">
      <header className="app-header">
        <h1>Todo App</h1>
        <div className="auth-section">
          {!isSignedIn ? (
            <div className="auth-buttons">
              <SignInButton mode="modal">
                <button className="btn btn-primary">Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="btn btn-secondary">Sign Up</button>
              </SignUpButton>
            </div>
          ) : (
            <div className="user-section">
              <div className="user-info">
                <p>Welcome, {user?.firstName || user?.emailAddresses[0]?.emailAddress || 'User'}!</p>
                <SignOutButton>
                  <button className="btn btn-outline">Sign Out</button>
                </SignOutButton>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        <div className="auth-state">
          <h2>Authentication State</h2>
          <div className="state-grid">
            <div className="state-item">
              <span className="state-label">Clerk Signed In:</span>
              <span className={`state-value ${isSignedIn ? 'success' : 'error'}`}>
                {isSignedIn ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="state-item">
              <span className="state-label">Clerk User ID:</span>
              <span className="state-value">{userId || 'N/A'}</span>
            </div>
            <div className="state-item">
              <span className="state-label">Convex Loading:</span>
              <span className={`state-value ${convexLoading ? 'warning' : 'success'}`}>
                {convexLoading ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="state-item">
              <span className="state-label">Convex Authenticated:</span>
              <span className={`state-value ${convexAuthenticated ? 'success' : 'error'}`}>
                {convexAuthenticated ? 'Yes' : 'No'}
              </span>
            </div>
            {user && (
              <>
                <div className="state-item">
                  <span className="state-label">Email:</span>
                  <span className="state-value">{user.emailAddresses[0]?.emailAddress || 'N/A'}</span>
                </div>
                <div className="state-item">
                  <span className="state-label">First Name:</span>
                  <span className="state-value">{user.firstName || 'N/A'}</span>
                </div>
                <div className="state-item">
                  <span className="state-label">Last Name:</span>
                  <span className="state-value">{user.lastName || 'N/A'}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
