"""List the KS3 resources uploaded under ks3/ into ks3/manifest.json (read by ks3.html).

Folders: ks3/Year 8/01 Topic name/ (one folder per topic; the number sets the order).
Files in a topic folder are listed whatever they are called. Name them like
'1 - LESSON - Under the Hood.pptx' or '3 - WORKSHEET - Binary.docx': the leading number sets the order,
and the word (LESSON, NOTES, WORKSHEET, HOMEWORK, ACTIVITY, PRACTICAL, ASSIGNMENT, HELPSHEET) sets the type.
A .txt or .url file holding a OneDrive / SharePoint / Google Drive link is listed as a link (for files too big for GitHub).
A PDF copy of an Office file in the folder's _view/ subfolder (same name, .pdf) is used to view it in the browser;
tools/ks3_views.sh makes these (the GitHub Action runs it).
Titles, summaries, "what you'll learn" and "temporary" come from ks3/topics.json.
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


meta = {}
try:
    meta = json.load(open(os.path.join(ROOT, "topics.json"), encoding="utf-8")).get("years", {})
except (OSError, ValueError):
    pass

years = []
for y in sorted((d for d in os.listdir(ROOT) if os.path.isdir(os.path.join(ROOT, d)) and d.lower().startswith("year")), key=year_key):
    ydir = os.path.join(ROOT, y)
    topics = []
    for t in sorted(d for d in os.listdir(ydir) if os.path.isdir(os.path.join(ydir, d)) and not d.startswith((".", "_"))):
        tdir = os.path.join(ydir, t)
        m = re.match(r"^(\d+)\s*[.\-–_ ]*\s*(.*)$", t)
        num = int(m.group(1)) if m else len(topics) + 1
        info = (meta.get(y) or {}).get(t) or {}
        views = set(os.listdir(os.path.join(tdir, "_view"))) if os.path.isdir(os.path.join(tdir, "_view")) else set()
        files = []
        for f in sorted(os.listdir(tdir)):
            p = os.path.join(tdir, f)
            if f.startswith(".") or not os.path.isfile(p) or f.lower() == "readme.md" or not f.lower().endswith(EXT):
                continue
            n, kind, title = nice(f)
            rel = f"{y}/{t}/{f}"
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
                    e["view"] = f"{y}/{t}/_view/{v}"
            files.append(e)
        files.sort(key=lambda e: (e["n"], e["name"].lower()))
        topics.append({
            "id": f"{year_key(y)}-{num:02d}",   # the tracking topic id, e.g. 8-01
            "folder": t,
            "title": info.get("title") or (m.group(2) if m and m.group(2) else t),
            "summary": info.get("summary", ""),
            "learn": info.get("learn", []),
            "temporary": bool(info.get("temporary")),
            "files": files,
        })
    years.append({"year": y, "n": year_key(y), "topics": topics})

path = os.path.join(ROOT, "manifest.json")
new = json.dumps({"years": years}, indent=1, ensure_ascii=False) + "\n"
old = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
if new != old:
    open(path, "w", encoding="utf-8").write(new)
    print("ks3 manifest updated:", sum(len(y["topics"]) for y in years), "topics")
else:
    print("ks3 manifest unchanged")
