#!/usr/bin/env python3
"""Check a lesson script or a video transcript before it is filmed or posted.

  python3 SKOOL-AI-FOR-AGENTS/lesson_check.py path/to/script.md
  python3 SKOOL-AI-FOR-AGENTS/lesson_check.py transcript.txt --spoken    # a transcript of a finished video

Prints PASS or FLAG for each check and the lines to look at. It reads words only. It cannot tell
whether a fact is true or whether the lesson is any good. Caleb still approves.
"""
import re, sys
from pathlib import Path

HYPE = ["game changer", "game-changer", "revolutionize", "unlock", "supercharge", "leverage", "seamless", "cutting-edge",
        "delve", "in today's fast-paced", "harness the power", "elevate your", "take it to the next level"]
JARGON = ["api", "mcp", "llm", "token", "repo", "terminal", "webhook", "prompt", "vibe coding", "agent profile", "stack file", "workflow"]
PLAIN = ["is just", "is like", "think of", "think about", "that's just", "means", "kind of like", "in plain english", "we call", "what people call"]


def main():
    path = Path(sys.argv[1])
    spoken = "--spoken" in sys.argv
    raw = path.read_text()
    text = re.sub(r"\s+", " ", re.sub(r"[#*_`>|\[\]]", " ", raw))
    words = re.findall(r"[A-Za-z0-9$'’.]+", text)
    low = text.lower()
    flags = 0

    def report(label, problems):
        nonlocal flags
        if problems:
            flags += 1
            print(f"FLAG  {label}")
            for p in problems[:6]:
                print(f"        {p}")
        else:
            print(f"PASS  {label}")

    # 1. the same passage said twice (an edit or paste mistake)
    n, seen, dup = 12, {}, []
    lw = [w.lower().strip(".,") for w in words]
    i = 0
    while i + n <= len(lw):
        key = " ".join(lw[i:i + n])
        if key in seen and i - seen[key] > n:
            j = i
            while j + 1 < len(lw) and seen[key] + (j - i) + 1 < i and lw[j + 1] == lw[seen[key] + (j - i) + 1 + 0]:
                j += 1
            run = j - i + n
            dup.append(f"about {run} words repeat, starting: \"{' '.join(words[i:i + 10])}...\"")
            i = j + n
            continue
        seen.setdefault(key, i)
        i += 1
    report("no passage repeated", dup)

    # 2. punctuation Caleb does not use (written scripts only)
    if not spoken:
        report("no em dashes or semicolons", [f"line {k + 1}: {l.strip()[:80]}" for k, l in enumerate(raw.splitlines())
                                              if ("—" in l or ";" in l) and not l.strip().startswith("|")])

    # 3. stock AI phrasing
    report("no hype or stock AI phrasing", [f"\"{h}\"" for h in HYPE if h in low])

    # 4. every price carries the date it was checked
    undated = []
    for m in re.finditer(r"\$\s?\d[\d,.]*", text):
        near = low[max(0, m.start() - 220):m.end() + 220]
        if not re.search(r"when i checked|as of|checked on|20\d\d", near):
            undated.append(f"{m.group(0)} near \"{text[max(0, m.start() - 40):m.end() + 20].strip()}\"")
    report("every price has a checked-on date", undated)

    # 5. a tech word is explained in plain words the first time it shows up
    unexplained = []
    for j in JARGON:
        k = low.find(j)
        if k >= 0 and not any(p in low[max(0, k - 160):k + 220] for p in PLAIN):
            unexplained.append(f"\"{j}\" first shows up with no plain explanation nearby")
    report("tech words explained in plain words", unexplained)

    # 6. the lesson ends with one action and sends people to Skool
    tail = low[-1500:]
    report("ends with one action and a Skool step", [] if (re.search(r"one action|before moving on|here's what i want you to do|your turn", tail)
           and re.search(r"skool|school wins", tail)) else ["no clear single action plus Skool step in the last part"])

    # 7. the human-in-control line is in there
    report("says the agent stays in control", [] if re.search(r"you read|you (review|approve)|presses every send|without my approval|"
           r"i'm still the one|first draft|not legal advice|your broker", low) else ["no line saying the agent reviews and sends"])

    # 8. nothing that looks like client data
    report("no phone numbers or emails", [m.group(0) for m in re.finditer(r"\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b|[\w.]+@[\w.]+\.\w+", text)])

    mins = len(words) / 150
    print(f"\n{len(words)} words, about {mins:.1f} minutes spoken at 150 words a minute. {flags} flagged.")
    sys.exit(1 if flags else 0)


if __name__ == "__main__":
    main()
