/**
 * Home page showing user's lists.
 *
 * Displays lists grouped by category with collapsible sections.
 * Empty categories are hidden. Uncategorized lists appear at the end.
 */

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useCategories } from "../hooks/useCategories";
import { useOffline } from "../hooks/useOffline";
import { ListCard } from "../components/ListCard";
import { CreateListModal } from "../components/CreateListModal";
import { CategoryHeader } from "../components/lists/CategoryHeader";
import { CategoryManager } from "../components/lists/CategoryManager";
import { cacheAllLists, getAllCachedLists, type OfflineList } from "../lib/offline";

export function Home() {
  const { did, legacyDid, isLoading: userLoading } = useCurrentUser();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { isOnline } = useOffline();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [cachedLists, setCachedLists] = useState<OfflineList[]>([]);

  // Query lists for current DID, including legacyDid for migrated users
  const serverLists = useQuery(
    api.lists.getUserLists,
    did ? { userDid: did, legacyDid: legacyDid ?? undefined } : "skip"
  );

  // Cache lists when online and data is available
  useEffect(() => {
    if (serverLists && isOnline) {
      // Convert Doc<"lists"> to OfflineList format
      const listsToCache = serverLists.map((list) => ({
        _id: list._id,
        assetDid: list.assetDid,
        name: list.name,
        ownerDid: list.ownerDid,
        categoryId: list.categoryId,
        createdAt: list.createdAt,
      }));
      cacheAllLists(listsToCache);
    }
  }, [serverLists, isOnline]);

  // Load cached lists when offline
  useEffect(() => {
    if (!isOnline && !serverLists) {
      getAllCachedLists().then(setCachedLists);
    }
  }, [isOnline, serverLists]);

  // Use server data when available, cache when offline
  // Cast OfflineList to Doc<"lists"> since OfflineList contains all the fields we need
  // (missing _creationTime is not used in the UI)
  const lists = (serverLists ?? (!isOnline ? cachedLists : undefined)) as
    | Doc<"lists">[]
    | undefined;

  // Derive usingCache from whether we're showing cached data
  const usingCache = !isOnline && !serverLists && cachedLists.length > 0;

  // Group lists by category
  const groupedLists = useMemo<{
    categorized: Map<Id<"categories">, Doc<"lists">[]>;
    uncategorized: Doc<"lists">[];
  }>(() => {
    if (!lists) {
      return {
        categorized: new Map<Id<"categories">, Doc<"lists">[]>(),
        uncategorized: [],
      };
    }

    const categorized = new Map<Id<"categories">, Doc<"lists">[]>();
    const uncategorized: Doc<"lists">[] = [];

    for (const list of lists) {
      if (list.categoryId) {
        const existing = categorized.get(list.categoryId) ?? [];
        existing.push(list);
        categorized.set(list.categoryId, existing);
      } else {
        uncategorized.push(list);
      }
    }

    return { categorized, uncategorized };
  }, [lists]);

  if (!did && !userLoading) {
    return null; // Login page will show instead (handled by App.tsx)
  }

  const isLoading = lists === undefined || categoriesLoading;
  const hasLists = lists && lists.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Your Lists</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCategoryManagerOpen(true)}
            className="text-gray-600 px-3 py-2 rounded-md font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Manage Categories
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            New List
          </button>
        </div>
      </div>

      {/* Cached data indicator */}
      {usingCache && (
        <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Showing cached data. Some information may be outdated.</span>
        </div>
      )}

      {isLoading && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow p-4 animate-pulse"
            >
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !hasLists && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-gray-400 text-5xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No lists yet
          </h3>
          <p className="text-gray-500 mb-4">
            Create your first list to get started!
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700"
          >
            Create List
          </button>
        </div>
      )}

      {!isLoading && hasLists && did && (
        <div>
          {/* Categorized lists */}
          {categories.map((category) => {
            const categoryLists = groupedLists.categorized.get(category._id);
            // Hide empty categories
            if (!categoryLists || categoryLists.length === 0) return null;

            return (
              <CategoryHeader
                key={category._id}
                name={category.name}
                listCount={categoryLists.length}
              >
                {categoryLists.map((list) => (
                  <ListCard key={list._id} list={list} currentUserDid={did} />
                ))}
              </CategoryHeader>
            );
          })}

          {/* Uncategorized lists */}
          {groupedLists.uncategorized.length > 0 && (
            <CategoryHeader
              name="Uncategorized"
              listCount={groupedLists.uncategorized.length}
            >
              {groupedLists.uncategorized.map((list) => (
                <ListCard key={list._id} list={list} currentUserDid={did} />
              ))}
            </CategoryHeader>
          )}
        </div>
      )}

      {isCreateModalOpen && (
        <CreateListModal onClose={() => setIsCreateModalOpen(false)} />
      )}

      {isCategoryManagerOpen && (
        <CategoryManager onClose={() => setIsCategoryManagerOpen(false)} />
      )}
    </div>
  );
}
