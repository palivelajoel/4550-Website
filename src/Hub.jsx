import { useState, useEffect, useRef } from "react";
import { FONTS, C, ROLE_COLORS, SUBTEAM_COLORS, TEAM_PASSWORD, sbFetch, SUPABASE_URL, SUPABASE_KEY, isAuthed, getRole, getUsername, getSubteam, isCaptainOrAbove, isAdmin } from "./hubUtils.jsx";

export default function Hub() {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [logoUrl, setLogoUrl] = useState("/logo.jpg");
  const [memberName, setMemberName] = useState("");
  const [taskCount, setTaskCount] = useState(0);
  const [role, setRole] = useState("Member");
  const [subteam, setSubteam] = useState("General");
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    loadLogo();
    if (localStorage.getItem("hub_authed") === "true") {
      setAuthed(true);
      setUsername(localStorage.getItem("hub_username") || "");
      setRole(localStorage.getItem("hub_role") || "Member");
      setSubteam(localStorage.getItem("hub_subteam") || "General");
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
      const m = await sbFetch(`members?username=eq.${encodeURIComponent(u)}&select=full_name,subteam`);
      if (m?.[0]) {
        setMemberName(m[0].full_name || u);
        if (m[0].subteam) {
          setSubteam(m[0].subteam);
          localStorage.setItem("hub_subteam", m[0].subteam);
        }
      }
    }
    const t = await sbFetch("hub_tasks?status=neq.Done&select=id");
    if (t) setTaskCount(t.length);
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!username.trim() || !pw.trim()) { setErr("Username and password required."); return; }
    setLoginLoading(true);

    const user = await sbFetch(`members?username=eq.${encodeURIComponent(username.trim())}&select=full_name,role,password,subteam`);
    if (user?.[0] && user[0].password === pw.trim()) {
      const r = user[0].role || "Member";
      localStorage.setItem("hub_authed", "true");
      localStorage.setItem("hub_username", username.trim());
      localStorage.setItem("hub_role", r);
      localStorage.setItem("hub_subteam", user[0].subteam || "General");
      setAuthed(true); setRole(r); setErr(""); setLoginLoading(false);
      loadStats(); return;
    }
    if (pw === TEAM_PASSWORD) {
      localStorage.setItem("hub_authed", "true");
      localStorage.setItem("hub_username", username.trim());
      localStorage.setItem("hub_role", "Member");
      localStorage.setItem("hub_subteam", "General");
      setAuthed(true); setRole("Member"); setErr(""); setLoginLoading(false);
      loadStats(); return;
    }
    setErr("Incorrect username or password.");
    setLoginLoading(false);
  }

  function logout() {
    localStorage.removeItem("hub_authed");
    localStorage.removeItem("hub_username");
    localStorage.removeItem("hub_role");
    localStorage.removeItem("hub_subteam");
    setAuthed(false); setMemberName(""); setRole("Member");
  }

  const currentRole = localStorage.getItem("hub_role") || "Member";
  const currentSubteam = localStorage.getItem("hub_subteam") || "General";
  const isCaptain = ["Captain", "Admin"].includes(currentRole);
  const isAdminUser = currentRole === "Admin";

  const FEATURES = [
    { id: "projector", icon: "📡", label: "Meeting Projector", description: "Live rotating display of calendar, tasks & announcements. Fullscreen ready.", href: "/member-hub/projector", accent: "#ef4444", featured: true },
    { id: "calendar", icon: "📅", label: "Team Calendar", description: "Events, deadlines, and meetings.", href: "/member-hub/calendar", accent: "#3b82f6" },
    { id: "tasks", icon: "✅", label: "Task Board", description: "Kanban board. View and update your tasks.", href: "/member-hub/tasks", accent: "#22c55e" },
    { id: "announcements", icon: "📣", label: "Announcements", description: "Team-wide updates from captains.", href: "/member-hub/announcements", accent: "#f59e0b" },
    { id: "scouting", icon: "🔭", label: "Scouting", description: "Match & pit scouting, team data, alliance picklist for competitions.", href: "/member-hub/scouting", accent: "#a855f7" },
    { id: "media", icon: "📸", label: "Media Gallery", description: "Photos and videos from competitions and events.", href: "/member-hub/media", accent: "#ec4899" },
    { id: "resources", icon: "📁", label: "Resources", description: "Design files, CAD, documents, and team guides.", href: "/member-hub/resources", accent: "#64748b" },
    { id: "sponsor-tracker", icon: "🤝", label: "Sponsor Tracker", description: "Manage team sponsors, contact info, and outreach status.", href: "/dashboard", accent: "#0ea5e9" },
  ];

  // ── Login screen ──────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Exo 2', sans-serif", position: "relative", overflow: "hidden" }}>
        <style>{FONTS + `
          @keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-14px);}}
          @keyframes rotateGrad{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}
          .login-glow{animation:glow 2.5s ease-in-out infinite;}
        `}</style>

        {/* Animated background orbs */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          {[
            { w: 400, h: 400, top: "-10%", left: "-10%", color: "rgba(239,68,68,0.08)" },
            { w: 300, h: 300, bottom: "-5%", right: "-5%", color: "rgba(59,130,246,0.06)" },
            { w: 200, h: 200, top: "40%", right: "20%", color: "rgba(168,85,247,0.05)" },
          ].map((orb, i) => (
            <div key={i} style={{ position: "absolute", width: orb.w, height: orb.h, top: orb.top, bottom: orb.bottom, left: orb.left, right: orb.right, borderRadius: "50%", background: `radial-gradient(circle, ${orb.color}, transparent)`, animation: `float ${4 + i}s ease-in-out infinite`, animationDelay: `${i * 0.8}s` }} />
          ))}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(239,68,68,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(239,68,68,0.03) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        </div>

        <div style={{ background: "rgba(13,17,23,0.9)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 20, padding: "48px 40px", textAlign: "center", width: "100%", maxWidth: 400, position: "relative", backdropFilter: "blur(20px)", animation: "fadeUp 0.5s ease" }}>
          <div style={{ position: "absolute", inset: -1, borderRadius: 20, background: "linear-gradient(135deg, rgba(239,68,68,0.3), transparent, rgba(59,130,246,0.2))", padding: 1, zIndex: -1 }}>
            <div style={{ background: "rgba(13,17,23,0.95)", borderRadius: 19, width: "100%", height: "100%" }} />
          </div>

          <img src={logoUrl} alt="logo" style={{ width: 76, height: 76, borderRadius: "50%", objectFit: "cover", marginBottom: 20, border: "2px solid rgba(239,68,68,0.5)", boxShadow: "0 0 30px rgba(239,68,68,0.3)", animation: "float 3s ease-in-out infinite" }} />
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 20, fontWeight: 700, color: C.red, letterSpacing: 3, marginBottom: 4 }}>MEMBER HUB</div>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: C.dim, letterSpacing: 2, marginBottom: 8 }}>FRC TEAM 4550</div>
          <div style={{ fontSize: 12, color: C.dim, fontFamily: "monospace", marginBottom: 28 }}>Sign in with your team account</div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: 14, fontFamily: "monospace", textAlign: "center", transition: "border-color 0.2s" }}
              onFocus={e => e.target.style.borderColor = "rgba(239,68,68,0.5)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            <input type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: 14, fontFamily: "monospace", textAlign: "center", transition: "border-color 0.2s" }}
              onFocus={e => e.target.style.borderColor = "rgba(239,68,68,0.5)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            {err && <div style={{ color: C.red, fontSize: 12, fontFamily: "monospace", animation: "fadeUp 0.3s ease" }}>{err}</div>}
            <button type="submit" disabled={loginLoading} className="login-glow" style={{ background: C.red, border: "none", borderRadius: 8, padding: 13, color: "#fff", fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 2, cursor: "pointer", opacity: loginLoading ? 0.7 : 1, transition: "all 0.2s" }}>
              {loginLoading ? "AUTHENTICATING..." : "ENTER HUB →"}
            </button>
          </form>
          <a href="/" style={{ display: "block", marginTop: 24, color: C.dim, fontSize: 12, fontFamily: "monospace", textDecoration: "none" }}>← Back to public site</a>
        </div>
      </div>
    );
  }

  // ── Hub dashboard ────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Exo 2', sans-serif" }}>
      <style>{FONTS + `
        @keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-8px);}}
        @keyframes scanGlow{0%,100%{opacity:0.4;}50%{opacity:1;}}
        .feature-card{transition:all 0.25s ease;}
        .feature-card:hover{transform:translateY(-4px);}
      `}</style>

      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px", borderBottom: `1px solid ${C.border}`, background: "rgba(8,10,15,0.97)", backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={logoUrl} alt="logo" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(239,68,68,0.4)" }} />
          <div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 13, color: C.red, letterSpacing: 2 }}>MEMBER HUB</div>
            <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace" }}>FRC Team 4550 · Something's Bruin</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {memberName && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: C.muted, fontFamily: "monospace" }}>👋 {memberName}</span>
              <span style={{ fontSize: 10, background: `${ROLE_COLORS[currentRole] || "#64748b"}22`, color: ROLE_COLORS[currentRole] || "#64748b", border: `1px solid ${ROLE_COLORS[currentRole] || "#64748b"}44`, borderRadius: 10, padding: "2px 9px", fontFamily: "monospace" }}>{currentRole}</span>
              {currentSubteam !== "General" && (
                <span style={{ fontSize: 10, background: "rgba(255,255,255,0.05)", color: C.dim, borderRadius: 10, padding: "2px 9px", fontFamily: "monospace" }}>{currentSubteam}</span>
              )}
            </div>
          )}
          {isAdminUser && <a href="/admin" style={{ fontSize: 11, color: C.red, textDecoration: "none", fontFamily: "monospace", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 4, padding: "4px 10px" }}>Admin Panel</a>}
          <a href="/" style={{ fontSize: 12, color: C.dim, textDecoration: "none", fontFamily: "monospace" }}>Public Site</a>
          <button onClick={logout} style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: C.red, padding: "6px 14px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontFamily: "monospace", transition: "all 0.2s" }}>Log Out</button>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 24px" }}>
        {/* Welcome */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 22, fontWeight: 700, color: C.text }}>
              {memberName ? `Welcome back, ${memberName.split(" ")[0]}.` : "Welcome back."}
            </div>
            <div style={{ fontSize: 12, color: C.dim, fontFamily: "monospace", marginTop: 4 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
          {taskCount > 0 && (
            <div style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", color: "#93c5fd", padding: "8px 16px", borderRadius: 8, fontSize: 12, fontFamily: "monospace" }}>
              📋 {taskCount} open task{taskCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Featured projector card */}
        <a href="/member-hub/projector" style={{ textDecoration: "none", display: "block", marginBottom: 24 }}>
          <div style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(59,130,246,0.08))", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 14, padding: "22px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", cursor: "pointer", transition: "all 0.25s", animation: "borderPulse 3s ease-in-out infinite" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(239,68,68,0.7)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ fontSize: 38, animation: "float 3s ease-in-out infinite" }}>📡</div>
              <div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 15, fontWeight: 700, color: C.red, letterSpacing: 2, marginBottom: 4 }}>MEETING PROJECTOR</div>
                <div style={{ color: C.muted, fontSize: 13 }}>Live rotating display — calendar, tasks & announcements. Click to open fullscreen.</div>
              </div>
            </div>
            <div style={{ background: C.red, color: "#fff", padding: "10px 22px", borderRadius: 6, fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>OPEN →</div>
          </div>
        </a>

        {/* Feature grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
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

function FeatureCard({ feature, index }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="feature-card"
      onClick={() => { if (feature.href === "/dashboard") localStorage.setItem("sb_authed", "true"); window.location.href = feature.href; }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? `${feature.accent}0d` : C.surface,
        border: `1px solid ${hovered ? feature.accent + "88" : C.border}`,
        borderRadius: 12,
        padding: "24px 22px",
        cursor: "pointer",
        boxShadow: hovered ? `0 0 28px ${feature.accent}22` : "none",
        animation: `fadeUp 0.4s ease both`,
        animationDelay: `${index * 0.05}s`,
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 12, transition: "transform 0.2s", transform: hovered ? "scale(1.15)" : "scale(1)" }}>{feature.icon}</div>
      <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 7, letterSpacing: 1 }}>{feature.label}</div>
      <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6 }}>{feature.description}</div>
      <div style={{ marginTop: 14, fontSize: 12, fontFamily: "monospace", color: feature.accent, fontWeight: 700, opacity: hovered ? 1 : 0.6, transition: "opacity 0.2s" }}>Open →</div>
    </div>
  );
}
