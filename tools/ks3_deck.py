"""Build a topic's lesson PowerPoint from its topic.json: ks3/library/<topic>/1 - LESSON - <Title>.pptx

Used for the topics written straight into the library (no PowerPoint of their own). Each notes page is one lesson, and the
deck follows the lesson: lesson title, Do now (page "starter"), learning intentions and success criteria ("spec", "sc"),
the teaching slides ("slides": [{"t": title, "b": [points], "n": teacher notes}]), key words (page "terms" from the
glossary), each in-lesson activity (blocks with "t": "act"), a quick check from the page's check questions with an answers
slide, and an exit ticket from its first practice question (model answer in the speaker notes). House style: navy and
blue, LEMON MILK headings (as on the site), Segoe UI text.

Run: python3 tools/ks3_deck.py <topic-slug> [...]   (or --all for every library topic with "slides" in its pages)
Then tools/ks3_views.sh (or the GitHub Action) makes the PDF copy in _view/ for viewing in the browser.
"""
import json, os, re, sys
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.path.join(HERE, '..', 'ks3', 'library')
NAVY, BLUE, SOFT, INK, MUTED, WHITE = RGBColor(0x16, 0x21, 0x3A), RGBColor(0x24, 0x45, 0xB4), RGBColor(0xE5, 0xEA, 0xFA), RGBColor(0x1B, 0x22, 0x30), RGBColor(0x5B, 0x64, 0x75), RGBColor(0xFF, 0xFF, 0xFF)
TEAL, TEAL_SOFT, AMBER, AMBER_SOFT, PURPLE = RGBColor(0x00, 0x79, 0x6B), RGBColor(0xE0, 0xF2, 0xEF), RGBColor(0xB2, 0x6A, 0x00), RGBColor(0xFF, 0xF0, 0xD6), RGBColor(0x5A, 0x49, 0xB5)
HEAD, BODY = 'LEMON MILK', 'Segoe UI'
W, H = Inches(13.333), Inches(7.5)


def plain(s):
    """markdown-ish notes text -> slide text: **bold**, *italic*, [[glossary]] and `code` marks removed"""
    s = re.sub(r'\[\[([^\]|]+)\|([^\]]+)\]\]', r'\2', str(s or ''))
    s = re.sub(r'\[\[([^\]]+)\]\]', r'\1', s)
    return re.sub(r'\*\*|__|\*|`', '', s).strip()


def box(sl, x, y, w, h, fill=None, line=None, shape=MSO_SHAPE.RECTANGLE):
    sp = sl.shapes.add_shape(shape, x, y, w, h)
    if fill is None: sp.fill.background()
    else: sp.fill.solid(); sp.fill.fore_color.rgb = fill
    if line is None: sp.line.fill.background()
    else: sp.line.color.rgb = line; sp.line.width = Pt(1.25)
    sp.shadow.inherit = False
    if shape == MSO_SHAPE.ROUNDED_RECTANGLE: sp.adjustments[0] = 0.08
    return sp


def text(sl, x, y, w, h, runs, size=20, color=INK, font=BODY, bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=1.1, after=6):
    """runs: a string, or a list of paragraphs (each a string or (string, {size, color, bold, font, bullet}))"""
    tb = sl.shapes.add_textbox(x, y, w, h); tf = tb.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(0.05); tf.margin_top = tf.margin_bottom = Inches(0.03)
    paras = runs if isinstance(runs, list) else [runs]
    for i, p in enumerate(paras):
        t, o = (p, {}) if isinstance(p, str) else p
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        para.alignment = o.get('align', align); para.line_spacing = spacing; para.space_after = Pt(o.get('after', after))
        r = para.add_run(); r.text = (o['bullet'] + '  ' if o.get('bullet') else '') + t
        f = r.font; f.size = Pt(o.get('size', size)); f.name = o.get('font', font); f.bold = o.get('bold', bold); f.color.rgb = o.get('color', color)
    return tb


def fit(items, big=24, small=17, room=330):
    """a font size that keeps a list of points on the slide"""
    n = sum(len(plain(x)) for x in items) + 40 * len(items)
    return max(small, min(big, int(big * (room * 1.0 / max(n, 1)) ** 0.5 * 2.2))) if n > room else big


class Deck:
    def __init__(self, slug, t):
        self.slug, self.t = slug, t
        self.p = Presentation(); self.p.slide_width, self.p.slide_height = W, H
        self.blank = self.p.slide_layouts[6]; self.lesson = 0; self.n = 0

    def slide(self, bg=WHITE, notes=''):
        sl = self.p.slides.add_slide(self.blank); self.n += 1
        sl.background.fill.solid(); sl.background.fill.fore_color.rgb = bg
        if notes: sl.notes_slide.notes_text_frame.text = notes
        return sl

    def frame(self, title, kicker='', notes='', band=BLUE, band_text=WHITE):
        """a content slide: title band, then the body area (x 0.7in, y 1.75in, 11.9in x 5.1in); footer with topic, lesson and slide number"""
        sl = self.slide(notes=notes)
        box(sl, 0, 0, W, Inches(1.45), band)
        if kicker: text(sl, Inches(0.7), Inches(0.18), Inches(11.5), Inches(0.35), kicker.upper(), 12, band_text, HEAD, spacing=1.0)
        text(sl, Inches(0.7), Inches(0.45 if kicker else 0.3), Inches(11.9), Inches(0.95), plain(title), 28 if len(plain(title)) < 48 else 22, band_text, HEAD, anchor=MSO_ANCHOR.MIDDLE, spacing=1.0)
        text(sl, Inches(0.7), Inches(7.02), Inches(9), Inches(0.3), f"{self.t['title']}  ·  Lesson {self.lesson} of {len(self.t['pages'])}" if self.lesson else self.t['title'], 10, MUTED)
        text(sl, Inches(11.6), Inches(7.02), Inches(1.0), Inches(0.3), str(self.n), 10, MUTED, align=PP_ALIGN.RIGHT)
        return sl

    def cover(self):
        sl = self.slide(NAVY, notes=self.t.get('intro', ''))
        box(sl, Inches(0.7), Inches(0.9), Inches(1.2), Inches(0.09), BLUE)
        text(sl, Inches(0.7), Inches(1.15), Inches(7.4), Inches(0.4), 'KS3 DIGITAL TECHNOLOGY', 14, RGBColor(0x93, 0xAB, 0xFF), HEAD)
        text(sl, Inches(0.7), Inches(1.7), Inches(7.4), Inches(2.6), self.t['title'].upper(), 44 if len(self.t['title']) < 22 else 34, WHITE, HEAD, spacing=1.0)
        text(sl, Inches(0.7), Inches(4.45), Inches(7.0), Inches(1.6), plain(self.t.get('summary', '')), 18, RGBColor(0xC9, 0xD2, 0xE8))
        text(sl, Inches(0.7), Inches(6.55), Inches(7), Inches(0.45), "MR BUTLER'S DIGITAL TECHNOLOGY", 12, RGBColor(0x93, 0xAB, 0xFF), HEAD)
        box(sl, Inches(8.55), Inches(0.9), Inches(4.1), Inches(5.7), RGBColor(0x22, 0x30, 0x52), shape=MSO_SHAPE.ROUNDED_RECTANGLE)
        text(sl, Inches(8.85), Inches(1.1), Inches(3.6), Inches(0.4), 'LESSONS', 13, RGBColor(0x93, 0xAB, 0xFF), HEAD)
        text(sl, Inches(8.85), Inches(1.55), Inches(3.6), Inches(4.9), [(f"{i + 1}   {plain(p.get('title') or p['spec'])}", {'after': 10}) for i, p in enumerate(self.t['pages'])], 14, WHITE)

    def lesson_title(self, i, pg):
        self.lesson = i + 1
        sl = self.slide(BLUE, notes=plain(pg.get('summary', '')))
        text(sl, Inches(0.9), Inches(1.6), Inches(11.5), Inches(0.5), f'LESSON {i + 1} OF {len(self.t["pages"])}', 18, RGBColor(0xC9, 0xD5, 0xFF), HEAD)
        text(sl, Inches(0.9), Inches(2.2), Inches(11.5), Inches(2.4), plain(pg.get('title') or pg['spec']).upper(), 40, WHITE, HEAD, spacing=1.0)
        text(sl, Inches(0.9), Inches(5.0), Inches(10.5), Inches(1.4), plain(pg.get('summary', '')).split('. ')[0].rstrip('.') + '.', 18, RGBColor(0xE5, 0xEA, 0xFA))
        text(sl, Inches(0.9), Inches(6.8), Inches(8), Inches(0.4), self.t['title'].upper(), 12, RGBColor(0xC9, 0xD5, 0xFF), HEAD)

    def starter(self, pg):
        if not pg.get('starter'): return
        sl = self.frame('Do now', 'Starter  ·  5 minutes', notes=pg.get('starter_n', 'Pupils answer on mini-whiteboards or in their workbook as they come in. Take two or three answers before the learning intentions.'), band=AMBER)
        box(sl, Inches(0.7), Inches(1.95), Inches(11.9), Inches(4.6), AMBER_SOFT, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
        text(sl, Inches(1.2), Inches(2.2), Inches(10.9), Inches(4.1), plain(pg['starter']), 32 if len(pg['starter']) < 120 else 26, INK, anchor=MSO_ANCHOR.MIDDLE, align=PP_ALIGN.CENTER, spacing=1.15)

    def aims(self, pg):
        sl = self.frame('Learning intentions', 'Today', notes='Read the intention and success criteria together. Come back to the success criteria in the exit ticket.')
        text(sl, Inches(0.7), Inches(1.85), Inches(11.9), Inches(0.4), 'WE ARE LEARNING TO', 13, BLUE, HEAD)
        text(sl, Inches(0.7), Inches(2.25), Inches(11.9), Inches(1.3), plain(pg['spec']), 26, INK, spacing=1.1)
        sc = pg.get('sc') or []
        if sc:
            text(sl, Inches(0.7), Inches(3.75), Inches(11.9), Inches(0.4), 'SUCCESS CRITERIA: I CAN…', 13, TEAL, HEAD)
            text(sl, Inches(0.7), Inches(4.2), Inches(11.9), Inches(2.6), [(plain(x), {'bullet': '✓', 'after': 8}) for x in sc], 20, INK)

    def content(self, s):
        pts = s.get('b') or []
        sl = self.frame(s['t'], s.get('k', ''), notes=s.get('n', ''))
        size = fit(pts, 24, 16, 380)
        text(sl, Inches(0.7), Inches(1.85), Inches(11.9), Inches(5.0), [(plain(x), {'bullet': '•', 'after': 12}) for x in pts], size, INK, spacing=1.12)

    def words(self, pg):
        G = {g['term'].lower(): g for g in self.t.get('glossary', [])}
        ws = [G[w.lower()] for w in (pg.get('terms') or []) if w.lower() in G][:5]
        if not ws: return
        sl = self.frame('Key words', notes='Pupils find these words highlighted in their workbook: tap one to see its meaning.', band=PURPLE)
        y = Inches(1.85); h = Inches(min(1.0, 5.0 / len(ws)))
        for g in ws:
            text(sl, Inches(0.7), y, Inches(3.4), h, g['term'], 18 if len(g['term']) < 22 else 15, PURPLE, HEAD, anchor=MSO_ANCHOR.MIDDLE)
            text(sl, Inches(4.2), y, Inches(8.4), h, plain(g['def']), 17 if len(g['def']) < 150 else 15, INK, anchor=MSO_ANCHOR.MIDDLE)
            y += h

    def activity(self, b):
        meta = '  ·  '.join(x for x in [f"{b['mins']} minutes" if b.get('mins') else '', str(b.get('who') or '')] if x)
        steps, qs = b.get('steps') or [], b.get('q') or []
        notes = '\n'.join([b.get('n', '')] + [f"Model answer {k + 1}: {plain(q.get('a', ''))}" for k, q in enumerate(qs) if q.get('a')]).strip()
        sl = self.frame(b.get('title', 'Activity'), 'Activity' + ('  ·  ' + meta if meta else ''), notes=notes, band=TEAL)
        items = [(plain(x), {'bullet': f'{k + 1}.', 'after': 10}) for k, x in enumerate(steps)]
        if qs: items += [('In your workbook, answer:', {'bold': True, 'color': TEAL, 'after': 6})] + [(plain(q['q']), {'bullet': '?', 'after': 8}) for q in qs]
        size = fit([x[0] for x in items], 22, 15, 420)
        text(sl, Inches(0.7), Inches(1.85), Inches(11.9), Inches(4.8), items, size, INK, spacing=1.1)
        text(sl, Inches(0.7), Inches(6.62), Inches(11.9), Inches(0.35), f'Your workbook: Lesson {self.lesson}  ·  tick each step off as you go', 12, TEAL, bold=True)

    def check(self, pg):
        qs = (pg.get('check') or [])[:4]
        if not qs: return
        L = 'ABCD'
        sl = self.frame('Quick check', 'Mini-whiteboards  ·  hold up A, B, C or D', notes='Ask each question, count to three, then everyone shows their answer. The next slide has the answers.', band=AMBER)
        cw, ch = Inches(5.85), Inches(2.42)
        for k, q in enumerate(qs):
            x, y = Inches(0.7) + (k % 2) * (cw + Inches(0.2)), Inches(1.75) + (k // 2) * (ch + Inches(0.15))
            box(sl, x, y, cw, ch, AMBER_SOFT, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
            text(sl, x + Inches(0.2), y + Inches(0.1), cw - Inches(0.4), ch - Inches(0.2),
                 [(f"{k + 1}. {plain(q['q'])}", {'bold': True, 'size': 17 if len(q['q']) < 70 else 15, 'after': 8})] + [(f"{L[j]}   {plain(o)}", {'size': 15 if max(len(z) for z in q['o']) < 45 else 13, 'after': 3}) for j, o in enumerate(q['o'][:4])], 15, INK, spacing=1.0)
        sl = self.frame('Quick check: answers', notes='Pick up any question most of the class got wrong before moving on.', band=AMBER)
        ans = []
        for k, q in enumerate(qs):
            ans += [(f"{k + 1}.  {L[q['a']]}: {plain(q['o'][q['a']])}", {'bold': True, 'size': 18, 'after': 2}), (plain(q.get('why', '')), {'size': 15, 'color': MUTED, 'after': 14})]
        text(sl, Inches(0.7), Inches(1.85), Inches(11.9), Inches(5.0), ans, 16, INK)

    def exit(self, pg):
        pr = (pg.get('practice') or [])
        if not pr: return
        q = pr[0]
        sl = self.frame('Exit ticket', f"{q.get('m', 2)} marks  ·  in your workbook", notes='Model answer: ' + plain(q.get('a', '')), band=NAVY)
        box(sl, Inches(0.7), Inches(1.95), Inches(11.9), Inches(3.3), SOFT, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
        text(sl, Inches(1.1), Inches(2.1), Inches(11.1), Inches(3.0), plain(q['q']), 28 if len(q['q']) < 140 else 22, INK, anchor=MSO_ANCHOR.MIDDLE, align=PP_ALIGN.CENTER)
        sc = pg.get('sc') or []
        if sc: text(sl, Inches(0.7), Inches(5.45), Inches(11.9), Inches(1.4), [('Look back at today’s success criteria: can you tick them all?', {'bold': True, 'color': TEAL, 'size': 15})] + [(plain(x), {'bullet': '✓', 'size': 14, 'after': 2}) for x in sc], 14, INK)

    def end(self):
        self.lesson = 0
        sl = self.slide(NAVY, notes='Pupils can revise every lesson in their workbook and take the 100-question topic test when you set it.')
        text(sl, Inches(0.9), Inches(2.0), Inches(11.5), Inches(1.0), 'END OF TOPIC', 18, RGBColor(0x93, 0xAB, 0xFF), HEAD)
        text(sl, Inches(0.9), Inches(2.6), Inches(11.5), Inches(1.6), self.t['title'].upper(), 40, WHITE, HEAD)
        text(sl, Inches(0.9), Inches(4.4), Inches(11), Inches(2), ['Revise each lesson in your workbook: the notes, key words and quick checks.', 'Then take the topic test when Mr Butler sets it.'], 20, RGBColor(0xC9, 0xD2, 0xE8))

    def build(self):
        self.cover()
        for i, pg in enumerate(self.t['pages']):
            self.lesson_title(i, pg); self.starter(pg); self.aims(pg)
            acts = [b for b in pg.get('blocks', []) if b.get('t') == 'act']
            slides = pg.get('slides') or []
            # activities go where the page puts them: after the teaching slide whose index is in the activity's "after"
            placed = {}
            for b in acts: placed.setdefault(min(int(b.get('after', len(slides))), len(slides)), []).append(b)
            for k, s in enumerate(slides):
                self.content(s)
                if k == 0: self.words(pg)
                for b in placed.get(k + 1, []): self.activity(b)
            for b in placed.get(0, []): self.activity(b)
            self.check(pg); self.exit(pg)
        self.end()
        return self.p


def build(slug):
    d = os.path.join(LIB, slug); t = json.load(open(os.path.join(d, 'topic.json'), encoding='utf-8'))
    safe = re.sub(r'\s*[:/\\*?"<>|]+\s*', ' - ', t['title']).strip(' -')   # a file name every computer accepts (no colons etc.)
    out = os.path.join(d, f"1 - LESSON - {safe}.pptx")
    Deck(slug, t).build().save(out)
    return out


if __name__ == '__main__':
    args = sys.argv[1:]
    if args == ['--all']:
        args = [s for s in sorted(os.listdir(LIB)) if os.path.isfile(os.path.join(LIB, s, 'topic.json')) and any(p.get('slides') for p in json.load(open(os.path.join(LIB, s, 'topic.json'))).get('pages', []))]
    for s in args: print(build(s))
