/* Mr B's Digital Technology Revision: pupil activity log (Google Apps Script web app).

   The revision site sends each pupil's ACTIVE time (the page on screen and in use, not just left open) with the name
   and class they typed in. This script adds it to a "Log" sheet and gives the Teacher area a summary, protected by your key.
   Pupils (named or not) can also SAVE their progress online with a save code and load it on another device.
   The Teacher area can also merge pupils (the same pupil on two devices, or a mistyped name), rename them and delete them.

   SET UP (about 5 minutes, once):
   1. Make a new Google Sheet (ideally in your school Google account), e.g. "Revision site activity".
   2. Extensions › Apps Script. Delete what is there, paste in this whole file and save.
   3. Change TEACHER_KEY below to a password of your own (letters and numbers, no spaces). Save again.
   4. Deploy › New deployment › type "Web app". Execute as: Me. Who has access: Anyone. Deploy, allow access when asked,
      and copy the Web app URL (it ends in /exec).
   5. In the GitHub repo, open activity.json (top level), edit it and paste the URL between the quotes after "url". Commit.
   6. In the Teacher area › Pupils, type the same TEACHER_KEY once on your device.
   7. EMAILS: choose testEmail in the function list at the top of the editor and press Run once; allow "Send email as
      you". Emails go to the account that owns the script, or to NOTIFY_EMAIL if you set it.
   STAFF: typing TEACHER_KEY or STAFF_PIN in the sign-in box's name or PIN field marks that device as staff (never asked,
   never counted). Its "Send me staff details" link emails both to the Google account that owns this script.

   UPDATING this code later: paste the new version over the old one (keep your TEACHER_KEY line), save, then
   Deploy › Manage deployments › pencil (Edit) › Version: New version › Deploy. The URL stays the same.

   Sheets it uses: Log (one row per few minutes of use, per page), Progress (one row per pupil per workbook: pages covered,
   best chapter-quiz scores, trophies), Saves (saved progress: under a save code, or P-<pupil ID>), Pins (each pupil's
   4-digit PIN as a salted hash, never the PIN itself), Aliases (merged pupil IDs: old ID -> kept ID, so a device that
   still sends the old ID is counted under the kept pupil) and Names (the name and class you chose for a pupil). */

const SCRIPT_VERSION = 16;   // the Teacher area warns when the deployed script is older than the site expects
const TEACHER_KEY = 'change-me';
const STAFF_PIN = 'change-me';
const WEEKLY_EMAIL = true;    // email the script's owner a weekly report every Monday morning (false to stop)
const SITE = 'https://popcorn483.github.io/ergsdigitaltechnology/';
const REQUIRE_APPROVAL = true;   // new pupils wait until you approve them in the Teacher area › Pupils (false: anyone can sign up)
const NOTIFY_EMAIL = '';   // where the emails go (sign-up requests, staff details, weekly report); empty: the Google account that owns this script
const EMAIL_SIGNINS = true;   // email the script's owner each time a new pupil signs up (false to stop)   // a short staff password: typed in the sign-in box it marks a device as staff (no access to pupil data)
const BOOKS = ['home', 'U1', 'U4', 'U5', 'AS1', 'AS2', 'A21', 'A22'];
const LOG_HEAD = ['When', 'Pupil ID', 'Name', 'Class', 'Unit', 'Topic', 'Active seconds', 'Page'];
const PROG_HEAD = ['Updated', 'Pupil ID', 'Name', 'Class', 'Unit', 'Pages covered', 'Pages opened', 'Pages in unit', 'Trophies', 'Best quiz scores', 'Pages covered / opened', 'Page quiz marks'];

function clean_(v, n) {
  let s = String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
  if (/^[=+\-@]/.test(s)) s = "'" + s;   // never let typed text become a spreadsheet formula
  return s;
}
function tab_(name, head) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(head); sh.setFrozenRows(1); }
  return sh;
}
const log_ = () => { const sh = tab_('Log', LOG_HEAD); if (sh.getRange(1, 8).getValue() !== 'Page') sh.getRange(1, 8).setValue('Page'); return sh; };
const prog_ = () => { const sh = tab_('Progress', PROG_HEAD); if (sh.getRange(1, 12).getValue() !== 'Page quiz marks') sh.getRange(1, 12).setValue('Page quiz marks'); return sh; };
const rows_ = sh => sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues() : [];
function aliases_() { const m = {}; rows_(tab_('Aliases', ['Old ID', 'Kept ID'])).forEach(r => { m[String(r[0])] = String(r[1]); }); return m; }
function names_() { const m = {}; rows_(tab_('Names', ['Pupil ID', 'Name', 'Class'])).forEach(r => { m[String(r[0])] = [String(r[1]), String(r[2])]; }); return m; }
function resolve_(id, A) { let k = 0; while (A[id] && k++ < 20) id = A[id]; return id; }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function locked_(fn) { const l = LockService.getScriptLock(); l.waitLock(20000); try { return fn(); } finally { l.releaseLock(); } }
const okId = id => /^[a-z0-9]{6,24}$/i.test(String(id || ''));

/* the site posts { id, name, cls, book, ch, s } */
const CODE_RE = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/, PART = 45000, PARTS = 10;
function saves_() { return tab_('Saves', ['Code', 'Updated', 'Characters'].concat(Array.from({ length: PARTS }, (_, i) => 'Part ' + (i + 1)))); }
function save_(code, data) {   /* code: a save code (K7P4-QX9M) or P-<pupil ID> for a named pupil */   /* progress saved with a code: the browser's notes-* items as one JSON string, split over cells */
  if (!(CODE_RE.test(code) || /^P-[a-z0-9]{6,24}$/i.test(code)) || typeof data !== 'string' || data.length > PART * PARTS) return { ok: false };
  try { JSON.parse(data); } catch (x) { return { ok: false }; }
  const parts = Array.from({ length: PARTS }, (_, i) => { const p = data.slice(i * PART, (i + 1) * PART); return p ? '~' + p : ''; });   // '~' so a part never starts like a formula
  return locked_(() => { const sh = saves_(), r = rows_(sh), i = r.findIndex(x => String(x[0]) === code), row = [code, new Date(), data.length].concat(parts);
    if (i >= 0) sh.getRange(i + 2, 1, 1, row.length).setValues([row]); else sh.appendRow(row); return { ok: true }; });
}
const norm_ = (n, c) => String(n || '').toLowerCase().replace(/\s+/g, ' ').trim() + '|' + String(c || '').toUpperCase().replace(/\s+/g, '');
/* PINs: a pupil's 4-digit PIN, stored only as a salted hash (Pins sheet). Five wrong tries locks that pupil for 15 minutes. */
const pins_ = () => tab_('Pins', ['Pupil ID', 'PIN hash', 'Set']);
function salt_() { const pr = PropertiesService.getScriptProperties(); let s = pr.getProperty('PIN_SALT'); if (!s) { s = Utilities.getUuid(); pr.setProperty('PIN_SALT', s); } return s; }   // made once, kept in the script's properties
function pinHash_(id, pin) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'mrbdt|' + id + '|' + pin + '|' + salt_())); }
function getPin_(id) { const r = rows_(pins_()).find(x => String(x[0]) === id); return r ? String(r[1]) : ''; }
function setPin_(id, pin) { const sh = pins_(), r = rows_(sh), i = r.findIndex(x => String(x[0]) === id), row = [id, pinHash_(id, pin), new Date()];
  if (i >= 0) sh.getRange(i + 2, 1, 1, 3).setValues([row]); else sh.appendRow(row); }
function dropPins_(ids) { const sh = pins_(), r = rows_(sh); for (let i = r.length - 1; i >= 0; i--) if (ids.indexOf(String(r[i][0])) >= 0) sh.deleteRow(i + 2); }
/* signing in: the pupil with this name and form class (as shown, or as they once typed it). With the right PIN: their ID and
   saved progress. A pupil with no PIN yet takes this one. Nobody with that name: this device's ID becomes a new pupil with this PIN. */
function whois_(name, cls, pin, devId) {
  const want = norm_(name, cls); if (want.length < 4) return { ok: false };
  if (!/^\d{4}$/.test(String(pin || ''))) return { ok: false, error: 'pin' };
  const hits = roster_().filter(p => norm_(p.name, p.cls) === want || (p.typed || []).some(t => { const m = /^(.*) \(([^)]*)\)$/.exec(t); return m && norm_(m[1], m[2]) === want; }));
  if (!hits.length) {
    /* signed up but not used yet (still waiting, or declined): that same request, not a second one */
    const req = REQUIRE_APPROVAL ? rows_(acc_()).find(x => norm_(x[2], x[3]) === want) : null;
    if (!okId(devId) && !req) return { ok: false };
    const id = req ? String(req[0]) : resolve_(String(devId), aliases_()), had = getPin_(id);
    if (had && had !== pinHash_(id, pin)) return { ok: false, error: 'pin' };
    locked_(() => setPin_(id, pin));
    if (!had && !req) { if (REQUIRE_APPROVAL) setAccess_(id, 'pending', name, cls); notify_('New sign-up', name, cls, REQUIRE_APPROVAL ? 'A new pupil is waiting for you to approve them: Teacher area › Pupils › Requests.' : 'A new pupil has signed up.'); }
    return { ok: true, id, fresh: !req, name: req ? String(req[2]) : undefined, cls: req ? String(req[3]) : undefined, status: access_(id) };
  }
  const p = hits.sort((a, b) => b.total - a.total)[0], cache = CacheService.getScriptCache(), fk = 'fail:' + p.id, fails = +(cache.get(fk) || 0);
  if (fails >= 5) return { ok: false, error: 'locked' };
  const had = getPin_(p.id);
  if (had && had !== pinHash_(p.id, pin)) { cache.put(fk, String(fails + 1), 900); return { ok: false, error: 'pin', left: 4 - fails }; }
  if (!had) locked_(() => setPin_(p.id, pin));
  cache.remove(fk);
  const sv = rows_(saves_()).find(x => String(x[0]) === 'P-' + p.id);
  return { ok: true, status: access_(p.id), id: p.id, name: p.name, cls: p.cls, updated: sv ? new Date(sv[1]).getTime() : 0, data: sv ? sv.slice(3, 3 + PARTS).map(x => String(x || '').replace(/^~/, '')).join('') : '' };
}
/* who is in the sheet (for signing in): id, name, class, the names they typed and total time. Much quicker than summary_. */
function roster_() {
  const A = aliases_(), N = names_(), P = {};
  const get = (id, name, cls) => P[id] || (P[id] = { id, name: String(name || ''), cls: String(cls || ''), typed: {}, total: 0, last: 0 });
  const lg = log_(), n = lg.getLastRow() - 1;
  if (n > 0) lg.getRange(2, 1, n, 7).getValues().forEach(r => { const id = resolve_(String(r[1]), A); if (!id) return; const p = get(id, r[2], r[3]), t = +new Date(r[0]) || 0;
    if (t >= p.last) { p.name = String(r[2]); p.cls = String(r[3]); p.last = t; } p.typed[String(r[2]) + ' (' + String(r[3]) + ')'] = 1; p.total += +r[6] || 0; });
  rows_(prog_()).forEach(r => { const id = resolve_(String(r[1]), A); if (id && !P[id]) get(id, r[2], r[3]); });
  return Object.keys(P).map(k => { const p = P[k]; if (N[k]) { p.name = N[k][0] || p.name; p.cls = N[k][1] || p.cls; } p.typed = Object.keys(p.typed); return p; });
}
function load_(code) {
  if (!CODE_RE.test(code)) return { ok: false, error: 'code' };
  const r = rows_(saves_()).find(x => String(x[0]) === code); if (!r) return { ok: false, error: 'code' };
  return { ok: true, updated: new Date(r[1]).getTime(), data: r.slice(3, 3 + PARTS).map(p => String(p || '').replace(/^~/, '')).join('') };
}
function doPost(e) {
  let d; try { d = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false }); }
  if (d.kind === 'save') return out_(save_(String(d.code || '').toUpperCase(), d.data));
  if (d.kind === 'psave') { if (!okId(d.id)) return out_({ ok: false }); return out_(save_('P-' + resolve_(String(d.id), aliases_()), d.data)); }
  const s = Math.round(+d.s || 0), book = String(d.book || ''), name = clean_(d.name, 40);
  if (BOOKS.indexOf(book) < 0 || !okId(d.id) || !name) return out_({ ok: false });
  if (d.kind === 'snap') {   /* progress snapshot: replace this pupil's row for this workbook */
    const n = v => Math.max(0, Math.min(9999, Math.round(+v || 0))), q = {};
    Object.keys(d.quiz || {}).slice(0, 80).forEach(k => { const v = d.quiz[k]; if (/^c\d{1,2}(\|pp)?$/.test(k) && Array.isArray(v)) q[k] = [n(v[0]), n(v[1]), clean_(v[2], 10)]; });
    locked_(() => { const id = resolve_(String(d.id), aliases_()), sh = prog_(), r = rows_(sh), i = r.findIndex(x => String(x[1]) === id && String(x[4]) === book);
      const ok = x => /^c\d{1,2}-p\d{1,3}$/.test(String(x)), done = (Array.isArray(d.done) ? d.done : []).filter(ok).slice(0, 600), seen = (Array.isArray(d.seenIds) ? d.seenIds : []).filter(ok).slice(0, 600), later = (Array.isArray(d.laterIds) ? d.laterIds : []).filter(ok).slice(0, 600);
      const pq = {}; Object.keys(d.pq || {}).slice(0, 600).forEach(k => { const v = d.pq[k]; if (ok(k) && Array.isArray(v)) pq[k] = [n(v[0]), n(v[1]), n(v[2]), n(v[3]), String(v[4] || '').replace(/[^A-D?-]/g, '').slice(0, 30)]; });   /* score, out of, best, attempts, the answers chosen (A–D per question) */
      const fixed = applyAwards_(id, book, done);   /* the teacher's marks win, even before the pupil's device has picked them up */
      const row = [new Date(), id, name, clean_(d.cls, 12).toUpperCase(), book, fixed.length, n(d.seen), n(d.total), n(d.tr), JSON.stringify(q), fixed.join(',') + '|' + seen.filter(x => fixed.indexOf(x) < 0).join(',') + '|' + later.filter(x => fixed.indexOf(x) < 0).join(',') , JSON.stringify(pq)];
      if (i >= 0) sh.getRange(i + 2, 1, 1, row.length).setValues([row]); else sh.appendRow(row); });
    return out_({ ok: true });
  }
  if (!(s > 0 && s <= 3600)) return out_({ ok: false });
  locked_(() => { const id = resolve_(String(d.id), aliases_()); log_().appendRow([new Date(), id, name, clean_(d.cls, 12).toUpperCase(), book, clean_(d.ch, 8), s, clean_(d.pg, 12)]); });
  return out_({ ok: true });
}

/* sign-up emails: one per new pupil, to the script's owner. Gmail allows about 100 a day from a script, so this stops
   at 90 a day (the Log still has everything). */
/* ACCESS: Access sheet [Pupil ID, Status (pending / approved / declined), Name, Class, Requested, Decided]. Pupils from before
   approvals were switched on (no row) count as approved. */
const acc_ = () => tab_('Access', ['Pupil ID', 'Status', 'Name', 'Class', 'Requested', 'Decided']);
function access_(id) {
  if (!REQUIRE_APPROVAL) return 'approved';
  const r = rows_(acc_()).find(x => String(x[0]) === id); return r ? String(r[1]) : 'approved';
}
function setAccess_(id, status, name, cls) {
  const sh = acc_(), r = rows_(sh), i = r.findIndex(x => String(x[0]) === id), now = new Date();
  if (i >= 0) { sh.getRange(i + 2, 2).setValue(status); if (status !== 'pending') sh.getRange(i + 2, 6).setValue(now); }
  else sh.appendRow([id, status, clean_(name || '', 40), clean_(cls || '', 12).toUpperCase(), now, status === 'pending' ? '' : now]);
}
function dropAccess_(ids) { const sh = acc_(), r = rows_(sh); for (let i = r.length - 1; i >= 0; i--) if (ids.indexOf(String(r[i][0])) >= 0) sh.deleteRow(i + 2); }
/* EMAILS: if none arrive, open the Apps Script, choose testEmail in the function list at the top and press Run. Google asks
   you to allow "Send email as you" the first time; allow it, then Deploy › Manage deployments › pencil › New version.
   The Teacher area › Pupil tracking › ⋯ › "Send a test email" shows what went wrong, if anything. */
function mailTo_() { let to = NOTIFY_EMAIL; try { to = to || Session.getEffectiveUser().getEmail(); } catch (e) { } try { to = to || Session.getActiveUser().getEmail(); } catch (e) { } return to || ''; }
function mailNote_(err) { try { const pr = PropertiesService.getScriptProperties(); if (err) pr.setProperty('mail:err', new Date().toISOString() + ' ' + String(err && err.message || err).slice(0, 300)); else { pr.deleteProperty('mail:err'); pr.setProperty('mail:ok', new Date().toISOString()); } } catch (e) { } }
function mailState_() { try { const pr = PropertiesService.getScriptProperties(); return { to: mailTo_(), err: pr.getProperty('mail:err') || '', ok: pr.getProperty('mail:ok') || '' }; } catch (e) { return { to: '', err: String(e), ok: '' }; } }
/* EMAIL LAYOUT: every email uses this one branded design (site blue header, white card, button, small footer).
   Built from tables and inline styles so it looks the same in Gmail, Outlook and phone mail apps. */
const BRAND = { name: "Mr B's Digital Technology Revision", blue: '#1F5FBF', ink: '#172033', muted: '#5A6478', line: '#D3D9E2', bg: '#E6EAF0', soft: '#EEF3FB' };
const esc_ = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/* o: { title, preheader, body (HTML), button: [text, url], foot (HTML), wide } */
function mailHtml_(o) {
  const f = 'font-family:Arial,Helvetica,sans-serif', w = o.wide ? 760 : 600;
  const btn = o.button ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 4px"><tr><td style="background:${BRAND.blue};border-radius:6px">
      <a href="${o.button[1]}" style="display:inline-block;padding:12px 22px;${f};font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none">${esc_(o.button[0])}</a></td></tr></table>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc_(o.title)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc_(o.preheader || '')}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg}"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${w}px;background:#FFFFFF;border-radius:10px;overflow:hidden;border:1px solid ${BRAND.line}">
    <tr><td style="background:${BRAND.ink};padding:18px 24px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="padding-right:12px;vertical-align:middle"><img src="${SITE}app-icons/icon-192.png" width="40" height="40" alt="" style="display:block;border-radius:8px;border:0"></td>
        <td style="vertical-align:middle;${f}"><div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#A9C4F2;font-weight:bold">Mr Butler's</div>
          <div style="font-size:17px;color:#FFFFFF;font-weight:bold;letter-spacing:.5px">Digital Technology Revision</div></td>
      </tr></table></td></tr>
    <tr><td style="height:4px;background:${BRAND.blue};font-size:0;line-height:0">&nbsp;</td></tr>
    <tr><td style="padding:26px 24px 24px;${f};color:${BRAND.ink};font-size:15px;line-height:1.55">
      <h1 style="margin:0 0 12px;font-size:21px;line-height:1.3;color:${BRAND.ink}">${esc_(o.title)}</h1>
      ${o.body}${btn}
    </td></tr>
    <tr><td style="padding:14px 24px 18px;border-top:1px solid ${BRAND.line};background:#F7F9FC;${f};font-size:12px;line-height:1.5;color:${BRAND.muted}">
      ${o.foot ? o.foot + '<br>' : ''}Sent automatically by ${esc_(BRAND.name)} · <a href="${SITE}" style="color:${BRAND.blue}">${SITE.replace(/^https:\/\//, '').replace(/\/$/, '')}</a>
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}
/* a label / value table for details (name, class, time…) */
function mailFacts_(rows) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:14px 0;border:1px solid ${BRAND.line};border-radius:8px;background:${BRAND.soft}">` +
    rows.map((r, i) => `<tr><td style="padding:10px 14px;${i ? 'border-top:1px solid ' + BRAND.line + ';' : ''}font-size:13px;color:${BRAND.muted};width:38%;vertical-align:top">${esc_(r[0])}</td>
      <td style="padding:10px 14px;${i ? 'border-top:1px solid ' + BRAND.line + ';' : ''}font-size:15px;color:${BRAND.ink};font-weight:bold;vertical-align:top">${r[2] ? r[1] : esc_(r[1])}</td></tr>`).join('') + '</table>';
}
const when_ = () => Utilities.formatDate(new Date(), 'Europe/London', "EEEE d MMMM yyyy 'at' HH:mm");
function testEmail() {   /* run this once from the editor (it asks for permission to send email) */
  const to = mailTo_(); if (!to) throw new Error('No email address: set NOTIFY_EMAIL at the top of the script.');
  MailApp.sendEmail({ to, name: BRAND.name, subject: "Mr B's Revision: email is working",
    htmlBody: mailHtml_({ title: 'Emails are set up', preheader: 'Sign-up requests, staff details and the weekly report will arrive here.',
      body: `<p style="margin:0 0 10px">Good news: the revision site can send email to this address.</p>
        <p style="margin:0">You'll receive:</p>
        <ul style="margin:6px 0 0;padding-left:20px"><li>new pupil sign-up requests</li><li>staff details, when requested from the sign-in box</li><li>the weekly report, every Monday morning</li></ul>`,
      button: ['Open the Teacher area', SITE + 'teacher.html#visits'] }),
    body: 'Emails from the Revision Guide are working. Sign-up requests, staff details and the weekly report come to this address.\n\n' + SITE + 'teacher.html#visits' });
  mailNote_(null); Logger.log('Test email sent to ' + to);
  return to;
}
function notify_(what, name, cls, more) {
  if (!EMAIL_SIGNINS) return;
  try {
    const pr = PropertiesService.getScriptProperties(), day = Utilities.formatDate(new Date(), 'Europe/London', 'yyyy-MM-dd');
    let n = +(pr.getProperty('mails:' + day) || 0); if (n >= 90 || MailApp.getRemainingDailyQuota() < 5) return;
    const to = mailTo_(); if (!to) { mailNote_('no email address (set NOTIFY_EMAIL)'); return; }
    const nm = String(name || '').replace(/^'/, ''), cl = String(cls || '').replace(/^'/, ''), who = `${nm} (${cl})`;
    MailApp.sendEmail({ to, name: BRAND.name, subject: `${what}: ${who}`,
      htmlBody: mailHtml_({ title: REQUIRE_APPROVAL ? 'A pupil is waiting for approval' : 'A new pupil has signed up', preheader: `${who} ${REQUIRE_APPROVAL ? 'is waiting for you to approve them' : 'has signed up'}.`,
        body: `<p style="margin:0">${esc_(more)}</p>` + mailFacts_([['Pupil', nm], ['Class', cl || '–'], ['Signed up', when_()]]),
        button: [REQUIRE_APPROVAL ? 'Review the request' : 'See all pupils', SITE + 'teacher.html#visits'],
        foot: 'To stop these emails, set EMAIL_SIGNINS to false in the Apps Script and deploy a new version.' }),
      body: `${what}: ${who}\n${more}\n\n${when_()}\n${SITE}teacher.html#visits\nTo stop these emails, set EMAIL_SIGNINS to false in the Apps Script and deploy a new version.` });
    pr.setProperty('mails:' + day, String(n + 1)); mailNote_(null);
  } catch (e) { mailNote_(e); }
}
function staffMail_() {
  const c = CacheService.getScriptCache(); if (c.get('staffmail')) return { ok: true, again: true };   // at most one email every 10 minutes
  const to = mailTo_(); if (!to) { mailNote_('no email address (set NOTIFY_EMAIL)'); return { ok: false }; }
  const code = v => `<span style="font-family:Consolas,Menlo,monospace;font-size:17px;letter-spacing:1px;background:#FFFFFF;border:1px solid ${BRAND.line};border-radius:4px;padding:2px 8px">${esc_(v)}</span>`;
  try { MailApp.sendEmail({ to, name: BRAND.name, subject: "Mr B's Revision: staff details",
    htmlBody: mailHtml_({ title: 'Your staff details', preheader: 'The Teacher area key and staff PIN for the revision site.',
      body: `<p style="margin:0">Here are the staff details for the revision site. Keep this email private: don't forward it to pupils.</p>` +
        mailFacts_([['Teacher area key', code(TEACHER_KEY) + `<div style="font-size:12px;font-weight:normal;color:${BRAND.muted};margin-top:6px">Teacher area › Pupils</div>`, true],
                    ['Staff PIN', code(STAFF_PIN) + `<div style="font-size:12px;font-weight:normal;color:${BRAND.muted};margin-top:6px">Marks a device as staff</div>`, true]]) +
        `<p style="margin:0;font-size:14px;color:${BRAND.muted}">Typing either one in the sign-in box (name or PIN field) marks that device as staff: it is never asked to sign in and never counted.</p>`,
      button: ['Open the Teacher area', SITE + 'teacher.html#visits'],
      foot: `Requested from the sign-in box on ${esc_(when_())}. If that wasn't you, it was only sent to this address.` }),
    body: "Staff details for Mr B's Digital Technology Revision\n\n" +
      'Teacher area key (Teacher area › Pupils): ' + TEACHER_KEY + '\n' +
      'Staff PIN (type it in the sign-in box to mark a device as staff): ' + STAFF_PIN + '\n\n' +
      'Either one typed in the sign-in box (name or PIN field) marks a device as staff: it is never asked to sign in and never counted.\n' +
      'Requested from the sign-in box on ' + when_() + '.' }); mailNote_(null); } catch (e) { mailNote_(e); return { ok: false }; }
  c.put('staffmail', '1', 600);
  return { ok: true };
}
/* the Teacher area: ?key=… gives one summary row per pupil; &action=merge|rename|delete changes them */
function doGet(e) {
  const q = (e && e.parameter) || {};
  if (q.action === 'load') return out_(load_(String(q.code || '').toUpperCase().trim()));   /* pupils: no key needed, just their save code */
  if (q.action === 'whois') return out_(whois_(q.name, q.cls, q.pin, q.id));
  if (q.action === 'access') { if (!okId(q.id)) return out_({ ok: false }); const id = resolve_(String(q.id), aliases_()); return out_({ ok: true, status: access_(id), pin: !!getPin_(id) }); }   /* a pupil's device: approved yet? has a PIN? */
  if (q.action === 'awards') return out_(awardsFor_(q.id, +q.since || 0));   /* a pupil's device: pages the teacher marked or unmarked */   /* pupils signing in: find them by name and form class */
  if (q.action === 'staff') {   /* the sign-in box: staff password check (TEACHER_KEY or STAFF_PIN) */
    const k = String(q.key || ''), ok = (k === TEACHER_KEY && TEACHER_KEY !== 'change-me') || (k === STAFF_PIN && STAFF_PIN !== 'change-me');
    return out_(ok ? { ok: true, teacher: k === TEACHER_KEY } : { error: 'key' });
  }
  if (q.action === 'staffmail') return out_(staffMail_());   /* "Send me staff details": only ever to the script's owner */
  if (q.key !== TEACHER_KEY || TEACHER_KEY === 'change-me') return out_({ error: 'key' });
  ensureWeekly_();
  if (q.action === 'week') return out_(week_(q.start));   /* the Teacher area's weekly report */
  if (q.action) return out_(locked_(() => act_(q)));
  return out_(summary_());
}
function act_(q) {
  const ids = String(q.ids || '').split(',').filter(okId), to = String(q.to || '');
  if (q.action === 'merge') {   /* every ID in ids becomes "to"; future posts from those devices count as "to" too */
    if (!okId(to) || !ids.length) return { ok: false, error: 'bad request' };
    const from = ids.filter(x => x !== to), al = tab_('Aliases', ['Old ID', 'Kept ID']);
    rows_(al).forEach((r, i) => { if (from.indexOf(String(r[1])) >= 0) al.getRange(i + 2, 2).setValue(to); });   // older merges into a merged ID follow it
    from.forEach(f => al.appendRow([f, to]));
    relabel_(from, to); relabelProg_(from, to);
    const aw = awards_(), an = aw.getLastRow() - 1; if (an > 0) { const c = aw.getRange(2, 2, an, 1), v = c.getValues(); let ch = false; v.forEach(r => { if (from.indexOf(String(r[0])) >= 0) { r[0] = to; ch = true; } }); if (ch) c.setValues(v); }
    dropNames_(from); dropPins_(from); if (access_(to) !== 'approved' && from.some(f => access_(f) === 'approved')) setAccess_(to, 'approved'); dropAccess_(from);
    if (q.name) setName_(to, q.name, q.cls);
    return { ok: true };
  }
  if (q.action === 'detail') {   /* one pupil in full: per page and per topic [seconds, last opened, times opened], per day, first/last use, devices */
    if (!okId(to)) return { ok: false, error: 'bad request' };
    const A = aliases_(), pages = {}, topics = {}, days = {}, devs = {}, uses = []; let first = 0, last = 0;
    const add = (o, k, s, t) => { const v = o[k] || (o[k] = [0, 0, 0]); v[0] += s; if (t > v[1]) v[1] = t; v[2]++; };
    rows_(log_()).forEach(r => {
      if (resolve_(String(r[1]), A) !== to) return;
      const t = new Date(r[0]).getTime(), s = +r[6] || 0, b = String(r[4]), ch = String(r[5] || ''), pg = String(r[7] || '');
      devs[String(r[1])] = 1; if (!first || t < first) first = t; if (t > last) last = t;
      if (pg || ch) add(pages, b + '|' + (pg || ch), s, t);
      if (b !== 'home' && ch) add(topics, b + '|' + ch, s, t);
      const d = dayOf_(t); days[d] = (days[d] || 0) + s;
      uses.push([t, s, b, ch]);
    });
    /* sessions of real use: each Log row is sent after up to 3 minutes of ACTIVE use (idle time is never counted), so rows less
       than 20 minutes apart are one sitting: [start, end, active seconds, units, topics] */
    uses.sort((x, y) => x[0] - y[0]);
    const sessions = []; let cur = null;
    uses.forEach(([t, s, b, ch]) => {
      const st = t - s * 1000;
      if (!cur || st - cur[1] > 20 * 60000) { cur = [st, t, 0, {}, {}]; sessions.push(cur); }
      cur[1] = Math.max(cur[1], t); cur[2] += s; cur[3][b] = 1; if (b !== 'home' && ch) cur[4][b + '|' + ch] = (cur[4][b + '|' + ch] || 0) + s;
    });
    const ses = sessions.slice(-40).reverse().map(x => [x[0], x[1], x[2], Object.keys(x[3]), Object.keys(x[4]).sort((a, b) => x[4][b] - x[4][a]).slice(0, 3)]);
    const state = {};   /* per workbook: the pages covered and opened (from the latest progress snapshot) */
    rows_(prog_()).forEach(r => { if (resolve_(String(r[1]), A) !== to) return; const b = String(r[4]), [dn, sn, ln] = String(r[10] || '|').split('|');
      if (!state[b] || +r[5] >= state[b].cov) state[b] = { cov: +r[5], done: dn ? dn.split(',') : [], seen: sn ? sn.split(',') : [], later: ln ? ln.split(',') : [], pq: (() => { try { return JSON.parse(r[11] || '{}'); } catch (e) { return {}; } })(), at: new Date(r[0]).getTime() }; });
    const marked = {};   /* pages the teacher has marked: the latest mark per page (1 covered, 0 not) */
    rows_(awards_()).forEach(r => { if (String(r[1]) === to) marked[String(r[2]) + '|' + String(r[3])] = +r[4]; });
    return { ok: true, pages, topics, days, first, last, devices: Object.keys(devs).length, sessions: ses, state, marked };
  }
  if (q.action === 'award') {   /* the teacher marks (on=1) or unmarks (on=0) pages as covered for a pupil */
    const book = String(q.book || ''), pages = String(q.pages || '').split(',').filter(x => /^c\d{1,2}-p\d{1,3}$/.test(x)), on = q.on === '0' ? 0 : 1;
    if (!okId(to) || BOOKS.indexOf(book) < 0 || !pages.length) return { ok: false, error: 'bad request' };
    const sh = awards_(), now = new Date(); pages.forEach(p => sh.appendRow([now, to, book, p, on]));
    const ps = prog_(), r = rows_(ps), i = r.findIndex(x => String(x[1]) === to && String(x[4]) === book);
    if (i >= 0) { const [dn, sn, ln] = String(r[i][10] || '|').split('|'), done = applyAwards_(to, book, dn ? dn.split(',') : []), seen = (sn ? sn.split(',') : []).filter(x => done.indexOf(x) < 0), lat = (ln ? ln.split(',') : []).filter(x => done.indexOf(x) < 0);
      ps.getRange(i + 2, 6).setValue(done.length); ps.getRange(i + 2, 11).setValue(done.join(',') + '|' + seen.join(',') + '|' + lat.join(',')); }
    return { ok: true, n: pages.length };
  }
  if (q.action === 'approve' || q.action === 'decline') {   /* the teacher answers sign-up requests */
    if (!ids.length) return { ok: false, error: 'bad request' };
    ids.forEach(id => setAccess_(id, q.action === 'approve' ? 'approved' : 'declined'));
    return { ok: true };
  }
  if (q.action === 'testmail') { try { return { ok: true, to: testEmail() }; } catch (e) { mailNote_(e); return { ok: false, to: mailTo_(), error: String(e && e.message || e) }; } }
  if (q.action === 'pdata') {   /* "View as this pupil": their saved progress (the same copy their devices load) */
    if (!okId(to)) return { ok: false, error: 'bad request' };
    const sv = rows_(saves_()).find(x => String(x[0]) === 'P-' + to);
    return { ok: true, updated: sv ? new Date(sv[1]).getTime() : 0, data: sv ? sv.slice(3, 3 + PARTS).map(x => String(x || '').replace(/^~/, '')).join('') : '' };
  }
  if (q.action === 'resetpin') { if (!okId(to)) return { ok: false, error: 'bad request' }; dropPins_([to]); return { ok: true }; }   /* the pupil chooses a new PIN next time they sign in */
  if (q.action === 'rename') { if (!okId(to) || !q.name) return { ok: false, error: 'bad request' }; setName_(to, q.name, q.cls); return { ok: true }; }
  if (q.action === 'delete') {   /* remove their rows; a device that keeps sending starts a fresh record */
    if (!ids.length) return { ok: false, error: 'bad request' };
    const sh = log_(), keep = rows_(sh).filter(r => ids.indexOf(String(r[1])) < 0), n = sh.getLastRow() - 1;
    if (n > 0) sh.getRange(2, 1, n, LOG_HEAD.length).clearContent();
    if (keep.length) sh.getRange(2, 1, keep.length, LOG_HEAD.length).setValues(keep);
    const ps = prog_(), pk = rows_(ps).filter(r => ids.indexOf(String(r[1])) < 0), pn = ps.getLastRow() - 1;
    if (pn > 0) ps.getRange(2, 1, pn, PROG_HEAD.length).clearContent();
    if (pk.length) ps.getRange(2, 1, pk.length, PROG_HEAD.length).setValues(pk.map(x => x.slice(0, PROG_HEAD.length)));
    dropPins_(ids); dropAccess_(ids);
    const aws = awards_(), awr = rows_(aws); for (let i = awr.length - 1; i >= 0; i--) if (ids.indexOf(String(awr[i][1])) >= 0) aws.deleteRow(i + 2);
    const sv = saves_(), sr = rows_(sv); for (let i = sr.length - 1; i >= 0; i--) if (ids.indexOf(String(sr[i][0]).replace(/^P-/, '')) >= 0 && /^P-/.test(String(sr[i][0]))) sv.deleteRow(i + 2);
    dropNames_(ids);
    const al = tab_('Aliases', ['Old ID', 'Kept ID']), ak = rows_(al).filter(r => ids.indexOf(String(r[1])) < 0 && ids.indexOf(String(r[0])) < 0), an = al.getLastRow() - 1;
    if (an > 0) al.getRange(2, 1, an, 2).clearContent();
    if (ak.length) al.getRange(2, 1, ak.length, 2).setValues(ak);
    return { ok: true, removed: n - keep.length };
  }
  return { ok: false, error: 'unknown action' };
}
function relabel_(from, to) {
  const sh = log_(), n = sh.getLastRow() - 1; if (n < 1) return;
  const col = sh.getRange(2, 2, n, 1), v = col.getValues();
  let changed = false; v.forEach(r => { if (from.indexOf(String(r[0])) >= 0) { r[0] = to; changed = true; } });
  if (changed) col.setValues(v);
}
function relabelProg_(from, to) {   /* keep one row per workbook: the one with most pages covered */
  const sh = prog_(), r = rows_(sh); if (!r.length) return;
  const best = {}, keep = [];
  r.forEach(x => { if (!String(x[1])) return; if (from.indexOf(String(x[1])) >= 0) x[1] = to; const k = x[1] + '|' + x[4]; if (!best[k] || +x[5] > +best[k][5]) best[k] = x; });
  r.forEach(x => { const k = x[1] + '|' + x[4]; if (best[k] === x) keep.push(x); });
  sh.getRange(2, 1, r.length, PROG_HEAD.length).clearContent();
  if (keep.length) sh.getRange(2, 1, keep.length, PROG_HEAD.length).setValues(keep.map(x => x.slice(0, PROG_HEAD.length)));
}
function setName_(id, name, cls) {
  const sh = tab_('Names', ['Pupil ID', 'Name', 'Class']), r = rows_(sh), i = r.findIndex(x => String(x[0]) === id);
  const row = [id, clean_(name, 40), clean_(cls, 12).toUpperCase()];
  if (i >= 0) sh.getRange(i + 2, 1, 1, 3).setValues([row]); else sh.appendRow(row);
}
function dropNames_(ids) {
  const sh = tab_('Names', ['Pupil ID', 'Name', 'Class']), r = rows_(sh);
  for (let i = r.length - 1; i >= 0; i--) if (ids.indexOf(String(r[i][0])) >= 0) sh.deleteRow(i + 2);
}
/* ---------- WEEKLY REPORT: Monday to Sunday (UK time), per pupil: active time (and the week before), days used, what they
   worked on (per workbook and topic), chapter quizzes done that week, and pages covered so far. ---------- */
// CHAPTERS:BEGIN (topic titles, refreshed by notes/front/worksheets.py)
const CHAPTERS = {"U1|c01":"Digital data","U1|c02":"Software","U1|c03":"Database applications","U1|c04":"Spreadsheet applications","U1|c05":"Computer hardware","U1|c06":"Network technologies","U1|c07":"Cyberspace, network security and data transfer","U1|c08":"Cloud technology","U1|c09":"Ethical, legal and environmental impact","U1|c10":"Digital applications","U4|c01":"Contemporary trends in software development","U4|c02":"Digital data","U4|c03":"Digital design principles","U4|c04":"Programming constructs","U4|c05":"Simple error handling techniques","U4|c06":"Developing test plans and testing a solution","U4|c07":"Evaluation of digitally authored systems","U5|c01":"Getting set up","U5|c02":"Design","U5|c03":"Building it in Visual Studio","U5|c04":"Testing","U5|c05":"Evaluation","U5|c06":"Before you submit","AS1|c01":"Reasons for systems development","AS1|c02":"Analysis","AS1|c03":"System design, development and testing","AS1|c04":"System implementation","AS1|c05":"Alternative development approaches","AS1|c06":"Software projects","AS1|c07":"Security issues","AS1|c08":"Algorithms","AS1|c09":"Fundamentals of programming","AS1|c10":"Object-oriented programming","AS2|c01":"Data representation","AS2|c02":"Data and information","AS2|c03":"Architecture","AS2|c04":"User interface and data compression","AS2|c05":"Software","AS2|c06":"Web applications","AS2|c07":"Website development","A21|c01":"Network resources","A21|c02":"Protocols, transmission media and errors","A21|c03":"Databases","A21|c04":"AI, expert systems and robotics","A21|c05":"Mobile technology, data mining and the cloud","A21|c06":"Legislation and ethics","A22|c01":"Choose your project","A22|c02":"Design your database","A22|c03":"Getting started with Access","A22|c04":"Tables and relationships","A22|c05":"Queries","A22|c06":"Forms","A22|c07":"Reports","A22|c08":"VBA basics","A22|c09":"VBA task tutorials","A22|c10":"Booking system: tables, relationships and forms","A22|c11":"Booking system: the booking logic in VBA","A22|c12":"Booking system: reports, menu and finishing touches","A22|c13":"Your coursework: setting up the write-up","A22|c14":"Your coursework: the Analysis chapter","A22|c15":"Your coursework: the Design chapter","A22|c16":"Your coursework: the Testing and Evaluation chapter","A22|c17":"Your coursework: the User Guide, Appendix and Bibliography","A22|c18":"Tables and keys","A22|c19":"Relationships","A22|c20":"Queries","A22|c21":"Forms","A22|c22":"Reports","A22|c23":"Macros","A22|c24":"VBA quick recipes"};
// CHAPTERS:END
const UNIT_NAMES = { home: 'Home', U1: 'Unit 1', U4: 'Unit 4', U5: 'Unit 5', AS1: 'AS 1', AS2: 'AS 2', A21: 'A2 1', A22: 'A2 2' };
function dayOf_(t) { return Utilities.formatDate(new Date(t), 'Europe/London', 'yyyy-MM-dd'); }
function addDays_(ds, n) { const d = new Date(ds + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function mondayOf_(t) { const ds = dayOf_(t), d = new Date(ds + 'T12:00:00Z'); return addDays_(ds, -((d.getUTCDay() + 6) % 7)); }
function week_(start) {
  const mon = /^\d{4}-\d{2}-\d{2}$/.test(String(start || '')) ? mondayOf_(new Date(start + 'T12:00:00Z')) : mondayOf_(new Date()), prev = addDays_(mon, -7), sun = addDays_(mon, 6);
  const A = aliases_(), N = names_(), P = {}, cut = new Date(prev + 'T00:00:00Z').getTime() - 864e5, cutEnd = new Date(sun + 'T23:59:59Z').getTime() + 864e5;
  const get = id => P[id] || (P[id] = { id, name: '', cls: '', at: 0, secs: 0, prev: 0, days: {}, books: {}, chapters: {}, quizzes: [], prog: {} });
  for (const r of rows_(log_())) {
    const t = new Date(r[0]).getTime(), id = resolve_(String(r[1]), A), s = +r[6] || 0; if (!id || !s) continue;
    if (t < cut || t > cutEnd) { const p = get(id); if (t > p.at) { p.at = t; p.name = String(r[2]); p.cls = String(r[3]); } continue; }   // quick skip: well outside the two weeks
    const wk = mondayOf_(t); if (wk !== mon && wk !== prev) continue;
    const p = get(id); if (t >= p.at) { p.at = t; p.name = String(r[2]); p.cls = String(r[3]); }
    if (wk === prev) { p.prev += s; continue; }
    p.secs += s; p.days[dayOf_(t)] = 1;
    const b = String(r[4]); p.books[b] = (p.books[b] || 0) + s;
    const ch = String(r[5] || ''); if (b !== 'home' && ch) { const k = b + '|' + ch; p.chapters[k] = (p.chapters[k] || 0) + s; }
  }
  for (const r of rows_(prog_())) {
    const id = resolve_(String(r[1]), A); if (!id) continue; const p = get(id), b = String(r[4]);
    if (!p.name) { p.name = String(r[2]); p.cls = String(r[3]); }
    p.prog[b] = [+r[5], +r[7]];
    let q = {}; try { q = JSON.parse(r[9] || '{}'); } catch (x) { }
    Object.keys(q).forEach(k => { const v = q[k]; if (v[2] >= mon && v[2] <= sun) p.quizzes.push([b, k, v[0], v[1], v[2]]); });
  }
  const pupils = Object.keys(P).map(id => { const p = P[id]; if (N[id]) { p.name = N[id][0] || p.name; p.cls = N[id][1] || p.cls; }
    p.days = Object.keys(p.days).length;
    p.chapters = Object.keys(p.chapters).map(k => [k, CHAPTERS[k] || '', p.chapters[k]]).sort((a, b) => b[2] - a[2]);
    delete p.at; return p; }).filter(p => p.name);
  return { ok: true, start: mon, end: sun, pupils };
}
function ensureWeekly_() {   /* the Monday email: its trigger is made the first time the Teacher area opens after this code is deployed */
  try {
    const has = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'weeklyEmail');
    if (WEEKLY_EMAIL && !has) ScriptApp.newTrigger('weeklyEmail').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).inTimezone('Europe/London').create();
  } catch (e) { }
}
function weeklyEmail() {   /* runs every Monday about 7am: last week's report (you can also run it by hand from the editor) */
  if (!WEEKLY_EMAIL) return;
  const w = week_(addDays_(mondayOf_(new Date()), -7)), to = mailTo_(); if (!to) return;
  const esc = esc_, B = BRAND;
  const hm = s => { const m = Math.round(s / 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0'); };
  const nice = ds => Utilities.formatDate(new Date(ds + 'T12:00:00Z'), 'Europe/London', 'EEE d MMM');
  const all = w.pupils.slice().sort((a, b) => a.cls.localeCompare(b.cls) || b.secs - a.secs || a.name.localeCompare(b.name));
  const active = all.filter(p => p.secs > 0), tot = active.reduce((a, p) => a + p.secs, 0), prevTot = all.reduce((a, p) => a + p.prev, 0);
  const classes = [...new Set(all.map(p => p.cls))];
  const tile = (big, small) => `<td width="33%" style="padding:4px"><div style="background:${B.soft};border:1px solid ${B.line};border-radius:8px;padding:12px 10px;text-align:center">
      <div style="font-size:22px;font-weight:bold;color:${B.blue}">${big}</div><div style="font-size:12px;color:${B.muted};margin-top:2px">${small}</div></div></td>`;
  const diff = tot - prevTot, dTxt = prevTot ? (diff >= 0 ? `▲ ${hm(diff)} on the week before` : `▼ ${hm(-diff)} on the week before`) : 'no data for the week before';
  const th = `style="text-align:left;padding:8px;background:${B.ink};color:#FFFFFF;font-size:12px;font-weight:bold"`, td = `style="padding:8px;border-bottom:1px solid ${B.line};vertical-align:top;font-size:13px;color:${B.ink}"`;
  let h = `<p style="margin:0 0 6px;color:${B.muted}">${nice(w.start)} to ${nice(w.end)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px"><tr>
      ${tile(`${active.length}<span style="font-size:14px;color:${B.muted}"> / ${all.length}</span>`, 'pupils revised')}${tile(hm(tot), 'revision in all')}${tile(active.length ? hm(tot / active.length) : '–', 'average per pupil')}
    </tr></table><p style="margin:4px 0 0;font-size:13px;color:${diff >= 0 ? '#127A3A' : '#B42318'}">${dTxt}</p>`;
  classes.forEach(c => {
    const ps = all.filter(p => p.cls === c), act = ps.filter(p => p.secs > 0), idle = ps.filter(p => !p.secs);
    h += `<h2 style="margin:26px 0 8px;font-size:17px;color:${B.ink};border-left:4px solid ${B.blue};padding-left:10px">${esc(c || 'No class')}
      <span style="font-weight:normal;color:${B.muted};font-size:13px"> · ${act.length} of ${ps.length} revised · ${hm(act.reduce((a, p) => a + p.secs, 0))}</span></h2>`;
    if (act.length) {
      h += `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;border:1px solid ${B.line}"><tr><th ${th}>Pupil</th><th ${th}>Time</th><th ${th}>Days</th><th ${th}>Worked on</th><th ${th}>Quizzes</th></tr>`;
      act.forEach((p, i) => {
        const d = p.secs - p.prev, trend = p.prev ? (d >= 0 ? `<span style="color:#127A3A">▲ ${hm(d)}</span>` : `<span style="color:#B42318">▼ ${hm(-d)}</span>`) : `<span style="color:${B.muted}">new</span>`;
        const work = p.chapters.slice(0, 3).map(x => { const [b, ch] = x[0].split('|'); return `${esc(UNIT_NAMES[b] || b)} ch ${+ch.replace(/\D/g, '')}${x[1] ? ' ' + esc(x[1]) : ''} <span style="color:${B.muted}">(${hm(x[2])})</span>`; }).join('<br>') || `<span style="color:${B.muted}">Home page only</span>`;
        const qz = p.quizzes.map(q => { const [cid, pp] = q[1].split('|'); return `${esc(UNIT_NAMES[q[0]] || q[0])} ch ${+cid.replace(/\D/g, '')}${pp ? ' (past papers)' : ''}: <b>${q[2]}/${q[3]}</b>`; }).join('<br>') || `<span style="color:${B.muted}">–</span>`;
        h += `<tr style="background:${i % 2 ? '#F7F9FC' : '#FFFFFF'}"><td ${td}><b>${esc(p.name)}</b></td><td ${td} nowrap><span style="white-space:nowrap">${hm(p.secs)}</span><br><small>${trend}</small></td><td ${td}>${p.days}</td><td ${td}>${work}</td><td ${td}>${qz}</td></tr>`;
      });
      h += '</table>';
    }
    if (idle.length) h += `<p style="margin:8px 0 0;font-size:13px;color:#B42318;background:#FDF0EF;border-radius:6px;padding:8px 10px"><b>No revision this week:</b> ${idle.map(p => esc(p.name)).join(', ')}</p>`;
  });
  if (!all.length) h += `<p style="margin:18px 0 0">No pupils have used the site yet.</p>`;
  const html = mailHtml_({ title: 'Weekly revision report', wide: true, preheader: `${active.length} of ${all.length} pupils revised, ${hm(tot)} in all (${nice(w.start)} to ${nice(w.end)}).`,
    body: h, button: ['See every pupil in detail', SITE + 'teacher.html#visits'],
    foot: 'To stop this email, set WEEKLY_EMAIL to false in the Apps Script and deploy a new version.' });
  try { MailApp.sendEmail({ to, name: B.name, subject: `Weekly revision report: ${nice(w.start)} to ${nice(w.end)}`, htmlBody: html, body: `${active.length} of ${all.length} pupils revised, ${hm(tot)} in all. Open the email in HTML view, or see ${SITE}teacher.html#visits` }); mailNote_(null); } catch (e) { mailNote_(e); }
}
/* teacher marks: Awards sheet [When, Pupil ID, Unit, Page, 1 = covered / 0 = not covered] */
const awards_ = () => tab_('Awards', ['When', 'Pupil ID', 'Unit', 'Page', 'Covered (1) / not (0)']);
function applyAwards_(id, book, done) {
  const set = {}; done.forEach(p => { set[p] = 1; });
  rows_(awards_()).forEach(r => { if (String(r[1]) !== id || String(r[2]) !== book) return; if (+r[4]) set[String(r[3])] = 1; else delete set[String(r[3])]; });
  return Object.keys(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
function awardsFor_(id, since) {
  if (!okId(id)) return { ok: false };
  const A = aliases_(), me = resolve_(String(id), A);
  return { ok: true, awards: rows_(awards_()).filter(r => String(r[1]) === me && new Date(r[0]).getTime() > since).map(r => [new Date(r[0]).getTime(), String(r[2]), String(r[3]), +r[4]]) };
}
function summary_() {
  const PN = {}; rows_(pins_()).forEach(r => { PN[String(r[0])] = 1; });
  const rows = rows_(log_()), A = aliases_(), N = names_(), now = Date.now(), WEEK = 7 * 864e5, P = {};
  for (const r of rows) {
    const t = new Date(r[0]).getTime(), id = resolve_(String(r[1]), A), s = +r[6] || 0; if (!id || !s) continue;
    const p = P[id] || (P[id] = { id, name: '', cls: '', typed: {}, total: 0, week: 0, last: 0, first: t, days: {}, units: {} });
    if (t >= p.last) { p.name = String(r[2]); p.cls = String(r[3]); p.last = t; }
    p.typed[String(r[2]) + ' (' + String(r[3]) + ')'] = 1;
    p.first = Math.min(p.first, t); p.total += s; if (now - t < WEEK) p.week += s;
    p.days[Utilities.formatDate(new Date(t), 'Europe/London', 'yyyy-MM-dd')] = 1;
    const u = String(r[4]); p.units[u] = (p.units[u] || 0) + s;
  }
  for (const r of rows_(prog_())) {
    const id = resolve_(String(r[1]), A); if (!id) continue;
    const p = P[id] || (P[id] = { id, name: String(r[2]), cls: String(r[3]), typed: {}, total: 0, week: 0, last: 0, first: 0, days: {}, units: {} });
    p.prog = p.prog || {}; const u = String(r[4]), old = p.prog[u];
    if (!old || +r[5] >= old.cov) { let q = {}; try { q = JSON.parse(r[9] || '{}'); } catch (x) { } p.prog[u] = { cov: +r[5], seen: +r[6], total: +r[7], tr: +r[8], quiz: q, at: new Date(r[0]).getTime() }; }
  }
  const pupils = Object.keys(P).map(k => { const p = P[k]; p.days = Object.keys(p.days).length; p.typed = Object.keys(p.typed);
    if (N[k]) { p.name = N[k][0] || p.name; p.cls = N[k][1] || p.cls; p.fixed = true; } p.pin = !!PN[k]; return p; });
  const AC = {}; rows_(acc_()).forEach(r => { AC[String(r[0])] = r; });
  pupils.forEach(p => { p.access = AC[p.id] ? String(AC[p.id][1]) : 'approved'; });
  const known = {}; pupils.forEach(p => { known[p.id] = 1; });
  const requests = Object.keys(AC).filter(id => String(AC[id][1]) === 'pending').map(id => ({ id, name: String(AC[id][2]), cls: String(AC[id][3]), at: new Date(AC[id][4]).getTime() }));
  return { pupils, requests, updated: now, v: SCRIPT_VERSION, mail: EMAIL_SIGNINS ? mailState_() : null };
}
