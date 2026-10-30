# Digital Technology Revision Hub: CCEA Digital Technology

A free, open revision site for **CCEA Digital Technology**. There are no passwords and every answer and mark scheme is visible.

## Start here: `index.html`

The front door lists every unit for **GCSE** and **A level (GCE)**. Each topic has two buttons:

- **Revision workbook** opens the notebook (`notes/`) at that topic. Everything else is built into the workbook. Each page has a *Learn and practise* strip: video, podcast, slides, fact file, quiz, worksheet with mark schemes, and activities. They open inside the page. The first page of each topic has the topic test, the practice paper and, when you have uploaded one, the topic PowerPoint.
- **PowerPoint** shows View and Download, but only when you have uploaded a PowerPoint for that topic (see below). Topics without one show no PowerPoint button.

The full lesson hubs are still there for teachers: `hub.html` (GCSE) and `gce/hub.html` (GCE). `gce/index.html` redirects to the GCE section of the front door. The workbooks show hub pages through `hub.html?embed=1#<route>`, which hides the hub's header and menus.

## Topic PowerPoints

Each workbook chapter has its own folder under `notes/slides/`, for example `notes/slides/GCSE/Unit 1/01 Digital data/` or `notes/slides/A level/A2 2/07 VBA task tutorials/`. Upload a PowerPoint with **any file name** into the chapter's folder (a `.pdf` also works). A GitHub Action then lists it in `notes/slides/manifest.json`, and the front door and the topic's first workbook page show View and Download for it. Until the Action has run, the pages check that one folder through the GitHub API, so the file usually appears within a minute or two.

GitHub won't take files over 25 MB. For a big PowerPoint, keep it on OneDrive, SharePoint or Google Drive and put its share link in a `link.txt` file in the chapter's folder. The topic then shows an **Open PowerPoint** button. An uploaded file is used in preference to a link.

The list of folders is in `notes/slides/README.md` (and `folders.json`). Each workbook chapter card shows its folder in a small "Teacher: upload to …" line, and the front door lists every folder under *Where to upload topic PowerPoints* at the bottom. Don't rename the folders or edit `manifest.json` by hand.

## Folders

| Folder | Contents |
| --- | --- |
| `audio/` | Recorded narration for lesson videos and podcasts. Lessons without a recording use the device voice. |
| `diagrams/`, `icons/` | Lesson diagrams and topic icons |
| `factfiles/` | One-page fact files per lesson and a combined file per unit |
| `pdf/` | Workbooks, answer workbooks and flashcards |
| `notes/` | Revision notebooks and `slides/` for topic PowerPoints |
| `fonts/` | Lemon Milk by MARSNEV (marsnev.com), free for educational use, for headings and buttons to match the topic PowerPoints. Saira by Omnibus-Type, SIL Open Font License (a free stand-in for Designer), for the big hero titles |

The GCE site in `gce/` has the same folders.

## Hosting

Go to Settings → Pages, choose *Deploy from a branch*, then `main` and `/ (root)`.

## Running locally

Run a web server in this folder, for example `python3 -m http.server`, then open http://localhost:8000. Opening the file by double-clicking won't work.
