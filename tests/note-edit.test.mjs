import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import test from 'node:test'
const source = readFileSync(new URL('../scripts/webpage.js', import.meta.url), 'utf8')
const extract = name => {
  const start = source.indexOf(`const ${name} =`)
  return source.slice(start, source.indexOf('\n}', start) + 2)
}
for (const scenario of ['stale', 'host', 'valid']) {
  test(`note clicks: ${scenario}`, () => {
    const layer = {}
    const note = { parentElement: scenario === 'host' ? {} : layer, dataset: { id: 'note-1' } }
    let opened = 0, intercepted = 0
    const record = scenario === 'stale' ? undefined : { id: 'note-1' }
    const context = vm.createContext({ layer, isMoving: false, noteDidDrag: false, noteDrag: null,
      getAnnotationById: () => record, openEditModal: () => opened++,
      event: { target: { closest: selector => selector === '.notate-note' ? note : null },
        preventDefault: () => intercepted++, stopPropagation: () => intercepted++ } })
    vm.runInContext(extract('onNoteClick') + '\nonNoteClick(event)', context)
    assert.equal(opened, scenario === 'valid' ? 1 : 0)
    assert.equal(intercepted, scenario === 'valid' ? 2 : 0)
  })
}
test('edit ignores missing records and tolerates invalid target selectors', () => {
  let created = 0, shown = 0, positioned
  const context = vm.createContext({ structuredClone, location: { href: 'https://example.com' }, modal: null, editingAnnotationId: null, activeTarget: null,
    textarea: {}, document: { querySelector() { throw new SyntaxError('invalid selector') } },
    createModal: () => { created++; context.modal = { showModal: () => shown++ } },
    scaleNoteType() {}, syncModalFields() {}, syncModalCopy() {}, placeModalNear: target => { positioned = target } })
  vm.runInContext(extract('openEditModal') + '\nopenEditModal(undefined)', context)
  assert.equal(created, 0)
  vm.runInContext("openEditModal({id:'note-1',selector:'#bad[',text:'Keep this note'})", context)
  assert.equal(shown, 1)
  assert.equal(positioned, null)
  assert.equal(context.textarea.value, 'Keep this note')
})

test('saved-note editor centers even when its target is connected', () => {
 const target = { isConnected: true }
 let positioned = target
 const context = vm.createContext({ structuredClone, location:{href:'https://example.com'}, modal:null, textarea:{},
  resolveAnnotationTarget:()=>target,
  createModal:()=>{context.modal={showModal(){}}},
  scaleNoteType(){},syncModalFields(){},syncModalCopy(){},placeModalNear:value=>{positioned=value} })
 vm.runInContext(extract('openEditModal')+"\nopenEditModal({id:'saved',selector:'#target',text:'Saved note'})",context)
 assert.equal(positioned,null)
 assert.equal(context.activeTarget,target)
})
