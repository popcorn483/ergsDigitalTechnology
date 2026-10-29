// Adds PowerPoint animations and interactivity to decks built by pptxgenjs.
// Every slide gets a transition, and everything on it animates:
//   - the title fades in as the slide opens, with the slide's static shapes (cards, icons, labels);
//   - body placeholders (title/section slides) build paragraph by paragraph automatically;
//   - tables wipe in automatically after the title.
// Shapes can also be tagged through their name (objectName); a name may hold several space-separated tags:
//   anim:para   – text builds one paragraph per click            anim:click  – appears on click (fade)
//   anim:with   – appears together with the previous effect      anim:auto   – fades in automatically after the title
//   anim:wipe   – wipes in from the top on click                 anim:reveal – an answer that appears on click
//   trig:KEY    – a button: clicking it plays every effect tagged on:KEY (PowerPoint "trigger")
//   on:KEY      – appears when the trig:KEY button is clicked
//   btn         – the whole shape (not just its text) follows the hyperlink in its text
// Works in Node (pass JSZip) and the browser.
(function (root) {
  "use strict";
  function shapes(xml) {
    var out = [], re = /<p:(sp|pic|graphicFrame)>([\s\S]*?)<\/p:\1>/g, m;
    while ((m = re.exec(xml))) {
      var inner = m[2], nv = /<p:cNvPr id="(\d+)" name="([^"]*)"/.exec(inner);
      if (!nv) continue;
      var ph = /<p:ph\b[^>]*?type="(\w+)"/.exec(inner), hasPh = /<p:ph\b/.test(inner);
      var paras = (inner.match(/<a:p>|<a:p\/>|<a:p /g) || []).length;
      out.push({ kind: m[1], id: nv[1], name: nv[2], tags: nv[2].split(/\s+/), paras: paras, hasText: /<a:t>/.test(inner), ph: ph ? ph[1] : hasPh ? "body" : null, start: m.index, len: m[0].length });
    }
    return out;
  }
  function tag(s, prefix) { for (var i = 0; i < s.tags.length; i++) if (s.tags[i].indexOf(prefix) === 0) return s.tags[i].slice(prefix.length); return null; }
  function tags(s, prefix) { return s.tags.filter(function (t) { return t.indexOf(prefix) === 0; }).map(function (t) { return t.slice(prefix.length); }); }
  function effect(ids, kind, tgt, node, delay, dur) {
    var ctn = ids(), set = ids(), anim = ids();
    var wipe = kind === "wipe", filt = wipe ? "wipe(down)" : "fade", preset = wipe ? 22 : 10, sub = wipe ? 4 : 0;
    return '<p:par><p:cTn id="' + ctn + '" presetID="' + preset + '" presetClass="entr" presetSubtype="' + sub + '" fill="hold" grpId="0" nodeType="' + node + '"><p:stCondLst><p:cond delay="' + (delay || 0) + '"/></p:stCondLst><p:childTnLst>' +
      '<p:set><p:cBhvr><p:cTn id="' + set + '" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn><p:tgtEl>' + tgt + '</p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>' +
      '<p:animEffect transition="in" filter="' + filt + '"><p:cBhvr><p:cTn id="' + anim + '" dur="' + (dur || (wipe ? 500 : 400)) + '"/><p:tgtEl>' + tgt + "</p:tgtEl></p:cBhvr></p:animEffect></p:childTnLst></p:cTn></p:par>";
  }
  function inner(ids, effects, at) { return '<p:par><p:cTn id="' + ids() + '" fill="hold"><p:stCondLst><p:cond delay="' + (at || 0) + '"/></p:stCondLst><p:childTnLst>' + effects.join("") + "</p:childTnLst></p:cTn></p:par>"; }
  function group(ids, steps, auto) {
    // steps: [{e: [effects], d: duration in ms}]; each step starts when the previous one has finished
    var outer = ids(), t = 0, body = steps.map(function (st) { var x = inner(ids, st.e, t); t += st.d || 0; return x; }).join("");
    var cond = auto ? '<p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond>' : '<p:cond delay="indefinite"/>';
    return '<p:par><p:cTn id="' + outer + '" fill="hold"><p:stCondLst>' + cond + "</p:stCondLst><p:childTnLst>" + body + "</p:childTnLst></p:cTn></p:par>";
  }
  function sp(id) { return '<p:spTgt spid="' + id + '"/>'; }
  function timingFor(xml) {
    var list = shapes(xml);
    if (!list.length) return "";
    var n = 2, ids = function () { return ++n; };
    var title = [], statics = [], bodyAuto = [], tables = [], autos = [], clicks = [], trig = {}, bld = {}, last = null;
    function build(s, para) { if (s.kind === "sp") bld[s.id] = '<p:bldP spid="' + s.id + '" grpId="0"' + (para ? ' build="p"' : ' animBg="1"') + "/>"; else if (s.kind === "graphicFrame") bld[s.id] = '<p:bldGraphic spid="' + s.id + '" grpId="0"><p:bldAsOne/></p:bldGraphic>'; }
    list.forEach(function (s) {
      var a = tag(s, "anim:"), ons = tags(s, "on:");
      ons.forEach(function (k) { (trig[k] = trig[k] || { on: [] }).on.push(s); });
      var t = tag(s, "trig:"); if (t) (trig[t] = trig[t] || { on: [] }).btn = s;
      if (s.ph === "title" || s.ph === "ctrTitle") { title.push(effect(ids, "fade", sp(s.id), title.length ? "withEffect" : "afterEffect", 0, 450)); build(s); return; }
      if (a === "auto") { autos.push(effect(ids, "fade", sp(s.id), autos.length ? "withEffect" : "afterEffect", 0, 500)); build(s); return; }
      if (a === "para" && s.paras > 0) {
        for (var p = 0; p < s.paras; p++) { last = [effect(ids, "fade", '<p:spTgt spid="' + s.id + '"><p:txEl><p:pRg st="' + p + '" end="' + p + '"/></p:txEl></p:spTgt>', "clickEffect")]; clicks.push(last); }
        build(s, true); return;
      }
      if (a === "with" && last) { last.push(effect(ids, "fade", sp(s.id), "withEffect")); build(s); return; }
      if (a) { last = [effect(ids, a === "wipe" ? "wipe" : "fade", sp(s.id), "clickEffect")]; clicks.push(last); build(s); return; }
      if (ons.length) { build(s); return; } // shown only by its trigger
      if (s.kind === "graphicFrame") { tables.push(effect(ids, "wipe", sp(s.id), tables.length ? "withEffect" : "afterEffect", 0, 600)); build(s); return; }
      if (s.ph && s.paras > 1 && s.hasText) { // title/section slide body: paragraphs appear one after another
        for (var q = 0; q < s.paras; q++) bodyAuto.push(effect(ids, "fade", '<p:spTgt spid="' + s.id + '"><p:txEl><p:pRg st="' + q + '" end="' + q + '"/></p:txEl></p:spTgt>', "afterEffect", 0, 350));
        build(s, true); return;
      }
      statics.push(effect(ids, "fade", sp(s.id), "withEffect", 0, 450)); build(s);
    });
    // automatic sequence: title (with static shapes) -> body paragraphs -> tables -> anim:auto items
    var steps = [];
    if (title.length || statics.length) steps.push({ e: title.concat(statics).map(function (e, i) { return i ? e.replace('nodeType="afterEffect"', 'nodeType="withEffect"') : e.replace('nodeType="withEffect"', 'nodeType="afterEffect"'); }), d: 450 });
    bodyAuto.forEach(function (e) { steps.push({ e: [e], d: 300 }); });
    if (tables.length) steps.push({ e: tables, d: 600 });
    if (autos.length) steps.push({ e: autos, d: 500 });
    var pars = (steps.length ? [group(ids, steps, true)] : []).concat(clicks.map(function (c) { return group(ids, [{ e: c, d: 0 }], false); }));
    var main = pars.length ? '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>' + pars.join("") +
      '</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>' : "";
    // interactive sequences (triggers)
    var inter = "";
    Object.keys(trig).forEach(function (k) {
      var tr = trig[k]; if (!tr.btn || !tr.on.length) return;
      var effs = tr.on.map(function (s, i) { return effect(ids, "fade", sp(s.id), i ? "withEffect" : "clickEffect", 0, 300); });
      inter += '<p:seq concurrent="1" nextAc="seek"><p:cTn id="' + ids() + '" restart="whenNotActive" fill="hold" evtFilter="cancelBubble" nodeType="interactiveSeq"><p:stCondLst><p:cond evt="onClick" delay="0"><p:tgtEl>' + sp(tr.btn.id) + '</p:tgtEl></p:cond></p:stCondLst><p:endSync evt="end" delay="0"><p:rtn val="all"/></p:endSync><p:childTnLst>' +
        inner(ids, effs, 0) + '</p:childTnLst></p:cTn><p:nextCondLst><p:cond evt="onClick" delay="0"><p:tgtEl>' + sp(tr.btn.id) + "</p:tgtEl></p:cond></p:nextCondLst></p:seq>";
    });
    if (!main && !inter) return "";
    // mainSeq must have id 2 (the auto group refers to it); renumber if there is no main sequence
    var b = Object.keys(bld).map(function (k) { return bld[k]; });
    return '<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>' + main + inter + "</p:childTnLst></p:cTn></p:par></p:tnLst>" +
      (b.length ? "<p:bldLst>" + b.join("") + "</p:bldLst>" : "") + "</p:timing>";
  }
  // shapes tagged btn: copy the text's slide-jump hyperlink onto the whole shape, so a tap anywhere on the button works
  function shapeLinks(xml) {
    return xml.replace(/<p:sp>([\s\S]*?)<\/p:sp>/g, function (whole, inner) {
      var nv = /<p:cNvPr id="(\d+)" name="([^"]*)"(\s*\/>|><\/p:cNvPr>|>)/.exec(inner);
      if (!nv || !/(^|\s)btn(\s|$)/.test(nv[2])) return whole;
      var h = /<a:hlinkClick ([^>]*?)\/?>/.exec(inner); if (!h) return whole;
      if (/<p:cNvPr[^>]*>\s*<a:hlinkClick/.test(inner)) return whole;
      var rid = /r:id="[^"]*"/.exec(h[1]), act = /action="[^"]*"/.exec(h[1]);
      var open = '<p:cNvPr id="' + nv[1] + '" name="' + nv[2] + '">';
      return whole.replace(nv[0], open + "<a:hlinkClick " + (rid ? rid[0] : "") + " " + (act ? act[0] : "") + "/></p:cNvPr>").replace(/ u="sng"/g, "");
    });
  }
  var TRANS = ['<p:transition spd="med"><p:fade/></p:transition>', '<p:transition spd="med"><p:push dir="u"/></p:transition>'];
  function processXml(xml) {
    if (/<p:timing>/.test(xml)) return xml;
    xml = shapeLinks(xml);
    var section = /name="slide-kind:section"/.test(xml);
    var add = TRANS[section ? 1 : 0] + timingFor(xml);
    var at = xml.indexOf("<p:extLst>", xml.indexOf("</p:clrMapOvr>"));
    if (at < 0) at = xml.lastIndexOf("</p:sld>");
    return xml.slice(0, at) + add + xml.slice(at);
  }
  async function processZip(zip) {
    var names = Object.keys(zip.files).filter(function (f) { return /^ppt\/slides\/slide\d+\.xml$/.test(f); });
    for (var i = 0; i < names.length; i++) { var x = await zip.file(names[i]).async("string"); zip.file(names[i], processXml(x)); }
    return zip;
  }
  // data: ArrayBuffer/Buffer/Uint8Array of a .pptx; returns a Buffer in Node, or a Blob in the browser if asBlob
  async function animate(JSZip, data, asBlob) {
    var zip = await JSZip.loadAsync(data);
    await processZip(zip);
    return zip.generateAsync({ type: asBlob ? "blob" : "nodebuffer", compression: "DEFLATE", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
  }
  root.Animate = { animate: animate, processXml: processXml, timingFor: timingFor };
})(typeof window !== "undefined" ? window : global);
