import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getSessionUser } from '@/lib/session'
import crypto from 'crypto'

const BUCKET = 'kyro-assets'
const MAX_IMAGE_SIZE = 5 * 1024 * 1024  // 5MB
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const ALLOWED_FILE_TYPES = [
  'application/zip', 'application/x-zip-compressed',
  'application/x-tar', 'application/gzip',
  'application/octet-stream',
]

// POST /api/upload?type=thumbnail|file|avatar|banner
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const uploadType = searchParams.get('type') || 'file'

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const isImage = ['thumbnail', 'avatar', 'banner'].includes(uploadType)
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max ${isImage ? '5MB' : '100MB'}` },
        { status: 413 }
      )
    }

    if (isImage && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid image type. Use PNG, JPG, or WebP' },
        { status: 415 }
      )
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const fileName = `${user.id}/${uploadType}/${crypto.randomBytes(8).toString('hex')}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const db = createServiceClient()

    const { data, error } = await db.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const { data: urlData } = db.storage
      .from(BUCKET)
      .getPublicUrl(data.path)

    return NextResponse.json({
      url: urlData.publicUrl,
      path: data.path,
      name: file.name,
      size: file.size,
    })

  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
