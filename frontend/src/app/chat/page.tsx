'use client'
// File: frontend/src/app/chat/page.tsx

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

interface Message {
  role: 'user' | 'assistant'
  content: string
  imagePreview?: string
  cnnResult?: CNNResult
  canEscalate?: boolean
  resolved?: boolean
}

interface CNNResult {
  cnn_label: string
  cnn_confidence: number
  cnn_domain: string
  cnn_severity: string
}

interface Ticket {
  id: string
  ticket_number: string
  title: string
  domain: string
  priority: string
  status: string
  engineer_name: string
  engineer_id: string
  engineer_city: string
  engineer_country: string
  engineer_timezone: string
  created_at: string
}

const API = process.env.NEXT_PUBLIC_API_URL

const priorityColor = (p: string) =>
  p === 'critical' ? '#ef4444' : p === 'high' ? '#f97316' : p === 'medium' ? '#eab308' : '#6b7280'

const statusColor = (s: string) =>
  s === 'resolved' ? '#4d9e78' : s === 'in_progress' ? '#3b82f6' : s === 'open' ? '#f97316' : '#6b7280'

const severityColor = (s: string) =>
  s === 'critical' ? '#ef4444' : s === 'high' ? '#f97316' : s === 'medium' ? '#eab308' : '#4d9e78'

const domainLabel = (d: string) => ({
  networking: 'Networking', hardware: 'Hardware', software: 'Software',
  security: 'Security', email_communication: 'Email & Communication',
  identity_access: 'Identity & Access', database: 'Database',
  cloud: 'Cloud', infrastructure: 'Infrastructure', devops: 'DevOps',
  erp_business_apps: 'ERP & Business Apps', endpoint_management: 'Endpoint Management',
  other: 'Other',
}[d] || d)

function LiveTime({ timezone }: { timezone: string }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i) }, [])
  try { return <span>{now.toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true })}</span> }
  catch { return <span>—</span> }
}

function TypingIndicator({ dark }: { dark: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, padding: '4px 0' }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #174D38, #0d2e1f)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(23,77,56,0.4)' }}>
        <svg width="14" height="14" viewBox="0 0 32 32"><polygon points="16,2 30,9 30,23 16,30 2,23 2,9" fill="rgba(242,242,242,0.95)"/></svg>
      </div>
      <div style={{ padding: '14px 20px', background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`, borderRadius: '4px 20px 20px 20px', display: 'flex', gap: 6, alignItems: 'center' }}>
        {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#4d9e78', animation: `bounce 1.4s ${i*0.18}s ease-in-out infinite` }}/>)}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [messages, setMessages]         = useState<Message[]>([])
  const [input, setInput]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [uploading, setUploading]       = useState(false)
  const [sessionId, setSessionId]       = useState<string | null>(null)
  const [intent, setIntent]             = useState<'solve' | 'service_request' | null>(null)
  const [showEscalate, setShowEscalate] = useState(false)
  const [tickets, setTickets]           = useState<Ticket[]>([])
  const [view, setView]                 = useState<'chat' | 'tickets'>('chat')
  const [fullName, setFullName]         = useState('there')
  const [dark, setDark]                 = useState(true)
  const [escalating, setEscalating]     = useState(false)
  const [lastDomain, setLastDomain]     = useState('other')
  const [lastSeverity, setLastSeverity] = useState('medium')
  const [escalateForm, setEscalateForm] = useState({ title: '', description: '', steps_tried: '' })
  const [mounted, setMounted]           = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const bottomRef    = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('access_token')
    return { Authorization: `Bearer ${token}` }
  }, [])

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem('access_token')
    window.location.replace('/auth/login')
  }, [])

  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } })
    if (res.status === 401) { handleUnauthorized(); throw new Error('Unauthorized') }
    return res
  }, [authHeaders, handleUnauthorized])

  useEffect(() => {
    setMounted(true)
    const name = localStorage.getItem('full_name')
    const role = localStorage.getItem('role')
    const theme = localStorage.getItem('chat_theme')
    if (role !== 'user') { window.location.replace('/auth/login'); return }
    if (name) setFullName(name.split(' ')[0])
    setDark(theme !== 'light')
    fetchTickets()
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading, uploading])

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API}/api/v1/chat/tickets`, { headers: authHeaders() })
      if (res.status === 401) return
      if (res.ok) setTickets(await res.json())
    } catch {}
  }

  const toggleTheme = () => { const n = !dark; setDark(n); localStorage.setItem('chat_theme', n ? 'dark' : 'light') }

  const ensureSession = (): string => {
    if (sessionId) return sessionId
    const id = crypto.randomUUID()
    setSessionId(id)
    return id
  }

  const startChat = (sel: 'solve' | 'service_request') => {
    setIntent(sel)
    setMessages([{ role: 'assistant', content: sel === 'service_request' ? "Sure, tell me what you need. I can help with software installations, hardware requests, access setup, or any other IT service." : "I am here to help. Describe your issue or upload a screenshot and I will take a look." }])
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    const sid = ensureSession()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)
    try {
      const res = await apiFetch(`${API}/api/v1/chat/message`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, session_id: sid, intent }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed')
      if (data.detected_domain && data.detected_domain !== 'other') setLastDomain(data.detected_domain)
      if (data.detected_severity) setLastSeverity(data.detected_severity)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, canEscalate: data.can_escalate, resolved: data.resolved }])
      if (data.can_escalate) {
        const domain = data.detected_domain && data.detected_domain !== 'other' ? data.detected_domain : lastDomain
        setEscalateForm({
          title: `${domainLabel(domain)} issue — ${new Date().toLocaleDateString()}`,
          description: [...messages.filter(m => m.role === 'user').map(m => m.content), userMsg].join('\n'),
          steps_tried: '',
        })
      }
    } catch (e: any) {
      if (e.message !== 'Unauthorized') setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong on my end. Please try again.' }])
    } finally { setLoading(false) }
  }

  const handleScreenshot = async (file: File) => {
    if (!file) return
    const sid = ensureSession()
    setUploading(true)
    const imagePreview = await new Promise<string>(resolve => { const r = new FileReader(); r.onload = e => resolve(e.target?.result as string); r.readAsDataURL(file) })
    setMessages(prev => [...prev, { role: 'user', content: '', imagePreview }])
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('session_id', sid)
      const res = await apiFetch(`${API}/api/v1/chat/upload-screenshot`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed')
      if (data.cnn_domain && data.cnn_domain !== 'other') setLastDomain(data.cnn_domain)
      if (data.cnn_severity) setLastSeverity(data.cnn_severity)
      setMessages(prev => [...prev, { role: 'assistant', content: data.display_text, cnnResult: { cnn_label: data.cnn_label, cnn_confidence: data.cnn_confidence, cnn_domain: data.cnn_domain, cnn_severity: data.cnn_severity } }])
    } catch (e: any) {
      if (e.message !== 'Unauthorized') setMessages(prev => [...prev, { role: 'assistant', content: 'Could not analyze the screenshot. Please describe what you are seeing.' }])
    } finally { setUploading(false) }
  }

  const handleEscalate = async () => {
    if (!escalateForm.title || !escalateForm.description) return
    setEscalating(true)
    try {
      const res = await apiFetch(`${API}/api/v1/chat/escalate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, title: escalateForm.title, description: escalateForm.description, domain: lastDomain, priority: lastSeverity === 'critical' ? 'critical' : lastSeverity === 'high' ? 'high' : 'medium', steps_tried: escalateForm.steps_tried }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed')
      setMessages(prev => [...prev, { role: 'assistant', content: `Ticket ${data.ticket_number} has been created and assigned to an engineer. You can track it in the Tickets tab.` }])
      setShowEscalate(false); setSessionId(null); setIntent(null)
      fetchTickets()
    } catch (err: any) { if (err.message !== 'Unauthorized') alert(err.message) }
    finally { setEscalating(false) }
  }

  const resetChat = () => { setMessages([]); setIntent(null); setSessionId(null); setShowEscalate(false); setInput('') }

  const T = {
    bg: dark ? '#080808' : '#f4f3ef', sidebar: dark ? '#0c0c0c' : '#fafaf8',
    card: dark ? '#121212' : '#ffffff', cardHover: dark ? '#1a1a1a' : '#f5f4f0',
    border: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    text: dark ? '#ede8e0' : '#1a1a1a', muted: dark ? 'rgba(237,232,224,0.38)' : 'rgba(26,26,26,0.42)',
    inputBg: dark ? 'rgba(255,255,255,0.04)' : '#ffffff',
    aiBg: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
    aiBorder: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    green: '#174D38', greenLight: '#4d9e78',
    accent: dark ? 'rgba(23,77,56,0.18)' : 'rgba(23,77,56,0.08)',
  }

  const inp = { width: '100%', padding: '11px 16px', background: dark ? 'rgba(255,255,255,0.04)' : '#f7f6f2', border: `1px solid ${T.border}`, color: T.text, fontSize: 13, outline: 'none', borderRadius: 4, fontFamily: '"DM Sans", sans-serif' } as React.CSSProperties

  if (!mounted) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;background:${T.bg}}
        @keyframes bounce{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-7px);opacity:1}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .msg{animation:fadeUp .28s ease forwards}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:${dark?'rgba(255,255,255,.08)':'rgba(0,0,0,.1)'};border-radius:2px}
        .nav-item{transition:all .15s ease;border-left:2px solid transparent}
        .nav-item:hover{background:${T.accent}!important}
        .nav-item.active{border-left-color:${T.green}!important;background:${T.accent}!important;color:${T.greenLight}!important}
        .entry-card{transition:all .22s cubic-bezier(.34,1.56,.64,1)}
        .entry-card:hover{transform:translateY(-4px)!important;border-color:rgba(23,77,56,.45)!important;box-shadow:0 16px 48px rgba(23,77,56,.14)!important}
        .chat-input:focus{border-color:${T.green}!important;box-shadow:0 0 0 3px rgba(23,77,56,.1)}
        .send-btn:hover:not(:disabled){background:#1e6645!important;transform:translateY(-1px);box-shadow:0 4px 16px rgba(23,77,56,.35)!important}
        .upload-btn:hover:not(:disabled){border-color:${T.greenLight}!important;background:${T.accent}!important;color:${T.greenLight}!important}
        .ticket-card{transition:all .15s ease;cursor:pointer}
        .ticket-card:hover{border-color:rgba(23,77,56,.3)!important;transform:translateY(-1px);box-shadow:0 4px 20px rgba(0,0,0,.15)!important}
        .ticket-card.selected{border-color:rgba(23,77,56,.5)!important;box-shadow:0 0 0 1px rgba(23,77,56,.3)!important}
      `}</style>

      <div style={{ height: '100vh', display: 'flex', fontFamily: '"DM Sans",sans-serif', background: T.bg, color: T.text, overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside style={{ width: 256, flexShrink: 0, background: T.sidebar, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '28px 22px 22px', borderBottom: `1px solid ${T.border}` }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 22 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#174D38,#0d2e1f)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(23,77,56,.35)', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 32 32"><polygon points="16,2 30,9 30,23 16,30 2,23 2,9" fill="none" stroke="rgba(242,242,242,.9)" strokeWidth="2"/><circle cx="16" cy="16" r="4.5" fill="#4d9e78"/></svg>
              </div>
              <span style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 21, fontWeight: 600, color: T.text, letterSpacing: '0.01em' }}>NexusDesk</span>
            </Link>
            <div style={{ padding: '12px 14px', background: T.accent, borderRadius: 6, border: '1px solid rgba(23,77,56,.2)' }}>
              <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: T.greenLight, marginBottom: 5, fontWeight: 600 }}>Signed in</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{fullName}</div>
            </div>
          </div>
          <nav style={{ padding: '14px 10px', flex: 1 }}>
            {[
              { id: 'chat', label: 'AI Support', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
              { id: 'tickets', label: 'My Tickets', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>, badge: tickets.filter(t => t.status !== 'resolved').length || null },
            ].map(item => (
              <button key={item.id} className={`nav-item ${view===item.id?'active':''}`} onClick={() => setView(item.id as any)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', width: '100%', background: 'transparent', border: 'none', borderLeft: '2px solid transparent', color: view===item.id?T.greenLight:T.muted, fontSize: 13, fontWeight: view===item.id?600:400, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', borderRadius: '0 6px 6px 0', marginBottom: 2 }}>
                {item.icon}<span style={{ flex: 1 }}>{item.label}</span>
                {(item as any).badge ? <span style={{ fontSize: 10, padding: '2px 7px', background: '#4D1717', color: '#F2F2F2', borderRadius: 20, fontWeight: 700 }}>{(item as any).badge}</span> : null}
              </button>
            ))}
          </nav>
          <div style={{ borderTop: `1px solid ${T.border}`, padding: '10px' }}>
            <button onClick={toggleTheme} className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', width: '100%', background: 'none', border: 'none', color: T.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 6, marginBottom: 2 }}>
              {dark ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>}
              <span>{dark?'Light Mode':'Dark Mode'}</span>
            </button>
            <button onClick={() => { localStorage.clear(); window.location.replace('/auth/login') }} className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', width: '100%', background: 'none', border: 'none', color: '#a04040', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: T.bg }}>
          {/* Topbar */}
          <header style={{ height: 58, background: T.sidebar, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: T.greenLight, boxShadow: `0 0 8px ${T.greenLight}`, animation: 'pulse 2s ease-in-out infinite' }}/>
              <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{view==='chat'?'AI Support Chat':'My Tickets'}</span>
            </div>
            <span style={{ fontSize: 11, color: T.muted, letterSpacing: '0.05em', fontStyle: 'italic' }}>Claude AI · CNN Online</span>
          </header>

          {/* CHAT VIEW */}
          {view === 'chat' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '36px 32px' }}>
                <div style={{ maxWidth: 700, margin: '0 auto' }}>
                  {/* Entry */}
                  {!intent && messages.length === 0 && (
                    <div style={{ paddingTop: 32, animation: 'fadeUp .5s ease' }}>
                      <div style={{ marginBottom: 56, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 300, height: 200, background: 'radial-gradient(ellipse,rgba(23,77,56,.15) 0%,transparent 70%)', pointerEvents: 'none' }}/>
                        <div style={{ textAlign: 'center', position: 'relative' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 72, borderRadius: 18, background: 'linear-gradient(135deg,#174D38,#0d2e1f)', marginBottom: 24, boxShadow: '0 12px 40px rgba(23,77,56,.35)', position: 'relative' }}>
                            <svg width="32" height="32" viewBox="0 0 32 32"><polygon points="16,2 30,9 30,23 16,30 2,23 2,9" fill="none" stroke="rgba(242,242,242,.85)" strokeWidth="1.5"/><circle cx="16" cy="16" r="5.5" fill="#4d9e78"/></svg>
                            <div style={{ position: 'absolute', inset: -4, borderRadius: 22, border: '1px solid rgba(23,77,56,.3)', animation: 'pulse 2s ease-in-out infinite' }}/>
                          </div>
                          <h1 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 38, fontWeight: 500, color: T.text, marginBottom: 12, lineHeight: 1.1 }}>How can I help,<br/><em style={{ fontStyle: 'italic', color: T.greenLight }}>{fullName}?</em></h1>
                          <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.75, maxWidth: 380, margin: '0 auto' }}>Describe your issue or upload a screenshot. I will diagnose it and guide you through a fix.</p>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {[
                          { intent: 'solve' as const, icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.greenLight} strokeWidth="1.6"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>, title: 'Solve a Problem', desc: 'Diagnose and fix technical issues with AI guidance. Upload screenshots for instant CNN detection.', tag: 'AI + CNN' },
                          { intent: 'service_request' as const, icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.greenLight} strokeWidth="1.6"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>, title: 'Service Request', desc: 'Request software, hardware, access setup, or any other IT service from your team.', tag: 'Request' },
                        ].map(opt => (
                          <button key={opt.intent} className="entry-card" onClick={() => startChat(opt.intent)} style={{ padding: '28px 26px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#174D38,transparent)' }}/>
                            <div style={{ marginBottom: 16 }}>{opt.icon}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <span style={{ fontSize: 15, fontWeight: 600, color: T.text, fontFamily: '"Cormorant Garamond",serif' }}>{opt.title}</span>
                              <span style={{ fontSize: 9, padding: '2px 7px', background: T.accent, color: T.greenLight, borderRadius: 3, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>{opt.tag}</span>
                            </div>
                            <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.65 }}>{opt.desc}</p>
                            <div style={{ marginTop: 18, fontSize: 12, color: T.greenLight, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>Get started <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  {messages.map((msg, i) => (
                    <div key={i} className="msg" style={{ display: 'flex', justifyContent: msg.role==='user'?'flex-end':'flex-start', marginBottom: 22, alignItems: 'flex-end', gap: 10 }}>
                      {msg.role === 'assistant' && (
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#174D38,#0d2e1f)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(23,77,56,.35)' }}>
                          <svg width="14" height="14" viewBox="0 0 32 32"><polygon points="16,2 30,9 30,23 16,30 2,23 2,9" fill="rgba(242,242,242,.9)"/></svg>
                        </div>
                      )}
                      <div style={{ maxWidth: '76%' }}>
                        {msg.imagePreview && (
                          <div style={{ marginBottom: msg.content?6:0, borderRadius: '16px 4px 4px 16px', overflow: 'hidden', border: '2px solid rgba(23,77,56,.35)', boxShadow: '0 4px 20px rgba(23,77,56,.25)', maxWidth: 340 }}>
                            <img src={msg.imagePreview} alt="Screenshot" style={{ width: '100%', display: 'block', maxHeight: 220, objectFit: 'cover' }}/>
                          </div>
                        )}
                        {(msg.content || msg.role==='assistant') && (
                          <div style={{ padding: msg.role==='user'?'12px 18px':'15px 20px', background: msg.role==='user'?'linear-gradient(135deg,#174D38,#0f3324)':T.aiBg, color: msg.role==='user'?'#ede8e0':T.text, borderRadius: msg.role==='user'?'18px 4px 18px 18px':'4px 18px 18px 18px', fontSize: 14, lineHeight: 1.75, whiteSpace: 'pre-wrap', border: msg.role==='assistant'?`1px solid ${T.aiBorder}`:'none', boxShadow: msg.role==='user'?'0 4px 18px rgba(23,77,56,.3)':'none' }}>
                            {msg.content}
                            {msg.cnnResult && msg.cnnResult.cnn_confidence > 0 && (
                              <div style={{ marginTop: 12, padding: '12px 14px', background: dark?'rgba(23,77,56,.12)':'rgba(23,77,56,.07)', border: '1px solid rgba(23,77,56,.25)', borderRadius: 8 }}>
                                <div style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: T.greenLight, marginBottom: 7, fontWeight: 700 }}>CNN Detection</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>{msg.cnnResult.cnn_label}</div>
                                <div style={{ display: 'flex', gap: 5 }}>
                                  <span style={{ fontSize: 10, padding: '3px 8px', background: `${severityColor(msg.cnnResult.cnn_severity)}18`, color: severityColor(msg.cnnResult.cnn_severity), borderRadius: 3, fontWeight: 700, textTransform: 'uppercase' }}>{msg.cnnResult.cnn_severity}</span>
                                  <span style={{ fontSize: 10, padding: '3px 8px', background: dark?'rgba(255,255,255,.06)':'rgba(0,0,0,.05)', color: T.muted, borderRadius: 3 }}>{msg.cnnResult.cnn_domain?.replace(/_/g,' ')}</span>
                                  <span style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(77,158,120,.12)', color: T.greenLight, borderRadius: 3 }}>{Math.round(msg.cnnResult.cnn_confidence*100)}% confidence</span>
                                </div>
                              </div>
                            )}
                            {msg.resolved && <button onClick={resetChat} style={{ display: 'block', marginTop: 14, padding: '8px 18px', background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.18)', color: '#ede8e0', fontSize: 12, cursor: 'pointer', borderRadius: 6, fontFamily: 'inherit' }}>Start New Chat</button>}
                            {msg.canEscalate && !showEscalate && <button onClick={() => setShowEscalate(true)} style={{ display: 'block', marginTop: 14, padding: '10px 20px', background: 'linear-gradient(135deg,rgba(77,23,23,.9),rgba(60,15,15,.9))', border: '1px solid rgba(200,60,60,.3)', color: '#ede8e0', fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 8, fontFamily: 'inherit' }}>Raise Support Ticket →</button>}
                          </div>
                        )}
                      </div>
                      {msg.role==='user' && <div style={{ width: 34, height: 34, borderRadius: '50%', background: dark?'rgba(237,232,224,.08)':'rgba(0,0,0,.07)', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color: T.muted }}>{fullName.charAt(0).toUpperCase()}</div>}
                    </div>
                  ))}

                  {(loading||uploading) && <TypingIndicator dark={dark}/>}

                  {/* Escalate form */}
                  {showEscalate && (
                    <div className="msg" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden', marginTop: 8 }}>
                      <div style={{ background: 'linear-gradient(135deg,#4D1717,#2d0c0c)', padding: '18px 22px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.03)' }}/>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#ede8e0', marginBottom: 3, fontFamily: '"Cormorant Garamond",serif' }}>Raise Support Ticket</div>
                        <div style={{ fontSize: 12, color: 'rgba(237,232,224,.55)' }}>An engineer will be assigned based on your issue domain and timezone.</div>
                      </div>
                      <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {[{label:'Title',key:'title',type:'input'},{label:'Description',key:'description',type:'textarea'},{label:'Steps Already Tried',key:'steps_tried',type:'textarea',placeholder:'Optional — what have you already attempted?'}].map(field => (
                          <div key={field.key}>
                            <label style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 7, display: 'block', fontWeight: 600 }}>{field.label}</label>
                            {field.type==='input' ? <input style={inp} value={(escalateForm as any)[field.key]} onChange={e => setEscalateForm(f=>({...f,[field.key]:e.target.value}))}/>
                              : <textarea style={{...inp,minHeight:76,resize:'vertical'}} value={(escalateForm as any)[field.key]} onChange={e => setEscalateForm(f=>({...f,[field.key]:e.target.value}))} placeholder={(field as any).placeholder}/>}
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                          <button onClick={() => setShowEscalate(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, fontSize: 13, cursor: 'pointer', borderRadius: 6, fontFamily: 'inherit' }}>Cancel</button>
                          <button onClick={handleEscalate} disabled={escalating} style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg,#4D1717,#2d0c0c)', color: '#ede8e0', border: 'none', fontSize: 13, fontWeight: 600, cursor: escalating?'not-allowed':'pointer', borderRadius: 6, fontFamily: 'inherit' }}>
                            {escalating?'Creating ticket...':'Confirm — Create Ticket →'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef}/>
                </div>
              </div>

              {/* Input bar */}
              {intent && !showEscalate && (
                <div style={{ padding: '16px 32px 22px', background: T.sidebar, borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
                  <div style={{ maxWidth: 700, margin: '0 auto' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button className="upload-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', background: dark?'rgba(255,255,255,.04)':'#f4f3ef', border: `1px solid ${T.border}`, borderRadius: 8, cursor: 'pointer', color: T.muted, flexShrink: 0, transition: 'all .2s' }}>
                        {uploading ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{animation:'pulse 1s infinite'}}><circle cx="12" cy="12" r="10"/></svg>
                          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>}
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if(f) handleScreenshot(f); e.target.value='' }}/>
                      <input ref={inputRef} className="chat-input" style={{ flex: 1, height: 46, padding: '0 18px', background: T.inputBg, border: `1px solid ${T.border}`, color: T.text, fontSize: 14, borderRadius: 8, fontFamily: '"DM Sans",sans-serif', outline: 'none', transition: 'border-color .2s,box-shadow .2s' }} placeholder="Describe your issue..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendMessage()} disabled={loading}/>
                      <button className="send-btn" onClick={sendMessage} disabled={loading||!input.trim()} style={{ width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', background: !input.trim()||loading?(dark?'rgba(23,77,56,.2)':'rgba(23,77,56,.12)'):'linear-gradient(135deg,#174D38,#0f3324)', border: 'none', borderRadius: 8, cursor: !input.trim()||loading?'not-allowed':'pointer', flexShrink: 0, transition: 'all .2s', boxShadow: input.trim()&&!loading?'0 4px 14px rgba(23,77,56,.3)':'none' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={!input.trim()||loading?T.muted:'#ede8e0'} strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 2px' }}>
                      <span style={{ fontSize: 11, color: T.muted, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                        Upload screenshot for instant CNN detection
                      </span>
                      <button onClick={resetChat} style={{ fontSize: 11, color: T.muted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>New Chat ↺</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TICKETS VIEW ── */}
          {view === 'tickets' && (
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

              {/* Ticket list */}
              <div style={{ width: selectedTicket ? 400 : '100%', borderRight: selectedTicket ? `1px solid ${T.border}` : 'none', overflowY: 'auto', padding: '32px 24px', transition: 'width .2s' }}>
                <div style={{ marginBottom: 28 }}>
                  <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 28, fontWeight: 500, color: T.text, marginBottom: 6 }}>My Tickets</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 13, color: T.muted }}>{tickets.length} total</span>
                    {tickets.filter(t => t.status !== 'resolved').length > 0 && (
                      <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(77,23,23,.2)', color: '#f87171', borderRadius: 4, fontWeight: 600 }}>
                        {tickets.filter(t => t.status !== 'resolved').length} open
                      </span>
                    )}
                  </div>
                </div>

                {tickets.length === 0 ? (
                  <div style={{ padding: '56px 32px', textAlign: 'center', background: T.card, border: `1px solid ${T.border}`, borderRadius: 12 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: T.accent, border: '1px solid rgba(23,77,56,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.greenLight} strokeWidth="1.6"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 8, fontFamily: '"Cormorant Garamond",serif' }}>No tickets yet</div>
                    <div style={{ fontSize: 13, color: T.muted, marginBottom: 24 }}>Start a support chat to create your first ticket.</div>
                    <button onClick={() => setView('chat')} style={{ padding: '11px 28px', background: 'linear-gradient(135deg,#174D38,#0f3324)', color: '#ede8e0', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 8, fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(23,77,56,.3)' }}>Start Chat →</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {tickets.map(ticket => (
                      <div key={ticket.id} className={`ticket-card ${selectedTicket?.id===ticket.id?'selected':''}`}
                        onClick={() => setSelectedTicket(selectedTicket?.id===ticket.id?null:ticket)}
                        style={{ background: T.card, border: `1px solid ${selectedTicket?.id===ticket.id?'rgba(23,77,56,.4)':T.border}`, borderLeft: `3px solid ${priorityColor(ticket.priority)}`, borderRadius: 10, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
                        {/* Top gradient line for selected */}
                        {selectedTicket?.id===ticket.id && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,rgba(23,77,56,.6),transparent)' }}/>}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: T.greenLight, fontFamily: 'monospace', letterSpacing: '.06em' }}>{ticket.ticket_number}</span>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <span style={{ fontSize: 9, padding: '2px 8px', background: `${priorityColor(ticket.priority)}18`, color: priorityColor(ticket.priority), borderRadius: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{ticket.priority}</span>
                            <span style={{ fontSize: 9, padding: '2px 8px', background: `${statusColor(ticket.status)}18`, color: statusColor(ticket.status), borderRadius: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>{ticket.status.replace('_',' ')}</span>
                          </div>
                        </div>

                        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6, fontFamily: '"Cormorant Garamond",serif', lineHeight: 1.3 }}>{ticket.title}</div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                          <span style={{ fontSize: 11, padding: '2px 8px', background: T.accent, color: T.greenLight, borderRadius: 3, textTransform: 'capitalize' }}>{domainLabel(ticket.domain)}</span>
                          <span style={{ fontSize: 11, color: T.muted }}>{new Date(ticket.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
                        </div>

                        {ticket.engineer_name ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: T.accent, border: '1px solid rgba(23,77,56,.15)', borderRadius: 6 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#174D38,#0d2e1f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#ede8e0', flexShrink: 0 }}>{ticket.engineer_name.charAt(0)}</div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                                {ticket.engineer_name}
                                <span style={{ color: T.greenLight, fontFamily: 'monospace', fontSize: 10 }}>{ticket.engineer_id}</span>
                              </div>
                              <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>
                                {ticket.engineer_city && ticket.engineer_country ? `${ticket.engineer_city}, ${ticket.engineer_country}` : ''}
                                {ticket.engineer_timezone && <span style={{ color: T.greenLight, marginLeft: 6 }}>· <LiveTime timezone={ticket.engineer_timezone}/> local</span>}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: T.muted, fontStyle: 'italic', padding: '6px 0' }}>Finding available engineer...</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ticket detail panel */}
              {selectedTicket && (
                <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
                  {/* Panel header */}
                  <div style={{ padding: '24px 28px', borderBottom: `1px solid ${T.border}`, background: T.sidebar, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, zIndex: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.greenLight, fontFamily: 'monospace', letterSpacing: '.06em', marginBottom: 6 }}>{selectedTicket.ticket_number}</div>
                      <div style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 20, fontWeight: 500, color: T.text, lineHeight: 1.3, maxWidth: 360 }}>{selectedTicket.title}</div>
                    </div>
                    <button onClick={() => setSelectedTicket(null)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 20, padding: '0 4px', lineHeight: 1 }}>×</button>
                  </div>

                  <div style={{ padding: '28px' }}>

                    {/* Status row */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, padding: '4px 12px', background: `${statusColor(selectedTicket.status)}18`, color: statusColor(selectedTicket.status), borderRadius: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{selectedTicket.status.replace('_',' ')}</span>
                      <span style={{ fontSize: 11, padding: '4px 12px', background: `${priorityColor(selectedTicket.priority)}18`, color: priorityColor(selectedTicket.priority), borderRadius: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{selectedTicket.priority}</span>
                      <span style={{ fontSize: 11, padding: '4px 12px', background: T.accent, color: T.greenLight, borderRadius: 4, textTransform: 'capitalize' }}>{domainLabel(selectedTicket.domain)}</span>
                    </div>

                    {/* Assigned Engineer */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: T.muted, marginBottom: 12, fontWeight: 600 }}>Assigned Engineer</div>
                      {selectedTicket.engineer_name ? (
                        <div style={{ padding: '18px 20px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                            <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#174D38,#0d2e1f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#ede8e0', flexShrink: 0, boxShadow: '0 4px 14px rgba(23,77,56,.3)' }}>{selectedTicket.engineer_name.charAt(0)}</div>
                            <div>
                              <div style={{ fontSize: 16, fontWeight: 600, color: T.text, fontFamily: '"Cormorant Garamond",serif', marginBottom: 3 }}>{selectedTicket.engineer_name}</div>
                              <div style={{ fontSize: 12, color: T.greenLight, fontFamily: 'monospace' }}>{selectedTicket.engineer_id}</div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={{ padding: '12px 14px', background: dark?'rgba(255,255,255,.03)':'rgba(0,0,0,.025)', borderRadius: 8, border: `1px solid ${T.border}` }}>
                              <div style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 5, fontWeight: 600 }}>Location</div>
                              <div style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>
                                {selectedTicket.engineer_city && selectedTicket.engineer_country
                                  ? `${selectedTicket.engineer_city}, ${selectedTicket.engineer_country}`
                                  : 'Not specified'}
                              </div>
                            </div>
                            <div style={{ padding: '12px 14px', background: dark?'rgba(255,255,255,.03)':'rgba(0,0,0,.025)', borderRadius: 8, border: `1px solid ${T.border}` }}>
                              <div style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 5, fontWeight: 600 }}>Local Time</div>
                              <div style={{ fontSize: 20, fontWeight: 600, color: T.greenLight, fontFamily: '"Cormorant Garamond",serif' }}>
                                {selectedTicket.engineer_timezone ? <LiveTime timezone={selectedTicket.engineer_timezone}/> : '—'}
                              </div>
                              <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{selectedTicket.engineer_timezone}</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '20px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, textAlign: 'center', color: T.muted, fontSize: 13, fontStyle: 'italic' }}>Finding the best available engineer...</div>
                      )}
                    </div>

                    {/* Ticket metadata */}
                    <div style={{ padding: '16px 18px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                      <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: T.muted, marginBottom: 14, fontWeight: 600 }}>Ticket Details</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          { label: 'Created', value: new Date(selectedTicket.created_at).toLocaleString('en-US',{month:'long',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}) },
                          { label: 'Domain', value: domainLabel(selectedTicket.domain) },
                          { label: 'Priority', value: selectedTicket.priority.charAt(0).toUpperCase()+selectedTicket.priority.slice(1) },
                          { label: 'Status', value: selectedTicket.status.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase()) },
                        ].map(row => (
                          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: `1px solid ${T.border}` }}>
                            <span style={{ fontSize: 12, color: T.muted }}>{row.label}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  )
}