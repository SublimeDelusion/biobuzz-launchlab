import test from 'node:test';
import assert from 'node:assert/strict';
import {newLab,paramsFor,predictObservation} from '../docs/lab-state.mjs';
import {launch,simulate} from '../docs/physics.mjs';
import {differentialTractionNote} from '../docs/mechanics.mjs';
const base=()=>paramsFor(newLab(),'differential');
test('outside speed can reverse release spin and the same spin reaches Range and calibration',()=>{
 const p={...base(),compression:5},slow=launch({...p,gearRatio:1}),fast=launch({...p,gearRatio:3});
 assert.ok(slow.w>0);assert.ok(fast.w<0);assert.ok(fast.v>0);
 const result=simulate({...p,gearRatio:3}),exit=result.timeline.samples.find(q=>q.t===result.timeline.exitTime);
 assert.equal(exit.w,fast.w);assert.equal(result.free.pts[0].w,fast.w);
 const params={...p,gearRatio:3},outerRpm=params.rpm;
 assert.ok(predictObservation({params,rpm:p.rpm,outerRpm,angle:p.angle,distance:p.distance}).spin<0);
});
test('both outside contacts can overcome the initial inner torque without forcing a spin sign',()=>{
 const p=base(),l=launch(p),q=l.traction;
 assert.ok(l.w<0);assert.ok(q.outerSpinImpulse+q.innerSpinImpulse<0);
 const I=p.inertia*p.mass/1000*l.geo.r**2;
 assert.ok(Math.abs(l.w-(q.innerSpinImpulse+q.outerSpinImpulse)/I)<1e-8);
 const noOutside=launch({...p,compression:0,throatGap:p.ballD*25.4});assert.ok(Math.abs(noOutside.w)<1e-8);
 const noGrip=launch({...p,muWheel:0});assert.equal(noGrip.w,0);assert.equal(noGrip.v,p.feed);
});
test('release clears the outside footprint at every placement and preserves the exact exit location',()=>{
 for(const angle of [20,45,75])for(const offset of [-30,15,60])for(const overlap of [0,1]){
  const p={...base(),angle,offset,overlap},l=launch(p),g=l.geo,end=g.point(g.length);
  assert.ok(l.valid);assert.ok(Math.hypot(end.x-g.outer.x,end.y-g.outer.y)>=g.outer.r+g.backLever-1e-9);
  assert.ok(Math.abs(end.x)<1e-9);assert.ok(Math.abs(end.y-p.height)<1e-9);
 }
});
test('traction saturation is reported rather than inventing torque from higher RPM',()=>{
 const p={...base(),muWheel:.4},a=launch({...p,gearRatio:3}),b=launch({...p,gearRatio:4});
 // Changing installed gearing also changes reflected wheel inertia; it need not leave spin identical.
 assert.ok(Number.isFinite(a.w)&&Number.isFinite(b.w));assert.ok(a.traction.outerLimitedFraction>.99);
 assert.match(differentialTractionNote(a),/More RPM alone cannot add torque/);
 for(const L of [a,b]){
  assert.ok(L.energy<=L.work+.5*p.mass/1000*p.feed**2+.005);
  for(const q of L.samples)assert.ok(Math.abs(q.fb)<=p.muWheel*q.No+1e-9);
 }
});
