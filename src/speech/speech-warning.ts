import type { SpeechLanguage } from './types'

export function speakWarning(text: string, language: SpeechLanguage) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return
  const synthesis = window.speechSynthesis
  const locale = `${language}-IN`
  let spoken = false

  function speakWhenReady() {
    if (spoken) return
    const voices = synthesis.getVoices().filter(voice => voice.localService)
    const voice = voices.find(voice => voice.lang.toLowerCase() === locale.toLowerCase())
      ?? voices.find(voice => voice.lang.toLowerCase().split('-')[0] === language)
    if (!voice) return
    const warning = new SpeechSynthesisUtterance(text)
    warning.voice = voice
    warning.lang = voice.lang
    warning.rate = 0.9
    spoken = true
    synthesis.speak(warning)
  }

  speakWhenReady()
  if (!spoken) synthesis.addEventListener('voiceschanged', speakWhenReady)
  return () => {
    synthesis.removeEventListener('voiceschanged', speakWhenReady)
    if (spoken) synthesis.cancel()
  }
}
