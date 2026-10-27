#!/usr/bin/env node
/*
 * Test suite for js/csharp.js (the in-browser C# interpreter).
 *
 *   node tools/test-interpreter.js            run everything
 *   node tools/test-interpreter.js filter     run tests whose name contains "filter"
 *
 * Prints a pass count and exits non-zero if anything fails.
 */
'use strict';
const path = require('path');
const CSharp = require(path.join(__dirname, '..', 'js', 'csharp.js'));
const fs = require('fs');

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

// Key name for a typed character, as a browser UI would report it.
function keyFor(ch) {
  if (/^[a-z]$/i.test(ch)) return ch.toUpperCase();
  if (/^[0-9]$/.test(ch)) return 'D' + ch;
  if (ch === ' ') return 'Spacebar';
  if (ch === '\b') return 'Backspace';
  return 'Oem1';
}

/**
 * Runs a C# program.
 *   stdin: array of lines, or a function (outputSoFar) => line|null for adaptive input.
 *   readLine pops a line (null when exhausted).
 *   readKey consumes the characters of the next pending line one at a time and
 *   returns Enter at the end of that line.
 */
async function runProgram(src, opts) {
  opts = opts || {};
  const lines = Array.isArray(opts.stdin) ? opts.stdin.slice() : [];
  const nextLine = () => {
    if (typeof opts.stdin === 'function') return opts.stdin(out);
    return lines.length ? lines.shift() : null;
  };
  let out = '';
  let pending = null;
  let clears = 0;
  const files = opts.files || {};
  const result = await CSharp.run(src, {
    write: (s) => { out += s; },
    clear: () => { clears++; },
    readLine: async () => nextLine(),
    readKey: async () => {
      if (pending === null) {
        const l = nextLine();
        if (l === null || l === undefined) return { key: 'Enter', keyChar: '\r' };
        pending = l.split('');
      }
      if (!pending.length) { pending = null; return { key: 'Enter', keyChar: '\r' }; }
      const c = pending.shift();
      return { key: keyFor(c), keyChar: c };
    },
    files,
    maxSteps: opts.maxSteps,
    shouldStop: opts.shouldStop,
  });
  return { out, result, files, clears };
}

const tests = [];
// t(name, source, expectedOutput, options)
//   options.stdin, options.files
//   options.error: { kind, message (string = exact, RegExp), line }
//   options.check: (res) => true | string (extra assertions)
//   options.contains: [strings expected in the output] (instead of exact output)
function t(name, src, expected, options) { tests.push(Object.assign({ name, src, expected }, options || {})); }

// Wraps statements in a Program/Main. Line numbers inside `body` start at line 7.
function M(body, extra) {
  return `using System;
using System.Collections.Generic;
using System.Text;
using System.IO;
class Program {
    static void Main(string[] args) {
${body}
    }
${extra || ''}
}`;
}
// helper: compile error expected on a given line of the wrapped program (body line n => file line n + 6)
function CE(name, body, line, message, extra) {
  t(name, M(body, extra), null, { error: { kind: 'compile', line: line + 6, message } });
}
function CEsrc(name, src, line, message) {
  t(name, src, null, { error: { kind: 'compile', line, message } });
}
function RE(name, body, line, message, expectedOut) {
  t(name, M(body), expectedOut === undefined ? null : expectedOut, { error: { kind: 'runtime', line: line + 6, message } });
}

// ---------------------------------------------------------------------------
// 1. Output and number formatting
// ---------------------------------------------------------------------------

t('hello world', M('Console.WriteLine("Hello, World!");'), 'Hello, World!\n');
t('write vs writeline', M('Console.Write("a"); Console.Write("b"); Console.WriteLine(); Console.WriteLine("c");'), 'ab\nc\n');
t('top-level statements', 'using System;\nConsole.WriteLine("Top");\nint x = 3;\nConsole.WriteLine(x * 2);\n', 'Top\n6\n');
t('Main without args', 'using System;\nclass Program { static void Main() { Console.WriteLine("no args"); } }', 'no args\n');
t('namespace block', 'using System;\nnamespace Demo {\n class Program { static void Main(string[] args) { Console.WriteLine("ns"); } }\n}', 'ns\n');
t('file-scoped namespace', 'using System;\nnamespace Demo;\nclass Program { static void Main(string[] args) { Console.WriteLine("fs"); } }', 'fs\n');
t('classes in any order', `using System;
class Program { static void Main(string[] args) { Helper h = new Helper(); Console.WriteLine(h.Hi()); } }
class Helper { public string Hi() { return "hi from helper"; } }`, 'hi from helper\n');

t('int division truncates', M('Console.WriteLine(10 / 4); Console.WriteLine(-7 / 2); Console.WriteLine(7 % 3); Console.WriteLine(-7 % 3);'), '2\n-3\n1\n-1\n');
t('double formatting', M('Console.WriteLine(7.0); Console.WriteLine(10 / 4.0); Console.WriteLine(0.1 + 0.2); Console.WriteLine(1.0 / 3); Console.WriteLine(3.5);'), '7\n2.5\n0.30000000000000004\n0.3333333333333333\n3.5\n');
t('double extremes', M('Console.WriteLine(1e20); Console.WriteLine(1e15); Console.WriteLine(123456789012345.0); Console.WriteLine(0.00001); Console.WriteLine(0.0001); Console.WriteLine(-2.5e-7);'), '1E+20\n1E+15\n123456789012345\n1E-05\n0.0001\n-2.5E-07\n');
t('double divide by zero gives infinity', M('double z = 0; Console.WriteLine(1 / z); Console.WriteLine(-1 / z); Console.WriteLine(0 / z);'), '∞\n-∞\nNaN\n');
t('static types from variables', M('int a = 7; int b = 2; double r = a / b; Console.WriteLine(r); double q = (double)a / b; Console.WriteLine(q);'), '3\n3.5\n');
t('bool prints True/False', M('bool ok = 3 > 2; Console.WriteLine(ok); Console.WriteLine(!ok); Console.WriteLine("Value: " + ok);'), 'True\nFalse\nValue: True\n');
t('char arithmetic', M("char c = 'A'; Console.WriteLine(c + 1); Console.WriteLine((char)(c + 1)); Console.WriteLine((char)65); Console.WriteLine('a' - 'A'); c++; Console.WriteLine(c);"), '66\nB\nA\n32\nB\n');
t('char in concatenation', M("char c = 'x'; Console.WriteLine(\"c=\" + c); Console.WriteLine(c + \"!\"); Console.WriteLine('a' + 'b' + \"c\");"), 'c=x\nx!\n195c\n');
t('int overflow wraps', M('int big = int.MaxValue; big++; Console.WriteLine(big); Console.WriteLine(int.MaxValue + 1 == int.MinValue ? "wrap" : "no"); int m = 100000; Console.WriteLine(m * m);'), null, { error: { kind: 'compile', line: 7, message: 'The operation overflows at compile time in checked mode' } });
t('int overflow wraps at run time', M('int big = int.MaxValue; big++; Console.WriteLine(big); int m = 100000; Console.WriteLine(m * m);'), '-2147483648\n1410065408\n');
t('long arithmetic', M('long a = 3000000000; long b = a * 2; Console.WriteLine(b); Console.WriteLine(long.MaxValue); Console.WriteLine(a / 7);'), '6000000000\n9223372036854775807\n428571428\n');
t('casts', M('double d = 7.9; int i = (int)d; Console.WriteLine(i); Console.WriteLine((int)-7.9); Console.WriteLine((double)5 / 2); Console.WriteLine((int)\'A\');'), '7\n-7\n2.5\n65\n');
t('decimal literals', M('decimal price = 2.60m; Console.WriteLine(price * 5); decimal t = 7.50m; Console.WriteLine(t); Console.WriteLine(0.1m + 0.2m); Console.WriteLine(10m / 4); Console.WriteLine(1m / 3);'), '13.00\n7.50\n0.3\n2.5\n0.3333333333333333333333333333\n');
t('float', M('float f = 1.1f; Console.WriteLine(f); Console.WriteLine(f * 2); float g = 10; Console.WriteLine(g / 3);'), '1.1\n2.2\n3.3333333\n');
t('string concat with numbers', M('int a = 5; Console.WriteLine("a" + a + a); Console.WriteLine(a + a + "a"); Console.WriteLine("x" + 1.5 + true);'), 'a55\n10a\nx1.5True\n');
t('escapes and verbatim', M('Console.WriteLine("Tab\\there"); Console.WriteLine("Quote \\"hi\\""); Console.WriteLine("Back\\\\slash"); Console.WriteLine(@"C:\\new\\file ""q"""); Console.WriteLine(\'\\\'\');'), 'Tab\there\nQuote "hi"\nBack\\slash\nC:\\new\\file "q"\n\'\n');
t('newline escape', M('Console.Write("a\\nb\\n");'), 'a\nb\n');

t('interpolation basics', M('string name = "Aoife"; int age = 15; Console.WriteLine($"{name} is {age}"); Console.WriteLine($"Next year: {age + 1}"); Console.WriteLine($"{{braces}}");'), 'Aoife is 15\nNext year: 16\n{braces}\n');
t('interpolation formats', M('double p = 3.14159; Console.WriteLine($"{p:F2}"); Console.WriteLine($"[{"ab",5}]"); Console.WriteLine($"[{"ab",-5}]"); Console.WriteLine($"[{p,8:F1}]"); Console.WriteLine($"{42:D5}"); Console.WriteLine($"{255:X2} {255:x2}");'), '3.14\n[   ab]\n[ab   ]\n[     3.1]\n00042\nFF ff\n');
t('interpolation with ternary', M('int n = 1; Console.WriteLine($"{n} point{(n == 1 ? "" : "s")}"); n = 2; Console.WriteLine($"{n} point{(n == 1 ? "" : "s")}");'), '1 point\n2 points\n');
t('format strings F N C P', M('double x = 1234.5; Console.WriteLine(x.ToString("F2")); Console.WriteLine(x.ToString("N0")); Console.WriteLine(x.ToString("N2")); Console.WriteLine(x.ToString("C")); Console.WriteLine(4.5.ToString("C2")); Console.WriteLine(0.256.ToString("P1")); Console.WriteLine(0.5.ToString("P0")); Console.WriteLine(9.87.ToString("F0"));'), '1234.50\n1,235\n1,234.50\n£1,234.50\n£4.50\n25.6%\n50%\n10\n');
t('decimal currency', M('decimal total = 4.5m; Console.WriteLine(total.ToString("C")); Console.WriteLine($"{total:C}"); Console.WriteLine($"{12.345m:F2}");'), '£4.50\n£4.50\n12.35\n');
t('custom number formats', M('double v = 3.14159; Console.WriteLine(v.ToString("0.00")); Console.WriteLine(v.ToString("#.##")); Console.WriteLine(1234567.0.ToString("#,##0")); Console.WriteLine(5.ToString("000")); Console.WriteLine(0.5.ToString("#.##")); Console.WriteLine(2.0.ToString("0.0"));'), '3.14\n3.14\n1,234,567\n005\n.5\n2.0\n');
t('string.Format and placeholders', M('Console.WriteLine(string.Format("{0} has {1} points", "Ben", 12)); Console.WriteLine("{0,-6}|{1,6:F1}|", "ab", 2.25); Console.WriteLine(String.Format("{0:C}", 3)); Console.WriteLine("{0} {0}", "x");'), 'Ben has 12 points\nab    |   2.3|\n£3.00\nx x\n');
t('Math.Round bankers rounding', M('Console.WriteLine(Math.Round(2.5)); Console.WriteLine(Math.Round(3.5)); Console.WriteLine(Math.Round(-2.5)); Console.WriteLine(Math.Round(2.567, 2)); Console.WriteLine(Math.Round(2.5, MidpointRounding.AwayFromZero)); Console.WriteLine(Math.Round(1.005, 2));'), '2\n4\n-2\n2.57\n3\n1\n');
t('Math functions', M('Console.WriteLine(Math.Pow(2, 10)); Console.WriteLine(Math.Sqrt(16)); Console.WriteLine(Math.Abs(-5)); Console.WriteLine(Math.Max(3, 9)); Console.WriteLine(Math.Min(4.31, 4.27)); Console.WriteLine(Math.Floor(2.7)); Console.WriteLine(Math.Ceiling(2.1)); Console.WriteLine(Math.Truncate(-2.7)); Console.WriteLine(Math.PI); Console.WriteLine(Math.Round(Math.PI * 5 * 5, 2));'), '1024\n4\n5\n9\n4.27\n2\n3\n-2\n3.141592653589793\n78.54\n');
t('int.MaxValue and MinValue', M('Console.WriteLine(int.MaxValue); Console.WriteLine(int.MinValue); Console.WriteLine(double.MaxValue);'), '2147483647\n-2147483648\n1.7976931348623157E+308\n');
t('PadLeft PadRight tables', M('string[] names = { "Ben", "Grace", "Oisín" }; int[] scores = { 7, 12, 9 };\nfor (int i = 0; i < names.Length; i++) {\n Console.WriteLine(names[i].PadRight(8) + scores[i].ToString().PadLeft(4));\n}\nConsole.WriteLine("7".PadLeft(3, \'0\'));'), 'Ben        7\nGrace     12\nOisín      9\n007\n');

// ---------------------------------------------------------------------------
// 2. Variables, operators, control flow
// ---------------------------------------------------------------------------

t('several declarations in one line', M('int a = 1, b = 2, c; c = a + b; Console.WriteLine(c);'), '3\n');
t('const local', M('const int Max = 5; Console.WriteLine(Max * 2);'), '10\n');
t('var inference', M('var x = 5; var s = "hi"; var d = 2.0; Console.WriteLine(x / 2); Console.WriteLine(s.Length); Console.WriteLine(d / 4);'), '2\n2\n0.5\n');
t('compound assignment', M('int x = 10; x += 5; x -= 3; x *= 2; x /= 5; x %= 3; Console.WriteLine(x); string s = "a"; s += "b"; s += 1; Console.WriteLine(s); double d = 1; d /= 4; Console.WriteLine(d);'), '1\nab1\n0.25\n');
t('compound assignment int with double rhs', M('int x = 10; x += 2.5; Console.WriteLine(x);'), null, { error: { kind: 'compile', line: 7, message: "Cannot implicitly convert type 'double' to 'int'. An explicit conversion exists (are you missing a cast?)" } });
t('increment and decrement', M('int i = 5; Console.WriteLine(i++); Console.WriteLine(i); Console.WriteLine(++i); Console.WriteLine(i--); Console.WriteLine(--i);'), '5\n6\n7\n7\n5\n');
t('logical operators', M('bool a = true, b = false; Console.WriteLine(a && b); Console.WriteLine(a || b); Console.WriteLine(!a); Console.WriteLine(a ^ b); Console.WriteLine(5 > 3 && 2 > 1);'), 'False\nTrue\nFalse\nTrue\nTrue\n');
t('ternary', M('int age = 15; string s = age >= 18 ? "adult" : "child"; Console.WriteLine(s); Console.WriteLine(age % 2 == 0 ? "even" : "odd");'), 'child\nodd\n');
t('null coalescing', M('string s = null; Console.WriteLine(s ?? "default"); s = "set"; Console.WriteLine(s ?? "default"); string t2 = null; t2 ??= "filled"; Console.WriteLine(t2);'), 'default\nset\nfilled\n');
t('if else if else', M('int mark = 65;\nif (mark >= 70) { Console.WriteLine("A"); }\nelse if (mark >= 60) { Console.WriteLine("B"); }\nelse { Console.WriteLine("C"); }'), 'B\n');
t('nested blocks scoping', M('int total = 0;\nfor (int i = 0; i < 3; i++) { int sq = i * i; total += sq; }\nfor (int i = 0; i < 2; i++) { int sq = 100; total += sq; }\nConsole.WriteLine(total);'), '205\n');
t('while loop', M('int n = 1; while (n < 100) { n *= 2; } Console.WriteLine(n);'), '128\n');
t('do while runs once', M('int n = 10; do { Console.WriteLine(n); n++; } while (n < 5);'), '10\n');
t('for loop and break/continue', M('for (int i = 1; i <= 10; i++) { if (i % 2 == 0) continue; if (i > 7) break; Console.Write(i + " "); } Console.WriteLine();'), '1 3 5 7 \n');
t('nested loops times tables', M('for (int i = 1; i <= 3; i++) {\n for (int j = 1; j <= 3; j++) {\n  Console.Write($"{i * j,4}");\n }\n Console.WriteLine();\n}'), '   1   2   3\n   2   4   6\n   3   6   9\n');
t('switch with int', M('int day = 3;\nswitch (day) {\n case 1: Console.WriteLine("Mon"); break;\n case 2:\n case 3: Console.WriteLine("Tue or Wed"); break;\n default: Console.WriteLine("Other"); break;\n}'), 'Tue or Wed\n');
t('switch with strings', M('string house = "Erne";\nswitch (house) {\n case "Erne": case "Lough": Console.WriteLine("Blue"); break;\n case "Castle": Console.WriteLine("Red"); break;\n default: Console.WriteLine("Unknown"); break;\n}'), 'Blue\n');
t('switch with char and return', `using System;
class Program {
  static string Grade(char c) { switch (c) { case 'A': return "Top"; case 'B': return "Good"; default: return "Other"; } }
  static void Main(string[] args) { Console.WriteLine(Grade('A')); Console.WriteLine(Grade('Z')); }
}`, 'Top\nOther\n');
t('switch fall through is an error', M('int x = 1;\nswitch (x) {\n case 1: Console.WriteLine("one");\n case 2: Console.WriteLine("two"); break;\n}'), null, { error: { kind: 'compile', line: 9, message: "Control cannot fall through from one case label ('case 1:') to another (did you forget a break; ?)" } });
t('foreach over array', M('int[] nums = { 3, 1, 4 }; int sum = 0; foreach (int n in nums) { sum += n; } Console.WriteLine(sum);'), '8\n');
t('foreach over string', M('int vowels = 0; foreach (char c in "Programming") { if ("aeiou".Contains(c)) vowels++; } Console.WriteLine(vowels);'), '3\n');

// ---------------------------------------------------------------------------
// 3. Input, parsing and validation
// ---------------------------------------------------------------------------

t('ReadLine and greet', M('Console.Write("Name? "); string name = Console.ReadLine(); Console.WriteLine($"Hello {name}!");'), 'Name? Hello Ciarán!\n', { stdin: ['Ciarán'] });
t('int.Parse and Convert', M('int a = int.Parse(Console.ReadLine()); int b = Convert.ToInt32(Console.ReadLine()); double c = Convert.ToDouble(Console.ReadLine()); Console.WriteLine(a + b); Console.WriteLine(c * 2);'), '12\n5\n', { stdin: ['5', ' 7 ', '2.5'] });
t('ReadLine returns null at end', M('string s = Console.ReadLine(); Console.WriteLine(s == null);'), 'True\n', { stdin: [] });
t('TryParse validation loop', M('int age;\nConsole.Write("Age: ");\nwhile (!int.TryParse(Console.ReadLine(), out age) || age < 0 || age > 120) {\n Console.Write("Try again: ");\n}\nConsole.WriteLine($"Age is {age}");'), 'Age: Try again: Try again: Age is 15\n', { stdin: ['abc', '200', '15'] });
t('TryParse with out var', M('if (double.TryParse("3.75", out var d)) Console.WriteLine(d * 2); if (!int.TryParse("12.5", out int n)) Console.WriteLine($"no {n}"); bool.TryParse("true", out bool b); Console.WriteLine(b);'), '7.5\nno 0\nTrue\n');
t('decimal.Parse and bool.Parse', M('decimal d = decimal.Parse("19.99"); Console.WriteLine(d * 2); Console.WriteLine(bool.Parse("False")); Console.WriteLine(char.Parse("x"));'), '39.98\nFalse\nx\n');
RE('FormatException on bad int', 'int n = int.Parse("abc");', 1, "Unhandled exception. System.FormatException: The input string 'abc' was not in a correct format.");
RE('FormatException via Convert from input', 'Console.Write("Goals: ");\nint g = Convert.ToInt32(Console.ReadLine());', 2, "Unhandled exception. System.FormatException: The input string 'ten' was not in a correct format.", 'Goals: ');
tests[tests.length - 1].stdin = ['ten'];
RE('OverflowException on huge int', 'int n = int.Parse("99999999999");', 1, 'Unhandled exception. System.OverflowException: Value was either too large or too small for an Int32.');
t('Convert.ToInt32 of double rounds to even', M('Console.WriteLine(Convert.ToInt32(2.5)); Console.WriteLine(Convert.ToInt32(3.5)); Console.WriteLine(Convert.ToInt32(2.7)); Console.WriteLine(Convert.ToInt32("-4"));'), '2\n4\n3\n-4\n');

// ---------------------------------------------------------------------------
// 4. Strings and chars
// ---------------------------------------------------------------------------

t('string methods', M('string s = "  Hello World  "; string t2 = s.Trim(); Console.WriteLine(t2.ToUpper()); Console.WriteLine(t2.ToLower()); Console.WriteLine(t2.Length); Console.WriteLine(t2.Substring(6)); Console.WriteLine(t2.Substring(0, 5)); Console.WriteLine(t2.IndexOf(\'o\')); Console.WriteLine(t2.IndexOf("World")); Console.WriteLine(t2.LastIndexOf(\'o\')); Console.WriteLine(t2.Contains("lo W")); Console.WriteLine(t2.StartsWith("He")); Console.WriteLine(t2.EndsWith("x")); Console.WriteLine(t2.Replace("l", "L")); Console.WriteLine("[" + s.TrimStart() + "]"); Console.WriteLine("[" + s.TrimEnd() + "]");'), 'HELLO WORLD\nhello world\n11\nWorld\nHello\n4\n6\n7\nTrue\nTrue\nFalse\nHeLLo WorLd\n[Hello World  ]\n[  Hello World]\n');
t('string indexer and immutability', M('string s = "abc"; char first = s[0]; Console.WriteLine(first); Console.WriteLine(s[s.Length - 1]); string u = s.ToUpper(); Console.WriteLine(s + " " + u);'), 'a\nc\nabc ABC\n');
t('Split and Join', M('string line = "Ben,15,Erne"; string[] parts = line.Split(\',\'); Console.WriteLine(parts.Length); Console.WriteLine(parts[2]); Console.WriteLine(string.Join(" | ", parts)); string[] w = "a b  c".Split(\' \'); Console.WriteLine(w.Length); string[] x = "a;b,c".Split(\';\', \',\'); Console.WriteLine(x[2]); string[] y = "one--two".Split("--"); Console.WriteLine(y[1]); string[] z = "a b  c".Split(\' \', StringSplitOptions.RemoveEmptyEntries); Console.WriteLine(z.Length);'), '3\nErne\nBen | 15 | Erne\n4\nc\ntwo\n3\n');
t('Insert Remove ToCharArray', M('string s = "Hello"; Console.WriteLine(s.Insert(5, "!")); Console.WriteLine(s.Remove(1, 3)); Console.WriteLine(s.Remove(2)); char[] cs = s.ToCharArray(); Array.Reverse(cs); Console.WriteLine(new string(cs)); Console.WriteLine(cs);'), 'Hello!\nHo\nHe\nolleH\nolleH\n');
t('string compare and equals', M('Console.WriteLine("apple".CompareTo("banana")); Console.WriteLine(string.Compare("b", "a")); Console.WriteLine("abc".Equals("abc")); Console.WriteLine("a" == "a"); string a = "x"; string b = "X".ToLower(); Console.WriteLine(a == b); Console.WriteLine(string.Compare("Hello", "hello", true));'), '-1\n1\nTrue\nTrue\nTrue\n0\n');
t('IsNullOrEmpty and Empty', M('Console.WriteLine(string.IsNullOrEmpty("")); Console.WriteLine(string.IsNullOrEmpty(null)); Console.WriteLine(string.IsNullOrWhiteSpace("   ")); Console.WriteLine(string.Empty.Length); Console.WriteLine(string.Concat("a", "b", 3));'), 'True\nTrue\nTrue\n0\nab3\n');
t('char methods', M("Console.WriteLine(char.IsDigit('7')); Console.WriteLine(char.IsLetter('x')); Console.WriteLine(char.IsUpper('Q')); Console.WriteLine(char.IsLower('Q')); Console.WriteLine(char.IsWhiteSpace(' ')); Console.WriteLine(char.IsPunctuation('!')); Console.WriteLine(char.IsLetterOrDigit('_')); Console.WriteLine(char.ToUpper('b')); Console.WriteLine(char.ToLower('B')); Console.WriteLine(char.IsControl('\\n'));"), 'True\nTrue\nTrue\nFalse\nTrue\nTrue\nFalse\nB\nb\nTrue\n');
t('password strength checker', M('string pw = "Rugby2026"; bool up = false, dig = false; foreach (char c in pw) { if (char.IsUpper(c)) up = true; if (char.IsDigit(c)) dig = true; } Console.WriteLine(pw.Length >= 8 && up && dig ? "Strong" : "Weak");'), 'Strong\n');
t('caesar cipher', M('string plain = "XYZ abc"; int shift = 3; string result = "";\nforeach (char c in plain) {\n if (char.IsUpper(c)) result += (char)((c - \'A\' + shift) % 26 + \'A\');\n else if (char.IsLower(c)) result += (char)((c - \'a\' + shift) % 26 + \'a\');\n else result += c;\n}\nConsole.WriteLine(result);'), 'ABC def\n');
t('palindrome and reverse', M('string word = "Racecar"; string rev = ""; for (int i = word.Length - 1; i >= 0; i--) rev += word[i]; Console.WriteLine(rev); Console.WriteLine(rev.ToLower() == word.ToLower());'), 'racecaR\nTrue\n');
RE('Substring out of range', 'string s = "abc";\nConsole.WriteLine(s.Substring(2, 5));', 2, "Unhandled exception. System.ArgumentOutOfRangeException: Index and length must refer to a location within the string. (Parameter 'length')");
RE('string index out of range', 'string s = "abc";\nchar c = s[3];', 2, 'Unhandled exception. System.IndexOutOfRangeException: Index was outside the bounds of the array.');
t('StringBuilder', M('StringBuilder sb = new StringBuilder(); sb.Append("Hi"); sb.Append(\' \'); sb.Append(42); sb.AppendLine("!"); sb.Append(true); Console.WriteLine(sb.ToString()); Console.WriteLine(sb.Length); sb.Clear(); sb.Append("x").Append("y"); Console.WriteLine(sb);'), 'Hi 42!\nTrue\n11\nxy\n');

// ---------------------------------------------------------------------------
// 5. Arrays and collections
// ---------------------------------------------------------------------------

t('array basics', M('int[] a = new int[5]; a[0] = 3; a[4] = 9; Console.WriteLine(a.Length); Console.WriteLine(a[1]); Console.WriteLine(a[4]); string[] s = new string[2]; Console.WriteLine(s[0] == null); bool[] b = new bool[1]; Console.WriteLine(b[0]); char[] c = new char[1]; Console.WriteLine((int)c[0]); double[] d = new double[] { 1.5, 2 }; Console.WriteLine(d[1]);'), '5\n0\n9\nTrue\nFalse\n0\n2\n');
RE('array index out of range', 'int[] a = new int[3];\na[3] = 1;', 2, 'Unhandled exception. System.IndexOutOfRangeException: Index was outside the bounds of the array.');
t('array sort reverse indexof', M('int[] a = { 5, 2, 8, 1 }; Array.Sort(a); Console.WriteLine(string.Join(",", a)); Array.Reverse(a); Console.WriteLine(string.Join(",", a)); Console.WriteLine(Array.IndexOf(a, 2)); Console.WriteLine(Array.IndexOf(a, 7)); string[] n = { "Niamh", "aoife", "Ben" }; Array.Sort(n); Console.WriteLine(string.Join(" ", n));'), '1,2,5,8\n8,5,2,1\n2\n-1\naoife Ben Niamh\n');
t('2D arrays', M('int[,] grid = new int[3, 4]; grid[1, 2] = 7; Console.WriteLine(grid.GetLength(0)); Console.WriteLine(grid.GetLength(1)); Console.WriteLine(grid[1, 2]); Console.WriteLine(grid.Length);\nint[,] m = { { 1, 2 }, { 3, 4 } }; int sum = 0;\nfor (int r = 0; r < m.GetLength(0); r++) for (int c = 0; c < m.GetLength(1); c++) sum += m[r, c];\nConsole.WriteLine(sum); foreach (int v in m) Console.Write(v); Console.WriteLine();'), '3\n4\n7\n12\n10\n1234\n');
t('bubble sort', M('int[] a = { 64, 34, 25, 12, 22, 11, 90 };\nfor (int pass = 0; pass < a.Length - 1; pass++) {\n bool swapped = false;\n for (int i = 0; i < a.Length - 1 - pass; i++) {\n  if (a[i] > a[i + 1]) { int temp = a[i]; a[i] = a[i + 1]; a[i + 1] = temp; swapped = true; }\n }\n if (!swapped) break;\n}\nConsole.WriteLine(string.Join(" ", a));'), '11 12 22 25 34 64 90\n');
t('linear search', M('string[] names = { "Aoife", "Ben", "Grace" }; string target = "Ben"; int found = -1;\nfor (int i = 0; i < names.Length; i++) { if (names[i] == target) { found = i; break; } }\nConsole.WriteLine(found >= 0 ? $"Found at {found}" : "Not found");'), 'Found at 1\n');
t('List of int', M('List<int> l = new List<int>(); l.Add(5); l.Add(3); l.Add(8); l.Insert(0, 1); Console.WriteLine(l.Count); Console.WriteLine(l[0]); l.Remove(3); l.RemoveAt(0); Console.WriteLine(string.Join(",", l)); Console.WriteLine(l.Contains(8)); Console.WriteLine(l.IndexOf(8)); l.Sort(); l.Reverse(); Console.WriteLine(string.Join(",", l)); l.Clear(); Console.WriteLine(l.Count);'), '4\n1\n5,8\nTrue\n1\n8,5\n0\n');
t('List initialiser and LINQ-like', M('List<int> l = new List<int> { 4, 9, 2 }; Console.WriteLine(l.Max()); Console.WriteLine(l.Min()); Console.WriteLine(l.Sum()); Console.WriteLine(l.Average()); int[] arr = l.ToArray(); Console.WriteLine(arr.Length); l.AddRange(new int[] { 1, 1 }); Console.WriteLine(l.Count);'), '9\n2\n15\n5\n3\n5\n');
t('List lambdas', M('List<int> l = new List<int> { 5, 12, 7, 20, 3 };\nList<int> big = l.FindAll(x => x > 6); Console.WriteLine(string.Join(",", big));\nConsole.WriteLine(l.Find(x => x > 10)); Console.WriteLine(l.Exists(x => x == 3)); Console.WriteLine(l.FindIndex(x => x == 7));\nl.ForEach(x => Console.Write(x + " ")); Console.WriteLine();\nint removed = l.RemoveAll(x => x % 2 == 1); Console.WriteLine(removed + " " + string.Join(",", l));\nl.Sort((a, b) => b.CompareTo(a)); Console.WriteLine(string.Join(",", l));\nl.Sort((a, b) => { if (a < b) return -1; if (a > b) return 1; return 0; }); Console.WriteLine(string.Join(",", l));'), '12,7,20\n12\nTrue\n2\n5 12 7 20 3 \n3 12,20\n20,12\n12,20\n');
RE('List index out of range', 'List<int> l = new List<int>();\nint x = l[0];', 2, "Unhandled exception. System.ArgumentOutOfRangeException: Index was out of range. Must be non-negative and less than the size of the collection. (Parameter 'index')");
RE('modifying list in foreach', 'List<int> l = new List<int> { 1, 2 };\nforeach (int x in l) { l.Add(x); }', 2, 'Unhandled exception. System.InvalidOperationException: Collection was modified; enumeration operation may not execute.');
t('Dictionary', M('Dictionary<string, int> ages = new Dictionary<string, int>(); ages.Add("Ben", 15); ages["Grace"] = 14; ages["Ben"] = 16; Console.WriteLine(ages["Ben"]); Console.WriteLine(ages.Count); Console.WriteLine(ages.ContainsKey("Grace")); foreach (KeyValuePair<string, int> kv in ages) Console.WriteLine($"{kv.Key}: {kv.Value}"); if (ages.TryGetValue("Niamh", out int a)) Console.WriteLine(a); else Console.WriteLine("none " + a); ages.Remove("Ben"); foreach (string k in ages.Keys) Console.WriteLine(k); foreach (var v in ages.Values) Console.WriteLine(v);'), '16\n2\nTrue\nBen: 16\nGrace: 14\nnone 0\nGrace\n14\n');
t('Dictionary word count', M('string text = "the cat and the hat"; Dictionary<string, int> counts = new Dictionary<string, int>();\nforeach (string w in text.Split(\' \')) { if (counts.ContainsKey(w)) counts[w]++; else counts[w] = 1; }\nforeach (var kv in counts) Console.WriteLine(kv.Key + "=" + kv.Value);'), 'the=2\ncat=1\nand=1\nhat=1\n');
RE('Dictionary missing key', 'var d = new Dictionary<string, int>();\nConsole.WriteLine(d["x"]);', 2, "Unhandled exception. System.Collections.Generic.KeyNotFoundException: The given key 'x' was not present in the dictionary.");
RE('Dictionary duplicate add', 'var d = new Dictionary<string, int>();\nd.Add("a", 1);\nd.Add("a", 2);', 3, 'Unhandled exception. System.ArgumentException: An item with the same key has already been added. Key: a');
t('Dictionary initialiser', M('var d = new Dictionary<string, double> { { "pen", 0.5 }, { "pad", 1.25 } }; Console.WriteLine(d["pad"]); var e = new Dictionary<int, string> { [1] = "one", [2] = "two" }; Console.WriteLine(e[2]);'), '1.25\ntwo\n');

// ---------------------------------------------------------------------------
// 6. Methods
// ---------------------------------------------------------------------------

t('static methods and return', M('Console.WriteLine(Square(7)); Greet("Niamh");', `
    static int Square(int n) { return n * n; }
    static void Greet(string name) { Console.WriteLine("Hi " + name); }`), '49\nHi Niamh\n');
t('method overloading', M('Console.WriteLine(Add(1, 2)); Console.WriteLine(Add(1.5, 2)); Console.WriteLine(Add("a", "b")); Console.WriteLine(Add(1, 2, 3));', `
    static int Add(int a, int b) { return a + b; }
    static double Add(double a, double b) { return a + b + 0.5; }
    static string Add(string a, string b) { return a + b; }
    static int Add(int a, int b, int c) { return a + b + c; }`), '3\n4\nab\n6\n');
t('ref and out parameters', M('int a = 1, b = 2; Swap(ref a, ref b); Console.WriteLine($"{a} {b}"); MinMax(new int[] { 4, 9, 1 }, out int lo, out int hi); Console.WriteLine($"{lo} {hi}"); int q; Divide(17, 5, out q, out int r); Console.WriteLine($"{q} r {r}");', `
    static void Swap(ref int x, ref int y) { int t = x; x = y; y = t; }
    static void MinMax(int[] a, out int min, out int max) { min = a[0]; max = a[0]; foreach (int v in a) { if (v < min) min = v; if (v > max) max = v; } }
    static void Divide(int a, int b, out int q, out int r) { q = a / b; r = a % b; }`), '2 1\n1 9\n3 r 2\n');
t('recursion factorial fibonacci', M('Console.WriteLine(Fact(10)); Console.WriteLine(Fib(20)); Console.WriteLine(Fact(20));', `
    static long Fact(int n) { if (n <= 1) return 1; return n * Fact(n - 1); }
    static int Fib(int n) => n < 2 ? n : Fib(n - 1) + Fib(n - 2);`), '3628800\n6765\n2432902008176640000\n');
t('optional parameters and params', M('Hello(); Hello("Grace"); Console.WriteLine(Total(1, 2, 3, 4)); Console.WriteLine(Total());', `
    static void Hello(string name = "world") { Console.WriteLine("Hello " + name); }
    static int Total(params int[] nums) { int t = 0; foreach (int n in nums) t += n; return t; }`), 'Hello world\nHello Grace\n10\n0\n');
t('arrays passed by reference', M('int[] a = { 1, 2, 3 }; Double(a); Console.WriteLine(string.Join(",", a));', `
    static void Double(int[] arr) { for (int i = 0; i < arr.Length; i++) arr[i] *= 2; }`), '2,4,6\n');
t('local functions', M('int Twice(int x) { return x * 2; }\nConsole.WriteLine(Twice(21));'), '42\n');
t('stack overflow is reported', M('Forever(1);', '    static int Forever(int n) { return Forever(n + 1); }'), null, { error: { kind: 'runtime', message: /^Stack overflow/ } });

// ---------------------------------------------------------------------------
// 7. Classes and OOP
// ---------------------------------------------------------------------------

const PUPIL = `using System;
using System.Collections.Generic;
class Pupil
{
    private static int count = 0;
    public string Name { get; private set; }
    public int Score { get; set; }
    public static int Count { get { return count; } }
    public Pupil(string name) : this(name, 0) { }
    public Pupil(string name, int score) { Name = name; Score = score; count++; }
    public bool Passed() => Score >= 50;
    public override string ToString() { return $"{Name} ({Score})"; }
}
class Program
{
    static void Main(string[] args)
    {
        Pupil a = new Pupil("Aoife", 72);
        Pupil b = new Pupil("Ben") { Score = 40 };
        Console.WriteLine(a);
        Console.WriteLine("Pupil: " + b);
        Console.WriteLine($"{a.Name} passed: {a.Passed()}");
        Console.WriteLine(b.Passed());
        Console.WriteLine(Pupil.Count);
        List<Pupil> all = new List<Pupil> { a, b, new Pupil("Grace", 90) };
        all.Sort((x, y) => y.Score.CompareTo(x.Score));
        foreach (Pupil p in all) Console.WriteLine(p.ToString());
        Console.WriteLine(Pupil.Count);
    }
}`;
t('class with properties, ctor chaining, static counter', PUPIL, 'Aoife (72)\nPupil: Ben (40)\nAoife passed: True\nFalse\n2\nGrace (90)\nAoife (72)\nBen (40)\n3\n');
t('private set from outside is an error', PUPIL.replace('Console.WriteLine(a);', 'a.Name = "X";'), null, { error: { kind: 'compile', line: 20, message: "The property or indexer 'Pupil.Name' cannot be used in this context because the set accessor is inaccessible" } });
t('private field from outside is an error', `using System;
class Pupil { private int score; public Pupil(int s) { score = s; } }
class Program {
  static void Main(string[] args) {
    Pupil p = new Pupil(5);
    p.score = 10;
  }
}`, null, { error: { kind: 'compile', line: 6, message: "'Pupil.score' is inaccessible due to its protection level" } });
t('get-only property cannot be assigned', `using System;
class Box { public int Size { get; } public Box(int s) { Size = s; } }
class Program {
  static void Main(string[] args) {
    Box b = new Box(3);
    Console.WriteLine(b.Size);
    b.Size = 4;
  }
}`, null, { error: { kind: 'compile', line: 7, message: "Property or indexer 'Box.Size' cannot be assigned to -- it is read only" } });
t('full property with validation', `using System;
class Account {
  private decimal balance;
  public decimal Balance { get { return balance; } set { if (value >= 0) balance = value; else Console.WriteLine("Cannot be negative"); } }
  public void Deposit(decimal amount) { Balance += amount; }
}
class Program {
  static void Main(string[] args) {
    Account acc = new Account();
    acc.Deposit(20.50m);
    acc.Balance = -5;
    Console.WriteLine(acc.Balance.ToString("C"));
  }
}`, 'Cannot be negative\n£20.50\n');
t('default field values', `using System;
class Thing { public int n; public double d; public bool b; public string s; public char c; public int[] arr; public Thing other; }
class Program { static void Main(string[] args) { Thing t = new Thing(); Console.WriteLine(t.n); Console.WriteLine(t.d); Console.WriteLine(t.b); Console.WriteLine(t.s == null); Console.WriteLine((int)t.c); Console.WriteLine(t.arr == null); Console.WriteLine(t.other == null); } }`, '0\n0\nFalse\nTrue\n0\nTrue\nTrue\n');
t('field initialisers and const fields', `using System;
class Game { public const int MaxLives = 3; private int lives = MaxLives; private string title = "Quest"; public string Info() { return title + " " + lives + "/" + MaxLives; } }
class Program { static void Main(string[] args) { Console.WriteLine(new Game().Info()); Console.WriteLine(Game.MaxLives * 2); } }`, 'Quest 3/3\n6\n');
t('this keyword', `using System;
class Point { private int x, y; public Point(int x, int y) { this.x = x; this.y = y; } public int Sum() { return this.x + y; } }
class Program { static void Main(string[] args) { Console.WriteLine(new Point(3, 4).Sum()); } }`, '7\n');
t('inheritance virtual override base', `using System;
using System.Collections.Generic;
class Animal {
  protected string name;
  public Animal(string name) { this.name = name; }
  public virtual string Speak() { return "..."; }
  public string Describe() { return $"{name} says {Speak()}"; }
}
class Dog : Animal {
  public Dog(string name) : base(name) { }
  public override string Speak() { return "Woof"; }
}
class Puppy : Dog {
  public Puppy(string name) : base(name) { }
  public override string Speak() { return base.Speak() + "!"; }
}
class Program {
  static void Main(string[] args) {
    List<Animal> zoo = new List<Animal> { new Animal("Generic"), new Dog("Rex"), new Puppy("Bit") };
    foreach (Animal a in zoo) Console.WriteLine(a.Describe());
    Animal x = new Dog("Fido");
    Console.WriteLine(x.Speak());
    Console.WriteLine(x is Dog);
    Console.WriteLine(x is Puppy);
    Dog d = x as Dog;
    Console.WriteLine(d != null);
    Puppy p = x as Puppy;
    Console.WriteLine(p == null);
    if (x is Dog dd) Console.WriteLine("pattern " + dd.Speak());
  }
}`, 'Generic says ...\nRex says Woof\nBit says Woof!\nWoof\nTrue\nFalse\nTrue\nTrue\npattern Woof\n');
const SHAPES = `using System;
using System.Collections.Generic;
interface IDescribable { string Describe(); }
abstract class Shape : IDescribable {
  public string Name { get; protected set; }
  protected Shape(string name) { Name = name; }
  public abstract double Area();
  public virtual string Describe() { return $"{Name} with area {Area():F2}"; }
}
class Circle : Shape {
  private double r;
  public Circle(double r) : base("Circle") { this.r = r; }
  public override double Area() { return Math.PI * r * r; }
}
class Rectangle : Shape {
  private double w, h;
  public Rectangle(double w, double h) : base("Rectangle") { this.w = w; this.h = h; }
  public override double Area() => w * h;
  public override string Describe() { return "Rect: " + base.Describe(); }
}
class Program {
  static void Main(string[] args) {
    List<Shape> shapes = new List<Shape> { new Circle(1), new Rectangle(2, 3.5) };
    foreach (Shape s in shapes) Console.WriteLine(s.Describe());
    IDescribable d = new Circle(2);
    Console.WriteLine(d.Describe());
    Console.WriteLine(d is Shape);
  }
}`;
t('abstract classes and interfaces', SHAPES, 'Circle with area 3.14\nRect: Rectangle with area 7.00\nCircle with area 12.57\nTrue\n');
t('abstract instantiation error', SHAPES.replace('IDescribable d = new Circle(2);', 'Shape bad = new Shape("x"); IDescribable d = new Circle(2);'), null, { error: { kind: 'compile', line: 25, message: "Cannot create an instance of the abstract type 'Shape'" } });
t('missing abstract implementation', `using System;
abstract class Shape { public abstract double Area(); }
class Square : Shape { }
class Program { static void Main(string[] args) { } }`, null, { error: { kind: 'compile', line: 3, message: "'Square' does not implement inherited abstract member 'Shape.Area()'" } });
t('missing interface implementation', `using System;
interface IScorable { int Score(); }
class Team : IScorable { }
class Program { static void Main(string[] args) { } }`, null, { error: { kind: 'compile', line: 3, message: "'Team' does not implement interface member 'IScorable.Score()'" } });
t('instance method from static Main', `using System;
class Program {
  void Greet() { Console.WriteLine("hi"); }
  static void Main(string[] args) {
    Greet();
  }
}`, null, { error: { kind: 'compile', line: 5, message: "An object reference is required for the non-static field, method, or property 'Program.Greet()'" } });
t('instance field from static Main', `using System;
class Program {
  int score = 0;
  static void Main(string[] args) {
    score = 5;
  }
}`, null, { error: { kind: 'compile', line: 5, message: "An object reference is required for the non-static field, method, or property 'Program.score'" } });
t('static class and static fields', `using System;
static class Settings { public static int Volume = 5; public static void Louder() { Volume++; } }
class Program { static int calls; static void Main(string[] args) { Settings.Louder(); Settings.Louder(); calls += 2; Console.WriteLine(Settings.Volume + " " + calls); } }`, '7 2\n');
t('enums', `using System;
enum Colour { Red, Green, Blue }
class Program { static void Main(string[] args) {
  Colour c = Colour.Green;
  Console.WriteLine(c);
  Console.WriteLine((int)c);
  Console.WriteLine((Colour)2);
  if (c == Colour.Green) Console.WriteLine("go");
  switch (c) { case Colour.Red: Console.WriteLine("stop"); break; case Colour.Green: Console.WriteLine("green!"); break; }
  Console.WriteLine($"Colour: {c}");
} }`, 'Green\n1\nBlue\ngo\ngreen!\nColour: Green\n');
t('ToString override used in interpolation and lists', `using System;
using System.Collections.Generic;
class Card { public string Suit; public int Rank; public override string ToString() => $"{Rank} of {Suit}"; }
class Program { static void Main(string[] args) {
  Card c = new Card { Suit = "Hearts", Rank = 7 };
  Console.WriteLine($"[{c}]");
  Console.WriteLine(string.Join(", ", new List<Card> { c, new Card { Suit = "Spades", Rank = 1 } }));
  object o = c; Console.WriteLine(o.ToString());
} }`, '[7 of Hearts]\n7 of Hearts, 1 of Spades\n7 of Hearts\n');
t('class without ToString prints type name', `using System;
namespace Shop { class Item { } class Program { static void Main(string[] args) { Console.WriteLine(new Item()); } } }`, 'Shop.Item\n');
t('object reference equality and null', `using System;
class P { }
class Program { static void Main(string[] args) { P a = new P(); P b = a; P c = new P(); Console.WriteLine(a == b); Console.WriteLine(a == c); P n = null; Console.WriteLine(n == null); } }`, 'True\nFalse\nTrue\n');
RE('NullReferenceException', 'string s = null;\nConsole.WriteLine(s.Length);', 2, 'Unhandled exception. System.NullReferenceException: Object reference not set to an instance of an object.');
t('NullReference on user object', `using System;
class P { public int X; }
class Program { static void Main(string[] args) {
  P p = null;
  Console.WriteLine(p.X);
} }`, null, { error: { kind: 'runtime', line: 5, message: 'Unhandled exception. System.NullReferenceException: Object reference not set to an instance of an object.' } });
t('protected access from subclass works, outside fails', `using System;
class A { protected int v = 1; }
class B : A { public int Get() { return v + 1; } }
class Program { static void Main(string[] args) {
  Console.WriteLine(new B().Get());
  B b = new B();
  Console.WriteLine(b.v);
} }`, null, { error: { kind: 'compile', line: 7, message: "'A.v' is inaccessible due to its protection level" } });
t('private method inaccessible', `using System;
class A { private void Secret() { } }
class Program { static void Main(string[] args) {
  A a = new A();
  a.Secret();
} }`, null, { error: { kind: 'compile', line: 5, message: "'A.Secret()' is inaccessible due to its protection level" } });
t('IComparable sort of objects', `using System;
using System.Collections.Generic;
class Player : IComparable<Player> {
  public string Name; public int Goals;
  public Player(string n, int g) { Name = n; Goals = g; }
  public int CompareTo(Player other) { return other.Goals.CompareTo(Goals); }
}
class Program { static void Main(string[] args) {
  List<Player> ps = new List<Player> { new Player("A", 2), new Player("B", 5), new Player("C", 3) };
  ps.Sort();
  foreach (Player p in ps) Console.Write(p.Name);
  Console.WriteLine();
} }`, 'BCA\n');

// ---------------------------------------------------------------------------
// 8. Exceptions
// ---------------------------------------------------------------------------

t('try catch finally', M('try {\n int[] a = new int[2];\n a[5] = 1;\n Console.WriteLine("not here");\n} catch (IndexOutOfRangeException ex) {\n Console.WriteLine("Caught: " + ex.Message);\n} finally {\n Console.WriteLine("finally");\n}\nConsole.WriteLine("after");'), 'Caught: Index was outside the bounds of the array.\nfinally\nafter\n');
t('catch order respects inheritance', M('try { File.ReadAllText("missing.txt"); }\ncatch (FileNotFoundException ex) { Console.WriteLine("FNF " + ex.Message); }\ncatch (IOException) { Console.WriteLine("IO"); }\ncatch (Exception) { Console.WriteLine("other"); }\ntry { throw new FileNotFoundException("x"); } catch (IOException e) { Console.WriteLine("as IO: " + e.Message); }\ntry { int z = 0; int r = 5 / z; } catch (ArithmeticException e) { Console.WriteLine(e.GetType().Name); }'), "FNF Could not find file 'missing.txt'.\nas IO: x\nDivideByZeroException\n");
t('unreachable catch order is an error', M('try { }\ncatch (Exception) { }\ncatch (FormatException) { }'), null, { error: { kind: 'compile', line: 9, message: "A previous catch clause already catches all exceptions of this or a super type ('System.Exception')" } });
t('catch without type and rethrow', M('try {\n try { throw new InvalidOperationException("inner"); }\n catch { Console.WriteLine("logging"); throw; }\n} catch (Exception ex) { Console.WriteLine(ex.Message); }'), 'logging\ninner\n');
t('custom exception class', `using System;
class InsufficientFundsException : Exception {
  public decimal Shortfall { get; }
  public InsufficientFundsException(string message, decimal shortfall) : base(message) { Shortfall = shortfall; }
}
class Program { static void Main(string[] args) {
  try { throw new InsufficientFundsException("Not enough money", 2.5m); }
  catch (InsufficientFundsException ex) { Console.WriteLine($"{ex.Message} (short by {ex.Shortfall:C})"); }
  throw new InsufficientFundsException("Bust", 1);
} }`, 'Not enough money (short by £2.50)\n', { error: { kind: 'runtime', line: 9, message: 'Unhandled exception. InsufficientFundsException: Bust' } });
RE('DivideByZeroException', 'int a = 10, b = 0;\nConsole.WriteLine(a / b);', 2, 'Unhandled exception. System.DivideByZeroException: Attempted to divide by zero.');
RE('throw new Exception', 'Console.WriteLine("start");\nthrow new Exception("Something broke");', 2, 'Unhandled exception. System.Exception: Something broke', 'start\n');
RE('ArgumentException thrown by user', 'throw new ArgumentException("Bad age");', 1, 'Unhandled exception. System.ArgumentException: Bad age');
t('exception Message default', M('try { throw new FormatException(); } catch (Exception e) { Console.WriteLine(e.Message); }\ntry { throw new Exception(); } catch (Exception e) { Console.WriteLine(e.Message); }'), "One of the identified items was in an invalid format.\nException of type 'System.Exception' was thrown.\n");
t('finally runs on return', `using System;
class Program {
  static int F() { try { return 1; } finally { Console.WriteLine("cleanup"); } }
  static void Main(string[] args) { Console.WriteLine(F()); }
}`, 'cleanup\n1\n');
t('exception from nested method call keeps the throw line', `using System;
class Program {
  static int Check(int x) {
    if (x < 0) throw new ArgumentOutOfRangeException("x");
    return x;
  }
  static void Main(string[] args) { Check(1); Check(-1); }
}`, null, { error: { kind: 'runtime', line: 4, message: "Unhandled exception. System.ArgumentOutOfRangeException: Specified argument was out of the range of valid values. (Parameter 'x')" } });

// ---------------------------------------------------------------------------
// 9. Files
// ---------------------------------------------------------------------------

t('File write read append', M('File.WriteAllText("a.txt", "one\\n"); File.AppendAllText("a.txt", "two" + Environment.NewLine); Console.Write(File.ReadAllText("a.txt")); string[] lines = File.ReadAllLines("a.txt"); Console.WriteLine(lines.Length); Console.WriteLine(File.Exists("a.txt")); File.Delete("a.txt"); Console.WriteLine(File.Exists("a.txt"));'), 'one\ntwo\n2\nTrue\nFalse\n', { check: (r) => (Object.keys(r.files).length === 0 ? true : 'a.txt should be deleted') });
t('WriteAllLines and AppendAllLines', M('List<string> l = new List<string> { "x", "y" }; File.WriteAllLines("l.txt", l); File.AppendAllLines("l.txt", new string[] { "z" }); foreach (string s in File.ReadAllLines("l.txt")) Console.Write(s); Console.WriteLine();'), 'xyz\n', { check: (r) => (r.files['l.txt'] === 'x\ny\nz\n' ? true : 'file content was ' + JSON.stringify(r.files['l.txt'])) });
t('preloaded files', M('foreach (string line in File.ReadAllLines("users.txt")) { string[] p = line.Split(\',\'); Console.WriteLine(p[0]); }'), 'aoife\nben\n', { files: { 'users.txt': 'aoife,abc\nben,def\n' } });
RE('FileNotFoundException', 'string s = File.ReadAllText("nope.txt");', 1, "Unhandled exception. System.IO.FileNotFoundException: Could not find file 'nope.txt'.");
t('StreamWriter and StreamReader', M('using (StreamWriter w = new StreamWriter("sevens.txt")) {\n for (int i = 1; i <= 3; i++) w.WriteLine($"{i} x 7 = {i * 7}");\n}\nusing (StreamReader r = new StreamReader("sevens.txt")) {\n while (!r.EndOfStream) { Console.WriteLine(r.ReadLine()); }\n}\nStreamWriter a = new StreamWriter("sevens.txt", true); a.Write("end"); a.Close();\nStreamReader r2 = new StreamReader("sevens.txt"); string line; int n = 0; while ((line = r2.ReadLine()) != null) n++; r2.Close(); Console.WriteLine(n);\nusing (var rr = new StreamReader("sevens.txt")) { Console.WriteLine(rr.ReadToEnd().Length); }'), '1 x 7 = 7\n2 x 7 = 14\n3 x 7 = 21\n4\n35\n');
t('StreamWriter not closed keeps data buffered', M('StreamWriter w = new StreamWriter("x.txt"); w.WriteLine("hi"); Console.WriteLine(File.Exists("x.txt"));'), 'True\n', { check: (r) => (r.files['x.txt'] === '' ? true : 'unflushed data should not be written') });

// ---------------------------------------------------------------------------
// 10. DateTime, Random, hashing
// ---------------------------------------------------------------------------

t('DateTime construct and format', M('DateTime d = new DateTime(2026, 3, 7, 9, 5, 0); Console.WriteLine(d.ToString("dd/MM/yyyy")); Console.WriteLine(d.ToString("HH:mm")); Console.WriteLine(d.ToString("yyyy-MM-dd HH:mm")); Console.WriteLine(d.ToShortDateString()); Console.WriteLine(d); Console.WriteLine(d.DayOfWeek); Console.WriteLine($"{d:dd MMM yyyy}"); DateTime e = d.AddDays(30); Console.WriteLine(e.ToString("d/M/yyyy")); Console.WriteLine((e - d).Days); Console.WriteLine((e - d).TotalMinutes); Console.WriteLine(d.Year + d.Month + d.Day);'), '07/03/2026\n09:05\n2026-03-07 09:05\n07/03/2026\n07/03/2026 09:05:00\nSaturday\n07 Mar 2026\n6/4/2026\n30\n43200\n2036\n');
t('DateTime.ParseExact and Parse', M('DateTime d = DateTime.ParseExact("2025-12-01 14:30", "yyyy-MM-dd HH:mm", System.Globalization.CultureInfo.InvariantCulture); Console.WriteLine(d.ToString("dd/MM/yyyy HH:mm")); DateTime p = DateTime.Parse("25/12/2025"); Console.WriteLine(p.DayOfWeek); Console.WriteLine(p.AddMinutes(90).ToString("HH:mm"));'), '01/12/2025 14:30\nThursday\n01:30\n');
RE('ParseExact bad format', 'DateTime d = DateTime.ParseExact("2025/12/01", "yyyy-MM-dd", null);', 1, "Unhandled exception. System.FormatException: String '2025/12/01' was not recognized as a valid DateTime.");
t('DateTime.Now is sensible', M('DateTime now = DateTime.Now; Console.WriteLine(now.Year >= 2024); Console.WriteLine(DateTime.Today.Hour);'), 'True\n0\n');
t('seeded Random matches .NET', M('Random r = new Random(42); Console.WriteLine(r.Next(1, 101)); Console.WriteLine(r.Next(1, 101)); Console.WriteLine(r.Next(10)); Console.WriteLine(r.Next()); Random r2 = new Random(1); Console.WriteLine(r2.Next(1, 7)); Console.WriteLine(r2.Next(1, 7)); Console.WriteLine(r2.Next(1, 7));'), '67\n15\n1\n1122627734\n2\n1\n3\n');
t('Random seeds match known .NET values', M('Console.WriteLine(new Random(0).Next()); Console.WriteLine(new Random(1).Next());'), '1559595546\n534011718\n');
t('Random in range', M('Random r = new Random(); bool ok = true; for (int i = 0; i < 1000; i++) { int d = r.Next(1, 7); if (d < 1 || d > 6) ok = false; double x = r.NextDouble(); if (x < 0 || x >= 1) ok = false; } Console.WriteLine(ok);'), 'True\n');
t('guessing game with seeded Random', M('Random rng = new Random(7);\nint secret = rng.Next(1, 21);\nint guesses = 0; int guess = 0;\nwhile (guess != secret) {\n Console.Write("Guess: ");\n string input = Console.ReadLine();\n if (input == null) break;\n if (!int.TryParse(input, out guess)) { Console.WriteLine("Numbers only"); continue; }\n guesses++;\n if (guess < secret) Console.WriteLine("Too low");\n else if (guess > secret) Console.WriteLine("Too high");\n}\nConsole.WriteLine($"Got it in {guesses}! It was {secret}");'), 'Guess: Too low\nGuess: Numbers only\nGuess: Too high\nGuess: Got it in 3! It was 8\n', { stdin: ['5', 'abc', '12', '8'] });
t('SHA-256 of known strings', `using System;
using System.Security.Cryptography;
using System.Text;
class Program {
  static string Hash(string text) {
    using (SHA256 sha = SHA256.Create()) {
      byte[] bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(text));
      StringBuilder hex = new StringBuilder();
      foreach (byte b in bytes) hex.Append(b.ToString("x2"));
      return hex.ToString();
    }
  }
  static void Main(string[] args) {
    Console.WriteLine(Hash("test"));
    Console.WriteLine(Hash("abc"));
    Console.WriteLine(Hash(""));
    Console.WriteLine(Hash("Rugby2026"));
    Console.WriteLine(Hash("Ciarán"));
  }
}`, '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08\nba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\n4ef8933fca276ed6eccabafb6303c4d2bbe163c43aa796ff69fc0b224689a125\n' + require('crypto').createHash('sha256').update('Ciarán', 'utf8').digest('hex') + '\n');
t('byte values', M('byte b = 200; Console.WriteLine(b); Console.WriteLine(b.ToString("X2")); byte[] bs = System.Text.Encoding.UTF8.GetBytes("Hi"); Console.WriteLine(bs[0] + bs[1]); Console.WriteLine(bs.Length);'), '200\nC8\n177\n2\n');

// ---------------------------------------------------------------------------
// 11. Console extras: ReadKey, Clear, colours
// ---------------------------------------------------------------------------

t('ReadKey masked password', M('string pw = "";\nConsoleKeyInfo k = Console.ReadKey(true);\nwhile (k.Key != ConsoleKey.Enter) {\n if (k.Key == ConsoleKey.Backspace) { if (pw.Length > 0) pw = pw.Substring(0, pw.Length - 1); }\n else if (!char.IsControl(k.KeyChar)) { pw += k.KeyChar; Console.Write("*"); }\n k = Console.ReadKey(true);\n}\nConsole.WriteLine();\nConsole.WriteLine(pw);'), '*****\nab1Zx\n', { stdin: ['ab1Zx'] });
t('ReadKey key names', M('ConsoleKeyInfo k = Console.ReadKey(); Console.WriteLine(k.Key); Console.WriteLine(k.KeyChar); k = Console.ReadKey(); Console.WriteLine(k.Key == ConsoleKey.D7); k = Console.ReadKey(); Console.WriteLine(k.Key);'), 'Y\ny\nTrue\nEnter\n', { stdin: ['y7'] });
t('Console.Clear and colours', M('Console.ForegroundColor = ConsoleColor.Green; Console.WriteLine("green"); Console.ResetColor(); Console.Clear(); Console.WriteLine(Console.ForegroundColor == ConsoleColor.Gray);'), 'green\nTrue\n', { check: (r) => (r.clears === 1 ? true : 'Clear was not called') });

// ---------------------------------------------------------------------------
// 12. Compile errors (wording and line numbers)
// ---------------------------------------------------------------------------

CE('missing semicolon', 'int x = 5\nConsole.WriteLine(x);', 1, '; expected');
CE('missing semicolon after call', 'Console.WriteLine("a")\nConsole.WriteLine("b");', 1, '; expected');
CE('undeclared variable', 'int score = 5;\nConsole.WriteLine(scroe);', 2, "The name 'scroe' does not exist in the current context");
CE('lowercase console', 'console.WriteLine("hi");', 1, "The name 'console' does not exist in the current context");
CE('string to int', 'int goals = "two";', 1, "Cannot implicitly convert type 'string' to 'int'");
CE('ReadLine to int', 'int goals = Console.ReadLine();', 1, "Cannot implicitly convert type 'string' to 'int'");
CE('double to int needs cast', 'double d = 2.5;\nint i = d;', 2, "Cannot implicitly convert type 'double' to 'int'. An explicit conversion exists (are you missing a cast?)");
CE('int to string', 'string s = 5;', 1, "Cannot implicitly convert type 'int' to 'string'");
CE('string expression to int', 'string a = "1";\nint n = a + 2;', 2, "Cannot implicitly convert type 'string' to 'int'");
CE('double literal to decimal', 'decimal price = 7.99;', 1, "Cannot implicitly convert type 'double' to 'decimal'. An explicit conversion exists (are you missing a cast?)");
CE('assign to const', 'const int Max = 5;\nMax = 6;', 2, 'The left-hand side of an assignment must be a variable, property or indexer');
CEsrc('assign to const field', `using System;
class Program {
  const int MaxPlayers = 15;
  static void Main(string[] args) {
    MaxPlayers = 16;
  }
}`, 5, 'The left-hand side of an assignment must be a variable, property or indexer');
CE('use of unassigned variable', 'int total;\nConsole.WriteLine(total);', 2, "Use of unassigned local variable 'total'");
CE('variable out of scope', 'for (int i = 0; i < 3; i++) { int sq = i; }\nConsole.WriteLine(sq);', 2, "The name 'sq' does not exist in the current context");
CE('duplicate variable', 'int x = 1;\nint x = 2;', 2, "A local variable or function named 'x' is already defined in this scope");
CE('if condition must be bool', 'int x = 5;\nif (x = 5) { }', 2, "Cannot implicitly convert type 'int' to 'bool'");
CE('missing closing brace', 'if (true) {\nConsole.WriteLine("x");', 5, '} expected', '');
CE('unknown method', 'Console.WriteLin("hi");', 1, "'Console' does not contain a definition for 'WriteLin'. Did you mean 'WriteLine'?");
CE('unknown type', 'Strin s = "x";', 1, "The type or namespace name 'Strin' could not be found (are you missing a using directive or an assembly reference?)");
CE('wrong argument count', 'Hi(1, 2);', 1, "No overload for method 'Hi' takes 2 arguments", '    static void Hi(int a) { }');
CE('wrong argument type', 'Hi("x");', 1, "Argument 1: cannot convert from 'string' to 'int'", '    static void Hi(int a) { }');
CE('not all code paths return', 'Console.WriteLine(F(1));', 1 + 3, "'Program.F(int)': not all code paths return a value", '\n    static int F(int x) { if (x > 0) return 1; }');
CE('void return value', 'int x = Hi();', 1, "Cannot implicitly convert type 'void' to 'int' (the method doesn't return a value)", '    static void Hi() { }');
CE('string comparison with <', 'string a = "x", b = "y";\nif (a < b) { }', 2, "Operator '<' cannot be applied to operands of type 'string' and 'string' (use string.Compare(a, b) or a.CompareTo(b) to compare text)");
CE('unsupported feature: goto', 'goto end;', 1, "'goto' is not supported in this course");
CE('unsupported LINQ', 'int[] a = { 1, 2 };\nvar b = a.Where(x => x > 1);', 2, "The LINQ method 'Where' is not supported in this course");
CE('unsupported tuple', 'var t2 = (1, 2);', 1, 'Tuples are not supported in this course');
CE('unsupported switch expression', 'int x = 1;\nstring s = x switch { 1 => "a", _ => "b" };', 2, 'Switch expressions (use a switch statement instead) are not supported in this course');
CE('statement must be call or assignment', 'int x = 1;\nx == 2;', 2, 'Only assignment, call, increment, decrement, await, and new object expressions can be used as a statement (did you mean = instead of ==?)');
CE('char literal too long', "char c = 'ab';", 1, 'Too many characters in character literal');
CE('newline in string', 'string s = "abc;\nConsole.WriteLine(s);', 1, 'Newline in constant');
CE('foreach type mismatch', 'int n = 5;\nforeach (int x in n) { }', 2, "foreach statement cannot operate on variables of type 'int' because 'int' does not contain a public instance or extension definition for 'GetEnumerator'");
CE('break outside loop', 'break;', 1, 'No enclosing loop out of which to break or continue');
CE('method group without brackets', 'string s = "abc";\nConsole.WriteLine(s.ToUpper);', 2, "Argument 1: cannot convert from 'method group' to 'string'. Did you forget the brackets () when calling 'ToUpper'?");
CE('Length used as method', 'string s = "abc";\nint n = s.Length();', 2, "Non-invocable member 'string.Length' cannot be used like a method (remove the brackets: s.Length)");
CEsrc('no Main method', 'using System;\nclass Program { static void Start() { } }', 1, "Program does not contain a static 'Main' method suitable for an entry point");
CEsrc('error line inside class method', `using System;
class Calculator {
    public int Add(int a, int b) {
        return a + c;
    }
}
class Program { static void Main(string[] args) { } }`, 4, "The name 'c' does not exist in the current context");
CEsrc('class used before definition is fine but typo in type is not', `using System;
class Program { static void Main(string[] args) { Pupl p = new Pupil(); } }
class Pupil { }`, 2, "The type or namespace name 'Pupl' could not be found (are you missing a using directive or an assembly reference?)");
CEsrc('override without virtual', `using System;
class A { public void F() { } }
class B : A { public override void F() { } }
class Program { static void Main(string[] args) { } }`, 3, "'B.F()': cannot override inherited member 'A.F()' because it is not marked virtual, abstract, or override");
CEsrc('constructor argument mismatch', `using System;
class Pupil { public Pupil(string name) { } }
class Program { static void Main(string[] args) {
  Pupil p = new Pupil();
} }`, 4, "There is no argument given that corresponds to the required parameter 'name' of 'Pupil.Pupil(string)'");
t('check() returns errors without running', 'class Program { static void Main() { int x = "a"; } }', null, {
  checkOnly: [{ message: "Cannot implicitly convert type 'string' to 'int'", line: 1 }],
});
t('check() returns [] for good code', 'class Program { static void Main() { System.Console.WriteLine(1); } }', null, { checkOnly: [] });

// ---------------------------------------------------------------------------
// 13. Timeout and stop
// ---------------------------------------------------------------------------

t('infinite loop times out', M('int i = 0;\nwhile (true) { i++; }'), null, { maxSteps: 200000, error: { kind: 'timeout', message: 'Your program ran for too long, so it was stopped. Check for a loop that never ends.' } });
t('infinite recursion-free loop with output times out', M('for (;;) { }'), null, { maxSteps: 100000, error: { kind: 'timeout', message: /ran for too long/ } });
t('shouldStop stops the program', M('while (true) { }'), null, { shouldStop: (() => { let n = 0; return () => ++n > 2; })(), error: { kind: 'stopped' } });

// ---------------------------------------------------------------------------
// 14. Typical pupil programs
// ---------------------------------------------------------------------------

t('times table program', M('Console.Write("Which times table? ");\nint n = int.Parse(Console.ReadLine());\nfor (int i = 1; i <= 12; i++) {\n Console.WriteLine($"{i} x {n} = {i * n}");\n}'), 'Which times table? ' + Array.from({ length: 12 }, (_, i) => `${i + 1} x 7 = ${(i + 1) * 7}`).join('\n') + '\n', { stdin: ['7'] });
t('average of marks with validation', M('int total = 0, count = 0;\nwhile (true) {\n Console.Write("Mark (or -1): ");\n string s = Console.ReadLine();\n if (!int.TryParse(s, out int m)) { Console.WriteLine("Invalid"); continue; }\n if (m == -1) break;\n total += m; count++;\n}\ndouble avg = (double)total / count;\nConsole.WriteLine($"Average: {avg:F1}");\nConsole.WriteLine("Rounded: " + Math.Round(avg));'), 'Mark (or -1): Mark (or -1): Invalid\nMark (or -1): Mark (or -1): Mark (or -1): Average: 67.7\nRounded: 68\n', { stdin: ['70', 'x', '61', '72', '-1'] });
t('tuck shop with decimal money', M('decimal total = 0;\nstring[] items = { "crisps", "juice", "bun" };\ndecimal[] prices = { 0.65m, 1.20m, 0.95m };\nfor (int i = 0; i < items.Length; i++) { total += prices[i]; Console.WriteLine($"{items[i],-8}{prices[i],6:C}"); }\nConsole.WriteLine($"{"Total",-8}{total,6:C}");\nConsole.WriteLine(total > 2.5m ? "Over budget" : "OK");'), 'crisps   £0.65\njuice    £1.20\nbun      £0.95\nTotal    £2.80\nOver budget\n');
t('menu loop with switch and do-while', M('string choice;\ndo {\n Console.WriteLine("1) Hello 2) Quit");\n choice = Console.ReadLine();\n switch (choice) {\n  case "1": Console.WriteLine("Hello!"); break;\n  case "2": Console.WriteLine("Bye"); break;\n  default: Console.WriteLine("Invalid choice"); break;\n }\n} while (choice != "2");'), '1) Hello 2) Quit\nHello!\n1) Hello 2) Quit\nInvalid choice\n1) Hello 2) Quit\nBye\n', { stdin: ['1', '9', '2'] });
t('list of objects with search and total', `using System;
using System.Collections.Generic;
class Product { public string Name { get; set; } public decimal Price { get; set; } public int Stock { get; set; }
  public Product(string n, decimal p, int s) { Name = n; Price = p; Stock = s; } }
class Program { static void Main(string[] args) {
  List<Product> stock = new List<Product> { new Product("Pen", 0.99m, 10), new Product("Ruler", 1.49m, 0), new Product("Pad", 2.50m, 4) };
  decimal value = 0;
  foreach (Product p in stock) value += p.Price * p.Stock;
  Console.WriteLine($"Stock value: {value:C}");
  Product found = stock.Find(p => p.Name == "Pad");
  Console.WriteLine(found.Name + " " + found.Price);
  List<Product> outOf = stock.FindAll(p => p.Stock == 0);
  Console.WriteLine(outOf.Count + " out of stock: " + outOf[0].Name);
  Console.WriteLine(stock.Max(p => p.Price));
  Console.WriteLine(stock.Sum(p => p.Stock));
} }`, 'Stock value: £19.90\nPad 2.50\n1 out of stock: Ruler\n2.50\n14\n');
t('high score file program', M('const string FileName = "scores.txt";\nif (!File.Exists(FileName)) File.WriteAllText(FileName, "");\nFile.AppendAllText(FileName, "Grace,12" + Environment.NewLine);\nFile.AppendAllText(FileName, "Oisín,15" + Environment.NewLine);\nint best = 0; string bestName = "";\nforeach (string line in File.ReadAllLines(FileName)) {\n string[] p = line.Split(\',\');\n int s = int.Parse(p[1]);\n if (s > best) { best = s; bestName = p[0]; }\n}\nConsole.WriteLine($"Top: {bestName} with {best}");'), 'Top: Oisín with 15\n', { check: (r) => (r.files['scores.txt'] === 'Grace,12\nOisín,15\n' ? true : JSON.stringify(r.files)) });
t('struct-like grade boundaries with arrays', M('int[] bounds = { 90, 80, 70, 60 };\nstring[] grades = { "A*", "A", "B", "C" };\nint[] marks = { 95, 72, 40 };\nforeach (int m in marks) {\n string g = "U";\n for (int i = 0; i < bounds.Length; i++) if (m >= bounds[i]) { g = grades[i]; break; }\n Console.WriteLine($"{m} => {g}");\n}'), '95 => A*\n72 => B\n40 => U\n');
t('object initialiser with constructor args', `using System;
class P { public string Name; public int Score { get; set; } public P(string n) { Name = n; } }
class Program { static void Main(string[] args) { P p = new P("a") { Score = 1 }; Console.WriteLine(p.Name + p.Score); } }`, 'a1\n');
t('nullable int and HasValue', M('int? maybe = null; Console.WriteLine(maybe.HasValue); maybe = 4; Console.WriteLine(maybe.Value + 1); Console.WriteLine(maybe ?? 0);'), 'False\n5\n4\n');
t('is and as with object', M('object o = "text"; if (o is string s) Console.WriteLine(s.ToUpper()); object n = 5; Console.WriteLine(n is int); Console.WriteLine((int)n + 1); string t2 = o as string; Console.WriteLine(t2.Length);'), 'TEXT\nTrue\n6\n4\n');
RE('InvalidCastException', 'object o = "x";\nint n = (int)o;', 2, "Unhandled exception. System.InvalidCastException: Unable to cast object of type 'String' to type 'int'.");

t('Convert.ToString and ToString on everything', M('Console.WriteLine(Convert.ToString(42) + Convert.ToString(1.5) + Convert.ToBoolean("TRUE") + Convert.ToChar(66) + Convert.ToDecimal("2.50")); Console.WriteLine(12.ToString() + true.ToString() + \'z\'.ToString() + 2.50m.ToString());'), '421.5TrueB2.50\n12Truez2.50\n');
t('CultureInfo accepted as an argument', 'using System;\nusing System.Globalization;\nclass Program { static void Main() { double d = double.Parse("1.5", CultureInfo.InvariantCulture); Console.WriteLine(d.ToString("F2", CultureInfo.InvariantCulture)); Console.WriteLine(string.Format(CultureInfo.InvariantCulture, "{0:F1}", d)); Console.WriteLine(DateTime.ParseExact("01/02/2026", "dd/MM/yyyy", CultureInfo.InvariantCulture).Month); } }', '1.50\n1.5\n2\n');
t('TimeSpan from DateTime subtraction', M('DateTime a = new DateTime(2026, 1, 1, 10, 0, 0); DateTime b = a.AddMinutes(95); TimeSpan d = b - a; Console.WriteLine(d.TotalSeconds); Console.WriteLine(d.TotalMinutes); Console.WriteLine(d); Console.WriteLine((new DateTime(2026, 1, 10) - new DateTime(2026, 1, 1)).Days);'), '5700\n95\n01:35:00\n9\n');
t('sealed classes, Array.Copy, property initialisers', `using System;
sealed class Config { public int Level { get; set; } = 3; public string Mode { get; } = "easy"; }
class Program { static void Main() {
  Config c = new Config(); Console.WriteLine(c.Level + c.Mode);
  int[] a = { 1, 2, 3 }; int[] b = new int[3]; Array.Copy(a, b, 3); b[0] = 9; Console.WriteLine(a[0] + " " + b[0]);
} }`, '3easy\n1 9\n');
t('class extends base and implements interface', `using System;
interface IShape { double Area(); }
abstract class Shape { public abstract string Name(); }
class Circle : Shape, IShape { private double r = 2; public override string Name() => "circle"; public double Area() { return Math.Round(Math.PI * r * r, 1); } }
class Program { static void Main() { IShape s = new Circle(); Console.WriteLine(s.Area()); Shape sh = (Shape)s; Console.WriteLine(sh.Name()); Console.WriteLine(s is Shape); } }`, '12.6\ncircle\nTrue\n');
t('colour is passed to write()', M('Console.ForegroundColor = ConsoleColor.Red; Console.Write("r"); Console.ResetColor(); Console.Write("n");'), 'rn', {
  check: async () => {
    const seen = [];
    await CSharp.run(M('Console.ForegroundColor = ConsoleColor.Red; Console.Write("r"); Console.ResetColor(); Console.Write("n");'), { write: (s, c) => seen.push([s, c]) });
    return JSON.stringify(seen) === JSON.stringify([['r', 'Red'], ['n', undefined]]) ? true : 'colours were ' + JSON.stringify(seen);
  },
});
t('user exception caught by base type, catch order', `using System;
class QuizException : Exception { public QuizException(string m) : base(m) { } }
class BadAnswerException : QuizException { public BadAnswerException() : base("Bad answer") { } }
class Program { static void Main() {
  try { throw new BadAnswerException(); }
  catch (BadAnswerException e) { Console.WriteLine("specific: " + e.Message); }
  catch (QuizException) { Console.WriteLine("general"); }
  try { throw new BadAnswerException(); } catch (QuizException e) { Console.WriteLine("base: " + e.Message); }
  try { throw new QuizException("q"); } catch (BadAnswerException) { Console.WriteLine("no"); } catch (Exception e) { Console.WriteLine(e.GetType().Name + " " + e.Message); }
} }`, 'specific: Bad answer\nbase: Bad answer\nQuizException q\n');
CEsrc('catch subclass after base is an error', `using System;
class Program { static void Main() {
  try { }
  catch (IOExceptionX) { }
} }`, 4, "The type or namespace name 'IOExceptionX' could not be found (are you missing a using directive or an assembly reference?)");
CE('unsupported generic class', 'int x = 1;', 4, 'Generic classes (class Box<T>) are not supported in this course', '}\nclass Box<T> {');
RE('OverflowException from Convert', 'int n = Convert.ToInt32(3e10);', 1, 'Unhandled exception. System.OverflowException: Value was either too large or too small for an Int32.');
t('readonly field and static constructor', `using System;
class Counter { public static readonly int Start; static Counter() { Start = 10; } private readonly int id; public Counter() { id = Start + 1; } public int Id => id; }
class Program { static void Main() { Console.WriteLine(new Counter().Id); } }`, '11\n');
CEsrc('readonly field assigned outside constructor', `using System;
class R { private readonly int x = 1; public void Set() { x = 2; } }
class Program { static void Main() { } }`, 2, 'A readonly field cannot be assigned to (except in a constructor or init-only setter of the type in which the field is defined or a variable initializer)');
t('Equals override used by List.Contains', `using System;
using System.Collections.Generic;
class Item { public string Name; public Item(string n) { Name = n; }
  public override bool Equals(object obj) { Item o = obj as Item; return o != null && o.Name == Name; }
  public override int GetHashCode() { return Name.GetHashCode(); } }
class Program { static void Main() { List<Item> l = new List<Item> { new Item("a") }; Console.WriteLine(l.Contains(new Item("a"))); Console.WriteLine(l.IndexOf(new Item("b"))); } }`, 'True\n-1\n');

// ---------------------------------------------------------------------------
// 15. The full quiz sample (tools/samples/quiz.cs)
// ---------------------------------------------------------------------------

const QUIZ = fs.readFileSync(path.join(__dirname, 'samples', 'quiz.cs'), 'utf8');
const ANSWERS = {
  'Which data type stores a whole number?': 'B',
  'What does Console.ReadLine() return?': 'c',
  'Array indexes in C# start at 1.': 'F',
  'You cannot create an object from an abstract class.': 'TRUE',
};
// Scripted user: works out what to type from what the program has printed so far.
function quizUser() {
  const script = ['1', 'grace', 'Rugby2026', 'Rugby2026',   // register
    '2', 'grace', 'wrong', 'grace', 'Rugby2026',            // log in (one failed attempt)
    '1'];                                                   // take quiz
  const after = ['2', '3', '4', '3'];                       // my scores, leaderboard, log out, exit
  let stage = 0, invalidSent = false, answered = 0;
  return (out) => {
    if (stage < script.length) return script[stage++];
    // in the quiz: answer the question shown most recently
    const lastQ = out.lastIndexOf('Question ');
    const done = out.lastIndexOf('You scored');
    if (done < lastQ || done < 0) {
      const tail = out.slice(lastQ);
      for (const q of Object.keys(ANSWERS)) {
        if (tail.includes(q)) {
          if (!invalidSent) { invalidSent = true; return 'Z'; }            // invalid answer first
          if (tail.trimEnd().endsWith(':') && !tail.includes('Correct!') && !tail.includes('Wrong.')) {
            answered++;
            // answer one question wrongly on purpose
            if (q === 'What does Console.ReadLine() return?') return 'A';
            return ANSWERS[q];
          }
        }
      }
    }
    return after.length ? after.shift() : null;
  };
}
t('quiz sample: register, log in, quiz, scores, leaderboard, exit', QUIZ, null, {
  stdin: quizUser(),
  files: {},
  check: (r) => {
    const o = r.out;
    const need = [
      'Choose a password: *********\nConfirm password: *********\nAccount created. You can now log in.',
      'Incorrect username or password. 2 attempt(s) left.',
      'Welcome back, grace!',
      '4 questions, 5 points available. Good luck, grace!',
      'That is not a valid answer. Try again: ',
      'Wrong. The answer was C) string',
      'You scored 4 out of 5 (80.0%)',
      'Great work - just a few to review.',
      '--- Scores for grace ---',
      '--- Top 5 ---',
      'You have been logged out.',
      'Goodbye!',
    ];
    for (const n of need) if (!o.includes(n)) return 'output is missing: ' + JSON.stringify(n);
    if ((o.match(/Correct!/g) || []).length !== 3) return 'expected 3 correct answers';
    const users = r.files['users.txt'];
    const SHA = require('crypto').createHash('sha256').update('Rugby2026').digest('hex');
    if (!/^grace,[0-9a-f]{64}\n$/.test(users)) return 'users.txt should hold a 64-hex-char hash, got ' + JSON.stringify(users);
    if (users !== `grace,${SHA}\n`) return 'users.txt hash is not the real SHA-256';
    const scores = r.files['scores.txt'] || '';
    if (!/^grace,4,5,\d{4}-\d\d-\d\d \d\d:\d\d\n$/.test(scores)) return 'scores.txt should have one line, got ' + JSON.stringify(scores);
    if (!/\d\d\/\d\d\/\d{4} \d\d:\d\d  grace {11}  4\/5    80\.0%/.test(o)) return 'score line formatting is wrong';
    if (!/1\. \d\d\/\d\d\/\d{4} \d\d:\d\d  grace/.test(o)) return 'leaderboard line is missing';
    if (!r.files['questions.txt'] || !r.files['questions.txt'].startsWith('# MC|')) return 'questions.txt was not created';
    return true;
  },
});
t('quiz sample: existing users file and bad login lockout', QUIZ, null, {
  stdin: ['2', 'ben', 'nope', 'ben', 'nope2', 'ben', 'nope3', '3'],
  files: { 'users.txt': 'ben,9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08\n' },
  check: (r) => {
    if (!r.out.includes('Too many failed attempts. Returning to the main menu.')) return 'expected lockout message';
    if (!r.out.includes('0 attempt(s) left.')) return 'expected attempts countdown';
    return r.out.trimEnd().endsWith('Goodbye!') ? true : 'should exit';
  },
});
t('quiz sample: login with password "test" against known hash', QUIZ, null, {
  stdin: ['2', 'BEN', 'test', '4', '3'],
  files: { 'users.txt': 'ben,9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08\n', 'scores.txt': 'ben,3,5,2025-10-01 09:15\nbad line\nzoe,5,5,2025-10-02 10:00\n' },
  check: (r) => (r.out.includes('Welcome back, ben!') && r.out.includes('You have been logged out.') ? true : 'login with SHA256("test") failed'),
});
t('quiz sample: register validation messages', QUIZ, null, {
  stdin: ['1', 'ab', 'Password1', 'Password1', '1', 'zoe', 'short', 'short', '1', 'zoe', 'Abcdefg1', 'Abcdefgx', '3'],
  check: (r) => {
    for (const n of ['Username must be 3 to 15 characters.', 'Password needs 8+ characters, a capital letter and a digit.', 'Passwords do not match. Please try again.']) {
      if (!r.out.includes(n)) return 'missing ' + n;
    }
    return true;
  },
});

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

function sameError(actual, exp) {
  if (!actual || actual.ok) return 'expected an error but the program succeeded';
  if (exp.kind && actual.kind !== exp.kind) return `expected kind ${exp.kind}, got ${actual.kind}: ${actual.message}`;
  if (exp.message !== undefined) {
    let msg = actual.message;
    if (actual.kind === 'compile') msg = msg.replace(/^Line \d+: /, '');
    const ok = exp.message instanceof RegExp ? exp.message.test(msg) : msg === exp.message;
    if (!ok) return `message mismatch:\n      expected: ${exp.message}\n      actual:   ${msg}`;
  }
  if (exp.line !== undefined && actual.line !== exp.line) return `expected line ${exp.line}, got ${actual.line} (${actual.message})`;
  if (actual.kind === 'compile' && !/^Line \d+: /.test(actual.message)) return 'compile messages must start with "Line N: "';
  return null;
}

async function main() {
  const filter = process.argv[2];
  let pass = 0, fail = 0;
  for (const tc of tests) {
    if (filter && !tc.name.includes(filter)) continue;
    let problem = null;
    try {
      if (tc.checkOnly) {
        const errs = CSharp.check(tc.src);
        if (JSON.stringify(errs) !== JSON.stringify(tc.checkOnly)) problem = `check() returned ${JSON.stringify(errs)}`;
      } else {
        const res = await runProgram(tc.src, { stdin: tc.stdin, files: tc.files ? (typeof tc.files === 'object' ? JSON.parse(JSON.stringify(tc.files)) : tc.files) : {}, maxSteps: tc.maxSteps, shouldStop: tc.shouldStop });
        if (tc.error) problem = sameError(res.result, tc.error);
        else if (!res.result.ok) problem = `unexpected ${res.result.kind} error: ${res.result.message} (line ${res.result.line})`;
        if (!problem && tc.expected !== null && tc.expected !== undefined && res.out !== tc.expected) {
          problem = `output mismatch:\n      expected: ${JSON.stringify(tc.expected)}\n      actual:   ${JSON.stringify(res.out)}`;
        }
        if (!problem && tc.check) {
          const c = await tc.check(res);
          if (c !== true) problem = c || 'check failed';
        }
      }
    } catch (e) {
      problem = 'harness exception: ' + (e && e.stack || e);
    }
    if (problem) { fail++; console.log(`FAIL  ${tc.name}\n      ${problem}`); }
    else pass++;
  }

  // performance: a 1,000,000-iteration loop
  if (!filter || 'performance'.includes(filter)) {
    const src = M('long sum = 0;\nfor (int i = 0; i < 1000000; i++) { sum += i % 7; }\nConsole.WriteLine(sum);');
    const t0 = Date.now();
    const r = await runProgram(src, {});
    const ms = Date.now() - t0;
    const ok = r.result.ok && r.out === '2999997\n' && ms < 2500;
    if (ok) pass++; else { fail++; console.log(`FAIL  performance: ${ms} ms, ${JSON.stringify(r.result)} ${r.out}`); }
    console.log(`performance: 1,000,000 loop iterations in ${ms} ms`);
  }

  console.log(`\n${pass} passed, ${fail} failed (${pass + fail} total)`);
  process.exit(fail ? 1 : 0);
}

module.exports = { runProgram };
if (require.main === module) main();
