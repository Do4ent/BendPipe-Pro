const clone=(v)=>v==null?v:structuredClone(v);
const EPS=1e-12;
function makeId(prefix="assembly"){
  const uuid=globalThis.crypto?.randomUUID?.();
  return uuid?prefix+"-"+uuid:prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10);
}
function finite(value,name){
  const n=Number(value);if(!Number.isFinite(n))throw new TypeError(name+" must be finite");return n;
}
export function point3(value={x:0,y:0,z:0},name="point"){
  return Object.freeze({x:finite(value.x??0,name+".x"),y:finite(value.y??0,name+".y"),z:finite(value.z??0,name+".z")});
}
export function normalizeQuaternion(value={x:0,y:0,z:0,w:1}){
  const x=finite(value.x??0,"quaternion.x"),y=finite(value.y??0,"quaternion.y"),z=finite(value.z??0,"quaternion.z"),w=finite(value.w??1,"quaternion.w");
  const len=Math.hypot(x,y,z,w);if(!(len>EPS))throw new RangeError("quaternion must be non-zero");
  return Object.freeze({x:x/len,y:y/len,z:z/len,w:w/len});
}
export function conjugateQuaternion(value){
  const q=normalizeQuaternion(value);return Object.freeze({x:-q.x,y:-q.y,z:-q.z,w:q.w});
}
export function multiplyQuaternions(aValue,bValue){
  const a=normalizeQuaternion(aValue),b=normalizeQuaternion(bValue);
  return normalizeQuaternion({
    x:a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,
    y:a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,
    z:a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,
    w:a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z
  });
}
export function axisAngleQuaternion(axisValue,angleDeg){
  const axis=point3(axisValue,"axis"),len=Math.hypot(axis.x,axis.y,axis.z);
  if(!(len>EPS))throw new RangeError("rotation axis must be non-zero");
  const half=finite(angleDeg,"angle_deg")*Math.PI/360,s=Math.sin(half)/len;
  return normalizeQuaternion({x:axis.x*s,y:axis.y*s,z:axis.z*s,w:Math.cos(half)});
}
export function eulerQuaternion({x=0,y=0,z=0}={}){
  const rx=axisAngleQuaternion({x:1,y:0,z:0},x);
  const ry=axisAngleQuaternion({x:0,y:1,z:0},y);
  const rz=axisAngleQuaternion({x:0,y:0,z:1},z);
  return multiplyQuaternions(rz,multiplyQuaternions(ry,rx));
}
export function rotateVectorByQuaternion(vectorValue,qValue){
  const v=point3(vectorValue,"vector"),q=normalizeQuaternion(qValue);
  const p={x:v.x,y:v.y,z:v.z,w:0},qi=conjugateQuaternion(q);
  const a={
    x:q.w*p.x+q.x*p.w+q.y*p.z-q.z*p.y,
    y:q.w*p.y-q.x*p.z+q.y*p.w+q.z*p.x,
    z:q.w*p.z+q.x*p.y-q.y*p.x+q.z*p.w,
    w:q.w*p.w-q.x*p.x-q.y*p.y-q.z*p.z
  };
  const r={
    x:a.w*qi.x+a.x*qi.w+a.y*qi.z-a.z*qi.y,
    y:a.w*qi.y-a.x*qi.z+a.y*qi.w+a.z*qi.x,
    z:a.w*qi.z+a.x*qi.y-a.y*qi.x+a.z*qi.w
  };
  return Object.freeze(r);
}
export function worldToLocalPoint(frame,worldValue){
  const origin=point3(frame?.origin_mm??{},"frame.origin_mm"),world=point3(worldValue,"world");
  return rotateVectorByQuaternion(
    {x:world.x-origin.x,y:world.y-origin.y,z:world.z-origin.z},
    conjugateQuaternion(frame?.rotation_quaternion??{})
  );
}
export function localToWorldPoint(frame,localValue){
  const origin=point3(frame?.origin_mm??{},"frame.origin_mm"),rotated=rotateVectorByQuaternion(localValue,frame?.rotation_quaternion??{});
  return Object.freeze({x:origin.x+rotated.x,y:origin.y+rotated.y,z:origin.z+rotated.z});
}
export function worldToLocalQuaternion(frame,worldQuaternion){
  return multiplyQuaternions(conjugateQuaternion(frame?.rotation_quaternion??{}),worldQuaternion);
}
export function localToWorldQuaternion(frame,localQuaternion){
  return multiplyQuaternions(frame?.rotation_quaternion??{},localQuaternion);
}

export const ASSEMBLY_MEMBER_KINDS=Object.freeze(["tube","mesh-instance","construction","dimension","assembly"]);
export function normalizeAssemblyRef(input={}){
  const kind=String(input.kind??"").trim();
  if(!ASSEMBLY_MEMBER_KINDS.includes(kind))throw new RangeError("unsupported Assembly member kind");
  const id=String(input.id??input.tubeId??input.instanceId??input.assemblyId??"").trim();
  if(!id)throw new Error(kind+" member requires id");
  return Object.freeze({kind,id});
}
export function assemblyMemberKey(input){
  const ref=normalizeAssemblyRef(input);return ref.kind+":"+ref.id;
}
export function normalizeAssemblyMember(input={}){
  const ref=normalizeAssemblyRef(input.ref??input);
  const local=input.local??{};
  const position=local.position_mm==null?null:point3(local.position_mm,"member.local.position_mm");
  const rotation=local.rotation_quaternion==null?null:normalizeQuaternion(local.rotation_quaternion);
  const direction=local.direction==null?null:point3(local.direction,"member.local.direction");
  return Object.freeze({
    ref,
    local:Object.freeze({
      position_mm:position,
      rotation_quaternion:rotation,
      direction
    })
  });
}
export function normalizeAssemblyFrame(input={}){
  return Object.freeze({
    origin_mm:point3(input.origin_mm??input.origin??{},"assembly.origin_mm"),
    rotation_quaternion:normalizeQuaternion(input.rotation_quaternion??{})
  });
}
export function ensureAssemblyState(project){
  if(!project||typeof project!=="object")throw new TypeError("project is required");
  if(!Array.isArray(project.assemblies))project.assemblies=[];
  for(const assembly of project.assemblies){
    if(!assembly||typeof assembly!=="object")continue;
    assembly.id=String(assembly.id??makeId());
    assembly.kind="Assembly";
    assembly.name=String(assembly.name??"Assembly");
    assembly.frame={...normalizeAssemblyFrame(assembly.frame??{})};
    assembly.members=(assembly.members??[]).map(member=>({...normalizeAssemblyMember(member),ref:{...normalizeAssemblyMember(member).ref},local:{...normalizeAssemblyMember(member).local}}));
    assembly.fixed=assembly.fixed===true;
  }
  return project.assemblies;
}
export function assemblyById(project,id){
  return ensureAssemblyState(project).find(item=>String(item.id)===String(id))??null;
}
function directNestedIds(assembly){
  return (assembly?.members??[]).filter(member=>member.ref?.kind==="assembly").map(member=>String(member.ref.id));
}
export function assemblyDescendantIds(project,assemblyId){
  const result=[],visiting=new Set(),visited=new Set();
  const visit=(id)=>{
    if(visiting.has(id))throw new Error("Assembly cycle detected");
    if(visited.has(id))return;
    visiting.add(id);
    const assembly=assemblyById(project,id);
    if(!assembly){visiting.delete(id);return;}
    for(const child of directNestedIds(assembly)){result.push(child);visit(child);}
    visiting.delete(id);visited.add(id);
  };
  visit(String(assemblyId));
  return Object.freeze([...new Set(result)]);
}
export function wouldCreateAssemblyCycle(project,parentId,childId){
  const parent=String(parentId),child=String(childId);
  return parent===child||assemblyDescendantIds(project,child).includes(parent);
}
export function createAssembly(project,{id=null,name="Assembly",frame={},members=[],fixed=false}={}){
  ensureAssemblyState(project);
  const assembly={
    id:String(id??makeId()),
    kind:"Assembly",
    name:String(name??"Assembly").trim()||"Assembly",
    frame:{...normalizeAssemblyFrame(frame)},
    members:[],
    fixed:fixed===true
  };
  if(assemblyById(project,assembly.id))throw new Error("Assembly id already exists");
  project.assemblies.push(assembly);
  try{
    setAssemblyMembers(project,assembly.id,members);
    return assembly;
  }catch(error){
    project.assemblies=project.assemblies.filter(item=>String(item?.id)!==String(assembly.id));
    throw error;
  }
}
export function setAssemblyMembers(project,assemblyId,members=[]){
  const assembly=assemblyById(project,assemblyId);if(!assembly)throw new Error("Assembly not found");
  const map=new Map();
  for(const raw of members){
    const member=normalizeAssemblyMember(raw);
    if(member.ref.kind==="assembly"){
      if(!assemblyById(project,member.ref.id))throw new Error("Nested Assembly not found");
      if(wouldCreateAssemblyCycle(project,assembly.id,member.ref.id))throw new Error("Assembly nesting cycle is forbidden");
    }
    map.set(assemblyMemberKey(member.ref),{ref:{...member.ref},local:{...member.local}});
  }
  assembly.members=[...map.values()];
  return assembly;
}
export function addAssemblyMembers(project,assemblyId,members=[]){
  const assembly=assemblyById(project,assemblyId);if(!assembly)throw new Error("Assembly not found");
  return setAssemblyMembers(project,assemblyId,[...(assembly.members??[]),...members]);
}
export function removeAssemblyMembers(project,assemblyId,refs=[]){
  const assembly=assemblyById(project,assemblyId);if(!assembly)throw new Error("Assembly not found");
  const remove=new Set(refs.map(assemblyMemberKey));
  assembly.members=(assembly.members??[]).filter(member=>!remove.has(assemblyMemberKey(member.ref)));
  return assembly;
}
export function leafAssemblyMembers(project,assemblyId){
  const root=assemblyById(project,assemblyId);if(!root)throw new Error("Assembly not found");
  const result=new Map(),visiting=new Set();
  const visit=(id)=>{
    if(visiting.has(id))throw new Error("Assembly cycle detected");
    visiting.add(id);
    const assembly=assemblyById(project,id);if(!assembly)throw new Error("Nested Assembly not found");
    for(const member of assembly.members??[]){
      if(member.ref.kind==="assembly")visit(member.ref.id);
      else result.set(assemblyMemberKey(member.ref),{ref:{...member.ref},local:{...member.local}});
    }
    visiting.delete(id);
  };
  visit(root.id);return Object.freeze([...result.values()].map(member=>Object.freeze(member)));
}
export function renameAssembly(project,assemblyId,name){
  const assembly=assemblyById(project,assemblyId);if(!assembly)throw new Error("Assembly not found");
  const text=String(name??"").trim();if(!text)throw new Error("Assembly name is required");
  assembly.name=text;return assembly;
}
export function setAssemblyFixed(project,assemblyId,fixed){
  const assembly=assemblyById(project,assemblyId);if(!assembly)throw new Error("Assembly not found");
  assembly.fixed=fixed===true;return assembly;
}
export function setAssemblyFrame(project,assemblyId,frame){
  const assembly=assemblyById(project,assemblyId);if(!assembly)throw new Error("Assembly not found");
  assembly.frame={...normalizeAssemblyFrame(frame)};return assembly;
}
export function removeAssembly(project,assemblyId){
  const assembly=assemblyById(project,assemblyId);if(!assembly)return false;
  if((assembly.members??[]).length)throw new Error("Assembly with components must be dissolved, not deleted");
  project.assemblies=project.assemblies.filter(item=>String(item.id)!==String(assembly.id));
  for(const parent of project.assemblies){
    parent.members=(parent.members??[]).filter(member=>!(member.ref.kind==="assembly"&&String(member.ref.id)===String(assembly.id)));
  }
  return true;
}
export function dissolveAssembly(project,assemblyId){
  const assembly=assemblyById(project,assemblyId);if(!assembly)return false;
  const members=(assembly.members??[]).map(clone);
  for(const parent of ensureAssemblyState(project)){
    if(String(parent.id)===String(assembly.id))continue;
    const next=[];
    for(const member of parent.members??[]){
      if(member.ref.kind==="assembly"&&String(member.ref.id)===String(assembly.id))next.push(...members.map(clone));
      else next.push(member);
    }
    parent.members=[...new Map(next.map(member=>[assemblyMemberKey(member.ref),member])).values()];
  }
  project.assemblies=project.assemblies.filter(item=>String(item.id)!==String(assembly.id));
  return Object.freeze(members.map(Object.freeze));
}
