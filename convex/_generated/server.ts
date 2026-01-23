/**
 * Placeholder Convex server types.
 * These will be replaced by actual generated types when `npx convex dev` is run.
 *
 * Run `npx convex dev --once --configure=new` to set up your Convex project.
 */

import {
  GenericMutationCtx,
  GenericQueryCtx,
  GenericDatabaseReader,
  GenericDatabaseWriter,
  FunctionReference,
  anyApi,
} from "convex/server";
import { GenericId } from "convex/values";
import schema from "../schema";

export type DataModel = {
  users: {
    _id: GenericId<"users">;
    _creationTime: number;
    did: string;
    displayName: string;
    createdAt: number;
  };
  lists: {
    _id: GenericId<"lists">;
    _creationTime: number;
    assetDid: string;
    name: string;
    ownerDid: string;
    collaboratorDid?: string;
    createdAt: number;
  };
  items: {
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
  invites: {
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

export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;
export type DatabaseReader = GenericDatabaseReader<DataModel>;
export type DatabaseWriter = GenericDatabaseWriter<DataModel>;

// Re-export query and mutation builders
export { query, mutation, internalQuery, internalMutation } from "convex/server";
