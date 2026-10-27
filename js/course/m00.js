// Module 0: Welcome to programming
(function () {
const cs = String.raw;

COURSE.addModule({
  id: "m00",
  title: "Welcome to programming",
  icon: "rocket",
  summary: "Find out what programs and algorithms are, how this site works, and write your very first C# program.",
  lessons: [
    {
      id: "m00-l1",
      title: "What is programming?",
      type: "read",
      learn: cs`<p>Every app on your phone, every game you play and every website you visit is a <strong>program</strong>: a list of instructions that a computer follows, one after another. Programming is simply the skill of writing those instructions.</p>
<div class="key"><strong>Algorithm</strong> a precise, step-by-step set of instructions for solving a problem. A program is an algorithm written in a language the computer can run.</div>
<h3>The three building blocks</h3>
<p>Almost every algorithm ever written is built from just three ideas. You will meet all of them in this course and in your GCSE exam:</p>
<ul>
<li><strong>Sequence</strong> – instructions run in order, top to bottom. Put the kettle on, <em>then</em> pour the water.</li>
<li><strong>Selection</strong> – the program makes a decision. <em>If</em> it is raining in Enniskillen, take a coat, <em>otherwise</em> wear a hoodie.</li>
<li><strong>Iteration</strong> – something is repeated. Run five laps of the rugby pitch, or <em>keep</em> asking for a password until it is correct.</li>
</ul>
<h3>How does a computer run code?</h3>
<p>A computer's processor (CPU) only understands machine code: patterns of 1s and 0s. Writing that by hand would be painful, so we use a <strong>high-level language</strong> that looks a bit like English. A translator (for C#, a <strong>compiler</strong>) turns your code into something the processor can execute. If your code breaks the rules of the language, the compiler refuses and gives you an error message instead.</p>
<h3>C# and Visual Studio</h3>
<p><strong>C#</strong> (say "C sharp") is a popular high-level language made by Microsoft. It is used for Windows apps, websites and lots of games built with the Unity engine. In school you will probably write C# in <strong>Visual Studio</strong>, an IDE (Integrated Development Environment): one program that gives you an editor, a compiler and tools for finding bugs, all in one place.</p>
<p>On this site you don't need to install anything. You type real C# in your browser, press <strong>Run</strong> to see what it does, and press <strong>Check</strong> to find out if you have completed the task. Everything you learn here works the same way in Visual Studio.</p>
<div class="tip">Programmers make mistakes all the time. Getting errors is normal and is how you learn. The skill is reading the error and fixing it calmly.</div>`
    },
    {
      id: "m00-l2",
      title: "How C# Academy works",
      type: "code",
      learn: cs`<p>Let's get to know the screen before you write any code.</p>
<ul>
<li><strong>Learn pane</strong> (this one) – explains the new idea, with a worked example.</li>
<li><strong>Instructions</strong> – the numbered task you need to complete. Read them carefully: the exact words you need to print are always given.</li>
<li><strong>Editor</strong> – where you type your C#. It already contains some <em>starter code</em> to get you going.</li>
<li><strong>Run</strong> – runs your program and shows the result in the <strong>console</strong> (the black output box). If your program asks a question, you type the answer into the console and press Enter.</li>
<li><strong>Check</strong> – runs your program against some automatic tests. If everything passes, the lesson is marked complete. If not, it tells you what is missing.</li>
<li><strong>Hint</strong> – stuck? A hint nudges you in the right direction.</li>
</ul>
<p>The starter code for this lesson already prints a message. Here is the important line:</p>
<pre><code class="cs">Console.WriteLine("Welcome to C# Academy!");</code></pre>
<p><code>Console.WriteLine</code> tells the computer to write some text on the console and then move to a new line. The text goes inside brackets and double quotes, and the line ends with a semicolon <code>;</code>.</p>
<p>To print a second message you just add another line underneath, using exactly the same pattern:</p>
<pre><code class="cs">Console.WriteLine("Welcome to C# Academy!");
Console.WriteLine("Let's go!");</code></pre>
<p>When you run that, you will see:</p>
<pre><code>Welcome to C# Academy!
Let's go!</code></pre>
<div class="tip">You can press Run as often as you like. Nothing breaks, and nobody sees your mistakes. Experiment!</div>`,
      instructions: [
        "Press <strong>Run</strong> and look at the console to see what the starter code prints.",
        "Underneath the existing line, add a new line that prints <code>I am ready to code!</code>",
        "Press <strong>Check</strong> to complete the lesson."
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("Welcome to C# Academy!");
        // TODO: add a line here that prints I am ready to code!
    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("Welcome to C# Academy!");
        Console.WriteLine("I am ready to code!");
    }
}`,
      tests: [
        { type: "output", includes: "Welcome to C# Academy!", msg: "Keep the line that prints Welcome to C# Academy!" },
        { type: "output", includes: "I am ready to code!", msg: "Print I am ready to code! (check the spelling and the exclamation mark)." },
        { type: "outputRegex", pattern: "Welcome to C# Academy![\\s\\S]*I am ready to code!", msg: "Print I am ready to code! after the welcome message." }
      ],
      hint: "Copy the existing Console.WriteLine line, paste it underneath and change the words inside the quotes."
    },
    {
      id: "m00-l3",
      title: "Hello, World!",
      type: "code",
      learn: cs`<p>There is a tradition in programming: the first program you write in any new language prints <code>Hello, World!</code>. Programmers have been doing this since the 1970s, so you are joining a long line of coders.</p>
<p>Here is a complete C# program that does it:</p>
<pre><code class="cs">using System;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("Hello, World!");
    }
}</code></pre>
<p>Most of that is the "frame" every C# program needs (you will look at it closely in the next lesson). The part that actually does something is the line in the middle. Let's break it down:</p>
<table>
<tr><th>Part</th><th>Meaning</th></tr>
<tr><td><code>Console</code></td><td>the text window your program talks to</td></tr>
<tr><td><code>.WriteLine</code></td><td>write a line of text, then move to the next line</td></tr>
<tr><td><code>( )</code></td><td>brackets hold the thing you want to write</td></tr>
<tr><td><code>"Hello, World!"</code></td><td>a <strong>string</strong>: text inside double quotes, printed exactly as typed</td></tr>
<tr><td><code>;</code></td><td>marks the end of the statement, like a full stop</td></tr>
</table>
<p>Text inside the quotes is printed <em>exactly</em> as you type it, including capital letters, spaces and punctuation. The computer won't fix your spelling for you!</p>
<p>Lines of code run in <strong>sequence</strong>: top to bottom, one at a time. So this:</p>
<pre><code class="cs">Console.WriteLine("Ready");
Console.WriteLine("Steady");
Console.WriteLine("Go!");</code></pre>
<p>always prints <code>Ready</code>, then <code>Steady</code>, then <code>Go!</code>, each on its own line.</p>`,
      instructions: [
        "Inside <code>Main</code>, print <code>Hello, World!</code>",
        "On the next line, print <code>This is my first C# program.</code>"
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        // TODO: print Hello, World!

        // TODO: print This is my first C# program.

    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("Hello, World!");
        Console.WriteLine("This is my first C# program.");
    }
}`,
      tests: [
        { type: "output", includes: "Hello, World!", msg: "Print Hello, World! (with a comma and an exclamation mark)." },
        { type: "output", includes: "This is my first C# program.", msg: "Print This is my first C# program." },
        { type: "outputRegex", pattern: "Hello, World![\\s\\S]*This is my first C# program\\.", msg: "Print Hello, World! first, then the second line." },
        { type: "code", pattern: "Console\\.WriteLine\\(", msg: "Use Console.WriteLine to print." }
      ],
      hint: "You need two lines, each like Console.WriteLine(\"...\"); Don't forget the semicolons."
    },
    {
      id: "m00-l4",
      title: "Anatomy of a C# program",
      type: "code",
      learn: cs`<p>Let's look properly at the "frame" around your code. Every C# program you write in Visual Studio has this shape:</p>
<pre><code class="cs">using System;            // lets us use Console without typing System.Console

namespace PetShop        // optional: groups your classes together
{
    class Program        // a class is a container for code
    {
        static void Main(string[] args)   // the program starts here
        {
            Console.WriteLine("Feed the cat");
            Console.WriteLine("Walk the dog");
        }
    }
}</code></pre>
<ul>
<li><code>using System;</code> gives you access to built-in tools like <code>Console</code>.</li>
<li><code>namespace</code> is optional. Visual Studio adds one for you; you can leave it out on this site.</li>
<li><code>class Program</code> – all C# code lives inside a class.</li>
<li><code>static void Main(string[] args)</code> – the <strong>entry point</strong>. When you press Run, the computer starts at the first line inside <code>Main</code>.</li>
<li><strong>Statements</strong> are single instructions. Each one ends with a semicolon <code>;</code></li>
<li><strong>Braces</strong> <code>{ }</code> group code into blocks. Every <code>{</code> needs a matching <code>}</code>. Indenting the code inside makes it easy to see which braces match.</li>
</ul>
<div class="warn"><strong>C# is case sensitive.</strong> <code>Console</code> and <code>console</code> are different words to the computer. <code>WriteLine</code> works; <code>writeline</code> is an error. Even <code>Main</code> must have a capital M.</div>
<p>The rules about how code must be written (semicolons, brackets, capital letters) are called the language's <strong>syntax</strong>. Break them and you get a <strong>syntax error</strong>.</p>
<p>An algorithm written as a sequence of statements is a bit like a recipe: each step happens in order.</p>`,
      instructions: [
        "Write an algorithm for making toast as a <strong>sequence</strong> of three statements inside <code>Main</code>.",
        "Print exactly these three lines, in this order: <code>1. Put bread in the toaster</code>, <code>2. Wait until it pops up</code>, <code>3. Spread the butter</code>"
      ],
      starter: cs`using System;

namespace Kitchen
{
    class Program
    {
        static void Main(string[] args)
        {
            // TODO: print the three steps for making toast, in order

        }
    }
}`,
      solution: cs`using System;

namespace Kitchen
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("1. Put bread in the toaster");
            Console.WriteLine("2. Wait until it pops up");
            Console.WriteLine("3. Spread the butter");
        }
    }
}`,
      tests: [
        { type: "output", includes: "1. Put bread in the toaster", msg: "Print 1. Put bread in the toaster" },
        { type: "output", includes: "2. Wait until it pops up", msg: "Print 2. Wait until it pops up" },
        { type: "output", includes: "3. Spread the butter", msg: "Print 3. Spread the butter" },
        { type: "outputRegex", pattern: "1\\. Put[\\s\\S]*2\\. Wait[\\s\\S]*3\\. Spread", msg: "The steps must be in the right order: 1, 2, 3." }
      ],
      hint: "Three Console.WriteLine statements, one per step, each ending with a semicolon. Keep them inside the braces of Main."
    },
    {
      id: "m00-l5",
      title: "Reading error messages",
      type: "code",
      starterHasError: true,             // deliberate: the starter contains two syntax errors to fix
      learn: cs`<p>Errors are not a sign that you are bad at programming. Professional developers see them all day! There are three kinds you need to know for GCSE:</p>
<div class="key"><strong>Syntax error</strong> the code breaks the rules of the language (e.g. a missing semicolon), so it won't run at all.</div>
<div class="key"><strong>Run-time error</strong> the code starts running but crashes part-way, e.g. dividing by zero.</div>
<div class="key"><strong>Logic error</strong> the program runs without crashing but gives the wrong result.</div>
<h3>Reading a syntax error</h3>
<p>When your code has a syntax error, the console shows a message like this:</p>
<pre><code>Line 7: ; expected</code></pre>
<p>It tells you two things: <strong>where</strong> (line 7) and <strong>what</strong> (a semicolon is missing). Sometimes the real mistake is at the end of the line <em>before</em> the one reported, so look just above too.</p>
<p>Another common one:</p>
<pre><code>Line 8: The name 'console' does not exist in the current context</code></pre>
<p>This means the computer doesn't recognise a word. Usually it's a spelling or capital-letter mistake: it should be <code>Console</code>.</p>
<h3>A good debugging routine</h3>
<ol>
<li>Read the <em>first</em> error message carefully. Fix that one only.</li>
<li>Run again. One fix often makes other errors disappear.</li>
<li>Check: semicolons, matching quotes <code>" "</code>, matching brackets <code>( )</code> and braces <code>{ }</code>, capital letters.</li>
</ol>
<pre><code class="cs">Console.WriteLine("Training is cancelled")   // ✗ missing ;
Console.WriteLine("Training is cancelled");  // ✓</code></pre>
<div class="tip">This starter code has been broken on purpose. Press Run first and read what the error message says before you change anything.</div>`,
      instructions: [
        "Press <strong>Run</strong> and read the error message. Which line does it point to?",
        "Fix all the syntax errors (there are two) so that the program prints <code>Rugby training is at 3:30.</code> and then <code>Bring your gum shield!</code>"
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("Rugby training is at 3:30.")
        console.WriteLine("Bring your gum shield!");
    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("Rugby training is at 3:30.");
        Console.WriteLine("Bring your gum shield!");
    }
}`,
      tests: [
        { type: "output", includes: "Rugby training is at 3:30.", msg: "Print Rugby training is at 3:30." },
        { type: "output", includes: "Bring your gum shield!", msg: "Print Bring your gum shield!" },
        { type: "code", pattern: "3:30\\.\"\\s*\\)\\s*;", msg: "Add the missing semicolon at the end of the first WriteLine." }
      ],
      hint: "Line 7 is missing something at the very end. On line 8, C# is case sensitive: is it console or Console?"
    },
    {
      id: "m00-l6",
      title: "Fixing a logic error",
      type: "code",
      learn: cs`<p>A <strong>logic error</strong> is sneakier than a syntax error. The program runs perfectly happily, but it does the wrong thing. The computer can't spot it for you, because as far as C# is concerned, your code is fine!</p>
<p>Because statements run in <strong>sequence</strong>, getting the order wrong is a classic logic error. Look at Ciarán's morning routine:</p>
<pre><code class="cs">Console.WriteLine("Put on shoes");
Console.WriteLine("Put on socks");</code></pre>
<p>No error message, but anyone who follows it will have a bad day. Swapping the two lines fixes it:</p>
<pre><code class="cs">Console.WriteLine("Put on socks");
Console.WriteLine("Put on shoes");</code></pre>
<h3>How to find logic errors</h3>
<ul>
<li><strong>Know what you expect.</strong> Before you run a program, decide what the correct output should be.</li>
<li><strong>Compare.</strong> Run it and compare the actual output with what you expected, line by line.</li>
<li><strong>Trace it.</strong> Read the code one line at a time, like the computer does, and write down what happens. This is called a <em>dry run</em> and you'll use it in your exam with trace tables.</li>
</ul>
<div class="tip">In the editor you can move a line by cutting it (Ctrl+X) and pasting it (Ctrl+V) where it belongs.</div>
<p>Testing your program with the expected result in mind is a huge part of being a programmer. In your GCSE coursework you will write test plans that do exactly this.</p>`,
      instructions: [
        "The starter prints the steps for feeding Grace's goldfish, but they are in the wrong order. Run it to see.",
        "Re-order the lines so the output is: <code>Step 1: Wash your hands</code>, <code>Step 2: Open the fish food</code>, <code>Step 3: Sprinkle a pinch of food in the tank</code>, <code>Step 4: Close the lid of the food tub</code>"
      ],
      starter: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        // This program runs, but the steps are in the wrong order (a logic error).
        // TODO: put the lines in the correct order
        Console.WriteLine("Step 3: Sprinkle a pinch of food in the tank");
        Console.WriteLine("Step 1: Wash your hands");
        Console.WriteLine("Step 4: Close the lid of the food tub");
        Console.WriteLine("Step 2: Open the fish food");
    }
}`,
      solution: cs`using System;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("Step 1: Wash your hands");
        Console.WriteLine("Step 2: Open the fish food");
        Console.WriteLine("Step 3: Sprinkle a pinch of food in the tank");
        Console.WriteLine("Step 4: Close the lid of the food tub");
    }
}`,
      tests: [
        { type: "outputRegex", pattern: "Step 1: Wash your hands[\\s\\S]*Step 2: Open the fish food[\\s\\S]*Step 3: Sprinkle a pinch of food in the tank[\\s\\S]*Step 4: Close the lid of the food tub", msg: "Print the four steps in order 1, 2, 3, 4." },
        { type: "fn", fn: (out) => (out.match(/Step \d/g) || []).length === 4, msg: "Print each step exactly once." }
      ],
      hint: "Find the line with Step 1 and move it to the top, then Step 2 underneath, and so on."
    },
    {
      id: "m00-quiz",
      title: "Checkpoint: getting started",
      type: "quiz",
      questions: [
        { q: "What is an algorithm?", options: ["A type of computer chip", "A precise, step-by-step set of instructions to solve a problem", "A programming language made by Microsoft", "An error message"], answer: 1, explain: "An algorithm is a sequence of clear steps that solves a problem. A program is an algorithm written in a programming language." },
        { q: "\"Keep asking for the password until it is correct\" is an example of which building block?", options: ["Sequence", "Selection", "Iteration", "Compilation"], answer: 2, explain: "Repeating something is iteration." },
        { q: "Where does a C# program start running?", options: ["At the first line of the file", "At the using line", "Inside static void Main", "At the last closing brace"], answer: 2, explain: "Main is the entry point: the computer starts at the first statement inside it." },
        { q: "Which line is correct C#?", options: ["console.writeline(\"Hi\");", "Console.WriteLine(\"Hi\")", "Console.WriteLine(\"Hi\");", "Console.WriteLine(Hi);"], answer: 2, explain: "C# is case sensitive, text needs double quotes, and statements end with a semicolon." },
        { q: "A program runs without crashing but calculates the wrong total. What kind of error is this?", options: ["Syntax error", "Logic error", "Run-time error", "Compile error"], answer: 1, explain: "It runs, but the result is wrong: that's a logic error." },
        { q: "What does a compiler do?", options: ["Translates high-level code into a form the processor can run", "Stores files on the hard drive", "Draws the console window", "Checks your spelling in comments"], answer: 0, explain: "The compiler translates your C# into code the computer can execute, and reports syntax errors if it can't." },
        { q: "What is Visual Studio?", options: ["A programming language", "An IDE: an editor, compiler and debugger in one program", "A web browser", "A type of variable"], answer: 1, explain: "Visual Studio is an Integrated Development Environment you use to write, run and debug C#." }
      ]
    }
  ]
});
})();
