# Google review form

`index.html` is the guided review page. It asks a past client five short questions, stitches the answers into a draft in their own words, copies it, and sends them to Caleb's Google listing to post it. Nothing is stored or sent by the page. It rebrands the page first pushed in pull request 6 to the Keller Williams First Choice brand package and widens it from Zachary to every area Caleb serves.

## Rules it follows

- **No review gating.** Google's policy forbids asking "were you happy?" and routing only happy clients to Google. Every client who opens the page gets the same path to the same link. Keep it that way.
- **The client's words, not Caleb's.** The page only assembles what the client typed or tapped. It never writes a review for them.
- **No data leaves the page.** No form submission, no analytics, no storage.
- **noindex.** The page is for people Caleb sends it to, not for search.

## The Google link

The button opens the verified listing by its CID (17113183507740077585), which shows the Write a review button. For a shorter link, open the Business Profile dashboard, tap Ask for reviews, copy the share link, and paste it over the `google.url` value at the top of the script in `index.html`.

## Per-client links

Add the client's first name so the page greets them: `?name=Sarah`. Other destinations once their links are filled in: `?to=zillow&name=Sarah`, `?to=ratemyagent&name=Sarah`. A destination with no link falls back to Google.

## Hosting

The page is one static file. Options, in order of preference. None is set up yet, and putting it on the public web is Caleb's call.

1. **calebjackson.org/review in Luxury Presence**, if the builder allows a custom HTML page or an embed block. Unknown until checked.
2. **GitHub Pages from this repository.** The repo is public, so enabling Pages would serve it at a github.io address. Fine for a review link, but a custom domain reads better.
3. **Any static host** (Netlify, Cloudflare Pages) with a `review.calebjackson.org` subdomain.

Self-host the Hauora font once hosting is chosen. The page falls back to the system sans until then. Instrument Serif loads from Google Fonts.

## Request messages (approved voice, send by hand or through the review engine)

**Text, day of closing**

> [Name], congratulations again. If you've got two minutes, this page helps you write a Google review in your own words and posts it for you: [link]?name=[Name]. It means more than you know. Thank you.

**Text, past client, monthly pass**

> [Name], hope the house is treating y'all well. Quick favor: a Google review helps the next family find me. This takes two minutes and uses your words, not mine: [link]?name=[Name]. Thank you either way.

**Email, day of closing**

> Subject: Two minutes, your words
>
> [Name],
>
> Thank you for trusting me with [one true specific: the house on Plank Road, the fast close, the appraisal fight]. If you'd be willing, this page walks you through a Google review in about two minutes. It uses your words and posts straight to Google:
>
> [link]?name=[Name]
>
> Every review helps the next family find me. Thank you either way.
>
> Caleb Jackson, REALTOR, Keller Williams First Choice
> (225) 747-0303

**Reply to every review within 24 hours**, by first name, repeating one specific from their review, no marketing language. Drafts come from the review engine, Caleb posts them.
