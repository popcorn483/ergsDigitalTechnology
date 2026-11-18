"""Build papers/examples.json from the transcribed Summer 2026 scripts (examples-work/*.jsonl)."""
import json, re, glob, os, sys
REPO = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..")
crops = json.load(open(os.path.join(REPO, 'papers/crops.json')))
CAND = {'A': 'A', 'B': 'B', 'C': 'C'}

def expand(lbl):
    """'1(a)(ii)–(iii)' -> ['1(a)(ii)','1(a)(iii)'];  '5(a)–(b)' -> ['5(a)','5(b)']"""
    if '–' not in lbl: return [lbl]
    a, b = lbl.split('–')
    m = re.match(r'^(.*)\(([a-z]+)\)$', a)
    base, first = m.group(1), m.group(2)
    last = b.strip('()')
    roman = ['i','ii','iii','iv','v','vi','vii','viii']
    seq = roman if first in roman and last in roman else [chr(c) for c in range(ord('a'), ord('z')+1)]
    return [f'{base}({x})' for x in seq[seq.index(first):seq.index(last)+1]]

out, miss = {}, []
for f in sorted(glob.glob(os.path.join(REPO, "papers/examples-src/*.jsonl"))):
    paper, cand = os.path.basename(f)[:-6].split('_')
    keys = {k.split('|')[2]: k for k in crops if k.startswith(paper + '|Summer 2026|')}
    exp = {x: k for lbl, k in keys.items() for x in expand(lbl)}
    for line in open(f):
        e = json.loads(line); q = e['q']
        k = exp.get(q) or next((exp[x] for x in sorted(exp, key=len, reverse=True) if q.startswith(x + '(')), None)
        if not k: miss.append((paper, q)); continue
        item = {'c': cand, 'q': q, 'm': e['m'], 'max': e['max'], 'a': e['a']}
        if e.get('note'): item['n'] = e['note']
        out.setdefault(k, []).append(item)
for k, L in out.items():
    L.sort(key=lambda x: (x['q'], -x['m'] / x['max'], x['c']))
json.dump({'_about': 'Real Summer 2026 CCEA answers from our pupils (anonymised) with the marks the examiner gave. Built by tools/papers_examples.py from papers/examples-src.', **dict(sorted(out.items()))},
          open(os.path.join(REPO, 'papers/examples.json'), 'w'), ensure_ascii=False, indent=0)
print(len(out), 'question keys;', sum(len(v) for v in out.values()), 'answers; unmatched:', miss)
