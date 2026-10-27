/* C# Academy: single-page app.
   Routes: #/            course home
           #/l/<id>      a lesson (code, read or quiz)
           #/playground  free editor
           #/glossary    key terms
   Progress, code and virtual files live in localStorage on the pupil's device. */
(function () {
  "use strict";

  const $ = (sel, el = document) => el.querySelector(sel);
  const main = $("#main");
  const LESSONS = COURSE.allLessons();
  const byId = new Map(LESSONS.map((x, i) => [x.lesson.id, Object.assign({ index: i }, x)]));

  // ---------- storage ----------
  const KEY = "csacademy.v1";
  const store = (() => {
    let data;
    try { data = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { data = {}; }
    data.done = data.done || {};
    data.code = data.code || {};
    data.files = data.files || {};
    data.quiz = data.quiz || {};
    data.fails = data.fails || {};
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage full or blocked */ } };
    return { data, save };
  })();
  const isDone = (id) => !!store.data.done[id];
  function markDone(id) {
    if (!store.data.done[id]) { store.data.done[id] = Date.now(); store.save(); }
    renderTopProgress();
  }
  const doneCount = () => LESSONS.filter((x) => isDone(x.lesson.id)).length;

  // ---------- theme ----------
  const themeBtn = $("#themeBtn");
  function applyTheme(t) {
    if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  }
  applyTheme(store.data.theme);
  themeBtn.addEventListener("click", () => {
    const dark = store.data.theme ? store.data.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    store.data.theme = dark ? "light" : "dark";
    store.save();
    applyTheme(store.data.theme);
  });

  // ---------- icons ----------
  const ICONS = {
    rocket: "M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 12l3 3M14 4c3-1 6-1 6-1s0 3-1 6l-7 7-5-5 7-7z",
    print: "M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z",
    box: "M3 7l9-4 9 4v10l-9 4-9-4V7zM3 7l9 4 9-4M12 11v10",
    keyboard: "M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10",
    calc: "M5 3h14v18H5zM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01",
    branch: "M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9c0 6-12 3-12 6",
    repeat: "M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    text: "M4 7V4h16v3M9 20h6M12 4v16",
    function: "M10 3H8a2 2 0 0 0-2 2v4l-2 3 2 3v4a2 2 0 0 0 2 2h2M14 3h2a2 2 0 0 1 2 2v4l2 3-2 3v4a2 2 0 0 1-2 2h-2",
    shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4",
    file: "M14 3H6v18h12V7l-4-4zM14 3v4h4M9 13h6M9 17h6",
    cube: "M12 2l9 5v10l-9 5-9-5V7l9-5zM12 12l9-5M12 12v10M12 12L3 7",
    tree: "M10 3h4v4h-4zM12 7v4M5 11h14M5 11v4M19 11v4M3 15h4v4H3zM17 15h4v4h-4z",
    trophy: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 6h3v2a3 3 0 0 1-3 3M7 6H4v2a3 3 0 0 0 3 3",
    play: "M7 4l13 8-13 8z",
    check: "M5 12l5 5 9-10",
    stop: "M6 6h12v12H6z",
    reset: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5",
    bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    chev: "M6 9l6 6 6-6",
    left: "M15 18l-6-6 6-6",
    right: "M9 6l6 6-6 6",
    star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  };
  const icon = (name, size = 20, fill = false) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="${fill ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[name] || ICONS.box}"/></svg>`;
  const tickSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>`;
  const crossSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- static C# highlighting for lesson text ----------
  const KW = new Set("abstract as base bool break byte case catch char class const continue decimal default do double else enum false finally float for foreach if in int interface internal is long namespace new null object out override private protected public readonly ref return sealed static string struct switch this throw true try using var virtual void while get set value".split(" "));
  const TYPES = new Set("Console Convert Math Random List Dictionary StringBuilder File StreamReader StreamWriter DateTime Exception FormatException DivideByZeroException IndexOutOfRangeException Array String Environment SHA256 Encoding CultureInfo ConsoleKey ConsoleKeyInfo ConsoleColor".split(" "));
  function highlight(code) {
    const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(\$?@?"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\])')|(\b\d+(?:\.\d+)?[mMdDfF]?\b)|([A-Za-z_]\w*)/g;
    let out = "", last = 0, m;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index));
      const t = m[0];
      if (m[1]) out += `<span class="tok-com">${esc(t)}</span>`;
      else if (m[2]) out += `<span class="tok-str">${esc(t)}</span>`;
      else if (m[3]) out += `<span class="tok-num">${esc(t)}</span>`;
      else if (KW.has(t)) out += `<span class="tok-kw">${t}</span>`;
      else if (TYPES.has(t)) out += `<span class="tok-type">${t}</span>`;
      else out += esc(t);
      last = m.index + t.length;
    }
    return out + esc(code.slice(last));
  }
  function decorateProse(el) {
    el.querySelectorAll("pre code").forEach((c) => {
      if (c.classList.contains("cs") || c.closest("pre").classList.contains("cs")) c.innerHTML = highlight(c.textContent);
    });
  }

  // ---------- top progress ----------
  function renderTopProgress() {
    const n = doneCount(), total = LESSONS.length;
    const pct = total ? Math.round((n / total) * 100) : 0;
    $("#topProgress").innerHTML = `<span class="label">${n} of ${total} lessons</span><span class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Course progress"><span style="width:${pct}%"></span></span>`;
  }
  function setNav(which) {
    document.querySelectorAll(".topnav a").forEach((a) => a.classList.toggle("active", a.dataset.nav === which));
  }

  // ---------- modal and toast ----------
  function modal(title, bodyHtml, actions) {
    const m = $("#modal");
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = bodyHtml;
    const box = $("#modalActions");
    box.innerHTML = "";
    const close = () => { m.hidden = true; document.removeEventListener("keydown", onKey); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    (actions || [{ label: "Close" }]).forEach((a, i) => {
      const b = document.createElement("button");
      b.className = "btn " + (a.primary ? "btn-primary" : "btn-quiet");
      b.textContent = a.label;
      b.type = "button";
      b.addEventListener("click", () => { close(); if (a.run) a.run(); });
      box.appendChild(b);
      if (i === (actions || []).length - 1 || !actions) setTimeout(() => b.focus(), 0);
    });
    decorateProse($("#modalBody"));
    m.hidden = false;
    document.addEventListener("keydown", onKey);
    m.onclick = (e) => { if (e.target === m) close(); };
  }
  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  // ---------- console ----------
  const COLOURS = { Red: "red", DarkRed: "red", Green: "green", DarkGreen: "green", Yellow: "yellow", DarkYellow: "yellow", Blue: "blue", DarkBlue: "blue", Cyan: "cyan", DarkCyan: "cyan", Magenta: "magenta", DarkMagenta: "magenta", Gray: "gray", DarkGray: "darkgray", White: "white" };
  class ConsoleView {
    constructor(el) {
      this.el = el;
      this.pending = null;
      el.tabIndex = 0;
      el.setAttribute("role", "log");
      el.setAttribute("aria-live", "polite");
      el.setAttribute("aria-label", "Console output");
    }
    clear() { this.el.innerHTML = ""; }
    span(cls) {
      const s = document.createElement("span");
      if (cls) s.className = cls;
      this.el.appendChild(s);
      return s;
    }
    write(text, colour) {
      const cls = colour && COLOURS[colour] ? "c-" + COLOURS[colour] : "";
      let last = this.el.lastChild;
      if (!last || last.nodeType !== 1 || last.tagName !== "SPAN" || (last.className || "") !== cls) last = this.span(cls);
      for (const ch of String(text)) {
        if (ch === "\b") this.backspace();
        else last.textContent += ch;
        if (last !== this.el.lastChild) last = this.span(cls);
      }
      this.scroll();
    }
    backspace() {
      let n = this.el.lastChild;
      while (n) {
        if (n.textContent.length) { n.textContent = n.textContent.slice(0, -1); return; }
        const prev = n.previousSibling; n.remove(); n = prev;
      }
    }
    sys(text, cls = "sys") {
      if (this.el.textContent && !this.el.textContent.endsWith("\n")) this.span("").textContent = "\n";
      this.span(cls).textContent = text + "\n";
      this.scroll();
    }
    scroll() { this.el.scrollTop = this.el.scrollHeight; }
    readLine() {
      return new Promise((resolve) => {
        const input = document.createElement("input");
        input.className = "stdin";
        input.type = "text";
        input.autocomplete = "off";
        input.spellcheck = false;
        input.setAttribute("aria-label", "Type your input and press Enter");
        this.el.appendChild(input);
        this.scroll();
        input.focus();
        const finish = (val) => {
          input.remove();
          if (val !== null) { this.span("in").textContent = val + "\n"; this.scroll(); }
          this.pending = null;
          resolve(val);
        };
        input.addEventListener("keydown", (e) => {
          if (e.key !== "Enter") return;
          // Stop this Enter reaching a ReadKey that the program may start straight afterwards.
          e.preventDefault();
          e.stopPropagation();
          const v = input.value;
          setTimeout(() => finish(v), 0);
        });
        this.pending = () => finish(null);
        this.el.onclick = () => input.focus();
      });
    }
    readKey(intercept) {
      return new Promise((resolve) => {
        const caret = document.createElement("span");
        caret.className = "keywait";
        caret.setAttribute("aria-label", "Waiting for a key press");
        this.el.appendChild(caret);
        this.scroll();
        this.el.focus();
        const onKey = (e) => {
          if (["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab"].includes(e.key)) return;
          e.preventDefault();
          e.stopPropagation();
          const k = mapKey(e);
          this.el.removeEventListener("keydown", onKey);
          setTimeout(() => done(k), 0);
        };
        const done = (k) => {
          this.el.removeEventListener("keydown", onKey);
          caret.remove();
          this.pending = null;
          if (k && !intercept && k.keyChar && k.keyChar >= " ") this.write(k.keyChar);
          resolve(k || { key: "Escape", keyChar: "\x1b" });
        };
        this.el.addEventListener("keydown", onKey);
        this.pending = () => done(null);
        this.el.onclick = () => this.el.focus();
      });
    }
    cancelInput() { if (this.pending) this.pending(); }
  }
  function mapKey(e) {
    const k = e.key;
    const named = { Enter: ["Enter", "\r"], Backspace: ["Backspace", "\b"], Escape: ["Escape", "\x1b"], " ": ["Spacebar", " "], ArrowUp: ["UpArrow", "\0"], ArrowDown: ["DownArrow", "\0"], ArrowLeft: ["LeftArrow", "\0"], ArrowRight: ["RightArrow", "\0"], Delete: ["Delete", "\0"] };
    if (named[k]) return { key: named[k][0], keyChar: named[k][1] };
    if (k.length === 1) {
      if (/[a-z]/i.test(k)) return { key: k.toUpperCase(), keyChar: k };
      if (/[0-9]/.test(k)) return { key: "D" + k, keyChar: k };
      return { key: "Oem", keyChar: k };
    }
    return { key: k, keyChar: "\0" };
  }

  // ---------- editor ----------
  function makeEditor(host, value, onChange) {
    if (window.CodeMirror) {
      const cm = CodeMirror(host, {
        value, mode: "text/x-csharp", theme: "academy", lineNumbers: true, indentUnit: 4, tabSize: 4,
        indentWithTabs: false, matchBrackets: true, autoCloseBrackets: true, styleActiveLine: true,
        lineWrapping: false, extraKeys: {
          Tab: (c) => c.somethingSelected() ? c.indentSelection("add") : c.replaceSelection("    "),
          "Shift-Tab": (c) => c.indentSelection("subtract"),
        },
      });
      cm.getInputField().setAttribute("aria-label", "Code editor");
      let marked = null;
      cm.on("change", () => { if (marked !== null) { cm.removeLineClass(marked, "background", "cm-error-line"); marked = null; } onChange && onChange(cm.getValue()); });
      setTimeout(() => cm.refresh(), 0);
      return {
        get: () => cm.getValue(),
        set: (v) => cm.setValue(v),
        focus: () => cm.focus(),
        refresh: () => cm.refresh(),
        markLine(n) {
          if (marked !== null) cm.removeLineClass(marked, "background", "cm-error-line");
          if (n && n > 0 && n <= cm.lineCount()) { marked = n - 1; cm.addLineClass(marked, "background", "cm-error-line"); cm.scrollIntoView({ line: marked, ch: 0 }, 80); }
          else marked = null;
        },
      };
    }
    // Fallback if the CDN editor couldn't load
    const ta = document.createElement("textarea");
    ta.className = "plain";
    ta.spellcheck = false;
    ta.value = value;
    ta.setAttribute("aria-label", "Code editor");
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Tab") { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText("    ", s, ta.selectionEnd, "end"); onChange && onChange(ta.value); }
    });
    ta.addEventListener("input", () => onChange && onChange(ta.value));
    host.appendChild(ta);
    return { get: () => ta.value, set: (v) => { ta.value = v; }, focus: () => ta.focus(), refresh() {}, markLine() {} };
  }

  // ---------- workbench (editor + console + files) used by lessons and the playground ----------
  function workbench(host, opts) {
    host.innerHTML = `
      <div class="bench-bar">
        <span class="file-tab">Program.cs</span>
        <span class="spacer"></span>
        <button class="btn btn-ghost" data-act="reset" type="button" title="Start this code again">${icon("reset", 16)}Reset</button>
        <button class="btn btn-run" data-act="run" type="button" title="Run (Ctrl+Enter)">${icon("play", 16, true)}Run</button>
        ${opts.check ? `<button class="btn btn-check" data-act="check" type="button">${icon("check", 16)}Check</button>` : ""}
        <button class="btn btn-ghost" data-act="stop" type="button" hidden>${icon("stop", 16, true)}Stop</button>
      </div>
      <div class="editor-wrap"></div>
      <div class="console-bar">
        <div class="console-tabs" role="tablist">
          <button role="tab" aria-selected="true" data-tab="out" type="button">Console</button>
          <button role="tab" aria-selected="false" data-tab="files" type="button">Files</button>
        </div>
        <span class="spacer"></span>
        <span class="status" aria-live="polite"></span>
      </div>
      <div class="console"></div>
      <div class="files" hidden></div>`;
    const bar = host;
    const btn = (a) => $(`[data-act="${a}"]`, bar);
    const statusEl = $(".status", host);
    const cons = new ConsoleView($(".console", host));
    const filesEl = $(".files", host);
    const editor = makeEditor($(".editor-wrap", host), opts.code, opts.onChange);
    let running = false, stopFlag = false;

    cons.sys(opts.welcome || "Press Run to see what your program does.");

    function setStatus(text, cls) { statusEl.textContent = text; statusEl.className = "status " + (cls || ""); }
    function setRunning(on) {
      running = on;
      btn("run").hidden = on;
      if (btn("check")) btn("check").disabled = on;
      btn("reset").disabled = on;
      btn("stop").hidden = !on;
      if (on) setStatus("Running…", "run");
    }
    function showTab(which) {
      host.querySelectorAll(".console-tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === which)));
      $(".console", host).hidden = which !== "out";
      filesEl.hidden = which !== "files";
      if (which === "files") renderFiles();
    }
    host.querySelectorAll(".console-tabs button").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));

    function renderFiles() {
      const files = opts.getFiles();
      const names = Object.keys(files).sort();
      if (!names.length) {
        filesEl.innerHTML = `<p class="empty">No files yet. When your program writes a file with <code>File.WriteAllText</code> or a <code>StreamWriter</code>, it appears here.</p>`;
        return;
      }
      filesEl.innerHTML = names.map((n) => `<div class="file"><header>${icon("file", 14)}${esc(n)}<button type="button" data-del="${esc(n)}">Delete</button></header><pre>${esc(files[n]) || "<em>(empty)</em>"}</pre></div>`).join("");
      filesEl.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
        delete files[b.dataset.del];
        opts.saveFiles();
        renderFiles();
      }));
    }

    function reportError(r) {
      if (r.kind === "stopped") { cons.sys("Stopped."); setStatus("Stopped", ""); return; }
      const where = r.line ? ` (line ${r.line})` : "";
      const head = r.kind === "compile" ? "Your code has an error, so it couldn't run:" : r.kind === "timeout" ? "" : "Your program crashed" + where + ":";
      if (head) cons.sys(head, "err");
      cons.sys(r.message, "err");
      editor.markLine(r.line);
      setStatus(r.kind === "compile" ? "Error" : r.kind === "timeout" ? "Stopped" : "Crashed", "bad");
    }

    async function run() {
      if (running) return;
      showTab("out");
      cons.clear();
      editor.markLine(0);
      stopFlag = false;
      setRunning(true);
      let colour = null;
      const files = opts.getFiles();
      let result;
      try {
        result = await CSharp.run(editor.get(), {
          write: (t, c) => cons.write(t, c || colour),
          clear: () => cons.clear(),
          setColour: (c) => { colour = c; },
          readLine: () => { setStatus("Waiting for input", "run"); return cons.readLine().then((v) => { setStatus("Running…", "run"); return v; }); },
          readKey: (intercept) => { setStatus("Press a key", "run"); return cons.readKey(intercept).then((v) => { setStatus("Running…", "run"); return v; }); },
          files,
          maxSteps: 5000000,
          shouldStop: () => stopFlag,
        });
      } catch (e) {
        result = { ok: false, kind: "runtime", message: "Something went wrong inside the C# runner: " + e.message };
      }
      opts.saveFiles();
      setRunning(false);
      if (result.ok) {
        if (!cons.el.textContent.trim()) cons.sys("Your program finished without printing anything.");
        setStatus("Finished", "ok");
      } else reportError(result);
      if (!filesEl.hidden) renderFiles();
      return result;
    }
    function stop() { stopFlag = true; cons.cancelInput(); }

    btn("run").addEventListener("click", run);
    btn("stop").addEventListener("click", stop);
    btn("reset").addEventListener("click", () => {
      modal("Start again?", "<p>This puts the starting code back and removes your changes to this exercise.</p>", [
        { label: "Keep my code" },
        { label: "Reset code", primary: true, run: () => { editor.set(opts.starter); opts.onChange && opts.onChange(opts.starter); toast("Code reset"); } },
      ]);
    });
    host.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); }
    });

    return { editor, cons, run, stop, setStatus, setRunning, reportError, showTab, isRunning: () => running, btn };
  }

  // ---------- views ----------
  function viewHome() {
    setNav("course");
    document.title = "C# Academy · ERGS Digital Technology";
    const next = LESSONS.find((x) => !isDone(x.lesson.id)) || LESSONS[0];
    const n = doneCount();
    const startLabel = n === 0 ? "Start the course" : n === LESSONS.length ? "Review the course" : "Continue where you left off";
    const totalMods = COURSE.modules.length;
    const modsDone = COURSE.modules.filter((m) => m.lessons.every((l) => isDone(l.id))).length;
    const codeLessons = LESSONS.filter((x) => x.lesson.type === "code").length;

    main.innerHTML = `
      <div class="home">
        <section class="hero">
          <div>
            <h1>Learn to program in <span class="cs">C#</span></h1>
            <p class="lede">Write real code from your very first lesson. Work from printing one line all the way to an object-oriented quiz with its own login.</p>
            <div class="hero-actions">
              <a class="btn btn-primary btn-lg" href="#/l/${next.lesson.id}">${startLabel}</a>
              <span class="hero-note">${n ? `Next up: ${esc(next.lesson.title)}` : "No sign-up. Your progress saves on this device."}</span>
            </div>
          </div>
          <div class="mini" aria-label="Try C# now">
            <div class="mini-bar"><span class="tab">Try it: change the name, then press Run</span><button class="btn btn-run" type="button" id="miniRun">${icon("play", 14, true)}Run</button></div>
            <textarea id="miniCode" spellcheck="false" aria-label="Try some C# code">string name = "Enniskillen";
int year = DateTime.Now.Year;

Console.WriteLine($"Hello, {name}!");
Console.WriteLine($"It's {year}. Time to learn C#.");</textarea>
            <div class="mini-out" id="miniOut" aria-live="polite"><span class="placeholder">Output appears here.</span></div>
          </div>
        </section>

        <div class="course-head">
          <div>
            <h2>The course</h2>
            <p>${totalMods} modules, in order. Each one ends with a checkpoint quiz.</p>
          </div>
          <div class="course-stats">
            <div class="stat"><strong>${n}/${LESSONS.length}</strong><span>lessons done</span></div>
            <div class="stat"><strong>${modsDone}</strong><span>modules complete</span></div>
            <div class="stat"><strong>${codeLessons}</strong><span>coding exercises</span></div>
          </div>
        </div>
        <ol class="track" id="track"></ol>
      </div>`;

    const track = $("#track");
    let reached = 0;
    COURSE.modules.forEach((m, i) => {
      const done = m.lessons.filter((l) => isDone(l.id)).length;
      if (done) reached = i;
      const li = document.createElement("li");
      li.className = "station" + (done === m.lessons.length ? " complete" : done ? " started" : "");
      const firstOpen = m.lessons.find((l) => !isDone(l.id));
      if (firstOpen && next.module === m) li.classList.add("open");
      li.innerHTML = `
        <span class="station-dot" aria-hidden="true">${done === m.lessons.length ? tickSvg.replace("<svg", '<svg width="20" height="20"') : i}</span>
        <div class="station-card">
          <button class="station-toggle" type="button" aria-expanded="${li.classList.contains("open")}">
            <span class="station-icon">${icon(m.icon, 22)}</span>
            <span><span class="station-title">${i}. ${esc(m.title)}</span><span class="station-sum" style="display:block">${esc(m.summary || "")}</span></span>
            <span class="station-meta"><span class="pips" aria-hidden="true">${m.lessons.map((l) => `<i class="${isDone(l.id) ? "on" : ""}"></i>`).join("")}</span><span>${done}/${m.lessons.length}</span>${icon("chev", 18).replace("<svg", '<svg class="chev"')}</span>
          </button>
          <ul class="lesson-list">
            ${m.lessons.map((l) => `<li><a href="#/l/${l.id}"><span class="tick ${isDone(l.id) ? "on" : ""}">${isDone(l.id) ? tickSvg : ""}</span>${esc(l.title)}<span class="kind">${l.type === "quiz" ? "Quiz" : l.type === "read" ? "Read" : "Code"}</span></a></li>`).join("")}
          </ul>
        </div>`;
      $(".station-toggle", li).addEventListener("click", (e) => {
        li.classList.toggle("open");
        e.currentTarget.setAttribute("aria-expanded", li.classList.contains("open"));
      });
      track.appendChild(li);
    });
    const span = Math.max(1, COURSE.modules.length - 1);
    track.style.setProperty("--done", n ? `${Math.round((reached / span) * 100)}%` : "0%");

    const out = $("#miniOut");
    $("#miniRun").addEventListener("click", async () => {
      out.textContent = "";
      let text = "";
      const r = await CSharp.run($("#miniCode").value, {
        write: (t) => { text += t; out.textContent = text; },
        clear: () => { text = ""; },
        readLine: () => Promise.resolve(window.prompt("Your program is asking for input:") ?? ""),
        readKey: () => Promise.resolve({ key: "Enter", keyChar: "\r" }),
        files: {},
        maxSteps: 1000000,
      });
      if (!r.ok) out.innerHTML = `<span class="err">${esc((r.line ? `Line ${r.line}: ` : "") + r.message)}</span>`;
      else if (!text) out.innerHTML = `<span class="placeholder">Nothing was printed.</span>`;
    });
  }

  function lessonNav(entry) {
    const prev = LESSONS[entry.index - 1], next = LESSONS[entry.index + 1];
    return { prev, next };
  }
  function crumbs(entry) {
    const mi = COURSE.modules.indexOf(entry.module);
    const pos = entry.module.lessons.indexOf(entry.lesson) + 1;
    return `<nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Course</a><span aria-hidden="true">/</span><a href="#/" data-open="${entry.module.id}">${mi}. ${esc(entry.module.title)}</a><span aria-hidden="true">/</span><span>Lesson ${pos} of ${entry.module.lessons.length}</span></nav>`;
  }

  function viewLesson(id) {
    const entry = byId.get(id);
    if (!entry) { location.hash = "#/"; return; }
    setNav("");
    document.title = `${entry.lesson.title} · C# Academy`;
    if (entry.lesson.type === "quiz") return viewQuiz(entry);
    if (entry.lesson.type === "read") return viewRead(entry);
    return viewCode(entry);
  }

  function viewRead(entry) {
    const { lesson } = entry;
    const { prev, next } = lessonNav(entry);
    main.innerHTML = `
      <article class="page">
        ${crumbs(entry)}
        <h1>${esc(lesson.title)}</h1>
        <div class="prose">${lesson.learn || ""}</div>
        <div class="page-foot">
          ${prev ? `<a class="btn btn-quiet" href="#/l/${prev.lesson.id}">${icon("left", 16)}Back</a>` : ""}
          <span class="spacer"></span>
          <button class="btn btn-primary" id="readDone" type="button">${next ? "Got it, next lesson" : "Finish the course"}${icon("right", 16)}</button>
        </div>
      </article>`;
    decorateProse(main);
    $("#readDone").addEventListener("click", () => {
      markDone(lesson.id);
      location.hash = next ? `#/l/${next.lesson.id}` : "#/";
    });
  }

  function viewQuiz(entry) {
    const { lesson } = entry;
    const { prev, next } = lessonNav(entry);
    const qs = lesson.questions || [];
    const answers = new Array(qs.length).fill(null);
    main.innerHTML = `
      <article class="page">
        ${crumbs(entry)}
        <h1>${esc(lesson.title)}</h1>
        ${lesson.learn ? `<div class="prose">${lesson.learn}</div>` : `<p class="prose" style="color:var(--muted)">Choose one answer for each question. You'll see straight away if you're right.</p>`}
        <div id="qs"></div>
        <div id="score"></div>
        <div class="page-foot">
          ${prev ? `<a class="btn btn-quiet" href="#/l/${prev.lesson.id}">${icon("left", 16)}Back</a>` : ""}
          <span class="spacer"></span>
          <button class="btn btn-quiet" id="retry" type="button" hidden>Try the quiz again</button>
          ${next ? `<a class="btn btn-primary" id="quizNext" href="#/l/${next.lesson.id}" hidden>Next lesson${icon("right", 16)}</a>` : `<a class="btn btn-primary" id="quizNext" href="#/" hidden>Back to the course</a>`}
        </div>
      </article>`;
    decorateProse(main);
    const box = $("#qs");
    qs.forEach((q, qi) => {
      const card = document.createElement("section");
      card.className = "q";
      card.innerHTML = `<h2><span class="n">${qi + 1}</span><span>${q.q}</span></h2>${q.code ? `<pre><code class="cs">${esc(q.code)}</code></pre>` : ""}
        <div class="opts" role="group" aria-label="Answers for question ${qi + 1}">${q.options.map((o, oi) => `<button class="opt" type="button" data-i="${oi}"><span class="letter">${String.fromCharCode(65 + oi)}</span><span>${o}</span></button>`).join("")}</div>
        <div class="explain" aria-live="polite"></div>`;
      card.querySelectorAll(".opt").forEach((b) => b.addEventListener("click", () => {
        const pick = Number(b.dataset.i);
        answers[qi] = pick;
        card.querySelectorAll(".opt").forEach((x) => {
          x.disabled = true;
          const xi = Number(x.dataset.i);
          if (xi === q.answer) x.classList.add("right");
          else if (xi === pick) x.classList.add("wrong");
        });
        $(".explain", card).innerHTML = `<strong>${pick === q.answer ? "Correct." : "Not quite."}</strong> ${q.explain || ""}`;
        if (answers.every((a) => a !== null)) finish();
      }));
      box.appendChild(card);
    });
    decorateProse(box);
    function finish() {
      const right = answers.filter((a, i) => a === qs[i].answer).length;
      const pct = Math.round((right / qs.length) * 100);
      store.data.quiz[lesson.id] = Math.max(store.data.quiz[lesson.id] || 0, pct);
      store.save();
      markDone(lesson.id);
      $("#score").innerHTML = `<div class="score-card" role="status"><span class="big">${right}/${qs.length}</span><div><strong>${pct >= 80 ? "Excellent work." : pct >= 50 ? "Good effort." : "Worth another look."}</strong><br><span style="color:var(--muted)">${pct >= 50 ? "You can move on, or try again to beat your score." : "Read back over this module's lessons, then try again."} Best score: ${store.data.quiz[lesson.id]}%.</span></div></div>`;
      $("#retry").hidden = false;
      $("#quizNext").hidden = false;
    }
    $("#retry").addEventListener("click", () => viewQuiz(entry));
  }

  function viewCode(entry) {
    const { lesson } = entry;
    const { prev, next } = lessonNav(entry);
    const saved = store.data.code[lesson.id];
    const filesKey = lesson.id;
    if (!store.data.files[filesKey]) store.data.files[filesKey] = Object.assign({}, lesson.files || {});
    main.innerHTML = `
      <div class="lesson">
        <section class="learn" aria-label="Lesson">
          <div class="learn-head">${crumbs(entry)}<h1>${esc(lesson.title)}</h1></div>
          <div class="learn-scroll">
            <div class="prose">${lesson.learn || ""}</div>
            <div class="panel">
              <h2>${icon("check", 16)}Your task</h2>
              <div class="panel-body">
                <ol class="instructions">${(lesson.instructions || []).map((s) => `<li>${s}</li>`).join("")}</ol>
                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px">
                  ${lesson.hint ? `<button class="btn btn-quiet" id="hintBtn" type="button">${icon("bulb", 16)}Show a hint</button>` : ""}
                  <button class="btn btn-quiet" id="solBtn" type="button" hidden>${icon("eye", 16)}See a solution</button>
                </div>
                <div id="hint" class="hint-box" hidden>${lesson.hint || ""}</div>
              </div>
            </div>
            <div class="panel" id="resultsPanel" hidden>
              <h2>Check results</h2>
              <div class="panel-body" id="results"></div>
            </div>
            <div id="passBox"></div>
          </div>
          <div class="learn-foot">
            ${prev ? `<a class="btn btn-quiet" href="#/l/${prev.lesson.id}" aria-label="Previous lesson">${icon("left", 16)}</a>` : ""}
            <span class="step">${isDone(lesson.id) ? "Completed" : "Press Check when you think you've done it"}</span>
            ${next ? `<a class="btn btn-quiet" href="#/l/${next.lesson.id}" id="skipNext">Next${icon("right", 16)}</a>` : ""}
          </div>
        </section>
        <section class="bench" aria-label="Code editor and console"></section>
      </div>`;
    decorateProse(main);

    let saveTimer;
    const wb = workbench($(".bench", main), {
      code: saved != null ? saved : lesson.starter || "",
      starter: lesson.starter || "",
      check: true,
      welcome: "Press Run to try your program, or Check to have it marked.",
      onChange: (v) => { clearTimeout(saveTimer); saveTimer = setTimeout(() => { store.data.code[lesson.id] = v; store.save(); }, 300); },
      getFiles: () => store.data.files[filesKey],
      saveFiles: () => store.save(),
    });

    const hintBtn = $("#hintBtn");
    if (hintBtn) hintBtn.addEventListener("click", () => { $("#hint").hidden = !$("#hint").hidden; hintBtn.lastChild.textContent = $("#hint").hidden ? "Show a hint" : "Hide the hint"; });
    const solBtn = $("#solBtn");
    const showSolBtn = () => { if (lesson.solution && ((store.data.fails[lesson.id] || 0) >= 2 || isDone(lesson.id))) solBtn.hidden = false; };
    showSolBtn();
    solBtn.addEventListener("click", () => {
      modal("A possible solution", `<p>There's usually more than one right answer. Read this through and work out why it works, rather than just copying it.</p><pre><code class="cs">${esc(lesson.solution)}</code></pre>`, [
        { label: "Close" },
        { label: "Put it in my editor", primary: true, run: () => { wb.editor.set(lesson.solution); store.data.code[lesson.id] = lesson.solution; store.save(); } },
      ]);
    });

    if (isDone(lesson.id)) showPass(false);

    wb.btn("check").addEventListener("click", async () => {
      if (wb.isRunning()) return;
      wb.setRunning(true);
      wb.setStatus("Checking…", "run");
      wb.cons.clear();
      wb.editor.markLine(0);
      const code = wb.editor.get();
      let res;
      try { res = await Checker.check(CSharp, lesson, code); }
      catch (e) { res = { passed: false, error: { kind: "runtime", message: e.message }, results: [], output: "" }; }
      wb.setRunning(false);
      const testInput = (lesson.stdin && lesson.stdin.length ? lesson.stdin : ((lesson.tests || []).find((t) => t.stdin) || {}).stdin) || [];
      if (testInput.length) wb.cons.sys("Check typed in: " + testInput.map((x) => JSON.stringify(String(x))).join(", ") + " (typed input isn't shown below)");
      if (res.output) wb.cons.write(res.output);
      const resultsEl = $("#results");
      $("#resultsPanel").hidden = false;
      let html = "";
      if (res.error) {
        const e = res.error;
        const what = e.kind === "compile" || (!e.kind && e.line) ? "Your code has an error, so it couldn't be checked:" : e.kind === "timeout" ? "Your program didn't finish:" : "Your program crashed while it was being checked:";
        html += `<p style="margin:0 0 8px">${what}</p><div class="result-error">${esc((e.line ? `Line ${e.line}: ` : "") + e.message.replace(/^Line \d+:\s*/, ""))}</div>`;
        wb.editor.markLine(e.line);
        wb.cons.sys((e.line ? `Line ${e.line}: ` : "") + e.message.replace(/^Line \d+:\s*/, ""), "err");
      }
      if (res.results.length) {
        html += `<ul class="results">${res.results.map((r) => `<li><span class="tick ${r.ok ? "on" : "off"}">${r.ok ? tickSvg : crossSvg}</span><span>${r.msg}</span></li>`).join("")}</ul>`;
      }
      resultsEl.innerHTML = html;
      if (res.passed) {
        wb.setStatus("Passed", "ok");
        const first = !isDone(lesson.id);
        markDone(lesson.id);
        showPass(first);
      } else {
        wb.setStatus(res.error ? "Error" : "Not yet", "bad");
        store.data.fails[lesson.id] = (store.data.fails[lesson.id] || 0) + 1;
        store.save();
        showSolBtn();
        $("#resultsPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });

    function showPass(fresh) {
      const moduleDone = entry.module.lessons.every((l) => isDone(l.id));
      $("#passBox").innerHTML = `<div class="pass-banner" role="status">
        <span class="badge">${icon(fresh ? "star" : "check", 20, fresh)}</span>
        <span><strong>${fresh ? "Nice one, lesson complete." : "You've completed this lesson."}</strong><span style="color:var(--muted); font-size:15px">${moduleDone && fresh ? "That's the whole module done." : "Keep experimenting, or move on."}</span></span>
        ${next ? `<a class="btn btn-primary" href="#/l/${next.lesson.id}">Next lesson${icon("right", 16)}</a>` : `<a class="btn btn-primary" href="#/">Back to the course</a>`}
      </div>`;
      $(".learn-foot .step").textContent = "Completed";
      solBtn && showSolBtn();
      if (fresh) $("#passBox").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  const PLAY_STARTER = `using System;

class Program
{
    static void Main(string[] args)
    {
        Console.Write("What's your name? ");
        string name = Console.ReadLine();
        Console.WriteLine($"Hello, {name}! This is your playground.");
        Console.WriteLine("Write any C# you like here. It saves as you type.");
    }
}
`;
  function viewPlayground() {
    setNav("playground");
    document.title = "Playground · C# Academy";
    if (!store.data.files.__play) store.data.files.__play = {};
    main.innerHTML = `<div class="play"><section class="bench" aria-label="Playground"></section></div>`;
    let t;
    workbench($(".bench", main), {
      code: store.data.code.__play != null ? store.data.code.__play : PLAY_STARTER,
      starter: PLAY_STARTER,
      check: false,
      welcome: "The playground is yours: try out ideas, build your own programs, test things before using them in a lesson.",
      onChange: (v) => { clearTimeout(t); t = setTimeout(() => { store.data.code.__play = v; store.save(); }, 300); },
      getFiles: () => store.data.files.__play,
      saveFiles: () => store.save(),
    });
  }

  function viewGlossary() {
    setNav("glossary");
    document.title = "Key terms · C# Academy";
    const terms = (window.GLOSSARY || []).slice().sort((a, b) => a.term.localeCompare(b.term));
    main.innerHTML = `
      <article class="page">
        <h1>Key terms</h1>
        <p class="prose" style="color:var(--muted)">The words you need for the GCSE, in plain English.</p>
        <input class="gloss-search" id="gq" type="search" placeholder="Search, for example ‘iteration’" aria-label="Search key terms">
        <dl class="gloss" id="gl"></dl>
      </article>`;
    const render = (q) => {
      const f = q.trim().toLowerCase();
      const list = terms.filter((t) => !f || t.term.toLowerCase().includes(f) || t.def.toLowerCase().includes(f));
      $("#gl").innerHTML = list.length ? list.map((t) => `<dt>${esc(t.term)}</dt><dd>${t.def}</dd>`).join("") : `<dd style="grid-column:1/-1">No terms match “${esc(q)}”.</dd>`;
    };
    render("");
    $("#gq").addEventListener("input", (e) => render(e.target.value));
  }

  // ---------- router ----------
  function route() {
    const h = location.hash.replace(/^#/, "") || "/";
    const parts = h.split("/").filter(Boolean);
    if (parts[0] === "l" && parts[1]) viewLesson(decodeURIComponent(parts[1]));
    else if (parts[0] === "playground") viewPlayground();
    else if (parts[0] === "glossary") viewGlossary();
    else viewHome();
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
  window.addEventListener("hashchange", route);
  renderTopProgress();
  route();
})();
