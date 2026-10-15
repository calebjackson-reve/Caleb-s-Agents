---
name: mk-race-bottleneck-thinking
description: Decides which marketing automation to build first by mapping the business to Nick Saraev's RACE pipeline (Reach, Acquire, Close, Expand) and finding the single bottleneck step that caps everything else. Use when Caleb says things like "what should I automate first", "where is AIRE leaking leads", "should I build the listing ad generator or the follow-up system", "my pipeline feels slow", or before starting any new marketing build for Keller Williams First Choice so the effort lands on the constraint instead of on whatever sounds coolest.
---

# RACE + Bottleneck Thinking: pick the right automation before building

**Source:** Nick Saraev, "Claude Code Marketing Full Course (6 Hours)", chapter 4 (https://www.youtube.com/watch?v=yulWjh3rq28&t=2837s)

## What Nick teaches

Every business is one pipeline: **Marketing** (strangers notice you) -> **Sales** (interest becomes money) -> **Fulfillment** (deliver what you promised) -> **Admin** (keeps the machine running). The course lives in the first two.

Nick's framework for where to put automation effort is **RACE**:

| Letter | Meaning | KPI | Side of the line |
|---|---|---|---|
| **R** Reach | Get seen | impressions, views | Marketing |
| **A** Acquire | Turn views into intent | form fills, booked meetings, opt-ins | Marketing |
| **C** Close | Turn intent into money | close rate | Sales |
| **E** Expand | Grow lifetime value | LTV | Sales |

Marketing is everything left of the Acquire/Close line. The course builds six specific levers under Reach and Acquire:

**Reach**
1. **Creative** - AI-orchestrated images, video, audio for ads and organic.
2. **Copy** - personalizing newsletters and templates so "Hey Nick, saw you talked about X last month" replaces "Hello, my offer does X".
3. **Outreach** - outbound marketing (cold email, DMs), which Nick learned door to door and treats as a reach lever.

**Acquire**
4. **Speed to lead** - respond within ~30 seconds of a form fill. Nick's claim: took a home-services company from $3M/month to $9M/month on this lever alone.
5. **Booking percentage** - cut opt-in forms from ~10 questions to 3 or 4 and let Claude research the prospect to backfill qualification.
6. **Follow-up** - autonomous nurturing that still feels personal.

### Bottleneck (constraint) thinking

Nick's factory analogy: 100 units of raw material per day enter a line with step A (capacity 100/day) and step B (capacity 10/day). Daily output is 10. Doubling A changes nothing. Doubling B doubles the whole business.

Rules he draws from it:
- The whole operation runs at the speed of its narrowest step.
- Improving a non-bottleneck step produces zero monetary return, no matter how impressive the build.
- Widening the bottleneck by a little improves the whole business by the same multiple (10 -> 20 units = business doubled).
- It is "freeing": you can ignore creative, leads, and follow-up entirely if booking is the constraint, and only work on booking.
- "Don't just throw these systems at the companies you work with." Every build in the course is a solution to a specific bottleneck, and should only be applied when that is the current constraint.
- Example: the ad-creative generator only makes sense for a business with lots of ideas and distribution but not enough creative output.

## Step by step

1. Draw Caleb's pipeline as RACE. List the actual numbers for each stage over the last 30 to 90 days (impressions, inquiries/form fills, appointments, signed clients, closings).
2. Compute the conversion between each stage. The stage with the worst ratio relative to what Caleb can handle is the candidate bottleneck.
3. Sanity check with the factory test: "If I doubled this step tomorrow, would closings go up?" If no, it is not the bottleneck.
4. Map the bottleneck to one of the six levers (creative, copy, outreach, speed to lead, booking %, follow-up).
5. Pick the matching skill from this course folder (see table in COURSE-NOTES.md) and build only that one.
6. After the build, re-measure. The bottleneck moves. Repeat.

## Templates / prompts

Prompt to run the diagnosis with Claude:

```
Here are my numbers for the last 60 days as a REALTOR with Keller Williams First Choice
(St. Francisville / Baton Rouge):
- Social impressions: {{number}}
- Website / landing page sessions: {{number}}
- Inbound inquiries (form fills, DMs, calls): {{number}}
- Appointments booked (buyer consults, listing appointments): {{number}}
- Average minutes from inquiry to my first reply: {{number}}
- Signed buyer/seller agreements: {{number}}
- Closings: {{number}}

Map these to RACE (Reach, Acquire, Close, Expand). Compute the conversion between
each stage. Tell me which single step is the bottleneck using the factory test
("if this step doubled, would closings double?"). Then recommend exactly ONE of
these levers to automate first: creative, personalized copy, outbound outreach,
speed to lead, booking percentage, follow-up. Do not recommend more than one.
```

Simple scorecard to keep in the AIRE repo:

```
| Stage          | 60-day count | Conversion from prior | Capacity I can handle |
|----------------|--------------|-----------------------|-----------------------|
| Impressions    |              |                       |                       |
| Inquiries      |              |                       |                       |
| Appointments   |              |                       |                       |
| Agreements     |              |                       |                       |
| Closings       |              |                       |                       |
Bottleneck: ______   Lever: ______   Skill to use: ______
```

## Pitfalls Nick calls out

- Rushing to automate everything at once "sounds sexy" but makes far less money than fixing the one constraint.
- Clients ask for backend/admin automations first. Nick redirects to RACE because that is what ties work to revenue.
- Building the creative system for a company that is short on ideas or distribution won't move anything.
- Marketing and sales are not fully separable. Builds for marketing often get reused by sales, so keep the pipeline view even though the course stops at Acquire.

## How Caleb should use this

- Run the diagnosis once per quarter for Caleb's own KW First Choice business, and once at the start of any AIRE client engagement. Keep the scorecard in the repo so later builds reference it.
- Likely Caleb reality: inquiries from Zillow, Facebook, open-house sign-ins, and sphere referrals are the raw material. If appointments per inquiry are low, the lever is speed to lead or follow-up (see `mk-speed-to-lead-email-sms`, `mk-crm-followup-cadence`), not more listing videos.
- If Caleb has plenty of listings but few views, the bottleneck is Reach: use `mk-procedural-ad-generator` and `mk-ugc-video-ad-pipeline` for listing and neighborhood content.
- When pitching AIRE to other agents or brokerages, lead with the RACE drawing and the factory story. It is a simple way to explain why you will build one system first instead of ten.
- Nothing in this skill sends messages or spends money. It is analysis only.

## Verification

- You can state the bottleneck in one sentence with a number ("we get 40 inquiries a month but only 6 become appointments, and my first reply averages 3 hours").
- The factory test gives a clear yes for the chosen step and a clear no for at least one other step.
- Exactly one lever and one skill are chosen before any build starts.
