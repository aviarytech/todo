/**
 * Convex HTTP router for server-side endpoints.
 *
 * Phase 8: Server-side authentication endpoints and protected mutations.
 */

import { httpRouter } from "convex/server";
import { initiate, verify, logout } from "./authHttp";
import { createList, deleteList } from "./listsHttp";
import {
  createCategory,
  renameCategory,
  deleteCategory,
  setListCategory,
} from "./categoriesHttp";
import {
  addItem,
  checkItem,
  uncheckItem,
  removeItem,
  reorderItems,
} from "./itemsHttp";
import {
  addCollaborator,
  updateCollaboratorRole,
  removeCollaborator,
} from "./collaboratorsHttp";

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

// ============================================================================
// Protected API endpoints (Phase 8.3)
// All endpoints below require JWT authentication via Authorization header.
// ============================================================================

// CORS preflight handler for all API routes
const apiCorsHandler = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
};

// --- List endpoints ---
http.route({ path: "/api/lists/create", method: "POST", handler: createList });
http.route({ path: "/api/lists/create", method: "OPTIONS", handler: apiCorsHandler });
http.route({ path: "/api/lists/delete", method: "POST", handler: deleteList });
http.route({ path: "/api/lists/delete", method: "OPTIONS", handler: apiCorsHandler });

// --- Category endpoints ---
http.route({ path: "/api/categories/create", method: "POST", handler: createCategory });
http.route({ path: "/api/categories/create", method: "OPTIONS", handler: apiCorsHandler });
http.route({ path: "/api/categories/rename", method: "POST", handler: renameCategory });
http.route({ path: "/api/categories/rename", method: "OPTIONS", handler: apiCorsHandler });
http.route({ path: "/api/categories/delete", method: "POST", handler: deleteCategory });
http.route({ path: "/api/categories/delete", method: "OPTIONS", handler: apiCorsHandler });
http.route({ path: "/api/categories/setListCategory", method: "POST", handler: setListCategory });
http.route({ path: "/api/categories/setListCategory", method: "OPTIONS", handler: apiCorsHandler });

// --- Item endpoints ---
http.route({ path: "/api/items/add", method: "POST", handler: addItem });
http.route({ path: "/api/items/add", method: "OPTIONS", handler: apiCorsHandler });
http.route({ path: "/api/items/check", method: "POST", handler: checkItem });
http.route({ path: "/api/items/check", method: "OPTIONS", handler: apiCorsHandler });
http.route({ path: "/api/items/uncheck", method: "POST", handler: uncheckItem });
http.route({ path: "/api/items/uncheck", method: "OPTIONS", handler: apiCorsHandler });
http.route({ path: "/api/items/remove", method: "POST", handler: removeItem });
http.route({ path: "/api/items/remove", method: "OPTIONS", handler: apiCorsHandler });
http.route({ path: "/api/items/reorder", method: "POST", handler: reorderItems });
http.route({ path: "/api/items/reorder", method: "OPTIONS", handler: apiCorsHandler });

// --- Collaborator endpoints ---
http.route({ path: "/api/collaborators/add", method: "POST", handler: addCollaborator });
http.route({ path: "/api/collaborators/add", method: "OPTIONS", handler: apiCorsHandler });
http.route({ path: "/api/collaborators/updateRole", method: "POST", handler: updateCollaboratorRole });
http.route({ path: "/api/collaborators/updateRole", method: "OPTIONS", handler: apiCorsHandler });
http.route({ path: "/api/collaborators/remove", method: "POST", handler: removeCollaborator });
http.route({ path: "/api/collaborators/remove", method: "OPTIONS", handler: apiCorsHandler });

export default http;
