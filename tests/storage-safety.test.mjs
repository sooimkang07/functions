import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
const storageSource = readFileSync(new URL('../scripts/safe-storage.js', import.meta.url), 'utf8')
const source = readFileSync(new URL('../scripts/webpage.js', import.meta.url), 'utf8')
const extract = name => {
  const start = source.indexOf(`const ${name} =`)
  return source.slice(start, source.indexOf('\n}', start) + 2)
}
test('failed reads reject instead of returning an empty library', async () => {
  const context = vm.createContext({ chrome: { storage: { local: { get: async () => { throw Error('offline') } } } } })
  vm.runInContext(storageSource, context)
  await assert.rejects(context.extensionStorageGet('notes'), { code: 'NOTATE_STORAGE_READ' })
})
test('required writes reject on quota failure and acknowledge successful writes', async () => {
  let fail = true
  const context = vm.createContext({ chrome: { storage: { local: { set: async () => { if (fail) throw Error('quota') } } } } })
  vm.runInContext(storageSource, context)
  await assert.rejects(context.extensionStorageSetRequired({}), { code: 'NOTATE_STORAGE_WRITE' })
  fail = false
  await context.extensionStorageSetRequired({})
})
test('save failure retains draft, blocks repeated saves, restores controls, and permits retry', async () => {
  let release, calls = 0, notice = null, busy = false
  const controls = [{ disabled: false, value: 'Keep my draft' }, { disabled: true }]
  const form = {
    querySelector: () => notice,
    querySelectorAll: () => controls,
    setAttribute: () => { busy = true },
    removeAttribute: () => { busy = false },
    append: value => { notice = value }
  }
  const context = vm.createContext({
    form, modal: { addEventListener() {}, removeEventListener() {} },
    readModalMeta: () => ({ text: controls[0].value }),
    document: { createElement: () => ({ dataset: {}, setAttribute() {}, remove() { notice = null } }) },
    performModalSave: async () => { calls++; await new Promise(resolve => { release = resolve }); throw Error('quota') }
  })
  vm.runInContext('let modalSavePending = false;\n' + extract('saveFromModal'), context)
  const first = vm.runInContext('saveFromModal()', context)
  await vm.runInContext('saveFromModal()', context)
  assert.equal(calls, 1)
  assert.equal(busy, true)
  release()
  await first
  assert.equal(controls[0].value, 'Keep my draft')
  assert.match(notice.textContent, /draft is still here/)
  assert.equal(controls[0].disabled, false)
  assert.equal(controls[1].disabled, true)
  assert.equal(busy, false)
  context.performModalSave = async () => { calls++ }
  await vm.runInContext('saveFromModal()', context)
  assert.equal(calls, 2)
})
test('failed edit does not mutate the saved in-memory record or outline', async () => {
  const existing = { id: '1', text: 'Original', group: '', color: 'yellow' }
  const context = vm.createContext({
    getAnnotationById: () => existing, annotations: [existing],
    notateNormalizeColor: value => value, notateNormalizeGroup: value => value,
    notateNormalizeInteraction: () => ({}), activeTarget: null, pendingInteraction: null,
    location: { href: 'https://example.com' }, editingBaseline: null, draftGroupColors: new Map(), notateMutate: async () => { throw Error('quota') },
    highlightTarget: () => { throw Error('must not run before storage succeeds') }
  })
  vm.runInContext(extract('updateAnnotation'), context)
  await assert.rejects(vm.runInContext("updateAnnotation('1','Edited','sky','Folder',{})", context), /quota/)
  assert.equal(existing.text, 'Original')
  assert.equal(existing.group, '')
})
test('failed deletion keeps the note visible and releases deletion lock', async () => {
  const visible = { dataset: { id: '1' }, inert: false, style: { visibility: '' } }
  let message
  const context = vm.createContext({
    getAnnotationById: () => ({ id: '1' }), deletingNotes: new Set(), stickingNotes: new Map(),
    clearNoteTargetPreview() {}, layer: { children: [visible] }, location: { href: 'https://example.com' },
    notateMutate: async () => { throw Error('quota') }, reportPageStorageError: value => { message = value }
  })
  vm.runInContext(extract('deleteAnnotation'), context)
  await vm.runInContext("deleteAnnotation('1')", context)
  assert.equal(visible.inert, false)
  assert.equal(visible.style.visibility, '')
  assert.equal(context.deletingNotes.size, 0)
  assert.match(message, /kept/)
})
test('failed drag restores saved coordinates even if storage reread also fails', async () => {
  const note = { id: '1', offsetInline: 80, offsetBlock: 90 }
  let repositioned = false, message
  const context = vm.createContext({
    noteDrag: { id: '1', moved: true, originInline: 5, originBlock: 10, baseline: {} },
    getAnnotationById: () => note, location: { href: 'https://example.com' },
    notateMutate: async () => { throw Error('quota') },
    loadAnnotations: async () => { throw Error('offline') },
    reportPageStorageError: value => { message = value },
    repositionAnnotations: () => { repositioned = true }
  })
  vm.runInContext(extract('finishNoteDrag'), context)
  await vm.runInContext('finishNoteDrag()', context)
  assert.equal(note.offsetInline, 5)
  assert.equal(note.offsetBlock, 10)
  assert.equal(context.noteDrag, null)
  assert.equal(repositioned, true)
  assert.match(message, /returned/)
})
