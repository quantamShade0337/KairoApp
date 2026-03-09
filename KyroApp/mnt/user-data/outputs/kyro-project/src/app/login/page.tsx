'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!username.trim()) { setError('Enter a username'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.trim(),
        display_name: displayName.trim() || username.trim(),
        mode,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      return
    }

    router.push('/dashboard')
  }

  return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {/* Left */}
      <div style={{
        borderRight: '1px solid rgba(255,255,255,.07)',
        padding: '40px 60px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
        animation: 'fadeUp .6s both'
      }}>
        <div style={{ position: 'absolute', bottom: -40, left: -20, fontFamily: 'var(--font-bebas)', fontSize: 200, color: 'rgba(255,255,255,.018)', letterSpacing: '-.06em', lineHeight: 1, pointerEvents: 'none' }}>
          KY
        </div>
        <Link href="/explore" style={{ fontFamily: 'var(--font-bebas)', fontSize: 24, letterSpacing: '.22em', color: '#fff', textDecoration: 'none' }}>
          Kyro
        </Link>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: '.28em', color: 'var(--g3)', textTransform: 'uppercase', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 16, height: 1, background: 'var(--g3)', display: 'block' }} />
            Developer Marketplace
          </div>
          <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(52px,5.5vw,80px)', letterSpacing: '.01em', textTransform: 'uppercase', lineHeight: .88 }}>
            Your<br />Assets.<br />
            <span style={{ WebkitTextStroke: '1px rgba(255,255,255,.22)', color: 'transparent' }}>Your</span><br />
            <span style={{ WebkitTextStroke: '1px rgba(255,255,255,.22)', color: 'transparent' }}>Revenue.</span>
          </h2>
          <p style={{ marginTop: 24, fontSize: 12, color: 'var(--g2)', maxWidth: 340, lineHeight: 1.75 }}>
            The marketplace where developers sell starter kits, templates, APIs, and more. Upload once. Earn forever.
          </p>
          <div style={{ display: 'flex', gap: 32, marginTop: 36 }}>
            {[{ n: '2.8K+', l: 'Assets' }, { n: '960+', l: 'Creators' }, { n: '24K+', l: 'Downloads' }].map(s => (
              <div key={s.l}>
                <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 28, letterSpacing: '.02em', lineHeight: 1, marginBottom: 2 }}>{s.n}</div>
                <div style={{ fontSize: 9, letterSpacing: '.2em', color: 'var(--g3)', textTransform: 'uppercase' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--g3)', letterSpacing: '.1em' }}>© 2025 Kyro Inc.</div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 72px', animation: 'fadeUp .6s .15s both' }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 36, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 6 }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--g2)' }}>
            {mode === 'login'
              ? <>No account? <button onClick={() => { setMode('signup'); setError('') }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,.2)', padding: '0 0 1px' }}>Sign up free</button></>
              : <>Have an account? <button onClick={() => { setMode('login'); setError('') }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,.2)', padding: '0 0 1px' }}>Log in</button></>
            }
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,.1)', marginBottom: 28 }}>
          {(['login', 'signup'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              style={{
                flex: 1, padding: 11, fontSize: 10, letterSpacing: '.16em',
                textTransform: 'uppercase', border: 'none',
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? '#000' : 'var(--g3)',
                transition: 'all .15s',
              }}
            >
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {mode === 'signup' && (
          <div style={{ marginBottom: 14 }}>
            <label className="k-label">Display Name</label>
            <input className="k-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Ada Lovelace" />
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label className="k-label">Username</label>
          <input
            className="k-input"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="@yourhandle"
            onKeyDown={e => e.key === 'Enter' && submit()}
            autoFocus
          />
        </div>

        {error && (
          <div style={{ padding: '9px 12px', border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.06)', fontSize: 11, color: '#ef4444', marginBottom: 14 }}>
            {error}
          </div>
        )}

        <button className="k-btn" onClick={submit} disabled={loading} style={{ width: '100%', justifyContent: 'center', opacity: loading ? .6 : 1 }}>
          {loading ? 'Loading...' : mode === 'login' ? 'Enter App →' : 'Create Account →'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
          <span style={{ fontSize: 9, letterSpacing: '.2em', color: 'var(--g3)', textTransform: 'uppercase' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
        </div>

        <a href="/api/auth/github" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '11px 16px', border: '1px solid rgba(255,255,255,.12)',
          background: 'rgba(255,255,255,.03)', fontSize: 10, color: 'var(--g2)',
          textDecoration: 'none', letterSpacing: '.1em', textTransform: 'uppercase',
          transition: 'all .15s',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          Continue with GitHub
        </a>

        <p style={{ fontSize: 10, color: 'var(--g3)', marginTop: 20, lineHeight: 1.6, textAlign: 'center' }}>
          No password needed. Username-based login for now. Full auth coming soon.
        </p>
      </div>
    </div>
  )
}
