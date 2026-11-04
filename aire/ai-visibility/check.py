#!/usr/bin/env python3
"""AI visibility check: how AI answers talk about Caleb, built the way FirstAnswer does it.

The loop FirstAnswer sells (brand, monitored prompts in groups, competitors, responses per
model, cited sources, recommendations) rebuilt on the Claude API with web search, so the
engine is ours and the data stays in this repo.

For every prompt in prompts.json:
  1. ask Claude with the server-side web search tool, located in Baton Rouge, as a fresh
     session with no memory;
  2. keep the full answer, every URL the search returned and every URL the answer cited;
  3. score it: brand mentioned, brand cited (calebjackson.org), position of the first agent
     named, competitors named, sentiment of the brand mention (positive, neutral, negative,
     by a second short call);
  4. tally the cited domains across all prompts: those are the sources shaping AI answers in
     Caleb's markets, and the ones he is not on are the recommendations.

Outputs
  reports/ai-visibility-<date>.md    the report (git-ignored, read it and act)
  history.json                       one row per run with the headline numbers (git-ignored)
  summary.json                       the latest headline numbers for the dashboard (committed, numbers only)

Run on the Mac with ANTHROPIC_API_KEY set (the same key Pipeline uses):
  /usr/bin/python3 aire/ai-visibility/check.py --dry-run      # prints the prompts and the cost ceiling, sends nothing
  /usr/bin/python3 aire/ai-visibility/check.py                # one full run (about 12 prompts, a few web searches each)
  /usr/bin/python3 aire/ai-visibility/check.py --group branded
  /usr/bin/python3 aire/ai-visibility/check.py --test         # offline checks of the scoring

Coverage, said plainly: this measures Claude with web search. ChatGPT, Gemini, Perplexity,
Copilot and Google AI Mode are not queried here. Where they share the same web sources, the
cited-domain tally still points at the same work; where they differ, the manual protocol in
skills/brand-consistency/measurement-protocol.md still applies. Answers are non-deterministic:
one run is a snapshot, the trend is in history.json.
"""
import argparse
import json
import os
import re
import sys
import time
from collections import Counter
from datetime import datetime
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
PROMPTS = os.path.join(HERE, "prompts.json")
REPORTS = os.path.join(HERE, "reports")
HISTORY = os.path.join(HERE, "history.json")
SUMMARY = os.path.join(HERE, "summary.json")
CENTRAL = ZoneInfo("America/Chicago")
MODEL = "claude-opus-5-5"
MAX_SEARCHES_PER_PROMPT = 5
# Cost ceiling per run, for the dry run line: web search is billed per search plus tokens.
EST_PER_PROMPT_USD = 0.12

# Sources that answer real-estate questions and that an agent can be on. Used for recommendations.
PLATFORMS = {
    "zillow.com": "Claim and complete the Zillow agent profile (reviews, past sales, bio with the markets).",
    "realtor.com": "Claim the Realtor.com agent profile and get past-client reviews on it.",
    "homes.com": "Claim the Homes.com agent profile.",
    "redfin.com": "Redfin shows partner agents; little to do, note it.",
    "fastexpert.com": "FastExpert ranks agents by sales; claim the profile and keep sales current.",
    "realestate.usnews.com": "U.S. News agent finder pulls from HomeLight data; check the listing.",
    "yelp.com": "Create or claim the Yelp business page, ask three past clients for a review.",
    "expertise.com": "Expertise.com 'best of' lists are editorial; apply through their site.",
    "google.com": "Google Business Profile: reviews, posts, photos, the Q&A section.",
    "facebook.com": "Keep the business page current; AI pulls bios from it.",
    "linkedin.com": "Keep the LinkedIn headline consistent with the identity standard.",
    "reddit.com": "Answer local real estate questions on r/batonrouge as yourself.",
    "nextdoor.com": "Nextdoor business page for St. Francisville and Zachary.",
    "kw.com": "The KW agent page: make sure it names the markets and links the site.",
}


def load_prompts():
    return json.load(open(PROMPTS, encoding="utf-8"))


def domain(url):
    try:
        h = urlparse(url).netloc.lower()
    except Exception:
        return ""
    return h[4:] if h.startswith("www.") else h


# ---------------------------------------------------------------- scoring (pure, tested offline)

def score(answer_text, cited_urls, search_urls, cfg):
    """One prompt's numbers. answer_text is the full answer; cited_urls the URLs the answer cites;
    search_urls every URL the searches returned."""
    text_l = answer_text.lower()
    brand = cfg["brand"]
    mentioned = any(a.lower() in text_l for a in brand["aliases"])
    cited = any(domain(u) in brand["domains"] for u in cited_urls)
    surfaced = any(domain(u) in brand["domains"] for u in search_urls)
    comps = []
    for c in cfg["competitors"]:
        if c["name"].lower() in text_l or any(domain(u) in c["domains"] for u in cited_urls):
            comps.append(c["name"])
    # position: order of first appearance among brand and competitors in the answer text
    order = []
    for name in [brand["name"]] + [c["name"] for c in cfg["competitors"]]:
        i = text_l.find(name.lower())
        if i >= 0:
            order.append((i, name))
    order.sort()
    position = next((k + 1 for k, (_, n) in enumerate(order) if n == brand["name"]), None)
    return {"mentioned": mentioned, "cited": cited, "surfaced_in_search": surfaced, "competitors": comps,
            "position": position, "named_agents": [n for _, n in order]}


def aggregate(results, cfg):
    n = len(results) or 1
    unbranded = [r for r in results if r["group"] != "branded"]
    nu = len(unbranded) or 1
    cited_domains = Counter()
    for r in results:
        for u in r["cited_urls"]:
            d = domain(u)
            if d:
                cited_domains[d] += 1
    comp_counts = Counter(c for r in unbranded for c in r["score"]["competitors"])
    brand_domains = set(cfg["brand"]["domains"])
    recs = []
    for d, k in cited_domains.most_common():
        if d in brand_domains:
            continue
        for key, advice in PLATFORMS.items():
            if d == key or d.endswith("." + key):
                recs.append({"domain": d, "cited": k, "advice": advice})
                break
    return {
        "prompts": len(results),
        "branded_correct": sum(1 for r in results if r["group"] == "branded" and r["score"]["mentioned"]),
        "branded_total": sum(1 for r in results if r["group"] == "branded"),
        "unbranded_mention_rate": round(sum(1 for r in unbranded if r["score"]["mentioned"]) / nu, 3),
        "citation_rate": round(sum(1 for r in results if r["score"]["cited"]) / n, 3),
        "search_surface_rate": round(sum(1 for r in results if r["score"]["surfaced_in_search"]) / n, 3),
        "avg_position_when_mentioned": (round(sum(r["score"]["position"] for r in unbranded if r["score"]["position"]) / max(1, sum(1 for r in unbranded if r["score"]["position"])), 2) if any(r["score"]["position"] for r in unbranded) else None),
        "competitor_mentions": dict(comp_counts.most_common()),
        "cited_domains": dict(cited_domains.most_common(25)),
        "recommendations": recs[:10],
    }


# ---------------------------------------------------------------- the engine

def ask(client, prompt, cfg):
    """One fresh conversation with web search. Returns answer text, cited URLs, searched URLs, stop reason."""
    loc = cfg["location"]
    tools = [{"type": "web_search_20260209", "name": "web_search", "max_uses": MAX_SEARCHES_PER_PROMPT,
              "user_location": {"type": "approximate", "city": loc["city"], "region": loc["region"], "country": loc["country"], "timezone": loc["timezone"]}}]
    messages = [{"role": "user", "content": prompt}]
    text, cited, searched, stop = [], [], [], ""
    for _ in range(4):  # a long search turn can pause; send it back until it ends
        resp = client.beta.messages.create(
            model=MODEL, max_tokens=4000, tools=tools, messages=messages,
            output_config={"effort": "medium"},
            betas=["server-side-fallback-2026-07-01"], fallbacks="default",
        )
        stop = resp.stop_reason
        for block in resp.content:
            t = getattr(block, "type", "")
            if t == "text":
                text.append(block.text)
                for c in (getattr(block, "citations", None) or []):
                    u = getattr(c, "url", None)
                    if u:
                        cited.append(u)
            elif t == "web_search_tool_result":
                content = getattr(block, "content", None)
                if isinstance(content, list):
                    for r in content:
                        u = getattr(r, "url", None)
                        if u:
                            searched.append(u)
        if stop == "pause_turn":
            messages = messages + [{"role": "assistant", "content": resp.content}]
            continue
        break
    if stop == "refusal":
        text = ["(declined by the model's safety classifier)"]
    return "\n".join(text).strip(), list(dict.fromkeys(cited)), list(dict.fromkeys(searched)), stop


def sentiment(client, answer, cfg):
    """Only when the brand is mentioned: one short classification call."""
    q = (f"In the following AI answer, is the mention of {cfg['brand']['name']} positive, neutral or negative? "
         "Reply with exactly one word: positive, neutral or negative.\n\n" + answer[:6000])
    resp = client.messages.create(model=MODEL, max_tokens=5, messages=[{"role": "user", "content": q}], output_config={"effort": "low"})
    word = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text").strip().lower()
    return word if word in ("positive", "neutral", "negative") else "unclear"


def run(groups, dry_run):
    cfg = load_prompts()
    items = [(g, p) for g, ps in cfg["groups"].items() if not groups or g in groups for p in ps]
    print(f"{len(items)} prompts, model {MODEL}, up to {MAX_SEARCHES_PER_PROMPT} searches each, cost ceiling about ${len(items) * EST_PER_PROMPT_USD:.2f}")
    if dry_run:
        for g, p in items:
            print(f"  [{g}] {p}")
        print("dry run: nothing sent. Drop --dry-run to run it.")
        return 0
    if not os.getenv("ANTHROPIC_API_KEY"):
        sys.exit("ANTHROPIC_API_KEY is not set (Pipeline's key works). Nothing sent.")
    from anthropic import Anthropic
    client = Anthropic()
    results = []
    for g, p in items:
        t0 = time.time()
        answer, cited, searched, stop = ask(client, p, cfg)
        sc = score(answer, cited, searched, cfg)
        sent = sentiment(client, answer, cfg) if sc["mentioned"] and stop != "refusal" else None
        results.append({"group": g, "prompt": p, "answer": answer, "cited_urls": cited, "search_urls": searched, "stop": stop, "score": sc, "sentiment": sent, "seconds": round(time.time() - t0, 1)})
        print(f"  [{g}] {'MENTIONED' if sc['mentioned'] else 'absent  '} {'cited' if sc['cited'] else '     '} {len(cited)} cited {len(searched)} searched  {p[:60]}")
    agg = aggregate(results, cfg)
    write_outputs(results, agg, cfg)
    return 0


def write_outputs(results, agg, cfg):
    now = datetime.now(CENTRAL)
    day = now.date().isoformat()
    os.makedirs(REPORTS, exist_ok=True)
    L = [f"# AI visibility, {day}", "", f"Engine: {MODEL} with web search, located in {cfg['location']['city']}, fresh session per prompt. One run is a snapshot.", "",
         "## Headline",
         f"- Branded prompts identified correctly: {agg['branded_correct']} of {agg['branded_total']}",
         f"- Unbranded mention rate: {agg['unbranded_mention_rate']:.0%}",
         f"- calebjackson.org cited: {agg['citation_rate']:.0%} of prompts; surfaced in the search results behind {agg['search_surface_rate']:.0%}",
         f"- Average position when mentioned: {agg['avg_position_when_mentioned'] or 'n/a'}",
         f"- Competitors mentioned (unbranded prompts): {', '.join(f'{k} {v}' for k, v in agg['competitor_mentions'].items()) or 'none'}", "",
         "## Sources shaping the answers (cited domains)"]
    L += [f"- {d}: {k}" for d, k in agg["cited_domains"].items()] or ["- none cited"]
    L += ["", "## Recommendations (platforms the answers cite that Caleb can be on)"]
    L += [f"- {r['domain']} (cited {r['cited']}x): {r['advice']}" for r in agg["recommendations"]] or ["- none from this run"]
    L += ["", "## Every prompt"]
    for r in results:
        s = r["score"]
        L += [f"### [{r['group']}] {r['prompt']}", f"- mentioned: {s['mentioned']} · cited: {s['cited']} · position: {s['position']} · sentiment: {r['sentiment']} · agents named: {', '.join(s['named_agents']) or 'none'} · stop: {r['stop']} · {r['seconds']}s",
              "- cited: " + (", ".join(r["cited_urls"]) or "none"), "", "> " + r["answer"].replace("\n", "\n> ")[:3000], ""]
    with open(os.path.join(REPORTS, f"ai-visibility-{day}.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    row = {"date": day, "at": now.isoformat(timespec="seconds"), "model": MODEL, "prompts": agg["prompts"], "branded_correct": agg["branded_correct"], "branded_total": agg["branded_total"],
           "unbranded_mention_rate": agg["unbranded_mention_rate"], "citation_rate": agg["citation_rate"], "search_surface_rate": agg["search_surface_rate"], "avg_position": agg["avg_position_when_mentioned"],
           "competitor_mentions": agg["competitor_mentions"], "top_cited": list(agg["cited_domains"].items())[:8]}
    hist = []
    if os.path.exists(HISTORY):
        try:
            hist = json.load(open(HISTORY, encoding="utf-8"))
        except Exception:
            hist = []
    hist = [h for h in hist if h.get("date") != day] + [row]
    json.dump(hist, open(HISTORY, "w", encoding="utf-8"), indent=1)
    json.dump({"latest": row, "recommendations": agg["recommendations"], "source": f"aire/ai-visibility/check.py, {MODEL} with web search", "runs": len(hist)}, open(SUMMARY, "w", encoding="utf-8"), indent=1)
    print(f"report: {os.path.relpath(os.path.join(REPORTS, f'ai-visibility-{day}.md'))}  summary.json updated ({len(hist)} runs)")


# ---------------------------------------------------------------- offline checks

def test():
    cfg = load_prompts()
    ok = True
    def check(cond, what):
        nonlocal ok
        print(("ok   " if cond else "FAIL ") + what)
        ok = ok and cond
    a = "For St. Francisville I'd talk to Burns & Co. first, then Caleb Jackson at Keller Williams First Choice (calebjackson.org)."
    s = score(a, ["https://www.calebjackson.org/about", "https://burnsandco.com/agents"], ["https://zillow.com/x", "https://www.calebjackson.org/"], cfg)
    check(s["mentioned"] and s["cited"] and s["surfaced_in_search"], "brand mention, citation and search surface detected")
    check(s["position"] == 2 and s["named_agents"][0] == "Burns & Co.", "position counts agents in order of appearance")
    check("Burns & Co." in s["competitors"], "competitor named")
    b = "Zillow lists several agents in Baton Rouge; U.S. News has a ranked list too."
    s2 = score(b, ["https://www.zillow.com/baton-rouge-la/real-estate-agents/"], [], cfg)
    check(not s2["mentioned"] and not s2["cited"] and s2["position"] is None, "absence scored as absence, never guessed")
    agg = aggregate([
        {"group": "seller", "prompt": "p1", "cited_urls": ["https://www.zillow.com/a", "https://burnsandco.com/b"], "search_urls": [], "score": s, "sentiment": "positive"},
        {"group": "buyer", "prompt": "p2", "cited_urls": ["https://www.zillow.com/c"], "search_urls": [], "score": s2, "sentiment": None},
        {"group": "branded", "prompt": "p3", "cited_urls": ["https://calebjackson.org/"], "search_urls": [], "score": score("Caleb Jackson is a REALTOR with Keller Williams First Choice.", ["https://calebjackson.org/"], [], cfg), "sentiment": "neutral"},
    ], cfg)
    check(agg["unbranded_mention_rate"] == 0.5 and agg["branded_correct"] == 1, "rates computed over the right denominators")
    check(agg["cited_domains"].get("zillow.com") == 2 and agg["recommendations"][0]["domain"] == "zillow.com", "cited domains tallied, Zillow becomes the first recommendation")
    check(domain("https://www.calebjackson.org/x") == "calebjackson.org", "domain strips www")
    print("all checks passed" if ok else "FAILED")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--group", action="append", help="only these groups (seller, buyer, local_knowledge, branded)")
    ap.add_argument("--test", action="store_true")
    a = ap.parse_args()
    if a.test:
        sys.exit(test())
    sys.exit(run(a.group, a.dry_run))


if __name__ == "__main__":
    main()
