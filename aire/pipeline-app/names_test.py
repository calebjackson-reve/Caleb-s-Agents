"""One shared name helper: "?Smith household" reads "Smith". Made-up names only; temp paths; never touches ~/.aire/.
Run: python3 aire/pipeline-app/names_test.py"""
import json
import os
import re
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
tmp = Path(tempfile.mkdtemp())
os.environ["AIRE_FIRST_NAMES"] = str(tmp / "none.json")  # missing file = no change
import names  # noqa: E402
import app  # noqa: E402

bad = []


def check(cond, name):
    print(("ok   " if cond else "FAIL ") + name)
    if not cond:
        bad.append(name)


BAD = re.compile(r"household|^[?�]", re.I)
N = names.clean_name
check(N("?Smith household") == "Smith", "?Smith household reads Smith")
check(N("�Smith Household") == "Smith" and N("? Smith HOUSEHOLD") == "Smith", "U+FFFD, spaces and any case are stripped")
check(N("Ann Smith") == "Ann Smith" and N("Ann Smith household") == "Ann Smith", "Ann Smith is unchanged")
check(N("household") == "" and N("") == "", "a bare household is no name")

f = tmp / "first-names.json"
f.write_text(json.dumps({"p1": "Ann"}))
os.environ["AIRE_FIRST_NAMES"] = str(f)
check(N("?Smith household", "p1") == "Ann Smith", "first-names.json gives Ann Smith")
check(N("?Smith household", "p2") == "Smith" and N("Bob Smith", "p1") == "Bob Smith", "no entry or a full name: no change")
f.write_text("not json")
check(N("?Smith household", "p1") == "Smith", "a broken file is ignored")
os.environ["AIRE_FIRST_NAMES"] = str(tmp / "none.json")

tree = {"people": [{"person_id": "p1", "display": "?Smith household", "household": ["?Jones household", "Ann Lee"]}],
        "options": [{"id": "p9", "display": "�Wood household"}], "type": "household"}
out = names.clean_tree(tree)
check(out["people"][0]["display"] == "Smith" and out["people"][0]["household"] == ["Jones", "Ann Lee"]
      and out["options"][0]["display"] == "Wood", "clean_tree cleans display and household values")
check(out["type"] == "household", "the internal type field is left alone")
f.write_text(json.dumps({"p1": "Ann"}))
os.environ["AIRE_FIRST_NAMES"] = str(f)
check(names.clean_tree(tree)["people"][0]["display"] == "Ann Smith", "clean_tree applies the first-names override by person_id")
os.environ["AIRE_FIRST_NAMES"] = str(tmp / "none.json")

# the server: a feed whose people are household-named
feed = json.loads((HERE / "fixtures" / "demo-feed.json").read_text())
for i, p in enumerate(feed["people"][:6]):
    p["display"] = "?Smith%d household" % i
    p["type"] = "household"
feed["touches_due"][0]["display"] = "?Smith0 household"
feed["map"]["pins"][0]["display"] = "�Smith0 household"
st = app.State(demo=True, send_log=tmp / "log.json")
st._demo_cache = {}
fp = tmp / "feed.json"
fp.write_text(json.dumps(feed, ensure_ascii=False))
st.demo = False
st.paths = {**st.paths, "feed": fp}
live = st.feed()
check(live["people"][0]["display"] == "Smith0" and live["touches_due"][0]["display"] == "Smith0"
      and live["map"]["pins"][0]["display"] == "Smith0", "State.feed() cleans people, touches and map pins")
check(live["people"][0]["type"] == "household", "type stays household in the feed")
st.demo = True
st._demo_cache = live
snap = st.snapshot()
blob = json.dumps(snap, ensure_ascii=False)
labels = re.findall(r'"(?:display|name|contact)": "([^"]*)"', blob)
check("Smith0" in labels, "the state payload carries the cleaned name")
check(not [m for m in labels if BAD.search(m)], "no display/name/contact in the state payload says household or starts with ?")

people = st.sale_people()
check(people and not [v for v in people.values() if BAD.search(v)], "sale people (Who was this sale?, Pick another) are clean")
hits = st.sale_people_search("smith")["people"]
check(hits and not [h for h in hits if BAD.search(h["display"])], "people search results are clean")

# every rendered screen's payload goes out through _json, which cleans too
check("names.clean_tree(data)" in (HERE / "app.py").read_text(), "every JSON answer goes through the name helper")
check("names.clean_name(h)" in (HERE / "insight.py").read_text(), "the card's Household fact values go through the helper")
crm = (HERE / "static" / "crm-pages.js").read_text()
m3 = (HERE / "static" / "map3d.html").read_text()
check("C.name = v => C.clean(v)" in crm and "' household'" not in m3, "client name helpers drop household and a leading ?")

print("%d failure(s)" % len(bad))
sys.exit(1 if bad else 0)
