/* Service worker for the CCEA Digital Technology site (built by notes/app/build_app.py; do not edit by hand).
   Precache (stale-while-revalidate): front page, workbooks, fonts, icons, the hubs' core files.
   Network-first: notes/slides/manifest.json, papers/*.json, version.json. A new worker waits for the page's "Update now" (SKIP_WAITING). Cache on first use (capped): PowerPoints, PDFs, audio, diagrams and images.
   Never cached: anything from another site (YouTube, Wikimedia, Google Fonts...). */
const VERSION = '8987f6983d97';
const PRE = 'dt-pre-' + VERSION, RT = 'dt-rt-v1', RT_MAX = 150;
const PRECACHE = ["./","index.html","manifest.webmanifest","notes/A21.html","notes/A22.html","notes/AS1.html","notes/AS2.html","notes/U1.html","notes/U4.html","notes/U5.html","notes/_t.html","fonts/lemonmilk-bold.woff","fonts/lemonmilk-light.woff","fonts/lemonmilk-medium.woff","fonts/lemonmilk-regular.woff","fonts/saira-hero.woff","icons/T1.png","icons/T10.png","icons/T2.png","icons/T3.png","icons/T4.png","icons/T41.png","icons/T42.png","icons/T43.png","icons/T44.png","icons/T45.png","icons/T46.png","icons/T47.png","icons/T5.png","icons/T6.png","icons/T7.png","icons/T8.png","icons/T9.png","gce/icons/G1.png","gce/icons/G10.png","gce/icons/G11.png","gce/icons/G12.png","gce/icons/G13.png","gce/icons/G14.png","gce/icons/G15.png","gce/icons/G16.png","gce/icons/G17.png","gce/icons/G18.png","gce/icons/G19.png","gce/icons/G2.png","gce/icons/G20.png","gce/icons/G21.png","gce/icons/G22.png","gce/icons/G23.png","gce/icons/G24.png","gce/icons/G3.png","gce/icons/G4.png","gce/icons/G5.png","gce/icons/G6.png","gce/icons/G7.png","gce/icons/G8.png","gce/icons/G9.png","app-icons/apple-touch-icon.png","app-icons/favicon-32.png","app-icons/icon-192.png","app-icons/icon-512.png","app-icons/maskable-192.png","app-icons/maskable-512.png","hub.html","acts.js","animate.js","app.js","course.js","csharp.js","deckcore.js","diagrams.js","links.js","print.js","scripts.js","tutorials.js","gce/hub.html","gce/index.html","gce/acts.js","gce/animate.js","gce/app.js","gce/course.js","gce/csharp.js","gce/deckcore.js","gce/diagrams-extra.js","gce/diagrams.js","gce/links.js","gce/print.js","gce/scripts.js","gce/tutorials.js"];
const BASE = new URL('./', self.location).href;
const PRE_SET = new Set(PRECACHE.map(p => new URL(p, BASE).href));
self.addEventListener('install', e => {
  e.waitUntil(caches.open(PRE).then(c => Promise.all(PRECACHE.map(p => c.add(new Request(new URL(p, BASE).href, { cache: 'reload' })).catch(() => null)))));   /* waits until the page says Update now (SKIP_WAITING) */
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('dt-') && k !== PRE && k !== RT).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { const d = e.data; if (d === 'skipWaiting' || d === 'SKIP_WAITING' || (d && d.type === 'SKIP_WAITING')) self.skipWaiting(); else if (d && d.type === 'VERSION' && e.source) e.source.postMessage({ type: 'VERSION', version: VERSION }); });
const clean = u => { const x = new URL(u); x.hash = ''; x.search = ''; return x.href; };
async function swr(req, key) {
  const c = await caches.open(PRE), hit = await c.match(key);
  const net = fetch(req).then(r => { if (r && r.ok && r.type === 'basic') c.put(key, r.clone()); return r; }).catch(() => null);
  return hit || (await net) || Response.error();
}
async function netFirst(req) {
  const c = await caches.open(RT);
  try { const r = await fetch(req); if (r && r.ok) c.put(clean(req.url), r.clone()); return r; }
  catch (e) { return (await c.match(clean(req.url))) || Response.error(); }
}
async function onUse(req) {
  const c = await caches.open(RT), key = clean(req.url), hit = await c.match(key);
  if (hit) return hit;
  const r = await fetch(req);
  if (r && r.ok && r.status === 200 && r.type === 'basic') {
    await c.put(key, r.clone());
    const ks = await c.keys(); for (let i = 0; i < ks.length - RT_MAX; i++) await c.delete(ks[i]);   /* oldest first */
  }
  return r;
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !req.url.startsWith(BASE)) return;   /* other sites: straight to the network */
  if (req.headers.has('range')) return;                                          /* audio/video seeking: let the browser stream */
  const key = clean(req.url);
  if (/\/notes\/slides\/manifest\.json$|\/papers\/(manifest|folders|pages)\.json$|\/version\.json$/.test(url.pathname)) { e.respondWith(netFirst(req)); return; }
  if (PRE_SET.has(key)) { e.respondWith(swr(req, key)); return; }
  if (req.mode === 'navigate') { e.respondWith(fetch(req).catch(async () => (await caches.match(key)) || (await caches.match(new URL('index.html', BASE).href)) || Response.error())); return; }
  if (/\.(pptx?|pdf|mp3|m4a|ogg|wav|png|jpe?g|webp|gif|svg)$/i.test(url.pathname)) { e.respondWith(onUse(req)); return; }
});
