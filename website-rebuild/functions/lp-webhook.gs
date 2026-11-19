// Google Apps Script web app: the Luxury Presence lead webhook receiver.
// Standalone script (script.google.com, New project), not bound to the sheet, so it can be its
// own web app next to lead-webhook.gs. It opens the Website leads sheet by id and writes a lead
// row in the same columns the site forms use, so aire/crm/crm.py import-website-leads picks
// Luxury Presence leads up with no new code.
//
// Setup (once): Project Settings, Script Properties, add LP_SECRET (any long random string).
// Deploy, New deployment, Web app, Execute as Me, Who has access: Anyone. Copy the URL.
// Register the webhook with aire/lp-webhook/register.py create --url "<web app url>?k=<LP_SECRET>".
//
// Why the secret rides in the URL: Apps Script hands doPost the body and the query string but
// not the request headers, so x-lp-signature and x-lp-delivery-id never reach this code. The
// URL token is the check Apps Script can do. Dedupe uses leadId + activityType + activityAt
// from the body instead of the delivery id.
const SHEET_ID = '16sasu66UttsPMXBmkGk9M-jDGlfuvDoZXv4ZOGW-p0A'; // Website leads
const LEADS_TAB = 0;                   // first tab, the one crm.py reads
const ACTIVITY_TAB = 'LP activity';    // everything that is not a lead event lands here
const NOTIFY = ['aire@calebjackson.org'];
// Activity types that mean a person raised a hand. These become lead rows and a call task.
const LEAD_EVENTS = ['SIGNUP', 'CONTACT_INQUIRY', 'HOME_VALUE', 'SCHEDULE_SHOWING', 'REQUEST_INFO'];

function doPost(e) {
  const secret = PropertiesService.getScriptProperties().getProperty('LP_SECRET') || '';
  const given = (e.parameter && e.parameter.k) || '';
  if (!secret || given !== secret) return out({ ok: false, error: 'bad token' });
  let d;
  try { d = JSON.parse(e.postData.contents || '{}'); } catch (err) { return out({ ok: false, error: 'bad json' }); }
  const key = [d.leadId, d.activityType, d.activityAt].map(x => String(x || '')).join('|');
  if (!d.leadId || !d.activityType) return out({ ok: false, error: 'not a lead event' });
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const isLead = LEAD_EVENTS.indexOf(String(d.activityType).toUpperCase()) >= 0 || d.isNewLead === true;
  const sh = isLead ? ss.getSheets()[LEADS_TAB] : (ss.getSheetByName(ACTIVITY_TAB) || ss.insertSheet(ACTIVITY_TAB));
  if (seen(sh, key)) return out({ ok: true, dup: true });
  const row = mapLead(d, key);
  writeByHeader(sh, row);
  if (isLead) {
    const lines = Object.keys(row).filter(k => row[k] && k !== 'lp_key').map(k => k + ': ' + row[k]).join('\n');
    MailApp.sendEmail({ to: NOTIFY.join(','), subject: 'LP lead: ' + row.kind + (row.name ? ' from ' + row.name : ''), body: lines });
  }
  return out({ ok: true });
}

// Same columns as lead-webhook.gs plus lp_key for dedupe. The crm_import column is crm.py's.
function mapLead(d, key) {
  const name = [d.leadFirstName, d.leadLastName].filter(Boolean).join(' ').trim();
  const addr = [d.activityListingAddress, d.activityListingCity, d.activityListingState, d.activityListingZip].filter(Boolean).join(', ');
  const custom = d.formCustomFields && typeof d.formCustomFields === 'object'
    ? Object.keys(d.formCustomFields).map(k => k + '=' + d.formCustomFields[k]).join('; ') : '';
  const msg = ['source: ' + (d.leadSource || ''), 'origin: ' + (d.leadOrigin || ''), 'type: ' + (d.leadType || ''),
    'tags: ' + (Array.isArray(d.leadTags) ? d.leadTags.join(', ') : (d.leadTags || '')), custom ? 'form: ' + custom : '',
    d.isNewLead ? 'new lead' : 'existing lead'].filter(s => s && !/: $/.test(s)).join('\n');
  const row = {
    at: d.activityAt || new Date().toISOString(),
    kind: 'lp ' + String(d.activityType || '').toLowerCase().replace(/_/g, ' '),
    name: name, phone: String(d.leadPhoneNumber || '').replace(/[^\d+]/g, ''), email: String(d.leadEmail || '').trim(),
    address: addr, area: d.activityListingCity || '', max: d.activityListingPrice ? String(d.activityListingPrice) : '',
    when: '', slot: '', message: msg, consent: 'no', page: d.activitySourceUrl || '', ip: '', lp_key: key,
  };
  Object.keys(row).forEach(k => { row[k] = String(row[k] || '').slice(0, k === 'message' ? 2000 : 200); });
  return row;
}

const HEADER = ['at', 'kind', 'name', 'phone', 'email', 'address', 'area', 'max', 'when', 'slot', 'message', 'consent', 'page', 'ip'];

function writeByHeader(sh, row) {
  if (sh.getLastRow() === 0) sh.appendRow(HEADER.concat(['lp_key']));
  let header = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
  if (header.indexOf('lp_key') < 0) { sh.getRange(1, header.length + 1).setValue('lp_key'); header = header.concat(['lp_key']); }
  const values = header.map(h => row[h] !== undefined ? row[h] : '');
  sh.appendRow(values);
}

function seen(sh, key) {
  if (sh.getLastRow() < 2) return false;
  const header = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
  const c = header.indexOf('lp_key');
  if (c < 0) return false;
  const col = sh.getRange(2, c + 1, sh.getLastRow() - 1, 1).getValues();
  return col.some(r => String(r[0]) === key);
}

function out(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

// Run this from the editor once to prove the mapping without Luxury Presence: it writes one
// made-up row to the LP activity tab and nothing else.
function selfTest() {
  const sample = { leadId: 'test-1', activityType: 'HOME_SEARCH', activityAt: new Date().toISOString(), leadFirstName: 'Test', leadLastName: 'Person',
    leadEmail: 'test@example.com', leadPhoneNumber: '(225) 555-0100', leadSource: 'Website', leadOrigin: 'Organic', leadType: 'Buyer', leadTags: ['test'],
    activityListingAddress: '100 Example St', activityListingCity: 'Zachary', activityListingState: 'LA', activityListingZip: '70791', activityListingPrice: 300000,
    activitySourceUrl: 'https://calebjackson.org/', isNewLead: false };
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(ACTIVITY_TAB) || ss.insertSheet(ACTIVITY_TAB);
  const key = [sample.leadId, sample.activityType, sample.activityAt].join('|');
  if (!seen(sh, key)) writeByHeader(sh, mapLead(sample, key));
  Logger.log(JSON.stringify(mapLead(sample, key)));
}
