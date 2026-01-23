import { mutation } from "../_generated/server";

/**
 * Migration: Move from single collaboratorDid on lists to collaborators table.
 *
 * For each existing list:
 * 1. Add owner to collaborators table with role "owner"
 * 2. Add collaboratorDid to collaborators table with role "editor" (if exists)
 *
 * Run this migration BEFORE removing collaboratorDid from the lists schema.
 * After migration, the collaboratorDid field can be removed from schema.
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

      // Add existing collaborator if any
      if (list.collaboratorDid) {
        // Check if collaborator already exists
        const existingCollab = await ctx.db
          .query("collaborators")
          .withIndex("by_list_user", (q) =>
            q.eq("listId", list._id).eq("userDid", list.collaboratorDid!)
          )
          .first();

        if (!existingCollab) {
          await ctx.db.insert("collaborators", {
            listId: list._id,
            userDid: list.collaboratorDid,
            role: "editor",
            joinedAt: Date.now(), // Unknown original join time
            invitedByDid: list.ownerDid,
          });
        }
      }

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
