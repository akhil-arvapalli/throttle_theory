import { useState, useRef } from 'react'

interface SoundRefs {
  ambient: any
  shutter: any
  engineRev: any
}

export function useSound() {
  const [enabled, setEnabled] = useState(false)
  const loaded = useRef(false)
  const sounds = useRef<SoundRefs>({ ambient: null, shutter: null, engineRev: null })

  async function enable() {
    if (!loaded.current) {
      const { Howl } = await import('howler')
      sounds.current.ambient = new Howl({ src: ['/sounds/ambient.mp3'], loop: true, volume: 0.15 })
      sounds.current.shutter = new Howl({ src: ['/sounds/shutter.mp3'], volume: 0.7 })
      sounds.current.engineRev = new Howl({ src: ['/sounds/engineRev.mp3'], volume: 0.6 })
      loaded.current = true
    }
    sounds.current.ambient?.play()
    setEnabled(true)
  }

  function disable() {
    sounds.current.ambient?.pause()
    setEnabled(false)
  }

  function toggle() {
    enabled ? disable() : enable()
  }

  function playShutter() {
    if (enabled && loaded.current) sounds.current.shutter?.play()
  }

  function playEngineRev() {
    if (enabled && loaded.current) sounds.current.engineRev?.play()
  }

  return { enabled, toggle, playShutter, playEngineRev }
}
