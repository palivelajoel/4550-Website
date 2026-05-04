import { useState, useEffect, useRef } from 'react'

const NAV_ITEMS = ['Home', 'About', 'Outreach', 'Events', 'Media', 'Sponsors', 'Special Projects', 'T-Magazine', 'Donate', 'Contact']

function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}

function AnimSection({ children, delay = 0 }) {
  const [ref, inView] = useInView()
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0)' : 'translateY(48px)',
      transition: `opacity 0.8s ease ${delay}s, transform 0.8s ease ${delay}s`,
    }}>
      {children}
    </div>
  )
}

function Particles() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let W = canvas.width = window.innerWidth
    let H = canvas.height = window.innerHeight
    const pts = Array.from({ length: 120 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
      color: Math.random() > 0.7 ? '#ef4444' : Math.random() > 0.5 ? '#3b82f6' : '#ffffff'
    }))
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    window.addEventListener('resize', onResize)
    let raf
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color + '99'; ctx.fill()
      })
      pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (d < 120) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = `rgba(255,255,255,${0.06 * (1 - d / 120)})`; ctx.lineWidth = 0.5; ctx.stroke()
        }
      }))
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
}

export default function Landing() {
  const [navOpen, setNavOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('Home')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setNavOpen(false)
  }

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #080a0f; color: #e2e8f0; font-family: 'Exo 2', sans-serif; overflow-x: hidden; }
    ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0d1117; } ::-webkit-scrollbar-thumb { background: #ef4444; border-radius: 3px; }
    html { scroll-behavior: smooth; }
    .glow-red { text-shadow: 0 0 20px rgba(239,68,68,0.6), 0 0 40px rgba(239,68,68,0.3); }
    .glow-blue { text-shadow: 0 0 20px rgba(59,130,246,0.6), 0 0 40px rgba(59,130,246,0.3); }
    .nav-link { color: #94a3b8; text-decoration: none; font-family: 'Share Tech Mono', monospace; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; padding: 8px 0; transition: color 0.2s; position: relative; }
    .nav-link::after { content: ''; position: absolute; bottom: 0; left: 0; width: 0; height: 1px; background: #ef4444; transition: width 0.3s; }
    .nav-link:hover { color: #ef4444; } .nav-link:hover::after { width: 100%; }
    .section { padding: 100px 0; max-width: 1200px; margin: 0 auto; padding-left: 32px; padding-right: 32px; }
    .section-label { font-family: 'Share Tech Mono', monospace; font-size: 11px; letter-spacing: 4px; color: #ef4444; margin-bottom: 16px; text-transform: uppercase; }
    .section-title { font-family: 'Orbitron', monospace; font-size: clamp(28px, 4vw, 48px); font-weight: 900; line-height: 1.1; margin-bottom: 24px; }
    .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 32px; transition: all 0.3s; }
    .card:hover { background: rgba(255,255,255,0.06); border-color: rgba(239,68,68,0.3); transform: translateY(-4px); }
    .btn-red { background: linear-gradient(135deg, #dc2626, #b91c1c); border: none; border-radius: 8px; padding: 14px 32px; color: white; font-family: 'Orbitron', monospace; font-size: 13px; font-weight: 700; letter-spacing: 2px; cursor: pointer; transition: all 0.3s; text-decoration: none; display: inline-block; }
    .btn-red:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(220,38,38,0.4); }
    .btn-outline { background: transparent; border: 1px solid rgba(59,130,246,0.5); border-radius: 8px; padding: 14px 32px; color: #93c5fd; font-family: 'Orbitron', monospace; font-size: 13px; font-weight: 700; letter-spacing: 2px; cursor: pointer; transition: all 0.3s; text-decoration: none; display: inline-block; }
    .btn-outline:hover { background: rgba(59,130,246,0.15); border-color: #3b82f6; transform: translateY(-2px); }
    .divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(239,68,68,0.4), rgba(59,130,246,0.4), transparent); margin: 0; }
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; }
    .tag { display: inline-block; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 20px; padding: 4px 14px; font-family: 'Share Tech Mono', monospace; font-size: 10px; letter-spacing: 2px; color: #fca5a5; margin: 4px; }
    .social-btn { display: flex; align-items: center; gap: 12px; padding: 16px 24px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; color: #e2e8f0; text-decoration: none; font-family: 'Share Tech Mono', monospace; font-size: 13px; letter-spacing: 1px; transition: all 0.3s; }
    .social-btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(59,130,246,0.4); transform: translateX(4px); }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }
    @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
    @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
    .hero-logo { animation: float 4s ease-in-out infinite; }
    .rotating-ring { animation: spin-slow 20s linear infinite; }
    .cursor-blink { animation: blink 1s infinite; }
  `

  return (
    <div style={{ minHeight: '100vh', background: '#080a0f' }}>
      <style>{css}</style>

      {/* NAVBAR */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(8,10,15,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(239,68,68,0.2)' : 'none',
        transition: 'all 0.3s', padding: '0 32px', height: '72px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src='/logo.jpg' alt='Team 4550' style={{ height: '44px', width: '44px', objectFit: 'contain', borderRadius: '8px' }} />
          <div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: '14px', fontWeight: 900, color: '#ef4444', letterSpacing: '2px' }}>SOMETHING'S BRUIN</div>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: '#475569', letterSpacing: '3px' }}>FRC TEAM 4550</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
          {['About', 'Events', 'Media', 'Sponsors', 'Donate', 'Contact'].map(item => (
            <a key={item} className='nav-link' href={`#${item.toLowerCase()}`} onClick={e => { e.preventDefault(); scrollTo(item.toLowerCase()) }}>{item}</a>
          ))}
          <a href='/login' style={{
            background: 'linear-gradient(135deg, #dc2626, #b91c1c)', borderRadius: '6px',
            padding: '8px 20px', color: 'white', fontFamily: "'Orbitron', monospace",
            fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textDecoration: 'none',
            border: 'none', cursor: 'pointer', transition: 'all 0.3s',
          }} onMouseOver={e => e.target.style.boxShadow = '0 4px 16px rgba(220,38,38,0.5)'}
             onMouseOut={e => e.target.style.boxShadow = 'none'}>
            FOR MEMBERS ›
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section id='home' style={{ position: 'relative', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Particles />
        {/* Grid overlay */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(239,68,68,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', textAlign: 'center', zIndex: 2, padding: '0 32px' }}>
          <div className='hero-logo' style={{ marginBottom: '32px' }}>
            <img src='/logo.jpg' alt='Team 4550' style={{ width: '140px', height: '140px', objectFit: 'contain', borderRadius: '50%', border: '2px solid rgba(239,68,68,0.4)', boxShadow: '0 0 40px rgba(239,68,68,0.3), 0 0 80px rgba(239,68,68,0.1)' }} />
          </div>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '13px', letterSpacing: '6px', color: '#ef4444', marginBottom: '16px' }}>
            FRC TEAM 4550 · CHERRY CREEK HIGH SCHOOL · EST. 2012
          </div>
          <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: 'clamp(40px, 7vw, 90px)', fontWeight: 900, lineHeight: 1, marginBottom: '8px' }}>
            <span style={{ color: '#ef4444', display: 'block' }} className='glow-red'>SOMETHING'S</span>
            <span style={{ color: '#3b82f6', display: 'block' }} className='glow-blue'>BRUIN</span>
          </h1>
          <p style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '18px', color: '#94a3b8', maxWidth: '600px', margin: '24px auto 40px', lineHeight: 1.7 }}>
            Engineering the future. Inspiring the next generation of innovators at Cherry Creek High School, Greenwood Village, Colorado.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a className='btn-red' href='#about' onClick={e => { e.preventDefault(); scrollTo('about') }}>LEARN MORE</a>
            <a className='btn-outline' href='#donate' onClick={e => { e.preventDefault(); scrollTo('donate') }}>SUPPORT US</a>
          </div>
          <div style={{ marginTop: '64px', fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', color: '#334155', letterSpacing: '2px', animation: 'float 3s ease-in-out infinite' }}>
            ↓ SCROLL TO EXPLORE
          </div>
        </div>
      </section>

      <div className='divider' />

      {/* ABOUT */}
      <section id='about' style={{ padding: '100px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <AnimSection>
          <div className='section-label'>// ABOUT US</div>
          <h2 className='section-title'>
            <span style={{ color: '#ef4444' }}>WHO</span> WE ARE
          </h2>
        </AnimSection>
        <div className='grid-2' style={{ marginTop: '48px', alignItems: 'start' }}>
          <AnimSection delay={0.1}>
            <div className='card'>
              <p style={{ fontSize: '16px', lineHeight: 1.8, color: '#cbd5e1' }}>
                Team 4550 <em style={{ color: '#ef4444' }}>Something's Bruin</em> Robotics was created in 2012 by a group of high school students at Cherry Creek High School. We are a student-led club with mentors and teachers providing guidance to members.
              </p>
              <p style={{ fontSize: '16px', lineHeight: 1.8, color: '#cbd5e1', marginTop: '16px' }}>
                Our team consists of <strong style={{ color: '#60a5fa' }}>40–50 members</strong> from all levels and backgrounds, operating across three sub-teams: <strong style={{ color: '#ef4444' }}>Mechanical</strong>, <strong style={{ color: '#60a5fa' }}>Electrical</strong>, and <strong style={{ color: '#a78bfa' }}>Programming</strong> — all while engaging in marketing and outreach.
              </p>
              <div style={{ marginTop: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Mechanical', 'Electrical', 'Programming', 'Marketing', 'Outreach'].map(t => <span key={t} className='tag'>{t}</span>)}
              </div>
            </div>
          </AnimSection>
          <AnimSection delay={0.2}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { num: '12+', label: 'Years of Innovation', color: '#ef4444' },
                { num: '40–50', label: 'Active Members', color: '#3b82f6' },
                { num: '2016', label: 'World Championship', color: '#eab308' },
                { num: '3', label: 'Sub-Teams', color: '#a78bfa' },
              ].map(s => (
                <div key={s.label} className='card' style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px 24px' }}>
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: '32px', fontWeight: 900, color: s.color, minWidth: '80px' }}>{s.num}</div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '12px', letterSpacing: '2px', color: '#94a3b8', textTransform: 'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </AnimSection>
        </div>

        {/* Leadership */}
        <AnimSection delay={0.1}>
          <div style={{ marginTop: '64px' }}>
            <div className='section-label'>// LEADERSHIP</div>
            <div className='grid-3' style={{ marginTop: '24px' }}>
              {[
                { role: 'Captain', name: 'Ian Funk', icon: '⚡' },
                { role: 'Captain', name: 'Edward Cherkasskiy', icon: '⚡' },
                { role: 'Head Mentor', name: 'Dr. Keith Harrison', icon: '🎓' },
              ].map(p => (
                <div key={p.name} className='card' style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>{p.icon}</div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', letterSpacing: '3px', color: '#ef4444', marginBottom: '8px' }}>{p.role}</div>
                  <div style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '18px', fontWeight: 600, color: '#f1f5f9' }}>{p.name}</div>
                </div>
              ))}
            </div>
          </div>
        </AnimSection>
      </section>

      <div className='divider' />

      {/* OUTREACH */}
      <section id='outreach' style={{ padding: '100px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <AnimSection>
          <div className='section-label'>// OUTREACH</div>
          <h2 className='section-title'>COMMUNITY <span style={{ color: '#3b82f6' }}>IMPACT</span></h2>
          <p style={{ fontSize: '16px', color: '#94a3b8', maxWidth: '600px', lineHeight: 1.8 }}>
            We believe in growing STEM beyond our school walls. From mentoring younger teams to community events, we're committed to inspiring the next generation.
          </p>
        </AnimSection>
        <div className='grid-3' style={{ marginTop: '48px' }}>
          {[
            { icon: '🤝', title: 'Team Mentoring', desc: 'Collaborating with local FRC teams to share knowledge and experience.' },
            { icon: '🏫', title: 'School Outreach', desc: 'Visiting elementary and middle schools to spark interest in STEM and robotics.' },
            { icon: '🌎', title: 'Community Events', desc: 'Participating in community events to showcase robotics and inspire young minds.' },
          ].map(o => (
            <AnimSection key={o.title} delay={0.1}>
              <div className='card' style={{ height: '100%' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>{o.icon}</div>
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '12px' }}>{o.title}</div>
                <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7 }}>{o.desc}</p>
              </div>
            </AnimSection>
          ))}
        </div>
      </section>

      <div className='divider' />

      {/* EVENTS */}
      <section id='events' style={{ padding: '100px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <AnimSection>
          <div className='section-label'>// EVENTS</div>
          <h2 className='section-title'>2025 <span style={{ color: '#ef4444' }}>SEASON</span></h2>
        </AnimSection>
        <AnimSection delay={0.1}>
          <div className='grid-2' style={{ marginTop: '48px' }}>
            {[
              { name: 'Utah Regional', date: 'April 16–19, 2026', location: 'Salt Lake City, UT', status: 'Competed', color: '#22c55e' },
              { name: 'Colorado Regional', date: 'TBD', location: 'Denver, CO', status: 'Upcoming', color: '#3b82f6' },
            ].map(e => (
              <div key={e.name} className='card' style={{ borderLeft: `3px solid ${e.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>{e.name}</div>
                  <span style={{ background: e.color + '20', border: `1px solid ${e.color}50`, borderRadius: '20px', padding: '3px 12px', fontSize: '10px', fontFamily: "'Share Tech Mono', monospace", color: e.color, letterSpacing: '1px' }}>{e.status}</span>
                </div>
                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '12px', color: '#94a3b8', letterSpacing: '1px' }}>📅 {e.date}</div>
                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '12px', color: '#94a3b8', letterSpacing: '1px', marginTop: '4px' }}>📍 {e.location}</div>
              </div>
            ))}
          </div>
        </AnimSection>
      </section>

      <div className='divider' />

      {/* MEDIA */}
      <section id='media' style={{ padding: '100px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <AnimSection>
          <div className='section-label'>// MEDIA</div>
          <h2 className='section-title'>FOLLOW <span style={{ color: '#3b82f6' }}>OUR JOURNEY</span></h2>
          <p style={{ fontSize: '16px', color: '#94a3b8', lineHeight: 1.8, marginBottom: '48px' }}>Stay connected with Team 4550 across our social platforms.</p>
        </AnimSection>
        <div className='grid-2' style={{ gap: '16px' }}>
          {[
            { icon: '📸', label: 'INSTAGRAM', handle: '@cherrycreek.robotics', url: 'https://www.instagram.com/cherrycreek.robotics', color: '#e1306c' },
            { icon: '▶️', label: 'YOUTUBE', handle: 'Team 4550 Something\'s Bruin', url: 'https://www.youtube.com/channel/UC4_P1A5xYb7A7rCdEXdKzBQ', color: '#ff0000' },
          ].map(s => (
            <AnimSection key={s.label} delay={0.1}>
              <a href={s.url} target='_blank' rel='noreferrer' className='social-btn' style={{ borderColor: s.color + '30' }}>
                <span style={{ fontSize: '28px' }}>{s.icon}</span>
                <div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', letterSpacing: '3px', color: s.color, marginBottom: '4px' }}>{s.label}</div>
                  <div style={{ fontSize: '14px', color: '#e2e8f0' }}>{s.handle}</div>
                </div>
              </a>
            </AnimSection>
          ))}
        </div>
      </section>

      <div className='divider' />

      {/* SPONSORS */}
      <section id='sponsors' style={{ padding: '100px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <AnimSection>
          <div className='section-label'>// SPONSORS</div>
          <h2 className='section-title'>OUR <span style={{ color: '#eab308' }}>SUPPORTERS</span></h2>
          <p style={{ fontSize: '16px', color: '#94a3b8', maxWidth: '600px', lineHeight: 1.8, marginBottom: '48px' }}>
            We are deeply grateful to our sponsors who make our robotics program possible. Interested in supporting Team 4550?
          </p>
        </AnimSection>
        <AnimSection delay={0.1}>
          <div style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.05), rgba(59,130,246,0.05))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '48px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: '20px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>Become a Sponsor</div>
            <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: 1.7, maxWidth: '500px', margin: '0 auto 32px' }}>
              Your support helps us purchase materials, travel to competitions, and inspire the next generation of engineers. Recognition on our robot, team shirts, and website.
            </p>
            <a href='mailto:team4550frc@gmail.com' className='btn-red'>CONTACT US TO SPONSOR</a>
          </div>
        </AnimSection>
      </section>

      <div className='divider' />

      {/* DONATE */}
      <section id='donate' style={{ padding: '100px 32px', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        <AnimSection>
          <div className='section-label'>// SUPPORT THE TEAM</div>
          <h2 className='section-title'>HELP US <span style={{ color: '#22c55e' }}>BUILD</span> THE FUTURE</h2>
          <p style={{ fontSize: '16px', color: '#94a3b8', maxWidth: '600px', margin: '0 auto 48px', lineHeight: 1.8 }}>
            Every donation directly funds robot components, competition fees, travel, and outreach programs. 100% goes to Team 4550.
          </p>
          <a href='https://www.vancoevents.com/us/events/landing/46671' target='_blank' rel='noreferrer' className='btn-red' style={{ fontSize: '16px', padding: '18px 48px' }}>
            DONATE NOW ›
          </a>
        </AnimSection>
      </section>

      <div className='divider' />

      {/* CONTACT */}
      <section id='contact' style={{ padding: '100px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <AnimSection>
          <div className='section-label'>// CONTACT</div>
          <h2 className='section-title'>GET IN <span style={{ color: '#3b82f6' }}>TOUCH</span></h2>
        </AnimSection>
        <div className='grid-2' style={{ marginTop: '48px' }}>
          {[
            { icon: '📧', label: 'General Inquiries', value: 'team4550frc@gmail.com', url: 'mailto:team4550frc@gmail.com' },
            { icon: '📸', label: 'Instagram', value: '@cherrycreek.robotics', url: 'https://www.instagram.com/cherrycreek.robotics' },
          ].map(c => (
            <AnimSection key={c.label} delay={0.1}>
              <a href={c.url} target='_blank' rel='noreferrer' className='social-btn'>
                <span style={{ fontSize: '28px' }}>{c.icon}</span>
                <div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', letterSpacing: '3px', color: '#94a3b8', marginBottom: '4px' }}>{c.label}</div>
                  <div style={{ fontSize: '14px', color: '#93c5fd' }}>{c.value}</div>
                </div>
              </a>
            </AnimSection>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: 'rgba(0,0,0,0.5)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px 32px', textAlign: 'center' }}>
        <img src='/logo.jpg' alt='Team 4550' style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '50%', marginBottom: '16px', opacity: 0.7 }} />
        <div style={{ fontFamily: "'Orbitron', monospace", fontSize: '14px', fontWeight: 700, color: '#ef4444', letterSpacing: '3px', marginBottom: '8px' }}>SOMETHING'S BRUIN</div>
        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', color: '#334155', letterSpacing: '3px', marginBottom: '24px' }}>FRC TEAM 4550 · CHERRY CREEK HIGH SCHOOL · GREENWOOD VILLAGE, CO</div>
        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '32px' }}>
          {['Home', 'About', 'Outreach', 'Events', 'Media', 'Sponsors', 'Donate', 'Contact'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} onClick={e => { e.preventDefault(); scrollTo(item.toLowerCase()) }} className='nav-link' style={{ fontSize: '11px' }}>{item}</a>
          ))}
        </div>
        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', color: '#1e293b', letterSpacing: '2px' }}>
          COPYRIGHT © 2025 TEAM 4550 SOMETHING'S BRUIN · ALL RIGHTS RESERVED
        </div>
      </footer>
    </div>
  )
}
