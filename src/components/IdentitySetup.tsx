/**
 * Identity setup modal that appears when no identity exists.
 *
 * Prompts the user for a display name, then creates a new DID identity
 * using the Originals SDK and registers it in Convex.
 */

import { useState, type FormEvent } from "react";
import { useIdentity } from "../hooks/useIdentity";

export function IdentitySetup() {
  const { createAndSaveIdentity, isLoading } = useIdentity();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Please enter a display name");
      return;
    }

    if (trimmedName.length > 50) {
      setError("Display name must be 50 characters or less");
      return;
    }

    setError(null);

    try {
      await createAndSaveIdentity(trimmedName);
    } catch (err) {
      console.error("Failed to create identity:", err);
      setError("Failed to create identity. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to Lisa</h2>
        <p className="text-gray-600 mb-6">
          Enter your name to get started. This will be visible to people you share lists with.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
            Your name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
            autoFocus
          />

          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading || !displayName.trim()}
            className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating identity..." : "Get Started"}
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-500 text-center">
          Your identity is stored locally on this device.
        </p>
      </div>
    </div>
  );
}
