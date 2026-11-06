"""Build ks3.html from tools/ks3_page.src.html, copying in the pupil sign-in, tracking, zones and save-online code from
index.html (the block from "PUPIL ACTIVITY" to just before "PAGE BAR"), so the KS3 page signs in and tracks exactly like
the rest of the site. Run after changing either file: python3 tools/ks3_build.py"""
import os
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.join(here, "..")
idx = open(os.path.join(root, "index.html"), encoding="utf-8").read()
a = idx.index("/* ---------- PUPIL ACTIVITY")
b = idx.index("/* ---------- PAGE BAR", a)
code = idx[a:b].rstrip()
src = open(os.path.join(here, "ks3_page.src.html"), encoding="utf-8").read()
assert "/*PUPIL_CODE*/" in src
open(os.path.join(root, "ks3.html"), "w", encoding="utf-8").write(src.replace("/*PUPIL_CODE*/", code))
print("ks3.html built:", len(code), "characters of pupil code")
