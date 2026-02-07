/**
 * Modal for viewing and editing item details.
 * Supports notes, due dates, URLs/links, and recurrence settings.
 */

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { useSettings } from "../hooks/useSettings";

interface ItemDetailsModalProps {
  item: Doc<"items">;
  userDid: string;
  legacyDid?: string;
  canEdit: boolean;
  onClose: () => void;
}

type RecurrenceFrequency = "daily" | "weekly" | "monthly";

export function ItemDetailsModal({
  item,
  userDid,
  legacyDid,
  canEdit,
  onClose,
}: ItemDetailsModalProps) {
  const { haptic } = useSettings();
  const updateItem = useMutation(api.items.updateItem);

  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [url, setUrl] = useState(item.url ?? "");
  const [dueDate, setDueDate] = useState(
    item.dueDate ? new Date(item.dueDate).toISOString().split("T")[0] : ""
  );
  const [hasRecurrence, setHasRecurrence] = useState(!!item.recurrence);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>(
    item.recurrence?.frequency ?? "daily"
  );
  const [isSaving, setIsSaving] = useState(false);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSave = async () => {
    if (!canEdit) return;
    
    haptic("medium");
    setIsSaving(true);

    try {
      await updateItem({
        itemId: item._id,
        userDid,
        legacyDid,
        name: name !== item.name ? name : undefined,
        description: description || undefined,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        url: url || undefined,
        recurrence: hasRecurrence
          ? { frequency: recurrenceFrequency, interval: 1 }
          : undefined,
        clearDueDate: !dueDate && !!item.dueDate,
        clearUrl: !url && !!item.url,
        clearRecurrence: !hasRecurrence && !!item.recurrence,
      });
      haptic("success");
      onClose();
    } catch (err) {
      console.error("Failed to update item:", err);
      haptic("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {canEdit ? "Edit Item" : "Item Details"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Title
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            />
          </div>

          {/* Description/Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              📝 Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEdit}
              rows={3}
              placeholder={canEdit ? "Add notes or details..." : "No notes"}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 resize-none"
            />
          </div>

          {/* URL/Link */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              🔗 Link (PR, URL, etc.)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={!canEdit}
              placeholder={canEdit ? "https://..." : "No link"}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              📅 Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            />
          </div>

          {/* Recurrence */}
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              <input
                type="checkbox"
                checked={hasRecurrence}
                onChange={(e) => setHasRecurrence(e.target.checked)}
                disabled={!canEdit}
                className="rounded border-gray-300 dark:border-gray-600 text-amber-500 focus:ring-amber-500"
              />
              🔁 Recurring
            </label>
            {hasRecurrence && (
              <select
                value={recurrenceFrequency}
                onChange={(e) => setRecurrenceFrequency(e.target.value as RecurrenceFrequency)}
                disabled={!canEdit}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            )}
          </div>
        </div>

        {/* Footer */}
        {canEdit && (
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
