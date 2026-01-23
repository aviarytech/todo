/**
 * Modal for sharing a list via invite link.
 * Updated for Phase 3: supports role-based invites.
 */

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { getRoleDescription } from "../lib/permissions";

interface ShareModalProps {
  list: Doc<"lists">;
  onClose: () => void;
}

type InviteRole = "editor" | "viewer";

export function ShareModal({ list, onClose }: ShareModalProps) {
  const createInvite = useMutation(api.invites.createInvite);

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
    setSelectedRole(role);
    // Generate new invite with selected role
    generateInvite(role);
  };

  const handleCopy = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Share "{list.name}"
        </h2>
        <p className="text-gray-600 mb-4">
          Send this link to invite someone to the list.
        </p>

        {/* Role selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invite as
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => handleRoleChange("editor")}
              disabled={isCreating}
              className={`flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                selectedRole === "editor"
                  ? "bg-blue-50 border-blue-600 text-blue-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              } ${isCreating ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Editor
            </button>
            <button
              onClick={() => handleRoleChange("viewer")}
              disabled={isCreating}
              className={`flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                selectedRole === "viewer"
                  ? "bg-blue-50 border-blue-600 text-blue-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              } ${isCreating ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Viewer
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {getRoleDescription(selectedRole)}
          </p>
        </div>

        {isCreating && (
          <div className="mb-4 p-3 bg-gray-100 rounded-md text-center text-gray-500">
            Creating invite link...
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 rounded-md text-red-600 text-sm">
            {error}
          </div>
        )}

        {inviteLink && !isCreating && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invite link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteLink}
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

            <p className="text-xs text-gray-500 mb-4">
              This link expires in 24 hours and can only be used once.
            </p>
          </>
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md font-medium hover:bg-gray-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
