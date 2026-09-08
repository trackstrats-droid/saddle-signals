import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../app/shared-analytics-client.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function setup({accepted=false,dnt=false,existing=false,failInit=false}={}) {
  let consent=accepted;let optedOut=true;let config;let inits=0;const events=[];const scripts=[];
  const sdk={
    init:(_key,options)=>{if(failInit)throw Error('blocked');config=options;inits++;options.loaded?.();},
    opt_in_capturing:()=>{optedOut=false;},opt_out_capturing:()=>{optedOut=true;},
    capture:(event,properties)=>{if(!optedOut&&config?.before_send({event,properties}))events.push({event,properties});},
    identify:()=>{if(!optedOut&&config?.before_send({event:'identify'}))events.push({event:'identify'});},
  };
  const window={location:{pathname:'/'},...(existing?{posthog:sdk}:{})};
  const document={head:{appendChild:s=>scripts.push(s)},createElement:()=>({remove(){}})};
  const context={exports:{},window,document,require:()=>({hasAnalyticsConsent:()=>consent&&!dnt})};
  vm.createContext(context);vm.runInContext(code,context);
  return {api:context.exports,events,scripts,setConsent:value=>{consent=value;},load:()=>{window.posthog=sdk;scripts.at(-1).onload();},get inits(){return inits;},get config(){return config;},get optedOut(){return optedOut;}};
}
test('no consent, refusal and DNT do not load the SDK or send events',async()=>{
  for(const state of [setup(),setup({accepted:true,dnt:true})]) {
    await state.api.startAnalytics('test');state.api.trackAnalytics('test','interaction');state.api.identifyAnalytics('test','id');
    assert.equal(state.scripts.length,0);assert.equal(state.events.length,0);
  }
});
test('acceptance loads once and concurrent starts send one view',async()=>{
  const state=setup({accepted:true});const one=state.api.startAnalytics('test');const two=state.api.startAnalytics('test');
  assert.equal(state.scripts.length,1);state.load();await Promise.all([one,two]);
  assert.equal(state.inits,1);assert.equal(state.events.length,1);assert.equal(state.events[0].event,'test_tool_viewed');
  state.api.trackAnalytics('test','filter_changed');assert.equal(state.events.length,2);
});
test('withdrawal while loading discards the view and all further interaction events',async()=>{
  const state=setup({accepted:true});const pending=state.api.startAnalytics('test');state.setConsent(false);state.load();await pending;
  assert.equal(state.inits,0);assert.equal(state.events.length,0);
});
test('cross-tool withdrawal gates sends immediately and opts out on synchronisation',async()=>{
  const state=setup({accepted:true,existing:true});await state.api.startAnalytics('test');
  state.setConsent(false);state.api.trackAnalytics('test','filter_changed');state.api.identifyAnalytics('test','id');
  assert.equal(state.events.length,1);assert.equal(state.config.before_send({event:'late'}),null);
  await state.api.startAnalytics('test');assert.equal(state.optedOut,true);
  state.setConsent(true);await state.api.startAnalytics('test');state.api.trackAnalytics('test','filter_changed');assert.equal(state.events.length,2);
});
test('blocked scripts and init failures never break consent or navigation',async()=>{
  const state=setup({accepted:true});const pending=state.api.startAnalytics('test');state.scripts[0].onerror();await pending;assert.equal(state.events.length,0);
  const failed=setup({accepted:true,existing:true,failInit:true});await failed.api.startAnalytics('test');assert.equal(failed.events.length,0);
});
