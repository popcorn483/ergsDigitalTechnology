"""List the topic PowerPoints uploaded under notes/slides/ into notes/slides/manifest.json.

Each topic has its own folder (see notes/slides/folders.json). Any .pptx, .ppt or .pdf
file in that folder is listed, whatever it is called. Run by the GitHub Action on every
upload; can also be run by hand: python3 tools/slides_manifest.py
"""
import json, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "notes", "slides")
EXT = (".pptx", ".ppt", ".pdf")

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
        if files:
            out.setdefault(book, {})[chap] = [{"name": f, "path": rel + "/" + f} for f in files]

path = os.path.join(ROOT, "manifest.json")
new = json.dumps(out, indent=1, ensure_ascii=False, sort_keys=True) + "\n"
old = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
if new != old:
    open(path, "w", encoding="utf-8").write(new)
    print("manifest updated:", sum(len(c) for c in out.values()), "topics with slides")
else:
    print("manifest unchanged")
