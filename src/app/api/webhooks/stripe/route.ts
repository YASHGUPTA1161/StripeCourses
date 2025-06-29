import Stripe from "stripe";
import stripe from "@/lib/stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import resend from "@/lib/resend";
import PurchaseConfirmationEmail from "@/emails/PurchaseConfirmationEmail";
import ProPlanActivatedEmail from "@/emails/ProPlanActivatedEmail";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
	const body = await req.text();
	const signature = req.headers.get("Stripe-Signature") as string;

	console.log("Webhook received:", { bodyLength: body.length, signature: signature ? "present" : "missing" });

	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
		console.log("Webhook signature verified, event type:", event.type);
	} catch (err: unknown) {
		const error = err as Error;
		console.log(`Webhook signature verification failed.`, error.message);
		return new Response("Webhook signature verification failed.", { status: 400 });
	}

	try {
		switch (event.type) {
			case "checkout.session.completed":
				console.log("Processing checkout.session.completed");
				await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
				break;
			case "customer.subscription.created":
			case "customer.subscription.updated":
				console.log("Processing subscription event:", event.type);
				await handleSubscriptionUpsert(event.data.object as Stripe.Subscription, event.type);
				break;
			case "customer.subscription.deleted":
				console.log("Processing subscription deleted");
				await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
				break;
			default:
				console.log(`Unhandled event type: ${event.type}`);
				break;
		}
		console.log("Webhook processing completed successfully");
	} catch (error: unknown) {
		const err = error as Error;
		console.error(`Error processing webhook (${event.type}):`, err);
		return new Response("Error processing webhook", { status: 400 });
	}

	return new Response(null, { status: 200 });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
	console.log("Handling checkout session completed:", { sessionId: session.id, metadata: session.metadata });
	
	// Check if this is a subscription purchase (has userId and planId in metadata)
	if (session.metadata?.userId && session.metadata?.planId) {
		console.log("This is a subscription purchase, skipping course purchase logic");
		return; // Subscription purchases are handled by subscription events
	}
	
	const courseId = session.metadata?.courseId;
	const stripeCustomerId = session.customer as string;

	if (!courseId || !stripeCustomerId) {
		console.error("Missing courseId or stripeCustomerId:", { courseId, stripeCustomerId });
		throw new Error("Missing courseId or stripeCustomerId");
	}

	console.log("Looking up user by stripe customer id:", stripeCustomerId);
	const user = await convex.query(api.users.getUserByStripeCustomerId, { stripeCustomerId });

	if (!user) {
		console.error("User not found for stripe customer id:", stripeCustomerId);
		throw new Error("User not found");
	}

	console.log("User found, recording purchase:", { userId: user._id, courseId, amount: session.amount_total });
	await convex.mutation(api.purchases.recordPurchase, {
		userId: user._id,
		courseId: courseId as Id<"courses">,
		amount: session.amount_total as number,
		stripePurchaseId: session.id,
	});
	console.log("Purchase recorded successfully");

	if (
		session.metadata &&
		session.metadata.courseTitle &&
		session.metadata.courseImageUrl &&
		process.env.NODE_ENV === "development"
	) {
		await resend.emails.send({
			from: "MasterClass <onboarding@resend.dev>",
			to: user.email,
			subject: "Purchase Confirmed",
			react: PurchaseConfirmationEmail({
				customerName: user.name,
				courseTitle: session.metadata?.courseTitle,
				courseImage: session.metadata?.courseImageUrl,
				courseUrl: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${courseId}`,
				purchaseAmount: session.amount_total! / 100,
			}),
		});
	}
}

async function handleSubscriptionUpsert(subscription: Stripe.Subscription, eventType: string) {
	console.log("Handling subscription upsert:", { subscriptionId: subscription.id, status: subscription.status, eventType });
	
	if (subscription.status !== "active" || !subscription.latest_invoice) {
		console.log(`Skipping subscription ${subscription.id} - Status: ${subscription.status}, has invoice: ${!!subscription.latest_invoice}`);
		return;
	}

	const stripeCustomerId = subscription.customer as string;
	console.log("Looking up user by stripe customer id:", stripeCustomerId);
	const user = await convex.query(api.users.getUserByStripeCustomerId, { stripeCustomerId });

	if (!user) {
		console.error(`User not found for stripe customer id: ${stripeCustomerId}`);
		throw new Error(`User not found for stripe customer id: ${stripeCustomerId}`);
	}

	console.log("User found, upserting subscription:", { userId: user._id, subscriptionId: subscription.id });
	try {
		await convex.mutation(api.subscriptions.upsertSubscription, {
			userId: user._id,
			stripeSubscriptionId: subscription.id,
			status: subscription.status,
			planType: subscription.items.data[0].plan.interval as "month" | "year",
			currentPeriodStart: subscription.items.data[0].current_period_start,
			currentPeriodEnd: subscription.items.data[0].current_period_end,
			cancelAtPeriodEnd: subscription.cancel_at_period_end,
		});
		console.log(`Successfully processed ${eventType} for subscription ${subscription.id}`);

		const isCreation = eventType === "customer.subscription.created";

		if (isCreation && process.env.NODE_ENV === "development") {
			await resend.emails.send({
				from: "MasterClass <onboarding@resend.dev>",
				to: user.email,
				subject: "Welcome to MasterClass Pro!",
				react: ProPlanActivatedEmail({
					name: user.name,
					planType: subscription.items.data[0].plan.interval,
					currentPeriodStart: subscription.items.data[0].current_period_start,
					currentPeriodEnd: subscription.items.data[0].current_period_end,
					url: process.env.NEXT_PUBLIC_APP_URL!,
				}),
			});
		}
	} catch (error: unknown) {
		const err = error as Error;
		console.error(`Error processing ${eventType} for subscription ${subscription.id}:`, err);
	}
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
	try {
		await convex.mutation(api.subscriptions.removeSubscription, {
			stripeSubscriptionId: subscription.id,
		});
		console.log(`Successfully deleted subscription ${subscription.id}`);
	} catch (error: unknown) {
		const err = error as Error;
		console.error(`Error deleting subscription ${subscription.id}:`, err);
	}
}