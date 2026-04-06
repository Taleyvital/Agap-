import { NextRequest, NextResponse } from 'next/server'
import { getVerseBackground } from '@/lib/verseImage'

export async function GET(req: NextRequest) {
  const verse = req.nextUrl.searchParams.get('verse')

  if (!verse) {
    return NextResponse.json({ error: 'Verse required' }, { status: 400 })
  }

  try {
    const background = await getVerseBackground(verse)
    
    // If there's an error in the background object, we still return 200 
    // to let the client see the error message for debugging.
    return NextResponse.json(background, {
      status: background?.status === 200 ? 200 : 500,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch image', details: String(error) },
      { status: 500 },
    )
  }
}
