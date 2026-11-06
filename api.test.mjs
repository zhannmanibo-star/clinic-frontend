import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {api,login,googleLogin,logout,saveTokens,clearSession,restoreSession} from './src/api.js';
const store=new Map();
globalThis.sessionStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
globalThis.window=new EventTarget();
const response=(data,status=200)=>new Response(JSON.stringify(data),{status});
beforeEach(()=>clearSession());
test('login sends correct credentials and stores tokens',async()=>{
 globalThis.fetch=async(url,opts)=>{assert.equal(url,'/api/auth/login');assert.equal(opts.method,'POST');assert.deepEqual(JSON.parse(opts.body),{email:'test@example.test',password:'test-password'});assert.equal(opts.headers.Authorization,undefined);return response({user:{id:1,role:'patient'},tokens:{access_token:'a',refresh_token:'r'}});};
 assert.equal((await login({email:'test@example.test',password:'test-password'})).role,'patient');assert.equal(restoreSession(),true);
});
test('invalid login creates no session',async()=>{globalThis.fetch=async()=>response({error:'Invalid email or password.'},401);await assert.rejects(()=>login({}),/Invalid email/);assert.equal(restoreSession(),false);});
test('concurrent 401 requests use one refresh and retry',async()=>{
 saveTokens({access_token:'old',refresh_token:'refresh'});let refreshes=0;
 globalThis.fetch=async(url,opts)=>{if(url==='/api/auth/refresh'){refreshes++;assert.equal(JSON.parse(opts.body).refresh_token,'refresh');await new Promise(r=>setTimeout(r,15));return response({tokens:{access_token:'new',refresh_token:'rotated'}});}if(opts.headers.Authorization==='Bearer old')return response({error:'Unauthorized'},401);assert.equal(opts.headers.Authorization,'Bearer new');return response({ok:true});};
 assert.deepEqual(await Promise.all([api('/dashboard'),api('/appointments')]),[{ok:true},{ok:true}]);assert.equal(refreshes,1);
});
test('expired refresh clears session',async()=>{saveTokens({access_token:'old',refresh_token:'r'});globalThis.fetch=async url=>response({error:'Expired'},url.endsWith('/refresh')?403:401);await assert.rejects(()=>api('/dashboard'),/Expired/);assert.equal(restoreSession(),false);});
test('logout revokes token and clears local state',async()=>{saveTokens({access_token:'a',refresh_token:'r'});globalThis.fetch=async(url,opts)=>{assert.equal(url,'/api/auth/logout');assert.deepEqual(JSON.parse(opts.body),{refresh_token:'r'});return response({});};await logout();assert.equal(restoreSession(),false);});
test('HTML errors are readable',async()=>{globalThis.fetch=async()=>new Response('<html>PHP error</html>',{status:500});await assert.rejects(()=>api('/dashboard'),/invalid response/);});
test('booking uses schedule_id and bearer authentication',async()=>{saveTokens({access_token:'a',refresh_token:'r'});globalThis.fetch=async(url,opts)=>{assert.equal(url,'/api/appointments');assert.equal(opts.headers.Authorization,'Bearer a');assert.deepEqual(JSON.parse(opts.body),{schedule_id:12,reason:'Check-up'});return response({appointment:{id:10}},201);};assert.equal((await api('/appointments',{method:'POST',body:{schedule_id:12,reason:'Check-up'}})).appointment.id,10);});
test('google login posts the Google credential and stores our tokens',async()=>{globalThis.fetch=async(url,opts)=>{assert.equal(url,'/api/auth/google');assert.equal(opts.method,'POST');assert.deepEqual(JSON.parse(opts.body),{credential:'google-id-token'});assert.equal(opts.headers.Authorization,undefined);return response({user:{id:3,role:'patient'},tokens:{access_token:'g',refresh_token:'gr'}});};assert.equal((await googleLogin('google-id-token')).role,'patient');assert.equal(restoreSession(),true);});
test('rejected google token creates no session',async()=>{globalThis.fetch=async()=>response({error:'Google sign-in failed. Please try again.'},401);await assert.rejects(()=>googleLogin('bad'),/Google sign-in failed/);assert.equal(restoreSession(),false);});
