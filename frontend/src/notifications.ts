const ENABLED_KEY = 'notificationsEnabled'
const CLAIM_TTL_MS = 4000

type AlertKind = 'kitchen-new-order' | 'customer-order-ready'

function createAudioContext() {
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return AudioContextCtor ? new AudioContextCtor() : null
}

let audioContext: AudioContext | null = null

function claimKey(id: string) {
  return `notification-claim:${id}`
}

function defaultEnabled() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(ENABLED_KEY) !== 'false'
}

export function notificationsEnabled() {
  return defaultEnabled()
}

export function setNotificationsEnabled(enabled: boolean) {
  localStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false')
}

export async function enableNotifications() {
  setNotificationsEnabled(true)

  if (typeof window === 'undefined') return false

  if ('Notification' in window && Notification.permission === 'default') {
    try {
      await Notification.requestPermission()
    } catch {
      // ignore permission request failures and fall back to sound only
    }
  }

  if (!audioContext) {
    audioContext = createAudioContext()
  }

  if (!audioContext) return false

  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  return audioContext.state === 'running'
}

export function disableNotifications() {
  setNotificationsEnabled(false)
}

export function claimNotification(id: string) {
  if (typeof window === 'undefined') return true

  const key = claimKey(id)
  const now = Date.now()
  const lastClaim = Number(localStorage.getItem(key) ?? '0')

  if (now - lastClaim < CLAIM_TTL_MS) {
    return false
  }

  localStorage.setItem(key, String(now))
  return true
}

export async function playAlertTone(kind: AlertKind = 'kitchen-new-order') {
  if (typeof window === 'undefined' || !notificationsEnabled()) return

  if (!audioContext) {
    audioContext = createAudioContext()
  }

  if (!audioContext) return

  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  if (audioContext.state !== 'running') return

  const now = audioContext.currentTime
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()

  oscillator.type = 'sine'
  if (kind === 'customer-order-ready') {
    oscillator.frequency.setValueAtTime(660, now)
    oscillator.frequency.setValueAtTime(880, now + 0.12)
  } else {
    oscillator.frequency.setValueAtTime(880, now)
    oscillator.frequency.setValueAtTime(660, now + 0.12)
  }

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)

  oscillator.connect(gain)
  gain.connect(audioContext.destination)

  oscillator.start(now)
  oscillator.stop(now + 0.3)
}

export function canShowBrowserNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function browserNotificationPermission() {
  if (!canShowBrowserNotifications()) return 'unsupported'
  return Notification.permission
}

export function showBrowserNotification(title: string, body: string) {
  if (!notificationsEnabled()) return
  if (!canShowBrowserNotifications()) return
  if (Notification.permission !== 'granted') return

  try {
    new Notification(title, { body })
  } catch {
    // ignore popup failures
  }
}
