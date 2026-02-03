/**
 * Component showing all collaborators on a list with management options.
 * Phase 3: Unlimited collaborators with roles.
 */

import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCollaborators, type Collaborator } from "../../hooks/useCollaborators";
import {
  canManageCollaborators,
  getRoleDisplayName,
  type Role,
} from "../../lib/permissions";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { ConfirmDialog } from "../ConfirmDialog";

interface CollaboratorListProps {
  listId: Id<"lists">;
  onLeave?: () => void; // Called when user leaves the list
}

export function CollaboratorList({ listId, onLeave }: CollaboratorListProps) {
  const { did, legacyDid } = useCurrentUser();
  const { collaborators, userRole, isLoading, updateRole, removeCollaborator, leaveList } =
    useCollaborators(listId);

  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Confirmation dialog state
  const [confirmRemove, setConfirmRemove] = useState<Collaborator | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const canManage = canManageCollaborators(userRole);

  const handleRoleChange = async (collaborator: Collaborator, newRole: "editor" | "viewer") => {
    setChangingRole(collaborator.userDid);
    setError(null);
    try {
      await updateRole(collaborator.userDid, newRole);
    } catch (err) {
      console.error("Failed to change role:", err);
      setError("Failed to change role");
    } finally {
      setChangingRole(null);
    }
  };

  const handleRemove = (collaborator: Collaborator) => {
    setConfirmRemove(collaborator);
  };

  const handleConfirmRemove = async () => {
    if (!confirmRemove) return;

    setRemoving(confirmRemove.userDid);
    setError(null);
    try {
      await removeCollaborator(confirmRemove.userDid);
      setConfirmRemove(null);
    } catch (err) {
      console.error("Failed to remove collaborator:", err);
      setError("Failed to remove collaborator");
      throw err; // Re-throw so ConfirmDialog shows error
    } finally {
      setRemoving(null);
    }
  };

  const handleLeave = () => {
    setConfirmLeave(true);
  };

  const handleConfirmLeave = async () => {
    setError(null);
    try {
      await leaveList();
      setConfirmLeave(false);
      onLeave?.();
    } catch (err) {
      console.error("Failed to leave list:", err);
      setError("Failed to leave list");
      throw err; // Re-throw so ConfirmDialog shows error
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">Loading collaborators...</div>
    );
  }

  if (!collaborators || collaborators.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">No collaborators</div>
    );
  }

  const isCurrentUser = (collab: Collaborator) =>
    collab.userDid === did || collab.userDid === legacyDid;

  return (
    <>
      <div className="space-y-2">
        {error && (
          <div className="p-2 bg-red-50 text-red-600 text-sm rounded-md mb-2">
            {error}
          </div>
        )}

      {collaborators.map((collab) => (
        <div
          key={collab._id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
        >
          <div className="flex items-center gap-3">
            {/* Avatar placeholder */}
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm">
              {collab.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-gray-900">
                {collab.displayName}
                {isCurrentUser(collab) && (
                  <span className="ml-1 text-gray-500 text-sm">(you)</span>
                )}
              </div>
              {collab.email && (
                <div className="text-xs text-gray-500">{collab.email}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Role badge/selector */}
            {collab.role === "owner" ? (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                {getRoleDisplayName(collab.role)}
              </span>
            ) : canManage && !isCurrentUser(collab) ? (
              <RoleSelector
                value={collab.role}
                onChange={(role) => handleRoleChange(collab, role)}
                disabled={changingRole === collab.userDid}
              />
            ) : (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                {getRoleDisplayName(collab.role)}
              </span>
            )}

            {/* Remove button (owner can remove non-owners) */}
            {canManage && collab.role !== "owner" && !isCurrentUser(collab) && (
              <button
                onClick={() => handleRemove(collab)}
                disabled={removing === collab.userDid}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                title="Remove from list"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}

            {/* Leave button (non-owners can leave) */}
            {isCurrentUser(collab) && collab.role !== "owner" && (
              <button
                onClick={handleLeave}
                className="px-2 py-1 text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Leave
              </button>
            )}
          </div>
        </div>
      ))}
      </div>

      {/* Remove collaborator confirmation dialog */}
      {confirmRemove && (
        <ConfirmDialog
          title="Remove Collaborator"
          message={`Remove ${confirmRemove.displayName} from this list? They will no longer have access.`}
          confirmLabel={removing ? "Removing..." : "Remove"}
          confirmVariant="danger"
          onConfirm={handleConfirmRemove}
          onCancel={() => setConfirmRemove(null)}
        />
      )}

      {/* Leave list confirmation dialog */}
      {confirmLeave && (
        <ConfirmDialog
          title="Leave List"
          message="Are you sure you want to leave this list? You will no longer have access unless invited again."
          confirmLabel="Leave"
          confirmVariant="danger"
          onConfirm={handleConfirmLeave}
          onCancel={() => setConfirmLeave(false)}
        />
      )}
    </>
  );
}

interface RoleSelectorProps {
  value: Role;
  onChange: (role: "editor" | "viewer") => void;
  disabled?: boolean;
}

function RoleSelector({ value, onChange, disabled }: RoleSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as "editor" | "viewer")}
      disabled={disabled}
      className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-700 disabled:opacity-50"
    >
      <option value="editor">Editor</option>
      <option value="viewer">Viewer</option>
    </select>
  );
}
