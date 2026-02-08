/**
 * Home page showing user's lists.
 *
 * Displays lists grouped by category with collapsible sections.
 * Includes search, sorting, pull-to-refresh, and improved empty states.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useCategories } from "../hooks/useCategories";
import { useOffline } from "../hooks/useOffline";
import { useSettings } from "../hooks/useSettings";
import { ListCard } from "../components/ListCard";
import { CreateListModal } from "../components/CreateListModal";
import { TemplatePickerModal } from "../components/TemplatePickerModal";
import { CategoryHeader } from "../components/lists/CategoryHeader";
import { CategoryManager } from "../components/lists/CategoryManager";
import { SearchInput } from "../components/ui/SearchInput";
import { SortDropdown } from "../components/ui/SortDropdown";
import { HomePageSkeleton } from "../components/ui/Skeleton";
import { NoListsEmptyState, NoSearchResultsEmptyState } from "../components/ui/EmptyState";
import { usePullToRefresh, PullToRefreshIndicator } from "../hooks/usePullToRefresh";
import { cacheAllLists, getAllCachedLists, type OfflineList } from "../lib/offline";

export function Home() {
  const { did, legacyDid, isLoading: userLoading } = useCurrentUser();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { isOnline } = useOffline();
  const { listSort, haptic } = useSettings();
  const [searchParams] = useSearchParams();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [cachedLists, setCachedLists] = useState<OfflineList[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Check for action param (e.g., from PWA shortcut)
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsTemplatePickerOpen(true);
    }
  }, [searchParams]);

  // Query lists for current DID, including legacyDid for backwards compat
  const serverLists = useQuery(
    api.lists.getUserLists,
    did ? { userDid: did, legacyDid: legacyDid ?? undefined } : "skip"
  );

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    haptic('medium');
    // Lists auto-refresh via Convex, but we can force a small delay for UX
    await new Promise(resolve => setTimeout(resolve, 800));
    haptic('success');
  }, [haptic]);

  const { isRefreshing, pullDistance, pullRef } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
  });

  // Cache lists when online and data is available
  useEffect(() => {
    if (serverLists && isOnline) {
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
  const lists = (serverLists ?? (!isOnline ? cachedLists : undefined)) as
    | Doc<"lists">[]
    | undefined;

  const usingCache = !isOnline && !serverLists && cachedLists.length > 0;

  // Filter and sort lists
  const processedLists = useMemo(() => {
    if (!lists) return undefined;

    // Filter by search query
    let filtered = lists;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = lists.filter(list => 
        list.name.toLowerCase().includes(query)
      );
    }

    // Sort lists
    return [...filtered].sort((a, b) => {
      switch (listSort) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'newest':
        default:
          return b.createdAt - a.createdAt;
      }
    });
  }, [lists, searchQuery, listSort]);

  // Type for grouped lists by category
  type GroupedLists = {
    categorized: Map<Id<"categories">, Doc<"lists">[]>;
    uncategorized: Doc<"lists">[];
  };

  // Split lists into owned and shared, then group each by category
  const { ownedLists, sharedLists } = useMemo<{ ownedLists: GroupedLists; sharedLists: GroupedLists }>(() => {
    const isOwnedByUser = (list: Doc<"lists">) => {
      const ownerDid = list.ownerDid;
      return ownerDid === did || ownerDid === legacyDid;
    };

    const emptyGroup: GroupedLists = { categorized: new Map(), uncategorized: [] };
    if (!processedLists) {
      return { ownedLists: emptyGroup, sharedLists: { categorized: new Map(), uncategorized: [] } };
    }

    const owned: Doc<"lists">[] = [];
    const shared: Doc<"lists">[] = [];

    for (const list of processedLists) {
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
  }, [processedLists, did, legacyDid]);

  const handleOpenCreate = () => {
    haptic('light');
    setIsTemplatePickerOpen(true);
  };

  const handleCreateBlank = () => {
    setIsTemplatePickerOpen(false);
    setIsCreateModalOpen(true);
  };

  if (!did && !userLoading) {
    return null; // Login page will show instead
  }

  const isLoading = lists === undefined || categoriesLoading;
  const hasLists = lists && lists.length > 0;
  const hasFilteredResults = processedLists && processedLists.length > 0;

  return (
    <div ref={pullRef} className="min-h-full">
      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        threshold={80}
        isRefreshing={isRefreshing}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Your Lists
        </h1>
        <div className="flex items-center gap-2">
          <Link
            to="/priority"
            onClick={() => haptic('light')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 px-3.5 py-2 rounded-full font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all active:scale-95"
          >
            🎯 Focus
          </Link>
          <button
            onClick={() => {
              haptic('light');
              setIsCategoryManagerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 px-3.5 py-2 rounded-full font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all active:scale-95"
          >
            📁 Categories
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white px-4 py-2 rounded-full font-semibold shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all active:scale-95"
          >
            ✨ New List
          </button>
        </div>
      </div>

      {/* Search and Sort */}
      {hasLists && (
        <div className="flex gap-3 mb-6 animate-slide-up">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            className="flex-1"
          />
          <SortDropdown />
        </div>
      )}

      {/* Cached data indicator */}
      {usingCache && (
        <div className="mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-400 text-sm flex items-center gap-3 animate-slide-up">
          <span className="text-xl">📡</span>
          <span>You're offline. Showing cached lists — some info may be outdated.</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && <HomePageSkeleton />}

      {/* Empty state - no lists at all */}
      {!isLoading && !hasLists && (
        <div className="animate-slide-up">
          <NoListsEmptyState onCreateList={handleOpenCreate} />
        </div>
      )}

      {/* Empty state - no search results */}
      {!isLoading && hasLists && !hasFilteredResults && searchQuery && (
        <div className="animate-slide-up">
          <NoSearchResultsEmptyState query={searchQuery} />
        </div>
      )}

      {/* Lists */}
      {!isLoading && hasFilteredResults && did && (
        <div className="space-y-8 animate-slide-up">
          {/* Your Lists section (owned by user) */}
          {(ownedLists.uncategorized.length > 0 || Array.from(ownedLists.categorized.values()).some(l => l.length > 0)) && (
            <section>
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
                    <div className="grid gap-4 grid-cols-1">
                      {categoryLists.map((list, index) => (
                        <div key={list._id} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                          <ListCard list={list} currentUserDid={did} />
                        </div>
                      ))}
                    </div>
                  </CategoryHeader>
                );
              })}

              {/* Uncategorized owned lists */}
              {ownedLists.uncategorized.length > 0 && (
                <CategoryHeader
                  name="Uncategorized"
                  listCount={ownedLists.uncategorized.length}
                >
                  <div className="grid gap-4 grid-cols-1">
                    {ownedLists.uncategorized.map((list, index) => (
                      <div key={list._id} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                        <ListCard list={list} currentUserDid={did} />
                      </div>
                    ))}
                  </div>
                </CategoryHeader>
              )}
            </section>
          )}

          {/* Shared with me section */}
          {(sharedLists.uncategorized.length > 0 || Array.from(sharedLists.categorized.values()).some(l => l.length > 0)) && (
            <section>
              <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <span>🤝</span> Shared with me
              </h2>

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
                    <div className="grid gap-4 grid-cols-1">
                      {categoryLists.map((list, index) => (
                        <div key={list._id} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                          <ListCard list={list} currentUserDid={did} showOwner />
                        </div>
                      ))}
                    </div>
                  </CategoryHeader>
                );
              })}

              {/* Uncategorized shared lists */}
              {sharedLists.uncategorized.length > 0 && (
                <CategoryHeader
                  name="Uncategorized"
                  listCount={sharedLists.uncategorized.length}
                >
                  <div className="grid gap-4 grid-cols-1">
                    {sharedLists.uncategorized.map((list, index) => (
                      <div key={list._id} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                        <ListCard list={list} currentUserDid={did} showOwner />
                      </div>
                    ))}
                  </div>
                </CategoryHeader>
              )}
            </section>
          )}
        </div>
      )}

      {/* Modals */}
      {isTemplatePickerOpen && (
        <TemplatePickerModal 
          onClose={() => setIsTemplatePickerOpen(false)}
          onCreateBlank={handleCreateBlank}
        />
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
