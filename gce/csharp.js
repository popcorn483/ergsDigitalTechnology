// A small C# interpreter for GCSE-level programs, so code can run in the browser.
// Supports: Main or top-level statements, static methods, simple classes, int/double/string/char/bool,
// arrays, List<T>, Console, Convert, Parse/TryParse, Math, string methods, if/switch/loops,
// try/catch/finally, StreamReader/StreamWriter/File (in-memory files), Random, interpolated strings.
(function (root) {
  "use strict";

  // ---------- errors ----------
  function CompileError(msg, line) { this.msg = msg; this.line = line; }
  function CsException(type, message) { this.type = type; this.message = message; }
  function Signal(kind, value) { this.kind = kind; this.value = value; }
  function StopRun() {}

  // ---------- lexer ----------
  var KW = ("abstract as base bool break byte case catch char class const continue decimal default do double else enum false finally float for foreach if in int interface internal is long namespace new null object out override private protected public readonly ref return sealed short static string struct switch this throw true try uint ulong using var virtual void while").split(" ");
  var KWS = {}; KW.forEach(function (k) { KWS[k] = 1; });
  var PUNCT = ["<<=", ">>=", "??=", "++", "--", "+=", "-=", "*=", "/=", "%=", "==", "!=", "<=", ">=", "&&", "||", "=>", "??", "<<", ">>", "+", "-", "*", "/", "%", "=", "<", ">", "!", "?", ":", ".", ",", ";", "(", ")", "[", "]", "{", "}", "&", "|", "^", "~"];

  function lex(src) {
    var toks = [], i = 0, line = 1, n = src.length;
    function push(t, v, extra) { var o = { t: t, v: v, line: line }; if (extra) for (var k in extra) o[k] = extra[k]; toks.push(o); }
    function readEscape() {
      var c = src[++i];
      var map = { n: "\n", t: "\t", r: "\r", "0": "\0", "\\": "\\", "'": "'", '"': '"', a: "\x07", b: "\b", f: "\f", v: "\v" };
      if (c === "u") { var h = src.substr(i + 1, 4); i += 4; return String.fromCharCode(parseInt(h, 16)); }
      if (c in map) return map[c];
      throw new CompileError("error CS1009: Unrecognized escape sequence '\\" + c + "'", line);
    }
    while (i < n) {
      var c = src[i];
      if (c === "\n") { line++; i++; continue; }
      if (/\s/.test(c)) { i++; continue; }
      if (c === "/" && src[i + 1] === "/") { while (i < n && src[i] !== "\n") i++; continue; }
      if (c === "/" && src[i + 1] === "*") { i += 2; while (i < n && !(src[i] === "*" && src[i + 1] === "/")) { if (src[i] === "\n") line++; i++; } i += 2; continue; }
      if (c === "#") { while (i < n && src[i] !== "\n") i++; continue; }
      // interpolated / verbatim strings
      if ((c === "$" && (src[i + 1] === '"' || (src[i + 1] === "@" && src[i + 2] === '"'))) || (c === "@" && src[i + 1] === "$" && src[i + 2] === '"')) {
        var verb = src.substr(i, 3).indexOf("@") > -1; i += verb ? 3 : 2;
        var parts = [], buf = "", startLine = line;
        while (true) {
          if (i >= n) throw new CompileError("error CS1010: Newline in constant", startLine);
          var ch = src[i];
          if (ch === '"') { if (verb && src[i + 1] === '"') { buf += '"'; i += 2; continue; } i++; break; }
          if (ch === "\n" && !verb) throw new CompileError("error CS1010: Newline in constant", line);
          if (ch === "\\" && !verb) { buf += readEscape(); i++; continue; }
          if (ch === "{" && src[i + 1] === "{") { buf += "{"; i += 2; continue; }
          if (ch === "}" && src[i + 1] === "}") { buf += "}"; i += 2; continue; }
          if (ch === "{") {
            if (buf) parts.push(buf); buf = "";
            var depth = 1, j = i + 1, inStr = false;
            while (j < n && depth) { var d = src[j]; if (inStr) { if (d === "\\") j++; else if (d === '"') inStr = false; } else if (d === '"') inStr = true; else if (d === "{") depth++; else if (d === "}") depth--; if (depth) j++; }
            var inner = src.slice(i + 1, j), fmt = null, align = null;
            // split off :format and ,alignment at top level
            var lvl = 0, cut = -1, acut = -1, s2 = false;
            for (var q = 0; q < inner.length; q++) { var e = inner[q]; if (s2) { if (e === '"') s2 = false; continue; } if (e === '"') s2 = true; else if (e === "(" || e === "[") lvl++; else if (e === ")" || e === "]") lvl--; else if (lvl === 0 && e === ":" && inner.indexOf("?") < 0 && cut < 0) cut = q; else if (lvl === 0 && e === "," && acut < 0 && cut < 0) acut = q; }
            if (cut > -1) { fmt = inner.slice(cut + 1); inner = inner.slice(0, cut); }
            if (acut > -1) { align = parseInt(inner.slice(acut + 1), 10); inner = inner.slice(0, acut); }
            parts.push({ code: inner, fmt: fmt, align: align, line: line });
            i = j + 1; continue;
          }
          if (ch === "\n") line++;
          buf += ch; i++;
        }
        if (buf || !parts.length) parts.push(buf);
        push("interp", parts); continue;
      }
      if (c === "@" && src[i + 1] === '"') {
        i += 2; var s = "";
        while (i < n) { if (src[i] === '"') { if (src[i + 1] === '"') { s += '"'; i += 2; continue; } i++; break; } if (src[i] === "\n") line++; s += src[i++]; }
        push("str", s); continue;
      }
      if (c === '"') {
        i++; var str = "", sl = line;
        while (true) {
          if (i >= n || src[i] === "\n") throw new CompileError("error CS1010: Newline in constant (missing closing \")", sl);
          if (src[i] === '"') { i++; break; }
          if (src[i] === "\\") { str += readEscape(); i++; continue; }
          str += src[i++];
        }
        push("str", str); continue;
      }
      if (c === "'") {
        i++; var ch2 = src[i] === "\\" ? readEscape() : src[i]; i++;
        if (src[i] !== "'") throw new CompileError("error CS1012: Too many characters in character literal", line);
        i++; push("char", ch2); continue;
      }
      if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1]))) {
        var m = /^(\d[\d_]*)?(\.\d+)?([eE][+-]?\d+)?([mMfFdDlLuU]{0,2})/.exec(src.slice(i));
        var txt = m[0].replace(/_/g, ""), suf = (m[4] || "").toLowerCase();
        var isReal = !!(m[2] || m[3]) || /[mfd]/.test(suf);
        push("num", parseFloat(txt), { real: isReal });
        i += m[0].length; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        var id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))[0];
        push(KWS[id] ? "kw" : "id", id); i += id.length; continue;
      }
      var p = null;
      for (var k = 0; k < PUNCT.length; k++) if (src.substr(i, PUNCT[k].length) === PUNCT[k]) { p = PUNCT[k]; break; }
      if (!p) throw new CompileError("error CS1056: Unexpected character '" + c + "'", line);
      push("p", p); i += p.length;
    }
    push("eof", null);
    return toks;
  }

  // ---------- parser ----------
  var TYPE_KW = { int: 1, double: 1, string: 1, char: 1, bool: 1, float: 1, decimal: 1, long: 1, short: 1, byte: 1, object: 1, var: 1, void: 1, uint: 1, ulong: 1 };
  var MODS = { public: 1, private: 1, protected: 1, internal: 1, static: 1, readonly: 1, const: 1, override: 1, virtual: 1, abstract: 1, sealed: 1 };

  function Parser(toks) { this.t = toks; this.i = 0; }
  Parser.prototype = {
    peek: function (o) { return this.t[this.i + (o || 0)]; },
    next: function () { return this.t[this.i++]; },
    is: function (v, o) { var t = this.peek(o); return t && (t.t === "p" || t.t === "kw") && t.v === v; },
    accept: function (v) { if (this.is(v)) { return this.next(); } return null; },
    expect: function (v, what) {
      if (this.is(v)) return this.next();
      var t = this.peek(), prev = this.t[this.i - 1];
      var line = (v === ";" || v === ")") && prev ? prev.line : t.line;
      var code = v === ";" ? "CS1002" : v === ")" ? "CS1026" : v === "}" ? "CS1513" : v === "{" ? "CS1514" : "CS1003";
      throw new CompileError("error " + code + ": " + (v === ";" ? "; expected" : "'" + v + "' expected") +  (what ? " " + what : "") + (t.t !== "eof" && v !== ";" ? " (found '" + (t.v == null ? t.t : t.v) + "')" : ""), line);
    },
    ident: function () { var t = this.peek(); if (t.t === "id") return this.next().v; throw new CompileError("error CS1001: Identifier expected (found '" + (t.v == null ? "end of file" : t.v) + "')", t.line); },

    // Is a type starting here? Returns index after type or -1
    typeEnd: function (o) {
      var j = this.i + (o || 0), t = this.t[j];
      if (!t) return -1;
      if (!((t.t === "kw" && TYPE_KW[t.v]) || t.t === "id")) return -1;
      j++;
      if (this.t[j] && this.t[j].v === "." && this.t[j].t === "p" && this.t[j + 1] && this.t[j + 1].t === "id" && t.t === "id") { j += 2; }
      if (this.t[j] && this.t[j].t === "p" && this.t[j].v === "<") { // generic
        var depth = 1; j++;
        while (this.t[j] && depth) { if (this.t[j].v === "<") depth++; else if (this.t[j].v === ">") depth--; else if (this.t[j].v === ">>") depth -= 2; else if (!(this.t[j].t === "id" || this.t[j].t === "kw" || this.t[j].v === "," || this.t[j].v === "[" || this.t[j].v === "]")) return -1; j++; }
        if (depth > 0) return -1;
      }
      if (this.t[j] && this.t[j].v === "?" && this.t[j].t === "p" && this.t[j + 1] && this.t[j + 1].t === "id") j++;
      while (this.t[j] && this.t[j].v === "[" && this.t[j + 1] && (this.t[j + 1].v === "]" || this.t[j + 1].v === ",")) { j += 2; while (this.t[j - 1].v === ",") j++; }
      return j;
    },
    parseType: function () {
      var t = this.next(), name = t.v;
      if (this.is(".") && this.peek(1).t === "id" && t.t === "id") { this.next(); name = this.next().v; }
      var gen = null;
      if (this.is("<")) { this.next(); gen = [this.parseType()]; while (this.accept(",")) gen.push(this.parseType()); if (this.is(">>")) { this.t[this.i] = { t: "p", v: ">", line: this.peek().line }; } else this.expect(">"); }
      this.accept("?");
      var rank = 0, two = false;
      while (this.is("[") && (this.is("]", 1) || this.is(",", 1))) { this.next(); while (this.accept(",")) two = true; this.next(); rank++; }
      return { name: name, gen: gen, rank: rank, two: two };
    },
    isDecl: function () {
      var e = this.typeEnd(); if (e < 0) return false;
      var a = this.t[e];
      return a && a.t === "id" && this.t[e + 1] && this.t[e + 1].t === "p" && /^(=|;|,|\)|in)$/.test(this.t[e + 1].v) || (a && a.t === "id" && this.t[e + 1] && this.t[e + 1].v === "in");
    },

    program: function () {
      var classes = {}, top = [], line = this.peek().line;
      while (!this.is("eof") && this.peek().t !== "eof") {
        if (this.is("using") && !this.is("(", 1)) { while (!this.accept(";")) this.next(); continue; }
        if (this.is("namespace")) { this.next(); while (!this.is("{") && !this.is(";")) this.next(); if (this.accept(";")) continue; this.next(); this.members(classes, true); this.expect("}"); continue; }
        var save = this.i; while (this.peek().t === "kw" && MODS[this.peek().v]) this.next();
        if (this.is("class") || this.is("struct")) { this.next(); this.classDecl(classes); continue; }
        if (this.is("enum")) { this.next(); this.enumDecl(classes); continue; }
        this.i = save;
        top.push(this.statement());
      }
      return { classes: classes, top: top, line: line };
    },
    members: function (classes, nsLevel) {
      while (!this.is("}") && this.peek().t !== "eof") {
        while (this.peek().t === "kw" && MODS[this.peek().v]) this.next();
        if (this.is("class") || this.is("struct")) { this.next(); this.classDecl(classes); continue; }
        if (this.is("enum")) { this.next(); this.enumDecl(classes); continue; }
        throw new CompileError("error CS0116: A namespace cannot directly contain members such as fields or methods", this.peek().line);
      }
    },
    enumDecl: function (classes) {
      var name = this.ident(); this.expect("{"); var vals = {}, k = 0;
      while (!this.is("}")) { var id = this.ident(); if (this.accept("=")) k = this.next().v; vals[id] = k++; this.accept(","); }
      this.expect("}"); classes[name] = { name: name, isEnum: true, vals: vals };
    },
    classDecl: function (classes) {
      var name = this.ident(), cls = { name: name, fields: [], sfields: [], methods: {}, ctor: null, props: [] };
      if (this.accept(":")) { cls.base = this.ident(); while (this.accept(",")) this.ident(); }
      this.expect("{");
      while (!this.is("}")) {
        if (this.peek().t === "eof") throw new CompileError("error CS1513: } expected", this.peek().line);
        var mods = {};
        while (this.peek().t === "kw" && MODS[this.peek().v]) mods[this.next().v] = 1;
        if (this.is("class") || this.is("struct")) { this.next(); this.classDecl(classes); continue; }
        if (this.is("enum")) { this.next(); this.enumDecl(classes); continue; }
        var line = this.peek().line;
        if (this.peek().t === "id" && this.peek().v === name && this.is("(", 1)) { // constructor
          this.next(); var params = this.params(), chain = null;
          if (this.accept(":")) { var ck = this.next().v; chain = { kind: ck, args: this.args() }; }
          var ctor = { params: params, body: this.block(), line: line, chain: chain, isCtor: true };
          if (cls.ctor) cls.ctor.overloads.push(ctor); else { ctor.overloads = []; cls.ctor = ctor; }
          continue;
        }
        var type = this.parseType(), mname = this.ident();
        if (this.is("(")) {
          var ps = this.params(), body;
          if (this.accept("=>")) { var ex = this.expr(); this.expect(";"); body = { k: "block", body: [type.name === "void" ? { k: "expr", e: ex } : { k: "return", e: ex, line: line }] }; }
          else if (this.accept(";")) body = { k: "block", body: [], line: line, isAbstract: true };
          else body = this.block();
          if (cls.methods[mname]) { cls.methods[mname].overloads.push({ params: ps, body: body, type: type, isStatic: !!mods.static }); }
          else cls.methods[mname] = { name: mname, params: ps, body: body, type: type, isStatic: !!mods.static, line: line, overloads: [] };
          continue;
        }
        if (this.is("=>")) { // expression-bodied read-only property: public string Name => name;
          this.next(); var pex = this.expr(); this.expect(";");
          cls.props.push({ name: mname, type: type, get: { k: "block", body: [{ k: "return", e: pex, line: line }] }, line: line }); continue;
        }
        if (this.is("{")) { // property: auto { get; set; } or with accessor bodies
          this.next(); var acc = {}, hasBody = false;
          while (!this.is("}")) {
            if (this.peek().t === "eof") throw new CompileError("error CS1513: } expected", line);
            while (this.peek().t === "kw" && MODS[this.peek().v]) this.next();
            var an = this.next().v;
            if (this.accept(";")) { acc[an] = "auto"; continue; }
            hasBody = true;
            if (this.accept("=>")) { var aex = this.expr(); this.expect(";"); acc[an] = { k: "block", body: [an === "get" ? { k: "return", e: aex, line: line } : { k: "expr", e: aex }] }; }
            else acc[an] = this.block();
          }
          this.next();
          var init = null; if (this.accept("=")) { init = this.expr(); this.expect(";"); }
          if (!hasBody) (mods.static ? cls.sfields : cls.fields).push({ name: mname, type: type, init: init, line: line });
          else cls.props.push({ name: mname, type: type, get: acc.get && acc.get !== "auto" ? acc.get : null, set: acc.set && acc.set !== "auto" ? acc.set : null, line: line });
          continue;
        }
        var decls = [{ name: mname, init: this.accept("=") ? this.varInit(type) : null }];
        while (this.accept(",")) { var nm = this.ident(); decls.push({ name: nm, init: this.accept("=") ? this.varInit(type) : null }); }
        this.expect(";");
        decls.forEach(function (d) { (mods.static || mods.const ? cls.sfields : cls.fields).push({ name: d.name, type: type, init: d.init, line: line, isConst: !!mods.const }); });
      }
      this.expect("}");
      classes[name] = cls;
    },
    params: function () {
      this.expect("("); var ps = [];
      if (!this.is(")")) do { var mod = null; if (this.is("ref") || this.is("out") || this.is("params")) mod = this.next().v; var ty = this.parseType(); var nm = this.ident(); var def = this.accept("=") ? this.expr() : null; ps.push({ name: nm, type: ty, mod: mod, def: def }); } while (this.accept(","));
      this.expect(")"); return ps;
    },
    block: function () {
      var line = this.peek().line; this.expect("{"); var body = [];
      while (!this.is("}")) { if (this.peek().t === "eof") throw new CompileError("error CS1513: } expected", line); body.push(this.statement()); }
      this.next(); return { k: "block", body: body, line: line };
    },
    varInit: function (type) { if (this.is("{")) return this.arrayLit(type); return this.expr(); },
    arrayLit: function (type) {
      var line = this.peek().line; this.expect("{"); var items = [];
      while (!this.is("}")) { items.push(this.is("{") ? this.arrayLit() : this.expr()); if (!this.accept(",")) break; }
      this.expect("}"); return { k: "arrlit", items: items, type: type, line: line };
    },
    localDecl: function () {
      var line = this.peek().line, type = this.parseType(), decls = [];
      do { var nm = this.ident(); decls.push({ name: nm, init: this.accept("=") ? this.varInit(type) : null }); } while (this.accept(","));
      return { k: "decl", type: type, decls: decls, line: line };
    },
    embedded: function () { return this.statement(); },
    statement: function () {
      var t = this.peek(), line = t.line;
      if (this.is("{")) return this.block();
      if (this.accept(";")) return { k: "empty" };
      while (this.is("static") || this.is("public") || this.is("private")) this.next();
      if (this.is("const")) { this.next(); var d = this.localDecl(); d.isConst = true; this.expect(";"); return d; }
      if (this.accept("if")) {
        this.expect("("); var c = this.expr(); this.expect(")");
        var th = this.embedded(), el = null;
        if (this.accept("else")) el = this.embedded();
        return { k: "if", c: c, th: th, el: el, line: line };
      }
      if (this.accept("while")) { this.expect("("); var wc = this.expr(); this.expect(")"); return { k: "while", c: wc, body: this.embedded(), line: line }; }
      if (this.accept("do")) { var db = this.embedded(); this.expect("while"); this.expect("("); var dc = this.expr(); this.expect(")"); this.expect(";"); return { k: "do", c: dc, body: db, line: line }; }
      if (this.accept("for")) {
        this.expect("("); var init = null, cond = null, step = [];
        if (!this.is(";")) init = this.isDecl() ? this.localDecl() : { k: "expr", e: this.expr() };
        this.expect(";"); if (!this.is(";")) cond = this.expr(); this.expect(";");
        if (!this.is(")")) { do step.push(this.expr()); while (this.accept(",")); }
        this.expect(")"); return { k: "for", init: init, c: cond, step: step, body: this.embedded(), line: line };
      }
      if (this.accept("foreach")) {
        this.expect("("); var ft = this.parseType(), fn = this.ident(); this.expect("in"); var fe = this.expr(); this.expect(")");
        return { k: "foreach", type: ft, name: fn, e: fe, body: this.embedded(), line: line };
      }
      if (this.accept("switch")) {
        this.expect("("); var se = this.expr(); this.expect(")"); this.expect("{"); var cases = [];
        while (!this.is("}")) {
          var labels = [], body = [];
          while (this.is("case") || this.is("default")) {
            if (this.accept("default")) { labels.push(null); this.expect(":"); }
            else { this.next(); var ce = this.expr(); var when = null; if (this.peek().t === "id" && this.peek().v === "when") { this.next(); when = this.expr(); } labels.push(ce); this.expect(":"); }
          }
          if (!labels.length) throw new CompileError("error CS1525: case or default expected", this.peek().line);
          while (!this.is("case") && !this.is("default") && !this.is("}")) body.push(this.statement());
          cases.push({ labels: labels, body: body });
        }
        this.next(); return { k: "switch", e: se, cases: cases, line: line };
      }
      if (this.accept("break")) { this.expect(";"); return { k: "break", line: line }; }
      if (this.accept("continue")) { this.expect(";"); return { k: "continue", line: line }; }
      if (this.accept("return")) { var re = this.is(";") ? null : this.expr(); this.expect(";"); return { k: "return", e: re, line: line }; }
      if (this.accept("throw")) { var te = this.is(";") ? null : this.expr(); this.expect(";"); return { k: "throw", e: te, line: line }; }
      if (this.accept("try")) {
        var tb = this.block(), catches = [], fin = null;
        while (this.accept("catch")) {
          var ct = null, cn = null;
          if (this.accept("(")) { ct = this.parseType().name; if (this.peek().t === "id") cn = this.next().v; this.expect(")"); }
          var wh = null; if (this.peek().t === "id" && this.peek().v === "when") { this.next(); this.expect("("); wh = this.expr(); this.expect(")"); }
          catches.push({ type: ct, name: cn, when: wh, body: this.block() });
        }
        if (this.accept("finally")) fin = this.block();
        if (!catches.length && !fin) throw new CompileError("error CS1524: Expected catch or finally", line);
        return { k: "try", body: tb, catches: catches, fin: fin, line: line };
      }
      if (this.is("using") && this.is("(", 1)) {
        this.next(); this.next(); var ud = this.isDecl() ? this.localDecl() : { k: "expr", e: this.expr() }; this.expect(")");
        return { k: "using", d: ud, body: this.embedded(), line: line };
      }
      if (this.is("using") && this.typeEnd(1) > -1) { this.next(); var ud2 = this.localDecl(); this.expect(";"); return ud2; }
      // local function: type name (
      var te2 = this.typeEnd();
      if (te2 > -1 && this.t[te2] && this.t[te2].t === "id" && this.t[te2 + 1] && this.t[te2 + 1].v === "(" && (this.peek().t === "kw" ? TYPE_KW[this.peek().v] : true)) {
        // could be a call like Foo(x) — only treat as local function if followed by a body
        var save = this.i; var ty = this.parseType(); var fname = this.ident();
        var ps = this.params();
        if (this.is("{") || this.is("=>")) {
          var fbody; if (this.accept("=>")) { var fx = this.expr(); this.expect(";"); fbody = { k: "block", body: [{ k: "return", e: fx }] }; } else fbody = this.block();
          return { k: "localfn", m: { name: fname, params: ps, body: fbody, type: ty, isStatic: true, overloads: [] }, line: line };
        }
        this.i = save;
      }
      if (this.isDecl()) { var ld = this.localDecl(); this.expect(";"); return ld; }
      var e = this.expr();
      if (!(e.k === "assign" || e.k === "call" || e.k === "incdec" || e.k === "new" || e.k === "await")) {
        if (this.is(";")) throw new CompileError("error CS0201: Only assignment, call, increment, decrement and new object expressions can be used as a statement", line);
      }
      this.expect(";");
      return { k: "expr", e: e, line: line };
    },

    // expressions
    expr: function () { return this.assign(); },
    assign: function () {
      var l = this.ternary();
      var t = this.peek();
      if (t.t === "p" && /^(=|\+=|-=|\*=|\/=|%=|\?\?=)$/.test(t.v)) {
        this.next(); var r = this.assign();
        if (!(l.k === "id" || l.k === "member" || l.k === "index")) throw new CompileError("error CS0131: The left-hand side of an assignment must be a variable", t.line);
        return { k: "assign", op: t.v, l: l, r: r, line: t.line };
      }
      return l;
    },
    ternary: function () {
      var c = this.nullco();
      if (this.is("?")) { var line = this.next().line; var a = this.assign(); this.expect(":"); var b = this.assign(); return { k: "cond", c: c, a: a, b: b, line: line }; }
      return c;
    },
    nullco: function () { var l = this.bin(0); while (this.is("??")) { var line = this.next().line; l = { k: "bin", op: "??", l: l, r: this.bin(0), line: line }; } return l; },
    bin: function (lvl) {
      var LV = [["||"], ["&&"], ["|"], ["^"], ["&"], ["==", "!="], ["<", ">", "<=", ">=", "is", "as"], ["<<", ">>"], ["+", "-"], ["*", "/", "%"]];
      if (lvl >= LV.length) return this.unary();
      var l = this.bin(lvl + 1);
      while (true) {
        var t = this.peek();
        if (!((t.t === "p" || t.t === "kw") && LV[lvl].indexOf(t.v) > -1)) break;
        this.next();
        if (t.v === "is" || t.v === "as") { var ty = this.parseType(); l = { k: t.v, e: l, type: ty, line: t.line }; continue; }
        l = { k: "bin", op: t.v, l: l, r: this.bin(lvl + 1), line: t.line };
      }
      return l;
    },
    unary: function () {
      var t = this.peek();
      if (t.t === "p" && (t.v === "!" || t.v === "-" || t.v === "+" || t.v === "~")) { this.next(); return { k: "un", op: t.v, e: this.unary(), line: t.line }; }
      if (t.t === "p" && (t.v === "++" || t.v === "--")) { this.next(); return { k: "incdec", op: t.v, pre: true, e: this.unary(), line: t.line }; }
      // cast: (type)expr
      if (this.is("(")) {
        var e = this.typeEnd(1);
        if (e > -1 && this.t[e] && this.t[e].v === ")" && this.t[e].t === "p") {
          var first = this.t[this.i + 1], after = this.t[e + 1];
          var isKwType = first.t === "kw" && TYPE_KW[first.v];
          if (isKwType || (after && (after.t === "id" || after.t === "num" || after.t === "str" || (after.t === "p" && after.v === "(")))) {
            this.next(); var ty = this.parseType(); this.expect(")");
            return { k: "cast", type: ty, e: this.unary(), line: t.line };
          }
        }
      }
      return this.postfix(this.primary());
    },
    args: function () {
      this.expect("("); var a = [];
      if (!this.is(")")) do {
        if (this.is("out") || this.is("ref")) { var mod = this.next().v; if (this.isDecl() || (this.typeEnd() > -1 && this.t[this.typeEnd()].t === "id")) { var ty = this.parseType(); a.push({ k: "outdecl", type: ty, name: this.ident(), mod: mod }); } else a.push({ k: "ref", e: this.primary(), mod: mod }); }
        else a.push(this.expr());
      } while (this.accept(","));
      this.expect(")"); return a;
    },
    postfix: function (e) {
      while (true) {
        var t = this.peek();
        if (this.is(".")) { this.next(); var name = this.ident(); e = { k: "member", o: e, name: name, line: t.line }; continue; }
        if (this.is("(")) { e = { k: "call", f: e, args: this.args(), line: t.line }; continue; }
        if (this.is("[")) { this.next(); var ix = [this.expr()]; while (this.accept(",")) ix.push(this.expr()); this.expect("]"); e = { k: "index", o: e, ix: ix, line: t.line }; continue; }
        if (this.is("++") || this.is("--")) { this.next(); e = { k: "incdec", op: t.v, pre: false, e: e, line: t.line }; continue; }
        if (this.is("!") && this.is(".", 1)) { this.next(); continue; }
        break;
      }
      return e;
    },
    primary: function () {
      var t = this.next(), line = t.line;
      if (t.t === "num") return { k: "lit", v: t.real ? { t: "double", v: t.v } : { t: "int", v: t.v }, line: line };
      if (t.t === "str") return { k: "lit", v: { t: "string", v: t.v }, line: line };
      if (t.t === "char") return { k: "lit", v: { t: "char", v: t.v }, line: line };
      if (t.t === "interp") {
        var parts = t.v.map(function (p) {
          if (typeof p === "string") return p;
          var sub = new Parser(lex(p.code)); var ex = sub.expr();
          return { e: ex, fmt: p.fmt, align: p.align };
        });
        return { k: "interp", parts: parts, line: line };
      }
      if (t.t === "kw") {
        if (t.v === "true" || t.v === "false") return { k: "lit", v: { t: "bool", v: t.v === "true" }, line: line };
        if (t.v === "null") return { k: "lit", v: NULL, line: line };
        if (t.v === "this") return { k: "this", line: line };
        if (t.v === "base") return { k: "base", line: line };
        if (t.v === "new") return this.newExpr(line);
        if (TYPE_KW[t.v]) return { k: "id", name: t.v, line: line }; // int.Parse, string.Join
      }
      if (t.t === "id") {
        if (this.is("=>")) { this.next(); var body = this.is("{") ? this.block() : this.expr(); return { k: "lambda", params: [t.v], body: body, line: line }; }
        return { k: "id", name: t.v, line: line };
      }
      if (t.t === "p" && t.v === "(") {
        // lambda (a, b) =>
        var save = this.i, lp = [];
        if (this.is(")") || this.peek().t === "id") {
          while (this.peek().t === "id") { lp.push(this.next().v); if (!this.accept(",")) break; }
          if (this.accept(")") && this.is("=>")) { this.next(); var lb = this.is("{") ? this.block() : this.expr(); return { k: "lambda", params: lp, body: lb, line: line }; }
          this.i = save;
        }
        var e = this.expr(); this.expect(")"); return e;
      }
      if (t.t === "p" && t.v === "[") { // collection expression [1, 2, 3]
        var items = []; while (!this.is("]")) { items.push(this.expr()); if (!this.accept(",")) break; } this.expect("]");
        return { k: "arrlit", items: items, type: null, line: line };
      }
      throw new CompileError("error CS1525: Invalid expression term '" + (t.v == null ? "end of file" : t.v) + "'", line);
    },
    newExpr: function (line) {
      if (this.is("[")) { this.next(); this.expect("]"); var lit = this.arrayLit(); return lit; }
      var type = { name: this.next().v, gen: null, rank: 0 };
      if (this.is(".") && this.peek(1).t === "id") { this.next(); type.name = this.next().v; }
      if (this.is("<")) { this.next(); type.gen = [this.parseType()]; while (this.accept(",")) type.gen.push(this.parseType()); this.expect(">"); }
      if (this.is("[")) {
        this.next();
        if (this.is("]")) { this.next(); var al = this.arrayLit(type); return al; }
        var sizes = [this.expr()]; while (this.accept(",")) sizes.push(this.expr()); this.expect("]");
        var init = this.is("{") ? this.arrayLit(type) : null;
        return { k: "newarr", type: type, sizes: sizes, init: init, line: line };
      }
      var args = this.is("(") ? this.args() : [];
      var oinit = null;
      if (this.is("{")) { // collection or object initializer
        this.next(); oinit = [];
        while (!this.is("}")) {
          if (this.peek().t === "id" && this.is("=", 1)) { var fname = this.next().v; this.next(); oinit.push({ name: fname, e: this.expr() }); }
          else oinit.push({ e: this.expr() });
          if (!this.accept(",")) break;
        }
        this.expect("}");
      }
      return { k: "new", type: type, args: args, init: oinit, line: line };
    }
  };

  // ---------- values ----------
  var NULL = { t: "null", v: null };
  function I(v) { return { t: "int", v: v | 0 }; }
  function D(v) { return { t: "double", v: v }; }
  function S(v) { return { t: "string", v: v }; }
  function B(v) { return { t: "bool", v: !!v }; }
  function C(v) { return { t: "char", v: v }; }
  function isNum(x) { return x.t === "int" || x.t === "double" || x.t === "char"; }
  function num(x) { return x.t === "char" ? x.v.charCodeAt(0) : x.v; }
  function typeName(x) { return { int: "int", double: "double", string: "string", char: "char", bool: "bool", null: "null", array: (x.et || "object") + "[]", list: "List<" + (x.et || "object") + ">", object: x.cls ? x.cls.name : "object" }[x.t] || x.t; }

  function fmtDouble(v) {
    if (Number.isNaN(v)) return "NaN";
    if (v === Infinity) return "\u221E"; if (v === -Infinity) return "-\u221E";
    if (Object.is(v, -0)) return "-0";
    var s = String(v);
    if (/e/.test(s)) { var m = /^(-?[\d.]+)e([+-])(\d+)$/.exec(s); if (m) s = m[1] + "E" + m[2] + (m[3].length < 2 ? "0" + m[3] : m[3]); }
    return s;
  }
  function roundHalfEven(x, d) {
    var p = Math.pow(10, d || 0), y = x * p, r = Math.round(y);
    if (Math.abs(y % 1) === 0.5) r = 2 * Math.round(y / 2);
    var out = r / p; return Object.is(out, -0) ? 0 : out;
  }
  function roundAway(x, d) { var p = Math.pow(10, d || 0); var y = Math.abs(x) * p; var r = Math.floor(y + 0.5 + 1e-9); return Math.sign(x) * r / p; }
  function groupThousands(s) { var parts = s.split("."); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ","); return parts.join("."); }
  function formatNum(x, f) {
    var v = num(x), m;
    if (!f) return str(x);
    if ((m = /^([FfNnCcPpDd])(\d*)$/.exec(f))) {
      var k = m[1].toUpperCase(), d = m[2] === "" ? (k === "D" ? 0 : 2) : +m[2];
      if (k === "D") { var s = String(Math.abs(Math.trunc(v))); while (s.length < d) s = "0" + s; return (v < 0 ? "-" : "") + s; }
      if (k === "P") return groupThousands(roundAway(v * 100, d).toFixed(d)) + "%";
      var fixed = roundAway(v, d).toFixed(d);
      if (k === "F") return fixed;
      if (k === "N") return groupThousands(fixed);
      if (k === "C") return (v < 0 ? "-\u00A3" : "\u00A3") + groupThousands(roundAway(Math.abs(v), d).toFixed(d));
    }
    if (/^[0#,]*(\.[0#]+)?$/.test(f)) {
      var dec = (f.split(".")[1] || ""), req = (dec.match(/0/g) || []).length, opt = dec.length;
      var out = roundAway(v, opt).toFixed(opt);
      if (opt > req) { var cut = out.split("."); var frac = cut[1] || ""; while (frac.length > req && frac.slice(-1) === "0") frac = frac.slice(0, -1); out = frac ? cut[0] + "." + frac : cut[0]; }
      if (f.indexOf(",") > -1) out = groupThousands(out);
      var intReq = (f.split(".")[0].match(/0/g) || []).length; var ip = out.split("."); while (ip[0].replace("-", "").length < intReq) ip[0] = ip[0].replace(/^(-?)/, "$10"); out = ip.join(".");
      return out;
    }
    return str(x);
  }
  function str(x) {
    switch (x.t) {
      case "int": return String(x.v);
      case "double": return fmtDouble(x.v);
      case "bool": return x.v ? "True" : "False";
      case "string": return x.v;
      case "char": return x.v;
      case "null": return "";
      case "array": return "System." + ({ int: "Int32", double: "Double", string: "String", char: "Char", bool: "Boolean" }[x.et] || "Object") + "[]";
      case "list": return "System.Collections.Generic.List`1[" + ({ int: "System.Int32", double: "System.Double", string: "System.String" }[x.et] || "System.Object") + "]";
      case "object": return x.cls ? x.cls.name : "object";
      case "enum": return x.name;
      case "exc": return "System." + x.v.type + ": " + x.v.message;
      case "date": { var z = function (q) { return (q < 10 ? "0" : "") + q; }, d0 = x.v; return z(d0.getDate()) + "/" + z(d0.getMonth() + 1) + "/" + d0.getFullYear() + " " + z(d0.getHours()) + ":" + z(d0.getMinutes()) + ":" + z(d0.getSeconds()); }
      default: return String(x.v);
    }
  }
  function defaultFor(type) {
    if (!type || type.rank) return NULL;
    switch (type.name) {
      case "int": case "long": case "short": case "byte": case "uint": case "ulong": return I(0);
      case "double": case "float": case "decimal": return D(0);
      case "bool": return B(false);
      case "char": return C("\0");
      default: return NULL;
    }
  }
  var INTS = { int: 1, long: 1, short: 1, byte: 1, uint: 1, ulong: 1 }, REALS = { double: 1, float: 1, decimal: 1 };
  function coerce(val, type, line, ctx) {
    if (!type || type.name === "var" || type.name === "object" || type.name === "dynamic") return val;
    var n = type.rank ? "array" : type.name;
    if (val.t === "null") {
      if (INTS[n] || REALS[n] || n === "bool" || n === "char") throw new CompileError("error CS0037: Cannot convert null to '" + n + "' because it is a non-nullable value type", line);
      return val;
    }
    if (INTS[n]) {
      if (val.t === "int") return val;
      if (val.t === "char") return I(val.v.charCodeAt(0));
      if (val.t === "double") throw new CompileError("error CS0266: Cannot implicitly convert type 'double' to 'int'. An explicit conversion exists (are you missing a cast?)", line);
      throw new CompileError("error CS0029: Cannot implicitly convert type '" + typeName(val) + "' to 'int'", line);
    }
    if (REALS[n]) {
      if (val.t === "double") return val;
      if (val.t === "int") return D(val.v);
      if (val.t === "char") return D(val.v.charCodeAt(0));
      throw new CompileError("error CS0029: Cannot implicitly convert type '" + typeName(val) + "' to '" + n + "'", line);
    }
    if (n === "string" && val.t !== "string") throw new CompileError("error CS0029: Cannot implicitly convert type '" + typeName(val) + "' to 'string'", line);
    if (n === "bool" && val.t !== "bool") throw new CompileError("error CS0029: Cannot implicitly convert type '" + typeName(val) + "' to 'bool'", line);
    if (n === "char" && val.t !== "char") { if (val.t === "int" && ctx === "const") return C(String.fromCharCode(val.v)); throw new CompileError("error CS0029: Cannot implicitly convert type '" + typeName(val) + "' to 'char'", line); }
    return val;
  }

  // ---------- parsing numbers like .NET ----------
  function parseIntStrict(s, typeName2) {
    if (s == null) throw new CsException("ArgumentNullException", "Value cannot be null.");
    var t = String(s).trim();
    if (!/^[+-]?\d+$/.test(t)) throw new CsException("FormatException", "The input string '" + s + "' was not in a correct format.");
    var v = parseInt(t, 10);
    if (v > 2147483647 || v < -2147483648) throw new CsException("OverflowException", "Value was either too large or too small for an Int32.");
    return v;
  }
  function parseDoubleStrict(s) {
    if (s == null) throw new CsException("ArgumentNullException", "Value cannot be null.");
    var t = String(s).trim().replace(/,(?=\d{3}(\D|$))/g, "");
    if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) throw new CsException("FormatException", "The input string '" + s + "' was not in a correct format.");
    return parseFloat(t);
  }

  // ---------- interpreter ----------
  function Env(parent) { this.vars = Object.create(null); this.parent = parent; }
  Env.prototype.lookup = function (n) { var e = this; while (e) { if (n in e.vars) return e; e = e.parent; } return null; };
  Env.prototype.declare = function (n, slot, line) {
    if (n in this.vars) throw new CompileError("error CS0128: A local variable named '" + n + "' is already defined in this scope", line);
    var e = this.parent; while (e && !e.isMethod) { if (n in e.vars) throw new CompileError("error CS0136: A local variable named '" + n + "' cannot be declared in this scope because it would give a different meaning to '" + n + "'", line); e = e.parent; }
    this.vars[n] = slot;
  };

  function run(src, io) {
    io = io || {};
    var out = io.output || function () {};
    var input = io.input || function () { return Promise.resolve(null); };
    var files = io.files || {};
    var steps = 0, MAX = io.maxSteps || 3000000;
    var prog, classes;
    try { var p = new Parser(lex(src)); prog = p.program(); classes = prog.classes; }
    catch (e) { return Promise.resolve(fail(e)); }

    function fail(e) {
      if (e instanceof CompileError) { out("\n" + e.msg + (e.line ? " (line " + e.line + ")" : "") + "\n", "err"); return { ok: false, kind: "compile", message: e.msg, line: e.line }; }
      if (e instanceof CsException) { out("\nUnhandled exception. System." + e.type + ": " + e.message + "\n", "err"); return { ok: false, kind: "runtime", type: e.type, message: e.message }; }
      if (e instanceof StopRun) { out("\nProgram stopped: it ran for too long. Is there an infinite loop?\n", "err"); return { ok: false, kind: "timeout" }; }
      if (e instanceof Signal) return { ok: true };
      out("\nInternal error: " + (e && e.message || e) + "\n", "err"); return { ok: false, kind: "internal", message: String(e && e.message || e) };
    }
    function tick() { if (++steps > MAX) throw new StopRun(); }

    // statics
    var statics = {}; // className -> {field: slot}
    function findMain() {
      for (var cn in classes) { var c = classes[cn]; if (c.methods && c.methods.Main) return { cls: c, m: c.methods.Main }; }
      return null;
    }

    async function initStatics() {
      for (var cn in classes) {
        var c = classes[cn]; if (c.isEnum) continue;
        statics[cn] = {};
        for (var i = 0; i < c.sfields.length; i++) {
          var f = c.sfields[i];
          statics[cn][f.name] = { v: f.init ? coerce(await evalE(f.init, new Env(null), { cls: c }), f.type, f.line, f.isConst ? "const" : "") : defaultFor(f.type), type: f.type, isConst: f.isConst };
        }
      }
    }

    async function exec(s, env, ctx) {
      tick();
      switch (s.k) {
        case "block": {
          var e2 = new Env(env);
          for (var i = 0; i < s.body.length; i++) { if (s.body[i].k === "localfn") e2.vars[s.body[i].m.name] = { v: { t: "fn", m: s.body[i].m, env: e2 }, type: null }; }
          for (var j = 0; j < s.body.length; j++) await exec(s.body[j], e2, ctx);
          return;
        }
        case "localfn": return;
        case "empty": return;
        case "decl": {
          for (var k = 0; k < s.decls.length; k++) {
            var d = s.decls[k], val;
            if (d.init) {
              if (d.init.k === "arrlit") val = await buildArray(d.init, s.type, env, ctx);
              else val = await evalE(d.init, env, ctx);
              if (s.type.name === "var" && val.t === "null") throw new CompileError("error CS0815: Cannot assign <null> to an implicitly-typed variable", s.line);
              val = coerce(val, s.type, s.line, s.isConst ? "const" : "");
            } else {
              if (s.type.name === "var") throw new CompileError("error CS0818: Implicitly-typed variables must be initialized", s.line);
              if (s.isConst) throw new CompileError("error CS0145: A const field requires a value to be provided", s.line);
              val = undefined;
            }
            env.declare(d.name, { v: val, type: s.type.name === "var" ? null : s.type, isConst: s.isConst, name: d.name }, s.line);
          }
          return;
        }
        case "expr": await evalE(s.e, env, ctx); return;
        case "if": if (truthy(await evalE(s.c, env, ctx), s.line)) await exec(s.th, env, ctx); else if (s.el) await exec(s.el, env, ctx); return;
        case "while":
          while (truthy(await evalE(s.c, env, ctx), s.line)) { tick(); try { await exec(s.body, env, ctx); } catch (sg) { if (sg instanceof Signal && sg.kind === "break") break; if (sg instanceof Signal && sg.kind === "continue") continue; throw sg; } }
          return;
        case "do":
          do { tick(); try { await exec(s.body, env, ctx); } catch (sg2) { if (sg2 instanceof Signal && sg2.kind === "break") break; if (sg2 instanceof Signal && sg2.kind === "continue") continue; throw sg2; } } while (truthy(await evalE(s.c, env, ctx), s.line));
          return;
        case "for": {
          var fe = new Env(env);
          if (s.init) await exec(s.init, fe, ctx);
          while (!s.c || truthy(await evalE(s.c, fe, ctx), s.line)) {
            tick();
            try { await exec(s.body, fe, ctx); } catch (sg3) { if (sg3 instanceof Signal && sg3.kind === "break") break; if (!(sg3 instanceof Signal && sg3.kind === "continue")) throw sg3; }
            for (var q = 0; q < s.step.length; q++) await evalE(s.step[q], fe, ctx);
          }
          return;
        }
        case "foreach": {
          var coll = await evalE(s.e, env, ctx), items;
          if (coll.t === "array" || coll.t === "list") items = coll.v.slice();
          else if (coll.t === "string") items = coll.v.split("").map(C);
          else if (coll.t === "dict") items = Object.keys(coll.v).map(function (k) { return { t: "object", kv: true, fields: { Key: { v: coll.keys[k] }, Value: { v: coll.v[k] } } }; });
          else if (coll.t === "null") throw new CsException("NullReferenceException", "Object reference not set to an instance of an object.");
          else throw new CompileError("error CS1579: foreach statement cannot operate on variables of type '" + typeName(coll) + "'", s.line);
          for (var x = 0; x < items.length; x++) {
            tick(); var le = new Env(env);
            le.declare(s.name, { v: s.type.name === "var" ? items[x] : coerceForeach(items[x], s.type, s.line), type: null, readonlyLoop: true, name: s.name }, s.line);
            try { await exec(s.body, le, ctx); } catch (sg4) { if (sg4 instanceof Signal && sg4.kind === "break") break; if (!(sg4 instanceof Signal && sg4.kind === "continue")) throw sg4; }
          }
          return;
        }
        case "switch": {
          var sv = await evalE(s.e, env, ctx), start = -1;
          for (var ci = 0; ci < s.cases.length && start < 0; ci++) for (var li = 0; li < s.cases[ci].labels.length; li++) {
            var lab = s.cases[ci].labels[li]; if (lab === null) continue;
            var lv = await evalE(lab, env, ctx); if (equalsV(sv, lv)) { start = ci; break; }
          }
          if (start < 0) for (var di = 0; di < s.cases.length; di++) if (s.cases[di].labels.indexOf(null) > -1) start = di;
          if (start < 0) return;
          var se = new Env(env);
          try { for (var bi = 0; bi < s.cases[start].body.length; bi++) await exec(s.cases[start].body[bi], se, ctx); }
          catch (sg5) { if (sg5 instanceof Signal && sg5.kind === "break") return; throw sg5; }
          return;
        }
        case "break": throw new Signal("break");
        case "continue": throw new Signal("continue");
        case "return": throw new Signal("return", s.e ? await evalE(s.e, env, ctx) : null);
        case "throw": {
          if (!s.e) { if (ctx.currentExc) throw ctx.currentExc; throw new CsException("Exception", "Exception of type 'System.Exception' was thrown."); }
          var ex = await evalE(s.e, env, ctx);
          if (ex.t === "exc") throw ex.v;
          throw new CsException("Exception", str(ex));
        }
        case "try": {
          try { await exec(s.body, env, ctx); }
          catch (err) {
            if (!(err instanceof CsException)) { if (s.fin) await exec(s.fin, env, ctx); throw err; }
            var handled = false;
            for (var cc = 0; cc < s.catches.length; cc++) {
              var c = s.catches[cc];
              if (!c.type || c.type === "Exception" || c.type === err.type || (c.type === "SystemException") || (c.type === "ArithmeticException" && /DivideByZero|Overflow/.test(err.type)) || (c.type === "IOException" && /FileNotFound|DirectoryNotFound/.test(err.type)) || (c.type === "ArgumentException" && /Argument/.test(err.type))) {
                var ce = new Env(env); if (c.name) ce.declare(c.name, { v: { t: "exc", v: err }, name: c.name }, s.line);
                if (c.when && !truthy(await evalE(c.when, ce, ctx), s.line)) continue;
                handled = true;
                var prev = ctx.currentExc; ctx.currentExc = err;
                try { await exec(c.body, ce, ctx); } finally { ctx.currentExc = prev; if (s.fin) { await exec(s.fin, env, ctx); } }
                break;
              }
            }
            if (!handled) { if (s.fin) await exec(s.fin, env, ctx); throw err; }
            return;
          }
          if (s.fin) await exec(s.fin, env, ctx);
          return;
        }
        case "using": {
          var ue = new Env(env); await exec(s.d, ue, ctx);
          try { await exec(s.body, ue, ctx); }
          finally { for (var nm in ue.vars) { var o = ue.vars[nm].v; if (o && o.t === "stream") closeStream(o); } }
          return;
        }
      }
      throw new Error("Unknown statement " + s.k);
    }
    function coerceForeach(v, type, line) {
      if (INTS[type.name] && v.t === "char") return I(v.v.charCodeAt(0));
      if (type.name === "string" && v.t === "char") throw new CompileError("error CS0030: Cannot convert type 'char' to 'string'", line);
      return coerce(v, type, line);
    }
    function truthy(v, line) {
      if (v.t !== "bool") throw new CompileError("error CS0029: Cannot implicitly convert type '" + typeName(v) + "' to 'bool'", line);
      return v.v;
    }
    function equalsV(a, b) {
      if (isNum(a) && isNum(b)) return num(a) === num(b);
      if (a.t === "null" || b.t === "null") return a.t === b.t;
      if (a.t === "enum" && b.t === "enum") return a.v === b.v;
      if ((a.t === "string" || a.t === "char") && (b.t === "string" || b.t === "char")) return a.t === b.t && a.v === b.v;
      return a.v === b.v && a.t === b.t || a === b;
    }

    async function buildArray(lit, type, env, ctx) {
      if (type && type.two && lit.items.length && lit.items[0].k === "arrlit") { // int[,] grid = { {1, 2}, {3, 4} }
        var rows = lit.items.length, cols = lit.items[0].items.length, flat = [];
        for (var ri = 0; ri < rows; ri++) { if (lit.items[ri].items.length !== cols) throw new CompileError("error CS0847: An array initializer of length '" + cols + "' is expected", lit.line); for (var cj = 0; cj < cols; cj++) flat.push(coerce(await evalE(lit.items[ri].items[cj], env, ctx), { name: type.name }, lit.line)); }
        return { t: "array", v: flat, et: type.name, dims: [rows, cols] };
      }
      var et = type && type.rank ? { name: type.name, rank: type.rank - 1, gen: type.gen } : null;
      var items = [];
      for (var i = 0; i < lit.items.length; i++) {
        var it = lit.items[i];
        var v = it.k === "arrlit" ? await buildArray(it, et, env, ctx) : await evalE(it, env, ctx);
        items.push(et && !et.rank ? coerce(v, et, lit.line) : v);
      }
      if (type && type.name === "List") return { t: "list", v: items, et: type.gen && type.gen[0].name };
      var etn = et ? et.name : (items[0] ? items[0].t : "object");
      return { t: "array", v: items, et: etn };
    }

    function lvalue(e, env, ctx) {
      // returns {get(), set(v), type}
      if (e.k === "id") {
        var sc = env.lookup(e.name);
        if (sc) { var slot = sc.vars[e.name]; return { slot: slot, get: function () { if (slot.v === undefined) throw new CompileError("error CS0165: Use of unassigned local variable '" + e.name + "'", e.line); return slot.v; }, set: function (v) { if (slot.isConst) throw new CompileError("error CS0131: The left-hand side of an assignment must be a variable (cannot assign to a constant)", e.line); if (slot.readonlyLoop) throw new CompileError("error CS1656: Cannot assign to '" + e.name + "' because it is a 'foreach iteration variable'", e.line); slot.v = coerce(v, slot.type, e.line); }, type: slot.type }; }
        if (ctx.self && ctx.self.fields[e.name]) { var fs = ctx.self.fields[e.name]; return { get: function () { return fs.v; }, set: function (v) { fs.v = coerce(v, fs.type, e.line); }, type: fs.type }; }
        var st = findStatic(e.name, ctx);
        if (st) return { get: function () { return st.v; }, set: function (v) { if (st.isConst) throw new CompileError("error CS0131: Cannot assign to a constant", e.line); st.v = coerce(v, st.type, e.line); }, type: st.type };
        throw new CompileError("error CS0103: The name '" + e.name + "' does not exist in the current context", e.line);
      }
      return null;
    }
    function findStatic(name, ctx) {
      if (ctx.cls && statics[ctx.cls.name] && statics[ctx.cls.name][name]) return statics[ctx.cls.name][name];
      for (var cn in statics) if (statics[cn][name] && (!ctx.cls || classes[cn] === ctx.cls)) return statics[cn][name];
      return null;
    }

    async function assignTo(target, v, env, ctx, line) {
      if (target.k === "id") {
        if (!env.lookup(target.name) && ctx.self && !ctx.self.fields[target.name] && ctx.self.cls && findProp(ctx.self.cls, target.name)) { await propSet(ctx.self, target.name, v, line, ctx); return v; }
        lvalue(target, env, ctx).set(v); return v;
      }
      if (target.k === "index") {
        var o = await evalE(target.o, env, ctx), ix = await evalE(target.ix[0], env, ctx);
        if (o.dims && target.ix.length === 2) { var r1 = num(ix), c1 = num(await evalE(target.ix[1], env, ctx)); if (r1 < 0 || c1 < 0 || r1 >= o.dims[0] || c1 >= o.dims[1]) throw new CsException("IndexOutOfRangeException", "Index was outside the bounds of the array."); o.v[r1 * o.dims[1] + c1] = coerce(v, { name: o.et }, line); return v; }
        if (o.t === "array" || o.t === "list") {
          var k = checkIndex(o, ix, line, target);
          o.v[k] = o.t === "array" && o.et ? coerce(v, { name: o.et }, line) : v; return v;
        }
        if (o.t === "dict") { o.v[keyOf(ix)] = v; o.keys[keyOf(ix)] = ix; return v; }
        if (o.t === "string") throw new CompileError("error CS0200: Property or indexer 'string.this[int]' cannot be assigned to -- it is read only", line);
        throw new CompileError("error CS0021: Cannot apply indexing to an expression of type '" + typeName(o) + "'", line);
      }
      if (target.k === "member") {
        if (target.o.k === "id" && classes[target.o.name] && statics[target.o.name] && statics[target.o.name][target.name]) { var sf = statics[target.o.name][target.name]; sf.v = coerce(v, sf.type, line); return v; }
        var obj = target.o.k === "this" || target.o.k === "base" ? ctx.self : await evalE(target.o, env, ctx);
        if (obj.t === "null") throw new CsException("NullReferenceException", "Object reference not set to an instance of an object.");
        if (obj.t === "object" && obj.fields[target.name]) { var f = obj.fields[target.name]; f.v = coerce(v, f.type, line); return v; }
        if (obj.t === "object" && obj.cls && await propSet(obj, target.name, v, line, ctx)) return v;
        if (obj.t === "object" && obj.fields) { obj.fields[target.name] = { v: v }; return v; }
        throw new CompileError("error CS1061: '" + typeName(obj) + "' does not contain a definition for '" + target.name + "'", line);
      }
      throw new CompileError("error CS0131: The left-hand side of an assignment must be a variable", line);
    }
    function keyOf(v) { return v.t + ":" + str(v); }
    function checkIndex(o, ix, line) {
      if (ix.t !== "int" && ix.t !== "char") throw new CompileError("error CS0029: Cannot implicitly convert type '" + typeName(ix) + "' to 'int' (array index)", line);
      var k = num(ix);
      if (k < 0 || k >= o.v.length) throw new CsException(o.t === "list" ? "ArgumentOutOfRangeException" : "IndexOutOfRangeException", o.t === "list" ? "Index was out of range. Must be non-negative and less than the size of the collection." : "Index was outside the bounds of the array.");
      return k;
    }

    function arith(op, a, b, line) {
      if (op === "+" && (a.t === "string" || b.t === "string")) return S(str(a) + str(b));
      if (!isNum(a) || !isNum(b)) {
        if ((op === "==" || op === "!=")) { var eq = equalsV(a, b); return B(op === "==" ? eq : !eq); }
        if ((op === "&&" || op === "||" || op === "&" || op === "|" || op === "^") && a.t === "bool" && b.t === "bool") return B(op === "&&" || op === "&" ? a.v && b.v : op === "^" ? a.v !== b.v : a.v || b.v);
        throw new CompileError("error CS0019: Operator '" + op + "' cannot be applied to operands of type '" + typeName(a) + "' and '" + typeName(b) + "'", line);
      }
      var x = num(a), y = num(b), real = a.t === "double" || b.t === "double";
      switch (op) {
        case "+": return real ? D(x + y) : I(x + y);
        case "-": return real ? D(x - y) : I(x - y);
        case "*": return real ? D(x * y) : I(Math.imul(x, y));
        case "/": if (!real) { if (y === 0) throw new CsException("DivideByZeroException", "Attempted to divide by zero."); return I(Math.trunc(x / y)); } return D(x / y);
        case "%": if (!real) { if (y === 0) throw new CsException("DivideByZeroException", "Attempted to divide by zero."); return I(x % y); } return D(x % y);
        case "<": return B(x < y); case ">": return B(x > y); case "<=": return B(x <= y); case ">=": return B(x >= y);
        case "==": return B(x === y); case "!=": return B(x !== y);
        case "&": return I(x & y); case "|": return I(x | y); case "^": return I(x ^ y);
        case "<<": return I(x << y); case ">>": return I(x >> y);
      }
      throw new CompileError("error CS0019: Operator '" + op + "' cannot be applied to operands of type '" + typeName(a) + "' and '" + typeName(b) + "'", line);
    }

    async function evalE(e, env, ctx) {
      tick();
      switch (e.k) {
        case "lit": return e.v;
        case "interp": {
          var s = "";
          for (var i = 0; i < e.parts.length; i++) {
            var p = e.parts[i];
            if (typeof p === "string") { s += p; continue; }
            var v = await strA(await evalE(p.e, env, ctx), ctx), t = p.fmt && isNum(v) ? formatNum(v, p.fmt) : str(v);
            if (p.align) { while (t.length < Math.abs(p.align)) t = p.align > 0 ? " " + t : t + " "; }
            s += t;
          }
          return S(s);
        }
        case "id": {
          var sc = env.lookup(e.name);
          if (sc) { var slot = sc.vars[e.name]; if (slot.v === undefined) throw new CompileError("error CS0165: Use of unassigned local variable '" + e.name + "'", e.line); return slot.v; }
          if (ctx.self && ctx.self.fields[e.name]) return ctx.self.fields[e.name].v;
          if (ctx.self && ctx.self.cls && findProp(ctx.self.cls, e.name)) return propGet(ctx.self, e.name, e.line, ctx);
          var st = findStatic(e.name, ctx); if (st) return st.v;
          if (classes[e.name] || BUILTIN_TYPES[e.name]) return { t: "type", name: e.name };
          var cls = ctx.cls || (findMain() || {}).cls;
          if (cls && cls.methods && cls.methods[e.name]) return { t: "method", cls: cls, name: e.name };
          throw new CompileError("error CS0103: The name '" + e.name + "' does not exist in the current context", e.line);
        }
        case "this": return { t: "object", fields: ctx.self.fields, cls: ctx.self.cls };
        case "base": return { t: "object", fields: ctx.self.fields, cls: ctx.cls && ctx.cls.base ? classes[ctx.cls.base] : ctx.self.cls };
        case "assign": {
          var r = await evalE(e.r, env, ctx);
          if (e.op === "=") return assignTo(e.l, r, env, ctx, e.line);
          var cur = await evalE(e.l, env, ctx);
          if (e.op === "??=") return cur.t === "null" ? assignTo(e.l, r, env, ctx, e.line) : cur;
          var res = arith(e.op[0], cur, r, e.line);
          if (cur.t === "int" && res.t === "double") res = I(Math.trunc(res.v)); // compound assignment casts back
          if (cur.t === "char" && res.t === "int") res = C(String.fromCharCode(res.v));
          return assignTo(e.l, res, env, ctx, e.line);
        }
        case "incdec": {
          var old = await evalE(e.e, env, ctx);
          if (!isNum(old)) throw new CompileError("error CS0023: Operator '" + e.op + "' cannot be applied to operand of type '" + typeName(old) + "'", e.line);
          var nv = old.t === "double" ? D(old.v + (e.op === "++" ? 1 : -1)) : old.t === "char" ? C(String.fromCharCode(old.v.charCodeAt(0) + (e.op === "++" ? 1 : -1))) : I(old.v + (e.op === "++" ? 1 : -1));
          await assignTo(e.e, nv, env, ctx, e.line);
          return e.pre ? nv : old;
        }
        case "cond": return truthy(await evalE(e.c, env, ctx), e.line) ? evalE(e.a, env, ctx) : evalE(e.b, env, ctx);
        case "bin": {
          if (e.op === "&&") { var a1 = await evalE(e.l, env, ctx); if (!truthy(a1, e.line)) return B(false); return B(truthy(await evalE(e.r, env, ctx), e.line)); }
          if (e.op === "||") { var a2 = await evalE(e.l, env, ctx); if (truthy(a2, e.line)) return B(true); return B(truthy(await evalE(e.r, env, ctx), e.line)); }
          if (e.op === "??") { var a3 = await evalE(e.l, env, ctx); return a3.t === "null" ? evalE(e.r, env, ctx) : a3; }
          var L = await evalE(e.l, env, ctx), R = await evalE(e.r, env, ctx);
          if (e.op === "+" && (L.t === "string" || R.t === "string")) { L = await strA(L, ctx); R = await strA(R, ctx); }
          if ((e.op === "<" || e.op === ">" || e.op === "<=" || e.op === ">=") && (L.t === "string" || R.t === "string")) throw new CompileError("error CS0019: Operator '" + e.op + "' cannot be applied to operands of type 'string' and '" + typeName(R) + "' (use string.Compare or CompareTo)", e.line);
          if (e.op === "+" && L.t === "char" && R.t === "char") return I(num(L) + num(R));
          if (L.t === "date" && R.t === "date") { if (e.op === "-") return { t: "object", cls: { name: "TimeSpan", methods: {} }, fields: { Days: { v: I(Math.round((L.v - R.v) / 864e5)) }, TotalDays: { v: D((L.v - R.v) / 864e5) } } }; var dl = L.v.getTime(), dr = R.v.getTime(); return arith(e.op, I(dl > dr ? 1 : dl < dr ? -1 : 0), I(0), e.line); }
          return arith(e.op, L, R, e.line);
        }
        case "un": {
          var u = await evalE(e.e, env, ctx);
          if (e.op === "!") return B(!truthy(u, e.line));
          if (e.op === "-") { if (!isNum(u)) throw new CompileError("error CS0023: Operator '-' cannot be applied to operand of type '" + typeName(u) + "'", e.line); return u.t === "double" ? D(-u.v) : I(-num(u)); }
          if (e.op === "~") return I(~num(u));
          return u;
        }
        case "cast": {
          var cv = await evalE(e.e, env, ctx), tn = e.type.name;
          if (INTS[tn]) { if (cv.t === "double") return I(Math.trunc(cv.v)); if (cv.t === "char") return I(cv.v.charCodeAt(0)); if (cv.t === "int") return cv; if (cv.t === "enum") return I(cv.v); throw new CompileError("error CS0030: Cannot convert type '" + typeName(cv) + "' to 'int'", e.line); }
          if (REALS[tn]) { if (isNum(cv)) return D(num(cv)); throw new CompileError("error CS0030: Cannot convert type '" + typeName(cv) + "' to '" + tn + "'", e.line); }
          if (tn === "char") { if (isNum(cv)) return C(String.fromCharCode(num(cv))); throw new CompileError("error CS0030: Cannot convert type '" + typeName(cv) + "' to 'char'", e.line); }
          if (tn === "string") { if (cv.t === "string" || cv.t === "null") return cv; throw new CompileError("error CS0030: Cannot convert type '" + typeName(cv) + "' to 'string'", e.line); }
          if (classes[tn] && classes[tn].isEnum) return { t: "enum", v: num(cv), name: enumName(classes[tn], num(cv)) };
          return cv;
        }
        case "is": { var iv = await evalE(e.e, env, ctx); var want = e.type.name; return B(iv.t === want || (INTS[want] && iv.t === "int") || (REALS[want] && iv.t === "double") || (iv.cls && iv.cls.name === want)); }
        case "as": return evalE(e.e, env, ctx);
        case "arrlit": return buildArray(e, null, env, ctx);
        case "newarr": {
          if (e.init) return buildArray(e.init, { name: e.type.name, rank: e.sizes.length, gen: e.type.gen }, env, ctx);
          var sizes = []; for (var si = 0; si < e.sizes.length; si++) { var sz = await evalE(e.sizes[si], env, ctx); if (sz.t !== "int") throw new CompileError("error CS0266: Array size must be an int", e.line); if (sz.v < 0) throw new CsException("OverflowException", "Arithmetic operation resulted in an overflow."); sizes.push(sz.v); }
          var make = function (d) { var arr = []; for (var q = 0; q < sizes[d]; q++) arr.push(d === sizes.length - 1 ? defaultFor({ name: e.type.name }) : make(d + 1)); return d === sizes.length - 1 ? { t: "array", v: arr, et: e.type.name } : { t: "array", v: arr, et: e.type.name + "[]" }; };
          if (sizes.length === 2) { var grid = { t: "array", v: [], et: e.type.name, dims: sizes }; for (var g = 0; g < sizes[0] * sizes[1]; g++) grid.v.push(defaultFor({ name: e.type.name })); return grid; }
          return make(0);
        }
        case "new": return newObject(e, env, ctx);
        case "lambda": return { t: "lambda", params: e.params, body: e.body, env: env, ctx: ctx };
        case "index": {
          var o = await evalE(e.o, env, ctx);
          if (o.t === "null") throw new CsException("NullReferenceException", "Object reference not set to an instance of an object.");
          if (e.ix.length === 2 && o.dims) { var r0 = num(await evalE(e.ix[0], env, ctx)), c0 = num(await evalE(e.ix[1], env, ctx)); if (r0 < 0 || c0 < 0 || r0 >= o.dims[0] || c0 >= o.dims[1]) throw new CsException("IndexOutOfRangeException", "Index was outside the bounds of the array."); return o.v[r0 * o.dims[1] + c0]; }
          var ix = await evalE(e.ix[0], env, ctx);
          if (o.t === "string") { var k = num(ix); if (k < 0 || k >= o.v.length) throw new CsException("IndexOutOfRangeException", "Index was outside the bounds of the array."); return C(o.v[k]); }
          if (o.t === "array" || o.t === "list") return o.v[checkIndex(o, ix, e.line)];
          if (o.t === "dict") { var kk = keyOf(ix); if (!(kk in o.v)) throw new CsException("KeyNotFoundException", "The given key '" + str(ix) + "' was not present in the dictionary."); return o.v[kk]; }
          throw new CompileError("error CS0021: Cannot apply indexing with [] to an expression of type '" + typeName(o) + "'", e.line);
        }
        case "member": return getMember(e, env, ctx);
        case "call": return call(e, env, ctx);
      }
      throw new Error("Unknown expression " + e.k);
    }
    function enumName(cls, v) { for (var k in cls.vals) if (cls.vals[k] === v) return k; return String(v); }

    async function newObject(e, env, ctx) {
      var tn = e.type.name, args = [];
      for (var i = 0; i < e.args.length; i++) args.push(await evalE(e.args[i], env, ctx));
      if (tn === "List") {
        var lst = { t: "list", v: [], et: e.type.gen && e.type.gen[0].name };
        if (args[0] && (args[0].t === "array" || args[0].t === "list")) lst.v = args[0].v.slice();
        if (e.init) for (var j = 0; j < e.init.length; j++) lst.v.push(await evalE(e.init[j].e, env, ctx));
        return lst;
      }
      if (tn === "Dictionary") return { t: "dict", v: {}, keys: {} };
      if (tn === "Random") { var seed = args[0] ? num(args[0]) : null; return { t: "random", seed: seed }; }
      if (/Exception$/.test(tn)) return { t: "exc", v: new CsException(tn, args[0] ? str(args[0]) : "Exception of type 'System." + tn + "' was thrown.") };
      if (tn === "StreamWriter") { var fnm = str(args[0]), app = args[1] && args[1].v; if (!app || !(fnm in files)) files[fnm] = ""; return { t: "stream", mode: "w", name: fnm, open: true }; }
      if (tn === "StreamReader") { var rn = str(args[0]); if (!(rn in files)) throw new CsException("FileNotFoundException", "Could not find file '" + rn + "'."); return { t: "stream", mode: "r", name: rn, lines: files[rn].replace(/\r/g, "").split("\n").filter(function (x, i, a) { return !(i === a.length - 1 && x === ""); }), pos: 0, open: true }; }
      if (tn === "StringBuilder") return { t: "sb", v: args[0] ? str(args[0]) : "" };
      if (tn === "DateTime") { var yy = args[0] ? num(args[0]) : 1, mo = args[1] ? num(args[1]) : 1, dd = args[2] ? num(args[2]) : 1; var dt0 = new Date(yy, mo - 1, dd, args[3] ? num(args[3]) : 0, args[4] ? num(args[4]) : 0, args[5] ? num(args[5]) : 0); if (dt0.getMonth() !== mo - 1 || dt0.getDate() !== dd) throw new CsException("ArgumentOutOfRangeException", "Year, Month, and Day parameters describe an un-representable DateTime."); return { t: "date", v: dt0 }; }
      if (tn === "string" || tn === "String") return S(args.length === 2 ? str(args[0]).repeat(Math.max(0, num(args[1]))) : args[0] && args[0].t === "array" ? args[0].v.map(str).join("") : "");
      var cls = classes[tn];
      if (!cls) throw new CompileError("error CS0246: The type or namespace name '" + tn + "' could not be found", e.line);
      var obj = { t: "object", cls: cls, fields: {} };
      var chain = []; var cc = cls; while (cc) { chain.unshift(cc); cc = cc.base ? classes[cc.base] : null; }
      for (var ci = 0; ci < chain.length; ci++) for (var f = 0; f < chain[ci].fields.length; f++) { var fd = chain[ci].fields[f]; obj.fields[fd.name] = { v: fd.init ? coerce(await evalE(fd.init, new Env(null), { cls: chain[ci], self: obj }), fd.type, fd.line) : defaultFor(fd.type), type: fd.type }; }
      await runCtor(cls, args, obj, e.line, ctx);
      if (e.init) for (var k = 0; k < e.init.length; k++) { if (e.init[k].name) { var fv = await evalE(e.init[k].e, env, ctx); if (!obj.fields[e.init[k].name]) obj.fields[e.init[k].name] = { v: fv }; else obj.fields[e.init[k].name].v = coerce(fv, obj.fields[e.init[k].name].type, e.line); } }
      return obj;
    }

    // constructors: run the chosen constructor; it first runs : this(...) or : base(...) (or the base class's parameterless one)
    async function runCtor(cls, args, obj, line, ctx) {
      if (cls.ctor) return invoke(cls.ctor, args, { cls: cls, self: obj, depth: (ctx && ctx.depth) || 0 }, line, cls.name);
      if (args.length) throw new CompileError("error CS1729: '" + cls.name + "' does not contain a constructor that takes " + args.length + " arguments", line);
      if (cls.base && classes[cls.base]) return runCtor(classes[cls.base], [], obj, line, ctx);
    }
    async function ctorChain(c, env, ctx, line) {
      var cls = ctx.cls;
      if (c.chain && c.chain.kind === "this") return runCtor(cls, await evalArgs(c.chain.args, env, ctx), ctx.self, line, ctx);
      if (cls.base && classes[cls.base]) await runCtor(classes[cls.base], c.chain && c.chain.kind === "base" ? await evalArgs(c.chain.args, env, ctx) : [], ctx.self, line, ctx);
    }
    // properties with get/set bodies
    function findProp(cls, n) { while (cls) { var ps = cls.props || []; for (var i = 0; i < ps.length; i++) if (ps[i].name === n) return { p: ps[i], cls: cls }; cls = cls.base ? classes[cls.base] : null; } return null; }
    async function propGet(obj, n, line, ctx) {
      var f = obj && obj.cls ? findProp(obj.cls, n) : null; if (!f) return undefined;
      if (!f.p.get) throw new CompileError("error CS0154: The property '" + n + "' cannot be used in this context because it lacks the get accessor", line);
      f.p.getM = f.p.getM || { name: n, params: [], body: f.p.get, type: f.p.type, overloads: [] };
      return invoke(f.p.getM, [], { cls: f.cls, self: obj, depth: (ctx && ctx.depth) || 0 }, line, "get_" + n);
    }
    async function propSet(obj, n, v, line, ctx) {
      var f = obj && obj.cls ? findProp(obj.cls, n) : null; if (!f) return false;
      if (!f.p.set) throw new CompileError("error CS0200: Property '" + n + "' cannot be assigned to -- it is read only", line);
      f.p.setM = f.p.setM || { name: n, params: [{ name: "value", type: f.p.type }], body: f.p.set, type: { name: "void" }, overloads: [] };
      await invoke(f.p.setM, [v], { cls: f.cls, self: obj, depth: (ctx && ctx.depth) || 0 }, line, "set_" + n); return true;
    }
    // implicit ToString() for objects in string concatenation, interpolation and Console output
    async function strA(v, ctx) {
      if (v && v.t === "object" && v.cls) { var c = v.cls, m = null; while (c && !m) { m = c.methods && c.methods.ToString; if (!m) c = c.base ? classes[c.base] : null; } if (m) return invoke(m, [], { cls: c, self: v, depth: (ctx && ctx.depth) || 0 }, 0, "ToString"); }
      return v;
    }
    async function invoke(m, args, ctx, line, name) {
      var cand = [m].concat(m.overloads || []);
      var chosen = cand.filter(function (c) { var req = c.params.filter(function (p) { return !p.def; }).length; return args.length >= req && args.length <= c.params.length; });
      if (!chosen.length) throw new CompileError("error CS1501: No overload for method '" + (name || m.name) + "' takes " + args.length + " arguments", line);
      var best = chosen[0];
      if (chosen.length > 1) { for (var q = 0; q < chosen.length; q++) { var ok = true; for (var a = 0; a < args.length; a++) { try { coerce(args[a], chosen[q].params[a].type, line); } catch (er) { ok = false; } } if (ok) { best = chosen[q]; break; } } }
      var env = new Env(m.env || null); env.isMethod = true;
      for (var i = 0; i < best.params.length; i++) {
        var p = best.params[i], v;
        if (i < args.length) v = args[i].refSlot ? args[i].refSlot.v : args[i]; else v = await evalE(p.def, env, ctx);
        if (p.mod === "out") v = defaultFor(p.type);
        var slot = args[i] && args[i].refSlot && (p.mod === "ref" || p.mod === "out") ? args[i].refSlot : { v: coerce(v, p.type, line), type: p.type, name: p.name };
        env.vars[p.name] = slot;
      }
      if (best.isCtor) await ctorChain(best, env, ctx, line);
      tick();
      if (++ctx.depth > 2000) throw new CsException("StackOverflowException", "Stack overflow – a method keeps calling itself without stopping.");
      try { await exec(best.body, env, ctx); }
      catch (s) { if (s instanceof Signal && s.kind === "return") { ctx.depth--; return s.value == null ? { t: "void" } : coerce(s.value, best.type && best.type.name !== "void" ? best.type : null, line); } ctx.depth--; throw s; }
      ctx.depth--;
      if (best.type && best.type.name !== "void" && name !== (ctx.cls && ctx.cls.name)) throw new CompileError("error CS0161: '" + (name || m.name) + "': not all code paths return a value", line);
      return { t: "void" };
    }

    function closeStream(s) { s.open = false; }
    function rnd(o) { if (o.seed == null) return Math.random(); o.seed = (o.seed * 1103515245 + 12345) % 2147483648; return o.seed / 2147483648; }

    async function getMember(e, env, ctx) {
      // static type members
      if (e.o.k === "id" && !env.lookup(e.o.name) && !(ctx.self && ctx.self.fields[e.o.name])) {
        var tn = e.o.name;
        if (tn === "Math") { if (e.name === "PI") return D(Math.PI); if (e.name === "E") return D(Math.E); }
        if (tn === "int" || tn === "Int32") { if (e.name === "MaxValue") return I(2147483647); if (e.name === "MinValue") return I(-2147483648); }
        if (tn === "double" || tn === "Double") { if (e.name === "MaxValue") return D(Number.MAX_VALUE); if (e.name === "MinValue") return D(-Number.MAX_VALUE); }
        if ((tn === "string" || tn === "String") && e.name === "Empty") return S("");
        if (tn === "Environment" && e.name === "NewLine") return S("\n");
        if (tn === "DateTime" && (e.name === "Now" || e.name === "Today")) { var dn = new Date(); return { t: "date", v: e.name === "Today" ? new Date(dn.getFullYear(), dn.getMonth(), dn.getDate()) : dn }; }
        if (classes[tn] && classes[tn].isEnum) { if (!(e.name in classes[tn].vals)) throw new CompileError("error CS0117: '" + tn + "' does not contain a definition for '" + e.name + "'", e.line); return { t: "enum", v: classes[tn].vals[e.name], name: e.name }; }
        if (classes[tn] && statics[tn] && statics[tn][e.name]) return statics[tn][e.name].v;
      }
      var o = await evalE(e.o, env, ctx), n = e.name;
      if (o.t === "null") throw new CsException("NullReferenceException", "Object reference not set to an instance of an object.");
      if (o.t === "string" && n === "Length") return I(o.v.length);
      if (o.t === "array" && n === "Length") return I(o.v.length);
      if (o.t === "array" && n === "Rank") return I(o.dims ? 2 : 1);
      if (o.t === "list" && n === "Count") return I(o.v.length);
      if (o.t === "dict" && n === "Count") return I(Object.keys(o.v).length);
      if (o.t === "exc" && n === "Message") return S(o.v.message);
      if (o.t === "stream" && n === "EndOfStream") return B(o.pos >= o.lines.length);
      if (o.t === "sb" && n === "Length") return I(o.v.length);
      if (o.t === "date") { var dt = o.v; var map = { Year: dt.getFullYear(), Month: dt.getMonth() + 1, Day: dt.getDate(), Hour: dt.getHours(), Minute: dt.getMinutes(), Second: dt.getSeconds(), DayOfYear: Math.floor((dt - new Date(dt.getFullYear(), 0, 0)) / 864e5) }; if (n in map) return I(map[n]); if (n === "DayOfWeek") return S(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dt.getDay()]); }
      if (o.t === "object" && o.fields && o.fields[n]) return o.fields[n].v;
      if (o.t === "object" && o.cls) { var pv = await propGet(e.o.k === "base" ? { t: "object", fields: o.fields, cls: o.cls, self: ctx.self } : o, n, e.line, ctx); if (pv !== undefined) return pv; }
      if (o.t === "object" && o.kv) return o.fields[n].v;
      throw new CompileError("error CS1061: '" + typeName(o) + "' does not contain a definition for '" + n + "'", e.line);
    }

    async function evalArgs(list, env, ctx) {
      var out2 = [];
      for (var i = 0; i < list.length; i++) {
        var a = list[i];
        if (a.k === "outdecl") { var slot = { v: defaultFor(a.type), type: a.type.name === "var" ? null : a.type, name: a.name }; env.declare(a.name, slot, a.line); out2.push({ refSlot: slot, t: "ref" }); }
        else if (a.k === "ref") { var lv = lvalue(a.e, env, ctx); if (!lv || !lv.slot) throw new CompileError("error CS1510: A ref or out value must be an assignable variable", a.e.line); out2.push({ refSlot: lv.slot, t: "ref" }); }
        else out2.push(await evalE(a, env, ctx));
      }
      return out2;
    }

    function fmtComposite(fmt, args) {
      return fmt.replace(/\{\{|\}\}|\{(\d+)(,(-?\d+))?(:([^}]*))?\}/g, function (m, i, _a, al, _f, f) {
        if (m === "{{") return "{"; if (m === "}}") return "}";
        var v = args[+i]; if (!v) throw new CsException("FormatException", "Index (zero based) must be greater than or equal to zero and less than the size of the argument list.");
        var t = f && isNum(v) ? formatNum(v, f) : str(v);
        if (al) { var w = +al; while (t.length < Math.abs(w)) t = w > 0 ? " " + t : t + " "; }
        return t;
      });
    }
    function writeArgs(a) { if (!a.length) return ""; if (a.length > 1 && a[0].t === "string") return fmtComposite(a[0].v, a.slice(1)); return str(a[0]); }

    async function callLambda(fn, args) {
      var le = new Env(fn.env); for (var i = 0; i < fn.params.length; i++) le.vars[fn.params[i]] = { v: args[i] };
      if (fn.body.k === "block") { try { await exec(fn.body, le, fn.ctx); } catch (s) { if (s instanceof Signal && s.kind === "return") return s.value; throw s; } return { t: "void" }; }
      return evalE(fn.body, le, fn.ctx);
    }

    async function call(e, env, ctx) {
      var f = e.f;
      // plain method name
      if (f.k === "id") {
        var sc = env.lookup(f.name);
        if (sc && sc.vars[f.name].v && sc.vars[f.name].v.t === "fn") { var fn = sc.vars[f.name].v; return invoke(fn.m, await evalArgs(e.args, env, ctx), { cls: ctx.cls, self: ctx.self, depth: ctx.depth || 0 }, e.line, f.name); }
        if (sc && sc.vars[f.name].v && sc.vars[f.name].v.t === "lambda") return callLambda(sc.vars[f.name].v, await evalArgs(e.args, env, ctx));
        var cls = (ctx.self && ctx.self.cls) || ctx.cls, m = null;
        while (cls && !m) { m = cls.methods[f.name]; cls = m ? cls : (cls.base ? classes[cls.base] : null); }
        if (!m && ctx.cls) { cls = ctx.cls; while (cls && !m) { m = cls.methods[f.name]; cls = m ? cls : (cls.base ? classes[cls.base] : null); } }
        if (!m) { var main = findMain(); if (main && main.cls.methods[f.name]) { m = main.cls.methods[f.name]; cls = main.cls; } }
        if (!m) throw new CompileError("error CS0103: The name '" + f.name + "' does not exist in the current context", e.line);
        if (!m.isStatic && !ctx.self) throw new CompileError("error CS0120: An object reference is required for the non-static method '" + f.name + "' (add 'static')", e.line);
        var args = await evalArgs(e.args, env, ctx);
        return invoke(m, args, { cls: cls, self: m.isStatic ? null : ctx.self, depth: ctx.depth || 0 }, e.line, f.name);
      }
      if (f.k !== "member") throw new CompileError("error CS0149: Method name expected", e.line);
      var name = f.name;
      if (f.o.k === "base") {
        var bc = ctx.cls && ctx.cls.base ? classes[ctx.cls.base] : null, bm = null;
        while (bc && !bm) { bm = bc.methods[name]; if (!bm) bc = bc.base ? classes[bc.base] : null; }
        var ba = await evalArgs(e.args, env, ctx);
        if (!bm) { if (name === "ToString") return S(ctx.cls && ctx.cls.base ? ctx.cls.base : "object"); throw new CompileError("error CS0117: The base class does not contain a definition for '" + name + "'", e.line); }
        return invoke(bm, ba, { cls: bc, self: ctx.self, depth: ctx.depth || 0 }, e.line, name);
      }
      // static/builtin type calls
      if (f.o.k === "id" && !env.lookup(f.o.name) && !(ctx.self && ctx.self.fields[f.o.name]) && !findStatic(f.o.name, ctx)) {
        var tn = f.o.name, a = await evalArgs(e.args, env, ctx);
        if (tn === "Console") for (var ai = 0; ai < a.length; ai++) a[ai] = await strA(a[ai], ctx);
        var r = await builtinStatic(tn, name, a, e, env, ctx);
        if (r !== undefined) return r;
        if (classes[tn]) {
          var sm = classes[tn].methods[name];
          if (!sm) throw new CompileError("error CS0117: '" + tn + "' does not contain a definition for '" + name + "'", e.line);
          if (!sm.isStatic) throw new CompileError("error CS0120: An object reference is required for the non-static method '" + tn + "." + name + "'", e.line);
          return invoke(sm, a, { cls: classes[tn], self: null, depth: ctx.depth || 0 }, e.line, name);
        }
        throw new CompileError("error CS0103: The name '" + tn + "' does not exist in the current context", e.line);
      }
      var o = f.o.k === "this" ? { t: "object", fields: ctx.self.fields, cls: ctx.self.cls } : await evalE(f.o, env, ctx);
      var args2 = await evalArgs(e.args, env, ctx);
      if (o.t === "null") throw new CsException("NullReferenceException", "Object reference not set to an instance of an object.");
      var res = await instanceCall(o, name, args2, e, env, ctx);
      if (res !== undefined) return res;
      throw new CompileError("error CS1061: '" + typeName(o) + "' does not contain a definition for '" + name + "'", e.line);
    }

    var BUILTIN_TYPES = { Console: 1, Convert: 1, Math: 1, int: 1, double: 1, string: 1, String: 1, char: 1, Char: 1, bool: 1, Int32: 1, Double: 1, Array: 1, File: 1, Thread: 1, Environment: 1, DateTime: 1, float: 1, decimal: 1, Decimal: 1, Boolean: 1 };

    async function builtinStatic(tn, n, a, e) {
      var line = e.line;
      function need(k) { if (a.length !== k) throw new CompileError("error CS1501: No overload for method '" + n + "' takes " + a.length + " arguments", line); }
      if (tn === "Console") {
        if (n === "WriteLine") { out(writeArgs(a) + "\n"); return { t: "void" }; }
        if (n === "Write") { out(writeArgs(a)); return { t: "void" }; }
        if (n === "ReadLine") { var s = await input(); if (s === null || s === undefined) return NULL; out(s + "\n", "in"); return S(String(s)); }
        if (n === "ReadKey" || n === "Read") { return { t: "void" }; }
        if (n === "Clear" || n === "Beep" || n === "ResetColor") return { t: "void" };
      }
      if (tn === "Convert") {
        var v = a[0];
        if ((n === "ToInt32" || n === "ToInt16" || n === "ToInt64") && a.length === 2 && v.t === "string") { // Convert.ToInt32("1011", 2)
          var base2 = num(a[1]), txt2 = v.v.trim(); if ([2, 8, 10, 16].indexOf(base2) < 0) throw new CsException("ArgumentException", "Invalid Base.");
          if (!txt2 || !new RegExp("^[" + "0123456789abcdef".slice(0, base2) + "]+$", "i").test(txt2)) throw new CsException("FormatException", "Could not find any recognizable digits.");
          return I(parseInt(txt2, base2));
        }
        if (n === "ToString" && a.length === 2 && isNum(v) && [2, 8, 16].indexOf(num(a[1])) > -1) { // Convert.ToString(13, 2) → "1101"
          var nv = num(v); return S((nv < 0 ? (nv >>> 0) : nv).toString(num(a[1])));
        }
        if (n === "ToInt32" || n === "ToInt16" || n === "ToInt64") {
          need(1);
          if (v.t === "string") return I(parseIntStrict(v.v));
          if (v.t === "double") return I(roundHalfEven(v.v));
          if (v.t === "char") return I(v.v.charCodeAt(0));
          if (v.t === "bool") return I(v.v ? 1 : 0);
          if (v.t === "null") return I(0);
          return I(num(v));
        }
        if (n === "ToDouble" || n === "ToDecimal" || n === "ToSingle") { need(1); if (v.t === "string") return D(parseDoubleStrict(v.v)); if (v.t === "null") return D(0); if (v.t === "bool") return D(v.v ? 1 : 0); return D(num(v)); }
        if (n === "ToString") return S(a.length > 1 && isNum(v) ? formatNum(v, str(a[1])) : str(v));
        if (n === "ToBoolean") { if (v.t === "string") { var lb = v.v.trim().toLowerCase(); if (lb === "true") return B(true); if (lb === "false") return B(false); throw new CsException("FormatException", "String '" + v.v + "' was not recognized as a valid Boolean."); } return B(num(v) !== 0); }
        if (n === "ToChar") { if (v.t === "string") { if (v.v.length !== 1) throw new CsException("FormatException", "String must be exactly one character long."); return C(v.v); } return C(String.fromCharCode(num(v))); }
      }
      if (tn === "int" || tn === "Int32" || tn === "long") {
        if (n === "Parse") return I(parseIntStrict(str(a[0])));
        if (n === "TryParse") { var ok = true, pv = 0; try { if (a[0].t === "null") throw 0; pv = parseIntStrict(a[0].v); } catch (er) { ok = false; } if (a[1] && a[1].refSlot) a[1].refSlot.v = I(ok ? pv : 0); return B(ok); }
      }
      if (tn === "double" || tn === "Double" || tn === "decimal" || tn === "float") {
        if (n === "Parse") return D(parseDoubleStrict(str(a[0])));
        if (n === "TryParse") { var ok2 = true, dv = 0; try { if (a[0].t === "null") throw 0; dv = parseDoubleStrict(a[0].v); } catch (er2) { ok2 = false; } if (a[1] && a[1].refSlot) a[1].refSlot.v = D(ok2 ? dv : 0); return B(ok2); }
      }
      if (tn === "bool" || tn === "Boolean") {
        if (n === "Parse" || n === "TryParse") { var bs = str(a[0]).trim().toLowerCase(), good = bs === "true" || bs === "false"; if (n === "Parse") { if (!good) throw new CsException("FormatException", "String '" + str(a[0]) + "' was not recognized as a valid Boolean."); return B(bs === "true"); } if (a[1] && a[1].refSlot) a[1].refSlot.v = B(bs === "true"); return B(good); }
      }
      if (tn === "char" || tn === "Char") {
        var ch = a[0] && (a[0].t === "char" ? a[0].v : a[0].t === "string" ? a[0].v[num(a[1] || I(0))] : "");
        if (n === "IsDigit") return B(/[0-9]/.test(ch)); if (n === "IsLetter") return B(/[A-Za-z\u00C0-\u024F]/.test(ch));
        if (n === "IsUpper") return B(/[A-Z]/.test(ch)); if (n === "IsLower") return B(/[a-z]/.test(ch));
        if (n === "IsWhiteSpace") return B(/\s/.test(ch)); if (n === "IsLetterOrDigit") return B(/[A-Za-z0-9]/.test(ch)); if (n === "IsPunctuation") return B(/[!-\/:-@\[-`{-~]/.test(ch) && !/[$+<=>^`|~]/.test(ch));
        if (n === "ToUpper") return C(ch.toUpperCase()); if (n === "ToLower") return C(ch.toLowerCase());
        if (n === "Parse") { if (str(a[0]).length !== 1) throw new CsException("FormatException", "String must be exactly one character long."); return C(str(a[0])); }
      }
      if (tn === "string" || tn === "String") {
        if (n === "Join") { var items = a.length === 2 && (a[1].t === "array" || a[1].t === "list") ? a[1].v : a.slice(1); return S(items.map(str).join(str(a[0]))); }
        if (n === "IsNullOrEmpty") return B(a[0].t === "null" || a[0].v === "");
        if (n === "IsNullOrWhiteSpace") return B(a[0].t === "null" || !a[0].v.trim());
        if (n === "Concat") return S(a.map(str).join(""));
        if (n === "Format") return S(fmtComposite(str(a[0]), a.slice(1)));
        if (n === "Compare") { var x1 = str(a[0]), y1 = str(a[1]); if (a[2] && a[2].v) { x1 = x1.toLowerCase(); y1 = y1.toLowerCase(); } return I(x1.localeCompare(y1, "en", { sensitivity: "variant" }) < 0 ? -1 : x1 === y1 ? 0 : 1); }
        if (n === "Equals") return B(str(a[0]) === str(a[1]));
      }
      if (tn === "Math") {
        var x = a[0] ? num(a[0]) : 0, y = a[1] ? num(a[1]) : 0, allInt = a.every(function (q) { return q.t === "int"; });
        switch (n) {
          case "Sqrt": return D(Math.sqrt(x)); case "Pow": return D(Math.pow(x, y));
          case "Abs": return a[0].t === "int" ? I(Math.abs(x)) : D(Math.abs(x));
          case "Max": return allInt ? I(Math.max(x, y)) : D(Math.max(x, y)); case "Min": return allInt ? I(Math.min(x, y)) : D(Math.min(x, y));
          case "Floor": return D(Math.floor(x)); case "Ceiling": return D(Math.ceil(x)); case "Truncate": return D(Math.trunc(x));
          case "Round": return D(a.length > 1 && a[1].t === "int" ? roundHalfEven(x, y) : roundHalfEven(x));
          case "Sin": return D(Math.sin(x)); case "Cos": return D(Math.cos(x)); case "Tan": return D(Math.tan(x)); case "Log10": return D(Math.log10(x)); case "Log": return D(Math.log(x));
          case "Sign": return I(Math.sign(x));
        }
      }
      if (tn === "Array") {
        var arr = a[0];
        if (n === "Sort") { arr.v.sort(cmpVals); return { t: "void" }; }
        if (n === "Reverse") { arr.v.reverse(); return { t: "void" }; }
        if (n === "IndexOf") { for (var ai = 0; ai < arr.v.length; ai++) if (equalsV(arr.v[ai], a[1])) return I(ai); return I(-1); }
        if (n === "Clear") { for (var ci = 0; ci < arr.v.length; ci++) arr.v[ci] = defaultFor({ name: arr.et }); return { t: "void" }; }
        if (n === "Resize") { return { t: "void" }; }
        if (n === "Exists") { for (var ei = 0; ei < arr.v.length; ei++) if ((await callLambda(a[1], [arr.v[ei]])).v) return B(true); return B(false); }
      }
      if (tn === "File") {
        var fname = a[0] ? str(a[0]) : "";
        if (n === "Exists") return B(fname in files);
        if (n === "WriteAllText") { files[fname] = str(a[1]); return { t: "void" }; }
        if (n === "AppendAllText") { files[fname] = (files[fname] || "") + str(a[1]); return { t: "void" }; }
        if (n === "WriteAllLines") { files[fname] = a[1].v.map(str).join("\n") + "\n"; return { t: "void" }; }
        if (n === "AppendAllLines") { files[fname] = (files[fname] || "") + a[1].v.map(str).join("\n") + "\n"; return { t: "void" }; }
        if (!(fname in files) && /^Read/.test(n)) throw new CsException("FileNotFoundException", "Could not find file '" + fname + "'.");
        if (n === "ReadAllText") return S(files[fname]);
        if (n === "ReadAllLines" || n === "ReadLines") { var ls = files[fname].replace(/\r/g, "").split("\n"); if (ls[ls.length - 1] === "") ls.pop(); return { t: "array", v: ls.map(S), et: "string" }; }
        if (n === "Delete") { delete files[fname]; return { t: "void" }; }
      }
      if (tn === "Thread" && n === "Sleep") return { t: "void" };
      return undefined;
    }
    function cmpVals(x, y) { if (isNum(x) && isNum(y)) return num(x) - num(y); var a2 = str(x), b2 = str(y); return a2 < b2 ? -1 : a2 > b2 ? 1 : 0; }

    async function instanceCall(o, n, a, e, env, ctx) {
      var line = e.line;
      if (n === "ToString") {
        if (isNum(o) && a.length) return S(formatNum(o, str(a[0])));
        if (o.t === "object" && o.cls) { var ts = await strA(o, ctx); if (ts !== o) return ts; }
        if (o.t === "sb") return S(o.v);
        if (o.t === "date") { var q2 = function (x) { return (x < 10 ? "0" : "") + x; }, dz = o.v; if (a.length) { var fm = str(a[0]); return S(fm.replace(/yyyy|MM|dd|HH|mm|ss/g, function (t2) { return { yyyy: dz.getFullYear(), MM: q2(dz.getMonth() + 1), dd: q2(dz.getDate()), HH: q2(dz.getHours()), mm: q2(dz.getMinutes()), ss: q2(dz.getSeconds()) }[t2]; })); } return S(str(o)); }
        return S(str(o));
      }
      if (n === "Equals") return B(equalsV(o, a[0]));
      if (n === "GetType") return S("System." + ({ int: "Int32", double: "Double", string: "String", char: "Char", bool: "Boolean" }[o.t] || typeName(o)));
      if (n === "CompareTo") return I(cmpVals(o, a[0]) < 0 ? -1 : cmpVals(o, a[0]) > 0 ? 1 : 0);
      if (o.t === "string") {
        var s = o.v;
        switch (n) {
          case "ToUpper": case "ToUpperInvariant": return S(s.toUpperCase());
          case "ToLower": case "ToLowerInvariant": return S(s.toLowerCase());
          case "Trim": return S(s.trim()); case "TrimStart": return S(s.replace(/^\s+/, "")); case "TrimEnd": return S(s.replace(/\s+$/, ""));
          case "Substring": {
            var st = num(a[0]), ln = a[1] ? num(a[1]) : s.length - st;
            if (st < 0 || st > s.length) throw new CsException("ArgumentOutOfRangeException", "startIndex cannot be larger than length of string.");
            if (ln < 0 || st + ln > s.length) throw new CsException("ArgumentOutOfRangeException", "Index and length must refer to a location within the string.");
            return S(s.substr(st, ln));
          }
          case "IndexOf": return I(s.indexOf(str(a[0]), a[1] ? num(a[1]) : 0));
          case "LastIndexOf": return I(s.lastIndexOf(str(a[0])));
          case "Contains": return B(s.indexOf(str(a[0])) > -1);
          case "StartsWith": return B(s.indexOf(str(a[0])) === 0);
          case "EndsWith": return B(s.slice(-str(a[0]).length) === str(a[0]));
          case "Replace": return S(s.split(str(a[0])).join(str(a[1])));
          case "Split": { var sep = a.length ? (a[0].t === "array" ? a[0].v.map(str) : a.filter(function (q) { return q.t === "char" || q.t === "string"; }).map(str)) : [" "]; var parts = [s]; sep.forEach(function (sp) { parts = [].concat.apply([], parts.map(function (pp) { return pp.split(sp); })); }); return { t: "array", v: parts.map(S), et: "string" }; }
          case "ToCharArray": return { t: "array", v: s.split("").map(C), et: "char" };
          case "PadLeft": { var pl = s; while (pl.length < num(a[0])) pl = (a[1] ? a[1].v : " ") + pl; return S(pl); }
          case "PadRight": { var pr = s; while (pr.length < num(a[0])) pr += (a[1] ? a[1].v : " "); return S(pr); }
          case "Insert": return S(s.slice(0, num(a[0])) + str(a[1]) + s.slice(num(a[0])));
          case "Remove": return S(s.slice(0, num(a[0])) + (a[1] ? s.slice(num(a[0]) + num(a[1])) : ""));
        }
      }
      if (o.t === "array" || o.t === "list") {
        var v = o.v;
        switch (n) {
          case "Add": if (o.t !== "list") break; v.push(o.et ? coerce(a[0], { name: o.et }, line) : a[0]); return { t: "void" };
          case "AddRange": v.push.apply(v, a[0].v); return { t: "void" };
          case "Insert": v.splice(num(a[0]), 0, a[1]); return { t: "void" };
          case "Remove": for (var i = 0; i < v.length; i++) if (equalsV(v[i], a[0])) { v.splice(i, 1); return B(true); } return B(false);
          case "RemoveAt": checkIndex(o, a[0], line); v.splice(num(a[0]), 1); return { t: "void" };
          case "Clear": v.length = 0; return { t: "void" };
          case "Contains": for (var j = 0; j < v.length; j++) if (equalsV(v[j], a[0])) return B(true); return B(false);
          case "IndexOf": for (var k = 0; k < v.length; k++) if (equalsV(v[k], a[0])) return I(k); return I(-1);
          case "Sort": v.sort(cmpVals); return { t: "void" };
          case "Reverse": v.reverse(); return { t: "void" };
          case "ToArray": return { t: "array", v: v.slice(), et: o.et };
          case "ToList": return { t: "list", v: v.slice(), et: o.et };
          case "Sum": return v.some(function (q) { return q.t === "double"; }) ? D(v.reduce(function (s2, q) { return s2 + num(q); }, 0)) : I(v.reduce(function (s2, q) { return s2 + num(q); }, 0));
          case "Max": if (!v.length) throw new CsException("InvalidOperationException", "Sequence contains no elements"); return v.reduce(function (m, q) { return cmpVals(q, m) > 0 ? q : m; });
          case "Min": if (!v.length) throw new CsException("InvalidOperationException", "Sequence contains no elements"); return v.reduce(function (m, q) { return cmpVals(q, m) < 0 ? q : m; });
          case "Average": if (!v.length) throw new CsException("InvalidOperationException", "Sequence contains no elements"); return D(v.reduce(function (s2, q) { return s2 + num(q); }, 0) / v.length);
          case "Count": if (!a.length) return I(v.length); var cnt = 0; for (var c2 = 0; c2 < v.length; c2++) if ((await callLambda(a[0], [v[c2]])).v) cnt++; return I(cnt);
          case "GetLength": return I(o.dims ? o.dims[num(a[0])] : v.length);
        }
      }
      if (o.t === "dict") {
        if (n === "Add") { var key = keyOf(a[0]); if (key in o.v) throw new CsException("ArgumentException", "An item with the same key has already been added."); o.v[key] = a[1]; o.keys[key] = a[0]; return { t: "void" }; }
        if (n === "ContainsKey") return B(keyOf(a[0]) in o.v);
        if (n === "Remove") { var rk = keyOf(a[0]); var had = rk in o.v; delete o.v[rk]; delete o.keys[rk]; return B(had); }
      }
      if (o.t === "random" && n === "Next") { var lo = a.length === 2 ? num(a[0]) : 0, hi = a.length ? num(a[a.length - 1]) : 2147483647; return I(lo + Math.floor(rnd(o) * (hi - lo))); }
      if (o.t === "random" && n === "NextDouble") return D(rnd(o));
      if (o.t === "stream") {
        if (!o.open && n !== "Close" && n !== "Dispose") throw new CsException("ObjectDisposedException", "Cannot access a closed file.");
        if (o.mode === "w" && n === "WriteLine") { files[o.name] += writeArgs(a) + "\n"; return { t: "void" }; }
        if (o.mode === "w" && n === "Write") { files[o.name] += writeArgs(a); return { t: "void" }; }
        if (o.mode === "r" && n === "ReadLine") return o.pos < o.lines.length ? S(o.lines[o.pos++]) : NULL;
        if (o.mode === "r" && n === "ReadToEnd") { var rest = o.lines.slice(o.pos).join("\n"); o.pos = o.lines.length; return S(rest); }
        if (n === "Close" || n === "Dispose" || n === "Flush") { if (n !== "Flush") o.open = false; return { t: "void" }; }
      }
      if (o.t === "date") {
        var p2 = function (x) { return (x < 10 ? "0" : "") + x; }, dv = o.v;
        if (n === "ToShortDateString") return S(p2(dv.getDate()) + "/" + p2(dv.getMonth() + 1) + "/" + dv.getFullYear());
        if (n === "ToLongDateString") return S(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dv.getDay()] + ", " + dv.getDate() + " " + ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][dv.getMonth()] + " " + dv.getFullYear());
        if (n === "ToShortTimeString") return S(p2(dv.getHours()) + ":" + p2(dv.getMinutes()));
        if (n === "AddDays" || n === "AddMonths" || n === "AddYears") { var nd = new Date(dv.getTime()); if (n === "AddDays") nd.setDate(nd.getDate() + num(a[0])); if (n === "AddMonths") nd.setMonth(nd.getMonth() + num(a[0])); if (n === "AddYears") nd.setFullYear(nd.getFullYear() + num(a[0])); return { t: "date", v: nd }; }
      }
      if (o.t === "sb") { if (n === "Append") { o.v += str(a[0]); return o; } if (n === "AppendLine") { o.v += (a[0] ? str(a[0]) : "") + "\n"; return o; } if (n === "Clear") { o.v = ""; return o; } }
      if (o.t === "object" && o.cls) {
        var cls = o.cls, m = null; while (cls && !m) { m = cls.methods[n]; if (!m) cls = cls.base ? classes[cls.base] : null; }
        if (m) return invoke(m, a, { cls: cls, self: o, depth: ctx.depth || 0 }, line, n);
      }
      if (o.t === "lambda" && n === "Invoke") return callLambda(o, a);
      return undefined;
    }

    return (async function () {
      try {
        await initStatics();
        var main = findMain(), ctx = { depth: 0 };
        if (prog.top.length) {
          var env = new Env(null); env.isMethod = true;
          for (var i = 0; i < prog.top.length; i++) if (prog.top[i].k === "localfn") env.vars[prog.top[i].m.name] = { v: { t: "fn", m: prog.top[i].m, env: env } };
          ctx.cls = main ? main.cls : null;
          for (var j = 0; j < prog.top.length; j++) await exec(prog.top[j], env, ctx);
        } else if (main) {
          var args = main.m.params.length ? [{ t: "array", v: [], et: "string" }] : [];
          await invoke(main.m, args, { cls: main.cls, self: null, depth: 0 }, main.m.line, "Main");
        } else {
          throw new CompileError("error CS5001: Program does not contain a static 'Main' method suitable for an entry point", 1);
        }
        return { ok: true, files: files };
      } catch (e) {
        if (e instanceof Signal && e.kind === "return") return { ok: true, files: files };
        var r = fail(e); r.files = files; return r;
      }
    })();
  }

  // Wrap a snippet that has no class/Main so it can run (used for short examples)
  function wrap(code) {
    if (/\bstatic\s+void\s+Main\b/.test(code) || /\bclass\s+\w+/.test(code)) return code;
    return code; // top-level statements are supported directly
  }

  root.CSharp = { run: function (code, io) { return run(wrap(code), io); }, lex: lex };
})(typeof window !== "undefined" ? window : global);
