"""Turn a topic written in plain text into ks3/library/<slug>/topic.json and test.json (and its lesson PowerPoint).

  python3 tools/ks3_author.py <file.txt> [...]      (each file starts with "SLUG: my-topic")

The text format (one item per line; blank lines are ignored):
  SLUG: generative-ai          TITLE: Generative AI         SUMMARY: one sentence        INTRO: a short paragraph
  LEARN: what pupils will learn (one line each)
  === LESSON short lesson title
  SPEC: the learning intention        SUM: the page summary          START: the Do now question
  SC: a success criterion (one line each)                            TERMS: word; word; word
  SLIDE: slide title  then  - point lines  and  N: teacher notes (speaker notes)
  Notes blocks, in order:  ## heading   plain paragraph   - bullet   1. numbered   TIP: / WARN: / NOTE: text
     KEY: title (then - lines)     TABLE: caption (then cells split by " | "; the first row is the header)
     EX: worked example title, then CTX: context, S: step, ANS: answer
     ACT: title | minutes | who | after slide n   then S: step lines and Q: question || model answer
  CHECK: question | right answer | wrong | wrong | wrong | why          (4 per lesson)
  PRAC: marks | question | model answer                                 (2-3 per lesson)
  GLOSS: term | definition | other name          (the page is the lesson it is first used in)
  TEST: question | right answer | wrong | wrong | wrong | why | lesson number   (100)
Answers are written first and shuffled here so the right answer is spread evenly over A-D (the same every run).
"""
import json, os, random, re, sys

HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.path.join(HERE, '..', 'ks3', 'library')


def mcq(parts, rng, slot):
    q, right, *wrong = parts[:5]; why = parts[5] if len(parts) > 5 else ''
    opts = [right] + wrong[:3]
    if len(opts) != 4 or not all(o.strip() for o in opts): raise ValueError('needs a question, a right answer and 3 wrong ones: ' + q)
    rest = wrong[:3]; rng.shuffle(rest); opts = rest[:]; opts.insert(slot, right)
    return {'q': q.strip(), 'o': [o.strip() for o in opts], 'a': slot, 'why': why.strip()}


def parse(src):
    T = {'learn': [], 'pages': [], 'glossary': []}; tests = []; pg = None; cur = None; slide = None
    lines = [l.rstrip() for l in src.split('\n')]
    def flush():
        nonlocal cur
        if cur is not None and pg is not None: pg['blocks'].append(cur)
        cur = None
    for raw in lines:
        l = raw.strip()
        if not l or l.startswith('#!'): continue
        m = re.match(r'^(SLUG|TITLE|SUMMARY|INTRO|LEARN|SPEC|SUM|START|SC|TERMS|SLIDE|N|CHECK|PRAC|GLOSS|TEST|KEY|TABLE|EX|CTX|S|ANS|ACT|Q|TIP|WARN|NOTE):\s*(.*)$', l)
        if l.startswith('=== LESSON'):
            flush(); slide = None
            pg = {'id': f"p{len(T['pages']) + 1:02d}", 'title': l[len('=== LESSON'):].strip(), 'spec': '', 'summary': '', 'starter': '', 'sc': [], 'slides': [], 'blocks': [], 'check': [], 'practice': [], 'terms': [], 'exam': [], 'videos': []}
            T['pages'].append(pg); continue
        if m:
            k, v = m.group(1), m.group(2).strip()
            if k == 'SLUG': T['slug'] = v
            elif k == 'TITLE': T['title'] = v
            elif k == 'SUMMARY': T['summary'] = v
            elif k == 'INTRO': T['intro'] = v
            elif k == 'LEARN': T['learn'].append(v)
            elif k == 'SPEC': pg['spec'] = v
            elif k == 'SUM': pg['summary'] = v
            elif k == 'START': pg['starter'] = v
            elif k == 'SC': pg['sc'].append(v)
            elif k == 'TERMS': pg['terms'] = [x.strip() for x in v.split(';') if x.strip()]
            elif k == 'SLIDE': flush(); slide = {'t': v, 'b': []}; pg['slides'].append(slide)
            elif k == 'N' and slide is not None: slide['n'] = (slide.get('n', '') + ' ' + v).strip()
            elif k == 'CHECK': flush(); pg['check'].append([x for x in v.split(' | ')])
            elif k == 'PRAC': flush(); p = v.split(' | '); pg['practice'].append({'q': p[1].strip(), 'm': int(p[0]), 'a': ' | '.join(p[2:]).strip()})
            elif k == 'GLOSS': g = v.split(' | '); T['glossary'].append({'term': g[0].strip(), 'def': g[1].strip(), 'alt': (g[2].strip() if len(g) > 2 else ''), 'page': ''})
            elif k == 'TEST': tests.append(v.split(' | '))
            elif k in ('TIP', 'WARN', 'NOTE'): flush(); slide = None; pg['blocks'].append({'t': k.lower(), 'text': v})
            elif k == 'KEY': flush(); slide = None; cur = {'t': 'key', 'title': v, 'items': []}
            elif k == 'TABLE': flush(); slide = None; cur = {'t': 'table', 'caption': v, 'head': None, 'rows': []}
            elif k == 'EX': flush(); slide = None; cur = {'t': 'example', 'title': v, 'context': '', 'steps': [], 'answer': ''}
            elif k == 'CTX' and cur and cur['t'] == 'example': cur['context'] = v
            elif k == 'ANS' and cur and cur['t'] == 'example': cur['answer'] = v
            elif k == 'ACT':
                flush(); slide = None; a = [x.strip() for x in v.split(' | ')]
                cur = {'t': 'act', 'title': a[0], 'mins': int(a[1]) if len(a) > 1 and a[1] else None, 'who': a[2] if len(a) > 2 else '', 'after': int(a[3]) if len(a) > 3 and a[3] else None, 'steps': [], 'q': []}
            elif k == 'S' and cur and cur['t'] in ('example', 'act'): cur['steps'].append(v)
            elif k == 'Q' and cur and cur['t'] == 'act': q, _, a = v.partition(' || '); cur['q'].append({'q': q.strip(), 'a': a.strip()})
            else: raise ValueError('unexpected line: ' + l)
            continue
        if slide is not None and l.startswith('- '): slide['b'].append(l[2:].strip()); continue
        slide = None
        if cur and cur['t'] == 'key' and l.startswith('- '): cur['items'].append(l[2:].strip()); continue
        if cur and cur['t'] == 'table' and ' | ' in l:
            cells = [c.strip() for c in l.split(' | ')]
            if cur['head'] is None: cur['head'] = cells
            else: cur['rows'].append(cells)
            continue
        if l.startswith('## '): flush(); pg['blocks'].append({'t': 'h', 'text': l[3:].strip()}); continue
        if l.startswith('- ') or re.match(r'^\d+\. ', l):
            ordered = not l.startswith('- '); item = re.sub(r'^(- |\d+\. )', '', l)
            if cur and cur['t'] == 'list' and cur['ordered'] == ordered: cur['items'].append(item)
            else: flush(); cur = {'t': 'list', 'ordered': ordered, 'items': [item]}
            continue
        flush(); pg['blocks'].append({'t': 'p', 'text': l})
    flush()
    return T, tests


def finish(T, tests):
    slug = T['slug']; rng = random.Random(slug)
    # check questions: 4 per lesson, right answers spread over A-D across the topic
    n = sum(len(p['check']) for p in T['pages']); slots = [i % 4 for i in range(n)]; rng.shuffle(slots); k = 0
    for p in T['pages']:
        out = []
        for c in p['check']: out.append(mcq(c, rng, slots[k])); k += 1
        p['check'] = out
        for b in p['blocks']:
            if b['t'] == 'act':
                if b['after'] is None: b.pop('after')
                if b['mins'] is None: b.pop('mins')
    slots = [i % 4 for i in range(len(tests))]; rng.shuffle(slots)
    tq = []
    for i, t in enumerate(tests):
        q = mcq(t, rng, slots[i]); ln = int(t[6]) if len(t) > 6 and t[6].strip() else 1; q['p'] = f'p{ln:02d}'; tq.append(q)
    # each glossary word belongs to the first lesson that lists it in TERMS (else the first that mentions it)
    for g in T['glossary']:
        g['page'] = next((p['id'] for p in T['pages'] if g['term'].lower() in [x.lower() for x in p['terms']]), '') or next((p['id'] for p in T['pages'] if g['term'].lower() in json.dumps(p['blocks']).lower()), T['pages'][0]['id'])
    topic = {'title': T['title'], 'summary': T['summary'], 'learn': T['learn'], 'temporary': False, 'intro': T.get('intro', ''), 'pages': T['pages'], 'glossary': T['glossary']}
    return slug, topic, {'title': T['title'], 'q': tq}


def check(slug, topic, test):
    errs = []; G = {g['term'].lower() for g in topic['glossary']} | {g['alt'].lower() for g in topic['glossary'] if g['alt']}
    if len(topic['pages']) != 6: errs.append(f"{len(topic['pages'])} lessons, not 6")
    for p in topic['pages']:
        for f in ('spec', 'summary', 'starter'):
            if not p[f]: errs.append(f"{p['id']}: no {f}")
        if len(p['check']) < 4: errs.append(f"{p['id']}: {len(p['check'])} check questions")
        if len(p['practice']) < 2: errs.append(f"{p['id']}: {len(p['practice'])} practice questions")
        if not any(b['t'] == 'act' for b in p['blocks']): errs.append(f"{p['id']}: no activity")
        if len(p['slides']) < 3: errs.append(f"{p['id']}: {len(p['slides'])} slides")
        for w in p['terms']:
            if w.lower() not in G: errs.append(f"{p['id']}: term '{w}' not in the glossary")
        strs = []
        def walk(x):
            if isinstance(x, str): strs.append(x)
            elif isinstance(x, list): [walk(y) for y in x]
            elif isinstance(x, dict): [walk(y) for y in x.values()]
        walk(p['blocks'])
        for w in re.findall(r'\[\[([^\]|]+)', ' '.join(strs)):
            if w.lower() not in G: errs.append(f"{p['id']}: [[{w}]] not in the glossary")
    if len(test['q']) != 100: errs.append(f"test has {len(test['q'])} questions")
    seen = set()
    for q in test['q']:
        if q['q'].lower() in seen: errs.append('repeated test question: ' + q['q'])
        seen.add(q['q'].lower())
        if len(set(o.lower() for o in q['o'])) < 4: errs.append('repeated option: ' + q['q'])
    return errs


def main(files):
    bad = 0
    for f in files:
        T, tests = parse(open(f, encoding='utf-8').read())
        slug, topic, test = finish(T, tests)
        errs = check(slug, topic, test)
        d = os.path.join(LIB, slug); os.makedirs(d, exist_ok=True)
        json.dump(topic, open(os.path.join(d, 'topic.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        json.dump(test, open(os.path.join(d, 'test.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        words = sum(len(json.dumps(p['blocks']).split()) for p in topic['pages'])
        print(f"{slug}: {len(topic['pages'])} lessons, {sum(len(p['slides']) for p in topic['pages'])} teaching slides, "
              f"{sum(1 for p in topic['pages'] for b in p['blocks'] if b['t'] == 'act')} activities, {len(topic['glossary'])} key words, {len(test['q'])} test questions, ~{words} words of notes")
        for e in errs: print('   !', e)
        bad += len(errs)
        sys.path.insert(0, HERE); import ks3_deck; print('  ', ks3_deck.build(slug))
    return bad


if __name__ == '__main__':
    sys.exit(1 if main(sys.argv[1:]) else 0)
