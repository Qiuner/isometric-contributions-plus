export const PALETTES = {
  gitcode: ['ebedf0', 'addac4', '5ab489', '088f4e', '066437'],
  github: ['ebedf0', '9be9a8', '40c463', '30a14e', '216e39'],
  blue: ['ebedf0', 'a5c8ff', '5aa3ff', '2f7ae5', '1f4db3'],
  purple: ['ebedf0', 'd3b3ff', 'b183ff', '8855dd', '5e37a6'],
  gray: ['ebedf0', 'd1d5db', '9ca3af', '6b7280', '374151']
}

const rgbToHexLocal = (rgb) => {
  const sep = rgb.includes(',') ? ',' : ' '
  const parts = rgb.slice(4).split(')')[0].split(sep)
  const toHex = (n) => {
    const h = Number(n).toString(16)
    return h.length === 1 ? '0' + h : h
  }
  return toHex(parts[0]) + toHex(parts[1]) + toHex(parts[2])
}

export const readGitCodePalette = () => {
  const nodes = [...document.querySelectorAll('.activity-contributes-chatBox-tips .colorBox')]
  const colors = nodes.map((el) => {
    const bg = getComputedStyle(el).getPropertyValue('background') || el.style.background || ''
    if (bg.startsWith('rgb')) return rgbToHexLocal(bg)
    return (bg || '#f9f9fb').replace('#', '')
  })
  return colors.length > 0 ? colors : PALETTES.gitcode
}

export const getActivePalette = (name) => {
  if (name === 'auto') return readGitCodePalette()
  return PALETTES[name] || PALETTES.gitcode
}

export const pickColorByBins = (value, max, palette) => {
  if (!max || max <= 0) return palette[0]
  const binsNonZero = Math.max(1, palette.length - 1)
  const idx = Math.min(binsNonZero, Math.ceil((value / max) * binsNonZero))
  return palette[idx]
}

export const resolveAccent = (palette) => {
  const hex = palette?.[palette.length - 1] || '2da44e'
  return '#' + String(hex).replace('#', '')
}
