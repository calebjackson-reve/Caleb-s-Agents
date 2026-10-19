// Shared: dismiss cookie banners and promo popups without changing page state.
export async function dismissOverlays(page) {
  const before = { url: page.url(), h: await page.evaluate(() => (document.scrollingElement || document.documentElement).scrollHeight) };
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(400);
  for (const sel of ['a:has-text("ACCEPT")', 'button:has-text("ACCEPT")', 'button:has-text("Accept all")', 'button:has-text("Accept All")', 'button:has-text("Accept")', 'button:has-text("I agree")', 'button:has-text("Got it")', 'button:has-text("Allow all")', '#onetrust-accept-btn-handler']) {
    try { const el = page.locator(sel).first(); if (await el.isVisible({ timeout: 300 })) { await el.click({ timeout: 1000 }); await page.waitForTimeout(400); } } catch {}
  }
  // Hide self-identified cookie or promo modals (never remove).
  await page.evaluate(() => {
    const pat = /cookie|consent|gdpr|popup|pop-up|promo-modal|newsletter-modal|\bmodal\b/i;
    for (const e of document.querySelectorAll('body *')) {
      const id = (e.id || '') + ' ' + (typeof e.className === 'string' ? e.className : '');
      if (!pat.test(id)) continue;
      const s = getComputedStyle(e); const r = e.getBoundingClientRect();
      if (s.position === 'fixed' && r.width > 200 && r.height > 120 && s.display !== 'none' && e.querySelectorAll('*').length < 300) e.style.setProperty('display', 'none', 'important');
    }
  }).catch(() => {});
  // A small clickable control in the top-right corner (an X) while something large sits above the page: click it once, guarded.
  const closeBox = await page.evaluate(() => {
    const vis = e => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0; };
    const bigs = [...document.querySelectorAll('body *')].filter(e => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return (s.position === 'fixed' || s.position === 'absolute') && r.width >= innerWidth * 0.8 && r.height >= innerHeight * 0.6 && vis(e) && +s.zIndex > 10 && e.querySelectorAll('*').length < 400; });
    if (!bigs.length) return null;
    const cands = [];
    for (const e of document.querySelectorAll('button, a, [role="button"], svg, i, span, div')) {
      if (!vis(e) || !bigs.some(b => b.contains(e))) continue; const r = e.getBoundingClientRect();
      if (!(r.top >= 0 && r.top < innerHeight * 0.25 && r.left > innerWidth * 0.7 && r.width >= 16 && r.width < 140 && r.height >= 16 && r.height < 140)) continue;
      const id = ((e.getAttribute('aria-label') || '') + ' ' + (typeof e.className === 'string' ? e.className : '') + ' ' + (e.id || '')).toLowerCase();
      const text = (e.textContent || '').trim();
      let score = 0; if (/close|dismiss|\bx\b/.test(id)) score += 3; if (/^[×xX✕✖]$/.test(text)) score += 3; if (text.length === 0 || text.length <= 2) score += 1; if (getComputedStyle(e).cursor === 'pointer') score += 2; if (e.tagName === 'BUTTON' || e.getAttribute('role') === 'button') score += 1;
      if (score >= 3) cands.push({ score, x: r.left + r.width / 2, y: r.top + r.height / 2, area: r.width * r.height });
    }
    cands.sort((a, b) => b.score - a.score || a.area - b.area);
    return cands[0] || null;
  });
  if (closeBox) {
    await page.mouse.click(closeBox.x, closeBox.y).catch(() => {});
    await page.waitForTimeout(800);
    const after = { url: page.url(), h: await page.evaluate(() => (document.scrollingElement || document.documentElement).scrollHeight) };
    if (after.url !== before.url || (before.h > 2000 && after.h < before.h * 0.5)) { await page.goto(before.url, { waitUntil: 'domcontentloaded' }).catch(() => {}); await page.waitForTimeout(1500); await page.keyboard.press('Escape').catch(() => {}); }
  }
  await page.waitForTimeout(400);
}
