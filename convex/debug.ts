import { query } from "./_generated/server";

export const debugDatabase = query({
	args: {},
	handler: async (ctx) => {
		const users = await ctx.db.query("users").collect();
		const subscriptions = await ctx.db.query("subscriptions").collect();
		const purchases = await ctx.db.query("purchases").collect();
		const courses = await ctx.db.query("courses").collect();

		return {
			users: users.map(u => ({ id: u._id, email: u.email, clerkId: u.clerkId, stripeCustomerId: u.stripeCustomerId, currentSubscriptionId: u.currentSubscriptionId })),
			subscriptions: subscriptions.map(s => ({ id: s._id, userId: s.userId, planType: s.planType, status: s.status, stripeSubscriptionId: s.stripeSubscriptionId })),
			purchases: purchases.map(p => ({ id: p._id, userId: p.userId, courseId: p.courseId, amount: p.amount })),
			courses: courses.map(c => ({ id: c._id, title: c.title, price: c.price })),
		};
	},
}); 