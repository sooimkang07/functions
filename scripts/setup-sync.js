// Same-extension coordination; only a completion boolean is read from storage.
function notateSetupSync(role, onEvent) {
 const api = globalThis.chrome
 if (!api?.runtime?.id || !api.windows || !api.action) return null
 const channel = new BroadcastChannel('notate-setup-v1')
 let windowId
 let closed = false
 let pinRevision = 0
 const send = (type, extra = {}) => {
  if (!closed && windowId !== undefined) channel.postMessage({ type, windowId, ...extra })
 }
 const pinChanged = settings => {
  if (typeof settings.isOnToolbar !== 'boolean') return
  pinRevision++
  onEvent({ type: 'pin', pinned: settings.isOnToolbar })
 }
 const refreshPin = async () => {
  const revision = pinRevision
  try {
   const settings = await api.action.getUserSettings()
   if (!closed && revision === pinRevision) pinChanged(settings)
  } catch { /* An unknown pin state must not be treated as completed. */ }
 }
 channel.onmessage = ({ data }) => {
  if (data?.windowId !== windowId) return
  if (role === 'panel' && data.type === 'hello') send('panel-opened')
  else onEvent(data)
 }
 const saved = changes => {
  if (changes['notate-first-note-saved']?.newValue === true) onEvent({ type: 'first-note-saved' })
 }
 const storageChanged = (changes, area) => { if (area === 'local' && !closed) saved(changes) }
 api.storage?.onChanged.addListener(storageChanged)
 const savedReady = api.storage?.local.get('notate-first-note-saved').then(data => {
  if (!closed && data['notate-first-note-saved'] === true) onEvent({ type: 'first-note-saved' })
 }).catch(() => {})
 const ready = api.windows.getCurrent().then(window => {
  windowId = window.id
  send(role === 'panel' ? 'panel-opened' : 'hello')
  return Promise.all([refreshPin(), savedReady])
 }).catch(() => {})
 api.action.onUserSettingsChanged?.addListener(pinChanged)
 const visible = () => {
  if (document.visibilityState === 'visible') {
   refreshPin()
   send(role === 'panel' ? 'panel-opened' : 'hello')
  }
 }
 window.addEventListener('focus', refreshPin)
 document.addEventListener('visibilitychange', visible)
 const close = () => {
  closed = true
  channel.close()
  api.storage?.onChanged.removeListener(storageChanged)
  api.action.onUserSettingsChanged?.removeListener(pinChanged)
  window.removeEventListener('focus', refreshPin)
  document.removeEventListener('visibilitychange', visible)
 }
 window.addEventListener('pagehide', close, { once: true })
 return { ready, send, refreshPin, open: () => api.sidePanel.open({ windowId }) }
}
