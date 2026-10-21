// Google Apps Script web app. Logs every lead to the sheet it lives in and emails Caleb.
const NOTIFY = ['aire@calebjackson.org']; // add a carrier email-to-SMS address to get a text too
function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents || '{}'); } catch (err) { return out({ ok: false, error: 'bad json' }); }
  // Same checks as api/lead.js, so the site can post straight here when it has no Cloudflare function in front.
  if (d.website) return out({ ok: true }); // honeypot field, bots fill it
  d.phone = String(d.phone || '').replace(/[^\d+]/g, '');
  d.email = String(d.email || '').trim();
  if (!d.phone && !d.email) return out({ ok: false, error: 'need a phone or email' });
  d.consent = d.consent ? 'yes' : 'no';
  Object.keys(d).forEach(k => { d[k] = String(d[k]).slice(0, k === 'message' ? 2000 : 200); });
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sh.getLastRow() === 0) sh.appendRow(['at', 'kind', 'name', 'phone', 'email', 'address', 'area', 'max', 'when', 'slot', 'message', 'consent', 'page', 'ip']);
  sh.appendRow([d.at, d.kind, d.name, d.phone, d.email, d.address, d.area, d.max, d.when, d.slot, d.message, d.consent, d.page, d.ip]);
  const lines = Object.keys(d).filter(k => d[k] && k !== 'ua').map(k => k + ': ' + d[k]).join('\n');
  MailApp.sendEmail({ to: NOTIFY.join(','), subject: 'Website lead: ' + d.kind + (d.name ? ' from ' + d.name : ''), body: lines });
  return out({ ok: true });
}
function out(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
