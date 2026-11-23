import test from 'node:test';import assert from 'node:assert/strict';
import {installNumberEditing} from '../docs/number-editing.mjs';
function editor(){
 const handlers={},root={addEventListener:(type,fn)=>handlers[type]=fn};let applied=67,commits=0;
 const emit=(type,target,key)=>handlers[type]?.({target,key,preventDefault(){this.prevented=true;}});
 const el={type:'number',dataset:{setting:'throatGap'},value:'67',blur(){emit('focusout',this);}};
 installNumberEditing(root,{handles:input=>!!input.dataset?.setting,commit:input=>{commits++;if(input.value==='')input.value=String(applied);else applied=Number(input.value);},restore:input=>input.value=String(applied)});
 return {el,emit,get applied(){return applied;},get commits(){return commits;}};
}
test('deleting a digit, clearing a field and completing a replacement never apply partial numbers',()=>{
 const e=editor();for(const text of ['6','','6','65']){e.el.value=text;e.emit('input',e.el);assert.equal(e.applied,67);assert.equal(e.commits,0);assert.equal(e.el.value,text);}
 e.el.blur();assert.equal(e.applied,65);assert.equal(e.commits,1);
});
test('Enter commits a finished number and Escape restores the last applied value',()=>{
 const e=editor();e.el.value='65';e.emit('keydown',e.el,'Enter');assert.equal(e.applied,65);assert.equal(e.commits,1);
 e.el.value='6';e.emit('input',e.el);e.emit('keydown',e.el,'Escape');assert.equal(e.applied,65);assert.equal(e.el.value,'65');
 e.el.value='';e.el.blur();assert.equal(e.applied,65);assert.equal(e.el.value,'65');
});
test('sliders and selects stay live while unrelated form fields keep normal behavior',()=>{
 const e=editor();e.emit('input',{type:'range',dataset:{setting:'throatGap'},value:'64'});assert.equal(e.applied,64);
 e.emit('input',{type:'select-one',dataset:{setting:'durometer'},value:'35'});assert.equal(e.applied,35);
 e.emit('input',{type:'number',dataset:{},value:'1'});e.emit('focusout',{type:'number',dataset:{},value:'1'});assert.equal(e.applied,35);assert.equal(e.commits,2);
});
