// Narration scripts for lesson videos and two-host podcasts, built from lesson content
(function (root) {
  var C = root.COURSE;
  function topic(id) { return C.topics.filter(function (t) { return t.id === id; })[0]; }

  // Remove bracketed exam references such as (2022 Q4(c)(iii)) or (Unit 4 2023 Q2), including nested brackets
  function stripRefs(s) {
    var out = "", i = 0;
    while (i < s.length) {
      if (s[i] === "(" && /^\(\s*(?:[Uu]nit \d )?\d{4}\b/.test(s.slice(i, i + 16))) {
        var depth = 0, j = i;
        for (; j < s.length; j++) { if (s[j] === "(") depth++; else if (s[j] === ")") { depth--; if (!depth) break; } }
        i = j + 1; continue;
      }
      out += s[i++];
    }
    return out;
  }
  // Turn written text into something that reads aloud well
  function speak(s) {
    s = String(s);
    s = stripRefs(s);
    s = s.replace(/C#/g, "C sharp").replace(/\s*&&\s*/g, " and ").replace(/\s*\|\|\s*/g, " or ").replace(/!\(/g, "not (");
    s = s.replace(/\(\)/g, "").replace(/\b([A-Za-z]+)\.(?=[A-Za-z])/g, "$1 dot ").replace(/[{}]/g, " ").replace(/;\s*(?=[A-Z][a-z]+\s*dot\b)/g, ". ");
    s = s.replace(/\b(20\d\d) Q(\d+)(?:\([a-z]+\))*(?:\([ivx]+\))*/g, "the $1 paper, question $2");
    s = s.replace(/\bQ(\d+)(?:\([a-z]+\))*(?:\([ivx]+\))*/g, "question $1");
    s = s.replace(/=[A-Z]+\([^)]*\)[^\s,;]*/g, "the formula on screen").replace(/=[A-Z$]+\$?\d[^\s,;]*/g, "the formula on screen");
    s = s.replace(/\$([A-Z])\$(\d+)/g, "$1$2 with dollar signs");
    s = s.replace(/\b[01]{4,}\b/g, function (m) { return m.split("").join(" "); });
    s = s.replace(/(\d)\s*\+\s*(\d)/g, "$1 plus $2").replace(/ \+ /g, " plus ").replace(/ = /g, " equals ");
    s = s.replace(/\b([A-Z]{1,2}\d+):([A-Z]{1,2}\d+)\b/g, "$1 to $2");
    s = s.replace(/<=/g, " less than or equal to ").replace(/>=/g, " greater than or equal to ").replace(/!=|≠|<>/g, " not equal to ").replace(/==/g, " equals ");
    s = s.replace(/→/g, ", leading to ").replace(/←/g, " becomes ").replace(/×/g, " times ").replace(/÷/g, " divided by ").replace(/²/g, " squared").replace(/⁸/g, " to the power 8").replace(/ⁿ/g, " to the power n");
    s = s.replace(/ < /g, " less than ").replace(/ > /g, " greater than ").replace(/ \* /g, " times ").replace(/\*\*/g, " to the power ");
    if (C.hub) s = s.replace(/\b0NF\b/g, "un-normalised form").replace(/\b1NF\b/g, "first normal form").replace(/\b2NF\b/g, "second normal form").replace(/\b3NF\b/g, "third normal form")
      .replace(/\bM:N\b/g, "many-to-many").replace(/\b1:M\b/g, "one-to-many").replace(/\b1:1\b/g, "one-to-one").replace(/\bM:1\b/g, "many-to-one")
      .replace(/\bIaaS\b/g, "I-A-A-S").replace(/\bPaaS\b/g, "pass").replace(/\bSaaS\b/g, "sass").replace(/\bGUIs?\b/g, function (m) { return m === "GUIs" ? "gooeys" : "gooey"; })
      .replace(/\bTCP\/IP\b/g, "TCP I P").replace(/\bI\/O\b/g, "input and output").replace(/\bA2\b/g, "A two").replace(/\bAS 1\b/g, "A S one").replace(/\bAS 2\b/g, "A S two");
    s = s.replace(/\be\.g\./g, "for example").replace(/\bi\.e\./g, "that is").replace(/\betc\./g, "and so on").replace(/\bvs\b/g, "versus");
    s = s.replace(/\bKB\b/g, "kilobytes").replace(/\bMB\b/g, "megabytes").replace(/\bGB\b/g, "gigabytes").replace(/\bTB\b/g, "terabytes").replace(/\bGHz\b/g, "gigahertz").replace(/\bkHz\b/g, "kilohertz").replace(/\bkbps\b/g, "kilobits per second").replace(/\bHz\b/g, "hertz");
    s = s.replace(/\bDIV\b/g, "div").replace(/\bMOD\b/g, "mod").replace(/\bSQL\b/g, "S Q L").replace(/\bGUI\b/g, "G U I").replace(/\bIoT\b/g, "I o T");
    s = s.replace(/£(\d+(?:\.\d\d)?)/g, function (m, n) { return n + (n === "1" ? " pound" : " pounds"); }).replace(/(\d)%/g, "$1 percent");
    s = s.replace(/ \/ /g, " or ").replace(/ – /g, ", ").replace(/–/g, " to ").replace(/[“”"]/g, "").replace(/·/g, ",").replace(/\s+/g, " ").replace(/\s+([,.;:])/g, "$1").replace(/,\s*,/g, ",").trim();
    return s;
  }
  function sentence(s) { s = speak(s); if (!s) return ""; if (!/[.!?]$/.test(s)) s += "."; return s.charAt(0).toUpperCase() + s.slice(1); }
  function lower(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  function tableSpeech(rows) {
    var head = rows[0], out = [];
    rows.slice(1).forEach(function (r) {
      var parts = [];
      r.forEach(function (c, i) { if (!c) return; if (i === 0) parts.push(c); else parts.push(lower(head[i] || "") + ": " + c); });
      out.push(sentence(parts.join("; ")));
    });
    return out;
  }

  // ---------- Video ----------
  function video(l) {
    var t = topic(l.t), scenes = [];
    scenes.push({ kind: "title", say: ["Lesson " + l.id + ": " + speak(l.title) + ".", "This lesson is part of " + speak(t.name) + ".", "By the end, you should be able to: " + l.obj.map(function (o) { return lower(speak(o)); }).join("; ") + "."] });
    if (root.Diagrams && root.Diagrams.has(l.id)) scenes.push({ kind: "diagram", say: ["Start with the big picture.", sentence(root.Diagrams.caption(l.id))].concat(l.notes && l.notes[0] ? [sentence(l.notes[0].p.split(". ").slice(0, 2).join(". "))] : []) });
    l.slides.forEach(function (s, i) {
      var say = [sentence(s.h)];
      (s.b || []).forEach(function (b) { say.push(sentence(b)); });
      if (s.tbl) say = say.concat(tableSpeech(s.tbl));
      if (s.code && !s.b) say.push(s.code.vba ? "Here is the V B A code from Microsoft Access. Read it alongside the design it comes from." : (s.code.cs || s.code.py) ? "Here is the C sharp code. Pause the video and predict what it will output, then run it on the hub." : "Here is the pseudocode. Read it through line by line.");
      else if (s.code) say.push("Look at the code alongside. Pause and work out what it does.");
      scenes.push({ kind: "slide", i: i, say: say });
    });
    var q = l.quiz[0];
    scenes.push({ kind: "check", say: ["Quick check.", sentence(q[0]), "Is it " + q[1].map(function (o, k) { return "ABCD"[k] + ", " + speak(o); }).join("; ") + "?", "Pause now if you want to think.", "The answer is " + "ABCD"[q[2]] + ": " + speak(q[1][q[2]]) + ".", q[3] ? sentence(q[3]) : ""].filter(Boolean), pauseAfter: 3 });
    var exam = (l.notes || []).filter(function (n) { return /exam/i.test(n.h); })[0];
    scenes.push({ kind: "end", say: ["To finish, remember the key terms: " + l.kw.slice(0, 6).join(", ") + ".", exam ? "In the exam, these ideas have come up again and again, so practise the past-paper questions for this lesson." : "", "Now try the worksheet and the quiz for this lesson."].filter(Boolean) });
    return scenes;
  }

  // ---------- Podcast ----------
  var HOSTS = ["Aoife", "Conor"];
  function podcast(l) {
    var lines = [], A = 0, B = 1, notes = (l.notes || []).filter(function (n) { return !/exam/i.test(n.h); }), exam = (l.notes || []).filter(function (n) { return /exam/i.test(n.h); })[0];
    var terms = root.COURSE.gloss.filter(function (g) { return g[2] === l.id; }).slice(0, 6);
    function say(who, text) { text = String(text).trim(); if (text) lines.push({ who: who, text: text }); }
    say(A, "Hello and welcome to " + ((root.COURSE.hub && root.COURSE.hub.podcast) || "Digital Tech Revision, the podcast for CCEA GCSE Digital Technology") + ". I'm Aoife.");
    say(B, "And I'm Conor. Today's episode is lesson " + l.id + ": " + speak(l.title) + ".");
    say(A, "So Conor, if someone only remembers one thing from today, what should it be?");
    say(B, sentence(l.obj[0]) + " That is the heart of it.");
    var prompts = ["Okay, take us through it properly.", "Right. What else do we need to know?", "And is there anything people often mix up here?"];
    notes.forEach(function (n, i) {
      say(A, prompts[i] || "Go on.");
      var parts = speak(n.p).split(/(?<=[.!?])\s+(?=[A-Z0-9])/), half = Math.ceil(parts.length / 2);
      say(B, parts.slice(0, half).map(sentence).join(" "));
      if (parts.length > 2) { say(A, ["Makes sense.", "Got it.", "Okay.", "Right."][i % 4] + " Keep going."); say(B, parts.slice(half).map(sentence).join(" ")); }
    });
    if (terms.length) {
      say(A, "Time for quickfire key terms. I'll say the term, and you give me the answer the mark scheme gives credit for.");
      say(B, "Go for it.");
      terms.forEach(function (g) { say(A, speak(g[0]) + "?"); say(B, sentence(g[1])); });
    }
    if (exam) {
      say(A, "What about the exam? Where has this come up?");
      say(B, sentence(exam.p));
    }
    var q = l.quiz[1] || l.quiz[0];
    say(A, "Let's finish with a question for the listeners. " + sentence(q[0]) + " Is it " + q[1].map(function (o, k) { return "ABCD"[k] + ", " + speak(o); }).join("; ") + "?");
    lines.push({ who: B, text: "I'll give you a few seconds.", pause: 3 });
    say(B, "The answer is " + "ABCD"[q[2]] + ": " + speak(q[1][q[2]]) + ". " + (q[3] ? sentence(q[3]) : ""));
    say(A, "That's it for " + speak(l.title) + ". Next, try the worksheet and the quiz for this lesson on the hub.");
    say(B, "Thanks for listening. See you next time.");
    return lines;
  }

  function words(arr) { return arr.join(" ").split(/\s+/).length; }
  function minutes(n) { return Math.max(1, Math.round(n / 150)); }

  C.media = {
    hosts: HOSTS, speak: speak,
    video: video, podcast: podcast,
    videoMinutes: function (l) { return minutes(words(video(l).map(function (s) { return s.say.join(" "); }))); },
    podcastMinutes: function (l) { return minutes(words(podcast(l).map(function (x) { return x.text; }))); }
  };
})(typeof window !== "undefined" ? window : global);
