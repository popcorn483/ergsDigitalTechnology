"""List the KS3 topics and their files into ks3/manifest.json (read by the home page, the Year 8/9/10 books and the
Teacher area's KS3 topics tab).

Every topic is a folder in ks3/library/ (ks3/library/web-design/), whichever year teaches it; ks3/plan.json says which
topics each year teaches, in order (tools/ks3_plan.py). Files in a topic folder are listed whatever they are called. Name
them like '1 - LESSON - Under the Hood.pptx' or '3 - WORKSHEET - Binary.docx': the leading number sets the order,
and the word (LESSON, NOTES, WORKSHEET, HOMEWORK, ACTIVITY, PRACTICAL, ASSIGNMENT, HELPSHEET) sets the type.
A .txt or .url file holding a OneDrive / SharePoint / Google Drive link is listed as a link (for files too big for GitHub).
A PDF copy of an Office file in the folder's _view/ subfolder (same name, .pdf) is used to view it in the browser;
tools/ks3_views.sh makes these (the GitHub Action runs it).
Titles, summaries, "what you'll learn" and "temporary" come from each topic's topic.json.
"years" lists the planned topics (id = year-position, e.g. 9-02, used by pupil tracking); "library" lists every topic.
Run by the GitHub Action on every upload; can also be run by hand: python3 tools/ks3_manifest.py
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ks3")
EXT = (".pptx", ".ppt", ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".zip", ".png", ".jpg", ".jpeg", ".gif", ".mp4", ".html", ".txt", ".url")
KINDS = ["LESSON", "NOTES", "WORKSHEET", "HOMEWORK", "ACTIVITY", "PRACTICAL", "ASSIGNMENT", "HELPSHEET", "TASK", "QUIZ", "ANSWERS"]


def read_link(path):
    try:
        text = open(path, encoding="utf-8", errors="ignore").read()
    except OSError:
        return None
    m = re.search(r"https://[^\s\"'<>]+", text)
    return m.group(0) if m else None


def nice(fname):
    """'3 - WORKSHEET - Binary Conversion.pdf' -> (3, 'WORKSHEET', 'Binary Conversion')"""
    stem = os.path.splitext(fname)[0]
    m = re.match(r"^\s*(\d+)\s*[.\-–_ ]+\s*(.*)$", stem)
    n, rest = (int(m.group(1)), m.group(2)) if m else (999, stem)
    kind = ""
    for k in KINDS:
        mm = re.match(r"^" + k + r"\s*[\-–:_]+\s*(.*)$", rest, re.I)
        if mm:
            kind, rest = k, mm.group(1)
            break
    else:
        up = stem.upper()
        kind = next((k for k in KINDS if k in up), "")
    return n, kind, rest.strip() or stem


def year_key(name):
    m = re.search(r"(\d+)", name)
    return int(m.group(1)) if m else 99


YEARS = {'Y8': 'Year 8', 'Y9': 'Year 9', 'Y10': 'Year 10'}
LIB = os.path.join(ROOT, "library")


def load(p, d):
    try:
        return json.load(open(p, encoding="utf-8"))
    except (OSError, ValueError):
        return d


def topic_files(slug):
    tdir = os.path.join(LIB, slug)
    views = set(os.listdir(os.path.join(tdir, "_view"))) if os.path.isdir(os.path.join(tdir, "_view")) else set()
    files = []
    for f in sorted(os.listdir(tdir)):
        p = os.path.join(tdir, f)
        if f.startswith(".") or not os.path.isfile(p) or f.lower() in ("readme.md", "icon.png") or not f.lower().endswith(EXT):
            continue
        n, kind, title = nice(f)
        rel = f"library/{slug}/{f}"
        e = {"n": n, "kind": kind, "title": title, "name": f}
        if f.lower().endswith((".txt", ".url")):
            url = read_link(p)
            if not url:
                continue
            e["url"] = url
        else:
            e["path"] = rel
            e["size"] = os.path.getsize(p)
            v = os.path.splitext(f)[0] + ".pdf"
            if not f.lower().endswith(".pdf") and v in views:
                e["view"] = f"library/{slug}/_view/{v}"
        files.append(e)
    files.sort(key=lambda e: (e["n"], e["name"].lower()))
    return files


lib = {}
for slug in sorted(os.listdir(LIB)):
    if not re.match(r"^[a-z0-9][a-z0-9-]*$", slug) or not os.path.isdir(os.path.join(LIB, slug)):
        continue
    info = load(os.path.join(LIB, slug, "topic.json"), {}) or {}
    lib[slug] = {
        "slug": slug,
        "title": info.get("title") or slug.replace("-", " ").capitalize(),
        "summary": info.get("summary", ""),
        "learn": info.get("learn", []),
        "temporary": bool(info.get("temporary")),
        "pages": len(info.get("pages") or []),   # 0 = notes not written yet
        "files": topic_files(slug),
    }

plan = (load(os.path.join(ROOT, "plan.json"), {}) or {}).get("years", {})
years, used = [], {}
for yid, y in YEARS.items():
    topics = []
    for slug in plan.get(yid, []) or []:
        if slug not in lib or slug in used:
            continue
        used[slug] = y
        t = lib[slug]
        topics.append({
            "id": f"{yid[1:]}-{len(topics) + 1:02d}",   # the tracking topic id, e.g. 8-01
            "slug": slug,
            "folder": f"library/{slug}",
            "title": t["title"], "summary": t["summary"], "learn": t["learn"], "temporary": t["temporary"],
            "files": t["files"],
        })
    years.append({"year": y, "n": int(yid[1:]), "topics": topics})

library = [t | {"year": used.get(s, "")} for s, t in lib.items()]

path = os.path.join(ROOT, "manifest.json")
new = json.dumps({"years": years, "library": library}, indent=1, ensure_ascii=False) + "\n"
old = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
if new != old:
    open(path, "w", encoding="utf-8").write(new)
    print("ks3 manifest updated:", sum(len(y["topics"]) for y in years), "topics in use,", len(library), "in the library")
else:
    print("ks3 manifest unchanged")
