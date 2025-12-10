import { toArray, groupBy, last } from 'lodash-es'
import { pickColorByBins, getActivePalette, resolveAccent, readGitCodePalette } from './palette.js'
import mockData from './mock/contributions.json'
import { fetchAccessToken, fetchContributions, readAccessTokenCookie, readRefreshTokenCookie } from './api.js'
// 语言本地化开关：true 则中文文案（用于统计卡片与日期格式）
let isZh = true
let dateFormat = new Intl.DateTimeFormat(isZh ? 'zh-CN' : 'en-US', {
  month: isZh ? 'numeric' : 'short',
  day: 'numeric',
  timeZone: 'UTC'
})
const sameDay = (d1, d2) => d1.toDateString() === d2.toDateString()

let days
let weeks
let calendarGraph
let contributionsBox
let yearTotal = 0
let averageCount = 0
let maxCount = 0
let countTotal = 0
let streakLongest = 0
let streakCurrent = 0
let bestDay = null
let firstDay = null
let lastDay = null
let datesTotal = null
let datesLongest = null
let datesCurrent = null
let toggleSetting = 'cubes'
let paletteName = 'gitcode'
let customPalette = null
let username = ''
let accessToken = ''
let refreshToken = ''
let selectedYear = null
let yearReloadTimer = null
let styleName = 'normal'
let dataSourceType = 'none'
let originalLegendPalette = null
let baseColorHex = 'e9ecef'
const STYLES = {
  slim: { size: 14, sizeX: 16, sizeY: 10, base: 8, maxHeight: 80 },
  normal: { size: 16, base: 16, maxHeight: 90 },
  wide: { size: 14, sizeX: 16, sizeY: 20, base: 16, maxHeight: 80 },
  thickbase: { size: 12, base: 12, maxHeight: 80 },
  tall: { size: 12, base: 8, maxHeight: 120 }
}
const getActiveStyle = (name) => STYLES[name] || STYLES.normal
const mask = (t) => {
  if (!t) return ''
  const s = String(t)
  if (s.length <= 10) return s.slice(0, 1) + '***' + s.slice(-1)
  return s.slice(0, 6) + '...' + s.slice(-4)
}

const resetValues = () => {
  yearTotal = 0
  averageCount = 0
  maxCount = 0
  streakLongest = 0
  streakCurrent = 0
  bestDay = null
  firstDay = null
  lastDay = null
  datesLongest = null
  datesCurrent = null
  dataSourceType = 'none'
}

// 读取用户在浏览器存储中的视图偏好（2D/3D）
const getSettings = () => {
  return new Promise((resolve) => {
    // Check for user preference, if chrome.storage is available.
    // The storage API is not supported in content scripts.
    // https://developer.mozilla.org/Add-ons/WebExtensions/Chrome_incompatibilities#storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['toggleSetting', 'paletteName', 'paletteName_gitcode', 'styleName', 'username', 'accessToken', 'refreshToken', 'language', 'language_gitcode', 'customBinsPalette'], (settings) => {
        toggleSetting = settings.toggleSetting ?? 'cubes'
        paletteName = settings.paletteName ?? settings.paletteName_gitcode ?? 'gitcode'
        styleName = settings.styleName ?? 'normal'
        username = settings.username ?? ''
        accessToken = settings.accessToken ?? ''
        refreshToken = settings.refreshToken ?? ''
        const langRaw = settings.language ?? settings.language_gitcode
        if (langRaw) {
          const lang = String(langRaw || '').toLowerCase()
          isZh = lang !== 'en'
          dateFormat = new Intl.DateTimeFormat(isZh ? 'zh-CN' : 'en-US', { month: isZh ? 'numeric' : 'short', day: 'numeric', timeZone: 'UTC' })
        }
        customPalette = Array.isArray(settings.customBinsPalette) ? settings.customBinsPalette.map((x)=>String(x).replace('#','')) : null
        console.debug('settings:loaded', { toggleSetting, paletteName, username, accessToken: mask(accessToken), refreshToken: mask(refreshToken) })
        if (!accessToken || !refreshToken) {
          const at1 = readAccessTokenCookie()
          const rt1 = readRefreshTokenCookie()
          if (at1) {
            accessToken = at1
            persistSetting('accessToken', accessToken)
            console.debug('settings:cookieAccessToken', { accessToken: mask(accessToken) })
          }
          if (rt1) {
            refreshToken = rt1
            persistSetting('refreshToken', refreshToken)
            console.debug('settings:cookieRefreshToken', { refreshToken: mask(refreshToken) })
          }
          if (!accessToken || !refreshToken) {
            chrome.runtime.sendMessage({ type: 'readCookies' }, (t) => {
              if (t?.accessToken && !accessToken) {
                accessToken = t.accessToken
                persistSetting('accessToken', accessToken)
                console.debug('settings:bgAccessToken', { accessToken: mask(accessToken) })
              }
              if (t?.refreshToken && !refreshToken) {
                refreshToken = t.refreshToken
                persistSetting('refreshToken', refreshToken)
                console.debug('settings:bgRefreshToken', { refreshToken: mask(refreshToken) })
              }
            })
          }
        }
        resolve('Settings loaded')
      })
    } else {
      toggleSetting = localStorage.toggleSetting ?? 'cubes'
      paletteName = localStorage.paletteName ?? localStorage.paletteName_gitcode ?? 'gitcode'
      styleName = localStorage.styleName ?? 'normal'
      username = localStorage.username ?? ''
      accessToken = localStorage.accessToken ?? ''
      refreshToken = localStorage.refreshToken ?? ''
      const langLocal = localStorage.language ?? localStorage.language_gitcode
      if (langLocal) {
        const lang = String(langLocal || '').toLowerCase()
        isZh = lang !== 'en'
        dateFormat = new Intl.DateTimeFormat(isZh ? 'zh-CN' : 'en-US', { month: isZh ? 'numeric' : 'short', day: 'numeric', timeZone: 'UTC' })
      }
      console.debug('settings:loadedLocal', { toggleSetting, paletteName, username, accessToken: mask(accessToken), refreshToken: mask(refreshToken) })
      if (!accessToken || !refreshToken) {
        const at1 = readAccessTokenCookie()
        const rt1 = readRefreshTokenCookie()
        if (at1) {
          accessToken = at1
          persistSetting('accessToken', accessToken)
          console.debug('settings:cookieAccessTokenLocal', { accessToken: mask(accessToken) })
        }
        if (rt1) {
          refreshToken = rt1
          persistSetting('refreshToken', refreshToken)
          console.debug('settings:cookieRefreshTokenLocal', { refreshToken: mask(refreshToken) })
        }
        if (!accessToken || !refreshToken) {
          chrome.runtime.sendMessage({ type: 'readCookies' }, (t) => {
            if (t?.accessToken && !accessToken) {
              accessToken = t.accessToken
              persistSetting('accessToken', accessToken)
              console.debug('settings:bgAccessTokenLocal', { accessToken: mask(accessToken) })
            }
            if (t?.refreshToken && !refreshToken) {
              refreshToken = t.refreshToken
              persistSetting('refreshToken', refreshToken)
              console.debug('settings:bgRefreshTokenLocal', { refreshToken: mask(refreshToken) })
            }
          })
        }
      }
      resolve('Settings loaded')
    }
  })
}

// 持久化用户设置到浏览器（chrome.storage 或 localStorage）
const persistSetting = (key, value) => {
  if (chrome && chrome.storage) {
    const object = {}
    object[key] = value
    chrome.storage.local.set(object)
  } else {
    localStorage[key] = value
  }
}

// 注入扩展 UI：在原有贡献图前插入包裹容器与 <canvas>，并在标题附近加入 2D/3D 切换按钮
// GitCode DOM：在 generateIsometricChart 中已根据站点差异设置 contributionsBox
const initUI = () => {
  if (!contributionsBox && !calendarGraph) return
  const contributionsWrapper = document.createElement('div')
  contributionsWrapper.className = 'ic-contributions-wrapper position-relative'
  if (calendarGraph && calendarGraph.before) {
    calendarGraph.before(contributionsWrapper)
  } else if (contributionsBox && contributionsBox.prepend) {
    contributionsBox.prepend(contributionsWrapper)
  } else {
    return
  }

  const canvas = document.createElement('canvas')
  canvas.id = 'isometric-contributions'
  canvas.width = 1400
  canvas.height = 600
  canvas.style.width = '100%'
  contributionsWrapper.append(canvas)

  // 在标题或首元素前插入切换按钮（兼容 GitCode 页面结构）
  if (!contributionsBox) return
  let insertLocation =
    contributionsBox.querySelector('p.activity-contributes-title') ||
    contributionsBox.firstElementChild ||
    contributionsBox

  const buttonGroup = document.createElement('div')
  buttonGroup.className = 'BtnGroup mt-1 ml-3 position-relative top-0 float-right'

  const squaresButton = document.createElement('button')
  squaresButton.innerHTML = '2D'
  squaresButton.className = 'ic-toggle-option squares btn BtnGroup-item btn-sm py-0 px-1'
  squaresButton.dataset.icOption = 'squares'
  squaresButton.addEventListener('click', handleViewToggle)
  if (toggleSetting === 'squares') {
    squaresButton.classList.add('selected')
  }

  const cubesButton = document.createElement('button')
  cubesButton.innerHTML = '3D'
  cubesButton.className = 'ic-toggle-option cubes btn BtnGroup-item btn-sm py-0 px-1'
  cubesButton.dataset.icOption = 'cubes'
  cubesButton.addEventListener('click', handleViewToggle)
  if (toggleSetting === 'cubes') {
    cubesButton.classList.add('selected')
  }

  buttonGroup.append(squaresButton)
  buttonGroup.append(cubesButton)
  const paletteSelect = document.createElement('select')
  paletteSelect.className = 'ic-palette-select btn btn-sm ml-2'
  const options = [
    { value: 'custom', label: isZh ? '自定义' : 'Custom' },
    { value: 'gitcode', label: isZh ? '绿色（GitCode）' : 'Green (GitCode)' },
    { value: 'github', label: isZh ? '绿色（GitHub）' : 'Green (GitHub)' },
    { value: 'blue', label: isZh ? '蓝色' : 'Blue' },
    { value: 'purple', label: isZh ? '紫色' : 'Purple' },
    { value: 'gray', label: isZh ? '灰色' : 'Gray' }
  ]
  for (const opt of options) {
    const o = document.createElement('option')
    o.value = opt.value
    o.textContent = opt.label
    paletteSelect.append(o)
  }
  paletteSelect.value = paletteName
  paletteSelect.addEventListener('change', (e) => {
    paletteName = e.target.value
    persistSetting('paletteName', paletteName)
    applyPaletteAndRerender()
  })
  buttonGroup.append(paletteSelect)

  const styleSelect = document.createElement('select')
  styleSelect.className = 'ic-style-select btn btn-sm ml-2'
  const styleOpts = [
    { value: 'slim', label: isZh ? '细瘦' : 'Slim' },
    { value: 'normal', label: isZh ? '标准' : 'Normal' },
    { value: 'wide', label: isZh ? '宽胖' : 'Wide' },
    { value: 'thickbase', label: isZh ? '小图' : 'Thick Base' },
    { value: 'tall', label: isZh ? '高柱' : 'Tall' }
  ]
  for (const opt of styleOpts) {
    const o = document.createElement('option')
    o.value = opt.value
    o.textContent = opt.label
    styleSelect.append(o)
  }
  styleSelect.value = styleName
  styleSelect.addEventListener('change', (e) => {
    styleName = e.target.value
    persistSetting('styleName', styleName)
    applyPaletteAndRerender()
  })
  buttonGroup.append(styleSelect)

  insertLocation.before(buttonGroup)

  setContainerViewType(toggleSetting)
  attachYearChangeHandlers()
  originalLegendPalette = originalLegendPalette || readGitCodePalette()
  updateLegendPalette()
  attachLegendObserver()
}

const handleViewToggle = (event) => {
  setContainerViewType(event.target.dataset.icOption)

  for (const toggle of document.querySelectorAll('.ic-toggle-option')) {
    toggle.classList.remove('selected')
  }

  event.target.classList.add('selected')

  persistSetting('toggleSetting', event.target.dataset.icOption)
  toggleSetting = event.target.dataset.icOption

  // Apply user preference
  document.querySelector(`.ic-toggle-option.${toggleSetting}`).classList.add('selected')
  contributionsBox.classList.add(`ic-${toggleSetting}`)
  if (toggleSetting === 'squares') {
    resetLegendPalette()
  } else {
    updateLegendPalette()
  }
}

// 切换容器的显示模式：ic-squares（显示原生 2D）/ ic-cubes（显示 3D）
const setContainerViewType = (type) => {
  if (type === 'squares') {
    contributionsBox.classList.remove('ic-cubes')
    contributionsBox.classList.add('ic-squares')
  } else {
    contributionsBox.classList.remove('ic-squares')
    contributionsBox.classList.add('ic-cubes')
  }
}

 

const getWeekKey = (date) => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  const diff = (day + 6) % 7
  d.setUTCDate(d.getUTCDate() - diff)
  return d.toISOString().slice(0, 10)
}

 

const loadStatsGitCode = async () => {
  const USE_MOCK = true
  if (!accessToken || !refreshToken) {
    const at1 = readAccessTokenCookie()
    const rt1 = readRefreshTokenCookie()
    if (at1) {
      accessToken = at1
      persistSetting('accessToken', accessToken)
      console.debug('load:cookieAccessToken', { accessToken: mask(accessToken) })
    }
    if (rt1) {
      refreshToken = rt1
      persistSetting('refreshToken', refreshToken)
      console.debug('load:cookieRefreshToken', { refreshToken: mask(refreshToken) })
    }
    if (!accessToken || !refreshToken) {
      await new Promise((res) => chrome.runtime.sendMessage({ type: 'readCookies' }, (t) => {
        if (t?.accessToken && !accessToken) {
          accessToken = t.accessToken
          persistSetting('accessToken', accessToken)
          console.debug('load:bgAccessToken', { accessToken: mask(accessToken) })
        }
        if (t?.refreshToken && !refreshToken) {
          refreshToken = t.refreshToken
          persistSetting('refreshToken', refreshToken)
          console.debug('load:bgRefreshToken', { refreshToken: mask(refreshToken) })
        }
        res()
      }))
    }
  }
  let canFetch = username && accessToken
  console.debug('load:start', { username, accessToken: mask(accessToken), refreshToken: mask(refreshToken), canFetch })
  let parsed = []
  if (canFetch) {
    const rolling = isRollingYearMode()
    const yearParam = rolling ? undefined : (selectedYear || getSelectedYearFromDOM() || undefined)
    const list = await fetchContributions(username, accessToken, yearParam)
    console.debug('load:afterFetchContrib', { len: list.length })
    if (list.length === 0) {
      const t = await fetchAccessToken(accessToken)
      console.debug('load:refreshWithAccessToken', { ok: !!t, access_token: mask(t?.access_token), refresh_token: mask(t?.refresh_token) })
      if (t && t.access_token) {
        accessToken = t.access_token
        refreshToken = t.refresh_token || ''
        persistSetting('accessToken', accessToken)
        persistSetting('refreshToken', refreshToken)
        parsed = await fetchContributions(username, accessToken, yearParam)
        console.debug('load:afterFetchContribRefreshed', { len: parsed.length })
      }
    } else {
      parsed = list
    }
  } else if (username && refreshToken) {
    const t = await fetchAccessToken(refreshToken)
    console.debug('load:refreshWithRefreshToken', { ok: !!t, access_token: mask(t?.access_token), refresh_token: mask(t?.refresh_token) })
    if (t && t.access_token) {
      accessToken = t.access_token
      refreshToken = t.refresh_token || refreshToken
      persistSetting('accessToken', accessToken)
      persistSetting('refreshToken', refreshToken)
      const rolling2 = isRollingYearMode()
      const yearParam2 = rolling2 ? undefined : (selectedYear || getSelectedYearFromDOM() || undefined)
      parsed = await fetchContributions(username, accessToken, yearParam2)
      console.debug('load:afterFetchContribRefreshed2', { len: parsed.length })
      canFetch = parsed.length > 0
    }
  }
  if (parsed.length > 0) {
    dataSourceType = 'api'
    const palette = getActivePaletteLocal()
    maxCount = parsed.reduce((m, d) => (d.count > m ? d.count : m), 0)
    const enriched = parsed.map((d) => {
      const color = pickColorByBins(d.count, maxCount, palette)
      return { date: d.date, count: d.count, color, week: getWeekKey(d.date) }
    })
    days = enriched.sort((a, b) => a.date.getTime() - b.date.getTime())
    weeks = toArray(groupBy(days, 'week'))
    const currentWeekDays = last(weeks)
    let temporaryStreak = 0
    let temporaryStreakStart = null
    let longestStreakStart = null
    let longestStreakEnd = null
    for (const d of days) {
      const currentDayCount = d.count
      yearTotal += currentDayCount
      if (days[0] === d) {
        firstDay = d.date
      }
      if (sameDay(d.date, new Date())) {
        lastDay = d.date
      } else if (!lastDay && days.at(-1) === d) {
        lastDay = d.date
      }
      if (currentDayCount === maxCount) {
        bestDay = d.date
      }
      if (currentDayCount > 0) {
        if (temporaryStreak === 0) temporaryStreakStart = d.date
        temporaryStreak++
        if (temporaryStreak >= streakLongest) {
          longestStreakStart = temporaryStreakStart
          longestStreakEnd = d.date
          streakLongest = temporaryStreak
        }
      } else {
        temporaryStreak = 0
        temporaryStreakStart = null
      }
    }
    // removed weekly aggregate (unused)
    const reversedDays = [...days].reverse()
    if (reversedDays.length > 0) {
      currentStreakEnd = reversedDays[0].date
    }
    for (let i = 0; i < reversedDays.length; i++) {
      const currentDayCount = reversedDays[i].count
      if (i === 0 && currentDayCount === 0 && reversedDays[1]) {
        currentStreakEnd = reversedDays[1].date
        continue
      }
      if (currentDayCount > 0) {
        streakCurrent++
        currentStreakStart = reversedDays[i].date
      } else {
        break
      }
    }
    if (streakCurrent > 0) {
      currentStreakStart = dateFormat.format(currentStreakStart)
      currentStreakEnd = dateFormat.format(currentStreakEnd)
      datesCurrent = `${currentStreakStart} → ${currentStreakEnd}`
    } else {
      datesCurrent = isZh ? '无当前连续' : 'No current streak'
    }
    countTotal = yearTotal.toLocaleString()
    const dateFirst = dateFormat.format(firstDay)
    const dateLast = dateFormat.format(lastDay)
    datesTotal = `${dateFirst} → ${dateLast}`
    const dayDifference = datesDayDifference(firstDay, lastDay)
    averageCount = precisionRound(yearTotal / dayDifference, 2)
    if (streakLongest > 0 && longestStreakStart && longestStreakEnd) {
      const longestStreakStartFmt = dateFormat.format(longestStreakStart)
      const longestStreakEndFmt = dateFormat.format(longestStreakEnd)
      datesLongest = `${longestStreakStartFmt} → ${longestStreakEndFmt}`
    } else {
      datesLongest = isZh ? '无最长连续' : 'No longest streak'
    }
    // removed weekly text (unused)
    return
  }
  if (USE_MOCK && mockData && !Array.isArray(mockData.pattern)) {
    dataSourceType = 'mock'
    const palette = getActivePalette(paletteName)
    const year = 2025
    const start = new Date(`${year}-01-01`)
    const end = new Date(`${year}-12-31`)
    const dateStrings = []
    const values = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const key = `${yyyy}-${mm}-${dd}`
      dateStrings.push(key)
      values.push(Number(mockData[key] ?? 0))
    }
    parsed = []
    for (let i = 0; i < dateStrings.length; i++) {
      const ds = dateStrings[i]
      const v = Number(values[i] ?? 0)
      const date = new Date(ds)
      parsed.push({ date, count: v })
    }
    maxCount = parsed.reduce((m, d) => (d.count > m ? d.count : m), 0)
    const enriched = parsed.map((d) => {
      const color = pickColorByBins(d.count, maxCount, palette)
      return { date: d.date, count: d.count, color, week: getWeekKey(d.date) }
    })
    days = enriched.sort((a, b) => a.date.getTime() - b.date.getTime())
    weeks = toArray(groupBy(days, 'week'))
    const currentWeekDays = last(weeks)
    let temporaryStreak = 0
    let temporaryStreakStart = null
    let longestStreakStart = null
    let longestStreakEnd = null
    for (const d of days) {
      const currentDayCount = d.count
      yearTotal += currentDayCount
      if (days[0] === d) {
        firstDay = d.date
      }
      if (sameDay(d.date, new Date())) {
        lastDay = d.date
      } else if (!lastDay && days.at(-1) === d) {
        lastDay = d.date
      }
      if (currentDayCount === maxCount) {
        bestDay = d.date
      }
      if (currentDayCount > 0) {
        if (temporaryStreak === 0) temporaryStreakStart = d.date
        temporaryStreak++
        if (temporaryStreak >= streakLongest) {
          longestStreakStart = temporaryStreakStart
          longestStreakEnd = d.date
          streakLongest = temporaryStreak
        }
      } else {
        temporaryStreak = 0
        temporaryStreakStart = null
      }
    }
    // removed weekly aggregate (unused)
    const reversedDays = [...days].reverse()
    if (reversedDays.length > 0) {
      currentStreakEnd = reversedDays[0].date
    }
    for (let i = 0; i < reversedDays.length; i++) {
      const currentDayCount = reversedDays[i].count
      if (i === 0 && currentDayCount === 0 && reversedDays[1]) {
        currentStreakEnd = reversedDays[1].date
        continue
      }
      if (currentDayCount > 0) {
        streakCurrent++
        currentStreakStart = reversedDays[i].date
      } else {
        break
      }
    }
    if (streakCurrent > 0) {
      currentStreakStart = dateFormat.format(currentStreakStart)
      currentStreakEnd = dateFormat.format(currentStreakEnd)
      datesCurrent = `${currentStreakStart} → ${currentStreakEnd}`
    } else {
      datesCurrent = isZh ? '无当前连续' : 'No current streak'
    }
    countTotal = yearTotal.toLocaleString()
    const dateFirst = dateFormat.format(firstDay)
    const dateLast = dateFormat.format(lastDay)
    datesTotal = `${dateFirst} → ${dateLast}`
    const dayDifference = datesDayDifference(firstDay, lastDay)
    averageCount = precisionRound(yearTotal / dayDifference, 2)
    if (streakLongest > 0 && longestStreakStart && longestStreakEnd) {
      const longestStreakStartFmt = dateFormat.format(longestStreakStart)
      const longestStreakEndFmt = dateFormat.format(longestStreakEnd)
      datesLongest = `${longestStreakStartFmt} → ${longestStreakEndFmt}`
    } else {
      datesLongest = isZh ? '无最长连续' : 'No longest streak'
    }
    // removed weekly text (unused)
    return
  }
  const chartDom = document.querySelector('#userActive')
  const echarts = globalThis.echarts
  let instance = null
  if (chartDom && echarts) {
    const id = chartDom.getAttribute('_echarts_instance_')
    instance = echarts.getInstanceByDom?.(chartDom) || (id ? echarts.getInstanceById?.(id) : null)
  }

  let dateStrings = []
  let values = []
  if (instance?.getOption) {
    const opt = instance.getOption()
    const xData = opt?.xAxis?.[0]?.data
    const sData = opt?.series?.[0]?.data
    if (Array.isArray(xData) && Array.isArray(sData) && xData.length === sData.length) {
      dateStrings = xData
      values = sData.map((d) => (typeof d === 'object' && d !== null ? (Array.isArray(d) ? d[1] ?? d[2] ?? 0 : d.value ?? d.val ?? d.count ?? 0) : d))
    } else if (Array.isArray(sData)) {
      dateStrings = sData.map((d) => (Array.isArray(d) ? d[0] ?? '' : d.date ?? d.name ?? d.label ?? ''))
      values = sData.map((d) => (Array.isArray(d) ? d[2] ?? d[1] ?? 0 : d.value ?? d.val ?? d.count ?? 0))
    }
  }

  const palette = getActivePaletteLocal()
  parsed = []
  for (let i = 0; i < dateStrings.length; i++) {
    const ds = dateStrings[i]
    const v = Number(values[i] ?? 0)
    const date = new Date(ds)
    parsed.push({ date, count: v })
  }

  if (parsed.length === 0) {
    days = []
    weeks = []
    return
  }

  dataSourceType = 'echarts'
  maxCount = parsed.reduce((m, d) => (d.count > m ? d.count : m), 0)
  const enriched = parsed.map((d) => {
    const color = pickColorByBins(d.count, maxCount, palette)
    return { date: d.date, count: d.count, color, week: getWeekKey(d.date) }
  })

  days = enriched.sort((a, b) => a.date.getTime() - b.date.getTime())
  weeks = toArray(groupBy(days, 'week'))
  const currentWeekDays = last(weeks)
  let temporaryStreak = 0
  let temporaryStreakStart = null
  let longestStreakStart = null
  let longestStreakEnd = null

  for (const d of days) {
    const currentDayCount = d.count
    yearTotal += currentDayCount
    if (days[0] === d) {
      firstDay = d.date
    }
    if (sameDay(d.date, new Date())) {
      lastDay = d.date
    } else if (!lastDay && days.at(-1) === d) {
      lastDay = d.date
    }
    if (currentDayCount === maxCount) {
      bestDay = d.date
    }
    if (currentDayCount > 0) {
      if (temporaryStreak === 0) temporaryStreakStart = d.date
      temporaryStreak++
      if (temporaryStreak >= streakLongest) {
        longestStreakStart = temporaryStreakStart
        longestStreakEnd = d.date
        streakLongest = temporaryStreak
      }
    } else {
      temporaryStreak = 0
      temporaryStreakStart = null
    }
  }

  // removed weekly aggregate (unused)

  const reversedDays = [...days].reverse()
  if (reversedDays.length > 0) {
    currentStreakEnd = reversedDays[0].date
  }
  for (let i = 0; i < reversedDays.length; i++) {
    const currentDayCount = reversedDays[i].count
    if (i === 0 && currentDayCount === 0 && reversedDays[1]) {
      currentStreakEnd = reversedDays[1].date
      continue
    }
    if (currentDayCount > 0) {
      streakCurrent++
      currentStreakStart = reversedDays[i].date
    } else {
      break
    }
  }

  if (streakCurrent > 0) {
    currentStreakStart = dateFormat.format(currentStreakStart)
    currentStreakEnd = dateFormat.format(currentStreakEnd)
    datesCurrent = `${currentStreakStart} → ${currentStreakEnd}`
  } else {
    datesCurrent = isZh ? '无当前连续' : 'No current streak'
  }

  countTotal = yearTotal.toLocaleString()
  const dateFirst = dateFormat.format(firstDay)
  const dateLast = dateFormat.format(lastDay)
  datesTotal = `${dateFirst} → ${dateLast}`

  const dayDifference = datesDayDifference(firstDay, lastDay)
  averageCount = precisionRound(yearTotal / dayDifference, 2)

  if (streakLongest > 0 && longestStreakStart && longestStreakEnd) {
    const longestStreakStartFmt = dateFormat.format(longestStreakStart)
    const longestStreakEndFmt = dateFormat.format(longestStreakEnd)
    datesLongest = `${longestStreakStartFmt} → ${longestStreakEndFmt}`
  } else {
    datesLongest = isZh ? '无最长连续' : 'No longest streak'
  }

  // removed weekly text (unused)
}
const renderIsometricChart = () => {
  const style = getActiveStyle(styleName)
  const SX = style.sizeX ?? style.size
  const SY = style.sizeY ?? style.size
  const BASE = style.base
  const MAX_HEIGHT = style.maxHeight
  const canvas = document.querySelector('#isometric-contributions')
  if (!canvas) return
  const point = new obelisk.Point(260, 110)
  const pixelView = new obelisk.PixelView(canvas, point)

  let col = 0
  for (const w of weeks) {
    let row = 0
    for (const d of w) {
      const currentDayCount = d.count
      let cubeHeight = BASE
      if (maxCount > 0) {
        cubeHeight += Math.round((MAX_HEIGHT / maxCount) * currentDayCount)
      }
      const dimension = new obelisk.CubeDimension(SX, SY, cubeHeight)
      const hex = currentDayCount === 0 ? 'e9ecef' : d.color
      const color = new obelisk.CubeColor().getByHorizontalColor(Number.parseInt(hex, 16))
      const cube = new obelisk.Cube(dimension, color, false)
      const p3d = new obelisk.Point3D(SX * col, SY * row, 0)
      pixelView.renderObject(cube, p3d)
      row++
    }
    col++
  }
}

const applyPaletteAndRerender = () => {
  const palette = getActivePaletteLocal()
  for (const d of days || []) {
    d.color = pickColorByBins(d.count, maxCount, palette)
  }
  const canvas = document.querySelector('#isometric-contributions')
  if (canvas) {
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
  renderIsometricChart()
  renderCanvasHud()
  updateLegendPalette()
}

const reloadDataAndRender = async () => {
  if (!isUserProfilePath()) {
    detachUI()
    return
  }
  resetValues()
  if (!document.querySelector('.ic-contributions-wrapper')) {
    calendarGraph = document.querySelector('#userActive') || document.querySelector('.page-user-activities')
    contributionsBox = document.querySelector('.page-user-activities') || document.querySelector('.page-user-info')
    if (!contributionsBox && !calendarGraph) return
    initUI()
  }
  selectedYear = getSelectedYearFromDOM() || selectedYear
  await loadStatsGitCode()
  const canvas = document.querySelector('#isometric-contributions')
  if (canvas) {
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
  renderIsometricChart()
  renderCanvasHud()
  updateLegendPalette()
  attachLegendObserver()
}

const attachYearChangeHandlers = () => {
  const scope = contributionsBox || document
  const yearUl = scope.querySelector('ul.activity-contributes-yearList') || document.querySelector('ul.activity-contributes-yearList')
  if (yearUl && !yearUl.dataset.icBound) {
    yearUl.dataset.icBound = '1'
    yearUl.addEventListener('click', () => {
      if (yearReloadTimer) clearTimeout(yearReloadTimer)
      yearReloadTimer = setTimeout(() => {
        selectedYear = getSelectedYearFromDOM() || selectedYear
        reloadDataAndRender()
      }, 200)
    }, { passive: true })
  }
  const titleP = scope.querySelector('p.activity-contributes-title') || document.querySelector('p.activity-contributes-title')
  if (titleP && !titleP.dataset.icObserved) {
    titleP.dataset.icObserved = '1'
    const obs = new MutationObserver(() => {
      if (yearReloadTimer) clearTimeout(yearReloadTimer)
      yearReloadTimer = setTimeout(() => {
        selectedYear = getSelectedYearFromDOM() || selectedYear
        reloadDataAndRender()
      }, 200)
    })
    obs.observe(titleP, { characterData: true, subtree: true, childList: true })
  }
}

const getUsernameFromLocation = () => {
  if (!isUserProfilePath()) return ''
  const path = location.pathname || ''
  const segs = path.split('/').filter(Boolean)
  return decodeURIComponent(segs[0] || '')
}

const setupLocationWatcher = () => {
  const apply = () => {
    const eligible = isUserProfilePath()
    if (!eligible) {
      detachUI()
      return
    }
    const u = getUsernameFromLocation()
    if (u && u !== username) {
      username = u
      persistSetting('username', username)
      reloadDataAndRender()
    }
  }
  const ps = history.pushState
  history.pushState = function () {
    const r = ps.apply(history, arguments)
    apply()
    return r
  }
  const rs = history.replaceState
  history.replaceState = function () {
    const r = rs.apply(history, arguments)
    apply()
    return r
  }
  addEventListener('popstate', apply)
  addEventListener('load', apply)
  if (document.readyState === 'complete') apply()
}

const updateLegendPalette = () => {
  if (contributionsBox && contributionsBox.classList.contains('ic-squares')) {
    resetLegendPalette()
    return
  }
  const palette = getActivePaletteLocal()
  const boxes = document.querySelectorAll('.activity-contributes-chatBox-tips .colorBox')
  if (!boxes || boxes.length === 0) return
  applyLegendStyleSheet(palette)
  if (paletteName === 'custom' && Array.isArray(customPalette) && customPalette.length === 4) {
    for (let i = 1; i < boxes.length && i <= 4; i++) {
      boxes[i].style.background = '#' + String(customPalette[i - 1]).replace('#', '')
    }
  } else {
    for (let i = 0; i < boxes.length && i < palette.length; i++) {
      boxes[i].style.background = '#' + String(palette[i]).replace('#', '')
    }
  }
}

const resetLegendPalette = () => {
  const palette = originalLegendPalette || readGitCodePalette()
  const boxes = document.querySelectorAll('.activity-contributes-chatBox-tips .colorBox')
  if (!boxes || boxes.length === 0) return
  applyLegendStyleSheet(palette)
  for (let i = 0; i < boxes.length && i < palette.length; i++) {
    boxes[i].style.background = '#' + String(palette[i]).replace('#', '')
  }
}

const attachLegendObserver = () => {
  const wrap = document.querySelector('.activity-contributes-chatBox-tips')
  if (wrap && !wrap.dataset.icLegendObserved) {
    wrap.dataset.icLegendObserved = '1'
    const obs = new MutationObserver(() => updateLegendPalette())
    obs.observe(wrap, { childList: true, subtree: true, attributes: true, attributeFilter: ['style','class'] })
  }
}

const applyLegendStyleSheet = (palette) => {
  const id = 'ic-legend-style'
  const style = document.getElementById(id)
  if (style) style.remove()
}

const isUserProfilePath = () => {
  const segs = (location.pathname || '').split('/').filter(Boolean)
  if (segs.length !== 1) return false
  const cand = decodeURIComponent(segs[0])
  const reserved = new Set(['dashboard'])
  if (reserved.has(cand.toLowerCase())) return false
  return /^[A-Za-z0-9._-]+$/.test(cand)
}

const detachUI = () => {
  const wrap = document.querySelector('.ic-contributions-wrapper')
  if (wrap) wrap.remove()
}

const getSelectedYearFromDOM = () => {
  const activeLi = document.querySelector('ul.activity-contributes-yearList li.active')
  const t1 = activeLi?.textContent || ''
  const m1 = t1.match(/(\d{4})/)
  if (m1) return Number(m1[1])
  const titleP = document.querySelector('p.activity-contributes-title')
  const t2 = titleP?.textContent || ''
  const m2 = t2.match(/(\d{4})/)
  if (m2) return Number(m2[1])
  return undefined
}

const isRollingYearMode = () => {
  const title1 = document.querySelector('p.activity-contributes-title')?.textContent || ''
  const title2 = document.querySelector('#app > div > div.gc-base-layout-content > div > div > div > div > div > div > section > div.page-user-content.pb-\\[36px\\].flex-1 > div.page-user-activities > div > p')?.textContent || ''
  const t = (title1 || title2).trim().toLowerCase()
  if (!t) return false
  return /^(近一年|最近一年|过去一年|近一年贡献|rolling year|last year)/i.test(t)
}



const renderCanvasHud = () => {
  const canvas = document.querySelector('#isometric-contributions')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  const pad = 16
  const panelW = 240
  const panelH = 140
  const rightX = w - panelW - pad
  const rightY = pad
  const leftX = pad
  const leftY = h - panelH - pad
  const bg = 'rgba(255,255,255,0.92)'
  const border = '#d0d7de'
  const text = '#24292f'
  const accent = getAccentLocal()
  const r = 8
  if (dataSourceType !== 'api') {
    ctx.fillStyle = '#57606a'
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, sans-serif'
    const msg = isZh ? '默认数据，需登录 GitCode' : 'Default data, please sign in to GitCode'
    ctx.fillText(msg, pad, pad + 12)
  }
  const drawPanel = (x, y) => {
    ctx.fillStyle = bg
    ctx.strokeStyle = border
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + panelW - r, y)
    ctx.quadraticCurveTo(x + panelW, y, x + panelW, y + r)
    ctx.lineTo(x + panelW, y + panelH - r)
    ctx.quadraticCurveTo(x + panelW, y + panelH, x + panelW - r, y + panelH)
    ctx.lineTo(x + r, y + panelH)
    ctx.quadraticCurveTo(x, y + panelH, x, y + panelH - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  drawPanel(rightX, rightY)
  ctx.fillStyle = text
  ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, sans-serif'
  ctx.fillText(isZh ? '贡献' : 'Contributions', rightX + 12, rightY + 24)
  ctx.fillStyle = accent
  ctx.font = '28px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, sans-serif'
  ctx.fillText(String(countTotal), rightX + 12, rightY + 62)
  ctx.fillStyle = text
  ctx.font = '13px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, sans-serif'
  ctx.fillText(isZh ? '总计' : 'Total', rightX + 12, rightY + 80)
  ctx.fillText(datesTotal || '', rightX + 12, rightY + 98)
  ctx.fillStyle = accent
  ctx.font = '24px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, sans-serif'
  const maxStr = String(maxCount)
  ctx.fillText(maxStr, rightX + panelW - 12 - ctx.measureText(maxStr).width, rightY + 62)
  ctx.fillStyle = text
  ctx.font = '13px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, sans-serif'
  const bestLabel = isZh ? '最佳日' : 'Best day'
  ctx.fillText(bestLabel, rightX + panelW - 12 - ctx.measureText(bestLabel).width, rightY + 80)
  const avgLabel = (isZh ? '平均：' : 'Average:') + ' ' + String(averageCount) + (isZh ? ' / 天' : ' / day')
  ctx.fillText(avgLabel, rightX + 12, rightY + panelH - 14)
  drawPanel(leftX, leftY)
  ctx.fillStyle = text
  ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, sans-serif'
  ctx.fillText(isZh ? '连续贡献' : 'Streaks', leftX + 12, leftY + 24)
  ctx.fillStyle = accent
  ctx.font = '26px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, sans-serif'
  const longestStr = String(streakLongest) + (isZh ? ' 天' : ' days')
  ctx.fillText(longestStr, leftX + 12, leftY + 60)
  ctx.fillStyle = text
  ctx.font = '13px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, sans-serif'
  ctx.fillText(isZh ? '最长' : 'Longest', leftX + 12, leftY + 78)
  ctx.fillText(datesLongest || '', leftX + 12, leftY + 96)
  ctx.fillStyle = accent
  ctx.font = '26px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, sans-serif'
  const currentStr = String(streakCurrent) + (isZh ? ' 天' : ' days')
  const curX = leftX + panelW - 12 - ctx.measureText(currentStr).width
  ctx.fillText(currentStr, curX, leftY + 60)
  ctx.fillStyle = text
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, sans-serif'
  const curLabel = isZh ? '当前' : 'Current'
  ctx.fillText(curLabel, leftX + panelW - 12 - ctx.measureText(curLabel).width, leftY + 78)
  ctx.fillText(datesCurrent || '', leftX + panelW - 12 - ctx.measureText(datesCurrent || '').width, leftY + 96)
}

// GitHub DOM：
//   - calendarGraph = .js-calendar-graph（SVG 贡献图容器）
//   - contributionsBox = .js-yearly-contributions（整体统计模块）
const generateIsometricChart = async () => {
  calendarGraph = document.querySelector('#userActive') || document.querySelector('.page-user-activities')
  contributionsBox = document.querySelector('.page-user-activities') || document.querySelector('.page-user-info')

  resetValues()
  initUI()
  await loadStatsGitCode()
  renderIsometricChart()
  renderCanvasHud()
}

const precisionRound = (number, precision) => {
  const factor = 10 ** precision
  return Math.round(number * factor) / factor
}

const datesDayDifference = (date1, date2) => {
  let diffDays = null

  if (date1 && date2) {
    const dayMs = 1000 * 3600 * 24
    const timeDiff = Math.abs(date2.getTime() - date1.getTime())
    diffDays = Math.floor(timeDiff / dayMs) + 1
  }

  return diffDays
}

// 初始化监听：在 GitCode 域上工作，等待活动图出现后注入与渲染
;(async function () {
  if (location.hostname.includes('gitcode.com')) {
    console.debug('ic:init:start')
    await getSettings()
    setupLocationWatcher()

    const config = { attributes: true, childList: true, subtree: true }
    const callback = () => {
      if (isUserProfilePath() && document.querySelector('#userActive') && !document.querySelector('.ic-contributions-wrapper')) {
        console.debug('ic:init:detected userActive, injecting')
        generateIsometricChart()
        attachYearChangeHandlers()
      }
    }

    globalThis.matchMedia('(prefers-color-scheme: dark)').addListener(() => {
      renderIsometricChart()
      renderCanvasHud()
    })

    const observedContainer = document.documentElement || document.body
    const observer = new MutationObserver(callback)
    observer.observe(observedContainer, config)

    // 若页面已加载完成且活动图已存在，立即尝试注入
    if (document.readyState !== 'loading') {
      callback()
    }
  } else {
    console.debug('ic:init:skip, not gitcode domain')
  }
})()

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'setLanguage') {
      const lang = String(msg.language || '').toLowerCase()
      isZh = lang !== 'en'
      persistSetting('language', isZh ? 'zh' : 'en')
      dateFormat = new Intl.DateTimeFormat(isZh ? 'zh-CN' : 'en-US', { month: isZh ? 'numeric' : 'short', day: 'numeric', timeZone: 'UTC' })
      if (streakCurrent > 0 && typeof currentStreakStart !== 'undefined' && typeof currentStreakEnd !== 'undefined' && currentStreakStart && currentStreakEnd) {
        const startStr = dateFormat.format(currentStreakStart)
        const endStr = dateFormat.format(currentStreakEnd)
        datesCurrent = `${startStr} → ${endStr}`
      } else {
        datesCurrent = isZh ? '无当前连续' : 'No current streak'
      }
      if (streakLongest <= 0) {
        datesLongest = isZh ? '无最长连续' : 'No longest streak'
      }
      renderIsometricChart()
      renderCanvasHud()
      sendResponse({ ok: true })
      return true
    }
    if (msg && msg.type === 'setCustomBinsPalette') {
      const arr = Array.isArray(msg.palette) ? msg.palette.map((x)=>String(x).replace('#','')) : []
      if (arr.length === 4) {
        customPalette = arr
        persistSetting('customBinsPalette', customPalette)
        paletteName = 'custom'
        persistSetting('paletteName', paletteName)
        const sel = document.querySelector('.ic-palette-select')
        if (sel) sel.value = 'custom'
        applyPaletteAndRerender()
        updateLegendPalette()
        sendResponse({ ok: true })
        return true
      }
    }
    if (msg && msg.type === 'setPaletteName') {
      const name = String(msg.name || '').toLowerCase()
      if (name) {
        paletteName = name
        persistSetting('paletteName', paletteName)
        const sel = document.querySelector('.ic-palette-select')
        if (sel) sel.value = paletteName
        applyPaletteAndRerender()
        updateLegendPalette()
        sendResponse({ ok: true })
        return true
      }
    }
    
  })
}

const getActivePaletteLocal = () => {
  if (paletteName === 'custom' && Array.isArray(customPalette) && customPalette.length === 4) {
    const base = (readGitCodePalette()?.[0]) || 'f9f9fb'
    return [String(base).replace('#',''), ...customPalette]
  }
  return getActivePalette(paletteName)
}

const getAccentLocal = () => {
  return resolveAccent(getActivePaletteLocal())
}
