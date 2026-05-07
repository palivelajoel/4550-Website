// hubUtils.js — shared across all Hub pages

export const SUPABASE_URL = "https://ehkwxzumgizryvhkeusr.supabase.co";
export const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoa3d4enVtZ2l6cnl2aGtldXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTEwODcsImV4cCI6MjA5MzI4NzA4N30.IXAhkAx1ygZpJMNSWNd3k80Hmt4rNmRtuFPnLZGcGuc";
export const TEAM_PASSWORD = "Bruin@4550";

export async function sbFetch(path, opts = {}) {
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
  if (!res.ok) { console.error("sbFetch", res.status, path); return null; }
  try { return await res.json(); } catch { return null; }
}

export async function uploadFile(file, bucket = "team-assets") {
  const name = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": file.type,
      "x-upsert": "true",
    },
    body: file,
  });
  if (!res.ok) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${name}`;
}

export function isAuthed() {
  return localStorage.getItem("hub_authed") === "true";
}

export function getUsername() {
  return localStorage.getItem("hub_username") || "";
}

export function getRole() {
  return localStorage.getItem("hub_role") || "Member";
}

export function canEditHub() {
  return ["Captain", "Mentor", "Admin"].includes(getRole());
}

// Shared Google Fonts injection
export const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700&family=Bebas+Neue&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;-webkit-tap-highlight-color:transparent;}
body{background:#080a0f;}
::-webkit-scrollbar{width:5px;}
::-webkit-scrollbar-track{background:#0d1117;}
::-webkit-scrollbar-thumb{background:#ef4444;border-radius:3px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
input,select,textarea{outline:none;}
`;

// Shared colour palette
export const C = {
  bg: "#080a0f",
  surface: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.08)",
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  amber: "#f59e0b",
  purple: "#a855f7",
  pink: "#ec4899",
  text: "#f1f5f9",
  muted: "#94a3b8",
  dim: "#64748b",
};

export const SUBTEAMS = ["Build", "Programming", "Marketing & Outreach", "All"];

// ── Shared UI styles ───────────────────────────────────────────────────────
export const toastStyle = { position: "fixed", bottom: 24, right: 24, background: "#22c55e", color: "#fff", padding: "12px 20px", borderRadius: 8, fontFamily: "monospace", fontSize: 13, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" };
export const inputStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "9px 12px", color: "#fff", fontSize: 13, fontFamily: "monospace", width: "100%" };
export const selectStyle = { background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "9px 12px", color: "#fff", fontSize: 13, fontFamily: "monospace", width: "100%", cursor: "pointer" };
export const overlayStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 };
export const modalStyle = { background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "28px 24px", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" };
export const addBtnStyle = { background: "#ef4444", border: "none", borderRadius: 6, padding: "9px 18px", color: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "'Exo 2', sans-serif", fontWeight: 600, whiteSpace: "nowrap" };
export const ghostBtn = { background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "7px 12px", color: "#94a3b8", cursor: "pointer", fontSize: 12, fontFamily: "monospace", whiteSpace: "nowrap" };
export const dangerBtn = { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "7px 12px", color: "#ef4444", cursor: "pointer", fontSize: 12, fontFamily: "monospace", whiteSpace: "nowrap" };

export function HubHeader({ title }) {
  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(8,10,15,0.95)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <a href="/member-hub" style={{ color: "#64748b", textDecoration: "none", fontSize: 12, fontFamily: "monospace" }}>← Hub</a>
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{title}</div>
      </div>
      <a href="/" style={{ fontSize: 12, color: "#64748b", textDecoration: "none", fontFamily: "monospace" }}>Public Site</a>
    </header>
  );
}
