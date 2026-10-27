// Module 2: Variables and data types
(function () {
const cs = String.raw;

COURSE.addModule({
  id: "m02",
  title: "Variables and data types",
  icon: "box",
  summary: "Store information in variables, choose the right data type, and build messages with concatenation and interpolation.",
  lessons: [
    {
      id: "m02-l1",
      title: "Your first variables",
      type: "code",
      learn: cs`<p>So far every value has been typed straight into a <code>WriteLine</code>. Real programs need to <strong>remember</strong> things: a score, a name, a price. For that you use variables.</p>
<div class="key"><strong>Variable</strong> a named location in memory that stores a value. The value can change while the program runs.</div>
<p>Think of a variable as a labelled box. In C# you must say what <em>type</em> of thing goes in the box, give it a name, and (usually) put a value in:</p>
<pre><code class="cs">int tries = 3;
string team = "Enniskillen";</code></pre>
<p><code>int</code> means "whole number" and <code>string</code> means "text". The <code>=</code> sign is the <strong>assignment</strong> operator: it means "store the value on the right in the variable on the left". It does <em>not</em> mean "equals" like in maths.</p>
<h3>Using a variable</h3>
<p>To print what is in the box, use the variable's name <strong>without</strong> quotes:</p>
<pre><code class="cs">Console.WriteLine(team);     // prints Enniskillen
Console.WriteLine("team");   // prints the word team</code></pre>
<h3>Changing a variable</h3>
<p>You can put a new value into a variable later. The old value is replaced. You don't write the type again:</p>
<pre><code class="cs">int tries = 3;
Console.WriteLine(tries);   // 3
tries = 5;
Console.WriteLine(tries);   // 5</code></pre>
<p>You can also declare a variable first and assign it afterwards:</p>
<pre><code class="cs">int age;
age = 14;</code></pre>`,
      instructions: [
        "Declare a <code>string</code> variable called <code>petName</code> holding <code>Biscuit</code> and an <code>int</code> variable called <code>petAge</code> holding <code>3</code>.",
        "Print <code>petName</code> and then <code>petAge</code> on separate lines (use the variables, not typed text).",
        "Biscuit has a birthday! Change <code>petAge</code> to <code>4</code> and print it again."
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        // TODO: declare petName (string) and petAge (int)

        // TODO: print both variables

        // TODO: change petAge to 4 and print it again

    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        string petName = "Biscuit";
        int petAge = 3;

        Console.WriteLine(petName);
        Console.WriteLine(petAge);

        petAge = 4;
        Console.WriteLine(petAge);
    }
}`,
      tests: [
        { type: "code", pattern: "string\\s+petName\\s*=\\s*\"Biscuit\"", msg: "Declare string petName = \"Biscuit\";" },
        { type: "code", pattern: "int\\s+petAge\\s*=\\s*3\\s*;", msg: "Declare int petAge = 3;" },
        { type: "code", pattern: "(^|[^.\\w])petAge\\s*=\\s*4\\s*;", msg: "Assign 4 to petAge (without writing int again)." },
        { type: "code", pattern: "WriteLine\\(\\s*petAge\\s*\\)", msg: "Print the variable petAge (no quotes)." },
        { type: "outputRegex", pattern: "Biscuit\\r?\\n3\\r?\\n4", msg: "Output should be Biscuit, 3, then 4 on separate lines." }
      ],
      hint: "petAge = 4; changes the value. Then Console.WriteLine(petAge); prints it again."
    },
    {
      id: "m02-l2",
      title: "Data types",
      type: "code",
      learn: cs`<p>A <strong>data type</strong> tells the computer what kind of value a variable holds, how much memory it needs and what you can do with it. These are the ones you need for GCSE:</p>
<table>
<tr><th>Type</th><th>Holds</th><th>Example</th></tr>
<tr><td><code>int</code></td><td>whole numbers (integer)</td><td><code>int goals = 2;</code></td></tr>
<tr><td><code>double</code></td><td>numbers with a decimal point (real)</td><td><code>double rainfall = 12.5;</code></td></tr>
<tr><td><code>decimal</code></td><td>exact decimals, best for money (needs an <code>m</code>)</td><td><code>decimal price = 7.99m;</code></td></tr>
<tr><td><code>char</code></td><td>a single character, in single quotes</td><td><code>char grade = 'A';</code></td></tr>
<tr><td><code>string</code></td><td>text, in double quotes</td><td><code>string town = "Enniskillen";</code></td></tr>
<tr><td><code>bool</code></td><td><code>true</code> or <code>false</code> (Boolean)</td><td><code>bool isRaining = true;</code></td></tr>
</table>
<p>C# is strict about types. You can't put text into an <code>int</code>:</p>
<pre><code class="cs">int goals = "two";   // ✗ Cannot implicitly convert type 'string' to 'int'</code></pre>
<p>Watch out for the punctuation: <code>'A'</code> (single quotes) is a <code>char</code>, but <code>"A"</code> (double quotes) is a <code>string</code>.</p>
<p>When you print a <code>bool</code>, C# shows <code>True</code> or <code>False</code> with a capital letter, even though you type <code>true</code> and <code>false</code> in lower case in your code.</p>
<div class="tip">Why <code>decimal</code> for money? A <code>double</code> stores numbers in binary and can be very slightly out (try printing <code>0.1 + 0.2</code> some time!). <code>decimal</code> is exact for pounds and pence.</div>`,
      instructions: [
        "Create variables for a cinema trip, using the most suitable type for each: <code>film</code> = <code>Space Rangers</code>, <code>screen</code> = <code>4</code>, <code>ticketPrice</code> = <code>7.50</code> (it's money!), <code>row</code> = <code>F</code> (a single character), <code>is3D</code> = <code>true</code>.",
        "Print each variable on its own line, in that order."
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        // TODO: film (text), screen (whole number), ticketPrice (money),
        //       row (single character), is3D (true/false)

        // TODO: print each variable on its own line

    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        string film = "Space Rangers";
        int screen = 4;
        decimal ticketPrice = 7.50m;
        char row = 'F';
        bool is3D = true;

        Console.WriteLine(film);
        Console.WriteLine(screen);
        Console.WriteLine(ticketPrice);
        Console.WriteLine(row);
        Console.WriteLine(is3D);
    }
}`,
      tests: [
        { type: "code", pattern: "string\\s+film\\s*=", msg: "film should be a string." },
        { type: "code", pattern: "int\\s+screen\\s*=", msg: "screen should be an int." },
        { type: "code", pattern: "decimal\\s+ticketPrice\\s*=\\s*7\\.50?m", msg: "ticketPrice should be a decimal: decimal ticketPrice = 7.50m;" },
        { type: "code", pattern: "char\\s+row\\s*=\\s*'F'", msg: "row should be a char: char row = 'F';" },
        { type: "outputRegex", pattern: "Space Rangers\\r?\\n4\\r?\\n7\\.50?\\r?\\nF\\r?\\nTrue", msg: "Print the five values in order: Space Rangers, 4, 7.50, F, True." }
      ],
      hint: "Money uses decimal with an m on the end (7.50m). A single character uses char and single quotes ('F'). true/false uses bool."
    },
    {
      id: "m02-l3",
      title: "Choosing the right type",
      type: "code",
      learn: cs`<p>Picking the right data type is a skill examiners love to test. Ask yourself: <em>"What will I do with this value?"</em></p>
<h3>Numbers that aren't really numbers</h3>
<p>A phone number like <code>07700 900123</code> is made of digits, but you would never add two phone numbers together. It also starts with a 0, and an <code>int</code> would throw that leading zero away (<code>07700900123</code> would become <code>7700900123</code>). Phone numbers, postcodes and student IDs with letters or leading zeros should be stored as a <code>string</code>.</p>
<table>
<tr><th>Value</th><th>Best type</th><th>Why</th></tr>
<tr><td>Number of pupils in a class</td><td><code>int</code></td><td>whole number, you might add to it</td></tr>
<tr><td>Height in metres, 1.62</td><td><code>double</code></td><td>has a decimal part</td></tr>
<tr><td>Price of a meal deal, £3.20</td><td><code>decimal</code></td><td>money</td></tr>
<tr><td>Phone number</td><td><code>string</code></td><td>never used in calculations; leading 0</td></tr>
<tr><td>Postcode BT74 6AA</td><td><code>string</code></td><td>letters, digits and a space</td></tr>
<tr><td>Has paid?</td><td><code>bool</code></td><td>only two possible values</td></tr>
<tr><td>House initial, 'C'</td><td><code>char</code></td><td>exactly one character</td></tr>
</table>
<h3>Naming rules</h3>
<ul>
<li>Names can contain letters, digits and <code>_</code>, but can't start with a digit: <code>score1</code> ✓, <code>1score</code> ✗.</li>
<li>No spaces: <code>first name</code> ✗.</li>
<li>Can't be a C# keyword like <code>int</code> or <code>class</code>.</li>
<li>Case sensitive: <code>score</code> and <code>Score</code> are different variables.</li>
</ul>
<p>C# programmers name variables in <strong>camelCase</strong>: start lower case, and give every following word a capital letter, such as <code>firstName</code>, <code>totalScore</code>, <code>numberOfPupils</code>. Choose <em>meaningful</em> names: <code>busFare</code> tells you far more than <code>x</code>.</p>`,
      instructions: [
        "The starter stores a pupil's contact details, but some types and names are wrong. Fix it so: <code>phoneNumber</code> is a <code>string</code> holding <code>07700900123</code> (the 0 must print!), <code>heightInMetres</code> is a <code>double</code> holding <code>1.62</code>, and <code>hasPaidForTrip</code> is a <code>bool</code> holding <code>false</code>.",
        "Use those exact camelCase names (the starter's names break the rules).",
        "Print the three values on separate lines in that order."
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        // These lines have the wrong types and badly named variables.
        // TODO: fix them so the program compiles and prints the right values
        int PhoneNumber = 770090012;   // where has the 0 gone?
        int heightinmetres = 2;
        string has_paid_for_trip = "no";

        Console.WriteLine(PhoneNumber);
        Console.WriteLine(heightinmetres);
        Console.WriteLine(has_paid_for_trip);
    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        string phoneNumber = "07700900123";
        double heightInMetres = 1.62;
        bool hasPaidForTrip = false;

        Console.WriteLine(phoneNumber);
        Console.WriteLine(heightInMetres);
        Console.WriteLine(hasPaidForTrip);
    }
}`,
      tests: [
        { type: "code", pattern: "string\\s+phoneNumber\\s*=\\s*\"07700900123\"", msg: "Store phoneNumber as a string: \"07700900123\"" },
        { type: "code", pattern: "double\\s+heightInMetres\\s*=\\s*1\\.62", msg: "Store heightInMetres as a double holding 1.62" },
        { type: "code", pattern: "bool\\s+hasPaidForTrip\\s*=\\s*false", msg: "Store hasPaidForTrip as a bool holding false" },
        { type: "outputRegex", pattern: "07700900123\\r?\\n1\\.62\\r?\\nFalse", msg: "Print 07700900123, 1.62 and False on separate lines." }
      ],
      hint: "Strings go in double quotes, so \"07700900123\" keeps its 0. Remember to change the names in the WriteLine lines too."
    },
    {
      id: "m02-l4",
      title: "Joining text: concatenation",
      type: "code",
      learn: cs`<p>You'll often want to print a variable in the middle of a sentence. One way is <strong>concatenation</strong>: joining strings together with <code>+</code>.</p>
<pre><code class="cs">string name = "Niamh";
int tries = 2;
Console.WriteLine("Well done " + name + "!");
Console.WriteLine(name + " scored " + tries + " tries.");</code></pre>
<pre><code>Well done Niamh!
Niamh scored 2 tries.</code></pre>
<p>When you use <code>+</code> with a string and a number, C# turns the number into text and sticks them together. Don't forget the <strong>spaces inside the quotes</strong>: <code>" scored "</code> has a space at each end, otherwise you'd get <code>Niamhscored2tries.</code></p>
<h3>Storing a joined string</h3>
<p>The result of concatenation is just a string, so you can store it in a variable:</p>
<pre><code class="cs">string school = "ERGS";
string team = "1st XV";
string fullTeam = school + " " + team;
Console.WriteLine(fullTeam);   // ERGS 1st XV</code></pre>
<div class="warn"><strong>Careful with numbers!</strong> C# works left to right. <code>"Total: " + 2 + 3</code> gives <code>Total: 23</code>, because <code>"Total: " + 2</code> becomes the string <code>"Total: 2"</code>, then <code>3</code> is stuck on the end. Use brackets to do the maths first: <code>"Total: " + (2 + 3)</code> gives <code>Total: 5</code>.</div>`,
      instructions: [
        "Create <code>string town = \"Enniskillen\";</code> and <code>int temperature = 11;</code>",
        "Using concatenation (<code>+</code>), print <code>Weather for Enniskillen: 11 degrees</code>",
        "Create <code>string forecast</code> by joining <code>town</code> and <code>\" will be wet tomorrow\"</code>, then print <code>forecast</code>. It should show <code>Enniskillen will be wet tomorrow</code>."
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        // TODO: declare town and temperature

        // TODO: print Weather for Enniskillen: 11 degrees using +

        // TODO: build forecast and print it

    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        string town = "Enniskillen";
        int temperature = 11;

        Console.WriteLine("Weather for " + town + ": " + temperature + " degrees");

        string forecast = town + " will be wet tomorrow";
        Console.WriteLine(forecast);
    }
}`,
      tests: [
        { type: "output", includes: "Weather for Enniskillen: 11 degrees", msg: "Print Weather for Enniskillen: 11 degrees (check the colon and spaces)." },
        { type: "code", pattern: "\\+\\s*town|town\\s*\\+", msg: "Use + to join the town variable into the sentence." },
        { type: "code", pattern: "\\+\\s*temperature|temperature\\s*\\+", msg: "Use + to join the temperature variable into the sentence." },
        { type: "code", pattern: "string\\s+forecast\\s*=", msg: "Create a string variable called forecast." },
        { type: "output", includes: "Enniskillen will be wet tomorrow", msg: "Print Enniskillen will be wet tomorrow from the forecast variable." }
      ],
      hint: "\"Weather for \" + town + \": \" + temperature + \" degrees\" — check there's a space at the edges of each quoted piece."
    },
    {
      id: "m02-l5",
      title: "String interpolation",
      type: "code",
      learn: cs`<p>Concatenation works, but all those <code>+</code> signs and quotes get messy. C# has a neater way called <strong>string interpolation</strong>. Put a <code>$</code> before the opening quote, then write variable names inside curly braces <code>{ }</code>:</p>
<pre><code class="cs">string name = "Ben";
int age = 15;
Console.WriteLine($"{name} is {age} years old.");</code></pre>
<pre><code>Ben is 15 years old.</code></pre>
<p>Compare with concatenation:</p>
<pre><code class="cs">Console.WriteLine(name + " is " + age + " years old.");</code></pre>
<p>Same output, but the interpolated version reads almost like the finished sentence. It's what most C# programmers use.</p>
<h3>Calculations inside the braces</h3>
<p>You can put a small calculation inside the braces and C# works it out first:</p>
<pre><code class="cs">int tickets = 3;
int pricePerTicket = 8;
Console.WriteLine($"{tickets} tickets cost £{tickets * pricePerTicket}");</code></pre>
<pre><code>3 tickets cost £24</code></pre>
<div class="warn">Forget the <code>$</code> and C# prints the braces literally: <code>{name} is {age} years old.</code> If you see curly brackets in your output, check for the missing <code>$</code>!</div>`,
      instructions: [
        "Create <code>string player = \"Grace\";</code>, <code>int tries = 2;</code> and <code>int conversions = 1;</code>",
        "Using interpolation (<code>$\"...\"</code>), print <code>Grace scored 2 tries and 1 conversion.</code>",
        "In rugby a try is worth 5 points and a conversion 2. Using a calculation inside the braces, print <code>Total points: 12</code>"
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        // TODO: declare player, tries and conversions

        // TODO: print Grace scored 2 tries and 1 conversion. using $"..."

        // TODO: print Total points: 12 (work it out inside the braces)

    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        string player = "Grace";
        int tries = 2;
        int conversions = 1;

        Console.WriteLine($"{player} scored {tries} tries and {conversions} conversion.");
        Console.WriteLine($"Total points: {tries * 5 + conversions * 2}");
    }
}`,
      tests: [
        { type: "output", includes: "Grace scored 2 tries and 1 conversion.", msg: "Print Grace scored 2 tries and 1 conversion." },
        { type: "output", includes: "Total points: 12", msg: "Print Total points: 12" },
        { type: "code", pattern: "\\$\"[^\"]*\\{\\s*player\\s*\\}", msg: "Use interpolation: put {player} inside a $\"...\" string." },
        { type: "code", pattern: "\\{[^}\"]*tries[^}\"]*\\*[^}\"]*\\}|\\{[^}\"]*\\*[^}\"]*tries[^}\"]*\\}", msg: "Work out the total inside the braces, e.g. {tries * 5 + conversions * 2}." }
      ],
      hint: "Console.WriteLine($\"{player} scored {tries} tries ...\"); and for the total: {tries * 5 + conversions * 2}"
    },
    {
      id: "m02-l6",
      title: "Constants and var",
      type: "code",
      learn: cs`<p>Some values should <strong>never</strong> change while a program runs: the number of minutes in an hour, VAT at 20%, the price of a school dinner this term. For these you use a constant.</p>
<div class="key"><strong>Constant</strong> a named value that is set once and cannot be changed while the program runs.</div>
<pre><code class="cs">const double VatRate = 0.2;
const int MaxPlayers = 15;</code></pre>
<p>Add <code>const</code> in front, and you <em>must</em> give it a value straight away. If you try to change it later, the compiler stops you:</p>
<pre><code class="cs">MaxPlayers = 16;   // ✗ The left-hand side of an assignment must be a variable</code></pre>
<p>Why bother? If the dinner price goes up, you change it in <strong>one place</strong> and every calculation updates. It also stops you (or a teammate) changing it by accident. In C#, constants are usually named in PascalCase (capital first letter), like <code>MaxPlayers</code>.</p>
<h3>var</h3>
<p>Sometimes the type is obvious from the value. The keyword <code>var</code> lets C# work out the type for you:</p>
<pre><code class="cs">var lives = 3;          // C# decides: int
var hero = "Aoife";     // C# decides: string
var speed = 2.5;        // C# decides: double</code></pre>
<p>The variable still has a fixed type. <code>lives</code> is an <code>int</code> forever, so <code>lives = "lots";</code> is still an error. For GCSE, writing the type in full is clearer, but you'll see <code>var</code> a lot in real code.</p>
<h3>Scope</h3>
<p>A variable only exists inside the braces <code>{ }</code> where it was declared, from that line onwards. That region is its <strong>scope</strong>. Use a variable before it's declared, or outside its braces, and you'll get <code>The name '...' does not exist in the current context</code>.</p>`,
      instructions: [
        "Declare a constant <code>const decimal DinnerPrice = 2.60m;</code>",
        "Use <code>var</code> to declare <code>days</code> with the value <code>5</code>.",
        "Print <code>A dinner costs £2.60</code> and then <code>5 dinners cost £13.00</code>, using <code>DinnerPrice</code> and <code>days</code> (work out the total with <code>*</code>)."
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        // TODO: constant DinnerPrice (decimal, 2.60m)

        // TODO: var days = 5

        // TODO: print A dinner costs £2.60
        // TODO: print 5 dinners cost £13.00

    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        const decimal DinnerPrice = 2.60m;
        var days = 5;

        Console.WriteLine($"A dinner costs £{DinnerPrice}");
        Console.WriteLine($"{days} dinners cost £{DinnerPrice * days}");
    }
}`,
      tests: [
        { type: "code", pattern: "const\\s+decimal\\s+DinnerPrice\\s*=\\s*2\\.60m", msg: "Declare const decimal DinnerPrice = 2.60m;" },
        { type: "code", pattern: "var\\s+days\\s*=\\s*5\\s*;", msg: "Declare days using var." },
        { type: "outputRegex", pattern: "A dinner costs £2\\.60?", msg: "Print A dinner costs £2.60" },
        { type: "outputRegex", pattern: "5 dinners cost £13(\\.00)?(?!\\d)", msg: "Print 5 dinners cost £13.00" },
        { type: "code", pattern: "DinnerPrice\\s*\\*\\s*days|days\\s*\\*\\s*DinnerPrice", msg: "Calculate the total with DinnerPrice * days." }
      ],
      hint: "A decimal keeps its 2 decimal places, so 2.60m * 5 prints 13.00. Use $\"{days} dinners cost £{DinnerPrice * days}\"."
    },
    {
      id: "m02-quiz",
      title: "Checkpoint: variables and data types",
      type: "quiz",
      questions: [
        { q: "Which data type is best for storing a phone number such as 07700900123?", options: ["int", "double", "string", "bool"], answer: 2, explain: "Phone numbers aren't used in calculations and the leading 0 would be lost in an int." },
        { q: "What does int score = 10; then score = 15; leave in score?", options: ["10", "15", "25", "An error"], answer: 1, explain: "Assignment replaces the old value, so score holds 15." },
        { q: "Which is a correctly declared char?", options: ["char c = \"A\";", "char c = 'A';", "char c = A;", "char c = 'AB';"], answer: 1, explain: "A char holds one character, in single quotes." },
        { q: "Which variable name follows C# camelCase and the naming rules?", options: ["Total Score", "2ndPlace", "totalScore", "total-score"], answer: 2, explain: "camelCase starts lower case and capitalises each following word. Names can't contain spaces or hyphens or start with a digit." },
        { q: "What is a constant?", options: ["A variable that can only hold whole numbers", "A named value that cannot change while the program runs", "Any number typed into the code", "A variable declared with var"], answer: 1, explain: "Constants (const) are set once and can't be reassigned." },
        { q: "What does Console.WriteLine(\"Total: \" + 4 + 6); print?", options: ["Total: 10", "Total: 46", "Total: 4 6", "An error"], answer: 1, explain: "C# works left to right: \"Total: \" + 4 is a string, then 6 is joined on, giving Total: 46." },
        { q: "Which type should you normally use for money in C#?", options: ["int", "decimal", "char", "bool"], answer: 1, explain: "decimal stores pounds and pence exactly; double can have tiny rounding errors." },
        { q: "What does Console.WriteLine($\"Hi {name}\"); need in order to work?", options: ["name must be declared before this line, in scope", "Nothing; it always prints Hi {name}", "name must be a constant", "A + between the parts"], answer: 0, explain: "Interpolation inserts the value of the variable, so name must exist (be in scope) at that point." }
      ]
    }
  ]
});
})();
