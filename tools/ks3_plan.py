"""Put the KS3 year books together from the topic library and the plan.

  ks3/library/<topic>/   one folder per topic, whichever year teaches it (or none). It holds the topic's files
                         (PowerPoints, notes, worksheets), its topic.json (title, summary, what you'll learn and the notes
                         pages) and, optionally, icon.png and podcast.json.
  ks3/plan.json          which topics each year teaches, in order: {"years": {"Y8": ["online-safety", ...], ...}}

This writes ks3/books/Y8.json, Y9.json and Y10.json (chapter n = the year's topic n), the topic icons icons/K9-2.png and
the podcasts notes/podcasts/K9C2.json and the topic tests tests/Y9/c02.json (from each topic's test.json: 100
multiple-choice questions, so a test follows its topic from year to year). A topic with no notes pages yet gets a "notes on the way" page showing its
summary and what pupils will learn, so it can go into a year straight away; its PowerPoint still shows.
Then run tools/ks3_manifest.py and tools/ks3_books.py (the GitHub Action runs all three).
Run by hand: python3 tools/ks3_plan.py   (python3 tools/ks3_plan.py --check only reports problems)
"""
import json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..')
K = os.path.join(ROOT, 'ks3'); LIB = os.path.join(K, 'library')
YEARS = {'Y8': 'Year 8', 'Y9': 'Year 9', 'Y10': 'Year 10'}
SLUG = re.compile(r'^[a-z0-9][a-z0-9-]{0,60}$')


def load(p, d=None):
    try:
        return json.load(open(p, encoding='utf-8'))
    except (OSError, ValueError):
        return d


def library():
    out = {}
    for s in sorted(os.listdir(LIB)):
        if SLUG.match(s) and os.path.isdir(os.path.join(LIB, s)):
            t = load(os.path.join(LIB, s, 'topic.json'), None)
            if t is None:   # a folder with files but no topic.json yet: titled from its name
                t = {'title': s.replace('-', ' ').capitalize()}
            out[s] = t
    return out


def plan(lib, warn):
    p = (load(os.path.join(K, 'plan.json'), {}) or {}).get('years', {})
    seen, out = set(), {}
    for yid in YEARS:
        out[yid] = []
        for s in p.get(yid, []) or []:
            if s not in lib: warn(f'{YEARS[yid]}: "{s}" is not a folder in ks3/library/, skipped'); continue
            if s in seen: warn(f'{YEARS[yid]}: "{s}" is already in another year, skipped'); continue
            seen.add(s); out[yid].append(s)
    return out


def placeholder(t):
    learn = [str(x) for x in (t.get('learn') or []) if str(x).strip()]
    blocks = [{'t': 'note', 'text': 'The notes for this topic are on their way. Until then, your teacher’s PowerPoint for the topic is under **PowerPoint** in Extra help.'}]
    if t.get('summary'):
        blocks += [{'t': 'h', 'text': 'What this topic is about'}, {'t': 'p', 'text': t['summary']}]
    if learn:
        blocks += [{'t': 'h', 'text': 'What you will learn'}, {'t': 'list', 'ordered': False, 'items': learn}]
    return [{'id': 'p01', 'spec': 'What this topic covers', 'summary': t.get('summary') or 'Notes for this topic are on their way.',
             'blocks': blocks, 'check': [], 'practice': [], 'terms': [], 'exam': [], 'videos': []}]


def chapter(n, t):
    pages = t.get('pages') or placeholder(t)
    c = 'c%02d' % n
    ids = {p['id']: f'{c}-p{j + 1:02d}' for j, p in enumerate(pages)}
    out = []
    for p in pages:
        q = {k: v for k, v in p.items() if k != 'lessons'}
        q['id'] = ids[p['id']]; q['lessons'] = []
        for k in ('check', 'practice', 'terms', 'exam', 'videos'): q.setdefault(k, [])
        out.append(q)
    gloss = []
    for g in t.get('glossary') or []:
        h = dict(g); h['page'] = ids.get(g.get('page'), out[0]['id']); gloss.append(h)
    title = t.get('bookTitle') or t.get('title') or 'Topic %d' % n
    return {'id': c, 'n': n, 'title': title, 'intro': t.get('intro') or t.get('summary') or '', 'pages': out}, gloss


def put_test(s, yid, n, ch, want):
    """copy ks3/library/<s>/test.json to tests/<yid>/cNN.json, with page ids p03 -> cNN-p03"""
    t = load(os.path.join(LIB, s, 'test.json'))
    if not t or not t.get('q'): return
    ids = {p['id'].split('-')[-1]: p['id'] for p in ch['pages']}
    out = {'book': yid, 'ch': ch['id'], 'n': n, 'title': ch['title'], 'slug': s,
           'q': [dict(q, p=ids.get(str(q.get('p', '')).split('-')[-1], ch['pages'][0]['id'])) for q in t['q']]}
    dst = os.path.join(ROOT, 'tests', yid, ch['id'] + '.json'); want.add(dst); os.makedirs(os.path.dirname(dst), exist_ok=True)
    old = load(dst) or {}
    if {k: old.get(k) for k in out} != out:   # tools/tests_index.js adds the page names afterwards
        json.dump(out, open(dst, 'w', encoding='utf-8'), ensure_ascii=False)


def same(a, b):
    try:
        return open(a, 'rb').read() == open(b, 'rb').read()
    except OSError:
        return False


def main():
    check = '--check' in sys.argv
    problems = []
    warn = lambda m: (problems.append(m), print('!', m))
    lib = library(); P = plan(lib, warn)
    want_icons, want_pods, want_tests = set(), set(), set()
    for yid, slugs in P.items():
        chs, gl = [], []
        for i, s in enumerate(slugs):
            ch, g = chapter(i + 1, lib[s]); chs.append(ch); gl += g
            n, y = i + 1, yid[1:]
            if check: continue
            put_test(s, yid, n, ch, want_tests)
            # icon and podcast: the topic's own, copied to the position the reader looks for
            src = os.path.join(LIB, s, 'icon.png')
            if not os.path.exists(src): src = os.path.join(LIB, '_default-icon.png')
            dst = os.path.join(ROOT, 'icons', f'K{y}-{n}.png'); want_icons.add(dst)
            if os.path.exists(src) and not same(src, dst): shutil.copyfile(src, dst)
            pod = load(os.path.join(LIB, s, 'podcast.json'))
            dst = os.path.join(ROOT, 'notes', 'podcasts', f'K{y}C{n}.json')
            if pod:
                pod['t'] = f'{YEARS[yid]} · {ch["title"]}'; want_pods.add(dst)
                txt = json.dumps(pod, ensure_ascii=False)
                if not os.path.exists(dst) or open(dst, encoding='utf-8').read() != txt:
                    open(dst, 'w', encoding='utf-8').write(txt)
        if check: continue
        book = {'chapters': chs, 'glossary': gl}
        dst = os.path.join(K, 'books', yid + '.json')
        if load(dst) != book:
            json.dump(book, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f'{YEARS[yid]}: ' + ', '.join(f'{i + 1} {lib[s].get("title", s)}' + ('' if lib[s].get('pages') else ' (notes on the way)') for i, s in enumerate(slugs)))
    if check:
        return 1 if problems else 0
    # the teacher preview book (notes/Y0.html): every library topic no year teaches
    spare = [x for x in sorted(lib, key=lambda x: str(lib[x].get('title', x)).lower()) if not any(x in v for v in P.values())]
    chs, gl = [], []
    for i, s in enumerate(spare):
        ch, g = chapter(i + 1, lib[s]); chs.append(ch); gl += g
        put_test(s, 'Y0', i + 1, ch, want_tests)
        src = os.path.join(LIB, s, 'icon.png')
        if not os.path.exists(src): src = os.path.join(LIB, '_default-icon.png')
        dst = os.path.join(ROOT, 'icons', f'K0-{i + 1}.png'); want_icons.add(dst)
        if os.path.exists(src) and not same(src, dst): shutil.copyfile(src, dst)
    dst = os.path.join(K, 'books', 'Y0.json')
    if spare:
        book = {'chapters': chs, 'glossary': gl}
        if load(dst) != book: json.dump(book, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('Library preview: ' + ', '.join(lib[x].get('title', x) for x in spare))
    elif os.path.exists(dst):
        os.remove(dst)
    # a year with fewer topics than before: drop the leftover icons and podcasts so they aren't shown for nothing
    for f in os.listdir(os.path.join(ROOT, 'icons')):
        p = os.path.join(ROOT, 'icons', f)
        if re.fullmatch(r'K(0|8|9|10)-\d+\.png', f) and p not in want_icons: os.remove(p); print('removed', f)
    for f in os.listdir(os.path.join(ROOT, 'notes', 'podcasts')):
        p = os.path.join(ROOT, 'notes', 'podcasts', f)
        if re.fullmatch(r'K(8|9|10)C\d+\.json', f) and p not in want_pods: os.remove(p); print('removed', f)
    for yid in list(YEARS) + ['Y0']:   # tests for positions that now have no topic, or a topic with no test
        d = os.path.join(ROOT, 'tests', yid)
        for f in (os.listdir(d) if os.path.isdir(d) else []):
            p = os.path.join(d, f)
            if re.fullmatch(r'c\d{2}\.json', f) and p not in want_tests: os.remove(p); print('removed test', yid, f)
    return 0


if __name__ == '__main__':
    sys.exit(main())
