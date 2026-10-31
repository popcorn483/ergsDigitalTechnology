"""Topic list for the Teacher area's topic packs: every CCEA past-paper question the workbooks place in each chapter (topic),
deduplicated, newest series first. Writes papers/topics.json:

  { "books": [ { "id": "AS2", "short": "AS 2", "title": "Fundamentals of Digital Technology", "course": "gce",
                 "topics": [ { "n": 1, "title": "Data representation",
                               "items": [ { "k": "AS2|Summer 2025|1(c)", "s": "Summer 2025", "q": "1(c)", "m": 2, "t": "summary" } ] } ] } ],
    "ccea_reports": { "gce": { "Summer 2025": "<CCEA examiner report URL>" }, "gcse": {} } }

k is the key used by papers/crops.json and papers/pages.json (<book>|<series>|<question>), s the series (folders.json
spelling), q the question as printed, m the marks the workbook gives (null when it does not; the page then uses the
"marks" papers/crops.json reads off the paper), t the workbook's one-line summary. ccea_reports lists the CCEA examiner
report links the workbooks cite, so the Teacher area can say where to download each one.

Run by notes buildall.sh after the workbooks are copied, and by .github/workflows/slides-manifest.yml:
  python3 tools/papers_topics.py
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from papers_crops import BOOKS  # noqa: E402

SHORT = {"U1": "Unit 1", "U4": "Unit 4", "AS1": "AS 1", "AS2": "AS 2", "A21": "A2 1"}


def load_book(book):
    f = os.path.join(ROOT, "notes", book + ".html")
    if not os.path.exists(f):
        return None
    src = open(f, encoding="utf-8").read()
    m = re.search(r"^const BOOK = (\{.*\});\s*$", src, re.M)
    if not m:
        return None
    js = re.sub(r"\\(.)", lambda m: m.group(0) if m.group(1) in '"\\/bfnrtu' else m.group(1), m.group(1), flags=re.S)
    try:
        return json.JSONDecoder(strict=False).raw_decode(js)[0]
    except ValueError:
        return None


def series(book, e):
    """Same rule as the workbooks' PP_SERIES (notes/app/chquiz.js)."""
    if re.search(r"specimen", str(e.get("series") or ""), re.I):
        return "Specimen"
    if book.startswith(("AS", "A2")):
        return str(e.get("series") or ("Summer %s" % e["year"] if e.get("year") else ""))
    return str(e.get("year") or e.get("series") or "")


def ser_rank(s):
    """Newest first; a resit straight after its summer; specimens last."""
    y = re.search(r"(20\d\d)", s)
    return (0 if y else 1, -int(y.group(1)) if y else 0, 1 if re.search(r"resit", s, re.I) else 0, s)


def q_rank(q):
    out = []
    for n, p in re.findall(r"(\d+)|\(([a-z]+)\)", q):
        out.append((0, int(n), "") if n else (1, 0, p))
    return out


def main():
    books, reports = [], {"gcse": {}, "gce": {}}
    for b in BOOKS:
        d = load_book(b)
        if not d:
            continue
        bk = d.get("book") or {}
        gce = "GCE" in (bk.get("qual") or "")
        topics = []
        for ch in d.get("chapters", []):
            seen, items = set(), []
            for pg in ch.get("pages", []):
                for e in pg.get("exam") or []:
                    if not e.get("q"):
                        continue
                    s = series(b, e)
                    q = re.sub(r"^Q", "", str(e["q"]), flags=re.I).strip()
                    k = "%s|%s|%s" % (b, s, q)
                    if e.get("report") and s not in reports["gce" if gce else "gcse"]:
                        reports["gce" if gce else "gcse"][s] = e["report"]
                    if k in seen:
                        continue
                    seen.add(k)
                    items.append({"k": k, "s": s, "q": q, "m": e.get("marks") if isinstance(e.get("marks"), int) else None,
                                  "t": (e.get("summary") or "").strip()})
            if not items:
                continue
            items.sort(key=lambda x: (ser_rank(x["s"]), q_rank(x["q"])))
            topics.append({"n": ch.get("n"), "title": ch.get("title", ""), "items": items})
        if topics:
            books.append({"id": b, "short": SHORT.get(b, b), "title": (bk.get("title") or "").split(": ", 1)[-1],
                          "course": "gce" if gce else "gcse", "topics": topics})
    out = {"books": books, "ccea_reports": {k: dict(sorted(v.items(), key=lambda kv: ser_rank(kv[0]))) for k, v in reports.items()}}
    p = os.path.join(ROOT, "papers", "topics.json")
    with open(p, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
        fh.write("\n")
    n = sum(len(t["items"]) for bk in books for t in bk["topics"])
    print("papers/topics.json: %d book(s), %d topic(s), %d question(s), %.0f KB" % (
        len(books), sum(len(bk["topics"]) for bk in books), n, os.path.getsize(p) / 1024))


if __name__ == "__main__":
    main()
