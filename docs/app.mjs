import {BALLS,BALL_PROPERTIES,FIELD_PROPERTIES,pickProperties,captureRobot,makeRobot,migrateGarage,robotFromSetup,initializeAmmo,rangeAmmo,botDirty,savedAmmo} from './garage.mjs';
import {bundle,readShare} from './sharing.mjs';
import {MAX_COMPARISONS} from './saved-setups.mjs';
import {CONTACT_MODEL} from './impact-materials.mjs';
import {installNumberEditing} from './number-editing.mjs';
import {WHEEL_PRESETS,WHEEL_CHOICES,selectedWheelPreset,wheelDepth} from './configuration.mjs';
import {presets,simulate} from './physics.mjs';
import {withOfficialField} from './field.mjs';
import {DESIGNS,differentialTractionNote,guideSpinNote} from './mechanics.mjs';
import {newLab,labForBall,paramsFor,normalize,clone,loadSavedConfiguration} from './lab-state.mjs';
import {CinematicScene} from './cinematic-scene.mjs';
import {PitCutaway,drawMechanism} from './mechanical-views.mjs';
import {ShotClock,shotPhase,autoRate} from './cinematic.mjs';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],fmt=(n,d=1)=>Number.isFinite(n)?n.toFixed(d):'—',esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f;}catch{return f;}};
let state;try{const stored=read('biobuzz-lab-v2',null);state=stored?normalize(stored):(read('biobuzz-current-v1',null)?newLab(read('biobuzz-current-v1',{})):labForBall());if(!stored){state.setups=read('biobuzz-setups-v1',[]);state.observations=read('biobuzz-observations-v1',[]);}}catch{state=labForBall();}
const savedGarage=read('biobuzz-garage-v1',null);
const savedProfiles=savedGarage?.profiles??read('biobuzz-ball-profiles',null);
const profiles={pollen:state,nectar:labForBall('nectar')};
for(const ball of Object.keys(profiles)){
 if(!savedProfiles?.[ball])continue;
 try{profiles[ball]=normalize(savedProfiles[ball]);}catch{}
}
state=profiles[read('biobuzz-active-ball','pollen')==='nectar'?'nectar':'pollen'];
const garage = savedGarage?.robots?.length?savedGarage.robots:migrateGarage(profiles);
garage.forEach(initializeAmmo);
let activeRobot=garage.find(robot=>robot.id===(savedGarage?.activeRobotId??state.active))??garage[0];
const traceIds=savedGarage?.traceIds??Object.fromEntries(BALLS.map(ball=>[ball,profiles[ball].reference?.id?ball+'-'+profiles[ball].reference.id:'']));
if(!savedGarage){
 for(const ball of BALLS)profiles[ball].comparisonIds=profiles[ball].comparisonIds.map(id=>ball+'-'+id);
}
for(const ball of BALLS){
 profiles[ball].reference=null;
 const savedSelection=savedGarage?.profiles?.[ball]?.comparisonIds;
 profiles[ball].setups=[];
 if(Array.isArray(savedSelection))profiles[ball].comparisonIds=savedSelection;
}
Object.assign(profiles.nectar.globals,pickProperties(profiles.pollen.globals,FIELD_PROPERTIES));
profiles.nectar.globals.materials=profiles.pollen.globals.materials;
state=profiles[activeRobot.pitAmmo??rangeAmmo(activeRobot,state.ball)??state.ball];
loadSavedConfiguration(state,activeRobot.drafts[state.ball]);
let p,result,trace,scene,pitView,clock,pitTime=0,pitPlaying=true,pitHold=0,last=performance.now(),activePanel='pits',toastTimer;
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4000);}
function persist(){
 activeRobot.drafts[state.ball]=captureRobot(state);
 $('#robotDirty').hidden=!botDirty(activeRobot);
 renderGarage();
 try{
  localStorage.setItem('biobuzz-garage-v1',JSON.stringify({profiles,robots:garage,activeRobotId:activeRobot.id,traceIds}));
  localStorage.setItem('biobuzz-active-ball',state.ball);
 }catch{toast('Browser storage unavailable. Export your bots and settings to keep them.');}
}
const specs={camDrop:['Cam Drop',15,85,1,'°'],springStrength:['Spring Strength',100,1500,10,'N/m'],armLength:['Throwing Arm Length',180,450,1,'mm'],releaseAngle:['Release Angle',10,75,.5,'°'],gearRatio:['Gearing (rear to front)',1,4,.05,': 1'],rearRatio:['Legacy ratio',.5,2.5,.05,'×'],
 throatGap:['Throat gap (at rest)',15,100,.1,'mm'],stripWidth:['Tape strip width',2,20,.5,'mm'],stripSpacing:['Tape strip center spacing',5,50,.5,'mm'],railWidth:['Rail width',1,10,.5,'mm'],railSpacing:['Rail center spacing',5,50,.5,'mm'],height:['Launcher height',6,18,.1,'in'],distance:['Distance to HIVE',1,8,.1,'ft'],rpm:['Motor speed',2000,6000,50,'RPM'],outerRpm:['Outer motor RPM',2000,6000,50,'RPM'],angle:['Release angle',0,90,.5,'°'],wheelDepth:['Rim size',6,140,.1,'mm'],outerWheelDepth:['Rim size',6,140,.1,'mm'],wheelD:['Wheel diameter',1.5,5,.01,'mm'],outerD:['Outer wheel diameter',1.5,5,.01,'mm'],durometer:['Hardness',10,90,1,'Shore A'],outerDurometer:['Hardness',10,90,1,'Shore A'],muWheel:['Wheel-to-ball friction',.05,1.5,.01,'μ'],compression:['Ball compression',0,8,.025,'mm'],outerCompression:['Outer contact compression',0,8,.025,'mm'],outerGap:['Wheel spacing',0,50,.5,'mm'],gap:['Wheel spacing',0,50,.5,'mm'],driveRatio:['Motor-to-wheel speed ratio',.25,3,.05,'×'],ratio:['Outer motor-to-wheel ratio',.25,3,.05,'×'],arc:['Contact arc',5,150,1,'°'],hoodRadius:['Ball-path radius',40,160,1,'mm'],muBack:['Hood / guide friction',.02,1,.01,'μ'],offset:['Outer group longitudinal offset',-60,60,1,'mm'],overlap:['Simultaneous contact overlap',0,1,.05,'×'],rampLength:['Guide contact length',40,240,1,'mm'],rampEnd:['Guide end offset',-20,40,1,'mm'],springPreload:['Spring preload',0,80,1,'N'],springK:['Spring stiffness',500,15000,100,'N/m'],springTravel:['Carriage travel',0,25,.5,'mm'],minAngle:['Minimum launch angle',0,89,.5,'°'],maxAngle:['Maximum launch angle',1,90,.5,'°'],ballD:['Ball diameter',2,4,.01,'mm'],mass:['Ball mass',10,100,1,'g'],inertia:['Rotational inertia factor',.2,1,.001,'κ'],stiffness:['Ball effective stiffness',1000,2000000,1000,'N/m'],ballGrip:['Ball surface grip factor',.1,2,.05,'×'],restitution:['CELL supported-edge bounce',0,1,.01,'e'],wallFriction:['CELL surface friction',0,1.5,.01,'μ'],impactDamping:['Impact damping',0,1,.01,'×'],drag:['Air drag coefficient',0,2,.01,'Cd'],magnus:['Magnus coefficient',0,1,.01,'CL'],airDensity:['Air density',.1,3,.005,'kg/m³'],gravity:['Gravity',1,20,.00001,'m/s²'],spinDecay:['Spin decay',0,3,.01,'1/s'],loadFactor:['Contact load calibration',.1,3,.05,'×'],contactGain:['Contact conductance',1,100,1,'Ns/m']};
const scale=k=>k==='height'?.0254:k==='distance'?.3048:['wheelD','outerD','ballD'].includes(k)?1/25.4:1;
function limits(k,scope){const a=[...specs[k]];if(['wheelDepth','outerWheelDepth'].includes(k))a[2]=diameterMM(k)-2;if(state.active==='underhand'&&k==='arc')a[0]='Maximum guide arc';if(state.active==='underhand'&&k==='hoodRadius')a[0]='Guide bend radius';if(k==='rpm')a[2]=Math.max(a[2],state.ranges[state.active].rpm);if(k==='rearRatio'){a[1]=Math.min(a[1],state.robots.differential.rearRatio);a[2]=Math.max(a[2],state.robots.differential.rearRatio);}if(k==='throatGap')a[0]=state.active==='differential'?'Gap between wheel surfaces':state.active==='spring'?'Ramp-to-wheel gap (at rest)':'Hood-to-wheel gap';if(state.active==='differential'&&k==='wheelD')a[0]='Wheel diameter';if(state.active==='differential'&&k==='outerD')a[0]='Wheel diameter';if(state.active==='differential'&&k==='outerRpm'){a[0]='Outside wheel RPM (geared)';a[1]=500;a[2]=18000;}if(k==='camDrop')a[1]=state.robots.catapult.releaseAngle+5;if(k==='angle'){a[1]=state.robots[state.active].minAngle;a[2]=state.robots[state.active].maxAngle;}if(['wheelD','outerD','ballD'].includes(k)){a[1]*=25.4;a[2]*=25.4;a[3]=.1;}return a;}
const isRim=k=>['wheelDepth','outerWheelDepth'].includes(k);
const diameterMM=k=>state.robots[state.active][k==='outerWheelDepth'?'outerD':'wheelD']*25.4;
function value(k,scope){if(isRim(k))return diameterMM(k)-2*wheelDepth(state.robots[state.active],k==='outerWheelDepth');if(state.active==='differential'&&k==='outerRpm'){const r=state.robots.differential,q=state.ranges.differential;return q.rpm;}const obj=scope==='global'?state.globals:BALLS.includes(scope)?profiles[scope].globals:scope==='range'?state.ranges[state.active]:state.robots[state.active];return (k==='height'?state.height:k==='distance'?state.distance:obj[k])/scale(k);}
let controlSerial=0;function controls(keys,scope){return keys.map(k=>{const uid=scope+'-'+k+'-'+controlSerial++;const [label,min,max,step,unit]=limits(k,scope),v=value(k,scope);return `<div class="parameter"><div class="parameter-heading"><label for="${uid}">${label}</label><div class="value-field"><input id="${uid}" data-setting="${k}" data-scope="${scope}" aria-label="${scope==='global'?'Global ':''}${label}" type="number" min="${min}" max="${max}" step="${step}" value="${Number(v.toFixed(5))}"><span>${unit}</span></div></div><input type="range" ${['durometer','outerDurometer'].includes(k)?`list="hardness-${k}"`:""} data-setting="${k}" data-scope="${scope}" min="${min}" max="${max}" step="${step}" value="${v}" aria-label="${label} slider" style="--fill:${(v-min)/(max-min)*100}%"></div>`;}).join('');}
function disclosure(label,body,key,extraClass=''){
 return `<details class="advanced ${extraClass}" name="pit-settings" data-pit-section="${esc(key)}"><summary><span>${label}</span><span class="disclosure-hint" aria-hidden="true"></span></summary>${body}</details>`;
}
function group(label,keys,scope='robot'){return disclosure(label,controls(keys,scope),`${scope}:${state.active}:${label}`);}


function wheelSection(outer=false){const dualKey=outer?'outerDual':'dual',dual=!!state.robots[state.active][dualKey];const title=state.active==='differential'?(outer?'Rear wheel':'Front wheel'):'Wheels',diameterKey=outer?'outerD':'wheelD',hardnessKey=outer?'outerDurometer':'durometer',depthKey=outer?'outerWheelDepth':'wheelDepth',selected=selectedWheelPreset(state.robots[state.active],outer),groups=[...new Set(WHEEL_CHOICES.map(q=>q.group))];return disclosure(title,`<div role="group" aria-label="${title}"><label class="wheel-preset-label">Wheel preset<select data-wheel-preset="${outer?'rear':'front'}" aria-label="${title} preset">${groups.map(group=>`<optgroup label="${group}">${WHEEL_CHOICES.filter(q=>q.group===group).map(q=>`<option value="${q.id}" ${selected===q.id?'selected':''}>${esc(q.label)}</option>`).join('')}</optgroup>`).join('')}<option value="custom" ${selected==='custom'?'selected':''}>Custom wheel</option></select></label><label class="toggle-line"><input type="checkbox" data-dual="${dualKey}" ${dual?'checked':''}> Dual wheels</label>${dual?controls([outer?'outerGap':'gap'],'robot'):''}${controls([diameterKey,hardnessKey,depthKey],'robot')}<datalist id="hardness-${hardnessKey}">${WHEEL_PRESETS.map(q=>`<option value="${q.shore}" label="${q.name}"></option>`).join('')}</datalist><p class="control-note">Rim size is the rigid center’s outside diameter. Wheel spacing is the clear gap between paired tires.</p></div>`,`pit-panel:${state.active}:wheel:${outer}`,'wheel-section');}

function syncWheelPresets(){$$('[data-wheel-preset]').forEach(el=>el.value=selectedWheelPreset(state.robots[state.active],el.dataset.wheelPreset==='rear'));}

function renderControls(){
 const d=state.active,r=state.robots[d];
 const launchKeys=['height','rpm','angle'];
 $('#pitLaunchControls').innerHTML=controls(launchKeys,'range');
 const gearing=d==='differential';
 const presetsMarkup=gearing?`<div class="ratio-presets" aria-label="Rear to front gear presets">${[1,1.5,2,3,4].map(ratio=>`<button type="button" data-gear="${ratio}">${ratio}:1</button>`).join('')}</div>`:'';
 $('#pitQuickControls').innerHTML=controls(['throatGap',...(gearing?['gearRatio']:[])],'robot')+presetsMarkup;
 let html='';
 if(gearing)html=wheelSection(false)+wheelSection(true);
 else html+=wheelSection()+(d==='spring'?group('Spring carriage',['springPreload','springK','springTravel','rampLength','rampEnd'],'robot')+disclosure('Flywheel inertia',`<label class="toggle-line"><input id="flywheel" type="checkbox" ${r.flywheel?'checked':''}> Add two 82 mm flywheel discs</label><p class="control-note">Stores rotational energy to reduce wheel slowdown during a shot. Uses estimated inertia and motor recovery, not a measured torque curve.</p><p id="flywheelNote" class="control-note"></p>`,state.active+':flywheel'):group('Hood shape',['hoodRadius','arc'],'robot'))+disclosure('Guide surface',`<div class="surface-presets">${Object.entries(presets).map(([key,preset])=>`<button type="button" data-surface="${key}" class="${r.surface===key?'active':''}" aria-pressed="${r.surface===key}">${esc(preset.name)}</button>`).join('')}</div><p id="guideEffectNote" class="control-note"></p>`,'pit-panel:'+d+':guide-surface')+group('Contact estimates',['muWheel','muBack',...(r.surface==='tape'?['stripWidth','stripSpacing']:r.surface==='rails'?['railWidth','railSpacing']:[])],'robot');
 const expanded=$('#pitControls details[open]')?.dataset.pitSection;
 $('#pitControls').innerHTML=html;
 if(expanded){
  const replacement=$$('#pitControls details').find(section=>section.dataset.pitSection===expanded);
  (replacement??$('.pit-launch-settings')).open=true;
 }
 $('#primaryControls').innerHTML=controls(launchKeys,'range');
 $('#targetControls').innerHTML=controls(['distance'],'range');
 $('#globalControls').innerHTML=controls(FIELD_PROPERTIES.filter(key=>key!=='materials'),'global');
 for(const ball of BALLS)$('#'+ball+'Controls').innerHTML=controls(BALL_PROPERTIES,ball);
 renderMaterials();syncGear();updateContactNotes();
}
function updateContactNotes(){const L=result?.L;if(!L)return;if($('#guideEffectNote'))$('#guideEffectNote').textContent=guideSpinNote(L);if($('#flywheelNote')){const radius=p?.wheelD*.0254/2,factor=30/Math.PI/radius;$('#flywheelNote').textContent=`Drive wheels: ${fmt(p.rpm,0)} RPM set; ${fmt((L.minWheelSpeed??L.U)*factor,0)} RPM minimum during contact; ${fmt((L.exitWheelSpeed??L.U)*factor,0)} RPM at release. Estimate only.`;}}
function syncGear(){if(state.active!=='differential')return;const r=state.robots.differential;
 for(const k of ['rpm','gearRatio'])$$(`[data-setting="${k}"]`).forEach(el=>{if(el.type!=='number'||el!==document.activeElement)el.value=Number(value(k,k==='rpm'?'range':'robot').toFixed(2));});
 $$('[data-gear]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.gear)===r.gearRatio)));
}
function renderMaterials(){$('#materialControls').innerHTML=['lip','floor','back','upper','tile'].map(k=>{const m=state.globals.materials[k];return `<div class="material-row"><label><input type="checkbox" data-material="${k}" ${m?'checked':''}> ${k==='tile'?'Override EVA field tile':'Override CELL '+(k==='back'?'back wall':k==='upper'?'upper wall':k)}</label>${m?`<label>Bounce e<input type="number" data-mat="${k}" data-prop="e" value="${m.e}" min="0" max="1" step=".01"></label><label>Friction μ<input type="number" data-mat="${k}" data-prop="mu" value="${m.mu}" min="0" max="1.5" step=".01"></label>`:''}</div>`;}).join('');}
let timer;
const isLabControl=el=>!!(el?.dataset?.setting||el?.dataset?.mat);
function restoreControl(el){
 const k=el.dataset.setting,current=k?value(k,el.dataset.scope):state.globals.materials[el.dataset.mat]?.[el.dataset.prop];
 if(Number.isFinite(current))el.value=Number(current.toFixed(5));
}
function commitControl(el){
 const text=el.value.trim(),raw=Number(text);
 if(text===''||!Number.isFinite(raw)||el.validity?.badInput){restoreControl(el);return;}
 const k=el.dataset.setting;
 if(k){
  const scope=el.dataset.scope,[,lo,hi]=limits(k,scope),display=Math.max(lo,Math.min(hi,raw)),v=isRim(k)?(diameterMM(k)-display)/2:display*scale(k),before=value(k,scope);
  el.value=Number(display.toFixed(5));
  if(Math.abs(before-display)<1e-10)return;
  if(k==='height')state.height=v;
  else if(k==='distance')state.distance=v;
  else (scope==='global'?state.globals:BALLS.includes(scope)?profiles[scope].globals:scope==='range'?state.ranges[state.active]:state.robots[state.active])[k]=v;
  if(scope==='global')for(const ball of BALLS)profiles[ball].globals[k]=v;
  if(k==='releaseAngle'){state.robots.catapult.camDrop=Math.max(state.robots.catapult.camDrop,v+5);$$('[data-setting=camDrop]').forEach(input=>{input.min=v+5;input.value=state.robots.catapult.camDrop;});}
  if(k==='minAngle'||k==='maxAngle'){const r=state.robots[state.active];if(r.maxAngle<=r.minAngle)r.maxAngle=Math.min(90,r.minAngle+1);state.ranges[state.active].angle=Math.max(r.minAngle,Math.min(r.maxAngle,state.ranges[state.active].angle));}
  $$(`[data-setting="${k}"][data-scope="${scope}"]`).forEach(input=>{
   if(input!==el&&!(input.type==='number'&&input===document.activeElement))input.value=Number(display.toFixed(5));
   if(input.type==='range')input.style.setProperty('--fill',100*(display-lo)/(hi-lo)+'%');
  });
  if(['wheelD','outerD'].includes(k)){const outer=k==='outerD',r=state.robots[state.active],depthKey=outer?'outerWheelDepth':'wheelDepth';r[depthKey]=wheelDepth({...r,[depthKey]:r[depthKey]+(display-before)/2},outer);$$(`[data-setting="${depthKey}"]`).forEach(input=>{input.max=r[k]*25.4-2;input.value=value(depthKey,scope);if(input.type==='range')input.style.setProperty('--fill',100*(Number(input.value)-6)/(Number(input.max)-6)+'%');});}
  if(['rpm','gearRatio','wheelD','outerD'].includes(k))syncGear();
  if(['wheelD','outerD','durometer','outerDurometer','wheelDepth','outerWheelDepth'].includes(k))syncWheelPresets();
  persist();clearTimeout(timer);timer=setTimeout(()=>{timer=null;update();if(k==='minAngle'||k==='maxAngle')renderControls();},90);
 }else if(el.dataset.mat){
  const material=state.globals.materials[el.dataset.mat],prop=el.dataset.prop;if(!material)return;
  const v=Math.max(0,Math.min(prop==='e'?1:1.5,raw));el.value=v;
  if(material[prop]===v)return;
  material[prop]=v;persist();clearTimeout(timer);timer=setTimeout(()=>{timer=null;update();},80);
 }
}
installNumberEditing(document,{handles:isLabControl,commit:commitControl,restore:restoreControl});
document.addEventListener('change',e=>{if(e.target.dataset.wheelPreset){const q=WHEEL_CHOICES.find(q=>q.id===e.target.value);if(q){const outer=e.target.dataset.wheelPreset==='rear',r=state.robots[state.active];r[outer?'outerD':'wheelD']=q.diameter;r[outer?'outerDurometer':'durometer']=q.shore;r[outer?'outerWheelDepth':'wheelDepth']=q.depth;renderControls();update();}return;}if(e.target.dataset.dual){const r=state.robots[state.active];r[e.target.dataset.dual]=Number(e.target.checked);renderControls();update();return;}if(e.target.id==='flywheel'){state.robots[state.active].flywheel=Number(e.target.checked);update();}if(e.target.dataset.material){const k=e.target.dataset.material;if(e.target.checked)state.globals.materials[k]=k==='tile'?{e:CONTACT_MODEL.floorRestitution,mu:CONTACT_MODEL.floorFriction}:{e:state.globals.restitution,mu:state.globals.wallFriction};else delete state.globals.materials[k];renderMaterials();update();}});
document.addEventListener('click',e=>{const g=e.target.closest('[data-gear]');if(g){state.robots.differential.gearRatio=Number(g.dataset.gear);update();return;}const b=e.target.closest('[data-surface]');if(b){const r=state.robots[state.active];r.surface=b.dataset.surface;r.muBack=presets[r.surface].mu;renderControls();update();}});
function refreshRobot(){
 if(timer){clearTimeout(timer);timer=null;}
 loadSavedConfiguration(state,activeRobot.drafts[state.ball]);
 renderCard();renderControls();update();renderCompare();
}
function switchRobot(id){
 const bot=garage.find(entry=>entry.id===id);
 if(!bot||bot===activeRobot)return;
 persist();
 activeRobot=bot;
 const ammo=rangeAmmo(bot,bot.preferredAmmo??state.ball)??state.ball;
 state=profiles[activePanel==='pits'?(bot.pitAmmo??ammo):ammo];
 refreshRobot();
}
function switchAmmo(ball){
 if(ball===state.ball)return;
 persist();
 state=profiles[ball];
 refreshRobot();
}
function renderCard(){
 const design=DESIGNS.find(entry=>entry.id===state.active);
 $('#designName').textContent=design.name;
 $('#designTag').textContent=design.tag;
 $('#designDescription').textContent=design.description;
 $('.turret-card').style.setProperty('--card-accent',design.accent);
 $('#rangeDesign').textContent=activeRobot.draftName||'Untitled bot';
 $('#robotName').value=activeRobot.draftName;
 $$('#pitAmmoTabs input').forEach(input=>{input.checked=input.value===state.ball;});
 const enable=$('#ammoEnabled');
 enable.checked=activeRobot.enabled[state.ball];
 enable.setAttribute('aria-label','Enable '+ballName(state.ball));
 enable.parentElement.dataset.ball=state.ball;
 $('#ammoConfig').hidden=!activeRobot.enabled[state.ball];
 $('#ammoDesign').value=state.active;
 renderRobotOptions();
}
function renderRobotOptions(){
 const select=$('#activeRobot');
 select.innerHTML=garage.map(bot=>`<option value="${esc(bot.id)}">${esc(bot.draftName||'Untitled bot')}</option>`).join('');
 select.value=activeRobot.id;
 const currentAmmo=rangeAmmo(activeRobot,state.ball);
 const rangeUnavailable=currentAmmo===undefined;
 $('#simulator').classList.toggle('no-ammo',rangeUnavailable);
 $('#rangeAmmoNotice').hidden=!rangeUnavailable;
 $('#takeRange').disabled=rangeUnavailable;
 $('#takeRange').title=rangeUnavailable?'Enable Pollen or Nectar first':'Take to Range';
 $$('#rangeAmmo input').forEach(input=>{
  input.checked=input.value===currentAmmo;
  input.disabled=!activeRobot.enabled[input.value];
 });
 const compare=$('#traceRobot');
 compare.innerHTML='<option value="">None</option>'+garage.filter(bot=>bot.id!==activeRobot.id&&savedAmmo(bot,state.ball)).map(bot=>`<option value="${esc(bot.id)}">${esc(bot.name)}</option>`).join('');
 compare.value=[...compare.options].some(option=>option.value===traceIds[state.ball])?traceIds[state.ball]:'';
}
$('#activeRobot').onchange=e=>switchRobot(e.target.value);
$('#rangeAmmo').onchange=e=>{
 if(!activeRobot.enabled[e.target.value])return;
 activeRobot.preferredAmmo=e.target.value;
 switchAmmo(e.target.value);
};
$('#pitAmmoTabs').onchange=e=>{
 activeRobot.pitAmmo=e.target.value;
 switchAmmo(e.target.value);
};
$('#ammoEnabled').onchange=e=>{
 activeRobot.enabled[state.ball]=e.target.checked;
 renderCard();persist();
};
const designOptions=DESIGNS.map(design=>`<option value="${design.id}">${esc(design.name)}</option>`).join('');
$('#ammoDesign').innerHTML=designOptions;
$('#ammoDesign').onchange=e=>{
 const design=e.target.value;
 if(design===state.active)return;
 const template=labForBall(state.ball);
 const params=captureRobot({...template,active:design,height:state.height,distance:state.distance});
 activeRobot.drafts[state.ball]=params;
 refreshRobot();
};
$('#robotName').oninput=e=>{
 activeRobot.draftName=e.target.value;
 $('#rangeDesign').textContent=activeRobot.draftName||'Untitled bot';
 renderRobotOptions();persist();if(activePanel==='compare')renderCompare();
};
$('#traceRobot').onchange=e=>{traceIds[state.ball]=e.target.value;update();};
const phoneLayout=window.matchMedia('(max-width: 760px)');
function setMobileView(panel,view){
 panel.dataset.mobileView=view;
 panel.querySelectorAll('.mobile-view-switch button').forEach(button=>{
  button.setAttribute('aria-pressed',String(button.dataset.mobileViewButton===view));
 });
 if(phoneLayout.matches){
  window.scrollTo({top:0});
  if(panel.id==='pits'&&view==='preview')pitView?.resize();
  if(panel.id==='simulator'&&view==='shot')scene?.resize();
 }
}
const menu=$('#mobileMenu'),topbar=$('.topbar');
function showMenu(open){
 topbar.classList.toggle('menu-open',open);
 menu.setAttribute('aria-expanded',String(open));
 menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');
}
menu.onclick=()=>showMenu(menu.getAttribute('aria-expanded')!=='true');
document.addEventListener('click',event=>{
 if(topbar.classList.contains('menu-open')&&!topbar.contains(event.target))showMenu(false);
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&topbar.classList.contains('menu-open')){
  showMenu(false);
  menu.focus();
 }
});
phoneLayout.addEventListener('change',()=>showMenu(false));
$$('[data-mobile-view-button]').forEach(button=>button.onclick=()=>{
 const panel=button.closest('.panel');
 setMobileView(panel,button.dataset.mobileViewButton);
 if(button.id==='doneBotSettings')panel.querySelector('[data-mobile-view-button="preview"]').focus({preventScroll:true});
});
$('#mobilePlaybackOptions').onclick=e=>{
 const open=$('#simulator').classList.toggle('playback-options-open');
 e.currentTarget.setAttribute('aria-expanded',String(open));
};
function showPanel(id){showMenu(false);if(timer){clearTimeout(timer);timer=null;update();}activePanel=id;if(id==='simulator'||id==='compare'){switchAmmo(rangeAmmo(activeRobot,activeRobot.preferredAmmo??state.ball)??state.ball);}else if(id==='pits'&&activeRobot.pitAmmo){switchAmmo(activeRobot.pitAmmo);}$$('.panel').forEach(el=>el.classList.toggle('active',el.id===id));$$('.navtab').forEach(el=>{el.classList.toggle('active',el.dataset.panel===id||el.dataset.panel==='calibration'&&id==='model');el.setAttribute('aria-current',(el.dataset.panel===id||el.dataset.panel==='calibration'&&id==='model')?'page':'false');});if(id==='pits'){setMobileView($('#pits'),'preview');pitView?.resize();}if(id==='simulator'){setMobileView($('#simulator'),activeRobot.enabled[state.ball]?'shot':'select');scene?.resize();clock.replay();}if(id==='compare')renderCompare();window.scrollTo({top:0,behavior:'smooth'});}
$$('.navtab').forEach(button=>button.onclick=()=>{
 showPanel(button.dataset.panel);
 if(phoneLayout.matches&&button.closest('.mainnav'))menu.focus({preventScroll:true});
});$('#takeRange').onclick=()=>showPanel('simulator');$('#editRobot').onclick=()=>showPanel('pits');$('#openModel').onclick=()=>showPanel('model');$('.brand').onclick=e=>{e.preventDefault();showPanel('pits');};
function update(){p=paramsFor(state);const target=garage.find(robot=>robot.id!==activeRobot.id&&robot.id===traceIds[state.ball]&&savedAmmo(robot,state.ball));trace=target?simulate(withOfficialField({...target.saved[state.ball],...state.globals})):null;result=simulate(p);result.timeline??={samples:[],duration:0,exitTime:0,basketTime:0,events:[]};if(clock)clock.setTimeline(result.timeline);else clock=new ShotClock(result.timeline);clock.loop=$('#loop').checked;clock.override=$('#speed').value==='auto'?null:Number($('#speed').value);$('#timeline').max=result.timeline.duration;if(scene){scene.ghost=Boolean(trace);scene.build(p,result,trace);}pitView?.build(p,result);pitTime=0;pitHold=0;const {L,free,shot}=result;syncGear();updateContactNotes();$('#pitMetrics').innerHTML=`<div><span>EXIT VELOCITY</span><strong>${fmt(L.v,2)} <small>m/s</small></strong></div><div><span>${L.w<0?'FORWARD SPIN':'BACKSPIN'}</span><strong>${fmt(Math.abs(L.w)*30/Math.PI,0)} <small>RPM</small></strong></div><div><span>CONTACT TIME</span><strong>${fmt((L.contactTime??L.t)*1000,1)} <small>ms</small></strong></div><div><span>LOADED PATH</span><strong>${fmt((L.contactDistance??L.length)*1000,1)} <small>mm</small></strong></div>`;if(L.catapult)$('#pitMetrics').innerHTML=`<div><span>STORED SPRING ENERGY</span><strong>${fmt(L.storedEnergy,2)} <small>J</small></strong></div><div><span>EXIT VELOCITY</span><strong>${fmt(L.v,2)} <small>m/s</small></strong></div><div><span>ESTIMATED BALL SPIN</span><strong>${fmt(L.w*30/Math.PI,0)} <small>RPM</small></strong></div><div><span>RELEASE ANGLE</span><strong>${fmt(p.angle,1)} <small>°</small></strong></div>`;
 $('#exitSpeed').innerHTML=fmt(L.v/.3048,1)+'<em>ft/s</em>';$('#exitMetric').textContent=L.catapult?fmt(L.v,2)+' m/s · '+fmt(L.storedEnergy,2)+' J stored spring energy':fmt(L.v,2)+' m/s · wheel surface '+fmt(L.U,1)+' m/s';$('#spinLabel').textContent=L.w<0?'FORWARD SPIN':'BACKSPIN';$('#spinRpm').innerHTML=fmt(Math.abs(L.w)*30/Math.PI,0)+'<em>RPM</em>';$('#spinRatio').textContent='Signed spin ratio ωr/v = '+fmt(L.w*L.geo.r/Math.max(.01,L.v),2);$('#apex').innerHTML=fmt(free.max,2)+'<em>m</em>';$('#clearance').innerHTML=shot.minClear==null?'—':fmt(shot.minClear*1000,0)+'<em>mm</em>';$('#clearanceNote').textContent=shot.minClear==null?'No entrance crossing':'Full-sphere entrance clearance';$('#shotStatus').textContent=shot.status==='Settled in CELL'?'Predicted retained score':shot.status==='Escaped CELL'?'Bounce-out / spin-out':shot.status;$('#statusDescription').textContent=!L.valid?(L.reason||'Invalid contact geometry'):shot.leftField?(shot.exited?'The ball escaped the CELL':'The ball missed the CELL')+(shot.firstFloorTime!==null?', bounced on the tile, and cleared the projected perimeter.':' and cleared the projected perimeter before touching the tile.'):shot.exited?'The ball entered, then escaped the CELL. Follow the spin marker through its next impact.':shot.ended==='settled in CELL'?'The modeled ball comes to rest inside the CELL. A predicted retained score is still an uncalibrated estimate.':'Entry alone does not establish a retained score. Inspect the trajectory and complete collision sequence.';$('#spinExplanation').textContent=state.active==='differential'?'The rear pair is powered and the front wheel is geared down. A faster rear surface produces forward torque; the shared contact time and grip determine the spin that develops. '+differentialTractionNote(L)+'':state.active==='catapult'?'The spring pushes the arm up. Cam rotation presses it down until the follower reaches the cliff. Spring force, arm inertia, gravity and cup friction determine the release speed and spin.':state.active==='underhand'?'The wheel above and inside the bend drives the ball upward and forward along the lower guide. Its contact torque generates forward spin; guide friction can add or brake that spin.':state.active==='spring'?'The powered wheels above the ball drive it against the stationary guide. Their torque opposes that of our original inner-wheel design. Guide friction, spring travel, and wheel slip determine the resulting spin.':'Powered-wheel traction and hood friction each change translation and rotation. Backer friction can change sign as relative slip changes; lower friction is not a fixed spin multiplier.';if(state.active!=='differential')$('#spinExplanation').textContent+=' '+guideSpinNote(L)+' A frictionless guide does not cancel the powered wheel’s torque.';$('#sceneScale').textContent=`Distance ${fmt(p.distance/.3048,1)} ft · exit ${fmt(p.height/.0254,1)} in · fixed FIRST HIVE`;$('#modelStatus').textContent=state.history.some(x=>x.type==='fit')?'Exploratory fit · unvalidated':'Uncalibrated model';if(!L.valid){$('#exitSpeed').textContent='—';$('#spinRpm').textContent='—';$('#pitMetrics').innerHTML='<p>'+esc(L.reason||'Invalid contact geometry')+'</p>'; }persist();if(activePanel==='compare')renderCompare();}
$('#autoCamera').onchange=e=>scene.autoCamera=e.target.checked;for(const [id,mult]of [['zoomIn',1.25],['zoomOut',.8]])$('#'+id).onclick=()=>{scene.autoCamera=false;$('#autoCamera').checked=false;if(scene.camera)scene.camera.scale=Math.max(50,Math.min(6500,scene.camera.scale*mult));};$('#fitShot').onclick=()=>{scene.autoCamera=false;$('#autoCamera').checked=false;scene.fit();};$('#loop').onchange=e=>clock.loop=e.target.checked;$('#speed').onchange=e=>clock.override=e.target.value==='auto'?null:Number(e.target.value);$('#play').onclick=()=>clock.time>=clock.timeline.duration?clock.replay():clock.toggle();$('#replay').onclick=()=>clock.replay();$('#stepBack').onclick=()=>clock.step(-1);$('#stepForward').onclick=()=>clock.step(1);$('#timeline').oninput=e=>clock.seek(Number(e.target.value));$('#pitPlay').onclick=()=>{pitPlaying=!pitPlaying;$('#pitPlay').textContent=pitPlaying?'Pause':'Resume';};$('#pitReplay').onclick=()=>{pitTime=0;pitHold=0;pitPlaying=true;$('#pitPlay').textContent='Pause';};
document.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName))return;if(activePanel==='simulator'&&activeRobot.enabled[state.ball]){if(e.code==='Space'){e.preventDefault();clock.toggle();}if(e.key===',')clock.step(-1);if(e.key==='.')clock.step(1);}});
function tick(now){const dt=Math.min(.15,(now-last)/1000);last=now;if(result&&!document.hidden){if(activePanel==='pits'&&(!phoneLayout.matches||$('#pits').dataset.mobileView==='preview')){if(pitPlaying){const end=result.timeline.exitTime+(result.L.resetTime??.035);let left=dt,rate=.05;while(left>0&&pitTime<end){rate=pitTime<=result.timeline.exitTime?autoRate(pitTime,result.timeline):.5;const h=Math.min(left,.005);pitTime=Math.min(end,pitTime+h*rate);left-=h;}$('#pitSpeed').textContent=rate.toFixed(2)+'×';if(pitTime>=end){pitHold+=dt;if(pitHold>.65){pitTime=0;pitHold=0;}}}pitView?.animateAt(pitTime);pitView?.render();}if(activePanel==='simulator'&&activeRobot.enabled[state.ball]&&(!phoneLayout.matches||$('#simulator').dataset.mobileView==='shot')){clock.advance(dt);scene?.animateAt(clock.time);scene?.render();const phase=shotPhase(clock.time,clock.timeline);$('#play').textContent=clock.playing?'Pause':'Resume';$('#play').setAttribute('aria-pressed',String(!clock.playing));$('#timeline').value=clock.time;$('#timecode').textContent=clock.time.toFixed(2)+' s';$('#speedReadout').textContent=(clock.override??autoRate(clock.time,clock.timeline)).toFixed(2)+'×';$('#viewTitle').textContent=phase==='contact'?'TURRET CONTACT':phase==='flight'?'FOLLOW THE FLIGHT':result.shot.exited&&clock.time>clock.timeline.escapeTime?'FOLLOWING THE ESCAPE':'CELL INTERACTION';$$('[data-stage]').forEach(el=>el.classList.toggle('active',el.dataset.stage===phase));const b=scene?.ball;if(b){$('#liveVelocity').textContent=fmt(Math.hypot(b.vx,b.vy),2)+' m/s';$('#liveSpin').textContent=(b.w<0?'↻ Forward ':b.w>0?'↺ Backspin ':'')+fmt(Math.abs(b.w)*30/Math.PI,0)+' RPM';}const event=clock.timeline.events.findLast(e=>e.t<=clock.time);$('#interactionNote').textContent=phase==='contact'?(b?.feeding?'Vertical center feed':state.active==='catapult'?['','Cam presses arm down','Follower at cam cliff','Spring pushes arm up','Release / reset'][Math.round(b?.catStage??4)]:'Computed wheel contact and ball spin'):event&&clock.time-event.t<.3?event.name+' impulse · '+fmt(event.jn,3)+' N·s':phase==='flight'?'Gravity + drag + Magnus':'HIVE contact · uncalibrated material estimates';Object.assign($('#viewport').dataset,{phase,time:clock.time.toFixed(6),duration:clock.timeline.duration.toFixed(6),playing:String(clock.playing),hiveRestitution:p.restitution,design:p.design});}}requestAnimationFrame(tick);}
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
let transferMode,transferItems=[];
const ballName=ball=>ball==='nectar'?'Nectar':'Pollen';
function showTransfer(mode,items){
 transferMode=mode;
 transferItems=items;
 if(!items.length){toast('No bots or settings in this file.');return;}
 const verb=mode==='import'?'Import':'Export';
 $('#transferTitle').textContent=verb+' bots and settings';
 $('#applyTransfer').textContent=verb+' selected';
 $('#transferItems').innerHTML=items.map((item,index)=>`<label class="toggle-line"><input type="checkbox" value="${index}" ${item.checked===false?'':'checked'}> <span>${esc(item.label)}</span></label>`).join('');
 $('#applyTransfer').disabled=false;
 $('#transferError').textContent='';
 $('#transferDialog').showModal();
}
function exportChecklist(){
 const robots=garage.filter(robot=>BALLS.some(ball=>robot.saved[ball])).map(robot=>({
  label:'Bot · '+robot.name,
  setups:BALLS.filter(ball=>robot.saved[ball]).map(ball=>({name:robot.name,robotId:robot.id,enabled:robot.savedEnabled[ball],params:{...robot.saved[ball],ball}}))
 }));
 const models=[
  {name:'Shared physics',scope:'field',globals:pickProperties(state.globals,FIELD_PROPERTIES)},
  ...BALLS.map(ball=>({name:ballName(ball)+' settings',scope:'ball',ball,globals:pickProperties(profiles[ball].globals,BALL_PROPERTIES)})),
  ...BALLS.flatMap(ball=>profiles[ball].models.map(model=>({...model,ball})))
 ];
 showTransfer('export',[...robots,...models.map(model=>({label:model.name,models:[model],checked:!!model.scope}))]);
}
$('#pitImport').onclick=()=>$('#importFile').click();
$('#exportBot').onclick=()=>{
 const bot=activeRobot;
 const setups=BALLS.filter(ball=>bot.saved[ball]).map(ball=>({name:bot.name,robotId:bot.id,enabled:bot.savedEnabled[ball],params:{...bot.saved[ball],ball}}));
 if(!setups.length){toast('Save this bot before exporting.');return;}
 download('biobuzz-bot.json',JSON.stringify(bundle(setups,[]),null,2),'application/json');
};
$('#importTop').onclick=()=>$('#importFile').click();
$('#exportTop').onclick=exportChecklist;
$('#importFile').onchange=async e=>{
 const file=e.target.files[0];
 e.target.value='';
 if(!file)return;
 try{
  if(file.size>3e6)throw Error('File too large');
  const groups=new Map();
  const models=[];
  const selectedSections=new Set();
  for(const {kind,value} of readShare(await file.text(),file.name.toLowerCase().endsWith('.csv'))){
   if(kind==='setup'){
    const key=value.robotId??Symbol();
    if(!groups.has(key))groups.set(key,{label:'Bot · '+value.name,setups:[]});
    groups.get(key).setups.push(value);
   }else{
    const sections=value.scope==='field'?['field']:value.scope==='ball'?['ball']:['field','ball'];
    for(const scope of sections){
     const label=scope==='field'?'Shared physics':ballName(value.ball)+' settings';
     const key=scope==='field'?'field':value.ball;
     models.push({label:label+' · '+value.name,models:[{...value,scope}],checked:!selectedSections.has(key)});
     selectedSections.add(key);
    }
   }
  }
  showTransfer('import',[...groups.values(),...models]);
 }catch(error){toast('Import failed: '+error.message);}
};
$('#transferItems').onchange=()=>{
 $('#applyTransfer').disabled=!$('#transferItems input:checked');
 $('#transferError').textContent='';
};
$('#cancelTransfer').onclick=()=>$('#transferDialog').close();
$('#transferForm').onsubmit=e=>{
 e.preventDefault();
 const selected=$$('#transferItems input:checked').map(input=>transferItems[Number(input.value)]);
 if(!selected.length)return;
 const models=selected.flatMap(item=>item.models??[]);
 if(transferMode==='export'){
  download('biobuzz-library.json',JSON.stringify(bundle(selected.flatMap(item=>item.setups??[]),models),null,2),'application/json');
 }else{
  const sections=models.map(model=>model.scope==='field'?'field':model.ball);
  if(new Set(sections).size!==sections.length){$('#transferError').textContent='Choose one import for each settings section.';return;}
  for(const item of selected.filter(entry=>entry.setups)){
   const first=item.setups[0];
   const robot=robotFromSetup(first,first.params.ball,crypto.randomUUID());
   const flags={pollen:false,nectar:false};
   for(const setup of item.setups){
    flags[setup.params.ball]=setup.enabled??true;
    robot.drafts[setup.params.ball]=clone(setup.params);
    robot.saved[setup.params.ball]=clone(setup.params);
   }
   robot.enabled={...flags};
   robot.savedEnabled={...flags};
   garage.push(robot);
  }
  for(const model of models){
   if(model.scope==='field')applySharedPhysics(model.globals);
   else Object.assign(profiles[model.ball].globals,pickProperties(model.globals,BALL_PROPERTIES));
  }
  renderRobotOptions();renderControls();update();renderCompare();
  toast('Selected items imported.');
 }
 $('#transferDialog').close();
};
function summary(q){const r=simulate(withOfficialField({...q,...state.globals}));return [DESIGNS.find(x=>x.id===q.design)?.name??'Curved Hood',q.design==='catapult'?'—':fmt(q.rpm,0),fmt(q.angle,1)+'°',fmt(q.distance/.3048,1)+' ft',fmt(q.height/.0254,1)+' in',q.design==='catapult'?'—':fmt(q.wheelD*25.4,1)+' mm',fmt(r.L.v,2)+' m/s',fmt(r.L.w*30/Math.PI,0)+' RPM',fmt(r.free.max,2)+' m',fmt(q.throatGap??(q.ballD*25.4-q.compression),1)+' mm',r.shot.minClear==null?'—':fmt(r.shot.minClear*1000,0)+' mm',r.shot.status];}
function botListLabel(bot){
 const dirty=botDirty(bot);
 return `<span>${esc(bot.draftName||'Untitled bot')}${dirty?' <span class="bot-dirty" aria-label="Unsaved changes">*</span>':''}</span>`;
}
function renderGarage(){
 const list=$('#garageList');
 const scrollTop=list.scrollTop;
 const focused=list.contains(document.activeElement)?document.activeElement.dataset.pickBot:null;
 list.innerHTML=garage.map(bot=>`<button type="button" class="bot-list-row" data-pick-bot="${esc(bot.id)}" aria-pressed="${bot===activeRobot}" title="${esc(bot.draftName||'Untitled bot')}">${botListLabel(bot)}</button>`).join('');
 if(focused)[...list.querySelectorAll('[data-pick-bot]')].find(button=>button.dataset.pickBot===focused)?.focus({preventScroll:true});
 list.scrollTop=scrollTop;
 $('#saveConfig').disabled=!botDirty(activeRobot);
 $('#exportBot').disabled=!BALLS.some(ball=>activeRobot.saved[ball]);
}
$('#addBot').onclick=()=>$('#garageDialog').showModal();
$('#closeGarage').onclick=()=>$('#garageDialog').close();
$('#newRobotDesign').innerHTML=designOptions;
$('#newRobotForm').onsubmit=e=>{
 e.preventDefault();
 const name=$('#newRobotName').value.trim();
 if(!name)return;
 const labs=Object.fromEntries(BALLS.map(ball=>[ball,labForBall(ball)]));
 const bot=makeRobot(crypto.randomUUID(),name,$('#newRobotDesign').value,labs);
 initializeAmmo(bot);
 garage.push(bot);
 switchRobot(bot.id);
 e.target.reset();
 $('#garageDialog').close();
 if(phoneLayout.matches)setMobileView($('#pits'),'edit');
};
$('#garageList').onclick=e=>{
 const id=e.target.closest('[data-pick-bot]')?.dataset.pickBot;
 if(id){switchRobot(id);if(phoneLayout.matches)setMobileView($('#pits'),'preview');}
};
$('#deleteBot').onclick=()=>{
 const bot=activeRobot;
 if(!window.confirm('Delete '+(bot.draftName||'this bot')+' from the garage?'))return;
 garage.splice(garage.indexOf(bot),1);
 for(const ball of BALLS){
  profiles[ball].comparisonIds=profiles[ball].comparisonIds.filter(id=>id!==bot.id);
  if(traceIds[ball]===bot.id)traceIds[ball]='';
 }
 if(!garage.length){
  const labs=Object.fromEntries(BALLS.map(ball=>[ball,labForBall(ball)]));
  const blank=makeRobot(crypto.randomUUID(),'Untitled bot','original',labs);
  initializeAmmo(blank);
  garage.push(blank);
 }
 activeRobot=garage[0];
 state=profiles[activeRobot.pitAmmo??rangeAmmo(activeRobot,state.ball)??state.ball];
 refreshRobot();
};
$('#saveConfig').onclick=()=>{
 const name=activeRobot.draftName.trim();
 if(!name){$('#robotName').focus();toast('Enter a robot name.');return;}
 activeRobot.name=activeRobot.draftName=name;
 activeRobot.drafts[state.ball]=captureRobot(state);
 activeRobot.saved=clone(activeRobot.drafts);
 activeRobot.savedEnabled={...activeRobot.enabled};
 persist();renderCard();renderCompare();
 toast(name+' saved.');
};
function renderCompare(){
 const options=garage.filter(bot=>savedAmmo(bot,state.ball));
 const selected=options.filter(robot=>state.comparisonIds.includes(robot.id));
 const current=activeRobot.enabled[state.ball]?[{name:(activeRobot.draftName||'Untitled bot')+' · Current',params:p}]:[];
 const cols=[...current,...selected.map(robot=>({name:robot.name,params:robot.saved[state.ball]}))];
 const labels=['Turret','Drive wheel RPM','Launch angle','Distance to HIVE','Exit height','Wheel diameter','Exit velocity','Signed spin','Apex','Throat gap (rest)','Opening clearance','Predicted result'];
 const values=cols.map(col=>summary(col.params));
 $('#comparisonTable').innerHTML='<thead><tr><th>Result</th>'+cols.map(col=>'<th>'+esc(col.name)+'</th>').join('')+'</tr></thead><tbody>'+labels.map((label,index)=>'<tr><td>'+esc(label)+'</td>'+values.map(row=>'<td>'+esc(row[index])+'</td>').join('')+'</tr>').join('')+'</tbody>';
 $('#compareCount').textContent=cols.length;
 $('#comparisonSelectionNote').textContent=`${selected.length} of ${MAX_COMPARISONS} saved bots selected for ${ballName(state.ball)}.${current.length?'':' The current bot has no enabled ammo.'}`;
 $('#savedSetups').innerHTML=garage.map(bot=>{
  const compatible=Boolean(savedAmmo(bot,state.ball));
  const checked=compatible&&state.comparisonIds.includes(bot.id);
  const disabled=!compatible||(!checked&&selected.length>=MAX_COMPARISONS);
  return `<label class="bot-list-row ${bot===activeRobot?'current':''}"><input type="checkbox" data-compare-robot="${esc(bot.id)}" ${checked?'checked':''} ${disabled?'disabled':''}>${botListLabel(bot)}${compatible?'':`<small>No saved ${ballName(state.ball)} setup</small>`}</label>`;
 }).join('');
}
$('#savedSetups').onchange=e=>{
 const id=e.target.dataset.compareRobot;
 if(!id)return;
 state.comparisonIds=e.target.checked?[...state.comparisonIds,id]:state.comparisonIds.filter(entry=>entry!==id);
 persist();renderCompare();
};
function applySharedPhysics(globals){
 const shared=pickProperties(globals,FIELD_PROPERTIES);
 for(const ball of BALLS)Object.assign(profiles[ball].globals,shared);
}
$('#restorePhysics').onclick=()=>{
 applySharedPhysics(labForBall('pollen').globals);
 renderControls();update();
 toast('Shared physics defaults restored.');
};
try{scene=new CinematicScene($('#viewport'));scene.mechanicalRenderer=drawMechanism;scene.ghost=false;pitView=new PitCutaway($('#pitCutaway'));}catch(err){console.error('Mechanical views:',err);toast('The animation view is unavailable.');}
renderCard();renderControls();update();renderCompare();requestAnimationFrame(tick);
