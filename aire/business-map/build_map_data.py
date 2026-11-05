#!/usr/bin/env python3
"""Build data.json for the AIRE Business Map from what is actually in this repo.

Every node is a real job: a script, a skill, a directive, a scheduled job,
a page or a program that exists in Caleb-s-Agents. Skills are read from their
SKILL.md front matter. The hand-written catalog below covers the scripts,
directives and pages whose purpose lives in READMEs rather than front matter.

No client data goes in here. Names of people, phones, emails and addresses
never appear in the map.

Run:  python3 aire/business-map/build_map_data.py
"""
import json
import os
import re
import sys
from datetime import datetime, timezone

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(os.path.dirname(__file__), "data.json")

# Department id, label, one line on what it does, and the voice it speaks in.
DEPARTMENTS = [
    {"id": "leadgen", "label": "Lead Generation",
     "tagline": "Every inquiry answered inside a minute, every lead tagged.",
     "voice": "quick and bright, the first voice a new lead hears"},
    {"id": "nurture", "label": "Nurture and Follow-up",
     "tagline": "The right touch, on the right day, approved by Caleb first.",
     "voice": "warm and patient, never pushy"},
    {"id": "deals", "label": "Deals and Transactions",
     "tagline": "Contract to close: deadlines, proposals, signatures.",
     "voice": "calm and exact, reads a deadline like a pilot reads a checklist"},
    {"id": "market", "label": "Market Intelligence",
     "tagline": "Permits, listings, comps and farms, refreshed twice a day.",
     "voice": "measured analyst, every number carries its source and date"},
    {"id": "marketing", "label": "Marketing and Content",
     "tagline": "Reels, just-solds, the site and the monthly market update.",
     "voice": "upbeat creative director with a Louisiana ease"},
    {"id": "ops", "label": "Operations",
     "tagline": "The CRM engine, schedules, compliance and the morning run.",
     "voice": "steady back-office lead, low and unhurried"},
    {"id": "engine", "label": "AI Engine",
     "tagline": "How AIRE is built: Claude Code, agents, workflows, apps.",
     "voice": "the builder, precise and a little playful"},
    {"id": "offer", "label": "Agent Offer and Education",
     "tagline": "What Caleb teaches and sells to other agents: Skool, workshops, tiers.",
     "voice": "coach on stage, generous and clear"},
]

# kind: script | directive | schedule | page | skill | program | doc
CATALOG = [
    # Lead Generation
    ("leadgen", "Speed to lead responder", "directive", "aire/speed-to-lead/directive.md",
     "Website inquiry responder. Templates, dry run by default, runner lives on the Mac."),
    ("leadgen", "Lead enrichment (Haiku)", "script", "aire/lead-enrichment/enrich.py",
     "Bulk tier lead tagging on Haiku 5.5 with JSON schema output. DRY_RUN default."),
    ("leadgen", "Lead enrichment directive", "directive", "aire/lead-enrichment/directive.md",
     "How a raw lead list becomes tagged, scored rows."),
    ("leadgen", "Enrichment runner", "script", "aire/enrichment/execution/run_enrichment.py",
     "Runs the whole enrichment pass over the CRM sheet."),
    ("leadgen", "Identity resolver", "script", "aire/enrichment/execution/identity.py",
     "Matches a contact across email, phone and text signals without duplicates."),
    ("leadgen", "Gmail signals", "script", "aire/enrichment/execution/gmail_signals.py",
     "Reads who wrote, who replied and how long ago, from Gmail."),
    ("leadgen", "iMessage signals", "script", "aire/enrichment/execution/imessage_signals.py",
     "Reads text activity. Group chats with two or more others are left out."),
    ("leadgen", "Social signals", "script", "aire/enrichment/execution/social_signals.py",
     "Adds public social signals to a contact's record."),
    ("leadgen", "LLM tagger", "script", "aire/enrichment/execution/llm_tag.py",
     "Model pass that tags intent and stage on each contact."),
    ("leadgen", "Score and label", "script", "aire/enrichment/execution/score_and_label.py",
     "Turns signals into hot, warm and cold labels."),
    ("leadgen", "Merge HWC", "script", "aire/enrichment/execution/merge_hwc.py",
     "Merges hot, warm, cold labels back into the one CRM sheet."),
    ("leadgen", "CRM client", "script", "aire/enrichment/execution/crm_client.py",
     "The one read and write path to the AIRE CRM sheet."),
    ("leadgen", "Enrichment directive", "directive", "aire/enrichment/directive.md",
     "The rules every enrichment run follows."),
    ("leadgen", "Enrichment tests", "script", "aire/enrichment/tests/test_enrichment.py",
     "Offline checks for the enrichment pipeline."),
    ("leadgen", "Seller net sheet calculator", "page", "aire/calculators/net-sheet.html",
     "Interactive seller net sheet for calebjackson.org. Math checked in a headless browser."),
    ("leadgen", "Luxury Presence integration", "doc", "lp-integration/README.md",
     "Site fixes, motion and tokens for the IDX site, one support case per topic."),

    # Nurture and Follow-up
    ("nurture", "Follow-up cadence", "script", "aire/follow-up/followups.py",
     "Daily cadence: KW Command export in, morning approval queue out."),
    ("nurture", "Template pools", "script", "aire/follow-up/pools.py",
     "Four template pools, no repeats, quiet hours, opt-out flags."),
    ("nurture", "Follow-up directive", "directive", "aire/follow-up/directive.md",
     "When a touch is due and what it may say."),
    ("nurture", "Follow-up templates", "doc", "aire/follow-up/templates.md",
     "The approved words, one pool per situation."),
    ("nurture", "Pipeline daily screen", "page", "aire/pipeline-app/app.py",
     "Caleb's one daily tool: Jarvis-style screen over the CRM feed, the one sender."),
    ("nurture", "Jarvis voice commands", "script", "aire/pipeline-app/jarvis.py",
     "77 spoken commands answered from the feed, median 7 ms. Only weather and calendar go to Claude."),
    ("nurture", "Speech engine", "script", "aire/pipeline-app/speech_engine.py",
     "Text to speech for Pipeline. The slot Fish Audio S2.1 Pro drops into."),
    ("nurture", "Predraft replies", "script", "aire/pipeline-app/predraft.py",
     "Drafts the next text for a contact before Caleb opens the box."),
    ("nurture", "Jarvis eval", "script", "aire/pipeline-app/eval_jarvis.py",
     "Replays spoken-style commands through the microphone path and scores them."),
    ("nurture", "Pipeline launch agent", "schedule", "aire/pipeline-app/launchd/org.calebjackson.aire.pipeline.plist",
     "Keeps Pipeline running on the Mac, live sender, 25 texts a day cap."),
    ("nurture", "Pipeline installer", "script", "aire/pipeline-app/install.sh",
     "Installs the Pipeline launch agent."),
    ("nurture", "Command reader", "script", "aire/command-reader/command_reader.py",
     "Reads KW Command on the Mac so the sheet mirrors it. Read only."),
    ("nurture", "Command reader schedule", "schedule", "aire/command-reader/org.calebjackson.aire.command.plist",
     "Runs the Command reader on a schedule."),
    ("nurture", "Command reader directive", "directive", "aire/command-reader/directive.md",
     "What the reader may read and where it writes."),
    ("nurture", "Morning run", "directive", "aire/morning-run/directive.md",
     "The morning sequence: ingest, cadence, queue, brief."),
    ("nurture", "Mac companion", "doc", "aire/morning-run/mac-companion.md",
     "What runs on the Mac each morning and how to check it."),

    # Deals and Transactions
    ("deals", "Listing proposal", "script", "aire/proposal/proposal.py",
     "Call recording to listing proposal: one-page HTML with signature pad and email draft."),
    ("deals", "Proposal directive", "directive", "aire/proposal/directive.md",
     "Transcript in, proposal and follow-up email out."),
    ("deals", "Proposal template", "page", "aire/proposal/template-listing.html",
     "The listing proposal page clients sign."),
    ("deals", "Approvals page", "page", "aire/approvals/index.html",
     "Decisions waiting on Caleb, one button each."),
    ("deals", "Pipeline template", "doc", "aire/pipeline/pipeline-template.csv",
     "Historical deals template. Deals now live in the CRM sheet's Deals tab."),
    ("deals", "Offer memo", "doc", "aire/offer/OFFER-2026-10.md",
     "What goes into an offer and what Caleb checks before it is sent."),
    ("deals", "Transaction forms", "skill", "skills: transact-fill-form, transact-open-deal, transact-signing-prep",
     "Chat skills that open a deal, fill forms and prep signing in Transact."),
    ("deals", "Compliance fix", "skill", "skills: transact-compliance-fix, tc-agreement-review-gate",
     "Review gate on every agreement before the TC sends it."),
    ("deals", "Seller net sheet", "skill", "skills: seller-net-sheet",
     "Net sheet from list price, payoff and closing costs."),

    # Market Intelligence
    ("market", "Market monitor", "script", "aire/map-crm/monitor.py",
     "Reads permits and Flexmls saved-search alerts into the cache. 73 rows from 8 alerts in the first live dry run."),
    ("market", "Geocoder", "script", "aire/map-crm/geo.py",
     "Pins contacts and permits on the map with free geocoders."),
    ("market", "Market refresh", "script", "aire/map-crm/refresh_market.sh",
     "Permits and Flexmls mail into the cache, then the feed rebuild."),
    ("market", "Market refresh schedule", "schedule", "aire/map-crm/launchd/org.calebjackson.aire.market.plist",
     "8:00 am and 3:00 pm every day on the Mac."),
    ("market", "Map CRM installer", "script", "aire/map-crm/install.sh",
     "Installs or removes the market launch agent."),
    ("market", "Map CRM contract", "doc", "aire/map-crm/CONTRACT.md",
     "Map page, Market Monitor and deals map toggle for Pipeline."),
    ("market", "Farms (example)", "doc", "aire/map-crm/farms.example.json",
     "Shape of a drawn farm. Real farms stay on the Mac."),
    ("market", "GBRAR report 2026-09", "doc", "aire/market-data/gbrar-2026-09.json",
     "Dated market stats with their source."),
    ("market", "Monthly market update script", "doc", "aire/market-update/2026-10-script.md",
     "Script and Motion prompts for the monthly update."),
    ("market", "Vertical market video", "script", "aire/market-update/vertical/render.mjs",
     "Renders the vertical market update."),
    ("market", "Flexmls CMA", "skill", "skills: flexmls-cma, flexmls-comp-rankings",
     "CMA and comp rankings from Flexmls."),
    ("market", "Baton Rouge market command", "skill", "skills: command-market-baton-rouge-la",
     "Market answer for Baton Rouge with sources and dates."),
    ("market", "Zillow lookups", "skill", "connector: Zillow",
     "Zestimate, property details, affordability."),
    ("market", "Reference teardowns", "doc", "aire/research/reference-teardowns/README.md",
     "Measured teardowns of reference sites: FIND, SOBHA, ZORGE."),

    # Marketing and Content
    ("marketing", "Just-sold renderer", "script", "aire/social/just-sold/2026-10/render.mjs",
     "Renders the just-sold post set."),
    ("marketing", "Motion kit", "page", "motion-kit/index.html",
     "Scroll, cursor and hover effects rebuilt from heronaiapp.com for the site."),
    ("marketing", "Motion kit teardown", "doc", "motion-kit/TEARDOWN.md",
     "How the original does each effect."),
    ("marketing", "Website rebuild", "doc", "website-rebuild/DESIGN-SYSTEM.md",
     "Design system, punch list, go-live plan for calebjackson.org."),
    ("marketing", "Site build", "script", "website-rebuild/site/scripts/build.py",
     "Builds the static site."),
    ("marketing", "Site deploy (Cloudflare)", "script", "website-rebuild/site/scripts/deploy-cloudflare.sh",
     "Deploys the built site. Runs only on Caleb's go."),
    ("marketing", "Site dist", "script", "website-rebuild/site/scripts/dist.py",
     "Packages the site for upload."),
    ("marketing", "Architectural preview", "page", "architectural-preview/index.html",
     "Preview page with verification log."),
    ("marketing", "Reference capture", "script", "aire/research/reference-capture/capture.mjs",
     "Captures reference sites frame by frame for teardowns."),
    ("marketing", "Font compare", "script", "aire/research/reference-capture/fontcompare.mjs",
     "Compares type across reference captures."),
    ("marketing", "Capture summary", "script", "aire/research/reference-capture/summarize.py",
     "Summarizes a capture run."),
    ("marketing", "Metricool scheduling", "skill", "connector: Metricool",
     "Drafts only. Caleb schedules."),
    ("marketing", "Motion reel", "skill", "skills: motion-reel, reanimate-motion, whiteboard-rules-reel",
     "Reel builds in Claude Motion."),
    ("marketing", "Lesson: reverse engineer everything", "page", "lessons/reverse-engineer-everything/lesson.html",
     "Published lesson page."),
    ("marketing", "Lesson: the floor is rising", "doc", "lessons/the-floor-is-rising/LESSON.md",
     "Lesson draft."),

    # Operations
    ("ops", "CRM engine", "script", "aire/crm/crm.py",
     "Gmail ingest, cadence, tasks, deals and feed.json on the one CRM sheet. 3,626 contacts."),
    ("ops", "Hourly ingest", "script", "aire/crm/ingest_hourly.sh",
     "Pulls new mail into the CRM every hour."),
    ("ops", "Feed refresh", "script", "aire/crm/refresh_feed.sh",
     "Rebuilds feed.json for Pipeline."),
    ("ops", "CRM directive", "directive", "aire/crm/directive.md",
     "The gates every CRM write passes."),
    ("ops", "Feed contract", "doc", "aire/crm/FEED.md",
     "What feed.json holds and who reads it."),
    ("ops", "Command center sync", "script", "aire/command-center/sync.py",
     "Reads the tools' own files into the morning page. Localhost only."),
    ("ops", "Command center clickthrough", "script", "aire/command-center/tests/clickthrough.mjs",
     "Drives Chromium through every action on the morning page."),
    ("ops", "CRM click test", "script", "aire/command-center/tests/crm-click.mjs",
     "Click test over the CRM feed."),
    ("ops", "Command center contract", "doc", "aire/command-center/CONTRACT.md",
     "Who came in, who is due, what is out, what ran overnight."),
    ("ops", "Stack memory", "doc", "aire/STACK.md",
     "Which tool does which job. One system: Google Workspace is the only database."),
    ("ops", "Status log", "doc", "aire/STATUS.md",
     "Newest first. What was done, what needs Caleb."),
    ("ops", "Client data guard", "script", "tools/check-no-client-data.py",
     "Runs before every push. Names, phones, emails never reach GitHub."),
    ("ops", "Git hooks installer", "script", "tools/install-hooks.sh",
     "Makes the pre-push hook run the guard."),
    ("ops", "Local setup", "script", "scripts/setup-local.sh",
     "Sets up the repo on a new Mac."),
    ("ops", "Global CLAUDE.md", "doc", "global-claude-md/CLAUDE.md",
     "The rules every session reads."),
    ("ops", "Weekly AI brief", "schedule", "skills/ai-weekly-brief/SKILL.md",
     "Every Monday 7:47 am Central, fresh session, opens a draft PR."),
    ("ops", "Rollout plan Oct 2026", "doc", "aire/rollout-2026-10/PLAN.md",
     "Five arenas, four weeks, definition of done."),
    ("ops", "Brand audit 2026-10-29", "doc", "audits/2026-10-29",
     "Latest identity and visibility audit."),
    ("ops", "Morning brief", "skill", "skills: morning",
     "The morning read-out."),
    ("ops", "Earshot (ears)", "skill", "skills: earshot",
     "Measures and audits every sound before it ships. LUFS, true peak, sync."),

    # Agent Offer and Education
    ("offer", "AI for Agents (Skool)", "program", "programs/ai-for-agents/PLAN.md",
     "The community program: foundation, production, challenge, posts."),
    ("offer", "AI workshops", "program", "programs/ai-workshops/PROGRAM.md",
     "Live workshop program for agents."),
    ("offer", "Skool status", "doc", "SKOOL-AI-FOR-AGENTS/STATUS.md",
     "Where the Skool group stands."),
    ("offer", "Skool shot board", "page", "SKOOL-AI-FOR-AGENTS/shot-board.html",
     "Shot list for the group's video."),
    ("offer", "Offer tiers", "doc", "aire/offer/OFFER-2026-10.md",
     "Three tiers of what Caleb teaches or sells."),
    ("offer", "Chat skill bundles", "doc", "chat-skills",
     "Twelve skills zipped for the Claude app."),
]

# Which department each course group of Nick Saraev's skills serves.
COURSE_DEPT = {
    "cold-email-course": "leadgen",
    "claude-code-marketing": "marketing",
    "youtube-automation": "marketing",
    "claude-skills-course": "offer",
    "roadmap-25k": "offer",
    "agentic-workflows-course": "engine",
    "ai-agents-course": "engine",
    "claude-code-advanced": "engine",
    "claude-code-full-course": "engine",
    "codex-course": "engine",
    "vibe-coding-course": "engine",
    "mobile-apps-course": "engine",
}
OWN_SKILL_DEPT = {
    "agent-offer-builder": "offer",
    "ai-compliance-check": "ops",
    "ai-weekly-brief": "ops",
    "aire-stack": "ops",
    "brand-consistency": "marketing",
    "teardown-tuesday": "marketing",
    "teardown": "marketing",
}


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def read_front(path):
    try:
        t = open(path, encoding="utf-8", errors="ignore").read(4000)
    except OSError:
        return None, None
    m = re.search(r"^name:\s*(.+)$", t, re.M)
    d = re.search(r"^description:\s*(.+)$", t, re.M)
    return (m.group(1).strip() if m else None), (d.group(1).strip() if d else "")


def main():
    nodes = []
    seen = set()
    for dept, name, kind, path, about in CATALOG:
        nid = f"{dept}:{slug(name)}"
        if nid in seen:
            sys.exit(f"duplicate node {nid}")
        seen.add(nid)
        exists = os.path.exists(os.path.join(ROOT, path)) if "/" in path or "." in path else None
        nodes.append({"id": nid, "dept": dept, "name": name, "kind": kind,
                      "path": path, "about": about, "exists": exists})

    skills_dir = os.path.join(ROOT, "skills")
    for dirpath, _, files in os.walk(skills_dir):
        if "SKILL.md" not in files:
            continue
        p = os.path.join(dirpath, "SKILL.md")
        rel = os.path.relpath(p, ROOT)
        parts = rel.split(os.sep)
        name, desc = read_front(p)
        name = name or os.path.basename(dirpath)
        if parts[1] == "nick-saraev":
            dept = COURSE_DEPT.get(parts[2])
            group = parts[2]
        else:
            dept = OWN_SKILL_DEPT.get(parts[1])
            group = "own"
        if not dept:
            continue
        nid = f"{dept}:skill-{slug(name)}"
        if nid in seen:
            continue
        seen.add(nid)
        about = re.sub(r"\s+", " ", desc)
        if len(about) > 160:
            about = about[:157].rstrip() + "..."
        nodes.append({"id": nid, "dept": dept, "name": name, "kind": "skill",
                      "path": rel, "about": about, "exists": True, "group": group})

    nodes.sort(key=lambda n: (n["dept"], n["kind"], n["name"].lower()))
    counts = {}
    for n in nodes:
        counts[n["dept"]] = counts.get(n["dept"], 0) + 1
    data = {
        "built_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "owner": "Caleb Jackson, REALTOR, Keller Williams First Choice",
        "system": "AIRE",
        "departments": [dict(d, count=counts.get(d["id"], 0)) for d in DEPARTMENTS],
        "nodes": nodes,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
    missing = [n["path"] for n in nodes if n["exists"] is False]
    print(f"{len(nodes)} nodes, {len(DEPARTMENTS)} departments -> {os.path.relpath(OUT, ROOT)}")
    for d in data["departments"]:
        print(f"  {d['label']:<28} {d['count']:>4}")
    if missing:
        print("paths not found:", *missing, sep="\n  ")


if __name__ == "__main__":
    main()
