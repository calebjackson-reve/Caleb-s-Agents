#!/usr/bin/env python3
"""profile-sync: one brief, one accept, then the surfaces with real APIs update themselves.

Surfaces: Facebook page (about, intro, phone, website, profile picture, cover),
YouTube channel (description, banner), Gmail signature.
Instagram and LinkedIn have no profile-editing API and are done by hand on purpose.

Secrets come from the macOS Keychain or environment variables, never from this repo.
    security add-generic-password -U -s aire.profile-sync -a facebook_page_token -w   (prompts hidden)
Google OAuth uses a client secret file at ~/.config/aire-profile-sync/client_secret.json
and caches the user token next to it with 0600 permissions.

Usage:
    python3 sync.py brief                 # read every surface, print what would change, change nothing
    python3 sync.py apply --yes           # apply every change in the brief
    python3 sync.py apply --yes --only facebook,youtube
    python3 sync.py brief --offline       # show the brief format from fixtures, no network
"""
import argparse, json, os, re, subprocess, sys, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
KIT = ROOT / "brand" / "profile-copy-kit.md"
ASSETS = ROOT / "brand" / "profile-assets"
CONFIG_DIR = pathlib.Path.home() / ".config" / "aire-profile-sync"
RECEIPTS = CONFIG_DIR / "receipts"

IDENTITY = {
    "facebook_page_id": "107195095165191",
    "youtube_channel_id": "UCdy7yq7pWHz93dba4wlqs3w",
    "phone": "(225) 747-0303",
    "website": "https://calebjackson.org/?utm_source={platform}&utm_medium=social&utm_campaign=profile",
}
GRAPH = "https://graph.facebook.com/v21.0"

# ---------- copy kit ----------
def kit_sections():
    """Parse brand/profile-copy-kit.md into {heading: text}. Blockquote and fence markers stripped."""
    text = KIT.read_text(encoding="utf-8")
    out, cur, buf = {}, None, []
    for line in text.splitlines():
        if line.startswith("## "):
            if cur: out[cur] = "\n".join(buf).strip()
            cur, buf = line[3:].strip(), []
        elif cur is not None:
            if line.strip() == "```": continue
            buf.append(re.sub(r"^> ?", "", line))
    if cur: out[cur] = "\n".join(buf).strip()
    return out

def intended():
    k = kit_sections()
    def sec(prefix):
        for h, v in k.items():
            if h.lower().startswith(prefix.lower()): return v
        raise SystemExit(f"copy kit is missing a section starting with '{prefix}'")
    long_bio = sec("About page, Facebook about, LinkedIn about")
    # drop the signature line from the long bio for platforms that show contact fields separately
    long_bio_body = "\n\n".join(p for p in long_bio.split("\n\n") if not p.startswith("Caleb Jackson, REALTOR, Keller Williams First Choice."))
    sig = sec("Email signature")
    return {
        "facebook": {
            "about": sec("Facebook page intro"),
            "description": long_bio_body,
            "phone": IDENTITY["phone"],
            "website": IDENTITY["website"].format(platform="facebook"),
            "picture": ASSETS / "avatar-1024.jpg",
            "cover": ASSETS / "cover-facebook-1640x624.png",
        },
        "youtube": {
            "description": sec("YouTube channel description"),
            "banner": ASSETS / "cover-youtube-2560x1440.png",
        },
        "gmail": {
            "signature_html": "<br>".join(sig.splitlines()),
        },
    }

# ---------- secrets ----------
def secret(account):
    env = os.environ.get(account.upper())
    if env: return env
    try:
        return subprocess.run(["security", "find-generic-password", "-s", "aire.profile-sync", "-a", account, "-w"],
                              check=True, capture_output=True, text=True).stdout.strip()
    except Exception:
        return None

def google_creds(scopes):
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    token_path = CONFIG_DIR / "google_token.json"
    creds = Credentials.from_authorized_user_file(str(token_path), scopes) if token_path.exists() else None
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            secret_path = CONFIG_DIR / "client_secret.json"
            if not secret_path.exists():
                raise SystemExit(f"missing {secret_path}: download the OAuth client JSON from Google Cloud and put it there")
            creds = InstalledAppFlow.from_client_secrets_file(str(secret_path), scopes).run_local_server(port=0)
        token_path.write_text(creds.to_json()); os.chmod(token_path, 0o600)
    return creds

GOOGLE_SCOPES = ["https://www.googleapis.com/auth/youtube", "https://www.googleapis.com/auth/youtube.upload",
                 "https://www.googleapis.com/auth/gmail.settings.basic"]

# ---------- surfaces ----------
class Facebook:
    name = "facebook"
    def __init__(self, offline=False):
        self.offline = offline
        self.token = None if offline else secret("facebook_page_token")
        self.page = IDENTITY["facebook_page_id"]
    def current(self):
        if self.offline:
            return {"about": "(fixture) Realtor in Baton Rouge", "description": "(fixture) old about text", "phone": "", "website": "https://calebjackson.org"}
        import requests
        r = requests.get(f"{GRAPH}/{self.page}", params={"fields": "about,description,phone,website,name,username", "access_token": self.token}, timeout=30)
        r.raise_for_status(); return r.json()
    def plan(self, want):
        cur = self.current()
        changes = [(f, cur.get(f, ""), want[f]) for f in ("about", "description", "phone", "website") if (cur.get(f) or "") != want[f]]
        changes.append(("profile picture", "(current picture)", want["picture"].name))
        changes.append(("cover photo", "(current cover)", want["cover"].name))
        return changes
    def apply(self, want):
        import requests
        r = requests.post(f"{GRAPH}/{self.page}", data={"about": want["about"], "description": want["description"], "phone": want["phone"], "website": want["website"], "access_token": self.token}, timeout=60)
        r.raise_for_status()
        with open(want["picture"], "rb") as f:
            r = requests.post(f"{GRAPH}/{self.page}/picture", files={"source": f}, data={"access_token": self.token}, timeout=120); r.raise_for_status()
        with open(want["cover"], "rb") as f:
            r = requests.post(f"{GRAPH}/{self.page}/photos", files={"source": f}, data={"published": "false", "access_token": self.token}, timeout=120); r.raise_for_status()
        photo_id = r.json()["id"]
        r = requests.post(f"{GRAPH}/{self.page}", data={"cover": photo_id, "no_feed_story": "true", "access_token": self.token}, timeout=60); r.raise_for_status()
        return {"page": self.page, "cover_photo_id": photo_id}

class YouTube:
    name = "youtube"
    def __init__(self, offline=False):
        self.offline = offline; self.svc = None; self.channel = None
    def _svc(self):
        if self.svc is None:
            from googleapiclient.discovery import build
            self.svc = build("youtube", "v3", credentials=google_creds(GOOGLE_SCOPES))
        return self.svc
    def current(self):
        if self.offline:
            return {"id": IDENTITY["youtube_channel_id"], "brandingSettings": {"channel": {"description": "(fixture) old channel description"}}}
        resp = self._svc().channels().list(part="brandingSettings,snippet", mine=True).execute()
        items = resp.get("items") or []
        if not items: raise SystemExit("no YouTube channel on this Google account")
        self.channel = items[0]; return self.channel
    def plan(self, want):
        cur = self.current()
        desc = cur.get("brandingSettings", {}).get("channel", {}).get("description", "")
        changes = []
        if desc != want["description"]: changes.append(("description", desc, want["description"]))
        changes.append(("banner", "(current banner)", want["banner"].name))
        return changes
    def apply(self, want):
        from googleapiclient.http import MediaFileUpload
        svc = self._svc(); cur = self.channel or self.current()
        banner = svc.channelBanners().insert(media_body=MediaFileUpload(str(want["banner"]), mimetype="image/png")).execute()
        branding = cur.get("brandingSettings", {})
        branding.setdefault("channel", {})["description"] = want["description"]
        branding.setdefault("image", {})["bannerExternalUrl"] = banner["url"]
        svc.channels().update(part="brandingSettings", body={"id": cur["id"], "brandingSettings": branding}).execute()
        return {"channel": cur["id"], "banner_url": banner["url"]}

class Gmail:
    name = "gmail"
    def __init__(self, offline=False):
        self.offline = offline; self.svc = None; self.send_as = None
    def _svc(self):
        if self.svc is None:
            from googleapiclient.discovery import build
            self.svc = build("gmail", "v1", credentials=google_creds(GOOGLE_SCOPES))
        return self.svc
    def current(self):
        if self.offline: return {"sendAsEmail": "aire@calebjackson.org", "signature": "(fixture) old signature"}
        resp = self._svc().users().settings().sendAs().list(userId="me").execute()
        primary = [s for s in resp.get("sendAs", []) if s.get("isPrimary")] or resp.get("sendAs", [])
        self.send_as = primary[0]; return self.send_as
    def plan(self, want):
        cur = self.current()
        if (cur.get("signature") or "") == want["signature_html"]: return []
        return [("signature", re.sub(r"<br>", " / ", cur.get("signature") or ""), re.sub(r"<br>", " / ", want["signature_html"]))]
    def apply(self, want):
        cur = self.send_as or self.current()
        self._svc().users().settings().sendAs().update(userId="me", sendAsEmail=cur["sendAsEmail"], body={"signature": want["signature_html"]}).execute()
        return {"sendAsEmail": cur["sendAsEmail"]}

SURFACES = {"facebook": Facebook, "youtube": YouTube, "gmail": Gmail}

# ---------- brief and apply ----------
def short(s, n=140):
    s = " ".join(str(s).split()); return s if len(s) <= n else s[: n - 3] + "..."

def build_brief(only, offline):
    want = intended(); brief = {}
    for name in only:
        s = SURFACES[name](offline=offline)
        try:
            brief[name] = {"changes": s.plan(want[name]), "surface": s, "error": None}
        except Exception as e:
            brief[name] = {"changes": [], "surface": s, "error": str(e)}
    return want, brief

def print_brief(brief):
    print("\nPROFILE SYNC BRIEF  " + datetime.datetime.now().strftime("%Y-%m-%d %H:%M") + "\n")
    total = 0
    for name, b in brief.items():
        print(f"== {name.upper()}")
        if b["error"]:
            print(f"   could not read: {b['error']}\n"); continue
        if not b["changes"]:
            print("   already matches\n"); continue
        for field, cur, new in b["changes"]:
            total += 1
            print(f"   {field}")
            print(f"      now: {short(cur)}")
            print(f"      new: {short(new)}")
        print()
    print("Not touched by this tool, on purpose: Instagram, LinkedIn, Google Business Profile, Luxury Presence (no profile-editing API).")
    print(f"\n{total} change(s). Apply with:  python3 sync.py apply --yes\n")
    return total

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=["brief", "apply"])
    ap.add_argument("--yes", action="store_true", help="required for apply: confirms you read the brief")
    ap.add_argument("--only", default="facebook,youtube,gmail", help="comma list of surfaces")
    ap.add_argument("--offline", action="store_true", help="fixtures instead of live reads; apply is refused")
    a = ap.parse_args()
    only = [x.strip() for x in a.only.split(",") if x.strip()]
    for x in only:
        if x not in SURFACES: raise SystemExit(f"unknown surface {x}; choose from {', '.join(SURFACES)}")
    want, brief = build_brief(only, a.offline)
    total = print_brief(brief)
    if a.command == "brief": return
    if a.offline: raise SystemExit("apply refused in --offline mode")
    if not a.yes: raise SystemExit("apply needs --yes after you have read the brief")
    RECEIPTS.mkdir(parents=True, exist_ok=True)
    receipt = {"at": datetime.datetime.now().isoformat(), "results": {}}
    for name, b in brief.items():
        if b["error"] or not b["changes"]: continue
        try:
            receipt["results"][name] = {"ok": True, "detail": b["surface"].apply(want[name]), "changes": [c[0] for c in b["changes"]]}
            print(f"applied {name}")
        except Exception as e:
            receipt["results"][name] = {"ok": False, "error": str(e)}
            print(f"FAILED {name}: {e}")
    path = RECEIPTS / (datetime.datetime.now().strftime("%Y%m%d-%H%M%S") + ".json")
    path.write_text(json.dumps(receipt, indent=2, default=str)); print(f"receipt: {path}")

if __name__ == "__main__":
    main()
