/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as authInternal from "../authInternal.js";
import type * as authSessions from "../authSessions.js";
import type * as categories from "../categories.js";
import type * as categoriesHttp from "../categoriesHttp.js";
import type * as collaborators from "../collaborators.js";
import type * as collaboratorsHttp from "../collaboratorsHttp.js";
import type * as didCreation from "../didCreation.js";
import type * as http from "../http.js";
import type * as invites from "../invites.js";
import type * as items from "../items.js";
import type * as itemsHttp from "../itemsHttp.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_httpResponses from "../lib/httpResponses.js";
import type * as lib_jwt from "../lib/jwt.js";
import type * as lib_turnkeyClient from "../lib/turnkeyClient.js";
import type * as lib_turnkeySigner from "../lib/turnkeySigner.js";
import type * as lists from "../lists.js";
import type * as listsHttp from "../listsHttp.js";
import type * as migrations_migrateCollaborators from "../migrations/migrateCollaborators.js";
import type * as publication from "../publication.js";
import type * as rateLimits from "../rateLimits.js";
import type * as turnkeyHelpers from "../turnkeyHelpers.js";
import type * as userHttp from "../userHttp.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authInternal: typeof authInternal;
  authSessions: typeof authSessions;
  categories: typeof categories;
  categoriesHttp: typeof categoriesHttp;
  collaborators: typeof collaborators;
  collaboratorsHttp: typeof collaboratorsHttp;
  didCreation: typeof didCreation;
  http: typeof http;
  invites: typeof invites;
  items: typeof items;
  itemsHttp: typeof itemsHttp;
  "lib/auth": typeof lib_auth;
  "lib/httpResponses": typeof lib_httpResponses;
  "lib/jwt": typeof lib_jwt;
  "lib/turnkeyClient": typeof lib_turnkeyClient;
  "lib/turnkeySigner": typeof lib_turnkeySigner;
  lists: typeof lists;
  listsHttp: typeof listsHttp;
  "migrations/migrateCollaborators": typeof migrations_migrateCollaborators;
  publication: typeof publication;
  rateLimits: typeof rateLimits;
  turnkeyHelpers: typeof turnkeyHelpers;
  userHttp: typeof userHttp;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
