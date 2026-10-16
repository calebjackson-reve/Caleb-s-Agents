---
name: lesson-video
description: Script, film and cut one AI for Agents lesson video in Caleb Jackson's voice and his animation kit. Use when Caleb says "script the next video", "make the lesson video", "cut my take", "build the scenes", or sends a raw lesson take.
---

# Lesson video

Caleb is a REALTOR with Keller Williams First Choice and the builder of AIRE. This skill makes one AI for Agents video at a time, from hook to final cut. Claude drafts. Caleb approves the hook, the look and the final cut. Nothing gets posted, sent, scheduled or paid for without his yes.

## Read first

- `programs/ai-for-agents/FOUNDATION.md`: mission, audience, the 7 values and the 5-question content check.
- `programs/ai-for-agents/voice/caleb-lingo.md`: his words, his pace (about 176 words a minute) and the never list.
- `programs/ai-for-agents/directives/make-a-lesson-video.md`: the step-by-step.
- `programs/ai-for-agents/motion/README.md`: the 13 animation scenes and the 3 looks.
- The Course 1 breakdown, for what this video covers: https://claude.ai/code/artifact/1733aef2-fdab-4a70-b5ef-bb6d3c1619dc

## Approval gates (Caleb, 2026-10-15)

Each step waits for Caleb's yes before the next one starts. Extra work before a yes is wasted tokens.
1. Hook options and a short outline. Stop and wait.
2. The full script, only after he approves the hooks and outline. Stop and wait.
3. The teleprompter, only after he approves the full script.

## 1. Hook

- Spend 80% of the planning on the first 3 seconds: the first words, the shot, what's on screen, and a "me too" line about the viewer. Never open about Caleb.
- Give 3 hook options in a table and mark one pick.

## 2. Script

- Write the hook and the last line word for word. Everything else is a loose beat he says his way. He talks better than he reads.
- Give each beat a kit scene and a face mode. Use `full` only for the hook and the last line, `pip` for most of the video, and `none` on busy screens.
- Give each beat about 7 to 12 seconds, so the picture changes often.
- Put something worth hearing every 10 to 15 seconds: a real story, a contrarian line, a why-clients-decide idea, a quick before and after, or a bet the viewer can test today. A beat that only lists what's coming doesn't count. (Caleb, 2026-10-15: "we're not doing a good enough job of saying interesting things in and throughout the video.")
- In the script table, give every beat a "What makes it interesting" column that names which kind it is. Label each one as his story (only say it if it's true as written) or inference (change it if it doesn't sound like him).
- Don't list the lessons. Caleb's intro take (IMG_6290) spent half its time on what's coming, and he said he didn't like the material. Give the viewer something to do in the first 10 seconds, and tie anything that's coming to that one thread.
- No market numbers unless they have a source and a date. A story or a bet beats an unsourced stat.
- End on one action the viewer can do in 10 minutes, pointing to Skool.

## 3. Check before filming

Run the 5 FOUNDATION questions:
1. Could a brand new agent follow it?
2. Is there one clear action at the end?
3. Is there a psychology idea, not just a tool trick?
4. Does it point to Skool?
5. Does it sound like Caleb, not AI?

Then run the ethics check:
- Truth in advertising: no income or results claims.
- No client data on screen. Use fictional people, flagged.
- Fair Housing on every motivation question.
- Brokerage name only as KW First Choice policy allows.
- Every number needs a source and a date.

## 4. Film and cut

- Caleb films vertical on his iPhone at his desk. If he flubs a line, he says "Fuck that, Caleb" and goes again.
- Run `python3 programs/ai-for-agents/motion/cut_to_scenes.py SCENES.json TAKE.MOV OUT`. It trims pauses, drops the mistake phrase, renders the scenes to his timing, adds his face and levels the sound to -20 LUFS.
- Before showing Caleb, open the result and pull a contact sheet. Check for clipped words, text running off screen, and a face over text. Confirm the mistake phrase is gone.

## Never

- Re-cut footage Caleb said won't be used. The Oct 14 take, IMG_6269, is out.
- Start the next lesson before he approves the current one.
- Spend Higgsfield credits or buy TubeLab without an approved quote.
- Join or sign up for anything for him.
