/**
 * Billing module — Stripe subscription management.
 *
 * Queries and mutations for the freemium billing model:
 * - Free: up to 5 lists, 3 collaborators per list
 * - Pro ($5/mo or $48/yr): unlimited lists/collaborators, VCs, templates, export
 * - Team ($12/user/mo): everything in Pro + team workspace, admin, API
 */

import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";
import type { Id } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Plan definitions (exported for frontend use)
// ---------------------------------------------------------------------------

export const PLANS = {
  free: { name: "Free", maxLists: 5, maxCollaborators: 3, vcIssuance: false, templates: false, export: false },
  pro: { name: "Pro", maxLists: Infinity, maxCollaborators: Infinity, vcIssuance: true, templates: true, export: true },
  team: { name: "Team", maxLists: Infinity, maxCollaborators: Infinity, vcIssuance: true, templates: true, export: true },
} as const;

export type Plan = keyof typeof PLANS;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key);
}

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

/**
 * Get current subscription for a user by userId. Returns null for free tier.
 */
export const getUserSubscription = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

/**
 * Get effective plan — defaults to "free" if no active subscription.
 */
export const getUserPlan = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<Plan> => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!sub || sub.status === "canceled" || sub.status === "past_due") return "free";
    return sub.plan as Plan;
  },
});

// ---------------------------------------------------------------------------
// Internal queries (used by HTTP actions and other internal actions)
// ---------------------------------------------------------------------------

export const querySubscriptionByUserId = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const querySubscriptionByStripeSubId = internalQuery({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, { stripeSubscriptionId }) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription", (q) =>
        q.eq("stripeSubscriptionId", stripeSubscriptionId)
      )
      .first();
  },
});

// ---------------------------------------------------------------------------
// Internal mutations
// ---------------------------------------------------------------------------

export const upsertSubscription = internalMutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("team")),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("trialing"),
      v.literal("incomplete")
    ),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    teamSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
    } else {
      await ctx.db.insert("subscriptions", { ...args, createdAt: now, updatedAt: now });
    }
  },
});

// ---------------------------------------------------------------------------
// Actions (called from billingHttp.ts via ctx.runAction)
// ---------------------------------------------------------------------------

/**
 * Create a Stripe Checkout session for upgrading to Pro or Team.
 * Returns the Stripe Checkout URL.
 */
export const createCheckoutSession = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    priceId: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, { userId, email, priceId, successUrl, cancelUrl }): Promise<string> => {
    const stripe = getStripe();

    const existingSub = await ctx.runQuery(internal.billing.querySubscriptionByUserId, { userId });
    let customerId: string;

    if (existingSub) {
      customerId = existingSub.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({ email, metadata: { userId } });
      customerId = customer.id;
      await ctx.runMutation(internal.billing.upsertSubscription, {
        userId,
        stripeCustomerId: customerId,
        plan: "free",
        status: "active",
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId },
      allow_promotion_codes: true,
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return session.url;
  },
});

/**
 * Create a Stripe Customer Portal session for managing existing subscription.
 */
export const createPortalSession = internalAction({
  args: {
    userId: v.id("users"),
    returnUrl: v.string(),
  },
  handler: async (ctx, { userId, returnUrl }): Promise<string> => {
    const stripe = getStripe();

    const sub = await ctx.runQuery(internal.billing.querySubscriptionByUserId, { userId });
    if (!sub) throw new Error("No billing record found. Please upgrade first.");

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl,
    });

    return session.url;
  },
});

// ---------------------------------------------------------------------------
// Plan enforcement helper (imported by other Convex modules)
// ---------------------------------------------------------------------------

type DbCtx = {
  db: {
    query(table: "subscriptions"): {
      withIndex(
        name: "by_user",
        fn: (q: { eq(field: "userId", val: Id<"users">): unknown }) => unknown
      ): { first(): Promise<{ plan: string; status: string } | null> };
    };
  };
};

const PLAN_ORDER: Plan[] = ["free", "pro", "team"];

export async function requirePlan(ctx: DbCtx, userId: Id<"users">, minPlan: Plan): Promise<void> {
  const sub = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  const currentPlan: Plan =
    sub && (sub.status === "active" || sub.status === "trialing")
      ? (sub.plan as Plan)
      : "free";

  if (PLAN_ORDER.indexOf(currentPlan) < PLAN_ORDER.indexOf(minPlan)) {
    throw new Error(`This feature requires the ${PLANS[minPlan].name} plan. Please upgrade at /pricing.`);
  }
}
