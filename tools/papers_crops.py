"""Work out where each workbook exam question sits on its CCEA question paper and mark scheme, so the notes viewer can
show just that question. Writes papers/crops.json:

  { "BOOK|series|q": { "paper": [[page, top, bottom], ...], "ms": [[page, top, bottom], ...], "stem": [[...]] } }

page is 1-based; top/bottom are fractions of the page height (0 = top). One segment per page the part spans, in reading
order. "stem" (question paper only, optional) is the shared lead-in of the parent question/part (e.g. the table that
2(a) and 2(b) both refer to) when the part itself does not start with it. Keys that cannot be located are left out, as is
either side that cannot be located.

How: the PDFs have text layers. Question labels are found from words at the start of each text line ("3", "(b)", "(ii)",
or combined "3 (b) (ii)"), accepted only in sequence (questions 1, 2, 3 ...; parts (a), (b) ...; (i), (ii) ...), with the
left-margin indent deciding (i)/(v)/(x) between letter and roman. A part runs from its label to the next label at the same
or a higher level. In question papers, lead-in text between one part's last mark "[n]" and the next label belongs to
the next part. Page headers/footers (barcodes, "[Turn over", paper codes, page numbers, "AVAILABLE MARKS") are ignored.

Run by hand after uploading papers:  python3 tools/papers_crops.py   (needs pdfplumber)
Options: --books DIR   read the workbook data from DIR/<BOOK>.json instead of notes/<BOOK>.html
         --all         also emit every part found in the papers (keys in papers/pages.json style), not just workbook keys
         --only KEY    restrict to keys starting with KEY (debugging)
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, "papers")
BOOKS = ["U1", "U4", "AS1", "AS2", "A21"]
ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"]
LETTERS = "abcdefghijklmnopqrstuvwxyz"
DASH = "–"

# ---------------------------------------------------------------- workbook keys
def series_of(book, e):
    if book.startswith(("AS", "A2")):
        return str(e.get("series") or ("Summer %s" % e["year"] if e.get("year") else ""))
    return str(e.get("year") or e.get("series") or "")


def book_items(book, books_dir):
    if books_dir:
        f = os.path.join(books_dir, book + ".json")
        if not os.path.exists(f):
            return []
        data = json.load(open(f, encoding="utf-8"))
    else:
        f = os.path.join(ROOT, "notes", book + ".html")
        if not os.path.exists(f):
            return []
        src = open(f, encoding="utf-8").read()
        m = re.search(r"^const BOOK = (\{.*\});\s*$", src, re.M)
        if not m:
            return []
        js = re.sub(r"\\(.)", lambda m: m.group(0) if m.group(1) in '"\\/bfnrtu' else m.group(1), m.group(1), flags=re.S)  # drop JS-only escapes (\' \<)
        try:
            data = json.JSONDecoder(strict=False).raw_decode(js)[0]
        except ValueError:
            return []
    out = []
    for ch in data.get("chapters", []):
        for pg in ch.get("pages", []):
            for e in pg.get("exam") or []:
                if e.get("q"):
                    out.append(e)
    return out


def wanted_keys(books_dir):
    keys = set()
    for b in BOOKS:
        for e in book_items(b, books_dir):
            s = series_of(b, e)
            # the viewer keys GCSE specimen items by year when they have one; cover the "Specimen" spelling too
            keys.add("%s|%s|%s" % (b, s, re.sub(r"^Q", "", str(e["q"]), flags=re.I)))
            if e.get("series") and str(e.get("series")) != s:
                keys.add("%s|%s|%s" % (b, e["series"], re.sub(r"^Q", "", str(e["q"]), flags=re.I)))
    return keys


# ---------------------------------------------------------------- PDF reading
FOOT_RE = re.compile(
    r"^\[?\s*turn over|^\*.*\*$|^\d{4,6}(\.\d+)?[A-Z]?\b|do not write|blank page|questions continue|"
    r"permission to reproduce|rewarding learning|^page \d+|^available$|^marks$|^available marks$|"
    r"^examiner only|^marks re-?mark|^remark$|^\d+ \[turn over",
    re.I)
END_RE = re.compile(r"this is the end of the question paper|end of (the )?(question )?paper|for examiner.?s use only|"
                    r"examiner number|^total marks$|^total \d{2,3}$", re.I)
COVER_RE = re.compile(r"instructions to candidates|candidate number|general marking instructions|mark\s+scheme|"
                      r"information for candidates", re.I)
TOKEN_RE = re.compile(r"^(?:(\d{1,2})(?=\(|$))?((?:\([a-z]{1,4}\))*)$")


def lines_of(page):
    """Text lines as dicts: words, text, x0, top, bottom (PDF points)."""
    words = page.extract_words(keep_blank_chars=False, use_text_flow=False, x_tolerance=1.5, y_tolerance=2.5)
    words.sort(key=lambda w: (round(w["top"]), w["x0"]))
    rows = []
    for w in words:
        for r in rows:
            if abs(r["top"] - w["top"]) <= 2.5 and abs(r["bottom"] - w["bottom"]) <= 4:
                r["words"].append(w)
                r["top"] = min(r["top"], w["top"]); r["bottom"] = max(r["bottom"], w["bottom"])
                break
        else:
            rows.append({"words": [w], "top": w["top"], "bottom": w["bottom"]})
    out = []
    for r in rows:
        ws = sorted(r["words"], key=lambda w: w["x0"])
        # split a row into chunks where there is a wide horizontal gap (separate columns)
        chunks, cur = [], [ws[0]]
        for w in ws[1:]:
            if w["x0"] - cur[-1]["x1"] > 40:
                chunks.append(cur); cur = [w]
            else:
                cur.append(w)
        chunks.append(cur)
        for c in chunks:
            out.append({"words": c, "text": " ".join(w["text"] for w in c), "x0": c[0]["x0"], "x1": c[-1]["x1"],
                        "top": min(w["top"] for w in c), "bottom": max(w["bottom"] for w in c)})
    out.sort(key=lambda l: (l["top"], l["x0"]))
    return out


class Doc:
    def __init__(self, path):
        import pdfplumber
        self.pages = []
        with pdfplumber.open(path) as pdf:
            for pg in pdf.pages:
                H, W = float(pg.height), float(pg.width)
                ls = lines_of(pg)
                for l in ls:
                    t = l["text"].strip()
                    l["foot"] = bool(FOOT_RE.search(t) and (l["top"] > 0.78 * H or l["top"] < 0.09 * H or
                                                            re.search(r"blank page|do not write|questions continue|available|marks|examiner|re-?mark", t, re.I)))
                    # paper codes / barcodes / page numbers in the bottom band
                    if l["top"] > 0.8 * H and (re.match(r"^\*|^\d{4,6}(\.\d+)?\b|^\[\s*turn", t, re.I) or (
                            re.match(r"^\d{1,3}$", t) and abs((l["x0"] + l["x1"]) / 2 - W / 2) < 0.08 * W)):
                        l["foot"] = True
                foot_top = min([l["top"] for l in ls if l["foot"] and l["top"] > 0.6 * H] + [H * 0.97])
                body = [l for l in ls if not l["foot"] and l["bottom"] <= foot_top + 1]
                g_bottom = 0
                g_top = H
                try:
                    objs = list(pg.rects) + list(pg.lines) + list(pg.curves)
                except Exception:
                    objs = []
                for o in objs:
                    top, bot = float(o["top"]), float(o["bottom"])
                    if bot - top > 0.5 * H or bot > foot_top - 1 or top < 0.04 * H:
                        continue
                    if float(o["x1"]) - float(o["x0"]) < 3 and bot - top < 3:
                        continue
                    g_bottom = max(g_bottom, bot); g_top = min(g_top, top)
                text = " ".join(l["text"] for l in ls)
                blank = not body or (re.search(r"blank page", text, re.I) and len(body) <= 3)
                # the viewer (pdf.js) shows the crop box: positions are fractions of it, measured from its top edge
                mb, cb = pg.mediabox, pg.cropbox
                try:
                    vt, vb = max(float(mb[1]), float(cb[1])), min(float(mb[3]), float(cb[3]))
                    off, vh = float(mb[3]) - vb, vb - vt
                except Exception:
                    off, vh = 0.0, H
                if vh <= 0:
                    off, vh = 0.0, H
                self.pages.append({
                    "off": off, "vh": vh, "rot": int(pg.page_obj.attrs.get("Rotate") or 0) % 360,
                    "W": W, "H": H, "lines": ls, "body": body, "foot_top": foot_top, "blank": bool(blank),
                    "c_top": min([l["top"] for l in body] + ([g_top] if g_bottom else []) + [foot_top]),
                    "c_bot": max([l["bottom"] for l in body] + [g_bottom, 0]),
                })


# ---------------------------------------------------------------- label detection
def split_label(words):
    """Leading label tokens of a line -> list of (kind, value, x0) with kind 'n' or 'p' (parenthesised)."""
    toks = []
    for w in words:
        t = w["text"].strip()
        m = TOKEN_RE.match(t)
        if not m or not t:
            break
        if m.group(1):
            if toks:
                break
            toks.append(("n", int(m.group(1)), w["x0"]))
        for p in re.findall(r"\(([a-z]{1,4})\)", m.group(2) or ""):
            toks.append(("p", p, w["x0"]))
        if not m.group(1) and not m.group(2):
            break
    return toks


def find_labels(doc, is_ms):
    """Ordered list of label events: dict(page, top, q, l, r) where l/r may be None (start of question / letter part)."""
    # left-margin columns for letter labels, by page parity (odd/even pages are offset in CCEA papers)
    cols = {0: [], 1: []}
    for i, pg in enumerate(doc.pages):
        for l in pg["body"]:
            tk = split_label(l["words"])
            if tk and tk[0][0] == "p" and tk[0][1] in LETTERS[:8] and tk[0][1] not in ("i",):
                cols[i % 2].append(tk[0][2])
    med = lambda a: sorted(a)[len(a) // 2] if a else None
    lcol = {k: med(v) for k, v in cols.items()}
    if lcol[0] is None: lcol[0] = lcol[1]
    if lcol[1] is None: lcol[1] = lcol[0]

    ev = []
    q, let, rom = 0, None, None
    qx = []
    rej = doc.rejected = []
    for i, pg in enumerate(doc.pages):
        if pg["blank"] or (i < 4 and COVER_RE.search(" ".join(l["text"] for l in pg["lines"]))):
            continue
        W = pg["W"]
        # numbered rows (spreadsheet row numbers, numbered code lines): runs of 3+ consecutive numbers in one column
        nums = [(l, split_label(l["words"])) for l in pg["body"]]
        nums = [(l, t[0][1], t[0][2]) for l, t in nums if t and t[0][0] == "n"]
        rowish = set()
        for a in nums:
            run = [a]
            for b in nums:
                if b is not a and abs(b[2] - a[2]) < 4 and abs(b[1] - a[1]) == 1 and abs(b[0]["top"] - a[0]["top"]) < 45:
                    run.append(b)
            if len(run) >= 3 or (len(run) == 2 and any(abs(b[0]["top"] - a[0]["top"]) < 30 for b in run[1:])):
                rowish.update(id(r[0]) for r in run)
        for l in pg["body"]:
            tk = split_label(l["words"])
            if not tk or (tk[0][0] == "n" and id(l) in rowish):
                continue
            k = 0
            nq, nl, nr = q, let, rom
            changed = None
            first = None
            # question number
            if tk[0][0] == "n":
                v, x = tk[0][1], tk[0][2]
                more = len(l["words"]) > 1
                lc = lcol[i % 2]
                if v == q + 1 and x < 0.25 * W and (lc is None or x < lc - 6) and (
                        more or (qx and abs(x - sorted(qx)[len(qx) // 2]) < 12)):
                    qx.append(x)
                    nq, nl, nr = v, None, None
                    changed = first = "q"
                    k = 1
                else:
                    continue
            # parenthesised parts
            ok = True
            for kind, v, x in tk[k:]:
                exp_l = LETTERS[LETTERS.index(nl) + 1] if nl else "a"
                exp_r = ROMAN[ROMAN.index(nr) + 1] if nr else "i"
                is_l = v == exp_l
                is_r = v == exp_r and (nl is not None or changed == "q" or nq > 0)
                if is_l and is_r:
                    # ambiguous (i)/(v)/(x): roman if it follows a letter on the same line, else decide by indent
                    if changed == "l":
                        is_l = False
                    else:
                        lc = lcol[i % 2]
                        if lc is not None and x > lc + 11:
                            is_l = False
                        else:
                            is_r = False
                if is_l and (changed in (None, "q")):
                    nl, nr = v, None
                    changed = "l"
                    first = first or "l"
                elif is_r:
                    nr = v
                    changed = "r"
                    first = first or "r"
                else:
                    ok = False
                    break
            if not ok or not changed:
                # a part label in the letter column that does not fit the sequence: remember it, so that the region
                # around it is not trusted (a missed label would otherwise be swallowed by the part before it)
                kind, v, x = tk[k] if k < len(tk) else tk[0]
                lc = lcol[i % 2]
                if kind == "p" and v in LETTERS and v not in ROMAN and lc is not None and abs(x - lc) < 5:
                    rej.append((i, l["top"]))
                if not changed:
                    continue
            if nq == 0:
                continue
            q, let, rom = nq, nl, nr
            ev.append({"page": i, "top": l["top"], "q": q, "l": let, "r": rom, "lvl": first,
                       "x": tk[0][2]})
    return ev


# ---------------------------------------------------------------- regions
def pos_le(a, b):
    return (a[0], a[1]) <= (b[0], b[1])


def doc_end(doc):
    """Position (page, y) where the last question ends."""
    for i, pg in enumerate(doc.pages):
        for l in pg["lines"]:
            if END_RE.search(l["text"].strip()) and i > 0:
                return (i, l["top"] - 2)
    for i in range(len(doc.pages) - 1, -1, -1):
        if not doc.pages[i]["blank"]:
            return (i, doc.pages[i]["c_bot"] + 4)
    return (0, 0)


def segments(doc, start, end, margin=6.0):
    """start/end: (page, y). Returns [[page1, top, bottom]] as fractions."""
    out = []
    p0, y0 = start
    p1, y1 = end
    for p in range(p0, p1 + 1):
        pg = doc.pages[p]
        if pg["blank"]:
            continue
        H = pg["H"]
        top = y0 - margin if p == p0 else pg["c_top"] - margin
        if p == p1:
            bot = y1
        else:
            bot = min(pg["c_bot"] + margin, pg["foot_top"] - 1)
        top = max(0.0, top)
        bot = min(H, bot)
        if bot - top < 14:
            continue
        if p != p0 and not any(l["top"] >= top - 1 and l["bottom"] <= bot + 2 for l in pg["body"]):
            continue   # only the page furniture (box edge) above the next label: nothing of this part here
        fr = lambda y: round(min(1.0, max(0.0, (y - pg["off"]) / pg["vh"])), 3)
        out.append([p + 1, fr(top), fr(bot)])
    return out


def mark_lines(pg):
    return [l for l in pg["body"] if re.search(r"\[\d+\]\s*$", l["text"]) and l["x1"] > 0.6 * pg["W"]]


def build_regions(doc, is_ms):
    ev = find_labels(doc, is_ms)
    if not ev:
        return {}, {}
    end_pos = doc_end(doc)
    # node path for each event: question, letter part, roman part
    nodes = {}  # path tuple -> [start, end]
    starts = []
    for e in ev:
        paths = []
        if e["lvl"] == "q":
            paths.append((e["q"],))
            if e["l"]: paths.append((e["q"], e["l"]))
            if e["r"]: paths.append((e["q"], e["l"], e["r"]) if e["l"] else (e["q"], None, e["r"]))
        elif e["lvl"] == "l":
            paths.append((e["q"], e["l"]))
            if e["r"]: paths.append((e["q"], e["l"], e["r"]))
        else:
            paths.append((e["q"], e["l"], e["r"]))
        starts.append(((e["page"], e["top"]), paths))
    # a node ends where the next label of the same or higher level starts
    order = []
    for pos, paths in starts:
        for pth in paths:
            nodes[pth] = [pos, None]
            order.append(pth)
    for idx, (pos, paths) in enumerate(starts):
        # the top-level path that starts here closes all open nodes that are not its ancestors
        top_path = paths[0]
        for pth in order:
            if nodes[pth][1] is None and nodes[pth][0] < pos and not (len(pth) < len(top_path) and top_path[:len(pth)] == pth):
                nodes[pth][1] = (pos[0], pos[1] - 3)
    for pth in nodes:
        if nodes[pth][1] is None:
            nodes[pth][1] = end_pos
    # question papers: lead-in text after a part's last mark belongs to the next label
    pre = {}
    if not is_ms:
        for idx in range(1, len(starts)):
            pos, paths = starts[idx]
            if paths[0][0] != starts[idx - 1][1][0][0] or len(paths[0]) == 1:
                continue   # new question: its number comes first
            prev = starts[idx - 1][0]
            # last mark line between prev and pos
            cand = []
            for p in range(prev[0], pos[0] + 1):
                pg = doc.pages[p]
                for l in pg["body"]:
                    lp = (p, l["top"])
                    if (prev[0], prev[1] + 1) < lp < pos:
                        cand.append((lp, l))
            marks = [c for c in cand if re.search(r"\[\d+\]\s*$", c[1]["text"]) and c[1]["x1"] > 0.6 * doc.pages[c[0][0]]["W"]]
            if not marks:
                continue
            mpos, ml = marks[-1]
            after = [c for c in cand if c[0] > mpos and (c[0][0] > mpos[0] or c[1]["top"] > ml["bottom"] + 2)]
            if not after:
                continue
            first = after[0][0]
            new_end = (mpos[0], ml["bottom"] + 4)
            for pth in order:
                if nodes[pth][1] and nodes[pth][1][0] == pos[0] and abs(nodes[pth][1][1] - (pos[1] - 3)) < 0.5 and nodes[pth][0] < first:
                    nodes[pth][1] = new_end
            for pth in paths:
                nodes[pth][0] = first
    # stems: own text of a node before its first child
    stems = {}
    for pth in order:
        kids = [k for k in order if len(k) == len(pth) + 1 and k[:len(pth)] == pth]
        if kids:
            first = min(nodes[k][0] for k in kids)
            if first > nodes[pth][0]:
                stems[pth] = (nodes[pth][0], (first[0], first[1] - 3))
    return nodes, stems


# ---------------------------------------------------------------- key parsing
def parse_q(qs):
    """'2(d)–(f)' -> ((2,'d'), (2,'f')) as start/end node paths; '3(b)(i)–(ii)'; '1'; '4(e)(i)'."""
    qs = qs.replace("-", DASH).replace(" ", "")
    m = re.match(r"^(\d{1,2})((?:\([a-z]{1,4}\))*)(?:" + DASH + r"((?:\([a-z]{1,4}\))+))?$", qs)
    if not m:
        return None
    n = int(m.group(1))
    a = re.findall(r"\(([a-z]{1,4})\)", m.group(2) or "")
    b = re.findall(r"\(([a-z]{1,4})\)", m.group(3) or "") if m.group(3) else None
    sp = (n,) + tuple(a)
    if b is None:
        return sp, sp
    ep = (n,) + tuple(a[:len(a) - len(b)]) + tuple(b) if len(b) <= len(a) else None
    if ep is None:
        return None
    return sp, ep


def lookup(nodes, pth):
    if pth in nodes:
        return nodes[pth]
    if len(pth) == 2 and pth[1] in ROMAN and (pth[0], None, pth[1]) in nodes:
        return nodes[(pth[0], None, pth[1])]
    return None


def locate(doc, nodes, stems, qs, with_stem=False):
    pq = parse_q(qs)
    if not pq:
        return None, None
    a, b = lookup(nodes, pq[0]), lookup(nodes, pq[1])
    if not a or not b or b[1] < a[0]:
        return None, None
    if any(a[0] < r < b[1] for r in getattr(doc, "rejected", [])):
        return None, None
    seg = segments(doc, a[0], b[1])
    st = None
    if with_stem and len(pq[0]) > 1:
        ss = []
        for k in range(1, len(pq[0])):
            anc = pq[0][:k]
            if anc in stems:
                s0, s1 = stems[anc]
                if s1 < a[0] and s0 < a[0]:
                    ss += segments(doc, s0, min(s1, a[0]))
        # drop stems that run straight into the part (already contiguous) only if huge; cap at ~1.5 pages
        tot = sum(x[2] - x[1] for x in ss)
        if ss and tot < 1.5:
            st = ss
    return (seg or None), st


def label_key(pth):
    s = str(pth[0])
    for x in pth[1:]:
        if x:
            s += "(%s)" % x
    return s


# ---------------------------------------------------------------- main
def main(argv):
    books_dir = None
    allp = "--all" in argv
    only = None
    if "--books" in argv:
        books_dir = argv[argv.index("--books") + 1]
    if "--only" in argv:
        only = argv[argv.index("--only") + 1]
    folders = json.load(open(os.path.join(P, "folders.json"), encoding="utf-8"))
    manifest = json.load(open(os.path.join(P, "manifest.json"), encoding="utf-8"))
    keys = wanted_keys(books_dir)
    by_ser = {}
    for k in keys:
        b, s, q = k.split("|", 2)
        by_ser.setdefault((b, s), set()).add(q)
    if allp:
        for fk in folders:
            by_ser.setdefault(tuple(fk.split("|", 1)), set())
    out = {}
    stats = {}
    for (b, s), qs in sorted(by_ser.items()):
        if only and not ("%s|%s" % (b, s)).startswith(only[:len("%s|%s" % (b, s))]) and not only.startswith("%s|%s" % (b, s)):
            continue
        folder = folders.get("%s|%s" % (b, s))
        f = manifest.get(folder or "", {})
        res = {}
        for side in ("paper", "ms"):
            fn = f.get(side)
            if not fn or not os.path.exists(os.path.join(ROOT, fn)):
                continue
            try:
                doc = Doc(os.path.join(ROOT, fn))
                if any(pg["rot"] for pg in doc.pages):
                    raise ValueError("rotated pages are not handled")
                nodes, stems = build_regions(doc, side == "ms")
            except Exception as ex:   # unreadable PDF: skip it
                print("skip %s: %s" % (fn, ex), file=sys.stderr)
                continue
            allq = set(qs)
            if allp:
                allq |= {label_key(p) for p in nodes}
            for q in allq:
                seg, st = locate(doc, nodes, stems, q, with_stem=(side == "paper"))
                if seg:
                    res.setdefault(q, {})[side] = seg
                    if st:
                        res[q]["stem"] = st
        for q in (qs if folder else ()):
            st = stats.setdefault(b, {"keys": 0, "paper": 0, "ms": 0})
            st["keys"] += 1
            for side in ("paper", "ms"):
                if side in res.get(q, {}):
                    st[side] += 1
        for q, v in res.items():
            out["%s|%s|%s" % (b, s, q)] = v
    with open(os.path.join(P, "crops.json"), "w", encoding="utf-8") as fh:
        fh.write("{\n" + ",\n".join(json.dumps(k, ensure_ascii=False) + ":" + json.dumps(out[k], separators=(",", ":"))
                                     for k in sorted(out)) + "\n}\n")
    for b, st in sorted(stats.items()):
        print("%-4s workbook keys %4d  paper %4d  ms %4d" % (b, st["keys"], st["paper"], st["ms"]))
    print("papers/crops.json: %d key(s)" % len(out))


if __name__ == "__main__":
    main(sys.argv[1:])
