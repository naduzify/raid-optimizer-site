import { useState, useMemo, useEffect, createContext, useContext, useCallback } from "react";
import { Swords, Trophy, AlertTriangle, Upload, Settings } from "lucide-react";

const PRESET_FACTORS = {"fury_warrior": {"base": 1485.8, "bshout": 1.00123, "sanc": 1.02179, "lotp": 1.05954, "enh": 1.27491, "restoA": 1.07431, "restoB": 1.14263, "restoAB": 1.17697, "fi": [1.0, 1.03299, 1.06448, 1.09751, 1.1353, 1.16826], "ewCoef": 5.9113e-05}, "kebab_warrior": {"base": 1199.5, "bshout": 1.00352, "sanc": 1.02389, "lotp": 1.05704, "enh": 1.26015, "restoA": 1.0693, "restoB": 1.14561, "restoAB": 1.17506, "fi": [1.0, 1.03471, 1.06892, 1.10124, 1.13331, 1.16672], "ewCoef": 5.728e-05}, "arms2h_warrior": {"base": 1371.2, "bshout": 1.00724, "sanc": 1.02072, "lotp": 1.04864, "enh": 1.27558, "restoA": 1.0644, "restoB": 1.16101, "restoAB": 1.18973, "fi": [1.0, 1.03181, 1.07029, 1.10426, 1.14069, 1.1739], "ewCoef": 5.443e-05}, "bm_hunter": {"base": 2413.6, "bshout": 1.04643, "sanc": 1.01975, "lotp": 1.0502, "enh": 1.10147, "restoA": 1.0549, "restoB": 1.03132, "restoAB": 1.06796, "fi": [1.0, 1.02963, 1.05925, 1.08888, 1.11851, 1.14813], "ewCoef": 6.3715e-05}, "survival_hunter": {"base": 2189.0, "bshout": 1.03262, "sanc": 1.01976, "lotp": 1.04876, "enh": 1.09993, "restoA": 1.04869, "restoB": 1.03222, "restoAB": 1.0702, "fi": [1.0, 1.02964, 1.05928, 1.08892, 1.11856, 1.1482], "ewCoef": 0.0}, "rogue": {"base": 1459.6, "bshout": 1.07879, "sanc": 1.01967, "lotp": 1.03906, "enh": 1.21558, "restoA": 1.05283, "restoB": 1.10672, "restoAB": 1.14311, "fi": [1.0, 1.0295, 1.059, 1.08851, 1.11801, 1.14751], "ewCoef": 5.4976e-05}, "enhance_shaman": {"base": 1906.3, "bshout": 1.07261, "sanc": 1.01756, "lotp": 1.03495, "enh": 1.00674, "restoA": 1.00524, "restoB": 0.99986, "restoAB": 1.00514, "fi": [1.0, 1.02634, 1.05269, 1.07903, 1.10538, 1.13172], "ewCoef": 4.8003e-05}, "feral_tank": {"base": 791.6, "bshout": 1.07989, "sanc": 1.02012, "lotp": 1.0, "enh": 1.14207, "restoA": 1.06835, "restoB": 1.03916, "restoAB": 1.06835, "fi": [1.0, 1.02814, 1.05771, 1.09023, 1.11959, 1.15034], "ewCoef": 5.44e-05}, "feral_dps": {"base": 1872.7, "bshout": 1.05715, "sanc": 1.01975, "lotp": 1.0, "enh": 1.13445, "restoA": 1.06471, "restoB": 1.02944, "restoAB": 1.06471, "fi": [1.0, 1.02963, 1.05926, 1.08889, 1.11852, 1.14815], "ewCoef": 3.5622e-05}, "ret_paladin": {"base": 1302.7, "bshout": 1.07332, "sanc": 1.0, "lotp": 1.04001, "enh": 1.33521, "restoA": 1.06657, "restoB": 1.21993, "restoAB": 1.25147, "fi": [1.0, 1.02989, 1.05978, 1.08967, 1.11956, 1.14945], "ewCoef": 4.8996e-05}};

const SPEC_LIST = [
  { id: "fury_warrior", label: "Fury warrior", cat: "warrior", multi: true },
  { id: "kebab_warrior", label: "Kebab warrior", cat: "warrior", multi: true },
  { id: "arms2h_warrior", label: "2H arms warrior", cat: "warrior", multi: true },
  { id: "bm_hunter", label: "BM hunter", cat: "bm", multi: true },
  { id: "survival_hunter", label: "Survival hunter", cat: "sv", multi: true },
  { id: "rogue", label: "Rogue", cat: "rogue", multi: true },
  { id: "enhance_shaman", label: "Enhance shaman", cat: "shaman", multi: true },
  { id: "feral_tank", label: "Feral tank", cat: "feral", multi: true },
  { id: "feral_dps", label: "Feral dps", cat: "feral", multi: true },
  { id: "ret_paladin", label: "Ret paladin", cat: "ret", multi: true },
];

// ---------- per-group scoring (a group is independent - buffs don't cross groups) ----------

function buffMultiplier(specId, state, factors) {
  const f = factors[specId];
  let mult = 1;
  if (state.warrior) mult *= f.bshout;
  if (state.ret) mult *= f.sanc;
  if (state.feral) mult *= f.lotp;
  if (state.shaman === "enh") mult *= f.enh;
  if (state.shaman === "restoA") mult *= f.restoA;
  if (state.shaman === "restoB") mult *= f.restoB;
  if (state.shaman === "restoAB") mult *= f.restoAB;
  if (state.ew) mult *= 1 + f.ewCoef * state.ew.agility * state.ew.uptime;
  mult *= f.fi[Math.min(state.fi, 5)];
  return mult;
}

// resolve the group's totem state from raw counts. restoAgi/restoWf are how many resto
// shamans (of however many are in the group) are dropping each totem - both can be nonzero
// at once if there are >=2 resto shamans splitting the totems between them.
function resolveShamanState(enhanceCount, restoAgi, restoWf) {
  if (enhanceCount > 0) return "enh"; // improved totems always dominate resto's regular-rank versions
  if (restoAgi > 0 && restoWf > 0) return "restoAB";
  if (restoAgi > 0) return "restoA";
  if (restoWf > 0) return "restoB";
  return null;
}

const EW_BASE_AGILITY = 1068; // verified survival hunter agility with Blessing of Kings, no totems
const EW_UPTIME_DEFAULT = 0.9;
const EW_AGI_BUMP_REGULAR = 77; // regular Grace of Air Totem (restoA/restoAB)
const EW_AGI_BUMP_IMPROVED = 89; // improved Grace of Air Totem (enh, +15% Enhancing Totems)

function survivalHunterAgilityBump(shamanState) {
  if (shamanState === "enh") return EW_AGI_BUMP_IMPROVED;
  if (shamanState === "restoA" || shamanState === "restoAB") return EW_AGI_BUMP_REGULAR;
  return 0;
}

function restoVariantToFlags(label) {
  if (label === "restoA") return [1, 0];
  if (label === "restoB") return [0, 1];
  if (label === "restoAB") return [1, 1];
  return [0, 0];
}

// Expose Weakness is a raid-wide debuff (like the other TBC debuffs), not party-scoped like totems.
// Its magnitude depends on the survival hunter's own agility, which is higher if THEIR OWN group
// gives them an agi totem - so unlike other buffs this can't be auto-detected from a single group's
// own counts. Callers must compute and pass the correct ewState (see computeRaidWideEW below).
function evaluateGroup(counts, restoAgi, restoWf, ewState, factors, extraBuffs, namedDpsEntries) {
  const extra = extraBuffs || { warrior: false, ret: false, feral: false, fi: 0, shaman: null };
  const state = {
    warrior: counts.fury_warrior + counts.kebab_warrior + counts.arms2h_warrior > 0 || extra.warrior,
    ret: counts.ret_paladin > 0 || extra.ret,
    feral: counts.feral_tank + counts.feral_dps > 0 || extra.feral,
    fi: counts.bm_hunter + (extra.fi || 0),
    shaman: resolveShamanState(counts.enhance_shaman, restoAgi, restoWf) || extra.shaman || null,
    ew: ewState || null,
  };
  let total = 0;
  let pctSum = 0; // sum of each individual player's (dps/base - 1), for the "average % gain" objective
  const breakdown = [];
  for (const spec of SPEC_LIST) {
    const n = counts[spec.id];
    if (n > 0) {
      const mult = buffMultiplier(spec.id, state, factors);
      const dps = factors[spec.id].base * mult;
      total += dps * n;
      pctSum += (mult - 1) * n;
      breakdown.push({ id: spec.id, label: spec.label, count: n, dpsEach: dps, pctEach: mult - 1 });
    }
  }
  // named buff contributors that also have a resimmed personal factor table (user picked a sim profile for them)
  for (const entry of namedDpsEntries || []) {
    if (!factors[entry.id]) continue; // resim hasn't completed yet
    const mult = buffMultiplier(entry.id, state, factors);
    const dps = factors[entry.id].base * mult;
    total += dps;
    pctSum += mult - 1;
    breakdown.push({ id: entry.id, label: entry.name, count: 1, dpsEach: dps, pctEach: mult - 1 });
  }
  const playerCount = breakdown.reduce((s, b) => s + b.count, 0);
  return { total, pctSum, playerCount, breakdown, state };
}

function restoVariantsFor(restoCount) {
  if (restoCount === 0) return [{ a: 0, w: 0, label: null }];
  if (restoCount === 1) return [{ a: 1, w: 0, label: "restoA" }, { a: 0, w: 1, label: "restoB" }];
  return [{ a: 1, w: 0, label: "restoA" }, { a: 0, w: 1, label: "restoB" }, { a: 1, w: 1, label: "restoAB" }];
}

// best way to fill a group's remaining open slots given what's already fixed in it
function bestFill(lockedCounts, restoCountLocked, remaining, excludeHunters, ewOverride, factors) {
  const fills = [];
  function recurse(slotsLeft, addCounts, restoAdded) {
    if (slotsLeft === 0) {
      fills.push({ addCounts: { ...addCounts }, restoAdded });
      return;
    }
    for (const spec of SPEC_LIST) {
      const isHunter = spec.id === "bm_hunter" || spec.id === "survival_hunter";
      if (excludeHunters && isHunter) continue;
      addCounts[spec.id] = (addCounts[spec.id] || 0) + 1;
      recurse(slotsLeft - 1, addCounts, restoAdded);
      addCounts[spec.id] -= 1;
      if (addCounts[spec.id] === 0) delete addCounts[spec.id];
    }
    recurse(slotsLeft - 1, addCounts, restoAdded + 1); // one more resto shaman body
  }
  recurse(remaining, {}, 0);

  let best = null;
  for (const fill of fills) {
    const finalCounts = { ...lockedCounts };
    for (const k in fill.addCounts) finalCounts[k] = (finalCounts[k] || 0) + fill.addCounts[k];
    const totalResto = restoCountLocked + fill.restoAdded;
    for (const v of restoVariantsFor(totalResto)) {
      const evalResult = evaluateGroup(finalCounts, v.a, v.w, ewOverride, factors);
      if (!best || evalResult.total > best.total) {
        best = { finalCounts, restoCount: totalResto, restoVariant: v.label, ...evalResult };
      }
    }
  }
  return best;
}

// evaluate a group using ONLY the locked units already placed - no filling of empty slots
function evaluateLockedOnly(lockedCounts, restoCountLocked, objective, ewOverride, factors) {
  let best = null;
  for (const v of restoVariantsFor(restoCountLocked)) {
    const evalResult = evaluateGroup(lockedCounts, v.a, v.w, ewOverride, factors);
    const score =
      objective === "total" ? evalResult.total :
      objective === "avg_pct" ? evalResult.pctSum :
      evalResult.breakdown.find((b) => b.id === objective)?.dpsEach ?? -1;
    if (!best || score > best.score) {
      best = { finalCounts: lockedCounts, restoCount: restoCountLocked, restoVariant: v.label, ...evalResult, score };
    }
  }
  return best;
}

// ---------- placing the shared locked pool across up to 3 groups ----------

// place a set of mutually-exclusive-per-group members (one category slot per group) across groups
function enumerateCategoryPlacements(memberCounts, capacities) {
  const numGroups = capacities.length;
  const ids = Object.keys(memberCounts).filter((id) => memberCounts[id] > 0);
  const results = [];
  function backtrack(g, remaining, perGroup, caps) {
    if (g === numGroups) {
      if (ids.every((id) => remaining[id] === 0)) results.push({ perGroup: [...perGroup], caps: [...caps] });
      return;
    }
    backtrack(g + 1, remaining, [...perGroup, null], caps);
    for (const id of ids) {
      if (remaining[id] <= 0) continue;
      const maxN = Math.min(remaining[id], caps[g]);
      for (let n = 1; n <= maxN; n++) {
        const newCaps = [...caps];
        newCaps[g] -= n;
        backtrack(g + 1, { ...remaining, [id]: remaining[id] - n }, [...perGroup, { id, n }], newCaps);
      }
    }
  }
  backtrack(0, memberCounts, [], capacities);
  return results.length ? results : null;
}

const CATEGORY_STAGES = [
  ["enhance_shaman"],
  ["resto_shaman"],
  ["fury_warrior"],
  ["kebab_warrior"],
  ["arms2h_warrior"],
  ["feral_tank"],
  ["feral_dps"],
  ["bm_hunter"],
  ["rogue"],
  ["survival_hunter"],
  ["ret_paladin"],
];

function allocateRaid(pool, numGroups, objective, factors) {  const MAX_STATES = 4000;
  let states = [{
    perGroupCounts: Array.from({ length: numGroups }, () => Object.fromEntries(SPEC_LIST.map((s) => [s.id, 0]))),
    perGroupResto: Array(numGroups).fill(0),
    caps: Array(numGroups).fill(5),
  }];

  for (const stage of CATEGORY_STAGES) {
    const memberCounts = Object.fromEntries(stage.map((id) => [id, pool[id] || 0]));
    if (Object.values(memberCounts).every((c) => c === 0)) continue;
    const nextStates = [];
    for (const st of states) {
      const placements = enumerateCategoryPlacements(memberCounts, st.caps);
      if (!placements) continue;
      for (const p of placements) {
        const perGroupCounts = st.perGroupCounts.map((c) => ({ ...c }));
        const perGroupResto = [...st.perGroupResto];
        p.perGroup.forEach((entry, g) => {
          if (!entry) return;
          if (entry.id === "resto_shaman") perGroupResto[g] += entry.n;
          else perGroupCounts[g][entry.id] += entry.n;
        });
        nextStates.push({ perGroupCounts, perGroupResto, caps: p.caps });
      }
    }
    states = nextStates;
    if (states.length === 0) return null;
    if (states.length > MAX_STATES) states = states.slice(0, MAX_STATES);
  }

  // Expose Weakness is a raid-wide debuff, but its magnitude depends on the survival hunter's own
  // agility - which is higher if their own group happens to give them an agi totem. So we can't just
  // check presence; we have to figure out which totem (if any) the hunter's own group ends up with,
  // and that choice can itself affect which totem is best for that group overall.
  function correctForSurvivalHunterAgility(groupResults, objective) {
    const svGroupIdxs = groupResults.map((r, i) => (r.lockedCounts.survival_hunter > 0 ? i : -1)).filter((i) => i >= 0);
    if (svGroupIdxs.length === 0) return groupResults;

    const optionsPerGroup = svGroupIdxs.map((i) => {
      const r = groupResults[i];
      if (r.lockedCounts.enhance_shaman > 0) return ["enh"];
      return restoVariantsFor(r.restoCount).map((v) => v.label);
    });
    const combos = optionsPerGroup.reduce((acc, arr) => acc.flatMap((a) => arr.map((v) => [...a, v])), [[]]);

    let best = null;
    let bestScore = -Infinity;
    for (const combo of combos) {
      const maxBump = Math.max(0, ...combo.map(survivalHunterAgilityBump));
      const ewState = { agility: EW_BASE_AGILITY + maxBump, uptime: EW_UPTIME_DEFAULT };
      const recomputed = groupResults.map((r, i) => {
        const svIdx = svGroupIdxs.indexOf(i);
        const variantLabel = svIdx >= 0 ? combo[svIdx] : r.restoVariant;
        const [a, w] = restoVariantToFlags(variantLabel);
        const ev = evaluateGroup(r.finalCounts, a, w, ewState, factors);
        const score = objective === "total" ? ev.total : objective === "avg_pct" ? ev.pctSum : (ev.breakdown.find((b) => b.id === objective)?.dpsEach ?? -1);
        return { ...r, restoVariant: variantLabel, ...ev, score };
      });
      const comboScore = objective === "total" ? recomputed.reduce((a, r) => a + r.total, 0)
        : objective === "avg_pct" ? recomputed.reduce((a, r) => a + r.pctSum, 0)
        : Math.max(...recomputed.map((r) => (r.score > 0 ? r.score : -Infinity)));
      if (comboScore > bestScore) { bestScore = comboScore; best = recomputed; }
    }
    return best;
  }

  const scored = [];
  for (const st of states) {
    let groupResults = [];
    let feasible = true;
    for (let g = 0; g < numGroups; g++) {
      const fill = evaluateLockedOnly(st.perGroupCounts[g], st.perGroupResto[g], objective, null, factors);
      if (!fill) { feasible = false; break; }
      groupResults.push({ ...fill, lockedCounts: st.perGroupCounts[g], lockedResto: st.perGroupResto[g], remaining: st.caps[g] });
    }
    if (!feasible) continue;
    groupResults = correctForSurvivalHunterAgility(groupResults, objective);
    const raidTotal = groupResults.reduce((a, r) => a + r.total, 0);
    const raidPctSum = groupResults.reduce((a, r) => a + r.pctSum, 0);
    const raidPlayerCount = groupResults.reduce((a, r) => a + r.playerCount, 0);
    const raidAvgPct = raidPlayerCount > 0 ? raidPctSum / raidPlayerCount : 0;
    const objectiveScore =
      objective === "total" ? raidTotal :
      objective === "avg_pct" ? raidPctSum : // fixed player count across all arrangements, so this ranks the same as the true average
      Math.max(...groupResults.map((r) => (r.score > 0 ? r.score : -Infinity)));
    scored.push({ groupResults, objectiveScore, raidTotal, raidAvgPct });
  }
  scored.sort((a, b) => b.objectiveScore - a.objectiveScore);

  // dedupe splits that are practically identical (same multiset of group outcomes, order doesn't matter)
  const seen = new Set();
  const unique = [];
  for (const s of scored) {
    const sig = s.groupResults
      .map((r) => JSON.stringify(r.finalCounts) + r.restoCount + r.restoVariant)
      .sort()
      .join("|");
    if (!seen.has(sig)) {
      seen.add(sig);
      unique.push(s);
    }
    if (unique.length >= 3) break;
  }
  return unique.length ? unique : null;
}

// ---------- WASM sim engine loader (inlined - artifact preview needs a single self-contained file) ----------

let loadPromise = null;

function loadEngine() {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "./wasm/wasm_exec.js";
    script.onload = async () => {
      try {
        // eslint-disable-next-line no-undef
        const go = new Go();
        window.__wasmReadyResolve = () => resolve(go);
        window.wasmready = () => window.__wasmReadyResolve();
        const resp = await fetch("./wasm/tbc.wasm");
        const buffer = await resp.arrayBuffer();
        const result = await WebAssembly.instantiate(buffer, go.importObject);
        go.run(result.instance);
      } catch (e) {
        reject(e);
      }
    };
    script.onerror = () => reject(new Error("failed to load wasm_exec.js"));
    document.body.appendChild(script);
  });
  return loadPromise;
}

let wasmDead = false; // set true if the Go runtime ever panics - it can't be recovered without reinstantiating

const MAX_SAFE_ITERATIONS = 5000; // beyond this, a single sim can hang the tab for an unreasonable time
const MIN_SAFE_ITERATIONS = 50;

async function runSim(raidSimRequest) {
  // Defense in depth: clamp iterations no matter where the request came from (our own code,
  // or eventually a user-uploaded settings profile) - this is cheap insurance against a hung tab.
  if (raidSimRequest?.simOptions?.iterations != null) {
    raidSimRequest.simOptions.iterations = Math.max(MIN_SAFE_ITERATIONS, Math.min(MAX_SAFE_ITERATIONS, raidSimRequest.simOptions.iterations));
  }

  if (wasmDead) {
    // A previous call panicked and permanently killed the Go runtime - reinstantiate from scratch
    // rather than leaving the user stuck until they manually reload the page.
    loadPromise = null;
    wasmDead = false;
  }
  await loadEngine();
  try {
    // eslint-disable-next-line no-undef
    const resultStr = raidSimJson(JSON.stringify(raidSimRequest));
    if (resultStr === undefined || resultStr === null) {
      // The engine rejected the request cleanly (e.g. bad enum value) and logged to console,
      // but didn't crash - raidSimJson returns nothing in that case.
      throw new Error("the sim engine rejected this request (invalid data) - check the uploaded JSON is a valid TBC player export");
    }
    const parsed = JSON.parse(resultStr);
    if (parsed.error) throw new Error(parsed.error.message || "sim error");
    return parsed;
  } catch (e) {
    if (String(e.message).includes("Go program has already exited")) {
      // The Go runtime panicked (a bug in the sim engine itself, or data our validation didn't
      // catch) - mark it dead so the next call reinstantiates instead of failing forever.
      wasmDead = true;
      throw new Error("the sim engine crashed processing this data and has been reset - please try again, and double check any custom JSON you uploaded");
    }
    throw e;
  }
}

// ---------- profile parsing + resim orchestration ----------

const PRECISION_OPTIONS = [
  { value: "verylow", label: "Very low", iterations: 300 },
  { value: "low", label: "Low", iterations: 700 },
  { value: "medium", label: "Medium", iterations: 2000 },
];

const KNOWN_RACES = new Set([
  "RaceUnknown", "RaceHuman", "RaceOrc", "RaceDwarf", "RaceNightElf", "RaceUndead",
  "RaceTauren", "RaceGnome", "RaceTroll", "RaceBloodElf", "RaceDraenei",
]);

// Validates a talents string BEFORE it ever reaches the sim engine. Confirmed empirically that a
// malformed talents string (wrong characters, or a talent index the engine doesn't recognize)
// causes an unrecoverable Go panic that kills the WASM instance for the rest of the session - so
// this can't just be "best effort", it's the one thing standing between a bad upload and a dead sim.
function isValidTalentsString(s) {
  if (typeof s !== "string") return false;
  if (s.length > 110) return false; // generous upper bound - real strings are well under 40 chars
  return /^[0-9]{0,35}(-[0-9]{0,35}){0,2}$/.test(s);
}

function isValidEquipment(equipment) {
  if (equipment == null) return true; // absent is fine, falls back to preset gear
  if (typeof equipment !== "object") return false;
  if (equipment.items == null) return true; // fine, treated as no gear
  if (!Array.isArray(equipment.items)) return false;
  if (equipment.items.length > 20) return false; // a character has at most ~17 gear slots
  return equipment.items.every((it) => {
    if (it == null || typeof it !== "object") return true; // empty slot {}
    if (it.id != null && (!Number.isInteger(it.id) || it.id < 0 || it.id > 10000000)) return false;
    if (it.enchant != null && (!Number.isInteger(it.enchant) || it.enchant < 0)) return false;
    if (it.gems != null && (!Array.isArray(it.gems) || it.gems.length > 6)) return false;
    return true;
  });
}

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB - a real gear export is a few KB to a few dozen KB

const KNOWN_MOB_TYPES = new Set([
  "MobTypeUnknown", "MobTypeBeast", "MobTypeDemon", "MobTypeDragonkin", "MobTypeElemental",
  "MobTypeGiant", "MobTypeHumanoid", "MobTypeMechanical", "MobTypeUndead",
]);

// Validates an uploaded encounter profile. Confirmed empirically that malformed encounter fields
// (bad mobType, wrong-length stats array, negative level) are all handled gracefully by the engine
// itself - unlike talents strings, these don't panic. The one real risk found: an excessive target
// count can hang the tab for a very long time (more targets multiplies sim complexity), so that's
// capped here defensively even though it wouldn't crash anything.
function validateEncounterUpload(enc) {
  if (!enc || typeof enc !== "object") throw new Error("encounter JSON must be an object");
  if (!Array.isArray(enc.targets) || enc.targets.length === 0) throw new Error("encounter must have at least one target");
  if (enc.targets.length > 8) throw new Error("more than 8 targets can make a sim take a very long time - reduce the target count");
  if (enc.duration != null && (typeof enc.duration !== "number" || enc.duration <= 0 || enc.duration > 1800)) {
    throw new Error("duration must be a positive number of seconds, under 1800 (30 min)");
  }
  for (const t of enc.targets) {
    if (t.mobType != null && !KNOWN_MOB_TYPES.has(t.mobType)) throw new Error(`unrecognized mobType "${t.mobType}"`);
    if (t.level != null && (typeof t.level !== "number" || t.level < 1 || t.level > 255)) throw new Error("target level must be between 1 and 255");
    if (t.stats != null && (!Array.isArray(t.stats) || t.stats.length > 60)) throw new Error("target stats array is malformed");
  }
  return true;
}

// Debuffs/raid buffs are just flat objects of booleans/tristate-strings/numbers - no nesting,
// no arrays expected. Reject anything that doesn't match that shape rather than trusting it blindly.
function validateFlatBuffObject(obj, label) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error(`${label} JSON must be a flat object`);
  const keys = Object.keys(obj);
  if (keys.length > 80) throw new Error(`${label} has an unreasonable number of fields`);
  for (const k of keys) {
    const v = obj[k];
    if (v !== null && typeof v !== "boolean" && typeof v !== "number" && typeof v !== "string") {
      throw new Error(`${label}.${k} has an unexpected value type - only booleans, numbers, and strings are valid`);
    }
    if (typeof v === "string" && v.length > 40) throw new Error(`${label}.${k} value is unreasonably long`);
  }
  return true;
}

// Extracts the player definition from an uploaded IndividualSimSettings-style JSON export.
// We deliberately never read partyBuffs, encounter, or debuffs from the upload - those always
// come from the app's own live group composition and global settings, never from the export.
//
// IMPORTANT CONSTRAINT: these exports use the legacy rotation format (TypeSimple/specRotationJson)
// from the old wowsims site, which does not execute in the current sim engine at all (produces
// 0 DPS - proven earlier when building this tool). So gear/talents/consumables/race/profession/name
// are taken from the upload, but rotation and the spec-options block are always substituted from
// the matching preset's known-working APL, regardless of what the upload contains for those fields.
function parseUploadedProfile(rawJson, presetPlayer, blessingsOverride) {
  if (!rawJson || typeof rawJson !== "object") throw new Error("not a valid JSON object");
  if (!rawJson.player || typeof rawJson.player !== "object") throw new Error("uploaded JSON has no 'player' field");
  const uploaded = rawJson.player;

  if (uploaded.talentsString != null && !isValidTalentsString(uploaded.talentsString)) {
    throw new Error("talentsString doesn't look like a valid TBC talent string - refusing to use it (this specific check exists because a malformed one can crash the sim engine)");
  }
  if (!isValidEquipment(uploaded.equipment)) {
    throw new Error("equipment field is malformed (bad item id, enchant, or gem list)");
  }
  if (uploaded.race != null && (typeof uploaded.race !== "string" || !KNOWN_RACES.has(uploaded.race))) {
    throw new Error(`unrecognized race "${uploaded.race}"`);
  }
  if (uploaded.name != null && typeof uploaded.name === "string" && uploaded.name.length > 60) {
    throw new Error("name field is unreasonably long");
  }

  const baseBuffs = typeof uploaded.buffs === "object" && uploaded.buffs ? uploaded.buffs : presetPlayer.buffs;

  return {
    ...presetPlayer,
    name: typeof uploaded.name === "string" ? uploaded.name.slice(0, 60) : presetPlayer.name,
    race: uploaded.race || presetPlayer.race,
    equipment: uploaded.equipment || presetPlayer.equipment,
    talentsString: uploaded.talentsString || presetPlayer.talentsString,
    consumables: typeof uploaded.consumables === "object" && uploaded.consumables ? uploaded.consumables : presetPlayer.consumables,
    profession1: typeof uploaded.profession1 === "string" ? uploaded.profession1 : presetPlayer.profession1,
    profession2: typeof uploaded.profession2 === "string" ? uploaded.profession2 : presetPlayer.profession2,
    // blessings are the one raid buff that's genuinely profile-specific (not every paladin blesses
    // everyone the same) - if the user has fine-tuned them for this contributor, that wins over
    // whatever the raw upload said.
    buffs: blessingsOverride ? { ...baseBuffs, ...blessingsOverride } : baseBuffs,
    bonusStats: typeof uploaded.bonusStats === "object" && uploaded.bonusStats ? uploaded.bonusStats : presetPlayer.bonusStats,
    // rotation and spec-options block intentionally NOT overridden - see comment above
  };
}

// Checks the player's relic/idol slot for Idol of the Raven Goddess (item 32387), which is what
// actually grants Improved Leader of the Pack - it's an item, not a talent point. Not wired into
// live calculations yet - reserved for a future pass.
function hasRavenGoddessIdol(player) {
  const items = player?.equipment?.items || [];
  return items.some((it) => it && it.id === 32387);
}

// Checks whether either profession is Leatherworking, needed for the group's own drums buff.
// Not wired into live calculations yet - reserved for a future pass.
function isLeatherworker(player) {
  return player?.profession1 === "Leatherworking" || player?.profession2 === "Leatherworking";
}

// ---------- talent-based buff detection for named buff contributors ----------
//
// Positions verified directly against the sim engine's own talent tree data (ui/core/talents/trees/*.json)
// and cross-checked against real decoded sample builds from this session (e.g. our sample Enhance
// Shaman decodes to Enhancing Totems 2/2, Improved Weapon Totems 1/2 - exactly matching what was
// found earlier by hand). Each entry is [treeIndex, position, maxPoints].
const TALENT_POSITIONS = {
  commandingPresence: [1, 7, 5],      // Warrior / Fury
  sanctityAura: [2, 13, 1],           // Paladin / Retribution
  improvedSanctityAura: [2, 14, 2],   // Paladin / Retribution
  enhancingTotems: [1, 6, 2],         // Shaman / Enhancement
  improvedWeaponTotems: [1, 11, 2],   // Shaman / Enhancement
  leaderOfThePack: [1, 17, 1],        // Druid / Feral Combat
  ferociousInspiration: [0, 16, 3],   // Hunter / Beast Mastery
};

function talentPoints(talentsString, key) {
  const [treeIdx, pos] = TALENT_POSITIONS[key];
  const parts = (talentsString || "").split("-");
  const segment = parts[treeIdx] || "";
  const ch = segment[pos];
  return ch && /[0-9]/.test(ch) ? parseInt(ch, 10) : 0;
}

// Determines which raid/party buffs a character can provide to a group, purely from class +
// talents (+ equipped idol for the one item-granted case) - no rotation or personal DPS needed,
// since these characters only ever act as buff sources in a comp, never as a tracked DPS slot.
//
// Where our factor table only has data for one specific tier of a buff (e.g. "improved" Battle
// Shout, never "regular"), we require the matching talent investment to grant it and stay silent
// otherwise, rather than guess at an untested tier - understating a buff is a much smaller problem
// than overstating one for a tool people use to make real decisions.
function detectBuffCapabilities(player) {
  const cls = player.class;
  const ts = player.talentsString || "";
  const caps = { warrior: false, ret: false, feral: false, fi: 0, shaman: null, notes: [] };

  if (cls === "ClassWarrior") {
    const cp = talentPoints(ts, "commandingPresence");
    caps.warrior = cp >= 5;
    if (cp > 0 && cp < 5) caps.notes.push(`Commanding Presence ${cp}/5 - not enough to grant the modeled Improved Battle Shout bonus`);
  }
  if (cls === "ClassPaladin") {
    const sa = talentPoints(ts, "sanctityAura");
    const isa = talentPoints(ts, "improvedSanctityAura");
    caps.ret = sa >= 1 && isa >= 2;
    if (sa >= 1 && isa < 2) caps.notes.push(`has Sanctity Aura but Improved Sanctity Aura is ${isa}/2 - not enough for the modeled bonus`);
  }
  if (cls === "ClassDruid") {
    caps.feral = talentPoints(ts, "leaderOfThePack") >= 1;
    if (hasRavenGoddessIdol(player)) caps.notes.push("has Idol of the Raven Goddess equipped, but this tool only models the non-improved tier of Leader of the Pack");
  }
  if (cls === "ClassHunter") {
    caps.fi = talentPoints(ts, "ferociousInspiration") >= 1 ? 1 : 0;
  }
  if (cls === "ClassShaman") {
    const et = talentPoints(ts, "enhancingTotems");
    const iwt = talentPoints(ts, "improvedWeaponTotems");
    if (et >= 2) {
      caps.shaman = "enh"; // matches our bundled improved SoE+GoA+WF+Unleashed Rage data point
      if (iwt < 2) caps.notes.push(`Improved Weapon Totems is ${iwt}/2 - the modeled "enh" bundle assumes higher rank, small overestimate on the windfury portion`);
    } else {
      caps.shaman = "needs_totem_choice"; // not enhancement-specced - ambiguous which totem(s) they'd actually drop
    }
  }
  return caps;
}

const KNOWN_CLASSES = new Set([
  "ClassUnknown", "ClassWarrior", "ClassPaladin", "ClassHunter", "ClassRogue", "ClassPriest",
  "ClassShaman", "ClassMage", "ClassWarlock", "ClassDruid",
]);

// Every possible tracked spec a given class could be resimmed as. A dropdown is only shown for
// classes in CLASSES_NEEDING_DROPDOWN (see below) - for the others we auto-pick using whatever
// reliable hint the upload gives us (see detectSpecHint), falling back to the first entry.
const CLASS_TO_SPECS = {
  ClassWarrior: ["fury_warrior", "arms2h_warrior"],
  ClassHunter: ["bm_hunter"],
  ClassRogue: ["rogue"],
  ClassShaman: ["enhance_shaman"],
  ClassDruid: ["feral_dps", "feral_tank"],
  ClassPaladin: ["ret_paladin"],
};

// Only classes where the tracked options are genuinely different ROLES (different stat
// priorities, different rotation entirely - Tank vs DPS) get a visible dropdown. Warrior's
// Fury/Arms split is auto-resolved from a hint instead (see detectSpecHint) since it's just a
// different DPS flavor, not worth asking the user about. Will need Druid-style entries added
// here (and to CLASS_TO_SPECS) when Protection Warrior/Paladin join SPEC_LIST.
const CLASSES_NEEDING_DROPDOWN = new Set(["ClassDruid"]);

// Even though the legacy rotation field itself doesn't execute (proven earlier this session -
// it's from the old wowsims site's format and produces 0 DPS against the current engine), it
// still contains a self-declared spec label we can read without needing to infer anything from
// talent points. Confirmed empirically against our own sample files: Warriors embed
// {"spec":"DpsWarriorSpecFury"} or {"spec":"DpsWarriorSpecArms"} in specRotationJson, and Druids
// use a different oneof field name entirely (feralCatDruid vs feralBearDruid) - both reliable.
// Can't distinguish 2H Arms from dual-wield "kebab" Arms this way (both report the same spec
// string), so an Arms hint always routes to the 2H preset specifically.
function detectSpecHint(player) {
  const specJson = player?.rotation?.simple?.specRotationJson;
  if (specJson) {
    try {
      const parsed = JSON.parse(specJson);
      if (parsed.spec === "DpsWarriorSpecFury") return "fury_warrior";
      if (parsed.spec === "DpsWarriorSpecArms") return "arms2h_warrior";
    } catch {
      // not the legacy format, or malformed - fall through to other hints
    }
  }
  if (player?.feralCatDruid) return "feral_dps";
  if (player?.feralBearDruid) return "feral_tank";
  return null;
}

// Blessings are the one raid buff category that's genuinely per-player, not raid-wide - not every
// paladin blesses every person the same way. Modeled via the sim engine's own IndividualBuffs
// message (player.buffs) rather than the raid-wide buffs object, so they're tuned per contributor.
const BLESSING_TOGGLES = [
  { key: "blessingOfKings", label: "Blessing of Kings", type: "bool" },
  { key: "blessingOfMight", label: "Blessing of Might", type: "tristate" },
  { key: "blessingOfWisdom", label: "Blessing of Wisdom", type: "tristate" },
  { key: "blessingOfSalvation", label: "Blessing of Salvation", type: "bool" },
  { key: "blessingOfSanctuary", label: "Blessing of Sanctuary", type: "bool" },
];

function extractBlessings(playerBuffs) {
  const result = {};
  for (const b of BLESSING_TOGGLES) {
    result[b.key] = playerBuffs?.[b.key] ?? (b.type === "bool" ? false : "TristateEffectMissing");
  }
  return result;
}

// Parses an uploaded JSON as a "named buff contributor" - someone who exists in a group to grant
// buffs to others via detected class+talents (like the existing Resto Shaman slot, generalized).
// Every contributor gets a personal DPS sim - that's the point of uploading a real profile instead
// of just using a Preset. simProfileChoice is pre-picked from whatever hint is available, falling
// back to the class's default; the dropdown (only shown for genuinely ambiguous roles) lets the
// user override it. Blessings default to whatever the uploaded JSON already specified, if any.
function parseBuffContributor(rawJson, name) {
  if (!rawJson || typeof rawJson !== "object" || !rawJson.player || typeof rawJson.player !== "object") {
    throw new Error("uploaded JSON has no 'player' field");
  }
  const player = rawJson.player;
  if (typeof player.class !== "string" || !KNOWN_CLASSES.has(player.class)) {
    throw new Error(`unrecognized class "${player.class}"`);
  }
  if (player.talentsString != null && !isValidTalentsString(player.talentsString)) {
    throw new Error("talentsString doesn't look like a valid TBC talent string");
  }
  if (!isValidEquipment(player.equipment)) {
    throw new Error("equipment field is malformed");
  }
  const capabilities = detectBuffCapabilities(player);
  const compatibleSpecs = CLASS_TO_SPECS[player.class] || [];
  const hint = detectSpecHint(player);
  const defaultSpec = (hint && compatibleSpecs.includes(hint)) ? hint : (compatibleSpecs[0] || null);
  return {
    name: (name || player.name || "unnamed").slice(0, 60),
    class: player.class,
    capabilities,
    rawJson, // kept so we can re-parse against whichever spec the user picks for personal DPS
    simProfileChoice: defaultSpec,
    blessings: extractBlessings(player.buffs),
  };
}

const DEFAULT_RAID_BUFFS = { arcaneBrilliance: true, powerWordFortitude: "TristateEffectImproved", shadowProtection: true, divineSpirit: "TristateEffectImproved", giftOfTheWild: "TristateEffectImproved", bloodlust: true };

function buildSimRequest(player, debuffs, encounter, partyBuffs, raidBuffs, iterations, seed = 12345) {
  return {
    raid: {
      parties: [{ players: [player], buffs: partyBuffs }],
      numActiveParties: 1,
      buffs: raidBuffs || DEFAULT_RAID_BUFFS,
      debuffs,
    },
    encounter,
    simOptions: { iterations, randomSeed: seed, debug: false },
  };
}

const RESIM_TOGGLES = {
  baseline: {},
  bshout: { battleShout: "TristateEffectImproved" },
  sanc: { sanctityAura: "TristateEffectImproved" },
  lotp: { leaderOfThePack: "TristateEffectRegular" },
  enh: { strengthOfEarthTotem: "TristateEffectImproved", graceOfAirTotem: "TristateEffectImproved", windfuryTotem: "TristateEffectImproved" },
  restoA: { strengthOfEarthTotem: "TristateEffectRegular", graceOfAirTotem: "TristateEffectRegular" },
  restoB: { strengthOfEarthTotem: "TristateEffectRegular", windfuryTotem: "TristateEffectRegular" },
  restoAB: { strengthOfEarthTotem: "TristateEffectRegular", graceOfAirTotem: "TristateEffectRegular", windfuryTotem: "TristateEffectRegular" },
};
const RESIM_BASE_PARTY_BUFFS = { drums: "LesserDrumsOfBattle", totemTwisting: true };

// Runs the full sweep of sims needed to populate this profile's factor table: baseline,
// each group buff toggle, FI x1-5, and the no-EW/EW-on pair used to derive ewCoef.
// onProgress(current, total) is called after each individual sim completes.
async function simProfile(player, debuffsBase, encounter, raidBuffs, iterations, onProgress) {
  const jobs = [];
  const debuffsNoEw = { ...debuffsBase, exposeWeaknessUptime: 0, exposeWeaknessHunterAgility: 0 };
  const debuffsEw = { ...debuffsBase, exposeWeaknessUptime: EW_UPTIME_DEFAULT, exposeWeaknessHunterAgility: EW_BASE_AGILITY };

  jobs.push(["base_no_ew", buildSimRequest(player, debuffsNoEw, encounter, RESIM_BASE_PARTY_BUFFS, raidBuffs, iterations)]);
  jobs.push(["ew_on", buildSimRequest(player, debuffsEw, encounter, RESIM_BASE_PARTY_BUFFS, raidBuffs, iterations)]);
  for (const [key, toggle] of Object.entries(RESIM_TOGGLES)) {
    if (key === "baseline") continue;
    jobs.push([key, buildSimRequest(player, debuffsNoEw, encounter, { ...RESIM_BASE_PARTY_BUFFS, ...toggle }, raidBuffs, iterations)]);
  }
  for (let fi = 1; fi <= 5; fi++) {
    jobs.push([`fi${fi}`, buildSimRequest(player, debuffsNoEw, encounter, { ...RESIM_BASE_PARTY_BUFFS, ferociousInspiration: fi }, raidBuffs, iterations)]);
  }

  const results = {};
  for (let i = 0; i < jobs.length; i++) {
    const [key, req] = jobs[i];
    const res = await runSim(req);
    results[key] = res.raidMetrics.parties[0].players[0].dps.avg;
    onProgress?.(i + 1, jobs.length);
  }

  const base = results.base_no_ew;
  const ewFactor = results.ew_on / base;
  const ewCoef = (ewFactor - 1) / (EW_BASE_AGILITY * EW_UPTIME_DEFAULT);

  return {
    base,
    bshout: results.bshout / base,
    sanc: results.sanc / base,
    lotp: results.lotp / base,
    enh: results.enh / base,
    restoA: results.restoA / base,
    restoB: results.restoB / base,
    restoAB: results.restoAB / base,
    fi: [1.0, results.fi1 / base, results.fi2 / base, results.fi3 / base, results.fi4 / base, results.fi5 / base],
    ewCoef,
  };
}

const TOTAL_SIM_JOBS = 2 + (Object.keys(RESIM_TOGGLES).length - 1) + 5; // ew pair + 7 toggles + 5 FI levels

// ---------- shared app context (profiles, settings, resim orchestration) ----------

const AppContext = createContext(null);

function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext used outside AppProvider");
  return ctx;
}

const DEFAULT_DEBUFFS = {
  judgementOfWisdom: true,
  judgementOfLight: true,
  improvedSealOfTheCrusader: "TristateEffectImproved",
  misery: true,
  curseOfElements: "TristateEffectImproved",
  bloodFrenzy: true,
  giftOfArthas: true,
  mangle: true,
  exposeArmor: "TristateEffectImproved",
  faerieFire: "TristateEffectImproved",
  sunderArmor: true,
  curseOfRecklessness: true,
  huntersMark: "TristateEffectImproved",
  insectSwarm: true,
  shadowEmbrace: true,
};
const DEFAULT_ENCOUNTER = {
  apiVersion: 14,
  duration: 150,
  durationVariation: 5,
  executeProportion20: 0.2,
  executeProportion25: 0.25,
  executeProportion35: 0.35,
  executeProportion45: 0.45,
  executeProportion90: 0.9,
  targets: [
    {
      id: 31146, name: "Raid Target", level: 73, mobType: "MobTypeUndead",
      stats: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,320,0,0,0,0,0,0,0,0,0,54,0,0,0,7685,0,6070400,0,0,0,0,0,0,0,0],
      minBaseDamage: 15113, damageSpread: 0.5, swingSpeed: 2, parryHaste: true, canCrush: true,
    },
  ],
};

function AppProvider({ presetFactors, presetPlayers, presetsUnavailable, children }) {
  const [factors, setFactorsState] = useState(presetFactors);
  const [profileMeta, setProfileMeta] = useState(
    Object.fromEntries(Object.keys(presetFactors).map((id) => [id, { isCustom: false, label: null }]))
  );
  const [debuffs, setDebuffs] = useState(DEFAULT_DEBUFFS);
  const [encounter, setEncounter] = useState(DEFAULT_ENCOUNTER);
  const [raidBuffs, setRaidBuffs] = useState(DEFAULT_RAID_BUFFS);
  const [settingsAreDefault, setSettingsAreDefault] = useState(true);
  const [precision, setPrecision] = useState("low");
  const [simProgress, setSimProgress] = useState(null); // { specId, current, total } | null
  const [customPlayers, setCustomPlayers] = useState({}); // specId -> parsed player object
  const [buffContributors, setBuffContributors] = useState([]); // [{id, name, class, capabilities, totemChoice}]
  const [excludedPresets, setExcludedPresets] = useState(new Set()); // preset spec ids to skip during "apply & resim all"

  const togglePresetExcluded = useCallback((specId) => {
    setExcludedPresets((prev) => {
      const next = new Set(prev);
      if (next.has(specId)) next.delete(specId);
      else next.add(specId);
      return next;
    });
  }, []);

  const removeBuffContributor = useCallback((id) => {
    setBuffContributors((prev) => prev.filter((c) => c.id !== id));
  }, []);
  const setContributorTotemChoice = useCallback((id, choice) => {
    setBuffContributors((prev) => prev.map((c) => (c.id === id ? { ...c, totemChoice: choice } : c)));
  }, []);
  const renameContributor = useCallback((id, name) => {
    setBuffContributors((prev) => prev.map((c) => (c.id === id ? { ...c, name: name.slice(0, 60) } : c)));
  }, []);

  const iterationsFor = (p) => PRECISION_OPTIONS.find((o) => o.value === p)?.iterations ?? 700;

  const resimSpec = useCallback(async (specId, playerOverride, debuffsOverride, encounterOverride, raidBuffsOverride) => {
    if (presetsUnavailable) throw new Error("Resimming isn't available in this preview - it needs preset data served from the deployed website (see README).");
    const player = playerOverride || customPlayers[specId] || presetPlayers[specId];
    const effectiveDebuffs = debuffsOverride || debuffs;
    const effectiveEncounter = encounterOverride || encounter;
    const effectiveRaidBuffs = raidBuffsOverride || raidBuffs;
    const iterations = iterationsFor(precision);
    setSimProgress({ specId, current: 0, total: TOTAL_SIM_JOBS });
    try {
      const newFactors = await simProfile(player, effectiveDebuffs, effectiveEncounter, effectiveRaidBuffs, iterations, (current, total) => {
        setSimProgress({ specId, current, total });
      });
      setFactorsState((prev) => ({ ...prev, [specId]: newFactors }));
    } finally {
      setSimProgress(null);
    }
  }, [customPlayers, presetPlayers, debuffs, encounter, raidBuffs, precision, presetsUnavailable]);

  const uploadCustomProfile = useCallback(async (specId, rawJson) => {
    if (presetsUnavailable) throw new Error("Custom profiles aren't available in this preview - it needs preset data served from the deployed website (see README).");
    const player = parseUploadedProfile(rawJson, presetPlayers[specId]);
    setCustomPlayers((prev) => ({ ...prev, [specId]: player }));
    setProfileMeta((prev) => ({ ...prev, [specId]: { isCustom: true, label: rawJson.player?.name || "custom" } }));
    await resimSpec(specId, player);
  }, [presetPlayers, resimSpec, presetsUnavailable]);

  // Every custom profile gets its personal DPS simmed - that's the whole point of uploading one
  // instead of just using a preset as a buff bot. parseBuffContributor already picked the best
  // default spec (using a hint if one was found, else the class's first option) - we just use it.
  const addBuffContributor = useCallback(async (contributor) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const chosenSpec = contributor.simProfileChoice;
    setBuffContributors((prev) => [...prev, { ...contributor, id }]);
    if (chosenSpec) {
      if (presetsUnavailable) throw new Error("Resimming isn't available in this preview - it needs preset data served from the deployed website (see README).");
      const player = parseUploadedProfile(contributor.rawJson, presetPlayers[chosenSpec], contributor.blessings);
      await resimSpec(id, player);
    }
    return id;
  }, [presetPlayers, resimSpec, presetsUnavailable]);

  // Lets the user switch a contributor's sim profile (e.g. Druid Tank <-> DPS) after the fact.
  const setContributorSimProfile = useCallback(async (contributorId, specChoice) => {
    setBuffContributors((prev) => prev.map((c) => (c.id === contributorId ? { ...c, simProfileChoice: specChoice } : c)));
    if (!specChoice) return;
    const contributor = buffContributors.find((c) => c.id === contributorId);
    if (!contributor) return;
    if (presetsUnavailable) throw new Error("Resimming isn't available in this preview - it needs preset data served from the deployed website (see README).");
    const player = parseUploadedProfile(contributor.rawJson, presetPlayers[specChoice], contributor.blessings);
    await resimSpec(contributorId, player);
  }, [buffContributors, presetPlayers, resimSpec, presetsUnavailable]);

  // Lets the user fine-tune which blessings this specific contributor receives - unlike every
  // other raid buff, blessings genuinely vary per person, so they're not part of the shared raid
  // buffs settings. Re-resims immediately since it affects this contributor's own personal DPS.
  const setContributorBlessings = useCallback(async (contributorId, newBlessings) => {
    setBuffContributors((prev) => prev.map((c) => (c.id === contributorId ? { ...c, blessings: newBlessings } : c)));
    const contributor = buffContributors.find((c) => c.id === contributorId);
    if (!contributor || !contributor.simProfileChoice) return;
    if (presetsUnavailable) throw new Error("Resimming isn't available in this preview - it needs preset data served from the deployed website (see README).");
    const player = parseUploadedProfile(contributor.rawJson, presetPlayers[contributor.simProfileChoice], newBlessings);
    await resimSpec(contributorId, player);
  }, [buffContributors, presetPlayers, resimSpec, presetsUnavailable]);

  const revertToPreset = useCallback((specId) => {
    setCustomPlayers((prev) => { const next = { ...prev }; delete next[specId]; return next; });
    setProfileMeta((prev) => ({ ...prev, [specId]: { isCustom: false, label: null } }));
    setFactorsState((prev) => ({ ...prev, [specId]: presetFactors[specId] }));
  }, [presetFactors]);

  const updateSettings = useCallback((newDebuffs, newEncounter, newRaidBuffs) => {
    setDebuffs(newDebuffs);
    setEncounter(newEncounter);
    if (newRaidBuffs) setRaidBuffs(newRaidBuffs);
    setSettingsAreDefault(false);
  }, []);

  const resetSettingsToDefault = useCallback(() => {
    setDebuffs(DEFAULT_DEBUFFS);
    setEncounter(DEFAULT_ENCOUNTER);
    setRaidBuffs(DEFAULT_RAID_BUFFS);
    setSettingsAreDefault(true);
  }, []);

  // Resim every profile currently in use (preset or custom) under the given settings - needed
  // after changing encounter/debuffs/raid buffs, since those apply to everyone. Takes explicit
  // overrides rather than relying on state, since state set just before calling this hasn't committed yet.
  // Resims every active preset (skipping any the user has excluded) plus every custom profile
  // that has a personal-DPS sim profile chosen - custom profiles are the ones an actual roster
  // relies on, so they need to stay in sync with settings changes just as much as presets do.
  const resimAll = useCallback(async (debuffsOverride, encounterOverride, raidBuffsOverride) => {
    for (const specId of Object.keys(presetFactors)) {
      if (excludedPresets.has(specId)) continue;
      await resimSpec(specId, undefined, debuffsOverride, encounterOverride, raidBuffsOverride);
    }
    for (const contributor of buffContributors) {
      if (!contributor.simProfileChoice) continue;
      const player = parseUploadedProfile(contributor.rawJson, presetPlayers[contributor.simProfileChoice], contributor.blessings);
      await resimSpec(contributor.id, player, debuffsOverride, encounterOverride, raidBuffsOverride);
    }
  }, [presetFactors, resimSpec, excludedPresets, buffContributors, presetPlayers]);

  const value = {
    factors, profileMeta, debuffs, encounter, raidBuffs, settingsAreDefault, precision, setPrecision,
    simProgress, resimSpec, uploadCustomProfile, revertToPreset, updateSettings, resetSettingsToDefault, resimAll,
    presetFactors, presetsUnavailable,
    buffContributors, addBuffContributor, removeBuffContributor, setContributorTotemChoice, renameContributor, setContributorSimProfile, setContributorBlessings, excludedPresets, togglePresetExcluded,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ---------- UI ----------

const tierColor = (rank) => {
  if (rank === 0) return { bg: "#3a2f14", border: "#c9962c", text: "#f0c14b" };
  if (rank === 1) return { bg: "#241f38", border: "#8b7fd4", text: "#b3a8f0" };
  return { bg: "#152a38", border: "#4a90c9", text: "#7ec1f0" };
};

function restoTotemLabel(variant, count) {
  if (variant === "restoA") return `${count > 1 ? `${count}x resto shaman, all on ` : ""}strength + agility totems`;
  if (variant === "restoB") return `${count > 1 ? `${count}x resto shaman, all on ` : ""}strength + windfury totems`;
  if (variant === "restoAB") return `${count} resto shamans - one on agility totem, one on windfury totem${count > 2 ? `, rest redundant` : ""}`;
  return null;
}

function specDisplayLabel(specId, baseLabel, profileMeta) {
  const meta = profileMeta[specId];
  if (meta?.isCustom) return `Custom: ${meta.label || baseLabel}`;
  return `Preset: ${baseLabel}`;
}

function AppShell() {
  const [mode, setMode] = useState("optimize");
  const tabs = [
    { id: "optimize", label: "Optimize from pool" },
    { id: "manual", label: "Build & compare manually" },
    { id: "settings", label: "Profiles & settings" },
  ];
  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setMode(t.id)}
            style={{
              flex: 1, minWidth: "140px", padding: "10px", borderRadius: "6px", border: "1px solid " + (mode === t.id ? "#c9962c" : "#333"),
              background: mode === t.id ? "#2a2410" : "#181818", color: mode === t.id ? "#f0c14b" : "#999",
              fontSize: "13px", fontWeight: 600, cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {mode === "optimize" && <OptimizerMode />}
      {mode === "manual" && <ManualBuilder />}
      {mode === "settings" && <SettingsPanel />}
    </div>
  );
}

export default function RaidCompOptimizer() {
  const [presetPlayers, setPresetPlayers] = useState(null); // null while loading, {} if unavailable, {specId: player} if loaded
  const [presetsUnavailable, setPresetsUnavailable] = useState(false);

  useEffect(() => {
    Promise.all(
      SPEC_LIST.map((s) =>
        fetch(`./presets/${s.id}.json`).then((r) => {
          const contentType = r.headers.get("content-type") || "";
          if (!r.ok || !contentType.includes("json")) throw new Error("not available in this environment");
          return r.json();
        })
      )
    )
      .then((all) => {
        const map = {};
        SPEC_LIST.forEach((s, i) => { map[s.id] = all[i].player; });
        setPresetPlayers(map);
      })
      .catch(() => {
        // Custom resimming needs these files served from public/presets/ - only available when
        // this app is actually deployed (GitHub Pages etc), not in an artifact preview. The core
        // optimizer/build&compare features don't need this at all (PRESET_FACTORS is inlined),
        // so we still render the app - just with resimming disabled.
        setPresetsUnavailable(true);
        setPresetPlayers({});
      });
  }, []);

  if (presetPlayers === null) {
    return (
      <div style={{ background: "#121212", color: "#999", padding: "24px", borderRadius: "8px", fontSize: "13px" }}>
        Loading...
      </div>
    );
  }

  return (
    <AppProvider presetFactors={PRESET_FACTORS} presetPlayers={presetPlayers} presetsUnavailable={presetsUnavailable}>
      <AppShell />
    </AppProvider>
  );
}

// ---------- Manual builder mode: freely assign each slot, compare instantly ----------

const SLOT_OPTIONS = [
  { value: "empty", label: "(empty)" },
  ...SPEC_LIST.map((s) => ({ value: s.id, label: s.label })),
  { value: "resto_a", label: "Resto shaman (str+agi)" },
  { value: "resto_b", label: "Resto shaman (str+wf)" },
];

function slotsToCounts(slots, buffContributors) {
  const counts = Object.fromEntries(SPEC_LIST.map((s) => [s.id, 0]));
  let restoAgi = 0, restoWf = 0;
  const extraBuffs = { warrior: false, ret: false, feral: false, fi: 0, shaman: null };
  const namedDpsEntries = [];
  for (const v of slots) {
    if (v === "empty") continue;
    if (v === "resto_a") { restoAgi += 1; continue; }
    if (v === "resto_b") { restoWf += 1; continue; }
    if (typeof v === "string" && v.startsWith("contrib:")) {
      const c = (buffContributors || []).find((x) => x.id === v.slice(8));
      if (c) {
        if (c.capabilities.warrior) extraBuffs.warrior = true;
        if (c.capabilities.ret) extraBuffs.ret = true;
        if (c.capabilities.feral) extraBuffs.feral = true;
        extraBuffs.fi += c.capabilities.fi || 0;
        if (c.capabilities.shaman === "enh") {
          extraBuffs.shaman = "enh";
        } else if (c.totemChoice) {
          if (c.totemChoice === "restoA") extraBuffs.shaman = extraBuffs.shaman === "restoB" ? "restoAB" : (extraBuffs.shaman === "enh" ? "enh" : "restoA");
          if (c.totemChoice === "restoB") extraBuffs.shaman = extraBuffs.shaman === "restoA" ? "restoAB" : (extraBuffs.shaman === "enh" ? "enh" : "restoB");
        }
        if (c.simProfileChoice) namedDpsEntries.push({ id: c.id, name: c.name });
      }
      continue;
    }
    counts[v] += 1;
  }
  return { counts, restoAgi, restoWf, extraBuffs, namedDpsEntries };
}

// Explicit slots mean no search is needed here - if a survival hunter is placed, we know exactly
// which totem (if any) their own group gives them. fallbackOverride is the manual "assume" checkbox.
function computeManualRaidWideEW(groupSlotsArray, fallbackOverride) {
  let maxAgility = null;
  for (const slots of groupSlotsArray) {
    const { counts, restoAgi, restoWf } = slotsToCounts(slots);
    if (counts.survival_hunter > 0) {
      const shamanState = resolveShamanState(counts.enhance_shaman, restoAgi, restoWf);
      const agility = EW_BASE_AGILITY + survivalHunterAgilityBump(shamanState);
      if (maxAgility === null || agility > maxAgility) maxAgility = agility;
    }
  }
  return maxAgility !== null ? { agility: maxAgility, uptime: EW_UPTIME_DEFAULT } : fallbackOverride;
}

function evalSlots(slots, ewOverride, factors, buffContributors) {
  const { counts, restoAgi, restoWf, extraBuffs, namedDpsEntries } = slotsToCounts(slots, buffContributors);
  return evaluateGroup(counts, restoAgi, restoWf, ewOverride, factors, extraBuffs, namedDpsEntries);
}

function ManualBuilder() {
  const { factors, profileMeta, buffContributors } = useAppContext();
  const [numGroups, setNumGroups] = useState(1);
  const [groupSlots, setGroupSlots] = useState([Array(5).fill("empty")]);
  const [assumeSvHunter, setAssumeSvHunter] = useState(false);
  const [assumedAgility, setAssumedAgility] = useState(1068);
  const [assumedUptime, setAssumedUptime] = useState(90);

  const setNumGroupsAndResize = (n) => {
    setNumGroups(n);
    setGroupSlots((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(Array(5).fill("empty"));
      return next.slice(0, n);
    });
  };

  const setSlot = (groupIdx, slotIdx, value) => {
    setGroupSlots((prev) => prev.map((g, gi) => (gi === groupIdx ? g.map((v, si) => (si === slotIdx ? value : v)) : g)));
  };

  const raidHasSurvivalHunter = groupSlots.some((slots) => slots.includes("survival_hunter"));
  const assumedOverride = assumeSvHunter ? { agility: assumedAgility, uptime: assumedUptime / 100 } : null;
  const ewOverride = computeManualRaidWideEW(groupSlots, assumedOverride);

  const groupEvals = groupSlots.map((slots) => evalSlots(slots, ewOverride, factors, buffContributors));
  const raidTotal = groupEvals.reduce((a, e) => a + e.total, 0);

  return (
    <div style={{ background: "#121212", color: "#e8e8e8", padding: "24px", borderRadius: "8px", fontFamily: "system-ui, sans-serif", maxWidth: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
        <Swords size={22} color="#c9962c" />
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600, color: "#f0c14b" }}>Build &amp; compare</h2>
      </div>
      <p style={{ color: "#999", fontSize: "13px", marginTop: "4px", marginBottom: "16px" }}>
        Pick a spec for each slot and see personal dps plus each slot's marginal contribution to the group, updated instantly.
      </p>

      <label style={{ fontSize: "13px", color: "#aaa", display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px", width: "fit-content" }}>
        Number of groups:
        <select value={numGroups} onChange={(e) => setNumGroupsAndResize(Number(e.target.value))} style={{ background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444", borderRadius: "4px", padding: "4px 8px", fontSize: "13px" }}>
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
          <option value={5}>5</option>
        </select>
      </label>

      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "6px", padding: "10px 14px", marginBottom: "16px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: raidHasSurvivalHunter ? "#666" : "#e8e8e8", cursor: raidHasSurvivalHunter ? "default" : "pointer" }}>
          <input
            type="checkbox"
            checked={assumeSvHunter}
            disabled={raidHasSurvivalHunter}
            onChange={() => setAssumeSvHunter((v) => !v)}
            style={{ margin: 0 }}
          />
          Assume a survival hunter in the raid
        </label>
        {raidHasSurvivalHunter && (
          <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
            a survival hunter is already placed in a group slot, so this is applied automatically
          </div>
        )}
        {assumeSvHunter && !raidHasSurvivalHunter && (
          <div style={{ display: "flex", gap: "16px", marginTop: "10px", flexWrap: "wrap" }}>
            <label style={{ fontSize: "12px", color: "#aaa", display: "flex", alignItems: "center", gap: "6px" }}>
              Agility:
              <input
                type="number"
                value={assumedAgility}
                onChange={(e) => setAssumedAgility(Number(e.target.value))}
                style={{ width: "70px", background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444", borderRadius: "4px", padding: "4px 6px", fontSize: "12px" }}
              />
            </label>
            <label style={{ fontSize: "12px", color: "#aaa", display: "flex", alignItems: "center", gap: "6px" }}>
              Uptime %:
              <input
                type="number"
                min="0"
                max="100"
                value={assumedUptime}
                onChange={(e) => setAssumedUptime(Number(e.target.value))}
                style={{ width: "60px", background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444", borderRadius: "4px", padding: "4px 6px", fontSize: "12px" }}
              />
            </label>
          </div>
        )}
      </div>

      <div style={{ fontSize: "14px", color: "#f0c14b", fontWeight: 600, marginBottom: "14px" }}>
        {Math.round(raidTotal).toLocaleString()} total raid dps
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {groupSlots.map((slots, gIdx) => {
          const evalResult = groupEvals[gIdx];
          const totemLabel = evalResult.state.shaman === "restoA" ? "strength + agility totems"
            : evalResult.state.shaman === "restoB" ? "strength + windfury totems"
            : evalResult.state.shaman === "restoAB" ? "agility totem from one resto shaman, windfury from another"
            : evalResult.state.shaman === "enh" ? "improved totems + unleashed rage" : null;
          return (
            <div key={gIdx} style={{ border: "1px solid #2c2c2c", borderRadius: "8px", padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#f0c14b" }}>Group {gIdx + 1}</span>
                <span style={{ fontSize: "12px", color: "#999" }}>{Math.round(evalResult.total).toLocaleString()} group dps</span>
              </div>
              {totemLabel && (
                <div style={{ fontSize: "12px", color: "#c9962c", marginBottom: "10px" }}>
                  active shaman totems: <strong style={{ fontWeight: 600 }}>{totemLabel}</strong>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px" }}>
                {slots.map((val, sIdx) => {
                  const withoutSlots = [...slots];
                  withoutSlots[sIdx] = "empty";
                  const withoutTotal = evalSlots(withoutSlots, ewOverride, factors, buffContributors).total;
                  const marginal = evalResult.total - withoutTotal;
                  const specMeta = SPEC_LIST.find((s) => s.id === val);
                  const lookupId = typeof val === "string" && val.startsWith("contrib:") ? val.slice(8) : val;
                  const personalDps = (specMeta || val.startsWith?.("contrib:")) ? evalResult.breakdown.find((b) => b.id === lookupId)?.dpsEach : null;
                  return (
                    <div key={sIdx} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "6px", padding: "10px 12px" }}>
                      <select
                        value={val}
                        onChange={(e) => setSlot(gIdx, sIdx, e.target.value)}
                        style={{ width: "100%", background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444", borderRadius: "4px", padding: "5px 6px", fontSize: "12px", marginBottom: "8px" }}
                      >
                        {SLOT_OPTIONS.map((o) => {
                          const specMatch = SPEC_LIST.find((s) => s.id === o.value);
                          const label = specMatch ? specDisplayLabel(o.value, o.label, profileMeta) : o.label;
                          return <option key={o.value} value={o.value}>{label}</option>;
                        })}
                        {buffContributors.length > 0 && (
                          <optgroup label="Buff contributors">
                            {buffContributors.map((c) => (
                              <option key={c.id} value={`contrib:${c.id}`}>{c.name} ({c.class.replace("Class", "")})</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      <div style={{ fontSize: "11px", color: "#999", display: "flex", justifyContent: "space-between" }}>
                        <span>personal: {personalDps != null ? Math.round(personalDps).toLocaleString() : "-"}</span>
                        <span style={{ color: "#7ec1f0" }}>+group: {Math.round(marginal).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OptimizerMode() {
  const { factors, profileMeta } = useAppContext();
  const emptyCounts = () => Object.fromEntries(SPEC_LIST.map((s) => [s.id, 0]));
  const [counts, setCounts] = useState(emptyCounts());
  const [restoCount, setRestoCount] = useState(0);
  const [numGroups, setNumGroups] = useState(1);
  const [objective, setObjective] = useState("total");
  const [excludeHunters, setExcludeHunters] = useState(false);

  const [committed, setCommitted] = useState(null); // snapshot used for computation
  const [stale, setStale] = useState(false); // true when inputs changed since last compute

  const totalLocked = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0) + restoCount, [counts, restoCount]);
  const capacity = numGroups * 5;
  const overflow = totalLocked > capacity;

  const results = useMemo(() => {
    if (!committed || committed.overflow) return null;
    const pool = { ...committed.counts, resto_shaman: committed.restoCount };
    return allocateRaid(pool, committed.numGroups, committed.objective, factors);
  }, [committed, factors]);

  const markStale = () => setStale(true);
  const updateCount = (id, delta) => { setCounts((prev) => ({ ...prev, [id]: Math.max(0, prev[id] + delta) })); markStale(); };
  const changeResto = (delta) => { setRestoCount((c) => Math.max(0, c + delta)); markStale(); };
  const changeNumGroups = (v) => { setNumGroups(v); markStale(); };
  const changeObjective = (v) => { setObjective(v); markStale(); };

  const computeResults = () => {
    setCommitted({ counts: { ...counts }, restoCount, numGroups, objective, overflow });
    setStale(false);
  };

  const top = results ? results[0] : null;
  const objectiveGroupIdx = useMemo(() => {
    if (!top || committed.objective === "total" || committed.objective === "avg_pct") return -1;
    let bestIdx = -1, bestScore = -Infinity;
    top.groupResults.forEach((r, i) => { if (r.score > bestScore) { bestScore = r.score; bestIdx = i; } });
    return bestIdx;
  }, [top, committed]);

  const suggestions = useMemo(() => {
    if (!top) return null;
    const svGroup = top.groupResults.find((r) => r.lockedCounts.survival_hunter > 0);
    const raidWideEW = svGroup ? { agility: EW_BASE_AGILITY + survivalHunterAgilityBump(svGroup.state.shaman), uptime: EW_UPTIME_DEFAULT } : null;
    return top.groupResults.map((r) => bestFill(r.lockedCounts, r.lockedResto, r.remaining, excludeHunters, raidWideEW, factors));
  }, [top, excludeHunters, factors]);

  return (
    <div style={{ background: "#121212", color: "#e8e8e8", padding: "24px", borderRadius: "8px", fontFamily: "system-ui, sans-serif", maxWidth: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
        <Swords size={22} color="#c9962c" />
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600, color: "#f0c14b" }}>Raid comp optimizer</h2>
      </div>
      <p style={{ color: "#999", fontSize: "13px", marginTop: "4px", marginBottom: "18px" }}>
        Enter every player you have available, then press compute to split them across your groups.
      </p>
      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "6px", padding: "10px 14px", marginBottom: "16px", color: "#999", fontSize: "12px" }}>
        For performance, we don't sim every possible combination of buffs together - each buff is measured on
        its own against a baseline, then combined mathematically. This has been checked against directly-simmed
        combinations and stays within about 0.3% of the real result.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px", marginBottom: "16px" }}>
        {SPEC_LIST.map((spec) => (
          <div key={spec.id} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "6px", padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px" }}>{specDisplayLabel(spec.id, spec.label, profileMeta)}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button onClick={() => updateCount(spec.id, -1)} style={{ width: "22px", height: "22px", borderRadius: "4px", border: "1px solid #444", background: "#252525", color: "#ccc", cursor: "pointer", fontSize: "14px", lineHeight: 1 }}>-</button>
              <span style={{ minWidth: "16px", textAlign: "center", fontWeight: 600 }}>{counts[spec.id]}</span>
              <button onClick={() => updateCount(spec.id, 1)} style={{ width: "22px", height: "22px", borderRadius: "4px", border: "1px solid #444", background: "#252525", color: "#ccc", cursor: "pointer", fontSize: "14px", lineHeight: 1 }}>+</button>
            </div>
          </div>
        ))}
        <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "6px", padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "13px" }}>Resto shaman</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button onClick={() => changeResto(-1)} style={{ width: "22px", height: "22px", borderRadius: "4px", border: "1px solid #444", background: "#252525", color: "#ccc", cursor: "pointer", fontSize: "14px", lineHeight: 1 }}>-</button>
            <span style={{ minWidth: "16px", textAlign: "center", fontWeight: 600 }}>{restoCount}</span>
            <button onClick={() => changeResto(1)} style={{ width: "22px", height: "22px", borderRadius: "4px", border: "1px solid #444", background: "#252525", color: "#ccc", cursor: "pointer", fontSize: "14px", lineHeight: 1 }}>+</button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "14px", flexWrap: "wrap" }}>
        <label style={{ fontSize: "13px", color: "#aaa", display: "flex", alignItems: "center", gap: "6px" }}>
          Number of groups:
          <select value={numGroups} onChange={(e) => changeNumGroups(Number(e.target.value))} style={{ background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444", borderRadius: "4px", padding: "4px 8px", fontSize: "13px" }}>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
          </select>
        </label>
        <label style={{ fontSize: "13px", color: "#aaa", display: "flex", alignItems: "center", gap: "6px" }}>
          Optimize for:
          <select value={objective} onChange={(e) => changeObjective(e.target.value)} style={{ background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444", borderRadius: "4px", padding: "4px 8px", fontSize: "13px" }}>
            <option value="total">Total raid dps</option>
            <option value="avg_pct">Average % dps gain</option>
            {SPEC_LIST.map((s) => (
              <option key={s.id} value={s.id}>{s.label} only</option>
            ))}
          </select>
        </label>
        <span style={{ fontSize: "13px", color: overflow ? "#e05c5c" : "#aaa" }}>
          {totalLocked}/{capacity} players placed
        </span>
      </div>

      <button
        onClick={computeResults}
        disabled={overflow}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%",
          background: overflow ? "#2a2a2a" : stale || !committed ? "#c9962c" : "#252525",
          color: overflow ? "#777" : stale || !committed ? "#1a1400" : "#ccc",
          border: "1px solid " + (overflow ? "#444" : "#c9962c"),
          borderRadius: "6px", padding: "10px 16px", fontSize: "14px", fontWeight: 600,
          cursor: overflow ? "not-allowed" : "pointer", marginBottom: "18px",
        }}
      >
        {committed && !stale ? "results up to date" : "compute best split"}
      </button>

      {overflow && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center", background: "#3a1f1f", border: "1px solid #6b2c2c", borderRadius: "6px", padding: "10px 14px", color: "#e0a0a0", fontSize: "13px", marginBottom: "14px" }}>
          <AlertTriangle size={16} />
          {totalLocked} players won't fit in {numGroups} group{numGroups > 1 ? "s" : ""} ({capacity} slots) - remove some or add another group.
        </div>
      )}

      {!committed && !overflow && (
        <div style={{ fontSize: "13px", color: "#999" }}>No results yet - press compute best split above.</div>
      )}

      {committed && stale && !overflow && (
        <div style={{ fontSize: "12px", color: "#c9962c", marginBottom: "10px" }}>Inputs changed - press compute to refresh the results below.</div>
      )}

      {committed && !overflow && !results && (
        <div style={{ fontSize: "13px", color: "#999" }}>
          That roster can't be split across {committed.numGroups} group{committed.numGroups > 1 ? "s" : ""} - too many of one exclusive spec.
        </div>
      )}

      {results && (
        <>
          <div style={{ marginBottom: "22px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#e8e8e8", marginBottom: "10px" }}>Recommended splits</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {results.map((alloc, rIdx) => (
                <div key={rIdx} style={{ border: "1px solid #2c2c2c", borderRadius: "8px", padding: "12px 14px" }}>
                  <div style={{ fontSize: "13px", color: "#f0c14b", fontWeight: 600, marginBottom: "8px" }}>
                    #{rIdx + 1} - {Math.round(alloc.raidTotal).toLocaleString()} total raid dps
                    {committed.objective === "avg_pct" && ` (+${(alloc.raidAvgPct * 100).toFixed(1)}% avg dps gain)`}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {alloc.groupResults.map((r, i) => {
                      const colors = tierColor(i);
                      const totemLabel = r.restoCount > 0 ? restoTotemLabel(r.restoVariant, r.restoCount) : null;
                      return (
                        <div key={i} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "10px 14px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px", flexWrap: "wrap", gap: "6px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {rIdx === 0 && i === objectiveGroupIdx && <Trophy size={15} color={colors.text} />}
                              <span style={{ color: colors.text, fontWeight: 600, fontSize: "14px" }}>Group {i + 1}</span>
                            </div>
                            <span style={{ fontSize: "12px", color: "#999" }}>
                              {Math.round(r.total).toLocaleString()} group dps
                              {committed.objective === "avg_pct" && r.playerCount > 0 && ` (+${((r.pctSum / r.playerCount) * 100).toFixed(1)}% avg)`}
                            </span>
                          </div>
                          {totemLabel && (
                            <div style={{ fontSize: "12px", color: colors.text, marginBottom: "6px" }}>
                              resto shaman should drop: <strong style={{ fontWeight: 600 }}>{totemLabel}</strong>
                            </div>
                          )}
                          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "12px", color: "#bbb" }}>
                            {r.breakdown.map((b) => (
                              <span key={b.id}>{b.label}{b.count > 1 ? ` x${b.count}` : ""}: {Math.round(b.dpsEach).toLocaleString()}</span>
                            ))}
                            {r.breakdown.length === 0 && <span style={{ color: "#777" }}>empty group</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "4px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#e8e8e8", margin: 0 }}>Suggested additions</h3>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#aaa", cursor: "pointer" }}>
                <input type="checkbox" checked={excludeHunters} onChange={() => setExcludeHunters((v) => !v)} style={{ margin: 0 }} />
                do not suggest additional hunters
              </label>
            </div>
            <p style={{ fontSize: "12px", color: "#999", marginTop: 0, marginBottom: "10px" }}>
              What to recruit to complete the #1 split above, on top of what you already entered. Not counted in the totals above.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {top.groupResults.map((r, i) => {
                const colors = tierColor(i);
                const fill = suggestions[i];
                if (!fill) {
                  return (
                    <div key={i} style={{ background: "#181818", border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "10px 14px" }}>
                      <span style={{ color: colors.text, fontWeight: 600, fontSize: "13px" }}>Group {i + 1}</span>
                      <span style={{ fontSize: "12px", color: "#999", marginLeft: "10px" }}>no valid completion found</span>
                    </div>
                  );
                }
                const extras = SPEC_LIST.filter((s) => (fill.finalCounts[s.id] || 0) > (r.lockedCounts[s.id] || 0));
                const restoAdded = fill.restoCount - r.lockedResto;
                const nothingToAdd = extras.length === 0 && restoAdded === 0;
                const totemLabel = fill.restoCount > 0 ? restoTotemLabel(fill.restoVariant, fill.restoCount) : null;
                return (
                  <div key={i} style={{ background: "#181818", border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "10px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                      <span style={{ color: colors.text, fontWeight: 600, fontSize: "13px" }}>Group {i + 1}</span>
                      <span style={{ fontSize: "12px", color: "#ccc" }}>
                        {nothingToAdd
                          ? "already complete"
                          : [
                              ...extras.map((s) => `${fill.finalCounts[s.id] - (r.lockedCounts[s.id] || 0)}x ${s.label}`),
                              ...(restoAdded > 0 ? [`${restoAdded}x resto shaman`] : []),
                            ].join(", ")}
                      </span>
                    </div>
                    {totemLabel && !nothingToAdd && (
                      <div style={{ fontSize: "12px", color: colors.text, marginTop: "6px" }}>
                        resto shaman should drop: <strong style={{ fontWeight: 600 }}>{totemLabel}</strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


// ---------- Profiles & settings panel ----------

function estimateSeconds(iterations) {
  return 1.33 + 0.00533 * iterations;
}

const MOB_TYPES = [
  { value: "MobTypeUndead", label: "Undead" },
  { value: "MobTypeBeast", label: "Beast" },
  { value: "MobTypeDemon", label: "Demon" },
  { value: "MobTypeDragonkin", label: "Dragonkin" },
  { value: "MobTypeElemental", label: "Elemental" },
  { value: "MobTypeGiant", label: "Giant" },
  { value: "MobTypeHumanoid", label: "Humanoid" },
  { value: "MobTypeMechanical", label: "Mechanical" },
];

const DEBUFF_TOGGLES = [
  { key: "judgementOfWisdom", label: "Judgement of Wisdom", type: "bool" },
  { key: "improvedSealOfTheCrusader", label: "Seal of the Crusader", type: "tristate" },
  { key: "misery", label: "Misery", type: "bool" },
  { key: "curseOfElements", label: "Curse of Elements", type: "tristate" },
  { key: "bloodFrenzy", label: "Blood Frenzy", type: "bool" },
  { key: "giftOfArthas", label: "Gift of Arthas", type: "bool" },
  { key: "mangle", label: "Mangle", type: "bool" },
  { key: "exposeArmor", label: "Expose Armor", type: "tristate" },
  { key: "faerieFire", label: "Faerie Fire", type: "tristate" },
  { key: "sunderArmor", label: "Sunder Armor", type: "bool" },
  { key: "curseOfRecklessness", label: "Curse of Recklessness", type: "bool" },
  { key: "huntersMark", label: "Hunter's Mark", type: "tristate" },
];

const RAID_BUFF_TOGGLES = [
  { key: "arcaneBrilliance", label: "Arcane Brilliance", type: "bool" },
  { key: "divineSpirit", label: "Divine Spirit", type: "tristate" },
  { key: "giftOfTheWild", label: "Gift of the Wild", type: "tristate" },
  { key: "bloodlust", label: "Bloodlust", type: "bool" },
];

function SettingsPanel() {
  const {
    debuffs, encounter, raidBuffs, settingsAreDefault, precision, setPrecision,
    simProgress, updateSettings, resetSettingsToDefault, resimAll,
    presetsUnavailable, factors, buffContributors, addBuffContributor, removeBuffContributor, setContributorTotemChoice, renameContributor, setContributorSimProfile, setContributorBlessings, excludedPresets, togglePresetExcluded,
  } = useAppContext();

  const [draftDebuffs, setDraftDebuffs] = useState(debuffs);
  const [draftRaidBuffs, setDraftRaidBuffs] = useState(raidBuffs);
  const [draftDuration, setDraftDuration] = useState(encounter.duration);
  const [draftLevel, setDraftLevel] = useState(encounter.targets[0].level);
  const [draftArmor, setDraftArmor] = useState(encounter.targets[0].stats[31] || 7685);
  const [draftMobType, setDraftMobType] = useState(encounter.targets[0].mobType);
  const [draftEncounterOverride, setDraftEncounterOverride] = useState(null); // set by a full-encounter JSON upload (can be multi-target); bypasses the fields above
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [contributorError, setContributorError] = useState(null);
  const [resimError, setResimError] = useState(null);
  const [resimmingAll, setResimmingAll] = useState(false);

  const handleContributorUpload = async (fileList) => {
    setContributorError(null);
    for (const file of Array.from(fileList)) {
      try {
        if (file.size > MAX_UPLOAD_BYTES) throw new Error(`file is too large`);
        const text = await file.text();
        let json;
        try { json = JSON.parse(text); } catch { throw new Error("not valid JSON"); }
        const baseName = file.name.replace(/\.json$/i, "");
        const contributor = parseBuffContributor(json, baseName);
        setSettingsDirty(true); // nudge toward "apply & resim all" immediately, before the (slow) resim even starts
        await addBuffContributor(contributor);
      } catch (e) {
        setContributorError(`${file.name}: ${e.message}`);
      }
    }
  };

  const iterations = PRECISION_OPTIONS.find((o) => o.value === precision)?.iterations ?? 700;
  const perProfileEstimate = Math.round(estimateSeconds(iterations) * TOTAL_SIM_JOBS);

  const readUploadedJson = async (file) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`file is ${(file.size / 1024 / 1024).toFixed(1)}MB - refusing to load something this large`);
    }
    const text = await file.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("not valid JSON");
    }
  };

  const handleEncounterUpload = async (file) => {
    setUploadError(null);
    try {
      const json = await readUploadedJson(file);
      validateEncounterUpload(json);
      setDraftEncounterOverride(json);
      setSettingsDirty(true);
    } catch (e) {
      setUploadError(`encounter: ${e.message}`);
    }
  };

  const handleDebuffsUpload = async (file) => {
    setUploadError(null);
    try {
      const json = await readUploadedJson(file);
      validateFlatBuffObject(json, "debuffs");
      setDraftDebuffs(json);
      setSettingsDirty(true);
    } catch (e) {
      setUploadError(`debuffs: ${e.message}`);
    }
  };

  const handleRaidBuffsUpload = async (file) => {
    setUploadError(null);
    try {
      const json = await readUploadedJson(file);
      validateFlatBuffObject(json, "raid buffs");
      setDraftRaidBuffs(json);
      setSettingsDirty(true);
    } catch (e) {
      setUploadError(`raid buffs: ${e.message}`);
    }
  };

  const applySettingsAndResimAll = async () => {
    setResimError(null);
    let newEncounter;
    if (draftEncounterOverride) {
      newEncounter = draftEncounterOverride;
    } else {
      const newTargetStats = [...encounter.targets[0].stats];
      newTargetStats[31] = draftArmor;
      newEncounter = { ...encounter, duration: draftDuration, targets: [{ ...encounter.targets[0], level: draftLevel, mobType: draftMobType, stats: newTargetStats }] };
    }
    updateSettings(draftDebuffs, newEncounter, draftRaidBuffs); // updates state for future renders/display
    setSettingsDirty(false);
    setResimmingAll(true);
    try {
      await resimAll(draftDebuffs, newEncounter, draftRaidBuffs); // pass explicitly - state above hasn't committed yet
    } catch (e) {
      setResimError(e.message);
    } finally {
      setResimmingAll(false);
    }
  };

  const revertSettings = () => {
    resetSettingsToDefault();
    setDraftDebuffs(debuffs);
    setDraftRaidBuffs(DEFAULT_RAID_BUFFS);
    setDraftDuration(150);
    setDraftLevel(73);
    setDraftArmor(7685);
    setDraftMobType("MobTypeUndead");
    setDraftEncounterOverride(null);
    setSettingsDirty(false);
  };

  return (
    <div style={{ background: "#121212", color: "#e8e8e8", padding: "24px", borderRadius: "8px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
        <Settings size={20} color="#c9962c" />
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600, color: "#f0c14b" }}>Profiles &amp; settings</h2>
      </div>
      <p style={{ color: "#999", fontSize: "13px", marginTop: "4px", marginBottom: "20px" }}>
        Upload custom gear per spec, or change the shared encounter/debuffs everyone is simmed against.
        Resimming runs the sim engine right here in your browser and can take a little while - see the time
        estimate below before you start.
      </p>

      {presetsUnavailable && (
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", background: "#3a1f1f", border: "1px solid #6b2c2c", borderRadius: "6px", padding: "12px 16px", marginBottom: "20px", color: "#e0a0a0", fontSize: "13px" }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
          <span>
            Custom profiles and resimming aren't available in this preview - they need the preset gear/talent
            files and sim engine served from the deployed website, not this in-chat view. Everything else
            (optimizing and comparing with the built-in presets) works normally here.
          </span>
        </div>
      )}

      {resimError && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center", background: "#3a1f1f", border: "1px solid #6b2c2c", borderRadius: "6px", padding: "8px 12px", marginBottom: "16px", color: "#e0a0a0", fontSize: "12px" }}>
          <AlertTriangle size={14} /> {resimError}
        </div>
      )}

      {simProgress && (
        <div style={{ background: "#2a2410", border: "1px solid #c9962c", borderRadius: "6px", padding: "10px 16px", marginBottom: "20px", fontSize: "13px", color: "#f0c14b" }}>          Resimming {simProgress.specId}: {simProgress.current}/{simProgress.total} sims done...
        </div>
      )}

      <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>Encounter &amp; debuffs</h3>
      <p style={{ fontSize: "12px", color: "#999", marginTop: 0, marginBottom: "12px" }}>
        Shared across every profile, preset or custom, so results stay comparable to each other.
        Changing these requires resimming every profile currently in use - not just the one you're looking at.
      </p>

      {uploadError && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center", background: "#3a1f1f", border: "1px solid #6b2c2c", borderRadius: "6px", padding: "8px 12px", marginBottom: "12px", color: "#e0a0a0", fontSize: "12px" }}>
          <AlertTriangle size={14} /> {uploadError}
        </div>
      )}

      {settingsDirty && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center", background: "#2a2410", border: "1px solid #c9962c", borderRadius: "6px", padding: "10px 14px", marginBottom: "16px", color: "#f0c14b", fontSize: "12px" }}>
          <AlertTriangle size={14} />
          Some profiles may not reflect your latest settings or upload yet - click "apply &amp; resim all profiles" at the bottom to sync everything.
        </div>
      )}

      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "6px", padding: "14px 16px", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
          <h4 style={{ fontSize: "13px", fontWeight: 600, color: "#e8e8e8", margin: 0 }}>Boss encounter profile</h4>
          <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#c9962c", cursor: "pointer", border: "1px solid #444", borderRadius: "4px", padding: "4px 8px" }}>
            <Upload size={12} /> upload encounter JSON
            <input type="file" accept=".json" style={{ display: "none" }} onChange={(e) => e.target.files[0] && handleEncounterUpload(e.target.files[0])} />
          </label>
        </div>
        {draftEncounterOverride ? (
          <div style={{ fontSize: "12px", color: "#7ec1f0", display: "flex", alignItems: "center", gap: "8px" }}>
            using uploaded encounter ({draftEncounterOverride.targets.length} target{draftEncounterOverride.targets.length > 1 ? "s" : ""})
            <button onClick={() => { setDraftEncounterOverride(null); setSettingsDirty(true); }} style={{ background: "none", border: "1px solid #444", borderRadius: "4px", color: "#999", fontSize: "10px", padding: "2px 6px", cursor: "pointer" }}>clear, use fields instead</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <label style={{ fontSize: "12px", color: "#aaa", display: "flex", alignItems: "center", gap: "6px" }}>
              Fight duration (s):
              <input type="number" value={draftDuration} onChange={(e) => { setDraftDuration(Number(e.target.value)); setSettingsDirty(true); }} style={{ width: "70px", background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444", borderRadius: "4px", padding: "4px 6px", fontSize: "12px" }} />
            </label>
            <label style={{ fontSize: "12px", color: "#aaa", display: "flex", alignItems: "center", gap: "6px" }}>
              Target level:
              <input type="number" value={draftLevel} onChange={(e) => { setDraftLevel(Number(e.target.value)); setSettingsDirty(true); }} style={{ width: "60px", background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444", borderRadius: "4px", padding: "4px 6px", fontSize: "12px" }} />
            </label>
            <label style={{ fontSize: "12px", color: "#aaa", display: "flex", alignItems: "center", gap: "6px" }}>
              Target armor:
              <input type="number" value={draftArmor} onChange={(e) => { setDraftArmor(Number(e.target.value)); setSettingsDirty(true); }} style={{ width: "80px", background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444", borderRadius: "4px", padding: "4px 6px", fontSize: "12px" }} />
            </label>
            <label style={{ fontSize: "12px", color: "#aaa", display: "flex", alignItems: "center", gap: "6px" }}>
              Target type:
              <select value={draftMobType} onChange={(e) => { setDraftMobType(e.target.value); setSettingsDirty(true); }} style={{ background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444", borderRadius: "4px", padding: "4px 6px", fontSize: "12px" }}>
                {MOB_TYPES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "6px", padding: "14px 16px", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
          <h4 style={{ fontSize: "13px", fontWeight: 600, color: "#e8e8e8", margin: 0 }}>Raid debuffs</h4>
          <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#c9962c", cursor: "pointer", border: "1px solid #444", borderRadius: "4px", padding: "4px 8px" }}>
            <Upload size={12} /> upload debuffs JSON
            <input type="file" accept=".json" style={{ display: "none" }} onChange={(e) => e.target.files[0] && handleDebuffsUpload(e.target.files[0])} />
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px" }}>
          {DEBUFF_TOGGLES.map((d) => (
            <div key={d.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "#ccc" }}>{d.label}</span>
              {d.type === "bool" ? (
                <input
                  type="checkbox"
                  checked={!!draftDebuffs[d.key]}
                  onChange={(e) => { setDraftDebuffs((prev) => ({ ...prev, [d.key]: e.target.checked })); setSettingsDirty(true); }}
                />
              ) : (
                <select
                  value={draftDebuffs[d.key] || "TristateEffectMissing"}
                  onChange={(e) => { setDraftDebuffs((prev) => ({ ...prev, [d.key]: e.target.value })); setSettingsDirty(true); }}
                  style={{ background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444", borderRadius: "4px", padding: "3px 6px", fontSize: "11px" }}
                >
                  <option value="TristateEffectMissing">off</option>
                  <option value="TristateEffectRegular">regular</option>
                  <option value="TristateEffectImproved">improved</option>
                </select>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "6px", padding: "14px 16px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
          <h4 style={{ fontSize: "13px", fontWeight: 600, color: "#e8e8e8", margin: 0 }}>Raid buffs</h4>
          <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#c9962c", cursor: "pointer", border: "1px solid #444", borderRadius: "4px", padding: "4px 8px" }}>
            <Upload size={12} /> upload raid buffs JSON
            <input type="file" accept=".json" style={{ display: "none" }} onChange={(e) => e.target.files[0] && handleRaidBuffsUpload(e.target.files[0])} />
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px" }}>
          {RAID_BUFF_TOGGLES.map((b) => (
            <div key={b.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "#ccc" }}>{b.label}</span>
              {b.type === "bool" ? (
                <input
                  type="checkbox"
                  checked={!!draftRaidBuffs[b.key]}
                  onChange={(e) => { setDraftRaidBuffs((prev) => ({ ...prev, [b.key]: e.target.checked })); setSettingsDirty(true); }}
                />
              ) : (
                <select
                  value={draftRaidBuffs[b.key] || "TristateEffectMissing"}
                  onChange={(e) => { setDraftRaidBuffs((prev) => ({ ...prev, [b.key]: e.target.value })); setSettingsDirty(true); }}
                  style={{ background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444", borderRadius: "4px", padding: "3px 6px", fontSize: "11px" }}
                >
                  <option value="TristateEffectMissing">off</option>
                  <option value="TristateEffectRegular">regular</option>
                  <option value="TristateEffectImproved">improved</option>
                </select>
              )}
            </div>
          ))}
        </div>
      </div>

      <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>Custom profiles</h3>
      <p style={{ fontSize: "12px", color: "#999", marginTop: 0, marginBottom: "10px" }}>
        Add your raiders' real gear/talent exports here - each one gets its own personal DPS simmed, and the
        buffs it grants to the rest of the group are read automatically from its class and talents. Use the
        Preset specs elsewhere in this tool if you just want a generic buff bot.
      </p>
      <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#c9962c", cursor: "pointer", border: "1px solid #444", borderRadius: "4px", padding: "6px 12px", marginBottom: "12px" }}>
        <Upload size={13} />
        upload player JSON(s)
        <input
          type="file"
          accept=".json"
          multiple
          style={{ display: "none" }}
          onChange={(e) => e.target.files.length && handleContributorUpload(e.target.files)}
        />
      </label>
      {contributorError && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center", background: "#3a1f1f", border: "1px solid #6b2c2c", borderRadius: "6px", padding: "8px 12px", marginBottom: "12px", color: "#e0a0a0", fontSize: "12px" }}>
          <AlertTriangle size={14} /> {contributorError}
        </div>
      )}
      {settingsDirty && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center", background: "#2a2410", border: "1px solid #c9962c", borderRadius: "6px", padding: "8px 12px", marginBottom: "12px", color: "#f0c14b", fontSize: "12px" }}>
          <AlertTriangle size={14} />
          <span>Some profiles may not reflect your latest settings or upload yet - click apply & resim all profiles to sync everything.</span>
          <button
            onClick={() => document.getElementById("apply-resim-all-button")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            style={{ background: "none", border: "1px solid #c9962c", borderRadius: "4px", color: "#f0c14b", fontSize: "11px", padding: "3px 8px", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            go to apply button
          </button>
        </div>
      )}
      {buffContributors.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
          {buffContributors.map((c) => {
            const grants = [];
            if (c.capabilities.warrior) grants.push("Battle Shout");
            if (c.capabilities.ret) grants.push("Sanctity Aura");
            if (c.capabilities.feral) grants.push("Leader of the Pack");
            if (c.capabilities.fi > 0) grants.push("Ferocious Inspiration");
            if (c.capabilities.shaman === "enh") grants.push("Improved totems + Unleashed Rage");
            if (c.capabilities.shaman === "needs_totem_choice") grants.push(c.totemChoice ? `totems: ${c.totemChoice}` : "totems (pick which below)");
            return (
              <div key={c.id} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "6px", padding: "10px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <input
                      value={c.name}
                      onChange={(e) => renameContributor(c.id, e.target.value)}
                      style={{ background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444", borderRadius: "4px", padding: "4px 8px", fontSize: "12px", width: "140px" }}
                    />
                    <span style={{ fontSize: "11px", color: "#888" }}>{c.class.replace("Class", "")}</span>
                    {CLASSES_NEEDING_DROPDOWN.has(c.class) ? (
                      <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ fontSize: "11px", color: "#999" }}>Sim as:</span>
                        <select
                          value={c.simProfileChoice || ""}
                          onChange={(e) => setContributorSimProfile(c.id, e.target.value)}
                          disabled={simProgress?.specId === c.id}
                          style={{ background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444", borderRadius: "4px", padding: "3px 6px", fontSize: "11px" }}
                        >
                          {CLASS_TO_SPECS[c.class].map((specId) => {
                            const spec = SPEC_LIST.find((s) => s.id === specId);
                            return <option key={specId} value={specId}>{spec.label}</option>;
                          })}
                        </select>
                      </span>
                    ) : (CLASS_TO_SPECS[c.class] || []).length > 0 ? (
                      <span style={{ fontSize: "11px", color: "#999" }}>
                        will be simmed as {SPEC_LIST.find((s) => s.id === c.simProfileChoice)?.label}
                      </span>
                    ) : (
                      <span style={{ fontSize: "11px", color: "#777" }}>not simmed for personal dps yet</span>
                    )}
                    {simProgress?.specId === c.id && <span style={{ fontSize: "11px", color: "#c9962c" }}>resimming {simProgress.current}/{simProgress.total}...</span>}
                  </div>
                  <button onClick={() => removeBuffContributor(c.id)} style={{ background: "none", border: "1px solid #444", borderRadius: "4px", color: "#999", fontSize: "11px", padding: "4px 8px", cursor: "pointer" }}>
                    remove
                  </button>
                </div>
                <div style={{ fontSize: "11px", color: "#7ec1f0", marginTop: "6px" }}>
                  grants: {grants.length ? grants.join(", ") : "nothing this tool models (talents don't reach the modeled tier)"}
                </div>
                {c.capabilities.shaman === "needs_totem_choice" && (
                  <div style={{ marginTop: "6px" }}>
                    <select
                      value={c.totemChoice || ""}
                      onChange={(e) => setContributorTotemChoice(c.id, e.target.value || null)}
                      style={{ background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444", borderRadius: "4px", padding: "3px 6px", fontSize: "11px" }}
                    >
                      <option value="">pick totem(s)...</option>
                      <option value="restoA">strength + agility</option>
                      <option value="restoB">strength + windfury</option>
                    </select>
                  </div>
                )}
                {c.simProfileChoice && (
                  <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #2a2a2a" }}>
                    <div style={{ fontSize: "10px", color: "#777", marginBottom: "4px" }}>
                      blessings received (profile-specific - not everyone gets the same ones):
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", columnGap: "24px", rowGap: "4px" }}>
                      {BLESSING_TOGGLES.map((b) => (
                        <div key={b.key} style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "6px" }}>
                          <span style={{ fontSize: "11px", color: "#ccc" }}>{b.label}</span>
                          {b.type === "bool" ? (
                            <input
                              type="checkbox"
                              checked={!!c.blessings?.[b.key]}
                              onChange={(e) => setContributorBlessings(c.id, { ...c.blessings, [b.key]: e.target.checked })}
                            />
                          ) : (
                            <select
                              value={c.blessings?.[b.key] || "TristateEffectMissing"}
                              onChange={(e) => setContributorBlessings(c.id, { ...c.blessings, [b.key]: e.target.value })}
                              style={{ background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444", borderRadius: "4px", padding: "2px 4px", fontSize: "10px" }}
                            >
                              <option value="TristateEffectMissing">off</option>
                              <option value="TristateEffectRegular">regular</option>
                              <option value="TristateEffectImproved">improved</option>
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {c.capabilities.notes.length > 0 && (
                  <div style={{ fontSize: "10px", color: "#777", marginTop: "6px" }}>
                    {c.capabilities.notes.map((n, i) => <div key={i}>note: {n}</div>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {settingsDirty && buffContributors.length > 0 && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center", background: "#2a2410", border: "1px solid #c9962c", borderRadius: "6px", padding: "8px 12px", marginBottom: "16px", color: "#f0c14b", fontSize: "12px" }}>
          <AlertTriangle size={14} />
          <span>Some profiles may not reflect your latest settings or upload yet - click apply & resim all profiles to sync everything.</span>
          <button
            onClick={() => document.getElementById("apply-resim-all-button")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            style={{ background: "none", border: "1px solid #c9962c", borderRadius: "4px", color: "#f0c14b", fontSize: "11px", padding: "3px 8px", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            go to apply button
          </button>
        </div>
      )}


        <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "6px", padding: "12px 16px", marginBottom: "16px" }}>
        <label style={{ fontSize: "13px", color: "#aaa", display: "flex", alignItems: "center", gap: "8px" }}>
          Sim precision:
          <select value={precision} onChange={(e) => setPrecision(e.target.value)} style={{ background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444", borderRadius: "4px", padding: "4px 8px", fontSize: "13px" }}>
            {PRECISION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label} ({o.iterations} iterations)</option>
            ))}
          </select>
        </label>
        <div style={{ fontSize: "12px", color: "#777", marginTop: "6px" }}>
          ~{perProfileEstimate}s per profile at this precision ({TOTAL_SIM_JOBS} sims run per profile). Lower precision = faster but noisier results.
        </div>
        <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #333" }}>
          <div style={{ fontSize: "12px", color: "#aaa", marginBottom: "6px" }}>
            Presets to include in "apply &amp; resim all" (uncheck ones you're not using to speed it up):
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", columnGap: "16px", rowGap: "4px" }}>
            {SPEC_LIST.map((spec) => (
              <label key={spec.id} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#ccc", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={!excludedPresets.has(spec.id)}
                  onChange={() => togglePresetExcluded(spec.id)}
                />
                {spec.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          id="apply-resim-all-button"
          onClick={applySettingsAndResimAll}
          disabled={!settingsDirty || resimmingAll || !!simProgress || presetsUnavailable}
          style={{
            background: settingsDirty && !presetsUnavailable ? "#c9962c" : "#2a2a2a", color: settingsDirty && !presetsUnavailable ? "#1a1400" : "#666",
            border: "1px solid #c9962c", borderRadius: "6px", padding: "10px 16px", fontSize: "13px", fontWeight: 600,
            cursor: settingsDirty && !presetsUnavailable ? "pointer" : "not-allowed",
          }}
        >
          {resimmingAll ? "resimming everything..." : `apply & resim all profiles (~${Math.round(perProfileEstimate * (SPEC_LIST.length - excludedPresets.size + buffContributors.filter((c) => c.simProfileChoice).length) / 60)} min total)`}
        </button>
        {!settingsAreDefault && (
          <button onClick={revertSettings} style={{ background: "none", color: "#999", border: "1px solid #444", borderRadius: "6px", padding: "10px 16px", fontSize: "13px", cursor: "pointer" }}>
            reset to default settings
          </button>
        )}
      </div>
    </div>
  );
}
