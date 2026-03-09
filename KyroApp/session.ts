import { cookies } from 'next/headers'
import { createServiceClient } from './supabase'
import { NextRequest } from 'next/server'

export interface SessionUser {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  github_login: string | null
  github_id: number | null
  github_repos: number | null
  github_followers: number | null
  stripe_link: string | null
  trust_score: number
}

// Get user from session cookie — returns null if not logged in
export async function getSessionUser(req?: NextRequest): Promise<SessionUser | null> {
  try {
    let userId: string | undefined

    if (req) {
      userId = req.cookies.get('kyro_uid')?.value
    } else {
      const cookieStore = cookies()
      userId = cookieStore.get('kyro_uid')?.value
    }

    if (!userId) return null

    const db = createServiceClient()
    const { data, error } = await db
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) return null
    return data as SessionUser
  } catch {
    return null
  }
}

// Cookie helpers for API routes
export function setUserCookie(res: Response, userId: string) {
  res.headers.set(
    'Set-Cookie',
    `kyro_uid=${userId}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000`
  )
}
