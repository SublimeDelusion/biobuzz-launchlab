import test from 'node:test';
import assert from 'node:assert/strict';
import {labForBall,loadSavedConfiguration,paramsFor} from '../docs/lab-state.mjs';
import {captureRobot,makeRobot,robotDirty,migrateGarage,initializeAmmo,rangeAmmo,botDirty,savedAmmo,FIELD_PROPERTIES,BALL_PROPERTIES} from '../docs/garage.mjs';
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

test('new bots start with Pollen and keep ammo support separate from saved launcher setups',()=>{
 const labs={pollen:labForBall(),nectar:labForBall('nectar')};
 const bot=makeRobot('new','New bot','original',labs);
 initializeAmmo(bot);
 assert.equal(rangeAmmo(bot,'nectar'),'pollen');
 assert.equal(botDirty(bot),true);
 bot.drafts.nectar=captureRobot({...labs.nectar,active:'underhand'});
 bot.saved=structuredClone(bot.drafts);
 bot.savedEnabled={...bot.enabled};
 assert.equal(savedAmmo(bot,'nectar'),false);
 assert.equal(botDirty(bot),false);
 bot.enabled.nectar=true;
 assert.equal(botDirty(bot),true);
 assert.equal(rangeAmmo(bot,'nectar'),'nectar');
 assert.equal(bot.drafts.pollen.design,'original');
 assert.equal(bot.drafts.nectar.design,'underhand');
 const [roundTrip]=readShare(JSON.stringify(bundle([{name:bot.name,robotId:bot.id,enabled:false,params:bot.saved.nectar}],[])));
 assert.equal(roundTrip.value.enabled,false);
 assert.equal(roundTrip.value.params.design,'underhand');
});
