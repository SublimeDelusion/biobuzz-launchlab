import {contactCompliance,deformation,carriageDeflection} from './compliance.mjs';
import {underhandGeometry} from './underhand.mjs';
import {configureGap} from './configuration.mjs';
import {differentialGeometry,differentialLaunch} from './differential.mjs';
import {catapultLaunch} from './catapult.mjs';
// Shared, SI contact model. Hardness-to-stiffness mapping is an editable engineering estimate.
export const DESIGNS=[
 {id:'original',name:'Curved Hood',tag:'OUR COMPETITION SHOOTER',description:'A lateral wheel pair drives against a stationary curved hood. Inspect how the two contacts share translation and spin.',accent:'#d4ed68',defaults:{wheelD:2,rpm:4000,compression:3.175,throatGap:67.945,arc:25,hoodRadius:65,durometer:35}},
 {id:'differential',name:'Two Wheel',tag:'OPPOSED POWERED CONTACTS',description:'The rear pair is powered. The front wheel is geared down. Their shared pinch, wheel sizes and surface speeds determine launch speed and spin.',accent:'#81cce9',defaults:{dual:0,wheelD:2,outerD:2,throatGap:66.12,rpm:4000,outerRpm:4000,compression:5,outerCompression:3.175,arc:45,hoodRadius:70,durometer:35,outerDurometer:35,offset:15,overlap:.6,ratio:1,rearRatio:1.15,gearRatio:2}},
 {id:'spring',name:'Spring-Loaded Straight Ramp',tag:'COMPLIANT CARRIAGE',description:'A spring-loaded powered pair above a straight guide. Follow carriage travel, traction, and speed recovery through contact.',accent:'#efb679',defaults:{wheelD:2,throatGap:60,rpm:4000,compression:11.12,arc:25,rampLength:120,rampEnd:0,durometer:35,springPreload:15,springK:3500,springTravel:12,flywheel:0}},
 {id:'underhand',name:'Underhand',tag:'VERTICAL FEED · LOWER GUIDE',description:'The ball feeds vertically from below, then passes beneath an inside wheel along a lower/right curved guide. The upward-forward bend starts at 30° and releases at 70° by default.',accent:'#a8d7bc',defaults:{dual:0,wheelD:2,rpm:4000,angle:70,compression:3.175,throatGap:67.945,arc:40,hoodRadius:65,durometer:35}}
];
export const robotDefaults={dual:1,outerDual:1,outerGap:15,supportedPair:0,design:'original',wheelDepth:21.4,outerWheelDepth:21.4,durometer:50,outerDurometer:50,outerD:2.5,outerRpm:4000,outerCompression:3.175,ratio:1,offset:0,overlap:1,hoodRadius:65,rampLength:120,rampEnd:0,springPreload:15,springK:3500,springTravel:12,flywheel:0,driveRatio:1,rearRatio:1.15,gearRatio:2,camDrop:75,springStrength:300,armLength:280,releaseAngle:45,minAngle:10,maxAngle:85};
export function contactLayout(p){p=configureGap(p);if(p.design==='underhand')return underhandGeometry(p);if(p.design==='differential')return differentialGeometry(p);const r=p.ballD*.0254/2,rw=p.wheelD*.0254/2,pairedLever=p.dual===0?r:Math.sqrt(Math.max(0,r*r-((p.gap+16)/2000)**2)),lever=p.design==='differential'?r:pairedLever,backLever=p.design==='differential'?pairedLever:(p.surface==='tape'||p.surface==='rails'?Array.from({length:9},(_,i)=>{const z=(p.surface==='tape'?p.stripSpacing:p.railSpacing)/2000+((p.surface==='tape'?p.stripWidth:p.railWidth)/1000)*(i/8-.5);return Math.sqrt(Math.max(0,r*r-z*z));}).reduce((a,b)=>a+b,0)/9:r);const straight=p.design==='spring',diff=p.design==='differential';const radius=Math.max(r+.005,p.hoodRadius/1000),length=diff?.04+radius*Math.max(.02,Math.PI/2-p.angle*Math.PI/180)+.008:straight?Math.max(.02,(p.rampLength+p.rampEnd)/1000):radius*p.arc*Math.PI/180,b=p.angle*Math.PI/180;
 const point=(s)=>{if(diff){const lead=.04,turn=Math.max(.02,Math.PI/2-b),d=Math.max(0,s-lead),bend=Math.min(radius*turn,d),phi=Math.PI/2-bend/radius,tail=Math.max(0,d-radius*turn),x=(s<=lead?0:radius*(1-Math.sin(phi)))+tail*Math.cos(b),y=(s<=lead?s:lead+radius*Math.cos(phi))+tail*Math.sin(b);return {x:x-radius*(1-Math.sin(b))-.008*Math.cos(b),y:p.height+y-lead-radius*Math.cos(b)-.008*Math.sin(b),phi:d>=radius*turn?b:phi};}const f=Math.max(0,Math.min(1,s/length)),phi=straight?b:b+(1-f)*p.arc*Math.PI/180;return {x:straight?(s-length)*Math.cos(b):radius*(Math.sin(b)-Math.sin(phi)),y:p.height+(straight?(s-length)*Math.sin(b):radius*(Math.cos(phi)-Math.cos(b))),phi};};
 const wheelAt=(f,side,diam=p.wheelD)=>{const q=point(f*length),d=diam*.0254/2+(p.design==='differential'&&side===1?backLever:lever)-(p.design==='differential'&&side===1?p.outerCompression:(p.throatInterference??p.compression))/(p.design==='spring'&&Number.isFinite(p.throatGap)?1000:2000);return {x:q.x+side*(-Math.sin(q.phi))*d,y:q.y+side*Math.cos(q.phi)*d,r:diam*.0254/2,side,phi:q.phi};};
 const wheel=wheelAt(diff?.24+.10*Math.max(0,Math.min(1,p.overlap)):.5,straight?1:-1),outer=wheelAt(diff?Math.max(.5,Math.min(.98,.64+.3*(1-Math.max(0,Math.min(1,p.overlap)))+((p.offset??15)-15)/1000/length)):Math.max(.1,Math.min(.9,.5+p.offset/1000/length)),1,p.outerD);
 // Finish the outside contact footprint before release. Previously a fixed path
 // endpoint could release the ball while it was still compressed into the pair.
 if(diff){const end=point(length),tx=Math.cos(b),ty=Math.sin(b),dx=end.x-outer.x,dy=end.y-outer.y,along=dx*tx+dy*ty,perp=dx*(-ty)+dy*tx,reach=outer.r+backLever,extra=Math.max(0,-along+Math.sqrt(Math.max(0,reach*reach-perp*perp))),shift={x:extra*tx,y:extra*ty};return {r,rw,lever,backLever,pathRadius:radius,length:length+extra,engagementLength:length,valid:pairedLever>0,point:s=>{const q=point(s);return {...q,x:q.x-shift.x,y:q.y-shift.y};},wheel:{...wheel,x:wheel.x-shift.x,y:wheel.y-shift.y},outer:{...outer,x:outer.x-shift.x,y:outer.y-shift.y},straight};}
 return {r,rw,lever,backLever,pathRadius:radius,length,valid:pairedLever>0,point,wheel,outer,straight};
}
export function mechanicalLaunch(p){p=configureGap(p);if(p.design==='differential')return differentialLaunch(p);if(p.design==='catapult')return catapultLaunch(p);const geo=contactLayout(p),{r,rw,lever,backLever,length}=geo,m=p.mass/1000,I=p.inertia*m*r*r,ratio=p.driveRatio??1,U=p.rpm*ratio*2*Math.PI/60*rw,Uo=(p.design==='differential'?p.rpm*(p.driveRatio??1)*(p.rearRatio??1.15):p.outerRpm*(p.ratio??1))*2*Math.PI/60*p.outerD*.0254/2;
 let contactDistance=0,maxDeflection=0,travelStop=false,maxWheelCompression=0,maxBallCompression=0,jamRisk=false;
 let innerImpulse=0,outerImpulse=0,outerContactTime=0,outerLimitedTime=0,wheelSpin=0,guideSpin=0,guideDissipation=0,minWheelSpeed=U;
 let v=p.feed,w=0,s=0,t=0,theta=0,work=0,uw=U,uo=Uo,wheelTheta=0,outerWheelTheta=0,contactTime=0;const samples=[{t,s,v,w,theta,fw:0,fb:0,N:0,No:0,compression:0,wheelCompression:0,outerWheelCompression:0,ballNormalOffset:0,deflection:0,wheelTheta:0,outerWheelTheta:0,uw:U,uo:Uo}],dt=.00001;const side=p.design==='spring'||p.design==='underhand'?-1:1;
 if(!geo.valid)return {v:0,w:0,U,t:0,length,samples,valid:false,work:0,geo,...(geo.reason?{reason:geo.reason}:{})};
 const compliance=contactCompliance(p),k=compliance.k,tireKo=60000*Math.exp(((p.outerDurometer??50)-50)/22),ko=1/(1/p.stiffness+1/tireKo);
 const clamp=(x,l,h)=>Math.max(l,Math.min(h,x));
 for(let i=0;i<150000&&s<length;i++){const f=s/(geo.engagementLength??length),taper=.3+.7*Math.sin(Math.PI*f),at=geo.point(s),reach=rw+lever;const localCompression=Math.max(0,Math.min(p.compression/1000,((p.design==='spring'||p.design==='underhand')&&Number.isFinite(p.throatGap)?1:2)*(reach-Math.hypot(at.x-geo.wheel.x,at.y-geo.wheel.y))));let N=k*localCompression*p.loadFactor,deflection=0,No=N,innerActive=1,outerActive=1,visualCompression=localCompression;
  if(p.design==='spring'&&p.compression>0){const travel=p.springTravel/1000,delta=localCompression;deflection=clamp((k*delta-p.springPreload)/(k+p.springK),0,travel);if(Number.isFinite(p.throatGap)){deflection=carriageDeflection(delta,compliance,rw,p.springPreload,p.springK,travel);N=k*Math.max(0,delta-deflection)*p.loadFactor;visualCompression=Math.max(0,delta-deflection)*k/p.stiffness;maxDeflection=Math.max(maxDeflection,deflection);travelStop||=deflection>=travel-1e-8&&delta>deflection;}else N=Math.min(k*delta,p.springPreload+p.springK*deflection+Math.max(0,delta-deflection-travel)*k)*p.loadFactor;}
  if(p.design==='differential'){const offset=clamp(p.offset/1000/length,-.8,.8),ov=clamp(p.overlap,0,1);innerActive=f<=clamp(.22+.4*ov,0,.72)?1:0;outerActive=f>=clamp(.62-.4*ov+offset*.1,.2,.8)?1:0;N*=innerActive;const reachOuter=p.outerD*.0254/2+backLever,outerDelta=Math.max(0,Math.min(p.outerCompression/1000,2*(reachOuter-Math.hypot(at.x-geo.outer.x,at.y-geo.outer.y))));// Two lateral outside wheels: sum their local normal loads and traction.
 // Stiffness is an uncalibrated per-contact estimate, as for the single inner wheel.
 No=2*ko*outerDelta*p.loadFactor*outerActive;visualCompression=Math.max(localCompression*innerActive,outerDelta*outerActive);}
  const modern=Number.isFinite(p.throatGap),deform=deformation(Math.max(0,localCompression-deflection),compliance,rw);
  const wheelCompression=modern?deform.wheel:0,ballCompression=modern?deform.ball:visualCompression;
  if(modern){N=deform.force*p.loadFactor;No=N;visualCompression=ballCompression;maxWheelCompression=Math.max(maxWheelCompression,wheelCompression);maxBallCompression=Math.max(maxBallCompression,ballCompression);jamRisk ||= deform.bottomed || ballCompression>2*r*.01;}
  const paired=p.design==='original'&&p.supportedPair===1&&p.dual!==0;
  if(paired){N*=2;No=N;}
  const fw=clamp((paired?2:1)*p.contactGain*(uw-v-side*w*lever),-p.muWheel*(p.ballGrip??1)*N,p.muWheel*(p.ballGrip??1)*N);
  const fb=p.design==='differential'?clamp(2*p.contactGain*(uo-v+w*backLever),-p.muWheel*(p.ballGrip??1)*No,p.muWheel*(p.ballGrip??1)*No):clamp(-p.contactGain*(v-side*w*backLever),-p.muBack*(p.ballGrip??1)*N,p.muBack*(p.ballGrip??1)*N);
  const a=(fw+fb)/m,aw=(side*lever*fw-side*backLever*fb)/I;
  // Estimated 60 g uniform-disk inertia per compliant wheel, with an 80 ms speed-control recovery.
  // Additional paired 82 mm / 100 g flywheels increase inertia and reduce contact droop.
  const J=(paired?.00010:0)+(p.dual===0||(p.dual==null&&p.design==='underhand')?1:2)*.5*.06*rw*rw+(p.design==='spring'&&p.flywheel?2*.5*.10*.041**2:0);
  if(p.design==='differential'){
   // One geared drive: reflect both kick-wheel inertias and loads to the drive shaft.
   const ro=p.outerD*.0254/2,g=p.rearRatio??1.15,Jo=2*.5*.06*ro*ro,reflected=J+g*g*Jo;
   uw=Math.max(0,uw+((U-uw)/.08-(fw*rw+g*fb*ro)*rw/reflected)*dt);uo=uw*g*ro/rw;
  }else uw=Math.max(0,uw+((U-uw)/.08-fw*rw*rw/J)*dt);
  const h=Math.min(dt,(length-s)/Math.max(v,.001));wheelSpin+=side*lever*fw/I*h;guideSpin+=-side*backLever*fb/I*h;guideDissipation+=-fb*(v-side*w*backLever)*h;minWheelSpeed=Math.min(minWheelSpeed,uw);v=Math.max(.001,v+a*h);w+=aw*h;if(p.design==='differential'){innerImpulse+=fw*h;outerImpulse+=fb*h;if(No>0){outerContactTime+=h;if(Math.abs(fb)>=p.muWheel*(p.ballGrip??1)*No*.999)outerLimitedTime+=h;}}s=Math.min(length,s+v*h);t+=h;if(N>0||No>0){contactTime+=h;contactDistance+=v*h;}theta+=w*h;wheelTheta+=uw/rw*h;outerWheelTheta+=uo/(p.outerD*.0254/2)*h;work+=(fw*uw+(p.design==='differential'?fb*uo:0))*h;
  if(i%15===0)samples.push({t,s,v,w,theta,fw,fb,N,No,compression:visualCompression,wheelCompression,outerWheelCompression:0,ballNormalOffset:modern?(p.design==='spring'||p.design==='underhand'?-ballCompression/2:-wheelCompression/2):0,deflection,wheelTheta,outerWheelTheta,uw,uo});
 }
 samples.push({t,s,v,w,theta,fw:0,fb:0,N:0,No:0,compression:0,wheelCompression:0,outerWheelCompression:0,ballNormalOffset:0,deflection:0,wheelTheta,outerWheelTheta,uw,uo});return {v,w,theta,U,t,contactTime,length,samples,work,valid:s>=length-1e-8&&!jamRisk,reason:jamRisk?'Jam risk: tire bottoming or excessive ball deformation; widen the gap.':s<length-1e-8?'Ball stalled in mechanism':null,geo,energy:.5*m*v*v+.5*I*w*w,exitWheelSpeed:uw,minWheelSpeed,spinContributions:{wheel:wheelSpin,guide:guideSpin},guideDissipation,contactDistance,maxDeflection,travelStop,maxWheelCompression,maxBallCompression,jamRisk,...(p.design==='differential'?{traction:{innerImpulse,outerImpulse,outerContactTime,outerLimitedFraction:outerContactTime?outerLimitedTime/outerContactTime:0,innerSpinImpulse:lever*innerImpulse,outerSpinImpulse:-backLever*outerImpulse}}:{})};
}
// Vertical feed connector ends at the contact path with matching tangent and speed.
export function feedPoint(p,geo,f){if(p.design==='catapult'){const q=geo.point(0);return {x:q.x,y:q.y-.06*(1-f)};}const e=geo.point(0),len=.06,x0=e.x-Math.cos(e.phi)*.015,y0=e.y-len;const p0={x:x0,y:y0},p1={x:x0,y:y0+.025},p2={x:e.x-Math.cos(e.phi)*.015,y:e.y-Math.sin(e.phi)*.015};const u=1-f;return {x:u**3*p0.x+3*u*u*f*p1.x+3*u*f*f*p2.x+f**3*e.x,y:u**3*p0.y+3*u*u*f*p1.y+3*u*f*f*p2.y+f**3*e.y};}

export function differentialTractionNote(L){
 const q=L.traction;if(!q)return '';
 const time=(q.outerContactTime*1000).toFixed(1),limited=Math.round(q.outerLimitedFraction*100);if(L.rearDriven)return `Rear contact ${time} ms; traction-limited for ${limited}%. More RPM alone cannot add torque at the grip limit. Total compression and the rear/front surface-speed difference determine the spin transferred.`;
 return `Outside pair: ${time} ms loaded contact; traction-limited for ${limited}% of that time. `+(limited>=90?'More RPM alone cannot add torque at this grip limit. Increase outside contact compression or grip, or reduce inside compression. A wide lateral gap also reduces forward-spin leverage.':'Outside RPM changes slip and torque until the contact reaches its grip limit.');
}

export function guideSpinNote(L){
 const q=L.spinContributions;if(!q)return '';
 if(Math.abs(q.guide)<1e-8)return 'Guide friction adds no torque in this shot. The powered wheel still creates spin.';
 return q.guide*q.wheel<0?'Guide torque reduces wheel-generated spin in this shot. Slicker rails can leave more spin.':'Guide torque adds to wheel-generated spin in this shot. Slicker contact may reduce that contribution.';
}
