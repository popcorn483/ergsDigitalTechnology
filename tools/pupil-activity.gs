/* Mr B's Digital Technology Revision: pupil activity log (Google Apps Script web app).

   The revision site sends each pupil's ACTIVE time (the page on screen and in use, not just left open) with the name
   and class they typed in. This script adds it to a "Log" sheet and gives the Teacher area a summary, protected by your key.
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

   Sheets it uses: Log (one row per few minutes of use), Aliases (merged pupil IDs: old ID -> kept ID, so a device that
   still sends the old ID is counted under the kept pupil) and Names (the name and class you chose for a pupil). */

const TEACHER_KEY = 'change-me';
const BOOKS = ['home', 'U1', 'U4', 'U5', 'AS1', 'AS2', 'A21', 'A22'];
const LOG_HEAD = ['When', 'Pupil ID', 'Name', 'Class', 'Unit', 'Topic', 'Active seconds'];

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
const log_ = () => tab_('Log', LOG_HEAD);
const rows_ = sh => sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues() : [];
function aliases_() { const m = {}; rows_(tab_('Aliases', ['Old ID', 'Kept ID'])).forEach(r => { m[String(r[0])] = String(r[1]); }); return m; }
function names_() { const m = {}; rows_(tab_('Names', ['Pupil ID', 'Name', 'Class'])).forEach(r => { m[String(r[0])] = [String(r[1]), String(r[2])]; }); return m; }
function resolve_(id, A) { let k = 0; while (A[id] && k++ < 20) id = A[id]; return id; }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function locked_(fn) { const l = LockService.getScriptLock(); l.waitLock(20000); try { return fn(); } finally { l.releaseLock(); } }
const okId = id => /^[a-z0-9]{6,24}$/i.test(String(id || ''));

/* the site posts { id, name, cls, book, ch, s } */
function doPost(e) {
  let d; try { d = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false }); }
  const s = Math.round(+d.s || 0), book = String(d.book || '');
  if (!(s > 0 && s <= 3600) || BOOKS.indexOf(book) < 0 || !okId(d.id)) return out_({ ok: false });
  const name = clean_(d.name, 40); if (!name) return out_({ ok: false });
  locked_(() => { const id = resolve_(String(d.id), aliases_()); log_().appendRow([new Date(), id, name, clean_(d.cls, 12).toUpperCase(), book, clean_(d.ch, 8), s]); });
  return out_({ ok: true });
}

/* the Teacher area: ?key=… gives one summary row per pupil; &action=merge|rename|delete changes them */
function doGet(e) {
  const q = (e && e.parameter) || {};
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
    relabel_(from, to);
    dropNames_(from);
    if (q.name) setName_(to, q.name, q.cls);
    return { ok: true };
  }
  if (q.action === 'rename') { if (!okId(to) || !q.name) return { ok: false, error: 'bad request' }; setName_(to, q.name, q.cls); return { ok: true }; }
  if (q.action === 'delete') {   /* remove their rows; a device that keeps sending starts a fresh record */
    if (!ids.length) return { ok: false, error: 'bad request' };
    const sh = log_(), keep = rows_(sh).filter(r => ids.indexOf(String(r[1])) < 0), n = sh.getLastRow() - 1;
    if (n > 0) sh.getRange(2, 1, n, LOG_HEAD.length).clearContent();
    if (keep.length) sh.getRange(2, 1, keep.length, LOG_HEAD.length).setValues(keep);
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
  const pupils = Object.keys(P).map(k => { const p = P[k]; p.days = Object.keys(p.days).length; p.typed = Object.keys(p.typed);
    if (N[k]) { p.name = N[k][0] || p.name; p.cls = N[k][1] || p.cls; p.fixed = true; } return p; });
  return { pupils, updated: now };
}
