(function () {
  var C = window.COURSE, app = document.getElementById("app"), PFX = (C.hub && C.hub.store) || "dth.";
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(PFX + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) {} }
  };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function topic(id) { return C.topics.filter(function (t) { return t.id === id; })[0]; }
  function lesson(id) { return C.lessons.filter(function (l) { return l.id === id; })[0]; }
  function unitOf(l) { return topic(l.t).u; }
  function lessonsOf(u) { return C.lessons.filter(function (l) { return unitOf(l) === u; }); }
  function topicsOf(u) { return C.topics.filter(function (t) { return t.u === u; }); }
  // Course configuration: GCSE is the default; another course (GCE) supplies COURSE.hub
  var HUB = C.hub || {};
  HUB.qual = HUB.qual || "CCEA GCSE Digital Technology";
  HUB.tagline = HUB.tagline || "CCEA GCSE · Route B Programming";
  HUB.eyebrow = HUB.eyebrow || "CCEA GCSE Digital Technology · Route B: Programming";
  HUB.heroTitle = HUB.heroTitle || "Everything for Units 1 and 4, in one place";
  HUB.heroLead = HUB.heroLead || "Lessons built from the CCEA specification and fact files, each with a narrated video, a revision podcast, slides you can present or download as PowerPoint, an illustrated fact file, a designed worksheet, four kinds of interactive quiz, and the past-paper questions that tested it since 2019.";
  HUB.units = HUB.units || [
    { id: "U1", short: "Unit 1", name: "Unit 1: Digital Technology", kind: "Compulsory core", info: "External exam · 1 hour · 90 marks · 30%" },
    { id: "U4", short: "Unit 4", name: "Unit 4: Digital Development Concepts", kind: "Route B: Programming", info: "External exam · 1 hour 30 minutes · 120 marks · 40%" }];
  HUB.prog = HUB.prog || "U4"; HUB.store = HUB.store || "dth.";
  // link to the sister hub: a relative folder on GitHub Pages, otherwise the published page
  HUB.other = HUB.other || { label: "A level (GCE) hub", github: "gce/", web: "https://claude.ai/artifact/4QJmiYYmf3Xpupq3QHDeeP" };
  function otherHref() { var o = HUB.other; if (!o) return ""; return /github\.io$/.test(location.hostname) ? (/\/$/.test(o.github) ? o.github + "hub.html" : o.github) : o.web; }
  // ?embed=1: the hub sits inside a revision workbook page. Only the routed content shows (no header, nav, rail or notebook buttons);
  // the page reports its height to the parent with postMessage({type: "dth-embed", h}) so the workbook can size the frame.
  var EMBED = /[?&]embed=1(&|$)/.test(location.search);
  if (EMBED) document.documentElement.classList.add("embed");
  var UIDS = HUB.units.map(function (x) { return x.id; }), UNAME = {}, USHORT = {}, UINFO = {}, UKIND = {};
  HUB.units.forEach(function (x) { UNAME[x.id] = x.name; USHORT[x.id] = x.short; UINFO[x.id] = x.info; UKIND[x.id] = x.kind; });
  var UALL = USHORT[UIDS[0]] + (UIDS.length > 2 ? " to " : " and ") + USHORT[UIDS[UIDS.length - 1]];
  function toast(msg) { var t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600); }
  function copy(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(label + " copied"); }, function () { toast("Copy was blocked – select the text and press Ctrl+C"); });
    else toast("Copy was blocked – select the text and press Ctrl+C");
  }
  function tableHTML(rows) {
    return '<div class="tbl-wrap"><table><thead><tr>' + rows[0].map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rows.slice(1).map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
  }
  function minsText(m) { var h = Math.floor(m / 60), r = m % 60; return (h ? h + " hour" + (h > 1 ? "s" : "") : "") + (h && r ? " " : "") + (r ? r + " minutes" : ""); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function norm(s) { return String(s).toLowerCase().replace(/[^a-z0-9+$=]/g, ""); }

  // ---------- downloads ----------
  var dlPromise = null;
  function downloads() { if (!dlPromise) dlPromise = window.claude && window.claude.use ? window.claude.use("downloads").catch(function () { return null; }) : Promise.resolve(null); return dlPromise; }
  function save(filename, data) {
    return downloads().then(function (d) {
      if (!d) {
        try {
          var blob = data instanceof Blob ? data : new Blob([data], { type: /\.html?$/i.test(filename) ? "text/html" : "application/octet-stream" });
          var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast("Saved " + filename);
        } catch (e) { toast("That file couldn't be saved here"); }
        return;
      }
      return d.save({ filename: filename, data: data }).then(function () { toast("Saved " + filename); }, function (e) {
        if (e && e.code === "declined") return;
        if (e && e.code === "rate_limited") toast("A save is already waiting for your answer");
        else toast("That file couldn't be saved here");
      });
    });
  }
  function saveFile(path, filename) {
    fetch(path).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (b) { save(filename, b); }, function () { toast("That file isn't available yet"); });
  }
  var pptLib = null, iconData = null, zipLib = null;
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  // Writes a pptxgenjs deck and adds the click-by-click animations (animate.js); falls back to a plain deck if JSZip can't load.
  function writeAnimated(pres) {
    if (!zipLib) zipLib = loadScript("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js").then(function () { return window.JSZip; }, function () { zipLib = null; return null; });
    return Promise.all([pres.write({ outputType: "arraybuffer" }), zipLib]).then(function (r) {
      if (!r[1] || !window.Animate) return new Blob([r[0]], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
      return Animate.animate(r[1], r[0], true);
    });
  }
  function deckLibs(ids) {
    if (!pptLib) pptLib = loadScript("https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js").then(function () { return window.PptxGenJS; });
    if (!iconData) iconData = Promise.all(Object.keys(DeckCore.ICON).map(function (k) { return fetch("icons/" + k + ".png").then(function (r) { return r.blob(); }).then(function (b) { return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res([k, String(fr.result).replace(/^data:/, "")]); }; fr.readAsDataURL(b); }); }); })).then(function (pairs) { var o = {}; pairs.forEach(function (p) { o[p[0]] = p[1]; }); return o; });
    var diags = Promise.all(ids.map(function (id) { return fetch("diagrams/" + id + ".png").then(function (r) { if (!r.ok) return null; return r.blob().then(function (b) { return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result).replace(/^data:/, "")); }; fr.readAsDataURL(b); }); }); }).catch(function () { return null; }); }));
    return Promise.all([pptLib, iconData, diags]).then(function (r) { var dg = {}; ids.forEach(function (id, i) { dg[id] = r[2][i]; }); return { ppt: r[0], icons: r[1], diags: dg }; });
  }
  function saveRevisionDeck(t, btn) {
    var label = btn.textContent, ls = topicLessons(t); btn.disabled = true; btn.textContent = "Building revision PowerPoint…";
    deckLibs(ls.map(function (l) { return l.id; })).then(function (k) {
      if (!k.ppt) throw 0;
      return DeckCore.buildRevision(t, ls, k.ppt, k.icons, k.diags).then(writeAnimated);
    }).then(function (blob) { return save("Revision " + t.id + " " + t.name.replace(/[:\/,]/g, "") + ".pptx", blob); }, function () { pptLib = null; toast("The PowerPoint builder couldn't load here. Try again when you're online."); })
      .then(function () { btn.disabled = false; btn.textContent = label; });
  }
  function saveDeck(l, btn) {
    var label = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "Building PowerPoint…"; }
    if (!pptLib) pptLib = loadScript("https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js").then(function () { return window.PptxGenJS; });
    if (!iconData) iconData = Promise.all(Object.keys(DeckCore.ICON).map(function (t) {
      return fetch("icons/" + t + ".png").then(function (r) { return r.blob(); }).then(function (b) { return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res([t, String(fr.result).replace(/^data:/, "")]); }; fr.readAsDataURL(b); }); });
    })).then(function (pairs) { var o = {}; pairs.forEach(function (p) { o[p[0]] = p[1]; }); return o; });
    var diag = fetch("diagrams/" + l.id + ".png").then(function (r) { if (!r.ok) return null; return r.blob().then(function (b) { return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result).replace(/^data:/, "")); }; fr.readAsDataURL(b); }); }); }).catch(function () { return null; });
    Promise.all([pptLib, iconData, diag]).then(function (r) {
      if (!r[0]) throw 0;
      return DeckCore.build(l, r[0], r[1], r[2]).then(writeAnimated);
    }).then(function (blob) { return save(l.id + " " + l.title.replace(/[:\/]/g, " -") + ".pptx", blob); }, function () { pptLib = null; toast("The PowerPoint builder couldn't load here. The full deck set is in the download pack."); })
      .then(function () { if (btn) { btn.disabled = false; btn.textContent = label; } });
  }

  // ---------- revision notebooks: COURSE.notebooks = {unit: {title, url, pages: {lessonId: firstPageId}}} ----------
  var NB = C.notebooks || {};
  function nbOf(u) { var n = NB[u]; return n && n.url ? n : null; }
  function nbHref(u, pageId) { var n = nbOf(u); return n ? n.url + (pageId ? "#" + encodeURIComponent(pageId) : "") : ""; }
  function nbLesson(l) { var u = unitOf(l), n = nbOf(u); return n ? nbHref(u, n.pages && n.pages[l.id]) : ""; }
  function notebookSection(onlyUnit) {
    var have = UIDS.filter(function (u) { return nbOf(u) && (!onlyUnit || u === onlyUnit); });
    var h = '<section class="stack nb-home" id="notebooks"><div class="stack" style="gap:6px"><span class="eyebrow">Start here</span><h2>Revision notebooks</h2><p class="muted">' +
      (have.length ? "Your notes for each unit, set out by specification point. Read a chapter, then use each lesson's slides, videos, activities, worksheet and quiz to test yourself." : "The revision notebook" + (onlyUnit ? " for " + esc(USHORT[onlyUnit]) + " is" : "s are") + " on the way. Until then, start with the fact file in each lesson.") + "</p></div>";
    if (!have.length) return h + '<div class="row"><a class="btn" href="#unit">Go to the lessons</a><a class="btn" href="#factfiles">Fact files</a></div></section>';
    h += '<div class="grid2">' + have.map(function (u) { var n = nbOf(u); return '<a class="panel nb-card" href="' + esc(n.url) + '" target="_blank" rel="noopener"><span class="n">' + esc(USHORT[u]) + " notebook</span><h3>" + esc(n.title || UNAME[u]) + '</h3><span class="btn primary sm">Open the notebook →</span></a>'; }).join("") + "</div>";
    h += have.map(function (u) {
      var n = nbOf(u), pg = n.pages || {};
      return '<details class="panel nb-ch"' + (u === unit || have.length === 1 ? " open" : "") + "><summary><b>" + esc(USHORT[u]) + " chapters</b> <span class=\"muted small\">jump straight to a page</span></summary><ol class=\"nb-list\">" + topicsOf(u).map(function (t) {
        var ls = topicLessons(t).filter(function (l) { return pg[l.id]; });
        return '<li><a href="' + esc(ls.length ? nbHref(u, pg[ls[0].id]) : n.url) + '" target="_blank" rel="noopener"><b>' + esc(t.name) + "</b></a>" + (ls.length ? "<ul>" + ls.map(function (l) { return '<li><a href="' + esc(nbHref(u, pg[l.id])) + '" target="_blank" rel="noopener">' + esc(l.title) + '</a> <a class="small muted" href="#' + l.id + '">· lesson ' + l.id + "</a></li>"; }).join("") + "</ul>" : "") + "</li>";
      }).join("") + "</ol></details>";
    }).join("");
    return h + "</section>";
  }
  function notebookPage() { app.innerHTML = '<div class="stack" style="gap:22px">' + notebookSection(unit) + "</div>"; }

  // ---------- mark schemes: visible to everyone ----------
  function msBlock(id, a) {
    var code = a && /\n/.test(a) && /[;{}]\s*$|^ {2,}\S/m.test(a);
    return '<div class="ms-row"><button class="btn sm" data-msb="' + id + '" aria-expanded="false" aria-controls="' + id + '">Show mark scheme</button></div><div class="ms' + (a ? (code ? " ms-code" : "") : " ms-none") + '" id="' + id + '" hidden><b>Mark scheme.</b> ' + (a ? esc(a) : "Mark scheme not available yet.") + "</div>";
  }
  function wireMS(root) {
    root.querySelectorAll("[data-msb]").forEach(function (b) { b.onclick = function () { var m = document.getElementById(b.dataset.msb); m.hidden = !m.hidden; b.textContent = m.hidden ? "Show mark scheme" : "Hide mark scheme"; b.setAttribute("aria-expanded", !m.hidden); }; });
    var all = root.querySelector("#msall");
    if (all) all.onclick = function () {
      var open = all.dataset.o !== "1"; all.dataset.o = open ? "1" : "0"; all.textContent = open ? "Hide all mark schemes" : "Show all mark schemes";
      root.querySelectorAll(".ms").forEach(function (m) { m.hidden = !open; });
      root.querySelectorAll("[data-msb]").forEach(function (b) { b.textContent = open ? "Hide mark scheme" : "Show mark scheme"; b.setAttribute("aria-expanded", open); });
    };
  }

  // ---------- view state ----------
  // The whole site is pupil-facing: no logins, every answer and mark scheme is visible.
  var unit = store.get("unit", UIDS[0]);
  if (UIDS.indexOf(unit) < 0) unit = UIDS[0];
  (function () {
    var seg = document.querySelector('.seg[aria-label="Unit"]');
    if (seg) seg.innerHTML = HUB.units.map(function (x) { return '<button data-unit="' + x.id + '">' + esc(x.short) + "</button>"; }).join("");
    var tag = document.querySelector(".brand small"); if (tag) tag.textContent = HUB.tagline;
    if (C.hub) document.title = "Digital Technology Hub · " + (HUB.short || "");
  })();
  function applyChrome() {
    document.querySelectorAll("[data-unit]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.unit === unit); });
    var nl = document.querySelector('a[data-nav="notebook"]');
    if (nl) {
      var hr = nbHref(unit);
      if (hr) { nl.href = hr; nl.target = "_blank"; nl.rel = "noopener"; nl.title = "Open the " + USHORT[unit] + " revision notebook"; }
      else { nl.href = "#notebook"; nl.removeAttribute("target"); nl.removeAttribute("title"); }
    }
  }
  document.querySelectorAll("[data-unit]").forEach(function (b) {
    b.onclick = function () {
      unit = b.dataset.unit; store.set("unit", unit); applyChrome();
      var id = (location.hash || "#home").slice(1).split("-")[0];
      if (lesson(id) || C.tests.some(function (t) { return t.id === id; }) || C.papers.some(function (p) { return p.id === id; })) location.hash = "unit";
      else route();
    };
  });
  applyChrome();

  // ---------- code blocks + C# runner ----------
  var KW = /\b(using|namespace|class|static|void|public|private|const|return|if|else|for|foreach|in|while|do|switch|case|default|break|continue|new|true|false|null|try|catch|finally|throw|int|double|string|char|bool|var|float|decimal|long|IF|THEN|ELSE|END|WHILE|FOR|TO|NEXT|REPEAT|UNTIL|INPUT|OUTPUT|AND|OR|NOT|DECLARE|DIV|MOD)\b/g;
  var TYPES = /^(Console|Convert|Math|String|Array|File|StreamReader|StreamWriter|List|Random|DateTime|Exception|FormatException|DivideByZeroException|FileNotFoundException|IndexOutOfRangeException)$/;
  function hl(code) {
    var out = "", re = /(\/\/[^\n]*)|(\$?@?"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|([\s\S])/g, m;
    while ((m = re.exec(code))) {
      if (m[1]) out += '<span class="c">' + esc(m[1]) + "</span>";
      else if (m[2]) out += '<span class="s">' + esc(m[2]) + "</span>";
      else if (m[3]) out += '<span class="nu">' + m[3] + "</span>";
      else if (m[4]) { KW.lastIndex = 0; out += KW.test(m[4]) ? '<span class="k">' + m[4] + "</span>" : TYPES.test(m[4]) ? '<span class="ty">' + m[4] + "</span>" : esc(m[4]); KW.lastIndex = 0; }
      else out += esc(m[5]);
    }
    return out;
  }
  var codeStore = [], vfs = {};
  function codeHTML(c, opts) {
    var h = "";
    if (c.vba) { var vi = codeStore.push(c.vba) - 1; h += '<div class="code"><div class="ch"><span>VBA (Microsoft Access)</span><span class="row" style="gap:4px"><button class="btn sm" data-copy="' + vi + '">Copy</button></span></div><pre>' + (window.Tutorials ? Tutorials.hl.vba(c.vba) : esc(c.vba)) + "</pre></div>"; }
    if (c.ps) h += '<div class="code"><div class="ch"><span>Pseudocode</span></div><pre>' + hl(c.ps) + "</pre></div>";
    var cs = c.cs || c.py;
    if (cs) { var i = codeStore.push(cs) - 1; h += '<div class="code" data-ci="' + i + '"><div class="ch"><span>C#</span><span class="row" style="gap:4px"><button class="btn sm" data-copy="' + i + '">Copy</button><button class="btn sm" data-edit="' + i + '">Edit</button><button class="btn sm primary" data-run="' + i + '">Run</button></span></div><pre id="pre-' + i + '">' + hl(cs) + '</pre><textarea class="code-edit" id="ed-' + i + '" spellcheck="false" hidden aria-label="Edit the C# code">' + esc(cs) + '</textarea><div class="out" id="out-' + i + '" hidden></div></div>'; }
    return h;
  }
  function runCs(code, out, onDone) {
    out.hidden = false; out.textContent = "";
    var pending = null;
    function write(t, kind) { if (kind === "in") return; var sp = document.createElement("span"); if (kind === "err") sp.className = "err"; sp.textContent = t; out.appendChild(sp); out.scrollTop = out.scrollHeight; }
    return CSharp.run(code, {
      output: write,
      files: vfs,
      input: function () {
        return new Promise(function (resolve) {
          var inp = document.createElement("input"); inp.type = "text"; inp.setAttribute("aria-label", "Program input");
          out.appendChild(inp); inp.focus();
          inp.onkeydown = function (e) { if (e.key === "Enter") { var v = inp.value; inp.replaceWith(document.createTextNode(v + "\n")); resolve(v); } };
        });
      }
    }).then(function (r) { if (!out.textContent) out.textContent = "(no output)"; if (onDone) onDone(r); return r; });
  }
  function runPy(i) { var ed = document.getElementById("ed-" + i); runCs(ed && !ed.hidden ? ed.value : codeStore[i], document.getElementById("out-" + i)); }
  function wireCode(root) {
    root.querySelectorAll("[data-run]").forEach(function (b) { b.onclick = function () { runPy(+b.dataset.run); }; });
    root.querySelectorAll("[data-copy]").forEach(function (b) { b.onclick = function () { var ed = document.getElementById("ed-" + b.dataset.copy); copy(ed && !ed.hidden ? ed.value : codeStore[+b.dataset.copy], "Code"); }; });
    root.querySelectorAll("[data-edit]").forEach(function (b) { b.onclick = function () {
      var i = b.dataset.edit, ed = document.getElementById("ed-" + i), pre = document.getElementById("pre-" + i);
      if (ed.hidden) { ed.hidden = false; pre.hidden = true; ed.style.height = Math.max(120, pre.offsetHeight || 200) + "px"; ed.focus(); b.textContent = "Done"; }
      else { codeStore[i] = ed.value; pre.innerHTML = hl(ed.value); ed.hidden = true; pre.hidden = false; b.textContent = "Edit"; }
    }; });
    root.querySelectorAll(".code-edit").forEach(function (t) { t.onkeydown = function (e) { if (e.key === "Tab") { e.preventDefault(); var a = t.selectionStart; t.value = t.value.slice(0, a) + "    " + t.value.slice(t.selectionEnd); t.selectionStart = t.selectionEnd = a + 4; } }; });
  }


  // ---------- rail ----------
  function rail(u, current) {
    var h = '<aside class="rail" aria-label="Lessons"><a href="#unit" style="font-weight:700"><span>' + "" + '</span>' + esc(USHORT[u]) + " overview</a>";
    topicsOf(u).forEach(function (t, i) {
      h += "<h4>" + (i + 1) + ". " + esc(t.name) + "</h4>";
      C.lessons.filter(function (l) { return l.t === t.id; }).forEach(function (l) {
        h += '<a href="#' + l.id + '"' + (l.id === current ? ' aria-current="page"' : "") + "><span>" + l.id + "</span>" + esc(l.title) + "</a>";
      });
    });
    return h + "</aside>";
  }

  // ---------- HOME ----------
  function home() {
    var nMS = 0; C.lessons.forEach(function (l) { nMS += l.ws.length; }); C.tests.forEach(function (t) { nMS += t.items.length; }); C.papers.forEach(function (p) { p.qs.forEach(function (q) { nMS += q.parts.length; }); });
    var h = '<div class="stack" style="gap:28px">' + notebookSection();
    h += '<section class="hero"><div class="stack" style="gap:12px"><span class="eyebrow">' + esc(HUB.eyebrow) + " · Revision</span>" +
      "<h1>" + esc(HUB.heroTitle) + "</h1>" +
      '<p class="lead">' + esc(HUB.heroLead) + " Every worksheet, test and practice paper comes with its mark scheme, so you can check your own answers.</p>" +
      '<div class="row">' + HUB.units.map(function (x) { return '<a class="btn primary" href="#unit" data-go="' + x.id + '">' + esc(x.short) + " lessons</a>"; }).join("") + '<a class="btn" href="#assess">Tests and papers</a>' + (C.pastpapers.length ? '<a class="btn" href="#pastpapers">Past-paper map</a>' : "") + (otherHref() ? '<a class="btn" href="' + otherHref() + '" target="_top">' + esc(HUB.other.label) + " →</a>" : "") + '<a class="btn" href="#media">Videos and podcasts</a><a class="btn" href="#flashcards">Make flashcards</a></div></div>' +
      '<div class="facts"><div><b>' + C.lessons.length + '</b><span>Lessons</span></div>' + (C.pastpapers.length ? '<div><b>' + C.pastpapers.length + '</b><span>Past papers mapped</span></div>' : '<div><b>' + C.topics.length + '</b><span>Topics</span></div>') + '<div><b>' + C.gloss.length + '</b><span>' + (C.hub ? "Key terms" : "Mark-scheme terms") + '</span></div>' +
      (Object.keys(C.factfiles).length ? '<div><b>' + Object.keys(C.factfiles).length + '</b><span>CCEA fact files linked</span></div>' : '<div><b>' + C.lessons.length * 2 + '</b><span>Videos and podcasts</span></div>') + '<div><b>' + (C.tests.length + C.papers.length) + '</b><span>Tests and papers</span></div><div><b>' + nMS + "</b><span>Mark schemes</span></div></div></section>";
    h += '<section class="grid2">';
    UIDS.forEach(function (u) {
      var ls = lessonsOf(u);
      h += '<a class="panel unitcard" href="#unit" data-go="' + u + '"><span class="n">' + esc(UKIND[u]) + " · " + ls.length + " lessons</span><h2>" + esc(UNAME[u]) + '</h2><p class="muted">' + UINFO[u] + '</p><p class="small">' + topicsOf(u).map(function (t) { return esc(t.name); }).join(" · ") + "</p></a>";
    });
    h += '</section><section class="hub-cards">' +
      '<a class="panel hub-card" href="#unit"><b>Lessons and topics</b><span>' + C.lessons.length + ' lessons in ' + C.topics.length + ' topics, each topic presentable as one flowing lesson.</span></a>' +
      '<a class="panel hub-card" href="#practice"><b>Practice</b><span>' + Acts.all.filter(function (a) { return !a.auto; }).length + '+ interactive activities, unlimited question generators and coding challenges.</span></a>' +
      '<a class="panel hub-card" href="#quiz"><b>Quiz Zone</b><span>Build a quiz from any topics in practice or timed mode.</span></a>' +
      '<a class="panel hub-card" href="#mindmaps"><b>Mind maps</b><span>Unit and topic maps with hide-and-recall.</span></a>' +
      '<a class="panel hub-card" href="#media"><b>Videos, podcasts and diagrams</b><span>Narrated lessons, revision podcasts and the diagram library.</span></a>' +
      '<a class="panel hub-card" href="#revise"><b>Revise</b><span>Fact files, glossary, flashcards and your weakest spec points.</span></a>' +
      '<a class="panel hub-card" href="#assess"><b>Exams</b><span>Topic tests and practice papers with mark schemes, plus the past-paper map.</span></a>' +
      '<a class="panel hub-card" href="#links"><b>Useful websites</b><span>Checked links for every topic.</span></a>' +
      ((C.tutorials || []).length ? '<a class="panel hub-card" href="#tutorials"><b>Tutorials</b><span>' + C.tutorials.length + " step-by-step tutorials: " + esc((C.tutorialSeries || []).map(function (x) { return x.short || x.name; }).join(", ")) + ".</span></a>" : "") +
      '</section><section class="grid2"><div class="panel stack"><h3>Inside every lesson</h3><ol class="steps"><li><b>Read the notes</b> – opens the lesson\'s pages in your unit revision notebook.</li><li><b>Video</b> – a narrated walk-through of the slides and diagram with captions and a quick check.</li><li><b>Podcast</b> – Aoife and Conor talk through the topic, quiz the key terms and cover the exam angle.</li><li><b>Slides</b> – click through in the browser or download the PowerPoint. ' + esc(USHORT[HUB.prog]) + ' code runs in the page.</li><li><b>Fact file</b> – a one-to-two page summary: diagram, spec, notes, mark-scheme terms, exam focus and check questions. Download it as a PDF.</li><li><b>Activities</b> – sorting, sequencing, spot-the-mistake, practice generators and coding challenges.</li><li><b>Worksheet</b> – key-term match, gap fill and true/false that mark themselves, plus exam-style questions with mark schemes.</li><li><b>Quiz</b> – multiple choice, matching, gap fill and true/false.</li><li><b>Past papers</b> – every past question on this topic, with links to CCEA\'s paper and mark scheme.</li></ol></div>' +
      '<div class="panel stack"><h3>How to revise with this site</h3><ol class="steps"><li>Read the notebook chapter for a lesson.</li><li>Watch the video or listen to the podcast.</li><li>Do the worksheet and quiz without looking, then press <b>Show mark scheme</b> to check each answer.</li><li>Try the topic tests and practice papers under <b>Exams</b>, timed.</li><li>Rate yourself in the <b>Tracker</b> and go back to anything red or amber.</li></ol><p class="muted small">Answers you type, quiz scores and tracker ratings are saved in your own browser only.</p>' +
      '<p class="muted small">Past-paper questions and mark schemes belong to CCEA. This site maps and links to them; notes and definitions are written for this site. <a href="' + C.ccea.pastPage + '" target="_blank" rel="noopener">CCEA past papers</a> · <a href="' + C.ccea.support + '" target="_blank" rel="noopener">CCEA fact files</a> · <a href="' + C.ccea.spec + '" target="_blank" rel="noopener">Specification</a></p></div></section></div>';
    app.innerHTML = h;
    app.querySelectorAll("[data-go]").forEach(function (a) { a.addEventListener("click", function () { unit = a.dataset.go; store.set("unit", unit); applyChrome(); if (location.hash === "#unit") route(); }); });
  }

  // ---------- UNIT ----------
  function unitPage() {
    var u = unit, ls = lessonsOf(u);
    var h = '<div class="stack" style="gap:24px"><div class="stack" style="gap:8px"><span class="eyebrow">' + esc(UKIND[u]) + "</span><h1>" + esc(UNAME[u]) + '</h1><p class="lead">' + UINFO[u] + ". " + ls.length + " lessons across " + topicsOf(u).length + ' topics.</p><div class="row">' + (nbOf(u) ? '<a class="btn primary" href="' + esc(nbHref(u)) + '" target="_blank" rel="noopener">Open the ' + esc(USHORT[u]) + " revision notebook</a>" : "") + '<a class="btn" href="#assess">Tests and practice papers</a><a class="btn" href="#pastpapers">Past-paper map</a><button class="btn" id="wbook">Download printable workbook</button><button class="btn" id="wbookA">Download workbook answers</button></div></div>';
    topicsOf(u).forEach(function (t, i) {
      var tl = C.lessons.filter(function (l) { return l.t === t.id; });
      h += '<section class="stack" style="gap:10px"><div class="row" style="justify-content:space-between;align-items:flex-end"><div><span class="eyebrow">Topic ' + (i + 1) + '</span><h2><a href="#' + t.id + '" class="plain">' + esc(t.name) + '</a></h2><p class="muted small">' + esc(t.spec) + '</p></div><div class="row"><a class="btn sm primary" href="#' + t.id + '">Topic page</a><a class="btn sm" href="#' + t.id + '-present">▶ Present topic</a><a class="btn sm" href="#practice-' + t.id + '">Activities</a><a class="btn sm" href="#quiz-' + t.id + '">Topic quiz</a></div></div><div class="grid">';
      tl.forEach(function (l) {
        var pp = ppFor(l.id).length;
        h += '<a class="panel topic-card" href="#' + l.id + '"><span class="n">' + l.id + (pp ? " · in " + pp + " past-paper question" + (pp > 1 ? "s" : "") : "") + "</span><h3>" + esc(l.title) + '</h3><p class="muted small">' + esc(l.obj[0]) + "</p></a>";
      });
      h += "</div></section>";
    });
    app.innerHTML = h + "</div>";
    document.getElementById("wbook").onclick = function () { saveFile("pdf/" + u + "-workbook.pdf", USHORT[u].replace(" ", "") + "-Workbook.pdf"); };
    document.getElementById("wbookA").onclick = function () { saveFile("pdf/" + u + "-workbook-answers.pdf", USHORT[u].replace(" ", "") + "-Workbook-Answers.pdf"); };
  }

  // ---------- past papers helpers ----------
  function ppFor(id) {
    var out = [];
    C.pastpapers.forEach(function (p) { p.qs.forEach(function (q) { if (q[3].indexOf(id) > -1) out.push({ p: p, q: q }); }); });
    return out;
  }
  function ppLinks(p) {
    var h = [];
    if (p.paper) h.push('<a href="' + p.paper + '" target="_blank" rel="noopener">Paper' + (p.paperNote ? " (" + p.paperNote + ")" : "") + "</a>");
    if (p.ms) h.push('<a href="' + p.ms + '" target="_blank" rel="noopener">Mark scheme</a>');
    if (!p.paper || !p.ms) h.push('<a href="' + C.ccea.pastPage + '" target="_blank" rel="noopener">CCEA past papers</a>');
    return h.join(" · ");
  }

  // ---------- LESSON ----------
  var slideIdx = 0;
  function lessonView(l, tab) {
    var u = unitOf(l);
    if (unit !== u) { unit = u; store.set("unit", u); applyChrome(); }
    Speech.stop();
    var tabs = [["video", "Video"], ["podcast", "Podcast"], ["slides", "Slides"], ["notes", "Fact file"], ["activities", "Activities"], ["worksheet", "Worksheet"], ["quiz", "Quiz"], ["papers", "Past papers"]];
    if (!tabs.some(function (t) { return t[0] === tab; })) tab = null;
    tab = tab || "slides";
    var ls = lessonsOf(u), idx = ls.indexOf(l), prev = ls[idx - 1], next = ls[idx + 1];
    codeStore = [];
    var h = '<div class="cols">' + rail(u, l.id) + '<div class="stack">';
    h += '<div class="stack lv-head" style="gap:8px"><span class="eyebrow">' + USHORT[u] + " · Lesson " + (idx + 1) + " of " + ls.length + " · " + esc(topic(l.t).name) + "</span><h1>" + esc(l.title) + "</h1>" + (nbLesson(l) ? '<a class="btn primary nb-read" href="' + esc(nbLesson(l)) + '" target="_blank" rel="noopener">Read the notes for this lesson →</a>' : "") +
      '<select class="mob-jump" id="mj" aria-label="Jump to lesson">' + ls.map(function (x) { return '<option value="' + x.id + '"' + (x.id === l.id ? " selected" : "") + ">" + x.id + " " + esc(x.title) + "</option>"; }).join("") + "</select></div>";
    var lt = (C.tutorials || []).filter(function (x) { return x.l === l.id; });
    if (lt.length) h += '<div class="panel row tstrip"><b class="small">Step-by-step tutorials for this lesson:</b>' + lt.map(function (x) { var p = Tutorials.progress({ store: store }, x); return '<a class="btn sm" href="#tut-' + x.id + '">' + esc(x.title) + (p.done === p.total ? " ✓" : "") + "</a>"; }).join("") + "</div>";
    h += '<div class="tabs lv-tabs" role="tablist">' + tabs.map(function (t) { return '<button role="tab" aria-selected="' + (t[0] === tab) + '" data-tab="' + t[0] + '">' + t[1] + "</button>"; }).join("") + "</div>";
    h += '<div id="tabbody" class="stack">' + ({ activities: lessonActsHTML, video: videoHTML, podcast: podcastHTML, slides: slidesHTML, notes: notesHTML, worksheet: wsHTML, quiz: quizHTML, papers: lessonPapersHTML })[tab](l) + "</div>";
    h += '<div class="row lv-nav" style="justify-content:space-between;border-top:1px solid var(--line);padding-top:16px">' +
      (prev ? '<a class="btn" href="#' + prev.id + '">← ' + esc(prev.title) + "</a>" : "<span></span>") +
      (next ? '<a class="btn" href="#' + next.id + '">' + esc(next.title) + " →</a>" : '<a class="btn primary" href="#assess">Tests →</a>') + "</div></div></div>";
    app.innerHTML = h;
    app.querySelectorAll("[data-tab]").forEach(function (b) { b.onclick = function () { slideIdx = 0; location.hash = l.id + "-" + b.dataset.tab; }; });
    document.getElementById("mj").onchange = function (e) { location.hash = e.target.value; };
    if (tab === "slides") wireSlides(l);
    if (tab === "worksheet") wireWS(l);
    if (tab === "quiz") wireQuizTab(l);
    if (tab === "activities") wireActs(app);
    if (tab === "video") wireVideo(l);
    if (tab === "podcast") wirePodcast(l);
    if (tab === "notes") {
      wireCode(app); var fb = document.getElementById("toflash"); if (fb) fb.onclick = function () { flashFilter = { lesson: l.id }; location.hash = "glossary"; };
      var dl = document.getElementById("dlff"); if (dl) dl.onclick = function () { saveFile("factfiles/" + l.id + ".pdf", l.id + "-fact-file.pdf", dl); };
    }
  }

  function ffHTML(l) {
    if (!l.ff || !l.ff.length) return "";
    return '<p class="small"><b>CCEA fact file:</b> ' + l.ff.map(function (k) { var f = C.factfiles[k]; return '<a href="' + f[1] + '" target="_blank" rel="noopener">' + esc(f[0]) + "</a>"; }).join(" · ") + "</p>";
  }

  // Slides
  // Each lesson's slides end with interactive extras: a tap-to-answer check and tap-to-flip key terms
  function extraSlides(l) { var x = []; if (l.quiz && l.quiz.length) x.push("check"); if (C.print.lessonTerms(l).length >= 3) x.push("terms"); return x; }
  function slideCount(l) { return l.slides.length + 1 + extraSlides(l).length; }
  function extraHTML(l, kind, i, total) {
    var body = "", head = "";
    if (kind === "check") {
      head = "Quick check";
      body = '<p class="muted small">Tap an answer. You can change your mind.</p>' + l.quiz.slice(0, 3).map(function (q, qi) {
        return '<div class="ichk" data-c="' + q[2] + '"><p><b>' + (qi + 1) + ".</b> " + esc(q[0]) + '</p><div class="iopts">' + q[1].map(function (o, k) { return '<button type="button" class="iopt" data-k="' + k + '"><span>' + "ABCD"[k] + "</span>" + esc(o) + "</button>"; }).join("") + '</div><p class="ifb" aria-live="polite"></p><p class="iwhy" hidden>' + esc(q[3] || "") + "</p></div>";
      }).join("");
    } else {
      head = "Key terms: tap to flip";
      body = '<div class="flips">' + C.print.lessonTerms(l).slice(0, 8).map(function (g) { return '<button type="button" class="flip" aria-pressed="false"><span class="ff">' + esc(g[0]) + '</span><span class="fb">' + esc(g[1]) + "</span></button>"; }).join("") + "</div>";
    }
    return '<div class="slide extra"><div class="sh"><h2>' + head + '</h2><span class="mono">' + (i + 1) + " / " + total + '</span></div><div class="sb">' + body + '</div><div class="sf"><span>' + esc(l.title) + "</span><span>" + l.id + "</span></div></div>";
  }
  // tap-to-answer and tap-to-flip, wired once per container
  function wireInteractive(box) {
    if (box.dataset.iwired) return; box.dataset.iwired = 1;
    box.addEventListener("click", function (e) {
      var o = e.target.closest(".iopt"), f = e.target.closest(".flip");
      if (o) {
        var q = o.closest(".ichk"), ok = +o.dataset.k === +q.dataset.c, fb = q.querySelector(".ifb");
        q.querySelectorAll(".iopt").forEach(function (b) { b.classList.remove("right", "wrong"); });
        o.classList.add(ok ? "right" : "wrong");
        fb.textContent = ok ? "✓ Correct!" : "✗ Not quite – try another answer.";
        fb.className = "ifb " + (ok ? "ok" : "no");
        var why = q.querySelector(".iwhy"); if (why && why.textContent) why.hidden = !ok;
        e.stopPropagation();
      }
      if (f) { f.classList.toggle("on"); f.setAttribute("aria-pressed", f.classList.contains("on")); e.stopPropagation(); }
    });
  }
  // Build steps: bullets, table rows and code appear one tap at a time (like PowerPoint animations)
  function prepSteps(box, showAll) {
    var sb = box.querySelector(".slide:not(.title-slide):not(.extra) .sb");
    var items = sb ? Array.prototype.slice.call(sb.querySelectorAll(":scope > ul > li, :scope > div > ul > li, :scope > .tbl-wrap tbody tr, :scope > div > .tbl-wrap tbody tr, .code")) : [];
    var off = store.get("steps", true) === false || matchMedia("(prefers-reduced-motion: reduce)").matches;
    var n = showAll || off ? items.length : 0;
    items.forEach(function (it, k) { it.classList.add("step"); if (k >= n) it.classList.add("hid"); });
    return {
      left: function () { return items.length - n; },
      next: function () { if (n >= items.length) return false; items[n].classList.remove("hid"); items[n].classList.add("shown"); n++; return true; }
    };
  }
  // swipe left/right and tap-to-advance on touch screens
  function wireGestures(el, next, prev) {
    var x0 = null, y0 = null;
    el.addEventListener("touchstart", function (e) { if (e.touches.length !== 1) return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    el.addEventListener("touchend", function (e) {
      if (x0 === null) return; var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) next(); else prev(); }
    }, { passive: true });
    el.addEventListener("click", function (e) {
      if (e.target.closest("button, a, input, textarea, select, .code, .flip, .iopt, summary")) return;
      if (!e.target.closest(".slide")) return;
      var r = el.getBoundingClientRect(); if (e.clientX - r.left < r.width * 0.25) prev(); else next();
    });
  }
  function slideHTML(l, i) {
    var total = slideCount(l);
    if (i > l.slides.length) return extraHTML(l, extraSlides(l)[i - l.slides.length - 1], i, total);
    if (i === 0) return '<div class="slide title-slide"><div class="sh"><span class="eyebrow" style="color:inherit">' + esc(topic(l.t).name) + '</span><span class="mono">1 / ' + total + '</span></div><div class="sb"><span class="eyebrow">' + USHORT[unitOf(l)] + " · " + l.id + "</span><h2>" + esc(l.title) + "</h2><ul>" + l.obj.map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("") + '</ul></div><div class="sf"><span>' + esc(HUB.qual) + '</span><span>Learning objectives</span></div></div>';
    var s = l.slides[i - 1], text = "", side = "";
    if (s.b) text += "<ul>" + s.b.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>";
    if (s.tbl) text += tableHTML(s.tbl);
    if (s.code) side = codeHTML(s.code);
    var cl = (s.code ? (s.code.cs || s.code.py || s.code.vba || "") : "").split("\n"), split = side && text && cl.length < 16 && Math.max.apply(null, cl.map(function (x) { return x.length; })) <= 44 && !s.tbl;
    var body = split ? "<div>" + text + "</div><div class=\"stack\" style=\"gap:8px\">" + side + "</div>" : text + side;
    return '<div class="slide"><div class="sh"><h2>' + esc(s.h) + '</h2><span class="mono">' + (i + 1) + " / " + total + '</span></div><div class="sb' + (split ? " split" : "") + '">' + body + '</div><div class="sf"><span>' + esc(l.title) + "</span><span>" + l.id + "</span></div></div>";
  }
  function slidesHTML(l) {
    return '<div class="deck" id="deck"><div class="sprog" aria-hidden="true"><i id="sprog"></i></div><div id="slidebox" class="slidebox"></div><div class="deck-ctrl"><button class="btn" id="sp">← Prev</button><button class="btn primary" id="sn">Next →</button><button class="btn" id="sfull">Present full screen</button><label class="small row" style="gap:6px"><input type="checkbox" id="sstep"' + (store.get("steps", true) !== false ? " checked" : "") + '> Reveal points one at a time</label><button class="btn" id="sppt">Download PowerPoint</button><div class="dots" id="sdots"></div></div></div>';
  }
  function wireSlides(l) {
    var total = slideCount(l), steps = null, back = false;
    function fwd() { if (steps && steps.next()) { document.getElementById("sn").disabled = slideIdx === total - 1 && !steps.left(); return; } if (slideIdx < total - 1) { slideIdx++; back = false; draw(); } }
    function bwd() { if (slideIdx > 0) { slideIdx--; back = true; draw(); } }
    function draw() {
      slideIdx = Math.max(0, Math.min(total - 1, slideIdx));
      codeStore = [];
      var box = document.getElementById("slidebox"); box.innerHTML = slideHTML(l, slideIdx); wireCode(box); wireInteractive(box);
      box.firstChild.classList.add(back ? "in-back" : "in");
      steps = prepSteps(box, back);
      var pr = document.getElementById("sprog"); if (pr) pr.style.width = Math.round(100 * (slideIdx + 1) / total) + "%";
      document.getElementById("sdots").innerHTML = Array.from({ length: total }, function (_, i) { return '<button aria-label="Slide ' + (i + 1) + '" aria-current="' + (i === slideIdx) + '" data-s="' + i + '"></button>'; }).join("");
      document.querySelectorAll("[data-s]").forEach(function (b) { b.onclick = function () { slideIdx = +b.dataset.s; draw(); }; });
      document.getElementById("sp").disabled = slideIdx === 0; document.getElementById("sn").disabled = slideIdx === total - 1 && !(steps && steps.left());
    }
    document.getElementById("sp").onclick = bwd;
    document.getElementById("sn").onclick = fwd;
    document.getElementById("sstep").onchange = function (e) { store.set("steps", e.target.checked); back = false; draw(); };
    wireGestures(document.getElementById("slidebox"), fwd, bwd);
    document.getElementById("sppt").onclick = function () { saveDeck(l, document.getElementById("sppt")); };
    document.getElementById("sfull").onclick = function () {
      var d = document.getElementById("deck");
      if (document.fullscreenElement) { document.exitFullscreen().catch(function () {}); return; }
      if (d.requestFullscreen) d.requestFullscreen().catch(function () { toast("Full screen isn't available here – use your browser's full-screen key"); });
      else toast("Full screen isn't available here – use your browser's full-screen key");
    };
    window.onkeydown = function (e) {
      if (!document.getElementById("deck") || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); fwd(); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); bwd(); }
    };
    draw();
  }

  // ---------- Diagrams ----------
  function isDark() { var t = document.documentElement.getAttribute("data-theme"); if (t) return t === "dark"; try { return matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) { return false; } }
  function diagramSVG(id) { return window.Diagrams && Diagrams.has(id) ? Diagrams.svg(id, Diagrams.pal[isDark() ? "dark" : "light"]) : ""; }
  function diagram(id, cap) { var s = diagramSVG(id); return s ? '<figure class="diagram">' + s + "<figcaption>" + esc(cap || Diagrams.caption(id)) + "</figcaption></figure>" : ""; }

  // ---------- Recorded narration (audio/<id>.json timings + mp3) ----------
  var curAudio = null, audioCache = {};
  function loadAudio(id) {
    if ((C.noAudio || []).indexOf(id) > -1) return Promise.resolve(null); // slides rewritten: old recording no longer matches
    if (!audioCache[id]) audioCache[id] = fetch("audio/" + id + ".json").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (t) {
      return { t: t, src: function (kind) { return fetch("audio/" + id + "-" + kind + ".mp3").then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (b) { return URL.createObjectURL(b.type ? b : new Blob([b], { type: "audio/mpeg" })); }); } };
    }).catch(function () { audioCache[id] = null; return null; });
    return audioCache[id];
  }
  function newAudio() { var au = new Audio(); au.preload = "auto"; curAudio = au; return au; }

  // ---------- Speech (device voices) ----------
  var Speech = (function () {
    var synth = null; try { synth = window.speechSynthesis || null; } catch (e) {}
    var voices = [], ready = null;
    function load() {
      if (ready) return ready;
      ready = new Promise(function (res) {
        if (!synth) return res([]);
        var done = false;
        function fin() { if (done) return; done = true; try { voices = synth.getVoices() || []; } catch (e) { voices = []; } res(voices); }
        try { voices = synth.getVoices() || []; } catch (e) {}
        if (voices.length) return fin();
        try { synth.addEventListener("voiceschanged", fin); } catch (e) {}
        setTimeout(fin, 1500);
      });
      return ready;
    }
    function english() { return voices.filter(function (v) { return /^en/i.test(v.lang); }); }
    function ranked() { var gb = english().filter(function (v) { return /GB|IE/i.test(v.lang); }); return gb.concat(english().filter(function (v) { return gb.indexOf(v) < 0; })); }
    function byName(n) { return voices.filter(function (v) { return v.name === n; })[0] || null; }
    function chunks(t) { var out = [], cur = ""; String(t).split(/(?<=[.!?;:])\s+/).forEach(function (p) { if ((cur + " " + p).length > 220 && cur) { out.push(cur); cur = p; } else cur = cur ? cur + " " + p : p; }); if (cur) out.push(cur); return out; }
    var token = 0;
    function say(text, o) {
      o = o || {}; var my = ++token;
      var silent = !synth || o.silent;
      if (silent) return new Promise(function (res) { var ms = Math.max(1500, String(text).split(/\s+/).length * 400 / (o.rate || 1)); setTimeout(function () { res(my === token); }, ms); });
      var parts = chunks(text);
      return new Promise(function (res) {
        var i = 0;
        function next() {
          if (my !== token) return res(false);
          if (i >= parts.length) return res(true);
          var u = new SpeechSynthesisUtterance(parts[i++]);
          if (o.voice) { u.voice = o.voice; u.lang = o.voice.lang; } else u.lang = "en-GB";
          u.rate = o.rate || 1; u.pitch = o.pitch || 1;
          var guard = setTimeout(function () { if (my === token) next(); }, 4000 + u.text.split(/\s+/).length * 700 / (o.rate || 1));
          u.onend = function () { clearTimeout(guard); next(); };
          u.onerror = function () { clearTimeout(guard); res(false); };
          try { synth.speak(u); } catch (e) { clearTimeout(guard); res(false); }
        }
        try { synth.cancel(); } catch (e) {}
        setTimeout(next, 60);
      });
    }
    function stop() { token++; try { if (synth) synth.cancel(); } catch (e) {} if (curAudio) { try { curAudio.pause(); } catch (e) {} curAudio = null; } }
    return { ok: function () { return !!synth; }, load: load, english: english, ranked: ranked, byName: byName, say: say, stop: stop };
  })();
  function voiceOptions(sel) {
    var list = Speech.ranked();
    if (!list.length) return '<option value="">Captions only (no voice found)</option>';
    return list.map(function (v) { return '<option value="' + esc(v.name) + '"' + (v.name === sel ? " selected" : "") + ">" + esc(v.name.replace(/Microsoft |Google /, "")) + " (" + esc(v.lang) + ")</option>"; }).join("") + '<option value="__silent"' + (sel === "__silent" ? " selected" : "") + ">Captions only, no voice</option>";
  }
  function voiceFor(name, idx) {
    if (name === "__silent") return { silent: true };
    var v = name && Speech.byName(name); if (v) return { voice: v };
    var r = Speech.ranked(); return r.length ? { voice: r[Math.min(idx || 0, r.length - 1)] } : { silent: true };
  }

  // ---------- Video lesson ----------
  function videoHTML(l) {
    var mins = C.media.videoMinutes(l);
    return '<div class="player" id="vp"><div class="stage" id="vstage"></div><div class="caption" id="vcap" aria-live="polite"></div><div class="pbar" id="vbar"></div>' +
      '<div class="pctl"><button class="btn sm" id="vprev" aria-label="Previous scene">⏮</button><button class="btn primary" id="vplay">▶ Play</button><button class="btn sm" id="vnext" aria-label="Next scene">⏭</button>' +
      '<span class="mono small muted" id="vpos"></span><span class="grow"></span>' +
      '<label class="small">Speed <select id="vrate"><option value="0.85">0.85×</option><option value="1">1×</option><option value="1.15">1.15×</option><option value="1.3">1.3×</option></select></label>' +
      '<label class="small">Voice <select id="vvoice"></select></label><button class="btn sm" id="vcc" aria-pressed="true">CC</button><button class="btn sm" id="vfull">Full screen</button></div></div>' +
      '<p class="muted small" id="vnote">About ' + mins + ' min. Narrated by your device\'s built-in voice, so it sounds different on each computer. If you hear nothing, choose another voice or use captions only.</p>' +
      '<details class="panel"><summary><b>Transcript</b></summary><div class="stack" id="vtrans" style="margin-top:12px"></div></details>';
  }
  function sceneHTML(l, s) {
    if (s.kind === "title") return slideHTML(l, 0);
    if (s.kind === "slide") return slideHTML(l, s.i + 1);
    if (s.kind === "diagram") return '<div class="slide"><div class="sh"><h2>The big picture</h2><span class="mono">' + l.id + '</span></div><div class="sb diag-sb">' + diagramSVG(l.id) + "</div></div>";
    var q = l.quiz[0];
    if (s.kind === "check") return '<div class="slide"><div class="sh"><h2>Quick check</h2><span class="mono">' + l.id + '</span></div><div class="sb"><p style="font-size:1.15em"><b>' + esc(q[0]) + '</b></p><div class="opts">' + q[1].map(function (o, k) { return '<div class="opt" data-k="' + k + '"><span class="k">' + "ABCD"[k] + "</span><span>" + esc(o) + "</span></div>"; }).join("") + "</div></div></div>";
    return '<div class="slide title-slide"><div class="sh"><h2>Key terms to remember</h2><span class="mono">' + l.id + '</span></div><div class="sb"><div class="kw">' + l.kw.map(function (k) { return '<span class="tag t" style="font-size:.8em">' + esc(k) + "</span>"; }).join("") + '</div><p>Next: <a href="#' + l.id + '-worksheet">worksheet</a> · <a href="#' + l.id + '-quiz">quiz</a> · <a href="#' + l.id + '-podcast">podcast</a></p></div></div>';
  }
  function wireVideo(l) {
    loadAudio(l.id).then(function (A) { if (!document.getElementById("vp")) return; if (A) wireVideoAudio(l, A); else wireVideoSpeech(l); });
  }
  function wireVideoAudio(l, A) {
    var scenes = C.media.video(l), marks = A.t.video, cc = true, cur = -1, curSc = -1;
    var stage = document.getElementById("vstage"), cap = document.getElementById("vcap"), bar = document.getElementById("vbar"), play = document.getElementById("vplay"), rateSel = document.getElementById("vrate");
    document.getElementById("vvoice").parentNode.style.display = "none";
    document.getElementById("vnote").textContent = "About " + Math.max(1, Math.round(marks[marks.length - 1][3] / 60)) + " min, narrated with natural British voices. Space plays or pauses; the arrow keys move between scenes.";
    document.getElementById("vtrans").innerHTML = scenes.map(function (s, i) { return '<div><span class="mono small" style="color:var(--copper)">Scene ' + (i + 1) + "</span><p>" + esc(s.say.join(" ")) + "</p></div>"; }).join("");
    var au = newAudio();
    rateSel.value = String(store.get("rate", 1)); if (!rateSel.value) rateSel.value = "1";
    rateSel.onchange = function () { store.set("rate", +rateSel.value); au.playbackRate = +rateSel.value; };
    play.disabled = true; play.textContent = "Loading…";
    A.src("video").then(function (u) { au.src = u; au.playbackRate = +rateSel.value || 1; play.disabled = false; play.textContent = "▶ Play"; }, function () { play.textContent = "Audio unavailable"; });
    function sceneStart(i) { for (var k = 0; k < marks.length; k++) if (marks[k][0] === i) return marks[k][2]; return 0; }
    function drawBar() {
      bar.innerHTML = scenes.map(function (s, i) { return '<button style="flex:' + s.say.length + '" class="' + (i < curSc ? "done" : i === curSc ? "on" : "") + '" data-sc="' + i + '" aria-label="Scene ' + (i + 1) + '"></button>'; }).join("");
      bar.querySelectorAll("[data-sc]").forEach(function (b) { b.onclick = function () { go(+b.dataset.sc); }; });
      document.getElementById("vpos").textContent = (curSc + 1) + " / " + scenes.length;
    }
    function showScene(i) { if (i === curSc) return; curSc = i; codeStore = []; stage.innerHTML = sceneHTML(l, scenes[i]); wireCode(stage); drawBar(); }
    function reveal() { var q = l.quiz[0]; stage.querySelectorAll(".opt").forEach(function (o) { if (+o.dataset.k === q[2]) o.classList.add("right"); }); }
    function tick() {
      var t = au.currentTime, k = 0;
      for (var j = 0; j < marks.length; j++) { if (marks[j][2] <= t + 0.05) k = j; else break; }
      var m = marks[k]; showScene(m[0]);
      if (k !== cur) { cur = k; var line = scenes[m[0]].say[m[1]]; cap.textContent = cc ? line : ""; if (scenes[m[0]].kind === "check" && /^The answer is/.test(line)) reveal(); }
    }
    au.ontimeupdate = tick; au.onseeked = tick;
    au.onplay = function () { play.textContent = "⏸ Pause"; };
    au.onpause = function () { play.textContent = au.ended ? "↺ Replay" : "▶ Play"; };
    au.onended = function () { play.textContent = "↺ Replay"; cap.textContent = cc ? "End of video." : ""; };
    function go(i) { i = Math.max(0, Math.min(scenes.length - 1, i)); cur = -1; try { au.currentTime = sceneStart(i) + 0.01; } catch (e) {} showScene(i); tick(); }
    play.onclick = function () { if (au.paused) au.play().catch(function () { toast("Press play again to start the audio"); }); else au.pause(); };
    document.getElementById("vprev").onclick = function () { go(curSc - 1); };
    document.getElementById("vnext").onclick = function () { go(curSc + 1); };
    document.getElementById("vcc").onclick = function (e) { cc = !cc; e.target.setAttribute("aria-pressed", cc); cur = -1; if (cc) tick(); else cap.textContent = ""; };
    document.getElementById("vfull").onclick = function () { var d = document.getElementById("vp"); if (document.fullscreenElement) { document.exitFullscreen().catch(function () {}); return; } if (d.requestFullscreen) d.requestFullscreen().catch(function () { toast("Full screen isn't available here"); }); };
    window.onkeydown = function (e) { if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || !document.getElementById("vp")) return; if (e.key === " ") { e.preventDefault(); play.click(); } if (e.key === "ArrowRight") go(curSc + 1); if (e.key === "ArrowLeft") go(curSc - 1); };
    showScene(0); cap.textContent = scenes[0].say[0];
  }
  function wireVideoSpeech(l) {
    var scenes = C.media.video(l), st = { sc: 0, se: 0, playing: false }, tok = 0, cc = true;
    var stage = document.getElementById("vstage"), cap = document.getElementById("vcap"), bar = document.getElementById("vbar"), play = document.getElementById("vplay");
    var rateSel = document.getElementById("vrate"), vSel = document.getElementById("vvoice");
    rateSel.value = String(store.get("rate", 1)); if (!rateSel.value) rateSel.value = "1";
    Speech.load().then(function () { vSel.innerHTML = voiceOptions(store.get("voiceA", "")); });
    vSel.onchange = function () { store.set("voiceA", vSel.value); };
    rateSel.onchange = function () { store.set("rate", +rateSel.value); };
    var total = scenes.reduce(function (a, s) { return a + s.say.length; }, 0);
    document.getElementById("vtrans").innerHTML = scenes.map(function (s, i) { return '<div><span class="mono small" style="color:var(--copper)">Scene ' + (i + 1) + "</span><p>" + esc(s.say.join(" ")) + "</p></div>"; }).join("");
    function drawBar() {
      bar.innerHTML = scenes.map(function (s, i) { return '<button style="flex:' + s.say.length + '" class="' + (i < st.sc ? "done" : i === st.sc ? "on" : "") + '" data-sc="' + i + '" aria-label="Scene ' + (i + 1) + '"></button>'; }).join("");
      bar.querySelectorAll("[data-sc]").forEach(function (b) { b.onclick = function () { go(+b.dataset.sc); }; });
      document.getElementById("vpos").textContent = (st.sc + 1) + " / " + scenes.length;
    }
    function render() { codeStore = []; stage.innerHTML = sceneHTML(l, scenes[st.sc]); wireCode(stage); cap.textContent = cc ? scenes[st.sc].say[0] : ""; drawBar(); }
    function reveal() { var q = l.quiz[0]; stage.querySelectorAll(".opt").forEach(function (o) { if (+o.dataset.k === q[2]) o.classList.add("right"); }); }
    function step() {
      var my = ++tok, sc = scenes[st.sc];
      if (st.se >= sc.say.length) {
        if (st.sc < scenes.length - 1) { st.sc++; st.se = 0; render(); setTimeout(function () { if (my === tok && st.playing) step(); }, 700); }
        else { st.playing = false; play.textContent = "↺ Replay"; cap.textContent = cc ? "End of video." : ""; }
        return;
      }
      var line = sc.say[st.se];
      cap.textContent = cc ? line : "";
      if (sc.kind === "check" && /^The answer is/.test(line)) reveal();
      var v = voiceFor(vSel.value, 0);
      var wait = sc.kind === "check" && /^Pause now/.test(line) ? 3500 : 0;
      Speech.say(line, { voice: v.voice, silent: v.silent, rate: +rateSel.value || 1 }).then(function (ok) {
        if (!ok || my !== tok || !st.playing) return;
        st.se++; setTimeout(function () { if (my === tok && st.playing) step(); }, wait + 150);
      });
    }
    function setPlaying(p) { st.playing = p; play.textContent = p ? "⏸ Pause" : "▶ Play"; if (p) step(); else { tok++; Speech.stop(); } }
    function go(i) { tok++; Speech.stop(); st.sc = Math.max(0, Math.min(scenes.length - 1, i)); st.se = 0; render(); if (st.playing) setTimeout(step, 200); }
    play.onclick = function () { if (!st.playing && st.sc === scenes.length - 1 && st.se >= scenes[st.sc].say.length) { st.sc = 0; st.se = 0; render(); } setPlaying(!st.playing); };
    document.getElementById("vprev").onclick = function () { go(st.sc - 1); };
    document.getElementById("vnext").onclick = function () { go(st.sc + 1); };
    document.getElementById("vcc").onclick = function (e) { cc = !cc; e.target.setAttribute("aria-pressed", cc); cap.textContent = cc ? scenes[st.sc].say[Math.min(st.se, scenes[st.sc].say.length - 1)] : ""; };
    document.getElementById("vfull").onclick = function () { var d = document.getElementById("vp"); if (document.fullscreenElement) { document.exitFullscreen().catch(function () {}); return; } if (d.requestFullscreen) d.requestFullscreen().catch(function () { toast("Full screen isn't available here"); }); };
    window.onkeydown = function (e) { if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || !document.getElementById("vp")) return; if (e.key === " ") { e.preventDefault(); play.click(); } if (e.key === "ArrowRight") go(st.sc + 1); if (e.key === "ArrowLeft") go(st.sc - 1); };
    render();
  }

  // ---------- Podcast ----------
  function podcastHTML(l) {
    var mins = C.media.podcastMinutes(l), H = C.media.hosts;
    return '<div class="panel stack pod"><div class="pod-head"><div class="pod-art" aria-hidden="true"><span>' + l.id + '</span><small>Digital Tech Revision</small></div><div class="stack" style="gap:6px"><span class="eyebrow">Podcast · about ' + mins + ' min</span><h2>' + esc(l.title) + '</h2><p class="muted small">With ' + H[0] + " and " + H[1] + '. Click any line to start from there.</p></div></div>' +
      '<div class="pctl"><button class="btn sm" id="pprev" aria-label="Previous line">⏮</button><button class="btn primary" id="pplay">▶ Play</button><button class="btn sm" id="pnext" aria-label="Next line">⏭</button><span class="mono small muted" id="ppos"></span><span class="grow"></span>' +
      '<label class="small">Speed <select id="prate"><option value="0.85">0.85×</option><option value="1">1×</option><option value="1.15">1.15×</option><option value="1.3">1.3×</option></select></label>' +
      '<label class="small">' + H[0] + ' <select id="pva"></select></label><label class="small">' + H[1] + ' <select id="pvb"></select></label></div>' +
      '<div class="plines" id="plines"></div><div class="row"><button class="btn sm" id="pcopy">Copy transcript</button></div></div>';
  }
  function wirePodcast(l) {
    loadAudio(l.id).then(function (A) { if (!document.getElementById("plines")) return; if (A) wirePodcastAudio(l, A); else wirePodcastSpeech(l); });
  }
  function wirePodcastAudio(l, A) {
    var lines = C.media.podcast(l), H = C.media.hosts, marks = A.t.podcast, cur = -1;
    var box = document.getElementById("plines"), play = document.getElementById("pplay"), rate = document.getElementById("prate");
    document.getElementById("pva").parentNode.style.display = "none"; document.getElementById("pvb").parentNode.style.display = "none";
    var au = newAudio();
    rate.value = String(store.get("rate", 1)); if (!rate.value) rate.value = "1";
    rate.onchange = function () { store.set("rate", +rate.value); au.playbackRate = +rate.value; };
    play.disabled = true; play.textContent = "Loading…";
    A.src("podcast").then(function (u) { au.src = u; au.playbackRate = +rate.value || 1; play.disabled = false; play.textContent = "▶ Play"; }, function () { play.textContent = "Audio unavailable"; });
    box.innerHTML = lines.map(function (x, i) { return '<button class="pl" data-i="' + i + '"><span class="who w' + x.who + '">' + H[x.who].charAt(0) + '</span><span><b>' + H[x.who] + "</b><br>" + esc(x.text) + "</span></button>"; }).join("");
    box.querySelectorAll(".pl").forEach(function (b) { b.onclick = function () { go(+b.dataset.i); if (au.paused) au.play().catch(function () {}); }; });
    function mark(k) {
      if (k === cur) return; cur = k;
      box.querySelectorAll(".pl").forEach(function (b, i) { b.classList.toggle("on", i === k); });
      var on = box.querySelector(".pl.on"); if (on) box.scrollTop = on.offsetTop - box.offsetTop - 60;
      document.getElementById("ppos").textContent = (k + 1) + " / " + lines.length;
    }
    function tick() { var t = au.currentTime, k = 0; for (var j = 0; j < marks.length; j++) { if (marks[j][0] <= t + 0.05) k = j; else break; } mark(k); }
    au.ontimeupdate = tick; au.onseeked = tick;
    au.onplay = function () { play.textContent = "⏸ Pause"; };
    au.onpause = function () { play.textContent = au.ended ? "↺ Replay" : "▶ Play"; };
    function go(i) { i = Math.max(0, Math.min(lines.length - 1, i)); try { au.currentTime = marks[i][0] + 0.01; } catch (e) {} mark(i); }
    play.onclick = function () { if (au.paused) au.play().catch(function () { toast("Press play again to start the audio"); }); else au.pause(); };
    document.getElementById("pprev").onclick = function () { go(cur - 1); };
    document.getElementById("pnext").onclick = function () { go(cur + 1); };
    document.getElementById("pcopy").onclick = function () { copy(lines.map(function (x) { return H[x.who] + ": " + x.text; }).join("\n\n"), "Transcript"); };
    mark(0);
  }
  function wirePodcastSpeech(l) {
    var lines = C.media.podcast(l), H = C.media.hosts, st = { i: 0, playing: false }, tok = 0;
    var box = document.getElementById("plines"), play = document.getElementById("pplay"), va = document.getElementById("pva"), vb = document.getElementById("pvb"), rate = document.getElementById("prate");
    rate.value = String(store.get("rate", 1)); if (!rate.value) rate.value = "1";
    rate.onchange = function () { store.set("rate", +rate.value); };
    Speech.load().then(function () {
      var r = Speech.ranked(), a = store.get("voiceA", ""), b = store.get("voiceB", "");
      if (!b && r.length > 1) b = (r.filter(function (v) { return v.name !== (a || r[0].name); })[0] || {}).name || "";
      va.innerHTML = voiceOptions(a); vb.innerHTML = voiceOptions(b);
    });
    va.onchange = function () { store.set("voiceA", va.value); };
    vb.onchange = function () { store.set("voiceB", vb.value); };
    box.innerHTML = lines.map(function (x, i) { return '<button class="pl" data-i="' + i + '"><span class="who w' + x.who + '">' + H[x.who].charAt(0) + '</span><span><b>' + H[x.who] + "</b><br>" + esc(x.text) + "</span></button>"; }).join("");
    box.querySelectorAll(".pl").forEach(function (b) { b.onclick = function () { go(+b.dataset.i, true); }; });
    function mark() {
      box.querySelectorAll(".pl").forEach(function (b, i) { b.classList.toggle("on", i === st.i); });
      var on = box.querySelector(".pl.on"); if (on) box.scrollTop = on.offsetTop - box.offsetTop - 60;
      document.getElementById("ppos").textContent = (st.i + 1) + " / " + lines.length;
    }
    function step() {
      var my = ++tok; if (st.i >= lines.length) { st.playing = false; play.textContent = "↺ Replay"; st.i = lines.length - 1; mark(); return; }
      mark(); var x = lines[st.i], v = voiceFor(x.who ? vb.value : va.value, x.who);
      var same = va.value === vb.value || (!va.value && !vb.value);
      Speech.say(x.text, { voice: v.voice, silent: v.silent, rate: +rate.value || 1, pitch: same ? (x.who ? 0.85 : 1.15) : 1 }).then(function (ok) {
        if (!ok || my !== tok || !st.playing) return;
        st.i++; setTimeout(function () { if (my === tok && st.playing) step(); }, (x.pause || 0) * 1000 + 250);
      });
    }
    function go(i, start) { tok++; Speech.stop(); st.i = Math.max(0, Math.min(lines.length - 1, i)); mark(); if (start && !st.playing) { st.playing = true; play.textContent = "⏸ Pause"; } if (st.playing) setTimeout(step, 200); }
    play.onclick = function () { if (st.playing) { st.playing = false; tok++; Speech.stop(); play.textContent = "▶ Play"; } else { if (play.textContent.indexOf("Replay") > -1) st.i = 0; st.playing = true; play.textContent = "⏸ Pause"; step(); } };
    document.getElementById("pprev").onclick = function () { go(st.i - 1); };
    document.getElementById("pnext").onclick = function () { go(st.i + 1); };
    document.getElementById("pcopy").onclick = function () { copy(lines.map(function (x) { return H[x.who] + ": " + x.text; }).join("\n\n"), "Transcript"); };
    mark();
  }

  // ---------- Fact file ----------
  function notesHTML(l) {
    var terms = C.print.lessonTerms(l), notes = (l.notes || []).filter(function (n) { return !/exam/i.test(n.h); }), exam = (l.notes || []).filter(function (n) { return /exam/i.test(n.h); })[0], pp = ppFor(l.id);
    var h = '<div class="panel stack factfile"><div class="sheet-head"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><span class="eyebrow">Fact file · ' + USHORT[unitOf(l)] + " · " + l.id + '</span><h2 style="margin-top:4px">' + esc(l.title) + '</h2></div><div class="row"><button class="btn sm" id="dlff">Download fact file (PDF)</button>' + (terms.length ? '<button class="btn sm" id="toflash">Revise as flashcards</button>' : "") + '</div></div></div>';
    if (nbLesson(l)) h += '<p class="nb-line">This fact file is a summary. <a href="' + esc(nbLesson(l)) + '" target="_blank" rel="noopener"><b>Read the full notes for this lesson in the ' + esc(USHORT[unitOf(l)]) + " revision notebook →</b></a></p>";
    h += '<div class="ff-top"><div class="stack" style="gap:10px"><h3>Specification</h3><ul class="spec-list small">' + l.spec.map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("") + "</ul>" + ffHTML(l) + "</div>" + diagram(l.id) + "</div>";
    h += '<div class="ff-body">';
    notes.forEach(function (n) { h += '<section class="stack" style="gap:6px"><h3>' + esc(n.h) + "</h3><p>" + esc(n.p) + "</p></section>"; });
    h += "</div>";
    if (terms.length) h += '<div class="stack" style="gap:8px"><h3>Key terms from the mark schemes</h3><div class="ff-terms">' + terms.map(function (g) { return "<div><b>" + esc(g[0]) + "</b><span>" + esc(g[1]) + "</span>" + (g[3] ? '<small class="mono">Credited: ' + esc(g[3]) + "</small>" : "") + "</div>"; }).join("") + "</div></div>";
    var codes = l.slides.filter(function (s) { return s.code && (s.code.cs || s.code.py || s.code.vba); });
    if (codes.length) h += '<div class="stack" style="gap:8px"><h3>' + (codes.some(function (s) { return s.code.vba; }) ? "Code" : "Code to try") + '</h3>' + codes.map(function (s) { return '<p class="muted small">' + esc(s.h) + "</p>" + codeHTML(s.code.vba ? { vba: s.code.vba } : { cs: s.code.cs || s.code.py }); }).join("") + "</div>";
    h += '<div class="ff-exam stack" style="gap:8px"><h3>Exam focus</h3>' + (exam ? "<p>" + esc(exam.p) + "</p>" : "") + (pp.length ? '<div class="tbl-wrap"><table><thead><tr><th>Paper</th><th>Q</th><th>Marks</th><th>What it tested</th></tr></thead><tbody>' + pp.slice(-5).reverse().map(function (x) { return '<tr><td class="num">' + USHORT[x.p.u] + " " + x.p.y + '</td><td class="num mono">' + esc(x.q[0]) + '</td><td class="num">' + x.q[1] + "</td><td>" + esc(x.q[2]) + "</td></tr>"; }).join("") + '</tbody></table></div><p class="small"><a href="#' + l.id + '-papers">All past-paper questions for this lesson →</a></p>' : "") + "</div>";
    h += '<div class="stack" style="gap:8px"><h3>Check yourself</h3>' + l.ws.slice(0, 3).map(function (w, i) { return '<details class="ff-q"><summary>' + (i + 1) + ". " + esc(w.q) + ' <span class="marks">[' + w.m + "]</span></summary>" + "<div class=\"ms\"><b>Mark scheme.</b> " + (w.a ? esc(w.a) : "Mark scheme not available yet.") + "</div>" + "</details>"; }).join("") + "</div>";
    return h + "</div>";
  }

  // ---------- Media library ----------
  function mediaPage() {
    var u = unit, h = '<div class="stack"><span class="eyebrow">' + USHORT[u] + '</span><h1>Videos, podcasts and images</h1><p class="lead">Every lesson has a narrated video lesson and a two-host revision podcast, with captions and a full transcript. Some are recorded with natural British voices; the rest are read by your device\'s built-in voice.</p>';
    var tv = 0, tp = 0;
    topicsOf(u).forEach(function (t, i) {
      h += '<section class="panel stack"><h3>' + (i + 1) + ". " + esc(t.name) + '</h3><div class="media-list">';
      C.lessons.filter(function (l) { return l.t === t.id; }).forEach(function (l) {
        var vm = C.media.videoMinutes(l), pm = C.media.podcastMinutes(l); tv += vm; tp += pm;
        h += '<div class="media-row"><span class="mono small muted">' + l.id + '</span><span class="grow">' + esc(l.title) + '</span><a class="btn sm" href="#' + l.id + '-video">▶ Video · ' + vm + ' min</a><a class="btn sm" href="#' + l.id + '-podcast">🎧 Podcast · ' + pm + " min</a></div>";
      });
      h += "</div></section>";
    });
    h += '<p class="muted small">' + USHORT[u] + ": about " + tv + " minutes of video and " + tp + " minutes of podcast.</p>";
    h += '<section class="stack" id="images"><h2>Diagram library</h2><p class="muted">One diagram per lesson, also used in the fact files, worksheets and PowerPoints. Download any as a PNG for your own revision notes.</p><div class="dgrid">' +
      lessonsOf(u).filter(function (l) { return window.Diagrams && Diagrams.has(l.id); }).map(function (l) { return '<figure class="diagram">' + diagramSVG(l.id) + '<figcaption><b class="mono">' + l.id + "</b> " + esc(Diagrams.caption(l.id)) + '</figcaption><div class="row"><button class="btn sm" data-png="' + l.id + '">Download PNG</button><a class="btn sm" href="#' + l.id + '-notes">Fact file</a></div></figure>'; }).join("") + "</div></section>";
    h += '<section class="panel stack"><h3>Printable packs</h3><div class="row"><button class="btn sm" data-pdf="factfiles/' + u + '-factfiles.pdf">All ' + USHORT[u] + ' fact files (PDF)</button><button class="btn sm" data-pdf="pdf/' + u + '-workbook.pdf">Workbook (PDF)</button><button class="btn sm" data-pdf="pdf/' + u + '-workbook-answers.pdf">Workbook answers (PDF)</button><button class="btn sm" data-pdf="pdf/' + u + '-flashcards.pdf">Flashcards (PDF)</button></div></section>';
    app.innerHTML = h + "</div>";
    app.querySelectorAll("[data-png]").forEach(function (b) { b.onclick = function () { saveFile("diagrams/" + b.dataset.png + ".png", b.dataset.png + "-diagram.png"); }; });
    app.querySelectorAll("[data-pdf]").forEach(function (b) { b.onclick = function () { saveFile(b.dataset.pdf, b.dataset.pdf.split("/")[1]); }; });
  }

  // ---------- Search ----------
  var lastQuery = "";
  function searchPage() {
    app.innerHTML = '<div class="stack"><span class="eyebrow">' + esc(UALL) + '</span><h1>Search</h1><input type="search" id="sq" placeholder="Try VLOOKUP, overflow, phishing, bubble sort…" aria-label="Search everything" style="font-size:1.1rem;padding:12px 16px"><div id="sres" class="stack"></div></div>';
    var inp = document.getElementById("sq"); inp.value = lastQuery; inp.focus();
    function run() {
      var q = inp.value.trim().toLowerCase(); lastQuery = inp.value; var out = document.getElementById("sres");
      if (q.length < 2) { out.innerHTML = '<p class="muted">Type at least two letters.</p>'; return; }
      var ls = C.lessons.map(function (l) {
        var hay = [l.title, l.kw.join(" "), (l.notes || []).map(function (n) { return n.p; }).join(" "), l.slides.map(function (s) { return s.h + " " + (s.b || []).join(" "); }).join(" ")].join(" ").toLowerCase();
        var score = (l.title.toLowerCase().indexOf(q) > -1 ? 10 : 0) + (l.kw.join(" ").toLowerCase().indexOf(q) > -1 ? 5 : 0) + (hay.split(q).length - 1);
        return { l: l, s: score };
      }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 12);
      var gs = C.gloss.filter(function (g) { return (g[0] + " " + g[1]).toLowerCase().indexOf(q) > -1; }).slice(0, 12);
      var pps = []; C.pastpapers.forEach(function (p) { p.qs.forEach(function (x) { if (x[2].toLowerCase().indexOf(q) > -1) pps.push([p, x]); }); });
      var h = "";
      h += '<section class="panel stack"><h3>Lessons (' + ls.length + ")</h3>" + (ls.length ? ls.map(function (x) { return '<div class="media-row"><span class="mono small muted">' + x.l.id + '</span><a class="grow" href="#' + x.l.id + '-notes">' + esc(x.l.title) + '</a><a class="btn sm" href="#' + x.l.id + '-video">Video</a><a class="btn sm" href="#' + x.l.id + '-podcast">Podcast</a><a class="btn sm" href="#' + x.l.id + '-worksheet">Worksheet</a></div>'; }).join("") : '<p class="muted">No lessons match.</p>') + "</section>";
      h += '<section class="panel stack"><h3>Key terms (' + gs.length + ")</h3>" + (gs.length ? '<div class="gl">' + gs.map(function (g) { return "<div><b>" + esc(g[0]) + '</b><p class="small">' + esc(g[1]) + '</p><a class="small" href="#' + g[2] + '-notes">' + g[2] + "</a></div>"; }).join("") + "</div>" : '<p class="muted">No terms match.</p>') + "</section>";
      h += '<section class="panel stack"><h3>Past-paper questions (' + pps.length + ")</h3>" + (pps.length ? '<div class="tbl-wrap"><table><tbody>' + pps.slice(0, 15).map(function (x) { return '<tr><td class="num">' + USHORT[x[0].u] + " " + x[0].y + '</td><td class="num mono">Q' + esc(x[1][0]) + "</td><td>" + esc(x[1][2]) + '</td><td class="small">' + x[1][3].map(function (id) { return '<a href="#' + id + '-papers">' + id + "</a>"; }).join(" ") + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="muted">No past-paper questions match.</p>') + "</section>";
      out.innerHTML = h;
    }
    inp.oninput = run; run();
  }

  // Worksheet (interactive, designed)
  function wsHTML(l) {
    var ms = C.print.matchSet(l), letters = "ABCDEF", defs = C.print.shuffle(ms, l.id), cz = C.print.clozeParts(l.cloze || ""), bank = C.print.shuffle(cz.answers, l.id + "b");
    var wsm = l.ws.reduce(function (a, b) { return a + b.m; }, 0), auto = ms.length + cz.answers.length + (l.tf || []).length;
    var h = '<div class="panel stack"><div class="sheet-head"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><span class="eyebrow">' + USHORT[unitOf(l)] + " · " + l.id + ' worksheet</span><h2 style="margin-top:4px">' + esc(l.title) + '</h2></div><div class="row"><button class="btn sm" id="dlws">Download printable</button><button class="btn sm" id="dlwsa">Download with answers</button></div></div><p class="small"><b>I can:</b> ' + l.obj.map(esc).join(" · ") + "</p></div>";
    h += '<div style="max-width:560px">' + diagram(l.id, "Use this diagram to help you: " + (window.Diagrams ? Diagrams.caption(l.id) : "")) + "</div>";
    if (ms.length >= 3) {
      h += '<div class="secthead"><span class="l">A</span><h3>Key terms</h3><span class="m">' + ms.length + ' marks · auto-marked</span></div><div class="wm">';
      ms.forEach(function (m, i) {
        h += '<label class="row" style="gap:8px"><select data-wm="' + i + '" data-ans="' + letters[defs.indexOf(m)] + '" aria-label="Definition for ' + esc(m[0]) + '"><option value="">–</option>' + letters.slice(0, ms.length).split("").map(function (x) { return "<option>" + x + "</option>"; }).join("") + "</select><b>" + esc(m[0]) + '</b></label><div class="d small"><b>' + letters[i] + "</b>" + esc(defs[i][1]) + "</div>";
      });
      h += "</div>";
    }
    if (cz.answers.length) {
      h += '<div class="secthead"><span class="l">B</span><h3>Fill the gaps</h3><span class="m">' + cz.answers.length + ' marks · auto-marked</span></div><div class="bank">' + bank.map(function (b) { return "<span>" + esc(b) + "</span>"; }).join("") + '</div><p class="cloze-line">' +
        esc(cz.text).replace(/\u0000(\d+)\u0000/g, function (_, i) { return '<input data-cz="' + i + '" aria-label="Gap ' + (+i + 1) + '" autocomplete="off">'; }) + "</p>";
    }
    if (l.tf && l.tf.length) {
      h += '<div class="secthead"><span class="l">C</span><h3>True or false?</h3><span class="m">' + l.tf.length + ' marks · auto-marked</span></div><div>' + l.tf.map(function (s, i) {
        return '<div class="tfrow"><span>' + esc(s[0]) + '</span><div class="chips" data-tf="' + i + '"><button data-v="1">True</button><button data-v="0">False</button></div></div>';
      }).join("") + "</div>";
    }
    h += '<div class="score" id="wsscore"><b>– / ' + auto + '</b><span class="muted">Sections A–C</span><button class="btn primary" id="wscheck" style="margin-left:auto">Check A–C</button><button class="btn" id="wsreset">Clear</button></div>';
    h += '<div class="secthead"><span class="l">D</span><h3>Exam-style questions</h3><span class="m">' + wsm + ' marks · mark schemes below</span></div><div><button class="btn sm" id="msall">Show all mark schemes</button></div>';
    l.ws.forEach(function (w, i) {
      h += '<div class="q"><div class="q-head"><span class="q-num">' + (i + 1) + '</span><div class="q-text">' + esc(w.q) + '</div><span class="marks">[' + w.m + "]</span></div>" +
        '<textarea id="ws-' + l.id + "-" + i + '" aria-label="Answer to question ' + (i + 1) + '"' + (w.m >= 6 ? ' style="min-height:170px"' : "") + "></textarea>" +
        msBlock("ms-" + i, w.a) + "</div>";
    });
    return h + "</div>";
  }
  function wireWS(l) {
    var key = "ws." + l.id, saved = store.get(key, {});
    var cz = C.print.clozeParts(l.cloze || "");
    l.ws.forEach(function (_, i) { var t = document.getElementById("ws-" + l.id + "-" + i); t.value = saved[i] || ""; t.oninput = function () { saved[i] = t.value; store.set(key, saved); }; });
    app.querySelectorAll("[data-wm]").forEach(function (s) { s.value = saved["m" + s.dataset.wm] || ""; s.onchange = function () { saved["m" + s.dataset.wm] = s.value; store.set(key, saved); s.style.borderColor = ""; }; });
    app.querySelectorAll("[data-cz]").forEach(function (inp) { inp.value = saved["c" + inp.dataset.cz] || ""; inp.oninput = function () { saved["c" + inp.dataset.cz] = inp.value; store.set(key, saved); inp.className = ""; }; });
    app.querySelectorAll("[data-tf]").forEach(function (g) {
      var i = g.dataset.tf;
      g.querySelectorAll("button").forEach(function (b) {
        b.setAttribute("aria-pressed", saved["t" + i] === b.dataset.v);
        b.onclick = function () { saved["t" + i] = b.dataset.v; store.set(key, saved); g.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b); x.className = ""; }); };
      });
    });
    document.getElementById("wscheck").onclick = function () {
      var got = 0, tot = 0;
      app.querySelectorAll("[data-wm]").forEach(function (s) { tot++; var ok = s.value === s.dataset.ans; if (ok) got++; s.style.borderColor = ok ? "var(--ok)" : "var(--bad)"; });
      app.querySelectorAll("[data-cz]").forEach(function (inp) { tot++; var a = cz.answers[+inp.dataset.cz], ok = norm(inp.value) === norm(a); if (ok) got++; inp.className = ok ? "r" : "w"; if (!ok) inp.title = "Answer: " + a; });
      app.querySelectorAll("[data-tf]").forEach(function (g) {
        tot++; var right = l.tf[+g.dataset.tf][1] ? "1" : "0", picked = saved["t" + g.dataset.tf];
        if (picked === right) got++;
        g.querySelectorAll("button").forEach(function (b) { b.className = b.dataset.v === right ? "r" : (b.dataset.v === picked ? "w" : ""); });
      });
      document.querySelector("#wsscore b").textContent = got + " / " + tot;
      document.querySelector("#wsscore .muted").textContent = got === tot ? "All correct" : "Red items are wrong – gaps show the answer when you hover or long-press";
    };
    document.getElementById("wsreset").onclick = function () {
      Object.keys(saved).forEach(function (k) { if (/^[mct]/.test(k)) delete saved[k]; }); store.set(key, saved); lessonView(l, "worksheet");
    };
    wireMS(app);
    document.getElementById("dlws").onclick = function () { save(l.id + "-worksheet.html", C.print.worksheet([l], { screen: true })); };
    document.getElementById("dlwsa").onclick = function () { save(l.id + "-worksheet-answers.html", C.print.worksheet([l], { answers: true, screen: true })); };
  }

  // Quiz tab
  var quizMode = "mcq";
  function quizHTML() {
    return '<div class="panel stack"><div class="chips" role="group" aria-label="Quiz type">' +
      [["mcq", "Multiple choice"], ["match", "Match the terms"], ["cloze", "Gap fill"], ["tf", "True or false"]].map(function (m) { return '<button data-qm="' + m[0] + '" aria-pressed="' + (quizMode === m[0]) + '">' + m[1] + "</button>"; }).join("") + '</div><div id="qbox"></div></div>';
  }
  function wireQuizTab(l) {
    app.querySelectorAll("[data-qm]").forEach(function (b) { b.onclick = function () { quizMode = b.dataset.qm; app.querySelectorAll("[data-qm]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); drawQuiz(l); }; });
    drawQuiz(l);
  }
  function drawQuiz(l) {
    var box = document.getElementById("qbox");
    if (quizMode === "mcq") mcqGame(box, l.quiz.map(function (q) { return { q: q[0], o: q[1], c: q[2], e: q[3], m: 1 }; }), "quiz." + l.id);
    else if (quizMode === "match") matchGame(box, C.print.matchSet(l));
    else if (quizMode === "cloze") clozeGame(box, l.cloze || "");
    else tfGame(box, l.tf || []);
  }
  function mcqGame(box, qs, key) {
    var ans = {};
    function draw() {
      var got = 0, done = 0, tot = 0;
      qs.forEach(function (q, i) { tot += q.m; if (ans[i] != null) { done++; if (ans[i] === q.c) got += q.m; } });
      var h = '<div class="score"><b>' + got + " / " + tot + '</b><span class="muted">' + (done < qs.length ? "Answered " + done + " of " + qs.length : (got === tot ? "Full marks." : "Read the explanations, then try again.")) + '</span><button class="btn" id="qreset" style="margin-left:auto">Try again</button></div>';
      qs.forEach(function (q, i) {
        var a = ans[i];
        h += '<div class="q"><div class="q-head"><span class="q-num">' + (i + 1) + '</span><div class="q-text">' + esc(q.q) + '</div></div><div class="opts">' +
          q.o.map(function (o, k) { var cls = a == null ? "" : (k === q.c ? " right" : (k === a ? " wrong" : "")); return '<button class="opt' + cls + '" data-q="' + i + '" data-k="' + k + '"' + (a != null ? " disabled" : "") + '><span class="k">' + "ABCD"[k] + "</span><span>" + esc(o) + "</span></button>"; }).join("") + "</div>" +
          (a != null ? '<p class="fb ' + (a === q.c ? "r" : "w") + '">' + (a === q.c ? "Correct. " : "Not quite – the answer is " + "ABCD"[q.c] + ". ") + esc(q.e || "") + "</p>" : "") + "</div>";
      });
      box.innerHTML = h;
      box.querySelectorAll(".opt").forEach(function (b) { b.onclick = function () { ans[+b.dataset.q] = +b.dataset.k; draw(); }; });
      box.querySelector("#qreset").onclick = function () { ans = {}; draw(); };
    }
    draw();
  }
  function matchGame(box, pairs) {
    if (pairs.length < 3) { box.innerHTML = '<p class="muted">Not enough key terms for a matching game in this lesson.</p>'; return; }
    var terms = shuffle(pairs), defs = shuffle(pairs), sel = null, done = {}, misses = 0;
    function draw() {
      var n = Object.keys(done).length;
      var h = '<div class="score"><b>' + n + " / " + pairs.length + '</b><span class="muted">' + (n === pairs.length ? "All matched with " + misses + " mistake" + (misses === 1 ? "" : "s") + "." : "Pick a term, then its definition. Mistakes: " + misses) + '</span><button class="btn" id="mreset" style="margin-left:auto">Shuffle</button></div><div class="matchgame"><div class="col">' +
        terms.map(function (p) { var d = done[p[0]]; return '<button class="mg' + (d ? " done" : "") + (sel === p[0] ? " sel" : "") + '" data-t="' + esc(p[0]) + '"' + (d ? " disabled" : "") + "><b>" + esc(p[0]) + "</b></button>"; }).join("") + '</div><div class="col">' +
        defs.map(function (p) { var d = done[p[0]]; return '<button class="mg' + (d ? " done" : "") + '" data-d="' + esc(p[0]) + '"' + (d ? " disabled" : "") + ">" + esc(p[1]) + "</button>"; }).join("") + "</div></div>";
      box.innerHTML = h;
      box.querySelectorAll("[data-t]").forEach(function (b) { b.onclick = function () { sel = b.dataset.t; draw(); }; });
      box.querySelectorAll("[data-d]").forEach(function (b) {
        b.onclick = function () {
          if (!sel) { toast("Choose a term first"); return; }
          if (b.dataset.d === sel) { done[sel] = true; sel = null; draw(); }
          else { misses++; b.classList.add("no"); setTimeout(function () { draw(); }, 450); }
        };
      });
      box.querySelector("#mreset").onclick = function () { matchGame(box, pairs); };
    }
    draw();
  }
  function clozeGame(box, text) {
    var cz = C.print.clozeParts(text);
    if (!cz.answers.length) { box.innerHTML = '<p class="muted">No gap fill for this lesson.</p>'; return; }
    box.innerHTML = '<div class="bank">' + shuffle(cz.answers).map(function (b) { return "<span>" + esc(b) + "</span>"; }).join("") + '</div><p class="cloze-line">' +
      esc(cz.text).replace(/\u0000(\d+)\u0000/g, function (_, i) { return '<input data-g="' + i + '" aria-label="Gap ' + (+i + 1) + '" autocomplete="off">'; }) + '</p><div class="score"><b id="gsc">– / ' + cz.answers.length + '</b><button class="btn primary" id="gchk" style="margin-left:auto">Check</button><button class="btn" id="gshow">Show answers</button></div>';
    box.querySelector("#gchk").onclick = function () {
      var got = 0; box.querySelectorAll("[data-g]").forEach(function (i) { var ok = norm(i.value) === norm(cz.answers[+i.dataset.g]); i.className = ok ? "r" : "w"; if (ok) got++; });
      box.querySelector("#gsc").textContent = got + " / " + cz.answers.length;
    };
    box.querySelector("#gshow").onclick = function () { box.querySelectorAll("[data-g]").forEach(function (i) { i.value = cz.answers[+i.dataset.g]; i.className = "r"; }); };
  }
  function tfGame(box, items) {
    if (!items.length) { box.innerHTML = '<p class="muted">No true/false items for this lesson.</p>'; return; }
    var ans = {};
    function draw() {
      var got = 0, n = 0; items.forEach(function (s, i) { if (ans[i] != null) { n++; if (ans[i] === s[1]) got++; } });
      box.innerHTML = '<div class="score"><b>' + got + " / " + items.length + '</b><span class="muted">' + (n < items.length ? "Answered " + n + " of " + items.length : "Done.") + '</span><button class="btn" id="treset" style="margin-left:auto">Try again</button></div>' +
        items.map(function (s, i) {
          var a = ans[i];
          return '<div class="tfrow"><span>' + esc(s[0]) + (a != null && s[2] ? '<br><span class="small ' + (a === s[1] ? "fb r" : "fb w") + '">' + esc(s[2]) + "</span>" : "") + '</span><div class="chips">' +
            [true, false].map(function (v) { var cls = a == null ? "" : (v === s[1] ? "r" : (v === a ? "w" : "")); return '<button class="' + cls + '" data-i="' + i + '" data-v="' + v + '"' + (a != null ? " disabled" : "") + ">" + (v ? "True" : "False") + "</button>"; }).join("") + "</div></div>";
        }).join("");
      box.querySelectorAll("[data-i]").forEach(function (b) { b.onclick = function () { ans[+b.dataset.i] = b.dataset.v === "true"; draw(); }; });
      box.querySelector("#treset").onclick = function () { ans = {}; draw(); };
    }
    draw();
  }

  function lessonPapersHTML(l) {
    var pp = ppFor(l.id);
    var h = '<div class="panel stack"><h3>Past-paper questions on this lesson</h3><p class="muted small">Question summaries are written for this site; marks are as shown on the mark scheme. Open CCEA\'s paper and mark scheme to set the real question.</p>';
    if (!pp.length) return h + '<p>No past-paper question has focused on this lesson yet. It can still be examined.</p></div>';
    h += '<div class="tbl-wrap"><table><thead><tr><th>Paper</th><th>Question</th><th>Marks</th><th>What it tested</th><th>CCEA documents</th></tr></thead><tbody>' +
      pp.map(function (x) { return '<tr><td class="num">' + USHORT[x.p.u] + " " + x.p.y + '</td><td class="num mono">Q' + esc(x.q[0]) + '</td><td class="num">' + x.q[1] + "</td><td>" + esc(x.q[2]) + '</td><td class="small">' + ppLinks(x.p) + "</td></tr>"; }).join("") + "</tbody></table></div></div>";
    var report = '<div class="panel stack"><h3>Examiner advice</h3><p class="small">Chief Examiner\'s reports explain where candidates lost marks. The notes and slides for this lesson include the advice relevant to it. <a href="' + C.ccea.report2025 + '" target="_blank" rel="noopener">Read the 2025 report</a>.</p></div>';
    return h + "</div>" + report;
  }

  // ---------- ASSESSMENTS ----------
  function assess() {
    var u = unit;
    var h = '<div class="stack"><span class="eyebrow">' + USHORT[u] + '</span><h1>Tests and practice papers</h1><p class="lead">Multiple-choice and matching questions mark themselves. Type your written answers in place, then press <b>Show mark scheme</b> under each question to mark your own work.</p>';
    var pps = C.papers.filter(function (p) { return p.u === u; });
    if (pps.length) h += '<h2>Practice papers</h2><div class="grid">' + pps.map(function (p) {
      var m = p.qs.reduce(function (s, q) { return s + q.parts.reduce(function (a, b) { return a + b.m; }, 0); }, 0);
      return '<a class="panel topic-card" href="#' + p.id + '"><span class="n">' + minsText(p.mins) + " · " + m + " marks · " + p.qs.length + " questions</span><h3>" + esc(p.title) + '</h3><p class="muted small">' + esc(p.note) + "</p></a>";
    }).join("") + "</div>";
    h += '<h2>Topic tests</h2><div class="grid">' + C.tests.filter(function (t) { return t.u === u; }).map(function (t) {
      return '<a class="panel topic-card" href="#' + t.id + '"><span class="n">' + t.mins + " min · " + t.items.reduce(function (a, b) { return a + b.m; }, 0) + " marks</span><h3>" + esc(t.title.split(": ").slice(1).join(": ")) + '</h3><p class="muted small">' + esc(t.title.split(":")[0]) + "</p></a>";
    }).join("") + "</div>";
    h += '<div class="panel stack"><h3>Quality of written communication (QWC) levels</h3><p class="muted small">Used for the extended (' + (C.hub ? "QWC" : "6-mark") + ') questions. Use them to mark your own extended answers or a friend\'s.</p>' + tableHTML([["Level", "Marks", "Descriptor"]].concat(C.qwc)) + "</div></div>";
    app.innerHTML = h;
  }
  function writtenQ(num, text, m, ans, key) {
    return '<div class="q"><div class="q-head"><span class="q-num">' + num + '</span><div class="q-text">' + esc(text) + '</div><span class="marks">[' + m + "]</span></div>" +
      '<textarea data-key="' + key + '" aria-label="Answer ' + num + '"' + (m >= 6 ? ' style="min-height:180px"' : "") + "></textarea>" +
      msBlock("msk-" + key, ans) + "</div>";
  }
  function mcqQ(num, text, m, o, c, key, ans) {
    return '<div class="q" data-mcq="' + key + '" data-c="' + c + '" data-m="' + m + '"><div class="q-head"><span class="q-num">' + num + '</span><div class="q-text">' + esc(text) + '</div><span class="marks">[' + m + ']</span></div><div class="opts">' +
      o.map(function (x, k) { return '<button class="opt" data-k="' + k + '"><span class="k">' + String.fromCharCode(65 + k) + "</span><span>" + esc(x) + "</span></button>"; }).join("") + '</div><p class="fb" hidden></p>' + msBlock("msk-" + key, ans) + "</div>";
  }
  function wireAssessment(id) {
    var saved = store.get("as." + id, {});
    app.querySelectorAll("textarea[data-key]").forEach(function (t) { t.value = saved[t.dataset.key] || ""; t.oninput = function () { saved[t.dataset.key] = t.value; store.set("as." + id, saved); }; });
    function tally() {
      var got = 0, tot = 0, done = 0, n = 0;
      app.querySelectorAll("[data-mcq]").forEach(function (q) { n++; tot += +q.dataset.m; if (q.dataset.a != null) { done++; if (q.dataset.a === q.dataset.c) got += +q.dataset.m; } });
      var s = document.getElementById("mcqscore"); if (s) s.textContent = got + " / " + tot + " on auto-marked questions (" + done + " of " + n + " answered)";
    }
    app.querySelectorAll("[data-mcq]").forEach(function (q) {
      q.querySelectorAll(".opt").forEach(function (b) {
        b.onclick = function () {
          var k = +b.dataset.k, c = +q.dataset.c; q.dataset.a = k;
          q.querySelectorAll(".opt").forEach(function (o, i) { o.disabled = true; if (i === c) o.classList.add("right"); else if (i === k) o.classList.add("wrong"); });
          var fb = q.querySelector(".fb"); fb.hidden = false; fb.className = "fb " + (k === c ? "r" : "w"); fb.textContent = k === c ? "Correct." : "Not quite – the answer is " + String.fromCharCode(65 + c) + ".";
          tally();
        };
      });
    });
    wireMS(app);
    var clr = document.getElementById("clrans");
    if (clr) clr.onclick = function () { if (clr.dataset.sure !== "1") { clr.dataset.sure = "1"; clr.textContent = "Tap again to clear every answer"; return; } store.set("as." + id, {}); route(); };
    tally();
  }
  var tmHandle;
  function timerHTML(mins) { return '<div class="row"><span class="timer" id="tm">' + mins + ':00</span><button class="btn" id="tmgo">Start ' + mins + '-minute timer</button></div>'; }
  function wireTimer(mins) {
    clearInterval(tmHandle);
    var b = document.getElementById("tmgo"), el = document.getElementById("tm"); if (!b) return;
    b.onclick = function () {
      clearInterval(tmHandle); var end = Date.now() + mins * 60000; b.textContent = "Restart timer";
      tmHandle = setInterval(function () {
        if (!document.getElementById("tm")) { clearInterval(tmHandle); return; }
        var left = Math.max(0, end - Date.now()), m = Math.floor(left / 60000), s = Math.floor(left / 1000) % 60;
        el.textContent = m + ":" + (s < 10 ? "0" : "") + s; if (left === 0) { clearInterval(tmHandle); el.textContent = "Time up"; }
      }, 500);
    };
  }
  function testView(t) {
    if (unit !== t.u) { unit = t.u; store.set("unit", unit); applyChrome(); }
    var tot = t.items.reduce(function (a, b) { return a + b.m; }, 0);
    var h = '<div class="stack"><a href="#assess" class="muted crumb">← Tests</a><span class="eyebrow">' + esc(t.title.split(":")[0]) + "</span><h1>" + esc(t.title.split(": ").slice(1).join(": ")) + '</h1><div class="panel stack"><div class="row" style="justify-content:space-between"><p>' + t.items.length + " questions · " + tot + " marks · " + t.mins + " minutes</p>" + timerHTML(t.mins) + '</div><p class="muted" id="mcqscore"></p><div class="row"><button class="btn" id="msall">Show all mark schemes</button></div></div><div class="panel">';
    t.items.forEach(function (it, i) { h += it.o ? mcqQ(i + 1, it.q, it.m, it.o, it.c, t.id + "." + i, it.a) : writtenQ(i + 1, it.q, it.m, it.a, t.id + "." + i); });
    app.innerHTML = h + '</div><div class="row"><button class="btn" id="clrans">Clear my answers</button></div></div>'; wireAssessment(t.id); wireTimer(t.mins);
  }
  function paperView(p) {
    if (unit !== p.u) { unit = p.u; store.set("unit", unit); applyChrome(); }
    var tot = p.qs.reduce(function (s, q) { return s + q.parts.reduce(function (a, b) { return a + b.m; }, 0); }, 0);
    var h = '<div class="stack"><a href="#assess" class="muted crumb">← Tests</a><span class="eyebrow">' + esc(HUB.qual) + " · " + USHORT[p.u] + ' style</span><h1>' + esc(p.title) + '</h1><div class="panel stack"><div class="row" style="justify-content:space-between"><p><b>Time:</b> ' + minsText(p.mins) + " · <b>Total:</b> " + tot + " marks · Answer all questions.</p>" + timerHTML(p.mins) + '</div><p class="muted">' + esc(p.note) + '</p><p class="muted" id="mcqscore"></p><div class="row"><button class="btn" id="msall">Show all mark schemes</button></div></div>';
    p.qs.forEach(function (q) {
      var qt = q.parts.reduce(function (a, b) { return a + b.m; }, 0);
      h += '<section class="panel"><div class="row" style="justify-content:space-between"><h3>Question ' + q.n + (q.parts[0].qwc ? ' <span class="tag t">QWC</span>' : "") + '</h3><span class="marks">' + qt + ' marks</span></div><p class="stem" style="margin-top:8px">' + esc(q.stem) + "</p>";
      if (q.match) h += '<div class="bank" style="margin-top:10px">' + q.bank.map(function (b) { return "<span>" + esc(b) + "</span>"; }).join("") + "</div>";
      q.parts.forEach(function (pt, i) {
        var key = p.id + "." + q.n + "." + i, num = q.n + (pt.p || "");
        if (pt.o) h += mcqQ(num, pt.q, pt.m, pt.o, pt.c, key, pt.a);
        else if (q.match) h += mcqQ(num, pt.q, pt.m, q.bank, q.bank.indexOf(pt.k != null ? pt.k : pt.a), key, pt.a);
        else h += writtenQ(num, pt.q, pt.m, pt.qwc && pt.a ? pt.a + "\nSee the QWC levels on the Tests page." : pt.a || q.a, key);
      });
      if (q.a && q.parts.some(function (pt) { return pt.a; })) h += '<div class="q">' + msBlock("msq-" + p.id + "-" + q.n, q.a) + "</div>";
      h += "</section>";
    });
    app.innerHTML = h + '<div class="row"><button class="btn" id="clrans">Clear my answers</button></div></div>'; wireAssessment(p.id); wireTimer(p.mins);
  }

  // ---------- PAST PAPERS ----------
  function pastpapers() {
    var u = unit, papers = C.pastpapers.filter(function (p) { return p.u === u; });
    if (!papers.length) { app.innerHTML = '<div class="stack"><span class="eyebrow">' + USHORT[u] + '</span><h1>Past papers</h1><div class="panel stack"><p>CCEA publishes the ' + esc(HUB.qual) + ' past papers and mark schemes on its website. This hub does not map them question by question yet; use the practice papers and topic tests under Exams, then try the real papers.</p><p><a class="btn primary" href="' + C.ccea.pastPage + '" target="_blank" rel="noopener">CCEA past papers and mark schemes</a> <a class="btn" href="#assess">Practice papers and tests</a></p></div></div>'; return; }
    var h = '<div class="stack"><span class="eyebrow">' + USHORT[u] + ' · since first assessment</span><h1>Past-paper map</h1><p class="lead">Every question on CCEA\'s published ' + USHORT[u] + ' papers, mapped to the lessons that teach it. Use the grid to see which topics come up most, then open the paper and mark scheme on CCEA\'s site.</p>' +
      '<p class="muted small">Summer ' + papers.map(function (p) { return p.y; }).join(", ") + ". No Summer 2020 exams; Summer 2021 was not sat but CCEA published the Unit 1 materials. " + (u === "U1" ? "The Summer 2018 Unit 1 paper is no longer on CCEA's site. " : "") + "Some 2023–2025 papers are listed by mark scheme only; the CCEA page has the matching paper.</p>";
    // heat map
    h += '<div class="panel stack"><h3>Marks per lesson, per year</h3><div class="tbl-wrap"><table class="heat"><thead><tr><th>Lesson</th>' + papers.map(function (p) { return "<th>" + p.y + "</th>"; }).join("") + "<th>Total</th></tr></thead><tbody>";
    lessonsOf(u).forEach(function (l) {
      var tot = 0, cells = papers.map(function (p) {
        var m = 0; p.qs.forEach(function (q) { if (q[3].indexOf(l.id) > -1) m += q[1] / q[3].length; }); m = Math.round(m); tot += m;
        return '<td class="' + (m === 0 ? "h0" : m < 6 ? "h1" : "h2") + '">' + (m || "·") + "</td>";
      }).join("");
      h += '<tr><td><a href="#' + l.id + '-papers">' + l.id + "</a> " + esc(l.title) + "</td>" + cells + '<td class="num"><b>' + tot + "</b></td></tr>";
    });
    h += '</tbody></table></div><p class="muted small">Approximate marks: where one question covers several lessons, its marks are shared between them.</p></div>';
    papers.slice().reverse().forEach(function (p) {
      h += '<section class="panel pp-year"><div class="row" style="justify-content:space-between"><h2>Summer ' + p.y + '</h2><span class="small">' + ppLinks(p) + "</span></div>" + (p.note ? '<p class="muted small">' + esc(p.note) + "</p>" : "") +
        '<div class="tbl-wrap"><table><thead><tr><th>Q</th><th>Marks</th><th>What it tested</th><th>Lessons</th></tr></thead><tbody>' +
        p.qs.map(function (q) { return '<tr><td class="num mono">' + esc(q[0]) + '</td><td class="num">' + q[1] + "</td><td>" + esc(q[2]) + '</td><td class="small">' + (q[3].length ? q[3].map(function (id) { return '<a href="#' + id + '">' + id + "</a>"; }).join(" ") : "Mixed") + "</td></tr>"; }).join("") + "</tbody></table></div></section>";
    });
    app.innerHTML = h + "</div>";
  }

  // ---------- TRACKER ----------
  function tracker() {
    var u = unit, rag = store.get("rag", {}), los = [];
    lessonsOf(u).forEach(function (l) { l.spec.forEach(function (s, i) { los.push({ id: l.id + "." + i, text: s, l: l }); }); });
    var cnt = { r: 0, a: 0, g: 0 }; los.forEach(function (o) { if (rag[o.id]) cnt[rag[o.id]]++; });
    var n = los.length, none = n - cnt.r - cnt.a - cnt.g;
    var h = '<div class="stack"><span class="eyebrow">For pupils · ' + USHORT[u] + '</span><h1>Specification tracker</h1><p class="lead">Rate your confidence with each learning outcome: <b>R</b> not yet, <b>A</b> getting there, <b>G</b> confident. Ratings stay in this browser.</p>';
    h += '<div class="panel stack"><div class="bar" role="img" aria-label="' + cnt.g + " green, " + cnt.a + " amber, " + cnt.r + " red, " + none + ' not rated"><i style="width:' + (cnt.g / n * 100) + '%;background:var(--ok)"></i><i style="width:' + (cnt.a / n * 100) + '%;background:var(--warn)"></i><i style="width:' + (cnt.r / n * 100) + '%;background:var(--bad)"></i></div><p class="muted">' + cnt.g + " confident · " + cnt.a + " getting there · " + cnt.r + " not yet · " + none + " not rated, out of " + n + " outcomes</p></div>";
    topicsOf(u).forEach(function (t, ti) {
      h += '<section class="panel"><h3>' + (ti + 1) + ". " + esc(t.name) + '</h3><div class="tbl-wrap" style="margin-top:10px;border:0"><table><tbody>';
      los.filter(function (o) { return o.l.t === t.id; }).forEach(function (o) {
        var v = rag[o.id];
        h += "<tr><td>" + esc(o.text) + '<br><a href="#' + o.l.id + '-notes" class="small">' + o.l.id + " notes</a> · <a href=\"#" + o.l.id + '-quiz" class="small">quiz</a></td><td style="width:130px"><div class="rag" data-lo="' + o.id + '">' +
          ["r", "a", "g"].map(function (c) { return '<button class="' + c + '" aria-pressed="' + (v === c) + '" data-v="' + c + '" aria-label="' + { r: "Red", a: "Amber", g: "Green" }[c] + '">' + c.toUpperCase() + "</button>"; }).join("") + "</div></td></tr>";
      });
      h += "</tbody></table></div></section>";
    });
    app.innerHTML = h + "</div>";
    app.querySelectorAll(".rag button").forEach(function (b) { b.onclick = function () { var id = b.parentNode.dataset.lo; rag[id] = rag[id] === b.dataset.v ? null : b.dataset.v; store.set("rag", rag); var y = window.scrollY; tracker(); window.scrollTo(0, y); }; });
  }

  // ---------- GLOSSARY ----------
  var flashFilter = null, fcI = 0, fcFlip = false;
  function glossTerms(u, lessonId, q) {
    return C.gloss.filter(function (g) {
      var l = lesson(g[2]);
      if (lessonId) return g[2] === lessonId;
      if (u && unitOf(l) !== u) return false;
      if (q) { q = q.toLowerCase(); return (g[0] + " " + g[1]).toLowerCase().indexOf(q) > -1; }
      return true;
    });
  }
  function glossary() {
    var u = unit, filt = flashFilter; flashFilter = null;
    var deck = filt && filt.lesson ? glossTerms(null, filt.lesson) : glossTerms(u);
    var h = '<div class="stack"><span class="eyebrow">' + (filt && filt.lesson ? filt.lesson + " key terms" : USHORT[u]) + '</span><h1>Key-term glossary</h1><p class="lead">' + (C.hub ? 'Every key term for ' + esc(UALL) + ', with a definition written in the style of a mark scheme and a link to the lesson that teaches it.' : 'Every term the CCEA mark schemes have credited since 2019, with a definition written for this site and the paper and question where it was credited. Examiners repeatedly report marks lost for not expanding acronyms or not using these terms.') + '</p>';
    h += '<div class="panel stack"><div class="row" style="justify-content:space-between"><h3>Flashcards</h3><span class="muted small mono" id="fcc"></span></div><button class="flash" id="fc" aria-live="polite"></button><div class="row"><button class="btn" id="fcp">← Previous</button><button class="btn primary" id="fcf">Flip</button><button class="btn" id="fcn">Next →</button><button class="btn" id="fcs">Shuffle</button><a class="btn" href="#flashcards">Print these as cards</a></div></div>';
    h += '<div class="panel stack"><div class="row"><input type="search" id="gq" placeholder="Search terms or definitions" aria-label="Search glossary" style="flex:1;min-width:200px"><select id="gt" aria-label="Topic" style="flex:1 1 180px"><option value="">All ' + USHORT[u] + " topics</option>" + topicsOf(u).map(function (t) { return '<option value="' + t.id + '">' + esc(t.name) + "</option>"; }).join("") + '</select></div><div class="gl" id="gl"></div></div></div>';
    app.innerHTML = h;
    fcI = 0; fcFlip = false;
    function drawFC() { if (!deck.length) { document.getElementById("fc").textContent = "No terms"; return; } var t = deck[fcI]; document.getElementById("fc").innerHTML = fcFlip ? esc(t[1]) + (t[3] ? '<br><span class="mono small" style="color:var(--copper)">' + esc(t[3]) + "</span>" : "") : "<b>" + esc(t[0]) + "</b>"; document.getElementById("fcc").textContent = (fcI + 1) + " / " + deck.length; }
    function drawGL() {
      var q = document.getElementById("gq").value, tp = document.getElementById("gt").value;
      var list = glossTerms(u, null, q).filter(function (g) { return !tp || lesson(g[2]).t === tp; });
      document.getElementById("gl").innerHTML = list.length ? list.map(function (g) { return "<div><b>" + esc(g[0]) + '</b><p class="small">' + esc(g[1]) + '</p><span class="src">' + (g[3] ? "Credited: " + esc(g[3]) : "") + '</span><a class="small" href="#' + g[2] + '-notes">' + g[2] + " " + esc(lesson(g[2]).title) + "</a></div>"; }).join("") : '<p class="muted">No terms match.</p>';
    }
    document.getElementById("fc").onclick = document.getElementById("fcf").onclick = function () { fcFlip = !fcFlip; drawFC(); };
    document.getElementById("fcn").onclick = function () { fcI = (fcI + 1) % deck.length; fcFlip = false; drawFC(); };
    document.getElementById("fcp").onclick = function () { fcI = (fcI - 1 + deck.length) % deck.length; fcFlip = false; drawFC(); };
    document.getElementById("fcs").onclick = function () { deck = shuffle(deck); fcI = 0; fcFlip = false; drawFC(); };
    document.getElementById("gq").oninput = drawGL; document.getElementById("gt").onchange = drawGL;
    drawFC(); drawGL();
  }

  // ---------- FLASHCARD MAKER ----------
  function flashMaker() {
    var cfg = store.get("fm", { src: "lessons", lessons: [], per: 8, colour: true, double: true, custom: "" });
    var h = '<div class="stack"><span class="eyebrow">Printable</span><h1>Flashcard maker</h1><p class="lead">Choose lessons from ' + UALL + ', add your own cards, and download a print-ready A4 sheet. Fronts and backs are laid out so double-sided printing lines them up.</p><div class="row"><span class="muted small">Ready-made sets of every key term:</span>' + UIDS.map(function (u) { return '<button class="btn sm" data-fcu="' + u + '">' + esc(USHORT[u]) + " cards (PDF)</button>"; }).join("") + "</div>";
    h += '<div class="grid2"><div class="panel stack"><h3>1. Choose terms</h3><div class="row">' + UIDS.map(function (u) { return '<button class="btn sm" data-sel="' + u + '">All ' + esc(USHORT[u]) + "</button>"; }).join("") + '<button class="btn sm" data-sel="">Clear</button></div><div class="pick" id="fmpick">';
    UIDS.forEach(function (u) {
      lessonsOf(u).forEach(function (l) { var n = C.print.lessonTerms(l).length; if (!n) return; h += '<label><input type="checkbox" value="' + l.id + '"' + (cfg.lessons.indexOf(l.id) > -1 ? " checked" : "") + "><span>" + l.id + " " + esc(l.title) + ' <span class="muted">(' + n + ")</span></span></label>"; });
    });
    h += '</div><label class="stack" style="gap:4px"><b class="small">Your own cards</b><span class="muted small">One per line: term | definition</span><textarea id="fmcustom" placeholder="Sentinel value | A special input that ends a loop">' + esc(cfg.custom) + "</textarea></label></div>";
    h += '<div class="panel stack"><h3>2. Layout</h3><div class="row"><label class="row" style="gap:6px"><input type="radio" name="per" value="8"' + (cfg.per === 8 ? " checked" : "") + '> 8 per A4 (large)</label><label class="row" style="gap:6px"><input type="radio" name="per" value="12"' + (cfg.per === 12 ? " checked" : "") + '> 12 per A4</label></div><label class="row" style="gap:6px"><input type="checkbox" id="fmdouble"' + (cfg.double ? " checked" : "") + '> Double-sided (backs mirrored)</label><label class="row" style="gap:6px"><input type="checkbox" id="fmcolour"' + (cfg.colour ? " checked" : "") + '> Tinted fronts</label><label class="row" style="gap:6px"><input type="checkbox" id="fmshuffle"> Shuffle order</label>' +
      '<div class="score"><b id="fmcount">0</b><span class="muted" id="fmpages">cards</span></div><div class="row"><button class="btn primary" id="fmdl">Download printable cards</button><button class="btn" id="fmcsv">Copy for Quizlet</button></div><p class="muted small">The download is a web page laid out on A4. Open it and print with your browser (Ctrl+P), with background graphics on. Quizlet import: paste with “Tab” between term and definition and “New line” between cards.</p></div></div>';
    h += '<div class="panel stack"><h3>Preview</h3><div class="cardprev" id="fmprev"></div></div></div>';
    app.innerHTML = h;
    function cards() {
      var picked = Array.from(app.querySelectorAll("#fmpick input:checked")).map(function (i) { return i.value; }), out = [];
      picked.forEach(function (id) { var l = lesson(id); C.print.lessonTerms(l).forEach(function (g) { out.push({ f: g[0], b: g[1], tag: USHORT[unitOf(l)] + " · " + id }); }); });
      document.getElementById("fmcustom").value.split("\n").forEach(function (line) { var p = line.split("|"); if (p.length >= 2 && p[0].trim()) out.push({ f: p[0].trim(), b: p.slice(1).join("|").trim(), tag: "My card" }); });
      if (document.getElementById("fmshuffle").checked) out = shuffle(out);
      return out;
    }
    function per() { return +app.querySelector('input[name="per"]:checked').value; }
    function update() {
      var cs = cards(), p = per();
      cfg = { lessons: Array.from(app.querySelectorAll("#fmpick input:checked")).map(function (i) { return i.value; }), per: p, colour: document.getElementById("fmcolour").checked, double: document.getElementById("fmdouble").checked, custom: document.getElementById("fmcustom").value };
      store.set("fm", cfg);
      var sheets = Math.ceil(cs.length / p) * (cfg.double ? 2 : 1);
      document.getElementById("fmcount").textContent = cs.length;
      document.getElementById("fmpages").textContent = "cards · " + sheets + " A4 page" + (sheets === 1 ? "" : "s");
      document.getElementById("fmprev").innerHTML = cs.slice(0, 12).map(function (c) { return "<div><b>" + esc(c.f) + '</b><span class="muted">' + esc(c.b) + "</span></div>"; }).join("") + (cs.length > 12 ? '<div class="muted">+ ' + (cs.length - 12) + " more</div>" : "") || '<p class="muted">Tick some lessons or add your own cards.</p>';
    }
    app.querySelectorAll("#fmpick input, input[name=per], #fmdouble, #fmcolour, #fmshuffle").forEach(function (i) { i.onchange = update; });
    document.getElementById("fmcustom").oninput = update;
    app.querySelectorAll("[data-sel]").forEach(function (b) { b.onclick = function () { var u = b.dataset.sel; app.querySelectorAll("#fmpick input").forEach(function (i) { i.checked = u ? (unitOf(lesson(i.value)) === u || i.checked) : false; }); update(); }; });
    document.getElementById("fmdl").onclick = function () {
      var cs = cards(); if (!cs.length) { toast("Choose some terms first"); return; }
      save("Flashcards.html", C.print.flashcards(cs, { per: per(), colour: cfg.colour, double: cfg.double, screen: true, title: "Digital Technology flashcards" }));
    };
    app.querySelectorAll("[data-fcu]").forEach(function (b) { var u = b.dataset.fcu; b.onclick = function () { saveFile("pdf/" + u + "-flashcards.pdf", USHORT[u].replace(/ /g, "") + "-Flashcards.pdf"); }; });
    document.getElementById("fmcsv").onclick = function () { var cs = cards(); if (!cs.length) { toast("Choose some terms first"); return; } copy(cs.map(function (c) { return c.f + "\t" + c.b; }).join("\n"), cs.length + " cards"); };
    update();
  }

  function lessonActsHTML(l) {
    var acts = Acts.lessonActs(l, C);
    return '<p class="muted">' + acts.length + ' interactive activities for this lesson. More for the whole topic on the <a href="#' + l.t + '">topic page</a>.</p><div class="act-grid">' + acts.map(function (a, i) { return '<details class="panel act-card"' + (i < 2 ? " open" : "") + '><summary><span class="act-kind">' + ({ sort: "Sort", order: "Order", spot: "Spot", gen: "Practice", code: "C#", pixel: "Pixels" })[a.type] + "</span> " + esc(a.title.replace(/^C# challenge: /, "")) + actDone(a) + '</summary><div class="act" data-act="' + a.t + "|" + a.id + '"></div></details>'; }).join("") + "</div>";
  }
  // ================= ONE-STOP HUB: topics, mind maps, practice, quiz zone, revise, links =================
  var API = { esc: esc, store: store, toast: toast, hl: hl, runCs: runCs, copy: copy };
  var BR = ["#2c7a4b", "#a95a24", "#11503e", "#7a4fb0", "#1f6fa8", "#b0352d", "#8a6d12", "#3b7f7a"];
  function topicLessons(t) { return C.lessons.filter(function (l) { return l.t === t.id; }); }
  function topicNum(t) { return topicsOf(t.u).indexOf(t) + 1; }
  function defOf(term) { var k = term.toLowerCase(); var g = C.gloss.filter(function (x) { return x[0].toLowerCase() === k || x[0].toLowerCase().split(/\s*\/\s*/).indexOf(k) > -1; })[0]; return g ? g[1] : ""; }

  // ---------- mind maps ----------
  function mindmapSVG(m, opts) {
    opts = opts || {};
    var W = 1280, cx = W / 2, ROW = 30, GAP = 22, n = m.branches.length, right = m.branches.slice(0, Math.ceil(n / 2)), left = m.branches.slice(Math.ceil(n / 2));
    function rows(side) { return side.reduce(function (a, b) { return a + Math.max(1, b.leaves.length) * ROW + GAP; }, -GAP); }
    var H = Math.max(420, Math.max(rows(right), rows(left)) + 80), cy = H / 2;
    var out = '<svg viewBox="0 0 ' + W + " " + H + '" class="mm" role="img" aria-label="Mind map: ' + esc(m.center) + '" xmlns="http://www.w3.org/2000/svg" font-family="Atkinson Hyperlegible, Segoe UI, Arial, sans-serif">';
    function wrap(t, max) { var w = String(t).split(" "), lines = [""], i; for (i = 0; i < w.length; i++) { if ((lines[lines.length - 1] + " " + w[i]).trim().length > max && lines[lines.length - 1]) lines.push(w[i]); else lines[lines.length - 1] = (lines[lines.length - 1] + " " + w[i]).trim(); } return lines; }
    function side(list, dir, startIdx) {
      var y = cy - rows(list) / 2;
      list.forEach(function (b, bi) {
        var col = BR[(startIdx + bi) % BR.length], k = Math.max(1, b.leaves.length), top = y, bh = k * ROW, by = top + bh / 2, bx = cx + dir * 255;
        out += '<path d="M' + cx + "," + cy + " C" + (cx + dir * 120) + "," + cy + " " + (bx - dir * 120) + "," + by + " " + (bx - dir * 92) + "," + by + '" fill="none" stroke="' + col + '" stroke-width="5" stroke-linecap="round"/>';
        b.leaves.forEach(function (lf, li) {
          var ly = top + li * ROW + ROW / 2, lx = cx + dir * 400;
          out += '<path d="M' + (bx + dir * 92) + "," + by + " C" + (bx + dir * 140) + "," + by + " " + (lx - dir * 70) + "," + ly + " " + (lx - dir * 8) + "," + ly + '" fill="none" stroke="' + col + '" stroke-width="2" opacity=".65"/>';
          var label = lf.label.length > 27 ? lf.label.slice(0, 25) + "…" : lf.label;
          out += '<g class="mm-leaf' + (opts.quiz ? " hide" : "") + '" data-def="' + esc(lf.def || "") + '" data-term="' + esc(lf.label) + '"' + (lf.href ? ' data-href="' + lf.href + '"' : "") + ' tabindex="0" role="button" aria-label="' + esc(lf.label) + '"><rect x="' + (dir > 0 ? lx - 8 : lx - 10 - label.length * 7.9) + '" y="' + (ly - 13) + '" width="' + (label.length * 7.9 + 16) + '" height="26" rx="13" fill="var(--card)" stroke="' + col + '" stroke-width="1.5"/><text x="' + lx + '" y="' + (ly + 5) + '" font-size="15" text-anchor="' + (dir > 0 ? "start" : "end") + '" fill="var(--ink)">' + esc(label) + '</text><text class="mm-q" x="' + lx + '" y="' + (ly + 5) + '" font-size="15" text-anchor="' + (dir > 0 ? "start" : "end") + '" fill="' + col + '" font-weight="700">? ? ?</text></g>';
        });
        var bl = wrap(b.label, 18);
        out += '<g class="mm-branch"' + (b.href ? ' data-href="' + b.href + '" tabindex="0" role="link"' : "") + '><rect x="' + (bx - 92) + '" y="' + (by - 12 - bl.length * 9) + '" width="184" height="' + (24 + bl.length * 18) + '" rx="12" fill="' + col + '"/>' + bl.map(function (t, i) { return '<text x="' + bx + '" y="' + (by - bl.length * 9 + 18 + i * 18) + '" font-size="15" font-weight="700" text-anchor="middle" fill="#fff">' + esc(t) + "</text>"; }).join("") + "</g>";
        y += bh + GAP;
      });
    }
    side(right, 1, 0); side(left, -1, right.length);
    var cl = wrap(m.center, 16);
    out += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="118" ry="' + (34 + cl.length * 12) + '" fill="var(--pcb)"/>' + cl.map(function (t, i) { return '<text x="' + cx + '" y="' + (cy - (cl.length - 1) * 12 + 7 + i * 24) + '" font-size="20" font-weight="800" text-anchor="middle" fill="#fff">' + esc(t) + "</text>"; }).join("");
    return out + "</svg>";
  }
  function topicMap(t) {
    return { center: t.name, branches: topicLessons(t).map(function (l) {
      var terms = l.kw.slice(0, 6);
      return { label: l.title.replace(/^Spreadsheets \d: /, "").split(":")[0], href: "#" + l.id + "-notes", leaves: terms.map(function (k) { return { label: k, def: defOf(k), href: "#" + l.id + "-notes" }; }) };
    }) };
  }
  function unitMap(u) { return { center: UNAME[u].split(": ")[1], branches: topicsOf(u).map(function (t) { return { label: t.name, href: "#" + t.id, leaves: topicLessons(t).map(function (l) { return { label: l.title.split(":")[0], def: l.obj.join("; "), href: "#" + l.id }; }) }; }) }; }
  function mapPanel(m, id) {
    return '<div class="mm-wrap" id="' + id + '"><div class="row mm-ctl"><button class="btn sm" data-mm="quiz">Test yourself: hide the terms</button><button class="btn sm" data-mm="show">Show all</button><button class="btn sm" data-mm="svg">Download (SVG)</button><span class="muted small">Click a term for its mark-scheme definition.</span></div><div class="mm-scroll">' + mindmapSVG(m) + '</div><div class="mm-def notes" hidden></div></div>';
  }
  function wireMap(root, m, fname) {
    var wrapEl = root.querySelector(".mm-wrap"); if (!wrapEl) return;
    var def = wrapEl.querySelector(".mm-def");
    function bind() {
      wrapEl.querySelectorAll(".mm-leaf").forEach(function (g) {
        g.onclick = g.onkeydown = function (e) {
          if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return; if (e.preventDefault) e.preventDefault();
          if (g.classList.contains("hide")) { g.classList.remove("hide"); return; }
          def.hidden = false; def.innerHTML = "<b>" + esc(g.dataset.term) + "</b> – " + (g.dataset.def ? esc(g.dataset.def) : "see the fact file for this lesson.") + (g.dataset.href ? ' <a href="' + g.dataset.href + '">Open the lesson →</a>' : "");
        };
      });
      wrapEl.querySelectorAll(".mm-branch[data-href]").forEach(function (g) { g.onclick = function () { location.hash = g.dataset.href.slice(1); }; g.onkeydown = function (e) { if (e.key === "Enter") g.onclick(); }; });
    }
    bind();
    wrapEl.querySelectorAll("[data-mm]").forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.mm;
        if (k === "quiz") wrapEl.querySelectorAll(".mm-leaf").forEach(function (g) { g.classList.add("hide"); });
        if (k === "show") wrapEl.querySelectorAll(".mm-leaf").forEach(function (g) { g.classList.remove("hide"); });
        if (k === "svg") { var dark = isDark(), svg = wrapEl.querySelector("svg").outerHTML.replace(/var\(--card\)/g, dark ? "#15201b" : "#ffffff").replace(/var\(--ink\)/g, dark ? "#e5eee8" : "#15221c").replace(/var\(--pcb\)/g, dark ? "#1d6b53" : "#11503e"); save(fname + ".svg", '<?xml version="1.0" encoding="UTF-8"?>' + svg.replace("<svg ", '<svg style="background:' + (dark ? "#0d1512" : "#ffffff") + '" ')); }
      };
    });
  }
  function mindmapsPage(parts) {
    var u = unit, sel = parts[1] || "unit";
    var h = '<div class="stack"><span class="eyebrow">Revise · ' + USHORT[u] + '</span><h1>Mind maps</h1><p class="lead">One mind map for the whole unit and one for every topic, built from the lessons and the key terms in the mark schemes. Use <b>Test yourself</b> to hide the terms and recall them.</p>';
    h += '<div class="tabs" role="tablist"><button role="tab" data-mmt="unit" aria-selected="' + (sel === "unit") + '">Whole unit</button>' + topicsOf(u).map(function (t) { return '<button role="tab" data-mmt="' + t.id + '" aria-selected="' + (sel === t.id) + '">' + topicNum(t) + ". " + esc(t.name) + "</button>"; }).join("") + "</div>";
    var t = topic(sel), m = t ? topicMap(t) : unitMap(u);
    h += '<div class="panel">' + mapPanel(m, "mm1") + "</div></div>";
    app.innerHTML = h;
    app.querySelectorAll("[data-mmt]").forEach(function (b) { b.onclick = function () { location.hash = "mindmaps-" + b.dataset.mmt; }; });
    wireMap(app, m, t ? t.id + "-mind-map" : u + "-mind-map");
  }

  // ---------- topic page: the whole topic as one flow ----------
  function specPoints(t) {
    var seen = {}, out = [];
    topicLessons(t).forEach(function (l) { l.spec.forEach(function (s) { if (!seen[s]) { seen[s] = { text: s, lessons: [] }; out.push(seen[s]); } seen[s].lessons.push(l.id); }); });
    return out;
  }
  function topicPage(t, sub) {
    if (unit !== t.u) { unit = t.u; store.set("unit", unit); applyChrome(); }
    if (sub === "present") return topicPresent(t);
    if (sub === "deck") return topicDeckPage(t);
    var ls = topicLessons(t), acts = Acts.forTopic(t.id), sp = specPoints(t), conf = store.get("conf", {});
    var h = '<div class="stack" style="gap:22px"><div class="stack" style="gap:8px"><a class="muted small crumb" href="#unit">← ' + USHORT[t.u] + ' topics</a><span class="eyebrow">' + USHORT[t.u] + " · Topic " + topicNum(t) + "</span><h1>" + esc(t.name) + '</h1><p class="lead">' + esc(t.spec) + ". " + ls.length + " lesson" + (ls.length > 1 ? "s" : "") + ", " + acts.length + " interactive activities.</p>" +
      '<div class="row"><a class="btn primary" href="#' + t.id + '-present">▶ Present the whole topic</a><a class="btn" href="#quiz-' + t.id + '">End-of-topic quiz</a><a class="btn" href="#practice-' + t.id + '">All activities</a><button class="btn" id="rdeck" title="Animated revision slides: key facts, key terms, predict the output, true or false, quizzes and gap fills">Revision PowerPoint</button><button class="btn" id="tdeck">Download topic PowerPoint</button></div></div>';
    h += '<nav class="toc row small"><a href="#' + t.id + '" data-jump="t-flow">Lesson flow</a><a href="#' + t.id + '" data-jump="t-spec">Specification checklist</a><a href="#' + t.id + '" data-jump="t-map">Mind map</a><a href="#' + t.id + '" data-jump="t-acts">Activities</a><a href="#' + t.id + '" data-jump="t-pp">Past papers</a><a href="#' + t.id + '" data-jump="t-links">Websites</a></nav>';
    // flow
    h += '<section class="stack" id="t-flow"><h2>Lesson flow</h2><ol class="flow">' + ls.map(function (l, i) {
      return '<li class="panel flow-step"><div class="flow-n">' + (i + 1) + '</div><div class="stack" style="gap:6px"><div class="row" style="justify-content:space-between"><a href="#' + l.id + '"><b>' + l.id + " · " + esc(l.title) + '</b></a><span class="muted small">' + C.media.videoMinutes(l) + " min video · " + Acts.forLesson(l.id).length + ' activities</span></div><p class="small muted">' + esc(l.obj.join(" · ")) + '</p><div class="row flow-links"><a class="btn sm" href="#' + l.id + '-video">▶ Video</a><a class="btn sm" href="#' + l.id + '-slides">Slides</a><a class="btn sm" href="#' + l.id + '-notes">Fact file</a><a class="btn sm" href="#' + l.id + '-activities">Activities</a><a class="btn sm" href="#' + l.id + '-worksheet">Worksheet</a><a class="btn sm" href="#' + l.id + '-quiz">Quiz</a><a class="btn sm" href="#' + l.id + '-podcast">🎧 Podcast</a></div></div></li>';
    }).join("") + "</ol></section>";
    // spec checklist (+ build a PowerPoint from chosen spec points)
    h += '<section class="panel stack" id="t-spec"><div class="row" style="justify-content:space-between"><h2>Specification checklist</h2><span class="muted small">Rate yourself: red = not yet, amber = nearly, green = confident.</span></div><div class="spec-tbl">' + sp.map(function (p, i) {
      var key = t.id + ":" + i, v = conf[key] || 0;
      return '<div class="spec-row"><label class="spec-pick"><input type="checkbox" data-sp="' + i + '" checked aria-label="Include in PowerPoint"></label><div><p>' + esc(p.text) + '</p><p class="small">' + p.lessons.map(function (id) { return '<a href="#' + id + '">' + id + " " + esc(lesson(id).title) + "</a>"; }).join(" · ") + '</p></div><div class="rag" role="group" aria-label="Confidence">' + ["r", "a", "g"].map(function (c, k) { return '<button class="rag-' + c + '" data-conf="' + key + '" data-v="' + (k + 1) + '" aria-pressed="' + (v === k + 1) + '" aria-label="' + ["Not yet", "Nearly", "Confident"][k] + '"></button>'; }).join("") + "</div></div>";
    }).join("") + '</div><div class="row"><button class="btn sm" id="tdeck-sel">Build PowerPoint from the ticked specification points</button><span class="muted small">Each lesson becomes a named section in PowerPoint, so the deck can also be split by specification point.</span></div></section>';
    h += '<section class="panel stack" id="t-map"><h2>Mind map</h2>' + mapPanel(topicMap(t), "tmm") + "</section>";
    h += '<section class="stack" id="t-acts"><h2>Activities</h2><div class="act-grid">' + acts.map(function (a, i) { return '<details class="panel act-card"' + (i < 2 ? " open" : "") + '><summary><span class="act-kind">' + ({ sort: "Sort", order: "Order", spot: "Spot", gen: "Practice", code: "C#", pixel: "Pixels" })[a.type] + "</span> " + esc(a.title.replace(/^C# challenge: /, "")) + actDone(a) + '</summary><div class="act" data-act="' + a.t + "|" + a.id + '"></div></details>'; }).join("") + "</div></section>";
    var pp = []; ls.forEach(function (l) { ppFor(l.id).forEach(function (x) { if (!pp.some(function (y) { return y.p === x.p && y.q === x.q; })) pp.push(x); }); });
    h += '<section class="panel stack" id="t-pp"><h2>Past-paper questions on this topic (' + pp.length + ')</h2>' + (pp.length ? '<div class="tbl-wrap"><table><thead><tr><th>Paper</th><th>Q</th><th>Marks</th><th>What it tested</th></tr></thead><tbody>' + pp.sort(function (a, b) { return b.p.y - a.p.y; }).map(function (x) { return '<tr><td class="num">' + USHORT[x.p.u] + " " + x.p.y + '</td><td class="num mono">' + esc(x.q[0]) + '</td><td class="num">' + x.q[1] + "</td><td>" + esc(x.q[2]) + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="muted">None yet.</p>') + "</section>";
    var tt = (C.tutorials || []).filter(function (x) { return x.t === t.id; });
    if (tt.length) h += '<section class="panel stack" id="t-tuts"><h2>Step-by-step tutorials (' + tt.length + ')</h2><div class="row">' + tt.map(function (x) { return '<a class="btn sm" href="#tut-' + x.id + '">' + esc(x.title) + "</a>"; }).join("") + "</div></section>";
    h += '<section class="panel stack" id="t-links"><h2>Useful websites</h2>' + linksHTML(C.links.filter(function (k) { return k.t === t.id; })) + '<p class="small"><a href="#links">All websites →</a></p></section></div>';
    app.innerHTML = h;
    app.querySelectorAll("[data-jump]").forEach(function (a) { a.onclick = function (e) { e.preventDefault(); document.getElementById(a.dataset.jump).scrollIntoView({ behavior: "smooth" }); }; });
    wireActs(app);
    wireMap(app.querySelector("#t-map"), topicMap(t), t.id + "-mind-map");
    app.querySelectorAll("[data-conf]").forEach(function (b) { b.onclick = function () { var c = store.get("conf", {}); c[b.dataset.conf] = +b.dataset.v; store.set("conf", c); b.parentNode.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); }; });
    var rd = document.getElementById("rdeck"); if (rd) rd.onclick = function () { saveRevisionDeck(t, rd); };
    var td = document.getElementById("tdeck"); if (td) td.onclick = function () { saveTopicDeck(t, ls, td); };
    var ts = document.getElementById("tdeck-sel"); if (ts) ts.onclick = function () {
      var want = {}; app.querySelectorAll("[data-sp]").forEach(function (c) { if (c.checked) sp[+c.dataset.sp].lessons.forEach(function (id) { want[id] = 1; }); });
      var sel = ls.filter(function (l) { return want[l.id]; }); if (!sel.length) { toast("Tick at least one specification point"); return; }
      saveTopicDeck(t, sel, ts);
    };
  }
  // #<topic>-deck: just the two topic PowerPoint downloads (the front door and the workbook embed this; ?auto=1 starts the topic deck)
  function topicDeckPage(t) {
    var ls = topicLessons(t);
    app.innerHTML = '<div class="panel stack deck-only" style="gap:8px"><span class="eyebrow">' + esc(USHORT[t.u]) + " · Topic " + topicNum(t) + "</span><h3>" + esc(t.name) + '</h3><p class="small muted">The whole-topic PowerPoint (' + ls.length + " lesson" + (ls.length > 1 ? "s" : "") + ') is built on your device from the hub slides, so it takes a few seconds.</p><div class="row"><button class="btn primary sm" id="tdeck">Download topic PowerPoint</button><button class="btn sm" id="rdeck" title="Animated revision slides: key facts, key terms, quizzes and gap fills">Revision PowerPoint</button>' + (EMBED ? "" : '<a class="btn sm" href="#' + t.id + '">Topic page</a>') + "</div></div>";
    var td = document.getElementById("tdeck"), rd = document.getElementById("rdeck");
    td.onclick = function () { saveTopicDeck(t, ls, td); };
    rd.onclick = function () { saveRevisionDeck(t, rd); };
    if (EMBED && /[?&]auto=1(&|$)/.test(location.search) && !topicDeckPage.done) { topicDeckPage.done = 1; td.click(); }
  }
  function actDone(a) { var r = store.get("act." + a.t + "." + a.id, null); return r ? ' <span class="act-done">' + (r.n ? Math.round(100 * r.s / r.n) + "%" : "✓") + "</span>" : ""; }
  function wireActs(root) {
    root.querySelectorAll("details.act-card").forEach(function (d) {
      function go() { var el = d.querySelector("[data-act]"); if (el.dataset.ready) return; el.dataset.ready = 1; var k = el.dataset.act.split("|"); Acts.render(el, Acts.find(k[0], k[1]), API); }
      if (d.open) go(); d.addEventListener("toggle", function () { if (d.open) go(); });
    });
    root.querySelectorAll("div.act[data-act]:not([data-ready])").forEach(function (el) { if (el.closest("details")) return; el.dataset.ready = 1; var k = el.dataset.act.split("|"); Acts.render(el, Acts.find(k[0], k[1]), API); });
  }
  function topicPresent(t) {
    var ls = topicLessons(t), seq = [], steps = null, back = false;
    ls.forEach(function (l) { for (var i = 0; i < slideCount(l); i++) seq.push([l, i]); });
    var idx = Math.min(store.get("tp." + t.id, 0), seq.length - 1);
    app.innerHTML = '<div class="stack"><a class="muted small crumb" href="#' + t.id + '">← ' + esc(t.name) + '</a><h1>' + esc(t.name) + ': whole topic</h1><div class="deck" id="deck"><div class="sprog" aria-hidden="true"><i id="sprog"></i></div><div id="slidebox" class="slidebox"></div><div class="deck-ctrl"><button class="btn" id="sp">← Prev</button><button class="btn primary" id="sn">Next →</button><button class="btn" id="sfull">Present full screen</button><select id="tpj" aria-label="Jump to lesson">' + ls.map(function (l) { return '<option value="' + l.id + '">' + l.id + " " + esc(l.title) + "</option>"; }).join("") + '</select><label class="small row" style="gap:6px"><input type="checkbox" id="sstep"' + (store.get("steps", true) !== false ? " checked" : "") + '> One point at a time</label><span class="mono small muted" id="tpn"></span></div></div></div>';
    function fwd() { if (steps && steps.next()) return; if (idx < seq.length - 1) { idx++; back = false; draw(); } }
    function bwd() { if (idx > 0) { idx--; back = true; draw(); } }
    function draw() {
      idx = Math.max(0, Math.min(seq.length - 1, idx)); store.set("tp." + t.id, idx);
      var s = seq[idx], box = document.getElementById("slidebox"); codeStore = [];
      box.innerHTML = slideHTML(s[0], s[1]); wireCode(box); wireInteractive(box);
      box.firstChild.classList.add(back ? "in-back" : "in");
      steps = prepSteps(box, back);
      document.getElementById("sprog").style.width = Math.round(100 * (idx + 1) / seq.length) + "%";
      document.getElementById("tpn").textContent = (idx + 1) + " / " + seq.length;
      document.getElementById("tpj").value = s[0].id;
      document.getElementById("sp").disabled = idx === 0; document.getElementById("sn").disabled = idx === seq.length - 1 && !(steps && steps.left());
    }
    document.getElementById("sp").onclick = bwd;
    document.getElementById("sn").onclick = fwd;
    document.getElementById("sstep").onchange = function (e) { store.set("steps", e.target.checked); back = false; draw(); };
    wireGestures(document.getElementById("slidebox"), fwd, bwd);
    document.getElementById("tpj").onchange = function (e) { for (var i = 0; i < seq.length; i++) if (seq[i][0].id === e.target.value) { idx = i; break; } back = false; draw(); };
    document.getElementById("sfull").onclick = function () { var d = document.getElementById("deck"); if (d.requestFullscreen) d.requestFullscreen().catch(function () {}); };
    window.onkeydown = function (e) { if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return; if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); fwd(); } if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); bwd(); } };
    draw();
  }
  function saveTopicDeck(t, ls, btn) {
    var label = btn.textContent; btn.disabled = true; btn.textContent = "Building PowerPoint…";
    if (!pptLib) pptLib = loadScript("https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js").then(function () { return window.PptxGenJS; });
    if (!iconData) iconData = Promise.all(Object.keys(DeckCore.ICON).map(function (k) { return fetch("icons/" + k + ".png").then(function (r) { return r.blob(); }).then(function (b) { return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res([k, String(fr.result).replace(/^data:/, "")]); }; fr.readAsDataURL(b); }); }); })).then(function (pairs) { var o = {}; pairs.forEach(function (p) { o[p[0]] = p[1]; }); return o; });
    var diags = Promise.all(ls.map(function (l) { return fetch("diagrams/" + l.id + ".png").then(function (r) { if (!r.ok) return null; return r.blob().then(function (b) { return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result).replace(/^data:/, "")); }; fr.readAsDataURL(b); }); }); }).catch(function () { return null; }); }));
    Promise.all([pptLib, iconData, diags]).then(function (r) {
      var dg = {}; ls.forEach(function (l, i) { dg[l.id] = r[2][i]; });
      return DeckCore.buildTopic(t, ls, r[0], r[1], dg).then(writeAnimated);
    }).then(function (blob) { return save(t.id + " " + t.name.replace(/[:\/,]/g, "") + (ls.length < topicLessons(t).length ? " (" + ls.map(function (l) { return l.id; }).join(" ") + ")" : "") + ".pptx", blob); }, function (e) { pptLib = null; toast("The PowerPoint builder couldn't load here."); })
      .then(function () { btn.disabled = false; btn.textContent = label; });
  }

  // ---------- practice hub ----------
  function practicePage(parts) {
    var u = unit, sel = parts[1] && topic(parts[1]) ? parts[1] : null;
    var ts = sel ? [topic(sel)] : topicsOf(u);
    var h = '<div class="stack"><span class="eyebrow">Practice · ' + USHORT[u] + '</span><h1>' + (sel ? esc(topic(sel).name) + ": activities" : "Practice") + '</h1>';
    if (!sel) {
      var total = Acts.all.filter(function (a) { return topic(a.t).u === u; }).length;
      h += '<p class="lead">' + total + ' interactive activities for ' + USHORT[u] + ': sorting, sequencing, spot-the-mistake, unlimited practice questions' + (u === HUB.prog ? " and C# coding challenges that check your code automatically" : "") + '.</p><div class="hub-cards"><a class="panel hub-card" href="#quiz"><b>Quiz Zone</b><span>Build a quiz from any topics: practice or timed test mode.</span></a>' + (u === HUB.prog ? '<a class="panel hub-card" href="#code"><b>C# challenges</b><span>' + Acts.challenges.length + ' programming tasks with automatic testing, in the browser.</span></a>' : "") + '<a class="panel hub-card" href="#mindmaps"><b>Mind maps</b><span>Test yourself by hiding the key terms.</span></a><a class="panel hub-card" href="#flashcards"><b>Flashcards</b><span>Print or revise mark-scheme terms.</span></a></div>';
    }
    ts.forEach(function (t) {
      var acts = Acts.forTopic(t.id).filter(function (a) { return a.type !== "code" || sel; });
      if (!acts.length) return;
      h += '<section class="stack"><div class="row" style="justify-content:space-between"><h2>' + topicNum(t) + ". " + esc(t.name) + '</h2><a class="small" href="#' + t.id + '">Topic page →</a></div><div class="act-grid">' + acts.map(function (a) { return '<details class="panel act-card"' + (sel ? " open" : "") + '><summary><span class="act-kind">' + ({ sort: "Sort", order: "Order", spot: "Spot", gen: "Practice", code: "C#", pixel: "Pixels" })[a.type] + "</span> " + esc(a.title.replace(/^C# challenge: /, "")) + actDone(a) + '</summary><div class="act" data-act="' + a.t + "|" + a.id + '"></div></details>'; }).join("") + "</div></section>";
    });
    app.innerHTML = h + "</div>";
    wireActs(app);
  }
  function codePage() {
    if (unit !== HUB.prog) { unit = HUB.prog; store.set("unit", unit); applyChrome(); }
    var h = '<div class="stack"><span class="eyebrow">Practice · ' + esc(USHORT[HUB.prog]) + '</span><h1>C# challenges</h1><p class="lead">Write C# in the browser. <b>Run</b> tries your program; <b>Check my code</b> runs hidden tests, including boundary values, and tells you what went wrong. Your code is saved on this device.</p>';
    var groups = {}; Acts.challenges.forEach(function (c) { (groups[c.l] = groups[c.l] || []).push(c); });
    Object.keys(groups).forEach(function (lid) {
      var l = lesson(lid);
      h += '<section class="stack"><h2>' + lid + " · " + esc(l.title) + "</h2>" + groups[lid].map(function (c) { var a = Acts.find(c.t, "cs-" + c.id), done = (store.get("cs." + c.id, null) || {}).done; return '<details class="panel act-card"><summary><span class="act-kind">C#</span> ' + esc(c.title) + (done ? ' <span class="act-done">✓ done</span>' : "") + '</summary><div class="act" data-act="' + a.t + "|" + a.id + '"></div></details>'; }).join("") + "</section>";
    });
    app.innerHTML = h + "</div>";
    wireActs(app);
  }

  // ---------- quiz zone ----------
  function questionPool(topicIds) {
    var pool = [];
    C.lessons.forEach(function (l) {
      if (topicIds.indexOf(l.t) < 0) return;
      l.quiz.forEach(function (q) { pool.push({ t: l.t, l: l.id, q: q[0], o: q[1], c: q[2], why: q[3] || "" }); });
      (l.tf || []).forEach(function (x) { pool.push({ t: l.t, l: l.id, q: "True or false: " + x[0], o: ["True", "False"], c: x[1] ? 0 : 1, why: x[2] || "" }); });
      C.print.lessonTerms(l).forEach(function (g) {
        var same = C.gloss.filter(function (x) { var xl = lesson(x[2]); return xl && unitOf(xl) === unitOf(l) && x[0] !== g[0]; });
        var d = shuffle(same).slice(0, 3).map(function (x) { return x[1]; }), opts = shuffle(d.concat([g[1]]));
        pool.push({ t: l.t, l: l.id, q: "Which definition matches “" + g[0] + "”?", o: opts, c: opts.indexOf(g[1]), why: g[3] ? "Credited in " + g[3] : "" });
      });
    });
    C.tests.forEach(function (tst) { if (!tst.topics) return; tst.items.forEach(function (it) { if (it.o && tst.topics.some(function (x) { return topicIds.indexOf(x) > -1; })) pool.push({ t: tst.topics.filter(function (x) { return topicIds.indexOf(x) > -1; })[0], l: null, q: it.q, o: it.o, c: it.c, why: "" }); }); });
    return pool;
  }
  var QZ = null;
  function quizZone(parts) {
    var preset = parts[1] && topic(parts[1]) ? parts[1] : null;
    if (preset && unit !== topic(preset).u) { unit = topic(preset).u; store.set("unit", unit); applyChrome(); }
    if (QZ && QZ.running) return quizRun();
    var u = unit, hist = store.get("qzhist", []);
    var h = '<div class="stack"><span class="eyebrow">Practice</span><h1>Quiz Zone</h1><p class="lead">Questions from every lesson quiz, true/false statement, mark-scheme definition and topic test, mixed into a fresh quiz each time.</p><div class="panel stack"><h3>Choose topics</h3><div class="row"><button class="btn sm" id="qz-all">All ' + USHORT[u] + ' topics</button><button class="btn sm" id="qz-none">None</button><button class="btn sm" id="qz-both">' + esc(UALL) + '</button></div><div class="qz-topics">' +
      C.topics.map(function (t) { return '<label class="qz-t' + (t.u !== u ? " other" : "") + '"><input type="checkbox" value="' + t.id + '"' + ((preset ? t.id === preset : t.u === u) ? " checked" : "") + "> " + USHORT[t.u] + " · " + esc(t.name) + "</label>"; }).join("") +
      '</div><div class="row"><label>Questions <select id="qz-n"><option>10</option><option selected>20</option><option>30</option><option>50</option></select></label><label>Mode <select id="qz-m"><option value="practice">Practice (feedback each time)</option><option value="test">Test (timed)</option></select></label></div><div class="row"><button class="btn primary" id="qz-go">Start quiz</button><span class="muted small" id="qz-pool"></span></div></div>';
    if (hist.length) h += '<div class="panel stack"><h3>Your recent quizzes</h3><div class="tbl-wrap"><table><thead><tr><th>When</th><th>Topics</th><th>Mode</th><th>Score</th></tr></thead><tbody>' + hist.slice(-8).reverse().map(function (x) { return "<tr><td>" + new Date(x.at).toLocaleDateString("en-GB") + "</td><td>" + esc(x.topics) + "</td><td>" + x.mode + '</td><td class="num">' + x.s + " / " + x.n + " (" + Math.round(100 * x.s / x.n) + "%)</td></tr>"; }).join("") + "</tbody></table></div></div>";
    app.innerHTML = h + "</div>";
    function chosen() { return Array.prototype.slice.call(app.querySelectorAll(".qz-topics input:checked")).map(function (c) { return c.value; }); }
    function upd() { document.getElementById("qz-pool").textContent = questionPool(chosen()).length + " questions available"; }
    app.querySelectorAll(".qz-topics input").forEach(function (c) { c.onchange = upd; }); upd();
    document.getElementById("qz-all").onclick = function () { app.querySelectorAll(".qz-topics input").forEach(function (c) { c.checked = topic(c.value).u === u; }); upd(); };
    document.getElementById("qz-none").onclick = function () { app.querySelectorAll(".qz-topics input").forEach(function (c) { c.checked = false; }); upd(); };
    document.getElementById("qz-both").onclick = function () { app.querySelectorAll(".qz-topics input").forEach(function (c) { c.checked = true; }); upd(); };
    document.getElementById("qz-go").onclick = function () {
      var ts = chosen(); if (!ts.length) { toast("Choose at least one topic"); return; }
      var pool = shuffle(questionPool(ts)), n = Math.min(+document.getElementById("qz-n").value, pool.length);
      QZ = { running: true, qs: pool.slice(0, n).map(function (q) { var idx = shuffle(q.o.map(function (o, i) { return i; })); return { t: q.t, l: q.l, q: q.q, o: idx.map(function (i) { return q.o[i]; }), c: idx.indexOf(q.c), why: q.why, pick: null }; }), i: 0, mode: document.getElementById("qz-m").value, start: Date.now(), topics: ts };
      quizRun();
    };
  }
  function quizRun() {
    var z = QZ;
    if (z.i >= z.qs.length) return quizEnd();
    var q = z.qs[z.i], answered = q.pick !== null;
    var secs = Math.round((Date.now() - z.start) / 1000);
    var h = '<div class="stack"><div class="row" style="justify-content:space-between"><span class="eyebrow">Quiz Zone · ' + (z.mode === "test" ? "Test" : "Practice") + '</span><span class="mono small muted">Question ' + (z.i + 1) + " / " + z.qs.length + (z.mode === "test" ? ' · <span id="qz-clock">' + Math.floor(secs / 60) + ":" + ("0" + secs % 60).slice(-2) + "</span>" : "") + '</span></div><div class="qz-bar"><span style="width:' + (100 * z.i / z.qs.length) + '%"></span></div><div class="panel stack"><span class="tag t">' + esc(topic(q.t).name) + '</span><h2 class="qz-q">' + esc(q.q) + '</h2><div class="opts">' +
      q.o.map(function (o, k) { var cls = answered && z.mode === "practice" ? (k === q.c ? " right" : k === q.pick ? " wrong" : "") : (answered && k === q.pick ? " picked" : ""); return '<button class="opt' + cls + '" data-k="' + k + '"' + (answered && z.mode === "practice" ? " disabled" : "") + '><span class="k">' + "ABCD"[k] + "</span><span>" + esc(o) + "</span></button>"; }).join("") + "</div>";
    if (answered && z.mode === "practice") h += '<div class="gen-fb ' + (q.pick === q.c ? "ok" : "bad") + '"><b>' + (q.pick === q.c ? "Correct!" : "Not quite.") + "</b> " + (q.pick === q.c ? "" : "Answer: " + esc(q.o[q.c]) + ". ") + esc(q.why) + (q.l ? ' <a href="#' + q.l + '-notes">Revise ' + q.l + "</a>" : "") + "</div>";
    h += '<div class="row">' + (z.mode === "practice" ? (answered ? '<button class="btn primary" id="qz-next">' + (z.i === z.qs.length - 1 ? "See results" : "Next") + "</button>" : "") : '<button class="btn" id="qz-prev"' + (z.i === 0 ? " disabled" : "") + '>← Back</button><button class="btn primary" id="qz-next">' + (z.i === z.qs.length - 1 ? "Finish" : "Next →") + "</button>") + '<button class="btn sm" id="qz-quit">Quit</button></div></div></div>';
    app.innerHTML = h;
    app.querySelectorAll(".opt[data-k]").forEach(function (b) { b.onclick = function () { q.pick = +b.dataset.k; quizRun(); }; });
    var nx = document.getElementById("qz-next"); if (nx) nx.onclick = function () { if (z.mode === "test" && q.pick === null && !confirmSkip()) return; z.i++; quizRun(); };
    var pv = document.getElementById("qz-prev"); if (pv) pv.onclick = function () { z.i--; quizRun(); };
    document.getElementById("qz-quit").onclick = function () { QZ = null; route(); };
    if (z.mode === "test") { clearInterval(z.tick); z.tick = setInterval(function () { var c = document.getElementById("qz-clock"); if (!c) { clearInterval(z.tick); return; } var s = Math.round((Date.now() - z.start) / 1000); c.textContent = Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2); }, 1000); }
  }
  function confirmSkip() { toast("Choose an answer first (you can come back with ← Back)"); return false; }
  function quizEnd() {
    var z = QZ; clearInterval(z.tick); z.running = false;
    var s = z.qs.filter(function (q) { return q.pick === q.c; }).length, n = z.qs.length, by = {};
    z.qs.forEach(function (q) { by[q.t] = by[q.t] || [0, 0]; by[q.t][1]++; if (q.pick === q.c) by[q.t][0]++; });
    var hist = store.get("qzhist", []); hist.push({ at: Date.now(), s: s, n: n, mode: z.mode, topics: z.topics.length > 3 ? z.topics.length + " topics" : z.topics.map(function (t) { return topic(t).name; }).join(", ") }); store.set("qzhist", hist.slice(-40));
    var secs = Math.round((Date.now() - z.start) / 1000);
    var h = '<div class="stack"><span class="eyebrow">Quiz Zone · results</span><h1>' + s + " / " + n + " (" + Math.round(100 * s / n) + '%)</h1><p class="muted">Time: ' + Math.floor(secs / 60) + " min " + secs % 60 + ' s</p><div class="panel stack"><h3>By topic</h3>' + Object.keys(by).map(function (t) { var p = Math.round(100 * by[t][0] / by[t][1]); return '<div class="qz-row"><span>' + esc(topic(t).name) + '</span><span class="qz-meter"><span style="width:' + p + "%;background:" + (p >= 70 ? "var(--ok)" : p >= 40 ? "var(--warn)" : "var(--bad)") + '"></span></span><span class="mono small">' + by[t][0] + "/" + by[t][1] + '</span><a class="small" href="#' + t + '">Revise</a></div>'; }).join("") + '</div><div class="row"><button class="btn primary" id="qz-wrong"' + (s === n ? " disabled" : "") + '>Retry the ' + (n - s) + ' I got wrong</button><button class="btn" id="qz-new">New quiz</button></div><div class="panel stack"><h3>Review</h3><ol class="qz-review">' + z.qs.map(function (q) { var ok = q.pick === q.c; return '<li class="' + (ok ? "right" : "wrong") + '"><b>' + esc(q.q) + '</b><br><span class="small">' + (ok ? "✓ " + esc(q.o[q.c]) : "Your answer: " + (q.pick === null ? "none" : esc(q.o[q.pick])) + " · Correct: " + esc(q.o[q.c])) + (q.why ? " – " + esc(q.why) : "") + "</span></li>"; }).join("") + "</ol></div></div>";
    app.innerHTML = h;
    document.getElementById("qz-new").onclick = function () { QZ = null; route(); };
    document.getElementById("qz-wrong").onclick = function () { var wrong = z.qs.filter(function (q) { return q.pick !== q.c; }).map(function (q) { var c = Object.assign({}, q); c.pick = null; return c; }); QZ = { running: true, qs: shuffle(wrong), i: 0, mode: "practice", start: Date.now(), topics: z.topics }; quizRun(); };
    window.scrollTo(0, 0);
  }

  // ---------- revise hub ----------
  function revisePage() {
    var u = unit;
    var h = '<div class="stack"><span class="eyebrow">Revise · ' + USHORT[u] + '</span><h1>Revise</h1><p class="lead">Everything for revision in one place.</p><div class="hub-cards">' +
      '<a class="panel hub-card" href="#mindmaps"><b>Mind maps</b><span>Unit and topic maps with a hide-and-recall mode.</span></a>' +
      '<a class="panel hub-card" href="#factfiles"><b>Fact files</b><span>A one-to-two page summary for every lesson, with diagrams.</span></a>' +
      '<a class="panel hub-card" href="#glossary"><b>Glossary</b><span>' + C.gloss.length + ' key terms taken from the mark schemes.</span></a>' +
      '<a class="panel hub-card" href="#flashcards"><b>Flashcards</b><span>Make printable cards or revise on screen.</span></a>' +
      '<a class="panel hub-card" href="#media"><b>Videos and podcasts</b><span>Narrated lessons and two-host revision episodes.</span></a>' +
      '<a class="panel hub-card" href="#quiz"><b>Quiz Zone</b><span>Mixed quizzes in practice or timed mode.</span></a>' +
      '<a class="panel hub-card" href="#pastpapers"><b>Past papers</b><span>Which questions came up on each lesson since 2019.</span></a>' +
      '<a class="panel hub-card" href="#tracker"><b>Tracker</b><span>Rate your confidence and see what to revise next.</span></a></div>';
    h += '<section class="panel stack" id="rev-decks"><h2>Revision PowerPoints</h2><p class="small muted">One animated deck per topic. Click through it: key facts appear point by point, answers are revealed when you click, and there are predict-the-output, true or false, quiz and gap-fill slides for every lesson. Built on your device, so it takes a few seconds.</p><div class="media-list">' + topicsOf(u).map(function (t) { return '<div class="media-row"><span class="mono small muted">' + topicNum(t) + '</span><a class="grow" href="#' + t.id + '">' + esc(t.name) + '</a><button class="btn sm" data-rdeck="' + t.id + '">Download .pptx</button></div>'; }).join("") + "</div></section>";
    var conf = store.get("conf", {}), weak = [];
    topicsOf(u).forEach(function (t) { specPoints(t).forEach(function (p, i) { var v = conf[t.id + ":" + i]; if (v === 1 || v === 2) weak.push([t, p, v]); }); });
    if (weak.length) h += '<div class="panel stack"><h3>Your weakest specification points</h3><ul class="small">' + weak.sort(function (a, b) { return a[2] - b[2]; }).slice(0, 8).map(function (w) { return '<li><span class="dot ' + (w[2] === 1 ? "r" : "a") + '"></span> ' + esc(w[1].text) + ' – <a href="#' + w[1].lessons[0] + '-notes">fact file</a> · <a href="#practice-' + w[0].id + '">practise</a></li>'; }).join("") + "</ul></div>";
    app.innerHTML = h + "</div>";
    app.querySelectorAll("[data-rdeck]").forEach(function (b) { b.onclick = function () { saveRevisionDeck(topic(b.dataset.rdeck), b); }; });
  }
  function factfilesPage() {
    var u = unit;
    var h = '<div class="stack"><span class="eyebrow">Revise · ' + USHORT[u] + '</span><h1>Fact files</h1><p class="lead">Open a fact file on screen or download it as a PDF. Every one has a diagram, the specification, notes, mark-scheme terms and exam focus.</p><div class="row"><button class="btn" data-pdf="factfiles/' + u + '-factfiles.pdf">Download all ' + USHORT[u] + " fact files (PDF)</button></div>";
    topicsOf(u).forEach(function (t) { h += '<section class="panel stack"><h3>' + topicNum(t) + ". " + esc(t.name) + '</h3><div class="media-list">' + topicLessons(t).map(function (l) { return '<div class="media-row"><span class="mono small muted">' + l.id + '</span><a class="grow" href="#' + l.id + '-notes">' + esc(l.title) + '</a><button class="btn sm" data-pdf="factfiles/' + l.id + '.pdf">PDF</button></div>'; }).join("") + "</div></section>"; });
    app.innerHTML = h + "</div>";
    app.querySelectorAll("[data-pdf]").forEach(function (b) { b.onclick = function () { saveFile(b.dataset.pdf, b.dataset.pdf.split("/")[1].replace(".pdf", "") + "-fact-file.pdf"); }; });
  }

  // ---------- step-by-step tutorials ----------
  function tutorial(id) { return (C.tutorials || []).filter(function (t) { return t.id === id; })[0]; }
  function tutorialsPage(sel) {
    var ser = C.tutorialSeries || [];
    var h = '<div class="stack"><span class="eyebrow">Step by step</span><h1>Tutorials</h1><p class="lead">' + esc(C.tutorialsLead || "Work through each tutorial at your own pace. Tick off each step as you finish it – your progress is saved on this device.") + "</p>";
    if (ser.length > 1) h += '<nav class="toc row small">' + ser.map(function (s) { return '<a href="#tutorials-' + s.id + '">' + esc(s.name) + "</a>"; }).join("") + "</nav>";
    h += Tutorials.listHTML(C, null, { store: store }) + "</div>";
    app.innerHTML = ser.length ? h : '<div class="panel"><p>No tutorials yet.</p></div>';
    if (sel) { var e = document.getElementById("ts-" + sel); if (e) e.scrollIntoView(); }
  }
  function tutorialView(t) {
    var s = (C.tutorialSeries || []).filter(function (x) { return x.id === t.series; })[0] || { name: "Tutorials", id: t.series };
    if (t.u && unit !== t.u && UIDS.indexOf(t.u) > -1) { unit = t.u; store.set("unit", unit); applyChrome(); }
    codeStore = [];
    Tutorials.render(app, t, { store: store, codeHTML: codeHTML, copy: copy, copyStore: [] }, { series: s, list: C.tutorials.filter(function (x) { return x.series === t.series; }) });
    wireCode(app); wireInteractive(app);
  }

  // ---------- websites ----------
  function linksHTML(list) {
    if (!list.length) return '<p class="muted small">See the whole-course sites on the Websites page.</p>';
    return '<div class="links">' + list.map(function (k) { return '<a class="link-card" href="' + k.url + '" target="_blank" rel="noopener"><span class="tag ' + (k.k === "official" ? "g" : k.k === "tool" ? "t" : "") + '">' + esc(C.linkKinds[k.k] || k.k) + '</span><b>' + esc(k.title) + '</b><span class="small muted">' + esc(k.src) + '</span><span class="small">' + esc(k.why) + "</span></a>"; }).join("") + "</div>";
  }
  function linksPage() {
    var h = '<div class="stack"><span class="eyebrow">' + esc(UALL) + '</span><h1>Useful websites</h1><p class="lead">Hand-picked, reputable sites for every topic, each checked in October 2026. They open in a new tab.</p>';
    h += '<section class="panel stack"><h2>Whole course</h2>' + linksHTML(C.links.filter(function (k) { return k.t === "all"; })) + "</section>";
    UIDS.forEach(function (u) {
      h += "<h2>" + esc(UNAME[u]) + "</h2>";
      topicsOf(u).forEach(function (t) { var ls = C.links.filter(function (k) { return k.t === t.id; }); if (ls.length) h += '<section class="panel stack"><h3>' + topicNum(t) + ". " + esc(t.name) + "</h3>" + linksHTML(ls) + "</section>"; });
    });
    app.innerHTML = h + "</div>";
  }

  // ---------- ROUTER ----------
  function setNav(k) { document.querySelectorAll("[data-nav]").forEach(function (a) { if (a.dataset.nav === k) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); }); }
  var lastLesson = null;
  function route() {
    window.onkeydown = null; Speech.stop();
    var parts = (location.hash || "#home").slice(1).split("-"), id = parts[0];
    var l = lesson(id), t = C.tests.filter(function (x) { return x.id === id; })[0], p = C.papers.filter(function (x) { return x.id === id; })[0];
    if (l) { if (lastLesson !== id) slideIdx = 0; lastLesson = id; setNav("unit"); lessonView(l, parts[1]); }
    else if (t) { setNav("assess"); testView(t); }
    else if (p) { setNav("assess"); paperView(p); }
    else if (id === "unit") { setNav("unit"); unitPage(); }
    else if (id === "notebook") { setNav("notebook"); notebookPage(); }
    else if (id === "assess") { setNav("assess"); assess(); }
    else if (id === "pastpapers") { setNav("assess"); pastpapers(); }
    else if (id === "tracker") { setNav("tracker"); tracker(); }
    else if (id === "glossary") { setNav("revise"); glossary(); }
    else if (id === "flashcards") { setNav("revise"); flashMaker(); }
    else if (id === "media") { setNav("media"); mediaPage(); }
    else if (C.topics.some(function (x) { return x.id === id; })) { setNav("unit"); topicPage(topic(id), parts[1]); }
    else if (id === "mindmaps") { setNav("revise"); mindmapsPage(parts); }
    else if (id === "practice") { setNav("practice"); practicePage(parts); }
    else if (id === "code") { setNav("practice"); codePage(); }
    else if (id === "quiz") { setNav("practice"); quizZone(parts); }
    else if (id === "revise") { setNav("revise"); revisePage(); }
    else if (id === "factfiles") { setNav("revise"); factfilesPage(); }
    else if (id === "links") { setNav("links"); linksPage(); }
    else if (id === "tutorials") { setNav("tutorials"); tutorialsPage(parts[1]); }
    else if (id === "tut" && tutorial(parts[1])) { setNav("tutorials"); tutorialView(tutorial(parts[1])); }
    else if (id === "search") { setNav("search"); searchPage(); }
    else { setNav("home"); home(); }
  }
  var lastHash = location.hash;
  window.addEventListener("hashchange", function () {
    var a = lastHash.slice(1).split("-")[0], b = location.hash.slice(1).split("-")[0];
    lastHash = location.hash; route(); if (a !== b) window.scrollTo(0, 0);
    if (EMBED) { sentH = 0; postSize(a !== b); }
  });
  route();
  var sentH = 0;
  function postSize(nav) {
    if (!EMBED || window.parent === window) return;
    var h = Math.ceil(app.getBoundingClientRect().bottom + (window.scrollY || 0));
    if (!nav && Math.abs(h - sentH) < 2) return;
    sentH = h;
    try { window.parent.postMessage({ type: "dth-embed", h: h, hash: location.hash, nav: !!nav }, "*"); } catch (e) {}
  }
  if (EMBED) {
    if (window.ResizeObserver) new ResizeObserver(function () { postSize(false); }).observe(app);
    window.addEventListener("load", function () { postSize(false); });
    document.addEventListener("toggle", function () { postSize(false); }, true);
    setInterval(function () { postSize(false); }, 1000);
    postSize(false);
  }
})();
