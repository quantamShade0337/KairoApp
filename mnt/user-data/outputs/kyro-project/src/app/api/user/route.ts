import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getSessionUser } from '@/lib/session'
import { calcTrustScore } from '@/lib/trust'

// GET /api/user — get current user's full profile
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data: products } = await db
    .from('products')
    .select('id, title, price, sales, thumbnail_url, category, is_published, created_at, stripe_link')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ user, products: products || [] })
}

// PATCH /api/user — update profile
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { display_name, bio, avatar_url, stripe_link } = body

    const db = createServiceClient()

    // Recalculate trust score
    const { data: products } = await db
      .from('products')
      .select('sales')
      .eq('user_id', user.id)
      .eq('is_published', true)

    const productCount = products?.length || 0
    const totalSales = products?.reduce((sum, p) => sum + (p.sales || 0), 0) || 0

    const updates: Record<string, unknown> = {}
    if (display_name !== undefined) updates.display_name = display_name
    if (bio !== undefined) updates.bio = bio
    if (avatar_url !== undefined) updates.avatar_url = avatar_url
    if (stripe_link !== undefined) updates.stripe_link = stripe_link

    updates.trust_score = calcTrustScore({
      githubConnected: !!user.github_login,
      githubRepos: user.github_repos || 0,
      githubFollowers: user.github_followers || 0,
      productCount,
      totalSales,
      hasStripeLink: !!(stripe_link ?? user.stripe_link),
      hasBio: !!(bio ?? user.bio),
      hasAvatar: !!(avatar_url ?? user.avatar_url),
    })

    const { data, error } = await db
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ user: data })
  } catch (err) {
    console.error('User update error:', err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
