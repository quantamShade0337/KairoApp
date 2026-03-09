'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import ProductCard from '@/components/ui/ProductCard'

function trustColor(s: number) { return s >= 80 ? '#22c55e' : s >= 50 ? '#eab308' : '#555' }
function trustLabel(s: number) { return s >= 80 ? 'Verified' : s >= 50 ? 'Trusted' : 'New' }

// Fetches by username
async function fetchStore(username: string) {
  const [userRes, productsRes] = await Promise.all([
    fetch(`/api/stores/${username}`),
    fetch(`/api/products?user_username=${username}&limit=24`),
  ])
  return {
    user: userRes.ok ? (await userRes.json()).user : null,
    products: productsRes.ok ? (await productsRes.json()).products : [],
  }
}

export default function StorePage({ params }: { params: { username: string } }) {
  const [data, setData] = useState<{ user: any; products: any[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStore(params.username)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [params.username])

  if (loading) {
    return <AppShell><div style={{ padding: '60px 32px', color: 'var(--g3)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase' }}>Loading...</div></AppShell>
  }

  if (!data?.user) {
    return (
      <AppShell>
        <div style={{ padding: '80px 32px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 48, color: 'var(--g3)' }}>Store Not Found</div>
          <Link href="/explore" className="k-btn-ghost" style={{ marginTop: 20, display: 'inline-flex' }}>Browse Marketplace</Link>
        </div>
      </AppShell>
    )
  }

  const { user, products } = data
  const tc = trustColor(user.trust_score)

  return (
    <AppShell>
      {/* Banner */}
      <div style={{ height: 180, background: 'var(--g4)', position: 'relative', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ position: 'absolute', right: -10, top: -20, fontFamily: 'var(--font-bebas)', fontSize: 180, color: 'rgba(255,255,255,.025)', letterSpacing: '-.04em', lineHeight: 1, pointerEvents: 'none' }}>
          {user.display_name.slice(0, 2).toUpperCase()}
        </div>
      </div>

      {/* Store info */}
      <div style={{ padding: '24px 32px 20px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'flex-end', gap: 20 }}>
        <div style={{
          width: 60, height: 60,
          background: 'var(--g5)',
          border: '2px solid rgba(255,255,255,.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-bebas)', fontSize: 22,
          overflow: 'hidden', flexShrink: 0, marginTop: -40, position: 'relative', zIndex: 1
        }}>
          {user.avatar_url
            ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : user.display_name.slice(0, 2).toUpperCase()
          }
        </div>

        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 32, letterSpacing: '.03em', textTransform: 'uppercase', lineHeight: 1, marginBottom: 4 }}>
            {user.display_name}
          </h1>
          <div style={{ fontSize: 10, color: 'var(--g3)', letterSpacing: '.1em', marginBottom: 8 }}>@{user.username}</div>
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { n: products.length, l: 'Products' },
              { n: products.reduce((s: number, p: any) => s + (p.sales || 0), 0).toLocaleString(), l: 'Sales' },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 20, lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: 9, color: 'var(--g3)', letterSpacing: '.16em', textTransform: 'uppercase' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust */}
        <div style={{ border: `1px solid ${tc}33`, padding: '12px 16px', textAlign: 'center', background: `${tc}08`, flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-bebas)', fontSize: 28, color: tc, display: 'block', lineHeight: 1 }}>{user.trust_score}</span>
          <span style={{ fontSize: 7, letterSpacing: '.16em', textTransform: 'uppercase', color: tc, display: 'block', marginTop: 3 }}>{trustLabel(user.trust_score)}</span>
          <span style={{ fontSize: 7, color: 'var(--g3)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginTop: 2 }}>Trust</span>
        </div>
      </div>

      {/* Bio */}
      {user.bio && (
        <div style={{ padding: '14px 32px', borderBottom: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.01)' }}>
          <p style={{ fontSize: 12, color: 'var(--g2)', lineHeight: 1.7, maxWidth: 600 }}>{user.bio}</p>
          {user.github_login && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 10, color: '#22c55e' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub Verified — @{user.github_login}
            </div>
          )}
        </div>
      )}

      {/* Products */}
      <div style={{ padding: '24px 32px' }}>
        <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 20, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 16, color: 'var(--g2)' }}>
          {products.length} Product{products.length !== 1 ? 's' : ''}
        </div>
        {products.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', border: '1px dashed rgba(255,255,255,.06)' }}>
            <div style={{ fontSize: 12, color: 'var(--g3)' }}>No products yet</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 1, background: 'rgba(255,255,255,.055)' }}>
            {products.map((p: any) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </AppShell>
  )
}
