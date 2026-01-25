/**
 * Card displaying a list summary.
 *
 * Shows list name and ownership status. Links to the list view.
 * Note: "Shared" badge was removed since collaboratorDid field is deprecated.
 * Shared status is now determined by collaborators table (shown in ListView).
 */

import { Link } from "react-router-dom";
import type { Doc } from "../../convex/_generated/dataModel";

interface ListCardProps {
  list: Doc<"lists">;
  currentUserDid: string;
  /** Show owner attribution for shared lists */
  showOwner?: boolean;
}

/** Truncate a DID for display, showing first and last parts */
function truncateDid(did: string): string {
  if (did.length <= 24) return did;
  return `${did.slice(0, 12)}...${did.slice(-8)}`;
}

export function ListCard({ list, currentUserDid, showOwner }: ListCardProps) {
  const isOwner = list.ownerDid === currentUserDid;

  return (
    <Link
      to={`/list/${list._id}`}
      className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4"
    >
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-gray-900 truncate">{list.name}</h3>
        {!isOwner && (
          <span className="flex-shrink-0 ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            Shared
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-gray-500">
        {isOwner ? (
          "Created by you"
        ) : showOwner ? (
          <span title={list.ownerDid}>Owner: {truncateDid(list.ownerDid)}</span>
        ) : (
          "Shared with you"
        )}
      </p>
    </Link>
  );
}
