import { useState, useEffect } from "react";
import Starfield from "./Starfield.jsx";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function sbFetch(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return null;
  return res.json();
}

const SECTIONS = [
  { id: "competitions", label: "Competitions", icon: "🏆", categories: ["Competition"] },
  { id: "outreach", label: "Outreach", icon: "🤝", categories: ["Outreach"] },
  { id: "our-team", label: "Our Team", icon: "👥", categories: ["Team", "Build Season"] },
  { id: "other", label: "Other", icon: "📁", categories: ["Other"] },
];

function getYoutubeId(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  return m ? m[1] : null;
}

function getThumbnail(item) {
  if (item.type === "video") {
    const ytId = getYoutubeId(item.url);
    if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
    return null;
  }
  return item.url;
}

export default function PublicMedia() {
  const [items, setItems] = useState([]);
  const [activeSection, setActiveSection] = useState("competitions");
  const [activeYear, setActiveYear] = useState("all");
  const [lightbox, setLightbox] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    document.title = "Media Gallery · Team 4550";
    sbFetch("hub_media?select=*&order=created_at.desc").then(r => {
      if (r) setItems(r);
      setLoading(false);
    });
  }, []);

  const years = [...new Set(items.map(i => i.year).filter(Boolean))].sort((a, b) => b - a);

  const sectionItems = SECTIONS.find(s => s.id === activeSection);
  const filtered = sectionItems
    ? items.filter(i => sectionItems.categories.includes(i.category) && (activeYear === "all" || String(i.year) === String(activeYear)))
    : [];

  return (
    <div style={{ minHeight: "100vh", background: "#080a0f", color: "#f1f5f9", fontFamily: "'Exo 2', sans-serif" }}>
      <Starfield density={9000} opacity={0.28} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#080a0f;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:#0d1117;}::-webkit-scrollbar-thumb{background:#ef4444;border-radius:3px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
        .gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;}
        @media(max-width:600px){.gallery-grid{grid-template-columns:repeat(2,1fr);gap:8px;}}
      `}</style>

      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(8,10,15,0.95)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "12px 16px" : "14px 28px", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a href="/" style={{ color: "#64748b", textDecoration: "none", fontSize: 12, fontFamily: "monospace" }}>← Home</a>
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: isMobile ? 13 : 16, color: "#ef4444", letterSpacing: 2 }}>MEDIA GALLERY</span>
          </div>
          <a href="/member-hub" style={{ border: "1px solid #ef4444", color: "#ef4444", padding: "6px 14px", borderRadius: 4, textDecoration: "none", fontSize: 11, fontFamily: "'Orbitron', sans-serif", letterSpacing: 1 }}>MEMBERS</a>
        </div>
      </header>

      {/* Section tabs */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "16px 14px 0" : "24px 28px 0" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 10 }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
              background: activeSection === s.id ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${activeSection === s.id ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
              color: activeSection === s.id ? "#ef4444" : "#94a3b8",
              borderRadius: 20, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontFamily: "'Orbitron', sans-serif", fontWeight: 700, letterSpacing: 1,
              transition: "all 0.2s",
            }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        {/* Year filter */}
        {years.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 4 }}>
            <button onClick={() => setActiveYear("all")} style={{
              background: activeYear === "all" ? "rgba(239,68,68,0.12)" : "transparent",
              border: `1px solid ${activeYear === "all" ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.06)"}`,
              color: activeYear === "all" ? "#ef4444" : "#64748b",
              borderRadius: 14, padding: "4px 14px", cursor: "pointer", fontSize: 12, fontFamily: "monospace", transition: "all 0.2s",
            }}>All</button>
            {years.map(y => (
              <button key={y} onClick={() => setActiveYear(y)} style={{
                background: activeYear === y ? "rgba(239,68,68,0.12)" : "transparent",
                border: `1px solid ${activeYear === y ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.06)"}`,
                color: activeYear === y ? "#ef4444" : "#64748b",
                borderRadius: 14, padding: "4px 14px", cursor: "pointer", fontSize: 12, fontFamily: "monospace", transition: "all 0.2s",
              }}>{y}</button>
            ))}
          </div>
        )}
      </div>

      {/* Gallery */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "16px 14px 40px" : "24px 28px 60px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#64748b", padding: "60px 0", fontFamily: "monospace", fontSize: 13 }}>Loading gallery...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "#64748b", padding: "60px 0", fontFamily: "monospace", fontSize: 13 }}>
            No media in this section yet.
          </div>
        ) : (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <div className="gallery-grid">
              {filtered.map(item => {
                const thumb = getThumbnail(item);
                return (
                  <div key={item.id} onClick={() => setLightbox(item)} style={{
                    cursor: "pointer", borderRadius: 8, overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)",
                    transition: "transform 0.15s, border-color 0.15s",
                    animation: "fadeUp 0.4s ease both",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                  >
                    <div style={{ width: "100%", aspectRatio: "16/10", background: "#0d1117", overflow: "hidden", position: "relative" }}>
                      {thumb ? (
                        <img src={thumb} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>🎬</div>
                      )}
                      {item.type === "video" && (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)" }}>
                          <div style={{ width: 36, height: 36, background: "rgba(239,68,68,0.9)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff" }}>▶</div>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "8px 10px" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                      <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace", marginTop: 2 }}>{item.year}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>
              {filtered.length} item{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 16, backdropFilter: "blur(8px)",
        }} onClick={e => { if (e.target === e.currentTarget) setLightbox(null); }}>
          <div style={{ maxWidth: 860, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>{lightbox.title}</div>
                <div style={{ fontSize: 12, color: "#64748b", fontFamily: "monospace", marginTop: 2 }}>{lightbox.category} · {lightbox.year}</div>
              </div>
              <button onClick={() => setLightbox(null)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#94a3b8", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "monospace" }}>✕ Close</button>
            </div>
            {lightbox.type === "video" ? (
              (() => {
                const ytId = getYoutubeId(lightbox.url);
                return ytId ? (
                  <iframe style={{ width: "100%", aspectRatio: "16/9", border: "none", borderRadius: 8 }}
                    src={`https://www.youtube.com/embed/${ytId}`} allowFullScreen />
                ) : (
                  <video src={lightbox.url} controls style={{ width: "100%", borderRadius: 8 }} />
                );
              })()
            ) : (
              <img src={lightbox.url} alt={lightbox.title} style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 8 }} />
            )}
            {lightbox.description && <div style={{ marginTop: 12, color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>{lightbox.description}</div>}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: isMobile ? "24px 18px" : "32px 28px", textAlign: "center" }}>
        <a href="/" style={{ color: "#64748b", textDecoration: "none", fontSize: 12, fontFamily: "monospace" }}>← Back to Team 4550 Site</a>
      </footer>
    </div>
  );
}
