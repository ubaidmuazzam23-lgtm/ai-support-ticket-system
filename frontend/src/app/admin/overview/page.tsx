'use client'
// File: frontend/src/app/admin/overview/page.tsx

import { useState, useEffect, useRef, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL

interface Overview {
  total: number; open: number; in_progress: number; resolved: number
  this_week: number; this_month: number; sla_compliance: number
  sla_breached: number; ai_resolution_rate: number
}
interface Engineer {
  id: string; engineer_id: string; full_name: string
  domain_expertise: string[]; region: string; timezone: string
  city: string; country: string; seniority_level: string
  max_ticket_capacity: number; active_ticket_count: number
  availability_status: string; is_active: boolean; is_activated: boolean
  total_resolved: number; sla_compliance_rate: number
  lat?: number; lng?: number
}
interface Ticket {
  id: string; ticket_number: string; title: string; domain: string
  priority: string; status: string; engineer_name: string
  user_name: string; user_city: string; created_at: string; sla_deadline: string; sla_breached: boolean
}

const dLabel = (d: string) => ({
  networking:'Networking',hardware:'Hardware',software:'Software',security:'Security',
  email_communication:'Email & Comm',identity_access:'Identity & Access',database:'Database',
  cloud:'Cloud',infrastructure:'Infrastructure',devops:'DevOps',
  erp_business_apps:'ERP & Business',endpoint_management:'Endpoint Mgmt',other:'Other',
}[d] || d)

export default function OverviewPage() {
  const [overview, setOverview]     = useState<Overview | null>(null)
  const [engineers, setEngineers]   = useState<Engineer[]>([])
  const [tickets, setTickets]       = useState<Ticket[]>([])
  const [loading, setLoading]       = useState(true)
  const [routeTkt, setRouteTkt]     = useState<Ticket | null>(null)
  const [mounted, setMounted]       = useState(false)
  const mapRef                      = useRef<HTMLDivElement>(null)
  const leafRef                     = useRef<any>(null)
  const markersRef                  = useRef<any[]>([])

  const hdrs = useCallback(() => ({ Authorization: `Bearer ${localStorage.getItem('access_token') || ''}` }), [])

  const loadLeaflet = (): Promise<void> => new Promise((resolve) => {
    if ((window as any).L) { resolve(); return }
    if (!document.querySelector('#leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    const existing = document.querySelector('#leaflet-js')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      return
    }
    const script = document.createElement('script')
    script.id = 'leaflet-js'
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => resolve()
    script.onerror = () => resolve()
    document.head.appendChild(script)
  })

  useEffect(() => {
    setMounted(true)
    fetchAll()
  }, [])

  useEffect(() => {
    if (mounted && engineers.length > 0) {
      loadLeaflet().then(() => initMap())
    }
  }, [mounted, engineers])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [oR, eR, tR] = await Promise.all([
        fetch(`${API}/api/v1/analytics/overview`, { headers: hdrs() }),
        fetch(`${API}/api/v1/admin/engineers`, { headers: hdrs() }),
        fetch(`${API}/api/v1/admin/tickets?limit=50`, { headers: hdrs() }),
      ])
      if (oR.ok) setOverview(await oR.json())
      if (eR.ok) setEngineers(await eR.json())
      if (tR.ok) setTickets(await tR.json())
    } catch {}
    finally { setLoading(false) }
  }

  const initMap = async () => {
    if (!mapRef.current || leafRef.current) return
    try {
      const L = (window as any).L
      if (!L) return

      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false }).setView([20, 10], 2)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO', maxZoom: 19,
      }).addTo(map)
      leafRef.current = map

      // Comprehensive city coords — add more as needed
      const cityCoords: Record<string, [number, number]> = {
        // India
        'Bangalore': [12.97, 77.59], 'Bengaluru': [12.97, 77.59],
        'Mumbai': [19.07, 72.87], 'Delhi': [28.61, 77.21], 'New Delhi': [28.61, 77.21],
        'Pune': [18.52, 73.86], 'Hyderabad': [17.39, 78.49], 'Chennai': [13.08, 80.27],
        'Kolkata': [22.57, 88.36], 'Ahmedabad': [23.03, 72.58],
        // Europe
        'Paris': [48.85, 2.35], 'Berlin': [52.52, 13.40], 'London': [51.51, -0.13],
        'Amsterdam': [52.37, 4.90], 'Madrid': [40.42, -3.70], 'Rome': [41.90, 12.50],
        'Vienna': [48.21, 16.37], 'Zurich': [47.38, 8.54], 'Stockholm': [59.33, 18.07],
        'Warsaw': [52.23, 21.01], 'Prague': [50.08, 14.44], 'Lisbon': [38.72, -9.14],
        // Americas
        'Austin': [30.27, -97.74], 'New York': [40.71, -74.01], 'San Francisco': [37.77, -122.42],
        'Los Angeles': [34.05, -118.24], 'Chicago': [41.88, -87.63], 'Seattle': [47.61, -122.33],
        'Toronto': [43.65, -79.38], 'Vancouver': [49.28, -123.12], 'São Paulo': [-23.55, -46.63],
        'Mexico City': [19.43, -99.13],
        // Asia Pacific
        'Tokyo': [35.68, 139.76], 'Singapore': [1.35, 103.82], 'Sydney': [-33.87, 151.21],
        'Melbourne': [-37.81, 144.96], 'Seoul': [37.57, 126.98], 'Beijing': [39.91, 116.39],
        'Shanghai': [31.23, 121.47], 'Hong Kong': [22.32, 114.17], 'Taipei': [25.05, 121.53],
        'Jakarta': [-6.21, 106.85], 'Kuala Lumpur': [3.14, 101.69], 'Bangkok': [13.75, 100.52],
        // Middle East & Africa
        'Dubai': [25.20, 55.27], 'Abu Dhabi': [24.45, 54.38], 'Riyadh': [24.69, 46.72],
        'Tel Aviv': [32.08, 34.78], 'Cairo': [30.04, 31.24], 'Nairobi': [-1.29, 36.82],
      }

      // Fallback: use timezone to guess rough coords
      const tzCoords: Record<string, [number, number]> = {
        'Asia/Kolkata': [20.59, 78.96], 'Asia/Mumbai': [19.07, 72.87],
        'Europe/Paris': [48.85, 2.35], 'Europe/London': [51.51, -0.13],
        'Europe/Berlin': [52.52, 13.40], 'America/New_York': [40.71, -74.01],
        'America/Chicago': [41.88, -87.63], 'America/Los_Angeles': [37.77, -122.42],
        'Asia/Tokyo': [35.68, 139.76], 'Asia/Singapore': [1.35, 103.82],
        'Australia/Sydney': [-33.87, 151.21], 'Asia/Dubai': [25.20, 55.27],
        'UTC': [51.51, -0.13],
      }

      engineers.filter(e => e.is_active && e.is_activated).forEach(eng => {
        const coords = cityCoords[eng.city] || tzCoords[eng.timezone] || [51.51 + (Math.random()-0.5)*5, -0.13 + (Math.random()-0.5)*5]
        const color = eng.availability_status === 'available' ? '#174D38' : eng.availability_status === 'busy' ? '#8a5a00' : '#4D1717'

        const icon = L.divIcon({
          html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
          className: '', iconSize: [12, 12], iconAnchor: [6, 6],
        })

        const marker = L.marker(coords, { icon }).addTo(map)
        const city    = eng.city || ''
        const country = eng.country || ''
        const loc     = [city, country].filter(Boolean).join(', ') || eng.timezone || ''
        marker.bindPopup(`
          <div style="font-family:Inter,-apple-system,sans-serif">
            <div style="font-weight:600;font-size:13px;margin-bottom:4px">${eng.full_name}</div>
            <div style="font-size:11px;color:#555;margin-bottom:2px">${eng.engineer_id} · ${eng.seniority_level}</div>
            <div style="font-size:11px;color:#555;margin-bottom:2px">${loc}</div>
            <div style="font-size:11px;color:#555">${eng.active_ticket_count}/${eng.max_ticket_capacity} tickets · ${eng.availability_status}</div>
          </div>
        `, { maxWidth: 220 })
        markersRef.current.push(marker)
      })
    } catch (e) {
      console.log('Map init error:', e)
    }
  }

  const avail  = engineers.filter(e => e.availability_status === 'available' && e.is_active).length
  const busy   = engineers.filter(e => e.availability_status === 'busy' && e.is_active).length
  const away   = engineers.filter(e => e.availability_status === 'away' && e.is_active).length
  const openTk = tickets.filter(t => t.status !== 'resolved')
  const atRisk = tickets.filter(t => t.sla_breached || (t.sla_deadline && new Date(t.sla_deadline) < new Date(Date.now() + 20 * 60 * 1000)))

  // Volume sparkline — last 24 bars (mock from ticket data or static shape)
  const bars = [3,2,4,5,8,12,18,22,26,31,28,24,19,22,27,33,29,25,21,17,14,11,9,6]
  const maxB = Math.max(...bars)

  if (!mounted) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .ovw{font-family:"Inter",-apple-system,sans-serif;font-size:13px;color:#141414;background:#F2F2F2;min-height:100%}
        .ovw *{box-sizing:border-box}
        .ovw .card{background:#fff;border:1px solid #CBCBCB;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.07)}
        .ovw .c-head{padding:10px 14px;border-bottom:1px solid #CBCBCB;display:flex;align-items:center;gap:10px;min-height:40px}
        .ovw .c-head h3{margin:0;font-size:12px;font-weight:600;letter-spacing:-.01em}
        .ovw .c-sub{font-size:11px;color:#6b6b6b;font-family:"JetBrains Mono",monospace}
        .ovw .stat-lbl{font-size:10px;color:#6b6b6b;text-transform:uppercase;letter-spacing:.08em;font-family:"JetBrains Mono",monospace;font-weight:600}
        .ovw .stat-v{font-size:24px;font-weight:700;letter-spacing:-.02em;line-height:1.1;margin-top:5px;font-feature-settings:"tnum";font-family:"JetBrains Mono",monospace}
        .ovw .stat-d{font-size:11px;color:#6b6b6b;font-family:"JetBrains Mono",monospace;margin-top:3px}
        .ovw .stat-d.up{color:#1a7a4a}.ovw .stat-d.dn{color:#4D1717}
        .ovw .pill{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 7px;border-radius:10px;font-size:10px;font-weight:600;font-family:"JetBrains Mono",monospace;text-transform:uppercase;letter-spacing:.04em;background:#EBEBEB;color:#3a3a3a;border:1px solid #CBCBCB;white-space:nowrap}
        .ovw .pill-ok{background:#e6f4ed;color:#1a7a4a;border-color:transparent}
        .ovw .pill-warn{background:#fdf4e3;color:#8a5a00;border-color:transparent}
        .ovw .pill-crit{background:#f5eaea;color:#4D1717;border-color:transparent}
        .ovw .pill-grn{background:#e8f2ed;color:#174D38;border-color:transparent}
        .ovw .pill-pur{background:#f0edf8;color:#5b3d8a;border-color:transparent}
        .ovw .dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#a0a0a0;flex-shrink:0}
        .ovw .dot-ok{background:#1a7a4a}.ovw .dot-warn{background:#8a5a00}.ovw .dot-crit{background:#4D1717}.ovw .dot-grn{background:#174D38}
        .ovw .pulse{animation:ovw-pulse 1.8s ease-in-out infinite}
        @keyframes ovw-pulse{0%,100%{opacity:1}50%{opacity:.3}}
        .ovw table.dt{width:100%;border-collapse:collapse;font-size:12px}
        .ovw table.dt th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#6b6b6b;padding:8px 12px;background:#EBEBEB;border-bottom:1px solid #CBCBCB;font-weight:600;font-family:"JetBrains Mono",monospace;white-space:nowrap}
        .ovw table.dt td{padding:8px 12px;border-bottom:1px solid #f0f0f0;vertical-align:middle}
        .ovw table.dt tr:hover td{background:#f9f9f9;cursor:pointer}
        .ovw .bar{height:6px;background:#EBEBEB;border-radius:3px;overflow:hidden;border:1px solid #CBCBCB}
        .ovw .bar-f{height:100%;transition:width .4s;border-radius:3px}
        .ovw .sp{font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:600;padding:2px 8px;border-radius:3px;background:#EBEBEB;min-width:40px;text-align:center;border:1px solid #CBCBCB;display:inline-block}
        .ovw .sp-top{background:#174D38;color:#fff;border-color:#174D38}
        .ovw .mono{font-family:"JetBrains Mono",monospace}
        .ovw .muted{color:#6b6b6b}
        .ovw .small{font-size:11px}
        .ovw .tiny{font-size:10px}
        .ovw .trunc{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .ovw .row{display:flex;align-items:center;gap:8px}
        .ovw .grow{flex:1}
        .ovw .btn{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:4px;border:1px solid #CBCBCB;background:#fff;color:#141414;font-family:inherit;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background .1s}
        .ovw .btn:hover{background:#EBEBEB}
        .ovw .btn-p{background:#174D38!important;color:#fff!important;border-color:#174D38!important}
        .ovw .btn-p:hover{background:#1f6a4d!important}
        .ovw .btn-r{background:#4D1717!important;color:#fff!important;border-color:#4D1717!important}
        .ovw .btn-sm{height:24px;padding:0 8px;font-size:11px}
        .ovw .btn-g{background:transparent!important;border-color:transparent!important;color:#6b6b6b!important}
        .ovw .sla{font-family:"JetBrains Mono",monospace;font-weight:600;font-size:11px}
        .ovw .sla-ok{color:#1a7a4a}.ovw .sla-warn{color:#8a5a00}.ovw .sla-crit{color:#4D1717;animation:blink 1s step-end infinite}
        @keyframes blink{50%{opacity:.35}}
        .leaflet-container{background:#e8ede9!important;font-family:"Inter",sans-serif!important}
        .leaflet-popup-content-wrapper{border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.08);border:1px solid #CBCBCB}
        .leaflet-popup-content{font-family:"Inter",sans-serif;font-size:12px;margin:10px 14px}
        .leaflet-control-attribution{font-size:9px!important;color:#a0a0a0!important}
      `}</style>

      <div className="ovw" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* KPI row */}
        {overview && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            {[
              { l: 'AI Resolution · 24h', v: `${overview.ai_resolution_rate}%`, d: '▲ of resolved tickets', du: 'up' },
              { l: 'Open Tickets',        v: overview.open,                      d: `${overview.in_progress} in progress`, du: '' },
              { l: 'SLA Compliance',      v: `${overview.sla_compliance}%`,      d: `${overview.sla_breached > 0 ? '▼ ' + overview.sla_breached + ' breached' : '▲ all in SLA'}`, du: overview.sla_compliance >= 90 ? 'up' : 'dn' },
              { l: 'Avg Resolution',      v: '—',                                d: 'from resolved tickets', du: '' },
              { l: 'Engineers Active',    v: `${avail + busy}/${engineers.filter(e => e.is_active).length}`,
                d: <span className="row" style={{ gap: 6 }}>
                  <span className="dot dot-ok" />{avail}
                  <span className="dot dot-warn" />{busy}
                  <span className="dot dot-crit" />{away}
                </span>, du: '' },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: '14px 16px' }}>
                <div className="stat-lbl">{s.l}</div>
                <div className="stat-v">{s.v}</div>
                <div className={`stat-d ${s.du}`}>{s.d as any}</div>
              </div>
            ))}
          </div>
        )}

        {/* Map + Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12 }}>

          {/* Leaflet map */}
          <div className="card">
            <div className="c-head">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#174D38" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
              <h3>Global Load · Engineer Locations</h3>
              <span className="grow" />
              <span className="dot dot-ok pulse" />
              <span className="c-sub" style={{ marginLeft: 4 }}>LIVE</span>
              <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={fetchAll}>↻ Refresh</button>
            </div>
            <div style={{ padding: 12 }}>
              <div ref={mapRef} style={{ height: 300, borderRadius: 4, overflow: 'hidden', background: '#e8ede9' }} />
              {/* Map legend */}
              <div style={{ position: 'relative', marginTop: 8, display: 'flex', gap: 16, fontSize: 10, fontFamily: '"JetBrains Mono",monospace', textTransform: 'uppercase', letterSpacing: '.05em', color: '#6b6b6b' }}>
                {[{ c: '#174D38', l: 'Available' }, { c: '#8a5a00', l: 'Busy' }, { c: '#4D1717', l: 'Away' }].map(x => (
                  <span key={x.l} className="row" style={{ gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: x.c, display: 'inline-block' }} />
                    {x.l}
                  </span>
                ))}
              </div>
            </div>
            {/* Region bars */}
            <div style={{ padding: '8px 14px 12px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, borderTop: '1px solid #CBCBCB' }}>
              {[
                { n: 'APAC', engs: engineers.filter(e => e.region === 'India' || e.region === 'Asia Pacific') },
                { n: 'EMEA', engs: engineers.filter(e => e.region === 'Europe' || e.region === 'Middle East') },
                { n: 'AMER', engs: engineers.filter(e => e.region === 'US') },
              ].map(r => {
                const active = r.engs.filter(e => e.availability_status !== 'away').length
                const total  = r.engs.length || 1
                const pct    = active / total
                return (
                  <div key={r.n}>
                    <div className="row" style={{ marginBottom: 5 }}>
                      <span className="small" style={{ fontWeight: 600 }}>{r.n}</span>
                      <span className="grow" />
                      <span className="tiny mono muted">{active}/{total} eng</span>
                    </div>
                    <div className="bar">
                      <div className={`bar-f ${pct > 0.85 ? '' : pct > 0.5 ? '' : ''}`} style={{ width: `${pct * 100}%`, background: pct > 0.85 ? '#4D1717' : pct > 0.5 ? '#8a5a00' : '#174D38' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Live activity */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="c-head">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#174D38" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <h3>Live Activity</h3>
              <span className="grow" />
              <span className="c-sub">stream</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 360 }}>
              {tickets.slice(0, 15).map((t, i) => (
                <div key={i} style={{ padding: '8px 14px', borderBottom: '1px solid #f0f0f0', display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: 8, alignItems: 'center' }}>
                  <span className="tiny muted mono">{new Date(t.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  <div style={{ fontSize: 12, overflow: 'hidden' }}>
                    <div className="trunc"><b>{t.status === 'resolved' ? 'Resolved' : 'Ticket opened'}</b> · <span className="mono" style={{ color: '#174D38' }}>{t.ticket_number}</span></div>
                    <div className="tiny muted">{t.user_name} · {dLabel(t.domain)}</div>
                  </div>
                  <span className={`pill ${t.priority === 'critical' ? 'pill-crit' : t.priority === 'high' ? 'pill-warn' : 'pill-grn'}`}>{t.priority}</span>
                </div>
              ))}
              {tickets.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: '#6b6b6b', fontSize: 12 }}>No recent activity</div>
              )}
            </div>
          </div>
        </div>

        {/* At Risk + Volume chart */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* At risk tickets */}
          <div className="card">
            <div className="c-head">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4D1717" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <h3>SLA At Risk</h3>
              <span className="grow" />
              {atRisk.length > 0 && <span className="pill pill-crit">{atRisk.length} ACTIVE</span>}
            </div>
            <table className="dt">
              <thead><tr><th>ID</th><th>Issue</th><th>Engineer</th><th>Priority</th><th></th></tr></thead>
              <tbody>
                {atRisk.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#6b6b6b' }}>
                    <span className="dot dot-ok" style={{ marginRight: 6 }} />All tickets within SLA
                  </td></tr>
                ) : atRisk.slice(0, 5).map(t => (
                  <tr key={t.id} onClick={() => setRouteTkt(t)}>
                    <td className="mono" style={{ color: '#174D38', fontWeight: 600 }}>{t.ticket_number}</td>
                    <td style={{ maxWidth: 200 }}><div className="trunc">{t.title}</div></td>
                    <td className="small muted">{t.engineer_name || '—'}</td>
                    <td><span className={`pill ${t.priority === 'critical' ? 'pill-crit' : t.priority === 'high' ? 'pill-warn' : 'pill-grn'}`}>{t.priority}</span></td>
                    <td><button className="btn btn-sm" onClick={e => { e.stopPropagation(); setRouteTkt(t) }}>Routing</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Volume chart */}
          <div className="card">
            <div className="c-head">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#174D38" strokeWidth="2"><rect x="18" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="2" y="13" width="4" height="8"/></svg>
              <h3>Ticket Volume · last 24h</h3>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 110 }}>
                {bars.map((b, i) => (
                  <div key={i} style={{ flex: 1, height: `${(b / maxB) * 100}%`, background: i > 15 ? '#174D38' : '#CBCBCB', borderRadius: '2px 2px 0 0', minHeight: 2, transition: 'height .3s' }} />
                ))}
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <span className="tiny muted mono">00:00</span>
                <span className="grow" />
                <span className="tiny muted mono">NOW</span>
              </div>
              {overview && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                  {[
                    { l: 'This Week', v: overview.this_week },
                    { l: 'This Month', v: overview.this_month },
                    { l: 'Total', v: overview.total },
                  ].map((s, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div className="stat-lbl">{s.l}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: '"JetBrains Mono",monospace', letterSpacing: '-.02em', marginTop: 3 }}>{s.v}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Routing Modal */}
      {routeTkt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,20,.4)', zIndex: 100, display: 'grid', placeItems: 'center', backdropFilter: 'blur(2px)' }} onClick={() => setRouteTkt(null)}>
          <div className="ovw card" onClick={e => e.stopPropagation()} style={{ width: 820, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 32px rgba(0,0,0,.14)' }}>
            <div className="c-head" style={{ background: '#174D38', borderRadius: '6px 6px 0 0', borderBottom: 'none' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
              <h3 style={{ color: '#fff' }}>Routing Decision</h3>
              <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 11, color: 'rgba(255,255,255,.6)', marginLeft: 4 }}>· {routeTkt.ticket_number}</span>
              <span className="grow" />
              <button className="btn btn-sm btn-g" style={{ color: 'rgba(255,255,255,.7)' }} onClick={() => setRouteTkt(null)}>✕</button>
            </div>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #CBCBCB', background: '#EBEBEB', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span className="mono muted">{routeTkt.ticket_number}</span>
              <span style={{ fontWeight: 500 }}>{routeTkt.title}</span>
              <span className="grow" />
              <span className={`pill ${routeTkt.priority === 'critical' ? 'pill-crit' : routeTkt.priority === 'high' ? 'pill-warn' : 'pill-grn'}`}>{routeTkt.priority}</span>
            </div>
            <div style={{ overflow: 'auto', flex: 1 }}>
              <table className="dt">
                <thead><tr><th>#</th><th>Engineer</th><th>Region</th><th>Status</th><th title="Domain match">Domain</th><th title="Availability">Avail</th><th title="Workload">Load</th><th title="Timezone">TZ</th><th>Score</th></tr></thead>
                <tbody>
                  {engineers
                    .filter(e => e.is_active && e.is_activated)
                    .map(e => {
                      const dm = e.domain_expertise.includes(routeTkt.domain) ? 40 : 8
                      const av = e.availability_status === 'available' ? 20 : e.availability_status === 'busy' ? 8 : 0
                      const wl = Math.round(Math.max(0, 15 - (e.active_ticket_count / e.max_ticket_capacity) * 15))
                      const tz = 8
                      const total = dm + av + wl + tz
                      return { e, dm, av, wl, tz, total, excl: e.availability_status === 'away' }
                    })
                    .sort((a, b) => b.total - a.total)
                    .map((s, i) => (
                      <tr key={s.e.id} style={s.excl ? { opacity: 0.38 } : {}}>
                        <td className="mono muted">{i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 20, height: 20, borderRadius: 3, background: '#174D38', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                              {s.e.full_name.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500 }}>{s.e.full_name}</div>
                              <div className="tiny muted">{s.e.domain_expertise.map(d => dLabel(d)).join(', ')}</div>
                            </div>
                          </div>
                        </td>
                        <td className="small">{s.e.city}<div className="tiny muted">{s.e.region} · {s.e.timezone}</div></td>
                        <td>
                          <span className="row" style={{ gap: 5, fontSize: 12 }}>
                            <span className={`dot ${s.e.availability_status === 'available' ? 'dot-ok' : s.e.availability_status === 'busy' ? 'dot-warn' : 'dot-crit'}`} />
                            {s.e.availability_status}
                          </span>
                        </td>
                        <td className="mono small">{s.dm}</td>
                        <td className="mono small">{s.av}</td>
                        <td className="mono small">{s.wl}</td>
                        <td className="mono small">{s.tz}</td>
                        <td><span className={`sp ${i === 0 && !s.excl ? 'sp-top' : ''}`}>{s.excl ? '×' : s.total}</span></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '10px 14px', borderTop: '1px solid #CBCBCB', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="small muted mono">Weights: Domain 40 · Availability 20 · Load 15 · TZ 10 · Region 5 · Perf 5 · Score = 75</span>
              <span className="grow" />
              <button className="btn btn-sm" onClick={() => setRouteTkt(null)}>Close</button>
              <button className="btn btn-sm btn-p">Override assignment</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}