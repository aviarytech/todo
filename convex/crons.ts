import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily retention sweep at 03:17 UTC.
crons.cron(
  "mission-control-artifact-retention",
  "17 3 * * *",
  internal.missionControlCore.runArtifactRetentionSweep,
  {
    maxOwners: 250,
    maxRunsPerOwner: 250,
    schedulerJobId: "mission-control-artifact-retention",
  },
);

export default crons;
