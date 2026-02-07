/**
 * Sub-items component for nested task management.
 * Note: Sub-items functionality requires Convex backend deployment.
 */

import { useState } from "react";
import type { Id, Doc } from "../../convex/_generated/dataModel";
import { useSettings } from "../hooks/useSettings";

interface SubItemsProps {
  parentId: Id<"items">;
  listId: Id<"lists">;
  userDid: string;
  legacyDid?: string;
  canEdit: boolean;
}

export function SubItems({
  canEdit,
}: SubItemsProps) {
  const { haptic } = useSettings();
  const [newItemName, setNewItemName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Sub-items API not yet deployed - show placeholder
  const subItems: Doc<"items">[] = [];

  const handleAddSubItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !canEdit || isAdding) return;

    haptic("medium");
    setIsAdding(true);

    // TODO: Implement when backend is deployed
    setTimeout(() => {
      setNewItemName("");
      setIsAdding(false);
    }, 500);
  };

  const completedCount = subItems.filter((i) => i.checked).length;
  const totalCount = subItems.length;

  return (
    <div className="space-y-2">
      {/* Progress indicator */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {completedCount}/{totalCount}
          </span>
        </div>
      )}

      {/* Sub-items list */}
      <div className="space-y-1">
        {subItems
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((item) => (
            <div
              key={item._id}
              className={`flex items-center gap-2 py-1.5 px-2 rounded-lg group ${
                item.checked ? "bg-gray-50 dark:bg-gray-800/50" : ""
              }`}
            >
              {/* Checkbox */}
              <button
                disabled={!canEdit}
                className={`flex-shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all ${
                  item.checked
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                } disabled:cursor-default`}
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
              </button>

              {/* Name */}
              <span
                className={`flex-1 text-xs ${
                  item.checked
                    ? "text-gray-400 dark:text-gray-500 line-through"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {item.name}
              </span>

              {/* Remove button */}
              {canEdit && (
                <button
                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 hover:text-red-500 dark:hover:text-red-400 rounded transition-all"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
      </div>

      {/* Add sub-item form */}
      {canEdit && (
        <form onSubmit={handleAddSubItem} className="flex items-center gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Add sub-item..."
            disabled={isAdding}
            className="flex-1 px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isAdding || !newItemName.trim()}
            className="px-2 py-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded disabled:opacity-50 transition-colors"
          >
            {isAdding ? "..." : "Add"}
          </button>
        </form>
      )}

      {subItems.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          No sub-items yet. Add a checklist for this task.
        </p>
      )}
    </div>
  );
}

/**
 * Sub-item count badge (for showing on parent items).
 */
interface SubItemCountProps {
  parentId: Id<"items">;
}

export function SubItemCount(_props: SubItemCountProps) {
  // API not deployed yet
  return null;
}
