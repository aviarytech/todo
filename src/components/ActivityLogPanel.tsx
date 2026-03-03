import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Panel } from "./ui/Panel";

function shortDid(did: string) {
  return `${did.slice(0, 8)}…`;
}

function formatRelativeTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function parseMetadata(metadata?: string) {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function ActivityLogPanel({
  listId,
  userDid,
  onClose,
}: {
  listId: Id<"lists">;
  userDid: string;
  onClose: () => void;
}) {
  const events = useQuery(api.missionControlCore.listActivityEvents, { listId, userDid, limit: 100 });
  const items = useQuery(api.items.getListItems, { listId });

  const actorDids = useMemo(() => {
    if (!events) return [] as string[];
    return Array.from(new Set(events.map((e) => e.actorDid))) as string[];
  }, [events]);

  const users = useQuery(api.users.getUsersByDids, actorDids.length ? { dids: actorDids } : "skip");

  const itemById = useMemo(() => {
    const map = new Map<string, string>();
    (items ?? []).forEach((item) => map.set(item._id, item.name));
    return map;
  }, [items]);

  return (
    <Panel
      isOpen={true}
      onClose={onClose}
      ariaLabelledBy="activity-log-title"
      header={
        <>
          <h2 id="activity-log-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">Activity Log</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
            aria-label="Close activity log"
          >
            ✕
          </button>
        </>
      }
    >
      <div className="p-4 space-y-2">
        {events === undefined ? (
          <div className="text-sm text-gray-500">Loading activity…</div>
        ) : events.length === 0 ? (
          <div className="text-sm text-gray-500">No activity yet.</div>
        ) : (
          events.map((event) => {
            const actor = users?.[event.actorDid]?.displayName ?? shortDid(event.actorDid);
            const itemName = event.itemId ? itemById.get(event.itemId) ?? "(item)" : "(list)";
            const metadata = parseMetadata(event.metadata);
            const preview = typeof metadata?.textPreview === "string" ? metadata.textPreview : null;

            let actionText = "updated the list";
            if (event.eventType === "created") actionText = `created “${itemName}”`;
            if (event.eventType === "completed") actionText = `completed “${itemName}”`;
            if (event.eventType === "assigned") {
              const assignee = event.assigneeDid ? (event.assigneeDid === userDid ? "You" : shortDid(event.assigneeDid)) : "Unassigned";
              actionText = `assigned “${itemName}” to ${assignee}`;
            }
            if (event.eventType === "commented") actionText = `commented on “${itemName}”`;
            if (event.eventType === "edited") actionText = `edited “${itemName}”`;

            return (
              <div key={event._id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-900">
                <div className="text-sm text-gray-800 dark:text-gray-100">
                  <span className="font-medium">{actor}</span> {actionText}
                </div>
                {preview && <div className="text-xs text-gray-500 mt-0.5">“{preview}”</div>}
                <div className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(event.createdAt)}</div>
              </div>
            );
          })
        )}
      </div>
    </Panel>
  );
}
