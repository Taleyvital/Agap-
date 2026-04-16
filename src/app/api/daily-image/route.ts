import { NextResponse } from 'next/server'

// Explicitly reference env var to ensure it's included in serverless bundle
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY

// Mots-clés pour les images spirituelles/nature quotidiennes
const DAILY_IMAGE_KEYWORDS = [
  'sunrise dawn horizon golden light nature',
  'peaceful lake mountain reflection calm',
  'forest light rays morning mist',
  'ocean waves sunset dramatic sky',
  'starry night milky way cosmos',
  'flowers field nature bloom spring',
  'waterfall nature forest green',
  'desert sand dunes golden hour',
  'snow mountain peak winter calm',
  'autumn leaves forest path golden',
  'cherry blossom spring pink nature',
  'cabin woods lake peaceful',
  'northern lights aurora night sky',
  'meadow grass wildflowers nature',
  'cliff ocean view dramatic landscape',
]

// Obtenir le mot-clé du jour basé sur la date
function getDailyKeyword(): string {
  const today = new Date()
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
  return DAILY_IMAGE_KEYWORDS[dayOfYear % DAILY_IMAGE_KEYWORDS.length]
}

export async function GET() {
  // Check if env var is available
  if (!UNSPLASH_KEY) {
    console.error('UNSPLASH_ACCESS_KEY is not set in environment variables')
    return NextResponse.json(
      { 
        url: '', 
        blurUrl: '', 
        photographer: '', 
        photographerUrl: '', 
        error: 'Unsplash API key not configured' 
      },
      { status: 500 }
    )
  }

  const keyword = getDailyKeyword()

  try {
    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&orientation=portrait&content_filter=high`,
      {
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_KEY}`,
          'Accept-Version': 'v1',
        },
        next: { revalidate: 86400 }, // Cache for 24 hours
      },
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error(`Unsplash API error: ${errorData}`)
      return NextResponse.json(
        { error: 'Failed to fetch image', details: errorData },
        { status: 500 }
      )
    }

    const data = await response.json() as {
      urls: { regular: string; thumb: string }
      user: { name: string; links: { html: string } }
      description: string | null
      alt_description: string | null
    }

    return NextResponse.json({
      url: data.urls.regular,
      blurUrl: data.urls.thumb,
      photographer: data.user.name,
      photographerUrl: data.user.links.html,
      description: data.description || data.alt_description || 'Image du jour',
    }, {
      headers: {
        'Cache-Control': 'public, max-age=86400', // Cache client-side for 24 hours
      },
    })

  } catch (error) {
    console.error('Error in daily-image API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch image', details: String(error) },
      { status: 500 }
    )
  }
}
