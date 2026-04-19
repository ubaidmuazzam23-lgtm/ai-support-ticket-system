'use client'
// File: frontend/src/app/admin/tickets/page.tsx

import { useState, useEffect, useCallback } from 'react'

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
  steps_tried: string
  resolution_notes: string
  sla_deadline: string
  sla_breached: boolean
  user_name: string
  user_email: string
  user_city: string
  user_country: string
  user_timezone: string
  engineer_name: string
  engineer_id: string
  engineer_email: string
  engineer_region: string
  engineer_timezone: string
  engineer_seniority: string
  created_at: string
  updated_at: string
  resolved_at: string
}

const priorityColor = (p: string) =>
  p === 'critical' ? '#ef4444' : p === 'high' ? '#f97316' : p === 'medium' ? '#eab308' : '#6b7280'

const statusColor = (s: string) =>
  s === 'resolved' ? '#4d9e78' : s === 'in_progress' ? '#3b82f6' : s === 'open' ? '#f97316' : '#6b7280'

function LiveTime({ timezone }: { timezone: string }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(i)
  }, [])
  try {
    return <span>{now.toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true })}</span>
  } catch { return <span>—</span> }
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [dark, setDark] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [domainFilter, setDomainFilter] = useState('all')

  useEffect(() => {
    const theme = localStorage.getItem('admin_theme')
    setDark(theme !== 'light')
  }, [])

  const fetchTickets = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)
      if (domainFilter !== 'all') params.set('domain', domainFilter)

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/tickets?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      setTickets(await res.json())
    } catch {
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, priorityFilter, domainFilter])

  useEffect(() => {
    const timer = setTimeout(fetchTickets, 300)
    return () => clearTimeout(timer)
  }, [fetchTickets])

  const t = {
    text:      dark ? '#F2F2F2' : '#111111',
    textMuted: dark ? 'rgba(242,242,242,0.45)' : 'rgba(17,17,17,0.5)',
    card:      dark ? '#141414' : '#ffffff',
    border:    dark ? 'rgba(255,255,255,0.07)' : '#CBCBCB',
    cardHover: dark ? '#1a1a1a' : '#f7f7f7',
    inp:       { padding: '10px 14px', background: dark ? 'rgba(255,255,255,0.04)' : '#f7f7f7', border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#CBCBCB'}`, color: dark ? '#F2F2F2' : '#111', fontSize: 13, outline: 'none', borderRadius: 2, fontFamily: 'DM Sans, sans-serif' } as React.CSSProperties,
  }

  const DOMAINS = ['networking', 'hardware', 'software', 'security', 'email_communication', 'identity_access', 'database', 'cloud', 'infrastructure', 'devops', 'erp_business_apps', 'endpoint_management']

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 128px)' }}>

      {/* Left — ticket list */}
      <div style={{ flex: selected ? '0 0 55%' : '1', display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 500, color: t.text, marginBottom: 6 }}>All Tickets</h1>
            <p style={{ fontSize: 14, color: t.textMuted }}>{tickets.length} tickets</p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: t.textMuted, fontSize: 13 }}>⌕</span>
            <input style={{ ...t.inp, width: '100%', paddingLeft: 30 }} placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <select style={{ ...t.inp, minWidth: 130, appearance: 'none', cursor: 'pointer' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <select style={{ ...t.inp, minWidth: 130, appearance: 'none', cursor: 'pointer' }} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
            <option value="all">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select style={{ ...t.inp, minWidth: 160, appearance: 'none', cursor: 'pointer' }} value={domainFilter} onChange={e => setDomainFilter(e.target.value)}>
            <option value="all">All Domains</option>
            {DOMAINS.map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
          </select>
          {(search || statusFilter !== 'all' || priorityFilter !== 'all' || domainFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setStatusFilter('all'); setPriorityFilter('all'); setDomainFilter('all') }} style={{ ...t.inp, background: 'transparent', cursor: 'pointer' }}>Clear ×</button>
          )}
        </div>

        {/* Ticket list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: t.textMuted }}>Loading...</div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', background: t.card, border: `1px solid ${t.border}`, borderRadius: 4 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>◉</div>
              <div style={{ fontSize: 15, color: t.text, marginBottom: 8 }}>No tickets found</div>
              <div style={{ fontSize: 13, color: t.textMuted }}>Try clearing your filters.</div>
            </div>
          ) : (
            tickets.map(ticket => (
              <div key={ticket.id} onClick={() => setSelected(selected?.id === ticket.id ? null : ticket)} style={{
                background: selected?.id === ticket.id ? (dark ? '#1a1a1a' : '#f0f0f0') : t.card,
                border: `1px solid ${selected?.id === ticket.id ? '#174D38' : t.border}`,
                borderLeft: `3px solid ${priorityColor(ticket.priority)}`,
                padding: '14px 16px', borderRadius: 4, cursor: 'pointer', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { if (selected?.id !== ticket.id) (e.currentTarget as HTMLElement).style.background = t.cardHover }}
                onMouseLeave={e => { if (selected?.id !== ticket.id) (e.currentTarget as HTMLElement).style.background = t.card }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#4d9e78', fontFamily: 'monospace' }}>{ticket.ticket_number}</span>
                    {ticket.sla_breached && <span style={{ fontSize: 10, padding: '1px 6px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: 2 }}>SLA Breached</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', background: `${priorityColor(ticket.priority)}18`, color: priorityColor(ticket.priority), borderRadius: 2, fontWeight: 700, textTransform: 'uppercase' }}>{ticket.priority}</span>
                    <span style={{ fontSize: 10, padding: '2px 7px', background: `${statusColor(ticket.status)}18`, color: statusColor(ticket.status), borderRadius: 2, textTransform: 'uppercase' }}>{ticket.status.replace('_', ' ')}</span>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 8 }}>{ticket.title}</div>
                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: t.textMuted, flexWrap: 'wrap' }}>
                  <span>👤 {ticket.user_name}</span>
                  {ticket.engineer_name && <span>◈ {ticket.engineer_name} ({ticket.engineer_id})</span>}
                  <span style={{ textTransform: 'capitalize' }}>◉ {ticket.domain?.replace('_', ' ')}</span>
                  <span>{new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right — ticket detail */}
      {selected && (
        <div style={{ flex: '0 0 42%', background: t.card, border: `1px solid ${t.border}`, borderRadius: 4, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
          {/* Header */}
          <div style={{ background: '#174D38', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(242,242,242,0.6)', marginBottom: 4 }}>{selected.ticket_number}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#F2F2F2' }}>{selected.title}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 10, padding: '3px 8px', background: '#4D1717', color: '#F2F2F2', borderRadius: 2, fontWeight: 700, textTransform: 'uppercase' }}>{selected.priority}</span>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'rgba(242,242,242,0.7)', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

            {/* Status + Domain */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <span style={{ fontSize: 11, padding: '4px 10px', background: `${statusColor(selected.status)}18`, color: statusColor(selected.status), borderRadius: 2, fontWeight: 600, textTransform: 'uppercase' }}>{selected.status.replace('_', ' ')}</span>
              <span style={{ fontSize: 11, padding: '4px 10px', background: dark ? 'rgba(255,255,255,0.05)' : '#f0f0f0', color: t.textMuted, borderRadius: 2, textTransform: 'capitalize' }}>{selected.domain?.replace('_', ' ')}</span>
              {selected.complexity && <span style={{ fontSize: 11, padding: '4px 10px', background: dark ? 'rgba(255,255,255,0.05)' : '#f0f0f0', color: t.textMuted, borderRadius: 2, textTransform: 'capitalize' }}>BiLSTM: {selected.complexity}</span>}
            </div>

            {/* User info */}
            <div style={{ padding: '14px 16px', background: dark ? 'rgba(255,255,255,0.02)' : '#f7f7f7', border: `1px solid ${t.border}`, borderRadius: 4, marginBottom: 14 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.textMuted, marginBottom: 10, fontWeight: 600 }}>User</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(23,77,56,0.15)', border: '1px solid #174D38', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#4d9e78', flexShrink: 0 }}>
                  {selected.user_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{selected.user_name}</div>
                  <div style={{ fontSize: 11, color: t.textMuted }}>{selected.user_email}</div>
                  <div style={{ fontSize: 11, color: t.textMuted }}>
                    📍 {selected.user_city}, {selected.user_country}
                    {selected.user_timezone && <span style={{ color: '#4d9e78', marginLeft: 8 }}>🕐 <LiveTime timezone={selected.user_timezone}/> local</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Engineer info */}
            {selected.engineer_name ? (
              <div style={{ padding: '14px 16px', background: dark ? 'rgba(23,77,56,0.08)' : 'rgba(23,77,56,0.05)', border: '1px solid rgba(23,77,56,0.2)', borderRadius: 4, marginBottom: 14 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4d9e78', marginBottom: 10, fontWeight: 600 }}>Assigned Engineer</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#174D38', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#F2F2F2', flexShrink: 0 }}>
                    {selected.engineer_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{selected.engineer_name} · <span style={{ color: '#4d9e78', fontFamily: 'monospace' }}>{selected.engineer_id}</span></div>
                    <div style={{ fontSize: 11, color: t.textMuted }}>{selected.engineer_email}</div>
                    <div style={{ fontSize: 11, color: t.textMuted }}>
                      {selected.engineer_region} · {selected.engineer_seniority}
                      {selected.engineer_timezone && <span style={{ color: '#4d9e78', marginLeft: 8 }}>🕐 <LiveTime timezone={selected.engineer_timezone}/> local</span>}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '12px 16px', background: dark ? 'rgba(249,115,22,0.08)' : 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 4, marginBottom: 14, fontSize: 13, color: '#f97316' }}>
                ⚠ No engineer assigned yet
              </div>
            )}

            {/* Issue */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.textMuted, marginBottom: 6, fontWeight: 600 }}>Issue Description</div>
              <div style={{ fontSize: 13, color: t.text, lineHeight: 1.65 }}>{selected.description}</div>
            </div>

            {selected.steps_tried && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.textMuted, marginBottom: 6, fontWeight: 600 }}>Steps Tried</div>
                <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.65 }}>{selected.steps_tried}</div>
              </div>
            )}

            {selected.ai_diagnosis && (
              <div style={{ padding: '12px 14px', background: 'rgba(23,77,56,0.08)', border: '1px solid rgba(23,77,56,0.2)', borderRadius: 4, marginBottom: 14 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4d9e78', marginBottom: 6, fontWeight: 600 }}>AI Diagnosis</div>
                <div style={{ fontSize: 13, color: t.text, lineHeight: 1.65 }}>{selected.ai_diagnosis}</div>
              </div>
            )}

            {selected.resolution_notes && (
              <div style={{ padding: '12px 14px', background: dark ? 'rgba(255,255,255,0.02)' : '#f7f7f7', border: `1px solid ${t.border}`, borderRadius: 4, marginBottom: 14 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.textMuted, marginBottom: 6, fontWeight: 600 }}>Resolution Notes</div>
                <div style={{ fontSize: 13, color: t.text, lineHeight: 1.65 }}>{selected.resolution_notes}</div>
              </div>
            )}

            {/* Timestamps */}
            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: t.textMuted, paddingTop: 8, borderTop: `1px solid ${t.border}` }}>
              <span>Created: {new Date(selected.created_at).toLocaleString()}</span>
              {selected.resolved_at && <span>Resolved: {new Date(selected.resolved_at).toLocaleString()}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}