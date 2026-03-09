'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ display_name: '', bio: '', stripe_link: '' })
  const router = useRouter()

  useEffect(() => {
    fetch('/api/user')
      .then(r => { if (r.status === 401) { router.push('/login'); return null } return r.json() })
      .then(d => {
        if (!d) return
        setUser(d.user)
        setForm({ display_name: d.user.display_name || '', bio: d.user.bio || '', stripe_link: d.user.stripe_link || '' })
        setLoading(false)
      })
  }, [])

  async function save() {
    setSaving(true)
    const res = await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      const d = await res.json()
      setUser(d.user)
      // @ts-ignore
      window.showToast?.('Settings saved!')
    } else {
      // @ts-ignore
      window.showToast?.('Save failed — try again')
    }
  }

  async function logout() {
    await fetch('/api/auth/login', { method: 'DELETE' })
    router.push('/login')
  }

  if (loading) return <AppShell><div style={{ padding: '60px 32px', color: 'var(--g3)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase' }}>Loading...</div></AppShell>

  return (
    <AppShell>
      <div style={{ padding: '36px 32px 28px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ fontSize: 10, letterSpacing: '.26em', color: 'var(--g3)', textTransform: 'uppercase', marginBottom: 6 }}>Account</div>
        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 40, letterSpacing: '.01em', textTransform: 'uppercase' }}>Settings</h1>
      </div>

      <div style={{ maxWidth: 560, padding: '32px' }}>
        {/* Profile */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 9, letterSpacing: '.22em', color: 'var(--g3)', textTransform: 'uppercase', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            Profile
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="k-label">Display Name</label>
            <input className="k-input" value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="Your name" />
          </div>
          <div style={{ marginBottom: 0 }}>
            <label className="k-label">Bio</label>
            <textarea
              className="k-input"
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Short bio — what you build"
              style={{ resize: 'vertical', minHeight: 80 }}
            />
          </div>
        </section>

        {/* Payment */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 9, letterSpacing: '.22em', color: 'var(--g3)', textTransform: 'uppercase', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            Payment
          </div>
          <div style={{ marginBottom: 8 }}>
            <label className="k-label">Stripe Payment Link</label>
            <input
              className="k-input"
              value={form.stripe_link}
              onChange={e => setForm(f => ({ ...f, stripe_link: e.target.value }))}
              placeholder="https://buy.stripe.com/your-link"
              type="url"
            />
          </div>
          <p style={{ fontSize: 10, color: 'var(--g3)', lineHeight: 1.6 }}>
            Buyers click "Buy Now" and land on your Stripe. Kyro never touches your money.
          </p>
        </section>

        {/* GitHub */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 9, letterSpacing: '.22em', color: 'var(--g3)', textTransform: 'uppercase', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            GitHub
          </div>
          {user?.github_login ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid rgba(34,197,94,.2)', background: 'rgba(34,197,94,.04)' }}>
              <div>
                <div style={{ fontSize: 11, color: '#22c55e', marginBottom: 2 }}>Connected as @{user.github_login}</div>
                <div style={{ fontSize: 9, color: 'var(--g3)' }}>{user.github_repos || 0} repos · {user.github_followers || 0} followers</div>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 11, color: 'var(--g3)', lineHeight: 1.6, marginBottom: 12 }}>
                Connect GitHub to boost your Trust Score by up to +40 points.
              </p>
              <a href="/api/auth/github" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', border: '1px solid rgba(255,255,255,.15)',
                background: 'rgba(255,255,255,.03)', fontSize: 10, color: '#fff',
                textDecoration: 'none', letterSpacing: '.1em', textTransform: 'uppercase',
                transition: 'all .15s'
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                Connect GitHub
              </a>
            </div>
          )}
        </section>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <button className="k-btn" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button className="k-btn-danger" onClick={logout}>Log Out</button>
        </div>
      </div>
    </AppShell>
  )
}
