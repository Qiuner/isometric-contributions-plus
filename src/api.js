const API_BASE = 'https://web-api.gitcode.com'

const getCookie = (name) => {
  const s = document.cookie || ''
  const p = s.split(';').map((v) => v.trim())
  for (const kv of p) {
    if (!kv) continue
    const [k, ...rest] = kv.split('=')
    if (k === name) return decodeURIComponent(rest.join('='))
  }
}

export const fetchAccessToken = async (existingToken) => {
  const bearer = existingToken || getCookie('GITCODE_ACCESS_TOKEN') || ''
  if (!bearer) return null
  console.debug('fetchAccessToken:start', { bearer: mask(bearer) })
  const resp = await fetch(API_BASE + '/uc/api/v1/user/oauth/token', {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + bearer }
  })
  console.debug('fetchAccessToken:resp', { ok: resp.ok, status: resp.status })
  if (!resp.ok) return null
  const json = await resp.json()
  const at = json?.access_token
  const rt = json?.refresh_token
  console.debug('fetchAccessToken:done', { access_token: mask(at), refresh_token: mask(rt) })
  if (!at) return null
  return { access_token: at, refresh_token: rt }
}

export const fetchContributions = async (username, accessToken, year) => {
  if (!username || !accessToken) return []
  const yq = year ? `&year=${encodeURIComponent(year)}` : ''
  const url = API_BASE + `/uc/api/v1/events/${encodeURIComponent(username)}/contributions?username=${encodeURIComponent(username)}${yq}`
  console.debug('fetchContributions:start', { username, accessToken: mask(accessToken), year })
  const resp = await fetch(url, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + accessToken }
  })
  console.debug('fetchContributions:resp', { ok: resp.ok, status: resp.status })
  if (!resp.ok) return []
  const json = await resp.json()
  const out = []
  for (const k in json || {}) {
    const v = Number(json[k] ?? 0)
    out.push({ date: new Date(k), count: Number.isFinite(v) && v >= 0 ? v : 0 })
  }
  console.debug('fetchContributions:parsed', { days: out.length })
  out.sort((a, b) => a.date.getTime() - b.date.getTime())
  return out
}

export const readAccessTokenCookie = () => getCookie('GITCODE_ACCESS_TOKEN')
export const readRefreshTokenCookie = () => getCookie('GITCODE_REFRESH_TOKEN')
const mask = (t) => {
  if (!t) return ''
  const s = String(t)
  if (s.length <= 10) return s.slice(0, 1) + '***' + s.slice(-1)
  return s.slice(0, 6) + '...' + s.slice(-4)
}
