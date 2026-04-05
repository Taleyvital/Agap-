import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

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
    const response = await groq.chat.completions.create({
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
}

// Récupérer une photo Unsplash selon le thème
export const getVerseBackground = async (
  verseText: string,
): Promise<VerseBackground> => {
  const theme = await detectVerseTheme(verseText)
  const keyword = THEME_KEYWORDS[theme]

  const FALLBACKS: VerseBackground[] = [
    { url: '/images/verse-bg-1.jpg', blurUrl: '', photographer: '', photographerUrl: '', theme },
    { url: '/images/verse-bg-2.jpg', blurUrl: '', photographer: '', photographerUrl: '', theme },
    { url: '/images/verse-bg-3.jpg', blurUrl: '', photographer: '', photographerUrl: '', theme },
  ]

  const fallback = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)]

  try {
    if (!process.env.UNSPLASH_ACCESS_KEY) {
      console.warn('Unsplash Access Key is missing. Falling back to local assets.')
      return fallback
    }

    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&orientation=portrait&content_filter=high`,
      {
        headers: {
          'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
          'Accept-Version': 'v1',
        },
        next: { revalidate: 86400 },
      },
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error(`Unsplash API error (${response.status}): ${errorData}`)
      return fallback
    }

    const data = await response.json() as {
      urls: { regular: string; thumb: string }
      user: { name: string; links: { html: string } }
    }

    if (!data.urls?.regular) {
      console.error('Unsplash API returned malformed data', data)
      return fallback
    }

    return {
      url: data.urls.regular,
      blurUrl: data.urls.thumb,
      photographer: data.user.name,
      photographerUrl: data.user.links.html,
      theme,
    }
  } catch (error) {
    console.error('Unexpected error in getVerseBackground:', error)
    return fallback
  }
}
