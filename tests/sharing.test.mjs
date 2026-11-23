import test from 'node:test';
import assert from 'node:assert/strict';
import {bundle,readShare,addSharedItems} from '../docs/sharing.mjs';
import {labForBall,newLab,paramsFor,normalize,saveConfiguration} from '../docs/lab-state.mjs';
import {simulate} from '../docs/physics.mjs';

test('sharing transfers selected items and leaves the current settings intact',()=>{
 const pollen=labForBall(),nectar=labForBall('nectar');
 nectar.distance=1.7;
 const setup=saveConfiguration(nectar,'Nectar test','sender-id','2026-11-23');
 const shared=bundle([setup],[{name:'Shared air',ball:'pollen',globals:pollen.globals}]);
 assert.equal(shared.setups[0].params.mass,undefined);
 assert.equal(shared.setups[0].params.materials,undefined);
 const items=readShare(JSON.stringify(shared));
 assert.equal(items[0].value.params.ball,'nectar');
 assert.equal(items[0].value.params.distance,1.7);
 const recipient=labForBall('nectar');
 addSharedItems(recipient,[items[0]],()=> 'recipient-id');
 assert.equal(recipient.setups[0].id,'recipient-id');
 assert.equal(recipient.setups[0].source,'Imported');
 assert.equal(recipient.models.length,0);
 assert.notEqual(recipient.distance,1.7);
 addSharedItems(pollen,[items[1]],()=> 'model-id');
 assert.equal(normalize(pollen).models[0].name,'Shared air');
 assert.equal(pollen.activeModelId,null);
 assert.equal(readShare(JSON.stringify(newLab()))[0].kind,'model');
});

test('all first-run settings reach the CELL with an empty setup library',()=>{
 for(const ball of ['pollen','nectar']){
  const lab=labForBall(ball);
  assert.equal(lab.setups.length,0);
  assert.equal(normalize(lab).ball,ball);
  for(const design of Object.keys(lab.robots)){
   const {shot}=simulate(paramsFor(lab,design));
   assert.ok(shot.entered||shot.firstContact!=null,`${ball} ${design}`);
  }
 }
});
