"""Build the KS3 notes books notes/Y8.html, notes/Y9.html and notes/Y10.html.

Each book is the same reader as the GCSE workbooks (notes/U1.html is the template), with the KS3 content swapped in from
ks3/books/Y8.json etc. ({"chapters": [...], "glossary": [...]}) and a few KS3 changes:
  - "back" goes to ks3.html, the course is KS3, and there are no past papers, trophies or CCEA links;
  - each chapter's PowerPoint comes from the topic's ks3/ folder (ks3/manifest.json), viewed as its PDF copy.
Run after editing a book's JSON (or after the GCSE template changes): python3 tools/ks3_books.py
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..')
TEMPLATE = os.path.join(ROOT, 'notes', 'U1.html')
YEARS = {'Y8': 'Year 8', 'Y9': 'Year 9', 'Y10': 'Year 10'}
# notes/Y0.html: a teacher preview of the topics in the library that no year teaches (made by tools/ks3_plan.py)
PREVIEW = {'Y0': 'Topic library'}
NAMES = dict(YEARS, **PREVIEW)
BLURB = {'Y8': 'Starting out: the school network and email, staying safe in the computer room, what is inside a computer, and staying safe online',
         'Y9': 'Computer graphics and Photoshop, building web pages with HTML and CSS, and programming the BBC micro:bit',
         'Y10': 'Inside the computer and binary, designing your own game in GameMaker, and programming in C#'}

# the hand-written blurb fits the topics it was written for; after a swap (Teacher area › KS3 topics) it is made from the titles
BLURB_FOR = {'Y8': ['Introduction & MySchool', 'Safety in the Classroom', 'Hardware & Software', 'Online Safety'],
             'Y9': ['Computer Graphics', 'Web Design', 'Micro:bits'], 'Y10': ['Under the Hood', 'Game Design', 'Programming']}


def blurb(yid, chapters):
    t = [c['title'] for c in chapters]
    if yid in PREVIEW: return 'Teacher preview: KS3 topics in the library that no year is teaching at the moment'
    if t == BLURB_FOR.get(yid): return BLURB[yid]
    return (', '.join(t[:-1]) + ' and ' + t[-1]) if len(t) > 1 else (t[0] if t else '')


# Code put into every KS3 book, just before the reader starts. It runs after BOOK, BK and COURSE exist.
KS3_JS = r'''
/* ---------- KS3 (Years 8, 9, 10): built by tools/ks3_books.py ---------- */
const KS3 = /^Y\d+$/.test(BK.id || '');
'''


def esc_script(s):
    return s.replace('</', '<\\/')


def build(yid, data, tpl, manifest):
    lessons = {}
    ytopics = next((y['topics'] for y in manifest.get('years', []) if y['year'] == NAMES[yid]), [])
    for i, ch in enumerate(data['chapters']):
        if i < len(ytopics):
            ch['ks3'] = ytopics[i]['id']   # the topic id in ks3/manifest.json, e.g. 8-01
        ch.setdefault('links', {})
        ch['topic'] = f"K{yid[1:]}-{ch['n']}"   # icons/K8-1.png
        pod = f"K{yid[1:]}C{ch['n']}"
        if os.path.exists(os.path.join(ROOT, 'notes', 'podcasts', pod + '.json')):
            lessons[pod] = ch['title']
            for p in ch['pages']:
                p['lessons'] = [pod]
    book = {'book': {'id': yid, 'title': f'{NAMES[yid]}: Digital Technology', 'qual': 'KS3 Digital Technology', 'hub': '',
                     'edition': '2026–27', 'mode': 'notes', 'blurb': blurb(yid, data['chapters']), 'lessonNames': lessons},
            'chapters': data['chapters'], 'glossary': sorted(data['glossary'], key=lambda g: g['term'].lower())}
    lines = tpl.split('\n')
    i = next(n for n, l in enumerate(lines) if l.startswith('const BOOK = '))
    old = json.loads(lines[i][len('const BOOK = '):].rstrip().rstrip(';'))
    book['illus'] = old.get('illus', {})
    lines[i] = 'const BOOK = ' + esc_script(json.dumps(book, ensure_ascii=False, separators=(',', ':'))) + ';'
    html = '\n'.join(lines)
    html = re.sub(r'<title>[^<]*</title>', f'<title>{NAMES[yid]}: Digital Technology</title>', html, count=1)
    for a, b in PATCHES:
        if a not in html:
            sys.exit(f'template changed, patch not found: {a[:80]}')
        html = html.replace(a, b, 1)
    return html


PATCHES = [
    # the course: KS3 (back to ks3.html)
    ("const COURSE = /GCE/.test(BK.qual || '') || /^(AS|A2)/.test(BK.id || '') ? 'gce' : 'gcse';",
     "const COURSE = /^Y\\d+$/.test(BK.id || '') ? 'ks3' : /GCE/.test(BK.qual || '') || /^(AS|A2)/.test(BK.id || '') ? 'gce' : 'gcse';" + KS3_JS),
    ("  a.href = (ON_WEB ? '../index.html' : FRONT_WEB) + '#' + COURSE;",
     "  a.href = COURSE === 'ks3' ? '../index.html#ks3' : (ON_WEB ? '../index.html' : FRONT_WEB) + '#' + COURSE;"),
    ("a.setAttribute('aria-label', `Topics: back to the ${COURSE === 'gce' ? 'A level' : 'GCSE'} topic list`);",
     "a.setAttribute('aria-label', `Topics: back to the ${COURSE === 'gce' ? 'A level' : COURSE === 'ks3' ? 'KS3' : 'GCSE'} topic list`);"),
    # trophies: a KS3 cabinet shared by Years 8, 9 and 10 (no coursework book)
    ("const TR_COURSE = { gcse: { name: 'GCSE', theory: ['U1', 'U4'], cw: 'U5' }, gce: { name: 'A level', theory: ['AS1', 'AS2', 'A21'], cw: 'A22' } };",
     "const TR_COURSE = { gcse: { name: 'GCSE', theory: ['U1', 'U4'], cw: 'U5' }, gce: { name: 'A level', theory: ['AS1', 'AS2', 'A21'], cw: 'A22' }, ks3: { name: 'KS3', theory: ['Y8', 'Y9', 'Y10'], cw: null } };"),
    ("const TR_SHORT = { U1: 'Unit 1',", "const TR_SHORT = { Y8: 'Year 8', Y9: 'Year 9', Y10: 'Year 10', U1: 'Unit 1',"),
    ("const TR_TAG = { U1: 'U1',", "const TR_TAG = { Y8: 'Y8', Y9: 'Y9', Y10: 'Y10', U1: 'U1',"),
    ("const trCourseOf = id => TR_COURSE.gce.theory.includes(id)", "const trCourseOf = id => /^Y\\d+$/.test(id || '') ? 'ks3' : TR_COURSE.gce.theory.includes(id)"),
    ("  scope.concat(C.cw).forEach(id => { caches[id] = live", "  scope.concat(C.cw ? [C.cw] : []).forEach(id => { caches[id] = live"),
    ("  const per = {}; scope.concat(C.cw).forEach(id => {", "  const per = {}; scope.concat(C.cw ? [C.cw] : []).forEach(id => {"),
    ("  const cwMissing = !TR_CW && !cwDefs.length;", "  const cwMissing = !TR_CW && !cwDefs.length && !!C.cw;"),
    ("${sc.concat(C.cw).map(u => `<span class=\"tr-pu", "${sc.concat(C.cw ? [C.cw] : []).map(u => `<span class=\"tr-pu"),
    (" ${esc(TR_SHORT[C.cw])} has its own 100 coursework trophies.`}", "${C.cw ? ` ${esc(TR_SHORT[C.cw])} has its own 100 coursework trophies.` : ''}`}"),
    # podcasts: one episode per chapter (notes/podcasts/K8C1.json …), a Podcast tile on every page of the chapter;
    # no GCSE lesson diagrams or hub links for KS3 lesson ids
    ("function lessonHTML(p) {\n  if (ACCESS_BOOK) return '';", "function lessonHTML(p) {\n  if (ACCESS_BOOK || KS3) return '';"),
    ("    if (hub) tile('pod', 'Podcast', 'Listen', b =>", "    if (hub || (KS3 && ids.length)) tile('pod', 'Podcast', KS3 ? 'Listen to this topic' : 'Listen', b =>"),
    # "How to revise this": no past papers in KS3
    ("    try { if (typeof cqUnlocked === 'function' && cqUnlocked(P.ch)) out.push('past'); } catch (e) { }",
     "    try { if (!KS3 && typeof cqUnlocked === 'function' && cqUnlocked(P.ch)) out.push('past'); } catch (e) { }"),
    # PowerPoints: from the topic's ks3/ folder
    ("function findSlides(ch) {\n",
     """function findSlides(ch) {
  if (KS3) {   /* KS3: the topic's LESSON file(s) in ks3/manifest.json; viewed as the PDF copy */
    const key = 'ks3/' + ch.id;
    if (!SLIDES.has(key)) SLIDES.set(key, (async () => {
      if (!ON_WEB || !ch.ks3) return null;
      const m = await fetch('../ks3/manifest.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
      let t = null; ((m && m.years) || []).forEach(y => (y.topics || []).forEach(x => { if (x.id === ch.ks3) t = x; }));
      const fs = ((t && t.files) || []).filter(f => f.kind === 'LESSON' && (f.path || f.url)); if (!fs.length) return null;
      const one = f => { if (!f.path) return { link: f.url, name: f.name }; const rel = '../ks3/' + encPath(f.path); return { rel, name: f.name, ppt: isPpt(f.name), temp: false, size: +f.size || 0, view: f.view ? '../ks3/' + encPath(f.view) : (/\\.pdf$/i.test(f.name) ? rel : null) }; };
      const out = one(fs[0]); if (out.link) return out; out.more = fs.slice(1).filter(f => f.path).map(one); return out;
    })().catch(() => null));
    return SLIDES.get(key);
  }
"""),
]


def main():
    tpl = open(TEMPLATE, encoding='utf-8').read()
    try:
        manifest = json.load(open(os.path.join(ROOT, 'ks3', 'manifest.json'), encoding='utf-8'))
    except (OSError, ValueError):
        manifest = {}
    only = sys.argv[1:] or list(NAMES)
    for yid in only:
        src = os.path.join(ROOT, 'ks3', 'books', yid + '.json')
        if not os.path.exists(src):
            out = os.path.join(ROOT, 'notes', yid + '.html')
            if yid in PREVIEW and os.path.exists(out): os.remove(out); print('removed', out)
            else: print('no content yet for', yid)
            continue
        data = json.load(open(src, encoding='utf-8'))
        html = build(yid, data, tpl, manifest)
        open(os.path.join(ROOT, 'notes', yid + '.html'), 'w', encoding='utf-8').write(html)
        print(f'notes/{yid}.html: {len(data["chapters"])} chapters, {sum(len(c["pages"]) for c in data["chapters"])} pages')


def lists():
    """Keep the chapter lists elsewhere in step with the books: ks3/books/index.json (ks3.html), the Teacher area
    (window.KS3_UNITS in teacher.html) and the Apps Script's KS3_TOPICS (names in the weekly email)."""
    idx, units, names = {}, [], {}
    try:
        man = json.load(open(os.path.join(ROOT, 'ks3', 'manifest.json'), encoding='utf-8'))
        for y in man.get('years', []):
            for t in y['topics']:
                names[f"KS3|{t['id']}"] = f"{y['year']}: {t['title']}"
    except (OSError, ValueError):
        pass
    for yid, yname in YEARS.items():
        src = os.path.join(ROOT, 'ks3', 'books', yid + '.json')
        if not os.path.exists(src):
            continue
        d = json.load(open(src, encoding='utf-8'))
        idx[yid] = {'file': f'notes/{yid}.html', 'chapters': [{'id': c['id'], 'n': c['n'], 'title': c['title'], 'pages': [p['id'] for p in c['pages']]} for c in d['chapters']]}
        units.append({'id': yid, 'short': yname, 'title': 'Digital Technology', 'course': 'ks3', 'chapters': [{'id': c['id'], 'n': c['n'], 'title': c['title'], 'page': c['pages'][0]['id']} for c in d['chapters']]})
        for c in d['chapters']:
            names[f"{yid}|{c['id']}"] = c['title']
    open(os.path.join(ROOT, 'ks3', 'books', 'index.json'), 'w', encoding='utf-8').write(json.dumps(idx, ensure_ascii=False, indent=1) + '\n')
    # the home page: Year 8/9/10 as the KS3 course's units, in the same shape as the GCSE units (UNITS in index.html)
    fu = []
    for yid, yname in YEARS.items():
        src = os.path.join(ROOT, 'ks3', 'books', yid + '.json')
        if not os.path.exists(src):
            continue
        d = json.load(open(src, encoding='utf-8'))
        chs = []
        for c in d['chapters']:
            pids = [p['id'] for p in c['pages']]
            tn = sorted({g['term'] for g in d['glossary'] if g.get('page') in pids}, key=str.lower)
            chs.append({'n': c['n'], 'id': c['id'], 'title': c['title'], 'topic': f"K{yid[1:]}-{c['n']}", 'page': pids[0], 'pages': len(pids), 'pids': pids,
                        'terms': len(tn), 'tn': tn, 'vids': sum(len(p.get('videos') or []) for p in c['pages'])})
        fu.append({'mode': None, 'parts': None, 'lib': None, 'terms': len(d['glossary']), 'id': yid, 'course': 'ks3', 'short': yname, 'title': 'Digital Technology', 'file': f'notes/{yid}.html', 'chapters': chs})
    ix = os.path.join(ROOT, 'index.html'); h = open(ix, encoding='utf-8').read()
    m = re.search(r'\nconst UNITS = (\[.*?\]);\n', h)
    if m:
        U = [u for u in json.loads(m.group(1)) if u.get('course') != 'ks3'] + fu
        h2 = h[:m.start(1)] + json.dumps(U, ensure_ascii=False, separators=(',', ':')) + h[m.end(1):]
        if h2 != h: open(ix, 'w', encoding='utf-8').write(h2)
    t = os.path.join(ROOT, 'teacher.html'); h = open(t, encoding='utf-8').read()
    h2 = re.sub(r'\nwindow\.KS3_UNITS=.*?;\n', lambda m: '\nwindow.KS3_UNITS=' + json.dumps(units, ensure_ascii=False, separators=(',', ':')) + ';\n', h, count=1)
    if h2 != h: open(t, 'w', encoding='utf-8').write(h2)
    g = os.path.join(ROOT, 'tools', 'pupil-activity.gs'); s = open(g, encoding='utf-8').read()
    s2 = re.sub(r'\nconst KS3_TOPICS = .*?;\n', lambda m: '\nconst KS3_TOPICS = ' + json.dumps(names, ensure_ascii=False) + ';\n', s, count=1)
    if s2 != s: open(g, 'w', encoding='utf-8').write(s2); print('Apps Script KS3_TOPICS updated: paste tools/pupil-activity.gs into Apps Script again when convenient')


if __name__ == '__main__':
    main()
    lists()
