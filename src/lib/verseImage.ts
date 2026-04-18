import Groq from 'groq-sdk'

// Lazy init — avoids build-time crash when GROQ_API_KEY is absent
function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

// Explicitly reference to ensure env var is included in serverless bundle
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY

// Mapping thèmes → mots-clés Unsplash
const THEME_KEYWORDS: Record<string, string> = {
  paix:       'calm ocean peaceful water',
  foi:        'mountain sunrise golden light',
  amour:      'warm golden light bokeh',
  force:      'mountain rock powerful',
  espoir:     'sunrise dawn horizon sky',
  prière:     'forest light rays morning',
  grâce:      'soft light white minimal',
  joie:       'flowers nature bloom spring',
  confiance:  'open road path journey',
  sagesse:    'library books knowledge',
  louange:    'sunset dramatic sky clouds',
  pardon:     'rain drops water calm',
  vie:        'green nature trees light',
  vérité:     'clear water reflection',
  default:    'nature light peaceful minimal',
}

// Détecter le thème du verset via Groq
export const detectVerseTheme = async (
  verseText: string,
): Promise<string> => {
  try {
    const response = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `Analyse ce verset biblique et réponds avec UN SEUL mot parmi cette liste :
paix, foi, amour, force, espoir, prière, grâce, joie, confiance, sagesse, louange, pardon, vie, vérité, default

Verset : "${verseText}"

Réponds avec un seul mot, rien d'autre.`,
        },
      ],
      temperature: 0,
      max_tokens: 10,
    })

    const theme = response.choices[0].message.content?.trim().toLowerCase() ?? ''
    return THEME_KEYWORDS[theme] ? theme : 'default'
  } catch {
    return 'default'
  }
}

export interface VerseBackground {
  url: string
  blurUrl: string
  photographer: string
  photographerUrl: string
  theme: string
  error?: string
  status?: number
}

// Récupérer une photo Unsplash selon le thème
export const getVerseBackground = async (
  verseText: string,
): Promise<VerseBackground | null> => {
  const theme = await detectVerseTheme(verseText)
  const keyword = THEME_KEYWORDS[theme]

  try {
    if (!UNSPLASH_ACCESS_KEY) {
      console.warn('Unsplash Access Key is missing.')
      return { url: '', blurUrl: '', photographer: '', photographerUrl: '', theme, error: 'Missing Unsplash Access Key' }
    }

    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&orientation=portrait&content_filter=high`,
      {
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          'Accept-Version': 'v1',
        },
        next: { revalidate: 86400 },
      },
    )

    if (!response.ok) {
      const errorData = await response.text()
      const status = response.status
      console.error(`Unsplash API error (${status}): ${errorData}`)
      return { url: '', blurUrl: '', photographer: '', photographerUrl: '', theme, error: errorData, status }
    }

    const data = await response.json() as {
      urls: { regular: string; thumb: string }
      user: { name: string; links: { html: string } }
    }

    if (!data.urls?.regular) {
      console.error('Unsplash API returned malformed data', data)
      return { url: '', blurUrl: '', photographer: '', photographerUrl: '', theme, error: 'Malformed Unsplash response' }
    }

    return {
      url: data.urls.regular,
      blurUrl: data.urls.thumb,
      photographer: data.user.name,
      photographerUrl: data.user.links.html,
      theme,
      status: 200,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Unexpected error in getVerseBackground:', error)
    return { url: '', blurUrl: '', photographer: '', photographerUrl: '', theme: 'default', error: errorMsg }
  }
}
