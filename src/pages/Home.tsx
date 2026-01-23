/**
 * Home page showing user's lists.
 *
 * Displays a grid of list cards or an empty state prompting list creation.
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { useIdentity } from "../hooks/useIdentity";
import { ListCard } from "../components/ListCard";
import { CreateListModal } from "../components/CreateListModal";

export function Home() {
  const { did } = useIdentity();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const lists = useQuery(api.lists.getUserLists, did ? { userDid: did } : "skip");

  if (!did) {
    return null; // IdentitySetup will show instead
  }

  const isLoading = lists === undefined;
  const hasLists = lists && lists.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Your Lists</h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          New List
        </button>
      </div>

      {isLoading && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !hasLists && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-gray-400 text-5xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No lists yet</h3>
          <p className="text-gray-500 mb-4">Create your first list to get started!</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700"
          >
            Create List
          </button>
        </div>
      )}

      {!isLoading && hasLists && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list: Doc<"lists">) => (
            <ListCard key={list._id} list={list} currentUserDid={did} />
          ))}
        </div>
      )}

      {isCreateModalOpen && (
        <CreateListModal onClose={() => setIsCreateModalOpen(false)} />
      )}
    </div>
  );
}
