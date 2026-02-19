/**
 * Shared list resource view — view and interact with a shared list.
 * Accessed via /{userPath}/resources/list-{listId}
 *
 * - Anonymous users can view the list
 * - Authenticated users can check/uncheck items and add new items
 * - Real-time updates via polling (Convex subscriptions require auth)
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";

interface ListItem {
  _id: string;
  name: string;
  checked: boolean;
  createdAt: number;
  checkedAt?: number;
  description?: string;
  priority?: string;
  dueDate?: number;
}

interface ListResource {
  "@context": string[];
  id: string;
  type: string;
  controller: string;
  name: string;
  items: ListItem[];
  createdAt: number;
  itemCount: number;
  checkedCount: number;
}

function getResourceUrl(userPath: string, listId: string): string {
  // In production, the server proxies these paths to Convex
  // In development, go directly to Convex site URL
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
  if (convexUrl?.includes("127.0.0.1") || convexUrl?.includes("localhost")) {
    const siteUrl = convexUrl.replace(":3210", ":3211");
    return `${siteUrl}/${userPath}/resources/list-${listId}`;
  }
  // Use relative URL — server.ts will proxy to Convex
  return `/${userPath}/resources/list-${listId}`;
}

export function SharedListResource() {
  const { userPath, listId } = useParams<{ userPath: string; listId: string }>();
  const [resource, setResource] = useState<ListResource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newItemText, setNewItemText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchResource = useCallback(async () => {
    if (!userPath || !listId) return;
    try {
      const url = getResourceUrl(userPath, listId);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(res.status === 404 ? "List not found" : "Failed to load list");
      }
      const data = await res.json();
      setResource(data);
      setError(null);
    } catch (err: any) {
      if (!resource) {
        // Only show error if we haven't loaded yet
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [userPath, listId]);

  // Initial fetch + polling for real-time updates
  useEffect(() => {
    fetchResource();
    pollRef.current = setInterval(fetchResource, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchResource]);

  const handleToggleItem = async (item: ListItem) => {
    if (!userPath || !listId || !resource) return;

    // Optimistic update
    setResource({
      ...resource,
      items: resource.items.map((i) =>
        i._id === item._id ? { ...i, checked: !i.checked } : i
      ),
      checkedCount: item.checked ? resource.checkedCount - 1 : resource.checkedCount + 1,
    });

    try {
      const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
      const siteUrl = convexUrl?.includes("localhost") || convexUrl?.includes("127.0.0.1")
        ? convexUrl.replace(":3210", ":3211")
        : convexUrl?.replace(".convex.cloud", ".convex.site") || "";

      const endpoint = item.checked ? "uncheck" : "check";
      await fetch(`${siteUrl}/${userPath}/resources/list-${listId}/items/${item._id}/${endpoint}`, {
        method: "POST",
      });
    } catch {
      // Revert on failure
      fetchResource();
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim() || !userPath || !listId || !resource) return;

    setIsAdding(true);
    const itemName = newItemText.trim();
    setNewItemText("");

    // Optimistic add
    const tempItem: ListItem = {
      _id: `temp-${Date.now()}`,
      name: itemName,
      checked: false,
      createdAt: Date.now(),
    };
    setResource({
      ...resource,
      items: [...resource.items, tempItem],
      itemCount: resource.itemCount + 1,
    });

    try {
      const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
      const siteUrl = convexUrl?.includes("localhost") || convexUrl?.includes("127.0.0.1")
        ? convexUrl.replace(":3210", ":3211")
        : convexUrl?.replace(".convex.cloud", ".convex.site") || "";

      await fetch(`${siteUrl}/${userPath}/resources/list-${listId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: itemName }),
      });
      // Refetch to get real IDs
      await fetchResource();
    } catch {
      fetchResource();
    } finally {
      setIsAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {error === "List not found" ? "💩 List not found" : "💩 Something went wrong"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <Link to="/" className="text-amber-500 hover:text-amber-600 font-medium">
            Go to Poo App →
          </Link>
        </div>
      </div>
    );
  }

  const progress = resource.itemCount > 0
    ? Math.round((resource.checkedCount / resource.itemCount) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-1">
            <span>💩</span>
            <span>Shared List</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {resource.name}
          </h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span>{resource.itemCount} items</span>
            <span>·</span>
            <span>{resource.checkedCount} done</span>
            {progress > 0 && (
              <>
                <span>·</span>
                <span>{progress}%</span>
              </>
            )}
          </div>
          {resource.itemCount > 0 && (
            <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Items */}
        <div className="space-y-1">
          {resource.items.map((item) => (
            <button
              key={item._id}
              onClick={() => handleToggleItem(item)}
              className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                item.checked
                  ? "bg-gray-100 dark:bg-gray-900/50"
                  : "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                item.checked
                  ? "border-green-500 bg-green-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}>
                {item.checked && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${
                  item.checked
                    ? "text-gray-400 dark:text-gray-500 line-through"
                    : "text-gray-900 dark:text-gray-100"
                }`}>
                  {item.name}
                </p>
                {item.description && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                    {item.description}
                  </p>
                )}
                {item.priority && (
                  <span className={`inline-block text-xs px-1.5 py-0.5 rounded mt-1 ${
                    item.priority === "high"
                      ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                      : item.priority === "medium"
                      ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                      : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  }`}>
                    {item.priority}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Add item */}
        <form onSubmit={handleAddItem} className="mt-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Add an item..."
              className="flex-1 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              disabled={isAdding}
            />
            <button
              type="submit"
              disabled={!newItemText.trim() || isAdding}
              className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium disabled:opacity-50 transition-colors"
            >
              +
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Shared via{" "}
            <a href="https://trypoo.app" className="text-amber-500 hover:text-amber-600">
              Poo App
            </a>
            {" "}· Verified with{" "}
            <span className="font-mono">did:webvh</span>
          </p>
          <p className="text-xs text-gray-300 dark:text-gray-600 text-center mt-1 font-mono break-all">
            {resource.id}
          </p>
        </div>
      </div>
    </div>
  );
}
