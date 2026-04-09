'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { VerseBackground } from '@/lib/verseImage'
import { createSupabaseBrowserClient } from '@/lib/supabase'

interface VerseImageCardProps {
  verseText: string
  reference: string
  variant?: 'home' | 'fullscreen'
  onClose?: () => void
}

export function VerseImageCard({
  verseText,
  reference,
  variant = 'home',
  onClose,
}: VerseImageCardProps) {
  const [background, setBackground] = useState<VerseBackground | null>(null)
  const [loading, setLoading] = useState(true)
  const [shared, setShared] = useState(false)
  const [fontSize, setFontSize] = useState(18) // default size

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const fetchBackground = async () => {
      try {
        const res = await fetch(
          `/api/verse-image?verse=${encodeURIComponent(verseText)}`,
        )
        if (!res.ok) throw new Error('fetch failed')
        const data: VerseBackground = await res.json()
        if (!cancelled) setBackground(data)
      } catch {
        // silently fall through — skeleton remains then hides
        if (!cancelled) setBackground(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchBackground()
    return () => { cancelled = true }
  }, [verseText])

  // Load verse font size from Supabase profile
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('verse_font_size')
        .eq('id', user.id)
        .single()

      if (data?.verse_font_size) {
        setFontSize(data.verse_font_size)
      }
    })()
  }, [])

  const handleShare = async () => {
    const shareText = `"${verseText}" — ${reference}\n\nPartagé depuis AGAPE 🕊️`
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText, title: 'AGAPE – Verset du jour' })
      } else {
        await navigator.clipboard.writeText(shareText)
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      }
    } catch { /* user cancelled share */ }
  }

  if (loading) return <VerseImageSkeleton variant={variant} />

  const isFullscreen = variant === 'fullscreen'

  return (
    <div
      className={`relative overflow-hidden bg-neutral-900 ${
        isFullscreen
          ? 'fixed inset-0 z-[100] rounded-none'
          : 'h-[300px] rounded-2xl shadow-xl'
      }`}
    >
      {/* ── Background image ── */}
      {background?.url ? (
        <Image
          src={background.url}
          alt="Verse background"
          fill
          className="object-cover opacity-0 transition-opacity duration-1000"
          onLoadingComplete={(img) => img.classList.remove('opacity-0')}
          priority
          sizes={isFullscreen ? '100vw' : '(max-width: 430px) 100vw, 430px'}
          placeholder={background.blurUrl ? 'blur' : 'empty'}
          blurDataURL={background.blurUrl || undefined}
        />
      ) : (
        /* ── Fallback Gradient if no image at all ── */
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-800" />
      )}

      {/* ── Debug Error (only visible if there's an error) ── */}
      {background?.error && (
        <div className="absolute top-2 right-2 z-50 rounded bg-red-500/80 px-2 py-1 font-mono text-[8px] text-white backdrop-blur-md">
          ERR: {background.error.slice(0, 50)}
        </div>
      )}

      {/* ── Gradient overlay (always visible for contrast) ── */}
      <div
        className="absolute inset-0 bg-black/30"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* ── Top controls (fullscreen) ── */}
      {isFullscreen && (
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-5 pt-[env(safe-area-inset-top,20px)] py-4 z-10">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white/80 hover:text-white transition-colors"
            aria-label="Fermer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-2 text-white/80 hover:text-white transition-colors text-xs uppercase tracking-widest"
            aria-label="Partager"
          >
            {shared ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copié
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                Partager
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Centered verse content ── */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center text-center z-10 ${
          isFullscreen ? 'px-8' : 'px-6'
        }`}
      >
        {/* Label */}
        <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-white/60 mb-5">
          <span>✦</span>
          Verset du jour
          <span>✦</span>
        </p>

        {/* Divider line */}
        <div className="mb-5 w-8 border-t border-white/25" />

        {/* Verse text */}
        <p
          className="font-serif italic leading-relaxed text-white drop-shadow-lg"
          style={{
            fontSize: isFullscreen ? `${fontSize + 4}px` : `${fontSize}px`,
          }}
        >
          &ldquo;{verseText}&rdquo;
        </p>

        {/* Divider line */}
        <div className="mt-5 mb-5 w-8 border-t border-white/25" />

        {/* Reference pill */}
        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-1.5 backdrop-blur-sm">
          <span className="text-xs">📖</span>
          <span className="text-xs uppercase tracking-widest text-white/85">
            {reference}
          </span>
        </div>
      </div>

      {/* ── Photographer credit (Unsplash attribution requirement) ── */}
      {background?.photographer && (
        <a
          href={`${background.photographerUrl}?utm_source=agape&utm_medium=referral`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 z-10 text-[9px] text-white/30 hover:text-white/60 transition-colors"
        >
          Photo: {background.photographer} / Unsplash
        </a>
      )}
    </div>
  )
}

// ── Skeleton ──
function VerseImageSkeleton({ variant = 'home' }: { variant?: 'home' | 'fullscreen' }) {
  return (
    <div
      className={`relative overflow-hidden bg-bg-secondary animate-pulse ${
        variant === 'fullscreen'
          ? 'fixed inset-0 z-[100] rounded-none'
          : 'h-[300px] rounded-2xl'
      }`}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8">
        <div className="h-2 w-20 rounded-full bg-bg-tertiary" />
        <div className="h-1 w-6 rounded-full bg-bg-tertiary" />
        <div className="h-4 w-56 rounded-full bg-bg-tertiary" />
        <div className="h-4 w-48 rounded-full bg-bg-tertiary" />
        <div className="h-4 w-40 rounded-full bg-bg-tertiary" />
        <div className="h-1 w-6 rounded-full bg-bg-tertiary mt-1" />
        <div className="h-6 w-28 rounded-full bg-bg-tertiary" />
      </div>
    </div>
  )
}
