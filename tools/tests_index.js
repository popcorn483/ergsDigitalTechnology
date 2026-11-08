/* Topic tests: tidy every question bank in tests/<UNIT>/<topic>.json and list them in tests/index.json
   (read by the Teacher area's "Set a topic test" form and the home page).
   Adds each bank's section names (the workbook pages its questions come from) so a pupil's results can say what to revise.
   Run after adding or editing a bank:  node tools/tests_index.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), TD = path.join(ROOT, 'tests');
const books = {};
function book(id) {
  if (id in books) return books[id];
  let B = null;
  try { const line = fs.readFileSync(path.join(ROOT, 'notes', id + '.html'), 'utf8').split('\n').find(l => l.startsWith('const BOOK = ')); B = line ? (0, eval)('(' + line.slice(13).replace(/;\s*$/, '') + ')') : null; } catch (e) { }
  return (books[id] = B);
}
const strip = s => String(s || '').replace(/<[^>]+>/g, '').replace(/\[\[([^\]|]*)(\|[^\]]*)?\]\]/g, '$1').replace(/\*\*/g, '').trim();
const ORDER = ['Y8', 'Y9', 'Y10', 'Y0', 'U1', 'U4', 'U5', 'AS1', 'AS2', 'A21', 'A22'];
const list = [];
for (const u of fs.existsSync(TD) ? fs.readdirSync(TD) : []) {
  const ud = path.join(TD, u); if (!fs.statSync(ud).isDirectory()) continue;
  for (const f of fs.readdirSync(ud).filter(f => /^c\d{2}\.json$/.test(f)).sort()) {
    const p = path.join(ud, f); let T; try { T = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { console.error('skipped (not JSON):', p); continue; }
    const B = book(u), ch = B && B.chapters.find(c => c.id === T.ch);
    if (ch) { T.title = T.title || ch.title; T.n = ch.n; T.pages = {}; ch.pages.forEach(pg => { T.pages[pg.id] = strip(pg.spec || pg.title || pg.id); }); }
    T.book = u; T.ch = f.slice(0, 3);
    const out = JSON.stringify(Object.assign({ book: T.book, ch: T.ch, n: T.n, title: T.title }, T.slug ? { slug: T.slug } : {}, { pages: T.pages, q: T.q }));
    if (out !== fs.readFileSync(p, 'utf8')) fs.writeFileSync(p, out);
    list.push({ book: u, ch: T.ch, n: T.n || +T.ch.slice(1), title: T.title, q: (T.q || []).length });
  }
}
list.sort((a, b) => (ORDER.indexOf(a.book) - ORDER.indexOf(b.book)) || a.ch.localeCompare(b.ch));
fs.writeFileSync(path.join(TD, 'index.json'), JSON.stringify({ tests: list }, null, 1) + '\n');
console.log('tests/index.json:', list.length, 'topic tests');
