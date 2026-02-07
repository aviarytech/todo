/**
 * Panel for sharing a list via invite link.
 * Uses Panel component for slide-up drawer experience.
 * Updated for Phase 3: supports role-based invites.
 */

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { getRoleDescription } from "../lib/permissions";
import { useSettings } from "../hooks/useSettings";
import { Panel } from "./ui/Panel";
import { ListProvenanceInfo } from "./ProvenanceInfo";

interface ShareModalProps {
  list: Doc<"lists">;
  onClose: () => void;
}

type InviteRole = "editor" | "viewer";

export function ShareModal({ list, onClose }: ShareModalProps) {
  const createInvite = useMutation(api.invites.createInvite);
  const { haptic } = useSettings();

  const [selectedRole, setSelectedRole] = useState<InviteRole>("editor");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInvite = async (role: InviteRole) => {
    setIsCreating(true);
    setError(null);
    setInviteLink(null);

    try {
      const token = crypto.randomUUID();
      await createInvite({
        listId: list._id,
        token,
        role,
        createdAt: Date.now(),
      });

      const link = `${window.location.origin}/join/${list._id}/${token}`;
      setInviteLink(link);
    } catch (err) {
      console.error("Failed to create invite:", err);
      setError("Failed to create invite. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    // Generate invite on modal open with default role
    generateInvite(selectedRole);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRoleChange = (role: InviteRole) => {
    haptic('light');
    setSelectedRole(role);
    // Generate new invite with selected role
    generateInvite(role);
  };

  const handleCopy = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      haptic('success');
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      haptic('error');
    }
  };

  const header = (
    <>
      <div>
        <h2 id="share-dialog-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">
          🔗 Share List
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
          {list.name}
        </p>
      </div>
      <button
        onClick={onClose}
        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Close"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </>
  );

  const footer = (
    <div className="px-5 py-4">
      <button
        onClick={onClose}
        className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors"
      >
        Done
      </button>
    </div>
  );

  return (
    <Panel
      isOpen={true}
      onClose={onClose}
      header={header}
      footer={footer}
      ariaLabelledBy="share-dialog-title"
    >
      {/* Content */}
      <div className="p-5 space-y-5">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Send this link to invite someone to collaborate on your list.
        </p>

        {/* Role selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Invite as
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => handleRoleChange("editor")}
              disabled={isCreating}
              className={`flex-1 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                selectedRole === "editor"
                  ? "bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-700 dark:text-amber-400"
                  : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              } ${isCreating ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span className="text-lg block mb-1">✏️</span>
              Editor
            </button>
            <button
              onClick={() => handleRoleChange("viewer")}
              disabled={isCreating}
              className={`flex-1 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                selectedRole === "viewer"
                  ? "bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-700 dark:text-amber-400"
                  : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              } ${isCreating ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span className="text-lg block mb-1">👁️</span>
              Viewer
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {getRoleDescription(selectedRole)}
          </p>
        </div>

        {isCreating && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl text-center">
            <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating invite link...
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {inviteLink && !isCreating && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Invite link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 px-4 py-3 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-3 rounded-xl font-medium transition-all ${
                  isCopied
                    ? "bg-green-500 text-white"
                    : "bg-amber-500 hover:bg-amber-600 text-white"
                }`}
              >
                {isCopied ? "✓" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This link expires in 24 hours and can only be used once.
            </p>
          </div>
        )}

        {/* Originals Provenance Info */}
        <ListProvenanceInfo list={list} />
      </div>
    </Panel>
  );
}
