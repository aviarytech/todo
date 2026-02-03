/**
 * Component for a single item in a list.
 *
 * Shows checkbox, name, attribution, and remove button.
 * Updated for Phase 5.5: Accepts onCheck/onUncheck callbacks for optimistic updates.
 * Updated: Uses server-side credential signing action instead of client-side signer.
 */

import { useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { ItemAttribution } from "./ItemAttribution";
import type { OptimisticItem } from "../hooks/useOptimisticItems";

interface ListItemProps {
  item: OptimisticItem;
  list: Doc<"lists">;
  userDid: string;
  /** Legacy DID for migrated users */
  legacyDid?: string;
  /** Turnkey sub-organization ID for server-side credential signing */
  subOrgId: string | null;
  /** Whether user can edit (owner or editor role). If false, shows read-only. */
  canEdit?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  /** Callback for checking items - uses optimistic updates from useOptimisticItems */
  onCheck?: (itemId: Id<"items">, checkedByDid: string, legacyDid?: string) => Promise<void>;
  /** Callback for unchecking items - uses optimistic updates from useOptimisticItems */
  onUncheck?: (itemId: Id<"items">, userDid: string, legacyDid?: string) => Promise<void>;
}

export function ListItem({
  item,
  list,
  userDid,
  legacyDid,
  subOrgId,
  canEdit: canUserEdit = true,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  onCheck,
  onUncheck,
}: ListItemProps) {
  // Fallback mutations for when callbacks aren't provided (backwards compatibility)
  const checkItemMutation = useMutation(api.items.checkItem);
  const uncheckItemMutation = useMutation(api.items.uncheckItem);
  const removeItem = useMutation(api.items.removeItem);
  const signItemAction = useAction(api.credentialSigning.signItemAction);

  const [isUpdating, setIsUpdating] = useState(false);

  /** Sign a credential server-side (best-effort, non-blocking) */
  const signCredential = async (type: "ItemChecked" | "ItemUnchecked" | "ItemRemoved") => {
    if (!subOrgId) return;
    try {
      await signItemAction({
        type,
        listDid: list.assetDid,
        itemId: item._id,
        actorDid: userDid,
        subOrgId,
      });
    } catch (err) {
      console.warn(`Failed to sign ${type} credential:`, err);
    }
  };

  const handleToggleCheck = async () => {
    if (isUpdating) return;

    setIsUpdating(true);

    try {
      if (item.checked) {
        // Sign uncheck credential (best-effort)
        await signCredential("ItemUnchecked");

        // Use optimistic callback if provided, otherwise fallback to direct mutation
        if (onUncheck) {
          await onUncheck(item._id, userDid, legacyDid);
        } else {
          await uncheckItemMutation({ itemId: item._id, userDid, legacyDid });
        }
      } else {
        // Sign check credential (best-effort)
        await signCredential("ItemChecked");

        // Use optimistic callback if provided, otherwise fallback to direct mutation
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
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    if (isUpdating) return;

    setIsUpdating(true);

    try {
      // Sign remove credential (best-effort)
      await signCredential("ItemRemoved");

      await removeItem({ itemId: item._id, userDid, legacyDid });
    } catch (err) {
      console.error("Failed to remove item:", err);
      setIsUpdating(false);
    }
  };

  return (
    <div
      draggable={canUserEdit}
      onDragStart={(e) => {
        if (!canUserEdit) return;
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      }}
      onDragOver={canUserEdit ? onDragOver : undefined}
      onDragEnd={canUserEdit ? onDragEnd : undefined}
      className={`flex items-center gap-3 p-4 hover:bg-gray-50 transition-all ${
        isDragging ? "opacity-50 bg-gray-100" : ""
      } ${isDragOver ? "border-t-2 border-blue-500" : ""} ${
        item._isOptimistic ? "opacity-60" : ""
      }`}
    >
      {/* Drag handle - only show if user can edit */}
      {canUserEdit && (
        <div
          className="flex-shrink-0 w-6 h-11 flex items-center justify-center text-gray-400 cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </div>
      )}

      {/* Checkbox - min 44x44px touch target */}
      {canUserEdit ? (
        <button
          onClick={handleToggleCheck}
          disabled={isUpdating}
          className={`flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center transition-colors ${
            item.checked
              ? "bg-blue-600 text-white"
              : "bg-gray-100 hover:bg-gray-200"
          } disabled:opacity-50`}
          aria-label={item.checked ? "Uncheck item" : "Check item"}
        >
          {item.checked ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <div className="w-5 h-5 rounded border-2 border-gray-300" />
          )}
        </button>
      ) : (
        // Read-only checkbox display for viewers
        <div
          className={`flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center ${
            item.checked ? "bg-blue-600 text-white" : "bg-gray-100"
          }`}
        >
          {item.checked ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <div className="w-5 h-5 rounded border-2 border-gray-300" />
          )}
        </div>
      )}

      {/* Item content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-gray-900 ${item.checked ? "line-through text-gray-500" : ""}`}
        >
          {item.name}
        </p>
        <ItemAttribution item={item} />
      </div>

      {/* Remove button - only show if user can edit */}
      {canUserEdit && (
        <button
          onClick={handleRemove}
          disabled={isUpdating}
          className="flex-shrink-0 w-11 h-11 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
          aria-label="Remove item"
        >
          <svg
            className="w-5 h-5"
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
    </div>
  );
}
