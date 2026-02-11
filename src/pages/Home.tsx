/**
 * Home page showing user's lists.
 *
 * Modern minimal design with card layout, FAB, warm cream/amber palette.
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

    let filtered = lists;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = lists.filter(list => 
        list.name.toLowerCase().includes(query)
      );
    }

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

  type GroupedLists = {
    categorized: Map<Id<"categories">, Doc<"lists">[]>;
    uncategorized: Doc<"lists">[];
  };

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
    return null;
  }

  const isLoading = lists === undefined || categoriesLoading;
  const hasLists = lists && lists.length > 0;
  const hasFilteredResults = processedLists && processedLists.length > 0;
  const totalListCount = lists?.length ?? 0;

  return (
    <div ref={pullRef} className="min-h-full pb-28">
      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        threshold={80}
        isRefreshing={isRefreshing}
      />

      {/* Header */}
      <div className="pt-2 pb-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h1 className="text-[2rem] sm:text-4xl font-extrabold text-stone-900 dark:text-stone-50 tracking-tight leading-none">
              Your Lists
            </h1>
            {hasLists && (
              <p className="mt-1.5 text-sm font-medium text-stone-400 dark:text-stone-500">
                {totalListCount} {totalListCount === 1 ? 'list' : 'lists'}
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions - pill chips */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/priority"
            onClick={() => haptic('light')}
            className="inline-flex items-center gap-1.5 text-[13px] text-amber-700 dark:text-amber-400 pl-3 pr-3.5 py-2 rounded-full font-semibold bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/60 dark:border-amber-800/50 transition-all active:scale-95"
          >
            <span>🎯</span>
            <span>Focus</span>
          </Link>
          <button
            onClick={() => {
              haptic('light');
              setIsCategoryManagerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 text-[13px] text-stone-600 dark:text-stone-400 pl-3 pr-3.5 py-2 rounded-full font-semibold bg-stone-100 dark:bg-stone-800/60 hover:bg-stone-200 dark:hover:bg-stone-800 border border-stone-200/60 dark:border-stone-700/50 transition-all active:scale-95"
          >
            <span>📁</span>
            <span>Categories</span>
          </button>
        </div>
      </div>

      {/* Search and Sort */}
      {hasLists && (
        <div className="relative z-20 flex gap-2.5 mb-6 animate-slide-up">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            className="flex-1"
          />
          <SortDropdown />
        </div>
      )}

      {/* Offline indicator */}
      {usingCache && (
        <div className="mb-5 px-4 py-3 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-2xl text-amber-700 dark:text-amber-400 text-sm flex items-center gap-2.5 animate-slide-up">
          <span>📡</span>
          <span>Offline — showing cached lists</span>
        </div>
      )}

      {/* Loading */}
      {isLoading && <HomePageSkeleton />}

      {/* Empty state - no lists */}
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
          {/* Owned lists */}
          {(ownedLists.uncategorized.length > 0 || Array.from(ownedLists.categorized.values()).some(l => l.length > 0)) && (
            <section>
              {categories.map((category) => {
                const categoryLists = ownedLists.categorized.get(category._id);
                if (!categoryLists || categoryLists.length === 0) return null;

                return (
                  <CategoryHeader
                    key={category._id}
                    name={category.name}
                    listCount={categoryLists.length}
                  >
                    <div className="space-y-3">
                      {categoryLists.map((list, index) => (
                        <div key={list._id} className="animate-slide-up" style={{ animationDelay: `${index * 40}ms` }}>
                          <ListCard list={list} currentUserDid={did} />
                        </div>
                      ))}
                    </div>
                  </CategoryHeader>
                );
              })}

              {ownedLists.uncategorized.length > 0 && (
                <CategoryHeader
                  name="Uncategorized"
                  listCount={ownedLists.uncategorized.length}
                >
                  <div className="space-y-3">
                    {ownedLists.uncategorized.map((list, index) => (
                      <div key={list._id} className="animate-slide-up" style={{ animationDelay: `${index * 40}ms` }}>
                        <ListCard list={list} currentUserDid={did} />
                      </div>
                    ))}
                  </div>
                </CategoryHeader>
              )}
            </section>
          )}

          {/* Shared lists */}
          {(sharedLists.uncategorized.length > 0 || Array.from(sharedLists.categorized.values()).some(l => l.length > 0)) && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🤝</span>
                <h2 className="text-lg font-bold text-stone-800 dark:text-stone-200">
                  Shared with me
                </h2>
              </div>

              {categories.map((category) => {
                const categoryLists = sharedLists.categorized.get(category._id);
                if (!categoryLists || categoryLists.length === 0) return null;

                return (
                  <CategoryHeader
                    key={`shared-${category._id}`}
                    name={category.name}
                    listCount={categoryLists.length}
                  >
                    <div className="space-y-3">
                      {categoryLists.map((list, index) => (
                        <div key={list._id} className="animate-slide-up" style={{ animationDelay: `${index * 40}ms` }}>
                          <ListCard list={list} currentUserDid={did} showOwner />
                        </div>
                      ))}
                    </div>
                  </CategoryHeader>
                );
              })}

              {sharedLists.uncategorized.length > 0 && (
                <CategoryHeader
                  name="Uncategorized"
                  listCount={sharedLists.uncategorized.length}
                >
                  <div className="space-y-3">
                    {sharedLists.uncategorized.map((list, index) => (
                      <div key={list._id} className="animate-slide-up" style={{ animationDelay: `${index * 40}ms` }}>
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

      {/* FAB */}
      <button
        onClick={handleOpenCreate}
        className="fixed bottom-6 right-6 z-30 w-14 h-14 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white rounded-2xl shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 focus:outline-none focus:ring-4 focus:ring-amber-400/30 transition-all active:scale-90 flex items-center justify-center group"
        aria-label="Create new list"
      >
        <svg 
          className="w-6 h-6 transition-transform duration-200 group-hover:rotate-90" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

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
