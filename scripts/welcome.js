const setupNotice = document.createElement('p')
setupNotice.setAttribute('role', 'status')
// Only show actionable errors; the permanent step counter was removed.
let step = 1
const completed = new Set([0])
let setupSync
let pinned
let sidebarOpened = false
let startGuidePending = false
let startGuideTabId
function showStep(value) {
 step = Math.max(0, Math.min(3, Number(value)))
 setupSync?.send('step', { step })
 document.querySelectorAll('[data-gs-step]').forEach((button, i) => {
  button.classList.toggle('is-done', completed.has(i))
  if (i === step) button.setAttribute('aria-current', 'step')
  else button.removeAttribute('aria-current')
 })
 document.querySelector('#setup-progress').value = completed.size
 document.querySelectorAll('[data-gs-panel]').forEach((panel, i) => {
  panel.hidden = i !== step
  panel.classList.toggle('is-active', i === step)
 })
}
document.querySelectorAll('[data-gs-step]').forEach(button => button.onclick = () => {
 setupNotice.textContent = ''
 showStep(button.dataset.gsStep)
})
document.querySelectorAll('[data-action="gs-next"]').forEach(button => button.onclick = () => { completed.add(step); showStep(step + 1) })
function sidebarReady() {
 const firstOpen = !sidebarOpened
 sidebarOpened = true
 completed.add(1)
 if (firstOpen && step < 3) showStep(pinned === true ? 3 : 2)
 else showStep(step)
}
setupSync = notateSetupSync('welcome', event => {
 if (event.type === 'first-note-saved') {
  completed.add(3)
  startGuidePending = false
  document.querySelector('#tour-finished').hidden = false
  setupNotice.textContent = 'Your note is saved. You can close the page and return to it from the Notate sidebar anytime.'
  showStep(step)
 }
 if (event.type === 'panel-opened') {
  sidebarReady()
  if (startGuidePending && startGuideTabId !== undefined) setupSync.send('start-guide', { tabId: startGuideTabId })
 }
 if (event.type === 'start-guide-shown') startGuidePending = false
 if (event.type === 'pin') {
  pinned = event.pinned
  if (pinned) completed.add(2)
  else completed.delete(2)
  showStep(pinned && sidebarOpened && step === 2 ? 3 : step)
 }
 if (event.type === 'pin-skipped' && step === 2) showStep(3)
})
const openSidebar = document.querySelector('#open-sidebar')
if (setupSync) {
 openSidebar.disabled = true
 setupSync.ready.then(() => { openSidebar.disabled = false })
}
openSidebar.onclick = async () => {
 const status = setupNotice
 if (!setupSync) {
  status.textContent = 'This is a design preview. In Chrome, open Notate and choose “Take a quick tour” to use the installed setup page.'
  return
 }
 try {
  // Invoke directly in the click event: Chrome requires a user gesture.
  await setupSync.open()
  status.textContent = ''
  sidebarReady()
 } catch {
  status.textContent = 'Couldn’t open the sidebar. Click Notate in Chrome’s Extensions menu to continue.'
 }
}
const getStarted = document.querySelector('#get-started')
if (setupSync) {
 getStarted.disabled = true
 setupSync.ready.then(() => { getStarted.disabled = false })
}
getStarted.onclick = async () => {
 const status = setupNotice
 if (!setupSync) {
  status.textContent = 'Open the installed Notate tour in Chrome to get started with sidebar guidance.'
  return
 }
 getStarted.disabled = true
 startGuidePending = true
 startGuideTabId = undefined
 try {
  // Open synchronously from the gesture, then switch to an annotatable example.
  await setupSync.open()
  const practiceTab = await chrome.tabs.create({ url: 'https://sooimkang.com/' })
  startGuideTabId = practiceTab.id
  setupSync.send('start-guide', { tabId: startGuideTabId })
  status.textContent = 'Click New in the Notate sidebar to select an element and add your note.'
 } catch {
  startGuidePending = false
  status.textContent = 'Open a webpage, then open Notate and click New to begin.'
 } finally { getStarted.disabled = false }
}

showStep(1)

// This isolated exercise never reads or writes the user's note library.
const practice = document.querySelector('#practice')
const target = document.querySelector('#practice-target')
const composer = document.querySelector('#practice-composer')
const note = document.querySelector('#practice-note')
const input = document.querySelector('#practice-text')
const instruction = document.querySelector('#practice-instruction')
document.querySelector('#practice-close').onclick = () => practice.close()
document.querySelector('#practice-new').onclick = () => {
 target.disabled = false
 target.classList.add('is-picking')
 instruction.textContent = 'Select the headline to attach your note.'
 target.focus()
}
function edit() {
 target.disabled = true
 target.classList.remove('is-picking')
 composer.hidden = false
 note.hidden = true
 instruction.textContent = 'Write your feedback, then click Save.'
 input.focus()
}
target.onclick = edit
note.onclick = edit
document.querySelector('#practice-cancel').onclick = () => {
 composer.hidden = true
 note.hidden = !note.textContent
 instruction.textContent = 'Click New to try again.'
}
composer.onsubmit = event => {
 event.preventDefault()
 if (!input.value.trim()) { input.focus(); return }
 note.textContent = input.value.trim()
 composer.hidden = true
 note.hidden = false
 instruction.textContent = 'Your note is attached. Click it to edit.'
 document.querySelector('#practice-help').textContent = 'On a real webpage, open Notate and click New to do the same.'
 document.querySelector('#practice-done').hidden = false
 note.focus()
}
document.querySelector('#practice-done').onclick = () => { practice.close(); showStep(3); setupNotice.textContent = 'Practice complete. Open a webpage, then click Notate and New to add a note.' }
