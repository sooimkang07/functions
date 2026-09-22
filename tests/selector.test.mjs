import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'
const source = readFileSync(new URL('../scripts/webpage.js', import.meta.url), 'utf8')
const start = source.indexOf('const getSelector =')
const fn = source.slice(start, source.indexOf('\n}', start) + 2)
const body = { children: [] }, html = {}
const context = vm.createContext({ document: { body, documentElement: html }, CSS: { escape: value => value.replace(':', '\\:') } })
vm.runInContext(fn, context)
const selector = element => { context.element = element; return vm.runInContext('getSelector(element)', context) }
test('missing, detached, and parentless targets are rejected without throwing', () => {
  for (const element of [null, undefined, body, html, {nodeType:1,isConnected:false}, {nodeType:1,isConnected:true,tagName:'DIV',parentElement:null}]) assert.equal(selector(element), null)
})
test('connected target has a structural selector and escaped ID', () => {
  const element = {nodeType:1,isConnected:true,tagName:'DIV',parentElement:body}
  body.children = [element]
  assert.equal(selector(element), 'div')
  element.id = 'card:1'
  assert.equal(selector(element), '#card\\:1')
})

const fallbackStart = source.indexOf('const getFallbackNotePosition =')
const fallbackFn = source.slice(fallbackStart, source.indexOf('\n}', fallbackStart) + 2)
test('missing targets use saved position plus drag offsets and clamp horizontally', () => {
 const ctx = vm.createContext({window:{scrollX:0,scrollY:0,innerWidth:1000},lastNotePositions:new Map()})
 vm.runInContext(fallbackFn,ctx)
 ctx.note = {id:'a',pagePosition:{left:300,top:900},offsetInline:20,offsetBlock:30}
 assert.equal(vm.runInContext('getFallbackNotePosition(note).top',ctx),930)
 assert.equal(vm.runInContext('getFallbackNotePosition(note).left',ctx),320)
 ctx.note.pagePosition.left = 2000
 assert.equal(vm.runInContext('getFallbackNotePosition(note).left',ctx),720)
 ctx.note = {id:'legacy'}
 assert.equal(vm.runInContext('getFallbackNotePosition(note).top',ctx),96)
})
