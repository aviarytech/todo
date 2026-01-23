# Feature: did:webvh Publication

## Overview

List owners can publish their lists to did:webvh for public discovery. Published lists are verifiable and can be viewed by anyone, but editing still requires an invite.

## User Stories

### Publish List
- **As a** list owner
- **I want to** publish my list publicly
- **So that** anyone can discover and view it

### View Public List
- **As a** visitor (not logged in)
- **I want to** view a published list
- **So that** I can see its contents

### Verify Provenance
- **As a** viewer
- **I want to** verify the list's cryptographic history
- **So that** I trust who added each item

## Acceptance Criteria

### Publishing
1. Owner clicks "Publish" on a list
2. System creates did:webvh for the list via Originals SDK
3. List DID is registered with resolver
4. Public URL generated (e.g., `lisa.app/public/{did}`)
5. Owner can unpublish at any time

### Public View
1. Anyone can access public URL
2. Shows list name, items, and attribution
3. Real-time updates (via Convex subscription)
4. No editing capabilities (read-only)
5. "Join this list" CTA (generates invite request)

### Verification
1. DID document is resolvable
2. Item credentials are verifiable
3. Chain of custody visible
4. Verification status shown per item

## Technical Specification

### Dependencies

```typescript
// Using existing @originals/sdk for did:webvh
import { OriginalsSDK } from '@originals/sdk';

// TurnkeyWebVHSigner from @originals/auth for signing
import { TurnkeyWebVHSigner, createTurnkeySigner } from '@originals/auth/server';
```

### Schema

```typescript
// convex/schema.ts

// Publication records
publications: defineTable({
  listId: v.id("lists"),
  webvhDid: v.string(),           // did:webvh:...
  publishedAt: v.number(),
  publishedByDid: v.string(),     // Owner who published
  status: v.union(
    v.literal("active"),
    v.literal("unpublished")
  ),
  didDocument: v.optional(v.string()), // Cached DID document JSON
  didLog: v.optional(v.string()),      // DID log for verification
})
  .index("by_list", ["listId"])
  .index("by_webvh_did", ["webvhDid"])
  .index("by_status", ["status"]),
```

### Publication Flow

```typescript
// src/lib/publication.ts

import { OriginalsSDK } from '@originals/sdk';
import { TurnkeyDIDSigner, createDIDWithTurnkey } from '@originals/auth/client';

export async function publishList(params: {
  listId: string;
  listName: string;
  turnkeyClient: TurnkeyClient;
  walletAccount: WalletAccount;
}): Promise<{ did: string; didDocument: unknown }> {
  const { listId, listName, turnkeyClient, walletAccount } = params;

  // Create did:webvh for the list
  const { did, didDocument, didLog } = await createDIDWithTurnkey({
    turnkeyClient,
    updateKeyAccount: walletAccount,
    authKeyPublic: walletAccount.address,
    assertionKeyPublic: walletAccount.address,
    updateKeyPublic: walletAccount.address,
    domain: 'lisa.aviary.tech',
    slug: `list-${listId}`,
  });

  return { did, didDocument, didLog };
}
```

### Convex Functions

```typescript
// convex/publication.ts

// Record publication
export const publishList = mutation({
  args: {
    listId: v.id("lists"),
    webvhDid: v.string(),
    didDocument: v.string(),
    didLog: v.string(),
    publisherDid: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user is owner
    const list = await ctx.db.get(args.listId);
    if (!list || list.ownerDid !== args.publisherDid) {
      throw new Error("Only the owner can publish a list");
    }

    // Check if already published
    const existing = await ctx.db
      .query("publications")
      .withIndex("by_list", q => q.eq("listId", args.listId))
      .first();

    if (existing && existing.status === "active") {
      throw new Error("List is already published");
    }

    if (existing) {
      // Re-publish
      return await ctx.db.patch(existing._id, {
        webvhDid: args.webvhDid,
        didDocument: args.didDocument,
        didLog: args.didLog,
        publishedAt: Date.now(),
        status: "active",
      });
    }

    return await ctx.db.insert("publications", {
      listId: args.listId,
      webvhDid: args.webvhDid,
      didDocument: args.didDocument,
      didLog: args.didLog,
      publishedAt: Date.now(),
      publishedByDid: args.publisherDid,
      status: "active",
    });
  },
});

// Unpublish a list
export const unpublishList = mutation({
  args: {
    listId: v.id("lists"),
    userDid: v.string(),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list || list.ownerDid !== args.userDid) {
      throw new Error("Only the owner can unpublish a list");
    }

    const pub = await ctx.db
      .query("publications")
      .withIndex("by_list", q => q.eq("listId", args.listId))
      .first();

    if (pub) {
      await ctx.db.patch(pub._id, { status: "unpublished" });
    }
  },
});

// Get public list by did:webvh
export const getPublicList = query({
  args: { webvhDid: v.string() },
  handler: async (ctx, args) => {
    const pub = await ctx.db
      .query("publications")
      .withIndex("by_webvh_did", q => q.eq("webvhDid", args.webvhDid))
      .first();

    if (!pub || pub.status !== "active") {
      return null;
    }

    const list = await ctx.db.get(pub.listId);
    if (!list) return null;

    // Get items
    const items = await ctx.db
      .query("items")
      .withIndex("by_list", q => q.eq("listId", pub.listId))
      .collect();

    // Enrich items with user display names
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const creator = await ctx.db
          .query("users")
          .withIndex("by_did", q => q.eq("did", item.createdByDid))
          .first();
        return {
          ...item,
          createdByName: creator?.displayName ?? "Unknown",
        };
      })
    );

    return {
      list,
      items: enrichedItems,
      publication: pub,
    };
  },
});

// Get publication status for a list
export const getPublicationStatus = query({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    const pub = await ctx.db
      .query("publications")
      .withIndex("by_list", q => q.eq("listId", args.listId))
      .first();

    return pub ?? null;
  },
});
```

### Public List Page

```typescript
// src/pages/PublicList.tsx

export function PublicList() {
  const { did } = useParams<{ did: string }>();
  const publicList = useQuery(api.publication.getPublicList,
    did ? { webvhDid: `did:webvh:${did}` } : "skip"
  );

  if (!publicList) {
    return <div>List not found or unpublished</div>;
  }

  const { list, items, publication } = publicList;

  return (
    <div>
      <header>
        <h1>{list.name}</h1>
        <VerificationBadge did={publication.webvhDid} />
      </header>

      <ul>
        {items.map(item => (
          <li key={item._id}>
            <span className={item.checked ? "checked" : ""}>
              {item.name}
            </span>
            <ItemAttribution item={item} />
            <VerifyButton credential={item.credential} />
          </li>
        ))}
      </ul>

      <footer>
        <RequestAccessButton listId={list._id} />
      </footer>
    </div>
  );
}
```

## UI Components

### PublishModal
- Confirmation dialog explaining public visibility
- Shows generated did:webvh
- Copy public URL button
- Publish/Cancel buttons

### VerificationBadge
- Shows verification status (verified/unverified)
- Click to see DID document details
- Link to resolver

### PublicListView
- Read-only list display
- Item attribution
- Per-item verification status
- "Request Access" CTA

### UnpublishConfirm
- Warning about public URL becoming invalid
- Confirm/Cancel buttons

## Security Considerations

- Published lists reveal item contents to anyone
- Owner must explicitly consent to publishing
- Unpublishing doesn't delete from caches immediately
- Item credentials don't reveal private keys
- Consider rate limiting public list access
