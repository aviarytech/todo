/**
 * Profile badge component showing current user's display name.
 *
 * Displayed in the app header. Shows the first letter of the display name
 * as an avatar along with the full name.
 */

import { useIdentity } from "../hooks/useIdentity";

export function ProfileBadge() {
  const { displayName, isLoading } = useIdentity();

  if (isLoading || !displayName) {
    return null;
  }

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
        {initial}
      </div>
      <span className="text-sm font-medium text-gray-700">{displayName}</span>
    </div>
  );
}
