#!/usr/bin/env python3
"""Cheap-model judgment pass. One job: for the people whose messages show intent, ask Haiku for
intent, timeline, area and one next-touch sentence. Reuses the schema and guard from aire/lead-enrichment/enrich.py.
Runs only on rows the scorer marked hot-lead, warm-lead, active-client or hidden_lead, capped by --limit.
Cost is printed from the API's own token counts. DRY_RUN=1 prints the first three and writes nothing."""
from __future__ import annotations
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "lead-enrichment"))
import enrich  # noqa: E402  (SYSTEM, SCHEMA, MODEL, validate, parse_json, PRICE_IN, PRICE_OUT)

ELIGIBLE = {"hot", "warm"}


def tag(rows: list[dict], snippets: dict[str, list[str]], limit: int, dry_run: bool) -> tuple[list[dict], float]:
    import anthropic
    client = anthropic.Anthropic()
    todo = [r for r in rows if (r["aire_label"] in ELIGIBLE or r["hidden_lead"]) and snippets.get(r["person_id"])]
    todo = sorted(todo, key=lambda r: -r["signal_score"])[: (3 if dry_run else limit)]
    tin = tout = 0
    for r in todo:
        payload = {"name": r["display"], "band": r["band_before"], "stage": r["stage_before"],
                   "recent_messages_from_them": snippets[r["person_id"]][-8:]}
        try:
            resp = client.messages.create(model=enrich.MODEL, max_tokens=1024, thinking={"type": "disabled"}, system=enrich.SYSTEM,
                                          messages=[{"role": "user", "content": "Lead row as JSON:\n" + json.dumps(payload)}],
                                          output_config={"format": {"type": "json_schema", "schema": enrich.SCHEMA}})
            text = next((b.text for b in resp.content if b.type == "text"), "")
            data = enrich.validate(enrich.parse_json(text))
            tin += resp.usage.input_tokens
            tout += resp.usage.output_tokens
        except Exception as e:
            data = {"intent": "error", "timeline": "unknown", "area": "other", "next_touch": str(e)[:160]}
        r.update(data)
        r["enriched_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        if dry_run:
            print(json.dumps({"who": r["display"], **{k: r[k] for k in ("intent", "timeline", "area", "next_touch")}}))
        time.sleep(0.2)
    return todo, tin * enrich.PRICE_IN + tout * enrich.PRICE_OUT
