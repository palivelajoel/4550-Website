import { useEffect, useRef, useState, memo } from "react";
import Starfield from "./Starfield.jsx";
import { CaptainPhoto } from "./hubUtils.jsx";

const SlideIn = memo(function SlideIn({ children, direction = "up", delay = 0, style }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.08 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const dirs = { left: "translateX(-60px)", right: "translateX(60px)", up: "translateY(50px)", down: "translateY(-50px)" };
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translate(0,0)" : dirs[direction], transition: `opacity 0.8s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}s, transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}s`, ...style }}>
      {children}
    </div>
  );
});

// Distorted grid that warps on scroll (ref-based, no React re-renders)
function DistortedGrid() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let ticking = false;
    const handler = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(() => { const sy = window.scrollY; el.style.transform = `perspective(500px) rotateX(${Math.sin(sy * 0.003) * 2}deg) skewY(${sy * 0.001}deg)`; el.style.filter = `blur(${Math.min(sy * 0.015, 3)}px)`; el.style.opacity = Math.max(1 - sy * 0.0008, 0.3); ticking = false; }); }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return (
    <div ref={ref} style={{
      position: "fixed",
      inset: 0,
      pointerEvents: "none",
      zIndex: 0,
      backgroundImage: "linear-gradient(rgba(239,68,68,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(239,68,68,0.04) 1px,transparent 1px)",
      backgroundSize: "44px 44px",
      transition: "transform 0.1s ease-out, filter 0.1s ease-out",
    }} />
  );
}

// Random glitch overlay — small screen chunks flash/distort at random intervals
function GlitchOverlay() {
  const [glitches, setGlitches] = useState([]);
  useEffect(() => {
    const interval = setInterval(() => {
      const count = Math.floor(Math.random() * 3) + 1;
      const newGlitches = Array.from({ length: count }, () => ({
        id: Date.now() + Math.random(),
        x: Math.random() * 100,
        y: Math.random() * 100,
        w: Math.random() * 120 + 30,
        h: Math.random() * 8 + 3,
        skew: (Math.random() - 0.5) * 10,
        color: Math.random() > 0.5 ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.1)",
      }));
      setGlitches(prev => [...prev, ...newGlitches].slice(-8));
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
      {glitches.map(g => (
        <div
          key={g.id}
          style={{
            position: "absolute",
            left: `${g.x}%`,
            top: `${g.y}%`,
            width: g.w,
            height: g.h,
            background: g.color,
            transform: `skewX(${g.skew}deg)`,
            animation: "glitchFade 0.25s ease-out forwards",
            mixBlendMode: "screen",
          }}
        />
      ))}
    </div>
  );
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function sbFetch(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return null;
  return res.json();
}

function useDeviceSize() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

function useScrollY(disabled) {
  const [y, setY] = useState(0);
  useEffect(() => {
    if (disabled) return;
    const fn = () => setY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [disabled]);
  return y;
}

function ParticleCanvas({ isMobile }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const pts = Array.from({ length: Math.floor((W * H) / (isMobile ? 20000 : 10000)) }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
    }));
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fill();
        if (!isMobile) {
          for (let j = i + 1; j < pts.length; j++) {
            const q = pts[j]; const dx = p.x - q.x; const dy = p.y - q.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < 120) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.strokeStyle = `rgba(239,68,68,${0.15 * (1 - d / 120)})`; ctx.lineWidth = 0.5; ctx.stroke(); }
          }
        }
      }
      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", onResize); };
  }, [isMobile]);
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.6 }} />;
}

function SponsorBar({ sponsors = [] }) {
  const shown = sponsors.filter(s => s.company);
  if (shown.length === 0) return null;
  const items = shown.map(s => ({ company: s.company, logo_url: s.logo_url }));
  const duped = [...items, ...items];
  const speed = Math.max(20, items.length * 4);
  return (
    <div style={{ width: "100%", overflow: "hidden", background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "18px 0", position: "relative" }}>
      <style>{`@keyframes sponsorMarquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      <div style={{ display: "flex", gap: 48, animation: `sponsorMarquee ${speed}s linear infinite`, width: "max-content", "&:hover": { animationPlayState: "paused" } }}
        onMouseEnter={e => e.currentTarget.style.animationPlayState = "paused"}
        onMouseLeave={e => e.currentTarget.style.animationPlayState = "running"}>
        {duped.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, whiteSpace: "nowrap" }}>
            {s.logo_url ? (
              <img src={s.logo_url} alt={s.company} style={{ height: 36, width: 36, objectFit: "contain", borderRadius: 6, background: "rgba(255,255,255,0.05)" }}
                onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "inline"; }} />
            ) : null}
            <span style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", letterSpacing: 1, fontFamily: "'Exo 2', sans-serif" }}>{s.company}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FadeSection({ children, style }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.08 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(24px)", transition: "opacity 0.65s ease, transform 0.65s ease", ...style }}>
      {children}
    </div>
  );
}

export default function Landing() {
  const isMobile = useDeviceSize();
  const [config, setConfig] = useState({});
  const [captains, setCaptains] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [logoUrl, setLogoUrl] = useState("/logo.jpg");
  const [menuOpen, setMenuOpen] = useState(false);
  const heroParallaxRef = useRef(null);

  useEffect(() => {
    document.title = "Team 4550 Something's Bruin";
    sbFetch("site_config?select=key,value").then(rows => {
      if (!rows) return;
      const obj = {};
      rows.forEach(r => { obj[r.key] = r.value; });
      setConfig(obj);
    if (obj.logo_url) setLogoUrl(obj.logo_url);
    });
    sbFetch("captains?select=*&order=sort_order.asc").then(r => { if (r) setCaptains(r); });
    sbFetch("sponsors?select=company,logo_url,tier,email&order=company.asc&status=not.eq.Declined").then(r => { if (r) setSponsors(r); });
  }, []);

  // Hero parallax via ref (no React re-renders)
  useEffect(() => {
    if (isMobile) return;
    const el = heroParallaxRef.current;
    if (!el) return;
    let ticking = false;
    const handler = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(() => { el.style.transform = `translateY(${window.scrollY * 0.15}px)`; ticking = false; }); }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [isMobile]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(false);
    window.addEventListener("scroll", handler, { once: true, passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [menuOpen]);

  const email = config.team_email || "team4550frc@gmail.com";
  const ig = config.instagram || "https://www.instagram.com/cherrycreek.robotics";

  const yt = config.youtube || "https://www.youtube.com/channel/UC4_P1A5xYb7A7rCdEXdKzBQ";
  const donate = config.donate_url || "https://www.vancoevents.com/us/events/landing/46671";

  const navItems = ["About", "Team", "Sub-Teams", "Outreach", "Media Gallery", "Sponsors", "Contact"];

  const SUB_TEAMS = [
    {
      name: "Build",
      icon: "🔧",
      description: "The mechanical backbone of the team. Build designs, fabricates, and assembles our competition robot from raw materials. Members learn CAD, machining, welding, and hands-on mechanical engineering — all in a six-week build season sprint.",
      color: "#f59e0b",
    },
    {
      name: "Programming",
      icon: "💻",
      description: "The brain of the robot. Programming develops all software that controls autonomous routines, driver controls, sensor integration, and computer vision. Members work in Java with WPILib and contribute to real-time embedded systems.",
      color: "#3b82f6",
    },
    {
      name: "Marketing & Outreach",
      icon: "📢",
      description: "The voice of the team. Marketing & Outreach handles sponsor outreach, social media, community events, STEM education programs, and team branding. Members build real-world skills in communications, graphic design, and community leadership.",
      color: "#22c55e",
    },
  ];

  return (
    <div style={{ background: "transparent", color: "#f1f5f9", fontFamily: "'Exo 2', sans-serif", overflowX: "hidden", overflow:"hidden", position: "relative", minHeight: "100vh" }}>
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", overflow:"hidden", zIndex:0 }}>
        <Starfield density={9000} opacity={0.38} />
        {[{ s:500, t:"-20%", l:"-15%", c:"rgba(239,68,68,0.07)", d:"0s" }, { s:350, b:"-10%", r:"-10%", c:"rgba(59,130,246,0.05)", d:"1.5s" }, { s:250, t:"45%", r:"15%", c:"rgba(168,85,247,0.04)", d:"0.8s" }].map((o,i) => (
          <div key={i} style={{ position:"absolute", width:o.s, height:o.s, top:o.t, bottom:o.b, left:o.l, right:o.r, borderRadius:"50%", background:`radial-gradient(circle, ${o.c}, transparent)`, animation:`orbFloat ${6+i}s ease-in-out infinite`, animationDelay:o.d }} />
        ))}
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(239,68,68,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(239,68,68,0.04) 1px,transparent 1px)", backgroundSize:"44px 44px" }} />
        <div style={{ position:"absolute", left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,rgba(239,68,68,0.3),transparent)", animation:"scanline 4s linear infinite", top:"-4px" }} />
      </div>
      {/* Distorted grid that warps on scroll */}
        <DistortedGrid />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700&family=Bebas+Neue&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;-webkit-tap-highlight-color:transparent;}
        body{background:#080a0f;padding-top:env(safe-area-inset-top,0px);}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:#0d1117;}::-webkit-scrollbar-thumb{background:#ef4444;border-radius:3px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
        @keyframes menuSlide{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes orbFloat{0%,100%{transform:scale(1);}50%{transform:scale(1.15);}}
        @keyframes scanline{0%{top:-4px;}100%{top:100%;}}
        @keyframes glitch{0%,90%,100%{text-shadow:none;}92%{text-shadow:-3px 0 #ef4444,3px 0 #3b82f6;}95%{text-shadow:3px 0 #ef4444,-3px 0 #3b82f6;}97%{text-shadow:none;}}
        @keyframes glitchFade{from{opacity:1;}to{opacity:0;}}
        a{-webkit-tap-highlight-color:transparent;}
        /* Make sections semi-transparent to show the grid */
        section,footer,nav{position:relative;z-index:1;background:rgba(8,10,15,0.85);backdrop-filter:blur(10px);}
        .sec{padding:80px 24px;max-width:1100px;margin:0 auto;position:relative;z-index:1;}
        .about-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start;}
        .stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
        .subteams-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
        .outreach-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
        .captains-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:22px;}
        .media-row{display:flex;gap:20px;flex-wrap:wrap;}
        .media-card{flex:1 1 200px;}
        .contact-row{display:flex;gap:28px;justify-content:center;flex-wrap:wrap;margin-top:24px;}
        .footer-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;flex-wrap:wrap;gap:20px;}
        .footer-links{display:flex;gap:18px;flex-wrap:wrap;}
        .tier-row{display:flex;gap:12px;justify-content:center;margin-bottom:28px;flex-wrap:wrap;}
        @media(max-width:767px){
          .sec{padding:56px 18px;}
          .about-grid{grid-template-columns:1fr;gap:28px;}
          .subteams-grid{grid-template-columns:1fr;gap:14px;}
          .outreach-grid{grid-template-columns:1fr;gap:14px;}
          .captains-grid{grid-template-columns:1fr 1fr;gap:12px;}
          .media-row{flex-direction:column;gap:12px;}
          .contact-row{flex-direction:column;align-items:center;gap:14px;}
          .footer-top{flex-direction:column;align-items:flex-start;}
          .footer-links{gap:12px;}
          .tier-row{gap:8px;}
        }
        @media(max-width:480px){
          .captains-grid{grid-template-columns:1fr;}
          .stats-grid{gap:8px;}
        }
      `}</style>

      {/* NAV */}
      <nav style={{ position: "fixed", top: "env(safe-area-inset-top,0px)", left: 0, right: 0, zIndex: 1000, background: "rgba(8,10,15,0.95)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "12px 18px" : "14px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <img src={logoUrl} alt="logo" style={{ width: isMobile ? 30 : 34, height: isMobile ? 30 : 34, borderRadius: "50%", objectFit: "cover" }} />
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: isMobile ? 11 : 13, fontWeight: 700, color: "#ef4444", letterSpacing: isMobile ? 1 : 2 }}>
              {isMobile ? "4550" : "SOMETHING'S BRUIN"}
            </span>
          </div>
          {!isMobile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              {navItems.map(l => <a key={l} href={`#${l.toLowerCase().replace(/\s/g,"-")}`} style={{ color: "#94a3b8", textDecoration: "none", fontSize: 13, fontFamily: "'Share Tech Mono', monospace" }}>{l}</a>)}
              <a href="/member-hub" style={{ border: "1px solid #ef4444", color: "#ef4444", padding: "7px 16px", borderRadius: 4, textDecoration: "none", fontSize: 12, fontFamily: "'Orbitron', sans-serif", letterSpacing: 1 }}>FOR MEMBERS ›</a>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <a href="/member-hub" style={{ border: "1px solid #ef4444", color: "#ef4444", padding: "6px 12px", borderRadius: 4, textDecoration: "none", fontSize: 10, fontFamily: "'Orbitron', sans-serif", letterSpacing: 1 }}>MEMBERS</a>
              <button onClick={() => setMenuOpen(o => !o)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, display: "flex", flexDirection: "column", gap: 5 }} aria-label="Menu">
                <span style={{ display: "block", width: 22, height: 2, background: menuOpen ? "#ef4444" : "#94a3b8", transition: "all 0.2s", transform: menuOpen ? "rotate(45deg) translate(5px,5px)" : "none" }} />
                <span style={{ display: "block", width: 22, height: 2, background: menuOpen ? "transparent" : "#94a3b8", transition: "all 0.2s" }} />
                <span style={{ display: "block", width: 22, height: 2, background: menuOpen ? "#ef4444" : "#94a3b8", transition: "all 0.2s", transform: menuOpen ? "rotate(-45deg) translate(5px,-5px)" : "none" }} />
              </button>
            </div>
          )}
        </div>
        {isMobile && menuOpen && (
          <div style={{ background: "rgba(13,17,23,0.98)", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "8px 0 12px", animation: "menuSlide 0.2s ease" }}>
            {navItems.map(l => <a key={l} href={`#${l.toLowerCase().replace(/\s/g,"-")}`} onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "13px 20px", color: "#94a3b8", textDecoration: "none", fontSize: 14, fontFamily: "'Share Tech Mono', monospace", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{l}</a>)}
          </div>
        )}
      </nav>

      {/* HERO */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,rgba(8,10,15,0.55) 0%,rgba(13,17,23,0.66) 100%)", paddingTop: 70, position: "relative", overflow: "hidden" }}>
        <ParticleCanvas isMobile={isMobile} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(239,68,68,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(239,68,68,0.04) 1px,transparent 1px)", backgroundSize: isMobile ? "40px 40px" : "60px 60px", pointerEvents: "none" }} />
        <div ref={heroParallaxRef} style={{ textAlign: "center", zIndex: 1, padding: isMobile ? "0 20px" : "0 24px", transform: isMobile ? "none" : "none" }}>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: isMobile ? 9 : 11, color: "#64748b", letterSpacing: isMobile ? 2 : 3, marginBottom: 20 }}>FRC ROBOTICS · CHERRY CREEK HIGH SCHOOL · GREENWOOD VILLAGE, CO</div>
          <img src={logoUrl} alt="Team Logo" style={{ width: isMobile ? 88 : 110, height: isMobile ? 88 : 110, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(239,68,68,0.4)", boxShadow: "0 0 40px rgba(239,68,68,0.2)", marginBottom: isMobile ? 20 : 28, animation: "fadeUp 0.8s ease both" }} />
          <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: isMobile ? "clamp(22px,8vw,40px)" : "clamp(32px,6vw,72px)", letterSpacing: isMobile ? 2 : 4, color: "#f1f5f9", animation: "fadeUp 0.8s ease 0.15s both, glitch 10s ease-in-out infinite" }}>SOMETHING'S BRUIN</h1>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: isMobile ? "clamp(16px,5vw,24px)" : "clamp(18px,3vw,32px)", color: "#ef4444", letterSpacing: isMobile ? 6 : 8, marginTop: 6, animation: "fadeUp 0.8s ease 0.25s both, glitch 12s ease-in-out infinite 2s" }}>FRC TEAM 4550</div>
          <div style={{ width: 50, height: 2, background: "linear-gradient(90deg,transparent,#ef4444,transparent)", margin: isMobile ? "18px auto" : "24px auto", animation: "fadeUp 0.8s ease 0.35s both" }} />
          <p style={{ color: "#94a3b8", fontSize: isMobile ? 14 : 16, maxWidth: 420, margin: "0 auto", marginBottom: isMobile ? 28 : 36, lineHeight: 1.7, minHeight: isMobile ? 44 : 28, padding: "0 8px" }}>
            Engineering excellence. Community impact. Championship mindset.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", animation: "fadeUp 0.8s ease 0.5s both" }}>
            <a href="#about" style={{ background: "#ef4444", color: "#fff", textDecoration: "none", padding: isMobile ? "12px 24px" : "14px 32px", borderRadius: 6, fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: isMobile ? 11 : 13, letterSpacing: 2 }}>LEARN MORE</a>
            <a href={donate} target="_blank" rel="noreferrer" style={{ background: "transparent", color: "#ef4444", textDecoration: "none", padding: isMobile ? "12px 24px" : "14px 32px", borderRadius: 6, border: "1px solid #ef4444", fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: isMobile ? 11 : 13, letterSpacing: 2 }}>SUPPORT US</a>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about"><div className="sec">
        <FadeSection>
          <Eyebrow delay={0}>// WHO WE ARE</Eyebrow>
          <SectionTitle delay={0.1}>About the Team</SectionTitle>
          <div className="about-grid">
            <SlideIn direction="right" delay={0.2}>
              <p style={{ color: "#94a3b8", lineHeight: 1.8, fontSize: 15 }}>FRC Team 4550 "Something's Bruin" has been competing since 2012, representing Cherry Creek High School in FIRST Robotics Competition. Our team of 40–50 student engineers, programmers, and designers builds competition-ready robots each season — from scratch, in six weeks.</p>
              <p style={{ color: "#94a3b8", lineHeight: 1.8, fontSize: 15, marginTop: 14 }}>We've competed at the 2016 World Championship and continue to push the boundaries of what student-built robots can achieve. Beyond the robot, we're deeply committed to STEM outreach and community impact across the Denver metro area.</p>
            </SlideIn>
            <div className="stats-grid">
              {[{ num: "12+", label: "Years Competing" }, { num: "40–50", label: "Members" }, { num: "2016", label: "World Championship" }, { num: "3", label: "Sub-Teams" }].map((s, i) => (
                <SlideIn key={s.label} direction="up" delay={0.25 + i * 0.1}>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: isMobile ? "18px 14px" : "24px 20px", textAlign: "center" }}>
                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: isMobile ? 22 : 28, fontWeight: 700, color: "#ef4444" }}>{s.num}</div>
                    <div style={{ fontSize: 11, color: "#64748b", fontFamily: "'Share Tech Mono', monospace", marginTop: 4 }}>{s.label}</div>
                  </div>
                </SlideIn>
              ))}
            </div>
          </div>
        </FadeSection>
      </div></section>

      {/* OUR TEAM */}
      {captains.length > 0 && (
        <section id="team" style={{ background: "rgba(255,255,255,0.015)" }}><div className="sec">
          <FadeSection>
            <Eyebrow delay={0}>// LEADERSHIP</Eyebrow>
            <SectionTitle delay={0.1}>Our Team</SectionTitle>
            <div className="captains-grid">
              {captains.map((c, i) => (
                <SlideIn key={c.id} direction="up" delay={0.2 + i * 0.08}>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: isMobile ? "20px 14px" : "26px 20px", textAlign: "center" }}>
                  <CaptainPhoto photoUrl={c.photo_url} name={c.name} size={isMobile ? 70 : 88} style={{ display: "block", margin: "0 auto 12px", borderWidth: 2, borderStyle: "solid", borderColor: "rgba(239,68,68,0.4)" }} />
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: isMobile ? 11 : 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>{c.name}</div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#ef4444", letterSpacing: 2, marginBottom: c.bio ? 8 : 0 }}>{c.position}</div>
                  {c.bio && <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.6 }}>{c.bio}</p>}
                </div>
              </SlideIn>
            ))}
            </div>
          </FadeSection>
        </div></section>
      )}

      {/* SUB-TEAMS */}
      <section id="sub-teams"><div className="sec">
        <FadeSection>
          <Eyebrow delay={0}>// HOW WE BUILD</Eyebrow>
          <SectionTitle delay={0.1}>Sub-Teams</SectionTitle>
          <div className="subteams-grid">
            {SUB_TEAMS.map((st, i) => (
              <SlideIn key={st.name} direction="up" delay={0.2 + i * 0.12}>
                <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.08)`, borderTop: `3px solid ${st.color}`, borderRadius: 10, padding: isMobile ? "22px 18px" : "28px 24px" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{st.icon}</div>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 12, letterSpacing: 1 }}>{st.name}</div>
                  <p style={{ color: "#94a3b8", lineHeight: 1.75, fontSize: 14 }}>{st.description}</p>
                </div>
              </SlideIn>
            ))}
          </div>
        </FadeSection>
      </div></section>

      {/* OUTREACH */}
      <section id="outreach" style={{ background: "rgba(255,255,255,0.015)" }}><div className="sec">
        <FadeSection>
          <Eyebrow delay={0}>// COMMUNITY</Eyebrow>
          <SectionTitle delay={0.1}>Community Outreach</SectionTitle>
          <div className="outreach-grid">
            {[
              { icon: "🤖", title: "Team Mentoring", desc: "We mentor younger FRC and FLL teams throughout the Denver metro area, sharing technical knowledge and competition experience." },
              { icon: "🏫", title: "School Outreach", desc: "Visiting local elementary and middle schools to inspire the next generation of engineers through hands-on robotics demos." },
              { icon: "🌍", title: "Community Events", desc: "Participating in local STEM fairs, library events, and community festivals to promote robotics and engineering education." },
            ].map((o, i) => (
              <SlideIn key={o.title} direction="up" delay={0.2 + i * 0.12}>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: isMobile ? "22px 18px" : "28px 24px" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{o.icon}</div>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 10 }}>{o.title}</div>
                  <p style={{ color: "#94a3b8", lineHeight: 1.7, fontSize: 14 }}>{o.desc}</p>
                </div>
              </SlideIn>
            ))}
          </div>
        </FadeSection>
      </div></section>

      {/* MEDIA */}
      <section id="media-gallery"><div className="sec">
        <FadeSection>
          <Eyebrow delay={0}>// GALLERY</Eyebrow>
          <SectionTitle delay={0.1}>Media Gallery</SectionTitle>
          <SlideIn direction="up" delay={0.2}>
            <p style={{ color: "#94a3b8", maxWidth: 520, margin: "0 auto 28px", lineHeight: 1.8, fontSize: 15, textAlign: "center" }}>Browse photos and videos from competitions, outreach events, build season, and team activities.</p>
          </SlideIn>
          <SlideIn direction="up" delay={0.3}>
            <div style={{ textAlign: "center" }}>
              <a href="/media" style={{ display: "inline-block", background: "#ef4444", color: "#fff", textDecoration: "none", padding: isMobile ? "12px 28px" : "14px 36px", borderRadius: 6, fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: isMobile ? 11 : 13, letterSpacing: 2 }}>EXPLORE GALLERY →</a>
            </div>
          </SlideIn>
        </FadeSection>
      </div></section>

      {/* SOCIAL MEDIA */}
      <section id="media"><div className="sec">
        <FadeSection>
          <Eyebrow delay={0}>// FOLLOW ALONG</Eyebrow>
          <SectionTitle delay={0.1}>Social Media</SectionTitle>
          <div className="media-row">
            {[
              { href: ig, icon: "📸", title: "Instagram", handle: "@cherrycreek.robotics", border: "rgba(59,130,246,0.3)" },
              { href: yt, icon: "▶️", title: "YouTube", handle: "Team 4550 Something's Bruin", border: "rgba(239,68,68,0.3)" },
            ].map((m, i) => (
              <SlideIn key={m.title} direction="up" delay={0.2 + i * 0.12}>
                <a href={m.href} target="_blank" rel="noreferrer" className="media-card" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${m.border}`, borderRadius: 10, padding: isMobile ? "24px 18px" : "32px 24px", textDecoration: "none", textAlign: "center", display: "block" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>{m.icon}</div>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>{m.title}</div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#64748b" }}>{m.handle}</div>
                </a>
              </SlideIn>
            ))}
          </div>
        </FadeSection>
      </div></section>

      <SponsorBar sponsors={sponsors} />

      {/* SPONSORS */}
      <section id="sponsors" style={{ background: "rgba(255,255,255,0.015)" }}><div className="sec">
        <FadeSection>
          <div style={{ textAlign: "center" }}>
            <Eyebrow delay={0}>// PARTNER WITH US</Eyebrow>
            <SectionTitle delay={0.1}>Become a Sponsor</SectionTitle>
            <SlideIn direction="up" delay={0.2}>
              <p style={{ color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.8, fontSize: 15 }}>Sponsoring FRC Team 4550 connects your organization with motivated young engineers and demonstrates your commitment to STEM education. Multiple sponsorship tiers are available with recognition at competitions, on our robot, and across our platforms.</p>
            </SlideIn>
            <div className="tier-row">
              {[{ name: "Bronze", color: "#b45309" }, { name: "Silver", color: "#94a3b8" }, { name: "Gold", color: "#eab308" }, { name: "Platinum", color: "#818cf8" }].map((t, i) => (
                <SlideIn key={t.name} direction="up" delay={0.3 + i * 0.08}>
                  <div style={{ border: `1px solid ${t.color}`, borderRadius: 20, padding: isMobile ? "5px 14px" : "6px 20px", fontFamily: "'Orbitron', sans-serif", fontSize: isMobile ? 10 : 12, fontWeight: 700, letterSpacing: 2, color: t.color }}>{t.name}</div>
                </SlideIn>
              ))}
            </div>
            <SlideIn direction="up" delay={0.65}>
              <a href={`mailto:${email}`} style={{ display: "inline-block", background: "#ef4444", color: "#fff", textDecoration: "none", padding: isMobile ? "12px 24px" : "14px 32px", borderRadius: 6, fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: isMobile ? 11 : 13, letterSpacing: 2 }}>CONTACT US TO SPONSOR</a>
            </SlideIn>
          </div>
        </FadeSection>
      </div></section>

      {/* DONATE */}
      <section style={{ background: "rgba(239,68,68,0.05)", borderTop: "1px solid rgba(239,68,68,0.2)" }}><div className="sec">
        <FadeSection>
          <div style={{ textAlign: "center" }}>
            <Eyebrow delay={0}>// SUPPORT THE TEAM</Eyebrow>
            <SectionTitle delay={0.1}>Make a Donation</SectionTitle>
            <SlideIn direction="up" delay={0.2}>
              <p style={{ color: "#94a3b8", maxWidth: 460, margin: "0 auto 28px", lineHeight: 1.8, fontSize: 15 }}>Every donation goes directly toward robot parts, competition fees, and team travel. Help us compete at the highest level.</p>
            </SlideIn>
            <SlideIn direction="up" delay={0.3}>
              <a href={donate} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: "#ef4444", color: "#fff", textDecoration: "none", padding: isMobile ? "12px 28px" : "14px 32px", borderRadius: 6, fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: isMobile ? 11 : 13, letterSpacing: 2 }}>DONATE NOW</a>
            </SlideIn>
          </div>
        </FadeSection>
      </div></section>

      {/* CONTACT */}
      <section id="contact"><div className="sec">
        <FadeSection>
          <div style={{ textAlign: "center" }}>
            <Eyebrow delay={0}>// GET IN TOUCH</Eyebrow>
            <SectionTitle delay={0.1}>Contact</SectionTitle>
            <div className="contact-row">
              {[{ href: `mailto:${email}`, icon: "✉️", label: email }, { href: ig, icon: "📸", label: "@cherrycreek.robotics" }].map((c, i) => (
                <SlideIn key={c.label} direction="up" delay={0.2 + i * 0.12}>
                  <a href={c.href} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", textDecoration: "none", fontSize: isMobile ? 13 : 15, fontFamily: "'Share Tech Mono', monospace", padding: isMobile ? "12px 20px" : 0, background: isMobile ? "rgba(255,255,255,0.04)" : "transparent", borderRadius: isMobile ? 8 : 0, border: isMobile ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                    <span style={{ fontSize: 18 }}>{c.icon}</span>{c.label}
                  </a>
                </SlideIn>
              ))}
            </div>
          </div>
        </FadeSection>
      </div></section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: isMobile ? "32px 18px 20px" : "40px 32px 24px" }}>
        <div className="footer-top">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={logoUrl} alt="logo" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
            <div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 700, color: "#ef4444" }}>SOMETHING'S BRUIN</div>
              <div style={{ fontSize: 11, color: "#64748b", fontFamily: "'Share Tech Mono', monospace" }}>FRC Team 4550 · Cherry Creek High School</div>
            </div>
          </div>
          <div className="footer-links">
            {navItems.map(l => <a key={l} href={`#${l.toLowerCase().replace(/\s/g,"-")}`} style={{ color: "#64748b", textDecoration: "none", fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}>{l}</a>)}
            <a href="/member-hub" style={{ color: "#64748b", textDecoration: "none", fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}>Member Hub</a>
          </div>
        </div>
        <div style={{ textAlign: "center", color: "#334155", fontSize: 11, fontFamily: "'Share Tech Mono', monospace", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 18 }}>
          © {new Date().getFullYear()} FRC Team 4550 Something's Bruin · Built by Palivela_Joel
        </div>
      </footer>
    </div>
  );
}

function Eyebrow({ children, delay = 0 }) {
  return <SlideIn direction="left" delay={delay}><div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#ef4444", letterSpacing: 3, marginBottom: 10 }}>{children}</div></SlideIn>;
}
function SectionTitle({ children, delay = 0 }) {
  return <SlideIn direction="left" delay={delay}><h2 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: "clamp(20px,4vw,36px)", color: "#f1f5f9", marginBottom: 36 }}>{children}</h2></SlideIn>;
}
