// Playback and camera are consumers of the physics timeline. Neither mutates it.
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export const mix=(a,b,t)=>a+(b-a)*t;
export function shotPhase(t,tl){return t<=tl.exitTime?'contact':t<tl.basketTime?'flight':'basket';}
export function autoRate(t,tl){
 if(t<=tl.exitTime){if(tl.catapult){if(t<(tl.feedTime??0))return .8;if(t<tl.catapult.loadEnd)return .5;if(t<tl.catapult.holdEnd)return .2;return .05;}if(tl.hasMechanicalFeed){const contact=tl.contactStart??tl.feedTime??0;return mix(.8,.05,smooth((t-(contact-.008))/.008));}return .05;}
 const acceleration=smooth((t-tl.exitTime)/.18),braking=smooth((t-(tl.basketTime-.12))/.12);
 const basketRate=mix(mix(.05,.75,acceleration),.1,braking);
 const escaped=tl.escapeTime!==null&&tl.escapeTime!==undefined,landed=tl.floorTime!==null&&tl.floorTime!==undefined;
 const falling=escaped?smooth((t-tl.escapeTime-.12)/.35):0;
 const rolling=landed?smooth((t-tl.floorTime-.08)/.25):0;
 return mix(mix(basketRate,.65,falling),1,rolling);
}
export class ShotClock{
 constructor(timeline){this.loop=true;this.override=null;this.setTimeline(timeline);}
 setTimeline(timeline){this.timeline=timeline;this.time=0;this.playing=timeline.duration>0;this.hold=0;this.preparing=.12;this.rate=.05;}
 toggle(){this.playing=!this.playing;if(this.time>=this.timeline.duration&&this.playing)this.replay();}
 replay(){this.time=0;this.hold=0;this.preparing=.08;this.playing=this.timeline.duration>0;}
 seek(t){this.time=clamp(t,0,this.timeline.duration);this.playing=false;this.hold=0;this.preparing=0;}
 step(direction){this.seek(this.time+direction*.001);}
 advance(dt){
  if(!this.playing)return;
  if(this.preparing>0){this.preparing=Math.max(0,this.preparing-dt);return;}
  if(this.time>=this.timeline.duration){if(this.loop){this.hold+=dt;if(this.hold>=1.25){this.time=0;this.hold=0;this.preparing=.15;}}else this.playing=false;return;}
  // Integrate the presentation clock in small real-time increments, even on a slow display.
  let left=Math.min(dt,.25);while(left>0){const h=Math.min(left,.005);this.rate=this.override??autoRate(this.time,this.timeline);this.time=Math.min(this.timeline.duration,this.time+h*this.rate);left-=h;}
 }
}
export function fitCamera(bounds,width,height){const {xmin,xmax,ymin,ymax}=bounds;return {x:(xmin+xmax)/2,y:(ymin+ymax)/2,scale:Math.min((width-80)/(xmax-xmin),(height-110)/(ymax-ymin))};}
export function blendCamera(a,b,t){return {x:mix(a.x,b.x,t),y:mix(a.y,b.y,t),scale:Math.exp(mix(Math.log(a.scale),Math.log(b.scale),t))};}
export function cameraTarget(t,tl,p,result,ball,width,height){
 let contact=fitCamera({xmin:-.135,xmax:.165,ymin:p.height-.18,ymax:p.height+.12},width,height);
 if(p.design){const pts=tl.samples.filter(s=>s.t<=tl.exitTime),g=result.L.geo,xs=[...pts.map(q=>q.x),g.wheel.x-g.wheel.r,g.wheel.x+g.wheel.r],ys=[...pts.map(q=>q.y),g.wheel.y-g.wheel.r,g.wheel.y+g.wheel.r];if(p.design==='differential'){xs.push(g.outer.x-g.outer.r,g.outer.x+g.outer.r);ys.push(g.outer.y-g.outer.r,g.outer.y+g.outer.r);}if(p.design==='catapult'){const R=Math.max(...g.camProfile.map(q=>Math.hypot(q.x,q.y)));xs.push(g.anchor.x,g.cam.x-R,g.cam.x+R);ys.push(g.anchor.y,g.cam.y-R,g.cam.y+R);}contact=fitCamera({xmin:Math.min(...xs)-.07,xmax:Math.max(...xs)+.07,ymin:Math.min(...ys)-.08,ymax:Math.max(...ys)+.08},width,height);}
 const cg=result.cellCorners,ys=cg.map(v=>v.y),xs=cg.map(v=>v.x);
 const wide=fitCamera({xmin:-.22,xmax:Math.max(p.distance+.6,ball.x+.22),ymin:-.05,ymax:Math.max(result.free.max+.15,...ys.map(y=>y+.15),p.height+.2)},width,height);
 const basket=fitCamera({xmin:Math.min(...xs,ball.x)-.11,xmax:Math.max(...xs,ball.x)+.11,ymin:Math.min(...ys,ball.y)-.1,ymax:Math.max(...ys,ball.y)+.13},width,height);
 if(t<=tl.exitTime)return contact;
 const out=blendCamera(contact,wide,smooth((t-tl.exitTime)/.17));
 const close=blendCamera(out,basket,smooth((t-(tl.basketTime-.05))/.16));
 if(tl.escapeTime===null&&tl.floorTime===null)return close;
 const start=tl.escapeTime??tl.floorTime??Infinity;
 const follow=fitCamera({xmin:ball.x-.48,xmax:ball.x+.48,ymin:Math.min(0,ball.y)-.08,ymax:Math.max(.52,ball.y+.24)},width,height);
 return blendCamera(close,follow,smooth((t-start-.1)/.35));
}
