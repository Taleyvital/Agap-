import { NextRequest, NextResponse } from 'next/server'
import { getVerseBackground } from '@/lib/verseImage'

export async function GET(req: NextRequest) {
  const verse = req.nextUrl.searchParams.get('verse')

  if (!verse) {
    return NextResponse.json({ error: 'Verse required' }, { status: 400 })
  }

  try {
    const background = await getVerseBackground(verse)
    return NextResponse.json(background, {
      headers: {
        // Cache 24h côté client + CDN
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 },
    )
  }
}
