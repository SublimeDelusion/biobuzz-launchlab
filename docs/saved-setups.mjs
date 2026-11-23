export const MAX_COMPARISONS=3;
const copy=x=>JSON.parse(JSON.stringify(x));
export function reconcileSetups(state){
 const used=new Set();state.setups=(state.setups??[]).filter(q=>q?.params&&typeof q.params==='object').map((q,i)=>{const base=typeof q.id==='string'&&q.id?q.id:`saved-${i+1}`;let id=base,n=2;while(used.has(id))id=`${base}-${n++}`;used.add(id);return {...q,id};});
 if(state.reference?.params){const reference=state.reference,match=state.setups.find(q=>q.id===reference.id)||state.setups.find(q=>q.name===reference.name&&JSON.stringify(q.params)===JSON.stringify(reference.params));if(match)state.reference={...reference,id:match.id};}
 const baseline=state.reference?.id;state.comparisonIds=[...new Set(Array.isArray(state.comparisonIds)?state.comparisonIds:[])].filter(id=>used.has(id)&&id!==baseline).slice(0,MAX_COMPARISONS);
 return state;
}
export function comparisonColumns(state,current,teamDefault){reconcileSetups(state);return [{name:state.reference?.name??'Team default',role:'Baseline',params:state.reference?.params??teamDefault},{name:'Current',role:'Current',params:current},...state.comparisonIds.map(id=>({...state.setups.find(q=>q.id===id),role:'Saved'}))];}
export function selectComparison(state,id,checked){reconcileSetups(state);if(!state.setups.some(q=>q.id===id)||state.reference?.id===id)return false;const ids=state.comparisonIds;if(!checked){state.comparisonIds=ids.filter(q=>q!==id);return true;}if(ids.includes(id))return true;if(ids.length>=MAX_COMPARISONS)return false;ids.push(id);return true;}
export function chooseBaseline(state,id){reconcileSetups(state);if(id===null){state.reference=null;return true;}const setup=state.setups.find(q=>q.id===id);if(!setup)return false;state.reference=copy(setup);state.comparisonIds=state.comparisonIds.filter(q=>q!==id);return true;}
export function sameConfiguration(a,b,keys){return keys.every(k=>JSON.stringify(a[k])===JSON.stringify(b[k]));}
