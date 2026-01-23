/**
 * List view page showing items in a single list.
 *
 * Displays list header with actions, items, and add item input.
 * Updated for Phase 3: unlimited collaborators with roles.
 * Updated for Phase 4: publish/unpublish functionality.
 * Updated for Phase 5.5: optimistic updates for items.
 */

import { useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useCollaborators } from "../hooks/useCollaborators";
import { useOptimisticItems, type OptimisticItem } from "../hooks/useOptimisticItems";
import { useOffline } from "../hooks/useOffline";
import { canEdit, canInvite, canDeleteList } from "../lib/permissions";
import { AddItemInput } from "../components/AddItemInput";
import { ListItem } from "../components/ListItem";
import { DeleteListDialog } from "../components/DeleteListDialog";
import { ShareModal } from "../components/ShareModal";
import { CollaboratorList } from "../components/sharing/CollaboratorList";
import { PublishModal } from "../components/publish/PublishModal";

export function ListView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { did, legacyDid, isLoading: userLoading, getSigner } = useCurrentUser();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<Id<"items"> | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<Id<"items"> | null>(null);

  const listId = id as Id<"lists">;
  const list = useQuery(api.lists.getList, { listId });

  // Use optimistic items hook for Phase 5.5 (with offline cache fallback)
  const {
    items,
    addItem,
    checkItem,
    uncheckItem,
    reorderItems,
    isLoading: itemsLoading,
    usingCache,
  } = useOptimisticItems(listId);

  // Get user's role and collaborators (Phase 3)
  const { userRole, collaborators, isLoading: collabLoading } = useCollaborators(listId);

  // Get publication status (Phase 4)
  const publicationStatus = useQuery(api.publication.getPublicationStatus, { listId });

  // Get online status for disabling destructive operations (Phase 5.9)
  const { isOnline } = useOffline();

  const handleDragStart = useCallback((itemId: Id<"items">) => {
    setDraggedItemId(itemId);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, itemId: Id<"items">) => {
      e.preventDefault();
      if (draggedItemId && draggedItemId !== itemId) {
        setDragOverItemId(itemId);
      }
    },
    [draggedItemId]
  );

  const handleDragEnd = useCallback(async () => {
    if (!draggedItemId || !dragOverItemId || items.length === 0 || !did) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    // Calculate new order
    const itemIds = items.map((item) => item._id);
    const draggedIndex = itemIds.indexOf(draggedItemId);
    const targetIndex = itemIds.indexOf(dragOverItemId);

    if (
      draggedIndex !== -1 &&
      targetIndex !== -1 &&
      draggedIndex !== targetIndex
    ) {
      // Remove from old position and insert at new position
      const newItemIds = [...itemIds];
      newItemIds.splice(draggedIndex, 1);
      newItemIds.splice(targetIndex, 0, draggedItemId);

      // Update the order using optimistic reorderItems (queues when offline)
      await reorderItems(newItemIds, did, legacyDid ?? undefined);
    }

    setDraggedItemId(null);
    setDragOverItemId(null);
  }, [draggedItemId, dragOverItemId, items, did, legacyDid, reorderItems]);

  // Loading state (user or data)
  if (
    userLoading ||
    !did ||
    list === undefined ||
    itemsLoading ||
    collabLoading
  ) {
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
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          List not found
        </h2>
        <p className="text-gray-500 mb-4">This list may have been deleted.</p>
        <Link to="/" className="text-blue-600 hover:text-blue-700">
          Back to lists
        </Link>
      </div>
    );
  }

  // Check authorization using collaborators table (Phase 3)
  // userRole will be null if not a collaborator
  const isAuthorized = userRole !== null;

  // Fallback: Also check legacy ownerDid field for unmigrated lists
  const userDids = [did, legacyDid].filter(Boolean) as string[];
  const legacyAuthorized = userDids.includes(list.ownerDid);

  if (!isAuthorized && !legacyAuthorized) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Access denied
        </h2>
        <p className="text-gray-500 mb-4">You don't have access to this list.</p>
        <Link to="/" className="text-blue-600 hover:text-blue-700">
          Back to lists
        </Link>
      </div>
    );
  }

  // Determine effective role (from collaborators table or inferred from legacy fields)
  const effectiveRole =
    userRole ?? (userDids.includes(list.ownerDid) ? "owner" : "editor");
  const canUserEdit = canEdit(effectiveRole);
  const canUserInvite = canInvite(effectiveRole);
  const canUserDelete = canDeleteList(effectiveRole);

  // Get the signer for credential signing
  const signer = getSigner();

  // Count collaborators for display
  const collaboratorCount = collaborators?.length ?? 0;

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
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>

        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
            {list.name}
          </h2>
          {/* Collaborators toggle button */}
          {collaboratorCount > 0 && (
            <button
              onClick={() => setShowCollaborators(!showCollaborators)}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {collaboratorCount} collaborator{collaboratorCount !== 1 ? "s" : ""}
              <svg
                className={`w-3 h-3 transition-transform ${
                  showCollaborators ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Action buttons - min 44px height for touch targets */}
        <div className="flex items-center gap-2">
          {/* Publish button - only show for owners (Phase 4) */}
          {/* Disabled when offline (Phase 5.9) */}
          {canUserDelete && (
            <button
              onClick={() => setIsPublishModalOpen(true)}
              disabled={!isOnline}
              title={!isOnline ? "Available when online" : undefined}
              className={`px-4 py-2.5 text-sm rounded-lg ${
                !isOnline ? "opacity-50 cursor-not-allowed" : ""
              } ${
                publicationStatus?.status === "active"
                  ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                  : "bg-purple-600 text-white hover:bg-purple-700"
              }`}
            >
              {publicationStatus?.status === "active" ? "Published" : "Publish"}
            </button>
          )}
          {canUserInvite && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-4 py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Share
            </button>
          )}
          {/* Delete button - disabled when offline (Phase 5.9) */}
          {canUserDelete && (
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={!isOnline}
              title={!isOnline ? "Available when online" : undefined}
              className={`px-4 py-2.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 ${
                !isOnline ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Collaborators panel (collapsible) */}
      {showCollaborators && (
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Collaborators
          </h3>
          <CollaboratorList listId={listId} onLeave={() => navigate("/")} />
        </div>
      )}

      {/* Cached data indicator */}
      {usingCache && (
        <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Showing cached items. Some information may be outdated.</span>
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No items yet. Add one below!
          </div>
        ) : (
          items.map((item: OptimisticItem) => (
            <ListItem
              key={item._id}
              item={item}
              list={list}
              userDid={did}
              legacyDid={legacyDid ?? undefined}
              signer={signer}
              canEdit={canUserEdit}
              isDragging={draggedItemId === item._id}
              isDragOver={dragOverItemId === item._id}
              onDragStart={() => handleDragStart(item._id)}
              onDragOver={(e) => handleDragOver(e, item._id)}
              onDragEnd={handleDragEnd}
              onCheck={checkItem}
              onUncheck={uncheckItem}
            />
          ))
        )}
      </div>

      {/* Add Item Input - only show if user can edit */}
      {canUserEdit && (
        <div className="mt-4">
          <AddItemInput assetDid={list.assetDid} onAddItem={addItem} />
        </div>
      )}

      {/* Viewer notice */}
      {!canUserEdit && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center text-gray-500 text-sm">
          You have view-only access to this list.
        </div>
      )}

      {/* Modals */}
      {isDeleteDialogOpen && (
        <DeleteListDialog
          list={list}
          onClose={() => setIsDeleteDialogOpen(false)}
          onDeleted={() => navigate("/")}
        />
      )}

      {isShareModalOpen && (
        <ShareModal list={list} onClose={() => setIsShareModalOpen(false)} />
      )}

      {isPublishModalOpen && (
        <PublishModal list={list} onClose={() => setIsPublishModalOpen(false)} />
      )}
    </div>
  );
}
