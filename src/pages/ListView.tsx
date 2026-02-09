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
import { groupByAisle, classifyItem } from "../lib/groceryAisles";
import { useCategories } from "../hooks/useCategories";
import { shareList } from "../lib/share";
import { AddItemInput } from "../components/AddItemInput";
import { ListItem } from "../components/ListItem";
import { CollaboratorList } from "../components/sharing/CollaboratorList";
import { NoItemsEmptyState } from "../components/ui/EmptyState";
import { ListViewSkeleton } from "../components/ui/Skeleton";
import { CalendarView } from "../components/CalendarView";
import { BatchOperations } from "../components/BatchOperations";
import { HeaderActionsMenu } from "../components/HeaderActionsMenu";
import { ListVerificationBadge, type VerificationState } from "../components/VerificationBadge";

// Lazy-loaded modals for better bundle splitting
const DeleteListDialog = lazy(() => import("../components/DeleteListDialog").then(m => ({ default: m.DeleteListDialog })));
const ShareModal = lazy(() => import("../components/ShareModal").then(m => ({ default: m.ShareModal })));
const PublishModal = lazy(() => import("../components/publish/PublishModal").then(m => ({ default: m.PublishModal })));
const ItemDetailsModal = lazy(() => import("../components/ItemDetailsModal").then(m => ({ default: m.ItemDetailsModal })));
const SaveAsTemplateModal = lazy(() => import("../components/SaveAsTemplateModal").then(m => ({ default: m.SaveAsTemplateModal })));
const RenameListDialog = lazy(() => import("../components/RenameListDialog").then(m => ({ default: m.RenameListDialog })));
const ChangeCategoryDialog = lazy(() => import("../components/ChangeCategoryDialog").then(m => ({ default: m.ChangeCategoryDialog })));

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
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<Id<"items"> | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<Id<"items"> | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  // Store only IDs to avoid stale snapshots - we'll look up live items from the reactive items array
  const [selectedCalendarItemId, setSelectedCalendarItemId] = useState<Id<"items"> | null>(null);
  const itemsContainerRef = useRef<HTMLDivElement>(null);
  
  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<Id<"items">>>(new Set());
  
  // Keyboard navigation state
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  // Store only ID to avoid stale snapshots - we'll look up live item from the reactive items array
  const [editingItemId, setEditingItemId] = useState<Id<"items"> | null>(null);
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
  const updateItemMutation = useMutation(api.items.updateItem);

  // Custom aisle state
  const addCustomAisleMutation = useMutation(api.lists.addCustomAisle);
  const _removeCustomAisle = useMutation(api.lists.removeCustomAisle);
  void _removeCustomAisle; // available for future delete-aisle UI
  const [showAddAisle, setShowAddAisle] = useState(false);
  const [newAisleName, setNewAisleName] = useState("");
  const [newAisleEmoji, setNewAisleEmoji] = useState("🏷️");

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

  // Detect grocery lists by category name
  const { categories } = useCategories();

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

  // Detect grocery lists by category name
  const isGroceryList = useMemo(() => {
    if (!list || !list.categoryId) return false;
    const cat = categories.find((c: { _id: Id<"categories">; name: string }) => c._id === list.categoryId);
    return cat ? cat.name.toLowerCase().includes("grocer") : false;
  }, [list, categories]);

  // Grocery aisle grouping for grocery lists
  const aisleGroups = useMemo(() => {
    if (!isGroceryList) return null;
    const unchecked = sortedItems.filter(item => !item.checked);
    const checked = sortedItems.filter(item => item.checked);
    const customAisles = (list as any)?.customAisles as { id: string; name: string; emoji: string; order: number }[] | undefined;
    return { groups: groupByAisle(unchecked.map(item => ({ ...item, name: item.name ?? "" })), customAisles ?? undefined), checked, customAisles: customAisles ?? [] };
  }, [isGroceryList, sortedItems, list]);

  // Look up live items by ID to avoid stale snapshots in modals
  // This ensures tags and other fields update in real-time
  const editingItem = useMemo(() => {
    if (!editingItemId) return null;
    return items.find(item => item._id === editingItemId) as Doc<"items"> | undefined ?? null;
  }, [items, editingItemId]);

  const selectedCalendarItem = useMemo(() => {
    if (!selectedCalendarItemId) return null;
    return items.find(item => item._id === selectedCalendarItemId) as Doc<"items"> | undefined ?? null;
  }, [items, selectedCalendarItemId]);

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

  // Grocery aisle drag — detect which aisle section a dragged item lands in
  const handleGroceryTouchReorder = useCallback(async (draggedId: string, _targetId: string) => {
    if (!did || !itemsContainerRef.current) return;
    // Find which aisle the target item belongs to by walking up the DOM
    const targetEl = itemsContainerRef.current.querySelector(`[data-item-id="${_targetId}"]`);
    if (!targetEl) return;
    const aisleContainer = targetEl.closest('[data-aisle-id]');
    if (!aisleContainer) return;
    const targetAisleId = aisleContainer.getAttribute('data-aisle-id');
    if (!targetAisleId) return;

    // Find the dragged item's current aisle
    const draggedItem = sortedItems.find(i => i._id === draggedId);
    if (!draggedItem) return;
    const currentAisleId = (draggedItem as OptimisticItem & { groceryAisle?: string }).groceryAisle || classifyItem(draggedItem.name);

    if (targetAisleId === currentAisleId) return; // Same aisle, nothing to do

    haptic('medium');
    await updateItemMutation({
      itemId: draggedId as Id<"items">,
      userDid: did,
      legacyDid: legacyDid ?? undefined,
      groceryAisle: targetAisleId,
    });
  }, [did, legacyDid, sortedItems, haptic, updateItemMutation]);

  const groceryTouchDrag = useTouchDrag({
    onReorder: handleGroceryTouchReorder,
    containerRef: itemsContainerRef,
  });

  // Determine which aisle is being dragged over (for header highlighting)
  const dragOverAisleId = useMemo(() => {
    if (!aisleGroups) return null;
    const overId = groceryTouchDrag.state.dragOverId;
    if (!overId) return null;
    for (const { aisle, items: aisleItems } of aisleGroups.groups) {
      if (aisleItems.some(i => i._id === overId)) return aisle.id;
    }
    return null;
  }, [aisleGroups, groceryTouchDrag.state.dragOverId]);

  // Native share handler
  const handleNativeShare = useCallback(async () => {
    if (!list) return;
    
    const listUrl = `${window.location.origin}/app/${list._id}`;
    
    try {
      await shareList(list.name, listUrl);
      haptic('success');
    } catch (error) {
      console.error('Share failed:', error);
      haptic('error');
    }
  }, [list, haptic]);

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
            setEditingItemId(item._id);
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
            setEditingItemId(item._id);
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
          setEditingItemId(null);
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
      {/* Header - Redesigned for less crowding */}
      <div className="mb-6">
        <div className="flex items-start gap-3">
          {/* Back button */}
          <Link
            to="/app"
            onClick={() => haptic('light')}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            aria-label="Back to lists"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          {/* Title and info - takes remaining space */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 break-words min-w-0">
                {list.name}
              </h1>
            {/* Verification badge for list */}
            <ListVerificationBadge
              hasVC={!!list.assetDid}
              anchorStatus={(publicationStatus?.anchorStatus as VerificationState) ?? "none"}
              did={list.assetDid}
              anchorBlockHeight={publicationStatus?.anchorBlockHeight}
              anchorTxId={publicationStatus?.anchorTxId}
            />
            </div>
          
            {/* Progress and collaborators info */}
            <div className="flex items-center gap-2 text-xs sm:text-sm">
            {totalCount > 0 && (
              <span className="text-gray-500 dark:text-gray-400">
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
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all active:scale-95 text-xs sm:text-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {collaboratorCount}
                  <svg
                    className={`w-2.5 h-2.5 transition-transform ${showCollaborators ? "rotate-180" : ""}`}
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

          {/* Compact action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
          {/* View toggle - compact on mobile */}
          <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-0.5">
            <button
              onClick={() => {
                haptic('light');
                setViewMode("list");
              }}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-full transition-all active:scale-95 ${
                viewMode === "list"
                  ? "bg-white dark:bg-gray-600 text-amber-600 dark:text-amber-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
              aria-label="List view"
              title="List view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => {
                haptic('light');
                setViewMode("calendar");
              }}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-full transition-all active:scale-95 ${
                viewMode === "calendar"
                  ? "bg-white dark:bg-gray-600 text-amber-600 dark:text-amber-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
              aria-label="Calendar view"
              title="Calendar view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          {/* Share button - always visible as it's commonly used */}
          {canUserInvite && (
            <button
              onClick={() => {
                haptic('light');
                setIsShareModalOpen(true);
              }}
              className="inline-flex items-center justify-center p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 transition-all active:scale-95"
              aria-label="Share"
              title="Share list"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          )}

          {/* More actions menu - consolidates Publish, Template, Delete, Keyboard shortcuts */}
          <HeaderActionsMenu
            canShare={canUserInvite}
            canPublish={canUserDelete}
            canSaveTemplate={canUserEdit}
            canDelete={canUserDelete}
            canRename={canUserDelete}
            isOnline={isOnline}
            isPublished={publicationStatus?.status === "active"}
            onShare={() => setIsShareModalOpen(true)}
            onNativeShare={handleNativeShare}
            onPublish={() => setIsPublishModalOpen(true)}
            onSaveTemplate={() => setIsSaveTemplateModalOpen(true)}
            onDelete={() => setIsDeleteDialogOpen(true)}
            onRename={() => setIsRenameDialogOpen(true)}
            canChangeCategory={canUserDelete}
            onChangeCategory={() => setIsCategoryDialogOpen(true)}
            onKeyboardShortcuts={() => setShowHelp(true)}
            haptic={haptic}
          />
          </div>
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
        <div className="overflow-hidden">
          {sortedItems.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              <NoItemsEmptyState />
            </div>
          ) : isGroceryList && aisleGroups ? (
            /* Grocery aisle-grouped view — drag between aisles to override classification */
            <div
              ref={itemsContainerRef}
              onTouchMove={groceryTouchDrag.handleTouchMove}
              onTouchEnd={groceryTouchDrag.handleTouchEnd}
            >
              <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 mb-2 text-xs text-gray-400 dark:text-gray-500">
                <span>✨</span>
                <span>Drag items between aisles to reclassify</span>
              </div>
              {aisleGroups.groups.map(({ aisle, items: aisleItems }) => (
                <div key={aisle.id} className="mb-3" data-aisle-id={aisle.id}>
                  {/* Aisle section header — highlights when dragging over */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-t-xl border-b transition-colors duration-150 ${
                    dragOverAisleId === aisle.id && groceryTouchDrag.state.draggedId
                      ? "bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 border-blue-300 dark:border-blue-600 ring-2 ring-blue-300 dark:ring-blue-600"
                      : "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-700 dark:to-gray-750 border-amber-100 dark:border-gray-600"
                  }`}>
                    <span className="text-lg">{aisle.emoji}</span>
                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{aisle.name}</span>
                    <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                      {aisleItems.length} {aisleItems.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-b-xl shadow-lg divide-y divide-gray-100 dark:divide-gray-700">
                    {aisleItems.map((item) => {
                      const globalIndex = sortedItems.findIndex(si => si._id === item._id);
                      const hasAisleOverride = !!(item as OptimisticItem & { groceryAisle?: string }).groceryAisle;
                      return (
                        <div
                          key={item._id}
                          data-item-id={item._id}
                          className="animate-slide-up relative"
                        >
                          {hasAisleOverride && (
                            <span className="absolute top-1 right-1 z-10 text-[10px] opacity-60" title="Manually placed in this aisle">📌</span>
                          )}
                          <ListItem
                            item={item}
                            userDid={did}
                            legacyDid={legacyDid ?? undefined}
                            canEdit={canUserEdit}
                            isDragging={groceryTouchDrag.state.draggedId === item._id}
                            isDragOver={groceryTouchDrag.state.dragOverId === item._id}
                            isFocused={focusedIndex === globalIndex}
                            onTouchStart={groceryTouchDrag.handleTouchStart}
                            onCheck={checkItem}
                            onUncheck={uncheckItem}
                            isSelectMode={isSelectMode}
                            isSelected={selectedIds.has(item._id)}
                            onToggleSelect={() => toggleSelection(item._id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Add custom aisle */}
              {canUserEdit && (
                showAddAisle ? (
                  <div className="mb-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">New Aisle</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newAisleEmoji}
                        onChange={e => setNewAisleEmoji(e.target.value)}
                        className="w-10 text-center text-lg bg-gray-100 dark:bg-gray-700 rounded-lg p-1"
                        maxLength={2}
                      />
                      <input
                        type="text"
                        value={newAisleName}
                        onChange={e => setNewAisleName(e.target.value)}
                        placeholder="Aisle name..."
                        className="flex-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 placeholder-gray-400"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === "Enter" && newAisleName.trim()) {
                            addCustomAisleMutation({ listId, name: newAisleName.trim(), emoji: newAisleEmoji || "🏷️" });
                            setNewAisleName("");
                            setNewAisleEmoji("🏷️");
                            setShowAddAisle(false);
                          } else if (e.key === "Escape") {
                            setShowAddAisle(false);
                            setNewAisleName("");
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newAisleName.trim()) {
                            addCustomAisleMutation({ listId, name: newAisleName.trim(), emoji: newAisleEmoji || "🏷️" });
                            setNewAisleName("");
                            setNewAisleEmoji("🏷️");
                            setShowAddAisle(false);
                          }
                        }}
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 px-2 py-1"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setShowAddAisle(false); setNewAisleName(""); }}
                        className="text-sm text-gray-400 px-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddAisle(true)}
                    className="w-full mb-3 py-2 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                  >
                    <span>＋</span>
                    <span>New Aisle</span>
                  </button>
                )
              )}

              {/* Completed section */}
              {aisleGroups.checked.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-t-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-750 border-b border-green-100 dark:border-gray-600">
                    <span className="text-lg">✅</span>
                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">Completed</span>
                    <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                      {aisleGroups.checked.length} {aisleGroups.checked.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-b-xl shadow-lg divide-y divide-gray-100 dark:divide-gray-700">
                    {aisleGroups.checked.map((item) => {
                      const globalIndex = sortedItems.findIndex(si => si._id === item._id);
                      return (
                        <div
                          key={item._id}
                          data-item-id={item._id}
                          className="animate-slide-up"
                        >
                          <ListItem
                            item={item}
                            userDid={did}
                            legacyDid={legacyDid ?? undefined}
                            canEdit={canUserEdit}
                            isDragging={false}
                            isDragOver={false}
                            isFocused={focusedIndex === globalIndex}
                            onCheck={checkItem}
                            onUncheck={uncheckItem}
                            isSelectMode={isSelectMode}
                            isSelected={selectedIds.has(item._id)}
                            onToggleSelect={() => toggleSelection(item._id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Standard flat list view */
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
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
            setSelectedCalendarItemId(item._id);
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

        {isRenameDialogOpen && (
          <RenameListDialog
            list={list}
            onClose={() => setIsRenameDialogOpen(false)}
          />
        )}

        {isCategoryDialogOpen && (
          <ChangeCategoryDialog
            listId={listId}
            currentCategoryId={list.categoryId}
            onClose={() => setIsCategoryDialogOpen(false)}
          />
        )}

        {isSaveTemplateModalOpen && (
          <SaveAsTemplateModal
            listId={listId}
            listName={list.name}
            onClose={() => setIsSaveTemplateModalOpen(false)}
          />
        )}

        {selectedCalendarItem && (
          <ItemDetailsModal
            item={selectedCalendarItem}
            userDid={did}
            legacyDid={legacyDid ?? undefined}
            canEdit={canUserEdit}
            onClose={() => setSelectedCalendarItemId(null)}
          />
        )}
        
        {editingItem && (
          <ItemDetailsModal
            item={editingItem}
            userDid={did}
            legacyDid={legacyDid ?? undefined}
            canEdit={canUserEdit}
            onClose={() => setEditingItemId(null)}
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
