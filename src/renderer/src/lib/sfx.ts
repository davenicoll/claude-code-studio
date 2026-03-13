/**
 * C-4: SF-style sound effects using Web Audio API
 * Lightweight procedural audio — no external files needed
 */

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

function isEnabled(): boolean {
  return localStorage.getItem('sfx-enabled') !== 'false'
}

/** Short blip for notifications / message received */
export function sfxBlip(): void {
  if (!isEnabled()) return
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08)
  gain.gain.setValueAtTime(0.06, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
  osc.connect(gain).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.1)
}

/** Two-tone confirm sound (task complete, success) */
export function sfxConfirm(): void {
  if (!isEnabled()) return
  const ctx = getCtx()
  const playTone = (freq: number, start: number, dur: number): void => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.04, ctx.currentTime + start)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
    osc.connect(gain).connect(ctx.destination)
    osc.start(ctx.currentTime + start)
    osc.stop(ctx.currentTime + start + dur)
  }
  playTone(523, 0, 0.1)    // C5
  playTone(659, 0.08, 0.15) // E5
}

/** Warning / error buzz */
export function sfxError(): void {
  if (!isEnabled()) return
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(200, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15)
  gain.gain.setValueAtTime(0.04, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
  osc.connect(gain).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.2)
}

/** Subtle hover / select tick */
export function sfxTick(): void {
  if (!isEnabled()) return
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = 1200
  gain.gain.setValueAtTime(0.02, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03)
  osc.connect(gain).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.03)
}
