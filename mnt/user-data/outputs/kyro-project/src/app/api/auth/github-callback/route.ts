import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { calcTrustScore } from '@/lib/trust'

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${baseUrl}/dashboard?error=github_denied`)
  }

  // CSRF check
  const storedState = req.cookies.get('kyro_oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${baseUrl}/dashboard?error=github_state_mismatch`)
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/dashboard?error=github_no_code`)
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${baseUrl}/api/auth/github-callback`,
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      return NextResponse.redirect(`${baseUrl}/dashboard?error=github_token_failed`)
    }

    // Fetch GitHub user
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'User-Agent': 'Kyro/1.0',
      },
    })
    const ghUser = await userRes.json()

    if (!ghUser.id) {
      return NextResponse.redirect(`${baseUrl}/dashboard?error=github_user_failed`)
    }

    // Get current user from session cookie
    const userId = req.cookies.get('kyro_uid')?.value
    if (!userId) {
      return NextResponse.redirect(`${baseUrl}/login?error=not_logged_in`)
    }

    const db = createServiceClient()

    // Get current user
    const { data: currentUser } = await db
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (!currentUser) {
      return NextResponse.redirect(`${baseUrl}/login?error=user_not_found`)
    }

    // Get product count and sales for trust score
    const { data: products } = await db
      .from('products')
      .select('sales')
      .eq('user_id', userId)
      .eq('is_published', true)

    const productCount = products?.length || 0
    const totalSales = products?.reduce((sum, p) => sum + (p.sales || 0), 0) || 0

    const newTrustScore = calcTrustScore({
      githubConnected: true,
      githubRepos: ghUser.public_repos || 0,
      githubFollowers: ghUser.followers || 0,
      productCount,
      totalSales,
      hasStripeLink: !!currentUser.stripe_link,
      hasBio: !!currentUser.bio,
      hasAvatar: !!(currentUser.avatar_url || ghUser.avatar_url),
    })

    // Update user with GitHub data
    await db.from('users').update({
      github_login: ghUser.login,
      github_id: ghUser.id,
      github_repos: ghUser.public_repos || 0,
      github_followers: ghUser.followers || 0,
      avatar_url: currentUser.avatar_url || ghUser.avatar_url,
      trust_score: newTrustScore,
    }).eq('id', userId)

    const response = NextResponse.redirect(`${baseUrl}/dashboard?github=connected`)
    // Clear state cookie
    response.cookies.delete('kyro_oauth_state')
    return response

  } catch (err) {
    console.error('GitHub callback error:', err)
    return NextResponse.redirect(`${baseUrl}/dashboard?error=github_callback_failed`)
  }
}
