# Topic PowerPoints

Every workbook chapter has its own folder here. To add a topic PowerPoint, upload it to that chapter's folder
in the GitHub repo (Add file → Upload files). **Any file name works**, for example `Network technologies v3.pptx`.
A PDF also works. If a folder holds more than one file, the first PowerPoint (alphabetically) is used, then PDFs.

**PowerPoint too big for GitHub (over 25 MB)?** Keep it on OneDrive, SharePoint or Google Drive, make a share link
that anyone with the link can view, and save the link in a text file called `link.txt` in the chapter's folder
(a Windows `.url` shortcut also works). The topic then shows one **Open PowerPoint** button that opens the link.
If a folder has both an uploaded file and a link, the uploaded file is used.

What happens next:

1. A GitHub Action (`.github/workflows/slides-manifest.yml`) runs `tools/slides_manifest.py`, which lists every
   uploaded file in `notes/slides/manifest.json`. Don't edit that file by hand.
2. The front page topic row and the chapter card on the topic's first workbook page show **View** and **Download**.
   View opens a PowerPoint in the Office online viewer (a PDF opens directly); Download saves the file.
3. Until the Action has run, the pages ask the GitHub API about the chapter's folder directly, so a new file usually
   shows within a minute or two.

**Temporary PowerPoints.** Until you upload your own, most topics show a temporary PowerPoint made from the hub's
lesson slides (`_temporary/<topic>.pptx`, for example `_temporary/T6.pptx`). It carries an amber **Temporary** badge and
the line "Temporary PowerPoint made from the lesson slides – your teacher's own version will replace it". As soon as
you upload a file (or a link) to a chapter's folder, your file is shown instead and the badge goes. You don't need to
delete anything; the files in `_temporary/` are never treated as your uploads. A2 2 has no temporary PowerPoints.

Nothing else is shown for a topic with no file: no "coming soon". The folder names come from
`folders.json`; don't rename or move the folders. Each workbook chapter card also shows its folder in a small line
for teachers, and the front page lists every folder under "Where to upload topic PowerPoints" at the bottom.

The site must be public on GitHub Pages for the Office viewer to open a PowerPoint.

## A2 1: Information Systems (A21)

| Chapter | Upload folder |
|---|---|
| 1. Relational database design | `notes/slides/A level/A2 1/01 Relational database design/` |
| 2. SQL and database management | `notes/slides/A level/A2 1/02 SQL and database management/` |
| 3. Networks | `notes/slides/A level/A2 1/03 Networks/` |
| 4. Network security and cloud computing | `notes/slides/A level/A2 1/04 Network security and cloud computing/` |
| 5. Information systems in organisations | `notes/slides/A level/A2 1/05 Information systems in organisations/` |
| 6. Legal, ethical and social issues | `notes/slides/A level/A2 1/06 Legal, ethical and social issues/` |

## A2 2: Building in Access and VBA (tutorials) (A22)

| Chapter | Upload folder |
|---|---|
| 1. Choose your project | `notes/slides/A level/A2 2/01 Getting started with Access/` |
| 2. Design your database | `notes/slides/A level/A2 2/02 Tables and relationships/` |
| 3. Getting started with Access | `notes/slides/A level/A2 2/03 Queries/` |
| 4. Tables and relationships | `notes/slides/A level/A2 2/04 Forms/` |
| 5. Queries | `notes/slides/A level/A2 2/05 Reports/` |
| 6. Forms | `notes/slides/A level/A2 2/06 VBA basics/` |
| 7. Reports | `notes/slides/A level/A2 2/07 VBA task tutorials/` |

## AS 1: Approaches to Systems Development (AS1)

| Chapter | Upload folder |
|---|---|
| 1. Reasons for systems development | `notes/slides/A level/AS 1/01 Reasons for systems development/` |
| 2. Analysis | `notes/slides/A level/AS 1/02 Analysis/` |
| 3. System design, development and testing | `notes/slides/A level/AS 1/03 System design, development and testing/` |
| 4. System implementation | `notes/slides/A level/AS 1/04 System implementation/` |
| 5. Alternative development approaches | `notes/slides/A level/AS 1/05 Alternative development approaches/` |
| 6. Software projects | `notes/slides/A level/AS 1/06 Software projects/` |
| 7. Security issues | `notes/slides/A level/AS 1/07 Security issues/` |
| 8. Algorithms | `notes/slides/A level/AS 1/08 Algorithms/` |
| 9. Fundamentals of programming | `notes/slides/A level/AS 1/09 Fundamentals of programming/` |
| 10. Object-oriented programming | `notes/slides/A level/AS 1/10 Object-oriented programming/` |

## AS 2: Fundamentals of Digital Technology (AS2)

| Chapter | Upload folder |
|---|---|
| 1. Data representation | `notes/slides/A level/AS 2/01 Data representation/` |
| 2. Data and information | `notes/slides/A level/AS 2/02 Data and information/` |
| 3. Architecture | `notes/slides/A level/AS 2/03 Architecture/` |
| 4. User interface and data compression | `notes/slides/A level/AS 2/04 User interface and data compression/` |
| 5. Software | `notes/slides/A level/AS 2/05 Software/` |
| 6. Web applications | `notes/slides/A level/AS 2/06 Web applications/` |
| 7. Website development | `notes/slides/A level/AS 2/07 Website development/` |

## Unit 1: Digital Technology (U1)

| Chapter | Upload folder |
|---|---|
| 1. Digital data | `notes/slides/GCSE/Unit 1/01 Digital data/` |
| 2. Software | `notes/slides/GCSE/Unit 1/02 Software/` |
| 3. Database applications | `notes/slides/GCSE/Unit 1/03 Database applications/` |
| 4. Spreadsheet applications | `notes/slides/GCSE/Unit 1/04 Spreadsheet applications/` |
| 5. Computer hardware | `notes/slides/GCSE/Unit 1/05 Computer hardware/` |
| 6. Network technologies | `notes/slides/GCSE/Unit 1/06 Network technologies/` |
| 7. Cyberspace, network security and data transfer | `notes/slides/GCSE/Unit 1/07 Cyberspace, network security and data transfer/` |
| 8. Cloud technology | `notes/slides/GCSE/Unit 1/08 Cloud technology/` |
| 9. Ethical, legal and environmental impact | `notes/slides/GCSE/Unit 1/09 Ethical, legal and environmental impact/` |
| 10. Digital applications | `notes/slides/GCSE/Unit 1/10 Digital applications/` |

## Unit 4: Digital Development Concepts (Programming) (U4)

| Chapter | Upload folder |
|---|---|
| 1. Contemporary trends in software development | `notes/slides/GCSE/Unit 4/01 Contemporary trends in software development/` |
| 2. Digital data | `notes/slides/GCSE/Unit 4/02 Digital data/` |
| 3. Digital design principles | `notes/slides/GCSE/Unit 4/03 Digital design principles/` |
| 4. Programming constructs | `notes/slides/GCSE/Unit 4/04 Programming constructs/` |
| 5. Simple error handling techniques | `notes/slides/GCSE/Unit 4/05 Simple error handling techniques/` |
| 6. Developing test plans and testing a solution | `notes/slides/GCSE/Unit 4/06 Developing test plans and testing a solution/` |
| 7. Evaluation of digitally authored systems | `notes/slides/GCSE/Unit 4/07 Evaluation of digitally authored systems/` |
