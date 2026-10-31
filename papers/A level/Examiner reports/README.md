# CCEA examiner reports: A level

One PDF per exam series: CCEA's **Chief Examiner's report** for GCE Digital Technology (2016 specification), which covers AS 1, AS 2, A2 1 and A2 2 in one booklet.
They are CCEA material, used with permission, and shown unchanged.

## Upload

- Put the PDF straight in this folder. Name it after the series, e.g. `Summer 2024.pdf`.
- Any name containing the year also works, including CCEA's own download name. A year in brackets, like "(2016)", is the specification year and is ignored.
- For a resit series, put "Resit" in the name, e.g. `Summer 2022 Resit.pdf`.
- Don't put more than one report for the same year in this folder.

A GitHub Action then runs `tools/papers_manifest.py` and `tools/report_crops.py`. These find each question's comment, in the unit's section and then by its label ("Q3", "(b)", "(ii)"), and write `papers/reports.json`. The Teacher area's topic packs then show each question's comment under its mark scheme. The count in the Teacher area updates a minute or two after an upload.

CCEA publishes no report for Summer 2021 (no summer exams), the 2022 A2 1 resit and the specimen papers, so the packs have no report section for those questions.
