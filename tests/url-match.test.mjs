import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'
const ctx=vm.createContext({URL})
vm.runInContext(readFileSync(new URL('../scripts/url-match.js',import.meta.url),'utf8'),ctx)
test('section anchors still share notes, query pages remain separate',()=>{
 assert.equal(ctx.pageUrlsMatch('https://example.test/a/#section','https://example.test/a'),true)
 assert.equal(ctx.pageUrlsMatch('https://example.test/?page=1','https://example.test/?page=2'),false)
})
test('hash routes cannot resolve notes from another route',()=>{
 for(const prefix of ['#/','#!/']){
 const a='https://example.test/'+prefix+'one',b='https://example.test/'+prefix+'two'
 assert.equal(ctx.pageUrlsMatch(a,b),false)
 assert.equal(ctx.findStoredPage({[a]:{url:a,annotations:[{id:'a'}]}},b),null)
 assert.equal(ctx.pageUrlsMatch(a,a),true)
 }
})
