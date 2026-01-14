import { SignInButton as ClerkSignInButton } from '@clerk/clerk-react'

function SignInButton() {
  return (
    <ClerkSignInButton mode="modal">
      <button>Sign In</button>
    </ClerkSignInButton>
  )
}

export default SignInButton
