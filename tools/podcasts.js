// Writes notes/podcasts/<lesson id>.json: every lesson's two-host podcast script (from course.js + scripts.js), so the revision
// workbooks can play a podcast in their own mini player (speech, or the recorded mp3 where audio/<id>.json exists).
// Run: node tools/podcasts.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.dirname(__dirname), out = {};
for (const dir of ['', 'gce/']) {
  const ctx = { window: {}, console }; ctx.global = ctx.window; vm.createContext(ctx);
  for (const f of ['course.js', 'scripts.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, dir, f), 'utf8').replace(/\(typeof window !== "undefined" \? window : global\)/g, '(window)'), ctx);
  const C = ctx.window.COURSE; if (!C || !C.media) continue;
  const noA = C.noAudio || [];
  for (const l of C.lessons) {
    let lines; try { lines = C.media.podcast(l); } catch (e) { continue; }
    const rec = noA.indexOf(l.id) < 0 && fs.existsSync(path.join(ROOT, dir, 'audio', l.id + '.json')) && fs.existsSync(path.join(ROOT, dir, 'audio', l.id + '-podcast.mp3'));
    let marks = null; if (rec) { try { marks = (JSON.parse(fs.readFileSync(path.join(ROOT, dir, 'audio', l.id + '.json'), 'utf8')).podcast || []).map(m => m[0]); } catch (e) { } }
    out[l.id] = { t: l.title, h: C.media.hosts, l: lines.map(x => [x.who ? 1 : 0, x.text, x.pause || 0]), a: rec && marks ? dir + 'audio/' + l.id + '-podcast.mp3' : '', m: rec && marks ? marks : undefined };
  }
}
const D = path.join(ROOT, 'notes', 'podcasts'); fs.mkdirSync(D, { recursive: true });
for (const f of fs.readdirSync(D)) if (/\.json$/.test(f)) fs.unlinkSync(path.join(D, f));
for (const id in out) fs.writeFileSync(path.join(D, id + '.json'), JSON.stringify(out[id]));
console.log('notes/podcasts:', Object.keys(out).length, 'lessons,', Object.values(out).filter(x => x.a).length, 'with recordings');
