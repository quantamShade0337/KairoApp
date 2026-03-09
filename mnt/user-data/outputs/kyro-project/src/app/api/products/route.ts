import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getSessionUser } from '@/lib/session'

// GET /api/products — list products with optional filters
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const userId = searchParams.get('user_id')
  const userUsername = searchParams.get('user_username')
  const sort = searchParams.get('sort') || 'trending'
  const q = searchParams.get('q')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

  const db = createServiceClient()
  let query = db
    .from('products')
    .select(`
      id, title, description, category, price, stripe_link,
      thumbnail_url, tags, sales, created_at,
      users!inner(id, username, display_name, avatar_url, trust_score, github_login)
    `)
    .eq('is_published', true)

  if (category && category !== 'all') query = query.eq('category', category)
  if (userId) query = query.eq('user_id', userId)
  if (userUsername) query = query.eq('users.username', userUsername)
  if (q) query = query.ilike('title', `%${q}%`)

  if (sort === 'newest') query = query.order('created_at', { ascending: false })
  else if (sort === 'price-low') query = query.order('price', { ascending: true })
  else if (sort === 'price-high') query = query.order('price', { ascending: false })
  else query = query.order('sales', { ascending: false }) // trending / top-selling

  query = query.limit(limit)

  const { data, error } = await query

  if (error) {
    console.error('Products fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }

  return NextResponse.json({ products: data || [] })
}

// POST /api/products — create a new product
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { title, description, category, price, stripe_link, thumbnail_url, file_url, tags } = body

    if (!title || title.trim().length < 3) {
      return NextResponse.json({ error: 'Title must be at least 3 characters' }, { status: 400 })
    }

    const db = createServiceClient()

    const { data, error } = await db
      .from('products')
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description?.trim() || '',
        category: category || 'Other',
        price: parseFloat(price) || 0,
        stripe_link: stripe_link || user.stripe_link || null,
        thumbnail_url: thumbnail_url || null,
        file_url: file_url || null,
        tags: Array.isArray(tags) ? tags : [],
        is_published: true,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('Create product error:', error)
      return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
    }

    return NextResponse.json({ product: data }, { status: 201 })
  } catch (err) {
    console.error('Products POST error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
