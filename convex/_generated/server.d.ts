/* prettier-ignore-start */

/* eslint-disable */
/**
 * Generated server-side `auth` and `http` utilities.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 *
 * @module
 */

import type { Auth } from "convex/server";
import type { HttpRouter } from "convex/server";

/**
 * Reference to your app's auth.
 * Use this to get the current user's identity in Convex functions.
 *
 * Usage:
 * ```ts
 * import { auth } from "./_generated/server";
 *
 * export default httpRouter()
 *   .query("myFunction", async ({ auth }) => {
 *     const identity = await auth.getUserIdentity();
 *     // ...
 *   });
 * ```
 */
export declare const auth: Auth;

/**
 * Reference to your app's HTTP router.
 * Use this to add HTTP endpoints to your Convex backend.
 *
 * Usage:
 * ```ts
 * import { httpRouter } from "./_generated/server";
 *
 * export default httpRouter()
 *   .route("/myEndpoint", async (request) => {
 *     // ...
 *   });
 * ```
 */
export declare const httpRouter: HttpRouter;

/* prettier-ignore-end */
