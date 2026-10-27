// Module 3: Input and type conversion
(function () {
const cs = String.raw;

COURSE.addModule({
  id: "m03",
  title: "Input and type conversion",
  icon: "keyboard",
  summary: "Ask the user for input with Console.ReadLine, convert text into numbers, and format your output neatly.",
  lessons: [
    {
      id: "m03-l1",
      title: "Asking a question: ReadLine",
      type: "code",
      learn: cs`<p>Up to now your programs have done the same thing every time. Real programs react to the <strong>user</strong>. To read what the user types, use <code>Console.ReadLine()</code>:</p>
<pre><code class="cs">Console.Write("What is your name? ");
string name = Console.ReadLine();
Console.WriteLine($"Hello {name}, welcome to the quiz!");</code></pre>
<p>Here's what happens, step by step:</p>
<ol>
<li><code>Console.Write</code> prints a <strong>prompt</strong>, so the user knows what to type. Using <code>Write</code> (not <code>WriteLine</code>) keeps the cursor on the same line as the question.</li>
<li><code>Console.ReadLine()</code> waits until the user types something and presses <strong>Enter</strong>.</li>
<li>Whatever they typed is stored, as a <code>string</code>, in the variable <code>name</code>.</li>
<li>The last line uses that value.</li>
</ol>
<p>If Ciarán types <code>Ciarán</code>, the console looks like this:</p>
<pre><code>What is your name? Ciarán
Hello Ciarán, welcome to the quiz!</code></pre>
<p>This is the classic <strong>input → process → output</strong> pattern that almost every program follows.</p>
<div class="tip">On this site, when your program is waiting for input, click in the console, type your answer and press Enter. When you press <strong>Check</strong>, the tests type the answers in for you automatically.</div>
<div class="warn"><code>ReadLine</code> <em>always</em> gives you a <code>string</code>, even if the user types a number. You'll see how to turn it into a number in the next lesson.</div>`,
      instructions: [
        "Use <code>Console.Write</code> to print the prompt <code>What is your pet's name? </code> and read the answer into a variable called <code>petName</code>.",
        "Then prompt <code>What kind of animal is it? </code> and read the answer into <code>animal</code>.",
        "Print <code>PETNAME the ANIMAL is a great pet!</code> using the two variables, e.g. <code>Biscuit the hamster is a great pet!</code>"
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        // TODO: prompt for the pet's name and read it into petName

        // TODO: prompt for the animal and read it into animal

        // TODO: print the message using both variables

    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        Console.Write("What is your pet's name? ");
        string petName = Console.ReadLine();

        Console.Write("What kind of animal is it? ");
        string animal = Console.ReadLine();

        Console.WriteLine($"{petName} the {animal} is a great pet!");
    }
}`,
      stdin: ["Biscuit", "hamster"],
      tests: [
        { type: "output", includes: "What is your pet's name?", msg: "Prompt with What is your pet's name?" },
        { type: "output", includes: "What kind of animal is it?", msg: "Prompt with What kind of animal is it?" },
        { type: "output", stdin: ["Biscuit", "hamster"], includes: "Biscuit the hamster is a great pet!", msg: "With Biscuit and hamster, print Biscuit the hamster is a great pet!" },
        { type: "output", stdin: ["Rex", "dog"], includes: "Rex the dog is a great pet!", msg: "Use the variables, not fixed text: with Rex and dog, print Rex the dog is a great pet!" },
        { type: "code", pattern: "Console\\.ReadLine\\(\\)", msg: "Use Console.ReadLine() to read the user's answers." }
      ],
      hint: "string petName = Console.ReadLine(); stores the answer. Then $\"{petName} the {animal} is a great pet!\""
    },
    {
      id: "m03-l2",
      title: "Turning text into numbers",
      type: "code",
      learn: cs`<p>Try this and see what goes wrong:</p>
<pre><code class="cs">Console.Write("How many goals? ");
string goals = Console.ReadLine();
Console.WriteLine(goals + 1);</code></pre>
<p>If you type <code>3</code>, it prints <code>31</code>! That's because <code>goals</code> is the <em>text</em> <code>"3"</code>, so <code>+</code> joins strings instead of adding. And this won't even compile:</p>
<pre><code class="cs">int goals = Console.ReadLine();   // ✗ Cannot implicitly convert type 'string' to 'int'</code></pre>
<p>You need to <strong>convert</strong> the string into a number. There are two common ways to get an <code>int</code>:</p>
<pre><code class="cs">int goals = Convert.ToInt32(Console.ReadLine());
int goals = int.Parse(Console.ReadLine());</code></pre>
<p>Both do the same job here. For numbers with a decimal point, use a <code>double</code>:</p>
<pre><code class="cs">double height = Convert.ToDouble(Console.ReadLine());
double height = double.Parse(Console.ReadLine());</code></pre>
<p>Now the maths works properly:</p>
<pre><code class="cs">Console.Write("How many goals? ");
int goals = int.Parse(Console.ReadLine());
Console.WriteLine($"Next match you need {goals + 1} goals to beat it.");</code></pre>
<pre><code>How many goals? 3
Next match you need 4 goals to beat it.</code></pre>
<div class="key"><strong>Type conversion</strong> changing a value from one data type to another, e.g. from the string "3" to the integer 3.</div>`,
      instructions: [
        "Prompt <code>How many tickets? </code> and read the answer as an <code>int</code> called <code>tickets</code>.",
        "Each cinema ticket costs £8. Print <code>Total cost: £T</code> where T is <code>tickets * 8</code>. For 3 tickets: <code>Total cost: £24</code>",
        "Then print <code>You have booked N tickets.</code> e.g. <code>You have booked 3 tickets.</code>"
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        Console.Write("How many tickets? ");
        // TODO: read the answer and convert it to an int called tickets

        // TODO: print Total cost: £... (tickets * 8)

        // TODO: print You have booked ... tickets.

    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        Console.Write("How many tickets? ");
        int tickets = int.Parse(Console.ReadLine());

        Console.WriteLine($"Total cost: £{tickets * 8}");
        Console.WriteLine($"You have booked {tickets} tickets.");
    }
}`,
      stdin: ["3"],
      tests: [
        { type: "output", stdin: ["3"], includes: "Total cost: £24", msg: "For 3 tickets, print Total cost: £24" },
        { type: "output", stdin: ["5"], includes: "Total cost: £40", msg: "For 5 tickets, print Total cost: £40 (multiply, don't join!)" },
        { type: "output", stdin: ["5"], includes: "You have booked 5 tickets.", msg: "Print You have booked 5 tickets. when the user types 5" },
        { type: "code", pattern: "int\\.Parse|Convert\\.ToInt32", msg: "Convert the input with int.Parse or Convert.ToInt32." }
      ],
      hint: "int tickets = int.Parse(Console.ReadLine()); then $\"Total cost: £{tickets * 8}\""
    },
    {
      id: "m03-l3",
      title: "Casting and ToString",
      type: "code",
      learn: cs`<p>Sometimes you need to convert between two <em>number</em> types. This is called <strong>casting</strong>.</p>
<h3>int → double: automatic</h3>
<p>Every whole number can be stored as a double without losing anything, so C# does it for you:</p>
<pre><code class="cs">int pupils = 28;
double d = pupils;   // fine: d is 28</code></pre>
<h3>double → int: you must ask</h3>
<p>Going the other way could lose the decimal part, so C# insists you say you mean it, by putting the type in brackets:</p>
<pre><code class="cs">double rainfall = 12.8;
int rounded = (int)rainfall;   // 12: the .8 is chopped off, NOT rounded</code></pre>
<p>Without <code>(int)</code> you get a compile error: <code>Cannot implicitly convert type 'double' to 'int'</code>.</p>
<h3>Casting to get a decimal answer</h3>
<p>When you divide one <code>int</code> by another, C# gives an <code>int</code> answer and throws away the remainder: <code>7 / 2</code> is <code>3</code>. Cast one of them to <code>double</code> first to get the real answer:</p>
<pre><code class="cs">int points = 7;
int games = 2;
Console.WriteLine(points / games);           // 3
Console.WriteLine((double)points / games);   // 3.5</code></pre>
<h3>Anything → string</h3>
<p>Every value has a <code>.ToString()</code> method that turns it into text:</p>
<pre><code class="cs">int score = 42;
string s = score.ToString();   // "42"
Console.WriteLine(s.Length);   // 2 characters</code></pre>`,
      instructions: [
        "The starter stores a total of <code>17</code> points from <code>4</code> games. Print <code>Average (int division): 4</code> using <code>total / games</code>.",
        "Print <code>Average (real): 4.25</code> by casting with <code>(double)</code>.",
        "Store <code>9.7</code> in a <code>double</code> called <code>temperature</code>, cast it to an int and print <code>Whole degrees: 9</code>",
        "Convert <code>total</code> to a string with <code>ToString()</code> and print <code>Digits in total: 2</code> using the string's <code>Length</code>."
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        int total = 17;
        int games = 4;

        // TODO 1: Average (int division): ...

        // TODO 2: Average (real): ...  (cast to double)

        // TODO 3: temperature = 9.7, cast to int, print Whole degrees: ...

        // TODO 4: total.ToString(), print Digits in total: ...

    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        int total = 17;
        int games = 4;

        Console.WriteLine($"Average (int division): {total / games}");
        Console.WriteLine($"Average (real): {(double)total / games}");

        double temperature = 9.7;
        int wholeDegrees = (int)temperature;
        Console.WriteLine($"Whole degrees: {wholeDegrees}");

        string totalText = total.ToString();
        Console.WriteLine($"Digits in total: {totalText.Length}");
    }
}`,
      tests: [
        { type: "output", includes: "Average (int division): 4", msg: "Print Average (int division): 4" },
        { type: "output", includes: "Average (real): 4.25", msg: "Print Average (real): 4.25 (cast to double before dividing)." },
        { type: "output", includes: "Whole degrees: 9", msg: "Print Whole degrees: 9" },
        { type: "code", pattern: "\\(\\s*int\\s*\\)", msg: "Use an (int) cast for the temperature." },
        { type: "code", pattern: "\\.ToString\\(\\s*\\)", msg: "Use ToString() to convert total to a string." },
        { type: "output", includes: "Digits in total: 2", msg: "Print Digits in total: 2" }
      ],
      hint: "(double)total / games gives 4.25. (int)temperature gives 9. string t = total.ToString(); then t.Length."
    },
    {
      id: "m03-l4",
      title: "When conversion goes wrong",
      type: "code",
      learn: cs`<p>What happens if the program asks for a number and Ben types <code>abc</code>?</p>
<pre><code class="cs">Console.Write("Age: ");
int age = int.Parse(Console.ReadLine());</code></pre>
<pre><code>Age: abc
Unhandled exception. System.FormatException: The input string 'abc' was not in a correct format.</code></pre>
<p>The program <strong>crashes</strong>. The code was fine (no syntax error) but something went wrong while it was running: a <strong>run-time error</strong>. In C#, these are called <strong>exceptions</strong>. A <code>FormatException</code> means "this text isn't in the right format to be a number". Typing <code>12.5</code> into <code>int.Parse</code> crashes too, because an <code>int</code> can't have a decimal point.</p>
<h3>A sneak preview: TryParse</h3>
<p>Good programs don't crash when users make mistakes. This is called <strong>validation</strong>, and you'll learn it properly later. Here is a taste. <code>int.TryParse</code> <em>tries</em> to convert, and tells you whether it worked instead of crashing:</p>
<pre><code class="cs">Console.Write("Age: ");
string input = Console.ReadLine();
int age;
bool ok = int.TryParse(input, out age);
Console.WriteLine($"Did it work? {ok}");
Console.WriteLine($"Age: {age}");</code></pre>
<p>If you type <code>15</code>: <code>ok</code> is <code>True</code> and <code>age</code> is <code>15</code>.<br>
If you type <code>abc</code>: <code>ok</code> is <code>False</code> and <code>age</code> is set to <code>0</code>. No crash!</p>
<p>The word <code>out</code> means "TryParse will put the number into this variable for you". Once you learn <code>if</code> statements, you'll use <code>ok</code> to decide whether to show an error message.</p>`,
      instructions: [
        "Run the starter and type <code>abc</code> to see the crash for yourself.",
        "Change the program to use <code>int.TryParse</code> instead of <code>int.Parse</code>, so it never crashes.",
        "Print <code>Valid number: True</code> or <code>Valid number: False</code>, then <code>You typed: N</code> where N is the converted number (0 if it wasn't valid)."
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        Console.Write("Enter your house number: ");
        string input = Console.ReadLine();

        // This line crashes if the input is not a whole number.
        // TODO: replace it with int.TryParse(input, out number)
        int number = int.Parse(input);

        // TODO: print Valid number: True/False
        Console.WriteLine($"You typed: {number}");
    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        Console.Write("Enter your house number: ");
        string input = Console.ReadLine();

        int number;
        bool ok = int.TryParse(input, out number);

        Console.WriteLine($"Valid number: {ok}");
        Console.WriteLine($"You typed: {number}");
    }
}`,
      stdin: ["42"],
      tests: [
        { type: "output", stdin: ["42"], includes: "Valid number: True", msg: "With 42, print Valid number: True" },
        { type: "output", stdin: ["42"], includes: "You typed: 42", msg: "With 42, print You typed: 42" },
        { type: "output", stdin: ["abc"], includes: "Valid number: False", msg: "With abc, print Valid number: False (and don't crash)." },
        { type: "output", stdin: ["abc"], includes: "You typed: 0", msg: "With abc, print You typed: 0" },
        { type: "code", pattern: "int\\.TryParse\\s*\\(", msg: "Use int.TryParse." }
      ],
      hint: "int number; bool ok = int.TryParse(input, out number); Then print ok and number."
    },
    {
      id: "m03-l5",
      title: "Formatting numbers",
      type: "code",
      learn: cs`<p>Raw numbers can look messy. <code>10 / 3.0</code> prints <code>3.3333333333333335</code>, and a price of <code>4.5</code> should really show as <code>£4.50</code>. You can add a <strong>format</strong> after a colon inside interpolation braces:</p>
<table>
<tr><th>Format</th><th>Meaning</th><th>Example</th><th>Output</th></tr>
<tr><td><code>F2</code></td><td>fixed, 2 decimal places</td><td><code>{3.14159:F2}</code></td><td><code>3.14</code></td></tr>
<tr><td><code>F1</code></td><td>fixed, 1 decimal place</td><td><code>{9.87:F1}</code></td><td><code>9.9</code></td></tr>
<tr><td><code>F0</code></td><td>no decimal places (rounded)</td><td><code>{9.87:F0}</code></td><td><code>10</code></td></tr>
<tr><td><code>C</code></td><td>currency (UK pounds)</td><td><code>{4.5:C}</code></td><td><code>£4.50</code></td></tr>
</table>
<pre><code class="cs">double average = 10 / 3.0;
double price = 4.5;
Console.WriteLine($"Average: {average:F2}");
Console.WriteLine($"Price: {price:C}");</code></pre>
<pre><code>Average: 3.33
Price: £4.50</code></pre>
<p>Notice the <code>F</code> formats <strong>round</strong> (9.87 → 9.9), whereas an <code>(int)</code> cast just chops. Also, <code>C</code> adds the £ sign for you, so don't type one in front as well or you'll get <code>££4.50</code>!</p>
<p>The same formats work with <code>ToString</code>:</p>
<pre><code class="cs">string text = price.ToString("C");   // "£4.50"</code></pre>
<div class="tip">Formatting only changes how the number is <em>shown</em>. The variable still holds the full, unrounded value.</div>`,
      instructions: [
        "Prompt <code>Enter the bill: </code> and read a <code>double</code> called <code>bill</code>. Prompt <code>How many people? </code> and read an <code>int</code> called <code>people</code>.",
        "Work out each person's share: <code>bill / people</code>.",
        "Print <code>Each person pays £S</code> with the share to 2 decimal places using <code>:F2</code>. For a bill of 50 between 3: <code>Each person pays £16.67</code>",
        "Print <code>Bill: X</code> using the <code>:C</code> format, e.g. <code>Bill: £50.00</code>"
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        // TODO: read bill (double) and people (int) with prompts

        // TODO: work out the share

        // TODO: print Each person pays £... with :F2

        // TODO: print Bill: ... with :C

    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        Console.Write("Enter the bill: ");
        double bill = double.Parse(Console.ReadLine());
        Console.Write("How many people? ");
        int people = int.Parse(Console.ReadLine());

        double share = bill / people;

        Console.WriteLine($"Each person pays £{share:F2}");
        Console.WriteLine($"Bill: {bill:C}");
    }
}`,
      stdin: ["50", "3"],
      tests: [
        { type: "output", stdin: ["50", "3"], includes: "Each person pays £16.67", msg: "For 50 and 3, print Each person pays £16.67" },
        { type: "output", stdin: ["50", "3"], includes: "Bill: £50.00", msg: "For 50, print Bill: £50.00 using :C" },
        { type: "output", stdin: ["12.5", "2"], includes: "Each person pays £6.25", msg: "For 12.5 and 2, print Each person pays £6.25 (read the bill as a double)." },
        { type: "code", pattern: ":F2", msg: "Use the :F2 format for the share." },
        { type: "code", pattern: ":C", msg: "Use the :C format for the bill." }
      ],
      hint: "double bill = double.Parse(Console.ReadLine()); ... then $\"Each person pays £{share:F2}\" and $\"Bill: {bill:C}\" (no extra £ before :C)."
    },
    {
      id: "m03-l6",
      title: "Project: cinema ticket machine",
      type: "code",
      learn: cs`<p>Time to put the whole module together. You're going to build the ticket machine for the local cinema. It should follow the <strong>input → process → output</strong> pattern:</p>
<ol>
<li><strong>Input:</strong> ask for the customer's name and the number of adult and child tickets.</li>
<li><strong>Process:</strong> convert the inputs to numbers and work out the total.</li>
<li><strong>Output:</strong> print a neat summary, with money formatted properly.</li>
</ol>
<p>Here's a similar program for a swimming pool, so you can see the shape:</p>
<pre><code class="cs">const double SwimPrice = 3.20;

Console.Write("Name: ");
string name = Console.ReadLine();
Console.Write("Number of swims: ");
int swims = int.Parse(Console.ReadLine());

double cost = swims * SwimPrice;

Console.WriteLine($"Thanks {name}!");
Console.WriteLine($"Total: {cost:C}");</code></pre>
<pre><code>Name: Grace
Number of swims: 3
Thanks Grace!
Total: £9.60</code></pre>
<p>Using <strong>constants</strong> for the prices means that when the cinema puts its prices up, you only change one line.</p>
<div class="tip">Build it a bit at a time. Get the inputs working and Run. Then add the calculation and Run again. Small steps make bugs easy to find.</div>`,
      instructions: [
        "Use constants for the prices: adult tickets <code>8.50</code>, child tickets <code>5.25</code> (as <code>double</code>).",
        "Prompt <code>Name: </code>, then <code>Adult tickets: </code>, then <code>Child tickets: </code> and read the answers (the ticket counts as <code>int</code>s).",
        "Print <code>Booking for NAME</code>, then <code>Tickets: N</code> (adults + children), then <code>Total to pay: X</code> using <code>:C</code>.",
        "Example: Aoife, 2 adults, 1 child → <code>Booking for Aoife</code>, <code>Tickets: 3</code>, <code>Total to pay: £22.25</code>"
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        // TODO: constants for the adult and child prices

        // TODO: input: name, adult tickets, child tickets

        // TODO: process: total tickets and total cost

        // TODO: output: Booking for ..., Tickets: ..., Total to pay: ...

    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        const double AdultPrice = 8.50;
        const double ChildPrice = 5.25;

        Console.Write("Name: ");
        string name = Console.ReadLine();
        Console.Write("Adult tickets: ");
        int adults = int.Parse(Console.ReadLine());
        Console.Write("Child tickets: ");
        int children = int.Parse(Console.ReadLine());

        int tickets = adults + children;
        double total = adults * AdultPrice + children * ChildPrice;

        Console.WriteLine($"Booking for {name}");
        Console.WriteLine($"Tickets: {tickets}");
        Console.WriteLine($"Total to pay: {total:C}");
    }
}`,
      stdin: ["Aoife", "2", "1"],
      tests: [
        { type: "output", stdin: ["Aoife", "2", "1"], includes: "Booking for Aoife", msg: "Print Booking for Aoife" },
        { type: "output", stdin: ["Aoife", "2", "1"], includes: "Tickets: 3", msg: "For 2 adults and 1 child, print Tickets: 3" },
        { type: "output", stdin: ["Aoife", "2", "1"], includes: "Total to pay: £22.25", msg: "For 2 adults and 1 child, print Total to pay: £22.25" },
        { type: "output", stdin: ["Oisín", "1", "4"], includes: "Total to pay: £29.50", msg: "For 1 adult and 4 children, print Total to pay: £29.50" },
        { type: "code", pattern: "const\\s+(double|decimal)\\s+\\w+\\s*=\\s*8\\.50?", msg: "Use a constant for the adult price (8.50)." }
      ],
      hint: "double total = adults * AdultPrice + children * ChildPrice; then $\"Total to pay: {total:C}\""
    },
    {
      id: "m03-quiz",
      title: "Checkpoint: input and conversion",
      type: "quiz",
      questions: [
        { q: "What data type does Console.ReadLine() give you?", options: ["int", "double", "string", "It depends on what the user types"], answer: 2, explain: "ReadLine always returns a string, even if the user types digits." },
        { q: "Which line correctly reads a whole number from the user?", options: ["int n = Console.ReadLine();", "int n = int.Parse(Console.ReadLine());", "int n = (int)Console.ReadLine();", "string n = int.Parse(Console.ReadLine());"], answer: 1, explain: "int.Parse (or Convert.ToInt32) converts the string to an int." },
        { q: "What does (int)7.9 give?", options: ["8", "7", "7.9", "An error"], answer: 1, explain: "Casting to int chops off the decimal part; it does not round." },
        { q: "A user types abc into int.Parse. What kind of error is this?", options: ["Syntax error", "Logic error", "Run-time error (FormatException)", "No error, it gives 0"], answer: 2, explain: "The program crashes while running with a FormatException: a run-time error." },
        { q: "What does Console.WriteLine($\"{2.0/3:F2}\"); print?", options: ["0.66", "0.67", "0.6666666666666666", "£0.67"], answer: 1, explain: "F2 rounds to two decimal places: 0.67." },
        { q: "Why use Console.Write for a prompt instead of Console.WriteLine?", options: ["It is faster", "The user's typing appears on the same line as the question", "WriteLine can't print questions", "Write converts the answer to a number"], answer: 1, explain: "Write leaves the cursor on the same line, so the answer appears next to the prompt." },
        { q: "What does int.TryParse(\"hello\", out n) do?", options: ["Crashes the program", "Returns false and sets n to 0", "Returns true and sets n to 5", "Asks the user again"], answer: 1, explain: "TryParse never crashes: it returns false when conversion fails and sets n to 0." }
      ]
    }
  ]
});
})();
