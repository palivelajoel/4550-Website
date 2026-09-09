import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { FONTS, C, sbFetch, isAuthed } from "./hubUtils.jsx";

const DEFAULT_URL = "https://frc4550.org";
const DEFAULT_QR = { url: DEFAULT_URL, dark: "#ef4444", light: "#0a0c10" };

let modelViewerInjected = false;
function ensureModelViewerScript() {
  if (modelViewerInjected || document.querySelector('script[src*="model-viewer"]')) return;
  modelViewerInjected = true;
  const script = document.createElement("script");
  script.type = "module";
  script.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js";
  document.head.appendChild(script);
}

let ytApiPromise = null;
function ensureYouTubeApi() {
  if (typeof window !== "undefined" && window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) try { prev(); } catch {} resolve(window.YT); };
    // fallback if event doesn't fire
    setTimeout(() => resolve(window.YT), 4000);
  });
  return ytApiPromise;
}

export default function HubAdvertisement() {
  const [authed] = useState(isAuthed());
  const [started, setStarted] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [slides, setSlides] = useState([]);
  const [logoUrl, setLogoUrl] = useState("/logo.jpg");
  const [qrUrl, setQrUrl] = useState("");
  const [qrConfig, setQrConfig] = useState(DEFAULT_QR);
  const [escArmed, setEscArmed] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const containerRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    document.title = "Advertisement · Team 4550";
    if (!authed) {
      window.location.href = "/member-hub";
      return;
    }
    ensureModelViewerScript();
    load();
    return () => {
      clearTimeout(timerRef.current);
    };
  }, [authed]);

  async function load() {
    const [ads, lg, qr] = await Promise.all([
      sbFetch("site_config?key=eq.ad_slides&select=value"),
      sbFetch("site_config?key=eq.logo_url&select=value"),
      sbFetch("site_config?key=eq.qr_config&select=value"),
    ]);
    let parsed = [];
    try { parsed = ads?.[0]?.value ? JSON.parse(ads[0].value) : []; } catch {}
    setSlides(Array.isArray(parsed) ? parsed : []);
    if (lg?.[0]?.value) setLogoUrl(lg[0].value);
    try {
      const qc = qr?.[0]?.value ? JSON.parse(qr[0].value) : {};
      const merged = { ...DEFAULT_QR, ...(qc || {}) };
      setQrConfig(merged);
      setQrUrl(merged.url || DEFAULT_URL);
    } catch {
      setQrConfig(DEFAULT_QR);
      setQrUrl(DEFAULT_URL);
    }
  }

  useEffect(() => {
    if (qrUrl) {
      QRCode.toDataURL(qrUrl, {
        width: 600,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: qrConfig.dark || "#ef4444", light: qrConfig.light || "#0a0c10" },
      }).then(setQrDataUrl).catch(() => {});
    }
  }, [qrUrl, qrConfig]);

  const advance = () => setSlideIndex(s => (s + 1) % Math.max(slides.length, 1));

  useEffect(() => {
    if (!started || showQR || escArmed || slides.length === 0) return;
    const slide = slides[slideIndex];
    if (slide?.type === "video") return; // both native and YouTube advance onEnded
    const ms = (slide?.durationSec || 0) * 1000;
    const fallbackMs = ms || (slide?.type === "cad" ? 12000 : slide?.type === "info" ? 10000 : 8000);
    timerRef.current = setTimeout(() => advance(), fallbackMs);
    return () => clearTimeout(timerRef.current);
  }, [started, showQR, escArmed, slideIndex, slides]);

  function start(e) {
    e?.stopPropagation();
    if (!authed) return;
    containerRef.current?.requestFullscreen?.().catch(() => {});
    setStarted(true);
  }

  function exitToHub() {
    window.location.href = "/member-hub";
  }

  // Keep focus on the presentation container so Space reaches us even when a YT iframe is present
  useEffect(() => {
    if (started) containerRef.current?.focus();
  }, [started, slideIndex, showQR]);

  useEffect(() => {
    function onKey(e) {
      if (e.repeat) return;
      if (escArmed && e.key !== "Enter" && e.key !== "Escape") return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!started) {
          start(e);
          return;
        }
        const active = slides[slideIndex];
        if (active?.type === "video") {
          // Pause first, then show QR — prevents YT mount/unmount thrash
          const v = document.querySelector("video");
          if (v && !v.paused) try { v.pause(); } catch {}
          const yt = window.__adYtPlayer;
          if (yt?.pauseVideo) try { yt.pauseVideo(); } catch {}
        }
        setShowQR(s => !s);
        return;
      }
      if (e.key === "Enter") {
        if (!started) {
          start(e);
          return;
        }
        if (escArmed) exitToHub();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setEscArmed(a => !a);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, escArmed, slides, slideIndex]);

  if (!authed) return null;

  if (!started) {
    return (
      <div ref={containerRef} tabIndex={0} onClick={start} style={{ minHeight: "100vh", background: "#050709", color: C.text, fontFamily: "'Exo 2', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexDirection: "column", gap: 28, padding: 24, textAlign: "center", outline: "none" }}>
        <style>{FONTS}</style>
        <img src={logoUrl} alt="logo" style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(239,68,68,0.5)", boxShadow: "0 0 40px rgba(239,68,68,0.3)" }} />
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: "clamp(24px,5vw,44px)", letterSpacing: 3, color: C.text }}>SOMETHING'S BRUIN</div>
        {slides.length === 0 ? (
          <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 15 }}>No slides configured.</div>
        ) : (
          <button onClick={start} style={{ background: C.red, border: "none", color: "#fff", borderRadius: 8, padding: "16px 40px", fontFamily: "'Orbitron', sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: 2, cursor: "pointer" }}>
            ▶ START PRESENTATION
          </button>
        )}
        <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 12 }}>Tap or press Enter to start with sound</div>
      </div>
    );
  }

  const slide = slides[slideIndex];

  return (
    <div ref={containerRef} tabIndex={0} style={{ minHeight: "100vh", background: "#050709", color: C.text, fontFamily: "'Exo 2', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden", outline: "none" }}>
      <style>{FONTS + `
        @keyframes advertIn { from { opacity: 0; } to { opacity: 1; } }
        .advert-slide { animation: advertIn 0.4s ease both; }
      `}</style>

      {!showQR && (
        <div style={{ position: "absolute", top: 16, left: 20, right: 20, display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10, pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.5)", padding: "6px 14px", borderRadius: 8, pointerEvents: "auto" }}>
            <img src={logoUrl} alt="logo" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 700, color: C.red, letterSpacing: 2 }}>FRC TEAM 4550 · SOMETHING'S BRUIN</span>
          </div>
          <button onClick={exitToHub} style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)", color: C.text, borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontFamily: "monospace", pointerEvents: "auto" }}>✕ Exit</button>
        </div>
      )}

      {escArmed && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,7,9,0.92)" }}>
          <div style={{ textAlign: "center", fontFamily: "'Exo 2', sans-serif", padding: 32 }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: "clamp(18px,3vw,30px)", letterSpacing: 2, color: C.text, marginBottom: 12 }}>EXIT PRESENTATION?</div>
            <div style={{ color: C.dim, fontSize: 15, marginBottom: 6 }}>Press <span style={{ color: "#fff" }}>Enter</span> to exit to the Member Hub</div>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Press <span style={{ color: "#fff" }}>Escape</span> to keep watching</div>
            <button onClick={exitToHub} style={{ background: C.red, border: "none", color: "#fff", borderRadius: 8, padding: "10px 20px", fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 1, cursor: "pointer" }}>Exit to Hub</button>
          </div>
        </div>
      )}

      {showQR ? (
        <div className="advert-slide" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30, minHeight: "100vh" }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: "clamp(28px,6vw,60px)", letterSpacing: 4, color: C.text }}>
            VISIT OUR <span style={{ color: C.red }}>WEBSITE!</span>
          </div>
          <div style={{ background: qrConfig.light || "#0a0c10", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
            {qrDataUrl ? <img src={qrDataUrl} alt="QR Code" style={{ width: "min(70vw, 420px)", height: "min(70vw, 420px)", objectFit: "contain" }} /> : <div style={{ width: 300, height: 300 }} />}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 15, color: C.muted }}>{qrUrl}</div>
        </div>
      ) : (
        <div className="advert-slide" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden" }}>
            {slide?.type === "video" && (
              <VideoSlide key={`${slideIndex}-${slides.length === 1 ? 'single' : 'multi'}`} slide={slide} onEnded={advance} isSingle={slides.length === 1} />
            )}
            {slide?.type === "image" && (
              <img key={slideIndex} src={slide.url} alt={slide.title || ""} style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />
            )}
            {slide?.type === "cad" && (
              <model-viewer key={slideIndex} src={slide.url} alt={slide.title || "3D model"} auto-rotate camera-controls interaction-prompt="none" shadow-intensity="1" exposure="1.2" disable-zoom style={{ width: "100%", height: "100%", background: "#0a0c10" }} />
            )}
            {slide?.type === "info" && <InfoSlide key={slideIndex} slide={slide} />}
            {!slide && <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.dim, fontFamily: "monospace" }}>No slide.</div>}
          </div>
          {slide?.caption || slide?.title ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 20px 16px", background: "rgba(0,0,0,0.4)", flexShrink: 0 }}>
              <div style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 13, color: C.text, opacity: 0.85, textAlign: "center" }}>{slide.caption || slide.title}</div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function VideoSlide({ slide, onEnded, isSingle }) {
  const vid = (() => {
    const m = String(slide.url || "").match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&\s?/]+)/);
    return m ? m[1] : null;
  })();
  const ytContainerRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!vid) return;
    let cancelled = false;
    ensureYouTubeApi().then((YT) => {
      if (cancelled || !YT || !YT.Player || !ytContainerRef.current) return;
      try { playerRef.current?.destroy(); } catch {}
      const player = new YT.Player(ytContainerRef.current, {
        videoId: vid,
        width: "100%",
        height: "100%",
        playerVars: { autoplay: 1, mute: 1, rel: 0, modestbranding: 1, playsinline: 1, enablejsapi: 1, origin: window.location.origin, loop: isSingle ? 1 : 0, playlist: isSingle ? vid : undefined },
        events: {
          onReady: (e) => { try { e.target.mute(); e.target.playVideo(); } catch {} window.__adYtPlayer = e.target; },
          onStateChange: (e) => {
            if (e.data === 0) {
              if (isSingle) { try { e.target.seekTo(0); e.target.playVideo(); } catch { onEnded(); } }
              else onEnded();
            }
          },
          onError: () => onEnded(),
        },
      });
      playerRef.current = player;
      window.__adYtPlayer = player;
    });
    return () => {
      cancelled = true;
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
      if (window.__adYtPlayer === playerRef.current) window.__adYtPlayer = null;
      // also clear global if it points to this player
      try { if (window.__adYtPlayer && window.__adYtPlayer === playerRef.current) window.__adYtPlayer = null; } catch {}
      window.__adYtPlayer = null;
    };
  }, [vid, onEnded, isSingle]);

  if (vid) {
    return <div ref={ytContainerRef} style={{ width: "100%", height: "100%", background: "#000" }} />;
  }
  return (
    <video src={slide.url} poster={slide.poster} autoPlay muted playsInline loop={!!isSingle} style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} onEnded={isSingle ? undefined : onEnded} onError={onEnded} />
  );
}

function InfoSlide({ slide }) {
  const info = slide.info && typeof slide.info === "object" ? slide.info : {};
  const entries = Object.entries(info);
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 40, background: "radial-gradient(circle at 50% 20%,rgba(239,68,68,0.08),transparent 60%)" }}>
      <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: "clamp(24px,5vw,48px)", letterSpacing: 2, color: C.text, textAlign: "center" }}>{slide.title || "Robot Info"}</div>
      {entries.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 600, width: "100%" }}>
          {entries.map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 8 }}>
              <span style={{ fontFamily: "monospace", fontSize: 14, color: C.red, letterSpacing: 1 }}>{k.toUpperCase()}</span>
              <span style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 16, color: C.text, textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </div>
      )}
      {slide.caption && <div style={{ color: C.muted, fontSize: 14, fontFamily: "monospace" }}>{slide.caption}</div>}
    </div>
  );
}
