/**
 * Placeholder Convex data model types.
 * These will be replaced by actual generated types when `npx convex dev` is run.
 */

import type { GenericId } from "convex/values";

// Table document types based on schema.ts
export type Doc<TableName extends keyof DataModel> = DataModel[TableName]["document"];
export type Id<TableName extends keyof DataModel> = DataModel[TableName]["_id"];

interface DataModel {
  users: {
    _id: GenericId<"users">;
    document: {
      _id: GenericId<"users">;
      _creationTime: number;
      did: string;
      displayName: string;
      createdAt: number;
    };
  };
  lists: {
    _id: GenericId<"lists">;
    document: {
      _id: GenericId<"lists">;
      _creationTime: number;
      assetDid: string;
      name: string;
      ownerDid: string;
      collaboratorDid?: string;
      createdAt: number;
    };
  };
  items: {
    _id: GenericId<"items">;
    document: {
      _id: GenericId<"items">;
      _creationTime: number;
      listId: GenericId<"lists">;
      name: string;
      checked: boolean;
      createdByDid: string;
      checkedByDid?: string;
      createdAt: number;
      checkedAt?: number;
    };
  };
  invites: {
    _id: GenericId<"invites">;
    document: {
      _id: GenericId<"invites">;
      _creationTime: number;
      listId: GenericId<"lists">;
      token: string;
      createdAt: number;
      expiresAt: number;
      usedAt?: number;
      usedByDid?: string;
    };
  };
}
