// Lesson diagrams: theme-aware SVG drawn from code (viewBox 800 x 450)
(function (root) {
  var PAL = {
    light: { paper: "#f3f6f1", card: "#ffffff", ink: "#15221c", muted: "#56675e", line: "#c9d3cb", soft: "#e4ece6", pcb: "#11503e", pcbInk: "#f2f7f3", copper: "#a95a24", copperSoft: "#f5e6da", ok: "#2c7a4b", okSoft: "#e1f1e7", bad: "#b0352d", badSoft: "#f9e3e1", warn: "#a76d12", warnSoft: "#fbf0db" },
    dark: { paper: "#0d1512", card: "#15201b", ink: "#e5eee8", muted: "#9bb0a4", line: "#33463c", soft: "#1f2f27", pcb: "#1d6b53", pcbInk: "#eef6f1", copper: "#e39a63", copperSoft: "#3a2719", ok: "#5cc68a", okSoft: "#173326", bad: "#ef7d74", badSoft: "#3d1c1a", warn: "#e6b04f", warnSoft: "#3a2d14" }
  };
  var uid = 0;
  var FONT = "'Atkinson Hyperlegible','Segoe UI',Arial,sans-serif", MONO = "'JetBrains Mono','Courier New',monospace";
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function mk(P) {
    var id = "dg" + (++uid);
    var g = { P: P, id: id };
    g.rect = function (x, y, w, h, o) { o = o || {}; return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (o.r == null ? 6 : o.r) + '" fill="' + (o.fill || "none") + '" stroke="' + (o.stroke || "none") + '" stroke-width="' + (o.sw || 1.5) + '"' + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : "") + (o.op != null ? ' opacity="' + o.op + '"' : "") + "/>"; };
    g.text = function (x, y, s, o) { o = o || {}; return '<text x="' + x + '" y="' + y + '" font-family="' + (o.mono ? MONO : FONT) + '" font-size="' + (o.size || 15) + '" font-weight="' + (o.bold ? 700 : 400) + '" text-anchor="' + (o.anchor || "middle") + '" dominant-baseline="central" fill="' + (o.fill || P.ink) + '"' + (o.italic ? ' font-style="italic"' : "") + (o.op != null ? ' opacity="' + o.op + '"' : "") + (o.rot ? ' transform="rotate(' + o.rot + " " + x + " " + y + ')"' : "") + ">" + esc(String(s).replace(/^ +/, function (m) { return m.replace(/ /g, "\u00a0"); })) + "</text>"; };
    g.lines = function (x, y, arr, o, lh) { var h = ""; arr.forEach(function (s, i) { h += g.text(x, y + i * (lh || 20), s, o); }); return h; };
    g.line = function (x1, y1, x2, y2, o) { o = o || {}; return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (o.stroke || P.muted) + '" stroke-width="' + (o.sw || 2) + '"' + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : "") + (o.arrow ? ' marker-end="url(#' + id + (o.arrow === "c" ? "c" : o.arrow === "g" ? "g" : o.arrow === "r" ? "r" : "a") + ')"' : "") + "/>"; };
    g.arrow = function (x1, y1, x2, y2, o) { o = o || {}; o.arrow = o.arrow || "a"; return g.line(x1, y1, x2, y2, o); };
    g.path = function (d, o) { o = o || {}; return '<path d="' + d + '" fill="' + (o.fill || "none") + '" stroke="' + (o.stroke || "none") + '" stroke-width="' + (o.sw || 2) + '"' + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : "") + (o.arrow ? ' marker-end="url(#' + id + (o.arrow === "c" ? "c" : o.arrow === "g" ? "g" : "a") + ')"' : "") + (o.op != null ? ' opacity="' + o.op + '"' : "") + "/>"; };
    g.circle = function (cx, cy, r, o) { o = o || {}; return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + (o.fill || "none") + '" stroke="' + (o.stroke || "none") + '" stroke-width="' + (o.sw || 1.5) + '"' + (o.op != null ? ' opacity="' + o.op + '"' : "") + (o.clip ? ' clip-path="url(#' + o.clip + ')"' : "") + "/>"; };
    g.num = function (x, y, n, fill) { return g.circle(x, y, 12, { fill: fill || P.copper }) + g.text(x, y, n, { size: 13, bold: true, fill: P.card }); };
    g.box = function (x, y, w, h, label, o) { o = o || {}; return g.rect(x, y, w, h, { fill: o.fill || P.soft, stroke: o.stroke || "none", r: o.r, sw: o.sw, dash: o.dash }) + (Array.isArray(label) ? g.lines(x + w / 2, y + h / 2 - (label.length - 1) * (o.lh || 18) / 2, label, { size: o.size || 15, bold: o.bold, fill: o.color || P.ink, mono: o.mono }, o.lh || 18) : g.text(x + w / 2, y + h / 2, label, { size: o.size || 15, bold: o.bold, fill: o.color || P.ink, mono: o.mono })); };
    g.para = function (x, y, w, h, label, o) { o = o || {}; var k = 14; return g.path("M" + (x + k) + "," + y + " H" + (x + w) + " L" + (x + w - k) + "," + (y + h) + " H" + x + " Z", { fill: o.fill || P.copperSoft, stroke: o.stroke || P.copper, sw: 1.5 }) + g.text(x + w / 2, y + h / 2, label, { size: o.size || 14, mono: o.mono }); };
    g.diamond = function (cx, cy, hw, hh, label, o) { o = o || {}; return g.path("M" + cx + "," + (cy - hh) + " L" + (cx + hw) + "," + cy + " L" + cx + "," + (cy + hh) + " L" + (cx - hw) + "," + cy + " Z", { fill: o.fill || P.warnSoft, stroke: o.stroke || P.warn, sw: 1.5 }) + g.text(cx, cy, label, { size: o.size || 14, mono: o.mono }); };
    g.term = function (cx, cy, w, h, label) { return g.rect(cx - w / 2, cy - h / 2, w, h, { r: h / 2, fill: P.pcb }) + g.text(cx, cy, label, { size: 14, bold: true, fill: P.pcbInk }); };
    g.monitor = function (cx, cy, s) { s = s || 1; return g.rect(cx - 17 * s, cy - 13 * s, 34 * s, 24 * s, { r: 3, fill: P.soft, stroke: P.ink, sw: 1.5 }) + g.line(cx, cy + 11 * s, cx, cy + 17 * s, { stroke: P.ink, sw: 2 }) + g.line(cx - 8 * s, cy + 17 * s, cx + 8 * s, cy + 17 * s, { stroke: P.ink, sw: 2 }); };
    g.bug = function (cx, cy, c) { c = c || P.bad; var h = g.circle(cx, cy, 11, { fill: c }); [-1, 1].forEach(function (s) { [-6, 0, 6].forEach(function (dy) { h += g.line(cx + s * 9, cy + dy, cx + s * 17, cy + dy - 3, { stroke: c, sw: 2 }); }); }); return h + g.circle(cx, cy - 13, 6, { fill: c }); };
    g.defs = function () {
      function m(n, c) { return '<marker id="' + id + n + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + c + '"/></marker>'; }
      return "<defs>" + m("a", P.muted) + m("c", P.copper) + m("g", P.ok) + m("r", P.bad) + "</defs>";
    };
    return g;
  }

  var D = {};
  // ---------------- UNIT 1 ----------------
  D.L01 = { cap: "Units of storage as a staircase from bit to terabyte, with the multiplier between each step", draw: function (g) {
    var P = g.P, s = [["Bit", "0 or 1"], ["Nibble", "4 bits"], ["Byte", "8 bits"], ["Kilobyte", "1024 bytes"], ["Megabyte", "1024 KB"], ["Gigabyte", "1024 MB"], ["Terabyte", "1024 GB"]], mul = ["×4", "×2", "×1024", "×1024", "×1024", "×1024"], h = "";
    s.forEach(function (st, i) {
      var x = 30 + i * 108, ht = 70 + i * 42, y = 390 - ht;
      h += g.rect(x, y, 98, ht, { fill: i === 2 ? P.copper : P.pcb, r: 6 }) + g.text(x + 49, y + 22, st[0], { size: 16, bold: true, fill: P.pcbInk }) + g.text(x + 49, y + 44, st[1], { size: 13, fill: P.pcbInk });
      if (i) h += g.text(x - 5, y - 14, mul[i - 1], { size: 15, bold: true, fill: P.copper });
    });
    return h + g.line(20, 391, 780, 391, { stroke: P.line }) + g.text(400, 422, "Moving to a bigger unit: divide by 1024.   Moving to a smaller unit: multiply by 1024.", { size: 15, fill: P.muted });
  } };
  D.L02 = { cap: "A pupil record with each field matched to its data type", draw: function (g) {
    var P = g.P, rows = [["Surname", "Maguire", "String"], ["Age", "15", "Integer"], ["Height (m)", "1.62", "Real"], ["Form initial", "B", "Character"], ["Date of birth", "12/09/2010", "Date/time"], ["Phone", "07700 900123", "String"]];
    var col = { String: P.copperSoft, Integer: P.okSoft, Real: P.warnSoft, Character: P.soft, "Date/time": P.badSoft }, h = "";
    h += g.rect(60, 40, 680, 40, { fill: P.pcb, r: 6 }) + g.text(90, 60, "Field", { anchor: "start", bold: true, fill: P.pcbInk }) + g.text(320, 60, "Example value", { anchor: "start", bold: true, fill: P.pcbInk }) + g.text(560, 60, "Data type", { anchor: "start", bold: true, fill: P.pcbInk });
    rows.forEach(function (r, i) {
      var y = 84 + i * 48;
      h += g.rect(60, y, 680, 44, { fill: i % 2 ? P.card : P.paper, r: 4 }) + g.text(90, y + 22, r[0], { anchor: "start", bold: true }) + g.text(320, y + 22, r[1], { anchor: "start", mono: true, size: 15 }) + g.rect(555, y + 7, 150, 30, { fill: col[r[2]], r: 15 }) + g.text(630, y + 22, r[2], { size: 14, bold: true });
    });
    return h + g.text(400, 405, "Phone numbers are strings: the leading 0 must be kept and no maths is done on them.", { size: 15, fill: P.muted });
  } };
  D.L03 = { cap: "Bitmap image as a grid of pixels compared with a vector circle stored as an object", draw: function (g) {
    var P = g.P, h = "", n = 12, c = 22, x0 = 73, y0 = 50;
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) { var on = (i - 5.5) * (i - 5.5) + (j - 5.5) * (j - 5.5) <= 26; h += '<rect x="' + (x0 + j * c) + '" y="' + (y0 + i * c) + '" width="' + c + '" height="' + c + '" fill="' + (on ? P.copper : P.card) + '" stroke="' + P.line + '" stroke-width="1"/>'; }
    h += g.circle(595, 182, 108, { fill: P.copper }) + g.circle(595, 182, 108, { stroke: P.ink, sw: 2, dash: "0" });
    h += g.text(205, 340, "Bitmap: a grid of pixels", { bold: true, size: 17 }) + g.text(205, 368, "Each pixel stores a colour in binary", { fill: P.muted }) + g.text(205, 396, "Enlarged → becomes pixelated", { fill: P.bad, bold: true });
    h += g.text(595, 340, "Vector: shapes stored as objects", { bold: true, size: 17 }) + g.text(595, 368, "circle: centre, radius, fill, line", { fill: P.muted, mono: true, size: 14 }) + g.text(595, 396, "Enlarged → stays sharp", { fill: P.ok, bold: true });
    return h + g.line(400, 40, 400, 410, { stroke: P.line, sw: 1.5, dash: "4 6" });
  } };
  D.L04 = { cap: "A sound wave sampled at regular intervals, with sample rate on the time axis and bit depth as the number of levels", draw: function (g) {
    var P = g.P, h = "", x0 = 90, x1 = 740, top = 60, lv = 8, step = 40, mid = top + 140;
    for (var k = 0; k < lv; k++) h += g.line(x0, top + k * step, x1, top + k * step, { stroke: P.line, sw: 1 });
    var d = "", pts = [];
    for (var x = x0; x <= x1; x += 4) { var y = mid - 120 * Math.sin((x - x0) / (x1 - x0) * Math.PI * 3); d += (x === x0 ? "M" : "L") + x + "," + y.toFixed(1) + " "; }
    h += g.path(d, { stroke: P.muted, sw: 3 });
    for (var sx = x0; sx <= x1; sx += 43.3) { var sy = mid - 120 * Math.sin((sx - x0) / (x1 - x0) * Math.PI * 3); var q = top + Math.round((sy - top) / step) * step; pts.push([sx, q]); h += g.line(sx, top + 7 * step, sx, q, { stroke: P.line, sw: 1, dash: "3 4" }); }
    var st = "M" + pts[0][0] + "," + pts[0][1]; pts.forEach(function (p, i) { if (i) st += " H" + p[0] + " V" + p[1]; });
    h += g.path(st, { stroke: P.copper, sw: 3 });
    pts.forEach(function (p) { h += g.circle(p[0], p[1], 5, { fill: P.pcb }); });
    h += g.text(415, 362, "Time → a sample is taken at regular intervals (sample rate, in Hz)", { size: 15, fill: P.muted });
    h += g.text(48, 200, "Bit depth: number of levels", { size: 15, fill: P.muted, rot: -90 });
    h += g.text(415, 405, "More samples and more levels → closer to the original sound → bigger file", { size: 16, bold: true });
    return h;
  } };
  D.L05 = { cap: "Lossless compression restores every block of data; lossy compression permanently removes some", draw: function (g) {
    var P = g.P, h = "", cols = [P.pcb, P.copper, P.ok, P.warn, P.pcb, P.copper, P.ok, P.warn];
    function blocks(x, y, n, faded) { var s = ""; for (var i = 0; i < n; i++) s += g.rect(x + i * 25, y, 22, 22, { fill: cols[i], r: 3, op: faded && faded.indexOf(i) > -1 ? 0.25 : 1 }); return s; }
    [[105, "Lossless: nothing is lost", null, "png, zip, gif, tiff · text and program files"], [285, "Lossy: some data is removed for good", [1, 4, 6], "jpeg, mp3, mp4 · much smaller files"]].forEach(function (r) {
      var y = r[0];
      h += g.text(30, y - 38, r[1], { anchor: "start", bold: true, size: 17 });
      h += blocks(30, y, 8) + g.arrow(240, y + 11, 305, y + 11) + g.text(272, y - 6, "compress", { size: 12, fill: P.muted });
      h += blocks(318, y, 4) + g.arrow(425, y + 11, 490, y + 11) + g.text(457, y - 6, "decompress", { size: 12, fill: P.muted });
      h += blocks(505, y, 8, r[2]) + g.text(30, y + 50, r[3], { anchor: "start", fill: P.muted, size: 14 });
      h += g.text(603, y + 42, r[2] ? "close, not exact" : "identical", { size: 14, bold: true, fill: r[2] ? P.bad : P.ok });
    });
    return h + g.text(400, 420, "Why compress? Less storage, faster upload and download, less bandwidth.", { size: 15, fill: P.muted });
  } };
  D.L06 = { cap: "The operating system allocating memory, storage and processing time", draw: function (g) {
    var P = g.P, h = g.box(290, 30, 220, 60, "Operating system", { fill: P.pcb, color: P.pcbInk, bold: true, size: 18 });
    [[40, "Memory (RAM)"], [285, "Storage"], [530, "Processing time"]].forEach(function (p) { h += g.rect(p[0], 150, 230, 255, { fill: P.paper, stroke: P.line, r: 10 }) + g.text(p[0] + 115, 175, p[1], { bold: true, size: 16 }) + g.arrow(400, 92, p[0] + 115, 148); });
    ["OS", "Browser", "Game", "free", "free"].forEach(function (t, i) { h += g.box(80, 195 + i * 38, 150, 32, t, { fill: t === "free" ? P.card : P.copperSoft, stroke: t === "free" ? P.line : "none", size: 14, dash: t === "free" ? "4 4" : null }); });
    ["essay.docx  → sector 812", "photo.jpg  → sector 1904", "game.sav  → sector 3311"].forEach(function (t, i) { h += g.text(300, 210 + i * 32, t, { anchor: "start", mono: true, size: 12 }); });
    h += g.text(400, 320, "Disk 72% used", { size: 13, fill: P.muted }) + g.rect(305, 335, 190, 16, { fill: P.soft, r: 8 }) + g.rect(305, 335, 137, 16, { fill: P.pcb, r: 8 });
    h += g.text(400, 375, "Finds space, records locations", { size: 13, fill: P.muted });
    var c = [P.pcb, P.copper, P.ok];
    for (var i = 0; i < 9; i++) h += g.box(550 + i * 21.5, 220, 19, 50, "ABC"[i % 3], { fill: c[i % 3], color: P.card, size: 13, bold: true, r: 3 });
    h += g.arrow(550, 290, 744, 290) + g.text(645, 305, "time", { size: 12, fill: P.muted }) + g.lines(645, 340, ["Each program gets a", "short time slice in turn"], { size: 14 }, 19);
    return h;
  } };
  D.L07 = { cap: "Disk blocks before and after defragmentation", draw: function (g) {
    var P = g.P, h = "", col = { A: P.copper, B: P.pcb, C: P.ok, _: P.soft };
    function row(y, pat, label) { var s = g.text(50, y - 26, label, { anchor: "start", bold: true, size: 16 }); pat.split("").forEach(function (k, i) { s += g.box(50 + i * 44, y, 40, 56, k === "_" ? "" : k, { fill: col[k], color: P.card, bold: true, size: 16, r: 4 }); }); return s; }
    h += row(80, "AB_AC_BA_CBA__C_", "Fragmented: parts of each file are scattered across the disk");
    h += row(235, "AAAABBBCCC______", "Defragmented: each file sits in one continuous block");
    h += g.arrow(720, 145, 720, 228, { arrow: "c" }) + g.text(705, 187, "defragment", { size: 14, fill: P.copper, bold: true, anchor: "end" });
    [["A", P.copper, "File A"], ["B", P.pcb, "File B"], ["C", P.ok, "File C"], ["", P.soft, "Free space"]].forEach(function (k, i) { h += g.rect(80 + i * 170, 340, 22, 22, { fill: k[1], r: 4 }) + g.text(110 + i * 170, 351, k[2], { anchor: "start", size: 14 }); });
    return h + g.text(400, 405, "The read/write head moves less, so files load faster. SSDs do not need defragmenting.", { size: 15, fill: P.muted });
  } };
  D.L08 = { cap: "A database table showing a record, a field and the key field", draw: function (g) {
    var P = g.P, h = "", cw = [110, 140, 130, 130], hd = ["MemberID", "Surname", "Town", "DateJoined"], x0 = 255, y0 = 80;
    var data = [["M001", "Murphy", "Omagh", "03/09/2025"], ["M002", "Kelly", "Enniskillen", "14/01/2026"], ["M003", "Boyd", "Lisnaskea", "22/02/2026"], ["M004", "Quinn", "Omagh", "09/05/2026"]];
    h += g.text(x0, 50, "Table: Members", { anchor: "start", bold: true, size: 17 });
    var x = x0; hd.forEach(function (t, i) { h += g.box(x, y0, cw[i], 40, t, { fill: i === 0 ? P.copper : P.pcb, color: P.pcbInk, bold: true, size: 14, r: 0 }); x += cw[i]; });
    data.forEach(function (r, ri) { var xx = x0; r.forEach(function (t, ci) { h += g.box(xx, y0 + 40 + ri * 40, cw[ci], 40, t, { fill: ri % 2 ? P.card : P.paper, stroke: P.line, sw: 1, size: 14, r: 0, mono: ci === 0 || ci === 3 }); xx += cw[ci]; }); });
    h += g.rect(x0 - 3, y0 + 77, 516, 46, { stroke: P.copper, sw: 3, r: 4 });
    h += g.rect(x0 + 247, y0 - 3, 136, 206, { stroke: P.ok, sw: 3, r: 4, dash: "8 5" });
    h += g.lines(30, 190, ["Record", "all the data about", "one member (a row)"], { anchor: "start", size: 14 }, 20) + g.arrow(170, 200, 248, 200, { arrow: "c" });
    h += g.arrow(565, 330, 565, 290, { arrow: "g" }) + g.lines(565, 350, ["Field", "one item of data (a column)"], { size: 14 }, 20);
    h += g.arrow(310, 330, 310, 290, { arrow: "c" }) + g.lines(310, 350, ["Key field", "unique for every record"], { size: 14 }, 20);
    return h;
  } };
  D.L09 = { cap: "Five validation checks applied to form fields, with passes and failures", draw: function (g) {
    var P = g.P, h = "", rows = [["Name", "Ciara", 1, "Presence", "must not be left blank"], ["Password", "pa55", 0, "Length", "at least 8 characters"], ["Age", "ten", 0, "Type", "must be a whole number"], ["Postcode", "BT74 6AA", 1, "Format", "pattern LLNN NLL"], ["Mark", "87", 1, "Range", "between 0 and 100"]];
    rows.forEach(function (r, i) {
      var y = 40 + i * 66;
      h += g.text(40, y + 22, r[0], { anchor: "start", bold: true, size: 15 }) + g.rect(140, y + 4, 160, 36, { fill: P.card, stroke: P.line }) + g.text(152, y + 22, r[1], { anchor: "start", mono: true, size: 14 });
      h += g.circle(325, y + 22, 13, { fill: r[2] ? P.ok : P.bad }) + (r[2] ? g.path("M318," + (y + 22) + " l5,6 l9,-11", { stroke: P.card, sw: 3 }) : g.path("M319," + (y + 16) + " l12,12 M331," + (y + 16) + " l-12,12", { stroke: P.card, sw: 3 }));
      h += g.box(355, y + 6, 130, 32, r[3] + " check", { fill: P.copperSoft, size: 14, bold: true, r: 16 }) + g.text(505, y + 22, r[4], { anchor: "start", size: 15 });
    });
    return h + g.text(400, 420, "Validation checks data is sensible. It cannot prove the data is correct.", { size: 16, bold: true, fill: P.copper });
  } };
  D.L10 = { cap: "Venn diagrams: AND returns records in both sets, OR returns records in either", draw: function (g) {
    var P = g.P, h = "<clipPath id=\"" + g.id + "k\"><circle cx=\"145\" cy=\"200\" r=\"105\"/></clipPath>";
    h += g.circle(255, 200, 105, { fill: P.copper, clip: g.id + "k", op: 0.85 });
    [[145, 255, "AND – both must be true", 'Town = "Omagh" AND Age > 15', "narrows the results"], [545, 655, "OR – either can be true", 'Town = "Omagh" OR Age > 15', "widens the results"]].forEach(function (v, i) {
      if (i) { h += g.circle(v[0], 200, 105, { fill: P.ok, op: 0.55 }) + g.circle(v[1], 200, 105, { fill: P.ok, op: 0.55 }); }
      h += g.circle(v[0], 200, 105, { stroke: P.ink, sw: 2 }) + g.circle(v[1], 200, 105, { stroke: P.ink, sw: 2 });
      h += g.text(v[0] - 45, 200, "Omagh", { size: 15, bold: true }) + g.text(v[1] + 45, 200, "Over 15", { size: 15, bold: true });
      h += g.text((v[0] + v[1]) / 2, 62, v[2], { bold: true, size: 17 }) + g.text((v[0] + v[1]) / 2, 342, v[3], { mono: true, size: 14 }) + g.text((v[0] + v[1]) / 2, 372, v[4], { fill: P.muted });
    });
    return h + g.text(400, 420, "BETWEEN 10 AND 20 includes both 10 and 20.", { size: 15, fill: P.muted });
  } };
  D.L11 = { cap: "Spreadsheet formulas copied down: relative references change, the absolute reference stays fixed", draw: function (g) {
    var P = g.P, h = "", cols = ["A", "B", "C", "D", "E", "F"], w = 116, x0 = 50, y0 = 40;
    var data = [["Item", "Qty", "Price", "Cost", "VAT", "0.2"], ["Kayak", "2", "15.00", "=B2*C2", "=D2*$F$1", ""], ["Canoe", "1", "22.50", "=B3*C3", "=D3*$F$1", ""], ["Paddle", "4", "3.00", "=B4*C4", "=D4*$F$1", ""]];
    h += g.box(x0 - 30, y0, 30, 30, "", { fill: P.soft, r: 0 });
    cols.forEach(function (c, i) { h += g.box(x0 + i * w, y0, w, 30, c, { fill: P.soft, stroke: P.line, sw: 1, size: 13, bold: true, r: 0 }); });
    data.forEach(function (r, ri) {
      var y = y0 + 30 + ri * 46; h += g.box(x0 - 30, y, 30, 46, String(ri + 1), { fill: P.soft, stroke: P.line, sw: 1, size: 13, bold: true, r: 0 });
      r.forEach(function (t, ci) { var f = P.card; if (ri > 0 && ci === 3) f = P.okSoft; if (ri > 0 && ci === 4) f = P.copperSoft; if (ri === 0 && ci === 5) f = P.copper; h += g.box(x0 + ci * w, y, w, 46, t, { fill: f, stroke: P.line, sw: 1, size: t.charAt(0) === "=" ? 13 : 14, mono: t.charAt(0) === "=", r: 0, bold: ri === 0, color: ri === 0 && ci === 5 ? P.card : P.ink }); });
    });
    h += g.arrow(x0 + 3.5 * w, y0 + 290, x0 + 3.5 * w, y0 + 222, { arrow: "g" }) + g.arrow(x0 + 4.5 * w, y0 + 290, x0 + 4.5 * w, y0 + 222, { arrow: "c" }) + g.text(x0 + 5.5 * w, y0 + 99, "↑ VAT rate", { size: 13, bold: true, fill: P.copper });
    h += g.lines(x0 + 3.5 * w - 10, y0 + 315, ["Relative: =B2*C2", "copied down becomes =B3*C3"], { size: 14, anchor: "end" }, 20);
    h += g.lines(x0 + 4.5 * w + 10, y0 + 315, ["Absolute: $F$1 never", "changes when copied"], { size: 14, anchor: "start" }, 20);
    return h;
  } };
  D.L12 = { cap: "The four parts of a VLOOKUP formula and the row it matches in a lookup table", draw: function (g) {
    var P = g.P, h = "", cw = 15, x0 = 400 - 30 * cw / 2, y = 60;
    var parts = [["=VLOOKUP(", P.ink], ["B3", P.copper], [",", P.ink], ["$G$2:$H$6", P.pcb], [",", P.ink], ["2", P.ok], [",", P.ink], ["FALSE", P.warn], [")", P.ink]];
    var xs = x0, centers = [];
    parts.forEach(function (p) { h += g.text(xs, y, p[0], { anchor: "start", mono: true, size: 25, bold: true, fill: p[1] }); if (p[1] !== P.ink) centers.push([xs + p[0].length * cw / 2, p[1]]); xs += p[0].length * cw; });
    var labels = [["Value to find", 110], ["Table to search", 310], ["Column to return", 510], ["Exact match only", 690]];
    labels.forEach(function (l, i) { h += g.line(centers[i][0], y + 20, l[1], 118, { stroke: centers[i][1], sw: 2 }) + g.box(l[1] - 85, 120, 170, 34, l[0], { fill: P.paper, stroke: centers[i][1], size: 14, bold: true }); });
    var tx = 300, ty = 210, rows = [["Code", "Price"], ["K1", "15.00"], ["K2", "22.50"], ["SUP", "30.00"], ["C1", "12.00"]];
    h += g.text(tx + 100, ty - 18, "Lookup table G2:H6", { size: 13, fill: P.muted });
    rows.forEach(function (r, i) { r.forEach(function (t, j) { h += g.box(tx + j * 100, ty + i * 36, 100, 36, t, { fill: i === 0 ? P.pcb : (i === 3 ? P.copperSoft : P.card), stroke: P.line, sw: 1, r: 0, color: i === 0 ? P.pcbInk : P.ink, bold: i === 0 || i === 3, mono: i > 0, size: 14 }); }); });
    h += g.box(60, ty + 3 * 36, 150, 36, "B3 = SUP", { fill: P.copperSoft, stroke: P.copper, mono: true, size: 14, bold: true }) + g.arrow(212, ty + 3 * 36 + 18, 296, ty + 3 * 36 + 18, { arrow: "c" });
    h += g.arrow(502, ty + 3 * 36 + 18, 580, ty + 3 * 36 + 18, { arrow: "g" }) + g.text(590, ty + 3 * 36 + 18, "returns 30.00", { anchor: "start", bold: true, fill: P.ok, size: 16 });
    return h + g.text(400, 425, "The table range is absolute so the formula can be copied down.", { size: 14, fill: P.muted });
  } };
  D.L13 = { cap: "Inside the CPU: the fetch–execute cycle using the PC, MAR, MDR and IAR with main memory", draw: function (g) {
    var P = g.P, h = g.rect(30, 30, 450, 390, { fill: P.paper, stroke: P.pcb, sw: 2.5, r: 12 }) + g.text(255, 52, "CPU", { bold: true, size: 18, fill: P.pcb });
    h += g.box(50, 75, 180, 70, ["Control unit", "decodes, controls"], { fill: P.pcb, color: P.pcbInk, size: 14, bold: false, lh: 20 });
    h += g.box(280, 75, 180, 70, ["ALU", "calculates, compares"], { fill: P.copper, color: P.card, size: 14, lh: 20 });
    [["PC", 50], ["MAR", 160], ["MDR", 270], ["IAR", 380]].forEach(function (r) { h += g.box(r[1], 220, 80, 56, r[0], { fill: P.card, stroke: P.ink, bold: true, size: 16 }); });
    h += g.arrow(131, 248, 158, 248, { arrow: "c" }) + g.num(145, 222, "1") + g.arrow(351, 248, 378, 248, { arrow: "c" }) + g.num(365, 222, "4") + g.num(470, 85, "5");
    h += g.path("M200,277 V300 H556", { stroke: P.copper, sw: 2.5, arrow: "c" }) + g.text(518, 315, "address bus", { size: 12, fill: P.copper }) + g.num(518, 286, "2");
    h += g.path("M556,195 H310 V217", { stroke: P.ok, sw: 2.5, arrow: "g" }) + g.text(518, 180, "data bus", { size: 12, fill: P.ok }) + g.num(470, 195, "3", P.ok);
    h += g.lines(50, 328, ["1  PC address copied to the MAR", "2  address sent to memory", "3  instruction copied into the MDR; PC + 1", "4  copied to the IAR; control unit decodes it", "5  executed – the ALU does any calculation"], { anchor: "start", size: 13 }, 18);
    h += g.rect(560, 30, 210, 390, { fill: P.paper, stroke: P.line, r: 12 }) + g.lines(665, 52, ["Immediate-access", "store (RAM)"], { bold: true, size: 15 }, 19);
    [["100", "LOAD 7"], ["101", "ADD 3"], ["102", "STORE 9"], ["103", "OUTPUT"], ["104", "HALT"]].forEach(function (r, i) { var y = 100 + i * 56; h += g.box(575, y, 60, 44, r[0], { fill: P.soft, mono: true, size: 13, r: 4 }) + g.box(640, y, 115, 44, r[1], { fill: i === 1 ? P.copperSoft : P.card, stroke: i === 1 ? P.copper : P.line, mono: true, size: 13, r: 4 }); });
    return h;
  } };
  D.L14 = { cap: "Memory hierarchy pyramid from registers to secondary storage", draw: function (g) {
    var P = g.P, h = "", bands = [["Registers", P.pcb], ["Cache", P.ok], ["RAM (main memory)", P.copper], ["Secondary storage: SSD / HDD", P.soft]], ax = 400, top = 30, base = 370, bw = 300;
    for (var i = 0; i < 4; i++) {
      var y1 = top + i * (base - top) / 4, y2 = top + (i + 1) * (base - top) / 4, w1 = bw * (y1 - top) / (base - top), w2 = bw * (y2 - top) / (base - top);
      h += g.path("M" + (ax - w1) + "," + y1 + " L" + (ax + w1) + "," + y1 + " L" + (ax + w2) + "," + y2 + " L" + (ax - w2) + "," + y2 + " Z", { fill: bands[i][1], stroke: P.card, sw: 3 });
      h += g.text(ax, (y1 + y2) / 2 + (i === 0 ? 12 : 0), bands[i][0], { bold: true, size: i === 0 ? 13 : 15, fill: i === 3 ? P.ink : P.card });
    }
    h += g.arrow(110, 365, 110, 40, { arrow: "c" }) + g.text(85, 200, "Faster · more expensive per GB", { rot: -90, size: 14, fill: P.copper, bold: true });
    h += g.arrow(690, 40, 690, 365, { arrow: "g" }) + g.text(715, 200, "Larger capacity", { rot: 90, size: 14, fill: P.ok, bold: true });
    return h + g.text(400, 412, "ROM is separate: small, non-volatile, holds the boot-up instructions.", { size: 15, fill: P.muted });
  } };
  D.L15 = { cap: "Hard disc drive with spinning platter compared with a solid state drive made of memory chips", draw: function (g) {
    var P = g.P, h = g.rect(60, 40, 290, 220, { fill: P.soft, stroke: P.ink, r: 12 }) + g.circle(185, 150, 92, { fill: P.line, stroke: P.ink }) + g.circle(185, 150, 60, { stroke: P.muted, sw: 1, dash: "3 4" }) + g.circle(185, 150, 10, { fill: P.ink });
    h += g.path("M325,235 L232,128", { stroke: P.copper, sw: 7 }) + g.circle(325, 235, 12, { fill: P.copper }) + g.circle(232, 128, 6, { fill: P.ink });
    h += g.rect(450, 90, 300, 130, { fill: P.pcb, r: 10 });
    for (var i = 0; i < 4; i++) h += g.rect(470 + i * 68, 115, 55, 80, { fill: P.ink, r: 4 }) + g.text(497 + i * 68, 155, "NAND", { size: 10, fill: P.pcbInk, mono: true });
    h += g.text(205, 285, "Hard disc drive (HDD)", { bold: true, size: 17 }) + g.text(600, 285, "Solid state drive (SSD)", { bold: true, size: 17 });
    function meter(x, y, label, n) { var s = g.text(x, y + 9, label, { anchor: "start", size: 14 }); for (var k = 0; k < 5; k++) s += g.rect(x + 160 + k * 24, y, 19, 19, { fill: k < n ? P.copper : P.soft, r: 3 }); return s; }
    [["Speed", 2, 5], ["Durability", 2, 5], ["Capacity per £", 5, 3]].forEach(function (m, i) { h += meter(60, 315 + i * 32, m[0], m[1]) + meter(450, 315 + i * 32, m[0], m[2]); });
    return h + g.text(205, 425, "moving parts – damaged if dropped", { size: 13, fill: P.muted }) + g.text(600, 425, "no moving parts – fast, silent, low power", { size: 13, fill: P.muted });
  } };
  D.L16 = { cap: "Bus, star and ring network topologies", draw: function (g) {
    var P = g.P, h = "";
    h += g.text(145, 50, "Bus", { bold: true, size: 18 }) + g.line(40, 220, 250, 220, { stroke: P.pcb, sw: 5 }) + g.rect(28, 210, 12, 20, { fill: P.copper, r: 2 }) + g.rect(250, 210, 12, 20, { fill: P.copper, r: 2 });
    [[70, 140], [120, 300], [180, 140], [225, 300]].forEach(function (n) { h += g.line(n[0], 220, n[0], n[1] + (n[1] < 220 ? 18 : -14), { stroke: P.ink, sw: 2 }) + g.monitor(n[0], n[1]); });
    h += g.text(400, 50, "Star", { bold: true, size: 18 });
    for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3 - Math.PI / 2, x = 400 + 100 * Math.cos(a), y = 220 + 100 * Math.sin(a); h += g.line(400, 220, x, y, { stroke: P.ink, sw: 2 }) + g.monitor(x, y); }
    h += g.box(368, 204, 64, 32, "Switch", { fill: P.pcb, color: P.pcbInk, size: 12, bold: true });
    h += g.text(655, 50, "Ring", { bold: true, size: 18 }) + g.circle(655, 220, 95, { stroke: P.pcb, sw: 4 });
    for (var j = 0; j < 6; j++) { var b = j * Math.PI / 3 - Math.PI / 2; h += g.monitor(655 + 95 * Math.cos(b), 220 + 95 * Math.sin(b)); }
    h += g.path("M686,106 A118,118 0 0 1 745,144", { stroke: P.copper, sw: 3, arrow: "c" });
    h += g.lines(145, 370, ["One backbone cable,", "terminator at each end"], { size: 14 }, 20) + g.lines(400, 370, ["Each device has its own", "cable to a central switch"], { size: 14 }, 20) + g.lines(655, 370, ["Each device links to two", "others; data goes one way"], { size: 14 }, 20);
    return h;
  } };
  D.L17 = { cap: "Typical range of Bluetooth, Wi-Fi, 4G, 5G and optical fibre", draw: function (g) {
    var P = g.P, h = "", rows = [["Bluetooth", 50, "about 10 m · low power"], ["Wi-Fi", 120, "about 50 m indoors"], ["4G", 300, "wide area via masts"], ["5G", 300, "wide area · faster · low latency"], ["Optical fibre", 330, "km · highest bandwidth"]], c = [P.copper, P.ok, P.pcb, P.pcb, P.warn];
    rows.forEach(function (r, i) { var y = 60 + i * 70; h += g.text(40, y + 16, r[0], { anchor: "start", bold: true, size: 16 }) + g.rect(170, y, r[1], 32, { fill: c[i], r: 16 }) + g.text(185 + r[1], y + 16, r[2], { anchor: "start", size: 15 }); });
    return h + g.text(400, 420, "Bar length shows typical range (not to scale).", { size: 14, fill: P.muted });
  } };
  D.L18 = { cap: "How a virus, a worm and a Trojan horse spread", draw: function (g) {
    var P = g.P, h = "";
    function doc(x, y) { return g.path("M" + x + "," + y + " h52 l18,18 v72 h-70 z", { fill: P.card, stroke: P.ink, sw: 2 }) + g.path("M" + (x + 52) + "," + y + " v18 h18", { stroke: P.ink, sw: 2 }) + g.line(x + 12, y + 40, x + 56, y + 40, { stroke: P.line }) + g.line(x + 12, y + 55, x + 56, y + 55, { stroke: P.line }) + g.line(x + 12, y + 70, x + 46, y + 70, { stroke: P.line }); }
    h += g.text(135, 50, "Virus", { bold: true, size: 18 }) + doc(60, 90) + g.bug(118, 170) + g.arrow(142, 135, 165, 135) + doc(170, 90) + g.bug(228, 170);
    h += g.lines(135, 300, ["Attaches to a file.", "Spreads when the file", "is run or shared."], { size: 14 }, 20);
    h += g.text(400, 50, "Worm", { bold: true, size: 18 });
    [[340, 110], [460, 110], [340, 220], [460, 220]].forEach(function (p) { h += g.monitor(p[0], p[1], 1.3) + g.bug(p[0] + 20, p[1] - 22, P.bad); });
    h += g.arrow(365, 110, 432, 110, { arrow: "r" }) + g.arrow(340, 138, 340, 192, { arrow: "r" }) + g.arrow(362, 130, 438, 200, { arrow: "r" });
    h += g.lines(400, 300, ["Copies itself across a", "network on its own –", "no user action needed."], { size: 14 }, 20);
    h += g.text(665, 50, "Trojan horse", { bold: true, size: 18 }) + g.rect(600, 120, 130, 100, { fill: P.copper, r: 6 }) + g.rect(590, 100, 150, 28, { fill: P.copper, r: 6 }) + g.rect(657, 100, 16, 120, { fill: P.warn, r: 0 }) + g.text(665, 245, "FREE GAME", { bold: true, size: 15, fill: P.copper }) + g.bug(700, 90);
    h += g.lines(665, 300, ["Disguised as useful", "software. Does harm", "once it is installed."], { size: 14 }, 20);
    return h + g.text(400, 420, "Also: key loggers record keystrokes · spyware secretly sends your data to others.", { size: 14, fill: P.muted });
  } };
  D.L19 = { cap: "Encryption makes intercepted data unreadable; a firewall filters network traffic", draw: function (g) {
    var P = g.P, h = g.box(30, 95, 140, 50, "Meet at 4pm", { fill: P.card, stroke: P.ink, size: 15 }) + g.arrow(172, 120, 196, 120) + g.circle(230, 120, 30, { fill: P.pcb }) + g.lines(230, 113, ["Encrypt", "+ key"], { size: 12, fill: P.pcbInk, bold: true }, 15);
    h += g.arrow(262, 120, 288, 120) + g.box(290, 95, 180, 50, "X7#qL!9z@w", { fill: P.soft, mono: true, size: 15 }) + g.text(380, 75, "intercepted: unreadable", { size: 13, fill: P.bad, bold: true });
    h += g.arrow(472, 120, 498, 120) + g.circle(530, 120, 30, { fill: P.pcb }) + g.lines(530, 113, ["Decrypt", "+ key"], { size: 12, fill: P.pcbInk, bold: true }, 15) + g.arrow(562, 120, 588, 120) + g.box(590, 95, 160, 50, "Meet at 4pm", { fill: P.card, stroke: P.ink, size: 15 });
    h += g.text(400, 40, "Encryption", { bold: true, size: 18 });
    h += g.text(400, 215, "Firewall", { bold: true, size: 18 }) + g.box(40, 260, 200, 130, ["Internet", "(untrusted)"], { fill: P.soft, size: 15, lh: 22 }) + g.box(560, 260, 200, 130, ["School LAN", "(trusted)"], { fill: P.okSoft, size: 15, lh: 22 });
    for (var r = 0; r < 5; r++) for (var c = 0; c < 2; c++) h += g.rect(372 + c * 28 - (r % 2) * 14, 245 + r * 30, 26, 27, { fill: P.copper, r: 2 });
    h += g.arrow(242, 290, 555, 290, { arrow: "g", stroke: P.ok, sw: 3 }) + g.text(300, 278, "allowed", { size: 13, fill: P.ok, bold: true });
    h += g.arrow(242, 360, 355, 360, { arrow: "r", stroke: P.bad, sw: 3 }) + g.text(300, 380, "blocked", { size: 13, fill: P.bad, bold: true });
    return h + g.text(400, 425, "Encryption stops data being read; it does not stop it being taken.", { size: 14, fill: P.muted });
  } };
  D.L20 = { cap: "Cloud computing: devices reach remote servers over the internet", draw: function (g) {
    var P = g.P, h = g.path("M250,190 C190,190 190,120 250,115 C255,60 340,50 370,90 C400,40 500,45 515,100 C590,95 610,175 545,190 Z", { fill: P.okSoft, stroke: P.ok, sw: 2.5 });
    h += g.lines(400, 135, ["Remote servers", "in data centres"], { bold: true, size: 17 }, 24);
    [[110, 300, "Laptop"], [300, 330, "Phone"], [500, 330, "Games console"], [690, 300, "Tablet"]].forEach(function (d) { h += g.line(d[0], d[1] - 30, 400, 192, { stroke: P.muted, sw: 1.5, dash: "5 5" }) + g.monitor(d[0], d[1] - 10, 1.4) + g.text(d[0], d[1] + 25, d[2], { size: 14 }); });
    h += g.text(40, 400, "+ access anywhere · scalable · provider backs up", { anchor: "start", size: 14, fill: P.ok, bold: true });
    return h + g.text(760, 425, "− needs internet · ongoing cost · data held by others", { anchor: "end", size: 14, fill: P.bad, bold: true });
  } };
  D.L21 = { cap: "Four laws examined in Unit 1 and what each covers", draw: function (g) {
    var P = g.P, h = "", c = [["Computer Misuse Act 1990", ["Unauthorised access; access to commit", "further crime; unauthorised modification"], P.bad], ["Copyright, Designs and Patents Act 1988", ["Protects creators' work: software, music,", "films. Breaches: piracy, licence misuse"], P.copper], ["Data Protection Act 1998", ["Personal data must follow eight", "principles; rights of the data subject"], P.pcb], ["Consumer Contracts Regulations 2013", ["Buying online: clear information,", "14-day cancellation, no hidden charges"], P.ok]];
    c.forEach(function (k, i) { var x = i % 2 ? 410 : 30, y = i < 2 ? 40 : 235; h += g.rect(x, y, 360, 170, { fill: P.paper, stroke: k[2], sw: 2.5, r: 12 }) + g.circle(x + 30, y + 32, 10, { fill: k[2] }) + g.text(x + 50, y + 32, k[0], { anchor: "start", bold: true, size: 15 }) + g.lines(x + 25, y + 85, k[1], { anchor: "start", size: 15 }, 24); });
    return h + g.text(400, 430, "Learn the full titles – examiners only credit the exact name.", { size: 14, fill: P.muted });
  } };
  D.L22 = { cap: "Data Protection Act roles and its eight principles", draw: function (g) {
    var P = g.P, h = g.box(40, 40, 260, 60, ["Data subject", "the person the data is about"], { fill: P.copperSoft, size: 14, lh: 20 }) + g.box(40, 185, 260, 60, ["Data controller", "decides how data is used"], { fill: P.okSoft, size: 14, lh: 20 }) + g.box(40, 330, 260, 60, ["Information Commissioner", "enforces the Act"], { fill: P.soft, size: 14, lh: 20 });
    h += g.arrow(170, 103, 170, 180) + g.text(185, 132, "gives personal data;", { anchor: "start", size: 13, fill: P.muted }) + g.text(185, 150, "has rights to see it", { anchor: "start", size: 13, fill: P.muted });
    h += g.arrow(170, 248, 170, 325) + g.text(185, 277, "registers; can be", { anchor: "start", size: 13, fill: P.muted }) + g.text(185, 295, "fined if it breaks the Act", { anchor: "start", size: 13, fill: P.muted });
    ["Fair and lawful", "Specified purposes only", "Adequate, relevant, not excessive", "Accurate and up to date", "Not kept longer than necessary", "In line with data subjects' rights", "Kept secure", "Not sent outside the EEA unprotected"].forEach(function (t, i) { var y = 50 + i * 44; h += g.num(370, y, String(i + 1), P.pcb) + g.text(392, y, t, { anchor: "start", size: 15 }); });
    return h + g.text(370, 415, "The eight principles", { anchor: "start", size: 13, fill: P.muted, bold: true });
  } };
  D.L23 = { cap: "A correctly set-up computer workstation", draw: function (g) {
    var P = g.P, h = g.line(330, 280, 640, 280, { stroke: P.ink, sw: 5 }) + g.line(610, 280, 610, 398, { stroke: P.ink, sw: 4 }) + g.line(30, 400, 770, 400, { stroke: P.line, sw: 2 });
    h += g.rect(480, 130, 130, 92, { fill: P.soft, stroke: P.ink, sw: 3, r: 4 }) + g.line(545, 222, 545, 278, { stroke: P.ink, sw: 4 }) + g.rect(385, 266, 90, 10, { fill: P.ink, r: 2 });
    h += g.line(225, 300, 335, 300, { stroke: P.copper, sw: 7 }) + g.line(218, 170, 218, 302, { stroke: P.copper, sw: 7 }) + g.line(280, 304, 280, 398, { stroke: P.copper, sw: 4 });
    h += g.circle(282, 145, 24, { fill: P.pcb }) + g.path("M282,170 L272,292 L372,296 L372,394 L404,394", { stroke: P.pcb, sw: 6 }) + g.path("M279,200 L330,250 L392,264", { stroke: P.pcb, sw: 6 });
    h += g.line(304, 140, 480, 140, { stroke: P.muted, sw: 1.5, dash: "5 5" });
    h += g.lines(625, 95, ["Top of screen at eye", "level, arm's length away"], { anchor: "start", size: 14 }, 19) + g.line(620, 112, 610, 130, { stroke: P.muted, sw: 1 });
    h += g.lines(420, 330, ["Forearms level,", "wrists straight"], { anchor: "start", size: 14 }, 19) + g.line(418, 320, 385, 266, { stroke: P.muted, sw: 1 });
    h += g.lines(30, 200, ["Adjustable chair", "with back support"], { anchor: "start", size: 14 }, 19) + g.line(150, 205, 212, 220, { stroke: P.muted, sw: 1 });
    h += g.text(430, 425, "Feet flat on the floor or a footrest", { anchor: "start", size: 14 }) + g.line(428, 420, 404, 398, { stroke: P.muted, sw: 1 });
    h += g.lines(30, 60, ["Take regular breaks: every 20 minutes,", "look 20 feet away for 20 seconds"], { anchor: "start", size: 14, bold: true, fill: P.copper }, 19);
    return h;
  } };
  D.L24 = { cap: "How a simulation supports training: model, practise safely, get feedback, repeat", draw: function (g) {
    var P = g.P, h = g.circle(400, 225, 150, { stroke: P.line, sw: 3, dash: "6 6" }) + g.box(310, 195, 180, 60, "Simulation", { fill: P.pcb, color: P.pcbInk, bold: true, size: 18 });
    [[400, 60, "Real situation", "e.g. engine failure"], [640, 225, "Computer model", "physics, graphics"], [400, 390, "Practise safely", "no real danger or cost"], [160, 225, "Feedback, repeat", "scores, replays"]].forEach(function (n) { h += g.box(n[0] - 110, n[1] - 32, 220, 64, [n[2], n[3]], { fill: P.copperSoft, size: 14, lh: 20 }); });
    h += g.path("M520,85 A150,150 0 0 1 600,170", { stroke: P.copper, sw: 3, arrow: "c" }) + g.path("M600,285 A150,150 0 0 1 520,365", { stroke: P.copper, sw: 3, arrow: "c" }) + g.path("M280,365 A150,150 0 0 1 200,285", { stroke: P.copper, sw: 3, arrow: "c" }) + g.path("M200,170 A150,150 0 0 1 280,85", { stroke: P.copper, sw: 3, arrow: "c" });
    return h;
  } };

  // ---------------- UNIT 4 ----------------
  D.D01 = { cap: "A Pupil class, two objects created from it, and a Prefect class that inherits from it", draw: function (g) {
    var P = g.P, h = g.rect(40, 40, 260, 240, { fill: P.card, stroke: P.pcb, sw: 2.5, r: 8 }) + g.box(40, 40, 260, 42, "class Pupil", { fill: P.pcb, color: P.pcbInk, bold: true, mono: true, size: 16, r: 8 });
    h += g.text(56, 100, "properties", { anchor: "start", size: 12, fill: P.muted, bold: true }) + g.lines(56, 124, ["name", "form", "merits"], { anchor: "start", mono: true, size: 14 }, 22);
    h += g.line(40, 192, 300, 192, { stroke: P.line }) + g.text(56, 208, "methods", { anchor: "start", size: 12, fill: P.muted, bold: true }) + g.lines(56, 232, ["add_merit()", "report()"], { anchor: "start", mono: true, size: 14 }, 22);
    [[470, 40, "p1 : Pupil", ['name = "Aoife"', 'form = "11B"', "merits = 3"]], [470, 205, "p2 : Pupil", ['name = "Ben"', 'form = "11C"', "merits = 5"]]].forEach(function (o) { h += g.rect(o[0], o[1], 290, 140, { fill: P.copperSoft, r: 8 }) + g.text(o[0] + 16, o[1] + 22, o[2], { anchor: "start", bold: true, mono: true, size: 15 }) + g.lines(o[0] + 16, o[1] + 56, o[3], { anchor: "start", mono: true, size: 14 }, 24) + g.arrow(302, o[1] + 70 > 160 ? 200 : 120, o[0] - 4, o[1] + 70, { dash: "6 5" }); });
    h += g.text(385, 175, "instances of Pupil", { size: 13, fill: P.muted });
    h += g.box(40, 345, 260, 70, ["class Prefect", "adds: badge, patrol()"], { fill: P.okSoft, mono: true, size: 14, lh: 22 }) + g.line(170, 343, 170, 296, { stroke: P.ink, sw: 2 }) + g.path("M160,296 L180,296 L170,282 Z", { fill: P.card, stroke: P.ink, sw: 2 }) + g.text(250, 315, "inherits", { size: 13, fill: P.muted });
    return h + g.lines(470, 380, ["Encapsulation: data is changed", "only through the methods"], { anchor: "start", size: 14 }, 20);
  } };
  D.D02 = { cap: "A compiler translates the whole program into an executable; an interpreter translates and runs one line at a time", draw: function (g) {
    var P = g.P, h = g.text(40, 40, "Compiler", { anchor: "start", bold: true, size: 18 });
    h += g.box(40, 70, 150, 70, ["Source code", "(high-level)"], { fill: P.soft, size: 14, lh: 20 }) + g.arrow(192, 105, 238, 105) + g.box(240, 70, 150, 70, "Compiler", { fill: P.pcb, color: P.pcbInk, bold: true }) + g.arrow(392, 105, 438, 105) + g.box(440, 70, 160, 70, ["Executable file", "machine code"], { fill: P.copperSoft, size: 14, lh: 20 }) + g.arrow(602, 105, 648, 105) + g.box(650, 70, 115, 70, ["Runs fast", "many times"], { fill: P.okSoft, size: 14, lh: 20 });
    h += g.text(315, 165, "whole program first · lists all errors", { size: 13, fill: P.muted });
    h += g.text(40, 225, "Interpreter", { anchor: "start", bold: true, size: 18 });
    h += g.box(40, 270, 150, 110, ["Source code", "(high-level)"], { fill: P.soft, size: 14, lh: 20 }) + g.arrow(192, 325, 238, 325) + g.rect(240, 250, 300, 150, { fill: P.paper, stroke: P.pcb, sw: 2, r: 8 }) + g.text(390, 268, "Interpreter", { bold: true, fill: P.pcb });
    ["line 1 → translate → run", "line 2 → translate → run", "line 3 → error: stops here"].forEach(function (t, i) { h += g.box(255, 288 + i * 36, 270, 30, t, { fill: i === 2 ? P.badSoft : P.card, mono: true, size: 12 }); });
    h += g.arrow(542, 325, 598, 325) + g.box(600, 290, 165, 70, ["Output", "translated every run"], { fill: P.okSoft, size: 14, lh: 20 });
    return h + g.text(400, 428, "C# is compiled (Visual Studio builds an .exe) · Python is usually interpreted", { size: 14, fill: P.muted });
  } };
  D.D03 = { cap: "Place values of an 8-bit byte showing 47 as 00101111", draw: function (g) {
    var P = g.P, h = "", pv = [128, 64, 32, 16, 8, 4, 2, 1], bits = "00101111";
    pv.forEach(function (v, i) { var x = 80 + i * 82; h += g.box(x, 70, 72, 52, String(v), { fill: P.pcb, color: P.pcbInk, bold: true, size: 20 }) + g.box(x, 132, 72, 72, bits[i], { fill: bits[i] === "1" ? P.copperSoft : P.card, stroke: bits[i] === "1" ? P.copper : P.line, mono: true, bold: true, size: 32 }); });
    h += g.text(400, 45, "Place value (each column is double the one to its right)", { size: 15, fill: P.muted });
    h += g.text(400, 260, "32 + 8 + 4 + 2 + 1 = 47", { size: 30, bold: true, fill: P.copper });
    h += g.text(116, 225, "MSB", { size: 13, fill: P.muted, bold: true }) + g.text(690, 225, "LSB", { size: 13, fill: P.muted, bold: true });
    h += g.lines(400, 330, ["Denary to binary: subtract the biggest place value that fits, write 1, move right.", "Binary to denary: add the place values that have a 1 under them."], { size: 15 }, 26);
    return h + g.text(400, 415, "8 bits = 1 byte · 2⁸ = 256 values (0 to 255)", { size: 16, bold: true });
  } };
  D.D04 = { cap: "Converting the byte 10101010 to hexadecimal AA by splitting it into nibbles", draw: function (g) {
    var P = g.P, h = g.text(240, 40, "Binary → hexadecimal", { bold: true, size: 18 });
    h += g.box(70, 70, 160, 60, "1010", { fill: P.copperSoft, stroke: P.copper, mono: true, bold: true, size: 28 }) + g.box(250, 70, 160, 60, "1010", { fill: P.okSoft, stroke: P.ok, mono: true, bold: true, size: 28 });
    h += g.text(240, 152, "split into two nibbles (4 bits each)", { size: 13, fill: P.muted });
    h += g.arrow(150, 165, 150, 200) + g.arrow(330, 165, 330, 200) + g.text(150, 222, "8+2 = 10", { size: 16 }) + g.text(330, 222, "8+2 = 10", { size: 16 }) + g.arrow(150, 240, 150, 275) + g.arrow(330, 240, 330, 275);
    h += g.box(110, 280, 80, 60, "A", { fill: P.copper, color: P.card, mono: true, bold: true, size: 30 }) + g.box(290, 280, 80, 60, "A", { fill: P.ok, color: P.card, mono: true, bold: true, size: 30 }) + g.text(240, 385, "10101010 = AA (= 170)", { size: 20, bold: true });
    h += g.text(640, 40, "Hex digits after 9", { bold: true, size: 16 });
    ["A", "B", "C", "D", "E", "F"].forEach(function (d, i) { var x = 520 + (i % 2) * 125, y = 70 + Math.floor(i / 2) * 80; h += g.box(x, y, 50, 60, d, { fill: P.pcb, color: P.pcbInk, mono: true, bold: true, size: 24 }) + g.text(x + 60, y + 30, "= " + (10 + i), { anchor: "start", size: 20 }); });
    return h + g.lines(640, 330, ["One hex digit = one nibble.", "Shorter and easier to read", "than binary – used for", "colour codes and MAC addresses."], { size: 14 }, 21);
  } };
  D.D05 = { cap: "Adding 11111111 and 00000001 in 8 bits causes overflow", draw: function (g) {
    var P = g.P, h = "", cw = 40, x0 = 260;
    function row(y, s, o) { var r = ""; s.split("").forEach(function (c, i) { r += g.text(x0 + i * cw, y, c, Object.assign({ mono: true, size: 30, bold: true }, o || {})); }); return r; }
    h += row(80, "1111111 ", { size: 16, fill: P.copper }) + g.text(x0 - 60, 80, "carry", { size: 13, fill: P.copper, anchor: "end" });
    h += row(140, "11111111") + g.text(x0 - 45, 190, "+", { mono: true, size: 30, bold: true }) + row(190, "00000001") + g.line(x0 - 60, 222, x0 + 8 * cw - 10, 222, { stroke: P.ink, sw: 3 });
    h += g.text(x0 - 40, 260, "1", { mono: true, size: 30, bold: true, fill: P.bad }) + row(260, "00000000");
    h += g.path("M" + (x0 - 14) + ",300 v12 h" + (8 * cw - 12) + " v-12", { stroke: P.pcb, sw: 2 }) + g.text(x0 + 3.5 * cw, 332, "8-bit register", { size: 14, fill: P.pcb, bold: true });
    h += g.arrow(x0 - 40, 360, x0 - 40, 282, { arrow: "r", stroke: P.bad }) + g.text(x0 - 40, 382, "overflow bit – lost", { size: 14, bold: true, fill: P.bad });
    h += g.lines(560 + 40, 140, ["255 + 1 = 256", "but 256 needs 9 bits,", "so the register", "stores 0."], { anchor: "start", size: 16 }, 26);
    return h + g.text(400, 425, "Rules: 0+0=0 · 0+1=1 · 1+1=0 carry 1 · 1+1+1=1 carry 1", { size: 15, fill: P.muted, mono: true });
  } };
  D.D06 = { cap: "ASCII compared with Unicode", draw: function (g) {
    var P = g.P, h = g.rect(30, 30, 350, 390, { fill: P.paper, stroke: P.copper, sw: 2, r: 12 }) + g.text(205, 62, "ASCII", { bold: true, size: 22, fill: P.copper });
    h += g.box(75, 95, 80, 80, "A", { fill: P.copper, color: P.card, bold: true, size: 40 }) + g.lines(175, 118, ["code 65", "01000001"], { anchor: "start", mono: true, size: 16 }, 28);
    h += g.lines(55, 225, ["7 bits → 128 characters", "8-bit extended → 256", "English letters, digits,", "punctuation, control codes", "1 byte per character"], { anchor: "start", size: 16 }, 34);
    h += g.rect(420, 30, 350, 390, { fill: P.paper, stroke: P.ok, sw: 2, r: 12 }) + g.text(595, 62, "Unicode", { bold: true, size: 22, fill: P.ok });
    ["A", "é", "Ł", "Ω", "ß"].forEach(function (c, i) { h += g.box(445 + i * 63, 105, 54, 60, c, { fill: P.ok, color: P.card, bold: true, size: 28 }); });
    return h + g.lines(445, 225, ["Up to 32 bits per character", "Over a million possible codes", "Almost every language + emoji", "First 128 codes match ASCII", "Uses more storage"], { anchor: "start", size: 16 }, 34);
  } };
  D.D07 = { cap: "Six variables, each holding a value of a different data type", draw: function (g) {
    var P = g.P, h = "", cards = [["numberOfFrames", "25", "integer", P.okSoft], ["costPerPupil", "12.50", "real (double)", P.warnSoft], ["grade", "'A'", "character", P.soft], ["name", '"Ciara"', "string", P.copperSoft], ["member", "true", "Boolean", P.badSoft], ["examDate", "21/05/2027", "date/time", P.okSoft]];
    cards.forEach(function (c, i) { var x = 30 + (i % 3) * 252, y = 40 + Math.floor(i / 3) * 190; h += g.rect(x, y, 234, 170, { fill: P.paper, stroke: P.line, r: 10 }) + g.text(x + 117, y + 30, c[0], { mono: true, size: 15, fill: P.muted }) + g.box(x + 27, y + 52, 180, 60, c[1], { fill: P.card, stroke: P.ink, mono: true, bold: true, size: 22 }) + g.box(x + 52, y + 125, 130, 30, c[2], { fill: c[3], size: 14, bold: true, r: 15 }); });
    return h + g.text(400, 430, "Console.ReadLine() returns a string – convert with Convert.ToInt32() or Convert.ToDouble() first.", { size: 14, fill: P.muted });
  } };
  D.D08 = { cap: "AND, OR and NOT logic gates with their truth tables", draw: function (g) {
    var P = g.P, h = "";
    function gateLines(x) { return g.line(x - 85, 115, x - 40, 115, { stroke: P.ink }) + g.line(x - 85, 165, x - 40, 165, { stroke: P.ink }) + g.text(x - 95, 115, "A", { size: 14, bold: true }) + g.text(x - 95, 165, "B", { size: 14, bold: true }) + g.line(x + 50, 140, x + 90, 140, { stroke: P.ink }) + g.text(x + 100, 140, "Q", { size: 14, bold: true }); }
    var ax = 140; h += gateLines(ax) + g.path("M" + (ax - 40) + ",90 h40 a50,50 0 0 1 0,100 h-40 z", { fill: P.copperSoft, stroke: P.ink, sw: 2.5 }) + g.text(ax, 40, "AND", { bold: true, size: 20 });
    var ox = 400; h += gateLines(ox) + g.path("M" + (ox - 48) + ",90 Q" + (ox - 18) + ",140 " + (ox - 48) + ",190 Q" + (ox + 20) + ",190 " + (ox + 52) + ",140 Q" + (ox + 20) + ",90 " + (ox - 48) + ",90 z", { fill: P.okSoft, stroke: P.ink, sw: 2.5 }) + g.text(ox, 40, "OR", { bold: true, size: 20 });
    var nx = 660; h += g.line(nx - 85, 140, nx - 40, 140, { stroke: P.ink }) + g.text(nx - 95, 140, "A", { size: 14, bold: true }) + g.path("M" + (nx - 40) + ",100 L" + (nx - 40) + ",180 L" + (nx + 30) + ",140 Z", { fill: P.soft, stroke: P.ink, sw: 2.5 }) + g.circle(nx + 38, 140, 8, { fill: P.card, stroke: P.ink, sw: 2.5 }) + g.line(nx + 46, 140, nx + 90, 140, { stroke: P.ink }) + g.text(nx + 100, 140, "Q", { size: 14, bold: true }) + g.text(nx, 40, "NOT", { bold: true, size: 20 });
    function table(x, rows, cols) { var t = "", w = 44; cols.forEach(function (c, i) { t += g.box(x + i * w, 230, w, 30, c, { fill: P.pcb, color: P.pcbInk, bold: true, size: 14, r: 0 }); }); rows.forEach(function (r, ri) { r.forEach(function (v, i) { t += g.box(x + i * w, 260 + ri * 30, w, 30, v, { fill: i === r.length - 1 ? (v === "1" ? P.okSoft : P.card) : P.card, stroke: P.line, sw: 1, mono: true, size: 15, r: 0, bold: i === r.length - 1 }); }); }); return t; }
    h += table(74, [["0", "0", "0"], ["0", "1", "0"], ["1", "0", "0"], ["1", "1", "1"]], ["A", "B", "Q"]) + table(334, [["0", "0", "0"], ["0", "1", "1"], ["1", "0", "1"], ["1", "1", "1"]], ["A", "B", "Q"]) + table(616, [["0", "1"], ["1", "0"]], ["A", "Q"]);
    return h + g.lines(400, 405, ["AND: 1 only if both inputs are 1 · OR: 1 if at least one is 1 · NOT: reverses the input"], { size: 15, fill: P.muted });
  } };
  D.D09 = { cap: "Decomposition of a school canteen app into sub-problems, with an abstraction note", draw: function (g) {
    var P = g.P, h = g.box(290, 30, 220, 48, "School canteen app", { fill: P.pcb, color: P.pcbInk, bold: true, size: 16 });
    var l2 = [[115, "Log in"], [305, "Choose items"], [495, "Calculate cost"], [685, "Pay"]];
    l2.forEach(function (n) { h += g.path("M400,78 V108 H" + n[0] + " V140", { stroke: P.muted, sw: 2 }) + g.box(n[0] - 85, 140, 170, 46, n[1], { fill: n[1] === "Calculate cost" ? P.copperSoft : P.soft, size: 15, bold: true }); });
    [[340, "Add prices"], [495, "Apply meal deal"], [650, "Free-meal allowance"]].forEach(function (n) { h += g.path("M495,186 V212 H" + n[0] + " V240", { stroke: P.muted, sw: 2 }) + g.box(n[0] - 73, 240, 146, 46, n[1], { fill: P.card, stroke: P.copper, size: 13 }); });
    h += g.text(95, 263, "Decomposition", { size: 16, bold: true, fill: P.copper }) + g.text(95, 285, "smaller sub-problems", { size: 13, fill: P.muted });
    return h + g.rect(40, 330, 720, 80, { fill: P.okSoft, r: 10 }) + g.text(60, 355, "Abstraction", { anchor: "start", bold: true, size: 16, fill: P.ok }) + g.text(60, 385, "Keep: item, price, allergens, quantity.   Remove: food colour, the cook's name, plate size.", { anchor: "start", size: 15 });
  } };
  D.D10 = { cap: "Flowchart symbols and a flowchart that turns a fan on above 20 degrees", draw: function (g) {
    var P = g.P, h = g.text(130, 35, "Symbols", { bold: true, size: 16 });
    h += g.term(80, 80, 90, 34, "Start") + g.text(140, 80, "Terminator", { anchor: "start", size: 14 });
    h += g.para(35, 140, 95, 36, "INPUT") + g.text(140, 158, "Input / output", { anchor: "start", size: 14 });
    h += g.box(35, 200, 90, 38, "x ← x + 1", { fill: P.okSoft, stroke: P.ok, mono: true, size: 12 }) + g.text(140, 219, "Process", { anchor: "start", size: 14 });
    h += g.diamond(80, 300, 48, 32, "?", { size: 16 }) + g.text(140, 300, "Decision", { anchor: "start", size: 14 });
    h += g.line(270, 30, 270, 420, { stroke: P.line, sw: 1.5, dash: "4 6" });
    h += g.term(500, 45, 110, 34, "Start") + g.arrow(500, 62, 500, 88) + g.para(410, 90, 180, 40, "INPUT temperature", { size: 13 }) + g.arrow(500, 130, 500, 158);
    h += g.diamond(500, 200, 110, 40, "temperature > 20?", { size: 13 });
    h += g.path("M610,200 H700 V255", { stroke: P.muted, sw: 2, arrow: "a" }) + g.text(640, 188, "Yes", { size: 13, bold: true, fill: P.ok });
    h += g.arrow(500, 240, 500, 255) + g.text(518, 250, "No", { size: 13, bold: true, fill: P.bad, anchor: "start" });
    h += g.para(425, 258, 150, 40, "OUTPUT Fan off", { size: 13 }) + g.para(628, 258, 150, 40, "OUTPUT Fan on", { size: 13 });
    h += g.path("M500,298 V345", { stroke: P.muted, sw: 2 }) + g.path("M703,298 V345 H500", { stroke: P.muted, sw: 2 }) + g.arrow(500, 345, 500, 368);
    return h + g.term(500, 388, 110, 34, "Stop");
  } };
  D.D11 = { cap: "Bubble sort passes on 5, 3, 8, 1, 4", draw: function (g) {
    var P = g.P, h = "", rows = [["Start", [5, 3, 8, 1, 4], 0], ["Pass 1", [3, 5, 1, 4, 8], 1], ["Pass 2", [3, 1, 4, 5, 8], 2], ["Pass 3", [1, 3, 4, 5, 8], 3], ["Pass 4", [1, 3, 4, 5, 8], 5]];
    rows.forEach(function (r, i) { var y = 30 + i * 72; h += g.text(60, y + 27, r[0], { anchor: "start", bold: true, size: 16 }); r[1].forEach(function (v, j) { var sorted = j >= 5 - r[2]; h += g.box(190 + j * 82, y, 66, 54, String(v), { fill: sorted ? P.okSoft : P.card, stroke: sorted ? P.ok : P.line, bold: true, size: 22, mono: true }); }); });
    h += g.text(620, 30 + 4 * 72 + 27, "no swaps → stop", { anchor: "start", bold: true, fill: P.ok, size: 15 });
    h += g.text(620, 30 + 72 + 27, "8 bubbles to the end", { anchor: "start", size: 14, fill: P.muted });
    return h + g.text(400, 425, "Compare neighbours, swap if out of order. Green = in its final place.", { size: 15, fill: P.muted });
  } };
  D.D12 = { cap: "Binary search for 31 in a sorted list, halving the search each step", draw: function (g) {
    var P = g.P, h = "", L = [3, 8, 12, 19, 27, 31, 40, 52, 61, 77], steps = [[0, 9, 4, "31 > 27, so discard the left half"], [5, 9, 7, "31 < 52, so discard the right half"], [5, 6, 5, "found at index 5"]];
    steps.forEach(function (s, si) {
      var y = 45 + si * 130;
      L.forEach(function (v, i) { var live = i >= s[0] && i <= s[1], mid = i === s[2]; h += g.text(85 + i * 68, y - 14, String(i), { size: 11, fill: P.muted, mono: true }) + g.box(60 + i * 68, y, 52, 46, String(v), { fill: mid ? (si === 2 ? P.ok : P.copper) : (live ? P.card : P.soft), stroke: live ? P.ink : "none", color: mid ? P.card : (live ? P.ink : P.muted), bold: mid, mono: true, size: 17 }) + (live ? "" : g.line(64 + i * 68, y + 23, 108 + i * 68, y + 23, { stroke: P.muted, sw: 1.5 })); });
      h += g.text(400, y + 70, "Step " + (si + 1) + ": middle is " + L[s[2]] + " – " + s[3], { size: 15, bold: si === 2, fill: si === 2 ? P.ok : P.ink });
    });
    return h;
  } };
  D.D13 = { cap: "A dry run of a WHILE loop recorded in a trace table", draw: function (g) {
    var P = g.P, h = g.rect(30, 40, 300, 200, { fill: P.code || P.ink, r: 10 }) + g.lines(50, 75, ["a ← 1", "WHILE a < 20", "    a ← a * 2", "END WHILE", "OUTPUT a"], { anchor: "start", mono: true, size: 16, fill: P.card }, 32);
    var cols = [["a", 90], ["a < 20 ?", 150], ["Output", 120]], x0 = 400, rows = [["1", "True", ""], ["2", "True", ""], ["4", "True", ""], ["8", "True", ""], ["16", "True", ""], ["32", "False", "32"]];
    var x = x0; cols.forEach(function (c) { h += g.box(x, 40, c[1], 40, c[0], { fill: P.pcb, color: P.pcbInk, bold: true, size: 15, r: 0 }); x += c[1]; });
    rows.forEach(function (r, ri) { var xx = x0; r.forEach(function (v, ci) { h += g.box(xx, 80 + ri * 44, cols[ci][1], 44, v, { fill: ri === 5 ? P.copperSoft : P.card, stroke: P.line, sw: 1, mono: true, size: 15, r: 0, bold: ri === 5 }); xx += cols[ci][1]; }); });
    return h + g.lines(30, 290, ["Check the condition every time,", "including the last one: 32 < 20 is", "False, so the loop stops and 32 is", "output – not 16."], { anchor: "start", size: 15 }, 24);
  } };
  D.D14 = { cap: "A variable whose value changes compared with a constant, and DIV and MOD", draw: function (g) {
    var P = g.P, h = g.text(200, 35, "Variable", { bold: true, size: 18 }) + g.box(70, 60, 260, 70, "", { fill: P.card, stroke: P.ink }) + g.text(90, 50, "score", { anchor: "start", mono: true, size: 14, fill: P.muted });
    h += g.text(120, 95, "0", { mono: true, size: 26, fill: P.muted }) + g.line(108, 95, 132, 95, { stroke: P.bad }) + g.text(200, 95, "5", { mono: true, size: 26, fill: P.muted }) + g.line(188, 95, 212, 95, { stroke: P.bad }) + g.text(280, 95, "12", { mono: true, size: 26, bold: true });
    h += g.text(200, 155, "value can change while the program runs", { size: 14, fill: P.muted });
    h += g.text(600, 35, "Constant", { bold: true, size: 18 }) + g.box(470, 60, 260, 70, "VAT_RATE = 0.2", { fill: P.copperSoft, stroke: P.copper, mono: true, bold: true, size: 18 }) + g.text(600, 155, "fixed: change it in one place only", { size: 14, fill: P.muted });
    h += g.line(30, 190, 770, 190, { stroke: P.line, sw: 1.5, dash: "4 6" }) + g.text(400, 220, "47 pupils, 12 per minibus", { bold: true, size: 17 });
    for (var i = 0; i < 3; i++) h += g.box(90 + i * 140, 250, 120, 60, "12", { fill: P.pcb, color: P.pcbInk, bold: true, size: 22 });
    h += g.box(520, 250, 100, 60, "11", { fill: P.copperSoft, stroke: P.copper, bold: true, size: 22, dash: "5 4" });
    h += g.text(250, 345, "47 DIV 12 = 3 full buses", { mono: true, size: 17, bold: true, fill: P.pcb }) + g.text(570, 345, "47 MOD 12 = 11 left", { mono: true, size: 17, bold: true, fill: P.copper });
    return h + g.text(400, 405, "C#: / with two ints is DIV, % is MOD, Math.Pow() is power", { size: 15, fill: P.muted });
  } };
  D.D15 = { cap: "Flowchart of an IF, ELSE IF, ELSE price calculation", draw: function (g) {
    var P = g.P, h = g.para(220, 15, 170, 38, "INPUT hours", { size: 13 }) + g.arrow(305, 53, 305, 78);
    h += g.diamond(305, 112, 95, 32, "hours <= 2 ?", { size: 13 }) + g.path("M400,112 H468", { stroke: P.muted, sw: 2, arrow: "a" }) + g.text(430, 100, "Yes", { size: 12, bold: true, fill: P.ok }) + g.box(470, 94, 140, 36, "rate ← 40", { fill: P.okSoft, stroke: P.ok, mono: true, size: 14 });
    h += g.arrow(305, 144, 305, 168) + g.text(320, 156, "No", { size: 12, bold: true, fill: P.bad, anchor: "start" });
    h += g.diamond(305, 202, 95, 32, "hours <= 5 ?", { size: 13 }) + g.path("M400,202 H468", { stroke: P.muted, sw: 2, arrow: "a" }) + g.text(430, 190, "Yes", { size: 12, bold: true, fill: P.ok }) + g.box(470, 184, 140, 36, "rate ← 35", { fill: P.okSoft, stroke: P.ok, mono: true, size: 14 });
    h += g.arrow(305, 234, 305, 258) + g.text(320, 246, "No", { size: 12, bold: true, fill: P.bad, anchor: "start" }) + g.box(235, 260, 140, 36, "rate ← 30", { fill: P.okSoft, stroke: P.ok, mono: true, size: 14 });
    h += g.path("M610,112 H650 V320 H305", { stroke: P.muted, sw: 2 }) + g.path("M610,202 H650", { stroke: P.muted, sw: 2 }) + g.path("M305,296 V320", { stroke: P.muted, sw: 2 }) + g.arrow(305, 320, 305, 336);
    h += g.box(200, 338, 210, 36, "cost ← hours * rate", { fill: P.okSoft, stroke: P.ok, mono: true, size: 14 }) + g.arrow(305, 374, 305, 396) + g.para(220, 398, 170, 36, "OUTPUT cost", { size: 13 });
    return h + g.lines(680, 160, ["Only the first", "true branch", "runs, so order", "matters."], { anchor: "start", size: 14, fill: P.muted }, 20);
  } };
  D.D16 = { cap: "Flowchart of a WHILE loop with a sentinel value, and a FOR loop counting", draw: function (g) {
    var P = g.P, h = g.para(140, 20, 170, 36, "INPUT number", { size: 13 }) + g.arrow(225, 56, 225, 88);
    h += g.diamond(225, 125, 100, 34, "number ≠ 0 ?", { size: 13 }) + g.arrow(225, 159, 225, 188) + g.text(240, 172, "Yes", { size: 12, bold: true, fill: P.ok, anchor: "start" });
    h += g.para(120, 190, 210, 36, "OUTPUT number * 2.54", { size: 12 }) + g.arrow(225, 226, 225, 248) + g.para(140, 250, 170, 36, "INPUT number", { size: 13 });
    h += g.path("M225,286 V312 H70 V72 H225", { stroke: P.copper, sw: 2.5, arrow: "c" }) + g.text(60, 200, "loop back", { rot: -90, size: 13, fill: P.copper, bold: true });
    h += g.path("M325,125 H362", { stroke: P.muted, sw: 2, arrow: "a" }) + g.text(340, 112, "No", { size: 12, bold: true, fill: P.bad }) + g.para(364, 106, 140, 38, "OUTPUT Bye", { size: 13 });
    h += g.text(225, 345, "WHILE: unbounded – condition checked", { size: 14 }) + g.text(225, 365, "before each repeat; 0 is the sentinel", { size: 14 });
    h += g.line(540, 30, 540, 420, { stroke: P.line, sw: 1.5, dash: "4 6" }) + g.text(660, 50, "for (int i = 0; i < 5; i++)", { mono: true, size: 14, bold: true });
    for (var i = 0; i < 5; i++) h += g.box(568 + i * 42, 80, 36, 44, String(i), { fill: P.pcb, color: P.pcbInk, mono: true, bold: true, size: 18 });
    h += g.lines(660, 165, ["FOR: bounded –", "repeats a set number", "of times. i < 5 gives", "0 to 4, not 5."], { size: 14 }, 22);
    return h + g.lines(660, 300, ["do … while (C#) and", "REPEAT…UNTIL check at", "the end: always run once."], { size: 14, fill: P.muted }, 22);
  } };
  D.D17 = { cap: "An array of five votes showing elements and zero-based indexes", draw: function (g) {
    var P = g.P, h = g.text(40, 190, "votes =", { anchor: "start", mono: true, size: 20, bold: true }), v = [12, 30, 25, 18, 27];
    v.forEach(function (n, i) { var x = 160 + i * 120; h += g.box(x, 150, 110, 80, String(n), { fill: i === 2 ? P.copperSoft : P.card, stroke: i === 2 ? P.copper : P.ink, mono: true, bold: true, size: 28 }) + g.text(x + 55, 258, String(i), { mono: true, size: 18, fill: P.pcb, bold: true }); });
    h += g.text(215, 95, "element (the value)", { size: 15 }) + g.arrow(215, 108, 215, 146);
    h += g.text(455, 110, "votes[2] → 25", { mono: true, size: 18, bold: true, fill: P.copper }) + g.arrow(455, 124, 455, 146, { arrow: "c" });
    h += g.arrow(215, 320, 215, 274, { arrow: "g" }) + g.text(215, 338, "index (the position)", { size: 15 });
    return h + g.text(400, 405, "Indexes start at 0 · the last index is votes.Length − 1 · loop while i < votes.Length", { size: 15, fill: P.muted });
  } };
  D.D18 = { cap: "String indexes, Substring, IndexOf and Length for the word Belfast", draw: function (g) {
    var P = g.P, h = g.text(400, 45, 'string text = "Belfast";', { mono: true, size: 22, bold: true });
    "Belfast".split("").forEach(function (c, i) { var x = 105 + i * 85; h += g.text(x + 40, 98, String(i), { mono: true, size: 15, fill: P.pcb, bold: true }) + g.box(x, 115, 80, 80, c, { fill: i < 3 ? P.copperSoft : (i === 3 ? P.okSoft : P.card), stroke: P.ink, mono: true, bold: true, size: 32 }); });
    h += g.path("M107,208 v12 h251 v-12", { stroke: P.copper, sw: 2.5 }) + g.text(232, 242, 'text.Substring(0, 3) → "Bel"', { mono: true, size: 16, bold: true, fill: P.copper });
    h += g.arrow(400, 290, 400, 200, { arrow: "g" }) + g.text(400, 310, 'text.IndexOf("f") → 3', { mono: true, size: 16, bold: true, fill: P.ok });
    h += g.text(640, 260, "text.Length → 7", { mono: true, size: 16, bold: true });
    return h + g.text(400, 380, '"Bel" + "fast" → "Belfast"  (concatenation)', { mono: true, size: 16 }) + g.text(400, 420, 'Split(\',\') breaks a string into an array at each comma', { size: 15, fill: P.muted });
  } };
  D.D19 = { cap: "A main program passing arguments into a function and receiving the return value", draw: function (g) {
    var P = g.P, h = g.rect(30, 110, 270, 170, { fill: P.paper, stroke: P.line, r: 10 }) + g.text(165, 132, "Main program", { bold: true, size: 15 }) + g.lines(48, 175, ["double total = AddVat(40, 0.2);", "Console.WriteLine(total);"], { anchor: "start", mono: true, size: 13 }, 30);
    h += g.rect(450, 90, 320, 210, { fill: P.pcb, r: 12 }) + g.text(610, 125, "static double AddVat(double price, double rate)", { mono: true, size: 14, fill: P.pcbInk, bold: true }) + g.text(610, 195, "return price + price * rate;", { mono: true, size: 13, fill: P.pcbInk });
    h += g.path("M300,160 C370,120 400,120 448,130", { stroke: P.copper, sw: 3, arrow: "c" }) + g.text(370, 82, "arguments 40, 0.2", { size: 13, fill: P.copper, bold: true }) + g.text(370, 100, "→ price, rate", { size: 13, fill: P.copper });
    h += g.path("M448,250 C400,290 360,290 302,250", { stroke: P.ok, sw: 3, arrow: "g" }) + g.text(375, 305, "return 48", { size: 15, fill: P.ok, bold: true, mono: true });
    return h + g.text(400, 380, "Write it once · call it many times · test it on its own", { size: 17, bold: true }) + g.text(400, 410, "A function returns a value; a procedure does not.", { size: 15, fill: P.muted });
  } };
  D.D20 = { cap: "Opening, reading or writing, and closing a text file, with read, write and append modes", draw: function (g) {
    var P = g.P, h = g.box(30, 110, 200, 120, ["Program", "data in RAM is", "lost when it ends"], { fill: P.soft, size: 14, lh: 22 });
    h += g.path("M620,80 h100 l30,30 v150 h-130 z", { fill: P.card, stroke: P.ink, sw: 2 }) + g.path("M720,80 v30 h30", { stroke: P.ink, sw: 2 }) + g.text(685, 140, "scores.txt", { mono: true, size: 14, bold: true }) + g.lines(685, 175, ["Aoife,87", "Ben,74"], { mono: true, size: 13, fill: P.muted }, 22) + g.text(685, 290, "on disk: kept", { size: 13, fill: P.muted });
    [["1", 'new StreamReader / StreamWriter("scores.txt")'], ["2", "ReadLine()  or  WriteLine(...)"], ["3", "Close()"]].forEach(function (s, i) { var y = 100 + i * 55; h += g.num(258, y + 18, s[0], P.pcb) + g.box(278, y, 320, 36, s[1], { fill: P.card, stroke: P.line, mono: true, size: 13 }); });
    [["R", "StreamReader: read", P.okSoft], ["W", "StreamWriter: overwrite", P.badSoft], ["A", "StreamWriter(…, true)", P.copperSoft]].forEach(function (m, i) { var x = 40 + i * 245; h += g.box(x, 330, 60, 60, m[0], { fill: m[2], mono: true, bold: true, size: 26 }) + g.text(x + 72, 360, m[1], { anchor: "start", size: 15 }); });
    return h + g.text(400, 425, "Reading a file that does not exist causes a run-time error – trap it.", { size: 14, fill: P.muted });
  } };
  D.D21 = { cap: "When syntax, run-time and logic errors appear during development", draw: function (g) {
    var P = g.P, h = g.line(70, 120, 740, 120, { stroke: P.line, sw: 4 });
    [[100, "Write code"], [300, "Translate"], [500, "Run"], [700, "Output"]].forEach(function (s) { h += g.circle(s[0], 120, 16, { fill: P.pcb }) + g.text(s[0], 80, s[1], { bold: true, size: 16 }); });
    [[300, "Syntax error", ["breaks language rules", "e.g. missing ;", "found by compiler"], P.warn, P.warnSoft], [500, "Run-time error", ["program crashes", "e.g. divide by zero", "trap with try/catch"], P.bad, P.badSoft], [700, "Logic error", ["runs, wrong answer", "e.g. > instead of >=", "found by testing"], P.copper, P.copperSoft]].forEach(function (c) {
      var x = Math.min(c[0] - 85, 630); h += g.line(c[0], 136, c[0], 180, { stroke: c[3], sw: 2.5 }) + g.rect(x, 180, 170, 170, { fill: c[4], stroke: c[3], sw: 2, r: 10 }) + g.text(x + 85, 208, c[1], { bold: true, size: 16, fill: c[3] }) + g.lines(x + 85, 250, c[2], { size: 14 }, 28);
    });
    return h + g.text(400, 415, "Dry runs, trace tables and breakpoints help find logic errors.", { size: 15, fill: P.muted });
  } };
  D.D22 = { cap: "Black box and white box testing, and test data on a number line for an 11 to 18 age range", draw: function (g) {
    var P = g.P, h = g.text(210, 30, "Black box", { bold: true, size: 17 }) + g.arrow(60, 85, 140, 85) + g.text(95, 70, "input", { size: 12, fill: P.muted }) + g.box(142, 55, 130, 60, "?", { fill: P.ink, color: P.card, bold: true, size: 26 }) + g.arrow(274, 85, 354, 85) + g.text(318, 70, "output", { size: 12, fill: P.muted }) + g.text(210, 135, "code not seen · checks requirements", { size: 13, fill: P.muted });
    h += g.text(590, 30, "White box", { bold: true, size: 17 }) + g.rect(480, 50, 220, 70, { fill: P.card, stroke: P.ink, r: 6 }) + g.lines(495, 68, ["if (age >= 11 &&", "    age <= 18)", "    Accept();"], { anchor: "start", mono: true, size: 11 }, 16) + g.text(590, 135, "tests every path through the code", { size: 13, fill: P.muted });
    var x0 = 60, step = 680 / 13; function X(v) { return x0 + (v - 8) * step; }
    h += g.rect(X(11), 230, X(18) - X(11), 40, { fill: P.okSoft, r: 4 }) + g.line(x0, 270, 740, 270, { stroke: P.ink, sw: 2 });
    for (var v = 8; v <= 21; v++) h += g.line(X(v), 264, X(v), 276, { stroke: P.ink }) + g.text(X(v), 292, String(v), { size: 12, mono: true });
    h += g.text((X(11) + X(18)) / 2, 215, "accepted: 11 to 18", { size: 14, bold: true, fill: P.ok });
    [[14, "valid", P.ok, 340], [11, "extreme", P.copper, 340], [18, "extreme", P.copper, 340], [10, "invalid", P.bad, 380], [19, "invalid", P.bad, 380]].forEach(function (m) { h += g.circle(X(m[0]), 250, 8, { fill: m[2] }) + g.line(X(m[0]), 302, X(m[0]), m[3] - 14, { stroke: m[2], sw: 1.5 }) + g.text(X(m[0]), m[3], m[1], { size: 13, bold: true, fill: m[2] }); });
    return h + g.text(400, 425, "Also test invalid types (\"ten\") and null data (nothing entered).", { size: 14, fill: P.muted });
  } };
  D.D23 = { cap: "Evaluating a solution against the user requirements: meets design criteria, complete, efficient, robust", draw: function (g) {
    var P = g.P, h = g.circle(400, 225, 78, { fill: P.pcb }) + g.lines(400, 213, ["User", "requirements"], { bold: true, size: 16, fill: P.pcbInk }, 22);
    [[40, 30, "Meets design criteria", ["Does it do what the", "design said? Met / partly / not"]], [470, 30, "Complete", ["Is every required feature", "present and working?"]], [40, 290, "Efficient", ["Quick, few steps for the", "user, sensible code?"]], [470, 290, "Robust", ["Copes with invalid, null and", "high volumes of data?"]]].forEach(function (c, i) {
      h += g.rect(c[0], c[1], 290, 130, { fill: P.paper, stroke: P.copper, sw: 2, r: 12 }) + g.text(c[0] + 145, c[1] + 30, c[2], { bold: true, size: 17, fill: P.copper }) + g.lines(c[0] + 145, c[1] + 70, c[3], { size: 14 }, 22);
      h += g.line(c[0] + (i % 2 ? 0 : 290), c[1] + (i < 2 ? 130 : 0), 400 + (i % 2 ? 55 : -55), 225 + (i < 2 ? -55 : 55), { stroke: P.line, sw: 2 });
    });
    return h;
  } };

  root.Diagrams = {
    pal: PAL,
    has: function (id) { return !!D[id]; },
    caption: function (id) { return D[id] ? D[id].cap : ""; },
    svg: function (id, P, opts) {
      var d = D[id]; if (!d) return "";
      P = P || PAL.light; var g = mk(P); opts = opts || {};
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"' + (opts.w ? ' width="' + opts.w + '" height="' + Math.round(opts.w * 450 / 800) + '"' : "") + ' role="img" aria-label="' + esc(d.cap) + '">' + g.defs() + '<rect width="800" height="450" fill="' + P.card + '"/>' + d.draw(g) + "</svg>";
    },
    ids: function () { return Object.keys(D); },
    // extra courses register their own lesson diagrams: Diagrams.add("AP01", { cap: "…", draw: function (g) { … } })
    add: function (id, def) { D[id] = def; }
  };
})(typeof window !== "undefined" ? window : global);
