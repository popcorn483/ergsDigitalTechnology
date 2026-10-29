# Digital Technology Revision Hub: CCEA Digital Technology

A free, open revision site for **CCEA Digital Technology**. There are no passwords and every answer and mark scheme is visible.

## Start here: `index.html`

The front door lists every unit for **GCSE** and **A level (GCE)**. Each topic has two buttons:

- **Revision workbook** opens the notebook (`notes/`) at that topic. Everything else is built into the workbook. Each page has a *Learn and practise* strip: video, podcast, slides, fact file, quiz, worksheet with mark schemes, and activities. They open inside the page. The first page of each topic has the topic test, the practice paper and the topic PowerPoint.
- **PowerPoint** shows View and Download for the file you uploaded (see below). If there is no file yet, Download builds the hub's own whole-topic PowerPoint on the pupil's device.

The full lesson hubs are still there for teachers: `hub.html` (GCSE) and `gce/hub.html` (GCE). `gce/index.html` redirects to the GCE section of the front door. The workbooks show hub pages through `hub.html?embed=1#<route>`, which hides the hub's header and menus.

## Topic PowerPoints

Put one PowerPoint per topic in `notes/slides/`, named by topic id, for example `notes/slides/T1.pptx` or `notes/slides/G18.pptx` (a `.pdf` also works). The full list is in `notes/slides/README.md`. The front door and the topic's first workbook page then show View and Download for it.

## Folders

| Folder | Contents |
| --- | --- |
| `audio/` | Recorded narration for lesson videos and podcasts. Lessons without a recording use the device voice. |
| `diagrams/`, `icons/` | Lesson diagrams and topic icons |
| `factfiles/` | One-page fact files per lesson and a combined file per unit |
| `pdf/` | Workbooks, answer workbooks and flashcards |
| `notes/` | Revision notebooks and `slides/` for topic PowerPoints |

The GCE site in `gce/` has the same folders.

## Hosting

Go to Settings → Pages, choose *Deploy from a branch*, then `main` and `/ (root)`.

## Running locally

Run a web server in this folder, for example `python3 -m http.server`, then open http://localhost:8000. Opening the file by double-clicking won't work.
