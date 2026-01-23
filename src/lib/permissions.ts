/**
 * Permission helpers for collaborator roles (Phase 3)
 */

export type Role = "owner" | "editor" | "viewer";

/**
 * Check if the role allows editing items (owner or editor).
 */
export function canEdit(role: Role | null | undefined): boolean {
  return role === "owner" || role === "editor";
}

/**
 * Check if the role allows managing collaborators (owner only).
 */
export function canManageCollaborators(role: Role | null | undefined): boolean {
  return role === "owner";
}

/**
 * Check if the role allows deleting the list (owner only).
 */
export function canDeleteList(role: Role | null | undefined): boolean {
  return role === "owner";
}

/**
 * Check if the role allows generating invite links (owner only).
 */
export function canInvite(role: Role | null | undefined): boolean {
  return role === "owner";
}

/**
 * Get a display-friendly role name.
 */
export function getRoleDisplayName(role: Role): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "editor":
      return "Editor";
    case "viewer":
      return "Viewer";
  }
}

/**
 * Get role description for UI tooltips.
 */
export function getRoleDescription(role: Role): string {
  switch (role) {
    case "owner":
      return "Full control: can edit items, invite others, and delete the list";
    case "editor":
      return "Can add, check, and remove items";
    case "viewer":
      return "Read-only access to the list";
  }
}
