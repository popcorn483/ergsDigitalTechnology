// Interactive activities for every topic: sorting, sequencing, spot-the-flaw, unlimited practice
// generators and C# coding challenges. Acts.render(el, act, api) draws one activity.
(function (root) {
  "use strict";
  var A = {};

  // ---------- helpers ----------
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function distinct(n, lo, hi) { var s = {}; var out = []; while (out.length < n) { var v = ri(lo, hi); if (!s[v]) { s[v] = 1; out.push(v); } } return out; }
  function bin8(n) { var s = n.toString(2); while (s.length < 8) s = "0" + s; return s; }
  function hex2(n) { var s = n.toString(16).toUpperCase(); return s.length < 2 ? "0" + s : s; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmtNum(n) { return n.toLocaleString("en-GB"); }

  // ---------- sorting / sequencing / spot data ----------
  // sort: cats + items [text, catIndex]; order: items in correct order; spot: parts (string or [text, why])
  var S = [];
  function sort(t, id, l, title, intro, cats, items) { S.push({ t: t, id: id, l: l, type: "sort", title: title, intro: intro, cats: cats, items: items }); }
  function order(t, id, l, title, intro, items) { S.push({ t: t, id: id, l: l, type: "order", title: title, intro: intro, items: items }); }
  function spot(t, id, l, title, intro, parts) { S.push({ t: t, id: id, l: l, type: "spot", title: title, intro: intro, parts: parts }); }
  function gen(t, id, l, title, intro, g) { S.push({ t: t, id: id, l: l, type: "gen", title: title, intro: intro, gen: g }); }

  // ===== Unit 1 =====
  gen("T1", "units", "L01", "Units of storage", "Convert between bits, nibbles, bytes, KB, MB, GB and TB (1 KB = 1024 bytes).", "units");
  sort("T1", "dvi", "L01", "Data or information?", "Data is raw facts with no context; information has been processed and given meaning.", ["Data", "Information"], [
    ["120926", 0], ["Date of birth: 12 September 2026", 1], ["21, 24, 19, 22", 0], ["Highest temperature in Enniskillen on Monday: 24°C", 1], ["Y, N, Y, Y", 0], ["Paid for the trip: Yes", 1], ["BT74", 0], ["Number of pupils in 11B: 27", 1]]);
  sort("T1", "types", "L02", "Choose the data type", "Pick the best data type for each item.", ["Integer", "Real", "Character", "String", "Date/time"], [
    ["Number of pupils on a bus", 0], ["Goals scored in a match", 0], ["Price of a ticket (£4.50)", 1], ["Race time (12.84 seconds)", 1], ["Grade letter, e.g. B", 2], ["Shirt size code: S, M or L", 2], ["Pupil's surname", 3], ["Phone number 028 6632 2153", 3], ["Postcode", 3], ["Date of birth", 4], ["Time of arrival", 4]]);
  gen("T1", "img", "L03", "Image file size", "File size = width × height × colour depth (bits). Divide by 8 for bytes.", "imagesize");
  sort("T1", "bv", "L03", "Bitmap or vector?", "Sort each statement.", ["Bitmap", "Vector"], [
    ["Made of a grid of pixels", 0], ["Stores shapes as objects with properties", 1], ["Goes blocky (pixelated) when enlarged", 0], ["Can be resized with no loss of quality", 1], ["Best for photographs", 0], ["Best for logos, maps and diagrams", 1], ["File size depends on resolution and colour depth", 0], ["Usually a smaller file", 1]]);
  gen("T1", "snd", "L04", "Sound file size and bit rate", "Bits = sample rate × bit depth × seconds × channels.", "soundsize");
  sort("T1", "fmt", "L05", "Sort the file formats", "Which kind of data does each standard format store?", ["Image", "Sound", "Video", "Document or data"], [
    ["jpeg", 0], ["png", 0], ["gif", 0], ["tiff", 0], ["pict", 0], ["mp3", 1], ["wav", 1], ["wma", 1], ["midi", 1], ["mp4", 2], ["mpeg", 2], ["avi", 2], ["csv", 3], ["rtf", 3], ["pdf", 3], ["txt", 3]]);
  sort("T1", "comp", "L05", "Lossy or lossless?", "Sort the formats and statements.", ["Lossy", "Lossless"], [
    ["jpeg", 0], ["mp3", 0], ["mp4", 0], ["png", 1], ["zip", 1], ["Some data is removed permanently", 0], ["The original can be restored exactly", 1], ["Must be used for text and program files", 1], ["Gives much smaller files for streaming video", 0]]);

  sort("T2", "modes", "L06", "Modes of processing", "Which mode of processing suits each system?", ["Real-time", "Batch", "Multi-user"], [
    ["Airline seat booking", 0], ["Traffic light control", 0], ["Contactless payment at a till", 0], ["Monthly electricity bills", 1], ["Payroll run at the end of the month", 1], ["Bank statements printed overnight", 1], ["Many staff using the school records system at once", 2], ["Pupils logging on to the school network at the same time", 2]]);
  sort("T2", "osu", "L06", "Operating system or utility?", "Is each job done by the operating system or by a utility program?", ["Operating system", "Utility"], [
    ["Allocates memory to programs and data", 0], ["Keeps track of where files are stored", 0], ["Gives each task a time slice of the CPU", 0], ["Manages input and output devices", 0], ["Rearranges fragmented files on a hard disk", 1], ["Runs a backup automatically at 2 am", 1], ["Scans files for viruses", 1], ["Copies data to separate storage so it can be restored", 1]]);
  sort("T2", "util", "L07", "Match the utility", "Which utility does each job?", ["Disk defragmenter", "Task scheduler", "Backup and restore", "Antivirus"], [
    ["Moves the parts of each file into one continuous block", 0], ["Speeds up access on a hard disk drive (not needed on SSDs)", 0], ["Runs scans and updates at set times without the user", 1], ["Starts jobs automatically on a timetable", 1], ["Copies files so they can be recovered after loss", 2], ["Copies data back after the drive is corrupted", 2], ["Compares files with a database of virus signatures", 3], ["Quarantines infected files", 3]]);
  order("T2", "boot", "L06", "Boot-up sequence", "Put the start-up steps in order.", ["The computer is switched on", "The CPU runs the boot-up instructions stored in ROM", "The hardware is checked", "The operating system is loaded from storage into RAM", "The operating system takes control and the user can log in"]);

  gen("T3", "query", "L10", "Run the query", "Tick every record the query criteria would find.", "dbquery");
  sort("T3", "valid", "L09", "Which validation check?", "Choose the check that enforces each rule.", ["Presence", "Length", "Type", "Format", "Range"], [
    ["Surname must not be left blank", 0], ["Phone number must be filled in", 0], ["Password must be 8 to 20 characters long", 1], ["Username can have at most 12 characters", 1], ["Age must be a whole number", 2], ["Price must be a number", 2], ["Postcode must follow the pattern BT74 6AA", 3], ["Pupil ID must be two letters then four digits", 3], ["Mark must be from 0 to 100", 4], ["Year group must be between 8 and 14", 4]]);
  sort("T3", "terms", "L08", "Database terms", "Match each description to the term.", ["Table", "Record", "Field", "Primary key"], [
    ["Stores data about one type of thing, e.g. Pupils", 0], ["All the data about one pupil", 1], ["One row of a table", 1], ["One item of data, e.g. Surname", 2], ["One column of a table", 2], ["Uniquely identifies each record", 3], ["PupilID", 3]]);
  sort("T3", "big", "L10", "The Vs of big data", "Which feature of big data does each describe?", ["Volume", "Velocity", "Variety"], [
    ["Petabytes of data from millions of users", 0], ["Too much data to store on one ordinary computer", 0], ["Sensor readings arriving every millisecond", 1], ["Social media posts generated faster than they can be read", 1], ["Text, images, video and GPS data mixed together", 2], ["Structured tables and unstructured emails", 2]]);

  gen("T4", "sheet", "L12", "Spreadsheet formulae", "Work out what each formula returns from the sheet.", "sheet");
  gen("T4", "copy", "L11", "Relative and absolute references", "Predict the formula after it is copied.", "cellref");
  sort("T4", "chart", "L12", "Which chart?", "Choose the clearest chart for each job.", ["Pie chart", "Line graph", "Bar/column chart"], [
    ["Proportion of pupils in each house", 0], ["Share of the budget spent on each item", 0], ["Temperature every hour for a day", 1], ["Number of website visitors each month for a year", 1], ["Compare sales of five products", 2], ["Compare test scores of four classes", 2]]);
  sort("T4", "feat", "L12", "Spreadsheet features", "Which feature does each job?", ["IF", "VLOOKUP", "Conditional formatting", "Data validation", "Macro"], [
    ["Shows 'Pass' or 'Fail' depending on a mark", 0], ["Finds a product's price from its code in a table", 1], ["Turns a cell red when stock is below 5", 2], ["Only allows a choice from a drop-down list", 3], ["Records a series of steps and repeats them with one click", 4]]);

  order("T5", "fde", "L13", "The fetch–execute cycle", "Put the steps in order.", ["The program counter (PC) holds the address of the next instruction", "The address is copied into the memory address register (MAR)", "The instruction at that address is fetched into the memory data register (MDR)", "The instruction is held in the IAR and decoded by the control unit", "The instruction is executed – the ALU carries out any calculation or comparison"]);
  sort("T5", "cpu", "L13", "Parts of the CPU", "Match each description.", ["ALU", "Control unit", "Program counter", "MAR", "MDR"], [
    ["Carries out arithmetic and logical operations", 0], ["Compares two values", 0], ["Decodes instructions and co-ordinates the other components", 1], ["Sends control signals", 1], ["Holds the address of the next instruction", 2], ["Holds the address in memory being accessed", 3], ["Holds the data or instruction fetched from memory", 4]]);
  sort("T5", "mem", "L14", "RAM, ROM or cache?", "Sort each statement.", ["RAM", "ROM", "Cache"], [
    ["Volatile – loses its contents when the power is off", 0], ["Holds the programs and data currently in use", 0], ["Non-volatile and read-only", 1], ["Stores the boot-up instructions (BIOS)", 1], ["A small amount of very fast memory near the CPU", 2], ["Holds frequently used instructions so they are found faster than in RAM", 2]]);
  sort("T5", "dev", "L15", "Input, output or storage?", "Sort the devices.", ["Input", "Output", "Storage"], [
    ["Microphone", 0], ["Mouse", 0], ["Graphics digitiser", 0], ["Laser printer", 1], ["3D printer", 1], ["Speakers", 1], ["Hard disk drive (HDD)", 2], ["Solid state drive (SSD)", 2], ["Blu-ray disc", 2]]);
  sort("T5", "hddssd", "L15", "HDD or SSD?", "Sort each statement.", ["HDD", "SSD"], [
    ["Stores data magnetically on spinning platters", 0], ["Cheaper per gigabyte", 0], ["Has moving parts that can be damaged if dropped", 0], ["Uses flash memory with no moving parts", 1], ["Faster access and lower power use", 1], ["Does not need defragmenting", 1]]);

  sort("T6", "topo", "L16", "Network topologies", "Which topology does each describe?", ["Bus", "Star", "Ring"], [
    ["All devices share one backbone cable with terminators", 0], ["Cheap to set up, but collisions slow it down", 0], ["A fault in the backbone stops the whole network", 0], ["Every device connects to a central switch", 1], ["A cable fault only affects one device", 1], ["If the central switch fails, all devices lose connection", 1], ["Devices are connected in a loop", 2], ["Data travels in one direction, so there are no collisions", 2]]);
  sort("T6", "hw", "L16", "Network hardware", "Match the hardware to its job.", ["NIC", "Switch", "Router"], [
    ["Lets a device connect to a network", 0], ["Gives each device a unique MAC address", 0], ["Connects devices on a LAN and sends data only to the intended device", 1], ["The centre of a star network", 1], ["Connects different networks, e.g. a LAN to the internet", 2], ["Directs packets towards their destination", 2]]);
  sort("T6", "comm", "L17", "Communication technologies", "Which technology suits each use?", ["Wi-Fi", "Bluetooth", "Optical fibre", "4G/5G"], [
    ["Wireless internet throughout a school building", 0], ["Connecting wireless earbuds to a phone", 1], ["Short range, about 10 m, low power", 1], ["Very high bandwidth link between two buildings", 2], ["Immune to electrical interference", 2], ["Streaming video on a bus journey", 3], ["Mobile internet over a wide area", 3]]);
  sort("T6", "net", "L16", "Network words", "Sort each statement.", ["LAN", "WAN", "Internet", "World Wide Web", "Intranet"], [
    ["Covers one site and is owned by the organisation", 0], ["Covers a large area using third-party links", 1], ["The global network of networks", 2], ["The collection of web pages accessed over the internet", 3], ["A private network only for members of an organisation", 4]]);

  spot("T7", "phish", "L18", "Spot the phishing email", "Click every sign that this email is a scam, then press Check.", [
    "From: ", ["Security Team <security@nlbank-verify.co>", "The sender's domain does not match the real bank's website."], "\nSubject: ", ["URGENT: your account will be closed in 24 hours", "Creates panic and urgency so you act without thinking."], "\n\n", ["Dear valued customer,", "A generic greeting – a real bank would use your name."], "\n\nWe noticed unusual activity on your account. ", ["To keep your account open you must confirm your password and card number", "Banks never ask for your password or full card details by email."], " by ", ["clicking here: http://nlbank.verify-login.ru/secure", "The link goes to a different, foreign web address, not the bank's site."], ".\n\n", ["If you do not respond your money may be lost forever.", "A threat designed to frighten you."], "\n\nThank you,\nNorthern Lough Bank\n", ["Plese do not reply to this emial.", "Spelling mistakes are a common sign of a scam."]]);
  sort("T7", "mal", "L18", "Types of malware", "What kind of malware is each?", ["Virus", "Worm", "Trojan horse", "Key logger", "Spyware"], [
    ["Attaches to a file and spreads when the file is run", 0], ["Copies itself across a network without needing a host file", 1], ["Pretends to be a useful program", 2], ["Records every key pressed to capture passwords", 3], ["Secretly gathers information and sends it to a third party", 4]]);
  sort("T7", "prot", "L19", "Protecting data", "Which method does each describe?", ["Encryption", "Firewall", "Two-factor authentication", "Levels of access", "Backup"], [
    ["Scrambles data with a key so intercepted data cannot be read", 0], ["Blocks network traffic that does not meet security rules", 1], ["Needs a code sent to your phone as well as a password", 2], ["Pupils can read files but only teachers can change them", 3], ["A copy kept elsewhere so data can be restored after an attack", 4]]);
  gen("T7", "caesar", "L19", "Caesar cipher", "Encryption scrambles data with a key. Shift each letter by the key.", "caesar");
  sort("T7", "proto", "L19", "Which protocol?", "Choose the protocol for each job.", ["FTP", "HTTP", "HTTPS"], [
    ["Uploading website files to a web server", 0], ["Transferring large files between computers", 0], ["Loading an ordinary web page", 1], ["Logging in to online banking", 2], ["Paying for shopping online", 2], ["Sends web pages encrypted", 2]]);

  sort("T8", "cloud", "L20", "Cloud computing: pros and cons", "Is each an advantage or a disadvantage for a school using the cloud?", ["Advantage", "Disadvantage"], [
    ["Files can be opened from any device, anywhere", 0], ["No servers to buy or maintain", 0], ["Storage can be increased when needed", 0], ["Several pupils can edit the same document at once", 0], ["Needs a reliable internet connection", 1], ["Monthly subscription costs never stop", 1], ["Personal data is held by a third party", 1], ["An outage at the provider stops all work", 1]]);
  sort("T8", "gaming", "L20", "Cloud gaming", "Benefit or drawback for the player?", ["Benefit", "Drawback"], [
    ["High-end games run on a low-powered device", 0], ["No large downloads or installs", 0], ["Play on a phone, laptop or TV", 0], ["Needs a fast, low-latency connection", 1], ["Lag makes fast games unplayable", 1], ["Uses a lot of mobile data", 1]]);

  sort("T9", "law", "L21", "Which law?", "Which Act or Regulations has been broken or applies?", ["Computer Misuse Act 1990", "Copyright, Designs and Patents Act 1988", "Data Protection Act", "Consumer Contracts Regulations 2013"], [
    ["Guessing a teacher's password to look at exam results", 0], ["Planting a virus on the school network", 0], ["Copying a game and selling the copies", 1], ["Using a photographer's picture on your website without permission", 1], ["A shop keeps customers' details for years after they leave", 2], ["A company sells its customer list without consent", 2], ["Cancelling an online order within 14 days", 3], ["A website uses pre-ticked boxes to add extra charges", 3]]);
  sort("T9", "roles", "L22", "Data protection roles", "Who is described?", ["Data subject", "Data controller", "Information Commissioner"], [
    ["The person the data is about", 0], ["A pupil whose details are held by the school", 0], ["Decides how and why personal data is processed", 1], ["The school deciding what pupil data to keep", 1], ["Enforces the Act and can fine organisations", 2]]);
  sort("T9", "hs", "L23", "Health and safety", "Which problem does each prevention reduce?", ["RSI", "Back problems", "Eye strain"], [
    ["Use a wrist rest and an ergonomic keyboard", 0], ["Vary tasks so you are not typing for hours", 0], ["Use an adjustable chair with back support", 1], ["Sit with feet flat and screen at eye level", 1], ["Use an anti-glare screen", 2], ["Take regular breaks away from the screen and have eye tests", 2]]);
  sort("T9", "impact", "L23", "Ethical, legal or environmental?", "Sort each issue.", ["Ethical", "Legal", "Environmental"], [
    ["Cyberbullying on social media", 0], ["Spreading fake news", 0], ["Tracking a friend's location without asking", 0], ["Downloading pirated films", 1], ["Hacking into the school network", 1], ["Old phones ending up in landfill (e-waste)", 2], ["Energy used by huge data centres", 2], ["Mining rare metals for devices", 2]]);

  sort("T10", "apps", "L24", "Games, simulations or mobile apps?", "Which kind of digital application does each feature describe best?", ["Games", "Simulations", "Mobile apps"], [
    ["Leaderboards and rewards keep learners motivated", 0], ["Levels that get harder as skills improve", 0], ["Pilots practise engine failures safely", 1], ["Repeat a dangerous experiment as often as needed", 1], ["Notifications remind you to revise", 2], ["Uses GPS and the camera on the move", 2]]);
  sort("T10", "bank", "L24", "Online banking", "Advantage or disadvantage for the customer?", ["Advantage", "Disadvantage"], [
    ["Check your balance 24/7", 0], ["Instant transfers and spending alerts", 0], ["No need to travel to a branch", 0], ["Risk of phishing and fraud", 1], ["Needs an internet connection and digital skills", 1], ["Local branches close", 1]]);
  spot("T10", "weak", "L24", "Improve the extended answer", "Examiners do not credit vague words such as 'faster' or 'easier' on their own. Click every phrase that needs to be made more specific.", [
    "Online shopping is good because ", ["it is faster", "Faster than what? Say what is quicker, e.g. 'no need to travel to the shops'."], " and ", ["it is easier", "Explain why, e.g. 'you can compare prices on several sites at once'."], ". You can buy things at any time of day, 24 hours a day, 7 days a week. However ", ["it can be bad", "Name the problem, e.g. 'you cannot try clothes on before buying'."], " and ", ["there are risks", "Which risks? e.g. 'card details could be stolen by a fake website'."], ". Delivery charges can make items more expensive than in a shop. Overall ", ["it is better", "Better for whom, and why? Give a justified conclusion."], "."]);

  // ===== Unit 4 =====
  sort("T41", "para", "D01", "Procedural or object-oriented?", "Sort each statement.", ["Procedural", "Object-oriented", "Both"], [
    ["Step-by-step instructions run in sequence", 0], ["Designed top-down into procedures and functions", 0], ["Data is kept separate and passed into procedures", 0], ["Built from objects made from classes", 1], ["Uses inheritance to reuse a class", 1], ["Encapsulation keeps data inside an object", 1], ["Can be written in C#", 2], ["Uses selection and iteration", 2]]);
  sort("T41", "trans", "D02", "Compiler or interpreter?", "Sort each statement.", ["Compiler", "Interpreter"], [
    ["Translates the whole program before it runs", 0], ["Produces an executable file", 0], ["The finished program runs quickly", 0], ["Used by Visual Studio for C#", 0], ["Translates and runs one line at a time", 1], ["Stops at the first error it reaches", 1], ["Translates the program every time it runs", 1]]);
  sort("T41", "ide", "D02", "IDE features", "Match each feature to how it helps.", ["IntelliSense", "Syntax highlighting", "Error underlining", "Line numbers", "Breakpoints"], [
    ["Suggests methods and variable names as you type", 0], ["Colours keywords, strings and comments differently", 1], ["Puts a red wavy line under a mistake straight away", 2], ["Helps you find the line given in an error message", 3], ["Pauses the program so you can inspect variables", 4]]);

  gen("T42", "b2d", "D03", "Binary to denary", "Convert 8-bit binary to denary.", "bin2den");
  gen("T42", "d2b", "D03", "Denary to binary", "Convert denary (0–255) to 8-bit binary.", "den2bin");
  gen("T42", "hex", "D04", "Hexadecimal", "Convert between hex, denary and binary.", "hex");
  gen("T42", "add", "D05", "Binary addition and overflow", "Add 8-bit binary numbers and spot overflow.", "binadd");
  gen("T42", "ascii", "D06", "ASCII codes", "Work out character codes from a known starting code.", "ascii");
  gen("T42", "dtype", "D07", "Which C# data type?", "Choose the data type for each value.", "dtype");
  gen("T42", "truth", "D08", "Truth tables", "Complete the output column (1 = true, 0 = false).", "truth");

  gen("T43", "bubble", "D11", "Bubble sort", "Trace a bubble sort on a short list.", "bubble");
  gen("T43", "insert", "D11", "Insertion sort", "Trace an insertion sort on a short list.", "insertion");
  gen("T43", "bsearch", "D12", "Binary search", "Trace a binary search: which items are compared?", "binsearch");
  gen("T43", "lsearch", "D12", "Linear search", "Count the comparisons a linear search makes.", "linear");
  sort("T43", "flow", "D10", "Flowchart symbols", "Which symbol is used?", ["Terminator (rounded)", "Input/output (parallelogram)", "Process (rectangle)", "Decision (diamond)"], [
    ["Start", 0], ["Stop", 0], ["INPUT age", 1], ["OUTPUT \"Too young\"", 1], ["total ← total + price", 2], ["count ← 0", 2], ["Is age >= 18?", 3], ["total > 100?", 3]]);
  sort("T43", "ad", "D09", "Abstraction or decomposition?", "Sort each example.", ["Abstraction", "Decomposition"], [
    ["A bus map shows stops and routes, not buildings", 0], ["A booking program stores age but not eye colour", 0], ["Only keeping the details needed to solve the problem", 0], ["Splitting a game into menu, gameplay and scoring", 1], ["Each team member writes one module", 1], ["A structure diagram of sub-problems", 1]]);
  order("T43", "bsorder", "D12", "Binary search steps", "Put the steps of a binary search in order.", ["Make sure the list is sorted", "Find the middle item", "Compare it with the target – stop if they match", "If the target is smaller, discard the upper half; if larger, discard the lower half", "Repeat with the half that is left until the item is found or no items are left"]);

  gen("T44", "predict", "D13", "Predict the output", "Work out exactly what the C# prints.", "predict");
  gen("T44", "ops", "D14", "C# operators", "Work out the value of each expression (watch out for integer division).", "ops");

  sort("T45", "errs", "D21", "Syntax, run-time or logic error?", "Classify each C# mistake.", ["Syntax error", "Run-time (execution) error", "Logic error"], [
    ["int total = 0  ← no semicolon", 0], ["Consle.WriteLine(\"Hi\");", 0], ["if (age > 18 { … }  ← missing )", 0], ["int x = 10 / count;  when count is 0", 1], ["Convert.ToInt32(\"ten\")", 1], ["scores[5] in an array of 5 elements", 1], ["Opening a file that does not exist", 1], ["if (mark > 50) for 'at least 50'", 2], ["average = total / 3 when total and 3 are int", 2], ["Adding the VAT twice", 2]]);
  sort("T45", "vcheck", "D21", "Validation in C#", "Which check does each condition carry out?", ["Presence", "Length", "Type", "Range", "Format"], [
    ["name != \"\"", 0], ["password.Length >= 8", 1], ["int.TryParse(input, out age)", 2], ["mark >= 0 && mark <= 100", 3], ["email.Contains(\"@\")", 4]]);

  gen("T46", "testdata", "D22", "Valid, extreme, invalid or null?", "Classify each piece of test data for the rule.", "testdata");
  sort("T46", "box", "D22", "Black box or white box?", "Sort each statement.", ["Black box", "White box"], [
    ["Only inputs and expected outputs are checked", 0], ["The tester cannot see the code", 0], ["Often done by users or independent testers", 0], ["Every path and condition in the code is tested", 1], ["Usually done by the programmer with trace tables", 1], ["Uses dry runs of the algorithm", 1]]);
  sort("T46", "levels", "D22", "Unit, integration or system testing?", "Sort each test.", ["Unit", "Integration", "System"], [
    ["Testing the CalculateCost method on its own", 0], ["Checking one module before it is joined to others", 0], ["Checking the booking and payment modules work together", 1], ["Checking data passes correctly between subroutines", 1], ["Testing the whole program against the specification", 2], ["Final test before handing over to the user", 2]]);
  order("T46", "plan", "D22", "Test plan columns", "Put the columns of a test plan in the usual order.", ["Test number", "Purpose of the test", "Test data", "Type of test data", "Expected outcome", "Actual outcome", "Action needed"]);

  sort("T47", "eval", "D23", "Evaluation criteria", "Which criterion is each comment about?", ["Meets the design", "Complete", "Efficient", "Robust"], [
    ["The screens match the layout in the design", 0], ["Every requirement in the specification is met", 1], ["The report feature was not finished", 1], ["Bookings take only two clicks", 2], ["The search finds results in under a second", 2], ["Entering 'abc' as an age shows an error instead of crashing", 3], ["It coped with 10 000 test bookings", 3]]);

  sort("T8", "where", "L20", "Cloud or local storage?", "Which kind of storage does each statement describe?", ["Cloud storage", "Local storage"], [
    ["Open your files from any device", 0], ["Share a file by sending a link", 0], ["The provider makes backups for you", 0], ["Works with no internet connection", 1], ["No monthly subscription", 1], ["You control exactly where the data is kept", 1]]);
  sort("T47", "tone", "D23", "Evaluative or just descriptive?", "Examiners reward evaluation: how well, with evidence. Sort each sentence.", ["Evaluative", "Only descriptive"], [
    ["Requirement 3 is fully met because tests 4 to 6 all passed", 0], ["The search is efficient: results appear in under a second with 10 000 records", 0], ["It is not fully robust – a negative age crashed it in test 9, so a range check should be added", 0], ["The program has a booking screen", 1], ["I used C# and Visual Studio", 1], ["There are six menus", 1]]);
  order("T47", "steps", "D23", "Evaluating a solution", "Put the evaluation process in a sensible order.", ["Re-read the original user requirements", "Collect evidence from the test plan results", "Ask the user for feedback", "Judge each requirement: met, partly met or not met", "Suggest improvements for anything not fully met"]);

  // ---------- C# challenges ----------
  var CH = [
    { id: "area", l: "D14", t: "T44", title: "Area of a rectangle", task: "Ask for the width and height (whole numbers) and output the area in the form <code>Area: 24</code>.",
      starter: 'Console.Write("Width: ");\nint width = Convert.ToInt32(Console.ReadLine());\nConsole.Write("Height: ");\n// read the height, then calculate and output the area\n',
      tests: [{ in: ["4", "6"], has: ["Area: 24"] }, { in: ["10", "3"], has: ["Area: 30"] }], hint: "int area = width * height; then Console.WriteLine(\"Area: \" + area);",
      model: 'Console.Write("Width: ");\nint width = Convert.ToInt32(Console.ReadLine());\nConsole.Write("Height: ");\nint height = Convert.ToInt32(Console.ReadLine());\nint area = width * height;\nConsole.WriteLine("Area: " + area);' },
    { id: "mins", l: "D14", t: "T44", title: "Minutes to hours", task: "Input a number of minutes and output it as hours and minutes, e.g. 135 → <code>2 hours 15 minutes</code>. Use integer division and %.",
      starter: 'Console.Write("Minutes: ");\nint minutes = Convert.ToInt32(Console.ReadLine());\n',
      tests: [{ in: ["135"], has: ["2 hours 15 minutes"] }, { in: ["60"], has: ["1 hours 0 minutes"] }, { in: ["59"], has: ["0 hours 59 minutes"] }], hint: "minutes / 60 gives whole hours because both are int; minutes % 60 gives what is left.",
      model: 'Console.Write("Minutes: ");\nint minutes = Convert.ToInt32(Console.ReadLine());\nint hours = minutes / 60;\nint left = minutes % 60;\nConsole.WriteLine(hours + " hours " + left + " minutes");' },
    { id: "grade", l: "D15", t: "T44", title: "Grade checker", task: "Input a mark. Output <code>Distinction</code> for 70 or more, <code>Merit</code> for 50–69, <code>Pass</code> for 40–49 and <code>Fail</code> below 40.",
      starter: 'Console.Write("Mark: ");\nint mark = Convert.ToInt32(Console.ReadLine());\n',
      tests: [{ in: ["70"], has: ["Distinction"], not: ["Merit"] }, { in: ["69"], has: ["Merit"] }, { in: ["50"], has: ["Merit"] }, { in: ["40"], has: ["Pass"] }, { in: ["39"], has: ["Fail"] }], hint: "Use if, else if, else if, else – and check the biggest band first.",
      model: 'Console.Write("Mark: ");\nint mark = Convert.ToInt32(Console.ReadLine());\nif (mark >= 70)\n    Console.WriteLine("Distinction");\nelse if (mark >= 50)\n    Console.WriteLine("Merit");\nelse if (mark >= 40)\n    Console.WriteLine("Pass");\nelse\n    Console.WriteLine("Fail");' },
    { id: "ticket", l: "D15", t: "T44", title: "Cinema ticket price", task: "Input an age. Children under 12 pay £5, people aged 65 or over pay £6, everyone else pays £9. Output e.g. <code>Price: £9</code>.",
      starter: 'Console.Write("Age: ");\nint age = Convert.ToInt32(Console.ReadLine());\n',
      tests: [{ in: ["11"], has: ["Price: £5"] }, { in: ["12"], has: ["Price: £9"] }, { in: ["64"], has: ["Price: £9"] }, { in: ["65"], has: ["Price: £6"] }], hint: "Test the boundaries: 11, 12, 64 and 65.",
      model: 'Console.Write("Age: ");\nint age = Convert.ToInt32(Console.ReadLine());\nint price;\nif (age < 12)\n    price = 5;\nelse if (age >= 65)\n    price = 6;\nelse\n    price = 9;\nConsole.WriteLine("Price: £" + price);' },
    { id: "times", l: "D16", t: "T44", title: "Times table", task: "Input a number and use a FOR loop to output its times table from 1 to 10, e.g. <code>7 x 1 = 7</code> … <code>7 x 10 = 70</code>.",
      starter: 'Console.Write("Which table? ");\nint n = Convert.ToInt32(Console.ReadLine());\n',
      tests: [{ in: ["7"], has: ["7 x 1 = 7", "7 x 5 = 35", "7 x 10 = 70"], not: ["7 x 11"] }, { in: ["3"], has: ["3 x 1 = 3", "3 x 10 = 30"] }], hint: "for (int i = 1; i <= 10; i++) { … }",
      model: 'Console.Write("Which table? ");\nint n = Convert.ToInt32(Console.ReadLine());\nfor (int i = 1; i <= 10; i++)\n{\n    Console.WriteLine(n + " x " + i + " = " + (n * i));\n}' },
    { id: "total", l: "D16", t: "T44", title: "Running total", task: "Keep asking for numbers until 0 is entered, then output <code>Total: </code> followed by the sum of the numbers.",
      starter: 'int total = 0;\nConsole.Write("Number (0 to stop): ");\nint number = Convert.ToInt32(Console.ReadLine());\n',
      tests: [{ in: ["4", "5", "6", "0"], has: ["Total: 15"] }, { in: ["0"], has: ["Total: 0"] }], hint: "while (number != 0) { add it on, then read the next number }",
      model: 'int total = 0;\nConsole.Write("Number (0 to stop): ");\nint number = Convert.ToInt32(Console.ReadLine());\nwhile (number != 0)\n{\n    total = total + number;\n    Console.Write("Number (0 to stop): ");\n    number = Convert.ToInt32(Console.ReadLine());\n}\nConsole.WriteLine("Total: " + total);' },
    { id: "tries", l: "D16", t: "T44", title: "Three tries", task: "The password is <code>ergs2026</code>. Give the user up to three attempts. Output <code>Access granted</code> as soon as it is right, or <code>Locked out</code> after three wrong attempts.",
      starter: 'string password = "ergs2026";\nint attempts = 0;\nbool ok = false;\n',
      tests: [{ in: ["ergs2026"], has: ["Access granted"], not: ["Locked out"] }, { in: ["abc", "ergs2026"], has: ["Access granted"] }, { in: ["a", "b", "c"], has: ["Locked out"], not: ["Access granted"] }], hint: "while (attempts < 3 && !ok) { … } then decide what to output.",
      model: 'string password = "ergs2026";\nint attempts = 0;\nbool ok = false;\nwhile (attempts < 3 && !ok)\n{\n    Console.Write("Password: ");\n    string guess = Console.ReadLine();\n    attempts++;\n    if (guess == password) ok = true;\n}\nif (ok)\n    Console.WriteLine("Access granted");\nelse\n    Console.WriteLine("Locked out");' },
    { id: "arr", l: "D17", t: "T44", title: "Array total and highest", task: "Using a loop over the array <code>scores</code>, output <code>Total: </code> and <code>Highest: </code>.",
      starter: 'int[] scores = { 45, 72, 38, 90, 61 };\n',
      tests: [{ in: [], has: ["Total: 306", "Highest: 90"] }], hint: "Start highest at scores[0] and replace it when you find a bigger value.",
      model: 'int[] scores = { 45, 72, 38, 90, 61 };\nint total = 0;\nint highest = scores[0];\nfor (int i = 0; i < scores.Length; i++)\n{\n    total = total + scores[i];\n    if (scores[i] > highest) highest = scores[i];\n}\nConsole.WriteLine("Total: " + total);\nConsole.WriteLine("Highest: " + highest);' },
    { id: "passes", l: "D17", t: "T44", title: "Count the passes", task: "Read 5 marks into an array called <code>marks</code>, then count how many are 50 or more. Output <code>Passes: </code> and the count.",
      starter: 'int[] marks = new int[5];\n',
      tests: [{ in: ["45", "72", "38", "90", "61"], has: ["Passes: 3"] }, { in: ["50", "49", "50", "10", "100"], has: ["Passes: 3"] }], hint: "One loop to fill the array, then a loop (or the same one) with if (marks[i] >= 50) count++;",
      model: 'int[] marks = new int[5];\nint count = 0;\nfor (int i = 0; i < marks.Length; i++)\n{\n    Console.Write("Mark " + (i + 1) + ": ");\n    marks[i] = Convert.ToInt32(Console.ReadLine());\n    if (marks[i] >= 50) count++;\n}\nConsole.WriteLine("Passes: " + count);' },
    { id: "init", l: "D18", t: "T44", title: "Initials", task: "Input a full name such as <code>Ada Lovelace</code> and output the initials, e.g. <code>A.L.</code>",
      starter: 'Console.Write("Full name: ");\nstring name = Console.ReadLine();\n',
      tests: [{ in: ["Ada Lovelace"], has: ["A.L."] }, { in: ["Grace Hopper"], has: ["G.H."] }], hint: "string[] parts = name.Split(' '); then use parts[0][0] and parts[1][0].",
      model: 'Console.Write("Full name: ");\nstring name = Console.ReadLine();\nstring[] parts = name.Split(\' \');\nConsole.WriteLine(parts[0][0] + "." + parts[1][0] + ".");' },
    { id: "vowels", l: "D18", t: "T44", title: "Count the vowels", task: "Input a word and output <code>Vowels: </code> and how many vowels (a, e, i, o, u – upper or lower case) it contains.",
      starter: 'Console.Write("Word: ");\nstring word = Console.ReadLine();\n',
      tests: [{ in: ["Enniskillen"], has: ["Vowels: 4"] }, { in: ["rhythm"], has: ["Vowels: 0"] }, { in: ["AEIOU"], has: ["Vowels: 5"] }], hint: "Loop through word.ToLower() and use \"aeiou\".Contains(c).",
      model: 'Console.Write("Word: ");\nstring word = Console.ReadLine();\nint count = 0;\nforeach (char c in word.ToLower())\n{\n    if ("aeiou".Contains(c)) count++;\n}\nConsole.WriteLine("Vowels: " + count);' },
    { id: "email", l: "D18", t: "T44", title: "Email checker", task: "Input an email address. It is valid only if it contains <code>@</code> and there is a full stop somewhere after the @. Output <code>Valid</code> or <code>Invalid</code>.",
      starter: 'Console.Write("Email: ");\nstring email = Console.ReadLine();\n',
      tests: [{ in: ["j.smith@school.ni"], has: ["Valid"], not: ["Invalid"] }, { in: ["jsmith.school"], has: ["Invalid"] }, { in: ["j@school"], has: ["Invalid"] }], hint: "int at = email.IndexOf(\"@\"); then look for \".\" in email.Substring(at).",
      model: 'Console.Write("Email: ");\nstring email = Console.ReadLine();\nint at = email.IndexOf("@");\nif (at >= 0 && email.Substring(at).Contains("."))\n    Console.WriteLine("Valid");\nelse\n    Console.WriteLine("Invalid");' },
    { id: "vat", l: "D19", t: "T44", title: "VAT function", task: "Write a function <code>static double AddVat(double price)</code> that returns the price plus 20% VAT. Input a price and output the result to 2 decimal places, e.g. <code>60.00</code>.",
      starter: 'static double AddVat(double price)\n{\n    // return the price with 20% VAT added\n}\n\nConsole.Write("Price: ");\ndouble p = Convert.ToDouble(Console.ReadLine());\nConsole.WriteLine(AddVat(p).ToString("F2"));\n',
      tests: [{ in: ["50"], has: ["60.00"] }, { in: ["19.99"], has: ["23.99"] }, { in: ["0"], has: ["0.00"] }], hint: "return price * 1.2;",
      model: 'static double AddVat(double price)\n{\n    return price * 1.2;\n}\n\nConsole.Write("Price: ");\ndouble p = Convert.ToDouble(Console.ReadLine());\nConsole.WriteLine(AddVat(p).ToString("F2"));' },
    { id: "validage", l: "D19", t: "T44", title: "Valid age function", task: "Write <code>static bool IsValidAge(int age)</code> that returns true for ages 11 to 18 inclusive. Use it to output <code>Valid</code> or <code>Invalid</code> for an age that is input.",
      starter: 'static bool IsValidAge(int age)\n{\n    \n}\n\nConsole.Write("Age: ");\nint a = Convert.ToInt32(Console.ReadLine());\n',
      tests: [{ in: ["11"], has: ["Valid"], not: ["Invalid"] }, { in: ["18"], has: ["Valid"], not: ["Invalid"] }, { in: ["10"], has: ["Invalid"] }, { in: ["19"], has: ["Invalid"] }], hint: "return age >= 11 && age <= 18;",
      model: 'static bool IsValidAge(int age)\n{\n    return age >= 11 && age <= 18;\n}\n\nConsole.Write("Age: ");\nint a = Convert.ToInt32(Console.ReadLine());\nif (IsValidAge(a))\n    Console.WriteLine("Valid");\nelse\n    Console.WriteLine("Invalid");' },
    { id: "file", l: "D20", t: "T44", title: "High-score file", task: "Ask for three players' names and scores and write each as <code>name,score</code> to <code>scores.txt</code>. Then read the file back and output the winner, e.g. <code>Highest: Cara 91</code>.",
      starter: 'StreamWriter sw = new StreamWriter("scores.txt");\nfor (int i = 0; i < 3; i++)\n{\n    Console.Write("Name: ");\n    string name = Console.ReadLine();\n    Console.Write("Score: ");\n    string score = Console.ReadLine();\n    // write name,score to the file\n}\nsw.Close();\n\n// now read the file and find the highest score\n',
      tests: [{ in: ["Aoife", "87", "Ben", "74", "Cara", "91"], has: ["Highest: Cara 91"] }, { in: ["Dan", "50", "Eve", "40", "Finn", "45"], has: ["Highest: Dan 50"] }], fresh: true, hint: "Split each line with line.Split(','), convert parts[1] to int and keep the best so far.",
      model: 'StreamWriter sw = new StreamWriter("scores.txt");\nfor (int i = 0; i < 3; i++)\n{\n    Console.Write("Name: ");\n    string name = Console.ReadLine();\n    Console.Write("Score: ");\n    string score = Console.ReadLine();\n    sw.WriteLine(name + "," + score);\n}\nsw.Close();\n\nStreamReader sr = new StreamReader("scores.txt");\nstring best = "";\nint top = -1;\nstring line = sr.ReadLine();\nwhile (line != null)\n{\n    string[] parts = line.Split(\',\');\n    int s = Convert.ToInt32(parts[1]);\n    if (s > top) { top = s; best = parts[0]; }\n    line = sr.ReadLine();\n}\nsr.Close();\nConsole.WriteLine("Highest: " + best + " " + top);' },
    { id: "vloop", l: "D21", t: "T45", title: "Validation loop", task: "Ask for a number from 1 to 10. While it is out of range, output an error message and ask again. When it is valid, output <code>Thank you</code>.",
      starter: 'Console.Write("Enter 1-10: ");\nint num = Convert.ToInt32(Console.ReadLine());\n',
      tests: [{ in: ["5"], has: ["Thank you"] }, { in: ["0", "11", "7"], has: ["Thank you"] }, { in: ["1"], has: ["Thank you"] }, { in: ["10"], has: ["Thank you"] }], hint: "while (num < 1 || num > 10) { error message; read again }",
      model: 'Console.Write("Enter 1-10: ");\nint num = Convert.ToInt32(Console.ReadLine());\nwhile (num < 1 || num > 10)\n{\n    Console.WriteLine("Error: the number must be from 1 to 10");\n    Console.Write("Enter 1-10: ");\n    num = Convert.ToInt32(Console.ReadLine());\n}\nConsole.WriteLine("Thank you");' },
    { id: "safediv", l: "D21", t: "T45", title: "Safe division", task: "Ask for two whole numbers and output the first divided by the second (integer division). Use try … catch so that letters give <code>Please enter whole numbers</code> and dividing by zero gives <code>Cannot divide by zero</code>.",
      starter: 'try\n{\n    Console.Write("First: ");\n    int a = Convert.ToInt32(Console.ReadLine());\n    Console.Write("Second: ");\n    int b = Convert.ToInt32(Console.ReadLine());\n    Console.WriteLine(a / b);\n}\n// add catch blocks here\n',
      tests: [{ in: ["10", "4"], has: ["2"] }, { in: ["abc"], has: ["Please enter whole numbers"] }, { in: ["10", "0"], has: ["Cannot divide by zero"] }], hint: "catch (FormatException) { … } catch (DivideByZeroException) { … }",
      model: 'try\n{\n    Console.Write("First: ");\n    int a = Convert.ToInt32(Console.ReadLine());\n    Console.Write("Second: ");\n    int b = Convert.ToInt32(Console.ReadLine());\n    Console.WriteLine(a / b);\n}\ncatch (FormatException)\n{\n    Console.WriteLine("Please enter whole numbers");\n}\ncatch (DivideByZeroException)\n{\n    Console.WriteLine("Cannot divide by zero");\n}' }
  ];
  // Another course (GCE) supplies its own activities and challenges in COURSE.acts / COURSE.challenges
  var CC = root.COURSE;
  if (CC && CC.hub) { S.length = 0; CH.length = 0; }
  if (CC) { (CC.acts || []).forEach(function (a) { S.push(a); }); (CC.challenges || []).forEach(function (c) { CH.push(c); }); }
  CH.forEach(function (c) { S.push({ t: c.t, id: "cs-" + c.id, l: c.l, type: "code", title: "C# challenge: " + c.title, intro: "", ch: c }); });

  // ---------- generators: each returns {q (html), kind, a, opts?, explain, check?} ----------
  var G = {};
  G.units = function () {
    var t = pick([
      function () { var n = ri(1, 8); return { q: "How many bits are in " + n + " byte" + (n > 1 ? "s" : "") + "?", a: String(n * 8), explain: n + " × 8 = " + n * 8 }; },
      function () { var n = ri(1, 6); return { q: "How many nibbles are in " + n + " byte" + (n > 1 ? "s" : "") + "?", a: String(n * 2), explain: "A nibble is 4 bits, so there are 2 nibbles in a byte: " + n + " × 2 = " + n * 2 }; },
      function () { var n = pick([1, 2, 3, 4, 5, 8]); return { q: "How many KB are in " + n + " MB?", a: String(n * 1024), explain: n + " × 1024 = " + n * 1024 }; },
      function () { var n = pick([1, 2, 4, 8]); return { q: "How many MB are in " + n + " GB?", a: String(n * 1024), explain: n + " × 1024 = " + n * 1024 }; },
      function () { var n = pick([2, 3, 4, 8, 16]); return { q: "Convert " + fmtNum(n * 1024) + " bytes to KB.", a: String(n), explain: fmtNum(n * 1024) + " ÷ 1024 = " + n }; },
      function () { var n = pick([1, 2, 3]); return { q: "How many GB are in " + n + " TB?", a: String(n * 1024), explain: n + " × 1024 = " + n * 1024 }; },
      function () { var n = pick([1024, 2048, 4096, 8192]); return { q: "Convert " + fmtNum(n) + " MB to GB.", a: String(n / 1024), explain: fmtNum(n) + " ÷ 1024 = " + n / 1024 }; }
    ]);
    var r = t(); r.kind = "text"; return r;
  };
  G.imagesize = function () {
    var w = pick([100, 200, 256, 320, 400, 512, 640, 800]), h = pick([100, 128, 200, 256, 300, 400, 480]), d = pick([1, 8, 16, 24]);
    var bytes = w * h * d / 8, kb = bytes / 1024;
    if (kb === Math.floor(kb) && Math.random() < 0.5) return { q: "An image is " + w + " × " + h + " pixels with a colour depth of " + d + " bit" + (d > 1 ? "s" : "") + ". What is its file size in <b>KB</b>?", kind: "text", a: String(kb), explain: w + " × " + h + " × " + d + " = " + fmtNum(w * h * d) + " bits ÷ 8 = " + fmtNum(bytes) + " bytes ÷ 1024 = " + kb + " KB" };
    return { q: "An image is " + w + " × " + h + " pixels with a colour depth of " + d + " bit" + (d > 1 ? "s" : "") + ". What is its file size in <b>bytes</b>?", kind: "text", a: String(bytes), explain: w + " × " + h + " × " + d + " = " + fmtNum(w * h * d) + " bits ÷ 8 = " + fmtNum(bytes) + " bytes" };
  };
  G.soundsize = function () {
    var r = pick([8000, 11000, 22000, 44100, 48000]), d = pick([8, 16, 24]), c = pick([1, 2]), s = pick([5, 10, 30, 60]);
    if (Math.random() < 0.4) return { q: "A sound is sampled at " + fmtNum(r) + " Hz with a bit depth of " + d + " bits in " + (c === 2 ? "stereo (2 channels)" : "mono (1 channel)") + ". What is the bit rate in bits per second?", kind: "text", a: String(r * d * c), explain: fmtNum(r) + " × " + d + " × " + c + " = " + fmtNum(r * d * c) + " bits per second" };
    var bits = r * d * c * s;
    return { q: "A " + s + "-second recording is sampled at " + fmtNum(r) + " Hz with a bit depth of " + d + " bits in " + (c === 2 ? "stereo (2 channels)" : "mono (1 channel)") + ". What is the file size in <b>bytes</b>?", kind: "text", a: String(bits / 8), explain: fmtNum(r) + " × " + d + " × " + s + " × " + c + " = " + fmtNum(bits) + " bits ÷ 8 = " + fmtNum(bits / 8) + " bytes" };
  };
  var REC = [["Aoife", 10, "Erne", 42, "Y"], ["Ben", 9, "Lough", 17, "N"], ["Cara", 11, "Portora", 35, "Y"], ["Dan", 10, "Lough", 8, "Y"], ["Eve", 8, "Erne", 25, "N"], ["Finn", 11, "Erne", 51, "N"], ["Grace", 9, "Portora", 30, "Y"], ["Hugh", 12, "Lough", 22, "Y"]];
  G.dbquery = function () {
    var conds = [
      [function (r) { return r[3] > 30; }, "Merits > 30"], [function (r) { return r[3] >= 25; }, "Merits >= 25"], [function (r) { return r[1] === 10; }, "Year = 10"],
      [function (r) { return r[2] === "Erne"; }, "House = \"Erne\""], [function (r) { return r[4] === "Y"; }, "Club = \"Y\""], [function (r) { return r[1] < 10; }, "Year < 10"], [function (r) { return r[3] >= 20 && r[3] <= 40; }, "Merits BETWEEN 20 AND 40"]];
    var a = pick(conds), b = pick(conds.filter(function (x) { return x !== a; })), op = pick(["AND", "OR", "single"]);
    var f = op === "single" ? a[0] : op === "AND" ? function (r) { return a[0](r) && b[0](r); } : function (r) { return a[0](r) || b[0](r); };
    var crit = op === "single" ? a[1] : a[1] + " " + op + " " + b[1];
    var ans = []; REC.forEach(function (r, i) { if (f(r)) ans.push(i); });
    return { q: "Table <b>Pupils</b>. Query criteria: <code>" + esc(crit) + "</code>. Tick every record the query returns.", kind: "rows", head: ["Name", "Year", "House", "Merits", "Club"], rows: REC, a: ans, explain: ans.length ? "Returned: " + ans.map(function (i) { return REC[i][0]; }).join(", ") + "." : "No records match." + (op === "AND" ? " AND needs both conditions to be true." : op === "OR" ? " OR needs either condition to be true." : "") };
  };
  var SHEET = [["", "A", "B", "C", "D"], ["1", "Item", "Price", "Qty", "Code"], ["2", "Pen", 2, 10, "P1"], ["3", "Ruler", 3, 4, "R2"], ["4", "Folder", 5, 6, "F3"], ["5", "Calculator", 12, 2, "C4"], ["6", "Glue", 4, 5, "G5"]];
  G.sheet = function () {
    var price = [2, 3, 5, 12, 4], qty = [10, 4, 6, 2, 5];
    var t = pick([
      function () { return { f: "=SUM(B2:B6)", a: String(price.reduce(function (x, y) { return x + y; })), e: "2 + 3 + 5 + 12 + 4 = 26" }; },
      function () { return { f: "=MAX(C2:C6)", a: "10", e: "The largest quantity is 10" }; },
      function () { return { f: "=MIN(B2:B6)", a: "2", e: "The smallest price is 2" }; },
      function () { return { f: "=COUNT(B2:B6)", a: "5", e: "COUNT counts the 5 cells containing numbers" }; },
      function () { return { f: "=AVERAGE(C2:C6)", a: String((10 + 4 + 6 + 2 + 5) / 5), e: "(10 + 4 + 6 + 2 + 5) ÷ 5 = 5.4" }; },
      function () { var r = ri(2, 6); return { f: "=B" + r + "*C" + r, a: String(price[r - 2] * qty[r - 2]), e: price[r - 2] + " × " + qty[r - 2] + " = " + price[r - 2] * qty[r - 2] }; },
      function () { var r = ri(2, 6), v = qty[r - 2]; return { f: '=IF(C' + r + '>=5,"OK","Reorder")', a: v >= 5 ? "OK" : "Reorder", e: "C" + r + " is " + v + (v >= 5 ? ", which is ≥ 5, so OK" : ", which is less than 5, so Reorder") }; },
      function () { var r = ri(2, 6); return { f: '=VLOOKUP("' + SHEET[r][4] + '",D2:D6,1,FALSE)', a: SHEET[r][4], e: "Searching the first column D2:D6 for " + SHEET[r][4] + " returns it from column 1 of the range" }; },
      function () { var r = ri(2, 6); return { f: '=VLOOKUP("' + SHEET[r][1] + '",A2:C6,2,FALSE)', a: String(price[r - 2]), e: "Find " + SHEET[r][1] + " in the first column of A2:C6 and return column 2 (Price): " + price[r - 2] }; }
    ])();
    return { q: "What value does <code>" + esc(t.f) + "</code> return?", kind: "text", grid: SHEET, a: t.a, explain: t.e };
  };
  G.cellref = function () {
    var col = pick(["D", "E", "F"]), from = ri(2, 4), to = from + ri(1, 4), abs = Math.random() < 0.6;
    var f1 = abs ? "=B" + from + "*$H$1" : "=B" + from + "*C" + from, f2 = abs ? "=B" + to + "*$H$1" : "=B" + to + "*C" + to;
    return { q: "Cell <b>" + col + from + "</b> contains <code>" + f1 + "</code>. It is copied down to <b>" + col + to + "</b>. What formula is in " + col + to + "?", kind: "text", a: f2, norm: "formula", explain: abs ? "B" + from + " is relative, so it changes to B" + to + "; $H$1 is absolute, so it stays fixed." : "Both references are relative, so the row numbers change by " + (to - from) + "." };
  };
  G.caesar = function () {
    var words = ["NETWORK", "FIREWALL", "PHISHING", "MALWARE", "BACKUP", "ROUTER", "BINARY", "CIPHER", "PASSWORD", "SECURE"];
    var w = pick(words), k = ri(1, 5), enc = w.split("").map(function (c) { return String.fromCharCode((c.charCodeAt(0) - 65 + k) % 26 + 65); }).join("");
    if (Math.random() < 0.5) return { q: "Encrypt <b>" + w + "</b> with a Caesar shift of <b>" + k + "</b> (A → " + String.fromCharCode(65 + k) + ").", kind: "text", a: enc, norm: "upper", explain: w + " → " + enc };
    return { q: "Decrypt <b>" + enc + "</b>. It was encrypted with a shift of <b>" + k + "</b>.", kind: "text", a: w, norm: "upper", explain: "Shift each letter back by " + k + ": " + enc + " → " + w };
  };
  G.bin2den = function () { var n = ri(1, 255); return { q: "Convert <code>" + bin8(n) + "</code> to denary.", kind: "text", a: String(n), explain: bin8(n).split("").map(function (b, i) { return b === "1" ? 128 >> i : null; }).filter(function (x) { return x; }).join(" + ") + " = " + n }; };
  G.den2bin = function () { var n = ri(1, 255); return { q: "Convert <b>" + n + "</b> to 8-bit binary.", kind: "text", a: bin8(n), norm: "bin", explain: n + " = " + bin8(n).split("").map(function (b, i) { return b === "1" ? 128 >> i : null; }).filter(function (x) { return x; }).join(" + ") + " → " + bin8(n) }; };
  G.hex = function () {
    var n = ri(10, 255);
    return pick([
      { q: "Convert hex <code>" + hex2(n) + "</code> to denary.", kind: "text", a: String(n), explain: hex2(n)[0] + " × 16 + " + hex2(n)[1] + " = " + Math.floor(n / 16) + " × 16 + " + n % 16 + " = " + n },
      { q: "Convert <b>" + n + "</b> to hexadecimal.", kind: "text", a: hex2(n), norm: "upper", explain: n + " ÷ 16 = " + Math.floor(n / 16) + " remainder " + n % 16 + " → " + hex2(n) },
      { q: "Convert <code>" + bin8(n) + "</code> to hexadecimal.", kind: "text", a: hex2(n), norm: "upper", explain: "Split into nibbles " + bin8(n).slice(0, 4) + " " + bin8(n).slice(4) + " → " + hex2(n) },
      { q: "Convert hex <code>" + hex2(n) + "</code> to 8-bit binary.", kind: "text", a: bin8(n), norm: "bin", explain: "Each hex digit is 4 bits: " + hex2(n)[0] + " → " + bin8(n).slice(0, 4) + ", " + hex2(n)[1] + " → " + bin8(n).slice(4) }
    ]);
  };
  G.binadd = function () {
    var a = ri(20, 200), b = ri(20, 200), s = a + b;
    if (Math.random() < 0.35) return { q: "Does <code>" + bin8(a) + " + " + bin8(b) + "</code> cause overflow in an 8-bit register?", kind: "choice", opts: ["Yes", "No"], a: s > 255 ? "Yes" : "No", explain: a + " + " + b + " = " + s + (s > 255 ? ", which is more than 255, so a ninth bit is needed – overflow." : ", which fits in 8 bits (max 255) – no overflow.") };
    return { q: "Add <code>" + bin8(a) + "</code> and <code>" + bin8(b) + "</code>. Give the 8-bit result." + " ", kind: "text", a: bin8(s & 255), norm: "bin", explain: a + " + " + b + " = " + s + (s > 255 ? ". This needs 9 bits, so the carry is lost (overflow) and the 8-bit result is " + bin8(s & 255) + " (" + (s & 255) + ")." : " = " + bin8(s)) };
  };
  G.ascii = function () {
    var up = Math.random() < 0.5, base = up ? 65 : 97, k = ri(1, 25), ch = String.fromCharCode(base + k), first = up ? "A" : "a";
    if (Math.random() < 0.5) return { q: "The ASCII code for '" + first + "' is " + base + ". What is the code for '" + ch + "'?", kind: "text", a: String(base + k), explain: ch + " is " + k + " letters after " + first + ": " + base + " + " + k + " = " + (base + k) };
    return { q: "The ASCII code for '" + first + "' is " + base + ". Which character has the code " + (base + k) + "?", kind: "text", a: ch, explain: (base + k) + " − " + base + " = " + k + " letters after " + first + ": '" + ch + "'" };
  };
  G.dtype = function () {
    var v = pick([["42", "int"], ["-7", "int"], ["3.14", "double"], ["19.99", "double"], ["'A'", "char"], ["'7'", "char"], ["\"Belfast\"", "string"], ["\"028 6632 2153\"", "string"], ["true", "bool"], ["false", "bool"], ["\"42\"", "string"]]);
    return { q: "Which C# data type holds the value <code>" + esc(v[0]) + "</code>?", kind: "choice", opts: ["int", "double", "char", "string", "bool"], a: v[1], explain: v[0] + " is a" + (v[1] === "int" ? "n int (whole number)" : v[1] === "double" ? " double (has a decimal part)" : v[1] === "char" ? " char (one character in single quotes)" : v[1] === "string" ? " string (text in double quotes" + (v[0] === "\"42\"" ? " – even though it looks like a number" : "") + ")" : " bool (true or false)") };
  };
  var EXPRS = [["A AND B", function (a, b) { return a && b; }, 2], ["A OR B", function (a, b) { return a || b; }, 2], ["NOT A", function (a) { return !a; }, 1], ["NOT (A AND B)", function (a, b) { return !(a && b); }, 2], ["NOT (A OR B)", function (a, b) { return !(a || b); }, 2], ["NOT A OR B", function (a, b) { return !a || b; }, 2], ["A AND NOT B", function (a, b) { return a && !b; }, 2], ["(A OR B) AND C", function (a, b, c) { return (a || b) && c; }, 3], ["A AND (B OR C)", function (a, b, c) { return a && (b || c); }, 3], ["(A AND B) OR C", function (a, b, c) { return (a && b) || c; }, 3], ["NOT (A AND B) AND C", function (a, b, c) { return !(a && b) && c; }, 3]];
  G.truth = function () {
    var e = pick(EXPRS), n = e[2], rows = [];
    for (var i = 0; i < (1 << n); i++) { var ins = []; for (var j = n - 1; j >= 0; j--) ins.push((i >> j) & 1); rows.push(ins); }
    return { q: "Complete the truth table for <b>Q = " + e[0] + "</b>. Click a cell to switch between 0 and 1.", kind: "cells", head: ["A", "B", "C"].slice(0, n).concat(["Q"]), rows: rows, a: rows.map(function (r) { return e[1].apply(null, r.map(Boolean)) ? 1 : 0; }), explain: "Work out any bracket first, then apply NOT, AND, OR." };
  };
  G.bubble = function () {
    var L = distinct(5, 1, 30), a = L.slice(), swaps = 0;
    for (var i = 0; i < a.length - 1; i++) if (a[i] > a[i + 1]) { var t = a[i]; a[i] = a[i + 1]; a[i + 1] = t; swaps++; }
    if (Math.random() < 0.3) return { q: "How many swaps does the <b>first pass</b> of an ascending bubble sort make on <code>" + L.join(", ") + "</code>?", kind: "text", a: String(swaps), explain: "After pass 1: " + a.join(", ") + " (" + swaps + " swaps)" };
    return { q: "Write the list after the <b>first pass</b> of an ascending bubble sort on <code>" + L.join(", ") + "</code>. Separate numbers with commas.", kind: "text", a: a.join(","), norm: "list", explain: "Compare neighbours left to right, swapping when the left one is bigger: " + a.join(", ") + ". The largest value has bubbled to the end." };
  };
  G.insertion = function () {
    var L = distinct(5, 1, 30), p = ri(1, 2), a = L.slice();
    for (var i = 1; i <= p; i++) { var v = a[i], j = i - 1; while (j >= 0 && a[j] > v) { a[j + 1] = a[j]; j--; } a[j + 1] = v; }
    return { q: "Write the list after <b>" + p + " pass" + (p > 1 ? "es" : "") + "</b> of an ascending insertion sort on <code>" + L.join(", ") + "</code> (pass 1 inserts the second item). Separate with commas.", kind: "text", a: a.join(","), norm: "list", explain: "The first " + (p + 1) + " items are now sorted: " + a.join(", ") };
  };
  G.binsearch = function () {
    var n = pick([7, 9, 11, 15]), L = distinct(n, 1, 99).sort(function (x, y) { return x - y; }), target = Math.random() < 0.8 ? pick(L) : ri(1, 99);
    var lo = 0, hi = n - 1, seen = [], found = false;
    while (lo <= hi) { var mid = Math.floor((lo + hi) / 2); seen.push(L[mid]); if (L[mid] === target) { found = true; break; } if (L[mid] < target) lo = mid + 1; else hi = mid - 1; }
    return { q: "A binary search looks for <b>" + target + "</b> in <code>" + L.join(", ") + "</code>, using middle = (low + high) DIV 2 with indexes from 0. List the values compared, in order, separated by commas.", kind: "text", a: seen.join(","), norm: "list", explain: "Compared: " + seen.join(" → ") + (found ? " – found." : " – not in the list.") };
  };
  G.linear = function () {
    var L = distinct(ri(6, 9), 1, 60), present = Math.random() < 0.75, target = present ? pick(L) : 61 + ri(0, 30);
    var c = present ? L.indexOf(target) + 1 : L.length;
    return { q: "How many comparisons does a linear search make to " + (present ? "find" : "decide it cannot find") + " <b>" + target + "</b> in <code>" + L.join(", ") + "</code>?", kind: "text", a: String(c), explain: present ? target + " is item " + c + ", so " + c + " comparisons." : "It is not in the list, so every item is checked: " + c + " comparisons." };
  };
  G.predict = function () {
    var t = pick([
      function () { var a = ri(1, 4), b = a + ri(2, 4), s = 0; for (var i = a; i < b; i++) s += i; return { c: "int total = 0;\nfor (int i = " + a + "; i < " + b + "; i++)\n{\n    total = total + i;\n}\nConsole.WriteLine(total);", a: String(s) }; },
      function () { var x = ri(1, 3), lim = pick([20, 30, 50, 100]), c = 0; while (x < lim) { x *= 2; c++; } return { c: "int x = " + (x / Math.pow(2, c)) + ";\nint count = 0;\nwhile (x < " + lim + ")\n{\n    x = x * 2;\n    count++;\n}\nConsole.WriteLine(x + \" \" + count);", a: x + " " + c }; },
      function () { var a = ri(10, 40), b = ri(3, 7); return { c: "int a = " + a + ";\nint b = " + b + ";\nConsole.WriteLine(a / b);\nConsole.WriteLine(a % b);", a: Math.floor(a / b) + "\n" + (a % b) }; },
      function () { var s = ri(30, 90), g = s >= 70 ? "A" : s >= 50 ? "B" : "C"; return { c: "int score = " + s + ";\nif (score >= 70)\n    Console.WriteLine(\"A\");\nelse if (score >= 50)\n    Console.WriteLine(\"B\");\nelse\n    Console.WriteLine(\"C\");", a: g }; },
      function () { var w = pick(["Belfast", "Omagh", "Enniskillen", "Lisburn", "Newry"]), st = ri(0, 2), ln = ri(2, 3); return { c: "string town = \"" + w + "\";\nConsole.WriteLine(town.Length);\nConsole.WriteLine(town.Substring(" + st + ", " + ln + ").ToUpper());", a: w.length + "\n" + w.substr(st, ln).toUpperCase() }; },
      function () { var arr = distinct(5, 1, 20), i = ri(0, 4); return { c: "int[] nums = { " + arr.join(", ") + " };\nConsole.WriteLine(nums[" + i + "] + nums.Length);", a: String(arr[i] + 5) }; },
      function () { var n = ri(3, 5), out = []; for (var i = n; i >= 1; i--) out.push(i * i); return { c: "for (int i = " + n + "; i >= 1; i--)\n{\n    Console.Write(i * i + \" \");\n}", a: out.join(" ") }; },
      function () { var a = ri(2, 9); return { c: "double d = " + a + " / 2;\ndouble e = " + a + " / 2.0;\nConsole.WriteLine(d + \" \" + e);", a: Math.floor(a / 2) + " " + (a / 2) }; }
    ])();
    return { q: "What does this C# output? (Put each line of output on a new line.)", code: t.c, kind: "area", a: t.a, norm: "lines", explain: "Output:\n" + t.a };
  };
  G.ops = function () {
    var t = pick([
      function () { var a = ri(7, 30), b = ri(2, 6); return ["int: " + a + " / " + b, String(Math.floor(a / b)), "Both are int, so the decimal part is dropped."]; },
      function () { var a = ri(7, 30), b = ri(2, 6); return [a + " % " + b, String(a % b), "% gives the remainder."]; },
      function () { var a = ri(3, 9) * 2 + 1; return ["(double)" + a + " / 2", String(a / 2), "The cast makes it a double, so the answer keeps its decimal part."]; },
      function () { var a = ri(2, 6), b = ri(2, 6), c = ri(2, 6); return [a + " + " + b + " * " + c, String(a + b * c), "Multiplication is done before addition."]; },
      function () { var a = ri(2, 6), b = ri(2, 6), c = ri(2, 6); return ["(" + a + " + " + b + ") * " + c, String((a + b) * c), "Brackets first."]; },
      function () { var x = ri(5, 20); return [x + " > 10 && " + x + " < 15", (x > 10 && x < 15) ? "true" : "false", "&& needs both to be true."]; },
      function () { var x = ri(1, 20); return [x + " < 5 || " + x + " > 15", (x < 5 || x > 15) ? "true" : "false", "|| needs at least one to be true."]; },
      function () { var a = ri(2, 5), b = ri(2, 3); return ["Math.Pow(" + a + ", " + b + ")", String(Math.pow(a, b)), "Math.Pow raises the first number to the power of the second."]; }
    ])();
    return { q: "What is the value of <code>" + esc(t[0].replace(/^int: /, "")) + "</code>" + (/^int: /.test(t[0]) ? " (both values are int)" : "") + "?", kind: "text", a: t[1], norm: "lower", explain: t[2] };
  };
  G.testdata = function () {
    var rule = pick([["age", "Age must be from 11 to 18", 11, 18], ["mark", "Mark must be from 0 to 100", 0, 100], ["qty", "Quantity must be from 1 to 10", 1, 10], ["nights", "Nights must be from 1 to 14", 1, 14]]);
    var lo = rule[2], hi = rule[3];
    var v = pick([[String(lo), "Extreme (boundary)"], [String(hi), "Extreme (boundary)"], [String(Math.floor((lo + hi) / 2)), "Valid"], [String(lo + 1), "Valid"], [String(hi + 1), "Invalid"], [String(lo - 1), "Invalid"], ["ten", "Invalid"], ["(nothing entered)", "Null"], [String(hi + 50), "Invalid"]]);
    return { q: "<b>" + rule[1] + ".</b> What type of test data is <code>" + esc(v[0]) + "</code>?", kind: "choice", opts: ["Valid", "Extreme (boundary)", "Invalid", "Null"], a: v[1], explain: v[1] === "Extreme (boundary)" ? "It is exactly on the limit, so it should be accepted." : v[1] === "Valid" ? "It is inside the range, so it should be accepted." : v[1] === "Null" ? "Nothing was entered." : "It is outside the rule (or the wrong type), so it should be rejected." };
  };

  // ---------- answer checking ----------
  function normalise(s, how) {
    s = String(s == null ? "" : s).trim();
    if (how === "bin") return s.replace(/\s+/g, "");
    if (how === "upper") return s.toUpperCase().replace(/\s+/g, "");
    if (how === "lower") return s.toLowerCase().replace(/\s+/g, "");
    if (how === "list") return s.replace(/[\s;]+/g, ",").replace(/,+/g, ",").replace(/^,|,$/g, "");
    if (how === "formula") return s.toUpperCase().replace(/\s+/g, "").replace(/^(?!=)/, "=");
    if (how === "lines") return s.replace(/\r/g, "").split("\n").map(function (x) { return x.trim(); }).filter(function (x) { return x !== ""; }).join("\n");
    return s.replace(/,/g, "").replace(/\s+/g, " ").toLowerCase();
  }

  // ---------- rendering ----------
  function render(el, act, api) {
    if (act.type === "sort") return renderSort(el, act, api);
    if (act.type === "order") return renderOrder(el, act, api);
    if (act.type === "spot") return renderSpot(el, act, api);
    if (act.type === "gen") return renderGen(el, act, api);
    if (act.type === "code") return renderCode(el, act, api);
    if (act.type === "pixel") return renderPixel(el, act, api);
  }
  // Pixel art: paint a grid with a colour key and watch the binary build; or decode a binary grid back into a picture
  function renderPixel(el, act, api) {
    var n = act.size || 8, pal = act.colours || [["00", "#15221c", "Black"], ["01", "#c0392b", "Red"], ["10", "#2e86de", "Blue"], ["11", "#ffffff", "White"]];
    var bits = pal[0][0].length, cur = 1, mode = "encode", grid = [], target = act.target || null;
    function blank() { grid = []; for (var i = 0; i < n * n; i++) grid.push(pal.length - 1); }
    blank();
    function code(g) { var rows = []; for (var r = 0; r < n; r++) rows.push(g.slice(r * n, r * n + n).map(function (c) { return pal[c][0]; }).join(" ")); return rows; }
    function draw() {
      var tgtCode = target ? code(target) : null;
      var h = head(act) + '<div class="row small" style="gap:6px;margin-bottom:8px"><button class="btn sm' + (mode === "encode" ? " primary" : "") + '" data-m="encode">Design and encode</button>' + (target ? '<button class="btn sm' + (mode === "decode" ? " primary" : "") + '" data-m="decode">Decode a picture</button>' : "") + "</div>";
      h += '<div class="pix-wrap"><div class="pix" style="grid-template-columns:repeat(' + n + ',1fr)" role="grid" aria-label="Pixel grid">' + grid.map(function (c, i) { return '<button class="px" data-i="' + i + '" style="background:' + pal[c][1] + '" aria-label="Pixel ' + (i + 1) + ", " + pal[c][2] + '"></button>'; }).join("") + "</div>";
      h += '<div class="stack" style="gap:8px"><div class="pal">' + pal.map(function (p, k) { return '<button class="pc' + (k === cur ? " on" : "") + '" data-c="' + k + '"><span style="background:' + p[1] + '"></span><code>' + p[0] + "</code> " + esc(p[2]) + "</button>"; }).join("") + "</div>";
      if (mode === "encode") h += '<p class="small"><b>Your image as binary</b> (' + bits + " bits per pixel)</p><pre class=\"pix-code\">" + code(grid).join("\n") + '</pre><p class="small">File size = ' + n + " × " + n + " pixels × " + bits + " bits = <b>" + n * n * bits + " bits</b> = " + n * n * bits / 8 + " bytes (plus metadata such as width, height and colour depth).</p>" + '<div class="row"><button class="btn sm" data-x="copy">Copy code for a partner</button><button class="btn sm" data-x="clear">Clear</button></div>';
      else h += '<p class="small"><b>Decode this binary</b> using the key, then paint the picture.</p><pre class="pix-code">' + tgtCode.join("\n") + '</pre><div class="row"><button class="btn sm primary" data-x="check">Check my picture</button><button class="btn sm" data-x="clear">Clear</button></div><p class="small" id="pixfb" aria-live="polite"></p>';
      h += "</div></div>";
      el.innerHTML = h;
      el.querySelectorAll("[data-m]").forEach(function (b) { b.onclick = function () { mode = b.dataset.m; blank(); draw(); }; });
      el.querySelectorAll("[data-c]").forEach(function (b) { b.onclick = function () { cur = +b.dataset.c; draw(); }; });
      var painting = false;
      function paint(t) { if (!t || !t.dataset || t.dataset.i == null) return; grid[+t.dataset.i] = cur; t.style.background = pal[cur][1]; var pre = el.querySelector(".pix-code"); if (mode === "encode" && pre) pre.textContent = code(grid).join("\n"); }
      var px = el.querySelector(".pix");
      px.addEventListener("pointerdown", function (e) { painting = true; paint(e.target); e.preventDefault(); });
      px.addEventListener("pointerover", function (e) { if (painting) paint(e.target); });
      px.addEventListener("pointermove", function (e) { if (!painting || e.pointerType === "mouse") return; paint(document.elementFromPoint(e.clientX, e.clientY)); });
      window.addEventListener("pointerup", function () { painting = false; });
      el.querySelectorAll("[data-x]").forEach(function (b) { b.onclick = function () {
        var x = b.dataset.x;
        if (x === "clear") { blank(); draw(); }
        if (x === "copy") api.copy ? api.copy("Key: " + pal.map(function (p) { return p[0] + " = " + p[2]; }).join(", ") + "\n" + code(grid).join("\n"), "Binary code") : null;
        if (x === "check") { var wrong = 0; grid.forEach(function (c, i) { if (c !== target[i]) wrong++; }); var fb = el.querySelector("#pixfb"); fb.textContent = wrong ? wrong + " pixel" + (wrong > 1 ? "s are" : " is") + " wrong – check those rows against the code." : "✓ Perfect – you decoded the image exactly."; fb.style.color = wrong ? "var(--bad)" : "var(--ok)"; if (!wrong) result(api, act, 1, 1); }
      }; });
    }
    draw();
  }
  function head(act, extra) { return '<div class="act-head"><div><span class="eyebrow">' + ({ sort: "Sort it", order: "Put in order", spot: "Spot it", gen: "Unlimited practice", code: "Code it", pixel: "Make it" })[act.type] + "</span><h3>" + esc(act.title) + "</h3>" + (act.intro ? '<p class="muted small">' + esc(act.intro) + "</p>" : "") + "</div>" + (extra || "") + "</div>"; }
  function result(api, act, score, total) { api.store.set("act." + act.t + "." + act.id, { s: score, n: total, at: Date.now() }); }

  function renderSort(el, act, api) {
    var items = shuffle(act.items.map(function (x, i) { return { i: i, text: x[0], cat: x[1] }; })), placed = {}, sel = null;
    function draw(checked) {
      var pool = items.filter(function (it) { return placed[it.i] == null; });
      var h = head(act) + '<div class="chips" data-zone="pool" aria-label="Items to sort">' + (pool.length ? pool.map(chip).join("") : '<span class="muted small">All placed – press Check.</span>') + "</div>";
      h += '<div class="zones" style="--n:' + Math.min(act.cats.length, 5) + '">' + act.cats.map(function (c, ci) {
        return '<div class="zone" data-zone="' + ci + '" tabindex="0" role="button" aria-label="Put the selected item in ' + esc(c) + '"><b>' + esc(c) + '</b><div class="zone-items">' + items.filter(function (it) { return placed[it.i] === ci; }).map(function (it) { return chip(it, checked ? (it.cat === ci ? "right" : "wrong") : ""); }).join("") + "</div></div>";
      }).join("") + "</div>";
      h += '<div class="row act-ctl"><button class="btn primary sm" data-a="check">Check</button><button class="btn sm" data-a="reset">Start again</button><button class="btn sm" data-a="show">Show answers</button><span class="act-score" aria-live="polite"></span></div>';
      el.innerHTML = h;
      el.querySelectorAll(".chip").forEach(function (c) {
        c.onclick = function (e) { e.stopPropagation(); var i = +c.dataset.i; if (placed[i] != null && !checked) { placed[i] = null; sel = i; draw(); return; } sel = sel === i ? null : i; draw(); };
        c.draggable = true; c.ondragstart = function (e) { e.dataTransfer.setData("text/plain", c.dataset.i); };
      });
      el.querySelectorAll("[data-zone]").forEach(function (z) {
        function drop(i) { if (i == null) return; placed[i] = z.dataset.zone === "pool" ? null : +z.dataset.zone; sel = null; draw(); }
        z.onclick = function () { drop(sel); };
        z.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); drop(sel); } };
        z.ondragover = function (e) { e.preventDefault(); }; z.ondrop = function (e) { e.preventDefault(); drop(+e.dataTransfer.getData("text/plain")); };
      });
      el.querySelector('[data-a="check"]').onclick = function () {
        var right = items.filter(function (it) { return placed[it.i] === it.cat; }).length;
        draw(true); el.querySelector(".act-score").textContent = right + " / " + items.length + (right === items.length ? " – perfect!" : " correct. Red items are in the wrong place.");
        result(api, act, right, items.length);
      };
      el.querySelector('[data-a="reset"]').onclick = function () { placed = {}; sel = null; items = shuffle(items); draw(); };
      el.querySelector('[data-a="show"]').onclick = function () { items.forEach(function (it) { placed[it.i] = it.cat; }); draw(true); el.querySelector(".act-score").textContent = "Answers shown."; };
    }
    function chip(it, cls) { return '<button class="chip' + (sel === it.i ? " sel" : "") + (cls ? " " + cls : "") + '" data-i="' + it.i + '" aria-pressed="' + (sel === it.i) + '">' + esc(it.text) + "</button>"; }
    draw();
  }

  function renderOrder(el, act, api) {
    var cur = shuffle(act.items.map(function (t, i) { return i; }));
    while (cur.every(function (v, i) { return v === i; }) && cur.length > 1) cur = shuffle(cur);
    function draw(checked) {
      var h = head(act) + '<ol class="ord">' + cur.map(function (v, pos) {
        return '<li class="' + (checked ? (v === pos ? "right" : "wrong") : "") + '" draggable="true" data-pos="' + pos + '"><span class="ord-t">' + esc(act.items[v]) + '</span><span class="ord-b"><button class="btn sm" data-up="' + pos + '" aria-label="Move up"' + (pos === 0 ? " disabled" : "") + '>↑</button><button class="btn sm" data-dn="' + pos + '" aria-label="Move down"' + (pos === cur.length - 1 ? " disabled" : "") + ">↓</button></span></li>";
      }).join("") + "</ol>";
      h += '<div class="row act-ctl"><button class="btn primary sm" data-a="check">Check</button><button class="btn sm" data-a="reset">Shuffle</button><button class="btn sm" data-a="show">Show answer</button><span class="act-score" aria-live="polite"></span></div>';
      el.innerHTML = h;
      function mv(a, b) { var t = cur[a]; cur[a] = cur[b]; cur[b] = t; draw(); }
      el.querySelectorAll("[data-up]").forEach(function (b) { b.onclick = function () { mv(+b.dataset.up, +b.dataset.up - 1); }; });
      el.querySelectorAll("[data-dn]").forEach(function (b) { b.onclick = function () { mv(+b.dataset.dn, +b.dataset.dn + 1); }; });
      el.querySelectorAll("li[draggable]").forEach(function (li) {
        li.ondragstart = function (e) { e.dataTransfer.setData("text/plain", li.dataset.pos); };
        li.ondragover = function (e) { e.preventDefault(); };
        li.ondrop = function (e) { e.preventDefault(); var from = +e.dataTransfer.getData("text/plain"), to = +li.dataset.pos; var v = cur.splice(from, 1)[0]; cur.splice(to, 0, v); draw(); };
      });
      el.querySelector('[data-a="check"]').onclick = function () { var r = cur.filter(function (v, i) { return v === i; }).length; draw(true); el.querySelector(".act-score").textContent = r + " / " + cur.length + " in the right place" + (r === cur.length ? " – perfect!" : "."); result(api, act, r, cur.length); };
      el.querySelector('[data-a="reset"]').onclick = function () { cur = shuffle(cur); draw(); };
      el.querySelector('[data-a="show"]').onclick = function () { cur = act.items.map(function (t, i) { return i; }); draw(true); };
    }
    draw();
  }

  function renderSpot(el, act, api) {
    var picked = {};
    function draw(checked) {
      var h = head(act) + '<div class="spot-text">';
      act.parts.forEach(function (p, i) {
        if (typeof p === "string") { h += p.split(/(\n)/).map(function (seg) { return seg === "\n" ? "<br>" : seg.split(/(?<=[.!?,]) /).map(function (s, k) { return s ? '<span class="sp" data-d="' + i + "-" + k + '">' + esc(s) + " </span>" : ""; }).join(""); }).join(""); }
        else h += '<span class="sp flag" data-f="' + i + '">' + esc(p[0]) + "</span> ";
      });
      h += '</div><div class="row act-ctl"><button class="btn primary sm" data-a="check">Check</button><button class="btn sm" data-a="reset">Clear</button><span class="act-score" aria-live="polite"></span></div><div class="spot-why"></div>';
      el.innerHTML = h;
      el.querySelectorAll(".sp").forEach(function (s) {
        var k = s.dataset.f != null ? "f" + s.dataset.f : "d" + s.dataset.d;
        if (picked[k]) s.classList.add("on");
        if (checked) { if (s.dataset.f != null) s.classList.add(picked[k] ? "right" : "missed"); else if (picked[k]) s.classList.add("wrong"); }
        s.tabIndex = 0; s.setAttribute("role", "button");
        s.onclick = s.onkeydown = function (e) { if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return; e.preventDefault && e.type === "keydown" && e.preventDefault(); if (checked) return; picked[k] = !picked[k]; draw(); };
      });
      el.querySelector('[data-a="check"]').onclick = function () {
        var flags = act.parts.map(function (p, i) { return typeof p === "string" ? null : i; }).filter(function (x) { return x !== null; });
        var found = flags.filter(function (i) { return picked["f" + i]; }).length, wrong = Object.keys(picked).filter(function (k) { return picked[k] && k[0] === "d"; }).length;
        draw(true);
        el.querySelector(".act-score").textContent = "Found " + found + " of " + flags.length + (wrong ? " · " + wrong + " not a problem" : "");
        el.querySelector(".spot-why").innerHTML = '<ul class="small">' + flags.map(function (i) { return "<li><b>" + esc(act.parts[i][0]) + "</b> – " + esc(act.parts[i][1]) + "</li>"; }).join("") + "</ul>";
        result(api, act, Math.max(0, found - wrong), flags.length);
      };
      el.querySelector('[data-a="reset"]').onclick = function () { picked = {}; draw(); };
    }
    draw();
  }

  function renderGen(el, act, api) {
    var key = "gen." + act.gen, st = api.store.get(key, { r: 0, n: 0, streak: 0, best: 0 }), q = null, cells = null, rowsSel = null;
    function stats() { return '<span class="gen-stats">' + st.r + " / " + st.n + " correct · streak " + st.streak + " · best " + st.best + "</span>"; }
    function next() { q = G[act.gen](); cells = q.kind === "cells" ? q.rows.map(function () { return null; }) : null; rowsSel = {}; draw(); }
    function draw(done, ok) {
      var h = head(act, stats()) + '<div class="gen-q"><p>' + q.q + "</p>";
      if (q.grid) h += '<div class="tbl-wrap sheet-grid"><table>' + q.grid.map(function (r, i) { return "<tr>" + r.map(function (c, j) { return i === 0 || j === 0 ? "<th>" + esc(c) + "</th>" : "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</table></div>";
      if (q.code) h += '<div class="code"><div class="ch"><span>C#</span></div><pre>' + api.hl(q.code) + "</pre></div>";
      if (q.kind === "text") h += '<div class="row"><input class="gen-in" type="text" aria-label="Your answer" autocomplete="off" spellcheck="false"' + (done ? " disabled" : "") + "></div>";
      if (q.kind === "area") h += '<textarea class="gen-in" rows="3" aria-label="Your answer"' + (done ? " disabled" : "") + "></textarea>";
      if (q.kind === "choice") h += '<div class="opts">' + q.opts.map(function (o) { return '<button class="opt' + (done && o === q.a ? " right" : "") + (done && o === q.pickedOpt && o !== q.a ? " wrong" : "") + '" data-o="' + esc(o) + '"' + (done ? " disabled" : "") + "><span>" + esc(o) + "</span></button>"; }).join("") + "</div>";
      if (q.kind === "rows") h += '<div class="tbl-wrap"><table><thead><tr><th>✓</th>' + q.head.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>" + q.rows.map(function (r, i) { var cls = done ? (q.a.indexOf(i) > -1 ? (rowsSel[i] ? "right" : "missed") : (rowsSel[i] ? "wrong" : "")) : ""; return '<tr class="' + cls + '"><td><input type="checkbox" data-r="' + i + '"' + (rowsSel[i] ? " checked" : "") + (done ? " disabled" : "") + ' aria-label="Select ' + esc(r[0]) + '"></td>' + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
      if (q.kind === "cells") h += '<div class="tbl-wrap"><table class="tt"><thead><tr>' + q.head.map(function (c) { return "<th>" + c + "</th>"; }).join("") + "</tr></thead><tbody>" + q.rows.map(function (r, i) { var v = cells[i], cls = done ? (v === q.a[i] ? "right" : "wrong") : ""; return "<tr>" + r.map(function (b) { return "<td>" + b + "</td>"; }).join("") + '<td><button class="cell ' + cls + '" data-c="' + i + '"' + (done ? " disabled" : "") + ' aria-label="Output for row ' + (i + 1) + '">' + (v == null ? "?" : v) + "</button></td></tr>"; }).join("") + "</tbody></table></div>";
      h += "</div>";
      if (done) h += '<div class="gen-fb ' + (ok ? "ok" : "bad") + '"><b>' + (ok ? "Correct!" : "Not quite.") + "</b> " + (ok ? "" : "Answer: <code>" + esc(Array.isArray(q.a) ? (q.kind === "rows" ? q.a.map(function (i) { return q.rows[i][0]; }).join(", ") || "none" : q.a.join(" ")) : q.a) + "</code>. ") + '<span class="small">' + esc(q.explain).replace(/\n/g, "<br>") + "</span></div>";
      h += '<div class="row act-ctl">' + (done ? '<button class="btn primary sm" data-a="next">Next question</button>' : '<button class="btn primary sm" data-a="check">Check</button><button class="btn sm" data-a="skip">Skip</button>') + "</div>";
      el.innerHTML = h;
      var inp = el.querySelector(".gen-in"); if (inp && !done) { inp.focus(); inp.onkeydown = function (e) { if (e.key === "Enter" && q.kind === "text") check(); }; }
      el.querySelectorAll("[data-o]").forEach(function (b) { b.onclick = function () { q.pickedOpt = b.dataset.o; check(); }; });
      el.querySelectorAll("[data-r]").forEach(function (b) { b.onchange = function () { rowsSel[b.dataset.r] = b.checked; }; });
      el.querySelectorAll("[data-c]").forEach(function (b) { b.onclick = function () { var i = +b.dataset.c; cells[i] = cells[i] === 1 ? 0 : 1; b.textContent = cells[i]; }; });
      var c = el.querySelector('[data-a="check"]'); if (c) c.onclick = check;
      var s = el.querySelector('[data-a="skip"]'); if (s) s.onclick = next;
      var n = el.querySelector('[data-a="next"]'); if (n) { n.onclick = next; n.focus(); }
    }
    function check() {
      var ok;
      if (q.kind === "choice") ok = q.pickedOpt === q.a;
      else if (q.kind === "rows") { var sel = Object.keys(rowsSel).filter(function (k) { return rowsSel[k]; }).map(Number).sort(); ok = sel.join() === q.a.slice().sort().join(); }
      else if (q.kind === "cells") { if (cells.some(function (v) { return v == null; })) { api.toast("Fill in every output cell"); return; } ok = cells.every(function (v, i) { return v === q.a[i]; }); }
      else { var v = el.querySelector(".gen-in").value; if (!v.trim()) { api.toast("Type an answer first"); return; } ok = normalise(v, q.norm) === normalise(q.a, q.norm); }
      st.n++; if (ok) { st.r++; st.streak++; st.best = Math.max(st.best, st.streak); } else st.streak = 0;
      api.store.set(key, st); result(api, act, st.r, st.n);
      draw(true, ok);
    }
    next();
  }

  function renderCode(el, act, api) {
    var c = act.ch, k = "cs." + c.id, saved = api.store.get(k, null), tries = 0;
    el.innerHTML = head(act) + '<p>' + c.task + '</p><div class="code"><div class="ch"><span>C#</span><span class="row" style="gap:4px"><button class="btn sm" data-a="hint">Hint</button><button class="btn sm" data-a="reset">Reset</button><button class="btn sm" data-a="run">Run</button><button class="btn sm primary" data-a="check">Check my code</button></span></div><textarea class="code-edit" spellcheck="false" aria-label="Your C# code" style="min-height:220px"></textarea><div class="out" hidden></div></div><div class="ch-res" aria-live="polite"></div>';
    var ta = el.querySelector("textarea"), out = el.querySelector(".out"), res = el.querySelector(".ch-res");
    ta.value = saved && saved.code || c.starter;
    ta.oninput = function () { api.store.set(k, { code: ta.value, done: saved && saved.done }); };
    ta.onkeydown = function (e) { if (e.key === "Tab") { e.preventDefault(); var a = ta.selectionStart; ta.value = ta.value.slice(0, a) + "    " + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = a + 4; } };
    el.querySelector('[data-a="hint"]').onclick = function () { res.innerHTML = '<div class="notes"><b>Hint.</b> <code>' + esc(c.hint) + "</code></div>"; };
    el.querySelector('[data-a="reset"]').onclick = function () { ta.value = c.starter; api.store.set(k, null); res.innerHTML = ""; out.hidden = true; };
    el.querySelector('[data-a="run"]').onclick = function () { api.runCs(ta.value, out); };
    el.querySelector('[data-a="check"]').onclick = function () {
      tries++; res.innerHTML = '<p class="muted small">Running ' + c.tests.length + " tests…</p>";
      var shared = {}, results = [];
      (function runTest(i) {
        if (i >= c.tests.length) {
          var pass = results.filter(function (r) { return r.ok; }).length, all = pass === results.length;
          var h = '<div class="gen-fb ' + (all ? "ok" : "bad") + '"><b>' + (all ? "All " + pass + " tests passed – challenge complete!" : pass + " of " + results.length + " tests passed.") + "</b></div><ul class=\"tests\">" + results.map(function (r, j) { return '<li class="' + (r.ok ? "right" : "wrong") + '"><b>Test ' + (j + 1) + "</b> – input: " + (c.tests[j].in.length ? "<code>" + esc(c.tests[j].in.join(", ")) + "</code>" : "none") + (r.ok ? " ✓" : "<br><span class=\"small\">" + esc(r.why) + "</span>") + "</li>"; }).join("") + "</ul>";
          if (!all && tries >= 2) h += '<details class="ff-q"><summary>Show a model answer</summary><div class="code"><pre>' + api.hl(c.model) + "</pre></div></details>";
          res.innerHTML = h;
          api.store.set(k, { code: ta.value, done: all || (saved && saved.done) });
          result(api, act, pass, results.length);
          return;
        }
        var t = c.tests[i], q = t.in.slice(), text = "";
        CSharp.run(ta.value, { output: function (s, kind) { if (kind !== "in") text += s; }, input: function () { return Promise.resolve(q.length ? q.shift() : null); }, files: c.fresh ? {} : shared, maxSteps: 400000 }).then(function (r) {
          var why = "";
          if (!r.ok) why = r.kind === "compile" ? "Your code does not compile: " + r.message + (r.line ? " (line " + r.line + ")" : "") : r.kind === "timeout" ? "It ran forever – check your loop condition." : "It crashed: " + (r.type || "") + " – " + (r.message || "");
          else {
            var pos = 0;
            (t.has || []).forEach(function (h) { if (why) return; var at = text.indexOf(h, pos); if (at < 0) why = "Expected the output to include “" + h + "”."; else pos = at + h.length; });
            (t.not || []).forEach(function (h) { if (!why && text.indexOf(h) > -1) why = "The output should not include “" + h + "”."; });
          }
          if (why) why += " Your output was: " + (text.trim() ? text.trim().replace(/\s*\n\s*/g, " ⏎ ").slice(0, 200) : "(nothing)");
          results.push({ ok: !why, why: why });
          runTest(i + 1);
        });
      })(0);
    };
  }

  // Every lesson also gets auto-built activities from its own content
  var autoDone = {};
  function lessonActs(l, C) {
    if (!autoDone[l.id]) {
      autoDone[l.id] = 1;
      if (l.tf && l.tf.length >= 3) S.push({ t: l.t, id: "tf-" + l.id, l: l.id, type: "sort", auto: 1, title: "True or false?", intro: "Sort each statement from this lesson.", cats: ["True", "False"], items: l.tf.map(function (x) { return [x[0], x[1] ? 0 : 1]; }) });
      var terms = (C.gloss || []).filter(function (g) { return g[2] === l.id; }).slice(0, 5);
      if (terms.length >= 3) S.push({ t: l.t, id: "kw-" + l.id, l: l.id, type: "sort", auto: 1, title: "Match the mark-scheme definitions", intro: "Drop each definition on the term it describes.", cats: terms.map(function (g) { return g[0]; }), items: terms.map(function (g, i) { return [g[1], i]; }) });
      if (l.obj && l.slides) { var hs = l.slides.map(function (x) { return x.h; }).filter(function (h) { return !/exam|in the exam/i.test(h); }); if (hs.length >= 4) S.push({ t: l.t, id: "flow-" + l.id, l: l.id, type: "order", auto: 1, title: "Rebuild the lesson", intro: "Put the lesson's slide titles back in teaching order.", items: hs.slice(0, 7) }); }
    }
    return S.filter(function (a) { return a.l === l.id && !a.auto; }).concat(S.filter(function (a) { return a.l === l.id && a.auto; }));
  }

  root.Acts = {
    all: S, challenges: CH, lessonActs: lessonActs,
    forTopic: function (t) { return S.filter(function (a) { return a.t === t && !a.auto; }); },
    forLesson: function (l) { return S.filter(function (a) { return a.l === l; }); },
    find: function (t, id) { return S.filter(function (a) { return a.t === t && a.id === id; })[0]; },
    render: render, gens: G, normalise: normalise
  };
})(typeof window !== "undefined" ? window : global);
