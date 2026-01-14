import { SignUpButton as ClerkSignUpButton } from '@clerk/clerk-react'

function SignUpButton() {
  return (
    <ClerkSignUpButton mode="modal">
      <button>Sign Up</button>
    </ClerkSignUpButton>
  )
}

export default SignUpButton
