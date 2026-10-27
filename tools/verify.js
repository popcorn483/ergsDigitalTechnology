// node tools/verify.js [moduleId]
// For every lesson: the starter must compile, the solution must pass every test,
// and (as a sanity check) the untouched starter should not already pass.
const path = require("path");
const fs = require("fs");
const root = path.join(__dirname, "..");
global.COURSE = require(path.join(root, "js/course/index.js"));
const CSharp = require(path.join(root, "js/csharp.js"));
const Checker = require(path.join(root, "js/checker.js"));

const only = process.argv[2];
for (const f of fs.readdirSync(path.join(root, "js/course")).filter((f) => /^m\d+\.js$/.test(f)).sort()) {
  require(path.join(root, "js/course", f));
}

(async () => {
  let fails = 0, count = 0, warns = 0;
  const ids = new Set();
  for (const m of COURSE.modules) {
    if (only && m.id !== only) continue;
    for (const l of m.lessons) {
      if (ids.has(l.id)) { console.log(`DUPLICATE id ${l.id}`); fails++; }
      ids.add(l.id);
      if (l.type === "quiz") {
        for (const q of l.questions || []) {
          if (!(q.answer >= 0 && q.answer < q.options.length)) { console.log(`FAIL ${l.id}: bad answer index in "${q.q}"`); fails++; }
        }
        continue;
      }
      if (l.type !== "code") continue;
      count++;
      const errs = CSharp.check(l.starter || "");
      if (errs.length && !l.starterHasError) { console.log(`FAIL ${l.id} starter does not compile: line ${errs[0].line}: ${errs[0].message}`); fails++; }
      if (l.starterHasError && !errs.length) { console.log(`FAIL ${l.id} starter should contain an error`); fails++; }
      const res = await Checker.check(CSharp, l, l.solution || "");
      if (!res.passed) {
        fails++;
        console.log(`FAIL ${l.id} "${l.title}" solution:`);
        if (res.error) console.log(`   error: ${res.error.kind} line ${res.error.line}: ${res.error.message}`);
        res.results.filter((r) => !r.ok).forEach((r) => console.log(`   test: ${r.msg}`));
        console.log("   output: " + JSON.stringify(res.output.slice(0, 400)));
      }
      const s = await Checker.check(CSharp, l, l.starter || "");
      if (s.passed) { warns++; console.log(`WARN ${l.id} the starter already passes`); }
    }
  }
  console.log(`\n${count} code lessons checked, ${fails} failures, ${warns} warnings.`);
  process.exit(fails ? 1 : 0);
})();
