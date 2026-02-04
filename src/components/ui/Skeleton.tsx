/**
 * Skeleton loading components with shimmer effect.
 */

import { type ReactNode } from 'react';

interface SkeletonProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Base skeleton component with shimmer animation.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] rounded ${className}`}
    />
  );
}

/**
 * Skeleton for list cards on the home page.
 */
export function ListCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Skeleton for list items.
 */
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Skeleton className="w-6 h-6 rounded" />
      <Skeleton className="w-11 h-11 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="w-11 h-11 rounded-lg" />
    </div>
  );
}

/**
 * Skeleton for the list view page.
 */
export function ListViewSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="w-11 h-11 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20 rounded-lg" />
          <Skeleton className="h-10 w-16 rounded-lg" />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow divide-y divide-gray-100 dark:divide-gray-700">
        {[1, 2, 3, 4, 5].map((i) => (
          <ListItemSkeleton key={i} />
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="flex-1 h-12 rounded-xl" />
        <Skeleton className="h-12 w-20 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Skeleton for the home page list grid.
 */
export function HomePageSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <ListCardSkeleton key={i} />
      ))}
    </div>
  );
}
