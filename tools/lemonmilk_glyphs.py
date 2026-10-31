"""Lemon Milk Bold glyph outlines as SVG paths (fonts/lemonmilk-bold-glyphs.json), so the Teacher area's PDF tests can
draw their heading in Lemon Milk with pdf-lib's drawSvgPath (no font embedding library needed).
Run: python3 tools/lemonmilk_glyphs.py"""
import json, os, string
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
f = TTFont(os.path.join(ROOT, "fonts", "lemonmilk-bold.woff"))
gs, cmap = f.getGlyphSet(), f.getBestCmap()
out = {"upm": f["head"].unitsPerEm, "g": {}}
for ch in string.ascii_uppercase + string.ascii_lowercase + string.digits + " .,:;-–—'’\"“”()&/+?!%£#[]":
    gn = cmap.get(ord(ch))
    if not gn:
        continue
    pen = SVGPathPen(gs, lambda v: "%.0f" % v)
    gs[gn].draw(TransformPen(pen, (1, 0, 0, -1, 0, 0)))   # SVG y runs down
    out["g"][ch] = [gs[gn].width, pen.getCommands()]
json.dump(out, open(os.path.join(ROOT, "fonts", "lemonmilk-bold-glyphs.json"), "w"), separators=(",", ":"))
print("fonts/lemonmilk-bold-glyphs.json:", len(out["g"]), "glyphs")
