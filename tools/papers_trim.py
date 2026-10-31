"""Trim the CCEA watermark strip off past-paper question crops.

CCEA question papers repeat a small "CCEA" logo down the outer edge of every page. papers/crops.json gives each question's
vertical bands ([page, top, bottom], fractions of the page crop box); this adds the horizontal extent of the real content
in each band, leaving out those edge logos, so the app and the topic packs can cut them off:
  "px": [[left, right], ...]  one per "paper" segment;  "sx": [[left, right], ...]  one per "stem" segment
(fractions of the crop-box width), and "pg" / "sg": blank runs inside each band ([[top, bottom], ...] per segment)
that the compressed packs squeeze out. Mark schemes and examiner reports have no watermark and are left alone.
Run after tools/papers_crops.py:  python3 tools/papers_trim.py
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, "papers")
EDGE = 0.10   # images wholly inside the outer 10% of the page width are the watermark strip
PAD = 5.0     # points of breathing room either side of the content
GAP = 34.0    # a vertical run this tall with no text or pictures (answer lines/space only) can be squeezed in the compressed packs


def page_info(pdf, cache, n):
    if n in cache:
        return cache[n]
    pg = pdf.pages[n - 1]
    W, H = float(pg.width), float(pg.height)
    mb, cb = pg.mediabox, pg.cropbox
    try:
        vt, vb = max(float(mb[1]), float(cb[1])), min(float(mb[3]), float(cb[3]))
        off, vh = float(mb[3]) - vb, vb - vt
        x0, x1 = max(float(mb[0]), float(cb[0])) - float(mb[0]), min(float(mb[2]), float(cb[2])) - float(mb[0])
    except Exception:
        off, vh, x0, x1 = 0.0, H, 0.0, W
    if vh <= 0 or x1 <= x0:
        off, vh, x0, x1 = 0.0, H, 0.0, W
    objs, wl, wr = [], x0, x1   # wl / wr: inner edges of the left / right logo strips (and of a marks column)
    texty = []
    shapes = list(pg.rects) + list(pg.lines) + list(pg.curves)
    tall = lambda o: float(o["bottom"]) - float(o["top"]) > 0.4 * H
    # the mark scheme's "available marks" column (and any examiner-only column): a tall box in the right-hand 40% of the page
    col = [float(o["x0"]) for o in shapes if tall(o) and float(o["x0"]) > x0 + 0.6 * (x1 - x0) and float(o["x1"]) - float(o["x0"]) > 8]
    if col:
        wr = min(wr, min(col) - 1)
    for c in pg.chars:
        if c.get("text", "").strip() and float(c["x0"]) < wr and c.get("upright", True):   # sideways text is the page's reference code down the margin
            objs.append((float(c["x0"]), float(c["x1"]), float(c["top"]), float(c["bottom"])))
            if float(x0 + EDGE * (x1 - x0)) < float(c["x0"]) < float(x1 - EDGE * (x1 - x0)):
                texty.append((float(c["top"]), float(c["bottom"])))
    edges = [float(o[k]) for o in shapes if tall(o) for k in ("x0", "x1")]
    corner = lambda o: (float(o["x1"]) - float(o["x0"]) < 25 and float(o["bottom"]) - float(o["top"]) < 25
                        and any(abs(float(o["x0"]) - e) < 2 or abs(float(o["x1"]) - e) < 2 for e in edges))
    for o in shapes:
        if corner(o):   # the corner brackets of the page frame
            continue
        if tall(o) or float(o["x0"]) >= wr:   # page frames, column rules and the marks column itself are not content
            continue
        if float(o["x1"]) - float(o["x0"]) < 2.5 and float(o["bottom"]) - float(o["top"]) > 15:   # thin upright rules (bits of the answer-box frame); tables keep their width from their horizontal rules
            continue
        objs.append((float(o["x0"]), float(o["x1"]), float(o["top"]), float(o["bottom"])))
    for im in pg.images:
        a, b = float(im["x0"]), float(im["x1"])
        if b <= x0 + EDGE * (x1 - x0):   # the left edge logo strip
            wl = max(wl, b); continue
        if a >= x1 - EDGE * (x1 - x0):   # the right edge logo strip
            wr = min(wr, a); continue
        objs.append((a, b, float(im["top"]), float(im["bottom"])))
        texty.append((float(im["top"]), float(im["bottom"])))
    for o in list(pg.rects) + list(pg.curves):   # boxes, tables and drawings count as content; thin rules (answer lines) do not
        if float(o["bottom"]) - float(o["top"]) > 4 and float(o["x1"]) - float(o["x0"]) > 4 and float(o["bottom"]) - float(o["top"]) < 0.6 * H:
            texty.append((float(o["top"]), float(o["bottom"])))
    cache[n] = (off, vh, x0, x1, objs, wl, wr, sorted(texty))
    return cache[n]


def bounds(pdf, cache, seg):
    n, t, b = seg
    if n < 1 or n > len(pdf.pages):
        return None
    off, vh, x0, x1, objs, wl, wr, texty = page_info(pdf, cache, n)
    top, bot = off + t * vh, off + b * vh
    xs = [(a, c) for a, c, ot, ob in objs if ob > top and ot < bot and c > x0 and a < x1]
    if not xs:
        return None
    lo, hi = max(x0, wl + 1, min(a for a, _ in xs) - PAD), min(x1, wr - 1, max(c for _, c in xs) + PAD)
    w = x1 - x0
    l, r = round((lo - x0) / w, 3), round((hi - x0) / w, 3)
    if r - l < 0.3 or (l < 0.02 and r > 0.98):
        return None
    return [l, r]


def gaps(pdf, cache, seg):
    """blank vertical runs inside a band, as [top, bottom] fractions (of the crop-box height), leaving 8pt either side"""
    n, t, b = seg
    if n < 1 or n > len(pdf.pages):
        return []
    off, vh, x0, x1, objs, wl, wr, texty = page_info(pdf, cache, n)
    top, bot = off + t * vh, off + b * vh
    spans = sorted((max(a, top), min(c, bot)) for a, c in texty if c > top and a < bot)
    out, cur = [], top
    for a, c in spans + [(bot, bot)]:
        if a - cur >= GAP:
            out.append([round((cur + 8 - off) / vh, 4), round((a - 8 - off) / vh, 4)])
        cur = max(cur, c)
    return out


def main():
    import pdfplumber
    crops = json.load(open(os.path.join(P, "crops.json"), encoding="utf-8"))
    folders = json.load(open(os.path.join(P, "folders.json"), encoding="utf-8"))
    manifest = json.load(open(os.path.join(P, "manifest.json"), encoding="utf-8"))
    open_pdfs, n_trim = {}, 0
    try:
        for k, v in crops.items():
            if k.startswith("_") or not isinstance(v, dict):
                continue
            b, s, _ = k.split("|", 2)
            files = manifest.get(folders.get("%s|%s" % (b, s), ""), {}) or {}
            for fn, sides in ((files.get("paper"), (("paper", "px", "pg"), ("stem", "sx", "sg"))), (files.get("ms"), (("ms", "mx", None),))):
                n_trim += trim_one(v, fn, sides, open_pdfs)
    finally:
        for x in open_pdfs.values():
            if x:
                x[0].close()
    with open(os.path.join(P, "crops.json"), "w", encoding="utf-8") as fh:
        fh.write("{\n" + ",\n".join(json.dumps(k, ensure_ascii=False) + ":" + json.dumps(crops[k], separators=(",", ":"))
                                     for k in sorted(crops)) + "\n}\n")
    print("papers/crops.json: trimmed %d crop list(s)" % n_trim)


def trim_one(v, fn, sides, open_pdfs):
    import pdfplumber
    n = 0
    if True:
            if not fn or not os.path.exists(os.path.join(ROOT, fn)):
                return 0
            if fn not in open_pdfs:
                try:
                    open_pdfs[fn] = (pdfplumber.open(os.path.join(ROOT, fn)), {})
                except Exception as ex:
                    print("skip %s: %s" % (fn, ex), file=sys.stderr); open_pdfs[fn] = None
            if not open_pdfs[fn]:
                return 0
            pdf, cache = open_pdfs[fn]
            for side, out, go in sides:
                segs = v.get(side) or []
                bs = [bounds(pdf, cache, sg) for sg in segs]
                if any(bs):
                    v[out] = [x or [0, 1] for x in bs]; n += 1
                else:
                    v.pop(out, None)
                if not go:
                    continue
                gs = [gaps(pdf, cache, sg) for sg in segs]
                if any(gs):
                    v[go] = gs
                else:
                    v.pop(go, None)
    return n

if __name__ == "__main__":
    main()
