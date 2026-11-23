import {clone,GLOBAL_KEYS,newLab,labForBall,normalize,parseCSV,loadSavedConfiguration,paramsFor} from './lab-state.mjs';
import {DESIGNS} from './mechanics.mjs';

const modelKeys = [...GLOBAL_KEYS, 'materials'];
export const exportSetup = setup => ({
 name:setup.name,
 ...(typeof setup.robotId==='string'?{robotId:setup.robotId}:{}),
 ...(typeof setup.enabled==='boolean'?{enabled:setup.enabled}:{}),
 params:Object.fromEntries(Object.entries(setup.params).filter(([key])=>!modelKeys.includes(key)))
});
export const bundle = (setups,models) => ({schema:'biobuzz-sharing',version:1,setups:setups.map(exportSetup),models});

function readItems(setups,models) {
 const items=[];
 for(const setup of Array.isArray(setups)?setups:[]){
  const {name,params}=setup??{};
  if(typeof name!=='string'||!name.trim()||!DESIGNS.some(d=>d.id===params?.design)||!Number.isFinite(params.rpm)||!Number.isFinite(params.angle))continue;
  const lab=labForBall(params.ball==='nectar'?'nectar':'pollen');
  loadSavedConfiguration(lab,params);
  items.push({kind:'setup',value:{name:name.trim().slice(0,60),robotId:typeof setup.robotId==='string'?setup.robotId.slice(0,100):undefined,enabled:typeof setup.enabled==='boolean'?setup.enabled:undefined,params:exportSetup({params:paramsFor(normalize(lab))}).params}});
 }
 for(const model of Array.isArray(models)?models:[]){
  if(typeof model?.name!=='string'||!model.name.trim()||!model.globals||typeof model.globals!=='object')continue;
  items.push({kind:'model',value:{name:model.name.trim().slice(0,60),scope:['field','ball'].includes(model.scope)?model.scope:undefined,ball:model.ball==='nectar'?'nectar':'pollen',globals:normalize({...labForBall(model.ball==='nectar'?'nectar':'pollen'),globals:model.globals}).globals}});
 }
 return items;
}

export function readShare(text,isCSV=false){
 const data=isCSV?parseCSV(text):JSON.parse(text);
 if(data?.schema==='biobuzz-sharing'&&data.version===1)return readItems(data.setups,data.models);
 if(data?.schema==='biobuzz-pits-range'&&data.version===2){
  const lab=normalize(data);
  return readItems(lab.setups,[{name:'Imported environment',ball:lab.ball,globals:lab.globals},...lab.models]);
 }
 if(data?.schema==='biobuzz-shooter-lab')return readItems(data.setups,[{name:'Imported environment',globals:newLab(data.current).globals}]);
 throw Error('Choose an exported Launch Lab file.');
}

export function addSharedItems(state,items,makeId){
 for(const {kind,value} of items){
  const entry={...clone(value),id:makeId(),date:new Date().toISOString(),source:'Imported'};
  (kind==='setup'?state.setups:state.models).push(entry);
 }
}
