chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'readCookies') {
    const urls = ['https://gitcode.com/', 'https://web-api.gitcode.com/']
    const read = async () => {
      const getOne = (url, name) => new Promise((res) => chrome.cookies.get({ url, name }, (c) => res(c?.value || '')))
      let accessToken = ''
      let refreshToken = ''
      for (const u of urls) {
        accessToken ||= await getOne(u, 'GITCODE_ACCESS_TOKEN')
        refreshToken ||= await getOne(u, 'GITCODE_REFRESH_TOKEN')
      }
      return { accessToken, refreshToken }
    }
    read().then((t) => sendResponse(t))
    return true
  }
})

