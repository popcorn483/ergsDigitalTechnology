# ERGS C# Academy: build spec

A pupil-facing, Codecademy-style static website (GitHub Pages, no build step) that teaches
programming and C# from zero to an object-oriented quiz with a login. Audience: CCEA GCSE
Digital Technology pupils (age 14–16, Northern Ireland). UK English throughout.

Pupils write real C# in the browser. Because no .NET is available, C# runs in our own
JavaScript interpreter (`js/csharp.js`) that supports the subset below.

## Files

```
index.html            the app shell (UI)
css/app.css
js/csharp.js          the interpreter (window.CSharp, also module.exports for Node)
js/app.js             UI
js/course/m00.js ...  one file per module, each calls COURSE.addModule({...})
js/course/index.js    defines window.COURSE = { modules: [], addModule(m) {...} }
tools/verify.js       Node script: runs every lesson's solution against its tests
```

## 1. Interpreter API (`js/csharp.js`)

Works in the browser (`window.CSharp`) and in Node (`module.exports = CSharp`), no dependencies.

```js
const result = await CSharp.run(source, {
  write(text) {},                 // output chunk (Write/WriteLine pass "\n" themselves)
  clear() {},                     // Console.Clear()
  readLine() { return Promise<string|null> },          // Console.ReadLine
  readKey(intercept) { return Promise<{key: string, keyChar: string}> },
        // key = ConsoleKey name: "Enter", "Backspace", "A".."Z", "D0".."D9", "Spacebar", "Escape", ...
        // keyChar = the typed character ("" for Enter is "\r", Backspace "\b")
  files: { "users.txt": "aoife,abc\n" },   // virtual file system: plain object, mutated in place
  maxSteps: 5_000_000,            // stop with an "ran for too long" error after this many steps
  shouldStop() { return false },  // polled while running; true = stop now
});
// result = { ok: true } or
// { ok: false, kind: "compile" | "runtime" | "stopped" | "timeout", message, line }
```

- `CSharp.check(source)` returns `[]` or a list of `{ message, line }` compile errors without running.
- The interpreter must yield to the event loop regularly (e.g. every ~20,000 steps) so the
  page stays responsive and Stop works. `readLine`/`readKey` are awaited.
- Error messages are pupil-friendly but close to real C#. Prefix with the line:
  - compile: `Line 5: ; expected`, `Line 8: The name 'scroe' does not exist in the current context`,
    `Line 3: Cannot implicitly convert type 'string' to 'int'`,
    `Line 9: 'Pupil.score' is inaccessible due to its protection level`,
    `Line 4: Cannot create an instance of the abstract type 'Shape'`,
    `Line 6: The left-hand side of an assignment must be a variable (constant)`.
  - runtime: `Unhandled exception. System.FormatException: The input string 'abc' was not in a correct format.`
    plus `line`. Same for DivideByZeroException, IndexOutOfRangeException
    ("Index was outside the bounds of the array."), NullReferenceException, FileNotFoundException, etc.
  - Type mismatches may be detected at runtime if a static check is impractical, but they must
    still be reported with the C# compile-error wording above.

### Language subset that MUST work

Program shape: `using` lines (ignored), `namespace X { }` and `namespace X;`, multiple classes in one
source (any order), `class Program { static void Main(string[] args) { } }` (also `Main()` without
args). Top-level statements (no class) should also work.

Types: `int long double float decimal bool char string var object void`, `DateTime`, arrays `T[]`, `T[,]`,
`List<T>`, `Dictionary<K,V>`, `StringBuilder`, `Random`, `ConsoleKeyInfo`, `ConsoleKey`,
user classes, enums (simple `enum Colour { Red, Green }`).
- int division truncates; `%` remainder; `char` arithmetic gives int; casts `(int)`, `(double)`, `(char)`;
  int→double implicit; double→int needs a cast (else compile error). `decimal` literals `9.99m`.
  Numbers print like C#: `3.5`, `7`, `0.1 + 0.2` prints `0.30000000000000004`, doubles that are whole
  print without `.0` (C# prints `7` for `7.0`). `bool` prints `True`/`False`.
- Default values: fields default to 0 / false / null / '\0'; `new int[5]` filled with 0.

Statements: declarations (incl. several in one line), `const`, `if/else if/else`, `switch` (int/string/char
cases, several labels on one block, `default`, `break`, `return` inside), `while`, `do…while`, `for`,
`foreach`, `break`, `continue`, `return`, `try/catch (Type ex)/catch/finally`, `throw new X("msg")`,
`throw;`, `using (var w = new StreamWriter(...)) { }`, nested blocks with correct scoping.

Expressions: all arithmetic, comparison, `&& || !`, ternary, `??`, `+= -= *= /= %=`, `++ --` (pre/post),
string concatenation with any type (calls ToString), interpolation `$"{x}"`, `{x:F2}`, `{x,-15}`, `{x,5:F1}`,
verbatim `@"..."`, escapes `\n \t \" \\ \'`, `is`, `as`, `new`, object initialisers `new P("a") { Score = 1 }`,
array initialisers `int[] a = { 1, 2 }` / `new int[] { }` / `new string[3]`, list initialisers
`new List<int> { 1, 2 }`, `out int x` / `out var x` / `out x`, `ref`, lambdas for List methods
(`(a, b) => a.CompareTo(b)`, `x => x > 3`, block-bodied lambdas), `nameof` not needed.

Formatting (`ToString(fmt)` and interpolation): `F0–F4`, `N0–N2`, `C`/`C2` (UK pounds: `£4.50`), `D2`/`D3`,
`x2`/`X2`, `P0`/`P1`, custom `0.00`, `#.##`; DateTime formats `dd/MM/yyyy`, `HH:mm`, `yyyy-MM-dd HH:mm`,
`ToShortDateString()` (dd/MM/yyyy), default DateTime ToString `dd/MM/yyyy HH:mm:ss`.

Built-ins:
- `Console.WriteLine()` (any arg / no arg), `Write`, `ReadLine`, `ReadKey()`, `ReadKey(true)`, `Clear`,
  `ForegroundColor = ConsoleColor.Green`, `ResetColor()` (colour may be ignored or passed to UI via
  write(text, colour) optional third arg).
- `Convert.ToInt32/ToDouble/ToDecimal/ToString/ToBoolean/ToChar`, `int.Parse`, `int.TryParse`,
  `double.Parse/TryParse`, `decimal.Parse/TryParse`, `bool.Parse/TryParse`, `char.Parse`,
  `int.MaxValue/MinValue`, `.ToString()` on everything, `.Equals`, `.CompareTo`.
- `char.IsDigit IsLetter IsUpper IsLower IsWhiteSpace IsControl IsLetterOrDigit IsPunctuation ToUpper ToLower`.
- string: `Length`, indexer, `ToUpper ToLower Trim TrimStart TrimEnd Substring(1 or 2 args) IndexOf(char/string)
  LastIndexOf Contains StartsWith EndsWith Replace Split(char / params char[] / string) PadLeft PadRight
  Insert Remove ToCharArray Equals CompareTo`, static `string.IsNullOrEmpty IsNullOrWhiteSpace Join Concat
  Format Compare`, `string.Empty`. Strings are immutable. `==` compares string contents.
- `Math.Pow Sqrt Round(x) Round(x, n) Abs Max Min Floor Ceiling PI Truncate`. Note C# Math.Round uses
  banker's rounding (2.5 → 2) for Round(x); implement that.
- `Random`: `new Random()`, `Next(max)`, `Next(min, max)`, `NextDouble()`; `new Random(seed)` deterministic.
- Arrays: `Length`, `GetLength(d)`, indexer `[i]`, `[r, c]`, `Array.Sort`, `Array.Reverse`, `Array.IndexOf`,
  `Array.Copy` optional; foreach.
- `List<T>`: `Add AddRange Remove RemoveAt Insert Contains IndexOf Count Clear Sort() Sort(comparison)
  Reverse ToArray Find FindAll Exists ForEach RemoveAll`, indexer get/set, foreach, `Max() Min() Sum()
  Average()` (LINQ-like, only these) optional.
- `Dictionary<K,V>`: `Add`, indexer get/set, `ContainsKey`, `Remove`, `Count`, `Keys`, `Values`,
  `TryGetValue(k, out v)`, foreach over `KeyValuePair` with `.Key`/`.Value`.
- `StringBuilder`: `Append AppendLine ToString Length Clear`.
- `DateTime.Now`, `DateTime.Today`, `.Year .Month .Day .Hour .Minute .Second .DayOfWeek`, `AddDays AddMinutes`,
  subtraction gives `TimeSpan` with `TotalSeconds TotalMinutes Days`, `DateTime.Parse`, `DateTime.ParseExact(s, fmt, CultureInfo.InvariantCulture)`,
  `CultureInfo.InvariantCulture` accepted as an argument anywhere.
- Files (virtual, the `files` object): `File.Exists WriteAllText ReadAllText AppendAllText WriteAllLines
  ReadAllLines AppendAllLines Delete`, `StreamWriter(path)` / `StreamWriter(path, append)` with `Write WriteLine
  Close Dispose`, `StreamReader(path)` with `ReadLine ReadToEnd EndOfStream Peek Close`, `Environment.NewLine` = "\n".
  Reading a missing file throws `FileNotFoundException` ("Could not find file 'x.txt'.").
- Hashing: `SHA256.Create()`, `.ComputeHash(byte[])`, `Encoding.UTF8.GetBytes(string)`, `byte` type and
  `b.ToString("x2")`, `using (SHA256 sha = SHA256.Create()) { }`. Must give the real SHA-256.
- Exceptions: `Exception`, `SystemException`, `FormatException`, `DivideByZeroException` (int ÷ 0 only;
  double ÷ 0 gives ∞ printed as `∞`), `IndexOutOfRangeException`, `ArgumentOutOfRangeException`
  (List index, Substring), `ArgumentException`, `NullReferenceException`, `InvalidOperationException`,
  `OverflowException`, `IOException`, `FileNotFoundException` (is an IOException), with `.Message`;
  user classes may extend Exception (`: Exception` with `base(message)`). `catch (Exception ex)` catches all;
  catch order respects inheritance.

Object-oriented features:
- classes with fields (with initialisers), `const` fields, `static` fields/methods/classes, constructors
  (overloaded, `this(...)` and `base(...)` chaining), instance methods, method overloading by parameter
  count and simple types, `this.`, auto-properties (`{ get; set; }`, `{ get; private set; }`, `{ get; }`,
  with initialiser `= 0;`), full properties with `get { }` / `set { }` and `value`, expression-bodied
  members (`=>`), `ToString()` overrides used by Console.WriteLine, concatenation and interpolation.
- Inheritance `class Dog : Animal`, `virtual`/`override`/`abstract`, `abstract class`, `base.Method()`,
  `protected`, `sealed` (ignored OK), polymorphism through base-type variables and `List<Base>`,
  interfaces (`interface IShape { double Area(); }` and `class Circle : Shape, IShape`), `is`/`as`.
- Access rules enforced as errors: private members used from outside their class; assigning a property whose
  setter is private/missing from outside; instantiating an abstract class; assigning a const;
  calling an instance member from static Main without an object ("An object reference is required for the
  non-static field, method, or property 'Program.Greet()'").

## 2. Lesson format (`js/course/mNN.js`)

```js
COURSE.addModule({
  id: "m05",
  title: "Iteration",
  icon: "repeat",                      // one of: rocket, print, box, keyboard, calc, branch, repeat,
                                       // list, text, function, shield, file, cube, tree, trophy
  summary: "Make your programs repeat with for, while and do-while loops.",
  lessons: [
    {
      id: "m05-l1",
      title: "Counting with for loops",
      type: "code",
      learn: `<p>HTML explanation…</p><pre><code class="cs">for (int i = 1; i <= 5; i++) …</code></pre>`,
      instructions: [
        "Write a <code>for</code> loop that prints the numbers 1 to 10.",
        "Then print <code>Blast off!</code> after the loop."
      ],
      starter: `using System;\n\nclass Program\n{\n    static void Main(string[] args)\n    {\n        // Write your code here\n    }\n}`,
      solution: `…full working C#…`,
      stdin: [],                        // lines fed to Console.ReadLine when checking (optional)
      tests: [
        { type: "output", includes: "Blast off!", msg: "Print Blast off! at the end." },
        { type: "outputRegex", pattern: "1\\s+2\\s+3[\\s\\S]*10", msg: "Print 1 to 10 in order." },
        { type: "code", pattern: "for\\s*\\(", msg: "Use a for loop." },
        { type: "codeNot", pattern: "Console\\.WriteLine\\(\\s*\"?2", msg: "Don't print each number by hand." },
        { type: "output", stdin: ["abc", "7"], includes: "7", msg: "Re-ask when the input isn't a number." },
        { type: "exact", expected: "Hello\n", msg: "Output must be exactly Hello." },
        { type: "fn", fn: (out, code) => out.split("\n").filter(Boolean).length === 10, msg: "Print exactly 10 lines." }
      ],
      hint: "A for loop has three parts: start; condition; step.",
    },
    {
      id: "m05-quiz",
      title: "Checkpoint: loops",
      type: "quiz",
      questions: [
        { q: "Which loop always runs at least once?", options: ["for", "while", "do-while", "foreach"],
          answer: 2, explain: "A do-while checks its condition after the body." }
      ]
    },
    {
      id: "m00-l1", title: "What is programming?", type: "read",     // no code, a reading page
      learn: `<p>…</p>`
    }
  ]
});
```

- Every test runs the pupil's code once per distinct `stdin` (test's own `stdin` or the lesson's).
  `output`/`outputRegex`/`exact` compare against everything written to the console (inputs are NOT echoed
  into the checked output). `output` is case-insensitive unless `caseSensitive: true`.
- `code`/`codeNot` match the source with comments removed.
- `files: { "scores.txt": "…" }` on a lesson pre-loads the virtual file system for that lesson.
- `fn` tests: `(output, code, files) => boolean`.
- A code lesson passes when there are no errors and all tests pass. Its `solution` MUST pass.
- `learn` HTML: `<p>`, `<h3>`, `<ul>/<ol>`, `<code>`, `<pre><code class="cs">` for C#, `<pre><code>` for
  plain output, `<table>`, `<div class="tip">`, `<div class="warn">`, `<div class="key">` (key term box with
  `<strong>Term</strong> definition`). Keep each `learn` to roughly 150–450 words. Plain, friendly, second
  person ("you"). Use pupils' names like Aoife, Ciarán, Ben, Niamh, Oisín, Grace.
- Starters always compile. Exercises must be achievable: say exactly what to print (exact wording/spelling)
  so tests are fair. Prefer `output` includes over `exact`.
- Every code lesson uses the full `class Program { static void Main(string[] args) { … } }` shape
  (that's what pupils use in Visual Studio).
