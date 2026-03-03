export const ARTIFACT_TYPES = ["screenshot", "log", "diff", "file", "url"] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];
export type ArtifactRef = {
  type: ArtifactType;
  ref: string;
  label?: string;
  createdAt: number;
};

export function clampRetentionDays(value: number | undefined, fallback: number): number {
  return Math.min(Math.max(Math.floor(value ?? fallback), 1), 365);
}

export function computeRetentionCutoff(now: number, retentionDays: number): number {
  return now - retentionDays * 24 * 60 * 60 * 1000;
}

export function isValidArtifactRef(value: unknown): value is ArtifactRef {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.ref === "string" &&
    v.ref.length > 0 &&
    typeof v.createdAt === "number" &&
    Number.isFinite(v.createdAt) &&
    ARTIFACT_TYPES.includes(v.type as ArtifactType) &&
    (v.label === undefined || typeof v.label === "string")
  );
}

export function normalizeArtifactRefs(input: unknown): ArtifactRef[] {
  if (!Array.isArray(input)) return [];
  return input.filter(isValidArtifactRef);
}

export function selectStaleArtifacts(artifacts: ArtifactRef[], cutoff: number): ArtifactRef[] {
  return artifacts.filter((a) => a.createdAt < cutoff);
}

export function artifactFingerprint(artifacts: ArtifactRef[]): string {
  return artifacts.map((a) => `${a.type}|${a.ref}|${a.label ?? ""}|${a.createdAt}`).sort().join("\n");
}

export function shouldInsertDeletionLog(existingArtifacts: ArtifactRef[], candidateArtifacts: ArtifactRef[]): boolean {
  return artifactFingerprint(existingArtifacts) !== artifactFingerprint(candidateArtifacts);
}
