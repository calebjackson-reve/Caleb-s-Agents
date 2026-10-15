---
name: ce-subject-line-deniability
description: Writes subject lines and teasers on Nick Saraev's plausible deniability rule: the subject never sells, it just buys the click by looking like a note from someone they might know (short, often lowercase, uses their name, hints at loss or a question). Use when Caleb says "give me subject lines for this seller email", "my open rates are bad", "is this subject too salesy", "write 10 subjects for the expired campaign", or whenever AIRE drafts an email and needs the subject and preview text.
---

# Subject Lines: Plausible Deniability

**Source:** Nick Saraev, "COLD EMAIL COPYWRITING & OUTREACH Full Course 2026", chapter 26 (https://www.youtube.com/watch?v=uSTGNHGFOAo&t=11631s)

## What Nick teaches

The subject line's entire job is **plausible deniability**. Give enough to spark curiosity, not enough to answer "who is this and why should I care" without clicking. Make them wonder: a long-lost cousin? Someone from school? Someone who wants to buy my business? A fan? A podcast invite? **The subject does not sell. If you are selling in the subject, you are doing it wrong.**

The four-step framework maps onto this: the subject and teaser carry the personalization (answers "is this spam?"), and the reader must open to get "who are you and why does it matter."

**Bad subjects from his inbox and why:**
- "Interested in AI-driven performance optimization" (weak, nothing custom, and misspelling "AI" as a word nobody in the industry uses)
- "Video editor" (he gets a billion of these, obviously a pitch)
- "Nick, you scaled to 72K/month with automation. Here's the next level." (too long, blatantly selling)
- "A quick idea on your daily strategy content" (the word "quick" gives it away, nobody who poured heart into something says quick)
- "Quick collab?" (collab is open-ended, but no personalization)
- "Can you double this week?" (meaningless)
- No subject (correlates with spam and scams, always have one)

**Good subjects and why:**
- "your claude code course and a formatting thought" (lowercase, references something only a viewer would know, offers information)
- "2026 capital" (could mean investment, acquisition, naturally interesting)
- "been with you from the start" (minor grammar quirk makes it feel human and endearing)
- "Nick + YouTube"
- "Nick's blind spot" (fear of loss, must open to find out)
- A very short subject that lets the teaser show in full

**Patterns that work:**
- Just the name, or name plus a question: "Nick, Q", "Nick, are you taking coaching clients?", "Nick, are you hiring?", "Nick, you looked sad in your last vid"
- Fear of loss beats upside: "nick, you're wasting $2,300 per month" (lowercase name looks hand-typed)
- Personalization in either subject or teaser, usually a name in one of the two. Without names, cold reading can still carry it.
- Low effort look: lowercase, short, no punctuation polish.

Subject and teaser interact (see ce-platform-surfaces): short subject, more teaser. And the teaser must not give the whole thing away either.

Follow-ups should use a **different subject** so you test many subjects over time (see ce-two-touch-follow-up).

## Step by step

1. Write the body first. The subject is derived from the personalization, not the offer.
2. Draft ten subjects: three name-plus-question, three loss-framed, two "thing only they would recognize," two ultra short (one to three words).
3. Strike any that mention your service, your company, "quick," or a benefit claim.
4. Check each pairs with the teaser so that subject + first 100 chars still withholds who you are and what you sell.
5. Pick two to test as variants. Record them.

## Templates / prompts

```
Name + question:   "{{first}}, quick one about {{street}}"  (then remove "quick")  -> "{{first}}, about {{street}}"
                   "{{first}}, are you still thinking about selling?"
                   "{{first}}, is the house still yours?"
Loss framed:       "{{first}}, the {{street}} listing"
                   "what the last agent missed on {{street}}"
Only-they-know:    "the roof on {{street}}"
                   "your sign on {{street}}"
Ultra short:       "{{street}}"
                   "{{first}} + {{neighborhood}}"
```

Prompt for Claude:
```
Give me 10 subject lines for this email. Rules: do not sell, do not name my service or brokerage, no "quick", under 45 characters, at least 5 lowercase, at least 3 that imply a question or a loss, each must pair with the first 100 characters of the body without revealing who I am or what I'm offering.
```

## Pitfalls Nick calls out

- Selling in the subject.
- "Quick" anything.
- Long subjects that eat the teaser.
- Industry words misspelled or used wrong, which breaks the in-group illusion.
- No subject at all.
- Teaser that answers the question the subject raised.

## How Caleb should use this

- Default subject set for sellers is name plus street. Locals recognize their street instantly and it is not a pitch. Any send is "needs Caleb's approval before running."
- For expireds, loss-framed subjects ("what the last listing missed on Royal") fit the reader's actual state of mind. Keep them factual, never disparaging of the prior agent by name.
- Avoid subjects that could be read as deceptive about who Caleb is. Curiosity is fine, pretending to be a buyer or a neighbor is not (see ce-compliant-outbound-guardrails).
- AIRE should keep a subject-line test log per campaign with open and reply rates for Sunday iteration.

## Verification

- Subject is under ~45 characters and contains no service, brokerage, or benefit claim.
- Subject + teaser together do not reveal who the sender is or what is being sold.
- Two subject variants are logged for the campaign with the metric that will judge them.
