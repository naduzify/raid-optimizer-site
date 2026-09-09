import { useState, useMemo } from "react";
import { Swords, Trophy, AlertTriangle } from "lucide-react";

const FACTORS = {"fury_warrior": {"base": 1575.7, "bshout": 1.00123, "sanc": 1.02179, "lotp": 1.05954, "enh": 1.26874, "restoA": 1.07167, "restoB": 1.14263, "fi": [1.0, 1.03299, 1.06448, 1.09751, 1.1353, 1.16826]}, "kebab_warrior": {"base": 1267.4, "bshout": 1.00352, "sanc": 1.02389, "lotp": 1.05704, "enh": 1.25822, "restoA": 1.06597, "restoB": 1.14561, "fi": [1.0, 1.03471, 1.06892, 1.10124, 1.13331, 1.16672]}, "arms2h_warrior": {"base": 1451.3, "bshout": 1.00724, "sanc": 1.02072, "lotp": 1.04864, "enh": 1.271, "restoA": 1.06144, "restoB": 1.16101, "fi": [1.0, 1.03181, 1.07029, 1.10426, 1.14069, 1.1739]}, "bm_hunter": {"base": 2572.4, "bshout": 1.04643, "sanc": 1.01975, "lotp": 1.0502, "enh": 1.09662, "restoA": 1.05077, "restoB": 1.03132, "fi": [1.0, 1.02963, 1.05925, 1.08888, 1.11851, 1.14813]}, "survival_hunter": {"base": 2189.0, "bshout": 1.03262, "sanc": 1.01976, "lotp": 1.04876, "enh": 1.09993, "restoA": 1.04869, "restoB": 1.03222, "fi": [1.0, 1.02964, 1.05928, 1.08892, 1.11856, 1.1482]}, "rogue": {"base": 1542.5, "bshout": 1.07879, "sanc": 1.01967, "lotp": 1.03906, "enh": 1.2111, "restoA": 1.04926, "restoB": 1.10672, "fi": [1.0, 1.0295, 1.059, 1.08851, 1.11801, 1.14751]}, "enhance_shaman": {"base": 2000.9, "bshout": 1.07261, "sanc": 1.01756, "lotp": 1.03495, "enh": 1.00307, "restoA": 1.00207, "restoB": 0.99986, "fi": [1.0, 1.02634, 1.05269, 1.07903, 1.10538, 1.13172]}, "feral_tank": {"base": 836.6, "bshout": 1.07989, "sanc": 1.02012, "lotp": 1.0, "enh": 1.1386, "restoA": 1.06324, "restoB": 1.03916, "fi": [1.0, 1.02814, 1.05771, 1.09023, 1.11959, 1.15034]}, "feral_dps": {"base": 1941.5, "bshout": 1.05715, "sanc": 1.01975, "lotp": 1.0, "enh": 1.1317, "restoA": 1.06234, "restoB": 1.02944, "fi": [1.0, 1.02963, 1.05926, 1.08889, 1.11852, 1.14815]}, "ret_paladin": {"base": 1368.8, "bshout": 1.07332, "sanc": 1.0, "lotp": 1.04001, "enh": 1.33067, "restoA": 1.06323, "restoB": 1.21993, "fi": [1.0, 1.02989, 1.05978, 1.08967, 1.11956, 1.14945]}};

const SPEC_LIST = [
  { id: "fury_warrior", label: "Fury warrior", cat: "warrior", multi: true },
  { id: "kebab_warrior", label: "Kebab warrior", cat: "warrior", multi: false },
  { id: "arms2h_warrior", label: "2H arms warrior", cat: "warrior", multi: false },
  { id: "bm_hunter", label: "BM hunter", cat: "bm", multi: true },
  { id: "survival_hunter", label: "Survival hunter", cat: "sv", multi: false },
  { id: "rogue", label: "Rogue", cat: "rogue", multi: true },
  { id: "enhance_shaman", label: "Enhance shaman", cat: "shaman", multi: false },
  { id: "feral_tank", label: "Feral tank", cat: "feral", multi: false },
  { id: "feral_dps", label: "Feral dps", cat: "feral", multi: false },
  { id: "ret_paladin", label: "Ret paladin", cat: "ret", multi: false },
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
  mult *= f.fi[Math.min(state.fi, 5)];
  return mult;
}

function evaluateGroup(counts, restoOn, restoVariant) {
  const state = {
    warrior: counts.fury_warrior + counts.kebab_warrior + counts.arms2h_warrior > 0,
    ret: counts.ret_paladin > 0,
    feral: counts.feral_tank + counts.feral_dps > 0,
    fi: counts.bm_hunter,
    shaman: counts.enhance_shaman > 0 ? "enh" : restoOn ? restoVariant : null,
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

// best way to fill a group's remaining open slots given what's already fixed in it
function bestFill(lockedCounts, restoOnLocked, remaining, excludeHunters) {
  const lockedWarrior = lockedCounts.fury_warrior + lockedCounts.kebab_warrior + lockedCounts.arms2h_warrior > 0;
  const lockedFeral = lockedCounts.feral_tank + lockedCounts.feral_dps > 0;
  const lockedShaman = lockedCounts.enhance_shaman > 0 || restoOnLocked;

  const fills = [];
  function recurse(slotsLeft, addCounts, warriorUsed, feralUsed, shamanUsed, restoUsed) {
    if (slotsLeft === 0) {
      fills.push({ addCounts: { ...addCounts }, restoOn: restoUsed });
      return;
    }
    for (const spec of SPEC_LIST) {
      const isWarrior = spec.cat === "warrior";
      const isFeral = spec.cat === "feral";
      const isShaman = spec.id === "enhance_shaman";
      const isHunter = spec.id === "bm_hunter" || spec.id === "survival_hunter";
      if (excludeHunters && isHunter) continue;
      if (isWarrior && lockedWarrior) continue;
      if (isWarrior && warriorUsed && warriorUsed !== spec.id) continue;
      if (isFeral && lockedFeral) continue;
      if (isFeral && feralUsed && feralUsed !== spec.id) continue;
      if (isShaman && (lockedShaman || shamanUsed === "resto")) continue;
      if (!spec.multi) {
        const already = (addCounts[spec.id] || 0) + lockedCounts[spec.id];
        if (already >= 1) continue;
      }
      addCounts[spec.id] = (addCounts[spec.id] || 0) + 1;
      recurse(slotsLeft - 1, addCounts, isWarrior ? spec.id : warriorUsed, isFeral ? spec.id : feralUsed, isShaman ? "enh" : shamanUsed, restoUsed);
      addCounts[spec.id] -= 1;
      if (addCounts[spec.id] === 0) delete addCounts[spec.id];
    }
    if (!lockedShaman && shamanUsed !== "enh" && !restoUsed) {
      recurse(slotsLeft - 1, addCounts, warriorUsed, feralUsed, shamanUsed, true);
    }
  }
  recurse(remaining, {}, null, null, null, false);

  let best = null;
  for (const fill of fills) {
    for (const restoVariant of ["restoA", "restoB"]) {
      const finalCounts = { ...lockedCounts };
      for (const k in fill.addCounts) finalCounts[k] = (finalCounts[k] || 0) + fill.addCounts[k];
      const totalRestoOn = restoOnLocked || fill.restoOn;
      if (!totalRestoOn && restoVariant === "restoB") continue;
      const evalResult = evaluateGroup(finalCounts, totalRestoOn, restoVariant);
      if (!best || evalResult.total > best.total) {
        best = { finalCounts, restoOn: totalRestoOn, restoVariant, ...evalResult };
      }
    }
  }
  return best;
}

// evaluate a group using ONLY the locked units already placed - no filling of empty slots
function evaluateLockedOnly(lockedCounts, restoOnLocked, objective) {
  let best = null;
  for (const restoVariant of ["restoA", "restoB"]) {
    if (!restoOnLocked && restoVariant === "restoB") continue;
    const evalResult = evaluateGroup(lockedCounts, restoOnLocked, restoVariant);
    const score =
      objective === "total" ? evalResult.total :
      objective === "avg_pct" ? evalResult.pctSum :
      evalResult.breakdown.find((b) => b.id === objective)?.dpsEach ?? -1;
    if (!best || score > best.score) {
      best = { finalCounts: lockedCounts, restoOn: restoOnLocked, restoVariant, ...evalResult, score };
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
      const isMulti = id === "fury_warrior" || id === "bm_hunter" || id === "rogue";
      const maxN = isMulti ? Math.min(remaining[id], caps[g]) : Math.min(1, remaining[id], caps[g]);
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
  ["fury_warrior", "kebab_warrior", "arms2h_warrior"],
  ["feral_tank", "feral_dps"],
  ["enhance_shaman", "resto_shaman"],
  ["bm_hunter"],
  ["rogue"],
  ["survival_hunter"],
  ["ret_paladin"],
];

function allocateRaid(pool, numGroups, objective) {  const MAX_STATES = 4000;
  let states = [{
    perGroupCounts: Array.from({ length: numGroups }, () => Object.fromEntries(SPEC_LIST.map((s) => [s.id, 0]))),
    perGroupResto: Array(numGroups).fill(false),
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
          if (entry.id === "resto_shaman") perGroupResto[g] = true;
          else perGroupCounts[g][entry.id] += entry.n;
        });
        nextStates.push({ perGroupCounts, perGroupResto, caps: p.caps });
      }
    }
    states = nextStates;
    if (states.length === 0) return null;
    if (states.length > MAX_STATES) states = states.slice(0, MAX_STATES);
  }

  const scored = [];
  for (const st of states) {
    const groupResults = [];
    let feasible = true;
    for (let g = 0; g < numGroups; g++) {
      const fill = evaluateLockedOnly(st.perGroupCounts[g], st.perGroupResto[g], objective);
      if (!fill) { feasible = false; break; }
      groupResults.push({ ...fill, lockedCounts: st.perGroupCounts[g], lockedResto: st.perGroupResto[g], remaining: st.caps[g] });
    }
    if (!feasible) continue;
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
      .map((r) => JSON.stringify(r.finalCounts) + r.restoOn + r.restoVariant)
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

export default function RaidCompOptimizer() {
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
    return top.groupResults.map((r) => bestFill(r.lockedCounts, r.lockedResto, r.remaining, excludeHunters));
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
                      const totemLabel = r.restoOn ? (r.restoVariant === "restoA" ? "strength + agility totems" : "strength + windfury totems") : null;
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
                const addedResto = fill.restoOn && !r.lockedResto;
                const nothingToAdd = extras.length === 0 && !addedResto;
                const totemLabel = fill.restoOn ? (fill.restoVariant === "restoA" ? "strength + agility totems" : "strength + windfury totems") : null;
                return (
                  <div key={i} style={{ background: "#181818", border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "10px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                      <span style={{ color: colors.text, fontWeight: 600, fontSize: "13px" }}>Group {i + 1}</span>
                      <span style={{ fontSize: "12px", color: "#ccc" }}>
                        {nothingToAdd
                          ? "already complete"
                          : [
                              ...extras.map((s) => `${fill.finalCounts[s.id] - (r.lockedCounts[s.id] || 0)}x ${s.label}`),
                              ...(addedResto ? ["1x resto shaman"] : []),
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

