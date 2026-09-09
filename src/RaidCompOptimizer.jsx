import { useState, useMemo } from "react";
import { Swords, Trophy, AlertTriangle } from "lucide-react";

const FACTORS = {"fury_warrior": {"base": 1485.8, "bshout": 1.00123, "sanc": 1.02179, "lotp": 1.05954, "enh": 1.27491, "restoA": 1.07431, "restoB": 1.14263, "restoAB": 1.17697, "fi": [1.0, 1.03299, 1.06448, 1.09751, 1.1353, 1.16826], "ewCoef": 5.9113e-05}, "kebab_warrior": {"base": 1199.5, "bshout": 1.00352, "sanc": 1.02389, "lotp": 1.05704, "enh": 1.26015, "restoA": 1.0693, "restoB": 1.14561, "restoAB": 1.17506, "fi": [1.0, 1.03471, 1.06892, 1.10124, 1.13331, 1.16672], "ewCoef": 5.728e-05}, "arms2h_warrior": {"base": 1371.2, "bshout": 1.00724, "sanc": 1.02072, "lotp": 1.04864, "enh": 1.27558, "restoA": 1.0644, "restoB": 1.16101, "restoAB": 1.18973, "fi": [1.0, 1.03181, 1.07029, 1.10426, 1.14069, 1.1739], "ewCoef": 5.443e-05}, "bm_hunter": {"base": 2413.6, "bshout": 1.04643, "sanc": 1.01975, "lotp": 1.0502, "enh": 1.10147, "restoA": 1.0549, "restoB": 1.03132, "restoAB": 1.06796, "fi": [1.0, 1.02963, 1.05925, 1.08888, 1.11851, 1.14813], "ewCoef": 6.3715e-05}, "survival_hunter": {"base": 2189.0, "bshout": 1.03262, "sanc": 1.01976, "lotp": 1.04876, "enh": 1.09993, "restoA": 1.04869, "restoB": 1.03222, "restoAB": 1.0702, "fi": [1.0, 1.02964, 1.05928, 1.08892, 1.11856, 1.1482], "ewCoef": 0.0}, "rogue": {"base": 1459.6, "bshout": 1.07879, "sanc": 1.01967, "lotp": 1.03906, "enh": 1.21558, "restoA": 1.05283, "restoB": 1.10672, "restoAB": 1.14311, "fi": [1.0, 1.0295, 1.059, 1.08851, 1.11801, 1.14751], "ewCoef": 5.4976e-05}, "enhance_shaman": {"base": 1906.3, "bshout": 1.07261, "sanc": 1.01756, "lotp": 1.03495, "enh": 1.00674, "restoA": 1.00524, "restoB": 0.99986, "restoAB": 1.00514, "fi": [1.0, 1.02634, 1.05269, 1.07903, 1.10538, 1.13172], "ewCoef": 4.8003e-05}, "feral_tank": {"base": 791.6, "bshout": 1.07989, "sanc": 1.02012, "lotp": 1.0, "enh": 1.14207, "restoA": 1.06835, "restoB": 1.03916, "restoAB": 1.06835, "fi": [1.0, 1.02814, 1.05771, 1.09023, 1.11959, 1.15034], "ewCoef": 5.44e-05}, "feral_dps": {"base": 1872.7, "bshout": 1.05715, "sanc": 1.01975, "lotp": 1.0, "enh": 1.13445, "restoA": 1.06471, "restoB": 1.02944, "restoAB": 1.06471, "fi": [1.0, 1.02963, 1.05926, 1.08889, 1.11852, 1.14815], "ewCoef": 3.5622e-05}, "ret_paladin": {"base": 1302.7, "bshout": 1.07332, "sanc": 1.0, "lotp": 1.04001, "enh": 1.33521, "restoA": 1.06657, "restoB": 1.21993, "restoAB": 1.25147, "fi": [1.0, 1.02989, 1.05978, 1.08967, 1.11956, 1.14945], "ewCoef": 4.8996e-05}};

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

function buffMultiplier(specId, state) {
  const f = FACTORS[specId];
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
function evaluateGroup(counts, restoAgi, restoWf, ewState) {
  const state = {
    warrior: counts.fury_warrior + counts.kebab_warrior + counts.arms2h_warrior > 0,
    ret: counts.ret_paladin > 0,
    feral: counts.feral_tank + counts.feral_dps > 0,
    fi: counts.bm_hunter,
    shaman: resolveShamanState(counts.enhance_shaman, restoAgi, restoWf),
    ew: ewState || null,
  };
  let total = 0;
  let pctSum = 0; // sum of each individual player's (dps/base - 1), for the "average % gain" objective
  const breakdown = [];
  for (const spec of SPEC_LIST) {
    const n = counts[spec.id];
    if (n > 0) {
      const mult = buffMultiplier(spec.id, state);
      const dps = FACTORS[spec.id].base * mult;
      total += dps * n;
      pctSum += (mult - 1) * n;
      breakdown.push({ id: spec.id, label: spec.label, count: n, dpsEach: dps, pctEach: mult - 1 });
    }
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
function bestFill(lockedCounts, restoCountLocked, remaining, excludeHunters, ewOverride) {
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
      const evalResult = evaluateGroup(finalCounts, v.a, v.w, ewOverride);
      if (!best || evalResult.total > best.total) {
        best = { finalCounts, restoCount: totalResto, restoVariant: v.label, ...evalResult };
      }
    }
  }
  return best;
}

// evaluate a group using ONLY the locked units already placed - no filling of empty slots
function evaluateLockedOnly(lockedCounts, restoCountLocked, objective, ewOverride) {
  let best = null;
  for (const v of restoVariantsFor(restoCountLocked)) {
    const evalResult = evaluateGroup(lockedCounts, v.a, v.w, ewOverride);
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

function allocateRaid(pool, numGroups, objective) {  const MAX_STATES = 4000;
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
        const ev = evaluateGroup(r.finalCounts, a, w, ewState);
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
      const fill = evaluateLockedOnly(st.perGroupCounts[g], st.perGroupResto[g], objective, null);
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

export default function RaidCompOptimizer() {
  const [mode, setMode] = useState("optimize");
  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <button
          onClick={() => setMode("optimize")}
          style={{
            flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid " + (mode === "optimize" ? "#c9962c" : "#333"),
            background: mode === "optimize" ? "#2a2410" : "#181818", color: mode === "optimize" ? "#f0c14b" : "#999",
            fontSize: "13px", fontWeight: 600, cursor: "pointer",
          }}
        >
          Optimize from pool
        </button>
        <button
          onClick={() => setMode("manual")}
          style={{
            flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid " + (mode === "manual" ? "#c9962c" : "#333"),
            background: mode === "manual" ? "#2a2410" : "#181818", color: mode === "manual" ? "#f0c14b" : "#999",
            fontSize: "13px", fontWeight: 600, cursor: "pointer",
          }}
        >
          Build &amp; compare manually
        </button>
      </div>
      {mode === "optimize" ? <OptimizerMode /> : <ManualBuilder />}
    </div>
  );
}

// ---------- Manual builder mode: freely assign each slot, compare instantly ----------

const SLOT_OPTIONS = [
  { value: "empty", label: "(empty)" },
  ...SPEC_LIST.map((s) => ({ value: s.id, label: s.label })),
  { value: "resto_a", label: "Resto shaman (str+agi)" },
  { value: "resto_b", label: "Resto shaman (str+wf)" },
];

function slotsToCounts(slots) {
  const counts = Object.fromEntries(SPEC_LIST.map((s) => [s.id, 0]));
  let restoAgi = 0, restoWf = 0;
  for (const v of slots) {
    if (v === "empty") continue;
    if (v === "resto_a") restoAgi += 1;
    else if (v === "resto_b") restoWf += 1;
    else counts[v] += 1;
  }
  return { counts, restoAgi, restoWf };
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

function evalSlots(slots, ewOverride) {
  const { counts, restoAgi, restoWf } = slotsToCounts(slots);
  return evaluateGroup(counts, restoAgi, restoWf, ewOverride);
}

function ManualBuilder() {
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

  const groupEvals = groupSlots.map((slots) => evalSlots(slots, ewOverride));
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
                  const withoutTotal = evalSlots(withoutSlots, ewOverride).total;
                  const marginal = evalResult.total - withoutTotal;
                  const specMeta = SPEC_LIST.find((s) => s.id === val);
                  const personalDps = specMeta ? evalResult.breakdown.find((b) => b.id === val)?.dpsEach : null;
                  return (
                    <div key={sIdx} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "6px", padding: "10px 12px" }}>
                      <select
                        value={val}
                        onChange={(e) => setSlot(gIdx, sIdx, e.target.value)}
                        style={{ width: "100%", background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444", borderRadius: "4px", padding: "5px 6px", fontSize: "12px", marginBottom: "8px" }}
                      >
                        {SLOT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
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
    return allocateRaid(pool, committed.numGroups, committed.objective);
  }, [committed]);

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
    return top.groupResults.map((r) => bestFill(r.lockedCounts, r.lockedResto, r.remaining, excludeHunters, raidWideEW));
  }, [top, excludeHunters]);

  return (
    <div style={{ background: "#121212", color: "#e8e8e8", padding: "24px", borderRadius: "8px", fontFamily: "system-ui, sans-serif", maxWidth: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
        <Swords size={22} color="#c9962c" />
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600, color: "#f0c14b" }}>Raid comp optimizer</h2>
      </div>
      <p style={{ color: "#999", fontSize: "13px", marginTop: "4px", marginBottom: "18px" }}>
        Enter every player you have available, then press compute to split them across your groups.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px", marginBottom: "16px" }}>
        {SPEC_LIST.map((spec) => (
          <div key={spec.id} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "6px", padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px" }}>{spec.label}</span>
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

