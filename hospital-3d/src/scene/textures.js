/**
 * Canvas-drawn textures (no image assets, no font downloads): monitor screens,
 * signs and the soft particle sprite used by the smoke effect.
 */
import * as THREE from 'three'

const cache = new Map()

export function canvasTexture(key, w, h, draw) {
  if (cache.has(key)) return cache.get(key)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  draw(canvas.getContext('2d'), w, h)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  cache.set(key, tex)
  return tex
}

const FONT = 'Inter, "Segoe UI", Roboto, Arial, sans-serif'

export const ecgTexture = () => canvasTexture('ecg', 256, 160, (g, w, h) => {
  g.fillStyle = '#05140F'
  g.fillRect(0, 0, w, h)
  const trace = (y0, color, amp, period) => {
    g.strokeStyle = color
    g.lineWidth = 3
    g.beginPath()
    for (let x = 0; x <= w * 0.72; x += 2) {
      const t = (x % period) / period
      let y = y0
      if (t > 0.42 && t < 0.46) y = y0 - amp
      else if (t >= 0.46 && t < 0.5) y = y0 + amp * 0.45
      else if (t > 0.62 && t < 0.72) y = y0 - amp * 0.18 * Math.sin(((t - 0.62) / 0.1) * Math.PI)
      x === 0 ? g.moveTo(x + 8, y) : g.lineTo(x + 8, y)
    }
    g.stroke()
  }
  trace(42, '#3CF08C', 30, 62)
  trace(92, '#FFD34D', 14, 48)
  trace(132, '#4FC3FF', 10, 80)
  g.fillStyle = '#3CF08C'
  g.font = `bold 34px ${FONT}`
  g.fillText('72', w - 64, 52)
  g.fillStyle = '#FFD34D'
  g.font = `bold 22px ${FONT}`
  g.fillText('98%', w - 64, 100)
  g.fillStyle = '#4FC3FF'
  g.fillText('120/80', w - 72, 140)
})

export const desktopTexture = () => canvasTexture('desktop', 256, 160, (g, w, h) => {
  const grad = g.createLinearGradient(0, 0, w, h)
  grad.addColorStop(0, '#1F4E8C')
  grad.addColorStop(1, '#2C7BC0')
  g.fillStyle = grad
  g.fillRect(0, 0, w, h)
  g.fillStyle = 'rgba(255,255,255,0.9)'
  g.fillRect(14, 14, w - 28, 22)
  g.fillStyle = 'rgba(255,255,255,0.18)'
  for (let i = 0; i < 4; i++) g.fillRect(14, 48 + i * 26, w - 28, 18)
  g.fillStyle = '#7FD1FF'
  g.fillRect(14, 48, 90, 18)
})

export const xrayTexture = () => canvasTexture('xray', 200, 240, (g, w, h) => {
  g.fillStyle = '#0B1220'
  g.fillRect(0, 0, w, h)
  g.strokeStyle = '#DCE8F5'
  g.lineWidth = 7
  g.beginPath(); g.moveTo(w / 2, 26); g.lineTo(w / 2, h - 30); g.stroke()
  g.lineWidth = 5
  for (let i = 0; i < 6; i++) {
    const y = 48 + i * 24
    const r = 64 - Math.abs(i - 2) * 6
    g.beginPath(); g.ellipse(w / 2, y + 12, r, 14, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke()
  }
})

export const tvTexture = () => canvasTexture('tv', 320, 180, (g, w, h) => {
  const grad = g.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#0E7C74')
  grad.addColorStop(1, '#0B4F6C')
  g.fillStyle = grad
  g.fillRect(0, 0, w, h)
  g.fillStyle = '#FFFFFF'
  g.font = `bold 30px ${FONT}`
  g.fillText('PyroNav Hospital', 22, 58)
  g.font = `20px ${FONT}`
  g.fillText('Please wait to be called', 22, 96)
  g.fillStyle = '#F2C230'
  g.fillRect(22, 120, 120, 34)
  g.fillStyle = '#0B1220'
  g.font = `bold 22px ${FONT}`
  g.fillText('A-042', 36, 146)
})

export const signTexture = (text, bg = '#13924A', fg = '#FFFFFF', w = 512, h = 128, icon = 'run') =>
  canvasTexture(`sign:${text}:${bg}:${icon}`, w, h, (g) => {
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(255,255,255,0.9)'
    g.lineWidth = 6
    g.strokeRect(6, 6, w - 12, h - 12)
    let x = 34
    if (icon === 'run') {
      g.fillStyle = fg
      g.beginPath(); g.arc(70, 34, 11, 0, Math.PI * 2); g.fill()
      g.lineWidth = 11; g.strokeStyle = fg; g.lineCap = 'round'
      g.beginPath(); g.moveTo(64, 52); g.lineTo(54, 82); g.lineTo(38, 104); g.stroke()
      g.beginPath(); g.moveTo(54, 82); g.lineTo(76, 96); g.lineTo(84, 114); g.stroke()
      g.beginPath(); g.moveTo(62, 58); g.lineTo(88, 68); g.stroke()
      g.beginPath(); g.moveTo(62, 58); g.lineTo(42, 66); g.stroke()
      x = 112
    } else if (icon === 'cross') {
      g.fillStyle = fg
      g.fillRect(44, 40, 56, 18); g.fillRect(63, 21, 18, 56)
      x = 120
    }
    g.fillStyle = fg
    g.font = `800 ${Math.round(h * 0.4)}px ${FONT}`
    g.textBaseline = 'middle'
    g.fillText(text, x, h / 2 + 2)
  })

export const smokeSprite = () => canvasTexture('smoke-sprite', 128, 128, (g, w) => {
  const r = w / 2
  const grad = g.createRadialGradient(r, r, 0, r, r, r)
  grad.addColorStop(0, 'rgba(255,255,255,0.85)')
  grad.addColorStop(0.45, 'rgba(255,255,255,0.35)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, w, w)
})

/** Small live display on CO detectors and current monitors (redrawn on change). */
export function makeDisplay() {
  const canvas = document.createElement('canvas')
  canvas.width = 192
  canvas.height = 96
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  const draw = (label, value, unit, color) => {
    const g = canvas.getContext('2d')
    g.fillStyle = '#0B1512'
    g.fillRect(0, 0, 192, 96)
    g.fillStyle = color
    g.font = `bold 22px ${FONT}`
    g.fillText(label, 10, 28)
    g.font = `bold 44px ${FONT}`
    g.fillText(value, 10, 80)
    g.font = `bold 22px ${FONT}`
    g.fillText(unit, 140, 80)
    tex.needsUpdate = true
  }
  return { tex, draw }
}
