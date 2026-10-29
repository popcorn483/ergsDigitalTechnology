// Shared PowerPoint builder (Node and browser)
(function (root) {
var C = root.COURSE;
var ICONS = {};
const HEX = { ink: "15221C", pcb: "11503E", copper: "A95A24", soft: "E4ECE6", muted: "56675E", copperSoft: "F5E6DA", code: "0E1D17", white: "FFFFFF", ok: "2C7A4B" };
const ICON_GCSE = { T1: "FaFileAlt", T2: "FaCogs", T3: "FaDatabase", T4: "FaTable", T5: "FaMicrochip", T6: "FaNetworkWired", T7: "FaShieldAlt", T8: "FaCloud", T9: "FaBalanceScale", T10: "FaGamepad",
  T41: "FaLaptopCode", T42: "FaHashtag", T43: "FaProjectDiagram", T44: "FaCode", T45: "FaBug", T46: "FaVial", T47: "FaClipboardCheck" };
const ICON_GCE = { G1: "FaLightbulb", G2: "FaSearch", G3: "FaDraftingCompass", G4: "FaRocket", G5: "FaSyncAlt", G6: "FaTasks", G7: "FaShieldAlt", G8: "FaProjectDiagram", G9: "FaCode", G10: "FaCubes",
  G11: "FaHashtag", G12: "FaInfoCircle", G13: "FaMicrochip", G14: "FaCompress", G15: "FaCogs", G16: "FaGlobe", G17: "FaHtml5", G18: "FaDatabase", G19: "FaTable", G20: "FaNetworkWired",
  G21: "FaCloud", G22: "FaBrain", G23: "FaBalanceScale", G24: "FaClipboardCheck" };
const ICON = C && C.hub ? ICON_GCE : ICON_GCSE;
const topic = id => C.topics.find(t => t.id === id);
const unitName = u => { const x = C.hub && C.hub.units.find(y => y.id === u); return x ? x.name : u === "U4" ? "Unit 4: Digital Development Concepts" : "Unit 1: Digital Technology"; };
const QUAL = () => (C.hub && C.hub.qual) || "CCEA GCSE Digital Technology";
const PROG = () => (C.hub && C.hub.prog) || "U4";
const ushort = u => { const x = C.hub && C.hub.units.find(y => y.id === u); return x ? x.short : u === "U4" ? "Unit 4" : "Unit 1"; };

// rough text-fit estimate (Calibri ≈ 0.5 em average width)
function lines(text, widthIn, pt) { const per = Math.max(10, Math.floor(widthIn * 72 / (pt * 0.5))); return Math.max(1, Math.ceil(text.length / per)); }
function bulletHeight(items, widthIn, pt) { return items.reduce((s, b) => s + lines(b, widthIn - 0.35, pt) * pt * 1.18 / 72 + pt * 0.45 / 72, 0); }
function chooseBullets(items, widthIn, maxH) {
  for (const pt of [18, 17, 16, 15, 14]) if (bulletHeight(items, widthIn, pt) <= maxH) return { pt, groups: [items] };
  // split across slides at 14pt
  const groups = []; let cur = [];
  items.forEach(b => { if (cur.length && bulletHeight(cur.concat([b]), widthIn, 15) > maxH) { groups.push(cur); cur = []; } cur.push(b); });
  if (cur.length) groups.push(cur);
  return { pt: 15, groups };
}
function bulletRuns(items, pt) { return items.map((b, i) => ({ text: b, options: { bullet: { indent: 16 }, breakLine: i < items.length - 1, paraSpaceAfter: 6, fontSize: pt } })); }

function defineLayouts(pres) {
  const c = { accent1: "11503E", accent4: "56675E", accent5: "F5E6DA", accent6: "0E1D17", background1: "FFFFFF", background2: "E4ECE6" };
  pres.defineSlideMaster({ title: "TITLE", background: { color: c.accent1 }, objects: [
    { placeholder: { options: { name: "eyebrow", type: "body", x: 0.6, y: 0.7, w: 7.6, h: 0.35, fontSize: 12, bold: true, color: c.accent5, charSpacing: 2 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.05, w: 7.8, h: 1.5, fontSize: 38, bold: true, color: c.background1, valign: "top", align: "left" }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 2.75, w: 8.4, h: 2.2, fontSize: 16, color: c.background2, valign: "top" }, text: "" } }
  ] });
  pres.defineSlideMaster({ title: "CONTENT", background: { color: c.background1 }, margin: [0.5, 0.5, 0.5, 0.5], objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.32, w: 8.1, h: 0.8, fontSize: 30, bold: true, color: c.accent1, valign: "middle", align: "left" }, text: "" } },
    { text: { text: QUAL(), options: { x: 0.5, y: 5.22, w: 5, h: 0.25, fontSize: 9, color: c.accent4, isTextBox: true, margin: 0 } } }
  ], slideNumber: { x: 9.0, y: 5.2, w: 0.5, h: 0.28, fontSize: 9, color: "56675E", align: "right" } });
  pres.defineSlideMaster({ title: "SECTION", background: { color: c.accent6 }, objects: [
    { placeholder: { options: { name: "eyebrow", type: "body", x: 0.6, y: 0.6, w: 8, h: 0.35, fontSize: 12, bold: true, color: c.accent5, charSpacing: 2 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.95, w: 8.6, h: 0.9, fontSize: 32, bold: true, color: c.background1, align: "left" }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 1.95, w: 8.6, h: 3.1, fontSize: 18, color: c.background2, valign: "top" }, text: "" } }
  ], slideNumber: { x: 9.0, y: 5.2, w: 0.5, h: 0.28, fontSize: 9, color: "E4ECE6", align: "right" } });
}

// Long content-slide headings shrink so they stay inside the title area
function fitTitles(pres) {
  const add = pres.addSlide.bind(pres);
  pres._list = [];
  pres.addSlide = o => {
    const sl = add(o), at = sl.addText.bind(sl);
    pres._list.push({ s: sl, master: o && o.masterName, num: pres._list.length + 1 });
    if (o && o.masterName === "SECTION") sl.addShape("rect", { x: 0, y: 0, w: 0.02, h: 0.02, fill: { color: "0E1D17", transparency: 100 }, line: { type: "none" }, objectName: "slide-kind:section" });
    if (o && o.masterName === "CONTENT") sl.addText = (t, op) => (op && op.placeholder === "title" && !op.fontSize && typeof t === "string" && t.length > 38) ? at([{ text: t, options: { fontSize: t.length > 56 ? 20 : t.length > 46 ? 23 : 26 } }], op) : at(t, op);
    return sl;
  };
  return pres;
}
// ---------- interactive building blocks (tap-to-check, menus) ----------
let KEYN = 0;
const key = () => "k" + (++KEYN);
const slideNum = pres => pres._list.length;
function button(s, text, o) {
  const runs = Array.isArray(text) ? text : [{ text, options: o.link ? { hyperlink: { slide: o.link, tooltip: o.tip || String(text) } } : {} }];
  s.addText(runs, { shape: "roundRect", rectRadius: o.r || 0.08, x: o.x, y: o.y, w: o.w, h: o.h, fill: { color: o.fill || HEX.soft }, line: { color: o.line || o.fill || HEX.soft, width: o.lw || 1 }, color: o.color || HEX.ink, fontSize: o.pt || 14, bold: !!o.bold, italic: !!o.italic, align: o.align || "center", valign: o.valign || "middle", margin: o.margin != null ? o.margin : 6, objectName: o.name || (o.link ? "btn" : undefined), fontFace: o.mono ? "Courier New" : undefined, lineSpacingMultiple: o.ls });
}
function mark(s, ok, x, y, k, d) {
  d = d || 0.42;
  s.addText(ok ? "✓" : "✗", { shape: "ellipse", x, y, w: d, h: d, fill: { color: ok ? HEX.ok : "B0352D" }, line: { color: HEX.white, width: 1.5 }, color: HEX.white, fontSize: 16, bold: true, align: "center", valign: "middle", margin: 0, objectName: "on:" + k });
}
function menuButton(s, num, dark) {
  if (num) button(s, "☰  Menu", { x: 8.02, y: 5.16, w: 0.88, h: 0.32, pt: 11, fill: dark ? "1D6B53" : HEX.soft, color: dark ? HEX.white : HEX.pcb, bold: true, link: num, r: 0.16, margin: 0, tip: "Back to the menu" });
}
// a menu slide whose buttons are filled in once the slides they point to exist
async function menuSlide(pres, section, heading, t) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
  s.addText(heading, { placeholder: "title" }); await badge(s, t);
  s.addText("Tap a button to jump straight there. The ☰ Menu button on every slide brings you back here.", { x: 0.5, y: 1.08, w: 9, h: 0.3, fontSize: 12, italic: true, color: HEX.muted, isTextBox: true, margin: 0 });
  return { s, num: slideNum(pres) };
}
function fillMenu(menu, items) {
  items = items.filter(x => x && x.num);
  const cols = items.length > 14 ? 3 : 2, rows = Math.ceil(items.length / cols), colW = (9 - (cols - 1) * 0.15) / cols;
  const h = Math.min(0.62, (3.62 - (rows - 1) * 0.1) / rows), long = Math.max(...items.map(x => x.label.length));
  items.forEach((it, i) => {
    const c = Math.floor(i / rows), r = i % rows;
    button(menu.s, it.label, { x: 0.5 + c * (colW + 0.15), y: 1.45 + r * (h + 0.1), w: colW, h, pt: h < 0.4 ? 11 : cols === 3 || it.label.length > 48 ? 12 : it.label.length > 34 ? 13 : 15, fill: it.dark ? HEX.pcb : "F3F6F1", line: it.dark ? HEX.pcb : "D5DDD5", color: it.dark ? HEX.white : HEX.ink, bold: !!it.dark, align: "left", margin: 10, link: it.num, tip: it.label });
  });
}
// every slide made since index `from` gets a Menu button pointing at `num`
function addMenuButtons(pres, from, num, skip) {
  pres._list.slice(from).forEach(e => { if (e.num === num || (skip && skip.includes(e.num))) return; if (e.master === "CONTENT") menuButton(e.s, num); else if (e.master === "SECTION") menuButton(e.s, num, true); });
}
// one multiple-choice question with tap-to-check buttons, a ✓/✗ on each and an answer bar on click
function mcqBlock(s, q, x, y, w, opts) {
  opts = opts || {};
  const qpt = opts.qpt || (q[0].length > 120 ? 15 : 17);
  const qh = opts.qh || 0.9;
  s.addText(q[0], { x, y, w, h: qh, fontSize: qpt, bold: true, color: HEX.ink, valign: "middle", isTextBox: true, margin: 0 });
  const ow = (w - 0.15) / 2, oh = opts.oh || 0.78, long = Math.max(...q[1].map(o => o.length));
  const opt = long > 60 ? 12.5 : long > 38 ? 14 : 16;
  const keys = q[1].map(() => key());
  q[1].forEach((o, j) => {
    const ox = x + (j % 2) * (ow + 0.15), oy = y + qh + 0.12 + Math.floor(j / 2) * (oh + 0.12);
    button(s, [{ text: "ABCD"[j] + "   ", options: { bold: true, color: HEX.copper } }, { text: o }], { x: ox, y: oy, w: ow, h: oh, pt: opt, fill: "F3F6F1", line: "C9D3CB", align: "left", margin: 10, name: "trig:" + keys[j] });
    mark(s, j === q[2], ox + ow - 0.5, oy + (oh - 0.42) / 2, keys[j]);
  });
  const why = q[3] ? "  –  " + q[3] : "", ay = y + qh + 0.12 + 2 * (oh + 0.12);
  button(s, "✓  " + "ABCD"[q[2]] + ": " + q[1][q[2]] + why, { x, y: ay, w, h: opts.ah || 0.5, pt: (q[1][q[2]] + why).length > 110 ? 12 : 14, fill: "E1F1E7", line: HEX.ok, color: HEX.ok, bold: true, align: "left", margin: 10, name: "anim:reveal on:" + keys[q[2]] });
}
async function chip(slide, x, y, s, fill, pin) {
  // the hub's chip motif: rounded square with pins
  slide.addShape("roundRect", { x, y, w: s, h: s, rectRadius: s * 0.12, fill: { color: fill }, line: { color: fill }, objectName: "chip" });
  const p = s * 0.12;
  [0.3, 0.62].forEach(f => {
    slide.addShape("rect", { x: x + s * f, y: y - p, w: p, h: p, fill: { color: pin }, line: { color: pin } });
    slide.addShape("rect", { x: x + s * f, y: y + s, w: p, h: p, fill: { color: pin }, line: { color: pin } });
    slide.addShape("rect", { x: x - p, y: y + s * f, w: p, h: p, fill: { color: pin }, line: { color: pin } });
    slide.addShape("rect", { x: x + s, y: y + s * f, w: p, h: p, fill: { color: pin }, line: { color: pin } });
  });
}

async function badge(slide, t) {
  slide.addShape("ellipse", { x: 8.85, y: 0.38, w: 0.68, h: 0.68, fill: { color: HEX.soft }, line: { color: HEX.soft }, objectName: "topic icon" });
  slide.addImage({ data: ICONS[t] || ICONS.T44 || ICONS.G9, x: 9.0, y: 0.53, w: 0.38, h: 0.38, altText: "topic icon" });
}

function tableSlides(rows, maxH) {
  const head = rows[0], body = rows.slice(1), cols = head.length;
  const lens = head.map((_, i) => Math.max(...rows.map(r => String(r[i] || "").length)));
  const total = lens.reduce((a, b) => a + Math.max(6, b), 0);
  const widths = lens.map(l => 9 * Math.max(6, l) / total);
  const pt = cols >= 5 ? 12 : 13;
  const rowH = r => Math.max(...r.map((c, i) => lines(String(c), widths[i] - 0.15, pt))) * pt * 1.2 / 72 + 0.12;
  const pages = []; let cur = [], h = rowH(head);
  body.forEach(r => { const rh = rowH(r); if (cur.length && h + rh > maxH) { pages.push(cur); cur = []; h = rowH(head); } cur.push(r); h += rh; });
  if (cur.length) pages.push(cur);
  return { pages, widths, pt, head };
}
function addTable(slide, head, rows, widths, pt, y) {
  const hdr = head.map(t => ({ text: String(t), options: { bold: true, color: HEX.white, fill: { color: HEX.pcb }, fontSize: pt } }));
  const body = rows.map((r, ri) => r.map((t, ci) => ({ text: String(t), options: { fontSize: pt, color: HEX.ink, bold: ci === 0, fill: { color: ri % 2 ? HEX.white : HEX.soft } } })));
  slide.addTable([hdr].concat(body), { x: 0.5, y, w: widths.reduce((a, b) => a + b, 0), colW: widths, border: { type: "solid", pt: 0.5, color: "D5DDD5" }, margin: 0.06, valign: "middle" });
}

async function deck(l, pptxgen, icons, diag, ctx) {
  ICONS = icons || {};
  const t = topic(l.t), u = t.u;
  let pres;
  if (ctx) pres = ctx.pres;
  else { pres = fitTitles(new pptxgen()); pres.layout = "LAYOUT_16x9"; pres.theme = { headFontFace: "Calibri", bodyFontFace: "Calibri" }; pres.title = l.id + " " + l.title; pres.author = "Digital Technology Hub"; pres.subject = unitName(u) + " – " + t.name; defineLayouts(pres); }
  // In a topic deck each lesson is one section, named after its specification point(s)
  const SN = n => ctx ? ctx.section : n;
  const sec = n => { if (!ctx) pres.addSection({ title: n }); };

  // Title
  sec("Introduction");
  const first = pres._list.length, nav = [];
  let s = pres.addSlide({ masterName: "TITLE", sectionTitle: SN("Introduction") });
  s.addText((unitName(u) + "  ·  " + l.id).toUpperCase(), { placeholder: "eyebrow" });
  s.addText([{ text: l.title, options: { fontSize: l.title.length > 66 ? 24 : l.title.length > 50 ? 28 : l.title.length > 38 ? 32 : 38 } }], { placeholder: "title" });
  s.addText([{ text: "Learning objectives", options: { bold: true, breakLine: true, color: "F5E6DA" } }].concat(bulletRuns(l.obj, 16)), { placeholder: "body" });
  await chip(s, 8.55, 0.55, 0.75, "1D6B53", HEX.copper);
  s.addNotes("Specification: " + l.spec.join(" | "));
  const menu = await menuSlide(pres, SN("Introduction"), "In this lesson", l.t);
  menu.s.addNotes("Lesson menu: each button jumps to that part of the lesson in Slide Show. The ☰ Menu button on each slide returns here.");

  // Starter (only when the lesson has one)
  if (l.starter) {
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SN("Introduction") });
  s.addText("Starter", { placeholder: "title" }); await badge(s, l.t); nav.push({ label: "Starter", num: slideNum(pres) });
  s.addShape("roundRect", { x: 0.5, y: 1.35, w: 9, h: 2.9, rectRadius: 0.12, fill: { color: HEX.copperSoft }, line: { color: HEX.copperSoft }, objectName: "starter card" });
  s.addText("10 MINUTES", { x: 0.8, y: 1.55, w: 3, h: 0.3, fontSize: 11, bold: true, color: HEX.copper, charSpacing: 2, isTextBox: true, margin: 0 });
  const sp = l.starter.length > 260 ? 16 : 19;
  s.addText(l.starter, { x: 0.8, y: 1.9, w: 8.4, h: 2.2, fontSize: sp, color: HEX.ink, valign: "top", isTextBox: true, margin: 0 });
  s.addText("Specification: " + l.spec[0], { x: 0.5, y: 4.45, w: 9, h: 0.6, fontSize: 12, italic: true, color: HEX.muted, isTextBox: true, margin: 0 });
  }

  // Diagram
  if (diag) {
    s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SN("Introduction") });
    s.addText("The big picture", { placeholder: "title" }); await badge(s, l.t); nav.push({ label: "The big picture", num: slideNum(pres) });
    s.addImage({ data: diag, objectName: "anim:auto", x: 1.84, y: 1.25, w: 6.32, h: 3.555, altText: (root.Diagrams && root.Diagrams.caption(l.id)) || "Diagram" });
    if (root.Diagrams) s.addText(root.Diagrams.caption(l.id), { x: 0.5, y: 4.85, w: 9, h: 0.35, fontSize: 12, italic: true, color: HEX.muted, align: "center", isTextBox: true, margin: 0 });
    s.addNotes("Explain the diagram in your own words before you read on.");
  }

  // Content slides
  sec("Teaching");
  for (const sl of l.slides) {
    nav.push({ label: sl.h, num: slideNum(pres) + 1 });
    const hasCode = sl.code && (sl.code.cs || sl.code.py || sl.code.ps || sl.code.vba);
    const code = hasCode ? (sl.code.cs || sl.code.py || sl.code.vba || sl.code.ps) : "";
    const codeLines = code.split("\n").length;
    const bullets = sl.b || [];
    if (sl.tbl) {
      const bH = bullets.length ? Math.min(1.8, bulletHeight(bullets, 9, 15) + 0.05) : 0;
      const usableH = 3.65 - (bH ? bH + 0.12 : 0);
      const ts = tableSlides(sl.tbl, usableH);
      for (let pi = 0; pi < ts.pages.length; pi++) {
        s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SN("Teaching") });
        s.addText(sl.h + (ts.pages.length > 1 ? " (" + (pi + 1) + " of " + ts.pages.length + ")" : ""), { placeholder: "title" }); await badge(s, l.t);
        let y = 1.3;
        if (bullets.length && pi === 0) { s.addText(bulletRuns(bullets, 15), { objectName: "anim:para", x: 0.5, y, w: 9, h: bH, color: HEX.ink, valign: "top", isTextBox: true, margin: 0 }); y += bH + 0.12; }
        addTable(s, ts.head, ts.pages[pi], ts.widths, ts.pt, y);
        if (sl.n) s.addNotes(sl.n);
      }
      if (hasCode) {
        s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SN("Teaching") });
        s.addText(sl.h + " – code", { placeholder: "title" }); await badge(s, l.t);
        codeBox(s, sl.code, 0.5, 1.3, 9, 3.75);
      }
      continue;
    }
    if (hasCode && bullets.length) {
      const twoCol = codeLines <= 16 && code.split("\n").every(x => x.length <= 46);
      if (twoCol) {
        const f = chooseBullets(bullets, 4.2, 3.7);
        for (let gi = 0; gi < f.groups.length; gi++) {
          s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SN("Teaching") });
          s.addText(sl.h + (f.groups.length > 1 ? " (" + (gi + 1) + ")" : ""), { placeholder: "title" }); await badge(s, l.t);
          s.addText(bulletRuns(f.groups[gi], f.pt), { objectName: "anim:para", x: 0.5, y: 1.3, w: 4.2, h: 3.75, color: HEX.ink, valign: "top", isTextBox: true, margin: 0 });
          codeBox(s, sl.code, 4.95, 1.3, 4.55, 3.75, true);
          if (sl.n) s.addNotes(sl.n);
        }
      } else {
        const f = chooseBullets(bullets, 8.2, 3.6);
        for (const g of f.groups) {
          s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SN("Teaching") });
          s.addText(sl.h, { placeholder: "title" }); await badge(s, l.t);
          s.addShape("roundRect", { x: 0.5, y: 1.3, w: 9, h: 3.75, rectRadius: 0.1, fill: { color: "F3F6F1" }, line: { color: "E4ECE6" }, objectName: "content card" });
          s.addText(bulletRuns(g, f.pt), { objectName: "anim:para", x: 0.8, y: 1.48, w: 8.4, h: 3.4, color: HEX.ink, valign: "top", isTextBox: true, margin: 0 });
        }
        s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SN("Teaching") });
        s.addText(sl.h + " – code", { placeholder: "title" }); await badge(s, l.t);
        codeBox(s, sl.code, 0.5, 1.3, 9, 3.75);
        if (sl.n) s.addNotes(sl.n);
      }
      continue;
    }
    if (hasCode) {
      s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SN("Teaching") });
      s.addText(sl.h, { placeholder: "title" }); await badge(s, l.t);
      if ((sl.code.cs || sl.code.py) && sl.code.ps) { codeBox(s, { ps: sl.code.ps }, 0.5, 1.3, 4.4, 3.75); codeBox(s, { cs: sl.code.cs || sl.code.py }, 5.1, 1.3, 4.4, 3.75); }
      else codeBox(s, sl.code, 0.5, 1.3, 9, 3.75);
      if (sl.n) s.addNotes(sl.n);
      continue;
    }
    // bullets only: card layout with numbered key point on the left
    const f = chooseBullets(bullets, 8.2, 3.6);
    for (let gi = 0; gi < f.groups.length; gi++) {
      s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SN("Teaching") });
      s.addText(sl.h + (f.groups.length > 1 ? " (" + (gi + 1) + ")" : ""), { placeholder: "title" }); await badge(s, l.t);
      s.addShape("roundRect", { x: 0.5, y: 1.3, w: 9, h: 3.75, rectRadius: 0.1, fill: { color: "F3F6F1" }, line: { color: "E4ECE6" }, objectName: "content card" });
      s.addText(bulletRuns(f.groups[gi], f.pt), { objectName: "anim:para", x: 0.8, y: 1.48, w: 8.4, h: 3.4, color: HEX.ink, valign: "top", isTextBox: true, margin: 0 });
      if (sl.n) s.addNotes(sl.n);
    }
  }

  // Activity
  sec("Practice");
  if (l.act) {
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SN("Practice") });
  s.addText("Your task", { placeholder: "title" }); await badge(s, l.t); nav.push({ label: "Your task", num: slideNum(pres), dark: true });
  s.addText(l.act, { x: 0.5, y: 1.3, w: 9, h: 1.55, fontSize: l.act.length > 300 ? 15 : 17, color: HEX.ink, valign: "top", isTextBox: true, margin: 0 });
  const parts = (l.diff || "").split(/Stretch:/);
  const cap = x => x ? x.charAt(0).toUpperCase() + x.slice(1) : x;
  const sup = cap(parts[0].replace(/^Support:\s*/, "").trim()), str = cap((parts[1] || "").trim());
  [[sup, "Support", HEX.soft, 0.5], [str, "Stretch", HEX.copperSoft, 5.1]].forEach(([txt, lab, col, x]) => {
    s.addShape("roundRect", { x, y: 3.0, w: 4.4, h: 2.0, rectRadius: 0.1, fill: { color: col }, line: { color: col }, objectName: lab + " card" });
    s.addText(lab.toUpperCase(), { x: x + 0.25, y: 3.15, w: 3.9, h: 0.3, fontSize: 11, bold: true, color: lab === "Support" ? HEX.pcb : HEX.copper, charSpacing: 2, isTextBox: true, margin: 0 });
    s.addText(txt, { x: x + 0.25, y: 3.5, w: 3.9, h: 1.4, fontSize: 14, color: HEX.ink, valign: "top", isTextBox: true, margin: 0 });
  });
  }

  // Exit quiz: one question per slide, tap an answer to check it (click to reveal when presenting)
  const qz = l.quiz;
  for (let qi = 0; qi < qz.length; qi++) {
    s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SN("Practice") });
    s.addText("Exit quiz: question " + (qi + 1) + " of " + qz.length, { placeholder: "title" }); await badge(s, l.t);
    if (!qi) nav.push({ label: "Exit quiz", num: slideNum(pres), dark: true });
    s.addText("Tap an answer to check it. Presenting? Click to reveal the answer.", { x: 0.5, y: 1.08, w: 9, h: 0.28, fontSize: 12, italic: true, color: HEX.muted, isTextBox: true, margin: 0 });
    mcqBlock(s, qz[qi], 0.5, 1.4, 9, { oh: 0.82, qh: 0.95 });
  }
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SN("Practice") });
  s.addText("Exit quiz answers", { placeholder: "title" }); await badge(s, l.t);
  const whyCount = qz.filter(q => q[3]).length;
  if (whyCount >= 3) addTable(s, ["Q", "Answer", "Why"], qz.map((q, i) => [String(i + 1), "ABCD"[q[2]] + "  " + q[1][q[2]], q[3] || ""]), [0.6, 3.6, 4.8], 14, 1.3);
  else addTable(s, ["Q", "Answer"], qz.map((q, i) => [String(i + 1), "ABCD"[q[2]] + "  " + q[1][q[2]] + (q[3] ? "  – " + q[3] : "")]), [0.8, 8.2], 14, 1.3);

  // Past papers
  const pp = [];
  C.pastpapers.forEach(p => p.qs.forEach(q => { if (q[3].includes(l.id)) pp.push([ushort(p.u) + " " + p.y, "Q" + q[0], String(q[1]), q[2]]); }));
  if (pp.length) {
    const shown = pp.slice(-6);
    s = pres.addSlide({ masterName: "CONTENT", sectionTitle: SN("Practice") });
    s.addText("In the exam", { placeholder: "title" }); await badge(s, l.t);
    addTable(s, ["Paper", "Question", "Marks", "What it tested"], shown, [1.5, 1.2, 0.9, 5.4], 13, 1.3);
    s.addText((pp.length > shown.length ? (pp.length - shown.length) + " more past questions on the website. " : "") + "Papers and mark schemes: ccea.org.uk → GCSE Digital Technology → Past Papers & Mark Schemes.", { x: 0.5, y: 4.7, w: 9, h: 0.4, fontSize: 11, italic: true, color: HEX.muted, isTextBox: true, margin: 0 });
  }

  // Plenary (only when the lesson has one)
  if (l.plen || l.hw) {
  sec("Review");
  s = pres.addSlide({ masterName: "SECTION", sectionTitle: SN("Review") }); nav.push({ label: "Plenary and homework", num: slideNum(pres), dark: true });
  s.addText("REVIEW", { placeholder: "eyebrow" });
  s.addText("Plenary and homework", { placeholder: "title" });
  s.addText([{ text: "Plenary", options: { bold: true, color: "F5E6DA", breakLine: true } }, { text: l.plen || "", options: { breakLine: true, paraSpaceAfter: 14 } }, { text: "Homework", options: { bold: true, color: "F5E6DA", breakLine: true } }, { text: l.hw || "" }], { placeholder: "body", fontSize: ((l.plen || "") + (l.hw || "")).length > 320 ? 16 : 18 });
  await chip(s, 8.7, 4.3, 0.55, "1D6B53", HEX.copper);
  }

  // the lesson menu and the Menu button on every slide
  fillMenu(menu, nav.concat(ctx && ctx.topicMenu ? [{ label: "↑  Topic menu", num: ctx.topicMenu, dark: true }] : []));
  addMenuButtons(pres, first, menu.num);
  return pres;
}

function codeBox(slide, code, x, y, w, h, anim) {
  const W = anim ? { objectName: "anim:with" } : {};
  const txt = code.cs || code.py || code.vba || code.ps, label = (code.cs || code.py) ? "C#" : code.vba ? "VBA · MICROSOFT ACCESS" : "PSEUDOCODE";
  const lines = txt.split("\n"), n = lines.length, longest = Math.max(...lines.map(s => s.length));
  const fits = (pt, rows, width) => rows * pt * 1.22 / 72 <= h - 0.55 && longest * pt * 0.6 / 72 <= width;
  slide.addShape("roundRect", { x, y, w, h, rectRadius: 0.08, fill: { color: HEX.code }, line: { color: HEX.code }, objectName: anim ? "anim:wipe" : "code block" });
  slide.addText(label, { ...W, x: x + 0.2, y: y + 0.12, w: 2, h: 0.25, fontSize: 9, bold: true, color: "E39A63", charSpacing: 2, isTextBox: true, margin: 0 });
  let pt = 15; while (pt > 11 && !fits(pt, n, w - 0.4)) pt--;
  if (fits(pt, n, w - 0.4) || w < 8) {
    while (pt > 10 && !fits(pt, n, w - 0.4)) pt--;
    slide.addText(txt, { ...W, x: x + 0.2, y: y + 0.42, w: w - 0.35, h: h - 0.55, fontFace: "Courier New", fontSize: pt, color: "E5EEE8", valign: "top", isTextBox: true, margin: 0 });
    return;
  }
  // Two columns: split at the blank line (or line) nearest the middle
  let cut = Math.ceil(n / 2), best = -1;
  lines.forEach((l, i) => { if (!l.trim() && i > 2 && i < n - 2 && (best < 0 || Math.abs(i - n / 2) < Math.abs(best - n / 2))) best = i; });
  if (best > 0 && Math.abs(best - n / 2) <= n / 4) cut = best;
  const a = lines.slice(0, cut).join("\n"), b = lines.slice(cut).join("\n").replace(/^\n+/, "");
  const rows = Math.max(cut, n - cut), colW = (w - 0.6) / 2;
  pt = 14; while (pt > 10 && !(rows * pt * 1.22 / 72 <= h - 0.55 && longest * pt * 0.6 / 72 <= colW)) pt--;
  slide.addText(a, { ...W, x: x + 0.2, y: y + 0.42, w: colW, h: h - 0.55, fontFace: "Courier New", fontSize: pt, color: "E5EEE8", valign: "top", isTextBox: true, margin: 0 });
  slide.addText(b, { ...W, x: x + 0.4 + colW, y: y + 0.42, w: colW, h: h - 0.55, fontFace: "Courier New", fontSize: pt, color: "E5EEE8", valign: "top", isTextBox: true, margin: 0 });
}


async function topicDeck(t, ls, pptxgen, icons, diags) {
  ICONS = icons || {};
  const pres = fitTitles(new pptxgen()); pres.layout = "LAYOUT_16x9"; pres.theme = { headFontFace: "Calibri", bodyFontFace: "Calibri" };
  pres.title = t.name; pres.author = "Digital Technology Hub"; pres.subject = unitName(t.u) + " – " + t.name;
  defineLayouts(pres);
  pres.addSection({ title: "Topic overview" });
  let s = pres.addSlide({ masterName: "TITLE", sectionTitle: "Topic overview" });
  s.addText((unitName(t.u) + "  ·  Topic").toUpperCase(), { placeholder: "eyebrow" });
  s.addText(t.name, { placeholder: "title" });
  s.addText([{ text: "Lessons in this topic", options: { bold: true, breakLine: true, color: "F5E6DA" } }].concat(bulletRuns(ls.map(l => l.id + "  " + l.title), ls.length > 5 ? 14 : 16)), { placeholder: "body" });
  await chip(s, 8.55, 0.55, 0.75, "1D6B53", HEX.copper);
  const tmenu = await menuSlide(pres, "Topic overview", "Topic menu", t.id);
  const items = [{ label: "Specification map", num: slideNum(pres) + 1 }];
  const rows = ls.map(l => [l.id, l.spec.join("; ")]);
  const ts = tableSlides([["Lesson", "Specification: students should be able to"]].concat(rows), 3.7);
  for (let pi = 0; pi < ts.pages.length; pi++) {
    s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Topic overview" });
    s.addText("Specification map" + (ts.pages.length > 1 ? " (" + (pi + 1) + " of " + ts.pages.length + ")" : ""), { placeholder: "title" }); await badge(s, t.id);
    addTable(s, ts.head, ts.pages[pi], [1.1, 7.9], ts.pt, 1.3);
  }
  s.addNotes("Each lesson below is its own section in PowerPoint (View → Slide Sorter shows them). To split this deck by specification point, right-click a section → Move Section, or delete the sections you do not need.");
  addMenuButtons(pres, 0, tmenu.num);
  for (const l of ls) {
    const name = (l.id + " · " + l.title).slice(0, 80);
    pres.addSection({ title: name });
    items.push({ label: l.id + "  " + l.title, num: slideNum(pres) + 1, dark: true });
    await deck(l, pptxgen, icons, diags && diags[l.id], { pres, section: name, topicMenu: tmenu.num });
  }
  fillMenu(tmenu, items);
  return pres;
}

// ---------- Student revision deck: every concept, with click-to-reveal self-testing ----------
function sentences(p) { return String(p).split(/(?<=[.!?])\s+(?=[A-Z0-9(])/).map(x => x.trim()).filter(Boolean); }
function termsFor(id) { return (C.gloss || []).filter(g => g[2] === id); }
async function codeOutput(cs) {
  if (!root.CSharp || /ReadLine/.test(cs)) return null;
  let out = "";
  try { const r = await root.CSharp.run(cs, { output: (t, k) => { if (k !== "in") out += t; }, files: {}, maxSteps: 200000 }); if (!r.ok) return null; } catch (e) { return null; }
  return out.replace(/\s+$/, "") || "(no output)";
}
function revBox(s, text, o) {
  s.addShape("roundRect", { x: o.x, y: o.y, w: o.w, h: o.h, rectRadius: 0.08, fill: { color: o.fill || HEX.soft }, line: { color: o.line || o.fill || HEX.soft }, objectName: o.name || ("box " + Math.random().toString(36).slice(2, 6)) });
  s.addText(text, { objectName: o.name ? "anim:with" : undefined, x: o.x + 0.15, y: o.y + 0.05, w: o.w - 0.3, h: o.h - 0.1, fontSize: o.pt || 14, color: o.color || HEX.ink, bold: !!o.bold, valign: "middle", align: o.align || "left", isTextBox: true, margin: 0, fontFace: o.mono ? "Courier New" : undefined });
}
async function revisionDeck(t, ls, pptxgen, icons, diags) {
  ICONS = icons || {};
  const pres = fitTitles(new pptxgen()); pres.layout = "LAYOUT_16x9"; pres.theme = { headFontFace: "Calibri", bodyFontFace: "Calibri" };
  pres.title = t.name + " – revision"; pres.author = "Digital Technology Hub"; pres.subject = unitName(t.u) + " – " + t.name + " – revision";
  defineLayouts(pres);
  const TITLE = { placeholder: "title" };
  pres.addSection({ title: "Start here" });
  let s = pres.addSlide({ masterName: "TITLE", sectionTitle: "Start here" });
  s.addText((unitName(t.u) + "  ·  Revision").toUpperCase(), { placeholder: "eyebrow" });
  s.addText(t.name, { placeholder: "title" });
  s.addText([{ text: "In this deck", options: { bold: true, breakLine: true, color: "F5E6DA" } }].concat(bulletRuns(ls.map(l => l.id + "  " + l.title), ls.length > 5 ? 13 : 16)), { placeholder: "body" });
  await chip(s, 8.55, 0.55, 0.75, "1D6B53", HEX.copper);
  const rmenu = await menuSlide(pres, "Start here", "Revision menu", t.id), rnav = [];
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Start here" });
  s.addText("How to revise with this deck", TITLE); await badge(s, t.id); rnav.push({ label: "How to revise with this deck", num: slideNum(pres) });
  s.addText(bulletRuns(["Play it as a slide show (on a phone too, in the PowerPoint app) – key facts appear one at a time as you click or tap", "Tap the buttons: a quiz answer, True or False, a key term or a gap number shows you straight away whether you were right", "Say each definition out loud before you tap the term to check it", "Predict what each piece of C# code outputs before you tap Show output", "Use ☰ Menu on any slide to jump to another lesson; rate the checklist red, amber or green", "Practise more on the Digital Technology Hub: activities, Quiz Zone and past papers"].filter(x => t.u === PROG() || !/C#/.test(x)).map(x => C.pastpapers && C.pastpapers.length ? x : x.replace(" and past papers", " and practice papers")), 17), { objectName: "anim:para", x: 0.6, y: 1.35, w: 8.8, h: 3.7, color: HEX.ink, valign: "top", isTextBox: true, margin: 0 });
  // checklist
  const spec = []; ls.forEach(l => l.spec.forEach(p => { if (!spec.includes(p)) spec.push(p); }));
  const ck = chooseBullets(spec.map(p => "☐  " + p), 8.8, 3.6);
  for (let gi = 0; gi < ck.groups.length; gi++) {
    s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Start here" });
    s.addText("Checklist: can you…" + (ck.groups.length > 1 ? " (" + (gi + 1) + ")" : ""), TITLE); await badge(s, t.id); if (!gi) rnav.push({ label: "Checklist", num: slideNum(pres) });
    s.addText(ck.groups[gi].map((b, i) => ({ text: b, options: { breakLine: i < ck.groups[gi].length - 1, paraSpaceAfter: 6, fontSize: ck.pt } })), { objectName: "anim:para", x: 0.6, y: 1.35, w: 8.8, h: 3.7, color: HEX.ink, valign: "top", isTextBox: true, margin: 0 });
  }
  for (let li = 0; li < ls.length; li++) {
    const l = ls[li], sec = (l.id + " · " + l.title).slice(0, 80);
    pres.addSection({ title: sec });
    s = pres.addSlide({ masterName: "SECTION", sectionTitle: sec }); rnav.push({ label: l.id + "  " + l.title, num: slideNum(pres), dark: true });
    s.addText((l.id + "  ·  Lesson " + (li + 1) + " of " + ls.length).toUpperCase(), { placeholder: "eyebrow" });
    s.addText([{ text: l.title, options: { fontSize: l.title.length > 58 ? 20 : l.title.length > 40 ? 24 : 32 } }], { placeholder: "title" });
    s.addText([{ text: "You need to be able to", options: { bold: true, breakLine: true, color: "F5E6DA" } }].concat(bulletRuns(l.obj, 17)), { placeholder: "body" });
    if (diags && diags[l.id]) {
      s = pres.addSlide({ masterName: "CONTENT", sectionTitle: sec });
      s.addText("The big picture", TITLE); await badge(s, l.t);
      s.addImage({ data: diags[l.id], objectName: "anim:auto", x: 1.84, y: 1.2, w: 6.32, h: 3.555, altText: (root.Diagrams && root.Diagrams.caption(l.id)) || "Diagram" });
      if (root.Diagrams) s.addText(root.Diagrams.caption(l.id), { x: 0.5, y: 4.82, w: 9, h: 0.35, fontSize: 12, italic: true, color: HEX.muted, align: "center", isTextBox: true, margin: 0 });
    }
    const notes = (l.notes || []).filter(n => !/exam/i.test(n.h)), exam = (l.notes || []).filter(n => /exam/i.test(n.h))[0];
    for (const n of notes) {
      const f = chooseBullets(sentences(n.p), 8.6, 3.55);
      for (let gi = 0; gi < f.groups.length; gi++) {
        s = pres.addSlide({ masterName: "CONTENT", sectionTitle: sec });
        s.addText("Key facts: " + n.h + (f.groups.length > 1 ? " (" + (gi + 1) + ")" : ""), TITLE); await badge(s, l.t);
        s.addShape("roundRect", { x: 0.5, y: 1.3, w: 9, h: 3.75, rectRadius: 0.1, fill: { color: "F3F6F1" }, line: { color: "E4ECE6" }, objectName: "facts card" });
        s.addText(bulletRuns(f.groups[gi], f.pt), { objectName: "anim:para", x: 0.75, y: 1.45, w: 8.5, h: 3.45, color: HEX.ink, valign: "top", isTextBox: true, margin: 0 });
      }
    }
    const terms = termsFor(l.id);
    for (let k = 0; k < terms.length; k += 3) {
      s = pres.addSlide({ masterName: "CONTENT", sectionTitle: sec });
      s.addText("Key terms" + (terms.length > 3 ? " (" + (k / 3 + 1) + " of " + Math.ceil(terms.length / 3) + ")" : ""), TITLE); await badge(s, l.t);
      s.addText("Say the definition, then tap the term to check (or click to reveal).", { x: 0.5, y: 1.08, w: 9, h: 0.28, fontSize: 12, italic: true, color: HEX.muted, isTextBox: true, margin: 0 });
      terms.slice(k, k + 3).forEach((g, i) => {
        const y = 1.42 + i * 1.22, kk = key();
        button(s, [{ text: g[0] }, { text: "  tap", options: { fontSize: 10, bold: false, color: "BFD6CA", breakLine: false } }], { x: 0.5, y, w: 2.6, h: 1.08, fill: HEX.pcb, color: HEX.white, bold: true, pt: g[0].length > 24 ? 14 : 16, name: "trig:" + kk });
        button(s, [{ text: g[1], options: { breakLine: !!g[3] } }].concat(g[3] ? [{ text: "Credited: " + g[3], options: { fontSize: 10, color: HEX.copper, italic: true } }] : []), { x: 3.25, y, w: 6.25, h: 1.08, fill: HEX.soft, pt: g[1].length > 150 ? 12.5 : 14, align: "left", margin: 10, name: "anim:reveal on:" + kk });
      });
    }
    for (const cs of l.slides.filter(x => x.code && (x.code.cs || x.code.py))) {
      const code = cs.code.cs || cs.code.py, out = await codeOutput(code);
      s = pres.addSlide({ masterName: "CONTENT", sectionTitle: sec });
      if (out !== null) {
        s.addText("Predict the output: " + cs.h, TITLE); await badge(s, l.t);
        // comments often give the answer away, so strip them for the prediction task
        const bare = code.split("\n").map(r => r.replace(/\s*\/\/.*$/, "")).join("\n");
        codeBox(s, { cs: bare }, 0.5, 1.3, 5.75, 3.75, true);
        s.addText("What will it output?", { x: 6.45, y: 1.3, w: 3.05, h: 0.35, fontSize: 14, bold: true, color: HEX.copper, isTextBox: true, margin: 0 });
        const lines = out.split("\n"), pt = lines.length > 10 ? 11 : 14, kk = key();
        button(s, "▶  Show output", { x: 6.45, y: 1.7, w: 3.05, h: 0.5, fill: HEX.copper, color: HEX.white, bold: true, pt: 14, name: "trig:" + kk });
        button(s, [{ text: "OUTPUT", options: { bold: true, color: HEX.ok, fontSize: 10, breakLine: true } }, { text: out, options: { fontFace: "Courier New", fontSize: pt } }], { x: 6.45, y: 2.32, w: 3.05, h: 2.73, fill: "FFFFFF", line: HEX.ok, lw: 1.5, align: "left", valign: "top", margin: 10, name: "anim:reveal on:" + kk });
      } else {
        s.addText("Code to know: " + cs.h, TITLE); await badge(s, l.t);
        codeBox(s, { cs: code }, 0.5, 1.3, 9, 3.4, true);
        s.addText("This program asks for input – run it on the hub and try different values, including boundary values.", { x: 0.5, y: 4.78, w: 9, h: 0.3, fontSize: 12, italic: true, color: HEX.muted, isTextBox: true, margin: 0 });
      }
    }
    const tf = l.tf || [];
    for (let k = 0; k < tf.length; k += 3) {
      s = pres.addSlide({ masterName: "CONTENT", sectionTitle: sec });
      s.addText("True or false?", TITLE); await badge(s, l.t);
      s.addText("Tap True or False for each statement (or click to reveal the answers).", { x: 0.5, y: 1.08, w: 9, h: 0.28, fontSize: 12, italic: true, color: HEX.muted, isTextBox: true, margin: 0 });
      tf.slice(k, k + 3).forEach((x, i) => {
        const y = 1.42 + i * 1.22, kt = key(), kf = key(), h = 1.08;
        button(s, x[0], { x: 0.5, y, w: 4.95, h, fill: "F3F6F1", line: "E4ECE6", pt: x[0].length > 110 ? 12.5 : x[0].length > 70 ? 14 : 15.5, align: "left", margin: 10 });
        button(s, "True", { x: 5.55, y, w: 1.0, h, fill: "E1F1E7", line: HEX.ok, color: HEX.ok, bold: true, pt: 15, name: "trig:" + kt });
        button(s, "False", { x: 6.65, y, w: 1.0, h, fill: "F9E3E1", line: "B0352D", color: "B0352D", bold: true, pt: 15, name: "trig:" + kf });
        mark(s, x[1], 5.55 + 0.6, y + 0.06, kt, 0.36); mark(s, !x[1], 6.65 + 0.6, y + 0.06, kf, 0.36);
        button(s, [{ text: x[1] ? "TRUE" : "FALSE", options: { bold: true, color: x[1] ? HEX.ok : "B0352D", fontSize: 14, breakLine: !!x[2] } }].concat(x[2] ? [{ text: x[2], options: { fontSize: x[2].length > 70 ? 10 : 11, color: HEX.ink } }] : []), { x: 7.75, y, w: 1.75, h, fill: x[1] ? "E1F1E7" : "F9E3E1", line: x[1] ? HEX.ok : "B0352D", align: "left", margin: 8, name: "anim:reveal on:" + kt + " on:" + kf });
      });
    }
    const qz = l.quiz || [];
    for (let k = 0; k < qz.length; k++) {
      s = pres.addSlide({ masterName: "CONTENT", sectionTitle: sec });
      s.addText("Quick quiz (" + (k + 1) + " of " + qz.length + ")", TITLE); await badge(s, l.t);
      s.addText("Tap an answer to check it (or click to reveal).", { x: 0.5, y: 1.08, w: 9, h: 0.28, fontSize: 12, italic: true, color: HEX.muted, isTextBox: true, margin: 0 });
      mcqBlock(s, qz[k], 0.5, 1.4, 9, { oh: 0.82, qh: 0.95 });
    }
    if (l.cloze) {
      const ans = []; const text = l.cloze.replace(/\[\[(.+?)\]\]/g, (_, a) => { ans.push(a); return "(" + ans.length + ") ________"; });
      s = pres.addSlide({ masterName: "CONTENT", sectionTitle: sec });
      s.addText("Fill the gaps", TITLE); await badge(s, l.t);
      s.addShape("roundRect", { x: 0.5, y: 1.3, w: 9, h: 2.45, rectRadius: 0.1, fill: { color: "F3F6F1" }, line: { color: "E4ECE6" }, objectName: "gap card" });
      s.addText("Work out each gap, then tap its number to check (or click to reveal them all).", { x: 0.5, y: 1.08, w: 9, h: 0.28, fontSize: 12, italic: true, color: HEX.muted, isTextBox: true, margin: 0 });
      s.addText(text, { x: 0.75, y: 1.42, w: 8.5, h: 2.2, fontSize: text.length > 380 ? 14 : 16, color: HEX.ink, valign: "top", isTextBox: true, margin: 0, lineSpacingMultiple: 1.25 });
      const gw = (9 - (ans.length - 1) * 0.12) / ans.length, apt = Math.max(...ans.map(a => a.length)) > 14 ? 12 : 14;
      ans.forEach((a, i) => {
        const gx = 0.5 + i * (gw + 0.12), kk = key();
        button(s, "Gap " + (i + 1), { x: gx, y: 3.88, w: gw, h: 0.48, fill: HEX.pcb, color: HEX.white, bold: true, pt: 14, name: "trig:" + kk });
        button(s, a, { x: gx, y: 4.44, w: gw, h: 0.62, fill: "E1F1E7", line: HEX.ok, color: HEX.ink, bold: true, pt: apt, name: (i ? "anim:with" : "anim:reveal") + " on:" + kk });
      });
    }
    const pp = [];
    (C.pastpapers || []).forEach(p => p.qs.forEach(q => { if (q[3].includes(l.id)) pp.push([ushort(p.u) + " " + p.y, "Q" + q[0], String(q[1]), q[2]]); }));
    if (exam || pp.length) {
      s = pres.addSlide({ masterName: "CONTENT", sectionTitle: sec });
      s.addText("Exam focus", TITLE); await badge(s, l.t);
      let y = 1.3;
      if (exam) { const tip = exam.p.length > 330 ? exam.p.slice(0, 327).replace(/\s+\S*$/, "") + "…" : exam.p; s.addShape("roundRect", { x: 0.5, y, w: 9, h: 1.15, rectRadius: 0.08, fill: { color: "FBF0DB" }, line: { color: "FBF0DB" }, objectName: "tip card" }); s.addText(tip, { x: 0.7, y: y + 0.06, w: 8.6, h: 1.03, fontSize: tip.length > 240 ? 12 : 13.5, color: HEX.ink, valign: "middle", isTextBox: true, margin: 0 }); y += 1.3; }
      if (pp.length) addTable(s, ["Paper", "Question", "Marks", "What it tested"], pp.slice(-5).reverse(), [1.5, 1.1, 0.8, 5.6], 12, y);
    }
  }
  // summary
  pres.addSection({ title: "Summary" });
  const all = []; ls.forEach(l => termsFor(l.id).forEach(g => all.push([g[0], g[1]])));
  if (all.length) {
    const ts = tableSlides([["Key term", "Definition"]].concat(all), 3.75);
    for (let pi = 0; pi < ts.pages.length; pi++) {
      s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Summary" });
      s.addText("Key terms summary" + (ts.pages.length > 1 ? " (" + (pi + 1) + " of " + ts.pages.length + ")" : ""), TITLE); await badge(s, t.id); if (!pi) rnav.push({ label: "Key terms summary", num: slideNum(pres) });
      addTable(s, ts.head, ts.pages[pi], [2.4, 6.6], 12.5, 1.25);
    }
  }
  s = pres.addSlide({ masterName: "SECTION", sectionTitle: "Summary" }); rnav.push({ label: "Next steps", num: slideNum(pres) });
  s.addText("NEXT STEPS", { placeholder: "eyebrow" });
  s.addText("Keep practising", { placeholder: "title" });
  s.addText(bulletRuns(["Re-rate the checklist: what is still red or amber?", "Do the " + t.name + " activities and the topic quiz on the Digital Technology Hub", "Practise the past-paper questions listed on each Exam focus slide", "Teach a key term to someone else – if you can explain it, you know it"], 18), { placeholder: "body" });
  await chip(s, 8.7, 4.3, 0.55, "1D6B53", HEX.copper);
  fillMenu(rmenu, rnav);
  addMenuButtons(pres, 0, rmenu.num, [1]);
  return pres;
}

root.DeckCore = { build: deck, buildTopic: topicDeck, buildRevision: revisionDeck, ICON: ICON };
})(typeof window !== 'undefined' ? window : global);
