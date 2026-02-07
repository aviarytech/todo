/**
 * Tag selector component for adding/removing tags from items.
 * Note: Tags functionality requires Convex backend deployment.
 */

import { useState } from "react";
import type { Id, Doc } from "../../convex/_generated/dataModel";
import { useSettings } from "../hooks/useSettings";

const TAG_COLORS = [
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Gray", value: "#6b7280" },
];

interface TagSelectorProps {
  listId: Id<"lists">;
  itemId: Id<"items">;
  selectedTagIds: Id<"tags">[];
  userDid: string;
  legacyDid?: string;
  canEdit: boolean;
}

export function TagSelector({
  canEdit,
}: TagSelectorProps) {
  const { haptic } = useSettings();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0].value);

  // Tags API not yet deployed - show placeholder
  const tags: Doc<"tags">[] = [];

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim() || !canEdit) return;
    haptic("medium");
    // TODO: Implement when backend is deployed
    setNewTagName("");
    setShowCreateForm(false);
  };

  return (
    <div className="space-y-3">
      {/* Existing tags */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tag._id}
            disabled={!canEdit}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium opacity-60"
            style={{
              backgroundColor: `${tag.color}20`,
              color: tag.color,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: tag.color }}
            />
            {tag.name}
          </button>
        ))}

        {/* Add new tag button */}
        {canEdit && !showCreateForm && (
          <button
            onClick={() => {
              haptic("light");
              setShowCreateForm(true);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New tag
          </button>
        )}
      </div>

      {/* Create tag form */}
      {showCreateForm && canEdit && (
        <form onSubmit={handleCreateTag} className="space-y-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Tag name..."
            autoFocus
            className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          
          <div className="flex flex-wrap gap-1">
            {TAG_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setNewTagColor(color.value)}
                className={`w-6 h-6 rounded-full transition-all ${
                  newTagColor === color.value ? "ring-2 ring-offset-2 ring-gray-400" : ""
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setNewTagName("");
              }}
              className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newTagName.trim()}
              className="px-3 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {tags.length === 0 && !showCreateForm && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          No tags yet. Create one to categorize items.
        </p>
      )}
    </div>
  );
}

/**
 * Tag display badges (for showing on items).
 */
interface TagBadgesProps {
  tags: Doc<"tags">[];
  max?: number;
}

export function TagBadges({ tags, max = 3 }: TagBadgesProps) {
  const displayTags = tags.slice(0, max);
  const remaining = tags.length - max;

  return (
    <div className="flex items-center gap-1">
      {displayTags.map((tag) => (
        <span
          key={tag._id}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
          style={{
            backgroundColor: `${tag.color}20`,
            color: tag.color,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: tag.color }}
          />
          {tag.name}
        </span>
      ))}
      {remaining > 0 && (
        <span className="text-[10px] text-gray-400">+{remaining}</span>
      )}
    </div>
  );
}
