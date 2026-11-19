// ================= MAP GENERATION & RENDER =================
const RES = 2; // pixel resolution multiplier
const PW = MAP_W * RES, PH = MAP_H * RES;

function hash2(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s) {
  return (vnoise(x / 22, y / 22, s) - 0.5) * 1.0 + (vnoise(x / 9, y / 9, s + 7) - 0.5) * 0.5 + (vnoise(x / 4, y / 4, s + 13) - 0.5) * 0.25;
}

const MAP = {}; // filled by buildMap

function buildMap() {
  const seeds = [];
  PROV_DATA.forEach((p, i) => seeds.push({ x: projX(p[2]), y: projY(p[3]), i }));
  const NP = PROV_DATA.length;
  SEA_DATA.forEach((s, j) => seeds.push({ x: projX(s[2]), y: projY(s[3]), i: NP + j }));
  const NS = seeds.length;
  const AMP = 9;
  // displacement field at base res
  const dxF = new Float32Array(MAP_W * MAP_H), dyF = new Float32Array(MAP_W * MAP_H);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const k = y * MAP_W + x;
    dxF[k] = fbm(x, y, 1) * AMP * 1.6; dyF[k] = fbm(x, y, 2) * AMP * 1.6;
  }
  // buckets
  const B = 20, BW = Math.ceil(MAP_W / B), BH = Math.ceil(MAP_H / B);
  const cand = new Array(BW * BH);
  const r = Math.SQRT2 * B / 2 + AMP * 1.6 * 0.95 + 1;
  for (let by = 0; by < BH; by++) for (let bx = 0; bx < BW; bx++) {
    const cx = (bx + 0.5) * B, cy = (by + 0.5) * B;
    let dmin = 1e9; const ds = new Float32Array(NS);
    for (let s = 0; s < NS; s++) { const d = Math.hypot(seeds[s].x - cx, seeds[s].y - cy); ds[s] = d; if (d < dmin) dmin = d; }
    const list = [];
    for (let s = 0; s < NS; s++) if (ds[s] <= dmin + 2 * r) list.push(s);
    cand[by * BW + bx] = list;
  }
  const pid = new Int16Array(PW * PH);
  for (let py = 0; py < PH; py++) {
    const by0 = py / RES;
    for (let px = 0; px < PW; px++) {
      const bx0 = px / RES;
      const k = (by0 | 0) * MAP_W + (bx0 | 0);
      const qx = bx0 + dxF[k], qy = by0 + dyF[k];
      const list = cand[((by0 / B) | 0) * BW + ((bx0 / B) | 0)];
      let best = 0, bd = 1e18;
      for (let t = 0; t < list.length; t++) {
        const s = seeds[list[t]]; const ddx = s.x - qx, ddy = s.y - qy; const d = ddx * ddx + ddy * ddy;
        if (d < bd) { bd = d; best = s.i; }
      }
      pid[py * PW + px] = best;
    }
  }
  // adjacency, centroids
  const pairCount = new Map(), pairPts = new Map();
  const sumX = new Float64Array(NS), sumY = new Float64Array(NS), cnt = new Float64Array(NS);
  const edge = new Uint8Array(PW * PH); // 1 = boundary pixel
  for (let py = 0; py < PH; py++) for (let px = 0; px < PW; px++) {
    const i = py * PW + px, a = pid[i];
    sumX[a] += px; sumY[a] += py; cnt[a]++;
    if (px + 1 < PW) { const b = pid[i + 1]; if (a !== b) { edge[i] = 1; edge[i + 1] = 1; addPair(a, b, px, py); } }
    if (py + 1 < PH) { const b = pid[i + PW]; if (a !== b) { edge[i] = 1; edge[i + PW] = 1; addPair(a, b, px, py); } }
  }
  function addPair(a, b, px, py) {
    const lo = Math.min(a, b), hi = Math.max(a, b), key = lo * 1000 + hi;
    const c = (pairCount.get(key) || 0) + 1; pairCount.set(key, c);
    if (lo < NP && hi < NP && c % (3 * RES) === 0) {
      let arr = pairPts.get(key); if (!arr) { arr = []; pairPts.set(key, arr); }
      arr.push(px / RES, py / RES);
    }
  }
  const adj = Array.from({ length: NS }, () => new Set());
  for (const [key, c] of pairCount) {
    if (c < 3 * RES) continue;
    const a = Math.floor(key / 1000), b = key % 1000;
    adj[a].add(b); adj[b].add(a);
  }
  const idx = {}; PROV_DATA.forEach((p, i) => idx[p[0]] = i); SEA_DATA.forEach((s, j) => idx[s[0]] = NP + j);
  EXTRA_LINKS.forEach(([a, b]) => { adj[idx[a]].add(idx[b]); adj[idx[b]].add(idx[a]); });
  // coast distance for sea pixels (in pixels)
  const cd = new Uint8Array(PW * PH).fill(255);
  const q = new Int32Array(PW * PH); let qh = 0, qt = 0;
  for (let i = 0; i < PW * PH; i++) if (pid[i] < NP) { cd[i] = 0; }
  for (let i = 0; i < PW * PH; i++) if (pid[i] >= NP) {
    const x = i % PW;
    if ((x > 0 && pid[i - 1] < NP) || (x < PW - 1 && pid[i + 1] < NP) || (i >= PW && pid[i - PW] < NP) || (i < PW * (PH - 1) && pid[i + PW] < NP)) { cd[i] = 1; q[qt++] = i; }
  }
  const MAXD = 30 * RES > 250 ? 250 : 30 * RES;
  while (qh < qt) {
    const i = q[qh++], d = cd[i]; if (d >= MAXD) continue;
    const x = i % PW;
    const nb = [x > 0 ? i - 1 : -1, x < PW - 1 ? i + 1 : -1, i - PW, i + PW];
    for (const j of nb) { if (j < 0 || j >= PW * PH) continue; if (cd[j] > d + 1) { cd[j] = d + 1; q[qt++] = j; } }
  }
  // texture (paper)
  const tex = new Uint8Array(PW * PH);
  for (let py = 0; py < PH; py++) for (let px = 0; px < PW; px++) {
    const n = hash2(px, py, 99) * 0.5 + vnoise(px / 6, py / 6, 5) * 0.5;
    tex[py * PW + px] = 118 + (n * 20) | 0;
  }
  MAP.pid = pid; MAP.edge = edge; MAP.adj = adj; MAP.NP = NP; MAP.NS = NS; MAP.cd = cd; MAP.tex = tex; MAP.idx = idx;
  MAP.pairPts = pairPts;
  MAP.cx = []; MAP.cy = []; MAP.area = [];
  for (let s = 0; s < NS; s++) {
    MAP.area[s] = cnt[s] / (RES * RES);
    if (cnt[s] > 0) { MAP.cx[s] = sumX[s] / cnt[s] / RES; MAP.cy[s] = sumY[s] / cnt[s] / RES; }
    else { MAP.cx[s] = seeds[s].x; MAP.cy[s] = seeds[s].y; }
  }
  // anchor = seed if visible & inside own cell, else centroid
  MAP.ax = []; MAP.ay = [];
  for (let s = 0; s < NS; s++) {
    let ax = seeds[s].x, ay = seeds[s].y;
    const inside = ax >= 4 && ay >= 4 && ax < MAP_W - 4 && ay < MAP_H - 4 && pid[((ay * RES) | 0) * PW + ((ax * RES) | 0)] === s;
    if (!inside) { ax = MAP.cx[s]; ay = MAP.cy[s]; }
    // blend toward centroid a little for nicer placement
    if (inside) { ax = ax * 0.6 + MAP.cx[s] * 0.4; ay = ay * 0.6 + MAP.cy[s] * 0.4; if (pid[((ay * RES) | 0) * PW + ((ax * RES) | 0)] !== s) { ax = seeds[s].x; ay = seeds[s].y; } }
    MAP.ax[s] = ax; MAP.ay[s] = ay;
  }
  // static sea colour buffer
  const sea = new Uint8ClampedArray(PW * PH * 3);
  for (let i = 0; i < PW * PH; i++) {
    if (pid[i] < NP) continue;
    const d = cd[i] / RES, t = tex[i] - 118;
    let r = 158, g = 183, b = 186;
    const shade = Math.max(0, 1 - d / 26);
    r -= shade * 26; g -= shade * 22; b -= shade * 16;
    const dd = d % 6; if (d > 2 && d < 20 && dd > 2.3 && dd < 3.1) { r -= 18; g -= 14; b -= 10; }
    r += t * 0.35; g += t * 0.35; b += t * 0.3;
    sea[i * 3] = r; sea[i * 3 + 1] = g; sea[i * 3 + 2] = b;
  }
  MAP.sea = sea;
  // hill/mountain mask
  MAP.terr = PROV_DATA.map(p => p[7].includes('m') ? 2 : p[7].includes('h') ? 1 : p[7].includes('w') ? 3 : 0);
  MAP.canvas = document.createElement('canvas'); MAP.canvas.width = PW; MAP.canvas.height = PH;
  MAP.ctx = MAP.canvas.getContext('2d');
  MAP.img = MAP.ctx.createImageData(PW, PH);
  MAP.hlCache = {};
}

function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mixRgb(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

// colours: array per province: fill rgb, stripe rgb|null, border key
function renderMapImage(cols) {
  const { pid, edge, NP, tex, sea, terr } = MAP;
  const d = MAP.img.data;
  const borderKey = cols.key;
  for (let py = 0; py < PH; py++) {
    for (let px = 0; px < PW; px++) {
      const i = py * PW + px, o = i * 4, id = pid[i];
      if (id >= NP) { d[o] = sea[i * 3]; d[o + 1] = sea[i * 3 + 1]; d[o + 2] = sea[i * 3 + 2]; d[o + 3] = 255; continue; }
      let c = cols.fill[id];
      const st = cols.stripe[id];
      if (st && (((px + py) / RES) % 9) < 3.2) c = st;
      const t = (tex[i] - 128) / 128;
      let r = c[0] * (1 + t * 0.22), g = c[1] * (1 + t * 0.22), b = c[2] * (1 + t * 0.22);
      const tr = terr[id];
      if (tr === 2) { const h = vnoise(px / (3 * RES), py / (2 * RES), 31); if (h > 0.62) { r *= 0.8; g *= 0.8; b *= 0.8; } }
      else if (tr === 1) { const h = vnoise(px / (4 * RES), py / (3 * RES), 37); if (h > 0.72) { r *= 0.88; g *= 0.88; b *= 0.88; } }
      else if (tr === 3) { if (((px / RES | 0) % 7 === 0) && ((py / RES | 0) % 5 === 0)) { r *= 0.8; g *= 0.85; b *= 0.8; } }
      if (edge[i]) {
        // check neighbours
        let coast = false, nat = false, prov = false;
        const nbs = [px > 0 ? i - 1 : -1, px < PW - 1 ? i + 1 : -1, py > 0 ? i - PW : -1, py < PH - 1 ? i + PW : -1];
        for (const j of nbs) {
          if (j < 0) continue; const b2 = pid[j]; if (b2 === id) continue;
          if (b2 >= NP) coast = true; else if (borderKey[b2] !== borderKey[id]) nat = true; else prov = true;
        }
        if (coast) { r = 72; g = 62; b = 48; }
        else if (nat) { r *= 0.42; g *= 0.4; b *= 0.4; }
        else if (prov) { r *= 0.8; g *= 0.8; b *= 0.8; }
      }
      d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
    }
  }
  // thicken national borders: second pass, darken pixels adjacent to nat-border pixels? keep simple
  MAP.ctx.putImageData(MAP.img, 0, 0);
}

function provHighlight(id) {
  if (MAP.hlCache[id]) return MAP.hlCache[id];
  const { pid } = MAP;
  let x0 = PW, y0 = PH, x1 = 0, y1 = 0;
  for (let py = 0; py < PH; py += 1) for (let px = 0; px < PW; px++) if (pid[py * PW + px] === id) { if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
  if (x1 < x0) return null;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const cx = c.getContext('2d'); const im = cx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y + y0) * PW + (x + x0);
    if (pid[i] !== id) continue;
    const o = (y * w + x) * 4;
    const border = (x + x0 > 0 && pid[i - 1] !== id) || (x + x0 < PW - 1 && pid[i + 1] !== id) || (pid[i - PW] !== id) || (pid[i + PW] !== id)
      || (x + x0 > 1 && pid[i - 2] !== id) || (x + x0 < PW - 2 && pid[i + 2] !== id) || (pid[i - 2 * PW] !== id) || (pid[i + 2 * PW] !== id);
    if (border) { im.data[o] = 255; im.data[o + 1] = 245; im.data[o + 2] = 200; im.data[o + 3] = 255; }
    else { im.data[o] = 255; im.data[o + 1] = 250; im.data[o + 2] = 220; im.data[o + 3] = 60; }
  }
  cx.putImageData(im, 0, 0);
  const r = { c, x: x0 / RES, y: y0 / RES, w: w / RES, h: h / RES };
  MAP.hlCache[id] = r; return r;
}
