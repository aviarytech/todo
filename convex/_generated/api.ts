/* prettier-ignore-start */

/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev` or `npx convex codegen`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import * as auth from "../auth";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
type FullApi = ApiFromModules<{
  auth: typeof auth;
}>;
export type Api = FilterApi<
  FullApi,
  FunctionReference<any, "public">
>;

export const api = {
  auth: {
    getCurrentUser: auth.getCurrentUser,
  },
} as Api;
/* prettier-ignore-end */
