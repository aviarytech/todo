/**
 * Production server for Poo App.
 *
 * Serves the Vite-built SPA from dist/ and proxies DID resolution
 * and resource paths to the Convex HTTP backend.
 *
 * Routes:
 *   /user-*/did.jsonl              → proxy to Convex
 *   /user-*/resources/*            → proxy to Convex
 *   /api/*                         → proxy to Convex
 *   everything else                → SPA (dist/index.html)
 */

import { serve } from "bun";
import { join } from "path";
import { existsSync } from "fs";

const PORT = parseInt(process.env.PORT || "3000", 10);
const DIST_DIR = join(import.meta.dir, "dist");
const CONVEX_URL = process.env.CONVEX_BACKEND_URL || process.env.VITE_CONVEX_URL || "";

// Convert Convex cloud URL to site URL for HTTP actions
function getConvexSiteUrl(): string {
  if (!CONVEX_URL) return "";
  if (CONVEX_URL.includes("127.0.0.1") || CONVEX_URL.includes("localhost")) {
    return CONVEX_URL.replace(":3210", ":3211");
  }
  // Self-hosted Convex on Railway — HTTP actions on same URL
  if (CONVEX_URL.includes("railway.app") || CONVEX_URL.includes("x51.ca")) {
    return CONVEX_URL;
  }
  return CONVEX_URL.replace(".convex.cloud", ".convex.site");
}

const CONVEX_SITE_URL = getConvexSiteUrl();

// MIME types for static files
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".webp": "image/webp",
  ".webmanifest": "application/manifest+json",
};

function getMimeType(path: string): string {
  const ext = path.match(/\.[^.]+$/)?.[0] || "";
  return MIME_TYPES[ext] || "application/octet-stream";
}

/**
 * Check if a path should be proxied to Convex (DID resolution or API).
 */
function shouldProxy(pathname: string): boolean {
  // DID resolution: /user-*/did.jsonl
  if (/^\/user-[^/]+\/did\.jsonl$/.test(pathname)) return true;
  // Resource serving + mutations: /user-*/resources/*
  if (/^\/user-[^/]+\/resources\//.test(pathname)) return true;
  return false;
}

serve({
  port: PORT,
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Proxy DID/resource paths to Convex
    if (shouldProxy(pathname)) {
      if (!CONVEX_SITE_URL) {
        return new Response("Convex backend not configured", { status: 502 });
      }

      const proxyUrl = `${CONVEX_SITE_URL}${pathname}${url.search}`;
      try {
        const proxyResponse = await fetch(proxyUrl, {
          method: request.method,
          headers: request.headers,
          body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
        });

        // Forward the response with CORS headers
        const headers = new Headers(proxyResponse.headers);
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");

        return new Response(proxyResponse.body, {
          status: proxyResponse.status,
          headers,
        });
      } catch (err) {
        console.error(`[proxy] Error proxying ${pathname}:`, err);
        return new Response("Backend unavailable", { status: 502 });
      }
    }

    // Serve static files from dist/
    const filePath = join(DIST_DIR, pathname);
    if (pathname !== "/" && existsSync(filePath) && !Bun.file(filePath).name?.endsWith("/")) {
      const file = Bun.file(filePath);
      return new Response(file, {
        headers: {
          "Content-Type": getMimeType(pathname),
          // Cache hashed assets forever, others for 1 hour
          "Cache-Control": pathname.includes("/assets/")
            ? "public, max-age=31536000, immutable"
            : "public, max-age=3600",
        },
      });
    }

    // SPA fallback — serve index.html for all other routes
    const indexFile = Bun.file(join(DIST_DIR, "index.html"));
    return new Response(indexFile, {
      headers: { "Content-Type": "text/html" },
    });
  },
});

console.log(`🚀 Poo App server running on port ${PORT}`);
console.log(`📁 Serving static files from ${DIST_DIR}`);
if (CONVEX_SITE_URL) {
  console.log(`🔗 Proxying DID/resource paths to ${CONVEX_SITE_URL}`);
} else {
  console.log(`⚠️ No CONVEX_BACKEND_URL set — DID resolution disabled`);
}
