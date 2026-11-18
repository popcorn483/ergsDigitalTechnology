/* Mr B's Digital Technology Revision: Firebase back end (free Spark plan, no server code).
   The site was written to talk to a Google Apps Script (tools/pupil-activity.gs). This file answers those same requests
   in the browser, using Cloud Firestore and Firebase sign-in, so the rest of the site barely changed: any fetch() or
   sendBeacon() to MRB_FB.apiUrl (the address in activity.json) is handled here and never leaves the browser.
   Who may read and write what is enforced by firebase/firestore.rules (the rules ARE the server). See tools/FIREBASE.md.

   Pupils: one Firebase account per pupil, <pupil id>.<n>@pupils.ergs-revision.firebaseapp.com, password = their 4-digit
   PIN (padded). They still sign in with their school email and PIN: emails/<school email> says which pupil and account.
   A new PIN (Reset PIN, Email a new PIN) means account n+1. Firebase itself slows down repeated wrong PINs.
   Pupils moved from the Google Sheet keep their PIN: the first time each signs in, the old script checks it, then their
   Firebase account is made with it. Teachers: Google sign-in (MRB_FB.owners, or a Firestore "staff" document), or a pupil
   account made a teacher in the Teacher area.
   Staying free: activity is buffered on the device and written at most once every 3 minutes per pupil; pupil look-ups
   are cached for a few minutes; the Teacher area uses live listeners (only changes are read). */
(function () {
  'use strict';
  const CFG = window.MRB_FB || {};
  if (!CFG.apiUrl || !window.fetch || window.__mrbFbapi) return;
  window.__mrbFbapi = 1;
  const API = CFG.apiUrl, LEGACY = CFG.legacyUrl || '';
  const realFetch = window.fetch.bind(window);
  const realBeacon = navigator.sendBeacon ? navigator.sendBeacon.bind(navigator) : null;
  const isApi = u => String(u || '').indexOf(API) === 0;

  /* ---------- switched off (USE_FIREBASE false, or ?fb=0): every request goes to the old Google script, as before ---------- */
  if (!CFG.on) {
    const toLegacy = u => LEGACY + String(u).slice(API.length);
    window.fetch = function (input, init) { const u = typeof input === 'string' ? input : (input && input.url) || ''; return isApi(u) ? realFetch(toLegacy(u), init) : realFetch(input, init); };
    if (realBeacon) navigator.sendBeacon = function (u, data) { return realBeacon(isApi(u) ? toLegacy(u) : u, data); };
    window.FBAPI = { off: true };
    return;
  }

  const V = '10.14.1', CDN = 'https://www.gstatic.com/firebasejs/' + V + '/';
  const DOMAIN = '@pupils.' + CFG.firebase.projectId + '.firebaseapp.com';
  const OWNERS = (CFG.owners || []).map(e => String(e).toLowerCase());
  const SITE = new URL('./', document.currentScript ? document.currentScript.src : location.href).href;   // the site's root (this file is at the top)
  const SCRIPT_V = 37;   // the Teacher area checks this (the features of Apps Script v37)
  const ZONES = ['Y8', 'Y9', 'Y10', 'U1', 'U4', 'U5', 'AS1', 'AS2', 'A21', 'A22'];
  const YEAR_ZONES = { 8: ['Y8'], 9: ['Y9'], 10: ['Y10'], 11: ['U1'], 12: ['U1', 'U4', 'U5'], 13: ['AS1', 'AS2'], 14: ['AS1', 'AS2', 'A21', 'A22'] };
  const BOOKS = ['home', 'U1', 'U4', 'U5', 'AS1', 'AS2', 'A21', 'A22', 'KS3', 'Y8', 'Y9', 'Y10', 'Y0'];
  const HOUSES = ['Belmore', 'Benaughlin', 'Cuilcagh', 'Trien'];
  const EMAIL_RE = /^[a-z0-9._%+'-]{1,64}@c2ken\.net$/;
  const PROV_RE = /^[A-Z]\. [A-Za-z'’ -]+$/;
  const FLUSH_MS = 3 * 60000, PSAVE_MS = 5 * 60000, LIVE_MS = 6 * 60000;

  // ---------- small helpers ----------
  const now = () => Date.now();
  const hex = buf => Array.prototype.map.call(new Uint8Array(buf), b => ('0' + b.toString(16)).slice(-2)).join('');
  const sha = s => crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(hex);
  const rand = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return hex(a); };
  const okId = id => /^[a-z0-9]{6,24}$/i.test(String(id || ''));
  const PW = pin => 'mrbdt-' + pin + '-pin';
  const acctFor = (pid, gen) => String(pid).toLowerCase() + '.' + gen + DOMAIN;
  const genOf = a => { const m = /\.(\d+)@/.exec(String(a || '')); return m ? +m[1] : 0; };
  const pidOf = a => { const m = /^([a-z0-9]{6,24})\.\d+@pupils\./.exec(String(a || '').toLowerCase()); return m && String(a).toLowerCase().endsWith(DOMAIN) ? m[1] : ''; };
  const nem = e => String(e || '').trim().toLowerCase();
  const ncls = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
  const cleanName = v => clean(String(v || '').replace(/\s+/g, ' '), 40);
  const nameKey = n => String(n || '').toLowerCase().replace(/['’-]/g, '').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');
  const words = n => nameKey(n).split(' ').filter(Boolean).length;
  const yearOf = cls => { const m = /^(\d{1,2})/.exec(ncls(cls)); return m ? +m[1] : 0; };
  const zl = v => [...new Set((Array.isArray(v) ? v.join(',') : String(v || '')).toUpperCase().split(/[\s,]+/).filter(z => ZONES.indexOf(z) >= 0))];
  const code = e => (e && (e.code || e.message)) || String(e);
  const denied = e => /permission|PERMISSION_DENIED|insufficient/i.test(code(e));
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } } };
  const J = (s, d) => { try { const v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } };
  const UKF = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' });
  const ukDay = t => UKF.format(new Date(t));
  const addDays = (ds, n) => { const d = new Date(ds + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const mondayOf = t => { const ds = ukDay(t), d = new Date(ds + 'T12:00:00Z'); return addDays(ds, -((d.getUTCDay() + 6) % 7)); };
  const newPin = () => { let p; do { p = String(Math.floor(Math.random() * 10000)).padStart(4, '0'); } while (/^(\d)\1{3}$|^(0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210|1212|2580|1004|1122)$/.test(p)); return p; };
  const chunk = (a, n) => { const out = []; for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out; };
  /* a small cache on this device, so a page load doesn't re-read what hasn't changed (keeps the free daily reads for real use) */
  async function cached(key, ms, fn) {
    const c = J(LS.get('mrb-fbc:' + key), null); if (c && now() - c.t < ms) return c.v;
    const v = await fn(); LS.set('mrb-fbc:' + key, JSON.stringify({ t: now(), v })); return v;
  }
  const uncache = key => LS.set('mrb-fbc:' + key, null);

  // ---------- Firebase (loaded from Google's CDN) ----------
  /* SPEED: Firebase (about 500 KB) is only loaded when it's needed: a pupil's ordinary page view is answered from this
     device's cache (sign-in, zones, set work, page marks: kept a few minutes), and Firebase loads in the background when
     there is something to save (every 3 minutes at most), or straight away to sign in. The Teacher area loads it at once. */
  let FBP = null;
  const loadFB = () => FBP || (FBP = Promise.all([import(CDN + 'firebase-app.js'), import(CDN + 'firebase-auth.js'), import(CDN + 'firebase-firestore.js')]).then(([A, AU, FS]) => {
    const app = A.initializeApp(CFG.firebase), auth = AU.getAuth(app), db = FS.initializeFirestore(app, { ignoreUndefinedProperties: true });
    const o = { A, AU, FS, app, auth, db };
    o.ready = new Promise(res => { const un = AU.onAuthStateChanged(auth, u => { un(); res(u); }); });
    AU.onAuthStateChanged(auth, () => { onAuth(o); TU = teacherUser(o); });
    return o;
  }));
  const FB = { then: (a, b) => loadFB().then(a, b), catch: f => loadFB().catch(f) };
  const ready = () => FB.then(o => o.ready.then(() => o));
  const D = (o, path) => o.FS.doc(o.db, path);
  const C = (o, path) => o.FS.collection(o.db, path);
  const getD = (o, path) => o.FS.getDoc(D(o, path)).then(s => s.exists() ? s.data() : null);
  const getQ = (o, coll, ...w) => o.FS.getDocs(o.FS.query(C(o, coll), ...w.map(x => o.FS.where(x[0], x[1], x[2])))).then(s => { const a = []; s.forEach(x => a.push([x.id, x.data()])); return a; });
  const allDocs = (o, coll) => o.FS.getDocs(C(o, coll)).then(s => { const a = []; s.forEach(x => a.push([x.id, x.data()])); return a; });
  const inc = (o, n) => o.FS.increment(n);
  /* many writes, 400 to a batch: ops are ['set', path, data, merge?] / ['update', path, data] / ['del', path] */
  async function commit(o, ops) {
    for (const c of chunk(ops, 400)) {
      const b = o.FS.writeBatch(o.db);
      c.forEach(x => { if (x[0] === 'del') b.delete(D(o, x[1])); else if (x[0] === 'update') b.update(D(o, x[1]), x[2]); else b.set(D(o, x[1]), x[2], x[3] ? { merge: true } : {}); });
      await b.commit();
    }
  }

  // ---------- who is signed in ----------
  let ME = { pid: '', doc: undefined, un: null, ready: null, tid: '', tdoc: null, tun: null };
  let FIRST = true;
  function onAuth(o) {
    const u = o.auth.currentUser, pid = u && u.email ? pidOf(u.email) : '';
    if (FIRST) {   // a pupil who signed out of the site (or a staff device): sign Firebase out too, so the next person starts fresh
      FIRST = false;
      if (pid && (!LS.get('mrb-pupil') || LS.get('notes-nocount')) && !/^FB\./.test(LS.get('teacher.actkey') || '') && !/teacher\.html$/i.test(location.pathname)) { o.AU.signOut(o.auth); return; }
    }
    if (!pid) LS.set('mrb-fb-pid', null);
    if (pid === ME.pid) { paintBar(); return; }
    if (ME.un) ME.un(); if (ME.tun) ME.tun();
    ME = { pid, doc: undefined, un: null, ready: null, tid: '', tdoc: null, tun: null };
    if (pid) ME.ready = new Promise(res => {
      ME.un = o.FS.onSnapshot(D(o, 'pupils/' + pid), s => { ME.doc = s.exists() ? s.data() : false; watchTarget(o); res(); }, () => { ME.doc = false; res(); });
    });
    paintBar();
    if (pid) setTimeout(() => flush(), 1500);
  }
  function watchTarget(o) {   // a merged account acts for the pupil it was merged into
    const t = ME.doc && ME.doc.mergedInto;
    if (!t) { if (ME.tun) { ME.tun(); ME.tun = null; } ME.tid = ''; ME.tdoc = null; return; }
    if (ME.tun && ME.tid === t) return;
    if (ME.tun) ME.tun(); ME.tid = t;
    ME.tun = o.FS.onSnapshot(D(o, 'pupils/' + t), s => { ME.tdoc = s.exists() ? s.data() : null; }, () => { ME.tdoc = null; });
  }
  /* the signed-in pupil, if their account is still their current one: { pid, doc, tid (the pupil they act for), tdoc } */
  async function meNow(o) {
    const u = o.auth.currentUser; if (!u || !pidOf(u.email)) return null;
    if (ME.ready) await ME.ready;
    const em = u.email.toLowerCase();
    if (ME.doc && ME.doc.acct !== em) { const fresh = await getD(o, 'pupils/' + ME.pid).catch(() => null); if (fresh) ME.doc = fresh; }
    if (!ME.doc || ME.doc.acct !== em) return null;
    const t = ME.doc.mergedInto || ME.pid;
    LS.set('mrb-fb-pid', ME.pid + '|' + t);
    if (t === ME.pid) return { pid: ME.pid, doc: ME.doc, tid: t, tdoc: ME.doc };
    const td = ME.tdoc || await getD(o, 'pupils/' + t).catch(() => null) || {};
    return { pid: ME.pid, doc: ME.doc, tid: t, tdoc: td };
  }
  let STAFF_OK = '';
  function googleTeacher(o) {
    const u = o.auth.currentUser; if (!u || !u.email) return false;
    if (!(u.providerData || []).some(x => x.providerId === 'google.com')) return false;
    const em = u.email.toLowerCase(); return OWNERS.indexOf(em) >= 0 || STAFF_OK === em;
  }
  const ownerUser = o => { const u = o.auth.currentUser; return googleTeacher(o) && OWNERS.indexOf(String(u.email).toLowerCase()) >= 0; };
  function teacherUser(o) {
    if (googleTeacher(o)) return true;
    const u = o.auth.currentUser; return !!(u && ME.doc && ME.doc.role === 'teacher' && ME.doc.acct === String(u.email).toLowerCase());
  }
  async function checkStaffDoc(o) {   // another member of staff's Google account (Firestore "staff" collection)
    const u = o.auth.currentUser; if (!u || !u.email || googleTeacher(o)) return;
    if (!(u.providerData || []).some(x => x.providerId === 'google.com')) return;
    const s = await getD(o, 'staff/' + u.email.toLowerCase()).catch(() => null); if (s) STAFF_OK = u.email.toLowerCase();
  }

  // ---------- the old Google script (PIN checks for pupils moved from the sheet, and emails) ----------
  async function legacy(action, params, post) {
    if (!LEGACY) return null;
    try {
      if (post) return await realFetch(LEGACY, { method: 'POST', cache: 'no-store', credentials: 'omit', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(post) }).then(r => r.json());
      const qs = new URLSearchParams(Object.assign({ action }, params || {}, { t: now() }));
      return await realFetch(LEGACY + '?' + qs, { cache: 'no-store', credentials: 'omit' }).then(r => r.json());
    } catch (e) { return null; }
  }
  const tkey = () => LS.get('teacher.actkey') || '';
  const legacyKey = () => { const k = tkey(); return k && !/^FB\./.test(k) ? k : ''; };

  // ---------- pupils signing in ----------
  async function signInAs(o, acct, pin) {
    try { await o.AU.signInWithEmailAndPassword(o.auth, acct, PW(pin)); onAuth(o); if (ME.ready) await ME.ready; return true; }
    catch (e) { const c = code(e); if (/too-many-requests/.test(c)) return { ok: false, error: 'locked' }; if (/network/.test(c)) return { ok: false, error: 'offline' }; return { ok: false, error: 'pin' }; }
  }
  /* a Firebase account for this pupil with this PIN (signs this device in to it). Tries <pid>.<gen>, then the next numbers. */
  async function makeAccount(o, pid, gen, pin) {
    for (let g = Math.max(1, gen || 1), k = 0; k < 8; g++, k++) {
      const email = acctFor(pid, g);
      try { await o.AU.createUserWithEmailAndPassword(o.auth, email, PW(pin)); onAuth(o); if (ME.ready) await ME.ready; return email; }
      catch (e) {
        if (!/email-already-in-use/.test(code(e))) throw e;
        try { await o.AU.signInWithEmailAndPassword(o.auth, email, PW(pin)); onAuth(o); if (ME.ready) await ME.ready; return email; }   // a half-finished earlier try with the same PIN
        catch (e2) { if (/too-many-requests/.test(code(e2))) throw e2; }
      }
    }
    throw new Error('could not make an account');
  }
  let A2 = null;   // a second, invisible Firebase app the teacher uses to make pupils' accounts (so the teacher stays signed in)
  function creator(o) {
    if (!A2) { const a = o.AU.getAuth(o.A.initializeApp(CFG.firebase, 'mrb-creator')); A2 = o.AU.setPersistence(a, o.AU.inMemoryPersistence).then(() => a); }
    return A2;
  }
  async function teacherAccount(o, pid, gen, pin) {
    const a2 = await creator(o);
    for (let g = Math.max(1, gen || 1), k = 0; k < 8; g++, k++) {
      const email = acctFor(pid, g);
      try { await o.AU.createUserWithEmailAndPassword(a2, email, PW(pin)); await o.AU.signOut(a2); return email; }
      catch (e) { if (!/email-already-in-use/.test(code(e))) throw e; }
    }
    throw new Error('could not make an account');
  }
  /* this device's new account becomes the pupil's current one (allowed by the rules only when they have none yet, or after
     Reset PIN), and their email look-up points at it */
  async function claim(o, pid, email, extra) {
    const acct = o.auth.currentUser.email.toLowerCase();
    await o.FS.updateDoc(D(o, 'pupils/' + pid), Object.assign({ acct, gen: genOf(acct), resetPin: false, mig: false, pin: true }, extra || {}));
    ME.doc = Object.assign({}, ME.doc || {}, { acct });
    if (email) await o.FS.setDoc(D(o, 'emails/' + email), { pid, acct });
    return acct;
  }
  async function welcome(o, extra) {
    const m = await meNow(o); if (!m) return { ok: false, error: 'pin' };
    const t = m.tdoc || {}, sv = await getD(o, 'psave/' + m.tid).catch(() => null);
    const out = { ok: true, status: t.status || 'approved', id: m.tid, name: t.name || m.doc.name, cls: t.cls || m.doc.cls, email: t.email || m.doc.email || '', updated: sv ? sv.updated || 0 : 0, data: sv ? sv.data || '' : '' };
    if (m.doc.role === 'teacher') { out.teacher = true; out.tkey = 'FB.' + m.pid; }
    Object.keys(LS_KEYS()).forEach(k => uncache(k));
    return Object.assign(out, extra || {});
  }
  const LS_KEYS = () => { const o = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('mrb-fbc:') === 0) o[k.slice(8)] = 1; } } catch (e) { } return o; };
  async function signin(o, q) {
    const email = nem(q.email), pin = String(q.pin || '');
    if (!EMAIL_RE.test(email)) return { ok: false, error: 'email' };
    if (!/^\d{4}$/.test(pin)) return { ok: false, error: 'pin' };
    const e = await getD(o, 'emails/' + email);
    if (e && okId(e.pid)) {
      const pid = e.pid;
      if (e.acct && !e.r) { const r = await signInAs(o, e.acct, pin); if (r !== true) return r; return provName(o, q, welcome(o)); }
      if (e.m && LEGACY) {   // moved from the Google Sheet: its PIN is checked by the old script once
        const j = await legacy('signin', { email, pin });
        if (!j) return { ok: false, error: 'offline' };
        if (!j.ok) return j.error === 'pin' || j.error === 'locked' ? { ok: false, error: j.error, left: j.left } : { ok: false, error: 'pin' };
        if (j.fresh) return { ok: false, error: 'pin' };
      }
      // the old PIN is right, or they have no PIN yet (made by the teacher, or Reset PIN): this PIN becomes theirs
      try { await makeAccount(o, pid, genOf(e.acct) + 1, pin); } catch (x) { return /too-many/.test(code(x)) ? { ok: false, error: 'locked' } : { ok: false, error: 'pin' }; }
      try { await claim(o, pid, email); } catch (x) { if (denied(x)) return { ok: false, error: 'pin' }; throw x; }
      return provName(o, q, welcome(o));
    }
    // a new email: on a class list (then the name and class come from the list), or the pupil gives their name and class
    const li = await getD(o, 'clist/' + email).catch(() => null);
    const nm = li && li.name ? li.name : cleanName(q.name), cl = li && li.cls ? ncls(li.cls) : ncls(q.cls);
    if (words(nm) < 2 || !cl) return { ok: false, error: 'new', listed: !!li };
    if (LEGACY && !li) {   // a pupil from before school emails: the old script finds them by name and year, if this PIN opens it
      const j = await legacy('signin', { email, pin, name: nm, cls: cl });
      if (j && j.ok && okId(j.id) && !j.fresh) return attach(o, String(j.id).toLowerCase(), email, pin, nm, cl);
    }
    const pid = 'e' + rand(8).slice(0, 15);
    try { await makeAccount(o, pid, 1, pin); } catch (x) { return /too-many/.test(code(x)) ? { ok: false, error: 'locked' } : { ok: false, error: 'offline' }; }
    const acct = o.auth.currentUser.email.toLowerCase();
    await o.FS.setDoc(D(o, 'pupils/' + pid), { name: nm, cls: cl, status: li ? 'approved' : 'pending', at: now(), email, acct, gen: genOf(acct), pin: true });
    ME.doc = { name: nm, cls: cl, status: li ? 'approved' : 'pending', email, acct };
    await o.FS.setDoc(D(o, 'emails/' + email), { pid, acct });
    return welcome(o, { fresh: true });
  }
  /* an account made from an email alone ("J. Smith"): they give their real name the first time they sign in */
  async function provName(o, q, w) {
    const r = await w; if (!r.ok) return r;
    const m = await meNow(o); if (!m || !m.doc.prov) return r;
    const nm = cleanName(q.name);
    if (words(nm) < 2) return { ok: false, error: 'new', name: true };
    await o.FS.updateDoc(D(o, 'pupils/' + m.pid), { name: nm, prov: false }).catch(() => { });
    return Object.assign(r, { name: nm });
  }
  /* a pupil the old script recognised (checked their PIN): give them a Firebase account with it and link their email */
  async function attach(o, pid, email, pin, nm, cl) {
    let acct;
    try { acct = await makeAccount(o, pid, 1, pin); } catch (x) { return /too-many/.test(code(x)) ? { ok: false, error: 'locked' } : { ok: false, error: 'offline' }; }
    const p = await getD(o, 'pupils/' + pid);
    if (p) {
      if (p.acct && p.acct !== acct) { const r = await signInAs(o, p.acct, pin); if (r !== true) return r; }
      else await o.FS.updateDoc(D(o, 'pupils/' + pid), Object.assign({ acct, gen: genOf(acct), resetPin: false, mig: false, pin: true }, p.email ? {} : { email }));
      if (!p.email) await o.FS.updateDoc(D(o, 'pupils/' + pid), { email }).catch(() => { });
    } else {
      await o.FS.setDoc(D(o, 'pupils/' + pid), { name: nm || 'New pupil', cls: cl || '', status: 'pending', at: now(), email, acct, gen: genOf(acct), pin: true });
    }
    if (ME.ready) await ME.ready;
    const cur = (o.auth.currentUser.email || '').toLowerCase();
    if (!(await getD(o, 'emails/' + email).catch(() => null))) await o.FS.setDoc(D(o, 'emails/' + email), { pid, acct: cur }).catch(e => console.warn('[mrb] email link', e));
    return welcome(o, { joined: true });
  }
  async function addemail(o, q) {   // a pupil from before school emails adds theirs
    const email = nem(q.email), pin = String(q.pin || '');
    if (!EMAIL_RE.test(email)) return { ok: false, error: 'email' };
    if (!/^\d{4}$/.test(pin)) return { ok: false, error: 'pin' };
    const e = await getD(o, 'emails/' + email);
    if (e) return signin(o, { email, pin });
    const j = await legacy('addemail', { id: q.id, email, pin });
    if (!j) return { ok: false, error: 'offline' };
    if (!j.ok || !okId(j.id)) return j;
    return attach(o, String(j.id).toLowerCase(), email, pin, j.name, j.cls);
  }

  // ---------- pupils using the site ----------
  function effZones(p, classZones) {
    if (Array.isArray(p.zones) && p.zones.length) return p.zones;
    if (Array.isArray(classZones) && classZones.length) return classZones;
    return YEAR_ZONES[yearOf(p.cls)] || null;
  }
  async function classDoc(o, cls) { const c = ncls(cls); if (!c) return null; return cached('cls:' + c, 10 * 60000, () => getD(o, 'classes/' + c).catch(() => null)); }
  async function access(o, q) {
    const m = await meNow(o);
    if (!m) return { ok: true, pin: false };   // no Firebase sign-in on this device yet: the site asks for email and PIN
    if (m.doc.resetPin) return { ok: true, pin: false };
    const t = m.tdoc || {}, c = await classDoc(o, t.cls);
    const asked = await cached('asked:' + m.tid, 10 * 60000, () => getQ(o, 'zreqs', ['pid', '==', m.tid], ['status', '==', 'pending']).then(a => a.map(x => x[1].zone)).catch(() => []));
    const out = { ok: true, status: t.status || 'approved', pin: true, email: t.email || m.doc.email || '', id: m.tid, name: t.name, cls: t.cls, zones: effZones(t, c && c.zones), asked, teacher: m.doc.role === 'teacher' || undefined };
    if (out.status === 'approved') LS.set('mrb-fbc:acc:' + m.pid, JSON.stringify({ t: now(), v: out, aw: t.aw || {} }));   // (someone waiting for approval is checked every time)
    return out;
  }
  async function classes(o) {
    const L = await cached('classes', 30 * 60000, () => allDocs(o, 'classes'));
    return { ok: true, classes: L.map(([id, c]) => ({ cls: id, teacher: c.teacher || '', course: c.course || '' })) };
  }
  async function zonereq(o, q) {
    const m = await meNow(o), zone = String(q.zone || '').toUpperCase(); if (!m || ZONES.indexOf(zone) < 0) return { ok: false };
    const rid = m.tid + '_' + zone, cur = await getD(o, 'zreqs/' + rid).catch(() => null);
    if (cur && cur.status === 'pending') return { ok: true, again: true };
    await o.FS.setDoc(D(o, 'zreqs/' + rid), { pid: m.tid, name: m.tdoc.name || '', cls: m.tdoc.cls || '', zone, at: now(), status: 'pending' });
    uncache('asked:' + m.tid); uncache('acc:' + m.pid);
    legacy('zonereq', { id: m.tid, zone, name: m.tdoc.name || '', cls: m.tdoc.cls || '' });   // the old script emails Mr Butler (not waited for)
    return { ok: true };
  }
  async function awards(o, q) {
    const m = await meNow(o); if (!m) return { ok: false };
    const aw = (m.tdoc && m.tdoc.aw) || {}, since = +q.since || 0;
    return { ok: true, awards: Object.keys(aw).map(k => { const i = k.indexOf('|'); return [aw[k][0], k.slice(0, i), k.slice(i + 1), aw[k][1]]; }).filter(x => x[0] > since) };
  }
  const pubRun = (id, r) => { const today = ukDay(now()); return { id, comp: r.comp, title: r.title, years: r.years, cat: r.cat, opens: r.opens, closes: r.closes, note: r.note || '', state: r.opens > today ? 'soon' : r.closes < today ? 'closed' : 'open' }; };
  async function comprun(o, q) { const r = await getD(o, 'comps/' + String(q.r || '')); return r ? { ok: true, run: pubRun(String(q.r), r), houses: HOUSES } : { ok: false, error: 'not found' }; }
  async function compsopen(o) {
    const L = await cached('comps', 10 * 60000, () => allDocs(o, 'comps'));
    return { ok: true, runs: L.map(([id, r]) => pubRun(id, r)).filter(r => r.state !== 'closed').sort((a, b) => a.closes < b.closes ? -1 : 1), houses: HOUSES };
  }
  async function staff(o, q) {
    const k = String(q.key || ''); if (k.length < 4) return { error: 'key' };
    const s = await getD(o, 'staffkeys/' + await sha('mrbdt-staff|' + k)).catch(() => null);
    return s ? { ok: true, teacher: !!s.t, main: !!s.main } : { error: 'key' };
  }
  const tokens = (pid, cls) => { const c = ncls(cls), y = yearOf(c); return ['ALL'].concat(c ? ['C-' + c] : [], y ? ['Y-' + y] : [], ['P-' + pid]); };
  async function mywork(o) {
    const m = await meNow(o); if (!m) return { ok: false };
    const t = m.tdoc || {}, tid = m.tid;
    return cached('mywork:' + tid, 10 * 60000, async () => {
      const [boxes, act, res, runs, ents] = await Promise.all([
        Promise.all(tokens(tid, t.cls).map(k => getD(o, 'inbox/' + k).catch(() => null))),
        getD(o, 'act/' + tid).catch(() => null),
        getQ(o, 'tres', ['pid', '==', tid]).catch(() => []),
        cached('comps', 10 * 60000, () => allDocs(o, 'comps')).catch(() => []),
        getQ(o, 'centries', ['pid', '==', tid]).catch(() => [])
      ]);
      const read = (act && act.read) || {}, W = {}, M = {}, T = {};
      boxes.forEach(b => { if (!b) return; Object.assign(W, b.w || {}); Object.assign(M, b.m || {}); Object.assign(T, b.t || {}); });
      const work = Object.keys(W).map(id => Object.assign({ id }, W[id])).sort((a, b) => (a.at || 0) - (b.at || 0)).map(w => ({ id: w.id, book: w.book, ch: w.ch, due: w.due || '', note: w.note || '' }));
      const msgs = Object.keys(M).filter(id => !read[id]).map(id => ({ id, text: M[id].text, at: M[id].at })).sort((a, b) => a.at - b.at).slice(-10);
      const tests = Object.keys(T).map(id => { const x = T[id], mine = res.map(r => r[1]).filter(r => r.book === x.book && r.ch === x.ch);
        return { id, book: x.book, ch: x.ch, title: x.title || '', due: x.due || '', note: x.note || '', tries: mine.length, best: mine.reduce((a, r) => Math.max(a, +r.score || 0), -1), of: mine.length ? +mine[0].of || 100 : 100 }; });
      const yr = yearOf(t.cls), today = ukDay(now());
      const comps = runs.filter(([id, r]) => String(r.years || '').split(',').map(Number).indexOf(yr) >= 0 && r.opens <= today && r.closes >= today)
        .map(([id, r]) => { const e = ents.find(x => x[1].rid === id); return { id, comp: r.comp, title: r.title, cat: r.cat, closes: r.closes, note: r.note || '', entered: e ? e[1].at : 0, house: e ? e[1].house || '' : '' }; });
      return { ok: true, work, msgs, tests, comps };
    });
  }
  async function load(o, q) {
    const c = String(q.code || '').toUpperCase().trim(); if (!/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(c)) return { ok: false, error: 'code' };
    const s = await getD(o, 'saves/' + c).catch(() => null);
    if (s) return { ok: true, updated: s.updated, data: s.data };
    const j = await legacy('load', { code: c });   // saved before the move: still in the Google Sheet
    return j || { ok: false, error: 'code' };
  }

  /* ---------- activity from pupils' pages (time, "revising now", progress snapshots, read messages): kept in a queue on
     the device and written together at most once every 3 minutes, so a pupil uses a few dozen writes an hour ---------- */
  const QK = 'mrb-fb-q';
  const qload = () => { const q = J(LS.get(QK), null) || {}; return { log: q.log || [], snap: q.snap || {}, ping: q.ping || null, read: q.read || {} }; };
  const qsave = q => LS.set(QK, JSON.stringify(q));
  let FT = 0;
  function enqueue(fn) {
    const q = qload(); fn(q); if (q.log.length > 400) q.log = q.log.slice(-400); qsave(q);
    if (FT) return;
    const wait = Math.max(2000, (+LS.get('mrb-fb-qt') || 0) + FLUSH_MS - now());
    FT = setTimeout(() => { FT = 0; flush(); }, wait);
  }
  const quotaOut = () => +LS.get('mrb-fb-quota') > now();
  function pacificMidnight() { const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })); const ms = (24 * 3600 - (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds())) * 1000; return now() + ms + 60000; }
  function progSummary(s) {   // what the Teacher area's pupil list needs from a workbook snapshot
    const ch = {};
    (s.done || []).forEach(pg => { const c = pg.split('-')[0]; (ch[c] = ch[c] || [0, 0, 0])[0]++; });
    Object.keys(s.pq || {}).forEach(pg => { const v = s.pq[pg], c = pg.split('-')[0]; if (!v || !v[1]) return; const x = ch[c] = ch[c] || [0, 0, 0]; x[1]++; x[2] += Math.round((v[2] != null ? v[2] : v[0]) / v[1] * 100); });
    Object.keys(ch).forEach(c => { if (ch[c][1]) ch[c][2] = Math.round(ch[c][2] / ch[c][1]); });
    return { cov: s.cov, seen: s.seen, total: s.total, tr: s.tr, quiz: s.quiz || {}, at: s.at, ch, later: (s.later || []).length };
  }
  let FLUSHING = null, ACT_SEEN = '';
  function flush() {
    if (FLUSHING) return FLUSHING;
    FLUSHING = (async () => {
      const q = qload(); if (!q.log.length && !Object.keys(q.snap).length && !q.ping && !Object.keys(q.read).length) return;
      if (quotaOut()) return;
      const o = await ready(), m = await meNow(o); if (!m) return;
      if ((m.tdoc || {}).status && m.tdoc.status !== 'approved') { qsave({ log: [], snap: {}, ping: null, read: {} }); return; }
      qsave({ log: [], snap: {}, ping: null, read: {} });
      LS.set('mrb-fb-qt', String(now()));
      const tid = m.tid, t = m.tdoc || {}, name = t.name || '', cls = t.cls || '', ops = [];
      const act = { name, cls };
      if (q.log.length) {
        const days = {}; let tot = 0, first = Infinity, last = 0, lastK = null;
        act.units = {}; act.days = {};
        q.log.forEach(([ts, b, ch, pg, s]) => {
          s = Math.max(0, Math.min(3600, Math.round(+s || 0))); if (!s || BOOKS.indexOf(b) < 0) return;
          const d = ukDay(ts), x = days[d] || (days[d] = { pid: tid, d, s: 0, u: {}, t: {}, p: {}, uses: [] });
          x.s += s; x.u[b] = (x.u[b] || 0) + s; x.uses.push([ts, s, b, ch || ''].join(','));
          if (b !== 'home' && ch) { const k = b + '|' + ch, y = x.t[k] || (x.t[k] = { s: 0, l: 0, n: 0 }); y.s += s; y.l = Math.max(y.l, ts); y.n++; }
          if (pg || ch) { const k = b + '|' + (pg || ch), y = x.p[k] || (x.p[k] = { s: 0, l: 0, n: 0 }); y.s += s; y.l = Math.max(y.l, ts); y.n++; }
          tot += s; first = Math.min(first, ts); if (ts >= last) { last = ts; lastK = [b, ch, pg]; }
          act.units[b] = (act.units[b] || 0) + s; act.days[d] = (act.days[d] || 0) + s;
        });
        Object.keys(days).forEach(d => {
          const x = days[d], doc = { pid: tid, d, s: inc(o, x.s), last, u: {}, t: {}, p: {}, uses: o.FS.arrayUnion(...x.uses) };
          Object.keys(x.u).forEach(k => { doc.u[k] = inc(o, x.u[k]); });
          Object.keys(x.t).forEach(k => { doc.t[k] = { s: inc(o, x.t[k].s), l: x.t[k].l, n: inc(o, x.t[k].n) }; });
          Object.keys(x.p).forEach(k => { doc.p[k] = { s: inc(o, x.p[k].s), l: x.p[k].l, n: inc(o, x.p[k].n) }; });
          ops.push(['set', 'days/' + tid + '_' + d, doc, true]);
        });
        if (tot) {
          act.total = inc(o, tot); act.last = last;
          Object.keys(act.units).forEach(k => { act.units[k] = inc(o, act.units[k]); });
          Object.keys(act.days).forEach(k => { act.days[k] = inc(o, act.days[k]); });
          act.typed = {}; act.typed[name + ' (' + cls + ')'] = true;
          if (ACT_SEEN !== tid) { const a = await getD(o, 'act/' + tid).catch(() => null); ACT_SEEN = tid; if (!a || !a.first) act.first = first; }
          act.ping = { at: last, book: lastK[0], ch: lastK[1] || '', pg: lastK[2] || '' };
        } else { delete act.units; delete act.days; }
      }
      if (q.ping && (!act.ping || q.ping[0] > act.ping.at)) act.ping = { at: q.ping[0], book: q.ping[1], ch: q.ping[2] || '', pg: q.ping[3] || '' };
      const books = Object.keys(q.snap);
      if (books.length) {
        act.prog = {};
        books.forEach(b => { const s = q.snap[b]; ops.push(['set', 'prog/' + tid + '_' + b, Object.assign({ pid: tid, book: b, name, cls }, s)]); act.prog[b] = progSummary(s); });
      }
      if (Object.keys(q.read).length) act.read = q.read;
      ops.push(['set', 'act/' + tid, act, true]);
      try { await commit(o, ops); }
      catch (e) {
        console.warn('[mrb] activity not saved yet', e);
        if (/resource-exhausted|quota/i.test(code(e))) LS.set('mrb-fb-quota', String(pacificMidnight()));
        if (denied(e)) return;   // not allowed (not approved, or signed out): drop it
        const q2 = qload(); q2.log = q.log.concat(q2.log).slice(-400); Object.keys(q.snap).forEach(b => { if (!q2.snap[b]) q2.snap[b] = q.snap[b]; });
        q2.ping = q2.ping || q.ping; q2.read = Object.assign({}, q.read, q2.read); qsave(q2);
      }
    })().catch(e => console.warn('[mrb] flush', e)).then(() => { FLUSHING = null; });
    return FLUSHING;
  }
  addEventListener('pagehide', () => { if (qload().log.length && now() - (+LS.get('mrb-fb-qt') || 0) > FLUSH_MS) flush(); });
  function logPost(d) {
    const s = Math.round(+d.s || 0); if (!(s > 0 && s <= 3600) || BOOKS.indexOf(String(d.book)) < 0) return;
    enqueue(q => q.log.push([now(), String(d.book), clean(d.ch, 8), clean(d.pg, 12), s]));
  }
  function snapPost(d) {
    const book = String(d.book || ''); if (BOOKS.indexOf(book) < 0) return;
    const n = v => Math.max(0, Math.min(9999, Math.round(+v || 0))), ok = x => /^c\d{1,2}-p\d{1,3}$/.test(String(x)), quiz = {}, pq = {};
    Object.keys(d.quiz || {}).slice(0, 80).forEach(k => { const v = d.quiz[k]; if (/^c\d{1,2}(\|pp)?$/.test(k) && Array.isArray(v)) quiz[k] = [n(v[0]), n(v[1]), clean(v[2], 10)]; });
    Object.keys(d.pq || {}).slice(0, 600).forEach(k => { const v = d.pq[k]; if (ok(k) && Array.isArray(v)) pq[k] = [n(v[0]), n(v[1]), n(v[2]), n(v[3]), String(v[4] || '').replace(/[^A-D?-]/g, '').slice(0, 30), String(v[5] || '').replace(/[^01-]/g, '').slice(0, 30)]; });
    const L = a => (Array.isArray(a) ? a : []).filter(ok).slice(0, 600);
    const s = { at: now(), cov: 0, seen: n(d.seen), total: n(d.total), tr: n(d.tr), quiz, done: L(d.done), seenIds: L(d.seenIds), later: L(d.laterIds), pq };
    s.cov = s.done.length;
    enqueue(q => { q.snap[book] = s; });
  }
  /* saved progress (every notes-* item): at most every 5 minutes, or straight away when asked (Save now, Sign out) */
  let PS_T = 0, PS_DATA = null;
  async function psave(o, d) {
    const data = String(d.data || ''); if (data.length > 450000) return { ok: false };
    const m = await meNow(o); if (!m) return { ok: false };
    const write = async dd => { await o.FS.setDoc(D(o, 'psave/' + m.tid), { data: dd, updated: now() }); LS.set('mrb-fb-ps', String(now())); LS.set('mrb-fb-psp', null); };
    if (d.force || now() - (+LS.get('mrb-fb-ps') || 0) >= PSAVE_MS) { clearTimeout(PS_T); PS_T = 0; PS_DATA = null; await write(data); return { ok: true }; }
    PS_DATA = data; LS.set('mrb-fb-psp', '1');
    if (!PS_T) PS_T = setTimeout(() => { PS_T = 0; const x = PS_DATA; PS_DATA = null; if (x != null) write(x).catch(e => console.warn('[mrb] psave', e)); }, (+LS.get('mrb-fb-ps') || 0) + PSAVE_MS - now());
    return { ok: true };
  }
  async function codeSave(o, d) {
    const c = String(d.code || '').toUpperCase(), data = String(d.data || '');
    if (!/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(c) || data.length > 450000) return { ok: false };
    try { JSON.parse(data); } catch (e) { return { ok: false }; }
    await o.FS.setDoc(D(o, 'saves/' + c), { data, updated: now() }); return { ok: true };
  }
  const KEYS = {};
  async function testKey(book, ch) {
    const k = book + ':' + ch; if (KEYS[k] != null) return KEYS[k];
    try { const j = await realFetch(SITE + 'tests/' + book + '/' + ch + '.json', { cache: 'no-cache' }).then(r => r.json()); KEYS[k] = (j.q || []).map(q => String(q.a)).join(''); }
    catch (e) { KEYS[k] = ''; }
    return KEYS[k];
  }
  const mark = (ans, key) => { let s = 0; for (let i = 0; i < key.length; i++) if (ans[i] === key[i]) s++; return s; };
  async function testDone(o, d) {
    const book = String(d.book || ''), ch = String(d.ch || ''); if (!/^c\d{1,2}$/.test(ch) || BOOKS.indexOf(book) < 1) return { ok: false };
    const m = await meNow(o); if (!m) return { ok: false };
    const ans = String(d.ans || '').replace(/[^0-3-]/g, '').slice(0, 200), key = await testKey(book, ch);
    const of = key ? key.length : ans.length, score = key ? mark(ans, key) : Math.max(0, Math.min(of, Math.round(+d.score || 0)));
    await o.FS.setDoc(D(o, 'tres/' + m.tid + '_' + now().toString(36)), { tid: String(d.tid || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 20), pid: m.tid, name: m.tdoc.name || '', cls: m.tdoc.cls || '', book, ch, score, of, ans, min: Math.round(Math.max(0, Math.min(600, (+d.secs || 0) / 60))), at: now() });
    uncache('mywork:' + m.tid);
    return { ok: true, score, of };
  }
  /* a picture small enough for one Firestore document (under about 900 KB) */
  function shrinkImg(src) {
    return new Promise(res => {
      if (src.length < 900000) return res(src);
      const im = new Image(); im.onload = () => {
        let w = im.width, h = im.height, s = Math.min(1, 1400 / Math.max(w, h)), q = 0.8, out = src;
        for (let k = 0; k < 8; k++) {
          const c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
          const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
          out = c.toDataURL('image/jpeg', q); if (out.length < 900000) break; s *= 0.8; q = Math.max(0.5, q - 0.08);
        }
        res(out.length < 900000 ? out : '');
      }; im.onerror = () => res(''); im.src = src;
    });
  }
  async function compEntry(o, d) {
    const rid = String(d.rid || ''), run = await getD(o, 'comps/' + rid).catch(() => null);
    if (!run) return { ok: false, error: 'This competition has closed or been removed.' };
    const today = ukDay(now());
    if (run.opens > today) return { ok: false, error: 'Entries open on ' + run.opens + '.' };
    if (run.closes < today) return { ok: false, error: 'Entries have closed.' };
    let m = await meNow(o);
    if (!m && !o.auth.currentUser) await o.AU.signInAnonymously(o.auth);   // entering without signing in to the revision site
    const uid = o.auth.currentUser.uid, nm = m ? m.tdoc.name : cleanName(d.name), cls = m ? m.tdoc.cls : ncls(d.cls);
    if (!m && nm.replace(/[^A-Za-z]/g, '').length < 3) return { ok: false, error: 'Type your name first.' };
    const link = /^https:\/\/[^\s"'<>]{4,600}$/.test(String(d.link || '')) ? String(d.link) : '';
    const text = String(d.text || '').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').trim().slice(0, 3000);
    let img = /^data:image\/(png|jpeg|webp|gif);base64,/.test(String(d.img || '')) ? await shrinkImg(String(d.img)) : '';
    if (d.img && !img) return { ok: false, error: 'That picture is too big.' };
    const eid = rid + '_' + (m ? m.tid : uid), cur = await getD(o, 'centries/' + eid).catch(() => null);
    if (!img && !link && !text && !(cur && cur.img && !d.dropImg)) return { ok: false, error: 'Add your entry first.' };
    const e = { rid, pid: m ? m.tid : '', uid, name: nm, cls, house: HOUSES.indexOf(String(d.house)) >= 0 ? String(d.house) : '', title: clean(d.title, 80), link, text, at: now(), img: img ? true : !!(cur && cur.img && !d.dropImg) };
    await o.FS.setDoc(D(o, 'centries/' + eid), e, { merge: true });
    if (img) await o.FS.setDoc(D(o, 'cimg/' + eid), { src: img, uid });
    else if (cur && cur.img && d.dropImg) await o.FS.deleteDoc(D(o, 'cimg/' + eid)).catch(() => { });
    if (m) uncache('mywork:' + m.tid);
    return { ok: true, updated: !!cur };
  }
  function pupilPost(o, d) {
    if (d.kind === 'save') return codeSave(o, d);
    if (d.kind === 'psave') return psave(o, d);
    if (d.kind === 'testdone') return testDone(o, d);
    if (d.kind === 'compentry') return compEntry(o, d);
    if (d.kind === 'msgread') { const id = String(d.mid || ''); if (id) { enqueue(q => { q.read[id] = now(); }); LS_KEYS(); Object.keys(LS_KEYS()).filter(k => k.indexOf('mywork:') === 0).forEach(k => { const c = J(LS.get('mrb-fbc:' + k), null); if (c && c.v && c.v.msgs) { c.v.msgs = c.v.msgs.filter(x => x.id !== id); LS.set('mrb-fbc:' + k, JSON.stringify(c)); } }); } return { ok: true }; }
    if (d.kind === 'ping') { enqueue(q => { q.ping = [now(), String(d.book || ''), clean(d.ch, 8), clean(d.pg, 12)]; }); return { ok: true }; }
    if (d.kind === 'snap') { snapPost(d); return { ok: true }; }
    logPost(d); return { ok: true };
  }
  // saved progress a page couldn't write before it closed: written by the next page
  setTimeout(() => { if (LS.get('mrb-fb-psp') && window.MRB_CLOUD && LS.get('mrb-pupil')) { LS.set('mrb-fb-ps', null); try { window.MRB_CLOUD.save(true); } catch (e) { } } }, 8000);

  /* ---------- the Teacher area: live class data (listeners, so refreshing costs only the changes) ---------- */
  const LV = { pupils: null, act: null, classes: null, zreqs: null, un: [], ready: null };
  function startLive(o) {
    if (LV.ready) return LV.ready;
    LV.ready = new Promise((res, rej) => {
      const want = [['pupils', C(o, 'pupils')], ['act', C(o, 'act')], ['classes', C(o, 'classes')], ['zreqs', o.FS.query(C(o, 'zreqs'), o.FS.where('status', '==', 'pending'))]];
      let got = 0;
      want.forEach(([k, ref]) => {
        let first = true;
        LV.un.push(o.FS.onSnapshot(ref, s => { const m = {}; s.forEach(x => { m[x.id] = x.data(); }); news(k, LV[k], m); LV[k] = m; if (first) { first = false; if (++got === want.length) res(); } },
          e => { stopLive(); rej(e); }));
      });
    });
    return LV.ready;
  }
  /* ---------- SIGN-UP UPDATES: while the Teacher area is open, a pop-up (and a count on the tab and the app icon) the moment
     a pupil signs up and waits for approval, an added pupil signs in for the first time, or a pupil asks to open a unit.
     Each is told once (remembered on this device). Emails about sign-ups and requests still come from the old script. */
  const NK = 'mrb-fb-told';
  function news(kind, prev, cur) {
    if (!/teacher\.html$/i.test(location.pathname) || (kind !== 'pupils' && kind !== 'zreqs')) return;
    const told = J(LS.get(NK), {}), lines = [];
    if (kind === 'pupils') Object.keys(cur).forEach(id => {
      const p = cur[id], was = prev && prev[id], nm = `${p.name || p.email || 'A pupil'}${p.cls ? ' (' + p.cls + ')' : ''}`; if (p.mergedInto) return;
      if (p.status === 'pending' && !told['r:' + id]) { told['r:' + id] = now(); lines.push(`${nm} has signed up and is waiting for you to approve them.`); }
      else if (prev && p.acct && p.status === 'approved' && !told['j:' + id] && (was ? !was.acct && !was.mig : true)) { told['j:' + id] = now(); lines.push(`${nm} has signed in for the first time.`); }
    });
    if (kind === 'zreqs') Object.keys(cur).forEach(rid => { const z = cur[rid]; if (told['z:' + rid + z.at]) return; told['z:' + rid + z.at] = now(); lines.push(`${z.name || 'A pupil'}${z.cls ? ' (' + z.cls + ')' : ''} asks to open ${z.zone}.`); });
    const ks = Object.keys(told); if (ks.length > 3000) ks.sort((a, b) => told[a] - told[b]).slice(0, ks.length - 3000).forEach(k => delete told[k]);
    LS.set(NK, JSON.stringify(told));
    setTimeout(badge, 0);
    if (!lines.length) return;
    try { if ('Notification' in window && Notification.permission === 'granted') { const n = new Notification(lines.length === 1 ? 'Revision site' : lines.length + ' updates from the revision site', { body: lines.slice(0, 6).join('\n') + (lines.length > 6 ? `\n…and ${lines.length - 6} more` : ''), icon: SITE + 'app-icons/icon-192.png', tag: 'mrb-signups' }); n.onclick = () => { window.focus(); location.hash = 'visits'; n.close(); }; } } catch (e) { }
    toast(lines);
  }
  function badge() {   // waiting for you: sign-ups and requests, on the tab title and the installed app's icon
    const n = Object.keys(LV.pupils || {}).filter(id => LV.pupils[id].status === 'pending' && !LV.pupils[id].mergedInto).length + Object.keys(LV.zreqs || {}).length;
    document.title = (n ? `(${n}) ` : '') + document.title.replace(/^\(\d+\) /, '');
    try { if (navigator.setAppBadge) { if (n) navigator.setAppBadge(n); else navigator.clearAppBadge(); } } catch (e) { }
  }
  function toast(lines) {
    if (!document.body) return;
    let box = document.getElementById('mrb-news');
    if (!box) { box = document.createElement('div'); box.id = 'mrb-news'; box.setAttribute('role', 'status');
      box.innerHTML = '<style>#mrb-news{position:fixed;right:14px;bottom:14px;z-index:2147483500;max-width:360px;display:flex;flex-direction:column;gap:8px;font:14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif}#mrb-news .n{background:#16213A;color:#fff;border-radius:12px;padding:12px 14px;box-shadow:0 10px 30px rgba(0,0,0,.3);cursor:pointer}#mrb-news .n b{display:block;margin-bottom:2px}</style>';
      document.body.appendChild(box); }
    const n = document.createElement('div'); n.className = 'n'; n.title = 'Open Pupil tracking';
    const b = document.createElement('b'); b.textContent = '🔔 ' + (lines.length === 1 ? 'Revision site' : lines.length + ' updates'); n.append(b);
    lines.slice(0, 5).forEach(t => { const d = document.createElement('div'); d.textContent = t; n.append(d); });
    if (lines.length > 5) { const d = document.createElement('div'); d.textContent = `…and ${lines.length - 5} more`; n.append(d); }
    n.addEventListener('click', () => { location.hash = 'visits'; n.remove(); });
    box.append(n); setTimeout(() => n.remove(), 20000);
  }
  /* once, on a teacher's computer: allow pop-ups for sign-ups (a browser permission, so it needs a tap) */
  function askNotify() {
    if (!/teacher\.html$/i.test(location.pathname) || !('Notification' in window) || Notification.permission !== 'default' || LS.get('mrb-fb-nask') || document.getElementById('mrb-nask') || !document.body) return;
    const d = document.createElement('div'); d.id = 'mrb-nask';
    d.innerHTML = '<style>#mrb-nask{position:fixed;left:14px;bottom:14px;z-index:2147483500;max-width:380px;background:#16213A;color:#fff;border-radius:12px;padding:12px 14px;box-shadow:0 10px 30px rgba(0,0,0,.3);font:14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif}#mrb-nask button{font:inherit;font-weight:700;border:0;border-radius:8px;padding:7px 12px;margin:8px 8px 0 0;cursor:pointer}#mrb-nask .y{background:#fff;color:#16213A}#mrb-nask .x{background:transparent;color:#C9D6F2}</style>' +
      '🔔 <b>Get a pop-up on this computer when a pupil signs up</b> (or asks to open a unit), while the Teacher area is open.<br><button type="button" class="y">Turn on</button><button type="button" class="x">No thanks</button>';
    document.body.appendChild(d);
    d.querySelector('.y').addEventListener('click', () => { LS.set('mrb-fb-nask', '1'); Notification.requestPermission().then(r => { d.remove(); if (r === 'granted') toast(['Pop-ups are on: you’ll see one here when a pupil signs up.']); }); });
    d.querySelector('.x').addEventListener('click', () => { LS.set('mrb-fb-nask', '1'); d.remove(); });
  }
  function stopLive() { LV.un.forEach(f => { try { f(); } catch (e) { } }); LV.un = []; LV.ready = null; LV.pupils = LV.act = LV.classes = LV.zreqs = null; }
  const P = pid => (LV.pupils || {})[pid];
  const resolve = pid => { let k = 0; while (P(pid) && P(pid).mergedInto && k++ < 20) pid = P(pid).mergedInto; return pid; };
  const classList = () => Object.keys(LV.classes || {}).map(c => ({ cls: c, teacher: LV.classes[c].teacher || '', course: LV.classes[c].course || '', zones: zl(LV.classes[c].zones) }));
  const classZones = cls => { const c = (LV.classes || {})[ncls(cls)]; return c ? zl(c.zones) : null; };
  const eff = p => effZones(p, classZones(p.cls));
  function liveList() {
    const A = LV.act || {}, out = [];
    Object.keys(A).forEach(id => { const a = A[id], g = a.ping; if (!g || now() - g.at > LIVE_MS) return; const p = P(id) || {}; out.push({ id, at: g.at, name: p.name || a.name || '', cls: p.cls || a.cls || '', book: g.book, ch: g.ch, pg: g.pg }); });
    return out.sort((a, b) => b.at - a.at);
  }
  async function summary(o) {
    await startLive(o);
    const A = LV.act || {}, wk = ukDay(now() - 6 * 864e5), pupils = [], requests = [], roles = {};
    Object.keys(LV.pupils).forEach(id => {
      const p = LV.pupils[id]; if (p.mergedInto) return;
      if (p.role === 'teacher') roles[id] = 'teacher';
      const a = A[id] || {};
      if (p.status === 'pending') { requests.push({ id, name: p.name || '', cls: p.cls || '', at: p.at || 0, email: p.email || '' }); if (!a.total) return; }
      const days = a.days || {};
      pupils.push({ id, name: p.name || a.name || p.email || id, cls: p.cls || '', typed: Object.keys(a.typed || {}), total: a.total || 0, week: Object.keys(days).filter(d => d >= wk).reduce((s, d) => s + (+days[d] || 0), 0),
        last: a.last || 0, first: a.first || 0, days: Object.keys(days).length, units: a.units || {}, prog: a.prog || undefined, fixed: true, pin: !!(p.acct || p.pin), access: p.status || 'approved',
        email: p.email || '', zones: Array.isArray(p.zones) && p.zones.length ? p.zones : null, ezones: eff(p), unused: !a.total || undefined });
    });
    const zreqs = Object.keys(LV.zreqs || {}).map(rid => { const z = LV.zreqs[rid]; return { rid, id: z.pid, name: z.name, cls: z.cls, zone: z.zone, at: z.at, status: z.status }; });
    autoCopy(o);
    return { pupils, requests, classes: classList(), zreqs, zones: ZONES, live: liveList(), updated: now(), v: SCRIPT_V, mail: null, roles };
  }
  /* the week's report: Monday to Sunday (UK time), with the week before for comparison */
  async function week(o, q) {
    await startLive(o);
    const mon = /^\d{4}-\d{2}-\d{2}$/.test(String(q.start || '')) ? mondayOf(new Date(q.start + 'T12:00:00Z').getTime()) : mondayOf(now()), prev = addDays(mon, -7), sun = addDays(mon, 6);
    const rows = await getQ(o, 'days', ['d', '>=', prev], ['d', '<=', sun]), R = {};
    const get = id => R[id] || (R[id] = { id, name: '', cls: '', secs: 0, prev: 0, days: {}, books: {}, chapters: {}, quizzes: [], prog: {} });
    rows.forEach(([, x]) => {
      const id = resolve(x.pid), p = get(id);
      if (x.d < mon) { p.prev += +x.s || 0; return; }
      p.secs += +x.s || 0; if (x.s) p.days[x.d] = 1;
      Object.keys(x.u || {}).forEach(b => { p.books[b] = (p.books[b] || 0) + (+x.u[b] || 0); });
      Object.keys(x.t || {}).forEach(k => { const v = x.t[k]; p.chapters[k] = (p.chapters[k] || 0) + (+(v && v.s != null ? v.s : v) || 0); });
    });
    Object.keys(LV.act || {}).forEach(id0 => {
      const id = resolve(id0), a = LV.act[id0], p = get(id); if (!a.prog) return;   // everyone who has used the site (so "No revision this week" lists them)
      Object.keys(a.prog).forEach(b => { const g = a.prog[b]; p.prog[b] = [g.cov || 0, g.total || 0]; Object.keys(g.quiz || {}).forEach(k => { const v = g.quiz[k]; if (v[2] >= mon && v[2] <= sun) p.quizzes.push([b, k, v[0], v[1], v[2]]); }); });
    });
    const pupils = Object.keys(R).map(id => { const p = R[id], pp = P(id) || {}; p.name = pp.name || ''; p.cls = pp.cls || ''; p.days = Object.keys(p.days).length;
      p.chapters = Object.keys(p.chapters).map(k => [k, '', p.chapters[k]]).sort((a, b) => b[2] - a[2]); return p; }).filter(p => p.name && !(P(p.id) || {}).mergedInto);
    return { ok: true, start: mon, end: sun, pupils };
  }
  const val = v => v == null ? [0, 0, 0] : typeof v === 'number' ? [v, 0, 0] : [+v.s || 0, +v.l || 0, +v.n || 0];
  async function detail(o, q) {
    await startLive(o);
    const to = resolve(String(q.to || '')); if (!okId(to)) return { ok: false, error: 'bad request' };
    const [rows, progs] = await Promise.all([getQ(o, 'days', ['pid', '==', to]), getQ(o, 'prog', ['pid', '==', to])]);
    const pages = {}, topics = {}, days = {}, uses = [];
    const add = (obj, k, v) => { const x = obj[k] || (obj[k] = [0, 0, 0]); x[0] += v[0]; x[1] = Math.max(x[1], v[1]); x[2] += v[2]; };
    rows.forEach(([, x]) => {
      days[x.d] = (days[x.d] || 0) + (+x.s || 0);
      Object.keys(x.p || {}).forEach(k => add(pages, k, val(x.p[k])));
      Object.keys(x.t || {}).forEach(k => add(topics, k, val(x.t[k])));
      (x.uses || []).forEach(u => { const a = String(u).split(','); uses.push([+a[0], +a[1], a[2], a[3] || '']); });
    });
    uses.sort((a, b) => a[0] - b[0]);
    const sessions = []; let cur = null;
    uses.forEach(([t, s, b, ch]) => { const st = t - s * 1000; if (!cur || st - cur[1] > 20 * 60000) { cur = [st, t, 0, {}, {}]; sessions.push(cur); } cur[1] = Math.max(cur[1], t); cur[2] += s; cur[3][b] = 1; if (b !== 'home' && ch) cur[4][b + '|' + ch] = (cur[4][b + '|' + ch] || 0) + s; });
    const ses = sessions.slice(-40).reverse().map(x => [x[0], x[1], x[2], Object.keys(x[3]), Object.keys(x[4]).sort((a, b) => x[4][b] - x[4][a]).slice(0, 3)]);
    const state = {};
    progs.forEach(([, g]) => { if (!state[g.book] || (g.cov || 0) >= state[g.book].cov) state[g.book] = { cov: g.cov || 0, done: g.done || [], seen: g.seenIds || [], later: g.later || [], pq: g.pq || {}, at: g.at || 0 }; });
    const aw = (P(to) || {}).aw || {}, marked = {}; Object.keys(aw).forEach(k => { marked[k] = aw[k][1]; });
    const a = (LV.act || {})[to] || {};
    return { ok: true, pages, topics, days, first: a.first || 0, last: a.last || 0, devices: 1, sessions: ses, state, marked };
  }
  async function report(o, q) {
    await startLive(o);
    const okD = x => /^\d{4}-\d{2}-\d{2}$/.test(String(x || ''));
    let till = okD(q.till) ? String(q.till) : ukDay(now()), from = okD(q.from) ? String(q.from) : addDays(till, -6);
    if (from > till) { const x = from; from = till; till = x; } if (addDays(from, 31) <= till) from = addDays(till, -30);
    const rows = await getQ(o, 'days', ['d', '>=', from], ['d', '<=', till]), R = {};
    rows.forEach(([, x]) => {
      const id = resolve(x.pid); if (!x.s) return; const pp = P(id) || {};
      const p = R[id] || (R[id] = { id, name: pp.name || '', cls: pp.cls || '', days: {} }), y = p.days[x.d] || (p.days[x.d] = [0, {}, {}]);
      y[0] += +x.s || 0;
      Object.keys(x.t || {}).forEach(k => { if (k.indexOf('home|') !== 0) y[1][k] = (y[1][k] || 0) + val(x.t[k])[0]; });
      Object.keys(x.p || {}).forEach(k => { const i = k.indexOf('|'); if (k.slice(0, i) !== 'home' && /^c\d{1,2}-p\d{1,3}$/.test(k.slice(i + 1))) y[2][k] = (y[2][k] || 0) + val(x.p[k])[0]; });
    });
    return { ok: true, from, till, pupils: Object.keys(R).map(k => R[k]) };
  }
  async function qstats(o) {
    const out = {};
    (await allDocs(o, 'prog')).forEach(([, g]) => {
      const pq = g.pq || {};
      Object.keys(pq).forEach(pg => { const c = String((pq[pg] || [])[5] || ''), a = String((pq[pg] || [])[4] || ''); if (!c) return; const k = g.book + '|' + pg, x = out[k] = out[k] || { n: 0, q: [] }; x.n++;
        c.split('').forEach((ch, i) => { const y = x.q[i] = x.q[i] || [0, 0, {}]; if (ch === '-') return; y[1]++; if (ch === '1') y[0]++; else if (a[i]) y[2][a[i]] = (y[2][a[i]] || 0) + 1; }); });
    });
    return { ok: true, pages: out };
  }
  async function award(o, q) {
    await startLive(o);
    const to = resolve(String(q.to || '')), book = String(q.book || ''), pages = String(q.pages || '').split(',').filter(x => /^c\d{1,2}-p\d{1,3}$/.test(x)), on = q.on === '0' ? 0 : 1;
    if (!okId(to) || BOOKS.indexOf(book) < 0 || !pages.length) return { ok: false, error: 'bad request' };
    const t = now(), aw = {}; pages.forEach(p => { aw[book + '|' + p] = [t, on]; });
    const ops = [['set', 'pupils/' + to, { aw }, true]];
    const g = await getD(o, 'prog/' + to + '_' + book).catch(() => null);
    if (g) {
      const done = new Set(g.done || []); pages.forEach(p => { if (on) done.add(p); else done.delete(p); });
      const d2 = [...done].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), g2 = Object.assign({}, g, { done: d2, cov: d2.length, seenIds: (g.seenIds || []).filter(x => !done.has(x)), later: (g.later || []).filter(x => !done.has(x)) });
      ops.push(['set', 'prog/' + to + '_' + book, g2]); ops.push(['set', 'act/' + to, { prog: { [book]: progSummary(g2) } }, true]);
    }
    await commit(o, ops); return { ok: true, n: pages.length };
  }
  async function decide(o, q, status) {
    const ids = String(q.ids || '').split(',').filter(okId); if (!ids.length) return { ok: false, error: 'bad request' };
    const c = ncls(q.cls), up = { status, decided: now() }; if (status === 'approved' && c) up.cls = c;
    await commit(o, ids.map(id => ['set', 'pupils/' + id, up, true])); return { ok: true };
  }
  async function saveclass(o, q) {
    await startLive(o);
    const c = ncls(q.cls), old = ncls(q.old || q.cls); if (!c) return { ok: false, error: 'give the class a code, e.g. 10A' };
    if (old !== c && (LV.classes || {})[c]) return { ok: false, error: c + ' already exists' };
    const ops = [['set', 'classes/' + c, { teacher: clean(q.teacher, 40), course: clean(q.course, 20), zones: zl(q.zones), at: now() }]];
    if (old !== c) { ops.push(['del', 'classes/' + old]); Object.keys(LV.pupils).forEach(id => { if (ncls(LV.pupils[id].cls) === old) ops.push(['set', 'pupils/' + id, { cls: c }, true]); }); }
    await commit(o, ops); return { ok: true };
  }
  async function setzones(o, q) {
    await startLive(o);
    const ids = String(q.ids || '').split(',').filter(okId); if (!ids.length) return { ok: false, error: 'bad request' };
    const mode = ['add', 'remove'].indexOf(q.mode) >= 0 ? q.mode : 'set', want = zl(q.zones), ops = [], Z = {};
    ids.forEach(id => {
      const p = P(id) || {}; let z;
      if (q.clear === '1') z = null; else if (mode === 'set') z = want;
      else { const cur = eff(p); z = mode === 'add' ? (cur ? [...new Set(cur.concat(want))] : null) : (cur || ZONES).filter(x => want.indexOf(x) < 0); if (mode === 'add' && !cur) return; }
      Z[id] = z; ops.push(['set', 'pupils/' + id, { zones: z }, true]);
    });
    Object.keys(LV.zreqs || {}).forEach(rid => { const r = LV.zreqs[rid]; if (!(r.pid in Z)) return; const p = Object.assign({}, P(r.pid) || {}, { zones: Z[r.pid] }), z = eff(p); if (!z || z.indexOf(r.zone) >= 0) ops.push(['set', 'zreqs/' + rid, { status: 'allowed', decided: now() }, true]); });
    await commit(o, ops); return { ok: true };
  }
  async function zonedecide(o, q) {
    await startLive(o);
    const rid = String(q.rid || ''), r = await getD(o, 'zreqs/' + rid); if (!r) return { ok: false, error: 'not found' };
    const ok = q.ok === '1', ops = [['set', 'zreqs/' + rid, { status: ok ? 'allowed' : 'declined', decided: now() }, true]];
    if (ok) { const p = P(r.pid) || {}, cur = eff(p); if (cur && cur.indexOf(r.zone) < 0) ops.push(['set', 'pupils/' + r.pid, { zones: cur.concat([r.zone]) }, true]); }
    await commit(o, ops); return { ok: true };
  }
  /* SET WORK, TESTS and MESSAGES: the teacher's list (work / tests / msgs), copied into each recipient's inbox document
     (inbox/ALL, inbox/C-11B, inbox/Y-11, inbox/P-<pupil>) so a pupil reads at most four small documents */
  function tokenFor(w) {
    w = String(w || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (!w) return '';
    if (w === 'ALL') return 'ALL';
    const ym = /^Y(\d{1,2})$/.exec(w); if (ym) return 'Y-' + (+ym[1]);
    const pid = Object.keys(LV.pupils || {}).find(id => id.toUpperCase() === w); if (pid) return 'P-' + resolve(pid);
    return 'C-' + w;
  }
  const whoTokens = who => [...new Set(String(who || '').split(',').map(tokenFor).filter(Boolean))];
  async function inboxOps(o, kind, id, toks, item) {   // item null: remove
    return toks.map(t => ['set', 'inbox/' + t, { [kind]: { [id]: item == null ? o.FS.deleteField() : item } }, true]);
  }
  async function work(o) {
    await startLive(o);
    const [W, M] = await Promise.all([allDocs(o, 'work'), allDocs(o, 'msgs')]), A = LV.act || {};
    return { ok: true, work: W.map(([id, w]) => ({ id, who: w.who, book: w.book, ch: w.ch, due: w.due || '', note: w.note || '', at: w.at })).sort((a, b) => a.at - b.at),
      msgs: M.map(([id, m]) => ({ id, to: m.to, text: m.text, at: m.at, read: Object.keys(A).filter(p => A[p].read && A[p].read[id]) })).sort((a, b) => a.at - b.at).slice(-200) };
  }
  async function setwork(o, q) {
    await startLive(o);
    const who = String(q.who || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12), book = String(q.book || ''), ch = String(q.ch || '');
    if (!who || BOOKS.indexOf(book) < 1 || !/^c\d{1,2}$/.test(ch)) return { ok: false, error: 'bad request' };
    const id = 'W' + now().toString(36) + rand(2), w = { who, book, ch, due: String(q.due || '').slice(0, 10), note: clean(q.note, 200), at: now() }, toks = whoTokens(who);
    await commit(o, [['set', 'work/' + id, Object.assign({ toks }, w)]].concat(await inboxOps(o, 'w', id, toks, { book, ch, due: w.due, note: w.note, at: w.at }))); return { ok: true, id };
  }
  async function delwork(o, q) { const id = String(q.wid || ''), w = await getD(o, 'work/' + id); if (!w) return { ok: true }; await commit(o, [['del', 'work/' + id]].concat(await inboxOps(o, 'w', id, w.toks || [], null))); return { ok: true }; }
  async function sendmsg(o, q) {
    await startLive(o);
    const text = clean(q.text, 500), list = String(q.ids || '').split(',').filter(okId);
    const to = list.length ? [...new Set(list.map(x => x.toUpperCase()))].join(',') : String(q.to || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24);
    if (!to || !text) return { ok: false, error: 'bad request' };
    const id = 'M' + now().toString(36) + rand(2), toks = whoTokens(to), at = now();
    await commit(o, [['set', 'msgs/' + id, { to, text, at, toks }]].concat(await inboxOps(o, 'm', id, toks, { text, at }))); return { ok: true, id };
  }
  async function delmsg(o, q) { const id = String(q.mid || ''), m = await getD(o, 'msgs/' + id); if (!m) return { ok: true }; await commit(o, [['del', 'msgs/' + id]].concat(await inboxOps(o, 'm', id, m.toks || [], null))); return { ok: true }; }
  async function tests(o) {
    const [T, R] = await Promise.all([allDocs(o, 'tests'), allDocs(o, 'tres')]);
    const keys = {}; await Promise.all([...new Set(R.map(([, r]) => r.book + ':' + r.ch))].map(async k => { const [b, c] = k.split(':'); keys[k] = await testKey(b, c); }));
    return { ok: true, tests: T.map(([id, t]) => ({ id, who: t.who, book: t.book, ch: t.ch, title: t.title || '', due: t.due || '', note: t.note || '', at: t.at })).sort((a, b) => a.at - b.at),
      results: R.map(([, r]) => { const key = keys[r.book + ':' + r.ch]; return { tid: r.tid, id: resolve(r.pid), name: r.name, cls: r.cls, book: r.book, ch: r.ch, score: key && r.ans ? mark(r.ans, key) : +r.score || 0, of: key ? key.length : +r.of || 100, min: r.min || 0, at: r.at }; }) };
  }
  async function testres(o, q) {
    const b = String(q.book || ''), c = String(q.ch || ''), [R, key] = await Promise.all([getQ(o, 'tres', ['book', '==', b], ['ch', '==', c]), testKey(b, c)]);
    return { ok: true, results: R.map(([, r]) => ({ id: resolve(r.pid), name: r.name, cls: r.cls, score: key && r.ans ? mark(r.ans, key) : +r.score || 0, of: key ? key.length : +r.of || 100, ans: r.ans || '', min: r.min || 0, at: r.at })) };
  }
  async function settest(o, q) {
    await startLive(o);
    const book = String(q.book || ''), ch = String(q.ch || ''), list = String(q.ids || '').split(',').filter(okId);
    const who = list.length ? [...new Set(list.map(x => x.toUpperCase()))].join(',') : String(q.who || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    if (!who || BOOKS.indexOf(book) < 1 || !/^c\d{1,2}$/.test(ch)) return { ok: false, error: 'bad request' };
    const id = 'T' + now().toString(36) + rand(2), t = { who, book, ch, title: clean(q.title, 80), due: String(q.due || '').slice(0, 10), note: clean(q.note, 200), at: now() }, toks = whoTokens(who);
    await commit(o, [['set', 'tests/' + id, Object.assign({ toks }, t)]].concat(await inboxOps(o, 't', id, toks, { book, ch, title: t.title, due: t.due, note: t.note }))); return { ok: true, id };
  }
  async function deltest(o, q) { const id = String(q.tid || ''), t = await getD(o, 'tests/' + id); if (!t) return { ok: true }; await commit(o, [['del', 'tests/' + id]].concat(await inboxOps(o, 't', id, t.toks || [], null))); return { ok: true }; }
  async function comps(o) {
    const [R, E] = await Promise.all([allDocs(o, 'comps'), allDocs(o, 'centries')]);
    return { ok: true, houses: HOUSES, runs: R.map(([id, r]) => ({ id, comp: r.comp, title: r.title, years: r.years, cat: r.cat, opens: r.opens, closes: r.closes, note: r.note || '', at: r.at })),
      entries: E.map(([id, e]) => ({ id, rid: e.rid, pid: e.pid ? resolve(e.pid) : '', name: e.name, cls: e.cls, house: e.house || '', title: e.title || '', link: e.link || '', img: !!e.img, text: e.text || '', at: e.at, scores: e.scores || '', total: e.total == null || e.total === '' ? null : +e.total, place: +e.place || 0, notes: e.notes || '' })) };
  }
  async function compimg(o, q) { const x = await getD(o, 'cimg/' + String(q.eid || '')).catch(() => null); return x && x.src ? { ok: true, src: x.src } : { ok: false }; }
  async function setcomp(o, q) {
    const years = String(q.years || '').split(',').map(Number).filter(y => y >= 8 && y <= 14);
    if (!years.length || !/^[a-z0-9-]{3,60}$/.test(String(q.comp || '')) || !/^\d{4}-\d\d-\d\d$/.test(String(q.closes || ''))) return { ok: false, error: 'bad request' };
    const id = 'C' + now().toString(36) + rand(2);
    await o.FS.setDoc(D(o, 'comps/' + id), { comp: String(q.comp), title: clean(q.title, 80), years: years.join(','), cat: ['Bronze', 'Silver', 'Gold', 'Platinum'].indexOf(String(q.cat)) >= 0 ? String(q.cat) : 'Silver', opens: String(q.opens || ukDay(now())).slice(0, 10), closes: String(q.closes).slice(0, 10), note: clean(q.note, 300), at: now() });
    return { ok: true, id };
  }
  async function editcomp(o, q) {
    const id = String(q.rid || ''), r = await getD(o, 'comps/' + id); if (!r) return { ok: false };
    const u = {}; if (q.closes) u.closes = String(q.closes).slice(0, 10); if (q.opens) u.opens = String(q.opens).slice(0, 10); if (q.cat) u.cat = String(q.cat);
    await o.FS.updateDoc(D(o, 'comps/' + id), u); return { ok: true };
  }
  async function judge(o, q) {
    const id = String(q.eid || ''), e = await getD(o, 'centries/' + id); if (!e) return { ok: false };
    const u = { scores: String(q.scores || '').slice(0, 300), total: q.total === '' || q.total == null ? null : Math.max(0, Math.min(1000, +q.total || 0)), place: Math.max(0, Math.min(4, +q.place || 0)), notes: clean(q.notes, 500) };
    if (HOUSES.indexOf(String(q.house)) >= 0) u.house = String(q.house);
    await o.FS.updateDoc(D(o, 'centries/' + id), u); return { ok: true };
  }
  async function pdata(o, q) { const to = resolve(String(q.to || '')); if (!okId(to)) return { ok: false, error: 'bad request' }; const s = await getD(o, 'psave/' + to); return { ok: true, updated: s ? s.updated : 0, data: s ? s.data : '' }; }
  async function setrole(o, q) {
    await startLive(o);
    if (!ownerUser(o)) return { ok: false, error: 'Only Mr Butler’s own Google sign-in can make or remove teachers.' };
    const role = q.role === 'teacher' ? 'teacher' : '', ids = String(q.ids || '').split(',').map(x => resolve(x.trim())).filter(okId);
    if (!ids.length) return { ok: false, error: 'bad request' };
    await commit(o, ids.map(id => ['set', 'pupils/' + id, { role }, true])); return { ok: true };
  }

  /* ---------- accounts: merging, matching emails, class lists, adding pupils, PINs ---------- */
  const rank = p => (p.teacher ? 8 : 0) + (p.email ? 4 : 0) + (p.status === 'approved' ? 2 : 0);
  const best = L => L.slice().sort((a, b) => rank(b) - rank(a) || (b.total || 0) - (a.total || 0))[0];
  function accounts() {
    const A = LV.act || {};
    return Object.keys(LV.pupils).filter(id => !LV.pupils[id].mergedInto).map(id => { const p = LV.pupils[id];
      return { id, name: p.name || '', cls: p.cls || '', total: (A[id] || {}).total || 0, status: p.status || 'approved', teacher: p.role === 'teacher', email: p.email || '', key: nameKey(p.name), yr: yearOf(p.cls) }; })
      .filter(p => p.key.split(' ').length >= 2);
  }
  function mergeObj(a, b) {   // the same rules as the site's mergeInto: progress from both, best quiz scores, every trophy
    Object.keys(b || {}).forEach(k => {
      if (!/^notes-/.test(k) || /^notes-(nocount|counted)/.test(k) || typeof b[k] !== 'string') return;
      if (a[k] == null) { a[k] = b[k]; return; }
      const x = J(a[k], null), y = J(b[k], null); if (!x || !y || typeof x !== 'object' || typeof y !== 'object') return;
      if (/^notes-reader:/.test(k)) { ['done', 'seen', 'ans'].forEach(f => { x[f] = Object.assign({}, y[f] || {}, x[f] || {}); }); x.steps = x.steps || {}; Object.keys(y.steps || {}).forEach(s => { x.steps[s] = [...new Set([...(x.steps[s] || []), ...(y.steps[s] || [])])]; }); if (!x.last && y.last) x.last = y.last; }
      else if (/^notes-chquiz:/.test(k)) { x.best = x.best || {}; Object.keys(y.best || {}).forEach(q => { if (!x.best[q] || (y.best[q] && y.best[q].pc > x.best[q].pc)) x.best[q] = y.best[q]; }); x.open = Object.assign({}, y.open || {}, x.open || {}); }
      else if (/^notes-trophy:/.test(k)) x.earned = Object.assign({}, y.earned || {}, x.earned || {});
      else return;
      a[k] = JSON.stringify(x);
    });
    return a;
  }
  /* MERGE: M maps each merged pupil to the one kept. Time, progress, page marks, test results, competition entries, zone
     requests, approval, zones, teacher role, messages and saved progress move to the kept pupil. Each merged account's
     PIN still works: it signs in as the kept pupil (its pupils document says mergedInto). */
  async function mergeMap(o, M) {
    await startLive(o);
    Object.keys(M).forEach(f => { let t = M[f], k = 0; while (M[t] && k++ < 20) t = M[t]; M[f] = resolve(t); });
    Object.keys(M).forEach(f => { if (!okId(f) || !okId(M[f]) || f === M[f] || !P(f)) delete M[f]; });
    const from = Object.keys(M); if (!from.length) return { ok: true, merged: 0 };
    const ops = [], A = LV.act || {}, own = ownerUser(o);
    for (const f of from) {
      const t = M[f], pf = P(f) || {}, pt = Object.assign({}, P(t) || {});
      ops.push(['set', 'pupils/' + f, { mergedInto: t }, true]);
      Object.keys(LV.pupils).forEach(id => { if (LV.pupils[id].mergedInto === f) ops.push(['set', 'pupils/' + id, { mergedInto: t }, true]); });
      const up = {}, aw = Object.assign({}, pf.aw || {});
      Object.keys(pt.aw || {}).forEach(k => { if (!aw[k] || pt.aw[k][0] >= aw[k][0]) aw[k] = pt.aw[k]; });
      if (Object.keys(aw).length) up.aw = aw;
      if (pt.status !== 'approved' && (pf.status || 'approved') === 'approved') up.status = 'approved';
      if (!(Array.isArray(pt.zones) && pt.zones.length) && Array.isArray(pf.zones) && pf.zones.length) up.zones = pf.zones;
      if (pf.role === 'teacher' && pt.role !== 'teacher' && own) up.role = 'teacher';
      if (!pt.email && pf.email) up.email = pf.email;
      if (PROV_RE.test(pt.name || '') && pf.name && !PROV_RE.test(pf.name)) { up.name = pf.name; up.prov = false; }
      if (Object.keys(up).length) ops.push(['set', 'pupils/' + t, up, true]);
      // time and progress
      const af = A[f], at = A[t] || {};
      if (af) {
        const n = { total: (at.total || 0) + (af.total || 0), first: Math.min(at.first || Infinity, af.first || Infinity), last: Math.max(at.last || 0, af.last || 0), units: Object.assign({}, at.units), days: Object.assign({}, at.days), typed: Object.assign({}, af.typed, at.typed), prog: Object.assign({}, af.prog, at.prog), read: Object.assign({}, af.read, at.read) };
        if (n.first === Infinity) n.first = 0;
        Object.keys(af.units || {}).forEach(k => { n.units[k] = (n.units[k] || 0) + af.units[k]; });
        Object.keys(af.days || {}).forEach(k => { n.days[k] = (n.days[k] || 0) + af.days[k]; });
        Object.keys(af.prog || {}).forEach(b => { if (!(at.prog || {})[b] || (af.prog[b].cov || 0) > (at.prog[b].cov || 0)) n.prog[b] = af.prog[b]; });
        ops.push(['set', 'act/' + t, Object.assign({ name: pt.name || af.name || '', cls: pt.cls || af.cls || '' }, n), true]); ops.push(['del', 'act/' + f]);
      }
      const [dys, prg, trs, ces, zrs, svs] = await Promise.all([getQ(o, 'days', ['pid', '==', f]), getQ(o, 'prog', ['pid', '==', f]), getQ(o, 'tres', ['pid', '==', f]), getQ(o, 'centries', ['pid', '==', f]), getQ(o, 'zreqs', ['pid', '==', f]), Promise.all([getD(o, 'psave/' + f), getD(o, 'psave/' + t)])]);
      dys.forEach(([id]) => ops.push(['set', 'days/' + id, { pid: t }, true]));
      for (const [id, g] of prg) { const tg = await getD(o, 'prog/' + t + '_' + g.book).catch(() => null); if (!tg || (g.cov || 0) > (tg.cov || 0)) ops.push(['set', 'prog/' + t + '_' + g.book, Object.assign({}, g, { pid: t })]); ops.push(['del', 'prog/' + id]); }
      trs.forEach(([id]) => ops.push(['set', 'tres/' + id, { pid: t }, true]));
      ces.forEach(([id]) => ops.push(['set', 'centries/' + id, { pid: t }, true]));
      zrs.forEach(([id]) => ops.push(['set', 'zreqs/' + id, { pid: t }, true]));
      if (svs[0] && svs[0].data) { const base = J(svs[1] && svs[1].data || '{}', {}); mergeObj(base, J(svs[0].data, {})); const data = JSON.stringify(base); if (data.length <= 450000) ops.push(['set', 'psave/' + t, { data, updated: now() }]); ops.push(['del', 'psave/' + f]); }
      const ib = await getD(o, 'inbox/P-' + f).catch(() => null);
      if (ib) { ops.push(['set', 'inbox/P-' + t, ib, true]); ops.push(['del', 'inbox/P-' + f]); }
    }
    await commit(o, ops);
    return { ok: true, merged: from.length };
  }
  async function merge(o, q) {
    await startLive(o);
    const to = String(q.to || ''), ids = String(q.ids || '').split(',').filter(okId); if (!okId(to) || !ids.length) return { ok: false, error: 'bad request' };
    const M = {}; ids.filter(x => x !== to).forEach(f => { M[f] = to; }); await mergeMap(o, M);
    if (q.name) await o.FS.setDoc(D(o, 'pupils/' + resolve(to)), Object.assign({ name: cleanName(q.name), prov: false }, q.cls ? { cls: ncls(q.cls) } : {}), { merge: true });
    return { ok: true };
  }
  async function dedupe(o) {
    await startLive(o);
    const all = accounts().filter(p => !(p.email && p.status !== 'approved')), by = {}; all.forEach(p => { (by[p.key] = by[p.key] || []).push(p); });
    const M = {}; let groups = 0;
    Object.keys(by).forEach(k => { const L = by[k]; if (L.length < 2) return;
      const yrs = [...new Set(L.filter(p => p.yr).map(p => p.yr))], G = {};
      L.forEach(p => { const y = p.yr || (yrs.length === 1 ? yrs[0] : 0); if (!y && yrs.length > 1) return; (G[y] = G[y] || []).push(p); });
      Object.keys(G).forEach(y => { const g = G[y]; if (g.length < 2 || new Set(g.filter(p => p.email).map(p => p.email)).size > 1) return; const keep = best(g); g.forEach(p => { if (p.id !== keep.id) M[p.id] = keep.id; }); groups++; }); });
    const r = await mergeMap(o, M); return { ok: true, groups, merged: r.merged || 0 };
  }
  /* point a school email at a pupil (and drop their old email's look-up) */
  function emailOps(o, id, email) {
    const p = P(id) || {}, ops = [];
    if (p.email && p.email !== email) ops.push(['del', 'emails/' + p.email]);
    ops.push(['set', 'pupils/' + id, { email }, true]);
    ops.push(['set', 'emails/' + email, p.acct ? { pid: id, acct: p.acct } : p.mig ? { pid: id, m: 1 } : { pid: id }]);
    return ops;
  }
  async function setemail(o, q) {
    await startLive(o);
    const id = resolve(String(q.to || '')), email = nem(q.email); if (!okId(id)) return { ok: false, error: 'bad request' };
    if (!EMAIL_RE.test(email)) return { ok: false, error: 'That isn’t a @c2ken.net email.' };
    const e = await getD(o, 'emails/' + email);
    if (e && resolve(e.pid) !== id) {
      const other = resolve(e.pid), op = P(other) || {}, used = ((LV.act || {})[other] || {}).total > 0;
      if (used) return { ok: false, error: `That email belongs to ${op.name || 'another pupil'}${op.cls ? ' (' + op.cls + ')' : ''}, who has used the Revision Guide. If they are the same person, select both and use Merge.` };
      await mergeMap(o, { [other]: id });
      await commit(o, [['set', 'pupils/' + id, { email }, true], ['set', 'emails/' + email, e, false]]);
      return { ok: true, msg: `Email saved. The unused account that had it${op.name ? ' (' + op.name + ')' : ''} has been joined to this one.` };
    }
    await commit(o, emailOps(o, id, email)); return { ok: true };
  }
  async function newPinFor(o, id, pin) {   // a new Firebase account with this PIN; the old one stops working
    const p = P(id) || await getD(o, 'pupils/' + id) || {};
    const acct = await teacherAccount(o, id, (p.gen || genOf(p.acct)) + 1, pin);
    const ops = [['set', 'pupils/' + id, { acct, gen: genOf(acct), resetPin: false, mig: false, pin: true }, true]];
    if (p.email) ops.push(['set', 'emails/' + p.email, { pid: id, acct }]);
    await commit(o, ops); return acct;
  }
  /* "Email a new PIN": the old Google script still emails pupils (it makes the PIN and keeps it in the sheet); the pupil's next
     sign-in checks it there once and their new Firebase account is made. A pupil the sheet doesn't know: a new PIN is made
     here and shown to you to pass on. */
  async function sendpin(o, q) {
    await startLive(o);
    const ids = [...new Set(String(q.ids || q.to || '').split(',').filter(okId).map(resolve))]; if (!ids.length) return { ok: false, error: 'bad request' };
    const none = ids.filter(id => !(P(id) || {}).email).map(id => (P(id) || {}).name || id), withE = ids.filter(id => (P(id) || {}).email);
    let emailed = [], shown = [];
    const key = legacyKey();
    if (key && withE.length) {
      const j = await legacy('sendpin', { key, ids: withE.join(',') });
      if (j && j.sent) {
        const bad = new Set([].concat(j.none || [], j.fail || []));
        emailed = withE.filter(id => !bad.has((P(id) || {}).name) && !bad.has((P(id) || {}).email));
        const ops = []; emailed.forEach(id => { const p = P(id); ops.push(['set', 'pupils/' + id, { acct: null, mig: true, resetPin: false, pin: true }, true]); ops.push(['set', 'emails/' + p.email, { pid: id, m: 1 }]); });
        await commit(o, ops);
      }
    }
    for (const id of withE.filter(x => emailed.indexOf(x) < 0)) { const pin = newPin(); await newPinFor(o, id, pin); shown.push(`${(P(id) || {}).name || id}: ${pin}`); }
    const msg = (emailed.length ? `Emailed a new PIN to ${emailed.length} pupil${emailed.length === 1 ? '' : 's'}.` : '') + (shown.length ? ` New PIN${shown.length === 1 ? '' : 's'} (couldn’t be emailed, so pass ${shown.length === 1 ? 'it' : 'them'} on): ${shown.join(', ')}.` : '') + (none.length ? ` No school email for ${none.join(', ')}: add one with Name & email first.` : '');
    if (shown.length) try { setTimeout(() => alert(msg.trim()), 50); } catch (e) { }
    return { ok: emailed.length + shown.length > 0, sent: emailed.length + shown.length, none, msg: msg.trim(), error: emailed.length + shown.length ? undefined : msg.trim() };
  }
  async function resetpin(o, q) {
    await startLive(o);
    const id = resolve(String(q.to || '')); if (!okId(id)) return { ok: false, error: 'bad request' };
    const p = P(id) || {}, ops = [['set', 'pupils/' + id, p.acct ? { resetPin: true } : { resetPin: true, mig: false }, true]];
    if (p.email) ops.push(['set', 'emails/' + p.email, p.acct ? { pid: id, acct: p.acct, r: 1 } : { pid: id }]);
    await commit(o, ops); return { ok: true };
  }
  async function rename(o, q) {
    const id = resolve(String(q.to || '')); if (!okId(id) || !q.name) return { ok: false, error: 'bad request' };
    await o.FS.setDoc(D(o, 'pupils/' + id), Object.assign({ name: cleanName(q.name), prov: false }, q.cls != null ? { cls: ncls(q.cls) } : {}), { merge: true }); return { ok: true };
  }
  async function allocate(o, q) {
    const c = ncls(q.cls), ids = String(q.ids || '').split(',').filter(okId); if (!c || !ids.length) return { ok: false, error: 'bad request' };
    await commit(o, ids.map(id => ['set', 'pupils/' + id, { cls: c }, true])); return { ok: true };
  }
  async function del(o, q) {
    await startLive(o);
    const ids = String(q.ids || '').split(',').filter(okId); if (!ids.length) return { ok: false, error: 'bad request' };
    const ops = [];
    for (const id of ids) {
      const p = P(id) || {};
      const [dys, prg, zrs, trs] = await Promise.all([getQ(o, 'days', ['pid', '==', id]), getQ(o, 'prog', ['pid', '==', id]), getQ(o, 'zreqs', ['pid', '==', id]), getQ(o, 'tres', ['pid', '==', id])]);
      [['days', dys], ['prog', prg], ['zreqs', zrs], ['tres', trs]].forEach(([c, L]) => L.forEach(([x]) => ops.push(['del', c + '/' + x])));
      ops.push(['del', 'act/' + id], ['del', 'psave/' + id], ['del', 'pupils/' + id], ['del', 'inbox/P-' + id]);
      if (p.email) ops.push(['del', 'emails/' + p.email]);
      Object.keys(LV.pupils).forEach(x => { if (LV.pupils[x].mergedInto === id) ops.push(['del', 'pupils/' + x]); });
    }
    ops.push(['set', 'config/deleted', { ids: Object.fromEntries(ids.map(id => [id, now()])) }, true]);
    await commit(o, ops); return { ok: true, removed: ids.length };
  }
  async function addpupil(o, q) {
    await startLive(o);
    const email = nem(q.email), nm = cleanName(q.name), cl = ncls(q.cls), pin = String(q.pin || '');
    if (words(nm) < 2) return { ok: false, error: 'give their first name and surname' };
    if (!EMAIL_RE.test(email)) return { ok: false, error: 'give their school email (it ends in @c2ken.net)' };
    if (pin && !/^\d{4}$/.test(pin)) return { ok: false, error: 'a PIN is 4 digits' };
    const e = await getD(o, 'emails/' + email); if (e) { const op = P(resolve(e.pid)); return { ok: false, error: `${email} already belongs to ${op ? op.name : 'a pupil'}` }; }
    const yr = yearOf(cl), hits = accounts().filter(p => p.key === nameKey(nm) && !p.email && (!yr || !p.yr || p.yr === yr));
    let id, linked = false;
    if (hits.length) { const keep = best(hits), M = {}; hits.forEach(p => { if (p.id !== keep.id) M[p.id] = keep.id; }); await mergeMap(o, M); id = keep.id; linked = true; }
    else id = 'e' + rand(8).slice(0, 15);
    const cur = P(id) || {};
    await commit(o, [['set', 'pupils/' + id, Object.assign({ name: nm, cls: cl, status: 'approved', email, prov: false }, cur.at ? {} : { at: now(), pin: false, gen: 0, acct: null }), true]]);
    LV.pupils[id] = Object.assign({}, cur, { name: nm, cls: cl, email, acct: cur.acct || null });
    await commit(o, [['set', 'emails/' + email, cur.acct ? { pid: id, acct: cur.acct } : cur.mig ? { pid: id, m: 1 } : { pid: id }]]);
    let tail = '';
    if (pin) { await newPinFor(o, id, pin); tail = ' They sign in with their email and the PIN you chose.'; }
    else if (q.send === '1') { const r = await sendpin(o, { ids: id }); tail = r.ok ? ' ' + r.msg : ' They choose a PIN the first time they sign in with their email.'; }
    else tail = ' They choose a PIN the first time they sign in with their email.';
    return { ok: true, id, linked, sent: q.send === '1', msg: `${nm} added${linked ? ' (joined to the account they already had)' : ''}.${tail}` };
  }
  const letters = s => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
  async function addemails(o, q) {
    await startLive(o);
    const L = J(String(q.emails || '[]'), null); if (!Array.isArray(L)) return { ok: false, error: 'bad list' };
    const cl = ncls(q.cls), yr = yearOf(cl), have = {}; Object.keys(LV.pupils).forEach(id => { const p = LV.pupils[id]; if (p.email) have[p.email] = id; });
    const acc = accounts().filter(p => !p.email && !p.teacher), out = [], M = {}, ops = [];
    L.slice(0, 200).forEach(raw => {
      const e = nem(raw), m = /^([a-z])([a-z'-]+?)\d*@c2ken\.net$/.exec(e);
      if (!EMAIL_RE.test(e) || !m) { out.push({ email: String(raw).slice(0, 80), result: 'invalid' }); return; }
      if (have[e]) { const k = resolve(have[e]); if (cl) ops.push(['set', 'pupils/' + k, { cls: cl, status: 'approved' }, true]); out.push({ email: e, result: 'already', name: (P(k) || {}).name || '' }); return; }
      const ini = m[1], sur = letters(m[2]);
      const fits = p => { const t = String(p.name || '').split(/\s+/).filter(Boolean); if (t.length < 2 || M[p.id] || p.taken) return false;
        const a = letters(t[0])[0] === ini && (letters(t[t.length - 1]) === sur || letters(t.slice(1).join('')) === sur), b = letters(t[t.length - 1])[0] === ini && letters(t.slice(0, -1).join('')) === sur; return a || b; };
      let hits = acc.filter(fits); if (yr && hits.some(p => p.yr === yr)) hits = hits.filter(p => p.yr === yr || !p.yr);
      if ([...new Set(hits.map(p => p.key + '|' + (p.yr || '')))].length > 1) { out.push({ email: e, result: 'ambiguous', names: [...new Set(hits.map(p => p.name + (p.cls ? ' (' + p.cls + ')' : '')))] }); return; }
      let id, result, name;
      if (hits.length) { const keep = best(hits); hits.forEach(p => { if (p.id !== keep.id) M[p.id] = keep.id; }); id = keep.id; result = 'matched'; name = keep.name; keep.taken = 1; if (cl) ops.push(['set', 'pupils/' + id, { cls: cl }, true]); }
      else { id = 'e' + rand(8).slice(0, 15); result = 'created';
        const surname = m[2].replace(/(^|[-'])([a-z])/g, (x, s1, c2) => s1 + c2.toUpperCase()).replace(/^Mc([a-z])/, (x, c) => 'Mc' + c.toUpperCase()); name = ini.toUpperCase() + '. ' + surname;
        ops.push(['set', 'pupils/' + id, { name, cls: cl, status: 'approved', at: now(), email: e, acct: null, gen: 0, pin: false, prov: true }]); LV.pupils[id] = { name, cls: cl, status: 'approved', email: e }; }
      have[e] = id; ops.push(['set', 'pupils/' + id, { email: e, status: 'approved' }, true]);
      const p = P(id) || {}; ops.push(['set', 'emails/' + e, p.acct ? { pid: id, acct: p.acct } : p.mig ? { pid: id, m: 1 } : { pid: id }]);
      out.push({ email: e, result, id, name });
    });
    if (cl && !(LV.classes || {})[cl]) ops.push(['set', 'classes/' + cl, { teacher: '', course: '', zones: [], at: now() }]);   // a new class or set: shown in Classes & zones (add its teacher there)
    const r = await mergeMap(o, M); await commit(o, ops);
    return { ok: true, merged: r.merged || 0, rows: out };
  }
  async function importlist(o, q) {
    await startLive(o);
    const L = J(String(q.rows || '[]'), null); if (!Array.isArray(L)) return { ok: false, error: 'bad list' };
    const cur = {}; (await allDocs(o, 'clist')).forEach(([e]) => { cur[e] = 1; });
    let added = 0, updated = 0, bad = 0; const ops = [];
    L.slice(0, 400).forEach(x => { const e = nem(x && x.email), nm = cleanName(x && x.name), cl = ncls(x && x.cls);
      if (!EMAIL_RE.test(e) || words(nm) < 2) { bad++; return; }
      ops.push(['set', 'clist/' + e, { name: nm, cls: cl, at: now() }]); if (cur[e]) updated++; else { added++; cur[e] = 1; } });
    await commit(o, ops);
    return Object.assign({ ok: true, added, updated, bad }, await matchList(o));
  }
  /* every listed email is matched to its pupil's account by name and year (duplicates merged), and that pupil is approved
     with the name and class from the list */
  async function matchList(o) {
    const LI = {}; (await allDocs(o, 'clist')).forEach(([e, x]) => { LI[e] = x; });
    const have = {}; Object.keys(LV.pupils).forEach(id => { const p = LV.pupils[id]; if (p.email && !p.mergedInto) have[p.email] = id; });
    const acc = accounts(), M = {}, links = []; let waiting = 0, linked = 0;
    Object.keys(LI).forEach(e => { const li = LI[e];
      if (have[e]) { links.push([have[e], e, li]); return; }
      const key = nameKey(li.name), yr = yearOf(li.cls), hits = acc.filter(p => p.key === key && !p.taken && !M[p.id] && !(p.email && p.email !== e) && (!yr || !p.yr || p.yr === yr));
      if (!hits.length) { waiting++; return; }
      const keep = best(hits); hits.forEach(p => { if (p.id !== keep.id) M[p.id] = keep.id; }); keep.taken = 1; links.push([keep.id, e, li]); linked++; });
    const r = await mergeMap(o, M), ops = [];
    links.forEach(([id, e, li]) => { const k = resolve(M[id] || id); if (!have[e]) ops.push(...emailOps(o, k, e)); ops.push(['set', 'pupils/' + k, Object.assign({ status: 'approved', prov: false }, li.name ? { name: li.name } : {}, li.cls ? { cls: li.cls } : {}), true]); });
    await commit(o, ops);
    return { linked, merged: r.merged || 0, waiting };
  }
  async function classlist(o) {
    await startLive(o);
    const have = {}; Object.keys(LV.pupils).forEach(id => { const p = LV.pupils[id]; if (p.email && !p.mergedInto) have[p.email] = id; });
    return { ok: true, list: (await allDocs(o, 'clist')).map(([e, x]) => ({ email: e, name: x.name, cls: x.cls, id: have[e] || '' })) };
  }
  async function dellist(o, q) { const c = ncls(q.cls); await commit(o, (await allDocs(o, 'clist')).filter(([, x]) => !c || ncls(x.cls) === c).map(([e]) => ['del', 'clist/' + e])); return { ok: true }; }

  /* ---------- one-off: copy everything across from the Google Sheet (Teacher area › Pupil tracking › ⋯) ----------
     Safe to run again: pupils who already have their Firebase account keep it; their history isn't copied twice. */
  async function migrate(log, opts) {
    log = log || (() => { }); opts = opts || {};
    const o = await ready();
    if (!googleTeacher(o)) throw new Error('Sign in with Google first (the bar at the top of the Teacher area).');
    const key = legacyKey(); if (!key) throw new Error('This device needs the teacher key (TEACHER_KEY) from the Apps Script: type it in Pupil tracking first.');
    const lg = (params, post) => legacy(params.action || '', Object.assign({ key }, params), post ? { kind: 'teacher', q: Object.assign({ key }, params) } : null);
    log('Reading the Google Sheet (this can take a minute)…');
    const sum = await realFetch(LEGACY + '?key=' + encodeURIComponent(key) + '&fresh=1&t=' + now(), { cache: 'no-store', credentials: 'omit' }).then(r => r.json());
    if (!sum || sum.error) throw new Error('The Google script said: ' + ((sum && sum.error) || 'no reply') + (sum && sum.error === 'key' ? ' (wrong teacher key)' : ''));
    await startLive(o);
    const done = await getD(o, 'config/migration').catch(() => null) || {}, gone = (await getD(o, 'config/deleted').catch(() => null) || {}).ids || {};   // pupils deleted here: not copied back
    const ops = [], seen = {}, pupils = (sum.pupils || []).concat((sum.requests || []).map(r => ({ id: r.id, name: r.name, cls: r.cls, access: 'pending', email: r.email || '', at: r.at, pin: true, total: 0 })));
    const roles = sum.roles || {};
    let skipped = 0;
    pupils.forEach(p => {
      const id = String(p.id); if (!okId(id) || seen[id] || gone[id]) return; seen[id] = 1;
      if (id !== id.toLowerCase()) console.warn('[mrb] pupil ID with capitals', id);
      const had = LV.pupils[id];
      if (had && (had.acct || had.mergedInto)) { skipped++; return; }   // already signed in on Firebase: keep what's there
      const email = nem(p.email), st = had && had.status && had.status !== 'pending' ? had.status : (p.access || 'approved');
      ops.push(['set', 'pupils/' + id, { name: p.name || '', cls: ncls(p.cls), status: st, at: p.first || p.at || now(), email: EMAIL_RE.test(email) ? email : '', acct: null, gen: 0, pin: !!p.pin, mig: !!p.pin, zones: Array.isArray(p.zones) && p.zones.length ? p.zones : null, role: roles[id] === 'teacher' ? 'teacher' : '', prov: PROV_RE.test(p.name || '') }, true]);
      if (EMAIL_RE.test(email)) ops.push(['set', 'emails/' + email, p.pin ? { pid: id, m: 1 } : { pid: id }]);
    });
    (sum.classes || []).forEach(c => ops.push(['set', 'classes/' + ncls(c.cls), { teacher: c.teacher || '', course: c.course || '', zones: zl(c.zones), at: now() }]));
    (sum.zreqs || []).forEach(z => ops.push(['set', 'zreqs/' + z.id + '_' + z.zone, { pid: z.id, name: z.name, cls: z.cls, zone: z.zone, at: z.at, status: 'pending' }]));
    log(`Found ${pupils.length} pupils and sign-up requests, ${(sum.classes || []).length} classes.`);
    const cl = await lg({ action: 'classlist' }); (cl && cl.list || []).forEach(x => { const e = nem(x.email); if (EMAIL_RE.test(e)) ops.push(['set', 'clist/' + e, { name: x.name, cls: ncls(x.cls), at: now() }]); });
    await commit(o, ops.splice(0)); log('Pupils, classes and class lists copied.');
    // history: time per day, progress, saved progress, page marks (once)
    if (!done.history || opts.history) {
      const ids = Object.keys(seen).filter(id => { const h = LV.pupils[id]; return !(h && (h.acct || h.mergedInto)); }), byId = {}; pupils.forEach(p => { byId[p.id] = p; });
      const firsts = pupils.map(p => p.first).filter(Boolean), start = firsts.length ? ukDay(Math.min(...firsts)) : addDays(ukDay(now()), -30);
      const DAYS = {};
      for (let till = ukDay(now()); till >= start; till = addDays(till, -31)) {
        const from = addDays(till, -30) < start ? start : addDays(till, -30);
        log(`Reading time for ${from} to ${till}…`);
        const r = await lg({ action: 'report', from, till });
        (r && r.pupils || []).forEach(p => { Object.keys(p.days || {}).forEach(d => { const [s, t, pg] = p.days[d]; DAYS[p.id + '_' + d] = { pid: p.id, d, s, t, p: pg }; }); });
        if (from === start) break;
      }
      Object.keys(DAYS).forEach(k => { const x = DAYS[k]; if (!seen[x.pid] || (LV.pupils[x.pid] || {}).acct) return; const u = {}; Object.keys(x.t || {}).forEach(tk => { const b = tk.split('|')[0]; u[b] = (u[b] || 0) + x.t[tk]; }); const rest = x.s - Object.keys(u).reduce((a, b) => a + u[b], 0); if (rest > 0) u.home = rest;
        ops.push(['set', 'days/' + k, { pid: x.pid, d: x.d, s: x.s, u, t: x.t || {}, p: x.p || {}, mig: true }]); });
      await commit(o, ops.splice(0)); log(`Copied ${Object.keys(DAYS).length} days of revision time.`);
      let n = 0;
      const one = async id => {
        const p = byId[id] || {};
        const [det, pd] = await Promise.all([lg({ action: 'detail', to: id }), lg({ action: 'pdata', to: id })]);
        const days = {}; Object.keys(DAYS).forEach(k => { if (DAYS[k].pid === id) days[DAYS[k].d] = DAYS[k].s; });
        const act = { name: p.name || '', cls: ncls(p.cls), total: p.total || 0, first: p.first || 0, last: p.last || 0, units: p.units || {}, days, typed: {} };
        (p.typed || []).forEach(t => { act.typed[t] = true; });
        if (p.prog) act.prog = p.prog;
        if (p.total || p.prog) ops.push(['set', 'act/' + id, act]);
        if (det && det.ok) {
          Object.keys(det.state || {}).forEach(b => { const s = det.state[b], g = (p.prog || {})[b] || {};
            ops.push(['set', 'prog/' + id + '_' + b, { pid: id, book: b, name: p.name || '', cls: ncls(p.cls), at: s.at || 0, cov: s.cov || 0, seen: g.seen || 0, total: g.total || 0, tr: g.tr || 0, quiz: g.quiz || {}, done: s.done || [], seenIds: s.seen || [], later: s.later || [], pq: s.pq || {} }]); });
          const aw = {}; Object.keys(det.marked || {}).forEach(k => { aw[k] = [now(), det.marked[k]]; }); if (Object.keys(aw).length) ops.push(['set', 'pupils/' + id, { aw }, true]);
        }
        if (pd && pd.ok && pd.data) ops.push(['set', 'psave/' + id, { data: pd.data, updated: pd.updated || now() }]);
        if (++n % 10 === 0) log(`Progress copied for ${n} of ${ids.length} pupils…`);
        if (ops.length > 300) await commit(o, ops.splice(0));
      };
      for (const c of chunk(ids, 4)) await Promise.all(c.map(one));
      await commit(o, ops.splice(0));
      log(`Progress copied for ${n} pupils.`);
    }
    // set work, messages, tests (and results), competitions (and entries, with their pictures)
    if (!done.work || opts.history) {
      const W = await lg({ action: 'work' });
      (W && W.work || []).forEach(w => { const toks = whoTokens(w.who); ops.push(['set', 'work/' + w.id, { who: w.who, book: w.book, ch: w.ch, due: w.due || '', note: w.note || '', at: w.at, toks }]); toks.forEach(t => ops.push(['set', 'inbox/' + t, { w: { [w.id]: { book: w.book, ch: w.ch, due: w.due || '', note: w.note || '', at: w.at } } }, true])); });
      const reads = {};
      (W && W.msgs || []).forEach(m => { const toks = whoTokens(m.to); ops.push(['set', 'msgs/' + m.id, { to: m.to, text: m.text, at: m.at, toks }]); toks.forEach(t => ops.push(['set', 'inbox/' + t, { m: { [m.id]: { text: m.text, at: m.at } } }, true])); (m.read || []).forEach(p => { (reads[p] = reads[p] || {})[m.id] = m.at; }); });
      Object.keys(reads).forEach(p => { if (okId(p)) ops.push(['set', 'act/' + p, { read: reads[p] }, true]); });
      const T = await lg({ action: 'tests' });
      (T && T.tests || []).forEach(t => { const toks = whoTokens(t.who); ops.push(['set', 'tests/' + t.id, { who: t.who, book: t.book, ch: t.ch, title: t.title || '', due: t.due || '', note: t.note || '', at: t.at, toks }]); toks.forEach(k => ops.push(['set', 'inbox/' + k, { t: { [t.id]: { book: t.book, ch: t.ch, title: t.title || '', due: t.due || '', note: t.note || '' } } }, true])); });
      const pairs = [...new Set((T && T.results || []).map(r => r.book + '|' + r.ch))];
      for (const pr of pairs) { const [b, c] = pr.split('|'), R = await lg({ action: 'testres', book: b, ch: c }), base = (T.results || []).filter(r => r.book === b && r.ch === c);
        (R && R.results || []).forEach((r, i) => { const x = base.find(y => y.id === r.id && y.at === r.at) || {}; ops.push(['set', 'tres/' + r.id + '_' + (r.at || i).toString(36), { tid: x.tid || '', pid: r.id, name: r.name, cls: r.cls, book: b, ch: c, score: r.score, of: r.of, ans: r.ans || '', min: r.min || 0, at: r.at }]); }); }
      const CP = await lg({ action: 'comps' });
      (CP && CP.runs || []).forEach(r => ops.push(['set', 'comps/' + r.id, { comp: r.comp, title: r.title, years: r.years, cat: r.cat, opens: r.opens, closes: r.closes, note: r.note || '', at: r.at }]));
      await commit(o, ops.splice(0));
      for (const e of (CP && CP.entries || [])) {
        const eid = e.rid + '_' + (e.pid || e.id);
        ops.push(['set', 'centries/' + eid, { rid: e.rid, pid: e.pid || '', uid: '', name: e.name, cls: e.cls, house: e.house || '', title: e.title || '', link: e.link || '', text: e.text || '', at: e.at, img: !!e.img, scores: e.scores || '', total: e.total, place: e.place || 0, notes: e.notes || '' }]);
        if (e.img) { const im = await lg({ action: 'compimg', eid: e.id }); const src = im && im.ok ? await shrinkImg(im.src) : ''; if (src) ops.push(['set', 'cimg/' + eid, { src, uid: '' }]); }
        if (ops.length > 20) await commit(o, ops.splice(0));
      }
      await commit(o, ops.splice(0));
      log('Set work, messages, topic tests, results and competitions copied.');
    }
    await o.FS.setDoc(D(o, 'staffkeys/' + await sha('mrbdt-staff|' + key)), { t: true, main: true });
    await o.FS.setDoc(D(o, 'config/migration'), { at: now(), history: true, work: true }, { merge: true });
    log(`Done. ${skipped ? skipped + ' pupils already on Firebase were left as they are. ' : ''}Each pupil keeps their email and PIN: the first time they sign in, the old script checks it and their Firebase account is made.`);
    return { ok: true, pupils: pupils.length };
  }
  let AUTO_AT = 0;
  function autoCopy() { void AUTO_AT; }   // (the copy is run by hand: Pupil tracking › ⋯ › Copy data from the Google Sheet)

  // ---------- teacher sign-in (Google) ----------
  let TWAIT = null, TRES = null;
  function waitTeacher(o) {
    if (teacherUser(o)) return Promise.resolve();
    if (!TWAIT) TWAIT = new Promise(r => { TRES = r; });
    paintBar(true);
    return TWAIT;
  }
  async function teacherSignIn() {
    const o = await FB, prov = new o.AU.GoogleAuthProvider(); prov.setCustomParameters({ prompt: 'select_account' });
    const cr = await o.AU.signInWithPopup(o.auth, prov), em = (cr.user.email || '').toLowerCase();
    if (OWNERS.indexOf(em) < 0) { await checkStaffDoc(o); if (STAFF_OK !== em) { await o.AU.signOut(o.auth); throw new Error(em + ' isn’t a teacher account for this site. Mr Butler can add it in Firebase (Firestore › staff).'); } }
    paintBar(); if (TRES) { TRES(); TRES = null; TWAIT = null; }
    startLive(o).catch(() => { }); setTimeout(askNotify, 2000);
    return true;
  }
  let BAR_WANT = false;
  function paintBar(want) {
    if (want) BAR_WANT = true;
    if (!document.body) { document.addEventListener('DOMContentLoaded', () => paintBar()); return; }
    FB.then(o => o.ready.then(async () => {
      if (o.auth.currentUser && !googleTeacher(o)) await checkStaffDoc(o);
      if (teacherUser(o) && TRES) { TRES(); TRES = null; TWAIT = null; }
      let bar = document.getElementById('fbTeacherBar');
      const need = BAR_WANT && !teacherUser(o);
      if (!need) { if (bar) bar.remove(); return; }
      if (bar) return;
      bar = document.createElement('div'); bar.id = 'fbTeacherBar';
      bar.innerHTML = '<style>#fbTeacherBar{position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:2147483600;display:flex;flex-wrap:wrap;align-items:center;gap:10px;max-width:calc(100% - 24px);background:#16213A;color:#fff;padding:10px 14px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.3);font:15px/1.4 system-ui,-apple-system,Segoe UI,sans-serif}#fbTeacherBar button{font:inherit;font-weight:700;border:0;border-radius:8px;padding:8px 14px;background:#fff;color:#16213A;cursor:pointer}#fbTeacherBar small{display:block;width:100%;color:#C9D6F2}</style>' +
        '<span>🔐 Connect this device to the pupil data:</span><button type="button">Sign in with Google</button><small aria-live="polite">Use Mr Butler’s Google account (or another teacher account).</small>';
      document.body.appendChild(bar);
      bar.querySelector('button').addEventListener('click', () => {
        const m = bar.querySelector('small'); m.textContent = 'Opening Google…';
        teacherSignIn().then(() => { m.textContent = ''; }, e => { m.textContent = /popup/.test(code(e)) ? 'The pop-up was blocked: allow pop-ups for this site and try again.' : (e && e.message) || code(e); });
      });
    })).catch(() => { });
  }

  // ---------- the request router ----------
  const PUPIL = { signin, addemail, access, classes, zonereq, awards, comprun, compsopen, staff, mywork, load, whois: () => ({ ok: false, error: 'pin' }) };
  const TEACHER = { week, detail, report, award, live: async o => { await startLive(o); return { ok: true, live: liveList(), now: now() }; }, saveclass,
    delclass: async (o, q) => { await o.FS.deleteDoc(D(o, 'classes/' + ncls(q.cls))); return { ok: true }; }, allocate, setzones, zonedecide, qstats, work, setwork, comps, compimg, setcomp, editcomp,
    delcomp: async (o, q) => { await o.FS.deleteDoc(D(o, 'comps/' + String(q.rid || ''))); uncache('comps'); return { ok: true }; }, judge, tests, testres, settest, deltest, delwork, sendmsg, delmsg,
    pdata, setrole, dedupe, addpupil, addemails, sendpin, importlist, classlist, dellist, setemail, resetpin, rename, delete: del, merge,
    approve: (o, q) => decide(o, q, 'approved'), decline: (o, q) => decide(o, q, 'declined'),
    testmail: async () => { const k = legacyKey(); const j = k ? await legacy('testmail', { key: k }) : null; return j || { ok: false, error: 'Emails are sent by the old Google script: open the Teacher area on a device with the teacher key.' }; } };
  const peek = (key, ms) => { const c = J(LS.get('mrb-fbc:' + key), null); return c && now() - c.t < ms ? c : null; };
  /* answers a pupil's page can have straight from this device, without loading Firebase (null: Firebase is needed) */
  function fast(q, body) {
    const me = J(LS.get('mrb-pupil'), null), who = (LS.get('mrb-fb-pid') || '').split('|'), pid = who[0], tid = who[1] || pid;
    const mine = !!(pid && me && me.id === tid);
    if (body) {
      if (body.kind === 'teacher' || !mine) return null;
      if (!body.kind || body.kind === 'ping' || body.kind === 'snap' || body.kind === 'msgread') return pupilPost(null, body);
      if (body.kind === 'psave' && !body.force && now() - (+LS.get('mrb-fb-ps') || 0) < PSAVE_MS) {   // written later (at most every 5 minutes)
        PS_DATA = String(body.data || ''); LS.set('mrb-fb-psp', '1');
        if (!PS_T) PS_T = setTimeout(() => { PS_T = 0; const x = PS_DATA; PS_DATA = null; if (x != null) ready().then(o => psave(o, { data: x, force: true })).catch(e => console.warn('[mrb] psave', e)); }, (+LS.get('mrb-fb-ps') || 0) + PSAVE_MS - now());
        return { ok: true };
      }
      return null;
    }
    const a = q.action;
    if (a === 'access' && mine) { const c = peek('acc:' + pid, 5 * 60000); return c ? c.v : null; }
    if (a === 'awards' && mine) { const c = peek('acc:' + pid, 10 * 60000); if (!c) return null; const aw = c.aw || {}, since = +q.since || 0;
      return { ok: true, awards: Object.keys(aw).map(k => { const i = k.indexOf('|'); return [aw[k][0], k.slice(0, i), k.slice(i + 1), aw[k][1]]; }).filter(x => x[0] > since) }; }
    if (a === 'mywork' && mine) { const c = peek('mywork:' + tid, 10 * 60000); return c ? c.v : null; }
    if (a === 'classes') { loadFB(); const c = peek('classes', 30 * 60000); return c ? { ok: true, classes: c.v.map(([id, x]) => ({ cls: id, teacher: x.teacher || '', course: x.course || '' })) } : null; }   // the sign-in box is open: get Firebase ready
    return null;
  }
  async function route(q, body) {
    const f = fast(q, body); if (f) return f;
    const o = await ready();
    if (body) {
      if (body.kind === 'teacher' && body.q) { q = {}; Object.keys(body.q).forEach(k => { q[k] = String(body.q[k]); }); }
      else return pupilPost(o, body);
    }
    const a = q.action || '';
    if (a === 'staffmail') { const j = await legacy('staffmail', {}); return j || { ok: false }; }
    if (PUPIL[a]) return PUPIL[a](o, q);
    // everything else is the teacher's
    await waitTeacher(o);
    if (!a) return summary(o);
    if (!TEACHER[a]) return { ok: false, error: 'unknown action' };
    const r = await TEACHER[a](o, q);
    return r;
  }
  function parse(url) {
    const q = {}, i = url.indexOf('?');
    if (i >= 0) url.slice(i + 1).split('&').forEach(kv => { if (!kv) return; const j = kv.indexOf('='), k = decodeURIComponent((j < 0 ? kv : kv.slice(0, j)).replace(/\+/g, ' ')); q[k] = j < 0 ? '' : decodeURIComponent(kv.slice(j + 1).replace(/\+/g, ' ')); });
    return q;
  }
  const bodyOf = b => b == null ? Promise.resolve(null) : typeof b === 'string' ? Promise.resolve(b) : b instanceof Blob ? b.text() : Promise.resolve(String(b));
  async function handle(url, init) {
    const q = parse(url), post = init && init.method && /post/i.test(init.method);
    const txt = post ? await bodyOf(init.body) : null;
    let body = null; if (txt) { try { body = JSON.parse(txt); } catch (e) { return new Response('{"ok":false,"error":"bad json"}', { headers: { 'Content-Type': 'application/json' } }); } }
    let j;
    try { j = await route(q, body); }
    catch (e) {
      console.warn('[mrb]', q.action || (body && body.kind), e);
      const c = code(e);
      if (q.action === 'access' || q.action === 'signin') throw new TypeError('Failed to fetch');   // the page treats it as "couldn't reach it" and stays as it was
      if (denied(e)) j = { ok: false, error: 'Not allowed: ' + (teacherUserSafe() ? 'check the Firestore rules are published' : 'sign in again') };
      else if (/unavailable|offline|network|Failed to fetch/i.test(c)) j = { ok: false, error: 'offline' };
      else j = { ok: false, error: c };
    }
    return new Response(JSON.stringify(j), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  var TU = false; const teacherUserSafe = () => TU;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (isApi(url)) return handle(url, init);
    return realFetch(input, init);
  };
  if (realBeacon) navigator.sendBeacon = function (url, data) {
    if (isApi(url)) { handle(String(url), { method: 'POST', body: data }).catch(() => { }); return true; }
    return realBeacon(url, data);
  };
  if (/teacher\.html$/i.test(location.pathname)) {
    loadFB().then(o => o.ready.then(async () => { await checkStaffDoc(o); if (teacherUser(o)) { startLive(o).catch(() => { }); setTimeout(askNotify, 3000); } })).catch(() => { });
  } else if (qload().log.length || Object.keys(qload().snap).length) setTimeout(() => flush(), 6000);   // activity a previous page couldn't save yet
  window.FBAPI = {
    migrate, teacherSignIn, flush,
    signOut: () => { stopLive(); return FB.then(o => o.AU.signOut(o.auth)).then(() => paintBar()); },
    whoami: () => FB.then(o => o.ready.then(() => { const u = o.auth.currentUser; return u ? { email: u.email, teacher: teacherUser(o), owner: ownerUser(o), pupil: pidOf(u.email) || '' } : null; })),
    /* the staff PIN (marks a device as staff, no access to pupil data) and the teacher key: kept only as hashes */
    /* owner only: delete documents by path (tidying up), e.g. FBAPI.adminDelete(['saves/ABCD-EFGH']) */
    adminDelete: async paths => { const o = await ready(); if (!ownerUser(o)) throw new Error('owner only'); await commit(o, (paths || []).map(p => ['del', String(p)])); return true; },
    setStaffKey: async (k, teacher) => { const o = await ready(); if (!ownerUser(o)) throw new Error('owner only'); await o.FS.setDoc(D(o, 'staffkeys/' + await sha('mrbdt-staff|' + String(k))), { t: !!teacher, main: !!teacher }); return true; }
  };
})();
