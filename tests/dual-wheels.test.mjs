import test from 'node:test';
import assert from 'node:assert/strict';
import {newLab,paramsFor,loadSavedConfiguration,normalize} from '../docs/lab-state.mjs';
import {launch} from '../docs/physics.mjs';
test('each shaft ignores hidden spacing in single mode and uses it in dual mode',()=>{
 for(const design of ['original','spring','underhand','differential']){
  for(const rear of design==='differential'?[false,true]:[false]){
   const count=rear?'outerDual':'dual',spacing=rear?'outerGap':'gap',p=paramsFor(newLab(),design);
   const run=(dual,gap)=>launch({...p,[count]:dual,[spacing]:gap});
   assert.equal(run(0,0).w,run(0,25).w);
   assert.notEqual(run(1,0).w,run(1,25).w);
   const lab=newLab();
   loadSavedConfiguration(lab,{...p,[count]:1,[spacing]:22});
   assert.equal(paramsFor(normalize(lab))[spacing],22);
  }
 }
});
