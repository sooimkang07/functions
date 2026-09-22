import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs'
const source=fs.readFileSync(new URL('../scripts/popup.js',import.meta.url),'utf8')
const sync=source.slice(source.indexOf('const syncAddNoteAction ='),source.indexOf('const escapeHtml ='))
test('New remains visible on welcome and website tabs',async()=>{
 for(const url of ['chrome-extension://fixture/welcome.html','https://example.com/','chrome://newtab/']){
  const button={hidden:true};const context=vm.createContext({annotateButton:button,getActiveTab:async()=>({id:1,url}),isRestrictedTab:t=>!/^https?:/.test(t.url)})
  vm.runInContext(sync,context);await vm.runInContext('syncAddNoteAction()',context)
  assert.equal(button.hidden,false);assert.match(button.title,url.startsWith('https:')?/Add a note/:/Open a regular website/)
 }
})
