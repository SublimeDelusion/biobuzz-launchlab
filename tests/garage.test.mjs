import test from 'node:test';
import assert from 'node:assert/strict';
import {labForBall,loadSavedConfiguration,paramsFor} from '../docs/lab-state.mjs';
import {captureRobot,makeRobot,robotDirty,migrateGarage,FIELD_PROPERTIES,BALL_PROPERTIES} from '../docs/garage.mjs';
import {bundle,readShare} from '../docs/sharing.mjs';

test('robots using the same design preserve independent working values and saved shots',()=>{
 const labs={pollen:labForBall(),nectar:labForBall('nectar')};
 const first=makeRobot('a','One','original',labs,true);
 const second=makeRobot('b','Two','original',labs,true);
 loadSavedConfiguration(labs.pollen,first.drafts.pollen);
 labs.pollen.ranges.original.rpm=4000;
 first.drafts.pollen=captureRobot(labs.pollen);
 assert.equal(second.drafts.pollen.rpm,5400);
 assert.equal(first.drafts.nectar.rpm,6000);
 assert.equal(first.saved.pollen.rpm,5400);
 assert.equal(robotDirty(first,'pollen'),true);
 assert.equal(robotDirty(second,'pollen'),false);
 assert.equal(migrateGarage(labs).length,4);
 labs.pollen.globals.ballD=2.9;
 loadSavedConfiguration(labs.pollen,second.drafts.pollen);
 second.drafts.pollen=captureRobot(labs.pollen);
 assert.equal(robotDirty(second,'pollen'),false);
 assert.equal(paramsFor(labs.pollen).ballD,2.9);
});

test('a share file preserves a robot’s two ball setups and the settings section scope',()=>{
 const labs={pollen:labForBall(),nectar:labForBall('nectar')};
 const robot=makeRobot('mine','Both','spring',labs,true);
 const setups=Object.values(robot.saved).map(params=>({name:robot.name,robotId:robot.id,params}));
 const models=[{name:'CELL',scope:'field',globals:{restitution:.52}},{name:'Nectar',ball:'nectar',scope:'ball',globals:{mass:42}}];
 const shared=readShare(JSON.stringify(bundle(setups,models)));
 assert.deepEqual(shared.slice(0,2).map(x=>[x.value.robotId,x.value.params.ball]),[['mine','pollen'],['mine','nectar']]);
 assert.deepEqual(shared.slice(2).map(x=>x.value.scope),['field','ball']);
 assert.ok(FIELD_PROPERTIES.includes('restitution')&&!BALL_PROPERTIES.includes('restitution'));
 assert.ok(BALL_PROPERTIES.includes('mass')&&!FIELD_PROPERTIES.includes('mass'));
});
