// Module 6: Iteration
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
  const lines = (out) => out.split("\n").map(s => s.trim()).filter(Boolean);
  const count = (s, sub) => s.split(sub).length - 1;

  COURSE.addModule({
    id: "m06",
    title: "Iteration",
    icon: "repeat",
    summary: "Make your programs repeat with for, while and do-while loops.",
    lessons: [
      // ---------------------------------------------------------------- l1
      {
        id: "m06-l1",
        title: "Counting with for loops",
        type: "code",
        learn: `
<p>Imagine printing the numbers 1 to 100 with 100 separate <code>WriteLine</code> lines. No thanks! <strong>Iteration</strong> means repeating code, and a <code>for</code> loop is perfect when you know <em>how many times</em> to repeat.</p>
<div class="key"><strong>Count-controlled loop</strong> a loop that repeats a set number of times, such as a <code>for</code> loop.</div>
<pre><code class="cs">for (int i = 1; i <= 5; i++)
{
    Console.WriteLine("Lap " + i);
}</code></pre>
<p>The brackets have three parts, separated by semicolons:</p>
<ol>
<li><strong>Start</strong>: <code>int i = 1</code> creates the loop counter.</li>
<li><strong>Condition</strong>: <code>i &lt;= 5</code> is checked before every lap. When it's false, the loop stops.</li>
<li><strong>Step</strong>: <code>i++</code> runs after every lap (adds 1).</li>
</ol>
<p>This prints <code>Lap 1</code> to <code>Lap 5</code>.</p>
<h3>Counting down and in steps</h3>
<pre><code class="cs">for (int i = 3; i >= 1; i--)      // 3, 2, 1
{
    Console.WriteLine(i);
}

for (int i = 0; i <= 100; i += 25)  // 0, 25, 50, 75, 100
{
    Console.WriteLine(i);
}</code></pre>
<div class="warn">If the condition never becomes false, you get an <strong>infinite loop</strong>. For example <code>for (int i = 1; i &gt; 0; i++)</code> never stops. Press Stop if that happens!</div>`,
        instructions: [
          "Use a <code>for</code> loop to count down from 10 to 1, printing each number on its own line.",
          "After the loop print <code>Blast off!</code>",
          "Then use a second <code>for</code> loop to print the even numbers from 2 to 20 (2, 4, 6 … 20), each on its own line, using a step of 2."
        ],
        starter: prog(`
// TODO: for loop counting down from 10 to 1

Console.WriteLine("Blast off!");

// TODO: for loop printing 2, 4, 6 ... 20`),
        solution: prog(`
for (int i = 10; i >= 1; i--)
{
    Console.WriteLine(i);
}

Console.WriteLine("Blast off!");

for (int i = 2; i <= 20; i += 2)
{
    Console.WriteLine(i);
}`),
        tests: [
          { type: "fn", fn: (out) => lines(out).slice(0, 11).join(",") === "10,9,8,7,6,5,4,3,2,1,Blast off!", msg: "Print 10 down to 1 (one per line), then Blast off!" },
          { type: "fn", fn: (out) => { const l = lines(out); const i = l.indexOf("Blast off!"); return i >= 0 && l.slice(i + 1).join(",") === "2,4,6,8,10,12,14,16,18,20"; }, msg: "After Blast off!, print 2, 4, 6 … 20, one per line." },
          { type: "code", pattern: "for\\s*\\([\\s\\S]*for\\s*\\(", msg: "Use two for loops." },
          { type: "code", pattern: "--|-=\\s*1", msg: "Count down using i-- in the first loop." },
          { type: "code", pattern: "\\+=\\s*2", msg: "Use a step of 2 (i += 2) in the second loop." }
        ],
        hint: "Count down: for (int i = 10; i >= 1; i--). Evens: for (int i = 2; i <= 20; i += 2)."
      },

      // ---------------------------------------------------------------- l2
      {
        id: "m06-l2",
        title: "Times tables",
        type: "code",
        learn: `
<p>The loop counter is just a variable, so you can use it in calculations. That makes times tables a perfect job for a <code>for</code> loop.</p>
<pre><code class="cs">int n = 7;
for (int i = 1; i <= 3; i++)
{
    Console.WriteLine($"{i} x {n} = {i * n}");
}</code></pre>
<p>Output:</p>
<pre><code>1 x 7 = 7
2 x 7 = 14
3 x 7 = 21</code></pre>
<p>You can also make the <strong>end</strong> of the loop come from the user. Then the same program works for any table and any length:</p>
<pre><code class="cs">Console.Write("How many rows? ");
int rows = Convert.ToInt32(Console.ReadLine());
for (int i = 1; i <= rows; i++)
{
    // ...
}</code></pre>
<div class="tip">String interpolation <code>$"..."</code> lets you drop calculations straight into the text with curly brackets: <code>{i * n}</code>.</div>
<p>Why is this better than writing twelve <code>WriteLine</code> lines? If Niamh asks for the 13 times table, or wants it to go up to 20, you only change <em>one</em> number. The loop does the repetitive work, and you can be sure every line follows exactly the same pattern, so there are no typos on line 9 that you missed.</p>`,
        instructions: [
          "Ask <code>Which times table? </code> and read a whole number <code>n</code>.",
          "Use a <code>for</code> loop to print the table from 1 to 12 in the format <code>1 x 6 = 6</code> (one line each).",
          "After the loop, print <code>Well done, you know your 6 times table!</code> (using the number entered)."
        ],
        starter: prog(`
Console.Write("Which times table? ");
int n = Convert.ToInt32(Console.ReadLine());

// TODO: for loop from 1 to 12, printing e.g. 3 x 6 = 18

// TODO: print the Well done message`),
        solution: prog(`
Console.Write("Which times table? ");
int n = Convert.ToInt32(Console.ReadLine());

for (int i = 1; i <= 12; i++)
{
    Console.WriteLine($"{i} x {n} = {i * n}");
}

Console.WriteLine($"Well done, you know your {n} times table!");`),
        stdin: ["6"],
        tests: [
          { type: "output", stdin: ["6"], includes: "1 x 6 = 6", msg: "The first line for 6 should be 1 x 6 = 6" },
          { type: "output", stdin: ["6"], includes: "12 x 6 = 72", msg: "The last line for 6 should be 12 x 6 = 72" },
          { type: "fn", stdin: ["9"], fn: (out) => { for (let i = 1; i <= 12; i++) if (!out.includes(`${i} x 9 = ${i * 9}`)) return false; return !out.includes("13 x 9"); }, msg: "For 9, print all twelve lines from 1 x 9 = 9 to 12 x 9 = 108 (and no more)." },
          { type: "output", stdin: ["9"], includes: "Well done, you know your 9 times table!", msg: "Finish with Well done, you know your 9 times table!" },
          { type: "code", pattern: "for\\s*\\(", msg: "Use a for loop." }
        ],
        hint: "Inside the loop: Console.WriteLine($\"{i} x {n} = {i * n}\");"
      },

      // ---------------------------------------------------------------- l3
      {
        id: "m06-l3",
        title: "while loops and running totals",
        type: "code",
        learn: `
<p>Sometimes you <em>don't</em> know how many times to repeat. You keep going <strong>while</strong> something is true. That's a <code>while</code> loop.</p>
<div class="key"><strong>Condition-controlled loop</strong> a loop that repeats until a condition changes, such as <code>while</code> or <code>do-while</code>. It might run 0, 1 or 1000 times.</div>
<h3>Sentinel values</h3>
<p>A <strong>sentinel</strong> is a special "stop" value. Here, entering <code>-1</code> stops the loop:</p>
<pre><code class="cs">int total = 0;      // running total starts at 0
int count = 0;      // counter starts at 0

Console.Write("Enter a goal tally (-1 to stop): ");
int goals = Convert.ToInt32(Console.ReadLine());

while (goals != -1)
{
    total = total + goals;   // add to the running total
    count++;                 // count one more match
    Console.Write("Enter a goal tally (-1 to stop): ");
    goals = Convert.ToInt32(Console.ReadLine());
}

Console.WriteLine($"{count} matches, {total} goals");</code></pre>
<p>Notice the pattern: read <em>before</em> the loop, then read again at the <em>end</em> of the loop body. That way the sentinel is checked before it's added to the total.</p>
<div class="key"><strong>Running total</strong> a variable that starts at 0 and has each new value added to it inside a loop.</div>
<div class="key"><strong>Counter</strong> a variable that goes up by 1 each time something happens.</div>
<div class="tip">If the very first input is <code>-1</code>, a <code>while</code> loop's body never runs at all. That's fine: you get 0 matches, 0 goals.</div>`,
        instructions: [
          "The rugby team wants to total its points for the season. Repeatedly ask <code>Enter points scored (-1 to stop): </code>",
          "Keep a running total and a counter of matches. Stop when <code>-1</code> is entered (don't add it!).",
          "After the loop print <code>Matches: 3</code> and <code>Total points: 52</code> (with the real values)."
        ],
        starter: prog(`
int total = 0;
int matches = 0;

Console.Write("Enter points scored (-1 to stop): ");
int points = Convert.ToInt32(Console.ReadLine());

// TODO: while points is not -1
//     add points to total, add 1 to matches
//     ask again and read the next points

// TODO: print Matches: ... and Total points: ...`),
        solution: prog(`
int total = 0;
int matches = 0;

Console.Write("Enter points scored (-1 to stop): ");
int points = Convert.ToInt32(Console.ReadLine());

while (points != -1)
{
    total += points;
    matches++;
    Console.Write("Enter points scored (-1 to stop): ");
    points = Convert.ToInt32(Console.ReadLine());
}

Console.WriteLine($"Matches: {matches}");
Console.WriteLine($"Total points: {total}");`),
        stdin: ["24", "7", "21", "-1"],
        tests: [
          { type: "output", stdin: ["24", "7", "21", "-1"], includes: "Total points: 52", msg: "24 + 7 + 21 should give Total points: 52 (don't add the -1)." },
          { type: "output", stdin: ["24", "7", "21", "-1"], includes: "Matches: 3", msg: "Three scores entered should give Matches: 3" },
          { type: "fn", stdin: ["-1"], fn: (out) => out.includes("Matches: 0") && out.includes("Total points: 0"), msg: "If -1 is entered straight away, print Matches: 0 and Total points: 0" },
          { type: "fn", stdin: ["10", "0", "15", "33", "5", "-1"], fn: (out) => out.includes("Matches: 5") && out.includes("Total points: 63"), msg: "Should work for any number of matches (try 10, 0, 15, 33, 5)." },
          { type: "code", pattern: "while\\s*\\(", msg: "Use a while loop." }
        ],
        hint: "while (points != -1) { total += points; matches++; ...ask again... }"
      },

      // ---------------------------------------------------------------- l4
      {
        id: "m06-l4",
        title: "Validation with while",
        type: "code",
        learn: `
<p>Users type silly things. A <code>while</code> loop can keep asking until the input is sensible. This is called <strong>validation</strong>.</p>
<div class="key"><strong>Validation</strong> checking that input is reasonable (for example, in a range) before using it.</div>
<pre><code class="cs">Console.Write("How many tickets (1-6)? ");
int tickets = Convert.ToInt32(Console.ReadLine());

while (tickets &lt; 1 || tickets &gt; 6)
{
    Console.WriteLine("Sorry, you can buy 1 to 6 tickets.");
    Console.Write("How many tickets (1-6)? ");
    tickets = Convert.ToInt32(Console.ReadLine());
}

Console.WriteLine($"Booking {tickets} tickets.");</code></pre>
<p>The condition describes what's <em>wrong</em> with the input. While it's wrong, show a message and ask again. Once the loop finishes, you <strong>know</strong> the value is valid.</p>
<h3>Counting attempts</h3>
<p>You can add a counter to see how many tries it took:</p>
<pre><code class="cs">int attempts = 1;
// ... inside the loop:
attempts++;</code></pre>
<div class="tip">This range check uses <code>||</code>: the value is invalid if it's too small <strong>or</strong> too big.</div>
<p>This kind of check is called a <strong>range check</strong>. Other validation checks you may meet at GCSE include a <strong>presence check</strong> (was anything typed at all?), a <strong>length check</strong> (is a password at least 8 characters?) and a <strong>type check</strong> (is it really a number?).</p>`,
        instructions: [
          "Ask <code>Rate the school dinner (1-5): </code> and read a whole number.",
          "While the rating is less than 1 or greater than 5, print <code>Please enter a number from 1 to 5.</code> and ask again.",
          "When valid, print <code>Thanks! You rated it 4 out of 5.</code> (with the real rating)."
        ],
        starter: prog(`
Console.Write("Rate the school dinner (1-5): ");
int rating = Convert.ToInt32(Console.ReadLine());

// TODO: while the rating is out of range, show the error and ask again

// TODO: print the thank-you message`),
        solution: prog(`
Console.Write("Rate the school dinner (1-5): ");
int rating = Convert.ToInt32(Console.ReadLine());

while (rating < 1 || rating > 5)
{
    Console.WriteLine("Please enter a number from 1 to 5.");
    Console.Write("Rate the school dinner (1-5): ");
    rating = Convert.ToInt32(Console.ReadLine());
}

Console.WriteLine($"Thanks! You rated it {rating} out of 5.");`),
        stdin: ["4"],
        tests: [
          { type: "fn", stdin: ["4"], fn: (out) => out.includes("Thanks! You rated it 4 out of 5.") && !out.includes("Please enter"), msg: "A valid rating of 4 should be accepted straight away." },
          { type: "fn", stdin: ["9", "0", "-3", "2"], fn: (out) => count(out, "Please enter a number from 1 to 5.") === 3 && out.includes("You rated it 2 out of 5."), msg: "For 9, 0, -3, 2: show the error three times, then accept 2." },
          { type: "output", stdin: ["6", "5"], includes: "You rated it 5 out of 5.", msg: "5 is valid (it's the top of the range)." },
          { type: "code", pattern: "while\\s*\\(", msg: "Use a while loop to re-ask." }
        ],
        hint: "while (rating < 1 || rating > 5) { print the error; ask again; read again }"
      },

      // ---------------------------------------------------------------- l5
      {
        id: "m06-l5",
        title: "do-while: menus and play again",
        type: "code",
        learn: `
<p>A <code>do-while</code> loop checks its condition at the <strong>end</strong>, so the body always runs <strong>at least once</strong>. That's exactly what you want for a menu: show it first, then decide whether to show it again.</p>
<pre><code class="cs">string again;
do
{
    Console.WriteLine("Rolling the dice...");
    Console.Write("Play again? (y/n) ");
    again = Console.ReadLine();
} while (again == "y");

Console.WriteLine("Thanks for playing!");</code></pre>
<div class="warn">Notice the semicolon after <code>while (again == "y");</code> in a do-while. A normal <code>while</code> loop does <em>not</em> have one.</div>
<h3>A menu loop</h3>
<pre><code class="cs">int choice;
do
{
    Console.WriteLine("1. Say hello");
    Console.WriteLine("2. Quit");
    Console.Write("Choice: ");
    choice = Convert.ToInt32(Console.ReadLine());

    switch (choice)
    {
        case 1:
            Console.WriteLine("Hello!");
            break;
        case 2:
            Console.WriteLine("Bye!");
            break;
        default:
            Console.WriteLine("Invalid choice");
            break;
    }
} while (choice != 2);</code></pre>
<p>Menus like this are everywhere: cash machines, game pause screens and school canteen tills all show options, act on the choice, then show the options again until you pick "Quit".</p>
<div class="tip">Declare the variable used in the condition <em>before</em> the <code>do</code>. A variable declared inside the curly brackets can't be seen by the <code>while</code> at the end.</div>`,
        instructions: [
          "Build a pet shop menu with a <code>do-while</code> loop. Each time round, print <code>1. Feed the cat</code>, <code>2. Walk the dog</code>, <code>3. Quit</code> then ask <code>Choice: </code>",
          "Choice 1 prints <code>The cat purrs happily.</code>, choice 2 prints <code>The dog wags its tail.</code>, choice 3 prints <code>Goodbye!</code>, anything else prints <code>Invalid choice</code>.",
          "Keep looping until the user chooses 3."
        ],
        starter: prog(`
int choice;

// TODO: do
// {
//     print the three menu lines and ask Choice:
//     read choice
//     use if/else if or switch to respond
// } while (...);`),
        solution: prog(`
int choice;

do
{
    Console.WriteLine("1. Feed the cat");
    Console.WriteLine("2. Walk the dog");
    Console.WriteLine("3. Quit");
    Console.Write("Choice: ");
    choice = Convert.ToInt32(Console.ReadLine());

    switch (choice)
    {
        case 1:
            Console.WriteLine("The cat purrs happily.");
            break;
        case 2:
            Console.WriteLine("The dog wags its tail.");
            break;
        case 3:
            Console.WriteLine("Goodbye!");
            break;
        default:
            Console.WriteLine("Invalid choice");
            break;
    }
} while (choice != 3);`),
        stdin: ["1", "2", "3"],
        tests: [
          { type: "fn", stdin: ["3"], fn: (out) => out.includes("1. Feed the cat") && out.includes("Goodbye!") && count(out, "3. Quit") === 1, msg: "Choosing 3 straight away should show the menu once and print Goodbye!" },
          { type: "fn", stdin: ["1", "2", "3"], fn: (out) => out.includes("The cat purrs happily.") && out.includes("The dog wags its tail.") && count(out, "3. Quit") === 3, msg: "For 1, 2, 3: respond to each choice and show the menu three times." },
          { type: "fn", stdin: ["7", "1", "1", "3"], fn: (out) => out.includes("Invalid choice") && count(out, "The cat purrs happily.") === 2 && count(out, "1. Feed the cat") === 4, msg: "For 7, 1, 1, 3: print Invalid choice, the cat message twice, and show the menu four times." },
          { type: "code", pattern: "do\\s*\\{[\\s\\S]*\\}\\s*while\\s*\\(", msg: "Use a do-while loop." }
        ],
        hint: "do { ...menu...; choice = Convert.ToInt32(Console.ReadLine()); ...switch... } while (choice != 3);"
      },

      // ---------------------------------------------------------------- l6
      {
        id: "m06-l6",
        title: "break and continue",
        type: "code",
        learn: `
<p>Two keywords give you extra control inside any loop:</p>
<ul>
<li><code>break</code> jumps <strong>out</strong> of the loop straight away.</li>
<li><code>continue</code> skips the rest of <strong>this</strong> lap and goes on to the next one.</li>
</ul>
<pre><code class="cs">for (int i = 1; i <= 10; i++)
{
    if (i == 4)
    {
        continue;     // skip 4
    }
    if (i == 7)
    {
        break;        // stop completely at 7
    }
    Console.WriteLine(i);
}
// prints 1 2 3 5 6</code></pre>
<h3>Loops that stop with break</h3>
<p><code>while (true)</code> would loop forever, but a <code>break</code> inside gives it a way out. This is handy when the "stop" check happens in the middle of the loop:</p>
<pre><code class="cs">while (true)
{
    Console.Write("Item (or done): ");
    string item = Console.ReadLine();
    if (item == "done")
    {
        break;
    }
    Console.WriteLine("Added " + item);
}</code></pre>
<p>Use <code>break</code> and <code>continue</code> sparingly. A loop with lots of them can be hard to follow, because you have to hunt through the body to work out when it stops. A clear loop condition is usually better, but for "read until done" input, <code>while (true)</code> with <code>break</code> is a common and tidy pattern.</p>
<div class="tip">Check for the word <code>done</code> <em>before</em> converting to a number. Converting <code>"done"</code> to a double would crash with a <code>FormatException</code>.</div>`,
        instructions: [
          "Build a canteen till. In a <code>while (true)</code> loop, ask <code>Enter price (or done): </code> and read the text.",
          "If the text is <code>done</code>, <code>break</code> out of the loop.",
          "Convert it to a <code>double</code>. If the price is 0 or less, print <code>Ignored</code> and <code>continue</code>. Otherwise add it to a running total.",
          "After the loop print the total like <code>Total: £3.70</code> (two decimal places)."
        ],
        starter: prog(`
double total = 0;

// TODO: while (true)
// {
//     ask Enter price (or done): and read the text
//     if it's "done", break
//     convert to double
//     if price <= 0, print Ignored and continue
//     add price to total
// }

Console.WriteLine($"Total: £{total:F2}");`),
        solution: prog(`
double total = 0;

while (true)
{
    Console.Write("Enter price (or done): ");
    string text = Console.ReadLine();
    if (text == "done")
    {
        break;
    }
    double price = Convert.ToDouble(text);
    if (price <= 0)
    {
        Console.WriteLine("Ignored");
        continue;
    }
    total += price;
}

Console.WriteLine($"Total: £{total:F2}");`),
        stdin: ["2.50", "1.20", "done"],
        tests: [
          { type: "output", stdin: ["2.50", "1.20", "done"], includes: "Total: £3.70", msg: "2.50 + 1.20 should give Total: £3.70" },
          { type: "fn", stdin: ["1.50", "0", "-2", "0.85", "done"], fn: (out) => count(out, "Ignored") === 2 && out.includes("Total: £2.35"), msg: "For 1.50, 0, -2, 0.85: print Ignored twice and Total: £2.35" },
          { type: "output", stdin: ["done"], includes: "Total: £0.00", msg: "Entering done straight away should give Total: £0.00" },
          { type: "code", pattern: "\\bbreak\\s*;", msg: "Use break to leave the loop." },
          { type: "code", pattern: "\\bcontinue\\s*;", msg: "Use continue to skip invalid prices." }
        ],
        hint: "if (text == \"done\") { break; }  ...  if (price <= 0) { Console.WriteLine(\"Ignored\"); continue; }"
      },

      // ---------------------------------------------------------------- l7
      {
        id: "m06-l7",
        title: "Nested loops: patterns and grids",
        type: "code",
        learn: `
<p>A loop inside another loop is a <strong>nested loop</strong>. For every lap of the outer loop, the inner loop runs <em>all</em> of its laps. They're brilliant for anything with rows and columns.</p>
<pre><code class="cs">for (int row = 1; row <= 3; row++)
{
    for (int col = 1; col <= 5; col++)
    {
        Console.Write("#");      // Write: stay on the same line
    }
    Console.WriteLine();         // end the row
}</code></pre>
<pre><code>#####
#####
#####</code></pre>
<p>The outer loop runs 3 times and the inner loop runs 5 times each time, so <code>#</code> is printed 3 × 5 = 15 times.</p>
<h3>Triangles</h3>
<p>Make the inner loop depend on the outer counter and the rows get longer:</p>
<pre><code class="cs">for (int row = 1; row <= 4; row++)
{
    for (int col = 1; col <= row; col++)
    {
        Console.Write("*");
    }
    Console.WriteLine();
}</code></pre>
<pre><code>*
**
***
****</code></pre>
<div class="tip">Use <code>Console.Write</code> inside the inner loop and <code>Console.WriteLine()</code> after it, in the outer loop.</div>
<p>A good way to understand a nested loop is a <strong>trace table</strong>: write down the values of <code>row</code> and <code>col</code> each time the inner body runs. For the triangle above you'd see (1,1), then (2,1), (2,2), then (3,1), (3,2), (3,3) and so on. Nested loops are also used for grids in games, seating plans and, in the next module, 2D arrays.</p>`,
        instructions: [
          "Ask <code>Rows: </code> and <code>Columns: </code> and read two whole numbers.",
          "Use nested loops to print a rectangle of <code>*</code> with that many rows and columns (no spaces).",
          "Then print a line saying <code>Triangle:</code> and use nested loops to print a triangle with the same number of rows: 1 <code>*</code> on the first row, 2 on the second, and so on."
        ],
        starter: prog(`
Console.Write("Rows: ");
int rows = Convert.ToInt32(Console.ReadLine());
Console.Write("Columns: ");
int cols = Convert.ToInt32(Console.ReadLine());

// TODO: nested loops for the rectangle

Console.WriteLine("Triangle:");

// TODO: nested loops for the triangle (inner loop goes up to row)`),
        solution: prog(`
Console.Write("Rows: ");
int rows = Convert.ToInt32(Console.ReadLine());
Console.Write("Columns: ");
int cols = Convert.ToInt32(Console.ReadLine());

for (int r = 1; r <= rows; r++)
{
    for (int c = 1; c <= cols; c++)
    {
        Console.Write("*");
    }
    Console.WriteLine();
}

Console.WriteLine("Triangle:");

for (int r = 1; r <= rows; r++)
{
    for (int c = 1; c <= r; c++)
    {
        Console.Write("*");
    }
    Console.WriteLine();
}`),
        stdin: ["3", "4"],
        tests: [
          { type: "fn", stdin: ["3", "4"], fn: (out) => { const p = out.split("Triangle:"); return p.length === 2 && (p[0].match(/\*+/g) || []).join(",") === "****,****,****" && (p[0].match(/\n/g) || []).length >= 3; }, msg: "With 3 rows and 4 columns, print three lines of ****" },
          { type: "fn", stdin: ["3", "4"], fn: (out) => { const p = out.split("Triangle:"); return p.length === 2 && p[1].split("\n").map(s => s.trim()).filter(Boolean).join(",") === "*,**,***"; }, msg: "After Triangle:, print *, ** and *** on three lines." },
          { type: "fn", stdin: ["2", "6"], fn: (out) => { const p = out.split("Triangle:"); return p.length === 2 && (p[0].match(/\*+/g) || []).join(",") === "******,******" && lines(p[1]).join(",") === "*,**"; }, msg: "It should work for other sizes too (try 2 rows and 6 columns)." },
          { type: "code", pattern: "for\\s*\\([^)]*\\)\\s*\\{?\\s*for\\s*\\(", msg: "Use a nested loop (a for loop directly inside another)." }
        ],
        hint: "Outer loop: rows. Inner loop: Console.Write(\"*\"). After the inner loop: Console.WriteLine(). For the triangle the inner condition is c <= r."
      },

      // ---------------------------------------------------------------- l8
      {
        id: "m06-l8",
        title: "Project: guess the number",
        type: "code",
        learn: `
<p>Let's build a classic game! The computer picks a secret number from 1 to 20 and the player keeps guessing until they get it.</p>
<pre><code class="cs">Random rng = new Random();
int secret = rng.Next(1, 21);   // 1 to 20 (the top number is NOT included)</code></pre>
<h3>Plan</h3>
<ol>
<li>Pick the secret number and set <code>guesses = 0</code>.</li>
<li>Loop (a <code>do-while</code> works well, because you always need at least one guess):
  <ul>
  <li>Ask for a guess and add 1 to <code>guesses</code>.</li>
  <li>If the guess is too big, print <code>Too high!</code></li>
  <li>If it's too small, print <code>Too low!</code></li>
  </ul></li>
<li>Repeat <code>while (guess != secret)</code>.</li>
<li>Print a congratulations message with the number of guesses.</li>
</ol>
<div class="tip">While you're testing, it's fine to print the secret number at the start so you can check the logic. Just remember to remove it before Ben plays!</div>
<div class="warn">The checker can't know your random number, so it plays the game by guessing 1, 2, 3 … 20 in order. Your game must keep asking until the right guess. The message must state exactly how many guesses it took.</div>`,
        instructions: [
          "Use <code>new Random()</code> and <code>Next(1, 21)</code> to pick a secret number from 1 to 20.",
          "Repeatedly ask <code>Guess: </code>, counting guesses. Print <code>Too high!</code> or <code>Too low!</code> for wrong guesses.",
          "When the guess is right, stop looping and print <code>Correct! You took 5 guesses.</code> (with the real count)."
        ],
        starter: prog(`
Random rng = new Random();
int secret = rng.Next(1, 21);
int guesses = 0;
int guess;

// TODO: do
// {
//     ask Guess: and read guess
//     add 1 to guesses
//     print Too high! or Too low! if wrong
// } while (guess != secret);

// TODO: print Correct! You took ... guesses.`),
        solution: prog(`
Random rng = new Random();
int secret = rng.Next(1, 21);
int guesses = 0;
int guess;

do
{
    Console.Write("Guess: ");
    guess = Convert.ToInt32(Console.ReadLine());
    guesses++;

    if (guess > secret)
    {
        Console.WriteLine("Too high!");
    }
    else if (guess < secret)
    {
        Console.WriteLine("Too low!");
    }
} while (guess != secret);

Console.WriteLine($"Correct! You took {guesses} guesses.");`),
        stdin: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"],
        tests: [
          { type: "output", includes: "Correct! You took", msg: "Print Correct! You took ... guesses. when the guess is right." },
          { type: "fn", fn: (out) => { const m = out.match(/Correct! You took (\d+) guesses\./); return !!m && Number(m[1]) === count(out, "Too low!") + 1; }, msg: "Guessing 1, 2, 3 … the count of guesses should be one more than the number of Too low! messages." },
          { type: "fn", fn: (out) => !out.includes("Too high!") && count(out, "Correct!") === 1, msg: "Guessing upwards from 1 should never say Too high!, and Correct! should appear once." },
          { type: "fn", stdin: ["20", "19", "18", "17", "16", "15", "14", "13", "12", "11", "10", "9", "8", "7", "6", "5", "4", "3", "2", "1"], fn: (out) => { const m = out.match(/Correct! You took (\d+) guesses\./); return !!m && Number(m[1]) === count(out, "Too high!") + 1 && !out.includes("Too low!"); }, msg: "Guessing downwards from 20 should only say Too high! until it's correct." },
          { type: "code", pattern: "new\\s+Random\\s*\\(\\s*\\)", msg: "Use new Random() to pick the secret number." },
          { type: "code", pattern: "\\.Next\\s*\\(\\s*1\\s*,\\s*21\\s*\\)", msg: "Use Next(1, 21) to get a number from 1 to 20." }
        ],
        hint: "Inside the loop: if (guess > secret) Too high!, else if (guess < secret) Too low!. The loop condition is guess != secret."
      },

      // ---------------------------------------------------------------- quiz
      {
        id: "m06-quiz",
        title: "Checkpoint: iteration",
        type: "quiz",
        questions: [
          { q: "Which type of loop is <strong>count-controlled</strong>?",
            options: ["for", "while", "do-while", "if"],
            answer: 0, explain: "A for loop repeats a set number of times using a counter. while and do-while are condition-controlled; if isn't a loop." },
          { q: "How many times does this print <code>Hi</code>?", code: "for (int i = 0; i < 4; i++)\n{\n    Console.WriteLine(\"Hi\");\n}",
            options: ["3", "4", "5", "Forever"],
            answer: 1, explain: "i takes the values 0, 1, 2, 3: that's 4 laps. When i becomes 4 the condition i < 4 is false." },
          { q: "Which loop always runs its body <strong>at least once</strong>?",
            options: ["for", "while", "do-while", "None of them"],
            answer: 2, explain: "A do-while checks its condition at the end, after the body has run." },
          { q: "What does <code>continue</code> do inside a loop?",
            options: ["Ends the program", "Leaves the loop completely", "Skips to the next lap of the loop", "Restarts the loop from the first lap"],
            answer: 2, explain: "continue skips the rest of the current lap. break is the one that leaves the loop." },
          { q: "In a sentinel loop, what is the <strong>sentinel</strong>?",
            options: ["The loop counter", "A special value that means stop", "The running total", "The first value entered"],
            answer: 1, explain: "A sentinel (like -1 or \"done\") is a value that signals the end of the input." },
          { q: "An outer loop runs 4 times and the inner loop runs 6 times each time. How many times does the inner body run in total?",
            options: ["10", "6", "24", "46"],
            answer: 2, explain: "For each of the 4 outer laps the inner loop runs 6 times: 4 × 6 = 24." },
          { q: "What is the final value of <code>total</code>?", code: "int total = 0;\nfor (int i = 1; i <= 4; i++)\n{\n    total += i;\n}",
            options: ["4", "10", "5", "0"],
            answer: 1, explain: "It's a running total: 1 + 2 + 3 + 4 = 10." },
          { q: "Sorcha's loop is <code>while (lives &gt; 0)</code> but nothing in the loop ever changes <code>lives</code>. What happens?",
            options: ["It runs once", "It never runs", "It's an infinite loop (if lives starts above 0)", "A compile error"],
            answer: 2, explain: "If the condition can never become false, the loop never ends: an infinite loop." }
        ]
      }
    ]
  });
})();
