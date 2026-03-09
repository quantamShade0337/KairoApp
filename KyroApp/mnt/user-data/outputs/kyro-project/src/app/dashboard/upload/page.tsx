'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'

const CATS = ['Starter Kit', 'API Template', 'Component Library', 'Template', 'CLI Tool', 'Automation', 'Script', 'Other']

type Step = 1 | 2 | 3 | 4

export default function UploadPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)
  const [authed, setAuthed] = useState<boolean | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState('')
  const [stripeLink, setStripeLink] = useState('')
  const [tags, setTags] = useState('')

  // File state
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)
  const [productFile, setProductFile] = useState<File | null>(null)

  // Upload results
  const [thumbUrl, setThumbUrl] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)

  const thumbRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(d => {
        if (!d.user) { router.push('/login'); return }
        setAuthed(true)
        if (d.user.stripe_link) setStripeLink(d.user.stripe_link)
      })
  }, [])

  async function handleThumbSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setThumbFile(file)
    setThumbPreview(URL.createObjectURL(file))

    // Upload immediately
    setUploadingThumb(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload?type=thumbnail', { method: 'POST', body: fd })
    const data = await res.json()
    setUploadingThumb(false)
    if (data.url) { setThumbUrl(data.url); (window as any).showToast?.('Thumbnail uploaded!') }
    else (window as any).showToast?.('Thumbnail upload failed')
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setProductFile(file)

    setUploadingFile(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload?type=file', { method: 'POST', body: fd })
    const data = await res.json()
    setUploadingFile(false)
    if (data.url) { setFileUrl(data.url); (window as any).showToast?.(`${file.name} uploaded!`) }
    else (window as any).showToast?.('File upload failed')
  }

  async function publish() {
    if (!title.trim()) { (window as any).showToast?.('Enter a product title'); return }
    if (!category) { (window as any).showToast?.('Select a category'); return }

    setSubmitting(true)
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        category,
        price: parseFloat(price) || 0,
        stripe_link: stripeLink || undefined,
        thumbnail_url: thumbUrl || undefined,
        file_url: fileUrl || undefined,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      }),
    })
    setSubmitting(false)
    if (res.ok) {
      const d = await res.json()
      router.push(`/product/${d.product.id}?published=1`)
    } else {
      (window as any).showToast?.('Publish failed — check your inputs')
    }
  }

  if (authed === null) return <AppShell><div style={{ padding: 60, color: 'var(--g3)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase' }}>Loading...</div></AppShell>

  const steps = ['Info', 'Media', 'File', 'Publish']

  return (
    <AppShell>
      <div style={{ padding: '36px 32px 24px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ fontSize: 10, letterSpacing: '.26em', color: 'var(--g3)', textTransform: 'uppercase', marginBottom: 6 }}>Creator</div>
        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 40, letterSpacing: '.01em', textTransform: 'uppercase' }}>Upload Asset</h1>
      </div>

      <div style={{ maxWidth: 600, padding: '28px 32px' }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', marginBottom: 32, border: '1px solid rgba(255,255,255,.08)' }}>
          {steps.map((s, i) => (
            <div
              key={s}
              onClick={() => i + 1 < step && setStep((i + 1) as Step)}
              style={{
                flex: 1, padding: '11px 0', textAlign: 'center',
                fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase',
                color: step === i + 1 ? '#fff' : step > i + 1 ? 'var(--g2)' : 'var(--g3)',
                background: step === i + 1 ? 'rgba(255,255,255,.05)' : 'transparent',
                borderRight: i < 3 ? '1px solid rgba(255,255,255,.07)' : 'none',
                cursor: i + 1 < step ? 'none' : 'none',
                position: 'relative',
              }}
            >
              <span style={{ fontFamily: 'var(--font-bebas)', fontSize: 14, display: 'block', marginBottom: 2 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              {s}
              {step === i + 1 && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: '#fff' }} />
              )}
              {step > i + 1 && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,.2)' }} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 — Info */}
        {step === 1 && (
          <div style={{ animation: 'fadeUp .3s both' }}>
            <div style={{ marginBottom: 16 }}>
              <label className="k-label">Product Title *</label>
              <input className="k-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Next.js SaaS Boilerplate" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="k-label">Description</label>
              <textarea
                className="k-input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What does this include? Who is it for?"
                style={{ resize: 'vertical', minHeight: 90 }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="k-label">Category *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CATS.map(c => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    style={{
                      padding: '6px 12px', fontSize: 9, letterSpacing: '.14em',
                      textTransform: 'uppercase', background: 'transparent',
                      border: category === c ? '1px solid #fff' : '1px solid rgba(255,255,255,.1)',
                      color: category === c ? '#fff' : 'var(--g3)',
                      transition: 'all .15s',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label className="k-label">Price (USD)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--g3)', fontSize: 13 }}>$</span>
                  <input className="k-input" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" type="number" min="0" step="0.01" style={{ paddingLeft: 26 }} />
                </div>
                <div style={{ fontSize: 9, color: 'var(--g3)', marginTop: 5 }}>Set 0 for free · you keep 100%</div>
              </div>
              <div>
                <label className="k-label">Stripe Link (for this product)</label>
                <input className="k-input" value={stripeLink} onChange={e => setStripeLink(e.target.value)} placeholder="https://buy.stripe.com/..." type="url" />
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label className="k-label">Tags (comma-separated)</label>
              <input className="k-input" value={tags} onChange={e => setTags(e.target.value)} placeholder="Next.js, TypeScript, Tailwind" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="k-btn" onClick={() => setStep(2)}>Next: Media →</button>
            </div>
          </div>
        )}

        {/* Step 2 — Media */}
        {step === 2 && (
          <div style={{ animation: 'fadeUp .3s both' }}>
            <input ref={thumbRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleThumbSelect} />

            <div style={{ marginBottom: 24 }}>
              <label className="k-label">Product Thumbnail</label>
              <div
                onClick={() => thumbRef.current?.click()}
                style={{
                  border: '1px dashed rgba(255,255,255,.15)',
                  padding: thumbPreview ? 0 : '48px 32px',
                  textAlign: 'center', transition: 'all .2s', overflow: 'hidden',
                  aspectRatio: thumbPreview ? '16/9' : 'auto',
                  position: 'relative',
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.3)')}
                onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.15)')}
              >
                {thumbPreview ? (
                  <>
                    <img src={thumbPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .2s' }}
                      onMouseOver={e => { e.currentTarget.style.opacity = '1' }}
                      onMouseOut={e => { e.currentTarget.style.opacity = '0' }}>
                      <span style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase' }}>Replace Image</span>
                    </div>
                    {uploadingThumb && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: '#fff', animation: 'fadeUp .3s' }} />}
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 24, opacity: .25, marginBottom: 10 }}>◫</div>
                    <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 5 }}>
                      {uploadingThumb ? 'Uploading...' : 'Click to upload thumbnail'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--g3)' }}>PNG, JPG, WebP · max 5MB</div>
                  </>
                )}
              </div>
              {thumbUrl && <div style={{ fontSize: 9, color: '#22c55e', marginTop: 6 }}>◆ Uploaded</div>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="k-btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="k-btn" onClick={() => setStep(3)}>Next: File →</button>
            </div>
          </div>
        )}

        {/* Step 3 — File */}
        {step === 3 && (
          <div style={{ animation: 'fadeUp .3s both' }}>
            <input ref={fileRef} type="file" accept=".zip,.tar,.gz,.rar,.7z" style={{ display: 'none' }} onChange={handleFileSelect} />

            <div style={{ marginBottom: 24 }}>
              <label className="k-label">Product File</label>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `1px dashed ${productFile ? 'rgba(34,197,94,.3)' : 'rgba(255,255,255,.15)'}`,
                  padding: '48px 32px', textAlign: 'center', transition: 'all .2s',
                  background: productFile ? 'rgba(34,197,94,.04)' : 'transparent',
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = productFile ? 'rgba(34,197,94,.5)' : 'rgba(255,255,255,.3)')}
                onMouseOut={e => (e.currentTarget.style.borderColor = productFile ? 'rgba(34,197,94,.3)' : 'rgba(255,255,255,.15)')}
              >
                {productFile ? (
                  <>
                    <div style={{ fontSize: 20, color: '#22c55e', opacity: .7, marginBottom: 8 }}>◆</div>
                    <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                      {uploadingFile ? 'Uploading...' : productFile.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--g3)' }}>
                      {fileUrl ? '✓ Uploaded to storage' : uploadingFile ? 'Please wait...' : `${(productFile.size / 1024 / 1024).toFixed(1)} MB · click to replace`}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 24, opacity: .25, marginBottom: 10 }}>⌃</div>
                    <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 5 }}>
                      Click to upload product file
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--g3)' }}>ZIP, TAR, or archive · max 100MB</div>
                  </>
                )}
              </div>
            </div>

            <div style={{ padding: '14px 16px', border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.02)', marginBottom: 24, fontSize: 10, color: 'var(--g3)', lineHeight: 1.6 }}>
              ◆ All files are scanned before going live. Your file is stored securely on Supabase Storage.
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="k-btn-ghost" onClick={() => setStep(2)}>← Back</button>
              <button className="k-btn" onClick={() => setStep(4)}>Review →</button>
            </div>
          </div>
        )}

        {/* Step 4 — Publish */}
        {step === 4 && (
          <div style={{ animation: 'fadeUp .3s both' }}>
            <div style={{ padding: '20px', background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)', marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 20, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 6 }}>
                {title || '(no title)'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--g3)', marginBottom: 12 }}>{category || '(no category)'} · {price ? `$${price}` : 'Free'}</div>
              {description && <p style={{ fontSize: 11, color: 'var(--g2)', lineHeight: 1.6 }}>{description}</p>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {[
                { label: 'Title', ok: !!title.trim() },
                { label: 'Category', ok: !!category },
                { label: 'Thumbnail', ok: !!thumbUrl, warn: true },
                { label: 'Product file', ok: !!fileUrl, warn: true },
                { label: 'Stripe link', ok: !!stripeLink, warn: true },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                  <span style={{ color: item.ok ? '#22c55e' : item.warn ? '#eab308' : '#ef4444' }}>◆</span>
                  <span style={{ color: 'var(--g2)' }}>{item.label}</span>
                  <span style={{ color: item.ok ? '#22c55e' : item.warn ? '#eab308' : '#ef4444', fontSize: 9, marginLeft: 'auto' }}>
                    {item.ok ? 'Ready' : item.warn ? 'Optional' : 'Required'}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="k-btn-ghost" onClick={() => setStep(3)}>← Back</button>
              <button
                className="k-btn"
                onClick={publish}
                disabled={submitting || !title.trim() || !category}
                style={{ opacity: submitting || !title.trim() || !category ? .5 : 1 }}
              >
                {submitting ? 'Publishing...' : 'Publish Now'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
