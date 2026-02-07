/**
 * List view page showing items in a single list.
 *
 * Displays list header with actions, items, and add item input.
 * Features improved design, dark mode, and better empty states.
 * Supports list view and calendar view modes.
 */

import React, { useState, useCallback, useRef, lazy, Suspense, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id, Doc } from "../../convex/_generated/dataModel";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useCollaborators } from "../hooks/useCollaborators";
import { useOptimisticItems, type OptimisticItem } from "../hooks/useOptimisticItems";
import { useOffline } from "../hooks/useOffline";
import { useSettings } from "../hooks/useSettings";
import { useTouchDrag } from "../hooks/useTouchDrag";
import { useNotifications } from "../hooks/useNotifications";
import { useKeyboardShortcuts, KeyboardShortcutsHelp, type Shortcut } from "../hooks/useKeyboardShortcuts";
import { canEdit, canInvite, canDeleteList } from "../lib/permissions";
import { AddItemInput } from "../components/AddItemInput";
import { ListItem } from "../components/ListItem";
import { CollaboratorList } from "../components/sharing/CollaboratorList";
import { NoItemsEmptyState } from "../components/ui/EmptyState";
import { ListViewSkeleton } from "../components/ui/Skeleton";
import { CalendarView } from "../components/CalendarView";
import { BatchOperations } from "../components/BatchOperations";

// Lazy-loaded modals for better bundle splitting
const DeleteListDialog = lazy(() => import("../components/DeleteListDialog").then(m => ({ default: m.DeleteListDialog })));
const ShareModal = lazy(() => import("../components/ShareModal").then(m => ({ default: m.ShareModal })));
const PublishModal = lazy(() => import("../components/publish/PublishModal").then(m => ({ default: m.PublishModal })));
const ItemDetailsModal = lazy(() => import("../components/ItemDetailsModal").then(m => ({ default: m.ItemDetailsModal })));

type ViewMode = "list" | "calendar";

export function ListView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { did, legacyDid, isLoading: userLoading } = useCurrentUser();
  const { haptic } = useSettings();
  const { scheduleItemsNotifications, isEnabled: notificationsEnabled } = useNotifications({ userDid: did });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<Id<"items"> | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<Id<"items"> | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedCalendarItem, setSelectedCalendarItem] = useState<Doc<"items"> | null>(null);
  const itemsContainerRef = useRef<HTMLDivElement>(null);
  
  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<Id<"items">>>(new Set());
  
  // Keyboard navigation state
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<Doc<"items"> | null>(null);
  const addItemInputRef = useRef<HTMLInputElement>(null);

  const listId = id as Id<"lists">;
  const list = useQuery(api.lists.getList, { listId });

  // Use optimistic items hook (with offline cache fallback)
  const {
    items,
    addItem,
    checkItem,
    uncheckItem,
    reorderItems,
    isLoading: itemsLoading,
    usingCache,
  } = useOptimisticItems(listId);
  
  // Mutation for removing items via keyboard
  const removeItemMutation = useMutation(api.items.removeItem);

  // Multi-select callbacks (after items is defined)
  const toggleSelection = useCallback((itemId: Id<"items">) => {
    haptic('light');
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      // Exit select mode if no items selected
      if (newSet.size === 0) {
        setIsSelectMode(false);
      }
      return newSet;
    });
  }, [haptic]);

  const enterSelectMode = useCallback((itemId: Id<"items">) => {
    haptic('medium');
    setIsSelectMode(true);
    setSelectedIds(new Set([itemId]));
  }, [haptic]);

  const selectAll = useCallback(() => {
    haptic('light');
    setSelectedIds(new Set(items.map(item => item._id)));
  }, [items, haptic]);

  const clearSelection = useCallback(() => {
    haptic('light');
    setSelectedIds(new Set());
    setIsSelectMode(false);
  }, [haptic]);

  // Sorted items for consistent keyboard navigation
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.checked !== b.checked) {
        return a.checked ? 1 : -1;
      }
      const orderA = a.order ?? a.createdAt;
      const orderB = b.order ?? b.createdAt;
      return orderA - orderB;
    });
  }, [items]);

  // Get user's role and collaborators
  const { userRole, collaborators, isLoading: collabLoading } = useCollaborators(listId);

  // Get publication status
  const publicationStatus = useQuery(api.publication.getPublicationStatus, { listId });

  // Get online status for disabling destructive operations
  const { isOnline } = useOffline();

  // Schedule notifications for items with due dates
  // Note: The actual items array type from useOptimisticItems includes Doc<"items"> properties
  useEffect(() => {
    if (notificationsEnabled && items.length > 0) {
      // Filter items that have dueDate and pass them to the scheduler
      const itemsWithDueDates = items.filter(item => 'dueDate' in item && item.dueDate);
      if (itemsWithDueDates.length > 0) {
        // Cast to the expected type - items from the query have the full Doc<"items"> shape
        scheduleItemsNotifications(itemsWithDueDates as unknown as import("../../convex/_generated/dataModel").Doc<"items">[]);
      }
    }
  }, [items, notificationsEnabled, scheduleItemsNotifications]);

  const handleDragStart = useCallback((itemId: Id<"items">) => {
    haptic('light');
    setDraggedItemId(itemId);
  }, [haptic]);

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

    const itemIds = items.map((item) => item._id);
    const draggedIndex = itemIds.indexOf(draggedItemId);
    const targetIndex = itemIds.indexOf(dragOverItemId);

    if (
      draggedIndex !== -1 &&
      targetIndex !== -1 &&
      draggedIndex !== targetIndex
    ) {
      haptic('medium');
      const newItemIds = [...itemIds];
      newItemIds.splice(draggedIndex, 1);
      newItemIds.splice(targetIndex, 0, draggedItemId);
      await reorderItems(newItemIds, did, legacyDid ?? undefined);
    }

    setDraggedItemId(null);
    setDragOverItemId(null);
  }, [draggedItemId, dragOverItemId, items, did, legacyDid, reorderItems, haptic]);

  // Touch drag reorder handler
  const handleTouchReorder = useCallback(async (draggedId: string, targetId: string) => {
    if (items.length === 0 || !did) return;

    const itemIds = items.map((item) => item._id);
    const draggedIndex = itemIds.indexOf(draggedId as Id<"items">);
    const targetIndex = itemIds.indexOf(targetId as Id<"items">);

    if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
      haptic('medium');
      const newItemIds = [...itemIds];
      newItemIds.splice(draggedIndex, 1);
      newItemIds.splice(targetIndex, 0, draggedId as Id<"items">);
      await reorderItems(newItemIds, did, legacyDid ?? undefined);
    }
  }, [items, did, legacyDid, reorderItems, haptic]);

  // Touch drag hook for mobile support
  const touchDrag = useTouchDrag({
    onReorder: handleTouchReorder,
    containerRef: itemsContainerRef,
  });

  // Keyboard shortcuts for power users
  const shortcuts: Shortcut[] = useMemo(() => {
    const canUserEditNow = userRole ? canEdit(userRole) : false;
    
    return [
      {
        key: "n",
        description: "New item (focus input)",
        action: () => {
          if (canUserEditNow) {
            addItemInputRef.current?.focus();
          }
        },
      },
      {
        key: "/",
        description: "Focus add item input",
        action: () => {
          if (canUserEditNow) {
            addItemInputRef.current?.focus();
          }
        },
      },
      {
        key: "j",
        description: "Move focus down",
        action: () => {
          if (sortedItems.length === 0) return;
          setFocusedIndex((prev) => {
            if (prev === null) return 0;
            return Math.min(prev + 1, sortedItems.length - 1);
          });
        },
      },
      {
        key: "k",
        description: "Move focus up",
        action: () => {
          if (sortedItems.length === 0) return;
          setFocusedIndex((prev) => {
            if (prev === null) return sortedItems.length - 1;
            return Math.max(prev - 1, 0);
          });
        },
      },
      {
        key: "ArrowDown",
        description: "Move focus down",
        action: () => {
          if (sortedItems.length === 0) return;
          setFocusedIndex((prev) => {
            if (prev === null) return 0;
            return Math.min(prev + 1, sortedItems.length - 1);
          });
        },
      },
      {
        key: "ArrowUp",
        description: "Move focus up",
        action: () => {
          if (sortedItems.length === 0) return;
          setFocusedIndex((prev) => {
            if (prev === null) return sortedItems.length - 1;
            return Math.max(prev - 1, 0);
          });
        },
      },
      {
        key: "x",
        description: "Toggle check on focused item",
        action: () => {
          if (!canUserEditNow || focusedIndex === null || !did) return;
          const item = sortedItems[focusedIndex];
          if (item) {
            if (item.checked) {
              uncheckItem(item._id, did, legacyDid ?? undefined);
            } else {
              checkItem(item._id, did, legacyDid ?? undefined);
            }
          }
        },
      },
      {
        key: " ",
        description: "Toggle check on focused item",
        action: () => {
          if (!canUserEditNow || focusedIndex === null || !did) return;
          const item = sortedItems[focusedIndex];
          if (item) {
            if (item.checked) {
              uncheckItem(item._id, did, legacyDid ?? undefined);
            } else {
              checkItem(item._id, did, legacyDid ?? undefined);
            }
          }
        },
      },
      {
        key: "e",
        description: "Edit focused item",
        action: () => {
          if (focusedIndex === null) return;
          const item = sortedItems[focusedIndex];
          if (item) {
            setEditingItem(item as Doc<"items">);
          }
        },
      },
      {
        key: "Enter",
        description: "Edit focused item",
        action: () => {
          if (focusedIndex === null) return;
          const item = sortedItems[focusedIndex];
          if (item) {
            setEditingItem(item as Doc<"items">);
          }
        },
      },
      {
        key: "d",
        description: "Delete focused item",
        action: () => {
          if (!canUserEditNow || focusedIndex === null || !did) return;
          const item = sortedItems[focusedIndex];
          if (item) {
            haptic('medium');
            removeItemMutation({ itemId: item._id, userDid: did, legacyDid: legacyDid ?? undefined });
            // Move focus up if at end of list
            if (focusedIndex >= sortedItems.length - 1) {
              setFocusedIndex(Math.max(0, sortedItems.length - 2));
            }
          }
        },
      },
      {
        key: "Delete",
        description: "Delete focused item",
        action: () => {
          if (!canUserEditNow || focusedIndex === null || !did) return;
          const item = sortedItems[focusedIndex];
          if (item) {
            haptic('medium');
            removeItemMutation({ itemId: item._id, userDid: did, legacyDid: legacyDid ?? undefined });
            // Move focus up if at end of list
            if (focusedIndex >= sortedItems.length - 1) {
              setFocusedIndex(Math.max(0, sortedItems.length - 2));
            }
          }
        },
      },
      {
        key: "Backspace",
        description: "Delete focused item",
        action: () => {
          if (!canUserEditNow || focusedIndex === null || !did) return;
          const item = sortedItems[focusedIndex];
          if (item) {
            haptic('medium');
            removeItemMutation({ itemId: item._id, userDid: did, legacyDid: legacyDid ?? undefined });
            // Move focus up if at end of list
            if (focusedIndex >= sortedItems.length - 1) {
              setFocusedIndex(Math.max(0, sortedItems.length - 2));
            }
          }
        },
      },
      {
        key: "Escape",
        description: "Clear focus / close modals",
        action: () => {
          setFocusedIndex(null);
          setEditingItem(null);
          if (isSelectMode) {
            clearSelection();
          }
        },
      },
    ];
  }, [sortedItems, focusedIndex, did, legacyDid, userRole, checkItem, uncheckItem, removeItemMutation, haptic, isSelectMode, clearSelection]);

  const { showHelp, setShowHelp } = useKeyboardShortcuts({
    enabled: viewMode === "list" && !editingItem,
    shortcuts,
  });

  // Reset focus when items change significantly
  useEffect(() => {
    if (focusedIndex !== null && focusedIndex >= sortedItems.length) {
      setFocusedIndex(sortedItems.length > 0 ? sortedItems.length - 1 : null);
    }
  }, [sortedItems.length, focusedIndex]);

  // Loading state
  if (
    userLoading ||
    !did ||
    list === undefined ||
    itemsLoading ||
    collabLoading
  ) {
    return <ListViewSkeleton />;
  }

  if (list === null) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          List not found
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          This list may have been deleted or you don't have access.
        </p>
        <Link 
          to="/app" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to lists
        </Link>
      </div>
    );
  }

  // Check authorization
  const isAuthorized = userRole !== null;
  const userDids = [did, legacyDid].filter(Boolean) as string[];
  const legacyAuthorized = userDids.includes(list.ownerDid);

  if (!isAuthorized && !legacyAuthorized) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Access denied
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          You don't have permission to view this list.
        </p>
        <Link 
          to="/app" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to lists
        </Link>
      </div>
    );
  }

  // Determine effective role
  const effectiveRole = userRole ?? (userDids.includes(list.ownerDid) ? "owner" : "editor");
  const canUserEdit = canEdit(effectiveRole);
  const canUserInvite = canInvite(effectiveRole);
  const canUserDelete = canDeleteList(effectiveRole);

  const collaboratorCount = collaborators?.length ?? 0;

  // Count checked/unchecked items
  const checkedCount = items.filter(item => item.checked).length;
  const totalCount = items.length;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-6">
        {/* Back button */}
        <Link
          to="/app"
          onClick={() => haptic('light')}
          className="flex-shrink-0 w-11 h-11 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          aria-label="Back to lists"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
            {list.name}
          </h2>
          
          {/* Progress and collaborators info */}
          <div className="flex items-center gap-3 mt-1">
            {totalCount > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {checkedCount}/{totalCount} done
              </span>
            )}
            
            {collaboratorCount > 0 && (
              <>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <button
                  onClick={() => {
                    haptic('light');
                    setShowCollaborators(!showCollaborators);
                  }}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {collaboratorCount}
                  <svg
                    className={`w-3 h-3 transition-transform ${showCollaborators ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => {
              haptic('light');
              setViewMode("list");
            }}
            className={`p-2 rounded-md transition-all ${
              viewMode === "list"
                ? "bg-white dark:bg-gray-600 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
            aria-label="List view"
            title="List view"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => {
              haptic('light');
              setViewMode("calendar");
            }}
            className={`p-2 rounded-md transition-all ${
              viewMode === "calendar"
                ? "bg-white dark:bg-gray-600 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
            aria-label="Calendar view"
            title="Calendar view"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Keyboard shortcuts button - hidden on mobile */}
          <button
            onClick={() => {
              haptic('light');
              setShowHelp(true);
            }}
            className="hidden sm:flex p-2.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
          >
            <span className="text-sm">⌨️</span>
          </button>
          {canUserDelete && (
            <button
              onClick={() => {
                haptic('light');
                setIsPublishModalOpen(true);
              }}
              disabled={!isOnline}
              title={!isOnline ? "Available when online" : undefined}
              className={`px-4 py-2.5 text-sm rounded-xl font-medium transition-all ${
                !isOnline ? "opacity-50 cursor-not-allowed" : ""
              } ${
                publicationStatus?.status === "active"
                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                  : "bg-purple-600 text-white hover:bg-purple-700"
              }`}
            >
              {publicationStatus?.status === "active" ? "📡 Published" : "📡 Publish"}
            </button>
          )}
          {canUserInvite && (
            <button
              onClick={() => {
                haptic('light');
                setIsShareModalOpen(true);
              }}
              className="px-4 py-2.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
            >
              🔗 Share
            </button>
          )}
          {canUserDelete && (
            <button
              onClick={() => {
                haptic('light');
                setIsDeleteDialogOpen(true);
              }}
              disabled={!isOnline}
              title={!isOnline ? "Available when online" : undefined}
              className={`p-2.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors ${
                !isOnline ? "opacity-50 cursor-not-allowed" : ""
              }`}
              aria-label="Delete list"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Collaborators panel (collapsible) */}
      {showCollaborators && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 animate-slide-up">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span>👥</span> Collaborators
          </h3>
          <CollaboratorList listId={listId} onLeave={() => navigate("/app")} />
        </div>
      )}

      {/* Cached data indicator */}
      {usingCache && (
        <div className="mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-400 text-sm flex items-center gap-3 animate-slide-up">
          <span className="text-xl">📡</span>
          <span>Showing cached items. Some info may be outdated.</span>
        </div>
      )}

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mb-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${(checkedCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Select mode header */}
      {isSelectMode && canUserEdit && (
        <div className="mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between animate-slide-up">
          <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
            {selectedIds.size} of {totalCount} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors"
            >
              Select all
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Select mode toggle button (when not in select mode) */}
      {!isSelectMode && canUserEdit && totalCount > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => {
              haptic('light');
              setIsSelectMode(true);
            }}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Select
          </button>
        </div>
      )}

      {/* Add Item Input - at top of list, only show if user can edit */}
      {canUserEdit && (
        <div className="mb-4 animate-slide-up">
          <AddItemInput ref={addItemInputRef} assetDid={list.assetDid} onAddItem={addItem} />
        </div>
      )}

      {/* Items - List View */}
      {viewMode === "list" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          {sortedItems.length === 0 ? (
            <NoItemsEmptyState />
          ) : (
            <div 
              ref={itemsContainerRef}
              className="divide-y divide-gray-100 dark:divide-gray-700"
              onTouchMove={touchDrag.handleTouchMove}
              onTouchEnd={touchDrag.handleTouchEnd}
            >
              {sortedItems.map((item: OptimisticItem, index) => (
                <div 
                  key={item._id} 
                  data-item-id={item._id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <ListItem
                    item={item}
                    userDid={did}
                    legacyDid={legacyDid ?? undefined}
                    canEdit={canUserEdit}
                    isDragging={draggedItemId === item._id || touchDrag.state.draggedId === item._id}
                    isDragOver={dragOverItemId === item._id || touchDrag.state.dragOverId === item._id}
                    isFocused={focusedIndex === index}
                    onDragStart={() => handleDragStart(item._id)}
                    onDragOver={(e) => handleDragOver(e, item._id)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={touchDrag.handleTouchStart}
                    onCheck={checkItem}
                    onUncheck={uncheckItem}
                    isSelectMode={isSelectMode}
                    isSelected={selectedIds.has(item._id)}
                    onToggleSelect={() => toggleSelection(item._id)}
                    onLongPress={() => enterSelectMode(item._id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Items - Calendar View */}
      {viewMode === "calendar" && (
        <CalendarView
          listId={listId}
          onItemClick={(item) => {
            haptic('light');
            setSelectedCalendarItem(item);
          }}
        />
      )}

      {/* Viewer notice */}
      {!canUserEdit && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl text-center text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          You have view-only access to this list.
        </div>
      )}

      {/* Modals - lazy-loaded with Suspense */}
      <Suspense fallback={null}>
        {isDeleteDialogOpen && (
          <DeleteListDialog
            list={list}
            onClose={() => setIsDeleteDialogOpen(false)}
            onDeleted={() => navigate("/app")}
          />
        )}

        {isShareModalOpen && (
          <ShareModal list={list} onClose={() => setIsShareModalOpen(false)} />
        )}

        {isPublishModalOpen && (
          <PublishModal list={list} onClose={() => setIsPublishModalOpen(false)} />
        )}

        {selectedCalendarItem && (
          <ItemDetailsModal
            item={selectedCalendarItem}
            userDid={did}
            legacyDid={legacyDid ?? undefined}
            canEdit={canUserEdit}
            onClose={() => setSelectedCalendarItem(null)}
          />
        )}
        
        {editingItem && (
          <ItemDetailsModal
            item={editingItem}
            userDid={did}
            legacyDid={legacyDid ?? undefined}
            canEdit={canUserEdit}
            onClose={() => setEditingItem(null)}
          />
        )}
      </Suspense>
      
      {/* Keyboard shortcuts help modal */}
      {showHelp && (
        <KeyboardShortcutsHelp
          shortcuts={shortcuts.filter(s => 
            // Only show distinct shortcuts in help (filter duplicates)
            !["ArrowUp", "ArrowDown", " ", "Enter", "Delete", "Backspace"].includes(s.key)
          )}
          onClose={() => setShowHelp(false)}
        />
      )}

      {/* Batch operations bar */}
      {canUserEdit && (
        <BatchOperations
          selectedIds={selectedIds}
          onClearSelection={clearSelection}
          userDid={did}
          legacyDid={legacyDid ?? undefined}
        />
      )}
    </div>
  );
}
