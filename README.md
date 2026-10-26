# Digital Technology Hub: CCEA GCSE Digital Technology

A complete teaching and revision hub for **CCEA GCSE Digital Technology, Route B: Programming**. It covers Unit 1 (Digital Technology) and Unit 4 (Digital Development Concepts), with C# for programming.

## Opening the hub

- **Pupils:** open the site and enter the pupil passcode from your teacher.
- **Teachers:** after entering the pupil passcode, use **Teacher login** with the teacher code. This unlocks lesson plans, slide notes, mark schemes, answer workbooks, PowerPoint downloads and the Forms export.

## How the content is protected

| Folder | Contents | Protected by |
| --- | --- | --- |
| `enc/` | Lessons, activities, videos and podcasts (audio), fact files, diagrams, workbooks | Pupil passcode (AES-256-GCM, PBKDF2-SHA-256 with 600,000 iterations) |
| `teacher/` | Plans, slide notes, mark schemes, answer workbooks | Teacher code (same method, separate key) |

Neither code is stored in this repository. A short code can be guessed by someone with the files and time, so treat this as keeping pupils and casual visitors out, not as high security.

## Hosting

Go to Settings → Pages, choose *Deploy from a branch*, then `main` and `/ (root)`.

## Running locally

Run a web server in this folder, for example `python3 -m http.server`. Opening the file by double-clicking won't work.
