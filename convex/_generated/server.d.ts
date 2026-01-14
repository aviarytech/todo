/* prettier-ignore-start */

/* eslint-disable */
/**
 * Generated server utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev` or `npx convex codegen`.
 * @module
 */

import type { FunctionReference } from "convex/server";
import type { QueryBuilder, MutationBuilder, ActionBuilder, HttpActionBuilder } from "convex/server";

/**
 * A utility for referencing Convex server functions.
 *
 * Usage:
 * ```js
 * const myServerFunction = server.myModule.myFunction;
 * ```
 */
declare const fullServer: Record<string, Record<string, FunctionReference>>;
export type Server = typeof fullServer;

export const server: Server;

// Export query, mutation, action, httpAction helpers
export declare function query<Args extends Record<string, any>, Output>(
  queryDefinition: {
    handler: (ctx: { auth: { getSessionId: () => Promise<string | null>; getToken: () => Promise<string | null> } }, args: Args) => Promise<Output>;
  }
): QueryBuilder<Args, Output, "public">;

export declare function mutation<Args extends Record<string, any>, Output>(
  mutationDefinition: {
    handler: (ctx: { auth: { getSessionId: () => Promise<string | null>; getToken: () => Promise<string | null> } }, args: Args) => Promise<Output>;
  }
): MutationBuilder<Args, Output, "public">;

export declare function action<Args extends Record<string, any>, Output>(
  actionDefinition: {
    handler: (ctx: { auth: { getSessionId: () => Promise<string | null>; getToken: () => Promise<string | null> } }, args: Args) => Promise<Output>;
  }
): ActionBuilder<Args, Output, "public">;

export declare function httpAction(
  handler: (ctx: { auth: { getSessionId: () => Promise<string | null>; getToken: () => Promise<string | null> } }, request: Request) => Promise<Response>
): HttpActionBuilder;

export declare function getAuthToken(ctx: { auth: { getToken: () => Promise<string | null> } }): Promise<string | null>;
/* prettier-ignore-end */
