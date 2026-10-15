# Directive: make one AI for Agents lesson video

This directive is the step-by-step for one lesson. Claude runs the scripts and Caleb approves at the four gates. This setup follows Nick Saraev's method of SOP markdown plus execution scripts, with 3 options when a choice is open.

Scope right now: Lesson 1 only, the iMessage lesson. Don't start another lesson until Caleb says so. (Decided 2026-10-15.)

## 0. Read first
- `voice/caleb-lingo.md`: his words, his pace, and the never list.
- The plan doc "Course 1 video plan": https://claude.ai/code/artifact/4b061c69-4e90-4e0f-870d-6bea640c32cc

## 1. Hook (Gate: the hook)
- Spend 80% of the planning on the first 3 seconds: the first words, the shot, and a "me too" line about the viewer.
- Write the hook word for word and the rest as loose beats. He talks better than he reads.
- Put something worth hearing every 10 to 15 seconds (a real story, a contrarian line, a why-clients-decide idea, a before and after, or a bet the viewer can test). Mark each beat with what makes it interesting.
- Give Caleb 3 hook options and mark the one Claude recommends. He picks.

## 2. Film
- iPhone, portrait, at his desk. Talk to the lens.
- Messed up a line? Say **"Fuck that, Caleb"** and say the line again. The editor cuts the phrase and the sentence before it.

## 3. Transcribe and map scenes
- `editor/skool_cut.py` transcribes the take with faster-whisper (word timestamps).
- Write `motion/scenes/<lesson>.json`. Each scene gets a `type`, a `src` stretch of the take, and a `face` mode:
  - `full`: the hook and the last line only, about 1 in 10 of the runtime.
  - `pip`: the small corner box.
  - `none`: busy screens like phones, text threads and sorting.
- Use only fictional people, with `flag: "Fictional data"`. Fair Housing applies to every motivation question.

## 4. Look (Gate: the look, once per course)
- `node motion/render.mjs SCENES OUT.mp4 --look ivory|ink|grid --stills t,t,t` renders the frames. Caleb picks one look.

## 5. Build
- Run `python3 motion/cut_to_scenes.py motion/scenes/<lesson>.json TAKE.MOV out/<lesson> --model <whisper model>`.
- It does the following:
  - Cuts the pauses and the mistake phrase.
  - Renders every scene to the exact length he talks.
  - Puts his face in the card or the corner box.
  - Levels the sound to -14 LUFS.
- Check the report: `full_face_share` should be about 0.10 to 0.20.

## 6. Check (Gate: the quality)
- Re-transcribe the finished video. The mistake phrase must be gone, which skool_cut's check reports as `mistake_phrase_gone`.
- Pull a contact sheet of frames. Look for clipped words, text running off screen, and a face over text.
- Open the video and watch it start to finish before sending it to Caleb.

## 7. Final cut (Gate: the cut)
- Caleb watches it. Nothing gets posted to Skool, YouTube or anywhere else until he says so.
- Spending, like Higgsfield clips or TubeLab, waits on an approved quote.
