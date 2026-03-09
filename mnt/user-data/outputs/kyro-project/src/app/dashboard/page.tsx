'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { Suspense } from 'react'

function trustColor(s: number) { return s >= 80 ? '#22c55e' : s >= 50 ? '#eab308' : '#555' }
function trustLabel(s: number) { return s >= 80 ? 'Verified' : s >= 50 ? 'Trusted' : 'New' }

function DashboardInner() {
  const [user, setUser] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    fetch('/api/user')
      .then(r => {
        if (r.status === 401) { router.push('/login'); return null }
        return r.json()
      })
      .then(d => {
        if (!d) return
        setUser(d.user)
        setProducts(d.products || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Handle OAuth return messages
    const ghParam = searchParams.get('github')
    const errParam = searchParams.get('error')
    if (ghParam === 'connected' && typeof window !== 'undefined') {
      // @ts-ignore
      window.showToast?.('GitHub connected! Trust Score updated.')
    }
    if (errParam && typeof window !== 'undefined') {
      // @ts-ignore
      window.showToast?.(`Error: ${errParam.replace(/_/g, ' ')}`)
    }
  }, [])

  if (loading) {
    return (
      <AppShell>
        <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--g3)', letterSpacing: '.2em', textTransform: 'uppercase' }}>Loading...</span>
        </div>
      </AppShell>
    )
  }

  if (!user) return null

  const tc = trustColor(user.trust_score)
  const totalSales = products.reduce((s: number, p: any) => s + (p.sales || 0), 0)
  const totalRevenue = products.reduce((s: number, p: any) => s + ((p.price || 0) * (p.sales || 0)), 0)

  return (
    <AppShell>
      {/* Header */}
      <div style={{ padding: '36px 32px 28px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ fontSize: 10, letterSpacing: '.26em', color: 'var(--g3)', textTransform: 'uppercase', marginBottom: 6 }}>
          Creator Dashboard
        </div>
        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 40, letterSpacing: '.01em', textTransform: 'uppercase', lineHeight: 1 }}>
          {user.display_name}
        </h1>
        <div style={{ fontSize: 10, color: 'var(--g3)', marginTop: 4 }}>@{user.username}</div>
      </div>

      <div style={{ padding: '28px 32px' }}>

        {/* Stats row — 4 cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'rgba(255,255,255,.055)', marginBottom: 36 }}>
          {[
            { label: 'Listings', value: products.length },
            { label: 'Total Sales', value: totalSales.toLocaleString() },
            { label: 'Est. Revenue', value: `$${totalRevenue.toLocaleString()}` },
            { label: 'Trust Score', value: user.trust_score },
          ].map(stat => (
            <div
              key={stat.label}
              style={{ background: '#000', padding: '28px 24px', transition: 'background .2s' }}
              onMouseOver={e => (e.currentTarget.style.background = 'var(--g5)')}
              onMouseOut={e => (e.currentTarget.style.background = '#000')}
            >
              <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 40, lineHeight: 1, marginBottom: 4 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 9, letterSpacing: '.22em', color: 'var(--g3)', textTransform: 'uppercase' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28 }}>
          {/* Left — products */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: '.2em', color: 'var(--g3)', textTransform: 'uppercase', marginBottom: 3 }}>Your Products</div>
                <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 22, letterSpacing: '.04em', textTransform: 'uppercase' }}>My Listings</div>
              </div>
              <Link href="/dashboard/upload" className="k-btn" style={{ fontSize: 9 }}>+ New Asset</Link>
            </div>

            {products.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center', border: '1px dashed rgba(255,255,255,.08)' }}>
                <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 28, color: 'var(--g3)', letterSpacing: '.05em', marginBottom: 8 }}>
                  No Products Yet
                </div>
                <p style={{ fontSize: 11, color: 'var(--g3)', marginBottom: 16 }}>Upload your first asset to start earning.</p>
                <Link href="/dashboard/upload" className="k-btn">Upload Asset →</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(255,255,255,.04)' }}>
                {products.map((p: any) => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', background: '#000',
                    transition: 'background .15s'
                  }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--g5)')}
                    onMouseOut={e => (e.currentTarget.style.background = '#000')}
                  >
                    {/* Thumb */}
                    <div style={{
                      width: 52, height: 36, background: 'var(--g4)',
                      flexShrink: 0, overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {p.thumbnail_url
                        ? <img src={p.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 8, color: 'rgba(255,255,255,.2)', letterSpacing: '.1em', textTransform: 'uppercase' }}>{p.category?.slice(0, 3)}</span>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 12, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.title}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--g3)' }}>{p.category}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 16 }}>{p.price === 0 ? 'Free' : `$${p.price}`}</div>
                      <div style={{ fontSize: 9, color: 'var(--g3)' }}>{p.sales} sales</div>
                    </div>
                    <Link href={`/product/${p.id}`} className="k-btn-ghost" style={{ fontSize: 8, padding: '6px 10px' }}>View</Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right — profile setup */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Trust score */}
            <div style={{ padding: '20px', border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.02)' }}>
              <div style={{ fontSize: 9, letterSpacing: '.2em', color: 'var(--g3)', textTransform: 'uppercase', marginBottom: 14 }}>
                Trust Score
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--font-bebas)', fontSize: 40, color: tc, lineHeight: 1 }}>{user.trust_score}</span>
                <span style={{ fontSize: 11, color: 'var(--g3)' }}>/100</span>
                <span style={{ fontSize: 8, color: tc, letterSpacing: '.14em', textTransform: 'uppercase', marginLeft: 4 }}>{trustLabel(user.trust_score)}</span>
              </div>
              <div style={{ height: 2, background: 'rgba(255,255,255,.06)', marginBottom: 12 }}>
                <div style={{ height: '100%', background: tc, width: `${user.trust_score}%`, transition: 'width 1s' }} />
              </div>
              {!user.github_login && (
                <a href="/api/auth/github" style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '9px 12px',
                  border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.03)',
                  fontSize: 10, color: 'var(--g2)', textDecoration: 'none',
                  transition: 'all .15s', letterSpacing: '.06em'
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  Connect GitHub +40 pts
                </a>
              )}
              {user.github_login && (
                <div style={{ fontSize: 10, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>◆</span> GitHub: @{user.github_login}
                </div>
              )}
            </div>

            {/* Stripe link */}
            <div style={{ padding: '20px', border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.02)' }}>
              <div style={{ fontSize: 9, letterSpacing: '.2em', color: 'var(--g3)', textTransform: 'uppercase', marginBottom: 12 }}>
                Payment Link
              </div>
              {user.stripe_link ? (
                <div>
                  <div style={{ fontSize: 10, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                    <span>◆</span> Stripe link set
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--g3)', wordBreak: 'break-all', marginBottom: 10 }}>{user.stripe_link}</div>
                  <Link href="/dashboard/settings" className="k-btn-ghost" style={{ fontSize: 8, padding: '6px 10px' }}>Edit</Link>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 11, color: 'var(--g3)', lineHeight: 1.6, marginBottom: 12 }}>
                    Add your Stripe link so buyers can pay you directly.
                  </p>
                  <Link href="/dashboard/settings" className="k-btn" style={{ fontSize: 9 }}>Add Stripe Link</Link>
                </div>
              )}
            </div>

            {/* Quick links */}
            <div style={{ padding: '16px', border: '1px solid rgba(255,255,255,.07)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Link href="/dashboard/store" style={{ fontSize: 10, color: 'var(--g2)', textDecoration: 'none', padding: '7px 0', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <span>My Store</span><span style={{ color: 'var(--g3)' }}>→</span>
                </Link>
                <Link href="/dashboard/settings" style={{ fontSize: 10, color: 'var(--g2)', textDecoration: 'none', padding: '7px 0', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <span>Settings</span><span style={{ color: 'var(--g3)' }}>→</span>
                </Link>
                <Link href={`/store/${user.username}`} style={{ fontSize: 10, color: 'var(--g2)', textDecoration: 'none', padding: '7px 0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Public Store →</span><span style={{ color: 'var(--g3)' }}>↗</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardInner />
    </Suspense>
  )
}
