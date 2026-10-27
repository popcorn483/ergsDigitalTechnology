// Runs a lesson's tests against pupil code. Shared by the site (window.Checker) and tools/verify.js (Node).
(function (root) {
  "use strict";

  // Console.ReadLine takes the next line; Console.ReadKey takes the next line's
  // characters one at a time and returns Enter at the end of that line.
  function makeInput(lines) {
    const queue = (lines || []).slice();
    let keyBuf = null;
    return {
      readLine() {
        if (keyBuf !== null) { const rest = keyBuf; keyBuf = null; return Promise.resolve(rest); }
        return Promise.resolve(queue.length ? String(queue.shift()) : null);
      },
      readKey() {
        if (keyBuf === null) {
          if (!queue.length) return Promise.resolve({ key: "Enter", keyChar: "\r" });
          keyBuf = String(queue.shift());
        }
        if (keyBuf.length === 0) { keyBuf = null; return Promise.resolve({ key: "Enter", keyChar: "\r" }); }
        const ch = keyBuf[0];
        keyBuf = keyBuf.slice(1);
        return Promise.resolve({ key: keyName(ch), keyChar: ch });
      },
    };
  }

  function keyName(ch) {
    if (/[a-z]/i.test(ch)) return ch.toUpperCase();
    if (/[0-9]/.test(ch)) return "D" + ch;
    if (ch === " ") return "Spacebar";
    if (ch === "\b") return "Backspace";
    if (ch === "\r" || ch === "\n") return "Enter";
    if (ch === "\x1b") return "Escape";
    return "Oem";
  }

  // Applies "\b" backspaces the way a real console would, so masked passwords read cleanly.
  function tidy(out) {
    if (out.indexOf("\b") < 0) return out.replace(/[ \t]+\n/g, "\n");
    const buf = [];
    for (const c of out) {
      if (c === "\b") buf.pop();
      else buf.push(c);
    }
    return buf.join("").replace(/[ \t]+\n/g, "\n");
  }

  function stripComments(code) {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/("(?:\\.|[^"\\])*")|\/\/.*$/gm, (m, str) => (str ? str : ""));
  }

  async function runOnce(CSharp, code, stdin, files, maxSteps) {
    let out = "";
    const io = makeInput(stdin);
    const fs = Object.assign({}, files || {});
    const result = await CSharp.run(code, {
      write(t) { out += t; },
      clear() { out = ""; },
      readLine: io.readLine,
      readKey: io.readKey,
      files: fs,
      maxSteps: maxSteps || 3000000,
    });
    return { output: tidy(out), result, files: fs };
  }

  // Returns { passed, error, results: [{ ok, msg }], output }
  async function check(CSharp, lesson, code) {
    const compileErrors = CSharp.check(code);
    if (compileErrors.length) {
      return { passed: false, error: compileErrors[0], results: [], output: "" };
    }
    const cache = new Map();
    const getRun = async (stdin) => {
      const key = JSON.stringify(stdin || []);
      if (!cache.has(key)) cache.set(key, await runOnce(CSharp, code, stdin, lesson.files));
      return cache.get(key);
    };
    const clean = stripComments(code);
    const results = [];
    let firstError = null;
    let shown = null;
    for (const t of lesson.tests || []) {
      const stdin = t.stdin || lesson.stdin || [];
      let ok = false;
      if (t.type === "code") ok = new RegExp(t.pattern, t.flags || "").test(clean);
      else if (t.type === "codeNot") ok = !new RegExp(t.pattern, t.flags || "").test(clean);
      else if (t.type === "codeRaw") ok = new RegExp(t.pattern, t.flags || "").test(code);
      else {
        const run = await getRun(stdin);
        if (!shown) shown = run.output;
        if (!run.result.ok) {
          if (!firstError) firstError = run.result;
          results.push({ ok: false, msg: t.msg });
          continue;
        }
        const out = run.output;
        try {
          if (t.type === "output") {
            ok = t.caseSensitive ? out.includes(t.includes) : out.toLowerCase().includes(String(t.includes).toLowerCase());
          } else if (t.type === "outputRegex") {
            ok = new RegExp(t.pattern, t.flags || "").test(out);
          } else if (t.type === "exact") {
            ok = out.replace(/\s+$/, "") === String(t.expected).replace(/\s+$/, "");
          } else if (t.type === "fn") {
            ok = !!t.fn(out, clean, run.files);
          }
        } catch (e) { ok = false; }
      }
      results.push({ ok, msg: t.msg });
    }
    if (!(lesson.tests || []).some((t) => !/^code/.test(t.type))) {
      // Code-only tests: still make sure the program runs.
      const run = await getRun(lesson.stdin || []);
      shown = run.output;
      if (!run.result.ok) firstError = run.result;
    }
    const passed = !firstError && results.every((r) => r.ok);
    return { passed, error: firstError, results, output: shown || "" };
  }

  const Checker = { check, runOnce, makeInput, stripComments, tidy };
  root.Checker = Checker;
  if (typeof module !== "undefined" && module.exports) module.exports = Checker;
})(typeof window !== "undefined" ? window : globalThis);
