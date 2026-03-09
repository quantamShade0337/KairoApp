import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!clientId) {
    return NextResponse.redirect(`${baseUrl}/?error=github_not_configured`)
  }

  const state = crypto.randomBytes(16).toString('hex')
  
  // Store state in cookie for CSRF validation
  const response = NextResponse.redirect(
    `https://github.com/login/oauth/authorize?` +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${baseUrl}/api/auth/github-callback`,
      scope: 'read:user user:email',
      state,
    }).toString()
  )

  response.cookies.set('kyro_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  return response
}
