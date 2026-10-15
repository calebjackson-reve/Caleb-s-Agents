---
name: yt-auto-video-editor
description: Edits a talking-head recording end to end the way Nick Saraev automates his YouTube channel: neural silence removal, "cut cut" mistake removal, audio enhancement, optional color grade and swivel teaser, Claude-written summary and chapters, then Auphonic mastering and a private YouTube upload for review. Use when Caleb says "edit my video", "cut the dead air out of this recording", "clean up this market update", "get this listing walkthrough ready for YouTube", or "upload this to my channel".
---

# Auto video editor and uploader

**Source:** Nick Saraev, "f*ck it. Here's how I automated my youtube channel in 24 mins", chapter 2 (https://www.youtube.com/watch?v=S3kdxriOESk&t=28s). Free directives and scripts: https://drive.google.com/drive/folders/1bOQ0EY2eLk7BNnQ9PAwD-x5C6y7x-Fz- (directives/smart_video_edit.md, directives/jump_cut_vad.md, execution/jump_cut_vad_parallel.py, execution/insert_3d_transition.py, execution/simple_video_edit.py).

## What Nick teaches
Record the talking-head video in one take in OBS or anything else. The workflow extracts the audio, runs Silero VAD (a neural voice activity detector) to find speech, and cuts every silence gap over 0.5 seconds. If you say "cut cut" after a mistake, it removes the segment containing the trigger and the segment before it, so you just restart the sentence. Then it applies an audio chain (EQ, compression, loudness to -16 LUFS), an optional LUT color grade, and inserts a 5-second swivel teaser at the 3-second mark that previews content from 1:00 onward at 60x speed. Hardware acceleration makes it faster than Premiere. Directive rule: always use the parallel script, it is 5 to 10x faster.

The simpler alternative path uses FFmpeg silence detection (3 seconds at -35 dB), EBU R128 normalization, Whisper transcription, Claude-generated summary and chapters, then uploads to Auphonic, which masters the audio and pushes to YouTube through its outgoing service as a private video. Directive rule: always run local first with --no-upload, show the result, and only upload after the user confirms.

Nick built it by saying in plan mode: "build a workflow that takes a video, finds silence gaps, cuts them, finds mistakes, cuts those, builds a swivel intro. Give me three options, look at pre-existing solutions." He fed the three options to three Claude instances in parallel and kept the one that worked best (VAD-first). About 30 to 60 minutes and roughly $25 in API costs.

## Step by step
1. Set up once: download the Drive folder into a `video-workspace/` with `directives/` and `execution/`, create `.env` with ANTHROPIC_API_KEY and AUPHONIC_API_KEY (names only in chat, never values), install ffmpeg and the Python requirements the scripts import (silero-vad via torch, numpy, requests, anthropic, python-dotenv). Put a CLAUDE.md in the workspace that says: when Caleb says "edit X video", read directives first, then run the executions listed.
2. Replace Nick's account values: AUPHONIC_PRESET_UUID and YOUTUBE_SERVICE_UUID in simple_video_edit.py, and the YouTube description template in build_youtube_description, which carries his affiliate links. Use Caleb's template below.
3. Record. Say "cut cut" after any flub and restart the sentence.
4. Run step 1: `python3 execution/jump_cut_vad_parallel.py input.mp4 .tmp/edited.mp4 --enhance-audio --detect-restarts`
5. Run step 2 if a teaser is wanted: `python3 execution/insert_3d_transition.py .tmp/edited.mp4 output.mp4 --bg-image .tmp/bg.png`
6. Open the output and watch at least the first minute and one cut point. Report the before and after duration.
7. Only after Caleb says yes: `python3 execution/simple_video_edit.py --video output.mp4 --title "..."` which masters on Auphonic and uploads as private. Caleb publishes from YouTube Studio.

## Templates / prompts
Build-from-scratch prompt (plan mode, voice):
```
I'd like to build a simple workflow that takes a video as input, identifies the silence gaps, cuts
them, finds any mistakes I flag by saying "cut cut", cuts those too, enhances the audio, and
optionally adds a short intro animation. Start by giving me three options, including pre-existing
tools, and lay them out. If it makes sense we'll proceed.
```
Caleb description template for build_youtube_description:
```
{summary}

Caleb Jackson, REALTOR with Keller Williams First Choice
St. Francisville and Baton Rouge, Louisiana
No paid leads, just service.

Website: https://calebjackson.org
Instagram: https://www.instagram.com/calebjacksonla/
Email: aire@calebjackson.org   Phone: (225) 747-0303

Chapters
{chapters}
```
Workspace CLAUDE.md line:
```
When Caleb says "edit <video>", read directives/smart_video_edit.md, then run the listed execution scripts in order. Never upload without an explicit yes in this session.
```

## Pitfalls Nick calls out
- Saying the trigger words in the recording by accident edits out real content. Pick a phrase you never say naturally.
- The yt-dlp and FFmpeg-only paths are cruder than VAD. Background noise and breathing confuse dB thresholds.
- Do not ask "should I upload?" before editing. Edit locally, show it, then ask.
- Expect some API spend while building and testing.

## How Caleb should use this
- Weekly market update for St. Francisville and Baton Rouge: record in one take on the phone or OBS, say "edit the market update", review, approve upload.
- Listing walkthroughs and neighborhood tours: same pipeline, teaser previews the best room.
- The description template already carries Keller Williams First Choice and the tagline, which keeps every upload compliant with brokerage disclosure.
- Uploads are private until Caleb publishes. Installing Auphonic, buying credits, and any upload need Caleb's approval before running.

## Verification
- Output duration is shorter than input, and a spot-checked cut has no clipped words (padding default 100 ms).
- Audio loudness reads about -16 LUFS.
- If uploaded: the video appears in YouTube Studio as Private with the Caleb description and chapters, before anything is public.
