import { useState, useEffect } from "react";

const TEAM_PASSWORD = "Bruin@4550";

const SUPABASE_URL = "https://ehkwxzumgizryvhkeusr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoa3d4enVtZ2l6cnl2aGtldXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTEwODcsImV4cCI6MjA5MzI4NzA4N30.IXAhkAx1ygZpJMNSWNd3k80Hmt4rNmRtuFPnLZGcGuc";

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
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

const FEATURES = [
  {
    id: "sponsor-tracker",
    icon: "🤝",
    label: "Sponsor Tracker",
    description: "Manage team sponsors, contact info, and outreach status.",
    href: "/dashboard",
    available: true,
    accent: "#3b82f6",
  },
  {
    id: "tasks",
    icon: "✅",
    label: "Task Board",
    description: "View tasks assigned to you and track progress.",
    href: null,
    available: false,
    accent: "#22c55e",
    badge: "Coming Soon",
  },
  {
    id: "calendar",
    icon: "📅",
    label: "Team Calendar",
    description: "Upcoming meetings, competitions, and deadlines.",
    href: null,
    available: false,
    accent: "#f59e0b",
    badge: "Coming Soon",
  },
  {
    id: "media",
    icon: "📸",
    label: "Media Gallery",
    description: "Photos and videos from competitions and events.",
    href: null,
    available: false,
    accent: "#a855f7",
    badge: "Coming Soon",
  },
  {
    id: "resources",
    icon: "📁",
    label: "Resources",
    description: "Design files, CAD, documents, and team guides.",
    href: null,
    available: false,
    accent: "#ec4899",
    badge: "Coming Soon",
  },
  {
    id: "announcements",
    icon: "📣",
    label: "Announcements",
    description: "Team-wide updates from captains and mentors.",
    href: null,
    available: false,
    accent: "#ef4444",
    badge: "Coming Soon",
  },
];

export default function Hub() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [memberName, setMemberName] = useState("");
  const [logoUrl, setLogoUrl] = useState("/logo.jpg");
  const [tasks, setTasks] = useState([]);
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("hub_authed");
    if (saved === "true") {
      setAuthed(true);
      loadData();
    }
    loadLogo();
  }, []);

  async function loadLogo() {
    const res = await sbFetch("site_config?key=eq.logo_url&select=value");
    if (res && res[0]) setLogoUrl(res[0].value);
  }

  async function loadData() {
    const username = localStorage.getItem("hub_username") || "";
    if (username) {
      const members = await sbFetch(`members?username=eq.${encodeURIComponent(username)}&select=full_name`);
      if (members && members[0]) setMemberName(members[0].full_name || username);
    }
    const allTasks = await sbFetch("tasks?status=neq.Done&select=id");
    if (allTasks) setTaskCount(allTasks.length);
  }

  function handleLogin(e) {
    e.preventDefault();
    if (pw === TEAM_PASSWORD) {
      localStorage.setItem("hub_authed", "true");
      setAuthed(true);
      setErr("");
      loadData();
    } else {
      setErr("Incorrect password.");
    }
  }

  function handleLogout() {
    localStorage.removeItem("hub_authed");
    localStorage.removeItem("hub_username");
    setAuthed(false);
    setMemberName("");
  }

  if (!authed) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.loginCard}>
          <img src={logoUrl} alt="Team Logo" style={styles.loginLogo} />
          <div style={styles.loginTitle}>MEMBER HUB</div>
          <div style={styles.loginSub}>FRC Team 4550 · Something's Bruin</div>
          <form onSubmit={handleLogin} style={styles.loginForm}>
            <input
              type="password"
              placeholder="Team password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              style={styles.loginInput}
              autoFocus
            />
            {err && <div style={styles.loginErr}>{err}</div>}
            <button type="submit" style={styles.loginBtn}>ENTER HUB →</button>
          </form>
          <a href="/" style={styles.loginBack}>← Back to site</a>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.bg}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <img src={logoUrl} alt="logo" style={styles.headerLogo} />
          <div>
            <div style={styles.headerTitle}>MEMBER HUB</div>
            <div style={styles.headerSub}>FRC Team 4550 · Something's Bruin</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          {memberName && <span style={styles.memberBadge}>👋 {memberName}</span>}
          <a href="/" style={styles.navLink}>Public Site</a>
          <button onClick={handleLogout} style={styles.logoutBtn}>Log Out</button>
        </div>
      </header>

      {/* Main content */}
      <main style={styles.main}>
        <div style={styles.welcomeRow}>
          <div style={styles.welcomeText}>
            {memberName ? `Welcome back, ${memberName.split(" ")[0]}.` : "Welcome back."}
          </div>
          {taskCount > 0 && (
            <div style={styles.taskAlert}>
              📋 {taskCount} open task{taskCount !== 1 ? "s" : ""} on the board
            </div>
          )}
        </div>

        <div style={styles.grid}>
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.id} feature={f} index={i} />
          ))}
        </div>
      </main>

      <div style={styles.watermark}>BUILT BY PALIVELA_JOEL · FRC TEAM 4550</div>
    </div>
  );
}

function FeatureCard({ feature, index }) {
  const [hovered, setHovered] = useState(false);

  function handleClick() {
    if (feature.available && feature.href) {
      // Pass auth through to Sponsor Tracker
      if (feature.href === "/dashboard") {
        localStorage.setItem("sponsor_authed", "true");
      }
      window.location.href = feature.href;
    }
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles.card,
        borderColor: hovered && feature.available ? feature.accent : "rgba(255,255,255,0.08)",
        boxShadow: hovered && feature.available ? `0 0 24px ${feature.accent}33` : "none",
        cursor: feature.available ? "pointer" : "default",
        opacity: feature.available ? 1 : 0.6,
        transform: hovered && feature.available ? "translateY(-4px)" : "none",
        animationDelay: `${index * 0.07}s`,
      }}
    >
      {feature.badge && (
        <div style={{ ...styles.badge, background: `${feature.accent}22`, color: feature.accent }}>
          {feature.badge}
        </div>
      )}
      <div style={{ ...styles.cardIcon, color: feature.accent }}>{feature.icon}</div>
      <div style={styles.cardLabel}>{feature.label}</div>
      <div style={styles.cardDesc}>{feature.description}</div>
      {feature.available && (
        <div style={{ ...styles.cardArrow, color: feature.accent }}>Open →</div>
      )}
    </div>
  );
}

const styles = {
  bg: {
    minHeight: "100vh",
    background: "#080a0f",
    color: "#fff",
    fontFamily: "'Exo 2', sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 32px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(8,10,15,0.95)",
    backdropFilter: "blur(12px)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  headerLogo: { width: 40, height: 40, borderRadius: "50%", objectFit: "cover" },
  headerTitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 700,
    fontSize: 15,
    color: "#ef4444",
    letterSpacing: 2,
  },
  headerSub: { fontSize: 11, color: "#64748b", fontFamily: "'Share Tech Mono', monospace" },
  headerRight: { display: "flex", alignItems: "center", gap: 16 },
  memberBadge: {
    fontSize: 13,
    color: "#94a3b8",
    fontFamily: "'Share Tech Mono', monospace",
  },
  navLink: {
    fontSize: 13,
    color: "#64748b",
    textDecoration: "none",
    fontFamily: "'Share Tech Mono', monospace",
    transition: "color 0.2s",
  },
  logoutBtn: {
    background: "transparent",
    border: "1px solid rgba(239,68,68,0.4)",
    color: "#ef4444",
    padding: "6px 14px",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "'Share Tech Mono', monospace",
    letterSpacing: 1,
  },
  main: { maxWidth: 1100, margin: "0 auto", padding: "48px 24px" },
  welcomeRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 40,
    flexWrap: "wrap",
    gap: 12,
  },
  welcomeText: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: 24,
    fontWeight: 700,
    color: "#f1f5f9",
  },
  taskAlert: {
    background: "rgba(59,130,246,0.12)",
    border: "1px solid rgba(59,130,246,0.3)",
    color: "#93c5fd",
    padding: "8px 16px",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "'Share Tech Mono', monospace",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 20,
  },
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "28px 24px",
    transition: "all 0.25s ease",
    position: "relative",
    animation: "fadeInUp 0.4s ease both",
  },
  badge: {
    position: "absolute",
    top: 16,
    right: 16,
    fontSize: 10,
    padding: "3px 8px",
    borderRadius: 20,
    fontFamily: "'Share Tech Mono', monospace",
    letterSpacing: 1,
  },
  cardIcon: { fontSize: 32, marginBottom: 14 },
  cardLabel: {
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 700,
    fontSize: 14,
    color: "#f1f5f9",
    marginBottom: 8,
    letterSpacing: 1,
  },
  cardDesc: { fontSize: 13, color: "#64748b", lineHeight: 1.6 },
  cardArrow: {
    marginTop: 16,
    fontSize: 13,
    fontFamily: "'Share Tech Mono', monospace",
    fontWeight: 700,
  },
  watermark: {
    textAlign: "center",
    padding: "24px",
    color: "#1e293b",
    fontSize: 11,
    fontFamily: "'Share Tech Mono', monospace",
    letterSpacing: 2,
  },
  // Login
  loginBg: {
    minHeight: "100vh",
    background: "#080a0f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Exo 2', sans-serif",
  },
  loginCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: "48px 40px",
    textAlign: "center",
    width: "100%",
    maxWidth: 380,
  },
  loginLogo: { width: 72, height: 72, borderRadius: "50%", objectFit: "cover", marginBottom: 20 },
  loginTitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: 22,
    fontWeight: 700,
    color: "#ef4444",
    letterSpacing: 4,
    marginBottom: 6,
  },
  loginSub: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: "'Share Tech Mono', monospace",
    marginBottom: 32,
  },
  loginForm: { display: "flex", flexDirection: "column", gap: 12 },
  loginInput: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6,
    padding: "12px 16px",
    color: "#fff",
    fontSize: 14,
    fontFamily: "'Share Tech Mono', monospace",
    outline: "none",
    textAlign: "center",
  },
  loginErr: { color: "#ef4444", fontSize: 12, fontFamily: "'Share Tech Mono', monospace" },
  loginBtn: {
    background: "#ef4444",
    border: "none",
    borderRadius: 6,
    padding: "12px",
    color: "#fff",
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: 2,
    cursor: "pointer",
  },
  loginBack: {
    display: "block",
    marginTop: 24,
    color: "#64748b",
    fontSize: 12,
    fontFamily: "'Share Tech Mono', monospace",
    textDecoration: "none",
  },
};
