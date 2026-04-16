'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface DailyImage {
  url: string
  blurUrl: string
  photographer: string
  photographerUrl: string
  description: string
  error?: string
}

export function DailyImageCard() {
  const [image, setImage] = useState<DailyImage | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const fetchDailyImage = async () => {
      try {
        const res = await fetch('/api/daily-image')
        if (!res.ok) throw new Error('fetch failed')
        const data: DailyImage = await res.json()
        if (!cancelled) setImage(data)
      } catch {
        if (!cancelled) setImage(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchDailyImage()
    return () => { cancelled = true }
  }, [])

  const handleDownload = async () => {
    if (!image?.url) return
    try {
      const response = await fetch(image.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `image-du-jour-${new Date().toISOString().split('T')[0]}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }

  if (loading) {
    return <DailyImageSkeleton />
  }

  if (!image?.url) {
    return null // Don't show anything if image failed to load
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-neutral-900 h-[200px] cursor-pointer group"
        onClick={() => setIsFullscreen(true)}
      >
        {/* Background image */}
        <Image
          src={image.url}
          alt={image.description}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 430px) 100vw, 430px"
          placeholder={image.blurUrl ? 'blur' : 'empty'}
          blurDataURL={image.blurUrl || undefined}
        />

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 100%)',
          }}
        />

        {/* Top label */}
        <div className="absolute top-4 left-4 z-10">
          <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-white/80">
            <span>✦</span>
            Image du jour
            <span>✦</span>
          </p>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <p className="font-serif italic text-sm text-white/90 line-clamp-1">
            {image.description}
          </p>
          <p className="font-sans text-[10px] text-white/50 mt-1">
            Photo par {image.photographer}
          </p>
        </div>

        {/* Hover indicator */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-black/40 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-white text-xs uppercase tracking-wider">Cliquer pour agrandir</span>
          </div>
        </div>
      </motion.div>

      {/* Fullscreen modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black"
          >
            {/* Close button */}
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white/80 hover:text-white transition-colors"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Download button */}
            <button
              onClick={handleDownload}
              className="absolute top-4 left-4 z-50 flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 text-white/80 hover:text-white transition-colors text-xs uppercase tracking-widest"
              aria-label="Télécharger"
            >
              <Download className="h-4 w-4" />
              Télécharger
            </button>

            {/* Full image */}
            <div className="relative h-full w-full">
              <Image
                src={image.url}
                alt={image.description}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>

            {/* Bottom info overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <p className="font-serif italic text-lg text-white">
                {image.description}
              </p>
              <a
                href={`${image.photographerUrl}?utm_source=agape&utm_medium=referral`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans text-xs text-white/60 hover:text-white/80 transition-colors mt-2 inline-block"
              >
                Photo par {image.photographer} sur Unsplash
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function DailyImageSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-bg-secondary animate-pulse h-[200px]">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
      
      {/* Skeleton content */}
      <div className="absolute top-4 left-4">
        <div className="h-3 w-24 rounded-full bg-bg-tertiary" />
      </div>
      <div className="absolute bottom-4 left-4 right-4 space-y-2">
        <div className="h-4 w-48 rounded-full bg-bg-tertiary" />
        <div className="h-2 w-32 rounded-full bg-bg-tertiary" />
      </div>
    </div>
  )
}
