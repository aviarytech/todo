/**
 * Collapsible section header for a category.
 *
 * Shows category name, list count, and expand/collapse toggle.
 */

import { useState, type ReactNode } from "react";

interface CategoryHeaderProps {
  name: string;
  listCount: number;
  children: ReactNode;
  defaultExpanded?: boolean;
}

export function CategoryHeader({
  name,
  listCount,
  children,
  defaultExpanded = true,
}: CategoryHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isUncategorized = name.toLowerCase() === "uncategorized";

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-2 text-left group"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <span
            className={`transform transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
          >
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
          <h3
            className={`text-lg font-semibold ${
              isUncategorized
                ? "text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                : "text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white"
            }`}
          >
            {name}
          </h3>
          <span className="text-sm text-gray-400">({listCount})</span>
        </div>
      </button>

      {isExpanded && (
        <div className="mt-3 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {children}
        </div>
      )}
    </div>
  );
}
