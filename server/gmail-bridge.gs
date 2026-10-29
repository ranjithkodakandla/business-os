/**
 * Business Workspace – Gmail bridge for the live Supplier Sourcing agent.
 *
 * Paste this whole file into a new project at https://script.google.com (signed in as ranjith302@gmail.com),
 * then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 * Do not edit anything below. The SECRET must match the one stored on the sourcing server.
 *
 * Actions (POST JSON {key, action, ...}):
 *   send  {to, subject, body}   -> {ok, id, threadId}   (only to the allowlisted test addresses)
 *   list  {sinceIso, query}     -> {ok, messages:[{id, threadId, from, to, subject, dateIso, body}]}
 * GET -> {ok:true, user}  (used by "Save & test")
 */
var SECRET = '76fdc389b016a13ccfb222be0efc43b69e62cb3f27988fad';
var ALLOWLIST = ['ranjith302+suppliera@gmail.com', 'ranjith302+supplierb@gmail.com', 'ranjith302+supplierc@gmail.com', 'saad1085+supplierd@gmail.com'];
var MAX_MESSAGES = 60;

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return json_({ ok: true, service: 'bw-gmail-bridge', user: Session.getEffectiveUser().getEmail() });
}

function doPost(e) {
  var req;
  try { req = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return json_({ ok: false, error: 'bad json' }); }
  if (!req || req.key !== SECRET) return json_({ ok: false, error: 'unauthorized' });
  try {
    if (req.action === 'send') return json_(send_(req));
    if (req.action === 'list') return json_(list_(req));
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function send_(req) {
  var to = String(req.to || '').trim().toLowerCase();
  if (ALLOWLIST.indexOf(to) < 0) return { ok: false, error: 'blocked: ' + to + ' is not on the allowlist' };
  var subject = String(req.subject || '').slice(0, 250);
  var body = String(req.body || '').slice(0, 20000);
  if (!subject || !body) return { ok: false, error: 'subject and body are required' };
  var opts = {};
  if (req.fromName) opts.name = String(req.fromName).slice(0, 80);
  var msg = GmailApp.createDraft(to, subject, body, opts).send();
  return { ok: true, id: msg.getId(), threadId: msg.getThread().getId() };
}

function trimQuoted_(text) {
  var t = String(text || '').replace(/\r/g, '');
  t = t.split(/\n\s*On [^\n]{3,250}(?:\n[^\n]{0,250})?wrote:/)[0];
  t = t.split(/\n-{2,}\s*Original Message/i)[0];
  return t.split('\n').filter(function (l) { return !/^\s*>/.test(l); }).join('\n').trim().slice(0, 4000);
}

function list_(req) {
  var since = req.sinceIso ? new Date(req.sinceIso) : new Date(Date.now() - 2 * 24 * 3600 * 1000);
  var query = String(req.query || 'subject:"RFQ-SRC" newer_than:2d');
  var threads = GmailApp.search(query, 0, 30);
  var out = [];
  for (var i = 0; i < threads.length && out.length < MAX_MESSAGES; i++) {
    var msgs = threads[i].getMessages();
    for (var j = 0; j < msgs.length && out.length < MAX_MESSAGES; j++) {
      var m = msgs[j];
      if (m.getDate() < since) continue;
      if (!/RFQ-SRC-\d{4}-[A-E]/i.test(m.getSubject())) continue;
      out.push({ id: m.getId(), threadId: threads[i].getId(), from: m.getFrom(), to: m.getTo(), subject: m.getSubject(), dateIso: m.getDate().toISOString(), body: trimQuoted_(m.getPlainBody()) });
    }
  }
  return { ok: true, messages: out };
}
