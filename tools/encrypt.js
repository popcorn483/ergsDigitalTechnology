// Encrypts the hub's content for publishing behind a passcode.
// Usage: node tools/encrypt.js <plain-source-dir> <output-dir>   (passcode read from the HUB_PASSCODE env var)
// AES-256-GCM per file (12-byte synthetic IV prepended); key from PBKDF2-SHA-256 with a random salt kept between builds.
const fs = require("fs"), path = require("path"), { webcrypto: crypto } = require("crypto");
const [SRC, OUT] = process.argv.slice(2);
const PASS = process.env.HUB_PASSCODE;
if (!SRC || !OUT || !PASS) { console.error("usage: HUB_PASSCODE=... node tools/encrypt.js <src> <out>"); process.exit(1); }
const ITER = 600000;
// the scripts are exactly those index.html loads, in order
const SCRIPTS = [...fs.readFileSync(path.join(SRC, "index.html"), "utf8").matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const MIME = { ".pdf": "application/pdf", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const FILE_DIRS = ["icons", "diagrams", "pdf", "factfiles", "audio"];

(async () => {
  // Reuse the salt from an existing build so unchanged files encrypt to identical bytes (keeps git history small)
  let salt; const metaPath = path.join(OUT, "enc", "meta.json");
  try { const m = JSON.parse(fs.readFileSync(metaPath, "utf8")); if (m.iter === ITER) salt = Uint8Array.from(Buffer.from(m.salt, "base64")); } catch (e) {}
  if (!salt) salt = crypto.getRandomValues(new Uint8Array(16));
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(PASS), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, 256));
  const key = await crypto.subtle.importKey("raw", bits, { name: "AES-GCM" }, false, ["encrypt"]);
  // Synthetic IV: HMAC(sub-key, path + content), so the same file always gives the same ciphertext and different files never share an IV
  const macKey = await crypto.subtle.importKey("raw", new Uint8Array(await crypto.subtle.digest("SHA-256", Buffer.concat([Buffer.from("iv-key:"), Buffer.from(bits)]))), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const enc = async (bytes, label) => { const iv = new Uint8Array(await crypto.subtle.sign("HMAC", macKey, Buffer.concat([Buffer.from(label + "\0"), Buffer.from(bytes)]))).slice(0, 12); const c = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes)); const o = new Uint8Array(12 + c.length); o.set(iv); o.set(c, 12); return Buffer.from(o); };
  const write = async (rel, bytes) => { const f = path.join(OUT, "enc", rel + ".bin"); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, await enc(bytes, rel)); };
  for (const s of SCRIPTS) await write(s, fs.readFileSync(path.join(SRC, s)));
  const files = {};
  for (const d of FILE_DIRS) for (const f of (fs.existsSync(path.join(SRC, d)) ? fs.readdirSync(path.join(SRC, d)).sort() : [])) {
    const rel = d + "/" + f, m = MIME[path.extname(f)]; if (!m) continue;
    files[rel] = m; await write(rel, fs.readFileSync(path.join(SRC, rel)));
  }
  const check = (await enc(new TextEncoder().encode("dth-ok"), "check")).toString("base64");
  fs.writeFileSync(path.join(OUT, "enc", "meta.json"), JSON.stringify({ v: 1, iter: ITER, salt: Buffer.from(salt).toString("base64"), check, scripts: SCRIPTS, files }));
  console.log("encrypted", SCRIPTS.length, "scripts and", Object.keys(files).length, "files");
})();
