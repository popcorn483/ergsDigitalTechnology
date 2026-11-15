"""Build papers/marking.json for the Teacher area's paper checker: for every past-paper question with crops (papers/crops.json),
the question's printed text (its question-paper crop), its mark-scheme text (its mark-scheme crop) and its marks:

  { "U1|2024|2(a)": { "m": 2, "q": "Describe two ...", "ms": "Any two from ... [1] ... [1]" }, ... }

The checker matches what the camera sees against "q" to find the question, then marks the pupil's answer against "ms".
Run after tools/papers_crops.py:  python3 tools/papers_marking.py   (needs pdfplumber)
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, "papers")
sys.path.insert(0, os.path.join(ROOT, "tools"))
from papers_msdefs import ms_text  # same crop-to-text reader


def tidy(t, n):
    t = re.sub(r"[ \t]+", " ", t or "")
    t = re.sub(r"\n\s*\n+", "\n", t).strip()
    t = re.sub(r"\(cid:\d+\)", "", t)
    return t[:n]


def main():
    import pdfplumber
    crops = json.load(open(os.path.join(P, "crops.json"), encoding="utf-8"))
    folders = json.load(open(os.path.join(P, "folders.json"), encoding="utf-8"))
    manifest = json.load(open(os.path.join(P, "manifest.json"), encoding="utf-8"))
    out, opened = {}, {}
    try:
        for k, v in sorted(crops.items()):
            if k.startswith("_") or not isinstance(v, dict):
                continue
            b, s, q = k.split("|", 2)
            files = manifest.get(folders.get(b + "|" + s, ""), {}) or {}
            def text(kind, n):
                fn = files.get(kind)
                if not fn or not os.path.exists(os.path.join(ROOT, fn)) or not v.get(kind):
                    return ""
                if fn not in opened:
                    try:
                        opened[fn] = (pdfplumber.open(os.path.join(ROOT, fn)), {})
                    except Exception:
                        opened[fn] = (None, {})
                pdf, cache = opened[fn]
                if pdf is None:
                    return ""
                return tidy("\n".join(ms_text(pdf, cache, seg) for seg in v[kind]), n)
            qt, ms = text("paper", 1500), text("ms", 3000)
            if not ms:
                continue
            out[k] = {"m": v.get("marks") or 0, "q": qt, "ms": ms}
    finally:
        for pdf, _ in opened.values():
            if pdf is not None:
                pdf.close()
    with open(os.path.join(P, "marking.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print("marking.json:", len(out), "questions,", sum(1 for x in out.values() if x["q"]), "with question text")


if __name__ == "__main__":
    main()
