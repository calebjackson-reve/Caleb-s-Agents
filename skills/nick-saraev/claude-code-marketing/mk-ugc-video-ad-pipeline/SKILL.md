---
name: mk-ugc-video-ad-pipeline
description: Generates UGC-style talking-head video ads at scale by having Claude Code drive Higgsfield (or a similar video model aggregator): product image + influencer image -> hero frame -> 10 short scripts -> 3 video candidates per script, crossed across people and products, with Nick Saraev's word-count duration rule and concurrency caps. Use when Caleb says "make a video ad for this listing", "I need testimonial-style videos", "spin up 20 short-form videos for the neighborhood guide", "AI spokesperson video for AIRE", or wants video creative tested cheaply before hiring a videographer.
---

# UGC-style AI video ad pipeline (Higgsfield steered by Claude)

**Source:** Nick Saraev, "Claude Code Marketing Full Course (6 Hours)", chapters 8 and 9 (https://www.youtube.com/watch?v=yulWjh3rq28&t=9308s and &t=10755s)

## What Nick teaches

Video models have many more frames than images, so more ways to fail. Expect imperfect output and plan to generate several candidates. Flows that work best right now: **UGC-style testimonials and product reviews**. Nick knows people spending tens of thousands per day on fully AI ads from this flow, with extra polish (hard-coded captions, visuals, dubbing, noise layers). Video costs more than photo. A first manual test round is "$10 to $20."

**Higgsfield** is a model aggregator (video, image, text models, one key, an MCP and a CLI). Nick picked it because Claude drives it easily. Another vendor means more plumbing.

### Do it manually once (ch. 8)
1. Sign up at higgsfield.ai (chose "UGC videos", "beginner", "MCP").
2. **Image step**: upload a reference influencer photo (from Pinterest. Mostly women because that tests better) and generate "a woman with all her features but ultimately different, change hair, indoors" with GPT image 2 at **2K**, batch 3 (21 credits). Pick one.
3. Generate the **hero frame**: reference the new influencer + the product (Midnight Clay mask): "holding my product in a bathroom where it would make sense, enthusiastic but don't oversell." One shot was enough.
4. **Scripts**: in Claude, upload the product image: "generate 3 scripts a real influencer would say, young woman, ~30 seconds." Nick edited to his voice.
5. **Video step**: add the product as a reusable **element** so it stays consistent. Prompt "a woman influencer doing a UGC-style ad talking about a product". Turn **sound on**. Try several models (Kling 3.0 Turbo, Seedance 2.0 Fast, Gemini Omni Flash). Omni Flash caps at 10 seconds, so scripts must be short. He settled on ~146 characters / **27 to 30 words** fitting 10 seconds, 16:9.
6. Watch for failures: product vanishing mid-shot, repeated lines when the script is too short, weird start frames, over-smooth skin. Men's clips were worse ("less training data").

### Automate it (ch. 8 to 9)
1. Install the Higgsfield CLI via the snippet on their "MCP and CLI" page. Log in via OAuth. (Also added later as a custom connector for the routine.)
2. Voice-dump the pipeline to Claude: product image + influencer image -> hero frame via GPT image 2 (key in local env) -> **10 script candidates under 35 words** -> show hero frame and scripts for approval -> use the hero frame as **start frame** for Gemini Omni Flash, 10s, 16:9, prompt "a woman influencer talking about a product" -> **3 candidates per script** -> download and deliver.
3. Claude submits the three jobs in parallel and confirms billing before spending credits.
4. Refinement rules Nick added when making the skill:
   - Drop the human-approval step. "no human oversight until the last step, parallelize where possible."
   - **Duration rule: under 22 words = 8 seconds, over 22 words = 10 seconds.** (28 words at 10s "felt short".)
   - **Cross** every influencer in the folder with every product (influencer A x product A and B, influencer B x product A and B). He made `video ad assets/` with all images and had Claude classify them. A subfolder structure per type would be cleaner.
   - Higgsfield allowed only **8 concurrent jobs**. 4 pairings x 3 = 12 failed. Fix in the skill: submit candidates within a script in parallel, **capped at 3 concurrent**, retry failures one at a time.
   - Credit check: Claude first proposed 9 videos per person (~1,000 credits). Corrected to 3 (~300 to 360 credits).
5. **Routine**: new routine -> Cloud -> add Higgsfield connector -> "make this a routine." Claude created a Drive folder, uploaded source images (downsized, base64), and wrote the step list: list files in the asset Drive folder -> detect new assets since last run via dated subfolders -> build the influencer x product cross -> per pairing: hero frame, 10 scripts, select best, duration by word count, 3 video candidates -> upload to a dated Drive subfolder. Named "UGC video ads daily batch." Runs for cents in tokens plus Higgsfield credits.

Ideas Nick floated for later: 10 influencers x 10 settings x 10 scripts = 1,000 videos. Auto-QA by slicing each video into 1-second frames and having Claude flag malformed frames. Cut the first 3 frames. Add background audio and grain to reduce the AI look.

## Step by step

1. Create `video-ad-assets/products/` and `video-ad-assets/people/`. Add clear product images and 1 to 3 consistent spokesperson images (generated or licensed. Never a real person without consent).
2. Run the manual flow once in Higgsfield to confirm the model can hold the product and speak a 10-second script.
3. Connect Higgsfield (CLI login, plus custom connector for routines) and ensure `OPENAI_API_KEY` (or chosen image model) is in the environment.
4. Prompt the pipeline (template below) and approve the first hero frame + scripts.
5. Consolidate into a skill with the duration rule, concurrency cap, cross-product logic, and retry.
6. Run on the asset folder. Review candidates. Keep the best 1 of 3 per script.
7. Promote to a routine writing to Drive only after two clean manual runs and a credit-cost estimate.

## Templates / prompts

Pipeline brief:
```
Pipeline for UGC-style video ads. Inputs: folder video-ad-assets (products/ and people/).
For every person x product pairing:
1. Hero frame: generate a start frame of the person holding the product in a fitting setting
   (image model via {{env key / connector}}). 2K.
2. Write 10 script candidates, first person, conversational, benefits-led, each under 35 words.
3. Duration rule: < 22 words -> 8 s. >= 22 words -> 10 s.
4. For each script generate 3 video candidates with {{video model}}, 16:9, sound on, using the
   hero frame as start frame and the product as a reusable element. Prompt: "a {{person}} influencer
   talking about a product, natural UGC style."
5. Max 3 concurrent jobs. Retry failed jobs one at a time.
6. Download all candidates to ./out/{{date}}/{{person}}-{{product}}/ and write an index.html to review.
Confirm the credit estimate with me before submitting video jobs.
```

Script style guide (from Nick's edits):
```
"Okay I have to talk about this. {{product}}. {{one-line problem}}. {{what you do with it}}.
{{result}}. Genuinely obsessed." Keep 27 to 30 words for 10 s. Avoid repeating lines.
```

## Pitfalls Nick calls out

- Too-short scripts make the avatar repeat itself. Too long gets cut.
- Products can vanish or morph. Add them as elements and QA every clip.
- Concurrency limits cause silent failures. Cap and retry.
- Claude may over-provision (9 per person). Always ask for the credit estimate first.
- Base64 uploads of big images to Drive were flaky. Downsize first.
- This is not free. Credits plus tokens.

## How Caleb should use this

- Best fits: neighborhood explainer shorts ("3 things to know before buying in West Feliciana"), buyer/seller FAQ clips, AIRE product explainer, "what's my home worth" CTA videos. Use a consistent AI spokesperson that is clearly not a real client.
- Do not use AI avatars as fake client testimonials. Fair-housing and advertising rules apply. Label AI-generated content where required. Publishing any video **needs Caleb's approval before running**.
- Product images = listing hero photo or a branded "Free Home Valuation" card. People = 2 to 3 generated spokespeople in different demographics to test.
- Every run spends Higgsfield credits. The first test and any routine schedule **needs Caleb's approval before running**. Start with 1 pairing x 3 scripts x 3 candidates.
- Keep the picker review habit: Caleb watches 9 clips, keeps 2, posts via Metricool after review.

## Verification

- Manual Higgsfield test produced a 10-second clip with audible, on-script speech and the product visible throughout.
- Skill run produced the full cross (people x products), respected the 8s/10s rule, never exceeded 3 concurrent jobs, and retried failures.
- Output folder has 3 candidates per script and an index page. Credit spend matches the pre-run estimate.
