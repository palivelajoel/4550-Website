import { useState, useEffect } from "react";
<<<<<<< Updated upstream
import { FONTS, C, TEAM_PASSWORD, sbFetch, SUPABASE_URL, SUPABASE_KEY } from "./hubUtils.jsx";
=======
import { FONTS, C, TEAM_PASSWORD, sbFetch } from "./hubUtils.js";
>>>>>>> Stashed changes

export default function Hub() {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [logoUrl, setLogoUrl] = useState("/logo.jpg");
  const [memberName, setMemberName] = useState("");
  const [taskCount, setTaskCount] = useState(0);
  const [announcementCount, setAnnouncementCount] = useState(0);

  useEffect(() => {
    loadLogo();
    if (localStorage.getItem("hub_authed") === "true") {
      setAuthed(true);
      setUsername(localStorage.getItem("hub_username") || "");
      loadStats();
    }
  }, []);

  async function loadLogo() {
    const r = await sbFetch("site_config?key=eq.logo_url&select=value");
    if (r?.[0]) setLogoUrl(r[0].value);
  }

  async function loadStats() {
    const u = localStorage.getItem("hub_username") || "";
    if (u) {
      const m = await sbFetch(`members?username=eq.${encodeURIComponent(u)}&select=full_name`);
      if (m?.[0]) setMemberName(m[0].full_name || u);
    }
    const t = await sbFetch("hub_tasks?status=neq.Done&select=id");
    if (t) setTaskCount(t.length);
    const a = await sbFetch("hub_announcements?select=id&order=created_at.desc&limit=5");
    if (a) setAnnouncementCount(a.length);
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!username.trim() || !pw.trim()) {
      setErr("Username and password required.");
      return;
    }

    const user = await sbFetch(`members?username=eq.${encodeURIComponent(username.trim())}&select=full_name,role,password`);
    if (user?.[0] && user[0].password === pw.trim()) {
      const role = user[0].role || "Member";
      localStorage.setItem("hub_authed", "true");
      localStorage.setItem("hub_username", username.trim());
      localStorage.setItem("hub_role", role);
      setAuthed(true);
      setErr("");
      loadStats();
      return;
    }

    if (pw === TEAM_PASSWORD) {
      localStorage.setItem("hub_authed", "true");
      localStorage.setItem("hub_username", username.trim());
      localStorage.setItem("hub_role", "Member");
      setAuthed(true);
      setErr("");
      loadStats();
      return;
    }

    setErr("Incorrect username or password.");
  }

  function logout() {
    localStorage.removeItem("hub_authed");
    localStorage.removeItem("hub_username");
    localStorage.removeItem("hub_role");
    setAuthed(false);
    setMemberName("");
  }

  const FEATURES = [
    { id: "projector", icon: "📡", label: "Meeting Projector", description: "Live rotating display of calendar, tasks & announcements. Fullscreen ready.", href: "/hub/projector", accent: "#ef4444", available: true, featured: true },
    { id: "calendar", icon: "📅", label: "Team Calendar", description: "Events, deadlines, and meetings. Add and manage the team schedule.", href: "/hub/calendar", accent: "#3b82f6", available: true },
    { id: "tasks", icon: "✅", label: "Task Board", description: "Monday.com-style board. Assign tasks by sub-team and member.", href: "/hub/tasks", accent: "#22c55e", available: true },
    { id: "announcements", icon: "📣", label: "Announcements", description: "Team-wide updates from captains and mentors.", href: "/hub/announcements", accent: "#f59e0b", available: true },
    { id: "media", icon: "📸", label: "Media Gallery", description: "Photos and videos from competitions and events. Upload new media.", href: "/hub/media", accent: "#a855f7", available: true },
    { id: "resources", icon: "📁", label: "Resources", description: "Design files, CAD, documents, and team guides.", href: "/hub/resources", accent: "#ec4899", available: true },
    { id: "sponsor-tracker", icon: "🤝", label: "Sponsor Tracker", description: "Manage team sponsors, contact info, and outreach status.", href: "/dashboard", accent: "#64748b", available: true },
  ];

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Exo 2', sans-serif" }}>
        <style>{FONTS}</style>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "48px 40px", textAlign: "center", width: "100%", maxWidth: 400 }}>
          <img src={logoUrl} alt="logo" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", marginBottom: 20 }} />
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 22, fontWeight: 700, color: C.red, letterSpacing: 4, marginBottom: 6 }}>4550 SOMETHING'S BRUIN HUB</div>
          <div style={{ fontSize: 12, color: C.dim, fontFamily: "'Share Tech Mono', monospace", marginBottom: 32 }}>Team members and captains only. Captains can edit tasks, events, and announcements.</div>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "12px 16px", color: "#fff", fontSize: 14, fontFamily: "'Share Tech Mono', monospace", textAlign: "center" }} />
            <input type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)}
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "12px 16px", color: "#fff", fontSize: 14, fontFamily: "'Share Tech Mono', monospace", textAlign: "center" }} />
            {err && <div style={{ color: C.red, fontSize: 12, fontFamily: "monospace" }}>{err}</div>}
            <button type="submit" style={{ background: C.red, border: "none", borderRadius: 6, padding: 12, color: "#fff", fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 2, cursor: "pointer" }}>ENTER HUB →</button>
          </form>
          <a href="/" style={{ display: "block", marginTop: 24, color: C.dim, fontSize: 12, fontFamily: "monospace", textDecoration: "none" }}>← Back to site</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Exo 2', sans-serif" }}>
      <style>{FONTS}</style>

      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: `1px solid ${C.border}`, background: "rgba(8,10,15,0.95)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={logoUrl} alt="logo" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }} />
          <div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 14, color: C.red, letterSpacing: 2 }}>MEMBER HUB</div>
            <div style={{ fontSize: 11, color: C.dim, fontFamily: "'Share Tech Mono', monospace" }}>FRC Team 4550 · Something's Bruin</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {memberName && <span style={{ fontSize: 13, color: C.muted, fontFamily: "'Share Tech Mono', monospace" }}>👋 {memberName}</span>}
          <a href="/" style={{ fontSize: 12, color: C.dim, textDecoration: "none", fontFamily: "monospace" }}>Public Site</a>
          <button onClick={logout} style={{ background: "transparent", border: `1px solid rgba(239,68,68,0.4)`, color: C.red, padding: "6px 14px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontFamily: "monospace" }}>Log Out</button>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        {/* Welcome row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36, flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 22, fontWeight: 700, color: C.text }}>
            {memberName ? `Welcome back, ${memberName.split(" ")[0]}.` : "Welcome back."}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {taskCount > 0 && (
              <div style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", color: "#93c5fd", padding: "7px 14px", borderRadius: 6, fontSize: 12, fontFamily: "monospace" }}>
                📋 {taskCount} open task{taskCount !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>

        {/* Featured projector card */}
        <ProjectorPreviewCard />

        {/* Feature grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18, marginTop: 24 }}>
          {FEATURES.filter(f => f.id !== "projector").map((f, i) => (
            <FeatureCard key={f.id} feature={f} index={i} />
          ))}
        </div>
      </main>

      <div style={{ textAlign: "center", padding: "24px", color: "#1e293b", fontSize: 11, fontFamily: "monospace", letterSpacing: 2 }}>
        BUILT BY PALIVELA_JOEL · FRC TEAM 4550
      </div>
    </div>
  );
}

function ProjectorPreviewCard() {
  return (
    <a href="/hub/projector" style={{ textDecoration: "none", display: "block" }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(59,130,246,0.08) 100%)",
        border: "1px solid rgba(239,68,68,0.3)",
        borderRadius: 14,
        padding: "24px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        flexWrap: "wrap",
        cursor: "pointer",
        transition: "all 0.2s",
        marginBottom: 8,
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(239,68,68,0.6)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ fontSize: 40 }}>📡</div>
          <div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, fontWeight: 700, color: C.red, letterSpacing: 2, marginBottom: 4 }}>MEETING PROJECTOR</div>
            <div style={{ color: C.muted, fontSize: 13 }}>Live rotating display — calendar, tasks & announcements. Click to open fullscreen.</div>
          </div>
        </div>
        <div style={{ background: C.red, color: "#fff", padding: "10px 22px", borderRadius: 6, fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 2, whiteSpace: "nowrap" }}>
          OPEN →
        </div>
      </div>
    </a>
  );
}

function FeatureCard({ feature, index }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => { if (feature.available && feature.href) { if (feature.href === "/dashboard") localStorage.setItem("sponsor_authed", "true"); window.location.href = feature.href; } }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.surface,
        border: `1px solid ${hovered && feature.available ? feature.accent : C.border}`,
        borderRadius: 12,
        padding: "26px 22px",
        cursor: feature.available ? "pointer" : "default",
        transition: "all 0.2s ease",
        transform: hovered && feature.available ? "translateY(-3px)" : "none",
        boxShadow: hovered && feature.available ? `0 0 20px ${feature.accent}28` : "none",
        opacity: feature.available ? 1 : 0.55,
        animation: `fadeUp 0.35s ease both`,
        animationDelay: `${index * 0.06}s`,
        position: "relative",
      }}
    >
      <div style={{ fontSize: 30, marginBottom: 12, color: feature.accent }}>{feature.icon}</div>
      <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 7, letterSpacing: 1 }}>{feature.label}</div>
      <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6 }}>{feature.description}</div>
      {feature.available && (
        <div style={{ marginTop: 14, fontSize: 12, fontFamily: "monospace", color: feature.accent, fontWeight: 700 }}>Open →</div>
      )}
    </div>
  );
}
