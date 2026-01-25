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
  const { did, legacyDid, walletDid, isLoading: userLoading } = useCurrentUser();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { isOnline } = useOffline();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [cachedLists, setCachedLists] = useState<OfflineList[]>([]);

  // Debug: log DIDs being used
  console.log("[Home] DIDs:", { did, legacyDid, walletDid });

  // Query lists for current DID, including legacyDid and walletDid for backwards compat
  const serverLists = useQuery(
    api.lists.getUserLists,
    did ? { userDid: did, legacyDid: legacyDid ?? undefined, walletDid: walletDid ?? undefined } : "skip"
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

  // Type for grouped lists by category
  type GroupedLists = {
    categorized: Map<Id<"categories">, Doc<"lists">[]>;
    uncategorized: Doc<"lists">[];
  };

  // Split lists into owned and shared, then group each by category
  const { ownedLists, sharedLists } = useMemo<{ ownedLists: GroupedLists; sharedLists: GroupedLists }>(() => {
    // Helper to check if a list is owned by the current user
    // Compares against all user DIDs (canonical, legacy, wallet) for backwards compat
    const isOwnedByUser = (list: Doc<"lists">) => {
      const ownerDid = list.ownerDid;
      return ownerDid === did || ownerDid === legacyDid || ownerDid === walletDid;
    };

    const emptyGroup: GroupedLists = { categorized: new Map(), uncategorized: [] };
    if (!lists) {
      return { ownedLists: emptyGroup, sharedLists: { categorized: new Map(), uncategorized: [] } };
    }

    const owned: Doc<"lists">[] = [];
    const shared: Doc<"lists">[] = [];

    for (const list of lists) {
      if (isOwnedByUser(list)) {
        owned.push(list);
      } else {
        shared.push(list);
      }
    }

    const groupByCategory = (listsToGroup: Doc<"lists">[]): GroupedLists => {
      const categorized = new Map<Id<"categories">, Doc<"lists">[]>();
      const uncategorized: Doc<"lists">[] = [];

      for (const list of listsToGroup) {
        if (list.categoryId) {
          const existing = categorized.get(list.categoryId) ?? [];
          existing.push(list);
          categorized.set(list.categoryId, existing);
        } else {
          uncategorized.push(list);
        }
      }

      return { categorized, uncategorized };
    };

    return {
      ownedLists: groupByCategory(owned),
      sharedLists: groupByCategory(shared),
    };
  }, [lists, did, legacyDid, walletDid]);

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

      {/* Debug: Show DIDs */}
      <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded-lg text-xs font-mono">
        <div><strong>Debug DIDs:</strong></div>
        <div>did: {did ?? "null"}</div>
        <div>legacyDid: {legacyDid ?? "null"}</div>
        <div>walletDid: {walletDid ?? "null"}</div>
        <div>Lists found: {serverLists?.length ?? "loading..."}</div>
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
          {/* Your Lists section (owned by user) */}
          {(ownedLists.uncategorized.length > 0 || Array.from(ownedLists.categorized.values()).some(l => l.length > 0)) && (
            <>
              {/* Categorized owned lists */}
              {categories.map((category) => {
                const categoryLists = ownedLists.categorized.get(category._id);
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

              {/* Uncategorized owned lists */}
              {ownedLists.uncategorized.length > 0 && (
                <CategoryHeader
                  name="Uncategorized"
                  listCount={ownedLists.uncategorized.length}
                >
                  {ownedLists.uncategorized.map((list) => (
                    <ListCard key={list._id} list={list} currentUserDid={did} />
                  ))}
                </CategoryHeader>
              )}
            </>
          )}

          {/* Shared with me section */}
          {(sharedLists.uncategorized.length > 0 || Array.from(sharedLists.categorized.values()).some(l => l.length > 0)) && (
            <>
              <h2 className="text-xl font-bold text-gray-700 mt-8 mb-4">Shared with me</h2>

              {/* Categorized shared lists */}
              {categories.map((category) => {
                const categoryLists = sharedLists.categorized.get(category._id);
                if (!categoryLists || categoryLists.length === 0) return null;

                return (
                  <CategoryHeader
                    key={`shared-${category._id}`}
                    name={category.name}
                    listCount={categoryLists.length}
                  >
                    {categoryLists.map((list) => (
                      <ListCard key={list._id} list={list} currentUserDid={did} showOwner />
                    ))}
                  </CategoryHeader>
                );
              })}

              {/* Uncategorized shared lists */}
              {sharedLists.uncategorized.length > 0 && (
                <CategoryHeader
                  name="Uncategorized"
                  listCount={sharedLists.uncategorized.length}
                >
                  {sharedLists.uncategorized.map((list) => (
                    <ListCard key={list._id} list={list} currentUserDid={did} showOwner />
                  ))}
                </CategoryHeader>
              )}
            </>
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
