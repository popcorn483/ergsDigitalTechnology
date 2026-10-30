# CCEA past papers (uploaded by the teacher, used with permission)

The workbooks' **chapter quizzes** and **past-paper cards** show CCEA's exact questions and mark schemes from the PDFs uploaded here.
Nothing from these papers is retyped on the site: the PDFs are displayed as they are. Where a folder is still empty, pupils get
links to the papers on the CCEA website instead.

## What to upload

In each folder put **two PDFs**: the question paper and its mark scheme. Any file names work; the mark scheme's name must contain
**MS**, **mark scheme** or **markscheme** (any capitals), for example `2024 Unit 1 MS.pdf`. The other PDF is taken as the question paper.

After an upload, a GitHub Action rebuilds `papers/manifest.json` (the list the site reads) within a minute or two.

## Optional: which page each question is on

`papers/pages.json` can say which page of each PDF a question starts on, so the viewer opens at the right page:

```json
{ "U1|2024|2(a)": { "paper": 5, "ms": 7 }, "AS1|Summer 2023|4": { "paper": 9, "ms": 12 } }
```

The key is `<book>|<series>|<question>` (book: U1, U4, AS1, AS2; series exactly as the folder name; question as in the workbook, without the Q).
Without an entry the viewer opens at page 1.

## Folders

| Folder | Paper | Series |
|---|---|---|
| `papers/GCSE/Unit 1/2019/` | GCSE Digital Technology Unit 1 | 2019 |
| `papers/GCSE/Unit 1/2021/` | GCSE Digital Technology Unit 1 | 2021 |
| `papers/GCSE/Unit 1/2022/` | GCSE Digital Technology Unit 1 | 2022 |
| `papers/GCSE/Unit 1/2023/` | GCSE Digital Technology Unit 1 | 2023 |
| `papers/GCSE/Unit 1/2024/` | GCSE Digital Technology Unit 1 | 2024 |
| `papers/GCSE/Unit 1/2025/` | GCSE Digital Technology Unit 1 | 2025 |
| `papers/GCSE/Unit 4/2019/` | GCSE Digital Technology Unit 4 | 2019 |
| `papers/GCSE/Unit 4/2022/` | GCSE Digital Technology Unit 4 | 2022 |
| `papers/GCSE/Unit 4/2023/` | GCSE Digital Technology Unit 4 | 2023 |
| `papers/GCSE/Unit 4/2024/` | GCSE Digital Technology Unit 4 | 2024 |
| `papers/GCSE/Unit 4/2025/` | GCSE Digital Technology Unit 4 | 2025 |
| `papers/A level/AS 1/Specimen/` | GCE Digital Technology AS 1 | Specimen |
| `papers/A level/AS 1/Summer 2017/` | GCE Digital Technology AS 1 | Summer 2017 |
| `papers/A level/AS 1/Summer 2018/` | GCE Digital Technology AS 1 | Summer 2018 |
| `papers/A level/AS 1/Summer 2019/` | GCE Digital Technology AS 1 | Summer 2019 |
| `papers/A level/AS 1/Summer 2022/` | GCE Digital Technology AS 1 | Summer 2022 |
| `papers/A level/AS 1/Summer 2023/` | GCE Digital Technology AS 1 | Summer 2023 |
| `papers/A level/AS 1/Summer 2024/` | GCE Digital Technology AS 1 | Summer 2024 |
| `papers/A level/AS 1/Summer 2025/` | GCE Digital Technology AS 1 | Summer 2025 |
| `papers/A level/AS 2/Specimen/` | GCE Digital Technology AS 2 | Specimen |
| `papers/A level/AS 2/Summer 2017/` | GCE Digital Technology AS 2 | Summer 2017 |
| `papers/A level/AS 2/Summer 2018/` | GCE Digital Technology AS 2 | Summer 2018 |
| `papers/A level/AS 2/Summer 2019/` | GCE Digital Technology AS 2 | Summer 2019 |
| `papers/A level/AS 2/Summer 2022/` | GCE Digital Technology AS 2 | Summer 2022 |
| `papers/A level/AS 2/Summer 2023/` | GCE Digital Technology AS 2 | Summer 2023 |
| `papers/A level/AS 2/Summer 2024/` | GCE Digital Technology AS 2 | Summer 2024 |
| `papers/A level/AS 2/Summer 2025/` | GCE Digital Technology AS 2 | Summer 2025 |

`papers/folders.json` maps `<book>|<series>` to these folders; the site uses it to find the right PDFs.
