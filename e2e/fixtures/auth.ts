import type { Page } from "@playwright/test";

export interface SeededAuthUser {
  turnkeySubOrgId: string;
  email: string;
  did: string;
  displayName: string;
}

export function buildFakeJwt(expSecondsFromNow = 60 * 60 * 24): string {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: "e2e-user",
    exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
  };
  const encode = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode(header)}.${encode(payload)}.e2e-signature`;
}

export async function seedAuthSession(page: Page, user?: Partial<SeededAuthUser>) {
  const authUser: SeededAuthUser = {
    turnkeySubOrgId: user?.turnkeySubOrgId ?? "e2e-suborg-001",
    email: user?.email ?? "e2e+mission-control@poo.app",
    did: user?.did ?? "did:webvh:e2e.poo.app:users:e2e-suborg-001",
    displayName: user?.displayName ?? "E2E Mission Control",
  };

  const token = buildFakeJwt();
  const authState = {
    user: authUser,
    token,
  };

  await page.addInitScript(({ state, jwt }) => {
    localStorage.setItem("lisa-auth-state", JSON.stringify(state));
    localStorage.setItem("lisa-jwt-token", jwt);
  }, { state: authState, jwt: token });
}
