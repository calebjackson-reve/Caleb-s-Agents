---
name: vc-debugging-iteration
description: Steers an AI build back on track using Nick Saraev's iteration habits: paste the exact error plus a tight screenshot, batch all issues into one voice dump, state the user role when the model misunderstands, test every button and route yourself, separate functionality from design, give the agent the raw response and your input when it loops, and accept that "it's not whether it screws up, it's when." Use when Caleb says "it's broken", "the agent keeps going in circles", "styles aren't loading", "it added a button that makes no sense", "how do I give it feedback", "nothing happens when I click", or any time an AIRE build hits errors and he wants the fastest path back to working.
---

# Debugging and iteration: mining through the sludge

**Source:** Nick Saraev, "VIBE CODING FULL COURSE: Gemini 3.1 + Antigravity (6 Hrs)", chapters 19, 34, 42-43 (https://www.youtube.com/watch?v=gcuR_-rzlDw&t=4015s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=10933s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=16019s)

## What Nick teaches

"When you create a full-fledged SaaS app, you're going to have errors. It's not about will the model get this wrong, it's a matter of when and what you're going to do when it screws up." His mining meme: you are in a dark cave swinging a pickaxe, every run gets you a little further, and the gems are right on the other side. Humans rarely do things in one go either, "the difference is silicon thinks 10,000 times faster, so you can just try it 10,000 times faster." You will find "the vast majority of time is not the building, it is giving vibes plus verifying it works the way your vibes require."

### Habit 1: paste the error, verbatim, with a tight screenshot
First render of the dashboard had no styles and a "missing html and body tags in the root layout" error. He screenshotted the broken page, pasted the error text, said "I don't think styles are loading, also I got this error." Fixed in one round. Keep screenshots small: "every new pixel is more tokens."

### Habit 2: click everything, then one big voice dump
He walks every page and button as a user, then dictates all issues in one message. The client dashboard dump covered: remove loading spinners and keep the page structure blank instead ("it just makes it look lower value"), nav text too close to background color (with screenshot), add a graph, make recent orders clickable, "view" shows "order not found", "mark all read" grayed out, bell icon does nothing, profile picture does nothing, weekly digest toggle does nothing, a Next.js `params is a promise and must be unwrapped with React.use` error pasted verbatim, demo user button does nothing. "This is quite a promising start, we just have a few adjustments to make so that functionality is perfect. Once you're done, let me know and we can proceed." Later: "I'm now at the point where I'm just dumping in a bunch of changes... most are relatively minor... have it working on a change while I'm modifying the rest."

### Habit 3: state who the user is when it misunderstands
A "Start work" button appeared. "Just to be clear, this is a dashboard for a client to look at the work currently being done by the agency. They don't have the ability to start work. Go through and fix this. If there are any other idiosyncrasies, take care of those." The model will "fundamentally misunderstand what I want" unless the role is explicit.

### Habit 4: functionality first, design in a fresh chat
"I'm not going to worry about the style now. Once you have an app where all the functionality is right, open a new Gemini instance with no context and say here's my app, change the design." Mixing both in one long context "can get messed up."

### Habit 5: when it loops, give more context, not more retries
Apify kept returning "completed" with zero leads. He pasted the raw response and his exact input ("I ran this on localhost:8888/scrape, returned this"), then wrote a bullet list of the exact backend steps and simplified the pipeline. On Stripe: "If agents have a hard time, it's best to give them as much context as humanly possible so they don't get stuck on one loop over and over." He checked the Stripe dashboard himself and reported what he saw.

### Habit 6: describe the symptom and your hypothesis, ask it to diagnose
"I provided an inspiration thumbnail and a prompt and clicked generate, but I'm getting 'please provide an inspiration image and a prompt.' I think this is because I don't have a reference face. However, that error is not representative of the real problem." And: "Save configuration does nothing and after refresh my reference face is gone. If it's a front-end error, fix it. If it has to do with Supabase, tell me what I need to do on my end." And: "The app takes significantly longer to load now. Diagnose whether this is a persistent error behind the scenes or some issue with prefilling or something else."

### Habit 7: separate "it says it did" from "it did"
"Verifying the build is not enough." He makes the agent log in, do the action and screenshot (Claude Code used Chrome DevTools). "It just said that it deleted my account, it didn't actually do the deletion." Count credits. Refresh after every save. Try the action twice ("the first click did nothing, five seconds later it worked, diagnose why").

### Habit 8: tell it what not to do
"Don't just paste the prompt in verbatim to the user-editable section, it's pretty long." "Don't rebuild." "Only modify the landing page." "Don't make any changes, I just want the audit." "I don't want you to actually publish it on LinkedIn, just verify everything works up until that point."

### Habit 9: trust Gemini's autonomy, but read the first minutes
Gemini sometimes acts without asking (it extended the landing page because an early prompt said "make it longer"). Usually fine. Stay close at the start of a build to catch wrong folder or wrong framework. Later, "I had very little hands-on involvement" for 30-minute stretches.

### Habit 10: one major change per AI image prompt
For image generation, "you only want to suggest one major change at a time." Also applies loosely to tricky code changes.

## Step by step

1. Reproduce. Note the page, the click, the exact error text, and the browser console output.
2. Screenshot tight. Paste error + screenshot + "it worked locally" or "it's new since X."
3. If several issues, walk every page first and send one batched dump, in page order, referencing section names.
4. Add the user role and the intended behavior ("this is a client view, read only").
5. If it loops twice, stop retrying. Paste the raw response, your input, and what you see in the external dashboard. Simplify the step list.
6. Verify yourself: refresh, count, try twice, check the database row.
7. Keep design out of the functionality thread.

## Templates / prompts

Error report:
```
[screenshot]
[exact error text]
This happened when I [action] on [page]. I expected [behavior]. It
[worked locally / is new since the Supabase migration]. Fix it and tell me
what to retest.
```

Batched feedback dump:
```
This is a promising start. A few adjustments so the functionality is
perfect:
- [Page]: [issue]. [expected behavior].
- [Page]: [issue]. Screenshot attached.
- Error in console: [paste verbatim].
Just to be clear, the user of this app is [role] and they can only
[allowed actions]. Remove anything that implies otherwise.
Once you're done, let me know and we can proceed.
```

Loop breaker:
```
We've tried this twice. Here is the raw response: [paste]. Here is my exact
input: [paste]. Here is what the [Stripe/Apify/Supabase] dashboard shows:
[describe]. Let's simplify the logic to exactly these steps: 1... 2... 3...
Nothing else for now.
```

Hypothesis prompt:
```
I'm seeing [symptom]. I think it's because [guess], but the error message
isn't representative of the real problem. Diagnose, then fix. If it needs
something on my end (Supabase setting, key, URL), tell me exactly what.
```

## Pitfalls Nick calls out

- Loading spinners and placeholder states make an app feel cheap. Ask for structure-preserving blank states.
- Models leave dead buttons everywhere. List them by name and ask for removal.
- "Completed successfully" with empty results is a lie. Check counts.
- Mixing design and functionality in one context degrades both.
- Giant screenshots waste tokens and usage.
- Retrying the same prompt is not debugging. Add context.

## How Caleb should use this

- When the AIRE dashboard breaks, grab the console error and a tight screenshot before messaging Claude. Batch all issues from one walkthrough of the buyer and seller views.
- Always state the role: "this is the seller's view, they can see showings and feedback but cannot edit the listing."
- Keep a `bugs.md` per app where Caleb dictates issues during the day, then paste the list as one dump.
- Verify lead counts, email sends and CRM writes yourself before trusting "done." Anything that sends a message to a client or lead: needs Caleb's approval before running.

## Verification

- Each round of feedback reduces the open-issue list, and the issue list is written down.
- After "fixed," the exact reproduction steps no longer produce the error, after a hard refresh.
- Database rows, credit counts and external dashboards agree with what the UI claims.
- No buttons or nav items remain that have no page or action behind them.
