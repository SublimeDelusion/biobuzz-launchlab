import {DESIGNS} from './mechanics.mjs';
import {GLOBAL_KEYS,clone,labForBall,paramsFor} from './lab-state.mjs';
import {exportSetup} from './sharing.mjs';

export const BALLS=['pollen','nectar'];
export const BALL_PROPERTIES=['ballD','mass','inertia','stiffness','ballGrip','drag','magnus','spinDecay'];
export const FIELD_PROPERTIES=[...GLOBAL_KEYS.filter(key=>!BALL_PROPERTIES.includes(key)),'materials'];

export function pickProperties(values,keys){
 return Object.fromEntries(keys.filter(key=>Object.hasOwn(values,key)).map(key=>[key,clone(values[key])]));
}
export function captureRobot(lab){
 const {compression,throatInterference,...params}=exportSetup({params:paramsFor(lab)}).params;
 return params;
}

export function makeRobot(id,name,design,labs,saved=false){
 const drafts=Object.fromEntries(BALLS.map(ball=>[ball,captureRobot({...labs[ball],active:design})]));
 return {id,name,draftName:name,design,drafts,saved:saved?clone(drafts):{}};
}

export function migrateGarage(labs){
 const robots=DESIGNS.map(({id,name})=>makeRobot(id,name,id,labs,true));
 for(const ball of BALLS){
  for(const setup of labs[ball].setups){
   const {design}=setup.params;
   if(!DESIGNS.some(d=>d.id===design))continue;
   robots.push(robotFromSetup(setup,ball,ball+'-'+setup.id));
  }
 }
 return robots;
}

export function robotFromSetup(setup,ball,id){
 const {design}=setup.params;
 const labs=Object.fromEntries(BALLS.map(key=>[key,labForBall(key)]));
 const robot=makeRobot(id,setup.name,design,labs);
 robot.drafts[ball]=clone(setup.params);
 robot.saved[ball]=clone(setup.params);
 return robot;
}

export function robotDirty(robot,ball){
 const saved=robot.saved[ball];
 if(!saved||robot.name!==robot.draftName)return true;
 const current=robot.drafts[ball];
 return Object.keys(current).some(key=>key!=='compression'&&key!=='throatInterference'&&JSON.stringify(current[key])!==JSON.stringify(saved[key]));
}
