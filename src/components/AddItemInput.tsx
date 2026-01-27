/**
 * Input component for adding new items to a list.
 * Updated for Phase 5.5: Accepts onAddItem callback for optimistic updates.
 * Updated: Uses server-side credential signing action instead of client-side signer.
 */

import { useState, type FormEvent } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCurrentUser } from "../hooks/useCurrentUser";

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
  const { did, legacyDid, subOrgId } = useCurrentUser();
  const signItemAction = useAction(api.credentialSigning.signItemAction);

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

      // Sign the item action credential server-side (best-effort, non-blocking for v1)
      if (subOrgId) {
        try {
          await signItemAction({
            type: "ItemAdded",
            listDid: assetDid,
            itemId,
            actorDid: did,
            subOrgId,
          });
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
