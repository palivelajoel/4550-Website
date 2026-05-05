import { useEffect, useRef, useState } from "react";

const SUPABASE_URL = "https://ehkwxzumgizryvhkeusr.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoa3d4enVtZ2l6cnl2aGtldXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTEwODcsImV4cCI6MjA5MzI4NzA4N30.IXAhkAx1ygZpJMNSWNd3k80Hmt4rNmRtuFPnLZGcGuc";

async function sbFetch(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

// ── Parallax hook (members-only sections) ──────────────────────────────────
function useParallax() {
  const [scrollY, setScrollY] = useState(0);
  const lastY = useRef(0);
  const velRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    function onScroll() {
      const current = window.scrollY;
      velRef.current = current - lastY.current;
      lastY.current = current;
      setScrollY(current);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return scrollY;
}

// ── Particle canvas ────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);
  const particles = useRef([]);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    const count = Math.floor((W * H) / 12000);
    particles.current = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
    }));

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const pts = particles.current;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fill();

        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(239,68,68,${0.15 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animRef.current = requestAnimationFrame(draw);
    }

    draw();

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        opacity: 0.6,
      }}
    />
  );
}

// ── Section fade-in observer ───────────────────────────────────────────────
function useFadeIn() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function FadeSection({ children, style }) {
  const [ref, visible] = useFadeIn();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Main Landing ───────────────────────────────────────────────────────────
export default function Landing() {
  const scrollY = useParallax();
  const [config, setConfig] = useState({});
  const [captains, setCaptains] = useState([]);
  const [logoUrl, setLogoUrl] = useState("/logo.jpg");

  useEffect(() => {
    document.title = "Team 4550 Something's Bruin";
    loadConfig();
    loadCaptains();
  }, []);

  async function loadConfig() {
    const rows = await sbFetch("site_config?select=key,value");
    if (!rows) return;
    const obj = {};
    rows.forEach(r => { obj[r.key] = r.value; });
    setConfig(obj);
    if (obj.logo_url) setLogoUrl(obj.logo_url);
  }

  async function loadCaptains() {
    const rows = await sbFetch("captains?select=*&order=sort_order.asc");
    if (rows) setCaptains(rows);
  }

  const teamEmail = config.team_email || "team4550frc@gmail.com";
  const instagram = config.instagram || "https://www.instagram.com/cherrycreek.robotics";
  const youtube = config.youtube || "https://www.youtube.com/channel/UC4_P1A5xYb7A7rCdEXdKzBQ";
  const donateUrl = config.donate_url || "https://www.vancoevents.com/us/events/landing/46671";

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700&family=Bebas+Neue&family=DM+Mono&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #080a0f; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #ef4444; border-radius: 3px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* NAV */}
      <nav style={S.nav}>
        <div style={S.navBrand}>
          <img src={logoUrl} alt="logo" style={S.navLogo} />
          <span style={S.navTitle}>SOMETHING'S BRUIN</span>
        </div>
        <div style={S.navLinks}>
          {["About", "Team", "Outreach", "Sponsors", "Contact"].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} style={S.navLink}>{l}</a>
          ))}
          <a href="/hub" style={S.memberBtn}>FOR MEMBERS ›</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ ...S.hero, position: "relative", overflow: "hidden" }}>
        <ParticleCanvas />
        {/* Grid overlay */}
        <div style={S.gridOverlay} />
        <div style={{ ...S.heroContent, transform: `translateY(${scrollY * 0.25}px)` }}>
          <div style={S.heroEyebrow}>FRC ROBOTICS · CHERRY CREEK HIGH SCHOOL · GREENWOOD VILLAGE, CO</div>
          <img src={logoUrl} alt="Team Logo" style={S.heroLogo} />
          <h1 style={S.heroTitle}>SOMETHING'S BRUIN</h1>
          <div style={S.heroSub}>FRC TEAM 4550</div>
          <div style={S.heroDivider} />
          <p style={S.heroTagline}>
            Engineering excellence. Community impact. Championship mindset.
          </p>
          <div style={S.heroBtns}>
            <a href="#about" style={S.heroBtnPrimary}>LEARN MORE</a>
            <a href={donateUrl} target="_blank" rel="noreferrer" style={S.heroBtnSecondary}>SUPPORT US</a>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" style={S.section}>
        <FadeSection>
          <div style={S.sectionLabel}>// WHO WE ARE</div>
          <h2 style={S.sectionTitle}>About the Team</h2>
          <div style={S.aboutGrid}>
            <div style={S.aboutText}>
              <p style={S.body}>
                FRC Team 4550 "Something's Bruin" has been competing since 2012, representing Cherry Creek High School in FIRST Robotics Competition. Our team of 40–50 student engineers, programmers, and designers builds competition-ready robots each season — from scratch, in six weeks.
              </p>
              <p style={{ ...S.body, marginTop: 16 }}>
                We've competed at the 2016 World Championship and continue to push the boundaries of what student-built robots can achieve. Beyond the robot, we're committed to STEM outreach and community impact.
              </p>
            </div>
            <div style={S.statsGrid}>
              {[
                { num: "12+", label: "Years Competing" },
                { num: "40–50", label: "Members" },
                { num: "2016", label: "World Championship" },
                { num: "3", label: "Sub-Teams" },
              ].map(s => (
                <div key={s.label} style={S.statCard}>
                  <div style={S.statNum}>{s.num}</div>
                  <div style={S.statLabel}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </FadeSection>
      </section>

      {/* OUR TEAM / CAPTAINS */}
      {captains.length > 0 && (
        <section id="team" style={{ ...S.section, background: "rgba(255,255,255,0.015)" }}>
          <FadeSection>
            <div style={S.sectionLabel}>// LEADERSHIP</div>
            <h2 style={S.sectionTitle}>Our Team</h2>
            <div style={S.captainsGrid}>
              {captains.map((c, i) => (
                <CaptainCard key={c.id} captain={c} index={i} scrollY={scrollY} />
              ))}
            </div>
          </FadeSection>
        </section>
      )}

      {/* OUTREACH / COMMUNITY */}
      <section id="outreach" style={S.section}>
        <FadeSection>
          <div style={S.sectionLabel}>// COMMUNITY</div>
          <h2 style={S.sectionTitle}>Community Outreach</h2>
          <div style={S.outreachGrid}>
            {[
              { icon: "🤖", title: "Team Mentoring", desc: "We mentor younger FRC and FLL teams throughout the Denver metro area, sharing technical knowledge and competition experience." },
              { icon: "🏫", title: "School Outreach", desc: "Visiting local elementary and middle schools to inspire the next generation of engineers through hands-on robotics demos." },
              { icon: "🌍", title: "Community Events", desc: "Participating in local STEM fairs, library events, and community festivals to promote robotics and engineering education." },
            ].map(o => (
              <div key={o.title} style={S.outreachCard}>
                <div style={S.outreachIcon}>{o.icon}</div>
                <div style={S.outreachTitle}>{o.title}</div>
                <p style={S.body}>{o.desc}</p>
              </div>
            ))}
          </div>
        </FadeSection>
      </section>

      {/* MEDIA */}
      <section id="media" style={{ ...S.section, background: "rgba(255,255,255,0.015)" }}>
        <FadeSection>
          <div style={S.sectionLabel}>// FOLLOW ALONG</div>
          <h2 style={S.sectionTitle}>Media</h2>
          <div style={S.mediaRow}>
            <a href={instagram} target="_blank" rel="noreferrer" style={S.mediaCard}>
              <div style={S.mediaIcon}>📸</div>
              <div style={S.mediaCardTitle}>Instagram</div>
              <div style={S.mediaHandle}>@cherrycreek.robotics</div>
            </a>
            <a href={youtube} target="_blank" rel="noreferrer" style={{ ...S.mediaCard, borderColor: "rgba(239,68,68,0.3)" }}>
              <div style={S.mediaIcon}>▶️</div>
              <div style={S.mediaCardTitle}>YouTube</div>
              <div style={S.mediaHandle}>Team 4550 Something's Bruin</div>
            </a>
          </div>
        </FadeSection>
      </section>

      {/* SPONSORS */}
      <section id="sponsors" style={S.section}>
        <FadeSection>
          <div style={S.sectionLabel}>// PARTNER WITH US</div>
          <h2 style={S.sectionTitle}>Become a Sponsor</h2>
          <div style={S.sponsorContent}>
            <p style={{ ...S.body, maxWidth: 600, margin: "0 auto 32px", textAlign: "center" }}>
              Sponsoring FRC Team 4550 connects your organization with motivated young engineers and demonstrates your commitment to STEM education. We offer multiple sponsorship tiers with recognition at competitions, on our robot, and across our platforms.
            </p>
            <div style={S.tierRow}>
              {[
                { name: "Bronze", color: "#b45309" },
                { name: "Silver", color: "#94a3b8" },
                { name: "Gold", color: "#eab308" },
                { name: "Platinum", color: "#818cf8" },
              ].map(t => (
                <div key={t.name} style={{ ...S.tierBadge, borderColor: t.color, color: t.color }}>
                  {t.name}
                </div>
              ))}
            </div>
            <a href={`mailto:${teamEmail}`} style={S.heroBtnPrimary}>CONTACT US TO SPONSOR</a>
          </div>
        </FadeSection>
      </section>

      {/* DONATE */}
      <section style={{ ...S.section, background: "rgba(239,68,68,0.05)", borderTop: "1px solid rgba(239,68,68,0.2)" }}>
        <FadeSection>
          <div style={{ textAlign: "center" }}>
            <div style={S.sectionLabel}>// SUPPORT THE TEAM</div>
            <h2 style={S.sectionTitle}>Make a Donation</h2>
            <p style={{ ...S.body, maxWidth: 500, margin: "0 auto 32px" }}>
              Every donation goes directly toward robot parts, competition fees, and team travel. Help us compete at the highest level.
            </p>
            <a href={donateUrl} target="_blank" rel="noreferrer" style={S.heroBtnPrimary}>DONATE NOW</a>
          </div>
        </FadeSection>
      </section>

      {/* CONTACT */}
      <section id="contact" style={S.section}>
        <FadeSection>
          <div style={{ textAlign: "center" }}>
            <div style={S.sectionLabel}>// GET IN TOUCH</div>
            <h2 style={S.sectionTitle}>Contact</h2>
            <div style={S.contactRow}>
              <a href={`mailto:${teamEmail}`} style={S.contactItem}>
                <span style={S.contactIcon}>✉️</span>
                {teamEmail}
              </a>
              <a href={instagram} target="_blank" rel="noreferrer" style={S.contactItem}>
                <span style={S.contactIcon}>📸</span>
                @cherrycreek.robotics
              </a>
            </div>
          </div>
        </FadeSection>
      </section>

      {/* FOOTER */}
      <footer style={S.footer}>
        <div style={S.footerTop}>
          <div style={S.footerBrand}>
            <img src={logoUrl} alt="logo" style={S.footerLogo} />
            <div>
              <div style={S.footerName}>SOMETHING'S BRUIN</div>
              <div style={S.footerSub}>FRC Team 4550 · Cherry Creek High School</div>
            </div>
          </div>
          <div style={S.footerLinks}>
            {["About", "Team", "Outreach", "Sponsors", "Contact"].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} style={S.footerLink}>{l}</a>
            ))}
            <a href="/hub" style={S.footerLink}>Member Hub</a>
          </div>
        </div>
        <div style={S.footerBottom}>
          © {new Date().getFullYear()} FRC Team 4550 Something's Bruin · Built by Palivela_Joel
        </div>
      </footer>
    </div>
  );
}

// ── Captain Card with parallax ─────────────────────────────────────────────
function CaptainCard({ captain, index, scrollY }) {
  const ref = useRef(null);
  const [offsetY, setOffsetY] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!ref.current || !visible) return;
    const rect = ref.current.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const windowCenter = window.innerHeight / 2;
    setOffsetY((centerY - windowCenter) * 0.06);
  }, [scrollY, visible]);

  return (
    <div
      ref={ref}
      style={{
        ...S.captainCard,
        transform: `translateY(${offsetY}px)`,
        animationDelay: `${index * 0.1}s`,
      }}
    >
      {captain.photo_url ? (
        <img src={captain.photo_url} alt={captain.name} style={S.captainPhoto} />
      ) : (
        <div style={S.captainPhotoPlaceholder}>
          {captain.name ? captain.name[0].toUpperCase() : "?"}
        </div>
      )}
      <div style={S.captainName}>{captain.name}</div>
      <div style={S.captainRole}>{captain.position}</div>
      {captain.bio && <p style={S.captainBio}>{captain.bio}</p>}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const S = {
  page: { background: "#080a0f", color: "#f1f5f9", fontFamily: "'Exo 2', sans-serif", overflowX: "hidden" },
  nav: {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 32px",
    background: "rgba(8,10,15,0.92)", backdropFilter: "blur(16px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  navBrand: { display: "flex", alignItems: "center", gap: 10 },
  navLogo: { width: 34, height: 34, borderRadius: "50%", objectFit: "cover" },
  navTitle: { fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 700, color: "#ef4444", letterSpacing: 2 },
  navLinks: { display: "flex", alignItems: "center", gap: 24 },
  navLink: { color: "#94a3b8", textDecoration: "none", fontSize: 13, fontFamily: "'Share Tech Mono', monospace", transition: "color 0.2s" },
  memberBtn: {
    background: "transparent", border: "1px solid #ef4444", color: "#ef4444",
    padding: "7px 16px", borderRadius: 4, textDecoration: "none",
    fontSize: 12, fontFamily: "'Orbitron', sans-serif", letterSpacing: 1,
    transition: "all 0.2s",
  },
  hero: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(180deg, #080a0f 0%, #0d1117 100%)",
    paddingTop: 80,
  },
  gridOverlay: {
    position: "absolute", inset: 0,
    backgroundImage: "linear-gradient(rgba(239,68,68,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.04) 1px, transparent 1px)",
    backgroundSize: "60px 60px",
    pointerEvents: "none",
  },
  heroContent: { textAlign: "center", zIndex: 1, padding: "0 24px" },
  heroEyebrow: { fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#64748b", letterSpacing: 3, marginBottom: 24 },
  heroLogo: {
    width: 110, height: 110, borderRadius: "50%", objectFit: "cover",
    border: "2px solid rgba(239,68,68,0.4)",
    boxShadow: "0 0 40px rgba(239,68,68,0.2)",
    marginBottom: 28,
    animation: "fadeUp 0.8s ease both",
  },
  heroTitle: {
    fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: "clamp(32px, 6vw, 72px)",
    letterSpacing: 4, color: "#f1f5f9",
    animation: "fadeUp 0.8s ease 0.15s both",
  },
  heroSub: {
    fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(18px, 3vw, 32px)",
    color: "#ef4444", letterSpacing: 8, marginTop: 8,
    animation: "fadeUp 0.8s ease 0.25s both",
  },
  heroDivider: {
    width: 60, height: 2, background: "linear-gradient(90deg, transparent, #ef4444, transparent)",
    margin: "24px auto",
    animation: "fadeUp 0.8s ease 0.35s both",
  },
  heroTagline: { color: "#94a3b8", fontSize: 16, maxWidth: 480, margin: "0 auto 36px", animation: "fadeUp 0.8s ease 0.4s both" },
  heroBtns: { display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", animation: "fadeUp 0.8s ease 0.5s both" },
  heroBtnPrimary: {
    background: "#ef4444", color: "#fff", textDecoration: "none",
    padding: "14px 32px", borderRadius: 6, fontFamily: "'Orbitron', sans-serif",
    fontWeight: 700, fontSize: 13, letterSpacing: 2,
  },
  heroBtnSecondary: {
    background: "transparent", color: "#ef4444", textDecoration: "none",
    padding: "14px 32px", borderRadius: 6, border: "1px solid #ef4444",
    fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 2,
  },
  section: { padding: "100px 24px", maxWidth: 1100, margin: "0 auto" },
  sectionLabel: { fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#ef4444", letterSpacing: 3, marginBottom: 12 },
  sectionTitle: { fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: "clamp(24px, 4vw, 40px)", color: "#f1f5f9", marginBottom: 48 },
  body: { color: "#94a3b8", lineHeight: 1.8, fontSize: 15 },
  aboutGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "start" },
  aboutText: {},
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  statCard: {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, padding: "24px 20px", textAlign: "center",
  },
  statNum: { fontFamily: "'Orbitron', sans-serif", fontSize: 28, fontWeight: 700, color: "#ef4444" },
  statLabel: { fontSize: 12, color: "#64748b", fontFamily: "'Share Tech Mono', monospace", marginTop: 4 },

  // CAPTAINS
  captainsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 28,
  },
  captainCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "28px 20px",
    textAlign: "center",
    transition: "transform 0.1s ease",
  },
  captainPhoto: {
    width: 90, height: 90, borderRadius: "50%", objectFit: "cover",
    border: "2px solid rgba(239,68,68,0.4)",
    marginBottom: 16, display: "block", margin: "0 auto 16px",
  },
  captainPhotoPlaceholder: {
    width: 90, height: 90, borderRadius: "50%",
    background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 16px",
    fontFamily: "'Orbitron', sans-serif", fontSize: 28, color: "#ef4444",
  },
  captainName: { fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 },
  captainRole: { fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#ef4444", letterSpacing: 2, marginBottom: 12 },
  captainBio: { color: "#64748b", fontSize: 12, lineHeight: 1.6 },

  // OUTREACH
  outreachGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 },
  outreachCard: {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, padding: "28px 24px",
  },
  outreachIcon: { fontSize: 32, marginBottom: 12 },
  outreachTitle: { fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 12 },

  // MEDIA
  mediaRow: { display: "flex", gap: 24, flexWrap: "wrap" },
  mediaCard: {
    flex: "1 1 220px", background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(59,130,246,0.3)", borderRadius: 10,
    padding: "32px 24px", textDecoration: "none", textAlign: "center",
    transition: "transform 0.2s",
  },
  mediaIcon: { fontSize: 36, marginBottom: 12 },
  mediaCardTitle: { fontFamily: "'Orbitron', sans-serif", fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 },
  mediaHandle: { fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#64748b" },

  // SPONSORS
  sponsorContent: { textAlign: "center" },
  tierRow: { display: "flex", gap: 16, justifyContent: "center", marginBottom: 32, flexWrap: "wrap" },
  tierBadge: {
    border: "1px solid", borderRadius: 20, padding: "6px 20px",
    fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 2,
  },

  // CONTACT
  contactRow: { display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap", marginTop: 24 },
  contactItem: {
    display: "flex", alignItems: "center", gap: 8,
    color: "#94a3b8", textDecoration: "none", fontSize: 15,
    fontFamily: "'Share Tech Mono', monospace",
  },
  contactIcon: { fontSize: 20 },

  // FOOTER
  footer: { borderTop: "1px solid rgba(255,255,255,0.06)", padding: "40px 32px 24px" },
  footerTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 24 },
  footerBrand: { display: "flex", alignItems: "center", gap: 12 },
  footerLogo: { width: 40, height: 40, borderRadius: "50%", objectFit: "cover" },
  footerName: { fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 700, color: "#ef4444" },
  footerSub: { fontSize: 12, color: "#64748b", fontFamily: "'Share Tech Mono', monospace" },
  footerLinks: { display: "flex", gap: 20, flexWrap: "wrap" },
  footerLink: { color: "#64748b", textDecoration: "none", fontSize: 13, fontFamily: "'Share Tech Mono', monospace" },
  footerBottom: { textAlign: "center", color: "#334155", fontSize: 12, fontFamily: "'Share Tech Mono', monospace", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 20 },
};
