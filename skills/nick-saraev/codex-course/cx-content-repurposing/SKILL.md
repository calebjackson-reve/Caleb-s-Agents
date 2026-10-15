---
name: cx-content-repurposing
description: Builds an organic content repurposing pipeline that takes one long piece (newsletter, blog, video transcript) and produces platform-fit X posts, LinkedIn posts and Instagram carousels in Caleb's voice plus handwritten-style lined-paper images, saved to a dated folder, then runs it on a daily schedule against new source content. Use when Caleb says "repurpose this", "turn this listing video into posts", "make social content from my newsletter", "I need Reels captions, Facebook and Instagram from this", or wants AIRE to syndicate St. Francisville and Baton Rouge content across platforms.
---

# Organic content repurposing with skills

**Source:** Nick Saraev, "The Only Codex Course You Need in 2026 (4.5 Hours)", chapter 7 (https://www.youtube.com/watch?v=DJZISqryDfw&t=5284s)

## What Nick teaches

Big creators start with one long-form piece where they go deep, then curate and syndicate it to 10 or 15 places, staggered so nobody notices the recycling. The value is growth, time savings and a leaner team. Start long and convert short. Short to long forces the AI to invent the missing pieces.

Nick's source was a real newsletter sent to 45,721 people ("Interested, then radio silence"). Core idea: conversion rate = ROI x belief (social proof) / friction. It cannot be pasted to X because X's optimal post is about 280 characters and going over gets penalized. LinkedIn wants something longer with a visual. The job is to shove the same ideas into each platform's shape.

### The build (prompt phase, about 20 minutes of back and forth)

Setup: new chat, lighter model, high effort. Pasted the newsletter, then dictated:

> Build a content repurposing system that takes a post like the one above, created for newsletter format, and converts it into three platform-optimized formats: X, LinkedIn and Instagram. For Instagram and LinkedIn also generate a high-quality image, a hand-drawn notepad style thing that looks like I wrote the principles on paper, those do well. Build whatever logic is needed so the copy always conforms to each platform. Then run our main post through it so I can advise and revise.

Follow-up steering messages, each sent while it worked:
- "Research these platforms in depth and determine the most optimized format: X within 280 characters, same for LinkedIn and Instagram. This guides aspect ratio, tone, style." Result: X is a single compressed post, LinkedIn uses a 4x5 visual not a wide banner, Instagram becomes a 4x5 educational carousel.
- Image style: he pasted a photo of lined white paper. "Output images on lined white paper like this. No background, no desk, just handwritten on paper." The spiral notepad on a mahogany desk looked too clean and fake.
- The model built an app with a text box and three columns. Nick did not want an app: "all I wanted was the outputs in a Finder folder."
- The copy read as "stereotypical AI writing." He dictated the tone rules that became `playbook.md` (see `cx-anti-slop-writing`).
- What finally fixed tone: "You're still writing in an incredibly information-dense way, frankly near unreadable. X is terrible. Here's how I would have written it: [his rewrite]. Encode that into principles and reapply to LinkedIn and Instagram." Examples beat instructions.

### Skill phase

"Convert this from a series of prompts into a skill. No app. When I provide a post, create a new dated subfolder with a title slug relevant to the content and generate everything there." The skill (`content-repurposer`) produced per run: `source-post.md`, a core-concept extraction, X, LinkedIn and Instagram text (sometimes multiple variants), a `visuals.md` spec, and `assets/` with the Instagram cover and carousel images 1 to 5 plus the LinkedIn image.

Hardening from runs: carousel images were vague, so "write the image text with about 80% of the detail of the post itself." Images generated serially took 10 minutes, so "use sub-agents to generate text and images in parallel, then a final independent tone pass," which cut runs to about 5 minutes.

Cost note as Nick said it: image generation uses plan credits, roughly 2 to 3% of his weekly budget per run, so about 30 runs a week on a $20 plan, maybe 10 to 15 cents per run. May have changed.

### Automation phase

Local: "every morning at 5:59 a.m. grab any new newsletters from Kit, if new, run them through the skill for X, Instagram and LinkedIn, hand to a teammate for posting and QA. We need dedup, store processed newsletters and check they're really new." Kit had no plugin, so he added its MCP server manually (see `cx-plugins-and-mcp`). The agent built a `content repurposing dispatcher` with a persistent ledger of processed broadcast ids. Cloud: a cloud environment via GitHub, then the same task as a daily cloud heartbeat (see `cx-event-automation-local-to-cloud`).

### Video

Long video to shorts is the same pipeline with the image step swapped for a clipping tool. Nick names Opus Clip and Vizard (not affiliated), both with APIs, and says building your own clipper is a whole app that would cost thousands and a developer with taste. Connect the tool's API and let the agent manage it.

### Human in the loop

"I would not recommend any system that automatically posts without human supervision. The market is wise to AI content." Get text to 90%, then a 2-minute human look. AI replaces the heavy production steps, humans keep the 10% of taste and judgment. It becomes a QA job instead of a generation job.

## Step by step

1. Collect 3 to 5 pieces of Caleb's writing he is proud of as voice examples, and one long source piece.
2. Prompt phase: paste source, dictate the goal, three platforms, image style. Request platform research for limits and aspect ratios.
3. Review. Rewrite one output by hand in Caleb's voice. Tell the agent to encode that into principles and reapply.
4. Add anti-slop rules to `playbook.md`. Repeat until an output needs only light edits.
5. Convert to a skill with the dated-folder convention. No app.
6. Run on 2 more source pieces. Fix image detail. Parallelize text and images.
7. Local dispatcher at a fixed morning time with a ledger, pulling from the real source (newsletter tool, blog RSS, YouTube transcript folder).
8. Promote to cloud. Route outputs to whoever posts. Posting stays human.

## Templates / prompts

Skill output layout:

```
content-repurposed/
  2026-10-15-why-st-francisville-homes-sell-in-fall/
    source-post.md
    core-concept.md
    x.md            # 3 to 4 lines, 70 to 100 chars each, lowercase, no end punctuation
    linkedin.md     # longer, plain, no hashtags
    instagram.md    # caption, no hashtags
    visuals.md      # text for each image at ~80% of post detail
    assets/
      instagram-cover.png
      instagram-carousel-1.png ... -5.png
      linkedin-4x5.png
```

Dispatcher brief:

```
Turn the content-repurposer skill into a scheduled automation. Every morning at 5:59 a.m. list new published items from [source]. Compare against a ledger of processed ids. For each new one run the skill, parallelized, and drop the folder in [path]. Then [email / Slack] me the folder link for QA. Never post anything.
```

## Pitfalls Nick calls out

- Short to long. Always start with the long piece.
- Letting the agent build an app you did not ask for.
- Hashtags, bold hooks with blank lines, two-word sentences, em dashes. All AI tells.
- Spiral notepad on a desk. Use plain lined paper, no background.
- Vague image text. Match the post's detail.
- Serial image generation. Parallelize.
- Auto-posting without a human pass.

## How Caleb should use this

- One listing walkthrough video transcript becomes the MLS blurb, Reels caption, Facebook post, Instagram carousel ("5 things about this St. Francisville home") and a newsletter blurb.
- One monthly market update newsletter becomes 4 X posts, 2 LinkedIn posts and an Instagram carousel on Baton Rouge and West Feliciana pricing.
- Buyer and seller education pieces (inspections, flood insurance, closing costs in Louisiana) repurposed into a month of content.
- Outputs go to a review folder. Scheduling or posting to Metricool, Facebook or Instagram needs Caleb's approval per batch. Keller Williams First Choice branding only.
- Image generation and clipping tools cost credits or subscriptions, so enabling them needs Caleb's approval.

## Verification

- Each run creates one dated slug folder with all text files and images.
- X lines fit 70 to 100 characters, 3 to 4 lines, no hashtags anywhere.
- An outsider reading the LinkedIn post cannot tell it was generated.
- The ledger grows by one per new source and reruns produce nothing.
- Nothing was posted by the system.
