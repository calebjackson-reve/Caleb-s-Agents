import sys, json
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parents[1]))
import skool_cut as sc
spec = json.load(open(__import__("pathlib").Path(__file__).resolve().parents[1] / "specs" / "skool-house-style.json"))
def W(text, t=0.0, gaps=()):
    out = []
    for i, w in enumerate(text.split()):
        t += 0.8 if i in gaps else 0.05
        out.append({"w": w, "s": t, "e": t + 0.3}); t += 0.3
    return out
cases = [
 ("Your text messages matter. Your next deal is in your eye messages. Fuck that, Caleb. Your next deal is in your iMessages.", "Your text messages matter. Your next deal is in your iMessages."),
 ("Your text messages matter. Your next deal is in your eye F*** that, Kaleb. Your next deal is in your iMessages.", "Your text messages matter. Your next deal is in your iMessages."),
 ("Fuck that Caleb. Hey I'm Caleb Jackson.", "Hey I'm Caleb Jackson."),
 ("Hey I'm Caleb Jackson. I sell homes in Lubbock.", "Hey I'm Caleb Jackson. I sell homes in Lubbock."),
]
ok = True
for src, want in cases:
    got = " ".join(w["w"] for w in sc.cut_mistakes(W(src), spec))
    print("PASS" if got == want else "FAIL", "|", got); ok &= got == want
# pause-based boundary, no punctuation
src = W("so this is the CMA record fuck that caleb so this is the CRM record", gaps=(6, 9))
got = " ".join(w["w"] for w in sc.cut_mistakes(src, spec)); want = "so this is the CRM record"
print("PASS" if got == want else "FAIL", "|", got); ok &= got == want
# real take 2026-10-15: redo picks up mid-sentence, whisper hears "Buck"
src = W("AI drafts you approve, no client money details go in, fair housing on everything. Buck that Caleb. So fair housing on everything.")
got = " ".join(w["w"] for w in sc.cut_mistakes(src, spec)); want = "AI drafts you approve, no client money details go in, So fair housing on everything."
print("PASS" if got == want else "FAIL", "|", got); ok &= got == want
# real take IMG_6301: the redo rewords the start but repeats "even more beneficial"
src = W("this course is for you, but also if you're familiar with AI, this is going to be even more beneficial, and you'll even figure it out, fuck that Caleb. This will be even more beneficial for you.")
got = " ".join(w["w"] for w in sc.cut_mistakes(src, spec)); want = "this course is for you, but also if you're familiar with AI, This will be even more beneficial for you."
print("PASS" if got == want else "FAIL", "|", got); sys.exit(0 if (ok and got == want) else 1)
