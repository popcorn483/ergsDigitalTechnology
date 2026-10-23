// Passcode gate: the site's content is stored encrypted (AES-256-GCM, key from PBKDF2-SHA-256).
// Nothing readable is served until the right passcode is entered.
(function () {
  "use strict";
  var KEY = null, META = null, realFetch = window.fetch.bind(window);
  var STORE = "dth.key";

  function b64ToBytes(s) { var bin = atob(s), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
  function bytesToB64(b) { var s = ""; b = new Uint8Array(b); for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
  function getKeyStore(k) { try { return sessionStorage.getItem(k) || localStorage.getItem(k); } catch (e) { return null; } }
  function setKeyStore(v, remember) { try { sessionStorage.setItem(STORE, v); if (remember) localStorage.setItem(STORE, v); } catch (e) {} }
  function clearKeyStore() { try { sessionStorage.removeItem(STORE); localStorage.removeItem(STORE); } catch (e) {} }

  function derive(pass) {
    var enc = new TextEncoder().encode(pass);
    return crypto.subtle.importKey("raw", enc, "PBKDF2", false, ["deriveKey"]).then(function (base) {
      return crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64ToBytes(META.salt), iterations: META.iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
    });
  }
  function importRaw(b64) { return crypto.subtle.importKey("raw", b64ToBytes(b64), { name: "AES-GCM" }, true, ["decrypt"]); }
  function decrypt(key, buf) { buf = new Uint8Array(buf); return crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.slice(0, 12) }, key, buf.slice(12)); }
  function check(key) { return decrypt(key, b64ToBytes(META.check)).then(function (p) { return new TextDecoder().decode(p) === "dth-ok"; }, function () { return false; }); }
  function getEnc(path) { return realFetch("enc/" + path + ".bin", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error("missing " + path); return r.arrayBuffer(); }); }

  // Serve encrypted files transparently to the app (PDFs, images)
  window.fetch = function (input, init) {
    var u = typeof input === "string" ? input.replace(/^\.\//, "") : null;
    if (u && KEY && META.files[u]) {
      return getEnc(u).then(function (b) { return decrypt(KEY, b); }).then(function (p) {
        return new Response(new Blob([p], { type: META.files[u] }), { status: 200 });
      }, function () { return new Response("", { status: 404 }); });
    }
    return realFetch(input, init);
  };

  function boot() {
    var go = Promise.resolve();
    var texts = META.scripts.map(function (s) { return getEnc(s).then(function (b) { return decrypt(KEY, b); }).then(function (p) { return new TextDecoder().decode(p); }); });
    return Promise.all(texts).then(function (all) {
      document.getElementById("lock").remove();
      document.documentElement.classList.remove("locked");
      all.forEach(function (code, i) { var el = document.createElement("script"); el.textContent = code + "\n//# sourceURL=" + META.scripts[i]; document.body.appendChild(el); });
      var out = document.createElement("button"); out.className = "lockout"; out.type = "button"; out.textContent = "Lock"; out.title = "Lock the hub on this device";
      out.onclick = function () { clearKeyStore(); location.reload(); };
      var top = document.querySelector(".top-in"); if (top) top.appendChild(out);
    });
  }

  function showForm(msg) {
    var box = document.getElementById("lock");
    box.innerHTML = '<form class="lock-card" id="lockform" autocomplete="off"><span class="chip-logo" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 22 22"><rect x="5" y="5" width="12" height="12" rx="2" fill="#11503e"/><g stroke="#a95a24" stroke-width="2"><path d="M8 1v4M14 1v4M8 17v4M14 17v4M1 8h4M1 14h4M17 8h4M17 14h4"/></g></svg></span>' +
      '<h1>Digital Technology Hub</h1><p>Enter the passcode from your teacher.</p>' +
      '<label for="lockpass" class="sr">Passcode</label><input id="lockpass" type="password" placeholder="Passcode" required autocapitalize="off" spellcheck="false">' +
      '<label class="lock-rem"><input type="checkbox" id="lockrem"> Remember on this device</label>' +
      '<button type="submit" id="lockgo">Unlock</button><p class="lock-err" id="lockerr" role="alert">' + (msg || "") + "</p></form>";
    var f = document.getElementById("lockform"), inp = document.getElementById("lockpass"), btn = document.getElementById("lockgo"), err = document.getElementById("lockerr");
    inp.focus();
    f.onsubmit = function (e) {
      e.preventDefault(); err.textContent = ""; btn.disabled = true; btn.textContent = "Checking…";
      derive(inp.value.trim()).then(function (k) {
        return check(k).then(function (ok) {
          if (!ok) throw "bad";
          KEY = k; return crypto.subtle.exportKey("raw", k).then(function (raw) { setKeyStore(bytesToB64(raw), document.getElementById("lockrem").checked); });
        });
      }).then(function () { btn.textContent = "Opening…"; return boot(); }).catch(function (x) {
        btn.disabled = false; btn.textContent = "Unlock";
        err.textContent = x === "bad" ? "That passcode isn't right. Try again." : "The hub couldn't be opened. Check your connection and try again.";
        inp.select();
      });
    };
  }

  function start() {
    if (!window.crypto || !crypto.subtle) { document.getElementById("lock").innerHTML = '<div class="lock-card"><h1>Digital Technology Hub</h1><p>Open this page over https (or from a local web server) to unlock it.</p></div>'; return; }
    realFetch("enc/meta.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (m) {
      META = m;
      var saved = getKeyStore(STORE);
      if (!saved) return showForm();
      return importRaw(saved).then(function (k) { return check(k).then(function (ok) { if (!ok) throw 0; KEY = k; return boot(); }); }).catch(function () { clearKeyStore(); showForm(); });
    }).catch(function () { document.getElementById("lock").innerHTML = '<div class="lock-card"><h1>Digital Technology Hub</h1><p>The hub couldn\'t load. Open it from a web server, not by double-clicking the file.</p></div>'; });
  }
  start();
})();
