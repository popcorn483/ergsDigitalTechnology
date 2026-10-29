// Printable worksheet and flashcard documents (shared by the website and the PDF build)
(function () {
  var C = (typeof window !== "undefined" ? window : global).COURSE;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function topic(id) { return C.topics.filter(function (t) { return t.id === id; })[0]; }
  function unitName(u) { var x = C.hub && C.hub.units.filter(function (y) { return y.id === u; })[0]; return x ? x.name : u === "U4" ? "Unit 4: Digital Development Concepts" : "Unit 1: Digital Technology"; }
  function qual() { return (C.hub && C.hub.qual) || "CCEA GCSE Digital Technology"; }
  function seeded(seed) { var s = 0; for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) % 2147483647; return function () { s = (s * 48271) % 2147483647; return s / 2147483647; }; }
  function shuffle(arr, seed) { var r = seeded(seed), a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function lessonTerms(l) { return C.gloss.filter(function (g) { return g[2] === l.id; }); }
  function matchSet(l) {
    var t = lessonTerms(l);
    if (t.length < 4) { var same = C.gloss.filter(function (g) { var x = C.lessons.filter(function (y) { return y.id === g[2]; })[0]; return x && x.t === l.t && g[2] !== l.id; }); t = t.concat(same); }
    return t.slice(0, 6);
  }
  function clozeParts(text) {
    var answers = [], html = text.replace(/\[\[(.+?)\]\]/g, function (_, a) { answers.push(a); return "\u0000" + (answers.length - 1) + "\u0000"; });
    return { answers: answers, text: html };
  }

  var CSS = "@page{size:A4;margin:14mm 14mm 16mm}*{box-sizing:border-box}body{font:10.5pt/1.45 'Atkinson Hyperlegible','Segoe UI',Arial,sans-serif;color:#15221c;margin:0;background:#fff}" +
    "h1,h2,h3{font-family:'Bricolage Grotesque','Segoe UI',Arial,sans-serif;margin:0}" +
    ".sheet{page-break-after:always}.sheet:last-child{page-break-after:auto}" +
    ".band{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #11503e;padding-bottom:6px;margin-bottom:10px}" +
    ".band small{font:600 7.5pt 'JetBrains Mono',Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;color:#a95a24}" +
    ".band h1{font-size:17pt;line-height:1.15;margin-top:2px}.badge{background:#11503e;color:#fff;border-radius:6px;padding:6px 10px;font:700 9pt 'JetBrains Mono',monospace;text-align:center;min-width:64px}" +
    ".who{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;margin-bottom:10px}.who div{border:1px solid #9fb3a8;border-radius:5px;padding:4px 8px;font-size:8pt;color:#56675e;height:30px}" +
    ".obj{background:#eef3ef;border-radius:6px;padding:7px 10px;margin-bottom:10px;font-size:9pt}.obj b{color:#11503e}" +
    ".sec{margin:12px 0 6px;display:flex;gap:8px;align-items:baseline;border-bottom:1px solid #d5ddd5;padding-bottom:3px}.sec .l{font:700 9pt 'JetBrains Mono',monospace;color:#fff;background:#a95a24;border-radius:4px;padding:1px 6px}.sec h2{font-size:12pt}.sec .m{margin-left:auto;font:8pt 'JetBrains Mono',monospace;color:#56675e}" +
    ".match{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px}.match .t{display:flex;gap:8px;align-items:center}.box{display:inline-block;width:22px;height:20px;border:1.5px solid #11503e;border-radius:4px;flex:none;text-align:center;font-weight:700;color:#2c7a4b}.match .d{font-size:9.5pt}.match .d b{color:#a95a24;margin-right:4px}" +
    ".bank{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px}.bank span{border:1px dashed #56675e;border-radius:4px;padding:1px 8px;font-size:9pt}.cloze{line-height:2.3}.gap{display:inline-block;min-width:90px;border-bottom:1.5px solid #15221c;text-align:center;color:#2c7a4b;font-weight:700}" +
    "table.tf{width:100%;border-collapse:collapse}table.tf td{border-bottom:1px solid #e4ece6;padding:4px 6px;font-size:9.5pt}table.tf td.c{width:46px;text-align:center}" +
    ".q{margin:8px 0 2px;display:flex;gap:8px}.q .n{font:700 9.5pt 'JetBrains Mono',monospace;color:#a95a24;min-width:22px}.q .tx{flex:1}.q .mk{font:8pt 'JetBrains Mono',monospace;color:#56675e;white-space:nowrap}" +
    ".lines div{border-bottom:1px solid #b9c6be;height:22px}.ans{white-space:pre-wrap;overflow-wrap:anywhere;color:#2c7a4b;font-size:9pt;background:#e8f4ec;border-left:3px solid #2c7a4b;padding:3px 8px;margin:2px 0 6px 30px}" +
    ".mcq{margin-left:30px;display:grid;grid-template-columns:1fr 1fr;gap:2px 14px;font-size:9.5pt}.foot{margin-top:10px;font:7.5pt 'JetBrains Mono',monospace;color:#56675e;display:flex;justify-content:space-between;border-top:1px solid #d5ddd5;padding-top:4px}" +
    "pre{background:#f3f6f1;border:1px solid #d5ddd5;border-radius:5px;padding:6px 8px;font:8.5pt/1.35 'JetBrains Mono',Consolas,monospace;margin:4px 0 4px 30px;white-space:pre-wrap}" +
    ".cards{display:grid;grid-template-columns:repeat(var(--cols),1fr);grid-auto-rows:var(--h);gap:0;border-top:1px dashed #9fb3a8;border-left:1px dashed #9fb3a8}.card{border-right:1px dashed #9fb3a8;border-bottom:1px dashed #9fb3a8;padding:8mm 7mm;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;position:relative;overflow:hidden}" +
    ".card .u{position:absolute;top:3mm;left:4mm;font:600 6.5pt 'JetBrains Mono',monospace;color:#a95a24;letter-spacing:.06em;text-transform:uppercase}.card .s{position:absolute;bottom:3mm;right:4mm;font:6.5pt 'JetBrains Mono',monospace;color:#7a8a82}" +
    ".card.f b{font:800 var(--fs) 'Bricolage Grotesque',Arial,sans-serif;color:#11503e;line-height:1.15}.card.b p{margin:0;font-size:var(--bs)}.card.colour.f{background:#eef3ef}.hint{font:8pt 'JetBrains Mono',monospace;color:#56675e;margin-bottom:4px}" +
    ".fig{margin:0 0 10px;border:1px solid #d5ddd5;border-radius:6px;padding:6px 8px;break-inside:avoid}.fig svg{display:block;width:100%;height:auto;max-height:var(--fh,64mm)}.fig figcaption{font-size:8pt;color:#56675e;margin-top:2px}" +
    ".ff-top{display:grid;grid-template-columns:1fr 1.35fr;gap:12px;align-items:start;margin-bottom:6px}.spec{margin:0;padding-left:16px;font-size:9pt}.spec li{margin-bottom:3px}.ffl{font-size:8.5pt;color:#56675e;margin-top:6px}" +
    ".cols2{columns:2;column-gap:7mm}.cols2 .blk{break-inside:avoid;margin-bottom:7px}.blk h3{font-size:10.5pt;color:#11503e;margin-bottom:1px}.blk p{margin:0;font-size:9.5pt}" +
    ".terms{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px}.terms div{border-left:3px solid #a95a24;padding:1px 7px;font-size:8.8pt;break-inside:avoid}.terms b{display:block;font-size:9.3pt}.terms i{display:block;font:normal 7pt 'JetBrains Mono',monospace;color:#a95a24}" +
    ".exam{background:#fbf0db;border-radius:6px;padding:7px 10px;margin-top:8px;font-size:9pt;break-inside:avoid}.exam h3{font-size:10.5pt;margin-bottom:3px}table.pp{width:100%;border-collapse:collapse;margin-top:4px}table.pp td{border-top:1px solid #ead8b5;padding:2px 4px;font-size:8.3pt;vertical-align:top}table.pp td.n{white-space:nowrap;font-family:'JetBrains Mono',monospace}" +
    ".chk{margin-top:8px;break-inside:avoid}.chk ol{margin:3px 0 0;padding-left:18px;font-size:9.2pt}.chk .a{white-space:pre-wrap;overflow-wrap:anywhere;font-size:7.8pt;color:#56675e;margin-top:4px;border-top:1px dashed #b9c6be;padding-top:3px}" +
    "@media screen{body{background:#e9ede9}.sheet{background:#fff;width:210mm;min-height:297mm;margin:12px auto;padding:14mm;box-shadow:0 2px 10px rgba(0,0,0,.12)}.note{max-width:210mm;margin:12px auto;font:10pt Arial;color:#11503e;background:#fff;padding:10px 14px;border-radius:6px}}";
  var FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Atkinson+Hyperlegible:wght@400;700&family=JetBrains+Mono:wght@400;600;700&display=swap">';

  function doc(title, body, screenNote) {
    return "<!doctype html><html lang=\"en-GB\"><head><meta charset=\"utf-8\"><title>" + esc(title) + "</title>" + FONTS + "<style>" + CSS + "</style></head><body>" +
      (screenNote ? '<div class="note">' + screenNote + "</div>" : "") + body + "</body></html>";
  }
  function fig(id, cap, h) {
    var D = (typeof window !== "undefined" ? window : global).Diagrams;
    if (!D || !D.has(id)) return "";
    return '<figure class="fig"' + (h ? ' style="--fh:' + h + '"' : "") + ">" + D.svg(id, D.pal.light) + "<figcaption>" + esc(cap || D.caption(id)) + "</figcaption></figure>";
  }
  function lines(n) { var h = '<div class="lines">'; for (var i = 0; i < n; i++) h += "<div></div>"; return h + "</div>"; }

  function worksheet(l, opts) {
    opts = opts || {};
    var ans = !!opts.answers, t = topic(l.t), u = t.u, total = 0;
    var h = '<section class="sheet"><div class="band"><div><small>' + esc(unitName(u)) + " · " + esc(t.name) + "</small><h1>" + esc(l.title) + '</h1></div><div class="badge">' + l.id + "<br>" + (ans ? "ANSWERS" : "WORKSHEET") + "</div></div>";
    if (!ans) h += '<div class="who"><div>Name</div><div>Class</div><div>Date</div><div>Score</div></div>';
    h += '<div class="obj"><b>I can:</b> ' + l.obj.map(esc).join(" · ") + "</div>";
    if (opts.diagram !== false) h += fig(l.id, "Use this diagram to help you: " + ((typeof window !== "undefined" ? window : global).Diagrams || { caption: function () { return ""; } }).caption(l.id), "58mm");
    var ms = matchSet(l), letters = "ABCDEF";
    if (ms.length >= 3) {
      var defs = shuffle(ms, l.id);
      h += '<div class="sec"><span class="l">A</span><h2>Key terms</h2><span class="m">Write the letter of the matching definition · ' + ms.length + " marks</span></div><div class=\"match\">";
      ms.forEach(function (m, i) {
        h += '<div class="t"><span class="box">' + (ans ? letters[defs.indexOf(m)] : "") + "</span><b>" + esc(m[0]) + '</b></div><div class="d"><b>' + letters[i] + "</b>" + esc(defs[i][1]) + "</div>";
      });
      h += "</div>"; total += ms.length;
    }
    if (l.cloze) {
      var cz = clozeParts(l.cloze), bank = shuffle(cz.answers, l.id + "b");
      h += '<div class="sec"><span class="l">B</span><h2>Fill the gaps</h2><span class="m">Use the word bank · ' + cz.answers.length + " marks</span></div>";
      h += '<div class="bank">' + bank.map(function (b) { return "<span>" + esc(b) + "</span>"; }).join("") + "</div>";
      h += '<p class="cloze">' + esc(cz.text).replace(/\u0000(\d+)\u0000/g, function (_, i) { return '<span class="gap">' + (ans ? esc(cz.answers[+i]) : "") + "</span>"; }) + "</p>";
      total += cz.answers.length;
    }
    if (l.tf) {
      h += '<div class="sec"><span class="l">C</span><h2>True or false?</h2><span class="m">Tick one box · ' + l.tf.length + ' marks</span></div><table class="tf"><tr><td></td><td class="c"><b>True</b></td><td class="c"><b>False</b></td></tr>';
      l.tf.forEach(function (s) { h += "<tr><td>" + esc(s[0]) + (ans && s[2] ? ' <i style="color:#2c7a4b">(' + esc(s[2]) + ")</i>" : "") + '</td><td class="c"><span class="box">' + (ans && s[1] ? "✓" : "") + '</span></td><td class="c"><span class="box">' + (ans && !s[1] ? "✓" : "") + "</span></td></tr>"; });
      h += "</table>"; total += l.tf.length;
    }
    var wsm = l.ws.reduce(function (a, b) { return a + b.m; }, 0);
    h += '<div class="sec"><span class="l">D</span><h2>Exam-style questions</h2><span class="m">' + wsm + " marks</span></div>";
    l.ws.forEach(function (w, i) {
      h += '<div class="q"><span class="n">' + (i + 1) + '</span><span class="tx">' + esc(w.q) + '</span><span class="mk">[' + w.m + "]</span></div>";
      h += ans ? '<div class="ans">' + esc(w.a) + "</div>" : lines(w.m >= 6 ? 10 : Math.max(2, w.m + 1));
    });
    total += wsm;
    if (opts.quiz !== false) {
      h += '<div class="sec"><span class="l">E</span><h2>Quick quiz</h2><span class="m">Circle one answer · ' + l.quiz.length + " marks</span></div>";
      l.quiz.forEach(function (q, i) {
        h += '<div class="q"><span class="n">' + (i + 1) + '</span><span class="tx">' + esc(q[0]) + '</span><span class="mk">[1]</span></div><div class="mcq">' +
          q[1].map(function (o, k) { var right = ans && k === q[2]; return "<span" + (right ? ' style="color:#2c7a4b;font-weight:700"' : "") + ">" + "ABCD"[k] + "  " + esc(o) + (right ? " ✓" : "") + "</span>"; }).join("") + "</div>";
      });
      total += l.quiz.length;
    }
    h += '<div class="foot"><span>' + esc(qual()) + " · " + esc(unitName(u)) + "</span><span>Total: ____ / " + total + "</span></div></section>";
    return h;
  }

  function worksheets(list, opts) {
    var title = list.length === 1 ? list[0].id + " " + list[0].title + (opts && opts.answers ? " – answers" : " – worksheet") : "Digital Technology worksheets";
    return doc(title, list.map(function (l) { return worksheet(l, opts); }).join(""), opts && opts.screen ? "Print this page (Ctrl+P / Cmd+P) on A4. Set margins to Default and turn on background graphics." : "");
  }

  // Flashcards: cards = [{f, b, tag}] ; opts {per: 8|12, colour, double}
  function flashcards(cards, opts) {
    opts = opts || {};
    var per = opts.per || 8, cols = per === 12 ? 3 : 2, rows = per === 12 ? 4 : 4, hgt = per === 12 ? "60mm" : "62mm";
    var fs = per === 12 ? "13pt" : "17pt", bs = per === 12 ? "8.5pt" : "10pt";
    var style = "--cols:" + cols + ";--h:" + hgt + ";--fs:" + fs + ";--bs:" + bs;
    var h = "";
    for (var i = 0; i < cards.length; i += per) {
      var chunk = cards.slice(i, i + per);
      h += '<section class="sheet"><p class="hint">Fronts · page ' + (i / per + 1) + ' · cut along the dashed lines</p><div class="cards" style="' + style + '">';
      chunk.forEach(function (c) { h += '<div class="card f' + (opts.colour ? " colour" : "") + '"><span class="u">' + esc(c.tag || "") + "</span><b>" + esc(c.f) + "</b></div>"; });
      h += "</div></section>";
      if (opts.double !== false) {
        // mirror each row so backs line up when printed double-sided (flip on long edge)
        var backs = [];
        for (var r = 0; r < Math.ceil(chunk.length / cols); r++) {
          var row = chunk.slice(r * cols, r * cols + cols);
          while (row.length < cols) row.push(null);
          backs = backs.concat(row.reverse());
        }
        h += '<section class="sheet"><p class="hint">Backs · print double-sided, flip on long edge</p><div class="cards" style="' + style + '">';
        backs.forEach(function (c) { h += c ? '<div class="card b"><p>' + esc(c.b) + '</p><span class="s">' + esc(c.f) + "</span></div>" : '<div class="card"></div>'; });
        h += "</div></section>";
      }
    }
    return doc(opts.title || "Flashcards", h, opts.screen ? "Print on A4 (Ctrl+P / Cmd+P). For double-sided cards choose 'Flip on long edge'. Turn on background graphics for coloured cards." : "");
  }

  // Fact file: one designed A4 sheet (or two) per lesson
  function ppFor(id) { var out = []; (C.pastpapers || []).forEach(function (p) { p.qs.forEach(function (q) { if (q[3].indexOf(id) > -1) out.push([p, q]); }); }); return out; }
  function factfile(l) {
    var t = topic(l.t), u = t.u, notes = (l.notes || []).filter(function (n) { return !/exam/i.test(n.h); }), exam = (l.notes || []).filter(function (n) { return /exam/i.test(n.h); })[0];
    var terms = lessonTerms(l), pp = ppFor(l.id), us = u === "U4" ? "Unit 4" : "Unit 1";
    var h = '<section class="sheet"><div class="band"><div><small>' + esc(unitName(u)) + " · " + esc(t.name) + "</small><h1>" + esc(l.title) + '</h1></div><div class="badge">' + l.id + "<br>FACT FILE</div></div>";
    h += '<div class="ff-top"><div><div class="obj" style="margin-bottom:6px"><b>Specification: students should be able to</b></div><ul class="spec">' + l.spec.map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("") + "</ul>" +
      (l.ff && l.ff.length ? '<p class="ffl">CCEA fact file: ' + l.ff.map(function (k) { return esc((C.factfiles[k] || [k])[0]); }).join(", ") + "</p>" : "") +
      '<p class="ffl"><b>Key words:</b> ' + l.kw.map(esc).join(", ") + "</p></div>" + fig(l.id, null, "70mm") + "</div>";
    h += '<div class="cols2">' + notes.map(function (n) { return '<div class="blk"><h3>' + esc(n.h) + "</h3><p>" + esc(n.p) + "</p></div>"; }).join("") + "</div>";
    if (terms.length) h += '<div class="sec"><span class="l">T</span><h2>Key terms from the mark schemes</h2></div><div class="terms">' + terms.map(function (g) { return "<div><b>" + esc(g[0]) + "</b>" + esc(g[1]) + (g[3] ? "<i>Credited: " + esc(g[3]) + "</i>" : "") + "</div>"; }).join("") + "</div>";
    var code = l.slides.filter(function (s) { return s.code && (s.code.cs || s.code.py || s.code.vba); })[0];
    if (code) h += '<div class="sec"><span class="l">C</span><h2>' + (code.code.vba ? "VBA example (Microsoft Access)" : "C# example") + '</h2><span class="m">' + esc(code.h) + "</span></div><pre style=\"margin-left:0\">" + esc(code.code.vba || code.code.cs || code.code.py) + "</pre>";
    h += '<div class="exam"><h3>Exam focus</h3>' + (exam ? "<p>" + esc(exam.p) + "</p>" : "") + (pp.length ? '<table class="pp">' + pp.slice(-5).reverse().map(function (x) { return '<tr><td class="n">' + us + " " + x[0].y + " Q" + esc(x[1][0]) + '</td><td class="n">[' + x[1][1] + "]</td><td>" + esc(x[1][2]) + "</td></tr>"; }).join("") + "</table>" : "") + "</div>";
    var qs = l.ws.slice(0, 3);
    h += '<div class="chk"><div class="sec" style="margin-top:4px"><span class="l">?</span><h2>Check yourself</h2></div><ol>' + qs.map(function (w) { return "<li>" + esc(w.q) + ' <span class="mk">[' + w.m + "]</span></li>"; }).join("") + '</ol>' + (qs.every(function (w) { return w.a; }) ? '<p class="a"><b>Answers:</b> ' + qs.map(function (w, i) { return (i + 1) + ". " + esc(w.a); }).join(" &nbsp; ") + "</p>" : "") + "</div>";
    h += '<div class="foot"><span>' + esc(qual()) + " · " + esc(unitName(u)) + "</span><span>" + l.id + " fact file</span></div></section>";
    return h;
  }
  function factfiles(list, opts) {
    var title = list.length === 1 ? list[0].id + " " + list[0].title + " – fact file" : "Digital Technology fact files";
    return doc(title, list.map(factfile).join(""), opts && opts.screen ? "Print this page (Ctrl+P / Cmd+P) on A4 with background graphics on." : "");
  }

  C.print = { factfile: factfiles, worksheet: worksheets, flashcards: flashcards, matchSet: matchSet, clozeParts: clozeParts, shuffle: shuffle, lessonTerms: lessonTerms };
})();
