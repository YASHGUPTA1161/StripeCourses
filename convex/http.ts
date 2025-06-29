import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import stripe from "../src/lib/stripe";
// import resend from "../src/lib/resend";
// import WelcomeEmail from "../src/emails/WelcomeEmail";

const http = httpRouter();

const clerkWebhook = httpAction(async (ctx, request) => {
	try {
		const payload = await request.json();
		const eventType = payload.type;

		if (eventType === "user.created") {
			const { id, email_addresses, first_name, last_name } = payload.data;
			const email = email_addresses[0]?.email_address;
			const name = `${first_name || ""} ${last_name || ""}`.trim();

			if (!email) {
				console.error("No email found in webhook payload");
				return new Response("No email found", { status: 400 });
			}

			try {
				const customer = await stripe.customers.create({
					email,
					name,
					metadata: { clerkId: id },
				});

				await ctx.runMutation(api.users.createUser, {
					email,
					name,
					clerkId: id,
					stripeCustomerId: customer.id,
				});

				console.log(`User created successfully: ${email}`);

				// Temporarily disabled email sending to avoid MessageChannel error
				// if (process.env.NODE_ENV === "development") {
				// 	await resend.emails.send({
				// 		from: "MasterClass <onboarding@resend.dev>",
				// 		to: email,
				// 		subject: "Welcome to MasterClass!",
				// 		react: WelcomeEmail({ name, url: process.env.NEXT_PUBLIC_APP_URL! }),
				// 	});
				// }
			} catch (error) {
				console.error("Error creating user in Convex", error);
				return new Response("Error creating user", { status: 500 });
			}
		}
		
		return new Response("Webhook processed successfully", { status: 200 });
	} catch (error) {
		console.error("Webhook processing error:", error);
		return new Response("Internal server error", { status: 500 });
	}
});

http.route({
	path: "/clerk-webhook",
	method: "POST",
	handler: clerkWebhook,
});

export default http;