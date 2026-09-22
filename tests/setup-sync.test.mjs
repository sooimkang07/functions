import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs'
const source = fs.readFileSync(new URL('../scripts/setup-sync.js', import.meta.url), 'utf8')
function fixture() {
 const channels = []
 const listeners = new Set()
 const storageListeners = new Set()
 let savedNote = false
 const contexts = []
 let pinned = false
 class Channel {
  constructor() { channels.push(this) }
  postMessage(data) { for (const channel of channels) if (channel !== this && !channel.closed) queueMicrotask(() => channel.onmessage?.({ data })) }
  close() { this.closed = true }
 }
 function client(role, id = 1) {
  const events = [], handlers = {}
  const chrome = { storage: { local: { get: async () => ({ 'notate-first-note-saved': savedNote }) }, onChanged: { addListener: fn => storageListeners.add(fn), removeListener: fn => storageListeners.delete(fn) } }, runtime: { id: 'fixture' }, windows: { getCurrent: async () => ({ id }) }, action: {
   getUserSettings: async () => ({ isOnToolbar: pinned }),
   onUserSettingsChanged: { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn) }
  }, sidePanel: { open: options => { assert.equal(options.windowId, id); return Promise.resolve() } } }
  const context = vm.createContext({ chrome, BroadcastChannel: Channel,
   window: { addEventListener: (type, fn) => { handlers[type] = fn }, removeEventListener() {} },
   document: { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} }, callback: event => events.push(event) })
  vm.runInContext(source, context)
  const sync = vm.runInContext(`notateSetupSync('${role}', callback)`, context)
  contexts.push(context)
  return { sync, events, handlers }
 }
 return { client, listeners, storageListeners, save: () => { savedNote = true; for (const fn of storageListeners) fn({ 'notate-first-note-saved': { newValue: true } }, 'local') }, pin: value => { pinned = value; for (const fn of listeners) fn({ isOnToolbar: value }) } }
}
const flush = () => new Promise(resolve => setImmediate(resolve))
test('manual panel opening and an already-open panel both announce readiness', async () => {
 const f = fixture(), welcome = f.client('welcome')
 await welcome.sync.ready
 const panel = f.client('panel'); await panel.sync.ready; await flush()
 assert.ok(welcome.events.some(e => e.type === 'panel-opened'))
 const later = f.client('welcome'); await later.sync.ready; await flush()
 assert.ok(later.events.some(e => e.type === 'panel-opened'))
 await welcome.sync.open()
})
test('setup signals stay in their Chrome window; pin changes reflect actual settings', async () => {
 const f = fixture(), welcome = f.client('welcome', 1), panel = f.client('panel', 2)
 await Promise.all([welcome.sync.ready, panel.sync.ready]); await flush()
 assert.equal(welcome.events.some(e => e.type === 'panel-opened'), false)
 f.pin(true)
 assert.equal(welcome.events.at(-1).pinned, true)
 f.pin(false)
 assert.equal(panel.events.at(-1).pinned, false)
 welcome.handlers.pagehide()
 assert.equal(f.listeners.size, 1)
})
test('the localhost preview never claims extension API access', () => {
 const context = vm.createContext({})
 vm.runInContext(source, context)
 assert.equal(vm.runInContext("notateSetupSync('welcome', () => {})", context), null)
})

test('saved-note completion reaches the tour and is restored on reopening', async () => {
 const f = fixture(), welcome = f.client('welcome')
 await welcome.sync.ready
 assert.equal(welcome.events.some(e => e.type === 'first-note-saved'), false)
 f.save()
 assert.ok(welcome.events.some(e => e.type === 'first-note-saved'))
 welcome.handlers.pagehide()
 assert.equal(f.storageListeners.size, 0)
 const reopened = f.client('welcome')
 await reopened.sync.ready
 assert.ok(reopened.events.some(e => e.type === 'first-note-saved'))
})
