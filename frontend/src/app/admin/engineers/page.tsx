'use client'
// File: frontend/src/app/admin/engineers/page.tsx

import { useState, useEffect, useCallback } from 'react'

interface Engineer {
  id: string
  engineer_id: string
  full_name: string
  email: string
  domain_expertise: string[]
  region: string
  timezone: string
  seniority_level: string
  max_ticket_capacity: number
  availability_status: string
  active_ticket_count: number
  is_activated: boolean
  is_active: boolean
  total_resolved: number
  sla_compliance_rate: number
  created_at: string
}

const DOMAINS = [
  { value: 'networking',          label: 'Networking' },
  { value: 'hardware',            label: 'Hardware' },
  { value: 'software',            label: 'Software' },
  { value: 'security',            label: 'Security' },
  { value: 'email_communication', label: 'Email & Communication' },
  { value: 'identity_access',     label: 'Identity & Access' },
  { value: 'database',            label: 'Database' },
  { value: 'cloud',               label: 'Cloud' },
  { value: 'infrastructure',      label: 'Infrastructure' },
  { value: 'devops',              label: 'DevOps' },
  { value: 'erp_business_apps',   label: 'ERP & Business Apps' },
  { value: 'endpoint_management', label: 'Endpoint Management' },
]

const REGIONS = ['India', 'Europe', 'US', 'Asia Pacific', 'Middle East', 'Africa']
const SENIORITY = ['junior', 'mid', 'senior', 'lead']

export default function AdminEngineersPage() {
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dark, setDark] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [regionFilter, setRegionFilter] = useState('all')
  const [form, setForm] = useState({
    full_name: '', email: '',
    domain_expertise: [] as string[],
    region: 'India', timezone: 'Asia/Kolkata',
    seniority_level: 'mid', max_ticket_capacity: 10,
  })

  useEffect(() => {
    const theme = localStorage.getItem('admin_theme')
    setDark(theme !== 'light')
  }, [])

  const fetchEngineers = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (regionFilter !== 'all') params.set('region', regionFilter)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/engineers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      setEngineers(await res.json())
    } catch {
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, regionFilter])

  useEffect(() => {
    const timer = setTimeout(fetchEngineers, 300)
    return () => clearTimeout(timer)
  }, [fetchEngineers])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.domain_expertise.length === 0) { setError('Select at least one domain'); return }
    setCreating(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/engineers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.detail || 'Failed')
      setSuccess(`Engineer ${d.engineer_id} created! Activation email sent.`)
      setShowModal(false)
      setForm({ full_name: '', email: '', domain_expertise: [], region: 'India', timezone: 'Asia/Kolkata', seniority_level: 'mid', max_ticket_capacity: 10 })
      fetchEngineers()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDeactivate = async (engineerId: string) => {
    if (!confirm(`Deactivate ${engineerId}?`)) return
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/engineers/${engineerId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      const d = await res.json()
      if (!res.ok) { alert(d.detail || 'Failed'); return }
      setSuccess(`${engineerId} deactivated. Notification sent.`)
      fetchEngineers()
    } catch { alert('Something went wrong') }
  }

  const handleReactivate = async (engineerId: string) => {
    if (!confirm(`Reactivate ${engineerId}?`)) return
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/engineers/${engineerId}/reactivate`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      const d = await res.json()
      if (!res.ok) { alert(d.detail || 'Failed'); return }
      setSuccess(`${engineerId} reactivated. Notification sent.`)
      fetchEngineers()
    } catch { alert('Something went wrong') }
  }

  const toggleDomain = (d: string) => {
    setForm(f => ({
      ...f,
      domain_expertise: f.domain_expertise.includes(d)
        ? f.domain_expertise.filter(x => x !== d)
        : [...f.domain_expertise, d],
    }))
  }

  const getDomainLabel = (value: string) =>
    DOMAINS.find(d => d.value === value)?.label || value

  const getStatus = (eng: Engineer) => {
    if (!eng.is_active) return { label: 'Deactivated', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
    if (!eng.is_activated) return { label: 'Pending', color: '#f97316', bg: 'rgba(249,115,22,0.1)' }
    if (eng.availability_status === 'available') return { label: 'Available', color: '#4d9e78', bg: 'rgba(77,158,120,0.1)' }
    if (eng.availability_status === 'busy') return { label: 'Busy', color: '#f97316', bg: 'rgba(249,115,22,0.1)' }
    return { label: 'Away', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' }
  }

  const t = {
    text:      dark ? '#F2F2F2' : '#111111',
    textMuted: dark ? 'rgba(242,242,242,0.45)' : 'rgba(17,17,17,0.5)',
    card:      dark ? '#141414' : '#ffffff',
    border:    dark ? 'rgba(255,255,255,0.07)' : '#CBCBCB',
    cardHover: dark ? '#1a1a1a' : '#f7f7f7',
    modalBg:   dark ? '#111111' : '#ffffff',
    inp:       { width: '100%', padding: '10px 14px', background: dark ? 'rgba(255,255,255,0.04)' : '#f7f7f7', border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#CBCBCB'}`, color: dark ? '#F2F2F2' : '#111', fontSize: 14, outline: 'none', borderRadius: 2, fontFamily: 'DM Sans, sans-serif' } as React.CSSProperties,
    lbl:       { fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: dark ? 'rgba(242,242,242,0.4)' : 'rgba(17,17,17,0.5)', marginBottom: 8, display: 'block', fontWeight: 500 } as React.CSSProperties,
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 500, color: t.text, marginBottom: 6 }}>Engineers</h1>
          <p style={{ fontSize: 14, color: t.textMuted }}>{engineers.length} engineers found</p>
        </div>
        <button onClick={() => { setShowModal(true); setError('') }} style={{ padding: '10px 24px', background: '#174D38', color: '#F2F2F2', border: 'none', fontSize: 13, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2, fontFamily: 'inherit' }}>
          + Add Engineer
        </button>
      </div>

      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: t.textMuted, fontSize: 14 }}>⌕</span>
          <input style={{ ...t.inp, paddingLeft: 36 }} type="text" placeholder="Search by name, email, ID, region..." value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select style={{ ...t.inp, width: 'auto', minWidth: 140, appearance: 'none', cursor: 'pointer' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="deactivated">Deactivated</option>
        </select>
        <select style={{ ...t.inp, width: 'auto', minWidth: 140, appearance: 'none', cursor: 'pointer' }} value={regionFilter} onChange={e => setRegionFilter(e.target.value)}>
          <option value="all">All Regions</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(search || statusFilter !== 'all' || regionFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setRegionFilter('all') }} style={{ padding: '10px 16px', background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, fontSize: 13, cursor: 'pointer', borderRadius: 2, fontFamily: 'inherit' }}>
            Clear ×
          </button>
        )}
      </div>

      {/* Success */}
      {success && (
        <div style={{ padding: '12px 16px', background: 'rgba(23,77,56,0.15)', border: '1px solid rgba(23,77,56,0.3)', color: '#4d9e78', fontSize: 13, marginBottom: 20, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {success}
          <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', color: '#4d9e78', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 1fr 110px 110px 80px 80px 130px', padding: '12px 20px', borderBottom: `1px solid ${t.border}`, background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
          {['Engineer ID', 'Name & Email', 'Domains', 'Region', 'Status', 'Tickets', 'Resolved', 'Actions'].map((h, i) => (
            <div key={i} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.textMuted, fontWeight: 600 }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: t.textMuted }}>Loading...</div>
        ) : engineers.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
            <div style={{ fontSize: 15, color: t.text, marginBottom: 8 }}>No engineers found</div>
            <div style={{ fontSize: 13, color: t.textMuted }}>
              {search || statusFilter !== 'all' || regionFilter !== 'all' ? 'Try clearing your filters.' : 'Click "+ Add Engineer" to get started.'}
            </div>
          </div>
        ) : (
          engineers.map((eng, i) => {
            const status = getStatus(eng)
            return (
              <div key={eng.id} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 1fr 110px 110px 80px 80px 130px', padding: '16px 20px', borderBottom: i < engineers.length - 1 ? `1px solid ${t.border}` : 'none', transition: 'background 0.15s', opacity: !eng.is_active ? 0.6 : 1 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = t.cardHover}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: '#4d9e78', fontFamily: 'monospace' }}>{eng.engineer_id}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{eng.full_name}</div>
                  <div style={{ fontSize: 12, color: t.textMuted }}>{eng.email}</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignContent: 'flex-start' }}>
                  {eng.domain_expertise.map((d, j) => (
                    <span key={j} style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(23,77,56,0.12)', color: '#4d9e78', borderRadius: 2 }}>{getDomainLabel(d)}</span>
                  ))}
                </div>
                <div style={{ fontSize: 13, color: t.textMuted }}>{eng.region}</div>
                <div>
                  <span style={{ fontSize: 11, padding: '3px 8px', background: status.bg, color: status.color, borderRadius: 2, fontWeight: 600 }}>{status.label}</span>
                </div>
                <div style={{ fontSize: 13, color: t.textMuted }}>{eng.active_ticket_count}/{eng.max_ticket_capacity}</div>
                <div style={{ fontSize: 13, color: t.textMuted }}>{eng.total_resolved}</div>
                <div>
                  {eng.is_active ? (
                    <button onClick={() => handleDeactivate(eng.engineer_id)} style={{ fontSize: 11, padding: '4px 10px', background: 'rgba(77,23,23,0.15)', border: '1px solid rgba(77,23,23,0.25)', color: '#a04040', cursor: 'pointer', borderRadius: 2, fontFamily: 'inherit' }}>Deactivate</button>
                  ) : (
                    <button onClick={() => handleReactivate(eng.engineer_id)} style={{ fontSize: 11, padding: '4px 10px', background: 'rgba(23,77,56,0.15)', border: '1px solid rgba(23,77,56,0.25)', color: '#4d9e78', cursor: 'pointer', borderRadius: 2, fontFamily: 'inherit' }}>Reactivate</button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: t.modalBg, border: `1px solid ${t.border}`, borderRadius: 8, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '24px 28px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 500, color: t.text, marginBottom: 4 }}>Add New Engineer</h2>
                <p style={{ fontSize: 13, color: t.textMuted }}>Activation email sent automatically.</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: t.textMuted, fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {error && (
                <div style={{ padding: '12px 14px', background: 'rgba(77,23,23,0.2)', border: '1px solid rgba(200,50,50,0.3)', color: '#f87171', fontSize: 13, borderRadius: 2 }}>{error}</div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={t.lbl}>Full Name</label>
                  <input style={t.inp} type="text" placeholder="Arjun Sharma" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required/>
                </div>
                <div>
                  <label style={t.lbl}>Email Address</label>
                  <input style={t.inp} type="email" placeholder="arjun@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required/>
                </div>
              </div>

              <div>
                <label style={t.lbl}>Domain Expertise (select all that apply)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {DOMAINS.map(d => {
                    const selected = form.domain_expertise.includes(d.value)
                    return (
                      <button key={d.value} type="button" onClick={() => toggleDomain(d.value)} style={{ padding: '6px 12px', fontSize: 11, background: selected ? '#174D38' : 'transparent', border: `1px solid ${selected ? '#174D38' : t.border}`, color: selected ? '#F2F2F2' : t.textMuted, cursor: 'pointer', borderRadius: 2, fontFamily: 'inherit', transition: 'all 0.15s' }}>
                        {d.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={t.lbl}>Region</label>
                  <select style={{ ...t.inp, appearance: 'none' }} value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={t.lbl}>Timezone</label>
                  <input style={t.inp} type="text" value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}/>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={t.lbl}>Seniority</label>
                  <select style={{ ...t.inp, appearance: 'none' }} value={form.seniority_level} onChange={e => setForm(f => ({ ...f, seniority_level: e.target.value }))}>
                    {SENIORITY.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={t.lbl}>Max Capacity</label>
                  <input style={t.inp} type="number" min={1} max={50} value={form.max_ticket_capacity} onChange={e => setForm(f => ({ ...f, max_ticket_capacity: parseInt(e.target.value) }))}/>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, fontSize: 13, cursor: 'pointer', borderRadius: 2, fontFamily: 'inherit' }}>Cancel</button>
                <button type="submit" disabled={creating} style={{ flex: 2, padding: '12px', background: creating ? '#0f3526' : '#174D38', color: '#F2F2F2', border: 'none', fontSize: 13, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: creating ? 'not-allowed' : 'pointer', borderRadius: 2, fontFamily: 'inherit' }}>
                  {creating ? 'Creating...' : 'Create Engineer →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}