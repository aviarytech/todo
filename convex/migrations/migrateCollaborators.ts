import { mutation } from "../_generated/server";

/**
 * @deprecated This migration has been completed and collaboratorDid has been removed from the schema.
 *
 * Original purpose: Move from single collaboratorDid on lists to collaborators table.
 *
 * For each existing list:
 * 1. Add owner to collaborators table with role "owner"
 * 2. Add collaboratorDid to collaborators table with role "editor" (if exists)
 *
 * This migration was run BEFORE removing collaboratorDid from the lists schema.
 * The collaboratorDid field has now been removed from schema (Phase 6.2).
 */
export const migrateToCollaborators = mutation({
  handler: async (ctx) => {
    const lists = await ctx.db.query("lists").collect();
    let migratedCount = 0;
    let skippedCount = 0;

    for (const list of lists) {
      // Check if owner already exists in collaborators table
      const existingOwner = await ctx.db
        .query("collaborators")
        .withIndex("by_list_user", (q) =>
          q.eq("listId", list._id).eq("userDid", list.ownerDid)
        )
        .first();

      if (existingOwner) {
        // Already migrated, skip
        skippedCount++;
        continue;
      }

      // Add owner as collaborator with "owner" role
      await ctx.db.insert("collaborators", {
        listId: list._id,
        userDid: list.ownerDid,
        role: "owner",
        joinedAt: list.createdAt,
        invitedByDid: undefined, // Owner invited themselves (created the list)
      });

      // Note: The collaboratorDid field has been removed from the schema.
      // This migration can no longer migrate legacy collaborators.
      // All existing data should have been migrated before the schema change.

      migratedCount++;
    }

    return {
      success: true,
      totalLists: lists.length,
      migratedCount,
      skippedCount,
    };
  },
});

/**
 * Check migration status: returns lists that haven't been migrated yet.
 * Checks if owner exists in collaborators table for each list.
 */
export const checkMigrationStatus = mutation({
  handler: async (ctx) => {
    const lists = await ctx.db.query("lists").collect();
    const notMigrated: string[] = [];

    for (const list of lists) {
      const existingOwner = await ctx.db
        .query("collaborators")
        .withIndex("by_list_user", (q) =>
          q.eq("listId", list._id).eq("userDid", list.ownerDid)
        )
        .first();

      if (!existingOwner) {
        notMigrated.push(list._id);
      }
    }

    return {
      totalLists: lists.length,
      migratedCount: lists.length - notMigrated.length,
      notMigratedCount: notMigrated.length,
      notMigratedIds: notMigrated,
    };
  },
});
