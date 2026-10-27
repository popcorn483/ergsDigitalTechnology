// Module 10: Validation and errors
(function () {
  const cs = String.raw;
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const trim = (s) => s.replace(/^\n+/, "").replace(/\s+$/, "");
  const pre = (s) => `<pre><code class="cs">${esc(trim(s))}</code></pre>`;
  const out = (s) => `<pre><code>${esc(trim(s))}</code></pre>`;
  // Wraps a Main body (and optional extra Program members) in the full Program shape.
  function prog(body, opts) {
    opts = opts || {};
    const ind = (s, n) => trim(s).split("\n").map((l) => (l.trim() ? " ".repeat(n) + l : "")).join("\n");
    let src = (opts.usings || "using System;") + "\n\n";
    if (opts.classes) src += trim(opts.classes) + "\n\n";
    src += "class Program\n{\n";
    if (opts.before) src += ind(opts.before, 4) + "\n\n";
    src += "    static void Main(string[] args)\n    {\n" + ind(body, 8) + "\n    }\n";
    if (opts.after) src += "\n" + ind(opts.after, 4) + "\n";
    return src + "}\n";
  }
  const count = (s, sub) => s.toLowerCase().split(sub.toLowerCase()).length - 1;

  COURSE.addModule({
    id: "m10",
    title: "Validation and errors",
    icon: "shield",
    summary: "Stop bad data getting in with validation, find and fix the three kinds of error, catch exceptions and plan your testing.",
    lessons: [
      // ------------------------------------------------------------------ l1
      {
        id: "m10-l1",
        title: "Types of validation",
        type: "code",
        learn: cs`
<p>Users make mistakes. They leave boxes empty, type <code>fourteen</code> instead of <code>14</code>, or enter an age of 140. If your program trusts everything it's given, it will crash or store rubbish. The rule programmers use is <strong>garbage in, garbage out</strong>.</p>
<div class="key"><strong>Validation</strong> an automatic check, done by the program, that input is sensible and reasonable before it is used. It cannot tell whether the data is <em>correct</em>, only that it is <em>allowed</em>.</div>
<h3>The six checks you need to know</h3>
<table>
<tr><th>Check</th><th>What it tests</th><th>Example</th></tr>
<tr><td>Presence</td><td>Something has been entered</td><td>Username is not blank</td></tr>
<tr><td>Length</td><td>The number of characters is within limits</td><td>Password has at least 8 characters</td></tr>
<tr><td>Range</td><td>A number lies between a lower and upper limit</td><td>Age is from 11 to 18</td></tr>
<tr><td>Type</td><td>The data is the right data type</td><td>Age is a whole number, not <code>ten</code></td></tr>
<tr><td>Format</td><td>The data follows a pattern</td><td>A postcode like <code>BT74 6AB</code></td></tr>
<tr><td>Lookup</td><td>The value is in a list of allowed values</td><td>Year group is one of 8, 9, 10, 11, 12</td></tr>
</table>
<p>Here's a presence check and a length check on a team name:</p>
${pre(cs`
Console.Write("Team name: ");
string team = Console.ReadLine();

if (team == "")
{
    Console.WriteLine("Error: team name cannot be blank.");
}
else if (team.Length > 20)
{
    Console.WriteLine("Error: team name is too long.");
}
else
{
    Console.WriteLine("Team saved.");
}`)}
<div class="tip"><strong>Validation vs verification.</strong> Verification checks that data has been entered or copied <em>accurately</em>, for example typing a new password twice (double entry) or reading it back to the user (visual check). Validation checks it is <em>reasonable</em>. You'll use both in the final project.</div>`,
        instructions: [
          "The starter asks for a username. Add a <strong>presence check</strong>: if it is empty (<code>\"\"</code>) print <code>Error: username cannot be blank.</code>",
          "Otherwise add a <strong>length check</strong>: if it has fewer than 3 or more than 12 characters print <code>Error: username must be 3 to 12 characters.</code>",
          "Otherwise print <code>Username accepted.</code>"
        ],
        starter: prog(cs`
Console.Write("Choose a username: ");
string username = Console.ReadLine();

// TODO: presence check, then length check, then accept`),
        solution: prog(cs`
Console.Write("Choose a username: ");
string username = Console.ReadLine();

if (username == "")
{
    Console.WriteLine("Error: username cannot be blank.");
}
else if (username.Length < 3 || username.Length > 12)
{
    Console.WriteLine("Error: username must be 3 to 12 characters.");
}
else
{
    Console.WriteLine("Username accepted.");
}`),
        stdin: ["Oisin"],
        tests: [
          { type: "output", stdin: ["Oisin"], includes: "Username accepted.", msg: "Oisin is a valid username, so print Username accepted." },
          { type: "output", stdin: [""], includes: "Error: username cannot be blank.", msg: "An empty username should print Error: username cannot be blank." },
          { type: "fn", stdin: ["al"], fn: (o) => o.includes("Error: username must be 3 to 12 characters.") && !/accepted/i.test(o), msg: "al is too short: print the length error (and not Username accepted.)." },
          { type: "output", stdin: ["ciaran_the_great"], includes: "Error: username must be 3 to 12 characters.", msg: "ciaran_the_great has 16 characters, which is too long." },
          { type: "output", stdin: ["abcdefghijkl"], includes: "Username accepted.", msg: "Exactly 12 characters is allowed (it's a boundary value)." }
        ],
        hint: "if (username == \"\") { ... } else if (username.Length < 3 || username.Length > 12) { ... } else { ... }"
      },

      // ------------------------------------------------------------------ l2
      {
        id: "m10-l2",
        title: "Validation loops with TryParse",
        type: "code",
        learn: cs`
<p>Printing an error message is a start, but a good program <strong>asks again</strong> until it gets valid data. That needs a loop.</p>
<p>There's another problem. If someone types <code>ten</code> when you use <code>int.Parse</code> or <code>Convert.ToInt32</code>, the program crashes with a <code>FormatException</code>. The fix is <code>int.TryParse</code>. It <em>tries</em> to convert the text and returns <code>true</code> or <code>false</code> instead of crashing. If it works, the number is put into the <code>out</code> variable.</p>
${pre(cs`
int goals;
bool ok = int.TryParse("7", out goals);     // ok is true,  goals is 7
ok = int.TryParse("seven", out goals);      // ok is false, goals is 0`)}
<h3>A validation loop</h3>
<p>Put the type check and the range check in one <code>while</code> condition. The loop keeps going while the input is <em>not</em> a number <strong>or</strong> it's out of range:</p>
${pre(cs`
int squad;
Console.Write("Squad size (15-23): ");
while (!int.TryParse(Console.ReadLine(), out squad) || squad < 15 || squad > 23)
{
    Console.Write("Please enter a whole number from 15 to 23: ");
}
Console.WriteLine($"Squad size set to {squad}");`)}
${out(cs`
Squad size (15-23): twenty
Please enter a whole number from 15 to 23: 30
Please enter a whole number from 15 to 23: 22
Squad size set to 22`)}
<div class="tip">The order matters. <code>||</code> stops as soon as one side is true, so if <code>TryParse</code> fails the range checks are skipped. That's called <strong>short-circuit evaluation</strong>.</div>
<div class="tip">You can do the same with <code>double.TryParse</code> for decimal numbers.</div>`,
        instructions: [
          "The starter crashes if you type letters. Replace <code>Convert.ToInt32</code> with a validation loop that uses <code>int.TryParse</code>.",
          "Keep asking with <code>Please enter a whole number from 11 to 18: </code> until the age is a whole number from 11 to 18.",
          "Then print <code>Age accepted: </code> followed by the age, e.g. <code>Age accepted: 14</code>"
        ],
        starter: prog(cs`
Console.Write("Enter your age (11-18): ");
int age = Convert.ToInt32(Console.ReadLine());

// TODO: replace the line above with a validation loop using int.TryParse

Console.WriteLine($"Age accepted: {age}");`),
        solution: prog(cs`
int age;
Console.Write("Enter your age (11-18): ");
while (!int.TryParse(Console.ReadLine(), out age) || age < 11 || age > 18)
{
    Console.Write("Please enter a whole number from 11 to 18: ");
}

Console.WriteLine($"Age accepted: {age}");`),
        stdin: ["14"],
        tests: [
          { type: "output", stdin: ["14"], includes: "Age accepted: 14", msg: "Typing 14 should print Age accepted: 14" },
          { type: "output", stdin: ["fourteen", "25", "10", "18"], includes: "Age accepted: 18", msg: "After fourteen, 25 and 10 are rejected, 18 should be accepted (no crash!)." },
          { type: "fn", stdin: ["fourteen", "25", "10", "18"], fn: (o) => count(o, "Please enter a whole number from 11 to 18") === 3, msg: "Print Please enter a whole number from 11 to 18: once for each of the 3 invalid inputs." },
          { type: "output", stdin: ["11"], includes: "Age accepted: 11", msg: "11 is a boundary value and should be accepted." },
          { type: "code", pattern: "int\\.TryParse", msg: "Use int.TryParse." }
        ],
        hint: "while (!int.TryParse(Console.ReadLine(), out age) || age < 11 || age > 18) { ask again }. Declare int age; before the loop."
      },

      // ------------------------------------------------------------------ l3
      {
        id: "m10-l3",
        title: "A reusable GetIntInRange method",
        type: "code",
        learn: cs`
<p>Programs ask for numbers all the time: menu choices, scores, ages. Writing a fresh validation loop every time is repetitive and easy to get wrong. Instead, write the loop <strong>once</strong> inside a method and call it whenever you need a number.</p>
${pre(cs`
static int GetIntInRange(string prompt, int min, int max)
{
    int value;
    Console.Write(prompt);
    while (!int.TryParse(Console.ReadLine(), out value) || value < min || value > max)
    {
        Console.Write($"Please enter a whole number from {min} to {max}: ");
    }
    return value;
}`)}
<p>Now one line gets you a validated number:</p>
${pre(cs`
int choice = GetIntInRange("Choose 1-4: ", 1, 4);
int seats = GetIntInRange("How many seats? ", 1, 10);`)}
<p>The <strong>parameters</strong> make it flexible: the prompt, the lowest and the highest allowed value change each time, but the logic stays the same. If you find a bug you fix it in one place. You'll use this exact method in the final quiz project for the menus.</p>
<div class="key"><strong>Reusable code</strong> a subroutine written once and called from many places. It makes programs shorter, easier to test and easier to maintain.</div>
<p>Rugby union scoring: a try is worth 5 points, a conversion 2 and a penalty 3.</p>`,
        instructions: [
          "Finish the <code>GetIntInRange</code> method so it keeps asking (with <code>Please enter a whole number from {min} to {max}: </code>) until it gets a whole number in range, then returns it.",
          "In <code>Main</code>, use it three times to read the tries, conversions and penalties, each from 0 to 20, with the prompts <code>Tries: </code>, <code>Conversions: </code> and <code>Penalties: </code>",
          "Print <code>Total points: </code> and the total (try 5, conversion 2, penalty 3), e.g. <code>Total points: 22</code>"
        ],
        starter: prog(cs`
int tries = Convert.ToInt32(Console.ReadLine());
int conversions = Convert.ToInt32(Console.ReadLine());
int penalties = Convert.ToInt32(Console.ReadLine());

// TODO: use GetIntInRange for each input instead

int total = tries * 5 + conversions * 2 + penalties * 3;
Console.WriteLine($"Total points: {total}");`, {
          after: cs`
static int GetIntInRange(string prompt, int min, int max)
{
    // TODO: show the prompt, then loop until the input is a whole number from min to max
    return 0;
}`
        }),
        solution: prog(cs`
int tries = GetIntInRange("Tries: ", 0, 20);
int conversions = GetIntInRange("Conversions: ", 0, 20);
int penalties = GetIntInRange("Penalties: ", 0, 20);

int total = tries * 5 + conversions * 2 + penalties * 3;
Console.WriteLine($"Total points: {total}");`, {
          after: cs`
static int GetIntInRange(string prompt, int min, int max)
{
    int value;
    Console.Write(prompt);
    while (!int.TryParse(Console.ReadLine(), out value) || value < min || value > max)
    {
        Console.Write($"Please enter a whole number from {min} to {max}: ");
    }
    return value;
}`
        }),
        stdin: ["3", "2", "1"],
        tests: [
          { type: "output", stdin: ["3", "2", "1"], includes: "Total points: 22", msg: "3 tries, 2 conversions and 1 penalty is 22 points." },
          { type: "output", stdin: ["3", "2", "1"], includes: "Conversions:", msg: "Use the prompt Conversions: for the second number." },
          { type: "output", stdin: ["three", "3", "-2", "25", "2", "1"], includes: "Total points: 22", msg: "Invalid inputs (three, -2, 25) should be rejected without crashing." },
          { type: "fn", stdin: ["three", "3", "-2", "25", "2", "1"], fn: (o) => count(o, "Please enter a whole number from 0 to 20") === 3, msg: "Print Please enter a whole number from 0 to 20: for each invalid input." },
          { type: "fn", fn: (o, code) => count(code, "GetIntInRange(") >= 4, msg: "Call GetIntInRange three times in Main." }
        ],
        hint: "Copy the validation loop from the last lesson into the method, using min and max instead of 11 and 18, then return value. In Main: int tries = GetIntInRange(\"Tries: \", 0, 20);"
      },

      // ------------------------------------------------------------------ l4
      {
        id: "m10-l4",
        title: "Syntax, logic and run-time errors",
        type: "code",
        learn: cs`
<p>Every programmer writes bugs. What matters is spotting which <em>kind</em> of error you have, because each one is found and fixed differently.</p>
<table>
<tr><th>Error</th><th>What happens</th><th>Example</th></tr>
<tr><td><strong>Syntax</strong></td><td>The code breaks the rules of the language, so it won't compile or run at all. The compiler tells you the line.</td><td>Missing <code>;</code>, misspelt <code>Consle</code>, missing <code>}</code></td></tr>
<tr><td><strong>Logic</strong></td><td>The program runs but gives the <em>wrong answer</em>. No error message appears, so these are the hardest to find.</td><td><code>&gt;</code> instead of <code>&gt;=</code>, wrong brackets in a sum</td></tr>
<tr><td><strong>Run-time</strong></td><td>The program compiles but crashes while running, when something impossible happens.</td><td>Dividing by zero, converting <code>abc</code> to an int, an array index that doesn't exist</td></tr>
</table>
<h3>Spot the logic errors</h3>
${pre(cs`
int a = 6, b = 8, c = 10;
double average = a + b + c / 3;    // gives 17, not 8
if (average > 8)                  // should 8 count?`)}
<p>Two problems. First, <strong>BIDMAS</strong>: division happens before addition, so only <code>c</code> is divided by 3. Second, <code>c / 3</code> is <code>int</code> divided by <code>int</code>, which throws away the remainder. The fix is brackets and dividing by <code>3.0</code>:</p>
${pre(cs`
double average = (a + b + c) / 3.0;   // 8`)}
<p>Then think about the boundary. If 8 should count, the condition must be <code>&gt;= 8</code>, not <code>&gt; 8</code>. Testing with values right on the boundary is how you catch this.</p>
<div class="tip">To find logic errors, work out the expected answer by hand first, then compare it with what the program prints. A <strong>trace table</strong> helps you follow the values line by line.</div>`,
        instructions: [
          "The starter runs, but it has <strong>two logic errors</strong>. A pupil passes if their average mark is <strong>50 or more</strong>.",
          "Fix the average so it is the correct mean of the three marks (marks 50, 60 and 56 should give <code>Average: 55.3</code>).",
          "Fix the condition so an average of exactly 50 prints <code>Result: Pass</code>. Below 50 should print <code>Result: Fail</code>."
        ],
        starter: prog(cs`
Console.Write("Mark 1: ");
int mark1 = Convert.ToInt32(Console.ReadLine());
Console.Write("Mark 2: ");
int mark2 = Convert.ToInt32(Console.ReadLine());
Console.Write("Mark 3: ");
int mark3 = Convert.ToInt32(Console.ReadLine());

double average = mark1 + mark2 + mark3 / 3;
Console.WriteLine($"Average: {average:F1}");

if (average > 50)
{
    Console.WriteLine("Result: Pass");
}
else
{
    Console.WriteLine("Result: Fail");
}`),
        solution: prog(cs`
Console.Write("Mark 1: ");
int mark1 = Convert.ToInt32(Console.ReadLine());
Console.Write("Mark 2: ");
int mark2 = Convert.ToInt32(Console.ReadLine());
Console.Write("Mark 3: ");
int mark3 = Convert.ToInt32(Console.ReadLine());

double average = (mark1 + mark2 + mark3) / 3.0;
Console.WriteLine($"Average: {average:F1}");

if (average >= 50)
{
    Console.WriteLine("Result: Pass");
}
else
{
    Console.WriteLine("Result: Fail");
}`),
        stdin: ["50", "60", "56"],
        tests: [
          { type: "output", stdin: ["50", "60", "56"], includes: "Average: 55.3", msg: "Marks 50, 60 and 56 should give Average: 55.3 (check the brackets and the int division)." },
          { type: "output", stdin: ["40", "45", "47"], includes: "Result: Fail", msg: "Marks 40, 45 and 47 average 44.0, which is a Fail." },
          { type: "output", stdin: ["49", "50", "51"], includes: "Result: Pass", msg: "An average of exactly 50 should be a Pass." },
          { type: "output", stdin: ["49", "50", "51"], includes: "Average: 50.0", msg: "Marks 49, 50 and 51 should give Average: 50.0" }
        ],
        hint: "Put brackets round the three marks and divide by 3.0. Then change > to >=."
      },

      // ------------------------------------------------------------------ l5
      {
        id: "m10-l5",
        title: "Catching exceptions with try and catch",
        type: "code",
        learn: cs`
<p>When a run-time error happens, C# <strong>throws an exception</strong>. If nothing catches it, the program crashes with a message like:</p>
${out(cs`Unhandled exception. System.FormatException: The input string 'ten' was not in a correct format.`)}
<p>You can <strong>catch</strong> exceptions so the program deals with the problem calmly. Put the risky code in a <code>try</code> block, and the code to run if it goes wrong in a <code>catch</code> block:</p>
${pre(cs`
try
{
    Console.Write("How many pizzas? ");
    int pizzas = int.Parse(Console.ReadLine());
    Console.Write("How many people? ");
    int people = int.Parse(Console.ReadLine());
    Console.WriteLine($"Each person gets {8 * pizzas / people} slices");
}
catch (FormatException)
{
    Console.WriteLine("Numbers only, please.");
}
catch (DivideByZeroException)
{
    Console.WriteLine("Nobody to share with!");
}
Console.WriteLine("Enjoy!");`)}
<p>As soon as an exception is thrown, C# jumps out of the <code>try</code> block (skipping the rest of it) to the first matching <code>catch</code>. Afterwards the program carries on after the last <code>catch</code>.</p>
<h3>Common exceptions</h3>
<ul>
<li><code>FormatException</code>: text can't be converted to a number.</li>
<li><code>DivideByZeroException</code>: an <code>int</code> divided by 0.</li>
<li><code>IndexOutOfRangeException</code>: an array index that doesn't exist.</li>
</ul>
<p>Write <code>catch (FormatException ex)</code> if you want the details: <code>ex.Message</code> holds the error text. <code>catch (Exception ex)</code> catches <em>every</em> kind, but specific catches let you give a helpful message for each problem.</p>
<div class="tip">Validation stops bad data getting in; exception handling is the safety net for anything that still goes wrong.</div>`,
        instructions: [
          "Wrap the bill-splitting code in a <code>try</code> block.",
          "Catch <code>FormatException</code> and print <code>Please type whole numbers only.</code>",
          "Catch <code>DivideByZeroException</code> and print <code>You can't split the bill between 0 people.</code>",
          "Leave <code>Thanks for using Bill Splitter.</code> <em>after</em> the catches so it always prints."
        ],
        starter: prog(cs`
Console.Write("Total bill (£): ");
int total = int.Parse(Console.ReadLine());
Console.Write("Number of people: ");
int people = int.Parse(Console.ReadLine());
Console.WriteLine($"Each person pays £{total / people}");

Console.WriteLine("Thanks for using Bill Splitter.");`),
        solution: prog(cs`
try
{
    Console.Write("Total bill (£): ");
    int total = int.Parse(Console.ReadLine());
    Console.Write("Number of people: ");
    int people = int.Parse(Console.ReadLine());
    Console.WriteLine($"Each person pays £{total / people}");
}
catch (FormatException)
{
    Console.WriteLine("Please type whole numbers only.");
}
catch (DivideByZeroException)
{
    Console.WriteLine("You can't split the bill between 0 people.");
}

Console.WriteLine("Thanks for using Bill Splitter.");`),
        stdin: ["30", "3"],
        tests: [
          { type: "output", stdin: ["30", "3"], includes: "Each person pays £10", msg: "A £30 bill between 3 people should print Each person pays £10" },
          { type: "output", stdin: ["thirty", "3"], includes: "Please type whole numbers only.", msg: "Typing thirty should print Please type whole numbers only." },
          { type: "output", stdin: ["30", "0"], includes: "You can't split the bill between 0 people.", msg: "0 people should print You can't split the bill between 0 people." },
          { type: "output", stdin: ["30", "0"], includes: "Thanks for using Bill Splitter.", msg: "Thanks for using Bill Splitter. should still print after an error." },
          { type: "code", pattern: "catch\\s*\\(\\s*DivideByZeroException", msg: "Catch DivideByZeroException specifically." }
        ],
        hint: "try { ...the four input lines and the WriteLine... } catch (FormatException) { ... } catch (DivideByZeroException) { ... }"
      },

      // ------------------------------------------------------------------ l6
      {
        id: "m10-l6",
        title: "Index errors and finally",
        type: "code",
        learn: cs`
<p>Arrays are a common source of run-time errors. An array with 5 items has indexes 0 to 4, so asking for item <code>[5]</code> or <code>[-1]</code> throws an <code>IndexOutOfRangeException</code> with the message <code>Index was outside the bounds of the array.</code></p>
<p>Users count from 1 but arrays count from 0, so you'll often subtract 1. If the user types a number that's too big or too small, the exception is your safety net.</p>
<h3>finally</h3>
<p>A <code>finally</code> block goes after the catches. It runs <strong>every time</strong>: whether the <code>try</code> worked, an exception was caught, or even if the method returns early. It's used for tidying up, such as closing a file or printing a status message.</p>
${pre(cs`
string[] positions = { "Prop", "Hooker", "Lock", "Flanker", "Scrum-half" };
Console.Write("Position number (1-5): ");
try
{
    int n = int.Parse(Console.ReadLine());
    Console.WriteLine($"Number {n} is {positions[n - 1]}");
}
catch (FormatException)
{
    Console.WriteLine("Type a number.");
}
catch (IndexOutOfRangeException)
{
    Console.WriteLine("No such position.");
}
finally
{
    Console.WriteLine("Lookup complete.");
}`)}
${out(cs`
Position number (1-5): 7
No such position.
Lookup complete.`)}
<div class="warn">Catching an exception isn't an excuse to skip validation. Here a range check would work too. But try/catch protects you from cases you didn't think of.</div>`,
        instructions: [
          "The starter looks up a pet by number. Put the risky lines in a <code>try</code> block.",
          "Catch <code>FormatException</code> and print <code>That is not a number.</code>",
          "Catch <code>IndexOutOfRangeException</code> and print <code>There is no pet with that number.</code>",
          "Add a <code>finally</code> block that prints <code>Search finished.</code>"
        ],
        starter: prog(cs`
string[] pets = { "Biscuit", "Luna", "Max", "Pepper", "Shadow" };

Console.Write("Enter a pet number (1-5): ");
int number = int.Parse(Console.ReadLine());
Console.WriteLine($"Pet {number} is {pets[number - 1]}.");`),
        solution: prog(cs`
string[] pets = { "Biscuit", "Luna", "Max", "Pepper", "Shadow" };

Console.Write("Enter a pet number (1-5): ");
try
{
    int number = int.Parse(Console.ReadLine());
    Console.WriteLine($"Pet {number} is {pets[number - 1]}.");
}
catch (FormatException)
{
    Console.WriteLine("That is not a number.");
}
catch (IndexOutOfRangeException)
{
    Console.WriteLine("There is no pet with that number.");
}
finally
{
    Console.WriteLine("Search finished.");
}`),
        stdin: ["2"],
        tests: [
          { type: "output", stdin: ["2"], includes: "Pet 2 is Luna.", msg: "Number 2 should print Pet 2 is Luna." },
          { type: "output", stdin: ["9"], includes: "There is no pet with that number.", msg: "Number 9 should print There is no pet with that number." },
          { type: "output", stdin: ["two"], includes: "That is not a number.", msg: "Typing two should print That is not a number." },
          { type: "fn", stdin: ["2"], fn: (o) => o.includes("Search finished.") && o.indexOf("Search finished.") > o.indexOf("Luna"), msg: "Search finished. should print at the end, even when nothing goes wrong." },
          { type: "code", pattern: "finally", msg: "Use a finally block." }
        ],
        hint: "try { parse and print } catch (FormatException) { } catch (IndexOutOfRangeException) { } finally { Console.WriteLine(\"Search finished.\"); }"
      },

      // ------------------------------------------------------------------ l7
      {
        id: "m10-l7",
        title: "Throwing your own exceptions",
        type: "code",
        learn: cs`
<p>Sometimes <em>your</em> code spots a problem that C# wouldn't notice. A ticket price for an age of <code>-4</code> makes no sense, but the maths would still work. You can <strong>throw</strong> an exception yourself:</p>
${pre(cs`
throw new ArgumentException("Age cannot be negative.");`)}
<p><code>throw</code> stops the method immediately and hands the exception back to whoever called it. The caller decides what to do, usually by catching it and showing <code>ex.Message</code>.</p>
${pre(cs`
static int LapsNeeded(int distance)
{
    if (distance <= 0)
    {
        throw new ArgumentException("Distance must be more than 0.");
    }
    return distance / 400;
}

static void Main(string[] args)
{
    try
    {
        Console.WriteLine(LapsNeeded(1600));   // 4
        Console.WriteLine(LapsNeeded(-50));    // throws
    }
    catch (ArgumentException ex)
    {
        Console.WriteLine("Error: " + ex.Message);
    }
}`)}
${out(cs`
4
Error: Distance must be more than 0.`)}
<p>Why not just print the error inside the method? Because the method might be used in a console app today and a website tomorrow. Throwing lets the <em>caller</em> decide how to report it. It also means the method never returns a misleading value.</p>
<div class="key"><strong>throw</strong> creates an exception and sends it up to the calling code. <code>ArgumentException</code> is the usual choice when a method is given a bad parameter. Inside a <code>catch</code>, <code>throw;</code> on its own passes the same exception on.</div>`,
        instructions: [
          "In <code>TicketPrice</code>, throw an <code>ArgumentException</code> with the message <code>Age cannot be negative.</code> if <code>age</code> is less than 0, and <code>Age is too high.</code> if it is more than 120.",
          "In <code>Main</code>, wrap the code in <code>try</code> and catch <code>ArgumentException ex</code>, printing <code>Error: </code> followed by <code>ex.Message</code>.",
          "Also catch <code>FormatException</code> and print <code>Error: please enter a whole number.</code>"
        ],
        starter: prog(cs`
Console.Write("Enter your age: ");
int age = int.Parse(Console.ReadLine());
double price = TicketPrice(age);
Console.WriteLine($"Ticket price: £{price:F2}");`, {
          after: cs`
static double TicketPrice(int age)
{
    // TODO: throw ArgumentException for ages below 0 or above 120

    if (age < 12)
    {
        return 5.50;
    }
    return 8.00;
}`
        }),
        solution: prog(cs`
Console.Write("Enter your age: ");
try
{
    int age = int.Parse(Console.ReadLine());
    double price = TicketPrice(age);
    Console.WriteLine($"Ticket price: £{price:F2}");
}
catch (ArgumentException ex)
{
    Console.WriteLine("Error: " + ex.Message);
}
catch (FormatException)
{
    Console.WriteLine("Error: please enter a whole number.");
}`, {
          after: cs`
static double TicketPrice(int age)
{
    if (age < 0)
    {
        throw new ArgumentException("Age cannot be negative.");
    }
    if (age > 120)
    {
        throw new ArgumentException("Age is too high.");
    }

    if (age < 12)
    {
        return 5.50;
    }
    return 8.00;
}`
        }),
        stdin: ["9"],
        tests: [
          { type: "output", stdin: ["9"], includes: "Ticket price: £5.50", msg: "Age 9 should print Ticket price: £5.50" },
          { type: "output", stdin: ["-4"], includes: "Error: Age cannot be negative.", msg: "Age -4 should print Error: Age cannot be negative." },
          { type: "output", stdin: ["130"], includes: "Error: Age is too high.", msg: "Age 130 should print Error: Age is too high." },
          { type: "output", stdin: ["old"], includes: "Error: please enter a whole number.", msg: "Typing old should print Error: please enter a whole number." },
          { type: "code", pattern: "throw\\s+new\\s+ArgumentException", msg: "Throw an ArgumentException in TicketPrice." }
        ],
        hint: "if (age < 0) { throw new ArgumentException(\"Age cannot be negative.\"); } Then in Main: try { ... } catch (ArgumentException ex) { Console.WriteLine(\"Error: \" + ex.Message); }"
      },

      // ------------------------------------------------------------------ l8
      {
        id: "m10-l8",
        title: "Test data and test plans",
        type: "read",
        learn: cs`
<p>You can't prove a program works by trying it once with a "nice" value. Good testing is planned <em>before</em> you run anything, using three kinds of test data.</p>
<table>
<tr><th>Type</th><th>Meaning</th><th>For an age from 11 to 18</th></tr>
<tr><td><strong>Normal</strong> (valid)</td><td>Typical data the program should accept</td><td>14</td></tr>
<tr><td><strong>Boundary</strong> (extreme)</td><td>Values at the very edges of what's allowed, plus just outside them</td><td>11 and 18 (accept); 10 and 19 (reject)</td></tr>
<tr><td><strong>Erroneous</strong> (invalid)</td><td>Data that should be rejected: wrong type, out of range, blank</td><td><code>fourteen</code>, -3, 99, blank</td></tr>
</table>
<div class="tip">Boundary tests find the <code>&gt;</code> vs <code>&gt;=</code> logic errors you met earlier. If 18 is rejected, you've found a bug.</div>
<h3>A test plan</h3>
<p>A <strong>test plan</strong> is a table written in advance. Each row says what you're testing, the data, the type of data and the <strong>expected result</strong>. When you run the test you fill in the <strong>actual result</strong>. If they differ, you've found a bug to fix and re-test.</p>
<p>Here's a plan for the age validation loop from earlier in this module:</p>
<table>
<tr><th>No.</th><th>Test</th><th>Data</th><th>Type</th><th>Expected result</th><th>Actual result</th></tr>
<tr><td>1</td><td>Typical age accepted</td><td>14</td><td>Normal</td><td><code>Age accepted: 14</code></td><td>As expected</td></tr>
<tr><td>2</td><td>Lowest age accepted</td><td>11</td><td>Boundary</td><td><code>Age accepted: 11</code></td><td>As expected</td></tr>
<tr><td>3</td><td>Highest age accepted</td><td>18</td><td>Boundary</td><td><code>Age accepted: 18</code></td><td>As expected</td></tr>
<tr><td>4</td><td>Just too young</td><td>10</td><td>Boundary / Erroneous</td><td>Error message, asked again</td><td>As expected</td></tr>
<tr><td>5</td><td>Just too old</td><td>19</td><td>Boundary / Erroneous</td><td>Error message, asked again</td><td>As expected</td></tr>
<tr><td>6</td><td>Text instead of number</td><td>fourteen</td><td>Erroneous</td><td>Error message, no crash</td><td>As expected</td></tr>
<tr><td>7</td><td>Nothing entered</td><td>(blank)</td><td>Erroneous</td><td>Error message, no crash</td><td>As expected</td></tr>
</table>
<h3>Tips for your coursework</h3>
<ul>
<li>Test <strong>every</strong> input and every menu option, not just the main one.</li>
<li>Write the expected result precisely, e.g. the exact message, so anyone could run the test.</li>
<li>Take screenshots as evidence of the actual results.</li>
<li>When a test fails, record the fix you made and run the test again.</li>
</ul>
<div class="key"><strong>Test data</strong> values chosen to check a program works correctly: normal, boundary (extreme) and erroneous.</div>`
      },

      // ------------------------------------------------------------------ quiz
      {
        id: "m10-quiz",
        title: "Checkpoint: validation and errors",
        type: "quiz",
        questions: [
          { q: "A form rejects a postcode unless it matches a pattern like <code>BT74 6AB</code>. Which validation check is this?",
            options: ["Range check", "Format check", "Presence check", "Lookup check"],
            answer: 1, explain: "A format check makes sure data follows a set pattern." },
          { q: "Which check makes sure a year group is one of 8, 9, 10, 11 or 12?",
            options: ["Length check", "Type check", "Lookup check", "Presence check"],
            answer: 2, explain: "A lookup check compares the input with a list of allowed values." },
          { q: "What does <code>int.TryParse(\"ten\", out n)</code> do?",
            options: ["Crashes with a FormatException", "Returns false and sets n to 0", "Returns true and sets n to 10", "Returns \"ten\""],
            answer: 1, explain: "TryParse never crashes. It returns false when the text isn't a whole number." },
          { q: "A program compiles and runs, but calculates the wrong average. What kind of error is this?",
            options: ["Syntax error", "Run-time error", "Logic error", "Exception error"],
            answer: 2, explain: "Logic errors give wrong results without any error message." },
          { q: "Which exception is thrown by <code>int[] a = new int[3]; a[3] = 1;</code>?",
            options: ["FormatException", "DivideByZeroException", "IndexOutOfRangeException", "NullReferenceException"],
            answer: 2, explain: "The indexes are 0, 1 and 2, so index 3 is outside the bounds of the array." },
          { q: "When does a <code>finally</code> block run?",
            options: ["Only if an exception was caught", "Only if no exception happened", "Always, after the try (and any catch)", "Only when the program ends"],
            answer: 2, explain: "finally always runs, which makes it ideal for tidying up." },
          { q: "An input must be from 1 to 100. Which set is <strong>boundary</strong> test data?",
            options: ["50 and 75", "1, 100, 0 and 101", "\"abc\" and blank", "-500 and 5000"],
            answer: 1, explain: "Boundary data sits on the edges of the valid range and just outside it." },
          { q: "Typing a new password twice to make sure it matches is an example of…",
            options: ["Validation", "Verification", "Encryption", "A range check"],
            answer: 1, explain: "Double entry is verification: checking data was entered accurately." }
        ]
      }
    ]
  });
})();
