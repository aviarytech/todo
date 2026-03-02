import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useToast } from "../hooks/useToast";

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
  const { addToast } = useToast();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [runStatus, setRunStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const teamApi = (api as any).agentTeam;
  const missionApi = (api as any).missionControlCore;
  const summary = useQuery(teamApi.getTeamSummary, did ? { ownerDid: did, includeArchived } : "skip");
  const agents = useQuery(teamApi.listTeamAgents, did ? { ownerDid: did, includeArchived } : "skip");
  const tree = useQuery(teamApi.getTeamTree, did ? { ownerDid: did, includeArchived } : "skip") as TeamNode[] | undefined;
  const runHealth = useQuery(teamApi.getRunHealth, did ? { ownerDid: did, includeArchived } : "skip") as any;

  const missionRunsResult = useQuery(
    missionApi.listMissionRuns,
    did
      ? {
          ownerDid: did,
          status: runStatus || undefined,
          startDate: startDate ? new Date(`${startDate}T00:00:00`).getTime() : undefined,
          endDate: endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : undefined,
          page,
          limit: 10,
        }
      : "skip"
  ) as any;

  const updateMissionRun = useMutation(missionApi.updateMissionRun);
  const deleteMissionRun = useMutation(missionApi.deleteMissionRun);

  const runs = useMemo(() => missionRunsResult?.runs ?? [], [missionRunsResult]);
  const pagination = missionRunsResult?.pagination;

  const onClearDates = () => {
    setStartDate("");
    setEndDate("");
    setPage(1);
    addToast("Cleared run date filters");
  };

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

      <section className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-end gap-2 md:gap-3">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 md:mr-auto">Mission runs</h2>
          <select className="border rounded-lg px-2 py-1 text-sm" value={runStatus} onChange={(e) => { setRunStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="starting">starting</option>
            <option value="running">running</option>
            <option value="degraded">degraded</option>
            <option value="blocked">blocked</option>
            <option value="failed">failed</option>
            <option value="finished">finished</option>
          </select>
          <input className="border rounded-lg px-2 py-1 text-sm" type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
          <input className="border rounded-lg px-2 py-1 text-sm" type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
          <button className="text-xs px-2 py-1 rounded-lg border" onClick={onClearDates}>Clear</button>
        </div>

        {runs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 dark:border-stone-700 bg-white/70 dark:bg-stone-900/30 p-6 text-sm text-stone-500">
            No mission runs found for this filter. Try widening the date range.
          </div>
        ) : (
          <div className="space-y-2">
            {runs.map((run: any) => (
              <div key={run._id} className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-3">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold">{run.agentSlug}</span>
                  <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-700">{run.status}</span>
                  <span className="text-stone-500">Attempt {run.attempt ?? 1}</span>
                  <span className="text-stone-500">{new Date(run.createdAt).toLocaleString()}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    className="text-xs px-2 py-1 rounded border"
                    onClick={async () => {
                      if (!did) return;
                      try {
                        await updateMissionRun({ runId: run._id, ownerDid: did, costEstimate: (run.costEstimate ?? 0) + 1 });
                        addToast("Run updated");
                      } catch (err) {
                        addToast(err instanceof Error ? err.message : "Failed to update run", "error");
                      }
                    }}
                  >
                    Edit cost +1
                  </button>
                  <button
                    className="text-xs px-2 py-1 rounded border border-red-300 text-red-700"
                    onClick={async () => {
                      if (!confirm("Delete this mission run?")) return;
                      if (!did) return;
                      try {
                        await deleteMissionRun({ runId: run._id, ownerDid: did });
                        addToast("Run deleted");
                      } catch (err) {
                        addToast(err instanceof Error ? err.message : "Failed to delete run", "error");
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm pt-1">
              <div className="text-stone-500">Page {pagination?.page ?? 1} of {pagination?.totalPages ?? 1}</div>
              <div className="flex gap-2">
                <button className="px-2 py-1 rounded border disabled:opacity-40" disabled={!pagination?.hasPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                <button className="px-2 py-1 rounded border disabled:opacity-40" disabled={!pagination?.hasNext} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
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
