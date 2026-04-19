'use client'
// File: frontend/src/app/admin/overview/page.tsx

import { useState, useEffect } from 'react'

interface Overview {
  total_users: number
  total_engineers: number
  total_tickets: number
  open_tickets: number
  resolved_today: number
  ai_resolved_today: number
  ai_resolution_rate: number
  engineers_available: number
  engineers_busy: number
  engineers_away: number
  sla_compliance_rate: number
  active_regions: string[]
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const theme = localStorage.getItem('admin_theme')
    setDark(theme !== 'light')

    const fetchOverview = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed')
        setData(await res.json())
      } catch {
      } finally {
        setLoading(false)
      }
    }

    fetchOverview()
    const interval = setInterval(fetchOverview, 30000)
    return () => clearInterval(interval)
  }, [])

  const t = {
    text:      dark ? '#F2F2F2' : '#111111',
    textMuted: dark ? 'rgba(242,242,242,0.45)' : 'rgba(17,17,17,0.5)',
    card:      dark ? '#141414' : '#ffffff',
    border:    dark ? 'rgba(255,255,255,0.07)' : '#CBCBCB',
    cardHover: dark ? '#1a1a1a' : '#f7f7f7',
  }

  const StatCard = ({ value, label, sub, accent = '#174D38' }: { value: string | number, label: string, sub?: string, accent?: string }) => (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, padding: '28px 24px', borderRadius: 4, borderTop: `3px solid ${accent}`, transition: 'background 0.2s', cursor: 'default' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = t.cardHover}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = t.card}
    >
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 40, fontWeight: 500, color: accent, lineHeight: 1, marginBottom: 8 }}>{loading ? '—' : value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.text, marginBottom: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: t.textMuted }}>{sub}</div>}
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 500, color: t.text, marginBottom: 6 }}>Platform Overview</h1>
        <p style={{ fontSize: 14, color: t.textMuted }}>Live stats — refreshes every 30 seconds</p>
      </div>

      {/* Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        <StatCard value={data?.total_users ?? 0}                              label="Total Users"        sub="Registered accounts"    accent="#174D38"/>
        <StatCard value={data?.total_engineers ?? 0}                          label="Engineers"          sub="Active globally"        accent="#174D38"/>
        <StatCard value={data?.open_tickets ?? 0}                             label="Open Tickets"       sub="Awaiting resolution"    accent="#4D1717"/>
        <StatCard value={`${data?.ai_resolution_rate?.toFixed(0) ?? 0}%`}    label="AI Resolution Rate" sub="Issues resolved by AI"  accent="#174D38"/>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard value={data?.resolved_today ?? 0}                           label="Resolved Today"     sub="Tickets closed today"   accent="#4d9e78"/>
        <StatCard value={data?.ai_resolved_today ?? 0}                        label="AI Resolved Today"  sub="No ticket needed"       accent="#4d9e78"/>
        <StatCard value={`${data?.sla_compliance_rate?.toFixed(0) ?? 100}%`}  label="SLA Compliance"     sub="This week"              accent="#174D38"/>
        <StatCard value={data?.total_tickets ?? 0}                            label="Total Tickets"      sub="All time"               accent="#555"/>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Engineer availability */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, padding: '28px 24px', borderRadius: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.text, marginBottom: 24 }}>Engineer Availability</div>
          {[
            { label: 'Available', count: data?.engineers_available ?? 0, color: '#4d9e78' },
            { label: 'Busy',      count: data?.engineers_busy ?? 0,      color: '#f97316' },
            { label: 'Away',      count: data?.engineers_away ?? 0,      color: '#6b7280' },
          ].map((s, i) => {
            const total = (data?.engineers_available ?? 0) + (data?.engineers_busy ?? 0) + (data?.engineers_away ?? 0)
            const pct = total > 0 ? Math.round((s.count / total) * 100) : 0
            return (
              <div key={i} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: t.textMuted }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{loading ? '—' : `${s.count} (${pct}%)`}</span>
                </div>
                <div style={{ height: 4, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: s.color, borderRadius: 2, transition: 'width 0.6s ease' }}/>
                </div>
              </div>
            )
          })}
        </div>

        {/* Active regions */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, padding: '28px 24px', borderRadius: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.text, marginBottom: 24 }}>Active Regions</div>
          {loading ? (
            <div style={{ fontSize: 13, color: t.textMuted }}>Loading...</div>
          ) : data?.active_regions?.length ? (
            data.active_regions.map((region, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 14px', background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px solid ${t.border}`, borderRadius: 4 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4d9e78', flexShrink: 0 }}/>
                <span style={{ fontSize: 13, color: t.textMuted }}>{region}</span>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 13, color: t.textMuted, padding: '16px 0' }}>No engineers added yet.<br/>Create your first engineer to see regions.</div>
          )}
        </div>
      </div>
    </div>
  )
}