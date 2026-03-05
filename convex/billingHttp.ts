/**
 * HTTP action handlers for Stripe billing.
 *
 * POST /api/stripe/webhook — Stripe webhook (no auth, verified by signature)
 * POST /api/billing/checkout — Create Stripe Checkout session (requires auth)
 * POST /api/billing/portal  — Create Stripe Customer Portal session (requires auth)
 * GET  /api/billing/subscription — Get current user subscription (requires auth)
 */

import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import Stripe from "stripe";
import { requireAuth } from "./lib/auth";
import { jsonResponse, errorResponse } from "./lib/httpResponses";
import type { Id } from "./_generated/dataModel";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key);
}

function planFromPriceId(priceId: string): "pro" | "team" {
  if (priceId === process.env.STRIPE_TEAM_PRICE_ID) return "team";
  return "pro";
}

function mapStripeStatus(
  status: Stripe.Subscription.Status
): "active" | "canceled" | "past_due" | "trialing" | "incomplete" {
  switch (status) {
    case "canceled": return "canceled";
    case "past_due": return "past_due";
    case "trialing": return "trialing";
    case "incomplete":
    case "incomplete_expired": return "incomplete";
    default: return "active";
  }
}

/**
 * POST /api/stripe/webhook
 *
 * Handles: checkout.session.completed, customer.subscription.updated,
 *          customer.subscription.deleted
 */
export const stripeWebhook = httpAction(async (ctx, request) => {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing Stripe-Signature header", { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripeWebhook] Signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  console.log(`[stripeWebhook] Processing: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId = session.metadata?.userId as Id<"users"> | undefined;
        if (!userId) {
          console.error("[stripeWebhook] No userId in checkout session metadata");
          break;
        }

        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id ?? "";
        const plan = planFromPriceId(priceId);
        const periodEnd = subscription.items.data[0]?.current_period_end ?? 0;

        await ctx.runMutation(internal.billing.upsertSubscription, {
          userId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscriptionId,
          plan,
          status: mapStripeStatus(subscription.status),
          currentPeriodEnd: periodEnd * 1000,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });

        console.log(`[stripeWebhook] Upgraded ${userId} → ${plan}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const sub = await ctx.runQuery(internal.billing.querySubscriptionByStripeSubId, {
          stripeSubscriptionId: subscription.id,
        });

        if (!sub) {
          console.warn(`[stripeWebhook] No local record for subscription ${subscription.id}`);
          break;
        }

        const priceId = subscription.items.data[0]?.price.id ?? "";
        const plan = planFromPriceId(priceId);
        const periodEnd = subscription.items.data[0]?.current_period_end ?? 0;

        await ctx.runMutation(internal.billing.upsertSubscription, {
          userId: sub.userId,
          stripeCustomerId: sub.stripeCustomerId,
          stripeSubscriptionId: subscription.id,
          plan,
          status: mapStripeStatus(subscription.status),
          currentPeriodEnd: periodEnd * 1000,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const sub = await ctx.runQuery(internal.billing.querySubscriptionByStripeSubId, {
          stripeSubscriptionId: subscription.id,
        });

        if (!sub) break;

        await ctx.runMutation(internal.billing.upsertSubscription, {
          userId: sub.userId,
          stripeCustomerId: sub.stripeCustomerId,
          stripeSubscriptionId: subscription.id,
          plan: "free",
          status: "canceled",
          currentPeriodEnd: undefined,
          cancelAtPeriodEnd: false,
        });

        console.log(`[stripeWebhook] Downgraded ${sub.userId} → free (subscription deleted)`);
        break;
      }

      default:
        console.log(`[stripeWebhook] Unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error("[stripeWebhook] Handler error:", err);
    return new Response("Internal error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
});

/**
 * POST /api/billing/checkout
 * Body: { priceId, successUrl, cancelUrl }
 */
export const createCheckout = httpAction(async (ctx, request) => {
  try {
    const auth = await requireAuth(request);
    const user = await ctx.runQuery(api.auth.getUserByTurnkeyId, {
      turnkeySubOrgId: auth.turnkeySubOrgId,
    }) as { _id: Id<"users">; email?: string } | null;
    if (!user) return errorResponse(request, "User not found", 404);

    const body = await request.json() as { priceId: string; successUrl: string; cancelUrl: string };
    const { priceId, successUrl, cancelUrl } = body;

    if (!priceId || !successUrl || !cancelUrl) {
      return errorResponse(request, "priceId, successUrl, cancelUrl required", 400);
    }

    const url: string = await ctx.runAction(internal.billing.createCheckoutSession, {
      userId: user._id,
      email: user.email ?? "",
      priceId,
      successUrl,
      cancelUrl,
    });

    return jsonResponse(request, { url });
  } catch (err) {
    console.error("[createCheckout] error:", err);
    return errorResponse(request, err instanceof Error ? err.message : "Failed", 500);
  }
});

/**
 * POST /api/billing/portal
 * Body: { returnUrl }
 */
export const createPortal = httpAction(async (ctx, request) => {
  try {
    const auth = await requireAuth(request);
    const user = await ctx.runQuery(api.auth.getUserByTurnkeyId, {
      turnkeySubOrgId: auth.turnkeySubOrgId,
    }) as { _id: Id<"users"> } | null;
    if (!user) return errorResponse(request, "User not found", 404);

    const body = await request.json() as { returnUrl: string };

    const url: string = await ctx.runAction(internal.billing.createPortalSession, {
      userId: user._id,
      returnUrl: body.returnUrl,
    });

    return jsonResponse(request, { url });
  } catch (err) {
    console.error("[createPortal] error:", err);
    return errorResponse(request, err instanceof Error ? err.message : "Failed", 500);
  }
});

/**
 * GET /api/billing/subscription
 * Returns current plan info for authenticated user.
 */
export const getSubscription = httpAction(async (ctx, request) => {
  try {
    const auth = await requireAuth(request);
    const user = await ctx.runQuery(api.auth.getUserByTurnkeyId, {
      turnkeySubOrgId: auth.turnkeySubOrgId,
    }) as { _id: Id<"users"> } | null;
    if (!user) return errorResponse(request, "User not found", 404);

    const sub = await ctx.runQuery(internal.billing.querySubscriptionByUserId, {
      userId: user._id,
    });

    return jsonResponse(request, { subscription: sub, plan: sub?.plan ?? "free" });
  } catch (err) {
    console.error("[getSubscription] error:", err);
    return errorResponse(request, err instanceof Error ? err.message : "Failed", 500);
  }
});
