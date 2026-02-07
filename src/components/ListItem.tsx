/**
 * Component for a single item in a list.
 *
 * Shows checkbox, name, attribution, and remove button.
 * Features improved design, dark mode, and haptic feedback.
 * Supports notes, due dates, URLs, and recurrence.
 */

import { useState, useRef, lazy, Suspense } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ItemAttribution } from "./ItemAttribution";
import { useSettings } from "../hooks/useSettings";
import type { OptimisticItem } from "../hooks/useOptimisticItems";

// Lazy load the details modal
const ItemDetailsModal = lazy(() => import("./ItemDetailsModal").then(m => ({ default: m.ItemDetailsModal })));

interface ListItemProps {
  item: OptimisticItem;
  userDid: string;
  legacyDid?: string;
  canEdit?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onTouchStart?: (e: React.TouchEvent, itemId: string, element: HTMLElement) => void;
  onCheck?: (itemId: Id<"items">, checkedByDid: string, legacyDid?: string) => Promise<void>;
  onUncheck?: (itemId: Id<"items">, userDid: string, legacyDid?: string) => Promise<void>;
}

export function ListItem({
  item,
  userDid,
  legacyDid,
  canEdit: canUserEdit = true,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  onTouchStart,
  onCheck,
  onUncheck,
}: ListItemProps) {
  const { haptic } = useSettings();
  
  // Fallback mutations for when callbacks aren't provided
  const checkItemMutation = useMutation(api.items.checkItem);
  const uncheckItemMutation = useMutation(api.items.uncheckItem);
  const removeItem = useMutation(api.items.removeItem);

  const [isUpdating, setIsUpdating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  
  // Format due date for display
  const dueDateStr = item.dueDate 
    ? new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;
  
  // Check if overdue
  const isOverdue = item.dueDate && !item.checked && item.dueDate < Date.now();

  const handleToggleCheck = async () => {
    if (isUpdating) return;

    haptic(item.checked ? 'light' : 'success');
    setIsUpdating(true);

    try {
      if (item.checked) {
        if (onUncheck) {
          await onUncheck(item._id, userDid, legacyDid);
        } else {
          await uncheckItemMutation({ itemId: item._id, userDid, legacyDid });
        }
      } else {
        if (onCheck) {
          await onCheck(item._id, userDid, legacyDid);
        } else {
          await checkItemMutation({
            itemId: item._id,
            checkedByDid: userDid,
            legacyDid,
            checkedAt: Date.now(),
          });
        }
      }
    } catch (err) {
      console.error("Failed to toggle item:", err);
      haptic('error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    if (isUpdating) return;

    haptic('medium');
    setIsUpdating(true);

    try {
      await removeItem({ itemId: item._id, userDid, legacyDid });
    } catch (err) {
      console.error("Failed to remove item:", err);
      haptic('error');
      setIsUpdating(false);
    }
  };

  return (
    <div
      ref={itemRef}
      draggable={canUserEdit}
      onDragStart={(e) => {
        if (!canUserEdit) return;
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      }}
      onDragOver={canUserEdit ? onDragOver : undefined}
      onDragEnd={canUserEdit ? onDragEnd : undefined}
      className={`flex items-center gap-2 px-3 py-2.5 transition-all touch-manipulation ${
        isDragging 
          ? "opacity-50 bg-gray-100 dark:bg-gray-700 scale-[1.02]" 
          : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
      } ${
        isDragOver 
          ? "border-t-2 border-amber-500 -mt-0.5" 
          : ""
      } ${
        item._isOptimistic 
          ? "opacity-60" 
          : ""
      } ${
        item.checked
          ? "bg-gray-50/50 dark:bg-gray-800/50"
          : ""
      }`}
    >
      {/* Drag handle - only show if user can edit */}
      {canUserEdit && (
        <div
          className="flex-shrink-0 w-6 h-10 flex items-center justify-center text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-gray-500 transition-colors touch-none select-none"
          aria-label="Drag to reorder"
          onTouchStart={(e) => {
            if (itemRef.current && onTouchStart) {
              onTouchStart(e, item._id, itemRef.current);
            }
          }}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </div>
      )}

      {/* Checkbox - compact size */}
      {canUserEdit ? (
        <button
          onClick={handleToggleCheck}
          disabled={isUpdating}
          className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all active:scale-90 ${
            item.checked
              ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-sm shadow-green-500/30"
              : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
          } disabled:opacity-50`}
          aria-label={item.checked ? "Uncheck item" : "Check item"}
        >
          {item.checked ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <div className="w-2 h-2" />
          )}
        </button>
      ) : (
        // Read-only checkbox display for viewers
        <div
          className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center ${
            item.checked 
              ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white" 
              : "bg-gray-100 dark:bg-gray-700"
          }`}
        >
          {item.checked && (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      )}

      {/* Item content - clickable to open details */}
      <button
        onClick={() => {
          haptic('light');
          setShowDetails(true);
        }}
        className="flex-1 min-w-0 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded px-1 -mx-1 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          {/* Priority indicator */}
          {item.priority && !item.checked && (
            <span 
              className={`flex-shrink-0 w-2 h-2 rounded-full ${
                item.priority === "high" ? "bg-red-500" :
                item.priority === "medium" ? "bg-yellow-500" :
                "bg-blue-500"
              }`}
              title={`${item.priority} priority`}
            />
          )}
          <p
            className={`text-xs text-gray-900 dark:text-gray-100 transition-all truncate ${
              item.checked 
                ? "line-through text-gray-400 dark:text-gray-500" 
                : ""
            }`}
          >
            {item.name}
          </p>
          {/* Indicators for extras */}
          {item.url && (
            <span className="text-blue-500 flex-shrink-0" title="Has link">🔗</span>
          )}
          {item.recurrence && (
            <span className="text-purple-500 flex-shrink-0" title={`Repeats ${item.recurrence.frequency}`}>🔁</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ItemAttribution item={item} />
          {/* Due date badge */}
          {dueDateStr && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
              isOverdue 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
            }`}>
              📅 {dueDateStr}
            </span>
          )}
          {/* Notes indicator */}
          {item.description && (
            <span className="text-[10px] text-gray-400 flex-shrink-0" title="Has notes">📝</span>
          )}
        </div>
      </button>

      {/* Remove button - only show if user can edit */}
      {canUserEdit && (
        <button
          onClick={handleRemove}
          disabled={isUpdating}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 transition-all active:scale-90"
          aria-label="Remove item"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}

      {/* Details Modal */}
      {showDetails && (
        <Suspense fallback={null}>
          <ItemDetailsModal
            item={item}
            userDid={userDid}
            legacyDid={legacyDid}
            canEdit={canUserEdit}
            onClose={() => setShowDetails(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
