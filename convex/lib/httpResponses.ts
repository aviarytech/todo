/**
 * Shared HTTP response helpers for Convex HTTP actions.
 *
 * IMPORTANT: Browsers require CORS headers on the *actual* response, not just
 * the OPTIONS preflight. These helpers ensure all JSON/error responses include
 * the correct CORS headers for the requesting Origin.
 */
type HeaderMap = Record<string, string>;

/**
 * Compute CORS headers for a request.
 *
 * - If an Origin is present (browser requests), echo it back and allow credentials.
 * - If no Origin is present (non-browser), omit credential headers.
 * - For preflight, echo requested headers when provided.
 */
export function getCorsHeaders(request: Request): HeaderMap {
  const origin = request.headers.get("Origin");
  const requestedHeaders = request.headers.get("Access-Control-Request-Headers");

  const headers: HeaderMap = {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      requestedHeaders ?? "Content-Type, Authorization",
  };

  // Only allow credentials when we can echo a concrete Origin.
  if (origin) {
    headers["Access-Control-Allow-Credentials"] = "true";
    // Prevent caches from reusing a response across different origins.
    headers["Vary"] = "Origin";
  }

  return headers;
}

export function jsonResponse(
  request: Request,
  data: unknown,
  status = 200,
  extraHeaders: HeaderMap = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(request),
      ...extraHeaders,
    },
  });
}

export function errorResponse(
  request: Request,
  message: string,
  status = 400,
  extraHeaders: HeaderMap = {}
): Response {
  return jsonResponse(request, { error: message }, status, extraHeaders);
}

export function emptyResponse(
  request: Request,
  status = 204,
  extraHeaders: HeaderMap = {}
): Response {
  return new Response(null, {
    status,
    headers: {
      ...getCorsHeaders(request),
      ...extraHeaders,
    },
  });
}
