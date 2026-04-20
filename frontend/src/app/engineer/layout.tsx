// 'use client'
// // File: frontend/src/app/engineer/layout.tsx

// import { useEffect, useState } from 'react'
// import Link from 'next/link'
// import { usePathname } from 'next/navigation'

// const navItems = [
//   { href: '/engineer/dashboard',      label: 'Dashboard',      icon: '▣' },
//   { href: '/engineer/tickets',        label: 'My Tickets',     icon: '◉' },
//   { href: '/engineer/knowledge-base', label: 'Knowledge Base', icon: '◫' },
// ]

// export default function EngineerLayout({ children }: { children: React.ReactNode }) {
//   const pathname = usePathname()
//   const [fullName, setFullName] = useState('Engineer')
//   const [engineerId, setEngineerId] = useState('')
//   const [dark, setDark] = useState(true)
//   const [collapsed, setCollapsed] = useState(false)
//   const [mounted, setMounted] = useState(false)
//   const [availability, setAvailability] = useState('available')

//   useEffect(() => {
//     setMounted(true)
//     const name = localStorage.getItem('full_name')
//     const role = localStorage.getItem('role')
//     const savedTheme = localStorage.getItem('engineer_theme')
//     if (role !== 'engineer') window.location.replace('/auth/login')
//     if (name) setFullName(name)
//     if (savedTheme) setDark(savedTheme === 'dark')

//     // Fetch profile to get engineer ID and availability
//     const fetchProfile = async () => {
//       try {
//         const token = localStorage.getItem('access_token')
//         const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/engineer/profile`, {
//           headers: { Authorization: `Bearer ${token}` },
//         })
//         if (res.ok) {
//           const data = await res.json()
//           setEngineerId(data.engineer_id)
//           setAvailability(data.availability_status)
//           localStorage.setItem('engineer_id', data.engineer_id)
//         }
//       } catch {}
//     }
//     fetchProfile()
//   }, [])

//   const toggleTheme = () => {
//     const next = !dark
//     setDark(next)
//     localStorage.setItem('engineer_theme', next ? 'dark' : 'light')
//   }

//   const handleAvailability = async (status: string) => {
//     try {
//       const token = localStorage.getItem('access_token')
//       await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/engineer/availability`, {
//         method: 'PATCH',
//         headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
//         body: JSON.stringify({ status }),
//       })
//       setAvailability(status)
//     } catch {}
//   }

//   const handleLogout = () => {
//     localStorage.clear()
//     window.location.replace('/auth/login')
//   }

//   const t = {
//     bg:        dark ? '#0a0a0a' : '#F2F2F2',
//     sidebar:   dark ? '#0f0f0f' : '#ffffff',
//     topbar:    dark ? '#0f0f0f' : '#ffffff',
//     border:    dark ? 'rgba(255,255,255,0.07)' : '#CBCBCB',
//     text:      dark ? '#F2F2F2' : '#111111',
//     textMuted: dark ? 'rgba(242,242,242,0.4)'  : 'rgba(17,17,17,0.5)',
//     navHover:  dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
//     navActive: dark ? 'rgba(23,77,56,0.15)'    : 'rgba(23,77,56,0.08)',
//   }

//   const availColor = availability === 'available' ? '#4d9e78' : availability === 'busy' ? '#f97316' : '#6b7280'
//   const sidebarW = collapsed ? 64 : 240

//   if (!mounted) return null

//   return (
//     <div style={{ display: 'flex', minHeight: '100vh', background: t.bg, fontFamily: 'DM Sans, sans-serif', color: t.text, transition: 'background 0.3s' }}>

//       {/* ── Sidebar ── */}
//       <aside style={{
//         width: sidebarW, flexShrink: 0, background: t.sidebar,
//         borderRight: `1px solid ${t.border}`,
//         display: 'flex', flexDirection: 'column',
//         position: 'fixed', top: 0, left: 0, bottom: 0,
//         zIndex: 50, transition: 'width 0.25s ease', overflow: 'hidden',
//       }}>
//         {/* Logo */}
//         <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: collapsed ? '0' : '0 20px', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
//           <svg width="28" height="28" viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
//             <polygon points="16,2 30,9 30,23 16,30 2,23 2,9" fill="#174D38"/>
//             <circle cx="16" cy="16" r="4" fill="#4d9e78"/>
//           </svg>
//           {!collapsed && <span style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 600, color: t.text, whiteSpace: 'nowrap' }}>NexusDesk</span>}
//         </div>

//         {/* Engineer info */}
//         {!collapsed && (
//           <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
//             <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.textMuted, marginBottom: 4 }}>Engineer</div>
//             <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 4 }}>{fullName}</div>
//             {engineerId && <div style={{ fontSize: 11, color: '#4d9e78', fontFamily: 'monospace', marginBottom: 10 }}>{engineerId}</div>}

//             {/* Availability toggle */}
//             <div style={{ display: 'flex', gap: 4 }}>
//               {['available', 'busy', 'away'].map(s => (
//                 <button key={s} onClick={() => handleAvailability(s)} style={{
//                   flex: 1, padding: '4px 0', fontSize: 9,
//                   letterSpacing: '0.06em', textTransform: 'uppercase',
//                   background: availability === s ? (s === 'available' ? '#174D38' : s === 'busy' ? '#7c3d0e' : '#374151') : 'transparent',
//                   border: `1px solid ${availability === s ? (s === 'available' ? '#174D38' : s === 'busy' ? '#f97316' : '#6b7280') : t.border}`,
//                   color: availability === s ? '#F2F2F2' : t.textMuted,
//                   cursor: 'pointer', borderRadius: 2, fontFamily: 'inherit',
//                   transition: 'all 0.15s',
//                 }}>{s}</button>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* Nav */}
//         <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
//           {navItems.map(item => {
//             const active = pathname === item.href || pathname.startsWith(item.href + '/')
//             return (
//               <Link key={item.href} href={item.href} style={{
//                 display: 'flex', alignItems: 'center',
//                 gap: 12, padding: collapsed ? '11px 0' : '10px 20px',
//                 justifyContent: collapsed ? 'center' : 'flex-start',
//                 textDecoration: 'none',
//                 background: active ? t.navActive : 'transparent',
//                 borderLeft: active ? '2px solid #174D38' : '2px solid transparent',
//                 color: active ? '#174D38' : t.textMuted,
//                 fontSize: 13, fontWeight: active ? 600 : 400,
//                 transition: 'all 0.15s', marginBottom: 1,
//               }}
//                 onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = t.navHover }}
//                 onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
//               >
//                 <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
//                 {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
//               </Link>
//             )
//           })}
//         </nav>

//         {/* Bottom */}
//         <div style={{ borderTop: `1px solid ${t.border}`, padding: '8px 0', flexShrink: 0 }}>
//           {[
//             { icon: dark ? '☀️' : '🌙', label: dark ? 'Light Mode' : 'Dark Mode', action: toggleTheme, color: t.textMuted },
//             { icon: collapsed ? '→' : '←', label: collapsed ? 'Expand' : 'Collapse', action: () => setCollapsed(!collapsed), color: t.textMuted },
//             { icon: '⏻', label: 'Sign Out', action: handleLogout, color: '#a04040' },
//           ].map((btn, i) => (
//             <button key={i} onClick={btn.action} style={{
//               display: 'flex', alignItems: 'center', gap: 12,
//               padding: collapsed ? '10px 0' : '10px 20px',
//               justifyContent: collapsed ? 'center' : 'flex-start',
//               width: '100%', background: 'none', border: 'none',
//               color: btn.color, fontSize: 13, cursor: 'pointer',
//               transition: 'background 0.15s', fontFamily: 'DM Sans, sans-serif',
//             }}
//               onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = i === 2 ? 'rgba(77,23,23,0.1)' : t.navHover}
//               onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
//             >
//               <span style={{ fontSize: 14, flexShrink: 0 }}>{btn.icon}</span>
//               {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{btn.label}</span>}
//             </button>
//           ))}
//         </div>
//       </aside>

//       {/* ── Main ── */}
//       <main style={{ flex: 1, marginLeft: sidebarW, transition: 'margin-left 0.25s ease', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
//         {/* Topbar */}
//         <div style={{
//           height: 64, background: t.topbar,
//           borderBottom: `1px solid ${t.border}`,
//           display: 'flex', alignItems: 'center',
//           justifyContent: 'space-between',
//           padding: '0 32px', position: 'sticky', top: 0, zIndex: 40, flexShrink: 0,
//         }}>
//           <div style={{ fontSize: 14, fontWeight: 500, color: t.text }}>
//             {navItems.find(n => pathname === n.href || pathname.startsWith(n.href + '/'))?.label || 'Engineer Dashboard'}
//           </div>
//           <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
//             <div style={{ width: 7, height: 7, borderRadius: '50%', background: availColor, boxShadow: `0 0 6px ${availColor}` }}/>
//             <span style={{ fontSize: 12, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'capitalize' }}>{availability}</span>
//           </div>
//         </div>

//         {/* Page content */}
//         <div style={{ padding: '32px', flex: 1 }}>
//           {children}
//         </div>
//       </main>
//     </div>
//   )
// }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
  }