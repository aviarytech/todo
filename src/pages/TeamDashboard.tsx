import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCurrentUser } from "../hooks/useCurrentUser";

type TeamNode = {
  _id: string;
  agentSlug: string;
  displayName: string;
  status?: "idle" | "working" | "error";
  currentTask?: string;
  children: TeamNode[];
};

const statusDot = (status?: "idle" | "working" | "error") =>
  status === "working" ? "🟢" : status === "error" ? "🔴" : "⚪️";

function TreeNode({ node, depth = 0 }: { node: TeamNode; depth?: number }) {
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-3" style={{ marginLeft: depth * 16 }}>
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold text-stone-900 dark:text-stone-100">{statusDot(node.status)} {node.displayName}</div>
          <div className="text-xs text-stone-500 dark:text-stone-400">{node.status ?? "idle"}</div>
        </div>
        {node.currentTask ? <div className="text-sm text-stone-600 dark:text-stone-300 mt-1">Task: {node.currentTask}</div> : null}
      </div>
      {node.children?.map((child) => <TreeNode key={child._id} node={child} depth={depth + 1} />)}
    </div>
  );
}

export function TeamDashboard() {
  const { did } = useCurrentUser();
  const [includeArchived, setIncludeArchived] = useState(false);

  const teamApi = (api as any).agentTeam;
  const summary = useQuery(teamApi.getTeamSummary, did ? { ownerDid: did, includeArchived } : "skip");
  const agents = useQuery(teamApi.listTeamAgents, did ? { ownerDid: did, includeArchived } : "skip");
  const tree = useQuery(teamApi.getTeamTree, did ? { ownerDid: did, includeArchived } : "skip") as TeamNode[] | undefined;
  const runHealth = useQuery(teamApi.getRunHealth, did ? { ownerDid: did, includeArchived } : "skip") as any;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Agent Team</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">Mission Control team & sub-agent view</p>
        </div>
        <Link to="/app" className="text-sm text-amber-700 dark:text-amber-400">← Back</Link>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
        <div className="text-sm text-stone-700 dark:text-stone-300">
          Total: <strong>{summary?.total ?? 0}</strong> · Working: <strong>{summary?.statusCounts?.working ?? 0}</strong> · Idle: <strong>{summary?.statusCounts?.idle ?? 0}</strong> · Error: <strong>{summary?.statusCounts?.error ?? 0}</strong>
        </div>
        <label className="text-sm flex items-center gap-2 text-stone-600 dark:text-stone-300">
          <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
          Show archived
        </label>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Run health</h2>
        <div className="grid md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-3 text-sm">Stale: <strong>{runHealth?.totals?.stale ?? 0}</strong></div>
          <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-3 text-sm">Critical: <strong>{runHealth?.totals?.critical ?? 0}</strong></div>
          <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-3 text-sm">Errored: <strong>{runHealth?.totals?.errored ?? 0}</strong></div>
          <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-3 text-sm">Stuck (&gt;15m): <strong>{runHealth?.totals?.stuckWorking ?? 0}</strong></div>
        </div>
        <div className="text-xs text-stone-500">Drill: docs/mission-control/phase1-production-readiness-drill.md</div>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        {(agents ?? []).map((agent: any) => (
          <div key={agent._id} className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-stone-900 dark:text-stone-100">{statusDot(agent.status)} {agent.displayName}</div>
              <div className="text-xs text-stone-500">{agent.status ?? "idle"}</div>
            </div>
            <div className="text-xs text-stone-500 mt-1">{agent.agentSlug}</div>
            <div className="text-sm text-stone-600 dark:text-stone-300 mt-2">{agent.currentTask ? `Task: ${agent.currentTask}` : "No active task"}</div>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Sub-agent tree</h2>
        {(tree ?? []).length === 0 ? (
          <div className="text-sm text-stone-500">No registered agents yet.</div>
        ) : (
          <div className="space-y-2">{(tree ?? []).map((node) => <TreeNode key={node._id} node={node} />)}</div>
        )}
      </section>
    </div>
  );
}
