/*
 * ERGS C# Academy - a C# interpreter written in plain JavaScript.
 *
 * Pupils write real C# in the browser; this file turns their source into
 * JavaScript generator functions and runs them.  The pipeline is:
 *
 *   1. Lexer        source text  -> tokens (with line numbers)
 *   2. Parser       tokens       -> AST (recursive descent)
 *   3. Compiler     AST          -> type-checked JavaScript source
 *                   (scope resolution, overloads, access rules, definite
 *                   assignment, "not all code paths return a value", ...)
 *   4. Runtime      helpers for C# values: int/double/decimal maths,
 *                   strings, formatting, collections, files, DateTime,
 *                   Random (the real .NET algorithm), SHA-256, exceptions.
 *   5. Driver       runs the generated generator, awaiting ReadLine/ReadKey,
 *                   yielding to the event loop, counting steps.
 *
 * Public API (see SPEC.md section 1):
 *   await CSharp.run(source, { write, clear, readLine, readKey, files, maxSteps, shouldStop })
 *   CSharp.check(source)  -> [] or [{ message, line }]
 *
 * Works as window.CSharp in a browser and as module.exports in Node.
 * No dependencies.
 */
(function (root, factory) {
  'use strict';
  const CSharp = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = CSharp;
  if (typeof window !== 'undefined') window.CSharp = CSharp;
  else if (root) root.CSharp = CSharp;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
'use strict';

// ===========================================================================
// 1. Errors
// ===========================================================================

class CompileError extends Error {
  constructor(message, line) { super(message); this.csMessage = message; this.line = line || 1; }
}
function unsupported(what, line) {
  // "Tuples are not supported", "'goto' is not supported"
  const words = what.split(/[(\[]/)[0].match(/[A-Za-z'.]+/g) || [];
  const last = words[words.length - 1] || '';
  const plural = /[^s]s$/.test(last) && last[0] !== "'" && last !== 'is';
  throw new CompileError(`${what} ${plural ? 'are' : 'is'} not supported in this course`, line);
}

// ===========================================================================
// 2. Lexer
// ===========================================================================

const KEYWORDS = new Set(('abstract as base bool break byte case catch char checked class const continue ' +
  'decimal default delegate do double else enum event explicit extern false finally fixed float for foreach ' +
  'goto if implicit in int interface internal is lock long namespace new null object operator out override ' +
  'params private protected public readonly ref return sbyte sealed short sizeof stackalloc static string ' +
  'struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while').split(' '));

const PREDEF_TYPES = new Set(['bool', 'byte', 'sbyte', 'char', 'decimal', 'double', 'float', 'int', 'uint',
  'long', 'ulong', 'short', 'ushort', 'object', 'string', 'void']);

const OPS = ['>>=', '<<=', '??=', '=>', '==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=',
  '%=', '&=', '|=', '^=', '<<', '??', '?.', '::', '->', '+', '-', '*', '/', '%', '&', '|', '^', '!', '~', '=',
  '<', '>', '?', ':', ';', ',', '.', '(', ')', '[', ']', '{', '}'];

const ID_START = /[A-Za-z_À-ɏͰ-ϿЀ-ӿ]/;
const ID_PART = /[A-Za-z0-9_À-ɏͰ-ϿЀ-ӿ]/;

function lex(src, startLine) {
  const toks = [];
  const n = src.length;
  let i = 0, line = startLine || 1;
  const err = (msg, ln) => { throw new CompileError(msg, ln || line); };

  function readEscape() {
    // src[i] === '\\'
    const e = src[i + 1];
    i += 2;
    switch (e) {
      case 'n': return '\n';
      case 't': return '\t';
      case 'r': return '\r';
      case '0': return '\0';
      case '\\': return '\\';
      case '"': return '"';
      case "'": return "'";
      case 'a': return '\x07';
      case 'b': return '\b';
      case 'f': return '\f';
      case 'v': return '\v';
      case 'u': {
        const h = src.substr(i, 4);
        if (!/^[0-9a-fA-F]{4}$/.test(h)) err('Unrecognized escape sequence');
        i += 4; return String.fromCharCode(parseInt(h, 16));
      }
      case 'x': {
        let j = i; while (j < n && j < i + 4 && /[0-9a-fA-F]/.test(src[j])) j++;
        if (j === i) err('Unrecognized escape sequence');
        const v = parseInt(src.slice(i, j), 16); i = j; return String.fromCharCode(v);
      }
      case 'U': {
        const h = src.substr(i, 8);
        if (!/^[0-9a-fA-F]{8}$/.test(h)) err('Unrecognized escape sequence');
        i += 8; return String.fromCodePoint(parseInt(h, 16));
      }
      case '\n': case undefined: err('Newline in constant'); break;
      default: err('Unrecognized escape sequence');
    }
  }

  // Reads the body of an interpolated string (after the opening quote).
  function readInterpolated(verbatim, tl) {
    const parts = [];
    let text = '';
    while (true) {
      if (i >= n) err('Newline in constant', tl);
      const c = src[i];
      if (c === '"') {
        if (verbatim && src[i + 1] === '"') { text += '"'; i += 2; continue; }
        i++; break;
      }
      if (c === '\n') {
        if (!verbatim) err('Newline in constant', tl);
        text += c; line++; i++; continue;
      }
      if (c === '\\' && !verbatim) { text += readEscape(); continue; }
      if (c === '{') {
        if (src[i + 1] === '{') { text += '{'; i += 2; continue; }
        if (text) parts.push({ s: text }); text = '';
        i++;
        const holeLine = line;
        let depth = 0, j = i, alignStart = -1, fmtStart = -1, exprEnd = -1;
        while (true) {
          if (j >= n) err('} expected', holeLine);
          const d = src[j];
          if (fmtStart >= 0) {
            if (d === '}') break;
            if (d === '\n') err('Newline in constant', holeLine);
            j++; continue;
          }
          if (d === '"' || d === "'") { // skip nested literal
            const q = d; j++;
            while (j < n && src[j] !== q) { if (src[j] === '\\') j++; if (src[j] === '\n') err('Newline in constant', holeLine); j++; }
            j++; continue;
          }
          if (d === '\n') line++;
          if (d === '(' || d === '[' || d === '{') depth++;
          else if (d === ')' || d === ']') depth--;
          else if (d === '}') { if (depth === 0) break; depth--; }
          else if (depth === 0 && d === ',' && alignStart < 0) { exprEnd = j; alignStart = j + 1; }
          else if (depth === 0 && d === ':' && !(src[j + 1] === ':')) {
            if (exprEnd < 0) exprEnd = j;
            fmtStart = j + 1;
          }
          j++;
        }
        if (exprEnd < 0) exprEnd = j;
        const exprSrc = src.slice(i, exprEnd);
        const align = alignStart >= 0 ? src.slice(alignStart, fmtStart >= 0 ? fmtStart - 1 : j).trim() : null;
        const fmt = fmtStart >= 0 ? src.slice(fmtStart, j) : null;
        if (!exprSrc.trim()) err('Empty expression in interpolated string', holeLine);
        parts.push({ src: exprSrc, line: holeLine, align, fmt });
        i = j + 1;
        continue;
      }
      if (c === '}') {
        if (src[i + 1] === '}') { text += '}'; i += 2; continue; }
        err("'}' character must be escaped (by doubling) in an interpolated string.");
      }
      text += c; i++;
    }
    if (text) parts.push({ s: text });
    return parts;
  }

  while (true) {
    // whitespace, comments, preprocessor lines
    while (i < n) {
      const c = src[i];
      if (c === '\n') { line++; i++; }
      else if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\v' || c === '﻿' || c === ' ') i++;
      else if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; }
      else if (c === '/' && src[i + 1] === '*') {
        const sl = line; i += 2;
        while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; }
        if (i >= n) err("End-of-file found, '*/' expected", sl);
        i += 2;
      }
      else if (c === '#') { while (i < n && src[i] !== '\n') i++; }
      else break;
    }
    const start = i, tl = line;
    if (i >= n) { toks.push({ t: 'eof', v: '', line, pos: i, end: i }); break; }
    const c = src[i];
    const push = (t, v, extra) => {
      const tok = { t, v, line: tl, pos: start, end: i };
      if (extra) Object.assign(tok, extra);
      toks.push(tok);
    };

    // identifiers and keywords (incl. @verbatim identifiers)
    if (ID_START.test(c) || (c === '@' && ID_START.test(src[i + 1] || ''))) {
      const verbatimId = c === '@';
      if (verbatimId) i++;
      let j = i; while (j < n && ID_PART.test(src[j])) j++;
      const word = src.slice(i, j); i = j;
      if (!verbatimId && KEYWORDS.has(word)) push('kw', word); else push('id', word);
      continue;
    }

    // numbers
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i, isReal = false, value, nk = 'int', text;
      if (c === '0' && (src[i + 1] === 'x' || src[i + 1] === 'X')) {
        j = i + 2; while (j < n && /[0-9a-fA-F_]/.test(src[j])) j++;
        text = src.slice(i + 2, j).replace(/_/g, '');
        value = parseInt(text, 16);
      } else if (c === '0' && (src[i + 1] === 'b' || src[i + 1] === 'B')) {
        j = i + 2; while (j < n && /[01_]/.test(src[j])) j++;
        text = src.slice(i + 2, j).replace(/_/g, '');
        value = parseInt(text, 2);
      } else {
        while (j < n && /[0-9_]/.test(src[j])) j++;
        if (src[j] === '.' && /[0-9]/.test(src[j + 1] || '')) {
          isReal = true; j++;
          while (j < n && /[0-9_]/.test(src[j])) j++;
        }
        if ((src[j] === 'e' || src[j] === 'E') && (/[0-9]/.test(src[j + 1] || '') || (/[+-]/.test(src[j + 1] || '') && /[0-9]/.test(src[j + 2] || '')))) {
          isReal = true; j += 2;
          while (j < n && /[0-9]/.test(src[j])) j++;
        }
        text = src.slice(i, j).replace(/_/g, '');
        value = Number(text);
      }
      const suf = src[j] || '';
      if (suf === 'm' || suf === 'M') { j++; nk = 'decimal'; value = text; }
      else if (suf === 'f' || suf === 'F') { j++; nk = 'float'; value = Math.fround(Number(text)); }
      else if (suf === 'd' || suf === 'D') { j++; nk = 'double'; value = Number(text); }
      else if (/[lLuU]/.test(suf)) {
        j++; if (/[lLuU]/.test(src[j] || '')) j++;
        nk = isReal ? 'double' : 'long';
      }
      else if (isReal) nk = 'double';
      else if (value > 2147483647) {
        if (value > 9223372036854775807) err('Integral constant is too large');
        nk = 'long';
      }
      if (ID_PART.test(src[j] || '')) { i = j; err('; expected'); }
      i = j;
      push('num', value, { nk, text });
      continue;
    }

    // strings: "..."  @"..."  $"..."  $@"..."  @$"..."
    if (c === '"' && src[i + 1] === '"' && src[i + 2] === '"') unsupported('Raw string literals (""")', tl);
    if (c === '"') {
      i++;
      let s = '';
      while (true) {
        if (i >= n || src[i] === '\n' || src[i] === '\r') err('Newline in constant', tl);
        const d = src[i];
        if (d === '"') { i++; break; }
        if (d === '\\') { s += readEscape(); continue; }
        s += d; i++;
      }
      push('str', s);
      continue;
    }
    if (c === '@' && src[i + 1] === '"') {
      i += 2;
      let s = '';
      while (true) {
        if (i >= n) err('Newline in constant', tl);
        const d = src[i];
        if (d === '"') { if (src[i + 1] === '"') { s += '"'; i += 2; continue; } i++; break; }
        if (d === '\n') line++;
        if (d !== '\r') s += d;
        i++;
      }
      push('str', s);
      continue;
    }
    if ((c === '$' && src[i + 1] === '"') || (c === '$' && src[i + 1] === '@' && src[i + 2] === '"') ||
        (c === '@' && src[i + 1] === '$' && src[i + 2] === '"')) {
      const verbatim = src[i + 1] !== '"';
      i += verbatim ? 3 : 2;
      const parts = readInterpolated(verbatim, tl);
      push('interp', parts);
      continue;
    }
    if (c === '$' && src[i + 1] === '$') unsupported('Raw interpolated strings', tl);

    // characters
    if (c === "'") {
      i++;
      let s;
      if (src[i] === "'") err('Empty character literal');
      if (src[i] === '\n' || i >= n) err('Newline in constant');
      if (src[i] === '\\') s = readEscape(); else { s = src[i]; i++; }
      if (src[i] !== "'") {
        let j = i; while (j < n && src[j] !== "'" && src[j] !== '\n') j++;
        if (src[j] === "'") { i = j + 1; err('Too many characters in character literal'); }
        err('Newline in constant');
      }
      i++;
      push('chr', s.charCodeAt(0));
      continue;
    }

    // operators and punctuation
    let op = null;
    for (const o of OPS) { if (src.startsWith(o, i)) { op = o; break; } }
    if (op === '?.' && /[0-9]/.test(src[i + 2] || '')) op = '?';
    if (op) { i += op.length; push('op', op); continue; }
    if (c === '\\') err('Unexpected character \'\\\'');
    err(`Unexpected character '${c}'`);
  }
  return toks;
}

// ===========================================================================
// 3. Parser  (tokens -> AST)
// ===========================================================================

const MODIFIERS = new Set(['public', 'private', 'protected', 'internal', 'static', 'abstract', 'virtual',
  'override', 'sealed', 'readonly', 'const', 'new', 'extern', 'unsafe', 'volatile']);
const CONTEXT_MODIFIERS = new Set(['partial', 'async', 'required']);
const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '??=']);

class Parser {
  constructor(toks) { this.toks = toks; this.p = 0; }
  get tok() { return this.toks[this.p]; }
  peek(o) { return this.toks[Math.min(this.p + (o || 0), this.toks.length - 1)]; }
  get prev() { return this.toks[Math.max(0, this.p - 1)]; }
  next() { const t = this.toks[this.p]; if (this.p < this.toks.length - 1) this.p++; return t; }
  isOp(v, o) { const t = this.peek(o); return t.t === 'op' && t.v === v; }
  isKw(v, o) { const t = this.peek(o); return t.t === 'kw' && t.v === v; }
  isId(v, o) { const t = this.peek(o); return t.t === 'id' && (v === undefined || t.v === v); }
  acceptOp(v) { if (this.isOp(v)) { this.next(); return true; } return false; }
  acceptKw(v) { if (this.isKw(v)) { this.next(); return true; } return false; }
  fail(msg, line) { throw new CompileError(msg, line || this.tok.line); }
  expectOp(v) {
    if (this.isOp(v)) return this.next();
    // C# reports a missing ; or ) at the end of the previous token
    const line = (v === ';' || v === ')' || v === ']') ? this.prev.line : this.tok.line;
    if (v === ';' || v === ')' || v === ']' || v === '}' || v === '{' || v === '(') this.fail(`${v} expected`, line);
    this.fail(`${v} expected`, line);
  }
  expectIdent() {
    const t = this.tok;
    if (t.t === 'id') { this.next(); return t.v; }
    if (t.t === 'kw') this.fail(`Identifier expected; '${t.v}' is a keyword`);
    this.fail('Identifier expected', t.t === 'eof' ? this.prev.line : t.line);
  }
  describe(t) {
    if (t.t === 'eof') return 'end of file';
    if (t.t === 'str') return 'string';
    return String(t.v);
  }

  // ---------------------------------------------------------------- types
  // Parses a type without throwing; returns null (and rewinds) if it isn't one.
  tryType(allowVoid) {
    const save = this.p;
    const t = this.typeCore(allowVoid, true);
    if (!t) { this.p = save; return null; }
    return t;
  }
  parseType(allowVoid) {
    const t = this.typeCore(allowVoid, true);
    if (!t) {
      const tk = this.tok;
      if (tk.t === 'kw') this.fail(`Identifier expected; '${tk.v}' is a keyword`);
      this.fail('Type expected');
    }
    return t;
  }
  typeCore(allowVoid, allowArray) {
    const tk = this.tok, line = tk.line;
    let name;
    if (tk.t === 'kw' && PREDEF_TYPES.has(tk.v)) {
      if (tk.v === 'void' && !allowVoid) return null;
      name = tk.v; this.next();
    } else if (tk.t === 'id') {
      name = tk.v; this.next();
      while (this.isOp('.') && this.peek(1).t === 'id') { this.next(); name += '.' + this.next().v; }
      if (this.isOp('::')) return null;
    } else return null;
    let args = null;
    if (this.isOp('<')) {
      const save = this.p;
      this.next();
      args = [];
      while (true) {
        const a = this.typeCore(false, true);
        if (!a) { this.p = save; return null; }
        args.push(a);
        if (this.acceptOp(',')) continue;
        if (this.isOp('>')) { this.next(); break; }
        if (this.isOp('>=') || this.isOp('>>=')) { this.p = save; return null; }
        this.p = save; return null;
      }
    }
    let nullable = false;
    if (this.isOp('?')) {
      const nx = this.peek(1);
      if (nx.t === 'id' || (nx.t === 'op' && ['>', ',', ')', '[', ']', '=', ';', '{'].includes(nx.v)) || (nx.t === 'kw' && nx.v === 'this')) {
        this.next(); nullable = true;
      }
    }
    const ranks = [];
    if (allowArray) {
      while (this.isOp('[') && (this.isOp(']', 1) || this.isOp(',', 1))) {
        this.next(); let r = 1;
        while (this.acceptOp(',')) r++;
        this.expectOp(']');
        ranks.push(r);
      }
    }
    return { k: 'Type', name, args, nullable, ranks, line };
  }

  // ------------------------------------------------------- compilation unit
  parseCompilationUnit() {
    const unit = { types: [], globals: [], usingStatic: [] };
    this.parseNamespaceBody(unit, '', true);
    if (this.tok.t !== 'eof') this.fail(`Unexpected '${this.describe(this.tok)}'`);
    return unit;
  }

  isUsingDirective() {
    // using X.Y;   using static X.Y;   using A = X.Y;   global using X;
    let o = 1;
    if (this.isKw('static', o)) o++;
    if (!this.isId(undefined, o)) return false;
    o++;
    while (this.isOp('.', o) && this.isId(undefined, o + 1)) o += 2;
    return this.isOp(';', o) || this.isOp('=', o);
  }

  parseNamespaceBody(unit, ns, topLevel) {
    while (true) {
      const tk = this.tok;
      if (tk.t === 'eof') return;
      if (!topLevel && this.isOp('}')) return;
      if (this.isId('global') && this.isKw('using', 1)) { this.next(); }
      if (this.isKw('using') && this.isUsingDirective()) {
        this.next();
        const isStatic = this.acceptKw('static');
        let name = this.expectIdent();
        while (this.acceptOp('.')) name += '.' + this.expectIdent();
        if (this.acceptOp('=')) { this.parseType(); }
        this.expectOp(';');
        if (isStatic) unit.usingStatic.push({ name, line: tk.line });
        continue;
      }
      if (this.isKw('namespace')) {
        this.next();
        let name = this.expectIdent();
        while (this.acceptOp('.')) name += '.' + this.expectIdent();
        const full = ns ? ns + '.' + name : name;
        if (this.acceptOp(';')) { this.parseNamespaceBody(unit, full, topLevel); return; }
        this.expectOp('{');
        this.parseNamespaceBody(unit, full, false);
        this.expectOp('}');
        continue;
      }
      if (this.isTypeDeclStart()) {
        this.parseTypeDecl(unit, ns);
        continue;
      }
      if (this.isOp('}')) this.fail(unit.types.length ? 'Type or namespace definition, or end-of-file expected (there is an extra } here)' : 'Unexpected }: check that every { has a matching }');
      if (!topLevel) this.fail(`Unexpected '${this.describe(tk)}': only classes, interfaces and enums can go inside a namespace`);
      if (unit.types.length && !unit.globals.length && this.tok.t !== 'eof') this.fail(`Unexpected '${this.describe(tk)}': code must go inside a method (check your braces { })`);
      if (unit.types.length && unit.globals.length === 0 && false) break;
      unit.globals.push(this.parseStatement(true));
    }
  }

  isTypeDeclStart() {
    let o = 0;
    while (this.isOp('[', o)) { // attributes
      let depth = 0;
      do { const t = this.peek(o); if (t.t === 'eof') return false; if (t.t === 'op' && t.v === '[') depth++; if (t.t === 'op' && t.v === ']') depth--; o++; } while (depth > 0);
    }
    while (true) {
      const t = this.peek(o);
      if ((t.t === 'kw' && MODIFIERS.has(t.v) && t.v !== 'new') || (t.t === 'id' && CONTEXT_MODIFIERS.has(t.v) && !this.isOp('(', o + 1) && !this.isOp('=', o + 1))) { o++; continue; }
      break;
    }
    const t = this.peek(o);
    if (t.t === 'kw' && (t.v === 'class' || t.v === 'interface' || t.v === 'enum' || t.v === 'struct' || t.v === 'delegate')) return true;
    if (t.t === 'id' && t.v === 'record' && this.isId(undefined, o + 1)) return true;
    return false;
  }

  skipAttributes() {
    while (this.isOp('[')) {
      let depth = 0;
      do { const t = this.next(); if (t.t === 'eof') this.fail('] expected'); if (t.t === 'op' && t.v === '[') depth++; if (t.t === 'op' && t.v === ']') depth--; } while (depth > 0);
    }
  }

  parseModifiers() {
    const mods = new Set();
    while (true) {
      const t = this.tok;
      if (t.t === 'kw' && MODIFIERS.has(t.v)) { mods.add(t.v); this.next(); continue; }
      if (t.t === 'id' && CONTEXT_MODIFIERS.has(t.v) && !this.isOp('(', 1) && !this.isOp('=', 1) && !this.isOp(';', 1)) {
        if (t.v === 'async') unsupported("'async'", t.line);
        mods.add(t.v); this.next(); continue;
      }
      break;
    }
    return mods;
  }

  parseTypeDecl(unit, ns, outer) {
    this.skipAttributes();
    const mods = this.parseModifiers();
    const tk = this.tok;
    if (tk.t === 'kw' && tk.v === 'struct') unsupported("'struct'", tk.line);
    if (tk.t === 'kw' && tk.v === 'delegate') unsupported("'delegate' types", tk.line);
    if (tk.t === 'id' && tk.v === 'record') unsupported("'record'", tk.line);
    const kind = this.next().v; // class | interface | enum
    const nameTok = this.tok;
    const name = this.expectIdent();
    if (kind === 'enum') {
      if (this.acceptOp(':')) this.parseType();
      this.expectOp('{');
      const members = [];
      while (!this.isOp('}')) {
        this.skipAttributes();
        const mt = this.tok;
        const mname = this.expectIdent();
        let value = null;
        if (this.acceptOp('=')) value = this.parseExpr();
        members.push({ name: mname, value, line: mt.line });
        if (!this.acceptOp(',')) break;
      }
      this.expectOp('}');
      this.acceptOp(';');
      unit.types.push({ k: 'Enum', name, ns, mods, members, line: nameTok.line });
      return;
    }
    if (this.isOp('<')) unsupported('Generic classes (class ' + name + '<T>)', this.tok.line);
    const bases = [];
    if (this.acceptOp(':')) {
      do { bases.push(this.parseType()); } while (this.acceptOp(','));
    }
    if (this.isId('where')) unsupported("'where' constraints", this.tok.line);
    this.expectOp('{');
    const decl = { k: kind === 'interface' ? 'Interface' : 'Class', name, ns, mods, bases, members: [], line: nameTok.line, outer };
    unit.types.push(decl);
    while (!this.isOp('}')) {
      if (this.tok.t === 'eof') this.fail('} expected', this.prev.line);
      this.parseMember(decl, unit, ns);
    }
    this.expectOp('}');
    this.acceptOp(';');
  }

  parseParams(close) {
    const params = [];
    this.expectOp('(');
    if (!this.isOp(')')) {
      do {
        this.skipAttributes();
        const line = this.tok.line;
        let mod = null;
        if (this.isKw('ref') || this.isKw('out') || this.isKw('params') || this.isKw('in')) mod = this.next().v;
        if (this.isKw('this')) unsupported('Extension methods', line);
        if (mod === 'in') mod = null;
        const type = this.parseType();
        const name = this.expectIdent();
        let def = null;
        if (this.acceptOp('=')) def = this.parseExpr();
        params.push({ name, type, mod, def, line });
      } while (this.acceptOp(','));
    }
    this.expectOp(close || ')');
    return params;
  }

  parseMember(cls, unit, ns) {
    this.skipAttributes();
    const startTok = this.tok;
    if (this.isTypeDeclStart()) { this.parseTypeDecl(unit, ns, cls.name); return; }
    const mods = this.parseModifiers();
    const tk = this.tok, line = tk.line;
    if (tk.t === 'op' && tk.v === '~') unsupported('Destructors', line);
    if (tk.t === 'kw' && tk.v === 'event') unsupported("'event'", line);
    if (tk.t === 'kw' && (tk.v === 'implicit' || tk.v === 'explicit')) unsupported('Conversion operators', line);
    // constructor
    if (tk.t === 'id' && tk.v === cls.name && this.isOp('(', 1)) {
      this.next();
      const params = this.parseParams();
      let init = null;
      if (this.acceptOp(':')) {
        const kt = this.tok;
        if (!(this.isKw('base') || this.isKw('this'))) this.fail("Keyword 'this' or 'base' expected");
        this.next();
        init = { kind: kt.v, args: this.parseArgs(), line: kt.line };
      }
      let body;
      if (this.acceptOp('=>')) { const e = this.parseExpr(); this.expectOp(';'); body = { k: 'Block', stmts: [{ k: 'Expr', e, line: e.line }], line: e.line, end: e.line }; }
      else body = this.parseBlock();
      cls.members.push({ k: mods.has('static') ? 'StaticCtor' : 'Ctor', mods, params, init, body, line });
      return;
    }
    const type = this.parseType(true);
    if (this.isKw('operator')) unsupported('Operator overloading', line);
    if (this.isKw('this') && this.isOp('[', 1)) unsupported('Indexers (this[...])', line);
    const nameTok = this.tok;
    if (nameTok.t === 'op' && nameTok.v === '(' && type.name === cls.name) this.fail(`Method must have a return type`, nameTok.line);
    if (nameTok.t === 'op' && nameTok.v === '(') this.fail(`Method must have a return type`, nameTok.line);
    let name = this.expectIdent();
    if (this.isOp('.') && this.isId(undefined, 1)) unsupported('Explicit interface implementation', line);
    if (this.isOp('<')) unsupported('Generic methods', this.tok.line);
    if (this.isOp('(')) {
      const params = this.parseParams();
      let body = null, exprBody = null;
      if (this.acceptOp('=>')) { exprBody = this.parseExpr(); this.expectOp(';'); }
      else if (this.isOp('{')) body = this.parseBlock();
      else this.expectOp(';');
      cls.members.push({ k: 'Method', mods, ret: type, name, params, body, exprBody, line: nameTok.line });
      return;
    }
    if (type.name === 'void') this.fail(`Unexpected '${this.describe(this.tok)}' after void ${name}: a method needs ( )`);
    if (this.isOp('{') || this.isOp('=>')) {
      const prop = { k: 'Prop', mods, type, name, get: null, set: null, init: null, line: nameTok.line };
      if (this.acceptOp('=>')) {
        const e = this.parseExpr(); this.expectOp(';');
        prop.get = { mods: new Set(), body: null, expr: e, line: e.line };
      } else {
        this.next();
        while (!this.isOp('}')) {
          this.skipAttributes();
          const amods = this.parseModifiers();
          const at = this.tok;
          if (!(at.t === 'id' && (at.v === 'get' || at.v === 'set' || at.v === 'init'))) this.fail('A get or set accessor expected');
          this.next();
          const acc = { mods: amods, body: null, expr: null, line: at.line, isInit: at.v === 'init' };
          if (this.acceptOp('=>')) { acc.expr = this.parseExpr(); this.expectOp(';'); }
          else if (this.isOp('{')) acc.body = this.parseBlock();
          else this.expectOp(';');
          if (at.v === 'get') prop.get = acc; else prop.set = acc;
        }
        this.expectOp('}');
        if (this.acceptOp('=')) { prop.init = this.parseVarInit(); this.expectOp(';'); }
      }
      cls.members.push(prop);
      return;
    }
    // field(s)
    const decls = [];
    let nm = name, nmLine = nameTok.line;
    while (true) {
      let init = null;
      if (this.isOp('[')) this.fail('Array size cannot be specified in a variable declaration (try new int[5])');
      if (this.acceptOp('=')) init = this.parseVarInit();
      decls.push({ name: nm, init, line: nmLine });
      if (!this.acceptOp(',')) break;
      nmLine = this.tok.line;
      nm = this.expectIdent();
    }
    this.expectOp(';');
    cls.members.push({ k: 'Field', mods, type, decls, line });
  }

  parseVarInit() {
    if (this.isOp('{')) return this.parseArrayInit();
    return this.parseExpr();
  }
  parseArrayInit() {
    const line = this.tok.line;
    this.expectOp('{');
    const items = [];
    while (!this.isOp('}')) {
      items.push(this.isOp('{') ? this.parseArrayInit() : this.parseExpr());
      if (!this.acceptOp(',')) break;
    }
    this.expectOp('}');
    return { k: 'ArrayInit', items, line };
  }

  // ------------------------------------------------------------ statements
  parseBlock() {
    const line = this.tok.line;
    this.expectOp('{');
    const stmts = [];
    while (!this.isOp('}')) {
      if (this.tok.t === 'eof') this.fail('} expected', this.prev.line);
      stmts.push(this.parseStatement());
    }
    const end = this.tok.line;
    this.next();
    return { k: 'Block', stmts, line, end };
  }

  embedded() {
    // the body of if/while/for: a declaration is not allowed on its own here
    const t = this.tok;
    const s = this.parseStatement();
    if (s.k === 'LocalDecl') this.fail('Embedded statement cannot be a declaration or labeled statement', t.line);
    return s;
  }

  parseStatement(topLevel) {
    const tk = this.tok, line = tk.line;
    if (tk.t === 'op') {
      if (tk.v === '{') return this.parseBlock();
      if (tk.v === ';') { this.next(); return { k: 'Empty', line }; }
    }
    if (tk.t === 'kw') {
      switch (tk.v) {
        case 'if': {
          this.next(); this.expectOp('(');
          const cond = this.parseExpr(); this.expectOp(')');
          const then = this.embedded();
          let els = null;
          if (this.acceptKw('else')) els = this.embedded();
          return { k: 'If', cond, then, else: els, line };
        }
        case 'while': {
          this.next(); this.expectOp('(');
          const cond = this.parseExpr(); this.expectOp(')');
          return { k: 'While', cond, body: this.embedded(), line };
        }
        case 'do': {
          this.next();
          const body = this.embedded();
          if (!this.isKw('while')) this.fail('while expected');
          const wl = this.next().line;
          this.expectOp('('); const cond = this.parseExpr(); this.expectOp(')'); this.expectOp(';');
          return { k: 'Do', body, cond, line, condLine: wl };
        }
        case 'for': {
          this.next(); this.expectOp('(');
          let init = null;
          if (!this.isOp(';')) {
            const d = this.tryLocalDecl(true);
            if (d) init = d;
            else { const es = [this.parseExpr()]; while (this.acceptOp(',')) es.push(this.parseExpr()); init = { k: 'Exprs', es, line }; }
          }
          this.expectOp(';');
          const cond = this.isOp(';') ? null : this.parseExpr();
          this.expectOp(';');
          const iter = [];
          if (!this.isOp(')')) { do { iter.push(this.parseExpr()); } while (this.acceptOp(',')); }
          this.expectOp(')');
          return { k: 'For', init, cond, iter, body: this.embedded(), line };
        }
        case 'foreach': {
          this.next(); this.expectOp('(');
          const type = this.parseType();
          const name = this.expectIdent();
          if (!this.isKw('in')) this.fail('in expected');
          this.next();
          const coll = this.parseExpr();
          this.expectOp(')');
          return { k: 'Foreach', type, name, coll, body: this.embedded(), line };
        }
        case 'break': this.next(); this.expectOp(';'); return { k: 'Break', line };
        case 'continue': this.next(); this.expectOp(';'); return { k: 'Continue', line };
        case 'return': {
          this.next();
          const e = this.isOp(';') ? null : this.parseExpr();
          this.expectOp(';');
          return { k: 'Return', e, line };
        }
        case 'throw': {
          this.next();
          const e = this.isOp(';') ? null : this.parseExpr();
          this.expectOp(';');
          return { k: 'Throw', e, line };
        }
        case 'try': {
          this.next();
          const body = this.parseBlock();
          const catches = [];
          let fin = null;
          while (this.isKw('catch')) {
            const cl = this.next().line;
            let type = null, name = null, when = null;
            if (this.acceptOp('(')) {
              type = this.parseType();
              if (this.tok.t === 'id') name = this.next().v;
              this.expectOp(')');
            }
            if (this.isId('when')) { this.next(); this.expectOp('('); when = this.parseExpr(); this.expectOp(')'); }
            catches.push({ type, name, when, body: this.parseBlock(), line: cl });
          }
          if (this.acceptKw('finally')) fin = this.parseBlock();
          if (!catches.length && !fin) this.fail('Expected catch or finally');
          return { k: 'Try', body, catches, fin, line };
        }
        case 'switch': return this.parseSwitch();
        case 'using': {
          if (this.isOp('(', 1)) {
            this.next(); this.next();
            let decl = this.tryLocalDecl(true), e = null;
            if (!decl) e = this.parseExpr();
            this.expectOp(')');
            return { k: 'Using', decl, e, body: this.embedded(), line };
          }
          this.next();
          const d = this.tryLocalDecl(false);
          if (!d) this.fail('Type expected');
          this.expectOp(';');
          d.isUsing = true;
          return d;
        }
        case 'const': {
          this.next();
          const d = this.tryLocalDecl(true);
          if (!d) this.fail('Type expected');
          this.expectOp(';');
          d.isConst = true;
          return d;
        }
        case 'goto': unsupported("'goto'", line); break;
        case 'lock': unsupported("'lock'", line); break;
        case 'checked': case 'unchecked': if (this.isOp('{', 1)) unsupported(`'${tk.v}' blocks`, line); break;
        case 'unsafe': case 'fixed': unsupported(`'${tk.v}'`, line); break;
        case 'else': this.fail("'else' without a matching 'if' (check your braces { } and that there is no ; after the if)"); break;
        case 'case': case 'default':
          if (tk.v === 'case' || this.isOp(':', 1)) this.fail(`'${tk.v}' must be inside a switch statement`);
          break;
        case 'catch': case 'finally': this.fail(`'${tk.v}' without a matching 'try'`); break;
        case 'class': case 'interface': case 'enum': case 'struct':
          if (!topLevel) this.fail(`A ${tk.v} cannot be declared inside a method. Move it outside, after the closing } of the method.`);
          break;
        case 'public': case 'private': case 'protected': case 'internal':
          this.fail(`A method cannot be declared inside another method here (unexpected '${tk.v}'). Check your braces { }.`);
          break;
        case 'static': {
          this.next();
          const fn = this.tryLocalFunction(line);
          if (!fn) this.fail(`Unexpected 'static'`);
          return fn;
        }
      }
    }
    if (tk.t === 'id') {
      if (tk.v === 'yield' && (this.isKw('return', 1) || this.isKw('break', 1))) unsupported("'yield'", line);
      if (tk.v === 'await') unsupported("'await'", line);
      if (tk.v === 'async') unsupported("'async'", line);
      if (this.isOp(':', 1) && !this.isOp(':', 2)) unsupported('Labels', line);
    }
    const fn = this.tryLocalFunction(line);
    if (fn) return fn;
    const decl = this.tryLocalDecl(false);
    if (decl) { this.expectOp(';'); return decl; }
    const e = this.parseExpr();
    if (!this.isOp(';')) {
      const nt = this.tok;
      if (nt.t === 'id' && (e.k === 'Name' || e.k === 'Member') && nt.line === this.prev.line) {
        this.fail(`The type or namespace name '${exprText(e)}' could not be found (are you missing a using directive or an assembly reference?)`, line);
      }
    }
    this.expectOp(';');
    return { k: 'Expr', e, line };
  }

  tryLocalFunction(line) {
    const save = this.p;
    const type = this.tryType(true);
    if (type && this.tok.t === 'id' && this.isOp('(', 1)) {
      // make sure this is a declaration (params look like "Type name") and not a call "Foo bar(...)" (impossible in C#)
      const name = this.next().v;
      const sp = this.p;
      // check for parameter list followed by { or =>
      let depth = 0, o = 0;
      while (true) {
        const t = this.peek(o);
        if (t.t === 'eof') break;
        if (t.t === 'op' && t.v === '(') depth++;
        if (t.t === 'op' && t.v === ')') { depth--; if (depth === 0) break; }
        o++;
      }
      if (this.isOp('{', o + 1) || this.isOp('=>', o + 1)) {
        this.p = sp;
        const params = this.parseParams();
        let body = null, exprBody = null;
        if (this.acceptOp('=>')) { exprBody = this.parseExpr(); this.expectOp(';'); }
        else body = this.parseBlock();
        return { k: 'LocalFunc', ret: type, name, params, body, exprBody, line };
      }
    }
    this.p = save;
    return null;
  }

  // Tries to parse "Type name [= init], name2 ..." (no trailing ;)
  tryLocalDecl(forceType) {
    const save = this.p;
    const line = this.tok.line;
    const type = this.tryType(false);
    if (!type || this.tok.t !== 'id') { this.p = save; return null; }
    const after = this.peek(1);
    if (!(after.t === 'op' && (after.v === '=' || after.v === ';' || after.v === ',' || after.v === ')' || after.v === '[')) && !(after.t === 'kw' && after.v === 'in')) {
      if (!forceType) {
        // "int x 5;" style mistakes: still a declaration
        if (type.name !== 'var' && (PREDEF_TYPES.has(type.name) || type.args || type.ranks.length) && after.line === this.tok.line) {
          this.next();
          this.fail(`; expected`, this.prev.line);
        }
        this.p = save; return null;
      }
    }
    const decls = [];
    while (true) {
      const nt = this.tok;
      const name = this.expectIdent();
      if (this.isOp('[')) this.fail('Array size cannot be specified in a variable declaration (try int[] a = new int[5];)');
      let init = null;
      if (this.acceptOp('=')) init = this.parseVarInit();
      decls.push({ name, init, line: nt.line });
      if (!this.acceptOp(',')) break;
    }
    return { k: 'LocalDecl', type, decls, line };
  }

  parseSwitch() {
    const line = this.next().line;
    this.expectOp('(');
    const e = this.parseExpr();
    this.expectOp(')');
    this.expectOp('{');
    const sections = [];
    while (!this.isOp('}')) {
      const labels = [];
      while (this.isKw('case') || this.isKw('default')) {
        const lt = this.next();
        if (lt.v === 'default') { this.expectOp(':'); labels.push({ def: true, line: lt.line }); continue; }
        const save = this.p;
        const ty = this.tryType(false);
        if (ty && this.tok.t === 'id' && !this.isOp(':', 0)) unsupported('Pattern matching in a case label', lt.line);
        this.p = save;
        const ce = this.parseExpr();
        if (this.isId('when')) unsupported("'when' in case labels", lt.line);
        if (!this.isOp(':')) {
          if (this.isOp(';')) this.fail(': expected (case labels end with a colon, e.g. case 1:)', lt.line);
          this.expectOp(':');
        }
        this.next();
        labels.push({ e: ce, line: lt.line });
      }
      if (!labels.length) this.fail(this.tok.t === 'eof' ? '} expected' : `Unexpected '${this.describe(this.tok)}' in switch: expected case or default`);
      const stmts = [];
      while (!this.isKw('case') && !this.isKw('default') && !this.isOp('}')) {
        if (this.tok.t === 'eof') this.fail('} expected', this.prev.line);
        stmts.push(this.parseStatement());
      }
      sections.push({ labels, stmts, line: labels[0].line });
    }
    this.next();
    return { k: 'Switch', e, sections, line };
  }

  // ----------------------------------------------------------- expressions
  parseExpr() { return this.parseAssign(); }

  isLambdaAhead() {
    if (this.tok.t === 'id' && this.isOp('=>', 1)) return true;
    if (!this.isOp('(')) return false;
    let depth = 0, o = 0;
    while (true) {
      const t = this.peek(o);
      if (t.t === 'eof') return false;
      if (t.t === 'op' && t.v === '(') depth++;
      else if (t.t === 'op' && t.v === ')') { depth--; if (depth === 0) break; }
      o++;
    }
    return this.isOp('=>', o + 1);
  }

  parseLambda() {
    const line = this.tok.line;
    const params = [];
    if (this.tok.t === 'id' && this.isOp('=>', 1)) {
      params.push({ name: this.next().v, type: null });
    } else {
      this.expectOp('(');
      if (!this.isOp(')')) {
        do {
          if (this.tok.t === 'id' && (this.isOp(',', 1) || this.isOp(')', 1))) params.push({ name: this.next().v, type: null });
          else { const type = this.parseType(); params.push({ name: this.expectIdent(), type }); }
        } while (this.acceptOp(','));
      }
      this.expectOp(')');
    }
    this.expectOp('=>');
    const body = this.isOp('{') ? this.parseBlock() : this.parseExpr();
    return { k: 'Lambda', params, body, line };
  }

  parseAssign() {
    if (this.isLambdaAhead()) return this.parseLambda();
    if (this.isId('async') && (this.isOp('(', 1) || this.isId(undefined, 1))) unsupported("'async' lambdas", this.tok.line);
    const left = this.parseCond();
    const t = this.tok;
    if (t.t === 'op' && ASSIGN_OPS.has(t.v)) {
      this.next();
      const right = this.isOp('{') && t.v === '=' ? this.parseArrayInit() : this.parseAssign();
      return { k: 'Assign', op: t.v, l: left, r: right, line: t.line };
    }
    if (t.t === 'op' && t.v === '>' && this.isOp('>=', 1) && this.peek(1).pos === t.end) {
      this.next(); this.next();
      const right = this.parseAssign();
      return { k: 'Assign', op: '>>=', l: left, r: right, line: t.line };
    }
    return left;
  }

  parseCond() {
    const c = this.parseNullCoal();
    if (this.isOp('?')) {
      const line = this.next().line;
      const a = this.parseAssign();
      if (!this.isOp(':')) this.fail(': expected', this.prev.line);
      this.next();
      const b = this.parseAssign();
      return { k: 'Cond', c, a, b, line };
    }
    return c;
  }
  parseNullCoal() {
    const l = this.parseBin(0);
    if (this.isOp('??')) {
      const line = this.next().line;
      const r = this.parseNullCoal();
      return { k: 'Bin', op: '??', l, r, line };
    }
    return l;
  }

  // precedence levels, loosest first
  parseBin(level) {
    const LEVELS = [['||'], ['&&'], ['|'], ['^'], ['&'], ['==', '!='], ['<', '>', '<=', '>=', 'is', 'as'], ['<<', '>>'], ['+', '-'], ['*', '/', '%']];
    if (level >= LEVELS.length) return this.parseUnary();
    const ops = LEVELS[level];
    let left = this.parseBin(level + 1);
    while (true) {
      const t = this.tok;
      let op = null;
      if (t.t === 'op' && ops.includes(t.v)) op = t.v;
      if (level === 6 && t.t === 'kw' && (t.v === 'is' || t.v === 'as')) op = t.v;
      if (level === 7 && t.t === 'op' && t.v === '>' && this.isOp('>', 1) && this.peek(1).pos === t.end && !this.isOp('=', 2)) op = '>>';
      if (level === 6 && op === '>' && this.isOp('>', 1) && this.peek(1).pos === t.end) op = null;
      if (level === 6 && op === '>' && this.isOp('>=', 1) && this.peek(1).pos === t.end) op = null;
      if (!op) return left;
      this.next();
      if (op === '>>') this.next();
      if (op === 'is') {
        if (this.isKw('null')) { this.next(); left = { k: 'IsNull', e: left, not: false, line: t.line }; continue; }
        if (this.isId('not') && this.isKw('null', 1)) { this.next(); this.next(); left = { k: 'IsNull', e: left, not: true, line: t.line }; continue; }
        if (this.isId('not') || this.isId('and') || this.isId('or') || this.tok.t === 'num' || this.tok.t === 'str' || this.isOp('<') || this.isOp('>') || this.isOp('{')) unsupported('This kind of pattern after is', t.line);
        const type = this.parseType();
        let name = null;
        if (this.tok.t === 'id' && !(this.isId('and') || this.isId('or'))) name = this.next().v;
        left = { k: 'Is', e: left, type, name, line: t.line };
        continue;
      }
      if (op === 'as') { left = { k: 'As', e: left, type: this.parseType(), line: t.line }; continue; }
      const right = this.parseBin(level + 1);
      left = { k: 'Bin', op, l: left, r: right, line: t.line };
    }
  }

  parseUnary() {
    const t = this.tok, line = t.line;
    if (t.t === 'op') {
      if (t.v === '+' || t.v === '-' || t.v === '!' || t.v === '~') {
        this.next();
        const e = this.parseUnary();
        return { k: 'Unary', op: t.v, e, line };
      }
      if (t.v === '++' || t.v === '--') {
        this.next();
        return { k: 'Pre', op: t.v, e: this.parseUnary(), line };
      }
      if (t.v === '&' || t.v === '*') unsupported('Pointers', line);
      if (t.v === '(') {
        const cast = this.tryCast();
        if (cast) return cast;
      }
    }
    return this.parsePostfix(this.parsePrimary());
  }

  tryCast() {
    const save = this.p, line = this.tok.line;
    this.next();
    const type = this.tryType(false);
    if (type && this.isOp(')')) {
      this.next();
      const nt = this.tok;
      const predefined = PREDEF_TYPES.has(type.name) && !type.args;
      let ok = false;
      if (predefined && !(nt.t === 'op' && [')', ';', ',', ']', '}', '.', '=', '?', ':', '==', '!=', '*', '/', '%', '<', '>', '<=', '>=', '&&', '||'].includes(nt.v))) ok = true;
      else if (nt.t === 'id' || nt.t === 'num' || nt.t === 'str' || nt.t === 'chr' || nt.t === 'interp') ok = true;
      else if (nt.t === 'op' && (nt.v === '(' || nt.v === '!' || nt.v === '~')) ok = true;
      else if (nt.t === 'kw' && ['this', 'base', 'new', 'true', 'false', 'null', 'typeof', 'default', 'checked', 'unchecked'].includes(nt.v)) ok = true;
      else if (nt.t === 'kw' && PREDEF_TYPES.has(nt.v)) ok = true;
      if (ok) {
        const e = this.parseUnary();
        return { k: 'Cast', type, e, line };
      }
    }
    this.p = save;
    return null;
  }

  parseArgs() {
    this.expectOp('(');
    const args = [];
    if (!this.isOp(')')) {
      do {
        const line = this.tok.line;
        if (this.tok.t === 'id' && this.isOp(':', 1) && !this.isOp(':', 2)) unsupported('Named arguments', line);
        let mod = null;
        if (this.isKw('ref') || this.isKw('out') || this.isKw('in')) mod = this.next().v;
        if (mod === 'in') mod = null;
        if (mod === 'out') {
          // out int x / out var x / out x / out _
          const save = this.p;
          const ty = this.tryType(false);
          if (ty && this.tok.t === 'id' && (this.isOp(',', 1) || this.isOp(')', 1))) {
            const name = this.next().v;
            args.push({ mod, outDecl: { type: ty, name }, e: null, line });
            continue;
          }
          this.p = save;
        }
        const e = this.parseExpr();
        args.push({ mod, e, line });
      } while (this.acceptOp(','));
    }
    if (!this.isOp(')')) {
      const t = this.tok;
      if (t.t === 'str' || t.t === 'id' || t.t === 'num' || t.t === 'interp' || t.t === 'chr') this.fail(', expected', t.line);
      this.expectOp(')');
    }
    this.next();
    return args;
  }

  parsePostfix(e) {
    while (true) {
      const t = this.tok;
      if (t.t === 'op') {
        if (t.v === '.') {
          this.next();
          const nt = this.tok;
          if (nt.t !== 'id') this.fail('Identifier expected', nt.t === 'eof' ? this.prev.line : nt.line);
          this.next();
          if (this.isOp('<') && ['Cast', 'OfType', 'Select', 'Where', 'OrderBy'].includes(nt.v)) unsupported(`Generic method call ${nt.v}<...>`, nt.line);
          e = { k: 'Member', obj: e, name: nt.v, line: nt.line };
          continue;
        }
        if (t.v === '?.') {
          this.next();
          const nt = this.tok;
          if (nt.t !== 'id') { if (nt.t === 'op' && nt.v === '[') unsupported('?[ ]', nt.line); this.fail('Identifier expected'); }
          this.next();
          e = { k: 'Member', obj: e, name: nt.v, nullCond: true, line: nt.line };
          continue;
        }
        if (t.v === '(') {
          const args = this.parseArgs();
          e = { k: 'Call', fn: e, args, line: t.line };
          continue;
        }
        if (t.v === '[') {
          this.next();
          const idx = [];
          if (this.isOp(']')) this.fail('Syntax error; value expected');
          do {
            if (this.isOp('^')) unsupported('Index from end (^)', t.line);
            idx.push(this.parseExpr());
            if (this.isOp('..')) unsupported('Ranges (..)', t.line);
          } while (this.acceptOp(','));
          this.expectOp(']');
          e = { k: 'Index', obj: e, idx, line: t.line };
          continue;
        }
        if (t.v === '++' || t.v === '--') {
          this.next();
          e = { k: 'Post', op: t.v, e, line: t.line };
          continue;
        }
        if (t.v === '!' && !(this.peek(1).t === 'op' && this.peek(1).v === '(') && this.peek(1).line === t.line) {
          // null-forgiving operator: x!
          const nx = this.peek(1);
          if (nx.t === 'op' && [')', ';', '.', ',', ']', '?', ':', '}', '+', '=='].includes(nx.v)) { this.next(); continue; }
        }
        if (t.v === '..') unsupported('Ranges (..)', t.line);
      }
      if (t.t === 'kw' && t.v === 'switch') unsupported('Switch expressions (use a switch statement instead)', t.line);
      if (t.t === 'id' && t.v === 'with' && this.isOp('{', 1)) unsupported("'with' expressions", t.line);
      return e;
    }
  }

  parsePrimary() {
    const t = this.tok, line = t.line;
    switch (t.t) {
      case 'num': this.next(); return { k: 'Lit', lt: t.nk, v: t.v, text: t.text, line };
      case 'str': this.next(); return { k: 'Lit', lt: 'string', v: t.v, line };
      case 'chr': this.next(); return { k: 'Lit', lt: 'char', v: t.v, line };
      case 'interp': {
        this.next();
        const parts = t.v.map((p) => {
          if (p.s !== undefined) return p;
          const sub = new Parser(lex(p.src, p.line));
          const e = sub.parseExpr();
          if (sub.tok.t !== 'eof') sub.fail(`Unexpected '${sub.describe(sub.tok)}' in interpolated string (put a ternary ?: inside brackets)`);
          let align = null;
          if (p.align !== null) {
            const ap = new Parser(lex(p.align, p.line));
            align = ap.parseExpr();
          }
          return { e, align, fmt: p.fmt, line: p.line };
        });
        return { k: 'Interp', parts, line };
      }
      case 'kw':
        switch (t.v) {
          case 'true': this.next(); return { k: 'Lit', lt: 'bool', v: true, line };
          case 'false': this.next(); return { k: 'Lit', lt: 'bool', v: false, line };
          case 'null': this.next(); return { k: 'Lit', lt: 'null', v: null, line };
          case 'this': this.next(); return { k: 'This', line };
          case 'base': this.next(); return { k: 'Base', line };
          case 'new': return this.parseNew();
          case 'typeof': {
            this.next(); this.expectOp('(');
            const type = this.parseType(true); this.expectOp(')');
            return { k: 'Typeof', type, line };
          }
          case 'default': {
            this.next();
            if (this.acceptOp('(')) { const type = this.parseType(); this.expectOp(')'); return { k: 'Default', type, line }; }
            return { k: 'Default', type: null, line };
          }
          case 'checked': case 'unchecked': {
            this.next(); this.expectOp('('); const e = this.parseExpr(); this.expectOp(')'); return e;
          }
          case 'sizeof': case 'stackalloc': case 'delegate': unsupported(`'${t.v}'`, line); break;
          default:
            if (PREDEF_TYPES.has(t.v) && t.v !== 'void') {
              this.next();
              if (this.isOp('[') ) { this.p--; const ty = this.parseType(); return { k: 'TypeExpr', type: ty, line }; }
              return { k: 'Name', name: t.v, predef: true, line };
            }
        }
        this.fail(`Invalid expression term '${t.v}'`);
        break;
      case 'id': {
        if (t.v === 'nameof' && this.isOp('(', 1)) {
          this.next(); this.next();
          const e = this.parseExpr(); this.expectOp(')');
          let nm = e.k === 'Name' ? e.name : e.k === 'Member' ? e.name : null;
          if (!nm) this.fail('Expression does not have a name', line);
          return { k: 'Lit', lt: 'string', v: nm, line, nameofExpr: e };
        }
        this.next();
        // generic type in expression position, e.g. List<int>.Something or Comparer<int>
        return { k: 'Name', name: t.v, line };
      }
      case 'op':
        if (t.v === '(') {
          this.next();
          const e = this.parseExpr();
          if (this.isOp(',')) unsupported('Tuples', line);
          this.expectOp(')');
          return { k: 'Paren', e, line };
        }
        if (t.v === '[') unsupported('Collection expressions [ ... ]', line);
        if (t.v === ';' || t.v === ')' || t.v === '}' || t.v === ']' || t.v === ',') this.fail(`Invalid expression term '${t.v}'`, line);
        this.fail(`Invalid expression term '${t.v}'`, line);
        break;
      case 'eof': this.fail('Unexpected end of file', this.prev.line); break;
    }
    this.fail(`Invalid expression term '${this.describe(t)}'`);
  }

  parseNew() {
    const line = this.next().line;
    if (this.isOp('[')) { // new[] { ... }
      this.next(); let rank = 1; while (this.acceptOp(',')) rank++; this.expectOp(']');
      if (!this.isOp('{')) this.fail('{ expected');
      return { k: 'NewArray', et: null, sizes: null, rank, init: this.parseArrayInit(), line };
    }
    if (this.isOp('(')) { // target-typed new()
      const args = this.parseArgs();
      const init = this.isOp('{') ? this.parseObjInit() : null;
      return { k: 'New', type: null, args, init, line };
    }
    if (this.isOp('{')) unsupported('Anonymous types (new { ... })', line);
    const type = this.typeCore(false, false);
    if (!type) this.fail('Type expected');
    if (this.isOp('[')) {
      this.next();
      if (this.isOp(']') || this.isOp(',')) {
        let rank = 1; while (this.acceptOp(',')) rank++; this.expectOp(']');
        const extra = [];
        while (this.isOp('[')) { this.next(); let r = 1; while (this.acceptOp(',')) r++; this.expectOp(']'); extra.push(r); }
        if (!this.isOp('{')) this.fail('Array creation must have array size or array initializer');
        type.ranks = extra;
        return { k: 'NewArray', et: type, sizes: null, rank, init: this.parseArrayInit(), line };
      }
      const sizes = [this.parseExpr()];
      while (this.acceptOp(',')) sizes.push(this.parseExpr());
      this.expectOp(']');
      const extra = [];
      while (this.isOp('[')) { this.next(); let r = 1; while (this.acceptOp(',')) r++; this.expectOp(']'); extra.push(r); }
      type.ranks = extra;
      const init = this.isOp('{') ? this.parseArrayInit() : null;
      return { k: 'NewArray', et: type, sizes, rank: sizes.length, init, line };
    }
    let args = null;
    if (this.isOp('(')) args = this.parseArgs();
    let init = null;
    if (this.isOp('{')) init = this.parseObjInit();
    if (!args && !init) this.fail('A new expression requires (), [], or {} after type');
    return { k: 'New', type, args: args || [], init, line };
  }

  parseObjInit() {
    const line = this.tok.line;
    this.expectOp('{');
    const items = [];
    let kind = null;
    while (!this.isOp('}')) {
      const il = this.tok.line;
      if (this.tok.t === 'id' && this.isOp('=', 1)) {
        kind = kind || 'obj';
        const name = this.next().v; this.next();
        const e = this.isOp('{') ? this.parseObjInitValue() : this.parseExpr();
        items.push({ name, e, line: il });
      } else if (this.isOp('[')) {
        kind = kind || 'index';
        this.next(); const key = this.parseExpr(); this.expectOp(']'); this.expectOp('=');
        items.push({ key, e: this.parseExpr(), line: il });
      } else if (this.isOp('{')) {
        kind = kind || 'coll';
        this.next();
        const es = [this.parseExpr()];
        while (this.acceptOp(',')) es.push(this.parseExpr());
        this.expectOp('}');
        items.push({ es, line: il });
      } else {
        kind = kind || 'coll';
        items.push({ es: [this.parseExpr()], line: il });
      }
      if (!this.acceptOp(',')) break;
    }
    this.expectOp('}');
    return { k: kind || 'obj', items, line };
  }
  parseObjInitValue() { unsupported('Nested object initialisers', this.tok.line); }
}

function exprText(e) {
  if (!e) return '';
  switch (e.k) {
    case 'Name': return e.name;
    case 'Member': return exprText(e.obj) + '.' + e.name;
    case 'This': return 'this';
    case 'Base': return 'base';
    case 'Call': return exprText(e.fn) + '(...)';
    case 'Lit': return e.lt === 'string' ? JSON.stringify(e.v) : String(e.v);
    default: return e.k;
  }
}

function parse(src) {
  const p = new Parser(lex(src));
  return p.parseCompilationUnit();
}


// ===========================================================================
// 4. Runtime values
// ===========================================================================
//
// How C# values are represented in JavaScript:
//   int long short byte double float   -> JS number (the compiler knows the
//                                          static type, so it emits |0 for int
//                                          maths, Math.fround for float, ...)
//   char                                -> JS number (UTF-16 code unit); boxed
//                                          into CsChar when stored as object
//   bool                                -> JS boolean
//   string                              -> JS string (null is null)
//   decimal                             -> Dec (BigInt mantissa + scale)
//   enum                                -> JS number
//   T[]                                 -> JS Array with a $t type name
//   T[,]                                -> CsArray2
//   user objects                        -> instances of generated JS classes
//                                          extending CsObject
//   List / Dictionary / StringBuilder / DateTime / ... -> classes below

// Base class of every C# object.  Methods are generators so that user
// overrides (which may call other user code) can be used uniformly.
class CsObject {
  *M$ToString$() { return typeFullName(this); }
  *M$Equals$object(o) { return this === o; }
  *M$GetHashCode$() { return hashOf(this); }
}
let hashCounter = 1;
const hashes = new WeakMap();
function hashOf(o) {
  if (o === null || o === undefined) return 0;
  if (typeof o === 'object') {
    let h = hashes.get(o);
    if (!h) { h = (hashCounter++ * 2654435761) | 0; hashes.set(o, h); }
    return h;
  }
  if (typeof o === 'number') return Number.isInteger(o) ? o | 0 : (o * 1000003) | 0;
  if (typeof o === 'boolean') return o ? 1 : 0;
  const s = String(o); let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h;
}

class CsChar { constructor(c) { this.c = c; } toString() { return String.fromCharCode(this.c); } }

class CsArray2 extends CsObject {
  constructor(d0, d1, fill, t) { super(); this.d0 = d0; this.d1 = d1; this.a = new Array(d0 * d1).fill(fill); this.$t = t; }
  get length() { return this.a.length; }
}

// ---------------------------------------------------------------- Decimal
const TEN = 10n;
const POW10 = [1n];
for (let i = 1; i <= 60; i++) POW10.push(POW10[i - 1] * TEN);
const DEC_MAX = (1n << 96n) - 1n;

class Dec {
  constructor(m, s) { this.m = m; this.s = s; }
  static fromInt(n) { return new Dec(BigInt(Math.trunc(n)), 0); }
  static fromNumber(x) {
    // C# converts double -> decimal keeping 15 significant digits
    if (!isFinite(x)) throw rt.ex('OverflowException', 'Value was either too large or too small for a Decimal.');
    if (Number.isInteger(x) && Math.abs(x) < 9007199254740992) return new Dec(BigInt(x), 0);
    return Dec.parse(Number(x.toPrecision(15)).toString().includes('e') ? expandExp(x.toPrecision(15)) : String(Number(x.toPrecision(15))));
  }
  static parse(text) {
    let t = String(text).trim();
    let neg = false;
    if (t[0] === '-') { neg = true; t = t.slice(1); } else if (t[0] === '+') t = t.slice(1);
    if (/e/i.test(t)) t = expandExp(t);
    const dot = t.indexOf('.');
    let digits, s;
    if (dot < 0) { digits = t; s = 0; } else { digits = t.slice(0, dot) + t.slice(dot + 1); s = t.length - dot - 1; }
    if (!digits) digits = '0';
    let m = BigInt(digits);
    while (s > 28) { m = roundDiv(m, TEN, 'even'); s--; }
    return new Dec(neg ? -m : m, s);
  }
  toNumber() { return Number(this.toString()); }
  isZero() { return this.m === 0n; }
  toString() {
    const neg = this.m < 0n;
    let d = (neg ? -this.m : this.m).toString();
    if (this.s > 0) {
      while (d.length <= this.s) d = '0' + d;
      d = d.slice(0, d.length - this.s) + '.' + d.slice(d.length - this.s);
    }
    return (neg ? '-' : '') + d;
  }
  static align(a, b) {
    if (a.s === b.s) return [a.m, b.m, a.s];
    if (a.s < b.s) return [a.m * POW10[b.s - a.s], b.m, b.s];
    return [a.m, b.m * POW10[a.s - b.s], a.s];
  }
  static add(a, b) { const [x, y, s] = Dec.align(a, b); return Dec.norm(x + y, s); }
  static sub(a, b) { const [x, y, s] = Dec.align(a, b); return Dec.norm(x - y, s); }
  static mul(a, b) { return Dec.norm(a.m * b.m, a.s + b.s); }
  static norm(m, s) {
    // keep within 28 decimal places and 96 bits
    while (s > 28 || ((m < 0n ? -m : m) > DEC_MAX && s > 0)) { m = roundDiv(m, TEN, 'even'); s--; }
    if ((m < 0n ? -m : m) > DEC_MAX) throw rt.ex('OverflowException', 'Value was either too large or too small for a Decimal.');
    return new Dec(m, s);
  }
  static div(a, b) {
    if (b.m === 0n) throw rt.ex('DivideByZeroException', 'Attempted to divide by zero.');
    // result = (a.m / 10^a.s) / (b.m / 10^b.s)
    let s = a.s - b.s;
    let num = a.m, den = b.m;
    if (s < 0) { num *= POW10[-s]; s = 0; }
    if (den < 0n) { num = -num; den = -den; }
    while (true) {
      if (num % den === 0n) return Dec.norm(num / den, s);
      const q = num / den;
      const qa = q < 0n ? -q : q;
      if (s >= 28 || qa * TEN > DEC_MAX) return Dec.norm(roundDiv(num, den, 'even'), s);
      num *= TEN; s++;
    }
  }
  static mod(a, b) {
    if (b.m === 0n) throw rt.ex('DivideByZeroException', 'Attempted to divide by zero.');
    const [x, y, s] = Dec.align(a, b);
    return new Dec(x % y, s);
  }
  static neg(a) { return new Dec(-a.m, a.s); }
  static cmp(a, b) { const [x, y] = Dec.align(a, b); return x < y ? -1 : x > y ? 1 : 0; }
  static eq(a, b) { return a === b || (a !== null && b !== null && Dec.cmp(a, b) === 0); }
  // round to n decimal places; mode 'even' | 'away' | 'trunc' | 'floor' | 'ceil'
  static round(a, n, mode) {
    if (a.s <= n) return a;
    const r = roundDiv(a.m, POW10[a.s - n], mode);
    return new Dec(r, n);
  }
  toInt() { return Number(this.s ? this.m / POW10[this.s] : this.m); }
}
function roundDiv(num, den, mode) {
  // integer division of BigInts with the given rounding mode (den > 0)
  if (den < 0n) { num = -num; den = -den; }
  let q = num / den;
  const r = num - q * den;
  if (r === 0n) return q;
  const neg = num < 0n;
  if (mode === 'trunc') return q;
  if (mode === 'floor') return neg ? q - 1n : q;
  if (mode === 'ceil') return neg ? q : q + 1n;
  const twice = (r < 0n ? -r : r) * 2n;
  if (twice > den || (twice === den && (mode === 'away' || (q % 2n !== 0n)))) q += neg ? -1n : 1n;
  return q;
}
function expandExp(t) {
  // "1.5e-7" -> "0.00000015"
  const m = /^([+-]?)(\d*)(?:\.(\d*))?e([+-]?\d+)$/i.exec(String(t).trim());
  if (!m) return t;
  let digits = (m[2] || '') + (m[3] || '');
  let point = (m[2] || '').length + parseInt(m[4], 10);
  if (point <= 0) return m[1] + '0.' + '0'.repeat(-point) + digits;
  if (point >= digits.length) return m[1] + digits + '0'.repeat(point - digits.length);
  return m[1] + digits.slice(0, point) + '.' + digits.slice(point);
}

// ---------------------------------------------------------------- number formatting
// double.ToString(): shortest round-trip, scientific outside 1E-05 .. 1E+15
function fmtDouble(x) {
  if (x === Infinity) return '∞';
  if (x === -Infinity) return '-∞';
  if (x !== x) return 'NaN';
  if (x === 0) return Object.is(x, -0) ? '-0' : '0';
  const e = x.toExponential(); // shortest digits
  const m = /^(-?)(\d)(?:\.(\d+))?e([+-]\d+)$/.exec(e);
  const exp = parseInt(m[4], 10);
  if (exp >= -5 && exp < 15) {
    if (exp === -5) return sciShort(m[1], m[2] + (m[3] || ''), exp);
    if (Number.isInteger(x)) return String(x);
    return expandExp(e).replace(/^(-?)\./, '$10.');
  }
  return sciShort(m[1], m[2] + (m[3] || ''), exp);
}
function sciShort(sign, digits, exp) {
  digits = digits.replace(/0+$/, '') || '0';
  const mant = digits.length > 1 ? digits[0] + '.' + digits.slice(1) : digits;
  const es = Math.abs(exp) < 10 ? '0' + Math.abs(exp) : String(Math.abs(exp));
  return sign + mant + 'E' + (exp < 0 ? '-' : '+') + es;
}
function fmtFloat(x) {
  if (!isFinite(x) || x === 0) return fmtDouble(x);
  let p = 1, s;
  for (; p <= 9; p++) { s = x.toPrecision(p); if (Math.fround(parseFloat(s)) === x) break; }
  const v = parseFloat(s);
  const e = v.toExponential();
  const m = /^(-?)(\d)(?:\.(\d+))?e([+-]\d+)$/.exec(e);
  const exp = parseInt(m[4], 10);
  if (exp >= -4 && exp < 7) return fmtDouble(v);
  return sciShort(m[1], m[2] + (m[3] || ''), exp);
}

// Adds thousands separators to the integer part of a plain digit string.
function group3(intPart) {
  let out = '';
  for (let i = 0; i < intPart.length; i++) {
    if (i > 0 && (intPart.length - i) % 3 === 0) out += ',';
    out += intPart[i];
  }
  return out;
}

// Exact fixed-point rendering of a number/Dec with n decimals (rounded half away from zero)
function toFixedStr(v, n) {
  if (v instanceof Dec) {
    const r = Dec.round(v, n, 'away');
    let s = r.toString();
    if (n > 0) {
      const dot = s.indexOf('.');
      const have = dot < 0 ? 0 : s.length - dot - 1;
      if (dot < 0) s += '.';
      s += '0'.repeat(n - have);
    }
    return s;
  }
  if (Math.abs(v) >= 1e21) {
    // toFixed switches to exponent here; expand manually
    let s = BigInt(Math.round(v)).toString();
    return n > 0 ? s + '.' + '0'.repeat(n) : s;
  }
  let s = v.toFixed(Math.min(n, 100));
  if (/^-0(\.0*)?$/.test(s)) s = s.slice(1); // .NET Core prints 0.00 not -0.00
  return s;
}

function isIntKind(kind) { return kind === 'int' || kind === 'long' || kind === 'byte' || kind === 'short' || kind === 'sbyte' || kind === 'uint' || kind === 'ulong' || kind === 'ushort'; }

// Formats a numeric value with a .NET format string.
// kind: 'int' | 'long' | 'double' | 'float' | 'decimal' | 'byte' ...
function fmtNumber(v, fmt, kind) {
  if (fmt === null || fmt === undefined || fmt === '') return numToString(v, kind);
  const m = /^([A-Za-z])(\d{0,2})$/.exec(fmt);
  const isDec = v instanceof Dec;
  const num = isDec ? v.toNumber() : v;
  if (m) {
    const c = m[1], pstr = m[2], p = pstr === '' ? null : parseInt(pstr, 10);
    const up = c.toUpperCase();
    if (!isDec && !isFinite(num) && up !== 'X' && up !== 'D') return fmtDouble(num);
    switch (up) {
      case 'F': return toFixedStr(v, p === null ? 2 : p);
      case 'N': {
        const s = toFixedStr(v, p === null ? 2 : p);
        const neg = s[0] === '-';
        const body = neg ? s.slice(1) : s;
        const dot = body.indexOf('.');
        const ip = dot < 0 ? body : body.slice(0, dot);
        return (neg ? '-' : '') + group3(ip) + (dot < 0 ? '' : body.slice(dot));
      }
      case 'C': {
        const s = toFixedStr(v, p === null ? 2 : p);
        const neg = s[0] === '-';
        const body = neg ? s.slice(1) : s;
        const dot = body.indexOf('.');
        const ip = dot < 0 ? body : body.slice(0, dot);
        return (neg ? '-' : '') + '£' + group3(ip) + (dot < 0 ? '' : body.slice(dot));
      }
      case 'P': {
        const scaled = isDec ? Dec.mul(v, new Dec(100n, 0)) : num * 100;
        const s = toFixedStr(scaled, p === null ? 2 : p);
        const neg = s[0] === '-';
        const body = neg ? s.slice(1) : s;
        const dot = body.indexOf('.');
        const ip = dot < 0 ? body : body.slice(0, dot);
        return (neg ? '-' : '') + group3(ip) + (dot < 0 ? '' : body.slice(dot)) + '%';
      }
      case 'D': {
        if (!isIntKind(kind)) throw rt.ex('FormatException', 'Format specifier was invalid.');
        const neg = num < 0;
        let s = String(Math.abs(num));
        if (p !== null) while (s.length < p) s = '0' + s;
        return (neg ? '-' : '') + s;
      }
      case 'X': {
        if (!isIntKind(kind)) throw rt.ex('FormatException', 'Format specifier was invalid.');
        let n = num;
        if (n < 0) n = kind === 'byte' ? n & 0xFF : (kind === 'long' ? Number(BigInt.asUintN(64, BigInt(n))) : n >>> 0);
        let s = n.toString(16);
        if (c === 'X') s = s.toUpperCase();
        if (p !== null) while (s.length < p) s = '0' + s;
        return s;
      }
      case 'E': {
        const digits = p === null ? 6 : p;
        let s = num.toExponential(digits);
        const mm = /^(-?[\d.]+)e([+-])(\d+)$/.exec(s);
        let ex = mm[3]; while (ex.length < 3) ex = '0' + ex;
        s = mm[1] + (c === 'e' ? 'e' : 'E') + mm[2] + ex;
        return s;
      }
      case 'G': {
        if (p === null || p === 0) return numToString(v, kind);
        if (isDec) return numToString(Dec.parse(Number(num.toPrecision(p)).toString()), kind);
        const r = Number(num.toPrecision(p));
        const e = r.toExponential();
        const mm = /^(-?)(\d)(?:\.(\d+))?e([+-]\d+)$/.exec(e);
        const exp = parseInt(mm[4], 10);
        if (exp >= -4 && exp < p) return fmtDouble(r);
        return sciShort(mm[1], mm[2] + (mm[3] || ''), exp);
      }
      case 'R': return numToString(v, kind);
      default:
        throw rt.ex('FormatException', 'Format specifier was invalid.');
    }
  }
  return fmtCustom(v, fmt);
}

function numToString(v, kind) {
  if (v instanceof Dec) return v.toString();
  if (kind === 'float') return fmtFloat(v);
  if (kind === 'long' || kind === 'ulong') return longStr(v);
  if (isIntKind(kind)) return String(v);
  return fmtDouble(v);
}
// longs are JS numbers: values at the very edge of the range print as the exact C# limits
function longStr(v) {
  if (v >= 9223372036854775807) return '9223372036854775807';
  if (v <= -9223372036854775808) return '-9223372036854775808';
  return Number.isSafeInteger(v) || Math.abs(v) < 1e21 ? BigInt(Math.trunc(v)).toString() : String(v);
}

// Custom numeric formats such as "0.00", "#.##", "#,##0", "000", "0.#%"
function fmtCustom(v, fmt) {
  const sections = splitSections(fmt);
  let num = v instanceof Dec ? v : v;
  const isNeg = v instanceof Dec ? v.m < 0n : v < 0;
  let f = sections[0];
  let useNegSection = false;
  if (isNeg && sections.length > 1 && sections[1] !== '') { f = sections[1]; useNegSection = true; }
  if (v instanceof Dec ? v.m === 0n : v === 0) { if (sections.length > 2) f = sections[2]; }
  // analyse the format
  let intZeros = 0, intDigits = 0, decZeros = 0, decHashes = 0, seenDot = false, grouping = false, percent = 0;
  let inQuote = null;
  for (let i = 0; i < f.length; i++) {
    const c = f[i];
    if (inQuote) { if (c === inQuote) inQuote = null; continue; }
    if (c === '"' || c === "'") { inQuote = c; continue; }
    if (c === '\\') { i++; continue; }
    if (c === '.') { if (!seenDot) seenDot = true; continue; }
    if (c === ',') { if (!seenDot) grouping = true; continue; }
    if (c === '%') { percent++; continue; }
    if (c === '0') { if (seenDot) { decZeros = decZeros + decHashes + 1; decHashes = 0; } else { intZeros++; intDigits++; } continue; }
    if (c === '#') { if (seenDot) decHashes++; else intDigits++; continue; }
  }
  // trailing commas before the point scale by 1000: rarely used, ignored
  let x = v;
  if (percent) x = v instanceof Dec ? Dec.mul(v, new Dec(100n, 0)) : v * 100;
  const decimals = decZeros + decHashes;
  let s = toFixedStr(x, decimals);
  if (s[0] === '-') s = s.slice(1);
  let [ip, dp] = s.split('.');
  dp = dp || '';
  // drop optional trailing decimals
  while (dp.length > decZeros && dp[dp.length - 1] === '0') dp = dp.slice(0, -1);
  if (ip === '0' && intZeros === 0) ip = '';
  while (ip.length < intZeros) ip = '0' + ip;
  if (grouping && ip) ip = group3(ip);
  // now write out, replacing the digit placeholders block
  let out = '';
  let placedNumber = false;
  inQuote = null;
  for (let i = 0; i < f.length; i++) {
    const c = f[i];
    if (inQuote) { if (c === inQuote) inQuote = null; else out += c; continue; }
    if (c === '"' || c === "'") { inQuote = c; continue; }
    if (c === '\\') { if (i + 1 < f.length) out += f[++i]; continue; }
    if (c === '0' || c === '#' || c === '.' || c === ',') {
      if (!placedNumber) {
        placedNumber = true;
        out += ip;
        if (dp) out += '.' + dp;
      }
      continue;
    }
    out += c;
  }
  if (!placedNumber) out = out; // format with no digits: just literal text
  const isZeroResult = !/[1-9]/.test(ip + dp);
  if (isNeg && !useNegSection && !isZeroResult) out = '-' + out;
  return out;
}
function splitSections(f) {
  const out = []; let cur = '', q = null;
  for (let i = 0; i < f.length; i++) {
    const c = f[i];
    if (q) { cur += c; if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '\\') { cur += c + (f[i + 1] || ''); i++; continue; }
    if (c === ';') { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

// ---------------------------------------------------------------- Random (.NET's seeded algorithm)
class CsRandom extends CsObject {
  constructor(seed) {
    super();
    if (seed === undefined) seed = (Math.random() * 2147483647) | 0;
    const MBIG = 2147483647, MSEED = 161803398;
    const sa = new Array(56).fill(0);
    const subtraction = (seed === -2147483648) ? 2147483647 : Math.abs(seed);
    let mj = MSEED - subtraction;
    sa[55] = mj;
    let mk = 1, ii = 0;
    for (let i = 1; i < 55; i++) {
      if ((ii += 21) >= 55) ii -= 55;
      sa[ii] = mk;
      mk = (mj - mk) | 0;
      if (mk < 0) mk = (mk + MBIG) | 0;
      mj = sa[ii];
    }
    for (let k = 1; k < 5; k++) {
      for (let i = 1; i < 56; i++) {
        let n = i + 30;
        if (n >= 55) n -= 55;
        sa[i] = (sa[i] - sa[1 + n]) | 0;   // C# int arithmetic wraps
        if (sa[i] < 0) sa[i] = (sa[i] + MBIG) | 0;
      }
    }
    this.sa = sa; this.inext = 0; this.inextp = 21;
  }
  internalSample() {
    let a = this.inext, b = this.inextp;
    if (++a >= 56) a = 1;
    if (++b >= 56) b = 1;
    let r = (this.sa[a] - this.sa[b]) | 0;
    if (r === 2147483647) r--;
    if (r < 0) r = (r + 2147483647) | 0;
    this.sa[a] = r;
    this.inext = a; this.inextp = b;
    return r;
  }
  sample() { return this.internalSample() * (1.0 / 2147483647); }
  largeSample() {
    let result = this.internalSample();
    const negative = this.internalSample() % 2 === 0;
    if (negative) result = -result;
    let d = result;
    d += (2147483647 - 1);
    d /= 2 * 2147483647 - 1;
    return d;
  }
  next0() { return this.internalSample(); }
  next1(max) {
    if (max < 0) throw rt.ex('ArgumentOutOfRangeException', "'maxValue' must be greater than or equal to zero. (Parameter 'maxValue')");
    return Math.trunc(this.sample() * max);
  }
  next2(min, max) {
    if (min > max) throw rt.ex('ArgumentOutOfRangeException', "'minValue' cannot be greater than maxValue. (Parameter 'minValue')");
    const range = max - min;
    if (range <= 2147483647) return Math.trunc(this.sample() * range) + min;
    return Math.trunc(this.largeSample() * range) + min;
  }
  nextDouble() { return this.sample(); }
  *M$ToString$() { return 'System.Random'; }
}

// ---------------------------------------------------------------- SHA-256
const SHA_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
function sha256(bytes) {
  const len = bytes.length;
  const bitLen = len * 8;
  const total = ((len + 9 + 63) >> 6) << 6;
  const buf = new Uint8Array(total);
  for (let i = 0; i < len; i++) buf[i] = bytes[i] & 0xFF;
  buf[len] = 0x80;
  const hi = Math.floor(bitLen / 0x100000000), lo = bitLen >>> 0;
  buf[total - 8] = (hi >>> 24) & 0xFF; buf[total - 7] = (hi >>> 16) & 0xFF; buf[total - 6] = (hi >>> 8) & 0xFF; buf[total - 5] = hi & 0xFF;
  buf[total - 4] = (lo >>> 24) & 0xFF; buf[total - 3] = (lo >>> 16) & 0xFF; buf[total - 2] = (lo >>> 8) & 0xFF; buf[total - 1] = lo & 0xFF;
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const W = new Uint32Array(64);
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) W[i] = (buf[off + i * 4] << 24) | (buf[off + i * 4 + 1] << 16) | (buf[off + i * 4 + 2] << 8) | buf[off + i * 4 + 3];
    for (let i = 16; i < 64; i++) {
      const w15 = W[i - 15], w2 = W[i - 2];
      const s0 = ((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3);
      const s1 = ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + SHA_K[i] + W[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  const out = [];
  for (let i = 0; i < 8; i++) out.push((H[i] >>> 24) & 0xFF, (H[i] >>> 16) & 0xFF, (H[i] >>> 8) & 0xFF, H[i] & 0xFF);
  return out;
}
function utf8Bytes(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) {
      const d = s.charCodeAt(i + 1);
      if (d >= 0xDC00 && d <= 0xDFFF) { c = 0x10000 + ((c - 0xD800) << 10) + (d - 0xDC00); i++; }
      else c = 0xFFFD;
    } else if (c >= 0xD800 && c <= 0xDFFF) c = 0xFFFD;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}
function utf8Decode(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length;) {
    const b = bytes[i];
    let c, n = 0;
    if (b < 0x80) { c = b; n = 1; }
    else if ((b & 0xE0) === 0xC0) { c = ((b & 31) << 6) | (bytes[i + 1] & 63); n = 2; }
    else if ((b & 0xF0) === 0xE0) { c = ((b & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63); n = 3; }
    else { c = ((b & 7) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63); n = 4; }
    s += String.fromCodePoint(c); i += n;
  }
  return s;
}

// ---------------------------------------------------------------- DateTime / TimeSpan
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DT_MIN = Date.UTC(1, 0, 1) - 0; // year 1 (Date.UTC maps 1 -> 1901, fixed below)
function utcMs(y, mo, d, h, mi, s, ms) {
  const dt = new Date(0);
  dt.setUTCFullYear(y, mo - 1, d);
  dt.setUTCHours(h || 0, mi || 0, s || 0, ms || 0);
  return dt.getTime();
}
class CsDateTime extends CsObject {
  constructor(ms) { super(); this.ms = ms; }
  get d() { return new Date(this.ms); }
  get Year() { return new Date(this.ms).getUTCFullYear(); }
  get Month() { return new Date(this.ms).getUTCMonth() + 1; }
  get Day() { return new Date(this.ms).getUTCDate(); }
  get Hour() { return new Date(this.ms).getUTCHours(); }
  get Minute() { return new Date(this.ms).getUTCMinutes(); }
  get Second() { return new Date(this.ms).getUTCSeconds(); }
  get Millisecond() { return new Date(this.ms).getUTCMilliseconds(); }
  get DayOfWeek() { return new Date(this.ms).getUTCDay(); }
  get DayOfYear() { const y = this.Year; return Math.floor((this.ms - utcMs(y, 1, 1)) / 86400000) + 1; }
  get Date() { const d = new Date(this.ms); return new CsDateTime(utcMs(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())); }
  get TimeOfDay() { return new CsTimeSpan(this.ms - this.Date.ms); }
  addMonths(n) {
    const d = new Date(this.ms);
    let y = d.getUTCFullYear(), m = d.getUTCMonth() + n;
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    const dim = daysInMonth(y, m + 1);
    const day = Math.min(d.getUTCDate(), dim);
    return new CsDateTime(utcMs(y, m + 1, day, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()));
  }
  format(fmt) { return fmtDate(this, fmt); }
  *M$ToString$() { return fmtDate(this, null); }
  *M$Equals$object(o) { return o instanceof CsDateTime && o.ms === this.ms; }
}
function daysInMonth(y, m) { return new Date(Date.UTC(2000, m, 0)).getUTCDate() + ((m === 2 && isLeap(y)) ? 0 : 0) - ((m === 2 && !isLeap(y)) ? 1 : 0); }
function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
function nowDate() {
  const d = new Date();
  return new CsDateTime(utcMs(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()));
}
function pad(n, w) { let s = String(n); while (s.length < w) s = '0' + s; return s; }
const DATE_STD = {
  d: 'dd/MM/yyyy', D: 'dd MMMM yyyy', t: 'HH:mm', T: 'HH:mm:ss', g: 'dd/MM/yyyy HH:mm', G: 'dd/MM/yyyy HH:mm:ss',
  f: 'dd MMMM yyyy HH:mm', F: 'dd MMMM yyyy HH:mm:ss', s: "yyyy'-'MM'-'dd'T'HH':'mm':'ss", u: "yyyy'-'MM'-'dd HH':'mm':'ss'Z'",
  M: 'd MMMM', m: 'd MMMM', Y: 'MMMM yyyy', y: 'MMMM yyyy', o: "yyyy'-'MM'-'dd'T'HH':'mm':'ss'.'fffffff", O: "yyyy'-'MM'-'dd'T'HH':'mm':'ss'.'fffffff",
};
function fmtDate(dt, fmt) {
  if (fmt === null || fmt === undefined || fmt === '') fmt = 'dd/MM/yyyy HH:mm:ss';
  else if (fmt.length === 1) {
    if (!DATE_STD[fmt]) throw rt.ex('FormatException', 'Input string was not in a correct format.');
    fmt = DATE_STD[fmt];
  }
  const d = new Date(dt.ms);
  const Y = d.getUTCFullYear(), Mo = d.getUTCMonth() + 1, D = d.getUTCDate(), H = d.getUTCHours(), Mi = d.getUTCMinutes(), S = d.getUTCSeconds(), Ms = d.getUTCMilliseconds();
  let out = '';
  for (let i = 0; i < fmt.length;) {
    const c = fmt[i];
    let n = 1; while (fmt[i + n] === c) n++;
    switch (c) {
      case 'y': out += n <= 2 ? pad(Y % 100, n) : pad(Y, n); break;
      case 'M': out += n === 1 ? String(Mo) : n === 2 ? pad(Mo, 2) : n === 3 ? MONTHS[Mo - 1].slice(0, 3) : MONTHS[Mo - 1]; break;
      case 'd': out += n === 1 ? String(D) : n === 2 ? pad(D, 2) : n === 3 ? DAYS[d.getUTCDay()].slice(0, 3) : DAYS[d.getUTCDay()]; break;
      case 'H': out += n === 1 ? String(H) : pad(H, 2); break;
      case 'h': { const h12 = H % 12 === 0 ? 12 : H % 12; out += n === 1 ? String(h12) : pad(h12, 2); break; }
      case 'm': out += n === 1 ? String(Mi) : pad(Mi, 2); break;
      case 's': out += n === 1 ? String(S) : pad(S, 2); break;
      case 'f': case 'F': { let fs = pad(Ms, 3) + '0000'; fs = fs.slice(0, n); if (c === 'F') fs = fs.replace(/0+$/, ''); out += fs; break; }
      case 't': out += n === 1 ? (H < 12 ? 'a' : 'p') : (H < 12 ? 'am' : 'pm'); break;
      case 'z': out += '+00:00'.slice(0, n === 1 ? 3 : 6); break;
      case 'K': break;
      case "'": case '"': {
        let j = i + 1; while (j < fmt.length && fmt[j] !== c) { out += fmt[j]; j++; }
        i = j + 1; continue;
      }
      case '\\': out += fmt[i + 1] || ''; i += 2; continue;
      default: out += c.repeat(n);
    }
    i += n;
  }
  return out;
}
// Parse with an exact format; returns CsDateTime or null
function parseDateExact(s, fmt) {
  if (fmt.length === 1 && DATE_STD[fmt]) fmt = DATE_STD[fmt];
  let re = '^';
  const order = [];
  for (let i = 0; i < fmt.length;) {
    const c = fmt[i];
    let n = 1; while (fmt[i + n] === c) n++;
    const grp = (r, key) => { re += '(' + r + ')'; order.push([key, n]); };
    switch (c) {
      case 'y': grp(n <= 2 ? '\\d{2}' : n === 4 ? '\\d{4}' : '\\d{' + n + '}', 'y'); break;
      case 'M': if (n <= 2) grp(n === 1 ? '\\d{1,2}' : '\\d{2}', 'M'); else grp('[A-Za-z]+', n === 3 ? 'MMM' : 'MMMM'); break;
      case 'd': if (n <= 2) grp(n === 1 ? '\\d{1,2}' : '\\d{2}', 'd'); else re += '[A-Za-z]+'; break;
      case 'H': case 'h': grp(n === 1 ? '\\d{1,2}' : '\\d{2}', 'H'); break;
      case 'm': grp(n === 1 ? '\\d{1,2}' : '\\d{2}', 'm'); break;
      case 's': grp(n === 1 ? '\\d{1,2}' : '\\d{2}', 's'); break;
      case 'f': case 'F': grp('\\d{' + (c === 'F' ? '0,' : '') + n + '}', 'f'); break;
      case 't': grp('[AaPp][Mm]?', 't'); break;
      case "'": case '"': {
        let j = i + 1; while (j < fmt.length && fmt[j] !== c) { re += fmt[j].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); j++; }
        i = j + 1; continue;
      }
      case '\\': re += (fmt[i + 1] || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); i += 2; continue;
      default: re += c.repeat(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    i += n;
  }
  re += '$';
  const m = new RegExp(re).exec(s);
  if (!m) return null;
  let Y = 1, Mo = 1, D = 1, H = 0, Mi = 0, S = 0, Ms = 0, pm = null;
  order.forEach(([k], idx) => {
    const v = m[idx + 1];
    switch (k) {
      case 'y': Y = v.length <= 2 ? 2000 + parseInt(v, 10) - (parseInt(v, 10) > 49 ? 100 : 0) : parseInt(v, 10); break;
      case 'M': Mo = parseInt(v, 10); break;
      case 'MMM': case 'MMMM': { const ix = MONTHS.findIndex((x) => x.toLowerCase() === v.toLowerCase() || x.slice(0, 3).toLowerCase() === v.toLowerCase()); Mo = ix + 1; break; }
      case 'd': D = parseInt(v, 10); break;
      case 'H': H = parseInt(v, 10); break;
      case 'm': Mi = parseInt(v, 10); break;
      case 's': S = parseInt(v, 10); break;
      case 'f': Ms = v ? Math.round(parseInt(v, 10) * Math.pow(10, 3 - v.length)) : 0; break;
      case 't': pm = /^p/i.test(v); break;
    }
  });
  if (pm !== null) { if (pm && H < 12) H += 12; if (!pm && H === 12) H = 0; }
  if (Mo < 1 || Mo > 12 || D < 1 || D > daysInMonth(Y, Mo) || H > 23 || Mi > 59 || S > 59) return null;
  return new CsDateTime(utcMs(Y, Mo, D, H, Mi, S, Ms));
}
function parseDate(s) {
  s = String(s).trim();
  const fmts = ['d/M/yyyy H:m:s', 'd/M/yyyy H:m', 'd/M/yyyy', 'yyyy-M-d H:m:s', 'yyyy-M-d H:m', 'yyyy-M-d', "yyyy-M-d'T'H:m:s", "yyyy-M-d'T'H:m",
    'd MMMM yyyy', 'd MMM yyyy', 'd MMMM yyyy H:m', 'd MMMM yyyy H:m:s', 'H:m', 'H:m:s', 'd-M-yyyy', 'd.M.yyyy', 'yyyy/M/d', 'd/M/yy'];
  for (const f of fmts) {
    const r = parseDateExact(s, f);
    if (r) {
      if (f === 'H:m' || f === 'H:m:s') { const t = nowDate().Date; return new CsDateTime(t.ms + (r.ms - utcMs(1, 1, 1))); }
      return r;
    }
  }
  return null;
}
class CsTimeSpan extends CsObject {
  constructor(ms) { super(); this.ms = ms; }
  get TotalMilliseconds() { return this.ms; }
  get TotalSeconds() { return this.ms / 1000; }
  get TotalMinutes() { return this.ms / 60000; }
  get TotalHours() { return this.ms / 3600000; }
  get TotalDays() { return this.ms / 86400000; }
  get Days() { return Math.trunc(this.ms / 86400000); }
  get Hours() { return Math.trunc(this.ms / 3600000) % 24; }
  get Minutes() { return Math.trunc(this.ms / 60000) % 60; }
  get Seconds() { return Math.trunc(this.ms / 1000) % 60; }
  get Milliseconds() { return Math.trunc(this.ms) % 1000; }
  format(fmt) {
    const neg = this.ms < 0;
    const a = Math.abs(this.ms);
    const days = Math.floor(a / 86400000), h = Math.floor(a / 3600000) % 24, m = Math.floor(a / 60000) % 60, s = Math.floor(a / 1000) % 60, ms = Math.floor(a) % 1000;
    if (!fmt || fmt === 'c' || fmt === 'g' || fmt === 'G') {
      let out = (neg ? '-' : '') + (days ? days + '.' : '') + pad(h, 2) + ':' + pad(m, 2) + ':' + pad(s, 2);
      if (ms) out += '.' + pad(ms, 3) + '0000';
      return out;
    }
    let out = '';
    for (let i = 0; i < fmt.length;) {
      const c = fmt[i]; let n = 1; while (fmt[i + n] === c) n++;
      switch (c) {
        case 'd': out += pad(days, n); break;
        case 'h': out += pad(h, n); break;
        case 'm': out += pad(m, n); break;
        case 's': out += pad(s, n); break;
        case 'f': out += (pad(ms, 3) + '0000').slice(0, n); break;
        case '\\': out += fmt[i + 1] || ''; i += 2; continue;
        case "'": { let j = i + 1; while (j < fmt.length && fmt[j] !== "'") { out += fmt[j]; j++; } i = j + 1; continue; }
        default: throw rt.ex('FormatException', 'Input string was not in a correct format.');
      }
      i += n;
    }
    return out;
  }
  *M$ToString$() { return this.format(null); }
  *M$Equals$object(o) { return o instanceof CsTimeSpan && o.ms === this.ms; }
}

// ---------------------------------------------------------------- collections
class CsList extends CsObject {
  constructor(a, t) { super(); this.a = a || []; this.v = 0; this.$t = t; }
  *M$ToString$() { return 'System.Collections.Generic.List`1[' + (this.$t || 'System.Object') + ']'; }
}
class CsDict extends CsObject {
  constructor(t) { super(); this.m = new Map(); this.v = 0; this.$t = t; }
  *M$ToString$() { return 'System.Collections.Generic.Dictionary`2[' + (this.$t || 'System.Object,System.Object') + ']'; }
}
class CsKVP extends CsObject {
  constructor(k, v) { super(); this.k = k; this.v = v; }
}
class CsStringBuilder extends CsObject {
  constructor(s) { super(); this.s = s || ''; }
  *M$ToString$() { return this.s; }
}
class CsHashSet extends CsObject {
  constructor() { super(); this.m = new Set(); this.v = 0; }
}
class CsQueue extends CsObject {
  constructor() { super(); this.a = []; this.v = 0; }
}
class CsStack extends CsObject {
  constructor() { super(); this.a = []; this.v = 0; }
}
class CsType extends CsObject {
  constructor(name, full) { super(); this.name = name; this.full = full; }
  *M$ToString$() { return this.full; }
}
class CsCulture extends CsObject {
  constructor(name) { super(); this.name = name; }
  *M$ToString$() { return this.name; }
}
class CsEncoding extends CsObject {
  constructor(name) { super(); this.name = name; }
}
class CsSHA extends CsObject {}

// key used in Dictionary/HashSet maps (decimals compared by value)
function mapKey(k) { return k instanceof Dec ? 'D:' + Dec.norm(k.m, k.s).toString().replace(/\.?0+$/, '') : k instanceof CsChar ? k.c : k; }

// ---------------------------------------------------------------- files
class CsStreamWriter extends CsObject {
  constructor(files, path, append) {
    super();
    this.files = files; this.path = path; this.buf = ''; this.closed = false; this.autoFlush = false;
    if (!append || !Object.prototype.hasOwnProperty.call(files, path)) files[path] = append ? (files[path] || '') : '';
  }
  write(s) {
    if (this.closed) throw rt.ex('ObjectDisposedException', 'Cannot write to a closed TextWriter.');
    this.buf += s;
    if (this.autoFlush) this.flush();
  }
  flush() { if (this.buf) { this.files[this.path] = (this.files[this.path] || '') + this.buf; this.buf = ''; } }
  close() { if (!this.closed) { this.flush(); this.closed = true; rt.openWriters.delete(this.path); } }
}
class CsStreamReader extends CsObject {
  constructor(text) { super(); this.text = text; this.pos = 0; this.closed = false; }
  readLine() {
    if (this.closed) throw rt.ex('ObjectDisposedException', 'Cannot read from a closed TextReader.');
    if (this.pos >= this.text.length) return null;
    let j = this.pos;
    while (j < this.text.length && this.text[j] !== '\n' && this.text[j] !== '\r') j++;
    const line = this.text.slice(this.pos, j);
    if (this.text[j] === '\r' && this.text[j + 1] === '\n') j++;
    this.pos = j + 1;
    return line;
  }
  readToEnd() { const s = this.text.slice(this.pos); this.pos = this.text.length; return s; }
  peek() { return this.pos < this.text.length ? this.text.charCodeAt(this.pos) : -1; }
  read() { return this.pos < this.text.length ? this.text.charCodeAt(this.pos++) : -1; }
}

// ---------------------------------------------------------------- type names
const PRIM_FULL = {
  int: 'System.Int32', long: 'System.Int64', double: 'System.Double', float: 'System.Single', decimal: 'System.Decimal',
  bool: 'System.Boolean', char: 'System.Char', string: 'System.String', object: 'System.Object', byte: 'System.Byte',
  short: 'System.Int16', sbyte: 'System.SByte', uint: 'System.UInt32', ulong: 'System.UInt64', ushort: 'System.UInt16', void: 'System.Void',
};
function typeFullName(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return 'System.String';
  if (typeof v === 'number') return Number.isInteger(v) && Math.abs(v) <= 2147483647 ? 'System.Int32' : 'System.Double';
  if (typeof v === 'boolean') return 'System.Boolean';
  if (v instanceof CsChar) return 'System.Char';
  if (v instanceof Dec) return 'System.Decimal';
  if (Array.isArray(v) || v instanceof CsArray2) return v.$t || 'System.Object[]';
  if (v.$cls) return v.$cls.full;
  if (v instanceof CsList) return 'System.Collections.Generic.List`1[' + (v.$t || 'System.Object') + ']';
  if (v instanceof CsDict) return 'System.Collections.Generic.Dictionary`2[' + (v.$t || 'System.Object,System.Object') + ']';
  if (v instanceof CsStringBuilder) return 'System.Text.StringBuilder';
  if (v instanceof CsRandom) return 'System.Random';
  if (v instanceof CsDateTime) return 'System.DateTime';
  if (v instanceof CsTimeSpan) return 'System.TimeSpan';
  if (v instanceof CsKVP) return 'System.Collections.Generic.KeyValuePair`2';
  if (v instanceof CsStreamWriter) return 'System.IO.StreamWriter';
  if (v instanceof CsStreamReader) return 'System.IO.StreamReader';
  if (v instanceof CsType) return 'System.RuntimeType';
  if (v instanceof CsCulture) return 'System.Globalization.CultureInfo';
  if (typeof v === 'function') return 'System.Delegate';
  return 'System.Object';
}
function typeShortName(v) {
  const f = typeFullName(v);
  if (v && v.$cls) return v.$cls.name;
  const i = f.lastIndexOf('.', f.indexOf('`') >= 0 ? f.indexOf('`') : f.length);
  return f.slice(i + 1);
}

// ===========================================================================
// 5. Runtime helpers used by generated code ($rt)
// ===========================================================================

const rt = {
  CsObject, CsChar, CsArray2, Dec, CsRandom, CsDateTime, CsTimeSpan, CsList, CsDict, CsKVP, CsStringBuilder,
  CsHashSet, CsQueue, CsStack, CsType, CsCulture, CsEncoding, CsSHA, CsStreamWriter, CsStreamReader,
  C: null,            // generated classes by name (set when a program loads)
  ctx: null,          // the current run's options/state
  lineFn: () => 0,    // returns the line currently executing
  openWriters: new Set(),
  types: new Map(),

  // ---- exceptions -------------------------------------------------------
  ex(name, msg) {
    const C = rt.C[name] || rt.C.Exception;
    const e = new C();
    e.f$Exception$_message = msg;
    e.$line = rt.lineFn();
    return e;
  },
  // turn any JS error into a C# exception object (or rethrow fatal ones)
  wrap(e) {
    if (e instanceof CsObject) return e;
    if (e && e.$fatal) throw e;
    if (e instanceof TypeError && /null|undefined/.test(e.message)) {
      const x = rt.ex('NullReferenceException', 'Object reference not set to an instance of an object.');
      return x;
    }
    if (e instanceof RangeError && /call stack/i.test(e.message)) throw e;
    throw e;
  },
  thr(e, line) {
    if (e === null || e === undefined) e = rt.ex('NullReferenceException', 'Object reference not set to an instance of an object.');
    e.$line = line;
    return e;
  },
  ioor() { return rt.ex('IndexOutOfRangeException', 'Index was outside the bounds of the array.'); },
  nre() { return rt.ex('NullReferenceException', 'Object reference not set to an instance of an object.'); },
  dz() { return rt.ex('DivideByZeroException', 'Attempted to divide by zero.'); },

  // ---- integer maths ----------------------------------------------------
  idiv(a, b) { if (b === 0) throw rt.dz(); return (a / b) | 0; },
  imod(a, b) { if (b === 0) throw rt.dz(); return (a % b) | 0; },
  ldiv(a, b) { if (b === 0) throw rt.dz(); return Math.trunc(a / b); },
  lmod(a, b) { if (b === 0) throw rt.dz(); const r = a % b; return r === 0 ? 0 : r; },
  lwrap(x) {
    if (x <= 9223372036854775807 && x >= -9223372036854775808) return x;
    return Number(BigInt.asIntN(64, BigInt(Math.trunc(x))));
  },
  d2i(x) { // (int)double: truncate, saturate like .NET 9
    if (x !== x) return 0;
    if (x >= 2147483647) return 2147483647;
    if (x <= -2147483648) return -2147483648;
    return Math.trunc(x) | 0;
  },
  d2l(x) {
    if (x !== x) return 0;
    if (x >= 9223372036854775807) return 9223372036854775807;
    if (x <= -9223372036854775808) return -9223372036854775808;
    return Math.trunc(x);
  },
  ckInt(x) { // checked conversion used by Convert.ToInt32 etc.
    if (!(x >= -2147483648.5 && x < 2147483647.5)) throw rt.ex('OverflowException', 'Value was either too large or too small for an Int32.');
    return x;
  },

  // ---- strings ----------------------------------------------------------
  s(v) { return v === null || v === undefined ? '' : v; },
  ch(c) { return String.fromCharCode(c); },
  b(v) { return v ? 'True' : 'False'; },
  fd: fmtDouble,
  lstr: longStr,
  ff: fmtFloat,
  dec(v) { return v === null ? '' : v.toString(); },
  box(c) { return new CsChar(c); },
  // ToString of any value whose static type is object/class/interface
  *strG(v) {
    if (v === null || v === undefined) return '';
    switch (typeof v) {
      case 'string': return v;
      case 'number': return fmtDouble(v);
      case 'boolean': return v ? 'True' : 'False';
      case 'function': return 'System.Func';
    }
    if (v instanceof CsObject) return rt.s(yield* v.M$ToString$());
    if (v instanceof CsChar) return String.fromCharCode(v.c);
    if (v instanceof Dec) return v.toString();
    if (Array.isArray(v)) return v.$t || 'System.Object[]';
    if (v.$enum) return v.toString();
    return String(v);
  },
  strSync(v) {
    // non-generator ToString used for builtin values (not user objects)
    if (v === null || v === undefined) return '';
    if (v instanceof CsObject && !v.$cls) { const it = v.M$ToString$(); return it.next().value; }
    if (v instanceof CsObject) return typeFullName(v);
    if (typeof v === 'number') return fmtDouble(v);
    if (typeof v === 'boolean') return v ? 'True' : 'False';
    if (v instanceof CsChar) return String.fromCharCode(v.c);
    if (Array.isArray(v)) return v.$t || 'System.Object[]';
    return String(v);
  },
  align(s, w) {
    if (w >= 0) return s.length >= w ? s : ' '.repeat(w - s.length) + s;
    w = -w;
    return s.length >= w ? s : s + ' '.repeat(w - s.length);
  },
  // format a value with a format string; kind is the static kind
  fmt(v, f, kind) {
    if (kind === 'string') return rt.s(v);
    if (v === null || v === undefined) return '';
    switch (kind) {
      case 'int': case 'long': case 'double': case 'float': case 'decimal': case 'byte': case 'short':
      case 'sbyte': case 'uint': case 'ulong': case 'ushort':
        return fmtNumber(v, f, kind);
      case 'char': return String.fromCharCode(v);
      case 'bool': return v ? 'True' : 'False';
      case 'date': return fmtDate(v, f);
      case 'timespan': return v.format(f);
      default:
        // unknown static type (object): decide at run time
        if (typeof v === 'number') return fmtNumber(v, f, Number.isInteger(v) && Math.abs(v) < 2147483648 ? 'int' : 'double');
        if (v instanceof Dec) return fmtNumber(v, f, 'decimal');
        if (v instanceof CsDateTime) return fmtDate(v, f);
        if (v instanceof CsTimeSpan) return v.format(f);
        return rt.strSync(v);
    }
  },
  // composite formatting: string.Format / Console.WriteLine("{0}", ...)
  // vals are already-evaluated values, kinds their static kinds ('str' = already a string)
  format(f, vals, kinds) {
    if (f === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 'format')");
    let out = '';
    const n = f.length;
    const bad = () => rt.ex('FormatException', 'Input string was not in a correct format.');
    for (let i = 0; i < n; i++) {
      const c = f[i];
      if (c === '{') {
        if (f[i + 1] === '{') { out += '{'; i++; continue; }
        let j = i + 1;
        let idx = '';
        while (j < n && f[j] === ' ') j++;
        while (j < n && f[j] >= '0' && f[j] <= '9') idx += f[j++];
        while (j < n && f[j] === ' ') j++;
        if (!idx) throw bad();
        let align = 0, fmtS = null;
        if (f[j] === ',') {
          j++;
          while (j < n && f[j] === ' ') j++;
          let a = '';
          if (f[j] === '-') a += f[j++];
          while (j < n && f[j] >= '0' && f[j] <= '9') a += f[j++];
          while (j < n && f[j] === ' ') j++;
          if (!/\d/.test(a)) throw bad();
          align = parseInt(a, 10);
        }
        if (f[j] === ':') {
          j++;
          fmtS = '';
          while (j < n && f[j] !== '}') fmtS += f[j++];
        }
        if (f[j] !== '}') throw bad();
        const k = parseInt(idx, 10);
        if (k >= vals.length) throw rt.ex('FormatException', 'Index (zero based) must be greater than or equal to zero and less than the size of the argument list.');
        let s = kinds[k] === 'str' ? rt.s(vals[k]) : rt.fmt(vals[k], fmtS, kinds[k]);
        if (align) s = rt.align(s, align);
        out += s;
        i = j;
        continue;
      }
      if (c === '}') {
        if (f[i + 1] === '}') { out += '}'; i++; continue; }
        throw bad();
      }
      out += c;
    }
    return out;
  },
  // string.Join helper: items are values of a known kind
  join(sep, items, kind) {
    const parts = [];
    for (const x of items) parts.push(kind === 'str' ? rt.s(x) : rt.fmt(x, null, kind));
    return parts.join(rt.s(sep));
  },

  // ---- characters ---------------------------------------------------------
  isLetter(c) { return /\p{L}/u.test(String.fromCharCode(c)); },
  isDigit(c) { return c >= 48 && c <= 57 || /\p{Nd}/u.test(String.fromCharCode(c)); },
  isUpper(c) { return /\p{Lu}/u.test(String.fromCharCode(c)); },
  isLower(c) { return /\p{Ll}/u.test(String.fromCharCode(c)); },
  isWhiteSpace(c) { return c === 32 || (c >= 9 && c <= 13) || c === 0x85 || c === 0xA0 || /\s/.test(String.fromCharCode(c)); },
  isPunct(c) { return /\p{P}/u.test(String.fromCharCode(c)); },
  isSymbol(c) { return /\p{S}/u.test(String.fromCharCode(c)); },
  isControl(c) { return c < 32 || (c >= 127 && c < 160); },
  isLetterOrDigit(c) { return rt.isLetter(c) || rt.isDigit(c); },
  toUpperC(c) { const s = String.fromCharCode(c).toUpperCase(); return s.length === 1 ? s.charCodeAt(0) : c; },
  toLowerC(c) { const s = String.fromCharCode(c).toLowerCase(); return s.length === 1 ? s.charCodeAt(0) : c; },

  // ---- string methods ----------------------------------------------------
  sIdx(s, i) { if (!(i >= 0 && i < s.length)) throw rt.ioor(); return s.charCodeAt(i); },
  substr1(s, a) {
    if (a < 0) throw rt.ex('ArgumentOutOfRangeException', "StartIndex cannot be less than zero. (Parameter 'startIndex')");
    if (a > s.length) throw rt.ex('ArgumentOutOfRangeException', "startIndex cannot be larger than length of string. (Parameter 'startIndex')");
    return s.substring(a);
  },
  substr2(s, a, n) {
    if (a < 0) throw rt.ex('ArgumentOutOfRangeException', "StartIndex cannot be less than zero. (Parameter 'startIndex')");
    if (a > s.length) throw rt.ex('ArgumentOutOfRangeException', "startIndex cannot be larger than length of string. (Parameter 'startIndex')");
    if (n < 0) throw rt.ex('ArgumentOutOfRangeException', "Length cannot be less than zero. (Parameter 'length')");
    if (a + n > s.length) throw rt.ex('ArgumentOutOfRangeException', "Index and length must refer to a location within the string. (Parameter 'length')");
    return s.substr(a, n);
  },
  remove1(s, a) {
    if (a < 0) throw rt.ex('ArgumentOutOfRangeException', "StartIndex cannot be less than zero. (Parameter 'startIndex')");
    if (a > s.length) throw rt.ex('ArgumentOutOfRangeException', "startIndex must be less than length of string. (Parameter 'startIndex')");
    return s.substring(0, a);
  },
  remove2(s, a, n) {
    if (a < 0 || n < 0 || a + n > s.length) throw rt.ex('ArgumentOutOfRangeException', "Index and count must refer to a location within the string. (Parameter 'count')");
    return s.substring(0, a) + s.substring(a + n);
  },
  insert(s, a, t) {
    if (a < 0 || a > s.length) throw rt.ex('ArgumentOutOfRangeException', "Specified argument was out of the range of valid values. (Parameter 'startIndex')");
    if (t === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 'value')");
    return s.slice(0, a) + t + s.slice(a);
  },
  replace(s, a, b) {
    if (a === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 'oldValue')");
    if (a === '') throw rt.ex('ArgumentException', "The value cannot be an empty string. (Parameter 'oldValue')");
    return s.split(a).join(rt.s(b));
  },
  trimChars(s, chars, start, end) {
    const set = chars && chars.length ? new Set(chars.map((c) => String.fromCharCode(c))) : null;
    const isTrim = set ? (ch) => set.has(ch) : (ch) => rt.isWhiteSpace(ch.charCodeAt(0));
    let a = 0, b = s.length;
    if (start) while (a < b && isTrim(s[a])) a++;
    if (end) while (b > a && isTrim(s[b - 1])) b--;
    return s.slice(a, b);
  },
  split(s, seps, opts, count) {
    // seps: array of strings; opts: 1 = RemoveEmptyEntries, 2 = TrimEntries
    let parts;
    if (!seps || seps.length === 0) seps = [' ', '\t', '\n', '\r', '\v', '\f'];
    if (seps.length === 1) parts = s.split(seps[0]);
    else {
      parts = []; let cur = '';
      outer: for (let i = 0; i < s.length;) {
        for (const sp of seps) {
          if (sp && s.startsWith(sp, i)) { parts.push(cur); cur = ''; i += sp.length; continue outer; }
        }
        cur += s[i]; i++;
      }
      parts.push(cur);
    }
    if (count !== undefined && count !== null && parts.length > count) {
      // rejoin the tail (approximation using the first separator)
      const head = parts.slice(0, count - 1);
      head.push(parts.slice(count - 1).join(seps[0]));
      parts = head;
    }
    if (opts & 2) parts = parts.map((p) => p.trim());
    if (opts & 1) parts = parts.filter((p) => p !== '');
    return rt.arr(parts, 'System.String[]');
  },
  padL(s, n, c) { return s.length >= n ? s : String.fromCharCode(c === undefined ? 32 : c).repeat(n - s.length) + s; },
  padR(s, n, c) { return s.length >= n ? s : s + String.fromCharCode(c === undefined ? 32 : c).repeat(n - s.length); },
  collator: null,
  scmp(a, b) {
    if (a === b) return 0;
    if (a === null) return -1;
    if (b === null) return 1;
    if (!rt.collator) rt.collator = (typeof Intl !== 'undefined') ? new Intl.Collator('en-GB') : { compare: (x, y) => (x < y ? -1 : x > y ? 1 : 0) };
    const r = rt.collator.compare(a, b);
    return r < 0 ? -1 : r > 0 ? 1 : (a < b ? -1 : a > b ? 1 : 0);
  },
  scmpIgnore(a, b) { return rt.scmp(a === null ? null : a.toLowerCase(), b === null ? null : b.toLowerCase()); },
  sEqIgnore(a, b) { return a === b || (a !== null && b !== null && a.toLowerCase() === b.toLowerCase()); },
  ncmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; },
  isNullOrWhiteSpace(s) { return s === null || /^\s*$/.test(s); },
  charsToString(a) { let s = ''; for (const c of a) s += String.fromCharCode(c); return s; },
  strChars(s) { const a = new Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); a.$t = 'System.Char[]'; return a; },
  *strIter(s) { for (let i = 0; i < s.length; i++) yield s.charCodeAt(i); },
  repeatChar(c, n) { return String.fromCharCode(c).repeat(n); },

  // ---- parsing ------------------------------------------------------------
  fmtEx(s) { return rt.ex('FormatException', `The input string '${s}' was not in a correct format.`); },
  parseIntStr(s, kind) {
    if (s === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 's')");
    const t = s.trim();
    if (!/^[+-]?\d+$/.test(t)) throw rt.fmtEx(s);
    const v = Number(t);
    const [lo, hi, nm] = kind === 'long' ? [-9223372036854775808, 9223372036854775807, 'Int64'] : kind === 'byte' ? [0, 255, 'Byte'] : kind === 'short' ? [-32768, 32767, 'Int16'] : [-2147483648, 2147483647, 'Int32'];
    if (v < lo || v > hi) throw rt.ex('OverflowException', `Value was either too large or too small for ${nm === 'Int32' ? 'an' : 'a'} ${nm}.`);
    return v === 0 ? 0 : v;
  },
  parseDoubleStr(s) {
    if (s === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 's')");
    const t = s.trim().replace(/,(?=\d{3}(\D|$))/g, '');
    if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return Number(t);
    if (/^[+-]?(Infinity|∞)$/i.test(t)) return t[0] === '-' ? -Infinity : Infinity;
    if (/^NaN$/i.test(t)) return NaN;
    throw rt.fmtEx(s);
  },
  parseDecStr(s) {
    if (s === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 's')");
    const t = s.trim().replace(/,(?=\d{3}(\D|$))/g, '');
    if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) throw rt.fmtEx(s);
    return Dec.parse(t);
  },
  parseBoolStr(s) {
    if (s === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 'value')");
    const t = s.trim().toLowerCase();
    if (t === 'true') return true;
    if (t === 'false') return false;
    throw rt.ex('FormatException', `String '${s}' was not recognized as a valid Boolean.`);
  },
  parseCharStr(s) {
    if (s === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 's')");
    if (s.length !== 1) throw rt.ex('FormatException', 'String must be exactly one character long.');
    return s.charCodeAt(0);
  },
  tryParse(fn, s) { try { return { ok: true, v: fn(s) }; } catch (e) { if (e instanceof CsObject) return { ok: false }; throw e; } },
  parseDateStr(s) {
    if (s === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 's')");
    const r = parseDate(s);
    if (!r) throw rt.ex('FormatException', `String '${s}' was not recognized as a valid DateTime.`);
    return r;
  },
  parseDateExact(s, f) {
    if (s === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 's')");
    const r = parseDateExact(s, f);
    if (!r) throw rt.ex('FormatException', `String '${s}' was not recognized as a valid DateTime.`);
    return r;
  },
  // Convert.ToInt32(double) rounds to even
  roundEven(x) {
    const r = Math.round(x);
    if (Math.abs(x % 1) === 0.5) return 2 * Math.round(x / 2);
    return r;
  },
  mathRound(x, n, mode) {
    if (n === undefined) n = 0;
    if (n < 0 || n > 15) throw rt.ex('ArgumentOutOfRangeException', "Rounding digits must be between 0 and 15, inclusive. (Parameter 'digits')");
    const p = Math.pow(10, n);
    let v = n ? x * p : x;
    if (!isFinite(v)) return x;
    if (mode === 1) { // AwayFromZero
      const fr = v % 1;
      v = Math.trunc(v);
      if (Math.abs(fr) >= 0.5) v += Math.sign(fr);
    } else if (mode === 2) v = Math.trunc(v); // ToZero
    else if (mode === 3) v = Math.floor(v); // ToNegativeInfinity
    else if (mode === 4) v = Math.ceil(v);
    else v = rt.roundEven(v);
    return n ? v / p : v;
  },
  decRound(d, n, mode) {
    const m = mode === 1 ? 'away' : mode === 2 ? 'trunc' : mode === 3 ? 'floor' : mode === 4 ? 'ceil' : 'even';
    return Dec.round(d, n || 0, m);
  },

  // ---- arrays -------------------------------------------------------------
  arr(a, t) { a.$t = t; return a; },
  newArr(n, fill, t) {
    if (n < 0) throw rt.ex('OverflowException', 'Arithmetic operation resulted in an overflow.');
    const a = new Array(n);
    for (let i = 0; i < n; i++) a[i] = fill;
    a.$t = t;
    return a;
  },
  newArrF(n, mk, t) { // fill using a factory (e.g. decimal zero)
    const a = new Array(n);
    for (let i = 0; i < n; i++) a[i] = mk();
    a.$t = t; return a;
  },
  newArr2(d0, d1, fill, t) {
    if (d0 < 0 || d1 < 0) throw rt.ex('OverflowException', 'Arithmetic operation resulted in an overflow.');
    return new CsArray2(d0, d1, fill, t);
  },
  arr2From(rows, t) {
    const d0 = rows.length, d1 = d0 ? rows[0].length : 0;
    const a = new CsArray2(d0, d1, null, t);
    for (let i = 0; i < d0; i++) {
      if (rows[i].length !== d1) throw new CompileError('An array initializer of length ' + d1 + ' is expected', 0);
      for (let j = 0; j < d1; j++) a.a[i * d1 + j] = rows[i][j];
    }
    return a;
  },
  ag(a, i) { if (i >>> 0 >= a.length || i !== (i | 0)) throw rt.ioor(); return a[i]; },
  as(a, i, v) { if (i >>> 0 >= a.length || i !== (i | 0)) throw rt.ioor(); return (a[i] = v); },
  ag2(a, i, j) { if (i >>> 0 >= a.d0 || j >>> 0 >= a.d1) throw rt.ioor(); return a.a[i * a.d1 + j]; },
  as2(a, i, j, v) { if (i >>> 0 >= a.d0 || j >>> 0 >= a.d1) throw rt.ioor(); return (a.a[i * a.d1 + j] = v); },
  getLength(a, d) {
    if (a instanceof CsArray2) { if (d === 0) return a.d0; if (d === 1) return a.d1; throw rt.ioor(); }
    if (d !== 0) throw rt.ioor();
    return a.length;
  },
  arrLen(a) { return a.length; },
  arrRank(a) { return a instanceof CsArray2 ? 2 : 1; },
  *iter2(a) { if (a === null) throw rt.nre(); for (let i = 0; i < a.a.length; i++) yield a.a[i]; },
  arrIndexOf(a, v, eq) { for (let i = 0; i < a.length; i++) if (eq ? eq(a[i], v) : a[i] === v) return i; return -1; },
  arrCopy(src, si, dst, di, n) {
    if (n === undefined) { n = si; si = 0; di = 0; dst = arguments[1]; }
    if (si < 0 || di < 0 || n < 0 || si + n > src.length || di + n > dst.length) throw rt.ex('ArgumentException', 'Destination array was not long enough. Check the destination index, length, and the array\'s lower bounds.');
    const tmp = src.slice(si, si + n);
    for (let i = 0; i < n; i++) dst[di + i] = tmp[i];
  },
  arrClone(a) { if (a instanceof CsArray2) { const b = new CsArray2(a.d0, a.d1, null, a.$t); b.a = a.a.slice(); return b; } const b = a.slice(); b.$t = a.$t; return b; },
  arrResize(ref, n) {
    const old = ref.g() || [];
    const a = old.slice(0, n);
    while (a.length < n) a.push(ref.def);
    a.$t = old.$t;
    ref.s(a);
  },
  arrFill(a, v) { for (let i = 0; i < a.length; i++) a[i] = v; },
  arrReverse(a, start, n) {
    if (start === undefined) { a.reverse(); return; }
    const part = a.slice(start, start + n).reverse();
    for (let i = 0; i < n; i++) a[start + i] = part[i];
  },

  // ---- sorting ------------------------------------------------------------
  // generic stable merge sort driven by a generator comparison function
  *sortG(a, cmp) {
    const n = a.length;
    if (n < 2) return;
    // insertion sort for small arrays (stable, like .NET for <= 16 items)
    if (n <= 16) {
      for (let i = 1; i < n; i++) {
        const x = a[i]; let j = i - 1;
        while (j >= 0 && (yield* cmp(a[j], x)) > 0) { a[j + 1] = a[j]; j--; }
        a[j + 1] = x;
      }
      return;
    }
    const tmp = new Array(n);
    for (let w = 1; w < n; w *= 2) {
      for (let lo = 0; lo < n; lo += 2 * w) {
        const mid = Math.min(lo + w, n), hi = Math.min(lo + 2 * w, n);
        let i = lo, j = mid, k = lo;
        while (i < mid && j < hi) tmp[k++] = ((yield* cmp(a[i], a[j])) <= 0) ? a[i++] : a[j++];
        while (i < mid) tmp[k++] = a[i++];
        while (j < hi) tmp[k++] = a[j++];
      }
      for (let i = 0; i < n; i++) a[i] = tmp[i];
    }
  },
  sortPrim(a, kind) {
    if (kind === 'string') a.sort((x, y) => rt.scmp(x, y));
    else if (kind === 'decimal') a.sort((x, y) => Dec.cmp(x, y));
    else if (kind === 'date' || kind === 'timespan') a.sort((x, y) => x.ms - y.ms);
    else if (kind === 'bool') a.sort((x, y) => (x === y ? 0 : x ? 1 : -1));
    else a.sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
  },
  *defaultCmp(x, y) {
    if (x === y) return 0;
    if (x === null) return -1;
    if (y === null) return 1;
    if (typeof x === 'string') return rt.scmp(x, y);
    if (typeof x === 'number') return x < y ? -1 : x > y ? 1 : 0;
    if (typeof x === 'boolean') return x ? 1 : -1;
    if (x instanceof Dec) return Dec.cmp(x, y);
    if (x instanceof CsDateTime || x instanceof CsTimeSpan) return x.ms < y.ms ? -1 : x.ms > y.ms ? 1 : 0;
    if (x.$cmp) return yield* x.$cmp(y);
    throw rt.ex('InvalidOperationException', 'Failed to compare two elements in the array.');
  },

  // ---- List<T> --------------------------------------------------------------
  lg(l, i) {
    if (i >>> 0 >= l.a.length || i !== (i | 0)) throw rt.ex('ArgumentOutOfRangeException', "Index was out of range. Must be non-negative and less than the size of the collection. (Parameter 'index')");
    return l.a[i];
  },
  ls(l, i, v) {
    if (i >>> 0 >= l.a.length || i !== (i | 0)) throw rt.ex('ArgumentOutOfRangeException', "Index was out of range. Must be non-negative and less than the size of the collection. (Parameter 'index')");
    l.v++;
    return (l.a[i] = v);
  },
  ladd(l, v) { l.a.push(v); l.v++; },
  laddRange(l, items) { if (items === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 'collection')"); const arr = rt.toArr(items); for (const x of arr) l.a.push(x); l.v++; },
  linsert(l, i, v) {
    if (i < 0 || i > l.a.length) throw rt.ex('ArgumentOutOfRangeException', "Index must be within the bounds of the List. (Parameter 'index')");
    l.a.splice(i, 0, v); l.v++;
  },
  lremoveAt(l, i) {
    if (i >>> 0 >= l.a.length) throw rt.ex('ArgumentOutOfRangeException', "Index was out of range. Must be non-negative and less than the size of the collection. (Parameter 'index')");
    l.a.splice(i, 1); l.v++;
  },
  lremoveRange(l, i, n) {
    if (i < 0 || n < 0 || i + n > l.a.length) throw rt.ex('ArgumentException', 'Offset and length were out of bounds for the array or count is greater than the number of elements from index to the end of the source collection.');
    l.a.splice(i, n); l.v++;
  },
  lindexOf(l, v, eq) { const a = l.a; for (let i = 0; i < a.length; i++) if (eq ? eq(a[i], v) : a[i] === v) return i; return -1; },
  llastIndexOf(l, v, eq) { const a = l.a; for (let i = a.length - 1; i >= 0; i--) if (eq ? eq(a[i], v) : a[i] === v) return i; return -1; },
  lremove(l, v, eq) { const i = rt.lindexOf(l, v, eq); if (i < 0) return false; l.a.splice(i, 1); l.v++; return true; },
  lclear(l) { l.a.length = 0; l.v++; },
  *liter(l) {
    if (l === null) throw rt.nre();
    const v = l.v, a = l.a;
    for (let i = 0; i < a.length; i++) {
      yield a[i];
      if (l.v !== v) throw rt.ex('InvalidOperationException', 'Collection was modified; enumeration operation may not execute.');
    }
  },
  lfirst(l, what) {
    if (l.a.length === 0) throw rt.ex('InvalidOperationException', 'Sequence contains no elements');
    return what === 'last' ? l.a[l.a.length - 1] : l.a[0];
  },
  toArr(x) {
    if (x === null) throw rt.nre();
    if (Array.isArray(x)) return x;
    if (x instanceof CsList || x instanceof CsQueue || x instanceof CsStack) return x.a;
    if (x instanceof CsArray2) return x.a;
    if (x instanceof CsHashSet) return Array.from(x.m);
    if (x instanceof CsDict) return Array.from(x.m.values()).map((e) => new CsKVP(e[0], e[1]));
    if (typeof x === 'string') return rt.strChars(x);
    return Array.from(x);
  },
  eqv(a, b) {
    // value equality used by Contains/IndexOf/Distinct for builtin types
    if (a === b) return true;
    if (a instanceof Dec && b instanceof Dec) return Dec.cmp(a, b) === 0;
    if (a instanceof CsDateTime && b instanceof CsDateTime) return a.ms === b.ms;
    if (a instanceof CsTimeSpan && b instanceof CsTimeSpan) return a.ms === b.ms;
    if (a instanceof CsChar && b instanceof CsChar) return a.c === b.c;
    return a !== a && b !== b; // NaN equals NaN in Equals()
  },
  *eqG(a, b) {
    // Equals() honouring user overrides
    if (a === b) return true;
    if (a === null || b === null || a === undefined || b === undefined) return false;
    if (a instanceof CsObject && a.$cls) return !!(yield* a.M$Equals$object(b));
    return rt.eqv(a, b);
  },

  // ---- Dictionary -------------------------------------------------------------
  dget(d, k) {
    if (k === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 'key')");
    const e = d.m.get(mapKey(k));
    if (e === undefined) throw rt.ex('KeyNotFoundException', `The given key '${rt.strSync(k instanceof Dec ? k : (typeof k === 'number' && d.kch) ? new CsChar(k) : k)}' was not present in the dictionary.`);
    return e[1];
  },
  dset(d, k, v) {
    if (k === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 'key')");
    const mk = mapKey(k);
    const e = d.m.get(mk);
    if (e) e[1] = v; else { d.m.set(mk, [k, v]); d.v++; }
    return v;
  },
  dadd(d, k, v) {
    if (k === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 'key')");
    const mk = mapKey(k);
    if (d.m.has(mk)) throw rt.ex('ArgumentException', `An item with the same key has already been added. Key: ${rt.strSync(typeof k === 'number' && d.kch ? new CsChar(k) : k)}`);
    d.m.set(mk, [k, v]); d.v++;
  },
  dtryAdd(d, k, v) { const mk = mapKey(k); if (d.m.has(mk)) return false; d.m.set(mk, [k, v]); d.v++; return true; },
  dhas(d, k) { if (k === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 'key')"); return d.m.has(mapKey(k)); },
  dhasValue(d, v) { for (const e of d.m.values()) if (rt.eqv(e[1], v)) return true; return false; },
  dremove(d, k) { const r = d.m.delete(mapKey(k)); if (r) d.v++; return r; },
  dtryGet(d, k) { const e = d.m.get(mapKey(k)); return e === undefined ? undefined : e[1]; },
  dclear(d) { d.m.clear(); d.v++; },
  dkeys(d, t) { const l = new CsList(Array.from(d.m.values(), (e) => e[0]), t); return l; },
  dvalues(d, t) { const l = new CsList(Array.from(d.m.values(), (e) => e[1]), t); return l; },
  *diter(d) {
    if (d === null) throw rt.nre();
    const v = d.v;
    for (const e of d.m.values()) {
      yield new CsKVP(e[0], e[1]);
      if (d.v !== v) throw rt.ex('InvalidOperationException', 'Collection was modified; enumeration operation may not execute.');
    }
  },
  *hiter(h) {
    if (h === null) throw rt.nre();
    const v = h.v;
    for (const e of h.m.values()) {
      yield e;
      if (h.v !== v) throw rt.ex('InvalidOperationException', 'Collection was modified; enumeration operation may not execute.');
    }
  },
  *anyIter(x) {
    // foreach over a value whose static type is IEnumerable/object
    if (x === null || x === undefined) throw rt.nre();
    if (x instanceof CsList || x instanceof CsQueue) { yield* rt.liter(x); return; }
    if (x instanceof CsStack) { for (let i = x.a.length - 1; i >= 0; i--) yield x.a[i]; return; }
    if (x instanceof CsDict) { yield* rt.diter(x); return; }
    if (x instanceof CsHashSet) { yield* rt.hiter(x); return; }
    if (x instanceof CsArray2) { yield* x.a; return; }
    if (typeof x === 'string') { yield* rt.strIter(x); return; }
    yield* x;
  },

  // ---- StringBuilder ----------------------------------------------------------
  sbRemove(sb, a, n) {
    if (a < 0 || n < 0 || a + n > sb.s.length) throw rt.ex('ArgumentOutOfRangeException', "Index was out of range. Must be non-negative and less than the size of the collection. (Parameter 'startIndex')");
    sb.s = sb.s.slice(0, a) + sb.s.slice(a + n); return sb;
  },
  sbInsert(sb, a, t) {
    if (a < 0 || a > sb.s.length) throw rt.ex('ArgumentOutOfRangeException', "Index was out of range. Must be non-negative and less than the size of the collection. (Parameter 'index')");
    sb.s = sb.s.slice(0, a) + t + sb.s.slice(a); return sb;
  },
  sbIdx(sb, i) { if (!(i >= 0 && i < sb.s.length)) throw rt.ex('IndexOutOfRangeException', 'Index was outside the bounds of the array.'); return sb.s.charCodeAt(i); },
  sbSet(sb, i, c) { if (!(i >= 0 && i < sb.s.length)) throw rt.ex('IndexOutOfRangeException', 'Index was outside the bounds of the array.'); sb.s = sb.s.slice(0, i) + String.fromCharCode(c) + sb.s.slice(i + 1); return c; },

  // ---- Files ------------------------------------------------------------------
  files() { return rt.ctx.files; },
  checkPath(p) {
    if (p === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 'path')");
    if (p === '') throw rt.ex('ArgumentException', "The value cannot be an empty string. (Parameter 'path')");
    return p;
  },
  checkLocked(p) {
    if (rt.openWriters.has(p)) throw rt.ex('IOException', `The process cannot access the file '${p}' because it is being used by another process.`);
  },
  fileRead(p) {
    rt.checkPath(p);
    rt.checkLocked(p);
    const f = rt.ctx.files;
    if (!Object.prototype.hasOwnProperty.call(f, p)) throw rt.ex('FileNotFoundException', `Could not find file '${p}'.`);
    return String(f[p]);
  },
  fileLines(p) {
    const t = rt.fileRead(p);
    if (t === '') return rt.arr([], 'System.String[]');
    const lines = t.split(/\r\n|\n|\r/);
    if (lines[lines.length - 1] === '') lines.pop();
    return rt.arr(lines, 'System.String[]');
  },
  fileWrite(p, s, append) {
    rt.checkPath(p);
    rt.checkLocked(p);
    const f = rt.ctx.files;
    f[p] = append && Object.prototype.hasOwnProperty.call(f, p) ? String(f[p]) + s : s;
  },
  linesText(lines) {
    const a = rt.toArr(lines);
    let s = '';
    for (const x of a) s += rt.s(x) + '\n';
    return s;
  },
  fileExists(p) { return p !== null && Object.prototype.hasOwnProperty.call(rt.ctx.files, p); },
  fileDelete(p) { rt.checkPath(p); rt.checkLocked(p); delete rt.ctx.files[p]; },
  fileCopy(a, b, over) {
    const t = rt.fileRead(a);
    if (!over && rt.fileExists(b)) throw rt.ex('IOException', `The file '${b}' already exists.`);
    rt.ctx.files[b] = t;
  },
  newWriter(p, append) {
    rt.checkPath(p); rt.checkLocked(p);
    const w = new CsStreamWriter(rt.ctx.files, p, append);
    rt.openWriters.add(p);
    return w;
  },
  newReader(p) { return new CsStreamReader(rt.fileRead(p)); },
  dispose(o) {
    if (o === null || o === undefined) return;
    if (o instanceof CsStreamWriter) o.close();
    else if (o instanceof CsStreamReader) o.closed = true;
  },

  // ---- objects / casts ------------------------------------------------------------
  cast(v, C, from, to) {
    if (v === null || v instanceof C) return v;
    throw rt.ex('InvalidCastException', `Unable to cast object of type '${typeShortName(v)}' to type '${to}'.`);
  },
  castIface(v, name, to) {
    if (v === null || (v.$ifaces && v.$ifaces.has(name))) return v;
    throw rt.ex('InvalidCastException', `Unable to cast object of type '${typeShortName(v)}' to type '${to}'.`);
  },
  isIface(v, name) { return v !== null && v !== undefined && !!v.$ifaces && v.$ifaces.has(name); },
  unbox(v, kind, to) {
    if (v === null || v === undefined) throw rt.nre();
    let ok = false;
    switch (kind) {
      case 'int': case 'long': case 'short': case 'byte': ok = typeof v === 'number' && Number.isInteger(v); break;
      case 'double': case 'float': ok = typeof v === 'number'; break;
      case 'bool': ok = typeof v === 'boolean'; break;
      case 'char': if (v instanceof CsChar) return v.c; break;
      case 'decimal': ok = v instanceof Dec; break;
      case 'string': ok = typeof v === 'string'; break;
      case 'date': ok = v instanceof CsDateTime; break;
      default: ok = true;
    }
    if (!ok) throw rt.ex('InvalidCastException', `Unable to cast object of type '${typeShortName(v)}' to type '${to}'.`);
    return v;
  },
  isKind(v, kind) {
    if (v === null || v === undefined) return false;
    switch (kind) {
      case 'int': return typeof v === 'number' && Number.isInteger(v) && Math.abs(v) <= 2147483648;
      case 'long': return typeof v === 'number' && Number.isInteger(v);
      case 'double': case 'float': return typeof v === 'number';
      case 'bool': return typeof v === 'boolean';
      case 'char': return v instanceof CsChar;
      case 'string': return typeof v === 'string';
      case 'decimal': return v instanceof Dec;
      case 'object': return true;
      default: return false;
    }
  },
  typeOf(v) {
    if (v === null || v === undefined) throw rt.nre();
    const full = typeFullName(v);
    let t = rt.types.get(full);
    if (!t) { t = new CsType(typeShortName(v), full); rt.types.set(full, t); }
    return t;
  },
  typeObj(name, full) {
    let t = rt.types.get(full);
    if (!t) { t = new CsType(name, full); rt.types.set(full, t); }
    return t;
  },
  enumName(names, v) { const n = names[v]; return n === undefined ? String(v) : n; },
  // a reference to a variable for ref/out arguments
  ref(g, s) { return { g, s }; },

  // ---- Console --------------------------------------------------------------
  color: undefined,
  write(s) { rt.ctx.write(s, rt.color); },
  keyInfo(k) {
    const C = rt.C.ConsoleKeyInfo;
    const o = new C();
    let key = k && k.key !== undefined ? String(k.key) : '';
    let ch = k && k.keyChar !== undefined && k.keyChar !== null ? String(k.keyChar) : '';
    const names = rt.consoleKeys;
    if (names[key] === undefined) {
      // derive a key name from the character if the UI didn't give a valid one
      if (ch.length === 1) {
        const c = ch.toUpperCase();
        if (/[A-Z]/.test(c)) key = c;
        else if (/[0-9]/.test(c)) key = 'D' + c;
        else if (c === ' ') key = 'Spacebar';
        else if (c === '\r' || c === '\n') key = 'Enter';
        else if (c === '\b') key = 'Backspace';
        else key = 'Oem1';
      }
    }
    if (ch === '' && key === 'Enter') ch = '\r';
    if (ch === '' && key === 'Backspace') ch = '\b';
    if (ch === '' && key === 'Spacebar') ch = ' ';
    if (ch === '' && key === 'Tab') ch = '\t';
    if (ch === '' && key === 'Escape') ch = '\x1b';
    o.p$ConsoleKeyInfo$Key = names[key] !== undefined ? names[key] : 0;
    o.p$ConsoleKeyInfo$KeyChar = ch ? ch.charCodeAt(0) : 0;
    return o;
  },
  consoleKeys: null,

  // ---- misc --------------------------------------------------------------------
  hash: hashOf,
  sha256,
  utf8Bytes,
  utf8Decode,
  fmtDate,
  nowDate,
  utcMs,
  daysInMonth,
  isLeap,
  fmtNumber,
  numToString,
  typeFullName,
  typeShortName,
  hex(bytes, lower, dashes) {
    const a = rt.toArr(bytes);
    let parts = a.map((b) => { let h = (b & 0xFF).toString(16); if (h.length < 2) h = '0' + h; return lower ? h : h.toUpperCase(); });
    return parts.join(dashes ? '-' : '');
  },
  base64(bytes) {
    const a = rt.toArr(bytes);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let out = '';
    for (let i = 0; i < a.length; i += 3) {
      const b0 = a[i], b1 = a[i + 1], b2 = a[i + 2];
      out += chars[b0 >> 2] + chars[((b0 & 3) << 4) | ((b1 || 0) >> 4)];
      out += i + 1 < a.length ? chars[((b1 & 15) << 2) | ((b2 || 0) >> 6)] : '=';
      out += i + 2 < a.length ? chars[b2 & 63] : '=';
    }
    return out;
  },
};


// ===========================================================================
// 6. Static types
// ===========================================================================

const T = {};
['int', 'long', 'short', 'byte', 'sbyte', 'uint', 'ulong', 'ushort', 'double', 'float', 'decimal', 'bool', 'char',
  'string', 'object', 'void', 'null'].forEach((n) => { T[n] = { k: n }; });
T.lambda = { k: 'lambda' };
T.var = { k: 'var' };

const TYPE_ALIASES = {
  Int32: 'int', Int64: 'long', Int16: 'short', Byte: 'byte', SByte: 'sbyte', UInt32: 'uint', UInt64: 'ulong',
  UInt16: 'ushort', Double: 'double', Single: 'float', Decimal: 'decimal', Boolean: 'bool', Char: 'char',
  String: 'string', Object: 'object',
};
const NUMERIC = new Set(['sbyte', 'byte', 'short', 'ushort', 'int', 'uint', 'long', 'ulong', 'char', 'float', 'double', 'decimal']);
const INTEGRAL = new Set(['sbyte', 'byte', 'short', 'ushort', 'int', 'uint', 'long', 'ulong', 'char']);
const SMALL_INT = new Set(['sbyte', 'byte', 'short', 'ushort', 'char']);
const IMPLICIT_NUM = {
  sbyte: ['short', 'int', 'long', 'float', 'double', 'decimal'],
  byte: ['short', 'ushort', 'int', 'uint', 'long', 'ulong', 'float', 'double', 'decimal'],
  short: ['int', 'long', 'float', 'double', 'decimal'],
  ushort: ['int', 'uint', 'long', 'ulong', 'float', 'double', 'decimal'],
  int: ['long', 'float', 'double', 'decimal'],
  uint: ['long', 'ulong', 'float', 'double', 'decimal'],
  long: ['float', 'double', 'decimal'],
  ulong: ['float', 'double', 'decimal'],
  char: ['ushort', 'int', 'uint', 'long', 'ulong', 'float', 'double', 'decimal'],
  float: ['double'],
};
const NUM_RANK = { sbyte: 1, byte: 1, short: 2, ushort: 2, char: 2, int: 3, uint: 3, long: 4, ulong: 4, float: 5, double: 6, decimal: 7 };
const INT_RANGE = { sbyte: [-128, 127], byte: [0, 255], short: [-32768, 32767], ushort: [0, 65535], int: [-2147483648, 2147483647],
  uint: [0, 4294967295], long: [-9223372036854775808, 9223372036854775807], ulong: [0, 18446744073709551615], char: [0, 65535] };

const BI = {};
['StringBuilder', 'Random', 'DateTime', 'TimeSpan', 'StreamWriter', 'StreamReader', 'SHA256', 'Encoding', 'CultureInfo',
  'Type', 'Stopwatch'].forEach((n) => { BI[n] = { k: 'bi', n }; });
const VALUE_BI = new Set(['DateTime', 'TimeSpan']);
const STATIC_BI = new Set(['Console', 'Math', 'Convert', 'File', 'Array', 'Environment', 'Thread', 'BitConverter', 'Enum', 'Char', 'Path', 'Directory', 'MathF', 'Task']);
const GENERIC_BI = { List: 1, Dictionary: 2, HashSet: 1, Queue: 1, Stack: 1, KeyValuePair: 2, IEnumerable: 1, Predicate: 1, Comparison: 1 };
const IGNORED_IFACES = new Set(['IComparable', 'IEquatable', 'IDisposable', 'ICloneable', 'IComparer', 'IEqualityComparer', 'IFormattable']);
const KNOWN_NS = new Set(['System', 'System.IO', 'System.Collections', 'System.Collections.Generic', 'System.Text', 'System.Linq',
  'System.Security', 'System.Security.Cryptography', 'System.Globalization', 'System.Threading', 'System.Diagnostics', 'System.Threading.Tasks']);

function gen(n, a) { return { k: 'gen', n, a }; }
function arrT(el, rank) { return { k: 'array', el, rank: rank || 1 }; }
function nullableT(t) { return { k: 'nullable', of: t }; }
function funcT(params, ret) { return { k: 'gen', n: 'Func', a: params.concat([ret]), fn: true, params, ret }; }

function tyStr(t) {
  if (!t) return '?';
  switch (t.k) {
    case 'gen':
      if (t.n === 'Func' || t.n === 'Action') return t.n + (t.a.length ? '<' + t.a.map(tyStr).join(', ') + '>' : '');
      return t.n + '<' + t.a.map(tyStr).join(', ') + '>';
    case 'array': return tyStr(t.el) + '[' + ','.repeat(t.rank - 1) + ']';
    case 'class': case 'enum': return t.c.name;
    case 'bi': return t.n;
    case 'nullable': return tyStr(t.of) + '?';
    case 'null': return '<null>';
    case 'lambda': return 'lambda expression';
    case 'mgroup': return 'method group';
    case 'static': return t.n;
    default: return t.k;
  }
}
function tyKey(t) { return tyStr(t).replace(/[^A-Za-z0-9_]/g, (c) => (c === '[' ? 'A' : '_')); }
function tyEq(a, b) {
  if (a === b) return true;
  if (!a || !b || a.k !== b.k) return false;
  switch (a.k) {
    case 'gen': return a.n === b.n && a.a.length === b.a.length && a.a.every((x, i) => tyEq(x, b.a[i]));
    case 'array': return a.rank === b.rank && tyEq(a.el, b.el);
    case 'class': case 'enum': return a.c === b.c;
    case 'bi': case 'static': return a.n === b.n;
    case 'nullable': return tyEq(a.of, b.of);
    default: return true;
  }
}
function isNum(t) { return NUMERIC.has(t.k); }
function isIntegral(t) { return INTEGRAL.has(t.k); }
function isRefType(t) {
  switch (t.k) {
    case 'string': case 'object': case 'array': case 'null': case 'nullable': return true;
    case 'class': return !t.c.isStruct;
    case 'gen': return t.n !== 'KeyValuePair';
    case 'bi': return !VALUE_BI.has(t.n);
    default: return false;
  }
}
function isValueType(t) { return !isRefType(t) && t.k !== 'void' && t.k !== 'lambda' && t.k !== 'mgroup'; }
function isDelegate(t) { return t.k === 'gen' && (t.n === 'Func' || t.n === 'Action' || t.n === 'Predicate' || t.n === 'Comparison'); }
// parameter types / return type of a delegate type
function delegateSig(t) {
  switch (t.n) {
    case 'Func': return { params: t.a.slice(0, -1), ret: t.a[t.a.length - 1] };
    case 'Action': return { params: t.a, ret: T.void };
    case 'Predicate': return { params: [t.a[0]], ret: T.bool };
    case 'Comparison': return { params: [t.a[0], t.a[0]], ret: T.int };
  }
  return null;
}
// element type when iterating with foreach
function elemType(t) {
  switch (t.k) {
    case 'array': return t.el;
    case 'string': return T.char;
    case 'gen':
      if (t.n === 'Dictionary') return gen('KeyValuePair', t.a);
      if (['List', 'HashSet', 'Queue', 'Stack', 'IEnumerable'].includes(t.n)) return t.a[0];
  }
  return null;
}
function defaultValueCode(t) {
  switch (t.k) {
    case 'int': case 'long': case 'short': case 'byte': case 'sbyte': case 'uint': case 'ulong': case 'ushort':
    case 'double': case 'float': case 'char': case 'enum': return '0';
    case 'bool': return 'false';
    case 'decimal': return '$Dec0';
    case 'bi': if (t.n === 'DateTime') return '$DTmin'; if (t.n === 'TimeSpan') return '$TS0'; return 'null';
    case 'gen': if (t.n === 'KeyValuePair') return `new $rt.CsKVP(${defaultValueCode(t.a[0])}, ${defaultValueCode(t.a[1])})`; return 'null';
    default: return 'null';
  }
}
// Kind string used by $rt.fmt
function fmtKind(t) {
  if (isNum(t) || t.k === 'bool' || t.k === 'string') return t.k;
  if (t.k === 'bi' && t.n === 'DateTime') return 'date';
  if (t.k === 'bi' && t.n === 'TimeSpan') return 'timespan';
  return 'obj';
}
function arrTypeName(el, rank) {
  const n = (t) => {
    if (PRIM_FULL[t.k]) return PRIM_FULL[t.k];
    if (t.k === 'class' || t.k === 'enum') return t.c.full;
    if (t.k === 'array') return n(t.el) + '[' + ','.repeat(t.rank - 1) + ']';
    if (t.k === 'bi') return (t.n === 'StringBuilder' ? 'System.Text.' : 'System.') + t.n;
    if (t.k === 'gen') return 'System.Collections.Generic.' + t.n + '`' + t.a.length + '[' + t.a.map(n).join(',') + ']';
    return 'System.Object';
  };
  return n(el) + '[' + ','.repeat((rank || 1) - 1) + ']';
}
function genTypeArgName(t) {
  if (PRIM_FULL[t.k]) return PRIM_FULL[t.k];
  if (t.k === 'class' || t.k === 'enum') return t.c.full;
  if (t.k === 'array') return arrTypeName(t.el, t.rank);
  return 'System.' + tyStr(t);
}

// ===========================================================================
// 7. Compiler: declarations
// ===========================================================================

class ClassInfo {
  constructor(decl, system) {
    this.decl = decl;
    this.name = decl.name;
    this.ns = decl.ns || '';
    this.full = (this.ns ? this.ns + '.' : '') + decl.name;
    this.kind = decl.k === 'Enum' ? 'enum' : decl.k === 'Interface' ? 'interface' : 'class';
    this.system = !!system;
    this.isAbstract = decl.mods.has('abstract') || this.kind === 'interface';
    this.isStatic = decl.mods.has('static');
    this.isSealed = decl.mods.has('sealed');
    this.base = null;
    this.ifaces = [];
    this.fields = new Map();
    this.props = new Map();
    this.methods = new Map();
    this.ctors = [];
    this.js = 'C$' + (decl.outer ? decl.outer + '$' : '') + decl.name;
    this.line = decl.line;
    this.outerName = decl.outer || null;
    this.outer = null;
    this.ty = this.kind === 'enum' ? { k: 'enum', c: this } : { k: 'class', c: this };
    this.enumVals = null;
  }
}

function accessOf(mods, dflt) {
  if (mods.has('public')) return 'public';
  if (mods.has('protected')) return mods.has('internal') ? 'public' : (mods.has('private') ? 'private' : 'protected');
  if (mods.has('internal')) return 'public';
  if (mods.has('private')) return 'private';
  return dflt;
}

class Compiler {
  constructor() {
    this.types = new Map();
    this.classes = [];
    this.hoisted = [];
    this.hoistMap = new Map();
    this.errors = [];
    this.tmpN = 0;
  }

  err(msg, line) { throw new CompileError(msg, line); }

  // collect an error and carry on with the next member
  guard(fn) {
    try { fn(); } catch (e) {
      if (e instanceof CompileError) { this.errors.push({ message: e.csMessage, line: e.line }); if (this.errors.length > 20) throw e; }
      else throw e;
    }
  }

  hoist(code) {
    let n = this.hoistMap.get(code);
    if (!n) { n = '$k' + this.hoisted.length; this.hoisted.push(`const ${n} = ${code};`); this.hoistMap.set(code, n); }
    return n;
  }

  // ---------------------------------------------------------------- type resolution
  lookupType(name) {
    return this.types.get(name) || null;
  }

  resolveType(ta, allowVoid) {
    let name = ta.name;
    const line = ta.line;
    let t;
    if (name.includes('.')) {
      const parts = name.split('.');
      const last = parts[parts.length - 1];
      const prefix = parts.slice(0, -1).join('.');
      if (KNOWN_NS.has(prefix) || this.userNs.has(prefix) || this.types.has(parts[0])) name = last;
      else this.err(`The type or namespace name '${parts[0]}' could not be found (are you missing a using directive or an assembly reference?)`, line);
    }
    if (name === 'var' && !this.types.has('var')) {
      if (ta.args || ta.ranks.length) this.err("The contextual keyword 'var' may only appear within a local variable declaration", line);
      return T.var;
    }
    if (name === 'dynamic') unsupported("'dynamic'", line);
    if (TYPE_ALIASES[name] && !this.types.has(name)) name = TYPE_ALIASES[name];
    if (T[name] && PREDEF_TYPES.has(name)) {
      if (name === 'void' && !allowVoid) this.err("Keyword 'void' cannot be used in this context", line);
      if (ta.args) this.err(`The non-generic type '${name}' cannot be used with type arguments`, line);
      t = T[name];
    } else if (this.types.has(name) && !ta.args) {
      const c = this.types.get(name);
      t = c.ty;
    } else if (GENERIC_BI[name] !== undefined || name === 'Func' || name === 'Action') {
      const args = (ta.args || []).map((a) => this.resolveType(a));
      if (name === 'Func') {
        if (!args.length) this.err("Using the generic type 'Func<TResult>' requires 1 type arguments", line);
        t = gen('Func', args);
      } else if (name === 'Action') t = gen('Action', args);
      else {
        const n = GENERIC_BI[name];
        if (args.length !== n) {
          const ps = { 1: '<T>', 2: name === 'KeyValuePair' || name === 'Dictionary' ? '<TKey, TValue>' : '<T1, T2>' }[n];
          this.err(`Using the generic type '${name}${ps}' requires ${n} type arguments`, line);
        }
        args.forEach((a) => { if (a.k === 'void') this.err("Keyword 'void' cannot be used in this context", line); });
        t = gen(name, args);
      }
    } else if (BI[name] && !ta.args) {
      t = BI[name];
    } else if (STATIC_BI.has(name)) {
      this.err(`Cannot declare a variable of static type '${name}'`, line);
    } else if (['IList', 'ICollection', 'IReadOnlyList', 'IDictionary', 'LinkedList', 'SortedList', 'SortedDictionary', 'ArrayList', 'Hashtable', 'Tuple', 'ValueTuple', 'Task', 'Span', 'Nullable', 'Lazy', 'IComparer'].includes(name)) {
      unsupported(`'${name}'`, line);
    } else {
      const shown = name + (ta.args ? '<' + ta.args.map((a) => a.name).join(', ') + '>' : '');
      this.err(`The type or namespace name '${shown}' could not be found (are you missing a using directive or an assembly reference?)`, line);
    }
    if (ta.nullable) {
      if (isValueType(t)) t = nullableT(t);
    }
    for (let i = ta.ranks.length - 1; i >= 0; i--) {
      if (t.k === 'void') this.err("Keyword 'void' cannot be used in this context", line);
      t = arrT(t, ta.ranks[i]);
    }
    if (t.k === 'class' && t.c.isStatic && !allowVoid) this.err(`Cannot declare a variable of static type '${t.c.name}'`, line);
    return t;
  }

  // ---------------------------------------------------------------- phase 1: declare
  declare(unit, system) {
    for (const d of unit.types) {
      if (d.k !== 'Class' && d.k !== 'Interface' && d.k !== 'Enum') continue;
      const c = new ClassInfo(d, system);
      if (!system && d.ns) this.userNs.add(d.ns);
      const existing = this.types.get(d.name);
      if (existing && !existing.system && !system && existing.outerName === c.outerName) {
        this.err(`The namespace '${d.ns || '<global namespace>'}' already contains a definition for '${d.name}'`, d.line);
      }
      if (!system && (STATIC_BI.has(d.name) || BI[d.name] || GENERIC_BI[d.name] !== undefined)) {
        // a pupil's own class with a library name: allow it, it hides the library one
      }
      this.types.set(d.name, c);
      if (d.outer) this.types.set(d.outer + '.' + d.name, c);
      this.classes.push(c);
    }
  }

  resolveBases() {
    for (const c of this.classes) {
      const d = c.decl;
      if (d.outer) c.outer = this.types.get(d.outer) || null;
      if (c.kind === 'enum') continue;
      (d.bases || []).forEach((bt, i) => {
        const nm = bt.name.split('.').pop();
        if (IGNORED_IFACES.has(nm)) { c.ignoredIfaces = (c.ignoredIfaces || []).concat([nm]); return; }
        if ((nm === 'object' || nm === 'Object') && !bt.args) return;
        if (GENERIC_BI[nm] !== undefined || BI[nm] || TYPE_ALIASES[nm] || PREDEF_TYPES.has(nm) || nm === 'IEnumerable') {
          if (BI[nm] || TYPE_ALIASES[nm] || PREDEF_TYPES.has(nm)) this.err(`'${c.name}': cannot derive from sealed type '${nm}'`, bt.line);
          unsupported(`Inheriting from '${nm}'`, bt.line);
        }
        const b = this.types.get(nm);
        if (!b || bt.args) this.err(`The type or namespace name '${nm}' could not be found (are you missing a using directive or an assembly reference?)`, bt.line);
        if (b.kind === 'enum') this.err(`Type '${nm}' in interface list is not an interface`, bt.line);
        if (b.kind === 'interface') { c.ifaces.push(b); return; }
        if (c.kind === 'interface') this.err(`Type '${nm}' in interface list is not an interface`, bt.line);
        if (i > 0) this.err(`Base class '${nm}' must come before any interfaces`, bt.line);
        if (b.isSealed) this.err(`'${c.name}': cannot derive from sealed type '${b.name}'`, bt.line);
        if (b.isStatic) this.err(`'${c.name}': cannot derive from static class '${b.name}'`, bt.line);
        if (c.isStatic) this.err(`Static class '${c.name}' cannot derive from type '${b.name}'. Static classes must derive from object.`, bt.line);
        c.base = b;
      });
    }
    // circularity
    for (const c of this.classes) {
      const seen = new Set();
      for (let x = c; x; x = x.base) {
        if (seen.has(x)) this.err(`Circular base type dependency involving '${c.name}' and '${x.name}'`, c.line);
        seen.add(x);
      }
      const walk = (i, path) => {
        if (path.includes(i)) this.err(`Inherited interface '${i.name}' causes a cycle in the interface hierarchy of '${c.name}'`, c.line);
        i.ifaces.forEach((j) => walk(j, path.concat([i])));
      };
      if (c.kind === 'interface') walk(c, []);
    }
  }

  isSubclassOf(c, b) { for (let x = c; x; x = x.base) if (x === b) return true; return false; }
  classDepth(c, b) { let n = 0; for (let x = c; x; x = x.base, n++) if (x === b) return n; return -1; }
  allIfaces(c) {
    if (c._allIf) return c._allIf;
    const out = new Set();
    const add = (i) => { if (out.has(i)) return; out.add(i); i.ifaces.forEach(add); };
    for (let x = c; x; x = x.base) x.ifaces.forEach(add);
    c._allIf = out;
    return out;
  }
  implementsIface(c, i) { return c === i || this.allIfaces(c).has(i); }

  // ---------------------------------------------------------------- phase 2: members
  collectMembers(c) {
    const d = c.decl;
    const isIface = c.kind === 'interface';
    const dfltAccess = isIface ? 'public' : 'private';
    const sigSeen = new Map();
    const addName = (name, line, what) => {
      if (name === c.name && what !== 'ctor') this.err(`'${name}': member names cannot be the same as their enclosing type`, line);
    };
    if (c.kind === 'enum') {
      c.enumVals = new Map();
      c.enumNames = {};
      let next = 0;
      for (const m of d.members) {
        if (c.enumVals.has(m.name)) this.err(`The type '${c.name}' already contains a definition for '${m.name}'`, m.line);
        let v = next;
        if (m.value) {
          const r = this.constEval(m.value, c);
          if (typeof r !== 'number' || !Number.isInteger(r)) this.err('Cannot implicitly convert type to int: enum values must be whole numbers', m.line);
          v = r;
        }
        c.enumVals.set(m.name, v);
        if (c.enumNames[v] === undefined) c.enumNames[v] = m.name;
        next = v + 1;
      }
      c.namesConst = this.hoist(JSON.stringify(c.enumNames));
      return;
    }
    for (const m of d.members) {
      this.guard(() => {
        const mods = m.mods;
        if (isIface && (mods.has('private') || mods.has('protected'))) unsupported('Non-public interface members', m.line);
        if (c.isStatic && !mods.has('static') && !mods.has('const') && m.k !== 'StaticCtor') {
          const nm = m.k === 'Field' ? m.decls[0].name : m.k === 'Ctor' ? c.name : m.name;
          if (m.k === 'Ctor') this.err('Static classes cannot have instance constructors', m.line);
          this.err(`'${c.name}.${nm}': cannot declare instance members in a static class`, m.line);
        }
        switch (m.k) {
          case 'Field': {
            if (isIface) this.err('Interfaces cannot contain instance fields', m.line);
            const isConst = mods.has('const');
            if (isConst && mods.has('static')) this.err(`The constant '${c.name}.${m.decls[0].name}' cannot be marked static`, m.line);
            const t = this.resolveType(m.type);
            if (t.k === 'var') this.err("The contextual keyword 'var' may only appear within a local variable declaration", m.line);
            for (const fd of m.decls) {
              addName(fd.name, fd.line);
              if (c.fields.has(fd.name) || c.props.has(fd.name) || c.methods.has(fd.name)) this.err(`The type '${c.name}' already contains a definition for '${fd.name}'`, fd.line);
              if (isConst && !fd.init) this.err('A const field requires a value to be provided', fd.line);
              c.fields.set(fd.name, {
                kind: 'field', name: fd.name, t, cls: c, isStatic: mods.has('static') || isConst, isConst,
                isReadonly: mods.has('readonly'), access: accessOf(mods, dfltAccess), init: fd.init, line: fd.line,
                js: (isConst ? 'k$' : 'f$') + c.name + '$' + fd.name,
              });
            }
            break;
          }
          case 'Prop': {
            addName(m.name, m.line);
            if (c.fields.has(m.name) || c.props.has(m.name) || c.methods.has(m.name)) this.err(`The type '${c.name}' already contains a definition for '${m.name}'`, m.line);
            const t = this.resolveType(m.type);
            if (t.k === 'var') this.err("The contextual keyword 'var' may only appear within a local variable declaration", m.line);
            const isAbstract = mods.has('abstract') || isIface;
            const getBody = m.get && (m.get.body || m.get.expr);
            const setBody = m.set && (m.set.body || m.set.expr);
            const isAuto = !isAbstract && !getBody && !setBody;
            if (!m.get && !m.set) this.err(`'${c.name}.${m.name}': property or indexer must have at least one accessor`, m.line);
            if (!isAbstract && !isAuto && ((m.get && !getBody) || (m.set && !setBody))) {
              const acc = m.get && !getBody ? 'get' : 'set';
              this.err(`'${c.name}.${m.name}.${acc}' must declare a body because it is not marked abstract, extern, or partial`, m.line);
            }
            if (isAbstract && (getBody || setBody) && !isIface) this.err(`'${c.name}.${m.name}.get' cannot declare a body because it is marked abstract`, m.line);
            if (isIface && (getBody || setBody)) unsupported('Default interface implementations', m.line);
            if (isAuto && !m.get) this.err('Auto-implemented properties must have get accessors.', m.line);
            if (m.init && !isAuto) this.err('Only auto-implemented properties can have initializers.', m.line);
            if (isAbstract && !c.isAbstract) this.err(`'${c.name}.${m.name}' is abstract but it is contained in non-abstract type '${c.name}'`, m.line);
            const access = accessOf(mods, dfltAccess);
            const accAccess = (a) => (a && a.mods.size ? accessOf(a.mods, access) : access);
            c.props.set(m.name, {
              kind: 'prop', name: m.name, t, cls: c, isStatic: mods.has('static'), access, decl: m,
              hasGet: !!m.get, hasSet: !!m.set, getAccess: accAccess(m.get), setAccess: accAccess(m.set),
              isInit: !!(m.set && m.set.isInit),
              isAuto, isAbstract, isVirtual: mods.has('virtual') || isAbstract || mods.has('override'), isOverride: mods.has('override'),
              line: m.line, backing: 'p$' + c.name + '$' + m.name, root: null,
            });
            break;
          }
          case 'Method': {
            addName(m.name, m.line);
            if (c.fields.has(m.name) || c.props.has(m.name)) this.err(`The type '${c.name}' already contains a definition for '${m.name}'`, m.line);
            const params = this.resolveParams(m.params);
            const ret = this.resolveType(m.ret, true);
            if (ret.k === 'var') this.err("The contextual keyword 'var' may only appear within a local variable declaration", m.line);
            const isAbstract = mods.has('abstract') || (isIface && !m.body && !m.exprBody);
            if (isIface && (m.body || m.exprBody)) unsupported('Default interface implementations', m.line);
            const info = {
              kind: 'method', name: m.name, params, ret, cls: c, isStatic: mods.has('static'), access: accessOf(mods, dfltAccess),
              isAbstract, isVirtual: mods.has('virtual') || isAbstract || mods.has('override'), isOverride: mods.has('override'),
              decl: m, line: m.line, sig: params.map((p) => (p.mod ? p.mod + '_' : '') + tyKey(p.t)).join('$'), root: null,
            };
            if (!isAbstract && !m.body && !m.exprBody && !mods.has('extern') && !mods.has('partial')) this.err(`'${this.mDisp(info)}' must declare a body because it is not marked abstract, extern, or partial`, m.line);
            if (mods.has('abstract') && (m.body || m.exprBody)) this.err(`'${this.mDisp(info)}' cannot declare a body because it is marked abstract`, m.line);
            if (isAbstract && !c.isAbstract) this.err(`'${this.mDisp(info)}' is abstract but it is contained in non-abstract type '${c.name}'`, m.line);
            if (info.isStatic && (info.isVirtual || info.isOverride)) this.err(`A static member '${this.mDisp(info)}' cannot be marked as override, virtual, or abstract`, m.line);
            if (info.isVirtual && info.access === 'private') this.err(`'${this.mDisp(info)}': virtual or abstract members cannot be private`, m.line);
            const key = m.name + '(' + params.map((p) => tyKey(p.t)).join(',') + ')';
            if (sigSeen.has(key)) this.err(`Type '${c.name}' already defines a member called '${m.name}' with the same parameter types`, m.line);
            sigSeen.set(key, true);
            if (!c.methods.has(m.name)) c.methods.set(m.name, []);
            c.methods.get(m.name).push(info);
            break;
          }
          case 'Ctor': {
            if (isIface) this.err('Interfaces cannot contain instance constructors', m.line);
            const params = this.resolveParams(m.params);
            const info = { kind: 'ctor', name: c.name, params, cls: c, access: accessOf(mods, 'private'), decl: m, line: m.line, isStatic: false };
            info.sig = params.map((p) => (p.mod ? p.mod + '_' : '') + tyKey(p.t)).join('$');
            info.js = 'K$' + c.name + '$' + info.sig;
            const key = 'ctor(' + params.map((p) => tyKey(p.t)).join(',') + ')';
            if (sigSeen.has(key)) this.err(`Type '${c.name}' already defines a member called '${c.name}' with the same parameter types`, m.line);
            sigSeen.set(key, true);
            c.ctors.push(info);
            break;
          }
          case 'StaticCtor': {
            if (m.params.length) this.err(`'${c.name}.${c.name}()': a static constructor must be parameterless`, m.line);
            c.staticCtor = m;
            break;
          }
        }
      });
    }
    if (c.kind === 'class' && !c.ctors.length) {
      const info = { kind: 'ctor', name: c.name, params: [], cls: c, access: c.isAbstract ? 'protected' : 'public', decl: null, line: c.line, implicit: true, sig: '' };
      info.js = 'K$' + c.name + '$';
      c.ctors.push(info);
    }
  }

  resolveParams(ps) {
    const seen = new Set();
    return ps.map((p, i) => {
      if (seen.has(p.name)) this.err(`The parameter name '${p.name}' is a duplicate`, p.line);
      seen.add(p.name);
      const t = this.resolveType(p.type);
      if (t.k === 'var') this.err("The contextual keyword 'var' may only appear within a local variable declaration", p.line);
      if (p.mod === 'params' && (t.k !== 'array' || i !== ps.length - 1)) this.err('The parameter array must be a single dimensional array and the last parameter', p.line);
      let def;
      if (p.def) {
        if (p.mod) this.err(`A ${p.mod} parameter cannot have a default value`, p.line);
        def = p.def;
      }
      return { name: p.name, t, mod: p.mod, def, line: p.line };
    });
  }

  mDisp(m) {
    const ps = m.params.map((p) => (p.mod && p.mod !== 'params' ? p.mod + ' ' : (p.mod === 'params' ? 'params ' : '')) + tyStr(p.t)).join(', ');
    return `${m.cls.name}.${m.kind === 'ctor' ? m.cls.name : m.name}(${ps})`;
  }
  memberDisp(m) {
    if (m.kind === 'method' || m.kind === 'ctor') return this.mDisp(m);
    return `${m.cls.name}.${m.name}`;
  }

  // ---------------------------------------------------------------- phase 3: inheritance checks
  findMethodInChain(c, name, sig, skipSelf) {
    for (let x = skipSelf ? c.base : c; x; x = x.base) {
      const ms = x.methods.get(name);
      if (ms) for (const m of ms) if (m.sig === sig) return m;
    }
    return null;
  }
  findPropInChain(c, name, skipSelf) {
    for (let x = skipSelf ? c.base : c; x; x = x.base) { const p = x.props.get(name); if (p) return p; }
    return null;
  }

  checkInheritance(c) {
    if (c.kind === 'enum') return;
    // overrides
    for (const ms of c.methods.values()) {
      for (const m of ms) {
        this.guard(() => {
          const OBJ = { ToString: ['', 'string'], Equals: ['object', 'bool'], GetHashCode: ['', 'int'] };
          if (m.isOverride && !this.findMethodInChain(c, m.name, m.sig, true) && OBJ[m.name] && OBJ[m.name][0] === m.sig) {
            if (m.ret.k !== OBJ[m.name][1]) this.err(`'${this.mDisp(m)}': return type must be '${OBJ[m.name][1]}' to match overridden member 'object.${m.name}(${m.sig})'`, m.line);
            if (m.access !== 'public') this.err(`'${this.mDisp(m)}': cannot change access modifiers when overriding 'public' inherited member 'object.${m.name}(${m.sig})'`, m.line);
            m.root = null;
            m.js = 'M$' + m.name + '$' + m.sig;
            return;
          }
          if (m.isOverride) {
            const b = this.findMethodInChain(c, m.name, m.sig, true);
            if (!b) this.err(`'${this.mDisp(m)}': no suitable method found to override`, m.line);
            if (!b.isVirtual) this.err(`'${this.mDisp(m)}': cannot override inherited member '${this.mDisp(b)}' because it is not marked virtual, abstract, or override`, m.line);
            if (!tyEq(b.ret, m.ret)) this.err(`'${this.mDisp(m)}': return type must be '${tyStr(b.ret)}' to match overridden member '${this.mDisp(b)}'`, m.line);
            if (b.access !== m.access && !b.cls.system) this.err(`'${this.mDisp(m)}': cannot change access modifiers when overriding '${b.access}' inherited member '${this.mDisp(b)}'`, m.line);
            m.root = b.root;
            m.js = b.js;
            return;
          } else m.root = c;
          m.js = 'M$' + m.root.name + '$' + m.name + '$' + m.sig;
        });
      }
    }
    for (const p of c.props.values()) {
      this.guard(() => {
        if (p.isOverride) {
          const b = this.findPropInChain(c, p.name, true);
          if (!b) this.err(`'${c.name}.${p.name}': no suitable method found to override`, p.line);
          if (!b.isVirtual) this.err(`'${c.name}.${p.name}': cannot override inherited member '${b.cls.name}.${p.name}' because it is not marked virtual, abstract, or override`, p.line);
          if (!tyEq(b.t, p.t)) this.err(`'${c.name}.${p.name}': type must be '${tyStr(b.t)}' to match overridden member '${b.cls.name}.${p.name}'`, p.line);
          p.root = b.root;
          // an override may supply only one accessor; inherit the other
          if (!p.hasGet && b.hasGet) { p.hasGet = true; p.getAccess = b.getAccess; p.inheritGet = true; }
          if (!p.hasSet && b.hasSet) { p.hasSet = true; p.setAccess = b.setAccess; p.inheritSet = true; }
        } else p.root = c;
        p.gjs = 'G$' + p.root.name + '$' + p.name;
        p.sjs = 'S$' + p.root.name + '$' + p.name;
      });
    }
    if (c.kind === 'interface') {
      for (const ms of c.methods.values()) for (const m of ms) m.ijs = 'I$' + c.name + '$' + m.name + '$' + m.sig;
      for (const p of c.props.values()) { p.igjs = 'IG$' + c.name + '$' + p.name; p.isjs = 'IS$' + c.name + '$' + p.name; }
    }
  }

  checkImplementation(c) {
    if (c.kind !== 'class') return;
    // abstract members must be implemented by concrete classes
    if (!c.isAbstract) {
      const done = new Set();
      for (let x = c; x; x = x.base) {
        for (const ms of x.methods.values()) for (const m of ms) {
          if (done.has(m.js)) continue;
          done.add(m.js);
          if (m.isAbstract) this.guard(() => this.err(`'${c.name}' does not implement inherited abstract member '${this.mDisp(m)}'`, c.line));
        }
        for (const p of x.props.values()) {
          if (done.has(p.gjs)) continue;
          done.add(p.gjs);
          if (p.isAbstract) this.guard(() => this.err(`'${c.name}' does not implement inherited abstract member '${x.name}.${p.name}'`, c.line));
        }
      }
    }
    // interfaces
    c.ifaceAliases = [];
    const own = new Set(c.base ? this.allIfaces(c.base) : []);
    for (const i of this.allIfaces(c)) {
      for (const ms of i.methods.values()) for (const im of ms) {
        this.guard(() => {
          let found = null;
          for (let x = c; x && !found; x = x.base) {
            const cands = x.methods.get(im.name) || [];
            found = cands.find((m) => m.sig === im.sig && !m.isStatic) || null;
          }
          if (!found) this.err(`'${c.name}' does not implement interface member '${this.mDisp(im)}'`, c.line);
          if (found.access !== 'public') this.err(`'${c.name}' does not implement interface member '${this.mDisp(im)}'. '${this.mDisp(found)}' cannot implement an interface member because it is not public.`, found.line);
          if (!tyEq(found.ret, im.ret)) this.err(`'${c.name}' does not implement interface member '${this.mDisp(im)}'. '${this.mDisp(found)}' cannot implement '${this.mDisp(im)}' because it does not have the matching return type of '${tyStr(im.ret)}'.`, found.line);
          if (!own.has(i)) c.ifaceAliases.push(`*${im.ijs}(...a) { return yield* this.${found.js}(...a); }`);
        });
      }
      for (const ip of i.props.values()) {
        this.guard(() => {
          const found = this.findPropInChain(c, ip.name);
          if (!found || found.isStatic) this.err(`'${c.name}' does not implement interface member '${i.name}.${ip.name}'`, c.line);
          if (found.access !== 'public') this.err(`'${c.name}' does not implement interface member '${i.name}.${ip.name}'. '${c.name}.${ip.name}' cannot implement an interface member because it is not public.`, found.line);
          if (!tyEq(found.t, ip.t)) this.err(`'${c.name}' does not implement interface member '${i.name}.${ip.name}'. '${c.name}.${ip.name}' cannot implement '${i.name}.${ip.name}' because it does not have the matching return type of '${tyStr(ip.t)}'.`, found.line);
          if (ip.hasSet && (!found.hasSet || found.setAccess !== 'public')) this.err(`'${c.name}' does not implement interface member '${i.name}.${ip.name}.set'`, found.line);
          if (!own.has(i)) {
            c.ifaceAliases.push(`*${ip.igjs}() { return yield* this.${found.gjs}(); }`);
            if (found.hasSet) c.ifaceAliases.push(`*${ip.isjs}(v) { return yield* this.${found.sjs}(v); }`);
          }
        });
      }
    }
  }

  // constant evaluation (enum values, const fields, case labels)
  constEval(e, cls) {
    const saveFn = this.fn, saveScope = this.scope, saveDa = this.da;
    this.fn = this.newFn(cls, true, T.void, 'const');
    this.scope = { parent: null, vars: new Map(), fn: this.fn };
    this.da = new Set();
    try {
      const r = this.cx(e);
      if (r.cv === undefined) this.err('A constant value is expected', e.line);
      return r.cv;
    } finally { this.fn = saveFn; this.scope = saveScope; this.da = saveDa; }
  }

  // ===========================================================================
  // 8. Compiler: code generation for classes
  // ===========================================================================

  newFn(cls, isStatic, ret, kind, member) {
    return { cls, isStatic, ret, kind, member, temps: 0, loops: [], catchVars: [], outParams: [], parentFn: this.fn || null, usesThis: false, locals: 0 };
  }
  tmp() { const n = '$' + (++this.fn.temps); return n; }
  tempDecl(fn) { if (!fn.temps) return ''; const a = []; for (let i = 1; i <= fn.temps; i++) a.push('$' + i); return 'let ' + a.join(', ') + ';'; }

  pushScope() { this.scope = { parent: this.scope, vars: new Map(), fn: this.fn }; return this.scope; }
  popScope() { this.scope = this.scope.parent; }

  declareVar(name, t, line, opts) {
    // C# forbids re-using a name from an enclosing local scope in the same method
    for (let s = this.scope; s && s.fn === this.fn; s = s.parent) {
      if (s.vars.has(name)) {
        if (s === this.scope) this.err(`A local variable or function named '${name}' is already defined in this scope`, line);
        this.err(`A local or parameter named '${name}' cannot be declared in this scope because that name is used in an enclosing local scope to define a local or parameter`, line);
      }
      if (s.isFnTop) break;
    }
    if (t && t.k === 'void') this.err("Keyword 'void' cannot be used in this context", line);
    const v = Object.assign({ name, t, js: 'v$' + name, fn: this.fn, line, needsDA: false }, opts || {});
    this.scope.vars.set(name, v);
    return v;
  }
  lookupVar(name) {
    for (let s = this.scope; s; s = s.parent) {
      const v = s.vars.get(name);
      if (v) return v;
    }
    return null;
  }

  // definite assignment helpers
  daClone() { return this.da === null ? null : new Set(this.da); }
  daMeet(a, b) {
    if (a === null) return b === null ? null : new Set(b);
    if (b === null) return new Set(a);
    const out = new Set();
    for (const x of a) if (b.has(x)) out.add(x);
    return out;
  }
  daAssign(v) { if (this.da !== null && v.needsDA) this.da.add(v); }
  daCheck(v, line) {
    if (!v.needsDA || this.da === null || this.da.has(v)) return;
    if (v.fn !== this.fn) return; // captured in a lambda: not checked
    if (v.isOut) this.err(`Use of unassigned out parameter '${v.name}'`, line);
    this.err(`Use of unassigned local variable '${v.name}'`, line);
  }

  // ---------------------------------------------------------------- whole program
  compileProgram(unit, prelude) {
    this.userNs = new Set();
    this.declare(prelude, true);
    this.declare(unit, false);
    // top-level statements become Program.Main
    if (unit.globals.length) {
      const hasProgram = this.types.get('Program');
      const name = hasProgram && !hasProgram.system ? '<Program>$' : 'Program';
      const stmts = [], funcs = [];
      unit.globals.forEach((s) => { if (s.k === 'LocalFunc') funcs.push(s); stmts.push(s); });
      const mainDecl = { k: 'Method', mods: new Set(['static', 'private']), ret: { k: 'Type', name: 'void', args: null, ranks: [], line: 1 }, name: 'Main',
        params: [], body: { k: 'Block', stmts, line: stmts[0].line, end: stmts[stmts.length - 1].line }, exprBody: null, line: stmts[0].line, topLevel: true };
      const decl = { k: 'Class', name, ns: '', mods: new Set(['static']), bases: [], members: [mainDecl], line: 1 };
      const c = new ClassInfo(decl, false);
      c.js = 'C$TopLevel';
      c.topLevel = true;
      this.types.set(name, c);
      this.classes.push(c);
    }
    this.resolveBases();
    for (const c of this.classes) this.guard(() => this.collectMembers(c));
    this.throwIfErrors();
    // order classes so bases come first
    const ordered = [], done = new Set();
    const visit = (c) => { if (done.has(c)) return; done.add(c); if (c.base) visit(c.base); ordered.push(c); };
    this.classes.forEach(visit);
    this.classes = ordered;
    for (const c of this.classes) this.checkInheritance(c);
    this.throwIfErrors();
    for (const c of this.classes) this.checkImplementation(c);
    this.throwIfErrors();
    // entry point
    let main = null;
    for (const c of this.classes) {
      if (c.system) continue;
      for (const m of c.methods.get('Main') || []) {
        if (!m.isStatic) continue;
        if (m.params.length > 1 || (m.params.length === 1 && !tyEq(m.params[0].t, arrT(T.string)))) continue;
        if (m.ret.k !== 'void' && m.ret.k !== 'int') continue;
        if (main) this.err(`Program has more than one entry point defined. Remove one of the Main methods.`, m.line);
        main = m;
      }
    }
    if (!main) {
      const anyMain = this.classes.find((c) => !c.system && c.methods.has('Main'));
      if (anyMain) {
        const m = anyMain.methods.get('Main')[0];
        if (!m.isStatic) this.err("Program does not contain a static 'Main' method suitable for an entry point (Main must be static: static void Main(string[] args))", m.line);
      }
      const loose = this.classes.find((c) => !c.system && [...c.methods.keys()].some((k) => k.toLowerCase() === 'main' && k !== 'Main'));
      if (loose) {
        const k = [...loose.methods.keys()].find((k) => k.toLowerCase() === 'main');
        this.err(`Program does not contain a static 'Main' method suitable for an entry point (check the spelling: '${k}' should be 'Main')`, loose.methods.get(k)[0].line);
      }
      this.err("Program does not contain a static 'Main' method suitable for an entry point", 1);
    }
    this.main = main;
    // code for each class
    const parts = [];
    for (const c of this.classes) {
      if (c.kind === 'enum') continue;
      parts.push(this.genClass(c));
    }
    this.throwIfErrors();
    // static initialisation order: constants first, then other classes, then the class holding Main
    const inits = [];
    const mainCls = main.cls;
    const order = this.classes.filter((c) => c.kind === 'class' && c !== mainCls).concat([mainCls]);
    for (const c of this.classes) if (c.constInit) inits.push(c.constInit);
    for (const c of order) if (c.staticInit) inits.push(c.staticInit);
    const mainCall = `yield* ${mainCls.js}.${main.js}(${main.params.length ? '$rt.arr([], "System.String[]")' : ''});`;
    const classMap = this.classes.filter((c) => c.kind === 'class').map((c) => `${JSON.stringify(c.name)}: ${c.js}`).join(', ');
    const enumKeys = this.types.get('ConsoleKey');
    const code = [
      '"use strict";',
      'let $l = 0;',
      'const $S = $env.steps, $TK = $env.TK, $RL = $env.RL, $RK = $env.RK, $RKI = $env.RKI, $SLP = $env.SLP;',
      'const $Dec = $rt.Dec, $Dec0 = new $rt.Dec(0n, 0), $DTmin = new $rt.CsDateTime($rt.utcMs(1, 1, 1)), $TS0 = new $rt.CsTimeSpan(0);',
      'function $r(v, n) { $l = n; return v; }',
      ...this.hoisted,
      ...parts,
      `return { classes: { ${classMap} }, line: () => $l, setLine: (n) => { $l = n; }, consoleKeys: ${enumKeys ? JSON.stringify(Object.fromEntries(enumKeys.enumVals)) : '{}'},`,
      `  main: function* () { ${inits.join('\n')}\n ${mainCall} } };`,
    ].join('\n');
    return code;
  }

  throwIfErrors() {
    if (this.errors.length) {
      const e = new CompileError(this.errors[0].message, this.errors[0].line);
      e.all = this.errors.slice().sort((a, b) => a.line - b.line);
      throw e;
    }
  }

  // ---------------------------------------------------------------- class code
  genClass(c) {
    const out = [];
    const ext = c.base ? c.base.js : '$rt.CsObject';
    const isIface = c.kind === 'interface';
    const body = [];
    if (!isIface) {
      // JS constructor: default values for every instance field of this class
      const defs = [];
      for (const f of c.fields.values()) if (!f.isStatic) defs.push(`this.${f.js} = ${defaultValueCode(f.t)};`);
      for (const p of c.props.values()) if (!p.isStatic && p.isAuto) defs.push(`this.${p.backing} = ${defaultValueCode(p.t)};`);
      body.push(`constructor() { super(); ${defs.join(' ')} }`);
      for (const k of c.ctors) this.guard(() => body.push(this.genCtor(c, k)));
      for (const ms of c.methods.values()) for (const m of ms) if (!m.isAbstract) this.guard(() => body.push(this.genMethod(c, m)));
      for (const p of c.props.values()) if (!p.isAbstract) this.guard(() => body.push(...this.genProp(c, p)));
      body.push(...(c.ifaceAliases || []));
      // CompareTo makes List.Sort() work for classes implementing IComparable
      const cmp = (c.methods.get('CompareTo') || []).find((m) => m.params.length === 1 && !m.isStatic && m.ret.k === 'int');
      if (cmp) body.push(`*$cmp(o) { return yield* this.${cmp.js}(o); }`);
      out.push(`class ${c.js} extends ${ext} {\n${body.join('\n')}\n}`);
      out.push(`${c.js}.prototype.$cls = { name: ${JSON.stringify(c.name)}, full: ${JSON.stringify(c.full)} };`);
      const ifs = [...this.allIfaces(c)].map((i) => i.name).concat(c.ignoredIfaces || []);
      for (let x = c.base; x; x = x.base) (x.ignoredIfaces || []).forEach((n) => ifs.push(n));
      out.push(`${c.js}.prototype.$ifaces = new Set(${JSON.stringify(ifs)});`);
    } else {
      out.push(`class ${c.js} {}`);
    }
    // statics
    const sdefs = [];
    for (const f of c.fields.values()) if (f.isStatic) sdefs.push(`${c.js}.${f.js} = ${defaultValueCode(f.t)};`);
    for (const p of c.props.values()) if (p.isStatic && p.isAuto) sdefs.push(`${c.js}.${p.backing} = ${defaultValueCode(p.t)};`);
    out.push(...sdefs);
    // constant and static field initialisers
    this.guard(() => this.genStaticInit(c));
    return out.join('\n');
  }

  genStaticInit(c) {
    const consts = [...c.fields.values()].filter((f) => f.isConst);
    if (consts.length) {
      const lines = [];
      for (const f of consts) {
        this.guard(() => {
          if (f.cv === undefined) this.evalConstField(f, f.line);
          lines.push(`${c.js}.${f.js} = ${this.constCode(f.cv, f.t)};`);
        });
      }
      c.constInit = lines.join('\n');
    }
    const lines = [];
    for (const f of c.fields.values()) {
      if (!f.isStatic || f.isConst || !f.init) continue;
      this.guard(() => {
        const fn = this.newFn(c, true, T.void, 'fieldinit', f);
        this.withFn(fn, () => {
          this.pre = [];
          const code = this.initValue(f.init, f.t, f.line);
          lines.push(`{ ${this.tempDecl(fn)} $l = ${f.line}; ${this.flushPre()} ${c.js}.${f.js} = ${code}; }`);
        });
      });
    }
    for (const p of c.props.values()) {
      if (!p.isStatic || !p.decl.init) continue;
      this.guard(() => {
        const fn = this.newFn(c, true, T.void, 'fieldinit', p);
        this.withFn(fn, () => {
          this.pre = [];
          const code = this.initValue(p.decl.init, p.t, p.line);
          lines.push(`{ ${this.tempDecl(fn)} $l = ${p.line}; ${this.flushPre()} ${c.js}.${p.backing} = ${code}; }`);
        });
      });
    }
    if (c.staticCtor) {
      this.guard(() => {
        const fn = this.newFn(c, true, T.void, 'method', { name: c.name, params: [], cls: c, kind: 'ctor' });
        this.withFn(fn, () => {
          const b = this.compileBody(c.staticCtor.body, [], fn);
          lines.push(`yield* (function* () { ${b} })();`);
        });
      });
    }
    if (lines.length) c.staticInit = lines.join('\n');
  }

  // works out the value of a const field (on demand, so constants can be used before they are declared)
  evalConstField(f, line) {
    if (f.evaluating) this.err(`The evaluation of the constant value for '${f.cls.name}.${f.name}' involves a circular definition`, f.line);
    f.evaluating = true;
    const saveInObj = this.inObjInit;
    try {
      const fn = this.newFn(f.cls, true, T.void, 'fieldinit', f);
      this.withFn(fn, () => {
        const r = this.cx(f.init, f.t);
        if (r.cv === undefined) this.err(`The expression being assigned to '${f.cls.name}.${f.name}' must be constant`, f.line);
        this.conv(r, f.t, f.line);
        let v = r.cv;
        if (f.t.k === 'decimal' && !(v instanceof Dec)) v = Dec.parse(String(v));
        else if (f.t.k === 'float' && typeof v === 'number') v = Math.fround(v);
        else if (f.t.k === 'object' && v !== null) this.err(`'${f.cls.name}.${f.name}' is of type 'object'. A const field of a reference type other than string can only be initialized with null.`, f.line);
        f.cv = v;
      });
    } finally { f.evaluating = false; this.inObjInit = saveInObj; }
  }

  withFn(fn, f) {
    const sf = this.fn, ss = this.scope, sd = this.da, sp = this.pre;
    this.fn = fn;
    this.scope = { parent: null, vars: new Map(), fn, isFnTop: true };
    this.da = new Set();
    this.pre = [];
    try { return f(); } finally { this.fn = sf; this.scope = ss; this.da = sd; this.pre = sp; }
  }
  flushPre() { const p = this.pre; this.pre = []; return p.length ? 'let ' + p.join(', ') + ';' : ''; }

  // value for a variable/field initialiser (handles { 1, 2 } array initialisers)
  initValue(e, t, line) {
    if (e.k === 'ArrayInit') {
      if (t.k !== 'array') this.err(`Can only use array initializer expressions to assign to array types. Try using a new expression instead.`, line);
      return this.arrayInitCode(e, t);
    }
    const r = this.cx(e, t);
    return this.conv(r, t, line);
  }

  // parameters become locals of the function
  declareParams(params) {
    const names = [];
    for (const p of params) {
      const v = this.declareVar(p.name, p.t, p.line, { isRef: p.mod === 'ref' || p.mod === 'out', isOut: p.mod === 'out', isParam: true });
      if (p.mod === 'out') { v.needsDA = true; this.fn.outParams.push(v); }
      names.push(v.js);
    }
    return names;
  }

  compileBody(block, params, fn) {
    // returns the JS statements for a method body (params already declared)
    const stmts = this.cBlockInner(block.stmts);
    const reach = this.da !== null;
    if (reach) {
      if (fn.ret.k !== 'void' && fn.kind !== 'ctor' && fn.kind !== 'setter') {
        const m = fn.member;
        const name = m.kind === 'prop' ? `${m.cls.name}.${m.name}.get` : this.mDisp(m);
        this.err(`'${name}': not all code paths return a value`, (m.decl && m.decl.line) || block.line);
      }
      this.checkOutParams(block.end || block.line);
    }
    return stmts;
  }
  checkOutParams(line) {
    for (const v of this.fn.outParams) {
      if (this.da !== null && !this.da.has(v)) this.err(`The out parameter '${v.name}' must be assigned to before control leaves the current method`, line);
    }
  }

  stepCheck() { return 'if (++$S.n >= $S.y) yield $TK;'; }

  genMethod(c, m) {
    const fn = this.newFn(c, m.isStatic, m.ret, 'method', m);
    return this.withFn(fn, () => {
      const names = this.declareParams(m.params);
      this.checkDefaults(m);
      let body;
      if (m.decl.exprBody) {
        body = this.exprBodyCode(m.decl.exprBody, m.ret);
      } else {
        body = this.compileBody(m.decl.body, m.params, fn);
      }
      const head = `${m.isStatic ? 'static ' : ''}*${m.js}(${names.join(', ')})`;
      return `${head} { const $t = this; ${this.tempDecl(fn)} ${this.stepCheck()}\n${body}\n}`;
    });
  }

  checkDefaults(m) {
    let seenDefault = false;
    m.params.forEach((p) => {
      if (p.def) {
        seenDefault = true;
        const r = this.cx(p.def, p.t);
        if (r.cv === undefined && !(r.t.k === 'null')) this.err(`Default parameter value for '${p.name}' must be a compile-time constant`, p.line);
        p.defCode = this.conv(r, p.t, p.line);
      } else if (seenDefault && p.mod !== 'params') this.err('Optional parameters must appear after all required parameters', p.line);
    });
  }

  exprBodyCode(e, ret) {
    this.pre = [];
    const line = e.line;
    let code;
    if (ret.k === 'void') {
      const r = this.cx(e, null, true);
      this.checkStatementExpr(e);
      code = `$l = ${line}; ${this.flushPre()} ${r.c};`;
    } else {
      const r = this.cx(e, ret);
      const v = this.conv(r, ret, line);
      code = `$l = ${line}; ${this.flushPre()} return ${v};`;
    }
    this.da = null;
    return code;
  }

  genCtor(c, k) {
    const fn = this.newFn(c, false, T.void, 'ctor', k);
    return this.withFn(fn, () => {
      const names = k.decl ? this.declareParams(k.params) : [];
      if (k.decl) this.checkDefaults(k);
      const parts = [];
      const init = k.decl && k.decl.init;
      if (!init || init.kind === 'base') parts.push(this.fieldInitCode(c));
      // base / this constructor call
      if (init) {
        this.pre = [];
        const target = init.kind === 'this' ? c : c.base;
        if (init.kind === 'base' && !c.base) {
          if (init.args.length) this.err(`'object' does not contain a constructor that takes ${init.args.length} arguments`, init.line);
        } else {
          this.fn.inCtorInit = true;
          const call = this.resolveCtorCall(target, init.args.map((a) => Object.assign({}, a, { line: a.line || init.line })), init.line, true);
          this.fn.inCtorInit = false;
          parts.push(`$l = ${init.line}; ${this.flushPre()} yield* ${target.js}.prototype.${call.m.js}.call($t${call.args.length ? ', ' + call.args.join(', ') : ''});`);
        }
      } else if (c.base) {
        const bk = c.base.ctors.find((x) => x.params.every((p) => p.def || p.mod === 'params'));
        if (!bk) {
          const first = c.base.ctors[0];
          this.err(`There is no argument given that corresponds to the required parameter '${first.params[0].name}' of '${this.mDisp(first)}'`, k.decl ? k.line : c.line);
        }
        if (bk.access === 'private' && bk.cls !== c) this.err(`'${this.mDisp(bk)}' is inaccessible due to its protection level`, k.decl ? k.line : c.line);
        const dargs = bk.params.map((p) => (p.mod === 'params' ? `$rt.arr([], ${JSON.stringify(arrTypeName(p.t.el))})` : p.defCode || 'null'));
        parts.push(`yield* ${c.base.js}.prototype.${bk.js}.call($t${dargs.length ? ', ' + dargs.join(', ') : ''});`);
      }
      if (k.decl) {
        if (k.decl.body) parts.push(this.compileBody(k.decl.body, k.params, fn));
      }
      return `*${k.js}(${names.join(', ')}) { const $t = this; ${this.tempDecl(fn)} ${this.stepCheck()}\n${parts.join('\n')}\nreturn $t; }`;
    });
  }

  fieldInitCode(c) {
    const lines = [];
    const saveDa = this.da;
    this.fn.kind = 'fieldinit';
    for (const f of c.fields.values()) {
      if (f.isStatic || !f.init) continue;
      this.fn.member = f;
      this.pre = [];
      const code = this.initValue(f.init, f.t, f.line);
      lines.push(`$l = ${f.line}; ${this.flushPre()} $t.${f.js} = ${code};`);
    }
    for (const p of c.props.values()) {
      if (p.isStatic || !p.decl.init) continue;
      this.fn.member = p;
      this.pre = [];
      const code = this.initValue(p.decl.init, p.t, p.line);
      lines.push(`$l = ${p.line}; ${this.flushPre()} $t.${p.backing} = ${code};`);
    }
    this.fn.kind = 'ctor';
    this.fn.member = null;
    this.da = saveDa;
    return lines.join('\n');
  }

  genProp(c, p) {
    const out = [];
    const st = p.isStatic ? 'static ' : '';
    const self = p.isStatic ? c.js : 'this';
    if (p.isAuto) {
      out.push(`${st}*${p.gjs}() { return ${self}.${p.backing}; }`);
      out.push(`${st}*${p.sjs}(v) { return (${self}.${p.backing} = v); }`);
      return out;
    }
    const d = p.decl;
    if (d.get && (d.get.body || d.get.expr)) {
      const fn = this.newFn(c, p.isStatic, p.t, 'getter', p);
      out.push(this.withFn(fn, () => {
        const body = d.get.expr ? this.exprBodyCode(d.get.expr, p.t) : this.compileBody(d.get.body, [], fn);
        return `${st}*${p.gjs}() { const $t = this; ${this.tempDecl(fn)} ${this.stepCheck()}\n${body}\n}`;
      }));
    }
    if (d.set && (d.set.body || d.set.expr)) {
      const fn = this.newFn(c, p.isStatic, T.void, 'setter', p);
      out.push(this.withFn(fn, () => {
        const v = this.declareVar('value', p.t, d.set.line, { isParam: true });
        const body = d.set.expr ? this.exprBodyCode(d.set.expr, T.void) : this.compileBody(d.set.body, [], fn);
        return `${st}*${p.sjs}(${v.js}) { const $t = this; ${this.tempDecl(fn)} ${this.stepCheck()}\n${body}\nreturn ${v.js}; }`;
      }));
    }
    return out;
  }

  // ===========================================================================
  // 9. Compiler: statements
  // ===========================================================================

  cBlockInner(stmts) {
    const out = [];
    for (let i = 0; i < stmts.length; i++) {
      const s = stmts[i];
      if (s.k === 'LocalFunc') this.declareLocalFunc(s);
    }
    for (let i = 0; i < stmts.length; i++) {
      const s = stmts[i];
      if (s.k === 'LocalDecl' && s.isUsing) {
        // using var x = ...;  -> dispose at the end of the block
        const decl = this.cStmt(s);
        const rest = this.cBlockInner(stmts.slice(i + 1));
        const names = s.decls.map((d) => 'v$' + d.name);
        out.push(`${decl}\ntry {\n${rest}\n} finally { ${names.map((n) => `$rt.dispose(${n});`).join(' ')} }`);
        return out.join('\n');
      }
      out.push(this.cStmt(s));
    }
    return out.join('\n');
  }

  cBlock(b) {
    this.pushScope();
    try { return '{\n' + this.cBlockInner(b.stmts) + '\n}'; } finally { this.popScope(); }
  }

  // an embedded statement gets its own scope
  cEmbedded(s) {
    if (s.k === 'Block') return this.cBlock(s);
    this.pushScope();
    try { return '{ ' + this.cStmt(s) + ' }'; } finally { this.popScope(); }
  }

  cStmt(s) {
    const savePre = this.pre;
    this.pre = [];
    try {
      const code = this.cStmtInner(s);
      const pre = this.pre.length ? 'let ' + this.pre.join(', ') + '; ' : '';
      return pre + code;
    } finally { this.pre = savePre; }
  }

  cond(e, line) {
    const r = this.cx(e, T.bool);
    if (r.t.k !== 'bool') {
      if (r.t.k === 'nullable' && r.t.of.k === 'bool') this.err("Cannot implicitly convert type 'bool?' to 'bool'. An explicit conversion exists (are you missing a cast?)", line);
      this.err(`Cannot implicitly convert type '${tyStr(r.t)}' to 'bool'`, e.line || line);
    }
    return r;
  }

  cStmtInner(s) {
    const L = `$l = ${s.line}; `;
    switch (s.k) {
      case 'Block': return this.cBlock(s);
      case 'Empty': return ';';
      case 'Expr': {
        if (['Assign', 'Call', 'Pre', 'Post', 'New'].includes(s.e.k)) { const r0 = this.cx(s.e, null, true); return `${L}${r0.c};`; }
        if (!(s.e.k === 'Bin' && s.e.op === '==')) this.cx(s.e);
        this.checkStatementExpr(s.e);
        const r = this.cx(s.e, null, true);
        return `${L}${r.c};`;
      }
      case 'LocalDecl': return this.cLocalDecl(s);
      case 'LocalFunc': return this.genLocalFunc(s);
      case 'If': {
        const c = this.cond(s.cond, s.line);
        const constTrue = c.cv === true, constFalse = c.cv === false;
        const before = this.daClone();
        const thenCode = this.cEmbedded(s.then);
        const afterThen = this.da;
        this.da = before;
        let elseCode = '';
        if (s.else) elseCode = ' else ' + this.cEmbedded(s.else);
        if (constTrue) this.da = afterThen;
        else if (constFalse) { /* keep else state */ } else this.da = this.daMeet(afterThen, this.da);
        return `${L}if (${c.c}) ${thenCode}${elseCode}`;
      }
      case 'While': {
        const c = this.cond(s.cond, s.line);
        const afterCond = this.daClone();
        const loop = { breaks: [], isLoop: true };
        this.fn.loops.push(loop);
        const body = this.cEmbedded(s.body);
        this.fn.loops.pop();
        this.da = c.cv === true ? this.meetAll(loop.breaks) : this.meetAll(loop.breaks.concat([afterCond]));
        return `while ((${L.slice(0, -2)}, ${c.c})) { ${this.stepCheck()} ${body} }`;
      }
      case 'Do': {
        const loop = { breaks: [], conts: [], isLoop: true };
        this.fn.loops.push(loop);
        const body = this.cEmbedded(s.body);
        this.fn.loops.pop();
        this.da = this.meetAll(loop.conts.concat([this.da]));
        const c = this.cond(s.cond, s.condLine);
        const after = c.cv === true ? this.meetAll(loop.breaks) : this.meetAll(loop.breaks.concat([this.daClone()]));
        this.da = after;
        return `do { ${this.stepCheck()} ${body} } while (($l = ${s.condLine}, ${c.c}));`;
      }
      case 'For': {
        this.pushScope();
        try {
          let init = '';
          if (s.init) {
            if (s.init.k === 'LocalDecl') init = this.cLocalDecl(s.init, true);
            else init = s.init.es.map((e) => { this.checkStatementExpr(e); return this.cx(e, null, true).c; }).join(', ');
          }
          const preInit = this.pre.length ? 'let ' + this.pre.join(', ') + '; ' : '';
          this.pre = [];
          let condCode = 'true', cv = true;
          if (s.cond) { const c = this.cond(s.cond, s.line); condCode = c.c; cv = c.cv; }
          const afterCond = this.daClone();
          const loop = { breaks: [], isLoop: true };
          this.fn.loops.push(loop);
          const body = this.cEmbedded(s.body);
          this.fn.loops.pop();
          const saveDa = this.da;
          this.da = this.da === null ? afterCond : this.da;
          const iter = s.iter.map((e) => { this.checkStatementExpr(e); return this.cx(e, null, true).c; });
          this.da = cv === true ? this.meetAll(loop.breaks) : this.meetAll(loop.breaks.concat([afterCond]));
          void saveDa;
          const preRest = this.pre.length ? 'let ' + this.pre.join(', ') + '; ' : '';
          this.pre = [];
          return `{ ${preInit}${preRest}${L}for (${init}; ($l = ${s.line}, ${condCode}); ${iter.join(', ')}) { ${this.stepCheck()} ${body} } }`;
        } finally { this.popScope(); }
      }
      case 'Foreach': return this.cForeach(s);
      case 'Break': {
        const loop = this.fn.loops[this.fn.loops.length - 1];
        if (!loop) this.err('No enclosing loop out of which to break or continue', s.line);
        loop.breaks.push(this.daClone());
        this.da = null;
        return `${L}break;`;
      }
      case 'Continue': {
        let loop = null;
        for (let i = this.fn.loops.length - 1; i >= 0; i--) if (this.fn.loops[i].isLoop) { loop = this.fn.loops[i]; break; }
        if (!loop) this.err('No enclosing loop out of which to break or continue', s.line);
        if (loop.conts) loop.conts.push(this.daClone());
        this.da = null;
        return `${L}continue;`;
      }
      case 'Return': return this.cReturn(s);
      case 'Throw': {
        if (!s.e) {
          const cv = this.fn.catchVars[this.fn.catchVars.length - 1];
          if (!cv) this.err('A throw statement with no arguments is not allowed outside of a catch clause', s.line);
          this.da = null;
          return `${L}throw ${cv};`;
        }
        const r = this.cx(s.e);
        const exc = this.types.get('Exception');
        if (!(r.t.k === 'class' && this.isSubclassOf(r.t.c, exc)) && r.t.k !== 'null') this.err('The type caught or thrown must be derived from System.Exception', s.line);
        this.da = null;
        return `${L}throw $rt.thr(${r.c}, ${s.line});`;
      }
      case 'Try': return this.cTry(s);
      case 'Switch': return this.cSwitch(s);
      case 'Using': {
        this.pushScope();
        try {
          let head = '', target;
          if (s.decl) {
            head = this.cLocalDecl(s.decl);
            target = s.decl.decls.map((d) => 'v$' + d.name);
            s.decl.decls.forEach((d) => { const v = this.lookupVar(d.name); if (v) v.readonlyUsing = true; });
          } else {
            const r = this.cx(s.e);
            const t = this.tmp();
            head = `${t} = ${r.c};`;
            target = [t];
          }
          const pre = this.pre.length ? 'let ' + this.pre.join(', ') + '; ' : '';
          this.pre = [];
          const body = this.cEmbedded(s.body);
          return `{ ${pre}${L}${head}\ntry ${body} finally { ${target.map((n) => `$rt.dispose(${n});`).join(' ')} } }`;
        } finally { this.popScope(); }
      }
    }
    this.err(`Unexpected statement`, s.line);
  }

  meetAll(list) {
    let r = null, first = true;
    for (const d of list) { if (first) { r = d === null ? null : new Set(d); first = false; } else r = this.daMeet(r, d); }
    return first ? null : r;
  }

  checkStatementExpr(e) {
    const ok = ['Assign', 'Call', 'Pre', 'Post', 'New'].includes(e.k) || (e.k === 'Member' && false);
    if (!ok) {
      if (e.k === 'Bin' && e.op === '==') this.err('Only assignment, call, increment, decrement, await, and new object expressions can be used as a statement (did you mean = instead of ==?)', e.line);
      if (e.k === 'Name' || e.k === 'Member') {
        // e.g. "Console.WriteLine;" or "x;"
        this.err('Only assignment, call, increment, decrement, await, and new object expressions can be used as a statement', e.line);
      }
      this.err('Only assignment, call, increment, decrement, await, and new object expressions can be used as a statement', e.line);
    }
  }

  cLocalDecl(s, inFor) {
    let t = this.resolveType(s.type);
    const isVar = t.k === 'var';
    const parts = [];
    if (isVar && s.decls.length > 1) this.err('Implicitly-typed variables cannot have multiple declarators', s.line);
    if (isVar && s.isConst) this.err('Implicitly-typed variables cannot be constant', s.line);
    for (const d of s.decls) {
      let vt = t, code = null, cv;
      if (s.isConst && !d.init) this.err('A const field requires a value to be provided', d.line);
      if (d.init) {
        if (isVar) {
          if (d.init.k === 'ArrayInit') this.err('Cannot initialize an implicitly-typed variable with an array initializer', d.line);
          const r = this.cx(d.init);
          if (r.t.k === 'null') this.err("Cannot assign <null> to an implicitly-typed variable", d.line);
          if (r.t.k === 'void') this.err("Cannot assign void to an implicitly-typed variable", d.line);
          if (r.t.k === 'lambda') this.err('Cannot assign lambda expression to an implicitly-typed variable', d.line);
          if (r.t.k === 'mgroup') this.err('Cannot assign method group to an implicitly-typed variable', d.line);
          if (r.t.k === 'typeref' || r.t.k === 'static' || r.t.k === 'ns') this.err(`'${exprText(d.init)}' is a type, which is not valid in the given context`, d.line);
          vt = r.t;
          code = r.c;
          cv = r.cv;
        } else {
          // the variable is not in scope inside its own initialiser in C#, but it is declared; mimic by checking first
          if (d.init.k === 'ArrayInit') code = this.initValue(d.init, vt, d.line);
          else {
            const r = this.cx(d.init, vt);
            code = this.conv(r, vt, d.line);
            cv = r.cv;
          }
        }
        if (s.isConst && cv === undefined) this.err(`The expression being assigned to '${d.name}' must be constant`, d.line);
      } else if (isVar) this.err('Implicitly-typed variables must be initialized', d.line);
      const v = this.declareVar(d.name, vt, d.line, { isConst: !!s.isConst });
      if (s.isConst) { v.cv = vt.k === 'decimal' && !(cv instanceof Dec) ? Dec.parse(String(cv)) : (vt.k === 'double' || vt.k === 'float') && typeof cv === 'number' ? cv : cv; }
      if (code === null) v.needsDA = true;
      parts.push(code === null ? v.js : `${v.js} = ${code}`);
    }
    const kw = 'let';
    if (inFor) return `${kw} ${parts.join(', ')}`;
    return `$l = ${s.line}; ${kw} ${parts.join(', ')};`;
  }

  cReturn(s) {
    const fn = this.fn;
    const L = `$l = ${s.line}; `;
    let code;
    if (fn.kind === 'ctor' || fn.kind === 'setter' || fn.ret.k === 'void') {
      if (s.e) {
        if (fn.kind === 'lambda' && fn.inferRet) { /* handled below */ } else {
          const m = fn.member;
          const what = fn.kind === 'ctor' ? `${fn.cls.name}.${fn.cls.name}(...)` : fn.kind === 'setter' ? `${m.cls.name}.${m.name}.set` : fn.kind === 'lambda' || fn.kind === 'local' ? 'this method' : this.mDisp(m);
          this.err(`Since '${what}' returns void, a return keyword must not be followed by an object expression`, s.line);
        }
      }
      if (!(fn.kind === 'lambda' && fn.inferRet && s.e)) {
        this.checkOutParams(s.line);
        this.da = null;
        if (fn.kind === 'ctor') return `${L}return $t;`;
        if (fn.kind === 'setter') return `${L}return v$value;`;
        return `${L}return;`;
      }
    }
    if (!s.e) this.err(`An object of a type convertible to '${tyStr(fn.ret)}' is required`, s.line);
    if (fn.kind === 'lambda' && fn.inferRet) {
      const r = this.cx(s.e);
      fn.retTypes.push(r.t);
      code = r.c;
    } else {
      const r = this.cx(s.e, fn.ret);
      code = this.conv(r, fn.ret, s.line);
    }
    this.checkOutParams(s.line);
    this.da = null;
    return `${L}return ${code};`;
  }

  cForeach(s) {
    const coll = this.cx(s.coll);
    const ct = coll.t;
    let et = elemType(ct);
    let iter;
    if (!et) {
      if (ct.k === 'object' || ct.k === 'class') this.err(`foreach statement cannot operate on variables of type '${tyStr(ct)}' because '${tyStr(ct)}' does not contain a public instance or extension definition for 'GetEnumerator'`, s.line);
      this.err(`foreach statement cannot operate on variables of type '${tyStr(ct)}' because '${tyStr(ct)}' does not contain a public instance or extension definition for 'GetEnumerator'`, s.line);
    }
    let vt = this.resolveType(s.type);
    if (vt.k === 'var') vt = et;
    let conv = null;
    if (!tyEq(vt, et)) {
      // foreach performs an explicit conversion
      const tmpR = { c: '$fe', t: et };
      conv = this.explicitConv(tmpR, vt, s.line, true);
    }
    switch (ct.k) {
      case 'array': iter = ct.rank === 1 ? null : `$rt.iter2(${coll.c})`; break;
      case 'string': iter = 'str'; break;
      case 'gen':
        if (ct.n === 'List' || ct.n === 'Queue') iter = `$rt.liter(${coll.c})`;
        else if (ct.n === 'Dictionary') iter = `$rt.diter(${coll.c})`;
        else if (ct.n === 'HashSet') iter = `$rt.hiter(${coll.c})`;
        else iter = `$rt.anyIter(${coll.c})`;
        break;
    }
    this.pushScope();
    try {
      const v = this.declareVar(s.name, vt, s.line, { foreachVar: true });
      const loop = { breaks: [], isLoop: true };
      const before = this.daClone();
      this.fn.loops.push(loop);
      const body = this.cEmbedded(s.body);
      this.fn.loops.pop();
      this.da = this.meetAll(loop.breaks.concat([before]));
      const L = `$l = ${s.line}; `;
      const assign = conv ? `const ${v.js} = ((${'$fe'}) => ${conv})($fe);` : '';
      const name = conv ? '$fe' : v.js;
      if (iter === null) {
        const a = this.tmp(), i = this.tmp();
        return `${L}${a} = ${coll.c}; if (${a} === null) throw $rt.nre(); for (${i} = 0; ${i} < ${a}.length; ${i}++) { ${this.stepCheck()} const ${name} = ${a}[${i}]; ${assign} ${body} }`;
      }
      if (iter === 'str') {
        const a = this.tmp(), i = this.tmp();
        return `${L}${a} = ${coll.c}; if (${a} === null) throw $rt.nre(); for (${i} = 0; ${i} < ${a}.length; ${i}++) { ${this.stepCheck()} const ${name} = ${a}.charCodeAt(${i}); ${assign} ${body} }`;
      }
      return `${L}for (const ${name} of ${iter}) { ${this.stepCheck()} ${assign} ${body} }`;
    } finally { this.popScope(); }
  }

  cTry(s) {
    const L = `$l = ${s.line}; `;
    const before = this.daClone();
    const body = this.cBlock(s.body);
    const ends = [this.da];
    let catchCode = '';
    const exc = this.types.get('Exception');
    if (s.catches.length) {
      const ev = '$e' + this.fn.catchVars.length;
      const branches = [];
      const seen = [];
      let catchAll = false;
      for (const c of s.catches) {
        this.da = before === null ? null : new Set(before);
        let cls = exc;
        if (c.type) {
          const t = this.resolveType(c.type);
          if (!(t.k === 'class' && this.isSubclassOf(t.c, exc))) this.err('The type caught or thrown must be derived from System.Exception', c.line);
          cls = t.c;
        }
        if (catchAll) this.err('A previous catch clause already catches all exceptions of this or a super type (\'System.Exception\')', c.line);
        for (const p of seen) {
          if (this.isSubclassOf(cls, p) && !c.when) this.err(`A previous catch clause already catches all exceptions of this or a super type ('${p.system ? p.full : p.name}')`, c.line);
        }
        if (!c.when) seen.push(cls);
        if (cls === exc && !c.when) catchAll = true;
        this.pushScope();
        this.fn.catchVars.push(ev);
        try {
          let decl = '';
          if (c.name) { const v = this.declareVar(c.name, cls.ty, c.line); decl = `let ${v.js} = ${ev};`; }
          let whenCode = '';
          if (c.when) whenCode = ` && (${this.cond(c.when, c.line).c})`;
          const cb = this.cBlockInner(c.body.stmts);
          const test = cls === exc ? 'true' : `${ev} instanceof ${cls.js}`;
          branches.push({ test: test + whenCode, code: `{ ${decl} ${cb} }`, decl, whenCode });
        } finally { this.fn.catchVars.pop(); this.popScope(); }
        ends.push(this.da);
      }
      let chain = '';
      branches.forEach((b, i) => {
        if (b.whenCode && b.decl) {
          chain += `${i ? ' else ' : ''}if (${b.test.replace(b.whenCode, '')} && ((${b.decl.replace(/^let (\S+) = .*$/, '$1')}) => true)() ${''}${b.whenCode}) ${b.code}`;
        } else chain += `${i ? ' else ' : ''}if (${b.test}) ${b.code}`;
      });
      chain += ` else throw ${ev};`;
      catchCode = ` catch (${ev}) { ${ev} = $rt.wrap(${ev}); ${chain} }`;
    }
    this.da = this.meetAll(ends);
    let finCode = '';
    if (s.fin) {
      const after = this.da;
      this.da = before === null ? null : new Set(before);
      const fb = this.cBlock(s.fin);
      const finDa = this.da;
      if (finDa === null) this.da = null;
      else if (after === null) this.da = null;
      else { this.da = new Set(after); for (const x of finDa) this.da.add(x); }
      if (!s.catches.length) catchCode = ` catch ($ef) { throw $rt.wrap($ef); }`;
      finCode = ` finally ${fb}`;
    }
    return `${L}try ${body}${catchCode}${finCode}`;
  }

  cSwitch(s) {
    const r = this.cx(s.e);
    const t = r.t;
    const okType = isIntegral(t) || t.k === 'string' || t.k === 'bool' || t.k === 'enum' || (t.k === 'nullable');
    if (!okType) {
      if (t.k === 'double' || t.k === 'float' || t.k === 'decimal') this.err(`A switch on a ${t.k} is not supported in this course: use if / else if instead`, s.line);
      unsupported(`Switching on a value of type '${tyStr(t)}'`, s.line);
    }
    const L = `$l = ${s.line}; `;
    const afterExpr = this.daClone();
    const loop = { breaks: [], isSwitch: true };
    this.fn.loops.push(loop);
    this.pushScope();
    const hoistVars = [];
    const seenVals = new Map();
    let hasDefault = false;
    const cases = [];
    try {
      for (const sec of s.sections) {
        const labels = [];
        for (const lab of sec.labels) {
          if (lab.def) {
            if (hasDefault) this.err("The switch statement contains multiple cases with the label value 'default'", lab.line);
            hasDefault = true; labels.push('default:'); continue;
          }
          const lr = this.cx(lab.e, t);
          if (lr.cv === undefined) this.err('A constant value is expected', lab.line);
          const code = this.conv(lr, t, lab.line);
          const key = t.k === 'decimal' ? String(lr.cv) : JSON.stringify(lr.cv);
          if (seenVals.has(key)) this.err(`The switch statement contains multiple cases with the label value '${lab.e.k === 'Lit' && lab.e.lt === 'string' ? lr.cv : exprText(lab.e)}'`, lab.line);
          seenVals.set(key, true);
          labels.push(`case ${code}:`);
        }
        this.da = afterExpr === null ? null : new Set(afterExpr);
        // declarations in a switch section belong to the whole switch block
        const stmts = sec.stmts.map((st) => {
          if (st.k === 'LocalDecl') {
            const code = this.cStmt(st);
            st.decls.forEach((d) => hoistVars.push('v$' + d.name));
            return code.replace(/\blet (v\$)/, '$1').replace(/^(\$l = \d+; )let /, '$1');
          }
          return this.cStmt(st);
        });
        if (this.da !== null) {
          const lab = sec.labels[sec.labels.length - 1];
          const txt = lab.def ? 'default:' : `case ${exprText(lab.e)}:`;
          this.err(`Control cannot fall through from one case label ('${txt}') to another (did you forget a break; ?)`, lab.line);
        }
        cases.push(labels.join(' ') + ' {\n' + stmts.join('\n') + '\n}');
      }
    } finally { this.popScope(); this.fn.loops.pop(); }
    this.da = this.meetAll(loop.breaks.concat(hasDefault ? [] : [afterExpr]));
    const decl = hoistVars.length ? `let ${[...new Set(hoistVars)].join(', ')}; ` : '';
    return `{ ${decl}${L}switch (${r.c}) {\n${cases.join('\n')}\n} }`;
  }

  // ---------------------------------------------------------------- local functions and lambdas
  declareLocalFunc(s) {
    if (this.scope.vars.has(s.name)) this.err(`A local variable or function named '${s.name}' is already defined in this scope`, s.line);
    const isStatic = this.fn.isStatic;
    const params = this.resolveParams(s.params);
    const ret = this.resolveType(s.ret, true);
    const info = { kind: 'method', name: s.name, params, ret, cls: this.fn.cls, isStatic, access: 'private', decl: s, line: s.line, local: true, js: 'L$' + s.name + '$' + (++this.tmpN) };
    this.scope.vars.set(s.name, { name: s.name, localFunc: info, fn: this.fn });
    s.info = info;
  }
  genLocalFunc(s) {
    const info = s.info;
    const outer = this.fn;
    const fn = this.newFn(outer.cls, outer.isStatic, info.ret, 'local', info);
    const saveFn = this.fn, saveScope = this.scope, saveDa = this.da, savePre = this.pre;
    this.fn = fn;
    this.scope = { parent: saveScope, vars: new Map(), fn, isFnTop: true };
    this.da = new Set();
    this.pre = [];
    try {
      const names = this.declareParams(info.params);
      this.checkDefaults(info);
      const body = s.exprBody ? this.exprBodyCode(s.exprBody, info.ret) : this.compileBody(s.body, info.params, fn);
      return `function* ${info.js}(${names.join(', ')}) { ${this.tempDecl(fn)} ${this.stepCheck()}\n${body}\n}`;
    } finally { this.fn = saveFn; this.scope = saveScope; this.da = saveDa; this.pre = savePre; }
  }

  // compile a lambda against a delegate signature; returns { c, ret }
  compileLambda(e, ptypes, ret, line) {
    if (e.params.length !== ptypes.length) this.err(`Delegate '${ret ? 'Func' : 'Action'}' does not take ${e.params.length} arguments`, line || e.line);
    const outer = this.fn;
    const fn = this.newFn(outer.cls, outer.isStatic, ret || T.void, 'lambda', { name: 'lambda', params: [], cls: outer.cls, kind: 'method' });
    fn.inferRet = !ret;
    fn.retTypes = [];
    const saveFn = this.fn, saveScope = this.scope, saveDa = this.da, savePre = this.pre;
    this.fn = fn;
    this.scope = { parent: saveScope, vars: new Map(), fn, isFnTop: true };
    this.da = new Set();
    this.pre = [];
    try {
      const names = e.params.map((p, i) => {
        let t = ptypes[i];
        if (p.type) {
          const pt = this.resolveType(p.type);
          if (t && !tyEq(pt, t)) this.err(`Cannot convert lambda expression to intended delegate type because the parameter types do not match`, e.line);
          t = pt;
        }
        return this.declareVar(p.name, t, e.line, { isParam: true }).js;
      });
      let body, rt = ret;
      if (e.body.k === 'Block') {
        body = this.cBlockInner(e.body.stmts);
        if (fn.inferRet) rt = fn.retTypes.length ? fn.retTypes[0] : T.void;
        else if (this.da !== null && ret && ret.k !== 'void') this.err('Not all code paths return a value in lambda expression', e.line);
      } else {
        if (ret && ret.k === 'void') {
          const r = this.cx(e.body, null, true);
          body = `$l = ${e.line}; ${this.flushPre()} ${r.c};`;
        } else {
          const r = this.cx(e.body, ret);
          if (fn.inferRet) { rt = r.t; body = `$l = ${e.line}; ${this.flushPre()} return ${r.c};`; }
          else body = `$l = ${e.line}; ${this.flushPre()} return ${this.conv(r, ret, e.line)};`;
        }
      }
      return { c: `(function* (${names.join(', ')}) { ${this.tempDecl(fn)} ${body} })`, ret: rt };
    } finally { this.fn = saveFn; this.scope = saveScope; this.da = saveDa; this.pre = savePre; }
  }
}


// ===========================================================================
// 10. Compiler: expressions
// ===========================================================================
//
// cx(e, expected) returns { c, t, cv?, lv? }:
//   c   JavaScript code (an expression; may contain "yield*")
//   t   static C# type
//   cv  compile-time constant value, when known
// Every piece of code returned is safe to embed anywhere (fully bracketed).

function lev(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 99;
  const d = [];
  for (let i = 0; i <= m; i++) { d.push([i]); }
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[m][n];
}
function didYouMean(name, cands) {
  let best = null, bd = 99;
  for (const c of cands) {
    if (c === name) continue;
    if (c.toLowerCase() === name.toLowerCase()) return c;
    const d = lev(c.toLowerCase(), name.toLowerCase());
    if (d < bd && d <= (name.length > 4 ? 2 : 1)) { bd = d; best = c; }
  }
  return best;
}

function jsLit(v, t) {
  if (typeof v === 'string') return JSON.stringify(v).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  if (typeof v === 'boolean') return String(v);
  if (v === null) return 'null';
  if (typeof v === 'number') {
    if (v !== v) return 'NaN';
    if (v === Infinity) return 'Infinity';
    if (v === -Infinity) return '(-Infinity)';
    if (Object.is(v, -0)) return '(-0)';
    return v < 0 ? '(' + String(v) + ')' : String(v);
  }
  return 'undefined';
}

// Builtin member lists (for "did you mean" hints)
const MEMBERS = {
  string: ['Length', 'ToUpper', 'ToLower', 'Trim', 'TrimStart', 'TrimEnd', 'Substring', 'IndexOf', 'LastIndexOf', 'Contains', 'StartsWith', 'EndsWith', 'Replace', 'Split', 'PadLeft', 'PadRight', 'Insert', 'Remove', 'ToCharArray', 'Equals', 'CompareTo', 'ToString', 'IndexOfAny', 'ToUpperInvariant', 'ToLowerInvariant'],
  List: ['Add', 'AddRange', 'Remove', 'RemoveAt', 'Insert', 'Contains', 'IndexOf', 'Count', 'Clear', 'Sort', 'Reverse', 'ToArray', 'Find', 'FindAll', 'Exists', 'ForEach', 'RemoveAll', 'FindIndex', 'Max', 'Min', 'Sum', 'Average', 'LastIndexOf', 'TrueForAll', 'GetRange', 'RemoveRange', 'InsertRange', 'Capacity'],
  Dictionary: ['Add', 'ContainsKey', 'ContainsValue', 'Remove', 'Count', 'Keys', 'Values', 'TryGetValue', 'Clear', 'TryAdd'],
  StringBuilder: ['Append', 'AppendLine', 'ToString', 'Length', 'Clear', 'Insert', 'Remove', 'Replace'],
  Console: ['WriteLine', 'Write', 'ReadLine', 'ReadKey', 'Clear', 'ForegroundColor', 'BackgroundColor', 'ResetColor', 'Beep', 'Title'],
  Math: ['Pow', 'Sqrt', 'Round', 'Abs', 'Max', 'Min', 'Floor', 'Ceiling', 'PI', 'Truncate', 'Sign', 'E', 'Log', 'Log10', 'Exp', 'Sin', 'Cos', 'Tan', 'Clamp', 'Cbrt'],
  Convert: ['ToInt32', 'ToDouble', 'ToDecimal', 'ToString', 'ToBoolean', 'ToChar', 'ToInt64', 'ToByte', 'ToSingle', 'ToInt16', 'ToBase64String'],
  File: ['Exists', 'WriteAllText', 'ReadAllText', 'AppendAllText', 'WriteAllLines', 'ReadAllLines', 'AppendAllLines', 'Delete', 'Copy', 'Move'],
  Random: ['Next', 'NextDouble'],
  DateTime: ['Now', 'Today', 'Year', 'Month', 'Day', 'Hour', 'Minute', 'Second', 'DayOfWeek', 'AddDays', 'AddMinutes', 'AddHours', 'AddMonths', 'AddYears', 'AddSeconds', 'Parse', 'ParseExact', 'TryParse', 'ToShortDateString', 'ToLongDateString', 'ToShortTimeString', 'Date', 'DayOfYear'],
};

Object.assign(Compiler.prototype, {

  cx(e, exp, isStmt) {
    switch (e.k) {
      case '$raw': return e.r;
      case 'Lit': return this.cLit(e, exp);
      case 'Interp': return this.cInterp(e);
      case 'Name': return this.cName(e);
      case 'Member': return this.cMember(e);
      case 'Call': return this.cCall(e, isStmt);
      case 'Index': return this.cIndex(e);
      case 'Paren': { const r = this.cx(e.e, exp); return { c: '(' + r.c + ')', t: r.t, cv: r.cv, mg: r.mg, lam: r.lam, ast: r.ast }; }
      case 'Unary': return this.cUnary(e);
      case 'Pre': case 'Post': return this.cIncDec(e, isStmt);
      case 'Bin': return this.cBin(e, exp);
      case 'Assign': return this.cAssign(e, isStmt);
      case 'Cond': return this.cCond(e, exp);
      case 'Cast': return this.cCast(e);
      case 'Is': return this.cIs(e);
      case 'IsNull': { const r = this.cx(e.e); if (isValueType(r.t) && r.t.k !== 'nullable') return { c: e.not ? '(true)' : '(false)', t: T.bool }; return { c: `(${r.c} ${e.not ? '!==' : '==='} null)`, t: T.bool }; }
      case 'As': return this.cAs(e);
      case 'New': return this.cNew(e, exp);
      case 'NewArray': return this.cNewArray(e, exp);
      case 'Lambda': return { c: null, t: T.lambda, lam: e };
      case 'This': {
        if (this.fn.isStatic) this.err("Keyword 'this' is not valid in a static property, static method, or static field initializer", e.line);
        return { c: '$t', t: this.fn.cls.ty, isThis: true };
      }
      case 'Base': this.err("Use of keyword 'base' is not valid in this context", e.line); break;
      case 'Typeof': {
        const t = this.resolveType(e.type, true);
        const full = t.k === 'class' || t.k === 'enum' ? t.c.full : PRIM_FULL[t.k] || ('System.' + tyStr(t));
        const short = t.k === 'class' || t.k === 'enum' ? t.c.name : full.split('.').pop();
        return { c: `$rt.typeObj(${JSON.stringify(short)}, ${JSON.stringify(full)})`, t: BI.Type };
      }
      case 'Default': {
        const t = e.type ? this.resolveType(e.type) : exp;
        if (!t) this.err("The default literal needs a type here: write default(int) for example", e.line);
        return { c: defaultValueCode(t), t, cv: isNum(t) ? 0 : t.k === 'bool' ? false : undefined };
      }
      case 'TypeExpr': this.err(`'${tyStr(this.resolveType(e.type))}' is a type, which is not valid in the given context`, e.line); break;
      case 'ArrayInit': this.err('Array initializers can only be used in a variable or field initializer. Try using a new expression instead.', e.line); break;
    }
    this.err('Invalid expression', e.line);
  },

  // ------------------------------------------------------------------ literals
  cLit(e, exp) {
    switch (e.lt) {
      case 'int': return { c: jsLit(e.v), t: T.int, cv: e.v };
      case 'long': return { c: jsLit(e.v), t: T.long, cv: e.v };
      case 'double': return { c: jsLit(e.v), t: T.double, cv: e.v };
      case 'float': return { c: jsLit(e.v), t: T.float, cv: e.v };
      case 'decimal': { const d = Dec.parse(e.v); return { c: this.hoist(`$Dec.parse(${JSON.stringify(e.v)})`), t: T.decimal, cv: d }; }
      case 'string': return { c: jsLit(e.v), t: T.string, cv: e.v };
      case 'char': return { c: String(e.v), t: T.char, cv: e.v };
      case 'bool': return { c: String(e.v), t: T.bool, cv: e.v };
      case 'null': return { c: 'null', t: T.null, cv: null };
    }
  },

  constCode(v, t) {
    if (t.k === 'decimal') return this.hoist(`$Dec.parse(${JSON.stringify(v.toString())})`);
    return jsLit(v);
  },

  // ------------------------------------------------------------------ strings
  // JS code giving the C# string form of a value (as Console.WriteLine / + / ToString() would)
  strCode(r) {
    const t = r.t, c = r.c;
    if (r.cv !== undefined && r.cv !== null && t.k !== 'decimal' && t.k !== 'enum') {
      const s = t.k === 'string' ? r.cv : t.k === 'char' ? String.fromCharCode(r.cv) : t.k === 'bool' ? (r.cv ? 'True' : 'False') :
        t.k === 'double' ? fmtDouble(r.cv) : t.k === 'float' ? fmtFloat(r.cv) : (t.k === 'long' || t.k === 'ulong') ? longStr(r.cv) : isIntegral(t) ? String(r.cv) : null;
      if (s !== null) return jsLit(s);
    }
    switch (t.k) {
      case 'string': return `$rt.s(${c})`;
      case 'long': case 'ulong': return `$rt.lstr(${c})`;
      case 'int': case 'short': case 'byte': case 'sbyte': case 'uint': case 'ushort': return `("" + ${c})`;
      case 'double': return `$rt.fd(${c})`;
      case 'float': return `$rt.ff(${c})`;
      case 'char': return `$rt.ch(${c})`;
      case 'bool': return `$rt.b(${c})`;
      case 'decimal': return `$rt.dec(${c})`;
      case 'null': return '""';
      case 'enum': return `$rt.enumName(${t.c.namesConst}, ${c})`;
      case 'nullable': {
        const tmp = this.tmp();
        return `((${tmp} = ${c}) === null ? "" : ${this.strCode({ c: tmp, t: t.of })})`;
      }
      case 'class': case 'object': return `(yield* $rt.strG(${c}))`;
      case 'void': this.err('Cannot convert a void method call to a string: the method does not return a value', r.line || 0); break;
      case 'mgroup': this.err(`Cannot convert method group '${r.mg ? r.mg.name : ''}' to string. Did you forget the brackets () to call it?`, r.line || 0); break;
      case 'lambda': this.err('Cannot convert lambda expression to type string', 0); break;
      case 'typeref': case 'static': this.err(`'${tyStr(t)}' is a type, which is not valid in the given context`, 0); break;
      default: return `$rt.strSync(${c})`;
    }
  },

  // format code for interpolation holes / composite format
  fmtCode(r, fmt) {
    const kind = fmtKind(r.t);
    if (r.t.k === 'class' || r.t.k === 'object') return `(yield* $rt.fmtG(${r.c}, ${jsLit(fmt)}))`;
    if (r.t.k === 'enum') return this.strCode(r);
    if (r.t.k === 'nullable') { const tmp = this.tmp(); return `((${tmp} = ${r.c}) === null ? "" : $rt.fmt(${tmp}, ${jsLit(fmt)}, ${JSON.stringify(fmtKind(r.t.of))}))`; }
    if (kind === 'obj' && !(r.t.k === 'bi')) return `$rt.fmt(${r.c}, ${jsLit(fmt)}, "obj")`;
    return `$rt.fmt(${r.c}, ${jsLit(fmt)}, ${JSON.stringify(kind)})`;
  },

  cInterp(e) {
    const parts = [];
    for (const p of e.parts) {
      if (p.s !== undefined) { parts.push(jsLit(p.s)); continue; }
      const r = this.cx(p.e);
      r.line = p.line;
      if (r.t.k === 'void') this.err('Cannot use a void method call inside an interpolated string: the method does not return a value', p.line);
      let code = p.fmt !== null && p.fmt !== undefined ? this.fmtCode(r, p.fmt) : this.strCode(r);
      if (p.align) {
        const a = this.cx(p.align);
        if (a.cv === undefined || !isIntegral(a.t)) this.err('The alignment in an interpolated string must be a constant whole number, e.g. {name,-10}', p.line);
        code = `$rt.align(${code}, ${a.cv})`;
      }
      parts.push(code);
    }
    if (!parts.length) return { c: '""', t: T.string, cv: '' };
    return { c: '(' + parts.join(' + ') + ')', t: T.string };
  },

  // ------------------------------------------------------------------ names
  // finds a field/property/method in a class chain (and its interfaces)
  findMember(c, name) {
    for (let x = c; x; x = x.base) {
      if (x.fields.has(name)) return x.fields.get(name);
      if (x.props.has(name)) return x.props.get(name);
      if (x.methods.has(name)) return { kind: 'methods', name, cls: c, list: this.collectMethods(c, name) };
    }
    if (c.kind === 'interface') {
      for (const i of this.allIfaces(c)) {
        if (i.props.has(name)) return i.props.get(name);
        if (i.methods.has(name)) return { kind: 'methods', name, cls: c, list: this.collectMethods(c, name) };
      }
    }
    if (name === 'ToString' || name === 'Equals' || name === 'GetHashCode' || name === 'GetType') return { kind: 'methods', name, cls: c, list: [], objOnly: true };
    return null;
  },
  collectMethods(c, name) {
    const out = [], sigs = new Set();
    const add = (m) => { if (!sigs.has(m.sig)) { sigs.add(m.sig); out.push(m); } };
    for (let x = c; x; x = x.base) for (const m of x.methods.get(name) || []) add(m);
    if (c.kind === 'interface') for (const i of this.allIfaces(c)) for (const m of i.methods.get(name) || []) add(m);
    return out;
  },
  memberNames(c) {
    const out = [];
    for (let x = c; x; x = x.base) out.push(...x.fields.keys(), ...x.props.keys(), ...x.methods.keys());
    if (c.kind === 'interface') for (const i of this.allIfaces(c)) out.push(...i.props.keys(), ...i.methods.keys());
    return out;
  },

  canAccess(m, access) {
    access = access || m.access;
    if (access === 'public') return true;
    const from = this.fn ? this.fn.cls : null;
    if (!from) return false;
    const owners = [];
    for (let x = from; x; x = x.outer) owners.push(x);
    if (access === 'private') return owners.includes(m.cls);
    if (access === 'protected') return owners.some((o) => this.isSubclassOf(o, m.cls));
    return true;
  },
  checkAccess(m, line) {
    if (!this.canAccess(m)) this.err(`'${this.memberDisp(m)}' is inaccessible due to its protection level`, line);
  },

  cName(e) {
    const name = e.name;
    if (e.predef) {
      return { c: null, t: { k: 'static', n: name }, isType: true };
    }
    const v = this.lookupVar(name);
    if (v) {
      if (v.localFunc) return { c: null, t: { k: 'mgroup' }, mg: { name, list: [v.localFunc], local: true } };
      this.daCheck(v, e.line);
      if (v.isConst) return { c: this.constCode(v.cv, v.t), t: v.t, cv: v.cv };
      return { c: v.isRef ? `${v.js}.g()` : v.js, t: v.t, v };
    }
    // members of this class, its bases and outer classes
    for (let c = this.fn.cls; c; c = c.outer) {
      const m = this.findMember(c, name);
      if (m && !m.objOnly) return this.memberRef(m, null, e, c !== this.fn.cls);
      if (m && m.objOnly && c === this.fn.cls && !this.fn.isStatic) return { c: null, t: { k: 'mgroup' }, mg: { name, list: [], objOnly: true, obj: { c: '$t', t: c.ty, isThis: true } } };
    }
    // types
    const ty = this.types.get(name);
    if (ty) return { c: null, t: { k: 'typeref', c: ty }, isType: true };
    if (STATIC_BI.has(name) || BI[name] || TYPE_ALIASES[name] || ['CultureInfo', 'Encoding', 'SHA256'].includes(name)) return { c: null, t: { k: 'static', n: TYPE_ALIASES[name] || name }, isType: true };
    if (GENERIC_BI[name] !== undefined) return { c: null, t: { k: 'static', n: name }, isType: true };
    if (name === 'System' || this.userNs.has(name) || [...KNOWN_NS].some((n) => n.startsWith(name + '.'))) return { c: null, t: { k: 'ns', n: name }, isType: true };
    if (name === 'value' && this.fn.kind !== 'setter') this.err(`The name 'value' does not exist in the current context (value can only be used inside a property's set { } block)`, e.line);
    if (['Main', 'args'].includes(name) === false && /^(writeline|readline|write)$/i.test(name)) this.err(`The name '${name}' does not exist in the current context (did you mean Console.${name[0].toUpperCase() === name[0] ? name : name}?)`, e.line);
    this.err(`The name '${name}' does not exist in the current context`, e.line);
  },

  // reference to a field/property/method group found by simple name or member access
  // obj: compiled receiver or null (implicit this / static)
  memberRef(m, obj, e, viaOuter) {
    const line = e.line;
    if (m.kind === 'methods') {
      return { c: null, t: { k: 'mgroup' }, mg: { name: m.name, list: m.list, obj, cls: m.cls, objOnly: m.objOnly, implicit: !obj } };
    }
    this.checkAccess(m, line);
    if (!obj) {
      if (!m.isStatic) {
        if (this.fn.isStatic || viaOuter || this.fn.inCtorInit) {
          this.err(`An object reference is required for the non-static field, method, or property '${this.memberDisp(m)}'`, line);
        }
        if (this.fn.kind === 'fieldinit' && this.fn.member && !this.fn.member.isStatic) {
          this.err(`A field initializer cannot reference the non-static field, method, or property '${this.memberDisp(m)}'`, line);
        }
        obj = { c: '$t', t: this.fn.cls.ty, isThis: true };
      }
    } else if (m.isStatic && !obj.isTypeRef) {
      this.err(`Member '${this.memberDisp(m)}' cannot be accessed with an instance reference; qualify it with a type name instead`, line);
    }
    if (m.kind === 'field') {
      if (m.isConst) {
        if (m.cv === undefined) this.evalConstField(m, line);
        return { c: this.constCode(m.cv, m.t), t: m.t, cv: m.cv, member: m };
      }
      const code = m.isStatic ? `${m.cls.js}.${m.js}` : `${obj.c}.${m.js}`;
      return { c: code, t: m.t, member: m, obj };
    }
    // property
    if (!m.hasGet) return { c: null, t: m.t, member: m, obj, noGet: true };
    if (!this.canAccess(m, m.getAccess)) this.err(`The property or indexer '${m.cls.name}.${m.name}' cannot be used in this context because the get accessor is inaccessible`, line);
    return { c: this.propGet(m, obj), t: m.t, member: m, obj };
  },

  propGet(p, obj) {
    if (p.isStatic) return p.isAuto && !p.isVirtual ? `${p.cls.js}.${p.backing}` : `(yield* ${p.cls.js}.${p.gjs}())`;
    if (obj.isBase) return `(yield* ${obj.baseCls.js}.prototype.${p.gjs}.call($t))`;
    if (p.cls.kind === 'interface') return `(yield* ${obj.c}.${p.igjs}())`;
    if (p.isAuto && !p.isVirtual) return `${obj.c}.${p.backing}`;
    return `(yield* ${obj.c}.${p.gjs}())`;
  },
  propSet(p, obj, v) {
    if (p.isStatic) return p.isAuto && !p.isVirtual ? `(${p.cls.js}.${p.backing} = ${v})` : `(yield* ${p.cls.js}.${p.sjs}(${v}))`;
    if (obj.isBase) return `(yield* ${obj.baseCls.js}.prototype.${p.sjs}.call($t, ${v}))`;
    if (p.cls.kind === 'interface') return `(yield* ${obj.c}.${p.isjs}(${v}))`;
    if (p.isAuto && !p.isVirtual) return `(${obj.c}.${p.backing} = ${v})`;
    return `(yield* ${obj.c}.${p.sjs}(${v}))`;
  },

  // ------------------------------------------------------------------ member access
  cMember(e) {
    if (e.obj.k === 'Base') {
      if (this.fn.isStatic) this.err("Keyword 'base' is not valid in a static property, static method, or static field initializer", e.line);
      const bc = this.fn.cls.base;
      if (!bc) {
        if (['ToString', 'Equals', 'GetHashCode'].includes(e.name)) return { c: null, t: { k: 'mgroup' }, mg: { name: e.name, list: [], objOnly: true, base: true, obj: { c: '$t', t: T.object } } };
        this.err(`'object' does not contain a definition for '${e.name}'`, e.line);
      }
      const m = this.findMember(bc, e.name);
      if (!m) this.err(`'${bc.name}' does not contain a definition for '${e.name}'`, e.line);
      const obj = { c: '$t', t: bc.ty, isBase: true, baseCls: bc };
      if (m.kind === 'methods') return { c: null, t: { k: 'mgroup' }, mg: { name: e.name, list: m.list, obj, cls: bc, base: true, objOnly: m.objOnly } };
      if (m.kind === 'prop' && m.isAbstract) this.err(`Cannot call an abstract base member: '${bc.name}.${m.name}'`, e.line);
      return this.memberRef(m, obj, e);
    }
    const o = this.cx(e.obj);
    const t = o.t;
    if (e.nullCond) return this.cNullCond(e, o);
    // namespaces: System.Console etc.
    if (t.k === 'ns') {
      const full = t.n + '.' + e.name;
      const ty = this.types.get(e.name);
      if (ty && (ty.ns === t.n || ty.system)) return { c: null, t: { k: 'typeref', c: ty }, isType: true };
      if (STATIC_BI.has(e.name) || BI[e.name] || TYPE_ALIASES[e.name] || GENERIC_BI[e.name] !== undefined) return { c: null, t: { k: 'static', n: TYPE_ALIASES[e.name] || e.name }, isType: true };
      if (KNOWN_NS.has(full) || this.userNs.has(full) || [...KNOWN_NS].some((n) => n.startsWith(full + '.'))) return { c: null, t: { k: 'ns', n: full }, isType: true };
      this.err(`The type or namespace name '${e.name}' does not exist in the namespace '${t.n}' (are you missing an assembly reference?)`, e.line);
    }
    if (t.k === 'typeref') {
      const c = t.c;
      if (c.kind === 'enum') {
        if (!c.enumVals.has(e.name)) this.err(`'${c.name}' does not contain a definition for '${e.name}'` + this.hint(e.name, [...c.enumVals.keys()]), e.line);
        const v = c.enumVals.get(e.name);
        return { c: String(v), t: c.ty, cv: v };
      }
      // nested type
      const nested = this.types.get(c.name + '.' + e.name);
      if (nested) return { c: null, t: { k: 'typeref', c: nested }, isType: true };
      const m = this.findMember(c, e.name);
      if (!m || m.objOnly) this.err(`'${c.name}' does not contain a definition for '${e.name}'` + this.hint(e.name, this.memberNames(c)), e.line);
      if (m.kind === 'methods') return { c: null, t: { k: 'mgroup' }, mg: { name: e.name, list: m.list, obj: null, cls: c, staticRef: true } };
      if (!m.isStatic) this.err(`An object reference is required for the non-static field, method, or property '${this.memberDisp(m)}'`, e.line);
      return this.memberRef(m, { isTypeRef: true }, e);
    }
    if (t.k === 'static') return this.staticMember(t.n, e.name, e);
    if (t.k === 'mgroup') this.err(`'${o.mg.name}' is a method, which is not valid in the given context. Did you forget the brackets ()?`, e.line);
    if (t.k === 'void') this.err(`Operator '.' cannot be applied to operand of type 'void'`, e.line);
    if (t.k === 'class') {
      const m = this.findMember(t.c, e.name);
      if (!m) this.err(`'${t.c.name}' does not contain a definition for '${e.name}'` + this.hint(e.name, this.memberNames(t.c)), e.line);
      if (m.kind === 'methods') return { c: null, t: { k: 'mgroup' }, mg: { name: e.name, list: m.list, obj: o, cls: t.c, objOnly: m.objOnly } };
      if (m.isStatic) this.err(`Member '${this.memberDisp(m)}' cannot be accessed with an instance reference; qualify it with a type name instead`, e.line);
      return this.memberRef(m, this.simpleObj(o), e);
    }
    return this.builtinMember(o, e.name, e);
  },

  hint(name, cands) {
    const d = didYouMean(name, cands);
    return d ? `. Did you mean '${d}'?` : '';
  },

  // evaluate a receiver once if it isn't a simple name
  simpleObj(o) {
    if (o.isThis || /^[\w$.]+$/.test(o.c)) return o;
    return o;
  },

  cNullCond(e, o) {
    // a?.B  -> (tmp = a) === null ? null : tmp.B
    const tmp = this.tmp();
    const inner = this.cMember({ k: 'Member', obj: { k: '$raw', r: { c: tmp, t: o.t } }, name: e.name, line: e.line });
    if (inner.t.k === 'mgroup') {
      inner.nullCondPrefix = { tmp, src: o.c };
      return inner;
    }
    let t = inner.t;
    if (isValueType(t) && t.k !== 'nullable') t = nullableT(t);
    return { c: `((${tmp} = ${o.c}) === null ? null : ${inner.c})`, t };
  },

  // ------------------------------------------------------------------ conversions
  // can value r be implicitly converted to type t?  returns a score (0 best) or -1
  convScore(r, t) {
    const f = r.t;
    if (tyEq(f, t)) return 0;
    if (t.k === 'var') return 0;
    if (f.k === 'null') return isRefType(t) ? 1 : -1;
    if (f.k === 'lambda') return isDelegate(t) ? 0 : -1;
    if (f.k === 'mgroup') return isDelegate(t) ? 0 : -1;
    if (t.k === 'object') return isRefType(f) || isValueType(f) ? 3 : -1;
    if (isNum(f) && isNum(t)) {
      if ((IMPLICIT_NUM[f.k] || []).includes(t.k)) return 1 + (NUM_RANK[t.k] - NUM_RANK[f.k]) / 10;
      // constant int -> smaller integral
      if (r.cv !== undefined && typeof r.cv === 'number' && (f.k === 'int' || f.k === 'long') && INT_RANGE[t.k] && t.k !== 'char' && Number.isInteger(r.cv)) {
        const [lo, hi] = INT_RANGE[t.k];
        if (r.cv >= lo && r.cv <= hi && (f.k === 'int' || t.k === 'int' || t.k === 'ulong')) return 1.5;
      }
      return -1;
    }
    if (t.k === 'nullable') {
      if (tyEq(f, t.of)) return 1;
      if (f.k === 'null') return 1;
      return this.convScore(r, t.of) >= 0 ? 2 : -1;
    }
    if (f.k === 'class' && t.k === 'class') {
      if (t.c.kind === 'interface') return this.implementsIface(f.c, t.c) ? 2 : -1;
      if (this.isSubclassOf(f.c, t.c)) return 1 + this.classDepth(f.c, t.c) / 10;
      return -1;
    }
    if (f.k === 'array' && t.k === 'array') {
      if (f.rank !== t.rank) return -1;
      if (isRefType(f.el) && isRefType(t.el) && this.convScore({ t: f.el }, t.el) >= 0) return 2;
      return -1;
    }
    if (t.k === 'gen' && t.n === 'IEnumerable') {
      const el = elemType(f);
      if (el && tyEq(el, t.a[0])) return 2;
      if (el && isRefType(el) && this.convScore({ t: el }, t.a[0]) >= 0) return 2.5;
      return -1;
    }
    if (f.k === 'gen' && t.k === 'gen' && isDelegate(f) && isDelegate(t)) {
      const a = delegateSig(f), b = delegateSig(t);
      if (a.params.length === b.params.length && a.params.every((p, i) => tyEq(p, b.params[i])) && tyEq(a.ret, b.ret)) return 1;
    }
    return -1;
  },

  // returns JS code converting r to type t, or throws a C#-style error
  conv(r, t, line) {
    if (t.k === 'var') return r.c;
    const f = r.t;
    if (f.k === 'void') this.err(`Cannot implicitly convert type 'void' to '${tyStr(t)}' (the method doesn't return a value)`, line);
    if (f.k === 'lambda') return this.lambdaTo(r.lam, t, line);
    if (f.k === 'mgroup') return this.mgroupTo(r, t, line);
    if (f.k === 'typeref' || f.k === 'static' || f.k === 'ns') this.err(`'${f.k === 'typeref' ? f.c.name : f.n}' is a type, which is not valid in the given context`, line);
    if (r.noGet) this.err(`The property or indexer '${r.member.cls.name}.${r.member.name}' cannot be used in this context because it lacks the get accessor`, line);
    if (tyEq(f, t)) return r.c;
    const sc = this.convScore(r, t);
    if (sc < 0) {
      const ex = this.explicitOk(f, t);
      if (f.k === 'string' && isNum(t)) this.err(`Cannot implicitly convert type 'string' to '${tyStr(t)}'`, line);
      if (f.k === 'nullable' && tyEq(f.of, t)) this.err(`Cannot implicitly convert type '${tyStr(f)}' to '${tyStr(t)}'. An explicit conversion exists (are you missing a cast?)`, line);
      this.err(`Cannot implicitly convert type '${tyStr(f)}' to '${tyStr(t)}'` + (ex ? '. An explicit conversion exists (are you missing a cast?)' : ''), line);
    }
    // representation changes
    if (t.k === 'decimal' && f.k !== 'decimal') {
      if (r.cv !== undefined) return this.hoist(`$Dec.parse(${JSON.stringify(String(r.cv))})`);
      return `$Dec.fromInt(${r.c})`;
    }
    if (t.k === 'float' && (f.k === 'long' || f.k === 'int')) return `Math.fround(${r.c})`;
    if (t.k === 'object' && f.k === 'char') return `$rt.box(${r.c})`;
    if (t.k === 'nullable' && t.of.k === 'decimal' && f.k !== 'decimal' && f.k !== 'nullable' && f.k !== 'null') return this.conv(r, T.decimal, line);
    return r.c;
  },

  explicitOk(f, t) {
    if (isNum(f) && isNum(t)) return true;
    if ((f.k === 'enum' && isIntegral(t)) || (t.k === 'enum' && isIntegral(f))) return true;
    if (f.k === 'object' || (f.k === 'class' && f.c.kind === 'interface')) return t.k !== 'void';
    if (f.k === 'class' && t.k === 'class') return this.isSubclassOf(t.c, f.c) || t.c.kind === 'interface' || (!f.c.isSealed && t.c.kind === 'interface');
    if (f.k === 'nullable' && tyEq(f.of, t)) return true;
    if (f.k === 'nullable' && isNum(f.of) && isNum(t)) return true;
    return false;
  },

  // explicit (cast) conversion code
  explicitConv(r, t, line, isForeach) {
    const f = r.t, c = r.c;
    if (tyEq(f, t)) return c;
    if (this.convScore(r, t) >= 0 && !(isNum(f) && isNum(t))) return this.conv(r, t, line);
    if (f.k === 'lambda' || f.k === 'mgroup') return this.conv(r, t, line);
    if (isNum(f) && isNum(t)) return this.numConv(r, t, line);
    if (f.k === 'enum' && isIntegral(t)) return this.numConv({ c, t: T.int, cv: r.cv }, t, line);
    if (t.k === 'enum' && (isIntegral(f) || f.k === 'enum')) return f.k === 'enum' ? c : this.numConv(r, T.int, line);
    if (f.k === 'nullable') {
      const tmp = this.tmp();
      const inner = `((${tmp} = ${c}) === null ? $rt.noValue() : ${tmp})`;
      return this.explicitConv({ c: inner, t: f.of }, t, line);
    }
    if (f.k === 'object' || (f.k === 'class' && (f.c.kind === 'interface' || (t.k === 'class' && this.isSubclassOf(t.c, f.c)))) || (f.k === 'class' && t.k === 'class' && t.c.kind === 'interface')) {
      if (t.k === 'class') {
        if (t.c.kind === 'interface') return `$rt.castIface(${c}, ${JSON.stringify(t.c.name)}, ${JSON.stringify(t.c.name)})`;
        return `$rt.cast(${c}, ${t.c.js}, null, ${JSON.stringify(t.c.name)})`;
      }
      if (t.k === 'nullable') return `((${this.tmp()}) , ${c})`;
      const kind = isNum(t) || ['bool', 'char', 'string', 'decimal'].includes(t.k) ? t.k : (t.k === 'bi' && t.n === 'DateTime') ? 'date' : 'other';
      if (f.k === 'object' && (isNum(t) || ['bool', 'char', 'string', 'decimal'].includes(t.k) || kind === 'date')) return `$rt.unbox(${c}, ${JSON.stringify(kind)}, ${JSON.stringify(tyStr(t))})`;
      return c;
    }
    if (isForeach && f.k === 'class' && t.k === 'class') return this.conv(r, t, line);
    this.err(`Cannot convert type '${tyStr(f)}' to '${tyStr(t)}'`, line);
  },

  numConv(r, t, line) {
    const f = r.t, c = r.c;
    if (r.cv !== undefined && r.cv !== null) {
      // fold constant casts
      let v = r.cv;
      if (v instanceof Dec) v = v.toNumber();
      let out;
      switch (t.k) {
        case 'int': out = Number.isInteger(v) ? (v | 0) : (Math.trunc(v) | 0); if (f.k === 'double' || f.k === 'float' || f.k === 'decimal') { if (Math.trunc(v) > 2147483647 || Math.trunc(v) < -2147483648) this.err('Constant value cannot be converted to a \'int\' (use unchecked syntax to override)', line); } break;
        case 'long': out = Math.trunc(v); break;
        case 'short': out = (Math.trunc(v) << 16) >> 16; break;
        case 'byte': out = Math.trunc(v) & 0xFF; break;
        case 'sbyte': out = (Math.trunc(v) << 24) >> 24; break;
        case 'ushort': case 'char': out = Math.trunc(v) & 0xFFFF; break;
        case 'uint': out = Math.trunc(v) >>> 0; break;
        case 'ulong': out = Math.trunc(v); break;
        case 'double': out = v; break;
        case 'float': out = Math.fround(v); break;
        case 'decimal': return this.hoist(`$Dec.parse(${JSON.stringify(r.cv instanceof Dec ? r.cv.toString() : String(r.cv))})`);
      }
      r.cvOut = out;
      return jsLit(out);
    }
    if (f.k === 'decimal') {
      switch (t.k) {
        case 'double': case 'float': return `(${c}).toNumber()`;
        case 'decimal': return c;
        default: return this.numConv({ c: `$rt.decToInt(${c})`, t: T.long }, t, line);
      }
    }
    if (t.k === 'decimal') {
      if (f.k === 'double' || f.k === 'float') return `$Dec.fromNumber(${c})`;
      return `$Dec.fromInt(${c})`;
    }
    const fromReal = f.k === 'double' || f.k === 'float';
    switch (t.k) {
      case 'int': return fromReal ? `$rt.d2i(${c})` : (f.k === 'long' || f.k === 'uint' || f.k === 'ulong') ? `(${c} | 0)` : c;
      case 'long': case 'ulong': return fromReal ? `$rt.d2l(${c})` : c;
      case 'short': return `((${fromReal ? `$rt.d2i(${c})` : c}) << 16 >> 16)`;
      case 'sbyte': return `((${fromReal ? `$rt.d2i(${c})` : c}) << 24 >> 24)`;
      case 'byte': return `((${fromReal ? `$rt.d2i(${c})` : c}) & 255)`;
      case 'ushort': case 'char': return `((${fromReal ? `$rt.d2i(${c})` : c}) & 65535)`;
      case 'uint': return `((${fromReal ? `$rt.d2l(${c})` : c}) >>> 0)`;
      case 'double': return c;
      case 'float': return `Math.fround(${c})`;
    }
    return c;
  },

  lambdaTo(lam, t, line) {
    if (!isDelegate(t)) this.err(`Cannot convert lambda expression to type '${tyStr(t)}' because it is not a delegate type`, line);
    const sig = delegateSig(t);
    return this.compileLambda(lam, sig.params, sig.ret, line).c;
  },
  mgroupTo(r, t, line) {
    if (!isDelegate(t)) this.err(`Cannot convert method group '${r.mg.name}' to non-delegate type '${tyStr(t)}'. Did you intend to invoke the method?`, line);
    const sig = delegateSig(t);
    const m = r.mg.list.find((x) => x.params.length === sig.params.length && x.params.every((p, i) => tyEq(p.t, sig.params[i])));
    if (!m) this.err(`No overload for '${r.mg.name}' matches delegate '${tyStr(t)}'`, line);
    const ps = sig.params.map((_, i) => 'a' + i).join(', ');
    return `(function* (${ps}) { return yield* ${this.callTarget(m, r.mg, line)}(${ps}); })`;
  },

  // ------------------------------------------------------------------ unary / binary
  cUnary(e) {
    const r = this.cx(e.e);
    const t = r.t;
    switch (e.op) {
      case '!':
        if (t.k !== 'bool') this.err(`Operator '!' cannot be applied to operand of type '${tyStr(t)}'`, e.line);
        return { c: `(!${r.c})`, t: T.bool, cv: r.cv !== undefined ? !r.cv : undefined };
      case '-': case '+': {
        if (t.k === 'nullable' && isNum(t.of)) { const tmp = this.tmp(); return { c: `((${tmp} = ${r.c}) === null ? null : ${e.op === '-' ? '-' : '+'}${tmp})`, t }; }
        if (!isNum(t)) this.err(`Operator '${e.op}' cannot be applied to operand of type '${tyStr(t)}'`, e.line);
        let rt = SMALL_INT.has(t.k) ? T.int : t;
        if (t.k === 'uint' && e.op === '-') rt = T.long;
        if (e.op === '+') return { c: r.c, t: rt, cv: r.cv };
        if (r.cv !== undefined) {
          if (r.cv instanceof Dec) return { c: this.hoist(`$Dec.parse(${JSON.stringify(Dec.neg(r.cv).toString())})`), t: rt, cv: Dec.neg(r.cv) };
          let v = -r.cv;
          if (t.k === 'long' && r.cv === 2147483648 && e.e.k === 'Lit') return { c: jsLit(v), t: T.int, cv: v };
          return { c: jsLit(v), t: rt, cv: v };
        }
        if (rt.k === 'decimal') return { c: `$Dec.neg(${r.c})`, t: rt };
        if (rt.k === 'int') return { c: `(-${r.c} | 0)`, t: rt };
        return { c: `(-${r.c})`, t: rt };
      }
      case '~':
        if (!isIntegral(t) && t.k !== 'enum') this.err(`Operator '~' cannot be applied to operand of type '${tyStr(t)}'`, e.line);
        return { c: `(~${r.c})`, t: SMALL_INT.has(t.k) ? T.int : t, cv: r.cv !== undefined ? ~r.cv : undefined };
    }
  },

  // numeric promotion for binary operators
  promote(a, b, op, line) {
    if (a.k === 'decimal' || b.k === 'decimal') {
      if (a.k === 'double' || a.k === 'float' || b.k === 'double' || b.k === 'float') return null;
      return T.decimal;
    }
    if (a.k === 'double' || b.k === 'double') return T.double;
    if (a.k === 'float' || b.k === 'float') return T.float;
    if (a.k === 'ulong' || b.k === 'ulong') return T.ulong;
    if (a.k === 'long' || b.k === 'long') return T.long;
    if ((a.k === 'uint' && ['sbyte', 'short', 'int'].includes(b.k)) || (b.k === 'uint' && ['sbyte', 'short', 'int'].includes(a.k))) return T.long;
    if (a.k === 'uint' || b.k === 'uint') return T.uint;
    return T.int;
  },

  binErr(op, l, r, line) {
    this.err(`Operator '${op}' cannot be applied to operands of type '${tyStr(l.t)}' and '${tyStr(r.t)}'`, line);
  },

  cBin(e, exp) {
    const op = e.op;
    if (op === '&&' || op === '||') {
      const l = this.cx(e.l);
      if (l.t.k !== 'bool') this.err(`Operator '${op}' cannot be applied to operands of type '${tyStr(l.t)}' and '${tyStr(this.peekType(e.r))}'`, e.line);
      // definite assignment: right side only runs sometimes
      const before = this.daClone();
      const r = this.cx(e.r);
      if (r.t.k !== 'bool') this.binErr(op, l, r, e.line);
      this.da = before;
      let cv;
      if (l.cv !== undefined && r.cv !== undefined) cv = op === '&&' ? l.cv && r.cv : l.cv || r.cv;
      return { c: `(${l.c} ${op} ${r.c})`, t: T.bool, cv };
    }
    if (op === '??') return this.cCoalesce(e, exp);
    const l = this.cx(e.l);
    const r = this.cx(e.r);
    if (l.t.k === 'void' || r.t.k === 'void') this.binErr(op, l, r, e.line);
    if (l.t.k === 'mgroup' || r.t.k === 'mgroup') this.err(`Operator '${op}' cannot be applied to operands of type 'method group'. Did you forget the brackets () when calling the method?`, e.line);
    return this.binOp(op, l, r, e.line);
  },

  peekType(e) {
    try { const save = this.pre.length; const r = this.cx(e); this.pre.length = save; return r.t; } catch (x) { return T.object; }
  },

  binOp(op, l, r, line) {
    const lt = l.t, rt = r.t;
    // string concatenation
    if (op === '+' && (lt.k === 'string' || rt.k === 'string')) {
      if (l.cv !== undefined && r.cv !== undefined && l.cv !== null && r.cv !== null && !(l.cv instanceof Dec) && !(r.cv instanceof Dec) && lt.k !== 'enum' && rt.k !== 'enum') {
        const s = JSON.parse(this.strCode(l)) + JSON.parse(this.strCode(r));
        return { c: jsLit(s), t: T.string, cv: s };
      }
      if (lt.k === 'lambda' || rt.k === 'lambda') this.binErr(op, l, r, line);
      l.line = r.line = line;
      return { c: `(${this.strCode(l)} + ${this.strCode(r)})`, t: T.string };
    }
    // nullable arithmetic (lifted operators)
    if (lt.k === 'nullable' || rt.k === 'nullable') {
      if (lt.k === 'null' || rt.k === 'null' || ((op === '==' || op === '!='))) {
        if (op === '==' || op === '!=') return this.eqOp(op, l, r, line);
      }
      const lu = lt.k === 'nullable' ? lt.of : lt, ru = rt.k === 'nullable' ? rt.of : rt;
      const a = this.tmp(), b = this.tmp();
      const inner = this.binOp(op, { c: a, t: lu }, { c: b, t: ru }, line);
      const cmp = ['<', '>', '<=', '>='].includes(op);
      const resT = cmp ? T.bool : nullableT(inner.t);
      return { c: `((${a} = ${l.c}, ${b} = ${r.c}, ${a} === null || ${b} === null) ? ${cmp ? 'false' : 'null'} : ${inner.c})`, t: resT };
    }
    if (op === '==' || op === '!=') return this.eqOp(op, l, r, line);
    // DateTime / TimeSpan arithmetic
    if ((lt.k === 'bi' && (lt.n === 'DateTime' || lt.n === 'TimeSpan')) || (rt.k === 'bi' && (rt.n === 'DateTime' || rt.n === 'TimeSpan'))) {
      const isD = (t) => t.k === 'bi' && t.n === 'DateTime', isS = (t) => t.k === 'bi' && t.n === 'TimeSpan';
      if (op === '-' && isD(lt) && isD(rt)) return { c: `new $rt.CsTimeSpan(${l.c}.ms - ${r.c}.ms)`, t: BI.TimeSpan };
      if ((op === '-' || op === '+') && isD(lt) && isS(rt)) return { c: `new $rt.CsDateTime(${l.c}.ms ${op} ${r.c}.ms)`, t: BI.DateTime };
      if ((op === '-' || op === '+') && isS(lt) && isS(rt)) return { c: `new $rt.CsTimeSpan(${l.c}.ms ${op} ${r.c}.ms)`, t: BI.TimeSpan };
      if (['<', '>', '<=', '>='].includes(op) && tyEq(lt, rt)) return { c: `(${l.c}.ms ${op} ${r.c}.ms)`, t: T.bool };
      this.binErr(op, l, r, line);
    }
    // enums
    if (lt.k === 'enum' || rt.k === 'enum') {
      if (['<', '>', '<=', '>='].includes(op) && tyEq(lt, rt)) return { c: `(${l.c} ${op} ${r.c})`, t: T.bool };
      if ((op === '+' || op === '-') && lt.k === 'enum' && isIntegral(rt)) return { c: `((${l.c} ${op} ${r.c}) | 0)`, t: lt };
      if (op === '-' && tyEq(lt, rt)) return { c: `((${l.c} - ${r.c}) | 0)`, t: T.int };
      if (['&', '|', '^'].includes(op) && tyEq(lt, rt)) return { c: `(${l.c} ${op} ${r.c})`, t: lt };
      this.binErr(op, l, r, line);
    }
    // booleans
    if (lt.k === 'bool' && rt.k === 'bool' && ['&', '|', '^'].includes(op)) {
      const cv = l.cv !== undefined && r.cv !== undefined ? (op === '&' ? l.cv && r.cv : op === '|' ? l.cv || r.cv : l.cv !== r.cv) : undefined;
      return { c: op === '^' ? `(${l.c} !== ${r.c})` : `!!(${l.c} ${op} ${r.c})`, t: T.bool, cv };
    }
    if (!isNum(lt) || !isNum(rt)) {
      if (lt.k === 'string' && rt.k === 'string' && ['<', '>', '<=', '>='].includes(op)) this.err(`Operator '${op}' cannot be applied to operands of type 'string' and 'string' (use string.Compare(a, b) or a.CompareTo(b) to compare text)`, line);
      this.binErr(op, l, r, line);
    }
    // shifts
    if (op === '<<' || op === '>>') {
      if (!isIntegral(lt) || !isIntegral(rt)) this.binErr(op, l, r, line);
      const t = SMALL_INT.has(lt.k) ? T.int : lt;
      if (l.cv !== undefined && r.cv !== undefined && t.k === 'int') { const v = op === '<<' ? l.cv << r.cv : l.cv >> r.cv; return { c: jsLit(v), t, cv: v }; }
      if (t.k === 'long') return { c: `$rt.lshift(${l.c}, ${r.c}, ${JSON.stringify(op)})`, t };
      return { c: `(${l.c} ${op} ${r.c})`, t };
    }
    const t = this.promote(lt, rt, op, line);
    if (!t) this.binErr(op, l, r, line);
    const isCmp = ['<', '>', '<=', '>='].includes(op);
    if (['&', '|', '^'].includes(op) && !isIntegral(t)) this.binErr(op, l, r, line);
    // constant folding
    if (l.cv !== undefined && r.cv !== undefined && l.cv !== null && r.cv !== null) {
      const folded = this.fold(op, l, r, t, line);
      if (folded) return folded;
    }
    const lc = this.conv(l, t, line), rc = this.conv(r, t, line);
    if (isCmp) {
      if (t.k === 'decimal') return { c: `($Dec.cmp(${lc}, ${rc}) ${op} 0)`, t: T.bool };
      return { c: `(${lc} ${op} ${rc})`, t: T.bool };
    }
    if ((op === '/' || op === '%') && isIntegral(t) && r.cv === 0) this.err('Division by constant zero', line);
    switch (t.k) {
      case 'decimal': {
        const fn = { '+': 'add', '-': 'sub', '*': 'mul', '/': 'div', '%': 'mod' }[op];
        return { c: `$Dec.${fn}(${lc}, ${rc})`, t };
      }
      case 'double': return { c: `(${lc} ${op} ${rc})`, t };
      case 'float': return { c: `Math.fround(${lc} ${op} ${rc})`, t };
      case 'int': {
        switch (op) {
          case '+': case '-': return { c: `((${lc} ${op} ${rc}) | 0)`, t };
          case '*': return { c: `Math.imul(${lc}, ${rc})`, t };
          case '/': return r.cv !== undefined && r.cv !== 0 && r.cv !== -1 ? { c: `((${lc} / ${rc}) | 0)`, t } : { c: `$rt.idiv(${lc}, ${rc})`, t };
          case '%': return r.cv !== undefined && r.cv !== 0 ? { c: `((${lc} % ${rc}) | 0)`, t } : { c: `$rt.imod(${lc}, ${rc})`, t };
          default: return { c: `(${lc} ${op} ${rc})`, t };
        }
      }
      case 'uint': {
        switch (op) {
          case '+': case '-': return { c: `((${lc} ${op} ${rc}) >>> 0)`, t };
          case '*': return { c: `(Math.imul(${lc}, ${rc}) >>> 0)`, t };
          case '/': return { c: `$rt.ldiv(${lc}, ${rc})`, t };
          case '%': return { c: `$rt.lmod(${lc}, ${rc})`, t };
          default: return { c: `((${lc} ${op} ${rc}) >>> 0)`, t };
        }
      }
      default: { // long / ulong
        switch (op) {
          case '+': case '-': case '*': return { c: `$rt.lwrap(${lc} ${op} ${rc})`, t };
          case '/': return { c: `$rt.ldiv(${lc}, ${rc})`, t };
          case '%': return { c: `$rt.lmod(${lc}, ${rc})`, t };
          default: return { c: `$rt.lbit(${lc}, ${rc}, ${JSON.stringify(op)})`, t };
        }
      }
    }
  },

  fold(op, l, r, t, line) {
    if (t.k === 'decimal') {
      const a = l.cv instanceof Dec ? l.cv : Dec.parse(String(l.cv)), b = r.cv instanceof Dec ? r.cv : Dec.parse(String(r.cv));
      let v;
      switch (op) {
        case '+': v = Dec.add(a, b); break;
        case '-': v = Dec.sub(a, b); break;
        case '*': v = Dec.mul(a, b); break;
        case '/': if (b.isZero()) this.err('Division by constant zero', line); v = Dec.div(a, b); break;
        case '%': if (b.isZero()) this.err('Division by constant zero', line); v = Dec.mod(a, b); break;
        case '<': case '>': case '<=': case '>=': { const c = Dec.cmp(a, b); const res = op === '<' ? c < 0 : op === '>' ? c > 0 : op === '<=' ? c <= 0 : c >= 0; return { c: String(res), t: T.bool, cv: res }; }
        default: return null;
      }
      return { c: this.hoist(`$Dec.parse(${JSON.stringify(v.toString())})`), t, cv: v };
    }
    const a = l.cv, b = r.cv;
    if (typeof a !== 'number' || typeof b !== 'number') return null;
    let v;
    switch (op) {
      case '+': v = a + b; break;
      case '-': v = a - b; break;
      case '*': v = a * b; break;
      case '/': if (isIntegral(t)) { if (b === 0) this.err('Division by constant zero', line); v = Math.trunc(a / b); } else v = a / b; break;
      case '%': if (isIntegral(t)) { if (b === 0) this.err('Division by constant zero', line); v = a % b; } else v = a % b; break;
      case '<': return { c: String(a < b), t: T.bool, cv: a < b };
      case '>': return { c: String(a > b), t: T.bool, cv: a > b };
      case '<=': return { c: String(a <= b), t: T.bool, cv: a <= b };
      case '>=': return { c: String(a >= b), t: T.bool, cv: a >= b };
      case '&': v = a & b; break;
      case '|': v = a | b; break;
      case '^': v = a ^ b; break;
      default: return null;
    }
    if (t.k === 'float') v = Math.fround(v);
    if (isIntegral(t)) {
      const [lo, hi] = INT_RANGE[t.k] || INT_RANGE.long;
      if (v < lo || v > hi) this.err('The operation overflows at compile time in checked mode', line);
      if (Object.is(v, -0)) v = 0;
    }
    return { c: jsLit(v), t, cv: v };
  },

  eqOp(op, l, r, line) {
    const lt = l.t, rt = r.t;
    const neg = op === '!=';
    const bool = (c, cv) => ({ c, t: T.bool, cv });
    if (l.cv !== undefined && r.cv !== undefined && !(l.cv instanceof Dec) && !(r.cv instanceof Dec)) {
      const eq = l.cv === r.cv;
      return bool(String(neg ? !eq : eq), neg ? !eq : eq);
    }
    // null comparisons
    if (lt.k === 'null' || rt.k === 'null') {
      const other = lt.k === 'null' ? r : l;
      if (other.t.k !== 'null' && isValueType(other.t) && other.t.k !== 'nullable') {
        // C# allows it (always false) but it's almost always a mistake; follow C#
        return bool(neg ? 'true' : 'false', !neg);
      }
      return bool(`(${other.c} ${neg ? '!==' : '==='} null)`);
    }
    if (lt.k === 'nullable' || rt.k === 'nullable') {
      const lu = lt.k === 'nullable' ? lt.of : lt, ru = rt.k === 'nullable' ? rt.of : rt;
      if (lu.k === 'decimal' || ru.k === 'decimal') return bool(`(${neg ? '!' : ''}$Dec.eq(${l.c}, ${r.c}))`);
      if (!(isNum(lu) && isNum(ru)) && !tyEq(lu, ru)) this.binErr(op, l, r, line);
      if (lu.k === 'bi') return bool(`(${neg ? '!' : ''}$rt.eqv(${l.c}, ${r.c}))`);
      return bool(`(${l.c} ${neg ? '!==' : '==='} ${r.c})`);
    }
    if (isNum(lt) && isNum(rt)) {
      const t = this.promote(lt, rt, op, line);
      if (!t) this.binErr(op, l, r, line);
      const lc = this.conv(l, t, line), rc = this.conv(r, t, line);
      if (t.k === 'decimal') return bool(`($Dec.cmp(${lc}, ${rc}) ${neg ? '!==' : '==='} 0)`);
      return bool(`(${lc} ${neg ? '!==' : '==='} ${rc})`);
    }
    if (lt.k === 'bool' && rt.k === 'bool') return bool(`(${l.c} ${neg ? '!==' : '==='} ${r.c})`);
    if (lt.k === 'string' && rt.k === 'string') return bool(`(${l.c} ${neg ? '!==' : '==='} ${r.c})`);
    if (lt.k === 'enum' && tyEq(lt, rt)) return bool(`(${l.c} ${neg ? '!==' : '==='} ${r.c})`);
    if (lt.k === 'bi' && rt.k === 'bi' && lt.n === rt.n && VALUE_BI.has(lt.n)) return bool(`(${l.c}.ms ${neg ? '!==' : '==='} ${r.c}.ms)`);
    if (lt.k === 'gen' && lt.n === 'KeyValuePair') this.binErr(op, l, r, line);
    // reference equality
    if (isRefType(lt) && isRefType(rt)) {
      const related = lt.k === 'object' || rt.k === 'object' || this.convScore(l, rt) >= 0 || this.convScore(r, lt) >= 0 ||
        (lt.k === 'class' && rt.k === 'class' && (lt.c.kind === 'interface' || rt.c.kind === 'interface'));
      if (!related) this.binErr(op, l, r, line);
      return bool(`(${l.c} ${neg ? '!==' : '==='} ${r.c})`);
    }
    this.binErr(op, l, r, line);
  },

  cCoalesce(e, exp) {
    const l = this.cx(e.l);
    if (isValueType(l.t) && l.t.k !== 'nullable') this.err(`Operator '??' cannot be applied to operands of type '${tyStr(l.t)}' and '${tyStr(this.peekType(e.r))}'`, e.line);
    const lt = l.t.k === 'nullable' ? l.t.of : l.t;
    const before = this.daClone();
    const r = this.cx(e.r, lt);
    this.da = before;
    let t = lt;
    if (this.convScore(r, lt) < 0) {
      if (this.convScore({ t: lt }, r.t) >= 0) t = r.t;
      else this.err(`Operator '??' cannot be applied to operands of type '${tyStr(l.t)}' and '${tyStr(r.t)}'`, e.line);
    }
    if (l.t.k === 'nullable' && r.t.k === 'nullable') t = r.t;
    const tmp = this.tmp();
    return { c: `((${tmp} = ${l.c}) !== null ? ${tmp} : ${this.conv(r, t, e.line)})`, t };
  },

  cCond(e, exp) {
    const c = this.cond(e.c, e.line);
    const before = this.daClone();
    const a = this.cx(e.a, exp);
    const daA = this.da;
    this.da = before;
    const b = this.cx(e.b, exp);
    this.da = this.daMeet(daA, this.da);
    let t;
    if (tyEq(a.t, b.t)) t = a.t;
    else if (this.convScore(b, a.t) >= 0 && b.t.k !== 'lambda') t = a.t;
    else if (this.convScore(a, b.t) >= 0 && a.t.k !== 'lambda') t = b.t;
    else if (exp && this.convScore(a, exp) >= 0 && this.convScore(b, exp) >= 0) t = exp;
    else if (a.t.k === 'null' && isValueType(b.t)) t = nullableT(b.t);
    else if (b.t.k === 'null' && isValueType(a.t)) t = nullableT(a.t);
    else this.err(`Type of conditional expression cannot be determined because there is no implicit conversion between '${tyStr(a.t)}' and '${tyStr(b.t)}'`, e.line);
    if (t.k === 'null' && exp) t = exp;
    const ac = this.conv(a, t, e.line), bc = this.conv(b, t, e.line);
    let cv;
    if (c.cv !== undefined) cv = c.cv ? a.cv : b.cv;
    return { c: `(${c.c} ? ${ac} : ${bc})`, t, cv };
  },

  cCast(e) {
    const t = this.resolveType(e.type);
    const r = this.cx(e.e, t);
    if (r.t.k === 'void') this.err(`Cannot convert type 'void' to '${tyStr(t)}'`, e.line);
    if (r.t.k === 'typeref' || r.t.k === 'static') this.err(`'${exprText(e.e)}' is a type, which is not valid in the given context`, e.line);
    if (r.t.k === 'string' && isNum(t)) this.err(`Cannot convert type 'string' to '${tyStr(t)}' (use int.Parse or Convert.ToInt32 to turn text into a number)`, e.line);
    if (isNum(r.t) && t.k === 'string') this.err(`Cannot convert type '${tyStr(r.t)}' to 'string' (use .ToString() instead)`, e.line);
    const rr = Object.assign({}, r);
    const code = this.explicitConv(rr, t, e.line);
    let cv;
    if (rr.cvOut !== undefined) cv = rr.cvOut;
    else if (r.cv !== undefined && tyEq(r.t, t)) cv = r.cv;
    else if (r.cv !== undefined && t.k === 'decimal') cv = r.cv instanceof Dec ? r.cv : Dec.parse(String(r.cv));
    return { c: code, t, cv };
  },

  cIs(e) {
    const r = this.cx(e.e);
    const t = this.resolveType(e.type);
    let test;
    const tmp = this.tmp();
    if (t.k === 'class') {
      if (t.c.kind === 'interface') test = `$rt.isIface(${tmp}, ${JSON.stringify(t.c.name)})`;
      else test = `(${tmp} instanceof ${t.c.js})`;
    } else if (isNum(t) || ['bool', 'char', 'string', 'decimal', 'object'].includes(t.k)) {
      if (r.t.k === 'object' || r.t.k === 'class') test = `$rt.isKind(${tmp}, ${JSON.stringify(t.k)})`;
      else test = tyEq(r.t, t) ? `(${tmp} !== null)` : 'false';
    } else if (t.k === 'gen' && t.n === 'List') test = `(${tmp} instanceof $rt.CsList)`;
    else if (t.k === 'array') test = `Array.isArray(${tmp})`;
    else test = `(${tmp} !== null)`;
    if (e.name) {
      const v = this.declareVar(e.name, t, e.line);
      this.pre.push(v.js);
      const val = t.k === 'char' ? `${tmp}.c` : tmp;
      return { c: `((${tmp} = ${r.c}), ${test} ? (${v.js} = ${val}, true) : false)`, t: T.bool };
    }
    return { c: `((${tmp} = ${r.c}), ${test})`, t: T.bool };
  },

  cAs(e) {
    const r = this.cx(e.e);
    const t = this.resolveType(e.type);
    if (!isRefType(t)) this.err(`The as operator must be used with a reference type or nullable type ('${tyStr(t)}' is a non-nullable value type)`, e.line);
    const tmp = this.tmp();
    let test;
    if (t.k === 'class') test = t.c.kind === 'interface' ? `$rt.isIface(${tmp}, ${JSON.stringify(t.c.name)})` : `(${tmp} instanceof ${t.c.js})`;
    else if (t.k === 'string') test = `(typeof ${tmp} === "string")`;
    else test = `(${tmp} !== null)`;
    return { c: `((${tmp} = ${r.c}), ${test} ? ${tmp} : null)`, t };
  },

  // ------------------------------------------------------------------ assignment
  // describes an assignable location
  lvalue(e, line, compound) {
    const ro = (msg) => this.err(msg, line);
    if (e.k === 'Paren') return this.lvalue(e.e, line, compound);
    if (e.k === 'Name') {
      const v = this.lookupVar(e.name);
      if (v) {
        if (v.localFunc) ro(`Cannot assign to '${e.name}' because it is a 'method group'`);
        if (v.isConst) ro('The left-hand side of an assignment must be a variable, property or indexer');
        if (v.foreachVar) ro(`Cannot assign to '${e.name}' because it is a 'foreach iteration variable'`);
        if (v.readonlyUsing) ro(`Cannot assign to '${e.name}' because it is a 'using variable'`);
        if (compound) this.daCheck(v, line);
        if (v.isRef) return { t: v.t, get: `${v.js}.g()`, set: (x) => `${v.js}.s(${x})`, v, simple: true };
        return { t: v.t, get: v.js, set: (x) => `(${v.js} = ${x})`, v, simple: true };
      }
      const r = this.cName(e);
      return this.lvFromMember(r, e, line);
    }
    if (e.k === 'Member') {
      if (e.nullCond) ro('The left-hand side of an assignment must be a variable, property or indexer');
      const r = this.cMember(e);
      return this.lvFromMember(r, e, line);
    }
    if (e.k === 'Index') return this.cIndex(e, true);
    if (e.k === 'This') ro("Cannot assign to 'this' because it is read-only");
    ro('The left-hand side of an assignment must be a variable, property or indexer');
  },

  lvFromMember(r, e, line) {
    const m = r.member;
    if (r.lvBuiltin) return r.lvBuiltin;
    if (!m) {
      if (r.t.k === 'mgroup') this.err(`Cannot assign to '${r.mg.name}' because it is a 'method group'`, line);
      if (r.cv !== undefined) this.err('The left-hand side of an assignment must be a variable, property or indexer', line);
      if (r.roMsg) this.err(r.roMsg, line);
      this.err('The left-hand side of an assignment must be a variable, property or indexer', line);
    }
    if (m.kind === 'field') {
      if (m.isConst) this.err('The left-hand side of an assignment must be a variable, property or indexer', line);
      if (m.isReadonly) {
        const inCtor = this.fn.cls === m.cls && (this.fn.kind === 'ctor' || this.fn.kind === 'fieldinit' || (m.isStatic && this.fn.member && this.fn.member.kind === 'ctor'));
        if (!inCtor || (this.fn.isStatic !== m.isStatic)) this.err(m.isStatic ? 'A static readonly field cannot be assigned to (except in a static constructor or a variable initializer)' : 'A readonly field cannot be assigned to (except in a constructor or init-only setter of the type in which the field is defined or a variable initializer)', line);
      }
      const code = r.c;
      const obj = r.obj;
      if (!m.isStatic && obj && !obj.isThis && !/^[\w$]+$/.test(obj.c)) {
        const tmp = this.tmp();
        return { t: m.t, prep: `${tmp} = ${obj.c}`, get: `${tmp}.${m.js}`, set: (x) => `(${tmp}.${m.js} = ${x})`, setOnce: (x) => `(${code} = ${x})`, member: m };
      }
      return { t: m.t, get: code, set: (x) => `(${code} = ${x})`, member: m };
    }
    // property
    const p = m;
    const inOwnCtor = this.fn.cls === p.cls && (this.fn.kind === 'ctor' || this.fn.kind === 'fieldinit') && !p.isStatic === !this.fn.isStatic;
    if (!p.hasSet) {
      if (p.isAuto && inOwnCtor && (!r.obj || r.obj.isThis || p.isStatic)) {
        // get-only auto property assigned in its constructor
        const target = p.isStatic ? `${p.cls.js}.${p.backing}` : `$t.${p.backing}`;
        return { t: p.t, get: target, set: (x) => `(${target} = ${x})`, member: p };
      }
      this.err(`Property or indexer '${p.cls.name}.${p.name}' cannot be assigned to -- it is read only`, line);
    }
    if (!this.canAccess(p, p.setAccess)) this.err(`The property or indexer '${p.cls.name}.${p.name}' cannot be used in this context because the set accessor is inaccessible`, line);
    if (p.isInit && !inOwnCtor && !this.inObjInit) this.err(`Init-only property or indexer '${p.cls.name}.${p.name}' can only be assigned in an object initializer, or on 'this' or 'base' in an instance constructor or an 'init' accessor.`, line);
    let obj = r.obj;
    let prep;
    if (!p.isStatic && obj && !obj.isThis && !obj.isBase && !/^[\w$]+$/.test(obj.c)) {
      const tmp = this.tmp();
      prep = `${tmp} = ${obj.c}`;
      obj = { c: tmp, t: obj.t };
    }
    return { t: p.t, prep, get: p.hasGet && !r.noGet ? this.propGet(p, obj) : null, set: (x) => this.propSet(p, obj, x), member: p, isProp: true };
  },

  cAssign(e, isStmt) {
    const line = e.line;
    if (e.op === '=') {
      if (e.l.k === 'Name' && e.r.k !== 'ArrayInit') {
        const v = this.lookupVar(e.l.name);
        if (v && !v.localFunc && !v.isConst && !v.foreachVar && !v.readonlyUsing) {
          const r = this.cx(e.r, v.t);
          if (e.r.k === 'Name' && e.r.name === e.l.name && isStmt) { /* x = x; harmless */ }
          const code = this.conv(r, v.t, line);
          this.daAssign(v);
          return { c: v.isRef ? `${v.js}.s(${code})` : `(${v.js} = ${code})`, t: v.t };
        }
      }
      const lv = this.lvalue(e.l, line, false);
      let code;
      if (e.r.k === 'ArrayInit') code = this.initValue(e.r, lv.t, line);
      else {
        const r = this.cx(e.r, lv.t);
        code = this.conv(r, lv.t, line);
      }
      if (lv.v) this.daAssign(lv.v);
      const set = lv.setOnce ? lv.setOnce(code) : (lv.prep ? `(${lv.prep}, ${lv.set(code)})` : lv.set(code));
      return { c: set, t: lv.t };
    }
    // compound assignment
    const op = e.op.slice(0, -1);
    const lv = this.lvalue(e.l, line, true);
    if (lv.isProp && !lv.get) this.err(`The property or indexer '${lv.member.cls.name}.${lv.member.name}' cannot be used in this context because it lacks the get accessor`, line);
    if (op === '??') {
      const r = this.cx(e.r, lv.t);
      const tmp = this.tmp();
      const code = `(${lv.prep ? lv.prep + ', ' : ''}(${tmp} = ${lv.get}) !== null ? ${tmp} : ${lv.set(this.conv(r, lv.t, line))})`;
      return { c: code, t: lv.t };
    }
    const cur = { c: lv.get, t: lv.t };
    const r = this.cx(e.r, lv.t);
    const res = this.binOp(op, cur, r, line);
    let val;
    if (this.convScore(res, lv.t) >= 0) val = this.conv(res, lv.t, line);
    else if (isNum(res.t) && isNum(lv.t) && !((res.t.k === 'double' || res.t.k === 'float' || res.t.k === 'decimal') && isIntegral(lv.t)) && !(res.t.k === 'decimal' && (lv.t.k === 'double' || lv.t.k === 'float'))) val = this.numConv(res, lv.t, line);
    else if (lv.t.k === 'enum' && isIntegral(res.t)) val = res.c;
    else val = this.conv(res, lv.t, line);
    return { c: lv.prep ? `(${lv.prep}, ${lv.set(val)})` : lv.set(val), t: lv.t };
  },

  cIncDec(e, isStmt) {
    const line = e.line;
    const lv = this.lvalue(e.e, line, true);
    const t = lv.t;
    if (!isNum(t) && t.k !== 'enum' && !(t.k === 'nullable' && isNum(t.of))) this.err(`Operator '${e.op}' cannot be applied to operand of type '${tyStr(t)}'`, line);
    if (lv.isProp && !lv.get) this.err(`The property or indexer '${lv.member.cls.name}.${lv.member.name}' cannot be used in this context because it lacks the get accessor`, line);
    const sign = e.op === '++' ? '+' : '-';
    const step = (x) => {
      switch (t.k) {
        case 'int': return `((${x} ${sign} 1) | 0)`;
        case 'char': case 'ushort': return `((${x} ${sign} 1) & 65535)`;
        case 'byte': return `((${x} ${sign} 1) & 255)`;
        case 'short': return `((${x} ${sign} 1) << 16 >> 16)`;
        case 'sbyte': return `((${x} ${sign} 1) << 24 >> 24)`;
        case 'uint': return `((${x} ${sign} 1) >>> 0)`;
        case 'decimal': return `$Dec.${sign === '+' ? 'add' : 'sub'}(${x}, ${this.hoist('$Dec.parse("1")')})`;
        case 'float': return `Math.fround(${x} ${sign} 1)`;
        case 'nullable': return `(${x} === null ? null : ${x} ${sign} 1)`;
        default: return `(${x} ${sign} 1)`;
      }
    };
    // fast path for local int variables
    if (lv.simple && !lv.v.isRef && (isStmt || e.k === 'Pre') && t.k === 'int') {
      return { c: `(${lv.v.js} = (${lv.v.js} ${sign} 1) | 0)`, t };
    }
    const prep = lv.prep ? lv.prep + ', ' : '';
    if (e.k === 'Pre' || isStmt) return { c: `(${prep}${lv.set(step(lv.get))})`, t };
    const tmp = this.tmp();
    return { c: `(${prep}${tmp} = ${lv.get}, ${lv.set(step(tmp))}, ${tmp})`, t };
  },

  // ------------------------------------------------------------------ indexers
  cIndex(e, asLv) {
    const o = this.cx(e.obj);
    const t = o.t;
    const line = e.line;
    const idx = (i, ty) => { const r = this.cx(e.idx[i], ty); return this.conv(r, ty, line); };
    const idxInt = (i) => {
      const r = this.cx(e.idx[i], T.int);
      if (!isIntegral(r.t) || r.t.k === 'long' && false) {
        if (r.t.k === 'double' || r.t.k === 'float' || r.t.k === 'decimal') this.err(`Cannot implicitly convert type '${tyStr(r.t)}' to 'int'. An explicit conversion exists (are you missing a cast?)`, line);
        this.err(`Cannot implicitly convert type '${tyStr(r.t)}' to 'int'`, line);
      }
      if (r.t.k === 'long') return `(${r.c})`;
      return this.conv(r, T.int, line);
    };
    const mk = (get, set, et, objc, idxs) => {
      if (!asLv) return { c: get(objc, idxs), t: et };
      const temps = [];
      const prepParts = [];
      const tObj = this.tmp(); prepParts.push(`${tObj} = ${objc}`);
      const tIdx = idxs.map((ic) => { const tt = this.tmp(); prepParts.push(`${tt} = ${ic}`); return tt; });
      void temps;
      return { t: et, prep: prepParts.join(', '), get: get(tObj, tIdx), set: (x) => set(tObj, tIdx, x), setOnce: set ? (x) => set(objc, idxs, x) : null };
    };
    if (t.k === 'array') {
      if (e.idx.length !== t.rank) this.err(`Wrong number of indices inside []; expected ${t.rank}`, line);
      const ics = e.idx.map((_, i) => idxInt(i));
      if (t.rank === 1) return mk((a, i) => `$rt.ag(${a}, ${i[0]})`, (a, i, x) => `$rt.as(${a}, ${i[0]}, ${x})`, t.el, o.c, ics);
      if (t.rank === 2) return mk((a, i) => `$rt.ag2(${a}, ${i[0]}, ${i[1]})`, (a, i, x) => `$rt.as2(${a}, ${i[0]}, ${i[1]}, ${x})`, t.el, o.c, ics);
      unsupported('Arrays with more than two dimensions', line);
    }
    if (e.idx.length !== 1) this.err(`Wrong number of indices inside []; expected 1`, line);
    if (t.k === 'string') {
      if (asLv) this.err("Property or indexer 'string.this[int]' cannot be assigned to -- it is read only", line);
      return { c: `$rt.sIdx(${o.c}, ${idxInt(0)})`, t: T.char };
    }
    if (t.k === 'gen' && t.n === 'List') {
      return mk((l, i) => `$rt.lg(${l}, ${i[0]})`, (l, i, x) => `$rt.ls(${l}, ${i[0]}, ${x})`, t.a[0], o.c, [idxInt(0)]);
    }
    if (t.k === 'gen' && t.n === 'Dictionary') {
      return mk((d, i) => `$rt.dget(${d}, ${i[0]})`, (d, i, x) => `$rt.dset(${d}, ${i[0]}, ${x})`, t.a[1], o.c, [idx(0, t.a[0])]);
    }
    if (t.k === 'bi' && t.n === 'StringBuilder') {
      return mk((s, i) => `$rt.sbIdx(${s}, ${i[0]})`, (s, i, x) => `$rt.sbSet(${s}, ${i[0]}, ${x})`, T.char, o.c, [idxInt(0)]);
    }
    if (t.k === 'class') this.err(`Cannot apply indexing with [] to an expression of type '${t.c.name}'`, line);
    this.err(`Cannot apply indexing with [] to an expression of type '${tyStr(t)}'`, line);
  },

  // ------------------------------------------------------------------ calls
  // compiles arguments for a chosen parameter list
  argCodes(m, args, line) {
    const out = [];
    const ps = m.params;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (p.mod === 'params') {
        // params array: either an array argument or a list of elements
        const rest = args.slice(i);
        if (rest.length === 1 && rest[0].ar && this.convScore(rest[0].ar, p.t) >= 0) { out.push(this.conv(rest[0].ar, p.t, line)); break; }
        const items = rest.map((a) => this.conv(a.ar || this.cx(a.e, p.t.el), p.t.el, line));
        out.push(`$rt.arr([${items.join(', ')}], ${JSON.stringify(arrTypeName(p.t.el))})`);
        break;
      }
      const a = args[i];
      if (!a) { out.push(p.defCode !== undefined ? p.defCode : this.defaultArgCode(p, m)); continue; }
      if (p.mod === 'ref' || p.mod === 'out') out.push(this.refArg(a, p, line));
      else {
        const r = a.ar || this.cx(a.e, p.t);
        if (r.t.k === 'lambda') out.push(this.lambdaTo(r.lam, p.t, a.line || line));
        else out.push(this.conv(r, p.t, a.line || line));
      }
    }
    return out;
  },
  defaultArgCode(p, m) {
    if (p.def) {
      const save = this.fn;
      const r = this.cx(p.def, p.t);
      this.fn = save;
      return this.conv(r, p.t, p.line);
    }
    return 'undefined';
  },

  // a ref/out argument: { g, s } pair pointing at a variable
  refArg(a, p, line) {
    if (a.outDecl) {
      const v = this.declareOutVar(a.outDecl, p.t, line);
      return `$rt.ref(() => ${v.js}, ($v) => (${v.js} = $v))`;
    }
    if (a.e.k === 'Name' && a.e.name === '_' && !this.lookupVar('_')) return `$rt.ref(() => undefined, () => 0)`;
    const lv = this.lvalue(a.e, line, p.mod === 'ref');
    if (lv.isProp) this.err('A property or indexer may not be passed as an out or ref parameter', line);
    if (!tyEq(lv.t, p.t)) this.err(`Argument ${a.n}: cannot convert from '${p.mod} ${tyStr(lv.t)}' to '${p.mod} ${tyStr(p.t)}'`, line);
    if (lv.v) {
      if (p.mod === 'out') this.daAssign(lv.v);
      if (lv.v.isRef) return lv.v.js;
      return `$rt.ref(() => ${lv.v.js}, ($v) => (${lv.v.js} = $v))`;
    }
    if (lv.prep) return `(${lv.prep}, $rt.ref(() => ${lv.get}, ($v) => ${lv.set('$v')}))`;
    return `$rt.ref(() => ${lv.get}, ($v) => ${lv.set('$v')})`;
  },
  declareOutVar(od, t, line) {
    let vt = this.resolveType(od.type);
    if (vt.k === 'var') vt = t;
    if (t && !tyEq(vt, t)) this.err(`Argument: cannot convert from 'out ${tyStr(vt)}' to 'out ${tyStr(t)}'`, line);
    if (od.name === '_') { const n = '$d' + (++this.tmpN); this.pre.push(n); return { js: n, t: vt }; }
    const v = this.declareVar(od.name, vt, line);
    this.pre.push(v.js);
    return v;
  },
  // for builtin out parameters: returns a function (valueCode) => assignment code
  outTarget(a, t, line) {
    if (a.mod !== 'out') this.err(`Argument ${a.n} must be passed with the 'out' keyword`, line);
    if (a.outDecl) {
      const v = this.declareOutVar(a.outDecl, t, line);
      return (x) => `(${v.js} = ${x})`;
    }
    if (a.e.k === 'Name' && a.e.name === '_' && !this.lookupVar('_')) return (x) => `(${x})`;
    const lv = this.lvalue(a.e, line, false);
    if (lv.isProp) this.err('A property or indexer may not be passed as an out or ref parameter', line);
    if (!tyEq(lv.t, t)) this.err(`Argument ${a.n}: cannot convert from 'out ${tyStr(lv.t)}' to 'out ${tyStr(t)}'`, line);
    if (lv.v) this.daAssign(lv.v);
    if (lv.prep) return (x) => `(${lv.prep}, ${lv.set(x)})`;
    return (x) => lv.set(x);
  },

  // choose the best overload. args: [{e, mod, outDecl, line}]
  pickOverload(list, args, name, line, what) {
    args.forEach((a, i) => { a.n = i + 1; });
    // pre-compile non-lambda, non-out args once
    for (const a of args) {
      if (a.ar === undefined && !a.outDecl && a.mod !== 'out' && a.mod !== 'ref' && a.e.k !== 'Lambda') {
        const save = this.pre.length;
        a.ar = this.cx(a.e);
        a.ar.line = a.line;
        void save;
      }
      if (a.e && a.e.k === 'Lambda') a.ar = { t: T.lambda, lam: a.e };
    }
    let best = null, bestScore = Infinity, bestCount = 0, countOk = [];
    for (const m of list) {
      const ps = m.params;
      const hasParams = ps.length && ps[ps.length - 1].mod === 'params';
      const required = ps.filter((p) => !p.def && p.mod !== 'params').length;
      const maxArgs = hasParams ? Infinity : ps.length;
      if (args.length < required || args.length > maxArgs) continue;
      countOk.push(m);
      let score = 0, ok = true;
      for (let i = 0; i < args.length && ok; i++) {
        const a = args[i];
        let p = ps[Math.min(i, ps.length - 1)];
        let pt = p.t;
        if (p.mod === 'params') {
          if (args.length === ps.length && a.ar && this.convScore(a.ar, p.t) >= 0) pt = p.t;
          else { pt = p.t.el; score += 0.5; }
        }
        const amod = a.mod || null, pmod = p.mod === 'params' ? null : (p.mod || null);
        if (amod !== pmod) { ok = false; break; }
        if (amod) {
          if (a.outDecl) { const vt = a.outDecl.type.name === 'var' ? pt : this.resolveType(a.outDecl.type); if (!tyEq(vt, pt)) ok = false; continue; }
          continue;
        }
        if (a.ar.t.k === 'lambda') {
          if (!isDelegate(pt)) ok = false;
          else if (delegateSig(pt).params.length !== a.ar.lam.params.length) ok = false;
          continue;
        }
        const s = this.convScore(a.ar, pt);
        if (s < 0) ok = false; else score += s;
      }
      if (!ok) continue;
      score += (ps.length - args.length) * 0.01;
      if (score < bestScore) { best = m; bestScore = score; bestCount = 1; } else if (score === bestScore) bestCount++;
    }
    if (best) return best;
    // explain the failure
    if (!countOk.length) {
      if (list.length === 1 && args.length < list[0].params.length) {
        const p = list[0].params[args.length];
        this.err(`There is no argument given that corresponds to the required parameter '${p.name}' of '${this.mDisp(list[0])}'`, line);
      }
      this.err(`No overload for method '${name}' takes ${args.length} argument${args.length === 1 ? '' : 's'}`, line);
    }
    const m = countOk[0];
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      const p = m.params[Math.min(i, m.params.length - 1)];
      const pmod = p.mod === 'params' ? null : (p.mod || null);
      if ((a.mod || null) !== pmod) {
        if (pmod) this.err(`Argument ${i + 1} must be passed with the '${pmod}' keyword`, a.line || line);
        this.err(`Argument ${i + 1} may not be passed with the '${a.mod}' keyword`, a.line || line);
      }
      if (a.ar && a.ar.t.k !== 'lambda') {
        const pt = p.mod === 'params' ? p.t.el : p.t;
        if (this.convScore(a.ar, pt) < 0) {
          if (a.ar.t.k === 'mgroup') this.err(`Argument ${i + 1}: cannot convert from 'method group' to '${tyStr(pt)}'. Did you forget the brackets () when calling '${a.ar.mg.name}'?`, a.line || line);
          if (a.ar.t.k === 'void') this.err(`Argument ${i + 1}: cannot convert from 'void' to '${tyStr(pt)}' (the method you are calling doesn't return a value)`, a.line || line);
          this.err(`Argument ${i + 1}: cannot convert from '${tyStr(a.ar.t)}' to '${tyStr(pt)}'`, a.line || line);
        }
      }
    }
    this.err(`The best overloaded method match for '${this.mDisp(m)}' has some invalid arguments`, line);
  },

  callTarget(m, mg, line) {
    // returns code for the callable (without arguments)
    if (m.local) return m.js;
    if (m.isStatic) return `${m.cls.js}.${m.js}`;
    let obj = mg.obj;
    if (!obj) {
      if (this.fn.isStatic || this.fn.inCtorInit) this.err(`An object reference is required for the non-static field, method, or property '${this.mDisp(m)}'`, line);
      if (this.fn.kind === 'fieldinit' && this.fn.member && !this.fn.member.isStatic) this.err(`A field initializer cannot reference the non-static field, method, or property '${this.mDisp(m)}'`, line);
      obj = { c: '$t', isThis: true };
    }
    if (mg.base) {
      if (m.isAbstract) this.err(`Cannot call an abstract base member: '${this.mDisp(m)}'`, line);
      return `${mg.obj.baseCls.js}.prototype.${m.js}.call.bind(${mg.obj.baseCls.js}.prototype.${m.js}, $t)`;
    }
    if (m.cls.kind === 'interface') return `${obj.c}.${m.ijs}`;
    return `${obj.c}.${m.js}`;
  },

  callUser(m, mg, args, line) {
    if (!this.canAccess(m)) this.err(`'${this.mDisp(m)}' is inaccessible due to its protection level`, line);
    if (!m.isStatic && !m.local && mg.staticRef) this.err(`An object reference is required for the non-static field, method, or property '${this.mDisp(m)}'`, line);
    if (m.isStatic && mg.obj && !mg.obj.isTypeRef && !mg.implicit) this.err(`Member '${this.mDisp(m)}' cannot be accessed with an instance reference; qualify it with a type name instead`, line);
    const codes = this.argCodes(m, args, line);
    const target = this.callTarget(m, mg, line);
    let call;
    if (mg.base) call = `${mg.obj.baseCls.js}.prototype.${m.js}.call($t${codes.length ? ', ' + codes.join(', ') : ''})`;
    else call = `${target}(${codes.join(', ')})`;
    return { c: `$r((yield* ${call}), ${line})`, t: m.ret };
  },

  cCall(e, isStmt) {
    const line = e.line;
    const args = e.args.map((a) => Object.assign({}, a, { line: a.line || line }));
    const fn = e.fn;
    // nameof handled in parser; base(...) etc. handled in ctor
    if (fn.k === 'Member' && fn.obj.k !== 'Base') {
      const o = this.cx(fn.obj);
      if (fn.nullCond) {
        const tmp = this.tmp();
        const inner = this.memberCall({ c: tmp, t: o.t }, fn.name, args, e, isStmt);
        let t = inner.t;
        if (t.k === 'void') return { c: `((${tmp} = ${o.c}) === null ? undefined : ${inner.c})`, t };
        if (isValueType(t) && t.k !== 'nullable') t = nullableT(t);
        return { c: `((${tmp} = ${o.c}) === null ? null : ${inner.c})`, t };
      }
      return this.memberCall(o, fn.name, args, e, isStmt);
    }
    const r = this.cx(fn);
    if (r.t.k === 'mgroup') return this.callGroup(r.mg, args, line);
    if (isDelegate(r.t)) return this.callDelegate(r, args, line);
    if (fn.k === 'Name') {
      if (r.t.k === 'typeref' || r.t.k === 'static') this.err(`'${fn.name}' is a type but is used like a variable`, line);
      this.err(`Non-invocable member '${fn.name}' cannot be used like a method.`, line);
    }
    this.err(`Method name expected`, line);
  },

  callDelegate(r, args, line) {
    const sig = delegateSig(r.t);
    if (args.length !== sig.params.length) this.err(`Delegate '${tyStr(r.t)}' does not take ${args.length} arguments`, line);
    const codes = args.map((a, i) => this.conv(this.cx(a.e, sig.params[i]), sig.params[i], line));
    return { c: `$r((yield* ${r.c}(${codes.join(', ')})), ${line})`, t: sig.ret };
  },

  callGroup(mg, args, line) {
    if (mg.objOnly) return this.objectMethod(mg.obj || { c: '$t', t: this.fn.cls.ty }, mg.name, args, line, mg.base);
    if (mg.nullCondPrefix) { /* handled by caller */ }
    const m = this.pickOverload(mg.list, args, mg.name, line);
    return this.callUser(m, mg, args, line);
  },

  memberCall(o, name, args, e, isStmt) {
    const t = o.t;
    const line = e.line;
    if (t.k === 'ns') {
      const r = this.cMember({ k: 'Member', obj: { k: '$raw', r: o }, name, line });
      return this.cCall({ k: 'Call', fn: { k: '$raw', r }, args, line }, isStmt);
    }
    if (t.k === 'typeref') {
      const c = t.c;
      if (c.kind === 'enum') return this.enumStatic(c, name, args, line);
      const m = this.findMember(c, name);
      if (!m || m.objOnly) this.err(`'${c.name}' does not contain a definition for '${name}'` + this.hint(name, this.memberNames(c)), line);
      if (m.kind !== 'methods') {
        const r = this.memberRef(m, { isTypeRef: true }, e);
        if (isDelegate(r.t)) return this.callDelegate(r, args, line);
        this.err(`Non-invocable member '${c.name}.${name}' cannot be used like a method.`, line);
      }
      const statics = m.list.filter((x) => x.isStatic);
      if (!statics.length) {
        const mm = this.pickOverload(m.list, args, name, line);
        this.err(`An object reference is required for the non-static field, method, or property '${this.mDisp(mm)}'`, line);
      }
      const mm = this.pickOverload(m.list, args, name, line);
      if (!mm.isStatic) this.err(`An object reference is required for the non-static field, method, or property '${this.mDisp(mm)}'`, line);
      return this.callUser(mm, { obj: { isTypeRef: true }, cls: c }, args, line);
    }
    if (t.k === 'static') return this.staticCall(t.n, name, args, e, isStmt);
    if (t.k === 'class') {
      const m = this.findMember(t.c, name);
      if (!m) this.err(`'${t.c.name}' does not contain a definition for '${name}'` + this.hint(name, this.memberNames(t.c)), line);
      if (m.kind !== 'methods') {
        const r = this.memberRef(m, o, e);
        if (isDelegate(r.t)) return this.callDelegate(r, args, line);
        this.err(`Non-invocable member '${t.c.name}.${name}' cannot be used like a method.`, line);
      }
      if (m.objOnly) return this.objectMethod(o, name, args, line);
      // user methods named like object methods with matching overload
      const mm = this.pickOverloadOrObject(m.list, args, name, line, o);
      if (mm.isObj) return mm.r;
      return this.callUser(mm, { obj: o, cls: t.c }, args, line);
    }
    if (t.k === 'mgroup') this.err(`'${o.mg.name}' is a method, which is not valid in the given context. Did you forget the brackets ()?`, line);
    if (t.k === 'void') this.err(`Operator '.' cannot be applied to operand of type 'void'`, line);
    if (t.k === 'null') this.err(`Operator '.' cannot be applied to operand of type '<null>'`, line);
    if (isDelegate(t) && name === 'Invoke') return this.callDelegate(o, args, line);
    return this.builtinCall(o, name, args, e, isStmt);
  },

  pickOverloadOrObject(list, args, name, line, o) {
    if (['ToString', 'Equals', 'GetHashCode', 'GetType'].includes(name)) {
      const fits = list.filter((m) => m.params.length === args.length);
      if (!fits.length) return { isObj: true, r: this.objectMethod(o, name, args, line) };
    }
    return this.pickOverload(list, args, name, line);
  },

  // ToString / Equals / GetHashCode / GetType available on every value
  objectMethod(o, name, args, line, isBase) {
    const t = o.t;
    switch (name) {
      case 'ToString':
        if (args.length === 0) {
          if (isBase) return { c: `(yield* $rt.CsObject.prototype.M$ToString$.call($t))`, t: T.string };
          if (t.k === 'class' || t.k === 'object') return { c: `$r((yield* ${o.c}.M$ToString$()), ${line})`, t: T.string };
          return { c: this.strCode(o), t: T.string };
        }
        break;
      case 'Equals':
        if (args.length === 1) {
          const a = this.cx(args[0].e);
          if (isBase) return { c: `(${o.c} === ${a.c})`, t: T.bool };
          if (t.k === 'class' || t.k === 'object') return { c: `$r((yield* $rt.eqG(${o.c}, ${this.conv(a, T.object, line)})), ${line})`, t: T.bool };
          if (t.k === 'string' && a.t.k === 'string') return { c: `(${o.c} === ${a.c})`, t: T.bool };
          if (isNum(t) && isNum(a.t)) {
            if (tyEq(t, a.t) || this.convScore(a, t) >= 0) return this.eqOp('==', o, a, line);
            return { c: 'false', t: T.bool };
          }
          return { c: `$rt.eqv(${o.c}, ${this.conv(a, T.object, line)})`, t: T.bool };
        }
        break;
      case 'GetHashCode':
        if (args.length === 0) {
          if (t.k === 'class' || t.k === 'object') return { c: `(yield* ${o.c}.M$GetHashCode$())`, t: T.int };
          return { c: `$rt.hash(${o.c})`, t: T.int };
        }
        break;
      case 'GetType':
        if (args.length === 0) return { c: `$rt.typeOf(${t.k === 'char' ? `$rt.box(${o.c})` : t.k === 'enum' ? JSON.stringify(t.c.name) : o.c})`, t: BI.Type };
        break;
      default: return null;
    }
    this.err(`No overload for method '${name}' takes ${args.length} argument${args.length === 1 ? '' : 's'}`, line);
  },

  // ------------------------------------------------------------------ object creation
  cNew(e, exp) {
    const line = e.line;
    let t = e.type ? this.resolveType(e.type) : exp;
    if (!t) this.err("There is no target type for 'new()': write the type, e.g. new Pupil()", line);
    const args = e.args.map((a) => Object.assign({}, a, { line: a.line || line }));
    let objCode;
    if (t.k === 'class') {
      const c = t.c;
      if (c.kind === 'interface') this.err(`Cannot create an instance of the abstract type or interface '${c.name}'`, line);
      if (c.isStatic) this.err(`Cannot create an instance of the static class '${c.name}'`, line);
      if (c.isAbstract) this.err(`Cannot create an instance of the abstract type '${c.name}'`, line);
      const call = this.resolveCtorCall(c, args, line);
      objCode = `$r((yield* new ${c.js}().${call.m.js}(${call.args.join(', ')})), ${line})`;
    } else if (t.k === 'enum') {
      objCode = '0';
    } else {
      objCode = this.newBuiltin(t, args, line, e);
    }
    if (!e.init) return { c: objCode, t };
    return this.objInit(objCode, t, e.init, line);
  },

  resolveCtorCall(c, args, line, isChain) {
    const k = this.pickOverload(c.ctors, args, c.name, line, 'ctor');
    if (!this.canAccess(k)) this.err(`'${this.mDisp(k)}' is inaccessible due to its protection level`, line);
    return { m: k, args: this.argCodes(k, args, line) };
  },

  objInit(objCode, t, init, line) {
    const tmp = this.tmp();
    const parts = [`${tmp} = ${objCode}`];
    const objR = { c: tmp, t };
    if (init.k === 'obj') {
      const seen = new Set();
      for (const it of init.items) {
        if (seen.has(it.name)) this.err(`Duplicate initialization of member '${it.name}'`, it.line);
        seen.add(it.name);
        let lv;
        this.inObjInit = true;
        try {
          if (t.k === 'class') {
            const m = this.findMember(t.c, it.name);
            if (!m || m.kind === 'methods') this.err(`'${t.c.name}' does not contain a definition for '${it.name}'` + this.hint(it.name, this.memberNames(t.c)), it.line);
            if (m.isStatic) this.err(`Static field or property '${t.c.name}.${it.name}' cannot be assigned in an object initializer`, it.line);
            const r = this.memberRef(m, objR, { line: it.line });
            lv = this.lvFromMember(r, null, it.line);
          } else {
            const r = this.builtinMember(objR, it.name, { line: it.line });
            lv = this.lvFromMember(r, null, it.line);
          }
        } finally { this.inObjInit = false; }
        const r = this.cx(it.e, lv.t);
        parts.push(lv.set(this.conv(r, lv.t, it.line)));
      }
    } else if (init.k === 'coll') {
      if (t.k === 'gen' && (t.n === 'List' || t.n === 'HashSet' || t.n === 'Queue' || t.n === 'Stack')) {
        for (const it of init.items) {
          if (it.es.length !== 1) this.err(`No overload for method 'Add' takes ${it.es.length} arguments`, it.line);
          const r = this.cx(it.es[0], t.a[0]);
          const v = this.conv(r, t.a[0], it.line);
          parts.push(t.n === 'HashSet' ? `${tmp}.m.add($rt.mkey(${v}))` : `${tmp}.a.push(${v})`);
        }
      } else if (t.k === 'gen' && t.n === 'Dictionary') {
        for (const it of init.items) {
          if (it.es.length !== 2) this.err(`No overload for method 'Add' takes ${it.es.length} arguments`, it.line);
          const k = this.conv(this.cx(it.es[0], t.a[0]), t.a[0], it.line);
          const v = this.conv(this.cx(it.es[1], t.a[1]), t.a[1], it.line);
          parts.push(`$rt.dadd(${tmp}, ${k}, ${v})`);
        }
      } else this.err(`Cannot initialize type '${tyStr(t)}' with a collection initializer because it does not implement 'System.Collections.IEnumerable'`, line);
    } else if (init.k === 'index') {
      if (!(t.k === 'gen' && t.n === 'Dictionary')) this.err(`Cannot apply indexing with [] to an expression of type '${tyStr(t)}'`, line);
      for (const it of init.items) {
        const k = this.conv(this.cx(it.key, t.a[0]), t.a[0], it.line);
        const v = this.conv(this.cx(it.e, t.a[1]), t.a[1], it.line);
        parts.push(`$rt.dset(${tmp}, ${k}, ${v})`);
      }
    }
    parts.push(tmp);
    return { c: `(${parts.join(', ')})`, t };
  },

  // ------------------------------------------------------------------ arrays
  cNewArray(e, exp) {
    const line = e.line;
    if (!e.et) {
      // new[] { ... }: infer the element type
      if (!e.init.items.length) this.err('No best type found for implicitly-typed array', line);
      const rs = e.init.items.map((x) => this.cx(x));
      let el = rs[0].t;
      for (const r of rs) { if (this.convScore({ t: r.t, cv: r.cv }, el) < 0) { if (this.convScore({ t: el }, r.t) >= 0) el = r.t; else this.err('No best type found for implicitly-typed array', line); } }
      if (el.k === 'null') this.err('No best type found for implicitly-typed array', line);
      const t = arrT(el, 1);
      return { c: `$rt.arr([${rs.map((r) => this.conv(r, el, line)).join(', ')}], ${JSON.stringify(arrTypeName(el))})`, t };
    }
    let el = this.resolveType(e.et);
    const t = arrT(el, e.rank);
    if (e.init && e.sizes) {
      // new int[3] { 1, 2, 3 }: sizes must be constants matching the initialiser
      const r0 = this.cx(e.sizes[0]);
      if (r0.cv === undefined) this.err('A constant value is expected', line);
      if (e.rank === 1 && r0.cv !== e.init.items.length) this.err(`An array initializer of length '${r0.cv}' is expected`, line);
    }
    if (e.init) return { c: this.arrayInitCode(e.init, t), t };
    const sizes = e.sizes.map((s) => {
      const r = this.cx(s, T.int);
      if (!isIntegral(r.t)) {
        if (r.t.k === 'double' || r.t.k === 'float' || r.t.k === 'decimal') this.err(`Cannot implicitly convert type '${tyStr(r.t)}' to 'int'. An explicit conversion exists (are you missing a cast?)`, line);
        this.err(`Cannot implicitly convert type '${tyStr(r.t)}' to 'int'`, line);
      }
      if (r.cv !== undefined && r.cv < 0) this.err('Cannot create an array with a negative size', line);
      return r.c;
    });
    const fill = defaultValueCode(el);
    const tn = JSON.stringify(arrTypeName(el, e.rank));
    if (e.rank === 1) {
      if (fill.startsWith('new ')) return { c: `$rt.newArrF(${sizes[0]}, () => ${fill}, ${tn})`, t };
      return { c: `$rt.newArr(${sizes[0]}, ${fill}, ${tn})`, t };
    }
    if (e.rank === 2) return { c: `$rt.newArr2(${sizes[0]}, ${sizes[1]}, ${fill}, ${tn})`, t };
    unsupported('Arrays with more than two dimensions', line);
  },

  arrayInitCode(init, t) {
    const tn = JSON.stringify(arrTypeName(t.el, t.rank));
    if (t.rank === 1) {
      const items = init.items.map((x) => {
        if (x.k === 'ArrayInit') {
          if (t.el.k === 'array') return this.arrayInitCode(x, t.el);
          this.err('Array initializers can only be used in a variable or field initializer. Try using a new expression instead.', x.line);
        }
        const r = this.cx(x, t.el);
        return this.conv(r, t.el, x.line);
      });
      return `$rt.arr([${items.join(', ')}], ${tn})`;
    }
    if (t.rank === 2) {
      let width = -1;
      const rows = init.items.map((row) => {
        if (row.k !== 'ArrayInit') this.err('An array initializer of the form { { ... }, { ... } } is expected for a 2D array', row.line);
        if (width >= 0 && row.items.length !== width) this.err(`An array initializer of length '${width}' is expected`, row.line);
        width = row.items.length;
        return '[' + row.items.map((x) => this.conv(this.cx(x, t.el), t.el, x.line)).join(', ') + ']';
      });
      return `$rt.arr2From([${rows.join(', ')}], ${tn})`;
    }
    unsupported('Arrays with more than two dimensions', init.line);
  },
});


// ===========================================================================
// 11. Compiler: the .NET library subset
// ===========================================================================
//
// Built-in methods are described as pseudo-methods { params, ret, gen } so
// that the normal overload resolution (and its error messages) can be used.
// gen(a, o) receives the converted argument codes and the receiver code.

function bp(t, extra) { return Object.assign({ t, name: 'value' }, extra || {}); }
function bm(cls, name, params, ret, gen, extra) {
  return Object.assign({
    kind: 'method', name, cls: { name: cls }, access: 'public', builtin: true,
    params: params.map((p) => (p && p.t ? p : bp(p))), ret, gen,
  }, extra || {});
}
const OUT = (t) => bp(t, { mod: 'out' });
const REF = (t) => bp(t, { mod: 'ref' });
const OPT = (t, code) => bp(t, { def: true, defCode: code });
const PARAMS = (t) => bp(arrT(t), { mod: 'params' });
const LINQ_NAMES = new Set(['Where', 'Select', 'OrderBy', 'OrderByDescending', 'ThenBy', 'GroupBy', 'Any', 'All', 'First', 'FirstOrDefault',
  'Last', 'LastOrDefault', 'Single', 'Skip', 'Take', 'Distinct', 'Aggregate', 'Zip', 'SelectMany', 'Cast', 'OfType', 'Except', 'Intersect', 'Union', 'ToDictionary', 'Count', 'ElementAt', 'SequenceEqual', 'Concat', 'Prepend', 'Append']);

Object.assign(Compiler.prototype, {

  // helper: evaluate code once if it isn't a plain name
  once(code) {
    if (/^[\w$]+$/.test(code)) return [code, code];
    const t = this.tmp();
    return [`(${t} = ${code})`, t];
  },

  noMember(t, name, line) {
    if (LINQ_NAMES.has(name)) unsupported(`The LINQ method '${name}'`, line);
    const cands = MEMBERS[t.k === 'gen' ? t.n : t.k === 'bi' ? t.n : t.k] || [];
    this.err(`'${tyStr(t)}' does not contain a definition for '${name}'` + this.hint(name, cands), line);
  },

  // equality function code for Contains/IndexOf on element type t
  eqFor(t) {
    if (t.k === 'decimal' || t.k === 'bi' || t.k === 'double' || t.k === 'float') return '$rt.eqv';
    return null;
  },

  // ------------------------------------------------------------------ static properties
  staticMember(n, name, e) {
    const line = e.line;
    const k = (c, t, cv) => ({ c, t, cv });
    const num = (v, t) => ({ c: jsLit(v), t, cv: v });
    switch (n) {
      case 'int': case 'long': case 'short': case 'byte': case 'sbyte': case 'uint': case 'ulong': case 'ushort': case 'char':
        if (name === 'MaxValue') return num(INT_RANGE[n][1], T[n]);
        if (name === 'MinValue') return num(INT_RANGE[n][0], T[n]);
        break;
      case 'double': case 'float':
        switch (name) {
          case 'MaxValue': return num(n === 'float' ? 3.4028234663852886e38 : Number.MAX_VALUE, T[n]);
          case 'MinValue': return num(n === 'float' ? -3.4028234663852886e38 : -Number.MAX_VALUE, T[n]);
          case 'Epsilon': return num(n === 'float' ? 1.401298464324817e-45 : 5e-324, T[n]);
          case 'PositiveInfinity': return num(Infinity, T[n]);
          case 'NegativeInfinity': return num(-Infinity, T[n]);
          case 'NaN': return num(NaN, T[n]);
        }
        break;
      case 'decimal':
        if (name === 'MaxValue') return { c: this.hoist('$Dec.parse("79228162514264337593543950335")'), t: T.decimal };
        if (name === 'MinValue') return { c: this.hoist('$Dec.parse("-79228162514264337593543950335")'), t: T.decimal };
        if (name === 'Zero') return { c: '$Dec0', t: T.decimal };
        if (name === 'One') return { c: this.hoist('$Dec.parse("1")'), t: T.decimal };
        break;
      case 'string': if (name === 'Empty') return k('""', T.string, ''); break;
      case 'bool': if (name === 'TrueString') return k('"True"', T.string, 'True'); if (name === 'FalseString') return k('"False"', T.string, 'False'); break;
      case 'Math': case 'MathF':
        if (name === 'PI') return num(Math.PI, T.double);
        if (name === 'E') return num(Math.E, T.double);
        if (name === 'Tau') return num(2 * Math.PI, T.double);
        break;
      case 'DateTime':
        if (name === 'Now') return k('$rt.nowDate()', BI.DateTime);
        if (name === 'Today') return k('$rt.nowDate().Date', BI.DateTime);
        if (name === 'UtcNow') return k('new $rt.CsDateTime(Date.now())', BI.DateTime);
        if (name === 'MinValue') return k('$DTmin', BI.DateTime);
        if (name === 'MaxValue') return k('new $rt.CsDateTime($rt.utcMs(9999, 12, 31, 23, 59, 59, 999))', BI.DateTime);
        break;
      case 'TimeSpan':
        if (name === 'Zero') return k('$TS0', BI.TimeSpan);
        break;
      case 'Environment':
        if (name === 'NewLine') return k('"\\n"', T.string, '\n');
        if (name === 'TickCount' || name === 'TickCount64') return k('(Date.now() & 2147483647)', T.int);
        if (name === 'UserName') return k('"pupil"', T.string);
        if (name === 'MachineName') return k('"ERGS"', T.string);
        break;
      case 'CultureInfo':
        if (name === 'InvariantCulture' || name === 'CurrentCulture' || name === 'CurrentUICulture') return k(this.hoist(`new $rt.CsCulture(${JSON.stringify(name === 'InvariantCulture' ? '' : 'en-GB')})`), BI.CultureInfo);
        break;
      case 'Encoding':
        if (['UTF8', 'ASCII', 'Unicode', 'Default', 'UTF32'].includes(name)) return k(this.hoist(`new $rt.CsEncoding(${JSON.stringify(name)})`), BI.Encoding);
        break;
      case 'Console':
        if (name === 'ForegroundColor' || name === 'BackgroundColor') {
          const ce = this.types.get('ConsoleColor');
          const prop = name === 'ForegroundColor' ? 'fg' : 'bg';
          const lv = { t: ce.ty, get: `$rt.${prop}Get()`, set: (x) => `$rt.${prop}Set(${x})` };
          return { c: lv.get, t: ce.ty, lvBuiltin: lv };
        }
        if (name === 'Title' || name === 'CursorVisible' || name === 'OutputEncoding' || name === 'InputEncoding') {
          const t = name === 'CursorVisible' ? T.bool : name === 'Title' ? T.string : BI.Encoding;
          const lv = { t, get: name === 'CursorVisible' ? 'true' : 'null', set: (x) => `(${x})` };
          return { c: lv.get, t, lvBuiltin: lv };
        }
        if (name === 'KeyAvailable') return k('false', T.bool);
        if (name === 'WindowWidth' || name === 'BufferWidth') return k('80', T.int);
        if (name === 'WindowHeight' || name === 'BufferHeight') return k('25', T.int);
        if (name === 'CursorLeft' || name === 'CursorTop') unsupported(`Console.${name}`, line);
        break;
      case 'StringComparison': case 'MidpointRounding': case 'StringSplitOptions': case 'DateTimeStyles': case 'NumberStyles': break;
    }
    if (n === 'List' || n === 'Dictionary') this.err(`Using the generic type '${n}' requires type arguments`, line);
    // methods used without brackets: Console.WriteLine;
    const probe = this.staticMethods(n, name);
    if (probe && probe.length) return { c: null, t: { k: 'mgroup' }, mg: { name, list: probe, builtinStatic: n } };
    const cands = MEMBERS[n] || [];
    this.err(`'${n}' does not contain a definition for '${name}'` + this.hint(name, cands), line);
  },

  // ------------------------------------------------------------------ static methods
  staticCall(n, name, args, e, isStmt) {
    const line = e.line;
    // methods that need custom handling of their arguments
    if (n === 'Console' && (name === 'WriteLine' || name === 'Write')) return this.consoleWrite(name === 'WriteLine', args, line);
    if (n === 'string' && name === 'Format') {
      if (!args.length) this.err("No overload for method 'Format' takes 0 arguments", line);
      let a0 = args;
      const first = this.cx(args[0].e);
      if (first.t.k === 'bi' && first.t.n === 'CultureInfo') a0 = args.slice(1);
      return { c: this.compositeCode(a0, line), t: T.string };
    }
    if (n === 'string' && (name === 'Join' || name === 'Concat')) return this.stringJoin(name, args, line);
    if (n === 'Array') return this.arrayStatic(name, args, line);
    if (n === 'Convert' && name === 'ToString') return this.convertToString(args, line);
    if (n === 'Enum') return this.enumStaticCall(name, args, line);
    const list = this.staticMethods(n, name);
    if (!list) {
      if (n === 'List' || n === 'Dictionary') this.err(`Using the generic type '${n}' requires type arguments`, line);
      const cands = MEMBERS[n] || [];
      this.err(`'${n}' does not contain a definition for '${name}'` + this.hint(name, cands), line);
    }
    const m = this.pickOverload(list, args, `${n}.${name}`, line);
    const codes = this.argCodes(m, args, line);
    return { c: m.gen(codes, null, args), t: m.ret };
  },

  staticMethods(n, name) {
    const I = T.int, D = T.double, S = T.string, B = T.bool, C = T.char, O = T.object, M = T.decimal, L = T.long, F = T.float, V = T.void;
    const CI = BI.CultureInfo, DT = BI.DateTime, TS = BI.TimeSpan;
    const SA = arrT(S), BA = arrT(T.byte);
    const m = (params, ret, gen, extra) => bm(n, name, params, ret, gen, extra);
    const parseFor = (t, fn) => {
      const k = t.k;
      if (name === 'Parse') return [m([S], t, (a) => `${fn}(${a[0]})`), m([S, CI], t, (a) => `${fn}(${a[0]})`), m([S, O], t, (a) => `${fn}(${a[0]})`), m([S, O, CI], t, (a) => `${fn}(${a[0]})`)];
      if (name === 'TryParse') {
        const g = (a) => `$rt.tryOut(${fn}, ${a[0]}, ${a[a.length - 1]}, ${defaultValueCode(t)})`;
        return [m([S, OUT(t)], B, g), m([S, O, CI, OUT(t)], B, g), m([S, CI, OUT(t)], B, g)];
      }
      void k;
      return null;
    };
    switch (n) {
      case 'int': case 'long': case 'short': case 'byte':
        if (name === 'Parse' || name === 'TryParse') return parseFor(T[n], `((s) => $rt.parseIntStr(s, ${JSON.stringify(n)}))`);
        if (name === 'IsEvenInteger') return [m([T[n]], B, (a) => `(${a[0]} % 2 === 0)`)];
        if (name === 'IsOddInteger') return [m([T[n]], B, (a) => `(${a[0]} % 2 !== 0)`)];
        break;
      case 'double': case 'float':
        if (name === 'Parse' || name === 'TryParse') return parseFor(T[n], n === 'float' ? '((s) => Math.fround($rt.parseDoubleStr(s)))' : '$rt.parseDoubleStr');
        if (name === 'IsNaN') return [m([D], B, (a) => `Number.isNaN(${a[0]})`)];
        if (name === 'IsInfinity') return [m([D], B, (a) => `(Math.abs(${a[0]}) === Infinity)`)];
        if (name === 'IsPositiveInfinity') return [m([D], B, (a) => `(${a[0]} === Infinity)`)];
        if (name === 'IsNegativeInfinity') return [m([D], B, (a) => `(${a[0]} === -Infinity)`)];
        if (name === 'IsFinite') return [m([D], B, (a) => `Number.isFinite(${a[0]})`)];
        break;
      case 'decimal':
        if (name === 'Parse' || name === 'TryParse') return parseFor(M, '$rt.parseDecStr');
        if (name === 'Round') return [m([M], M, (a) => `$rt.decRound(${a[0]}, 0)`), m([M, I], M, (a) => `$rt.decRound(${a[0]}, ${a[1]})`)];
        break;
      case 'bool':
        if (name === 'Parse' || name === 'TryParse') return parseFor(B, '$rt.parseBoolStr');
        break;
      case 'char': {
        if (name === 'Parse' || name === 'TryParse') return parseFor(C, '$rt.parseCharStr');
        const tests = { IsDigit: 'isDigit', IsLetter: 'isLetter', IsUpper: 'isUpper', IsLower: 'isLower', IsWhiteSpace: 'isWhiteSpace', IsControl: 'isControl',
          IsLetterOrDigit: 'isLetterOrDigit', IsPunctuation: 'isPunct', IsSymbol: 'isSymbol', IsNumber: 'isDigit', IsAsciiDigit: 'isDigit', IsAsciiLetter: 'isLetter' };
        if (tests[name]) return [m([C], B, (a) => `$rt.${tests[name]}(${a[0]})`), m([S, I], B, (a) => `$rt.${tests[name]}($rt.sIdx(${a[0]}, ${a[1]}))`)];
        if (name === 'ToUpper' || name === 'ToUpperInvariant') return [m([C], C, (a) => `$rt.toUpperC(${a[0]})`)];
        if (name === 'ToLower' || name === 'ToLowerInvariant') return [m([C], C, (a) => `$rt.toLowerC(${a[0]})`)];
        if (name === 'GetNumericValue') return [m([C], D, (a) => `$rt.numVal(${a[0]})`)];
        if (name === 'ToString') return [m([C], S, (a) => `$rt.ch(${a[0]})`)];
        break;
      }
      case 'string':
        if (name === 'IsNullOrEmpty') return [m([S], B, (a) => `$rt.isNullOrEmpty(${a[0]})`)];
        if (name === 'IsNullOrWhiteSpace') return [m([S], B, (a) => `$rt.isNullOrWhiteSpace(${a[0]})`)];
        if (name === 'Compare') return [
          m([S, S], I, (a) => `$rt.scmp(${a[0]}, ${a[1]})`),
          m([S, S, B], I, (a) => `(${a[2]} ? $rt.scmpIgnore(${a[0]}, ${a[1]}) : $rt.scmp(${a[0]}, ${a[1]}))`),
          m([S, S, this.enumT('StringComparison')], I, (a) => `($rt.ignoreCase(${a[2]}) ? $rt.scmpIgnore(${a[0]}, ${a[1]}) : $rt.scmp(${a[0]}, ${a[1]}))`)];
        if (name === 'CompareOrdinal') return [m([S, S], I, (a) => `$rt.ncmp(${a[0]}, ${a[1]})`)];
        if (name === 'Equals') return [m([S, S], B, (a) => `(${a[0]} === ${a[1]})`),
          m([S, S, this.enumT('StringComparison')], B, (a) => `($rt.ignoreCase(${a[2]}) ? $rt.sEqIgnore(${a[0]}, ${a[1]}) : ${a[0]} === ${a[1]})`)];
        if (name === 'Copy') return [m([S], S, (a) => a[0])];
        break;
      case 'Math': case 'MathF': {
        const d1 = (fn) => [m([D], D, (a) => `${fn}(${a[0]})`)];
        switch (name) {
          case 'Pow': return [m([D, D], D, (a) => `Math.pow(${a[0]}, ${a[1]})`)];
          case 'Sqrt': return d1('Math.sqrt');
          case 'Cbrt': return d1('Math.cbrt');
          case 'Exp': return d1('Math.exp');
          case 'Log10': return d1('Math.log10');
          case 'Log2': return d1('Math.log2');
          case 'Log': return [m([D], D, (a) => `Math.log(${a[0]})`), m([D, D], D, (a) => `(Math.log(${a[0]}) / Math.log(${a[1]}))`)];
          case 'Sin': case 'Cos': case 'Tan': case 'Asin': case 'Acos': case 'Atan': case 'Sinh': case 'Cosh': case 'Tanh': return d1('Math.' + name.toLowerCase());
          case 'Atan2': return [m([D, D], D, (a) => `Math.atan2(${a[0]}, ${a[1]})`)];
          case 'Floor': return [m([D], D, (a) => `Math.floor(${a[0]})`), m([M], M, (a) => `$rt.decRound(${a[0]}, 0, 3)`)];
          case 'Ceiling': return [m([D], D, (a) => `Math.ceil(${a[0]})`), m([M], M, (a) => `$rt.decRound(${a[0]}, 0, 4)`)];
          case 'Truncate': return [m([D], D, (a) => `Math.trunc(${a[0]})`), m([M], M, (a) => `$rt.decRound(${a[0]}, 0, 2)`)];
          case 'Round': {
            const MR = this.enumT('MidpointRounding');
            return [
              m([D], D, (a) => `$rt.mathRound(${a[0]})`),
              m([D, I], D, (a) => `$rt.mathRound(${a[0]}, ${a[1]})`),
              m([D, MR], D, (a) => `$rt.mathRound(${a[0]}, 0, ${a[1]})`),
              m([D, I, MR], D, (a) => `$rt.mathRound(${a[0]}, ${a[1]}, ${a[2]})`),
              m([M], M, (a) => `$rt.decRound(${a[0]}, 0)`),
              m([M, I], M, (a) => `$rt.decRound(${a[0]}, ${a[1]})`),
              m([M, MR], M, (a) => `$rt.decRound(${a[0]}, 0, ${a[1]})`),
              m([M, I, MR], M, (a) => `$rt.decRound(${a[0]}, ${a[1]}, ${a[2]})`)];
          }
          case 'Abs': return [m([I], I, (a) => `$rt.absI(${a[0]})`), m([L], L, (a) => `Math.abs(${a[0]})`), m([D], D, (a) => `Math.abs(${a[0]})`),
            m([F], F, (a) => `Math.abs(${a[0]})`), m([M], M, (a) => `new $Dec(${a[0]}.m < 0n ? -${a[0]}.m : ${a[0]}.m, ${a[0]}.s)`)];
          case 'Max': case 'Min': {
            const op = name === 'Max' ? '>' : '<';
            const pick = (a) => { const [x1, x2] = this.once(a[0]), [y1, y2] = this.once(a[1]); return `(${x1} ${op}= ${y1} ? ${x2} : ${y2})`; };
            const pickD = (a) => `Math.${name.toLowerCase()}(${a[0]}, ${a[1]})`;
            return [m([I, I], I, pick), m([L, L], L, pick), m([D, D], D, pickD), m([F, F], F, pickD),
              m([M, M], M, (a) => `$rt.decMinMax(${a[0]}, ${a[1]}, ${name === 'Max' ? 1 : -1})`)];
          }
          case 'Sign': return [m([I], I, (a) => `Math.sign(${a[0]})`), m([D], I, (a) => `$rt.signD(${a[0]})`), m([M], I, (a) => `(${a[0]}.m > 0n ? 1 : ${a[0]}.m < 0n ? -1 : 0)`)];
          case 'Clamp': return [m([I, I, I], I, (a) => `$rt.clamp(${a[0]}, ${a[1]}, ${a[2]})`), m([D, D, D], D, (a) => `$rt.clamp(${a[0]}, ${a[1]}, ${a[2]})`)];
        }
        break;
      }
      case 'Convert': {
        const toInt = (bits) => [
          m([S], I, (a) => `$rt.convInt(${a[0]}, ${bits})`),
          m([S, I], I, (a) => `$rt.convIntBase(${a[0]}, ${a[1]})`),
          m([S, CI], I, (a) => `$rt.convInt(${a[0]}, ${bits})`),
          m([D], I, (a) => `$rt.convIntD(${a[0]}, ${bits})`),
          m([F], I, (a) => `$rt.convIntD(${a[0]}, ${bits})`),
          m([M], I, (a) => `$rt.convIntD(${a[0]}.toNumber(), ${bits})`),
          m([L], I, (a) => `$rt.convIntD(${a[0]}, ${bits})`),
          m([I], I, (a) => a[0]),
          m([C], I, (a) => a[0]),
          m([B], I, (a) => `(${a[0]} ? 1 : 0)`),
          m([O], I, (a) => `$rt.convIntObj(${a[0]}, ${bits})`),
        ];
        switch (name) {
          case 'ToInt32': return toInt(32);
          case 'ToInt16': return toInt(16).map((x) => Object.assign(x, { ret: T.short }));
          case 'ToByte': return toInt(8).map((x) => Object.assign(x, { ret: T.byte }));
          case 'ToInt64': return toInt(64).map((x) => Object.assign(x, { ret: L }));
          case 'ToDouble': case 'ToSingle': {
            const r = name === 'ToSingle' ? F : D;
            const w = name === 'ToSingle' ? (c) => `Math.fround(${c})` : (c) => c;
            return [m([S], r, (a) => w(`$rt.convDouble(${a[0]})`)), m([S, CI], r, (a) => w(`$rt.convDouble(${a[0]})`)), m([D], r, (a) => w(a[0])), m([M], r, (a) => w(`${a[0]}.toNumber()`)),
              m([B], r, (a) => `(${a[0]} ? 1 : 0)`), m([O], r, (a) => w(`$rt.convDoubleObj(${a[0]})`))];
          }
          case 'ToDecimal': return [m([S], M, (a) => `$rt.convDec(${a[0]})`), m([S, CI], M, (a) => `$rt.convDec(${a[0]})`), m([I], M, (a) => `$Dec.fromInt(${a[0]})`), m([L], M, (a) => `$Dec.fromInt(${a[0]})`), m([D], M, (a) => `$Dec.fromNumber(${a[0]})`), m([M], M, (a) => a[0]), m([B], M, (a) => `$Dec.fromInt(${a[0]} ? 1 : 0)`)];
          case 'ToBoolean': return [m([S], B, (a) => `$rt.convBool(${a[0]})`), m([I], B, (a) => `(${a[0]} !== 0)`), m([D], B, (a) => `(${a[0]} !== 0)`), m([B], B, (a) => a[0])];
          case 'ToChar': return [m([S], C, (a) => `$rt.parseCharStr(${a[0]})`), m([I], C, (a) => `$rt.convChar(${a[0]})`), m([C], C, (a) => a[0])];
          case 'ToString': return null; // handled in convertToString
          case 'ToBase64String': return [m([BA], S, (a) => `$rt.base64(${a[0]})`)];
          case 'ToHexString': return [m([BA], S, (a) => `$rt.hex(${a[0]}, false, false)`)];
          case 'ToHexStringLower': return [m([BA], S, (a) => `$rt.hex(${a[0]}, true, false)`)];
        }
        break;
      }
      case 'Console':
        switch (name) {
          case 'ReadLine': return [m([], S, () => `(yield $RL)`)];
          case 'ReadKey': return [m([], this.types.get('ConsoleKeyInfo').ty, () => `$rt.keyInfo(yield $RK)`), m([B], this.types.get('ConsoleKeyInfo').ty, (a) => `$rt.keyInfo(yield (${a[0]} ? $RKI : $RK))`)];
          case 'Clear': return [m([], V, () => `$rt.ctx.clear()`)];
          case 'ResetColor': return [m([], V, () => `$rt.resetColor()`)];
          case 'Beep': return [m([], V, () => `undefined`), m([I, I], V, () => 'undefined')];
          case 'Read': unsupported('Console.Read() (use Console.ReadLine() or Console.ReadKey())', 0); break;
          case 'SetCursorPosition': unsupported('Console.SetCursorPosition', 0); break;
        }
        break;
      case 'File': {
        const ES = gen('IEnumerable', [S]);
        const ENC = BI.Encoding;
        switch (name) {
          case 'Exists': return [m([S], B, (a) => `$rt.fileExists(${a[0]})`)];
          case 'ReadAllText': return [m([S], S, (a) => `$rt.fileRead(${a[0]})`), m([S, ENC], S, (a) => `$rt.fileRead(${a[0]})`)];
          case 'ReadAllLines': case 'ReadLines': return [m([S], SA, (a) => `$rt.fileLines(${a[0]})`), m([S, ENC], SA, (a) => `$rt.fileLines(${a[0]})`)];
          case 'WriteAllText': return [m([S, S], V, (a) => `$rt.fileWrite(${a[0]}, $rt.s(${a[1]}), false)`), m([S, S, ENC], V, (a) => `$rt.fileWrite(${a[0]}, $rt.s(${a[1]}), false)`)];
          case 'AppendAllText': return [m([S, S], V, (a) => `$rt.fileWrite(${a[0]}, $rt.s(${a[1]}), true)`), m([S, S, ENC], V, (a) => `$rt.fileWrite(${a[0]}, $rt.s(${a[1]}), true)`)];
          case 'WriteAllLines': return [m([S, ES], V, (a) => `$rt.fileWrite(${a[0]}, $rt.linesText(${a[1]}), false)`), m([S, SA], V, (a) => `$rt.fileWrite(${a[0]}, $rt.linesText(${a[1]}), false)`)];
          case 'AppendAllLines': return [m([S, ES], V, (a) => `$rt.fileWrite(${a[0]}, $rt.linesText(${a[1]}), true)`)];
          case 'Delete': return [m([S], V, (a) => `$rt.fileDelete(${a[0]})`)];
          case 'Copy': return [m([S, S], V, (a) => `$rt.fileCopy(${a[0]}, ${a[1]}, false)`), m([S, S, B], V, (a) => `$rt.fileCopy(${a[0]}, ${a[1]}, ${a[2]})`)];
          case 'Move': return [m([S, S], V, (a) => `$rt.fileMove(${a[0]}, ${a[1]})`)];
          case 'Create': case 'CreateText': return [m([S], BI.StreamWriter, (a) => `$rt.newWriter(${a[0]}, false)`)];
          case 'AppendText': return [m([S], BI.StreamWriter, (a) => `$rt.newWriter(${a[0]}, true)`)];
          case 'OpenText': return [m([S], BI.StreamReader, (a) => `$rt.newReader(${a[0]})`)];
        }
        break;
      }
      case 'Directory': case 'Path':
        unsupported(`'${n}.${name}'`, 0); break;
      case 'Environment':
        if (name === 'Exit') return [m([I], V, () => `$rt.exit()`)];
        break;
      case 'Thread': case 'Task':
        if (name === 'Sleep' || name === 'Delay') return [m([I], V, (a) => `(yield { sleep: ${a[0]} })`)];
        break;
      case 'DateTime':
        switch (name) {
          case 'Parse': return [m([S], DT, (a) => `$rt.parseDateStr(${a[0]})`), m([S, CI], DT, (a) => `$rt.parseDateStr(${a[0]})`)];
          case 'TryParse': return [m([S, OUT(DT)], B, (a) => `$rt.tryOut($rt.parseDateStr, ${a[0]}, ${a[1]}, $DTmin)`), m([S, CI, this.enumT('DateTimeStyles'), OUT(DT)], B, (a) => `$rt.tryOut($rt.parseDateStr, ${a[0]}, ${a[3]}, $DTmin)`)];
          case 'ParseExact': return [m([S, S, CI], DT, (a) => `$rt.parseDateExact(${a[0]}, ${a[1]})`), m([S, S, CI, this.enumT('DateTimeStyles')], DT, (a) => `$rt.parseDateExact(${a[0]}, ${a[1]})`)];
          case 'TryParseExact': return [m([S, S, CI, this.enumT('DateTimeStyles'), OUT(DT)], B, (a) => `$rt.tryOut((s) => $rt.parseDateExact(s, ${a[1]}), ${a[0]}, ${a[4]}, $DTmin)`)];
          case 'DaysInMonth': return [m([I, I], I, (a) => `$rt.daysInMonth(${a[0]}, ${a[1]})`)];
          case 'IsLeapYear': return [m([I], B, (a) => `$rt.isLeap(${a[0]})`)];
          case 'Compare': return [m([DT, DT], I, (a) => `$rt.ncmp(${a[0]}.ms, ${a[1]}.ms)`)];
        }
        break;
      case 'TimeSpan': {
        const f = { FromDays: 86400000, FromHours: 3600000, FromMinutes: 60000, FromSeconds: 1000, FromMilliseconds: 1 }[name];
        if (f) return [m([D], TS, (a) => `new $rt.CsTimeSpan(${a[0]} * ${f})`)];
        if (name === 'Parse') return [m([S], TS, (a) => `$rt.parseTimeSpan(${a[0]})`)];
        break;
      }
      case 'SHA256':
        if (name === 'Create') return [m([], BI.SHA256, () => `new $rt.CsSHA()`)];
        if (name === 'HashData') return [m([BA], BA, (a) => `$rt.arr($rt.sha256($rt.toArr(${a[0]})), "System.Byte[]")`)];
        break;
      case 'BitConverter':
        if (name === 'ToString') return [m([BA], S, (a) => `$rt.hex(${a[0]}, false, true)`)];
        break;
      case 'Encoding': break;
      case 'CultureInfo': break;
      case 'GC': break;
    }
    if (['MD5', 'SHA1', 'SHA512', 'Aes', 'RandomNumberGenerator'].includes(n)) unsupported(`'${n}'`, 0);
    return null;
  },

  enumT(name) { const c = this.types.get(name); return c ? c.ty : T.int; },

  // Convert.ToString needs the static type of its argument
  convertToString(args, line) {
    if (args.length === 2) {
      const a = this.cx(args[0].e), b = this.cx(args[1].e, T.int);
      if (isIntegral(a.t) && isIntegral(b.t)) return { c: `$rt.toBase(${a.c}, ${b.c}, ${JSON.stringify(a.t.k)})`, t: T.string };
      if (b.t.k === 'bi' && b.t.n === 'CultureInfo') return { c: this.strCode(a), t: T.string };
    }
    if (args.length !== 1) this.err(`No overload for method 'ToString' takes ${args.length} arguments`, line);
    const r = this.cx(args[0].e);
    if (r.t.k === 'void') this.err("Argument 1: cannot convert from 'void' to 'object'", line);
    return { c: this.strCode(r), t: T.string };
  },

  // ------------------------------------------------------------------ Console.Write / composite formatting
  consoleWrite(newline, args, line) {
    const nl = newline ? ' + "\\n"' : '';
    if (args.length === 0) {
      if (!newline) this.err("No overload for method 'Write' takes 0 arguments", line);
      return { c: `$rt.write("\\n")`, t: T.void };
    }
    for (const a of args) if (a.mod) this.err(`Argument 1 may not be passed with the '${a.mod}' keyword`, line);
    if (args.length === 1) {
      const r = this.cx(args[0].e);
      r.line = line;
      if (r.t.k === 'void') this.err("Argument 1: cannot convert from 'void' to 'bool' (the method you are printing doesn't return a value)", line);
      if (r.t.k === 'mgroup') this.err(`Argument 1: cannot convert from 'method group' to 'string'. Did you forget the brackets () when calling '${r.mg.name}'?`, line);
      if (r.t.k === 'lambda') this.err("Argument 1: cannot convert from 'lambda expression' to 'string'", line);
      if (r.t.k === 'typeref' || r.t.k === 'static') this.err(`'${exprText(args[0].e)}' is a type, which is not valid in the given context`, line);
      if (r.t.k === 'array' && r.t.el.k === 'char') return { c: `$rt.write($rt.charsToString(${r.c})${nl})`, t: T.void };
      return { c: `$rt.write(${this.strCode(r)}${nl})`, t: T.void };
    }
    return { c: `$rt.write(${this.compositeCode(args, line)}${nl})`, t: T.void };
  },

  compositeCode(args, line) {
    const f = this.cx(args[0].e, T.string);
    if (f.t.k !== 'string') this.err(`Argument 1: cannot convert from '${tyStr(f.t)}' to 'string'`, line);
    let rest = args.slice(1);
    // a single object[] argument supplies all the values
    if (rest.length === 1) {
      const r = this.cx(rest[0].e);
      if (r.t.k === 'array' && (r.t.el.k === 'object' || r.t.el.k === 'string')) return `(yield* $rt.formatArr(${f.c}, ${r.c}))`;
      rest = [{ ar: r }];
    }
    const vals = [], kinds = [];
    for (const a of rest) {
      const r = a.ar || this.cx(a.e);
      r.line = line;
      if (r.t.k === 'void') this.err("Argument 2: cannot convert from 'void' to 'object'", line);
      if (r.t.k === 'class' || r.t.k === 'object') { vals.push(`(yield* $rt.objArg(${r.c}))`); kinds.push('obj'); }
      else if (r.t.k === 'enum' || r.t.k === 'mgroup' || r.t.k === 'lambda') { vals.push(this.strCode(r)); kinds.push('str'); }
      else if (r.t.k === 'nullable') { vals.push(r.c); kinds.push(fmtKind(r.t.of)); }
      else if (r.t.k === 'array' || r.t.k === 'gen') { vals.push(this.strCode(r)); kinds.push('str'); }
      else { vals.push(r.c); kinds.push(fmtKind(r.t)); }
    }
    if (f.cv !== undefined && typeof f.cv === 'string') {
      // check the placeholders at compile time where we can
      const re = /\{\{|\}\}|\{\s*(\d+)/g; let mm;
      while ((mm = re.exec(f.cv))) {
        if (mm[1] !== undefined && parseInt(mm[1], 10) >= vals.length) {
          // C# compiles this but throws at run time; keep the run-time behaviour
        }
      }
    }
    return `$rt.format(${f.c}, [${vals.join(', ')}], ${JSON.stringify(kinds)})`;
  },

  stringJoin(name, args, line) {
    if (name === 'Join') {
      if (args.length < 2) this.err(`No overload for method 'Join' takes ${args.length} arguments`, line);
      const sep = this.cx(args[0].e);
      if (sep.t.k !== 'string' && sep.t.k !== 'char') this.err(`Argument 1: cannot convert from '${tyStr(sep.t)}' to 'string'`, line);
      const sepC = sep.t.k === 'char' ? `$rt.ch(${sep.c})` : sep.c;
      if (args.length === 2) {
        const r = this.cx(args[1].e);
        const el = elemType(r.t);
        if (el && r.t.k !== 'string') {
          if (el.k === 'class' || el.k === 'object') return { c: `(yield* $rt.joinG(${sepC}, $rt.toArr(${r.c})))`, t: T.string };
          if (el.k === 'enum') return { c: `$rt.toArr(${r.c}).map((x) => $rt.enumName(${el.c.namesConst}, x)).join(${sepC})`, t: T.string };
          return { c: `$rt.join(${sepC}, $rt.toArr(${r.c}), ${JSON.stringify(el.k === 'string' ? 'str' : fmtKind(el))})`, t: T.string };
        }
      }
      const parts = args.slice(1).map((a) => this.strCode(Object.assign(this.cx(a.e), { line })));
      return { c: `[${parts.join(', ')}].join(${sepC})`, t: T.string };
    }
    // Concat
    if (args.length === 1) {
      const r = this.cx(args[0].e);
      const el = elemType(r.t);
      if (el && r.t.k !== 'string') {
        if (el.k === 'class' || el.k === 'object') return { c: `(yield* $rt.joinG("", $rt.toArr(${r.c})))`, t: T.string };
        return { c: `$rt.join("", $rt.toArr(${r.c}), ${JSON.stringify(el.k === 'string' ? 'str' : fmtKind(el))})`, t: T.string };
      }
      return { c: this.strCode(r), t: T.string };
    }
    const parts = args.map((a) => this.strCode(Object.assign(this.cx(a.e), { line })));
    return { c: `(${parts.join(' + ') || '""'})`, t: T.string };
  },

  // ------------------------------------------------------------------ Array.*
  arrayStatic(name, args, line) {
    if (!args.length) this.err(`No overload for method '${name}' takes 0 arguments`, line);
    if (name === 'Resize') {
      const a = args[0];
      if (a.mod !== 'ref') this.err("Argument 1 must be passed with the 'ref' keyword", line);
      const lv = this.lvalue(a.e, line, true);
      if (lv.t.k !== 'array') this.err(`Argument 1: cannot convert from 'ref ${tyStr(lv.t)}' to 'ref T[]'`, line);
      const n = this.conv(this.cx(args[1].e, T.int), T.int, line);
      return { c: `$rt.arrResize({ g: () => ${lv.get}, s: ($v) => ${lv.set('$v')}, def: ${defaultValueCode(lv.t.el)} }, ${n})`, t: T.void };
    }
    const a0 = this.cx(args[0].e);
    args[0].ar = a0;
    const at = a0.t;
    if (at.k !== 'array') this.err(`Argument 1: cannot convert from '${tyStr(at)}' to 'System.Array'`, line);
    const el = at.el;
    const I = T.int, B = T.bool, V = T.void;
    const m = (params, ret, gen) => bm('Array', name, params, ret, gen);
    const eq = this.eqFor(el);
    let list = null;
    switch (name) {
      case 'Sort': {
        const kind = el.k === 'bi' && el.n === 'DateTime' ? 'date' : el.k;
        const prim = isNum(el) || ['string', 'bool', 'char', 'enum', 'decimal'].includes(el.k) || kind === 'date';
        list = [m([at], V, (a) => prim ? `$rt.sortPrim(${a[0]}, ${JSON.stringify(kind)})` : `(yield* $rt.sortG(${a[0]}, $rt.defaultCmp))`),
          m([at, gen('Comparison', [el])], V, (a) => `(yield* $rt.sortG(${a[0]}, ${a[1]}))`)];
        break;
      }
      case 'Reverse': list = [m([at], V, (a) => `$rt.arrReverse(${a[0]})`), m([at, I, I], V, (a) => `$rt.arrReverse(${a[0]}, ${a[1]}, ${a[2]})`)]; break;
      case 'IndexOf': list = [m([at, el], I, (a) => `$rt.arrIndexOf(${a[0]}, ${a[1]}, ${eq})`)]; break;
      case 'LastIndexOf': list = [m([at, el], I, (a) => `$rt.arrLastIndexOf(${a[0]}, ${a[1]}, ${eq})`)]; break;
      case 'Copy': list = [m([at, at, I], V, (a) => `$rt.arrCopy(${a[0]}, 0, ${a[1]}, 0, ${a[2]})`), m([at, I, at, I, I], V, (a) => `$rt.arrCopy(${a[0]}, ${a[1]}, ${a[2]}, ${a[3]}, ${a[4]})`)]; break;
      case 'Fill': list = [m([at, el], V, (a) => `$rt.arrFill(${a[0]}, ${a[1]})`)]; break;
      case 'Clear': list = [m([at], V, (a) => `$rt.arrFill(${a[0]}, ${defaultValueCode(el)})`), m([at, I, I], V, (a) => `$rt.arrClear(${a[0]}, ${a[1]}, ${a[2]}, ${defaultValueCode(el)})`)]; break;
      case 'Exists': list = [m([at, gen('Predicate', [el])], B, (a) => `((yield* $rt.findIdx(${a[0]}, ${a[1]})) >= 0)`)]; break;
      case 'Find': list = [m([at, gen('Predicate', [el])], el, (a) => `(yield* $rt.findVal(${a[0]}, ${a[1]}, ${defaultValueCode(el)}))`)]; break;
      case 'FindIndex': list = [m([at, gen('Predicate', [el])], I, (a) => `(yield* $rt.findIdx(${a[0]}, ${a[1]}))`)]; break;
      case 'FindAll': list = [m([at, gen('Predicate', [el])], at, (a) => `$rt.arr((yield* $rt.findAll(${a[0]}, ${a[1]})), ${JSON.stringify(arrTypeName(el))})`)]; break;
      case 'TrueForAll': list = [m([at, gen('Predicate', [el])], B, (a) => `(yield* $rt.trueForAll(${a[0]}, ${a[1]}))`)]; break;
      case 'BinarySearch': list = [m([at, el], I, (a) => `$rt.binSearch(${a[0]}, ${a[1]})`)]; break;
      case 'ConvertAll': unsupported('Array.ConvertAll', line); break;
      case 'Empty': break;
    }
    if (!list) this.err(`'Array' does not contain a definition for '${name}'`, line);
    const mm = this.pickOverload(list, args, `Array.${name}`, line);
    return { c: mm.gen(this.argCodes(mm, args, line)), t: mm.ret };
  },

  // ------------------------------------------------------------------ Enum.*
  enumStaticCall(name, args, line) {
    const enumArg = (i) => {
      const a = args[i];
      if (!a || a.e.k !== 'Typeof') this.err(`Enum.${name} needs typeof(YourEnum) as its first argument in this course`, line);
      const t = this.resolveType(a.e.type);
      if (t.k !== 'enum') this.err(`Type provided must be an Enum. (Parameter 'enumType')`, line);
      return t;
    };
    switch (name) {
      case 'GetValues': { const t = enumArg(0); return { c: `$rt.arr(${JSON.stringify([...t.c.enumVals.values()])}, ${JSON.stringify(t.c.full + '[]')})`, t: arrT(t) }; }
      case 'GetNames': { const t = enumArg(0); return { c: `$rt.arr(${JSON.stringify([...t.c.enumVals.keys()])}, "System.String[]")`, t: arrT(T.string) }; }
      case 'Parse': {
        const t = enumArg(0);
        const s = this.conv(this.cx(args[1].e, T.string), T.string, line);
        const ic = args[2] ? this.conv(this.cx(args[2].e, T.bool), T.bool, line) : 'false';
        return { c: `$rt.enumParse(${this.hoist(JSON.stringify(Object.fromEntries(t.c.enumVals)))}, ${s}, ${ic}, ${JSON.stringify(t.c.name)})`, t: T.object };
      }
      case 'TryParse': {
        // Enum.TryParse(text, out Colour c)  (type taken from the out variable)
        if (args.length < 2) this.err(`No overload for method 'TryParse' takes ${args.length} arguments`, line);
        const last = args[args.length - 1];
        let et;
        if (last.outDecl) et = this.resolveType(last.outDecl.type);
        else { const lv = this.lvalue(last.e, line, false); et = lv.t; }
        if (!et || et.k !== 'enum') this.err('Enum.TryParse needs an out variable of an enum type, e.g. out Colour c', line);
        const s = this.conv(this.cx(args[0].e, T.string), T.string, line);
        const ic = args.length === 3 ? this.conv(this.cx(args[1].e, T.bool), T.bool, line) : 'false';
        const target = this.outTarget(last, et, line);
        const tmp = this.tmp();
        return { c: `((${tmp} = $rt.enumTry(${this.hoist(JSON.stringify(Object.fromEntries(et.c.enumVals)))}, ${s}, ${ic})) === null ? (${target('0')}, false) : (${target(tmp)}, true))`, t: T.bool };
      }
      case 'IsDefined': {
        const t = enumArg(0);
        const v = this.cx(args[1].e);
        return { c: `(${JSON.stringify(Object.fromEntries(t.c.enumVals))}[${this.strCode(v)}] !== undefined || ${JSON.stringify(t.c.enumNames)}[${v.c}] !== undefined)`, t: T.bool };
      }
    }
    this.err(`'Enum' does not contain a definition for '${name}'`, line);
  },
  enumStatic(c, name, args, line) {
    this.err(`'${c.name}' does not contain a definition for '${name}'`, line);
  },

  // ------------------------------------------------------------------ constructors of library types
  newBuiltin(t, args, line, e) {
    const I = T.int, S = T.string, B = T.bool, D = T.double, L = T.long, C = T.char;
    const name = tyStr(t);
    const m = (params, gen) => bm(name, name, params, t, gen, { kind: 'ctor' });
    let list = null;
    if (t.k === 'gen') {
      const tn = JSON.stringify(t.a.map(genTypeArgName).join(','));
      switch (t.n) {
        case 'List': list = [m([], () => `new $rt.CsList([], ${tn})`), m([I], () => `new $rt.CsList([], ${tn})`),
          m([gen('IEnumerable', [t.a[0]])], (a) => `new $rt.CsList($rt.toArr(${a[0]}).slice(), ${tn})`)]; break;
        case 'Dictionary': list = [m([], () => `$rt.newDict(${tn}, ${t.a[0].k === 'char'})`), m([I], () => `$rt.newDict(${tn}, ${t.a[0].k === 'char'})`),
          m([t], (a) => `$rt.dictCopy(${a[0]})`)]; break;
        case 'HashSet': list = [m([], () => `new $rt.CsHashSet()`), m([gen('IEnumerable', [t.a[0]])], (a) => `$rt.hashFrom(${a[0]})`)]; break;
        case 'Queue': list = [m([], () => `new $rt.CsQueue()`), m([gen('IEnumerable', [t.a[0]])], (a) => `$rt.qFrom(new $rt.CsQueue(), ${a[0]})`)]; break;
        case 'Stack': list = [m([], () => `new $rt.CsStack()`), m([gen('IEnumerable', [t.a[0]])], (a) => `$rt.qFrom(new $rt.CsStack(), ${a[0]})`)]; break;
        case 'KeyValuePair': list = [m([t.a[0], t.a[1]], (a) => `new $rt.CsKVP(${a[0]}, ${a[1]})`)]; break;
      }
    } else if (t.k === 'bi') {
      switch (t.n) {
        case 'StringBuilder': list = [m([], () => `new $rt.CsStringBuilder("")`), m([S], (a) => `new $rt.CsStringBuilder($rt.s(${a[0]}))`), m([I], () => `new $rt.CsStringBuilder("")`)]; break;
        case 'Random': list = [m([], () => `new $rt.CsRandom()`), m([I], (a) => `new $rt.CsRandom(${a[0]})`)]; break;
        case 'DateTime': list = [m([], () => '$DTmin'), m([I, I, I], (a) => `$rt.newDate(${a.join(', ')})`), m([I, I, I, I, I, I], (a) => `$rt.newDate(${a.join(', ')})`), m([I, I, I, I, I, I, I], (a) => `$rt.newDate(${a.join(', ')})`)]; break;
        case 'TimeSpan': list = [m([], () => '$TS0'), m([L], (a) => `new $rt.CsTimeSpan(${a[0]} / 10000)`), m([I, I, I], (a) => `new $rt.CsTimeSpan(((${a[0]}) * 3600 + (${a[1]}) * 60 + (${a[2]})) * 1000)`),
          m([I, I, I, I], (a) => `new $rt.CsTimeSpan((((${a[0]}) * 24 + (${a[1]})) * 3600 + (${a[2]}) * 60 + (${a[3]})) * 1000)`)]; break;
        case 'StreamWriter': list = [m([S], (a) => `$rt.newWriter(${a[0]}, false)`), m([S, B], (a) => `$rt.newWriter(${a[0]}, ${a[1]})`)]; break;
        case 'StreamReader': list = [m([S], (a) => `$rt.newReader(${a[0]})`)]; break;
        case 'CultureInfo': list = [m([S], (a) => `new $rt.CsCulture(${a[0]})`)]; break;
        case 'Stopwatch': list = [m([], () => `$rt.newStopwatch()`)]; break;
        case 'SHA256': this.err("Cannot create an instance of the abstract type or interface 'SHA256' (use SHA256.Create())", line); break;
        case 'Encoding': this.err("Cannot create an instance of the abstract type or interface 'Encoding' (use Encoding.UTF8)", line); break;
        case 'Type': this.err("'Type' does not contain a constructor that takes 0 arguments", line); break;
      }
    } else if (t.k === 'string') {
      list = [bm('string', 'string', [C, I], t, (a) => `$rt.repeatChar(${a[0]}, ${a[1]})`, { kind: 'ctor' }),
        bm('string', 'string', [arrT(C)], t, (a) => `$rt.charsToString(${a[0]})`, { kind: 'ctor' })];
    } else if (t.k === 'object') {
      list = [bm('object', 'object', [], t, () => 'new $rt.CsObject()', { kind: 'ctor' })];
    } else if (isNum(t) || t.k === 'bool' || t.k === 'char') {
      if (args.length === 0) return defaultValueCode(t);
    } else if (t.k === 'array') {
      this.err('Array creation must have array size or array initializer', line);
    } else if (t.k === 'nullable') {
      return 'null';
    }
    if (!list) this.err(`Cannot create an instance of '${tyStr(t)}' in this course`, line);
    if (list.length && list.every((x) => x.params.length !== args.length) && !list.some((x) => x.params.some((p) => p.mod === 'params'))) {
      this.err(`'${tyStr(t)}' does not contain a constructor that takes ${args.length} argument${args.length === 1 ? '' : 's'}`, line);
    }
    const k = this.pickOverload(list, args, name, line);
    return k.gen(this.argCodes(k, args, line));
  },

  // ------------------------------------------------------------------ instance properties of library types
  builtinMember(o, name, e) {
    const t = o.t, line = e.line;
    const r = (c, ty) => ({ c, t: ty });
    switch (t.k) {
      case 'string':
        if (name === 'Length') return r(`${o.c}.length`, T.int);
        break;
      case 'array':
        if (name === 'Length') return r(`${o.c}.length`, T.int);
        if (name === 'Rank') return r(`$rt.arrRank(${o.c})`, T.int);
        if (name === 'LongLength') return r(`${o.c}.length`, T.long);
        break;
      case 'gen':
        switch (t.n) {
          case 'List':
            if (name === 'Count') return r(`${o.c}.a.length`, T.int);
            if (name === 'Capacity') return r(`${o.c}.a.length`, T.int);
            break;
          case 'Dictionary':
            if (name === 'Count') return r(`${o.c}.m.size`, T.int);
            if (name === 'Keys') return r(`$rt.dkeys(${o.c}, ${JSON.stringify(genTypeArgName(t.a[0]))})`, gen('List', [t.a[0]]));
            if (name === 'Values') return r(`$rt.dvalues(${o.c}, ${JSON.stringify(genTypeArgName(t.a[1]))})`, gen('List', [t.a[1]]));
            break;
          case 'KeyValuePair':
            if (name === 'Key') return r(`${o.c}.k`, t.a[0]);
            if (name === 'Value') return r(`${o.c}.v`, t.a[1]);
            break;
          case 'HashSet': if (name === 'Count') return r(`${o.c}.m.size`, T.int); break;
          case 'Queue': case 'Stack': if (name === 'Count') return r(`${o.c}.a.length`, T.int); break;
        }
        break;
      case 'nullable':
        if (name === 'HasValue') return r(`(${o.c} !== null)`, T.bool);
        if (name === 'Value') { const [a, b] = this.once(o.c); return r(`(${a} === null ? $rt.noValue() : ${b})`, t.of); }
        break;
      case 'bi':
        switch (t.n) {
          case 'StringBuilder':
            if (name === 'Length') {
              const lv = { t: T.int, get: `${o.c}.s.length`, set: (x) => `$rt.sbSetLen(${o.c}, ${x})` };
              return { c: lv.get, t: T.int, lvBuiltin: lv };
            }
            if (name === 'Capacity') return r(`${o.c}.s.length`, T.int);
            break;
          case 'DateTime': {
            const props = { Year: T.int, Month: T.int, Day: T.int, Hour: T.int, Minute: T.int, Second: T.int, Millisecond: T.int, DayOfYear: T.int,
              Date: BI.DateTime, TimeOfDay: BI.TimeSpan, DayOfWeek: this.enumT('DayOfWeek'), Ticks: T.long };
            if (name === 'Ticks') return r(`$rt.ticks(${o.c})`, T.long);
            if (props[name]) return r(`${o.c}.${name}`, props[name]);
            break;
          }
          case 'TimeSpan': {
            const props = { TotalDays: T.double, TotalHours: T.double, TotalMinutes: T.double, TotalSeconds: T.double, TotalMilliseconds: T.double,
              Days: T.int, Hours: T.int, Minutes: T.int, Seconds: T.int, Milliseconds: T.int };
            if (props[name]) return r(`${o.c}.${name}`, props[name]);
            if (name === 'Ticks') return r(`(${o.c}.ms * 10000)`, T.long);
            break;
          }
          case 'StreamReader':
            if (name === 'EndOfStream') { const [a, b] = this.once(o.c); return r(`(${a}.pos >= ${b}.text.length)`, T.bool); }
            break;
          case 'StreamWriter':
            if (name === 'AutoFlush') { const lv = { t: T.bool, get: `${o.c}.autoFlush`, set: (x) => `(${o.c}.autoFlush = ${x})` }; return { c: lv.get, t: T.bool, lvBuiltin: lv }; }
            break;
          case 'Type':
            if (name === 'Name') return r(`${o.c}.name`, T.string);
            if (name === 'FullName') return r(`${o.c}.full`, T.string);
            break;
          case 'Stopwatch':
            if (name === 'ElapsedMilliseconds') return r(`$rt.swMs(${o.c})`, T.long);
            if (name === 'Elapsed') return r(`new $rt.CsTimeSpan($rt.swMs(${o.c}))`, BI.TimeSpan);
            if (name === 'IsRunning') return r(`(${o.c}.start !== null)`, T.bool);
            break;
          case 'CultureInfo':
            if (name === 'Name') return r(`${o.c}.name`, T.string);
            break;
        }
        break;
    }
    if (t.k === 'enum') this.err(`'${t.c.name}' does not contain a definition for '${name}'`, line);
    const probe = this.instMethods(o, name, line);
    if (probe && probe.length) return { c: null, t: { k: 'mgroup' }, mg: { name, list: probe, builtinObj: o } };
    if (['ToString', 'Equals', 'GetHashCode', 'GetType', 'CompareTo'].includes(name)) return { c: null, t: { k: 'mgroup' }, mg: { name, list: [], objOnly: true, obj: o } };
    this.noMember(t, name, line);
  },

  // ------------------------------------------------------------------ instance methods of library types
  builtinCall(o, name, args, e, isStmt) {
    const t = o.t, line = e.line;
    // members needing special argument handling
    if (t.k === 'bi' && t.n === 'StringBuilder' && (name === 'Append' || name === 'AppendLine' || name === 'AppendFormat' || name === 'Insert')) return this.sbCall(o, name, args, line);
    if (t.k === 'bi' && t.n === 'StreamWriter' && (name === 'Write' || name === 'WriteLine')) {
      const nl = name === 'WriteLine' ? ' + "\\n"' : '';
      if (!args.length) {
        if (!nl) this.err("No overload for method 'Write' takes 0 arguments", line);
        return { c: `${o.c}.write("\\n")`, t: T.void };
      }
      if (args.length === 1) return { c: `${o.c}.write(${this.strCode(Object.assign(this.cx(args[0].e), { line }))}${nl})`, t: T.void };
      return { c: `${o.c}.write(${this.compositeCode(args, line)}${nl})`, t: T.void };
    }
    if (name === 'ToString' && (args.length === 1 || args.length === 2) && (isNum(t) || (t.k === 'bi' && (t.n === 'DateTime' || t.n === 'TimeSpan')) || (t.k === 'nullable' && isNum(t.of)))) {
      const f = this.cx(args[0].e);
      if (f.t.k === 'bi' && f.t.n === 'CultureInfo') return { c: this.strCode(o), t: T.string };
      if (f.t.k !== 'string') this.err(`Argument 1: cannot convert from '${tyStr(f.t)}' to 'string'`, line);
      if (args.length === 2) { const c2 = this.cx(args[1].e); if (!(c2.t.k === 'bi' && c2.t.n === 'CultureInfo') && c2.t.k !== 'null') this.err(`Argument 2: cannot convert from '${tyStr(c2.t)}' to 'System.IFormatProvider'`, line); }
      return { c: this.fmtCodeDyn(o, f.c), t: T.string };
    }
    if (name === 'ToString' && args.length === 0 && t.k === 'array') return { c: `(${o.c}.$t)`, t: T.string };
    if ((t.k === 'gen' && t.n === 'List') || t.k === 'array') {
      if (['Sum', 'Max', 'Min', 'Average'].includes(name)) return this.aggregate(o, name, args, line);
    }
    const list = this.instMethods(o, name, line);
    if (!list || !list.length) {
      const om = this.objectMethod(o, name, args, line);
      if (om) return om;
      this.noMember(t, name, line);
    }
    const m = this.pickOverload(list, args, name, line);
    const codes = this.argCodes(m, args, line);
    return { c: m.gen(codes, o.c, args), t: m.ret };
  },

  // ToString(format) for numbers/dates, format known only at run time
  fmtCodeDyn(o, fcode) {
    const t = o.t.k === 'nullable' ? o.t.of : o.t;
    return `$rt.fmt(${o.c}, ${fcode}, ${JSON.stringify(fmtKind(t))})`;
  },

  sbCall(o, name, args, line) {
    const [oc, ref] = this.once(o.c);
    void ref;
    if (name === 'AppendFormat') return { c: `$rt.sbAppend(${oc}, ${this.compositeCode(args, line)})`, t: o.t };
    if (name === 'Insert') {
      if (args.length !== 2) this.err(`No overload for method 'Insert' takes ${args.length} arguments`, line);
      const i = this.conv(this.cx(args[0].e, T.int), T.int, line);
      const v = this.strCode(Object.assign(this.cx(args[1].e), { line }));
      return { c: `$rt.sbInsert(${oc}, ${i}, ${v})`, t: o.t };
    }
    if (name === 'AppendLine') {
      if (args.length > 1) this.err(`No overload for method 'AppendLine' takes ${args.length} arguments`, line);
      if (!args.length) return { c: `$rt.sbAppend(${oc}, "\\n")`, t: o.t };
      const r = this.cx(args[0].e);
      if (r.t.k !== 'string') this.err(`Argument 1: cannot convert from '${tyStr(r.t)}' to 'string'`, line);
      return { c: `$rt.sbAppend(${oc}, $rt.s(${r.c}) + "\\n")`, t: o.t };
    }
    // Append
    if (args.length === 2) {
      const c = this.cx(args[0].e), n = this.cx(args[1].e, T.int);
      if (c.t.k === 'char' && isIntegral(n.t)) return { c: `$rt.sbAppend(${oc}, $rt.repeatChar(${c.c}, ${n.c}))`, t: o.t };
    }
    if (args.length !== 1) this.err(`No overload for method 'Append' takes ${args.length} arguments`, line);
    const r = this.cx(args[0].e);
    if (r.t.k === 'array' && r.t.el.k === 'char') return { c: `$rt.sbAppend(${oc}, $rt.charsToString(${r.c}))`, t: o.t };
    return { c: `$rt.sbAppend(${oc}, ${this.strCode(Object.assign(r, { line }))})`, t: o.t };
  },

  // Sum/Max/Min/Average on List<T> and arrays (with an optional selector lambda)
  aggregate(o, name, args, line) {
    const el = elemType(o.t);
    let valT = el, fnCode = null;
    if (args.length === 1) {
      const a = args[0];
      if (a.e.k !== 'Lambda') this.err(`Argument 1: cannot convert to 'Func<${tyStr(el)}, ...>'`, line);
      const lam = this.compileLambda(a.e, [el], null, line);
      valT = lam.ret;
      fnCode = lam.c;
    } else if (args.length > 1) this.err(`No overload for method '${name}' takes ${args.length} arguments`, line);
    const numeric = isNum(valT) && valT.k !== 'char';
    if (!numeric && !(name === 'Max' || name === 'Min')) this.err(`'${tyStr(o.t)}' does not contain a definition for '${name}' that works with '${tyStr(valT)}' values`, line);
    let kind = valT.k === 'decimal' ? 'decimal' : isIntegral(valT) ? 'int' : valT.k === 'string' ? 'string' : valT.k === 'double' || valT.k === 'float' ? 'double' : 'other';
    if (kind === 'other' && !(valT.k === 'bi' && valT.n === 'DateTime')) this.err(`At least one object must implement IComparable (${name} needs numbers or text)`, line);
    if (kind === 'other') kind = 'date';
    const ret = name === 'Average' ? (valT.k === 'decimal' ? T.decimal : T.double) : valT;
    const arr = o.t.k === 'array' ? o.c : `${o.c}.a`;
    return { c: `(yield* $rt.agg(${arr}, ${JSON.stringify(name)}, ${JSON.stringify(kind)}, ${fnCode || 'null'}, ${JSON.stringify(valT.k)}))`, t: ret };
  },

  instMethods(o, name, line) {
    const t = o.t;
    const I = T.int, D = T.double, S = T.string, B = T.bool, C = T.char, V = T.void, O = T.object, L = T.long;
    const CA = arrT(C), SA = arrT(S);
    const m = (params, ret, gen) => bm(tyStr(t), name, params, ret, gen);
    const SC = this.enumT('StringComparison');
    const SSO = this.enumT('StringSplitOptions');
    switch (t.k) {
      case 'string':
        switch (name) {
          case 'ToUpper': case 'ToUpperInvariant': return [m([], S, (a, x) => `${x}.toUpperCase()`), m([BI.CultureInfo], S, (a, x) => `${x}.toUpperCase()`)];
          case 'ToLower': case 'ToLowerInvariant': return [m([], S, (a, x) => `${x}.toLowerCase()`), m([BI.CultureInfo], S, (a, x) => `${x}.toLowerCase()`)];
          case 'Trim': return [m([], S, (a, x) => `$rt.trimChars(${x}, null, true, true)`), m([PARAMS(C)], S, (a, x) => `$rt.trimChars(${x}, ${a[0]}, true, true)`)];
          case 'TrimStart': return [m([], S, (a, x) => `$rt.trimChars(${x}, null, true, false)`), m([PARAMS(C)], S, (a, x) => `$rt.trimChars(${x}, ${a[0]}, true, false)`)];
          case 'TrimEnd': return [m([], S, (a, x) => `$rt.trimChars(${x}, null, false, true)`), m([PARAMS(C)], S, (a, x) => `$rt.trimChars(${x}, ${a[0]}, false, true)`)];
          case 'Substring': return [m([I], S, (a, x) => `$rt.substr1(${x}, ${a[0]})`), m([I, I], S, (a, x) => `$rt.substr2(${x}, ${a[0]}, ${a[1]})`)];
          case 'IndexOf': case 'LastIndexOf': {
            const fn = name === 'IndexOf' ? 'sIndexOf' : 'sLastIndexOf';
            return [m([C], I, (a, x) => `$rt.${fn}(${x}, $rt.ch(${a[0]}))`), m([S], I, (a, x) => `$rt.${fn}(${x}, ${a[0]})`),
              m([C, I], I, (a, x) => `$rt.${fn}(${x}, $rt.ch(${a[0]}), ${a[1]})`), m([S, I], I, (a, x) => `$rt.${fn}(${x}, ${a[0]}, ${a[1]})`),
              m([S, SC], I, (a, x) => `$rt.${fn}Cmp(${x}, ${a[0]}, ${a[1]})`)];
          }
          case 'IndexOfAny': return [m([CA], I, (a, x) => `$rt.indexOfAny(${x}, ${a[0]})`)];
          case 'Contains': return [m([S], B, (a, x) => `$rt.sContains(${x}, ${a[0]})`), m([C], B, (a, x) => `${x}.includes($rt.ch(${a[0]}))`),
            m([S, SC], B, (a, x) => `($rt.ignoreCase(${a[1]}) ? $rt.sContains(${x}.toLowerCase(), $rt.s(${a[0]}).toLowerCase()) : $rt.sContains(${x}, ${a[0]}))`)];
          case 'StartsWith': case 'EndsWith': {
            const js = name === 'StartsWith' ? 'startsWith' : 'endsWith';
            return [m([S], B, (a, x) => `$rt.sCheck(${x}).${js}($rt.argNull(${a[0]}, "value"))`), m([C], B, (a, x) => `${x}.${js}($rt.ch(${a[0]}))`),
              m([S, SC], B, (a, x) => `($rt.ignoreCase(${a[1]}) ? ${x}.toLowerCase().${js}($rt.s(${a[0]}).toLowerCase()) : ${x}.${js}(${a[0]}))`)];
          }
          case 'Replace': return [m([S, S], S, (a, x) => `$rt.replace(${x}, ${a[0]}, ${a[1]})`), m([C, C], S, (a, x) => `${x}.split($rt.ch(${a[0]})).join($rt.ch(${a[1]}))`)];
          case 'Split': return [
            m([PARAMS(C)], SA, (a, x) => `$rt.split(${x}, $rt.charSeps(${a[0]}), 0)`),
            m([C, SSO], SA, (a, x) => `$rt.split(${x}, [$rt.ch(${a[0]})], ${a[1]})`),
            m([C, I, SSO], SA, (a, x) => `$rt.split(${x}, [$rt.ch(${a[0]})], ${a[2]}, ${a[1]})`),
            m([C, I], SA, (a, x) => `$rt.split(${x}, [$rt.ch(${a[0]})], 0, ${a[1]})`),
            m([S], SA, (a, x) => `$rt.split(${x}, [$rt.s(${a[0]})], 0)`),
            m([S, SSO], SA, (a, x) => `$rt.split(${x}, [$rt.s(${a[0]})], ${a[1]})`),
            m([CA, SSO], SA, (a, x) => `$rt.split(${x}, $rt.charSeps(${a[0]}), ${a[1]})`),
            m([SA, SSO], SA, (a, x) => `$rt.split(${x}, ${a[0]}, ${a[1]})`),
            m([CA, I], SA, (a, x) => `$rt.split(${x}, $rt.charSeps(${a[0]}), 0, ${a[1]})`)];
          case 'PadLeft': return [m([I], S, (a, x) => `$rt.padL(${x}, ${a[0]})`), m([I, C], S, (a, x) => `$rt.padL(${x}, ${a[0]}, ${a[1]})`)];
          case 'PadRight': return [m([I], S, (a, x) => `$rt.padR(${x}, ${a[0]})`), m([I, C], S, (a, x) => `$rt.padR(${x}, ${a[0]}, ${a[1]})`)];
          case 'Insert': return [m([I, S], S, (a, x) => `$rt.insert(${x}, ${a[0]}, ${a[1]})`)];
          case 'Remove': return [m([I], S, (a, x) => `$rt.remove1(${x}, ${a[0]})`), m([I, I], S, (a, x) => `$rt.remove2(${x}, ${a[0]}, ${a[1]})`)];
          case 'ToCharArray': return [m([], CA, (a, x) => `$rt.strChars(${x})`)];
          case 'Equals': return [m([S], B, (a, x) => `(${x} === ${a[0]})`), m([S, SC], B, (a, x) => `($rt.ignoreCase(${a[1]}) ? $rt.sEqIgnore(${x}, ${a[0]}) : ${x} === ${a[0]})`)];
          case 'CompareTo': return [m([S], I, (a, x) => `$rt.scmp($rt.sCheck(${x}), ${a[0]})`)];
          case 'ToString': return [m([], S, (a, x) => `$rt.sCheck(${x})`)];
          case 'Clone': return [m([], O, (a, x) => x)];
          case 'GetHashCode': return null;
          case 'Normalize': return [m([], S, (a, x) => x)];
        }
        if (name === 'Length') this.err("Non-invocable member 'string.Length' cannot be used like a method (remove the brackets: s.Length)", line);
        return null;
      case 'char': case 'int': case 'long': case 'double': case 'float': case 'decimal': case 'bool': case 'byte': case 'short':
        if (name === 'CompareTo') {
          const cmp = t.k === 'decimal' ? (a, x) => `$Dec.cmp(${x}, ${a[0]})` : (a, x) => `$rt.ncmp(${x}, ${a[0]})`;
          return [m([t], I, cmp)];
        }
        if (name === 'Equals') return null;
        if (name === 'ToString') return null;
        if (t.k === 'char' && ['IsDigit', 'IsLetter', 'ToUpper', 'ToLower'].includes(name)) this.err(`Member 'char.${name}(char)' cannot be accessed with an instance reference; qualify it with a type name instead (write char.${name}(c))`, line);
        if (['Parse', 'TryParse'].includes(name)) this.err(`Member '${t.k}.${name}(string)' cannot be accessed with an instance reference; qualify it with a type name instead (write ${t.k}.${name}(...))`, line);
        return null;
      case 'enum':
        if (name === 'CompareTo') return [m([t], I, (a, x) => `$rt.ncmp(${x}, ${a[0]})`)];
        if (name === 'HasFlag') return [m([t], B, (a, x) => `((${x} & ${a[0]}) === ${a[0]})`)];
        return null;
      case 'array': {
        const el = t.el, eq = this.eqFor(el);
        switch (name) {
          case 'GetLength': return [m([I], I, (a, x) => `$rt.getLength(${x}, ${a[0]})`)];
          case 'GetUpperBound': return [m([I], I, (a, x) => `($rt.getLength(${x}, ${a[0]}) - 1)`)];
          case 'GetLowerBound': return [m([I], I, () => `0`)];
          case 'Clone': return [m([], O, (a, x) => `$rt.arrClone(${x})`)];
          case 'Contains': return [m([el], B, (a, x) => (el.k === 'class' ? `((yield* $rt.indexOfG(${x}, ${a[0]})) >= 0)` : `($rt.arrIndexOf(${x}, ${a[0]}, ${eq}) >= 0)`))];
          case 'ToList': return [m([], gen('List', [el]), (a, x) => `new $rt.CsList(${x}.slice(), ${JSON.stringify(genTypeArgName(el))})`)];
          case 'CopyTo': return [m([t, I], V, (a, x) => `$rt.arrCopy(${x}, 0, ${a[0]}, ${a[1]}, ${x}.length)`)];
          case 'Length': this.err("Non-invocable member 'Array.Length' cannot be used like a method (remove the brackets: numbers.Length)", line);
        }
        return null;
      }
      case 'gen': return this.genMethods(o, name, line, m);
      case 'nullable':
        if (name === 'GetValueOrDefault') return [m([], t.of, (a, x) => `$rt.nvl(${x}, ${defaultValueCode(t.of)})`), m([t.of], t.of, (a, x) => `$rt.nvl(${x}, ${a[0]})`)];
        return null;
      case 'bi':
        switch (t.n) {
          case 'StringBuilder':
            switch (name) {
              case 'ToString': return [m([], S, (a, x) => `${x}.s`)];
              case 'Clear': return [m([], t, (a, x) => `$rt.sbClear(${x})`)];
              case 'Remove': return [m([I, I], t, (a, x) => `$rt.sbRemove(${x}, ${a[0]}, ${a[1]})`)];
              case 'Replace': return [m([S, S], t, (a, x) => `$rt.sbReplace(${x}, ${a[0]}, ${a[1]})`), m([C, C], t, (a, x) => `$rt.sbReplace(${x}, $rt.ch(${a[0]}), $rt.ch(${a[1]}))`)];
            }
            return null;
          case 'Random':
            switch (name) {
              case 'Next': return [m([], I, (a, x) => `${x}.next0()`), m([I], I, (a, x) => `${x}.next1(${a[0]})`), m([I, I], I, (a, x) => `${x}.next2(${a[0]}, ${a[1]})`)];
              case 'NextDouble': return [m([], D, (a, x) => `${x}.nextDouble()`)];
              case 'NextInt64': return [m([L, L], L, (a, x) => `${x}.next2(${a[0]}, ${a[1]})`)];
              case 'Shuffle': unsupported('Random.Shuffle', line);
            }
            return null;
          case 'DateTime': {
            const DT = BI.DateTime;
            const add = (ms) => [m([D], DT, (a, x) => `new $rt.CsDateTime(${x}.ms + Math.round(${a[0]} * ${ms}))`)];
            switch (name) {
              case 'AddDays': return add(86400000);
              case 'AddHours': return add(3600000);
              case 'AddMinutes': return add(60000);
              case 'AddSeconds': return add(1000);
              case 'AddMilliseconds': return add(1);
              case 'AddMonths': return [m([I], DT, (a, x) => `${x}.addMonths(${a[0]})`)];
              case 'AddYears': return [m([I], DT, (a, x) => `${x}.addMonths((${a[0]}) * 12)`)];
              case 'Add': return [m([BI.TimeSpan], DT, (a, x) => `new $rt.CsDateTime(${x}.ms + ${a[0]}.ms)`)];
              case 'Subtract': return [m([DT], BI.TimeSpan, (a, x) => `new $rt.CsTimeSpan(${x}.ms - ${a[0]}.ms)`), m([BI.TimeSpan], DT, (a, x) => `new $rt.CsDateTime(${x}.ms - ${a[0]}.ms)`)];
              case 'ToString': return [m([], S, (a, x) => `$rt.fmtDate(${x}, null)`)];
              case 'ToShortDateString': return [m([], S, (a, x) => `$rt.fmtDate(${x}, "dd/MM/yyyy")`)];
              case 'ToLongDateString': return [m([], S, (a, x) => `$rt.fmtDate(${x}, "dd MMMM yyyy")`)];
              case 'ToShortTimeString': return [m([], S, (a, x) => `$rt.fmtDate(${x}, "HH:mm")`)];
              case 'ToLongTimeString': return [m([], S, (a, x) => `$rt.fmtDate(${x}, "HH:mm:ss")`)];
              case 'CompareTo': return [m([DT], I, (a, x) => `$rt.ncmp(${x}.ms, ${a[0]}.ms)`)];
              case 'Equals': return [m([DT], B, (a, x) => `(${x}.ms === ${a[0]}.ms)`)];
            }
            return null;
          }
          case 'TimeSpan':
            if (name === 'ToString') return [m([], S, (a, x) => `${x}.format(null)`)];
            if (name === 'Add') return [m([t], t, (a, x) => `new $rt.CsTimeSpan(${x}.ms + ${a[0]}.ms)`)];
            if (name === 'Subtract') return [m([t], t, (a, x) => `new $rt.CsTimeSpan(${x}.ms - ${a[0]}.ms)`)];
            if (name === 'CompareTo') return [m([t], I, (a, x) => `$rt.ncmp(${x}.ms, ${a[0]}.ms)`)];
            return null;
          case 'StreamWriter':
            if (name === 'Close' || name === 'Dispose') return [m([], V, (a, x) => `${x}.close()`)];
            if (name === 'Flush') return [m([], V, (a, x) => `${x}.flush()`)];
            return null;
          case 'StreamReader':
            switch (name) {
              case 'ReadLine': return [m([], S, (a, x) => `${x}.readLine()`)];
              case 'ReadToEnd': return [m([], S, (a, x) => `${x}.readToEnd()`)];
              case 'Peek': return [m([], I, (a, x) => `${x}.peek()`)];
              case 'Read': return [m([], I, (a, x) => `${x}.read()`)];
              case 'Close': case 'Dispose': return [m([], V, (a, x) => `$rt.dispose(${x})`)];
            }
            return null;
          case 'SHA256':
            if (name === 'ComputeHash') return [m([arrT(T.byte)], arrT(T.byte), (a) => `$rt.arr($rt.sha256($rt.toArr(${a[0]})), "System.Byte[]")`)];
            if (name === 'Dispose' || name === 'Clear') return [m([], V, () => 'undefined')];
            return null;
          case 'Encoding':
            if (name === 'GetBytes') return [m([S], arrT(T.byte), (a, x) => `$rt.encBytes(${x}, ${a[0]})`)];
            if (name === 'GetString') return [m([arrT(T.byte)], S, (a, x) => `$rt.encString(${x}, ${a[0]})`)];
            return null;
          case 'Stopwatch':
            if (name === 'Start') return [m([], V, (a, x) => `$rt.swStart(${x})`)];
            if (name === 'Stop') return [m([], V, (a, x) => `$rt.swStop(${x})`)];
            if (name === 'Reset') return [m([], V, (a, x) => `$rt.swReset(${x})`)];
            if (name === 'Restart') return [m([], V, (a, x) => `($rt.swReset(${x}), $rt.swStart(${x}))`)];
            return null;
        }
        return null;
    }
    return null;
  },

  genMethods(o, name, line, m) {
    const t = o.t;
    const I = T.int, B = T.bool, V = T.void;
    const el = t.a[0];
    const tn = JSON.stringify(t.a.map(genTypeArgName).join(','));
    const eq = this.eqFor(el);
    const isCls = el.k === 'class' || el.k === 'object';
    const PRED = gen('Predicate', [el]);
    switch (t.n) {
      case 'List': {
        const ENUM = gen('IEnumerable', [el]);
        const kind = el.k === 'bi' && el.n === 'DateTime' ? 'date' : el.k;
        const prim = isNum(el) || ['string', 'bool', 'char', 'enum', 'decimal'].includes(el.k) || kind === 'date';
        switch (name) {
          case 'Add': return [m([el], V, (a, x) => `$rt.ladd(${x}, ${a[0]})`)];
          case 'AddRange': return [m([ENUM], V, (a, x) => `$rt.laddRange(${x}, ${a[0]})`)];
          case 'Insert': return [m([I, el], V, (a, x) => `$rt.linsert(${x}, ${a[0]}, ${a[1]})`)];
          case 'InsertRange': return [m([I, ENUM], V, (a, x) => `$rt.linsertRange(${x}, ${a[0]}, ${a[1]})`)];
          case 'Remove': return [m([el], B, (a, x) => (isCls ? `(yield* $rt.lremoveG(${x}, ${a[0]}))` : `$rt.lremove(${x}, ${a[0]}, ${eq})`))];
          case 'RemoveAt': return [m([I], V, (a, x) => `$rt.lremoveAt(${x}, ${a[0]})`)];
          case 'RemoveRange': return [m([I, I], V, (a, x) => `$rt.lremoveRange(${x}, ${a[0]}, ${a[1]})`)];
          case 'RemoveAll': return [m([PRED], I, (a, x) => `(yield* $rt.lremoveAll(${x}, ${a[0]}))`)];
          case 'Contains': return [m([el], B, (a, x) => (isCls ? `((yield* $rt.indexOfG(${x}.a, ${a[0]})) >= 0)` : `($rt.lindexOf(${x}, ${a[0]}, ${eq}) >= 0)`))];
          case 'IndexOf': return [m([el], I, (a, x) => (isCls ? `(yield* $rt.indexOfG(${x}.a, ${a[0]}))` : `$rt.lindexOf(${x}, ${a[0]}, ${eq})`))];
          case 'LastIndexOf': return [m([el], I, (a, x) => `$rt.llastIndexOf(${x}, ${a[0]}, ${eq})`)];
          case 'Clear': return [m([], V, (a, x) => `$rt.lclear(${x})`)];
          case 'Sort': return [
            m([], V, (a, x) => { const [p, r] = this.once(x); return prim ? `($rt.sortPrim(${p}.a, ${JSON.stringify(kind)}), ${r}.v++)` : `(yield* $rt.sortG(${p}.a, $rt.defaultCmp), ${r}.v++)`; }),
            m([gen('Comparison', [el])], V, (a, x) => { const [p, r] = this.once(x); return `(yield* $rt.sortG(${p}.a, ${a[0]}), ${r}.v++)`; })];
          case 'Reverse': return [m([], V, (a, x) => { const [p, r] = this.once(x); return `(${p}.a.reverse(), ${r}.v++)`; })];
          case 'ToArray': return [m([], arrT(el), (a, x) => `$rt.arr(${x}.a.slice(), ${JSON.stringify(arrTypeName(el))})`)];
          case 'ToList': return [m([], t, (a, x) => `new $rt.CsList(${x}.a.slice(), ${tn})`)];
          case 'Find': return [m([PRED], el, (a, x) => `(yield* $rt.findVal(${x}.a, ${a[0]}, ${defaultValueCode(el)}))`)];
          case 'FindLast': return [m([PRED], el, (a, x) => `(yield* $rt.findLastVal(${x}.a, ${a[0]}, ${defaultValueCode(el)}))`)];
          case 'FindAll': return [m([PRED], t, (a, x) => `new $rt.CsList((yield* $rt.findAll(${x}.a, ${a[0]})), ${tn})`)];
          case 'FindIndex': return [m([PRED], I, (a, x) => `(yield* $rt.findIdx(${x}.a, ${a[0]}))`)];
          case 'Exists': return [m([PRED], B, (a, x) => `((yield* $rt.findIdx(${x}.a, ${a[0]})) >= 0)`)];
          case 'TrueForAll': return [m([PRED], B, (a, x) => `(yield* $rt.trueForAll(${x}.a, ${a[0]}))`)];
          case 'ForEach': return [m([gen('Action', [el])], V, (a, x) => `(yield* $rt.lforEach(${x}, ${a[0]}))`)];
          case 'GetRange': return [m([I, I], t, (a, x) => `$rt.lgetRange(${x}, ${a[0]}, ${a[1]}, ${tn})`)];
          case 'CopyTo': return [m([arrT(el)], V, (a, x) => `$rt.arrCopy(${x}.a, 0, ${a[0]}, 0, ${x}.a.length)`)];
          case 'TrimExcess': return [m([], V, () => 'undefined')];
          case 'Count': this.err("Non-invocable member 'List<T>.Count' cannot be used like a method (remove the brackets: list.Count)", line);
        }
        return null;
      }
      case 'Dictionary': {
        const K = t.a[0], Vt = t.a[1];
        switch (name) {
          case 'Add': return [m([K, Vt], V, (a, x) => `$rt.dadd(${x}, ${a[0]}, ${a[1]})`)];
          case 'TryAdd': return [m([K, Vt], B, (a, x) => `$rt.dtryAdd(${x}, ${a[0]}, ${a[1]})`)];
          case 'ContainsKey': return [m([K], B, (a, x) => `$rt.dhas(${x}, ${a[0]})`)];
          case 'ContainsValue': return [m([Vt], B, (a, x) => `$rt.dhasValue(${x}, ${a[0]})`)];
          case 'Remove': return [m([K], B, (a, x) => `$rt.dremove(${x}, ${a[0]})`)];
          case 'Clear': return [m([], V, (a, x) => `$rt.dclear(${x})`)];
          case 'TryGetValue': return [m([K, OUT(Vt)], B, (a, x) => `$rt.dtryOut(${x}, ${a[0]}, ${a[1]}, ${defaultValueCode(Vt)})`)];
          case 'GetValueOrDefault': return [m([K], Vt, (a, x) => `$rt.dgetOr(${x}, ${a[0]}, ${defaultValueCode(Vt)})`), m([K, Vt], Vt, (a, x) => `$rt.dgetOr(${x}, ${a[0]}, ${a[1]})`)];
          case 'Count': this.err("Non-invocable member 'Dictionary<TKey, TValue>.Count' cannot be used like a method (remove the brackets)", line);
        }
        return null;
      }
      case 'HashSet':
        switch (name) {
          case 'Add': return [m([el], B, (a, x) => `$rt.hadd(${x}, ${a[0]})`)];
          case 'Contains': return [m([el], B, (a, x) => `${x}.m.has($rt.mkey(${a[0]}))`)];
          case 'Remove': return [m([el], B, (a, x) => `$rt.hremove(${x}, ${a[0]})`)];
          case 'Clear': return [m([], V, (a, x) => `$rt.dclear(${x})`)];
          case 'ToList': return [m([], gen('List', [el]), (a, x) => `new $rt.CsList(Array.from(${x}.m.values()), ${tn})`)];
        }
        return null;
      case 'Queue':
        switch (name) {
          case 'Enqueue': return [m([el], V, (a, x) => `$rt.ladd(${x}, ${a[0]})`)];
          case 'Dequeue': return [m([], el, (a, x) => `$rt.qtake(${x}, "Queue empty.", true)`)];
          case 'Peek': return [m([], el, (a, x) => `$rt.qtake(${x}, "Queue empty.", false)`)];
          case 'Contains': return [m([el], B, (a, x) => `($rt.lindexOf(${x}, ${a[0]}, ${eq}) >= 0)`)];
          case 'Clear': return [m([], V, (a, x) => `$rt.lclear(${x})`)];
          case 'ToArray': return [m([], arrT(el), (a, x) => `$rt.arr(${x}.a.slice(), ${JSON.stringify(arrTypeName(el))})`)];
        }
        return null;
      case 'Stack':
        switch (name) {
          case 'Push': return [m([el], V, (a, x) => `$rt.ladd(${x}, ${a[0]})`)];
          case 'Pop': return [m([], el, (a, x) => `$rt.stake(${x}, true)`)];
          case 'Peek': return [m([], el, (a, x) => `$rt.stake(${x}, false)`)];
          case 'Contains': return [m([el], B, (a, x) => `($rt.lindexOf(${x}, ${a[0]}, ${eq}) >= 0)`)];
          case 'Clear': return [m([], V, (a, x) => `$rt.lclear(${x})`)];
          case 'ToArray': return [m([], arrT(el), (a, x) => `$rt.arr(${x}.a.slice().reverse(), ${JSON.stringify(arrTypeName(el))})`)];
        }
        return null;
      case 'KeyValuePair': return null;
    }
    return null;
  },
});


// ===========================================================================
// 12. More runtime helpers (used by the library subset above)
// ===========================================================================

Object.assign(rt, {
  noValue() { throw rt.ex('InvalidOperationException', 'Nullable object must have a value.'); },
  decToInt(d) {
    const v = d.toInt();
    return v;
  },
  lshift(a, b, op) { const x = BigInt(a), s = BigInt(b & 63); return Number(BigInt.asIntN(64, op === '<<' ? x << s : x >> s)); },
  lbit(a, b, op) { const x = BigInt(a), y = BigInt(b); return Number(BigInt.asIntN(64, op === '&' ? x & y : op === '|' ? x | y : x ^ y)); },
  *fmtG(v, f) {
    if (v !== null && v !== undefined && v.$cls) return rt.s(yield* v.M$ToString$());
    return rt.fmt(v, f, 'obj');
  },
  *objArg(v) { if (v !== null && v !== undefined && v.$cls) return rt.s(yield* v.M$ToString$()); return v; },
  *formatArr(f, arr) {
    if (arr === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 'args')");
    const vals = [];
    for (const v of arr) vals.push(yield* rt.objArg(v));
    return rt.format(f, vals, vals.map(() => 'obj'));
  },
  *joinG(sep, arr) {
    const parts = [];
    for (const v of arr) parts.push(yield* rt.strG(v));
    return parts.join(rt.s(sep));
  },
  tryOut(fn, s, ref, def) {
    try { const v = fn(s); ref.s(v); return true; } catch (e) {
      if (e instanceof CsObject) { ref.s(def); return false; }
      throw e;
    }
  },
  kindForBits(bits) { return bits === 64 ? 'long' : bits === 16 ? 'short' : bits === 8 ? 'byte' : 'int'; },
  convInt(s, bits) { if (s === null) return 0; return rt.parseIntStr(s, rt.kindForBits(bits)); },
  convIntBase(s, base) {
    if (![2, 8, 10, 16].includes(base)) throw rt.ex('ArgumentException', 'Invalid Base.');
    if (s === null) return 0;
    let t = s.trim();
    if (base === 16) t = t.replace(/^0x/i, '');
    const re = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^[+-]?\d+$/, 16: /^[0-9a-f]+$/i }[base];
    if (!re.test(t)) throw rt.ex('FormatException', 'Could not find any recognizable digits.');
    let v = parseInt(t, base);
    if (base !== 10) { if (v > 0xFFFFFFFF) throw rt.ex('OverflowException', 'Value was either too large or too small for an Int32.'); v = v | 0; }
    else if (v > 2147483647 || v < -2147483648) throw rt.ex('OverflowException', 'Value was either too large or too small for an Int32.');
    return v;
  },
  convIntD(x, bits) {
    if (x !== x) throw rt.ex('OverflowException', 'Value was either too large or too small for an Int32.');
    const r = rt.roundEven(x);
    const kind = rt.kindForBits(bits);
    const [lo, hi, nm] = kind === 'long' ? [-9223372036854775808, 9223372036854775807, 'an Int64'] : kind === 'short' ? [-32768, 32767, 'an Int16'] : kind === 'byte' ? [0, 255, 'an unsigned byte'] : [-2147483648, 2147483647, 'an Int32'];
    if (r < lo || r > hi) throw rt.ex('OverflowException', `Value was either too large or too small for ${nm}.`);
    return r === 0 ? 0 : r;
  },
  convIntObj(v, bits) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'string') return rt.convInt(v, bits);
    if (typeof v === 'number') return rt.convIntD(v, bits);
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v instanceof Dec) return rt.convIntD(v.toNumber(), bits);
    if (v instanceof CsChar) return v.c;
    throw rt.ex('InvalidCastException', `Unable to cast object of type '${typeShortName(v)}' to type 'System.IConvertible'.`);
  },
  convDouble(s) { if (s === null) return 0; return rt.parseDoubleStr(s); },
  convDoubleObj(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'string') return rt.parseDoubleStr(v);
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v instanceof Dec) return v.toNumber();
    throw rt.ex('InvalidCastException', `Unable to cast object of type '${typeShortName(v)}' to type 'System.IConvertible'.`);
  },
  convDec(s) { if (s === null) return new Dec(0n, 0); return rt.parseDecStr(s); },
  convBool(s) { if (s === null) return false; return rt.parseBoolStr(s); },
  convChar(i) { if (i < 0 || i > 65535) throw rt.ex('OverflowException', 'Value was either too large or too small for a character.'); return i; },
  toBase(v, base, kind) {
    if (![2, 8, 10, 16].includes(base)) throw rt.ex('ArgumentException', 'Invalid Base.');
    if (base === 10) return String(v);
    let n = v;
    if (n < 0) n = kind === 'long' ? BigInt.asUintN(64, BigInt(n)) : kind === 'byte' ? n & 255 : n >>> 0;
    return n.toString(base);
  },
  absI(x) { if (x === -2147483648) throw rt.ex('OverflowException', 'Negating the minimum value of a twos complement number is invalid.'); return Math.abs(x); },
  decMinMax(a, b, dir) { const c = Dec.cmp(a, b); return (dir > 0 ? c >= 0 : c <= 0) ? a : b; },
  signD(x) { if (x !== x) throw rt.ex('ArithmeticException', 'Function does not accept floating point Not-a-Number values.'); return Math.sign(x); },
  clamp(v, lo, hi) {
    if (lo > hi) throw rt.ex('ArgumentException', `'${lo}' cannot be greater than ${hi}.`);
    return v < lo ? lo : v > hi ? hi : v;
  },
  numVal(c) { return c >= 48 && c <= 57 ? c - 48 : -1; },
  ignoreCase(v) { return (v & 1) === 1; },

  // console colours
  fg: -1, bg: -1, colorNames: null,
  fgGet() { return rt.fg < 0 ? 7 : rt.fg; },
  bgGet() { return rt.bg < 0 ? 0 : rt.bg; },
  fgSet(v) { rt.fg = v; rt.color = rt.colorNames ? rt.colorNames[v] : undefined; return v; },
  bgSet(v) { rt.bg = v; rt.bgColor = rt.colorNames ? rt.colorNames[v] : undefined; return v; },
  resetColor() { rt.fg = -1; rt.bg = -1; rt.color = undefined; rt.bgColor = undefined; },

  exit() { const e = new Error('exit'); e.$exit = true; e.$fatal = true; throw e; },
  newDate(y, mo, d, h, mi, s, ms) {
    if (y < 1 || y > 9999 || mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo))
      throw rt.ex('ArgumentOutOfRangeException', 'Year, Month, and Day parameters describe an un-representable DateTime.');
    if ((h || 0) > 23 || (mi || 0) > 59 || (s || 0) > 59 || h < 0 || mi < 0 || s < 0)
      throw rt.ex('ArgumentOutOfRangeException', 'Hour, Minute, and Second parameters describe an un-representable DateTime.');
    return new CsDateTime(utcMs(y, mo, d, h || 0, mi || 0, s || 0, ms || 0));
  },
  parseTimeSpan(s) {
    const m = /^\s*(-)?(?:(\d+)\.)?(\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,7}))?)?\s*$/.exec(s || '');
    if (!m) throw rt.ex('FormatException', `String '${s}' was not recognized as a valid TimeSpan.`);
    const ms = (((+(m[2] || 0)) * 24 + (+m[3])) * 3600 + (+m[4]) * 60 + (+(m[5] || 0))) * 1000 + (m[6] ? Math.round(+('0.' + m[6]) * 1000) : 0);
    return new CsTimeSpan(m[1] ? -ms : ms);
  },
  encBytes(enc, s) {
    if (s === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 's')");
    let out;
    if (enc.name === 'ASCII') { out = []; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); out.push(c < 128 ? c : 63); } }
    else if (enc.name === 'Unicode') { out = []; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); out.push(c & 255, c >> 8); } }
    else out = utf8Bytes(s);
    return rt.arr(out, 'System.Byte[]');
  },
  encString(enc, bytes) {
    const a = rt.toArr(bytes);
    if (enc.name === 'ASCII') return a.map((b) => String.fromCharCode(b < 128 ? b : 63)).join('');
    if (enc.name === 'Unicode') { let s = ''; for (let i = 0; i + 1 < a.length; i += 2) s += String.fromCharCode(a[i] | (a[i + 1] << 8)); return s; }
    return utf8Decode(a);
  },
  sbAppend(sb, s) { sb.s += s; return sb; },
  sbClear(sb) { sb.s = ''; return sb; },
  sbReplace(sb, a, b) { if (a === null || a === '') throw rt.ex('ArgumentException', "String cannot be of zero length. (Parameter 'oldValue')"); sb.s = sb.s.split(a).join(rt.s(b)); return sb; },
  sbSetLen(sb, n) {
    if (n < 0) throw rt.ex('ArgumentOutOfRangeException', "Length cannot be less than zero. (Parameter 'value')");
    sb.s = n <= sb.s.length ? sb.s.slice(0, n) : sb.s + '\0'.repeat(n - sb.s.length);
    return n;
  },
  sIndexOf(s, sub, start) {
    if (sub === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 'value')");
    if (start !== undefined && (start < 0 || start > s.length)) throw rt.ex('ArgumentOutOfRangeException', "Index was out of range. Must be non-negative and less than or equal to the size of the collection. (Parameter 'startIndex')");
    return s.indexOf(sub, start || 0);
  },
  sLastIndexOf(s, sub, start) {
    if (sub === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 'value')");
    if (start === undefined) return s.lastIndexOf(sub);
    if (start < 0 || start >= s.length) { if (s.length === 0 && start <= 0) return sub === '' ? 0 : -1; throw rt.ex('ArgumentOutOfRangeException', "Index was out of range. Must be non-negative and less than the size of the collection. (Parameter 'startIndex')"); }
    const from = start - sub.length + 1;
    if (from < 0) return -1;
    return s.lastIndexOf(sub, from);
  },
  sIndexOfCmp(s, sub, cmp) { return rt.ignoreCase(cmp) ? s.toLowerCase().indexOf(rt.s(sub).toLowerCase()) : rt.sIndexOf(s, sub); },
  sLastIndexOfCmp(s, sub, cmp) { return rt.ignoreCase(cmp) ? s.toLowerCase().lastIndexOf(rt.s(sub).toLowerCase()) : rt.sLastIndexOf(s, sub); },
  indexOfAny(s, chars) { for (let i = 0; i < s.length; i++) if (chars.includes(s.charCodeAt(i))) return i; return -1; },
  sContains(s, sub) {
    if (s === null) throw rt.nre();
    if (sub === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 'value')");
    return s.includes(sub);
  },
  sCheck(s) { if (s === null || s === undefined) throw rt.nre(); return s; },
  argNull(v, name) { if (v === null || v === undefined) throw rt.ex('ArgumentNullException', `Value cannot be null. (Parameter '${name}')`); return v; },
  charSeps(arr) { return arr === null ? [] : rt.toArr(arr).map((c) => String.fromCharCode(c)); },
  isNullOrEmpty(s) { return s === null || s === ''; },
  arrLastIndexOf(a, v, eq) { for (let i = a.length - 1; i >= 0; i--) if (eq ? eq(a[i], v) : a[i] === v) return i; return -1; },
  arrClear(a, i, n, def) {
    if (i < 0 || n < 0 || i + n > a.length) throw rt.ex('IndexOutOfRangeException', 'Index was outside the bounds of the array.');
    for (let k = i; k < i + n; k++) a[k] = def;
  },
  *findIdx(arr, pred) { for (let i = 0; i < arr.length; i++) if (yield* pred(arr[i])) return i; return -1; },
  *findVal(arr, pred, def) { for (let i = 0; i < arr.length; i++) if (yield* pred(arr[i])) return arr[i]; return def; },
  *findLastVal(arr, pred, def) { for (let i = arr.length - 1; i >= 0; i--) if (yield* pred(arr[i])) return arr[i]; return def; },
  *findAll(arr, pred) { const out = []; for (let i = 0; i < arr.length; i++) if (yield* pred(arr[i])) out.push(arr[i]); return out; },
  *trueForAll(arr, pred) { for (let i = 0; i < arr.length; i++) if (!(yield* pred(arr[i]))) return false; return true; },
  binSearch(a, v) {
    let lo = 0, hi = a.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const c = typeof v === 'string' ? rt.scmp(a[mid], v) : v instanceof Dec ? Dec.cmp(a[mid], v) : (a[mid] < v ? -1 : a[mid] > v ? 1 : 0);
      if (c === 0) return mid;
      if (c < 0) lo = mid + 1; else hi = mid - 1;
    }
    return ~lo;
  },
  enumTry(map, s, ic) {
    if (s === null) return null;
    const t = s.trim();
    if (/^[+-]?\d+$/.test(t)) return parseInt(t, 10);
    for (const k of Object.keys(map)) if (k === t || (ic && k.toLowerCase() === t.toLowerCase())) return map[k];
    return null;
  },
  enumParse(map, s, ic, name) {
    if (s === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 'value')");
    const r = rt.enumTry(map, s, ic);
    if (r === null) throw rt.ex('ArgumentException', `Requested value '${s}' was not found.`);
    return r;
  },
  newDict(tn, kch) { const d = new CsDict(tn); d.kch = kch; return d; },
  dictCopy(src) { if (src === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 'dictionary')"); const d = new CsDict(src.$t); d.kch = src.kch; for (const [k, e] of src.m) d.m.set(k, [e[0], e[1]]); return d; },
  hashFrom(items) { const h = new CsHashSet(); for (const x of rt.toArr(items)) h.m.add(mapKey(x)); return h; },
  qFrom(q, items) { for (const x of rt.toArr(items)) q.a.push(x); return q; },
  mkey: mapKey,
  hadd(h, v) { const k = mapKey(v); if (h.m.has(k)) return false; h.m.add(k); h.v++; return true; },
  hremove(h, v) { const r = h.m.delete(mapKey(v)); if (r) h.v++; return r; },
  qtake(q, msg, remove) { if (!q.a.length) throw rt.ex('InvalidOperationException', msg); if (remove) { q.v++; return q.a.shift(); } return q.a[0]; },
  stake(s, remove) { if (!s.a.length) throw rt.ex('InvalidOperationException', 'Stack empty.'); if (remove) { s.v++; return s.a.pop(); } return s.a[s.a.length - 1]; },
  fileMove(a, b) { const t = rt.fileRead(a); if (rt.fileExists(b)) throw rt.ex('IOException', 'Cannot create a file when that file already exists.'); rt.ctx.files[b] = t; delete rt.ctx.files[a]; },
  nvl(x, d) { return x === null ? d : x; },
  dtryOut(d, k, ref, def) {
    if (k === null) throw rt.ex('ArgumentNullException', "Value cannot be null. (Parameter 'key')");
    const v = rt.dtryGet(d, k);
    ref.s(v === undefined ? def : v);
    return v !== undefined;
  },
  dgetOr(d, k, def) { const v = rt.dtryGet(d, k); return v === undefined ? def : v; },
  ticks(dt) { return (dt.ms - utcMs(1, 1, 1)) * 10000; },
  newStopwatch() { const s = new CsObject(); s.start = null; s.acc = 0; return s; },
  now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); },
  swStart(s) { if (s.start === null) s.start = rt.now(); },
  swStop(s) { if (s.start !== null) { s.acc += rt.now() - s.start; s.start = null; } },
  swReset(s) { s.start = null; s.acc = 0; },
  swMs(s) { return Math.floor(s.acc + (s.start !== null ? rt.now() - s.start : 0)); },
  *agg(arr, name, kind, fn, vk) {
    const vals = [];
    for (const x of arr) vals.push(fn ? yield* fn(x) : x);
    if (!vals.length) {
      if (name === 'Sum') return kind === 'decimal' ? new Dec(0n, 0) : 0;
      throw rt.ex('InvalidOperationException', 'Sequence contains no elements');
    }
    if (kind === 'decimal') {
      if (name === 'Sum' || name === 'Average') {
        let s = new Dec(0n, 0);
        for (const v of vals) s = Dec.add(s, v);
        return name === 'Sum' ? s : Dec.div(s, Dec.fromInt(vals.length));
      }
      let b = vals[0];
      for (const v of vals) { const c = Dec.cmp(v, b); if (name === 'Max' ? c > 0 : c < 0) b = v; }
      return b;
    }
    if (name === 'Sum' || name === 'Average') {
      let s = 0;
      for (const v of vals) s += v;
      if (name === 'Sum' && kind === 'int') {
        if (vk === 'int' && (s > 2147483647 || s < -2147483648)) throw rt.ex('OverflowException', 'Arithmetic operation resulted in an overflow.');
      }
      if (name === 'Sum' && vk === 'float') return Math.fround(s);
      return name === 'Sum' ? s : s / vals.length;
    }
    let b = vals[0];
    for (const v of vals) {
      let c;
      if (kind === 'string') c = rt.scmp(v, b);
      else if (kind === 'date') c = v.ms - b.ms;
      else c = v < b ? -1 : v > b ? 1 : 0;
      if (name === 'Max' ? c > 0 : c < 0) b = v;
    }
    return b;
  },
  *indexOfG(arr, v) { for (let i = 0; i < arr.length; i++) if (yield* rt.eqG(arr[i], v)) return i; return -1; },
  *lremoveG(l, v) { const i = yield* rt.indexOfG(l.a, v); if (i < 0) return false; l.a.splice(i, 1); l.v++; return true; },
  *lremoveAll(l, pred) {
    const keep = [];
    for (const x of l.a) if (!(yield* pred(x))) keep.push(x);
    const n = l.a.length - keep.length;
    l.a.length = 0; for (const x of keep) l.a.push(x);
    l.v++;
    return n;
  },
  *lforEach(l, action) {
    const v = l.v;
    for (let i = 0; i < l.a.length; i++) {
      yield* action(l.a[i]);
      if (l.v !== v) throw rt.ex('InvalidOperationException', 'Collection was modified; enumeration operation may not execute.');
    }
  },
  lgetRange(l, i, n, tn) {
    if (i < 0 || n < 0 || i + n > l.a.length) throw rt.ex('ArgumentException', 'Offset and length were out of bounds for the array or count is greater than the number of elements from index to the end of the source collection.');
    return new CsList(l.a.slice(i, i + n), tn);
  },
  linsertRange(l, i, items) {
    if (i < 0 || i > l.a.length) throw rt.ex('ArgumentOutOfRangeException', "Index must be within the bounds of the List. (Parameter 'index')");
    l.a.splice(i, 0, ...rt.toArr(items)); l.v++;
  },
});

// ===========================================================================
// 13. Prelude: library classes written in C# itself
// ===========================================================================

const PRELUDE_SRC = `
namespace System {
  public class Exception {
    private string _message;
    public Exception InnerException { get; private set; }
    public Exception() { }
    public Exception(string message) { _message = message; }
    public Exception(string message, Exception innerException) { _message = message; InnerException = innerException; }
    public virtual string Message { get { return _message ?? "Exception of type '" + GetType().FullName + "' was thrown."; } }
    public string StackTrace { get { return ""; } }
    public string Source { get { return ""; } }
    public override string ToString() { return GetType().FullName + ": " + Message; }
  }
  public class SystemException : Exception {
    public SystemException() : base("System error.") { }
    public SystemException(string message) : base(message) { }
    public SystemException(string message, Exception inner) : base(message, inner) { }
  }
  public class ApplicationException : Exception {
    public ApplicationException() : base("Error in the application.") { }
    public ApplicationException(string message) : base(message) { }
    public ApplicationException(string message, Exception inner) : base(message, inner) { }
  }
  public class FormatException : SystemException {
    public FormatException() : base("One of the identified items was in an invalid format.") { }
    public FormatException(string message) : base(message) { }
    public FormatException(string message, Exception inner) : base(message, inner) { }
  }
  public class ArithmeticException : SystemException {
    public ArithmeticException() : base("Overflow or underflow in the arithmetic operation.") { }
    public ArithmeticException(string message) : base(message) { }
    public ArithmeticException(string message, Exception inner) : base(message, inner) { }
  }
  public class DivideByZeroException : ArithmeticException {
    public DivideByZeroException() : base("Attempted to divide by zero.") { }
    public DivideByZeroException(string message) : base(message) { }
    public DivideByZeroException(string message, Exception inner) : base(message, inner) { }
  }
  public class OverflowException : ArithmeticException {
    public OverflowException() : base("Arithmetic operation resulted in an overflow.") { }
    public OverflowException(string message) : base(message) { }
    public OverflowException(string message, Exception inner) : base(message, inner) { }
  }
  public class IndexOutOfRangeException : SystemException {
    public IndexOutOfRangeException() : base("Index was outside the bounds of the array.") { }
    public IndexOutOfRangeException(string message) : base(message) { }
    public IndexOutOfRangeException(string message, Exception inner) : base(message, inner) { }
  }
  public class NullReferenceException : SystemException {
    public NullReferenceException() : base("Object reference not set to an instance of an object.") { }
    public NullReferenceException(string message) : base(message) { }
    public NullReferenceException(string message, Exception inner) : base(message, inner) { }
  }
  public class InvalidCastException : SystemException {
    public InvalidCastException() : base("Specified cast is not valid.") { }
    public InvalidCastException(string message) : base(message) { }
    public InvalidCastException(string message, Exception inner) : base(message, inner) { }
  }
  public class InvalidOperationException : SystemException {
    public InvalidOperationException() : base("Operation is not valid due to the current state of the object.") { }
    public InvalidOperationException(string message) : base(message) { }
    public InvalidOperationException(string message, Exception inner) : base(message, inner) { }
  }
  public class ObjectDisposedException : InvalidOperationException {
    public ObjectDisposedException(string message) : base(message) { }
  }
  public class NotImplementedException : SystemException {
    public NotImplementedException() : base("The method or operation is not implemented.") { }
    public NotImplementedException(string message) : base(message) { }
    public NotImplementedException(string message, Exception inner) : base(message, inner) { }
  }
  public class NotSupportedException : SystemException {
    public NotSupportedException() : base("Specified method is not supported.") { }
    public NotSupportedException(string message) : base(message) { }
    public NotSupportedException(string message, Exception inner) : base(message, inner) { }
  }
  public class ArgumentException : SystemException {
    public ArgumentException() : base("Value does not fall within the expected range.") { }
    public ArgumentException(string message) : base(message) { }
    public ArgumentException(string message, Exception inner) : base(message, inner) { }
    public ArgumentException(string message, string paramName) : base(message + " (Parameter '" + paramName + "')") { }
  }
  public class ArgumentNullException : ArgumentException {
    public ArgumentNullException() : base("Value cannot be null.") { }
    public ArgumentNullException(string paramName) : base("Value cannot be null. (Parameter '" + paramName + "')") { }
    public ArgumentNullException(string paramName, string message) : base(message + " (Parameter '" + paramName + "')") { }
  }
  public class ArgumentOutOfRangeException : ArgumentException {
    public ArgumentOutOfRangeException() : base("Specified argument was out of the range of valid values.") { }
    public ArgumentOutOfRangeException(string paramName) : base("Specified argument was out of the range of valid values. (Parameter '" + paramName + "')") { }
    public ArgumentOutOfRangeException(string paramName, string message) : base(message + " (Parameter '" + paramName + "')") { }
  }
  public class StackOverflowException : SystemException {
    public StackOverflowException() : base("Operation caused a stack overflow.") { }
    public StackOverflowException(string message) : base(message) { }
  }
  public class TimeoutException : SystemException {
    public TimeoutException() : base("The operation has timed out.") { }
    public TimeoutException(string message) : base(message) { }
  }
  public class ConsoleKeyInfo {
    public ConsoleKey Key { get; private set; }
    public char KeyChar { get; private set; }
  }
  public enum ConsoleKey { None = 0, Backspace = 8, Tab = 9, Clear = 12, Enter = 13, Pause = 19, Escape = 27, Spacebar = 32,
    PageUp = 33, PageDown = 34, End = 35, Home = 36, LeftArrow = 37, UpArrow = 38, RightArrow = 39, DownArrow = 40,
    Insert = 45, Delete = 46, D0 = 48, D1, D2, D3, D4, D5, D6, D7, D8, D9,
    A = 65, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z,
    NumPad0 = 96, NumPad1, NumPad2, NumPad3, NumPad4, NumPad5, NumPad6, NumPad7, NumPad8, NumPad9,
    Multiply = 106, Add = 107, Separator = 108, Subtract = 109, Decimal = 110, Divide = 111,
    F1 = 112, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11, F12,
    Oem1 = 186, OemPlus = 187, OemComma = 188, OemMinus = 189, OemPeriod = 190, Oem2 = 191, Oem3 = 192,
    Oem4 = 219, Oem5 = 220, Oem6 = 221, Oem7 = 222, Oem8 = 223, Oem102 = 226 }
  public enum ConsoleColor { Black, DarkBlue, DarkGreen, DarkCyan, DarkRed, DarkMagenta, DarkYellow, Gray, DarkGray, Blue, Green, Cyan, Red, Magenta, Yellow, White }
  public enum ConsoleModifiers { None = 0, Alt = 1, Shift = 2, Control = 4 }
  public enum DayOfWeek { Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday }
  public enum StringComparison { CurrentCulture, CurrentCultureIgnoreCase, InvariantCulture, InvariantCultureIgnoreCase, Ordinal, OrdinalIgnoreCase }
  public enum MidpointRounding { ToEven, AwayFromZero, ToZero, ToNegativeInfinity, ToPositiveInfinity }
  public enum StringSplitOptions { None = 0, RemoveEmptyEntries = 1, TrimEntries = 2 }
}
namespace System.Globalization {
  public enum DateTimeStyles { None = 0, AllowLeadingWhite = 1, AllowTrailingWhite = 2, AllowWhiteSpaces = 7, AssumeLocal = 32, AssumeUniversal = 64 }
}
namespace System.IO {
  public class IOException : System.SystemException {
    public IOException() : base("I/O error occurred.") { }
    public IOException(string message) : base(message) { }
    public IOException(string message, Exception inner) : base(message, inner) { }
  }
  public class FileNotFoundException : IOException {
    public FileNotFoundException() : base("Unable to find the specified file.") { }
    public FileNotFoundException(string message) : base(message) { }
    public FileNotFoundException(string message, Exception inner) : base(message, inner) { }
  }
  public class DirectoryNotFoundException : IOException {
    public DirectoryNotFoundException() : base("Attempted to access a path that is not on the disk.") { }
    public DirectoryNotFoundException(string message) : base(message) { }
  }
  public class EndOfStreamException : IOException {
    public EndOfStreamException() : base("Attempted to read past the end of the stream.") { }
    public EndOfStreamException(string message) : base(message) { }
  }
}
namespace System.Collections.Generic {
  public class KeyNotFoundException : System.SystemException {
    public KeyNotFoundException() : base("The given key was not present in the dictionary.") { }
    public KeyNotFoundException(string message) : base(message) { }
    public KeyNotFoundException(string message, Exception inner) : base(message, inner) { }
  }
}
`;

let preludeAst = null;
function getPrelude() {
  if (!preludeAst) preludeAst = parse(PRELUDE_SRC);
  return preludeAst;
}

// ===========================================================================
// 14. Driver: compile, run, check
// ===========================================================================

const codeCache = new Map();

function compileSource(source) {
  source = String(source == null ? '' : source).replace(/\r\n?/g, '\n');
  const cached = codeCache.get(source);
  if (cached) return cached;
  const unit = parse(source);
  if (!unit.types.length && !unit.globals.length) throw new CompileError("Program does not contain a static 'Main' method suitable for an entry point", 1);
  const comp = new Compiler();
  const code = comp.compileProgram(unit, getPrelude());
  let factory;
  try {
    factory = new Function('$rt', '$env', code);
  } catch (e) {
    const err = new Error('Internal compiler error: ' + e.message);
    err.code = code;
    throw err;
  }
  const result = { factory, code };
  if (codeCache.size > 200) codeCache.clear();
  codeCache.set(source, result);
  return result;
}

function compileErrorsOf(e) {
  if (e.all) return e.all.map((x) => ({ message: x.message, line: x.line }));
  return [{ message: e.csMessage, line: e.line }];
}

const nextTick = (typeof setImmediate === 'function') ? () => new Promise((r) => setImmediate(r)) :
  (typeof MessageChannel === 'function') ? (() => {
    const ch = new MessageChannel(); const q = [];
    ch.port1.onmessage = () => { const f = q.shift(); if (f) f(); };
    if (ch.port1.unref) ch.port1.unref();
    return () => new Promise((r) => { q.push(r); ch.port2.postMessage(0); });
  })() : () => new Promise((r) => setTimeout(r, 0));

// runs a generator that is not expected to need input (e.g. Exception.Message)
function runSync(it) {
  let r = it.next();
  let guard = 0;
  while (!r.done) { if (++guard > 1e6) break; r = it.next(); }
  return r.value;
}

const TIMEOUT_MSG = 'Your program ran for too long, so it was stopped. Check for a loop that never ends.';

async function run(source, opts) {
  opts = opts || {};
  const ctx = {
    write: typeof opts.write === 'function' ? opts.write : () => {},
    clear: typeof opts.clear === 'function' ? opts.clear : () => {},
    readLine: typeof opts.readLine === 'function' ? opts.readLine : async () => null,
    readKey: typeof opts.readKey === 'function' ? opts.readKey : null,
    files: opts.files && typeof opts.files === 'object' ? opts.files : {},
    shouldStop: typeof opts.shouldStop === 'function' ? opts.shouldStop : () => false,
  };
  const maxSteps = opts.maxSteps > 0 ? opts.maxSteps : 5000000;
  let prog;
  try {
    prog = compileSource(source);
  } catch (e) {
    if (e instanceof CompileError) {
      const first = compileErrorsOf(e)[0];
      return { ok: false, kind: 'compile', message: `Line ${first.line}: ${first.message}`, line: first.line };
    }
    return { ok: false, kind: 'compile', message: 'Line 1: Sorry, the interpreter could not understand this program (' + e.message + ')', line: 1 };
  }
  const env = { steps: { n: 0, y: Math.min(20000, maxSteps) }, TK: { tick: 1 }, RL: { readLine: 1 }, RK: { readKey: 1 }, RKI: { readKey: 1, intercept: 1 } };
  const state = { ctx, C: null, lineFn: null, consoleKeys: null, openWriters: new Set(), color: undefined, bgColor: undefined, fg: -1, bg: -1, colorNames: null, types: new Map() };
  const save = () => { for (const k of Object.keys(state)) state[k] = rt[k]; };
  const restore = () => { Object.assign(rt, state); };
  let inst;
  restore();
  try {
    inst = prog.factory(rt, env);
  } catch (e) {
    return { ok: false, kind: 'compile', message: 'Line 1: Sorry, the interpreter could not run this program (' + e.message + ')', line: 1 };
  }
  rt.C = inst.classes;
  rt.lineFn = inst.line;
  rt.consoleKeys = inst.consoleKeys;
  const cc = inst.classes; void cc;
  rt.colorNames = ['Black', 'DarkBlue', 'DarkGreen', 'DarkCyan', 'DarkRed', 'DarkMagenta', 'DarkYellow', 'Gray', 'DarkGray', 'Blue', 'Green', 'Cyan', 'Red', 'Magenta', 'Yellow', 'White'];
  save();
  const it = inst.main();
  let input;
  const steps = env.steps;
  const finish = (res) => { save(); return res; };
  while (true) {
    restore();
    let r;
    try {
      r = it.next(input);
    } catch (e) {
      save();
      return describeError(e, inst);
    }
    input = undefined;
    if (r.done) return finish({ ok: true });
    const v = r.value;
    save();
    if (v === env.TK) {
      if (steps.n >= maxSteps) return { ok: false, kind: 'timeout', message: TIMEOUT_MSG, line: inst.line() };
      steps.y = Math.min(steps.n + 20000, maxSteps);
      if (ctx.shouldStop()) return { ok: false, kind: 'stopped', message: 'Your program was stopped.', line: inst.line() };
      await nextTick();
      if (ctx.shouldStop()) return { ok: false, kind: 'stopped', message: 'Your program was stopped.', line: inst.line() };
      continue;
    }
    if (v === env.RL) {
      let s = await ctx.readLine();
      if (s === undefined) s = null;
      if (s !== null) s = String(s).replace(/\r?\n$/, '');
      input = s;
      if (ctx.shouldStop()) return { ok: false, kind: 'stopped', message: 'Your program was stopped.', line: inst.line() };
      continue;
    }
    if (v === env.RK || v === env.RKI) {
      if (!ctx.readKey) {
        restore();
        const ex = rt.ex('InvalidOperationException', 'Cannot read keys when either application does not have a console or when console input has been redirected. Try Console.Read.');
        return describeError(ex, inst);
      }
      let k = await ctx.readKey(v === env.RKI);
      if (!k) k = { key: 'Enter', keyChar: '\r' };
      input = k;
      if (ctx.shouldStop()) return { ok: false, kind: 'stopped', message: 'Your program was stopped.', line: inst.line() };
      continue;
    }
    if (v && typeof v === 'object' && v.sleep !== undefined) {
      const ms = Math.max(0, Math.min(Number(v.sleep) || 0, 5000));
      await new Promise((res) => setTimeout(res, ms));
      if (ctx.shouldStop()) return { ok: false, kind: 'stopped', message: 'Your program was stopped.', line: inst.line() };
      continue;
    }
  }
}

function describeError(e, inst) {
  if (e && e.$exit) return { ok: true };
  if (e instanceof CompileError) return { ok: false, kind: 'compile', message: `Line ${e.line || inst.line()}: ${e.csMessage}`, line: e.line || inst.line() };
  if (e instanceof RangeError && /call stack/i.test(e.message)) {
    const line = inst.line();
    return { ok: false, kind: 'runtime', message: 'Stack overflow. A method kept calling itself and never stopped - check that your recursion has a base case.', line };
  }
  let ex = e;
  if (!(ex instanceof CsObject)) {
    if (e instanceof TypeError && /null|undefined/.test(e.message)) ex = rt.ex('NullReferenceException', 'Object reference not set to an instance of an object.');
    else {
      const line = inst.line();
      return { ok: false, kind: 'runtime', message: 'Sorry, something went wrong inside the interpreter: ' + (e && e.message), line };
    }
  }
  let msg = '';
  try { msg = rt.s(runSync(ex.G$Exception$Message())); } catch (x) { msg = ''; }
  const full = ex.$cls ? ex.$cls.full : 'System.Exception';
  const line = ex.$line || inst.line();
  return { ok: false, kind: 'runtime', message: `Unhandled exception. ${full}: ${msg}`, line, exception: full };
}

function check(source) {
  try {
    compileSource(source);
    return [];
  } catch (e) {
    if (e instanceof CompileError) return compileErrorsOf(e);
    return [{ message: 'Sorry, the interpreter could not understand this program (' + e.message + ')', line: 1 }];
  }
}

return {
  run,
  check,
  version: '1.0.0',
  // exposed for testing
  _internal: { lex, parse, compileSource, fmtDouble, fmtNumber, sha256, Dec },
};
});
