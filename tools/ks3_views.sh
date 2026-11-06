#!/usr/bin/env bash
# Make a PDF copy (in the topic's _view/ folder) of every PowerPoint, Word and Excel file under ks3/ that doesn't have one
# yet, so pupils can view it in the browser. Needs LibreOffice (the GitHub Action installs it). Run: bash tools/ks3_views.sh
cd "$(dirname "$0")/../ks3" || exit 0
find . -type f \( -iname "*.pptx" -o -iname "*.ppt" -o -iname "*.docx" -o -iname "*.doc" -o -iname "*.xlsx" -o -iname "*.xls" \) -not -path "*/_view/*" | while read -r f; do
  d="$(dirname "$f")/_view"; v="$d/$(basename "${f%.*}").pdf"
  if [ ! -f "$v" ] || [ "$f" -nt "$v" ]; then
    mkdir -p "$d"
    soffice --headless --convert-to pdf --outdir "$d" "$f" >/dev/null 2>&1 && echo "made $v" || echo "couldn't convert $f"
  fi
done
# a view whose original has gone
find . -path "*/_view/*.pdf" | while read -r v; do
  base="$(basename "${v%.pdf}")"; dir="$(dirname "$(dirname "$v")")"
  ls "$dir/$base".* >/dev/null 2>&1 || { rm -f "$v"; echo "removed $v"; }
done
