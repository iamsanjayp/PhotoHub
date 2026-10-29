import { NextRequest, NextResponse } from 'next/server'
import { getWebLinks, createWebLink, updateWebLink, deleteWebLink } from '@/actions/web-links'
import { getCurrentProfile } from '@/actions/auth'
import { isAdminOrBoard } from '@/lib/constants/roles'

export async function GET() {
  try {
    const result = await getWebLinks()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('GET /api/hero/links error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch web links' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !isAdminOrBoard(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized. Only admins can add web links.' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, url, badge, accent, sort_order } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!url || !url.trim()) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const result = await createWebLink({
      title,
      description,
      url,
      badge,
      accent,
      sort_order,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error: any) {
    console.error('POST /api/hero/links error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to create web link' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !isAdminOrBoard(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized. Only admins can update web links.' }, { status: 403 })
    }

    const body = await request.json()
    const { id, title, description, url, badge, accent, sort_order } = body

    if (!id) {
      return NextResponse.json({ error: 'Link ID is required' }, { status: 400 })
    }

    const result = await updateWebLink(id, {
      title,
      description,
      url,
      badge,
      accent,
      sort_order,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('PUT /api/hero/links error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to update web link' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !isAdminOrBoard(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized. Only admins can delete web links.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Link ID is required' }, { status: 400 })
    }

    const result = await deleteWebLink(id)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/hero/links error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to delete web link' }, { status: 500 })
  }
}
