import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useToast } from "../hooks/useToast";
import { ConnectDomainModal } from "../components/sites/ConnectDomainModal";

export function SiteDetail() {
  const { siteId } = useParams();
  const { did } = useCurrentUser();
  const { addToast } = useToast();
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);

  const site = useQuery(
    api.sites.getSite,
    did && siteId ? { ownerDid: did, siteId: siteId as Id<"sites"> } : "skip"
  );

  const hostname = site?.primaryHostname?.hostname ?? "";
  const url = hostname ? `https://${hostname}` : "";
  const previewSrc = useMemo(() => {
    if (!site?.file?.content) return "";
    return `data:text/html;charset=utf-8,${encodeURIComponent(site.file.content)}`;
  }, [site?.file?.content]);

  const copyLink = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    addToast("Copied your link.");
  };

  if (site === undefined) {
    return <div className="h-32 animate-pulse rounded-2xl bg-stone-100 dark:bg-gray-900" />;
  }

  if (!site) {
    return (
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 p-6">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
          Could not find that site
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-28 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">
            Your link
          </h1>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-amber-600 dark:text-amber-400 font-semibold break-all"
          >
            {url}
          </a>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="rounded-xl bg-stone-100 dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-stone-700 dark:text-stone-200"
          >
            Copy
          </button>
          <button
            onClick={() => setShowDomainModal(true)}
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Connect a domain you own
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="border-b border-stone-100 dark:border-gray-800 px-4 py-3 text-sm font-semibold text-stone-700 dark:text-stone-200">
          Preview
        </div>
        <iframe
          title="Site preview"
          src={previewSrc}
          className="block h-[460px] w-full bg-white"
          sandbox=""
        />
      </div>

      <div className="rounded-2xl border border-stone-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <button
          type="button"
          onClick={() => setShowIdentity((value) => !value)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-stone-800 dark:text-stone-100"
        >
          <span>Your identity</span>
          <span>{showIdentity ? "Hide" : "Show"}</span>
        </button>
        {showIdentity && (
          <div className="border-t border-stone-100 dark:border-gray-800 p-4 text-sm text-stone-600 dark:text-stone-300 space-y-3">
            <p>
              This site has a portable identity. If you ever leave boop, your site keeps its identity and history.
            </p>
            <div className="rounded-xl bg-stone-50 dark:bg-gray-950 border border-stone-200 dark:border-gray-800 p-3 space-y-2">
              <div className="break-all"><strong>DID:</strong> {site.did}</div>
              <div className="break-all"><strong>SCID:</strong> {site.scid}</div>
              <div className="break-all"><strong>Public key:</strong> {site.publicKeyMultibase}</div>
            </div>
            <pre className="max-h-56 overflow-auto rounded-xl bg-stone-950 p-3 text-xs text-stone-100">
              {site.didLogJsonl}
            </pre>
          </div>
        )}
      </div>

      {showDomainModal && (
        <ConnectDomainModal hostname={hostname} onClose={() => setShowDomainModal(false)} />
      )}
    </div>
  );
}
