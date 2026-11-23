import {contactCompliance,deformation} from './compliance.mjs';
// Rear-driven, geared opposed-wheel pinch. SI units. Local compliance and
// friction are provisional estimates; no spin sign or rolling speed is imposed.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function differentialGeometry(p){
 const r=p.ballD*.0254/2,ri=p.wheelD*.0254/2,ro=p.outerD*.0254/2,b=p.angle*Math.PI/180,t={x:Math.cos(b),y:Math.sin(b)},n={x:-Math.sin(b),y:Math.cos(b)};
 // Each lateral contact is centered halfway across its estimated 16 mm tire.
 const contactRadius=gap=>Math.sqrt(Math.max(0,r*r-((gap+16)/2000)**2)),lever=p.dual===1?contactRadius(p.gap??15):r,backLever=p.outerDual===0?r:contactRadius(p.outerGap??15),delta=(p.throatInterference??p.compression)/1000/2;
 const di=ri+lever-delta,dout=ro+backLever-delta;
 const hi=Math.sqrt(Math.max(0,(ri+lever)**2-di**2)),ho=Math.sqrt(Math.max(0,(ro+backLever)**2-dout**2)),half=Math.max(hi,ho)+.002,length=half*2;
 const origin={x:-half*t.x,y:p.height-half*t.y};
 const point=s=>({x:origin.x+(s-half)*t.x,y:origin.y+(s-half)*t.y,phi:b});
 const wheel={x:origin.x-n.x*di,y:origin.y-n.y*di,r:ri,side:-1,phi:b};
 const outer={x:origin.x+n.x*dout,y:origin.y+n.y*dout,r:ro,side:1,phi:b};
 return {r,rw:ri,driveRadius:ro,lever,backLever,length,pathRadius:Infinity,half,point,wheel,outer,straight:true,verticalFeed:false,pinch:true,valid:backLever>0&&lever>0,bearingAngle:b+Math.PI/2,splitCompression:delta};
}
export function differentialLaunch(p){
 const geo=differentialGeometry(p),{r,lever,backLever,length}=geo,m=p.mass/1000,I=p.inertia*m*r*r,ri=geo.wheel.r,ro=geo.outer.r,g=Math.max(1,p.gearRatio??2),Omega=p.rpm*Math.PI/30,U=Omega*ro;
 const innerCompliance=contactCompliance(p),outerCompliance=contactCompliance(p,p.outerDurometer,true),ki=innerCompliance.k,ko=outerCompliance.k,mu=p.muWheel*(p.ballGrip??1),J=(p.outerDual===0?1:2)*.5*.06*ro*ro+(p.dual===1?2:1)*.5*.06*ri*ri/(g*g),dt=.00001;
 let omega=Omega,v=p.feed,w=0,s=0,t=0,theta=0,wheelTheta=0,outerWheelTheta=0,work=0,contactTime=0,innerImpulse=0,outerImpulse=0,outerContactTime=0,outerLimitedTime=0;
 let wheelCompression=0,outerWheelCompression=0,ballNormalOffset=0,maxWheelCompression=0,maxBallCompression=0,jamRisk=false;
 const samples=[],snap=(fw=0,fb=0,N=0,No=0,compression=0)=>({t,s,v,w,theta,fw,fb,N,No,compression,wheelCompression,outerWheelCompression,ballNormalOffset,deflection:0,wheelTheta,outerWheelTheta,uw:omega/g*ri,uo:omega*ro});samples.push(snap());
 if(!geo.valid)return {geo,v:0,w:0,t:0,U,length,samples,valid:false,reason:"Wheel spacing exceeds ball contact width."};
 for(let i=0;i<200000&&s<length;i++){
  const q=geo.point(s),ci=Math.max(0,ri+lever-Math.hypot(q.x-geo.wheel.x,q.y-geo.wheel.y)),co=Math.max(0,ro+backLever-Math.hypot(q.x-geo.outer.x,q.y-geo.outer.y));
  // Total throat interference is shared by the two opposed surfaces. The rear
  // group load is shared by its two lateral tires; it is not doubled again.
  // Their normals are oblique in 3D: divide projected support load by cos = lever/r.
  const di=deformation(ci,innerCompliance,ri),dout=deformation(co,outerCompliance,ro);
  wheelCompression=di.wheel;outerWheelCompression=dout.wheel;ballNormalOffset=(di.ball-dout.ball)/2;
  maxWheelCompression=Math.max(maxWheelCompression,di.wheel,dout.wheel);maxBallCompression=Math.max(maxBallCompression,di.ball+dout.ball);
  jamRisk ||= di.bottomed||dout.bottomed||di.ball+dout.ball>2*r*.01;
  const N=di.force*p.loadFactor*r/lever,No=dout.force*p.loadFactor*r/backLever,ui=omega/g*ri,uo=omega*ro;
  const fw=clamp(p.contactGain*(ui-v-w*lever),-mu*N,mu*N),fb=clamp(p.contactGain*(uo-v+w*backLever),-mu*No,mu*No);
  const h=Math.min(dt,(length-s)/Math.max(v,.001));
  work+=(fw*ui+fb*uo)*h;v=Math.max(.001,v+(fw+fb)/m*h);w+=(lever*fw-backLever*fb)/I*h;
  omega=Math.max(0,omega+((Omega-omega)/.08-(fb*ro+fw*ri/g)/J)*h);
  s=Math.min(length,s+v*h);t+=h;theta+=w*h;wheelTheta+=omega/g*h;outerWheelTheta+=omega*h;
  innerImpulse+=fw*h;outerImpulse+=fb*h;if(N>0||No>0)contactTime+=h;if(No>0){outerContactTime+=h;if(Math.abs(fb)>=mu*No*.999)outerLimitedTime+=h;}
  if(i%10===0)samples.push(snap(fw,fb,N,No,di.ball+dout.ball));
 }
 wheelCompression=0;outerWheelCompression=0;ballNormalOffset=0;samples.push(snap());return {v,w,theta,U,t,length,contactTime,samples,work,geo,valid:s>=length-1e-8&&!jamRisk,reason:jamRisk?'Jam risk: tire bottoming or excessive ball deformation; widen the gap.':null,maxWheelCompression,maxBallCompression,jamRisk,energy:.5*m*v*v+.5*I*w*w,exitWheelSpeed:omega*ro,rearDriven:true,traction:{innerImpulse,outerImpulse,outerContactTime,outerLimitedFraction:outerContactTime?outerLimitedTime/outerContactTime:0,innerSpinImpulse:lever*innerImpulse,outerSpinImpulse:-backLever*outerImpulse}};
}
