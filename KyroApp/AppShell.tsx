'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface User {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  trust_score: number
  github_login: string | null
  stripe_link: string | null
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [searchQ, setSearchQ] = useState('')

  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(d => setUser(d.user))
      .catch(() => {})
  }, [])

  function handleSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && searchQ.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchQ.trim())}`)
    }
  }

  const nav = [
    { href: '/explore', label: 'Marketplace', icon: '◯' },
    { href: '/dashboard', label: 'Dashboard', icon: '▤' },
    { href: '/dashboard/store', label: 'My Store', icon: '▧' },
    { href: '/dashboard/upload', label: 'Upload Asset', icon: '+' },
  ]

  function isActive(href: string) {
    if (href === '/explore') return pathname === '/explore' || pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        position: 'fixed', top: 0, left: 0,
        width: 'var(--sidebar-w)', height: '100vh',
        borderRight: '1px solid rgba(255,255,255,.07)',
        display: 'flex', flexDirection: 'column',
        background: 'rgba(0,0,0,.97)',
        zIndex: 50, overflowY: 'auto'
      }}>
        <Link href="/explore" style={{
          padding: '22px 18px',
          borderBottom: '1px solid rgba(255,255,255,.055)',
          fontFamily: 'var(--font-bebas)', fontSize: 20,
          letterSpacing: '.22em', color: '#fff', textDecoration: 'none',
          display: 'block'
        }}>
          Kyro
        </Link>

        {/* Search */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,.055)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 10px',
            border: '1px solid rgba(255,255,255,.08)',
            background: 'rgba(255,255,255,.02)'
          }}>
            <span style={{ color: 'var(--g3)', fontSize: 11 }}>⌕</span>
            <input
              type="text"
              placeholder="Search..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={handleSearch}
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: '#fff', fontSize: 11, width: '100%'
              }}
            />
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '10px 10px 4px', flex: 1 }}>
          {nav.map(item => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 8px', marginBottom: 2,
                fontSize: 11, letterSpacing: '.04em',
                color: isActive(item.href) ? '#fff' : 'var(--g2)',
                textDecoration: 'none',
                background: isActive(item.href) ? 'rgba(255,255,255,.06)' : 'transparent',
                transition: 'all .15s',
              }}
            >
              <span style={{ fontSize: 11, opacity: .6, width: 14, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,.055)' }}>
          {user ? (
            <Link href="/dashboard" style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 6px', textDecoration: 'none',
              transition: 'background .15s'
            }}>
              <div style={{
                width: 28, height: 28,
                background: 'var(--g4)',
                border: '1px solid rgba(255,255,255,.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 10,
                flexShrink: 0, overflow: 'hidden'
              }}>
                {user.avatar_url
                  ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : user.display_name.slice(0, 2).toUpperCase()
                }
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#fff', lineHeight: 1.2 }}>
                  {user.display_name}
                </div>
                <div style={{ fontSize: 9, color: 'var(--g3)', letterSpacing: '.08em' }}>
                  @{user.username}
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/login" className="k-btn" style={{ width: '100%', justifyContent: 'center', fontSize: 9 }}>
              Sign In
            </Link>
          )}
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 'var(--sidebar-w)', flex: 1, minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
