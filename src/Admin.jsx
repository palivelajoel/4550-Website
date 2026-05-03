import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ehkwxzumgizryvhkeusr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoa3d4enVtZ2l6cnl2aGtldXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTEwODcsImV4cCI6MjA5MzI4NzA4N30.IXAhkAx1ygZpJMNSWNd3k80Hmt4rNmRtuFPnLZGcGuc'
)

export default function Admin() {
  const [authed, setAuthed] = useState(() => localStorage.getItem('admin_authed') === 'true')
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)

  const handleLogin = () => {
    if (pw === 'Admin@4550') {
      localStorage.setItem('admin_authed', 'true')
      setAuthed(true)
      setPwError(false)
    } else {
      setPwError(true)
    }
  }

  const fetchSuggestions = async () => {
    const { data } = await supabase.from('suggestions').select('*').order('submitted_at', { ascending: false })
    if (data) setSuggestions(data)
    setLoading(false)
  }

  const deleteSuggestion = async (id) => {
    await supabase.from('suggestions').delete().eq('id', id)
    setSuggestions(s => s.filter(x => x.id !== id))
  }

  useEffect(() => { if (authed) fetchSuggestions() }, [authed])

  const base = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 50%, #0a0f1e 100%)',
    fontFamily: '"DM Mono", "Courier New", monospace',
    color: '#e2e8f0',
    padding: '0',
  }

  if (!authed) return (
    <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{'@import url(\'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&display=swap\');'}</style>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '48px 40px', width: '100%', maxWidth: '380px', textAlign: 'center' }}>
        <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '24px', letterSpacing: '3px', color: '#60a5fa', marginBottom: '6px' }}>ADMIN PANEL</div>
        <div style={{ fontSize: '11px', color: '#475569', letterSpacing: '2px', marginBottom: '32px' }}>FRC TEAM 4550 · RESTRICTED</div>
        <input
          type='password'
          placeholder='Admin password'
          value={pw}
          onChange={e => { setPw(e.target.value); setPwError(false) }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: pwError ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '12px 16px', color: '#e2e8f0', fontSize: '13px', fontFamily: '"DM Mono", monospace', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }}
        />
        {pwError && <div style={{ color: '#ef4444', fontSize: '11px', marginBottom: '12px' }}>Incorrect password</div>}
        <button onClick={handleLogin} style={{ width: '100%', background: 'rgba(59,130,246,0.25)', border: '1px solid rgba(59,130,246,0.5)', borderRadius: '8px', padding: '12px', color: '#bfdbfe', fontSize: '13px', fontFamily: '"DM Mono", monospace', cursor: 'pointer', letterSpacing: '1px', marginTop: '4px' }}>ENTER</button>
        <a href='/' style={{ display: 'block', marginTop: '16px', fontSize: '11px', color: '#475569', textDecoration: 'none' }}>← Back to Sponsor Tracker</a>
      </div>
    </div>
  )

  return (
    <div style={base}>
      <style>{'@import url(\'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&display=swap\'); * { box-sizing: border-box; } body { margin: 0; }'}</style>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '24px', letterSpacing: '3px', color: '#60a5fa' }}>⚙️ ADMIN PANEL — SUGGESTIONS</div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#475569' }}>{suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}</span>
          <a href='/' style={{ fontSize: '11px', color: '#60a5fa', textDecoration: 'none', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', padding: '6px 12px' }}>← TRACKER</a>
          <button onClick={() => { localStorage.removeItem('admin_authed'); setAuthed(false) }} style={{ fontSize: '11px', color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontFamily: '"DM Mono", monospace' }}>LOGOUT</button>
        </div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: '800px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#475569', padding: '60px' }}>Loading...</div>
        ) : suggestions.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#475569', padding: '60px', fontSize: '13px' }}>No suggestions yet.</div>
        ) : (
          suggestions.map(s => (
            <div key={s.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: '1.6', marginBottom: '8px' }}>{s.message}</div>
                <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '1px' }}>{new Date(s.submitted_at).toLocaleString()}</div>
              </div>
              <button onClick={() => deleteSuggestion(s.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px', padding: '6px 14px', color: '#f87171', fontSize: '11px', cursor: 'pointer', fontFamily: '"DM Mono", monospace', whiteSpace: 'nowrap' }}>DELETE</button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
