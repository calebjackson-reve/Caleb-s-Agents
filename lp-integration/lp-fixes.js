/* SEO fixes for the live Luxury Presence site, from the 2026-10-29 audit
   (audits/2026-10-29/seo-audit.md). Loaded sitewide like lp-motion.js.
   Client-side only: Google indexes the rendered DOM, so these count for
   search, but the server-side 301s and IDX template fixes still belong
   to LP support (lp-integration/SUPPORT-CASES-SEO.md). */
(() => {
  if (window.__cjSeoFixesMounted) return;
  window.__cjSeoFixesMounted = true;

  const MOVED = { '/profile': '/about', '/contact-us': '/contact' };

  // 1. If LP serves its 404 page on a moved path, forward the visitor.
  const here = location.pathname.replace(/\/+$/, '') || '/';
  if (MOVED[here]) { location.replace(MOVED[here]); return; }

  const fix = () => {
    // 2. Rewrite links that point at the two dead paths, and drop anchors
    //    that leaked raw template slugs like /blog/{{slug}} into the DOM.
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || '';
      const path = href.replace(/[?#].*$/, '').replace(/\/+$/, '');
      if (MOVED[path]) a.setAttribute('href', MOVED[path]);
      else if (href.includes('{{')) a.removeAttribute('href');
    });

    // 3. One H1 per page: demote the boilerplate duplicates (the logo and
    //    the "Find your place." tagline) to h2 wherever a real H1 exists.
    const BOILER = /^(caleb jackson\s*real estate\.?|find your place\.?)$/i;
    const h1s = [...document.querySelectorAll('h1')];
    if (h1s.length > 1) {
      const keep = h1s.find(h => !BOILER.test(h.textContent.replace(/\s+/g, ' ').trim())) || h1s[0];
      h1s.forEach(h => {
        if (h === keep) return;
        const h2 = document.createElement('h2');
        for (const { name, value } of h.attributes) h2.setAttribute(name, value);
        h2.innerHTML = h.innerHTML;
        h.replaceWith(h2);
      });
    }

    // 4. Property pages: titles like "16436 Spanish Ct" become
    //    "16436 Spanish Ct, Greenwell Springs LA 70739 | Home for Sale | Caleb Jackson".
    if (/^\/properties\/./.test(location.pathname) && !/caleb jackson/i.test(document.title)) {
      // The listing schema has no address block (checked 2026-10-29), but the
      // slug does: /properties/<street>-<city>-la-us-<zip>-<mls>. The title is
      // the street, so the city is the slug between the street and "la-us".
      const street = document.title.trim();
      const parts = [street];
      const m = location.pathname.match(/\/properties\/(.+)-la-us-(\d{5})-\d+$/);
      if (m) {
        const slugify = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const rest = m[1].replace(new RegExp('^' + slugify(street) + '-?'), '');
        const city = rest.split('-').filter(Boolean)
          .map(w => w === 'st' ? 'St.' : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (city && rest !== m[1]) parts.push(city + ' LA ' + m[2]);
      }
      document.title = parts.join(', ') + ' | Home for Sale | Caleb Jackson';
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fix);
  else fix();
  // LP injects sections after load; run once more when the page settles.
  window.addEventListener('load', () => setTimeout(fix, 1500));
})();
