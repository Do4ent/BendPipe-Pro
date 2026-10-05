const clone=(v)=>v==null?v:structuredClone(v);
function makeId(prefix="group"){
  const uuid=globalThis.crypto?.randomUUID?.();
  return uuid?prefix+"-"+uuid:prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10);
}
export const GROUP_MEMBER_KINDS=Object.freeze([
  "tube","mesh-instance","ref","dimension","construction","group","assembly","assembly-part"
]);
export function normalizeGroupMemberRef(input={}){
  const kind=String(input.kind??"").trim();
  if(!GROUP_MEMBER_KINDS.includes(kind))throw new RangeError("unsupported group member kind");
  if(kind==="ref"){
    const scene_id=String(input.scene_id??input.sceneId??"").trim();
    const node_id=String(input.node_id??input.nodeId??"").trim();
    if(!scene_id||!node_id)throw new Error("ref member requires scene_id and node_id");
    return Object.freeze({kind,scene_id,node_id});
  }
  if(kind==="assembly"||kind==="assembly-part"){
    const tube_id=String(input.tube_id??input.tubeId??"").trim();
    const assembly_id=String(input.assembly_id??input.assemblyId??input.partId??"").trim();
    if(!tube_id||!assembly_id)throw new Error(kind+" member requires tube_id and assembly_id");
    return Object.freeze({kind,tube_id,assembly_id});
  }
  const id=String(input.id??input.group_id??input.groupId??input.tubeId??input.instanceId??"").trim();
  if(!id)throw new Error(kind+" member requires id");
  return Object.freeze({kind,id});
}
export function groupMemberKey(input){
  const ref=normalizeGroupMemberRef(input);
  if(ref.kind==="ref")return "ref:"+ref.scene_id+"|"+ref.node_id;
  if(ref.kind==="assembly"||ref.kind==="assembly-part")return ref.kind+":"+ref.tube_id+"|"+ref.assembly_id;
  return ref.kind+":"+ref.id;
}
export function ensureGroupState(project){
  if(!project||typeof project!=="object")throw new TypeError("project is required");
  if(!Array.isArray(project.groups))project.groups=[];
  for(const group of project.groups){
    if(!group||typeof group!=="object")continue;
    group.id=String(group.id??makeId());
    group.kind="LogicalGroup";
    group.name=String(group.name??"Group");
    group.members=[...new Map((group.members??[]).map(ref=>{
      const normalized=normalizeGroupMemberRef(ref);
      return [groupMemberKey(normalized),{...normalized}];
    })).values()];
    group.visible=group.visible!==false;
    if(group.lock_state?.mode!=="Object"&&group.lock_state?.mode!=="Position")delete group.lock_state;
  }
  return project.groups;
}
export function groupById(project,id){
  return ensureGroupState(project).find(group=>String(group.id)===String(id))??null;
}
function directChildGroupIds(group){
  return (group?.members??[]).filter(ref=>ref.kind==="group").map(ref=>String(ref.id));
}
export function groupDescendantIds(project,groupId){
  const result=[],visiting=new Set(),visited=new Set();
  const walk=(id)=>{
    if(visiting.has(id))throw new Error("Group cycle detected");
    if(visited.has(id))return;
    visiting.add(id);
    const group=groupById(project,id);
    if(!group){visiting.delete(id);return;}
    for(const child of directChildGroupIds(group)){
      result.push(child);walk(child);
    }
    visiting.delete(id);visited.add(id);
  };
  walk(String(groupId));
  return Object.freeze([...new Set(result)]);
}
export function wouldCreateGroupCycle(project,parentGroupId,childGroupId){
  const parent=String(parentGroupId),child=String(childGroupId);
  if(parent===child)return true;
  return groupDescendantIds(project,child).includes(parent);
}
export function createGroup(project,{id=null,name="Group",members=[],visible=true}={}){
  ensureGroupState(project);
  const group={
    id:String(id??makeId()),
    kind:"LogicalGroup",
    name:String(name??"Group").trim()||"Group",
    members:[],
    visible:visible!==false
  };
  if(groupById(project,group.id))throw new Error("Group id already exists");
  project.groups.push(group);
  addGroupMembers(project,group.id,members);
  return group;
}
export function addGroupMembers(project,groupId,members=[]){
  const group=groupById(project,groupId);if(!group)throw new Error("Group not found");
  const current=new Map((group.members??[]).map(ref=>[groupMemberKey(ref),ref]));
  for(const raw of members){
    const ref=normalizeGroupMemberRef(raw);
    if(ref.kind==="group"){
      if(!groupById(project,ref.id))throw new Error("Nested group not found");
      if(wouldCreateGroupCycle(project,group.id,ref.id))throw new Error("Group nesting cycle is forbidden");
    }
    current.set(groupMemberKey(ref),{...ref});
  }
  group.members=[...current.values()];
  return group;
}
export function removeGroupMembers(project,groupId,members=[]){
  const group=groupById(project,groupId);if(!group)throw new Error("Group not found");
  const remove=new Set(members.map(groupMemberKey));
  group.members=(group.members??[]).filter(ref=>!remove.has(groupMemberKey(ref)));
  return group;
}
export function leafGroupMembers(project,groupId){
  const group=groupById(project,groupId);if(!group)throw new Error("Group not found");
  const result=new Map(),visiting=new Set();
  const walk=(id)=>{
    if(visiting.has(id))throw new Error("Group cycle detected");
    visiting.add(id);
    const current=groupById(project,id);
    if(!current)throw new Error("Nested group not found: "+id);
    for(const ref of current.members??[]){
      if(ref.kind==="group")walk(ref.id);
      else result.set(groupMemberKey(ref),{...ref});
    }
    visiting.delete(id);
  };
  walk(group.id);
  return Object.freeze([...result.values()].map(Object.freeze));
}
export function groupsContainingMember(project,member,{includeAncestors=true}={}){
  const key=groupMemberKey(member),direct=[];
  for(const group of ensureGroupState(project)){
    if((group.members??[]).some(ref=>groupMemberKey(ref)===key))direct.push(group);
  }
  if(!includeAncestors)return Object.freeze(direct);
  const result=new Map(direct.map(group=>[String(group.id),group]));
  let changed=true;
  while(changed){
    changed=false;
    for(const group of ensureGroupState(project)){
      for(const ref of group.members??[]){
        if(ref.kind==="group"&&result.has(String(ref.id))&&!result.has(String(group.id))){
          result.set(String(group.id),group);changed=true;
        }
      }
    }
  }
  return Object.freeze([...result.values()]);
}
export function renameGroup(project,groupId,name){
  const group=groupById(project,groupId);if(!group)throw new Error("Group not found");
  const next=String(name??"").trim();if(!next)throw new Error("Group name is required");
  group.name=next;return group;
}
export function setGroupVisibility(project,groupId,visible){
  const group=groupById(project,groupId);if(!group)throw new Error("Group not found");
  group.visible=visible!==false;return group;
}
export function setGroupLock(project,groupId,mode="Unlocked"){
  const group=groupById(project,groupId);if(!group)throw new Error("Group not found");
  const value=String(mode);
  if(value==="Unlocked")delete group.lock_state;
  else if(value==="Object"||value==="Position")group.lock_state={mode:value};
  else throw new RangeError("Group lock mode must be Unlocked, Position or Object");
  return group;
}
export function ungroup(project,groupId){
  ensureGroupState(project);
  const group=groupById(project,groupId);if(!group)return false;
  const members=(group.members??[]).map(ref=>({...ref}));
  for(const parent of project.groups){
    if(String(parent.id)===String(group.id))continue;
    const next=[];
    for(const ref of parent.members??[]){
      if(ref.kind==="group"&&String(ref.id)===String(group.id))next.push(...members.map(clone));
      else next.push(ref);
    }
    parent.members=[...new Map(next.map(ref=>[groupMemberKey(ref),ref])).values()];
  }
  project.groups=project.groups.filter(item=>String(item.id)!==String(group.id));
  return Object.freeze(members.map(Object.freeze));
}
