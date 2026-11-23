// Screen coordinates have downward y: negative physical spin is clockwise.
// No angular speed multiplier: this marker consumes integrated physical theta.
export function spinLabel(w){return `${w<0?'↻ FORWARD':w>0?'↺ BACKSPIN':'NO SPIN'} · ${Math.round(Math.abs(w)*30/Math.PI)} RPM`;}
export function drawSpinMarker(c,rad,theta,radial=0){
 c.save();c.rotate(radial-theta);
 c.beginPath();c.moveTo(0,0);c.arc(0,0,rad*.92,0,Math.PI*.68);c.closePath();c.fillStyle='#17483f';c.fill();
 c.beginPath();c.moveTo(-rad*.76,0);c.lineTo(rad*.92,0);c.strokeStyle='#fff8cf';c.lineWidth=Math.max(2,rad*.10);c.stroke();
 c.beginPath();c.arc(rad*.72,0,Math.max(2,rad*.16),0,Math.PI*2);c.fillStyle='#142b29';c.fill();c.strokeStyle='#fff8cf';c.lineWidth=Math.max(1,rad*.035);c.stroke();c.restore();
}
