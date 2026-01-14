import { UserButton as ClerkUserButton } from '@clerk/clerk-react'

function UserButton() {
  return <ClerkUserButton afterSignOutUrl="/" />
}

export default UserButton
