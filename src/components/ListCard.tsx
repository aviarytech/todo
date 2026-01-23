/**
 * Card displaying a list summary.
 *
 * Shows list name, shared status, and links to the list view.
 */

import { Link } from "react-router-dom";
import type { Doc } from "../../convex/_generated/dataModel";

interface ListCardProps {
  list: Doc<"lists">;
  currentUserDid: string;
}

export function ListCard({ list, currentUserDid }: ListCardProps) {
  const isOwner = list.ownerDid === currentUserDid;
  const isShared = !!list.collaboratorDid;

  return (
    <Link
      to={`/list/${list._id}`}
      className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4"
    >
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-gray-900 truncate">{list.name}</h3>
        {isShared && (
          <span className="flex-shrink-0 ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            Shared
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-gray-500">
        {isOwner ? "Created by you" : "Shared with you"}
      </p>
    </Link>
  );
}
