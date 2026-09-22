import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
const read = name => readFileSync(new URL('../scripts/' + name, import.meta.url), 'utf8')
function setup(initial = {}) {
  let state = structuredClone(initial), listener, fail = false
  const context = vm.createContext({ URL, structuredClone, crypto, chrome: {
    runtime: { id: 'notate', onMessage: { addListener(fn) { listener = fn } } },
    storage: { local: {
      async get() { await new Promise(resolve => setTimeout(resolve, 2)); return structuredClone(state) },
      async set(value) { if (fail) throw Error('quota'); state = { ...state, ...structuredClone(value) } }
    } }
  } })
  for (const file of ['url-match.js', 'note-meta.js', 'storage-writer.js']) vm.runInContext(read(file), context)
  const mutate = (operation, requestId = crypto.randomUUID()) => new Promise(resolve => listener({ action: 'notate-mutate', requestId, operation }, { id: 'notate' }, resolve))
  return { mutate, data: () => structuredClone(state), fail: value => { fail = value } }
}
const note = (id, text = id) => ({ id, selector: '#target', text, group: '', color: 'yellow', offsetInline: 0, offsetBlock: 0, createdAt: 1, interaction: { kind: 'default' } })
const create = (id, url = 'https://example.com/a') => ({ type: 'create', id, url, title: 'Test', note: note(id) })
test('simultaneous saves retain different pages and multiple notes on the same page', async () => {
  const s = setup()
  const results = await Promise.all([s.mutate(create('a')), s.mutate(create('b')), s.mutate(create('c','https://example.com/b'))])
  assert.ok(results.every(result => result.ok))
  const pages = s.data()['notate-annotations']
  assert.equal(pages['https://example.com/a'].annotations.length, 2)
  assert.equal(pages['https://example.com/b'].annotations.length, 1)
})
test('duplicate transport request commits once, even after later mutations', async () => {
  const s = setup(), request = create('a')
  await s.mutate(request, 'same')
  await s.mutate({ type: 'delete', url: request.url, id: 'a' })
  await s.mutate(request, 'same')
  assert.equal(Object.keys(s.data()['notate-annotations']).length, 0)
})
test('stale edits cannot resurrect deleted notes', async () => {
  const s = setup(); await s.mutate(create('a'))
  await s.mutate({ type: 'delete', url: create('a').url, id: 'a' })
  const result = await s.mutate({ type: 'edit', url: create('a').url, id: 'a', patch: { text: 'stale' } })
  assert.equal(result.ok, false)
  assert.equal(Object.keys(s.data()['notate-annotations']).length, 0)
})
test('conflicting edits reject; position changes merge without losing text', async () => {
  const s = setup(); await s.mutate(create('a'))
  const original = s.data()['notate-annotations'][create('a').url].annotations[0]
  assert.equal((await s.mutate({ type: 'edit', url: create('a').url, id: 'a', expected: original, patch: { text: 'first' } })).ok, true)
  assert.equal((await s.mutate({ type: 'edit', url: create('a').url, id: 'a', expected: original, patch: { text: 'second' } })).ok, false)
  assert.equal((await s.mutate({ type: 'move', url: create('a').url, id: 'a', expected: original, patch: { offsetInline: 30, offsetBlock: 20 } })).ok, true)
  const saved = s.data()['notate-annotations'][create('a').url].annotations[0]
  assert.equal(saved.text, 'first'); assert.equal(saved.offsetInline, 30)
})
test('failed delete and move preserve stored state; queue recovers after quota failure', async () => {
  const s = setup(); await s.mutate(create('a')); const before = s.data()
  s.fail(true)
  assert.equal((await s.mutate({ type: 'delete', url: create('a').url, id: 'a' })).ok, false)
  assert.equal((await s.mutate({ type: 'move', url: create('a').url, id: 'a', patch: { offsetInline: 30, offsetBlock: 20 } })).ok, false)
  assert.deepEqual(s.data(), before)
  s.fail(false)
  assert.equal((await s.mutate(create('b'))).ok, true)
})
test('folder rename and deletion cannot be overwritten by a stale note save', async () => {
  const s = setup(), request = create('a')
  request.note.group = 'Old'; request.newFolder = true
  await s.mutate(request)
  const original = s.data()['notate-annotations'][request.url].annotations[0]
  await s.mutate({ type: 'folder-edit', from: 'Old', to: 'New', color: 'sky' })
  assert.equal((await s.mutate({ type: 'edit', url: request.url, id: 'a', expected: original, patch: original })).ok, false)
  await s.mutate({ type: 'folder-delete', name: 'New' })
  const saved = s.data()['notate-annotations'][request.url].annotations[0]
  assert.equal(saved.group, '')
})
test('clear and a following create have deterministic ordering and retain folders', async () => {
  const s = setup()
  await s.mutate({ type: 'folder-create', name: 'Keep', color: 'mint' })
  await s.mutate(create('a'))
  await Promise.all([s.mutate({ type: 'clear-all' }), s.mutate(create('b'))])
  assert.equal(s.data()['notate-annotations'][create('b').url].annotations[0].id, 'b')
  assert.equal(s.data()['notate-group-colors'].Keep, 'mint')
})

test('worker restart retains receipts and accepts later independent writes', async () => {
 const first = setup()
 await first.mutate(create('a'), 'ack-lost')
 const restarted = setup(first.data())
 await restarted.mutate(create('a'), 'ack-lost')
 await restarted.mutate(create('b'))
 assert.equal(restarted.data()['notate-annotations']['https://example.com/a'].annotations.length, 2)
})

 test('first-note completion requires a durable create and survives deletion and restart', async () => {
  const s = setup()
  await s.mutate({ type: 'folder-create', name: 'Ideas', color: 'sky' })
  assert.equal(s.data()['notate-first-note-saved'], undefined)
  s.fail(true)
  assert.equal((await s.mutate(create('first'))).ok, false)
  assert.equal(s.data()['notate-first-note-saved'], undefined)
  s.fail(false)
  assert.equal((await s.mutate(create('first'))).ok, true)
  assert.equal(s.data()['notate-first-note-saved'], true)
  await s.mutate({ type: 'clear-all' })
  assert.equal(setup(s.data()).data()['notate-first-note-saved'], true)
 })
