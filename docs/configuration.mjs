// Physical, unloaded clear gap between working surfaces in the 2D pinch plane.
export const GAP_REVISION='throat-gap-v1';
export const WHEEL_PRESETS=Object.freeze([{name:'Gray FlatTop',shore:15,color:'#aeb7b9'},{name:'Green',shore:35,color:'#6ac879'},{name:'Orange',shore:40,color:'#e89b58'},{name:'Blue',shore:50,color:'#719edc'},{name:'Firm black',shore:60,color:'#65757a'}]);
export function configureGap(source){const p={...source};if(Number.isFinite(p.throatGap)&&p.design!=='catapult'){p.throatGap=Math.max(15,Math.min(100,p.throatGap));p.throatInterference=p.ballD*25.4-p.throatGap;p.compression=Math.max(0,p.throatInterference);}else delete p.throatInterference;return p;}
export function gapFromCompression(p){return Math.max(15,Math.min(100,p.ballD*25.4-(p.compression??3.175)));}
export function tireColor(shore){return WHEEL_PRESETS.reduce((a,b)=>Math.abs(b.shore-shore)<Math.abs(a.shore-shore)?b:a).color;}

export const WHEEL_SIZE_REVISION='editable-wheel-size-v2';
export const COMPLIANCE_REVISION='wheel-dominant-v1';
export const LARGE_GRAY_WHEEL=Object.freeze({diameter:96/25.4,shore:15,name:'goBILDA FlatTop Hogback',url:'https://www.gobilda.com/flattop-hogback-wheel-96mm-diameter-15a-durometer/'});

// Published diameter/hardness. Compliant depths are provisional effective geometry.
const andymark='https://andymark.com/products/compliant-wheels';
export const WHEEL_CHOICES=Object.freeze([
 ...[2,2.25].flatMap(diameter=>WHEEL_PRESETS.filter(q=>[35,40,50,60].includes(q.shore)).map(q=>Object.freeze({...q,id:`am-${diameter}-${q.shore}`,diameter,depth:(diameter*25.4-8)/2,source:andymark,group:'AndyMark hex compliant',label:`AndyMark ${diameter===2?'2″':'2¼″'} · ${q.name} ${q.shore}A`}))),
 Object.freeze({id:'gobilda-3635',name:LARGE_GRAY_WHEEL.name,shore:15,diameter:LARGE_GRAY_WHEEL.diameter,depth:20,group:'Rigid core with soft tread',label:'goBILDA 96 mm · Gray FlatTop 15A',source:LARGE_GRAY_WHEEL.url})
]);
export function wheelDepth(robot,outer=false){const radius=robot[outer?'outerD':'wheelD']*25.4/2,value=robot[outer?'outerWheelDepth':'wheelDepth'],shore=robot[outer?'outerDurometer':'durometer'],guess=WHEEL_CHOICES.find(q=>Math.abs(q.diameter*25.4/2-radius)<1e-5&&q.shore===shore)?.depth??Math.round(radius*7)/10;return Math.max(1,Math.min(radius-3,Number.isFinite(value)?value:guess));}
export function selectedWheelPreset(robot,outer=false){const diameter=robot[outer?'outerD':'wheelD'],shore=robot[outer?'outerDurometer':'durometer'],depth=wheelDepth(robot,outer);return WHEEL_CHOICES.find(q=>Math.abs(q.diameter-diameter)<1e-5&&q.shore===shore&&Math.abs(q.depth-depth)<1e-5)?.id??'custom';}
