// Google Apps Script web app. Logs every lead to the sheet it lives in and emails Caleb.
const NOTIFY = ['aire@calebjackson.org']; // add a carrier email-to-SMS address to get a text too
function doPost(e) {
  const d = JSON.parse(e.postData.contents || '{}');
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sh.getLastRow() === 0) sh.appendRow(['at', 'kind', 'name', 'phone', 'email', 'address', 'area', 'max', 'when', 'slot', 'message', 'consent', 'page', 'ip']);
  sh.appendRow([d.at, d.kind, d.name, d.phone, d.email, d.address, d.area, d.max, d.when, d.slot, d.message, d.consent, d.page, d.ip]);
  const lines = Object.keys(d).filter(k => d[k] && k !== 'ua').map(k => k + ': ' + d[k]).join('\n');
  MailApp.sendEmail({ to: NOTIFY.join(','), subject: 'Website lead: ' + d.kind + (d.name ? ' from ' + d.name : ''), body: lines });
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
