'use client'
// File: frontend/src/app/auth/forgot-password/page.tsx

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Something went wrong')
      setSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const S = {
    page: { minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' } as React.CSSProperties,
    card: { width: '100%', maxWidth: 440, padding: '48px', background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8 } as React.CSSProperties,
    inp: { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F2F2F2', fontSize: 14, outline: 'none', borderRadius: 2, fontFamily: 'inherit' } as React.CSSProperties,
    lbl: { fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(242,242,242,0.4)', marginBottom: 8, display: 'block', fontWeight: 500 } as React.CSSProperties,
  }

  return (
    <div style={S.page}>
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(23,77,56,0.12) 0%, transparent 65%)', pointerEvents: 'none' }}/>
      <div style={S.card}>

        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 36 }}>
          <svg width="26" height="26" viewBox="0 0 32 32"><polygon points="16,2 30,9 30,23 16,30 2,23 2,9" fill="#174D38"/><circle cx="16" cy="16" r="4" fill="#4d9e78"/></svg>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 600, color: '#F2F2F2' }}>NexusDesk</span>
        </Link>

        {!sent ? (
          <>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 500, color: '#F2F2F2', marginBottom: 8 }}>Forgot password?</h1>
            <p style={{ fontSize: 14, color: 'rgba(242,242,242,0.35)', marginBottom: 32, lineHeight: 1.6 }}>
              Enter your email address. We'll send you a temporary password you can use to sign in right away.
            </p>

            {error && (
              <div style={{ padding: '16px', background: 'rgba(77,23,23,0.15)', border: '1px solid rgba(200,50,50,0.25)', borderRadius: 4, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(200,50,50,0.2)', border: '1px solid rgba(200,50,50,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#f87171', flexShrink: 0 }}>✕</div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#f87171' }}>Account not found</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(242,242,242,0.45)', lineHeight: 1.6 }}>
                  {error}. Double-check your email or{' '}
                  <Link href="/auth/register" style={{ color: '#4d9e78', textDecoration: 'none', fontWeight: 500 }}>
                    create a new account →
                  </Link>
                </p>
              </div>
            )}

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={S.lbl}>Email Address</label>
                <input
                  style={S.inp} type="email"
                  placeholder="you@company.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '14px',
                background: loading ? '#0f3526' : '#174D38',
                color: '#F2F2F2', border: 'none', fontSize: 14,
                fontWeight: 500, letterSpacing: '0.06em',
                textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer',
                borderRadius: 2, fontFamily: 'inherit',
              }}>
                {loading ? 'Checking...' : 'Send Temporary Password →'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'rgba(23,77,56,0.2)', border: '2px solid #174D38',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', fontSize: 26, color: '#4d9e78',
            }}>✓</div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 500, color: '#F2F2F2', marginBottom: 12 }}>
              Password sent!
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(242,242,242,0.4)', lineHeight: 1.75, marginBottom: 12 }}>
              We sent a temporary password to
            </p>
            <p style={{ fontSize: 15, color: '#4d9e78', fontWeight: 600, marginBottom: 28 }}>{email}</p>
            <p style={{ fontSize: 13, color: 'rgba(242,242,242,0.3)', marginBottom: 32, lineHeight: 1.6 }}>
              Check your inbox and use it to sign in.<br/>
              You can change your password after logging in.
            </p>
            <Link href="/auth/login" style={{
              display: 'inline-block', padding: '13px 36px',
              background: '#174D38', color: '#F2F2F2',
              textDecoration: 'none', fontSize: 14,
              fontWeight: 500, letterSpacing: '0.06em',
              textTransform: 'uppercase', borderRadius: 2,
            }}>
              Go to Sign In →
            </Link>
          </div>
        )}

        {!sent && (
          <p style={{ marginTop: 32, fontSize: 13, color: 'rgba(242,242,242,0.3)', textAlign: 'center' }}>
            Remember it?{' '}
            <Link href="/auth/login" style={{ color: '#4d9e78', textDecoration: 'none' }}>Sign in →</Link>
          </p>
        )}
      </div>
    </div>
  )
}