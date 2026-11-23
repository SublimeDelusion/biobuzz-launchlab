import test from 'node:test';import assert from 'node:assert/strict';
import {newLab,paramsFor,normalize,directWheelParams,clone,toCSV,parseCSV} from '../docs/lab-state.mjs';
import {launch,simulate} from '../docs/physics.mjs';
import {drawSpinMarker,spinLabel} from '../docs/spin-visual.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('one drive RPM controls kick shaft RPM through fixed gearing regardless of wheel diameter',()=>{
 const s=newLab();s.active='differential';s.robots.differential.outerD=4;s.robots.differential.gearRatio=1.5;
 for(const rpm of [2000,4000,6000]){s.ranges.differential.rpm=rpm;const p=paramsFor(s),L=launch(p);near(p.outerRpm,rpm);near(L.samples[0].uo/(p.outerD*.0254/2),rpm*Math.PI/30);
 for(const q of L.samples){near(q.uo/(p.outerD*.0254/2),q.uw/(p.wheelD*.0254/2)*1.5);near(q.outerWheelTheta,q.wheelTheta*1.5);}}
 assert.equal(s.robots.differential.gearRatio,1.5);
});
test('old motor ratios migrate to actual shaft RPM once and preserve unequal-diameter kick speeds',()=>{
 const s=newLab();delete s.wheelSpeedRevision;delete s.differentialRevision;s.robots.differential.driveRatio=2;s.robots.differential.wheelD=2.5;s.robots.differential.outerD=4;s.robots.differential.rearRatio=1.2;s.ranges.differential.rpm=3000;
 const old={...paramsFor(s,'differential'),wheelSpeedRevision:undefined,differentialRevision:undefined,driveRatio:2,rpm:3000,rearRatio:1.2};s.setups=[{name:'saved',params:old}];s.reference=clone(s.setups[0]);
 const migrated=normalize(s),p=paramsFor(migrated,'differential');near(p.rpm,4500);near(p.outerRpm,4500);near(p.gearRatio,1);assert.equal(p.driveRatio,1);
 assert.deepEqual(normalize(migrated),migrated);assert.deepEqual(parseCSV(toCSV(migrated)),migrated);near(migrated.setups[0].params.outerRpm,4500);assert.deepEqual(directWheelParams(migrated.reference.params),migrated.reference.params);
});
test('forward spin marker rotates clockwise at full integrated angular displacement',()=>{
 const rotations=[],noop=()=>{};const c={save:noop,restore:noop,beginPath:noop,moveTo:noop,lineTo:noop,arc:noop,closePath:noop,fill:noop,stroke:noop,rotate:x=>rotations.push(x)};
 drawSpinMarker(c,30,0,0);drawSpinMarker(c,30,-Math.PI/2,0);drawSpinMarker(c,30,-Math.PI*2,0);near(rotations[1]-rotations[0],Math.PI/2);near(rotations[2]-rotations[0],Math.PI*2);assert.match(spinLabel(-Math.PI*20),/FORWARD.*600 RPM/);assert.match(spinLabel(Math.PI*20),/BACKSPIN.*600 RPM/);
});
test('geared launch preserves ball rotation and spin into flight',()=>{
 const p={...paramsFor(newLab(),'differential'),overlap:0,outerCompression:5,rearRatio:1.5},r=simulate(p),tl=r.timeline,exit=tl.samples.find(x=>x.t===tl.exitTime);assert.ok(exit.w<0);near(exit.theta,r.L.theta);
 const later=tl.samples.find(x=>x.t>tl.exitTime+.02);assert.ok(later.theta<exit.theta);assert.ok(later.w<0);
});
test('rear-driven reference settings generate forward spin over the release-angle range',()=>{
 for(const angle of [10,30,45,60,75])for(const gearRatio of [2,3,4]){
  const p={...paramsFor(newLab(),'differential'),angle,gearRatio,rpm:4000,compression:5},L=launch(p),g=L.geo;
  assert.ok(L.w<0,`forward spin at ${angle} degrees and ${gearRatio}:1`);
  near((g.outer.x-g.wheel.x)*Math.cos(angle*Math.PI/180)+(g.outer.y-g.wheel.y)*Math.sin(angle*Math.PI/180),0);
  near(g.splitCompression,.0025);near(g.point(g.length).x,0);near(g.point(g.length).y,p.height);
  assert.ok(L.energy<=L.work+.5*p.mass/1000*p.feed**2+.005);
 }
});
test('independent front and rear diameters affect surface speed without changing shaft gearing',()=>{
 const s=newLab();s.active='differential';s.robots.differential.gearRatio=3;s.ranges.differential.rpm=4000;
 const first=launch(paramsFor(s));s.robots.differential.outerD=3.5;s.robots.differential.wheelD=2;const p=paramsFor(s),L=launch(p);
 near(p.rpm,4000);near(p.innerRpm,4000/3);assert.notEqual(L.U,first.U);assert.notEqual(L.w,first.w);
});
