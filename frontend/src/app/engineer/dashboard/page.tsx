'use client'
// File: frontend/src/app/engineer/dashboard/page.tsx

import { useState, useEffect, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL

interface Ticket {
  id: string
  ticket_number: string
  title: string
  description: string
  domain: string
  priority: string
  status: string
  complexity: string
  ai_diagnosis: string
  ai_confidence: number
  steps_tried: string
  resolution_notes: string
  cnn_image_result: string
  sla_deadline: string
  sla_breached: boolean
  user_name: string
  user_email: string
  user_city: string
  user_country: string
  user_timezone: string
  created_at: string
}

interface Stats {
  total_resolved: number
  active_tickets: number
  avg_resolution_time: number
  sla_compliance_rate: number
  this_week_resolved: number
}

const priorityColor = (p: string) =>
  p === 'critical' ? '#ef4444' : p === 'high' ? '#f97316' : p === 'medium' ? '#eab308' : '#6b7280'

const statusColor = (s: string) =>
  s === 'resolved' ? '#4d9e78' : s === 'in_progress' ? '#3b82f6' : s === 'open' ? '#f97316' : '#6b7280'

const domainLabel = (d: string) => ({
  networking: 'Networking', hardware: 'Hardware', software: 'Software',
  security: 'Security', email_communication: 'Email & Comm',
  identity_access: 'Identity & Access', database: 'Database',
  cloud: 'Cloud', infrastructure: 'Infrastructure', devops: 'DevOps',
  erp_business_apps: 'ERP & Business', endpoint_management: 'Endpoint Mgmt',
  other: 'Other',
}[d] || d)

// ── Screenshot with authenticated blob fetch ──────────────────────────────
function ScreenshotImage({ url, dark }: { url: string; dark: boolean }) {
  const [blobSrc, setBlobSrc] = useState<string | null>(null)
  const [state, setState]     = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let revoke = ''
    setState('loading')
    setBlobSrc(null)
    const token = localStorage.getItem('access_token')
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error('failed'); return r.blob() })
      .then(blob => {
        revoke = URL.createObjectURL(blob)
        setBlobSrc(revoke)
        setState('ready')
      })
      .catch(() => setState('error'))
    return () => { if (revoke) URL.revokeObjectURL(revoke) }
  }, [url])

  if (state === 'loading') return (
    <div style={{ padding: '20px', textAlign: 'center', background: dark ? '#0a0a0a' : '#f0f0f0', borderRadius: 8, border: '1px solid rgba(23,77,56,0.2)', fontSize: 12, color: 'rgba(77,158,120,0.6)' }}>
      Loading screenshot...
    </div>
  )
  if (state === 'error' || !blobSrc) return (
    <div style={{ padding: '14px', textAlign: 'center', background: dark ? 'rgba(255,255,255,0.02)' : '#f7f7f7', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)', fontSize: 12, color: '#ef4444' }}>
      Could not load screenshot
    </div>
  )
  return (
    <img src={blobSrc} alt="User screenshot" style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(23,77,56,0.3)', display: 'block', maxHeight: 300, objectFit: 'contain', background: dark ? '#0a0a0a' : '#f0f0f0' }}/>
  )
}

// ── Live clock ────────────────────────────────────────────────────────────
function LiveClock({ timezone, label, large = false }: { timezone: string; label: string; large?: boolean }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i) }, [])
  const time = (() => { try { return now.toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) } catch { return '--:--:--' } })()
  const date = (() => { try { return now.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric' }) } catch { return '' } })()

  if (large) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(237,232,224,0.45)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 26, fontWeight: 500, color: '#ede8e0', lineHeight: 1, marginBottom: 5, fontVariantNumeric: 'tabular-nums' }}>{time}</div>
      <div style={{ fontSize: 11, color: 'rgba(237,232,224,0.38)' }}>{date}</div>
      <div style={{ fontSize: 9, color: 'rgba(237,232,224,0.22)', marginTop: 2 }}>{timezone}</div>
    </div>
  )
  return <span style={{ fontSize: 11, color: '#4d9e78', fontFamily: 'monospace' }}>{time}</span>
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function EngineerDashboardPage() {
  const [tickets, setTickets]         = useState<Ticket[]>([])
  const [stats, setStats]             = useState<Stats | null>(null)
  const [loading, setLoading]         = useState(true)
  const [dark, setDark]               = useState(true)
  const [selected, setSelected]       = useState<Ticket | null>(null)
  const [updating, setUpdating]       = useState(false)
  const [notes, setNotes]             = useState('')
  const [engineerTimezone, setEngineerTimezone] = useState('UTC')
  const [availability, setAvailability] = useState('available')
  const [mounted, setMounted]         = useState(false)

  // ── Theme: read once on mount, apply to body + state ─────────────────
  useEffect(() => {
    const saved = localStorage.getItem('engineer_theme')
    const isDark = saved !== 'light'
    setDark(isDark)
    document.body.style.background = isDark ? '#080808' : '#f4f3ef'
    document.body.style.transition = 'background .3s'
    setMounted(true)
    fetchProfile()
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const applyTheme = (isDark: boolean) => {
    setDark(isDark)
    localStorage.setItem('engineer_theme', isDark ? 'dark' : 'light')
    document.body.style.background = isDark ? '#080808' : '#f4f3ef'
  }

  const toggleTheme = () => applyTheme(!dark)

  const token = () => localStorage.getItem('access_token') || ''
  const hdrs  = useCallback(() => ({ Authorization: `Bearer ${token()}` }), [])

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API}/api/v1/engineer/profile`, { headers: hdrs() })
      if (res.status === 401) { localStorage.clear(); window.location.replace('/auth/login'); return }
      if (res.ok) {
        const d = await res.json()
        setEngineerTimezone(d.timezone || 'UTC')
        setAvailability(d.availability_status || 'available')
      }
    } catch {}
  }

  const fetchData = async () => {
    try {
      const [tRes, sRes] = await Promise.all([
        fetch(`${API}/api/v1/engineer/tickets`, { headers: hdrs() }),
        fetch(`${API}/api/v1/engineer/stats`,   { headers: hdrs() }),
      ])
      if (tRes.status === 401) { localStorage.clear(); window.location.replace('/auth/login'); return }
      if (tRes.ok) setTickets(await tRes.json())
      if (sRes.ok) setStats(await sRes.json())
    } catch {} finally { setLoading(false) }
  }

  const setAvail = async (status: string) => {
    try {
      await fetch(`${API}/api/v1/engineer/availability`, {
        method: 'PATCH',
        headers: { ...hdrs(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability_status: status }),
      })
      setAvailability(status)
    } catch {}
  }

  const updateTicket = async (ticketId: string, status: string, resNotes?: string) => {
    if (status === 'resolved' && !resNotes?.trim()) { alert('Please add resolution notes before resolving.'); return }
    setUpdating(true)
    try {
      const endpoint = status === 'resolved'
        ? `${API}/api/v1/engineer/tickets/${ticketId}/resolve`
        : `${API}/api/v1/engineer/tickets/${ticketId}/status`
      const body = status === 'resolved' ? { resolution_notes: resNotes } : { status }
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { ...hdrs(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) { fetchData(); setSelected(null); setNotes('') }
    } catch {} finally { setUpdating(false) }
  }

  const getScreenshotUrl = (cnnResult: string | null) => {
    if (!cnnResult) return null
    const filename = cnnResult.split(' |')[0].trim()
    if (!filename.match(/\.(png|jpg|jpeg|webp)$/i)) return null
    return `${API}/api/v1/chat/screenshot/${filename}`
  }

  // ── Theme tokens ──────────────────────────────────────────────────────
  const T = {
    bg:        dark ? '#080808' : '#f4f3ef',
    header:    dark ? '#0c0c0c' : '#fafaf8',
    card:      dark ? '#111111' : '#ffffff',
    cardHover: dark ? '#171717' : '#f0efe9',
    border:    dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.09)',
    text:      dark ? '#ede8e0' : '#1a1a1a',
    muted:     dark ? 'rgba(237,232,224,0.4)' : 'rgba(26,26,26,0.45)',
    accent:    dark ? 'rgba(23,77,56,0.18)' : 'rgba(23,77,56,0.08)',
    gl:        '#4d9e78',
    secBg:     dark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)',
    inp: {
      width: '100%', padding: '10px 14px',
      background: dark ? 'rgba(255,255,255,0.04)' : '#f4f3ef',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)'}`,
      color: dark ? '#ede8e0' : '#1a1a1a',
      fontSize: 13, outline: 'none', borderRadius: 6,
      fontFamily: '"DM Sans", sans-serif', resize: 'vertical' as const,
    } as React.CSSProperties,
  }

  const openTickets     = tickets.filter(t => t.status === 'open' || t.status === 'in_progress')
  const resolvedTickets = tickets.filter(t => t.status === 'resolved')

  if (!mounted) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: ${dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.12)'}; border-radius: 2px; }
        .tr  { transition: background .12s, border-color .12s; cursor: pointer; }
        .tr:hover  { background: ${T.cardHover} !important; }
        .tr.sel    { border-left-color: #174D38 !important; background: ${T.accent} !important; }
        .ab  { transition: all .12s; cursor: pointer; border: 1px solid transparent; }
        .sc  { transition: transform .18s; }
        .sc:hover  { transform: translateY(-2px); }
        .hbtn { transition: opacity .12s; cursor: pointer; }
        .hbtn:hover { opacity: .78; }
      `}</style>

      <div style={{ fontFamily: '"DM Sans", sans-serif', color: T.text, minHeight: '100vh', background: T.bg }}>

        {/* ── Timezone Strip ── */}
        <div style={{ background: 'linear-gradient(135deg, #0d2e1f 0%, #091a10 100%)', borderBottom: '1px solid rgba(23,77,56,0.4)', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
          {[
            { label: 'Your Time',   tz: engineerTimezone },
            { label: selected?.user_name ? `${selected.user_name.split(' ')[0]}'s Time` : "User's Time", tz: selected?.user_timezone || 'UTC' },
            { label: 'UTC',         tz: 'UTC' },
            { label: 'IST',         tz: 'Asia/Kolkata' },
          ].map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <LiveClock timezone={c.tz} label={c.label} large/>
              {i < 3 && <div style={{ width: 1, height: 44, background: 'rgba(255,255,255,0.07)', margin: '0 24px' }}/>}
            </div>
          ))}
        </div>

        {/* ── Header ── */}
        <div style={{ padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.header, borderBottom: `1px solid ${T.border}` }}>
          <div>
            <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 28, fontWeight: 500, color: T.text, marginBottom: 2, letterSpacing: '-0.01em' }}>Dashboard</h1>
            <p style={{ fontSize: 12, color: T.muted }}>{openTickets.length} active · {resolvedTickets.length} resolved</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Availability */}
            <div style={{ display: 'flex', gap: 4, padding: '5px 6px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }}>
              {[
                { s: 'available', l: 'Available', c: '#4d9e78' },
                { s: 'busy',      l: 'Busy',      c: '#f97316' },
                { s: 'away',      l: 'Away',       c: '#6b7280' },
              ].map(o => (
                <button key={o.s} className="ab" onClick={() => setAvail(o.s)}
                  style={{ padding: '5px 11px', background: availability === o.s ? `${o.c}18` : 'transparent', borderColor: availability === o.s ? o.c : 'transparent', color: availability === o.s ? o.c : T.muted, fontSize: 11, fontWeight: availability === o.s ? 700 : 400, borderRadius: 5, fontFamily: 'inherit' }}>
                  {availability === o.s && <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: o.c, marginRight: 5, verticalAlign: 'middle', animation: o.s === 'available' ? 'pulse 2s infinite' : 'none' }}/>}
                  {o.l}
                </button>
              ))}
            </div>

            {/* Theme toggle */}
            <button className="hbtn" onClick={toggleTheme}
              style={{ padding: '6px 12px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, color: T.muted, fontFamily: 'inherit', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
              {dark
                ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>Light</>
                : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>Dark</>
              }
            </button>

            <button className="hbtn" onClick={fetchData}
              style={{ padding: '6px 12px', background: T.accent, border: '1px solid rgba(23,77,56,.3)', borderRadius: 6, color: T.gl, fontFamily: 'inherit', fontSize: 12 }}>
              ↻ Refresh
            </button>

            <button className="hbtn" onClick={() => { localStorage.clear(); window.location.replace('/auth/login') }}
              style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(160,64,64,.3)', borderRadius: 6, color: '#a04040', fontFamily: 'inherit', fontSize: 12 }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '24px 32px 40px' }}>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
            {[
              { v: stats?.active_tickets ?? 0,             l: 'Active Tickets', c: '#f97316' },
              { v: stats?.this_week_resolved ?? 0,          l: 'This Week',      c: '#3b82f6' },
              { v: stats?.total_resolved ?? 0,              l: 'Total Resolved', c: T.gl },
              { v: `${stats?.sla_compliance_rate ?? 100}%`, l: 'SLA Compliance', c: '#4d9e78' },
              { v: `${stats?.avg_resolution_time ?? 0}m`,   l: 'Avg Resolution', c: '#a855f7' },
            ].map((s, i) => (
              <div key={i} className="sc" style={{ background: T.card, border: `1px solid ${T.border}`, padding: '18px 16px', borderRadius: 10, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.c}, transparent)` }}/>
                <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 30, fontWeight: 500, color: s.c, lineHeight: 1, marginBottom: 6 }}>{loading ? '—' : s.v}</div>
                <div style={{ fontSize: 10, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Queue + Detail */}
          <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20, alignItems: 'start' }}>

            {/* ── Queue ── */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>Ticket Queue</span>
                <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(249,115,22,0.12)', color: '#f97316', borderRadius: 12, fontWeight: 700 }}>{openTickets.length} open</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: T.muted, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                    Loading tickets...
                  </div>
                ) : openTickets.length === 0 ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4d9e78" strokeWidth="1.8"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 18, fontWeight: 500, color: T.text, marginBottom: 6 }}>All caught up</div>
                    <div style={{ fontSize: 13, color: T.muted }}>No open tickets assigned to you.</div>
                  </div>
                ) : openTickets.map(ticket => (
                  <div key={ticket.id}
                    className={`tr ${selected?.id === ticket.id ? 'sel' : ''}`}
                    onClick={() => { setSelected(selected?.id === ticket.id ? null : ticket); setNotes('') }}
                    style={{ background: T.card, border: `1px solid ${selected?.id === ticket.id ? 'rgba(23,77,56,.4)' : T.border}`, borderLeft: `3px solid ${priorityColor(ticket.priority)}`, padding: '14px 16px', borderRadius: 10, position: 'relative', overflow: 'hidden' }}>
                    {selected?.id === ticket.id && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,rgba(23,77,56,.5),transparent)' }}/>}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.gl, fontFamily: 'monospace', letterSpacing: '0.06em' }}>{ticket.ticket_number}</span>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <span style={{ fontSize: 9, padding: '2px 7px', background: `${priorityColor(ticket.priority)}18`, color: priorityColor(ticket.priority), borderRadius: 3, fontWeight: 700, textTransform: 'uppercase' }}>{ticket.priority}</span>
                        <span style={{ fontSize: 9, padding: '2px 7px', background: `${statusColor(ticket.status)}18`, color: statusColor(ticket.status), borderRadius: 3, textTransform: 'uppercase' }}>{ticket.status.replace('_', ' ')}</span>
                      </div>
                    </div>

                    <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 15, fontWeight: 500, color: T.text, marginBottom: 8, lineHeight: 1.3 }}>{ticket.title}</div>

                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, padding: '2px 7px', background: T.accent, color: T.gl, borderRadius: 3 }}>{domainLabel(ticket.domain)}</span>
                      <span style={{ fontSize: 10, color: T.muted }}>👤 {ticket.user_name}</span>
                      {ticket.user_city && <span style={{ fontSize: 10, color: T.muted }}>📍 {ticket.user_city}, {ticket.user_country}</span>}
                      <span style={{ fontSize: 10, color: T.gl }}>🕐 <LiveClock timezone={ticket.user_timezone} label=""/></span>
                      {ticket.cnn_image_result && <span style={{ fontSize: 9, padding: '2px 6px', background: 'rgba(168,85,247,.12)', color: '#a855f7', borderRadius: 3 }}>📸 Screenshot</span>}
                      {ticket.sla_breached && <span style={{ fontSize: 9, padding: '2px 6px', background: 'rgba(239,68,68,.12)', color: '#ef4444', borderRadius: 3, fontWeight: 700 }}>SLA</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Resolved */}
              {resolvedTickets.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span>Recently Resolved</span>
                    <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(77,158,120,0.12)', color: '#4d9e78', borderRadius: 12, fontWeight: 700 }}>{resolvedTickets.length}</span>
                  </div>
                  {resolvedTickets.slice(0, 5).map(ticket => (
                    <div key={ticket.id} className="tr"
                      onClick={() => { setSelected(selected?.id === ticket.id ? null : ticket); setNotes('') }}
                      style={{ background: T.card, border: `1px solid ${T.border}`, padding: '10px 14px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, opacity: 0.72 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: T.gl, fontFamily: 'monospace' }}>{ticket.ticket_number}</span>
                        <span style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 14, color: T.text }}>{ticket.title}</span>
                      </div>
                      <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(77,158,120,0.12)', color: '#4d9e78', borderRadius: 3, fontWeight: 600 }}>Resolved</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Detail Panel ── */}
            {selected && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden', position: 'sticky', top: 20, maxHeight: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column', animation: 'fadeUp .2s ease' }}>

                {/* Green header */}
                <div style={{ background: 'linear-gradient(135deg, #174D38 0%, #0d2e1f 100%)', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'rgba(237,232,224,0.55)', letterSpacing: '0.1em', marginBottom: 5, fontFamily: 'monospace' }}>{selected.ticket_number}</div>
                    <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 18, fontWeight: 500, color: '#ede8e0', lineHeight: 1.3, maxWidth: 310 }}>{selected.title}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 9, padding: '3px 9px', background: `${priorityColor(selected.priority)}25`, color: priorityColor(selected.priority), borderRadius: 4, fontWeight: 700, textTransform: 'uppercase', border: `1px solid ${priorityColor(selected.priority)}40` }}>{selected.priority}</span>
                    <button onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(237,232,224,0.7)', cursor: 'pointer', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>×</button>
                  </div>
                </div>

                {/* Scrollable body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>

                  {/* Badges */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, padding: '3px 10px', background: `${statusColor(selected.status)}18`, color: statusColor(selected.status), borderRadius: 4, fontWeight: 700, textTransform: 'uppercase' }}>{selected.status.replace('_', ' ')}</span>
                    <span style={{ fontSize: 10, padding: '3px 10px', background: 'rgba(23,77,56,.12)', color: '#4d9e78', borderRadius: 4 }}>{domainLabel(selected.domain)}</span>
                    {selected.sla_breached && <span style={{ fontSize: 10, padding: '3px 10px', background: 'rgba(239,68,68,.12)', color: '#ef4444', borderRadius: 4, fontWeight: 700 }}>SLA Breached</span>}
                  </div>

                  {/* User */}
                  <div style={{ padding: '14px 16px', background: T.secBg, border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 14 }}>
                    <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, marginBottom: 10, fontWeight: 600 }}>User</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(23,77,56,0.15)', border: '1px solid rgba(23,77,56,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: T.gl, flexShrink: 0 }}>
                        {selected.user_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 15, fontWeight: 500, color: T.text, marginBottom: 3 }}>{selected.user_name}</div>
                        <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>{selected.user_email}</div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {selected.user_city && <span style={{ fontSize: 11, color: T.muted }}>📍 {selected.user_city}, {selected.user_country}</span>}
                          {selected.user_timezone && <span style={{ fontSize: 11, color: T.gl }}>🕐 <LiveClock timezone={selected.user_timezone} label=""/> local</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, marginBottom: 8, fontWeight: 600 }}>Issue Description</div>
                    <div style={{ fontSize: 13, color: T.text, lineHeight: 1.7, padding: '12px 14px', background: T.secBg, border: `1px solid ${T.border}`, borderRadius: 8 }}>{selected.description}</div>
                  </div>

                  {/* Steps tried */}
                  {selected.steps_tried && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, marginBottom: 8, fontWeight: 600 }}>Steps Already Tried</div>
                      <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.7, padding: '12px 14px', background: T.secBg, border: `1px solid ${T.border}`, borderRadius: 8 }}>{selected.steps_tried}</div>
                    </div>
                  )}

                  {/* AI Diagnosis */}
                  {selected.ai_diagnosis && (
                    <div style={{ padding: '14px 16px', background: 'rgba(23,77,56,0.08)', border: '1px solid rgba(23,77,56,0.2)', borderRadius: 8, marginBottom: 14 }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.gl, marginBottom: 8, fontWeight: 600 }}>AI Diagnosis</div>
                      <div style={{ fontSize: 13, color: T.text, lineHeight: 1.7 }}>{selected.ai_diagnosis}</div>
                    </div>
                  )}

                  {/* Screenshot + CNN — authenticated blob fetch */}
                  {selected.cnn_image_result && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.gl, marginBottom: 8, fontWeight: 600 }}>Screenshot + CNN Detection</div>
                      <div style={{ fontSize: 11, color: T.muted, marginBottom: 10, padding: '7px 12px', background: 'rgba(23,77,56,0.08)', border: '1px solid rgba(23,77,56,0.15)', borderRadius: 6 }}>
                        {selected.cnn_image_result.includes(' |')
                          ? selected.cnn_image_result.split(' | ').slice(1).join(' · ')
                          : 'Screenshot uploaded by user'}
                      </div>
                      {getScreenshotUrl(selected.cnn_image_result) && (
                        <ScreenshotImage
                          url={getScreenshotUrl(selected.cnn_image_result)!}
                          dark={dark}
                        />
                      )}
                    </div>
                  )}

                  {/* Created at */}
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    {new Date(selected.created_at).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {/* Resolution notes input */}
                  {selected.status !== 'resolved' && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, marginBottom: 8, fontWeight: 600 }}>Resolution Notes</div>
                      <textarea style={{ ...T.inp, minHeight: 80 }} placeholder="Document what you did to resolve this issue..." value={notes} onChange={e => setNotes(e.target.value)}/>
                    </div>
                  )}

                  {/* Resolved notes display */}
                  {selected.status === 'resolved' && selected.resolution_notes && (
                    <div style={{ padding: '14px 16px', background: 'rgba(23,77,56,0.08)', border: '1px solid rgba(23,77,56,0.2)', borderRadius: 8, marginBottom: 14 }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.gl, marginBottom: 8, fontWeight: 600 }}>Resolution Notes</div>
                      <div style={{ fontSize: 13, color: T.text, lineHeight: 1.7 }}>{selected.resolution_notes}</div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {selected.status !== 'resolved' && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      {selected.status === 'open' && (
                        <button onClick={() => updateTicket(selected.id, 'in_progress')} disabled={updating}
                          style={{ flex: 1, padding: '11px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 8, fontFamily: 'inherit' }}>
                          Mark In Progress
                        </button>
                      )}
                      <button onClick={() => updateTicket(selected.id, 'resolved', notes)} disabled={updating || !notes.trim()}
                        style={{ flex: 2, padding: '11px', background: !notes.trim() ? (dark ? 'rgba(23,77,56,0.12)' : 'rgba(23,77,56,0.07)') : 'linear-gradient(135deg,#174D38,#0f3324)', color: !notes.trim() ? T.muted : '#ede8e0', border: 'none', fontSize: 13, fontWeight: 600, cursor: !notes.trim() ? 'not-allowed' : 'pointer', borderRadius: 8, fontFamily: 'inherit', boxShadow: notes.trim() ? '0 4px 14px rgba(23,77,56,.3)' : 'none', letterSpacing: '0.03em' }}>
                        {updating ? 'Saving...' : 'Mark Resolved ✓'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}