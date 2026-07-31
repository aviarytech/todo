/**
 * Client-side category helpers: the shared rules plus keyword classification.
 *
 * The rules live in convex/lib/itemCategories so the mutations enforce exactly
 * what the UI shows. Only classification is client-only — the grocery keyword
 * map is large and nothing on the server needs it.
 */

import { classifyItem } from "./groceryAisles";
import {
  type Category,
  OTHER_CATEGORY_ID,
  resolveCategories,
} from "../../convex/lib/itemCategories";

export * from "../../convex/lib/itemCategories";

export interface CategorisableItem {
  name: string;
  /** Explicit assignment (drag / item editor). Holds a category id. */
  groceryAisle?: string;
}

/**
 * Which category an item belongs to, given the list's set.
 *
 * Precedence: an explicit assignment wins, then the keyword guess, then Other.
 * Both are checked against the set, so a category that has since been deleted
 * degrades to Other instead of vanishing the item into a group nothing renders.
 */
export function resolveItemCategory(item: CategorisableItem, categories: Category[]): string {
  const has = (id: string) => categories.some((c) => c.id === id);

  if (item.groceryAisle && has(item.groceryAisle)) return item.groceryAisle;

  const guess = classifyItem(item.name);
  if (has(guess)) return guess;

  return OTHER_CATEGORY_ID;
}

/**
 * Groups items into the list's categories, in display order. Empty categories
 * are dropped so a list is not padded with headers it never uses — except Other,
 * which is also dropped when empty.
 */
export function groupByCategory<T extends CategorisableItem>(
  items: T[],
  categories: Category[] | undefined | null
): { category: Category; items: T[] }[] {
  const resolved = resolveCategories(categories);
  const buckets = new Map<string, T[]>();

  for (const item of items) {
    const id = resolveItemCategory(item, resolved);
    const bucket = buckets.get(id);
    if (bucket) bucket.push(item);
    else buckets.set(id, [item]);
  }

  return resolved
    .filter((category) => (buckets.get(category.id)?.length ?? 0) > 0)
    .map((category) => ({ category, items: buckets.get(category.id)! }));
}

