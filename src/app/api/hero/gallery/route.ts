import { NextRequest, NextResponse } from 'next/server'
import { getGalleryItems, createGalleryItem, updateGalleryItem, deleteGalleryItem } from '@/actions/gallery'
import { getCurrentProfile } from '@/actions/auth'
import { isAdminOrBoard } from '@/lib/constants/roles'

export async function GET() {
  try {
    const result = await getGalleryItems()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('GET /api/hero/gallery error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch gallery items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !isAdminOrBoard(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized. Only admins can upload gallery photos.' }, { status: 403 })
    }

    const body = await request.json()
    const { title, category, image_url, caption, drive_file_id } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Photo title is required' }, { status: 400 })
    }
    if (!image_url || !image_url.trim()) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    const result = await createGalleryItem({
      title,
      category,
      image_url,
      caption,
      drive_file_id,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error: any) {
    console.error('POST /api/hero/gallery error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to add gallery photo' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !isAdminOrBoard(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized. Only admins can update gallery photos.' }, { status: 403 })
    }

    const body = await request.json()
    const { id, title, category, image_url, caption, drive_file_id } = body

    if (!id) {
      return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 })
    }

    const result = await updateGalleryItem(id, {
      title,
      category,
      caption,
      image_url,
      drive_file_id,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('PUT /api/hero/gallery error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to update gallery photo' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !isAdminOrBoard(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized. Only admins can remove gallery photos.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 })
    }

    const result = await deleteGalleryItem(id)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/hero/gallery error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to delete gallery photo' }, { status: 500 })
  }
}
