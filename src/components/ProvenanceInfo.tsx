/**
 * ProvenanceInfo - Shows Originals DID/provenance information
 * 
 * Displays the backing Originals identity for lists and items:
 * - List DID (assetDid), owner DID, creation timestamp
 * - Item creator, creation/modification timestamps
 * 
 * Makes the decentralized identity backing visible to users.
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { useSettings } from "../hooks/useSettings";

interface ListProvenanceProps {
  list: Doc<"lists">;
}

interface ItemProvenanceProps {
  item: Doc<"items">;
}

/**
 * Truncate a DID for display, keeping prefix and tail
 */
function truncateDid(did: string, prefixLen = 16, tailLen = 6): string {
  if (did.length <= prefixLen + tailLen + 3) return did;
  return `${did.slice(0, prefixLen)}...${did.slice(-tailLen)}`;
}

/**
 * Format timestamp for display
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';
type HapticFn = (pattern?: HapticPattern) => void;

/**
 * Copy text to clipboard with haptic feedback
 */
async function copyToClipboard(text: string, haptic: HapticFn): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    haptic("success");
    return true;
  } catch {
    haptic("error");
    return false;
  }
}

/**
 * Individual DID row with copy functionality
 */
function DidRow({ 
  label, 
  did, 
  displayName,
  haptic 
}: { 
  label: string; 
  did: string;
  displayName?: string | null;
  haptic: HapticFn;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(did, haptic);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-start justify-between gap-2 py-2">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">
          {label}
        </div>
        <div className="flex items-center gap-2">
          {displayName && (
            <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">
              {displayName}
            </span>
          )}
          <code className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono break-all">
            {truncateDid(did)}
          </code>
        </div>
      </div>
      <button
        onClick={handleCopy}
        className={`flex-shrink-0 p-1.5 rounded transition-colors ${
          copied
            ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
            : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        }`}
        title={copied ? "Copied!" : "Copy full DID"}
      >
        {copied ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}

/**
 * Timestamp row
 */
function TimestampRow({ label, timestamp }: { label: string; timestamp: number }) {
  return (
    <div className="py-2">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">
        {label}
      </div>
      <div className="text-sm text-gray-700 dark:text-gray-200">
        {formatDate(timestamp)}
      </div>
    </div>
  );
}

/**
 * Collapsible wrapper for provenance info
 */
function ProvenanceSection({ 
  title, 
  children,
  defaultOpen = false 
}: { 
  title: string; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg 
            className="w-5 h-5 text-amber-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" 
            />
          </svg>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {title}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 py-2 divide-y divide-gray-100 dark:divide-gray-700/50">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Provenance info for a list - shows asset DID, owner, creation time
 */
export function ListProvenanceInfo({ list }: ListProvenanceProps) {
  const { haptic } = useSettings();
  
  // Look up the owner's display name
  const userInfo = useQuery(api.users.getUsersByDids, { 
    dids: [list.ownerDid] 
  });
  
  const ownerName = userInfo?.[list.ownerDid]?.displayName ?? null;

  return (
    <ProvenanceSection title="Originals Provenance">
      <DidRow 
        label="📋 List DID (Asset)" 
        did={list.assetDid} 
        haptic={haptic} 
      />
      <DidRow 
        label="👤 Created By" 
        did={list.ownerDid} 
        displayName={ownerName}
        haptic={haptic} 
      />
      <TimestampRow 
        label="📅 Created" 
        timestamp={list.createdAt} 
      />
      
      {/* Info footer */}
      <div className="py-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          This list is backed by a decentralized identifier (DID) through{" "}
          <a 
            href="https://originalsprotocol.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-amber-600 dark:text-amber-400 hover:underline"
          >
            Originals Protocol
          </a>
          , providing cryptographic proof of ownership and authenticity.
        </p>
      </div>
    </ProvenanceSection>
  );
}

/**
 * Provenance info for an item - shows creator, timestamps
 */
export function ItemProvenanceInfo({ item }: ItemProvenanceProps) {
  const { haptic } = useSettings();
  
  // Collect all DIDs we need to look up
  const didsToLookup = [item.createdByDid];
  if (item.checkedByDid && item.checkedByDid !== item.createdByDid) {
    didsToLookup.push(item.checkedByDid);
  }
  
  const userInfo = useQuery(api.users.getUsersByDids, { 
    dids: didsToLookup 
  });
  
  const creatorName = userInfo?.[item.createdByDid]?.displayName ?? null;
  const checkerName = item.checkedByDid 
    ? userInfo?.[item.checkedByDid]?.displayName ?? null 
    : null;

  return (
    <ProvenanceSection title="Originals Provenance">
      <DidRow 
        label="👤 Created By" 
        did={item.createdByDid}
        displayName={creatorName}
        haptic={haptic} 
      />
      <TimestampRow 
        label="📅 Created" 
        timestamp={item.createdAt} 
      />
      
      {item.updatedAt && item.updatedAt !== item.createdAt && (
        <TimestampRow 
          label="✏️ Last Modified" 
          timestamp={item.updatedAt} 
        />
      )}
      
      {item.checked && item.checkedByDid && item.checkedAt && (
        <>
          <DidRow 
            label="✅ Completed By" 
            did={item.checkedByDid}
            displayName={checkerName}
            haptic={haptic} 
          />
          <TimestampRow 
            label="✅ Completed" 
            timestamp={item.checkedAt} 
          />
        </>
      )}
      
      {/* Info footer */}
      <div className="py-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Item actions are attributed to decentralized identifiers (DIDs) for transparency and accountability.
        </p>
      </div>
    </ProvenanceSection>
  );
}
