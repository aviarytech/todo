import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCurrentUser } from "../hooks/useCurrentUser";

const anyApi = api as any;

export function Memory() {
  const { did } = useCurrentUser();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [source, setSource] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const createMemory = useMutation(anyApi.memories.createMemory);
  const data = useQuery(anyApi.memories.listMemories, did ? { ownerDid: did, query: q || undefined, tag: tag || undefined, source: source || undefined, syncStatus: syncStatus || undefined } : "skip");

  return <div className="space-y-4">
    <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Memory</h1>
    {(data?.conflictCount ?? 0) > 0 && <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">OpenClaw sync has <strong>{data?.conflictCount}</strong> conflict{data?.conflictCount === 1 ? "" : "s"}.</div>}
    <div className="grid md:grid-cols-4 gap-2">
      <input className="border rounded-xl px-3 py-2" placeholder="Search" value={q} onChange={(e)=>setQ(e.target.value)} />
      <input className="border rounded-xl px-3 py-2" placeholder="Tag" value={tag} onChange={(e)=>setTag(e.target.value)} />
      <select className="border rounded-xl px-3 py-2" value={source} onChange={(e)=>setSource(e.target.value)}><option value="">All sources</option><option>manual</option><option>openclaw</option><option>clawboot</option><option>import</option><option>api</option></select>
      <select className="border rounded-xl px-3 py-2" value={syncStatus} onChange={(e)=>setSyncStatus(e.target.value)}><option value="">All sync states</option><option value="synced">synced</option><option value="conflict">conflict</option><option value="pending">pending</option></select>
    </div>
    <div className="border rounded-2xl p-3 space-y-2">
      <input className="border rounded-xl px-3 py-2 w-full" placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} />
      <textarea className="border rounded-xl px-3 py-2 w-full" rows={3} placeholder="Content" value={content} onChange={(e)=>setContent(e.target.value)} />
      <button className="px-4 py-2 rounded-xl bg-amber-500 text-white" onClick={() => did && createMemory({ ownerDid: did, authorDid: did, title, content, source: "manual" })}>Save</button>
    </div>
    <div className="space-y-2">{(data?.memories ?? []).map((m: any) => <div key={m._id} className="border rounded-2xl p-3"><div className="flex items-center justify-between gap-2"><div className="font-semibold">{m.title}</div>{m.syncStatus && <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">{m.syncStatus}</span>}</div><div className="text-sm whitespace-pre-wrap">{m.content}</div>{m.conflictNote && <div className="text-xs text-amber-700 mt-1">{m.conflictNote}</div>}</div>)}</div>
  </div>;
}
