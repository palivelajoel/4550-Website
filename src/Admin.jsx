import { useState, useEffect, useRef } from "react";
import Starfield from "./Starfield.jsx";
import { RulerMarks } from "./Starfield.jsx";

import supabase from './supabaseClient.js';
const DEFAULT_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
const ROLES = ["Member", "Captain", "Admin"];
const SUBTEAMS = ["Build", "Programming", "Marketing & Outreach", "General"];

async function sbFetch(path, opts = {}) {
  // Use Supabase client for ease and to get auth helpers later
  try {
    const res = await supabase.rpc('rest_proxy', { path });
    // fallback: use direct fetch when rpc not available
  } catch (e) {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation", ...opts.headers },
      ...opts,
    });
    if (!res.ok) { console.error("sbFetch", res.status, path, await res.text().catch(() => "")); return null; }
    try { return await res.json(); } catch { return null; }
  }
  return null;
}

// Admin proxy helper - calls serverless admin-proxy which uses the service_role key.
async function adminProxy(table, action, payload) {
  const res = await fetch('/api/admin-proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, action, payload }) });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(txt || `Proxy error ${res.status}`);
  }
  return res.json();
}

async function uploadImageToSupabase(file) {
  const safeFileName = `${Date.now()}-${file.name}`.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "_");
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/team-assets/${safeFileName}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": file.type, "x-upsert": "true" },
    body: file,
  });
  if (!res.ok) return null;
  // Return WITHOUT encodeURIComponent — simpler, works for safe filenames
  return `${SUPABASE_URL}/storage/v1/object/public/team-assets/${safeFileName}`;
}

/**
 * FIXED: Extract filename and reconstruct URL cleanly.
 * Fetches with auth header to bypass bucket policy issues.
 */
function CaptainPhoto({ photoUrl, name, size = 48 }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(null); setFailed(false);
    if (!photoUrl) { setFailed(true); return; }

    // Extract just the filename from whatever URL format is stored
    const getFilename = (url) => {
      const markers = ["/public/team-assets/", "/object/team-assets/", "/team-assets/"];
      for (const m of markers) {
        const idx = url.indexOf(m);
        if (idx !== -1) {
          let fn = url.slice(idx + m.length).split("?")[0];
          try { fn = decodeURIComponent(fn); } catch {}
          return fn;
        }
      }
      return url.replace(/^.*\//, "");
    };
    const filename = getFilename(photoUrl);
    const canonicalUrl = `${SUPABASE_URL}/storage/v1/object/public/team-assets/${filename}`;

    // Try public URL first
    const img = new Image();
    img.onload = () => setSrc(canonicalUrl);
    img.onerror = () => {
      // Fall back: fetch with auth header → blob URL
      fetch(canonicalUrl, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } })
        .then(r => r.ok ? r.blob() : Promise.reject())
        .then(blob => setSrc(URL.createObjectURL(blob)))
        .catch(() => setFailed(true));
    };
    img.src = canonicalUrl;

    return () => { img.onload = null; img.onerror = null; };
  }, [photoUrl]);

  if (failed || !photoUrl) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: "rgba(239,68,68,0.1)", border: "2px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontWeight: 700, fontSize: size * 0.4 }}>
        {name?.[0] || "?"}
      </div>
    );
  }
  if (!src) {
    return <div style={{ width: size, height: size, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.1)", animation: "pulse 1.5s ease infinite" }} />;
  }
  return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(239,68,68,0.3)" }} />;
}

const ROLE_COLORS = { Member: "#64748b", Captain: "#3b82f6", Admin: "#ef4444" };
const SUBTEAM_COLORS = { Build: "#f59e0b", Programming: "#3b82f6", "Marketing & Outreach": "#22c55e", General: "#64748b" };

const NAV = [
  { id: "overview", label: "📊 Overview" },
  { id: "accounts", label: "👥 Accounts" },
  { id: "competitions", label: "🏆 Competitions" },
  { id: "hub-tasks", label: "📋 Hub Tasks" },
  { id: "hub-calendar", label: "📅 Hub Calendar" },
  { id: "sponsors-assign", label: "🤝 Sponsor Assignment" },
  { id: "captains", label: "🏆 Leadership" },
  { id: "suggestions", label: "💡 Suggestions" },
  { id: "site", label: "⚙️ Site Config" },
  { id: "settings", label: "🔐 Admin Settings" },
];

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [page, setPage] = useState("overview");
  const [members, setMembers] = useState([]);
  const [tasks, setTaskList] = useState([]);
  const [hubCalendar, setHubCalendar] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [captains, setCaptains] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [config, setConfig] = useState({});
  const [logoUrl, setLogoUrl] = useState("/logo.jpg");
  const [toast, setToast] = useState("");
  const [adminPassword, setAdminPassword] = useState(DEFAULT_ADMIN_PASSWORD);

  useEffect(() => {
    if (localStorage.getItem("admin_authed") === "true") { setAuthed(true); loadAll(); }
  }, []);

  function showToast(msg, color = "#22c55e") { setToast({ msg, color }); setTimeout(() => setToast(""), 3000); }

  async function loadAll() {
    const [m, t, cals, sg, sp, cap, comp, cfg] = await Promise.all([
      sbFetch("members?select=*&order=created_at.asc"),
      sbFetch("hub_tasks?select=*&order=created_at.desc"),
      sbFetch("hub_calendar?select=*&order=date.asc"),
      sbFetch("suggestions?select=*&order=submitted_at.desc"),
      sbFetch("sponsors?select=*&order=company.asc"),
      sbFetch("captains?select=*&order=sort_order.asc"),
      sbFetch("competitions?select=*&order=start_date.asc"),
      sbFetch("site_config?select=key,value"),
    ]);
    if (m) setMembers(m);
    if (t) setTaskList(t);
    if (cals) setHubCalendar(cals);
    if (sg) setSuggestions(sg);
    if (sp) setSponsors(sp);
    if (cap) setCaptains(cap);
    if (comp) setCompetitions(comp);
    if (cfg) {
      const obj = {};
      cfg.forEach(r => { obj[r.key] = r.value; });
      setConfig(obj);
      if (obj.logo_url) setLogoUrl(obj.logo_url);
      if (obj.admin_password) setAdminPassword(obj.admin_password);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setErr("");
    try {
      // If email is provided, use Supabase Auth sign-in flow
      if (email) {
        const { data: signData, error: signErr } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (signErr || !signData?.session) { setErr(signErr?.message || 'Sign-in failed.'); return; }
        const token = signData.session.access_token;
        // Exchange token with server to set HttpOnly admin cookie
        const r = await fetch('/api/admin-login', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
        if (!r.ok) { const txt = await r.text().catch(() => ''); setErr(txt || 'Server login failed.'); return; }
        localStorage.setItem("admin_authed", "true");
        setAuthed(true); loadAll();
        return;
      }

      // Fallback: legacy password (no email)
      const r = await fetch('/api/admin-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
      if (!r.ok) { setErr('Incorrect password.'); return; }
      localStorage.setItem("admin_authed", "true");
      setAuthed(true); loadAll();
    } catch (err) { setErr('Login failed.'); }
  }

  async function handleLogout() {
    try { await fetch('/api/admin-logout'); } catch (e) {}
    try { await supabase.auth.signOut(); } catch (e) {}
    localStorage.removeItem("admin_authed"); setAuthed(false);
  }

  if (!authed) {
    return (
      <div style={S.loginBg}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Exo+2:wght@400;600&display=swap');
          *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}body{background:#080a0f;}
          @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
          @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
        `}</style>
        <div style={S.loginCard}>
          <div style={S.loginTitle}>ADMIN PANEL</div>
          <div style={S.loginSub}>FRC Team 4550 · Something's Bruin</div>
          <form onSubmit={handleLogin} style={S.loginForm}>
            <input type="email" placeholder="Email (optional for Supabase auth)" value={email} onChange={e => { setEmail(e.target.value); setErr(""); }} style={S.loginInput} />
            <input type="password" placeholder="Password" value={pw} onChange={e => { setPw(e.target.value); setErr(""); }}
              style={S.loginInput} autoFocus />
            {err && <div style={S.loginErr}>{err}</div>}
            <button type="submit" style={S.loginBtn}>ENTER →</button>
          </form>
          <a href="/" style={S.loginBack}>← Back to site</a>
      </div>
      {editMapId && (
        <div style={{ marginTop: 24, borderTop: "2px solid #ef4444", paddingTop: 24 }}>
          <PitMapEditor comp={competitions.find(c => c.id === editMapId)} reload={loadAll} showToast={showToast} />
        </div>
      )}
    </div>
  );
}

  const overdue = tasks.filter(t => t.due_date && t.status !== "Done" && new Date(t.due_date) < new Date()).length;

  return (
    <div className="admin-layout" style={S.layout}>
      <Starfield density={8000} opacity={0.45} />
      <RulerMarks opacity={0.18} />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;600;700&family=Share+Tech+Mono&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}body{background:#080a0f;color:#f1f5f9;font-family:'Exo 2',sans-serif;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
        input,select,textarea{outline:none;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:#ef4444;border-radius:3px;}
        @media(max-width:760px){
          .admin-layout{display:block!important;}
          .admin-sidebar{position:relative!important;width:100%!important;height:auto!important;border-right:0!important;border-bottom:1px solid rgba(255,255,255,0.08)!important;}
          .admin-nav{display:flex!important;overflow-x:auto!important;padding:8px!important;gap:6px!important;}
          .admin-nav button{min-width:max-content!important;border-left:0!important;border-bottom:2px solid transparent!important;border-radius:8px!important;}
          .admin-main{padding:18px 12px!important;}
          .admin-card{padding:16px!important;}
        }
      `}</style>

      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.color || "#22c55e", color: "#fff", padding: "12px 20px", borderRadius: 8, fontFamily: "monospace", fontSize: 13, zIndex: 9999, animation: "fadeUp 0.3s ease", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>{toast.msg}</div>}

      {/* Sidebar */}
      <aside className="admin-sidebar" style={S.sidebar}>
        <div style={S.sidebarBrand}>
          <img src={logoUrl} alt="logo" style={S.sidebarLogo} />
          <div>
            <div style={S.sidebarTitle}>ADMIN</div>
            <div style={S.sidebarSub}>Team 4550</div>
          </div>
        </div>
        <nav className="admin-nav" style={S.sidebarNav}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{ ...S.navItem, background: page === n.id ? "rgba(239,68,68,0.15)" : "transparent", color: page === n.id ? "#ef4444" : "#94a3b8", borderLeft: page === n.id ? "3px solid #ef4444" : "3px solid transparent" }}>
              {n.label}
              {n.id === "suggestions" && suggestions.length > 0 && <span style={S.badge}>{suggestions.length}</span>}
            </button>
          ))}
        </nav>
        <button onClick={handleLogout} style={S.logoutBtn}>Log Out</button>
      </aside>

      <main className="admin-main" style={S.main}>
        {page === "overview" && <Overview members={members} tasks={tasks} suggestions={suggestions} sponsors={sponsors} events={hubCalendar} overdue={overdue} competitions={competitions} />}
        {page === "accounts" && <Accounts members={members} reload={loadAll} showToast={showToast} />}
        {page === "competitions" && <CompetitionsAdmin competitions={competitions} config={config} reload={loadAll} showToast={showToast} />}
        {page === "hub-tasks" && <Tasks tasks={tasks} members={members} reload={loadAll} showToast={showToast} />}
        {page === "hub-calendar" && <HubCalendarAdmin events={hubCalendar} reload={loadAll} showToast={showToast} />}
        {page === "sponsors-assign" && <SponsorAssign sponsors={sponsors} members={members} reload={loadAll} showToast={showToast} />}
        {page === "captains" && <CaptainsAdmin captains={captains} reload={loadAll} showToast={showToast} />}
        {page === "suggestions" && <Suggestions suggestions={suggestions} reload={loadAll} showToast={showToast} />}
        {page === "site" && <SiteConfig config={config} logoUrl={logoUrl} setLogoUrl={setLogoUrl} reload={loadAll} showToast={showToast} />}
        {page === "settings" && <AdminSettings showToast={showToast} />}
      </main>
    </div>
  );
}

// ── OVERVIEW ──────────────────────────────────────────────
function Overview({ members, tasks, suggestions, sponsors, events, overdue, competitions }) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const openTasks = tasks.filter(t => t.status !== "Done");
  const weekAhead = new Date(today); weekAhead.setDate(weekAhead.getDate() + 7);
  const upcomingEvents = events.filter(e => e?.date && new Date(e.date) >= today && new Date(e.date) <= weekAhead).length;
  const nextEvents = events.filter(e => e?.date && e.date >= todayStr).slice(0, 5);
  const dueTasks = openTasks.filter(t => t.due_date).sort((a, b) => String(a.due_date).localeCompare(String(b.due_date))).slice(0, 5);
  const mapNeeds = competitions.filter(c => c.attending && (!c.pit_map_url || !c.venue_map_url)).slice(0, 5);
  const nextComp = competitions.filter(c => c.attending && c.start_date >= todayStr).sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))[0];
  const attendingComps = competitions.filter(c => c.attending).length;
  const stats = [
    { label: "Members", val: members.length, color: "#3b82f6" },
    { label: "Open Tasks", val: openTasks.length, color: "#f59e0b" },
    { label: "Overdue", val: overdue, color: "#ef4444" },
    { label: "Events (7d)", val: upcomingEvents, color: "#22c55e" },
    { label: "Suggestions", val: suggestions.length, color: "#a855f7" },
    { label: "Sponsors", val: sponsors.length, color: "#64748b" },
    { label: "Attending Comps", val: attendingComps, color: "#eab308" },
  ];
  return (
    <div>
      <h1 style={S.pageTitle}>Overview</h1>
      <div style={S.statRow}>
        {stats.map(s => (
          <div key={s.label} style={{ ...S.statCard, borderColor: s.color }}>
            <div style={{ ...S.statNum, color: s.color }}>{s.val}</div>
            <div style={S.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>
      {overdue > 0 && <div style={S.alertBanner}>⚠️ {overdue} overdue task{overdue !== 1 ? "s" : ""}</div>}
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <a href="/" target="_blank" style={{ flex: 1, padding: '16px 24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', textDecoration: 'none', fontSize: 14, fontFamily: "'Exo 2', sans-serif", textAlign: 'center' }}>Public Site ↗</a>
        <a href="/member-hub" target="_blank" style={{ flex: 1, padding: '16px 24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', textDecoration: 'none', fontSize: 14, fontFamily: "'Exo 2', sans-serif", textAlign: 'center' }}>Member Hub ↗</a>
      </div>
    </div>
  );
}

// ── ACCOUNTS ──────────────────────────────────────────────
function Accounts({ members, reload, showToast }) {
  const [form, setForm] = useState({ username: "", password: "", confirmPassword: "", full_name: "", role: "Member", subteam: "General" });
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [pwError, setPwError] = useState("");

  async function createMember() {
    setPwError("");
    if (!form.username || !form.password) return;
    if (form.password !== form.confirmPassword) { setPwError("Passwords do not match."); return; }
    // Use special admin-proxy flow to create Supabase auth user and members row
    await adminProxy('members', 'create_user', { email: form.username, password: form.password, full_name: form.full_name, role: form.role, subteam: form.subteam, username: form.username });
    setForm({ username: "", password: "", confirmPassword: "", full_name: "", role: "Member", subteam: "General" });
    reload(); showToast("✅ Member created.");
  }

  async function updateMember(id) {
    setPwError("");
    if (editData.password && editData.password !== editData.confirmPassword) { setPwError("Passwords do not match."); return; }
    const payload = { full_name: editData.full_name, role: editData.role, subteam: editData.subteam };
    // If password provided, use special update_member action to change Auth password
    await adminProxy('members', 'update_member', { id, updates: payload, password: editData.password });
    setEditId(null); setEditData({}); reload(); showToast("✅ Member updated.");
  }

  async function deleteMember(id) {
    if (!confirm("Delete this member?")) return;
    await adminProxy('members', 'delete', { id });
    reload(); showToast("🗑️ Member deleted.", "#ef4444");
  }

  // Group by subteam
  const bySubteam = {};
  SUBTEAMS.forEach(s => { bySubteam[s] = members.filter(m => (m.subteam || "General") === s); });

  return (
    <div>
      <h1 style={S.pageTitle}>Account Management</h1>
      <div style={S.card}>
        <div style={S.cardTitle}>Create Account</div>
        <div style={S.formCol}>
          <div style={S.formRow}>
            <input placeholder="Username *" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} style={S.input} />
            <input placeholder="Full Name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} style={S.input} />
          </div>
          <div style={S.formRow}>
            <input type="password" placeholder="Password *" value={form.password} onChange={e => { setForm({ ...form, password: e.target.value }); setPwError(""); }} style={{ ...S.input, borderColor: pwError ? "#ef4444" : undefined }} />
            <input type="password" placeholder="Confirm Password *" value={form.confirmPassword} onChange={e => { setForm({ ...form, confirmPassword: e.target.value }); setPwError(""); }} style={{ ...S.input, borderColor: pwError ? "#ef4444" : undefined }} />
          </div>
          {pwError && <div style={{ color: "#ef4444", fontSize: 12, fontFamily: "monospace" }}>{pwError}</div>}
          <div style={S.formRow}>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={S.select}>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
            <select value={form.subteam} onChange={e => setForm({ ...form, subteam: e.target.value })} style={S.select}>
              {SUBTEAMS.map(s => <option key={s}>{s}</option>)}
            </select>
            <button onClick={createMember} style={S.btnPrimary}>Create Account</button>
          </div>
        </div>
      </div>

      {/* By subteam */}
      {SUBTEAMS.map(st => {
        const sub = bySubteam[st];
        if (!sub.length) return null;
        return (
          <div key={st} style={S.card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: SUBTEAM_COLORS[st] }} />
              <div style={{ ...S.cardTitle, marginBottom: 0 }}>{st} <span style={{ color: "#64748b", fontSize: 11 }}>({sub.length})</span></div>
            </div>
            {sub.map(m => (
              <div key={m.id} style={S.memberRow}>
                {editId === m.id ? (
                  <div style={{ ...S.formCol, flex: 1 }}>
                    <div style={S.formRow}>
                      <input placeholder="Full Name" value={editData.full_name || ""} onChange={e => setEditData({ ...editData, full_name: e.target.value })} style={S.input} />
                      <select value={editData.role || m.role} onChange={e => setEditData({ ...editData, role: e.target.value })} style={S.select}>
                        {ROLES.map(r => <option key={r}>{r}</option>)}
                      </select>
                      <select value={editData.subteam || m.subteam || "General"} onChange={e => setEditData({ ...editData, subteam: e.target.value })} style={S.select}>
                        {SUBTEAMS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div style={S.formRow}>
                      <input type="password" placeholder="New Password (leave blank to keep)" value={editData.password || ""} onChange={e => { setEditData({ ...editData, password: e.target.value }); setPwError(""); }} style={{ ...S.input, borderColor: pwError ? "#ef4444" : undefined }} />
                      <input type="password" placeholder="Confirm New Password" value={editData.confirmPassword || ""} onChange={e => { setEditData({ ...editData, confirmPassword: e.target.value }); setPwError(""); }} style={{ ...S.input, borderColor: pwError ? "#ef4444" : undefined }} />
                    </div>
                    {pwError && <div style={{ color: "#ef4444", fontSize: 12, fontFamily: "monospace" }}>{pwError}</div>}
                    <div style={S.formRow}>
                      <button onClick={() => updateMember(m.id)} style={S.btnPrimary}>Save</button>
                      <button onClick={() => { setEditId(null); setPwError(""); }} style={S.btnGhost}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={S.memberInfo}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${ROLE_COLORS[m.role] || "#64748b"}22`, border: `1px solid ${ROLE_COLORS[m.role] || "#64748b"}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: ROLE_COLORS[m.role] || "#64748b" }}>{(m.full_name || m.username)[0]}</div>
                      <div>
                        <span style={S.memberName}>{m.full_name || m.username}</span>
                        <span style={S.memberUser}> @{m.username}</span>
                      </div>
                      <span style={{ ...S.roleBadge, background: `${ROLE_COLORS[m.role] || "#64748b"}22`, color: ROLE_COLORS[m.role] || "#64748b" }}>{m.role}</span>
                    </div>
                    <div style={S.memberActions}>
                      <button onClick={() => { setEditId(m.id); setEditData({ full_name: m.full_name, role: m.role, subteam: m.subteam || "General" }); setPwError(""); }} style={S.btnGhost}>Edit</button>
                      <button onClick={() => deleteMember(m.id)} style={S.btnDanger}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── TASKS ─────────────────────────────────────────────────
function Tasks({ tasks, members, reload, showToast }) {
  const [form, setForm] = useState({ title: "", description: "", assigned_to: "", assigned_name: "", due_date: "", priority: "Medium", status: "To Do", subteam: "General" });

  async function createTask() {
    if (!form.title) return;
    const member = members.find(m => m.id === form.assigned_to);
    await adminProxy('hub_tasks', 'insert', { ...form, assigned_name: member ? member.full_name || member.username : "" });
    setForm({ title: "", description: "", assigned_to: "", assigned_name: "", due_date: "", priority: "Medium", status: "To Do", subteam: "General" });
    reload(); showToast("✅ Task created.");
  }

  async function updateStatus(id, status) {
    await adminProxy('hub_tasks', 'update', { id, updates: { status } });
    reload();
  }

  async function deleteTask(id) {
    await adminProxy('hub_tasks', 'delete', { id });
    reload(); showToast("🗑️ Task deleted.", "#ef4444");
  }

  const groups = { "To Do": [], "In Progress": [], Done: [] };
  tasks.forEach(t => { if (groups[t.status]) groups[t.status].push(t); });
  const pColor = { Low: "#22c55e", Medium: "#f59e0b", High: "#ef4444" };
  const isOverdue = t => t.due_date && t.status !== "Done" && new Date(t.due_date) < new Date();

  return (
    <div>
      <h1 style={S.pageTitle}>Hub Task Management</h1>
      <div style={S.card}>
        <div style={S.cardTitle}>Create Task</div>
        <div style={S.formCol}>
          <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={S.input} />
          <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={S.input} />
          <div style={S.formRow}>
            <select value={form.subteam} onChange={e => setForm({ ...form, subteam: e.target.value })} style={S.select}>
              {SUBTEAMS.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} style={S.select}>
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.full_name || m.username} ({m.subteam || "General"})</option>)}
            </select>
            <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} style={S.input} />
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={S.select}>
              {["Low", "Medium", "High"].map(p => <option key={p}>{p}</option>)}
            </select>
            <button onClick={createTask} style={S.btnPrimary}>Create</button>
          </div>
        </div>
      </div>
      <div style={S.taskColumns}>
        {Object.entries(groups).map(([status, list]) => (
          <div key={status} style={S.taskCol}>
            <div style={S.taskColHeader}>{status} <span style={S.taskCount}>{list.length}</span></div>
            {list.map(t => (
              <div key={t.id} style={{ ...S.taskCard, borderLeft: `3px solid ${pColor[t.priority] || "#64748b"}`, background: isOverdue(t) ? "rgba(239,68,68,0.07)" : "rgba(255,255,255,0.03)" }}>
                <div style={S.taskTitle}>{t.title}</div>
                {t.description && <div style={S.taskDesc}>{t.description}</div>}
                {t.subteam && t.subteam !== "General" && <div style={{ fontSize: 10, color: SUBTEAM_COLORS[t.subteam], marginBottom: 4, fontFamily: "monospace" }}>{t.subteam}</div>}
                <div style={S.taskMeta}>
                  {t.assigned_name && <span>👤 {t.assigned_name}</span>}
                  {t.due_date && <span style={{ color: isOverdue(t) ? "#ef4444" : "#64748b" }}>📅 {t.due_date}</span>}
                </div>
                <div style={S.taskActions}>
                  <select value={t.status} onChange={e => updateStatus(t.id, e.target.value)} style={{ ...S.select, fontSize: 11, padding: "4px 8px" }}>
                    {["To Do", "In Progress", "Done"].map(s => <option key={s}>{s}</option>)}
                  </select>
                  <button onClick={() => deleteTask(t.id)} style={S.btnDanger}>✕</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── HUB CALENDAR ──────────────────────────────────────────
function HubCalendarAdmin({ events, reload, showToast }) {
  const [form, setForm] = useState({ title: "", type: "event", date: "", end_date: "", time: "", description: "", all_day: true });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const EVENT_TYPES = [{ value: "event", label: "Event" }, { value: "deadline", label: "Deadline" }, { value: "meeting", label: "Meeting" }, { value: "competition", label: "Competition" }, { value: "other", label: "Other" }];

  async function saveEvent() {
    if (!form.title || !form.date) return showToast("Title and date required.", "#ef4444");
    setSaving(true);
    if (editingId) {
      await adminProxy('hub_calendar', 'update', { id: editingId, updates: form });
      showToast("✅ Event updated.");
    } else {
      await adminProxy('hub_calendar', 'insert', form);
      showToast("✅ Event created.");
    }
    setSaving(false); setEditingId(null);
    setForm({ title: "", type: "event", date: "", end_date: "", time: "", description: "", all_day: true });
    reload();
  }

  async function deleteEvent(id) {
    if (!confirm("Delete this event?")) return;
    await adminProxy('hub_calendar', 'delete', { id });
    showToast("🗑️ Deleted.", "#ef4444"); reload();
  }

  return (
    <div>
      <h1 style={S.pageTitle}>Hub Calendar</h1>
      <div style={S.card}>
        <div style={S.cardTitle}>{editingId ? "Edit Event" : "Add Event"}</div>
        <div style={S.formCol}>
          <div style={S.formRow}>
            <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={S.input} />
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={S.select}>
              {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div style={S.formRow}>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={S.input} />
            <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} style={S.input} />
            <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} style={S.input} />
          </div>
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...S.input, minHeight: 80, resize: "vertical" }} />
          <div style={S.formRow}>
            <label style={{ color: "#94a3b8", fontSize: 13, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={form.all_day} onChange={e => setForm({ ...form, all_day: e.target.checked })} /> All day
            </label>
            <button onClick={saveEvent} disabled={saving} style={S.btnPrimary}>{saving ? "Saving..." : editingId ? "Save" : "Add Event"}</button>
            {editingId && <button onClick={() => { setEditingId(null); setForm({ title: "", type: "event", date: "", end_date: "", time: "", description: "", all_day: true }); }} style={S.btnGhost}>Cancel</button>}
          </div>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>All Events</div>
        {events.map(ev => (
          <div key={ev.id} style={{ marginBottom: 12, padding: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontFamily: "'Orbitron', sans-serif", color: "#f1f5f9", fontWeight: 700 }}>{ev.title}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace", marginTop: 2 }}>{ev.type?.toUpperCase()} · {ev.date}{ev.time ? ` · ${ev.time}` : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setEditingId(ev.id); setForm({ title: ev.title || "", type: ev.type || "event", date: ev.date || "", end_date: ev.end_date || "", time: ev.time || "", description: ev.description || "", all_day: ev.all_day !== false }); }} style={S.btnGhost}>Edit</button>
                <button onClick={() => deleteEvent(ev.id)} style={S.btnDanger}>Delete</button>
              </div>
            </div>
          </div>
        ))}
        {events.length === 0 && <div style={{ color: "#64748b", fontSize: 14 }}>No events yet.</div>}
      </div>
    </div>
  );
}

// ── SPONSOR ASSIGNMENT ────────────────────────────────────
function SponsorAssign({ sponsors, members, reload, showToast }) {
  const [assignments, setAssignments] = useState({});
  const [filter, setFilter] = useState("");
  const [autoLoading, setAutoLoading] = useState(false);

  useEffect(() => {
    const init = {};
    sponsors.forEach(s => { init[s.id] = s.assigned_member_id || ""; });
    setAssignments(init);
  }, [sponsors]);

  async function saveAssignment(sponsorId, memberId) {
    const member = members.find(m => m.id === memberId);
    await adminProxy('sponsors', 'update', { id: sponsorId, updates: { assigned_member_id: memberId || null, assigned_member_name: member ? member.full_name || member.username : null } });
    reload();
  }

  async function autoAssign() {
    if (!members.length) return;
    setAutoLoading(true);
    const unassigned = sponsors.filter(s => !s.assigned_member_id);
      for (let i = 0; i < unassigned.length; i++) {
        const member = members[i % members.length];
        await adminProxy('sponsors', 'update', { id: unassigned[i].id, updates: { assigned_member_id: member.id, assigned_member_name: member.full_name || member.username } });
      }
    reload(); setAutoLoading(false);
    showToast(`✅ Auto-assigned ${unassigned.length} sponsors.`);
  }

  const filtered = sponsors.filter(s => s.company.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div>
      <h1 style={S.pageTitle}>Sponsor Assignment</h1>
      <div style={S.card}>
        <div style={S.statRow}>
          {[{ label: "Total", val: sponsors.length, color: "#3b82f6" }, { label: "Assigned", val: sponsors.filter(s => s.assigned_member_id).length, color: "#22c55e" }, { label: "Unassigned", val: sponsors.filter(s => !s.assigned_member_id).length, color: "#f59e0b" }].map(s => (
            <div key={s.label} style={S.statCard}>
              <div style={{ ...S.statNum, color: s.color }}>{s.val}</div>
              <div style={S.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button onClick={autoAssign} disabled={autoLoading} style={S.btnPrimary}>{autoLoading ? "Assigning..." : "⚡ Auto-Assign Evenly"}</button>
        </div>
      </div>
      <div style={S.card}>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={S.cardTitle}>Individual Assignments</div>
          <input placeholder="Search..." value={filter} onChange={e => setFilter(e.target.value)} style={{ ...S.input, maxWidth: 220, marginBottom: 0 }} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Company</th><th style={S.th}>Status</th><th style={S.th}>Assigned To</th><th style={S.th}>Save</th>
            </tr></thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={S.td}>{s.company}</td>
                  <td style={S.td}><span style={{ ...S.roleBadge, background: "rgba(255,255,255,0.05)", color: "#64748b" }}>{s.status || "Not Contacted"}</span></td>
                  <td style={S.td}>
                    <select value={assignments[s.id] || ""} onChange={e => setAssignments({ ...assignments, [s.id]: e.target.value })} style={{ ...S.select, fontSize: 12 }}>
                      <option value="">Unassigned</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.full_name || m.username}</option>)}
                    </select>
                  </td>
                  <td style={S.td}>
                    <button onClick={() => { saveAssignment(s.id, assignments[s.id]); showToast(`✅ Saved: ${s.company}`); }} style={{ ...S.btnGhost, fontSize: 11, padding: "4px 10px" }}>Save</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── CAPTAINS ADMIN ────────────────────────────────────────
function CaptainsAdmin({ captains, reload, showToast }) {
  const [form, setForm] = useState({ name: "", position: "", bio: "", sort_order: 0 });
  const [photoFile, setPhotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [editPhotoFile, setEditPhotoFile] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const fileRef = useRef(null);
  const editFileRef = useRef(null);

  async function createCaptain() {
    if (!form.name || !form.position) return;
    setUploading(true);
    let photo_url = "";
    if (photoFile) { photo_url = await uploadImageToSupabase(photoFile) || ""; }
    await adminProxy('captains', 'insert', { ...form, photo_url });
    setForm({ name: "", position: "", bio: "", sort_order: 0 }); setPhotoFile(null);
    setUploading(false); reload(); showToast("✅ Person added.");
  }

  async function updateCaptain(id) {
    setUploading(true);
    let update = { ...editData };
    if (editPhotoFile) { const url = await uploadImageToSupabase(editPhotoFile); if (url) update.photo_url = url; }
    await adminProxy('captains', 'update', { id, updates: update });
    setEditId(null); setEditPhotoFile(null); setUploading(false); reload(); showToast("✅ Updated.");
  }

  async function deleteCaptain(id) {
    if (!confirm("Remove?")) return;
    await adminProxy('captains', 'delete', { id });
    reload(); showToast("🗑️ Removed.", "#ef4444");
  }

  async function handleDrop(e, targetId) {
    e.preventDefault();
    const sourceId = draggingId;
    if (!sourceId || sourceId === targetId) return;
    const ordered = [...captains].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const si = ordered.findIndex(c => c.id === sourceId);
    const ti = ordered.findIndex(c => c.id === targetId);
    const [moved] = ordered.splice(si, 1);
    ordered.splice(ti, 0, moved);
    await Promise.all(ordered.map((c, i) => sbFetch(`captains?id=eq.${c.id}`, { method: "PATCH", body: JSON.stringify({ sort_order: i }) })));
    setDraggingId(null); setDragOverId(null); reload(); showToast("✅ Order saved.");
  }

  return (
    <div>
      <h1 style={S.pageTitle}>Leadership</h1>
      <div style={S.card}>
        <div style={S.cardTitle}>Add Person</div>
        <div style={S.formCol}>
          <div style={S.formRow}>
            <input placeholder="Full Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={S.input} />
            <input placeholder="Position *" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} style={S.input} />
            <input placeholder="Order" type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} style={{ ...S.input, maxWidth: 100 }} />
          </div>
          <textarea placeholder="Bio (optional)" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} style={{ ...S.input, minHeight: 60, resize: "vertical" }} />
          <div style={S.formRow}>
            <button onClick={() => fileRef.current?.click()} style={S.btnGhost}>{photoFile ? `📸 ${photoFile.name}` : "Upload Photo"}</button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setPhotoFile(e.target.files[0])} />
            <button onClick={createCaptain} disabled={uploading} style={{ ...S.btnPrimary, opacity: uploading ? 0.6 : 1 }}>{uploading ? "Uploading..." : "Add Person"}</button>
          </div>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Current Leadership — Drag to reorder</div>
        {captains.map(c => (
          <div key={c.id} draggable onDragStart={() => setDraggingId(c.id)} onDragOver={e => { e.preventDefault(); setDragOverId(c.id); }} onDrop={e => handleDrop(e, c.id)} onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
            style={{ ...S.memberRow, opacity: draggingId === c.id ? 0.4 : 1, background: dragOverId === c.id && draggingId !== c.id ? "rgba(239,68,68,0.06)" : "transparent", border: dragOverId === c.id && draggingId !== c.id ? "1px dashed rgba(239,68,68,0.4)" : "1px solid transparent", cursor: "grab" }}>
            {editId === c.id ? (
              <div style={{ ...S.formCol, flex: 1 }}>
                <div style={S.formRow}>
                  <input value={editData.name || ""} onChange={e => setEditData({ ...editData, name: e.target.value })} style={S.input} placeholder="Name" />
                  <input value={editData.position || ""} onChange={e => setEditData({ ...editData, position: e.target.value })} style={S.input} placeholder="Position" />
                </div>
                <textarea value={editData.bio || ""} onChange={e => setEditData({ ...editData, bio: e.target.value })} style={{ ...S.input, minHeight: 50, resize: "vertical" }} placeholder="Bio" />
                <div style={S.formRow}>
                  <button onClick={() => editFileRef.current?.click()} style={S.btnGhost}>{editPhotoFile ? `📸 ${editPhotoFile.name}` : "Change Photo"}</button>
                  <input ref={editFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setEditPhotoFile(e.target.files[0])} />
                  <button onClick={() => updateCaptain(c.id)} disabled={uploading} style={S.btnPrimary}>Save</button>
                  <button onClick={() => setEditId(null)} style={S.btnGhost}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                  <span style={{ color: "#475569", fontSize: 18, cursor: "grab" }}>⠿</span>
                  <CaptainPhoto photoUrl={c.photo_url} name={c.name} size={48} />
                  <div>
                    <div style={S.memberName}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#ef4444", fontFamily: "monospace" }}>{c.position}</div>
                    {c.bio && <div style={{ fontSize: 11, color: "#64748b", maxWidth: 360 }}>{c.bio}</div>}
                  </div>
                </div>
                <div style={S.memberActions}>
                  <button onClick={() => { setEditId(c.id); setEditData({ name: c.name, position: c.position, bio: c.bio, sort_order: c.sort_order }); }} style={S.btnGhost}>Edit</button>
                  <button onClick={() => deleteCaptain(c.id)} style={S.btnDanger}>Remove</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SUGGESTIONS ───────────────────────────────────────────
function Suggestions({ suggestions, reload, showToast }) {
  async function del(id) {
    await adminProxy('suggestions', 'delete', { id });
    reload(); showToast("🗑️ Deleted.", "#ef4444");
  }
  return (
    <div>
      <h1 style={S.pageTitle}>Suggestions ({suggestions.length})</h1>
      {suggestions.length === 0 && <div style={{ color: "#64748b" }}>No suggestions yet.</div>}
      {suggestions.map(s => (
        <div key={s.id} style={{ ...S.card, marginBottom: 12 }}>
          <div style={{ color: "#f1f5f9", marginBottom: 8, lineHeight: 1.6 }}>{s.message}</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ color: "#64748b", fontSize: 12, fontFamily: "monospace" }}>{new Date(s.submitted_at).toLocaleString()}</div>
            <button onClick={() => del(s.id)} style={S.btnDanger}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SITE CONFIG ───────────────────────────────────────────
function SiteConfig({ config, logoUrl, setLogoUrl, reload, showToast }) {
  const [vals, setVals] = useState({});
  const [logoFile, setLogoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  useEffect(() => { setVals({ ...config }); }, [config]);

  async function saveKey(key) {
    const existing = (await sbFetch(`site_config?key=eq.${key}&select=key`)) || [];
    if (existing?.length) {
      await adminProxy('site_config', 'update', { id: existing[0].id, updates: { value: vals[key] } });
    } else {
      await adminProxy('site_config', 'insert', { key, value: vals[key] });
    }
    reload(); showToast(`✅ Saved: ${key}`);
  }

  async function uploadLogo() {
    if (!logoFile) return;
    setUploading(true);
    const url = await uploadImageToSupabase(logoFile);
    if (!url) { showToast("Upload failed.", "#ef4444"); setUploading(false); return; }
    const existing = await sbFetch("site_config?key=eq.logo_url&select=key");
    if (existing?.length) await sbFetch("site_config?key=eq.logo_url", { method: "PATCH", body: JSON.stringify({ value: url }) });
    else await sbFetch("site_config", { method: "POST", body: JSON.stringify({ key: "logo_url", value: url }) });
    setLogoUrl(url); setLogoFile(null); setUploading(false); reload(); showToast("✅ Logo updated!");
  }

  const fields = [
    { key: "site_title", label: "Site Title" }, { key: "team_email", label: "Team Email" },
    { key: "instagram", label: "Instagram URL" }, { key: "youtube", label: "YouTube URL" },
    { key: "tba_api_key", label: "TBA API Key" },
    { key: "donate_url", label: "Donate URL" }, { key: "season_year", label: "Season Year" },
  ];

  return (
    <div>
      <h1 style={S.pageTitle}>Site Configuration</h1>
      <div style={S.card}>
        <div style={S.cardTitle}>Team Logo</div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={logoUrl} alt="logo" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(239,68,68,0.4)" }} />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => fileRef.current?.click()} style={S.btnGhost}>{logoFile ? `📸 ${logoFile.name}` : "Choose Image"}</button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setLogoFile(e.target.files[0])} />
            {logoFile && <button onClick={uploadLogo} disabled={uploading} style={S.btnPrimary}>{uploading ? "Uploading..." : "Upload"}</button>}
          </div>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>Site Details</div>
        {fields.map(f => (
          <div key={f.key} style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
            <label style={{ color: "#94a3b8", fontSize: 12, minWidth: 120, fontFamily: "monospace" }}>{f.label}</label>
            <input value={vals[f.key] || ""} onChange={e => setVals({ ...vals, [f.key]: e.target.value })} style={{ ...S.input, flex: 1, marginBottom: 0 }} />
            <button onClick={() => saveKey(f.key)} style={S.btnGhost}>Save</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ADMIN SETTINGS ────────────────────────────────────────
function AdminSettings({ showToast }) {
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [saving, setSaving] = useState(false);

  async function changePassword() {
    setPwError("");
    if (!newPw) { setPwError("Password cannot be empty."); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match."); return; }
    if (newPw.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    setSaving(true);
    const existing = (await sbFetch("site_config?key=eq.admin_password&select=key")) || [];
    if (existing?.length) {
      await adminProxy('site_config', 'update', { id: existing[0].id, updates: { value: newPw } });
    } else {
      await adminProxy('site_config', 'insert', { key: 'admin_password', value: newPw });
    }
    setSaving(false); setNewPw(""); setConfirmPw("");
    showToast("✅ Admin password changed! Log out to test.");
  }

  return (
    <div>
      <h1 style={S.pageTitle}>Admin Settings</h1>
      <div style={S.card}>
        <div style={S.cardTitle}>Change Admin Password</div>
        <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16, fontFamily: "monospace" }}>
          This password is used to log into this admin panel. Current default: <code style={{ color: "#ef4444" }}>Admin@4550</code>
        </div>
        <div style={S.formCol}>
          <input type="password" placeholder="New admin password" value={newPw} onChange={e => { setNewPw(e.target.value); setPwError(""); }} style={{ ...S.input, borderColor: pwError ? "#ef4444" : undefined, maxWidth: 360 }} />
          <input type="password" placeholder="Confirm new password" value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setPwError(""); }} style={{ ...S.input, borderColor: pwError ? "#ef4444" : undefined, maxWidth: 360 }} />
          {pwError && <div style={{ color: "#ef4444", fontSize: 12, fontFamily: "monospace" }}>{pwError}</div>}
          <button onClick={changePassword} disabled={saving} style={{ ...S.btnPrimary, maxWidth: 200, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving..." : "Change Password"}
          </button>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>Database Setup</div>
        <div style={{ color: "#94a3b8", fontSize: 13, fontFamily: "monospace", lineHeight: 1.8 }}>
          Run this SQL in your Supabase SQL editor if you haven't already:<br />
          <code style={{ display: "block", background: "rgba(0,0,0,0.4)", padding: 12, borderRadius: 6, marginTop: 10, fontSize: 11, whiteSpace: "pre-wrap", color: "#93c5fd" }}>{`ALTER TABLE members ADD COLUMN IF NOT EXISTS subteam TEXT DEFAULT 'General';

CREATE TABLE IF NOT EXISTS scouting_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  team_number INT, match_number INT,
  alliance TEXT DEFAULT 'Red', scouter_name TEXT,
  auto_leave BOOLEAN DEFAULT FALSE,
  auto_coral_l1 INT DEFAULT 0, auto_coral_l2 INT DEFAULT 0,
  auto_coral_l3 INT DEFAULT 0, auto_coral_l4 INT DEFAULT 0,
  auto_algae_processor INT DEFAULT 0, auto_algae_net INT DEFAULT 0,
  teleop_coral_l1 INT DEFAULT 0, teleop_coral_l2 INT DEFAULT 0,
  teleop_coral_l3 INT DEFAULT 0, teleop_coral_l4 INT DEFAULT 0,
  teleop_algae_processor INT DEFAULT 0, teleop_algae_net INT DEFAULT 0,
  endgame TEXT DEFAULT 'None', defense BOOLEAN DEFAULT FALSE,
  defended BOOLEAN DEFAULT FALSE, died BOOLEAN DEFAULT FALSE,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS scouting_pits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  team_number INT, team_name TEXT, drivetrain TEXT,
  weight_lbs NUMERIC, auto_capabilities TEXT,
  teleop_capabilities TEXT, climb_type TEXT, notes TEXT,
  scouter_name TEXT, can_score_l1 BOOLEAN DEFAULT FALSE,
  can_score_l2 BOOLEAN DEFAULT FALSE, can_score_l3 BOOLEAN DEFAULT FALSE,
  can_score_l4 BOOLEAN DEFAULT FALSE, can_score_processor BOOLEAN DEFAULT FALSE,
  can_score_net BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS scouting_picklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  team_number INT, rank INT
);

ALTER TABLE competitions ADD COLUMN IF NOT EXISTS stream_url TEXT DEFAULT '';
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS map_status TEXT DEFAULT 'Pit map not posted yet.';
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS last_map_check TIMESTAMPTZ;
ALTER TABLE scouting_matches ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'human';`}</code>
        </div>
      </div>
    </div>
  );
}

// ── PIT MAP EDITOR ────────────────────────────────────────
function PitMapEditor({ comp, reload, showToast }) {
  const [pits, setPits] = useState(comp.schematic_data?.pits || []);
  const [img, setImg] = useState(null);
  const [dragging, setDragging] = useState(null);

  const addPit = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPits([...pits, { x, y, team: "" }]);
  };

  async function save() {
    await adminProxy('competitions', 'update', { id: comp.id, updates: { schematic_data: { pits } } });
    reload(); showToast("✅ Schematic saved.");
  }

  async function traceMap() {
    if (!comp.pit_map_url) return showToast("No pit map URL found to trace.", "#ef4444");
    showToast("🤖 AI is analyzing map... please wait.");
    try {
      const res = await fetch('/api/trace-pit-map', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ imageUrl: comp.pit_map_url }) 
      });
      if (!res.ok) throw new Error(await res.text());
      const { pits: aiPits } = await res.json();
      // Convert normalized (0-1) to percentage (0-100)
      const normalizedPits = aiPits.map(p => ({ ...p, x: p.x * 100, y: p.y * 100 }));
      setPits([...pits, ...normalizedPits]);
      showToast("✅ AI trace complete!");
    } catch (err) {
      showToast("AI Trace failed: " + err.message, "#ef4444");
    }
  }

  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={S.cardTitle}>Map: {comp.name}</div>
        <button onClick={traceMap} style={{ ...S.btnGhost, fontSize: 11, color: "#a855f7", border: "1px solid #a855f7" }}>✨ AI Trace Map</button>
      </div>
      <div style={{ position: "relative", cursor: "crosshair", border: "1px solid #444" }} onClick={addPit}>
        {comp.pit_map_url && <img src={comp.pit_map_url} style={{ width: "100%", opacity: 0.5 }} />}
        {pits.map((p, i) => (
          <div key={i} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, background: "red", color: "white", padding: "2px 5px", fontSize: "10px", borderRadius: 4, transform: "translate(-50%, -50%)" }}>
            <input value={p.team} onChange={e => { pits[i].team = e.target.value; setPits([...pits]); }} style={{ width: 30, background: "transparent", border: "none", color: "white", textAlign: "center" }} placeholder="#" />
          </div>
        ))}
      </div>
      <button onClick={save} style={{ ...S.btnPrimary, marginTop: 10 }}>Save Layout</button>
    </div>
  );
}
  const [search, setSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [frcEvents, setFrcEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [findingId, setFindingId] = useState(null);
  const [editMapId, setEditMapId] = useState(null);
  const [tbaKey, setTbaKey] = useState(config.tba_api_key || "");

  async function saveTbaKey() {
    if (!tbaKey.trim()) return;
    setSavingKey(true);
    const existing = await sbFetch("site_config?key=eq.tba_api_key&select=key");
    if (existing?.length) await sbFetch("site_config?key=eq.tba_api_key", { method: "PATCH", body: JSON.stringify({ value: tbaKey.trim() }) });
    else await sbFetch("site_config", { method: "POST", body: JSON.stringify({ key: "tba_api_key", value: tbaKey.trim() }) });
    setSavingKey(false);
    reload();
    showToast("TBA key saved.");
  }

  async function fetchFrcEvents() {
    if (!tbaKey) { showToast("TBA API key required.", "#ef4444"); return; }
    setLoading(true);
    try {
      const year = new Date().getFullYear();
      const res = await fetch(`https://www.thebluealliance.com/api/v3/events/${year}/simple`, { headers: { "X-TBA-Auth-Key": tbaKey } });
      if (!res.ok) throw new Error("Failed to fetch");
      const events = await res.json();
      setFrcEvents(events);
      showToast(`✅ Fetched ${events.length} events.`);
    } catch (e) {
      showToast("Failed to fetch events.", "#ef4444");
    }
    setLoading(false);
  }

  async function addCompetition(event) {
    const existing = competitions.find(c => c.event_key === event.key);
    if (existing) { showToast("Already added.", "#ef4444"); return; }
    const basePayload = {
      event_key: event.key,
      name: event.name,
      start_date: event.start_date,
      end_date: event.end_date,
      location: `${event.city}, ${event.state_prov}, ${event.country}`,
      attending: false,
      venue_map_url: "",
      pit_map_url: ""
    };
    const fullPayload = {
      ...basePayload,
      stream_url: "",
      map_status: "Pit map not posted yet.",
      last_map_check: null
    };
    let saved = await sbFetch("competitions", { method: "POST", body: JSON.stringify(fullPayload) });
    if (!saved) saved = await sbFetch("competitions", { method: "POST", body: JSON.stringify(basePayload) });
    if (!saved) { showToast("Competition save failed. Check Supabase table columns/RLS.", "#ef4444"); return; }
    reload(); showToast("✅ Competition added.");
  }

  async function toggleAttending(id, attending) {
    await sbFetch(`competitions?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ attending }) });
    reload();
    if (attending) {
      // Add to calendar
      const comp = competitions.find(c => c.id === id);
      if (comp) {
        const dupes = await sbFetch(`hub_calendar?title=eq.${encodeURIComponent(comp.name)}&date=eq.${comp.start_date}&select=id`);
        if (!dupes?.length) {
          await sbFetch("hub_calendar", { method: "POST", body: JSON.stringify({
            title: comp.name,
            type: "competition",
            date: comp.start_date,
            end_date: comp.end_date,
            description: `FRC Competition at ${comp.location}`
          }) });
        }
        showToast("✅ Added to calendar.");
      }
    }
  }

  async function updateMap(id, field, url) {
    await sbFetch(`competitions?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ [field]: url }) });
    reload(); showToast("✅ Map updated.");
  }

  async function saveCompetitionFields(id, payload, msg = "Competition updated.") {
    const saved = await sbFetch(`competitions?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(payload) });
    if (!saved) { showToast("Save failed. Run the Admin Settings SQL for the new columns.", "#ef4444"); return; }
    reload(); showToast(msg);
  }

  async function autoFindLinks(comp) {
    setFindingId(comp.id);
    try {
      const res = await fetch("/api/find-event-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: comp, tbaKey }),
      });
      const links = await res.json();
      if (!res.ok) throw new Error(links.error || "Lookup failed");
      const payload = {
        venue_map_url: links.venue_map_url || comp.venue_map_url || "",
        pit_map_url: links.pit_map_url || comp.pit_map_url || "",
        stream_url: links.stream_url || comp.stream_url || "",
        map_status: links.map_status || "AI assist checked likely sources.",
        last_map_check: new Date().toISOString(),
      };
      await saveCompetitionFields(comp.id, payload, "AI link search saved.");
    } catch (e) {
      showToast("AI link search failed.", "#ef4444");
    }
    setFindingId(null);
  }

  const filtered = competitions.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const eventFiltered = frcEvents.filter(ev => {
    const q = eventSearch.toLowerCase();
    return !q || ev.name?.toLowerCase().includes(q) || ev.city?.toLowerCase().includes(q) || ev.state_prov?.toLowerCase().includes(q) || ev.key?.toLowerCase().includes(q);
  });

  return (
    <div>
      <h1 style={S.pageTitle}>Competitions</h1>
      <div style={S.card}>
        <div style={S.cardTitle}>Fetch FRC Events</div>
        <div style={S.formRow}>
          <input placeholder="TBA API Key" value={tbaKey} onChange={e => setTbaKey(e.target.value)} style={S.input} />
          <button onClick={saveTbaKey} disabled={savingKey} style={S.btnGhost}>{savingKey ? "Saving..." : "Save Key"}</button>
          <button onClick={fetchFrcEvents} disabled={loading} style={S.btnPrimary}>{loading ? "Fetching..." : "Fetch Events"}</button>
        </div>
        {frcEvents.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ ...S.formRow, marginBottom: 12 }}>
              <input placeholder="Search FRC events by name, city, state, or key..." value={eventSearch} onChange={e => setEventSearch(e.target.value)} style={S.input} />
              <div style={{ color: "#64748b", fontFamily: "monospace", fontSize: 12 }}>{eventFiltered.length} events</div>
            </div>
            <div style={S.cardTitle}>Available Events</div>
            <div style={{ maxHeight: 360, overflowY: "auto", paddingRight: 4 }}>
            {eventFiltered.map(ev => (
              <div key={ev.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <div style={{ color: "#f1f5f9", fontSize: 14 }}>{ev.name}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>{ev.start_date} - {ev.city}, {ev.state_prov}</div>
                </div>
                <button onClick={() => addCompetition(ev)} disabled={competitions.some(c => c.event_key === ev.key)} style={{ ...S.btnGhost, opacity: competitions.some(c => c.event_key === ev.key) ? 0.45 : 1 }}>{competitions.some(c => c.event_key === ev.key) ? "Added" : "Add"}</button>
              </div>
            ))}
            </div>
          </div>
        )}
      </div>
      <div style={S.card}>
        <div style={S.formRow}>
          <input placeholder="Search competitions..." value={search} onChange={e => setSearch(e.target.value)} style={S.input} />
        </div>
        <div style={S.cardTitle}>Our Competitions</div>
        {filtered.map(c => (
          <div key={c.id} style={{ marginBottom: 16, padding: 16, background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <div style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 600 }}>{c.name}</div>
                <div style={{ color: "#64748b", fontSize: 12 }}>{c.start_date} - {c.location}</div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={c.attending} onChange={e => toggleAttending(c.id, e.target.checked)} />
                Attending
              </label>
            </div>
            <div style={S.formRow}>
              <input placeholder="Venue Map URL" defaultValue={c.venue_map_url || ""} onBlur={e => saveCompetitionFields(c.id, { venue_map_url: e.target.value }, "Venue map saved.")} style={S.input} />
              <input placeholder="Pit Map URL" defaultValue={c.pit_map_url || ""} onBlur={e => saveCompetitionFields(c.id, { pit_map_url: e.target.value }, "Pit map saved.")} style={S.input} />
              <input placeholder="Stream URL" defaultValue={c.stream_url || ""} onBlur={e => saveCompetitionFields(c.id, { stream_url: e.target.value }, "Stream saved.")} style={S.input} />
            </div>
            <div style={{ ...S.formRow, marginTop: 10 }}>
              <input placeholder="Map check status" defaultValue={c.map_status || ""} onBlur={e => saveCompetitionFields(c.id, { map_status: e.target.value, last_map_check: new Date().toISOString() }, "Map check saved.")} style={S.input} />
              <button onClick={() => autoFindLinks(c)} disabled={findingId === c.id} style={{ ...S.btnPrimary, opacity: findingId === c.id ? 0.65 : 1 }}>{findingId === c.id ? "Finding..." : "AI Find Links"}</button>
               <button onClick={() => setEditMapId(c.id)} style={S.btnGhost}>{editMapId === c.id ? "Close Editor" : "Map Editor"}</button>
               <a href={`https://www.thebluealliance.com/event/${c.event_key}`} target="_blank" rel="noreferrer" style={S.quickBtn}>TBA Event</a>
               <a href="/member-hub/venuemap" target="_blank" rel="noreferrer" style={S.quickBtn}>Preview Maps</a>
             </div>
           </div>
         )}
       </div>
     </div>
   );
}

// ── STYLES ────────────────────────────────────────────────
const S = {
  layout: { display: "flex", minHeight: "100vh", background: "#080a0f", color: "#f1f5f9", fontFamily: "'Exo 2', sans-serif" },
  sidebar: { width: 224, background: "#0a0e18", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" },
  sidebarBrand: { display: "flex", alignItems: "center", gap: 10, padding: "18px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  sidebarLogo: { width: 34, height: 34, borderRadius: "50%", objectFit: "cover" },
  sidebarTitle: { fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 700, color: "#ef4444", letterSpacing: 2 },
  sidebarSub: { fontSize: 10, color: "#64748b", fontFamily: "monospace" },
  sidebarNav: { flex: 1, padding: "10px 0" },
  navItem: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "11px 16px", border: "none", cursor: "pointer", fontFamily: "'Exo 2', sans-serif", fontSize: 13, textAlign: "left", transition: "all 0.15s" },
  badge: { background: "#ef4444", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700 },
  logoutBtn: { margin: "12px 16px", background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: 8, borderRadius: 4, cursor: "pointer", fontSize: 12, fontFamily: "monospace" },
  main: { flex: 1, padding: "32px 36px", overflowY: "auto" },
  pageTitle: { fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 20, color: "#f1f5f9", marginBottom: 24 },
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "22px", marginBottom: 18 },
  cardTitle: { fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: 1, marginBottom: 16 },
  statRow: { display: "flex", gap: 14, flexWrap: "wrap" },
  statCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "20px", minWidth: 140, textAlign: "center" },
  statNum: { fontFamily: "'Orbitron', sans-serif", fontSize: 24, fontWeight: 700 },
  statLabel: { fontSize: 11, color: "#64748b", fontFamily: "monospace", marginTop: 4 },
  alertBanner: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", borderRadius: 6, padding: "10px 16px", marginTop: 14, fontSize: 13 },
  quickLinks: { display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" },
  quickBtn: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", padding: "10px 18px", borderRadius: 8, textDecoration: "none", fontSize: 13 },
  formRow: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  formCol: { display: "flex", flexDirection: "column", gap: 10 },
  input: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "9px 12px", color: "#fff", fontSize: 13, fontFamily: "monospace", outline: "none", flex: 1, minWidth: 120 },
  select: { background: "#0a0e18", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "9px 12px", color: "#fff", fontSize: 13, fontFamily: "monospace", cursor: "pointer", flex: 1, minWidth: 120 },
  btnPrimary: { background: "#ef4444", border: "none", borderRadius: 6, padding: "9px 18px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" },
  btnGhost: { background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "9px 14px", color: "#94a3b8", cursor: "pointer", fontSize: 13, fontFamily: "monospace", whiteSpace: "nowrap" },
  btnDanger: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "9px 14px", color: "#ef4444", cursor: "pointer", fontSize: 13, fontFamily: "monospace", whiteSpace: "nowrap" },
  memberRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", minHeight: 64, gap: 10 },
  memberInfo: { display: "flex", alignItems: "center", gap: 10 },
  memberName: { color: "#f1f5f9", fontWeight: 600, fontSize: 14 },
  memberUser: { color: "#64748b", fontSize: 12, fontFamily: "monospace" },
  memberActions: { display: "flex", gap: 8, flexShrink: 0 },
  roleBadge: { borderRadius: 10, padding: "2px 10px", fontSize: 11, fontFamily: "monospace", flexShrink: 0 },
  taskColumns: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 },
  taskCol: { background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: 14 },
  taskColHeader: { fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 },
  taskCount: { background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "1px 8px", fontSize: 11 },
  taskCard: { borderRadius: 6, padding: 12, marginBottom: 8, border: "1px solid rgba(255,255,255,0.06)" },
  taskTitle: { color: "#f1f5f9", fontSize: 13, fontWeight: 600, marginBottom: 4 },
  taskDesc: { color: "#64748b", fontSize: 11, marginBottom: 6 },
  taskMeta: { display: "flex", gap: 10, fontSize: 11, color: "#64748b", fontFamily: "monospace", marginBottom: 6, flexWrap: "wrap" },
  taskActions: { display: "flex", gap: 6 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "8px 12px", fontFamily: "monospace", fontSize: 11, color: "#64748b", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  td: { padding: "8px 12px", fontSize: 13, color: "#f1f5f9" },
  loginBg: { minHeight: "100vh", background: "#080a0f", display: "flex", alignItems: "center", justifyContent: "center" },
  loginCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "48px 40px", textAlign: "center", width: "100%", maxWidth: 360 },
  loginTitle: { fontFamily: "'Orbitron', sans-serif", fontSize: 20, fontWeight: 700, color: "#ef4444", letterSpacing: 4, marginBottom: 6 },
  loginSub: { fontSize: 12, color: "#64748b", fontFamily: "monospace", marginBottom: 28 },
  loginForm: { display: "flex", flexDirection: "column", gap: 12 },
  loginInput: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "12px 16px", color: "#fff", fontSize: 14, fontFamily: "monospace", outline: "none", textAlign: "center" },
  loginErr: { color: "#ef4444", fontSize: 12, fontFamily: "monospace" },
  loginBtn: { background: "#ef4444", border: "none", borderRadius: 6, padding: 12, color: "#fff", fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 2, cursor: "pointer" },
  loginBack: { display: "block", marginTop: 24, color: "#64748b", fontSize: 12, fontFamily: "monospace", textDecoration: "none" },
};
