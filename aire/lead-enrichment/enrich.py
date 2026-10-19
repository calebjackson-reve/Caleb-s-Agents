#!/usr/bin/env python3
"""Lead enrichment on the bulk tier. See directive.md. DRY_RUN=1 by default."""
import csv, json, os, sys, time
from datetime import datetime, timezone

MODEL = os.environ.get("AIRE_BULK_MODEL", "claude-haiku-5-5")  # aire/STACK.md, bulk tier
DRY_RUN = os.environ.get("DRY_RUN", "1") != "0"
MARKETS = ["St. Francisville", "Baton Rouge", "Zachary", "New Roads", "Felicianas", "Prairieville", "other"]
SCHEMA = {
    "type": "object",
    "properties": {
        "intent": {"type": "string", "enum": ["buyer", "seller", "both", "renter", "agent", "vendor", "unknown"]},
        "timeline": {"type": "string", "enum": ["now", "1-3 months", "3-12 months", "someday", "unknown"]},
        "area": {"type": "string", "enum": MARKETS},
        "next_touch": {"type": "string"},
    },
    "required": ["intent", "timeline", "area", "next_touch"],
    "additionalProperties": False,
}
SYSTEM = (
    "You tag real estate leads for Caleb Jackson, REALTOR with Keller Williams First Choice in Louisiana. "
    "Use only what the row says. Never invent facts. If the text is empty or unclear, use 'unknown' and make "
    "next_touch a single friendly question. next_touch is one plain sentence under 25 words in Caleb's voice: warm, "
    "direct, no price or timing promises, no words about who should live somewhere, no em dashes."
)
# Haiku 5.5 list price, Oct 2026, prompts up to 100K tokens. From the claude-api skill model table.
PRICE_IN, PRICE_OUT = 0.10 / 1e6, 0.50 / 1e6


def main(path):
    import anthropic  # pip install anthropic
    client = anthropic.Anthropic()
    rows = list(csv.DictReader(open(path, newline="", encoding="utf-8")))
    if not rows:
        sys.exit("no rows")
    limit = 3 if DRY_RUN else len(rows)
    out_fields = list(rows[0].keys()) + ["intent", "timeline", "area", "next_touch", "model", "enriched_at"]
    tok_in = tok_out = 0
    results = []
    for i, row in enumerate(rows[:limit]):
        payload = {k: v for k, v in row.items() if v}
        try:
            resp = client.messages.create(
                model=MODEL,
                max_tokens=256,
                system=SYSTEM,
                messages=[{"role": "user", "content": "Lead row as JSON:\n" + json.dumps(payload)}],
                output_config={"format": {"type": "json_schema", "schema": SCHEMA}},
            )
            if resp.stop_reason == "refusal":
                raise RuntimeError("refused")
            text = next(b.text for b in resp.content if b.type == "text")
            data = json.loads(text)
            tok_in += resp.usage.input_tokens
            tok_out += resp.usage.output_tokens
        except Exception as e:  # keep going, mark the row
            data = {"intent": "error", "timeline": "unknown", "area": "other", "next_touch": str(e)[:200]}
        row.update(data)
        row["model"] = MODEL
        row["enriched_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        results.append(row)
        if DRY_RUN:
            print(json.dumps({k: row[k] for k in ["intent", "timeline", "area", "next_touch"]}, indent=1))
        time.sleep(0.2)
    cost = tok_in * PRICE_IN + tok_out * PRICE_OUT
    print(f"{len(results)} rows, {tok_in} in / {tok_out} out tokens, about ${cost:.4f} on {MODEL}")
    if DRY_RUN:
        print("DRY_RUN=1, nothing written. Set DRY_RUN=0 to write leads.enriched.csv")
        return
    out = os.path.splitext(path)[0] + ".enriched.csv"
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=out_fields)
        w.writeheader()
        w.writerows(results)
    print("wrote", out)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python3 enrich.py leads.csv")
    main(sys.argv[1])
