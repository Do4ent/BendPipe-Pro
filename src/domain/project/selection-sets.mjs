const clone=v=>v==null?v:structuredClone(v);
export const SELECTION_SET_MEMBER_KINDS=Object.freeze([
  "tube","row","mesh-instance","ref","group","project-assembly","dimension","construction"
]);
function makeId(){
  const uuid=globalThis.crypto?.randomUUID?.();
  return uuid?"selection-set-"+uuid:"selection-set-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
}
export function normalizeSelectionRef(input={}){
  const kind=String(input.kind??"").trim();
  if(!SELECTION_SET_MEMBER_KINDS.includes(kind))throw new RangeError("unsupported Selection Set member kind");
  if(kind==="ref"){
    const scene_id=String(input.scene_id??input.sceneId??"").trim(),node_id=String(input.node_id??input.nodeId??"").trim();
    if(!scene_id||!node_id)throw new Error("reference member requires scene_id and node_id");
    return Object.freeze({kind,scene_id,node_id});
  }
  if(kind==="row"){
    const tube_id=String(input.tube_id??input.tubeId??"").trim(),row_index=Number(input.row_index??input.rowIndex);
    if(!tube_id||!Number.isInteger(row_index)||row_index<0)throw new Error("row member requires tube_id and row_index");
    return Object.freeze({kind,tube_id,row_index});
  }
  const id=String(input.id??input.tubeId??input.instanceId??input.groupId??input.assemblyId??input.dimensionId??input.constructionId??"").trim();
  if(!id)throw new Error(kind+" member requires id");
  return Object.freeze({kind,id});
}
export function selectionRefKey(input){
  const ref=normalizeSelectionRef(input);
  if(ref.kind==="ref")return "ref:"+ref.scene_id+"|"+ref.node_id;
  if(ref.kind==="row")return "row:"+ref.tube_id+"|"+ref.row_index;
  return ref.kind+":"+ref.id;
}
export function ensureSelectionSetState(project){
  if(!project||typeof project!=="object")throw new TypeError("project is required");
  if(!Array.isArray(project.selection_sets))project.selection_sets=[];
  for(const set of project.selection_sets){
    if(!set||typeof set!=="object")continue;
    set.id=String(set.id??makeId());
    set.kind="StaticSelectionSet";
    set.name=String(set.name??"Selection Set").trim()||"Selection Set";
    const map=new Map();
    for(const raw of set.members??[]){
      try{const ref=normalizeSelectionRef(raw);map.set(selectionRefKey(ref),{...ref});}catch{}
    }
    set.members=[...map.values()];
  }
  return project.selection_sets;
}
export function selectionSetById(project,id){
  return ensureSelectionSetState(project).find(set=>String(set.id)===String(id))??null;
}
export function createSelectionSet(project,{id=null,name="Selection Set",members=[]}={}){
  ensureSelectionSetState(project);
  const set={id:String(id??makeId()),kind:"StaticSelectionSet",name:String(name??"").trim()||"Selection Set",members:[]};
  if(selectionSetById(project,set.id))throw new Error("Selection Set id already exists");
  if(project.selection_sets.some(item=>String(item.name).toLowerCase()===set.name.toLowerCase()))throw new Error("Selection Set name already exists");
  project.selection_sets.push(set);
  addSelectionSetMembers(project,set.id,members);
  return set;
}
export function renameSelectionSet(project,setId,name){
  const set=selectionSetById(project,setId);if(!set)throw new Error("Selection Set not found");
  const next=String(name??"").trim();if(!next)throw new Error("Selection Set name is required");
  if(ensureSelectionSetState(project).some(item=>String(item.id)!==String(set.id)&&String(item.name).toLowerCase()===next.toLowerCase()))throw new Error("Selection Set name already exists");
  set.name=next;return set;
}
export function addSelectionSetMembers(project,setId,members=[]){
  const set=selectionSetById(project,setId);if(!set)throw new Error("Selection Set not found");
  const map=new Map((set.members??[]).map(ref=>[selectionRefKey(ref),ref]));
  for(const raw of members){
    const ref=normalizeSelectionRef(raw);map.set(selectionRefKey(ref),{...ref});
  }
  set.members=[...map.values()];return set;
}
export function removeSelectionSetMembers(project,setId,members=[]){
  const set=selectionSetById(project,setId);if(!set)throw new Error("Selection Set not found");
  const remove=new Set((members??[]).map(selectionRefKey));
  set.members=(set.members??[]).filter(ref=>!remove.has(selectionRefKey(ref)));
  return set;
}
export function deleteSelectionSet(project,setId){
  ensureSelectionSetState(project);
  const before=project.selection_sets.length;
  project.selection_sets=project.selection_sets.filter(set=>String(set.id)!==String(setId));
  return project.selection_sets.length!==before;
}
export function pruneSelectionSetMembers(project,exists){
  ensureSelectionSetState(project);
  if(typeof exists!=="function")throw new TypeError("exists predicate is required");
  const removed=[];
  for(const set of project.selection_sets){
    const keep=[];
    for(const ref of set.members??[]){
      if(exists(ref))keep.push(ref);
      else removed.push(Object.freeze({set_id:String(set.id),set_name:String(set.name),ref:Object.freeze({...ref})}));
    }
    set.members=keep;
  }
  return Object.freeze(removed);
}
export function setsContainingRef(project,member){
  const key=selectionRefKey(member);
  return Object.freeze(ensureSelectionSetState(project).filter(set=>(set.members??[]).some(ref=>selectionRefKey(ref)===key)));
}
