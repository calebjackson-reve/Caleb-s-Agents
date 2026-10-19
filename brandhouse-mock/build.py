#!/usr/bin/env python3
"""Builds the Brandhouse mock pages from shared header/footer. Run: python3 build.py"""
import os
HERE=os.path.dirname(os.path.abspath(__file__))
LOGO='''<svg viewBox="0 0 44 52" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M3 3h12l12 46H15z"/><path d="M19 3h22L29 49"/></svg>'''
NAV=[("Work","work.html"),("Reel","index.html#reel"),("Studio","index.html#studio"),("Services","about.html#services"),("About","about.html"),("Contact","contact.html"),("Book a Shoot","contact.html"),("Instagram","https://instagram.com","ext")]

def head(title,page):
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title} - Brandhouse</title>
<meta name="description" content="Brandhouse is the studio of videographer Tyler Boyle. Brand films, commercials, weddings and documentary work. Mock site with sample content.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap">
<link rel="stylesheet" href="styles.css">
</head>
<body data-page="{page}">
<a class="skip" href="#main">Skip to content</a>
<header class="hdr wrap">
  <a class="logo" href="index.html" aria-label="Brandhouse home">{LOGO}</a>
  <div class="hdr-right">
    <a class="donate" href="contact.html">Book a Shoot</a>
    <button class="menu-btn" id="menuOpen" aria-expanded="false" aria-controls="menu"><span class="bars"><i></i><i></i></span>Menu</button>
  </div>
</header>
<div class="menu" id="menu" data-open="false" aria-hidden="true">
  <div class="menu-top"><a class="logo" href="index.html" aria-label="Brandhouse home">{LOGO}</a><button class="menu-close" id="menuClose">&times; Menu</button></div>
  <nav aria-label="Main">
    <a href="work.html">Work</a><a href="index.html#reel">Reel</a><a href="index.html#studio">Studio</a><a href="about.html#services">Services</a><a href="about.html">About</a><a href="contact.html">Contact</a><a href="contact.html">Book a Shoot</a><a class="ext" href="https://instagram.com">Instagram</a>
  </nav>
  <div class="menu-foot"><a href="https://instagram.com">Instagram</a><a href="https://vimeo.com">Vimeo</a><a href="https://youtube.com">YouTube</a><a href="contact.html">Newsletter</a></div>
</div>
<main id="main">
'''

FOOT='''</main>
<footer class="foot wrap">
  <div class="foot-grid">
    <ul><li><a href="work.html">Work</a></li><li><a href="index.html#reel">Reel</a></li><li><a href="index.html#studio">Studio</a></li><li><a class="ext" href="https://vimeo.com">Vimeo</a></li></ul>
    <ul><li><a href="about.html#services">Services</a></li><li><a href="about.html#kit">Gear</a></li><li><a href="about.html">About</a></li><li><a href="contact.html">Contact</a></li><li><a href="contact.html">Book a Shoot</a></li><li><a href="about.html">Careers</a></li></ul>
    <ul><li><a href="https://instagram.com">Instagram</a></li><li><a href="https://youtube.com">YouTube</a></li><li style="margin-top:12px"><a href="contact.html">Newsletter</a></li></ul>
    <a class="circle" href="contact.html"><span>Book</span></a>
  </div>
  <div class="foot-bottom"><span>&copy; 2026 - Brandhouse. Tyler Boyle.</span><span>Mock site. Sample images and footage.</span><span>Privacy Policy</span><span></span></div>
</footer>
<script>
(function(){
  var m=document.getElementById('menu'),o=document.getElementById('menuOpen'),c=document.getElementById('menuClose');
  function set(v){m.dataset.open=v;m.setAttribute('aria-hidden',!v);o.setAttribute('aria-expanded',v);document.body.style.overflow=v?'hidden':'';}
  o.addEventListener('click',function(){set(true)});c.addEventListener('click',function(){set(false)});
  m.querySelectorAll('nav a').forEach(function(a){a.addEventListener('click',function(){set(false)})});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')set(false)});
  document.querySelectorAll('.slide[data-video]').forEach(function(s){
    s.addEventListener('click',function(){var v=s.querySelector('video');if(!v)return;if(v.paused){v.play();s.classList.add('playing')}else{v.pause();s.classList.remove('playing')}});
  });
})();
</script>
</body>
</html>
'''

def slide(img,title,tag,video=None,cls=""):
    media=f'<video src="{video}" muted loop playsinline preload="metadata" poster="{img}"></video>' if video else f'<img src="{img}" alt="">'
    play='<div class="play"><b>&#9654;</b></div>' if video else ''
    cap=f'<div class="cap"><span class="tag">{tag}</span><h3>{title}</h3></div>' if title else ''
    return f'<div class="slide {cls}" {"data-video" if video else ""}>{media}{play}{cap}</div>'

INDEX=head("Home","home")+f'''
<section class="wrap ptitle"><h1>Brandhouse</h1></section>
<section class="band hero-band" aria-label="Showreel">
  <div class="slider">
    {slide("assets/still-03.jpg","","",None,"pad")}
    {slide("assets/still-01.jpg","Golden Hour, Baton Rouge","Wedding film","assets/reel-01.mp4")}
    {slide("assets/still-02.jpg","Night Shift","Commercial","assets/reel-02.mp4")}
    {slide("assets/still-04.jpg","Gulf Light","Documentary","assets/reel-04.mp4")}
    {slide("assets/still-07.jpg","","",None,"pad")}
  </div>
</section>
<section class="wrap statement">
  <p class="big">Brandhouse is the studio of videographer Tyler Boyle. We make brand films, commercials, wedding films and documentary work that people actually finish watching. Story first, then the gear.</p>
  <div class="side"><img src="assets/still-10.jpg" alt="Sample still from a portrait session"><a class="ul" href="about.html">About</a></div>
</section>

<section class="wrap shead"><h2>Work</h2><a class="ul" href="work.html">All of the work</a></section>
<section class="feature">
  <div class="band" style="padding-block:0;background:transparent"><div class="slider wrap" style="gap:10px">
    {slide("assets/still-06.jpg","","",None,"")}
    {slide("assets/still-02.jpg","","",None,"sm")}
    {slide("assets/still-08.jpg","","",None,"xs")}
  </div></div>
  <div class="wrap" style="padding-top:10px"><div class="black" style="display:grid;grid-template-columns:1fr 1fr;gap:28px" id="featured">
    <div style="display:grid;gap:20px;align-content:start"><span class="tag">Commercial, Automotive</span><h3>Long Road Home</h3></div>
    <div class="body">
      <div class="meta"><div><span>Tyler Boyle</span><span>2026 (Louisiana)</span></div><div><span>English, with on-screen text</span><span>2 min 10</span></div></div>
      <p>A sixty-second spot and a two-minute cut for a regional truck dealer, shot over one evening on Highway 1. Practical lighting, one picture car, no drone. The brief was simple: make the drive home feel like the best part of the day.</p>
      <a class="ul" href="film.html">Learn more</a>
    </div>
  </div></div>
</section>

<section class="wrap shead"><h2>Projects</h2><a class="ul" href="work.html">View all</a></section>
<section class="wrap proj">
  <div class="rail"></div>
  <div class="col">
    <a class="tile" href="film.html"><img src="assets/still-05.jpg" alt=""><div class="txt"><span class="tag">Interview</span><h3>Founders, in their own words</h3></div></a>
    <a class="tile" href="film.html"><img src="assets/still-07.jpg" alt=""><div class="txt"><span class="tag">Live event</span><h3>Riverfront Fest 2026</h3></div></a>
    <a class="tile" href="film.html"><img src="assets/still-04.jpg" alt=""><div class="txt"><span class="tag">Aerial</span><h3>Gulf Light</h3></div></a>
  </div>
  <div class="col">
    <a class="tile wide" href="film.html"><img src="assets/still-09.jpg" alt=""><div class="txt"><span class="tag">Real estate</span><h3>Twilight walkthrough, Garden District</h3></div></a>
    <a class="tile wide" href="film.html"><img src="assets/still-08.jpg" alt=""><div class="txt"><span class="tag">Food and beverage</span><h3>Sunday service at Marigny Kitchen</h3></div></a>
    <a class="tile wide" href="film.html"><img src="assets/still-03.jpg" alt=""><div class="txt"><span class="tag">Product</span><h3>Studio tabletop, 48 hours</h3></div></a>
  </div>
</section>

<section class="wrap reel" id="reel">
  <h2 class="head"><span class="ul">Reel</span> 2026, the year in ninety seconds</h2>
  <div class="copy"><p>Every project we shipped this year, cut to one track. Brand films, weddings, two documentaries and a lot of trucks. If you only watch one thing on this site, watch this.</p><a class="ul ext" href="https://vimeo.com">See more</a></div>
  <div class="over slide" data-video><video src="assets/reel-03.mp4" muted loop playsinline preload="metadata" poster="assets/still-07.jpg"></video><div class="play"><b>&#9654;</b></div></div>
</section>

<section class="wrap" id="studio"><div class="photo-band"><img src="assets/still-05.jpg" alt="">
  <div class="l"><h2>Studio</h2><p>A 1,200 square foot stage in Baton Rouge with a cyc wall, a tungsten and LED package, and a colour suite. Available for hire when we are not using it.</p></div>
  <a class="ul" href="about.html#services">Learn more</a>
</div></section>

<section class="wrap ctas">
  <a class="cta" href="contact.html"><h2>Book a Shoot</h2></a>
  <a class="cta" href="about.html#services"><h2>Services and Rates</h2></a>
</section>
'''+FOOT

def wcard(img,tag,title,who,year,lang,dur,cat,video=None):
    media=f'<video src="{video}" muted loop playsinline autoplay poster="{img}"></video>' if video else f'<img src="{img}" alt="">'
    return f'''<article class="work-card" data-type="{cat}" data-year="{year}">
  <div class="thumb">{media}</div>
  <div class="info"><span class="tag">{tag}</span><h3>{title}</h3>
    <div class="meta"><div><span>{who}</span><span>{year} (Louisiana)</span></div><div><span>{lang}</span><span>{dur}</span></div></div>
    <a class="ul" href="film.html">See more</a></div></article>'''

WORKJS='''<script>
(function(){var t=document.getElementById('fType'),y=document.getElementById('fYear');function f(){document.querySelectorAll('.work-card').forEach(function(c){var ok=(!t.value||c.dataset.type===t.value)&&(!y.value||c.dataset.year===y.value);c.hidden=!ok;});}t.addEventListener('change',f);y.addEventListener('change',f);})();
</script>
'''
WORK=head("Work","work")+f'''
<section class="work-top wrap">
  <div class="row">
    <div style="display:grid;gap:22px"><h1>Work</h1><a class="btn" href="contact.html">Book a shoot <span>&#8599;</span></a></div>
    <div class="filters">
      <div class="sel">
        <select id="fType" aria-label="Type"><option value="">Type</option><option>Commercial</option><option>Wedding</option><option>Documentary</option><option>Real estate</option><option>Event</option><option>Product</option></select>
        <select id="fYear" aria-label="Year"><option value="">Year</option><option>2026</option><option>2025</option><option>2024</option></select>
        <select aria-label="Duration"><option value="">Duration</option><option>Under 1 min</option><option>1 to 3 min</option><option>Over 3 min</option></select>
      </div>
      <p>Brandhouse takes on work where the story is clear and the client wants it told well. Commercial, wedding, documentary and real estate films are the bulk of the slate. Everything below is sample content for this mock.</p>
    </div>
  </div>
</section>
<section class="work-grid wrap" id="grid">
{wcard("assets/still-06.jpg","Commercial, Automotive","Long Road Home","Tyler Boyle","2026","English","2 min 10","Commercial","assets/reel-01.mp4")}
{wcard("assets/still-01.jpg","Wedding, Short film","Golden Hour, Baton Rouge","Tyler Boyle","2026","No dialogue","4 min 30","Wedding")}
{wcard("assets/still-04.jpg","Documentary, Aerial","Gulf Light","Tyler Boyle","2025","English with subtitles","12 min","Documentary","assets/reel-04.mp4")}
{wcard("assets/still-09.jpg","Real estate","Twilight walkthrough, Garden District","Tyler Boyle","2026","No dialogue","1 min 40","Real estate")}
{wcard("assets/still-07.jpg","Event, Live","Riverfront Fest 2026","Tyler Boyle","2026","Live audio","3 min","Event","assets/reel-02.mp4")}
{wcard("assets/still-02.jpg","Commercial, Night","Night Shift","Tyler Boyle","2025","English","45 sec","Commercial")}
{wcard("assets/still-08.jpg","Food and beverage","Sunday service at Marigny Kitchen","Tyler Boyle","2024","Ambient","1 min 20","Commercial")}
{wcard("assets/still-03.jpg","Product, Studio","Studio tabletop, 48 hours","Tyler Boyle","2025","No dialogue","30 sec","Product","assets/reel-03.mp4")}
{wcard("assets/still-05.jpg","Interview","Founders, in their own words","Tyler Boyle","2024","English","8 min","Documentary")}
{wcard("assets/still-10.jpg","Portrait, Short","Overcast","Tyler Boyle","2024","No dialogue","1 min","Wedding")}
</section>
'''+WORKJS+'''
'''+FOOT

ABOUT=head("About","about")+f'''
<section class="wrap ptitle"><h1>About</h1></section>
<section class="band" aria-label="Studio footage"><div class="slider">
  {slide("assets/still-03.jpg","","",None,"pad")}
  {slide("assets/tyler.jpg","Tyler Boyle, on set","Behind the scenes","assets/reel-03.mp4")}
  {slide("assets/still-05.jpg","","",None,"pad")}
</div></section>
<section class="wrap about-grid">
  <p class="big">Founded in 2019, Brandhouse is a one-director video studio run by Tyler Boyle, making brand films, commercials, wedding films and documentary work across Louisiana and the Gulf Coast.</p>
  <img class="im-r" src="assets/still-04.jpg" alt="">
  <img class="im-l" src="assets/still-01.jpg" alt="">
</section>
<section class="wrap about-sec"><span class="lab">Mission</span>
  <div class="txt"><p>Brandhouse exists to make video that earns attention instead of buying it. Tyler directs, shoots and edits most projects himself, with a small bench of trusted crew for bigger days. That keeps the voice consistent from first call to final export.</p><p>We work with businesses who have a real story and couples who want a film they will still watch in twenty years. If a project needs a drone, a crane, or a second unit, we bring it. If it needs one camera and good light, we bring that instead.</p></div>
  <img src="assets/still-06.jpg" alt="">
</section>
<section class="wrap about-sec" id="services"><span class="lab">Services</span>
  <div class="txt"><p><b>Brand films and commercials.</b> Concept, script, production and post. Thirty-second spots up to three-minute films, delivered in every aspect ratio you need.</p><p><b>Wedding films.</b> Highlight films from four to eight minutes, plus full ceremony and speeches. Two shooters on request.</p><p><b>Documentary and interview.</b> Founder stories, nonprofit campaigns, long-form interviews lit and recorded properly.</p><p><b>Real estate and architecture.</b> Twilight walkthroughs, aerials and agent intros. Fast turnaround for listings.</p><p><b>Studio hire.</b> The stage, lighting package and colour suite are available by the half day.</p></div>
  <div class="kit"><div><b>Brand film</b><span>From $4,500</span></div><div><b>Commercial spot</b><span>From $3,000</span></div><div><b>Wedding film</b><span>From $3,800</span></div><div><b>Documentary day</b><span>From $1,800 per day</span></div><div><b>Real estate</b><span>From $650</span></div><div><b>Studio hire</b><span>$400 per half day</span></div><div><b>Sample rates</b><span>Placeholder numbers for this mock</span></div></div>
</section>
<section class="wrap about-sec" id="kit"><span class="lab">Gear</span>
  <div class="txt"><p>Everything is owned, not rented, so a shoot never waits on a rental house. Full list on request.</p></div>
  <div class="kit"><div><b>Cameras</b><span>Sony FX6, Sony FX3, RED Komodo 6K</span></div><div><b>Lenses</b><span>Sigma Cine primes 24 to 85, Sony G Master zooms</span></div><div><b>Movement</b><span>DJI RS 4 Pro, slider, 12 foot jib</span></div><div><b>Aerial</b><span>DJI Mavic 3 Pro, Part 107 certified</span></div><div><b>Lighting</b><span>Aputure 600d, 300x, Nova P300c, tungsten kit</span></div><div><b>Audio</b><span>Sennheiser MKH 416, DJI Mic 2, Zoom F6</span></div><div><b>Post</b><span>DaVinci Resolve Studio, colour calibrated suite</span></div></div>
</section>
<section class="wrap ctas"><a class="cta" href="contact.html"><h2>Book a Shoot</h2></a><a class="cta" href="work.html"><h2>See the Work</h2></a></section>
'''+FOOT

CONTACT=head("Contact Us","contact")+'''
<section class="contact-hero wrap"><img src="assets/still-08.jpg" alt=""><h1 class="ptitle">Contact Us</h1></section>
<section class="wrap contact-grid">
  <div class="contact-card">
    <span class="tag">Contact us</span>
    <h2>2210 Government St<br>Baton Rouge, Louisiana<br>70806</h2>
    <div class="meta">
      <div><span><code id="ph">225 555 0148</code> <button type="button" data-copy="ph">copy</button></span><span><code id="em">hello@brandhouse.film</code> <button type="button" data-copy="em">copy</button></span></div>
      <div><span>Monday to Friday</span><span>9h to 18h</span></div>
    </div>
    <p>Brandhouse books eight to ten weeks out for weddings and two to three weeks for commercial work. Rush dates are sometimes possible, ask.</p>
    <p>Studio visits by appointment. Street parking out front, loading dock in the rear.</p>
    <p id="copied" style="font-size:.78rem;min-height:1em"></p>
  </div>
  <form class="form" id="contactForm" novalidate>
    <h2>Contact us</h2>
    <div class="f2"><div class="fld"><input id="fn" required autocomplete="given-name"><label for="fn">First name *</label></div><div class="fld"><input id="ln" required autocomplete="family-name"><label for="ln">Last name *</label></div></div>
    <div class="fld"><input id="email" type="email" required autocomplete="email"><label for="email">Email address *</label></div>
    <div class="fld"><input id="phone" type="tel" autocomplete="tel"><label for="phone">Phone</label></div>
    <div class="fld"><select id="subject" required><option value="">Choose</option><option>Brand film or commercial</option><option>Wedding film</option><option>Documentary</option><option>Real estate</option><option>Studio hire</option><option>Something else</option></select><label for="subject">Subject *</label></div>
    <div class="fld"><textarea id="msg" required></textarea><label for="msg">Message *</label></div>
    <button class="send" type="submit"><span>Send</span><span>&#10140;</span></button>
    <p class="ok" id="ok" data-show="false">Thanks. This is a mock site, so nothing was sent, but on the real site Tyler would get this and reply within two business days.</p>
  </form>
</section>
<script>
(function(){
  var f=document.getElementById('contactForm');f.addEventListener('submit',function(e){e.preventDefault();if(!f.checkValidity()){f.reportValidity();return;}document.getElementById('ok').dataset.show='true';});
  document.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',function(){var t=document.getElementById(b.dataset.copy).textContent;var s=document.getElementById('copied');function sel(){var r=document.createRange();r.selectNodeContents(document.getElementById(b.dataset.copy));var g=getSelection();g.removeAllRanges();g.addRange(r);s.textContent='Select and copy the text above.';}
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){s.textContent='Copied '+t;},sel);}else sel();});});
})();
</script>
'''+FOOT

FILM=head("Long Road Home","film")+'''
<section class="film-hero wrap">
  <span class="tag">Commercial, Automotive</span>
  <h1>Long Road Home</h1>
  <div class="meta"><div><span>Directed by</span><span>Tyler Boyle</span></div><div><span>Client</span><span>Bayou Trucks (sample)</span></div><div><span>Year</span><span>2026 (Louisiana)</span></div><div><span>Runtime</span><span>2 min 10, and a 60 sec cut</span></div></div>
</section>
<section class="band" style="padding-block:0"><div class="wrap"><div class="slide" data-video style="width:100%;aspect-ratio:16/9"><video src="assets/reel-01.mp4" muted loop playsinline preload="metadata" poster="assets/still-06.jpg"></video><div class="play"><b>&#9654;</b></div></div></div></section>
<section class="wrap film-body">
  <div class="txt">
    <p>A sixty-second spot and a two-minute cut for a regional truck dealer, shot over one evening on Highway 1. Practical lighting, one picture car and a chase vehicle. The brief was simple: make the drive home feel like the best part of the day.</p>
    <p>We scouted three stretches of road and picked the one with the longest clean horizon. Sunset gave us twenty-two usable minutes, so every setup was rehearsed in daylight first. Sound was recorded in the cab with two lavs and a 416 on the dash.</p>
    <p>Delivered in 16:9, 9:16 and 1:1 with a broadcast-safe mix and a social mix. The 60 second cut ran on local TV for six weeks. Sample copy for this mock.</p>
    <a class="ul" href="work.html">Back to work</a>
  </div>
  <div class="stills"><img src="assets/still-06.jpg" alt=""><img src="assets/still-02.jpg" alt=""><img src="assets/still-01.jpg" alt=""></div>
</section>
<section class="wrap ctas"><a class="cta" href="contact.html"><h2>Book a Shoot</h2></a><a class="cta" href="work.html"><h2>More Work</h2></a></section>
'''+FOOT

for name,html in [("index.html",INDEX),("work.html",WORK),("about.html",ABOUT),("contact.html",CONTACT),("film.html",FILM)]:
    open(os.path.join(HERE,name),"w").write(html)
print("built")
