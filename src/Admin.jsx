import { useState, useEffect, useRef } from "react";

const ADMIN_PASSWORD = "Admin@4550";
const SUPABASE_URL = "https://ehkwxzumgizryvhkeusr.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoa3d4enVtZ2l6cnl2aGtldXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTEwODcsImV4cCI6MjA5MzI4NzA4N30.IXAhkAx1ygZpJMNSWNd3k80Hmt4rNmRtuFPnLZGcGuc";

async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("sbFetch error", res.status, text);
    return null;
  }
  try { return await res.json(); } catch { return null; }
}

async function uploadImageToSupabase(file) {
  const safeFileName = `${Date.now()}-${file.name}`
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/team-assets/${encodeURIComponent(safeFileName)}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": file.type,
        "x-upsert": "true",
      },
      body: file,
    }
  );
  if (!res.ok) {
    const text = await res.text();
    console.error("Supabase image upload failed", res.status, text);
    return null;
  }
  return `${SUPABASE_URL}/storage/v1/object/public/team-assets/${encodeURIComponent(safeFileName)}`;
}

const NAV = [
  { id: "overview", label: "📊 Overview" },
  { id: "accounts", label: "👥 Accounts" },
  { id: "hub-tasks", label: "📋 Hub Tasks" },
  { id: "hub-calendar", label: "📅 Hub Calendar" },
  { id: "sponsors-assign", label: "🤝 Sponsor Assignment" },
  { id: "captains", label: "🏆 Captains & Roles" },
  { id: "suggestions", label: "💡 Suggestions" },
  { id: "site", label: "⚙️ Site Config" },
];

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [page, setPage] = useState("overview");
  const [members, setMembers] = useState([]);
  const [tasks, setTaskList] = useState([]);
  const [hubCalendar, setHubCalendar] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [captains, setCaptains] = useState([]);
  const [config, setConfig] = useState({});
  const [logoUrl, setLogoUrl] = useState("/logo.jpg");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (localStorage.getItem("admin_authed") === "true") { setAuthed(true); loadAll(); }
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function loadAll() {
    const [m, t, cals, sg, sp, cap, cfg] = await Promise.all([
      sbFetch("members?select=*&order=created_at.asc"),
      sbFetch("hub_tasks?select=*&order=created_at.desc"),
      sbFetch("hub_calendar?select=*&order=date.asc"),
      sbFetch("suggestions?select=*&order=submitted_at.desc"),
      sbFetch("sponsors?select=*&order=company.asc"),
      sbFetch("captains?select=*&order=sort_order.asc"),
      sbFetch("site_config?select=key,value"),
    ]);
    if (m) setMembers(m);
    if (t) setTaskList(t);
    if (cals) setHubCalendar(cals);
    if (sg) setSuggestions(sg);
    if (sp) setSponsors(sp);
    if (cap) setCaptains(cap);
    if (cfg) {
      const obj = {};
      cfg.forEach(r => { obj[r.key] = r.value; });
      setConfig(obj);
      if (obj.logo_url) setLogoUrl(obj.logo_url);
    }
  }

  function handleLogin(e) {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      localStorage.setItem("admin_authed", "true");
      setAuthed(true);
      loadAll();
    } else setErr("Incorrect password.");
  }

  function handleLogout() {
    localStorage.removeItem("admin_authed");
    setAuthed(false);
  }

  if (!authed) {
    return (
      <div style={S.loginBg}>
        <div style={S.loginCard}>
          <div style={S.loginTitle}>ADMIN PANEL</div>
          <div style={S.loginSub}>FRC Team 4550 · Something's Bruin</div>
          <form onSubmit={handleLogin} style={S.loginForm}>
            <input type="password" placeholder="Admin password" value={pw} onChange={e => setPw(e.target.value)}
              style={S.loginInput} autoFocus />
            {err && <div style={S.loginErr}>{err}</div>}
            <button type="submit" style={S.loginBtn}>ENTER →</button>
          </form>
          <a href="/" style={S.loginBack}>← Back to site</a>
        </div>
      </div>
    );
  }

  const unread = suggestions.length;
  const overdue = tasks.filter(t => t.due_date && t.status !== "Done" && new Date(t.due_date) < new Date()).length;

  return (
    <div style={S.layout}>
      {toast && <div style={S.toast}>{toast}</div>}

      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.sidebarBrand}>
          <img src={logoUrl} alt="logo" style={S.sidebarLogo} />
          <div>
            <div style={S.sidebarTitle}>ADMIN</div>
            <div style={S.sidebarSub}>Team 4550</div>
          </div>
        </div>
        <nav style={S.sidebarNav}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              ...S.navItem,
              background: page === n.id ? "rgba(239,68,68,0.15)" : "transparent",
              color: page === n.id ? "#ef4444" : "#94a3b8",
              borderLeft: page === n.id ? "3px solid #ef4444" : "3px solid transparent",
            }}>
              {n.label}
              {n.id === "suggestions" && unread > 0 && (
                <span style={S.badge}>{unread}</span>
              )}
            </button>
          ))}
        </nav>
        <button onClick={handleLogout} style={S.logoutBtn}>Log Out</button>
      </aside>

      {/* Main */}
      <main style={S.main}>
        {page === "overview" && <Overview members={members} tasks={tasks} suggestions={suggestions} sponsors={sponsors} events={hubCalendar} overdue={overdue} />}
        {page === "accounts" && <Accounts members={members} reload={loadAll} showToast={showToast} />}
        {page === "hub-tasks" && <Tasks tasks={tasks} members={members} reload={loadAll} showToast={showToast} />}
        {page === "hub-calendar" && <HubCalendarAdmin events={hubCalendar} reload={loadAll} showToast={showToast} />}
        {page === "sponsors-assign" && <SponsorAssign sponsors={sponsors} members={members} reload={loadAll} showToast={showToast} />}
        {page === "captains" && <CaptainsAdmin captains={captains} reload={loadAll} showToast={showToast} />}
        {page === "suggestions" && <Suggestions suggestions={suggestions} reload={loadAll} showToast={showToast} />}
        {page === "site" && <SiteConfig config={config} logoUrl={logoUrl} setLogoUrl={setLogoUrl} reload={loadAll} showToast={showToast} />}
      </main>
    </div>
  );
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────
function Overview({ members, tasks, suggestions, sponsors, events, overdue }) {
  const [hovered, setHovered] = useState(null);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const openTasks = tasks.filter(t => t.status !== "Done");
  const dueToday = openTasks.filter(t => t.due_date === todayStr).length;
  const overdueTasks = openTasks.filter(t => t.due_date && new Date(t.due_date) < today);
  const overdueDays = overdueTasks.reduce((sum, task) => {
    const diff = Math.floor((today - new Date(task.due_date)) / 86400000);
    return sum + Math.max(0, diff);
  }, 0);
  const weekAhead = new Date(today);
  weekAhead.setDate(weekAhead.getDate() + 7);
  const upcomingEvents = events.filter(e => {
    if (!e?.date) return false;
    const d = new Date(e.date);
    return d >= today && d <= weekAhead;
  }).length;

  const stats = [
    { label: "Members", val: members.length, color: "#3b82f6" },
    { label: "Open Tasks", val: openTasks.length, color: "#f59e0b" },
    { label: "Due Today", val: dueToday, color: "#22c55e" },
    { label: "Overdue Tasks", val: overdueDays, color: "#ef4444" },
    { label: "Upcoming Events", val: upcomingEvents, color: "#3b82f6" },
    { label: "Suggestions", val: suggestions.length, color: "#a855f7" },
    { label: "Sponsors", val: sponsors.length, color: "#64748b" },
  ];

  return (
    <div>
      <h1 style={S.pageTitle}>Overview</h1>
      <div style={{ ...S.statRow, gap: 18 }}>
        {stats.map(s => (
          <div
            key={s.label}
            onMouseEnter={() => setHovered(s.label)}
            onMouseLeave={() => setHovered(null)}
            style={{
              ...S.statCard,
              borderColor: s.color,
              cursor: "default",
              boxShadow: hovered === s.label ? `0 0 24px ${s.color}33` : "none",
              transform: hovered === s.label ? "translateY(-4px) scale(1.01)" : "none",
            }}
          >
            <div style={{ ...S.statNum, color: s.color }}>{s.val}</div>
            <div style={S.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>
      {overdue > 0 && (
        <div style={S.alertBanner}>⚠️ {overdue} overdue task{overdue !== 1 ? "s" : ""}</div>
      )}
      <div style={S.quickLinks}>
        <a href="/" target="_blank" style={S.quickBtn}>Public Site ↗</a>
        <a href="/member-hub" target="_blank" style={S.quickBtn}>Member Hub ↗</a>
      </div>
    </div>
  );
}

// ── ACCOUNTS ─────────────────────────────────────────────────────────────
function Accounts({ members, reload, showToast }) {
  const [form, setForm] = useState({ username: "", password: "", full_name: "", role: "Member" });
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});

  async function createMember() {
    if (!form.username || !form.password) return;
    await sbFetch("members", { method: "POST", body: JSON.stringify(form) });
    setForm({ username: "", password: "", full_name: "", role: "Member" });
    reload(); showToast("Member created.");
  }

  async function updateMember(id) {
    await sbFetch(`members?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(editData) });
    setEditId(null); reload(); showToast("Member updated.");
  }

  async function deleteMember(id) {
    if (!confirm("Delete this member?")) return;
    await sbFetch(`members?id=eq.${id}`, { method: "DELETE" });
    reload(); showToast("Member deleted.");
  }

  const roleColor = { Member: "#64748b", Captain: "#3b82f6", Mentor: "#22c55e", Admin: "#ef4444" };

  return (
    <div>
      <h1 style={S.pageTitle}>Account Management</h1>
      <div style={S.card}>
        <div style={S.cardTitle}>Create Account</div>
        <div style={S.formRow}>
          {[["Username", "username"], ["Password", "password"], ["Full Name", "full_name"]].map(([lbl, key]) => (
            <input key={key} placeholder={lbl} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
              style={S.input} type={key === "password" ? "password" : "text"} />
          ))}
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={S.select}>
            {["Member", "Captain", "Mentor", "Admin"].map(r => <option key={r}>{r}</option>)}
          </select>
          <button onClick={createMember} style={S.btnPrimary}>Create</button>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>All Members ({members.length})</div>
        {members.map(m => (
          <div key={m.id} style={S.memberRow}>
            {editId === m.id ? (
              <div style={S.formRow}>
                <input placeholder="Full Name" value={editData.full_name || ""} onChange={e => setEditData({ ...editData, full_name: e.target.value })} style={S.input} />
                <input placeholder="New Password" value={editData.password || ""} onChange={e => setEditData({ ...editData, password: e.target.value })} style={S.input} type="password" />
                <select value={editData.role || m.role} onChange={e => setEditData({ ...editData, role: e.target.value })} style={S.select}>
                  {["Member", "Captain", "Mentor", "Admin"].map(r => <option key={r}>{r}</option>)}
                </select>
                <button onClick={() => updateMember(m.id)} style={S.btnPrimary}>Save</button>
                <button onClick={() => setEditId(null)} style={S.btnGhost}>Cancel</button>
              </div>
            ) : (
              <>
                <div style={S.memberInfo}>
                  <span style={S.memberName}>{m.full_name || m.username}</span>
                  <span style={S.memberUser}>@{m.username}</span>
                  <span style={{ ...S.roleBadge, background: `${roleColor[m.role] || "#64748b"}22`, color: roleColor[m.role] || "#64748b" }}>{m.role}</span>
                </div>
                <div style={S.memberActions}>
                  <button onClick={() => { setEditId(m.id); setEditData({ full_name: m.full_name, role: m.role }); }} style={S.btnGhost}>Edit</button>
                  <button onClick={() => deleteMember(m.id)} style={S.btnDanger}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TASKS ─────────────────────────────────────────────────────────────────
function Tasks({ tasks, members, reload, showToast }) {
  const [form, setForm] = useState({ title: "", description: "", assigned_to: "", assigned_name: "", due_date: "", priority: "Medium", status: "To Do" });

  async function createTask() {
    if (!form.title) return;
    const member = members.find(m => m.id === form.assigned_to);
    const payload = { ...form, assigned_name: member ? member.full_name || member.username : "" };
    await sbFetch("hub_tasks", { method: "POST", body: JSON.stringify(payload) });
    setForm({ title: "", description: "", assigned_to: "", assigned_name: "", due_date: "", priority: "Medium", status: "To Do" });
    reload(); showToast("Task created.");
  }

  async function updateStatus(id, status) {
    await sbFetch(`hub_tasks?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    reload();
  }

  async function deleteTask(id) {
    await sbFetch(`hub_tasks?id=eq.${id}`, { method: "DELETE" });
    reload(); showToast("Task deleted.");
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
            <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} style={S.select}>
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.full_name || m.username}</option>)}
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

function HubCalendarAdmin({ events, reload, showToast }) {
  const [form, setForm] = useState({ title: "", type: "event", date: "", end_date: "", time: "", description: "", all_day: true });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState("All");
  const EVENT_TYPES = [
    { value: "event", label: "Event" },
    { value: "deadline", label: "Deadline" },
    { value: "meeting", label: "Meeting" },
    { value: "competition", label: "Competition" },
    { value: "other", label: "Other" },
  ];

  async function saveEvent() {
    if (!form.title || !form.date) return showToast("Title and date required.");
    setSaving(true);
    if (editingId) {
      await sbFetch(`hub_calendar?id=eq.${editingId}`, { method: "PATCH", body: JSON.stringify(form) });
      showToast("Event updated.");
    } else {
      await sbFetch("hub_calendar", { method: "POST", body: JSON.stringify(form) });
      showToast("Event created.");
    }
    setSaving(false);
    setEditingId(null);
    setForm({ title: "", type: "event", date: "", end_date: "", time: "", description: "", all_day: true });
    reload();
  }

  function beginEdit(event) {
    setEditingId(event.id);
    setForm({ title: event.title || "", type: event.type || "event", date: event.date || "", end_date: event.end_date || "", time: event.time || "", description: event.description || "", all_day: event.all_day !== false });
  }

  async function deleteEvent(id) {
    if (!confirm("Delete this event?")) return;
    await sbFetch(`hub_calendar?id=eq.${id}`, { method: "DELETE" });
    showToast("Event deleted.");
    reload();
  }

  const filtered = filterType === "All" ? events : events.filter(e => e.type === filterType);

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
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...S.input, minHeight: 100, resize: "vertical" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ color: "#94a3b8", fontSize: 13, fontFamily: "monospace" }}>
              <input type="checkbox" checked={form.all_day} onChange={e => setForm({ ...form, all_day: e.target.checked })} style={{ marginRight: 6 }} /> All day event
            </label>
            <button onClick={saveEvent} disabled={saving} style={S.btnPrimary}>{saving ? "Saving..." : editingId ? "Save" : "Add Event"}</button>
            {editingId && <button onClick={() => { setEditingId(null); setForm({ title: "", type: "event", date: "", end_date: "", time: "", description: "", all_day: true }) }} style={S.btnGhost}>Cancel</button>}
          </div>
        </div>
      </div>
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={S.cardTitle}>Upcoming Events</div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...S.select, width: 180 }}>
            <option value="All">All Types</option>
            {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        {filtered.length === 0 ? (
          <div style={{ color: "#64748b", fontSize: 14 }}>No events yet.</div>
        ) : (
          filtered.map(event => (
            <div key={event.id} style={{ marginBottom: 14, padding: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 15, fontFamily: "'Orbitron', sans-serif", color: "#f1f5f9", fontWeight: 700 }}>{event.title}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace", marginTop: 4 }}>{event.type?.toUpperCase()} · {event.date}{event.time ? ` · ${event.time}` : ""}{event.end_date ? ` → ${event.end_date}` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => beginEdit(event)} style={S.btnGhost}>Edit</button>
                  <button onClick={() => deleteEvent(event.id)} style={S.btnDanger}>Delete</button>
                </div>
              </div>
              {event.description && <div style={{ marginTop: 10, color: "#94a3b8", lineHeight: 1.6 }}>{event.description}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── SPONSOR ASSIGNMENT ────────────────────────────────────────────────────
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
    await sbFetch(`sponsors?id=eq.${sponsorId}`, {
      method: "PATCH",
      body: JSON.stringify({
        assigned_member_id: memberId || null,
        assigned_member_name: member ? member.full_name || member.username : null,
      }),
    });
    reload();
  }

  async function autoAssign() {
    if (!members.length) return showToast("No members to assign.");
    setAutoLoading(true);
    const unassigned = sponsors.filter(s => !s.assigned_member_id);
    if (!unassigned.length) { setAutoLoading(false); return showToast("All sponsors already assigned."); }

    let idx = 0;
    for (const sponsor of unassigned) {
      const member = members[idx % members.length];
      await sbFetch(`sponsors?id=eq.${sponsor.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          assigned_member_id: member.id,
          assigned_member_name: member.full_name || member.username,
        }),
      });
      idx++;
    }
    reload();
    setAutoLoading(false);
    showToast(`Auto-assigned ${unassigned.length} sponsors evenly across ${members.length} members.`);
  }

  async function clearAll() {
    if (!confirm("Clear all sponsor assignments?")) return;
    for (const s of sponsors) {
      await sbFetch(`sponsors?id=eq.${s.id}`, {
        method: "PATCH",
        body: JSON.stringify({ assigned_member_id: null, assigned_member_name: null }),
      });
    }
    reload(); showToast("All assignments cleared.");
  }

  // Group by member
  const byMember = {};
  members.forEach(m => { byMember[m.id] = { member: m, sponsors: [] }; });
  byMember["unassigned"] = { member: null, sponsors: [] };
  sponsors.forEach(s => {
    if (s.assigned_member_id && byMember[s.assigned_member_id]) {
      byMember[s.assigned_member_id].sponsors.push(s);
    } else {
      byMember["unassigned"].sponsors.push(s);
    }
  });

  const filtered = sponsors.filter(s => s.company.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div>
      <h1 style={S.pageTitle}>Sponsor Assignment</h1>

      {/* Summary */}
      <div style={S.card}>
        <div style={S.cardTitle}>Assignment Overview</div>
        <div style={S.statRow}>
          <div style={S.statCard}>
            <div style={{ ...S.statNum, color: "#3b82f6" }}>{sponsors.length}</div>
            <div style={S.statLabel}>Total Sponsors</div>
          </div>
          <div style={S.statCard}>
            <div style={{ ...S.statNum, color: "#22c55e" }}>{sponsors.filter(s => s.assigned_member_id).length}</div>
            <div style={S.statLabel}>Assigned</div>
          </div>
          <div style={S.statCard}>
            <div style={{ ...S.statNum, color: "#f59e0b" }}>{sponsors.filter(s => !s.assigned_member_id).length}</div>
            <div style={S.statLabel}>Unassigned</div>
          </div>
          <div style={S.statCard}>
            <div style={{ ...S.statNum, color: "#a855f7" }}>{members.length}</div>
            <div style={S.statLabel}>Members</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
          <button onClick={autoAssign} disabled={autoLoading} style={{ ...S.btnPrimary, opacity: autoLoading ? 0.6 : 1 }}>
            {autoLoading ? "Assigning..." : "⚡ Auto-Assign Evenly"}
          </button>
          <button onClick={clearAll} style={S.btnDanger}>Clear All Assignments</button>
        </div>
        {members.length > 0 && (
          <div style={{ marginTop: 12, color: "#64748b", fontSize: 12, fontFamily: "monospace" }}>
            Each member gets ~{Math.ceil(sponsors.filter(s => !s.assigned_member_id).length / members.length)} unassigned sponsors
          </div>
        )}
      </div>

      {/* By Member breakdown */}
      <div style={S.card}>
        <div style={S.cardTitle}>By Member</div>
        {Object.values(byMember).map(({ member, sponsors: mSponsors }) => {
          if (!mSponsors.length && member) return null;
          return (
            <div key={member ? member.id : "unassigned"} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, color: member ? "#f1f5f9" : "#f59e0b", fontWeight: 700 }}>
                  {member ? member.full_name || member.username : "⚠️ Unassigned"}
                </span>
                <span style={{ ...S.roleBadge, background: "rgba(255,255,255,0.05)", color: "#64748b" }}>
                  {mSponsors.length} sponsor{mSponsors.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {mSponsors.map(s => (
                  <span key={s.id} style={S.sponsorChip}>{s.company}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Individual assignment table */}
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={S.cardTitle}>Individual Assignments</div>
          <input placeholder="Search sponsors..." value={filter} onChange={e => setFilter(e.target.value)} style={{ ...S.input, maxWidth: 220, marginBottom: 0 }} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Company</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Assigned To</th>
                <th style={S.th}>Save</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={S.td}>{s.company}</td>
                  <td style={S.td}>
                    <span style={{ ...S.roleBadge, background: "rgba(255,255,255,0.05)", color: "#64748b", fontSize: 11 }}>
                      {s.status || "Not Contacted"}
                    </span>
                  </td>
                  <td style={S.td}>
                    <select
                      value={assignments[s.id] || ""}
                      onChange={e => setAssignments({ ...assignments, [s.id]: e.target.value })}
                      style={{ ...S.select, fontSize: 12 }}
                    >
                      <option value="">Unassigned</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.full_name || m.username}</option>
                      ))}
                    </select>
                  </td>
                  <td style={S.td}>
                    <button
                      onClick={() => { saveAssignment(s.id, assignments[s.id]); showToast(`Saved: ${s.company}`); }}
                      style={{ ...S.btnGhost, fontSize: 11, padding: "4px 10px" }}
                    >Save</button>
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

// ── CAPTAINS ADMIN ────────────────────────────────────────────────────────
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
    if (!form.name || !form.position) return showToast("Name and position required.");
    setUploading(true);
    let photo_url = "";
    if (photoFile) {
      const url = await uploadImageToSupabase(photoFile);
      if (!url) {
        setUploading(false);
        return showToast("Photo upload failed. Please try again.");
      }
      photo_url = url;
    }
    await sbFetch("captains", { method: "POST", body: JSON.stringify({ ...form, photo_url }) });
    setForm({ name: "", position: "", bio: "", sort_order: 0 });
    setPhotoFile(null);
    setUploading(false);
    reload(); showToast("Captain added.");
  }

  async function updateCaptain(id) {
    setUploading(true);
    let update = { ...editData };
    if (editPhotoFile) {
      const url = await uploadImageToSupabase(editPhotoFile);
      if (!url) {
        setUploading(false);
        return showToast("Photo upload failed. Please try again.");
      }
      update.photo_url = url;
    }
    await sbFetch(`captains?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(update) });
    setEditId(null); setEditPhotoFile(null);
    setUploading(false);
    reload(); showToast("Captain updated.");
  }

  async function deleteCaptain(id) {
    if (!confirm("Remove this person?")) return;
    await sbFetch(`captains?id=eq.${id}`, { method: "DELETE" });
    reload(); showToast("Removed.");
  }

  async function reorderCaptains(sourceId, targetId) {
    if (!sourceId || sourceId === targetId) return;
    const ordered = [...captains].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const sourceIndex = ordered.findIndex(c => c.id === sourceId);
    const targetIndex = ordered.findIndex(c => c.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);

    const updates = ordered.map((captain, index) => {
      const newOrder = index;
      if ((captain.sort_order ?? 0) === newOrder) return null;
      return sbFetch(`captains?id=eq.${captain.id}`, { method: "PATCH", body: JSON.stringify({ sort_order: newOrder }) });
    }).filter(Boolean);

    if (updates.length) await Promise.all(updates);
    setDraggingId(null);
    setDragOverId(null);
    reload();
    showToast("Captain order updated.");
  }

  return (
    <div>
      <h1 style={S.pageTitle}>Captains & Leadership</h1>

      <div style={S.card}>
        <div style={S.cardTitle}>Add Person</div>
        <div style={S.formCol}>
          <div style={S.formRow}>
            <input placeholder="Full Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={S.input} />
            <input placeholder="Position / Role *" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} style={S.input} />
            <input placeholder="Display Order (0, 1, 2…)" type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} style={{ ...S.input, maxWidth: 160 }} />
          </div>
          <textarea placeholder="Short bio (optional)" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
            style={{ ...S.input, minHeight: 60, resize: "vertical" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => fileRef.current?.click()} style={S.btnGhost}>
              {photoFile ? `📸 ${photoFile.name}` : "Upload Photo"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setPhotoFile(e.target.files[0])} />
            <button onClick={createCaptain} disabled={uploading} style={{ ...S.btnPrimary, opacity: uploading ? 0.6 : 1 }}>
              {uploading ? "Uploading..." : "Add Person"}
            </button>
          </div>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Current Leadership ({captains.length})</div>
        <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 12, fontFamily: "monospace" }}>
          Drag and drop the captain rows to reorder leadership. Release to save the new order.
        </div>
        {captains.length === 0 && <div style={{ color: "#64748b", fontSize: 14 }}>No captains added yet.</div>}
        {captains.map((c, idx) => {
          const isDragging = draggingId === c.id;
          const isDragOver = dragOverId === c.id && draggingId !== c.id;
          return (
            <div
              key={c.id}
              draggable
              onDragStart={e => {
                setDraggingId(c.id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", c.id);
              }}
              onDragOver={e => {
                e.preventDefault();
                if (dragOverId !== c.id) setDragOverId(c.id);
                e.dataTransfer.dropEffect = "move";
              }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={e => {
                e.preventDefault();
                const sourceId = draggingId || e.dataTransfer.getData("text/plain");
                reorderCaptains(sourceId, c.id);
              }}
              onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
              style={{
                ...S.memberRow,
                cursor: "grab",
                opacity: isDragging ? 0.45 : 1,
                background: isDragOver ? "rgba(239,68,68,0.08)" : "transparent",
                border: isDragOver ? "1px dashed rgba(239,68,68,0.4)" : "1px solid transparent",
              }}
            >
              {editId === c.id ? (
              <div style={S.formCol}>
                <div style={S.formRow}>
                  <input placeholder="Name" value={editData.name || ""} onChange={e => setEditData({ ...editData, name: e.target.value })} style={S.input} />
                  <input placeholder="Position" value={editData.position || ""} onChange={e => setEditData({ ...editData, position: e.target.value })} style={S.input} />
                  <input placeholder="Order" type="number" value={editData.sort_order ?? ""} onChange={e => setEditData({ ...editData, sort_order: parseInt(e.target.value) || 0 })} style={{ ...S.input, maxWidth: 100 }} />
                </div>
                <textarea placeholder="Bio" value={editData.bio || ""} onChange={e => setEditData({ ...editData, bio: e.target.value })} style={{ ...S.input, minHeight: 60, resize: "vertical" }} />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => editFileRef.current?.click()} style={S.btnGhost}>
                    {editPhotoFile ? `📸 ${editPhotoFile.name}` : "Change Photo"}
                  </button>
                  <input ref={editFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setEditPhotoFile(e.target.files[0])} />
                  <button onClick={() => updateCaptain(c.id)} disabled={uploading} style={S.btnPrimary}>Save</button>
                  <button onClick={() => setEditId(null)} style={S.btnGhost}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                  <div style={S.dragHandle} title="Drag to reorder">⠿</div>
                  {c.photo_url ? (
                    <img src={c.photo_url} alt={c.name} onError={e => { e.target.onerror = null; e.target.src = "/logo.jpg"; }} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(239,68,68,0.3)" }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontWeight: 700 }}>
                      {c.name[0]}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={S.memberName}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#ef4444", fontFamily: "monospace" }}>{c.position}</div>
                    {c.bio && <div style={{ fontSize: 12, color: "#64748b", maxWidth: 400 }}>{c.bio}</div>}
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

// ── SUGGESTIONS ───────────────────────────────────────────────────────────
function Suggestions({ suggestions, reload, showToast }) {
  async function deleteSuggestion(id) {
    await sbFetch(`suggestions?id=eq.${id}`, { method: "DELETE" });
    reload(); showToast("Deleted.");
  }
  return (
    <div>
      <h1 style={S.pageTitle}>Suggestions ({suggestions.length})</h1>
      {suggestions.length === 0 && <div style={{ color: "#64748b" }}>No suggestions yet.</div>}
      {suggestions.map(s => (
        <div key={s.id} style={{ ...S.card, marginBottom: 12 }}>
          <div style={{ color: "#f1f5f9", marginBottom: 8 }}>{s.message}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: "#64748b", fontSize: 12, fontFamily: "monospace" }}>{new Date(s.submitted_at).toLocaleString()}</div>
            <button onClick={() => deleteSuggestion(s.id)} style={S.btnDanger}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SITE CONFIG ───────────────────────────────────────────────────────────
function SiteConfig({ config, logoUrl, setLogoUrl, reload, showToast }) {
  const [vals, setVals] = useState({});
  const [logoFile, setLogoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { setVals({ ...config }); }, [config]);

  async function saveKey(key) {
    const existing = await sbFetch(`site_config?key=eq.${key}&select=key`);
    if (existing && existing.length > 0) {
      await sbFetch(`site_config?key=eq.${key}`, { method: "PATCH", body: JSON.stringify({ value: vals[key] }) });
    } else {
      await sbFetch("site_config", { method: "POST", body: JSON.stringify({ key, value: vals[key] }) });
    }
    reload(); showToast(`Saved: ${key}`);
  }

  async function uploadLogo() {
    if (!logoFile) return;
    setUploading(true);
    const url = await uploadImageToSupabase(logoFile);
    if (!url) { showToast("Upload failed."); setUploading(false); return; }
    const existing = await sbFetch("site_config?key=eq.logo_url&select=key");
    if (existing && existing.length > 0) {
      await sbFetch("site_config?key=eq.logo_url", { method: "PATCH", body: JSON.stringify({ value: url }) });
    } else {
      await sbFetch("site_config", { method: "POST", body: JSON.stringify({ key: "logo_url", value: url }) });
    }
    setLogoUrl(url);
    setLogoFile(null);
    setUploading(false);
    reload(); showToast("Logo updated! Refresh the site to see it.");
  }

  const fields = [
    { key: "site_title", label: "Site Title" },
    { key: "team_email", label: "Team Email" },
    { key: "instagram", label: "Instagram URL" },
    { key: "youtube", label: "YouTube URL" },
    { key: "donate_url", label: "Donate URL" },
    { key: "redirect_url", label: "Redirect URL" },
    { key: "season_year", label: "Season Year" },
  ];

  return (
    <div>
      <h1 style={S.pageTitle}>Site Configuration</h1>

      {/* Logo upload */}
      <div style={S.card}>
        <div style={S.cardTitle}>Team Logo</div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={logoUrl} alt="Current logo" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(239,68,68,0.4)" }} />
          <div>
            <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8 }}>Upload a new logo to replace the current one site-wide.</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={() => fileRef.current?.click()} style={S.btnGhost}>
                {logoFile ? `📸 ${logoFile.name}` : "Choose Image"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setLogoFile(e.target.files[0])} />
              {logoFile && (
                <button onClick={uploadLogo} disabled={uploading} style={{ ...S.btnPrimary, opacity: uploading ? 0.6 : 1 }}>
                  {uploading ? "Uploading..." : "Upload Logo"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Config fields */}
      <div style={S.card}>
        <div style={S.cardTitle}>Site Details</div>
        {fields.map(f => (
          <div key={f.key} style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
            <label style={{ color: "#94a3b8", fontSize: 13, minWidth: 120, fontFamily: "monospace" }}>{f.label}</label>
            <input value={vals[f.key] || ""} onChange={e => setVals({ ...vals, [f.key]: e.target.value })} style={{ ...S.input, flex: 1, marginBottom: 0 }} />
            <button onClick={() => saveKey(f.key)} style={S.btnGhost}>Save</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────
const S = {
  layout: { display: "flex", minHeight: "100vh", background: "#080a0f", color: "#f1f5f9", fontFamily: "'Exo 2', sans-serif" },
  sidebar: { width: 220, background: "#0d1117", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", flexShrink: 0 },
  sidebarBrand: { display: "flex", alignItems: "center", gap: 10, padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  sidebarLogo: { width: 36, height: 36, borderRadius: "50%", objectFit: "cover" },
  sidebarTitle: { fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 700, color: "#ef4444", letterSpacing: 2 },
  sidebarSub: { fontSize: 10, color: "#64748b", fontFamily: "monospace" },
  sidebarNav: { flex: 1, padding: "12px 0" },
  navItem: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "11px 16px", border: "none", cursor: "pointer", fontFamily: "'Exo 2', sans-serif", fontSize: 13, textAlign: "left", transition: "all 0.15s" },
  badge: { background: "#ef4444", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700 },
  logoutBtn: { margin: "12px 16px", background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "8px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontFamily: "monospace" },
  main: { flex: 1, padding: "32px 40px", overflowY: "auto", maxHeight: "100vh" },
  pageTitle: { fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 22, color: "#f1f5f9", marginBottom: 28 },
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "24px", marginBottom: 20 },
  cardTitle: { fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 700, color: "#94a3b8", letterSpacing: 1, marginBottom: 18 },
  statRow: { display: "flex", gap: 16, flexWrap: "wrap" },
  statCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "24px 22px", minWidth: 180, minHeight: 140, textAlign: "center", transition: "all 0.22s ease", display: "flex", flexDirection: "column", justifyContent: "center" },
  statNum: { fontFamily: "'Orbitron', sans-serif", fontSize: 26, fontWeight: 700 },
  statLabel: { fontSize: 12, color: "#64748b", fontFamily: "monospace", marginTop: 4 },
  alertBanner: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", borderRadius: 6, padding: "10px 16px", marginTop: 16, fontSize: 13 },
  quickLinks: { display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" },
  quickBtn: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", padding: "12px 20px", borderRadius: 8, textDecoration: "none", fontSize: 14, minWidth: 160, textAlign: "center" },
  formRow: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  formCol: { display: "flex", flexDirection: "column", gap: 10 },
  input: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "9px 12px", color: "#fff", fontSize: 13, fontFamily: "monospace", outline: "none", marginBottom: 0 },
  select: { background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "9px 12px", color: "#fff", fontSize: 13, fontFamily: "monospace", cursor: "pointer" },
  btnPrimary: { background: "#ef4444", border: "none", borderRadius: 6, padding: "9px 18px", color: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "'Exo 2', sans-serif", fontWeight: 600, whiteSpace: "nowrap" },
  btnGhost: { background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "9px 14px", color: "#94a3b8", cursor: "pointer", fontSize: 13, fontFamily: "monospace", whiteSpace: "nowrap" },
  btnDanger: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "9px 14px", color: "#ef4444", cursor: "pointer", fontSize: 13, fontFamily: "monospace", whiteSpace: "nowrap" },
  memberRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s ease, border 0.2s ease, opacity 0.2s ease", minHeight: 80 },
  dragHandle: { width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(148,163,184,0.2)", background: "rgba(255,255,255,0.03)", color: "#94a3b8", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron', sans-serif", fontSize: 16, cursor: "grab", flexShrink: 0, transition: "background 0.2s" },
  dragHandle: { width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(148,163,184,0.2)", background: "rgba(255,255,255,0.03)", color: "#94a3b8", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron', sans-serif", fontSize: 16, cursor: "grab", flexShrink: 0, transition: "background 0.2s" },
  memberInfo: { display: "flex", alignItems: "center", gap: 10 },
  memberName: { color: "#f1f5f9", fontWeight: 600 },
  memberUser: { color: "#64748b", fontSize: 12, fontFamily: "monospace" },
  memberActions: { display: "flex", gap: 8 },
  roleBadge: { borderRadius: 10, padding: "2px 10px", fontSize: 11, fontFamily: "monospace" },
  taskColumns: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  taskCol: { background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: 16 },
  taskColHeader: { fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 },
  taskCount: { background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "1px 8px", fontSize: 11 },
  taskCard: { borderRadius: 6, padding: "12px", marginBottom: 10, border: "1px solid rgba(255,255,255,0.06)" },
  taskTitle: { color: "#f1f5f9", fontSize: 13, fontWeight: 600, marginBottom: 4 },
  taskDesc: { color: "#64748b", fontSize: 11, marginBottom: 8 },
  taskMeta: { display: "flex", gap: 12, fontSize: 11, color: "#64748b", fontFamily: "monospace", marginBottom: 8 },
  taskActions: { display: "flex", gap: 6 },
  sponsorChip: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "2px 8px", fontSize: 12, color: "#94a3b8", fontFamily: "monospace" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "8px 12px", fontFamily: "monospace", fontSize: 11, color: "#64748b", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  td: { padding: "8px 12px", fontSize: 13, color: "#f1f5f9" },
  toast: {
    position: "fixed", bottom: 24, right: 24, background: "#22c55e", color: "#fff",
    padding: "12px 20px", borderRadius: 8, fontFamily: "monospace", fontSize: 13,
    zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
    animation: "fadeUp 0.3s ease",
  },
  // login
  loginBg: { minHeight: "100vh", background: "#080a0f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Exo 2', sans-serif" },
  loginCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "48px 40px", textAlign: "center", width: "100%", maxWidth: 360 },
  loginTitle: { fontFamily: "'Orbitron', sans-serif", fontSize: 22, fontWeight: 700, color: "#ef4444", letterSpacing: 4, marginBottom: 6 },
  loginSub: { fontSize: 12, color: "#64748b", fontFamily: "monospace", marginBottom: 32 },
  loginForm: { display: "flex", flexDirection: "column", gap: 12 },
  loginInput: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "12px 16px", color: "#fff", fontSize: 14, fontFamily: "monospace", outline: "none", textAlign: "center" },
  loginErr: { color: "#ef4444", fontSize: 12, fontFamily: "monospace" },
  loginBtn: { background: "#ef4444", border: "none", borderRadius: 6, padding: "12px", color: "#fff", fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 2, cursor: "pointer" },
  loginBack: { display: "block", marginTop: 24, color: "#64748b", fontSize: 12, fontFamily: "monospace", textDecoration: "none" },
};
