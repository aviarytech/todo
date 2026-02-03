import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useCurrentUser } from "./useCurrentUser";
import type { Role } from "../lib/permissions";

export interface Collaborator {
  _id: Id<"collaborators">;
  listId: Id<"lists">;
  userDid: string;
  role: Role;
  joinedAt: number;
  invitedByDid?: string;
  displayName: string;
  email?: string;
}

/**
 * Hook for managing collaborators on a list (Phase 3).
 */
export function useCollaborators(listId: Id<"lists">) {
  const { did, legacyDid } = useCurrentUser();

  // Get all collaborators for the list
  const collaborators = useQuery(
    api.collaborators.getListCollaborators,
    { listId }
  ) as Collaborator[] | undefined;

  // Get current user's role on this list
  const userRole = useQuery(
    api.collaborators.getUserRole,
    did
      ? {
          listId,
          userDid: did,
          legacyDid: legacyDid ?? undefined,
        }
      : "skip"
  ) as Role | null | undefined;

  // Mutations
  const updateRoleMutation = useMutation(api.collaborators.updateCollaboratorRole);
  const removeCollaboratorMutation = useMutation(api.collaborators.removeCollaborator);

  const updateRole = async (collaboratorDid: string, newRole: "editor" | "viewer") => {
    if (!did) {
      throw new Error("Not authenticated");
    }

    await updateRoleMutation({
      listId,
      collaboratorDid,
      newRole,
      requesterDid: did,
      legacyDid: legacyDid ?? undefined,
    });
  };

  const removeCollaborator = async (collaboratorDid: string) => {
    if (!did) {
      throw new Error("Not authenticated");
    }

    await removeCollaboratorMutation({
      listId,
      collaboratorDid,
      requesterDid: did,
      legacyDid: legacyDid ?? undefined,
    });
  };

  const leaveList = async () => {
    if (!did) {
      throw new Error("Not authenticated");
    }

    // Use the DID that matches the collaboration
    // (could be current DID or legacy DID)
    const foundCollab = collaborators?.find(
      (c) => c.userDid === did || c.userDid === legacyDid
    )?.userDid;

    if (!foundCollab) {
      throw new Error("Not a collaborator on this list");
    }

    await removeCollaboratorMutation({
      listId,
      collaboratorDid: foundCollab,
      requesterDid: did,
      legacyDid: legacyDid ?? undefined,
    });
  };

  return {
    collaborators,
    userRole,
    isLoading: collaborators === undefined || userRole === undefined,
    updateRole,
    removeCollaborator,
    leaveList,
  };
}
