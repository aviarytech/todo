import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { requireAuth, AuthError, unauthorizedResponseWithCors } from "./lib/auth";
import { errorResponse, getCorsHeaders, jsonResponse } from "./lib/httpResponses";

const ALL_SCOPES = [
  "tasks:read",
  "tasks:write",
  "activity:read",
  "memory:read",
  "memory:write",
  "agents:read",
  "agents:write",
  "runs:read",
  "runs:write",
  "runs:control",
  "dashboard:read",
  "schedule:read",
  "schedule:write",
] as const;

type Scope = (typeof ALL_SCOPES)[number];

type AuthContext = {
  userDid: string;
  authMode: "jwt" | "api_key";
  scopes: Scope[];
  keyId?: Id<"apiKeys">;
};

const encoder = new TextEncoder();

function normalizeScopes(scopes?: unknown): Scope[] {
  if (!Array.isArray(scopes)) return [];
  const valid = new Set<Scope>(ALL_SCOPES);
  return scopes.filter((s): s is Scope => typeof s === "string" && valid.has(s as Scope));
}

function randomToken(bytes = 24): string {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Array.from(data).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getUserDidFromJwt(ctx: ActionCtx, request: Request): Promise<string> {
  const auth = await requireAuth(request);
  const user = await ctx.runQuery((api as any).auth.getUserByTurnkeyId, {
    turnkeySubOrgId: auth.turnkeySubOrgId,
  }) as { did: string; legacyDid?: string } | null;

  if (!user?.did) throw new Error("User not found");
  return user.did;
}

function requireScopes(authCtx: AuthContext, needed: Scope[]): string | null {
  if (authCtx.authMode === "jwt") return null;
  for (const scope of needed) {
    if (!authCtx.scopes.includes(scope)) return scope;
  }
  return null;
}

async function authenticate(ctx: ActionCtx, request: Request): Promise<AuthContext> {
  const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("X-API-Key");
  if (apiKeyHeader) {
    const hash = await sha256Hex(apiKeyHeader);
    const key = await ctx.runQuery((api as any).missionControlCore.getApiKeyByHash, { keyHash: hash }) as any;
    if (!key) throw new AuthError("Invalid API key", "INVALID_TOKEN");
    if (key.revokedAt) throw new AuthError("API key revoked", "INVALID_TOKEN");
    if (key.expiresAt && key.expiresAt < Date.now()) throw new AuthError("API key expired", "EXPIRED_TOKEN");

    await ctx.runMutation((api as any).missionControlCore.touchApiKeyUsage, { keyId: key._id });

    return {
      authMode: "api_key",
      userDid: key.ownerDid,
      scopes: normalizeScopes(key.scopes),
      keyId: key._id,
    };
  }

  const userDid = await getUserDidFromJwt(ctx, request);
  return { authMode: "jwt", userDid, scopes: [...ALL_SCOPES] };
}

function parseItemId(pathname: string): string | null {
  const match = pathname.match(/\/api\/v1\/tasks\/([a-z0-9]+)/);
  return match ? match[1] : null;
}

function parseRunId(pathname: string): string | null {
  const match = pathname.match(/\/api\/v1\/runs\/([a-z0-9]+)/);
  return match ? match[1] : null;
}

function parseOptionalNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseScheduleEntryId(pathname: string): string | null {
  const match = pathname.match(/\/api\/v1\/schedules\/([a-z0-9]+)/);
  return match ? match[1] : null;
}

export const v1AuthCors = httpAction(async (_ctx, request) => {
  return new Response(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(request),
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
      "Access-Control-Max-Age": "86400",
    },
  });
});

export const apiKeysHandler = httpAction(async (ctx, request) => {
  try {
    const userDid = await getUserDidFromJwt(ctx, request);

    if (request.method === "GET") {
      const keys = await ctx.runQuery((api as any).missionControlCore.listApiKeys, { ownerDid: userDid }) as any[];
      return jsonResponse(request, {
        apiKeys: keys.map((k) => ({
          _id: k._id,
          label: k.label,
          keyPrefix: k.keyPrefix,
          scopes: k.scopes,
          agentProfileId: k.agentProfileId,
          createdAt: k.createdAt,
          lastUsedAt: k.lastUsedAt,
          revokedAt: k.revokedAt,
          expiresAt: k.expiresAt,
        })),
      });
    }

    if (request.method === "POST") {
      const body = await request.json() as {
        label: string;
        scopes?: Scope[];
        agentProfileId?: Id<"agentProfiles">;
        expiresAt?: number;
      };
      if (!body.label) return errorResponse(request, "label is required", 400);

      const scopes = body.scopes?.length ? normalizeScopes(body.scopes) : ["tasks:read", "tasks:write"];
      if (!scopes.length) return errorResponse(request, "At least one valid scope is required", 400);

      const rawKey = `pa_${randomToken(8)}_${randomToken(24)}`;
      const keyPrefix = rawKey.slice(0, 12);
      const keyHash = await sha256Hex(rawKey);

      const keyId = await ctx.runMutation((api as any).missionControlCore.createApiKeyRecord, {
        ownerDid: userDid,
        label: body.label,
        keyPrefix,
        keyHash,
        scopes,
        agentProfileId: body.agentProfileId,
        expiresAt: body.expiresAt,
      });

      return jsonResponse(request, { keyId, apiKey: rawKey, keyPrefix, scopes }, 201);
    }

    return errorResponse(request, "Method not allowed", 405);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponseWithCors(request, error.message);
    return errorResponse(request, error instanceof Error ? error.message : "Failed", 500);
  }
});

export const apiKeyByIdHandler = httpAction(async (ctx, request) => {
  try {
    const userDid = await getUserDidFromJwt(ctx, request);
    const path = new URL(request.url).pathname;
    const id = path.split("/").pop();
    if (!id) return errorResponse(request, "key id required", 400);

    if (request.method === "DELETE") {
      await ctx.runMutation((api as any).missionControlCore.revokeApiKey, {
        keyId: id,
        ownerDid: userDid,
      });
      return jsonResponse(request, { success: true });
    }

    return errorResponse(request, "Method not allowed", 405);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponseWithCors(request, error.message);
    return errorResponse(request, error instanceof Error ? error.message : "Failed", 500);
  }
});

export const agentsHandler = httpAction(async (ctx, request) => {
  try {
    const authCtx = await authenticate(ctx, request);
    const missing = requireScopes(authCtx, request.method === "GET" ? ["agents:read"] : ["agents:write"]);
    if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);

    if (request.method === "GET") {
      const profiles = await ctx.runQuery((api as any).missionControlCore.listAgentProfiles, { ownerDid: authCtx.userDid });
      return jsonResponse(request, { agents: profiles });
    }

    if (request.method === "POST") {
      const body = await request.json() as {
        agentSlug: string;
        displayName: string;
        description?: string;
        capabilities?: string[];
        metadata?: string;
      };
      if (!body.agentSlug || !body.displayName) return errorResponse(request, "agentSlug and displayName are required", 400);

      const agentId = await ctx.runMutation((api as any).missionControlCore.upsertAgentProfile, {
        ownerDid: authCtx.userDid,
        agentSlug: body.agentSlug,
        displayName: body.displayName,
        description: body.description,
        capabilities: body.capabilities,
        metadata: body.metadata,
      });

      return jsonResponse(request, { agentId }, 201);
    }

    return errorResponse(request, "Method not allowed", 405);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponseWithCors(request, error.message);
    return errorResponse(request, error instanceof Error ? error.message : "Failed", 500);
  }
});

export const tasksHandler = httpAction(async (ctx, request) => {
  try {
    const authCtx = await authenticate(ctx, request);
    const url = new URL(request.url);

    if (request.method === "GET") {
      const itemId = parseItemId(url.pathname);
      if (itemId) {
        const missing = requireScopes(authCtx, ["tasks:read"]);
        if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);
        const item = await ctx.runQuery((api as any).missionControlCore.getTaskById, {
          itemId,
          userDid: authCtx.userDid,
        });
        if (!item) return errorResponse(request, "Task not found", 404);
        return jsonResponse(request, { task: item });
      }

      const listId = url.searchParams.get("listId");
      if (!listId) return errorResponse(request, "listId query param required", 400);
      const missing = requireScopes(authCtx, ["tasks:read"]);
      if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);
      const tasks = await ctx.runQuery((api as any).missionControlCore.listTasksForList, {
        listId,
        userDid: authCtx.userDid,
        limit: Number(url.searchParams.get("limit") ?? "100"),
      });
      return jsonResponse(request, { tasks });
    }

    return errorResponse(request, "Method not allowed", 405);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponseWithCors(request, error.message);
    return errorResponse(request, error instanceof Error ? error.message : "Failed", 500);
  }
});

export const activityHandler = httpAction(async (ctx, request) => {
  try {
    const authCtx = await authenticate(ctx, request);
    const missing = requireScopes(authCtx, ["activity:read"]);
    if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);

    const url = new URL(request.url);
    const listId = url.searchParams.get("listId");
    if (!listId) return errorResponse(request, "listId query param required", 400);

    const events = await ctx.runQuery((api as any).missionControlCore.listActivityEvents, {
      listId,
      userDid: authCtx.userDid,
      limit: Number(url.searchParams.get("limit") ?? "100"),
    });

    return jsonResponse(request, { events });
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponseWithCors(request, error.message);
    return errorResponse(request, error instanceof Error ? error.message : "Failed", 500);
  }
});

export const memoryHandler = httpAction(async (ctx, request) => {
  try {
    const authCtx = await authenticate(ctx, request);

    if (request.method === "GET") {
      const missing = requireScopes(authCtx, ["memory:read"]);
      if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);

      const url = new URL(request.url);
      const agentSlug = url.searchParams.get("agentSlug");
      if (!agentSlug) return errorResponse(request, "agentSlug query param required", 400);
      const key = url.searchParams.get("key") ?? undefined;
      const memory = await ctx.runQuery((api as any).missionControlCore.getAgentMemory, {
        ownerDid: authCtx.userDid,
        agentSlug,
        key,
      });
      return jsonResponse(request, { memory });
    }

    if (request.method === "POST") {
      const missing = requireScopes(authCtx, ["memory:write"]);
      if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);

      const body = await request.json() as { agentSlug: string; key: string; value: string; listId?: Id<"lists"> };
      if (!body.agentSlug || !body.key || typeof body.value !== "string") {
        return errorResponse(request, "agentSlug, key, and value are required", 400);
      }

      const id = await ctx.runMutation((api as any).missionControlCore.addAgentMemory, {
        ownerDid: authCtx.userDid,
        listId: body.listId,
        agentSlug: body.agentSlug,
        key: body.key,
        value: body.value,
      });
      return jsonResponse(request, { id }, 201);
    }

    return errorResponse(request, "Method not allowed", 405);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponseWithCors(request, error.message);
    return errorResponse(request, error instanceof Error ? error.message : "Failed", 500);
  }
});

export const runsHandler = httpAction(async (ctx, request) => {
  try {
    const authCtx = await authenticate(ctx, request);
    const url = new URL(request.url);

    if (request.method === "GET") {
      const missing = requireScopes(authCtx, ["runs:read"]);
      if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);

      const result = await ctx.runQuery((api as any).missionControlCore.listMissionRuns, {
        ownerDid: authCtx.userDid,
        listId: url.searchParams.get("listId") ?? undefined,
        itemId: url.searchParams.get("itemId") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        startDate: parseOptionalNumber(url.searchParams.get("startDate")),
        endDate: parseOptionalNumber(url.searchParams.get("endDate")),
        limit: Number(url.searchParams.get("limit") ?? "25"),
        page: Number(url.searchParams.get("page") ?? "1"),
      });
      return jsonResponse(request, result);
    }

    if (request.method === "PATCH") {
      const missing = requireScopes(authCtx, ["runs:write"]);
      if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);
      const runId = parseRunId(url.pathname);
      if (!runId) return errorResponse(request, "runId is required", 400);

      const body = await request.json() as {
        provider?: string;
        computerId?: string;
        costEstimate?: number;
        tokenUsage?: number;
      };

      const result = await ctx.runMutation((api as any).missionControlCore.updateMissionRun, {
        ownerDid: authCtx.userDid,
        runId,
        provider: body.provider,
        computerId: body.computerId,
        costEstimate: body.costEstimate,
        tokenUsage: body.tokenUsage,
      });
      return jsonResponse(request, result);
    }

    if (request.method === "DELETE") {
      const missing = requireScopes(authCtx, ["runs:control"]);
      if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);
      const runId = parseRunId(url.pathname);
      if (!runId) return errorResponse(request, "runId is required", 400);
      const result = await ctx.runMutation((api as any).missionControlCore.deleteMissionRun, {
        ownerDid: authCtx.userDid,
        runId,
      });
      return jsonResponse(request, result);
    }

    if (request.method === "POST") {
      const path = url.pathname;
      const runId = parseRunId(path);
      const isActionPath = path.includes("/heartbeat") || path.includes("/transition") || path.includes("/retry") || path.includes("/artifacts") || path.includes("/monitor") || path.includes("/pause") || path.includes("/kill") || path.includes("/escalate") || path.includes("/reassign");

      if (!isActionPath) {
        const missing = requireScopes(authCtx, ["runs:write"]);
        if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);

        const body = await request.json() as {
          listId: Id<"lists">;
          itemId?: Id<"items">;
          agentSlug: string;
          provider?: string;
          computerId?: string;
          parentRunId?: Id<"missionRuns">;
          heartbeatIntervalMs?: number;
        };

        if (!body.listId || !body.agentSlug) {
          return errorResponse(request, "listId and agentSlug are required", 400);
        }

        const created = await ctx.runMutation((api as any).missionControlCore.createMissionRun, {
          ownerDid: authCtx.userDid,
          listId: body.listId,
          itemId: body.itemId,
          agentSlug: body.agentSlug,
          provider: body.provider,
          computerId: body.computerId,
          parentRunId: body.parentRunId,
          heartbeatIntervalMs: body.heartbeatIntervalMs,
        });

        return jsonResponse(request, created, 201);
      }

      if (path.endsWith("/monitor")) {
        const missing = requireScopes(authCtx, ["runs:control"]);
        if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);
        const body = await request.json().catch(() => ({})) as { now?: number };
        const result = await ctx.runMutation((api as any).missionControlCore.monitorMissionRunHeartbeats, {
          ownerDid: authCtx.userDid,
          now: body.now,
        });
        return jsonResponse(request, result);
      }

      if (!runId) return errorResponse(request, "runId is required", 400);

      if (path.endsWith("/pause")) {
        const missing = requireScopes(authCtx, ["runs:control"]);
        if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);
        const body = await request.json().catch(() => ({})) as { reason?: string };
        const result = await ctx.runMutation((api as any).missionControlCore.transitionMissionRun, {
          ownerDid: authCtx.userDid,
          runId,
          nextStatus: "blocked",
        });
        await ctx.runMutation((api as any).missionControlCore.appendMissionRunArtifact, {
          ownerDid: authCtx.userDid,
          runId,
          type: "log",
          ref: `pause:${body.reason ?? "operator_requested"}`,
          label: "runtime_control",
        });
        return jsonResponse(request, { ok: true, action: "pause", ...result });
      }

      if (path.endsWith("/kill")) {
        const missing = requireScopes(authCtx, ["runs:control"]);
        if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);
        const body = await request.json().catch(() => ({})) as { reason?: string };
        const result = await ctx.runMutation((api as any).missionControlCore.transitionMissionRun, {
          ownerDid: authCtx.userDid,
          runId,
          nextStatus: "failed",
          terminalReason: "killed",
        });
        await ctx.runMutation((api as any).missionControlCore.appendMissionRunArtifact, {
          ownerDid: authCtx.userDid,
          runId,
          type: "log",
          ref: `kill:${body.reason ?? "operator_requested"}`,
          label: "runtime_control",
        });
        return jsonResponse(request, { ok: true, action: "kill", ...result });
      }

      if (path.endsWith("/escalate")) {
        const missing = requireScopes(authCtx, ["runs:control"]);
        if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);
        const body = await request.json().catch(() => ({})) as { targetAgentSlug?: string; reason?: string };
        const now = Date.now();
        const result = await ctx.runMutation((api as any).missionControlCore.transitionMissionRun, {
          ownerDid: authCtx.userDid,
          runId,
          nextStatus: "failed",
          terminalReason: "escalated",
          escalationAt: now,
        });
        const run = await ctx.runQuery((api as any).missionControlCore.getMissionRunById, {
          ownerDid: authCtx.userDid,
          runId,
        }) as { agentSlug?: string } | null;
        if (run?.agentSlug) {
          await ctx.runMutation((api as any).missionControlCore.controlAgentLaunch, {
            ownerDid: authCtx.userDid,
            actorDid: authCtx.userDid,
            agentSlug: run.agentSlug,
            action: "escalate",
            targetAgentSlug: body.targetAgentSlug,
            reason: body.reason,
          });
        }
        return jsonResponse(request, { ok: true, action: "escalate", ...result });
      }

      if (path.endsWith("/reassign")) {
        const missing = requireScopes(authCtx, ["runs:control"]);
        if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);
        const body = await request.json().catch(() => ({})) as { targetAgentSlug?: string; reason?: string };
        if (!body.targetAgentSlug) return errorResponse(request, "targetAgentSlug is required", 400);
        const run = await ctx.runQuery((api as any).missionControlCore.getMissionRunById, {
          ownerDid: authCtx.userDid,
          runId,
        }) as { agentSlug?: string } | null;
        if (!run?.agentSlug) return errorResponse(request, "Run not found", 404);
        await ctx.runMutation((api as any).missionControlCore.controlAgentLaunch, {
          ownerDid: authCtx.userDid,
          actorDid: authCtx.userDid,
          agentSlug: run.agentSlug,
          action: "reassign",
          targetAgentSlug: body.targetAgentSlug,
          reason: body.reason,
        });
        await ctx.runMutation((api as any).missionControlCore.appendMissionRunArtifact, {
          ownerDid: authCtx.userDid,
          runId,
          type: "log",
          ref: `reassign:${body.targetAgentSlug}:${body.reason ?? "operator_requested"}`,
          label: "runtime_control",
        });
        return jsonResponse(request, { ok: true, action: "reassign", runId, targetAgentSlug: body.targetAgentSlug });
      }

      if (path.endsWith("/heartbeat")) {
        const missing = requireScopes(authCtx, ["runs:write"]);
        if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);
        const body = await request.json().catch(() => ({})) as { at?: number };
        const result = await ctx.runMutation((api as any).missionControlCore.recordMissionRunHeartbeat, {
          ownerDid: authCtx.userDid,
          runId,
          at: body.at,
        });
        return jsonResponse(request, result);
      }

      if (path.endsWith("/transition")) {
        const missing = requireScopes(authCtx, ["runs:control"]);
        if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);
        const body = await request.json() as {
          nextStatus: "starting" | "running" | "degraded" | "blocked" | "failed" | "finished";
          terminalReason?: "completed" | "killed" | "timeout" | "error" | "escalated";
          costEstimate?: number;
          tokenUsage?: number;
          escalationAt?: number;
        };
        const result = await ctx.runMutation((api as any).missionControlCore.transitionMissionRun, {
          ownerDid: authCtx.userDid,
          runId,
          ...body,
        });
        return jsonResponse(request, result);
      }

      if (path.endsWith("/retry")) {
        const missing = requireScopes(authCtx, ["runs:control"]);
        if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);
        const result = await ctx.runMutation((api as any).missionControlCore.createRetryForMissionRun, {
          ownerDid: authCtx.userDid,
          runId,
        });
        return jsonResponse(request, result);
      }

      if (path.endsWith("/artifacts")) {
        const missing = requireScopes(authCtx, ["runs:write"]);
        if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);
        const body = await request.json() as {
          type: "screenshot" | "log" | "diff" | "file" | "url";
          ref: string;
          label?: string;
        };
        if (!body.ref || !body.type) return errorResponse(request, "type and ref are required", 400);
        const result = await ctx.runMutation((api as any).missionControlCore.appendMissionRunArtifact, {
          ownerDid: authCtx.userDid,
          runId,
          type: body.type,
          ref: body.ref,
          label: body.label,
        });
        return jsonResponse(request, result);
      }
    }

    return errorResponse(request, "Method not allowed", 405);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponseWithCors(request, error.message);
    return errorResponse(request, error instanceof Error ? error.message : "Failed", 500);
  }
});

export const schedulesHandler = httpAction(async (ctx, request) => {
  try {
    const authCtx = await authenticate(ctx, request);
    const url = new URL(request.url);

    if (request.method === "GET") {
      const missing = requireScopes(authCtx, ["schedule:read"]);
      if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);

      const ownerDid = url.searchParams.get("ownerDid") ?? authCtx.userDid;
      if (ownerDid !== authCtx.userDid) return errorResponse(request, "Forbidden", 403);
      const listId = url.searchParams.get("listId") ?? undefined;

      const schedules = await ctx.runQuery((api as any).scheduleEntries.listForOwner, {
        ownerDid,
        actorDid: authCtx.userDid,
        listId,
      });

      return jsonResponse(request, { schedules });
    }

    if (request.method === "POST") {
      const path = url.pathname;

      if (path.endsWith("/sync")) {
        const missing = requireScopes(authCtx, ["schedule:write"]);
        if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);

        const body = await request.json() as {
          ownerDid?: string;
          agentDid?: string;
          entries: Array<{
            externalId: string;
            title: string;
            cronExpr?: string;
            nextRunAt?: number;
            lastRunAt?: number;
            lastStatus?: "ok" | "error" | "skipped";
            enabled: boolean;
            listId?: Id<"lists">;
          }>;
        };

        if (!Array.isArray(body.entries)) return errorResponse(request, "entries array is required", 400);
        const ownerDid = body.ownerDid ?? authCtx.userDid;
        if (ownerDid !== authCtx.userDid) return errorResponse(request, "Forbidden", 403);

        const result = await ctx.runMutation((api as any).scheduleEntries.syncCronSnapshot, {
          ownerDid,
          actorDid: authCtx.userDid,
          agentDid: body.agentDid,
          entries: body.entries,
        });

        return jsonResponse(request, result);
      }

      if (path.endsWith("/toggle")) {
        const missing = requireScopes(authCtx, ["schedule:write"]);
        if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);

        const entryId = parseScheduleEntryId(path);
        if (!entryId) return errorResponse(request, "schedule entry id is required", 400);

        const body = await request.json() as { enabled: boolean };
        if (typeof body.enabled !== "boolean") return errorResponse(request, "enabled boolean is required", 400);

        const existing = await ctx.runQuery((api as any).scheduleEntries.listForOwner, {
          ownerDid: authCtx.userDid,
          actorDid: authCtx.userDid,
        }) as Array<any>;
        const row = existing.find((r) => r._id === entryId);
        if (!row) return errorResponse(request, "Schedule entry not found", 404);

        await ctx.runMutation((api as any).scheduleEntries.updateScheduleEntry, {
          entryId,
          actorDid: authCtx.userDid,
          enabled: body.enabled,
        });

        return jsonResponse(request, {
          ok: true,
          schedule: {
            _id: row._id,
            externalId: row.externalId,
            title: row.title,
            cronExpr: row.cronExpr,
            enabled: body.enabled,
          },
          writeback: {
            flow: "openclaw-cron-metadata",
            externalId: row.externalId,
            enabled: body.enabled,
          },
        });
      }
    }

    return errorResponse(request, "Method not allowed", 405);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponseWithCors(request, error.message);
    return errorResponse(request, error instanceof Error ? error.message : "Failed", 500);
  }
});

export const runsDashboardHandler = httpAction(async (ctx, request) => {
  try {
    if (request.method !== "GET") return errorResponse(request, "Method not allowed", 405);
    const authCtx = await authenticate(ctx, request);
    const missing = requireScopes(authCtx, ["dashboard:read"]);
    if (missing) return errorResponse(request, `Missing required scope: ${missing}`, 403);

    const url = new URL(request.url);
    const windowMs = Number(url.searchParams.get("windowMs") ?? String(24 * 60 * 60 * 1000));
    const dashboard = await ctx.runQuery((api as any).missionControlCore.getMissionRunsDashboard, {
      ownerDid: authCtx.userDid,
      windowMs,
    });
    return jsonResponse(request, { dashboard });
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponseWithCors(request, error.message);
    return errorResponse(request, error instanceof Error ? error.message : "Failed", 500);
  }
});
