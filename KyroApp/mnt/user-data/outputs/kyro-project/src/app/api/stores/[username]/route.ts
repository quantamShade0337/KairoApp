import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/stores/[username]
export async function GET(req: NextRequest, { params }: { params: { username: string } }) {
  const db = createServiceClient()

  const { data, error } = await db
    .from('users')
    .select('id, username, display_name, bio, avatar_url, trust_score, github_login, github_repos, github_followers, stripe_link, created_at')
    .eq('username', params.username.toLowerCase())
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ user: data })
}
