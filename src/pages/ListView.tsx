/**
 * List view page showing items in a single list.
 *
 * Displays list header with actions, items, and add item input.
 */

import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id, Doc } from "../../convex/_generated/dataModel";
import { useIdentity } from "../hooks/useIdentity";
import { AddItemInput } from "../components/AddItemInput";
import { ListItem } from "../components/ListItem";
import { DeleteListDialog } from "../components/DeleteListDialog";
import { ShareModal } from "../components/ShareModal";
import { CollaboratorBadge } from "../components/CollaboratorBadge";

export function ListView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { did, privateKey } = useIdentity();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const listId = id as Id<"lists">;
  const list = useQuery(api.lists.getList, { listId });
  const items = useQuery(api.items.getListItems, { listId });

  if (!did || !privateKey) {
    return null; // IdentitySetup will show instead
  }

  if (list === undefined || items === undefined) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (list === null) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">List not found</h2>
        <p className="text-gray-500 mb-4">This list may have been deleted.</p>
        <Link to="/" className="text-blue-600 hover:text-blue-700">
          Back to lists
        </Link>
      </div>
    );
  }

  const isOwner = list.ownerDid === did;
  const isAuthorized = isOwner || list.collaboratorDid === did;

  if (!isAuthorized) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access denied</h2>
        <p className="text-gray-500 mb-4">You don't have access to this list.</p>
        <Link to="/" className="text-blue-600 hover:text-blue-700">
          Back to lists
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4 mb-6">
        {/* Back button - min 44x44px touch target */}
        <Link
          to="/"
          className="flex-shrink-0 w-11 h-11 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          aria-label="Back to lists"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{list.name}</h2>
          <CollaboratorBadge collaboratorDid={list.collaboratorDid} />
        </div>

        {/* Action buttons - min 44px height for touch targets */}
        <div className="flex items-center gap-2">
          {isOwner && !list.collaboratorDid && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-4 py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Share
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              className="px-4 py-2.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No items yet. Add one below!
          </div>
        ) : (
          items.map((item: Doc<"items">) => (
            <ListItem
              key={item._id}
              item={item}
              list={list}
              userDid={did}
              userPrivateKey={privateKey}
            />
          ))
        )}
      </div>

      {/* Add Item Input */}
      <div className="mt-4">
        <AddItemInput listId={listId} assetDid={list.assetDid} />
      </div>

      {/* Modals */}
      {isDeleteDialogOpen && (
        <DeleteListDialog
          list={list}
          onClose={() => setIsDeleteDialogOpen(false)}
          onDeleted={() => navigate("/")}
        />
      )}

      {isShareModalOpen && (
        <ShareModal
          list={list}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
}
