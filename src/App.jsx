import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ehkwxzumgizryvhkeusr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoa3d4enVtZ2l6cnl2aGtldXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTEwODcsImV4cCI6MjA5MzI4NzA4N30.IXAhkAx1ygZpJMNSWNd3k80Hmt4rNmRtuFPnLZGcGuc'
)

const STATUS_COLORS = {
  'Not Contacted': '#64748b',
  'Contacted': '#3b82f6',
  'In Progress': '#f59e0b',
  'Sponsored': '#22c55e',
  'Declined': '#ef4444',
}

const STATUS_OPTIONS = Object.keys(STATUS_COLORS)

const styles = {
  app: { minHeight: '100vh', background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 50%, #0a0f1e 100%)', fontFamily: '"DM Mono", "Courier New", monospace', color: '#e2e8f0', padding: '0' },
  header: { background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' },
  title: { fontSize: '28px', fontFamily: '"Bebas Neue", "Impact", sans-serif', letterSpacing: '3px', color: '#60a5fa', margin: 0 },
  liveBadge: { display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '20px', padding: '6px 14px', fontSize: '11px', color: '#22c55e', letterSpacing: '1px' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' },
  main: { padding: '28px 32px', maxWidth: '1200px', margin: '0 auto' },
  statsRow: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' },
  statCard: { flex: '1', minWidth: '120px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', textAlign: 'center' },
  statNum: { fontSize: '28px', fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '2px' },
  statLabel: { fontSize: '10px', color: '#94a3b8', letterSpacing: '1px', marginTop: '2px' },
  controls: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' },
  input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px 14px', color: '#e2e8f0', fontSize: '13px', fontFamily: '"DM Mono", monospace', outline: 'none', flex: '1', minWidth: '200px' },
  select: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px 14px', color: '#e2e8f0', fontSize: '13px', fontFamily: '"DM Mono", monospace', outline: 'none', cursor: 'pointer' },
  btn: { background: 'rgba(59,130,246,0.25)', border: '1px solid rgba(59,130,246,0.5)', borderRadius: '8px', padding: '10px 20px', color: '#bfdbfe', fontSize: '13px', fontFamily: '"DM Mono", monospace', cursor: 'pointer', letterSpacing: '1px', fontWeight: '600' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' },
  card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px', transition: 'all 0.3s ease' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' },
  company: { fontSize: '18px', fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '2px', color: '#f1f5f9' },
  statusBadge: { borderRadius: '20px', padding: '4px 12px', fontSize: '10px', letterSpacing: '1px', fontWeight: '600', border: '1px solid' },
  fieldRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '12px', color: '#94a3b8' },
  copyBtn: { background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.35)', borderRadius: '4px', padding: '2px 8px', color: '#bfdbfe', fontSize: '10px', cursor: 'pointer', fontFamily: '"DM Mono", monospace' },
  cardActions: { display: 'flex', gap: '8px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' },
  editBtn: { background: 'rgba(59,130,246,0.25)', border: '1px solid rgba(59,130,246,0.5)', borderRadius: '6px', padding: '6px 14px', color: '#bfdbfe', fontSize: '11px', cursor: 'pointer', fontFamily: '"DM Mono", monospace', flex: 1 },
  deleteBtn: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px', padding: '6px 14px', color: '#f87171', fontSize: '11px', cursor: 'pointer', fontFamily: '"DM Mono", monospace' },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modalBox: { background: '#0d1b3e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontFamily: '"Bebas Neue", sans-serif', fontSize: '22px', letterSpacing: '2px', color: '#60a5fa', marginBottom: '20px' },
  field: { marginBottom: '14px' },
  label: { display: 'block', fontSize: '10px', color: '#94a3b8', letterSpacing: '1px', marginBottom: '6px' },
  modalInput: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px 14px', color: '#e2e8f0', fontSize: '13px', fontFamily: '"DM Mono", monospace', outline: 'none', boxSizing: 'border-box' },
  modalActions: { display: 'flex', gap: '10px', marginTop: '20px' },
  toast: { position: 'fixed', bottom: '24px', right: '24px', background: '#1e3a5f', border: '1px solid rgba(96,165,250,0.4)', borderRadius: '10px', padding: '12px 20px', color: '#e2e8f0', fontSize: '13px', zIndex: 2000, animation: 'fadeIn 0.3s ease' },
  lookupBtn: { background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '6px', padding: '8px 14px', color: '#bfdbfe', fontSize: '11px', cursor: 'pointer', fontFamily: '"DM Mono", monospace', whiteSpace: 'nowrap' },
  lookupRow: { display: 'flex', gap: '8px', alignItems: 'flex-end' },
}

function Toast({ message }) {
  return <div style={styles.toast}>{message}</div>
}

function Modal({ sponsor, onClose, onSave }) {
  const [form, setForm] = useState(sponsor || { company: '', email: '', phone: '', notes: '', status: 'Not Contacted' })
  const [looking, setLooking] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const lookup = async () => {
    if (!form.company.trim()) return
    setLooking(true)
    try {
      const res = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: form.company })
      })
      const parsed = await res.json()
      setForm(f => ({
        ...f,
        email: parsed.email || f.email,
        phone: parsed.phone || f.phone,
        notes: parsed.notes || f.notes,
      }))
    } catch (e) {
      console.error(e)
    }
    setLooking(false)
  }

  return (
    <div style={styles.modal} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modalBox}>
        <div style={styles.modalTitle}>{sponsor ? 'EDIT SPONSOR' : 'ADD SPONSOR'}</div>
        <div style={styles.field}>
          <label style={styles.label}>COMPANY</label>
          <div style={styles.lookupRow}>
            <input style={{ ...styles.modalInput, flex: 1 }} value={form.company || ''} onChange={e => set('company', e.target.value)} placeholder="Company name" />
            <button style={styles.lookupBtn} onClick={lookup} disabled={looking}>{looking ? '⏳ LOOKING...' : '🔍 LOOKUP'}</button>
          </div>
          {looking && <div style={{ fontSize: '11px', color: '#a78bfa', marginTop: '6px' }}>Searching for contact info...</div>}
        </div>
        {['email', 'phone', 'notes'].map(k => (
          <div key={k} style={styles.field}>
            <label style={styles.label}>{k.toUpperCase()}</label>
            <input style={styles.modalInput} value={form[k] || ''} onChange={e => set(k, e.target.value)} placeholder={k === 'email' ? 'contact@company.com' : k === 'phone' ? '(555) 000-0000' : ''} />
          </div>
        ))}
        <div style={styles.field}>
          <label style={styles.label}>STATUS</label>
          <select style={{ ...styles.modalInput, cursor: 'pointer' }} value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={styles.modalActions}>
          <button style={styles.btn} onClick={() => onSave(form)}>SAVE</button>
          <button style={{ ...styles.editBtn, flex: 'none' }} onClick={onClose}>CANCEL</button>
        </div>
      </div>
    </div>
  )
}

function ImportModal({ onClose, onImport }) {
  const [csv, setCsv] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [imageNames, setImageNames] = useState([])

  const parse = (text) => {
    const lines = text.trim().split('\n').filter(Boolean)
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/['"]/g, ''))
      const obj = {}
      headers.forEach((h, i) => obj[h] = vals[i] || '')
      return {
        company: obj.company || obj.name || obj['company name'] || '',
        email: obj.email || obj['email address'] || '',
        phone: obj.phone || obj['phone number'] || obj.tel || '',
        notes: obj.notes || obj.note || obj.description || '',
        status: obj.status || 'Not Contacted',
      }
    }).filter(r => r.company)
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setCsv(ev.target.result)
    reader.readAsText(file)
  }

  const handleImage = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setExtracting(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1]
      try {
        const res = await fetch('/api/extract-brands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType: file.type })
        })
        const data = await res.json()
        setImageNames(data.brands || [])
      } catch (e) { console.error(e) }
      setExtracting(false)
    }
    reader.readAsDataURL(file)
  }

  const csvRows = parse(csv)
  const imageRows = imageNames.map(name => ({ company: name, email: '', phone: '', notes: '', status: 'Not Contacted' }))
  const allRows = [...csvRows, ...imageRows.filter(r => !csvRows.find(c => c.company === r.company))]

  return (
    <div style={styles.modal} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...styles.modalBox, maxWidth: '560px' }}>
        <div style={styles.modalTitle}>📥 IMPORT SPONSORS</div>

        <div style={styles.field}>
          <label style={styles.label}>📄 UPLOAD CSV FILE</label>
          <input type="file" accept=".csv" onChange={handleFile} style={{ ...styles.modalInput, padding: '8px', cursor: 'pointer' }} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>OR PASTE CSV TEXT</label>
          <textarea style={{ ...styles.modalInput, height: '90px', resize: 'vertical' }} value={csv} onChange={e => setCsv(e.target.value)} placeholder={'company,email,phone\nMicro Center,donations@microcenter.com,800-634-3478'} />
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '16px 0' }} />

        <div style={styles.field}>
          <label style={styles.label}>📸 SCAN IMAGE FOR BRANDS</label>
          <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 8px' }}>Upload a photo of a sponsor list, flyer, or signage — AI will extract brand names automatically.</p>
          <input type="file" accept="image/*" onChange={handleImage} style={{ ...styles.modalInput, padding: '8px', cursor: 'pointer' }} />
          {extracting && <div style={{ fontSize: '11px', color: '#a78bfa', marginTop: '6px' }}>🔍 Scanning image for brands...</div>}
          {imageNames.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div style={styles.label}>{imageNames.length} BRANDS DETECTED FROM IMAGE</div>
              {imageNames.map((n, i) => (
                <div key={i} style={{ fontSize: '11px', color: '#e2e8f0', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{n}</div>
              ))}
            </div>
          )}
        </div>

        {allRows.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={styles.label}>TOTAL PREVIEW ({allRows.length} companies)</div>
            {allRows.slice(0, 4).map((r, i) => (
              <div key={i} style={{ fontSize: '11px', color: '#94a3b8', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#e2e8f0' }}>{r.company}</span>
                {r.email && <span> · {r.email}</span>}
              </div>
            ))}
            {allRows.length > 4 && <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>...and {allRows.length - 4} more</div>}
          </div>
        )}

        <div style={styles.modalActions}>
          <button style={styles.btn} onClick={() => onImport(allRows)} disabled={!allRows.length}>IMPORT {allRows.length > 0 ? `${allRows.length} SPONSORS` : ''}</button>
          <button style={{ ...styles.editBtn, flex: 'none' }} onClick={onClose}>CANCEL</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(() => localStorage.getItem('sb_authed') === 'true')
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)
  const [sponsors, setSponsors] = useState([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [modal, setModal] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupProgress, setLookupProgress] = useState({ current: 0, total: 0 })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const fetchSponsors = useCallback(async () => {
    const { data } = await supabase.from('sponsors').select('*').order('date_added', { ascending: false })
    if (data) setSponsors(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSponsors()
    const channel = supabase.channel('sponsors-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sponsors' }, () => {
        fetchSponsors()
        showToast('🔄 List updated by a teammate')
      }).subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchSponsors])

  const save = async (form) => {
    if (!form.company.trim()) return
    if (modal.id) {
      await supabase.from('sponsors').update({ ...form, updated_at: new Date().toISOString() }).eq('id', modal.id)
    } else {
      await supabase.from('sponsors').insert([{ ...form, date_added: new Date().toISOString(), updated_at: new Date().toISOString() }])
    }
    setModal(null)
    fetchSponsors()
    showToast(modal.id ? '✅ Sponsor updated' : '✅ Sponsor added')
  }

  const handleImport = async (rows) => {
    const now = new Date().toISOString()
    const records = rows.map(r => ({ ...r, date_added: now, updated_at: now }))
    for (let i = 0; i < records.length; i += 50) {
      await supabase.from('sponsors').insert(records.slice(i, i + 50))
    }
    setShowImport(false)
    fetchSponsors()
    showToast(`✅ Imported ${rows.length} sponsors!`)
  }

  const remove = async (id) => {
    if (!confirm('Delete this sponsor?')) return
    await supabase.from('sponsors').delete().eq('id', id)
    fetchSponsors()
    showToast('🗑️ Sponsor deleted')
  }

  const updateStatus = async (id, status) => {
    await supabase.from('sponsors').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    fetchSponsors()
  }

  const copy = (text) => { navigator.clipboard.writeText(text); showToast('📋 Copied!') }

  const filtered = sponsors.filter(s => {
    const q = search.toLowerCase()
    return (!q || s.company?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)) &&
      (filterStatus === 'All' || s.status === filterStatus)
  })

  const counts = STATUS_OPTIONS.reduce((acc, s) => { acc[s] = sponsors.filter(x => x.status === s).length; return acc }, {})


  const lookupAll = async () => {
    const missing = sponsors.filter(s => !s.email && !s.phone)
    if (!missing.length) { showToast('✅ All sponsors already have contact info!'); return }
    if (!confirm(`Look up contact info for ${missing.length} sponsors? This may take a few minutes.`)) return
    setLookingUp(true)
    setLookupProgress({ current: 0, total: missing.length })
    for (let i = 0; i < missing.length; i++) {
      const s = missing[i]
      setLookupProgress({ current: i + 1, total: missing.length })
      try {
        const res = await fetch('/api/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company: s.company })
        })
        const parsed = await res.json()
        if (parsed.email || parsed.phone) {
          await supabase.from('sponsors').update({
            email: parsed.email || s.email,
            phone: parsed.phone || s.phone,
            notes: parsed.notes || s.notes,
            updated_at: new Date().toISOString()
          }).eq('id', s.id)
        }
        await new Promise(r => setTimeout(r, 800))
      } catch (e) { console.error(e) }
    }
    setLookingUp(false)
    fetchSponsors()
    showToast(`✅ Lookup complete for ${missing.length} sponsors!`)
  }

  const handleLogin = () => {
    if (pwInput === 'Bruin@4550') {
      localStorage.setItem('sb_authed', 'true')
      setAuthed(true)
      setPwError(false)
    } else {
      setPwError(true)
    }
  }

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 50%, #0a0f1e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Mono", monospace' }}>
      <style>{'@import url(\'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&display=swap\');'}</style>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '48px 40px', width: '100%', maxWidth: '380px', textAlign: 'center' }}>
        <img src='/logo.jpg' alt='Team 4550' style={{ height: '80px', width: '80px', objectFit: 'contain', borderRadius: '12px', marginBottom: '20px' }} />
        <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '24px', letterSpacing: '3px', color: '#60a5fa', marginBottom: '6px' }}>SOMETHING'S BRUIN</div>
        <div style={{ fontSize: '11px', color: '#475569', letterSpacing: '2px', marginBottom: '32px' }}>SPONSOR TRACKER · TEAM 4550</div>
        <input
          type='password'
          placeholder='Enter team password'
          value={pwInput}
          onChange={e => { setPwInput(e.target.value); setPwError(false) }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: pwError ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '12px 16px', color: '#e2e8f0', fontSize: '13px', fontFamily: '"DM Mono", monospace', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }}
        />
        {pwError && <div style={{ color: '#ef4444', fontSize: '11px', marginBottom: '12px' }}>Incorrect password</div>}
        <button onClick={handleLogin} style={{ width: '100%', background: 'rgba(59,130,246,0.25)', border: '1px solid rgba(59,130,246,0.5)', borderRadius: '8px', padding: '12px', color: '#bfdbfe', fontSize: '13px', fontFamily: '"DM Mono", monospace', cursor: 'pointer', letterSpacing: '1px', marginTop: '4px' }}>ENTER</button>
      </div>
    </div>
  )

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; } body { margin: 0; }
        input::placeholder { color: #475569; } textarea::placeholder { color: #475569; }
        select option { background: #0d1b3e; }
      `}</style>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}><img src='/logo.jpg' alt='Team 4550' style={{ height: '68px', width: '68px', objectFit: 'contain', borderRadius: '8px' }} /><h1 style={styles.title}>4550 - Something's Bruin | SPONSOR TRACKER</h1></div>
        <div style={styles.liveBadge}><div style={styles.dot} />LIVE</div>
      </div>
      <div style={styles.main}>
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statNum, color: '#60a5fa' }}>{sponsors.length}</div>
            <div style={styles.statLabel}>TOTAL</div>
          </div>
          {STATUS_OPTIONS.map(s => (
            <div key={s} style={styles.statCard}>
              <div style={{ ...styles.statNum, color: STATUS_COLORS[s] }}>{counts[s]}</div>
              <div style={styles.statLabel}>{s.toUpperCase()}</div>
            </div>
          ))}
        </div>
        <div style={styles.controls}>
          <input style={styles.input} placeholder="Search sponsors..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={styles.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button style={styles.btn} onClick={() => setShowImport(true)}>📥 IMPORT SPONSORS</button>
          <button style={styles.btn} onClick={lookupAll} disabled={lookingUp}>🔍 {lookingUp ? `LOOKING UP ${lookupProgress.current}/${lookupProgress.total}...` : 'LOOKUP ALL MISSING'}</button>
          <button style={styles.btn} onClick={() => setModal({})}>+ ADD SPONSOR</button>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#475569', padding: '60px' }}>Loading...</div>
        ) : (
          <div style={styles.grid}>
            {filtered.map(s => {
              const color = STATUS_COLORS[s.status] || '#64748b'
              return (
                <div key={s.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div style={styles.company}>{s.company}</div>
                    <div style={{ ...styles.statusBadge, color, borderColor: color + '50', background: color + '15' }}>{s.status}</div>
                  </div>
                  {s.email && <div style={styles.fieldRow}><span>📧</span><a href={`mailto:${s.email}`} style={{ flex: 1, color: '#93c5fd', textDecoration: 'none', cursor: 'pointer' }}>{s.email}</a><button style={styles.copyBtn} onClick={() => copy(s.email)}>COPY</button></div>}
                  {s.phone && <div style={styles.fieldRow}><span>📞</span><a href={`tel:${s.phone}`} style={{ flex: 1, color: '#93c5fd', textDecoration: 'none', cursor: 'pointer' }}>{s.phone}</a><button style={styles.copyBtn} onClick={() => copy(s.phone)}>COPY</button></div>}
                  {s.notes && <div style={{ ...styles.fieldRow, alignItems: 'flex-start' }}><span>📝</span><span style={{ color: '#94a3b8', lineHeight: '1.5' }}>{s.notes}</span></div>}
                  <div style={{ marginTop: '12px' }}>
                    <label style={styles.label}>STATUS</label>
                    <select style={{ ...styles.select, width: '100%', fontSize: '12px', padding: '7px 10px' }} value={s.status} onChange={e => updateStatus(s.id, e.target.value)}>
                      {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div style={styles.cardActions}>
                    <button style={styles.editBtn} onClick={() => setModal(s)}>EDIT</button>
                    <button style={styles.deleteBtn} onClick={() => remove(s.id)}>DEL</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {modal !== null && <Modal sponsor={modal.id ? modal : null} onClose={() => setModal(null)} onSave={save} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />}
      {toast && <Toast message={toast} />}
      <div style={{ textAlign: 'center', padding: '24px', fontSize: '11px', color: 'rgba(255,255,255,0.15)', fontFamily: '"DM Mono", monospace', letterSpacing: '2px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '40px' }}>BUILT BY PALIVELA_JOEL · FRC TEAM 4550</div>
    </div>
  )
}
