// Useful websites, each checked as live in October 2026. t: topic id, or "all" for whole-course sites.
(function (root) {
  var C = root.COURSE;
  C.linkKinds = { official: "Official", learn: "Learn", read: "Read", tool: "Interactive tool", video: "Video" };
  if (C.hub) return; // another course (GCE) brings its own links in its course data
  var CC = "https://ccea.org.uk/key-stage-4/gcse/subjects/gcse-digital-technology-2017";
  C.links = [
    // Whole course
    { t: "all", k: "official", title: "CCEA GCSE Digital Technology (2017)", url: CC, src: "CCEA", why: "The official subject page: specification, assessment details and all CCEA support." },
    { t: "all", k: "official", title: "Specification (PDF)", url: "https://ccea.org.uk/downloads/docs/Specifications/GCSE/GCSE%20Digital%20Technology%20%282017%29/GCSE%20Digital%20Technology%20%282017%29-specification-Standard_0.pdf", src: "CCEA", why: "Exactly what can be asked in Units 1 and 4." },
    { t: "all", k: "official", title: "Past papers and mark schemes", url: CC + "/past-papers-mark-schemes", src: "CCEA", why: "Every released paper with its mark scheme." },
    { t: "all", k: "official", title: "Support materials, including fact files", url: CC + "/support", src: "CCEA", why: "CCEA's fact files and teacher support for each topic." },
    { t: "all", k: "official", title: "Chief Examiner reports", url: CC + "/reports", src: "CCEA", why: "What examiners say candidates did well and badly – read these before the exam." },
    { t: "all", k: "official", title: "Webinars", url: CC + "/webinars", src: "CCEA", why: "Recorded CCEA sessions on the specification and assessment." },
    { t: "all", k: "official", title: "GCSE past papers on BBC Bitesize (CCEA announcement)", url: "https://ccea.org.uk/news/2025/december/bbc-ni-and-ccea-team-give-northern-ireland-pupils-access-gcse-past-papers-bbc", src: "CCEA", why: "CCEA and BBC NI made GCSE past papers available on Bitesize." },
    { t: "all", k: "learn", title: "Isaac Computer Science", url: "https://isaaccomputerscience.org/", src: "Isaac Computer Science", why: "Free GCSE computer science lessons and questions, useful for Unit 4 theory." },
    { t: "all", k: "learn", title: "101 Computing", url: "https://www.101computing.net/", src: "101 Computing", why: "Hands-on challenges in cryptography, networking, databases and Boolean logic." },
    { t: "all", k: "learn", title: "Computers and the Internet", url: "https://www.khanacademy.org/computing/computers-and-internet", src: "Khan Academy", why: "Short videos and exercises on how computers, data and the internet work." },
    // Digital data
    { t: "T1", k: "tool", title: "Binary Game", url: "https://learningcontent.cisco.com/games/binary/index.html", src: "Cisco", why: "Fast-paced binary-to-denary practice." },
    { t: "T42", k: "tool", title: "Binary Game", url: "https://learningcontent.cisco.com/games/binary/index.html", src: "Cisco", why: "Fast-paced binary-to-denary practice." },
    { t: "T42", k: "read", title: "ASCII table", url: "https://www.asciitable.com/", src: "asciitable.com", why: "Every ASCII character with its denary, hex and binary code." },
    { t: "T42", k: "tool", title: "Logic Gate Simulator", url: "https://academo.org/demos/logic-gate-simulator/", src: "Academo", why: "Build AND, OR and NOT circuits and watch the outputs change." },
    // Databases and spreadsheets
    { t: "T3", k: "read", title: "Introduction to queries (Access)", url: "https://support.microsoft.com/en-gb/office/introduction-to-queries-a9739a09-d3ff-4f36-8ac3-5760249fb65c", src: "Microsoft Support", why: "How queries use criteria to find records." },
    { t: "T3", k: "learn", title: "Filtering records with criteria", url: "https://www.w3schools.com/sql/sql_where.asp", src: "W3Schools", why: "Try comparison operators (=, >, <, <>) on a real table in the browser." },
    { t: "T4", k: "learn", title: "Excel: Foundations", url: "https://www.learnfree.org/series/excel-foundations", src: "LearnFree (GCFGlobal)", why: "Free step-by-step Excel tutorials: formulas, formatting and charts." },
    { t: "T4", k: "read", title: "IF function", url: "https://support.microsoft.com/en-gb/office/if-function-69aed7c9-4e8a-4755-a9bc-aa8bbff73be2", src: "Microsoft Support", why: "The official guide to IF, with examples." },
    { t: "T4", k: "read", title: "VLOOKUP function", url: "https://support.microsoft.com/en-gb/office/vlookup-function-0bbc8083-26fe-4963-8ab8-93a18ad188a1", src: "Microsoft Support", why: "Syntax, exact match and common errors (#N/A, #REF!)." },
    // Networks, security, cloud
    { t: "T6", k: "read", title: "What is DNS?", url: "https://www.cloudflare.com/learning/dns/what-is-dns/", src: "Cloudflare Learning Center", why: "How domain names are turned into IP addresses." },
    { t: "T7", k: "read", title: "Phishing scams: how to spot and report them", url: "https://www.ncsc.gov.uk/collection/phishing-scams", src: "NCSC", why: "The UK's National Cyber Security Centre on recognising phishing." },
    { t: "T7", k: "read", title: "Top tips for staying secure online", url: "https://www.ncsc.gov.uk/cyberaware/home", src: "NCSC Cyber Aware", why: "Six actions: strong passwords, updates, 2-step verification and backups." },
    { t: "T7", k: "read", title: "What is a DDoS attack?", url: "https://www.cloudflare.com/learning/ddos/what-is-a-ddos-attack/", src: "Cloudflare Learning Center", why: "Denial-of-service attacks explained with diagrams." },
    { t: "T7", k: "read", title: "What is encryption?", url: "https://www.cloudflare.com/learning/ssl/what-is-encryption/", src: "Cloudflare Learning Center", why: "Keys, plaintext and ciphertext, and why encryption matters." },
    { t: "T7", k: "learn", title: "CyberFirst for 11–19 year olds", url: "https://www.ncsc.gov.uk/section/education-skills/11-19-year-olds", src: "NCSC", why: "Free cyber security courses and competitions for pupils." },
    { t: "T7", k: "read", title: "Get Safe Online", url: "https://www.getsafeonline.org/", src: "Get Safe Online", why: "Plain-English advice on scams, devices and safe shopping." },
    { t: "T8", k: "read", title: "What is the cloud?", url: "https://www.cloudflare.com/learning/cloud/what-is-the-cloud/", src: "Cloudflare Learning Center", why: "Cloud computing, service models and how it differs from client–server." },
    // Legal, ethical, environmental
    { t: "T9", k: "official", title: "Computer Misuse Act 1990", url: "https://www.legislation.gov.uk/ukpga/1990/18/contents", src: "legislation.gov.uk", why: "The full text of the Act." },
    { t: "T9", k: "official", title: "Copyright, Designs and Patents Act 1988", url: "https://www.legislation.gov.uk/ukpga/1988/48/contents", src: "legislation.gov.uk", why: "The full text of the Act." },
    { t: "T9", k: "official", title: "Data Protection Act 2018", url: "https://www.legislation.gov.uk/ukpga/2018/12/contents", src: "legislation.gov.uk", why: "The full text of the Act." },
    { t: "T9", k: "read", title: "A guide to the data protection principles", url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/", src: "ICO", why: "The regulator's explanation of each principle." },
    { t: "T9", k: "read", title: "Your data rights", url: "https://ico.org.uk/for-the-public/", src: "ICO", why: "What rights you have over your own personal data." },
    { t: "T9", k: "read", title: "E-Waste Monitor", url: "https://ewastemonitor.info/", src: "UNITAR", why: "Global figures on electronic waste for environmental-impact answers." },
    { t: "T9", k: "read", title: "UK Safer Internet Centre", url: "https://saferinternet.org.uk/", src: "UK Safer Internet Centre", why: "Online safety advice and reporting." },
    // Unit 4 design and programming
    { t: "T43", k: "tool", title: "Sorting visualiser (bubble, insertion and more)", url: "https://visualgo.net/en/sorting", src: "VisuAlgo", why: "Step through bubble sort and insertion sort one comparison at a time." },
    { t: "T43", k: "tool", title: "Sorting algorithm animations", url: "https://www.toptal.com/developers/sorting-algorithms", src: "Toptal", why: "Compare how fast different sorts are on different data." },
    { t: "T43", k: "tool", title: "VisuAlgo: sorting", url: "https://visualgo.net/en/sorting", src: "VisuAlgo", why: "Animated bubble sort, insertion sort and more, step by step – useful for checking your traces." },
    { t: "T44", k: "tool", title: "C# Online Compiler", url: "https://dotnetfiddle.net/", src: ".NET Fiddle", why: "Run C# in the browser at home with nothing to install." },
    { t: "T44", k: "learn", title: "C# Tutorial", url: "https://www.w3schools.com/cs/index.php", src: "W3Schools", why: "Short examples for every C# feature in the course, with a try-it editor." },
    { t: "T44", k: "read", title: "A tour of C#", url: "https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/", src: "Microsoft Learn", why: "The official introduction to C# – best for stretching confident programmers." },
    { t: "T45", k: "read", title: "Exceptions and exception handling", url: "https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/exceptions/", src: "Microsoft Learn", why: "How try, catch and finally handle run-time errors in C#." }
  ];
  C.linkKinds = { official: "Official", learn: "Learn", read: "Read", tool: "Interactive tool" };
})(typeof window !== "undefined" ? window : global);
