import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'
const source=readFileSync(new URL('../scripts/webpage.js',import.meta.url),'utf8')
const route=source.slice(source.indexOf('let observedPageUrl ='),source.indexOf('const routeCheckTimer ='))
test('route change clears old targets without closing a draft or writing storage',async()=>{
 let clears=0,loads=0,message=''
 const ctx=vm.createContext({location:{href:'https://test/#/one'},pageUrlsMatch:(a,b)=>a===b,annotationLoadVersion:0,jumpHighlightTimer:null,clearTimeout(){},clearNoteTargetPreview(){},clearHoverFill(){},clearHighlights(){},layer:{replaceChildren(){clears++}},annotations:[{id:'old'}],noteDrag:{},isAnnotating:true,isPreviewing:false,isMoving:false,document:{documentElement:{classList:{remove(){}}}},modal:{open:true},reportPageStorageError:m=>message=m,removeToolbar(){throw Error('must retain draft UI')},loadAnnotations:async()=>loads++})
 vm.runInContext(route,ctx)
 ctx.location.href='https://test/#/two'
 await vm.runInContext('checkPageRoute()',ctx)
 assert.equal(clears,1);assert.equal(loads,1);assert.equal(ctx.annotations.length,0);assert.equal(ctx.isAnnotating,false);assert.equal(ctx.modal.open,true);assert.match(message,/Copy your draft/)
 await vm.runInContext('checkPageRoute()',ctx);assert.equal(loads,1)
})
test('late annotation reads cannot replace the new route state',async()=>{
 const start=source.indexOf('let annotationLoadVersion =')
 const end=source.indexOf('\n}',source.indexOf('const loadAnnotations =',start))+2
 let resolve
 const ctx=vm.createContext({location:{href:'https://test/one'},getStoredAnnotations:()=>new Promise(r=>resolve=r),findStoredPage:()=>({annotations:[{id:'old'}]}),getGroupColors:async()=>({}),annotations:[{id:'new'}],notateNormalizeAnnotation:a=>a,notateResolveGroupColor:()=>''})
 vm.runInContext(source.slice(start,end),ctx)
 const pending=vm.runInContext('loadAnnotations()',ctx)
 ctx.location.href='https://test/two';resolve({});await pending
 assert.equal(ctx.annotations[0].id,'new')
})
