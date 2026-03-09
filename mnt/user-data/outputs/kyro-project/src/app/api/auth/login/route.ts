import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import crypto from 'crypto'

// POST /api/auth/login — login or register with username
export async function POST(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  try {
    const body = await req.json()
    const { username, display_name, mode } = body // mode: 'login' | 'signup'

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    const db = createServiceClient()
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '')

    if (mode === 'signup') {
      // Check username taken
      const { data: existing } = await db
        .from('users')
        .select('id')
        .eq('username', cleanUsername)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
      }

      // Create user
      const { data: newUser, error } = await db
        .from('users')
        .insert({
          id: crypto.randomUUID(),
          username: cleanUsername,
          display_name: display_name || cleanUsername,
        })
        .select()
        .single()

      if (error || !newUser) {
        console.error('Create user error:', error)
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
      }

      const response = NextResponse.json({ user: newUser, created: true })
      response.cookies.set('kyro_uid', newUser.id, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 2592000, // 30 days
        path: '/',
      })
      return response
    }

    // mode === 'login' — find by username
    const { data: user } = await db
      .from('users')
      .select('*')
      .eq('username', cleanUsername)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const response = NextResponse.json({ user })
    response.cookies.set('kyro_uid', user.id, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 2592000,
      path: '/',
    })
    return response

  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/auth/login — logout
export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('kyro_uid')
  return response
}
