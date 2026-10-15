---
name: yt-auto-outlier-finder
description: Finds video ideas the way Nick Saraev does, by pulling high-performing "outlier" videos from adjacent niches (views divided by the channel's average, with a recency boost and hook modifiers), summarizing their transcripts and generating three title variants for Caleb's channel into a Google Sheet. Use when Caleb says "what should my next video be", "find me video ideas that are working right now", "what titles are winning for real estate agents", or "run the outlier finder".
---

# Cross-niche outlier finder

**Source:** Nick Saraev, "f*ck it. Here's how I automated my youtube channel in 24 mins", chapter 3 (https://www.youtube.com/watch?v=S3kdxriOESk&t=520s). Free files: https://drive.google.com/drive/folders/1bOQ0EY2eLk7BNnQ9PAwD-x5C6y7x-Fz- (directives/cross_niche_outliers.md, execution/scrape_cross_niche_tubelab.py, execution/scrape_cross_niche_outliers.py).

## What Nick teaches
YouTubers pick titles and thumbnails by finding what already worked. The measure is the outlier score: a video's views divided by the average views on its own channel. A 6.81 means the video did almost seven times what that channel normally does, so something in the packaging is worth studying. Nick's workflow uses the TubeLab API (pre-computed outliers across 4M+ videos, 5 credits per query, about 100 outliers from the last 30 days per run) and adds a recency boost that weights newer videos up, plus cross-niche modifiers: +30% when the hook is about money, +20% when it is about time. It then fetches each transcript, has Claude summarize it and generate three title variants adapted to Nick's own channel, and writes everything to a Google Sheet with the thumbnail, title, link and score so he can decide at a glance. The yt-dlp scraper is the free fallback and fails 80% of the time from rate limits.

He built it in two prompts. First: "I'd like to build a workflow that finds outliers on YouTube. Before we proceed, look comprehensively across the internet for at least three APIs that have already done this." Claude surfaced TubeLab, Apify and NoxInfluencer. Then, with the winner: "Build a workflow that uses TubeLab to scrape outliers in niches similar to mine but not related, analyze the transcripts, return a summary, all TubeLab fields, and three alternative titles based on my channel. Build a comprehensive plan and put it in front of me." Claude asked for the channel, related niches, output (Google Sheet), volume (100 per run) and filters (last month). Daily use is one line: "find me 50 outliers and dump to a Google Sheet."

## Step by step
1. One-time: get a TubeLab key and a Google service account JSON for Sheets, put TUBELAB_API_KEY, ANTHROPIC_API_KEY and GOOGLE_APPLICATION_CREDENTIALS in .env. Share the target sheet with the service account email.
2. Define Caleb's niche inputs: core (real estate agents, home buying and selling in Louisiana) and adjacent-but-not-competing (personal finance, local business, home improvement, relocation, small-town life).
3. Run: `python3 execution/scrape_cross_niche_tubelab.py --terms "selling your house" "first time home buyer" --queries 2`
4. Open the sheet. Sort by outlier score. Read the summaries and the three title variants.
5. Pick one or two. Hand the chosen video link to yt-auto-thumbnail-faceswap.
6. Optional: schedule the run weekly as a loop or cloud routine (see mk-prompt-skill-loop-routine-ladder).

## Templates / prompts
Research prompt:
```
I'd like to build a workflow that finds outlier videos on YouTube in niches adjacent to mine. Before
we proceed, look across the internet for at least three APIs that already compute outlier scores.
Compare pricing and reliability, then recommend one.
```
Title-variant instruction inside the directive:
```
For each outlier, write three alternative titles for a channel run by a Louisiana REALTOR
(St. Francisville and Baton Rouge) that keep the hook structure but swap the subject to buying,
selling, moving to or investing in the area. No clickbait claims about prices or guarantees.
```

## Pitfalls Nick calls out
- Free scraping with yt-dlp looks attractive and then fails most of the time. Pay the few credits.
- Score only within a channel's own average. Raw view counts tell you about the channel, not the idea.
- Cross-niche means not directly competitive. Copying the structure is the point, not the topic.

## How Caleb should use this
- Monthly video planning: run once, pick two ideas, record both in one sitting.
- Watch for local-interest hooks (schools, flood zones, insurance, "moving to Baton Rouge") that outperform generic agent content.
- The same scoring works on Instagram Reels and TikTok if a scraper is available, which feeds Metricool scheduling.
- Buying TubeLab credits needs Caleb's approval before running.

## Verification
- The sheet has a row per outlier with link, thumbnail, title, outlier score, summary and three titles.
- Spot-check two scores by hand: video views divided by that channel's recent average lands near the sheet value.
