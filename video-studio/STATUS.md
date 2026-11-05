# Video studio status log

Newest first. Every entry says what was done, what it was based on, and what needs Caleb.

## 2026-11-05: hub created, research round 1 done

**Confirmed by Caleb**
- Build the video studio as a new top-level hub in this repo, matching the AIRE and Skool hubs, with the four agents under `.claude/agents/`.
- This session runs research tracks 1 to 4 and scaffolds the agents and the judge README. The designer and judge rounds wait for his go-ahead.
- Cost scoring at the medium tier: 10 to 20 videos a month, $50 to $150 a month, one paid video plan acceptable.
- Live read-only checks on connected tools allowed. No generation, no credits spent.

**Done**
- `README.md`: the round loop, the scoring rubric, the blind judge round 1 procedure, related skills.
- `plan.md`: the round 1 plan as Caleb pasted it, with the volume and budget unknown marked resolved and two corrections noted.
- `research.md`: Blueprint, Proof, Unknowns and Recommendations across the four tracks. Scored matrices for images (Higgsfield 27, Fal.ai 26, Ideogram 20, Midjourney 16), video (Higgsfield 26, invideo 22, Claude Motion 19, Runway 18, Sora excluded) and editing (ffmpeg 26, invideo timeline 24, Descript 22, CapCut 21, Opus Clip 20), plus the eight-step scripting spec built from skills Caleb already has.
- Live checks 2026-11-05 21:12 to 21:16 UTC: Higgsfield shows 270.7 credits on the Plus plan (was 381.8 on the free plan on 2026-10-19). invideo shows 50 credits, one workspace, two projects. Sora shutdown confirmed from news sources.
- `.claude/agents/video-planner.md`, `video-researcher.md`, `video-designer.md`, `video-judge.md`.
- Root `README.md` Projects table: new row for this hub.

**Not verified**
- The official course page returns 403 and one review URL from the plan returns 404. Course scope rests on third-party pages that disagree with each other.
- Higgsfield per-run credit costs are from a third-party capture dated 2026-08-31 plus one first-hand data point from 2026-10-19. Veo 3.1 cost on Higgsfield unknown.
- Claude Motion plan availability comes from secondary sources. The official announcement URL returned 404.
- Nothing has been generated, so the quality scores are reputation and feature reads, not tests on Caleb's material.

**Needs Caleb**
- Resend the Instagram post link he wants torn down.
- Confirm the Higgsfield Plus price he pays and whether invideo is paid or free (account shows 50 credits).
- Run `ffmpeg -version` in Terminal on the Mac mini and say whether it prints a version.
- Say go for the designer round (writes `dashboard-spec.md` with candidates A and B) and then the blind judge round 1.
- Approve the first real test run and its credit estimate before anything is generated.
