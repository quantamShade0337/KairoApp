import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { calcTrustScore } from '@/lib/trust'

// POST /api/auth/stripe-link — save seller's Stripe payment link
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { stripe_link } = await req.json()

    if (stripe_link && !stripe_link.startsWith('https://')) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    const db = createServiceClient()

    // Recalculate trust score
    const { data: products } = await db
      .from('products')
      .select('sales')
      .eq('user_id', user.id)
      .eq('is_published', true)

    const productCount = products?.length || 0
    const totalSales = products?.reduce((sum, p) => sum + (p.sales || 0), 0) || 0

    const newTrustScore = calcTrustScore({
      githubConnected: !!user.github_login,
      githubRepos: user.github_repos || 0,
      githubFollowers: user.github_followers || 0,
      productCount,
      totalSales,
      hasStripeLink: !!stripe_link,
      hasBio: !!user.bio,
      hasAvatar: !!user.avatar_url,
    })

    const { error } = await db
      .from('users')
      .update({ stripe_link: stripe_link || null, trust_score: newTrustScore })
      .eq('id', user.id)

    if (error) throw error

    return NextResponse.json({ ok: true, trust_score: newTrustScore })
  } catch (err) {
    console.error('Stripe link error:', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
