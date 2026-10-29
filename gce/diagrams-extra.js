// GCE lesson diagrams (registered into the shared Diagrams engine)
// Diagrams for AS 1 first half (AP01–AP15)

Diagrams.add("AP01", { cap: "The systems development life cycle: seven stages arranged in a cycle, each labelled with its main deliverable", draw: function (g) {
  var P = g.P, h = "", cx = 400, cy = 225, rx = 300, ry = 165, n = 7;
  var st = [["Feasibility study", "feasibility report"], ["Analysis", "requirements spec"], ["Design", "design specification"], ["Development", "working code"], ["Testing", "test results"], ["Implementation", "live system, training"], ["Maintenance", "evaluation / review"]];
  h += g.path("M" + (cx - rx) + "," + cy + " A" + rx + "," + ry + " 0 1,1 " + (cx + rx) + "," + cy + " A" + rx + "," + ry + " 0 1,1 " + (cx - rx) + "," + cy, { stroke: P.line, sw: 3 });
  for (var i = 0; i < n; i++) {
    var tm = (-90 + (i + 0.5) * 360 / n) * Math.PI / 180, px = cx + rx * Math.cos(tm), py = cy + ry * Math.sin(tm);
    var tx = -rx * Math.sin(tm), ty = ry * Math.cos(tm), L = Math.sqrt(tx * tx + ty * ty); tx /= L; ty /= L;
    h += g.arrow(Math.round(px - 14 * tx), Math.round(py - 14 * ty), Math.round(px + 14 * tx), Math.round(py + 14 * ty), { arrow: "c", stroke: P.copper, sw: 3 });
  }
  st.forEach(function (s, i) {
    var t = (-90 + i * 360 / n) * Math.PI / 180, x = Math.round(cx + rx * Math.cos(t)), y = Math.round(cy + ry * Math.sin(t));
    h += g.rect(x - 92, y - 30, 184, 60, { fill: i === 0 ? P.copperSoft : P.card, stroke: P.pcb, sw: 2, r: 8 });
    h += g.text(x, y - 10, s[0], { bold: true, size: 15 }) + g.text(x, y + 12, s[1], { size: 13, fill: P.muted });
  });
  h += g.text(cx, cy - 22, "Systems development", { bold: true, size: 20, fill: P.pcb }) + g.text(cx, cy + 4, "life cycle", { bold: true, size: 20, fill: P.pcb });
  h += g.text(cx, cy + 36, "each stage ends with a signed-off deliverable", { size: 13, fill: P.muted });
  return h;
} });

Diagrams.add("AP02", { cap: "A feasibility study tests a proposed system against five TELOS criteria and produces a feasibility report recommending to proceed, modify or abandon", draw: function (g) {
  var P = g.P, h = "";
  h += g.box(250, 18, 300, 46, "Proposed system", { fill: P.pcb, color: P.pcbInk, bold: true, size: 17 });
  var c = [["T", "Technical", ["Do the technology", "and skills exist?"]], ["E", "Economic", ["Do benefits", "outweigh costs?"]], ["L", "Legal", ["Does it comply", "with the law?"]], ["O", "Operational", ["Will staff and", "customers use it?"]], ["S", "Schedule", ["Can it be ready", "in time?"]]];
  c.forEach(function (k, i) {
    var x = 30 + i * 150;
    h += g.line(400, 64, x + 70, 104, { stroke: P.line, sw: 2 });
    h += g.rect(x, 104, 140, 160, { fill: P.card, stroke: P.pcb, sw: 2, r: 8 });
    h += g.text(x + 70, 136, k[0], { bold: true, size: 32, fill: P.copper }) + g.text(x + 70, 174, k[1], { bold: true, size: 15 });
    h += g.lines(x + 70, 206, k[2], { size: 13, fill: P.muted }, 19);
    h += g.arrow(x + 70, 266, 400 + (x + 70 - 400) * 0.25, 302, { stroke: P.muted });
  });
  h += g.box(220, 304, 360, 50, ["Feasibility report", "options, cost–benefit, recommendation"], { fill: P.copperSoft, stroke: P.copper, size: 14, lh: 20 });
  [["Proceed", P.okSoft, P.ok, 230], ["Modify", P.warnSoft, P.warn, 400], ["Abandon", P.badSoft, P.bad, 570]].forEach(function (o) {
    h += g.arrow(400, 356, o[3], 384, { stroke: P.muted }) + g.box(o[3] - 60, 388, 120, 40, o[0], { fill: o[1], stroke: o[2], bold: true, size: 15 });
  });
  return h;
} });

Diagrams.add("AP03", { cap: "The four fact-finding methods with an advantage, a disadvantage and the users each suits, around the systems analyst", draw: function (g) {
  var P = g.P, h = "";
  var m = [["Interviews", ["+ detail and follow-up questions", "− slow; only a few people", "Best for: managers, key users"]],
           ["Questionnaires", ["+ many people, cheap, anonymous", "− low response; no follow-up", "Best for: large or spread-out groups"]],
           ["Observation", ["+ shows what really happens", "− Hawthorne effect; time-consuming", "Best for: busy practical tasks"]],
           ["Document inspection", ["+ exact data items and volumes", "− documents may be out of date", "Best for: building the data dictionary"]]];
  m.forEach(function (k, i) {
    var x = i % 2 ? 420 : 30, y = i < 2 ? 25 : 240;
    h += g.rect(x, y, 350, 185, { fill: i % 3 ? P.soft : P.copperSoft, r: 10 });
    h += g.text(x + 20, y + 30, k[0], { anchor: "start", bold: true, size: 19, fill: P.pcb });
    k[1].forEach(function (s, j) { h += g.text(x + 20, y + 72 + j * 34, s, { anchor: "start", size: 14, fill: j === 0 ? P.ok : j === 1 ? P.bad : P.ink, bold: j === 2 }); });
  });
  h += g.circle(400, 225, 46, { fill: P.pcb, stroke: P.card, sw: 4 }) + g.text(400, 215, "Systems", { size: 13, bold: true, fill: P.pcbInk }) + g.text(400, 235, "analyst", { size: 13, bold: true, fill: P.pcbInk });
  return h;
} });

Diagrams.add("AP04", { cap: "Stakeholders supply requirements to the requirements specification, which is then used for design, testing, evaluation and as a contract", draw: function (g) {
  var P = g.P, h = "";
  ["Managers (client)", "End users", "Customers", "IT staff, regulators"].forEach(function (s, i) {
    var y = 30 + i * 66; h += g.box(25, y, 175, 48, s, { fill: P.soft, size: 14 }) + g.arrow(202, y + 24, 286, 160, { stroke: P.muted });
  });
  h += g.text(112, 18, "Stakeholders", { size: 13, bold: true, fill: P.muted });
  h += g.rect(290, 30, 220, 260, { fill: P.card, stroke: P.pcb, sw: 2.5, r: 8 });
  h += g.text(400, 56, "Requirements", { bold: true, size: 17, fill: P.pcb }) + g.text(400, 78, "specification", { bold: true, size: 17, fill: P.pcb });
  h += g.box(305, 100, 190, 74, ["Functional", "what it must do"], { fill: P.okSoft, size: 14, lh: 22 });
  h += g.box(305, 186, 190, 74, ["Non-functional", "how well / constraints"], { fill: P.warnSoft, size: 14, lh: 22 });
  h += g.text(400, 276, "signed off by the client", { size: 13, fill: P.muted });
  ["Design", "Test plan, acceptance", "Evaluation", "Contract, change control"].forEach(function (s, i) {
    var y = 30 + i * 66; h += g.arrow(512, 160, 596, y + 24, { stroke: P.copper, arrow: "c" }) + g.box(600, y, 175, 48, s, { fill: P.copperSoft, size: 14 });
  });
  h += g.text(687, 18, "Used later for", { size: 13, bold: true, fill: P.muted });
  h += g.rect(25, 320, 360, 105, { fill: P.okSoft, r: 8 }) + g.text(40, 345, "Functional example", { anchor: "start", bold: true, size: 14 });
  h += g.lines(40, 375, ["The system must email a booking", "confirmation after payment."], { anchor: "start", size: 14 }, 22);
  h += g.rect(415, 320, 360, 105, { fill: P.warnSoft, r: 8 }) + g.text(430, 345, "Non-functional example (testable)", { anchor: "start", bold: true, size: 14 });
  h += g.lines(430, 375, ["Search results appear within 2 seconds", "with 300 users online."], { anchor: "start", size: 14 }, 22);
  return h;
} });

Diagrams.add("AP05", { cap: "A level 1 data flow diagram for a boat hire booking system with external entities, numbered processes, data stores and labelled data flows", draw: function (g) {
  var P = g.P, h = "";
  function ent(x, y, w, t) { return g.rect(x, y, w, 56, { fill: P.soft, stroke: P.ink, sw: 2, r: 0 }) + g.text(x + w / 2, y + 28, t, { bold: true, size: 15 }); }
  function proc(x, y, n, t) { return g.rect(x, y, 170, 80, { fill: P.card, stroke: P.pcb, sw: 2.5, r: 14 }) + g.line(x, y + 26, x + 170, y + 26, { stroke: P.pcb, sw: 1.5 }) + g.text(x + 85, y + 13, n, { bold: true, size: 13, fill: P.pcb }) + g.text(x + 85, y + 53, t, { size: 14, bold: true }); }
  function store(x, y, id, t) { return g.rect(x, y, 190, 40, { fill: P.copperSoft, r: 0 }) + g.line(x, y, x + 190, y, { stroke: P.copper, sw: 2 }) + g.line(x, y + 40, x + 190, y + 40, { stroke: P.copper, sw: 2 }) + g.line(x, y, x, y + 40, { stroke: P.copper, sw: 2 }) + g.line(x + 44, y, x + 44, y + 40, { stroke: P.copper, sw: 1.5 }) + g.text(x + 22, y + 20, id, { bold: true, size: 14 }) + g.text(x + 117, y + 20, t, { size: 14 }); }
  function lab(x, y, t, a) { return g.text(x, y, t, { size: 13, fill: P.muted, italic: true, anchor: a || "middle" }); }
  h += ent(25, 190, 130, "Customer") + ent(640, 370, 130, "Bank");
  h += proc(300, 40, "1", "Check availability") + proc(300, 300, "2", "Take payment");
  h += store(580, 40, "D2", "Boats") + store(580, 190, "D1", "Bookings");
  h += g.arrow(140, 190, 298, 92) + lab(170, 128, "booking request", "start");
  h += g.arrow(578, 60, 472, 66) + lab(525, 48, "boat details");
  h += g.arrow(578, 205, 472, 108) + lab(560, 145, "existing bookings", "start");
  h += g.arrow(385, 122, 385, 298) + lab(395, 210, "available booking", "start");
  h += g.arrow(110, 248, 298, 330) + lab(215, 268, "card details", "start");
  h += g.arrow(298, 368, 70, 250) + lab(120, 322, "confirmation email", "middle");
  h += g.arrow(472, 315, 600, 232) + lab(540, 290, "confirmed booking", "start");
  h += g.arrow(472, 360, 638, 388) + lab(555, 352, "payment request");
  h += g.arrow(638, 410, 472, 372) + lab(555, 418, "authorisation");
  return h + g.text(25, 25, "Level 1 DFD: boat hire bookings", { anchor: "start", bold: true, size: 15 });
} });

Diagrams.add("AP06", { cap: "An annotated input screen design for registering a pet, with numbered HCI features, beside part of its data dictionary", draw: function (g) {
  var P = g.P, h = "";
  h += g.rect(25, 20, 370, 410, { fill: P.card, stroke: P.ink, sw: 2, r: 10 }) + g.rect(25, 20, 370, 44, { fill: P.pcb, r: 10 }) + g.text(210, 42, "Register a new pet", { bold: true, size: 16, fill: P.pcbInk });
  var f = [["Pet name", "Bramble", 0], ["Species", "Dog  ▾", 1], ["Date of birth", "14/03/2022  ▾", 0], ["Owner phone", "02866 12345", 2]];
  f.forEach(function (r, i) {
    var y = 90 + i * 66; h += g.text(45, y, r[0], { anchor: "start", size: 14, bold: true });
    h += g.rect(45, y + 12, 250, 32, { fill: r[2] === 2 ? P.badSoft : P.paper, stroke: r[2] === 2 ? P.bad : P.line, sw: 1.5, r: 4 }) + g.text(55, y + 28, r[1], { anchor: "start", size: 14, mono: true });
  });
  h += g.text(45, 368, "Phone must be 11 digits", { anchor: "start", size: 13, fill: P.bad });
  h += g.box(45, 386, 110, 34, "Save", { fill: P.ok, color: P.card, bold: true, size: 14 }) + g.box(170, 386, 110, 34, "Cancel", { fill: P.soft, size: 14 });
  h += g.num(320, 182, "1") + g.num(320, 314, "2") + g.num(300, 368, "3") + g.num(300, 403, "4");
  h += g.text(420, 32, "HCI features", { anchor: "start", bold: true, size: 15 });
  ["1 Drop-down list prevents typing errors", "2 Field highlighted where the error is", "3 Clear, helpful error message (feedback)", "4 Buttons in the same place on every screen"].forEach(function (s, i) { h += g.text(420, 60 + i * 26, s, { anchor: "start", size: 13 }); });
  h += g.text(420, 190, "Data dictionary (extract)", { anchor: "start", bold: true, size: 15 });
  var t = [["Field", "Type", "Validation"], ["PetName", "String(30)", "Presence"], ["Species", "String(10)", "Lookup list"], ["DateOfBirth", "Date", "Range: not future"], ["OwnerPhone", "String(11)", "Length, format"]];
  t.forEach(function (r, i) {
    var y = 208 + i * 42; h += g.rect(420, y, 355, 40, { fill: i === 0 ? P.pcb : i % 2 ? P.soft : P.card, r: 0 });
    [0, 125, 225].forEach(function (dx, j) { h += g.text(430 + dx, y + 20, r[j], { anchor: "start", size: 13, bold: i === 0, fill: i === 0 ? P.pcbInk : P.ink, mono: i > 0 && j < 2 }); });
  });
  return h;
} });

Diagrams.add("AP07", { cap: "Levels of testing from unit to acceptance, and normal, boundary and erroneous test data on a number line for a valid range of 1 to 10", draw: function (g) {
  var P = g.P, h = "";
  var lv = [["Unit", "one module · programmer"], ["Integration", "modules together"], ["System", "whole system v. spec"], ["Acceptance", "client / users"]];
  h += g.text(30, 26, "Levels of testing", { anchor: "start", bold: true, size: 16 });
  lv.forEach(function (l, i) {
    var x = 30 + i * 28, y = 330 - i * 85;
    h += g.rect(x, y, 300, 66, { fill: i === 3 ? P.copperSoft : P.soft, stroke: i === 3 ? P.copper : P.pcb, sw: 2, r: 8 });
    h += g.text(x + 16, y + 22, l[0], { anchor: "start", bold: true, size: 16 }) + g.text(x + 16, y + 46, l[1], { anchor: "start", size: 13, fill: P.muted });
    if (i < 3) h += g.arrow(x + 150, y - 2, x + 170, y - 16, { stroke: P.copper, arrow: "c" });
  });
  h += g.text(600, 26, "Test data for a valid range 1 to 10", { bold: true, size: 16 });
  var x0 = 450, sc = 24, y = 110;
  h += g.line(430, y, 770, y, { stroke: P.ink, sw: 2 }) + g.rect(x0 + sc, y - 10, 9 * sc, 20, { fill: P.okSoft, stroke: P.ok, r: 4 });
  for (var v = 0; v <= 12; v++) h += g.line(x0 + v * sc, y - 6, x0 + v * sc, y + 6, { stroke: P.ink, sw: 1.5 }) + g.text(x0 + v * sc, y + 22, String(v), { size: 13, fill: P.muted });
  [[5, P.ok], [1, P.warn], [10, P.warn], [0, P.bad], [11, P.bad]].forEach(function (d) { h += g.circle(x0 + d[0] * sc, y, 7, { fill: d[1] }); });
  [["5", "normal – accept", P.ok], ["1 and 10", "boundary – accept", P.warn], ["0 and 11", "boundary – reject", P.bad]].forEach(function (k, i) {
    var yy = 168 + i * 26; h += g.circle(460, yy, 7, { fill: k[2] }) + g.text(476, yy, k[0], { anchor: "start", size: 14, bold: true }) + g.text(560, yy, k[1], { anchor: "start", size: 14, fill: k[2] });
  });
  h += g.box(450, 256, 145, 44, "“ten”  ✗ erroneous", { fill: P.badSoft, stroke: P.bad, size: 13 }) + g.box(615, 256, 145, 44, "−5  ✗ erroneous", { fill: P.badSoft, stroke: P.bad, size: 13 });
  h += g.box(450, 340, 145, 76, ["Black-box", "inputs → expected", "outputs, no code"], { fill: P.soft, size: 13, lh: 20 }) + g.box(615, 340, 145, 76, ["White-box", "tests every path", "using the code"], { fill: P.soft, size: 13, lh: 20 });
  return h;
} });

Diagrams.add("AP08", { cap: "Timelines comparing direct, parallel, phased and pilot changeover, showing when the old and new systems are in use", draw: function (g) {
  var P = g.P, h = "", X0 = 190, X1 = 765;
  var rows = [["Direct", "high risk · low cost"], ["Parallel", "low risk · high cost"], ["Phased", "one part at a time"], ["Pilot", "one site first"]];
  function bar(x1, x2, y, ht, old, t) { return g.rect(x1, y, x2 - x1, ht, { fill: old ? P.copperSoft : P.okSoft, stroke: old ? P.copper : P.ok, sw: 1.5, r: 4 }) + (t ? g.text(x1 + 8, y + ht / 2, t, { anchor: "start", size: 13 }) : ""); }
  rows.forEach(function (r, i) {
    var y = 22 + i * 95; h += g.rect(20, y, 160, 80, { fill: P.soft, r: 8 }) + g.text(36, y + 28, r[0], { anchor: "start", bold: true, size: 17 }) + g.text(36, y + 54, r[1], { anchor: "start", size: 13, fill: P.muted });
  });
  h += bar(X0, 470, 42, 40, true, "Old system") + bar(470, X1, 42, 40, false, "New system") + g.line(470, 30, 470, 96, { stroke: P.bad, sw: 2.5, dash: "5 4" });
  h += bar(X0, 590, 120, 30, true, "Old system") + bar(370, X1, 154, 30, false, "New system (outputs compared)");
  [["Part A", 330], ["Part B", 480], ["Part C", 630]].forEach(function (p, j) { var y = 212 + j * 24; h += bar(X0, p[1], y, 20, true, "") + bar(p[1], X1, y, 20, false, "") + g.text(X0 + 8, y + 10, p[0], { anchor: "start", size: 13 }); });
  h += bar(X0, 320, 312, 30, true, "") + bar(320, X1, 312, 30, false, "Pilot site") + bar(X0, 610, 350, 30, true, "Other sites") + bar(610, X1, 350, 30, false, "");
  h += g.arrow(X0, 420, X1, 420, { stroke: P.muted }) + g.text(X1 - 4, 436, "time", { anchor: "end", size: 13, fill: P.muted });
  h += g.rect(20, 410, 18, 14, { fill: P.copperSoft, stroke: P.copper, r: 2 }) + g.text(44, 417, "old", { anchor: "start", size: 13 }) + g.rect(90, 410, 18, 14, { fill: P.okSoft, stroke: P.ok, r: 2 }) + g.text(114, 417, "new", { anchor: "start", size: 13 });
  return h;
} });

Diagrams.add("AP09", { cap: "User and technical documentation compared, the three types of maintenance with examples, and the post-implementation review", draw: function (g) {
  var P = g.P, h = "";
  h += g.rect(25, 20, 365, 140, { fill: P.okSoft, r: 10 }) + g.text(45, 45, "User documentation", { anchor: "start", bold: true, size: 17 }) + g.text(45, 68, "for: end users · plain language", { anchor: "start", size: 13, fill: P.muted });
  h += g.lines(45, 96, ["Step-by-step guides with screenshots", "Troubleshooting, error messages, FAQs", "Glossary, index, support contacts"], { anchor: "start", size: 14 }, 22);
  h += g.rect(410, 20, 365, 140, { fill: P.soft, r: 10 }) + g.text(430, 45, "Technical documentation", { anchor: "start", bold: true, size: 17 }) + g.text(430, 68, "for: programmers and IT support", { anchor: "start", size: 13, fill: P.muted });
  h += g.lines(430, 96, ["DFDs, data dictionary, algorithms", "Annotated code, test plans and results", "Hardware/software requirements"], { anchor: "start", size: 14 }, 22);
  h += g.text(400, 188, "Maintenance after the system goes live", { bold: true, size: 16 });
  [["Corrective", "fix bugs found in use", "invoice total wrong with discount", P.badSoft, P.bad], ["Adaptive", "suit a changed environment", "new VAT rate; new OS", P.warnSoft, P.warn], ["Perfective", "improve a working system", "faster search; new report", P.okSoft, P.ok]].forEach(function (m, i) {
    var x = 25 + i * 255; h += g.rect(x, 205, 240, 125, { fill: m[3], stroke: m[4], sw: 2, r: 10 });
    h += g.text(x + 120, 232, m[0], { bold: true, size: 17 }) + g.text(x + 120, 262, m[1], { size: 14 }) + g.text(x + 120, 300, "e.g. " + m[2], { size: 13, fill: P.muted, italic: true });
  });
  h += g.box(25, 350, 750, 74, ["Post-implementation review: compare the live system with its original objectives", "effectiveness · efficiency · usability · reliability · costs and benefits achieved"], { fill: P.copperSoft, stroke: P.copper, size: 14, lh: 24 });
  return h;
} });

Diagrams.add("AP10", { cap: "The waterfall model as a cascade of sequential stages beside the spiral model with its four quadrants and risk analysis in every loop", draw: function (g) {
  var P = g.P, h = "";
  h += g.text(30, 24, "Waterfall: one stage after another", { anchor: "start", bold: true, size: 15 });
  ["Requirements", "Design", "Implementation", "Testing", "Maintenance"].forEach(function (s, i) {
    var x = 25 + i * 62, y = 48 + i * 76; h += g.box(x, y, 140, 46, s, { fill: i % 2 ? P.soft : P.card, stroke: P.pcb, size: 14, bold: true });
    if (i < 4) h += g.path("M" + (x + 140) + "," + (y + 23) + " H" + (x + 172) + " V" + (y + 72), { stroke: P.copper, sw: 2.5, arrow: "c" });
  });
  h += g.text(205, 432, "sign-off at the end of each stage", { size: 13, fill: P.muted });
  var cx = 610, cy = 235, d = "", a;
  h += g.line(445, cy, 775, cy, { stroke: P.line, sw: 1.5 }) + g.line(cx, 70, cx, 400, { stroke: P.line, sw: 1.5 });
  for (a = 0; a <= 6 * Math.PI; a += 0.12) { var r = 8 + a * 5.4; d += (a === 0 ? "M" : " L") + Math.round(cx + r * Math.cos(a + Math.PI)) + "," + Math.round(cy + r * Math.sin(a + Math.PI)); }
  h += g.path(d, { stroke: P.copper, sw: 2.5 });
  h += g.text(610, 42, "Spiral (Boehm): each loop repeats", { bold: true, size: 15 });
  h += g.box(448, 66, 140, 46, ["1 Objectives,", "alternatives"], { fill: P.soft, size: 13, lh: 18 }) + g.box(632, 66, 140, 46, ["2 Risk analysis,", "prototype"], { fill: P.badSoft, stroke: P.bad, size: 13, lh: 18, bold: true });
  h += g.box(632, 358, 140, 46, ["3 Develop", "and test"], { fill: P.okSoft, size: 13, lh: 18 }) + g.box(448, 358, 140, 46, ["4 Plan next", "iteration"], { fill: P.warnSoft, size: 13, lh: 18 });
  return h + g.text(610, 428, "cost grows as the spiral widens", { size: 13, fill: P.muted });
} });

Diagrams.add("AP11", { cap: "The Scrum framework: a product backlog feeds sprint planning, the team works in a 1–4 week sprint with daily stand-ups, producing an increment that is reviewed", draw: function (g) {
  var P = g.P, h = "";
  [["Product owner", "prioritises the backlog"], ["Scrum master", "removes obstacles"], ["Development team", "builds the increment"]].forEach(function (r, i) {
    var x = 25 + i * 255; h += g.rect(x, 15, 240, 54, { fill: P.soft, r: 8 }) + g.text(x + 120, 33, r[0], { bold: true, size: 14 }) + g.text(x + 120, 53, r[1], { size: 13, fill: P.muted });
  });
  h += g.text(95, 112, "Product backlog", { bold: true, size: 14 });
  for (var i = 0; i < 5; i++) h += g.rect(35, 128 + i * 34, 120, 26, { fill: i < 2 ? P.copperSoft : P.card, stroke: P.copper, r: 4 }) + g.text(95, 141 + i * 34, "user story " + (i + 1), { size: 13 });
  h += g.arrow(160, 175, 210, 175, { arrow: "c", stroke: P.copper });
  h += g.text(270, 112, "Sprint planning", { bold: true, size: 14 }) + g.rect(215, 128, 115, 94, { fill: P.card, stroke: P.pcb, sw: 2, r: 6 }) + g.lines(272, 150, ["Sprint", "backlog", "(stories 1–2)"], { size: 13 }, 22);
  h += g.arrow(334, 175, 375, 200, { arrow: "c", stroke: P.copper });
  h += g.circle(470, 230, 88, { fill: P.okSoft, stroke: P.ok, sw: 3 }) + g.text(470, 220, "Sprint", { bold: true, size: 20 }) + g.text(470, 246, "1–4 weeks", { size: 14 });
  h += g.circle(560, 145, 38, { fill: P.warnSoft, stroke: P.warn, sw: 2 }) + g.text(560, 136, "Daily", { size: 13, bold: true }) + g.text(560, 154, "stand-up", { size: 13, bold: true });
  h += g.arrow(548, 286, 610, 300, { arrow: "c", stroke: P.copper }) + g.box(615, 268, 160, 64, ["Increment", "working software"], { fill: P.pcb, color: P.pcbInk, bold: true, size: 14, lh: 22 });
  h += g.arrow(695, 334, 695, 362, { stroke: P.muted }) + g.box(400, 366, 375, 56, ["Sprint review with stakeholders", "then retrospective: how can we improve?"], { fill: P.copperSoft, size: 14, lh: 22 });
  h += g.path("M400,394 H95 V300", { stroke: P.muted, sw: 2, dash: "6 5", arrow: "a" }) + g.text(250, 412, "feedback updates the backlog", { size: 13, fill: P.muted });
  return h;
} });

Diagrams.add("AP12", { cap: "Gantt chart for an eight-task project showing the critical path A, B, D, F, H of 16 days and the float on tasks C, E and G", draw: function (g) {
  var P = g.P, h = "", x0 = 230, sc = 33, y0 = 62, rh = 38;
  var t = [["A Analysis", 0, 4, 0], ["B Design database", 4, 3, 0], ["C Design interface", 4, 2, 2], ["D Code database", 7, 5, 0], ["E Code interface", 6, 4, 2], ["F Integration testing", 12, 3, 0], ["G Train users", 6, 2, 7], ["H Install", 15, 1, 0]];
  for (var d = 0; d <= 16; d += 2) h += g.line(x0 + d * sc, 44, x0 + d * sc, y0 + 8 * rh, { stroke: P.line, sw: 1 }) + g.text(x0 + d * sc, 32, String(d), { size: 13, fill: P.muted });
  h += g.text(30, 32, "Task", { anchor: "start", bold: true, size: 14 }) + g.text(x0 - 12, 32, "day", { anchor: "end", size: 13, fill: P.muted });
  t.forEach(function (k, i) {
    var y = y0 + i * rh, crit = k[3] === 0;
    h += g.text(30, y + 14, k[0], { anchor: "start", size: 14, bold: crit });
    h += g.rect(x0 + k[1] * sc, y, k[2] * sc, 26, { fill: crit ? P.copper : P.pcb, r: 4 });
    if (k[3]) h += g.rect(x0 + (k[1] + k[2]) * sc, y + 4, k[3] * sc, 18, { fill: "none", stroke: P.muted, dash: "5 4", r: 3 }) + g.text(x0 + (k[1] + k[2] + k[3] / 2) * sc, y + 13, "float " + k[3], { size: 13, fill: P.muted });
  });
  var ly = y0 + 8 * rh + 30;
  h += g.rect(30, ly - 8, 22, 16, { fill: P.copper, r: 3 }) + g.text(60, ly, "critical task (zero float)", { anchor: "start", size: 13 });
  h += g.rect(250, ly - 8, 22, 16, { fill: P.pcb, r: 3 }) + g.text(280, ly, "non-critical task", { anchor: "start", size: 13 });
  return h + g.text(770, ly, "Critical path A–B–D–F–H = 16 days", { anchor: "end", bold: true, size: 14, fill: P.copper });
} });

Diagrams.add("AP13", { cap: "Version control: commits on the main branch, a feature branch that is merged back, and the CASE tools and quality techniques used in software projects", draw: function (g) {
  var P = g.P, h = "", my = 180, fy = 90;
  h += g.line(50, my, 760, my, { stroke: P.pcb, sw: 4 }) + g.text(40, my, "main", { anchor: "end", size: 13, bold: true, fill: P.pcb });
  h += g.path("M200," + my + " C240," + my + " 240," + fy + " 290," + fy + " L480," + fy + " C560," + fy + " 560," + my + " 600," + my, { stroke: P.copper, sw: 4 });
  [80, 200, 380, 600, 720].forEach(function (x) { h += g.circle(x, my, 11, { fill: P.card, stroke: P.pcb, sw: 3 }); });
  [300, 420].forEach(function (x) { h += g.circle(x, fy, 11, { fill: P.card, stroke: P.copper, sw: 3 }); });
  h += g.text(360, fy - 30, "feature/online-payments", { size: 14, bold: true, fill: P.copper });
  h += g.text(200, my + 32, "branch", { size: 13, bold: true }) + g.text(600, my + 32, "merge", { size: 13, bold: true }) + g.text(600, my + 52, "after code review", { size: 13, fill: P.muted }) + g.text(380, my + 32, "commit: “fix VAT bug”", { size: 13 }) + g.text(720, my + 32, "commit", { size: 13 });
  h += g.text(80, my + 32, "commit", { size: 13 });
  [["Upper CASE", ["DFD and ERD drawing", "data dictionary", "project planning"], P.soft], ["Lower CASE", ["IDE, debugger", "code generators", "automated testing"], P.okSoft], ["Quality", ["code reviews", "coding standards", "quality assurance"], P.copperSoft]].forEach(function (b, i) {
    var x = 25 + i * 255; h += g.rect(x, 262, 240, 160, { fill: b[2], r: 10 }) + g.text(x + 120, 288, b[0], { bold: true, size: 17 }) + g.lines(x + 120, 324, b[1], { size: 14 }, 28);
  });
  return h;
} });

Diagrams.add("AP14", { cap: "Threats to an information system grouped as external deliberate attacks, insider threats and accidental loss", draw: function (g) {
  var P = g.P, h = "";
  var b = [[30, 20, "Malware", ["virus · worm · Trojan", "ransomware · spyware"], P.badSoft, P.bad], [550, 20, "Hacking", ["unauthorised access", "weak passwords, SQL injection"], P.badSoft, P.bad],
           [30, 165, "Phishing, social eng.", ["fake emails and calls", "trick people, not tech"], P.badSoft, P.bad], [550, 165, "Denial of service", ["DDoS botnet floods server", "service unavailable"], P.badSoft, P.bad],
           [30, 310, "Insider threats", ["staff steal or misuse data", "careless mistakes"], P.warnSoft, P.warn], [550, 310, "Accidental loss", ["deletion, hardware failure", "fire, flood, power cut"], P.soft, P.muted]];
  b.forEach(function (k) { h += g.line(k[0] < 400 ? k[0] + 220 : k[0], k[1] + 40, k[0] < 400 ? 300 : 500, 205, { stroke: k[5], sw: 2, dash: "6 4" }); });
  h += g.box(300, 165, 200, 80, ["Information", "system and data"], { fill: P.pcb, color: P.pcbInk, bold: true, size: 17, lh: 24 });
  b.forEach(function (k) { h += g.rect(k[0], k[1], 220, 80, { fill: k[4], stroke: k[5], sw: 2, r: 8 }) + g.text(k[0] + 110, k[1] + 20, k[2], { bold: true, size: 15 }) + g.lines(k[0] + 110, k[1] + 44, k[3], { size: 13 }, 19); });
  h += g.rect(30, 410, 16, 16, { fill: P.badSoft, stroke: P.bad, r: 3 }) + g.text(54, 418, "external, deliberate", { anchor: "start", size: 13 });
  h += g.rect(230, 410, 16, 16, { fill: P.warnSoft, stroke: P.warn, r: 3 }) + g.text(254, 418, "internal", { anchor: "start", size: 13 });
  h += g.rect(360, 410, 16, 16, { fill: P.soft, stroke: P.muted, r: 3 }) + g.text(384, 418, "accidental", { anchor: "start", size: 13 });
  return h + g.text(770, 418, "Consequences: cost, downtime, fines, reputation", { anchor: "end", size: 13, fill: P.muted });
} });

Diagrams.add("AP15", { cap: "Layers of protection around data – policy and training, network defences, authentication and access rights, encryption – alongside the 3-2-1 backup rule and disaster recovery", draw: function (g) {
  var P = g.P, h = "";
  var L = [[20, 20, 450, 410, "People: security policy, staff training", P.soft], [45, 68, 400, 340, "Network: firewall, anti-malware, patching", P.okSoft], [70, 116, 350, 270, "Access: MFA, passwords, least privilege", P.warnSoft], [95, 164, 300, 200, "Encryption: at rest and in transit", P.copperSoft]];
  L.forEach(function (l) { h += g.rect(l[0], l[1], l[2], l[3], { fill: l[5], stroke: P.line, sw: 1.5, r: 14 }) + g.text(l[0] + l[2] / 2, l[1] + 22, l[4], { size: 14, bold: true }); });
  h += g.box(130, 212, 230, 120, ["DATA", "customer records"], { fill: P.pcb, color: P.pcbInk, bold: true, size: 18, lh: 30, r: 10 });
  h += g.text(635, 30, "Backup: the 3-2-1 rule", { bold: true, size: 16 });
  [["3", "copies of the data"], ["2", "different storage media"], ["1", "copy off-site or in the cloud"]].forEach(function (k, i) {
    var y = 52 + i * 58; h += g.rect(500, y, 275, 48, { fill: P.card, stroke: P.pcb, sw: 1.5, r: 8 }) + g.text(530, y + 24, k[0], { bold: true, size: 26, fill: P.copper }) + g.text(560, y + 24, k[1], { anchor: "start", size: 14 });
  });
  h += g.box(500, 240, 275, 80, ["Disaster recovery plan", "restore IT systems and data", "after fire, flood or ransomware"], { fill: P.badSoft, stroke: P.bad, size: 14, lh: 22 });
  h += g.arrow(637, 322, 637, 344, { stroke: P.muted });
  h += g.box(500, 348, 275, 80, ["Business continuity plan", "keep the whole organisation", "running during disruption"], { fill: P.okSoft, stroke: P.ok, size: 14, lh: 22 });
  return h;
} });

// Diagrams for AS 1 programming lessons AP16–AP25
(function () {
  // ---- AP16 Designing algorithms ----
  Diagrams.add("AP16", { cap: "Decomposition of a boat-hire problem into a structure diagram, beside a flowchart of a sentinel-controlled averaging loop", draw: function (g) {
    var P = g.P, h = "";
    h += g.text(200, 24, "Decomposition: structure diagram", { bold: true, size: 16 });
    h += g.box(110, 44, 180, 46, "Boat hire charge", { fill: P.pcb, color: P.pcbInk, bold: true });
    var kids = [["Input hours", 20], ["Calculate cost", 140], ["Output receipt", 260]];
    kids.forEach(function (k) { h += g.line(200, 90, k[1] + 60, 130, { stroke: P.muted }) + g.box(k[1], 130, 120, 44, k[0], { fill: P.soft, size: 14 }); });
    h += g.line(200, 174, 120, 220, { stroke: P.muted }) + g.line(200, 174, 280, 220, { stroke: P.muted });
    h += g.box(60, 220, 120, 44, "£12 per hour", { fill: P.copperSoft, size: 14 }) + g.box(220, 220, 120, 44, ["10% off if", "3+ hours"], { fill: P.copperSoft, size: 13, lh: 17 });
    h += g.lines(200, 300, ["Abstraction: store hours and price only –", "not the boat's colour or the weather."], { size: 14, fill: P.muted }, 20);
    h += g.rect(30, 350, 340, 80, { fill: P.okSoft, r: 8 }) + g.lines(200, 374, ["Each sub-problem can be coded and", "tested separately, by different people."], { size: 14 }, 22);
    h += g.line(410, 20, 410, 430, { stroke: P.line, dash: "5 5" });
    h += g.text(605, 24, "Flowchart: average until -1", { bold: true, size: 16 });
    h += g.term(605, 56, 110, 32, "Start");
    h += g.arrow(605, 72, 605, 88) + g.box(530, 90, 150, 34, "total ← 0, count ← 0", { fill: P.soft, size: 13 });
    h += g.arrow(605, 124, 605, 138) + g.para(540, 140, 130, 34, "INPUT mark", { size: 13 });
    h += g.arrow(605, 174, 605, 190) + g.diamond(605, 222, 80, 32, "mark = -1?", { size: 13 });
    h += g.text(700, 212, "Yes", { size: 13, bold: true, fill: P.ok }) + g.arrow(685, 222, 712, 222) + g.para(712, 205, 82, 34, "OUTPUT", { size: 13 });
    h += g.text(614, 266, "No", { size: 13, bold: true, fill: P.bad, anchor: "start" }) + g.arrow(605, 254, 605, 276);
    h += g.box(510, 278, 190, 34, "total ← total + mark", { fill: P.soft, size: 13 }) + g.arrow(605, 312, 605, 322);
    h += g.box(530, 324, 150, 34, "count ← count + 1", { fill: P.soft, size: 13 });
    h += g.path("M530,341 H460 V157 H536", { stroke: P.copper, sw: 2, arrow: "c" });
    h += g.text(470, 380, "loop back", { size: 13, fill: P.copper, anchor: "start" });
    h += g.arrow(753, 239, 753, 392) + g.term(753, 410, 80, 30, "Stop");
    return h;
  } });

  // ---- AP17 Searching ----
  Diagrams.add("AP17", { cap: "Binary search for 31 in a sorted array of nine items: each pass compares the middle item and discards half, finding it in 3 comparisons compared with 6 for a linear search", draw: function (g) {
    var P = g.P, h = "", a = [3, 8, 12, 19, 25, 31, 40, 47, 56];
    h += g.text(400, 22, "Binary search for 31 (the list must be sorted)", { bold: true, size: 17 });
    var passes = [[0, 8, 4, "31 > 25: discard the left half"], [5, 8, 6, "31 < 40: discard the right half"], [5, 5, 5, "31 = 31: found at index 5"]];
    passes.forEach(function (p, r) {
      var y = 60 + r * 105;
      h += g.text(30, y + 26, "Pass " + (r + 1), { anchor: "start", bold: true, size: 14 });
      a.forEach(function (v, i) {
        var x = 90 + i * 54, inRange = i >= p[0] && i <= p[1], isMid = i === p[2];
        h += g.box(x, y, 50, 50, String(v), { fill: isMid ? (r === 2 ? P.ok : P.copper) : inRange ? P.soft : P.paper, stroke: inRange ? P.muted : P.line, color: isMid ? P.card : inRange ? P.ink : P.muted, mono: true, bold: isMid, size: 18 });
        if (r === 0) h += g.text(x + 25, y - 10, String(i), { size: 13, fill: P.muted, mono: true });
      });
      h += g.text(90 + p[0] * 54 + 25, y + 64, "low", { size: 13, fill: P.pcb, bold: true });
      h += g.text(90 + p[1] * 54 + 25, y + 80, "high", { size: 13, fill: P.pcb, bold: true });
      h += g.text(90 + p[2] * 54 + 25, y + 64 + (p[2] === p[0] ? 32 : 0), "mid", { size: 13, fill: P.copper, bold: true });
      h += g.text(585, y + 25, p[3], { anchor: "start", size: 13 });
    });
    h += g.rect(100, 382, 600, 54, { fill: P.okSoft, r: 8 });
    h += g.lines(400, 398, ["Binary: 3 comparisons · Linear: 6 comparisons (3, 8, 12, 19, 25, 31)", "Worst case for n items – binary ≈ log₂ n, O(log n) · linear n, O(n)"], { size: 14 }, 22);
    return h;
  } });

  // ---- AP18 Sorting ----
  Diagrams.add("AP18", { cap: "Bubble sort and insertion sort of 5 1 4 2 8 shown pass by pass side by side", draw: function (g) {
    var P = g.P, h = "";
    function row(x, y, vals, hi, sortedFrom, sortedTo) {
      var r = "";
      vals.forEach(function (v, i) {
        var inSorted = i >= sortedFrom && i <= sortedTo;
        r += g.box(x + i * 50, y, 44, 44, String(v), { fill: hi.indexOf(i) > -1 ? P.copperSoft : inSorted ? P.okSoft : P.card, stroke: hi.indexOf(i) > -1 ? P.copper : inSorted ? P.ok : P.line, mono: true, bold: true, size: 18 });
      });
      return r;
    }
    h += g.text(200, 24, "Bubble sort", { bold: true, size: 18 }) + g.text(200, 48, "swap adjacent pairs; largest bubbles to the end", { size: 13, fill: P.muted });
    var b = [["Start", [5, 1, 4, 2, 8], [], 9, 9], ["Pass 1", [1, 4, 2, 5, 8], [0, 1, 2, 3], 4, 4], ["Pass 2", [1, 2, 4, 5, 8], [1, 2], 3, 4], ["Pass 3", [1, 2, 4, 5, 8], [], 0, 4]];
    b.forEach(function (r, i) { var y = 70 + i * 72; h += g.text(30, y + 22, r[0], { anchor: "start", size: 14, bold: true }) + row(95, y, r[1], r[2], r[3], r[4]); });
    h += g.text(220, 370, "Pass 3 makes no swaps → stop", { size: 14, fill: P.ok, bold: true });
    h += g.line(400, 20, 400, 400, { stroke: P.line, dash: "5 5" });
    h += g.text(600, 24, "Insertion sort", { bold: true, size: 18 }) + g.text(600, 48, "insert each key into the sorted part", { size: 13, fill: P.muted });
    var s = [["Start", [5, 1, 4, 2, 8], [], 0, 0], ["key 1", [1, 5, 4, 2, 8], [0], 0, 1], ["key 4", [1, 4, 5, 2, 8], [1], 0, 2], ["key 2", [1, 2, 4, 5, 8], [1], 0, 3], ["key 8", [1, 2, 4, 5, 8], [4], 0, 4]];
    s.forEach(function (r, i) { var y = 70 + i * 60; h += g.text(425, y + 22, r[0], { anchor: "start", size: 14, bold: true }) + row(500, y, r[1], r[2], r[3], r[4]); });
    h += g.rect(40, 405, 18, 18, { fill: P.okSoft, stroke: P.ok }) + g.text(66, 414, "sorted part", { anchor: "start", size: 13 });
    h += g.rect(200, 405, 18, 18, { fill: P.copperSoft, stroke: P.copper }) + g.text(226, 414, "moved this pass", { anchor: "start", size: 13 });
    h += g.text(600, 414, "Both O(n²) worst case · merge sort O(n log n)", { size: 13, fill: P.muted });
    return h;
  } });

  // ---- AP19 Data types ----
  Diagrams.add("AP19", { cap: "Variables as labelled memory boxes with their C# data types, a locked constant, and examples of integer division and modulus", draw: function (g) {
    var P = g.P, h = "";
    h += g.text(400, 24, "Variables are named memory locations – each has a data type", { bold: true, size: 17 });
    var v = [["int", "quantity", "3"], ["double", "price", "24.50"], ["char", "size", "'M'"], ["string", "item", "\"Hoodie\""], ["bool", "member", "true"]];
    v.forEach(function (d, i) {
      var x = 30 + i * 150;
      h += g.box(x, 52, 140, 30, d[0], { fill: P.pcb, color: P.pcbInk, bold: true, mono: true, size: 14 });
      h += g.box(x, 82, 140, 64, d[2], { fill: P.card, stroke: P.pcb, mono: true, bold: true, size: 18 });
      h += g.text(x + 70, 164, d[1], { mono: true, size: 14, fill: P.muted });
    });
    h += g.rect(30, 200, 330, 100, { fill: P.warnSoft, stroke: P.warn, r: 8 });
    h += g.text(195, 224, "Constant – fixed while the program runs", { bold: true, size: 14 });
    h += g.text(195, 256, "const double VAT_RATE = 0.2;", { mono: true, size: 14 });
    h += g.text(195, 284, "change it once, used everywhere", { size: 13, fill: P.muted });
    h += g.rect(390, 200, 380, 100, { fill: P.soft, r: 8 });
    h += g.text(580, 224, "Assignment stores a new value", { bold: true, size: 14 });
    h += g.text(580, 256, "total = quantity * price;", { mono: true, size: 14 });
    h += g.text(580, 284, "=  assigns     ==  compares", { mono: true, size: 13, fill: P.muted });
    var ops = [["17 / 5", "3", "integer division"], ["17 % 5", "2", "modulus (remainder)"], ["17.0 / 5", "3.4", "real division"], ["(int)7.9", "7", "cast truncates"]];
    ops.forEach(function (o, i) {
      var x = 30 + i * 187;
      h += g.box(x, 330, 176, 46, o[0] + "  →  " + o[1], { fill: i < 2 ? P.copperSoft : P.okSoft, mono: true, bold: true, size: 16 });
      h += g.text(x + 88, 394, o[2], { size: 13, fill: P.muted });
    });
    return h + g.text(400, 428, "Relational (== != < > <= >=) give true/false · Boolean: && AND, || OR, ! NOT", { size: 14 });
  } });

  // ---- AP20 Control structures ----
  Diagrams.add("AP20", { cap: "The three control structures as flowcharts: sequence, selection with two branches, and iteration with a loop back", draw: function (g) {
    var P = g.P, h = "";
    h += g.text(130, 26, "Sequence", { bold: true, size: 17 });
    ["Input price", "Add VAT", "Output total"].forEach(function (s, i) { h += g.box(55, 60 + i * 90, 150, 50, s, { fill: P.soft }) + (i < 2 ? g.arrow(130, 110 + i * 90, 130, 148 + i * 90) : ""); });
    h += g.text(130, 345, "one after another", { size: 13, fill: P.muted });
    h += g.text(400, 26, "Selection", { bold: true, size: 17 });
    h += g.diamond(400, 95, 90, 40, "age < 16?");
    h += g.line(310, 95, 300, 95) + g.arrow(300, 95, 300, 168) + g.arrow(490, 95, 500, 95) + g.arrow(500, 95, 500, 168);
    h += g.text(318, 80, "Yes", { size: 13, bold: true, fill: P.ok }) + g.text(482, 80, "No", { size: 13, bold: true, fill: P.bad });
    h += g.box(240, 170, 120, 46, "Child fare", { fill: P.okSoft }) + g.box(440, 170, 120, 46, "Adult fare", { fill: P.badSoft });
    h += g.arrow(300, 216, 300, 260) + g.arrow(500, 216, 500, 260) + g.line(300, 260, 500, 260) + g.arrow(400, 260, 400, 290);
    h += g.box(340, 292, 120, 40, "Output", { fill: P.soft });
    h += g.text(400, 345, "if / else if / else, switch", { size: 13, fill: P.muted });
    h += g.text(670, 26, "Iteration", { bold: true, size: 17 });
    h += g.box(605, 55, 130, 40, "count ← 1", { fill: P.soft }) + g.arrow(670, 95, 670, 115);
    h += g.diamond(670, 150, 85, 34, "count <= 5?");
    h += g.text(680, 200, "Yes", { size: 13, bold: true, fill: P.ok, anchor: "start" }) + g.arrow(670, 184, 670, 220);
    h += g.box(600, 222, 140, 40, "Output count", { fill: P.soft }) + g.arrow(670, 262, 670, 278);
    h += g.box(600, 280, 140, 40, "count ← count + 1", { fill: P.soft, size: 14 });
    h += g.path("M600,300 H572 V150 H585", { stroke: P.copper, sw: 2, arrow: "c" });
    h += g.text(764, 140, "No", { size: 13, bold: true, fill: P.bad }) + g.line(755, 150, 776, 150) + g.arrow(776, 150, 776, 300) + g.text(776, 316, "exit", { size: 13, anchor: "end", fill: P.bad });
    h += g.text(670, 345, "for, while, do…while", { size: 13, fill: P.muted });
    h += g.rect(16, 375, 768, 56, { fill: P.okSoft, r: 8 });
    return h + g.lines(400, 392, ["Count-controlled (for): repetitions known · Condition-controlled (while / do…while): repeat until a condition changes", "Nested: a structure inside another – the inner loop completes for every pass of the outer loop"], { size: 13 }, 22);
  } });

  // ---- AP21 Parameters ----
  Diagrams.add("AP21", { cap: "Passing by value copies the argument into the parameter so the original is unchanged; passing by reference makes the parameter refer to the original variable, so it changes", draw: function (g) {
    var P = g.P, h = "";
    h += g.text(200, 26, "By value: DoubleIt(score)", { bold: true, size: 16, mono: true });
    h += g.text(200, 52, "a COPY is passed", { size: 14, fill: P.muted });
    h += g.text(110, 90, "caller", { size: 13, fill: P.muted, bold: true }) + g.box(50, 102, 120, 70, ["score", "10"], { fill: P.card, stroke: P.pcb, sw: 2, mono: true, bold: true, size: 18, lh: 26 });
    h += g.text(290, 90, "inside DoubleIt", { size: 13, fill: P.muted, bold: true }) + g.box(230, 102, 120, 70, ["n", "10 → 20"], { fill: P.copperSoft, stroke: P.copper, mono: true, bold: true, size: 18, lh: 26 });
    h += g.arrow(172, 137, 226, 137, { arrow: "c" }) + g.text(199, 122, "copy", { size: 13, fill: P.copper });
    h += g.box(50, 200, 300, 50, "after the call: score is still 10", { fill: P.okSoft, size: 15 });
    h += g.line(400, 20, 400, 300, { stroke: P.line, dash: "5 5" });
    h += g.text(600, 26, "By reference: DoubleRef(ref score)", { bold: true, size: 16, mono: true });
    h += g.text(600, 52, "a REFERENCE to the original is passed", { size: 14, fill: P.muted });
    h += g.text(510, 90, "caller", { size: 13, fill: P.muted, bold: true }) + g.box(450, 102, 120, 70, ["score", "10 → 20"], { fill: P.card, stroke: P.pcb, sw: 2, mono: true, bold: true, size: 18, lh: 26 });
    h += g.text(690, 90, "inside DoubleRef", { size: 13, fill: P.muted, bold: true }) + g.box(630, 102, 120, 70, ["n", "→ score"], { fill: P.paper, stroke: P.copper, dash: "6 4", mono: true, bold: true, size: 18, lh: 26 });
    h += g.arrow(628, 137, 574, 137, { arrow: "c" }) + g.text(601, 122, "ref", { size: 13, fill: P.copper });
    h += g.box(450, 200, 300, 50, "after the call: score is now 20", { fill: P.badSoft, size: 15 });
    h += g.rect(30, 300, 740, 130, { fill: P.soft, r: 8 });
    h += g.text(400, 324, "Scope", { bold: true, size: 16 });
    h += g.box(50, 342, 330, 74, ["Local: declared inside a subroutine,", "exists only while it runs"], { fill: P.card, size: 14, lh: 22 });
    h += g.box(420, 342, 330, 74, ["Global: visible to the whole program", "(in C#, a public static field)"], { fill: P.card, size: 14, lh: 22 });
    return h;
  } });

  // ---- AP22 Data structures ----
  Diagrams.add("AP22", { cap: "Four data structures: a one-dimensional array with indexes, a two-dimensional array addressed by row and column, a growing list, and a record with fields of different types", draw: function (g) {
    var P = g.P, h = "";
    h += g.text(200, 22, "1D array  int[] scores", { bold: true, size: 15, mono: true });
    [12, 19, 7, 15].forEach(function (v, i) { h += g.box(50 + i * 75, 44, 70, 50, String(v), { fill: P.soft, stroke: P.pcb, mono: true, bold: true, size: 18 }) + g.text(85 + i * 75, 108, "[" + i + "]", { mono: true, size: 13, fill: P.muted }); });
    h += g.text(200, 136, "fixed size · one data type · index from 0", { size: 13, fill: P.muted });
    h += g.text(600, 22, "2D array  int[,] seats", { bold: true, size: 15, mono: true });
    for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) { var bk = (r === 0 && c === 1) || (r === 2 && c === 3) || (r === 2 && c === 0); h += g.box(470 + c * 62, 40 + r * 34, 58, 30, bk ? "1" : "0", { fill: bk ? P.copperSoft : P.soft, mono: true, size: 14 }); }
    for (r = 0; r < 3; r++) h += g.text(455, 55 + r * 34, String(r), { mono: true, size: 13, fill: P.muted });
    h += g.text(600, 158, "seats[2, 3] = row 2, column 3", { mono: true, size: 13, fill: P.copper });
    h += g.line(20, 180, 780, 180, { stroke: P.line, dash: "5 5" }) + g.line(400, 190, 400, 440, { stroke: P.line, dash: "5 5" });
    h += g.text(200, 205, "List<string> queue  (dynamic)", { bold: true, size: 15, mono: true });
    ["Dara", "Aoife", "Cara"].forEach(function (v, i) { h += g.box(40 + i * 90, 228, 84, 44, v, { fill: P.okSoft, size: 15 }); });
    h += g.box(310, 228, 70, 44, "+ Add", { fill: P.paper, stroke: P.ok, dash: "5 4", size: 14 });
    h += g.text(200, 300, "grows and shrinks: Add, Insert, Remove, Count", { size: 13, fill: P.muted });
    h += g.text(200, 340, "Text file  scores.txt", { bold: true, size: 15, mono: true }) + g.box(90, 356, 220, 62, ["Aoife,72", "Ben,65"], { fill: P.card, stroke: P.muted, mono: true, size: 14, lh: 22 });
    h += g.text(600, 205, "Record  class Member", { bold: true, size: 15, mono: true });
    var f = [["name", "string", "\"Niamh\""], ["age", "int", "17"], ["paid", "bool", "true"]];
    f.forEach(function (x, i) { var y = 228 + i * 48; h += g.box(450, y, 110, 42, x[0], { fill: P.pcb, color: P.pcbInk, mono: true, bold: true, size: 14 }) + g.box(562, y, 80, 42, x[1], { fill: P.soft, mono: true, size: 13 }) + g.box(644, y, 110, 42, x[2], { fill: P.card, stroke: P.line, mono: true, size: 14 }); });
    return h + g.text(600, 390, "related fields of DIFFERENT types", { size: 13, fill: P.muted }) + g.text(600, 412, "describing one entity", { size: 13, fill: P.muted });
  } });

  // ---- AP23 Robust programs ----
  Diagrams.add("AP23", { cap: "A robust input process: validation loop rejects bad data, try and catch handle run-time errors, with the three error types summarised", draw: function (g) {
    var P = g.P, h = "";
    h += g.para(30, 64, 140, 46, "INPUT age", { size: 14 });
    h += g.arrow(170, 87, 210, 87) + g.diamond(300, 87, 88, 42, "Valid?", { size: 15 });
    h += g.lines(300, 150, ["type · range · presence", "length · format · lookup"], { size: 13, fill: P.muted }, 18);
    h += g.path("M300,45 V18 H100 V60", { stroke: P.bad, sw: 2, arrow: "r" }) + g.text(200, 34, "No: error message, ask again", { size: 13, fill: P.bad });
    h += g.text(412, 74, "Yes", { size: 13, bold: true, fill: P.ok }) + g.arrow(388, 87, 440, 87);
    h += g.rect(440, 40, 330, 140, { fill: P.soft, r: 8 });
    h += g.box(455, 52, 300, 36, "try { process the data }", { fill: P.card, mono: true, size: 14 });
    h += g.box(455, 94, 300, 36, "catch (FormatException) { … }", { fill: P.warnSoft, mono: true, size: 13 });
    h += g.box(455, 136, 300, 36, "finally { close the file }", { fill: P.okSoft, mono: true, size: 14 });
    h += g.text(400, 208, "Three types of error", { bold: true, size: 16 });
    var e = [["Syntax", "breaks the language rules", "will not compile", "Consle.WriteLine(…)", P.badSoft], ["Run-time", "impossible operation", "program crashes", "60 / players when 0", P.warnSoft], ["Logic", "wrong algorithm", "runs, wrong output", "mark > 50 for 'at least 50'", P.copperSoft]];
    e.forEach(function (x, i) { var xx = 30 + i * 250; h += g.rect(xx, 228, 240, 126, { fill: x[4], r: 8 }) + g.text(xx + 120, 250, x[0], { bold: true, size: 16 }) + g.lines(xx + 120, 278, [x[1], x[2]], { size: 14 }, 22) + g.text(xx + 120, 332, x[3], { mono: true, size: 13 }); });
    return h + g.text(400, 390, "Debugging: breakpoints · stepping · watch window · trace tables · test data", { size: 15, bold: true }) + g.text(400, 420, "Validation checks data is sensible – it cannot prove it is correct", { size: 14, fill: P.muted });
  } });

  // ---- AP24 Classes and objects ----
  Diagrams.add("AP24", { cap: "Class diagram of an Account class with private attribute and public methods, and two objects instantiated from it with their own state", draw: function (g) {
    var P = g.P, h = "";
    h += g.rect(30, 40, 380, 330, { fill: P.card, stroke: P.pcb, sw: 2.5, r: 8 });
    h += g.box(30, 40, 380, 44, "Account", { fill: P.pcb, color: P.pcbInk, bold: true, size: 18, r: 8 });
    h += g.text(46, 100, "attributes", { anchor: "start", size: 13, fill: P.muted, bold: true });
    h += g.lines(46, 124, ["- balance : double", "+ Owner : string  { get; private set; }"], { anchor: "start", mono: true, size: 13 }, 24);
    h += g.line(30, 170, 410, 170, { stroke: P.line });
    h += g.text(46, 186, "methods", { anchor: "start", size: 13, fill: P.muted, bold: true });
    h += g.lines(46, 212, ["+ Account(owner : string, opening : double)", "+ Deposit(amount : double) : void", "+ Withdraw(amount : double) : bool", "+ GetBalance() : double"], { anchor: "start", mono: true, size: 13 }, 26);
    h += g.text(220, 345, "-  private      +  public      #  protected", { size: 13, fill: P.muted });
    [[500, 50, "acc1 : Account", ["Owner = \"Ciara\"", "balance = 75"]], [500, 220, "acc2 : Account", ["Owner = \"Ross\"", "balance = 310"]]].forEach(function (o) {
      h += g.rect(o[0], o[1], 270, 120, { fill: P.copperSoft, r: 8 }) + g.text(o[0] + 16, o[1] + 24, o[2], { anchor: "start", bold: true, mono: true, size: 15 }) + g.lines(o[0] + 16, o[1] + 60, o[3], { anchor: "start", mono: true, size: 14 }, 26);
      h += g.arrow(412, 200, o[0] - 4, o[1] + 60, { dash: "6 5", arrow: "c" });
    });
    h += g.text(455, 190, "new", { size: 14, fill: P.copper, bold: true, mono: true });
    return h + g.rect(30, 385, 740, 50, { fill: P.okSoft, r: 8 }) + g.text(400, 410, "Encapsulation: balance is private, so it can only change through Deposit() and Withdraw()", { size: 14 });
  } });

  // ---- AP25 Inheritance and events ----
  Diagrams.add("AP25", { cap: "Inheritance hierarchy with Car and Lorry deriving from Vehicle and Lorry overriding Toll, beside an event-driven cycle of event loop, event, handler and update", draw: function (g) {
    var P = g.P, h = "";
    h += g.text(210, 22, "Inheritance and polymorphism", { bold: true, size: 16 });
    h += g.rect(90, 40, 240, 100, { fill: P.card, stroke: P.pcb, sw: 2, r: 8 }) + g.box(90, 40, 240, 34, "Vehicle", { fill: P.pcb, color: P.pcbInk, bold: true, r: 8 });
    h += g.lines(104, 92, ["+ reg : string", "+ virtual Toll() : double"], { anchor: "start", mono: true, size: 13 }, 22);
    [[20, "Car", ["(inherits reg, Toll)", "Toll() → £2.00"]], [220, "Lorry", ["- axles : int", "Toll() override", "→ £5 + £1.50/axle"]]].forEach(function (c) {
      h += g.rect(c[0], 230, 180, 110, { fill: P.card, stroke: P.copper, sw: 2, r: 8 }) + g.box(c[0], 230, 180, 34, c[1], { fill: P.copperSoft, bold: true, r: 8 });
      h += g.lines(c[0] + 90, 282, c[2], { mono: true, size: 13 }, 20);
      h += g.line(c[0] + 90, 228, 210, 156, { stroke: P.ink, sw: 2 });
    });
    h += g.path("M200,156 L220,156 L210,141 Z", { fill: P.card, stroke: P.ink, sw: 2 });
    h += g.text(210, 196, "is a", { size: 13, fill: P.muted, italic: true });
    h += g.lines(210, 372, ["foreach (Vehicle v in queue) v.Toll();", "the right Toll() runs for each object"], { size: 13 }, 22);
    h += g.line(420, 20, 420, 440, { stroke: P.line, dash: "5 5" });
    h += g.text(610, 22, "Event-driven programming", { bold: true, size: 16 });
    var cx = 610, cy = 210, pts = [[cx, cy - 120, "Event loop waits", P.pcb, P.pcbInk], [cx + 110, cy, "Event: Click", P.warnSoft, P.ink], [cx, cy + 120, "Handler runs", P.copperSoft, P.ink], [cx - 110, cy, "Update GUI", P.okSoft, P.ink]];
    pts.forEach(function (p) { h += g.box(p[0] - 70, p[1] - 24, 140, 48, p[2], { fill: p[3], color: p[4], bold: true, size: 14 }); });
    h += g.arrow(cx + 70, cy - 105, cx + 110, cy - 26, { arrow: "c" }) + g.arrow(cx + 110, cy + 26, cx + 70, cy + 105, { arrow: "c" }) + g.arrow(cx - 70, cy + 105, cx - 110, cy + 26, { arrow: "c" }) + g.arrow(cx - 110, cy - 26, cx - 70, cy - 105, { arrow: "c" });
    h += g.monitor(cx, cy, 1.6);
    return h + g.lines(610, 378, ["Controls (Button, TextBox, Label) are objects", "with properties, methods and events;", "the user decides the order of actions"], { size: 13 }, 20);
  } });
})();

// Diagrams for AS 2: Fundamentals of Digital Technology (canvas 800 x 450)

Diagrams.add("FD01", { cap: "173 converted to binary using place values, split into nibbles to give hexadecimal AD, and stored digit by digit in binary-coded decimal", draw: function (g) {
  var P = g.P, h = "", pv = [128, 64, 32, 16, 8, 4, 2, 1], bits = "10101101";
  h += g.text(400, 24, "Denary 173 in binary, hexadecimal and BCD", { bold: true, size: 18 });
  pv.forEach(function (v, i) {
    var x = 80 + i * 82;
    h += g.box(x, 48, 72, 38, String(v), { fill: P.pcb, color: P.pcbInk, bold: true, size: 17 });
    h += g.box(x, 92, 72, 50, bits[i], { fill: bits[i] === "1" ? P.copperSoft : P.card, stroke: bits[i] === "1" ? P.copper : P.line, mono: true, bold: true, size: 28 });
  });
  h += g.path("M84,152 L84,162 L386,162 L386,152", { stroke: P.copper, sw: 2 }) + g.path("M412,152 L412,162 L714,162 L714,152", { stroke: P.ok, sw: 2 });
  h += g.text(235, 184, "1010 = 10 = A", { mono: true, bold: true, size: 17, fill: P.copper }) + g.text(563, 184, "1101 = 13 = D", { mono: true, bold: true, size: 17, fill: P.ok });
  h += g.text(400, 222, "128 + 32 + 8 + 4 + 1 = 173   →   10101101   →   AD", { bold: true, size: 19 });
  h += g.text(60, 282, "BCD:", { anchor: "start", bold: true, size: 17 });
  [["1", "0001"], ["7", "0111"], ["3", "0011"]].forEach(function (d, i) {
    var x = 150 + i * 150;
    h += g.box(x, 262, 120, 44, d[1], { fill: P.warnSoft, stroke: P.warn, mono: true, bold: true, size: 20 }) + g.text(x + 60, 322, "digit " + d[0], { size: 14, fill: P.muted });
  });
  h += g.lines(675, 274, ["one nibble", "per denary digit"], { size: 14, fill: P.muted }, 20);
  return h + g.lines(400, 370, ["Hex: one digit per nibble – shorter and easier for people to read than binary.", "BCD: used for displays and exact decimal values; codes 1010–1111 are never used."], { size: 15 }, 26);
} });

Diagrams.add("FD02", { cap: "Forming -19 in 8-bit two's complement by inverting the bits of +19 and adding 1, and an example of overflow when two positive numbers give a negative result", draw: function (g) {
  var P = g.P, h = "", heads = ["−128", "64", "32", "16", "8", "4", "2", "1"], x0 = 250, cw = 62;
  h += g.text(400, 22, "Two's complement: the MSB is worth −128", { bold: true, size: 18 });
  heads.forEach(function (v, i) { h += g.box(x0 + i * cw, 40, 56, 34, v, { fill: i === 0 ? P.bad : P.pcb, color: P.pcbInk, bold: true, size: 15 }); });
  var rows = [["+19", "00010011", P.card], ["Invert every bit", "11101100", P.soft], ["Add 1  →  −19", "11101101", P.copperSoft]];
  rows.forEach(function (r, k) {
    var y = 84 + k * 50;
    h += g.text(40, y + 20, r[0], { anchor: "start", bold: k === 2, size: 16 });
    r[1].split("").forEach(function (b, i) { h += g.box(x0 + i * cw, y, 56, 40, b, { fill: r[2], stroke: P.line, mono: true, bold: true, size: 22 }); });
  });
  h += g.text(400, 250, "Check: −128 + 64 + 32 + 8 + 4 + 1 = −19   ·   Range in 8 bits: −128 to +127", { size: 15, fill: P.muted });
  h += g.rect(40, 278, 720, 150, { fill: P.badSoft, stroke: P.bad, r: 10 });
  h += g.text(60, 302, "Overflow", { anchor: "start", bold: true, size: 17, fill: P.bad });
  h += g.lines(400, 336, ["  01110000   (112)", "+ 00100000   ( 32)", "= 10010000   (reads as −112)"], { mono: true, size: 17, anchor: "end" }, 26);
  return h + g.lines(430, 336, ["Two positives gave a negative:", "the true answer 144 is", "too big for +127, so overflow."], { anchor: "start", size: 15 }, 26);
} });

Diagrams.add("FD03", { cap: "A floating-point number with an 8-bit two's complement mantissa and 4-bit exponent; the exponent of 3 moves the binary point three places right to give 6.5", draw: function (g) {
  var P = g.P, h = "", m = "01101000", e = "0011";
  h += g.text(400, 22, "Floating point: mantissa × 2^exponent", { bold: true, size: 18 });
  h += g.text(250, 56, "Mantissa (8 bits)", { bold: true, size: 15, fill: P.copper }) + g.text(640, 56, "Exponent (4 bits)", { bold: true, size: 15, fill: P.ok });
  m.split("").forEach(function (b, i) { h += g.box(70 + i * 46, 72, 40, 46, b, { fill: P.copperSoft, stroke: P.copper, mono: true, bold: true, size: 22 }); });
  h += g.circle(113, 112, 5, { fill: P.ink }) + g.text(113, 136, "binary point", { size: 13, fill: P.muted });
  e.split("").forEach(function (b, i) { h += g.box(550 + i * 46, 72, 40, 46, b, { fill: P.okSoft, stroke: P.ok, mono: true, bold: true, size: 22 }); });
  h += g.text(640, 140, "0011 = +3", { bold: true, size: 15 });
  h += g.text(70, 178, "Mantissa 0.1101000 · exponent +3 → move the point 3 places right", { anchor: "start", size: 15 });
  h += g.text(400, 216, "0110.1000  =  4 + 2 + 0.5  =  6.5", { mono: true, bold: true, size: 22, fill: P.copper });
  h += g.box(60, 252, 330, 80, ["Normalised:", "positive starts 0.1 · negative starts 1.0"], { fill: P.soft, size: 15, lh: 24 });
  h += g.box(410, 252, 330, 80, ["Shift mantissa left to normalise,", "subtract 1 from exponent per shift"], { fill: P.soft, size: 15, lh: 24 });
  h += g.box(60, 350, 330, 70, ["More mantissa bits", "→ greater precision"], { fill: P.copperSoft, size: 15, lh: 22, bold: true });
  return h + g.box(410, 350, 330, 70, ["More exponent bits", "→ greater range"], { fill: P.okSoft, size: 15, lh: 22, bold: true });
} });

Diagrams.add("FD04", { cap: "An even parity bit added to the ASCII code for C, and a modulus-11 check digit calculation for an ISBN-10", draw: function (g) {
  var P = g.P, h = "", d = "1000011";
  h += g.text(200, 24, "Even parity", { bold: true, size: 18 });
  h += g.box(30, 50, 44, 46, "1", { fill: P.warn, color: P.card, mono: true, bold: true, size: 22 });
  d.split("").forEach(function (b, i) { h += g.box(80 + i * 42, 50, 38, 46, b, { fill: b === "1" ? P.copperSoft : P.card, stroke: P.line, mono: true, bold: true, size: 22 }); });
  h += g.text(52, 114, "parity", { size: 13, fill: P.warn, bold: true }) + g.text(226, 114, "'C' = 1000011 (7-bit ASCII)", { size: 13, fill: P.muted });
  h += g.lines(200, 150, ["Data has three 1s, so the parity bit", "is 1 to make the total even (four).", "Receiver recounts: odd total = error.", "Two flipped bits are NOT detected."], { size: 15 }, 24);
  h += g.line(400, 30, 400, 420, { stroke: P.line, dash: "5 5" });
  h += g.text(600, 24, "Modulus-11 check digit", { bold: true, size: 18 });
  var digits = "030640615", wts = [10, 9, 8, 7, 6, 5, 4, 3, 2];
  h += g.text(420, 60, "digit", { anchor: "start", size: 13, fill: P.muted }) + g.text(420, 92, "weight", { anchor: "start", size: 13, fill: P.muted });
  digits.split("").forEach(function (c, i) { var x = 476 + i * 33; h += g.box(x, 44, 30, 30, c, { fill: P.pcb, color: P.pcbInk, mono: true, bold: true, size: 16 }) + g.text(x + 15, 92, String(wts[i]), { size: 14, mono: true }); });
  h += g.lines(600, 140, ["Sum of digit × weight = 130", "130 ÷ 11 = 11 remainder 9", "Check digit = 11 − 9 = 2"], { size: 15 }, 28);
  h += g.box(450, 240, 300, 50, "ISBN 0-306-40615-2", { fill: P.okSoft, stroke: P.ok, mono: true, bold: true, size: 18 });
  return h + g.lines(600, 330, ["Verify: include the check digit", "with weight 1 → 132 = 12 × 11 ✓", "Catches wrong and swapped digits"], { size: 15 }, 26);
} });

Diagrams.add("FD05", { cap: "A bitmap as a grid of pixels with the image file-size formula, and a sound wave sampled at regular intervals with the sound file-size formula", draw: function (g) {
  var P = g.P, h = "", i, j, c = 22, x0 = 60, y0 = 60;
  h += g.text(200, 24, "Bitmap image", { bold: true, size: 18 }) + g.text(600, 24, "Sampled sound", { bold: true, size: 18 });
  var cols = [P.card, P.copperSoft, P.copper, P.ok];
  for (i = 0; i < 8; i++) for (j = 0; j < 12; j++) { var k = (i * 3 + j * 2 + (i * j) % 3) % 4; h += '<rect x="' + (x0 + j * c) + '" y="' + (y0 + i * c) + '" width="' + c + '" height="' + c + '" fill="' + cols[k] + '" stroke="' + P.line + '" stroke-width="1"/>'; }
  h += g.text(192, 252, "resolution: 12 × 8 pixels", { size: 14, fill: P.muted }) + g.text(192, 274, "colour depth: 2 bits → 4 colours", { size: 14, fill: P.muted });
  h += g.box(30, 300, 340, 56, ["size (bits) = width × height", "× colour depth"], { fill: P.copperSoft, size: 15, lh: 22, bold: true });
  h += g.text(200, 380, "+ metadata: width, height, colour depth", { size: 14 });
  h += g.line(430, 170, 770, 170, { stroke: P.line });
  var d = "M430,170", pts = [];
  for (i = 0; i <= 68; i++) { var x = 430 + i * 5, y = 170 - 80 * Math.sin(i / 68 * Math.PI * 3); d += " L" + x + "," + y.toFixed(1); }
  h += g.path(d, { stroke: P.pcb, sw: 2.5 });
  for (i = 0; i < 18; i++) { var sx = 440 + i * 19, sy = 170 - 80 * Math.sin((sx - 430) / 340 * Math.PI * 3); h += g.line(sx, 170, sx, sy, { stroke: P.copper, sw: 2 }) + g.circle(sx, sy, 4, { fill: P.copper }); }
  h += g.text(600, 272, "each orange line = one sample (amplitude stored in binary)", { size: 13, fill: P.muted });
  h += g.box(430, 300, 340, 56, ["size (bits) = sample rate × resolution", "× channels × seconds"], { fill: P.okSoft, size: 15, lh: 22, bold: true });
  return h + g.text(600, 380, "CD quality: 44 100 Hz, 16-bit, stereo", { size: 14 }) + g.text(400, 425, "Divide bits by 8 for bytes, then by 1024 for KB and again for MB", { size: 15, bold: true, fill: P.muted });
} });

Diagrams.add("FD06", { cap: "Data becomes information when it is processed and given context, and information becomes knowledge when it is interpreted and applied; validation and verification compared", draw: function (g) {
  var P = g.P, h = "";
  h += g.box(40, 40, 200, 110, ["DATA", "18, 21, 24", "raw facts, no context"], { fill: P.soft, size: 15, lh: 26 });
  h += g.box(300, 40, 200, 110, ["INFORMATION", "Mock marks (%) for", "Ava, Ben, Cara"], { fill: P.copperSoft, size: 15, lh: 26 });
  h += g.box(560, 40, 200, 110, ["KNOWLEDGE", "All below 30%: arrange", "extra revision classes"], { fill: P.okSoft, size: 15, lh: 26 });
  h += g.arrow(242, 95, 298, 95, { arrow: "c" }) + g.arrow(502, 95, 558, 95, { arrow: "g" });
  h += g.text(270, 172, "processed + context", { size: 13, fill: P.copper, bold: true }) + g.text(530, 172, "interpreted + applied", { size: 13, fill: P.ok, bold: true });
  h += g.text(400, 210, "Good information is accurate, relevant, up to date, complete and at the right level of detail", { size: 15 });
  h += g.rect(40, 240, 340, 180, { fill: P.card, stroke: P.pcb, sw: 2, r: 10 }) + g.text(210, 264, "Validation", { bold: true, size: 18, fill: P.pcb });
  h += g.lines(60, 298, ["Is the data reasonable?", "Automatic, by the software", "Presence, type, range, length,", "format, lookup, check digit"], { anchor: "start", size: 15 }, 28);
  h += g.rect(420, 240, 340, 180, { fill: P.card, stroke: P.copper, sw: 2, r: 10 }) + g.text(590, 264, "Verification", { bold: true, size: 18, fill: P.copper });
  return h + g.lines(440, 298, ["Was it copied accurately?", "Compared with the source", "Double entry, visual check,", "parity / checksum in transfer"], { anchor: "start", size: 15 }, 28);
} });

Diagrams.add("FD07", { cap: "Batch processing collects transactions and updates the master file later; transaction processing updates it immediately with record locking; real-time processing uses a feedback loop from sensors", draw: function (g) {
  var P = g.P, h = "";
  h += g.text(30, 30, "Batch", { anchor: "start", bold: true, size: 17, fill: P.pcb });
  h += g.box(30, 46, 150, 56, ["Transactions", "collected"], { fill: P.soft, size: 14, lh: 20 }) + g.arrow(182, 74, 214, 74);
  h += g.box(216, 46, 150, 56, ["Validated", "and sorted"], { fill: P.soft, size: 14, lh: 20 }) + g.arrow(368, 74, 400, 74);
  h += g.box(402, 46, 170, 56, ["Update master file", "(overnight)"], { fill: P.copperSoft, size: 14, lh: 20 }) + g.arrow(574, 74, 606, 74);
  h += g.box(608, 46, 160, 56, ["Bills, payslips"], { fill: P.okSoft, size: 14 });
  h += g.text(30, 160, "Online / transaction", { anchor: "start", bold: true, size: 17, fill: P.pcb });
  h += g.monitor(80, 210, 1.4) + g.monitor(80, 270, 1.4) + g.text(80, 304, "many users", { size: 13, fill: P.muted });
  h += g.arrow(110, 210, 300, 236) + g.arrow(110, 270, 300, 248);
  h += g.box(302, 206, 200, 70, ["Master file", "updated at once"], { fill: P.copperSoft, size: 15, lh: 22 });
  h += g.box(540, 206, 228, 70, ["Record locked while", "one user updates it"], { fill: P.warnSoft, stroke: P.warn, size: 15, lh: 22 });
  h += g.text(30, 340, "Real-time", { anchor: "start", bold: true, size: 17, fill: P.pcb });
  h += g.box(30, 356, 150, 56, "Sensor", { fill: P.soft }) + g.arrow(182, 384, 260, 384);
  h += g.box(262, 356, 200, 56, ["Process within", "milliseconds"], { fill: P.copperSoft, size: 14, lh: 20 }) + g.arrow(464, 384, 542, 384);
  h += g.box(544, 356, 150, 56, "Actuator", { fill: P.okSoft });
  return h + g.path("M694,384 L740,384 L740,442 L105,442 L105,414", { stroke: P.ok, sw: 2, arrow: "g" }) + g.text(420, 427, "feedback: output affects the next input", { size: 13, fill: P.ok, bold: true });
} });

Diagrams.add("FD08", { cap: "The Von Neumann architecture: a CPU containing the control unit, ALU, clock and registers, connected to a single main memory holding instructions and data by the address, data and control buses", draw: function (g) {
  var P = g.P, h = "";
  h += g.rect(30, 30, 430, 300, { fill: P.card, stroke: P.pcb, sw: 2.5, r: 10 }) + g.text(245, 50, "CPU", { bold: true, size: 18, fill: P.pcb });
  h += g.box(50, 70, 180, 60, ["Control unit", "decodes, sends signals"], { fill: P.pcb, color: P.pcbInk, size: 14, lh: 20 });
  h += g.box(260, 70, 180, 60, ["ALU", "arithmetic and logic"], { fill: P.copper, color: P.card, size: 14, lh: 20 });
  h += g.box(50, 140, 180, 30, "Clock", { fill: P.soft, size: 14 });
  var regs = [["PC", "next instruction address"], ["MAR", "address to access"], ["MDR", "data read / to write"], ["CIR", "current instruction"], ["ACC", "ALU results"]];
  regs.forEach(function (r, i) { var y = 182 + i * 28; h += g.box(50, y, 64, 24, r[0], { fill: P.copperSoft, mono: true, bold: true, size: 14 }) + g.text(124, y + 12, r[1], { anchor: "start", size: 13 }); });
  h += g.text(345, 160, "Registers: tiny,", { size: 13, fill: P.muted }) + g.text(345, 178, "very fast storage", { size: 13, fill: P.muted });
  h += g.rect(600, 30, 170, 300, { fill: P.card, stroke: P.copper, sw: 2.5, r: 10 }) + g.text(685, 52, "Main memory", { bold: true, size: 16, fill: P.copper });
  ["0  LDA 20", "1  ADD 21", "2  STA 22", "…", "20  7", "21  5", "22  12"].forEach(function (t, i) { h += g.box(615, 70 + i * 34, 140, 28, t, { fill: i < 3 ? P.copperSoft : i === 3 ? P.card : P.okSoft, mono: true, size: 14 }); });
  h += g.text(685, 316, "instructions + data", { size: 13, fill: P.muted });
  h += g.path("M245,332 L245,352 L594,352", { stroke: P.copper, sw: 2.5, arrow: "c" }) + g.text(420, 340, "address bus – one way (CPU → memory)", { size: 14, bold: true, fill: P.copper });
  h += g.arrow(200, 396, 200, 334, { stroke: P.ok, sw: 2.5, arrow: "g" }) + g.arrow(200, 396, 594, 396, { stroke: P.ok, sw: 2.5, arrow: "g" }) + g.text(420, 384, "data bus – two way", { size: 14, bold: true, fill: P.ok });
  h += g.path("M100,332 L100,436 L685,436 L685,334", { stroke: P.muted, sw: 2, dash: "6 4" }) + g.text(420, 424, "control bus: read, write, clock, interrupt", { size: 14, fill: P.muted, bold: true });
  return h + g.text(470, 300, "shared bus →", { size: 13, fill: P.bad, anchor: "start" }) + g.text(470, 318, "bottleneck", { size: 13, fill: P.bad, anchor: "start", bold: true });
} });

Diagrams.add("FD09", { cap: "The fetch-decode-execute cycle shown as a loop with the register transfers at each stage, and the factors that affect processor performance", draw: function (g) {
  var P = g.P, h = "";
  h += g.box(40, 40, 300, 150, ["FETCH", "MAR ← [PC]", "MDR ← [Memory[MAR]]", "PC ← [PC] + 1", "CIR ← [MDR]"], { fill: P.copperSoft, stroke: P.copper, size: 15, lh: 26, mono: false });
  h += g.box(460, 40, 300, 150, ["DECODE", "Control unit splits [CIR]", "into opcode + operand", "and works out what to do"], { fill: P.soft, stroke: P.pcb, size: 15, lh: 26 });
  h += g.box(250, 240, 300, 110, ["EXECUTE", "e.g. ADD 21: MAR ← 21,", "MDR ← [Memory[21]],", "ACC ← [ACC] + [MDR]"], { fill: P.okSoft, stroke: P.ok, size: 15, lh: 24 });
  h += g.arrow(342, 115, 456, 115, { arrow: "c" }) + g.arrow(610, 192, 520, 238, { arrow: "c" }) + g.arrow(248, 300, 150, 194, { arrow: "c" });
  h += g.text(140, 250, "check for", { size: 13, fill: P.muted }) + g.text(140, 268, "interrupts, repeat", { size: 13, fill: P.muted });
  var f = [["Clock speed", "more cycles / s"], ["Cores", "parallel work"], ["Cache", "fewer RAM trips"], ["Word length", "bits per operation"], ["Bus width", "bits per transfer"]];
  f.forEach(function (x, i) { var bx = 30 + i * 150; h += g.box(bx, 372, 140, 60, [x[0], x[1]], { fill: P.pcb, color: P.pcbInk, size: 14, lh: 20 }); });
  return h + g.text(400, 362, "Performance factors", { size: 13, bold: true, fill: P.muted });
} });

Diagrams.add("FD10", { cap: "The memory hierarchy from registers to magnetic and optical storage: faster and more expensive at the top, larger at the bottom, with virtual memory linking RAM and secondary storage", draw: function (g) {
  var P = g.P, h = "";
  var lv = [["Registers", P.bad, "bytes"], ["Cache (L1–L3)", P.copper, "MB"], ["RAM", P.warn, "GB · volatile"], ["SSD (solid state)", P.ok, "100s GB–TB"], ["HDD / tape (magnetic) · optical", P.pcb, "TB · cheapest per GB"]];
  lv.forEach(function (l, i) {
    var w = 160 + i * 100, x = 300 - w / 2 + 40, y = 40 + i * 72;
    h += g.rect(x, y, w, 62, { fill: l[1], r: 6 }) + g.text(x + w / 2, y + 22, l[0], { bold: true, size: 15, fill: P.card }) + g.text(x + w / 2, y + 44, l[2], { size: 13, fill: P.card });
  });
  h += g.arrow(30, 400, 30, 50, { arrow: "c" }) + g.text(14, 225, "faster, costlier", { size: 14, rot: -90, fill: P.copper, bold: true });
  h += g.text(340, 425, "bigger capacity, non-volatile at the bottom", { size: 14, fill: P.muted });
  h += g.rect(634, 160, 156, 170, { fill: P.card, stroke: P.warn, sw: 2, r: 10, dash: "6 4" });
  h += g.lines(712, 182, ["Virtual memory", "RAM full → pages", "moved to disk,", "swapped back", "when needed.", "Too much = thrashing"], { size: 13 }, 25);
  h += g.arrow(632, 215, 524, 215, { arrow: "c" }) + g.arrow(640, 330, 622, 340, { arrow: "c" });
  return h + g.box(634, 40, 156, 100, ["ROM", "non-volatile", "boot program"], { fill: P.soft, stroke: P.pcb, size: 14, lh: 22 });
} });

Diagrams.add("FD11", { cap: "Von Neumann architecture with one shared memory and bus compared with Harvard architecture with separate instruction and data memories, plus RISC and CISC and GPU summaries", draw: function (g) {
  var P = g.P, h = "";
  h += g.text(200, 24, "Von Neumann", { bold: true, size: 17 }) + g.text(600, 24, "Harvard", { bold: true, size: 17 });
  h += g.box(120, 44, 160, 50, "CPU", { fill: P.pcb, color: P.pcbInk, bold: true });
  h += g.line(200, 96, 200, 150, { stroke: P.copper, sw: 4 }) + g.text(260, 124, "one bus", { size: 13, fill: P.copper, bold: true });
  h += g.box(100, 152, 200, 60, ["Memory", "instructions + data"], { fill: P.copperSoft, size: 14, lh: 20 });
  h += g.box(520, 44, 160, 50, "CPU", { fill: P.pcb, color: P.pcbInk, bold: true });
  h += g.line(560, 96, 500, 150, { stroke: P.copper, sw: 4 }) + g.line(640, 96, 700, 150, { stroke: P.ok, sw: 4 });
  h += g.box(420, 152, 160, 60, ["Instruction", "memory"], { fill: P.copperSoft, size: 14, lh: 20 }) + g.box(620, 152, 160, 60, ["Data", "memory"], { fill: P.okSoft, size: 14, lh: 20 });
  h += g.text(200, 232, "fetched in turn: bottleneck", { size: 13, fill: P.muted }) + g.text(600, 232, "fetched at the same time: embedded systems", { size: 13, fill: P.muted });
  h += g.line(400, 20, 400, 240, { stroke: P.line, dash: "5 5" });
  h += g.box(30, 262, 360, 100, ["RISC: few simple instructions,", "1 cycle each, easy to pipeline,", "low power (ARM phones)"], { fill: P.okSoft, size: 15, lh: 24 });
  h += g.box(410, 262, 360, 100, ["CISC: many complex instructions,", "several cycles, shorter programs,", "complex hardware (x86 PCs)"], { fill: P.copperSoft, size: 15, lh: 24 });
  h += g.text(60, 400, "GPU", { anchor: "start", bold: true, size: 16 });
  for (var i = 0; i < 16; i++) h += g.rect(110 + i * 14, 392, 10, 16, { fill: P.pcb, r: 2 });
  return h + g.text(345, 400, "thousands of simple cores: same operation on many data items (SIMD)", { anchor: "start", size: 13 }) + g.text(400, 432, "Multicore CPU: a few powerful cores; speed-up limited by sequential parts of a program", { size: 14, fill: P.muted });
} });

Diagrams.add("FD12", { cap: "Six types of user interface with an example user for each, and the key HCI design principles", draw: function (g) {
  var P = g.P, h = "";
  var t = [["Command line", "technician scripting", P.pcb], ["Menu-driven", "ticket machine", P.copper], ["GUI / WIMP", "office worker", P.ok], ["Natural language", "chatbot, search", P.warn], ["Voice", "driver, surgeon", P.bad], ["Touch", "phone, kiosk", P.pcb]];
  t.forEach(function (x, i) {
    var cx = 30 + (i % 3) * 252, cy = 30 + Math.floor(i / 3) * 120;
    h += g.rect(cx, cy, 236, 104, { fill: P.card, stroke: x[2], sw: 2.5, r: 10 }) + g.text(cx + 118, cy + 34, x[0], { bold: true, size: 17, fill: x[2] }) + g.text(cx + 118, cy + 68, "suits: " + x[1], { size: 14 });
  });
  h += g.text(400, 284, "HCI design principles", { bold: true, size: 17 });
  var p = ["Consistency", "Feedback", "Recognition not recall", "Error prevention", "Accessibility"];
  p.forEach(function (s, i) { h += g.box(20 + i * 154, 304, 146, 50, s === "Recognition not recall" ? ["Recognition", "not recall"] : s, { fill: P.soft, size: 14, bold: true, lh: 18 }); });
  return h + g.lines(400, 386, ["Accessibility: alt text and screen readers, captions, keyboard access,", "large targets, high contrast, plain language – helps everyone"], { size: 15 }, 24);
} });

Diagrams.add("FD13", { cap: "Run-length encoding of a row of pixels into 6W 3B 4W, and a comparison of lossless and lossy compression with example formats", draw: function (g) {
  var P = g.P, h = "", row = "WWWWWWBBBWWWW";
  h += g.text(400, 24, "Run-length encoding (lossless)", { bold: true, size: 18 });
  row.split("").forEach(function (c, i) { h += g.rect(50 + i * 54, 44, 50, 50, { fill: c === "W" ? P.card : P.ink, stroke: P.line, r: 2 }) + g.text(75 + i * 54, 69, c, { mono: true, bold: true, size: 16, fill: c === "W" ? P.muted : P.card }); });
  h += g.path("M52,104 L52,114 L372,114 L372,104", { stroke: P.copper, sw: 2 }) + g.path("M374,104 L374,114 L534,114 L534,104", { stroke: P.copper, sw: 2 }) + g.path("M536,104 L536,114 L746,114 L746,104", { stroke: P.copper, sw: 2 });
  h += g.text(212, 134, "6W", { mono: true, bold: true, size: 20, fill: P.copper }) + g.text(454, 134, "3B", { mono: true, bold: true, size: 20, fill: P.copper }) + g.text(641, 134, "4W", { mono: true, bold: true, size: 20, fill: P.copper });
  h += g.text(400, 170, "13 values stored as 6 characters – but ABCD would become 1A1B1C1D (bigger!)", { size: 15 });
  h += g.box(40, 196, 720, 44, "Dictionary: 'the cat and the dog' → 1 = the, 2 = cat, 3 = and, 4 = dog → 1 2 3 1 4", { fill: P.soft, size: 15 });
  h += g.rect(40, 260, 350, 170, { fill: P.okSoft, stroke: P.ok, sw: 2, r: 10 }) + g.text(215, 284, "Lossless", { bold: true, size: 18, fill: P.ok });
  h += g.lines(60, 316, ["Original rebuilt exactly", "Text, code, spreadsheets, X-rays", "ZIP, PNG, FLAC, RLE"], { anchor: "start", size: 15 }, 30);
  h += g.rect(410, 260, 350, 170, { fill: P.copperSoft, stroke: P.copper, sw: 2, r: 10 }) + g.text(585, 284, "Lossy", { bold: true, size: 18, fill: P.copper });
  return h + g.lines(430, 316, ["Data permanently removed", "Photos, music, video streaming", "JPEG, MP3, AAC, MP4"], { anchor: "start", size: 15 }, 30);
} });

Diagrams.add("FD14", { cap: "The operating system sits between applications and hardware and provides memory management, scheduling, interrupt handling, file and device management and security; an interrupt saves registers, runs the service routine and restores them", draw: function (g) {
  var P = g.P, h = "";
  h += g.box(30, 30, 420, 44, "User", { fill: P.soft, bold: true });
  h += g.box(30, 84, 420, 44, "Application software", { fill: P.okSoft, bold: true });
  h += g.rect(30, 138, 420, 180, { fill: P.pcb, r: 8 }) + g.text(240, 158, "Operating system", { bold: true, size: 17, fill: P.pcbInk });
  var f = ["Memory management", "Process scheduling", "Interrupt handling", "File management", "Device management", "Security"];
  f.forEach(function (s, i) { var x = 44 + (i % 2) * 200, y = 176 + Math.floor(i / 2) * 46; h += g.box(x, y, 192, 38, s, { fill: P.card, size: 14 }); });
  h += g.box(30, 328, 420, 44, "Hardware: CPU, memory, storage, peripherals", { fill: P.copperSoft, bold: true, size: 15 });
  h += g.text(240, 400, "Drivers translate OS requests for each device", { size: 14, fill: P.muted });
  h += g.text(620, 30, "Handling an interrupt", { bold: true, size: 16 });
  var st = ["Interrupt signal arrives", "Checked at end of FDE cycle", "Higher priority? Save registers to stack", "Run interrupt service routine", "Restore registers, resume task"];
  st.forEach(function (s, i) { var y = 50 + i * 74; h += g.box(480, y, 290, 54, s, { fill: i === 3 ? P.warnSoft : P.soft, size: 14 }) + g.num(480, y, i + 1); if (i < 4) h += g.arrow(625, y + 56, 625, y + 72); });
  return h;
} });

Diagrams.add("FD15", { cap: "The stages of compilation from source code to object code, and how C# is compiled to Common Intermediate Language and then just-in-time compiled to machine code", draw: function (g) {
  var P = g.P, h = "";
  h += g.text(400, 24, "Stages of compilation", { bold: true, size: 18 });
  var s = [["Source", "code"], ["Lexical", "analysis"], ["Syntax", "analysis"], ["Code", "generation"], ["Optim-", "isation"], ["Object", "code"]];
  s.forEach(function (x, i) { var bx = 20 + i * 130; h += g.box(bx, 46, 112, 64, x, { fill: i === 0 || i === 5 ? P.copperSoft : P.pcb, color: i === 0 || i === 5 ? P.ink : P.pcbInk, size: 15, lh: 22, bold: true }); if (i < 5) h += g.arrow(bx + 113, 78, bx + 129, 78); });
  h += g.lines(206, 136, ["tokens,", "symbol table"], { size: 13, fill: P.muted }, 18) + g.lines(336, 136, ["grammar,", "parse tree"], { size: 13, fill: P.muted }, 18) + g.lines(466, 136, ["machine or", "intermediate code"], { size: 13, fill: P.muted }, 18) + g.lines(596, 136, ["faster,", "smaller"], { size: 13, fill: P.muted }, 18);
  h += g.text(400, 196, "C# on .NET", { bold: true, size: 18 });
  h += g.box(30, 216, 150, 60, ["C# source", ".cs"], { fill: P.soft, size: 15, lh: 22 }) + g.arrow(182, 246, 228, 246);
  h += g.box(230, 216, 140, 60, ["C# compiler", "(build)"], { fill: P.pcb, color: P.pcbInk, size: 15, lh: 22 }) + g.arrow(372, 246, 418, 246);
  h += g.box(420, 216, 150, 60, ["CIL", "intermediate"], { fill: P.warnSoft, stroke: P.warn, size: 15, lh: 22 }) + g.arrow(572, 246, 608, 246);
  h += g.box(610, 216, 160, 60, ["JIT → native", "machine code"], { fill: P.okSoft, size: 15, lh: 22 });
  h += g.text(495, 296, "portable: runs anywhere .NET is installed", { size: 13, fill: P.muted });
  var t = [["Assembler", "assembly → machine code"], ["Compiler", "whole program → executable"], ["Interpreter", "line by line, every run"]];
  t.forEach(function (x, i) { var bx = 30 + i * 250; h += g.box(bx, 330, 236, 90, [x[0], x[1]], { fill: P.card, stroke: P.line, sw: 1.5, size: 15, lh: 26 }); });
  return h;
} });

Diagrams.add("FD16", { cap: "Loading a web page: the browser asks DNS for the IP address of the domain name, then sends an HTTPS request to the web server, which returns the page", draw: function (g) {
  var P = g.P, h = "";
  h += g.rect(30, 150, 200, 150, { fill: P.card, stroke: P.pcb, sw: 2, r: 10 }) + g.monitor(130, 200, 2) + g.text(130, 262, "Browser (client)", { bold: true, size: 15 });
  h += g.text(130, 284, "www.translink.co.uk", { size: 13, mono: true, fill: P.muted });
  h += g.box(520, 30, 250, 100, ["DNS servers", "root → .uk → co.uk", "→ translink.co.uk"], { fill: P.warnSoft, stroke: P.warn, size: 15, lh: 24 });
  h += g.box(520, 300, 250, 110, ["Web server", "203.0.113.25", "HTML, CSS, images"], { fill: P.okSoft, stroke: P.ok, size: 15, lh: 26 });
  h += g.arrow(232, 170, 516, 70, { arrow: "c" }) + g.num(360, 112, 1) + g.text(380, 104, "domain name?", { anchor: "start", size: 14 });
  h += g.arrow(516, 104, 236, 196, { arrow: "c" }) + g.num(400, 165, 2) + g.text(420, 172, "IP address", { anchor: "start", size: 14 });
  h += g.arrow(232, 260, 516, 330, { arrow: "g" }) + g.num(330, 278, 3) + g.text(350, 270, "HTTPS GET request", { anchor: "start", size: 14 });
  h += g.arrow(516, 384, 232, 292, { arrow: "g" }) + g.num(330, 362, 4) + g.text(350, 378, "200 OK + page", { anchor: "start", size: 14 });
  h += g.box(30, 330, 200, 100, ["5. Browser renders", "page; cookie sent", "back next time"], { fill: P.soft, size: 14, lh: 24 });
  return h + g.text(130, 60, "HTTPS = HTTP + TLS", { size: 15, bold: true, fill: P.pcb }) + g.lines(130, 88, ["encrypted, server", "verified by certificate"], { size: 13, fill: P.muted }, 18);
} });

Diagrams.add("FD17", { cap: "A dynamic web page: client-side script runs in the browser, while the server-side script on the web server queries the database server and builds the HTML", draw: function (g) {
  var P = g.P, h = "";
  h += g.rect(20, 60, 230, 270, { fill: P.card, stroke: P.copper, sw: 2.5, r: 10 }) + g.text(135, 84, "Browser", { bold: true, size: 17, fill: P.copper });
  h += g.box(36, 104, 198, 64, ["HTML + CSS", "displayed"], { fill: P.soft, size: 14, lh: 20 });
  h += g.box(36, 180, 198, 130, ["Client-side script", "(JavaScript)", "instant validation,", "interactivity", "visible, can be bypassed"], { fill: P.copperSoft, size: 14, lh: 22 });
  h += g.rect(290, 60, 230, 270, { fill: P.card, stroke: P.pcb, sw: 2.5, r: 10 }) + g.text(405, 84, "Web server", { bold: true, size: 17, fill: P.pcb });
  h += g.box(306, 104, 198, 206, ["Server-side script", "(e.g. C# ASP.NET)", "re-validates input", "runs SQL queries", "builds HTML", "hidden from users"], { fill: P.pcb, color: P.pcbInk, size: 14, lh: 26 });
  h += g.path("M600,100 a70,20 0 0,0 140,0 a70,20 0 0,0 -140,0 v150 a70,20 0 0,0 140,0 v-150", { fill: P.okSoft, stroke: P.ok, sw: 2 });
  h += g.lines(670, 160, ["Database", "server", "products,", "bookings"], { size: 14, bold: false }, 22);
  h += g.arrow(252, 130, 286, 130, { arrow: "c" }) + g.arrow(286, 160, 252, 160, { arrow: "c" });
  h += g.arrow(522, 150, 596, 150, { arrow: "g" }) + g.arrow(596, 200, 522, 200, { arrow: "g" });
  h += g.text(559, 136, "SQL", { size: 13, fill: P.ok, bold: true }) + g.text(559, 218, "rows", { size: 13, fill: P.ok, bold: true });
  h += g.text(270, 360, "request ⇄ response", { size: 13, fill: P.muted });
  return h + g.box(20, 380, 760, 58, ["Web app: runs in a browser from a server, one version for all devices, instant updates", "Native app: installed for one OS, faster, works offline, full access to device hardware"], { fill: P.soft, size: 14, lh: 22 });
} });

Diagrams.add("FD18", { cap: "HTML provides structure and content, an external CSS style sheet provides presentation, and the browser combines them into the rendered page", draw: function (g) {
  var P = g.P, h = "";
  h += g.rect(20, 30, 270, 300, { fill: P.card, stroke: P.pcb, sw: 2, r: 8 }) + g.text(155, 50, "index.html – structure", { bold: true, size: 15, fill: P.pcb });
  h += g.lines(34, 80, ["<h1>Erne Rowing</h1>", "<p class=\"notice\">", "  Training Sat 9am</p>", "<img src=\"boat.jpg\"", "     alt=\"Rowers\">", "<a href=\"join.html\">", "  Join</a>", "<link rel=\"stylesheet\"", "      href=\"style.css\">"], { anchor: "start", mono: true, size: 13 }, 26);
  h += g.rect(310, 30, 220, 300, { fill: P.card, stroke: P.copper, sw: 2, r: 8 }) + g.text(420, 50, "style.css – presentation", { bold: true, size: 15, fill: P.copper });
  h += g.lines(324, 84, ["h1 {", "  color: #11503e;", "}", ".notice {", "  background: gold;", "  padding: 10px;", "}"], { anchor: "start", mono: true, size: 13 }, 28);
  h += g.text(420, 300, "selector { prop: value; }", { size: 13, fill: P.muted, mono: true });
  h += g.path("M155,332 L155,352 L670,352 L670,336", { stroke: P.ok, sw: 2, arrow: "g" }) + g.line(420, 332, 420, 352, { stroke: P.ok, sw: 2 }) + g.text(300, 368, "the browser combines HTML + CSS", { size: 13, fill: P.ok, bold: true });
  h += g.rect(560, 30, 220, 300, { fill: P.paper, stroke: P.ok, sw: 2, r: 8 }) + g.text(670, 50, "Rendered page", { bold: true, size: 15, fill: P.ok });
  h += g.text(670, 90, "Erne Rowing", { bold: true, size: 22, fill: P.pcb });
  h += g.rect(580, 114, 180, 40, { fill: P.warnSoft, r: 4 }) + g.text(670, 134, "Training Sat 9am", { size: 14 });
  h += g.rect(590, 170, 160, 90, { fill: P.soft, stroke: P.line, r: 4 }) + g.text(670, 215, "[image]", { size: 14, fill: P.muted });
  h += g.text(670, 290, "Join", { size: 15, fill: P.copper, bold: true });
  return h + g.lines(400, 410, ["One external style sheet styles every page: consistent, quick to change, cached by the browser"], { size: 15 }, 22);
} });

Diagrams.add("FD19", { cap: "Linear, hierarchical and non-linear navigation structures, and the four WCAG principles: perceivable, operable, understandable and robust", draw: function (g) {
  var P = g.P, h = "";
  h += g.text(130, 24, "Linear", { bold: true, size: 16 });
  for (var i = 0; i < 4; i++) { h += g.box(30, 44 + i * 50, 200, 36, ["Basket", "Delivery", "Payment", "Confirm"][i], { fill: P.copperSoft, size: 14 }); if (i < 3) h += g.arrow(130, 81 + i * 50, 130, 93 + i * 50); }
  h += g.text(400, 24, "Hierarchical", { bold: true, size: 16 });
  h += g.box(350, 44, 100, 34, "Home", { fill: P.pcb, color: P.pcbInk, bold: true, size: 14 });
  [290, 400, 510].forEach(function (x, k) { h += g.line(400, 78, x, 112, { stroke: P.muted }) + g.box(x - 48, 112, 96, 32, ["News", "Sport", "Contact"][k], { fill: P.soft, size: 14 }); });
  [262, 318, 372, 428].forEach(function (x, k) { var px = k < 2 ? 290 : 400; h += g.line(px, 144, x, 182, { stroke: P.muted }) + g.box(x - 26, 182, 52, 28, "page", { fill: P.card, stroke: P.line, size: 13 }); });
  h += g.text(670, 24, "Non-linear (mesh)", { bold: true, size: 16 });
  var n = [[620, 70], [730, 70], [600, 160], [690, 200], [760, 150]];
  [[0, 1], [0, 2], [0, 3], [1, 3], [1, 4], [2, 3], [3, 4]].forEach(function (e) { h += g.line(n[e[0]][0], n[e[0]][1], n[e[1]][0], n[e[1]][1], { stroke: P.muted }); });
  n.forEach(function (p) { h += g.circle(p[0], p[1], 16, { fill: P.okSoft, stroke: P.ok, sw: 2 }); });
  h += g.text(400, 252, "WCAG: four principles of accessible web content", { bold: true, size: 17 });
  var w = [["Perceivable", "alt text, captions,", "colour contrast"], ["Operable", "keyboard access,", "no flashing content"], ["Understandable", "plain language,", "clear error messages"], ["Robust", "valid HTML,", "labelled form controls"]];
  w.forEach(function (x, k) { var bx = 20 + k * 192; h += g.box(bx, 268, 184, 80, x, { fill: [P.copperSoft, P.okSoft, P.warnSoft, P.soft][k], size: 14, lh: 22 }); });
  h += g.text(400, 372, "Before publishing, test:", { bold: true, size: 15 });
  return h + g.text(400, 400, "links · forms and validation · browsers and devices · accessibility · W3C validator · real users", { size: 14, fill: P.muted });
} });

// Diagrams for A2 1: Information Systems (author: a21)
(function () {
  // crow's foot at (x, y): the 'many' end touches an entity; dir = 1 if the entity is to the right, -1 if to the left, 2 if below, -2 if above
  function crow(g, x, y, dir) {
    var P = g.P, s = { stroke: P.ink, sw: 2 };
    if (dir === 1 || dir === -1) { var bx = x - dir * 18; return g.line(bx, y, x, y - 10, s) + g.line(bx, y, x, y, s) + g.line(bx, y, x, y + 10, s); }
    var by = y - (dir === 2 ? 18 : -18); return g.line(x, by, x - 10, y, s) + g.line(x, by, x, y, s) + g.line(x, by, x + 10, y, s);
  }
  function table(g, x, y, w, title, rows, o) {
    o = o || {}; var P = g.P, rh = o.rh || 26, h = g.box(x, y, w, 30, title, { fill: o.head || P.pcb, color: P.pcbInk, bold: true, size: 14 });
    rows.forEach(function (r, i) { h += g.rect(x, y + 30 + i * rh, w, rh, { fill: (o.hl && o.hl.indexOf(i) >= 0) ? (o.hlFill || P.badSoft) : P.card, stroke: P.line, r: 0 }) + g.text(x + 10, y + 30 + i * rh + rh / 2, r, { anchor: "start", size: o.size || 13, mono: o.mono !== false }); });
    return h;
  }

  Diagrams.add("IS01", { cap: "Application programs reach the data only through the DBMS, which provides SQL, the data dictionary, integrity, security, concurrency control and backup; this gives data independence", draw: function (g) {
    var P = g.P, h = g.text(400, 28, "All access to the data goes through the DBMS", { bold: true, size: 18 });
    ["Booking app", "Accounts app", "Website", "Manager's reports"].forEach(function (a, i) { var y = 70 + i * 82; h += g.box(30, y, 170, 56, a, { fill: P.copperSoft, stroke: P.copper, size: 15 }) + g.arrow(202, y + 28, 268, y + 28 > 225 ? 235 : 215); });
    h += g.rect(270, 70, 260, 300, { fill: P.pcb, r: 10 }) + g.text(400, 96, "DBMS", { bold: true, size: 20, fill: P.pcbInk });
    ["SQL: define, query, update", "Data dictionary (metadata)", "Integrity rules + validation", "Security: users and rights", "Concurrency: locking", "Backup and recovery"].forEach(function (f, i) { h += g.box(285, 118 + i * 41, 230, 34, f, { fill: P.card, size: 14 }); });
    h += g.arrow(532, 220, 590, 220) + g.arrow(590, 240, 532, 240);
    ["Member", "Booking", "Activity"].forEach(function (t, i) { var y = 90 + i * 92; h += g.rect(600, y, 170, 70, { fill: P.soft, stroke: P.pcb, sw: 2 }) + g.text(685, y + 18, t, { bold: true, size: 15 }) + g.line(600, y + 34, 770, y + 34, { stroke: P.line, sw: 1 }) + g.text(685, y + 52, "table", { size: 13, fill: P.muted }); });
    h += g.text(685, 372, "Stored database", { size: 14, fill: P.muted, bold: true });
    return h + g.text(400, 420, "Data independence: storage can change without rewriting the programs, because they use the schema", { size: 15, fill: P.ink });
  } });

  Diagrams.add("IS02", { cap: "A many-to-many relationship between Pupil and Course resolved by an Enrolment link entity with a composite key, giving two one-to-many relationships", draw: function (g) {
    var P = g.P, h = g.text(400, 26, "Before: many-to-many (cannot be implemented)", { bold: true, size: 16, fill: P.bad });
    h += g.box(120, 50, 160, 50, "Pupil", { fill: P.soft, stroke: P.ink, bold: true }) + g.box(520, 50, 160, 50, "Course", { fill: P.soft, stroke: P.ink, bold: true });
    h += g.line(280, 75, 520, 75, { stroke: P.ink, sw: 2 }) + crow(g, 280, 75, -1) + crow(g, 520, 75, 1) + g.text(400, 60, "studies", { size: 13, fill: P.muted, italic: true });
    h += g.text(400, 140, "After: link entity with a composite key", { bold: true, size: 16, fill: P.ok });
    h += table(g, 30, 165, 210, "Pupil", ["PupilID  (PK)", "Surname", "Forename"]);
    h += table(g, 295, 165, 210, "Enrolment", ["PupilID  (PK, FK)", "CourseID (PK, FK)", "StartDate", "Grade"], { head: P.copper });
    h += table(g, 560, 165, 210, "Course", ["CourseID (PK)", "Title", "Level"]);
    h += g.line(240, 240, 295, 240, { stroke: P.ink, sw: 2 }) + crow(g, 295, 240, 1) + g.line(240, 232, 240, 248, { stroke: P.ink, sw: 2 }) + g.text(258, 222, "1", { size: 14, bold: true }) + g.text(282, 222, "M", { size: 14, bold: true });
    h += g.line(505, 240, 560, 240, { stroke: P.ink, sw: 2 }) + crow(g, 505, 240, -1) + g.line(560, 232, 560, 248, { stroke: P.ink, sw: 2 }) + g.text(518, 222, "M", { size: 14, bold: true }) + g.text(543, 222, "1", { size: 14, bold: true });
    h += g.lines(400, 340, ["One pupil has many enrolments; one course has many enrolments.", "PupilID + CourseID together form the composite primary key of Enrolment.", "Crow's foot = the 'many' end, where the foreign key lives."], { size: 15 }, 26);
    return h + g.text(400, 428, "PK = primary key   FK = foreign key", { size: 13, fill: P.muted });
  } });

  Diagrams.add("IS03", { cap: "Fermanagh Fresh order data normalised from 0NF through 1NF and 2NF to 3NF, showing which dependency is removed at each stage", draw: function (g) {
    var P = g.P, h = "", cols = [
      ["0NF", "un-normalised", [["Order", "OrderNo, OrderDate, CustID, CustName, CustTown, {ProductID, ProductName, UnitPrice, Qty}"]], ["repeating group", "shown in { }"]],
      ["1NF", "no repeating groups", [["Order", "OrderNo, OrderDate, CustID, CustName, CustTown"], ["OrderLine", "OrderNo, ProductID, ProductName, UnitPrice, Qty"]], ["repeating group moved;", "composite key"]],
      ["2NF", "no partial dependencies", [["Order", "OrderNo, OrderDate, CustID, CustName, CustTown"], ["OrderLine", "OrderNo*, ProductID*, Qty"], ["Product", "ProductID, ProductName, UnitPrice"]], ["ProductName needed", "only ProductID"]],
      ["3NF", "no transitive dependencies", [["Order", "OrderNo, OrderDate, CustID*"], ["Customer", "CustID, CustName, CustTown"], ["OrderLine", "OrderNo*, ProductID*, Qty"], ["Product", "ProductID, ProductName, UnitPrice"]], ["CustName depended", "on CustID"]]];
    function wrap(s, n) { var w = s.split(" "), out = [], cur = ""; w.forEach(function (x) { if ((cur + " " + x).trim().length > n) { out.push(cur.trim()); cur = x; } else cur += " " + x; }); out.push(cur.trim()); return out; }
    cols.forEach(function (c, i) {
      var x = 12 + i * 197, y = 70;
      h += g.box(x, 20, 180, 40, c[0], { fill: i === 3 ? P.ok : P.pcb, color: P.pcbInk, bold: true, size: 18 }) + g.text(x + 90, 76, c[1], { size: 13, fill: P.muted, bold: true });
      y = 92;
      c[2].forEach(function (t) { var ls = wrap(t[1], 22), ht = 26 + ls.length * 17; h += g.rect(x, y, 180, ht, { fill: P.card, stroke: P.line }) + g.text(x + 8, y + 13, t[0], { anchor: "start", bold: true, size: 13 }) + g.lines(x + 8, y + 31, ls, { anchor: "start", size: 13, mono: false }, 17); y += ht + 8; });
      h += g.box(x, 388, 180, 48, c[3], { fill: P.warnSoft, size: 13, lh: 18 });
      if (i < 3) h += g.arrow(x + 181, 40, x + 196, 40, { arrow: "c" });
    });
    return h;
  } });

  Diagrams.add("IS04", { cap: "Entity integrity requires unique, non-null primary keys; referential integrity requires every foreign key to match a primary key, so an order for missing customer C999 is an orphan record", draw: function (g) {
    var P = g.P, h = g.text(200, 26, "Customer (parent)", { bold: true, size: 16 }) + g.text(600, 26, "CustOrder (child)", { bold: true, size: 16 });
    h += table(g, 40, 45, 320, "CustID | CustName | Town", ["C101 | N Maguire | Enniskillen", "C102 | P Quinn    | Omagh", "C103 | A Patel    | Belfast"]);
    h += table(g, 440, 45, 320, "OrderNo | Date       | CustID", ["5001 | 2026-10-12 | C101", "5002 | 2026-10-13 | C103", "5003 | 2026-10-13 | C101", "5004 | 2026-10-14 | C999"], { hl: [3] });
    h += g.arrow(440, 88, 362, 88, { arrow: "g" }) + g.arrow(440, 114, 362, 140, { arrow: "g" }) + g.arrow(440, 140, 362, 92, { arrow: "g" });
    h += g.text(600, 205, "orphan: no customer C999", { size: 14, fill: P.bad, bold: true });
    h += g.box(40, 240, 340, 110, ["Entity integrity", "Every table has a primary key;", "values are unique and never null"], { fill: P.okSoft, size: 15, lh: 24 });
    h += g.box(420, 240, 340, 110, ["Referential integrity", "Each foreign key must match an", "existing primary key (or be null)"], { fill: P.copperSoft, size: 15, lh: 24 });
    return h + g.lines(400, 385, ["Options when a parent is deleted: restrict (refuse), cascade delete (delete children)", "Rules are stored in the data dictionary and enforced by the DBMS"], { size: 14, fill: P.muted }, 24);
  } });

  Diagrams.add("IS05", { cap: "SQL split into data definition language for structure and data manipulation language for data, with an example of each command", draw: function (g) {
    var P = g.P, h = g.text(400, 26, "SQL", { bold: true, size: 20 });
    h += g.box(30, 50, 350, 46, "DDL – defines structure", { fill: P.pcb, color: P.pcbInk, bold: true, size: 16 }) + g.box(420, 50, 350, 46, "DML – works with the data", { fill: P.copper, color: P.card, bold: true, size: 16 });
    [["CREATE TABLE", "CREATE TABLE Member (...);"], ["ALTER TABLE", "ALTER TABLE Member ADD Phone VARCHAR(15);"], ["DROP TABLE", "DROP TABLE OldBookings;"]].forEach(function (r, i) { var y = 112 + i * 80; h += g.rect(30, y, 350, 66, { fill: P.soft }) + g.text(44, y + 20, r[0], { anchor: "start", bold: true, mono: true, size: 15 }) + g.text(44, y + 46, r[1], { anchor: "start", mono: true, size: 13, fill: P.muted }); });
    [["SELECT", "SELECT * FROM Member WHERE ...;"], ["INSERT INTO", "INSERT INTO Member VALUES (...);"], ["UPDATE", "UPDATE Member SET ... WHERE ...;"], ["DELETE", "DELETE FROM Member WHERE ...;"]].forEach(function (r, i) { var y = 112 + i * 64; h += g.rect(420, y, 350, 54, { fill: P.copperSoft }) + g.text(434, y + 17, r[0], { anchor: "start", bold: true, mono: true, size: 15 }) + g.text(434, y + 39, r[1], { anchor: "start", mono: true, size: 13, fill: P.muted }); });
    h += g.box(30, 372, 350, 60, ["Constraints: PRIMARY KEY, FOREIGN KEY", "REFERENCES, NOT NULL, CHECK"], { fill: P.okSoft, size: 14, lh: 20 });
    return h + g.box(420, 372, 350, 60, ["No WHERE on UPDATE or DELETE", "= every record is changed!"], { fill: P.badSoft, size: 14, lh: 20, bold: true });
  } });

  Diagrams.add("IS06", { cap: "The order in which a DBMS logically processes an SQL query: FROM and JOIN, WHERE, GROUP BY, HAVING, SELECT, then ORDER BY", draw: function (g) {
    var P = g.P, h = g.text(400, 26, "How a query is processed (logical order)", { bold: true, size: 18 });
    var st = [["FROM / JOIN", ["combine tables", "on PK = FK"]], ["WHERE", ["keep matching", "rows"]], ["GROUP BY", ["form groups"]], ["HAVING", ["keep matching", "groups"]], ["SELECT", ["choose fields,", "aggregates"]], ["ORDER BY", ["sort ASC / DESC"]]];
    st.forEach(function (s, i) { var x = 20 + i * 130; h += g.box(x, 60, 118, 54, s[0], { fill: i === 2 || i === 3 ? P.copper : P.pcb, color: P.pcbInk, bold: true, mono: true, size: 14 }) + g.lines(x + 59, 134, s[1], { size: 13, fill: P.muted }, 17); if (i < 5) h += g.arrow(x + 119, 87, x + 129, 87); });
    h += g.rect(30, 190, 740, 170, { fill: P.soft, r: 10 }) + g.text(50, 212, "Example", { anchor: "start", bold: true, size: 14, fill: P.muted });
    h += g.lines(50, 240, ["SELECT c.CustName, SUM(ol.Qty * p.UnitPrice) AS Spent", "FROM Customer c", "  JOIN CustOrder o  ON c.CustID = o.CustID", "  JOIN OrderLine ol ON o.OrderNo = ol.OrderNo", "  JOIN Product p    ON ol.ProductID = p.ProductID", "GROUP BY c.CustName  HAVING SUM(ol.Qty * p.UnitPrice) > 100", "ORDER BY Spent DESC;"], { anchor: "start", mono: true, size: 14 }, 17);
    return h + g.text(400, 400, "WHERE filters rows before grouping; HAVING filters groups after aggregates are calculated", { size: 15 }) + g.text(400, 428, "3 joins for 4 tables: n tables need n − 1 join conditions", { size: 14, fill: P.muted });
  } });

  Diagrams.add("IS07", { cap: "Deadlock: transaction T1 holds a lock on record X and waits for Y while T2 holds Y and waits for X; the DBMS rolls one back. ACID properties listed alongside", draw: function (g) {
    var P = g.P, h = g.text(240, 26, "Deadlock", { bold: true, size: 18 });
    h += g.box(40, 70, 140, 60, "T1", { fill: P.pcb, color: P.pcbInk, bold: true, size: 18 }) + g.box(300, 70, 140, 60, "T2", { fill: P.copper, color: P.card, bold: true, size: 18 });
    h += g.box(40, 260, 140, 60, "Record X", { fill: P.soft, stroke: P.ink, bold: true }) + g.box(300, 260, 140, 60, "Record Y", { fill: P.soft, stroke: P.ink, bold: true });
    h += g.arrow(110, 255, 110, 135, { arrow: "g" }) + g.text(70, 195, "locked by", { size: 13, fill: P.ok, rot: -90 });
    h += g.arrow(370, 255, 370, 135, { arrow: "g" }) + g.text(410, 195, "locked by", { size: 13, fill: P.ok, rot: 90 });
    h += g.arrow(180, 120, 300, 265, { arrow: "r", dash: "6 5" }) + g.arrow(300, 120, 180, 265, { arrow: "r", dash: "6 5" });
    h += g.text(240, 160, "waits for", { size: 13, fill: P.bad, bold: true });
    h += g.lines(240, 360, ["Each waits for the other forever.", "DBMS detects the cycle and rolls back one", "transaction (the victim), then restarts it."], { size: 14 }, 22);
    var acid = [["A", "Atomicity", "all or nothing"], ["C", "Consistency", "valid state to valid state"], ["I", "Isolation", "no interference"], ["D", "Durability", "committed = permanent"]];
    h += g.text(640, 26, "ACID transactions", { bold: true, size: 18 });
    acid.forEach(function (a, i) { var y = 55 + i * 86; h += g.box(500, y, 56, 70, a[0], { fill: P.pcb, color: P.pcbInk, bold: true, size: 26 }) + g.rect(560, y, 220, 70, { fill: P.soft }) + g.text(572, y + 24, a[1], { anchor: "start", bold: true, size: 15 }) + g.text(572, y + 48, a[2], { anchor: "start", size: 14, fill: P.muted }); });
    return h + g.text(640, 415, "COMMIT keeps · ROLLBACK undoes", { size: 14, bold: true, fill: P.copper });
  } });

  Diagrams.add("IS08", { cap: "Data from operational sources is extracted, transformed and loaded into a data warehouse, then analysed with OLAP and data mining to support decisions", draw: function (g) {
    var P = g.P, h = g.text(400, 26, "From operational data to decisions", { bold: true, size: 18 });
    ["Till sales (TPS)", "Website orders", "Loyalty app", "Social media", "External data"].forEach(function (s, i) { var y = 60 + i * 66; h += g.box(20, y, 140, 50, s, { fill: P.copperSoft, size: 14 }) + g.arrow(162, y + 25, 196, 225); });
    [["Extract", "copy from sources"], ["Transform", "clean, convert"], ["Load", "write in batches"]].forEach(function (e, i) { var y = 110 + i * 82; h += g.box(200, y, 150, 64, [e[0], e[1]], { fill: P.pcb, color: P.pcbInk, size: 13, lh: 20, bold: false }); if (i < 2) h += g.arrow(275, y + 66, 275, y + 80); });
    h += g.arrow(352, 307, 400, 230);
    h += g.path("M410,150 L410,310 A70,18 0 0 0 550,310 L550,150", { fill: P.soft, stroke: P.ink, sw: 2 }) + g.path("M410,150 A70,18 0 0 1 550,150 A70,18 0 0 1 410,150", { fill: P.card, stroke: P.ink, sw: 2 });
    h += g.lines(480, 215, ["Data", "warehouse"], { bold: true, size: 16 }, 22) + g.lines(480, 275, ["historical,", "read-only"], { size: 13, fill: P.muted }, 18);
    h += g.arrow(552, 230, 590, 230);
    [["OLAP", "slice, drill down"], ["Data mining", "association, clustering, classification, anomalies"], ["Dashboards", "for managers"]].forEach(function (o, i) { var y = 90 + i * 100; h += g.box(595, y, 185, 80, [o[0]].concat(o[1].length > 24 ? ["association, clustering,", "classification, anomalies"] : [o[1]]), { fill: P.okSoft, size: 13, lh: 19 }); });
    return h + g.text(400, 428, "Big data: volume · velocity · variety · veracity · value", { size: 15, bold: true, fill: P.copper });
  } });

  Diagrams.add("IS09", { cap: "The four network topologies: bus with a shared backbone, star with a central switch, ring as a closed loop, and mesh with multiple links", draw: function (g) {
    var P = g.P, h = "";
    function node(x, y) { return g.monitor(x, y, 1); }
    h += g.rect(10, 10, 385, 210, { fill: P.soft, r: 10 }) + g.text(30, 32, "Bus", { anchor: "start", bold: true, size: 17 });
    h += g.line(40, 130, 365, 130, { stroke: P.copper, sw: 5 }) + g.rect(32, 120, 8, 20, { fill: P.ink, r: 1 }) + g.rect(365, 120, 8, 20, { fill: P.ink, r: 1 });
    [80, 160, 240, 320].forEach(function (x, i) { var up = i % 2 === 0; h += g.line(x, 130, x, up ? 95 : 165, { stroke: P.ink }) + node(x, up ? 80 : 182); });
    h += g.text(200, 205, "one shared backbone + terminators", { size: 13, fill: P.muted });
    h += g.rect(405, 10, 385, 210, { fill: P.soft, r: 10 }) + g.text(425, 32, "Star", { anchor: "start", bold: true, size: 17 });
    h += g.box(565, 100, 70, 36, "Switch", { fill: P.pcb, color: P.pcbInk, size: 13, bold: true });
    [[470, 70], [730, 70], [470, 170], [730, 170], [600, 55]].forEach(function (p) { h += g.line(600, 118, p[0], p[1], { stroke: P.ink }) + node(p[0], p[1]); });
    h += g.text(597, 205, "every device has its own link to the centre", { size: 13, fill: P.muted });
    h += g.rect(10, 230, 385, 210, { fill: P.soft, r: 10 }) + g.text(30, 252, "Ring", { anchor: "start", bold: true, size: 17 });
    h += g.circle(200, 335, 70, { stroke: P.copper, sw: 4 });
    [0, 72, 144, 216, 288].forEach(function (a) { var r = a * Math.PI / 180; h += node(Math.round(200 + 70 * Math.sin(r)), Math.round(335 - 70 * Math.cos(r))); });
    h += g.path("M268,300 A70,70 0 0 1 270,340", { stroke: P.ok, sw: 3, arrow: "g" }) + g.text(320, 420, "data flows one way", { size: 13, fill: P.muted });
    h += g.rect(405, 230, 385, 210, { fill: P.soft, r: 10 }) + g.text(425, 252, "Mesh (full)", { anchor: "start", bold: true, size: 17 });
    var m = [[520, 290], [680, 290], [500, 390], [700, 390], [600, 340]];
    for (var i = 0; i < m.length; i++) for (var j = i + 1; j < m.length; j++) h += g.line(m[i][0], m[i][1], m[j][0], m[j][1], { stroke: P.line, sw: 2 });
    m.forEach(function (p) { h += node(p[0], p[1]); });
    return h + g.text(597, 425, "many routes: reliable but costly", { size: 13, fill: P.muted });
  } });

  Diagrams.add("IS10", { cap: "The seven OSI layers mapped to the four TCP/IP layers, with example protocols and the header added at each layer during encapsulation", draw: function (g) {
    var P = g.P, h = g.text(130, 22, "OSI model", { bold: true, size: 16 }) + g.text(375, 22, "TCP/IP model", { bold: true, size: 16 }) + g.text(640, 22, "Protocols / data unit", { bold: true, size: 16 });
    var osi = ["7 Application", "6 Presentation", "5 Session", "4 Transport", "3 Network", "2 Data link", "1 Physical"], y0 = 40, rh = 54;
    osi.forEach(function (o, i) { h += g.box(30, y0 + i * rh, 200, rh - 6, o, { fill: i < 3 ? P.copperSoft : i === 3 ? P.okSoft : i === 4 ? P.warnSoft : P.soft, size: 15 }); });
    [["Application", 0, 3, P.copperSoft, "HTTP/S, FTP, SMTP, POP3, IMAP", "data"], ["Transport", 3, 1, P.okSoft, "TCP, UDP  (+ port numbers)", "segment"], ["Internet", 4, 1, P.warnSoft, "IP  (+ IP addresses)", "packet"], ["Link", 5, 2, P.soft, "Ethernet, Wi-Fi (+ MAC addresses)", "frame → bits"]].forEach(function (t) {
      var y = y0 + t[1] * rh, ht = t[2] * rh - 6;
      h += g.box(280, y, 190, ht, t[0], { fill: t[3], stroke: P.ink, bold: true, size: 16 }) + g.line(232, y + ht / 2, 278, y + ht / 2, { stroke: P.line, dash: "4 4" });
      h += g.text(500, y + ht / 2 - 10, t[4], { anchor: "start", size: 14 }) + g.text(500, y + ht / 2 + 12, "unit: " + t[5], { anchor: "start", size: 13, fill: P.muted });
    });
    return h + g.text(400, 432, "Sending: down the layers, each adds a header (encapsulation). Receiving: up the layers, headers removed.", { size: 14, fill: P.ink });
  } });

  Diagrams.add("IS11", { cap: "A home network where DHCP gives devices private IP addresses and the router uses NAT to share one public IP address with the internet", draw: function (g) {
    var P = g.P, h = g.text(400, 24, "Private addresses inside, one public address outside", { bold: true, size: 17 });
    [["Laptop", "192.168.1.10"], ["Phone", "192.168.1.11"], ["Smart TV", "192.168.1.12"]].forEach(function (d, i) { var y = 70 + i * 110; h += g.monitor(70, y + 30, 1.4) + g.text(140, y + 18, d[0], { anchor: "start", bold: true, size: 15 }) + g.text(140, y + 42, d[1], { anchor: "start", mono: true, size: 14 }) + g.arrow(260, y + 30, 318, 215); });
    h += g.rect(320, 120, 200, 200, { fill: P.pcb, r: 10 }) + g.text(420, 145, "Router", { bold: true, size: 18, fill: P.pcbInk });
    h += g.box(328, 165, 184, 40, "DHCP: leases addresses", { fill: P.card, size: 13 }) + g.box(328, 215, 184, 90, ["NAT table", "192.168.1.10:5001 ↔ :40001", "192.168.1.11:5002 ↔ :40002"], { fill: P.card, size: 13, lh: 22, mono: false });
    h += g.arrow(522, 220, 600, 220, { arrow: "c" }) + g.text(561, 200, "86.0.12.34", { size: 13, mono: true, bold: true, fill: P.copper });
    h += g.path("M620,220 C600,170 660,140 690,165 C710,130 770,140 765,185 C795,195 790,250 755,255 C750,290 690,290 680,265 C650,285 600,270 620,220 Z", { fill: P.soft, stroke: P.ink, sw: 2 }) + g.text(700, 215, "Internet", { bold: true, size: 16 });
    h += g.text(700, 300, "only the public IP is seen", { size: 13, fill: P.muted });
    return h + g.text(400, 420, "Private ranges: 10.x.x.x · 172.16–31.x.x · 192.168.x.x   |   /24 mask: 2⁸ − 2 = 254 usable hosts", { size: 14 });
  } });

  Diagrams.add("IS12", { cap: "Automatic repeat request: block 1 is acknowledged, block 2 arrives with an error and is negatively acknowledged then resent, and block 3 is lost so a timeout triggers retransmission", draw: function (g) {
    var P = g.P, h = g.box(60, 20, 140, 40, "Sender", { fill: P.pcb, color: P.pcbInk, bold: true }) + g.box(600, 20, 140, 40, "Receiver", { fill: P.pcb, color: P.pcbInk, bold: true });
    h += g.line(130, 62, 130, 440, { stroke: P.line, sw: 3 }) + g.line(670, 62, 670, 440, { stroke: P.line, sw: 3 });
    function msg(y1, y2, dir, label, kind) { var a = kind === "bad" ? "r" : kind === "ok" ? "g" : "c"; var x1 = dir > 0 ? 132 : 668, x2 = dir > 0 ? 668 : 132; return g.arrow(x1, y1, x2, y2, { arrow: a, sw: 2.5, stroke: kind === "bad" ? P.bad : kind === "ok" ? P.ok : P.copper }) + g.text(400, (y1 + y2) / 2 - 12, label, { size: 14, bold: true, fill: kind === "bad" ? P.bad : kind === "ok" ? P.ok : P.ink }); }
    h += msg(80, 110, 1, "Block 1 + CRC") + msg(118, 140, -1, "ACK 1", "ok");
    h += msg(160, 190, 1, "Block 2 (corrupted)") + g.text(720, 190, "CRC fails", { size: 13, fill: P.bad, anchor: "start" }) + msg(198, 220, -1, "NAK 2", "bad");
    h += msg(238, 268, 1, "Block 2 resent") + msg(276, 298, -1, "ACK 2", "ok");
    h += g.arrow(132, 318, 420, 334, { arrow: "c", sw: 2.5, stroke: P.copper }) + g.text(300, 310, "Block 3", { size: 14, bold: true }) + g.text(450, 338, "✕ lost", { size: 15, bold: true, fill: P.bad });
    h += g.rect(40, 322, 80, 58, { fill: P.warnSoft, stroke: P.warn }) + g.lines(80, 340, ["timer", "expires"], { size: 13 }, 18);
    h += msg(390, 420, 1, "Block 3 resent after timeout");
    return h;
  } });

  Diagrams.add("IS13", { cap: "Creating a digital signature by hashing a message and encrypting the hash with the sender's private key, and verifying it by decrypting with the sender's public key and comparing hashes", draw: function (g) {
    var P = g.P, h = g.text(200, 24, "Alice signs", { bold: true, size: 17 }) + g.text(600, 24, "Bob verifies", { bold: true, size: 17 });
    h += g.box(40, 50, 140, 50, "Message", { fill: P.soft, stroke: P.ink }) + g.arrow(110, 102, 110, 140) + g.box(40, 142, 140, 46, "Hash", { fill: P.warnSoft });
    h += g.arrow(110, 190, 110, 228) + g.box(25, 230, 170, 60, ["Encrypt with", "Alice's PRIVATE key"], { fill: P.badSoft, size: 14, lh: 20 }) + g.arrow(110, 292, 110, 326) + g.box(40, 328, 140, 46, "Signature", { fill: P.copper, color: P.card, bold: true });
    h += g.arrow(182, 75, 470, 75) + g.arrow(182, 351, 470, 351) + g.text(326, 60, "message sent", { size: 13, fill: P.muted }) + g.text(326, 336, "signature sent with it", { size: 13, fill: P.muted });
    h += g.box(472, 50, 140, 50, "Message", { fill: P.soft, stroke: P.ink }) + g.arrow(542, 102, 542, 140) + g.box(472, 142, 140, 46, "Hash A", { fill: P.warnSoft });
    h += g.box(472, 328, 140, 46, "Signature", { fill: P.copper, color: P.card, bold: true }) + g.arrow(542, 326, 542, 292) + g.box(452, 230, 180, 60, ["Decrypt with", "Alice's PUBLIC key"], { fill: P.okSoft, size: 14, lh: 20 }) + g.arrow(634, 260, 668, 260);
    h += g.box(670, 236, 110, 46, "Hash B", { fill: P.warnSoft }) + g.line(614, 165, 725, 165) + g.arrow(725, 165, 725, 184) + g.arrow(725, 234, 725, 224);
    h += g.box(668, 186, 114, 36, "A = B ?", { fill: P.card, stroke: P.ink, bold: true });
    return h + g.lines(400, 410, ["Match → really from Alice (authentication) and unchanged (integrity).", "A certificate authority's digital certificate proves the public key is Alice's."], { size: 14 }, 22);
  } });

  Diagrams.add("IS14", { cap: "Who manages each layer of the computing stack in on-premises, IaaS, PaaS and SaaS models: the customer or the cloud provider", draw: function (g) {
    var P = g.P, h = "", layers = ["Applications", "Data", "Runtime", "Operating system", "Virtualisation", "Servers", "Storage", "Networking"], models = [["On-premises", 8], ["IaaS", 4], ["PaaS", 2], ["SaaS", 0]];
    models.forEach(function (m, c) {
      var x = 30 + c * 190; h += g.box(x, 18, 170, 36, m[0], { fill: P.ink, color: P.paper, bold: true, size: 16 });
      layers.forEach(function (l, r) { var you = r < m[1]; h += g.box(x, 62 + r * 40, 170, 34, l, { fill: you ? P.copperSoft : P.pcb, color: you ? P.ink : P.pcbInk, size: 14 }); });
    });
    h += g.rect(170, 402, 22, 22, { fill: P.copperSoft, stroke: P.copper }) + g.text(200, 413, "managed by the customer", { anchor: "start", size: 14 });
    h += g.rect(450, 402, 22, 22, { fill: P.pcb }) + g.text(480, 413, "managed by the cloud provider", { anchor: "start", size: 14 });
    return h;
  } });

  Diagrams.add("IS15", { cap: "The information pyramid: TPS at the operational level, MIS at the tactical level and DSS at the strategic level, with data flowing upwards; and the three components of an expert system", draw: function (g) {
    var P = g.P, h = "";
    h += g.path("M240,40 L330,160 L150,160 Z", { fill: P.copper }) + g.text(240, 112, "DSS", { bold: true, size: 17, fill: P.card }) + g.text(240, 140, "strategic", { size: 13, fill: P.card });
    h += g.path("M150,166 L330,166 L410,276 L70,276 Z", { fill: P.warn }) + g.text(240, 208, "MIS", { bold: true, size: 17, fill: P.card }) + g.text(240, 236, "tactical · semi-structured", { size: 13, fill: P.card });
    h += g.path("M70,282 L410,282 L480,380 L0,380 Z", { fill: P.pcb }) + g.text(240, 318, "TPS", { bold: true, size: 17, fill: P.pcbInk }) + g.text(240, 346, "operational · structured", { size: 13, fill: P.pcbInk });
    h += g.lines(300, 80, ["unstructured", "decisions"], { anchor: "start", size: 13, bold: true }, 18);
    h += g.arrow(20, 360, 20, 60, { arrow: "c" }) + g.text(36, 200, "data summarised upwards", { size: 13, fill: P.muted, rot: -90 });
    h += g.text(240, 410, "Lough Erne Hotels: bookings → occupancy reports → 'add 40 rooms?'", { size: 13, fill: P.muted });
    h += g.rect(590, 20, 200, 400, { fill: P.soft, r: 10 }) + g.text(690, 44, "Expert system", { bold: true, size: 16 });
    h += g.box(605, 70, 170, 70, ["User interface", "questions, advice,", "explanation"], { fill: P.card, stroke: P.ink, size: 13, lh: 18 });
    h += g.arrow(690, 142, 690, 175) + g.arrow(700, 175, 700, 142);
    h += g.box(605, 177, 170, 80, ["Inference engine", "applies rules:", "forward/backward chaining"], { fill: P.pcb, color: P.pcbInk, size: 13, lh: 20 });
    h += g.arrow(690, 259, 690, 292) + g.arrow(700, 292, 700, 259);
    return h + g.box(605, 294, 170, 80, ["Knowledge base", "facts + IF–THEN rules", "from human experts"], { fill: P.copperSoft, size: 13, lh: 20 });
  } });

  Diagrams.add("IS16", { cap: "The machine learning cycle of training data, training, testing on unseen data, deployment and monitoring, with the three types of learning", draw: function (g) {
    var P = g.P, h = g.text(400, 24, "Machine learning: learn from data, not hand-written rules", { bold: true, size: 17 });
    var st = [["Collect data", "labelled or", "unlabelled"], ["Train model", "adjust parameters", "to cut errors"], ["Test", "on unseen", "data"], ["Deploy", "predict on", "new data"], ["Monitor", "accuracy", "and bias"]];
    st.forEach(function (s, i) { var x = 20 + i * 156; h += g.box(x, 60, 140, 80, s, { fill: i === 1 ? P.pcb : P.soft, color: i === 1 ? P.pcbInk : P.ink, size: 14, lh: 20 }); if (i < 4) h += g.arrow(x + 141, 100, x + 155, 100); });
    h += g.path("M720,142 C720,190 100,190 90,142", { stroke: P.copper, sw: 2, arrow: "c", dash: "6 5" }) + g.text(400, 200, "retrain with new data", { size: 13, fill: P.copper });
    [["Supervised", "labelled examples", "spam filter, price prediction"], ["Unsupervised", "finds structure", "customer clustering"], ["Reinforcement", "rewards for good actions", "robots, game AI"]].forEach(function (t, i) { var x = 30 + i * 255; h += g.rect(x, 230, 230, 120, { fill: P.okSoft, r: 8 }) + g.text(x + 115, 256, t[0], { bold: true, size: 16 }) + g.text(x + 115, 288, t[1], { size: 14 }) + g.text(x + 115, 318, t[2], { size: 13, fill: P.muted }); });
    return h + g.text(400, 395, "Emerging tech: IoT sensors collect data → ML models decide → robots act", { size: 15, bold: true }) + g.text(400, 425, "Risks: algorithmic bias · job change · security · privacy · accountability", { size: 14, fill: P.bad });
  } });

  Diagrams.add("IS17", { cap: "Summary of the five Acts: Data Protection Act 2018 and UK GDPR, Computer Misuse Act 1990, Copyright Designs and Patents Act 1988, Freedom of Information Act 2000 and RIPA 2000", draw: function (g) {
    var P = g.P, h = "";
    h += g.rect(20, 15, 370, 250, { fill: P.okSoft, r: 10 }) + g.text(205, 38, "DPA 2018 + UK GDPR", { bold: true, size: 16 });
    h += g.lines(36, 66, ["1 Lawfulness, fairness, transparency", "2 Purpose limitation", "3 Data minimisation", "4 Accuracy", "5 Storage limitation", "6 Integrity and confidentiality", "7 Accountability"], { anchor: "start", size: 14 }, 22);
    h += g.text(36, 232, "Controller · processor · subject · ICO", { anchor: "start", size: 13, fill: P.muted, bold: true });
    h += g.rect(410, 15, 370, 250, { fill: P.badSoft, r: 10 }) + g.text(595, 38, "Computer Misuse Act 1990", { bold: true, size: 16 });
    [["s1", "unauthorised access"], ["s2", "… with intent to commit further offences"], ["s3", "unauthorised acts to impair a computer"], ["s3ZA", "acts causing risk of serious damage"], ["s3A", "making/supplying hacking tools"]].forEach(function (s, i) { h += g.text(426, 72 + i * 36, s[0], { anchor: "start", bold: true, mono: true, size: 14 }) + g.text(476, 72 + i * 36, s[1], { anchor: "start", size: 14 }); });
    [["CDPA 1988", ["Copyright on software, media", "No copying without licence"], P.copperSoft], ["FOIA 2000", ["Request info from public", "authorities · 20 working days"], P.warnSoft], ["RIPA 2000", ["Covert surveillance rules", "Power to demand decryption"], P.soft]].forEach(function (b, i) { var x = 20 + i * 257; h += g.rect(x, 280, 245, 150, { fill: b[2], r: 10 }) + g.text(x + 122, 306, b[0], { bold: true, size: 16 }) + g.lines(x + 122, 350, b[1], { size: 14 }, 26); });
    return h;
  } });

  Diagrams.add("IS18", { cap: "Ethical, social and environmental issues of digital technology, each with key concerns and responses", draw: function (g) {
    var P = g.P, h = g.text(400, 24, "Weigh up impacts for every stakeholder", { bold: true, size: 17 });
    [["Ethical", P.copperSoft, P.copper, ["Privacy and consent", "CCTV, facial recognition", "Employee monitoring", "Online tracking, profiling", "Bias and accountability"]], ["Social", P.okSoft, P.ok, ["Digital divide", "Job losses and new jobs", "Deskilling / upskilling", "Remote working", "Health: RSI, eye strain"]], ["Environmental", P.warnSoft, P.warn, ["Data-centre energy", "E-waste and toxins", "Mining rare metals", "Short device lifecycles", "Less travel (positive)"]]].forEach(function (c, i) {
      var x = 25 + i * 255; h += g.rect(x, 50, 240, 300, { fill: c[1], stroke: c[2], sw: 2, r: 10 }) + g.box(x, 50, 240, 44, c[0], { fill: c[2], color: P.card, bold: true, size: 18, r: 10 });
      h += g.lines(x + 20, 125, c[3].map(function (s) { return "• " + s; }), { anchor: "start", size: 15 }, 44);
    });
    return h + g.text(400, 385, "Responses: law and regulation · ethical codes · training · ergonomics", { size: 15 }) + g.text(400, 415, "reuse, repair and WEEE recycling · energy-efficient and renewable-powered IT", { size: 15 });
  } });
})();

// Diagrams for A2 2: Application Development (topic G24, lessons AD01–AD06)
(function () {
  function store(g, x, y, w, h, id, name) {
    var P = g.P;
    return g.rect(x, y, w, h, { fill: P.soft, r: 0 }) + g.path("M" + (x + w) + "," + y + " H" + x + " V" + (y + h) + " H" + (x + w), { stroke: P.ink, sw: 1.8 }) + g.line(x + 40, y, x + 40, y + h, { stroke: P.ink, sw: 1.5 }) + g.text(x + 20, y + h / 2, id, { size: 14, bold: true }) + g.text(x + 40 + (w - 40) / 2, y + h / 2, name, { size: 14 });
  }

  Diagrams.add("AD01", { cap: "A Gantt chart for a 60-hour database project showing six tasks, overlapping testing, dependencies and three milestones", draw: function (g) {
    var P = g.P, h = "", x = function (hr) { return 230 + hr * 9; };
    h += g.text(400, 22, "Project plan: about 60 hours (suggested split, not a CCEA allocation)", { size: 15, bold: true });
    for (var t = 0; t <= 60; t += 10) { h += g.line(x(t), 50, x(t), 340, { stroke: P.line, sw: 1 }) + g.text(x(t), 42, t + "h", { size: 13, fill: P.muted }); }
    var tasks = [["Analysis", 0, 8, P.pcb], ["Design", 8, 22, P.pcb], ["Development", 22, 42, P.copper], ["Testing", 34, 50, P.ok], ["Evaluation", 50, 56, P.warn], ["Portfolio assembly", 52, 60, P.warn]];
    tasks.forEach(function (k, i) {
      var y = 62 + i * 46;
      h += g.text(40, y + 15, k[0], { anchor: "start", size: 15, bold: true });
      h += g.rect(x(k[1]), y, x(k[2]) - x(k[1]), 30, { fill: k[3], r: 5 });
      h += g.text((x(k[1]) + x(k[2])) / 2, y + 15, (k[2] - k[1]) + "h", { size: 13, bold: true, fill: P.card });
    });
    h += g.path("M" + (x(8) - 12) + ",92 V123 H" + (x(8) - 1), { stroke: P.ink, sw: 1.5, arrow: "a" });
    h += g.path("M" + (x(22) - 12) + ",138 V169 H" + (x(22) - 1), { stroke: P.ink, sw: 1.5, arrow: "a" });
    h += g.text(40, 365, "Milestones", { anchor: "start", size: 15, bold: true });
    [[8, "Requirements agreed"], [22, "Design complete"], [60, "Hand-in"]].forEach(function (m, i) {
      h += g.diamond(x(m[0]), 365, 10, 12, "");
      h += g.text(i === 2 ? x(m[0]) : x(m[0]), 395, m[1], { size: 13, anchor: i === 2 ? "end" : "middle", fill: P.muted });
    });
    return h + g.text(400, 432, "Bars = tasks · diamonds = milestones · arrows = dependencies · testing overlaps development", { size: 13, fill: P.muted });
  } });

  Diagrams.add("AD02", { cap: "A level 1 data flow diagram for the proposed Erne Boat Hire system with two external entities, three processes and three data stores", draw: function (g) {
    var P = g.P, h = "";
    h += g.box(30, 50, 130, 60, "Customer", { fill: P.copperSoft, stroke: P.copper, bold: true });
    h += g.box(30, 340, 130, 60, "Owner", { fill: P.copperSoft, stroke: P.copper, bold: true });
    h += g.box(300, 30, 170, 100, ["1", "Make booking"], { fill: P.okSoft, stroke: P.ok, r: 18, bold: true, lh: 24 });
    h += g.box(300, 200, 170, 80, ["2", "Record payment"], { fill: P.okSoft, stroke: P.ok, r: 18, bold: true, lh: 24 });
    h += g.box(300, 330, 170, 80, ["3", "Produce reports"], { fill: P.okSoft, stroke: P.ok, r: 18, bold: true, lh: 24 });
    h += store(g, 580, 25, 180, 40, "D1", "Customers") + store(g, 580, 85, 180, 40, "D2", "Boats") + store(g, 580, 155, 180, 40, "D3", "Bookings");
    h += g.arrow(160, 68, 298, 68) + g.text(230, 56, "booking details", { size: 13 });
    h += g.arrow(300, 95, 162, 95) + g.text(230, 108, "receipt", { size: 13 });
    h += g.path("M95,110 V240 H298", { stroke: P.muted, arrow: "a" }) + g.text(200, 228, "payment", { size: 13 });
    h += g.arrow(470, 45, 578, 45) + g.text(525, 33, "customer details", { size: 13 });
    h += g.arrow(580, 105, 472, 105) + g.text(525, 92, "boat, daily rate", { size: 13 });
    h += g.path("M470,120 H530 V170 H578", { stroke: P.muted, arrow: "a" }) + g.text(536, 140, "new booking", { size: 13, anchor: "start" });
    h += g.path("M470,240 H520 V185 H578", { stroke: P.muted, arrow: "a" }) + g.text(528, 214, "update Paid", { size: 13, anchor: "start" });
    h += g.path("M670,195 V370 H472", { stroke: P.muted, arrow: "a" }) + g.text(570, 358, "booking records", { size: 13 });
    h += g.arrow(300, 380, 162, 380) + g.lines(230, 344, ["daily schedule,", "income report"], { size: 13 }, 16);
    return h + g.text(400, 434, "Rectangle = external entity · rounded box = process · open box = data store · arrow = data flow", { size: 13, fill: P.muted });
  } });

  Diagrams.add("AD03", { cap: "An ER diagram for Erne Boat Hire in third normal form: Customer and Boat each have a one-to-many relationship with Booking, and BoatType has a one-to-many relationship with Boat", draw: function (g) {
    var P = g.P, h = "";
    function ent(x, y, name, attrs) {
      var hh = 42 + attrs.length * 22 + 14, r = g.rect(x, y, 200, hh, { fill: P.card, stroke: P.pcb, sw: 2, r: 8 }) + g.box(x, y, 200, 40, name, { fill: P.pcb, color: P.pcbInk, bold: true, r: 8 });
      attrs.forEach(function (a, i) {
        var key = a.indexOf("PK ") === 0 || a.indexOf("FK ") === 0;
        r += g.text(x + 14, y + 60 + i * 22, key ? a.slice(0, 2) : "", { anchor: "start", size: 13, bold: true, fill: a.indexOf("PK") === 0 ? P.copper : P.ok }) + g.text(x + 46, y + 60 + i * 22, key ? a.slice(3) : a, { anchor: "start", size: 14, mono: true });
      });
      return r;
    }
    function crowH(xe, y, dir) { return g.line(xe, y - 10, xe - dir * 16, y, { stroke: P.ink }) + g.line(xe, y + 10, xe - dir * 16, y, { stroke: P.ink }); }
    h += ent(20, 40, "Customer", ["PK CustomerID", "FirstName", "Surname", "Address", "Postcode", "Phone", "Email"]);
    h += ent(300, 40, "Booking", ["PK BookingID", "FK CustomerID", "FK BoatID", "StartDate", "Days", "Paid"]);
    h += ent(580, 40, "Boat", ["PK BoatID", "BoatName", "FK TypeCode", "Capacity"]);
    h += ent(580, 262, "BoatType", ["PK TypeCode", "Description", "DailyRate"]);
    h += g.line(220, 130, 300, 130, { stroke: P.ink }) + crowH(300, 130, 1) + g.line(230, 120, 230, 140, { stroke: P.ink }) + g.text(262, 112, "makes", { size: 13, fill: P.muted });
    h += g.line(500, 130, 580, 130, { stroke: P.ink }) + crowH(500, 130, -1) + g.line(570, 120, 570, 140, { stroke: P.ink }) + g.text(540, 112, "in", { size: 13, fill: P.muted });
    h += g.line(680, 262, 680, 196, { stroke: P.ink }) + g.line(670, 196, 680, 212, { stroke: P.ink }) + g.line(690, 196, 680, 212, { stroke: P.ink }) + g.line(670, 252, 690, 252, { stroke: P.ink }) + g.text(692, 228, "classifies", { size: 13, anchor: "start", fill: P.muted });
    h += g.lines(20, 300, ["Many-to-many (Customer–Boat) is resolved", "by the link entity Booking.", "DailyRate depends on TypeCode, so it moves", "to BoatType to remove a transitive dependency (3NF)."], { anchor: "start", size: 14 }, 22);
    h += g.line(40, 410, 90, 410, { stroke: P.ink }) + crowH(90, 410, 1) + g.line(50, 400, 50, 420, { stroke: P.ink }) + g.text(100, 410, "one (bar) to many (crow's foot)", { anchor: "start", size: 13, fill: P.muted });
    return h + g.text(340, 432, "PK = primary key · FK = foreign key", { anchor: "start", size: 13, fill: P.muted });
  } });

  Diagrams.add("AD04", { cap: "The order for building a database application, and an annotated screenshot of a booking form showing a lookup, a range check and its error message", draw: function (g) {
    var P = g.P, h = "";
    ["Tables", "Relationships", "Queries", "Forms", "Reports", "Menu, macros"].forEach(function (s, i) {
      var x = 20 + i * 130;
      h += g.box(x, 30, 115, 54, s, { fill: i === 0 ? P.pcb : P.soft, color: i === 0 ? P.pcbInk : P.ink, bold: true, size: 14 });
      if (i < 5) h += g.arrow(x + 116, 57, x + 129, 57);
    });
    h += g.text(400, 104, "Build order: later parts depend on the tables and queries", { size: 13, fill: P.muted });
    h += g.rect(40, 130, 400, 270, { fill: P.card, stroke: P.line, sw: 2, r: 8 }) + g.box(40, 130, 400, 34, "Booking form", { fill: P.pcb, color: P.pcbInk, bold: true, r: 8 });
    [["Customer", "Murphy, Aoife  ▼"], ["Boat", "Lough Lady (4 seat)  ▼"], ["Start date", "12/07/2026"], ["Days", "15"]].forEach(function (f, i) {
      var y = 186 + i * 44;
      h += g.text(60, y + 15, f[0], { anchor: "start", size: 14 }) + g.rect(170, y, 220, 30, { fill: P.paper, stroke: i === 3 ? P.bad : P.line, sw: i === 3 ? 2.5 : 1.5, r: 4 }) + g.text(180, y + 15, f[1], { anchor: "start", size: 14, mono: true });
    });
    h += g.box(60, 362, 360, 28, "Hire must be 1 to 14 days", { fill: P.badSoft, stroke: P.bad, size: 14, bold: true });
    h += g.num(404, 201, "1") + g.num(404, 333, "2") + g.num(432, 376, "3");
    [["1", "Combo box: customer chosen from", "the Customer table (lookup, R3)"], ["2", "Validation rule: Between 1 And 14", "on Days (range check, R6)"], ["3", "Custom validation text so the", "user knows how to fix it"]].forEach(function (c, i) {
      var y = 150 + i * 80;
      h += g.num(490, y + 10, c[0]) + g.lines(512, y + 10, [c[1], c[2]], { anchor: "start", size: 14 }, 20);
    });
    return h + g.lines(470, 384, ["Figure 14: Booking form (R3, R6)", "built from wireframe W2"], { anchor: "start", size: 14, italic: true, fill: P.muted }, 19) + g.text(470, 432, "Crop, call out, caption, link to requirement", { anchor: "start", size: 13, bold: true, fill: P.copper });
  } });

  Diagrams.add("AD05", { cap: "Choosing valid, extreme and invalid test data for a 1 to 14 range, and the cycle from requirements through testing, fixing and retesting to user acceptance testing and evaluation", draw: function (g) {
    var P = g.P, h = "", x = function (v) { return 100 + v * 40; };
    h += g.text(400, 20, "Test data for 'Days: whole number from 1 to 14'", { size: 15, bold: true });
    h += g.rect(x(-1) + 10, 50, x(0.5) - x(-1) - 10, 50, { fill: P.badSoft, r: 4 }) + g.rect(x(0.5), 50, x(14.5) - x(0.5), 50, { fill: P.okSoft, r: 4 }) + g.rect(x(14.5), 50, x(16) - x(14.5) - 10, 50, { fill: P.badSoft, r: 4 });
    h += g.text(x(7.5), 64, "accepted", { size: 13, fill: P.ok, bold: true }) + g.text(x(-0.2), 64, "rejected", { size: 13, fill: P.bad, bold: true }) + g.text(x(15.2), 64, "rejected", { size: 13, fill: P.bad, bold: true });
    h += g.line(x(-1) + 10, 88, x(16) - 10, 88, { stroke: P.ink, sw: 2 });
    for (var v = 0; v <= 15; v++) h += g.line(x(v), 82, x(v), 94, { stroke: P.ink, sw: 1.5 });
    [[0, "invalid", P.bad], [1, "extreme", P.warn], [7, "valid", P.ok], [14, "extreme", P.warn], [15, "invalid", P.bad]].forEach(function (k) {
      h += g.circle(x(k[0]), 88, 8, { fill: k[2] }) + g.text(x(k[0]), 116, String(k[0]), { size: 14, bold: true }) + g.text(x(k[0]), k[1] === "extreme" ? 156 : 136, k[1], { size: 13, fill: k[2], bold: true });
    });
    h += g.text(400, 190, "Also invalid: abc (type), 3.5 (not whole), blank (presence)", { size: 13, fill: P.muted });
    h += g.box(20, 250, 130, 70, ["Numbered", "requirements"], { fill: P.soft, bold: true, size: 14 }) + g.arrow(152, 285, 176, 285);
    h += g.box(178, 250, 140, 70, ["Test plan:", "valid, extreme,", "invalid"], { fill: P.soft, size: 14 }) + g.arrow(320, 285, 344, 285);
    h += g.box(346, 250, 140, 70, ["Run test,", "annotate", "evidence"], { fill: P.soft, size: 14 }) + g.arrow(488, 285, 508, 285);
    h += g.diamond(560, 285, 50, 40, "Pass?");
    h += g.arrow(610, 285, 646, 285, { arrow: "g" }) + g.text(628, 270, "yes", { size: 13, fill: P.ok, bold: true });
    h += g.box(648, 250, 132, 70, ["UAT, then", "evaluate"], { fill: P.okSoft, bold: true, size: 14 });
    h += g.arrow(560, 325, 560, 368, { arrow: "r" }) + g.text(574, 346, "no", { size: 13, fill: P.bad, bold: true, anchor: "start" });
    h += g.box(495, 370, 130, 50, ["Fix, record", "the change"], { fill: P.badSoft, size: 14 });
    h += g.path("M495,395 H416 V322", { stroke: P.muted, arrow: "a" }) + g.text(410, 410, "retest", { size: 13, fill: P.muted, anchor: "end" });
    return h + g.lines(714, 350, ["Each requirement:", "fully / partially /", "not met + evidence"], { size: 13, fill: P.muted }, 18);
  } });

  Diagrams.add("AD06", { cap: "The structure of the single PDF portfolio in six sections, and how one requirement is traced through every section by cross-references", draw: function (g) {
    var P = g.P, h = "";
    h += g.box(20, 20, 760, 40, "Title page  ·  contents page with page numbers  ·  one single PDF", { fill: P.pcb, color: P.pcbInk, bold: true, size: 15 });
    var secs = [["1 Analysis", ["Interview", "Requirements", "DFDs"]], ["2 Design", ["ER diagram", "3NF tables", "Wireframes"]], ["3 Development", ["Tables", "Forms", "Queries"]], ["4 Testing", ["Test plan", "Evidence", "UAT"]], ["5 Evaluation", ["Met?", "Improvements"]], ["6 Appendices", ["Plan and log", "References"]]];
    secs.forEach(function (s, i) {
      var x = 20 + i * 130;
      h += g.rect(x, 80, 115, 160, { fill: P.card, stroke: P.line, sw: 2, r: 6 }) + g.path("M" + (x + 95) + ",80 L" + (x + 115) + ",100", { stroke: P.line, sw: 2 });
      h += g.text(x + 57, 104, s[0], { size: 14, bold: true, fill: P.pcb });
      h += g.lines(x + 57, 140, s[1], { size: 13 }, 26);
    });
    h += g.text(400, 270, "Trace one requirement through the whole PDF", { size: 15, bold: true });
    var chips = [["R6: Days", "1 to 14"], ["Data dictionary:", "Days rule"], ["Figure 14:", "validation rule"], ["Tests 1–5:", "all passed"], ["R6 fully met", "(tests 1–5)"]];
    chips.forEach(function (c, i) {
      var x = 20 + i * 130;
      h += g.box(x, 292, 115, 56, c, { fill: P.copperSoft, stroke: P.copper, size: 13, lh: 20 });
      if (i < 4) h += g.arrow(x + 116, 320, x + 129, 320, { arrow: "c" });
    });
    h += g.box(670, 292, 110, 56, ["Traceability", "table"], { fill: P.okSoft, stroke: P.ok, size: 13, lh: 20, bold: true });
    return h + g.lines(400, 390, ["Every figure: number + caption + requirement, design or test reference", "Annotate, crop, cross-reference, reference your sources, then check the exported PDF"], { size: 14 }, 26);
  } });
})();

