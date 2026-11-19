// ================= ENGINE =================
let G = null;
let LADJ = [], SADJ = [], SEA_ADJ = [], SEA_LAND = [];
const RAIL_NATIONS = new Set(['GER', 'FRA', 'BEL', 'NED', 'GBR', 'LUX', 'SUI', 'DEN', 'AUH', 'ITA']);
const RUS_RAIL = new Set(['war', 'stp', 'mos', 'kiv', 'vil', 'brl', 'min', 'lod', 'kov', 'rig', 'smo', 'kha', 'eka', 'ode', 'grd', 'dvi', 'psk', 'tve', 'lub', 'rov', 'zhi', 'kur', 'ore', 'kal', 'pod', 'pol', 'gom', 'vit']);
const TRADE_VAL = { USA: 0.6, NED: 0.16, SWE: 0.15, DEN: 0.1, NOR: 0.1, SUI: 0.07, ESP: 0.12, POR: 0.05, ITA: 0.1, ROM: 0.12, GRE: 0.06, BUL: 0.05, OTT: 0.05 };
const NEAR_NEUTRAL = new Set(['NED', 'SWE', 'DEN', 'NOR', 'SUI', 'ROM', 'BUL', 'GRE', 'ITA', 'OTT']);
const EMPIRE_ACCESS = { GBR: 0.5, FRA: 0.35, ITA: 0.05, BEL: 0.05, POR: 0.1, NED: 0.2 };
const COSTS = { div: 7, divMun: 5, art: 14, artMun: 15, tank: 30, tankMun: 10, factory: 90, rail: 45, fort: 55, ship: 140, relations: 20, deal: 15 };
const BUILD_TURNS = { factory: 6, rail: 3, fort: 3 };

function rnd() { return Math.random(); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function N(id) { return G.nations[id]; }
function P(i) { return G.provs[i]; }
function sideOf(id) { const n = G.nations[id]; return n && !n.out ? n.side : null; }
function atWar(a, b) { const sa = sideOf(a), sb = sideOf(b); return !!(sa && sb && sa !== sb); }
function otherSide(s) { return s === 'E' ? 'C' : 'E'; }
function dateStr(t) { t = t === undefined ? G.turn : t; const m = (6 + t) % 12, y = 1914 + Math.floor((6 + t) / 12); return MONTHS[m] + ' ' + y; }
function curYear() { return 1914 + Math.floor((6 + G.turn) / 12); }
function curMonth() { return (6 + G.turn) % 12; }
function relKey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }
function rel(a, b) { return G.rel[relKey(a, b)] || 0; }
function addRel(a, b, v) { const k = relKey(a, b); G.rel[k] = clamp((G.rel[k] || 0) + v, -100, 100); }
function friendly(nat, i) { const c = P(i).ctrl; if (c === nat) return true; const s = sideOf(nat); return !!(s && sideOf(c) === s); }
function hostileProv(nat, i) { return atWar(nat, P(i).ctrl); }
function armiesIn(i) { return G.armies.filter(a => a.prov === i); }
function nArmies(id) { return G.armies.filter(a => a.nat === id); }
function log(txt, type, nats) { G.log.push({ t: G.turn, txt, type: type || 'info', nats: nats || [] }); if (G.log.length > 400) G.log.shift(); G.report.news.push({ txt, type: type || 'info', nats: nats || [] }); }

function initStatic() {
  const NP = MAP.NP;
  LADJ = []; SADJ = []; SEA_ADJ = []; SEA_LAND = [];
  for (let i = 0; i < NP; i++) { LADJ[i] = [...MAP.adj[i]].filter(j => j < NP); SADJ[i] = [...MAP.adj[i]].filter(j => j >= NP); }
  for (let j = NP; j < MAP.NS; j++) { SEA_ADJ[j] = [...MAP.adj[j]].filter(k => k >= NP); SEA_LAND[j] = [...MAP.adj[j]].filter(k => k < NP); }
}

function computeFx(n) {
  const fx = { entCap: 0, def: 0, entIgnore: 0, atk: 0, art: 0, mun: 0, gasAtk: 0, masks: 0, air: 0, bomb: 0, tanks: 0, tank: 0, ic: 0, rail: 0, reinf: 0, food: 0, mp: 0, sub: 0, convoy: 0, fleet: 0, ws: 0 };
  let foodMul = 1;
  for (const t of n.techs) { const f = TECH[t].fx; for (const k in f) { if (k === 'food') foodMul *= (1 - f[k]); else fx[k] += f[k]; } }
  fx.food = 1 - foodMul; n.fx = fx;
}

// ---------------- INIT ----------------
function newGame(player, playerPlan) {
  G = { turn: 0, player, nations: {}, provs: [], armies: [], nextArmy: 1, log: [], rel: {}, deals: [], flags: {}, promises: [],
    seaCtrl: { open: null, baltic: null, black: null }, usaTension: 0, blockade: 0, over: null, plans: {}, report: { battles: [], news: [] }, pending: [], history: [] };
  for (const id in NATIONS) {
    const d = NATIONS[id];
    G.nations[id] = { id, side: null, out: false, money: d.money, mp: d.mp, mun: d.mun, ws: d.ws, techs: [...d.techs], res: null, rp: 0,
      sl: { mun: 0.35, res: 0.15 }, policy: { consc: id === 'GBR' || id === 'USA' ? 'volunteer' : 'conscription', sub: false, propaganda: false },
      fleet: d.fleet, fleetBuild: 0, lean: { E: 0, C: 0 }, armyNo: 0, stats: { cas: 0, kills: 0, won: 0, lost: 0 }, monthCas: 0, mutiny: 0, revo: 0,
      ic: 0, income: 0, expenses: 0, munProd: 0, munUse: 0, mpGain: 0, access: 1, shortage: 0, wsDelta: 0, wsWhy: [], exile: false, lastBattle: 0 };
    computeFx(G.nations[id]);
    if (LEAN[id]) { G.nations[id].lean = { E: LEAN[id].E, C: LEAN[id].C }; }
  }
  PROV_DATA.forEach((p, i) => {
    const fl = p[7]; const fm = fl.match(/F(\d)/);
    G.provs.push({ i, key: p[0], name: p[1], owner: p[4], ctrl: p[4], ind: p[5], mp: p[6], fort: fm ? +fm[1] : 0,
      rail: RAIL_NATIONS.has(p[4]) || RUS_RAIL.has(p[0]) || ['con', 'edi', 'bgd', 'nis', 'buc', 'sof'].includes(p[0]) ? 1 : 0,
      terr: fl.includes('m') ? 'mountain' : fl.includes('h') ? 'hills' : fl.includes('w') ? 'marsh' : 'plains', cap: fl.includes('C'),
      coast: SADJ[i].length > 0, build: null, origInd: p[5] });
  });
  // relations
  const ids = Object.keys(NATIONS);
  for (const a of ids) for (const b of ids) if (a < b) G.rel[relKey(a, b)] = 10;
  const setR = (a, b, v) => G.rel[relKey(a, b)] = v;
  for (const s of ['E', 'C']) for (const a of ALLIANCE_START[s]) for (const b of ALLIANCE_START[s]) if (a < b) setR(a, b, 60);
  for (const a of ALLIANCE_START.E) for (const b of ALLIANCE_START.C) setR(a, b, -35);
  [['SRB', 'AUH', -80], ['FRA', 'GER', -60], ['ITA', 'AUH', -20], ['BUL', 'SRB', -60], ['ROM', 'AUH', -25], ['GRE', 'BUL', -40], ['OTT', 'RUS', -50], ['OTT', 'GER', 40],
   ['BUL', 'GER', 20], ['ITA', 'GER', 15], ['ITA', 'GBR', 30], ['USA', 'GBR', 40], ['USA', 'FRA', 30], ['GBR', 'FRA', 50], ['GBR', 'RUS', 25], ['GBR', 'BEL', 50], ['OTT', 'GBR', -10], ['GRE', 'OTT', -50], ['ROM', 'FRA', 30]].forEach(r => setR(...r));
  // trade deals
  [['GBR', 'USA'], ['FRA', 'USA'], ['ITA', 'USA'], ['GER', 'USA'], ['GER', 'NED'], ['GER', 'SWE'], ['GER', 'DEN'], ['GER', 'NOR'], ['GER', 'SUI'], ['AUH', 'SUI'], ['AUH', 'ROM'],
   ['GBR', 'NOR'], ['GBR', 'ESP'], ['FRA', 'ESP'], ['GBR', 'NED'], ['RUS', 'SWE'], ['ITA', 'ESP'], ['GER', 'ROM'], ['OTT', 'BUL'], ['RUS', 'USA'], ['BEL', 'NED']].forEach(d => G.deals.push(d));
  // plans
  const ai = { GER: rnd() < 0.85 ? 'W' : 'E', AUH: rnd() < 0.5 ? 'B' : 'R', FRA: rnd() < 0.7 ? 'O' : 'D', GBR: rnd() < 0.85 ? 'S' : 'H', RUS: rnd() < 0.7 ? 'P' : 'G' };
  if (playerPlan) ai[player] = playerPlan;
  G.hard = !!(typeof UI !== 'undefined' && UI.hard);
  G.plans = ai;
  deployAll();
  updateSeaControl();
  for (const id in G.nations) calcEconomy(N(id), true);
  const pn = G.nations[player]; const first = AI_TECH_PRIORITY.find(t => techAvailable(pn, t) && TECH[t].year <= 1914); if (first) pn.res = { id: first, prog: 0 };
  G.report = { battles: [], news: [] };
  return G;
}

function deployAll() {
  G.armies = [];
  const dep = (nat, list) => list.forEach(([k, d, a]) => { const ar = makeArmy(nat, MAP.idx[k], d, a); ar.ent = 0; });
  dep('GER', DEPLOY['GER_' + G.plans.GER]); dep('AUH', DEPLOY['AUH_' + G.plans.AUH]); dep('FRA', DEPLOY['FRA_' + G.plans.FRA]);
  dep('GBR', DEPLOY['GBR_' + G.plans.GBR]); dep('RUS', DEPLOY['RUS_' + G.plans.RUS]);
  for (const id of ['SRB', 'MNE', 'BEL', 'OTT', 'ITA', 'BUL', 'ROM', 'GRE', 'NED', 'SUI', 'DEN', 'NOR', 'SWE', 'ESP', 'POR']) dep(id, DEPLOY[id]);
  G.armies.forEach(a => a.fresh = false);
  // The BEF lands in Lille only once war begins; before that it waits in London
  if (G.plans.GBR === 'S') { const bef = G.armies.find(a => a.nat === 'GBR' && a.prov === MAP.idx.lil); if (bef) { bef.prov = MAP.idx.lon; bef.bef = true; } }
}

function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
function makeArmy(nat, prov, div, art, tanks) {
  const n = N(nat); n.armyNo++;
  const a = { id: G.nextArmy++, nat, prov, div, art: art || 0, tanks: tanks || 0, str: 1, org: 1, ent: 0, exp: 0, name: ordinal(n.armyNo) + ' Army', path: [], sea: null, moved: false, fresh: true, hold: false };
  if (nat === 'GBR' && n.armyNo === 1) a.name = 'BEF';
  if (nat === 'USA' && n.armyNo === 1) a.name = 'AEF 1st Army';
  G.armies.push(a); return a;
}

// ---------------- POWER & COMBAT ----------------
function airLevel(nat) { return N(nat).fx.air; }
function enemyAirMax(nat) { let m = 0; for (const id in G.nations) if (atWar(nat, id)) m = Math.max(m, airLevel(id)); return m; }
function armyBase(a) {
  const n = N(a.nat), q = NATIONS[a.nat].qual * (1 + 0.3 * a.exp), org = 0.55 + 0.45 * a.org;
  const munOk = n.mun > 0 ? 1 : 0.45;
  return { inf: a.div * a.str * q * org, art: a.art * 0.8 * (1 + n.fx.art) * munOk * Math.sqrt(org), tank: a.tanks * 0.7 * (1 + n.fx.tank) * org };
}
function groupAttack(arms, target) {
  let inf = 0, art = 0, tank = 0, divs = 0;
  for (const a of arms) { const b = armyBase(a); const amph = a.amph ? 0.55 : 1; inf += b.inf * amph; art += b.art * amph; tank += b.tank * amph; divs += a.div * a.str; }
  const w = 32; if (divs > w) { const f = w / divs; inf *= f; art *= f; tank *= f; }
  const lead = arms[0] ? N(arms[0].nat) : null; if (!lead) return { pow: 0 };
  const defNat = P(target).ctrl;
  let gas = lead.fx.gasAtk; if (N(defNat).fx.masks) gas *= 0.5;
  const air = clamp(1 + 0.05 * (airLevel(lead.id) - enemyAirMax(lead.id)), 0.85, 1.2);
  const mut = lead.mutiny > 0 ? 0.75 : 1;
  const origins = new Set(arms.map(a => a.prov)).size;
  const flank = 1 + Math.min(0.24, 0.08 * (origins - 1));
  const pow = (inf * (1 + lead.fx.atk + gas) + art + tank) * air * mut * flank * hardMul(lead.id);
  const tankShare = pow > 0 ? Math.min(0.3, tank / pow * 1.2) : 0;
  const siege = lead.techs.includes('heavyArt') && arms.some(a => a.art >= 1);
  return { pow, ignore: Math.min(0.75, lead.fx.entIgnore + tankShare), divs, siege };
}
function groupDefense(arms, i, ignore, siege) {
  const p = P(i);
  let inf = 0, art = 0, tank = 0, divs = 0, ent = 0;
  for (const a of arms) { const b = armyBase(a); const pc = a.moved && !a.attacking ? 0.6 : 1; inf += b.inf * pc; art += b.art * pc; tank += b.tank * pc; divs += a.div * a.str; ent = Math.max(ent, a.ent); }
  const w = 32; if (divs > w) { const f = w / divs; inf *= f; art *= f; tank *= f; }
  const lead = arms[0] ? N(arms[0].nat) : N(p.ctrl);
  const terr = p.terr === 'mountain' ? 0.6 : p.terr === 'hills' ? 0.25 : p.terr === 'marsh' ? 0.3 : 0;
  const air = clamp(1 + 0.05 * (airLevel(lead.id) - enemyAirMax(lead.id)), 0.85, 1.2);
  const entEff = ent * (1 - (ignore || 0)), fortEff = p.fort * (1 - (ignore || 0) * 0.5) * (siege ? 0.4 : 1);
  const pow = ((inf * (1 + lead.fx.def) + art * 0.8 + tank * 0.3) * (1 + entEff * 0.25 + fortEff * 0.2 + terr) * air + garrisonPow(p, siege) * 0.6) * hardMul(lead.id);
  return { pow, ent, divs };
}
function garrisonPow(p, siege) {
  if (p.ctrl !== p.owner || !sideOf(p.ctrl)) return 0;
  const terr = p.terr === 'mountain' ? 0.6 : p.terr === 'hills' ? 0.25 : p.terr === 'marsh' ? 0.3 : 0;
  return (4 + 0.8 * p.ind + 0.8 * p.mp + (p.cap ? 8 : 0)) * NATIONS[p.ctrl].qual * (1.17 + p.fort * 0.3 * (siege ? 0.4 : 1) + terr);
}
// local reserves: armies of the defending side in neighbouring provinces lend part of their strength
function reservePow(target, defSide, busy) {
  let r = 0;
  for (const j of LADJ[target]) {
    if (sideOf(P(j).ctrl) !== defSide) continue;
    if (busy && busy.has(j)) continue;
    for (const a of G.armies) if (a.prov === j && sideOf(a.nat) === defSide) { const b = armyBase(a); r += b.inf + b.art * 0.5; }
  }
  return r * (G.turn <= 3 ? 0.12 : 0.3);
}
function estimateBattle(attackers, target) {
  const defs = armiesIn(target).filter(d => atWar(d.nat, attackers[0].nat));
  if (!defs.length) { const A = groupAttack(attackers, target); const g0 = garrisonPow(P(target), A.siege); if (!g0) return { ratio: 99, empty: true }; const g = g0 + reservePow(target, sideOf(P(target).ctrl)); return { ratio: A.pow / g, A: A.pow, D: g, garrison: true }; }
  const A = groupAttack(attackers, target), D = groupDefense(defs, target, A.ignore, A.siege);
  const Dp = D.pow + reservePow(target, sideOf(defs[0].nat));
  return { ratio: A.pow / Math.max(0.01, Dp), A: A.pow, D: Dp };
}

function hardMul(id) { return G.hard && id !== G.player && atWar(id, G.player) ? 1.15 : 1; }
function armyMen(a) { return a.div * DIV_MEN * a.str; }
function applyLoss(arms, frac, side) {
  let men = 0;
  for (const a of arms) {
    const lossStr = a.str * frac; men += a.div * DIV_MEN * lossStr; a.str = Math.max(0, a.str - lossStr);
    a.art = Math.max(0, a.art - a.art * frac * 0.25); a.tanks = Math.max(0, a.tanks - a.tanks * frac * 0.8);
    N(a.nat).stats.cas += a.div * DIV_MEN * lossStr; N(a.nat).monthCas += a.div * DIV_MEN * lossStr;
  }
  return men;
}

function resolveBattle(target, attackers) {
  const atkNat = attackers[0].nat;
  const p = P(target);
  const defenders = armiesIn(target).filter(d => atWar(d.nat, atkNat));
  const rec = { prov: target, atk: [...new Set(attackers.map(a => a.nat))], def: [...new Set(defenders.map(a => a.nat))], atkDiv: 0, defDiv: 0 };
  if (!defenders.length) {
    // local garrison (landwehr, depots, fortress troops) defends home provinces
    if (p.ctrl === p.owner && sideOf(p.ctrl)) {
      const A0 = groupAttack(attackers, target);
      const gar = garrisonPow(p, A0.siege) + reservePow(target, sideOf(p.ctrl), G.underAttack);
      const r0 = A0.pow * (0.85 + rnd() * 0.3) / gar;
      rec.garrison = true; rec.ratio = r0;
      if (r0 < 1.3) {
        rec.atkLoss = applyLoss(attackers, 0.03 * Math.min(3, 1.3 / r0)); rec.defLoss = gar * 1.2;
        for (const a of attackers) a.org = clamp(a.org - 0.2, 0, 1);
        rec.result = 'repulsed'; rec.ctrlBefore = p.ctrl; rec.atkDiv = Math.round(A0.divs); rec.defDiv = 0;
        for (const a of attackers) a.path = [];
        return rec;
      }
      rec.atkLoss = applyLoss(attackers, 0.012); rec.defLoss = gar * 3; rec.atkDiv = Math.round(A0.divs);
      N(p.ctrl).stats.cas += gar * 3; N(p.ctrl).monthCas += gar * 3;
    }
    captureProv(target, attackers);
    rec.result = 'captured'; rec.atkLoss = rec.atkLoss || 0; rec.defLoss = rec.defLoss || 0; rec.empty = !rec.garrison; rec.ctrlBefore = p.ctrl;
    return rec;
  }
  const A = groupAttack(attackers, target), D = groupDefense(defenders, target, A.ignore, A.siege);
  const res = reservePow(target, sideOf(defenders[0].nat), G.underAttack);
  const Ar = A.pow * (0.85 + rnd() * 0.3), Dr = (D.pow + res) * (0.85 + rnd() * 0.3);
  const r = Ar / Math.max(0.01, Dr);
  rec.atkDiv = Math.round(A.divs); rec.defDiv = Math.round(D.divs); rec.ratio = r; rec.ent = D.ent;
  const attLoss = 0.09 * Math.pow(clamp(1 / r, 0.3, 3), 0.7) * (1 + D.ent * 0.06);
  const defLoss = 0.07 * Math.pow(clamp(r, 0.3, 3), 0.7) / (1 + D.ent * 0.12);
  rec.atkLoss = applyLoss(attackers, attLoss); rec.defLoss = applyLoss(defenders, defLoss);
  // kills
  attackers.forEach(a => N(a.nat).stats.kills += rec.defLoss / attackers.length);
  defenders.forEach(a => N(a.nat).stats.kills += rec.atkLoss / defenders.length);
  // munitions use
  const useMun = (arms, k) => { for (const a of arms) { const n = N(a.nat); const u = (a.art * 1.6 + a.div * 0.3) * k; n.mun -= u; n.munUse += u; } };
  useMun(attackers, 1); useMun(defenders, 0.7);
  for (const a of attackers) { a.org = clamp(a.org - (0.18 + 0.12 * Math.min(2, 1 / r)), 0, 1); a.exp = Math.min(1, a.exp + 0.04); }
  for (const a of defenders) { a.org = clamp(a.org - (0.1 + 0.14 * Math.min(2, r)), 0, 1); a.exp = Math.min(1, a.exp + 0.04); }
  const dOrg = defenders.reduce((s, a) => s + a.org * a.div, 0) / Math.max(1, defenders.reduce((s, a) => s + a.div, 0));
  const win = r > 1.2 + 0.08 * D.ent && (dOrg < 0.45 || r > 1.8 + 0.15 * D.ent);
  rec.ctrlBefore = p.ctrl;
  if (win) {
    retreat(defenders, target, attackers);
    captureProv(target, attackers);
    if (p.fort > 0) p.fort--;
    rec.result = 'captured';
    attackers.forEach(a => N(a.nat).stats.won++); defenders.forEach(a => N(a.nat).stats.lost++);
  } else {
    for (const d of defenders) if (r > 1) d.ent = Math.max(0, d.ent - 1);
    for (const a of attackers) a.path = [];
    rec.result = 'repulsed';
    attackers.forEach(a => N(a.nat).stats.lost++); defenders.forEach(a => N(a.nat).stats.won++);
  }
  for (const a of attackers.concat(defenders)) N(a.nat).lastBattle = G.turn;
  cleanupArmies();
  return rec;
}
function retreat(defenders, target, attackers) {
  const s = sideOf(defenders[0].nat);
  const options = LADJ[target].filter(j => sideOf(P(j).ctrl) === s && !attackers.some(a => a.prov === j));
  for (const d of defenders) {
    let best = -1, bs = -1e9;
    for (const j of options) { const sc = (G.supply[s] && G.supply[s].has(j) ? 10 : 0) + armiesIn(j).filter(x => x.nat === d.nat).length * 2 + rnd(); if (sc > bs) { bs = sc; best = j; } }
    if (best < 0 && P(target).coast && G.seaCtrl.open === s && capitalOf(d.nat) >= 0 && capitalOf(d.nat) !== target) {
      const loss = 0.15 * d.str; N(d.nat).stats.cas += d.div * DIV_MEN * loss; N(d.nat).monthCas += d.div * DIV_MEN * loss; d.str -= loss;
      d.prov = capitalOf(d.nat); d.org = Math.min(d.org, 0.1); d.ent = 0; d.path = []; d.retreated = true;
      log(`The ${NATIONS[d.nat].adj} ${d.name} is evacuated by sea from ${P(target).name}.`, 'bad', [d.nat]);
      continue;
    }
    if (best < 0) {
      const men = armyMen(d); N(d.nat).stats.cas += men; N(d.nat).monthCas += men * 0.5;
      attackers.forEach(a => N(a.nat).stats.kills += men / attackers.length);
      log(`${NATIONS[d.nat].adj} ${d.name} was surrounded and destroyed at ${P(target).name}.`, 'bad', [d.nat]);
      d.str = 0;
    } else {
      const loss = 0.05 * d.str; N(d.nat).stats.cas += d.div * DIV_MEN * loss; N(d.nat).monthCas += d.div * DIV_MEN * loss; d.str -= loss;
      d.prov = best; d.org = Math.min(d.org, 0.15); d.ent = 0; d.path = []; d.retreated = true;
    }
  }
}
function captureProv(i, attackers) {
  const p = P(i); const lead = attackers.slice().sort((a, b) => b.div - a.div)[0];
  const s = sideOf(lead.nat);
  const prev = p.ctrl;
  if (sideOf(p.owner) === s) p.ctrl = p.owner; else p.ctrl = lead.nat;
  for (const a of attackers) { a.prov = i; a.ent = 0; a.moved = true; a.org = Math.max(0, a.org - 0.3); }
  if (p.build && p.build.nat !== p.ctrl) p.build = null;
  // other enemy armies still in province (shouldn't be)
  if (p.cap && prev === p.owner && PROV_DATA[p.i][4] === p.owner) { N(p.owner).ws -= 8; log(`${p.name}, capital of ${NATIONS[p.owner].short}, has fallen to ${NATIONS[lead.nat].adj} forces!`, 'major', [p.owner, lead.nat]); }
}
function cleanupArmies() {
  G.armies = G.armies.filter(a => a.str > 0.08 && a.div > 0);
}

// ---------------- SUPPLY & SEA ----------------
function fleetPow(id) { const n = N(id); return n.fleet * (1 + n.fx.fleet); }
function updateSeaControl() {
  const regions = { open: ['GBR', 'FRA', 'ITA', 'USA', 'GER', 'AUH', 'OTT', 'GRE'], baltic: ['GER', 'RUS'], black: ['OTT', 'RUS', 'ROM', 'BUL'] };
  const share = { open: { GER: 0.85, AUH: 0.5, RUS: 0 }, baltic: { GER: 0.15, RUS: 0.6 }, black: { RUS: 0.4 } };
  for (const r in regions) {
    const s = { E: 0, C: 0 };
    for (const id of regions[r]) { const sd = sideOf(id); if (!sd) continue; const sh = (share[r][id] !== undefined ? share[r][id] : 1); s[sd] += fleetPow(id) * sh; }
    if (r === 'black' && G.flags.goeben && sideOf('OTT') === 'C') s.C += 2.5;
    G.seaCtrl[r] = s.E === 0 && s.C === 0 ? null : s.E > s.C ? 'E' : 'C';
  }
}
function seaRegion(j) { return SEA_DATA[j - MAP.NP][4]; }
function seaAllowed(side, j) { const c = G.seaCtrl[seaRegion(j)]; return !c || c === side || !anyAtWar(side); }
function anyAtWar(side) { for (const id in G.nations) if (sideOf(id) && sideOf(id) !== side) return true; return false; }
function seaRoute(nat, from, to) {
  const side = sideOf(nat); if (!side) return false;
  if (!P(from).coast || !P(to).coast) return false;
  const goal = new Set(SADJ[to]);
  const seen = new Set(); let frontier = SADJ[from].filter(j => seaAllowed(side, j));
  frontier.forEach(j => seen.add(j));
  for (let d = 0; d < 14 && frontier.length; d++) {
    const nx = [];
    for (const j of frontier) { if (goal.has(j)) return true; for (const k of SEA_ADJ[j]) if (!seen.has(k) && seaAllowed(side, k)) { seen.add(k); nx.push(k); } }
    frontier = nx;
  }
  return false;
}
function computeSupply() {
  G.supply = {};
  for (const s of ['E', 'C']) {
    const set = new Set(); const q = [];
    for (const p of G.provs) {
      if (sideOf(p.ctrl) !== s) continue;
      const src = sideOf(p.owner) === s || (p.coast && G.seaCtrl.open === s && SADJ[p.i].some(j => seaRegion(j) === 'open'));
      if (src) { set.add(p.i); q.push(p.i); }
    }
    while (q.length) { const i = q.pop(); for (const j of LADJ[i]) if (!set.has(j) && sideOf(P(j).ctrl) === s) { set.add(j); q.push(j); } }
    G.supply[s] = set;
  }
}
function supplied(a) { const s = sideOf(a.nat); if (!s) return true; return G.supply && G.supply[s] ? G.supply[s].has(a.prov) : true; }

// ---------------- PATHS & MOVEMENT ----------------
function entCap(nat) { return 1 + (curYear() >= 1915 ? 1 : 0) + N(nat).fx.entCap; }
function railRange(nat) { return 2 + N(nat).fx.rail; }
function findPath(nat, from, to) {
  // Dijkstra on land; friendly provinces cost 1, hostile cost 3; neutral/blocked impassable (unless target)
  if (from === to) return [];
  const NP = MAP.NP; const dist = new Float64Array(NP).fill(1e9), prev = new Int32Array(NP).fill(-1);
  dist[from] = 0; const open = [from]; const done = new Uint8Array(NP);
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (dist[open[k]] < dist[open[bi]]) bi = k;
    const i = open.splice(bi, 1)[0]; if (done[i]) continue; done[i] = 1; if (i === to) break;
    for (const j of LADJ[i]) {
      let c;
      if (friendly(nat, j)) c = (P(i).rail && P(j).rail) ? 0.7 : 1;
      else if (hostileProv(nat, j)) c = 3;
      else if (j === to) c = 3; else continue;
      if (dist[i] + c < dist[j]) { dist[j] = dist[i] + c; prev[j] = i; open.push(j); }
    }
  }
  if (dist[to] >= 1e9) return null;
  const path = []; let c = to; while (c !== from) { path.unshift(c); c = prev[c]; }
  return path;
}
function bfsFriendly(nat, from, maxD) {
  const d = new Map([[from, 0]]); const q = [from];
  while (q.length) { const i = q.shift(); const di = d.get(i); if (di >= maxD) continue; for (const j of LADJ[i]) if (!d.has(j) && friendly(nat, j)) { d.set(j, di + 1); q.push(j); } }
  return d;
}

function orderMove(a, to) {
  a.sea = null; a.path = [];
  if (to === a.prov) return { ok: true };
  const path = findPath(a.nat, a.prov, to);
  if (path) { a.path = path; return { ok: true, path }; }
  if (seaRoute(a.nat, a.prov, to)) { a.sea = to; return { ok: true, sea: true }; }
  return { ok: false };
}

function executeMoves() {
  const attacks = new Map();
  const queue = G.armies.filter(a => (a.path.length || a.sea !== null) && !a.fresh);
  queue.sort(() => rnd() - 0.5);
  for (const a of queue) {
    a.amph = false;
    if (a.sea !== null) {
      const to = a.sea; a.sea = null;
      if (!seaRoute(a.nat, a.prov, to)) continue;
      if (hostileProv(a.nat, to)) { a.amph = true; addAttack(attacks, to, a); }
      else if (friendly(a.nat, to)) { a.prov = to; a.ent = 0; a.moved = true; a.org = Math.max(0.3, a.org - 0.1); }
      continue;
    }
    let steps = 0; const rr = railRange(a.nat);
    while (a.path.length) {
      const nx = a.path[0];
      if (hostileProv(a.nat, nx)) { if (steps === 0) addAttack(attacks, nx, a); break; }
      if (G.turn === 0 && P(nx).ctrl !== a.nat && friendly(a.nat, nx)) { a.path = []; break; }
      if (!friendly(a.nat, nx)) { if (a.violate && steps === 0 && sideOf(a.nat) && !sideOf(P(nx).ctrl) && !N(P(nx).ctrl).out) addAttack(attacks, nx, a); a.path = []; break; }
      const railOk = P(a.prov).rail && P(nx).rail && supplied(a);
      if (steps > 0 && !railOk) break;
      a.prov = nx; a.path.shift(); a.ent = 0; a.moved = true; steps++;
      if (!railOk || steps >= rr) break;
    }
  }
  return attacks;
}
function addAttack(map, t, a) { if (!map.has(t)) map.set(t, []); map.get(t).push(a); a.attacking = t; a.origin = a.prov; }

// ---------------- ECONOMY ----------------
function coreMp(n) { let s = 0; for (const p of G.provs) if (p.owner === n.id && p.ctrl === n.id) s += p.mp; return s; }
function tradeAccess(n) {
  if (n.out || !n.side) { n.tradeMoney = 0; n.tradeMun = 0; return 1; }
  let acc = 0, money = 0, mun = 0;
  const subLoss = (sideOf('GER') && n.side !== sideOf('GER') && N('GER').fx.sub) ? (N('GER').policy.sub ? 0.4 : 0.1) * (n.fx.convoy ? 0.5 : 1) : 0;
  const overseasF = (n.side === 'C' && G.seaCtrl.open === 'E') ? 0 : (1 - subLoss);
  const dard = n.id === 'RUS' ? (dardanellesOpen() ? 1 : 0.25) : 1;
  acc += (EMPIRE_ACCESS[n.id] || 0) * overseasF * dard;
  for (const [a, b] of G.deals) {
    let partner = a === n.id ? b : b === n.id ? a : null; if (!partner) continue;
    const ps = sideOf(partner);
    if (ps && ps !== n.side) continue;
    let f;
    if (NEAR_NEUTRAL.has(partner)) f = n.side === 'C' ? (1 - G.blockade) : 1;
    else f = overseasF;
    f *= dard;
    const v = (TRADE_VAL[partner] || 0.05) * f;
    acc += v; money += v * 55;
    if (partner === 'USA' && n.side === 'E') mun += v * 30;
  }
  n.tradeMoney = money; n.tradeMun = mun;
  return clamp(acc, 0, 1.2);
}
function dardanellesOpen() { return !sideOf('OTT') || sideOf(P(MAP.idx.con).ctrl) === 'E' || sideOf(P(MAP.idx.gpl).ctrl) === 'E'; }

function calcEconomy(n, dry) {
  // industrial capacity
  let ic = 0; for (const p of G.provs) { if (p.ctrl !== n.id) continue; ic += p.owner === n.id ? p.ind : p.ind * 0.5; }
  ic += NATIONS[n.id].empire || 0;
  if (n.id === 'USA') ic += 55;
  const access = tradeAccess(n); n.access = access;
  const need = Math.max(0, NATIONS[n.id].food);
  n.shortage = n.side ? need * clamp(1 - access / Math.max(0.3, need * 1.6), 0, 1) * (1 - n.fx.food) : 0;
  let mult = 1 + n.fx.ic;
  if (n.ws < 40 && n.side) mult -= 0.15;
  mult -= n.shortage * 0.6;
  if (n.revo) mult -= 0.2;
  let bomb = 0; for (const id in G.nations) if (atWar(n.id, id) && N(id).fx.bomb) bomb = 1; mult -= bomb * 0.04;
  if (n.policy.consc === 'total') mult -= 0.06;
  if (n.id === 'RUS') mult *= 0.85;
  n.ic = Math.max(1, ic * mult);
  const civ = Math.max(0, 1 - n.sl.mun - n.sl.res);
  const peace = !n.side;
  // money
  let upkeep = 0; for (const a of G.armies) if (a.nat === n.id) upkeep += a.div * 0.3 + a.art * 0.4 + a.tanks * 0.6;
  if (peace) upkeep *= 0.35;
  upkeep += n.fleet * 0.5;
  const tax = coreMp(n) * 0.45;
  n.income = 8 + n.ic * civ * 3.2 + tax + (n.tradeMoney || 0) + (n.policy.bonds ? 25 : 0);
  n.expenses = upkeep + (n.policy.propaganda ? 12 : 0) + (n.subsidy || 0);
  n.munProd = n.ic * n.sl.mun * 2.2 * (1 + n.fx.mun) + (n.tradeMun || 0);
  let idle = 0; for (const a of G.armies) if (a.nat === n.id) idle += a.div * 0.07 + a.art * 0.12;
  n.munIdle = peace ? idle * 0.2 : idle;
  n.rpGain = 2 + n.ic * n.sl.res * 1.35;
  const conscM = { volunteer: 0.45, conscription: 1, total: 1.35 }[n.policy.consc];
  n.mpGain = coreMp(n) * 1000 * 0.0021 * conscM * (1 + n.fx.mp) * NATIONS[n.id].mob * (peace ? 0.3 : 1) * (n.revo ? 0.6 : 1);
  if (n.id === 'USA') n.mpGain = 1000 * 0.12 * conscM * (peace ? 0.2 : 1);
  if (dry) return;
  n.money += n.income - n.expenses;
  n.mun += n.munProd - n.munIdle;
  if (n.mun < 0) n.mun = 0;
  n.mp += n.mpGain;
  // research
  if (n.res) {
    n.res.prog += n.rpGain;
    const cost = techCost(n, n.res.id);
    if (n.res.prog >= cost) {
      n.techs.push(n.res.id); computeFx(n);
      if (n.id === G.player) log(`Our scientists and staff officers have completed: ${TECH[n.res.id].name}.`, 'good', [n.id]);
      n.res = null;
    }
  } else n.rp = (n.rp || 0) + n.rpGain * 0.5;
  // fleet build
  if (n.fleetBuild > 0) { n.fleetBuild--; if (n.fleetBuild === 0) { n.fleet += 1; if (n.id === G.player) log('A new capital ship has been commissioned into the fleet.', 'good', [n.id]); } }
  // debt
  if (n.money < -100) { n.ws -= 1.5; n.wsWhy.push(['Debt crisis', -1.5]); }
}
function techCost(n, id) { const t = TECH[id]; const ahead = Math.max(0, t.year - curYear()); return Math.round(t.cost * (1 + 0.75 * ahead)); }
function techAvailable(n, id) { const t = TECH[id]; return !n.techs.includes(id) && t.req.every(r => n.techs.includes(r)); }

function reinforce(n) {
  const arms = G.armies.filter(a => a.nat === n.id && supplied(a));
  arms.sort((a, b) => a.str - b.str);
  for (const a of arms) {
    if (n.mp <= 0) break;
    const missing = a.div * DIV_MEN * (1 - a.str); if (missing <= 0) continue;
    const cap = a.div * DIV_MEN * 0.22 * (1 + n.fx.reinf);
    const add = Math.min(missing, cap, n.mp);
    n.mp -= add; a.str += add / (a.div * DIV_MEN);
    n.money -= add * 0.02; n.mun = Math.max(0, n.mun - add * 0.12);
  }
}

function progressConstruction() {
  for (const p of G.provs) {
    if (!p.build) continue;
    if (p.ctrl !== p.build.nat) { p.build = null; continue; }
    p.build.turns--;
    if (p.build.turns <= 0) {
      if (p.build.type === 'factory') p.ind++;
      else if (p.build.type === 'rail') p.rail = Math.min(2, p.rail + 1);
      else if (p.build.type === 'fort') p.fort = Math.min(3, p.fort + 1);
      if (p.build.nat === G.player) log(`Construction complete: ${{ factory: 'factory', rail: 'railway', fort: 'fortifications' }[p.build.type]} in ${p.name}.`, 'good', [p.build.nat]);
      p.build = null;
    }
  }
}
function canBuild(nat, i, type) {
  const p = P(i); if (p.ctrl !== nat || p.owner !== nat || p.build) return false;
  if (type === 'factory') return p.ind < 6;
  if (type === 'rail') return p.rail < 2;
  if (type === 'fort') return p.fort < 3;
  return false;
}
function startBuild(nat, i, type) {
  const n = N(nat); const c = COSTS[type]; if (!canBuild(nat, i, type) || n.money < c) return false;
  n.money -= c; P(i).build = { type, turns: BUILD_TURNS[type], nat }; return true;
}

// recruitment
function canRaise(nat, i) { const p = P(i); return p.ctrl === nat && p.owner === nat && (!G.supply || !sideOf(nat) || G.supply[sideOf(nat)].has(i)); }
function raiseArmy(nat, i, div, art) {
  const n = N(nat); const cost = div * COSTS.div + art * COSTS.art, men = div * DIV_MEN, mun = art * COSTS.artMun + div * COSTS.divMun;
  if (n.money < cost || n.mp < men || n.mun < mun || !canRaise(nat, i)) return null;
  n.money -= cost; n.mp -= men; n.mun -= mun;
  const a = makeArmy(nat, i, div, art); a.org = 0.5; a.fresh = true; a.ent = 0;
  return a;
}
function addUnits(a, type) {
  const n = N(a.nat);
  if (!supplied(a) || !friendly(a.nat, a.prov)) return false;
  if (type === 'div') { if (n.money < COSTS.div || n.mp < DIV_MEN || n.mun < COSTS.divMun) return false; n.money -= COSTS.div; n.mp -= DIV_MEN; n.mun -= COSTS.divMun; a.str = (a.str * a.div + 1) / (a.div + 1); a.div++; return true; }
  if (type === 'art') { if (n.money < COSTS.art || n.mun < COSTS.artMun) return false; n.money -= COSTS.art; n.mun -= COSTS.artMun; a.art++; return true; }
  if (type === 'tank') { if (!n.fx.tanks || n.money < COSTS.tank || n.mun < COSTS.tankMun) return false; n.money -= COSTS.tank; n.mun -= COSTS.tankMun; a.tanks++; return true; }
  return false;
}

// ---------------- WAR SUPPORT ----------------
function updateWarSupport(n) {
  n.wsWhy = n.wsWhy || [];
  const why = n.wsWhy;
  if (!n.side) { const d = clamp((70 - n.ws) * 0.05, -1, 1.5); n.ws += d; n.wsDelta = d; n.monthCas = 0; return; }
  let d = 0;
  const pop = Math.max(5, coreMp(n) + (n.id === 'USA' ? 100 : 0) + (NATIONS[n.id].empire ? 8 : 0));
  const casPen = -(n.monthCas / (pop * 1000)) * 400 * (n.id === 'RUS' ? 1.6 : 1);
  if (casPen < -0.05) why.push(['Casualties', casPen]); d += casPen;
  const food = -n.shortage * 14; if (food < -0.05) why.push(['Food shortages', food]); d += food;
  // occupation
  let own = 0, occ = 0; for (const p of G.provs) if (p.owner === n.id) { const v = provVP(p); own += v; if (p.ctrl !== n.id && atWar(n.id, p.ctrl)) occ += v; }
  const occF = own ? occ / own : 0; const occPen = -occF * 4; if (occPen < -0.05) why.push(['Occupied homeland', occPen]); d += occPen;
  // gains
  let gain = 0; for (const p of G.provs) if (p.ctrl === n.id && p.owner !== n.id && atWar(n.id, p.owner)) gain += provVP(p);
  const gainB = Math.min(1.5, gain * 0.025); if (gainB > 0.05) why.push(['Territory held', gainB]); d += gainB;
  const months = G.turn - (n.warStart || 0);
  if (months > 20) { const tired = -0.25 - (months - 20) * 0.008; why.push(['War weariness', tired]); d += tired; }
  if (n.id === 'RUS' && curYear() >= 1916) { const c = dardanellesOpen() ? -0.2 : -0.6; why.push(['Transport & supply crisis', c]); d += c; }
  if (n.fx.ws) { why.push(['Propaganda bureau', n.fx.ws]); d += n.fx.ws; }
  if (n.policy.propaganda) { why.push(['Propaganda campaign', 1]); d += 1; }
  if (n.policy.consc === 'total') { why.push(['Total mobilisation', -0.4]); d -= 0.4; }
  if (n.policy.bonds) { why.push(['War bond drives', -0.3]); d -= 0.3; }
  const drift = (50 - n.ws) * 0.012; d += drift;
  n.ws = clamp(n.ws + d, 0, 100); n.wsDelta = d;
  n.monthCas = 0;
  if (n.mutiny > 0) n.mutiny--;
}
function provVP(p) { return 1 + p.ind + (p.cap ? 5 : 0); }

// ---------------- DIPLOMACY ----------------
function joinSide(id, side, quiet) {
  const n = N(id); if (n.out || n.side) return;
  n.side = side; n.warStart = G.turn;
  G.deals = G.deals.filter(([a, b]) => { const o = a === id ? b : b === id ? a : null; return !o || !atWar(id, o); });
  for (const o in G.nations) { if (sideOf(o) === side && o !== id) addRel(id, o, 25); else if (sideOf(o) === otherSide(side)) addRel(id, o, -40); }
  if (!quiet) log(`${NATIONS[id].name} has entered the war on the side of the ${side === 'E' ? 'Entente' : 'Central Powers'}!`, 'major', [id]);
  if (id === 'USA') { G.flags.aef = G.turn + 3; }
  n.lean = { E: 0, C: 0 };
}
function declareWarOn(attacker, target) {
  const s = sideOf(attacker); if (!s || sideOf(target) || N(target).out) return false;
  joinSide(target, otherSide(s), true);
  log(`${NATIONS[attacker].name} has invaded neutral ${NATIONS[target].short}! ${NATIONS[target].short} joins the ${otherSide(s) === 'E' ? 'Entente' : 'Central Powers'}.`, 'major', [attacker, target]);
  for (const o in G.nations) if (!sideOf(o)) addRel(attacker, o, -15);
  G.usaTension += 10;
  if (['BEL', 'LUX', 'NED'].includes(target) && !sideOf('GBR') && !N('GBR').out && s === 'C') {
    joinSide('GBR', 'E', true); log('Britain, guarantor of Belgian neutrality, declares war on Germany!', 'major', ['GBR']);
  }
  return true;
}
function joinScore(id, side) {
  const n = N(id); let s = n.lean[side] || -40;
  s += rel(id, side === 'E' ? 'GBR' : 'GER') * 0.15;
  s += 25 * G.promises.filter(p => p.to === id && p.side === side).length;
  // momentum: war score of side
  s += sideMomentum(side) * 0.6;
  if (id === 'BUL' && side === 'C') { const srb = occupiedFrac('SRB'); s += srb * 30; }
  if (id === 'ROM' && side === 'E') { if (N('AUH').ws < 40) s += 12; if (P(MAP.idx.lem).ctrl === 'RUS' || P(MAP.idx.cze).ctrl === 'RUS') s += 12; }
  if (id === 'GRE' && side === 'E') { if (sideOf('BUL') === 'C') s += 10; }
  if (id === 'ITA' && side === 'E') { if (N('AUH').ws < 45) s += 8; }
  return s;
}
function sideMomentum(side) {
  let s = 0; for (const p of G.provs) { if (!p.owner || !sideOf(p.ctrl)) continue; const cs = sideOf(p.ctrl), os = sideOf(p.owner); if (cs === side && os && os !== side) s += provVP(p); else if (os === side && cs && cs !== side) s -= provVP(p); }
  return clamp(s / 4, -25, 25);
}
function occupiedFrac(id) { let own = 0, occ = 0; for (const p of G.provs) if (p.owner === id) { const v = provVP(p); own += v; if (p.ctrl !== id && atWar(id, p.ctrl)) occ += v; } return own ? occ / own : 0; }
function warScore(side) {
  let s = 0; for (const p of G.provs) { const cs = sideOf(p.ctrl), os = sideOf(p.owner); if (!cs || !os || cs === os) continue; if (cs === side) s += provVP(p); else s -= provVP(p); }
  return s;
}
function promise(from, to, provKey) {
  const side = sideOf(from); if (!side) return false;
  const i = MAP.idx[provKey]; if (G.promises.some(p => p.prov === i && p.side === side)) return false;
  G.promises.push({ from, to, prov: i, side });
  addRel(from, to, 15);
  return true;
}
function neutralDiplomacy() {
  for (const id of ['OTT', 'ITA', 'BUL', 'ROM', 'GRE']) {
    const n = N(id); if (n.side || n.out || id === G.player) continue;
    for (const s in (DRIFT[id] || {})) n.lean[s] += DRIFT[id][s];
    if (!anyAtWar('E')) continue;
    const sE = joinScore(id, 'E'), sC = joinScore(id, 'C');
    const s = sE >= sC ? 'E' : 'C', sc = Math.max(sE, sC);
    // AI side leaders make promises when close
    const leader = s === 'E' ? 'GBR' : 'GER';
    if (sc > 50 && sc < 80 && leader !== G.player && !G.promises.some(p => p.to === id && p.side === s) && sideOf(leader) === s) {
      const claims = (CLAIMS[id] || []).filter(k => { const o = P(MAP.idx[k]).owner; return sideOf(o) && sideOf(o) !== s; }).slice(0, 2);
      if (claims.length) { claims.forEach(k => promise(leader, id, k)); log(`Secret treaty: ${NATIONS[leader].short} promises ${claims.map(k => P(MAP.idx[k]).name).join(' and ')} to ${NATIONS[id].short}.`, 'info', [id, leader]); }
    }
    if (sc >= 80 && rnd() < 0.5) joinSide(id, s);
  }
  // Britain under the Eastern plan
  const gbr = N('GBR');
  if (!gbr.side && !gbr.out && G.player !== 'GBR' && sideOf('GER')) {
    G.flags.gbrScore = (G.flags.gbrScore || 30) + 2.5 + occupiedFrac('FRA') * 40;
    if (G.flags.gbrScore > 80 && rnd() < 0.5) joinSide('GBR', 'E');
  }
  // USA
  const usa = N('USA');
  if (!usa.side && !usa.out && sideOf('GER') === 'C') {
    G.usaTension += 0.5 + (N('GER').policy.sub && N('GER').fx.sub ? 6 : 0);
    if (G.usaTension >= 100 && G.player !== 'USA') joinSide('USA', 'E');
  }
  // Blockade
  if (G.seaCtrl.open === 'E' && sideOf('GER')) G.blockade = Math.min(0.7, G.blockade + 0.02); else G.blockade = Math.max(0, G.blockade - 0.05);
}

// ---------------- PEACE ----------------
function separatePeace(id, terms, quiet) {
  const n = N(id); if (n.out) return;
  const mySide = n.side; const winners = otherSide(mySide);
  n.lastSide = mySide; n.out = true; n.side = null; n.peaceTurn = G.turn;
  for (const p of G.provs) {
    if (p.owner === id && p.ctrl !== id) { if (terms === 'cede' && sideOf(p.ctrl) === winners) p.owner = p.ctrl; else p.ctrl = id; }
    else if (p.ctrl === id && p.owner !== id) p.ctrl = p.owner;
  }
  // promises against this nation
  for (const pr of G.promises) {
    const p = P(pr.prov);
    if (p.owner === id && pr.side === winners && sideOf(pr.to) === winners) { p.owner = pr.to; p.ctrl = pr.to; }
  }
  // relocate armies
  for (const a of G.armies) {
    const p = P(a.prov);
    if (a.nat === id && p.ctrl !== id) { const cap = capitalOf(id); if (cap >= 0) { a.prov = cap; a.path = []; } else a.str = 0; }
    else if (a.nat !== id && p.ctrl === id) { const home = nearestFriendly(a.nat, a.prov); if (home >= 0) { a.prov = home; a.path = []; } else a.str = 0; }
    a.path = a.path.filter(j => true); a.sea = null;
  }
  cleanupArmies();
  G.deals = G.deals.filter(d => true);
  if (!quiet) log(`${NATIONS[id].name} has signed a ${terms === 'cede' ? 'humiliating' : 'separate'} peace and leaves the war.`, 'major', [id]);
  checkSideDefeat();
}
function capitalOf(id) { let c = G.provs.find(p => p.owner === id && p.cap && p.ctrl === id); if (c) return c.i; c = G.provs.find(p => p.ctrl === id && p.owner === id); return c ? c.i : -1; }
function nearestFriendly(nat, from) {
  const q = [from], seen = new Set([from]);
  while (q.length) { const i = q.shift(); if (friendly(nat, i) && P(i).ctrl !== undefined && i !== from) return i; for (const j of LADJ[i]) if (!seen.has(j)) { seen.add(j); q.push(j); } }
  return capitalOf(nat);
}
function checkCollapse() {
  for (const id in G.nations) {
    const n = N(id); if (!n.side || n.out) continue;
    const occ = occupiedFrac(id); const capP = G.provs.find(p => p.owner === id && p.cap);
    const capLost = capP && capP.ctrl !== id;
    if (NATIONS[id].major && !NATIONS[id].offmap) {
      if ((capLost && occ > 0.5) || occ > 0.7) { log(`${NATIONS[id].name} capitulates!`, 'major', [id]); separatePeace(id, 'cede', true); continue; }
      if (n.ws <= 6 && id !== 'RUS') { log(`Revolution sweeps ${NATIONS[id].short}! The new government sues for peace.`, 'major', [id]); separatePeace(id, 'cede', true); continue; }
    } else if (!NATIONS[id].offmap) {
      const anyLeft = G.provs.some(p => p.owner === id && p.ctrl === id);
      if (!anyLeft && !n.exile) { n.exile = true; G.armies.forEach(a => { if (a.nat === id) a.str = 0; }); cleanupArmies(); log(`${NATIONS[id].short} is completely occupied; its government goes into exile.`, 'major', [id]); }
      if (anyLeft) n.exile = false;
      if (n.ws <= 3 && !n.exile && occ > 0.3) { log(`${NATIONS[id].short}, exhausted, makes a separate peace.`, 'major', [id]); separatePeace(id, 'cede', true); }
    }
  }
}
function checkSideDefeat() {
  if (G.over) return;
  const out = id => N(id).out;
  if (out('GER')) return endWar('E', 'Germany has been forced out of the war.');
  if (out('FRA') && (out('RUS') || out('GBR') || N('GBR').ws < 25)) return endWar('C', 'France has fallen and the Entente has collapsed.');
  if (out('GBR') && out('RUS') && N('FRA').ws < 30) return endWar('C', 'The Entente has collapsed.');
}
function endWar(winner, reason) {
  if (G.over) return;
  G.over = { winner, reason };
  for (const id in G.nations) { const n = N(id); if (n.side && n.side !== winner) separatePeace(id, 'cede', true); }
  for (const id in G.nations) { const n = N(id); if (n.side) { n.lastSide = n.side; n.side = null; n.out = true; } }
  log(`ARMISTICE. ${reason}`, 'major', []);
}
function playerPeace(target, terms) {
  // returns {ok, msg}
  const t = N(target), me = N(G.player);
  if (!atWar(G.player, target)) return { ok: false, msg: 'We are not at war with them.' };
  const occT = occupiedFrac(target), occMe = occupiedFrac(G.player);
  if (terms === 'demand') {
    const ok = t.ws < 20 || (occT > 0.3 && t.ws < 35) || (NATIONS[target].major === 0 && occT > 0.5);
    if (target === 'GER' && !ok) return { ok: false, msg: 'Berlin will never accept such terms while its armies stand.' };
    if (ok) { separatePeace(target, 'cede'); return { ok: true, msg: `${NATIONS[target].short} accepts our terms and cedes occupied territory.` }; }
    return { ok: false, msg: `${NATIONS[target].short} rejects our demands.` };
  }
  if (terms === 'white') {
    const ok = t.ws < 32 || (occT > 0.2 && t.ws < 45);
    if (ok && target !== 'GER' && target !== 'GBR' && target !== 'FRA') { separatePeace(target, 'white'); return { ok: true, msg: `${NATIONS[target].short} agrees to a separate peace.` }; }
    return { ok: false, msg: `${NATIONS[target].short} refuses to abandon its allies.` };
  }
  if (terms === 'sue') {
    const ok = occMe > 0.15 || me.ws < 30;
    if (ok) { separatePeace(G.player, 'cede'); return { ok: true, msg: 'We have sued for peace. The guns fall silent — at a heavy price.' }; }
    return { ok: false, msg: 'The enemy sees no reason to grant us peace — they demand far more than we can give.' };
  }
}

// ---------------- EVENTS ----------------
// each: id, when(G) -> bool, text, choices: [{label, fx()}], who (nation who chooses)
const EVENTS = [
  { id: 'goeben', who: 'OTT', when: () => G.turn === 1 && !sideOf('OTT'), title: 'The Goeben and Breslau',
    text: 'Two German warships, pursued by the Royal Navy, have slipped through the Dardanelles to Constantinople. Berlin offers to "sell" them to the Ottoman navy, crews and all.',
    choices: [{ label: 'Accept the ships (pro-German)', fx: () => { G.flags.goeben = 1; N('OTT').lean.C += 30; N('OTT').fleet += 1; } }, { label: 'Intern them and stay neutral', fx: () => { N('OTT').lean.C -= 10; } }] },
  { id: 'xmas', when: () => G.turn === 5 && sideOf('GER'), title: 'The Christmas Truce',
    text: 'Along stretches of the Western Front, soldiers of both sides have climbed out of their trenches to exchange gifts, sing carols and bury their dead. The high commands are not amused. "Home by Christmas" has proven a cruel joke.',
    choices: [{ label: 'A moment of humanity', fx: () => { for (const id in G.nations) if (sideOf(id)) N(id).ws += 2; } }] },
  { id: 'italyPrice', who: ['GBR', 'FRA'], when: () => G.turn >= 8 && !sideOf('ITA') && !N('ITA').out && sideOf('GBR') === 'E' && (G.player === 'GBR' || G.player === 'FRA'), title: 'Italy Names Her Price',
    text: 'Rome lets it be known that she would join the Entente in exchange for Trentino, Trieste, Tyrol and Dalmatia from Austria-Hungary. A secret treaty in London awaits your signature.',
    choices: [{ label: 'Sign the Treaty of London', fx: () => { ['tre', 'trs', 'dal2'].forEach(k => promise(G.player, 'ITA', k)); N('ITA').lean.E += 10; } }, { label: 'Refuse — Italy asks too much', fx: () => { N('ITA').lean.E -= 15; } }] },
  { id: 'bulPrice', who: ['GER', 'AUH'], when: () => G.turn >= 12 && !sideOf('BUL') && !N('BUL').out && sideOf('GER') === 'C' && (G.player === 'GER' || G.player === 'AUH'), title: 'Bulgaria Names Her Price',
    text: 'Tsar Ferdinand will march against Serbia if the Central Powers guarantee Bulgaria all of Serbian Macedonia.',
    choices: [{ label: 'Guarantee Macedonia', fx: () => { ['sko', 'mon'].forEach(k => promise(G.player, 'BUL', k)); } }, { label: 'Decline', fx: () => { N('BUL').lean.C -= 10; } }] },
  { id: 'shells', who: 'GBR', when: () => G.turn >= 10 && sideOf('GBR') === 'E' && N('GBR').mun < 250, title: 'The Shell Crisis',
    text: 'The Times reports that the failed offensive at Aubers Ridge was caused by a shortage of high-explosive shells. The government is under fire.',
    choices: [{ label: 'Create a Ministry of Munitions (−60 funds, +munitions tech)', fx: () => { const n = N('GBR'); n.money -= 60; if (!n.techs.includes('shells')) { n.techs.push('shells'); computeFx(n); } } }, { label: 'Blame the generals', fx: () => { N('GBR').ws -= 4; } }] },
  { id: 'subStart', who: 'GER', when: () => G.turn === 7 && sideOf('GER') === 'C' && sideOf('GBR') === 'E' && N('GER').fx.sub, title: 'War Zone Around the British Isles',
    text: 'The Admiralty proposes declaring the waters around Britain a war zone in which merchant ships will be sunk without warning. It would bite hard into British supply — and enrage neutral America.',
    choices: [{ label: 'Unleash the U-boats', fx: () => { N('GER').policy.sub = true; } }, { label: 'Abide by prize rules', fx: () => { N('GER').policy.sub = false; } }] },
  { id: 'lusitania', who: 'GER', when: () => !G.flags.lusi && N('GER').policy.sub && sideOf('GER') === 'C' && G.turn >= 8 && !sideOf('USA'), title: 'The Lusitania Sunk',
    text: 'A U-boat has torpedoed the liner RMS Lusitania off Ireland. Nearly 1,200 dead, 128 of them Americans. Washington sends a furious note.',
    choices: [{ label: 'Restrict submarine warfare', fx: () => { G.flags.lusi = 1; G.usaTension += 12; N('GER').policy.sub = false; } }, { label: 'Defy Washington', fx: () => { G.flags.lusi = 1; G.usaTension += 30; } }] },
  { id: 'subAgain', who: 'GER', when: () => G.turn >= 30 && !G.flags.sub2 && sideOf('GER') === 'C' && !N('GER').policy.sub && !sideOf('USA') && N('GER').fx.sub, title: 'Unrestricted Submarine Warfare',
    text: 'The Admiralty promises to starve Britain into submission within six months — if the U-boats are freed from all restraint. America will likely enter the war.',
    choices: [{ label: 'Resume unrestricted warfare', fx: () => { G.flags.sub2 = 1; N('GER').policy.sub = true; } }, { label: 'Not yet', fx: () => { G.flags.sub2 = 1; } }] },
  { id: 'zimmermann', when: () => G.turn >= 31 && !G.flags.zim && N('GER').policy.sub && !sideOf('USA') && sideOf('GER') === 'C', title: 'The Zimmermann Telegram',
    text: 'British codebreakers have intercepted a German offer to Mexico: an alliance, and the return of Texas, New Mexico and Arizona. The American press is in uproar.',
    choices: [{ label: 'Remarkable', fx: () => { G.flags.zim = 1; G.usaTension += 35; } }] },
  { id: 'febrev', who: 'RUS', when: () => sideOf('RUS') === 'E' && !N('RUS').revo && N('RUS').ws < 28 && G.turn >= 12, title: 'Revolution in Petrograd',
    text: 'Bread riots and mutinous garrisons have toppled the Tsar. A Provisional Government promises to fight on — but the Petrograd Soviet orders soldiers to elect committees.',
    choices: [{ label: 'Fight on for the Revolution', fx: () => { const n = N('RUS'); n.revo = 1; n.ws += 12; n.mutiny = 4; } }, { label: 'Seek an honourable peace', fx: () => { const n = N('RUS'); n.revo = 1; separatePeace('RUS', 'white'); } }] },
  { id: 'octrev', when: () => sideOf('RUS') === 'E' && N('RUS').revo && N('RUS').ws < 14, title: 'The Bolsheviks Seize Power',
    text: 'Lenin\'s Bolsheviks have stormed the Winter Palace. Their slogan is "Peace, Land and Bread". An armistice is signed with the Central Powers; the price will be dreadful.',
    choices: [{ label: 'Peace at Brest-Litovsk', fx: () => { separatePeace('RUS', 'cede'); } }] },
  { id: 'mutiny', who: 'FRA', when: () => sideOf('FRA') === 'E' && !G.flags.mutiny && N('FRA').ws < 32 && G.turn >= 18, title: 'Mutiny in the French Army',
    text: 'After another failed offensive, whole divisions refuse to attack. They will hold the line, they say, but they will no longer be slaughtered.',
    choices: [{ label: 'Pétain\'s reforms: leave, rest, no more futile attacks', fx: () => { G.flags.mutiny = 1; const n = N('FRA'); n.ws += 8; n.mutiny = 4; } }, { label: 'Crack down: courts-martial', fx: () => { G.flags.mutiny = 1; const n = N('FRA'); n.ws -= 3; G.armies.forEach(a => { if (a.nat === 'FRA') a.org *= 0.7; }); } }] },
  { id: 'flu', when: () => G.turn === 48, title: 'The Spanish Influenza',
    text: 'A virulent influenza is sweeping through the trenches and the cities of every nation. Hospitals are overwhelmed.',
    choices: [{ label: 'Grim news', fx: () => { for (const id in G.nations) if (sideOf(id)) { N(id).mp *= 0.85; N(id).ws -= 3; G.armies.forEach(a => { if (a.nat === id) a.str *= 0.95; }); } } }] },
  { id: 'dardanelles', who: 'GBR', when: () => G.turn >= 8 && G.turn <= 14 && sideOf('OTT') === 'C' && sideOf('GBR') === 'E' && !G.flags.dard, title: 'The Dardanelles Gamble',
    text: 'The First Lord of the Admiralty proposes forcing the Dardanelles with the fleet and landing troops at Gallipoli, knocking the Ottomans out of the war and opening a supply route to Russia.',
    choices: [{ label: 'Launch the landings', fx: () => { G.flags.dard = 'go'; if (G.player === 'GBR') { P(MAP.idx.gpl).fort = Math.max(0, P(MAP.idx.gpl).fort - 2); log('The fleet bombards the Dardanelles forts. Ship an army from a British port to Gallipoli to make the landing.', 'info', ['GBR']); } } }, { label: 'Concentrate on the Western Front', fx: () => { G.flags.dard = 'no'; } }] },
];

function runEvents() {
  for (const ev of EVENTS) {
    if (G.flags['ev_' + ev.id]) continue;
    let ok = false; try { ok = ev.when(); } catch (e) { ok = false; }
    if (!ok) continue;
    G.flags['ev_' + ev.id] = 1;
    const whos = Array.isArray(ev.who) ? ev.who : [ev.who];
    if (ev.who && whos.includes(G.player)) G.pending.push(ev.id);
    else {
      // AI picks
      let c = 0;
      if (ev.id === 'goeben') c = 0; else if (ev.id === 'lusitania') c = rnd() < 0.65 ? 0 : 1; else if (ev.id === 'subAgain') c = 0;
      else if (ev.id === 'febrev') c = 0; else if (ev.id === 'mutiny') c = 0; else if (ev.id === 'dardanelles') c = rnd() < 0.7 ? 0 : 1;
      else if (ev.id === 'subStart') c = 0;
      ev.choices[c].fx();
      G.report.events.push({ id: ev.id, choice: c });
      const first = ev.text.split(/(?<=[.!])\s/)[0];
      log(`${ev.title}. ${first}`, ['xmas', 'flu', 'zimmermann', 'octrev', 'febrev', 'lusitania', 'mutiny'].includes(ev.id) ? 'major' : 'info', ev.who ? [].concat(ev.who) : []);
    }
  }
}
function resolvePending(evId, c) { const ev = EVENTS.find(e => e.id === evId); ev.choices[c].fx(); G.pending = G.pending.filter(x => x !== evId); }

// ---------------- OUTBREAK ----------------
function outbreak() {
  for (const s of ['E', 'C']) for (const id of ALLIANCE_START[s]) joinSide(id, s, true);
  log('The Austro-Hungarian ultimatum to Serbia has expired. Austria-Hungary declares war on Serbia; Russia mobilises; Germany declares war on Russia and France. Europe is at war!', 'major', []);
  if (G.plans.GER === 'W') {
    joinSide('BEL', 'E', true); joinSide('LUX', 'E', true);
    joinSide('GBR', 'E', true);
    log('German troops pour across the Belgian frontier. Britain declares war on Germany!', 'major', ['GBR', 'BEL']);
    const bef = G.armies.find(a => a.bef);
    if (bef && G.plans.GBR === 'S') { bef.prov = MAP.idx.lil; bef.bef = false; log('The British Expeditionary Force lands in France.', 'info', ['GBR']); }
    // order German right wing into Belgium (AI or player can override)
  } else {
    log('Germany stands on the defensive in the West. Belgium remains neutral; Britain hesitates.', 'major', ['GBR']);
    G.flags.gbrScore = 35;
  }
  for (const id in G.nations) if (N(id).side) N(id).warStart = 0;
}

// ---------------- AI ----------------
function powerOf(a) { return a.div * a.str * NATIONS[a.nat].qual * (0.5 + 0.5 * a.org) + a.art * 0.5 + a.tanks * 0.6; }
function aiTurn(id) {
  const n = N(id); if (n.out) return;
  // research
  if (!n.res) { const t = AI_TECH_PRIORITY.find(t => techAvailable(n, t) && (TECH[t].year <= curYear() || techCost(n, t) < 120)); if (t) n.res = { id: t, prog: n.rp || 0 }, n.rp = 0; }
  if (!n.side) { n.sl = { mun: 0.25, res: 0.15 }; return; }
  // economy sliders
  n.sl = { mun: 0.5, res: 0.17 };
  if (n.mun > 500) n.sl = { mun: 0.35, res: 0.25 };
  if (n.money < 0) n.sl = { mun: 0.45, res: 0.1 };
  if (n.mun < 60) n.sl = { mun: 0.65, res: 0.1 };
  if (n.ws < 30 && n.money > 100) n.policy.propaganda = true; else if (n.money < 40) n.policy.propaganda = false;
  n.policy.bonds = n.money < 60 && n.ws > 35;
  if (n.id === 'GBR' && G.turn >= 18) n.policy.consc = 'conscription';
  if (n.ws > 55 && G.turn > 24 && n.mp < 200) n.policy.consc = 'total'; else if (n.ws < 35 && n.policy.consc === 'total') n.policy.consc = 'conscription';
  if (id === 'GER' && n.fx.sub && G.turn >= 30 && (n.shortage > 0.05 || G.turn >= 31) && G.flags.ev_subAgain) n.policy.sub = n.policy.sub;
  // construction
  const building = G.provs.filter(p => p.build && p.build.nat === id).length;
  if (n.money > 220 && building < 2) {
    const fr = frontierSet(id);
    const cands = G.provs.filter(p => canBuild(id, p.i, 'factory') && !fr.has(p.i));
    if (cands.length) { cands.sort((a, b) => b.ind - a.ind); startBuild(id, cands[0].i, 'factory'); }
  }
  if (n.money > 160 && building < 3 && curYear() >= 1915) {
    const fr = [...frontierSet(id)].filter(i => canBuild(id, i, 'fort') && P(i).fort < 2);
    if (fr.length) startBuild(id, fr[Math.floor(rnd() * fr.length)], 'fort');
  }
  // recruitment
  aiMilitary(id);
  aiRecruit(n);
  aiMerge(id);
}
function frontierSet(id) {
  const s = sideOf(id); const set = new Set();
  for (const p of G.provs) { if (sideOf(p.ctrl) !== s) continue; if (LADJ[p.i].some(j => { const c = sideOf(P(j).ctrl); return c && c !== s; })) set.add(p.i); }
  return set;
}
function aiRecruit(n) {
  const arms = nArmies(n.id);
  const totalDiv = arms.reduce((s, a) => s + a.div, 0);
  const reserve = totalDiv * DIV_MEN * 0.25;
  let tries = 0;
  const smallArmies = arms.filter(a => a.div < 10).length;
  if (smallArmies > 2) tries = 2;
  while (tries++ < 3 && n.mp > reserve + 4 * DIV_MEN && n.money > 4 * COSTS.div + 35 && n.mun > 4 * COSTS.divMun + 40) {
    const fr = [...frontierSet(n.id)].filter(i => canRaise(n.id, i));
    let spot = -1;
    const nd = G.aiNeed && G.aiNeed[n.id];
    if (fr.length) { fr.sort((a, b) => (nd ? nd[b] : 0) - (nd ? nd[a] : 0) || threatAt(b, n.id) - threatAt(a, n.id)); spot = fr[0]; }
    else { const c = capitalOf(n.id); if (c >= 0 && canRaise(n.id, c)) spot = c; else { const any = G.provs.find(p => canRaise(n.id, p.i)); spot = any ? any.i : -1; } }
    if (spot < 0) break;
    if (!raiseArmy(n.id, spot, 4, n.mun > 80 ? 1 : 0)) break;
  }
  // top up existing armies first
  for (const a of arms.slice().sort((x, y) => (G.aiNeed && G.aiNeed[n.id] ? G.aiNeed[n.id][y.prov] - G.aiNeed[n.id][x.prov] : 0))) {
    if (a.div >= 12 || n.mp < reserve + 2 * DIV_MEN || n.money < COSTS.div + 30 || n.mun < COSTS.divMun + 50) continue;
    if (a.str > 0.75) addUnits(a, 'div');
  }
  // artillery & tanks
  for (const a of arms) {
    if (n.mun > 220 && n.money > 80 && a.art < a.div / 2.5) addUnits(a, 'art');
    if (n.fx.tanks && n.mun > 150 && n.money > 120 && a.tanks < 2 && frontierSet(n.id).has(a.prov)) addUnits(a, 'tank');
  }
}
function threatAt(i, nat) {
  let t = 0; for (const j of LADJ[i]) { if (!atWar(nat, P(j).ctrl)) continue; t += 1; for (const a of G.armies) if (a.prov === j && atWar(a.nat, nat)) t += powerOf(a); }
  return t;
}
function aiMilitary(id) {
  const n = N(id), s = n.side; const NP = MAP.NP;
  const mine = G.armies.filter(a => a.nat === id && !a.fresh);
  if (!mine.length) return;
  for (const a of mine) { a.path = []; a.sea = null; }
  const ownPow = new Float64Array(NP), enePow = new Float64Array(NP);
  for (const a of G.armies) { const sa = sideOf(a.nat); if (sa === s) ownPow[a.prov] += powerOf(a); else if (sa && sa !== s) enePow[a.prov] += powerOf(a); }
  const fr = frontierSet(id);
  const threat = new Float64Array(NP);
  for (const i of fr) { let t = 0; for (const j of LADJ[i]) if (sideOf(P(j).ctrl) && sideOf(P(j).ctrl) !== s) t += enePow[j] + 0.6; threat[i] = t; }
  const used = new Set();
  const early = G.turn <= 4;
  const thresh = NATIONS[id].aggr - (early ? 0.25 : 0) + (n.mutiny ? 0.8 : 0) + (n.ws < 25 ? 0.4 : 0) + (n.mun < 40 ? 0.4 : 0);
  // Gallipoli
  if (id === 'GBR' && G.flags.dard === 'go' && !G.flags.dardDone && sideOf('OTT') === 'C') {
    const gp = MAP.idx.gpl; const cands = mine.filter(a => !fr.has(a.prov) && seaRoute(id, a.prov, gp)).slice(0, 2);
    if (cands.length) { cands.forEach(a => { a.sea = gp; used.add(a.id); }); G.flags.dardDone = 1; log('British and ANZAC troops storm ashore at Gallipoli!', 'major', ['GBR', 'OTT']); }
  }
  // 1) attacks
  const targets = new Set();
  for (const a of mine) for (const j of LADJ[a.prov]) if (hostileProv(id, j)) targets.add(j);
  const tlist = [];
  for (const t of targets) {
    const avail = mine.filter(a => !used.has(a.id) && LADJ[a.prov].includes(t) && a.org >= 0.55 && a.str >= 0.5 && !a.hold);
    if (!avail.length) continue;
    const defs = armiesIn(t).filter(d => atWar(d.nat, id));
    if (!defs.length && !garrisonPow(P(t))) { tlist.push({ t, avail, score: 100 + provVP(P(t)), empty: true }); continue; }
    const est = estimateBattle(avail, t);
    const allE = est.ratio;
    const schlieffen = id === 'GER' && G.plans.GER === 'W' && G.turn <= 3 && ['BEL', 'LUX'].includes(P(t).owner);
    tlist.push({ t, avail, ratio: allE, score: (allE >= thresh ? 10 : 0) + provVP(P(t)) * 0.5 + Math.min(allE, 3) + (schlieffen ? 40 : 0) });
  }
  tlist.sort((a, b) => b.score - a.score);
  for (const tg of tlist) {
    const avail = tg.avail.filter(a => !used.has(a.id)); if (!avail.length) continue;
    if (tg.empty) {
      // send one army whose origin isn't left exposed
      avail.sort((a, b) => powerOf(a) - powerOf(b));
      for (const a of avail) { const rest = ownPow[a.prov] - powerOf(a); if (rest >= threat[a.prov] * 0.5 || threat[a.prov] < 2 || early) { a.path = [tg.t]; used.add(a.id); ownPow[a.prov] -= powerOf(a); break; } }
      continue;
    }
    // commit the smallest force that gives acceptable odds
    avail.sort((a, b) => powerOf(a) - powerOf(b));
    const group = [];
    const want = Math.max(thresh, 1.9);
    for (const a of avail) { group.push(a); const e = estimateBattle(group, tg.t); if (e.ratio >= want) break; }
    const e = estimateBattle(group, tg.t);
    if (e.ratio >= thresh) { group.forEach(a => { a.path = [tg.t]; used.add(a.id); }); }
  }
  // 1b) grand offensive: generals of 1914-18 attacked even at poor odds
  const totalDiv = mine.reduce((t, a) => t + a.div, 0);
  const offN = n.mutiny || n.ws < 30 || n.mun < 60 ? 0 : totalDiv > 90 ? 2 : totalDiv > 30 ? 1 : 0;
  const pOff = { GER: 0.55, FRA: 0.6, GBR: 0.5, RUS: 0.6, AUH: 0.45, ITA: 0.7, OTT: 0.35, USA: 0.6 }[id] || 0.3;
  for (let k = 0; k < offN; k++) {
    if (rnd() > pOff) continue;
    let best = null, bs = 0;
    for (const t of targets) {
      const avail = mine.filter(a => !used.has(a.id) && LADJ[a.prov].includes(t) && a.org >= 0.6 && a.str >= 0.6 && !a.hold);
      if (!avail.length) continue;
      const e = estimateBattle(avail, t);
      if (e.ratio < 0.75) continue;
      const sc = e.ratio * (1 + provVP(P(t)) * 0.15) * Math.sqrt(avail.reduce((s, a) => s + a.div, 0));
      if (sc > bs) { bs = sc; best = { t, avail }; }
    }
    if (best) best.avail.forEach(a => { a.path = [best.t]; used.add(a.id); });
  }
  // 2) redeploy
  const defNeed = new Float64Array(NP), offB = new Float64Array(NP);
  const ec = Math.min(entCap(id), 3);
  for (const i of fr) {
    const p = P(i); const terr = p.terr === 'mountain' ? 0.6 : p.terr === 'hills' ? 0.25 : p.terr === 'marsh' ? 0.3 : 0;
    const dm = (1 + ec * 0.25 + p.fort * 0.2 + terr) * (1 + n.fx.def);
    defNeed[i] = threat[i] * 1.25 / dm - ownPow[i];
  }
  const cap = capitalOf(id);
  if (cap >= 0) {
    // emergency: enemy armies near the capital
    const near = new Map([[cap, 0]]); const q = [cap];
    while (q.length) { const i = q.shift(); const d = near.get(i); if (d >= 3) continue; for (const j of LADJ[i]) if (!near.has(j)) { near.set(j, d + 1); q.push(j); } }
    let danger = 0; for (const [i, d] of near) if (enePow[i] > 0) danger += enePow[i] / (1 + d);
    if (danger > 0) for (const [i, d] of near) if (fr.has(i) && d <= 2) defNeed[i] += danger * (d === 0 ? 1.5 : 0.8);
  }
  const westFocus = id === 'GER' && G.plans.GER === 'W' && G.turn <= 4;
  for (const i of fr) {
    let opp = 0;
    for (const j of LADJ[i]) { if (!hostileProv(id, j)) continue; const v = provVP(P(j)) * (P(j).owner === id ? 3 : sideOf(P(j).owner) === s ? 1.8 : 1); opp = Math.max(opp, v * 1.5 / (1 + (enePow[j] + garrisonPow(P(j)) * 0.5) * 0.12)); }
    if (westFocus) opp *= MAP.ax[i] < projX(10) ? 3 : 0.3;
    offB[i] = opp;
  }
  const invaded = new Set(); for (const p of G.provs) if (p.owner === id && p.ctrl !== id) for (const j of LADJ[p.i]) invaded.add(j);
  const homeF = i => P(i).owner === id ? (invaded.has(i) ? 3 : 2) : P(i).ctrl === id ? 1.2 : sideOf(P(i).owner) === s ? 1.1 : 0.8;
  const free = mine.filter(a => !used.has(a.id) && !a.hold);
  free.sort((a, b) => (fr.has(a.prov) ? 1 : 0) - (fr.has(b.prov) ? 1 : 0));
  for (const a of free) {
    const pw = powerOf(a);
    const here = a.prov;
    // how much does this army matter where it stands?
    const stay = fr.has(here) ? Math.max(0, Math.min(pw, defNeed[here] + pw)) * homeF(here) + offB[here] * 0.3 : 0;
    const dmap = bfsFriendly(id, here, 16);
    let best = -1, bs = 0;
    for (const [i, d] of dmap) {
      if (!fr.has(i) || i === here) continue;
      const val = Math.min(pw, Math.max(0, defNeed[i])) * homeF(i) + offB[i];
      if (val <= 0) continue;
      const sc = val / (1 + d * 0.15);
      if (sc > bs) { bs = sc; best = i; }
    }
    if (fr.has(here) && bs < stay * 1.2 + 1) continue;
    if (best < 0 && !fr.has(here)) {
      let bs2 = 0;
      for (const i of fr) { const val = Math.max(0, defNeed[i]) * 2 + offB[i]; if (val <= 0) continue; const d = bfsFriendly(id, i, 3); for (const [c] of d) { if (P(c).coast && friendly(id, c) && seaRoute(id, here, c)) { const sc = val / (2 + d.get(c)); if (sc > bs2) { bs2 = sc; best = c; } } } }
      if (best >= 0) { a.sea = best; a.path = []; defNeed[best] -= pw; used.add(a.id); continue; }
      for (const [i] of dmap) if (fr.has(i)) { best = i; break; }
    }
    if (best >= 0) {
      const path = findPath(id, here, best);
      if (path) { a.path = path; defNeed[best] -= pw; offB[best] *= 0.6; if (fr.has(here)) defNeed[here] += pw; used.add(a.id); }
    }
  }
  G.aiNeed = G.aiNeed || {}; G.aiNeed[id] = defNeed;
}
function aiMerge(id) {
  const byProv = new Map();
  for (const a of G.armies) if (a.nat === id && !a.path.length && a.sea === null) { if (!byProv.has(a.prov)) byProv.set(a.prov, []); byProv.get(a.prov).push(a); }
  for (const [, list] of byProv) {
    if (list.length < 2) continue;
    list.sort((a, b) => b.div - a.div);
    for (let k = list.length - 1; k > 0; k--) {
      const small = list[k];
      const tgt = list.find(b => b !== small && G.armies.includes(b) && b.div + small.div <= 14);
      if (!tgt) continue;
      const tot = tgt.div + small.div;
      tgt.str = (tgt.str * tgt.div + small.str * small.div) / tot; tgt.org = (tgt.org * tgt.div + small.org * small.div) / tot;
      tgt.exp = (tgt.exp * tgt.div + small.exp * small.div) / tot; tgt.ent = Math.min(tgt.ent, small.ent);
      tgt.div = tot; tgt.art += small.art; tgt.tanks += small.tanks;
      G.armies = G.armies.filter(b => b !== small);
    }
  }
}

// ---------------- TURN ----------------
function endTurn() {
  if (G.over) return;
  G.report = { battles: [], news: [], events: [], date: dateStr(G.turn + 1) };
  if (G.turn === 0) outbreak();
  updateSeaControl(); computeSupply();
  for (const a of G.armies) { a.moved = false; a.retreated = false; a.attacking = null; }
  // AI
  for (const id in G.nations) if (id !== G.player) aiTurn(id);
  // Movement & battles
  const attacks = executeMoves();
  // neutral violation
  for (const [t, arms] of attacks) {
    const owner = P(t).ctrl;
    if (!sideOf(owner) && !N(owner).out) { declareWarOn(arms[0].nat, owner); }
  }
  const tl = [...attacks.keys()].sort(() => rnd() - 0.5);
  G.underAttack = new Set(attacks.keys());
  for (const t of tl) {
    const arms = attacks.get(t).filter(a => a.str > 0.08 && G.armies.includes(a) && LADJ[a.prov].includes(t) || (a.amph && G.armies.includes(a)));
    const valid = arms.filter(a => hostileProv(a.nat, t));
    if (!valid.length) continue;
    const rec = resolveBattle(t, valid);
    rec.atkNats = rec.atk; G.report.battles.push(rec);
    if (!rec.empty) G.history.push({ t: G.turn, prov: t, atk: rec.atk, def: rec.def, res: rec.result, al: rec.atkLoss, dl: rec.defLoss });
  }
  for (const a of G.armies) if (a.amph && a.prov !== a.attacking) { a.amph = false; }
  delete G.underAttack;
  // attrition / supply / entrenchment / org
  computeSupply();
  for (const a of G.armies) {
    const n = N(a.nat);
    if (!sideOf(a.nat)) { a.org = Math.min(1, a.org + 0.2); continue; }
    if (!supplied(a)) { a.str -= 0.08; a.org = Math.max(0, a.org - 0.15); const l = a.div * DIV_MEN * 0.08; n.stats.cas += l; n.monthCas += l * 0.5; }
    else a.org = Math.min(1, a.org + 0.22 * (n.mutiny ? 0.6 : 1) * (n.mun > 0 ? 1 : 0.6));
    if (!a.moved && !a.retreated && !a.attacking) { a.ent = Math.min(entCap(a.nat), a.ent + 1); }
    // front-line attrition: shelling, snipers, disease
    if (LADJ[a.prov].some(j => G.armies.some(b => b.prov === j && atWar(a.nat, b.nat)))) { const l = a.str * 0.012; a.str -= l; const men = a.div * DIV_MEN * l; n.stats.cas += men; n.monthCas += men; }
    a.fresh = false;
  }
  cleanupArmies();
  // economy
  updateSeaControl();
  for (const id in G.nations) { const n = N(id); n.wsWhy = []; calcEconomy(n); reinforce(n); }
  progressConstruction();
  for (const id in G.nations) updateWarSupport(N(id));
  // AEF arrivals
  if (sideOf('USA') === 'E' && G.flags.aef && G.turn >= G.flags.aef && (G.flags.aefCount || 0) < 8) {
    const ports = ['brt', 'nan', 'bdx', 'nor', 'rou', 'lon'].map(k => MAP.idx[k]).filter(i => sideOf(P(i).ctrl) === 'E');
    if (ports.length && N('USA').mp > 120) { const a = makeArmy('USA', ports[0], 8, 2); a.org = 0.7; N('USA').mp -= 120; G.flags.aefCount = (G.flags.aefCount || 0) + 1; if (G.flags.aefCount === 1) log('The first divisions of the American Expeditionary Force arrive in France.', 'major', ['USA']); }
  }
  neutralDiplomacy();
  checkCollapse();
  G.turn++;
  runEvents();
  updateSeaControl(); computeSupply();
  if (!G.over && G.turn >= 65) {
    const ws = warScore('E');
    endWar(ws >= 0 ? 'E' : 'C', 'Exhausted, the belligerents agree to an armistice. ' + (ws >= 0 ? 'The Entente holds the advantage.' : 'The Central Powers hold the advantage.'));
  }
  if (!G.over && N(G.player).out) G.over = G.over || { winner: null, reason: `${NATIONS[G.player].short} has left the war.` };
  for (const id in G.nations) if (id !== G.player && !N(id).out) { /* ensure research */ }
  return G.report;
}

// ---------------- SAVE ----------------
function saveGame() { try { localStorage.setItem('gw1914_save', JSON.stringify(G)); return true; } catch (e) { return false; } }
function loadGame() { try { const s = localStorage.getItem('gw1914_save'); if (!s) return false; G = JSON.parse(s); for (const id in G.nations) computeFx(G.nations[id]); updateSeaControl(); computeSupply(); return true; } catch (e) { return false; } }
function hasSave() { try { return !!localStorage.getItem('gw1914_save'); } catch (e) { return false; } }

// ---------------- PLAYER ACTIONS ----------------
function fleetSortie(id) {
  const n = N(id); if (!n.side || n.fleet < 1) return { ok: false, msg: 'No fleet to sortie.' };
  if ((n.sortieCd || 0) > G.turn) return { ok: false, msg: 'The fleet is still refitting.' };
  let enemy = null, ep = 0;
  for (const o in G.nations) if (atWar(id, o) && fleetPow(o) > ep) { ep = fleetPow(o); enemy = o; }
  if (!enemy) return { ok: false, msg: 'No enemy fleet to engage.' };
  const mine = fleetPow(id), r = mine / ep;
  const pWin = r / (1 + r);
  const win = rnd() < pWin;
  const myLoss = Math.max(1, Math.round(n.fleet * (win ? 0.06 : 0.14) * (0.6 + rnd() * 0.8)));
  const enLoss = Math.max(1, Math.round(N(enemy).fleet * (win ? 0.15 : 0.05) * (0.6 + rnd() * 0.8)));
  n.fleet = Math.max(0, n.fleet - myLoss); N(enemy).fleet = Math.max(0, N(enemy).fleet - enLoss);
  n.sortieCd = G.turn + 6;
  n.ws += win ? 4 : -3; N(enemy).ws += win ? -3 : 2;
  updateSeaControl();
  const msg = `Fleet action in the ${enemy === 'GBR' ? 'North Sea' : 'open sea'}: ${win ? 'a victory' : 'a reverse'}! We lost ${myLoss} capital ship${myLoss > 1 ? 's' : ''}; the ${NATIONS[enemy].adj} lost ${enLoss}.`;
  log(msg, win ? 'good' : 'bad', [id, enemy]);
  return { ok: true, msg };
}
function improveRelations(from, to) { const n = N(from); if (n.money < COSTS.relations) return false; n.money -= COSTS.relations; addRel(from, to, 8); const t = N(to); if (!t.side && !t.out && n.side) t.lean[n.side] = (t.lean[n.side] || 0) + 3; return true; }
function hasDeal(a, b) { return G.deals.some(([x, y]) => (x === a && y === b) || (x === b && y === a)); }
function requestDeal(from, to) {
  const n = N(from); if (n.money < COSTS.deal || hasDeal(from, to) || atWar(from, to)) return { ok: false, msg: 'Not possible.' };
  n.money -= COSTS.deal;
  const chance = 0.45 + rel(from, to) / 100 - (sideOf(from) === 'C' && G.blockade > 0.4 ? 0.2 : 0);
  if (rnd() < chance) { G.deals.push([from, to]); return { ok: true, msg: `${NATIONS[to].short} signs a trade agreement.` }; }
  addRel(from, to, 3); return { ok: false, msg: `${NATIONS[to].short} declines for now. Relations improve slightly.` };
}
function cancelDeal(a, b) { G.deals = G.deals.filter(([x, y]) => !((x === a && y === b) || (x === b && y === a))); addRel(a, b, -10); }
function inviteToWar(from, to) {
  const s = sideOf(from); if (!s) return { ok: false, msg: 'We are not at war.' };
  const sc = joinScore(to, s);
  if (sc >= 65) { joinSide(to, s); return { ok: true, msg: `${NATIONS[to].short} accepts and declares war!` }; }
  addRel(from, to, -2);
  return { ok: false, msg: `${NATIONS[to].short} is not yet ready to join us (inclination ${Math.round(sc)}/65). Offer territory or improve relations.` };
}
function subsidize(from, to) { const n = N(from); if (n.money < 50) return false; n.money -= 50; N(to).money += 50; N(to).ws += 1.5; addRel(from, to, 5); return true; }
function splitArmy(a) { if (a.div < 2) return null; const half = Math.floor(a.div / 2), ah = Math.floor(a.art / 2), th = Math.floor(a.tanks / 2); a.div -= half; a.art -= ah; a.tanks -= th; const b = makeArmy(a.nat, a.prov, half, ah, th); b.str = a.str; b.org = a.org; b.ent = a.ent; b.exp = a.exp; b.fresh = false; return b; }
function mergeArmies(a) { const others = G.armies.filter(b => b !== a && b.nat === a.nat && b.prov === a.prov); for (const b of others) { const tot = a.div + b.div; a.str = (a.str * a.div + b.str * b.div) / tot; a.org = (a.org * a.div + b.org * b.div) / tot; a.exp = (a.exp * a.div + b.exp * b.div) / tot; a.ent = Math.min(a.ent, b.ent); a.div = tot; a.art += b.art; a.tanks += b.tanks; } G.armies = G.armies.filter(b => !others.includes(b)); return others.length; }
function disband(a) { const n = N(a.nat); n.mp += armyMen(a) * 0.6; G.armies = G.armies.filter(b => b !== a); }
function buildShip(id) { const n = N(id); if (n.money < COSTS.ship || n.fleetBuild > 0) return false; n.money -= COSTS.ship; n.fleetBuild = 10; return true; }
