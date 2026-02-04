/**
 * Modal for creating a new list.
 * Features improved design and dark mode support.
 */

import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useSettings } from "../hooks/useSettings";
import { createListAsset } from "../lib/originals";
import { CategorySelector } from "./lists/CategorySelector";

interface CreateListModalProps {
  onClose: () => void;
}

export function CreateListModal({ onClose }: CreateListModalProps) {
  const { did } = useCurrentUser();
  const navigate = useNavigate();
  const { haptic } = useSettings();
  const createList = useMutation(api.lists.createList);
  const dialogRef = useFocusTrap<HTMLDivElement>({ onEscape: onClose });

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<Id<"categories"> | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter a list name");
      haptic('error');
      return;
    }

    if (!did) {
      setError("No identity found");
      haptic('error');
      return;
    }

    setError(null);
    setIsCreating(true);
    haptic('medium');

    try {
      const listAsset = await createListAsset(trimmedName, did);

      const listId = await createList({
        assetDid: listAsset.assetDid,
        name: trimmedName,
        ownerDid: did,
        categoryId,
        createdAt: Date.now(),
      });

      haptic('success');
      navigate(`/list/${listId}`);
    } catch (err) {
      console.error("Failed to create list:", err);
      setError("Failed to create list. Please try again.");
      haptic('error');
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-list-dialog-title"
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">✨</span>
            <h2 id="create-list-dialog-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Create New List
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Give your list a name and optionally assign it to a category.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <label htmlFor="listName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            List name
          </label>
          <input
            id="listName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Groceries, Weekend Tasks"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-amber-500 dark:focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all disabled:opacity-50"
            disabled={isCreating}
            autoFocus
          />

          <div className="mt-4">
            <CategorySelector
              value={categoryId}
              onChange={setCategoryId}
              disabled={isCreating}
            />
          </div>

          {error && (
            <div className="mt-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => {
                haptic('light');
                onClose();
              }}
              disabled={isCreating}
              className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all"
            >
              {isCreating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                "Create List"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
