// Cloudflare Pages Function: POST /api/lead
// Takes the JSON a site form sends, checks it, and forwards it to LEAD_WEBHOOK
// (a Google Apps Script web app that logs to a Sheet and emails or texts Caleb).
// Set LEAD_WEBHOOK in the Pages project's environment variables. Nothing is stored here.
export async function onRequestPost({ request, env }) {
  let data;
  try { data = await request.json(); } catch (e) { return json({ ok: false, error: 'bad json' }, 400); }
  const kind = String(data.kind || 'form').slice(0, 60);
  const phone = String(data.phone || '').replace(/[^\d+]/g, '');
  const email = String(data.email || '').trim();
  if (!phone && !email) return json({ ok: false, error: 'need a phone or email' }, 400);
  if (data.website) return json({ ok: true }); // honeypot field, bots fill it
  const payload = {
    kind, phone, email,
    name: String(data.name || '').slice(0, 120),
    address: String(data.address || '').slice(0, 200),
    area: String(data.area || '').slice(0, 80),
    max: String(data.max || '').slice(0, 40),
    when: String(data.when || '').slice(0, 60),
    slot: String(data.slot || '').slice(0, 60),
    message: String(data.message || '').slice(0, 2000),
    consent: data.consent ? 'yes' : 'no',
    page: String(data.page || ''), at: String(data.at || new Date().toISOString()),
    ip: request.headers.get('cf-connecting-ip') || '', ua: (request.headers.get('user-agent') || '').slice(0, 200),
  };
  if (!env.LEAD_WEBHOOK) return json({ ok: false, error: 'LEAD_WEBHOOK not set' }, 500);
  const r = await fetch(env.LEAD_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!r.ok) return json({ ok: false, error: 'webhook ' + r.status }, 502);
  return json({ ok: true });
}
function json(obj, status = 200) { return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }); }
