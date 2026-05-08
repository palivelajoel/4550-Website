// hubUtils.jsx
import { useState, useEffect } from "react";

export const SUPABASE_URL = "https://ehkwxzumgizryvhkeusr.supabase.co";
export const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoa3d4enVtZ2l6cnl2aGtldXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTEwODcsImV4cCI6MjA5MzI4NzA4N30.IXAhkAx1ygZpJMNSWNd3k80Hmt4rNmRtuFPnLZGcGuc";
export const TEAM_PASSWORD = "Bruin@4550";

export const ROLES = ["Member", "Captain", "Admin"];
export const SUBTEAMS = ["Build", "Programming", "Marketing & Outreach", "General"];
export const ROLE_COLORS = { Member: "#64748b", Captain: "#3b82f6", Admin: "#ef4444" };
export const SUBTEAM_COLORS = { Build: "#f59e0b", Programming: "#3b82f6", "Marketing & Outreach": "#22c55e", General: "#64748b" };

// ── Auth ─────────────────────────────────────────────────
export const isAuthed = () => localStorage.getItem("hub_authed") === "true";
export const getUsername = () => localStorage.getItem("hub_username") || "";
export const getRole = () => localStorage.getItem("hub_role") || "Member";
export const getSubteam = () => localStorage.getItem("hub_subteam") || "General";
export const isAdmin = () => getRole() === "Admin";
export const isCaptainOrAbove = () => ["Captain","Admin"].includes(getRole());
export const canEditHub = () => isCaptainOrAbove();

// ── Supabase ─────────────────────────────────────────────
export async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation", ...opts.headers },
    ...opts,
  });
  if (!res.ok) { console.error("sbFetch", res.status, path); return null; }
  try { return await res.json(); } catch { return null; }
}

export async function uploadFile(file, bucket = "team-assets") {
  const safeFileName = `${Date.now()}-${file.name}`.replace(/\s+/g,"_").replace(/[^a-zA-Z0-9._-]/g,"_");
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${safeFileName}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": file.type, "x-upsert": "true" },
    body: file,
  });
  if (!res.ok) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${safeFileName}`;
}

// ── DEFINITIVE Captain Photo Fix ─────────────────────────
// Extracts just the filename from any stored URL format
function extractFilename(url) {
  if (!url) return null;
  const s = decodeURIComponent(url.trim());
  // Strip query params
  const noQuery = s.split("?")[0];
  // Find after any known bucket segment
  const seps = ["/public/team-assets/", "/object/team-assets/", "/team-assets/"];
  for (const sep of seps) {
    const idx = noQuery.lastIndexOf(sep);
    if (idx !== -1) return noQuery.slice(idx + sep.length);
  }
  // Fallback: last path segment
  return noQuery.split("/").pop();
}

export function CaptainPhoto({ photoUrl, name = "?", size = 80, style: extraStyle = {} }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(null); setFailed(false);
    if (!photoUrl) { setFailed(true); return; }
    let cancelled = false;

    const filename = extractFilename(photoUrl);
    if (!filename) { setFailed(true); return; }

    // Build candidate URLs (encoded + raw)
    const urls = [
      `${SUPABASE_URL}/storage/v1/object/public/team-assets/${encodeURIComponent(filename)}`,
      `${SUPABASE_URL}/storage/v1/object/public/team-assets/${filename}`,
    ];

    (async () => {
      // Try 1: plain <img> load for each candidate
      for (const url of urls) {
        const ok = await new Promise(res => {
          const img = new Image();
          img.onload = () => res(true);
          img.onerror = () => res(false);
          img.src = url;
        });
        if (ok && !cancelled) { setSrc(urls[0]); return; }
      }

      // Try 2: authenticated fetch → blob URL
      for (const url of urls) {
        try {
          const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }});
          if (r.ok) {
            const blob = await r.blob();
            if (!cancelled) { setSrc(URL.createObjectURL(blob)); return; }
          }
        } catch {}
      }

      if (!cancelled) setFailed(true);
    })();

    return () => { cancelled = true; };
  }, [photoUrl]);

  const baseStyle = { width: size, height: size, borderRadius: "50%", flexShrink: 0, ...extraStyle };
  const initial = (name || "?")[0].toUpperCase();

  if (failed) return (
    <div style={{ ...baseStyle, background:"rgba(239,68,68,0.12)", border:"2px solid rgba(239,68,68,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize: size * 0.38, color:"#ef4444", fontFamily:"'Orbitron',sans-serif" }}>{initial}</div>
  );
  if (!src) return (
    <div style={{ ...baseStyle, background:"rgba(255,255,255,0.06)", border:"2px solid rgba(255,255,255,0.08)", animation:"pulse 1.4s ease-in-out infinite" }} />
  );
  return <img src={src} alt={name} style={{ ...baseStyle, objectFit:"cover", border:"2px solid rgba(239,68,68,0.35)" }} onError={() => setFailed(true)} />;
}

// ── CSS ──────────────────────────────────────────────────
export const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700&family=Bebas+Neue&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;-webkit-tap-highlight-color:transparent;}
body{background:#080a0f;}
::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:#0d1117;}::-webkit-scrollbar-thumb{background:#ef4444;border-radius:3px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
@keyframes glow{0%,100%{box-shadow:0 0 8px rgba(239,68,68,0.4);}50%{box-shadow:0 0 32px rgba(239,68,68,0.9),0 0 60px rgba(239,68,68,0.3);}}
@keyframes borderPulse{0%,100%{border-color:rgba(239,68,68,0.25);}50%{border-color:rgba(239,68,68,0.75);}}
@keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);}}
@keyframes glitch{0%,90%,100%{text-shadow:none;}92%{text-shadow:-3px 0 #ef4444,3px 0 #3b82f6;}95%{text-shadow:3px 0 #ef4444,-3px 0 #3b82f6;}97%{text-shadow:none;}}
@keyframes scanline{0%{top:-4px;}100%{top:100%;}}
@keyframes radarSpin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
@keyframes countUp{from{opacity:0;transform:scale(0.7);}to{opacity:1;transform:scale(1);}}
@keyframes orb{0%,100%{transform:scale(1);}50%{transform:scale(1.2);}}
input,select,textarea{outline:none;}
button{-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
@media(max-width:640px){
  .grid-2col{grid-template-columns:1fr!important;}
  .grid-3col{grid-template-columns:1fr!important;}
  .hide-sm{display:none!important;}
}
`;

export const C = {
  bg:"#080a0f", surface:"rgba(255,255,255,0.03)", border:"rgba(255,255,255,0.08)",
  red:"#ef4444", blue:"#3b82f6", green:"#22c55e", amber:"#f59e0b",
  purple:"#a855f7", pink:"#ec4899", text:"#f1f5f9", muted:"#94a3b8", dim:"#64748b",
};

export const toastStyle = { position:"fixed", bottom:20, right:16, background:"#22c55e", color:"#fff", padding:"11px 18px", borderRadius:8, fontFamily:"monospace", fontSize:13, zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,0.5)", animation:"fadeUp 0.3s ease", maxWidth:"calc(100vw - 32px)" };
export const inputStyle = { background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"11px 13px", color:"#fff", fontSize:14, fontFamily:"monospace", width:"100%", transition:"border-color 0.2s", WebkitAppearance:"none" };
export const selectStyle = { background:"#0d1117", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"11px 13px", color:"#fff", fontSize:14, fontFamily:"monospace", width:"100%", cursor:"pointer" };
export const overlayStyle = { position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:14, backdropFilter:"blur(8px)" };
export const modalStyle = { background:"#0d1117", border:"1px solid rgba(255,255,255,0.1)", borderRadius:16, padding:"24px 20px", width:"100%", maxWidth:480, maxHeight:"92vh", overflowY:"auto" };
export const addBtnStyle = { background:"#ef4444", border:"none", borderRadius:8, padding:"11px 18px", color:"#fff", cursor:"pointer", fontSize:14, fontFamily:"'Exo 2',sans-serif", fontWeight:600, whiteSpace:"nowrap", transition:"all 0.2s", touchAction:"manipulation" };
export const ghostBtn = { background:"transparent", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"9px 14px", color:"#94a3b8", cursor:"pointer", fontSize:13, fontFamily:"monospace", whiteSpace:"nowrap", touchAction:"manipulation" };
export const dangerBtn = { background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:8, padding:"9px 14px", color:"#ef4444", cursor:"pointer", fontSize:13, fontFamily:"monospace", whiteSpace:"nowrap", touchAction:"manipulation" };

export function HubHeader({ title }) {
  return (
    <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 16px", borderBottom:"1px solid rgba(255,255,255,0.08)", background:"rgba(8,10,15,0.97)", backdropFilter:"blur(14px)", position:"sticky", top:0, zIndex:100, gap:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
        <a href="/member-hub" style={{ color:"#64748b", textDecoration:"none", fontSize:13, fontFamily:"monospace", flexShrink:0, padding:"6px 0" }}>← Hub</a>
        <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:14, fontWeight:700, color:"#f1f5f9", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{title}</div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
        <span style={{ fontSize:10, color:"#64748b", fontFamily:"monospace" }}>{getUsername()} · {getRole()}</span>
        <a href="/" style={{ fontSize:11, color:"#64748b", textDecoration:"none", fontFamily:"monospace" }}>Site</a>
      </div>
    </header>
  );
}