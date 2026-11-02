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

   UPDATING this code later: paste the new version over the old one (keep your TEACHER_KEY line), save, then
   Deploy › Manage deployments › pencil (Edit) › Version: New version › Deploy. The URL stays the same.

   Sheets it uses: Log (one row per few minutes of use, per page), Progress (one row per pupil per workbook: pages covered,
   best chapter-quiz scores, trophies), Saves (saved progress: under a save code, or P-<pupil ID>), Pins (each pupil's
   4-digit PIN as a salted hash, never the PIN itself), Aliases (merged pupil IDs: old ID -> kept ID, so a device that
   still sends the old ID is counted under the kept pupil) and Names (the name and class you chose for a pupil). */

const TEACHER_KEY = 'change-me';
const BOOKS = ['home', 'U1', 'U4', 'U5', 'AS1', 'AS2', 'A21', 'A22'];
const LOG_HEAD = ['When', 'Pupil ID', 'Name', 'Class', 'Unit', 'Topic', 'Active seconds', 'Page'];
const PROG_HEAD = ['Updated', 'Pupil ID', 'Name', 'Class', 'Unit', 'Pages covered', 'Pages opened', 'Pages in unit', 'Trophies', 'Best quiz scores'];

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
const prog_ = () => tab_('Progress', PROG_HEAD);
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
  const hits = summary_().pupils.filter(p => norm_(p.name, p.cls) === want || (p.typed || []).some(t => { const m = /^(.*) \(([^)]*)\)$/.exec(t); return m && norm_(m[1], m[2]) === want; }));
  if (!hits.length) {
    if (!okId(devId)) return { ok: false };
    const id = resolve_(String(devId), aliases_()), had = getPin_(id);
    if (had && had !== pinHash_(id, pin)) return { ok: false, error: 'pin' };
    locked_(() => setPin_(id, pin));
    return { ok: true, id, fresh: true };
  }
  const p = hits.sort((a, b) => b.total - a.total)[0], cache = CacheService.getScriptCache(), fk = 'fail:' + p.id, fails = +(cache.get(fk) || 0);
  if (fails >= 5) return { ok: false, error: 'locked' };
  const had = getPin_(p.id);
  if (had && had !== pinHash_(p.id, pin)) { cache.put(fk, String(fails + 1), 900); return { ok: false, error: 'pin', left: 4 - fails }; }
  if (!had) locked_(() => setPin_(p.id, pin));
  cache.remove(fk);
  const sv = rows_(saves_()).find(x => String(x[0]) === 'P-' + p.id);
  return { ok: true, id: p.id, name: p.name, cls: p.cls, updated: sv ? new Date(sv[1]).getTime() : 0, data: sv ? sv.slice(3, 3 + PARTS).map(x => String(x || '').replace(/^~/, '')).join('') : '' };
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
      const row = [new Date(), id, name, clean_(d.cls, 12).toUpperCase(), book, n(d.cov), n(d.seen), n(d.total), n(d.tr), JSON.stringify(q)];
      if (i >= 0) sh.getRange(i + 2, 1, 1, row.length).setValues([row]); else sh.appendRow(row); });
    return out_({ ok: true });
  }
  if (!(s > 0 && s <= 3600)) return out_({ ok: false });
  locked_(() => { const id = resolve_(String(d.id), aliases_()); log_().appendRow([new Date(), id, name, clean_(d.cls, 12).toUpperCase(), book, clean_(d.ch, 8), s, clean_(d.pg, 12)]); });
  return out_({ ok: true });
}

/* the Teacher area: ?key=… gives one summary row per pupil; &action=merge|rename|delete changes them */
function doGet(e) {
  const q = (e && e.parameter) || {};
  if (q.action === 'load') return out_(load_(String(q.code || '').toUpperCase().trim()));   /* pupils: no key needed, just their save code */
  if (q.action === 'whois') return out_(whois_(q.name, q.cls, q.pin, q.id));   /* pupils signing in: find them by name and form class */
  if (q.key !== TEACHER_KEY || TEACHER_KEY === 'change-me') return out_({ error: 'key' });
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
    dropNames_(from); dropPins_(from);
    if (q.name) setName_(to, q.name, q.cls);
    return { ok: true };
  }
  if (q.action === 'detail') {   /* one pupil: active seconds per unit|page */
    if (!okId(to)) return { ok: false, error: 'bad request' };
    const A = aliases_(), pages = {};
    rows_(log_()).forEach(r => { if (resolve_(String(r[1]), A) !== to) return; const k = String(r[4]) + '|' + (String(r[7] || '') || String(r[5] || '')); pages[k] = (pages[k] || 0) + (+r[6] || 0); });
    return { ok: true, pages };
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
    if (pk.length) ps.getRange(2, 1, pk.length, PROG_HEAD.length).setValues(pk);
    dropPins_(ids);
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
  if (keep.length) sh.getRange(2, 1, keep.length, PROG_HEAD.length).setValues(keep);
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
  return { pupils, updated: now };
}
