/**
 * Input component for adding new items to a list.
 * Updated for Phase 5.5: Accepts onAddItem callback for optimistic updates.
 */

import { useState, type FormEvent } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { signItemActionWithSigner } from "../lib/originals";

interface AddItemInputProps {
  assetDid: string;
  /** Callback for adding items - passed from ListView using useOptimisticItems */
  onAddItem: (args: {
    name: string;
    createdByDid: string;
    legacyDid?: string;
    createdAt: number;
  }) => Promise<void>;
}

export function AddItemInput({ assetDid, onAddItem }: AddItemInputProps) {
  const { did, legacyDid, getSigner } = useCurrentUser();

  const [name, setName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName || !did) {
      return;
    }

    setIsAdding(true);

    try {
      // Generate a unique item ID for the credential
      const itemId = crypto.randomUUID();

      // Sign the item action credential (best-effort, non-blocking for v1)
      const signer = getSigner();
      if (signer) {
        try {
          await signItemActionWithSigner("ItemAdded", assetDid, itemId, did, signer);
        } catch (err) {
          console.warn("Failed to sign item action credential:", err);
          // Continue anyway - credential signing is best-effort for v1
        }
      }

      // Add the item via callback (uses optimistic updates from useOptimisticItems)
      await onAddItem({
        name: trimmedName,
        createdByDid: did,
        legacyDid: legacyDid ?? undefined,
        createdAt: Date.now(),
      });

      setName("");
    } catch (err) {
      console.error("Failed to add item:", err);
      // Could show error toast here
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add an item..."
        className="flex-1 px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        disabled={isAdding}
      />
      <button
        type="submit"
        disabled={isAdding || !name.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAdding ? "Adding..." : "Add"}
      </button>
    </form>
  );
}
