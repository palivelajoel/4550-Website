import { useState, useEffect, useRef } from "react";
import { FONTS, C, sbFetch, isAuthed, canEditHub, HubHeader, toastStyle, inputStyle, selectStyle, overlayStyle, addBtnStyle, ghostBtn, dangerBtn } from "./hubUtils.jsx";

// ─────────────────────────────────────────────────────────
// REEFSCAPE 2025 game constants
// ─────────────────────────────────────────────────────────
const CORAL_LEVELS = ["L1", "L2", "L3", "L4"];
const ALGAE_TYPES = ["Processor", "Net"];
const ENDGAME_OPTIONS = ["None", "Park", "Shallow Cage", "Deep Cage"];
const ALLIANCE_OPTIONS = ["Red", "Blue"];
const DRIVE_TYPES = ["Swerve", "Tank", "Mecanum", "West Coast", "Other"];
const CLIMB_TYPES = ["None", "Park", "Shallow", "Deep", "Both"];

// Points for REEFSCAPE
const POINTS = {
  auto_coral_l1: 3, auto_coral_l2: 4, auto_coral_l3: 6, auto_coral_l4: 7,
  auto_algae_processor: 6, auto_algae_net: 4,
  teleop_coral_l1: 2, teleop_coral_l2: 3, teleop_coral_l3: 4, teleop_coral_l4: 5,
  teleop_algae_processor: 6, teleop_algae_net: 4,
  endgame_park: 2, endgame_shallow: 6, endgame_deep: 12,
  auto_leave: 3,
};

function calcScore(entry) {
  if (!entry) return 0;
  let score = 0;
  if (entry.auto_leave) score += POINTS.auto_leave;
  CORAL_LEVELS.forEach(l => {
    score += (entry[`auto_coral_${l.toLowerCase()}`] || 0) * POINTS[`auto_coral_${l.toLowerCase()}`];
    score += (entry[`teleop_coral_${l.toLowerCase()}`] || 0) * POINTS[`teleop_coral_${l.toLowerCase()}`];
  });
  score += (entry.auto_algae_processor || 0) * POINTS.auto_algae_processor;
  score += (entry.auto_algae_net || 0) * POINTS.auto_algae_net;
  score += (entry.teleop_algae_processor || 0) * POINTS.teleop_algae_processor;
  score += (entry.teleop_algae_net || 0) * POINTS.teleop_algae_net;
  if (entry.endgame === "Park") score += POINTS.endgame_park;
  if (entry.endgame === "Shallow Cage") score += POINTS.endgame_shallow;
  if (entry.endgame === "Deep Cage") score += POINTS.endgame_deep;
  return score;
}

// ─────────────────────────────────────────────────────────
// DB helpers — wraps sbFetch for scouting tables
// ─────────────────────────────────────────────────────────
async function fetchMatches() {
  return await sbFetch("scouting_matches?select=*&order=created_at.desc") || [];
}
async function fetchPits() {
  return await sbFetch("scouting_pits?select=*&order=team_number.asc") || [];
}
async function fetchPicklist() {
  return await sbFetch("scouting_picklist?select=*&order=rank.asc") || [];
}

// ─────────────────────────────────────────────────────────
// Shared counter widget
// ─────────────────────────────────────────────────────────
function Counter({ value, onChange, label, color = C.red, mini = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: mini ? 4 : 8, userSelect: "none" }}>
      {label && <span style={{ fontSize: mini ? 10 : 12, color: C.dim, fontFamily: "monospace", minWidth: mini ? 60 : 90 }}>{label}</span>}
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        style={{ width: mini ? 24 : 32, height: mini ? 24 : 32, borderRadius: 6, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.05)", color: C.muted, cursor: "pointer", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      >−</button>
      <div style={{ width: mini ? 28 : 36, textAlign: "center", fontFamily: "'Orbitron', sans-serif", fontSize: mini ? 14 : 18, fontWeight: 700, color }}>{value}</div>
      <button
        onClick={() => onChange(value + 1)}
        style={{ width: mini ? 24 : 32, height: mini ? 24 : 32, borderRadius: 6, border: `1px solid ${color}66`, background: `${color}18`, color, cursor: "pointer", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      >+</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Toggle pill
// ─────────────────────────────────────────────────────────
function Toggle({ value, onChange, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => onChange(!value)}>
      <div style={{ width: 40, height: 22, borderRadius: 11, background: value ? C.green : "rgba(255,255,255,0.08)", border: `1px solid ${value ? C.green : C.border}`, position: "relative", transition: "all 0.2s", flexShrink: 0 }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: value ? "#fff" : C.dim, position: "absolute", top: 2, left: value ? 20 : 2, transition: "left 0.2s" }} />
      </div>
      <span style={{ fontSize: 12, color: value ? C.text : C.muted, fontFamily: "monospace" }}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Section header
// ─────────────────────────────────────────────────────────
function SectionHead({ label, color = C.red }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, marginTop: 20 }}>
      <div style={{ width: 3, height: 16, borderRadius: 2, background: color }} />
      <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2, color }}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MATCH SCOUT TAB
// ─────────────────────────────────────────────────────────
const EMPTY_MATCH = {
  team_number: "", match_number: "", alliance: "Red", scouter_name: "",
  auto_leave: false,
  auto_coral_l1: 0, auto_coral_l2: 0, auto_coral_l3: 0, auto_coral_l4: 0,
  auto_algae_processor: 0, auto_algae_net: 0,
  teleop_coral_l1: 0, teleop_coral_l2: 0, teleop_coral_l3: 0, teleop_coral_l4: 0,
  teleop_algae_processor: 0, teleop_algae_net: 0,
  endgame: "None",
  defense: false, defended: false, died: false,
  notes: "",
};

function MatchScout({ onSubmit, username }) {
  const [form, setForm] = useState({ ...EMPTY_MATCH, scouter_name: username || "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const score = calcScore(form);

  async function submit() {
    if (!form.team_number || !form.match_number) return;
    setSaving(true);
    await sbFetch("scouting_matches", { method: "POST", body: JSON.stringify({ ...form, team_number: parseInt(form.team_number), match_number: parseInt(form.match_number) }) });
    setSaving(false);
    setForm({ ...EMPTY_MATCH, scouter_name: form.scouter_name });
    onSubmit?.();
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      {/* Match info */}
      <SectionHead label="MATCH INFO" color={C.red} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", marginBottom: 4 }}>TEAM #</div>
          <input type="number" placeholder="4550" value={form.team_number} onChange={e => set("team_number", e.target.value)} style={{ ...inputStyle, textAlign: "center", fontFamily: "'Orbitron', sans-serif", fontSize: 18, fontWeight: 700 }} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", marginBottom: 4 }}>MATCH #</div>
          <input type="number" placeholder="1" value={form.match_number} onChange={e => set("match_number", e.target.value)} style={{ ...inputStyle, textAlign: "center", fontFamily: "'Orbitron', sans-serif", fontSize: 18, fontWeight: 700 }} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", marginBottom: 4 }}>ALLIANCE</div>
          <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.border}` }}>
            {ALLIANCE_OPTIONS.map(a => (
              <button key={a} onClick={() => set("alliance", a)} style={{ flex: 1, padding: "9px 4px", border: "none", cursor: "pointer", fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, background: form.alliance === a ? (a === "Red" ? "rgba(239,68,68,0.4)" : "rgba(59,130,246,0.4)") : "rgba(255,255,255,0.03)", color: form.alliance === a ? (a === "Red" ? "#fca5a5" : "#93c5fd") : C.dim }}>
                {a.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", marginBottom: 4 }}>SCOUTER</div>
          <input placeholder="Your name" value={form.scouter_name} onChange={e => set("scouter_name", e.target.value)} style={{ ...inputStyle }} />
        </div>
      </div>

      {/* AUTO */}
      <SectionHead label="AUTONOMOUS (0-15s)" color={C.amber} />
      <div style={{ background: "rgba(245,158,11,0.06)", border: `1px solid rgba(245,158,11,0.2)`, borderRadius: 10, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        <Toggle value={form.auto_leave} onChange={v => set("auto_leave", v)} label="Left Starting Zone (+3 pts)" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: C.amber, fontFamily: "monospace", marginBottom: 8 }}>CORAL SCORED</div>
            {CORAL_LEVELS.map(l => (
              <div key={l} style={{ marginBottom: 8 }}>
                <Counter value={form[`auto_coral_${l.toLowerCase()}`]} onChange={v => set(`auto_coral_${l.toLowerCase()}`, v)} label={`${l} (+${POINTS[`auto_coral_${l.toLowerCase()}`]})`} color={C.amber} />
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.amber, fontFamily: "monospace", marginBottom: 8 }}>ALGAE SCORED</div>
            <div style={{ marginBottom: 8 }}>
              <Counter value={form.auto_algae_processor} onChange={v => set("auto_algae_processor", v)} label={`Processor (+${POINTS.auto_algae_processor})`} color={C.amber} />
            </div>
            <Counter value={form.auto_algae_net} onChange={v => set("auto_algae_net", v)} label={`Net (+${POINTS.auto_algae_net})`} color={C.amber} />
          </div>
        </div>
      </div>

      {/* TELEOP */}
      <SectionHead label="TELEOP (15s-2:15)" color={C.blue} />
      <div style={{ background: "rgba(59,130,246,0.06)", border: `1px solid rgba(59,130,246,0.2)`, borderRadius: 10, padding: "16px 18px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: C.blue, fontFamily: "monospace", marginBottom: 8 }}>CORAL SCORED</div>
            {CORAL_LEVELS.map(l => (
              <div key={l} style={{ marginBottom: 8 }}>
                <Counter value={form[`teleop_coral_${l.toLowerCase()}`]} onChange={v => set(`teleop_coral_${l.toLowerCase()}`, v)} label={`${l} (+${POINTS[`teleop_coral_${l.toLowerCase()}`]})`} color={C.blue} />
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.blue, fontFamily: "monospace", marginBottom: 8 }}>ALGAE SCORED</div>
            <div style={{ marginBottom: 8 }}>
              <Counter value={form.teleop_algae_processor} onChange={v => set("teleop_algae_processor", v)} label={`Processor (+${POINTS.teleop_algae_processor})`} color={C.blue} />
            </div>
            <Counter value={form.teleop_algae_net} onChange={v => set("teleop_algae_net", v)} label={`Net (+${POINTS.teleop_algae_net})`} color={C.blue} />
          </div>
        </div>
      </div>

      {/* ENDGAME */}
      <SectionHead label="ENDGAME" color={C.purple} />
      <div style={{ background: "rgba(168,85,247,0.06)", border: `1px solid rgba(168,85,247,0.2)`, borderRadius: 10, padding: "16px 18px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {ENDGAME_OPTIONS.map(opt => {
            const pts = opt === "Park" ? 2 : opt === "Shallow Cage" ? 6 : opt === "Deep Cage" ? 12 : 0;
            return (
              <button key={opt} onClick={() => set("endgame", opt)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${form.endgame === opt ? C.purple : C.border}`, background: form.endgame === opt ? "rgba(168,85,247,0.25)" : "rgba(255,255,255,0.03)", color: form.endgame === opt ? "#c084fc" : C.muted, cursor: "pointer", fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                {opt}{pts > 0 ? ` (+${pts})` : ""}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Toggle value={form.defense} onChange={v => set("defense", v)} label="Played Defense" />
          <Toggle value={form.defended} onChange={v => set("defended", v)} label="Was Defended" />
          <Toggle value={form.died} onChange={v => set("died", v)} label="Robot Broke/Died" />
        </div>
      </div>

      {/* NOTES + SCORE */}
      <SectionHead label="NOTES" color={C.dim} />
      <textarea placeholder="Observations, driver skill, strategy notes..." value={form.notes} onChange={e => set("notes", e.target.value)} style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} />

      {/* Score preview + submit */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", letterSpacing: 2 }}>EST. SCORE</div>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 28, fontWeight: 900, color: C.red }}>{score}</div>
        </div>
        <button onClick={submit} disabled={saving || !form.team_number || !form.match_number} style={{ ...addBtnStyle, padding: "12px 32px", fontSize: 14, fontFamily: "'Orbitron', sans-serif", letterSpacing: 2, opacity: (!form.team_number || !form.match_number) ? 0.5 : 1 }}>
          {saving ? "SUBMITTING..." : "SUBMIT MATCH →"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PIT SCOUT TAB
// ─────────────────────────────────────────────────────────
const EMPTY_PIT = {
  team_number: "", team_name: "", drivetrain: "Swerve",
  weight_lbs: "", auto_capabilities: "", teleop_capabilities: "",
  climb_type: "None", notes: "", scouter_name: "",
  can_score_l1: false, can_score_l2: false, can_score_l3: false, can_score_l4: false,
  can_score_processor: false, can_score_net: false,
};

function PitScout({ onSubmit, username }) {
  const [form, setForm] = useState({ ...EMPTY_PIT, scouter_name: username || "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.team_number) return;
    setSaving(true);
    await sbFetch("scouting_pits", { method: "POST", body: JSON.stringify({ ...form, team_number: parseInt(form.team_number) }) });
    setSaving(false);
    setForm({ ...EMPTY_PIT, scouter_name: form.scouter_name });
    onSubmit?.();
  }

  const capBox = (key, label) => (
    <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: form[key] ? C.text : C.muted, fontFamily: "monospace" }}>
      <div onClick={() => set(key, !form[key])} style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${form[key] ? C.green : C.border}`, background: form[key] ? C.green : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        {form[key] && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
      </div>
      {label}
    </label>
  );

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <SectionHead label="TEAM INFO" color={C.blue} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", marginBottom: 4 }}>TEAM #</div>
          <input type="number" placeholder="4550" value={form.team_number} onChange={e => set("team_number", e.target.value)} style={{ ...inputStyle, fontFamily: "'Orbitron', sans-serif", fontSize: 18, fontWeight: 700 }} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", marginBottom: 4 }}>TEAM NAME</div>
          <input placeholder="Team name" value={form.team_name} onChange={e => set("team_name", e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", marginBottom: 4 }}>DRIVETRAIN</div>
          <select value={form.drivetrain} onChange={e => set("drivetrain", e.target.value)} style={selectStyle}>
            {DRIVE_TYPES.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", marginBottom: 4 }}>WEIGHT (lbs)</div>
          <input type="number" placeholder="125" value={form.weight_lbs} onChange={e => set("weight_lbs", e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", marginBottom: 4 }}>CLIMB TYPE</div>
          <select value={form.climb_type} onChange={e => set("climb_type", e.target.value)} style={selectStyle}>
            {CLIMB_TYPES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <SectionHead label="CAPABILITIES" color={C.amber} />
      <div style={{ background: "rgba(245,158,11,0.06)", border: `1px solid rgba(245,158,11,0.15)`, borderRadius: 10, padding: "14px 18px" }}>
        <div style={{ fontSize: 10, color: C.amber, fontFamily: "monospace", marginBottom: 10 }}>CAN SCORE ON:</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {capBox("can_score_l1", "L1 Coral")}
          {capBox("can_score_l2", "L2 Coral")}
          {capBox("can_score_l3", "L3 Coral")}
          {capBox("can_score_l4", "L4 Coral")}
          {capBox("can_score_processor", "Processor")}
          {capBox("can_score_net", "Net")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", marginBottom: 4 }}>AUTO CAPABILITIES</div>
            <textarea placeholder="e.g. 2-piece coral auto, leaves zone, L3+L4 capable..." value={form.auto_capabilities} onChange={e => set("auto_capabilities", e.target.value)} style={{ ...inputStyle, minHeight: 50, resize: "vertical" }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", marginBottom: 4 }}>TELEOP CAPABILITIES</div>
            <textarea placeholder="e.g. Fast cycle bot, prefers L3, can play defense..." value={form.teleop_capabilities} onChange={e => set("teleop_capabilities", e.target.value)} style={{ ...inputStyle, minHeight: 50, resize: "vertical" }} />
          </div>
        </div>
      </div>

      <SectionHead label="ADDITIONAL NOTES" color={C.dim} />
      <textarea placeholder="Driver skill, robot quirks, alliance notes..." value={form.notes} onChange={e => set("notes", e.target.value)} style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} />
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <input placeholder="Scouter name" value={form.scouter_name} onChange={e => set("scouter_name", e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <button onClick={submit} disabled={saving || !form.team_number} style={{ ...addBtnStyle, opacity: !form.team_number ? 0.5 : 1, fontFamily: "'Orbitron', sans-serif", letterSpacing: 1 }}>
          {saving ? "SAVING..." : "SUBMIT PIT →"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TEAM DATA TAB
// ─────────────────────────────────────────────────────────
function TeamData({ matches, pits }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("avg_score");
  const [expandedTeam, setExpandedTeam] = useState(null);

  // Aggregate per team
  const teams = {};
  matches.forEach(m => {
    const t = m.team_number;
    if (!teams[t]) teams[t] = { team_number: t, matches: [], pit: null };
    teams[t].matches.push(m);
  });
  pits.forEach(p => {
    const t = p.team_number;
    if (!teams[t]) teams[t] = { team_number: t, matches: [], pit: null };
    teams[t].pit = p;
  });

  const teamList = Object.values(teams).map(t => {
    const scores = t.matches.map(calcScore);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const max = scores.length ? Math.max(...scores) : 0;
    const autoScores = t.matches.map(m => {
      let s = 0;
      if (m.auto_leave) s += POINTS.auto_leave;
      CORAL_LEVELS.forEach(l => { s += (m[`auto_coral_${l.toLowerCase()}`] || 0) * POINTS[`auto_coral_${l.toLowerCase()}`]; });
      s += (m.auto_algae_processor || 0) * POINTS.auto_algae_processor;
      s += (m.auto_algae_net || 0) * POINTS.auto_algae_net;
      return s;
    });
    const avgAuto = autoScores.length ? autoScores.reduce((a, b) => a + b, 0) / autoScores.length : 0;
    const deepClimbs = t.matches.filter(m => m.endgame === "Deep Cage").length;
    const shallowClimbs = t.matches.filter(m => m.endgame === "Shallow Cage").length;
    const defenseMatches = t.matches.filter(m => m.defense).length;
    return { ...t, avg_score: Math.round(avg * 10) / 10, max_score: max, avg_auto: Math.round(avgAuto * 10) / 10, deep_climbs: deepClimbs, shallow_climbs: shallowClimbs, defense_pct: t.matches.length ? Math.round((defenseMatches / t.matches.length) * 100) : 0 };
  });

  const filtered = teamList
    .filter(t => !search || String(t.team_number).includes(search) || t.pit?.team_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "avg_score") return b.avg_score - a.avg_score;
      if (sort === "max_score") return b.max_score - a.max_score;
      if (sort === "avg_auto") return b.avg_auto - a.avg_auto;
      if (sort === "deep") return b.deep_climbs - a.deep_climbs;
      return a.team_number - b.team_number;
    });

  const maxScore = Math.max(...filtered.map(t => t.avg_score), 1);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input placeholder="Search team # or name..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...selectStyle, width: "auto" }}>
          <option value="avg_score">Sort: Avg Score</option>
          <option value="max_score">Sort: Max Score</option>
          <option value="avg_auto">Sort: Avg Auto</option>
          <option value="deep">Sort: Deep Climbs</option>
          <option value="number">Sort: Team #</option>
        </select>
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", color: C.dim, padding: "60px 0", fontFamily: "monospace" }}>No scouting data yet. Submit match or pit data first.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((t, idx) => {
          const isExpanded = expandedTeam === t.team_number;
          const bar = t.avg_score / maxScore;
          return (
            <div key={t.team_number} style={{ background: C.surface, border: `1px solid ${isExpanded ? "rgba(239,68,68,0.4)" : C.border}`, borderRadius: 10, overflow: "hidden", cursor: "pointer", transition: "all 0.15s" }}
              onClick={() => setExpandedTeam(isExpanded ? null : t.team_number)}>
              {/* Row */}
              <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                {/* Rank */}
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: idx < 3 ? [C.amber, C.muted, "#b45309"][idx] : C.dim, minWidth: 24, textAlign: "center" }}>#{idx + 1}</div>
                {/* Team */}
                <div style={{ minWidth: 80 }}>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 15, fontWeight: 700, color: C.text }}>{t.team_number}</div>
                  {t.pit?.team_name && <div style={{ fontSize: 11, color: C.dim, fontFamily: "monospace" }}>{t.pit.team_name}</div>}
                </div>
                {/* Score bar */}
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${bar * 100}%`, background: `linear-gradient(90deg, ${C.red}, ${C.amber})`, borderRadius: 4, transition: "width 0.5s ease" }} />
                  </div>
                </div>
                {/* Stats */}
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  <StatPill label="AVG" value={t.avg_score} color={C.red} />
                  <StatPill label="MAX" value={t.max_score} color={C.amber} />
                  <StatPill label="AUTO" value={t.avg_auto} color={C.blue} />
                  <StatPill label={`${t.matches.length}m`} value={t.matches.length} color={C.dim} />
                  {t.deep_climbs > 0 && <StatPill label="DEEP" value={t.deep_climbs} color={C.purple} />}
                </div>
                <div style={{ fontSize: 12, color: C.dim }}>▾</div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ borderTop: `1px solid ${C.border}`, padding: "16px 18px", background: "rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {/* Match history */}
                    <div>
                      <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", letterSpacing: 2, marginBottom: 10 }}>MATCH HISTORY</div>
                      {t.matches.length === 0 && <div style={{ color: C.dim, fontSize: 12 }}>No match data.</div>}
                      {t.matches.slice(0, 6).map(m => (
                        <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 7, fontSize: 12, color: C.muted, fontFamily: "monospace" }}>
                          <span style={{ color: m.alliance === "Red" ? "#fca5a5" : "#93c5fd", minWidth: 20 }}>M{m.match_number}</span>
                          <span style={{ color: C.red, fontWeight: 700, minWidth: 30 }}>{calcScore(m)}pt</span>
                          <span style={{ color: C.amber, fontSize: 11 }}>auto:{(() => { let s = 0; CORAL_LEVELS.forEach(l => { s += (m[`auto_coral_${l.toLowerCase()}`] || 0) * POINTS[`auto_coral_${l.toLowerCase()}`]; }); s += (m.auto_algae_processor || 0) * 6 + (m.auto_algae_net || 0) * 4; if (m.auto_leave) s += 3; return s; })()}</span>
                          <span style={{ color: C.purple, fontSize: 11 }}>{m.endgame !== "None" ? m.endgame : ""}</span>
                          {m.died && <span style={{ color: C.red, fontSize: 10 }}>💀</span>}
                        </div>
                      ))}
                    </div>
                    {/* Pit info */}
                    <div>
                      <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", letterSpacing: 2, marginBottom: 10 }}>PIT INFO</div>
                      {!t.pit ? <div style={{ color: C.dim, fontSize: 12, fontFamily: "monospace" }}>No pit data scouted.</div> : (
                        <div style={{ fontSize: 12, color: C.muted, fontFamily: "monospace", display: "flex", flexDirection: "column", gap: 5 }}>
                          {t.pit.drivetrain && <div>🦾 {t.pit.drivetrain}</div>}
                          {t.pit.weight_lbs && <div>⚖️ {t.pit.weight_lbs} lbs</div>}
                          {t.pit.climb_type && t.pit.climb_type !== "None" && <div>🪝 {t.pit.climb_type} climb</div>}
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                            {["l1","l2","l3","l4"].map(l => t.pit[`can_score_${l}`] && <span key={l} style={{ background: "rgba(59,130,246,0.2)", color: "#93c5fd", borderRadius: 4, padding: "1px 6px", fontSize: 10 }}>{l.toUpperCase()}</span>)}
                            {t.pit.can_score_processor && <span style={{ background: "rgba(34,197,94,0.2)", color: "#86efac", borderRadius: 4, padding: "1px 6px", fontSize: 10 }}>Processor</span>}
                            {t.pit.can_score_net && <span style={{ background: "rgba(168,85,247,0.2)", color: "#c084fc", borderRadius: 4, padding: "1px 6px", fontSize: 10 }}>Net</span>}
                          </div>
                          {t.pit.auto_capabilities && <div style={{ marginTop: 4, color: C.dim, fontSize: 11 }}>🤖 {t.pit.auto_capabilities}</div>}
                          {t.pit.notes && <div style={{ marginTop: 4, color: C.dim, fontSize: 11, fontStyle: "italic" }}>📝 {t.pit.notes}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Radar-like capability bars */}
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", letterSpacing: 2, marginBottom: 10 }}>AVG SCORING BREAKDOWN</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                      {[
                        { label: "Auto", val: t.avg_auto, max: 30, color: C.amber },
                        { label: "Coral", val: Math.round(t.matches.reduce((s, m) => { CORAL_LEVELS.forEach(l => { s += ((m[`auto_coral_${l.toLowerCase()}`] || 0) * POINTS[`auto_coral_${l.toLowerCase()}`]) + ((m[`teleop_coral_${l.toLowerCase()}`] || 0) * POINTS[`teleop_coral_${l.toLowerCase()}`]); }); return s; }, 0) / Math.max(t.matches.length, 1) * 10) / 10, max: 60, color: C.blue },
                        { label: "Algae", val: Math.round(t.matches.reduce((s, m) => s + (m.auto_algae_processor || 0) * 6 + (m.auto_algae_net || 0) * 4 + (m.teleop_algae_processor || 0) * 6 + (m.teleop_algae_net || 0) * 4, 0) / Math.max(t.matches.length, 1) * 10) / 10, max: 30, color: C.green },
                        { label: "Climb", val: Math.round(t.matches.reduce((s, m) => s + (m.endgame === "Deep Cage" ? 12 : m.endgame === "Shallow Cage" ? 6 : m.endgame === "Park" ? 2 : 0), 0) / Math.max(t.matches.length, 1) * 10) / 10, max: 12, color: C.purple },
                      ].map(({ label, val, max, color }) => (
                        <div key={label} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", marginBottom: 4 }}>{label}</div>
                          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginBottom: 4 }}>
                            <div style={{ height: "100%", width: `${Math.min((val / max) * 100, 100)}%`, background: color, borderRadius: 2 }} />
                          </div>
                          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 700, color }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 15, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 9, color: C.dim, fontFamily: "monospace", letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PICKLIST TAB
// ─────────────────────────────────────────────────────────
function Picklist({ matches, picklist, onReload }) {
  const [list, setList] = useState([]);
  const [addTeam, setAddTeam] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  // Build team stats
  const teams = {};
  matches.forEach(m => {
    const t = m.team_number;
    if (!teams[t]) teams[t] = { team_number: t, scores: [] };
    teams[t].scores.push(calcScore(m));
  });
  const teamStats = Object.values(teams).map(t => ({
    team_number: t.team_number,
    avg: t.scores.length ? Math.round(t.scores.reduce((a, b) => a + b, 0) / t.scores.length * 10) / 10 : 0,
  }));

  useEffect(() => {
    setList(picklist.map(p => p.team_number));
  }, [picklist]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2000); };

  async function saveList() {
    setSaving(true);
    // Delete existing then insert
    await sbFetch("scouting_picklist", { method: "DELETE", headers: { "prefer": "return=minimal" } });
    if (list.length) {
      await sbFetch("scouting_picklist", { method: "POST", body: JSON.stringify(list.map((t, i) => ({ team_number: t, rank: i + 1 }))) });
    }
    setSaving(false);
    showToast("Picklist saved!");
    onReload?.();
  }

  function addToList() {
    const num = parseInt(addTeam);
    if (!num || list.includes(num)) return;
    setList(l => [...l, num]);
    setAddTeam("");
  }

  function removeFromList(idx) {
    setList(l => l.filter((_, i) => i !== idx));
  }

  function handleDrop(targetIdx) {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const newList = [...list];
    const [moved] = newList.splice(dragIdx, 1);
    newList.splice(targetIdx, 0, moved);
    setList(newList);
    setDragIdx(null);
    setDragOverIdx(null);
  }

  const getStats = (num) => teamStats.find(t => t.team_number === num);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, background: C.green, color: "#fff", padding: "10px 20px", borderRadius: 8, fontFamily: "monospace", fontSize: 13, zIndex: 9999 }}>{toast}</div>}

      {/* Add team row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <input type="number" placeholder="Add team number..." value={addTeam} onChange={e => setAddTeam(e.target.value)} onKeyDown={e => e.key === "Enter" && addToList()} style={{ ...inputStyle, flex: 1, fontFamily: "'Orbitron', sans-serif", fontSize: 16 }} />
        <button onClick={addToList} style={addBtnStyle}>+ ADD</button>
        <button onClick={saveList} disabled={saving} style={{ ...addBtnStyle, background: C.green, opacity: saving ? 0.6 : 1 }}>{saving ? "SAVING..." : "💾 SAVE"}</button>
      </div>

      {/* Suggested from data */}
      {teamStats.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", letterSpacing: 2, marginBottom: 10 }}>SUGGESTED FROM SCOUTING DATA (by avg score)</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[...teamStats].sort((a, b) => b.avg - a.avg).slice(0, 12).map(t => (
              <button key={t.team_number} onClick={() => { if (!list.includes(t.team_number)) setList(l => [...l, t.team_number]); }} style={{ background: list.includes(t.team_number) ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${list.includes(t.team_number) ? C.green : C.border}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontFamily: "monospace", fontSize: 12, color: list.includes(t.team_number) ? C.green : C.muted }}>
                {t.team_number} <span style={{ color: C.dim, fontSize: 10 }}>{t.avg}pt</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Picklist */}
      <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", letterSpacing: 2, marginBottom: 10 }}>ALLIANCE PICKLIST (drag to reorder)</div>
      {list.length === 0 && (
        <div style={{ textAlign: "center", color: C.dim, padding: "40px 0", fontFamily: "monospace", border: `1px dashed ${C.border}`, borderRadius: 10 }}>
          Add teams above to build your picklist.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {list.map((teamNum, idx) => {
          const stats = getStats(teamNum);
          const isDragging = dragIdx === idx;
          const isDragOver = dragOverIdx === idx && dragIdx !== idx;
          return (
            <div
              key={teamNum}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={e => { e.preventDefault(); setDragOverIdx(idx); }}
              onDrop={() => handleDrop(idx)}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: isDragOver ? "rgba(239,68,68,0.08)" : isDragging ? "rgba(255,255,255,0.01)" : C.surface, border: `1px solid ${isDragOver ? "rgba(239,68,68,0.4)" : C.border}`, borderRadius: 8, cursor: "grab", opacity: isDragging ? 0.4 : 1, transition: "all 0.15s" }}
            >
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: idx < 3 ? [C.amber, C.muted, "#b45309"][idx] : C.dim, minWidth: 20 }}>#{idx + 1}</div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, fontWeight: 700, color: C.text, flex: 1 }}>{teamNum}</div>
              {stats && <div style={{ fontFamily: "monospace", fontSize: 12, color: C.red }}>{stats.avg}pt avg</div>}
              <button onClick={() => removeFromList(idx)} style={{ background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: 16, padding: "0 4px" }}
                onMouseEnter={e => e.target.style.color = C.red}
                onMouseLeave={e => e.target.style.color = C.dim}>✕</button>
            </div>
          );
        })}
      </div>

      {list.length >= 3 && (
        <div style={{ marginTop: 20, padding: 16, background: "rgba(239,68,68,0.06)", border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, color: C.red, fontFamily: "monospace", letterSpacing: 2, marginBottom: 8 }}>TOP 3 ALLIANCE</div>
          <div style={{ display: "flex", gap: 10 }}>
            {list.slice(0, 3).map((num, i) => {
              const stats = getStats(num);
              return (
                <div key={num} style={{ flex: 1, textAlign: "center", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px" }}>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", marginBottom: 4 }}>{["CAPTAIN", "1ST PICK", "2ND PICK"][i]}</div>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, fontWeight: 900, color: C.red }}>{num}</div>
                  {stats && <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{stats.avg}pt</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// RAW DATA TAB
// ─────────────────────────────────────────────────────────
function RawData({ matches, onDelete }) {
  const [filter, setFilter] = useState("");
  const filtered = matches.filter(m => !filter || String(m.team_number).includes(filter) || String(m.match_number).includes(filter));

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input placeholder="Filter by team or match #..." value={filter} onChange={e => setFilter(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <div style={{ fontFamily: "monospace", fontSize: 12, color: C.dim, padding: "9px 0" }}>{filtered.length} entries</div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {["Match", "Team", "Alliance", "Score", "Auto", "Endgame", "Defense", "Scouter", "Del"].map(h => (
                <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.dim, fontSize: 10, letterSpacing: 1, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const autoScore = (() => { let s = 0; if (m.auto_leave) s += 3; CORAL_LEVELS.forEach(l => { s += (m[`auto_coral_${l.toLowerCase()}`] || 0) * POINTS[`auto_coral_${l.toLowerCase()}`]; }); s += (m.auto_algae_processor || 0) * 6 + (m.auto_algae_net || 0) * 4; return s; })();
              return (
                <tr key={m.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                  <td style={{ padding: "8px 10px", color: C.muted }}>M{m.match_number}</td>
                  <td style={{ padding: "8px 10px", color: C.text, fontFamily: "'Orbitron', sans-serif", fontWeight: 700 }}>{m.team_number}</td>
                  <td style={{ padding: "8px 10px", color: m.alliance === "Red" ? "#fca5a5" : "#93c5fd" }}>{m.alliance}</td>
                  <td style={{ padding: "8px 10px", color: C.red, fontWeight: 700, fontFamily: "'Orbitron', sans-serif" }}>{calcScore(m)}</td>
                  <td style={{ padding: "8px 10px", color: C.amber }}>{autoScore}</td>
                  <td style={{ padding: "8px 10px", color: C.purple }}>{m.endgame}</td>
                  <td style={{ padding: "8px 10px", color: m.defense ? C.amber : C.dim }}>{m.defense ? "Y" : "—"}</td>
                  <td style={{ padding: "8px 10px", color: C.dim }}>{m.scouter_name || "—"}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <button onClick={() => onDelete(m.id)} style={{ background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: 14 }}
                      onMouseEnter={e => e.target.style.color = C.red}
                      onMouseLeave={e => e.target.style.color = C.dim}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ textAlign: "center", color: C.dim, padding: "40px 0", fontFamily: "monospace" }}>No match data.</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────
const TABS = [
  { id: "match", label: "🎯 Match Scout" },
  { id: "pit", label: "🔧 Pit Scout" },
  { id: "data", label: "📊 Team Data" },
  { id: "picklist", label: "🏆 Picklist" },
  { id: "raw", label: "📋 Raw Data" },
];

export default function HubScouting() {
  const [authed] = useState(isAuthed());
  const [tab, setTab] = useState("match");
  const [matches, setMatches] = useState([]);
  const [pits, setPits] = useState([]);
  const [picklist, setPicklist] = useState([]);
  const [toast, setToast] = useState("");
  const username = typeof localStorage !== "undefined" ? localStorage.getItem("hub_username") || "" : "";

  useEffect(() => {
    if (!authed) { window.location.href = "/member-hub"; return; }
    document.title = "Scouting · Team 4550";
    loadAll();
  }, []);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function loadAll() {
    const [m, p, pk] = await Promise.all([fetchMatches(), fetchPits(), fetchPicklist()]);
    setMatches(m);
    setPits(p);
    setPicklist(pk);
  }

  async function deleteMatch(id) {
    if (!confirm("Delete this entry?")) return;
    await sbFetch(`scouting_matches?id=eq.${id}`, { method: "DELETE" });
    loadAll();
    showToast("Deleted.");
  }

  if (!authed) return null;

  const totalTeams = [...new Set(matches.map(m => m.team_number))].length;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Exo 2', sans-serif" }}>
      <style>{FONTS}</style>
      {toast && <div style={toastStyle}>{toast}</div>}
      <HubHeader title="🔭 Scouting" />

      {/* Stats bar */}
      <div style={{ background: "rgba(13,17,23,0.9)", borderBottom: `1px solid ${C.border}`, padding: "12px 24px", display: "flex", gap: 24, flexWrap: "wrap" }}>
        {[
          { label: "MATCHES SCOUTED", val: matches.length, color: C.red },
          { label: "TEAMS TRACKED", val: totalTeams, color: C.blue },
          { label: "PIT REPORTS", val: pits.length, color: C.amber },
          { label: "PICKLIST", val: picklist.length + " teams", color: C.purple },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", letterSpacing: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: "rgba(8,10,15,0.8)", display: "flex", overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "14px 20px", border: "none", borderBottom: `2px solid ${tab === t.id ? C.red : "transparent"}`, background: "transparent", color: tab === t.id ? C.text : C.dim, cursor: "pointer", fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, whiteSpace: "nowrap", transition: "all 0.15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px" }}>
        {tab === "match" && <MatchScout onSubmit={() => { loadAll(); showToast("✅ Match submitted!"); }} username={username} />}
        {tab === "pit" && <PitScout onSubmit={() => { loadAll(); showToast("✅ Pit report saved!"); }} username={username} />}
        {tab === "data" && <TeamData matches={matches} pits={pits} />}
        {tab === "picklist" && <Picklist matches={matches} picklist={picklist} onReload={loadAll} />}
        {tab === "raw" && <RawData matches={matches} onDelete={deleteMatch} />}
      </div>
    </div>
  );
}
