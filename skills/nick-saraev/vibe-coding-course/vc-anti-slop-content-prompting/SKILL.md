---
name: vc-anti-slop-content-prompting
description: Writes and configures AI content prompts that avoid "LLM-isms" the way Nick Saraev tuned Splinter and Leadzo: no hashtags, no emojis, no alternating very-short and very-long sentences, no opening lines he banned, casual short icebreakers, a voice profile with sliders plus an editable system prompt, and writing samples to anchor tone. Use when Caleb says "this sounds like AI", "write it in my voice", "make the follow-up less salesy", "repurpose this listing post for LinkedIn, Facebook and Instagram", "set up a voice profile for AIRE", or any time AIRE generates client-facing text, social posts or outreach.
---

# Anti-slop content prompting and voice profiles

**Source:** Nick Saraev, "VIBE CODING FULL COURSE: Gemini 3.1 + Antigravity (6 Hrs)", chapters 34, 45 (https://www.youtube.com/watch?v=gcuR_-rzlDw&t=10933s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=17772s)

## What Nick teaches

"I would consider myself much more prompt engineer than software engineer." Most repurposing apps are built by software engineers, so "voice and tone is an afterthought" and the output is slop. His edge in Splinter was the prompt layer, not the code.

### The rules he added after reading real outputs
When Claude Opus 4.6 generated the first LinkedIn post ("It took us 3 years to hit $1M ARR with our SaaS product. Here's what actually moved the needle..."), he reacted line by line:
1. **No hashtags.** "Nobody uses hashtags anymore, buddy. Explicitly add it to the prompt: never generate any sort of hashtags."
2. **No emojis** in general.
3. **No alternating sentence lengths.** "The main LLM writing pattern that pushes it into uncanny valley territory is when you jump between extremely short sentence lengths and then long sentence lengths over and over. That's not how most human beings write unless they're direct response copywriters." After fixing it: "that's not pattern, that's signal."
4. **Banned openers.** He had explicitly listed phrases he did not want (the "here's what actually moved the needle" style hook) and the model still used one, so he re-stated the ban.
5. **Short, casual, specific icebreakers.** Leadzo's first outputs were overwrought ("Revolutionizing luxury baths in '77 is no small thing. Bain Ultra's legacy speaks for itself. Wanted to run something by you."). He pushed for "significantly more casual and cleaner" and accepted "Hey Kate, love what you're building at Posh, also in engineering services. Wanted to run something by you." Two short sentences, one real detail, one soft ask.
6. **Variables injected into the prompt**: first name, last name, headline, industry, organization name, location, email, so personalization is grounded in data rather than invented.

### Voice profile design (Splinter)
- Sliders for **formality index**, **humor coefficient**, **emoji usage** that get compiled into prompt variables.
- An **Advanced** dropdown that exposes the underlying system prompt so power users can edit the text directly ("change voice profile to an advanced setting where I can modify the prompt directly").
- **Writing samples** the user pastes in ("add writing samples for best results, which will improve the probability that an AI model actually outputs what you want").
- Multiple named profiles (brand voice, casual, blog) with a default.
- A **dry run** step in onboarding that shows a real before/after so users see the voice working before they pay. "The output is what you get in production."
- Remove app language that is "too try-hardy" ("disconnect", "the matrix", model names in the UI). Users should not see which model is running.
- Platform-specific outputs from one pillar piece: LinkedIn post, X thread, Instagram, long-form script, short-form script, blog. Label clearly which were published vs only generated.

### Testing the prompt
"Test 10 prompts. Give me a few dry-run examples of befores and afters and I'll pick the ones I like most and we can integrate them." Pick the best prompt first, optimize later. Read outputs out loud. If a sentence sounds like a direct-response ad, it is slop.

## Step by step

1. Start with a system prompt that states the platform, the audience, the length, and the hard bans (hashtags, emojis, alternating sentence lengths, listed openers).
2. Paste 3 to 5 of Caleb's real posts or emails as writing samples.
3. Define slider defaults (formality, humor, emoji = off) and expose the full prompt under Advanced.
4. Run 10 test generations from one real pillar piece. Mark each pass/fail against the bans. Keep the best prompt variant.
5. For outreach, inject real variables (name, neighborhood, property detail) and cap at two sentences.
6. Re-read every output before it ships. Anything client-facing gets a human pass.

## Templates / prompts

Base system prompt:
```
You write {{platform}} content for Caleb Jackson, a REALTOR with Keller
Williams First Choice serving St. Francisville and Baton Rouge, Louisiana.
Audience: {{audience}}. Length: {{length}}.

Voice: {{formality 1-10}} formality, {{humor 1-10}} humor, warm and direct.
Match the attached writing samples.

Hard rules:
- Never generate hashtags.
- Never use emojis.
- Do not alternate very short sentences with very long ones. Keep sentence
  length natural and even, the way a person talks.
- Never open with: "Here's what actually moved the needle", "Hot take",
  "Unpopular opinion", "It took us X years to", "Most people get this
  wrong".
- No hype words (revolutionary, game-changer, no small thing, legacy).
- Use one concrete local or property detail per piece.
- No em dashes, no semicolons.

Writing samples:
{{samples}}

Pillar content:
{{content}}
```

Icebreaker prompt (outreach):
```
Write a one or two sentence casual icebreaker to {{first_name}} at
{{organization}} in {{location}}. Reference one real detail from their
headline or company: {{headline}}. Sound like a neighbor texting, not a
salesperson. End with "Wanted to run something by you." No flattery words,
no exclamation marks.
```

Dry-run test request:
```
Test 10 variations of the system prompt on this piece. Show before and
after for each. Flag any output that breaks a hard rule. I'll pick the one
to integrate.
```

## Pitfalls Nick calls out

- Models will reuse a banned phrase even when told once. Restate bans in the system prompt, not just in chat.
- Over-personalized icebreakers read as creepy. One detail, two sentences.
- Showing the model name in the UI dates the product and distracts users.
- Without writing samples the voice drifts generic.
- "Published" and "generated" must be labeled separately so users know what went out.

## How Caleb should use this

- AIRE listing announcements: one pillar write-up per listing, syndicated to Facebook, Instagram caption, LinkedIn and an email blurb with Caleb's voice profile. Posting anywhere: needs Caleb's approval before running.
- Lead follow-up texts and emails: two-sentence, neighborhood-specific, no hype, human-reviewed before send.
- Seller outreach icebreakers for FSBO or expired lists, generated from scraped data with the icebreaker prompt. Sending: needs Caleb's approval and compliance review.
- Build a `voice-profile.md` in the AIRE repo with the base prompt and five sample posts so every agent and tool shares one voice.

## Verification

- Ten test outputs contain zero hashtags, zero emojis, none of the banned openers, and even sentence lengths.
- A blind read of three outputs next to three of Caleb's real posts does not obviously separate them.
- Outreach lines are two sentences or fewer with one real detail.
- The Advanced view shows the full prompt and edits persist after refresh.
