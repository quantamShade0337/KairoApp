import Link from 'next/link'

interface Product {
  id: string
  title: string
  category: string
  price: number
  sales: number
  thumbnail_url: string | null
  stripe_link: string | null
  users: {
    username: string
    display_name: string
    trust_score: number
  }
}

function trustColor(score: number) {
  if (score >= 80) return '#22c55e'
  if (score >= 50) return '#eab308'
  return '#555'
}

export default function ProductCard({ p }: { p: Product }) {
  const user = Array.isArray(p.users) ? p.users[0] : p.users

  return (
    <Link
      href={`/product/${p.id}`}
      style={{
        display: 'block',
        background: '#000',
        textDecoration: 'none',
        color: '#fff',
        transition: 'background .2s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseOver={e => (e.currentTarget.style.background = 'var(--g5)')}
      onMouseOut={e => (e.currentTarget.style.background = '#000')}
    >
      {/* Thumbnail */}
      <div style={{
        aspectRatio: '16/9',
        background: 'var(--g4)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {p.thumbnail_url
          ? <img src={p.thumbnail_url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{
              fontFamily: 'var(--font-bebas)', fontSize: 11,
              letterSpacing: '.28em', color: 'rgba(255,255,255,.1)',
              textTransform: 'uppercase'
            }}>
              {p.category.split(' ')[0]}
            </span>
        }
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 9, letterSpacing: '.2em', color: 'var(--g3)', textTransform: 'uppercase', marginBottom: 4 }}>
          {p.category}
        </div>
        <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13, lineHeight: 1.2, marginBottom: 3 }}>
          {p.title}
        </div>
        <div style={{ fontSize: 10, color: 'var(--g3)', marginBottom: 10 }}>
          @{user?.username}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: 10,
        }}>
          <span style={{ fontFamily: 'var(--font-bebas)', fontSize: 18, letterSpacing: '.04em' }}>
            {p.price === 0 ? 'Free' : `$${p.price}`}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
              background: trustColor(user?.trust_score || 0)
            }} />
            <span style={{ fontSize: 9, color: 'var(--g3)' }}>{p.sales.toLocaleString()} sales</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
