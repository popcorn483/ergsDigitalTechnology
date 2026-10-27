// Module 5: Selection
(function () {
  // Wraps a Main body (and optional class-level members) in the full Program shape.
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
  const count = (s, sub) => s.split(sub).length - 1;

  COURSE.addModule({
    id: "m05",
    title: "Selection",
    icon: "branch",
    summary: "Make decisions with if, else if, switch and the ternary operator.",
    lessons: [
      // ---------------------------------------------------------------- l1
      {
        id: "m05-l1",
        title: "Decisions with if and else",
        type: "code",
        learn: `
<p>So far your programs have run every line from top to bottom. Real programs need to make <strong>decisions</strong>: should the game say "You win" or "Game over"? Choosing which code to run is called <strong>selection</strong>.</p>
<div class="key"><strong>Selection</strong> running different code depending on whether a condition is true or false.</div>
<p>An <code>if</code> statement checks a <strong>condition</strong>. If it is <code>true</code>, the code inside the curly brackets runs. An optional <code>else</code> block runs when the condition is <code>false</code>.</p>
<pre><code class="cs">Console.Write("How many lives? ");
int lives = Convert.ToInt32(Console.ReadLine());

if (lives > 0)
{
    Console.WriteLine("Keep playing!");
}
else
{
    Console.WriteLine("Game over.");
}
Console.WriteLine("Thanks for playing.");   // always runs</code></pre>
<h3>Comparison operators</h3>
<table>
<tr><th>Operator</th><th>Meaning</th><th>Example</th></tr>
<tr><td><code>==</code></td><td>equal to</td><td><code>score == 10</code></td></tr>
<tr><td><code>!=</code></td><td>not equal to</td><td><code>answer != "yes"</code></td></tr>
<tr><td><code>&gt;</code></td><td>greater than</td><td><code>temp &gt; 20</code></td></tr>
<tr><td><code>&lt;</code></td><td>less than</td><td><code>age &lt; 12</code></td></tr>
<tr><td><code>&gt;=</code></td><td>greater than or equal to</td><td><code>mark &gt;= 40</code></td></tr>
<tr><td><code>&lt;=</code></td><td>less than or equal to</td><td><code>money &lt;= 0</code></td></tr>
</table>
<div class="warn">One <code>=</code> <em>stores</em> a value. Two <code>==</code> <em>compare</em> values. Writing <code>if (lives = 0)</code> is a compile error in C#.</div>
<div class="tip">Notice there is no semicolon after <code>if (...)</code>. The curly brackets show which lines belong to the <code>if</code>.</div>`,
        instructions: [
          "The starter already reads a whole-number temperature into <code>temp</code>.",
          "If <code>temp</code> is greater than 20, print <code>Shorts weather!</code>",
          "Otherwise (use <code>else</code>) print <code>Bring a jumper!</code>",
          "After the if/else, always print <code>Have a good day.</code>"
        ],
        starter: prog(`
Console.Write("Enter the temperature: ");
int temp = Convert.ToInt32(Console.ReadLine());

// TODO: if temp is greater than 20, print Shorts weather!
// TODO: else print Bring a jumper!

// TODO: always print Have a good day.`),
        solution: prog(`
Console.Write("Enter the temperature: ");
int temp = Convert.ToInt32(Console.ReadLine());

if (temp > 20)
{
    Console.WriteLine("Shorts weather!");
}
else
{
    Console.WriteLine("Bring a jumper!");
}

Console.WriteLine("Have a good day.");`),
        stdin: ["25"],
        tests: [
          { type: "output", stdin: ["25"], includes: "Shorts weather!", msg: "When the temperature is 25 it should print Shorts weather!" },
          { type: "fn", stdin: ["25"], fn: (out) => !/jumper/i.test(out), msg: "When it's 25, don't print Bring a jumper!" },
          { type: "output", stdin: ["20"], includes: "Bring a jumper!", msg: "20 is not greater than 20, so it should print Bring a jumper!" },
          { type: "output", stdin: ["8"], includes: "Have a good day.", msg: "Always print Have a good day. at the end." },
          { type: "code", pattern: "else", msg: "Use an else block." }
        ],
        hint: "if (temp > 20) { ... } else { ... } and then put the last WriteLine after the closing bracket of the else."
      },

      // ---------------------------------------------------------------- l2
      {
        id: "m05-l2",
        title: "else if and grade boundaries",
        type: "code",
        learn: `
<p>When there are more than two possibilities, chain conditions together with <code>else if</code>. C# checks each condition <strong>in order</strong> and runs the <em>first</em> block whose condition is true. Then it skips the rest.</p>
<pre><code class="cs">Console.Write("How many goals? ");
int goals = Convert.ToInt32(Console.ReadLine());

if (goals >= 3)
{
    Console.WriteLine("Hat-trick hero!");
}
else if (goals >= 1)
{
    Console.WriteLine("On the scoresheet.");
}
else
{
    Console.WriteLine("Better luck next time.");
}</code></pre>
<h3>Order matters!</h3>
<p>Imagine Ciarán writes grade boundaries starting with the lowest:</p>
<pre><code class="cs">if (mark >= 40)
{
    Console.WriteLine("Grade D");
}
else if (mark >= 70)
{
    Console.WriteLine("Grade A");   // never reached for 85!
}</code></pre>
<p>A mark of 85 is <code>&gt;= 40</code>, so the first block runs and prints <code>Grade D</code>. The program runs without crashing but gives the wrong answer. That's a <strong>logic error</strong>.</p>
<div class="key"><strong>Logic error</strong> a mistake that lets the program run but makes it produce the wrong result.</div>
<div class="tip">For boundaries, check the <strong>highest</strong> value first and work your way down. The final <code>else</code> catches everything left over.</div>`,
        instructions: [
          "Read a whole-number mark (0 to 100) after the prompt <code>Enter your mark: </code>",
          "Use <code>if</code> / <code>else if</code> / <code>else</code> to print exactly one of: <code>Grade A</code> (70 or more), <code>Grade B</code> (60 or more), <code>Grade C</code> (50 or more), <code>Grade D</code> (40 or more), otherwise <code>Grade U</code>."
        ],
        starter: prog(`
Console.Write("Enter your mark: ");
int mark = Convert.ToInt32(Console.ReadLine());

// TODO: print Grade A, Grade B, Grade C, Grade D or Grade U
// Remember: check the highest boundary first!`),
        solution: prog(`
Console.Write("Enter your mark: ");
int mark = Convert.ToInt32(Console.ReadLine());

if (mark >= 70)
{
    Console.WriteLine("Grade A");
}
else if (mark >= 60)
{
    Console.WriteLine("Grade B");
}
else if (mark >= 50)
{
    Console.WriteLine("Grade C");
}
else if (mark >= 40)
{
    Console.WriteLine("Grade D");
}
else
{
    Console.WriteLine("Grade U");
}`),
        stdin: ["85"],
        tests: [
          { type: "fn", stdin: ["85"], fn: (out) => /Grade A/.test(out) && count(out, "Grade") === 1, msg: "A mark of 85 should print only Grade A." },
          { type: "fn", stdin: ["70"], fn: (out) => /Grade A/.test(out) && count(out, "Grade") === 1, msg: "A mark of exactly 70 is a Grade A." },
          { type: "fn", stdin: ["65"], fn: (out) => /Grade B/.test(out) && count(out, "Grade") === 1, msg: "A mark of 65 should print only Grade B." },
          { type: "fn", stdin: ["50"], fn: (out) => /Grade C/.test(out) && count(out, "Grade") === 1, msg: "A mark of 50 should print only Grade C." },
          { type: "fn", stdin: ["44"], fn: (out) => /Grade D/.test(out) && count(out, "Grade") === 1, msg: "A mark of 44 should print only Grade D." },
          { type: "fn", stdin: ["12"], fn: (out) => /Grade U/.test(out) && count(out, "Grade") === 1, msg: "A mark of 12 should print only Grade U." },
          { type: "code", pattern: "else\\s+if", msg: "Use else if to chain your conditions." }
        ],
        hint: "Start with if (mark >= 70), then else if (mark >= 60), and so on. The last one is a plain else for Grade U."
      },

      // ---------------------------------------------------------------- l3
      {
        id: "m05-l3",
        title: "Logical operators: && || !",
        type: "code",
        learn: `
<p>Sometimes a decision depends on more than one thing. <strong>Logical operators</strong> join conditions together.</p>
<table>
<tr><th>Operator</th><th>Name</th><th>True when…</th></tr>
<tr><td><code>&amp;&amp;</code></td><td>AND</td><td>both conditions are true</td></tr>
<tr><td><code>||</code></td><td>OR</td><td>at least one condition is true</td></tr>
<tr><td><code>!</code></td><td>NOT</td><td>flips true to false and false to true</td></tr>
</table>
<pre><code class="cs">int age = 13;
string ticket = "yes";

if (age >= 12 &amp;&amp; ticket == "yes")
{
    Console.WriteLine("You can watch the film.");
}

string day = "Saturday";
if (day == "Saturday" || day == "Sunday")
{
    Console.WriteLine("No school today!");
}

bool raining = false;
if (!raining)
{
    Console.WriteLine("Let's play outside.");
}</code></pre>
<div class="warn">You must write the full condition on both sides. <code>if (day == "Saturday" || "Sunday")</code> is a compile error. Write <code>day == "Saturday" || day == "Sunday"</code>.</div>
<div class="tip">You can check a range like this: <code>age &lt; 11 || age &gt; 18</code> is true when the age is <em>outside</em> 11 to 18, and <code>age &gt;= 11 &amp;&amp; age &lt;= 18</code> is true when it's <em>inside</em>.</div>`,
        instructions: [
          "The starter reads an <code>age</code> and an answer <code>slip</code> (<code>yes</code> or <code>no</code>).",
          "If the age is 14 or over <strong>and</strong> <code>slip</code> is <code>yes</code>, print <code>You can go on the rugby trip!</code> Otherwise print <code>Sorry, you can't go this time.</code>",
          "Then, in a separate <code>if</code>, if the age is less than 11 <strong>or</strong> greater than 18, also print <code>Age not valid for this school.</code>"
        ],
        starter: prog(`
Console.Write("Enter your age: ");
int age = Convert.ToInt32(Console.ReadLine());
Console.Write("Do you have a permission slip? (yes/no) ");
string slip = Console.ReadLine();

// TODO: use && to check age >= 14 AND slip is "yes"

// TODO: use || to check whether the age is less than 11 OR greater than 18`),
        solution: prog(`
Console.Write("Enter your age: ");
int age = Convert.ToInt32(Console.ReadLine());
Console.Write("Do you have a permission slip? (yes/no) ");
string slip = Console.ReadLine();

if (age >= 14 && slip == "yes")
{
    Console.WriteLine("You can go on the rugby trip!");
}
else
{
    Console.WriteLine("Sorry, you can't go this time.");
}

if (age < 11 || age > 18)
{
    Console.WriteLine("Age not valid for this school.");
}`),
        stdin: ["15", "yes"],
        tests: [
          { type: "output", stdin: ["15", "yes"], includes: "You can go on the rugby trip!", msg: "Age 15 with a slip should be allowed on the trip." },
          { type: "output", stdin: ["15", "no"], includes: "Sorry, you can't go this time.", msg: "Age 15 without a slip should not be allowed." },
          { type: "fn", stdin: ["12", "yes"], fn: (out) => /Sorry, you can't go/.test(out) && !/Age not valid/.test(out), msg: "Age 12 with a slip is too young for the trip (but is a valid age)." },
          { type: "output", stdin: ["20", "yes"], includes: "Age not valid for this school.", msg: "Age 20 should also print Age not valid for this school." },
          { type: "code", pattern: "&&[\\s\\S]*\\|\\||\\|\\|[\\s\\S]*&&", msg: "Use both && and ||." }
        ],
        hint: "if (age >= 14 && slip == \"yes\") { ... } else { ... }  then  if (age < 11 || age > 18) { ... }"
      },

      // ---------------------------------------------------------------- l4
      {
        id: "m05-l4",
        title: "Nested if statements",
        type: "code",
        learn: `
<p>You can put an <code>if</code> <em>inside</em> another <code>if</code>. This is called a <strong>nested if</strong>. The inner question is only asked if the outer condition is true.</p>
<pre><code class="cs">Console.Write("Do you have a ticket? (yes/no) ");
string ticket = Console.ReadLine();

if (ticket == "yes")
{
    Console.Write("Is it a VIP ticket? (yes/no) ");
    string vip = Console.ReadLine();

    if (vip == "yes")
    {
        Console.WriteLine("Head to the front row!");
    }
    else
    {
        Console.WriteLine("Find any free seat.");
    }
}
else
{
    Console.WriteLine("Please buy a ticket first.");
}</code></pre>
<p>Notice how Grace only gets asked about VIP if she has a ticket at all. Nested ifs are useful when one decision only makes sense after another.</p>
<div class="tip">Indent each level by four spaces. Visual Studio does this for you, and it makes it much easier to see which <code>else</code> belongs to which <code>if</code>.</div>
<div class="warn">Every <code>{</code> needs a matching <code>}</code>. If you get a strange error, count your brackets!</div>`,
        instructions: [
          "Ask <code>Is it raining? (yes/no) </code> and read the answer.",
          "If it is raining, ask <code>Is it windy? (yes/no) </code>. If it's windy print <code>Stay inside and play board games.</code>, otherwise print <code>Take an umbrella.</code>",
          "If it is not raining, print <code>Go to the park!</code> (don't ask about wind)."
        ],
        starter: prog(`
Console.Write("Is it raining? (yes/no) ");
string raining = Console.ReadLine();

// TODO: if raining is "yes"
//     ask "Is it windy? (yes/no) " and read the answer
//     use a nested if to choose the right message
// TODO: else print Go to the park!`),
        solution: prog(`
Console.Write("Is it raining? (yes/no) ");
string raining = Console.ReadLine();

if (raining == "yes")
{
    Console.Write("Is it windy? (yes/no) ");
    string windy = Console.ReadLine();

    if (windy == "yes")
    {
        Console.WriteLine("Stay inside and play board games.");
    }
    else
    {
        Console.WriteLine("Take an umbrella.");
    }
}
else
{
    Console.WriteLine("Go to the park!");
}`),
        stdin: ["yes", "yes"],
        tests: [
          { type: "output", stdin: ["yes", "yes"], includes: "Stay inside and play board games.", msg: "Raining and windy: Stay inside and play board games." },
          { type: "output", stdin: ["yes", "no"], includes: "Take an umbrella.", msg: "Raining but not windy: Take an umbrella." },
          { type: "fn", stdin: ["no"], fn: (out) => /Go to the park!/.test(out) && !/windy/i.test(out), msg: "Not raining: print Go to the park! and don't ask about wind." },
          { type: "code", pattern: "if[\\s\\S]*\\{[\\s\\S]*if\\s*\\(", msg: "Put one if inside another (a nested if)." }
        ],
        hint: "The windy question and its if/else go inside the curly brackets of if (raining == \"yes\")."
      },

      // ---------------------------------------------------------------- l5
      {
        id: "m05-l5",
        title: "switch statements",
        type: "code",
        learn: `
<p>When you compare one variable against lots of exact values, a long <code>else if</code> chain gets messy. A <code>switch</code> statement is tidier.</p>
<pre><code class="cs">Console.Write("Pick a house (1-3): ");
int house = Convert.ToInt32(Console.ReadLine());

switch (house)
{
    case 1:
        Console.WriteLine("Lions");
        break;
    case 2:
        Console.WriteLine("Tigers");
        break;
    case 3:
        Console.WriteLine("Eagles");
        break;
    default:
        Console.WriteLine("No such house");
        break;
}</code></pre>
<ul>
<li>Each <code>case</code> is a value to match. It must end with <code>break;</code></li>
<li><code>default</code> runs if no case matches, like a final <code>else</code>.</li>
<li>You can switch on <code>int</code>, <code>string</code> and <code>char</code> values.</li>
</ul>
<p>Several cases can share one block. Just stack the labels:</p>
<pre><code class="cs">switch (pet)
{
    case "dog":
    case "cat":
        Console.WriteLine("A classic choice!");
        break;
    default:
        Console.WriteLine("How unusual!");
        break;
}</code></pre>
<div class="warn">String cases are case-sensitive: <code>"Dog"</code> does not match <code>case "dog":</code>.</div>
<p>When should you choose <code>switch</code> over <code>if</code>? Use <code>switch</code> when you are checking <strong>one</strong> variable against a list of exact values, like menu choices or days of the week. Use <code>if</code> / <code>else if</code> when you need ranges (<code>mark &gt;= 70</code>) or conditions involving several variables.</p>`,
        instructions: [
          "Ask <code>Enter meal number (1-4): </code> and use a <code>switch</code> to print <code>You chose: Pizza</code> (1), <code>You chose: Pasta bake</code> (2), <code>You chose: Chicken curry</code> (3) or <code>You chose: Jacket potato</code> (4). For any other number print <code>Not on the menu</code>.",
          "Then ask <code>Enter a day: </code> and use a second <code>switch</code> on the string: <code>Saturday</code> and <code>Sunday</code> share one block that prints <code>Weekend!</code>; the <code>default</code> prints <code>School day</code>."
        ],
        starter: prog(`
Console.Write("Enter meal number (1-4): ");
int meal = Convert.ToInt32(Console.ReadLine());

// TODO: switch (meal) with case 1, 2, 3, 4 and default

Console.Write("Enter a day: ");
string day = Console.ReadLine();

// TODO: switch (day) - Saturday and Sunday print Weekend!, default prints School day`),
        solution: prog(`
Console.Write("Enter meal number (1-4): ");
int meal = Convert.ToInt32(Console.ReadLine());

switch (meal)
{
    case 1:
        Console.WriteLine("You chose: Pizza");
        break;
    case 2:
        Console.WriteLine("You chose: Pasta bake");
        break;
    case 3:
        Console.WriteLine("You chose: Chicken curry");
        break;
    case 4:
        Console.WriteLine("You chose: Jacket potato");
        break;
    default:
        Console.WriteLine("Not on the menu");
        break;
}

Console.Write("Enter a day: ");
string day = Console.ReadLine();

switch (day)
{
    case "Saturday":
    case "Sunday":
        Console.WriteLine("Weekend!");
        break;
    default:
        Console.WriteLine("School day");
        break;
}`),
        stdin: ["2", "Monday"],
        tests: [
          { type: "output", stdin: ["2", "Monday"], includes: "You chose: Pasta bake", msg: "Meal 2 should print You chose: Pasta bake" },
          { type: "output", stdin: ["2", "Monday"], includes: "School day", msg: "Monday should print School day" },
          { type: "output", stdin: ["4", "Saturday"], includes: "You chose: Jacket potato", msg: "Meal 4 should print You chose: Jacket potato" },
          { type: "fn", stdin: ["9", "Sunday"], fn: (out) => /Not on the menu/.test(out) && /Weekend!/.test(out) && !/School day/.test(out), msg: "Meal 9 should print Not on the menu, and Sunday should print Weekend!" },
          { type: "code", pattern: "switch\\s*\\([\\s\\S]*switch\\s*\\(", msg: "Use two switch statements." },
          { type: "code", pattern: "default\\s*:", msg: "Include a default case." }
        ],
        hint: "For the day switch, put case \"Saturday\": and case \"Sunday\": on two lines straight after each other, then the WriteLine and break."
      },

      // ---------------------------------------------------------------- l6
      {
        id: "m05-l6",
        title: "The ternary operator",
        type: "code",
        learn: `
<p>Sometimes you just want to pick between two <em>values</em>. Writing a whole if/else for that feels long-winded:</p>
<pre><code class="cs">string result;
if (score >= 50)
{
    result = "Pass";
}
else
{
    result = "Fail";
}</code></pre>
<p>The <strong>ternary operator</strong> <code>? :</code> does the same thing in one line:</p>
<pre><code class="cs">string result = score >= 50 ? "Pass" : "Fail";</code></pre>
<p>Read it as: <em>"Is score &gt;= 50? If so, use "Pass", otherwise use "Fail"."</em></p>
<pre><code class="cs">condition ? valueIfTrue : valueIfFalse</code></pre>
<p>It's great for little wording changes, like plurals:</p>
<pre><code class="cs">int pets = 1;
string word = pets == 1 ? "pet" : "pets";
Console.WriteLine($"Oisín has {pets} {word}.");   // Oisín has 1 pet.</code></pre>
<div class="tip">To test whether a number is even, use the remainder operator: <code>n % 2 == 0</code> is true for even numbers.</div>
<div class="warn">Only use the ternary operator for simple choices between two values. If you need to <em>do</em> several things, a normal if/else is clearer.</div>`,
        instructions: [
          "Read a whole number <code>n</code> after the prompt <code>Enter a number: </code>",
          "Use the ternary operator to set a string to <code>even</code> or <code>odd</code>, then print it like <code>7 is odd</code>",
          "Use the ternary operator again to choose <code>item</code> or <code>items</code>, then print like <code>You have 7 items</code> (or <code>You have 1 item</code> when n is 1)."
        ],
        starter: prog(`
Console.Write("Enter a number: ");
int n = Convert.ToInt32(Console.ReadLine());

// TODO: string type = ... ? "even" : "odd";
// TODO: print e.g. 7 is odd

// TODO: string word = ... ? "item" : "items";
// TODO: print e.g. You have 7 items`),
        solution: prog(`
Console.Write("Enter a number: ");
int n = Convert.ToInt32(Console.ReadLine());

string type = n % 2 == 0 ? "even" : "odd";
Console.WriteLine($"{n} is {type}");

string word = n == 1 ? "item" : "items";
Console.WriteLine($"You have {n} {word}");`),
        stdin: ["7"],
        tests: [
          { type: "output", stdin: ["7"], includes: "7 is odd", msg: "For 7 print 7 is odd" },
          { type: "output", stdin: ["4"], includes: "4 is even", msg: "For 4 print 4 is even" },
          { type: "output", stdin: ["7"], includes: "You have 7 items", msg: "For 7 print You have 7 items" },
          { type: "outputRegex", stdin: ["1"], pattern: "You have 1 item(?!s)", msg: "For 1 print You have 1 item (no s)." },
          { type: "code", pattern: "\\?[^;]*:", msg: "Use the ternary operator ( ? : )." }
        ],
        hint: "string type = n % 2 == 0 ? \"even\" : \"odd\";  then  Console.WriteLine($\"{n} is {type}\");"
      },

      // ---------------------------------------------------------------- l7
      {
        id: "m05-l7",
        title: "Constants and a login check",
        type: "code",
        learn: `
<p>Some values should <strong>never change</strong> while a program runs: the pass mark, the price of a ticket, the correct password. Declare these with <code>const</code>.</p>
<pre><code class="cs">const int PassMark = 40;
const double TicketPrice = 6.50;</code></pre>
<div class="key"><strong>Constant</strong> a named value that is set once and cannot be changed while the program runs.</div>
<p>If you try to change a constant later, for example <code>PassMark = 30;</code>, C# gives a compile error. That protects you from changing it by accident. Constants also make code easier to read and update: change the value in one place and every use changes too.</p>
<h3>A simple login</h3>
<pre><code class="cs">const string CorrectPin = "4821";

Console.Write("Enter PIN: ");
string pin = Console.ReadLine();

if (pin == CorrectPin)
{
    Console.WriteLine("Unlocked!");
}
else
{
    Console.WriteLine("Wrong PIN.");
}</code></pre>
<div class="tip">Comparing strings with <code>==</code> is <strong>case-sensitive</strong>: <code>"Coach"</code> is not the same as <code>"coach"</code>. That's what you want for passwords.</div>
<div class="warn">Real systems never store passwords in plain text like this. You'll see a safer way (hashing) later in the course.</div>`,
        instructions: [
          "Declare two constants: <code>Username</code> set to <code>coach</code> and <code>Password</code> set to <code>Scrum2026</code>.",
          "Ask <code>Username: </code> and <code>Password: </code> and read both.",
          "If both match, print <code>Access granted. Welcome, coach!</code>, otherwise print <code>Access denied.</code>"
        ],
        starter: prog(`
// TODO: declare const string Username and const string Password

Console.Write("Username: ");
string user = Console.ReadLine();
Console.Write("Password: ");
string pass = Console.ReadLine();

// TODO: check BOTH match using &&`),
        solution: prog(`
const string Username = "coach";
const string Password = "Scrum2026";

Console.Write("Username: ");
string user = Console.ReadLine();
Console.Write("Password: ");
string pass = Console.ReadLine();

if (user == Username && pass == Password)
{
    Console.WriteLine("Access granted. Welcome, coach!");
}
else
{
    Console.WriteLine("Access denied.");
}`),
        stdin: ["coach", "Scrum2026"],
        tests: [
          { type: "output", stdin: ["coach", "Scrum2026"], includes: "Access granted. Welcome, coach!", msg: "coach / Scrum2026 should be granted access." },
          { type: "fn", stdin: ["coach", "password"], fn: (out) => /Access denied\./.test(out) && !/granted/i.test(out), msg: "A wrong password should print Access denied." },
          { type: "fn", stdin: ["Coach", "Scrum2026"], fn: (out) => /Access denied\./.test(out) && !/granted/i.test(out), msg: "Usernames are case-sensitive: Coach should be denied." },
          { type: "code", pattern: "const\\s+string", msg: "Store the username and password in const variables." }
        ],
        hint: "const string Username = \"coach\";  and then  if (user == Username && pass == Password)"
      },

      // ---------------------------------------------------------------- l8
      {
        id: "m05-l8",
        title: "Mini-project: cinema tickets",
        type: "code",
        learn: `
<p>Time to put it all together! Your local cinema wants a program to work out ticket prices.</p>
<h3>The pricing rules</h3>
<table>
<tr><th>Customer</th><th>Price</th></tr>
<tr><td>Under 12</td><td>£5.00</td></tr>
<tr><td>12 to 17</td><td>£6.50</td></tr>
<tr><td>65 or over</td><td>£5.50</td></tr>
<tr><td>Everyone else (adults)</td><td>£9.00</td></tr>
<tr><td><strong>Any age on a Tuesday</strong></td><td>£4.00</td></tr>
</table>
<h3>Plan before you code</h3>
<ol>
<li>Read the age (int) and the day (string).</li>
<li>Declare <code>double price;</code></li>
<li>Check the <strong>special case</strong> first: is it Tuesday?</li>
<li>Otherwise work through the age bands. Think carefully about the order: if you check <code>age &gt;= 18</code> before <code>age &gt;= 65</code>, pensioners will pay the adult price. That's a logic error!</li>
<li>Print the price with two decimal places.</li>
</ol>
<pre><code class="cs">double price = 6.5;
Console.WriteLine($"Your ticket costs £{price:F2}");
// Your ticket costs £6.50</code></pre>
<p>Testing with values right on the edge of a band is called <strong>boundary testing</strong>. Most selection bugs hide at the boundaries: a <code>&lt;</code> that should have been <code>&lt;=</code> only shows up when you try exactly 12 or exactly 17.</p>
<div class="tip">Test every branch! Good test data for this program includes ages 11, 12, 17, 18, 64 and 65 (the <strong>boundaries</strong>), plus a Tuesday.</div>`,
        instructions: [
          "Ask <code>Enter your age: </code> and <code>Enter the day: </code> and read both.",
          "Work out the price using the rules in the table (Tuesday is always £4.00).",
          "Print the result like <code>Your ticket costs £9.00</code> (two decimal places)."
        ],
        starter: prog(`
Console.Write("Enter your age: ");
int age = Convert.ToInt32(Console.ReadLine());
Console.Write("Enter the day: ");
string day = Console.ReadLine();

double price;

// TODO: if day is "Tuesday" the price is 4.00
// TODO: else if ... work through the age bands (careful with the order!)

price = 0; // TODO: remove this line once your if statements set the price

Console.WriteLine($"Your ticket costs £{price:F2}");`),
        solution: prog(`
Console.Write("Enter your age: ");
int age = Convert.ToInt32(Console.ReadLine());
Console.Write("Enter the day: ");
string day = Console.ReadLine();

double price;

if (day == "Tuesday")
{
    price = 4.00;
}
else if (age < 12)
{
    price = 5.00;
}
else if (age <= 17)
{
    price = 6.50;
}
else if (age >= 65)
{
    price = 5.50;
}
else
{
    price = 9.00;
}

Console.WriteLine($"Your ticket costs £{price:F2}");`),
        stdin: ["30", "Monday"],
        tests: [
          { type: "output", stdin: ["10", "Friday"], includes: "Your ticket costs £5.00", msg: "A 10-year-old on Friday pays £5.00" },
          { type: "output", stdin: ["17", "Saturday"], includes: "Your ticket costs £6.50", msg: "A 17-year-old on Saturday pays £6.50" },
          { type: "output", stdin: ["30", "Monday"], includes: "Your ticket costs £9.00", msg: "A 30-year-old on Monday pays £9.00" },
          { type: "output", stdin: ["70", "Sunday"], includes: "Your ticket costs £5.50", msg: "A 70-year-old on Sunday pays £5.50 (check your order!)" },
          { type: "output", stdin: ["30", "Tuesday"], includes: "Your ticket costs £4.00", msg: "Everyone pays £4.00 on a Tuesday." }
        ],
        hint: "Check Tuesday first, then age < 12, then age <= 17, then age >= 65, and finally else for adults."
      },

      // ---------------------------------------------------------------- quiz
      {
        id: "m05-quiz",
        title: "Checkpoint: selection",
        type: "quiz",
        questions: [
          { q: "What is <strong>selection</strong> in programming?",
            options: ["Repeating code several times", "Choosing which code to run based on a condition", "Picking an item from an array", "Storing a value in a variable"],
            answer: 1, explain: "Selection uses conditions (if, switch) to decide which code runs." },
          { q: "Which line correctly checks whether <code>score</code> equals 10?",
            options: ["if (score = 10)", "if (score == 10)", "if score == 10", "if (score => 10)"],
            answer: 1, explain: "Two equals signs compare; one equals sign assigns. The condition must be in brackets." },
          { q: "A program checks <code>if (mark &gt;= 40)</code> for Grade D <em>before</em> <code>else if (mark &gt;= 70)</code> for Grade A. What does a mark of 85 get?",
            options: ["Grade A", "Grade D", "A compile error", "Nothing is printed"],
            answer: 1, explain: "85 >= 40 is true, so the first block runs and the rest are skipped. This is a logic error: check the highest boundary first." },
          { q: "If <code>x = 5</code>, which condition is <strong>true</strong>?",
            options: ["x > 3 && x < 5", "x > 3 || x < 0", "!(x == 5)", "x != 5"],
            answer: 1, explain: "With || only one side needs to be true, and x > 3 is true." },
          { q: "What is the value of <code>s</code>?", code: "int age = 15;\nstring s = age >= 18 ? \"Adult\" : \"Junior\";",
            options: ["Adult", "Junior", "True", "15"],
            answer: 1, explain: "15 >= 18 is false, so the ternary operator picks the second value, \"Junior\"." },
          { q: "In a <code>switch</code> statement, when does the <code>default</code> block run?",
            options: ["Always, at the end", "Only for the first case", "When none of the cases match", "When the value is 0"],
            answer: 2, explain: "default is like the final else: it runs when no case matches." },
          { q: "What happens if you try to change a <code>const</code> after it is declared?",
            options: ["It changes as normal", "The program crashes when it runs", "You get a compile error", "The new value is ignored silently"],
            answer: 2, explain: "Constants can't be assigned to again, so C# refuses to compile the program." }
        ]
      }
    ]
  });
})();
