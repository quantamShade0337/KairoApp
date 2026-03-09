'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'

function trustColor(s: number) {
  return s >= 80 ? '#22c55e' : s >= 50 ? '#eab308' : '#555'
}
function trustLabel(s: number) {
  return s >= 80 ? 'Verified' : s >= 50 ? 'Trusted' : 'New'
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then(r => r.json())
      .then(d => { setProduct(d.product); setLoading(false) })
      .catch(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <AppShell>
        <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--g3)', letterSpacing: '.2em', textTransform: 'uppercase' }}>Loading...</span>
        </div>
      </AppShell>
    )
  }

  if (!product) {
    return (
      <AppShell>
        <div style={{ padding: '80px 32px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 48, color: 'var(--g3)' }}>Not Found</div>
          <Link href="/explore" className="k-btn-ghost" style={{ marginTop: 20, display: 'inline-flex' }}>← Browse Marketplace</Link>
        </div>
      </AppShell>
    )
  }

  const seller = Array.isArray(product.users) ? product.users[0] : product.users
  const tc = trustColor(seller?.trust_score || 0)
  const stripeLink = product.stripe_link || seller?.stripe_link

  return (
    <AppShell>
      {/* Breadcrumb */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,.05)', fontSize: 10, color: 'var(--g3)' }}>
        <Link href="/explore" style={{ color: 'var(--g3)', textDecoration: 'none' }}>Market</Link>
        {' / '}
        <span>{product.category}</span>
        {' / '}
        <span style={{ color: 'var(--g2)' }}>{product.title}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px' }}>
        {/* Left — product details */}
        <div style={{ padding: '36px 40px', borderRight: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ fontSize: 9, letterSpacing: '.22em', color: 'var(--g3)', textTransform: 'uppercase', marginBottom: 8 }}>
            {product.category}
          </div>
          <h1 style={{
            fontFamily: 'var(--font-bebas)', fontSize: 'clamp(28px,3.5vw,52px)',
            letterSpacing: '.02em', textTransform: 'uppercase', lineHeight: .92, marginBottom: 14
          }}>
            {product.title}
          </h1>

          <Link
            href={`/store/${seller?.username}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24, textDecoration: 'none' }}
          >
            <span style={{ fontSize: 11, color: 'var(--g2)' }}>@{seller?.username}</span>
            <span style={{
              fontSize: 8, letterSpacing: '.12em', textTransform: 'uppercase',
              padding: '2px 7px', border: `1px solid ${tc}44`, color: tc, background: `${tc}0d`
            }}>
              {trustLabel(seller?.trust_score || 0)}
            </span>
          </Link>

          {/* Thumbnail */}
          <div style={{
            background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
            aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 28, overflow: 'hidden', position: 'relative'
          }}>
            {product.thumbnail_url
              ? <img src={product.thumbnail_url} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <>
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px)',
                    backgroundSize: '28px 28px'
                  }} />
                  <span style={{ fontFamily: 'var(--font-bebas)', fontSize: 72, color: 'rgba(255,255,255,.04)', textTransform: 'uppercase' }}>
                    {product.category.split(' ')[0]}
                  </span>
                </>
            }
          </div>

          {/* Description */}
          {product.description && (
            <p style={{ fontSize: 12, color: 'var(--g2)', lineHeight: 1.8, marginBottom: 20 }}>
              {product.description}
            </p>
          )}

          {/* Tags */}
          {product.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {product.tags.map((tag: string) => (
                <span key={tag} className="k-tag">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Right — purchase panel */}
        <div style={{ padding: '28px 24px', background: 'rgba(255,255,255,.015)', position: 'sticky', top: 0, alignSelf: 'start' }}>
          <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 44, letterSpacing: '.03em', marginBottom: 2 }}>
            {product.price === 0 ? 'Free' : `$${product.price}`}
          </div>
          <div style={{ fontSize: 10, color: 'var(--g3)', marginBottom: 20 }}>
            one-time · paid directly to seller
          </div>

          {stripeLink ? (
            <a
              href={stripeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="k-btn"
              style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}
            >
              {product.price === 0 ? 'Get Free →' : 'Buy via Stripe →'}
            </a>
          ) : (
            <div style={{
              padding: '14px', border: '1px solid rgba(255,255,255,.07)',
              fontSize: 10, color: 'var(--g3)', textAlign: 'center', marginBottom: 8
            }}>
              Contact seller to purchase
            </div>
          )}

          {/* Seller card */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <div style={{ fontSize: 9, letterSpacing: '.2em', color: 'var(--g3)', textTransform: 'uppercase', marginBottom: 12 }}>
              Seller
            </div>
            <Link href={`/store/${seller?.username}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <div style={{
                width: 36, height: 36, background: 'var(--g4)',
                border: '1px solid rgba(255,255,255,.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 12,
                overflow: 'hidden', flexShrink: 0
              }}>
                {seller?.avatar_url
                  ? <img src={seller.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  : (seller?.display_name || '?').slice(0, 2).toUpperCase()
                }
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#fff' }}>{seller?.display_name}</div>
                <div style={{ fontSize: 9, color: 'var(--g3)' }}>@{seller?.username}</div>
              </div>
            </Link>

            {seller?.bio && (
              <p style={{ fontSize: 11, color: 'var(--g3)', lineHeight: 1.6, marginTop: 10 }}>
                {seller.bio}
              </p>
            )}

            {/* Trust score */}
            <div style={{
              marginTop: 14, padding: '10px 12px',
              border: `1px solid ${tc}22`, background: `${tc}08`
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--font-bebas)', fontSize: 26, color: tc }}>{seller?.trust_score}</span>
                <span style={{ fontSize: 10, color: 'var(--g3)' }}>/100</span>
                <span style={{ fontSize: 8, color: tc, letterSpacing: '.14em', textTransform: 'uppercase', marginLeft: 4 }}>
                  {trustLabel(seller?.trust_score || 0)}
                </span>
              </div>
              <div style={{ height: 2, background: 'rgba(255,255,255,.06)' }}>
                <div style={{ height: '100%', background: tc, width: `${seller?.trust_score || 0}%`, transition: 'width 1s' }} />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ marginTop: 16 }}>
            {[
              { label: 'Sales', value: product.sales.toLocaleString() },
              { label: 'Category', value: product.category },
              { label: 'GitHub', value: seller?.github_login ? `@${seller.github_login}` : '—' },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 10, color: 'var(--g3)', marginBottom: 6
              }}>
                <span>{row.label}</span>
                <span style={{ color: 'var(--g2)' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
