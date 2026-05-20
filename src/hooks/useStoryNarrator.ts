import { useState, useRef, useEffect } from 'react'

export function useStoryNarrator() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [currentSpeed, setCurrentSpeed] = useState(1)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    setIsSupported('speechSynthesis' in window)
  }, [])

  const getFrenchVoice = (): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices()
    return (
      voices.find(v => v.lang === 'fr-FR' && v.localService) ||
      voices.find(v => v.lang === 'fr-FR') ||
      voices.find(v => v.lang.startsWith('fr')) ||
      null
    )
  }

  const speak = (text: string) => {
    if (!isSupported) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'fr-FR'
    utterance.rate = currentSpeed * 0.85
    utterance.pitch = 0.9
    utterance.volume = 1.0

    const voice = getFrenchVoice()
    if (voice) utterance.voice = voice

    utterance.onstart = () => { setIsPlaying(true); setIsPaused(false) }
    utterance.onend = () => { setIsPlaying(false); setIsPaused(false) }
    utterance.onerror = () => { setIsPlaying(false); setIsPaused(false) }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  const pause = () => {
    window.speechSynthesis.pause()
    setIsPaused(true)
    setIsPlaying(false)
  }

  const resume = () => {
    window.speechSynthesis.resume()
    setIsPaused(false)
    setIsPlaying(true)
  }

  const stop = () => {
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
  }

  const changeSpeed = (rate: number) => {
    setCurrentSpeed(rate)
    if (isPlaying && utteranceRef.current) {
      const text = utteranceRef.current.text
      stop()
      setTimeout(() => speak(text), 100)
    }
  }

  return {
    isPlaying,
    isPaused,
    isSupported,
    currentSpeed,
    speak,
    pause,
    resume,
    stop,
    changeSpeed,
  }
}
