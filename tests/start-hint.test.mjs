import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
test('start hint appears only on the requested tab and stays dismissed after New or close', async () => {
 const nodes = new Map()
 const node = selector => {
  if (!nodes.has(selector)) nodes.set(selector, { hidden: false, classList: { toggle() {} }, addEventListener(type, fn) { this[type] = fn } })
  return nodes.get(selector)
 }
 let receive, activated, active = 1
 const ctx = vm.createContext({
  document: { querySelector: node }, window: { addEventListener() {} },
  MutationObserver: class { observe() {} disconnect() {} },
  chrome: { tabs: { query: async () => [{ id: active }], onActivated: { addListener(fn) { activated = fn }, removeListener() {} } } },
  notateSetupSync: (_role, callback) => { receive = callback; return { send() {} } }
 })
 vm.runInContext(readFileSync(new URL('../scripts/pin-reminder.js', import.meta.url), 'utf8'), ctx)
 const hint = node('#notate-start-reminder')
 receive({ type: 'start-guide', tabId: 2 })
 await new Promise(resolve => setImmediate(resolve))
 assert.equal(hint.hidden, true)
 active = 2; await activated()
 assert.equal(hint.hidden, false)
 active = 1; await activated()
 assert.equal(hint.hidden, true)
 active = 2; await activated()
 node('[data-action="start-annotating"]').click()
 assert.equal(hint.hidden, true)
 await activated(); assert.equal(hint.hidden, true)
 receive({ type: 'start-guide', tabId: 2 })
 await new Promise(resolve => setImmediate(resolve))
 assert.equal(hint.hidden, false)
 node('#notate-start-dismiss').onclick()
 await activated(); assert.equal(hint.hidden, true)
})
