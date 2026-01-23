# Feature: Multiple Lists with Categories

## Overview

Users can create multiple lists and organize them into custom categories. Categories help users keep their lists organized (e.g., "Groceries", "Home Projects", "Work").

## User Stories

### Create Category
- **As a** user with many lists
- **I want to** create categories
- **So that** I can organize my lists

### Assign List to Category
- **As a** user
- **I want to** move lists between categories
- **So that** I can reorganize as needed

### View by Category
- **As a** user
- **I want to** filter/view lists by category
- **So that** I can focus on relevant lists

## Acceptance Criteria

### Category Management
1. User can create new categories (name only)
2. User can rename existing categories
3. User can delete empty categories
4. User can delete categories with lists (lists move to Uncategorized)
5. Default category "Uncategorized" always exists and cannot be deleted

### List Assignment
1. New lists default to "Uncategorized"
2. User can assign a category when creating a list
3. User can change a list's category at any time
4. Moving a list updates immediately (real-time)

### UI
1. Home page shows lists grouped by category
2. Category headers are collapsible
3. Empty categories are hidden (except when managing)
4. Category selector in list creation/edit modal

## Technical Specification

### Schema

```typescript
// convex/schema.ts

// Categories are per-user
categories: defineTable({
  ownerDid: v.string(),        // User who owns this category
  name: v.string(),
  order: v.number(),           // Sort order
  createdAt: v.number(),
})
  .index("by_owner", ["ownerDid"])
  .index("by_owner_name", ["ownerDid", "name"]),

// Update lists table
lists: defineTable({
  // ... existing fields
  categoryId: v.optional(v.id("categories")), // NEW: null = uncategorized
}),
```

### Convex Functions

```typescript
// convex/categories.ts

// Get all categories for a user
export const getUserCategories = query({
  args: { userDid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_owner", q => q.eq("ownerDid", args.userDid))
      .collect();
  },
});

// Create a category
export const createCategory = mutation({
  args: {
    userDid: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for duplicate name
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_owner_name", q =>
        q.eq("ownerDid", args.userDid).eq("name", args.name)
      )
      .first();

    if (existing) {
      throw new Error("Category with this name already exists");
    }

    // Get max order
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_owner", q => q.eq("ownerDid", args.userDid))
      .collect();

    const maxOrder = categories.reduce((max, c) => Math.max(max, c.order), 0);

    return await ctx.db.insert("categories", {
      ownerDid: args.userDid,
      name: args.name,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });
  },
});

// Delete a category (moves lists to uncategorized)
export const deleteCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    userDid: v.string(),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.ownerDid !== args.userDid) {
      throw new Error("Category not found or unauthorized");
    }

    // Move all lists in this category to uncategorized
    const lists = await ctx.db
      .query("lists")
      .filter(q => q.eq(q.field("categoryId"), args.categoryId))
      .collect();

    for (const list of lists) {
      await ctx.db.patch(list._id, { categoryId: undefined });
    }

    await ctx.db.delete(args.categoryId);
  },
});

// Update list category
export const setListCategory = mutation({
  args: {
    listId: v.id("lists"),
    categoryId: v.optional(v.id("categories")),
    userDid: v.string(),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("List not found");

    // Verify user has access
    // (owner or collaborator with edit rights)

    await ctx.db.patch(args.listId, {
      categoryId: args.categoryId
    });
  },
});
```

### React Hook

```typescript
// src/hooks/useCategories.tsx

export function useCategories() {
  const { user } = useAuth();
  const categories = useQuery(api.categories.getUserCategories,
    user ? { userDid: user.did } : "skip"
  );

  const createCategory = useMutation(api.categories.createCategory);
  const deleteCategory = useMutation(api.categories.deleteCategory);
  const renameCategory = useMutation(api.categories.renameCategory);

  return {
    categories: categories ?? [],
    isLoading: categories === undefined,
    createCategory,
    deleteCategory,
    renameCategory,
  };
}
```

## UI Components

### CategorySelector
- Dropdown for selecting category
- Option to create new category inline
- Used in CreateListModal and list settings

### CategoryHeader
- Collapsible section header
- Shows category name + list count
- Drag handle for reordering (future)

### CategoryManager
- Full-page or modal for managing all categories
- Rename, reorder, delete categories
- Shows list counts per category

## Design Notes

- Categories are private to each user
- Collaborators see their own category organization
- A list can be in different categories for different users
- Consider color/icon for categories (future enhancement)
