import { useState, useEffect, useRef } from "react";
import { FONTS, C, sbFetch, isAuthed } from "./hubUtils.jsx";

export default function HubCountdown() {
  const [authed] = useState(isAuthed());
  const [config, setConfig] = useState({});
  const [now, setNow] = useState(Date.now());
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    if (!authed) { window.location.href = "/member-hub"; return; }
    document.title = "Countdown · Team 4550";
    sbFetch("site_config?select=key,value").then(rows => {
      if (!rows) return;
      const obj = {};
      rows.forEach(r => { obj[r.key] = r.value; });
      setConfig(obj);
    });
    const clockId = setInterval(() => setNow(Date.now()), 1000);
    const fn = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", fn);
    return () => { clearInterval(clockId); window.removeEventListener("resize", fn); };
  }, []);

  useEffect(() => {
    const fn = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", fn);
    return () => document.removeEventListener("fullscreenchange", fn);
  }, []);

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  }

  const parsed = config.countdown_target && !isNaN(new Date(config.countdown_target).getTime())
    ? new Date(config.countdown_target).getTime() : null;
  const diff = parsed != null ? Math.max(0, parsed - now) : 0;
  const total = Math.floor(diff / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = n => String(n).padStart(2, "0");
  const units = [
    { label: "DAYS", value: days > 99 ? String(days) : pad(days) },
    { label: "HOURS", value: pad(hours) },
    { label: "MINUTES", value: pad(mins) },
    { label: "SECONDS", value: pad(secs) },
  ];
  const targetDate = parsed != null
    ? new Date(parsed).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) + " · " + new Date(parsed).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div ref={containerRef} style={{ minHeight: "100vh", background: "#050709", backgroundImage: "linear-gradient(rgba(239,68,68,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(239,68,68,0.04) 1px,transparent 1px)", backgroundSize: "44px 44px", color: C.text, fontFamily: "'Exo 2', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{FONTS}</style>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.5)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>⏳</span>
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 700, color: C.red, letterSpacing: 2 }}>COUNTDOWN</span>
          {!fullscreen && <span style={{ fontSize: 11, color: C.dim, fontFamily: "monospace" }}>FRC 4550 · Something's Bruin</span>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={toggleFullscreen} style={{ background: C.red, border: "none", color: "#fff", borderRadius: 6, padding: "5px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Orbitron', sans-serif", letterSpacing: 1 }}>
            {fullscreen ? "⊠ EXIT" : "⊞ FULLSCREEN"}
          </button>
          {!fullscreen && <a href="/member-hub" style={{ fontSize: 11, color: C.dim, textDecoration: "none", fontFamily: "monospace" }}>← Hub</a>}
        </div>
      </div>

      {/* Clock */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: isMobile ? "20px 14px" : "32px", gap: 12, textAlign: "center" }}>
        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: isMobile ? 11 : 13, color: C.red, letterSpacing: 3, animation: "glitch 15s ease-in-out infinite" }}>
          {config.countdown_eyebrow || "// COUNTDOWN"}
        </div>
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: isMobile ? "22px" : "clamp(30px,6vw,64px)", color: "#f1f5f9", lineHeight: 1.2, animation: "glitch 18s ease-in-out infinite 1s" }}>
          {config.countdown_title || "Something Big Is Coming"}
        </div>
        {config.countdown_subtitle && (
          <div style={{ color: C.muted, fontSize: isMobile ? 12 : 15, maxWidth: 560, lineHeight: 1.7 }}>{config.countdown_subtitle}</div>
        )}

        {parsed == null ? (
          <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 14, marginTop: 16 }}>
            No countdown target set — add one in Settings → Countdown.
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: isMobile ? 10 : 20, alignItems: "center", flexWrap: "wrap", justifyContent: "center", marginTop: 22 }}>
              {units.map(u => (
                <div key={u.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: isMobile ? 12 : 18, minWidth: isMobile ? "24vw" : 150, padding: isMobile ? "18px 8px" : "30px 20px", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: isMobile ? "clamp(26px,9vw,44px)" : "clamp(48px,7vw,84px)", color: "#f1f5f9", textShadow: "0 0 30px rgba(239,68,68,0.6)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{u.value}</div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: isMobile ? 9 : 11, color: C.red, letterSpacing: 2, marginTop: isMobile ? 8 : 14 }}>{u.label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontFamily: "monospace", fontSize: isMobile ? 10 : 12, color: C.dim, marginTop: 18 }}>{targetDate}</div>
          </>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 20px", borderTop: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: "#334155" }}>
          FRC TEAM 4550 · SOMETHING'S BRUIN
        </div>
        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: C.dim }}>
          {new Date(now).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>
    </div>
  );
}