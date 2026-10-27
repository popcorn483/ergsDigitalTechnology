// Course registry. Each js/course/mNN.js file calls COURSE.addModule({...}).
(function (root) {
  const COURSE = {
    title: "C# Academy",
    modules: [],
    addModule(m) {
      this.modules.push(m);
      this.modules.sort((a, b) => a.id.localeCompare(b.id));
    },
    allLessons() {
      const out = [];
      for (const m of this.modules) for (const l of m.lessons) out.push({ module: m, lesson: l });
      return out;
    },
  };
  root.COURSE = COURSE;
  if (typeof module !== "undefined" && module.exports) module.exports = COURSE;
})(typeof window !== "undefined" ? window : globalThis);
