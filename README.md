# C# Academy

A pupil-facing course that teaches programming in C#, from a first `Console.WriteLine` to an object-oriented quiz with a hashed-password login. Built for CCEA GCSE Digital Technology (Route B: Programming).

Pupils read a short lesson, write C# in the editor, press **Run** to try it (with real keyboard input in the console) and **Check** to have it marked. Each module ends with a checkpoint quiz. Progress and code save in the pupil's browser; there are no accounts.

## How C# runs

There is no .NET in the browser, so `js/csharp.js` is a C# interpreter written in JavaScript. It supports the GCSE subset: data types, selection, loops, arrays, lists, strings, methods with `ref`/`out`, validation and exceptions, files (stored in the browser), classes, properties, inheritance, abstract classes, interfaces and SHA-256 hashing. Code that works here should also work in a Visual Studio console app.

## Layout

| Path | What it is |
| --- | --- |
| `index.html`, `css/`, `js/app.js` | The site |
| `js/csharp.js` | The C# interpreter |
| `js/checker.js` | Marks pupil code against a lesson's tests |
| `js/course/mNN.js` | One file per module: lessons, exercises, tests, quizzes |
| `js/glossary.js` | Key terms page |
| `tools/verify.js` | `node tools/verify.js` proves every lesson's solution passes its tests |
| `tools/test-interpreter.js` | Interpreter test suite |

## Editing a lesson

Open the module file in `js/course/`, change the lesson, then run `node tools/verify.js` to make sure its solution still passes. The lesson format is described in `SPEC.md`.

## Hosting

Settings → Pages → *Deploy from a branch* → `main`, `/ (root)`. To try it locally, run `python3 -m http.server` in this folder and open http://localhost:8000.

The previous Digital Technology Hub (GCSE and GCE, passcode-protected) is kept on the `hub-backup-2026-10-27` branch.
