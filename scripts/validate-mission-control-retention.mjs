import fs from "node:fs";

const checks = [
  {
    file: "convex/crons.ts",
    mustInclude: ["mission-control-artifact-retention", "runArtifactRetentionSweep"],
  },
  {
    file: "convex/schema.ts",
    mustInclude: ["missionArtifactDeletionLogs", "schedulerJobId", "by_run_created"],
  },
  {
    file: "convex/missionControlCore.ts",
    mustInclude: ["runArtifactRetentionSweep", "SYSTEM_RETENTION_ACTOR_DID", "trigger: \"system\""],
  },
];

let failed = false;
for (const check of checks) {
  const content = fs.readFileSync(check.file, "utf8");
  for (const token of check.mustInclude) {
    if (!content.includes(token)) {
      failed = true;
      console.error(`[retention-validate] missing '${token}' in ${check.file}`);
    }
  }
}
if (failed) process.exit(1);
console.log("[retention-validate] OK");
