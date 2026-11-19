// ================= UI =================
const UI = { mode: 'political', sel: { prov: null, army: null }, tab: 'nation', s: 1, ox: 0, oy: 0, dpr: 1, hover: null, moveMode: false, counters: [], dipSel: null, labels: null, mouse: null };
const $ = id => document.getElementById(id);
const fmt = (v, d = 0) => (v < 0 ? '−' : '') + Math.abs(v).toLocaleString('en-GB', { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtMen = k => k >= 1000 ? fmt(k / 1000, 2) + 'M' : fmt(k) + 'k';
const sgn = (v, d = 1) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d);
const flag = id => `<span class="flag" style="background:${NATIONS[id].color}"></span>`;
const PAPER = [233, 222, 196];
function sideTag(id) { const n = N(id); if (n.out) return '<span class="tag X">at peace</span>'; if (!n.side) return '<span class="tag N">neutral</span>'; return `<span class="tag ${n.side}">${n.side === 'E' ? 'Entente' : 'Central Powers'}</span>`; }
function me() { return N(G.player); }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

// ---------- map colours ----------
function buildCols() {
  const fill = [], stripe = [], key = [];
  const sideCol = { E: hexRgb('#7f9ac0'), C: hexRgb('#b08f63'), N: [214, 205, 180], X: [190, 182, 160] };
  const sideKey = id => { const n = N(id); return n.out ? 'X' : n.side || 'N'; };
  const ps = sideOf(G.player);
  for (const p of G.provs) {
    let f, st = null, k;
    if (UI.mode === 'political') {
      f = mixRgb(hexRgb(NATIONS[p.owner].color), PAPER, 0.22); k = p.owner;
      if (p.ctrl !== p.owner) st = mixRgb(hexRgb(NATIONS[p.ctrl].color), PAPER, 0.05);
    } else if (UI.mode === 'alliance') {
      const so = sideKey(p.owner), sc = sideKey(p.ctrl);
      f = sideCol[so]; if (p.owner === G.player) f = mixRgb(f, [255, 255, 255], 0.25);
      if (so === 'N') f = mixRgb(hexRgb(NATIONS[p.owner].color), sideCol.N, 0.75);
      k = so === 'N' || so === 'X' ? 'N' + p.owner : so;
      if (sc !== so) st = sideCol[sc];
    } else if (UI.mode === 'supply') {
      k = p.owner;
      if (ps && sideOf(p.ctrl) === ps) f = G.supply && G.supply[ps].has(p.i) ? [150, 190, 128] : [214, 110, 80];
      else f = mixRgb(hexRgb(NATIONS[p.owner].color), [200, 195, 180], 0.8);
    } else {
      k = p.owner; const t = Math.min(1, p.ind / 6);
      f = mixRgb([232, 222, 195], [140, 52, 28], t);
      if (p.ctrl !== p.owner) st = [90, 90, 90];
    }
    fill.push(f); stripe.push(st); key.push(k);
  }
  return { fill, stripe, key };
}
function recolor() { renderMapImage(buildCols()); computeLabels(); draw(); }

function computeLabels() {
  const L = [];
  const byNat = {};
  for (const p of G.provs) (byNat[p.owner] = byNat[p.owner] || []).push(p.i);
  for (const id in byNat) {
    const set = new Set(byNat[id]); const seen = new Set(); let best = null, bestA = 0;
    for (const s of byNat[id]) {
      if (seen.has(s)) continue; const comp = []; const q = [s]; seen.add(s);
      while (q.length) { const i = q.pop(); comp.push(i); for (const j of LADJ[i]) if (set.has(j) && !seen.has(j)) { seen.add(j); q.push(j); } }
      const a = comp.reduce((t, i) => t + MAP.area[i], 0); if (a > bestA) { bestA = a; best = comp; }
    }
    if (!best || bestA < 1800) continue;
    let sx = 0, sy = 0; for (const i of best) { sx += MAP.cx[i] * MAP.area[i]; sy += MAP.cy[i] * MAP.area[i]; }
    L.push({ id, x: sx / bestA, y: sy / bestA, size: clamp(Math.sqrt(bestA) / 7.5, 9, 34), name: NATIONS[id].short.toUpperCase() });
  }
  UI.labels = L;
}

// ---------- view ----------
const cv = () => $('map');
function resize() {
  const c = cv(), r = c.getBoundingClientRect(); UI.dpr = window.devicePixelRatio || 1;
  c.width = Math.round(r.width * UI.dpr); c.height = Math.round(r.height * UI.dpr); UI.vw = r.width; UI.vh = r.height; clampView(); draw();
}
function fitView(focus) {
  const minS = Math.max(UI.vw / MAP_W, UI.vh / MAP_H);
  UI.s = Math.max(minS, 0.9);
  if (focus !== undefined && focus >= 0) { UI.ox = UI.vw / 2 - MAP.ax[focus] * UI.s; UI.oy = UI.vh / 2 - MAP.ay[focus] * UI.s; }
  else { UI.ox = (UI.vw - MAP_W * UI.s) / 2; UI.oy = (UI.vh - MAP_H * UI.s) / 2; }
  clampView();
}
function clampView() {
  const minS = Math.max(UI.vw / MAP_W, UI.vh / MAP_H) * 0.98;
  UI.s = clamp(UI.s, minS, 5);
  const w = MAP_W * UI.s, h = MAP_H * UI.s;
  UI.ox = w <= UI.vw ? (UI.vw - w) / 2 : clamp(UI.ox, UI.vw - w, 0);
  UI.oy = h <= UI.vh ? (UI.vh - h) / 2 : clamp(UI.oy, UI.vh - h, 0);
}
function zoomAt(f, cx, cy) { const bx = (cx - UI.ox) / UI.s, by = (cy - UI.oy) / UI.s; UI.s *= f; clampView(); UI.ox = cx - bx * UI.s; UI.oy = cy - by * UI.s; clampView(); draw(); }
function toBase(cx, cy) { return [(cx - UI.ox) / UI.s, (cy - UI.oy) / UI.s]; }
function toScreen(bx, by) { return [bx * UI.s + UI.ox, by * UI.s + UI.oy]; }
function provAt(cx, cy) {
  const [bx, by] = toBase(cx, cy); if (bx < 0 || by < 0 || bx >= MAP_W || by >= MAP_H) return null;
  const id = MAP.pid[((by * RES) | 0) * PW + ((bx * RES) | 0)]; return id < MAP.NP ? id : null;
}

// ---------- drawing ----------
let drawQueued = false;
function draw() { if (drawQueued) return; drawQueued = true; requestAnimationFrame(() => { drawQueued = false; drawNow(); }); }
function drawNow() {
  if (!G || !MAP.canvas) return;
  const c = cv(), ctx = c.getContext('2d'), d = UI.dpr, s = UI.s;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#8ea6a8'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.imageSmoothingEnabled = s * d < RES * 1.1; ctx.imageSmoothingQuality = 'high';
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.drawImage(MAP.canvas, 0, 0, PW, PH, UI.ox, UI.oy, MAP_W * s, MAP_H * s);
  ctx.setTransform(d * s, 0, 0, d * s, d * UI.ox, d * UI.oy);
  // highlights
  const hl = (id, a) => { const h = provHighlight(id); if (!h) return; ctx.globalAlpha = a; ctx.drawImage(h.c, h.x, h.y, h.w, h.h); ctx.globalAlpha = 1; };
  if (UI.hover !== null && UI.hover !== UI.sel.prov) hl(UI.hover, 0.45);
  if (UI.sel.prov !== null) hl(UI.sel.prov, 0.95);
  // trenches / front lines
  drawFronts(ctx, s);
  // cities
  for (const p of G.provs) {
    const x = MAP.ax[p.i], y = MAP.ay[p.i];
    if (p.cap) { star(ctx, x, y - 1, 4.2 / Math.sqrt(s) + 1.2, '#2a2219', '#f4e7c4'); }
    else if (p.ind >= 2) { ctx.beginPath(); ctx.arc(x, y, 1.6 + p.ind * 0.25, 0, 7); ctx.fillStyle = '#2a2219'; ctx.fill(); ctx.beginPath(); ctx.arc(x, y, 0.7 + p.ind * 0.12, 0, 7); ctx.fillStyle = '#f4e7c4'; ctx.fill(); }
    if (p.fort > 0 && s > 1.1) { ctx.fillStyle = '#2a2219'; ctx.font = `${7}px serif`; ctx.fillText('▲'.repeat(p.fort), x + 4, y + 9); }
  }
  // nation labels
  if (UI.labels) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const L of UI.labels) {
      const fs = L.size;
      if (fs * s < 8) continue;
      ctx.font = `${fs}px 'IM Fell English SC', serif`; ctx.letterSpacing = (fs * 0.18) + 'px';
      ctx.fillStyle = 'rgba(38,28,18,0.42)'; ctx.fillText(L.name, L.x, L.y);
    }
    ctx.letterSpacing = '0px';
  }
  // province names
  if (s > 1.45) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = `italic ${11 / s * 1.15}px 'EB Garamond', serif`;
    for (const p of G.provs) {
      const x = MAP.ax[p.i], y = MAP.ay[p.i] + 4;
      ctx.lineWidth = 2.6 / s; ctx.strokeStyle = 'rgba(240,230,205,.8)'; ctx.strokeText(p.name, x, y); ctx.fillStyle = '#2a2219'; ctx.fillText(p.name, x, y);
    }
  }
  // battle markers from last turn
  if (G.report && G.report.battles) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const b of G.report.battles) {
      if (b.empty) continue;
      const x = MAP.ax[b.prov] + 9, y = MAP.ay[b.prov] - 9; const r = 5.5 / Math.sqrt(s) + 1.5;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = b.result === 'captured' ? '#9b2f24' : '#5a4a36'; ctx.fill();
      ctx.lineWidth = 1 / s; ctx.strokeStyle = '#f4e7c4'; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `${r * 1.35}px serif`; ctx.fillText('⚔', x, y + r * 0.05);
    }
  }
  // screen space: arrows & counters
  ctx.setTransform(d, 0, 0, d, 0, 0);
  drawOrders(ctx);
  drawCounters(ctx);
}
function star(ctx, x, y, r, fill, stroke) {
  ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fillStyle = stroke; ctx.strokeStyle = fill; ctx.lineWidth = r * 0.35; ctx.stroke(); ctx.fill();
}
function drawFronts(ctx, s) {
  if (!MAP.pairList) { MAP.pairList = []; for (const [k, pts] of MAP.pairPts) MAP.pairList.push({ a: Math.floor(k / 1000), b: k % 1000, pts }); }
  const entAt = new Float32Array(MAP.NP); const hasA = new Uint8Array(MAP.NP);
  for (const a of G.armies) { hasA[a.prov] = 1; if (a.ent > entAt[a.prov]) entAt[a.prov] = a.ent; }
  for (const pr of MAP.pairList) {
    const ca = P(pr.a).ctrl, cb = P(pr.b).ctrl;
    if (!atWar(ca, cb)) continue;
    const e = Math.max(entAt[pr.a], entAt[pr.b]);
    const both = hasA[pr.a] && hasA[pr.b];
    const sz = (both ? 1.1 + e * 0.32 : 0.8);
    ctx.fillStyle = both ? `rgba(55,32,18,${0.55 + e * 0.08})` : 'rgba(120,40,30,0.55)';
    const pts = pr.pts;
    for (let k = 0; k < pts.length; k += 2) {
      const x = pts[k], y = pts[k + 1];
      if (both && e >= 2) { ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz); if (e >= 3 && (k / 2) % 2 === 0) ctx.fillRect(x - sz, y - 0.3, sz * 2, 0.6); }
      else { ctx.beginPath(); ctx.arc(x, y, sz * 0.6, 0, 7); ctx.fill(); }
    }
  }
}
function drawOrders(ctx) {
  const k = clamp(UI.s * 0.9, 0.7, 1.4);
  for (const a of G.armies) {
    if (a.nat !== G.player) continue;
    const sel = UI.sel.army === a.id;
    if (a.sea !== null) {
      const [x0, y0] = toScreen(MAP.ax[a.prov], MAP.ay[a.prov]), [x1, y1] = toScreen(MAP.ax[a.sea], MAP.ay[a.sea]);
      ctx.setLineDash([6, 5]); ctx.strokeStyle = sel ? '#1d3f73' : 'rgba(29,63,115,.7)'; ctx.lineWidth = 2.5 * k;
      ctx.beginPath(); ctx.moveTo(x0, y0); const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - Math.hypot(x1 - x0, y1 - y0) * 0.2; ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke(); ctx.setLineDash([]);
      arrowHead(ctx, mx, my, x1, y1, ctx.strokeStyle, 9 * k);
      continue;
    }
    if (!a.path.length) continue;
    const pts = [a.prov, ...a.path].map(i => toScreen(MAP.ax[i], MAP.ay[i]));
    const hostile = a.path.length && (hostileProv(a.nat, a.path[0]) || (!friendly(a.nat, a.path[0])));
    const col = hostile ? (sel ? '#b3261b' : 'rgba(179,38,27,.75)') : (sel ? '#2f4f23' : 'rgba(47,79,35,.7)');
    ctx.strokeStyle = col; ctx.lineWidth = (sel ? 3.6 : 2.6) * k; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    const n = pts.length; arrowHead(ctx, pts[n - 2][0], pts[n - 2][1], pts[n - 1][0], pts[n - 1][1], col, 11 * k);
  }
  // hover preview
  if (UI.preview) {
    const pv = UI.preview; ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(40,30,20,.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); pv.forEach((i, j) => { const [x, y] = toScreen(MAP.ax[i], MAP.ay[i]); j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]);
  }
}
function arrowHead(ctx, x0, y0, x1, y1, col, sz) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - Math.cos(a - 0.45) * sz, y1 - Math.sin(a - 0.45) * sz); ctx.lineTo(x1 - Math.cos(a + 0.45) * sz, y1 - Math.sin(a + 0.45) * sz); ctx.closePath(); ctx.fill();
}
function drawCounters(ctx) {
  UI.counters = [];
  const k = clamp(UI.s * 0.85, 0.62, 1.3);
  const w = 34 * k, h = 22 * k;
  const byProv = new Map();
  for (const a of G.armies) { if (!byProv.has(a.prov)) byProv.set(a.prov, []); byProv.get(a.prov).push(a); }
  for (const [i, arms] of byProv) {
    const groups = new Map(); for (const a of arms) { if (!groups.has(a.nat)) groups.set(a.nat, []); groups.get(a.nat).push(a); }
    const gl = [...groups.entries()].sort((x, y) => (x[0] === G.player ? -1 : 0) - (y[0] === G.player ? -1 : 0));
    let [sx, sy] = toScreen(MAP.ax[i], MAP.ay[i]);
    sy -= h * 0.95;
    const totalW = gl.length * (w + 3) - 3; let x = sx - totalW / 2;
    for (const [nat, list] of gl) {
      if (sx < -60 || sy < -60 || sx > UI.vw + 60 || sy > UI.vh + 60) { x += w + 3; continue; }
      const div = list.reduce((t, a) => t + a.div, 0), str = list.reduce((t, a) => t + a.str * a.div, 0) / Math.max(1, div);
      const ent = Math.max(...list.map(a => a.ent)), tanks = list.reduce((t, a) => t + a.tanks, 0);
      const selA = list.find(a => a.id === UI.sel.army);
      for (let st = Math.min(list.length - 1, 2); st > 0; st--) { ctx.fillStyle = 'rgba(30,24,18,.8)'; ctx.fillRect(x + st * 3, sy - st * 3, w, h); ctx.fillStyle = NATIONS[nat].color; ctx.fillRect(x + st * 3 + 1, sy - st * 3 + 1, w - 2, h - 2); }
      ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 4 * k; ctx.shadowOffsetY = 1.5 * k;
      ctx.fillStyle = selA ? '#fff4d2' : nat === G.player ? '#d9b46a' : '#1e1912'; ctx.fillRect(x - 1.5, sy - 1.5, w + 3, h + 3);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = NATIONS[nat].color; ctx.fillRect(x, sy, w, h);
      // NATO symbol
      const bx = x + 3 * k, by = sy + 3 * k, bw = w * 0.46, bh = h - 6 * k - 3 * k;
      ctx.fillStyle = 'rgba(255,250,235,.92)'; ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#1e1912'; ctx.lineWidth = 1.1 * k; ctx.strokeRect(bx, by, bw, bh);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + bw, by + bh); ctx.moveTo(bx + bw, by); ctx.lineTo(bx, by + bh); ctx.stroke();
      if (tanks > 0.5) { ctx.beginPath(); ctx.ellipse(bx + bw / 2, by + bh / 2, bw * 0.38, bh * 0.3, 0, 0, 7); ctx.stroke(); }
      ctx.fillStyle = '#fffaf0'; ctx.font = `600 ${12.5 * k}px 'EB Garamond', serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 2.5 * k; ctx.strokeStyle = 'rgba(0,0,0,.55)'; const tx = x + w * 0.76, ty = sy + (h - 3 * k) / 2 + 0.5;
      ctx.strokeText(Math.round(div), tx, ty); ctx.fillText(Math.round(div), tx, ty);
      // strength bar
      ctx.fillStyle = '#1e1912'; ctx.fillRect(x, sy + h - 3 * k, w, 3 * k);
      ctx.fillStyle = str > 0.66 ? '#7fbf5f' : str > 0.4 ? '#e0b040' : '#d0503a'; ctx.fillRect(x, sy + h - 3 * k, w * str, 3 * k);
      // entrenchment pips
      if (ent > 0) { ctx.fillStyle = '#5a3b1c'; for (let e = 0; e < ent; e++) ctx.fillRect(x + 2 * k + e * 5 * k, sy - 4 * k, 4 * k, 2.5 * k); }
      if (list.length > 1) { ctx.fillStyle = '#1e1912'; ctx.beginPath(); ctx.arc(x + w, sy, 6 * k, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `${9 * k}px sans-serif`; ctx.fillText(list.length, x + w, sy + 0.5); }
      UI.counters.push({ x: x - 2, y: sy - 4 * k, w: w + 4, h: h + 6 * k, nat, prov: i, ids: list.map(a => a.id) });
      x += w + 3;
    }
  }
}

// ---------- topbar ----------
function renderTop() {
  const n = me();
  $('tbflag').style.background = NATIONS[G.player].color; $('tbname').textContent = NATIONS[G.player].name;
  $('tbdate').textContent = dateStr();
  $('etdate').textContent = G.over ? 'The war is over' : (G.turn === 0 ? 'War will be declared' : '→ ' + dateStr(G.turn + 1));
  const net = n.income - n.expenses, mnet = n.munProd - n.munIdle;
  const st = [
    ['Funds', fmt(n.money), sgn(net, 0), net >= 0, 'Treasury (millions). Income − expenses per month.'],
    ['Industry', fmt(n.ic, 0), '', true, 'Industrial capacity after modifiers.'],
    ['Munitions', fmt(n.mun), sgn(mnet, 0), mnet >= 0, 'Shell stockpile. Battles consume large amounts.'],
    ['Manpower', fmtMen(n.mp), '+' + fmtMen(n.mpGain), true, 'Men available for reinforcements & new divisions.'],
    ['War Support', fmt(n.ws, 0) + '%', sgn(n.wsDelta || 0), (n.wsDelta || 0) >= 0, 'Public will to fight. Collapse brings revolution.'],
    ['Research', n.res ? TECH[n.res.id].name.split(' ')[0] + '…' : 'idle', n.res ? Math.round(n.res.prog / techCost(n, n.res.id) * 100) + '%' : '', true, 'Current research project.'],
    ['Fleet', fmt(n.fleet), '', true, 'Capital ships.'],
  ];
  $('stats').innerHTML = st.map(([k, v, d, pos, t], i) => `<div class="stat ${i >= 5 ? 'opt' : ''}" title="${t}"><span class="k">${k}</span><span class="v">${v}${d ? `<span class="d ${pos ? 'pos' : 'neg'}">${d}</span>` : ''}</span></div>`).join('');
}

// ---------- side panel ----------
function setTab(t) { UI.tab = t; renderSide(); }
function renderSide() {
  const tabs = document.querySelectorAll('#tabs button');
  tabs.forEach(b => { b.classList.toggle('on', b.dataset.tab === UI.tab); if (b.dataset.tab === 'army') b.disabled = !selArmy(); if (b.dataset.tab === 'prov') b.disabled = UI.sel.prov === null; });
  const f = { prov: panelProv, army: panelArmy, nation: panelNation, dip: panelDip, res: panelRes, trade: panelTrade, ledger: panelLedger }[UI.tab];
  $('panel').innerHTML = f ? f() : '';
  renderTop(); updateHint();
}
function selArmy() { return UI.sel.army ? G.armies.find(a => a.id === UI.sel.army) : null; }
function updateHint() {
  const a = selArmy();
  let t = '';
  if (UI.moveMode && a) t = `Choose a destination for the ${esc(a.name)} — click a province (Esc to cancel)`;
  else if (a && a.nat === G.player) t = matchMedia('(pointer: coarse)').matches ? 'Tap Move / Attack, then tap a province' : 'Right-click (or press M / Move) to order the selected army';
  else if (G.turn === 0) t = 'July 1914: position your armies — war will be declared when you end the turn';
  $('hint').innerHTML = t ? `<span>${t}</span>` : '';
}

function panelProv() {
  const i = UI.sel.prov; if (i === null) return '<p class="muted">Select a province on the map.</p>';
  const p = P(i), mine = p.owner === G.player && p.ctrl === G.player;
  const ss = sideOf(p.ctrl);
  const sup = ss && G.supply && G.supply[ss] ? (G.supply[ss].has(i) ? 'In supply' : '<span style="color:#9b2f24">Cut off</span>') : '—';
  let h = `<h2>${esc(p.name)}</h2><div class="sub">${flag(p.owner)} ${NATIONS[p.owner].name}${p.ctrl !== p.owner ? ` — <b style="color:#9b2f24">occupied by ${NATIONS[p.ctrl].short}</b>` : ''}${p.cap ? ' · capital' : ''}</div>`;
  h += `<div class="grid">
    <div class="kv"><span>Terrain</span><span>${p.terr}</span></div><div class="kv"><span>Industry</span><span>${p.ind}</span></div>
    <div class="kv"><span>Railways</span><span>${['none', 'single', 'double'][p.rail]}</span></div><div class="kv"><span>Fortress</span><span>${p.fort ? '▲'.repeat(p.fort) : 'none'}</span></div>
    <div class="kv"><span>Population</span><span>${p.mp.toFixed(1)}M</span></div><div class="kv"><span>Coastal</span><span>${p.coast ? 'yes' : 'no'}</span></div>
    <div class="kv"><span>Supply</span><span>${sup}</span></div><div class="kv"><span>Value</span><span>${provVP(p)} VP</span></div>
    <div class="kv"><span>Garrison</span><span>${garrisonPow(p) ? garrisonPow(p).toFixed(1) : '—'}</span></div><div class="kv"><span>Controller</span><span>${NATIONS[p.ctrl].short}</span></div></div>`;
  const arms = armiesIn(i);
  h += `<h3>Armies here</h3>`;
  if (!arms.length) h += '<p class="muted">No troops.</p>';
  else h += '<div class="list">' + arms.map(a => `<div class="item ${a.id === UI.sel.army ? 'sel' : ''}" data-act="selArmy" data-id="${a.id}">${flag(a.nat)}<div class="grow"><b>${NATIONS[a.nat].adj} ${esc(a.name)}</b><div class="muted">${a.div} div · ${fmt(a.art)} art${a.tanks >= 1 ? ' · ' + fmt(a.tanks) + ' tank' : ''} · ${Math.round(a.str * 100)}% str · ent ${a.ent}</div></div></div>`).join('') + '</div>';
  if (mine) {
    const n = me();
    h += `<h3>Construction</h3>`;
    if (p.build) h += `<div class="note">Building ${p.build.type === 'rail' ? 'railway' : p.build.type === 'fort' ? 'fortifications' : 'factory'} — ${p.build.turns} month${p.build.turns > 1 ? 's' : ''} left.</div>`;
    else {
      const b = (t, label) => `<button class="btn" data-act="build" data-t="${t}" ${!canBuild(G.player, i, t) || n.money < COSTS[t] ? 'disabled' : ''}>${label}<br><small>${COSTS[t]} funds · ${BUILD_TURNS[t]} mo</small></button>`;
      h += `<div class="row">${b('factory', 'Factory (+1 IC)')}${b('rail', 'Railway')}${b('fort', 'Fortifications')}</div>`;
    }
    h += `<h3>Raise a new army</h3>`;
    if (!canRaise(G.player, i)) h += '<p class="muted">Armies can only be raised in your own supplied provinces.</p>';
    else {
      const opt = (d, a) => { const cost = d * COSTS.div + a * COSTS.art, mun = a * COSTS.artMun + d * COSTS.divMun; const ok = n.money >= cost && n.mp >= d * DIV_MEN && n.mun >= mun; return `<button class="btn" data-act="raise" data-d="${d}" data-a="${a}" ${ok ? '' : 'disabled'}>${d} div + ${a} art<br><small>${cost} funds · ${d * DIV_MEN}k men · ${mun} mun</small></button>`; };
      h += `<div class="row">${opt(2, 0)}${opt(4, 1)}${opt(6, 2)}</div><p class="muted">New armies need a month to organise before they can move.</p>`;
    }
  }
  return h;
}

function panelArmy() {
  const a = selArmy(); if (!a) return '<p class="muted">Select an army on the map.</p>';
  const own = a.nat === G.player, n = N(a.nat), p = P(a.prov);
  const pw = groupAttack([a], a.prov).pow, dp = groupDefense([a], a.prov, 0).pow;
  let h = `<h2>${esc(a.name)}</h2><div class="sub">${flag(a.nat)} ${NATIONS[a.nat].adj} army at ${esc(p.name)}${!supplied(a) ? ' — <b style="color:#9b2f24">OUT OF SUPPLY</b>' : ''}</div>`;
  h += `<div class="grid">
    <div class="kv"><span>Divisions</span><span>${a.div}</span></div><div class="kv"><span>Men</span><span>${fmtMen(armyMen(a))}</span></div>
    <div class="kv"><span>Artillery</span><span>${fmt(a.art, 1)} bde</span></div><div class="kv"><span>Tanks</span><span>${fmt(a.tanks, 1)} bn</span></div>
    <div class="kv"><span>Attack</span><span>${fmt(pw, 1)}</span></div><div class="kv"><span>Defence</span><span>${fmt(dp, 1)}</span></div>
    <div class="kv"><span>Experience</span><span>${Math.round(a.exp * 100)}%</span></div><div class="kv"><span>Entrenched</span><span class="pips">${'▬'.repeat(a.ent) || '—'}</span></div></div>`;
  h += `<div class="row" style="margin-top:8px"><span style="width:84px" class="muted">Strength</span><div class="bar"><i style="width:${a.str * 100}%"></i></div><span>${Math.round(a.str * 100)}%</span></div>`;
  h += `<div class="row"><span style="width:84px" class="muted">Organisation</span><div class="bar org"><i style="width:${a.org * 100}%"></i></div><span>${Math.round(a.org * 100)}%</span></div>`;
  if (!own) return h + `<p class="muted" style="margin-top:12px">${sideTag(a.nat)}</p>`;
  h += `<h3>Orders</h3>`;
  let ord = 'Holding position';
  if (a.fresh) ord = 'Organising — can move next month';
  else if (a.sea !== null) ord = `${hostileProv(a.nat, a.sea) || !friendly(a.nat, a.sea) ? 'Amphibious assault on' : 'Sailing to'} ${P(a.sea).name}`;
  else if (a.path.length) { const t = a.path[a.path.length - 1]; ord = (hostileProv(a.nat, a.path[0]) || !friendly(a.nat, a.path[0]) ? 'Attacking towards ' : 'Marching to ') + P(t).name + ` (${a.path.length} step${a.path.length > 1 ? 's' : ''})`; }
  h += `<div class="note">${ord}${a.hold ? ' · stance: hold' : ''}</div>`;
  h += `<div class="row"><button class="btn primary" data-act="moveMode" ${a.fresh ? 'disabled' : ''}>Move / Attack (M)</button><button class="btn" data-act="cancel">Cancel orders</button></div>`;
  h += `<h3>Reinforce</h3><div class="row">
    <button class="btn" data-act="addUnit" data-t="div" ${n.money < COSTS.div || n.mp < DIV_MEN || n.mun < COSTS.divMun ? 'disabled' : ''}>+1 Division<br><small>${COSTS.div} funds · 15k men · ${COSTS.divMun} mun</small></button>
    <button class="btn" data-act="addUnit" data-t="art" ${n.money < COSTS.art || n.mun < COSTS.artMun ? 'disabled' : ''}>+1 Artillery<br><small>${COSTS.art} funds · ${COSTS.artMun} mun</small></button>
    <button class="btn" data-act="addUnit" data-t="tank" ${!n.fx.tanks || n.money < COSTS.tank ? 'disabled' : ''} title="${n.fx.tanks ? '' : 'Research Landships first'}">+1 Tanks<br><small>${COSTS.tank} funds · ${COSTS.tankMun} mun</small></button></div>
    <p class="muted">Losses are replaced automatically from manpower while the army is in supply.</p>`;
  const others = G.armies.filter(b => b !== a && b.nat === a.nat && b.prov === a.prov).length;
  h += `<h3>Organisation</h3><div class="row"><button class="btn" data-act="split" ${a.div < 2 ? 'disabled' : ''}>Split</button><button class="btn" data-act="merge" ${others ? '' : 'disabled'}>Merge ${others ? `(${others})` : ''}</button><button class="btn danger" data-act="disband">Disband</button></div>`;
  return h;
}

function panelNation() {
  const n = me(); const civ = Math.max(0, 1 - n.sl.mun - n.sl.res);
  let h = `<h2>${NATIONS[G.player].name}</h2><div class="sub">${sideTag(G.player)} · ${dateStr()}</div>`;
  if (!n.side && !n.out) h += `<div class="note">${G.turn === 0 ? 'The July Crisis: war will break out when you end this turn.' : 'Your nation is neutral. You may join a side from the Diplomacy tab.'}</div>`;
  h += `<h3>War Support</h3><div class="row"><div class="bar ws"><i style="width:${n.ws}%"></i></div><b>${Math.round(n.ws)}%</b> <span class="${(n.wsDelta || 0) >= 0 ? 'pos' : 'neg'}" style="font-weight:600">${sgn(n.wsDelta || 0)}</span></div>`;
  if (n.wsWhy && n.wsWhy.length) h += `<div class="why">${n.wsWhy.map(([k, v]) => `<div><span>${k}</span><span class="${v >= 0 ? 'pos' : 'neg'}">${sgn(v)}</span></div>`).join('')}</div>`;
  h += `<p class="muted">Below 40%: strikes cut industry. Very low war support brings mutiny and revolution.</p>`;
  h += `<h3>Production</h3>
    <div class="kv"><span>Industrial capacity</span><span>${fmt(n.ic, 1)}</span></div>
    <label class="muted">Munitions: ${Math.round(n.sl.mun * 100)}%</label><input type="range" class="slider" data-sl="mun" min="0" max="80" value="${Math.round(n.sl.mun * 100)}">
    <label class="muted">Research: ${Math.round(n.sl.res * 100)}%</label><input type="range" class="slider" data-sl="res" min="0" max="50" value="${Math.round(n.sl.res * 100)}">
    <div class="kv"><span>Civilian economy (funds)</span><span>${Math.round(civ * 100)}%</span></div>`;
  h += `<h3>Budget (per month)</h3><div class="grid">
    <div class="kv"><span>Income</span><span class="pos">${fmt(n.income)}</span></div><div class="kv"><span>Expenses</span><span class="neg">${fmt(n.expenses)}</span></div>
    <div class="kv"><span>Munitions made</span><span>${fmt(n.munProd)}</span></div><div class="kv"><span>Upkeep use</span><span>${fmt(n.munIdle)}</span></div>
    <div class="kv"><span>Manpower</span><span>+${fmtMen(n.mpGain)}</span></div><div class="kv"><span>Research</span><span>+${fmt(n.rpGain, 1)}</span></div>
    <div class="kv"><span>Trade access</span><span>${Math.round(n.access * 100)}%</span></div><div class="kv"><span>Food shortage</span><span class="${n.shortage > 0.01 ? 'neg' : ''}">${Math.round(n.shortage * 100)}%</span></div></div>`;
  h += `<h3>Policies</h3><div class="muted">Conscription</div><div class="row">${['volunteer', 'conscription', 'total'].map(c => `<button class="btn ${n.policy.consc === c ? 'on' : ''}" data-act="consc" data-v="${c}">${{ volunteer: 'Volunteers', conscription: 'Conscription', total: 'Total mobilisation' }[c]}</button>`).join('')}</div>
    <div class="row" style="margin-top:6px"><button class="btn ${n.policy.propaganda ? 'on' : ''}" data-act="pol" data-v="propaganda">Propaganda campaign <small>(−12/mo, +1 WS)</small></button>
    <button class="btn ${n.policy.bonds ? 'on' : ''}" data-act="pol" data-v="bonds">War bonds <small>(+25/mo, −0.3 WS)</small></button></div>`;
  if (n.fx.sub) h += `<div class="row" style="margin-top:6px"><button class="btn ${n.policy.sub ? 'on' : ''}" data-act="pol" data-v="sub">Unrestricted submarine warfare</button></div><p class="muted">Sinks enemy trade (−40% overseas access for the Entente) but angers America (tension ${Math.round(G.usaTension)}/100).</p>`;
  h += `<h3>Navy</h3><div class="kv"><span>Capital ships</span><span>${n.fleet}${n.fleetBuild ? ` (+1 in ${n.fleetBuild} mo)` : ''}</span></div>
    <div class="row"><button class="btn" data-act="ship" ${n.money < COSTS.ship || n.fleetBuild ? 'disabled' : ''}>Lay down a dreadnought <small>(${COSTS.ship}, 10 mo)</small></button>
    <button class="btn" data-act="sortie" ${!n.side || (n.sortieCd || 0) > G.turn ? 'disabled' : ''}>Seek decisive battle</button></div>
    <div class="muted">Sea control — Atlantic & Mediterranean: <b>${seaName(G.seaCtrl.open)}</b> · Baltic: <b>${seaName(G.seaCtrl.baltic)}</b> · Black Sea: <b>${seaName(G.seaCtrl.black)}</b></div>`;
  if (n.side) h += `<h3>Peace</h3><button class="btn danger" data-act="sue">Sue for peace</button><p class="muted">The enemy will demand the provinces they occupy.</p>`;
  return h;
}
function seaName(s) { return s === 'E' ? 'Entente' : s === 'C' ? 'Central Powers' : 'contested'; }

function panelDip() {
  const id = UI.dipSel;
  if (id && id !== G.player) return panelDipNation(id);
  const groups = { E: [], C: [], N: [], X: [] };
  for (const k in G.nations) { const n = N(k); groups[n.out ? 'X' : n.side || 'N'].push(k); }
  let h = `<h2>Diplomacy</h2><div class="sub">The alliances of Europe</div>`;
  if (!me().side && !me().out) h += `<div class="note">You are neutral. ${G.turn === 0 ? 'War begins at the end of this turn.' : ''}</div><div class="row"><button class="btn primary" data-act="joinSide" data-v="E" ${G.turn === 0 ? 'disabled' : ''}>Join the Entente</button><button class="btn primary" data-act="joinSide" data-v="C" ${G.turn === 0 ? 'disabled' : ''}>Join the Central Powers</button></div>`;
  const names = { E: 'The Entente', C: 'The Central Powers', N: 'Neutrals', X: 'At peace' };
  for (const g of ['E', 'C', 'N', 'X']) {
    if (!groups[g].length) continue;
    h += `<h3>${names[g]}</h3><div class="list">` + groups[g].map(k => {
      const n = N(k), r = rel(G.player, k);
      return `<div class="item" data-act="dipSel" data-id="${k}">${flag(k)}<div class="grow"><b>${NATIONS[k].short}</b>${k === G.player ? ' <i class="muted">(you)</i>' : ''}<div class="muted">War support ${Math.round(n.ws)}%${hasDeal(G.player, k) ? ' · trade deal' : ''}</div></div>${k !== G.player ? `<span class="${r >= 0 ? 'pos' : 'neg'}" style="font-weight:600">${r > 0 ? '+' : ''}${Math.round(r)}</span>` : ''}</div>`;
    }).join('') + '</div>';
  }
  if (sideOf('USA') === null && !N('USA').out) h += `<p class="muted">American tension with Germany: <b>${Math.round(G.usaTension)}/100</b></p>`;
  return h;
}
function panelDipNation(id) {
  const n = N(id), m = me(), my = m.side;
  let h = `<button class="btn" data-act="dipSel" data-id="">← All nations</button><h2 style="margin-top:8px">${flag(id)} ${NATIONS[id].name}</h2><div class="sub">${sideTag(id)}</div>`;
  if (NATIONS[id].blurb) h += `<p class="muted">${NATIONS[id].blurb}</p>`;
  h += `<div class="grid"><div class="kv"><span>Relations</span><span>${Math.round(rel(G.player, id))}</span></div><div class="kv"><span>War support</span><span>${Math.round(n.ws)}%</span></div>
    <div class="kv"><span>Divisions</span><span>${nArmies(id).reduce((t, a) => t + a.div, 0)}</span></div><div class="kv"><span>Fleet</span><span>${n.fleet}</span></div>
    <div class="kv"><span>Industry</span><span>${fmt(n.ic, 0)}</span></div><div class="kv"><span>Occupied</span><span>${Math.round(occupiedFrac(id) * 100)}%</span></div></div>`;
  h += `<h3>Actions</h3><div class="row">`;
  h += `<button class="btn" data-act="improve" data-id="${id}" ${m.money < COSTS.relations || atWar(G.player, id) ? 'disabled' : ''}>Improve relations <small>(${COSTS.relations})</small></button>`;
  const neutralOrAlly = !atWar(G.player, id) && !n.out;
  if (neutralOrAlly && !hasDeal(G.player, id) && (!n.side || n.side === my)) h += `<button class="btn" data-act="deal" data-id="${id}" ${m.money < COSTS.deal ? 'disabled' : ''}>Propose trade deal <small>(${COSTS.deal})</small></button>`;
  if (hasDeal(G.player, id)) h += `<button class="btn" data-act="canceldeal" data-id="${id}">Cancel trade deal</button>`;
  if (n.side && n.side === my) h += `<button class="btn" data-act="subsidy" data-id="${id}" ${m.money < 50 ? 'disabled' : ''}>Send subsidy <small>(50)</small></button>`;
  h += `</div>`;
  if (my && !n.side && !n.out) {
    const sc = joinScore(id, my);
    h += `<h3>Bring them into the war</h3><div class="row"><span class="muted">Inclination to join us</span><div class="bar"><i style="width:${clamp(sc / 80 * 100, 0, 100)}%"></i></div><b>${Math.round(sc)}</b></div>`;
    h += `<div class="row"><button class="btn primary" data-act="invite" data-id="${id}">Invite to join the war</button></div>`;
    const claims = (CLAIMS[id] || []).filter(k => { const o = P(MAP.idx[k]).owner; return sideOf(o) && sideOf(o) !== my; });
    if (claims.length) {
      h += `<div class="muted" style="margin-top:6px">Promise territory (secret treaty, +25 inclination each):</div><div class="row">` + claims.map(k => { const i = MAP.idx[k]; const done = G.promises.some(p => p.prov === i && p.side === my); return `<button class="btn ${done ? 'on' : ''}" data-act="promise" data-id="${id}" data-k="${k}" ${done ? 'disabled' : ''}>${P(i).name} <small>(${NATIONS[P(i).owner].short})</small></button>`; }).join('') + `</div>`;
    }
  }
  if (atWar(G.player, id)) {
    h += `<h3>Peace</h3><div class="row"><button class="btn" data-act="peace" data-id="${id}" data-v="white">Offer separate peace</button><button class="btn" data-act="peace" data-id="${id}" data-v="demand">Demand they cede occupied land</button></div><p class="muted">Nations with low war support, or with much of their land occupied, are more willing to negotiate.</p>`;
  }
  const pr = G.promises.filter(p => p.to === id || p.from === id);
  if (pr.length) h += `<h3>Secret treaties</h3>` + pr.map(p => `<div class="muted">${NATIONS[p.from].short} promised ${P(p.prov).name} to ${NATIONS[p.to].short}</div>`).join('');
  return h;
}

function panelRes() {
  const n = me();
  let h = `<h2>Research</h2><div class="sub">${fmt(n.rpGain, 1)} research points per month</div>`;
  if (n.res) { const c = techCost(n, n.res.id); h += `<div class="note"><b>${TECH[n.res.id].name}</b><div class="row"><div class="bar res"><i style="width:${Math.min(100, n.res.prog / c * 100)}%"></i></div>${Math.round(n.res.prog)}/${c} · ~${Math.max(1, Math.ceil((c - n.res.prog) / n.rpGain))} mo</div></div>`; }
  else h += `<div class="note">No research in progress — choose a technology. ${n.rp ? `(${Math.round(n.rp)} banked points)` : ''}</div>`;
  h += `<p class="muted">Technologies researched before their historical year cost more. Switching projects loses the progress made.</p>`;
  for (const cat of TECH_CATS) {
    h += `<h3>${cat}</h3><div class="techs">`;
    for (const t of TECHS.filter(t => t.cat === cat)) {
      const done = n.techs.includes(t.id), avail = techAvailable(n, t.id), cur = n.res && n.res.id === t.id;
      const cls = done ? 'done' : cur ? 'cur' : avail ? '' : 'locked';
      h += `<div class="tech ${cls}" ${!done && avail && !cur ? `data-act="research" data-id="${t.id}"` : ''}><div class="row"><span class="tn">${done ? '✓ ' : ''}${t.name}</span><span class="muted" style="margin-left:auto">${done ? '' : techCost(n, t.id) + ' pts · ' + t.year}</span></div><div class="muted">${t.desc}${!done && !avail ? ' Requires: ' + t.req.map(r => TECH[r].name).join(', ') : ''}</div></div>`;
    }
    h += `</div>`;
  }
  return h;
}

function panelTrade() {
  const n = me(); const my = n.side;
  let h = `<h2>Trade & Blockade</h2><div class="sub">Food, raw materials and munitions from abroad</div>`;
  h += `<div class="grid"><div class="kv"><span>Trade access</span><span>${Math.round(n.access * 100)}%</span></div><div class="kv"><span>Trade income</span><span>${fmt(n.tradeMoney || 0)}</span></div>
    <div class="kv"><span>Food import need</span><span>${Math.round(Math.max(0, NATIONS[G.player].food) * 100)}%</span></div><div class="kv"><span>Shortage</span><span class="${n.shortage > 0.01 ? 'neg' : ''}">${Math.round(n.shortage * 100)}%</span></div></div>`;
  h += `<div class="note">Allied blockade of the Central Powers: <b>${Math.round(G.blockade * 100)}%</b> effective. ${my === 'C' && G.seaCtrl.open === 'E' ? 'Overseas trade is cut off entirely while the Royal Navy holds the seas; only neighbouring neutrals can trade with us, and the blockade tightens on them each month.' : ''}${my === 'E' && N('GER').policy.sub && sideOf('GER') ? ' German U-boats are sinking our shipping without warning.' : ''}${G.player === 'RUS' && !dardanellesOpen() ? ' The Dardanelles are closed: Russia\'s trade is crippled.' : ''}</div>`;
  if (EMPIRE_ACCESS[G.player]) h += `<p class="muted">Colonial empire provides ${Math.round(EMPIRE_ACCESS[G.player] * 100)}% base access via the sea lanes.</p>`;
  h += `<h3>Trading partners</h3><table class="t"><tr><th>Partner</th><th>Status</th><th class="r">Value</th><th></th></tr>`;
  for (const k in TRADE_VAL) {
    if (k === G.player) continue; const t = N(k);
    const enemy = atWar(G.player, k); if (enemy) continue;
    const deal = hasDeal(G.player, k);
    const route = !my ? 'open' : NEAR_NEUTRAL.has(k) ? (my === 'C' ? `blockade −${Math.round(G.blockade * 100)}%` : 'open') : (my === 'C' && G.seaCtrl.open === 'E' ? '<span class="neg">blockaded</span>' : 'sea lanes');
    h += `<tr><td>${flag(k)} ${NATIONS[k].short}${t.side ? ' ' + sideTag(k) : ''}</td><td>${deal ? '<b>deal</b> · ' : ''}${route}</td><td class="r">${Math.round(TRADE_VAL[k] * 100)}</td><td class="r">${deal ? `<button class="btn" data-act="canceldeal" data-id="${k}">Cancel</button>` : `<button class="btn" data-act="deal" data-id="${k}" ${n.money < COSTS.deal || (t.side && t.side !== my) ? 'disabled' : ''}>Propose</button>`}</td></tr>`;
  }
  h += `</table>`;
  return h;
}

function panelLedger() {
  let h = `<h2>The Ledger</h2><div class="sub">${dateStr()} · month ${G.turn + 1} of the war</div>`;
  const ws = warScore(sideOf(G.player) || 'E');
  h += `<div class="kv"><span>War score (${sideOf(G.player) === 'C' ? 'Central Powers' : 'Entente'})</span><span class="${ws >= 0 ? 'pos' : 'neg'}">${ws > 0 ? '+' : ''}${ws}</span></div>`;
  h += `<h3>The belligerents</h3><table class="t"><tr><th>Nation</th><th class="r">Div</th><th class="r">WS</th><th class="r">Losses</th><th class="r">Inflicted</th></tr>`;
  const rows = Object.keys(G.nations).filter(k => N(k).side || N(k).stats.cas > 0).sort((a, b) => (N(a).side || 'Z').localeCompare(N(b).side || 'Z') || N(b).stats.cas - N(a).stats.cas);
  for (const k of rows) { const n = N(k); h += `<tr><td>${flag(k)} ${NATIONS[k].short} ${n.side ? `<span class="tag ${n.side}">${n.side}</span>` : n.out ? '<span class="tag X">out</span>' : ''}</td><td class="r">${nArmies(k).reduce((t, a) => t + a.div, 0)}</td><td class="r">${Math.round(n.ws)}%</td><td class="r">${fmtMen(n.stats.cas)}</td><td class="r">${fmtMen(n.stats.kills)}</td></tr>`; }
  h += `</table><p class="muted">Losses count killed, wounded, captured and missing.</p>`;
  h += `<h3>Despatches</h3>`;
  h += G.log.slice().reverse().slice(0, 80).map(l => `<div class="logline ${l.type}"><span class="dt">${dateStr(l.t)}:</span>${esc(l.txt)}</div>`).join('');
  return h;
}

// ---------- actions ----------
const ACTIONS = {
  selArmy: d => { const a = G.armies.find(x => x.id === +d.id); if (a) { UI.sel.army = a.id; UI.sel.prov = a.prov; UI.tab = 'army'; } },
  build: d => { startBuild(G.player, UI.sel.prov, d.t); },
  raise: d => { const a = raiseArmy(G.player, UI.sel.prov, +d.d, +d.a); if (a) { UI.sel.army = a.id; UI.tab = 'army'; } },
  addUnit: d => { const a = selArmy(); if (a && !addUnits(a, d.t)) toast('Cannot reinforce here (needs supply, funds, men or munitions).'); },
  moveMode: () => { UI.moveMode = true; },
  cancel: () => { const a = selArmy(); if (a) { a.path = []; a.sea = null; a.violate = false; } },
  split: () => { const a = selArmy(); if (a) { const b = splitArmy(a); if (b) UI.sel.army = b.id; } },
  merge: () => { const a = selArmy(); if (a) mergeArmies(a); },
  disband: () => { const a = selArmy(); if (a) confirmBox(`Disband the ${a.name}? Some of its men return to the manpower pool.`, () => { disband(a); UI.sel.army = null; UI.tab = 'prov'; refresh(); }); },
  consc: d => { me().policy.consc = d.v; },
  pol: d => { const p = me().policy; p[d.v] = !p[d.v]; },
  ship: () => { buildShip(G.player); },
  sortie: () => { const r = fleetSortie(G.player); toast(r.msg); },
  sue: () => confirmBox('Sue for peace? If the enemy accepts, you will cede every province they occupy and leave the war.', () => { const r = playerPeace(Object.keys(G.nations).find(k => atWar(G.player, k)), 'sue'); toast(r.msg); refreshAll(); checkOver(); }),
  dipSel: d => { UI.dipSel = d.id || null; },
  improve: d => { if (!improveRelations(G.player, d.id)) toast('Not enough funds.'); },
  deal: d => { const r = requestDeal(G.player, d.id); toast(r.msg); },
  canceldeal: d => { cancelDeal(G.player, d.id); },
  subsidy: d => { subsidize(G.player, d.id); },
  invite: d => { const r = inviteToWar(G.player, d.id); toast(r.msg); refreshAll(); },
  promise: d => { promise(G.player, d.id, d.k); },
  peace: d => { const r = playerPeace(d.id, d.v); toast(r.msg); refreshAll(); checkOver(); },
  joinSide: d => { joinSide(G.player, d.v); refreshAll(); },
  research: d => { const n = me(); const go = () => { n.res = { id: d.id, prog: n.rp || 0 }; n.rp = 0; renderSide(); }; if (n.res && n.res.prog > 5) confirmBox(`Switch research? Progress on ${TECH[n.res.id].name} will be lost.`, go); else go(); },
};
function refresh() { calcEconomy(me(), true); renderSide(); draw(); }
function refreshAll() { updateSeaControl(); computeSupply(); calcEconomy(me(), true); recolor(); renderSide(); }

// ---------- orders ----------
function expectedHostile(target) {
  // in July 1914, will this nation be an enemy once war starts?
  const ps = ALLIANCE_START.E.includes(G.player) ? 'E' : ALLIANCE_START.C.includes(G.player) ? 'C' : (G.plans.GER === 'W' && ['GBR', 'BEL', 'LUX'].includes(G.player) ? 'E' : null);
  if (!ps) return false;
  let ts = ALLIANCE_START.E.includes(target) ? 'E' : ALLIANCE_START.C.includes(target) ? 'C' : null;
  if (G.plans.GER === 'W' && ['GBR', 'BEL', 'LUX'].includes(target)) ts = 'E';
  return ts && ts !== ps;
}
function orderTo(i) {
  const a = selArmy(); if (!a || a.nat !== G.player) return;
  UI.moveMode = false;
  if (a.fresh) { toast('This army is still organising and can move next month.'); return; }
  if (i === a.prov) { a.path = []; a.sea = null; refresh(); return; }
  const tgt = P(i).ctrl;
  const neutralTarget = !friendly(G.player, i) && !hostileProv(G.player, i);
  const go = () => {
    const r = orderMove(a, i);
    if (!r.ok) { toast('No route to ' + P(i).name + '.'); return; }
    if (neutralTarget) a.violate = true;
    refresh();
  };
  if (neutralTarget) {
    if (G.turn === 0 && expectedHostile(tgt)) { go(); return; }
    if (!me().side && G.turn > 0) { toast('You are not at war. Join a side in the Diplomacy tab first.'); return; }
    if (tgt === G.player) { go(); return; }
    confirmBox(`Invading ${NATIONS[tgt].short} will violate its neutrality: it will join the enemy and every neutral will think less of us.${['BEL', 'NED', 'LUX'].includes(tgt) && !sideOf('GBR') ? ' Britain will certainly declare war.' : ''} Proceed?`, go);
    return;
  }
  go();
}

// ---------- input ----------
function setupInput() {
  const c = cv(); const ptrs = new Map(); let drag = null, pinch = null;
  c.addEventListener('pointerdown', e => {
    c.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (ptrs.size === 1) drag = { x: e.offsetX, y: e.offsetY, ox: UI.ox, oy: UI.oy, moved: false, button: e.button };
    if (ptrs.size === 2) { const [p1, p2] = [...ptrs.values()]; pinch = { d: Math.hypot(p1.x - p2.x, p1.y - p2.y), s: UI.s }; drag = null; }
  });
  c.addEventListener('pointermove', e => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (pinch && ptrs.size === 2) { const [p1, p2] = [...ptrs.values()]; const d = Math.hypot(p1.x - p2.x, p1.y - p2.y); const cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2; zoomAt((pinch.s * d / pinch.d) / UI.s, cx, cy); return; }
    if (drag && (Math.abs(e.offsetX - drag.x) + Math.abs(e.offsetY - drag.y) > 5 || drag.moved)) { drag.moved = true; UI.ox = drag.ox + e.offsetX - drag.x; UI.oy = drag.oy + e.offsetY - drag.y; clampView(); draw(); $('tooltip').style.display = 'none'; return; }
    hoverAt(e.offsetX, e.offsetY);
  });
  const up = e => {
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
    if (drag && !drag.moved && ptrs.size === 0) { if (drag.button === 2) rightClick(e.offsetX, e.offsetY); else leftClick(e.offsetX, e.offsetY); }
    if (ptrs.size === 0) drag = null;
  };
  c.addEventListener('pointerup', up); c.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); drag = null; pinch = null; });
  c.addEventListener('pointerleave', () => { UI.hover = null; $('tooltip').style.display = 'none'; UI.preview = null; draw(); });
  c.addEventListener('contextmenu', e => e.preventDefault());
  c.addEventListener('wheel', e => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.0015), e.offsetX, e.offsetY); }, { passive: false });
  $('zin').onclick = () => zoomAt(1.3, UI.vw / 2, UI.vh / 2); $('zout').onclick = () => zoomAt(1 / 1.3, UI.vw / 2, UI.vh / 2);
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', e => {
    if ($('modal').classList.contains('show') || $('start').style.display !== 'none') return;
    if (e.key === 'Escape') { if (UI.moveMode) UI.moveMode = false; else { UI.sel = { prov: null, army: null }; if (UI.tab === 'army' || UI.tab === 'prov') UI.tab = 'nation'; } renderSide(); draw(); }
    if ((e.key === 'm' || e.key === 'M') && selArmy() && selArmy().nat === G.player) { UI.moveMode = true; updateHint(); }
    if (e.key === 'Enter' && !e.repeat) doEndTurn();
  });
  $('panel').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b || b.disabled) return; const f = ACTIONS[b.dataset.act]; if (f) { f(b.dataset); refresh(); } });
  $('panel').addEventListener('input', e => {
    const sl = e.target.dataset.sl; if (!sl) return; const n = me(); const v = +e.target.value / 100;
    n.sl[sl] = v; if (n.sl.mun + n.sl.res > 1) n.sl[sl === 'mun' ? 'res' : 'mun'] = 1 - v;
    calcEconomy(n, true); e.target.previousElementSibling.textContent = (sl === 'mun' ? 'Munitions: ' : 'Research: ') + Math.round(v * 100) + '%'; renderTop();
  });
  $('panel').addEventListener('change', e => { if (e.target.dataset.sl) renderSide(); });
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { if (!b.disabled) setTab(b.dataset.tab); });
  document.querySelectorAll('#mapmodes button').forEach(b => b.onclick = () => { UI.mode = b.dataset.mode; document.querySelectorAll('#mapmodes button').forEach(x => x.classList.toggle('on', x === b)); recolor(); });
  $('endturn').onclick = doEndTurn;
  $('btnSave').onclick = () => toast(saveGame() ? 'Game saved in this browser.' : 'Could not save in this browser.');
  $('btnMenu').onclick = () => confirmBox('Return to the main menu? Unsaved progress will be lost.', showStart);
}
function counterAt(x, y) { for (let k = UI.counters.length - 1; k >= 0; k--) { const c = UI.counters[k]; if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return c; } return null; }
function leftClick(x, y) {
  const a = selArmy();
  if (UI.moveMode && a) { const i = provAt(x, y); if (i !== null) orderTo(i); UI.moveMode = false; renderSide(); draw(); return; }
  const c = counterAt(x, y);
  if (c) {
    const ids = c.ids; let next = ids[0];
    if (ids.includes(UI.sel.army)) next = ids[(ids.indexOf(UI.sel.army) + 1) % ids.length];
    UI.sel = { prov: c.prov, army: next }; UI.tab = 'army'; renderSide(); draw(); return;
  }
  const i = provAt(x, y);
  if (i === null) { UI.sel = { prov: null, army: null }; if (UI.tab === 'army' || UI.tab === 'prov') UI.tab = 'nation'; renderSide(); draw(); return; }
  UI.sel = { prov: i, army: null }; UI.tab = 'prov';
  renderSide(); draw();
}
function rightClick(x, y) {
  const a = selArmy(); if (!a || a.nat !== G.player) return;
  const i = provAt(x, y); if (i === null) return; orderTo(i); renderSide(); draw();
}
function hoverAt(x, y) {
  const i = provAt(x, y); const tt = $('tooltip');
  const c = counterAt(x, y);
  if (i !== UI.hover) { UI.hover = i; draw(); }
  if (i === null && !c) { tt.style.display = 'none'; UI.preview = null; return; }
  let h = '';
  if (c) {
    const arms = c.ids.map(id => G.armies.find(a => a.id === id)).filter(Boolean);
    h = `<b>${NATIONS[c.nat].adj} forces</b><br>` + arms.map(a => `${esc(a.name)}: ${a.div} div, ${Math.round(a.str * 100)}% str, org ${Math.round(a.org * 100)}%, ent ${a.ent}`).join('<br>');
  } else {
    const p = P(i);
    const gp = garrisonPow(p);
    h = `<b>${esc(p.name)}</b><br>${NATIONS[p.owner].short}${p.ctrl !== p.owner ? ` <span style="color:#9b2f24">(held by ${NATIONS[p.ctrl].short})</span>` : ''} · ${p.terr}${p.fort ? ' · fortress ' + p.fort : ''}${gp ? ' · garrison ' + gp.toFixed(0) : ''}`;
    const arms = armiesIn(i); if (arms.length) h += '<br>' + Object.entries(arms.reduce((m, a) => (m[a.nat] = (m[a.nat] || 0) + a.div, m), {})).map(([k, v]) => `${NATIONS[k].adj}: ${v} div`).join(' · ');
    const b = G.report && G.report.battles ? G.report.battles.find(b => b.prov === i && !b.empty) : null;
    if (b) h += `<br><i>Battle last month: ${b.atk.map(k => NATIONS[k].adj).join('-')} attack ${b.result}. Losses ${fmtMen(b.atkLoss)} / ${fmtMen(b.defLoss)}</i>`;
    const a = selArmy();
    UI.preview = null;
    if (a && a.nat === G.player && i !== a.prov && !a.fresh) {
      if (LADJ[a.prov].includes(i) && hostileProv(G.player, i)) {
        const group = G.armies.filter(x => x.nat === G.player && (x.id === a.id || (x.path[0] === i && LADJ[x.prov].includes(i))));
        const e = estimateBattle(group, i);
        const r = e.ratio; const word = e.empty ? 'undefended — will be taken' : r > 2 ? 'overwhelming' : r > 1.4 ? 'favourable' : r > 1 ? 'even' : r > 0.7 ? 'poor' : 'hopeless';
        h += `<div class="odds" style="color:${r > 1.3 ? '#2f5a2a' : r > 1 ? '#7a5a1a' : '#9b2f24'}">Attack odds: ${word}${e.empty ? '' : ' (×' + r.toFixed(2) + ')'}</div>`;
      } else {
        const path = findPath(G.player, a.prov, i);
        if (path) { UI.preview = [a.prov, ...path]; h += `<div class="odds">${path.length} province${path.length > 1 ? 's' : ''} away${path.some(j => !friendly(G.player, j)) ? ' · through enemy lines' : ''}</div>`; }
        else if (seaRoute(G.player, a.prov, i)) h += `<div class="odds" style="color:#1d3f73">By sea${hostileProv(G.player, i) ? ' — amphibious assault' : ''}</div>`;
        else h += `<div class="odds" style="color:#9b2f24">No route</div>`;
      }
      draw();
    }
  }
  tt.innerHTML = h; tt.style.display = 'block';
  const r = $('mapwrap').getBoundingClientRect();
  let tx = x + 16, ty = y + 16; if (tx + 290 > r.width) tx = x - 290; if (ty + 120 > r.height) ty = y - 110;
  tt.style.left = tx + 'px'; tt.style.top = ty + 'px';
}

// ---------- modals ----------
function modal(html, cls) { const m = $('modal'); m.innerHTML = `<div class="paper ${cls || ''}">${html}</div>`; m.classList.add('show'); return m; }
function closeModal() { $('modal').classList.remove('show'); $('modal').innerHTML = ''; }
function confirmBox(text, yes) {
  const m = modal(`<p style="font-size:16px">${text}</p><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" id="cbNo">Cancel</button><button class="btn primary" id="cbYes">Confirm</button></div>`);
  m.querySelector('#cbNo').onclick = closeModal; m.querySelector('#cbYes').onclick = () => { closeModal(); yes(); };
}
let toastT = null;
function toast(msg) {
  let t = $('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.style.cssText = 'position:fixed;left:50%;top:66px;transform:translateX(-50%);background:#2f271f;color:#f2e8d0;border:1px solid #c9a35a;padding:9px 16px;border-radius:3px;z-index:50;font-size:15px;box-shadow:0 4px 14px rgba(0,0,0,.5);max-width:90vw;text-align:center'; document.body.appendChild(t); }
  t.textContent = msg; t.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => t.style.display = 'none', 3800);
}

// ---------- turn flow ----------
let busy = false;
function doEndTurn() {
  if (busy || !G || G.over || $('modal').classList.contains('show')) return;
  busy = true; $('endturn').disabled = true;
  setTimeout(() => {
    try {
      endTurn();
      for (const a of G.armies) a.violate = false;
    } catch (err) { console.error(err); toast('Error: ' + err.message); }
    busy = false; $('endturn').disabled = false;
    if (UI.sel.army && !selArmy()) { UI.sel.army = null; if (UI.tab === 'army') UI.tab = 'prov'; }
    recolor(); renderSide();
    try { saveGame(); } catch (e) { }
    showReport();
  }, 30);
}
function showReport() {
  const rp = G.report; const ps = sideOf(G.player) || me().lastSide;
  const news = rp.news.filter(n => n.type === 'major' || n.nats.includes(G.player) || n.nats.length === 0);
  const rel = b => b.atk.includes(G.player) || b.def.includes(G.player) ? 3 : (ps && (b.atk.some(k => sideOf(k) === ps) || b.def.some(k => sideOf(k) === ps))) ? 1 : 0;
  const battles = rp.battles.filter(b => !b.empty || b.atk.includes(G.player) || b.def.includes(G.player)).sort((a, b) => rel(b) - rel(a) || (b.atkLoss + b.defLoss) - (a.atkLoss + a.defLoss)).slice(0, 14);
  const headline = (news.find(n => n.type === 'major') || {}).txt;
  let h = `<div class="kicker">THE DAILY DESPATCH · ${rp.date ? rp.date.toUpperCase() : ''}</div>`;
  if (headline) h += `<h1 style="${headline.length > 90 ? 'font-size:24px' : headline.length > 60 ? 'font-size:28px' : ''}">${esc(headline)}</h1>`;
  else h += `<h1>${battles.length ? 'Heavy Fighting Reported' : 'All Quiet on the Front'}</h1>`;
  h += `<div class="news">`;
  for (const n of news) if (n.txt !== headline) h += `<div class="it ${n.type}">${esc(n.txt)}</div>`;
  if (battles.length) {
    h += `<div class="it"><b style="font-family:'IM Fell English SC',serif">From the Front</b></div>`;
    for (const b of battles) {
      const atkN = b.atk.map(k => NATIONS[k].adj).join('-');
      const mine = b.atk.includes(G.player) ? 'atk' : (b.def.includes(G.player) || b.ctrlBefore === G.player) ? 'def' : null;
      let res = b.empty ? `${atkN} troops occupy it unopposed` : b.result === 'captured' ? (b.garrison ? `taken by ${atkN} troops` : `${atkN} breakthrough`) : `${atkN} attack repulsed`;
      const good = mine === 'atk' ? b.result === 'captured' : mine === 'def' ? b.result !== 'captured' : null;
      h += `<div class="battle"><span class="bn">${b.empty ? '' : 'Battle of '}${esc(P(b.prov).name)}</span><span class="res" style="color:${good === null ? 'inherit' : good ? '#2f5a2a' : '#9b2f24'}">${res}</span>${b.empty ? '' : `<span class="muted">${b.garrison ? b.atkDiv + ' div vs local garrison' : b.atkDiv + ' vs ' + b.defDiv + ' div'}${b.ent ? ', defenders entrenched (' + b.ent + ')' : ''}${mine === 'def' && b.result === 'captured' ? ' — <b style="color:#9b2f24">our territory</b>' : ''}</span><span class="muted">${fmtMen(b.atkLoss)} / ${fmtMen(b.defLoss)} lost</span>`}</div>`;
    }
  }
  h += `</div><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn primary" id="rpOk">Continue</button></div>`;
  const m = modal(h);
  m.querySelector('#rpOk').onclick = () => { closeModal(); showPending(); };
}
function showPending() {
  if (G.over) { checkOver(); return; }
  const id = G.pending[0]; if (!id) return;
  const ev = EVENTS.find(e => e.id === id);
  let h = `<div class="kicker">URGENT · ${dateStr().toUpperCase()}</div><h1>${ev.title}</h1><div class="telegram">${esc(ev.text)}</div><div class="choices">` + ev.choices.map((c, k) => `<button class="choice" data-k="${k}"><b>${esc(c.label)}</b></button>`).join('') + `</div>`;
  const m = modal(h);
  m.querySelectorAll('.choice').forEach(b => b.onclick = () => { resolvePending(id, +b.dataset.k); closeModal(); refreshAll(); showPending(); });
}
function checkOver() {
  if (!G.over) return;
  const won = G.over.winner && G.over.winner === (me().lastSide || sideOf(G.player));
  const n = me();
  let h = `<div class="kicker">ARMISTICE · ${dateStr().toUpperCase()}</div><h1>${G.over.winner ? (G.over.winner === 'E' ? 'Victory for the Entente' : 'Victory for the Central Powers') : 'Peace'}</h1>`;
  h += `<p style="text-align:center;font-style:italic">${esc(G.over.reason)}</p>`;
  h += `<p>${NATIONS[G.player].name} ${won ? 'emerges among the victors' : G.over.winner ? 'shares in the defeat' : 'has laid down its arms'}. Over ${G.turn} months of war the nation suffered <b>${fmtMen(n.stats.cas)}</b> casualties and inflicted <b>${fmtMen(n.stats.kills)}</b>.</p>`;
  const owned = G.provs.filter(p => p.owner === G.player).length, orig = PROV_DATA.filter(p => p[4] === G.player).length;
  h += `<p>Provinces held: <b>${owned}</b> (began with ${orig}).</p>`;
  h += `<div class="row" style="justify-content:flex-end"><button class="btn" id="goMap">View the map</button><button class="btn primary" id="goMenu">New game</button></div>`;
  const m = modal(h);
  m.querySelector('#goMap').onclick = closeModal; m.querySelector('#goMenu').onclick = () => { closeModal(); showStart(); };
}

// ---------- start ----------
const DIFF = { GER: 'Moderate', FRA: 'Moderate', GBR: 'Easy', RUS: 'Hard', AUH: 'Hard', ITA: 'Moderate', OTT: 'Hard', SRB: 'Very hard', BUL: 'Moderate', ROM: 'Hard', BEL: 'Very hard' };
function showStart() {
  const st = $('start'); st.style.display = 'flex'; G = null;
  let h = `<div class="paper"><div class="kicker">EUROPE · SUMMER 1914</div><h1 class="title">The Great War</h1><div class="subtitle">A grand strategy game of the First World War</div>
    <p style="text-align:center;max-width:640px;margin:0 auto">On 28 June 1914 a Bosnian Serb student shoots Archduke Franz Ferdinand in Sarajevo. Within five weeks the great powers are at war. Choose a nation to lead through the catastrophe.</p>`;
  h += `<div class="row" style="justify-content:center;margin-top:12px">${hasSave() ? '<button class="btn primary" id="cont">Continue saved campaign</button>' : ''}<span class="muted" style="margin-left:10px">Difficulty:</span><button class="btn ${UI.hard ? '' : 'on'}" id="dHist">Historical</button><button class="btn ${UI.hard ? 'on' : ''}" id="dHard">Hard (enemies +15%)</button></div>`;
  h += `<div class="natgrid">` + PLAYABLE.map(id => `<div class="natcard" data-id="${id}"><div class="nm">${flag(id)} ${NATIONS[id].name}</div><div class="df">${DIFF[id]}</div><div class="bl">${NATIONS[id].blurb || ''}</div></div>`).join('') + `</div>`;
  h += `<h3 style="font-family:'IM Fell English SC',serif;margin-top:18px;text-align:center">How to play</h3><div class="howto">
    <p><b>Each turn is one month.</b> Give your orders, then press <b>End Turn</b> (or Enter). All nations move at once; battles are fought and the despatches arrive.</p>
    <p><b>Armies:</b> click a counter to select it, then <b>right-click</b> a province (or press <b>M</b>) to march or attack. Railways carry armies several provinces a month inside friendly territory. Coastal armies can sail if you control the sea.</p>
    <p><b>Combined attacks:</b> order several armies into the same province in one turn and they attack together. Home provinces are also defended by local garrisons and by reserves from neighbouring provinces.</p>
    <p><b>The trenches:</b> armies that stand still dig in — only lightly in the war of movement of 1914, deeper from 1915 and deeper still with research. Entrenched defenders, fortresses and mountains multiply defence. Hover over an enemy province with an army selected to see the odds.</p>
    <p><b>Supply:</b> armies cut off from friendly territory waste away. Use the Supply map to spot pockets. Losses are replaced from manpower each month.</p>
    <p><b>Economy:</b> split industry between munitions, research and the civilian economy in the Nation tab. Battles burn shells; without munitions artillery falls silent. Build factories, railways and forts in your provinces.</p>
    <p><b>Diplomacy & trade:</b> court neutrals with relations and secret treaties promising enemy land. Trade deals bring food and money — but the Royal Navy blockades the Central Powers, and U-boats can strangle Britain.</p>
    <p><b>War support</b> falls with casualties, hunger and lost land. If it collapses, revolution follows. Knock enemy great powers out of the war to win.</p>
    <p>The game autosaves each turn in this browser.</p></div></div>`;
  st.innerHTML = h;
  st.querySelectorAll('.natcard').forEach(c => c.onclick = () => pickNation(c.dataset.id));
  st.querySelector('#dHist').onclick = () => { UI.hard = false; showStart(); }; st.querySelector('#dHard').onclick = () => { UI.hard = true; showStart(); };
  const cont = st.querySelector('#cont'); if (cont) cont.onclick = () => { if (loadGame()) enterGame(false); else toast('Could not load the save.'); };
}
function pickNation(id) {
  const pl = PLANS[id];
  if (!pl) { startGame(id, null); return; }
  let h = `<div class="kicker">${NATIONS[id].name.toUpperCase()} · JULY 1914</div><h1>${pl.title}</h1><p style="text-align:center;font-style:italic">The General Staff awaits your decision.</p><div class="choices">` +
    pl.opts.map(o => `<button class="choice" data-v="${o.id}"><b>${o.name}</b>${o.desc}</button>`).join('') + `</div><div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn" id="back">Back</button></div>`;
  const m = modal(h); $('modal').style.zIndex = 35;
  m.querySelectorAll('.choice').forEach(b => b.onclick = () => { closeModal(); $('modal').style.zIndex = ''; startGame(id, b.dataset.v); });
  m.querySelector('#back').onclick = () => { closeModal(); $('modal').style.zIndex = ''; };
}
function startGame(id, plan) {
  newGame(id, plan);
  computeSupply();
  enterGame(true);
}
function enterGame(fresh) {
  $('start').style.display = 'none';
  UI.sel = { prov: null, army: null }; UI.tab = 'nation'; UI.dipSel = null; UI.moveMode = false;
  resize(); const cap = capitalOf(G.player); UI.s = UI.vw < 700 ? 0.75 : 1.6; fitView(cap); UI.s = Math.max(UI.s, UI.vw < 700 ? 0.75 : 1.6); if (cap >= 0) { UI.ox = UI.vw / 2 - MAP.ax[cap] * UI.s; UI.oy = UI.vh / 2 - MAP.ay[cap] * UI.s; } clampView();
  recolor(); renderSide();
  if (fresh) {
    const plan = G.plans[G.player] && PLANS[G.player] ? PLANS[G.player].opts.find(o => o.id === G.plans[G.player]) : null;
    const h = `<div class="kicker">TELEGRAM · ${dateStr().toUpperCase()}</div><h1>The July Crisis</h1>
      <div class="telegram">ARCHDUKE FRANZ FERDINAND ASSASSINATED SARAJEVO STOP AUSTRIA-HUNGARY PREPARES ULTIMATUM TO SERBIA STOP RUSSIA WILL NOT ABANDON SERBIA STOP GERMANY STANDS BEHIND VIENNA STOP</div>
      <p>You lead <b>${NATIONS[G.player].name}</b>.${plan ? ` Your General Staff has adopted <b>${plan.name}</b>.` : ''} This is the last month of peace: move your armies into position. When you end the turn, the ultimatums expire and Europe goes to war.</p>
      <p class="muted">Tip: select an army and right-click a province to order it. Orders into soon-to-be enemy territory will be carried out the moment war is declared.</p>
      <div class="row" style="justify-content:flex-end"><button class="btn primary" id="go">To your posts</button></div>`;
    const m = modal(h); m.querySelector('#go').onclick = closeModal;
  } else if (G.over) checkOver();
}

// ---------- boot ----------
function boot() {
  setTimeout(() => {
    const t0 = performance.now();
    buildMap(); initStatic();
    window.__mapMs = performance.now() - t0;
    $('loading').style.display = 'none';
    setupInput(); resize(); showStart();
  }, 30);
}
window.addEventListener('load', boot);
