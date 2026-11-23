import {wheelOutline} from './compliance.mjs';
import {tireColor,wheelDepth} from './configuration.mjs';
import {spinLabel} from './spin-visual.mjs';
import {feedPoint} from './mechanics.mjs';
import {CinematicScene} from './cinematic-scene.mjs';
import {interpolate} from './physics.mjs';
export function drawMechanism(v,p,L,t,ball){const g=L.geo;if(!g.point)return;if(p.design==='catapult'){drawCatapult(v,p,L,t,ball);return;}const n=64,hood=[],side=p.design==='spring'||p.design==='underhand'?1:-1;
 const pt=(s,offset)=>{const q=g.point(s);return {x:q.x-Math.sin(q.phi)*offset,y:q.y+Math.cos(q.phi)*offset};};
 for(let i=0;i<=n;i++)hood.push(pt(g.length*i/n,-side*(g.r-((p.design==='spring'||p.design==='underhand')&&Number.isFinite(p.throatGap)?0:(p.throatInterference??p.compression)/2000))));
 if(p.design==='differential')v.path(hood,'#536f7b',1,null,[3,7]);else{v.path(hood,'#9db7bb',5);v.path(hood,'#cce0d1',1);}
 const feed=[];for(let i=0;i<=40;i++)feed.push(feedPoint(p,g,i/40));v.path(feed,'#5b9095',1,null,[3,4]);const bottom=feed[0];v.path([{x:bottom.x-.043,y:bottom.y-.04},{x:bottom.x-.043,y:bottom.y+.015}],'#566f79',3);v.path([{x:bottom.x+.043,y:bottom.y-.04},{x:bottom.x+.043,y:bottom.y+.015}],'#566f79',3);
 const wheels=[{...g.wheel,rpm:p.design==='differential'?p.innerRpm:p.rpm*(p.driveRatio??1),pair:!!p.dual}];if(p.design==='differential')wheels.push({...g.outer,rpm:-(p.outerRpm??p.rpm)*(p.ratio??1),pair:!!p.outerDual,outer:true});
 for(const w of wheels){const sectionShift=g.r-(w.outer?g.backLever:g.lever);w.x+=w.side*(-Math.sin(w.phi))*sectionShift;w.y+=w.side*Math.cos(w.phi)*sectionShift;const d=p.design==='spring'?(ball?.deflection??0):0;w.y+=Math.cos(p.angle*Math.PI/180)*d;w.x-=Math.sin(p.angle*Math.PI/180)*d;const depth=w.outer?(ball?.outerWheelCompression??0):(ball?.wheelCompression??0),outline=wheelOutline(w,ball,depth);v.path(outline,'#a0de9e',1.5,tireColor(w.outer?p.outerDurometer:p.durometer));const cc=v.ctx;cc.save();cc.beginPath();for(const [i,pt]of outline.entries()){const xy=v.project(pt.x,pt.y);i?cc.lineTo(xy.x,xy.y):cc.moveTo(xy.x,xy.y);}cc.closePath();cc.clip();for(let i=0;i<14;i++){const computed=w.outer?ball?.outerWheelTheta:ball?.wheelTheta;const a=(Number.isFinite(computed)?computed:t*Math.abs(w.rpm)*Math.PI/30)*(w.side||-1)+i*Math.PI/7;v.path([{x:w.x+Math.cos(a)*w.r*.3,y:w.y+Math.sin(a)*w.r*.3},{x:w.x+Math.cos(a)*w.r*.88,y:w.y+Math.sin(a)*w.r*.88}],'#2c7847',2);}cc.restore();const coreR=Math.max(.003,w.r-wheelDepth(p,!!w.outer)/1000);const shaftOnly=Math.abs(w.r-.0254)<.001&&coreR<=.009;if(!shaftOnly)v.circle(w.x,w.y,coreR,'#263a3e','#b9c9c2',1);const hex=[];for(let i=0;i<=6;i++){const a=i/6*Math.PI*2;hex.push({x:w.x+Math.cos(a)*(shaftOnly?coreR:Math.min(.006,coreR*.75)),y:w.y+Math.sin(a)*(shaftOnly?coreR:Math.min(.006,coreR*.75))});}v.path(hex,'#b9c9c2',1,shaftOnly?'#7d9093':'#101e22');if(v.camera.scale>1100)v.text((p.design==='differential'?(w.outer?'REAR POWERED · ':'FRONT GEARED · '):(w.pair?'2 × ':'1 × '))+Math.round(w.r*2000)+' mm',w.x,w.y-w.r-.018,'#93c5a2',11,'center');}
 if(p.design==='spring'){const w=wheels[0],b=p.angle*Math.PI/180;const spring=[];for(let i=0;i<19;i++)spring.push({x:w.x+Math.cos(b)*.013*(i%2?1:-1)-Math.sin(b)*(.055+i*.003),y:w.y+Math.sin(b)*.013*(i%2?1:-1)+Math.cos(b)*(.055+i*.003)});v.path(spring,'#eeb171',2);if(p.flywheel)v.circle(w.x,w.y,w.r*.85,null,'#b2bac3',4);}
 if(g.underhand){const entry=pt(g.leadLength,-g.r-.012),end=g.point(g.length);v.text(`${g.entryAngle.toFixed(0)}° entry`,entry.x,entry.y,'#a1c9d3',11,'center');v.text(`${g.exitAngle.toFixed(0)}° release`,end.x+.015,end.y+.035,'#a1c9d3',11,'left');}
 const path=[];for(let i=0;i<50;i++)path.push(g.point(i/49*g.length));v.path(path,'#d4ed6888',1,null,[3,5]);
 if(p.design==='differential'){
  v.path([g.wheel,g.outer],'#85a8b7',1,null,[4,4]);
  const mid={x:(g.wheel.x+g.outer.x)/2,y:(g.wheel.y+g.outer.y)/2};
  const angle=p.angle*Math.PI/180,tip={x:mid.x+Math.cos(angle)*.10,y:mid.y+Math.sin(angle)*.10};v.path([mid,tip],'#d4ed68',1.5,null,[6,4]);
  v.text(`Release ${p.angle.toFixed(0)}° · bearing line ${(p.angle+90).toFixed(0)}°`,mid.x,Math.max(g.wheel.y+g.wheel.r,g.outer.y+g.outer.r)+.035,'#a1c9d3',11,'center');
 }if(v.camera.scale>1300)v.text('VERTICAL CENTER FEED',bottom.x,bottom.y-.025,'#74b2bc',10,'center');
}
export class PitCutaway extends CinematicScene{
 constructor(el){super(el);this.autoCamera=false;}
 build(p,r){super.build(p,r,null);const pts=r.timeline.samples.filter(x=>x.t<=r.timeline.exitTime),g=r.L.geo;const xs=[...pts.map(q=>q.x),g.wheel.x-g.wheel.r,g.wheel.x+g.wheel.r],ys=[...pts.map(q=>q.y),g.wheel.y-g.wheel.r,g.wheel.y+g.wheel.r];if(p.design==='differential'){xs.push(g.outer.x-g.outer.r,g.outer.x+g.outer.r);ys.push(g.outer.y-g.outer.r,g.outer.y+g.outer.r);}if(p.design==='catapult'){const R=Math.max(...g.camProfile.map(q=>Math.hypot(q.x,q.y)));xs.push(g.anchor.x,g.cam.x-R,g.cam.x+R);ys.push(g.anchor.y,g.cam.y-R,g.cam.y+R);}this.bounds={xmin:Math.min(...xs)-.07,xmax:Math.max(...xs)+.07,ymin:Math.min(...ys)-.075,ymax:Math.max(...ys)+.07};this.fit();}
 fit(){if(!this.bounds||!this.w)return;const b=this.bounds;this.camera={x:(b.xmin+b.xmax)/2,y:(b.ymin+b.ymax)/2,scale:Math.min((this.w-30)/(b.xmax-b.xmin),(this.h-65)/(b.ymax-b.ymin))};}
 resize(){super.resize();this.fit();}
 render(){if(!this.camera)return;if(!this.ball){const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#101e22';c.fillRect(0,0,this.w,this.h);c.fillStyle='#d4ed68';c.font='15px system-ui';c.textAlign='center';c.fillText(this.result.L.reason||'No valid wheel contact. Check the lateral gap.',this.w/2,this.h/2);return;}const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#101e22';c.fillRect(0,0,this.w,this.h);this.grid();drawMechanism(this,this.p,this.result.L,this.time,this.ball);this.ballDrawing();c.font='13px monospace';c.fillStyle='#dae5c4';c.textAlign='center';c.fillText(spinLabel(this.ball.w),this.w/2,this.h-18);this.el.dataset.simTime=this.time.toFixed(6);}
}

export function drawCatapult(v,p,L,t,ball){const g=L.geo,tl=v.result.timeline,after=Math.max(0,t-tl.exitTime),reset=interpolate(L.resetSamples,after),a=t>tl.exitTime?(reset?.armAngle??g.restAngle):Number.isFinite(ball?.armAngle)?ball.armAngle:g.restAngle,c=g.pivot,q=g.position(a),sp=g.spring(a),stage=ball?.feeding?0:t>tl.exitTime?4:Math.round(ball?.catStage??1);
 const phi=t>tl.exitTime?(reset?.camAngle??Math.PI*2):(ball?.camAngle??0),outline=g.camProfile.map(z=>({x:g.cam.x+z.x*Math.cos(phi)-z.y*Math.sin(phi),y:g.cam.y+z.x*Math.sin(phi)+z.y*Math.cos(phi)}));
 // One arm, one compression spring, one snail cam and one follower. No force overlays.
 v.path(outline,'#a5b8bd',2,'#243a42');v.circle(g.cam.x,g.cam.y,.007,'#b7c9ca');
 const cliffLocal=g.camProfile[196]??g.camProfile[0];const cliff={x:g.cam.x+cliffLocal.x*Math.cos(phi)-cliffLocal.y*Math.sin(phi),y:g.cam.y+cliffLocal.x*Math.sin(phi)+cliffLocal.y*Math.cos(phi)};v.circle(cliff.x,cliff.y,.003,'#e6bf6e');
 const spring=[],dx=sp.at.x-g.anchor.x,dy=sp.at.y-g.anchor.y,len=Math.hypot(dx,dy);for(let i=0;i<=30;i++){const f=i/30,z=i<2||i>28?0:(i%2?1:-1)*.006;spring.push({x:g.anchor.x+dx*f-dy/len*z,y:g.anchor.y+dy*f+dx/len*z});}v.path(spring,'#e6b276',2.5);v.path([{x:g.anchor.x-.01,y:g.anchor.y-.014},{x:g.anchor.x-.01,y:g.anchor.y+.014}],'#829da5',3);
 v.path([c,q],'#becdcf',5);v.circle(c.x,c.y,.014,'#263e46','#b4c9ce',2);v.circle(c.x,c.y,.004,'#d4e1df');const follower=g.follower(a);v.circle(follower.x,follower.y,g.rollerRadius,'#c4d5d8','#577581',1.5);
 const cup=[];for(let i=0;i<=24;i++){const z=Math.PI+i/24*Math.PI;cup.push({x:q.x+Math.cos(z)*g.r*1.08,y:q.y+Math.sin(z)*g.r*1.08});}v.path(cup,'#b6ced0',3);
 const entry=g.position(g.restAngle);v.path([{x:entry.x,y:entry.y-.06},entry],'#648c96',1,null,[3,5]);
 const label=['BALL INTO CUP','CAM PRESSES ARM DOWN','AT THE CLIFF','SPRING LIFTS · FIRE','SPRING UP / CAM RESET'][Math.max(0,Math.min(4,stage))];const top=Math.max(g.position(g.restAngle).y,g.cam.y+.1)+.05;v.text(label,c.x,top,'#d5c99f',12,'center');v.text('Spring '+sp.energy.toFixed(2)+' J',c.x,top-.025,'#a2b9bd',11,'center');
}
