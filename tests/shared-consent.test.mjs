import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync(new URL('../app/shared-analytics-consent.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const key = 'trackstrats_collection_analytics_v1';
const store = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) }; };
function jar() {
  const data = new Map(); const writes = [];
  return {
    writes,
    read: () => [...data].map(([k,v]) => k + '=' + v.value).join('; '),
    write(text) {
      writes.push(text);
      const [pair,...attributes] = text.split(';').map(x => x.trim());
      const [name,value] = pair.split('=');
      // Simulate separate host-only deletion; production writes use the parent domain.
      if (!attributes.includes('Domain=trackstrats.com')) return;
      if (attributes.includes('Max-Age=0')) data.delete(name);
      else data.set(name,{value,persistent:attributes.some(x=>x.startsWith('Max-Age='))});
    },
    newSession() { for (const [k,v] of data) if (!v.persistent) data.delete(k); },
    clear() { data.clear(); },
  };
}
function tool({cookies=jar(),hostname='paceprofiler.trackstrats.com',protocol='https:',local=store(),session=store(),dnt=null,blocked=false,server=false}={}) {
  const windowTarget = new EventTarget(); const documentTarget = new EventTarget(); let poll; let noWrites = blocked;
  const document = Object.assign(documentTarget,{visibilityState:'visible'});
  Object.defineProperty(document,'cookie',{get:()=>cookies.read(),set:value=>{if(noWrites)throw Error('blocked');cookies.write(value);}});
  const window = Object.assign(windowTarget,{location:{hostname,protocol},localStorage:local,sessionStorage:session,navigator:{doNotTrack:dnt},setInterval:fn=>{poll=fn;return 1;},clearInterval:()=>{poll=undefined;}});
  const context = {exports:{},Event,...(server?{}:{window,document})};
  vm.createContext(context);vm.runInContext(code,context);
  return {api:context.exports,cookies,window,local,session,poll:()=>poll?.(),block:()=>{noWrites=true;}};
}
test('one shared acceptance spans tools, survives a new session and renews persistent storage',()=>{
  const cookies=jar();const first=tool({cookies});first.api.saveConsent('accepted');
  for (const name of ['racecards','racescanner','saddlesignals','aheadofthemark','furthestfromhome','marketmovers','paceprofiler']) assert.equal(tool({cookies,hostname:name+'.trackstrats.com'}).api.readConsent(),'accepted');
  cookies.newSession();assert.equal(tool({cookies}).api.readConsent(),'accepted');
  assert.match(cookies.writes.filter(value=>value.startsWith(key+'=')).at(-1),/Domain=trackstrats.com; Path=\/; SameSite=Lax; Secure; Max-Age=34560000$/);
});
test('shared refusal replaces persistent acceptance, survives navigation but not a fresh browser session',()=>{
  const cookies=jar();tool({cookies}).api.saveConsent('accepted');tool({cookies,hostname:'racecards.trackstrats.com'}).api.saveConsent('denied');
  assert.equal(tool({cookies}).api.readConsent(),'denied');assert.doesNotMatch(cookies.writes.filter(value=>value.startsWith(key+'=')).at(-1),/Max-Age|Expires/);
  cookies.newSession();assert.equal(tool({cookies}).api.readConsent(),null);
});
test('withdrawal in another open tool blocks immediately and synchronises the UI on focus or polling',()=>{
  const cookies=jar();const first=tool({cookies});const second=tool({cookies,hostname:'racecards.trackstrats.com'});
  let changes=0;const cleanup=second.api.subscribeConsent(()=>changes++);
  first.api.saveConsent('accepted');second.poll();assert.equal(changes,1);
  first.api.saveConsent('denied');assert.equal(second.api.hasAnalyticsConsent(),false);
  second.window.dispatchEvent(new Event('focus'));assert.equal(changes,2);
  cleanup();first.api.saveConsent('accepted');second.poll();assert.equal(changes,2);
});
test('legacy acceptance persists on its original tool without granting collection consent',()=>{
  const local=store();const first=tool({local});
  local.setItem(first.api.LEGACY_CONSENT_KEY,'accepted');
  assert.equal(first.api.readConsent(),'accepted');
  assert.equal(tool({local}).api.readConsent(),'accepted');
  assert.equal(tool({cookies:first.cookies,hostname:'other.trackstrats.com'}).api.readConsent(),null);
  assert.equal(first.cookies.writes.length,0);
});
test('legacy refusal is session-only, including older permanent essential-only values',()=>{
  const first=tool();first.local.setItem(first.api.LEGACY_CONSENT_KEY,'accepted');
  first.session.setItem(first.api.LEGACY_CONSENT_KEY,'denied');assert.equal(first.api.readConsent(),'denied');
  const old=tool();old.local.setItem(old.api.LEGACY_CONSENT_KEY,'essential');
  assert.equal(old.api.readConsent(),null);
  const denied=tool();denied.session.setItem(denied.api.LEGACY_CONSENT_KEY,'denied');assert.equal(denied.api.readConsent(),'denied');
  assert.equal(tool({local:denied.local,cookies:denied.cookies}).api.readConsent(),null);
});
test('a newer shared refusal retires old acceptances even on tools not opened until the next session',()=>{
  const cookies=jar();const first=tool({cookies});const other=tool({cookies,hostname:'racecards.trackstrats.com'});
  first.local.setItem(first.api.LEGACY_CONSENT_KEY,'accepted');
  other.local.setItem(other.api.LEGACY_CONSENT_KEY,'accepted');
  assert.equal(first.api.readConsent(),'accepted');
  first.api.saveConsent('denied');cookies.newSession();
  assert.equal(tool({cookies,local:first.local}).api.readConsent(),null);
  assert.equal(tool({cookies,local:other.local,hostname:'racecards.trackstrats.com'}).api.readConsent(),null);
});
test('shared acceptance takes priority over old session rejection and is renewed once per page',()=>{
  const cookies=jar();const first=tool({cookies});first.session.setItem(first.api.LEGACY_CONSENT_KEY,'denied');
  tool({cookies,hostname:'racecards.trackstrats.com'}).api.saveConsent('accepted');
  assert.equal(first.api.readConsent(),'accepted');const writes=cookies.writes.length;
  first.api.readConsent();first.api.hasAnalyticsConsent();assert.equal(cookies.writes.length,writes);
});
test('preview and lookalike domains never write the shared production cookie',()=>{
  for(const [hostname,protocol] of [['localhost','http:'],['trackstrats.com.evil.test','https:'],['eviltrackstrats.com','https:'],['preview.chatgpt.site','https:'],['racecards.trackstrats.com','http:']]) {
    const preview=tool({hostname,protocol});preview.api.saveConsent('accepted');assert.equal(preview.cookies.writes.length,0);
    assert.equal(preview.local.getItem(key),'accepted');assert.equal(tool({cookies:preview.cookies}).api.readConsent(),null);
  }
});
test('deleted cookies, DNT, SSR and blocked writes fail safely',()=>{
  const first=tool();first.api.saveConsent('accepted');first.cookies.clear();assert.equal(first.api.readConsent(),null);
  assert.equal(tool({server:true}).api.hasAnalyticsConsent(),false);
  const dnt=tool({dnt:'1'});dnt.api.saveConsent('accepted');assert.equal(dnt.api.hasAnalyticsConsent(),false);
  const denied=tool();denied.api.saveConsent('accepted');denied.block();denied.api.saveConsent('denied');assert.equal(denied.api.hasAnalyticsConsent(),false);
  const blocked=tool({blocked:true});blocked.api.saveConsent('accepted');assert.equal(blocked.api.hasAnalyticsConsent(),true);assert.equal(tool({cookies:blocked.cookies}).api.readConsent(),null);
});
test('preview refusal remains session-only and acceptance remains persistent',()=>{
  const first=tool({hostname:'localhost',protocol:'http:'});first.api.saveConsent('denied');
  assert.equal(tool({hostname:'localhost',protocol:'http:',local:first.local,session:first.session}).api.readConsent(),'denied');
  assert.equal(tool({hostname:'localhost',protocol:'http:',local:first.local}).api.readConsent(),null);
  first.api.saveConsent('accepted');assert.equal(tool({hostname:'localhost',protocol:'http:',local:first.local}).api.readConsent(),'accepted');
});
