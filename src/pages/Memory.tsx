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
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const createMemory = useMutation(anyApi.memories.createMemory);
  const data = useQuery(anyApi.memories.listMemories, did ? { ownerDid: did, query: q || undefined, tag: tag || undefined, source: source || undefined } : "skip");

  return <div className="space-y-4">
    <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Memory</h1>
    <div className="grid md:grid-cols-3 gap-2">
      <input className="border rounded-xl px-3 py-2" placeholder="Search" value={q} onChange={(e)=>setQ(e.target.value)} />
      <input className="border rounded-xl px-3 py-2" placeholder="Tag" value={tag} onChange={(e)=>setTag(e.target.value)} />
      <select className="border rounded-xl px-3 py-2" value={source} onChange={(e)=>setSource(e.target.value)}><option value="">All sources</option><option>manual</option><option>openclaw</option><option>clawboot</option><option>import</option><option>api</option></select>
    </div>
    <div className="border rounded-2xl p-3 space-y-2">
      <input className="border rounded-xl px-3 py-2 w-full" placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} />
      <textarea className="border rounded-xl px-3 py-2 w-full" rows={3} placeholder="Content" value={content} onChange={(e)=>setContent(e.target.value)} />
      <button className="px-4 py-2 rounded-xl bg-amber-500 text-white" onClick={() => did && createMemory({ ownerDid: did, authorDid: did, title, content, source: "manual" })}>Save</button>
    </div>
    <div className="space-y-2">{(data?.memories ?? []).map((m: any) => <div key={m._id} className="border rounded-2xl p-3"><div className="font-semibold">{m.title}</div><div className="text-sm whitespace-pre-wrap">{m.content}</div></div>)}</div>
  </div>;
}
