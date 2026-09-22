/* Pin guidance lives only in the side panel. */
(() => {
 const prompt = document.querySelector('#notate-pin-reminder')
 if (!prompt) return
 const startPrompt = document.querySelector('#notate-start-reminder')
 let targetTabId
 let revision = 0
 const hideStart = () => {
  targetTabId = undefined
  revision++
  if (startPrompt) startPrompt.hidden = true
 }
 const refreshStart = async () => {
  const current = ++revision
  if (!startPrompt || targetTabId === undefined) return
  try {
   const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
   if (current !== revision) return
   startPrompt.hidden = tab?.id !== targetTabId
   if (!startPrompt.hidden) sync?.send('start-guide-shown')
  } catch { if (current === revision) startPrompt.hidden = true }
 }
 let dismissed = false
 const sync = notateSetupSync('panel', event => {
  if (event.type === 'pin') prompt.hidden = dismissed || event.pinned !== false
  if (event.type === 'start-guide' && Number.isInteger(event.tabId)) {
   targetTabId = event.tabId
   refreshStart()
  }
  if (event.type === 'first-note-saved') hideStart()
 })
 document.querySelector('#dismiss-pin-reminder')?.addEventListener('click', () => {
  dismissed = true
  prompt.hidden = true
  sync?.send('pin-skipped')
 })
 document.querySelector('[data-action="start-annotating"]')?.addEventListener('click', hideStart)
 const dismissStart = document.querySelector('#notate-start-dismiss')
 if (dismissStart) dismissStart.onclick = hideStart
 if (sync) {
  chrome.tabs.onActivated.addListener(refreshStart)
  window.addEventListener('pagehide', () => chrome.tabs.onActivated.removeListener(refreshStart), { once: true })
 }
})()
