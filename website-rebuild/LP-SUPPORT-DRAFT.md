# Luxury Presence: keep Home Search, release the domain

Try the in-app route first (no email, no waiting on support). Read from LP's own help pages on October 13, 2026 (`lp-integration/README.md`); menu names may have shifted, so if a step isn't where it says, fall back to the email below.

## Route 1: in the LP dashboard, no support case

1. Luxury Presence dashboard, Websites, your site, Settings (gear), Domains.
2. Add domain: `search.calebjackson.org`. LP shows a CNAME target (something like `proxy.luxurypresence.com` or a `*.lpsites.com` host). Copy it. That target goes in the Squarespace DNS as the `search` CNAME.
3. Once the subdomain shows "Connected", set it as the primary domain, then remove `calebjackson.org` and `www.calebjackson.org` from the LP domain list. LP keeps serving the whole site, Home Search included, at the subdomain. Nothing in the CRM, saved searches or lead routing changes, they're tied to the account, not the hostname.
4. Home Search settings (Websites, three dots, Home Search settings): confirm header logo and colors per `lp-integration/README.md` step 2, and set the "Back to site" or logo link to `https://calebjackson.org`.

If the Domains screen won't let you remove the primary domain or add a subdomain, that's the one place support has to do it. Use Route 2.

## Route 2: the email, only if Route 1 is blocked

To: support@luxurypresence.com (or the in-app chat)
Subject: Move our site to a subdomain, keep Home Search and leads

> Hi team,
>
> We're moving calebjackson.org to our own host. Please keep our Luxury Presence site, including Home Search, saved searches, lead routing and CRM sync, live at search.calebjackson.org instead.
>
> Please confirm the CNAME target for search.calebjackson.org and that SSL will be issued for it, and release calebjackson.org and www.calebjackson.org from the account so our DNS change doesn't conflict.
>
> No content changes, no cancellation. One topic only, happy to open another case for anything else.
>
> Caleb Jackson, Keller Williams First Choice, (225) 747-0303
