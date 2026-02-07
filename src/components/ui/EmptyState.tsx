/**
 * Empty state components with playful Poo App branding.
 */

import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  emoji?: string;
  title: string;
  description: string;
  action?: ReactNode;
}

/**
 * Generic empty state component.
 */
export function EmptyState({ icon, emoji = '💩', title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-6 bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl border-2 border-dashed border-amber-200 dark:border-gray-700">
      <div className="relative inline-block mb-6">
        {icon || (
          <div className="text-7xl animate-bounce-slow filter drop-shadow-lg">
            {emoji}
          </div>
        )}
        {/* Floating particles */}
        <div className="absolute -top-2 -right-2 text-2xl animate-float-delayed">✨</div>
        <div className="absolute -bottom-1 -left-3 text-xl animate-float">🌟</div>
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto mb-6">
        {description}
      </p>
      
      {action}
    </div>
  );
}

/**
 * Empty state for when user has no lists.
 */
export function NoListsEmptyState({ onCreateList }: { onCreateList: () => void }) {
  return (
    <EmptyState
      emoji="📝"
      title="No lists yet!"
      description="Create your first list and start organizing your life. Every great journey starts with a single step... or a single list."
      action={
        <button
          onClick={onCreateList}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-2xl font-bold text-lg shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <span>💩</span>
          Create Your First List
        </button>
      }
    />
  );
}

/**
 * Empty state for when a list has no items.
 */
export function NoItemsEmptyState() {
  return (
    <div className="py-12 px-6 text-center">
      <div className="text-5xl mb-4 animate-bounce-slow">📋</div>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
        This list is empty
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-sm">
        Add your first item below to get started!
      </p>
    </div>
  );
}

/**
 * Empty state for search with no results.
 */
export function NoSearchResultsEmptyState({ query }: { query: string }) {
  return (
    <EmptyState
      emoji="🔍"
      title="No matches found"
      description={`We couldn't find any lists matching "${query}". Try a different search term!`}
    />
  );
}
