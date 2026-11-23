import {wheelDepth} from './configuration.mjs';
// Provisional effective stiffness, not a measured Shore-A constitutive law.
export function contactCompliance(p,shore=p.durometer,outer=false){
 const radius=p[outer?'outerD':'wheelD']*.0254/2,depth=Number.isFinite(p.throatGap)?wheelDepth(p,outer)/1000:radius;
 const wheelK=(Number.isFinite(p.throatGap)?17500:60000)*Math.exp(((shore??50)-50)/22)*(Number.isFinite(p.throatGap)?radius/depth:1),ballK=p.stiffness;
 return {wheelK,ballK,depth,k:1/(1/ballK+1/wheelK)};
}
export function deformation(delta,c,r){
 delta=Math.max(0,delta);const maxWheel=.65*(c.depth??r),linearForce=c.k*delta;
 const wheel=Math.min(maxWheel,linearForce/c.wheelK),ball=delta-wheel;
 return {wheel,ball,force:wheel>=maxWheel?ball*c.ballK:linearForce,bottomed:linearForce/c.wheelK>maxWheel};
}
// Local flat contact patch; the rigid hub remains circular.
export function wheelOutline(w,ball,depth=0,count=96){
 const dx=(ball?.x??w.x)-w.x,dy=(ball?.y??w.y)-w.y,d=Math.hypot(dx,dy)||1,nx=dx/d,ny=dy/d,cap=w.r-Math.max(0,depth);
 return Array.from({length:count+1},(_,i)=>{const a=i/count*Math.PI*2,x=Math.cos(a)*w.r,y=Math.sin(a)*w.r,over=Math.max(0,x*nx+y*ny-cap);return {x:w.x+x-over*nx,y:w.y+y-over*ny};});
}

export function carriageDeflection(delta,c,r,preload,k,travel){
 if(deformation(delta,c,r).force<=preload)return 0;
 if(deformation(Math.max(0,delta-travel),c,r).force>=preload+k*travel)return travel;
 let lo=0,hi=Math.min(delta,travel);for(let i=0;i<25;i++){const x=(lo+hi)/2;if(deformation(delta-x,c,r).force>preload+k*x)lo=x;else hi=x;}return (lo+hi)/2;
}
