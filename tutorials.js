// Step-by-step tutorials: data in COURSE.tutorials, drawn here.
// Each step can carry instructions, code (cs runs in the page; ps, vba, sql, html are shown with Copy),
// a drawn flowchart (flow), a trace table (trace), a mock-up of what Access should look like (ui),
// tips, warnings and a quick check question.
(function (root) {
  "use strict";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ---------- syntax highlighting for display-only languages ----------
  var VBA_KW = "And As Boolean ByRef ByVal Call Case Const Currency Date Dim Do Double Each Else ElseIf End Error Exit False For Function GoTo If In Integer Is Long Loop Me Mod New Next Not Nothing Null On Option Or Private Property Public ReDim Resume Select Set Single Static Step String Sub Then To True Until Variant Wend While With".split(" ");
  var SQL_KW = "SELECT FROM WHERE AND OR NOT ORDER BY GROUP HAVING INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE PRIMARY KEY FOREIGN REFERENCES INNER LEFT RIGHT JOIN ON AS LIKE BETWEEN IN IS NULL COUNT SUM AVG MIN MAX DISTINCT ASC DESC TOP PARAMETERS".split(" ");
  function hlWords(code, words, commentRe, ci) {
    var out = "", re = /("(?:[^"]|"")*"|'[^\n]*|--[^\n]*|\b[A-Za-z_][A-Za-z0-9_]*\b|\b\d+(?:\.\d+)?\b|[\s\S])/g, m;
    while ((m = re.exec(code))) {
      var t = m[0];
      if (t[0] === '"') out += '<span class="s">' + esc(t) + "</span>";
      else if (commentRe.test(t)) out += '<span class="c">' + esc(t) + "</span>";
      else if (/^\d/.test(t)) out += '<span class="n">' + t + "</span>";
      else if (words.indexOf(ci ? t.toUpperCase() : t) > -1) out += '<span class="k">' + t + "</span>";
      else out += esc(t);
    }
    return out;
  }
  function hlVBA(c) { return hlWords(c, VBA_KW, /^'/, false); }
  function hlSQL(c) { return hlWords(c, SQL_KW, /^--/, true).replace(/'([^'<]*)'/g, "<span class=\"s\">'$1'</span>"); }
  function hlHTML(c) { return esc(c).replace(/(&lt;\/?)([a-zA-Z0-9]+)/g, '$1<span class="k">$2</span>').replace(/([a-z-]+)=(&quot;[^&]*&quot;)/g, '<span class="n">$1</span>=<span class="s">$2</span>'); }

  // ---------- flowcharts drawn from a node list ----------
  // nodes: {k:"start"|"stop"|"io"|"proc"|"sub", s} | {k:"if", s, yes:[], no:[]} | {k:"while"|"for", s, body:[]} | {k:"repeat", s, body:[]}
  var CW = 7.4, LH = 17, GAP = 24;
  function tw(s) { return Math.max.apply(null, String(s).split("\n").map(function (x) { return x.length; })) * CW; }
  function nl(s) { return String(s).split("\n").length; }
  function txt(x, y, s, cls) { var ls = String(s).split("\n"), y0 = y - (ls.length - 1) * LH / 2; return ls.map(function (l, i) { return '<text x="' + x + '" y="' + (y0 + i * LH) + '" class="' + (cls || "ft") + '">' + esc(l) + "</text>"; }).join(""); }
  function arrow(x1, y1, x2, y2) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="fa" marker-end="url(#fah)"/>'; }
  function line(pts) { return '<polyline points="' + pts.map(function (p) { return p.join(","); }).join(" ") + '" class="fl"/>'; }
  function poly(pts, end) { return '<polyline points="' + pts.map(function (p) { return p.join(","); }).join(" ") + '" class="fa"' + (end ? ' marker-end="url(#fah)"' : "") + "/>"; }
  function node(n) {
    var w, h;
    if (n.k === "if") return ifNode(n);
    if (n.k === "while" || n.k === "for") return loopNode(n);
    if (n.k === "repeat") return repeatNode(n);
    w = Math.max(n.k === "start" || n.k === "stop" ? 90 : 120, tw(n.s) + 34); h = 22 + nl(n.s) * LH;
    var ww = w + (n.k === "io" ? 24 : 0);
    return { w: ww, l: ww / 2, r: ww / 2, h: h, draw: function (cx, y) {
      var x = cx - w / 2, sh;
      if (n.k === "start" || n.k === "stop") sh = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + h / 2 + '" class="fs-term"/>';
      else if (n.k === "io") sh = '<polygon points="' + (x + 12) + "," + y + " " + (x + w + 12) + "," + y + " " + (x + w - 12) + "," + (y + h) + " " + (x - 12) + "," + (y + h) + '" class="fs-io"/>';
      else if (n.k === "sub") sh = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" class="fs-proc"/><line x1="' + (x + 9) + '" y1="' + y + '" x2="' + (x + 9) + '" y2="' + (y + h) + '" class="fl"/><line x1="' + (x + w - 9) + '" y1="' + y + '" x2="' + (x + w - 9) + '" y2="' + (y + h) + '" class="fl"/>';
      else sh = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" class="fs-proc"/>';
      return sh + txt(cx, y + h / 2 + 5, n.s, n.k === "start" || n.k === "stop" ? "ft tb" : "ft");
    } };
  }
  function seq(list) {
    var parts = (list || []).map(node), h = 0;
    var l = Math.max.apply(null, [30].concat(parts.map(function (p) { return p.l; }))), r = Math.max.apply(null, [30].concat(parts.map(function (p) { return p.r; })));
    parts.forEach(function (p, i) { h += p.h + (i ? GAP : 0); });
    return { w: l + r, l: l, r: r, h: h, empty: !parts.length, draw: function (cx, y) {
      var out = "", yy = y;
      parts.forEach(function (p, i) { if (i) { out += arrow(cx, yy, cx, yy + GAP); yy += GAP; } out += p.draw(cx, yy); yy += p.h; });
      return out;
    } };
  }
  function diamond(cx, y, w, h, s) { return '<polygon points="' + cx + "," + y + " " + (cx + w / 2) + "," + (y + h / 2) + " " + cx + "," + (y + h) + " " + (cx - w / 2) + "," + (y + h / 2) + '" class="fs-dec"/>' + txt(cx, y + h / 2 + 5, s); }
  function dsize(s) { return { w: Math.max(130, tw(s) * 1.25 + 50), h: Math.max(64, 30 + nl(s) * LH * 1.4) }; }
  function ifNode(n) {
    var d = dsize(n.s), Y = seq(n.yes), N = seq(n.no), g = 22;
    // branch centres sit outside the diamond's tips, so connecting lines never cross it
    var offL = Math.max(d.w / 2 + 22, Y.r + g / 2), offR = Math.max(d.w / 2 + 22, N.l + g / 2);
    var L = Math.max(offL + Y.l, d.w / 2), Rr = Math.max(offR + N.r, d.w / 2), bodyH = Math.max(Y.h, N.h), h = d.h + 30 + bodyH + 34;
    return { w: L + Rr, l: L, r: Rr, h: h, draw: function (cx, y) {
      var lx = cx - offL, rx = cx + offR, dy = y + d.h / 2, by = y + d.h + 30, my = by + bodyH + 18;
      var out = diamond(cx, y, d.w, d.h, n.s);
      out += poly([[cx - d.w / 2, dy], [lx, dy], [lx, by]], !Y.empty) + '<text x="' + (cx - d.w / 2 - 6) + '" y="' + (dy - 6) + '" class="ft yn" text-anchor="end">Yes</text>';
      out += poly([[cx + d.w / 2, dy], [rx, dy], [rx, by]], !N.empty) + '<text x="' + (cx + d.w / 2 + 6) + '" y="' + (dy - 6) + '" class="ft yn" text-anchor="start">No</text>';
      out += Y.draw(lx, by) + N.draw(rx, by);
      out += line([[lx, by + (Y.empty ? 0 : Y.h)], [lx, my], [cx, my]]) + line([[rx, by + (N.empty ? 0 : N.h)], [rx, my], [cx, my]]);
      return out + line([[cx, my], [cx, y + h]]);
    } };
  }
  function loopNode(n) {
    var d = dsize(n.s), B = seq(n.body), side = 46, bl = Math.max(d.w / 2, B.l), br = Math.max(d.w / 2, B.r);
    var h = 18 + d.h + GAP + B.h + 30 + 22;
    return { w: bl + br + side * 2, l: bl + side, r: br + side, h: h, draw: function (cx, y) {
      var top = y + 18, by = top + d.h + GAP, end = by + B.h, lx = cx - bl - side / 1.4, rx = cx + br + side / 1.4;
      var out = line([[cx, y], [cx, top]]) + diamond(cx, top, d.w, d.h, n.s);
      out += arrow(cx, top + d.h, cx, by) + '<text x="' + (cx + 8) + '" y="' + (top + d.h + 15) + '" class="ft yn" text-anchor="start">Yes</text>';
      out += B.draw(cx, by);
      out += poly([[cx, end], [cx, end + 14], [lx, end + 14], [lx, y + 8], [cx, y + 8]], true);
      out += poly([[cx + d.w / 2, top + d.h / 2], [rx, top + d.h / 2], [rx, end + 30], [cx, end + 30], [cx, y + h]], false) + '<text x="' + (cx + d.w / 2 + 8) + '" y="' + (top + d.h / 2 - 6) + '" class="ft yn" text-anchor="start">No</text>';
      return out;
    } };
  }
  function repeatNode(n) {
    var d = dsize(n.s), B = seq(n.body), side = 46, bl = Math.max(d.w / 2, B.l), br = Math.max(d.w / 2, B.r);
    var h = 16 + B.h + GAP + d.h + 26;
    return { w: bl + br + side, l: bl + side, r: br, h: h, draw: function (cx, y) {
      var by = y + 16, dt = by + B.h + GAP, lx = cx - bl - side / 1.4;
      var out = line([[cx, y], [cx, by]]) + B.draw(cx, by) + arrow(cx, by + B.h, cx, dt) + diamond(cx, dt, d.w, d.h, n.s);
      out += poly([[cx - d.w / 2, dt + d.h / 2], [lx, dt + d.h / 2], [lx, y + 8], [cx, y + 8]], true) + '<text x="' + (cx - d.w / 2 - 8) + '" y="' + (dt + d.h / 2 - 6) + '" class="ft yn" text-anchor="end">No</text>';
      out += line([[cx, dt + d.h], [cx, y + h]]) + '<text x="' + (cx + 8) + '" y="' + (dt + d.h + 15) + '" class="ft yn" text-anchor="start">Yes</text>';
      return out;
    } };
  }
  function flowSVG(list, cap) {
    var S = seq(list), pad = 24, W = Math.ceil(S.l + S.r + pad * 2), H = Math.ceil(S.h + pad * 2);
    return '<figure class="flow"><svg viewBox="0 0 ' + W + " " + H + '" style="max-width:' + W + 'px" role="img" aria-label="' + esc(cap || "Flowchart") + '"><defs><marker id="fah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="fhead"/></marker></defs>' + S.draw(pad + S.l, pad) + "</svg>" + (cap ? "<figcaption>" + esc(cap) + "</figcaption>" : "") + "</figure>";
  }

  // ---------- Access mock-ups ----------
  function grid(rows, cls) { return '<table class="' + (cls || "") + '"><thead><tr>' + rows[0].map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.slice(1).map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>"; }
  function win(title, body, icon) { return '<div class="axw"><div class="axt"><span class="axi">' + (icon || "▦") + "</span>" + esc(title) + '<span class="axx">✕</span></div><div class="axb">' + body + "</div></div>"; }
  function uiHTML(u) {
    switch (u.type) {
      case "ribbon": return '<div class="axr">' + u.path.map(function (p, i) { return (i ? '<span class="axa">▸</span>' : "") + '<span class="axk">' + esc(p) + "</span>"; }).join("") + (u.note ? '<span class="muted small"> ' + esc(u.note) + "</span>" : "") + "</div>";
      case "table": {
        var rows = [["", "Field Name", "Data Type", "Description (optional)"]].concat(u.fields.map(function (f) { return [f[0] === u.key || (u.keys || []).indexOf(f[0]) > -1 ? "🔑" : "", f[0], f[1], f[2] || ""]; }));
        var props = u.props ? '<div class="axp"><div class="axpt">Field Properties' + (u.propsFor ? " – " + esc(u.propsFor) : "") + "</div>" + grid([["Property", "Setting"]].concat(u.props), "axg") + "</div>" : "";
        return win(u.title || "Table : Design view", grid(rows, "axg axd") + props);
      }
      case "datasheet": return win(u.title || "Datasheet view", grid([u.cols].concat(u.rows), "axg") + '<div class="axn">Record: ◂ 1 of ' + u.rows.length + " ▸</div>");
      case "rel": {
        var links = (u.links || []).map(function (k) { return '<li><b>' + esc(k[0]) + "</b> → <b>" + esc(k[1]) + "</b> <span class=\"tag\">" + esc(k[2] || "1 : ∞") + "</span>" + (k[3] ? ' <span class="muted small">' + esc(k[3]) + "</span>" : "") + "</li>"; }).join("");
        return win(u.title || "Relationships", '<div class="axrel">' + u.tables.map(function (t) { return '<div class="axtb"><div class="axth">' + esc(t.name) + "</div>" + t.fields.map(function (f, i) { return "<div" + (i === 0 || (t.key || []).indexOf(f) > -1 ? ' class="pk"' : "") + ">" + (i === 0 || (t.key || []).indexOf(f) > -1 ? "🔑 " : "") + esc(f) + "</div>"; }).join("") + "</div>"; }).join("") + "</div>" + (links ? '<ul class="axlinks">' + links + "</ul>" : ""), "⧉");
      }
      case "query": {
        var g = u.grid, labels = ["Field", "Table", "Total", "Update To", "Append To", "Sort", "Show", "Criteria", "or"].filter(function (k) { return g[k]; }), n = g.Field.length;
        var body = '<div class="axrel">' + (u.tables || []).map(function (t) { return '<div class="axtb sm"><div class="axth">' + esc(t.name || t) + "</div>" + (t.fields || []).map(function (f) { return "<div>" + esc(f) + "</div>"; }).join("") + "</div>"; }).join("") + "</div>";
        body += '<table class="axg axq"><tbody>' + labels.map(function (k) { return "<tr><th>" + k + ":</th>" + Array.from({ length: n }, function (_, i) { var v = g[k][i]; return "<td>" + (k === "Show" ? (v ? "☑" : "☐") : esc(v || "")) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>";
        return win(u.title || "Query : Design view", body, "⌕");
      }
      case "form": return win(u.title || "Form", '<div class="axf">' + (u.heading ? '<div class="axfh">' + esc(u.heading) + "</div>" : "") + u.controls.map(function (c) {
        var ctl;
        if (c.kind === "button") return '<div class="axfr"><span></span><span class="axbtn">' + esc(c.label) + "</span>" + (c.note ? '<span class="axnote">' + esc(c.note) + "</span>" : "") + "</div>";
        if (c.kind === "check") ctl = '<span class="axin">' + (c.value ? "☑" : "☐") + "</span>";
        else if (c.kind === "combo") ctl = '<span class="axin">' + esc(c.value || "") + ' <b>▾</b></span>';
        else if (c.kind === "subform") ctl = '<div class="axsub">' + grid([c.cols].concat(c.rows || []), "axg") + "</div>";
        else if (c.kind === "label") return '<div class="axfr full"><span class="axlab">' + esc(c.label) + "</span></div>";
        else ctl = '<span class="axin' + (c.bad ? " bad" : "") + '">' + esc(c.value || "") + "</span>";
        return '<div class="axfr' + (c.kind === "subform" ? " full" : "") + '"><span>' + esc(c.label || "") + "</span>" + ctl + (c.note ? '<span class="axnote">' + esc(c.note) + "</span>" : "") + "</div>";
      }).join("") + "</div>", "▤");
      case "props": return win(u.title || "Property Sheet", (u.sel ? '<div class="axn">Selection type: ' + esc(u.sel) + "</div>" : "") + grid([["Property", "Setting"]].concat(u.rows), "axg") , "☰");
      case "report": return win(u.title || "Report", '<div class="axrep"><div class="axfh">' + esc(u.heading || u.title || "") + "</div>" + (u.groups || [{ rows: u.rows }]).map(function (g) { return (g.name ? '<div class="axgrp">' + esc(g.name) + "</div>" : "") + grid([u.cols].concat(g.rows || []), "axg") + (g.total ? '<div class="axtot">' + esc(g.total) + "</div>" : ""); }).join("") + (u.footer ? '<div class="axtot">' + esc(u.footer) + "</div>" : "") + "</div>", "▥");
      case "msgbox": return '<div class="axmsg"><div class="axt">' + esc(u.title || "Microsoft Access") + '</div><div class="axmb"><span class="axmi">' + ({ info: "ℹ", warn: "⚠", stop: "⛔", q: "?" }[u.icon] || "ℹ") + "</span>" + esc(u.text) + '</div><div class="axmbtn">' + (u.buttons || ["OK"]).map(function (b) { return '<span class="axbtn">' + esc(b) + "</span>"; }).join("") + "</div></div>";
      case "vbe": return win("Microsoft Visual Basic for Applications – " + (u.module || "Form_frmBooking"), '<div class="axvbe"><span class="axk">' + esc(u.object || "(General)") + ' ▾</span><span class="axk">' + esc(u.proc || "(Declarations)") + " ▾</span></div>", "⌨");
      case "relations": { // relations in standard notation: TABLE(PK underlined, FK* in italics, {repeating group})
        var stage = u.stage ? '<span class="rstage">' + esc(u.stage) + "</span>" : "";
        return '<div class="rels">' + stage + (u.title ? '<b class="small">' + esc(u.title) + "</b>" : "") + u.rels.map(function (r) {
          var pk = r.pk || [], fk = r.fk || [], rg = r.rg || [], inRg = false, parts = [];
          r.attrs.forEach(function (a, i) {
            var cls = (pk.indexOf(a) > -1 ? "pk" : "") + (fk.indexOf(a) > -1 ? " fk" : ""), t = '<span class="' + cls + '">' + esc(a) + (fk.indexOf(a) > -1 ? "*" : "") + "</span>";
            if (rg.indexOf(a) > -1 && !inRg) { t = '<span class="rg">{</span>' + t; inRg = true; }
            if (inRg && (i === r.attrs.length - 1 || rg.indexOf(r.attrs[i + 1]) < 0)) { t += '<span class="rg">}</span>'; inRg = false; }
            parts.push(t);
          });
          return '<div class="rel' + (r.hl ? " hl" : "") + '"><b>' + esc(r.name) + "</b>(" + parts.join(", ") + ")" + (r.note ? '<span class="rnote">' + esc(r.note) + "</span>" : "") + "</div>";
        }).join("") + '<div class="rkey">Key: <span class="pk">primary key</span> · <span class="fk">foreign key*</span>' + (u.rels.some(function (r) { return r.rg && r.rg.length; }) ? ' · <span class="rg">{ repeating group }</span>' : "") + "</div></div>";
      }
      case "deps": // functional dependencies: determinant → dependants, labelled full / partial / transitive
        return '<div class="deps">' + (u.title ? '<b class="small">' + esc(u.title) + "</b>" : "") + u.deps.map(function (d) {
          return '<div class="dep ' + esc(d[2] || "full") + '"><span class="det">' + esc(d[0]) + '</span><span class="arr">→</span><span class="dpd">' + esc(d[1]) + '</span><span class="dk">' + esc({ full: "full dependency", partial: "partial dependency", transitive: "transitive dependency", key: "candidate key" }[d[2] || "full"] || d[2]) + "</span>" + (d[3] ? '<span class="rnote">' + esc(d[3]) + "</span>" : "") + "</div>";
        }).join("") + "</div>";
      case "nav": return win(u.title || "Navigation Pane", '<div class="axnav">' + u.groups.map(function (g) { return '<div class="axgrp">' + esc(g.name) + "</div>" + g.items.map(function (i) { return "<div>" + esc(i) + "</div>"; }).join(""); }).join("") + "</div>", "☰");
    }
    return "";
  }

  // ---------- one tutorial ----------
  function codeBlock(lang, code, api) {
    if (lang === "cs" || lang === "ps") { var o = {}; o[lang] = code; return api.codeHTML(o); }
    var label = { vba: "VBA", sql: "SQL", html: "HTML" }[lang] || lang, i = (api.copyStore.push(code) - 1);
    var h = lang === "vba" ? hlVBA(code) : lang === "sql" ? hlSQL(code) : hlHTML(code);
    return '<div class="code"><div class="ch"><span>' + label + '</span><button class="btn sm" data-tcopy="' + i + '">Copy</button></div><pre>' + h + "</pre></div>";
  }
  function para(p) { return (Array.isArray(p) ? p : p ? String(p).split(/\n+/) : []).map(function (x) { return "<p>" + esc(x).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>") + "</p>"; }).join(""); }
  function inl(x) { return esc(x).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>"); }
  function stepHTML(st, i, done, api) {
    var h = '<section class="panel tstep' + (done ? " done" : "") + '" id="tst' + i + '"><div class="tsh"><span class="tsn">' + (i + 1) + "</span><h3>" + inl(st.h) + '</h3><label class="tdone"><input type="checkbox" data-step="' + i + '"' + (done ? " checked" : "") + "> Done</label></div>";
    h += para(st.p);
    if (st.do) h += '<ol class="tdo">' + st.do.map(function (d) { return "<li>" + inl(d) + "</li>"; }).join("") + "</ol>";
    if (st.ui) h += '<div class="tui">' + (Array.isArray(st.ui) ? st.ui : [st.ui]).map(uiHTML).join("") + "</div>";
    if (st.flow) h += flowSVG(st.flow, st.flowCap);
    var codes = ["ps", "cs", "vba", "sql", "html"].filter(function (k) { return st.code && st.code[k]; });
    if (codes.length) h += '<div class="tcode' + (codes.length > 1 ? " two" : "") + '">' + codes.map(function (k) { return codeBlock(k, st.code[k], api); }).join("") + "</div>" + (st.code.caption ? '<p class="muted small">' + inl(st.code.caption) + "</p>" : "");
    if (st.trace) h += '<div class="tbl-wrap ttrace">' + (st.trace.caption ? '<p class="small"><b>' + inl(st.trace.caption) + "</b></p>" : "") + grid([st.trace.head].concat(st.trace.rows), "") + "</div>";
    if (st.tip) h += '<p class="ttip"><b>Tip</b> ' + inl(st.tip) + "</p>";
    if (st.warn) h += '<p class="twarn"><b>Watch out</b> ' + inl(st.warn) + "</p>";
    if (st.check) { var q = st.check; h += '<div class="ichk" data-c="' + q[2] + '"><p><b>Check:</b> ' + inl(q[0]) + '</p><div class="iopts">' + q[1].map(function (o, k) { return '<button type="button" class="iopt" data-k="' + k + '"><span>' + "ABCD"[k] + "</span>" + inl(o) + "</button>"; }).join("") + '</div><p class="ifb" aria-live="polite"></p><p class="iwhy" hidden>' + inl(q[3] || "") + "</p></div>"; }
    return h + "</section>";
  }
  function progress(api, t) { var d = api.store.get("tut." + t.id, []); return { done: d.length, total: t.steps.length, pct: Math.round(100 * d.length / t.steps.length) }; }
  function render(el, t, api, ctx) {
    var done = api.store.get("tut." + t.id, []), series = ctx.series, list = ctx.list, idx = list.indexOf(t);
    var h = '<div class="stack tut"><a class="muted small" href="#tutorials-' + t.series + '">← ' + esc(series.name) + '</a><span class="eyebrow">' + esc(series.name) + " · Tutorial " + (idx + 1) + " of " + list.length + "</span><h1>" + esc(t.title) + "</h1>";
    h += '<div class="row small muted tmeta"><span>⏱ about ' + t.mins + " min</span><span>" + esc(t.level || "") + "</span>" + (t.l ? '<a href="#' + t.l + '">Lesson ' + t.l + "</a>" : "") + "</div>";
    h += '<div class="panel stack tgoal"><p><b>Goal:</b> ' + inl(t.goal) + "</p>" + (t.need && t.need.length ? '<p class="small"><b>Before you start:</b> ' + t.need.map(inl).join(" · ") + "</p>" : "") + '<div class="tprog"><i style="width:' + Math.round(100 * done.length / t.steps.length) + '%"></i></div><p class="small muted" id="tpct">' + done.length + " of " + t.steps.length + " steps done</p></div>";
    if (t.intro) h += '<div class="panel">' + para(t.intro) + "</div>";
    t.steps.forEach(function (st, i) { h += stepHTML(st, i, done.indexOf(i) > -1, api); });
    if (t.task) h += '<section class="panel stack ttask"><h2>Your turn</h2>' + para(t.task) + "</section>";
    if (t.evidence) h += '<section class="panel stack tevid"><h2>Evidence for your portfolio</h2>' + para(t.evidence) + "</section>";
    if (t.ans) h += '<section class="panel stack"><h2>Model answer</h2>' + ["ps", "cs", "vba", "sql"].filter(function (k) { return t.ans[k]; }).map(function (k) { return codeBlock(k, t.ans[k], api); }).join("") + para(t.ans.p) + "</section>";
    h += '<div class="row tnav">' + (idx > 0 ? '<a class="btn" href="#tut-' + list[idx - 1].id + '">← ' + esc(list[idx - 1].title) + "</a>" : "") + (idx < list.length - 1 ? '<a class="btn primary" href="#tut-' + list[idx + 1].id + '">Next: ' + esc(list[idx + 1].title) + " →</a>" : '<a class="btn primary" href="#tutorials-' + t.series + '">Back to the series</a>') + "</div></div>";
    el.innerHTML = h;
    el.querySelectorAll("[data-step]").forEach(function (c) { c.onchange = function () {
      var d = api.store.get("tut." + t.id, []), k = +c.dataset.step;
      d = d.filter(function (x) { return x !== k; }); if (c.checked) d.push(k); api.store.set("tut." + t.id, d);
      c.closest(".tstep").classList.toggle("done", c.checked);
      el.querySelector(".tprog i").style.width = Math.round(100 * d.length / t.steps.length) + "%";
      el.querySelector("#tpct").textContent = d.length + " of " + t.steps.length + " steps done" + (d.length === t.steps.length ? " – tutorial complete!" : "");
      if (c.checked) { var nx = el.querySelector("#tst" + (k + 1)); if (nx && nx.getBoundingClientRect().top > innerHeight * 0.6) nx.scrollIntoView({ behavior: "smooth", block: "start" }); }
    }; });
    el.querySelectorAll("[data-tcopy]").forEach(function (b) { b.onclick = function () { api.copy(api.copyStore[+b.dataset.tcopy], "Code"); }; });
  }
  function listHTML(C, unit, api) {
    var series = (C.tutorialSeries || []).filter(function (s) { return !unit || s.u === unit; });
    return series.map(function (s) {
      var ts = C.tutorials.filter(function (t) { return t.series === s.id; });
      var d = ts.reduce(function (a, t) { var p = progress(api, t); return a + (p.done === p.total ? 1 : 0); }, 0);
      return '<section class="stack" id="ts-' + s.id + '"><div class="row" style="justify-content:space-between;align-items:flex-end"><div><h2>' + esc(s.name) + '</h2><p class="muted small">' + esc(s.blurb) + '</p></div><span class="small muted">' + d + " of " + ts.length + ' complete</span></div><div class="grid">' + ts.map(function (t, i) {
        var p = progress(api, t);
        return '<a class="panel topic-card tcard" href="#tut-' + t.id + '"><span class="n">' + (i + 1) + " · " + t.mins + " min · " + esc(t.level || "") + (p.done ? " · " + (p.done === p.total ? "✓ done" : p.pct + "%") : "") + "</span><h3>" + esc(t.title) + '</h3><p class="muted small">' + inl(t.goal) + '</p><div class="tprog sm"><i style="width:' + p.pct + '%"></i></div></a>';
      }).join("") + "</div></section>";
    }).join("");
  }
  root.Tutorials = { render: render, listHTML: listHTML, flowSVG: flowSVG, uiHTML: uiHTML, progress: progress, hl: { vba: hlVBA, sql: hlSQL, html: hlHTML } };
})(typeof window !== "undefined" ? window : global);
