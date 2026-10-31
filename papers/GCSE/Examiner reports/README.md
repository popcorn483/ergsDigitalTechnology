# CCEA examiner reports: GCSE

One PDF per exam series: CCEA's **Chief Examiner's report** for GCSE Digital Technology (2017 specification), which covers Unit 1 to Unit 5 in one booklet.
They are CCEA material, used with permission, and shown unchanged.

## Upload

- Put the PDF straight in this folder. Name it after the series, e.g. `Summer 2024.pdf`.
- Any name containing the year also works, including CCEA's own download name. A year in brackets, like "(2016)", is the specification year and is ignored.

- Don't put more than one report for the same year in this folder.

A GitHub Action then runs `tools/papers_manifest.py` and `tools/report_crops.py`. These find each question's comment, in the unit's section and then by its label ("Q3", "(b)", "(ii)"), and write `papers/reports.json`. The Teacher area's topic packs then show each question's comment under its mark scheme. The count in the Teacher area updates a minute or two after an upload.

CCEA publishes no report for 2021 (no summer exams) and the specimen papers, so the packs have no report section for those questions.
