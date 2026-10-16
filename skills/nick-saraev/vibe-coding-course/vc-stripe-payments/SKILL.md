---
name: vc-stripe-payments
description: Adds Stripe payments to a vibe-coded app using Nick Saraev's pattern: pick one-time, subscription or credit-based model, create a Stripe sandbox, give the agent the publishable and secret keys via .env, build the three required pieces (checkout session endpoint, webhook endpoint that updates Supabase, entitlement check before expensive actions), test with the 4242 card, and debug the common redirect and credit bugs. Use when Caleb says "add payments", "charge for this", "sell credits", "Stripe checkout", "the payment went through but it keeps sending me back to /payment", "credits aren't going down", or wants to monetize an AIRE tool for other agents or investors.
---

# Stripe payments: plans, credits, checkout, webhooks

**Source:** Nick Saraev, "VIBE CODING FULL COURSE: Gemini 3.1 + Antigravity (6 Hrs)", chapters 37-39, 42-43, 46 (https://www.youtube.com/watch?v=gcuR_-rzlDw&t=13669s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=13837s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=16714s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=21000s)

## What Nick teaches

Payments sit between auth and usage: **sign up > payment page (pick a plan or buy credits) > entitlement (access granted) > consumption (use the app) > back to payment when credits run out.** "It's adding another whole problem you have to solve, which is why I wanted to push it off as long as possible."

### Why Stripe
Nobody processes cards themselves. You redirect to a Stripe-hosted checkout, Stripe handles the card, fraud detection, tax, receipts, and recurring billing. You never touch a card number. Cost at recording time: about 2.9% + 30 cents per transaction (may have changed). Nick is "very happy to pay" to avoid the legal liability. If Stripe is unavailable in your country, PayPal or Payoneer are weaker but workable substitutes.

### Three monetization models
1. **One-time purchase**: pay once, access forever. Flip a boolean on the user row (`subscribed: true`).
2. **Subscription**: monthly or annual. Stripe manages recurrence. On `payment succeeded` keep access, on `payment failed` flip it off.
3. **Credit-based**: buy a bucket. Every expensive action decrements. At zero, send them back to checkout.
Lead scraper: monthly plan with credits, or credits only. Thumbnail generator: credits ("maybe 3 credits per generation, $1 = 10 credits"). Splinter: $19/month, $190/year, with a free tier of 5 generations and a "try before you pay" wizard, then force payment after onboarding so reciprocity helps conversion.

### Three pieces of code the agent must build
1. An **endpoint that creates a Stripe Checkout Session** and redirects the user (with their user ID attached). After signup the user lands on a page with the pricing options.
2. A **webhook endpoint** that waits for Stripe's `payment succeeded` event and updates the user's row in Supabase (`plan = pro` or `credits = 50`).
3. An **entitlement check** inside the app before every expensive action: does this user have a valid plan or enough credits?

### Setup
- stripe.com, create an account (identity verification takes a while). Top right: **Test mode** toggle. Top left: **Switch sandbox > Create sandbox**, modeled on your real account.
- Copy the sandbox **publishable key** and **secret key** into `.env` (`STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`). "Never reveal your real keys, a developer would have full access over literally everything."
- Prompt: "I've added the Stripe publishable key and secret key. Connect the payment feature as well. You may have to adjust the SQL migration script, so do this first." Antigravity lets you queue this message while the agent is mid-task.
- Schema it produced: `users` with `id, email, credits, stripe_customer_id, subscription_id, default_prompt, face_images_b64, created_at`.
- Test card: **4242 4242 4242 4242**, any future date, any CVC. Do not save the card.
- Do Stripe **after the app is live** when you can. Stripe callbacks and webhooks want a public URL (Nick deferred it on Splinter for this reason). The audit later added a **webhook signing secret** check (`STRIPE_WEBHOOK_SECRET`).

### Bugs Nick hit and the prompts that fixed them
- **Plan auto-selected**: exiting checkout dumped him into the dashboard on Starter. "Allow the user to select which plan they want on the payment page. It should also take into account which button they clicked on the landing page." Result: `/payment?plan=pro` and the query param survives through `/login?plan=pro`.
- **Proceed to checkout does nothing**: "When I click proceed to checkout, nothing occurs. Do we need to open a Stripe checkout window or is the payment occurring locally? I'm using a Stripe sandbox so we should be able to test the payment and have all the events run true."
- **Paid but bounced back to /payment**: "The Stripe checkout payment went through but it redirected me to the /payment route. If I go to dashboard it continuously pushes me back despite the payment. We need to find a way to validate that the user's actually done the payment." Fix was secure endpoints verifying the Checkout Session ID. He checked the Stripe dashboard to confirm payments were arriving ("we're receiving the payments, we're not capable of connecting that back to a person") and relayed that so the agent would not loop.
- **Zero credits on sign-in**: "If a user has zero credits upon sign-in, redirect them to a payment page where they can select how many credits to purchase. That should occur every time a user is at zero."
- **Credits not consumed** (Splinter): "I'm not seeing any credit consumption." Fixed server-side.
- **Lag after the payment fix**: fetching on every page load. "Diagnose whether this is a persistent error or prefilling. Cache on sign-in, refetch on mutation."
- **Delight**: "When a user pays, add some confetti upon the redirect, only when they make it back after paying." Manage Subscription gave him a Stripe-hosted portal for free.

## Step by step

1. Decide the model: one-time, subscription or credits. Define credit cost per action and price per bundle.
2. Create a Stripe sandbox, copy publishable and secret keys into `.env`.
3. Deploy the app first if possible (webhooks need a URL). Set the webhook endpoint in Stripe to `https://<site>/api/stripe/webhook` and store the signing secret.
4. Prompt the agent to build the three pieces and update the migration. Run the new SQL in Supabase.
5. Test with 4242: new account > pick plan > checkout > return > dashboard shows credits or plan.
6. Test entitlement: spend credits to zero, confirm redirect to payment. Confirm decrement per action and no double writes.
7. Check Stripe dashboard shows the payment linked to the customer. Test Manage Subscription.
8. Add the webhook secret check in the security audit.

## Templates / prompts

Payments prompt:
```
I've added STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY (sandbox) to .env.
Connect payments end to end:
1. Pricing page after signup with [Starter/Pro/Agency] options, honoring
   ?plan= from the landing page buttons.
2. An endpoint that creates a Stripe Checkout Session tied to the Supabase
   user ID and redirects.
3. A webhook endpoint that verifies the Stripe signature, handles
   checkout.session.completed / invoice.paid / invoice.payment_failed, and
   updates users.credits or users.plan.
4. A server-side entitlement check before every [expensive action];
   decrement credits by [N] per action; redirect to /payment at zero.
Adjust the SQL migration first and give me the SQL to run.
```

Payment debug report:
```
Stripe shows the payment succeeded for [email], but the app redirects me
back to /payment and /dashboard bounces. We're not linking the payment
back to the user. Validate the checkout session server-side on return
and update the user row. Here's the Stripe event JSON: [paste]
```

Pricing rule of thumb from the course:
```
Credits: cost per action to you (API) x markup. Example: user pays $10,
each use costs $1, $9 margin. 3 credits per generation, $1 = 10 credits.
Subscription: top tier = 10% of value delivered, mid = half price at 8x ROI,
entry = lower at 6x ROI (see vc-value-based-pricing).
```

## Pitfalls Nick calls out

- Real keys in the wrong place can mean a "$10 million bill." Sandbox only until launch.
- Webhooks against localhost do not work. Deploy or tunnel first.
- The model will "forget" that checkout must open a Stripe window. Ask directly.
- Payment logic can introduce fetch-on-every-load lag. Ask for caching.
- Double saves and credit miscounts show up only when you count. Count.
- Providers may restrict reselling their AI tokens. Check terms before selling credits on someone else's API.

## How Caleb should use this

- If Caleb packages an AIRE tool for other KW agents (listing description generator, follow-up writer), credits are the simplest model: he pays Anthropic per call and sells credit packs at a markup.
- Investor-facing deal analyzer could be a monthly subscription with a free tier of a few analyses.
- Creating a live Stripe account, moving from sandbox to live keys, or publishing a pricing page: needs Caleb's approval before running.
- Keep all Stripe keys and the webhook secret in `.env` and run the security audit before taking real money.

## Verification

- 4242 checkout completes, returns to the app, and the user row shows the new plan or credit balance.
- Stripe dashboard shows the payment with the right customer email.
- Expensive action decrements credits by exactly N once, and at zero the app redirects to payment.
- Webhook endpoint rejects requests with a bad signature.
