import {mechanicalLaunch,feedPoint} from './mechanics.mjs';
import {POLLEN,HIVE_CONTACT,CONTACT_MODEL,impactMaterial} from './impact-materials.mjs';
export {HIVE_CONTACT,CONTACT_MODEL} from './impact-materials.mjs';
import {FIELD,withOfficialField} from './field.mjs';
// SI throughout. A transparent, deliberately uncalibrated educational model.
export const IN=.0254, G=9.80665;
export const defaults={rpm:4000,wheelD:2.5,gap:15,compression:3.175,angle:48,arc:25,muBack:.22,muWheel:.8,ballD:2.8,mass:POLLEN.mass,stiffness:12000,loadFactor:1,contactGain:20,inertia:POLLEN.inertia,feed:.3,stripWidth:9.5,stripSpacing:25,railWidth:3,railSpacing:28,surface:'print',distance:1.2192,height:.45,targetHeight:(FIELD.cadLowerLip+FIELD.cadRoofApex)/2,targetTilt:FIELD.cellTilt,targetWidth:FIELD.openingWidth/IN,targetTall:(FIELD.cadRoofApex-FIELD.cadLowerLip)/Math.cos(FIELD.cellTilt*Math.PI/180)/IN,targetDepth:FIELD.cadDepth/IN,lateral:0,drag:.47,magnus:.12,spinDecay:.03,restitution:HIVE_CONTACT.restitution,wallFriction:.2};
// Contact coefficients are explicit, unmeasured estimates, not fits to competition failure rates.
export const presets={print:{name:'Smooth FDM ramp',mu:.22},tape:{name:'Low-friction tape',mu:.09},rails:{name:'Polished twin rails',mu:.06}};
export function geometry(p){const r=p.ballD*IN/2,rw=p.wheelD*IN/2,z=(p.gap+16)/2000;const lever=Math.sqrt(Math.max(0,r*r-z*z));const supportZ=p.surface==='tape'?p.stripSpacing/2000:p.surface==='rails'?p.railSpacing/2000:0;const supportWidth=p.surface==='tape'?p.stripWidth/1000:p.surface==='rails'?p.railWidth/1000:0;let backLever=r;if(supportWidth){let total=0;for(let j=0;j<9;j++){const zz=supportZ-supportWidth/2+supportWidth*j/8;total+=Math.sqrt(Math.max(0,r*r-zz*zz));}backLever=total/9;}return {r,rw,lever,backLever,pathRadius:rw+lever-p.compression/1000,length:(rw+lever-p.compression/1000)*p.arc*Math.PI/180,valid:z<r&&rw+lever>p.compression/1000};}
export function launch(p){if(p.design)return mechanicalLaunch(p);const geo=geometry(p),{r,rw,lever,backLever,length}=geo;const U=p.rpm*2*Math.PI/60*rw,m=p.mass/1000,I=p.inertia*m*r*r;let v=p.feed,w=0,s=0,t=0,theta=0;const samples=[{t,s,v,w,theta,fw:0,fb:0,N:0}];const dt=.00001;let work=0;
 if(!geo.valid)return {v:0,w:0,U,t:0,length,samples,valid:false,work:0,geo};
 for(let i=0;i<1000000&&s<length;i++) {const phase=length?Math.max(0,Math.min(1,s/length)):1;const N=p.stiffness*p.compression/1000*p.loadFactor*(.3+.7*Math.sin(Math.PI*phase));
 const fw=Math.max(-p.muWheel*N,Math.min(p.muWheel*N,p.contactGain*(U-v-w*lever)));const fb=Math.max(-p.muBack*N,Math.min(p.muBack*N,-p.contactGain*(v-w*backLever)));
 v=Math.max(.001,v+(fw+fb)/m*dt);w+=(lever*fw-backLever*fb)/I*dt;s+=v*dt;t+=dt;theta+=w*dt;work+=fw*U*dt;if(i%20===0)samples.push({t,s:Math.min(s,length),v,w,theta,fw,fb,N});}
 samples.push({t,s:length,v,w,theta,fw:0,fb:0,N:0});return {v,w,theta,U,t,length,samples,work,valid:true,geo,energy:.5*m*v*v+.5*I*w*w};}
export function cellGeometry(p){
 const b=p.targetTilt*Math.PI/180,a={x:Math.cos(b),y:-Math.sin(b)},e={x:Math.sin(b),y:Math.cos(b)},H=p.targetTall*IN,W=p.targetWidth*IN,D=p.targetDepth*IN;
 const world=(q,u)=>({x:p.distance+q*a.x+u*e.x,y:p.targetHeight+q*a.y+u*e.y});
 return {a,e,H,W,D,world,segments:[{a:world(0,-H/2),b:world(D,-H/2),name:'floor'},{a:world(D,-H/2),b:world(D,H/2),name:'back wall'},{a:world(D,H/2),b:world(0,H/2),name:'upper wall'}]};
}
// Impulse at a stationary surface. Tangential impulse exchanges translation and spin.
export function surfaceImpulse(vx,vy,w,nx,ny,r,m,I,mu,restitution,tangentialRestitution=0,reboundThreshold=.25){
 const vn=vx*nx+vy*ny,jn=Math.max(0,-(1+(vn<-reboundThreshold?restitution:0))*m*vn),tx=-ny,ty=nx,slip=vx*tx+vy*ty-w*r;
 const jt=Math.max(-mu*jn,Math.min(mu*jn,-(1+tangentialRestitution)*slip/(1/m+r*r/I)));
 return {vx:vx+(jn*nx+jt*tx)/m,vy:vy+(jn*ny+jt*ty)/m,w:w-r*jt/I,jn,jt,slip};
}
// Rolling resistance acts only during sustained near-no-slip support, never as an impact spin reset.
export function resistRolling(vx,vy,w,nx,ny,r,m,I,normalImpulse,dt,coefficient=CONTACT_MODEL.rollingResistance){
 const tx=-ny,ty=nx,vt=vx*tx+vy*ty,slip=vt-w*r,vn=vx*nx+vy*ny;
 if(Math.abs(slip)>.02||Math.abs(vn)>.03||normalImpulse<=0)return {vx,vy,w};
 const dw=-Math.sign(w)*Math.min(Math.abs(w),coefficient*normalImpulse*r/(I+m*r*r));
 return {vx:vx+tx*r*dw,vy:vy+ty*r*dw,w:w+dw};
}
export function fieldCrossSection(p){
 // Centerline section through the upward CELL; this is not a configurable robot heading.
 const center=p.distance+.39027755,span=144*IN,wallHeight=(12.3-.59)*IN;
 return {left:center-span/2,right:center+span/2,wallHeight,heading:'straight centerline projection',segments:[{a:{x:center-span/2,y:0},b:{x:center-span/2,y:wallHeight},name:'near perimeter'},{a:{x:center+span/2,y:0},b:{x:center+span/2,y:wallHeight},name:'far perimeter'}]};
}
export function flight(p,L,collisions=false){
 const {r}=L.geo,m=p.mass/1000,A=Math.PI*r*r,I=p.inertia*m*r*r,cell=cellGeometry(p),{a,e,H,W,D}=cell;
 let x=0,y=p.height,vx=L.v*Math.cos(p.angle*Math.PI/180),vy=L.v*Math.sin(p.angle*Math.PI/180),w=L.w,t=0,theta=0,max=y;
 let entered=false,exited=false,rim=false,entry=null,minClear=Infinity,traversed=false,stillTime=0,escapeTime=null,ended='time limit',firstContact=null,firstFloorTime=null,boundaryTime=null,leftField=false;
 let prevQ=-p.distance*a.x+(p.height-p.targetHeight)*a.y,prevU=-p.distance*e.x+(p.height-p.targetHeight)*e.y;
 const events=[],pts=[],dt=.0005,field=fieldCrossSection(p);
 const segments=[...(Math.abs(p.lateral)<=W/2+r?cell.segments:[]),...field.segments];let groundRun=0,lastFloorX=null,supportImpulse=0,supportNx=0,supportNy=0,wasWithinField=field.left<=0&&field.right>=0;
 const snap=(contact=0,nx=0,ny=0,slip=0)=>({t,x,y,vx,vy,w,theta,contact,nx,ny,slip});pts.push(snap());
 const contactSurface=(nx,ny,penetration,name,along)=>{
  x+=nx*penetration;y+=ny*penetration;
  const isFloor=name==='field floor',isPerimeter=name.includes('perimeter');const material=impactMaterial(p,name,along);
  const before={vx,vy,w},imp=surfaceImpulse(vx,vy,w,nx,ny,r,m,I,material.mu,material.e,material.shear,material.threshold);
  vx=imp.vx;vy=imp.vy;w=imp.w;
  // Aggregate sustained support and apply a coupled rolling torque once per integration step.
  if(imp.jn>0){supportImpulse+=imp.jn;supportNx+=nx*imp.jn;supportNy+=ny*imp.jn;}
  if(isFloor&&firstFloorTime===null)firstFloorTime=t;
  if(isPerimeter&&boundaryTime===null)boundaryTime=t;
  if(imp.jn>m*.16){events.push({t,x,y,name,restitution:material.e,friction:material.mu,jn:imp.jn,jt:imp.jt,before,after:{vx,vy,w}});if(firstContact===null&&!isFloor&&!isPerimeter)firstContact=t;}
  return {imp,nx,ny};
 };
 for(let i=0;i<(collisions?40000:24000);i++){
  supportImpulse=0;supportNx=0;supportNy=0;
  if(!collisions&&y<r){ended='floor';break;}
  const speed=Math.hypot(vx,vy),drag=.5*(p.airDensity??1.225)*A*p.drag*speed/m,cl=p.magnus*Math.tanh(w*r/Math.max(.1,speed)),lift=.5*(p.airDensity??1.225)*A*cl*speed/m;
  const oldVx=vx,oldVy=vy;vx+=(-drag*oldVx-lift*oldVy)*dt;vy+=(-(p.gravity??G)-drag*oldVy+lift*oldVx)*dt;
  x+=vx*dt;y+=vy*dt;t+=dt;theta+=w*dt;w*=Math.exp(-p.spinDecay*dt);max=Math.max(max,y);
  let dx=x-p.distance,dy=y-p.targetHeight,q=dx*a.x+dy*a.y,u=dx*e.x+dy*e.y;
  if(!traversed&&Math.abs(q)<r){const section=Math.sqrt(Math.max(0,r*r-q*q)),clear=Math.min(H/2-Math.abs(u)-section,W/2-Math.abs(p.lateral)-section);minClear=Math.min(minClear,clear);if(clear<0)rim=true;}
  if(prevQ<0&&q>=0&&!entry){const f=-prevQ/(q-prevQ);entry={x:x-vx*dt*(1-f),y:y-vy*dt*(1-f),t:t-dt*(1-f),u:prevU+(u-prevU)*f,vx,vy,w};entered=Math.abs(entry.u)+r<=H/2&&Math.abs(p.lateral)+r<=W/2;}
  if(q>r&&entry)traversed=true;
  let touching=0,nxSum=0,nySum=0,slip=0;
  if(collisions){
   // Circle against three finite wall segments, including rounded lip endpoints.
   // Multiple passes resolve the floor/back corner without hiding an energy reset.
   for(let pass=0;pass<3;pass++)for(const seg of segments){
    const sx=seg.b.x-seg.a.x,sy=seg.b.y-seg.a.y,len2=sx*sx+sy*sy,f=Math.max(0,Math.min(1,((x-seg.a.x)*sx+(y-seg.a.y)*sy)/len2));
    const cx=seg.a.x+f*sx,cy=seg.a.y+f*sy,dist=Math.hypot(x-cx,y-cy),limit=r+(seg.name.includes('perimeter')?.0025:HIVE_CONTACT.skinThickness/2);
    if(dist<limit){let nx=(x-cx)/(dist||1),ny=(y-cy)/(dist||1);if(dist<1e-9){nx=-sy/Math.sqrt(len2);ny=sx/Math.sqrt(len2);}
     const isLip=f<.001||f>.999;const info=contactSurface(nx,ny,limit-dist,isLip&&q<r&&!seg.name.includes('perimeter')?'lip':seg.name,f);touching=1;nxSum+=nx;nySum+=ny;slip=info.imp.slip;
    }
   }
   if(y<r){const info=contactSurface(0,1,r-y,'field floor');touching=1;nxSum=0;nySum=1;slip=info.imp.slip;}
   if(supportImpulse>0){const len=Math.hypot(supportNx,supportNy);if(len>0){const roll=resistRolling(vx,vy,w,supportNx/len,supportNy/len,r,m,I,supportImpulse,dt);vx=roll.vx;vy=roll.vy;w=roll.w;}}
   if(firstFloorTime!==null&&y<=r+.003){if(lastFloorX!==null)groundRun+=Math.abs(x-lastFloorX);lastFloorX=x;}else lastFloorX=null;
   dx=x-p.distance;dy=y-p.targetHeight;q=dx*a.x+dy*a.y;u=dx*e.x+dy*e.y;
   if(entered&&q<-r&&escapeTime===null){exited=true;escapeTime=t;}
   const atRest=touching&&Math.hypot(vx,vy)<.025&&Math.abs(w*r)<.025;stillTime=atRest?stillTime+dt:0;
   if(stillTime>.35){ended=q>0&&q<D+r&&Math.abs(u)<H/2?'settled in CELL':'settled on field';pts.push(snap(touching,nxSum,nySum,slip));break;}
   // Follow escape through landing, slip, rolling and perimeter contacts. Stop only at rest,
   // after a complete ball leaves the projected perimeter, or at the declared time limit.
   if(x>=field.left&&x<=field.right)wasWithinField=true;
   if(wasWithinField&&(x<field.left-r||x>field.right+r)){leftField=true;boundaryTime??=t;ended='left projected field';pts.push(snap(touching,nxSum,nySum,slip));break;}

  }
  if(i%2===0)pts.push(snap(touching,nxSum,nySum,slip));prevQ=q;prevU=u;
 }
 if(pts.at(-1).t<t)pts.push(snap());
 const status=exited?'Escaped CELL':entered&&!rim?(ended==='settled in CELL'?'Settled in CELL':'Opening entry'):rim?'Rim / opening miss':entry?'Rim / opening miss':'Falls short';
 return {pts,max,range:x,duration:t,entry,minClear:Number.isFinite(minClear)?minClear:null,rim,entered,exited,bounces:events.length,events,firstContact,firstFloorTime,escapeTime,boundaryTime,leftField,groundRun,field,ended,status};
}
export function continuousTimeline(p,L,shot){
 if(!L.valid)return {samples:[],duration:0,exitTime:0,basketTime:0,ending:'invalid geometry',events:[]};
 const angle=p.angle*Math.PI/180,arc=p.arc*Math.PI/180,R=L.geo.pathRadius;
 let feedSeconds=0;const samples=[];
 if(p.design){let length=0,prev=feedPoint(p,L.geo,0);for(let i=0;i<41;i++){const f=i/40,q=feedPoint(p,L.geo,f);if(i)length+=Math.hypot(q.x-prev.x,q.y-prev.y);const before=feedPoint(p,L.geo,Math.max(0,f-.0001)),after=feedPoint(p,L.geo,Math.min(1,f+.0001)),norm=Math.hypot(after.x-before.x,after.y-before.y)||1;samples.push({t:length/Math.max(.05,p.feed),s:0,x:q.x,y:q.y,vx:p.feed*(after.x-before.x)/norm,vy:p.feed*(after.y-before.y)/norm,w:0,theta:0,phase:0,compression:0,wheelCompression:0,outerWheelCompression:0,ballNormalOffset:0,fw:0,fb:0,N:0,No:0,contact:0,feeding:1,wheelTheta:length/Math.max(.05,p.feed)*(p.design==='differential'?p.rpm/(p.gearRatio??2):p.rpm*(p.driveRatio??1))*Math.PI/30,outerWheelTheta:length/Math.max(.05,p.feed)*(p.design==='differential'?p.rpm:p.outerRpm*(p.ratio??1))*Math.PI/30});prev=q;}feedSeconds=samples.at(-1).t;}
 for(const s of L.samples){const phase=s.s/L.length,phi=angle+arc*(1-phase),q=Number.isFinite(s.x)?{x:s.x,y:s.y,phi:Math.atan2(s.vy,s.vx)}:p.design?L.geo.point(s.s):{x:Math.sin(angle)*R-Math.sin(phi)*R,y:p.height-Math.cos(angle)*R+Math.cos(phi)*R,phi};samples.push({...s,t:s.t+feedSeconds,x:q.x-Math.sin(q.phi)*(s.ballNormalOffset??0),y:q.y+Math.cos(q.phi)*(s.ballNormalOffset??0),vx:s.vx??s.v*Math.cos(q.phi),vy:s.vy??s.v*Math.sin(q.phi),phase:0,compression:s.compression??p.compression/1000*Math.sin(Math.PI*phase),contact:1,feeding:0,wheelTheta:(s.wheelTheta??0)+feedSeconds*(p.design==='differential'?p.rpm/(p.gearRatio??2):p.rpm*(p.driveRatio??1))*Math.PI/30,outerWheelTheta:(s.outerWheelTheta??0)+feedSeconds*(p.design==='differential'?p.rpm:(p.outerRpm??0)*(p.ratio??1))*Math.PI/30});}
 // Both solvers share the exact release state, then receive one common time origin.
 const wheelExit=samples.at(-1);
 for(const s of shot.pts.slice(1))samples.push({...s,wheelTheta:(wheelExit?.wheelTheta??0)+(p.design==='differential'?(L.U*s.t+((L.exitWheelSpeed??L.U)-L.U)*.08*(1-Math.exp(-s.t/.08)))/(L.geo.driveRadius??L.geo.rw)/(p.gearRatio??1):s.t*(p.design==='differential'?p.rpm/(p.gearRatio??2):p.rpm*(p.driveRatio??1))*Math.PI/30),outerWheelTheta:(wheelExit?.outerWheelTheta??0)+(p.design==='differential'?(L.U*s.t+((L.exitWheelSpeed??L.U)-L.U)*.08*(1-Math.exp(-s.t/.08)))/(L.geo.driveRadius??L.geo.rw):s.t*(p.design==='differential'?p.rpm:(p.outerRpm??0)*(p.ratio??1))*Math.PI/30),t:feedSeconds+L.t+s.t,theta:L.theta+s.theta,phase:1,catStage:4,compression:0,wheelCompression:0,outerWheelCompression:0,ballNormalOffset:0,fw:0,fb:0,N:0});
 const near=shot.pts.find(s=>Math.hypot(s.x-p.distance,s.y-p.targetHeight)<.65),impact=shot.firstContact;
 const basketTime=feedSeconds+(near?L.t+near.t:impact!==null&&impact!==undefined?L.t+Math.max(0,impact-.08):L.t+Math.max(.02,shot.duration-.15));
 for(let i=samples.length-1;i>0;i--)if(samples[i].t<=samples[i-1].t+1e-12)samples.splice(i-1,1);
 const loaded=L.samples.filter(q=>q.N>0||q.No>0);const contactStart=feedSeconds+(loaded[0]?.t??0),contactEnd=feedSeconds+(loaded.at(-1)?.t??L.t);
 return {samples,hasMechanicalFeed:!!p.design,contactStart,contactEnd,catapult:L.catapult?{loadEnd:feedSeconds+L.loadTime,holdEnd:feedSeconds+L.loadTime+L.holdTime}:null,duration:samples.at(-1).t,exitTime:feedSeconds+L.t,feedTime:feedSeconds,basketTime,ending:shot.ended,events:shot.events.map(e=>({...e,t:e.t+L.t+feedSeconds})),hasBasketApproach:!!near,escapeTime:shot.escapeTime===null?null:feedSeconds+L.t+shot.escapeTime,floorTime:shot.firstFloorTime===null?null:feedSeconds+L.t+shot.firstFloorTime,boundaryTime:shot.boundaryTime===null?null:feedSeconds+L.t+shot.boundaryTime};
}
export function simulate(p){p=withOfficialField(p);const L=launch(p);if(!L.valid)return {L,free:{pts:[],max:p.height,range:0},shot:{pts:[],status:L.reason||'Wheel spacing too wide',entry:null}};const free=flight(p,L),shot=flight(p,L,true);return {L,free,shot,timeline:continuousTimeline(p,L,shot)};}
export function interpolate(samples,t){if(!samples.length)return null;if(t<=samples[0].t)return samples[0];let lo=0,hi=samples.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(samples[mid].t<t)lo=mid;else hi=mid;}const a=samples[lo],b=samples[hi],f=Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t||1)));const out={};for(const k in a)out[k]=a[k]+(b[k]-a[k])*f;return out;}
export function calibrate(base,obs){let p={...withOfficialField(base),rpm:obs.rpm,angle:obs.angle,distance:obs.distance};const has=Object.entries(obs).some(([k,v])=>['time','impact','apex','spin'].includes(k)&&Number.isFinite(v));if(!has)return null;
 const loss=(q)=>{const L=launch(q),s={L,free:flight(q,L)};let sum=0,n=0;const add=(v,target,scale)=>{if(Number.isFinite(target)){sum+=((v-target)/scale)**2;n++;}};if(Number.isFinite(obs.time)||Number.isFinite(obs.impact)){if(!s.free.entry)return 1e6;add(s.free.entry.t,obs.time,.08);add(s.free.entry.y,obs.impact,.12);}add(s.free.max,obs.apex,.12);add(s.L.w*60/(2*Math.PI),obs.spin,300);return sum/Math.max(1,n);};
 let best=loss(p);for(let pass=0;pass<4;pass++){for(const [key,lo,hi] of [['loadFactor',.1,3],['muBack',.02,1],['magnus',0,.5]]){let chosen=p[key];for(let k=0;k<=12;k++){const val=lo+(hi-lo)*k/12,q={...p,[key]:val},score=loss(q);if(score<best){best=score;chosen=val;}}p[key]=chosen;}}return {params:p,error:Math.sqrt(best),changes:{loadFactor:p.loadFactor,muBack:p.muBack,magnus:p.magnus}};}
