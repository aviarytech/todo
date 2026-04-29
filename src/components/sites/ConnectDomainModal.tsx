import { useState, type FormEvent } from "react";

interface ConnectDomainModalProps {
  hostname: string;
  onClose: () => void;
}

export function ConnectDomainModal({ hostname, onClose }: ConnectDomainModalProps) {
  const [domain, setDomain] = useState("");
  const cnameTarget =
    (import.meta.env.VITE_CUSTOM_DOMAIN_CNAME_TARGET as string | undefined) ||
    "sites.boop.ad";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-stone-200 dark:border-gray-800 overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-stone-100 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              Connect a domain you own
            </h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Your boop link stays around, even after your domain is connected.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-gray-800 dark:hover:text-stone-200"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label htmlFor="site-domain" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
              Domain
            </label>
            <input
              id="site-domain"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="www.forexample.com"
              className="w-full rounded-xl border-2 border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-950 px-4 py-3 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="rounded-xl bg-stone-50 dark:bg-gray-950 border border-stone-200 dark:border-gray-800 p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                DNS instructions
              </p>
              <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
                Add a CNAME record pointing your domain to:
              </p>
            </div>
            <code className="block rounded-lg bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 break-all">
              {cnameTarget}
            </code>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Apex domains are fussy on some Cloudflare plans. Start with <code>www</code>; set up an apex redirect after that.
            </p>
          </div>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-200">
            Cloudflare for SaaS is not configured in this repo yet. The next step is to wire the Custom Hostnames API, then boop can poll DNS and move this site from <strong>{hostname}</strong> to your domain without changing its identity.
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-stone-100 dark:bg-gray-800 px-4 py-3 text-sm font-semibold text-stone-700 dark:text-stone-200"
            >
              Not now
            </button>
            <button
              type="submit"
              disabled
              className="flex-1 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white opacity-60"
            >
              Waiting on setup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
