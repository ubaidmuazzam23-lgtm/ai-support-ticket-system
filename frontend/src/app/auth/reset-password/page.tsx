'use client'
// File: frontend/src/app/auth/reset-password/page.tsx

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ new_password: '', confirm: '' })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (!t) setError('Invalid reset link. Please request a new one.')
    else setToken(t)
  }, [])

  const pwChecks = [
    { rule: 'At least 8 characters', pass: form.new_password.length >= 8 },
    { rule: 'One uppercase letter', pass: /[A-Z]/.test(form.new_password) },
    { rule: 'One number', pass: /[0-9]/.test(form.new_password) },
  ]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.new_password !== form.confirm) { setError('Passwords do not match'); return }
    if (!pwChecks.every(c => c.pass)) { setError('Password does not meet requirements'); return }
    setLoading(true)
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: form.new_password }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Reset failed')
      setDone(true)
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
    btn: { width: '100%', padding: '14px', background: '#174D38', color: '#F2F2F2', border: 'none', fontSize: 14, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2, fontFamily: 'inherit', marginTop: 8 } as React.CSSProperties,
  }

  return (
    <div style={S.page}>
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(23,77,56,0.12) 0%, transparent 65%)', pointerEvents: 'none' }}/>
      <div style={S.card}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 36 }}>
          <svg width="26" height="26" viewBox="0 0 32 32"><polygon points="16,2 30,9 30,23 16,30 2,23 2,9" fill="#174D38"/><circle cx="16" cy="16" r="4" fill="#4d9e78"/></svg>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 600, color: '#F2F2F2' }}>NexusDesk</span>
        </Link>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(23,77,56,0.2)', border: '1px solid #174D38', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 24 }}>✓</div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 500, color: '#F2F2F2', marginBottom: 12 }}>Password reset!</h1>
            <p style={{ fontSize: 14, color: 'rgba(242,242,242,0.4)', marginBottom: 32, lineHeight: 1.6 }}>
              Your password has been updated successfully.
            </p>
            <Link href="/auth/login" style={{ display: 'inline-block', padding: '13px 36px', background: '#174D38', color: '#F2F2F2', textDecoration: 'none', fontSize: 14, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', borderRadius: 2 }}>
              Sign In →
            </Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 500, color: '#F2F2F2', marginBottom: 8 }}>Set new password</h1>
            <p style={{ fontSize: 14, color: 'rgba(242,242,242,0.35)', marginBottom: 32, lineHeight: 1.6 }}>
              Choose a strong password for your account.
            </p>

            {error && (
              <div style={{ padding: '12px 16px', background: 'rgba(77,23,23,0.3)', border: '1px solid rgba(200,50,50,0.3)', color: '#f87171', fontSize: 13, marginBottom: 20, borderRadius: 2 }}>
                {error}
              </div>
            )}

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={S.lbl}>New Password</label>
                <input style={S.inp} type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" value={form.new_password} onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}/>
                {/* Checklist */}
                {form.new_password && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {pwChecks.map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: c.pass ? 'rgba(23,77,56,0.3)' : 'rgba(255,255,255,0.05)', border: `1px solid ${c.pass ? '#4d9e78' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 8, color: c.pass ? '#4d9e78' : 'transparent' }}>✓</div>
                        <span style={{ fontSize: 12, color: c.pass ? '#4d9e78' : 'rgba(242,242,242,0.3)' }}>{c.rule}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={S.lbl}>Confirm Password</label>
                <input style={S.inp} type="password" placeholder="Repeat password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}/>
              </div>
              <button type="submit" disabled={loading || !token} style={{ ...S.btn, background: loading ? '#0f3526' : '#174D38', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Resetting...' : 'Reset Password →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}