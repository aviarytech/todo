/**
 * Read-only view of a shared list resource.
 * Accessed via /{userPath}/resources/list-{listId}
 *
 * Fetches the list data from the Convex HTTP endpoint and renders it.
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

interface ListItem {
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

export function SharedListResource() {
  const { userPath, listId } = useParams<{ userPath: string; listId: string }>();
  const [resource, setResource] = useState<ListResource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userPath || !listId) return;

    const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
    // Convex HTTP URL is the site URL derived from the deployment URL
    const siteUrl = convexUrl?.includes("localhost") || convexUrl?.includes("127.0.0.1")
      ? convexUrl.replace(":3210", ":3211")
      : convexUrl?.replace(".convex.cloud", ".convex.site") ?? "";

    // Use /d/ prefix for Convex routing (pathPrefix must end with /)
    fetch(`${siteUrl}/d/${userPath}/resources/list-${listId}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(res.status === 404 ? "List not found" : "Failed to load list");
        }
        return res.json();
      })
      .then((data) => {
        setResource(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [userPath, listId]);

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
          {/* Progress bar */}
          {resource.itemCount > 0 && (
            <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Items */}
        <div className="space-y-1">
          {resource.items.map((item, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl ${
                item.checked
                  ? "bg-gray-100 dark:bg-gray-900/50"
                  : "bg-white dark:bg-gray-900"
              }`}
            >
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
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
            </div>
          ))}
        </div>

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
