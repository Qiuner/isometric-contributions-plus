const $all = (sel) => Array.from(document.querySelectorAll(sel))
const setStatus = (t) => (document.getElementById('status').textContent = t || '')

let currentTabId = null
let currentUrl = ''
const load = async () => {
  if (!(chrome && chrome.tabs && chrome.storage && chrome.storage.local)) return
  const [tab] = await new Promise((res) => chrome.tabs.query({ active: true, currentWindow: true }, res))
  currentTabId = tab?.id || null
  const url = String(tab?.url || '')
  currentUrl = url
  const s = await new Promise((res) => chrome.storage.local.get(['language','customBinsPalette'], res))
  const lang = String(s['language'] || 'zh').toLowerCase()
  for (const r of $all('input[name="lang"]')) r.checked = r.value === lang
  const defs = currentUrl.includes('github.com')
    ? ['#9be9a8','#40c463','#30a14e','#216e39']
    : ['#addac4','#5ab489','#088f4e','#066437']
  const arr = Array.isArray(s['customBinsPalette']) ? s['customBinsPalette'] : []
  const vals = arr.length === 4 ? arr.map((x)=>'#'+String(x).replace('#','')) : defs
  ;['clr1','clr2','clr3','clr4'].forEach((id,i)=>{
    const el = document.getElementById(id)
    if (el) el.value = vals[i]
  })
}

const canSendToTab = () => !!currentTabId && (currentUrl.includes('github.com') || currentUrl.includes('gitcode.com'))

const apply = async (lang) => {
  try {
    if (chrome && chrome.storage && chrome.storage.local) {
      const obj = { language: lang }
      await new Promise((res) => chrome.storage.local.set(obj, res))
    }
    if (canSendToTab()) {
      chrome.tabs.sendMessage(currentTabId, { type: 'setLanguage', language: lang }, () => {
        const err = chrome.runtime && chrome.runtime.lastError
        if (err) {
          setStatus(lang === 'zh' ? '已保存' : 'Saved')
        } else {
          setStatus(lang === 'zh' ? '已切换为中文' : 'Switched to English')
        }
      })
    } else {
      setStatus('已保存')
    }
  } catch {
    setStatus('失败')
  }
}

const applyColors = async () => {
  try {
    const vals = ['clr1','clr2','clr3','clr4'].map((id)=>{
      const el = document.getElementById(id)
      const v = String(el?.value || '').trim()
      return v.replace('#','')
    })
    if (chrome && chrome.storage && chrome.storage.local) {
      const obj = { customBinsPalette: vals, paletteName: 'custom', paletteName_gitcode: 'custom', paletteName_github: 'custom' }
      await new Promise((res) => chrome.storage.local.set(obj, res))
    }
    if (canSendToTab()) {
      chrome.tabs.sendMessage(currentTabId, { type: 'setCustomBinsPalette', palette: vals }, () => {
        const err = chrome.runtime && chrome.runtime.lastError
        setStatus(err ? '已保存' : '已应用')
      })
    } else {
      setStatus('已保存')
    }
  } catch {
    setStatus('失败')
  }
}

const resetColors = async () => {
  try {
    const isGh = currentUrl.includes('github.com')
    const defName = isGh ? 'github' : 'gitcode'
    if (chrome && chrome.storage && chrome.storage.local) {
      await new Promise((res) => chrome.storage.local.remove('customBinsPalette', res))
      const obj = { paletteName: defName, paletteName_gitcode: 'gitcode', paletteName_github: 'github' }
      await new Promise((res) => chrome.storage.local.set(obj, res))
    }
    if (canSendToTab()) {
      chrome.tabs.sendMessage(currentTabId, { type: 'setPaletteName', name: defName }, () => {
        const err = chrome.runtime && chrome.runtime.lastError
        setStatus(err ? '已保存' : '已恢复默认')
      })
    } else {
      setStatus('已保存')
    }
    const defs = isGh ? ['#9be9a8','#40c463','#30a14e','#216e39'] : ['#addac4','#5ab489','#088f4e','#066437']
    ;['clr1','clr2','clr3','clr4'].forEach((id,i)=>{
      const el = document.getElementById(id)
      if (el) el.value = defs[i]
    })
  } catch {
    setStatus('失败')
  }
}

document.addEventListener('DOMContentLoaded', () => {
  load()
  for (const r of $all('input[name="lang"]')) r.addEventListener('change', (e) => apply(e.target.value))
  const btn = document.getElementById('applyColors')
  if (btn) btn.addEventListener('click', applyColors)
  const rst = document.getElementById('resetColors')
  if (rst) rst.addEventListener('click', resetColors)
})
