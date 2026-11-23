import {reconcileSetups} from './saved-setups.mjs';
import {configureGap,gapFromCompression,GAP_REVISION,wheelDepth,WHEEL_SIZE_REVISION,COMPLIANCE_REVISION} from './configuration.mjs';
import {defaults,G,HIVE_CONTACT,launch,flight} from './physics.mjs';
import {robotDefaults,DESIGNS} from './mechanics.mjs';
import {withOfficialField} from './field.mjs';
export const GLOBAL_KEYS=['ballD','mass','inertia','stiffness','drag','magnus','spinDecay','restitution','wallFriction','gravity','airDensity','impactDamping','ballGrip','loadFactor','contactGain'];
export const GLOBAL_DEFAULTS={...Object.fromEntries(GLOBAL_KEYS.filter(k=>k in defaults).map(k=>[k,defaults[k]])),stiffness:300000,gravity:G,airDensity:1.225,impactDamping:0,ballGrip:1,materials:{}};
export const clone=x=>JSON.parse(JSON.stringify(x));
export const WHEEL_SPEED_REVISION='direct-shaft-rpm-v1';
export const DIFFERENTIAL_REVISION='rear-driven-pinch-v1';
function migrateStockRims(robot){
 for(const outer of [false,true]){
  const d=robot[outer?'outerD':'wheelD'],key=outer?'outerWheelDepth':'wheelDepth';
  if([35,40,50,60].includes(robot[outer?'outerDurometer':'durometer'])&&((d===2&&robot[key]===18)||(d===2.25&&robot[key]===21)))robot[key]=(d*25.4-8)/2;
 }
}
export function directWheelParams(source){const p={dual:['original','spring'].includes(source.design)?1:0,outerDual:1,outerGap:15,...source};if(!source.rimRevision)migrateStockRims(p);p.rimRevision=1;if(p.design==='original')p.supportedPair=Number(p.supportedPair===1);if(p.design==='catapult')return p;if(p.wheelSpeedRevision!==WHEEL_SPEED_REVISION){p.rpm*=p.driveRatio??1;if(p.design==='differential')p.rearRatio=(p.rearRatio??1.15)*p.wheelD/p.outerD;}p.driveRatio=1;p.ratio=1;p.wheelSpeedRevision=WHEEL_SPEED_REVISION;
 if(p.design==='differential'){
  if(p.differentialRevision!==DIFFERENTIAL_REVISION){const oldRatio=p.rearRatio??1.15;p.innerRpm=p.rpm;p.rpm*=oldRatio;p.gearRatio=Math.max(1,Math.min(4,oldRatio));p.compression=((p.compression??3.175)+(p.outerCompression??p.compression??3.175))/2;}
  p.differentialRevision=DIFFERENTIAL_REVISION;p.outerRpm=p.rpm;p.innerRpm=p.rpm/p.gearRatio;
 }if(p.design!=='catapult'&&!Number.isFinite(p.throatGap))p.throatGap=gapFromCompression(p);p.wheelDepth=wheelDepth(p);if(p.design==='differential')p.outerWheelDepth=wheelDepth(p,true);return configureGap(p);}

export function newLab(legacy={}){const robots={},ranges={};for(const d of DESIGNS){robots[d.id]={...defaults,...robotDefaults,...d.defaults,design:d.id,minAngle:10,maxAngle:85};ranges[d.id]={rpm:d.defaults.rpm,outerRpm:4000,angle:d.defaults.angle??75};}for(const k of Object.keys(robots.original)){if(k in legacy&&!GLOBAL_KEYS.includes(k)&&!['angle','rpm','distance','height'].includes(k))robots.original[k]=legacy[k];}ranges.original={rpm:(legacy.rpm??4000)*(robots.original.driveRatio??1),outerRpm:4000,angle:legacy.angle??75};robots.original.rpm=ranges.original.rpm;robots.original.driveRatio=1;if(Number.isFinite(legacy.compression))robots.original.throatGap=gapFromCompression({...robots.original,ballD:legacy.ballD??2.8});return {schema:'biobuzz-pits-range',version:2,ball:'pollen',rimRevision:1,hubMountRevision:1,materialRevision:HIVE_CONTACT.version,teamWheelRevision:'andymark-two-inch-v1',wheelSizeRevision:WHEEL_SIZE_REVISION,complianceRevision:COMPLIANCE_REVISION,gapRevision:GAP_REVISION,spinRevision:'slow-shell-spin-v1',wheelSpeedRevision:WHEEL_SPEED_REVISION,differentialRevision:DIFFERENTIAL_REVISION,mechanicsRevision:'v6-refined-cam',camModelRevision:'direct-cam-travel-v1',retired:{designs:{},setups:[],observations:[]},active:'original',robots,ranges,distance:legacy.distance??1.2192,height:Math.min(.4572,legacy.height??.381),globals:{...clone(GLOBAL_DEFAULTS),...Object.fromEntries(GLOBAL_KEYS.filter(k=>k in legacy).map(k=>[k,k==='stiffness'&&legacy[k]===12000?300000:k==='mass'&&legacy[k]===35?defaults.mass:k==='inertia'&&[.667,2/3].includes(legacy[k])?defaults.inertia:legacy[k]]))},observations:[],history:[],models:[],activeModelId:null,setups:[],comparisonIds:[],reference:null};}
export function paramsFor(s,id=s.active){const p={...defaults,...robotDefaults,...s.robots[id],...s.globals,...s.ranges[id],design:id,ball:s.ball,height:s.height,distance:s.distance,rimRevision:1,hiveContactVersion:HIVE_CONTACT.version};p.height=Math.min(.4572,p.height);p.driveRatio=1;p.wheelSpeedRevision=WHEEL_SPEED_REVISION;if(id==='differential'){p.differentialRevision=DIFFERENTIAL_REVISION;p.gearRatio=s.robots[id].gearRatio;p.outerRpm=p.rpm;p.innerRpm=p.rpm/p.gearRatio;p.ratio=1;}if(id==='catapult'){p.angle=p.releaseAngle;p.rpm=0;}return withOfficialField(configureGap(p));}
export function normalize(s){if(s?.schema!=='biobuzz-pits-range'||s.version!==2)throw Error('Unsupported lab file');const out=newLab();out.ball=s.ball==='nectar'?'nectar':'pollen';out.active=DESIGNS.some(d=>d.id===s.active)?s.active:'original';
 const numeric=(obj,template)=>{const q={...template};for(const [k,v] of Object.entries(template)){if(typeof v==='number'&&Number.isFinite(obj?.[k]))q[k]=obj[k];else if(typeof v==='string'&&typeof obj?.[k]==='string')q[k]=obj[k];}return q;};
 for(const d of DESIGNS){out.robots[d.id]=numeric(s.robots?.[d.id],out.robots[d.id]);out.robots[d.id].design=d.id;if(d.id==='original'&&s.robots?.original&&s.robots.original.dual===undefined)out.robots.original.dual=1;out.ranges[d.id]=numeric(s.ranges?.[d.id],out.ranges[d.id]);const r=out.robots[d.id];r.wheelD=Math.min(6,Math.max(1.5,r.wheelD));r.compression=Math.min(56.12,Math.max(0,r.compression));for(const [k,lo,hi]of [['rearRatio',.1,10],['camDrop',15,85],['springStrength',100,1500],['armLength',180,450],['releaseAngle',10,75]])r[k]=Math.max(lo,Math.min(hi,r[k]));if(d.id==='catapult'&&s.robots?.catapult&&!s.camModelRevision)r.camDrop+=r.releaseAngle;r.camDrop=Math.max(r.releaseAngle+5,Math.min(85,r.camDrop));r.minAngle=Math.max(0,Math.min(89,r.minAngle));r.maxAngle=Math.max(r.minAngle+1,Math.min(90,r.maxAngle));out.ranges[d.id].angle=Math.max(r.minAngle,Math.min(r.maxAngle,out.ranges[d.id].angle));}
 if(s.wheelSpeedRevision!==WHEEL_SPEED_REVISION)for(const d of DESIGNS){if(d.id==='catapult'||!s.robots?.[d.id])continue;const r=out.robots[d.id];out.ranges[d.id].rpm*=r.driveRatio??1;r.rpm*=r.driveRatio??1;if(d.id==='differential')r.rearRatio*=r.wheelD/r.outerD;r.driveRatio=1;r.ratio=1;}
 if(s.differentialRevision!==DIFFERENTIAL_REVISION){const r=out.robots.differential,oldRatio=r.rearRatio??1.15;out.ranges.differential.rpm*=oldRatio;r.rpm=out.ranges.differential.rpm;r.gearRatio=Math.max(1,Math.min(4,oldRatio));r.compression=(r.compression+r.outerCompression)/2;}out.robots.differential.gearRatio=Math.max(1,Math.min(4,out.robots.differential.gearRatio));
 if(s.gapRevision!==GAP_REVISION)for(const d of DESIGNS){if(!s.robots?.[d.id])continue;const r=out.robots[d.id];r.throatGap=gapFromCompression({...r,ballD:s.globals?.ballD??2.8});const oldD=d.id==='spring'?96/25.4:2.5;if(Math.abs(r.wheelD-oldD)<.0001)r.wheelD=2;if(d.id==='differential'&&r.outerD===2.5)r.outerD=2;if(r.durometer===50)r.durometer=35;if(d.id==='differential'&&r.outerDurometer===50)r.outerDurometer=35;}
 out.globals=numeric(s.globals,out.globals);for(const k of ['restitution','impactDamping'])out.globals[k]=Math.max(0,Math.min(1,out.globals[k]));for(const [k,lo,hi]of [['mass',10,100],['ballD',2,4],['inertia',.2,1],['stiffness',1000,2000000],['wallFriction',0,1.5],['gravity',1,20],['airDensity',.1,3],['loadFactor',.1,3],['contactGain',1,100],['ballGrip',.1,2],['drag',0,2],['magnus',0,1],['spinDecay',0,3]])out.globals[k]=Math.max(lo,Math.min(hi,out.globals[k]));
 if(s.spinRevision!=='slow-shell-spin-v1'){if(out.globals.spinDecay===.15)out.globals.spinDecay=.03;if(out.globals.inertia===.667)out.globals.inertia=2/3;}
 if(s.materialRevision!==HIVE_CONTACT.version){
  if(out.globals.mass===35)out.globals.mass=defaults.mass;
  if([.667,2/3].includes(out.globals.inertia))out.globals.inertia=defaults.inertia;
 }
 if(s.wheelSizeRevision!==WHEEL_SIZE_REVISION)for(const d of DESIGNS){if(!s.robots?.[d.id])continue;const r=out.robots[d.id];if(r.wheelD===2)r.wheelD=2.125;if(d.id==='differential'&&r.outerD===2)r.outerD=2.125;}
 if(s.teamWheelRevision!=='andymark-two-inch-v1')for(const d of DESIGNS){const r=out.robots[d.id];for(const outer of [false,true]){const size=outer?'outerD':'wheelD',hardness=outer?'outerDurometer':'durometer',depth=outer?'outerWheelDepth':'wheelDepth';if(Math.abs(r[size]-2.125)<1e-6&&[35,40,50,60].includes(r[hardness])){r[size]=2;if(Math.abs(r[depth]-18.9)<.1||r[depth]===18)r[depth]=18;}}}
 if(s.complianceRevision!==COMPLIANCE_REVISION&&out.globals.stiffness===12000)out.globals.stiffness=300000;
 for(const d of DESIGNS)for(const k of ['durometer','outerDurometer'])out.robots[d.id][k]=Math.max(10,Math.min(90,out.robots[d.id][k]));
 for(const d of DESIGNS){const robot=out.robots[d.id];for(const outer of [false,true]){const key=outer?'outerWheelDepth':'wheelDepth';robot[key]=wheelDepth({...robot,[key]:Number.isFinite(s.robots?.[d.id]?.[key])?robot[key]:undefined},outer);}}
 if(!s.rimRevision||!s.teamWheelRevision)for(const r of Object.values(out.robots))migrateStockRims(r);
 out.globals.materials={};for(const k of ['lip','floor','back','upper','tile']){const m=s.globals?.materials?.[k];if(m&&Number.isFinite(m.e)&&Number.isFinite(m.mu))out.globals.materials[k]={e:Math.max(0,Math.min(1,m.e)),mu:Math.max(0,Math.min(1.5,m.mu))};}
 out.distance=Math.max(.3048,Math.min(2.4384,Number(s.distance)||1.2192));out.height=Math.max(.1524,Math.min(.4572,Number(s.height)||.381));for(const k of ['observations','history','setups'])out[k]=Array.isArray(s[k])?s[k].slice(k==='setups'?0:-200):[];out.reference=['uppercut','catapult'].includes(s.reference?.params?.design)?null:s.reference?.params?s.reference:null;out.retired={designs:{...s.retired?.designs,...(s.robots?.catapult?{catapult:{robot:s.robots.catapult,range:s.ranges?.catapult}}:{})},setups:[...(s.retired?.setups??[]),...out.setups.filter(q=>['uppercut','catapult'].includes(q.params?.design))],observations:[...(s.retired?.observations??[]),...out.observations.filter(q=>['uppercut','catapult'].includes(q.design))]};out.setups=out.setups.filter(q=>!['uppercut','catapult'].includes(q.params?.design)).map(q=>({...q,params:directWheelParams(q.params)}));if(out.reference)out.reference={...out.reference,params:directWheelParams(out.reference.params)};out.observations=out.observations.filter(q=>!['uppercut','catapult'].includes(q.design));out.comparisonIds=Array.isArray(s.comparisonIds)?s.comparisonIds:[];if(s.hubMountRevision!==1)restoreButteMount(out);
 out.models=(Array.isArray(s.models)?s.models:[]).filter(model=>typeof model?.id==='string'&&typeof model.name==='string'&&model.globals).map(model=>({...model,globals:clone(model.globals)}));
 out.activeModelId=out.models.some(model=>model.id===s.activeModelId)?s.activeModelId:null;
 return reconcileSetups(out);
}
function restoreButteMount(state){
 const isButte=q=>q?.params?.design==='original'&&String(q.name).trim().toLowerCase()==='butte comp settings';
 const robot=state.robots.original;
 for(const setup of state.setups.filter(isButte)){
  const q=setup.params;
  if(['wheelD','durometer','throatGap','gap','arc'].every(k=>q[k]===robot[k]))robot.supportedPair=1;
  q.supportedPair=1;
 }
 if(isButte(state.reference))state.reference.params.supportedPair=1;
}
export function predictObservation(o,globalOverride){const canonical=directWheelParams(o.params),oldDiff=o.params.design==='differential'&&o.params.differentialRevision!==DIFFERENTIAL_REVISION,driveScale=o.params.wheelSpeedRevision===WHEEL_SPEED_REVISION?1:(o.params.driveRatio??1),measured=o.rpm*driveScale;
 let rpm=oldDiff?(Number.isFinite(o.outerRpm)?o.outerRpm:measured*(canonical.gearRatio??1)):measured;
 const p=withOfficialField({...canonical,...globalOverride,rpm,angle:o.angle,distance:o.distance,...(o.params.design==='catapult'?{releaseAngle:o.angle}:{}),...(oldDiff&&measured>0?{gearRatio:Math.max(1,rpm/measured)}:{})});const L=launch(p),f=flight(p,L);return {speed:L.v,spin:L.w*30/Math.PI,time:f.entry?.t??null,impact:f.entry?.y??null,apex:f.max};}

export function proposeFit(o,globals){if(o.params?.design==='catapult')return null;const measured=['speed','spin','time','impact','apex'].filter(k=>Number.isFinite(o[k]));if(!measured.length)return null;const scales={speed:.5,spin:250,time:.08,impact:.1,apex:.1};const score=g=>{const pred=predictObservation(o,g);return measured.reduce((n,k)=>n+(pred[k]===null?1e4:((pred[k]-o[k])/scales[k])**2),0)/measured.length;};let best={...globals},loss=score(best),before=loss;
 for(let pass=0;pass<2;pass++)for(const [key,lo,hi]of [['loadFactor',.1,3],['contactGain',1,80],['magnus',0,.5]]){let choice=best;for(let i=0;i<=10;i++){const q={...best,[key]:lo+(hi-lo)*i/10},l=score(q);if(l<loss){loss=l;choice=q;}}best=choice;}
 return {globals:best,error:Math.sqrt(loss),before:Math.sqrt(before),keys:['loadFactor','contactGain','magnus'],observation:o};}
export function toCSV(state){const rows=[['type','design','rpm','angle_deg','distance_m','measured_speed_m_s','measured_spin_rpm','outcome','payload_json'],['lab',state.active,'','','','','','',JSON.stringify(state)],...state.observations.map(o=>['observation',o.design,o.rpm,o.angle,o.distance,o.speed,o.spin,o.outcome,JSON.stringify(o)])];return rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');}
export function parseCSV(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=c;}if(cell||row.length){row.push(cell);rows.push(row);}if(quoted)throw Error('Unclosed CSV quote');const at=rows[0]?.indexOf('payload_json');if(at<0)throw Error('Use an exported lab CSV with payload_json');const lab=rows.find(r=>r[0]==='lab');if(!lab)throw Error('CSV has no lab state');return normalize(JSON.parse(lab[at]));}

export function restoreShooterDefaults(state,id=state.active){if(!DESIGNS.some(d=>d.id===id))throw Error('Unknown shooter');const fresh=newLab();state.active=id;state.robots[id]=clone(fresh.robots[id]);state.ranges[id]=clone(fresh.ranges[id]);return state;}
export function loadSavedConfiguration(state,source){const q=directWheelParams(source),id=q.design;if(!DESIGNS.some(d=>d.id===id))throw Error('Unknown saved shooter');const base=newLab().robots[id];state.robots[id]={...state.robots[id],...Object.fromEntries(Object.keys(base).filter(k=>k in q&&!GLOBAL_KEYS.includes(k)).map(k=>[k,q[k]])),design:id};state.ranges[id]={...state.ranges[id],rpm:q.rpm,outerRpm:q.outerRpm??4000,angle:q.angle};if(Number.isFinite(q.height))state.height=Math.max(.1524,Math.min(.4572,q.height));if(Number.isFinite(q.distance))state.distance=Math.max(.3048,Math.min(2.4384,q.distance));state.active=id;return state;}
export function saveConfiguration(state,name,id,date){reconcileSetups(state);const setup={id,name:name.trim(),params:clone(paramsFor(state)),date};state.setups.push(setup);reconcileSetups(state);return state.setups.at(-1);}

// Team-reported hardware. The four-foot test distance is the existing lab reference.
export function competitionHoodSetup(){
 const lab=newLab();
 Object.assign(lab.robots.original,{supportedPair:1,gap:20,arc:15});
 lab.ranges.original={...lab.ranges.original,rpm:4500,angle:75};
 return paramsFor(lab);
}

export function labForBall(ball='pollen'){
 const lab=newLab(ball==='nectar'?{ballD:3.6,mass:41.3,inertia:2/3}:{});
 lab.ball=ball;
 const nectar=ball==='nectar';
 lab.robots.original.dual=0;
 const starters={
  original:[nectar?6000:5400,nectar?65:70],
  differential:[4000,55],
  spring:[nectar?5000:4500,65],
  underhand:[nectar?6000:5000,65]
 };
 for(const [id,[rpm,angle]] of Object.entries(starters))Object.assign(lab.ranges[id],{rpm,angle});
 if(nectar){
  for(const robot of Object.values(lab.robots))robot.throatGap+=20.32;
 }
 return lab;
}
