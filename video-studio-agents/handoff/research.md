# Research: AI video studio stack for Caleb's Mac mini

Date: 2026-11-05. Written by the video-researcher agent against handoff/plan.md.
Volume assumption: plan.md leaves Caleb's volume unknown, so I used the agent spec's estimate of 8 to 15 short videos a month plus 2 long ones, and scored cost at roughly 8 to 20 shorts a month as instructed.

## Confirmed / Historical / Inference

- **Confirmed**: anything with a source URL below, plus connection status observed in this workspace today (Higgsfield MCP, invideo MCP, Metricool MCP, Runway skill pack, Postiz skill, social-media-skills pack all present in the session tool list, 2026-11-05).
- **Historical/context**: the course scope claims carried over from plan.md, third-party review material.
- **Inference**: all quality scores (no clips were generated in this session), all monthly cost totals (built from per-unit prices at the assumed volume), and anything labeled Inference inline. Pricing in this space moves monthly, and several sources below conflict with each other. Where they conflict I say so and name the live page to check.

### Blueprint

How the studio works, step by step:

1. Claude Code on the Mac mini is the only operator. Caleb types one request ("listing reel for 123 Oak St, 9 photos attached").
2. **Scripting**: Claude writes the hook, script and shot list locally using the repo's existing skills (hook-writer, reels-script, short-form-video-script). No external tool, no per-video cost.
3. **Visuals**: listing photos stay real (compliance rule: no fabricated property features). AI images are only for covers, graphics and market-update B-roll, generated through the Gemini API (Nano Banana) or Ideogram API by script.
4. **Video generation**: real listing photos go image-to-video through Kling 2.5 Turbo on fal.ai (cheap, per-second API billing) or through the already-connected Higgsfield MCP (Kling and Veo behind one credit wallet). Minimal-motion prompts keep walls straight.
5. **Voice**: script to voiceover through ElevenLabs API (or Higgsfield voices as the bundled option).
6. **Editing**: ffmpeg plus whisper.cpp on the Mac mini assembles clips, burns styled captions and exports 9:16. Fully scriptable, free, local. invideo MCP is the fallback when a template look is wanted.
7. **Publishing**: Claude drafts the post and schedules it through the Metricool MCP as a draft for review. Caleb approves in Metricool before anything goes live (repo approval gate).
8. Every run writes its assets and costs to a local folder so the judge round can audit it.

### Proof

Evidence per Blueprint step. All URLs retrieved 2026-11-05.

- Step 2: scripting skills exist in this workspace (session skill list, 2026-11-05). Claude subscription already paid, marginal cost zero. Inference: quality vs ChatGPT/Gemini not head-to-head tested, but no competitor offers in-repo skill integration.
- Step 3: Nano Banana (Gemini image) API per-image prices: 2.1 at about $0.034 per 1K image per [Activepieces](https://www.activepieces.com/blog/nano-banana-api-pricing-cost-per-image-in-2026) (Oct 2026); earlier snapshots at $0.039 to $0.067 per [BenchLM](https://benchlm.ai/media-pricing/nano-banana) (Sept 2026). Sources conflict, check https://ai.google.dev/gemini-api/docs/pricing. Ideogram API: $0.03 to $0.10 per image by quality tier per [Wireflow](https://www.wireflow.ai/blog/ideogram-api-pricing) (read the pricing page 2026-10-14) and [Puter](https://developer.puter.com/tutorials/ideogram-api-pricing/) (Jun 2026).
- Step 4: Kling 2.5 Turbo Pro on fal.ai about $0.35 per 5 s clip then $0.07 per extra second, per [fal image-to-video listing](https://fal.ai/explore/image-to-video-apis) via search summary (2026-11-05). Veo 3.1 on fal about $0.40 per second with audio, $0.20 without, per [llmreference](https://www.llmreference.com/model/veo-3.1-generate-001/fal-api). Runway API: Gen-4.5 at 12 credits per second at $0.01 per credit (about $0.12 per second), Gen-4 Turbo at 5 credits per second, per [Activepieces](https://www.activepieces.com/blog/runway-api-pricing-per-second-for-every-video-model.md) and [Magic Hour](https://magichour.ai/blog/runway-gen-45-pricing); API credits are a separate wallet from app plans. Higgsfield plans: roughly $19 Starter / $59 Plus / $129 Ultra with 270 / 1,200 / 3,000 credits per [Krea](https://www.krea.ai/blog/higgsfield-pricing-explained-2026-unlimited-credits-and-real-monthly-costs) and [HeyGen](https://www.heygen.com/blog/higgsfield-pricing) (both 2026); sources conflict ($15/$49 elsewhere), check higgsfield.ai/pricing. Veo 3 on Higgsfield about 58 credits per 8 s clip (HeyGen, May 2026). Real estate guidance: minimal motion, clearly described camera moves keep architecture stable, per [Magic Hour real estate guide](https://magichour.ai/blog/ai-video-tools-for-real-estate). No tested Kling vs Veo vs Sora vs Luma comparison on listing photos exists in public sources (see Unknowns).
- Step 5: ElevenLabs Creator $22 a month with about 100k credits and professional voice cloning, API around $0.04 to $0.08 per 1,000 characters depending on model, per [Happyrobot](https://www.happyrobot.ai/hub/elevenlabs-pricing) and [DEV](https://dev.to/techsifted/elevenlabs-pricing-2026-plans-credits-and-api-costs-explained-1549) (2026). Sources conflict on Starter price, check elevenlabs.io/pricing.
- Step 6: whisper.cpp runs locally on Apple silicon with Metal acceleration, ffmpeg extracts 16 kHz audio and burns subtitles, per [whisper-macos-cli docs](https://docs.rs/crate/whisper-macos-cli/latest) and [worked Mac mini pipeline example](https://seunghyeonlab.blogspot.com/2026/05/local-video-subtitles-with-ffmpeg.html) (May 2026). Descript shipped a public API in open beta May 2026 (Underlord actions, Studio Sound, captions) but local file export is unavailable, per [Newsfile press release](https://www.newsfilecorp.com/release/297461/Descript-Launches-API-in-Open-Beta-with-Editing-and-Workflow-Updates) and [Codewords](https://www.codewords.ai/blog/descript-api). No public CapCut API found (searched 2026-11-05): click-only, dead end for Claude. invideo MCP exists and is connected here (mcp.invideo.io/mcp, observed in session); invideo pricing is in flux, roughly $4 to $40 per seat after a Sept 2026 repackaging per [Costbench changelog](https://costbench.com/changelog/invideo-ai-price-increase-2026-02/) and [usagepricing](https://www.usagepricing.com/blueprint/activity/invideo-ai-2026-08-11-pricing-page-tabs); figures conflict badly, check invideo.io/pricing.
- Step 7: Metricool Starter about $18 to $22 a month, Advanced about $53, direct API gated to Advanced or Custom, per [SocialPilot](https://www.socialpilot.co/insights/metricool-pricing) and [PricingSaaS](https://pricingsaas.com/companies/metricool) (2026). The Metricool MCP connected here already exposes createScheduledPostForReview (observed in session), which fits the approval gate without the API tier. Postiz: about $23 to $29 entry on cloud, MCP and API on every cloud plan, free to self-host, per [Socialync](https://www.socialync.io/alternatives/postiz) and [Blotato](https://www.blotato.com/blog/postiz-pricing) (vendor-adjacent, Oct 2026).

### Unknowns

- Actual output quality of each video model on Louisiana listing photos. No public tested head-to-head of Kling vs Veo vs Sora vs Luma on real estate exists. All quality scores below are Inference. The round 1 judge run should generate the same photo through the top two and compare.
- Sora API access terms and per-clip cost at Caleb's volume. Not surfaced in searches run, left unscored on cost.
- Higgsfield's exact credit cost per Kling clip and whether the MCP wallet is the same as the web plan wallet. Sources conflict on plan prices and credit expiry (30 days vs reset at renewal).
- invideo's current live pricing after the Sept 2026 repackaging. Third parties contradict each other.
- Whisper accuracy specifically on a Southern US male voice. No published benchmark found. Needs one real test clip.
- Caleb's budget ceiling. Plan.md names this gap too.

---

## Recommendations

Everything below is recommendation, built from the Proof above. Scores 1 to 5, higher is better (for cost and lock-in, 5 means cheap and low lock-in). Q = output quality for real estate, D = Claude-drivability, M = Mac mini fit, C = cost at 8 to 20 shorts a month, S = setup effort (5 = easy), L = lock-in (5 = low).

### Track 1: scripting

| Tool | Q | D | M | C | S | L | Notes |
|---|---|---|---|---|---|---|---|
| Claude Code + repo skills (connected) | 5 | 5 | 5 | 5 | 5 | 5 | Already paid, hook/reels/tiktok skills in repo. Q is Inference. |
| ChatGPT | 4 | 4 | 5 | 3 | 3 | 4 | Good scripts, but a second subscription and no skill integration. |
| Gemini | 4 | 4 | 5 | 4 | 3 | 4 | Same story. |

**Pick**: Claude Code with the repo's scripting skills. **Fallback**: ChatGPT via API for variant sampling. **Why**: zero marginal cost, the skills already encode short-form structure, and the operator and the writer being the same tool removes a handoff.

### Track 2: image and visuals

| Tool | Q | D | M | C | S | L | Notes |
|---|---|---|---|---|---|---|---|
| Nano Banana via Gemini API | 5 | 5 | 5 | 5 | 4 | 4 | ~$0.03-0.07 per image, plain REST. |
| Nano Banana via Higgsfield MCP (connected) | 5 | 5 | 5 | 3 | 5 | 2 | Same model, credit markup, wallet lock-in. |
| Ideogram API | 4 | 5 | 5 | 5 | 4 | 4 | Best text rendering for quote cards and covers, $0.03-0.10. |
| Midjourney | 5 | 2 | 5 | 3 | 2 | 2 | Still no first-class public API. Dead end for Claude. Inference on API status, not re-verified this session. |
| Flux via fal.ai | 4 | 5 | 5 | 5 | 4 | 5 | Cheap, scriptable, many hosts. |

**Pick**: Nano Banana direct via Gemini API, with Ideogram for anything text-heavy. **Fallback**: Higgsfield MCP (already connected, zero new setup). **Why**: pennies per image at direct API prices, and real photos carry most listing reels anyway. Compliance note: AI images never depict the listed property's features.

### Track 3: video generation

| Tool | Q | D | M | C | S | L | Notes |
|---|---|---|---|---|---|---|---|
| Kling 2.5 Turbo via fal.ai | 4 | 5 | 5 | 5 | 4 | 5 | ~$0.35 per 5 s clip. Q is Inference. |
| Veo 3.1 via fal.ai | 5 | 5 | 5 | 3 | 4 | 5 | ~$1.60-3.20 per 8 s clip. Best raw quality per reviews. |
| Higgsfield MCP (connected) | 4 | 5 | 5 | 3 | 5 | 2 | Kling + Veo behind one wallet, ~$19-59/mo, credit expiry risk. |
| Runway API (connected skill) | 4 | 5 | 5 | 3 | 4 | 3 | $0.05-0.12 per second, separate API wallet. |
| Sora | 4 | 2 | 5 | ? | 2 | 3 | API access at this volume unverified. Scored Inference. |
| Luma Ray | 3 | 4 | 5 | 4 | 4 | 4 | Only self-ranked sources found. Inference. |

**Pick**: fal.ai as the single video API gateway, Kling 2.5 Turbo for everyday clips, Veo 3.1 for hero shots. **Fallback**: Higgsfield MCP, already connected and fine while credits last. **Why**: fal bills per second with no subscription floor, one API key covers both models plus Flux, and swapping models later is a one-line change (lowest lock-in on the board). At 15 shorts a month with 3 clips each, Kling-heavy usage runs roughly $16 to $30.

### Track 4: editing and assembly

| Tool | Q | D | M | C | S | L | Notes |
|---|---|---|---|---|---|---|---|
| ffmpeg + whisper.cpp local | 4 | 5 | 5 | 5 | 3 | 5 | Free, Metal-accelerated, fully scriptable. |
| invideo MCP (connected) | 4 | 5 | 5 | 4 | 5 | 2 | Timeline editing over MCP, pricing in flux. |
| Descript API (open beta) | 4 | 4 | 5 | 3 | 3 | 3 | Studio Sound + captions via API, but no local file export yet. |
| CapCut | 4 | 1 | 5 | 4 | 4 | 2 | No public API found. Click-only dead end. |
| DaVinci Resolve | 5 | 3 | 5 | 5 | 2 | 4 | Free, has a Python scripting API, steep automation curve. Inference on API ergonomics. |

**Pick**: ffmpeg + whisper.cpp scripted pipeline on the Mac mini (assembly, captions, 9:16 export). **Fallback**: invideo MCP for template-styled edits and when a browser preview helps. **Why**: it is the only path that is free, local, deterministic and 100 percent Claude-drivable, and a worked Mac mini pipeline already exists in the wild (source in Proof, step 6).

### Voice and publishing (supporting tracks)

- **Voice pick**: ElevenLabs Creator ($22/mo) for a cloned Caleb voice. Fallback: Higgsfield voices (connected, bundled). Burn-in captions come from the local whisper step.
- **Publishing pick**: Metricool MCP (connected) using createScheduledPostForReview so Caleb approves everything. Fallback: Postiz (MCP on every cloud plan, ~$23-29/mo, or free self-hosted on the Mac mini).

### Recommended full stack

Claude Code (scripting and orchestration) → Gemini API Nano Banana + Ideogram (graphics) → fal.ai Kling/Veo (clips from real photos) → ElevenLabs (voice) → ffmpeg + whisper.cpp (assembly and captions) → Metricool MCP draft-for-review (publishing).

Biggest risk: all video quality scores are Inference. If Kling's architecture stability disappoints on real interiors, costs roughly triple moving to Veo. Test both in the judge round before committing.

### Estimated monthly cost range

At 8 to 20 shorts a month (Inference, built from the per-unit prices in Proof):

- fal.ai video: $15 to $60 (Kling-heavy low end, Veo-heavy high end)
- Images: $1 to $5
- ElevenLabs Creator: $22
- Metricool Starter: ~$18 to $22 (or $0 if the current connection's plan already covers it)
- ffmpeg/whisper: $0
- **Total: roughly $55 to $110 a month**, before any existing Higgsfield or invideo subscriptions, which become optional under this stack.

### Setup checklist

**Caleb must** (accounts, payments, approvals):
1. Create a fal.ai account, add a payment method, generate an API key.
2. Get a Google AI Studio (Gemini) API key with billing, and an Ideogram API key if text-heavy graphics are wanted.
3. Subscribe to ElevenLabs Creator and record the professional voice clone consent audio himself.
4. Confirm the Metricool plan covers the brands he posts to, and decide whether to keep or drop the Higgsfield and invideo subscriptions.
5. Approve each scheduled post in Metricool (standing approval gate).
6. Confirm the live prices flagged as conflicting above before paying: higgsfield.ai/pricing, invideo.io/pricing, elevenlabs.io/pricing, ai.google.dev/gemini-api/docs/pricing.

**Claude can** (installs, config, scripts):
1. `brew install ffmpeg` and build whisper.cpp with Metal, download a medium or large model.
2. Write the pipeline scripts: photo prep, fal.ai generation calls, voiceover call, ffmpeg assembly, caption burn-in, 9:16 export presets.
3. Store API keys in the Mac keychain or a git-ignored .env, never in the repo.
4. Wire the Metricool MCP draft-for-review step and the cost log per video.
5. Run one test clip of Caleb's voice through whisper to check Southern-accent accuracy, and one listing photo through Kling and Veo for the quality bake-off.
6. Keep all outputs in git-ignored folders per the client-data rule.

### Sources

All retrieved 2026-11-05. Higgsfield: [Krea](https://www.krea.ai/blog/higgsfield-pricing-explained-2026-unlimited-credits-and-real-monthly-costs), [HeyGen](https://www.heygen.com/blog/higgsfield-pricing). Runway: [Activepieces](https://www.activepieces.com/blog/runway-api-pricing-per-second-for-every-video-model.md), [Magic Hour](https://magichour.ai/blog/runway-gen-45-pricing). fal.ai: [fal image-to-video](https://fal.ai/explore/image-to-video-apis), [llmreference Veo 3.1](https://www.llmreference.com/model/veo-3.1-generate-001/fal-api). invideo: [Costbench](https://costbench.com/software/ai-video-generators/invideo-ai/), [usagepricing](https://www.usagepricing.com/blueprint/activity/invideo-ai-2026-08-11-pricing-page-tabs). Descript: [Newsfile](https://www.newsfilecorp.com/release/297461/Descript-Launches-API-in-Open-Beta-with-Editing-and-Workflow-Updates), [Codewords](https://www.codewords.ai/blog/descript-api). Images: [Activepieces Nano Banana](https://www.activepieces.com/blog/nano-banana-api-pricing-cost-per-image-in-2026), [BenchLM](https://benchlm.ai/media-pricing/nano-banana), [Wireflow Ideogram](https://www.wireflow.ai/blog/ideogram-api-pricing), [Puter Ideogram](https://developer.puter.com/tutorials/ideogram-api-pricing/). Voice: [Happyrobot](https://www.happyrobot.ai/hub/elevenlabs-pricing), [DEV ElevenLabs](https://dev.to/techsifted/elevenlabs-pricing-2026-plans-credits-and-api-costs-explained-1549). Editing local: [whisper-macos-cli](https://docs.rs/crate/whisper-macos-cli/latest), [Mac mini pipeline](https://seunghyeonlab.blogspot.com/2026/05/local-video-subtitles-with-ffmpeg.html). Real estate video: [Magic Hour](https://magichour.ai/blog/ai-video-tools-for-real-estate). Publishing: [SocialPilot Metricool](https://www.socialpilot.co/insights/metricool-pricing), [PricingSaaS](https://pricingsaas.com/companies/metricool), [Socialync Postiz](https://www.socialync.io/alternatives/postiz), [Blotato Postiz](https://www.blotato.com/blog/postiz-pricing).
