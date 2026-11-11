"""Louisiana Home Brief, next build. Generates static pages. Never publishes anything."""
from pathlib import Path
from html import escape as esc
import json

ROOT = Path(__file__).resolve().parent
PHONE_DISPLAY = "(225) 747-0303"
SMS = "sms:+12257470303"
TEL = "tel:+12257470303"
NUMBERS = {"deals": 81, "volume": "$25.1M", "last12": 27, "zachary": 15}
DEALS = json.loads((ROOT / "data/deals.json").read_text())

NAV = [("Buy", "payment.html"), ("Sell", "net-sheet.html"), ("Flood", "flood.html"), ("Tools", "tools.html"), ("Owner's brief", "owners-brief.html"), ("About", "about.html")]
MENU = NAV + [("Golf and water", "golf.html"), ("Field notes", "lessons.html"), ("Contact", "contact.html")]


def header(current):
    links = "".join(f'<a href="{href}"{" aria-current=page" if href == current else ""}>{label}</a>' for label, href in NAV)
    menu_links = "".join(f'<a href="{href}">{label}<span>.</span></a>' for label, href in MENU)
    return f'''<div class="progress" aria-hidden="true"></div>
<header class="site-header"><div class="wrap">
  <a class="wordmark" href="index.html">caleb jackson<span class="dot">.</span></a>
  <nav class="nav" aria-label="Main">{links}</nav>
  <div class="header-actions">
    <a class="call-link" href="{TEL}">Call</a>
    <a class="text-caleb" href="{SMS}" aria-label="Text Caleb at 225 747 0303">Text Caleb</a>
    <button class="menu-btn" data-menu-open aria-expanded="false" aria-controls="menu">Menu</button>
  </div>
</div></header>
<div class="menu" id="menu" data-menu hidden>
  <header><a class="wordmark" href="index.html">caleb jackson<span class="dot">.</span></a><button class="menu-btn" data-menu-close>Close</button></header>
  <nav aria-label="All pages">{menu_links}</nav>
  <footer>Caleb Jackson, REALTOR · Keller Williams First Choice · <a href="{TEL}">{PHONE_DISPLAY}</a></footer>
</div>'''


def footer():
    return f'''<footer class="site-footer"><div class="wrap">
  <div class="grid">
    <div>
      <a class="wordmark" href="index.html">caleb jackson<span class="dot">.</span></a>
      <p class="numbers" style="margin-top:18px">{NUMBERS["deals"]} deals. {NUMBERS["volume"]} sold.<br><span>Every one by referral.</span></p>
      <p class="small" style="color:rgba(251,248,243,.75);margin-top:14px">Caleb Jackson, REALTOR®<br>Keller Williams First Choice<br>17111 Commerce Centre Drive, Prairieville, LA 70769</p>
      <p style="margin-top:14px"><a href="{SMS}">Text</a> · <a href="{TEL}">{PHONE_DISPLAY}</a> · <a href="mailto:aire@calebjackson.org">aire@calebjackson.org</a> · <a href="https://instagram.com/calebjacksonla" rel="noopener">@calebjacksonla</a></p>
    </div>
    <nav aria-label="Tools"><b>Tools</b><a href="payment.html">What would I pay a month?</a><a href="net-sheet.html">What would I walk away with?</a><a href="flood.html">What flood zone is this?</a><a href="showing-plan.html">The Saturday plan</a><a href="owners-brief.html">The owner's brief</a></nav>
    <nav aria-label="Caleb"><b>Caleb</b><a href="about.html">The map is the resume</a><a href="golf.html">Golf and water</a><a href="lessons.html">Field notes</a><a href="contact.html">Contact</a></nav>
  </div>
  <p class="legal">Equal Housing Opportunity · REALTOR® · Keller Williams First Choice. Numbers are user-confirmed from the MLS, not independently audited. Tools give estimates from your inputs and public data; property condition, flood status, insurance and financing need confirmation from the right professional. Nothing on this site sends a message unless you tap send.</p>
</div></footer>'''


def jarvis():
    return f'''<button class="jarvis-fab" data-jarvis-open aria-haspopup="dialog" aria-label="Ask about any address"><span class="pulse" aria-hidden="true"></span>Ask<span class="label"> about any address</span></button>
<section class="jarvis" data-jarvis role="dialog" aria-label="Ask Caleb's site" aria-hidden="true">
  <header><b>Caleb, straight<span class="dot">.</span></b><button class="menu-btn" data-jarvis-close>Close</button></header>
  <div class="log" aria-live="polite"></div>
  <div class="starters"><button class="chip">What flood zone is 4000 McHugh Rd, Zachary?</button><button class="chip">Who is Caleb?</button><button class="chip">How much is insurance?</button></div>
  <form><label class="sr-only" for="jarvis-q">Your question</label><input id="jarvis-q" type="text" placeholder="Ask about an address, Caleb, or this site" autocomplete="off"><button class="btn" type="submit">Ask</button></form>
</section>'''


def egg():
    return '''<div class="egg" aria-hidden="true"><img src="assets/home-background-poster.jpg" alt=""><p>When it's time to move,<br>we move<span class="dot">.</span></p></div>'''


def shell(slug, title, description, body, current, extra_head=""):
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title><meta name="description" content="{esc(description, quote=True)}">
<link rel="preload" as="font" href="assets/InstrumentSerif-Regular.ttf" type="font/ttf" crossorigin>
<link rel="stylesheet" href="theme.css">{extra_head}
</head><body data-page="{slug}">
<div class="preview-bar">Preview build · not published · tools run in your browser · nothing sends unless you tap send</div>
{header(current)}
<main id="main">{body}</main>
{footer()}
{jarvis()}
{egg()}
<script src="js/calc-core.js"></script><script src="js/water.js"></script><script src="js/calc-ui.js"></script><script src="js/flood.js"></script><script src="js/map.js"></script><script src="js/jarvis.js"></script><script src="js/motion.js"></script>
</body></html>'''


# ---------- shared blocks ----------

def range_field(name, label, mn, mx, step, value, fmt="money", hint=""):
    return f'''<div class="field"><label for="f-{name}">{esc(label)}<output></output></label><input id="f-{name}" type="range" name="{name}" min="{mn}" max="{mx}" step="{step}" value="{value}" data-format="{fmt}">{f'<span class="hint">{esc(hint)}</span>' if hint else ''}</div>'''


def payment_tool(full=True, prefix="pay"):
    costs = "" if not full else f'''<details class="more"><summary>Add the Louisiana costs you know</summary><div class="tool" style="margin-top:14px">
  {range_field("taxes", "Property taxes a year", 0, 12000, 100, 0, "money", "East Baton Rouge: the homestead exemption covers the first $75,000 of value on parish taxes.")}
  {range_field("ins", "Homeowners insurance a year", 0, 12000, 100, 0, "money", "Louisiana averages are high right now. A FORTIFIED roof earns a mandatory discount from January 1, 2027.")}
  {range_field("flood", "Flood insurance a year", 0, 6000, 50, 0, "money", "Zone X often runs a few hundred dollars. AE depends on the elevation certificate.")}
  {range_field("hoa", "HOA dues a month", 0, 400, 5, 0, "money")}
  {range_field("pmi", "Mortgage insurance a month", 0, 400, 5, 0, "money", "Usually applies under 20 percent down on a conventional loan.")}
</div></details>'''
    return f'''<form class="tool card" data-calc="payment" data-sms-scope novalidate>
  <div data-answer class="answer" aria-live="polite"><span class="n">$1,517</span><small>a month, principal and interest only on $300,000 with 20% down at 6.5% for 30 years</small></div>
  {range_field("price", "Home price", 75000, 1000000, 5000, 300000, "money")}
  {range_field("down", "Down payment", 0, 50, 0.5, 20, "pct", "3% conventional, 3.5% FHA, 0% VA or USDA where it applies.")}
  {range_field("rate", "Interest rate", 2, 10, 0.125, 6.5, "pct", "Use the rate your lender quoted. This one is an example, not today's rate.")}
  <div class="field"><label>Loan term</label><div class="chips" data-chips="term"><button type="button" class="chip" data-value="15" aria-pressed="false">15 years</button><button type="button" class="chip" data-value="20" aria-pressed="false">20 years</button><button type="button" class="chip" data-value="30" aria-pressed="true">30 years</button></div><input type="hidden" name="term" value="30"></div>
  {costs}
  <dl class="lines" data-lines></dl>
  <p class="note" data-note></p>
  <div class="actions"><a class="btn" data-sms-result href="{SMS}">Text me this result <span class="arrow">↗</span></a><button type="button" class="mic" data-mic aria-pressed="false">🎙 Say it instead</button></div>
  <p class="small" data-mic-status></p>
</form>'''


def net_tool(full=True):
    costs = "" if not full else f'''<details class="more"><summary>Add the selling costs you know</summary><div class="tool" style="margin-top:14px">
  {range_field("comm", "Commission, total", 0, 8, 0.25, 0, "pct", "Whatever you and Caleb agree to. Nothing is assumed.")}
  {range_field("title", "Seller title and closing fees", 0, 6000, 100, 0, "money", "The title company issues the real figure. Ask early.")}
  {range_field("other", "Other seller costs", 0, 10000, 100, 0, "money", "Termite letter, home warranty, HOA transfer, prorated taxes.")}
  {range_field("conc", "Concessions to the buyer", 0, 20000, 250, 0, "money", "Closing-cost help is common on Louisiana FHA and rural loans.")}
  {range_field("repairs", "Repairs you agree to pay for", 0, 20000, 250, 0, "money")}
</div></details>'''
    return f'''<form class="tool card" data-calc="net" data-sms-scope novalidate>
  <div data-answer class="answer" aria-live="polite"><span class="n">$100,000</span><small>estimated to you at closing on a $300,000 sale, after a $200,000 payoff</small></div>
  {range_field("sale", "Possible sale price", 75000, 1000000, 5000, 300000, "money")}
  {range_field("payoff", "Mortgage and lien payoff", 0, 800000, 5000, 200000, "money", "Use the payoff on your last statement, not the balance.")}
  {costs}
  <dl class="lines" data-lines></dl>
  <p class="note" data-note></p>
  <div class="actions"><a class="btn" data-sms-result href="{SMS}">Text me this result <span class="arrow">↗</span></a><button type="button" class="mic" data-mic aria-pressed="false">🎙 Say it instead</button></div>
  <p class="small" data-mic-status></p>
</form>'''


def flood_stage():
    # A Louisiana house in section: pier foundation, porch, roof. Water rises in the canvas beneath.
    return '''<div class="flood-stage" aria-hidden="true">
<canvas></canvas>
<svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMax slice">
  <g fill="none" stroke="#14100E" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
    <path d="M60 420 H740" opacity=".35"/>
    <g transform="translate(190 0)">
      <rect x="90" y="330" width="22" height="90" fill="#FBF8F3"/><rect x="300" y="330" width="22" height="90" fill="#FBF8F3"/><rect x="195" y="330" width="22" height="90" fill="#FBF8F3"/>
      <rect x="60" y="300" width="300" height="30" fill="#FBF8F3"/>
      <rect x="80" y="170" width="260" height="130" fill="#FBF8F3"/>
      <path d="M40 180 L210 60 L380 180 Z" fill="#FBF8F3"/>
      <rect x="20" y="300" width="60" height="30" fill="#FBF8F3"/><path d="M20 300 V240 M80 300 V240 M20 240 H80" />
      <rect x="130" y="210" width="40" height="50" fill="#E87757" opacity=".9"/><rect x="250" y="210" width="40" height="50" fill="#E87757" opacity=".9"/>
      <rect x="190" y="220" width="40" height="80" fill="#14100E"/>
    </g>
    <path d="M60 330 H120" stroke-dasharray="6 6" opacity=".6"/><text x="60" y="320" font-family="HB Sans, sans-serif" font-size="13" font-weight="800" fill="#14100E" stroke="none" letter-spacing=".1em">FLOOR</text>
  </g>
</svg>
<span class="flood-label" data-sky-label>Zachary</span>
</div>'''


def flood_tool(compact=False):
    return f'''<div data-flood data-sms-scope>
  <div class="grid-2 wide-left">
    <div>
      {flood_stage()}
      <p class="small" style="margin-top:12px">The water rises to the band the zone describes: low for Zone X, moderate for shaded X, up to the floor for AE. It is a picture of the zone's meaning, not a measurement of this house.</p>
    </div>
    <div class="card">
      <form><label for="flood-address"><b>Type a Louisiana address</b></label>
        <div style="display:flex;gap:8px;margin-top:8px"><input id="flood-address" name="address" type="text" placeholder="4000 McHugh Rd, Zachary, LA 70791" autocomplete="street-address" required><button class="btn" type="submit">Check</button></div>
        <div class="chips" style="margin-top:10px"><button type="button" class="chip" data-example="4000 McHugh Rd, Zachary, LA 70791">Try a Zachary address</button><button type="button" class="chip" data-example="1300 Meadow Grove Ave, Zachary, LA 70791">Copper Mill</button><button type="button" class="chip" data-example="17122 Carpenters Chapel Rd, Prairieville, LA 70769">Prairieville</button></div>
        <p class="small" data-flood-status aria-live="polite" style="margin-top:8px"></p>
      </form>
      <div data-flood-out hidden style="margin-top:20px;display:grid;gap:14px">
        <div style="display:flex;align-items:center;gap:16px"><span class="flood-zone" data-flood-zone>X</span><b data-flood-label style="font-size:18px"></b></div>
        <p data-flood-plain></p>
        <div class="sources" data-flood-sources></div>
        <div class="actions"><a class="btn" data-sms-result href="{SMS}">Text Caleb about this address <span class="arrow">↗</span></a></div>
      </div>
      <details class="more" style="margin-top:20px"><summary>What the zones mean, in plain words</summary>
        <div class="small" style="display:grid;gap:10px;margin-top:10px">
          <p><b>X</b>: outside the high-risk area. Insurance optional and usually cheap. The 2016 flood put water in thousands of Zone X homes, so people here carry it anyway.</p>
          <p><b>X shaded</b>: the moderate band. Still optional. Still worth the quote.</p>
          <p><b>AE, A, AH, AO</b>: Special Flood Hazard Area. A federally backed loan requires flood insurance. The premium depends on the elevation certificate, so ask for it before you write an offer.</p>
          <p><b>VE</b>: coastal high hazard. Rare this far north.</p>
          <p>Parish discounts on NFIP policies through the Community Rating System: East Baton Rouge 20 percent, Central 25 percent, Zachary 15 percent. The federal flood program is authorized through December 11, 2026.</p>
        </div></details>
    </div>
  </div>
</div>'''


def saturday_plan():
    stops = [
        ("9:00", "4353 Pasture Clear Ct", "Ravenwood, Zachary", ["Walk the yard first. Where does water go when it rains?", "Open the attic hatch and look at the roof deck.", "Count the outlets in the kitchen. Older houses hide this."]),
        ("10:15", "1928 E Eagle St", "Marita Terrace, Zachary", ["Ask the age of the HVAC and the water heater.", "Check the slab edge for cracks and the doors for sticking.", "Drive the school route at this hour, not at noon."]),
        ("11:30", "2179 S Turnberry Ave", "Copper Mill, Zachary", ["HOA dues and what they cover.", "Which side of the house gets the afternoon sun.", "Golf-cart rules if you care about the course."]),
        ("12:30", "Lunch", "Main Street, Zachary", ["Rank the three on one line each.", "What would you give up to get the one you liked?", "Text Caleb the ranking. That is the whole report."]),
        ("1:45", "4615 41st St", "West End, Zachary", ["Older neighborhood: ask about the sewer line and the panel.", "Look at the neighbors' roofs. Same age as this one?", "Walk to the end of the street and back."]),
    ]
    html = "".join(f'''<article class="stop{' lunch' if t == '12:30' else ''}"><time>{t}</time><h4>{esc(a)}</h4><p class="small">{esc(n)}</p><ul>{''.join('<li>' + esc(q) + '</li>' for q in qs)}</ul></article>''' for t, a, n, qs in stops)
    return f'''<div class="rail" tabindex="0" aria-label="A sample Saturday of showings in Zachary">{html}</div>
<p class="small">These are real Zachary streets Caleb has closed on. The homes themselves are not for sale unless the listing says so; the plan shows what a built Saturday looks like.</p>'''


def countdowns():
    return '''<div class="countdowns">
  <div class="count"><div class="n"><span data-countdown="2026-12-11">0</span><small>days</small></div><h4>The flood program's deadline</h4><p class="small">The National Flood Insurance Program is authorized through December 11, 2026. It lapsed twice in the last year. If you are closing on a loan that needs flood insurance, bind the policy before the deadline, not after.</p></div>
  <div class="count"><div class="n"><span data-countdown="2027-01-01">0</span><small>days</small></div><h4>FORTIFIED discounts become mandatory</h4><p class="small">From January 1, 2027 every Louisiana property insurer must discount a FORTIFIED roof. Filed discounts today run from about 7 to 40 percent by carrier. If your roof is due, this changes the math.</p></div>
  <div class="count"><div class="n"><span data-countdown="2027-08-15">0</span><small>days</small></div><h4>The next open-rolls window</h4><p class="small">The East Baton Rouge assessor opens the rolls for 15 days between August 15 and September 15. That is the only window to question your assessment for the year. The next reassessment is 2028.</p></div>
</div>'''


# ---------- pages ----------

def home():
    tiles = f'''<div class="tiles">
  <a class="tile reveal" href="payment.html" style="--d:0ms"><span class="spot"></span><p class="eyebrow">Buying</p><div><div class="tile-num"><span data-ticker="1517" data-prefix="$">0</span><small>a month</small></div><h3>What would I pay?</h3></div><p class="small">$300,000, 20% down, 6.5%, 30 years. Slide it to yours.</p></a>
  <a class="tile reveal" href="net-sheet.html" style="--d:80ms"><span class="spot"></span><p class="eyebrow">Selling</p><div><div class="tile-num"><span data-ticker="100000" data-prefix="$">0</span></div><h3>What would I keep?</h3></div><p class="small">A $300,000 sale after a $200,000 payoff, before the costs you add.</p></a>
  <a class="tile reveal" href="flood.html" style="--d:160ms"><span class="spot"></span><p class="eyebrow">Before a tour</p><div><div class="tile-num"><span data-ticker="5">0</span><small>seconds</small></div><h3>What flood zone?</h3></div><p class="small">Type an address. Read FEMA's map for that point. Know what to ask.</p></a>
  <a class="tile reveal" href="showing-plan.html" style="--d:240ms"><span class="spot"></span><p class="eyebrow">The Saturday</p><div><div class="tile-num"><span data-ticker="4">0</span><small>homes</small></div><h3>Know what to ask.</h3></div><p class="small">One Saturday, four real Zachary streets, the questions for each door.</p></a>
</div>'''
    body = f'''
<section class="hero" id="top">
  <div class="hero-media"><img src="assets/basil-front-lp.jpg" alt="A white Acadian-style home at dusk on Basil Lane, St. Francisville, every window lit" width="1672" height="941" fetchpriority="high" decoding="async"></div>
  {'<video class="hero-video" data-src="assets/home-background.mp4" poster="assets/basil-front-lp.jpg" muted loop playsinline preload="none" aria-hidden="true" tabindex="-1"></video>' if (ROOT / "assets/home-background.mp4").exists() else ""}
  <div class="hero-sky"></div><div class="hero-shade"></div>
  <canvas class="hero-water" data-hero-water aria-hidden="true"></canvas>
  <div class="grain"></div>
  <div class="wrap hero-content">
    <p class="eyebrow on-dark"><span data-sky-label>Zachary, Louisiana</span> · <time data-today></time></p>
    <h1 class="kinetic">See the home.<br>Know what to ask<span class="period" tabindex="0" title="Hold me">.</span></h1>
    <p class="lead">Free tools that answer before they ask. Payment, net sheet, flood zone, the Saturday plan. No email, no sign-up, no catch.</p>
    <p class="hero-proof"><b>{NUMBERS["deals"]} deals</b> · <b>{NUMBERS["volume"]}</b> since 2022 · every one by referral<br>Caleb Jackson · Keller Williams First Choice</p>
    <div class="actions"><a class="btn on-dark" href="{SMS}">Text Caleb <span class="arrow">↗</span></a><a class="btn on-dark ghost" href="#tools" data-scroll-to>Start with a tool</a></div>
  </div>
  <a class="scroll-cue" href="#tools" data-scroll-to><span>Start here</span><span class="line"></span></a>
</section>

<section class="section" id="tools"><div class="wrap">
  <p class="eyebrow reveal">Answer first</p>
  <h2 class="reveal">Four questions.<br>Four answers, already showing<span class="dot">.</span></h2>
  <p class="lead reveal" style="margin-top:18px">Every tool opens with a worked example on screen. Change it to your numbers. Then text Caleb the result with one tap, if you want to.</p>
  {tiles}
</div></section>

<section class="section" id="flood"><div class="wrap">
  <p class="eyebrow reveal">Louisiana's first question</p>
  <h2 class="reveal">Where does the water go<span class="dot">?</span></h2>
  <p class="lead reveal" style="margin-top:18px">Type any address. The tool reads FEMA's flood layer at that point and tells you what the zone means for your loan, your insurance and your questions to the seller.</p>
  <div class="reveal" style="margin-top:36px">{flood_tool()}</div>
</div></section>

<section class="section" id="map"><div class="wrap grid-2 wide-right">
  <div>
    <p class="eyebrow reveal">The map is the resume</p>
    <h2 class="reveal">Every dot is a closing<span class="dot">.</span></h2>
    <p class="lead reveal" style="margin-top:18px">{len(DEALS["deals"])} closed sales from the MLS, placed by city. Coral is Zachary. Tap a dot for the street, the year and which side Caleb sat on.</p>
    <div class="reveal" style="margin-top:28px;display:grid;gap:22px;grid-template-columns:1fr 1fr">
      <div class="bignum"><span data-ticker="{NUMBERS["deals"]}">0</span><small>deals since 2022, four of them off-market</small></div>
      <div class="bignum"><span data-ticker="25.1" data-prefix="$" data-suffix="M">0</span><small>in sales, user-confirmed</small></div>
    </div>
    <div class="map-legend reveal" data-city-counts></div>
  </div>
  <div class="map-wrap reveal" data-deal-map></div>
</div></section>

<section class="section" id="saturday"><div class="wrap">
  <p class="eyebrow reveal">The Saturday plan</p>
  <h2 class="reveal">Four doors. One afternoon.<br>The questions for each<span class="dot">.</span></h2>
  <p class="lead reveal" style="margin-top:18px">This is what a built Saturday looks like before Caleb builds yours. Scroll sideways.</p>
  <div class="reveal" style="margin-top:36px">{saturday_plan()}</div>
  <div class="actions"><a class="btn" href="{SMS}?&body={esc('Hey Caleb, can you build me a Saturday? Here are the homes I am looking at: ')}">Text Caleb your list <span class="arrow">↗</span></a><a class="textlink" href="showing-plan.html">See the full plan and the questions</a></div>
</div></section>

<section class="section" id="brief"><div class="wrap">
  <p class="eyebrow reveal">The owner's brief · <time data-today></time></p>
  <h2 class="reveal">Three dates every Louisiana owner should know<span class="dot">.</span></h2>
  <div class="reveal" style="margin-top:36px">{countdowns()}</div>
  <div class="actions"><a class="btn ghost" href="owners-brief.html">The whole brief: insurance, taxes, hurricane season</a></div>
</div></section>

<section class="section" id="roots"><div class="wrap grid-2 wide-left">
  <div>
    <p class="eyebrow reveal">Baton Rouge born · Keller Williams First Choice</p>
    <h2 class="reveal">They call me Action Jackson<span class="dot">.</span></h2>
    <p class="quote reveal" style="margin-top:22px">Your call gets returned today. Not tomorrow. Today.</p>
    <p class="reveal" style="margin-top:22px">I was born and raised right here, and I've built my business across Baton Rouge, Zachary, St. Francisville, New Roads and the Felicianas. Since 2022 that's {NUMBERS["deals"]} closed deals and {NUMBERS["volume"]} in sales, {NUMBERS["last12"]} of them in the last 12 months. Every single client came from a past client, a referral or my own sphere. I have never paid for a lead.</p>
    <p class="reveal">Faith first, family always. When you're ready to make a move, I'm already moving.</p>
    <div class="actions reveal"><a class="btn" href="about.html">Meet Caleb</a><a class="textlink" href="{TEL}">Call {PHONE_DISPLAY}</a></div>
  </div>
  <div class="portrait reveal"><img src="assets/caleb-bar-square.jpg" alt="Caleb Jackson, smiling, hands together, in a tan jacket" width="1025" height="1025" decoding="async"></div>
</div></section>

<section class="section"><div class="wrap card ink" style="display:grid;gap:18px;grid-template-columns:1fr;align-items:center">
  <h2 style="font-size:clamp(32px,4.5vw,56px)">Bring the question. Keep the number<span class="dot">.</span></h2>
  <p style="color:rgba(251,248,243,.8)">Text first, call second. Nothing here sends until you do.</p>
  <div class="actions" style="margin-top:8px"><a class="btn on-dark" href="{SMS}">Text Caleb <span class="arrow">↗</span></a><a class="btn on-dark ghost" href="{TEL}">Call {PHONE_DISPLAY}</a></div>
</div></section>
<script type="application/json" id="deals-data">{json.dumps(DEALS)}</script>
'''
    return shell("home", "Louisiana Home Brief | Caleb Jackson, Keller Williams First Choice", "Free Louisiana real estate tools that answer before they ask: payment, seller net, flood zone, and a Saturday showing plan. Caleb Jackson, Zachary and Baton Rouge.", body, "index.html")


def subhero(eyebrow, title, lead, image=None, alt=""):
    pic = f'<figure class="portrait reveal"><img src="assets/{image}" alt="{esc(alt, quote=True)}" loading="eager" decoding="async"></figure>' if image else ""
    return f'''<section class="section" style="padding-top:calc(72px + var(--section))"><div class="wrap {'grid-2 wide-left' if image else ''}">
  <div><p class="eyebrow reveal">{eyebrow}</p><h1 class="kinetic" style="font-size:clamp(40px,6.5vw,88px)">{title}</h1><p class="lead reveal" style="margin-top:22px">{lead}</p></div>{pic}
</div></section>'''


def page_payment():
    body = subhero("Buying · answer first", 'What would I pay a month<span class="period" tabindex="0">?</span>', "Slide the price, the down payment and the rate. The number updates as you move. Add Louisiana's taxes and insurance when you know them.") + f'''
<section class="section" style="padding-top:0"><div class="wrap grid-2 wide-right" data-explain-scope>
  <div>
    <div class="toggle" data-explain-toggle role="group" aria-label="How to explain this"><button type="button" data-mode="plain" aria-pressed="true">Plain</button><button type="button" data-mode="new" aria-pressed="false">I'm new to this</button></div>
    <div data-explain="plain" style="margin-top:22px;display:grid;gap:14px">
      <p>Principal and interest is the loan. Taxes, homeowners insurance, flood insurance and any HOA sit on top, and in Louisiana the insurance line is the one that surprises people.</p>
      <p>The rate here is an example. Your lender's quote is the real one. Twenty percent down avoids mortgage insurance on a conventional loan; FHA allows 3.5 percent and VA or USDA can be zero where you qualify.</p>
      <p class="small">The link in your address bar carries these inputs. Copy it and the result comes back exactly, on any phone, with no account.</p>
    </div>
    <div data-explain="new" hidden style="margin-top:22px;display:grid;gap:14px">
      <p><b>The home price</b> is what you'd pay for the house. <b>Down payment</b> is the part you pay in cash up front; the rest is the loan. <b>The rate</b> is what the bank charges each year to lend you the rest.</p>
      <p>The big number is what you'd send the bank each month for the loan alone. Real life adds property tax, homeowners insurance, and in much of Louisiana, flood insurance. Open the costs section and the number grows to include them.</p>
      <p><b>What to do with it:</b> if the big number is more than about a third of what you take home each month, slide the price down until it isn't. That is the house to go look at.</p>
    </div>
  </div>
  {payment_tool(True)}
</div></section>'''
    return shell("payment", "What would I pay a month? | Caleb Jackson", "A Louisiana mortgage payment tool that shows the answer first. Slide price, down payment and rate; add taxes, homeowners and flood insurance.", body, "payment.html")


def page_net():
    body = subhero("Selling · answer first", 'What would I walk away with<span class="period" tabindex="0">?</span>', "A possible sale price, minus your payoff, minus the costs you choose to add. Nothing is assumed, including commission.") + f'''
<section class="section" style="padding-top:0"><div class="wrap grid-2 wide-right" data-explain-scope>
  <div>
    <div class="toggle" data-explain-toggle role="group" aria-label="How to explain this"><button type="button" data-mode="plain" aria-pressed="true">Plain</button><button type="button" data-mode="new" aria-pressed="false">I'm new to this</button></div>
    <div data-explain="plain" style="margin-top:22px;display:grid;gap:14px">
      <p>Price is one number. Net is the one you live with. Start with a realistic price, subtract the payoff from your last statement, then add the selling costs you know. Commission is whatever you and Caleb agree on; the tool does not assume one.</p>
      <p>Compare three prices the way Caleb does on a listing appointment: the number you want, the number the comps support, and the number that sells in two weeks. The net on each is the real conversation.</p>
    </div>
    <div data-explain="new" hidden style="margin-top:22px;display:grid;gap:14px">
      <p><b>Sale price</b> is what a buyer pays. <b>Payoff</b> is what you still owe the bank. The difference is the starting point, and then selling costs come out of it: the agents' commission, title fees, anything you agree to fix or pay for the buyer.</p>
      <p>The big number is what you'd likely walk out of closing with. It is an estimate until the title company sends the real sheet, but it is usually close.</p>
    </div>
  </div>
  {net_tool(True)}
</div></section>'''
    return shell("net-sheet", "What would I walk away with? | Caleb Jackson", "A Louisiana seller net sheet that answers first. Sale price minus payoff minus the costs you add. Commission is never assumed.", body, "net-sheet.html")


def page_flood():
    body = subhero("Before a tour · Louisiana's first question", 'What flood zone is this<span class="period" tabindex="0">?</span>', "Type an address. The tool reads FEMA's National Flood Hazard Layer at that point and explains what the zone means for your loan, your insurance and the seller conversation.") + f'''
<section class="section" style="padding-top:0"><div class="wrap">{flood_tool()}</div></section>
<section class="section"><div class="wrap grid-2">
  <div><p class="eyebrow">Bring back these questions</p><h2 style="font-size:clamp(30px,4vw,52px)">A map is where the conversation starts<span class="dot">.</span></h2></div>
  <ol style="display:grid;gap:14px;padding-left:20px;font-size:18px">
    <li>What does the seller's disclosure say about flooding or water intrusion, including 2016?</li>
    <li>Is there an elevation certificate? If not, who is paying for one before the appraisal?</li>
    <li>What did the current owner pay for flood insurance last year, and with whom?</li>
    <li>Where does the yard drain, and where does the street drain when it rains for two days?</li>
    <li>Which parish discount applies: East Baton Rouge 20 percent, Central 25, Zachary 15?</li>
  </ol>
</div></section>
<section class="section"><div class="wrap"><details class="more"><summary>Prefer the official FEMA map viewer?</summary><p class="small" style="margin:10px 0">FEMA's Map Service Center opens in a new tab and takes about ten seconds for the FIRMette. The East Baton Rouge maps date to 2008 and 2012; the parish says FEMA underestimates some areas, which is why the seller's disclosure matters as much as the zone.</p><a class="btn ghost" href="https://msc.fema.gov/portal/search" target="_blank" rel="noopener">Open FEMA's address search</a></details></div></section>'''
    return shell("flood", "What flood zone is this? Louisiana flood check | Caleb Jackson", "Type a Louisiana address and read FEMA's flood zone for that point in seconds, with what it means for insurance and your offer.", body, "flood.html")


def page_tools():
    body = subhero("Free tools · no sign-up", 'A useful answer, without the sign-up<span class="period" tabindex="0">.</span>', "Every tool opens with a worked example already showing. Nothing asks for your email. Text Caleb the result when you want a human read.") + f'''
<section class="section" style="padding-top:0"><div class="wrap">
  <div class="tiles" style="margin-top:0">
    <a class="tile" href="payment.html"><span class="spot"></span><p class="eyebrow">Buying</p><div><div class="tile-num">$1,517<small>a month</small></div><h3>What would I pay?</h3></div><p class="small">Price, down payment, rate, then Louisiana's taxes and insurance.</p></a>
    <a class="tile" href="net-sheet.html"><span class="spot"></span><p class="eyebrow">Selling</p><div><div class="tile-num">$100,000</div><h3>What would I keep?</h3></div><p class="small">Sale price minus payoff minus the costs you choose.</p></a>
    <a class="tile" href="flood.html"><span class="spot"></span><p class="eyebrow">Before a tour</p><div><div class="tile-num">5<small>seconds</small></div><h3>What flood zone?</h3></div><p class="small">FEMA's layer, read at the address, explained in plain words.</p></a>
    <a class="tile" href="showing-plan.html"><span class="spot"></span><p class="eyebrow">The Saturday</p><div><div class="tile-num">4<small>homes</small></div><h3>Know what to ask.</h3></div><p class="small">A built Saturday on real Zachary streets, with the questions.</p></a>
    <a class="tile" href="owners-brief.html"><span class="spot"></span><p class="eyebrow">Owning</p><div><div class="tile-num">3<small>dates</small></div><h3>The owner's brief.</h3></div><p class="small">Insurance, taxes and hurricane season, dated.</p></a>
    <a class="tile" href="golf.html"><span class="spot"></span><p class="eyebrow">Living</p><div><div class="tile-num">6<small>courses</small></div><h3>Golf and water.</h3></div><p class="small">Live near where you play, with the honest tradeoffs.</p></a>
  </div>
</div></section>'''
    return shell("tools", "Free tools | Caleb Jackson", "Free Louisiana real estate tools with no sign-up: payment, net sheet, flood zone, the Saturday plan, the owner's brief.", body, "tools.html")


def page_showing():
    questions = [
        ("Cost", ["Ask how reassessment and the homestead exemption change the tax estimate.", "Get real homeowners and flood quotes before you write; roof age drives both.", "Have the lender show PMI, escrow and cash to close on one page."]),
        ("Water", ["Ask for the disclosure and any 2016 history before you fall for the porch.", "Check the FEMA zone on this site, then ask about the elevation certificate.", "Walk the lot edges. Where does the neighbor's water go?"]),
        ("Condition", ["Roof, HVAC and water heater ages, with receipts.", "Inspector on moisture, slab and drainage, not just the obvious.", "Repairs and documentation beat photos every time."]),
        ("Offer", ["Caleb pulls the comps and the days on market before you name a number.", "Inspection, appraisal and financing dates on a calendar, not in your head.", "Decide what you would give up to win, before the counter arrives."]),
    ]
    q_html = "".join(f'<div class="card blush"><h3>{t}</h3><ul style="margin:12px 0 0;padding-left:18px;display:grid;gap:8px">{"".join("<li>" + esc(i) + "</li>" for i in items)}</ul></div>' for t, items in questions)
    body = subhero("The Saturday plan", 'See the home. Know what to ask<span class="period" tabindex="0">.</span>', "A showing plan is a route, a clock, and the right question at each door. Here is a built one. Yours comes from the homes you send.") + f'''
<section class="section" style="padding-top:0"><div class="wrap">{saturday_plan()}</div></section>
<section class="section"><div class="wrap"><p class="eyebrow">The questions, by topic</p><h2 style="font-size:clamp(30px,4vw,52px)">Cost. Water. Condition. Offer<span class="dot">.</span></h2>
  <div style="display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-top:32px">{q_html}</div>
</div></section>
<section class="section"><div class="wrap card ink"><h2 style="font-size:clamp(30px,4vw,52px)">Want one built around your list<span class="dot">?</span></h2><p style="color:rgba(251,248,243,.8);margin-top:12px">Text the addresses or listing links. Caleb builds the route and the questions, and sends it back the same day. No form, no email required.</p><div class="actions"><a class="btn on-dark" href="{SMS}?&body={esc('Hey Caleb, can you build me a Saturday? Here are the homes: ')}">Text Caleb the homes <span class="arrow">↗</span></a></div></div></section>'''
    return shell("showing-plan", "The Saturday showing plan | Caleb Jackson", "A built Saturday of showings on real Zachary streets, with the question to ask at each door. Text Caleb your list for your own.", body, "showing-plan.html")


def page_brief():
    body = subhero("The owner's brief · dated", 'What a Louisiana owner needs to know this month<span class="period" tabindex="0">.</span>', "Insurance, taxes and hurricane season, with the dates that matter and the sources behind them. Checked October 7, 2026.") + f'''
<section class="section" style="padding-top:0"><div class="wrap">{countdowns()}</div></section>
<section class="section"><div class="wrap grid-2">
  <div><p class="eyebrow">Insurance</p><h2 style="font-size:clamp(30px,4vw,52px)">The renewal letter is the real estate question<span class="dot">.</span></h2></div>
  <div style="display:grid;gap:16px">
    <p>Louisiana's average homeowners rate change fell from plus 14 percent in 2023 to roughly flat so far in 2026, and the commissioner still calls it a crisis. Baton Rouge quotes range from about $2,000 to over $5,000 a year depending on the roof, the carrier and the deductible.</p>
    <p><b>Roof age is the cliff.</b> Many carriers will not write a roof older than about 15 years. If yours is close, price the replacement against the FORTIFIED discount that becomes mandatory on every policy issued or renewed from January 1, 2027. Filed discounts today run about 7 to 40 percent by carrier.</p>
    <p><b>Citizens is the backstop, not the plan.</b> The surcharge is waived through 2027, and depopulation rounds keep moving policies to private carriers; the next assumption date is December 1, 2026. If you are on Citizens, ask your agent what the private offer looks like before that date.</p>
    <p><b>The grant and the credit are different.</b> The $10,000 Fortify Homes grant lottery is closed and East Baton Rouge was never an eligible parish; parts of Livingston and Ascension were. The separate state tax credit, up to $10,000, is open to anyone.</p>
    <p class="small">Sources: Louisiana Department of Insurance Regulation 136 and the Act 533 discount report; Louisiana Citizens depopulation schedule; Insurify and LDI rate data, 2026.</p>
  </div>
</div></section>
<section class="section"><div class="wrap grid-2">
  <div><p class="eyebrow">Flood</p><h2 style="font-size:clamp(30px,4vw,52px)">The maps are from 2008. The water was in 2016<span class="dot">.</span></h2></div>
  <div style="display:grid;gap:16px">
    <p>East Baton Rouge's flood maps date to 2008 and 2012. In the 2016 flood, roughly half of the 54,611 damaged homes in the parish were outside the high-risk zone. In Denham Springs, about one in four flooded homes had a policy.</p>
    <p>FEMA's remapping of the Amite basin is expected to begin around 2027, after the Comite Diversion Canal finishes in late 2028. Until then, the zone on the map is a starting point. The seller's disclosure and a flood quote are the rest of the answer.</p>
    <p>Community Rating System discounts on NFIP policies: East Baton Rouge Class 6, 20 percent. Central Class 5, 25 percent. Zachary Class 7, 15 percent. The National Flood Insurance Program is authorized through December 11, 2026 and lapsed twice in the past year, so bind before you close.</p>
    <div class="actions"><a class="btn" href="flood.html">Check an address now</a></div>
  </div>
</div></section>
<section class="section"><div class="wrap grid-2">
  <div><p class="eyebrow">Property tax</p><h2 style="font-size:clamp(30px,4vw,52px)">Fifteen days a year to argue<span class="dot">.</span></h2></div>
  <div style="display:grid;gap:16px">
    <p>The homestead exemption covers the first $75,000 of market value on parish taxes only, not city taxes or the fire and crime fees. The assessor opens the rolls for 15 days between August 15 and September 15, published in the Advocate. The Metro Council sits as the Board of Review, and a Louisiana Tax Commission appeal must follow within 30 days.</p>
    <p>The last reassessment was 2024; the next is expected in 2028. On the November 3, 2026 ballot: a senior add-on exemption effective 2028, a higher income cap for the senior freeze, and a millage rollback measure.</p>
    <p>Central's school millage is 55.69 mills for 2026. Zachary voters passed a 24-mill redirect in June 2026 after it failed in November 2025. If you are comparing the two, the millage and the school scores are both real numbers, and both change.</p>
  </div>
</div></section>
<section class="section"><div class="wrap grid-2">
  <div><p class="eyebrow">Hurricane season</p><h2 style="font-size:clamp(30px,4vw,52px)">Here it is wind, trees and power<span class="dot">.</span></h2></div>
  <div style="display:grid;gap:16px">
    <p>Baton Rouge does not get surge. It gets Gustav, 2008, with parts of the parish dark for up to six weeks, and Ida, 2021, with more than 100,000 Entergy customers out. Ask about the roof, the trees over the house, and whether the panel can take a generator interlock.</p>
    <p>Before a storm: photograph every room, know your named-storm deductible as a dollar figure, and keep the policy numbers somewhere that is not the house.</p>
    <p class="small">Zachary Community Schools scored 94.3 on the 2025 state performance score, an A. West Feliciana scored 97.7, first in the state. District boundaries extend beyond city limits, and there is no official address lookup; call the district at (225) 658-4969 with the address.</p>
  </div>
</div></section>'''
    return shell("owners-brief", "The owner's brief: Louisiana insurance, flood, taxes, hurricanes | Caleb Jackson", "The dates and facts a Louisiana homeowner needs this month: NFIP deadline, FORTIFIED discounts, open rolls, hurricane season. Checked October 2026.", body, "owners-brief.html")


def page_about():
    body = subhero("Baton Rouge born · Keller Williams First Choice", 'Action Jackson. A person, first<span class="period" tabindex="0">.</span>', "They call me Action Jackson, and it isn't marketing. It's how I work. Your call gets returned today. Not tomorrow. Today.", "caleb-portrait-approved.jpg", "Caleb Jackson, smiling, in a tan jacket at a wooden bar") + f'''
<section class="section" style="padding-top:0"><div class="wrap grid-2">
  <div style="display:grid;gap:16px">
    <p>I was born and raised right here, and I've built my business across Baton Rouge, Zachary, St. Francisville, New Roads and the Felicianas. Since 2022 that's {NUMBERS["deals"]} closed deals and {NUMBERS["volume"]} in sales, {NUMBERS["last12"]} of them in the last 12 months, and the number I'm proudest of isn't on a billboard. Every single client I've ever worked with came from my sphere, a past client or a referral. I have never paid for a lead. Not once.</p>
    <p>This market moves fast when it's run right. Priced straight, marketed hard, negotiated harder. "Listed Tuesday, under contract Friday" isn't a slogan around here. Some weeks it's just a Tuesday.</p>
    <p class="quote">Faith first, family always.</p>
    <p>When you're ready to make a move, I'm already moving.</p>
    <p class="small">Caleb Jackson, REALTOR, Keller Williams First Choice. {PHONE_DISPLAY}. aire@calebjackson.org. @calebjacksonla.</p>
  </div>
  <div class="card blush"><p class="eyebrow">By the numbers</p>
    <div style="display:grid;gap:18px">
      <div class="bignum"><span data-ticker="{NUMBERS["deals"]}">0</span><small>closed deals since 2022</small></div>
      <div class="bignum"><span data-ticker="25.1" data-prefix="$" data-suffix="M">0</span><small>in sales</small></div>
      <div class="bignum"><span data-ticker="{NUMBERS["last12"]}">0</span><small>in the last 12 months</small></div>
      <div class="bignum"><span data-ticker="{NUMBERS["zachary"]}">0</span><small>in Zachary, across 13 neighborhoods</small></div>
    </div>
    <p class="small" style="margin-top:16px">MLS export of October 7, 2026, deduplicated by MLS number, plus four off-market deals. User-confirmed, not independently audited. One of the 81 was a 32-unit apartment property in St. Francisville.</p>
  </div>
</div></section>
<section class="section"><div class="wrap">
  <p class="eyebrow reveal">The map is the resume</p>
  <h2 class="reveal">Every dot is a closing<span class="dot">.</span></h2>
  <div class="map-legend reveal" data-city-counts style="margin:18px 0 24px"></div>
  <div class="map-wrap reveal" data-deal-map></div>
  <p class="small" style="margin-top:12px">Dots sit by city, not by lot. Coral is Zachary. Larger dots are larger sales.</p>
</div></section>
<script type="application/json" id="deals-data">{json.dumps(DEALS)}</script>'''
    return shell("about", "About Caleb Jackson, REALTOR, Keller Williams First Choice", "Caleb Jackson, Action Jackson. Baton Rouge born, 81 deals and $25.1M since 2022, every one by referral. Zachary, Baton Rouge, St. Francisville and the Felicianas.", body, "about.html")


def page_golf():
    courses = [
        ("Copper Mill Golf Club", "Zachary", "Public", "The neighborhood Caleb has closed in most often. Golf-cart streets, newer construction, HOA.", "copper-mill"),
        ("Beaver Creek Golf Club", "Zachary", "Public", "Parish course on the north side. Acreage and older homes nearby, no HOA in most of it.", "beaver-creek"),
        ("The Bluffs on Thompson Creek", "St. Francisville", "Private, Arnold Palmer design", "Lake lots and the Feliciana hills. Thirty minutes from Zachary on Highway 61.", "bluffs"),
        ("Santa Maria Golf Course", "Baton Rouge", "Public, Robert Trent Jones Jr.", "Southeast Baton Rouge. Established family neighborhood around it.", "santa-maria"),
        ("University Club", "Baton Rouge", "Private", "Gated, newer luxury construction, the long commute north if you work in Zachary.", "university-club"),
        ("Carter Plantation", "Springfield", "Public, David Toms design", "Across the Amite in Livingston Parish. A different parish for taxes and schools.", "carter"),
    ]
    rows = "".join(f'<a href="{SMS}?&body={esc("Hey Caleb, what does living near " + n + " actually cost?")}" data-img="assets/pool-dusk.jpg"><span>{esc(n)}<span class="meta" style="display:block;margin-top:4px">{esc(c)} · {esc(k)}</span></span><span class="meta">{esc(d)}</span></a>' for n, c, k, d, _ in courses)
    body = subhero("Living · golf and water", 'Live near where you play<span class="period" tabindex="0">.</span>', "Six courses within an easy drive of Zachary, with what the neighborhoods around them actually trade like. Tap a course to ask Caleb what it costs to live there.", "pool-dusk.jpg", "A pool at dusk behind a Louisiana home, string lights on") + f'''
<section class="section" style="padding-top:0"><div class="wrap">
  <div class="list-reveal">{rows}</div>
  <p class="small" style="margin-top:16px">Membership, hours and HOA rules change. Confirm before you drive. Price ranges come from the MLS when you ask; nothing here is invented.</p>
</div></section>
<section class="section"><div class="wrap grid-2">
  <div><p class="eyebrow">Water</p><h2 style="font-size:clamp(30px,4vw,52px)">False River, Thompson Creek, the Comite<span class="dot">.</span></h2></div>
  <div style="display:grid;gap:16px"><p>False River in New Roads is a ten-mile oxbow lake with camps and full-time homes on both sides, forty minutes from Zachary across the Audubon Bridge. Thompson Creek runs the Feliciana line below the Bluffs. The Comite is the river Zachary drains to, and the diversion canal finishing in 2028 is the biggest change to north Baton Rouge flooding in a generation.</p><p>Water-adjacent is where the flood tool earns its keep. Check the zone before you fall for the view.</p><div class="actions"><a class="btn" href="flood.html">Check a waterfront address</a></div></div>
</div></section>
<div class="follower" aria-hidden="true"><img src="assets/pool-dusk.jpg" alt=""></div>'''
    return shell("golf", "Golf and water near Zachary and Baton Rouge | Caleb Jackson", "Six golf courses and the lakes and creeks around Zachary, St. Francisville and Baton Rouge, with the honest tradeoffs of living near each.", body, "golf.html")


def page_lessons():
    lessons = [
        ("2026-09-30", "Zachary · Copper Mill", "Why a contract got re-papered twice in one week", "The buyer's lender switched title companies so the seller could close back to back on their next house. Two addenda, one re-sent deposit confirmation, and a closing that held. The lesson: a seller who is also buying needs the timeline on paper on day one, not when the lender asks."),
        ("2026-09-16", "St. Francisville · Basil Lane", "The 72 hours that belong to the buyer", "An inspection response reached the buyer three days late, and the buyer's side correctly asked for the full response window back. On a $1.75M listing the calendar is the contract. We reset the dates and kept the deal. If a document is late, say so first and give the time back before anyone asks."),
        ("2026-07-20", "Zachary · East Spanish Trail", "The painter who ended a deal, and why that was right", "A buyer brought a painter to a showing. He noticed wet areas along a wall the photos did not show. The buyers cancelled, and they were right to. Bring a tradesperson to a second showing. It is cheaper than an inspection and faster than regret."),
        ("2026-03-27", "Zachary · Ravenwood", "Listed at $235,000. Sold at $210,000. What the gap means", "A Ravenwood house sat until the price met the comps, then sold for cash in sixteen days. The first price was a hope; the second was the market. The seller netted more by cutting once, early, than by chasing the market down a thousand at a time."),
    ]
    html = "".join(f'<article class="lesson reveal"><time datetime="{d}">{d}</time><h3>{esc(t)}</h3><p class="where">{esc(w)}</p><p>{esc(b)}</p></article>' for d, w, t, b in lessons)
    body = subhero("Field notes · dated", 'One lesson a week, from a real deal<span class="period" tabindex="0">.</span>', "Not market hype. What actually happened on a Louisiana transaction and what it taught. Names left out, lessons kept.") + f'''<section class="section" style="padding-top:0"><div class="wrap">{html}</div></section>'''
    return shell("lessons", "Field notes: lessons from real Louisiana deals | Caleb Jackson", "Dated lessons from real transactions in Zachary, St. Francisville and Baton Rouge: price adjustments, inspections, timelines.", body, "lessons.html")


def page_contact():
    body = subhero("Contact", 'Text first. Call second<span class="period" tabindex="0">.</span>', "Nothing on this site sends until you tap send. Text the address or the question and Caleb answers the same day.") + f'''
<section class="section" style="padding-top:0"><div class="wrap grid-2">
  <div class="card ink" style="display:grid;gap:16px">
    <div class="actions" style="margin:0"><a class="btn on-dark" href="{SMS}">Text Caleb <span class="arrow">↗</span></a><a class="btn on-dark ghost" href="{TEL}">Call {PHONE_DISPLAY}</a></div>
    <p style="color:rgba(251,248,243,.8)">Email, if you prefer: <a href="mailto:aire@calebjackson.org">aire@calebjackson.org</a></p>
    <p style="color:rgba(251,248,243,.8)">Instagram: <a href="https://instagram.com/calebjacksonla" rel="noopener">@calebjacksonla</a></p>
  </div>
  <div style="display:grid;gap:14px">
    <p class="eyebrow">Office</p><p><b>Keller Williams First Choice</b><br>17111 Commerce Centre Drive<br>Prairieville, LA 70769</p>
    <p class="eyebrow" style="margin-top:12px">A useful first message</p><p class="small">The address or listing link, whether you're buying or selling, and when you hope to move. That's enough for Caleb to come back with something real.</p>
  </div>
</div></section>'''
    return shell("contact", "Contact Caleb Jackson | Keller Williams First Choice", "Text or call Caleb Jackson, REALTOR with Keller Williams First Choice, Prairieville and Zachary, Louisiana.", body, "contact.html")


PAGES = {"index.html": home, "payment.html": page_payment, "net-sheet.html": page_net, "flood.html": page_flood, "tools.html": page_tools, "showing-plan.html": page_showing, "owners-brief.html": page_brief, "about.html": page_about, "golf.html": page_golf, "lessons.html": page_lessons, "contact.html": page_contact}

if __name__ == "__main__":
    for name, fn in PAGES.items():
        (ROOT / name).write_text(fn(), encoding="utf-8")
    print(json.dumps({"built": list(PAGES)}))
