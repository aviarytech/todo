#!/usr/bin/env node
/**
 * Mission Control Phase 3 Validation Script
 *
 * Validates that the Phase 3 Memory System implementation meets
 * the acceptance criteria from PRD-AGENT-MISSION-CONTROL.md.
 *
 * Usage:
 *   node scripts/validate-mission-control-phase3.mjs
 *
 * Exit codes:
 *   0 - All validations passed
 *   1 - Some validations failed
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
const PROJECT_ROOT = path.resolve(ROOT, "..");

const CHECKS = [];

function check(name, fn) {
  CHECKS.push({ name, fn });
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(PROJECT_ROOT, relativePath));
}

function fileContains(relativePath, ...patterns) {
  const filePath = path.join(PROJECT_ROOT, relativePath);
  if (!fs.existsSync(filePath)) return { exists: false, patterns: [] };
  const content = fs.readFileSync(filePath, "utf8");
  return {
    exists: true,
    patterns: patterns.map((p) => ({
      pattern: p,
      found: typeof p === "string" ? content.includes(p) : p.test(content),
    })),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Phase 3 Schema Validation
// ────────────────────────────────────────────────────────────────────────────

check("P3-SCHEMA-01: memories table exists in schema", () => {
  const result = fileContains("convex/schema.ts", "memories: defineTable");
  if (!result.exists) return { pass: false, reason: "schema.ts not found" };
  return result.patterns[0].found
    ? { pass: true }
    : { pass: false, reason: "memories table not defined" };
});

check("P3-SCHEMA-02: memories table has required fields", () => {
  const result = fileContains(
    "convex/schema.ts",
    "ownerDid: v.string()",
    "authorDid: v.string()",
    "title: v.string()",
    "content: v.string()",
    "searchText: v.string()",
    "tags: v.optional(v.array(v.string()))",
    'source: v.optional(v.union(',
    "externalId: v.optional(v.string())",
    "syncStatus: v.optional(v.union(",
  );
  if (!result.exists) return { pass: false, reason: "schema.ts not found" };
  const missing = result.patterns.filter((p) => !p.found).map((p) => p.pattern);
  return missing.length === 0
    ? { pass: true }
    : { pass: false, reason: `Missing fields: ${missing.join(", ")}` };
});

check("P3-SCHEMA-03: memories table has full-text search index", () => {
  const result = fileContains("convex/schema.ts", 'searchIndex("search_content"');
  if (!result.exists) return { pass: false, reason: "schema.ts not found" };
  return result.patterns[0].found
    ? { pass: true }
    : { pass: false, reason: "Full-text search index not found" };
});

check("P3-SCHEMA-04: memories table has bidirectional sync fields", () => {
  const result = fileContains(
    "convex/schema.ts",
    "externalUpdatedAt: v.optional(v.number())",
    "lastSyncedAt: v.optional(v.number())",
    "conflictNote: v.optional(v.string())",
  );
  if (!result.exists) return { pass: false, reason: "schema.ts not found" };
  const missing = result.patterns.filter((p) => !p.found).map((p) => p.pattern);
  return missing.length === 0
    ? { pass: true }
    : { pass: false, reason: `Missing sync fields: ${missing.join(", ")}` };
});

// ────────────────────────────────────────────────────────────────────────────
// Phase 3 Backend Validation
// ────────────────────────────────────────────────────────────────────────────

check("P3-BACKEND-01: memories.ts exists with CRUD mutations", () => {
  const result = fileContains(
    "convex/memories.ts",
    "export const createMemory",
    "export const updateMemory",
    "export const deleteMemory",
    "export const listMemories",
  );
  if (!result.exists) return { pass: false, reason: "memories.ts not found" };
  const missing = result.patterns.filter((p) => !p.found).map((p) => p.pattern);
  return missing.length === 0
    ? { pass: true }
    : { pass: false, reason: `Missing mutations: ${missing.join(", ")}` };
});

check("P3-BACKEND-02: upsertOpenClawMemory mutation exists", () => {
  const result = fileContains("convex/memories.ts", "export const upsertOpenClawMemory");
  if (!result.exists) return { pass: false, reason: "memories.ts not found" };
  return result.patterns[0].found
    ? { pass: true }
    : { pass: false, reason: "upsertOpenClawMemory mutation not found" };
});

check("P3-BACKEND-03: listMemoryChangesSince query exists", () => {
  const result = fileContains("convex/memories.ts", "export const listMemoryChangesSince");
  if (!result.exists) return { pass: false, reason: "memories.ts not found" };
  return result.patterns[0].found
    ? { pass: true }
    : { pass: false, reason: "listMemoryChangesSince query not found" };
});

check("P3-BACKEND-04: memorySync lib exists with conflict detection", () => {
  const result = fileContains(
    "convex/lib/memorySync.ts",
    "export function detectConflict",
    "export function resolveConflictLWW",
    "export function selectMemoryChangesSince",
  );
  if (!result.exists) return { pass: false, reason: "memorySync.ts not found" };
  const missing = result.patterns.filter((p) => !p.found).map((p) => p.pattern);
  return missing.length === 0
    ? { pass: true }
    : { pass: false, reason: `Missing functions: ${missing.join(", ")}` };
});

check("P3-BACKEND-05: memorySync unit tests exist", () => {
  const result = fileContains(
    "convex/lib/memorySync.test.ts",
    "memory sync cursor semantics",
    "conflict detection",
    "LWW conflict resolution",
  );
  if (!result.exists) return { pass: false, reason: "memorySync.test.ts not found" };
  const missing = result.patterns.filter((p) => !p.found).map((p) => p.pattern);
  return missing.length === 0
    ? { pass: true }
    : { pass: false, reason: `Missing test suites: ${missing.join(", ")}` };
});

// ────────────────────────────────────────────────────────────────────────────
// Phase 3 API Validation
// ────────────────────────────────────────────────────────────────────────────

check("P3-API-01: Memory HTTP routes are registered", () => {
  const result = fileContains(
    "convex/http.ts",
    '/api/v1/memory"',
    "/api/v1/memory/",
  );
  if (!result.exists) return { pass: false, reason: "http.ts not found" };
  const found = result.patterns.some((p) => p.found);
  return found
    ? { pass: true }
    : { pass: false, reason: "Memory API routes not found in http.ts" };
});

check("P3-API-02: memoryHandler exists in missionControlApi", () => {
  const result = fileContains("convex/missionControlApi.ts", "export const memoryHandler");
  if (!result.exists) return { pass: false, reason: "missionControlApi.ts not found" };
  return result.patterns[0].found
    ? { pass: true }
    : { pass: false, reason: "memoryHandler not exported" };
});

check("P3-API-03: Sync endpoint supports bidirectional mode", () => {
  const result = fileContains(
    "convex/missionControlApi.ts",
    'mode: "bidirectional"',
    'policy: "lww"',
    "listMemoryChangesSince",
  );
  if (!result.exists) return { pass: false, reason: "missionControlApi.ts not found" };
  const missing = result.patterns.filter((p) => !p.found).map((p) => p.pattern);
  return missing.length === 0
    ? { pass: true }
    : { pass: false, reason: `Missing sync features: ${missing.join(", ")}` };
});

check("P3-API-04: API supports scope-based auth (memory:read, memory:write)", () => {
  const result = fileContains(
    "convex/missionControlApi.ts",
    '"memory:read"',
    '"memory:write"',
  );
  if (!result.exists) return { pass: false, reason: "missionControlApi.ts not found" };
  const missing = result.patterns.filter((p) => !p.found).map((p) => p.pattern);
  return missing.length === 0
    ? { pass: true }
    : { pass: false, reason: `Missing scopes: ${missing.join(", ")}` };
});

// ────────────────────────────────────────────────────────────────────────────
// Phase 3 UI Validation
// ────────────────────────────────────────────────────────────────────────────

check("P3-UI-01: Memory page component exists", () => {
  return fileExists("src/pages/Memory.tsx")
    ? { pass: true }
    : { pass: false, reason: "Memory.tsx not found" };
});

check("P3-UI-02: Memory page has search input", () => {
  const result = fileContains("src/pages/Memory.tsx", 'placeholder="Search"', 'placeholder=/search/i');
  if (!result.exists) return { pass: false, reason: "Memory.tsx not found" };
  // Check for search functionality via setQ or similar
  const hasSearch = fileContains("src/pages/Memory.tsx", "setQ(");
  return hasSearch.exists && hasSearch.patterns[0].found
    ? { pass: true }
    : { pass: false, reason: "Search input not found" };
});

check("P3-UI-03: Memory page has source filter", () => {
  const result = fileContains("src/pages/Memory.tsx", "All sources", "source");
  if (!result.exists) return { pass: false, reason: "Memory.tsx not found" };
  return result.patterns.every((p) => p.found)
    ? { pass: true }
    : { pass: false, reason: "Source filter not found" };
});

check("P3-UI-04: Memory page has sync status filter", () => {
  const result = fileContains("src/pages/Memory.tsx", "sync", "syncStatus");
  if (!result.exists) return { pass: false, reason: "Memory.tsx not found" };
  return result.patterns.some((p) => p.found)
    ? { pass: true }
    : { pass: false, reason: "Sync status filter not found" };
});

check("P3-UI-05: Memory page shows conflict count", () => {
  const result = fileContains("src/pages/Memory.tsx", "conflictCount", "conflict");
  if (!result.exists) return { pass: false, reason: "Memory.tsx not found" };
  return result.patterns.some((p) => p.found)
    ? { pass: true }
    : { pass: false, reason: "Conflict count display not found" };
});

check("P3-UI-06: Memory route is registered in App.tsx", () => {
  const result = fileContains("src/App.tsx", "/memory", "<Memory");
  if (!result.exists) return { pass: false, reason: "App.tsx not found" };
  return result.patterns.every((p) => p.found)
    ? { pass: true }
    : { pass: false, reason: "Memory route not registered" };
});

// ────────────────────────────────────────────────────────────────────────────
// Phase 3 E2E Tests Validation
// ────────────────────────────────────────────────────────────────────────────

check("P3-E2E-01: Phase 3 memory e2e tests exist", () => {
  return fileExists("e2e/mission-control-phase3-memory.spec.ts")
    ? { pass: true }
    : { pass: false, reason: "mission-control-phase3-memory.spec.ts not found" };
});

check("P3-E2E-02: E2E tests cover UI scenarios", () => {
  const result = fileContains(
    "e2e/mission-control-phase3-memory.spec.ts",
    "Phase 3: Memory Browser UI",
    "MC-P3-UI-01",
    "MC-P3-UI-02",
  );
  if (!result.exists) return { pass: false, reason: "E2E tests not found" };
  return result.patterns.every((p) => p.found)
    ? { pass: true }
    : { pass: false, reason: "UI test scenarios missing" };
});

check("P3-E2E-03: E2E tests cover API scenarios", () => {
  const result = fileContains(
    "e2e/mission-control-phase3-memory.spec.ts",
    "Phase 3: Memory API",
    "MC-P3-API-01",
    "/api/v1/memory",
  );
  if (!result.exists) return { pass: false, reason: "E2E tests not found" };
  return result.patterns.every((p) => p.found)
    ? { pass: true }
    : { pass: false, reason: "API test scenarios missing" };
});

check("P3-E2E-04: E2E tests cover sync scenarios", () => {
  const result = fileContains(
    "e2e/mission-control-phase3-memory.spec.ts",
    "Bidirectional Sync",
    "MC-P3-SYNC",
    "/api/v1/memory/sync",
  );
  if (!result.exists) return { pass: false, reason: "E2E tests not found" };
  return result.patterns.every((p) => p.found)
    ? { pass: true }
    : { pass: false, reason: "Sync test scenarios missing" };
});

check("P3-E2E-05: E2E tests cover performance gates", () => {
  const result = fileContains(
    "e2e/mission-control-phase3-memory.spec.ts",
    "Performance Gates",
    "MC-P3-PERF",
    "500ms",
  );
  if (!result.exists) return { pass: false, reason: "E2E tests not found" };
  return result.patterns.every((p) => p.found)
    ? { pass: true }
    : { pass: false, reason: "Performance test scenarios missing" };
});

// ────────────────────────────────────────────────────────────────────────────
// Run All Checks
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🧪 Mission Control Phase 3 Validation\n");
  console.log("=".repeat(60));

  let passed = 0;
  let failed = 0;

  for (const { name, fn } of CHECKS) {
    try {
      const result = await fn();
      if (result.pass) {
        console.log(`✅ ${name}`);
        passed++;
      } else {
        console.log(`❌ ${name}`);
        console.log(`   → ${result.reason}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   → Error: ${error.message}`);
      failed++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log("✨ All Phase 3 validations passed!\n");
  } else {
    console.log("⚠️  Some validations failed. See details above.\n");
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
