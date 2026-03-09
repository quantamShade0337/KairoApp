'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import ProductCard from '@/components/ui/ProductCard'

const CATS = [
  { label: 'All', value: 'all' },
  { label: 'Starter Kits', value: 'Starter Kit' },
  { label: 'UI Components', value: 'Component Library' },
  { label: 'APIs', value: 'API Template' },
  { label: 'Templates', value: 'Template' },
  { label: 'CLI Tools', value: 'CLI Tool' },
  { label: 'Automation', value: 'Automation' },
  { label: 'Scripts', value: 'Script' },
]

function ExploreInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const q = searchParams.get('q') || ''
  const catParam = searchParams.get('cat') || 'all'

  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('trending')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ sort, limit: '24' })
    if (catParam !== 'all') params.set('category', catParam)
    if (q) params.set('q', q)

    fetch(`/api/products?${params}`)
      .then(r => r.json())
      .then(d => { setProducts(d.products || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [catParam, sort, q])

  function setCategory(cat: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('cat', cat)
    if (q) params.set('q', q)
    router.push(`/explore?${params}`)
  }

  return (
    <AppShell>
      {/* Header */}
      <div style={{ padding: '36px 32px 24px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ fontSize: 10, letterSpacing: '.26em', color: 'var(--g3)', textTransform: 'uppercase', marginBottom: 8 }}>
          {q ? `Search: "${q}"` : 'Developer Marketplace'}
        </div>
        <h1 style={{
          fontFamily: 'var(--font-bebas)', fontSize: 'clamp(36px,4vw,56px)',
          letterSpacing: '.01em', textTransform: 'uppercase', lineHeight: .88
        }}>
          {q
            ? <>{q}</>
            : <>Find Your<br /><span style={{ WebkitTextStroke: '1px rgba(255,255,255,.2)', color: 'transparent' }}>Next Build.</span></>
          }
        </h1>
        {!q && (
          <p style={{ marginTop: 12, fontSize: 12, color: 'var(--g2)', maxWidth: 480, lineHeight: 1.6 }}>
            {products.length}+ starter kits, templates, APIs, and tools — built by developers, for developers.
          </p>
        )}
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,.06)',
        overflowX: 'auto', padding: '0 32px',
      }}>
        {CATS.map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            style={{
              padding: '12px 16px', fontSize: 10, letterSpacing: '.14em',
              textTransform: 'uppercase', whiteSpace: 'nowrap',
              color: catParam === cat.value ? '#fff' : 'var(--g3)',
              background: 'transparent', border: 'none',
              borderBottom: catParam === cat.value ? '2px solid #fff' : '2px solid transparent',
              marginBottom: -1, transition: 'all .15s',
            }}
          >
            {cat.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 16, flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: 'var(--g3)', letterSpacing: '.18em', textTransform: 'uppercase' }}>Sort</span>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,.1)',
              color: 'var(--g2)', fontSize: 10, letterSpacing: '.1em',
              textTransform: 'uppercase', padding: '5px 8px', outline: 'none',
            }}
          >
            <option value="trending" style={{ background: '#000' }}>Trending</option>
            <option value="newest" style={{ background: '#000' }}>Newest</option>
            <option value="price-low" style={{ background: '#000' }}>Price ↑</option>
            <option value="price-high" style={{ background: '#000' }}>Price ↓</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div style={{ padding: '28px 32px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 1, background: 'rgba(255,255,255,.05)' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ background: '#000', aspectRatio: '3/4' }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 40, color: 'var(--g3)', letterSpacing: '.05em', marginBottom: 10 }}>
              No Results
            </div>
            <p style={{ fontSize: 12, color: 'var(--g3)' }}>
              {q ? `No assets found for "${q}"` : 'No assets in this category yet.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 1, background: 'rgba(255,255,255,.055)' }}>
            {products.map(p => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div style={{ background: '#000', minHeight: '100vh' }} />}>
      <ExploreInner />
    </Suspense>
  )
}
