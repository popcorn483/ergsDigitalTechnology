"""Find each workbook question's comment in the CCEA Chief Examiner's reports, so the Teacher area's topic packs can show it.

Upload convention (also in papers/GCSE/Examiner reports/README.md and papers/A level/Examiner reports/README.md):
  papers/GCSE/Examiner reports/Summer <year>.pdf      CCEA's GCSE Digital Technology report (covers every GCSE unit)
  papers/A level/Examiner reports/Summer <year>.pdf   CCEA's GCE Digital Technology report (covers AS 1, AS 2, A2 1, A2 2)
Any file name with the year works ("2024.pdf", CCEA's own "GCE Digital Technology (2016)-Summer2024-Report_0.pdf"); a year in
brackets is the specification, not the series. A name with "resit" or "autumn" is the A level "Summer <year> Resit" series.

Writes papers/reports.json:
  { "files": { "gcse|2024": "papers/GCSE/Examiner reports/Summer 2024.pdf", "gce|Summer 2024": "..." },
    "none":  { "gcse": ["2021", "Specimen"], "gce": [...] },       series CCEA published no report for
    "crops": { "AS2|Summer 2024|3(b)": { "report": [[page, top, bottom], ...], "report_file": "...", "found": "3(b)",
                                          "hl": [[page, top, bottom], ...] } } }
page is 1-based; top/bottom are fractions of the page height from the top, as in papers/crops.json. "found" is the label whose
comment is shown: the part itself, or, when the report does not give the part a comment of its own, the enclosing part or
the whole question. Then "hl" (optional) marks the lines of that comment that talk about the part ("... in Part (b)(ii) ...").
Questions the report says nothing about are left out.

How the reports are read (CCEA's layout, 2017-2026): after the contents page, each unit starts with a heading line
"Assessment Unit AS 1 ..." / "Assessment Unit 4 ..."; its comments run to the next unit heading. Comments start at the left
margin with "Q3", "Q3 (a)", "Question 3"; later parts of the same question are indented "(b)", "(b) (i)", "(ii)" or "(c) & (d)"
lines. Labels are accepted only when they move forward (Q3 after Q2, (c) after (b) ...) and, for a bare "(b)", only when the
line before ends a sentence, so a wrapped "... in Part / (a)(i). While ..." is not taken as a label. Older reports write one
paragraph per question ("Q2 Most candidates ... Part (a) ... Parts (c)(i) and (ii) ..."): there the whole question's comment
is used and the lines from each mention of the part to the next mention of another part are highlighted.

Run by .github/workflows/slides-manifest.yml after papers_manifest.py, and by hand:  python3 tools/report_crops.py
(needs pdfplumber).  Options: --only BOOK|SERIES  print the labels found (debugging);  --stats  match rate per series.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
P = os.path.join(ROOT, "papers")
sys.path.insert(0, HERE)
import papers_crops as pc  # noqa: E402

FOLDERS = {"gcse": "papers/GCSE/Examiner reports", "gce": "papers/A level/Examiner reports"}
COURSE = {"U1": "gcse", "U4": "gcse", "AS1": "gce", "AS2": "gce", "A21": "gce"}
# series CCEA did not publish a report for (no summer exams in 2021; specimens; the 2022 A2 1 resit). An uploaded file wins.
NO_REPORT = {"gcse": ["2021", "Specimen"], "gce": ["Summer 2021", "Summer 2022 Resit", "Specimen"]}
UNIT_RE = re.compile(r"^assessment\s+unit\s*(as\s*[12]|a2\s*[12]|[1-5])(?![0-9])", re.I)
UNIT_ID = lambda s: re.sub(r"\s", "", s.upper()).replace("A2", "A2")   # "AS 1" -> "AS1", "A2 1" -> "A21", "4" -> "4"
BOOK_UNIT = {"U1": "1", "U4": "4", "AS1": "AS1", "AS2": "AS2", "A21": "A21"}
ROMAN, LETTERS, DASH = pc.ROMAN, pc.LETTERS, pc.DASH
SENT_END = re.compile(r"""[.!?:;)"”’']\s*$""")


def file_series(name, course):
    base = os.path.splitext(os.path.basename(name))[0]
    m = re.search(r"(summer|autumn|winter|january|june|may|november)\s*[-_ ]?\s*(20\d\d)", base, re.I)
    if m:
        y = m.group(2)
    else:
        ys = [mm.group(1) for mm in re.finditer(r"(?<![\d(])(20\d\d)(?![\d)])", base)]
        if not ys:
            return None
        y = ys[-1]
    if course == "gcse":
        return y
    return "Summer %s Resit" % y if re.search(r"resit|autumn", base, re.I) else "Summer %s" % y


def report_files(manifest):
    out = {}
    for course, folder in FOLDERS.items():
        for f in (manifest.get(folder) or {}).get("reports") or []:
            s = file_series(f, course)
            if s and os.path.exists(os.path.join(ROOT, f)):
                out.setdefault("%s|%s" % (course, s), f)
    return out


# ---------------------------------------------------------------- reading a report
HEADER_RE = re.compile(r"^CCEA\s+(GCSE|GCE)\s+Digital\s+Technology\s*\(", re.I)


def load(path):
    """pc.Doc without the reports' running page header, so it is neither a label's previous line nor part of a crop."""
    d = pc.Doc(path)
    for pg in d.pages:
        pg["body"] = [l for l in pg["body"] if not HEADER_RE.match(l["text"].strip())]
        if pg["body"]:
            pg["c_top"] = min(l["top"] for l in pg["body"])
            pg["c_bot"] = max(l["bottom"] for l in pg["body"])
        else:
            pg["blank"] = True
    return d


def all_lines(doc):
    for i, pg in enumerate(doc.pages):
        for l in pg["body"]:
            yield i, l


def sections(doc):
    """unit id -> (start, end) of its comments. The contents page lists the units too; the run with labels wins."""
    hs = []
    for i, l in all_lines(doc):
        m = UNIT_RE.match(l["text"].strip())
        if m:
            hs.append(((i, l["top"]), UNIT_ID(m.group(1))))
    end = doc_end(doc)
    out = {}
    for idx, (pos, u) in enumerate(hs):
        stop = (hs[idx + 1][0][0], hs[idx + 1][0][1] - 3) if idx + 1 < len(hs) else end
        n = len(labels(doc, pos, stop))
        if n and (u not in out or n > out[u][2]):
            out[u] = (pos, stop, n)
    return {u: (a, b) for u, (a, b, n) in out.items()}


def doc_end(doc):
    for i in range(len(doc.pages) - 1, -1, -1):
        if not doc.pages[i]["blank"]:
            return (i, doc.pages[i]["c_bot"] + 4)
    return (0, 0)


LABEL_RE = re.compile(r"^(?:(?:(?:in\s+)?q(?:uestion)?\s*\.?\s*)(\d{1,2})|(\d{1,2})(?=\s*\())?\s*((?:\(\s*[a-z]{1,4}\s*\)\s*)*)(.*)$", re.I)
MORE_RE = re.compile(r"^(?:&|and|,)\s*((?:\(\s*[a-z]{1,4}\s*\)\s*)+)(.*)$", re.I)


def parts_of(s):
    return [re.sub(r"\s", "", x).lower() for x in re.findall(r"\(([^)]*)\)", s)]


def step(ps, nl, nr):
    """Apply parenthesised tokens to the (letter, roman) state; None if they do not fit."""
    for v in ps:
        nxt_roman = (nr is None and v == "i") or (nr in ROMAN and v in ROMAN and ROMAN.index(v) > ROMAN.index(nr))
        letter_ok = len(v) == 1 and v in LETTERS and (nl is None or v > nl)
        if nl is not None and nxt_roman and not (letter_ok and v == chr(ord(nl) + 1) and v != "i"):
            nr = v
        elif letter_ok:
            nl, nr = v, None
        elif nl is None and nxt_roman:
            nr = v
        else:
            return None
    return nl, nr


def labels(doc, start, end):
    """Question labels between two positions, in order: (pos, (q, letter, roman), [extra paths sharing the comment])."""
    q, let, rom = 0, None, None
    out, prev = [], None
    for i, l in all_lines(doc):
        pos = (i, l["top"])
        if pos < start or pos >= end:
            continue
        t = l["text"].strip()
        p_line, prev = prev, (t, bool(out) and out[-1][0] == pos)
        m = LABEL_RE.match(t)
        if not m:
            continue
        qp, qb, parts, rest = m.group(1), m.group(2), m.group(3) or "", m.group(4) or ""
        ps = parts_of(parts)
        if not (qp or qb or ps):
            continue
        W = doc.pages[i]["W"]
        nq, nl, nr = q, let, rom
        if qp or qb:
            n = int(qp or qb)
            if l["x0"] > 0.3 * W or not (q < n <= q + 6 or (n == q and ps)):
                continue
            if n != q:
                nl, nr = None, None
            nq = n
        else:
            # a bare "(b)": inside a question, indented a little, and the line before ended a sentence (or was a label)
            if not q or l["x0"] > 0.45 * W or not p_line or re.search(r"\b(parts?|and|in|to|of|or)\s*$", p_line[0], re.I) or not (
                    SENT_END.search(p_line[0]) or (p_line[1] and len(p_line[0]) < 45)):
                continue
        r = step(ps, nl, nr)
        if r is None:
            continue
        nl, nr = r
        if (nq, nl, nr) == (q, let, rom):
            continue
        extra = []
        mm = MORE_RE.match(rest.strip())
        if mm and nl:
            r2 = step(parts_of(mm.group(1)), nl, nr)
            if r2:
                extra.append((nq, r2[0], r2[1]))
                nl, nr = r2   # "(c) & (d)": the sequence carries on from (d)
        q, let, rom = nq, nl, nr
        first = (nq, r[0], r[1])
        out.append((pos, first, extra))
        prev = (t, True)
    return out


def node_paths(lab):
    q, l, r = lab
    ps = [(q,)]
    if l:
        ps.append((q, l))
    if r:
        ps.append((q, l, r) if l else (q, None, r))
    return ps


def inside(p, anc):
    return len(p) >= len(anc) and p[:len(anc)] == anc


def build_nodes(lab, end):
    """path -> [start, end]: a comment runs to the next label that is not inside it."""
    nodes = {}
    for idx, (pos, path, extra) in enumerate(lab):
        for p in node_paths(path) + [node_paths(x)[-1] for x in extra]:
            if p in nodes:
                continue
            stop = end
            for pos2, path2, extra2 in lab[idx + 1:]:
                if not inside(node_paths(path2)[-1], p if p in node_paths(path) else node_paths(path)[-1]):
                    stop = (pos2[0], pos2[1] - 3)
                    break
            nodes[p] = [pos, stop]
    return nodes


# ---------------------------------------------------------------- "Part (b)(ii)" mentions in prose comments
MENTION_RE = re.compile(r"\bParts?\s+(\(\s*[a-z]{1,4}\s*\)(?:\s*\(\s*[a-z]{1,4}\s*\))*"
                        r"(?:\s*(?:,|&|and|to|or|–|-)\s*(?:Parts?\s+)?\(\s*[a-z]{1,4}\s*\)(?:\s*\(\s*[a-z]{1,4}\s*\))*)*)", re.I)


def mentions(doc, q, start, end, ctx0=None):
    """[(line index, [paths])] for each 'Part(s) (x)...' in the comment, plus the comment's lines [(page, top, bottom)]."""
    ls = [(i, l) for i, l in all_lines(doc) if start <= (i, l["top"]) < end]
    text, where = "", []
    for k, (i, l) in enumerate(ls):
        where.append(len(text))
        text += l["text"].strip() + " "
    out, ctx = [], ctx0
    for m in MENTION_RE.finditer(text):
        li = max(k for k, o in enumerate(where) if o <= m.start())
        paths = []
        groups = re.split(r"\s*(,|&|and|or|to|–|-)\s*(?:Parts?\s+)?", m.group(1))
        prev_letter, rng = None, False
        for g in groups:
            if g in (",", "&", "and", "or"):
                continue
            if g in ("to", "–", "-"):
                rng = True
                continue
            toks = parts_of(g)
            if not toks:
                continue
            v = toks[0]
            if ctx and v in ROMAN and not (len(v) == 1 and v == chr(ord(ctx) + 1) and v != "i"):
                paths.append((q, ctx, v))
                continue
            if len(v) == 1 and v in LETTERS:
                if rng and prev_letter and v > prev_letter:
                    paths += [(q, chr(c)) for c in range(ord(prev_letter) + 1, ord(v))]
                ctx = prev_letter = v
                paths.append((q, v) + tuple(toks[1:2]))
            rng = False
        if paths:
            out.append((li, paths))
    return out, [(i, l["top"], l["bottom"]) for i, l in ls]


def highlight(doc, q, start, end, targets, ctx0=None):
    ms, lines = mentions(doc, q, start, end, ctx0)
    hit = lambda ps: any(inside(t, p) or inside(p, t) for p in ps for t in targets)
    sel = set()
    for k, (li, ps) in enumerate(ms):
        if not hit(ps):
            continue
        stop = len(lines) - 1
        for li2, ps2 in ms[k + 1:]:
            if not hit(ps2):
                stop = max(li, li2 - 1) if li2 > li else li
                break
        sel.update(range(li, stop + 1))
    if not sel:
        return None
    bands = []
    for k in sorted(sel):
        p, top, bot = lines[k]
        pg = doc.pages[p]
        fr = lambda y: round(min(1.0, max(0.0, (y - pg["off"]) / pg["vh"])), 4)
        if bands and bands[-1][0] == p + 1 and fr(top - 2) - bands[-1][2] < 0.012:
            bands[-1][2] = fr(bot + 2)
        else:
            bands.append([p + 1, fr(top - 2), fr(bot + 2)])
    return bands


def targets_of(qs):
    pq = pc.parse_q(qs)
    if not pq:
        return []
    a, b = pq
    if a == b:
        return [a]
    out = [a, b]
    if len(a) == len(b) and a[:-1] == b[:-1] and len(a[-1]) == 1 and len(b[-1]) == 1:
        out += [a[:-1] + (chr(c),) for c in range(ord(a[-1]) + 1, ord(b[-1]))]
    return out


def lookup(nodes, pth):
    if pth in nodes:
        return pth
    if len(pth) == 2 and pth[1] in ROMAN and (pth[0], None, pth[1]) in nodes:
        return (pth[0], None, pth[1])
    return None


def locate(doc, nodes, qs):
    """(start, end, found label, highlight bands) for question qs; falls back to the enclosing part, then the question."""
    pq = pc.parse_q(qs)
    if not pq:
        return None
    a, b = lookup(nodes, pq[0]), lookup(nodes, pq[1])
    if a and b and nodes[b][1] >= nodes[a][0]:
        return nodes[a][0], nodes[b][1], qs.replace("-", DASH), None
    sp, ep = pq
    for k in range(len(sp) - 1, 0, -1):
        anc = sp[:k]
        if ep[:k] == anc and anc in nodes:
            s, e = nodes[anc]
            kids = [nodes[p][0] for p in nodes if len(p) > len(anc) and p[:len(anc)] == anc]
            if kids and any(x != s for x in kids):   # (a "Q4 (a) ..." paragraph with no further labels is prose)
                # the report comments on other parts one by one but not on this one: only its lead-in to the question
                # applies ("Q4 This question was based on spreadsheets ..."), if it has one
                e = (min(kids)[0], min(kids)[1] - 3)
                if e <= (s[0], s[1] + 8):
                    return None
                return s, e, pc.label_key(anc), None
            return s, e, pc.label_key(anc), highlight(doc, sp[0], s, e, targets_of(qs), anc[1] if len(anc) > 1 else None)
    return None


def main(argv):
    only = argv[argv.index("--only") + 1] if "--only" in argv else None
    manifest = json.load(open(os.path.join(P, "manifest.json"), encoding="utf-8"))
    files = report_files(manifest)
    tp = os.path.join(P, "topics.json")
    want = {}
    if os.path.exists(tp):
        for bk in json.load(open(tp, encoding="utf-8"))["books"]:
            for t in bk["topics"]:
                for it in t["items"]:
                    want.setdefault((bk["id"], it["s"]), set()).add(it["q"])
    else:   # no topics.json yet: the keys papers_crops.py looks for
        for k in pc.wanted_keys(None):
            b, s, q = k.split("|", 2)
            want.setdefault((b, s), set()).add(q)
    crops, docs, stats = {}, {}, {}
    for (b, s), qs in sorted(want.items()):
        course = COURSE.get(b)
        f = files.get("%s|%s" % (course, s))
        if not f:
            continue
        if f not in docs:
            try:
                d = load(os.path.join(ROOT, f))
                docs[f] = (d, sections(d))
            except Exception as ex:
                print("skip %s: %s" % (f, ex), file=sys.stderr)
                docs[f] = None
        if not docs[f]:
            continue
        d, secs = docs[f]
        st = stats.setdefault((b, s), {"keys": len(qs), "part": 0, "hl": 0, "whole": 0})
        u = BOOK_UNIT[b]
        if u not in secs:
            print("%s %s: the report has no question-by-question comments for this unit (%s)" % (b, s, f), file=sys.stderr)
            continue
        s0, s1 = secs[u]
        lab = labels(d, s0, s1)
        nodes = build_nodes(lab, s1)
        if only and only in ("%s|%s" % (b, s), b):
            print("%s %s  section p%d-%d" % (b, s, s0[0] + 1, s1[0] + 1))
            print("   " + " ".join(pc.label_key(p) + ("+" + "+".join(pc.label_key(x) for x in ex) if ex else "") for _, p, ex in lab))
        for q in sorted(qs):
            r = locate(d, nodes, q)
            if not r:
                continue
            seg = pc.segments(d, r[0], r[1], margin=4.0)
            if not seg:
                continue
            v = {"report": seg, "report_file": f, "found": r[2]}
            if r[3]:
                v["hl"] = r[3]
            crops["%s|%s|%s" % (b, s, q)] = v
            st["part" if r[2] == q.replace("-", DASH) else ("hl" if r[3] else "whole")] += 1
    out = {"_about": "Built by tools/report_crops.py from the CCEA examiner reports in " + " and ".join(FOLDERS.values()) +
                     ". files: series -> report PDF; none: series with no report; crops: <book>|<series>|<question> -> the comment's"
                     " [page, top, bottom] bands (hl: the lines about the part when the comment covers the whole question).",
           "files": dict(sorted(files.items())),
           "none": {c: [s for s in v if "%s|%s" % (c, s) not in files] for c, v in NO_REPORT.items()},
           "crops": dict(sorted(crops.items()))}
    with open(os.path.join(P, "reports.json"), "w", encoding="utf-8") as fh:
        fh.write(json.dumps(out, ensure_ascii=False, separators=(",", ":")).replace(',"', ',\n"') + "\n")
    if "--stats" in argv:
        print("book series              questions  own comment  part highlighted  whole question  none")
        for (b, s), st in sorted(stats.items()):
            n = st["part"] + st["hl"] + st["whole"]
            print("%-4s %-20s %5d %10d %12d %16d %8d   (%d%%)" % (b, s, st["keys"], st["part"], st["hl"], st["whole"], st["keys"] - n,
                                                             round(100 * n / max(1, st["keys"]))))
    print("papers/reports.json: %d report file(s), %d question(s) with a comment" % (len(files), len(crops)))


if __name__ == "__main__":
    main(sys.argv[1:])
