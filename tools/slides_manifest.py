"""List the topic PowerPoints uploaded under notes/slides/ into notes/slides/manifest.json.

Each topic has its own folder (see notes/slides/folders.json). Any .pptx, .ppt or .pdf
file in that folder is listed, whatever it is called. For files too big for GitHub,
put a share link (OneDrive, SharePoint or Google Drive) in a .txt file in the folder instead. Run by the GitHub Action on every
upload; can also be run by hand: python3 tools/slides_manifest.py
"""
import json, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "notes", "slides")
EXT = (".pptx", ".ppt", ".pdf")
LINKS = (".txt", ".url")  # a file holding a share link (OneDrive, SharePoint, Google Drive) for big PowerPoints


def read_link(path):
    """Return the first https:// address in a link file (.txt, or a Windows .url shortcut)."""
    import re
    try:
        text = open(path, encoding="utf-8", errors="ignore").read()
    except OSError:
        return None
    m = re.search(r"https://[^\s\"'<>]+", text)
    return m.group(0) if m else None


folders = json.load(open(os.path.join(ROOT, "folders.json"), encoding="utf-8"))
out = {}
for book, chapters in folders.items():
    for chap, rel in chapters.items():
        d = os.path.join(ROOT, rel)
        if not os.path.isdir(d):
            continue
        files = sorted(f for f in os.listdir(d) if f.lower().endswith(EXT) and not f.startswith("."))
        # PowerPoint first, then PDF
        files.sort(key=lambda f: (not f.lower().endswith((".pptx", ".ppt")), f.lower()))
        entries = [{"name": f, "path": rel + "/" + f} for f in files]
        for f in sorted(os.listdir(d)):
            if f.lower().endswith(LINKS) and f.lower() != "readme.md":
                url = read_link(os.path.join(d, f))
                if url:
                    entries.append({"name": os.path.splitext(f)[0], "url": url})
        if entries:
            out.setdefault(book, {})[chap] = entries

path = os.path.join(ROOT, "manifest.json")
new = json.dumps(out, indent=1, ensure_ascii=False, sort_keys=True) + "\n"
old = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
if new != old:
    open(path, "w", encoding="utf-8").write(new)
    print("manifest updated:", sum(len(c) for c in out.values()), "topics with slides")
else:
    print("manifest unchanged")
