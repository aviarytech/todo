/**
 * Modal for publishing a list to did:webvh.
 *
 * Phase 4: Allows list owners to publish their lists publicly.
 * Published lists are verifiable and can be viewed by anyone.
 */

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { getPublicListUrl } from "../../lib/publication";

interface PublishModalProps {
  list: Doc<"lists">;
  onClose: () => void;
}

const PUBLICATION_DOMAIN = "lisa.aviary.tech";

export function PublishModal({ list, onClose }: PublishModalProps) {
  const { did, createWebvhDID } = useCurrentUser();
  const publishListMutation = useMutation(api.publication.publishList);
  const unpublishListMutation = useMutation(api.publication.unpublishList);
  const publicationStatus = useQuery(api.publication.getPublicationStatus, {
    listId: list._id,
  });
  const dialogRef = useFocusTrap<HTMLDivElement>({ onEscape: onClose });

  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPublished = publicationStatus?.status === "active";
  const publicUrl = isPublished
    ? getPublicListUrl(publicationStatus.webvhDid)
    : null;

  const handlePublish = async () => {
    if (!did) {
      setError("You must be logged in to publish a list");
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      // Create the slug from list ID (alphanumeric only)
      const slug = `list-${list._id.replace(/[^a-zA-Z0-9-]/g, "")}`;

      // Create did:webvh using Turnkey
      console.log("[PublishModal] Creating did:webvh for list:", list._id);
      const result = await createWebvhDID(PUBLICATION_DOMAIN, slug);

      if (!result) {
        throw new Error("Failed to create DID - missing authentication data");
      }

      console.log("[PublishModal] Created DID:", result.did);

      // Record publication in Convex
      await publishListMutation({
        listId: list._id,
        webvhDid: result.did,
        didDocument: JSON.stringify(result.didDocument),
        didLog: JSON.stringify(result.didLog),
        publisherDid: did,
      });

      console.log("[PublishModal] Publication recorded in Convex");
    } catch (err) {
      console.error("[PublishModal] Failed to publish:", err);
      setError(
        err instanceof Error ? err.message : "Failed to publish list"
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!did) {
      setError("You must be logged in to unpublish a list");
      return;
    }

    setIsUnpublishing(true);
    setError(null);

    try {
      await unpublishListMutation({
        listId: list._id,
        userDid: did,
      });
      console.log("[PublishModal] List unpublished");
    } catch (err) {
      console.error("[PublishModal] Failed to unpublish:", err);
      setError(
        err instanceof Error ? err.message : "Failed to unpublish list"
      );
    } finally {
      setIsUnpublishing(false);
    }
  };

  const handleCopy = async () => {
    if (!publicUrl) return;

    try {
      await navigator.clipboard.writeText(publicUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Loading state while fetching publication status
  if (publicationStatus === undefined) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Loading publication status"
          className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        >
          <div className="text-center text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-dialog-title"
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
      >
        <h2 id="publish-dialog-title" className="text-xl font-bold text-gray-900 mb-2">
          {isPublished ? "Published List" : "Publish List"}
        </h2>

        {isPublished ? (
          <>
            <div className="mb-4 p-3 bg-green-50 rounded-md">
              <div className="flex items-center gap-2 text-green-800">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="font-medium">This list is published</span>
              </div>
              <p className="mt-1 text-sm text-green-700">
                Anyone with the link can view this list.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Public URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={publicUrl ?? ""}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
                >
                  {isCopied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                <span className="font-medium">DID:</span>{" "}
                <span className="font-mono text-xs break-all">
                  {publicationStatus.webvhDid}
                </span>
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 rounded-md text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={handleUnpublish}
                disabled={isUnpublishing}
                className={`px-4 py-2 text-red-600 bg-red-50 rounded-md font-medium hover:bg-red-100 ${
                  isUnpublishing ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isUnpublishing ? "Unpublishing..." : "Unpublish"}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md font-medium hover:bg-gray-200"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-600 mb-4">
              Publishing makes this list publicly viewable. Anyone with the link
              can see the list contents and verify who added each item.
            </p>

            <div className="mb-4 p-3 bg-amber-50 rounded-md">
              <div className="flex items-start gap-2 text-amber-800">
                <svg
                  className="w-5 h-5 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <p className="font-medium">Before you publish</p>
                  <ul className="mt-1 text-sm list-disc list-inside">
                    <li>All items will be publicly visible</li>
                    <li>Contributor names will be shown</li>
                    <li>The list URL will be shareable</li>
                  </ul>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 rounded-md text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 ${
                  isPublishing ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isPublishing ? "Publishing..." : "Publish List"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
