// Module 8: String handling
(function () {
  function prog(body, opts) {
    opts = opts || {};
    const ind = (s, n) => s.replace(/^\n+/, "").replace(/\s+$/, "").split("\n")
      .map(l => (l.trim() ? " ".repeat(n) + l : "")).join("\n");
    let src = (opts.usings || "using System;") + "\n\nclass Program\n{\n";
    if (opts.before) src += ind(opts.before, 4) + "\n\n";
    src += "    static void Main(string[] args)\n    {\n" + ind(body, 8) + "\n    }\n";
    if (opts.after) src += "\n" + ind(opts.after, 4) + "\n";
    return src + "}\n";
  }
  const lines = (out) => out.split("\n").map(s => s.trimEnd()).filter(s => s.trim());

  COURSE.addModule({
    id: "m08",
    title: "String handling",
    icon: "text",
    summary: "Slice, search, split and build text: usernames, passwords and secret codes.",
    lessons: [
      // ---------------------------------------------------------------- l1
      {
        id: "m08-l1",
        title: "Length, indexing and case",
        type: "code",
        learn: `
<p>A <code>string</code> is really a sequence of <code>char</code> values. That means you can treat it a bit like an array.</p>
<pre><code class="cs">string team = "Lions";

Console.WriteLine(team.Length);     // 5
Console.WriteLine(team[0]);         // L   (first character)
Console.WriteLine(team[team.Length - 1]);   // s   (last character)</code></pre>
<table>
<tr><th>Index</th><td>0</td><td>1</td><td>2</td><td>3</td><td>4</td></tr>
<tr><th>char</th><td>L</td><td>i</td><td>o</td><td>n</td><td>s</td></tr>
</table>
<div class="warn">Strings are <strong>immutable</strong>: you can read <code>team[0]</code> but you can't change it with <code>team[0] = 'P';</code>. String methods always give you back a <em>new</em> string.</div>
<h3>Changing case</h3>
<pre><code class="cs">string shout = team.ToUpper();   // "LIONS"
string quiet = team.ToLower();   // "lions"
Console.WriteLine(team);         // still "Lions"!</code></pre>
<p>Case matters when comparing: <code>"yes" == "YES"</code> is <code>false</code>. A neat trick is to convert input to lower case before checking it, so <code>Yes</code>, <code>YES</code> and <code>yes</code> all work:</p>
<pre><code class="cs">string answer = Console.ReadLine().ToLower();
if (answer == "yes")
{
    Console.WriteLine("Great!");
}</code></pre>
<div class="tip">Spaces count as characters too: <code>"Ben M".Length</code> is 5.</div>
<p>Each character you get with an index is a <code>char</code>, written with single quotes like <code>'L'</code>, not a string.</p>`,
        instructions: [
          "Ask <code>Enter your pet's name: </code> and read it.",
          "Print <code>Letters: 7</code> (the length), <code>First letter: B</code> and <code>Last letter: t</code> using indexing.",
          "Print <code>Shouting: BISCUIT</code> (upper case) and <code>Whispering: biscuit</code> (lower case)."
        ],
        starter: prog(`
Console.Write("Enter your pet's name: ");
string pet = Console.ReadLine();

// TODO: print Letters:, First letter: and Last letter:

// TODO: print Shouting: and Whispering:`),
        solution: prog(`
Console.Write("Enter your pet's name: ");
string pet = Console.ReadLine();

Console.WriteLine($"Letters: {pet.Length}");
Console.WriteLine($"First letter: {pet[0]}");
Console.WriteLine($"Last letter: {pet[pet.Length - 1]}");

Console.WriteLine($"Shouting: {pet.ToUpper()}");
Console.WriteLine($"Whispering: {pet.ToLower()}");`),
        stdin: ["Biscuit"],
        tests: [
          { type: "output", stdin: ["Biscuit"], includes: "Letters: 7", msg: "Biscuit has 7 letters: print Letters: 7" },
          { type: "fn", stdin: ["Biscuit"], fn: (out) => out.includes("First letter: B") && out.includes("Last letter: t"), msg: "For Biscuit print First letter: B and Last letter: t" },
          { type: "fn", stdin: ["Biscuit"], fn: (out) => out.includes("Shouting: BISCUIT") && out.includes("Whispering: biscuit"), msg: "Print Shouting: BISCUIT and Whispering: biscuit" },
          { type: "fn", stdin: ["Rex"], fn: (out) => out.includes("Letters: 3") && out.includes("First letter: R") && out.includes("Last letter: x") && out.includes("Shouting: REX"), msg: "Works for other names too (try Rex)." },
          { type: "code", pattern: "\\.Length\\s*-\\s*1", msg: "Use Length - 1 to get the last character." }
        ],
        hint: "pet[0] is the first character; pet[pet.Length - 1] is the last."
      },

      // ---------------------------------------------------------------- l2
      {
        id: "m08-l2",
        title: "Substring and IndexOf",
        type: "code",
        learn: `
<p><code>Substring</code> cuts out part of a string. <code>IndexOf</code> finds where something is.</p>
<pre><code class="cs">string code = "BT74 6DF";

string area = code.Substring(0, 4);   // start at 0, take 4 chars: "BT74"
string rest = code.Substring(5);      // from index 5 to the end: "6DF"

int space = code.IndexOf(' ');        // 4
int none  = code.IndexOf('X');        // -1 (not found)</code></pre>
<ul>
<li><code>Substring(start, length)</code>: the second number is <strong>how many</strong> characters, not where to stop.</li>
<li><code>Substring(start)</code>: everything from <code>start</code> to the end.</li>
<li><code>IndexOf</code> gives the position of the <strong>first</strong> match, or <code>-1</code> if it's not there. It works with a <code>char</code> or a <code>string</code>.</li>
</ul>
<h3>Using them together</h3>
<p>Splitting a full name at the space:</p>
<pre><code class="cs">string full = "Grace Fairweather";
int gap = full.IndexOf(' ');
string first = full.Substring(0, gap);       // "Grace"
string last  = full.Substring(gap + 1);      // "Fairweather"</code></pre>
<p>This works for any length of name because you <em>find</em> the space rather than guessing where it is.</p>
<div class="warn">If <code>start + length</code> goes past the end of the string, C# throws <code>ArgumentOutOfRangeException</code>.</div>`,
        instructions: [
          "Ask <code>Enter an email address: </code> and read it.",
          "Use <code>IndexOf('@')</code> to find the @. If it's <code>-1</code>, print <code>Invalid email</code>.",
          "Otherwise use <code>Substring</code> to print <code>User: niamh</code> (everything before the @) and <code>Domain: school.org</code> (everything after it)."
        ],
        starter: prog(`
Console.Write("Enter an email address: ");
string email = Console.ReadLine();

int at = email.IndexOf('@');

// TODO: if at is -1, print Invalid email
// TODO: else use Substring to print User: and Domain:`),
        solution: prog(`
Console.Write("Enter an email address: ");
string email = Console.ReadLine();

int at = email.IndexOf('@');

if (at == -1)
{
    Console.WriteLine("Invalid email");
}
else
{
    string user = email.Substring(0, at);
    string domain = email.Substring(at + 1);
    Console.WriteLine($"User: {user}");
    Console.WriteLine($"Domain: {domain}");
}`),
        stdin: ["niamh@school.org"],
        tests: [
          { type: "output", stdin: ["niamh@school.org"], includes: "User: niamh", msg: "For niamh@school.org print User: niamh" },
          { type: "output", stdin: ["niamh@school.org"], includes: "Domain: school.org", msg: "For niamh@school.org print Domain: school.org" },
          { type: "fn", stdin: ["oisin.games@pets.co.uk"], fn: (out) => out.includes("User: oisin.games") && out.includes("Domain: pets.co.uk"), msg: "Works for any email (try oisin.games@pets.co.uk)." },
          { type: "fn", stdin: ["notanemail"], fn: (out) => out.includes("Invalid email") && !out.includes("User:"), msg: "An address with no @ should print Invalid email" },
          { type: "code", pattern: "Substring\\s*\\(", msg: "Use Substring." }
        ],
        hint: "email.Substring(0, at) is the part before the @; email.Substring(at + 1) is the part after it."
      },

      // ---------------------------------------------------------------- l3
      {
        id: "m08-l3",
        title: "Searching and tidying text",
        type: "code",
        learn: `
<p>C# has lots of handy methods for checking and cleaning up text. They all return a <code>bool</code> or a <em>new</em> string.</p>
<table>
<tr><th>Method</th><th>Example</th><th>Result</th></tr>
<tr><td><code>Contains</code></td><td><code>"chicken curry".Contains("curry")</code></td><td><code>True</code></td></tr>
<tr><td><code>StartsWith</code></td><td><code>"BT74 6DF".StartsWith("BT")</code></td><td><code>True</code></td></tr>
<tr><td><code>EndsWith</code></td><td><code>"photo.png".EndsWith(".jpg")</code></td><td><code>False</code></td></tr>
<tr><td><code>Replace</code></td><td><code>"a-b-c".Replace("-", "/")</code></td><td><code>"a/b/c"</code></td></tr>
<tr><td><code>Trim</code></td><td><code>"  hi  ".Trim()</code></td><td><code>"hi"</code></td></tr>
</table>
<h3>Cleaning input</h3>
<p>Users often type extra spaces by accident. <code>Trim()</code> removes spaces from both ends (not the middle). Combine it with <code>ToLower()</code> for really robust input:</p>
<pre><code class="cs">string answer = Console.ReadLine().Trim().ToLower();
// "  YES " becomes "yes"</code></pre>
<p>This is called <strong>method chaining</strong>: each method works on the result of the one before.</p>
<h3>Replace</h3>
<pre><code class="cs">string msg = "I love maths homework";
string better = msg.Replace("maths homework", "coding");
Console.WriteLine(better);   // I love coding</code></pre>
<p>These methods are case-sensitive too: <code>"Chicken".Contains("chicken")</code> is <code>false</code>. Convert to lower case first if you want to ignore case.</p>
<div class="tip">Remember to <strong>store</strong> the result: <code>msg.Replace(...)</code> on its own does nothing to <code>msg</code>, because strings are immutable.</div>`,
        instructions: [
          "Ask <code>Enter a file name: </code> and read it. Store a tidied copy using <code>Trim()</code> and <code>ToLower()</code>, then print it like <code>Tidied: my photo.png</code>",
          "If the tidied name <code>EndsWith(\".png\")</code> or <code>EndsWith(\".jpg\")</code>, print <code>That's an image.</code>, otherwise print <code>Not an image.</code>",
          "If it <code>Contains</code> a space, print <code>Safe name: my_photo.png</code> using <code>Replace</code> to change spaces into underscores. (Print nothing extra if there are no spaces.)",
          "If it <code>StartsWith(\"draft\")</code>, print <code>Remember to finish this!</code>"
        ],
        starter: prog(`
Console.Write("Enter a file name: ");
string name = Console.ReadLine();

// TODO: string tidy = name.Trim().ToLower();  then print Tidied:

// TODO: EndsWith .png or .jpg?

// TODO: Contains a space? print Safe name: using Replace

// TODO: StartsWith draft?`),
        solution: prog(`
Console.Write("Enter a file name: ");
string name = Console.ReadLine();

string tidy = name.Trim().ToLower();
Console.WriteLine($"Tidied: {tidy}");

if (tidy.EndsWith(".png") || tidy.EndsWith(".jpg"))
{
    Console.WriteLine("That's an image.");
}
else
{
    Console.WriteLine("Not an image.");
}

if (tidy.Contains(" "))
{
    Console.WriteLine("Safe name: " + tidy.Replace(" ", "_"));
}

if (tidy.StartsWith("draft"))
{
    Console.WriteLine("Remember to finish this!");
}`),
        stdin: ["  My Photo.PNG  "],
        tests: [
          { type: "output", stdin: ["  My Photo.PNG  "], includes: "Tidied: my photo.png", caseSensitive: true, msg: "\"  My Photo.PNG  \" should become Tidied: my photo.png" },
          { type: "fn", stdin: ["  My Photo.PNG  "], fn: (out) => out.includes("That's an image.") && out.includes("Safe name: my_photo.png") && !out.includes("finish"), msg: "My Photo.PNG is an image with a space: print That's an image. and Safe name: my_photo.png" },
          { type: "fn", stdin: ["Draft essay final.docx"], fn: (out) => out.includes("Not an image.") && out.includes("Safe name: draft_essay_final.docx") && out.includes("Remember to finish this!"), msg: "Draft essay final.docx: Not an image., Safe name: draft_essay_final.docx and Remember to finish this!" },
          { type: "fn", stdin: ["dog.jpg"], fn: (out) => out.includes("That's an image.") && !out.includes("Safe name") && !out.includes("finish"), msg: "dog.jpg has no space, so don't print a Safe name line." },
          { type: "code", pattern: "\\.Replace\\s*\\(", msg: "Use Replace to change spaces to underscores." }
        ],
        hint: "string tidy = name.Trim().ToLower();  then  tidy.Replace(\" \", \"_\")"
      },

      // ---------------------------------------------------------------- l4
      {
        id: "m08-l4",
        title: "Split: reading CSV records",
        type: "code",
        learn: `
<p>Data is often stored as <strong>CSV</strong> (comma-separated values), one <strong>record</strong> per line:</p>
<pre><code>Aoife,14,Lions,23</code></pre>
<p><code>Split</code> breaks a string into an <strong>array</strong> wherever it finds a separator character. Each piece is called a <strong>field</strong>.</p>
<pre><code class="cs">string record = "Aoife,14,Lions,23";
string[] fields = record.Split(',');

Console.WriteLine(fields[0]);          // Aoife
Console.WriteLine(fields.Length);      // 4

int age = Convert.ToInt32(fields[1]);  // fields are strings, so convert numbers
int points = Convert.ToInt32(fields[3]);</code></pre>
<table>
<tr><th>Index</th><td>0</td><td>1</td><td>2</td><td>3</td></tr>
<tr><th>Field</th><td>Aoife</td><td>14</td><td>Lions</td><td>23</td></tr>
</table>
<p>You can split on any character: a space, a colon, a slash…</p>
<pre><code class="cs">string date = "27/10/2026";
string[] parts = date.Split('/');
Console.WriteLine("Month: " + parts[1]);   // 10</code></pre>
<div class="tip">Split works brilliantly with <code>foreach</code> when you want to do something with every word: <code>foreach (string w in sentence.Split(' '))</code>.</div>
<p>You'll use this a lot when you read data from files later in the course.</p>
<div class="warn">Every field from <code>Split</code> is a <code>string</code>. Adding <code>fields[1] + fields[3]</code> joins the text (<code>"1423"</code>) rather than adding the numbers. Convert first!</div>`,
        instructions: [
          "Ask <code>Enter a result (team,scored,conceded): </code> and read a line like <code>Lions,24,17</code>.",
          "Split it on commas, convert the two numbers to <code>int</code>, and print <code>Lions scored 24 and conceded 17</code>.",
          "Then print <code>Result: Win</code>, <code>Result: Draw</code> or <code>Result: Loss</code>, and <code>Points difference: 7</code> (scored minus conceded)."
        ],
        starter: prog(`
Console.Write("Enter a result (team,scored,conceded): ");
string line = Console.ReadLine();

// TODO: string[] fields = line.Split(',');
// TODO: convert fields[1] and fields[2] to int

// TODO: print ... scored ... and conceded ...
// TODO: print Result: Win / Draw / Loss
// TODO: print Points difference: ...`),
        solution: prog(`
Console.Write("Enter a result (team,scored,conceded): ");
string line = Console.ReadLine();

string[] fields = line.Split(',');
string team = fields[0];
int scored = Convert.ToInt32(fields[1]);
int conceded = Convert.ToInt32(fields[2]);

Console.WriteLine($"{team} scored {scored} and conceded {conceded}");

if (scored > conceded)
{
    Console.WriteLine("Result: Win");
}
else if (scored == conceded)
{
    Console.WriteLine("Result: Draw");
}
else
{
    Console.WriteLine("Result: Loss");
}

Console.WriteLine($"Points difference: {scored - conceded}");`),
        stdin: ["Lions,24,17"],
        tests: [
          { type: "output", stdin: ["Lions,24,17"], includes: "Lions scored 24 and conceded 17", msg: "Print Lions scored 24 and conceded 17" },
          { type: "fn", stdin: ["Lions,24,17"], fn: (out) => out.includes("Result: Win") && out.includes("Points difference: 7"), msg: "24 v 17 is a win with Points difference: 7" },
          { type: "fn", stdin: ["Eagles,10,10"], fn: (out) => out.includes("Eagles scored 10 and conceded 10") && out.includes("Result: Draw") && out.includes("Points difference: 0"), msg: "Eagles,10,10 is a draw with Points difference: 0" },
          { type: "fn", stdin: ["Tigers,3,31"], fn: (out) => out.includes("Result: Loss") && out.includes("Points difference: -28"), msg: "Tigers,3,31 is a loss with Points difference: -28" },
          { type: "code", pattern: "\\.Split\\s*\\(", msg: "Use Split to break up the record." }
        ],
        hint: "string[] fields = line.Split(','); then fields[0] is the team, Convert.ToInt32(fields[1]) is the score."
      },

      // ---------------------------------------------------------------- l5
      {
        id: "m08-l5",
        title: "Password strength checker",
        type: "code",
        learn: `
<p>You can loop through a string one <code>char</code> at a time, just like an array. Combined with the <code>char</code> helper methods, this lets you check what kinds of characters a string contains.</p>
<table>
<tr><th>Method</th><th>True for…</th></tr>
<tr><td><code>char.IsDigit(c)</code></td><td><code>'0'</code> to <code>'9'</code></td></tr>
<tr><td><code>char.IsUpper(c)</code></td><td>capital letters</td></tr>
<tr><td><code>char.IsLower(c)</code></td><td>lower-case letters</td></tr>
<tr><td><code>char.IsLetter(c)</code></td><td>any letter</td></tr>
<tr><td><code>char.IsLetterOrDigit(c)</code></td><td>letters and digits (so <code>!</code> would be false)</td></tr>
</table>
<pre><code class="cs">string word = "Rugby7s";
int digits = 0;
bool hasUpper = false;

foreach (char c in word)
{
    if (char.IsDigit(c))
    {
        digits++;
    }
    if (char.IsUpper(c))
    {
        hasUpper = true;
    }
}
Console.WriteLine($"{digits} digit(s), capital letter: {hasUpper}");
// 1 digit(s), capital letter: True</code></pre>
<div class="key"><strong>Flag</strong> a <code>bool</code> variable that starts as <code>false</code> and is set to <code>true</code> when something is found.</div>
<div class="tip">A character that is <em>not</em> a letter or digit is a symbol: <code>!char.IsLetterOrDigit(c)</code>.</div>
<p>Real websites use checks like this when you sign up. Longer passwords with a mix of character types are much harder for an attacker to guess, because there are far more possible combinations to try.</p>`,
        instructions: [
          "Ask <code>Choose a password: </code> and read it.",
          "Loop through each character and work out a score out of 5: one point each for: length 8 or more; contains an upper-case letter; contains a lower-case letter; contains a digit; contains a symbol (not a letter or digit).",
          "Print <code>Score: 3/5</code>, then <code>Strong</code> if the score is 5, <code>Medium</code> if it's 3 or 4, otherwise <code>Weak</code>."
        ],
        starter: prog(`
Console.Write("Choose a password: ");
string pw = Console.ReadLine();

bool hasUpper = false;
bool hasLower = false;
bool hasDigit = false;
bool hasSymbol = false;

// TODO: foreach (char c in pw) - set the flags using char.IsUpper, IsLower, IsDigit, IsLetterOrDigit

int score = 0;
// TODO: add 1 to score for each rule that is met (including pw.Length >= 8)

// TODO: print Score: .../5 then Strong, Medium or Weak`),
        solution: prog(`
Console.Write("Choose a password: ");
string pw = Console.ReadLine();

bool hasUpper = false;
bool hasLower = false;
bool hasDigit = false;
bool hasSymbol = false;

foreach (char c in pw)
{
    if (char.IsUpper(c))
    {
        hasUpper = true;
    }
    else if (char.IsLower(c))
    {
        hasLower = true;
    }
    else if (char.IsDigit(c))
    {
        hasDigit = true;
    }
    else if (!char.IsLetterOrDigit(c))
    {
        hasSymbol = true;
    }
}

int score = 0;
if (pw.Length >= 8) score++;
if (hasUpper) score++;
if (hasLower) score++;
if (hasDigit) score++;
if (hasSymbol) score++;

Console.WriteLine($"Score: {score}/5");
if (score == 5)
{
    Console.WriteLine("Strong");
}
else if (score >= 3)
{
    Console.WriteLine("Medium");
}
else
{
    Console.WriteLine("Weak");
}`),
        stdin: ["Lions2026!"],
        tests: [
          { type: "fn", stdin: ["Lions2026!"], fn: (out) => out.includes("Score: 5/5") && /\bStrong\b/.test(out), msg: "Lions2026! meets all five rules: Score: 5/5 and Strong" },
          { type: "fn", stdin: ["football"], fn: (out) => out.includes("Score: 2/5") && /\bWeak\b/.test(out), msg: "football (long, lower case only) should score 2/5: Weak" },
          { type: "fn", stdin: ["Pass12"], fn: (out) => out.includes("Score: 3/5") && /\bMedium\b/.test(out), msg: "Pass12 (upper, lower, digit but short) should score 3/5: Medium" },
          { type: "fn", stdin: ["abc"], fn: (out) => out.includes("Score: 1/5") && /\bWeak\b/.test(out), msg: "abc should score 1/5: Weak" },
          { type: "fn", stdin: ["MY DOG IS 7"], fn: (out) => out.includes("Score: 4/5") && /\bMedium\b/.test(out), msg: "MY DOG IS 7 (long, upper, digit, spaces count as symbols) should score 4/5: Medium" },
          { type: "code", pattern: "foreach\\s*\\(|for\\s*\\(", msg: "Loop through the characters." }
        ],
        hint: "Inside foreach (char c in pw): if (char.IsUpper(c)) hasUpper = true; and so on. A symbol is !char.IsLetterOrDigit(c)."
      },

      // ---------------------------------------------------------------- l6
      {
        id: "m08-l6",
        title: "ASCII and the Caesar cipher",
        type: "code",
        learn: `
<p>Computers store every character as a number called its <strong>character code</strong>. In <strong>ASCII</strong>, <code>'A'</code> is 65, <code>'B'</code> is 66 … <code>'Z'</code> is 90, and <code>'a'</code> is 97.</p>
<p>In C# you can switch between a <code>char</code> and its code by <strong>casting</strong>:</p>
<pre><code class="cs">char letter = 'C';
int code = (int)letter;          // 67
char next = (char)(code + 1);    // 'D'
Console.WriteLine(letter + 1);   // 68 (char arithmetic gives an int!)</code></pre>
<h3>The Caesar cipher</h3>
<p>Julius Caesar hid messages by shifting every letter along the alphabet. With a shift of 3, <code>A→D</code>, <code>B→E</code> … and at the end it wraps round: <code>X→A</code>, <code>Y→B</code>, <code>Z→C</code>.</p>
<p>To wrap round, turn the letter into a position from 0 to 25, add the shift, use <code>% 26</code>, then turn it back:</p>
<pre><code class="cs">char c = 'Y';
int pos = c - 'A';                  // 24
int newPos = (pos + 3) % 26;        // 27 % 26 = 1
char shifted = (char)('A' + newPos);   // 'B'</code></pre>
<p>Build the secret message one character at a time by adding to an empty string: <code>result += shifted;</code></p>
<div class="tip">Only shift letters. Leave spaces and punctuation as they are, so the message keeps its word gaps.</div>`,
        instructions: [
          "Ask <code>Message: </code> and read it, converting it to upper case. Then ask <code>Shift: </code> and read a whole number (0 to 25).",
          "Loop through each character. If it's a letter, shift it using the method above (with wrap-round). Otherwise keep it unchanged.",
          "Print <code>Encrypted: KHOOR ZRUOG</code> (the result)."
        ],
        starter: prog(`
Console.Write("Message: ");
string message = Console.ReadLine().ToUpper();
Console.Write("Shift: ");
int shift = Convert.ToInt32(Console.ReadLine());

string result = "";

// TODO: foreach (char c in message)
//     if char.IsLetter(c): work out pos, newPos and shifted, then add shifted to result
//     else: add c to result unchanged

Console.WriteLine("Encrypted: " + result);`),
        solution: prog(`
Console.Write("Message: ");
string message = Console.ReadLine().ToUpper();
Console.Write("Shift: ");
int shift = Convert.ToInt32(Console.ReadLine());

string result = "";

foreach (char c in message)
{
    if (char.IsLetter(c))
    {
        int pos = c - 'A';
        int newPos = (pos + shift) % 26;
        char shifted = (char)('A' + newPos);
        result += shifted;
    }
    else
    {
        result += c;
    }
}

Console.WriteLine("Encrypted: " + result);`),
        stdin: ["hello world", "3"],
        tests: [
          { type: "output", stdin: ["hello world", "3"], includes: "Encrypted: KHOOR ZRUOG", caseSensitive: true, msg: "hello world with shift 3 should give Encrypted: KHOOR ZRUOG" },
          { type: "output", stdin: ["xyz", "3"], includes: "Encrypted: ABC", caseSensitive: true, msg: "xyz with shift 3 should wrap round to Encrypted: ABC" },
          { type: "output", stdin: ["Go Lions!", "1"], includes: "Encrypted: HP MJPOT!", caseSensitive: true, msg: "Go Lions! with shift 1 should give Encrypted: HP MJPOT! (punctuation unchanged)" },
          { type: "output", stdin: ["Zebra", "25"], includes: "Encrypted: YDAQZ", caseSensitive: true, msg: "Zebra with shift 25 should give Encrypted: YDAQZ" },
          { type: "code", pattern: "\\(\\s*char\\s*\\)", msg: "Cast back to a char with (char)." },
          { type: "code", pattern: "%\\s*26", msg: "Use % 26 to wrap round the alphabet." }
        ],
        hint: "int pos = c - 'A'; int newPos = (pos + shift) % 26; char shifted = (char)('A' + newPos);"
      },

      // ---------------------------------------------------------------- l7
      {
        id: "m08-l7",
        title: "Building usernames",
        type: "code",
        learn: `
<p>Schools often make usernames from parts of a pupil's details. This is a great exam-style task that mixes several string methods.</p>
<p>Suppose the rule is: <em>first 3 letters of the surname + first letter of the first name + the last two digits of the year they started, all in lower case</em>.</p>
<pre><code class="cs">string first = "Ciarán";
string surname = "Mulberry";
int year = 2024;

string part1 = surname.Substring(0, 3);         // "Mul"
string part2 = first.Substring(0, 1);           // "C"
string part3 = (year % 100).ToString();         // "24"

string username = (part1 + part2 + part3).ToLower();
Console.WriteLine(username);                     // mulc24</code></pre>
<h3>Watch out for short names!</h3>
<p>What if the surname is <code>Ng</code>? <code>Substring(0, 3)</code> would ask for 3 characters from a 2-letter string and crash. Use <code>Math.Min</code> to take at most 3:</p>
<pre><code class="cs">int take = Math.Min(3, surname.Length);
string part1 = surname.Substring(0, take);     // "Ng"</code></pre>
<div class="tip"><code>year % 100</code> gives the last two digits, but <code>2005 % 100</code> is <code>5</code>, not <code>05</code>. Formatting with <code>(year % 100).ToString("D2")</code> pads it to two digits: <code>05</code>.</div>`,
        instructions: [
          "Ask <code>First name: </code>, <code>Surname: </code> and <code>Year started: </code> (a whole number). Use <code>Trim()</code> on the names.",
          "Build the username: up to the first 3 letters of the surname + the first letter of the first name + the last two digits of the year (always 2 digits), all lower case.",
          "Print <code>Your username is: mulc24</code>"
        ],
        starter: prog(`
Console.Write("First name: ");
string first = Console.ReadLine().Trim();
Console.Write("Surname: ");
string surname = Console.ReadLine().Trim();
Console.Write("Year started: ");
int year = Convert.ToInt32(Console.ReadLine());

// TODO: part1 = up to 3 letters of surname (use Math.Min)
// TODO: part2 = first letter of first name
// TODO: part3 = last two digits of year, using ToString("D2")
// TODO: join, make lower case and print Your username is: ...`),
        solution: prog(`
Console.Write("First name: ");
string first = Console.ReadLine().Trim();
Console.Write("Surname: ");
string surname = Console.ReadLine().Trim();
Console.Write("Year started: ");
int year = Convert.ToInt32(Console.ReadLine());

int take = Math.Min(3, surname.Length);
string part1 = surname.Substring(0, take);
string part2 = first.Substring(0, 1);
string part3 = (year % 100).ToString("D2");

string username = (part1 + part2 + part3).ToLower();
Console.WriteLine("Your username is: " + username);`),
        stdin: ["Ciarán", "Mulberry", "2024"],
        tests: [
          { type: "output", stdin: ["Ciarán", "Mulberry", "2024"], includes: "Your username is: mulc24", caseSensitive: true, msg: "Ciarán Mulberry, 2024 should give Your username is: mulc24" },
          { type: "output", stdin: [" Grace ", " Ng ", "2023"], includes: "Your username is: ngg23", caseSensitive: true, msg: "Grace Ng, 2023 should give ngg23 (short surname, and trim the spaces)." },
          { type: "output", stdin: ["Ben", "Appleby", "2005"], includes: "Your username is: appb05", caseSensitive: true, msg: "Ben Appleby, 2005 should give appb05 (year padded to two digits)." },
          { type: "code", pattern: "Substring\\s*\\(", msg: "Use Substring to take parts of the names." }
        ],
        hint: "surname.Substring(0, Math.Min(3, surname.Length)) + first.Substring(0, 1) + (year % 100).ToString(\"D2\"), then .ToLower()."
      },

      // ---------------------------------------------------------------- l8
      {
        id: "m08-l8",
        title: "Join, PadLeft and PadRight tables",
        type: "code",
        learn: `
<p>Two more tools help you present text neatly.</p>
<h3>string.Join</h3>
<p><code>string.Join</code> glues all the elements of an array or list together, with a separator between each one. It's the opposite of <code>Split</code>.</p>
<pre><code class="cs">string[] toppings = { "cheese", "ham", "pineapple" };
Console.WriteLine(string.Join(", ", toppings));
// cheese, ham, pineapple</code></pre>
<h3>PadRight and PadLeft</h3>
<p>To line text up in columns, pad it with spaces to a fixed width. <code>PadRight</code> adds spaces on the right (left-aligned text, good for names). <code>PadLeft</code> adds them on the left (right-aligned, good for numbers).</p>
<pre><code class="cs">string[] items = { "Toastie", "Soup", "Smoothie" };
double[] prices = { 2.5, 1.8, 2.25 };

for (int i = 0; i &lt; items.Length; i++)
{
    Console.WriteLine(items[i].PadRight(10) + prices[i].ToString("F2").PadLeft(6));
}</code></pre>
<pre><code>Toastie     2.50
Soup        1.80
Smoothie    2.25</code></pre>
<p><code>"Soup".PadRight(10)</code> is <code>"Soup"</code> followed by 6 spaces, so the total width is 10.</p>
<div class="tip">This only lines up in a <strong>monospaced</strong> font, where every character is the same width. Consoles use monospaced fonts.</div>`,
        instructions: [
          "Print a header line: <code>\"Pupil\".PadRight(10)</code> followed by <code>\"Points\".PadLeft(6)</code>.",
          "Loop through the parallel arrays and print each pupil's name with <code>PadRight(10)</code> followed by their points with <code>PadLeft(6)</code>, e.g. <code>Aoife        120</code>.",
          "Finally print <code>Team: Aoife, Ben, Niamh, Oisín</code> using <code>string.Join</code>."
        ],
        starter: prog(`
string[] names = { "Aoife", "Ben", "Niamh", "Oisín" };
int[] points = { 120, 85, 210, 64 };

// TODO: print the header with PadRight(10) and PadLeft(6)

// TODO: for loop printing each row

// TODO: print Team: ... using string.Join(", ", names)`),
        solution: prog(`
string[] names = { "Aoife", "Ben", "Niamh", "Oisín" };
int[] points = { 120, 85, 210, 64 };

Console.WriteLine("Pupil".PadRight(10) + "Points".PadLeft(6));

for (int i = 0; i < names.Length; i++)
{
    Console.WriteLine(names[i].PadRight(10) + points[i].ToString().PadLeft(6));
}

Console.WriteLine("Team: " + string.Join(", ", names));`),
        tests: [
          { type: "output", includes: "Pupil     Points", caseSensitive: true, msg: "The header should be Pupil padded to 10, then Points padded to 6." },
          { type: "fn", fn: (out) => [["Aoife", 120], ["Ben", 85], ["Niamh", 210], ["Oisín", 64]].every(([n, p]) => out.includes(n.padEnd(10) + String(p).padStart(6))), msg: "Each row should be the name padded to 10 then the points padded to 6 (e.g. \"Ben           85\")." },
          { type: "output", includes: "Team: Aoife, Ben, Niamh, Oisín", msg: "Print Team: Aoife, Ben, Niamh, Oisín" },
          { type: "code", pattern: "string\\.Join\\s*\\(", msg: "Use string.Join." },
          { type: "code", pattern: "PadRight\\s*\\([\\s\\S]*PadLeft\\s*\\(|PadLeft\\s*\\([\\s\\S]*PadRight\\s*\\(", msg: "Use PadRight and PadLeft." }
        ],
        hint: "names[i].PadRight(10) + points[i].ToString().PadLeft(6)"
      },

      // ---------------------------------------------------------------- quiz
      {
        id: "m08-quiz",
        title: "Checkpoint: strings",
        type: "quiz",
        questions: [
          { q: "What does <code>\"Enniskillen\".Length</code> return?",
            options: ["10", "11", "12", "9"],
            answer: 1, explain: "E-n-n-i-s-k-i-l-l-e-n is 11 characters." },
          { q: "What is <code>\"Rugby\"[1]</code>?",
            options: ["'R'", "'u'", "'g'", "An error"],
            answer: 1, explain: "Indexes start at 0, so index 1 is the second character, 'u'." },
          { q: "What does <code>\"Football\".Substring(4, 3)</code> give?",
            options: ["\"ball\"", "\"bal\"", "\"tba\"", "\"oot\""],
            answer: 1, explain: "Start at index 4 ('b') and take 3 characters: \"bal\"." },
          { q: "What does <code>\"canteen\".IndexOf('z')</code> return?",
            options: ["0", "null", "-1", "An exception"],
            answer: 2, explain: "IndexOf returns -1 when the character isn't found." },
          { q: "<code>\"Ben,15,Eagles\".Split(',')</code> produces…",
            options: ["A string with the commas removed", "An array of 3 strings", "An array of 2 strings", "A List&lt;int&gt;"],
            answer: 1, explain: "Split returns a string array: { \"Ben\", \"15\", \"Eagles\" }." },
          { q: "Which expression is true when <code>c</code> is a symbol such as <code>!</code>?",
            options: ["char.IsDigit(c)", "char.IsLetter(c)", "!char.IsLetterOrDigit(c)", "char.IsUpper(c)"],
            answer: 2, explain: "A symbol is neither a letter nor a digit, so IsLetterOrDigit is false and ! makes it true." },
          { q: "What is <code>(char)('A' + 2)</code>?",
            options: ["'C'", "67", "\"A2\"", "'B'"],
            answer: 0, explain: "'A' is 65; 65 + 2 = 67, and casting 67 to char gives 'C'." },
          { q: "After <code>string s = \"hi\"; s.ToUpper();</code> what is <code>s</code>?",
            options: ["\"HI\"", "\"hi\"", "\"Hi\"", "null"],
            answer: 1, explain: "Strings are immutable. ToUpper returns a new string, but it wasn't stored, so s is still \"hi\"." }
        ]
      }
    ]
  });
})();
