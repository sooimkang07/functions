/* Pin guidance lives only in the side panel. */
(() => {
 const prompt = document.getElementById('notate-pin-reminder')
 if (!prompt) return
 let dismissed = false
 const sync = notateSetupSync('panel', event => {
  if (event.type === 'pin') prompt.hidden = dismissed || event.pinned !== false
 })
 document.getElementById('dismiss-pin-reminder')?.addEventListener('click', () => {
  dismissed = true
  prompt.hidden = true
  sync?.send('pin-skipped')
 })
})()
