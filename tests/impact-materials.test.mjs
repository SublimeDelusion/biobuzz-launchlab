import test from 'node:test';
import assert from 'node:assert/strict';
import {POLLEN,impactMaterial} from '../docs/impact-materials.mjs';
import {launch,flight,surfaceImpulse} from '../docs/physics.mjs';
import {newLab,normalize,paramsFor,parseCSV,toCSV} from '../docs/lab-state.mjs';

const lab = newLab();
const p = {...paramsFor(lab), rpm:4500, angle:68, distance:1.2192};
const r = p.ballD*.0254/2, m = p.mass/1000, I = p.inertia*m*r*r;
const energy = (vx,vy,w) => .5*(m*(vx*vx+vy*vy)+I*w*w);

test('CAD inertia and nominal mass propagate across the lineup and replace former stock defaults once',()=>{
  const old=newLab();
  delete old.materialRevision;
  old.globals.mass=35;
  old.globals.inertia=2/3;
  const current=normalize(old);
  for(const id of Object.keys(current.robots)){
    const q=paramsFor(current,id);
    assert.equal(q.mass,25);
    assert.equal(q.inertia,.635);
  }
  old.globals.mass=27;
  old.globals.inertia=.62;
  assert.equal(normalize(old).globals.mass,27);
  assert.equal(normalize(old).globals.inertia,.62);
  current.globals.mass=35;
  assert.equal(normalize(current).globals.mass,35);
  assert.equal(POLLEN.mass,p.mass);
});

test('supported PETG and midspan hits differ, per-surface overrides bypass the panel estimate',()=>{
  const at=(f)=>impactMaterial(p,'floor',f);
  assert.equal(at(0).e,p.restitution);
  assert.ok(at(.5).e>.42&&at(.5).e<.44);
  assert.ok(at(.25).e>at(.5).e);
  assert.equal(at(.25).mu,at(.5).mu);
  const s=newLab();
  s.globals.materials={floor:{e:.4,mu:.23},tile:{e:.51,mu:.36}};
  const q=paramsFor(parseCSV(toCSV(s)));
  for(const f of [0,.5,1])assert.equal(impactMaterial(q,'floor',f).e,.4);
  assert.equal(impactMaterial(q,'field floor').e,.51);
  assert.equal(impactMaterial(q,'field floor').mu,.36);
  assert.equal(impactMaterial(q,'back wall',.5).e,at(.5).e);
});

test('EVA returns the specified drop height with no spin; grip cannot create energy or extra vertical lift',()=>{
  for(const name of ['field floor','back wall','lip','near perimeter']){
    const mat=impactMaterial(p,name,.5);
    for(const vy of [-1,-3,-5])for(const vx of [-4,-1,0,2])for(const w of [-230,0,230]){
      const b=surfaceImpulse(vx,vy,w,0,1,r,m,I,mat.mu,mat.e,mat.shear,mat.threshold);
      assert.ok(Math.abs(b.vy+mat.e*vy)<1e-10);
      assert.ok(energy(b.vx,b.vy,b.w)<=energy(vx,vy,w)+1e-12);
      assert.ok(Math.abs(b.jt)<=mat.mu*b.jn+1e-12);
    }
  }
  const drop={...p,drag:0,magnus:0,height:r+1};
  const shot=flight(drop,{v:0,w:0,geo:{r}},true);
  const hits=shot.events.filter(e=>e.name==='field floor');
  const apex=Math.max(...shot.pts.filter(q=>q.t>hits[0].t&&q.t<hits[1].t).map(q=>q.y-r));
  assert.ok(Math.abs(apex-.55**2)<.004);
});

test('at the same release speed and angle, backspin can escape and clear the perimeter after an EVA bounce',()=>{
  const L=launch(p);
  const spinning=flight(p,L,true), dead=flight(p,{...L,w:0},true);
  assert.equal(dead.ended,'settled in CELL');
  assert.equal(spinning.entered,true);
  assert.equal(spinning.leftField,true);
  assert.ok(spinning.escapeTime>spinning.entry.t);
  assert.ok(spinning.firstFloorTime>spinning.escapeTime);
  assert.ok(spinning.boundaryTime>spinning.firstFloorTime);
  const hit=spinning.events.find(e=>e.name==='field floor');
  assert.ok(hit.after.vx<hit.before.vx && hit.before.vx<0);
  assert.ok(hit.after.w<hit.before.w && hit.after.vy>0);
  assert.ok(spinning.pts.some(q=>q.t>hit.t&&q.y-r>spinning.field.wallHeight));
  const softer=flight({...p,materials:{tile:{e:.35,mu:.45}}},L,true);
  assert.equal(softer.ended,'settled on field');
});
