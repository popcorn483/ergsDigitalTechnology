# Digital Technology Hub: CCEA GCSE Digital Technology

This is a teaching and revision hub for CCEA GCSE Digital Technology (Route B: Programming). It covers Unit 1 (Digital Technology) and Unit 4 (Digital Development Concepts).

**The hub is passcode protected.** Lessons, notes, PDFs and images are stored in `enc/` and are encrypted with AES-256-GCM, using a key derived from the passcode with PBKDF2-SHA-256 at 600,000 iterations. Nothing in this repository can be read without the passcode. The passcode itself is not stored here.

## Using it

- **Hosting:** in the repository, go to Settings → Pages → *Deploy from a branch* → `main` / `(root)`. Then share the Pages link and the passcode with pupils.
- **Remember on this device:** pupils can tick this so they don't have to type the passcode again. The **Lock** button in the header clears it.
- **Running locally:** start a web server in this folder, for example `python3 -m http.server`, and open `http://localhost:8000`. Opening the file by double-clicking won't work.

## Files

| Path | Contents |
| --- | --- |
| `index.html` | Page shell and passcode screen |
| `lock.js` | Checks the passcode, then decrypts and runs the app. It also decrypts PDFs and images when they're requested |
| `enc/` | The encrypted app, lesson content, fact-file and workbook PDFs, and diagrams |
| `tools/encrypt.js` | Rebuilds `enc/` from the plain source: `HUB_PASSCODE=... node tools/encrypt.js <source> .` |

## Changing the passcode

Run `tools/encrypt.js` again against the plain source with a new `HUB_PASSCODE`, then commit the new `enc/` folder. Devices that saved the old passcode will be asked for the new one.

## How strong is it?

The encryption is real, but a short passcode can be guessed by someone with the encrypted files and time to try many combinations offline. It is designed to keep casual visitors and pupils out, not a determined attacker. If you need stronger protection, use a longer passcode.
