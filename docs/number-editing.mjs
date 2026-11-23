// Text entry is a draft until focus leaves the number field. Range/select
// controls have no partial text state and can continue to apply on input.
export function installNumberEditing(root,{handles,commit,restore}){
 root.addEventListener('input',e=>{
  if(handles(e.target)&&e.target.type!=='number')commit(e.target);
 });
 root.addEventListener('focusout',e=>{
  if(handles(e.target)&&e.target.type==='number')commit(e.target);
 });
 root.addEventListener('keydown',e=>{
  const el=e.target;if(!handles(el)||el.type!=='number')return;
  if(e.key==='Enter'){e.preventDefault();el.blur();}
  if(e.key==='Escape'){e.preventDefault();restore(el);el.blur();}
 });
}
