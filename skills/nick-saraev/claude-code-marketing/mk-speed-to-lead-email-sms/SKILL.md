---
name: mk-speed-to-lead-email-sms
description: Builds a speed-to-lead system where a new inquiry (form fill landing in an inbox) triggers a short, human-sounding personalized email and SMS within about a minute and promises a call, first as an inbox-polling loop, then as a cloud routine fired by API/webhook. Use when Caleb says "reply to new leads instantly", "text every Zillow lead the second it comes in", "I'm too slow getting back to open-house sign-ins", "set up auto-reply for my valuation form", or when AIRE needs to respond to buyer/seller inquiries while Caleb is in showings.
---

# Speed to lead: instant personalized email + SMS on new inquiries

**Source:** Nick Saraev, "Claude Code Marketing Full Course (6 Hours)", chapter 12 (https://www.youtube.com/watch?v=yulWjh3rq28&t=14782s)

## What Nick teaches

Leads are money you already paid for. Most companies convert them at a poor exchange rate because nobody responds fast. If average response drops from ~10 minutes to ~30 seconds, the lead is still in the mindset they had when they filled the form. Nick's roommate ran wedding videography with "fill this form and I'll call you within 60 seconds": instant text, instant email, then an automated call merge, and made $20k months while Nick ate rice and beans. Nick's company Clarvo does this at scale (instant call, intelligent dispositions, branded numbers, voicemail logic) and took a home-services client from $3M to $9M a month.

**Guardrail**: too fast feels fake. Keep it within reason (~30 seconds), maybe a small typo or "just pulling into the garage, give me 3 minutes."

### The build
1. **Demo form**: "I'm creating a demo of speed to lead. Make a simple form fill for a hypothetical AC installation service. When I fill it out I receive an email. Help me build this HTML artifact. It needs to actually send email." Claude needed a form backend: **Formspree** (free). Result: "Summit Air, new AC in 24 hours, expect a text and email within 60 seconds." Fields: name, email, phone, zip, service, home type, notes. Nick made "anything we should know" **mandatory** so AI has something to personalize from.
2. **Inbox access**: connect the **Gmail connector** (read, compose, send at the time). Claude listed the form emails, parsed fields, and showed seconds since each arrived.
3. **Polling**: "build a system that checks the mailbox once every minute for entries not already processed, then immediately emails them back, human-sounding. I'll give you the copy." Needs (a) a seen-list to detect new, (b) the reply.
4. **Copy**, written in Google Docs by hand:
   - Email subject: `re: {{firstName}} air conditioning`
   - Email body: `Hey {{firstName}}, just saw you filled out a form. I hear {{paraphrasedRequest}}. We'll happily help you with that. We'll call you in the next 5 minutes and sort this out. Thanks, Jonah`
   - SMS (160-char limit, so very tight): `Hi {{firstName}}, just got your request. I know {{shortParaphrasedRequest}}. Calling you in the next 5 min to sort this out. Jonah`
   - Rules to Claude: paraphrase at most 10 to 15 words ("the shorter it is the more human it seems"), send casually formatted exactly like the template, don't stray. 60-second scheduler OK.
5. **SMS provider**: **Quo** (formerly OpenPhone), which has a built-in Claude connector (browse connectors -> Quo -> authorize workspace). Alternative: **Twilio**. Both require a US business number and **A2P registration** (2 to 14 days, can be rejected). Test: "check you have Quo access and send a text to my number."
6. Tested with fake leads (Dana, Priya): email and SMS both landed within a minute with correct paraphrases ("upstairs is stuck at 80 even with the AC running").
7. **Skill**, then **routine**: Claude generated `routine.md`. Routine named "speed to lead SMS and email". Connectors Gmail + Quo only (removed Drive/Higgsfield). Instead of a schedule, Nick chose **"call via API"**: the routine fires only when triggered. Claude got the **token** to POST to and wired the trigger so a form fill -> inbox -> API call -> routine run. Each run shows as a cloud session. Polling is fine locally. API trigger is the cleaner cloud approach.
8. Not built but explained: **call merge**: a third number calls both you and the lead simultaneously. First to pick up waits for the other. No latency. Then dispositions + CRM + scheduled follow-ups (sales course territory).

## Step by step

1. Identify where inquiries land (Gmail inbox from Zillow/Realtor.com/website form/Facebook lead ads). If no email trail exists, build a form with Formspree or use the existing CRM notification email.
2. Make at least one free-text field required on your forms so there is something to paraphrase.
3. Connect Gmail and the SMS provider. Verify a read of the inbox and one test text to Caleb's phone.
4. Write the email and SMS templates by hand. Keep the AI slot to 10 to 15 words (email) and ~8 words (SMS). Count characters.
5. Prompt the polling skill: detect unprocessed inquiry emails every 60 seconds, extract fields, fill templates, send email + SMS, record as processed.
6. Test with 3 fake inquiries pointed at Caleb's own email/phone.
7. Convert to a routine triggered via API (or keep polling as a loop). Add error logging.

## Templates / prompts

Build prompt:
```
Build a speed-to-lead responder. Source: Gmail inbox, emails matching {{subject/from pattern}}.
Every 60 seconds: list unprocessed matches (keep a processed-id list), parse {{fields}},
then send (1) this email and (2) this SMS via {{Quo/Twilio}}:
EMAIL subject: re: {{firstName}} {{topic}}
EMAIL: Hey {{firstName}}, just saw your note come through. I hear {{paraphrasedRequest}}.
Happy to help with that. I'll call you in the next 5 minutes. Thanks, Caleb
SMS (<=160 chars total): Hi {{firstName}}, got your request. I know {{shortParaphrase}}.
Calling you in the next 5 min. Caleb
Rules: paraphrase <= 12 words for email, <= 8 for SMS, plain casual formatting, never stray from
the template, never send twice to the same inquiry, log every send.
First run: dry run, show me what you WOULD send for the last 3 inquiries.
```

Routine trigger note:
```
Create this as a cloud routine with Gmail + {{SMS}} connectors. Trigger: call via API.
Give me the POST endpoint and token. Wire {{form backend / Zapier / inbox rule}} to call it on each
new inquiry. Also post failures to Slack #aire-errors.
```

## Pitfalls Nick calls out

- Without a form backend, an HTML form can't email you.
- Gmail connector capabilities vary (later chapter: no send tool). Verify before relying on it.
- SMS numbers need A2P registration. Start early.
- AI fills that run long overflow 160 chars. Long names make it worse. Keep buffers.
- Claude tries to write a one-shot script instead of a loop. Redirect it.
- Instant responses can feel robotic. Keep tone human and promise something you will actually do (the call).

## How Caleb should use this

- Sources: Zillow Premier Agent / Realtor.com lead emails, KW Command or website valuation forms, Facebook lead ads notifications, open-house sign-in app exports. All typically arrive by email, so inbox polling works without new integrations.
- Templates for three inquiry types: buyer ("I see you're looking in {{area}} around {{price}}"), seller/valuation ("I hear you're thinking about selling {{address/area}}"), showing request ("you asked about {{address}}"). Promise "I'll call you in the next 5 minutes" only when Caleb (or AIRE's call routing) can honor it. Otherwise "within the hour."
- Classification: AUTOMATE + HUMAN QA (`mk-automate-or-keep-human`). First week: dry-run drafts only. Turning on live sends **needs Caleb's approval before running**. SMS also needs TCPA-compliant consent (inquiry forms should include text-consent language) and a registered business number, which **needs Caleb's approval before running**.
- Add a quiet-hours rule (no SMS 9 p.m. to 8 a.m. Central) and a dedupe rule for repeat inquiries from the same person.
- Later: push the inquiry into the CRM with a "speed-to-lead sent" note so `mk-crm-followup-cadence` picks it up.

## Verification

- A fake inquiry sent to the inbox produces an email and an SMS at Caleb's own address/number within ~60 seconds, with a correct, short paraphrase.
- A second identical inquiry does not produce duplicate sends.
- The routine run log shows the API trigger firing and both connectors used. A failure posts to Slack.
