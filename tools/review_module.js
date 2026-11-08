/* TOPIC REVIEW (route #review-cNN): end-of-topic revision. "I can…" checklist built from the topic's spec points (pupils rate
   each red / amber / green, saved in the workbook's progress as state.rv), retrieval tasks (brain dump, explain the link),
   fill the gaps and key-term matching. The written content is in REVIEW (one entry per chapter, made with
   tools/review_build.py from tools/review/<book>.json); a topic with no entry has no review. */
const RV_ON = !TUT && typeof REVIEW === 'object' && !!REVIEW;
const rvHas = ch => RV_ON && !!(ch && REVIEW[ch.id]);
/* one checklist row per spec point (pages that share a spec point share a row, rated on the first of them) */
function rvSpecs(ch) {
  const seen = new Map();
  (ch.pages || []).forEach(p => { const s = plain(p.spec || p.title || '').trim(); if (!s) return; if (!seen.has(s)) seen.set(s, { id: p.id, s, ids: [p.id] }); else seen.get(s).ids.push(p.id); });
  return [...seen.values()];
}
const rvCan = s => /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
function rvSub(ch) {
  const r = (state.rv || {})[ch.id] || {}, sp = rvSpecs(ch), g = sp.filter(x => r[x.id] === 'g').length;
  return g ? `${g} of ${sp.length} spec points green` : 'Checklist, recall, fill the gaps, key terms';
}
function rvChip(ch) { return rvHas(ch) ? `<a class="cq-chip cq-chip2" href="#review-${esc(ch.id)}">${icon('steps')}<span><b>Topic review</b><small>${esc(rvSub(ch))}</small></span></a>` : ''; }
function rvRow(ch) { return rvHas(ch) ? `<div class="ts-fc rv-ts"><a class="ts-fcb" href="#review-${esc(ch.id)}">${icon('steps')}<span><b>Topic review</b><small>${esc(rvSub(ch))}</small></span></a></div>` : ''; }
const RV_CSS = `.rv-v .rv-sec{margin-top:16px;padding:18px var(--px,18px)}.rv-v .rv-sec h2{display:flex;align-items:center;gap:10px;margin:0 0 6px;font-size:20px}
.rv-v .rv-sec h2 .bi{flex:none;width:34px;height:34px;border-radius:10px;background:var(--cc);color:var(--paper);display:inline-grid;place-items:center}.rv-v .rv-sec h2 .bi svg{width:19px;height:19px}
.rv-v .rv-sub{margin:0 0 12px;color:var(--ink-2);font-family:var(--sans);font-size:14px;line-height:1.45}
.rv-v .rv-nav{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.rv-cl{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.rv-c{display:grid;grid-template-columns:1fr auto;gap:6px 10px;align-items:center;padding:10px 12px;border:1px solid var(--line);border-left:5px solid var(--line);border-radius:12px;font-family:var(--sans);font-size:14.5px;line-height:1.4}
.rv-c.r{border-left-color:#D64545}.rv-c.a{border-left-color:#E0A21B}.rv-c.g{border-left-color:#2E9E5B}
.rv-c .rv-go{grid-column:2;grid-row:1;font-size:13px;font-weight:700;color:var(--cc-d,var(--cc));text-decoration:none;white-space:nowrap}
.rv-c .rv-t{grid-column:1;grid-row:1}.rv-rag{grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap}
.rv-rag button{font:inherit;font-size:13px;font-weight:700;padding:6px 11px;border-radius:999px;border:1.5px solid var(--line);background:transparent;color:var(--ink-2);cursor:pointer}
.rv-rag .rv-r[aria-pressed=true]{background:#D64545;border-color:#D64545;color:#fff}.rv-rag .rv-a[aria-pressed=true]{background:#E0A21B;border-color:#E0A21B;color:#1B1B1B}.rv-rag .rv-g[aria-pressed=true]{background:#2E9E5B;border-color:#2E9E5B;color:#fff}
.rv-sum{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px;font-family:var(--sans);font-size:13.5px}.rv-sum span{padding:4px 10px;border-radius:999px;background:var(--cc-t,rgba(0,0,0,.05));font-weight:700}
.rv-bd{border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-top:10px}.rv-bd>p{margin:0 0 8px;font-family:var(--serif);font-size:16px;line-height:1.5}
.rv-bd .rv-acts{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.rv-tm{font-family:var(--display);font-weight:700;font-size:15px;min-width:3.2em}
.rv-pts{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:6px;font-family:var(--sans);font-size:14.5px;line-height:1.4}.rv-pts label{display:flex;gap:9px;align-items:flex-start;cursor:pointer}.rv-pts input{margin-top:3px;width:17px;height:17px;flex:none;accent-color:var(--cc)}
.rv-got{margin:8px 0 0;font-family:var(--sans);font-size:13.5px;font-weight:700;color:var(--ink-2)}
.rv-gap p{font-family:var(--serif);font-size:16px;line-height:2.1;margin:0 0 10px}
.rv-gap input{font:inherit;font-family:var(--sans);font-size:15px;padding:2px 8px;margin:0 2px;border:0;border-bottom:2px solid var(--cc);border-radius:6px 6px 0 0;background:var(--cc-t,rgba(0,0,0,.05));color:var(--ink);max-width:100%}
.rv-gap input.ok{border-bottom-color:#2E9E5B;background:rgba(46,158,91,.14)}.rv-gap input.no{border-bottom-color:#D64545;background:rgba(214,69,69,.12)}
.rv-res{margin:8px 0 0;font-family:var(--sans);font-weight:700;font-size:14px}
.rv-mt{display:grid;gap:12px}.rv-mt .rv-tl{display:flex;flex-wrap:wrap;gap:6px}.rv-mt .rv-dl{display:grid;gap:6px}
.rv-mt button{font:inherit;font-family:var(--sans);font-size:14px;line-height:1.4;text-align:left;padding:8px 12px;border-radius:10px;border:1.5px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}
.rv-mt .rv-tl button{font-weight:700;border-radius:999px}.rv-mt button[aria-pressed=true]{border-color:var(--cc);background:var(--cc-t,rgba(0,0,0,.05));box-shadow:0 0 0 2px var(--cc) inset}
.rv-mt button.done{opacity:.45;border-style:dashed;cursor:default}.rv-mt button.done b{color:#2E9E5B}.rv-mt button.bad{animation:rv-sh .35s}
@keyframes rv-sh{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.rv-lk{border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-top:10px}.rv-lk>p{margin:0 0 8px;font-family:var(--serif);font-size:16px;line-height:1.5}
.rv-lk .rv-ans{margin-top:10px;padding:10px 12px;border-radius:10px;background:var(--cc-t,rgba(0,0,0,.05));font-family:var(--serif);font-size:15.5px;line-height:1.55}
@media (prefers-reduced-motion:reduce){.rv-mt button.bad{animation:none}}`;
function rvNorm(s) { return String(s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9'+#.%-]+/g, ' ').replace(/\.$/, '').trim(); }
function rvGapHTML(text, gi) {
  let n = 0;
  return String(text).split(/(\{\{[^}]+\}\})/).map(part => {
    const m = /^\{\{([^}]+)\}\}$/.exec(part); if (!m) return inline(part);
    const alts = m[1].split('|').map(x => x.trim()).filter(Boolean), w = Math.max(5, Math.min(22, alts[0].length + 2));
    return `<input type="text" data-a="${esc(alts.join('|'))}" size="${w}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Gap ${gi + 1}.${++n}">`;
  }).join('');
}
function renderReview(ch) {
  tutView('review-' + ch.id, 'Topic review');
  setHue(ch);
  if (!document.getElementById('rv-css')) { const st = document.createElement('style'); st.id = 'rv-css'; st.textContent = RV_CSS; document.head.append(st); }
  const R = REVIEW[ch.id] || {}, specs = rvSpecs(ch), terms = (CH_TERMS.get(ch.id) || []).filter(g => g.def);
  state.rv = state.rv || {}; const mine = state.rv[ch.id] = state.rv[ch.id] || {};
  const sec = (id, ic, t, sub, body) => `<section class="card rv-sec" aria-labelledby="rv-${id}"><h2 id="rv-${id}">${bi(ic)}<span>${t}</span></h2>${sub ? `<p class="rv-sub">${sub}</p>` : ''}${body}</section>`;
  const can = specs.map(x => { const v = mine[x.id] || ''; return `<li class="rv-c ${v}" data-s="${esc(x.id)}"><span class="rv-t">I can ${esc(rvCan(x.s))}</span><a class="rv-go" href="#${esc(x.id)}">Revise →</a><span class="rv-rag" role="group" aria-label="How well do you know this?">${['r', 'a', 'g'].map(k => `<button type="button" class="rv-${k}" data-rag="${k}" aria-pressed="${v === k}">${{ r: 'Not yet', a: 'Nearly', g: 'Got it' }[k]}</button>`).join('')}</span></li>`; }).join('');
  const blurt = (R.blurt || []).map((b, i) => `<div class="rv-bd" data-bd="${i}"><p><b>${i + 1}.</b> ${inline(b.p)}</p><div class="rv-acts"><button type="button" class="btn" data-tm="300">Start 5-minute timer</button><span class="rv-tm" aria-live="polite"></span><button type="button" class="btn" data-pts aria-expanded="false">Check what to include</button></div>
    <div class="rv-chk" hidden><ul class="rv-pts">${(b.pts || []).map(t => `<li><label><input type="checkbox"><span>${inline(t)}</span></label></li>`).join('')}</ul><p class="rv-got" aria-live="polite">Tick each point you remembered.</p></div></div>`).join('');
  const gaps = (R.gaps || []).length ? `<div class="rv-gap">${R.gaps.map((g, i) => `<p>${rvGapHTML(g, i)}</p>`).join('')}</div><div class="rv-nav"><button type="button" class="btn pri" data-gchk>Check my answers</button><button type="button" class="btn" data-gshow>Show the answers</button><button type="button" class="btn" data-gclr>Clear</button></div><p class="rv-res" aria-live="polite"></p>` : '';
  const links = (R.links || []).map((l, i) => `<div class="rv-lk"><p><b>${i + 1}.</b> ${inline(l.q)}</p><button type="button" class="btn" data-lk aria-expanded="false">Show a model answer</button><div class="rv-ans" hidden>${inline(l.a)}</div></div>`).join('');
  const open = typeof cqUnlocked === 'function' && cqUnlocked(ch), nq = CQ_ON ? cqItems(ch).length : 0, np = CQ_ON ? cqPast(ch).length : 0;
  main.innerHTML = `<article class="sheet lib-v cq-v rv-v" aria-labelledby="cq-h" style="${chVars(ch)}"><header class="lib-hero card cq-hero"><small class="lib-k">${icon('steps')}Chapter ${esc(ch.n)} · ${esc(ch.title)}</small><h1 id="cq-h" tabindex="-1">Topic review</h1>
    <p>Revise the whole topic: rate yourself against the specification, test your memory, fill the gaps and match the key terms. Do it again in a week to keep it fresh.</p></header>
    ${sec('can', 'chk', 'What can I do?', 'Rate yourself honestly against each specification point. Then revise the red and amber ones first.', `<div class="rv-sum" aria-live="polite"></div><ol class="rv-cl">${can}</ol>`)}
    ${blurt ? sec('bd', 'learn', 'Brain dump', 'Close your notes. In <b>black</b> pen, write everything you can remember, then check and add anything you missed in <b>red</b>. The more red, the more to revise.', blurt) : ''}
    ${gaps ? sec('gap', 'key', 'Fill the gaps', 'Type the missing word or words, then check. Spelling counts, as it does in the exam.', gaps) : ''}
    ${terms.length >= 3 ? sec('mt', 'terms', 'Match the key terms', 'Tap a key term, then tap its definition.', `<div class="rv-mt"></div><div class="rv-nav"><button type="button" class="btn" data-mnew>New set of terms</button><a class="btn" href="#flashcards-${esc(ch.id)}">Flashcards for this topic</a></div>`) : ''}
    ${links ? sec('lk', 'bits', 'Explain the link', 'Answer each one out loud or on paper first, then compare with the model answer.', links) : ''}
    <section class="card rv-sec"><h2>${bi('star')}<span>Next steps</span></h2><p class="rv-sub">${open ? 'You are ready to test yourself on the whole topic.' : 'The topic quiz opens once every page in the topic is covered and its page quiz is amber or green.'}</p><div class="rv-nav">${nq ? `<a class="btn pri" href="#quiz-${esc(ch.id)}">${open ? 'Topic quiz' : 'Topic quiz (locked)'}</a>` : ''}${np && open ? `<a class="btn" href="#pp-${esc(ch.id)}">Past-paper questions</a>` : ''}<a class="btn" href="#${esc((ch.pages || [])[0] ? ch.pages[0].id : '')}">Back to the start of the topic</a></div></section></article>`;
  const sum = () => { const c = { r: 0, a: 0, g: 0 }; specs.forEach(x => { if (c[mine[x.id]] != null) c[mine[x.id]]++; }); const left = specs.length - c.r - c.a - c.g; $('.rv-sum', main).innerHTML = `<span style="color:#2E9E5B">${c.g} got it</span><span style="color:#B07A00">${c.a} nearly</span><span style="color:#D64545">${c.r} not yet</span>${left ? `<span>${left} to rate</span>` : ''}`; };
  sum();
  main.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t || !main.contains(t)) return;
    if (t.dataset.rag) { const li = t.closest('[data-s]'), id = li.dataset.s, k = mine[id] === t.dataset.rag ? '' : t.dataset.rag; if (k) mine[id] = k; else delete mine[id]; save(); li.className = 'rv-c ' + k; li.querySelectorAll('[data-rag]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.rag === k))); sum(); return; }
    if (t.dataset.tm) { const box = t.closest('.rv-bd'), out = box.querySelector('.rv-tm'); clearInterval(box._t); let s = +t.dataset.tm; const tick = () => { out.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; if (s-- <= 0) { clearInterval(box._t); out.textContent = 'Time’s up!'; t.textContent = 'Start again'; } }; tick(); box._t = setInterval(tick, 1000); cleanups.push(() => clearInterval(box._t)); t.textContent = 'Restart timer'; return; }
    if (t.hasAttribute('data-pts')) { const c = t.closest('.rv-bd').querySelector('.rv-chk'), o = c.hidden; c.hidden = !o; t.setAttribute('aria-expanded', String(o)); t.textContent = o ? 'Hide the checklist' : 'Check what to include'; return; }
    if (t.hasAttribute('data-lk')) { const a = t.nextElementSibling, o = a.hidden; a.hidden = !o; t.setAttribute('aria-expanded', String(o)); t.textContent = o ? 'Hide the model answer' : 'Show a model answer'; return; }
    if (t.hasAttribute('data-gchk') || t.hasAttribute('data-gshow') || t.hasAttribute('data-gclr')) {
      const ins = [...main.querySelectorAll('.rv-gap input')], res = $('.rv-res', main);
      if (t.hasAttribute('data-gclr')) { ins.forEach(i => { i.value = ''; i.className = ''; i.readOnly = false; }); res.textContent = ''; return; }
      if (t.hasAttribute('data-gshow')) { ins.forEach(i => { if (i.className !== 'ok') { i.value = i.dataset.a.split('|')[0]; i.className = 'no'; i.readOnly = true; } }); res.textContent = 'Answers shown in red. Clear and try again tomorrow.'; return; }
      let ok = 0; ins.forEach(i => { const good = i.value.trim() && i.dataset.a.split('|').some(a => rvNorm(a) === rvNorm(i.value)); i.className = i.value.trim() ? (good ? 'ok' : 'no') : ''; if (good) ok++; });
      res.textContent = `${ok} of ${ins.length} right.${ok === ins.length ? ' Brilliant!' : ' Have another go at the red ones.'}`;
      if (ok === ins.length && !RM()) { const r = t.getBoundingClientRect(); burst(r.left + r.width / 2, r.top, 20, hueCols()); }
      return;
    }
    if (t.hasAttribute('data-mnew')) { match(); return; }
  });
  main.addEventListener('change', e => { const b = e.target.closest('.rv-bd'); if (!b || e.target.type !== 'checkbox') return; const c = [...b.querySelectorAll('.rv-pts input')], n = c.filter(x => x.checked).length; b.querySelector('.rv-got').textContent = `You remembered ${n} of ${c.length}.${n === c.length ? ' Excellent!' : ''}`; });
  main.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.closest('.rv-gap input')) { e.preventDefault(); const b = main.querySelector('[data-gchk]'); if (b) b.click(); } });
  /* key-term matching: six terms at a time */
  const mt = $('.rv-mt', main);
  function match() {
    if (!mt) return;
    const set = mixUp(terms).slice(0, 6), defs = mixUp(set.map((g, i) => i));
    mt.innerHTML = `<div class="rv-tl" role="group" aria-label="Key terms">${set.map((g, i) => `<button type="button" data-mt="${i}" aria-pressed="false">${esc(g.term)}</button>`).join('')}</div><div class="rv-dl" role="group" aria-label="Definitions">${defs.map(i => `<button type="button" data-md="${i}">${esc(plain(set[i].def))}</button>`).join('')}</div><p class="rv-res" aria-live="polite"></p>`;
    let pick = null, done = 0;
    mt.onclick = e => {
      const b = e.target.closest('button'); if (!b || b.classList.contains('done')) return;
      if (b.dataset.mt != null) { mt.querySelectorAll('[data-mt]').forEach(x => x.setAttribute('aria-pressed', 'false')); pick = b.dataset.mt; b.setAttribute('aria-pressed', 'true'); return; }
      if (b.dataset.md == null) return;
      const r = mt.querySelector('.rv-res');
      if (pick == null) { r.textContent = 'Tap a key term first.'; return; }
      const tb = mt.querySelector(`[data-mt="${pick}"]`);
      if (b.dataset.md === pick) { tb.classList.add('done'); tb.setAttribute('aria-pressed', 'false'); b.classList.add('done'); b.insertAdjacentHTML('afterbegin', `<b>${esc(set[+pick].term)}: </b>`); pick = null; done++; r.textContent = done === set.length ? 'All matched! Tap “New set of terms” for more.' : `${done} of ${set.length} matched.`; }
      else { b.classList.remove('bad'); void b.offsetWidth; b.classList.add('bad'); r.textContent = 'Not that one. Try again.'; }
    };
  }
  match();
  tutViewDone(true, '#cq-h');
}
{
  const hr = hashRoute, rr = runRoute;
  hashRoute = () => { const m = /^review-(c\d+)$/.exec(decodeURIComponent((location.hash || '').slice(1))); if (m && CH_BY_ID.has(m[1]) && rvHas(CH_BY_ID.get(m[1]))) return { kind: 'review', ch: m[1] }; return hr(); };
  runRoute = r => { if (r && r.kind === 'review') { closeDrawers(); renderReview(CH_BY_ID.get(r.ch)); } else rr(r); };
}
