import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs'
const source = fs.readFileSync(new URL('../scripts/welcome.js', import.meta.url), 'utf8')
const flush = () => new Promise(resolve => setImmediate(resolve))
function fixture(initialPinned = false, hasChrome = true) {
 const node = (dataset = {}) => ({ dataset, hidden: false, textContent: '', handlers: {}, attrs: {}, classes: new Set(), addEventListener(type, fn) { this.handlers[type] = fn }, setAttribute(k,v) {this.attrs[k]=v}, removeAttribute(k) {delete this.attrs[k]}, classList: { toggle(name, on) { on ? this.owner.classes.add(name) : this.owner.classes.delete(name) } } })
 const nodes = new Map(['#setup-progress','#setup-status','#pin-status','#pin-status-title','#pin-status-detail'].map(id=>[id,node()]))
 const steps = Array.from({length:4}, (_,i)=>node({gsStep:String(i)}))
 const panels = Array.from({length:4}, (_,i)=>node({gsPanel:String(i)}))
 for(const n of [...nodes.values(),...steps,...panels]) n.classList.owner=n
 let listener, stored=2, pinned=initialPinned
 const handlers={}
 const context = {document:{readyState:'complete',querySelector:id=>nodes.get(id),querySelectorAll:s=>s==='.gs-panel'?panels:s==='.gs-step'||s==='[data-gs-step]'?steps:[]},window:{addEventListener:(k,f)=>handlers[k]=f,removeEventListener:k=>delete handlers[k]},NotateSetupSync:{STEP_COUNT:4,readStep:async()=>stored,writeStep:async n=>{stored=n},onChange(){}}, chrome:hasChrome?{action:{getUserSettings:async()=>({isOnToolbar:pinned}),onUserSettingsChanged:{addListener:f=>listener=f,removeListener:()=>listener=null}}}:undefined}
 vm.runInNewContext(source,context)
 return {steps,panels,nodes,handlers,pin(value){pinned=value;listener?.({isOnToolbar:value})},get stored(){return stored},get listener(){return listener}}
}
test('real pin event completes the pin step, advances and persists the next step',async()=>{
 const f=fixture();await flush();assert.equal(f.panels[2].hidden,false);assert.equal(f.steps[2].classes.has('is-done'),false)
 f.pin(true);await flush();assert.equal(f.panels[3].hidden,false);assert.equal(f.steps[2].classes.has('is-done'),true);assert.equal(f.stored,3)
 f.handlers.pagehide();assert.equal(f.listener,null)
})
test('already pinned users advance on load; unpinning clears the completion mark',async()=>{
 const f=fixture(true);await flush();assert.equal(f.stored,3);f.pin(false);await flush();assert.equal(f.steps[2].classes.has('is-done'),false);assert.equal(f.stored,3)
})
test('web preview does not fabricate pin completion',async()=>{
 const f=fixture(false,false);await flush();assert.equal(f.stored,2);assert.equal(f.steps[2].classes.has('is-done'),false)
})
