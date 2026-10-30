"""List the CCEA past-paper PDFs the teacher has uploaded under papers/ (one folder per paper and series, see
papers/folders.json) into papers/manifest.json: { "<folder>": { "paper": "<folder>/<file>.pdf", "ms": "<folder>/<file>.pdf" } }.
The mark scheme is the PDF whose name contains "MS", "mark scheme" or "markscheme" (any case); the other PDF is the paper.
Run by .github/workflows/slides-manifest.yml on every push that touches papers/ (and by hand: python3 tools/papers_manifest.py)."""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, "papers")
is_ms = lambda n: bool(re.search(r"(^|[^a-z])ms([^a-z]|$)|mark[\s_-]*scheme|markscheme", n, re.I))
folders = json.load(open(os.path.join(P, "folders.json"), encoding="utf-8"))
out = {}
for key, folder in sorted(folders.items()):
    d = os.path.join(ROOT, folder)
    if not os.path.isdir(d):
        continue
    pdfs = sorted(f for f in os.listdir(d) if f.lower().endswith(".pdf") and os.path.isfile(os.path.join(d, f)))
    ms = next((f for f in pdfs if is_ms(f)), None)
    qp = next((f for f in pdfs if f != ms and not is_ms(f)), None)
    if ms or qp:
        out[folder] = {"paper": folder + "/" + qp if qp else None, "ms": folder + "/" + ms if ms else None}
with open(os.path.join(P, "manifest.json"), "w", encoding="utf-8") as fh:
    json.dump(out, fh, ensure_ascii=False, indent=1, sort_keys=True)
    fh.write("\n")
print(f"papers/manifest.json: {len(out)} folder(s) with PDFs")
