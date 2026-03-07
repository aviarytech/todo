/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as activityHttp from "../activityHttp.js";
import type * as assignees from "../assignees.js";
import type * as assigneesHttp from "../assigneesHttp.js";
import type * as attachments from "../attachments.js";
import type * as auth from "../auth.js";
import type * as authInternal from "../authInternal.js";
import type * as authSessions from "../authSessions.js";
import type * as billing from "../billing.js";
import type * as billingActions from "../billingActions.js";
import type * as billingHttp from "../billingHttp.js";
import type * as bitcoinAnchors from "../bitcoinAnchors.js";
import type * as categories from "../categories.js";
import type * as categoriesHttp from "../categoriesHttp.js";
import type * as comments from "../comments.js";
import type * as didCreation from "../didCreation.js";
import type * as didLogs from "../didLogs.js";
import type * as didLogsHttp from "../didLogsHttp.js";
import type * as didResources from "../didResources.js";
import type * as didResourcesHttp from "../didResourcesHttp.js";
import type * as feedback from "../feedback.js";
import type * as http from "../http.js";
import type * as items from "../items.js";
import type * as itemsHttp from "../itemsHttp.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_authUser from "../lib/authUser.js";
import type * as lib_httpResponses from "../lib/httpResponses.js";
import type * as lib_jwt from "../lib/jwt.js";
import type * as lib_observability from "../lib/observability.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_turnkeyClient from "../lib/turnkeyClient.js";
import type * as lib_turnkeySigner from "../lib/turnkeySigner.js";
import type * as lists from "../lists.js";
import type * as listsHttp from "../listsHttp.js";
import type * as notificationActions from "../notificationActions.js";
import type * as notifications from "../notifications.js";
import type * as presence from "../presence.js";
import type * as presenceHttp from "../presenceHttp.js";
import type * as publication from "../publication.js";
import type * as rateLimits from "../rateLimits.js";
import type * as referrals from "../referrals.js";
import type * as tags from "../tags.js";
import type * as templates from "../templates.js";
import type * as turnkeyHelpers from "../turnkeyHelpers.js";
import type * as userHttp from "../userHttp.js";
import type * as users from "../users.js";
import type * as waitlist from "../waitlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  activityHttp: typeof activityHttp;
  assignees: typeof assignees;
  assigneesHttp: typeof assigneesHttp;
  attachments: typeof attachments;
  auth: typeof auth;
  authInternal: typeof authInternal;
  authSessions: typeof authSessions;
  billing: typeof billing;
  billingActions: typeof billingActions;
  billingHttp: typeof billingHttp;
  bitcoinAnchors: typeof bitcoinAnchors;
  categories: typeof categories;
  categoriesHttp: typeof categoriesHttp;
  comments: typeof comments;
  didCreation: typeof didCreation;
  didLogs: typeof didLogs;
  didLogsHttp: typeof didLogsHttp;
  didResources: typeof didResources;
  didResourcesHttp: typeof didResourcesHttp;
  feedback: typeof feedback;
  http: typeof http;
  items: typeof items;
  itemsHttp: typeof itemsHttp;
  "lib/auth": typeof lib_auth;
  "lib/authUser": typeof lib_authUser;
  "lib/httpResponses": typeof lib_httpResponses;
  "lib/jwt": typeof lib_jwt;
  "lib/observability": typeof lib_observability;
  "lib/permissions": typeof lib_permissions;
  "lib/turnkeyClient": typeof lib_turnkeyClient;
  "lib/turnkeySigner": typeof lib_turnkeySigner;
  lists: typeof lists;
  listsHttp: typeof listsHttp;
  notificationActions: typeof notificationActions;
  notifications: typeof notifications;
  presence: typeof presence;
  presenceHttp: typeof presenceHttp;
  publication: typeof publication;
  rateLimits: typeof rateLimits;
  referrals: typeof referrals;
  tags: typeof tags;
  templates: typeof templates;
  turnkeyHelpers: typeof turnkeyHelpers;
  userHttp: typeof userHttp;
  users: typeof users;
  waitlist: typeof waitlist;
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
