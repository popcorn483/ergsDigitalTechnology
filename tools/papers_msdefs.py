"""Find the key terms that CCEA mark schemes use: the term (or the wording the glossary says is also credited) appears in the
mark-scheme answer for a question (the question's own mark-scheme crop, so not the general marking instructions). Earlier
this looked only for definitions ("X is …"), which found too few. For every past-paper question with a mark-scheme crop (papers/crops.json
"ms" segments), read the mark-scheme text in that region and look for each workbook glossary term (or the wording the
glossary says is also credited) used as a definition: "<term> is/are/means/refers to …", "<term> – …", "<term>: …",
"definition of <term>", or a term on its own line followed by its meaning. Writes papers/msdefs.json:

  { "U1": { "bit": ["2021|4", "2019|2(b)"], ... }, ... }   (glossary term in lower case -> "series|question" keys)

The revision workbooks use it to highlight the terms CCEA has asked pupils to define (with the question wording too).
Run after tools/papers_crops.py:  python3 tools/papers_msdefs.py   (needs pdfplumber)
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, "papers")
sys.path.insert(0, os.path.join(ROOT, "tools"))


def book_gloss(book):
    f = os.path.join(ROOT, "notes", book + ".html")
    if not os.path.exists(f):
        return []
    src = open(f, encoding="utf-8").read()
    m = re.search(r"^const BOOK = (\{.*\});\s*$", src, re.M)
    if not m:
        return []
    js = re.sub(r"\\(.)", lambda m: m.group(0) if m.group(1) in '"\\/bfnrtu' else m.group(1), m.group(1), flags=re.S)
    try:
        data = json.JSONDecoder(strict=False).raw_decode(js)[0]
    except ValueError:
        return []
    return data.get("glossary") or []


def names(g):
    out = set()
    def add(n):
        n = re.sub(r"\*\*|`", "", str(n or "")).strip().lower()
        if len(n) >= 3:
            out.add(n)
    add(g.get("term")); add(re.sub(r"\s*\([^)]*\)\s*", " ", g.get("term") or ""))
    for x in re.findall(r"\(([^)]+)\)", g.get("term") or ""):
        add(x)
    for x in re.split(r"\s*(?:[,;/]|\bor\b)\s*", re.sub(r"\*\*|`", "", g.get("alt") or ""), flags=re.I):
        if len(x.split()) >= 2:
            add(x)
    return out


DEF_BEFORE = r"(?:^|[.:;\]•)–]\s*|\(\w{1,4}\)\s*|\b[A-D]\s+|\[\d\]\s*)"   # the term starts an answer: after a full stop, a part label, a bullet or a mark
DEF_AFTER = r"(?:s|es)?\s*(?:\([^)]{1,30}\)\s*)?(?:(?:is|are) (?:a|an|the|any|one|when|where|used|data|facts|software|hardware|how)\b|means\b|refers to\b|[–:=]\s)"


def ms_text(pdf, cache, seg):
    n, t, b = seg
    if n < 1 or n > len(pdf.pages):
        return ""
    if n not in cache:
        pg = pdf.pages[n - 1]
        mb, cb = pg.mediabox, pg.cropbox
        try:
            vt, vb = max(float(mb[1]), float(cb[1])), min(float(mb[3]), float(cb[3]))
            off, vh = float(mb[3]) - vb, vb - vt
        except Exception:
            off, vh = 0.0, float(pg.height)
        cache[n] = (pg, off, vh)
    pg, off, vh = cache[n]
    top, bot = max(0.0, off + t * vh), min(float(pg.height), off + b * vh)
    if bot - top < 4:
        return ""
    try:
        return pg.crop((0, top, float(pg.width), bot)).extract_text() or ""
    except Exception:
        return ""


def main():
    import pdfplumber
    crops = json.load(open(os.path.join(P, "crops.json"), encoding="utf-8"))
    folders = json.load(open(os.path.join(P, "folders.json"), encoding="utf-8"))
    manifest = json.load(open(os.path.join(P, "manifest.json"), encoding="utf-8"))
    gl = {}
    out = {}
    opened = {}
    try:
        for k, v in sorted(crops.items()):
            if k.startswith("_") or not isinstance(v, dict) or not v.get("ms"):
                continue
            b, s, q = k.split("|", 2)
            if b not in gl:
                gl[b] = [(g["term"].lower(), names(g)) for g in book_gloss(b) if g.get("term")]
                gl[b] = [(t, [re.compile(r"(?<![a-z0-9-])" + re.escape(n).replace(r"\ ", r"[\s-]+") + r"(?:s|es)?(?![a-z0-9-])", re.I) for n in ns]   # the term (or its credited wording) in the question's mark-scheme answer
                          + [re.compile(r"definition of (?:an? |the )?" + re.escape(n), re.I) for n in ns]) for t, ns in gl[b]]
            fn = (manifest.get(folders.get(b + "|" + s, ""), {}) or {}).get("ms")
            if not fn or not os.path.exists(os.path.join(ROOT, fn)):
                continue
            if fn not in opened:
                try:
                    opened[fn] = (pdfplumber.open(os.path.join(ROOT, fn)), {})
                except Exception as ex:
                    print("skip %s: %s" % (fn, ex), file=sys.stderr); opened[fn] = None
            if not opened[fn]:
                continue
            pdf, cache = opened[fn]
            text = " ".join(ms_text(pdf, cache, sg) for sg in v["ms"])
            text = re.sub(r"\s+", " ", text)
            if not text:
                continue
            for term, rxs in gl[b]:
                if any(r.search(text) for r in rxs):
                    out.setdefault(b, {}).setdefault(term, []).append(s + "|" + q)
    finally:
        for x in opened.values():
            if x:
                x[0].close()
    with open(os.path.join(P, "msdefs.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    for b in sorted(out):
        print("%-4s %d terms used in mark schemes (%d question links)" % (b, len(out[b]), sum(len(x) for x in out[b].values())))


if __name__ == "__main__":
    main()
