# Pupil data in Firebase (free Spark plan)

Pupil sign-ins, progress, revision time, classes and zones, set work, messages, topic tests and competitions live in the Firebase project **ergs-revision** (Cloud Firestore, London `europe-west2`). They replace the Google Sheet and Apps Script (`tools/pupil-activity.gs`), and they're faster.

## How it fits together
- `fbconfig.js` holds the Firebase settings and the switch `USE_FIREBASE`. Add `?fb=0` (or `?fb=1`) to any page's address to use the other one on a single device.
- `fbapi.js` answers every request the site used to send to the Apps Script, using Firestore and Firebase sign-in. `activity.json` points at its internal address. With `USE_FIREBASE` false, every request goes to the old script, as before.
- `firebase/firestore.rules` is **the security**: who can read and write what. Paste it into Firebase console › Firestore › Rules › Publish whenever it changes.

## Sign-in
- **Pupils** sign in with their school email and 4-digit PIN, as before. Behind the scenes each pupil has a Firebase account (`<pupil id>.<n>@pupils.ergs-revision.firebaseapp.com`) whose password is their PIN. A new PIN means a new account (`n+1`). Firebase slows down repeated wrong PINs by itself.
- **Pupils moved from the Google Sheet keep their PIN.** The first time each one signs in, the old script checks the PIN once, then their Firebase account is made with it. Keep the old Apps Script deployed: it does those checks, and it still sends emails (Email a new PIN, staff details, test email).
- **Teachers**: the Teacher area asks once for **Sign in with Google** (jbutler483@gmail.com or jbutler803@c2ken.net). Another member of staff can be made a teacher in Teacher area › Pupils (their school email and PIN), or added with a Firestore `staff` document whose ID is their Google email.
- The staff password and staff PIN typed in the sign-in box are checked against `staffkeys` (stored only as hashes).

## Moving the data (Teacher area › Pupil tracking › ⋯ › Copy data from the Google Sheet)
This copies pupils, emails, classes, class lists, zones, requests, revision time per day, workbook progress, saved progress, page marks, set work, messages, topic tests and results, and competitions with their entries. It's safe to run again: pupils already signed in on Firebase are left as they are.

## Staying free
The Spark plan has no card and can't be charged. Its daily allowances are 50,000 reads, 20,000 writes and 1 GB stored. The site is built to stay well inside them:
- A pupil's activity (time, "revising now", progress snapshots) is kept on their device and written together at most once every 3 minutes. That's roughly 40–60 writes for an hour of revision.
- Saved progress is written at most every 5 minutes, or straight away for Save now and Sign out.
- Pupil look-ups (class, zones, set work, messages) are cached on the device for 10 minutes.
- The Teacher area uses live listeners: refreshing costs only what changed.

If an allowance is ever used up, Firebase stops answering until midnight Pacific time (8am UK). It never bills you. Pupils' activity waits on their device until then.

## What the free plan can't do
- The **Monday weekly email** needs server code. The same report is in Teacher area › Pupil tracking › Week.
- **Emails on new sign-ups** need server code too. New sign-ups appear in Requests straight away.
- Firebase allows about 100 new pupil accounts an hour from one school connection. The quota was raised to 1,000 an hour for the first week after the move (Firebase console › Authentication › Settings › Sign-up quota).
