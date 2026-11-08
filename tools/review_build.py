"""Topic reviews in the notes books (the "Topic review" page at the end of each topic, route #review-cNN).

The reader code is tools/review_module.js; each book's written content is tools/review/<BOOK>.json:
  {"c01": {"gaps": ["Text with {{answer|other accepted answer}} gaps", ...],
           "blurt": [{"p": "Brain-dump prompt", "pts": ["point to include", ...]}, ...],
           "links": [{"q": "Explain the link between ...", "a": "Model answer"}, ...]}, ...}
The "I can..." checklist (from the spec points) and key-term matching (from the glossary) need no content.
A topic with no entry has no review. Run after editing either: python3 tools/review_build.py
"""
import glob, json, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
MOD = open(os.path.join(ROOT, 'tools', 'review_module.js'), encoding='utf-8').read().rstrip() + '\n'
START, END = '/* >>> TOPIC REVIEW (tools/review_module.js) */\n', '/* <<< TOPIC REVIEW */\n'
ANCHOR = '/* chapter card: Chapter quiz (locked / unlocked / best) + the tracking toggle; "Chapter complete" prompt */\n'
HOOKS = [  # entry points: the chip on a topic's first page, and the end-of-topic box on its last page
    ('<div class="trk-row">${cqCardHTML(P.ch)}${trkBtn(P.ch)}</div>', '<div class="trk-row">${cqCardHTML(P.ch)}${rvChip(P.ch)}${trkBtn(P.ch)}</div>'),
    ("<span class=\"ts-m\" aria-hidden=\"true\"><i style=\"width:${Math.round(cov / n * 100)}%\"></i></span>\n",
     "<span class=\"ts-m\" aria-hidden=\"true\"><i style=\"width:${Math.round(cov / n * 100)}%\"></i></span>\n      ${rvRow(ch)}\n"),
]


def esc_script(s):
    return s.replace('</', '<\\/')


def build(path):
    bid = os.path.basename(path)[:-5]
    html = open(path, encoding='utf-8').read()
    if 'const BOOK = ' not in html or ANCHOR not in html and START not in html:
        return False
    src = os.path.join(ROOT, 'tools', 'review', bid + '.json')
    data = json.load(open(src, encoding='utf-8')) if os.path.exists(src) else {}
    line = 'const REVIEW = ' + esc_script(json.dumps(data, ensure_ascii=False, separators=(',', ':'))) + ';'
    lines = html.split('\n')
    if any(l.startswith('const REVIEW = ') for l in lines):
        lines = [line if l.startswith('const REVIEW = ') else l for l in lines]
    else:
        i = next(n for n, l in enumerate(lines) if l.startswith('const BOOK = '))
        lines.insert(i + 1, line)
    html = '\n'.join(lines)
    if START in html:
        html = re.sub(re.escape(START) + r'.*?' + re.escape(END), lambda m: START + MOD + END, html, count=1, flags=re.S)
    else:
        html = html.replace(ANCHOR, START + MOD + END + ANCHOR, 1)
    for a, b in HOOKS:
        if b in html:
            continue
        if a not in html:
            sys.exit(f'{bid}: hook not found: {a[:70]}')
        html = html.replace(a, b, 1)
    open(path, 'w', encoding='utf-8').write(html)
    print(f'{bid}: {len(data)} topic review{"" if len(data) == 1 else "s"}')
    return True


if __name__ == '__main__':
    for p in sorted(glob.glob(os.path.join(ROOT, 'notes', '[!_]*.html'))):
        build(p)
