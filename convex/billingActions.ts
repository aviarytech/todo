"use node";
/**
 * Billing actions that require Node.js (Stripe SDK uses crypto, http, etc.)
 *
 * "use node" must be the first statement — stripe@20 uses Node.js built-in APIs
 * (crypto, events, child_process) that are not available in Convex's V8 isolate.
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";
import type { Id } from "./_generated/dataModel";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key);
}

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
