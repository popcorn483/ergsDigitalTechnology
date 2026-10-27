// Module 11: File handling
(function () {
  const cs = String.raw;
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const trim = (s) => s.replace(/^\n+/, "").replace(/\s+$/, "");
  const pre = (s) => `<pre><code class="cs">${esc(trim(s))}</code></pre>`;
  const out = (s) => `<pre><code>${esc(trim(s))}</code></pre>`;
  function prog(body, opts) {
    opts = opts || {};
    const ind = (s, n) => trim(s).split("\n").map((l) => (l.trim() ? " ".repeat(n) + l : "")).join("\n");
    let src = (opts.usings || "using System;\nusing System.IO;") + "\n\n";
    src += "class Program\n{\n";
    if (opts.before) src += ind(opts.before, 4) + "\n\n";
    src += "    static void Main(string[] args)\n    {\n" + ind(body, 8) + "\n    }\n";
    if (opts.after) src += "\n" + ind(opts.after, 4) + "\n";
    return src + "}\n";
  }
  const lines = (s) => String(s || "").replace(/\r/g, "").split("\n").map((l) => l.trim()).filter((l) => l !== "");

  COURSE.addModule({
    id: "m11",
    title: "File handling",
    icon: "file",
    summary: "Make your data last by writing to and reading from text files, including CSV records and a high score table.",
    lessons: [
      // ------------------------------------------------------------------ l1
      {
        id: "m11-l1",
        title: "Why files? Writing and reading text",
        type: "code",
        learn: cs`
<p>Every program you've written so far forgets everything the moment it stops. Variables, arrays and lists live in <strong>RAM</strong>, which is <em>volatile</em>: it's wiped when the program ends. To keep a high score, a list of users or a saved game, you need to store it in a <strong>file</strong> on secondary storage.</p>
<div class="key"><strong>Persistence</strong> data that survives after the program closes, because it has been saved to secondary storage (for example in a text file).</div>
<h3>Where do the files go?</h3>
<p>On this site, files live in a small <strong>virtual file system</strong> inside your browser, so you can create and read files without installing anything. You'll see them in the files panel. In Visual Studio, a file name with no folder (like <code>notes.txt</code>) is created next to your program, in the project's <code>bin\Debug\net8.0</code> folder.</p>
<h3>The File class</h3>
<p>Add <code>using System.IO;</code> at the top. Then two methods do most of the work:</p>
${pre(cs`
using System.IO;
...
File.WriteAllText("motto.txt", "Work hard, play fair");
string motto = File.ReadAllText("motto.txt");
Console.WriteLine("The motto is: " + motto);`)}
<ul>
<li><code>File.WriteAllText(name, text)</code> creates the file and writes the text. <strong>If the file already exists, it is overwritten.</strong></li>
<li><code>File.ReadAllText(name)</code> reads the whole file into one string.</li>
</ul>
<div class="warn">WriteAllText replaces everything that was in the file. Next lesson you'll see how to add to a file instead.</div>`,
        instructions: [
          "Ask <code>What is your favourite film? </code> and read the answer.",
          "Save the answer to a file called <code>film.txt</code> using <code>File.WriteAllText</code>.",
          "Read it back from the file with <code>File.ReadAllText</code> and print <code>Saved to file: </code> followed by the file's contents, e.g. <code>Saved to file: Paddington</code>"
        ],
        starter: prog(cs`
Console.Write("What is your favourite film? ");
string film = Console.ReadLine();

// TODO: write film to film.txt

// TODO: read film.txt back and print Saved to file: ...`),
        solution: prog(cs`
Console.Write("What is your favourite film? ");
string film = Console.ReadLine();

File.WriteAllText("film.txt", film);

string fromFile = File.ReadAllText("film.txt");
Console.WriteLine("Saved to file: " + fromFile);`),
        stdin: ["Paddington"],
        tests: [
          { type: "fn", stdin: ["Paddington"], fn: (o, c, f) => f["film.txt"] !== undefined && f["film.txt"].trim() === "Paddington", msg: "film.txt should contain Paddington." },
          { type: "output", stdin: ["Paddington"], includes: "Saved to file: Paddington", msg: "Print Saved to file: Paddington" },
          { type: "fn", stdin: ["Wicked"], fn: (o, c, f) => (f["film.txt"] || "").trim() === "Wicked" && o.includes("Saved to file: Wicked"), msg: "It should work for any film, e.g. Wicked." },
          { type: "code", pattern: "File\\.ReadAllText", msg: "Read the file back with File.ReadAllText." }
        ],
        hint: "File.WriteAllText(\"film.txt\", film); then string fromFile = File.ReadAllText(\"film.txt\");"
      },

      // ------------------------------------------------------------------ l2
      {
        id: "m11-l2",
        title: "Appending and checking a file exists",
        type: "code",
        learn: cs`
<p>To <strong>add</strong> to the end of a file without wiping it, use <code>File.AppendAllText</code>. If the file doesn't exist yet, it's created.</p>
${pre(cs`
File.AppendAllText("log.txt", "Ben signed in" + Environment.NewLine);
File.AppendAllText("log.txt", "Grace signed in" + Environment.NewLine);`)}
<p><code>Environment.NewLine</code> is the "new line" character(s). Without it, every entry would end up stuck together on one line. (You could also write <code>"\n"</code>.)</p>
<h3>Does the file exist?</h3>
<p>Reading a file that doesn't exist causes a run-time error. <code>File.Exists(name)</code> returns <code>true</code> or <code>false</code>, so you can check first:</p>
${pre(cs`
if (File.Exists("log.txt"))
{
    Console.WriteLine(File.ReadAllText("log.txt"));
}
else
{
    Console.WriteLine("No log yet.");
}`)}
<p>This lesson already has a file called <code>visits.txt</code> with two visits in it. Open the files panel to see it.</p>`,
        files: { "visits.txt": "Niamh\nOisin\n" },
        instructions: [
          "Ask <code>Name: </code> and read the visitor's name.",
          "Append the name followed by <code>Environment.NewLine</code> to <code>visits.txt</code> (don't overwrite it!).",
          "If <code>visits.txt</code> exists, print <code>Visitor log:</code> on its own line, then print the whole file."
        ],
        starter: prog(cs`
Console.Write("Name: ");
string name = Console.ReadLine();

// TODO: append name and a new line to visits.txt

// TODO: if visits.txt exists, print Visitor log: and then the file`),
        solution: prog(cs`
Console.Write("Name: ");
string name = Console.ReadLine();

File.AppendAllText("visits.txt", name + Environment.NewLine);

if (File.Exists("visits.txt"))
{
    Console.WriteLine("Visitor log:");
    Console.WriteLine(File.ReadAllText("visits.txt"));
}`),
        stdin: ["Grace"],
        tests: [
          { type: "fn", stdin: ["Grace"], fn: (o, c, f) => JSON.stringify(lines(f["visits.txt"])) === JSON.stringify(["Niamh", "Oisin", "Grace"]), msg: "visits.txt should now hold Niamh, Oisin and Grace on separate lines." },
          { type: "outputRegex", stdin: ["Grace"], pattern: "Visitor log:\\s*\\n\\s*Niamh\\s*\\n\\s*Oisin\\s*\\n\\s*Grace", msg: "Print Visitor log: and then all three names." },
          { type: "code", pattern: "File\\.AppendAllText", msg: "Use File.AppendAllText so the old visits are kept." },
          { type: "code", pattern: "File\\.Exists", msg: "Check the file exists with File.Exists." }
        ],
        hint: "File.AppendAllText(\"visits.txt\", name + Environment.NewLine); then if (File.Exists(\"visits.txt\")) { ... }"
      },

      // ------------------------------------------------------------------ l3
      {
        id: "m11-l3",
        title: "Lines and arrays: WriteAllLines and ReadAllLines",
        type: "code",
        learn: cs`
<p>Most files hold one item per line. C# can save a whole array (or list) in one go, one item per line, and read it back as an array:</p>
${pre(cs`
string[] snacks = { "Popcorn", "Nachos", "Hot dog" };
File.WriteAllLines("snacks.txt", snacks);

string[] loaded = File.ReadAllLines("snacks.txt");
Console.WriteLine($"There are {loaded.Length} snacks.");
foreach (string s in loaded)
{
    Console.WriteLine("- " + s);
}`)}
${out(cs`
There are 3 snacks.
- Popcorn
- Nachos
- Hot dog`)}
<p><code>File.WriteAllLines</code> also accepts a <code>List&lt;string&gt;</code>, which is handy when you don't know in advance how many items there will be.</p>
<p>Once the lines are in an array, you can use everything you know about arrays: loops, totals, searching. Remember that every line is a <strong>string</strong>, so convert it if you need a number:</p>
${pre(cs`
int total = 0;
foreach (string line in File.ReadAllLines("goals.txt"))
{
    total += int.Parse(line);
}`)}`,
        instructions: [
          "Use <code>File.WriteAllLines</code> to save the <code>songs</code> array to <code>playlist.txt</code>.",
          "Read the file back with <code>File.ReadAllLines</code> into a new array.",
          "Print <code>Playlist has 4 songs</code> using the new array's <code>Length</code>, then print each song on its own line numbered from 1, like <code>1. Golden</code>"
        ],
        starter: prog(cs`
string[] songs = { "Golden", "Espresso", "Flowers", "Shivers" };

// TODO: save songs to playlist.txt

// TODO: read playlist.txt back into a new array and print it`),
        solution: prog(cs`
string[] songs = { "Golden", "Espresso", "Flowers", "Shivers" };

File.WriteAllLines("playlist.txt", songs);

string[] loaded = File.ReadAllLines("playlist.txt");
Console.WriteLine($"Playlist has {loaded.Length} songs");
for (int i = 0; i < loaded.Length; i++)
{
    Console.WriteLine($"{i + 1}. {loaded[i]}");
}`),
        tests: [
          { type: "fn", fn: (o, c, f) => JSON.stringify(lines(f["playlist.txt"])) === JSON.stringify(["Golden", "Espresso", "Flowers", "Shivers"]), msg: "playlist.txt should contain the four songs, one per line." },
          { type: "output", includes: "Playlist has 4 songs", msg: "Print Playlist has 4 songs" },
          { type: "outputRegex", pattern: "1\\. Golden\\s*\\n2\\. Espresso\\s*\\n3\\. Flowers\\s*\\n4\\. Shivers", msg: "Number the songs 1. Golden, 2. Espresso, 3. Flowers, 4. Shivers" },
          { type: "code", pattern: "File\\.ReadAllLines", msg: "Read the file with File.ReadAllLines." }
        ],
        hint: "File.WriteAllLines(\"playlist.txt\", songs); string[] loaded = File.ReadAllLines(\"playlist.txt\"); then a for loop printing $\"{i + 1}. {loaded[i]}\""
      },

      // ------------------------------------------------------------------ l4
      {
        id: "m11-l4",
        title: "StreamWriter and StreamReader",
        type: "code",
        learn: cs`
<p>The <code>File</code> methods read or write everything at once. For bigger jobs, or when you want to write line by line inside a loop, use a <strong>stream</strong>.</p>
<h3>Writing with StreamWriter</h3>
${pre(cs`
using (StreamWriter writer = new StreamWriter("squad.txt"))
{
    writer.WriteLine("Aoife");
    writer.WriteLine("Ciaran");
}`)}
<p><code>new StreamWriter("squad.txt")</code> creates (or overwrites) the file. Use <code>new StreamWriter("squad.txt", true)</code> to <strong>append</strong> instead.</p>
<h3>Reading with StreamReader</h3>
${pre(cs`
using (StreamReader reader = new StreamReader("squad.txt"))
{
    while (!reader.EndOfStream)
    {
        string name = reader.ReadLine();
        Console.WriteLine(name);
    }
}`)}
<p><code>EndOfStream</code> is <code>true</code> once every line has been read, so the loop reads one line at a time until the end of the file.</p>
<h3>Why <code>using</code>?</h3>
<p>A stream keeps the file <strong>open</strong> until it's closed. If you forget to close it, the data might not be saved, and other programs can't use the file. The <code>using ( ... ) { }</code> block closes the file automatically at the closing bracket, even if an exception happens. (You could call <code>writer.Close()</code> yourself, but <code>using</code> is safer.)</p>
<div class="tip">This is a different <code>using</code> from the <code>using System.IO;</code> line at the top. Same word, different job.</div>`,
        instructions: [
          "Use a <code>StreamWriter</code> inside a <code>using</code> block to write the numbers 1 to 5 times 7 to <code>sevens.txt</code>, one per line, in the form <code>3 x 7 = 21</code> (use a <code>for</code> loop).",
          "Then use a <code>StreamReader</code> inside a <code>using</code> block and a <code>while (!reader.EndOfStream)</code> loop to read and print every line.",
          "Finally print <code>Done</code>."
        ],
        starter: prog(cs`
// TODO: write 1 x 7 = 7 up to 5 x 7 = 35 to sevens.txt with a StreamWriter

// TODO: read sevens.txt with a StreamReader and print each line

Console.WriteLine("Done");`),
        solution: prog(cs`
using (StreamWriter writer = new StreamWriter("sevens.txt"))
{
    for (int i = 1; i <= 5; i++)
    {
        writer.WriteLine($"{i} x 7 = {i * 7}");
    }
}

using (StreamReader reader = new StreamReader("sevens.txt"))
{
    while (!reader.EndOfStream)
    {
        Console.WriteLine(reader.ReadLine());
    }
}

Console.WriteLine("Done");`),
        tests: [
          { type: "fn", fn: (o, c, f) => JSON.stringify(lines(f["sevens.txt"])) === JSON.stringify(["1 x 7 = 7", "2 x 7 = 14", "3 x 7 = 21", "4 x 7 = 28", "5 x 7 = 35"]), msg: "sevens.txt should have 5 lines from 1 x 7 = 7 to 5 x 7 = 35." },
          { type: "outputRegex", pattern: "1 x 7 = 7[\\s\\S]*5 x 7 = 35[\\s\\S]*Done", msg: "Print the lines from the file, then Done." },
          { type: "code", pattern: "new\\s+StreamWriter", msg: "Use a StreamWriter." },
          { type: "code", pattern: "new\\s+StreamReader", msg: "Use a StreamReader." },
          { type: "code", pattern: "EndOfStream", msg: "Loop until reader.EndOfStream." }
        ],
        hint: "using (StreamWriter writer = new StreamWriter(\"sevens.txt\")) { for (...) writer.WriteLine($\"{i} x 7 = {i * 7}\"); }"
      },

      // ------------------------------------------------------------------ l5
      {
        id: "m11-l5",
        title: "CSV records",
        type: "code",
        learn: cs`
<p>Often one line of a file holds a whole <strong>record</strong>: several fields about one thing. The simplest way is <strong>CSV</strong> (comma-separated values), the same format spreadsheets can open.</p>
${out(cs`
Biscuit,dog,4
Luna,cat,2
Pepper,rabbit,1`)}
<p>Each line is a record; each record has three fields: name, type and age. To get the fields back, <strong>split</strong> the line at the commas:</p>
${pre(cs`
foreach (string line in File.ReadAllLines("pets.csv"))
{
    string[] parts = line.Split(',');
    string name = parts[0];
    string type = parts[1];
    int age = int.Parse(parts[2]);
    Console.WriteLine($"{name} the {type} is {age}");
}`)}
<p>To <strong>write</strong> a record, join the fields with commas: <code>$"{name},{type},{age}"</code>.</p>
<div class="warn">If a field could contain a comma itself (like <code>Smith, J</code>), it would break the split. That's why the final project won't allow commas in usernames: a simple form of validation that protects the file.</div>
<div class="tip">Formatting tip: <code>{name,-10}</code> pads text to 10 characters, left-aligned, which lines up columns neatly.</div>`,
        files: { "results.csv": "Aoife,72\nBen,45\nCiaran,88\nGrace,59\nNiamh,91\n" },
        instructions: [
          "This lesson has a file <code>results.csv</code>. Each line holds a pupil's name and test mark, e.g. <code>Aoife,72</code>.",
          "Read every line, split it at the comma and print the name and mark like <code>Aoife: 72</code>",
          "Work out the average mark and print it to 1 decimal place: <code>Average: 71.0</code>",
          "Print the highest mark with its name: <code>Top: Niamh with 91</code>"
        ],
        starter: prog(cs`
string[] records = File.ReadAllLines("results.csv");

// TODO: split each record, print Name: mark, then the average and the top pupil`),
        solution: prog(cs`
string[] records = File.ReadAllLines("results.csv");
int total = 0;
int best = -1;
string bestName = "";

foreach (string record in records)
{
    string[] parts = record.Split(',');
    string name = parts[0];
    int mark = int.Parse(parts[1]);
    Console.WriteLine($"{name}: {mark}");

    total += mark;
    if (mark > best)
    {
        best = mark;
        bestName = name;
    }
}

double average = (double)total / records.Length;
Console.WriteLine($"Average: {average:F1}");
Console.WriteLine($"Top: {bestName} with {best}");`),
        tests: [
          { type: "outputRegex", pattern: "Aoife: 72[\\s\\S]*Ben: 45[\\s\\S]*Niamh: 91", msg: "Print each pupil as Name: mark, e.g. Aoife: 72" },
          { type: "output", includes: "Average: 71.0", msg: "The average of 72, 45, 88, 59 and 91 is 71.0" },
          { type: "output", includes: "Top: Niamh with 91", msg: "Print Top: Niamh with 91" },
          { type: "code", pattern: "Split\\(", msg: "Use Split to separate the fields." }
        ],
        hint: "Inside a foreach: string[] parts = record.Split(','); int mark = int.Parse(parts[1]); Keep a running total and the best mark so far."
      },

      // ------------------------------------------------------------------ l6
      {
        id: "m11-l6",
        title: "Searching and updating: a high score table",
        type: "code",
        learn: cs`
<p>You can't change one line in the middle of a text file directly. The standard method for <strong>updating</strong> a file is:</p>
<ol>
<li><strong>Read</strong> all the records into a list.</li>
<li><strong>Search</strong> the list and change (or add) the record in memory.</li>
<li><strong>Write</strong> the whole list back to the file, overwriting the old version.</li>
</ol>
${pre(cs`
List<string> lines = new List<string>(File.ReadAllLines("stock.csv"));
bool found = false;
for (int i = 0; i < lines.Count; i++)
{
    string[] parts = lines[i].Split(',');
    if (parts[0] == "Popcorn")
    {
        lines[i] = "Popcorn," + (int.Parse(parts[1]) - 1);
        found = true;
    }
}
if (!found)
{
    lines.Add("Popcorn,0");
}
File.WriteAllLines("stock.csv", lines);`)}
<p><code>new List&lt;string&gt;(array)</code> turns the array of lines into a list so you can add to it. The <code>found</code> flag records whether the search was successful: a <strong>linear search</strong> through the records.</p>
<div class="tip">Comparing with <code>.ToLower()</code> on both sides makes the search case-insensitive, so <code>ben</code> finds <code>Ben</code>.</div>`,
        files: { "highscores.csv": "Aoife,1200\nBen,950\nGrace,1430\n" },
        instructions: [
          "Read a player name and a new score (the prompts are done for you).",
          "Load <code>highscores.csv</code> into a <code>List&lt;string&gt;</code> and search it (case-insensitive) for the player.",
          "If found and the new score is <strong>higher</strong>, replace their score and print <code>New personal best!</code>; if found but not higher, print <code>No new record. Best is </code> and their old score, e.g. <code>No new record. Best is 1200</code>",
          "If not found, add a new record and print <code>Welcome to the table!</code>. Save the list back to <code>highscores.csv</code>."
        ],
        starter: prog(cs`
Console.Write("Player: ");
string player = Console.ReadLine();
Console.Write("Score: ");
int score = int.Parse(Console.ReadLine());

// TODO: load highscores.csv into a List<string>

// TODO: search for the player and update or add

// TODO: save the list back to highscores.csv`, { usings: "using System;\nusing System.Collections.Generic;\nusing System.IO;" }),
        solution: prog(cs`
Console.Write("Player: ");
string player = Console.ReadLine();
Console.Write("Score: ");
int score = int.Parse(Console.ReadLine());

List<string> lines = new List<string>(File.ReadAllLines("highscores.csv"));
bool found = false;

for (int i = 0; i < lines.Count; i++)
{
    string[] parts = lines[i].Split(',');
    if (parts[0].ToLower() == player.ToLower())
    {
        found = true;
        int best = int.Parse(parts[1]);
        if (score > best)
        {
            lines[i] = parts[0] + "," + score;
            Console.WriteLine("New personal best!");
        }
        else
        {
            Console.WriteLine("No new record. Best is " + best);
        }
    }
}

if (!found)
{
    lines.Add(player + "," + score);
    Console.WriteLine("Welcome to the table!");
}

File.WriteAllLines("highscores.csv", lines);`, { usings: "using System;\nusing System.Collections.Generic;\nusing System.IO;" }),
        stdin: ["Ben", "1100"],
        tests: [
          { type: "fn", stdin: ["Ben", "1100"], fn: (o, c, f) => o.includes("New personal best!") && JSON.stringify(lines(f["highscores.csv"])) === JSON.stringify(["Aoife,1200", "Ben,1100", "Grace,1430"]), msg: "Ben scoring 1100 should print New personal best! and change his line to Ben,1100 (other lines unchanged)." },
          { type: "fn", stdin: ["aoife", "800"], fn: (o, c, f) => o.includes("No new record. Best is 1200") && lines(f["highscores.csv"]).includes("Aoife,1200"), msg: "aoife scoring 800 should print No new record. Best is 1200 and keep Aoife,1200." },
          { type: "fn", stdin: ["Oisin", "700"], fn: (o, c, f) => o.includes("Welcome to the table!") && JSON.stringify(lines(f["highscores.csv"])) === JSON.stringify(["Aoife,1200", "Ben,950", "Grace,1430", "Oisin,700"]), msg: "A new player Oisin should print Welcome to the table! and be added to the end of the file." },
          { type: "code", pattern: "File\\.WriteAllLines", msg: "Write the updated list back with File.WriteAllLines." }
        ],
        hint: "Use a for loop over lines, Split each line, compare parts[0].ToLower() with player.ToLower(). Set found = true when you find them. After the loop, if (!found) lines.Add(...)."
      },

      // ------------------------------------------------------------------ l7
      {
        id: "m11-l7",
        title: "When files go wrong",
        type: "code",
        learn: cs`
<p>Files live outside your program, so lots can go wrong: the file was deleted or renamed, it's in a different folder, or a line inside it is damaged. Two tools keep your program safe.</p>
<h3>1. Check first with File.Exists</h3>
<p>Good when a missing file is normal, e.g. the first time a game runs there are no saved scores yet.</p>
<h3>2. Catch the exception</h3>
<p>Reading a file that isn't there throws a <code>FileNotFoundException</code>. Catching it means the program can explain the problem instead of crashing:</p>
${pre(cs`
try
{
    string[] lines = File.ReadAllLines("fixtures.txt");
    Console.WriteLine($"Loaded {lines.Length} fixtures.");
}
catch (FileNotFoundException)
{
    Console.WriteLine("Fixtures file is missing.");
}`)}
<p><code>FileNotFoundException</code> is a kind of <code>IOException</code> (input/output exception), so <code>catch (IOException)</code> would catch it too, along with other file problems.</p>
<h3>Damaged lines</h3>
<p>One bad line shouldn't stop the rest loading. Put a <code>try</code>/<code>catch</code> <em>inside</em> the loop so only the bad line is skipped:</p>
${pre(cs`
foreach (string line in lines)
{
    try
    {
        total += int.Parse(line);
    }
    catch (FormatException)
    {
        Console.WriteLine("Skipped: " + line);
    }
}`)}
<p>This lesson has a <code>goals.txt</code> file with one damaged line in it. There's no <code>assists.txt</code>.</p>`,
        files: { "goals.txt": "3\n1\ntwo\n4\n" },
        instructions: [
          "Write a method <code>static int TotalFromFile(string fileName)</code> that adds up the numbers in a file, one per line.",
          "Inside the loop, catch <code>FormatException</code> and print <code>Skipped: </code> plus the bad line. Around the reading, catch <code>FileNotFoundException</code>, print <code>Missing file: </code> plus the file name, and return 0.",
          "Main is done for you: it should print <code>Skipped: two</code>, <code>Goals: 8</code>, <code>Missing file: assists.txt</code> and <code>Assists: 0</code>."
        ],
        starter: prog(cs`
Console.WriteLine("Goals: " + TotalFromFile("goals.txt"));
Console.WriteLine("Assists: " + TotalFromFile("assists.txt"));`, {
          after: cs`
static int TotalFromFile(string fileName)
{
    int total = 0;
    // TODO: read the lines, add them up, and handle the two kinds of error
    return total;
}`
        }),
        solution: prog(cs`
Console.WriteLine("Goals: " + TotalFromFile("goals.txt"));
Console.WriteLine("Assists: " + TotalFromFile("assists.txt"));`, {
          after: cs`
static int TotalFromFile(string fileName)
{
    int total = 0;
    try
    {
        string[] lines = File.ReadAllLines(fileName);
        foreach (string line in lines)
        {
            try
            {
                total += int.Parse(line);
            }
            catch (FormatException)
            {
                Console.WriteLine("Skipped: " + line);
            }
        }
    }
    catch (FileNotFoundException)
    {
        Console.WriteLine("Missing file: " + fileName);
        return 0;
    }
    return total;
}`
        }),
        tests: [
          { type: "output", includes: "Skipped: two", msg: "The damaged line should print Skipped: two" },
          { type: "output", includes: "Goals: 8", msg: "3 + 1 + 4 = 8, so print Goals: 8" },
          { type: "output", includes: "Missing file: assists.txt", msg: "The missing file should print Missing file: assists.txt" },
          { type: "output", includes: "Assists: 0", msg: "TotalFromFile should return 0 for a missing file." },
          { type: "code", pattern: "catch\\s*\\(\\s*FileNotFoundException", msg: "Catch FileNotFoundException." }
        ],
        hint: "Two try blocks: an outer one around File.ReadAllLines (catch FileNotFoundException) and an inner one inside the foreach around int.Parse (catch FormatException)."
      },

      // ------------------------------------------------------------------ quiz
      {
        id: "m11-quiz",
        title: "Checkpoint: file handling",
        type: "quiz",
        questions: [
          { q: "Why do programs save data to files?",
            options: ["Files are faster than variables", "So the data persists after the program closes", "Because RAM can only store strings", "To make the program compile"],
            answer: 1, explain: "RAM is volatile. Saving to secondary storage gives persistence." },
          { q: "What happens if you call <code>File.WriteAllText(\"scores.txt\", \"10\")</code> and scores.txt already holds 50 lines?",
            options: ["\"10\" is added to the end", "The old contents are replaced by \"10\"", "A run-time error occurs", "Nothing, because the file exists"],
            answer: 1, explain: "WriteAllText overwrites. Use AppendAllText to add to the end." },
          { q: "What does <code>File.ReadAllLines</code> return?",
            options: ["One string", "A string array, one element per line", "An int", "A StreamReader"],
            answer: 1, explain: "It returns string[] with each line of the file as an element." },
          { q: "A line in a file is <code>Luna,cat,2</code>. After <code>string[] p = line.Split(',');</code> what is <code>p[1]</code>?",
            options: ["Luna", "cat", "2", ","],
            answer: 1, explain: "Split gives [\"Luna\", \"cat\", \"2\"], and index 1 is the second item." },
          { q: "What is the main reason to put a StreamWriter in a <code>using</code> block?",
            options: ["It makes the file smaller", "The file is closed automatically, so the data is saved", "It lets you read and write at the same time", "It's needed to import System.IO"],
            answer: 1, explain: "using closes (disposes) the stream at the closing bracket, even if an exception happens." },
          { q: "Which exception is thrown when you try to read a file that doesn't exist?",
            options: ["FormatException", "IndexOutOfRangeException", "FileNotFoundException", "DivideByZeroException"],
            answer: 2, explain: "FileNotFoundException, which is a type of IOException." },
          { q: "How do you change one record in the middle of a text file?",
            options: ["Use File.ChangeLine", "Read all the records, change the one in memory, then write them all back", "Append the new record to the end", "Delete the file and hope"],
            answer: 1, explain: "Read into a list, update the list, then overwrite the file with WriteAllLines." }
        ]
      }
    ]
  });
})();
