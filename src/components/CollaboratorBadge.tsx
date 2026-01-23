/**
 * Badge showing the collaborator on a shared list.
 */

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface CollaboratorBadgeProps {
  collaboratorDid: string | undefined;
}

export function CollaboratorBadge({ collaboratorDid }: CollaboratorBadgeProps) {
  const user = useQuery(
    api.users.getUser,
    collaboratorDid ? { did: collaboratorDid } : "skip"
  );

  if (!collaboratorDid) {
    return null;
  }

  if (user === undefined) {
    return (
      <span className="text-sm text-gray-400">Loading collaborator...</span>
    );
  }

  const name = user?.displayName || "Unknown";

  return (
    <span className="inline-flex items-center gap-1 text-sm text-green-600">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      Shared with {name}
    </span>
  );
}
