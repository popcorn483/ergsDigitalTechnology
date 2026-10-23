// Encrypts the hub's content for publishing behind a passcode.
// Usage: node tools/encrypt.js <plain-source-dir> <output-dir>   (passcode read from the HUB_PASSCODE env var)
// AES-256-GCM per file (random 12-byte IV prepended); key from PBKDF2-SHA-256 with a random salt.
const fs = require("fs"), path = require("path"), { webcrypto: crypto } = require("crypto");
const [SRC, OUT] = process.argv.slice(2);
const PASS = process.env.HUB_PASSCODE;
if (!SRC || !OUT || !PASS) { console.error("usage: HUB_PASSCODE=... node tools/encrypt.js <src> <out>"); process.exit(1); }
const ITER = 600000;
const SCRIPTS = ["data1.js", "data2.js", "data3.js", "data4.js", "u1extra.js", "u4a.js", "u4b.js", "u4c.js", "papers.js", "gloss.js", "u4assess.js", "forms.js", "print.js", "deckcore.js", "diagrams.js", "scripts.js", "app.js"];
const MIME = { ".pdf": "application/pdf", ".png": "image/png" };
const FILE_DIRS = ["icons", "diagrams", "pdf", "factfiles"];

(async () => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(PASS), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const enc = async (bytes) => { const iv = crypto.getRandomValues(new Uint8Array(12)); const c = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes)); const o = new Uint8Array(12 + c.length); o.set(iv); o.set(c, 12); return Buffer.from(o); };
  const write = async (rel, bytes) => { const f = path.join(OUT, "enc", rel + ".bin"); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, await enc(bytes)); };
  for (const s of SCRIPTS) await write(s, fs.readFileSync(path.join(SRC, s)));
  const files = {};
  for (const d of FILE_DIRS) for (const f of fs.readdirSync(path.join(SRC, d)).sort()) {
    const rel = d + "/" + f, m = MIME[path.extname(f)]; if (!m) continue;
    files[rel] = m; await write(rel, fs.readFileSync(path.join(SRC, rel)));
  }
  const check = (await enc(new TextEncoder().encode("dth-ok"))).toString("base64");
  fs.writeFileSync(path.join(OUT, "enc", "meta.json"), JSON.stringify({ v: 1, iter: ITER, salt: Buffer.from(salt).toString("base64"), check, scripts: SCRIPTS, files }));
  console.log("encrypted", SCRIPTS.length, "scripts and", Object.keys(files).length, "files");
})();
