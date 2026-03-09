'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import ProductCard from '@/components/ui/ProductCard'

const BANNER_COLORS = ['#1a1a2e', '#0d1117', '#0f0f0f', '#1a0a0a', '#0a1a0a', '#0a0a1a', '#12101a', '#111']

export default function MyStorePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [bannerColor, setBannerColor] = useState('#1a1a2e')
  const [bannerImage, setBannerImage] = useState<string | null>(null)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [form, setForm] = useState({ display_name: '', bio: '', stripe_link: '' })
  const [saving, setSaving] = useState(false)
  const bannerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/user')
      .then(r => { if (r.status === 401) { router.push('/login'); return null } return r.json() })
      .then(d => {
        if (!d) return
        setUser(d.user)
        setProducts(d.products || [])
        setForm({ display_name: d.user.display_name || '', bio: d.user.bio || '', stripe_link: d.user.stripe_link || '' })
        setLoading(false)
      })
  }, [])

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingBanner(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload?type=banner', { method: 'POST', body: fd })
    const data = await res.json()
    setUploadingBanner(false)
    if (data.url) { setBannerImage(data.url); (window as any).showToast?.('Banner uploaded!') }
    else (window as any).showToast?.('Upload failed')
  }

  async function saveStore() {
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
      setEditing(false)
      ;(window as any).showToast?.('Store updated!')
    }
  }

  if (loading) return <AppShell><div style={{ padding: 60, color: 'var(--g3)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase' }}>Loading...</div></AppShell>

  return (
    <AppShell>
      <input ref={bannerRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerUpload} />

      {/* Banner */}
      <div
        onClick={() => bannerRef.current?.click()}
        style={{
          height: 180, position: 'relative', overflow: 'hidden',
          background: bannerColor,
          backgroundImage: bannerImage ? `url(${bannerImage})` : 'none',
          backgroundSize: 'cover', backgroundPosition: 'center',
          borderBottom: '1px solid rgba(255,255,255,.06)',
          cursor: 'none'
        }}
      >
        {!bannerImage && (
          <div style={{ position: 'absolute', right: -10, top: -20, fontFamily: 'var(--font-bebas)', fontSize: 180, color: 'rgba(255,255,255,.025)', letterSpacing: '-.04em', lineHeight: 1, pointerEvents: 'none' }}>
            {user?.display_name?.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: 'opacity .2s',
        }}
          onMouseOver={e => (e.currentTarget.style.opacity = '1')}
          onMouseOut={e => (e.currentTarget.style.opacity = '0')}
        >
          <span style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: '#fff' }}>
            {uploadingBanner ? 'Uploading...' : 'Click to change banner'}
          </span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); bannerRef.current?.click() }}
          style={{
            position: 'absolute', top: 14, right: 14,
            padding: '7px 12px', border: '1px solid rgba(255,255,255,.2)',
            background: 'rgba(0,0,0,.65)', color: '#fff',
            fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase',
            backdropFilter: 'blur(8px)', transition: 'all .2s',
          }}
        >
          Upload Banner
        </button>
      </div>

      {/* Banner color swatches */}
      {!bannerImage && (
        <div style={{ padding: '10px 32px', borderBottom: '1px solid rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, color: 'var(--g3)', letterSpacing: '.16em', textTransform: 'uppercase' }}>Color</span>
          {BANNER_COLORS.map(c => (
            <div
              key={c}
              onClick={() => setBannerColor(c)}
              style={{
                width: 20, height: 20, background: c, cursor: 'none',
                border: bannerColor === c ? '1px solid #fff' : '1px solid rgba(255,255,255,.1)',
                transition: 'all .15s', transform: bannerColor === c ? 'scale(1.1)' : 'scale(1)',
              }}
            />
          ))}
          {bannerImage && (
            <button onClick={() => setBannerImage(null)} className="k-btn-danger" style={{ padding: '4px 8px', fontSize: 8, marginLeft: 8 }}>
              Remove Image
            </button>
          )}
        </div>
      )}

      {/* Store header */}
      <div style={{ padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 56, height: 56, background: 'var(--g5)',
          border: '2px solid rgba(255,255,255,.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-bebas)', fontSize: 18, overflow: 'hidden', flexShrink: 0
        }}>
          {user?.avatar_url
            ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : user?.display_name?.slice(0, 2).toUpperCase()
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 28, letterSpacing: '.03em', textTransform: 'uppercase', lineHeight: 1, marginBottom: 3 }}>
            {user?.display_name}
          </div>
          <div style={{ fontSize: 10, color: 'var(--g3)' }}>@{user?.username}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="k-btn-ghost" onClick={() => setEditing(!editing)} style={{ fontSize: 9 }}>
            {editing ? 'Cancel' : 'Edit Store'}
          </button>
          <Link href={`/store/${user?.username}`} className="k-btn-ghost" style={{ fontSize: 9 }} target="_blank">
            View Public ↗
          </Link>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div style={{ padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.015)', animation: 'fadeUp .25s both' }}>
          <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="k-label">Display Name</label>
                <input className="k-input" value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
              </div>
              <div>
                <label className="k-label">Stripe Link</label>
                <input className="k-input" value={form.stripe_link} onChange={e => setForm(f => ({ ...f, stripe_link: e.target.value }))} placeholder="https://buy.stripe.com/..." type="url" />
              </div>
            </div>
            <div>
              <label className="k-label">Bio</label>
              <textarea className="k-input" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="What you build..." style={{ resize: 'vertical', minHeight: 72 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="k-btn" onClick={saveStore} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button className="k-btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Products */}
      <div style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '.2em', color: 'var(--g3)', textTransform: 'uppercase', marginBottom: 3 }}>Your Products</div>
            <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 22, letterSpacing: '.04em', textTransform: 'uppercase' }}>My Listings</div>
          </div>
          <Link href="/dashboard/upload" className="k-btn" style={{ fontSize: 9 }}>+ New Asset</Link>
        </div>

        {products.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', border: '1px dashed rgba(255,255,255,.08)' }}>
            <p style={{ fontSize: 11, color: 'var(--g3)', marginBottom: 16 }}>No products yet.</p>
            <Link href="/dashboard/upload" className="k-btn">Upload Your First Asset →</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 1, background: 'rgba(255,255,255,.055)' }}>
            {products.map((p: any) => (
              <ProductCard key={p.id} p={{ ...p, users: user }} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
