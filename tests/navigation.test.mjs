import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'
const source=readFileSync(new URL('../scripts/popup.js',import.meta.url),'utf8')
const start=source.indexOf('const findMatchingTab =')
const fn=source.slice(start,source.indexOf('\n}',start)+2)
async function choose(local,all){
 const context=vm.createContext({chrome:{tabs:{query:async q=>q.currentWindow?local:all}},pageUrlsMatch:(a,b)=>a===b})
 vm.runInContext(fn,context)
 return vm.runInContext("findMatchingTab('https://example.test/')",context)
}
test('return prefers active matching tab over duplicate in another window',async()=>{
 const active={id:2,active:true,url:'https://example.test/'}
 assert.equal((await choose([active],[{id:1,url:active.url},active])).id,2)
})
test('return reuses same-window match before other windows and falls back when needed',async()=>{
 const match={id:3,url:'https://example.test/'}
 assert.equal((await choose([match],[{...match,id:4}])).id,3)
 assert.equal((await choose([],[match])).id,3)
 assert.equal(await choose([],[]),undefined)
})

const pageSource=readFileSync(new URL('../scripts/webpage.js',import.meta.url),'utf8')
const scrollStart=pageSource.indexOf('const scrollToNote =')
const scrollFn=pageSource.slice(scrollStart,pageSource.indexOf('\n}',scrollStart)+2)
test('jump centers the note card with current scroll offset and respects reduced motion',()=>{
 let result
 const window={scrollY:700,innerHeight:800,matchMedia:()=>({matches:false}),scrollTo:value=>{result=value}}
 const context=vm.createContext({window,note:{getBoundingClientRect:()=>({top:500,height:120})}})
 vm.runInContext(scrollFn,context)
 vm.runInContext('scrollToNote(note)',context)
 assert.equal(result.top,860)
 assert.equal(result.behavior,'smooth')
 window.matchMedia=()=>({matches:true})
 context.note.getBoundingClientRect=()=>({top:-690,height:40})
 vm.runInContext('scrollToNote(note)',context)
 assert.equal(result.top,0)
 assert.equal(result.behavior,'auto')
})
