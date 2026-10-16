---
name: cc-git-worktrees-parallel
description: Uses git worktrees so several Claude Code instances or agent teammates can each build a different feature or page in its own isolated folder on the same repo and merge back cleanly, following Nick Saraev's CLAUDE.md-driven worktree workflow. Use when Caleb says "build the about, contact and services pages at the same time", "agents keep overwriting each other's files", "work on two features in parallel without conflicts", or wants to add several pages to a listing or AIRE site at once.
---

# Git Worktrees for Parallel Development

**Source:** Nick Saraev, "CLAUDE CODE FULL COURSE 4 HOURS: Build & Sell (2026)", chapters 33 (end) and 34 (https://www.youtube.com/watch?v=QoQBzR1NIqI&t=12779s, https://www.youtube.com/watch?v=QoQBzR1NIqI&t=14554s)

## What Nick teaches

Git worktrees "used to be what agent teams are today." The idea: you have a main branch. You spin off branches (his sketch: hotfix, develop, feature), give each branch to a different agent, each agent extends its own branch, and when they are done you merge back to main. A branch is basically a copy of the folder with a few differences, and a merge tabulates the differences between two copies and applies the new ones to main. Merges can be messy, and having agents mediate them helps.

A worktree takes this one step further: every worktree is an isolated working directory that shares the same git history, so multiple Claude Code instances can work on different tasks simultaneously without interfering. For non-programmers the value is simple: files are never perfect separations of functionality, one file often holds a snippet another file uses, so two agents editing the same codebase will eventually step on each other's toes (agent conflicts). Worktrees eliminate that possibility entirely because each agent is in its own folder. The price is a merge step at the end.

His demo on his `leftclick-agency` site: he wanted an About, Contact and Services page in addition to the homepage. His CLAUDE.md already said: "We use git worktrees for parallel development with Claude Code. Every worktree is an isolated working directory sharing the same git history, allowing multiple Claude Code instances to work on different tasks simultaneously without interference." So Claude immediately:

1. Created three new folders beside the main one: `leftclick-agency-services`, `leftclick-agency-about`, `leftclick-agency-contact`, each a worktree on its own feature branch.
2. Used agent teams to work the three in parallel (faster, and each works in its own folder).
3. Each teammate's prompt read roughly: "You're building services.html for LeftClick Agency. Work in the worktree at [folder]. Create the file there. Do not modify index.html." Same for contact and about.
4. The main folder was untouched during the build.
5. Each page came back complete (about page with placeholder images, contact page with a working validated form, a chunky services page with estimated prices), then Claude merged everything back together.

His take: worktrees are not the end-all, but they are an extra layer of insulation when using agent teams or subagents on the same repo. All you need is a CLAUDE.md that explains the worktree workflow. He said he would include his file below the video.

## Step by step

1. Make sure the project is a git repo with a clean main branch (commit or stash first).
2. Add the worktree rule to CLAUDE.md (template below).
3. Prompt with the list of independent features or pages, one per worktree, and the rule that nobody touches shared files like `index.html`.
4. Let Claude create the worktrees (sibling folders, one branch each) and spawn one instance or teammate per worktree.
5. Review each page by opening it from its own folder.
6. Ask Claude to merge each branch back to main, resolve any conflicts, and delete the worktrees.
7. Open the merged site and check navigation between all pages.

## Templates / prompts

CLAUDE.md section (from Nick, cleaned):

```markdown
## Parallel development with git worktrees
- We use git worktrees for parallel development with Claude Code. Every worktree is an isolated working directory sharing the same git history, so multiple Claude Code instances can work on different tasks simultaneously without interference.
- When asked to build several independent pages or features, create one worktree per task as a sibling folder named <repo>-<task> on a branch named <task>.
- Each worker edits only files inside its worktree and never modifies shared files (index.html, shared CSS) without asking.
- When all workers are done, merge each branch into main, resolve conflicts, verify the site, then remove the worktrees.
```

Prompt (Caleb version):

```text
Add three pages to the listing site: neighborhood.html (St. Francisville schools, parks, drive times), gallery.html (photo grid from /photos), and schedule.html (showing request form). Use the git worktree workflow from CLAUDE.md, one worktree per page, in parallel. Do not touch index.html. When done, merge everything back to main and open the site so I can click through all four pages.
```

Worker spawn prompt pattern:

```text
You're building gallery.html for [site]. Work in the worktree at /path/<repo>-gallery. Create the file there using the shared styles already in the repo. Do not modify index.html or any shared file.
```

## Pitfalls Nick calls out

- Letting two agents edit the same file in one folder. Conflicts are inevitable over time.
- Forgetting the merge. Separate folders mean the changes do not harmonize automatically.
- Agent teams without worktrees on one repo. Use both for insulation.

## How Caleb should use this

- Listing microsites: build neighborhood, gallery and showing-request pages at once.
- AIRE: one worktree for the follow-up drafter, one for the CRM import script, one for the dashboard view, merged after each passes its QA.
- Any merge to a live site branch that auto-deploys (Netlify) needs Caleb's approval before running.

## Verification

- `git worktree list` shows one entry per task while the build runs and only main afterward.
- The main folder shows no changes until the merge.
- After merge, `git log` shows each feature branch merged and all pages open and link to each other.
