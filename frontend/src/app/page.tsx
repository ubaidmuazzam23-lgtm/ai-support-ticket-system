// File: frontend/src/app/page.tsx

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function LandingPage() {
  const [dark, setDark] = useState(true)
  const [scrollY, setScrollY] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [heroVisible, setHeroVisible] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTimeout(() => setHeroVisible(true), 120)
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const t = {
    bg:        dark ? '#0a0a0a' : '#F2F2F2',
    bgAlt:     dark ? '#111111' : '#ffffff',
    bgCard:    dark ? '#141414' : '#ffffff',
    bgCard2:   dark ? '#1a1a1a' : '#f4f4f4',
    text:      dark ? '#F2F2F2' : '#111111',
    textMuted: dark ? 'rgba(242,242,242,0.45)' : 'rgba(17,17,17,0.5)',
    textFaint: dark ? 'rgba(242,242,242,0.18)' : 'rgba(17,17,17,0.2)',
    border:    dark ? 'rgba(255,255,255,0.07)' : '#CBCBCB',
    borderHov: dark ? 'rgba(255,255,255,0.2)'  : '#888',
    navBg:     dark ? 'rgba(10,10,10,0.9)'     : 'rgba(242,242,242,0.9)',
    green:     '#174D38',
    greenL:    '#4d9e78',
    crimson:   '#4D1717',
  }

  const navScrolled = scrollY > 50
  if (!mounted) return null

  return (
    <div style={{ background: t.bg, fontFamily: "'DM Sans', sans-serif", color: t.text, overflowX: 'hidden', transition: 'background 0.4s, color 0.4s' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: 64, padding: '0 56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: navScrolled ? t.navBg : 'transparent',
        backdropFilter: navScrolled ? 'blur(24px)' : 'none',
        borderBottom: navScrolled ? `1px solid ${t.border}` : '1px solid transparent',
        transition: 'all 0.35s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="30" height="30" viewBox="0 0 32 32"><polygon points="16,2 30,9 30,23 16,30 2,23 2,9" fill="#174D38"/><circle cx="16" cy="16" r="4" fill="#4d9e78"/></svg>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 21, fontWeight: 600, color: t.text, letterSpacing: '0.03em' }}>NexusDesk</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setDark(!dark)} style={{
            width: 42, height: 24, background: dark ? '#174D38' : '#CBCBCB',
            border: 'none', borderRadius: 999, cursor: 'pointer',
            position: 'relative', transition: 'background 0.3s', marginRight: 10,
          }}>
            <div style={{
              position: 'absolute', top: 2, left: dark ? 20 : 2,
              width: 20, height: 20, borderRadius: '50%', background: '#F2F2F2',
              transition: 'left 0.3s', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{dark ? '🌙' : '☀️'}</div>
          </button>
          <Link href="/auth/login" style={{ padding: '8px 20px', color: t.textMuted, textDecoration: 'none', fontSize: 14, transition: 'color 0.2s' }}
            onMouseEnter={e => (e.target as HTMLElement).style.color = t.text}
            onMouseLeave={e => (e.target as HTMLElement).style.color = t.textMuted}
          >Sign In</Link>
          <Link href="/auth/register" style={{ padding: '9px 24px', background: t.green, color: '#F2F2F2', textDecoration: 'none', fontSize: 14, fontWeight: 500, letterSpacing: '0.03em', transition: 'all 0.2s' }}
            onMouseEnter={e => (e.target as HTMLElement).style.background = '#1f6347'}
            onMouseLeave={e => (e.target as HTMLElement).style.background = t.green}
          >Get Access →</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh', padding: '100px 56px 80px',
        background: dark
          ? 'radial-gradient(ellipse 90% 70% at 50% -10%, rgba(23,77,56,0.22) 0%, transparent 55%), #0a0a0a'
          : 'radial-gradient(ellipse 90% 70% at 50% -10%, rgba(23,77,56,0.09) 0%, transparent 55%), #F2F2F2',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: dark
            ? 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)'
            : 'linear-gradient(rgba(0,0,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.04) 1px,transparent 1px)',
          backgroundSize: '72px 72px',
        }}/>
        <div style={{ position: 'absolute', bottom: '5%', left: '-3%', width: 360, height: 360, background: 'radial-gradient(circle, rgba(77,23,23,0.12) 0%, transparent 65%)', pointerEvents: 'none' }}/>

        {/* Two-column layout */}
        <div style={{
          maxWidth: 1200, margin: '0 auto', position: 'relative',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center',
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? 'translateY(0)' : 'translateY(40px)',
          transition: 'opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)',
        }}>
          {/* Left — text */}
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '5px 14px', border: '1px solid rgba(23,77,56,0.4)',
              background: 'rgba(23,77,56,0.08)', marginBottom: 36,
              fontSize: 11, letterSpacing: '0.14em', color: t.greenL,
              textTransform: 'uppercase', fontWeight: 500,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.greenL, boxShadow: `0 0 8px ${t.greenL}`, display: 'inline-block' }}/>
              AI-Powered IT Support
            </div>

            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(52px, 6vw, 84px)',
              fontWeight: 500, lineHeight: 0.95,
              letterSpacing: '-0.03em', color: t.text, marginBottom: 4,
            }}>Resolve.</h1>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(52px, 6vw, 84px)',
              fontWeight: 500, lineHeight: 0.95,
              letterSpacing: '-0.03em', color: t.text, marginBottom: 4,
            }}>Route.</h1>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(52px, 6vw, 84px)',
              fontWeight: 500, lineHeight: 0.95,
              letterSpacing: '-0.03em', marginBottom: 32,
              background: 'linear-gradient(135deg, #174D38, #4d9e78)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Never Ask Twice.</h1>

            <p style={{ fontSize: 17, lineHeight: 1.75, color: t.textMuted, marginBottom: 40, fontWeight: 300, maxWidth: 440 }}>
              An end-to-end AI platform that resolves IT issues automatically, creates intelligent tickets,
              and routes them to the right engineer — anywhere in the world, instantly.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 52 }}>
              <Link href="/auth/register" style={{
                padding: '14px 38px', background: t.green, color: '#F2F2F2',
                textDecoration: 'none', fontSize: 13, fontWeight: 500,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                transition: 'all 0.25s', display: 'inline-block',
                boxShadow: '0 0 40px rgba(23,77,56,0.35)',
              }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = '#1f6347'; (e.target as HTMLElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = t.green; (e.target as HTMLElement).style.transform = 'translateY(0)' }}
              >Start Free →</Link>
              <Link href="#features" style={{
                padding: '14px 38px', border: `1px solid ${t.border}`,
                color: t.textMuted, textDecoration: 'none', fontSize: 13,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                transition: 'all 0.25s', display: 'inline-block',
              }}
                onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = t.borderHov; (e.target as HTMLElement).style.color = t.text }}
                onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = t.border; (e.target as HTMLElement).style.color = t.textMuted }}
              >See How It Works</Link>
            </div>

            {/* Mini stats row */}
            <div style={{ display: 'flex', gap: 32, paddingTop: 28, borderTop: `1px solid ${t.border}` }}>
              {[['~70%', 'AI Resolved'], ['0', 'Dropped Tickets'], ['24/7', 'Global Coverage']].map(([n, l], i) => (
                <div key={i}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600, color: t.green, lineHeight: 1 }}>{n}</div>
                  <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Dashboard preview */}
          <div style={{
            background: dark ? '#0f0f0f' : '#fff',
            border: `1px solid ${t.border}`,
            borderRadius: 12, overflow: 'hidden',
            boxShadow: dark ? '0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)' : '0 40px 100px rgba(0,0,0,0.12)',
          }}>
            {/* Browser chrome */}
            <div style={{ background: dark ? '#1a1a1a' : '#e8e8e8', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid ${t.border}` }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }}/>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }}/>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }}/>
              <div style={{ flex: 1, margin: '0 12px', background: dark ? '#111' : '#d8d8d8', borderRadius: 4, padding: '3px 10px', fontSize: 10, color: t.textFaint, letterSpacing: '0.04em' }}>nexusdesk.app/chat</div>
            </div>

            {/* Chat UI */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text, letterSpacing: '0.02em' }}>AI Support Chat</div>
                <div style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(23,77,56,0.15)', color: t.greenL, letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: 2 }}>Online</div>
              </div>

              {/* AI greeting */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: t.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 32 32"><polygon points="16,2 30,9 30,23 16,30 2,23 2,9" fill="rgba(242,242,242,0.8)"/></svg>
                </div>
                <div style={{ background: dark ? '#1e1e1e' : '#f0f0f0', padding: '10px 14px', borderRadius: '0 10px 10px 10px', fontSize: 12, color: t.text, lineHeight: 1.6, maxWidth: '85%' }}>
                  Hi! I'm your AI support assistant. What issue are you experiencing today?
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['Solve a Problem', 'New Service Request'].map((opt, i) => (
                      <div key={i} style={{ padding: '4px 10px', border: `1px solid ${i === 0 ? t.green : t.border}`, color: i === 0 ? t.greenL : t.textMuted, fontSize: 10, letterSpacing: '0.04em', borderRadius: 2, cursor: 'pointer' }}>{opt}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* User message */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ background: t.green, padding: '10px 14px', borderRadius: '10px 0 10px 10px', fontSize: 12, color: '#F2F2F2', lineHeight: 1.6, maxWidth: '75%' }}>
                  DNS not resolving on all devices since this morning
                </div>
              </div>

              {/* AI analysis */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: t.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 32 32"><polygon points="16,2 30,9 30,23 16,30 2,23 2,9" fill="rgba(242,242,242,0.8)"/></svg>
                </div>
                <div style={{ background: dark ? '#1e1e1e' : '#f0f0f0', padding: '10px 14px', borderRadius: '0 10px 10px 10px', fontSize: 12, color: t.text, lineHeight: 1.6, maxWidth: '85%' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ padding: '2px 8px', background: 'rgba(23,77,56,0.15)', color: t.greenL, fontSize: 10, borderRadius: 2 }}>Network Error</span>
                    <span style={{ padding: '2px 8px', background: 'rgba(255,100,0,0.1)', color: '#f97316', fontSize: 10, borderRadius: 2 }}>High Severity</span>
                    <span style={{ padding: '2px 8px', background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)', color: t.textMuted, fontSize: 10, borderRadius: 2 }}>BiLSTM: Moderate</span>
                  </div>
                  Detected: DNS resolution failure network-wide. Try these steps:
                  <ol style={{ marginTop: 6, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3, color: t.textMuted }}>
                    <li>Flush DNS cache: <code style={{ background: dark ? '#111' : '#e0e0e0', padding: '1px 5px', borderRadius: 2, fontSize: 11 }}>ipconfig /flushdns</code></li>
                    <li>Switch to 8.8.8.8 / 8.8.4.4</li>
                    <li>Restart DNS Client service</li>
                  </ol>
                </div>
              </div>

              {/* Resolution bar */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button style={{ flex: 1, padding: '8px', background: t.green, color: '#F2F2F2', border: 'none', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', cursor: 'pointer', borderRadius: 4 }}>✓ That Fixed It</button>
                <button style={{ flex: 1, padding: '8px', background: 'transparent', color: t.textMuted, border: `1px solid ${t.border}`, fontSize: 11, cursor: 'pointer', borderRadius: 4 }}>Still Broken →</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div style={{ background: t.green, padding: '14px 0', overflow: 'hidden', whiteSpace: 'nowrap', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'inline-block', animation: 'marquee 22s linear infinite' }}>
          {[...Array(6)].map((_, i) => (
            <span key={i} style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(242,242,242,0.65)', margin: '0 32px' }}>
              AI Resolution Engine &nbsp;·&nbsp; Smart Ticket Routing &nbsp;·&nbsp; Agentic Auto-Reassignment &nbsp;·&nbsp; Screenshot Analysis &nbsp;·&nbsp; RAG Knowledge Base &nbsp;·&nbsp; Global Engineer Network
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS ── */}
      <section style={{ background: t.bgAlt, padding: '80px 56px', borderBottom: `1px solid ${t.border}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
          {[
            { n: '~70%', s: 'Issues Resolved by AI', d: 'Before any ticket is created' },
            { n: 'Zero', s: 'Redundant Questions', d: 'Engineers get complete AI reports' },
            { n: '< 2min', s: 'Avg Routing Time', d: 'From escalation to assignment' },
            { n: '∞', s: 'Always Assigned', d: 'Agentic AI never drops a ticket' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '44px 40px',
              borderLeft: i > 0 ? `1px solid ${t.border}` : 'none',
              transition: 'background 0.25s', cursor: 'default',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = dark ? '#161616' : '#f9f9f9'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 60, fontWeight: 500, color: t.green, lineHeight: 1, marginBottom: 6 }}>{s.n}</div>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.text, marginBottom: 6 }}>{s.s}</div>
              <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ background: t.bg, padding: '120px 56px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 72, flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.greenL, fontWeight: 500, marginBottom: 16 }}>How It Works</div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 500, color: t.text, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
                From problem to resolved<br/>in under 5 minutes.
              </h2>
            </div>
            <p style={{ fontSize: 15, color: t.textMuted, maxWidth: 320, lineHeight: 1.75, fontWeight: 300 }}>
              Every step is automated. Users never wait. Engineers never waste time on context.
            </p>
          </div>

          {/* Steps */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, position: 'relative' }}>
            {[
              { n: '01', t: 'User Describes Issue', d: 'Natural language. The system auto-detects category, domain, and severity instantly.' },
              { n: '02', t: 'AI Classifies & Searches', d: 'BiLSTM classifies complexity. RAG searches the knowledge base semantically.' },
              { n: '03', t: 'Solution Generated', d: 'LLM generates a precise, org-specific resolution grounded in real documents.' },
              { n: '04', t: 'Ticket Compiled', d: 'If unresolved, a complete AI report is compiled — diagnosis, confidence, next steps.' },
              { n: '05', t: 'Engineer Assigned', d: 'Routing engine matches domain, availability, timezone. Best engineer gets the ticket.' },
            ].map((step, i) => (
              <div key={i} style={{
                padding: '36px 28px',
                borderLeft: i > 0 ? `1px solid ${t.border}` : 'none',
                position: 'relative',
              }}>
                {/* Connector arrow */}
                {i < 4 && (
                  <div style={{
                    position: 'absolute', right: -1, top: '36px',
                    width: 10, height: 10,
                    borderTop: `2px solid ${t.green}`,
                    borderRight: `2px solid ${t.green}`,
                    transform: 'rotate(45deg)',
                    zIndex: 1,
                  }}/>
                )}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: i === 0 ? t.green : dark ? '#1a1a1a' : '#e8e8e8',
                  border: `1px solid ${i === 0 ? t.green : t.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600, color: i === 0 ? '#F2F2F2' : t.textMuted,
                  marginBottom: 18, letterSpacing: '0.04em',
                }}>{step.n}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 10, lineHeight: 1.3 }}>{step.t}</div>
                <div style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.7 }}>{step.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TICKET PREVIEW ── */}
      <section style={{ background: t.bgAlt, padding: '120px 56px', borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.greenL, fontWeight: 500, marginBottom: 18 }}>Zero Context Loss</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 500, color: t.text, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 20 }}>
              Engineers receive<br/>everything they need.
            </h2>
            <p style={{ fontSize: 15, color: t.textMuted, lineHeight: 1.8, marginBottom: 32, fontWeight: 300 }}>
              Every ticket includes a complete AI-generated report. The engineer never contacts the user for context — they start resolving from the first second.
            </p>
            {[
              'User details + location + timezone',
              'Complete issue description + what was tried',
              'AI diagnosis + confidence score',
              'CNN screenshot analysis result',
              'BiLSTM complexity classification',
              'Recommended next step',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(23,77,56,0.15)', border: `1px solid ${t.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.green }}/>
                </div>
                <span style={{ fontSize: 13, color: t.textMuted }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Ticket card */}
          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden', boxShadow: dark ? '0 24px 80px rgba(0,0,0,0.5)' : '0 24px 80px rgba(0,0,0,0.1)' }}>
            {/* Ticket header */}
            <div style={{ background: t.green, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(242,242,242,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Ticket #T-2047</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#F2F2F2' }}>DNS Resolution Failure — Network-Wide</div>
              </div>
              <div style={{ padding: '3px 10px', background: '#4D1717', color: '#F2F2F2', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: 2 }}>HIGH</div>
            </div>

            <div style={{ padding: '20px' }}>
              {/* User info */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${t.border}` }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(23,77,56,0.15)', border: `1px solid ${t.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: t.greenL, flexShrink: 0 }}>RM</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Rahul Mehta</div>
                  <div style={{ fontSize: 11, color: t.textMuted }}>Pune, India · IST (UTC+5:30)</div>
                </div>
              </div>

              {/* Issue */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.textFaint, marginBottom: 6 }}>Issue</div>
                <div style={{ fontSize: 13, color: t.text, lineHeight: 1.6 }}>DNS not resolving network-wide since this morning across all devices</div>
              </div>

              {/* Tried */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.textFaint, marginBottom: 6 }}>What Was Tried</div>
                <div style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.6 }}>Flushed DNS cache · Changed to 8.8.8.8 · Restarted router · Verified on 3 devices — issue persists</div>
              </div>

              {/* AI diagnosis */}
              <div style={{ background: dark ? '#111' : '#f0f0f0', padding: '12px 14px', borderRadius: 6, marginBottom: 14, border: `1px solid rgba(23,77,56,0.2)` }}>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.greenL, marginBottom: 6, fontWeight: 600 }}>AI Diagnosis · 78% Confidence</div>
                <div style={{ fontSize: 12, color: t.text, lineHeight: 1.6 }}>Likely ISP-level DNS failure or internal DNS server misconfiguration. Next: check internal DNS server logs.</div>
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['CNN: DNS timeout detected', 'BiLSTM: Complex', 'Domain: Networking'].map((tag, i) => (
                  <span key={i} style={{ padding: '3px 8px', background: dark ? '#1a1a1a' : '#ebebeb', border: `1px solid ${t.border}`, fontSize: 10, color: t.textMuted, borderRadius: 2 }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ background: t.bg, padding: '120px 56px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 72 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.greenL, fontWeight: 500, marginBottom: 16 }}>Platform Intelligence</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 500, color: t.text, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
              Four AI components.<br/>One seamless experience.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: t.border }}>
            {[
              { n: '01', t: 'Issue Complexity Detection', sub: 'BiLSTM Sequence Model', d: 'Reads every message forward and backward to classify as Simple, Moderate, or Complex. Drives resolution depth and ticket priority.' },
              { n: '02', t: 'Screenshot Analysis', sub: 'CNN Image Classification', d: 'Attach a screenshot — the CNN identifies the error category automatically. Network error, app crash, permission denied — no manual description needed.' },
              { n: '03', t: 'RAG Resolution Engine', sub: 'LLM + Vector Search', d: 'Semantic search retrieves the top 5 relevant documents from your knowledge base. LLM generates grounded, org-specific solutions — not generic advice.' },
              { n: '04', t: 'Agentic Operations', sub: 'Autonomous AI Worker', d: 'Monitors all engineers in real time. If anyone goes offline or breaches SLA, tickets are instantly reassigned. Zero human intervention required.' },
            ].map((f, i) => (
              <div key={i} style={{
                background: t.bgCard, padding: '52px 48px',
                transition: 'background 0.25s', cursor: 'default',
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = t.bgCard2}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = t.bgCard}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 500, color: dark ? '#222' : '#ddd', lineHeight: 1 }}>{f.n}</div>
                  <div style={{ fontSize: 10, padding: '3px 10px', background: 'rgba(23,77,56,0.1)', color: t.greenL, letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: 2, whiteSpace: 'nowrap' }}>{f.sub}</div>
                </div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 500, color: t.text, marginBottom: 14, letterSpacing: '-0.01em' }}>{f.t}</h3>
                <p style={{ fontSize: 14, color: t.textMuted, lineHeight: 1.8, fontWeight: 300 }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section style={{ background: t.bgAlt, padding: '120px 56px', borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 72 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.greenL, fontWeight: 500, marginBottom: 16 }}>Three Interfaces</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 500, color: t.text, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
              Purpose-built for every role.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { role: 'User', accent: t.green, tag: 'Self-service first', desc: 'Chat with AI. Get precise resolutions. Raise a ticket in one tap. Track your assigned engineer in real time with live ETA.', points: ['AI chat interface', 'One-tap ticket creation', 'Real-time tracking', 'Engineer details & ETA', 'Notification bell'] },
              { role: 'Engineer', accent: dark ? '#444' : '#333', tag: 'Zero context loss', desc: 'Receive fully AI-compiled reports. Start resolving immediately. Toggle availability. Upload runbooks to the knowledge base.', points: ['Full AI ticket report', 'Availability toggle', 'SLA countdown timers', 'Upload runbooks', 'In-ticket messaging'] },
              { role: 'Admin', accent: t.crimson, tag: 'Total control', desc: 'Full platform visibility. Create engineers. Configure SLAs. Monitor regional load. Export immutable audit logs.', points: ['Create engineer accounts', 'Configure SLA & routing', 'Regional load monitor', 'Knowledge base control', 'Audit log export'] },
            ].map((r, i) => (
              <div key={i} style={{
                border: `1px solid ${t.border}`, padding: '40px 36px',
                transition: 'all 0.3s', cursor: 'default', position: 'relative', overflow: 'hidden',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = r.accent; (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 20px 60px rgba(0,0,0,0.2)` }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: r.accent }}/>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600, color: t.text }}>{r.role}</span>
                  <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', background: `${r.accent}22`, color: r.accent, fontWeight: 600, borderRadius: 2 }}>{r.tag}</span>
                </div>
                <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.75, marginBottom: 24, fontWeight: 300 }}>{r.desc}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {r.points.map((p, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 4, height: 4, background: r.accent, flexShrink: 0 }}/>
                      <span style={{ fontSize: 12, color: t.textMuted }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        background: '#080808', padding: '140px 56px',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(23,77,56,0.16) 0%, transparent 65%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 500, height: 500, background: 'radial-gradient(circle, rgba(77,23,23,0.12) 0%, transparent 65%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(44px, 6vw, 72px)', fontWeight: 500, color: '#F2F2F2', lineHeight: 0.95, letterSpacing: '-0.025em', marginBottom: 24 }}>
            Your engineers deserve<br/>better tools.
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(242,242,242,0.4)', marginBottom: 48, lineHeight: 1.75, fontWeight: 300 }}>
            NexusDesk eliminates every friction point between a broken system and a resolved ticket.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/register" style={{
              padding: '15px 48px', background: '#174D38', color: '#F2F2F2',
              textDecoration: 'none', fontSize: 13, fontWeight: 500,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              transition: 'all 0.25s', display: 'inline-block',
              boxShadow: '0 0 40px rgba(23,77,56,0.35)',
            }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = '#1f6347'; (e.target as HTMLElement).style.transform = 'translateY(-3px)' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = '#174D38'; (e.target as HTMLElement).style.transform = 'translateY(0)' }}
            >Get Started Free →</Link>
            <Link href="/auth/login" style={{
              padding: '15px 48px', border: '1px solid rgba(242,242,242,0.15)',
              color: 'rgba(242,242,242,0.6)', textDecoration: 'none',
              fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase',
              transition: 'all 0.25s', display: 'inline-block',
            }}
              onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'rgba(242,242,242,0.35)'; (e.target as HTMLElement).style.color = '#F2F2F2' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'rgba(242,242,242,0.15)'; (e.target as HTMLElement).style.color = 'rgba(242,242,242,0.6)' }}
            >Sign In</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#050505', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '36px 56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="24" height="24" viewBox="0 0 32 32"><polygon points="16,2 30,9 30,23 16,30 2,23 2,9" fill="#174D38"/></svg>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, color: '#F2F2F2', fontWeight: 600 }}>NexusDesk</span>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          {['Product', 'Security', 'Privacy', 'Contact'].map(l => (
            <a key={l} href="#" style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', letterSpacing: '0.04em', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={e => (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.2)'}
            >{l}</a>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.06em' }}>© 2026 NexusDesk</div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #174D38; border-radius: 2px; }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
    </div>
  )
}