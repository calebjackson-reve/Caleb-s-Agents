---
name: vc-value-based-pricing
description: Prices a product, app or service using Nick Saraev's value-based pricing (VBP): quantify direct expense savings plus opportunity-cost revenue the customer gains, charge 10 to 20 percent of that value as the top tier, then set mid and entry tiers at roughly half price with lower (8x, 6x) ROI. Use when Caleb says "how much should I charge for this", "price the AIRE tool for other agents", "set up pricing tiers", "is $49 a month too much", "what's my ROI pitch", or is packaging any AI or automation service for KW agents, investors or clients.
---

# Value-based pricing and tiering

**Source:** Nick Saraev, "VIBE CODING FULL COURSE: Gemini 3.1 + Antigravity (6 Hrs)", chapter 47 (https://www.youtube.com/watch?v=gcuR_-rzlDw&t=21240s)

## What Nick teaches

Nick says his businesses make over $300,000 a month in profit and that VBP is the one principle he returns to for everything from automation services to multi-billion dollar portfolio deals. **Price on the value your product delivers, not on your costs or your competitors' prices.** Competitor anchoring turns into a freelance-platform race to zero. Instead, establish how valuable the product is and charge "such a vanishingly small percentage of said value that the customers are bought in regardless."

### Two kinds of B2B value
1. **Direct expense savings**: money the customer stops spending. Old tool costs $100/month, yours costs $5, you saved them $95.
2. **Opportunity cost / revenue unlocked**: time you give back, priced at what that time is worth, plus what they earn with it. A salesperson paid $100/hour spends 2 hours a day on CRM admin. Remove it: $200/day expense saved. In those 2 hours they contact 50 people, 1 in 50 buys a $500 product: +$500/day revenue. Total value: **$700/day**. Usually the revenue side dwarfs the expense side.
(B2C has non-material value types too, which he leaves aside.)

### Worked example: Thumbly
- Current cost: $50 per thumbnail x 20 per month = $1,000/month saved.
- Time: 2 hours per thumbnail down to 5 minutes = 115 minutes saved x 20 = 2,300 minutes, about 40 hours. Say the designer earns an extra $1,000/month with that time.
- Total value created: **$2,000/month**.
- Charge about 10%: **$200/month**. Customer makes 10x what they pay. "Facts and logic" instead of worrying about "the dude in the next cubicle."

### Tiering
Set the VBP number as the **top tier** ($200, 10x ROI). **Mid tier** at about half ($100) but with reduced ROI (8x). **Entry tier** lower again at 6x ROI. This gives product differentiation and a spread of values until you have enough customers to A/B test $37 vs $58. Across his businesses the charge lands at **10 to 20% of the total ROI**.

### The buyer's mental math
"I could put my money in the S&P 500 and make 8% a year, or give it to Nick Co. and make 1,000%." Whether they buy is the math plus whether they believe the math, and belief is marketing (see `vc-distribution-go-to-market`).

### Credits and unit economics (from the Stripe module)
Behind the tiers, know your cost per action. "They pay $10 and every usage costs us $1, so we make $9." Example scheme: 3 credits per generation, $1 = 10 credits. Lead credits at about $0.05 each with volume discounts on larger packs.

## Step by step

1. Name the customer and the job your product does for them.
2. Expense side: what do they pay today for that job (tools, contractors, per-unit costs)? Subtract what they will pay you. Monthly.
3. Time side: hours saved per month x their hourly value, plus revenue they can realistically generate in those hours (contacts x conversion x average sale).
4. Total value per month. Multiply by 10 to 20% for the top tier price.
5. Mid tier at about half the top price with 8x ROI. Entry tier at 6x ROI.
6. Check unit economics: your API or delivery cost per action must leave margin at the entry tier.
7. Write the ROI sentence for the sales page: "For $X a month you get back $Y, a Zx return."
8. Revisit after 20 customers with real usage data.

## Templates / prompts

VBP worksheet:
```
Customer: ____________________
Job done:  ____________________

EXPENSE SAVINGS
Current spend on this job / month:      $______
Our price (fill after step 4):          $______
Net expense saved:                       $______

OPPORTUNITY COST
Hours saved per unit: ____ x units/month ____ = ____ hours
Hourly value: $____  -> time value $______
Revenue unlocked: contacts ____ x conv rate ____ x avg sale $____ = $______

TOTAL VALUE / MONTH:                     $______
TOP TIER (10-20% of value):              $______   (ROI ___x)
MID TIER (about half, 8x ROI):           $______
ENTRY TIER (6x ROI):                     $______

UNIT COST per action: $____  Margin at entry tier: ____%
```

Prompt to run the math with Claude:
```
Using value-based pricing, price [product] for [customer]. Estimate direct
expense savings and opportunity-cost revenue with stated assumptions, total
monthly value, then propose top/mid/entry tiers at 10x/8x/6x ROI with the
top tier at 10 to 20% of value. Show the unit cost per action and margin.
Write one ROI sentence for the landing page.
```

## Pitfalls Nick calls out

- Anchoring to competitors drags you into a race to the bottom.
- Pricing per customer is impossible at scale, so pick package prices from the average and accept variance.
- The math only sells if the buyer believes it. Proof and marketing carry the number.
- Do not skip unit costs when reselling AI tokens or scrapes.
- Prices and ROI multiples above are Nick's at recording time, not rules of nature.

## How Caleb should use this

- Pricing an AIRE listing-description or follow-up tool for other KW agents: value = hours saved per listing x the agent's hourly value + extra closings from faster follow-up. Charge 10 to 20% of that.
- Pricing a seller-side service (automated showing feedback and weekly marketing report): compare with the assistant hours it replaces.
- Investor deal-analyzer subscription: value = analyst time saved plus one avoided bad deal.
- Publishing a pricing page or changing prices on a live product: needs Caleb's approval before running.

## Verification

- A filled worksheet with explicit assumptions exists for the product.
- Top tier price is between 10 and 20% of computed monthly value.
- Three tiers with descending ROI multiples and positive margin at the entry tier.
- The landing page carries one plain ROI sentence that matches the worksheet.
