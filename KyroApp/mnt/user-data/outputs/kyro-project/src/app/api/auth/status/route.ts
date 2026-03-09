import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)

  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 })
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      bio: user.bio,
      avatar_url: user.avatar_url,
      github_login: user.github_login,
      stripe_link: user.stripe_link,
      trust_score: user.trust_score,
    },
  })
}
