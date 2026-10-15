---
name: aa-video-to-action-pipeline
description: Turns a YouTube or recorded video tutorial into a hyper-detailed numbered step file via Gemini video understanding, then has Claude Code execute those steps with browser and tool MCPs. Use when Caleb says "learn this from the video", "watch this tutorial and build it", "replicate what this guy does in n8n / Canva / the MLS system", "extract the steps from this YouTube link", or when AIRE needs to copy a workflow that only exists as a screen recording or webinar.
---

# Video-to-Action Pipeline

**Source:** Nick Saraev, "AI Agents Full Course 2026: Master Agentic AI (2 Hours)", chapter 10
(https://www.youtube.com/watch?v=EsTrWCV0Ph4&t=2840s)

## What Nick teaches

Until recently agents could only learn from text. Video was millions of tokens and out of reach. Now
they can learn from the same medium humans do, by combining multi-agent MCP orchestration with the
Gemini API, which has built-in video support. Gemini samples the video at one frame per second,
analyzes the frames in succession, and uses descriptive prompting to break it into very clear steps.

Pipeline:

1. You feed in a YouTube tutorial URL.
2. Claude receives the URL but cannot watch video natively.
3. Claude calls the Gemini API. Gemini watches the full video.
4. Gemini extracts step-by-step instructions as a hyper-precise numbered list (timestamps, which
   button, what color, where on screen).
5. The structured steps return to Claude, which saves them to a file.
6. Claude executes each step using hyper-specific tools (Chrome DevTools MCP for web apps, or an
   app-specific MCP such as Blender's).
7. Result: the agent has replicated the tutorial end to end.

Inspiration: Spencer Sterling's post on X about an agent that taught itself the Blender donut
tutorial from YouTube, filled gaps in its own tooling, and completed it autonomously via a Blender
MCP. Nick's note on visual knowledge: leave some steps a little general so the model can interpret,
and give it a way to screenshot its results and compare to the video frames.

His skill `video-to-action` has the description: "Extract actionable steps from YouTube videos using
Gemini video understanding. Use when the user provides a YouTube link and wants to learn procedures,
extract steps, understand visual tutorials, or turn video content into executable instructions." It
downloads the video, sends it to Gemini, and writes a deep-analysis markdown file.

Demo: he fed a 21-minute video of his own (scraping Google Maps leads in n8n without paid APIs).
Output was `G Maps Scraper deep analysis.md` ("navigate over to this thing at 17 seconds, here's how
to do this"). Then in a new Claude Code session with bypass permissions: "Use G Maps Scraper deep
analysis.md to build out the same end-to-end flow for me." Claude opened a Chrome DevTools MCP,
logged into his n8n, generated workflow JSON, pasted it in, then configured the Google Sheets node
by clicking around. He pasted a screenshot and said "you're connected," and it kept testing until
the flow scraped Google Maps.

His personal stack: Antigravity as the container (file explorer on the left) with the "Claude Code
for VS Code" extension installed from the extensions panel, logged in, so Claude Code runs inside
Antigravity. Optional, but it is what he uses.

## Step by step

1. Get a Gemini API key (Google AI developer console). Store it as an environment variable.
2. Create a `video-to-action` skill (template below) that downloads the video, sends it to Gemini,
   and saves `<topic> deep analysis.md`.
3. Run: "Use the video-to-action pipeline on <YouTube URL>."
4. Read the analysis file. Trim or correct any steps that are wrong for your setup.
5. Open a fresh session: "Use <file>.md to build the same end-to-end flow for me." Give it the
   Chrome DevTools MCP and the logins it needs.
6. Keep your hands off the browser while it works (moving windows confuses it). When it stalls on a
   visual check, paste a screenshot and tell it what state things are in.
7. Test the result yourself before relying on it.

## Templates / prompts

Skill front matter and body skeleton:

```
---
name: video-to-action
description: Extract actionable steps from YouTube videos using Gemini video understanding. Use when the user provides a YouTube link and wants to learn procedures, extract steps, understand visual tutorials, or turn video content into executable instructions.
---

# Video to Action

1. Download the video (or pass the URL if the Gemini endpoint accepts it).
2. Send to Gemini with the extraction prompt below.
3. Save the response to `<topic> deep analysis.md` in the project folder.
4. Report the file path and a 5-line summary. Do not execute anything yet.

## Extraction prompt
You are watching a tutorial. Produce a hyper-detailed, numbered, step-by-step
breakdown of literally every action taken. For each step include: timestamp,
the app or page, the exact UI element (label, position, color), the value typed
or selected, and the visible result. Where the narrator explains why, include a
one-line rationale. Keep steps general enough that a different account or
layout can still follow them. End with a macro-level outline of the whole flow.
```

Execution prompt:

```
Use "<topic> deep analysis.md" to build out the same end-to-end flow for me in
<tool>. Use the Chrome DevTools MCP. I am logged in. Screenshot after each
major step and compare to the description. Stop and ask me if a login,
payment, or send action is required.
```

## Pitfalls Nick calls out

- Claude and GPT cannot watch video natively, so the Gemini call is mandatory.
- Visual knowledge needs slack. Over-precise steps ("rotate 0.283 degrees") break on a different
  layout. Let the model interpret.
- Moving windows around while the agent is clicking confuses it.
- He stopped the demo before executing the final workflow run to avoid consuming paid API credits.
  Watch for steps that trigger spend.

## How Caleb should use this

- Copy an MLS, CRM, or Canva workflow from a training webinar recording into a repeatable AIRE skill
  instead of re-watching it.
- Turn a Keller Williams training video (listing presentation setup, Command CRM smart plans) into a
  numbered SOP for Caleb or an assistant.
- Learn a new tool's UI (n8n, Zapier, a lead-gen scraper) from a tutorial and have Claude build the
  flow in Caleb's account. Any step that logs into an account, submits forms, or triggers paid API
  calls needs Caleb's approval before running.
- Gemini API usage costs money per video. Needs Caleb's approval before running.

## Verification

- `<topic> deep analysis.md` exists, has timestamps, and reads as something a human could follow.
- The executed flow runs end to end in your own account and produces the same artifact the video did
  (a working workflow, a saved template, a spreadsheet of results).
