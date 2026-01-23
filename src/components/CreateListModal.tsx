/**
 * Modal for creating a new list.
 *
 * Creates an Originals asset for the list, then saves it to Convex.
 */

import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useIdentity } from "../hooks/useIdentity";
import { createListAsset } from "../lib/originals";

interface CreateListModalProps {
  onClose: () => void;
}

export function CreateListModal({ onClose }: CreateListModalProps) {
  const { did } = useIdentity();
  const navigate = useNavigate();
  const createList = useMutation(api.lists.createList);

  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter a list name");
      return;
    }

    if (!did) {
      setError("No identity found");
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      // Create Originals asset for the list
      const listAsset = await createListAsset(trimmedName, did);

      // Save to Convex
      const listId = await createList({
        assetDid: listAsset.assetDid,
        name: trimmedName,
        ownerDid: did,
        createdAt: Date.now(),
      });

      // Navigate to the new list
      navigate(`/list/${listId}`);
    } catch (err) {
      console.error("Failed to create list:", err);
      setError("Failed to create list. Please try again.");
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Create New List</h2>

        <form onSubmit={handleSubmit}>
          <label htmlFor="listName" className="block text-sm font-medium text-gray-700 mb-1">
            List name
          </label>
          <input
            id="listName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Groceries, Weekend Tasks"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isCreating}
            autoFocus
          />

          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}

          <div className="mt-4 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md font-medium hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "Creating..." : "Create List"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
