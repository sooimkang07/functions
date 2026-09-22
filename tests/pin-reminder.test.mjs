import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs'
const source=fs.readFileSync(new URL('../scripts/pin-reminder.js',import.meta.url),'utf8')
test('panel reminder follows actual pin state and cleans up its listener',async()=>{
 const prompt={hidden:true},handlers={};let listener
 vm.runInNewContext(source,{document:{getElementById:id=>id==='notate-pin-reminder'?prompt:null},window:{addEventListener:(k,f)=>handlers[k]=f,removeEventListener:k=>delete handlers[k]},chrome:{action:{getUserSettings:async()=>({isOnToolbar:false}),onUserSettingsChanged:{addListener:f=>listener=f,removeListener:()=>listener=null}}}})
 await new Promise(r=>setImmediate(r));assert.equal(prompt.hidden,false)
 listener({isOnToolbar:true});assert.equal(prompt.hidden,true)
 listener({isOnToolbar:false});assert.equal(prompt.hidden,false)
 handlers.pagehide();assert.equal(listener,null)
})
test('ordinary web preview never shows a Chrome pin prompt',()=>{
 const prompt={hidden:true}
 vm.runInNewContext(source,{document:{getElementById:id=>id==='notate-pin-reminder'?prompt:null}})
 assert.equal(prompt.hidden,true)
})
