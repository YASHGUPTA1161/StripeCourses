# Environment Variables Setup

You need to create a `.env.local` file in your project root with the following variables:

## Required Environment Variables

### Clerk Authentication
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here
CLERK_WEBHOOK_SECRET=whsec_your_clerk_webhook_secret_here
```

### Convex
```
NEXT_PUBLIC_CONVEX_URL=https://your-deployment-name.convex.cloud
```

### Stripe
```
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here
STRIPE_MONTHLY_PRICE_ID=price_your_monthly_price_id_here
STRIPE_YEARLY_PRICE_ID=price_your_yearly_price_id_here
```

### App URL
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Resend (for emails)
```
RESEND_API_KEY=re_your_resend_api_key_here
```

### Upstash Redis (for rate limiting)
```
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
```

## How to get these values:

1. **Clerk**: Go to your Clerk dashboard and get the publishable key, secret key, and webhook secret
2. **Convex**: Run `bunx convex dev` and it will create the deployment URL
3. **Stripe**: Go to your Stripe dashboard and create products/prices for monthly and yearly plans
4. **Resend**: Sign up at resend.com and get your API key
5. **Upstash Redis**: Sign up at upstash.com and create a Redis database

## Steps to fix the current issues:

1. **Add the missing CLERK_WEBHOOK_SECRET** to your `.env.local` file
2. Restart your development server: `bun run dev`
3. Restart Convex: `bunx convex dev`
4. Make sure your Clerk webhook is configured to point to your Convex function: `https://laudable-hippopotamus-744.convex.cloud/clerk-webhook`
5. Make sure your Stripe webhook is configured to point to: `https://your-domain.com/api/webhooks/stripe`

## Current Status:
✅ Most environment variables are set
❌ Missing CLERK_WEBHOOK_SECRET (this is causing webhook verification issues)
✅ Convex deployment is working
✅ Stripe keys are configured 