import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export type ActivityEventType = "created" | "completed" | "uncompleted" | "assigned" | "commented" | "edited";

export async function insertActivityEvent(
  ctx: MutationCtx,
  args: {
    listId: Id<"lists">;
    itemId?: Id<"items">;
    eventType: ActivityEventType;
    actorDid: string;
    assigneeDid?: string;
    metadata?: Record<string, unknown>;
    createdAt?: number;
  }
) {
  const createdAt = args.createdAt ?? Date.now();

  await ctx.db.insert("activityEvents", {
    listId: args.listId,
    itemId: args.itemId,
    eventType: args.eventType,
    actorDid: args.actorDid,
    assigneeDid: args.assigneeDid,
    metadata: args.metadata ? JSON.stringify(args.metadata) : undefined,
    createdAt,
  });
}
