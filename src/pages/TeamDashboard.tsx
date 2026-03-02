import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useAuth } from "../hooks/useAuth";

type TeamNode = {
  _id: string;
  agentSlug: string;
  displayName: string;
  status?: "idle" | "working" | "error";
  currentTask?: string;
  children: TeamNode[];
};

type MissionRun = {
  _id: string;
  agentSlug: string;
  status: "starting" | "running" | "degraded" | "blocked" | "failed" | "finished";
  terminalReason?: "completed" | "killed" | "timeout" | "error" | "escalated";
  updatedAt: number;
};

const statusDot = (status?: "idle" | "working" | "error") =>
  status === "working" ? "🟢" : status === "error" ? "🔴" : "⚪️";

function getConvexHttpUrl(): string {
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
  if (convexUrl.includes("127.0.0.1") || convexUrl.includes("localhost")) {
    return convexUrl.replace(":3210", ":3211");
  }
  return convexUrl.replace(".convex.cloud", ".convex.site");
}

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
  const { token } = useAuth();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [runs, setRuns] = useState<MissionRun[]>([]);
  const [controlBusy, setControlBusy] = useState<string | null>(null);
  const [runtimeMessage, setRuntimeMessage] = useState<string | null>(null);

  const teamApi = (api as any).agentTeam;
  const summary = useQuery(teamApi.getTeamSummary, did ? { ownerDid: did, includeArchived } : "skip");
  const agents = useQuery(teamApi.listTeamAgents, did ? { ownerDid: did, includeArchived } : "skip");
  const tree = useQuery(teamApi.getTeamTree, did ? { ownerDid: did, includeArchived } : "skip") as TeamNode[] | undefined;
  const runHealth = useQuery(teamApi.getRunHealth, did ? { ownerDid: did, includeArchived } : "skip") as any;

  const fetchRuns = useCallback(async () => {
    if (!token) return;
    const response = await fetch(`${getConvexHttpUrl()}/api/v1/runs?limit=25`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to load runtime runs");
    const payload = await response.json() as { runs?: MissionRun[] };
    setRuns(payload.runs ?? []);
  }, [token]);

  useEffect(() => {
    fetchRuns().catch((err) => setRuntimeMessage(err instanceof Error ? err.message : "Failed to load runs"));
  }, [fetchRuns]);

  const activeRuns = useMemo(() => runs.filter((run) => run.status !== "finished" && run.status !== "failed"), [runs]);

  const runtimeControl = useCallback(async (runId: string, action: "pause" | "kill" | "escalate" | "reassign") => {
    if (!token) return;
    const body: Record<string, string> = {};
    if (action === "reassign" || action === "escalate") {
      const targetAgentSlug = window.prompt(`${action}: target agent slug`);
      if (!targetAgentSlug) return;
      body.targetAgentSlug = targetAgentSlug;
    }

    setControlBusy(`${runId}:${action}`);
    setRuntimeMessage(null);
    try {
      const response = await fetch(`${getConvexHttpUrl()}/api/v1/runs/${runId}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((payload as any)?.error ?? `${action} failed`);
      setRuntimeMessage(`${action} succeeded for ${runId.slice(0, 8)}…`);
      await fetchRuns();
    } catch (err) {
      setRuntimeMessage(err instanceof Error ? err.message : `${action} failed`);
    } finally {
      setControlBusy(null);
    }
  }, [fetchRuns, token]);

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
        {runtimeMessage ? <div className="text-xs text-amber-700 dark:text-amber-400">{runtimeMessage}</div> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Live runtime controls</h2>
        {activeRuns.length === 0 ? <div className="text-sm text-stone-500">No active mission runs.</div> : (
          <div className="space-y-2">
            {activeRuns.map((run) => (
              <div key={run._id} className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-3 flex items-center justify-between gap-3">
                <div className="text-sm text-stone-700 dark:text-stone-300">
                  <div className="font-medium">{run.agentSlug} · {run.status}</div>
                  <div className="text-xs text-stone-500">run {run._id.slice(0, 10)}…</div>
                </div>
                <div className="flex gap-2">
                  {(["pause", "kill", "escalate", "reassign"] as const).map((action) => (
                    <button
                      key={action}
                      onClick={() => runtimeControl(run._id, action)}
                      disabled={controlBusy !== null}
                      className="text-xs px-2 py-1 rounded border border-stone-300 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-700 disabled:opacity-50"
                    >
                      {controlBusy === `${run._id}:${action}` ? "…" : action}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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
