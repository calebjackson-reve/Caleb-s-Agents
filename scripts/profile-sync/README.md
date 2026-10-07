# profile-sync: one brief, one accept

Runs on Caleb's Mac. Reads the approved copy from `brand/profile-copy-kit.md` and the images from `brand/profile-assets/`, prints one brief of what would change on each surface, and applies everything after a single `--yes`. Writes a receipt per run.

## What it updates

| Surface | Fields | How |
|---|---|---|
| Facebook page 107195095165191 | intro (about), long about (description), phone, website with UTM, profile picture, cover photo | Graph API with a page token |
| YouTube channel UCdy7yq7pWHz93dba4wlqs3w | channel description, banner | YouTube Data API with Caleb's OAuth consent |
| Gmail (aire@calebjackson.org) | signature on the primary send-as address | Gmail API with the same OAuth consent |

## What it will never do, and why

- **Instagram and LinkedIn.** Neither has an API for editing a bio or photo. Driving them with a bot and a password breaks their terms and gets accounts locked. Both take about five minutes by hand from `brand/profile-update-checklist.md`.
- **Google Business Profile.** Its API needs a separate access request that Google reviews over days. Hand update for now.
- **Luxury Presence.** No content API.
- **Passwords.** The tool never asks for one. Facebook uses a page token stored in the macOS Keychain. Google uses an OAuth client and a consent screen, with the token cached under `~/.config/aire-profile-sync/` at 0600. Nothing secret is in this repository, and `.gitignore` refuses token files.

## One-time setup, about 20 minutes

1. `pip3 install -r scripts/profile-sync/requirements.txt`
2. **Facebook token.** At developers.facebook.com create an app (Business type is fine), open Graph API Explorer, pick the app, add permissions `pages_manage_metadata`, `pages_read_engagement` and `pages_show_list`, generate a User token, then exchange it for a long-lived Page token for the page. Run `scripts/profile-sync/setup-secrets.sh` and paste it when prompted. Page tokens from a long-lived user token do not expire.
3. **Google OAuth client.** In Google Cloud (any project you own, once billing is fixed) enable the YouTube Data API v3 and the Gmail API, create an OAuth client of type Desktop app, download the JSON, and save it as `~/.config/aire-profile-sync/client_secret.json`. Add aire@calebjackson.org as a test user on the consent screen. The first run opens the browser for consent.

## Every run after that

```
cd Caleb-s-Agents
python3 scripts/profile-sync/sync.py brief          # reads every surface, prints the brief, changes nothing
python3 scripts/profile-sync/sync.py apply --yes    # the accept
```

Use `--only facebook` or `--only youtube,gmail` to limit a run. `--offline` shows the brief format from fixtures without touching the network.

When the receipts change (families, volume), edit `brand/profile-copy-kit.md`, re-render the covers from `brand/profile-assets/gen.html`, and run the brief again. The tool only changes fields that differ.

## Status on October 7, 2026

Written and dry-run in a cloud container that cannot reach Meta or Google, so it is untested against the live APIs. The copy-kit parser and the brief format were exercised with `--offline`. First live run should be `brief` only, then `apply --yes --only gmail` as the lowest-risk surface, then Facebook and YouTube.
