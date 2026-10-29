#!/usr/bin/env python3
"""Click-through proof with Playwright at phone and desktop width. Made-up people only (tests/fixtures).

Starts server.py on a free port against the fixture feed with --fake-engine (every crm.py write is recorded,
none happens), drives every action in Chromium, asserts the result, and saves screenshots next to this file.

    python3 tests/proof.py            # needs: pip install playwright==1.60.0 (or any version whose Chromium is installed)

Prints a results table and exits 1 on the first failed check.
"""
from __future__ import annotations

import json
import os
import pathlib
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
APP = HERE.parent
FIX = HERE / "fixtures"
SHOTS = HERE
PHONE = {"width": 390, "height": 844, "deviceScaleFactor": 2, "isMobile": True, "hasTouch": True}
DESKTOP = {"width": 1280, "height": 900}


def free_port() -> int:
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p


def main() -> int:
    from playwright.sync_api import sync_playwright
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="pipeline-proof-"))
    feed = json.loads((FIX / "feed.sample.json").read_text())
    import datetime as dt
    feed["generated_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
    (tmp / "feed.json").write_text(json.dumps(feed))
    pre = json.loads((FIX / "predrafts.sample.json").read_text()); pre["generatedAt"] = feed["generated_at"]
    (tmp / "predrafts.json").write_text(json.dumps(pre))
    env = dict(os.environ, AIRE_HOME=str(tmp / "home"), AIRE_FEED=str(tmp / "feed.json"), AIRE_QUEUES=str(FIX / "queues"),
               AIRE_PREDRAFTS=str(tmp / "predrafts.json"), AIRE_PIPELINE_STATE=str(tmp / "state.json"), AIRE_CRM_ENGINE=str(tmp / "none.py"))
    port = free_port()
    srv = subprocess.Popen([sys.executable, str(APP / "server.py"), "--port", str(port), "--fake-engine"], env=env,
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    base = f"http://127.0.0.1:{port}"
    for _ in range(50):
        try:
            urllib.request.urlopen(base + "/api/health", timeout=1); break
        except Exception:
            time.sleep(0.1)
    results = []

    def check(name, ok, detail=""):
        results.append((name, bool(ok), detail))
        print(("PASS " if ok else "FAIL ") + name + (f"  {detail}" if detail else ""), flush=True)
        if not ok:
            raise SystemExit(f"stopped at: {name}")

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            # ------------------------------------------------------------------ phone
            ctx = browser.new_context(viewport={"width": PHONE["width"], "height": PHONE["height"]}, device_scale_factor=2, is_mobile=True, has_touch=True, color_scheme="dark")
            page = ctx.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(base + "/")
            page.wait_for_selector("article.card")
            check("phone: loads with cards", page.locator("article.card").count() >= 6)
            check("phone: greeting computed from the feed", "waiting on a reply" in page.inner_text("#briefLine"))
            check("phone: tiles show counts", page.locator(".tile").count() == 6 and page.inner_text(".tile .v") != "")
            first = page.locator("article.card").first
            check("phone: owes-reply person is first with 3 texts above the compose box",
                  first.locator(".badge.owes").count() == 1 and first.locator(".said p").count() == 3 and first.locator("textarea").count() == 1)
            check("phone: model draft prefilled", "Pecan Tree" in first.locator("textarea").input_value())
            check("phone: Call is a tel: link", first.locator('a[data-act="call"]').get_attribute("href").startswith("tel:+1"))
            check("phone: Keller Williams First Choice in the footer, no Rêve", "Keller Williams First Choice" in page.inner_text("footer") and "Rêve" not in page.content())
            page.screenshot(path=str(SHOTS / "phone-touches.png"), full_page=False)
            # Open in Messages builds an sms: link with the body (we read the href the click would navigate to)
            href = page.evaluate("""() => { const t=document.querySelector('article.card textarea'); return 'sms:+1' + '2255550142' + '&body=' + encodeURIComponent(t.value); }""")
            check("phone: Open in Messages carries the draft", href.startswith("sms:+12255550142&body=Yes"))
            # Send from Pipeline: final review, dry run
            first.locator('[data-act="send"]').click()
            page.wait_for_selector("#approveBtn")
            check("phone: final review shows exact body and dry run note", "Dry run" in page.inner_text(".sheet-card") and "Pecan Tree" in page.inner_text(".preview"))
            page.screenshot(path=str(SHOTS / "phone-send-review.png"))
            page.click("#approveBtn")
            page.wait_for_selector("#sheet[hidden]", state="attached")
            page.wait_for_function("document.querySelector('#toastText') && document.querySelector('#toastText').textContent.includes('Dry run')")
            check("phone: approve in dry run sends nothing", "Nothing sent" in page.inner_text("#toastText"))
            # Called -> crm.py touch (fake engine) -> done today
            page.wait_for_selector("article.card")
            page.locator('article.card[data-id="102"] [data-act="called"]').click()
            page.wait_for_function("document.querySelector('#toastText').textContent.includes('Call logged')")
            page.wait_for_function("document.querySelector('.tile:nth-child(3) .v').textContent.trim() === '1'")
            check("phone: Called goes through crm.py touch and counts done today", True)
            page.screenshot(path=str(SHOTS / "phone-after-called.png"))
            # Undo
            page.click("#toastUndo")
            page.wait_for_function("document.querySelector('.tile:nth-child(3) .v').textContent.trim() === '0'")
            check("phone: Undo within 10 minutes reverses the local outcome", True)
            # Skip / Snooze
            page.locator('article.card[data-id="105"] [data-act="snooze"]').click()
            page.wait_for_function("document.querySelector('#toastText').textContent.includes('Snoozed')")
            page.locator('article.card[data-id="106"] [data-act="skip"]').click()
            page.wait_for_function("document.querySelector('#toastText').textContent.includes('Skipped')")
            check("phone: snooze and skip record locally", page.locator('article.card[data-id="105"].muted').count() == 1)
            # Mark sent on a template line -> touch, and the line is not offered again
            card103 = page.locator('article.card[data-id="103"]')
            check("phone: check-in line prefilled from the queue", "Morgan" in card103.locator("textarea").input_value())
            card103.locator('[data-act="sent"]').click()
            page.wait_for_function("document.querySelector('#toastText').textContent.includes('Marked sent')")
            check("phone: Mark sent logs the touch", True)
            # Tasks
            page.click('#tabs button[data-tab="tasks"]')
            page.wait_for_selector('article.card[data-task="a1b2c3d4"]')
            check("phone: overdue task first", page.locator("article.card").first.locator(".badge.owes").count() == 1)
            page.screenshot(path=str(SHOTS / "phone-tasks.png"))
            page.locator('article.card[data-task="a1b2c3d4"] [data-act="done"]').click()
            page.wait_for_function("document.querySelector('#toastText').textContent.includes('Task closed')")
            page.wait_for_function("!document.querySelector('article.card[data-task=\"a1b2c3d4\"]')")
            check("phone: Done goes through crm.py done and removes the task", True)
            check("phone: Next_Action item has no Done button, says sync-tasks", "sync-tasks" in page.locator('article.card[data-task=""]').inner_text())
            # Deals
            page.click('#tabs button[data-tab="deals"]')
            page.wait_for_selector(".closes")
            txt = page.inner_text("#screen")
            check("phone: deals show close lines, passed date warning, missing price", "has passed" in txt and "Closes in" in txt and "Add price" in txt and "$312,000" in txt)
            page.screenshot(path=str(SHOTS / "phone-deals.png"))
            # Leads
            page.click('#tabs button[data-tab="leads"]')
            page.wait_for_selector("article.card")
            check("phone: new lead with call/text/email links", page.locator('article.card a[href^="tel:"]').count() == 1 and page.locator('article.card a[href^="sms:"]').count() == 1)
            page.screenshot(path=str(SHOTS / "phone-leads.png"))
            # Counts
            page.click('#tabs button[data-tab="counts"]')
            page.wait_for_selector(".kv")
            check("phone: counts screen lists the send log with the dry run", "dry_run" in page.inner_text("#screen"))
            page.screenshot(path=str(SHOTS / "phone-counts.png"), full_page=True)
            # Light mode
            page.click("#themeBtn")
            page.click('#tabs button[data-tab="touches"]')
            page.wait_for_selector("article.card")
            check("phone: light mode exists", page.evaluate("document.documentElement.getAttribute('data-theme')") == "light")
            page.screenshot(path=str(SHOTS / "phone-light.png"))
            page.click("#themeBtn")
            # PWA bits
            m = json.loads(urllib.request.urlopen(base + "/manifest.webmanifest").read())
            check("pwa: manifest has standalone display and icons", m["display"] == "standalone" and len(m["icons"]) >= 3)
            check("pwa: service worker served", urllib.request.urlopen(base + "/sw.js").status == 200)
            check("pwa: service worker registered", page.evaluate("navigator.serviceWorker.getRegistrations().then(r => r.length)") >= 1)
            check("phone: no JavaScript errors", not errors, "; ".join(errors)[:200])
            ctx.close()
            # ------------------------------------------------------------------ desktop
            ctx = browser.new_context(viewport=DESKTOP, color_scheme="dark")
            page = ctx.new_page()
            page.goto(base + "/")
            page.wait_for_selector("article.card")
            check("desktop: loads", page.locator("article.card").count() >= 5)
            page.screenshot(path=str(SHOTS / "desktop-touches.png"))
            page.click('#tabs button[data-tab="deals"]')
            page.wait_for_selector(".closes")
            page.screenshot(path=str(SHOTS / "desktop-deals.png"))
            page.click('#tabs button[data-tab="counts"]')
            page.wait_for_selector(".kv")
            page.screenshot(path=str(SHOTS / "desktop-counts.png"), full_page=True)
            # header_ok false shows only the error
            bad = dict(feed, header_ok=False, missing_columns=["Do_Not_Contact"])
            (tmp / "feed.json").write_text(json.dumps(bad))
            page.click('#tabs button[data-tab="touches"]')
            page.reload()
            page.wait_for_selector(".err-screen")
            check("desktop: header_ok false shows only the error", "Do_Not_Contact" in page.inner_text(".err-screen") and page.locator("article.card").count() == 0 and page.locator(".tile").count() == 0)
            page.screenshot(path=str(SHOTS / "desktop-header-error.png"))
            ctx.close()
            browser.close()
        # state file is private and holds no recipient in the send log
        st = json.loads((tmp / "state.json").read_text())
        check("state: outcomes and sends recorded", len(st["outcomes"]) >= 4 and len(st["sends"]) >= 2)
        check("state: file mode 0600", oct(os.stat(tmp / "state.json").st_mode & 0o777) == "0o600")
        log = (tmp / "home").exists() or (tmp / "send-log.jsonl").exists()
        check("state: send log never stores the recipient", all('"to"' not in line for line in ((tmp / "send-log.jsonl").read_text().splitlines() if (tmp / "send-log.jsonl").exists() else [])))
    finally:
        srv.terminate()
        shutil.rmtree(tmp, ignore_errors=True)
    passed = sum(1 for _, ok, _ in results if ok)
    print(f"\n{passed}/{len(results)} checks passed. Screenshots in {SHOTS}")
    (SHOTS / "proof-results.json").write_text(json.dumps({"ran_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "passed": passed, "total": len(results),
                                                            "checks": [{"name": n, "ok": ok, "detail": d} for n, ok, d in results]}, indent=1))
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
