// Module 1: Output and comments
(function () {
const cs = String.raw;

COURSE.addModule({
  id: "m01",
  title: "Output and comments",
  icon: "print",
  summary: "Control exactly what appears on screen with Write, WriteLine and escape sequences, and explain your code with comments.",
  lessons: [
    {
      id: "m01-l1",
      title: "WriteLine vs Write",
      type: "code",
      learn: cs`<p>You have already used <code>Console.WriteLine</code>. It has a little sister: <code>Console.Write</code>.</p>
<ul>
<li><code>Console.WriteLine("...")</code> prints the text and then moves the cursor to a <strong>new line</strong>.</li>
<li><code>Console.Write("...")</code> prints the text and <strong>stays on the same line</strong>, so whatever is printed next carries on straight after it.</li>
</ul>
<pre><code class="cs">Console.Write("Fish ");
Console.Write("and ");
Console.WriteLine("chips");
Console.WriteLine("Mushy peas");</code></pre>
<p>Output:</p>
<pre><code>Fish and chips
Mushy peas</code></pre>
<p>Notice the spaces <em>inside</em> the quotes after <code>Fish</code> and <code>and</code>. Without them you'd get <code>Fishandchips</code>. The computer only prints what you tell it to, including spaces.</p>
<h3>Blank lines</h3>
<p>Calling <code>WriteLine</code> with nothing in the brackets prints an empty line. It's handy for spacing out your output so it's easier to read:</p>
<pre><code class="cs">Console.WriteLine("Menu");
Console.WriteLine();
Console.WriteLine("1. Pizza");</code></pre>
<pre><code>Menu

1. Pizza</code></pre>
<div class="tip"><code>Write</code> is really useful later on when you ask the user a question: the cursor waits on the same line as the question, just like a real form.</div>`,
      instructions: [
        "Use <code>Console.Write</code> three times to build up the single line <code>Today's lunch is pizza</code> (for example <code>Today's </code>, <code>lunch is </code>, <code>pizza</code>).",
        "Then use <code>Console.WriteLine()</code> to end that line and print a blank line.",
        "Finally print <code>Enjoy your meal!</code> with <code>Console.WriteLine</code>."
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        // TODO: use Console.Write three times to print Today's lunch is pizza

        // TODO: end the line and print a blank line

        // TODO: print Enjoy your meal!

    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        Console.Write("Today's ");
        Console.Write("lunch is ");
        Console.Write("pizza");
        Console.WriteLine();
        Console.WriteLine();
        Console.WriteLine("Enjoy your meal!");
    }
}`,
      tests: [
        { type: "output", includes: "Today's lunch is pizza", msg: "Print Today's lunch is pizza all on one line (watch the spaces)." },
        { type: "fn", fn: (out, code) => (code.match(/Console\.Write\s*\(/g) || []).length >= 3, msg: "Use Console.Write at least three times." },
        { type: "outputRegex", pattern: "pizza\\r?\\n\\s*\\r?\\nEnjoy your meal!", msg: "Leave one blank line between the lunch line and Enjoy your meal!" },
        { type: "output", includes: "Enjoy your meal!", msg: "Print Enjoy your meal!" }
      ],
      hint: "Console.Write(\"Today's \"); keeps the cursor on the same line. Two Console.WriteLine(); calls in a row end the line and then add a blank one."
    },
    {
      id: "m01-l2",
      title: "Escape sequences",
      type: "code",
      learn: cs`<p>What if you want to print a double quote? This won't work, because C# thinks the string ends at the second <code>"</code>:</p>
<pre><code class="cs">Console.WriteLine("Niamh said "hi"");   // ✗ syntax error</code></pre>
<p>The fix is an <strong>escape sequence</strong>: a backslash <code>\</code> followed by a character, which together mean something special.</p>
<table>
<tr><th>Escape</th><th>Prints</th></tr>
<tr><td><code>\n</code></td><td>a new line</td></tr>
<tr><td><code>\t</code></td><td>a tab (jumps to the next column, great for lining things up)</td></tr>
<tr><td><code>\"</code></td><td>a double quote</td></tr>
<tr><td><code>\\</code></td><td>a single backslash</td></tr>
</table>
<pre><code class="cs">Console.WriteLine("Niamh said \"hi\"");
Console.WriteLine("Line one\nLine two");
Console.WriteLine("Name\tScore");
Console.WriteLine("Ben\t12");
Console.WriteLine("Saved in C:\\Homework");</code></pre>
<p>Output:</p>
<pre><code>Niamh said "hi"
Line one
Line two
Name    Score
Ben     12
Saved in C:\Homework</code></pre>
<p>Tabs make simple tables: each <code>\t</code> jumps along to the next tab stop, so short words line up in columns.</p>
<div class="tip">One <code>WriteLine</code> with <code>\n</code> inside can print several lines. That's neat, but separate <code>WriteLine</code> statements are often easier to read. Use whichever makes your code clearer.</div>`,
      instructions: [
        "Print <code>The coach shouted \"Go for it!\"</code> (with the double quotes showing) using <code>\\\"</code>.",
        "Using a <strong>single</strong> <code>Console.WriteLine</code> with <code>\\n</code> inside it, print <code>Ready</code> and <code>Set</code> on two separate lines.",
        "Print <code>Player</code>, a tab, then <code>Tries</code> using <code>\\t</code>.",
        "Print <code>Files are in C:\\Rugby</code> (with one backslash showing)."
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        // TODO 1: The coach shouted "Go for it!"

        // TODO 2: Ready and Set on two lines, using \n in ONE WriteLine

        // TODO 3: Player<tab>Tries

        // TODO 4: Files are in C:\Rugby

    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("The coach shouted \"Go for it!\"");
        Console.WriteLine("Ready\nSet");
        Console.WriteLine("Player\tTries");
        Console.WriteLine("Files are in C:\\Rugby");
    }
}`,
      tests: [
        { type: "output", includes: "The coach shouted \"Go for it!\"", msg: "Print The coach shouted \"Go for it!\" with the quotes showing." },
        { type: "code", pattern: "\\\\n", msg: "Use \\n inside a string to make a new line." },
        { type: "outputRegex", pattern: "Ready\\r?\\nSet", msg: "Print Ready and Set on two separate lines." },
        { type: "output", includes: "Player\tTries", msg: "Print Player, a tab (\\t), then Tries." },
        { type: "output", includes: "Files are in C:\\Rugby", msg: "Print Files are in C:\\Rugby using \\\\ for the backslash." }
      ],
      hint: "Inside a string: \\\" makes a quote, \\n a new line, \\t a tab and \\\\ a single backslash."
    },
    {
      id: "m01-l3",
      title: "Comments",
      type: "code",
      learn: cs`<p>A <strong>comment</strong> is a note for humans. The computer completely ignores it. Good comments explain <em>why</em> code does something, which helps your teacher, your classmates and future you (who will have forgotten!).</p>
<h3>Single-line comments</h3>
<p>Two forward slashes <code>//</code> turn the rest of the line into a comment:</p>
<pre><code class="cs">// Print the welcome screen for the cinema app
Console.WriteLine("Welcome to the cinema!");   // shown first</code></pre>
<h3>Multi-line comments</h3>
<p>For longer notes, start with <code>/*</code> and finish with <code>*/</code>. Everything in between is ignored, however many lines it covers:</p>
<pre><code class="cs">/*
   Program: Cinema tickets
   Author:  Oisín
   Date:    September
*/</code></pre>
<h3>Commenting out code</h3>
<p>Comments are also a handy way to switch off a line without deleting it. This is called "commenting out" and it's great when you're testing:</p>
<pre><code class="cs">Console.WriteLine("Film starts at 7pm");
// Console.WriteLine("Film cancelled");   // switched off for now</code></pre>
<div class="tip">In your GCSE programming tasks, commenting your code is part of good practice. A header comment with the program's purpose, plus short comments on tricky bits, is a great habit.</div>
<div class="warn">Don't comment the obvious (<code>// print hello</code> above a line that prints hello). Explain the purpose instead.</div>`,
      instructions: [
        "Add a multi-line comment <code>/* ... */</code> at the top of <code>Main</code> describing what the program does.",
        "Add at least one <code>//</code> comment.",
        "The starter prints a line saying <code>Tickets sold out</code>. It's wrong! <strong>Comment it out</strong> so it no longer prints, but leave it in the code.",
        "Make sure the program still prints <code>Tickets available: book now!</code>"
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        // TODO: add a /* multi-line */ comment here describing the program

        Console.WriteLine("Cinema booking system");
        Console.WriteLine("Tickets sold out");
        Console.WriteLine("Tickets available: book now!");
    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        /*
           Cinema booking system
           Shows whether tickets are available
        */
        Console.WriteLine("Cinema booking system");
        // Console.WriteLine("Tickets sold out");   // wrong message, switched off
        Console.WriteLine("Tickets available: book now!");
    }
}`,
      tests: [
        { type: "fn", fn: (out) => !/sold out/i.test(out), msg: "Comment out the line that prints Tickets sold out (put // in front of it)." },
        { type: "codeRaw", pattern: "/\\*[\\s\\S]*?\\*/", msg: "Add a multi-line comment between /* and */." },
        { type: "output", includes: "Cinema booking system", msg: "Still print Cinema booking system" },
        { type: "output", includes: "Tickets available: book now!", msg: "Still print Tickets available: book now!" }
      ],
      hint: "Put // at the very start of the Tickets sold out line. A multi-line comment starts with /* and ends with */."
    },
    {
      id: "m01-l4",
      title: "A neat banner",
      type: "code",
      learn: cs`<p>Programs look far more professional when the output is laid out neatly. A <strong>banner</strong> is a heading made from symbols, perfect for the title screen of a game or app.</p>
<pre><code class="cs">Console.WriteLine("****************************");
Console.WriteLine("*   ENNISKILLEN WEATHER    *");
Console.WriteLine("****************************");
Console.WriteLine();
Console.WriteLine("Today:\tRain");
Console.WriteLine("Tomorrow:\tMore rain");</code></pre>
<pre><code>****************************
*   ENNISKILLEN WEATHER    *
****************************

Today:  Rain
Tomorrow:       More rain</code></pre>
<p>Tips for neat output:</p>
<ul>
<li>Make the borders the same length as the middle line. Count the characters, or copy the line and edit it.</li>
<li>Use spaces inside the quotes to centre text.</li>
<li>Use <code>Console.WriteLine();</code> for breathing space between sections.</li>
<li>Use <code>\t</code> to line up columns, but remember a long word can push past the next tab stop (as "Tomorrow:" does above). Adding an extra <code>\t</code> to the shorter labels fixes that.</li>
</ul>
<p>This is all <strong>sequence</strong>: the lines appear in exactly the order you wrote them.</p>`,
      instructions: [
        "Print a banner for a pet shop. The top and bottom lines must both be exactly <code>==============================</code> (30 equals signs).",
        "Between them print <code>      PAWS AND CLAWS PETS</code> (a centred name is fine, as long as it contains <code>PAWS AND CLAWS PETS</code>).",
        "Print a blank line, then <code>Open:</code> followed by a tab and <code>9am to 5pm</code>"
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        // TODO: top border (30 = signs)

        // TODO: shop name

        // TODO: bottom border

        // TODO: blank line, then Open:<tab>9am to 5pm

    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("==============================");
        Console.WriteLine("      PAWS AND CLAWS PETS");
        Console.WriteLine("==============================");
        Console.WriteLine();
        Console.WriteLine("Open:\t9am to 5pm");
    }
}`,
      tests: [
        { type: "outputRegex", pattern: "(^|\\n)={30}\\r?\\n.*PAWS AND CLAWS PETS.*\\r?\\n={30}\\r?\\n", msg: "Print the name between two lines of exactly 30 = signs." },
        { type: "outputRegex", pattern: "={30}\\r?\\n\\r?\\nOpen:", msg: "Print a blank line after the banner, before Open:" },
        { type: "output", includes: "Open:\t9am to 5pm", msg: "Print Open:, a tab (\\t), then 9am to 5pm." }
      ],
      hint: "Copy the border line so both have exactly 30 = signs. Console.WriteLine(); gives the blank line, and \\t gives the tab."
    },
    {
      id: "m01-l5",
      title: "Canteen receipt",
      type: "code",
      learn: cs`<p>Let's put everything together: <code>Write</code>, <code>WriteLine</code>, blank lines, tabs and comments, to print a till receipt for the school canteen.</p>
<p>Here is Aoife's receipt from the tuck shop:</p>
<pre><code class="cs">// Header
Console.WriteLine("--- TUCK SHOP ---");
// Items: name, tab, price
Console.WriteLine("Crisps\t\t£0.60");
Console.WriteLine("Water\t\t£0.80");
Console.WriteLine("-----------------");
Console.Write("TOTAL\t\t");
Console.WriteLine("£1.40");
Console.WriteLine("Thank you!");</code></pre>
<pre><code>--- TUCK SHOP ---
Crisps          £0.60
Water           £0.80
-----------------
TOTAL           £1.40
Thank you!</code></pre>
<p>Notice:</p>
<ul>
<li>Two tabs <code>\t\t</code> push the prices into a neat column even though the item names are different lengths.</li>
<li><code>Write</code> followed by <code>WriteLine</code> builds one line from two pieces.</li>
<li>The comments break the code into sections so it's easy to follow.</li>
</ul>
<p>Right now you are typing the prices in by hand. In the next module you'll learn about <strong>variables</strong>, which let the computer store and work out values like the total for you.</p>`,
      instructions: [
        "Print a receipt. First line: <code>*** ERGS CANTEEN ***</code>",
        "Then three item lines, each name followed by <code>\\t\\t</code> and the price: <code>Pasta\\t\\t£2.50</code>, <code>Juice\\t\\t£0.90</code>, <code>Cookie\\t\\t£0.60</code>",
        "Then a line of dashes, then <code>TOTAL\\t\\t£4.00</code>",
        "Finish with a blank line followed by <code>Have a great day!</code> (keep using comments to label each section)."
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        // Header
        Console.WriteLine("*** ERGS CANTEEN ***");

        // TODO: the three items, using \t\t before each price

        // TODO: a line of dashes and the TOTAL line

        // TODO: blank line, then Have a great day!

    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        // Header
        Console.WriteLine("*** ERGS CANTEEN ***");

        // Items
        Console.WriteLine("Pasta\t\t£2.50");
        Console.WriteLine("Juice\t\t£0.90");
        Console.WriteLine("Cookie\t\t£0.60");

        // Total
        Console.WriteLine("--------------------");
        Console.WriteLine("TOTAL\t\t£4.00");

        Console.WriteLine();
        Console.WriteLine("Have a great day!");
    }
}`,
      tests: [
        { type: "output", includes: "*** ERGS CANTEEN ***", msg: "Start with *** ERGS CANTEEN ***" },
        { type: "codeRaw", pattern: "//.*\\S", msg: "Add at least one // comment to explain your code." },
        { type: "outputRegex", pattern: "Pasta\\t\\t£2\\.50[\\s\\S]*Juice\\t\\t£0\\.90[\\s\\S]*Cookie\\t\\t£0\\.60", msg: "Print the three items in order, each with two tabs before the price." },
        { type: "outputRegex", pattern: "-{3,}[\\s\\S]*TOTAL\\t\\t£4\\.00", msg: "Print a line of dashes and then TOTAL\\t\\t£4.00" },
        { type: "outputRegex", pattern: "£4\\.00\\r?\\n\\r?\\nHave a great day!", msg: "Print a blank line, then Have a great day!" }
      ],
      hint: "Each item is one WriteLine, e.g. Console.WriteLine(\"Pasta\\t\\t£2.50\"); The £ sign can go straight inside the quotes."
    },
    {
      id: "m01-l6",
      title: "ASCII art",
      type: "code",
      learn: cs`<p><strong>ASCII art</strong> is pictures made from keyboard characters. It was everywhere in early computer games, and it's a fun way to practise precise output.</p>
<pre><code class="cs">Console.WriteLine(" /\\_/\\ ");
Console.WriteLine("( o.o )");
Console.WriteLine(" > ^ < ");</code></pre>
<pre><code> /\_/\
( o.o )
 > ^ < </code></pre>
<p>The tricky part is the <strong>backslash</strong>. Because <code>\</code> starts an escape sequence, you must type <code>\\</code> every time you want one backslash to appear. Look carefully: the code above has <code>/\\_/\\</code> but prints <code>/\_/\</code>.</p>
<h3>Verbatim strings</h3>
<p>If your art has lots of backslashes, C# offers a shortcut: put <code>@</code> in front of the string. This makes a <strong>verbatim string</strong> where backslashes are just ordinary characters:</p>
<pre><code class="cs">Console.WriteLine(@" /\_/\ ");</code></pre>
<p>Both ways print the same thing. Use whichever you find easier.</p>
<div class="tip">Leading spaces matter! The spaces at the start of a line are what shift parts of the picture to the right.</div>`,
      instructions: [
        "Print this rocket, one line per <code>WriteLine</code>, exactly as shown (watch the backslashes):",
        "<pre><code>   /\\\n  /  \\\n |ERGS|\n |    |\n /_||_\\</code></pre>",
        "Then print <code>3... 2... 1... Lift off!</code>"
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        // Remember: to show one \ you type \\ (or use an @ verbatim string)
        Console.WriteLine("   /\\");
        // TODO: the other four lines of the rocket

        // TODO: 3... 2... 1... Lift off!

    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("   /\\");
        Console.WriteLine("  /  \\");
        Console.WriteLine(" |ERGS|");
        Console.WriteLine(" |    |");
        Console.WriteLine(" /_||_\\");
        Console.WriteLine("3... 2... 1... Lift off!");
    }
}`,
      tests: [
        { type: "output", includes: "   /\\\n  /  \\\n |ERGS|\n |    |\n /_||_\\\n", caseSensitive: true, msg: "Print all five rocket lines exactly as shown, including the spaces and backslashes." },
        { type: "output", includes: "3... 2... 1... Lift off!", msg: "Print 3... 2... 1... Lift off!" }
      ],
      hint: "Line 2 is Console.WriteLine(\"  /  \\\\\"); (two spaces, slash, two spaces, backslash). The last line ends with \\\\ too."
    },
    {
      id: "m01-quiz",
      title: "Checkpoint: output and comments",
      type: "quiz",
      questions: [
        { q: "What is the difference between Console.Write and Console.WriteLine?", options: ["Write is faster", "WriteLine moves to a new line after printing; Write stays on the same line", "Write prints numbers, WriteLine prints text", "There is no difference"], answer: 1, explain: "WriteLine adds a new line at the end; Write leaves the cursor where it is." },
        { q: "Which escape sequence prints a tab?", options: ["\\n", "\\t", "\\\\", "\\\""], answer: 1, explain: "\\t is a tab, \\n is a new line." },
        { q: "What does Console.WriteLine(\"A\\nB\"); print?", options: ["A\\nB", "AB", "A and B on separate lines", "A, a tab, then B"], answer: 2, explain: "\\n is a new line, so B appears on the line below A." },
        { q: "How do you print a double quote inside a string?", options: ["\"\"", "\\\"", "/\"", "'\"'"], answer: 1, explain: "A backslash before the quote escapes it, so it's printed instead of ending the string." },
        { q: "What happens to comments when the program runs?", options: ["They are printed", "They are ignored by the computer", "They cause an error", "They run first"], answer: 1, explain: "Comments are notes for humans; the compiler ignores them." },
        { q: "Which of these is a correct multi-line comment?", options: ["// ... //", "<!-- ... -->", "/* ... */", "# ... #"], answer: 2, explain: "In C#, multi-line comments start with /* and end with */." },
        { q: "What does Console.WriteLine(); with nothing in the brackets do?", options: ["Causes a syntax error", "Prints the word null", "Prints a blank line", "Clears the screen"], answer: 2, explain: "It just ends the current line, giving an empty line." }
      ]
    }
  ]
});
})();
