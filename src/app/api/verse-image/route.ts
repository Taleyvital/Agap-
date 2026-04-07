import { NextRequest, NextResponse } from 'next/server'
import { getVerseBackground } from '@/lib/verseImage'

// Explicitly reference env var to ensure it's included in serverless bundle
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY

export async function GET(req: NextRequest) {
  const verse = req.nextUrl.searchParams.get('verse')

  if (!verse) {
    return NextResponse.json({ error: 'Verse required' }, { status: 400 })
  }

  // Check if env var is available
  if (!UNSPLASH_KEY) {
    console.error('UNSPLASH_ACCESS_KEY is not set in environment variables')
    return NextResponse.json(
      { 
        url: '', 
        blurUrl: '', 
        photographer: '', 
        photographerUrl: '', 
        theme: 'default', 
        error: 'Unsplash API key not configured. Please set UNSPLASH_ACCESS_KEY in Vercel environment variables and redeploy.' 
      },
      { status: 500 }
    )
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
    console.error('Error in verse-image API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch image', details: String(error) },
      { status: 500 },
    )
  }
}
