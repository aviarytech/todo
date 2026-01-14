import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import App from './App.tsx'
import './index.css'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || ''
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL || ''

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable')
}

if (!CONVEX_URL) {
  throw new Error('Missing VITE_CONVEX_URL environment variable')
}

function ConvexProviderWithClerk({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithAuth>{children}</ConvexProviderWithAuth>
    </ClerkProvider>
  )
}

function ConvexProviderWithAuth({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded } = useAuth()
  const [convex] = React.useState(() => new ConvexReactClient(CONVEX_URL))

  React.useEffect(() => {
    if (isLoaded) {
      convex.setAuth(async () => {
        const token = await getToken({ template: 'convex' })
        return token || undefined
      })
    }
  }, [isLoaded, getToken, convex])

  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConvexProviderWithClerk>
      <App />
    </ConvexProviderWithClerk>
  </React.StrictMode>,
)
