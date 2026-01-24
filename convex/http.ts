/**
 * Convex HTTP router for server-side endpoints.
 *
 * Phase 8: Server-side authentication endpoints.
 */

import { httpRouter } from "convex/server";
import { initiate, verify, logout } from "./authHttp";

const http = httpRouter();

// Auth endpoints
http.route({
  path: "/auth/initiate",
  method: "POST",
  handler: initiate,
});

http.route({
  path: "/auth/verify",
  method: "POST",
  handler: verify,
});

http.route({
  path: "/auth/logout",
  method: "POST",
  handler: logout,
});

// CORS preflight handling for all auth routes
http.route({
  path: "/auth/initiate",
  method: "OPTIONS",
  handler: async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  },
});

http.route({
  path: "/auth/verify",
  method: "OPTIONS",
  handler: async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  },
});

http.route({
  path: "/auth/logout",
  method: "OPTIONS",
  handler: async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  },
});

export default http;
