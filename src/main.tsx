import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import App from './App.tsx'
import './index.css'

const convexUrl = import.meta.env.VITE_CONVEX_URL || ''
const convex = new ConvexReactClient(convexUrl)
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!clerkPublishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable')
}

function ConvexProviderWithAuth({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth()
  
  useEffect(() => {
    convex.setAuth(
      async () => {
        const token = await getToken({ template: 'convex' })
        return token || null
      },
      () => {
        // Auth state changed
      }
    )
  }, [getToken])
  
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <ConvexProviderWithAuth>
        <App />
      </ConvexProviderWithAuth>
    </ClerkProvider>
  </React.StrictMode>,
)
