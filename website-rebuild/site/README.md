# Stage 3 build: calebjackson.org rebuild

Static site. Edit pages in `src/`, shared head and scripts in `_head.html` and `_scripts.html`, then run:

```
python3 scripts/build.py
```

Built pages land in this folder. Media is referenced from `../media/`. Preview locally with `python3 -m http.server 8787` from `website-rebuild/` and open `http://localhost:8787/site/index.html`.

Verify with `NODE_PATH=/opt/node-tools/node_modules node scripts/verify.js` (Playwright) and Lighthouse. Results are in `verification.json` and `verification/`.

`_head.html` carries `noindex,nofollow` on purpose while this is a prototype. Remove it at launch (see `../LAUNCH-OPTIONS.md`).

## Compliance check, October 19, 2026 (skills/ai-compliance-check)

Compliance: PASS, with two lines flagged for Caleb's call.

- Identity: Caleb Jackson, Keller Williams First Choice, 17111 Commerce Centre Drive, license 995709547, (225) 747-0303, aire@calebjackson.org and Equal Housing Opportunity appear in the footer of every page. No Rêve branding.
- Guarantees: none on price, value or timing. "Your call gets returned today" is a service promise.
- Fair housing: neighborhood copy describes places, not people. Flag 1: "Faith first, family always" (Home lead, About) is Caleb's own values line from the brand package, not a description of who should live anywhere. Unknown whether the broker wants it on the site, ask the broker. Flag 2: "Listed Tuesday, under contract Friday isn't a slogan. Some weeks it's just a Tuesday" (About) reads as past experience, not a promise. Keep or cut at Caleb's call.
- Numbers: 81 deals and $25.1M carry "as of October 7, 2026". Templates mark every number "[needs source]" style with a source line.
- Texting: the contact form consent line includes STOP opt-out.
- AI disclosure: no AI images on the site today. The four still animations are camera motion added to Caleb's own photos and are labeled in `../media/MEDIA-LIBRARY.md`; add a credit line in the footer if any ships.
