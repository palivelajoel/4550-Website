import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ehkwxzumgizryvhkeusr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoa3d4enVtZ2l6cnl2aGtldXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTEwODcsImV4cCI6MjA5MzI4NzA4N30.IXAhkAx1ygZpJMNSWNd3k80Hmt4rNmRtuFPnLZGcGuc'
)

const PRIORITY_COLORS = { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444' }
const TASK_STATUSES = ['To Do', 'In Progress', 'Done']

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080a0f; color: #e2e8f0; font-family: 'Exo 2', sans-serif; }
  ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0d1117; } ::-webkit-scrollbar-thumb { background: #ef4444; border-radius: 3px; }
  input, textarea, select { font-family: 'Share Tech Mono', monospace; }
  input::placeholder, textarea::placeholder { color: #334155; }
  select option { background: #0d1117; color: #e2e8f0; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  .section-card { animation: fadeIn 0.4s ease; }
`

const S = {
  page: { minHeight: '100vh', background: '#080a0f' },
  sidebar: { width: '260px', background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.06)', height: '100vh', position: 'fixed', top: 0, left: 0, display: 'flex', flexDirection: 'column', zIndex: 10 },
  sidebarTop: { padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  sidebarNav: { flex: 1, padding: '16px 12px', overflowY: 'auto' },
  navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', background: active ? 'rgba(239,68,68,0.1)' : 'transparent', border: active ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent', color: active ? '#fca5a5' : '#64748b', fontFamily: "'Share Tech Mono', monospace", fontSize: '12px', letterSpacing: '1px', marginBottom: '4px', transition: 'all 0.2s' }),
  main: { marginLeft: '260px', minHeight: '100vh', padding: '32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  pageTitle: { fontFamily: "'Orbitron', monospace", fontSize: '24px', fontWeight: 900, color: '#f1f5f9' },
  card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px', marginBottom: '16px' },
  cardTitle: { fontFamily: "'Orbitron', monospace", fontSize: '13px', fontWeight: 700, color: '#60a5fa', letterSpacing: '2px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' },
  input: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', color: '#e2e8f0', fontSize: '13px', outline: 'none', fontFamily: "'Share Tech Mono', monospace" },
  label: { display: 'block', fontSize: '10px', color: '#475569', letterSpacing: '2px', marginBottom: '6px', fontFamily: "'Share Tech Mono', monospace" },
  field: { marginBottom: '14px' },
  btnRed: { background: 'linear-gradient(135deg, #dc2626, #b91c1c)', border: 'none', borderRadius: '8px', padding: '10px 20px', color: 'white', fontFamily: "'Orbitron', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '2px', cursor: 'pointer', transition: 'all 0.2s' },
  btnBlue: { background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '8px', padding: '10px 20px', color: '#93c5fd', fontFamily: "'Orbitron', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '2px', cursor: 'pointer', transition: 'all 0.2s' },
  btnGhost: { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 16px', color: '#64748b', fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s' },
  btnDanger: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '6px 12px', color: '#f87171', fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', cursor: 'pointer' },
  badge: (color) => ({ display: 'inline-block', background: color + '20', border: `1px solid ${color}50`, borderRadius: '20px', padding: '3px 12px', fontSize: '10px', fontFamily: "'Share Tech Mono', monospace", color, letterSpacing: '1px' }),
  row: { display: 'flex', gap: '12px', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  statCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px', textAlign: 'center' },
  toast: { position: 'fixed', bottom: '24px', right: '24px', background: '#1e3a5f', border: '1px solid rgba(96,165,250,0.4)', borderRadius: '10px', padding: '12px 20px', color: '#e2e8f0', fontSize: '13px', zIndex: 2000, fontFamily: "'Share Tech Mono', monospace", animation: 'fadeIn 0.3s ease' },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modalBox: { background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' },
}

// LOGIN
function Login({ onLogin }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)
  return (
    <div style={{ minHeight: '100vh', background: '#080a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{css}</style>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '48px 40px', width: '100%', maxWidth: '380px', textAlign: 'center' }}>
        <img src='/logo.jpg' alt='Team 4550' style={{ width: '72px', height: '72px', objectFit: 'contain', borderRadius: '50%', border: '2px solid rgba(239,68,68,0.4)', marginBottom: '20px' }} />
        <div style={{ fontFamily: "'Orbitron', monospace", fontSize: '18px', fontWeight: 900, color: '#ef4444', letterSpacing: '3px', marginBottom: '4px' }}>ADMIN PANEL</div>
        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: '#334155', letterSpacing: '3px', marginBottom: '32px' }}>FRC TEAM 4550 · RESTRICTED ACCESS</div>
        <input type='password' placeholder='Admin password' value={pw} onChange={e => { setPw(e.target.value); setErr(false) }} onKeyDown={e => e.key === 'Enter' && (pw === 'Admin@4550' ? (localStorage.setItem('admin_authed', 'true'), onLogin()) : setErr(true))} style={{ ...S.input, textAlign: 'center', marginBottom: '8px', border: err ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)' }} />
        {err && <div style={{ color: '#ef4444', fontSize: '11px', fontFamily: "'Share Tech Mono', monospace", marginBottom: '8px' }}>Incorrect password</div>}
        <button style={{ ...S.btnRed, width: '100%', marginTop: '8px', padding: '12px' }} onClick={() => pw === 'Admin@4550' ? (localStorage.setItem('admin_authed', 'true'), onLogin()) : setErr(true)}>ENTER</button>
        <a href='/' style={{ display: 'block', marginTop: '20px', fontSize: '11px', color: '#334155', fontFamily: "'Share Tech Mono', monospace", textDecoration: 'none' }}>← BACK TO SITE</a>
      </div>
    </div>
  )
}

// OVERVIEW
function Overview({ members, tasks, suggestions, sponsors }) {
  const overdue = tasks.filter(t => t.due_date && t.due_date < new Date().toISOString().split('T')[0] && t.status !== 'Done')
  const unread = suggestions.length
  return (
    <div className='section-card'>
      <div style={S.grid2}>
        {[
          { label: 'MEMBERS', val: members.length, color: '#60a5fa', icon: '👥' },
          { label: 'OPEN TASKS', val: tasks.filter(t => t.status !== 'Done').length, color: '#f59e0b', icon: '📋' },
          { label: 'SUGGESTIONS', val: unread, color: '#a78bfa', icon: '💡' },
          { label: 'SPONSORS', val: sponsors, color: '#22c55e', icon: '🤝' },
        ].map(s => (
          <div key={s.label} style={S.statCard}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{s.icon}</div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: '32px', fontWeight: 900, color: s.color }}>{s.val}</div>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: '#475569', letterSpacing: '2px', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>
      {overdue.length > 0 && (
        <div style={{ marginTop: '20px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', color: '#ef4444', letterSpacing: '2px', marginBottom: '8px' }}>⚠️ OVERDUE TASKS</div>
          {overdue.map(t => (
            <div key={t.id} style={{ fontSize: '13px', color: '#fca5a5', padding: '4px 0' }}>{t.title} {t.assigned_name ? `→ ${t.assigned_name}` : ''} · Due {t.due_date}</div>
          ))}
        </div>
      )}
      <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <a href='/dashboard' target='_blank' style={{ ...S.btnBlue, textDecoration: 'none' }}>→ SPONSOR TRACKER</a>
        <a href='/' target='_blank' style={{ ...S.btnGhost, textDecoration: 'none' }}>→ PUBLIC SITE</a>
      </div>
    </div>
  )
}

// ACCOUNTS
function Accounts({ members, onRefresh, showToast }) {
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'Member' })
  const [adding, setAdding] = useState(false)
  const [editMember, setEditMember] = useState(null)

  const add = async () => {
    if (!form.username || !form.password) return
    const { error } = await supabase.from('members').insert([form])
    if (error) { showToast('❌ Username already taken'); return }
    setForm({ username: '', password: '', full_name: '', role: 'Member' })
    setAdding(false); onRefresh(); showToast('✅ Member added!')
  }

  const remove = async (id) => {
    if (!confirm('Delete this member?')) return
    await supabase.from('members').delete().eq('id', id)
    onRefresh(); showToast('🗑️ Member deleted')
  }

  const updatePassword = async () => {
    if (!editMember?.password) return
    await supabase.from('members').update({ password: editMember.password, role: editMember.role, full_name: editMember.full_name }).eq('id', editMember.id)
    setEditMember(null); onRefresh(); showToast('✅ Member updated!')
  }

  return (
    <div className='section-card'>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ ...S.cardTitle, margin: 0 }}>👥 MEMBER ACCOUNTS</div>
        <button style={S.btnRed} onClick={() => setAdding(a => !a)}>{adding ? 'CANCEL' : '+ ADD MEMBER'}</button>
      </div>

      {adding && (
        <div style={{ ...S.card, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', marginBottom: '24px' }}>
          <div style={S.grid2}>
            <div style={S.field}><label style={S.label}>FULL NAME</label><input style={S.input} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder='John Doe' /></div>
            <div style={S.field}><label style={S.label}>USERNAME</label><input style={S.input} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder='johndoe' /></div>
            <div style={S.field}><label style={S.label}>PASSWORD</label><input style={S.input} type='password' value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder='••••••••' /></div>
            <div style={S.field}><label style={S.label}>ROLE</label>
              <select style={S.input} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {['Member', 'Captain', 'Mentor', 'Admin'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <button style={S.btnRed} onClick={add}>CREATE ACCOUNT</button>
        </div>
      )}

      {members.length === 0 ? (
        <div style={{ color: '#334155', fontFamily: "'Share Tech Mono', monospace", fontSize: '12px', padding: '20px 0' }}>No members yet. Add one above.</div>
      ) : members.map(m => (
        <div key={m.id} style={S.row}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Orbitron', monospace", fontSize: '14px', fontWeight: 700, color: '#60a5fa', flexShrink: 0 }}>
            {(m.full_name || m.username)[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600, color: '#f1f5f9', fontSize: '14px' }}>{m.full_name || m.username}</div>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', color: '#475569', letterSpacing: '1px' }}>@{m.username}</div>
          </div>
          <span style={S.badge(m.role === 'Captain' ? '#ef4444' : m.role === 'Admin' ? '#eab308' : m.role === 'Mentor' ? '#a78bfa' : '#64748b')}>{m.role}</span>
          <button style={S.btnGhost} onClick={() => setEditMember({ ...m, password: '' })}>EDIT</button>
          <button style={S.btnDanger} onClick={() => remove(m.id)}>DEL</button>
        </div>
      ))}

      {editMember && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setEditMember(null)}>
          <div style={S.modalBox}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: '16px', fontWeight: 700, color: '#60a5fa', marginBottom: '20px' }}>EDIT MEMBER</div>
            <div style={S.field}><label style={S.label}>FULL NAME</label><input style={S.input} value={editMember.full_name || ''} onChange={e => setEditMember(m => ({ ...m, full_name: e.target.value }))} /></div>
            <div style={S.field}><label style={S.label}>ROLE</label>
              <select style={S.input} value={editMember.role} onChange={e => setEditMember(m => ({ ...m, role: e.target.value }))}>
                {['Member', 'Captain', 'Mentor', 'Admin'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div style={S.field}><label style={S.label}>NEW PASSWORD (leave blank to keep)</label><input style={S.input} type='password' value={editMember.password} onChange={e => setEditMember(m => ({ ...m, password: e.target.value }))} placeholder='New password...' /></div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button style={S.btnRed} onClick={updatePassword}>SAVE</button>
              <button style={S.btnGhost} onClick={() => setEditMember(null)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// TASKS
function Tasks({ members, showToast }) {
  const [tasks, setTasks] = useState([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', assigned_name: '', due_date: '', priority: 'Medium', status: 'To Do' })

  const fetch = async () => {
    const { data } = await supabase.from('tasks').select('*').order('due_date', { ascending: true, nullsFirst: false })
    if (data) setTasks(data)
  }

  useEffect(() => { fetch() }, [])

  const add = async () => {
    if (!form.title) return
    const member = members.find(m => m.id === form.assigned_to)
    await supabase.from('tasks').insert([{ ...form, assigned_name: member?.full_name || member?.username || '' }])
    setForm({ title: '', description: '', assigned_to: '', assigned_name: '', due_date: '', priority: 'Medium', status: 'To Do' })
    setAdding(false); fetch(); showToast('✅ Task created!')
  }

  const updateStatus = async (id, status) => {
    await supabase.from('tasks').update({ status }).eq('id', id)
    fetch()
  }

  const remove = async (id) => {
    await supabase.from('tasks').delete().eq('id', id)
    fetch(); showToast('🗑️ Task deleted')
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className='section-card'>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ ...S.cardTitle, margin: 0 }}>📋 TASK MANAGEMENT</div>
        <button style={S.btnRed} onClick={() => setAdding(a => !a)}>{adding ? 'CANCEL' : '+ NEW TASK'}</button>
      </div>

      {adding && (
        <div style={{ ...S.card, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', marginBottom: '24px' }}>
          <div style={S.grid2}>
            <div style={{ ...S.field, gridColumn: '1/-1' }}><label style={S.label}>TASK TITLE</label><input style={S.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder='Task name...' /></div>
            <div style={S.field}><label style={S.label}>ASSIGN TO</label>
              <select style={S.input} value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
                <option value=''>Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.full_name || m.username}</option>)}
              </select>
            </div>
            <div style={S.field}><label style={S.label}>DUE DATE</label><input type='date' style={{ ...S.input, colorScheme: 'dark' }} value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            <div style={S.field}><label style={S.label}>PRIORITY</label>
              <select style={S.input} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {['Low', 'Medium', 'High'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={S.field}><label style={S.label}>STATUS</label>
              <select style={S.input} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {TASK_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ ...S.field, gridColumn: '1/-1' }}><label style={S.label}>DESCRIPTION</label><textarea style={{ ...S.input, height: '70px', resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder='Optional details...' /></div>
          </div>
          <button style={S.btnRed} onClick={add}>CREATE TASK</button>
        </div>
      )}

      {TASK_STATUSES.map(status => {
        const group = tasks.filter(t => t.status === status)
        return (
          <div key={status} style={{ marginBottom: '24px' }}>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', letterSpacing: '3px', color: status === 'Done' ? '#22c55e' : status === 'In Progress' ? '#f59e0b' : '#64748b', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {status.toUpperCase()} · {group.length}
            </div>
            {group.map(t => (
              <div key={t.id} style={{ ...S.row, padding: '12px 0', alignItems: 'flex-start' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: PRIORITY_COLORS[t.priority] || '#64748b', flexShrink: 0, marginTop: '4px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600, color: '#f1f5f9', fontSize: '14px', marginBottom: '4px' }}>{t.title}</div>
                  {t.description && <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>{t.description}</div>}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {t.assigned_name && <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: '#60a5fa' }}>→ {t.assigned_name}</span>}
                    {t.due_date && <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: t.due_date < today && t.status !== 'Done' ? '#ef4444' : '#475569' }}>📅 {t.due_date}</span>}
                  </div>
                </div>
                <select style={{ ...S.input, width: 'auto', fontSize: '11px', padding: '6px 10px' }} value={t.status} onChange={e => updateStatus(t.id, e.target.value)}>
                  {TASK_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <button style={S.btnDanger} onClick={() => remove(t.id)}>DEL</button>
              </div>
            ))}
            {group.length === 0 && <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', color: '#1e293b', padding: '8px 0' }}>No tasks</div>}
          </div>
        )
      })}
    </div>
  )
}

// SUGGESTIONS
function Suggestions({ showToast }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    const { data } = await supabase.from('suggestions').select('*').order('submitted_at', { ascending: false })
    if (data) setSuggestions(data)
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const remove = async (id) => {
    await supabase.from('suggestions').delete().eq('id', id)
    setSuggestions(s => s.filter(x => x.id !== id))
    showToast('🗑️ Suggestion deleted')
  }

  return (
    <div className='section-card'>
      <div style={S.cardTitle}>💡 SUGGESTIONS</div>
      {loading ? <div style={{ color: '#334155', fontFamily: "'Share Tech Mono', monospace", fontSize: '12px' }}>Loading...</div> :
        suggestions.length === 0 ? <div style={{ color: '#334155', fontFamily: "'Share Tech Mono', monospace", fontSize: '12px' }}>No suggestions yet.</div> :
        suggestions.map(s => (
          <div key={s.id} style={{ ...S.row, alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: 1.6, marginBottom: '6px' }}>{s.message}</div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: '#334155', letterSpacing: '1px' }}>{new Date(s.submitted_at).toLocaleString()}</div>
            </div>
            <button style={S.btnDanger} onClick={() => remove(s.id)}>DELETE</button>
          </div>
        ))
      }
    </div>
  )
}

// SITE CONFIG
function SiteConfig({ showToast }) {
  const [config, setConfig] = useState({})
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    const { data } = await supabase.from('site_config').select('*')
    if (data) setConfig(Object.fromEntries(data.map(r => [r.key, r.value])))
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const save = async (key, value) => {
    await supabase.from('site_config').upsert({ key, value })
    showToast('✅ Saved!')
  }

  const fields = [
    { key: 'team_email', label: 'TEAM EMAIL' },
    { key: 'instagram', label: 'INSTAGRAM URL' },
    { key: 'youtube', label: 'YOUTUBE URL' },
    { key: 'donate_url', label: 'DONATE URL' },
    { key: 'season_year', label: 'CURRENT SEASON YEAR' },
  ]

  return (
    <div className='section-card'>
      <div style={S.cardTitle}>⚙️ SITE CONFIGURATION</div>
      {loading ? <div style={{ color: '#334155', fontFamily: "'Share Tech Mono', monospace", fontSize: '12px' }}>Loading...</div> :
        fields.map(f => (
          <div key={f.key} style={{ ...S.field, display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>{f.label}</label>
              <input style={S.input} value={config[f.key] || ''} onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))} />
            </div>
            <button style={{ ...S.btnBlue, whiteSpace: 'nowrap', marginBottom: '0px' }} onClick={() => save(f.key, config[f.key])}>SAVE</button>
          </div>
        ))
      }
    </div>
  )
}

// MAIN ADMIN
export default function Admin() {
  const [authed, setAuthed] = useState(() => localStorage.getItem('admin_authed') === 'true')
  const [activeTab, setActiveTab] = useState('overview')
  const [members, setMembers] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [sponsorCount, setSponsorCount] = useState(0)
  const [tasks, setTasks] = useState([])
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const fetchAll = async () => {
    const [{ data: m }, { data: s }, { data: sp }, { data: t }] = await Promise.all([
      supabase.from('members').select('*').order('created_at', { ascending: false }),
      supabase.from('suggestions').select('*').order('submitted_at', { ascending: false }),
      supabase.from('sponsors').select('id'),
      supabase.from('tasks').select('*').order('due_date', { ascending: true }),
    ])
    if (m) setMembers(m)
    if (s) setSuggestions(s)
    if (sp) setSponsorCount(sp.length)
    if (t) setTasks(t)
  }

  useEffect(() => { if (authed) fetchAll() }, [authed])

  const NAV = [
    { id: 'overview', label: 'OVERVIEW', icon: '📊' },
    { id: 'accounts', label: 'ACCOUNTS', icon: '👥' },
    { id: 'tasks', label: 'TASKS', icon: '📋' },
    { id: 'suggestions', label: 'SUGGESTIONS', icon: '💡' },
    { id: 'config', label: 'SITE CONFIG', icon: '⚙️' },
  ]

  if (!authed) return <Login onLogin={() => setAuthed(true)} />

  return (
    <div style={S.page}>
      <style>{css}</style>

      {/* SIDEBAR */}
      <div style={S.sidebar}>
        <div style={S.sidebarTop}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src='/logo.jpg' alt='4550' style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)' }} />
            <div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: '11px', fontWeight: 900, color: '#ef4444', letterSpacing: '2px' }}>ADMIN</div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', color: '#334155', letterSpacing: '2px' }}>TEAM 4550</div>
            </div>
          </div>
        </div>
        <div style={S.sidebarNav}>
          {NAV.map(n => (
            <div key={n.id} style={S.navItem(activeTab === n.id)} onClick={() => setActiveTab(n.id)}>
              <span>{n.icon}</span>
              <span>{n.label}</span>
              {n.id === 'suggestions' && suggestions.length > 0 && (
                <span style={{ marginLeft: 'auto', background: '#ef4444', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', color: 'white' }}>{suggestions.length}</span>
              )}
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: '#1e293b', letterSpacing: '1px', marginBottom: '8px' }}>LOGGED IN AS ADMIN</div>
          <button style={{ ...S.btnDanger, width: '100%', textAlign: 'center' }} onClick={() => { localStorage.removeItem('admin_authed'); setAuthed(false) }}>LOGOUT</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={S.main}>
        <div style={S.header}>
          <div>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: '#475569', letterSpacing: '3px', marginBottom: '4px' }}>
              {NAV.find(n => n.id === activeTab)?.icon} · ADMIN PANEL
            </div>
            <div style={S.pageTitle}>{NAV.find(n => n.id === activeTab)?.label}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <a href='/' target='_blank' style={{ ...S.btnGhost, textDecoration: 'none', fontSize: '11px' }}>PUBLIC SITE ↗</a>
            <a href='/dashboard' target='_blank' style={{ ...S.btnBlue, textDecoration: 'none', fontSize: '11px' }}>SPONSOR TRACKER ↗</a>
          </div>
        </div>

        {activeTab === 'overview' && <Overview members={members} tasks={tasks} suggestions={suggestions} sponsors={sponsorCount} />}
        {activeTab === 'accounts' && <Accounts members={members} onRefresh={fetchAll} showToast={showToast} />}
        {activeTab === 'tasks' && <Tasks members={members} showToast={showToast} />}
        {activeTab === 'suggestions' && <Suggestions showToast={showToast} />}
        {activeTab === 'config' && <SiteConfig showToast={showToast} />}
      </div>

      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  )
}
