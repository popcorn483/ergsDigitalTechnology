/* Mr B's Digital Technology Revision: pupil activity log (Google Apps Script web app).

   The revision site sends each pupil's ACTIVE time (the page on screen and in use, not just left open) with the name
   and class they typed in. This script adds it to a "Log" sheet and gives the Teacher area a summary, protected by your key.

   SET UP (about 5 minutes, once):
   1. Make a new Google Sheet (ideally in your school Google account), e.g. "Revision site activity".
   2. Extensions › Apps Script. Delete what is there, paste in this whole file and save.
   3. Change TEACHER_KEY below to a password of your own (letters and numbers, no spaces). Save again.
   4. Deploy › New deployment › type "Web app". Execute as: Me. Who has access: Anyone. Deploy, allow access when asked,
      and copy the Web app URL (it ends in /exec).
   5. In the GitHub repo, open activity.json (top level), edit it and paste the URL between the quotes after "url". Commit.
   6. In the Teacher area › Pupils, type the same TEACHER_KEY once on your device.
   If you change this code later, use Deploy › Manage deployments › Edit › New version, so the URL stays the same. */

const TEACHER_KEY = 'change-me';
const BOOKS = ['home', 'U1', 'U4', 'U5', 'AS1', 'AS2', 'A21', 'A22'];

function clean_(v, n) {
  let s = String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
  if (/^[=+\-@]/.test(s)) s = "'" + s;   // never let a pupil's text become a spreadsheet formula
  return s;
}
function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Log');
  if (!sh) { sh = ss.insertSheet('Log'); sh.appendRow(['When', 'Pupil ID', 'Name', 'Class', 'Unit', 'Topic', 'Active seconds']); sh.setFrozenRows(1); }
  return sh;
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* the site posts { id, name, cls, book, ch, s } */
function doPost(e) {
  let d; try { d = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false }); }
  const s = Math.round(+d.s || 0), book = String(d.book || '');
  if (!(s > 0 && s <= 3600) || BOOKS.indexOf(book) < 0 || !/^[a-z0-9]{6,24}$/i.test(String(d.id || ''))) return out_({ ok: false });
  const name = clean_(d.name, 40); if (!name) return out_({ ok: false });
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { sheet_().appendRow([new Date(), clean_(d.id, 24), name, clean_(d.cls, 12).toUpperCase(), book, clean_(d.ch, 8), s]); }
  finally { lock.releaseLock(); }
  return out_({ ok: true });
}

/* the Teacher area asks for ?key=…: one summary row per pupil */
function doGet(e) {
  if (!e || !e.parameter || e.parameter.key !== TEACHER_KEY || TEACHER_KEY === 'change-me') return out_({ error: 'key' });
  const rows = sheet_().getDataRange().getValues().slice(1), now = Date.now(), WEEK = 7 * 864e5, P = {};
  for (const r of rows) {
    const t = new Date(r[0]).getTime(), id = String(r[1]), s = +r[6] || 0; if (!id || !s) continue;
    const p = P[id] || (P[id] = { id, name: '', cls: '', total: 0, week: 0, last: 0, first: t, days: {}, units: {} });
    if (t >= p.last) { p.name = String(r[2]); p.cls = String(r[3]); p.last = t; }
    p.first = Math.min(p.first, t); p.total += s; if (now - t < WEEK) p.week += s;
    p.days[Utilities.formatDate(new Date(t), 'Europe/London', 'yyyy-MM-dd')] = 1;
    const u = String(r[4]); p.units[u] = (p.units[u] || 0) + s;
  }
  const pupils = Object.keys(P).map(k => { const p = P[k]; p.days = Object.keys(p.days).length; return p; });
  return out_({ pupils, updated: now });
}
