# Nick Saraev: "f*ck it. Here's how I automated my youtube channel in 24 mins"

Video: https://www.youtube.com/watch?v=S3kdxriOESk (23 min)
Free files (directives and Python scripts, Nick says copy them freely): https://drive.google.com/drive/folders/1bOQ0EY2eLk7BNnQ9PAwD-x5C6y7x-Fz-

## Thesis
Three agentic workflows cover most of a creator's pipeline: an outlier finder picks what to make, a thumbnail generator packages it, a video editor cuts, enhances and uploads it. All three were built in Claude Code with plan mode, voice dictation and the Directive, Orchestration, Execution structure, by someone who says he knows none of the Python. Total API cost to build the editor was about $25. "Software as a moat is nowhere near as valuable as it used to be."

## Chapters
1. 0m Introduction: the three workflows and that the video itself is the editor's output.
2. 0m Video editor: OBS recording, Silero neural voice activity detection, 0.5 s silence threshold, "cut cut" removes the mistake before it, audio enhancement, LUT color grade, swivel teaser, hardware acceleration, then Auphonic mastering and YouTube upload. Built by asking for three approaches in plan mode and testing all three in parallel Claude instances.
3. 8m Outlier finder: outlier score = video views divided by channel average, recency boost, cross-niche hook modifiers (money +30%, time +20%), transcript fetch, Claude summary, three title variants, output to a Google Sheet. Built by first asking Claude to research three APIs (TubeLab won over Apify and NoxInfluencer).
4. 16m Thumbnail generator: why plain face swaps fail (face direction), MediaPipe yaw and pitch, nearest reference photo by Euclidean distance in pose space, two references plus source to Gemini Nano Banana Pro, three variations per run, iterative edit passes for text and colors, run several in parallel.

## What is in the Drive folder
directives/: smart_video_edit.md, jump_cut_vad.md, pan_3d_transition.md, cross_niche_outliers.md, recreate_thumbnails.md
execution/: jump_cut_vad.py, jump_cut_vad_parallel.py, jump_cut_editor.py, insert_3d_transition.py, pan_3d_transition.py, simple_video_edit.py (FFmpeg + Auphonic + YouTube), scrape_cross_niche_tubelab.py, scrape_cross_niche_outliers.py (yt-dlp legacy), analyze_face_directions.py, recreate_thumbnails.py, video_effects/ (Remotion project for the 3D transition)

Keys the scripts read from .env: ANTHROPIC_API_KEY, AUPHONIC_API_KEY, TUBELAB_API_KEY, APIFY_API_TOKEN, NANO_BANANA_API_KEY, GOOGLE_APPLICATION_CREDENTIALS. Account-specific values to replace: the Auphonic preset UUID and YouTube outgoing-service UUID in simple_video_edit.py, the YouTube description template in the same file (it carries Nick's affiliate links), and the "nick_" prefix on reference photos.

| Skill | What it does | Trigger phrases |
|---|---|---|
| yt-auto-video-editor | Cut silences and mistakes, enhance audio, teaser, master and upload | "edit my video", "cut the dead air", "upload to YouTube" |
| yt-auto-outlier-finder | Find high-performing videos in adjacent niches, score, summarize, title ideas to a sheet | "what should I make a video about", "find outliers" |
| yt-auto-thumbnail-faceswap | Rebuild a proven thumbnail with Caleb's face, matched by head direction | "make a thumbnail like this one", "put my face on this thumbnail" |

## Top 5 takeaways for Caleb
1. Record in one take and say "cut cut" after any mistake. The editor removes the mistake and the trigger. No timeline editing.
2. Ask for three approaches and test them in parallel before committing. That is how the editor got built in under an hour.
3. Let the agent research the tools. Nick did not know TubeLab existed before Claude found it.
4. Thumbnails fail on head angle, not on the model. A 30 to 40 photo bank of Caleb at different angles fixes it once.
5. Everything uploads as private first. Caleb reviews, then publishes.
