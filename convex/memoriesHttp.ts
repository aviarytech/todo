import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { AuthError, unauthorizedResponseWithCors } from "./lib/auth";
import { requireAuthenticatedUser } from "./lib/authUser";
import { errorResponse, jsonResponse } from "./lib/httpResponses";

export const createMemory = httpAction(async (ctx, request) => {
  try {
    const user = await requireAuthenticatedUser(ctx, request);
    const body = await request.json() as { title?: string; content?: string; tags?: string[]; source?: "manual"|"openclaw"|"clawboot"|"import"|"api"; sourceRef?: string; authorDid?: string };
    if (!body.title || !body.content) return errorResponse(request, "title and content are required", 400);

    const memoryId = await ctx.runMutation((api as any).memories.createMemory, {
      ownerDid: user.did,
      authorDid: body.authorDid ?? user.did,
      title: body.title,
      content: body.content,
      tags: body.tags,
      source: body.source ?? "manual",
      sourceRef: body.sourceRef,
    });

    return jsonResponse(request, { memoryId }, 201);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponseWithCors(request, error.message);
    return errorResponse(request, error instanceof Error ? error.message : "Failed to create memory", 500);
  }
});

export const listMemories = httpAction(async (ctx, request) => {
  try {
    const user = await requireAuthenticatedUser(ctx, request);
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? undefined;
    const tag = url.searchParams.get("tag") ?? undefined;
    const source = (url.searchParams.get("source") ?? undefined) as any;
    const limit = Number(url.searchParams.get("limit") ?? "50");

    const result = await ctx.runQuery((api as any).memories.listMemories, {
      ownerDid: user.did,
      query: q,
      tag,
      source,
      limit,
    });

    return jsonResponse(request, result);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponseWithCors(request, error.message);
    return errorResponse(request, error instanceof Error ? error.message : "Failed to list memories", 500);
  }
});
