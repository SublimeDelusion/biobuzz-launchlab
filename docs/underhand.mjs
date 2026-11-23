// Underhand layout from the team's sketch: vertical feed, inside upper wheel,
// lower/right guide, increasing forward tangent (default 30 to 70 degrees).
// Short tangent lead/release sections complete the tire contact footprint.
export function underhandGeometry(p){
 const r=p.ballD*.0254/2,rw=p.wheelD*.0254/2,lever=p.dual===1?Math.sqrt(Math.max(0,r*r-(((p.gap??15)+16)/2000)**2)):r;
 const backLever=p.surface==='tape'||p.surface==='rails'?Array.from({length:9},(_,i)=>{const z=(p.surface==='tape'?p.stripSpacing:p.railSpacing)/2000+(p.surface==='tape'?p.stripWidth:p.railWidth)/1000*(i/8-.5);return Math.sqrt(Math.max(0,r*r-z*z));}).reduce((a,b)=>a+b,0)/9:r;
 const exit=p.angle*Math.PI/180,arcAngle=Math.max(0,Math.min(p.arc??40,p.angle)),arc=arcAngle*Math.PI/180,entry=exit-arc,R=Math.max(r+.005,p.hoodRadius/1000),arcLength=R*arc;
 const bend=u=>{const phi=entry+u/R;return {x:R*Math.sin(phi),y:-R*Math.cos(phi),phi};};
 const mid=bend(arcLength/2),distance=rw+lever-(p.throatInterference??p.compression)/1000;
 const rawWheel={x:mid.x-Math.sin(mid.phi)*distance,y:mid.y+Math.cos(mid.phi)*distance,r:rw,side:1,phi:mid.phi};
 const start=bend(0),end=bend(arcLength),reach=rw+lever;
 const extension=(q,direction)=>{const dx=q.x-rawWheel.x,dy=q.y-rawWheel.y,along=dx*Math.cos(q.phi)+dy*Math.sin(q.phi),perp=-dx*Math.sin(q.phi)+dy*Math.cos(q.phi);if(Math.abs(perp)>=reach)return 0;const edge=-direction*along+Math.sqrt(Math.max(0,reach*reach-perp*perp));return Math.max(0,edge)+.002;};
 const leadLength=extension(start,-1),tailLength=extension(end,1),length=leadLength+arcLength+tailLength;
 const release={x:end.x+Math.cos(exit)*tailLength,y:end.y+Math.sin(exit)*tailLength},shift={x:-release.x,y:p.height-release.y};
 const point=s=>{let q;if(s<leadLength){const d=s-leadLength;q={x:start.x+d*Math.cos(entry),y:start.y+d*Math.sin(entry),phi:entry};}else if(s<=leadLength+arcLength)q=bend(s-leadLength);else{const d=s-leadLength-arcLength;q={x:end.x+d*Math.cos(exit),y:end.y+d*Math.sin(exit),phi:exit};}return {...q,x:q.x+shift.x,y:q.y+shift.y};};
 const wheel={...rawWheel,x:rawWheel.x+shift.x,y:rawWheel.y+shift.y};
 return {r,rw,lever,backLever,pathRadius:R,length,leadLength,tailLength,arcLength,arcAngle,entryAngle:entry*180/Math.PI,exitAngle:p.angle,point,wheel,straight:false,underhand:true,valid:lever>0&&distance>0&&Number.isFinite(length),reason:distance<=0?'Gap closes past the wheel center; widen the gap.':null};
}
