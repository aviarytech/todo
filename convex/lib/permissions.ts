import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Check if a user can edit a list.
 * Owner can always edit. If the list has an active publication, anyone can edit.
 */
export async function canUserEditList(
  ctx: MutationCtx | QueryCtx,
  listId: Id<"lists">,
  userDid: string,
  legacyDid?: string
): Promise<boolean> {
  const list = await ctx.db.get(listId);
  if (!list) return false;

  const didsToCheck = [userDid, ...(legacyDid ? [legacyDid] : [])];
  if (didsToCheck.includes(list.ownerDid)) return true;

  const pub = await ctx.db
    .query("publications")
    .withIndex("by_list", (q) => q.eq("listId", listId))
    .first();

  return !!pub && pub.status === "active";
}
