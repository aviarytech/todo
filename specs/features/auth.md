# Feature: Turnkey Authentication

## Overview

Replace localStorage-based identity with Turnkey-managed keys via @originals/auth. Users authenticate with email OTP and their cryptographic keys are securely managed by Turnkey's infrastructure.

## User Stories

### Email Login
- **As a** new or returning user
- **I want to** sign in with my email
- **So that** my identity is secure and portable across devices

### Key Management
- **As a** user
- **I want to** sign list actions without handling private keys
- **So that** my keys stay secure

### Migration
- **As an** existing user (localStorage identity)
- **I want to** upgrade to Turnkey
- **So that** my keys are more secure

## Acceptance Criteria

### Login Flow
1. User opens app without session → sees Login page
2. User enters email → receives OTP via email
3. User enters OTP → authenticated, redirected to Home
4. New users get a Turnkey sub-organization + wallet created
5. Session persists across page refreshes (httpOnly cookie)

### Authenticated Actions
1. Creating lists uses `TurnkeyDIDSigner` for signing
2. Adding/checking items uses Turnkey for credential signing
3. Session expiry prompts re-authentication (not data loss)

### Migration (Existing Users)
1. Detect localStorage identity on login
2. Prompt: "Upgrade to secure auth?"
3. If yes: link Turnkey account to existing DID
4. If no: continue with localStorage (deprecated, warn)

## Technical Specification

### Dependencies
```json
{
  "@originals/auth": "^1.5.0",
  "@turnkey/core": "^1.10.0"
}
```

### Client-Side Flow

```typescript
import {
  initializeTurnkeyClient,
  initOtp,
  completeOtp,
  fetchWallets,
  TurnkeyDIDSigner,
  createDIDWithTurnkey
} from '@originals/auth/client';

// 1. Initialize client
const turnkeyClient = initializeTurnkeyClient();

// 2. Start OTP flow
const otpId = await initOtp(turnkeyClient, email);

// 3. Complete OTP
const { sessionToken, userId, action } = await completeOtp(
  turnkeyClient,
  otpId,
  otpCode,
  email
);

// 4. Ensure wallet exists
const wallets = await ensureWalletWithAccounts(turnkeyClient);

// 5. Create DID (new users only)
const { did, didDocument } = await createDIDWithTurnkey({
  turnkeyClient,
  updateKeyAccount: wallets[0].accounts[0],
  // ... key params
  domain: 'lisa.aviary.tech',
  slug: userId
});

// 6. Sign actions with TurnkeyDIDSigner
const signer = new TurnkeyDIDSigner(
  turnkeyClient,
  walletAccount,
  publicKeyMultibase
);
```

### Convex Auth Integration

```typescript
// convex/auth.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Register/update user after Turnkey auth
export const upsertUser = mutation({
  args: {
    turnkeySubOrgId: v.string(),
    email: v.string(),
    did: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find existing user by Turnkey ID
    const existing = await ctx.db
      .query("users")
      .withIndex("by_turnkey_id", q => q.eq("turnkeySubOrgId", args.turnkeySubOrgId))
      .first();

    if (existing) {
      // Update last login
      return await ctx.db.patch(existing._id, {
        lastLoginAt: Date.now()
      });
    }

    // Create new user
    return await ctx.db.insert("users", {
      turnkeySubOrgId: args.turnkeySubOrgId,
      email: args.email,
      did: args.did,
      displayName: args.displayName ?? args.email.split('@')[0],
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    });
  },
});
```

### Updated User Schema

```typescript
// convex/schema.ts
users: defineTable({
  // Existing
  did: v.string(),
  displayName: v.string(),
  createdAt: v.number(),
  // NEW
  turnkeySubOrgId: v.optional(v.string()), // Turnkey sub-org ID
  email: v.optional(v.string()),
  lastLoginAt: v.optional(v.number()),
  legacyIdentity: v.optional(v.boolean()), // true if still using localStorage
})
  .index("by_did", ["did"])
  .index("by_turnkey_id", ["turnkeySubOrgId"])
  .index("by_email", ["email"]),
```

### useAuth Hook

```typescript
// src/hooks/useAuth.tsx
interface AuthContextValue {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;

  // Actions
  startOtp: (email: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  logout: () => void;

  // Signing (replaces privateKey exposure)
  signCredential: (data: unknown) => Promise<string>;
  getSigner: () => TurnkeyDIDSigner;
}
```

## UI Components

### LoginForm
- Email input with validation
- "Send Code" button
- Transitions to OTP input after sending

### OtpInput
- 6-digit code input (auto-focus, auto-submit)
- Resend code link (with cooldown)
- Error display

### AuthGuard
- Wrapper component for authenticated routes
- Redirects to /login if not authenticated
- Shows loading state while checking auth

## Security Considerations

- Session tokens stored in httpOnly cookies (not accessible to JS)
- CSRF protection via SameSite=Strict cookies
- Short session lifetime (24h) with refresh mechanism
- Turnkey's secure enclave protects private keys
- No private keys ever exposed to frontend code

## Migration Strategy

1. **Phase 1:** Add Turnkey auth alongside localStorage
2. **Phase 2:** Prompt existing users to migrate
3. **Phase 3:** Deprecate localStorage auth (show warnings)
4. **Phase 4:** Remove localStorage auth support
