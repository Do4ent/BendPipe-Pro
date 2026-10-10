const clone=v=>v==null?v:structuredClone(v);
const idsOf=values=>new Set((values??[]).map(String).filter(Boolean));
const same=(a,b)=>String(a??"")===String(b??"");

function record(base){
  return Object.freeze({
    id:[
      base.relation,base.dependent_type,base.dependent_id,
      base.target_id,base.slot??base.index??""
    ].map(v=>String(v??"")).join("|"),
    ...base
  });
}
export function analyzeDeletionDependencies(project,targetIds=[]){
  if(!project||typeof project!=="object")throw new TypeError("project is required");
  const targets=idsOf(targetIds),out=[];
  if(!targets.size)return Object.freeze({target_ids:Object.freeze([]),dependencies:Object.freeze([]),has_dependencies:false});

  for(const tube of project.tubes??[]){
    if(!tube?.id||targets.has(String(tube.id)))continue;
    for(const [portName,port] of Object.entries(tube?.engineering?.ports??{})){
      for(const field of ["ownerObjectId","externalRefId"]){
        const target=String(port?.[field]??"");
        if(targets.has(target))out.push(record({
          relation:"TubePort",dependent_type:"tube",dependent_id:String(tube.id),
          target_id:target,port_name:portName,field,can_detach:true,can_reassign:true,can_cascade:true
        }));
      }
    }
  }

  for(const collection of ["engineering_dimensions","dimensions"]){
    for(const item of project[collection]??[]){
      if(!item?.id)continue;
      (item.references??[]).forEach((ref,index)=>{
        const target=String(ref?.object_id??"");
        if(targets.has(target))out.push(record({
          relation:"DimensionReference",dependent_type:"dimension",dependent_id:String(item.id),
          target_id:target,collection,index,can_detach:true,can_reassign:true,can_cascade:true
        }));
      });
    }
  }

  for(const item of project.geometric_constraints??[]){
    if(!item?.id)continue;
    (item.references??[]).forEach((ref,index)=>{
      const target=String(ref?.object_id??"");
      if(targets.has(target))out.push(record({
        relation:"ConstraintReference",dependent_type:"constraint",dependent_id:String(item.id),
        target_id:target,collection:"geometric_constraints",index,can_detach:true,can_reassign:true,can_cascade:true
      }));
    });
  }

  for(const group of project.groups??[]){
    (group?.members??[]).forEach((member,index)=>{
      const target=member?.kind==="tube"||member?.kind==="mesh-instance"||member?.kind==="dimension"||member?.kind==="construction"
        ?String(member.id??"")
        :String(member?.tube_id??"");
      if(targets.has(target))out.push(record({
        relation:"GroupMember",dependent_type:"group",dependent_id:String(group.id??""),
        target_id:target,index,can_detach:true,can_reassign:true,can_cascade:false
      }));
    });
  }

  for(const assembly of project.assemblies??[]){
    (assembly?.members??[]).forEach((member,index)=>{
      const ref=member?.ref??member;
      const target=["tube","mesh-instance","dimension","construction"].includes(String(ref?.kind))
        ?String(ref?.id??"")
        :String(ref?.tube_id??"");
      if(targets.has(target))out.push(record({
        relation:"AssemblyMember",dependent_type:"assembly",dependent_id:String(assembly.id??""),
        target_id:target,index,can_detach:true,can_reassign:true,can_cascade:false
      }));
    });
  }

  for(const def of project.associative_arrays??[]){
    (def?.source_tube_ids??[]).forEach((id,index)=>{
      const target=String(id??"");
      if(targets.has(target))out.push(record({
        relation:"ArraySource",dependent_type:"associative-array",dependent_id:String(def.id??""),
        target_id:target,index,can_detach:true,can_reassign:true,can_cascade:true
      }));
    });
  }
  for(const def of project.associative_mirrors??[]){
    const target=String(def?.source_tube_id??"");
    if(targets.has(target))out.push(record({
      relation:"MirrorSource",dependent_type:"associative-mirror",dependent_id:String(def.id??""),
      target_id:target,can_detach:true,can_reassign:true,can_cascade:true
    }));
  }
  for(const def of project.associative_transform_stacks??[]){
    const target=String(def?.object_id??"");
    if(targets.has(target))out.push(record({
      relation:"TransformStackObject",dependent_type:"transform-stack",dependent_id:String(def.id??""),
      target_id:target,can_detach:true,can_reassign:true,can_cascade:true
    }));
  }

  return Object.freeze({
    target_ids:Object.freeze([...targets]),
    dependencies:Object.freeze(out),
    has_dependencies:out.length>0
  });
}
function findById(list,id){return (list??[]).find(item=>same(item?.id,id))??null;}
function replacementFor(dep,map){
  const value=map instanceof Map?map.get(String(dep.target_id)):map?.[String(dep.target_id)];
  const id=String(value??"").trim();
  if(!id){
    const error=new Error("Для переназначения каждой внешней ссылки необходимо выбрать новый объект");
    error.code="DELETE_REASSIGN_TARGET_REQUIRED";throw error;
  }
  return id;
}
function removeAt(list,index){
  if(Array.isArray(list)&&Number.isInteger(index)&&index>=0&&index<list.length)list.splice(index,1);
}
function detachDependency(project,dep){
  if(dep.relation==="TubePort"){
    const tube=findById(project.tubes,dep.dependent_id),port=tube?.engineering?.ports?.[dep.port_name];
    if(port){port[dep.field]="";if(dep.port_name==="P2")port.locked=false;}
    return;
  }
  if(dep.relation==="DimensionReference"){
    const item=findById(project[dep.collection],dep.dependent_id);
    if(item){item.references=(item.references??[]).filter(ref=>!same(ref?.object_id,dep.target_id));item.dependency_status="Detached";}
    return;
  }
  if(dep.relation==="ConstraintReference"){
    const item=findById(project.geometric_constraints,dep.dependent_id);
    if(item){item.references=(item.references??[]).filter(ref=>!same(ref?.object_id,dep.target_id));item.enabled=false;item.status="DetachedDependency";}
    return;
  }
  if(dep.relation==="GroupMember"){
    const item=findById(project.groups,dep.dependent_id);
    if(item)item.members=(item.members??[]).filter(member=>{
      const target=member?.kind==="tube"||member?.kind==="mesh-instance"||member?.kind==="dimension"||member?.kind==="construction"?member.id:member?.tube_id;
      return !same(target,dep.target_id);
    });
    return;
  }
  if(dep.relation==="AssemblyMember"){
    const item=findById(project.assemblies,dep.dependent_id);
    if(item)item.members=(item.members??[]).filter(member=>{
      const ref=member?.ref??member;
      const target=["tube","mesh-instance","dimension","construction"].includes(String(ref?.kind))?ref?.id:ref?.tube_id;
      return !same(target,dep.target_id);
    });
    return;
  }
  if(dep.relation==="ArraySource"){
    const item=findById(project.associative_arrays,dep.dependent_id);
    if(item){item.source_tube_ids=(item.source_tube_ids??[]).filter(id=>!same(id,dep.target_id));item.status="LostSource";}
    return;
  }
  if(dep.relation==="MirrorSource"){
    const item=findById(project.associative_mirrors,dep.dependent_id);
    if(item){item.source_tube_id="";item.status="LostSource";}
    return;
  }
  if(dep.relation==="TransformStackObject"){
    const item=findById(project.associative_transform_stacks,dep.dependent_id);
    if(item){item.object_id="";item.state="LostSource";}
  }
}
function reassignDependency(project,dep,replacement){
  if(dep.relation==="TubePort"){
    const tube=findById(project.tubes,dep.dependent_id),port=tube?.engineering?.ports?.[dep.port_name];
    if(port)port[dep.field]=replacement;
    return;
  }
  if(dep.relation==="DimensionReference"||dep.relation==="ConstraintReference"){
    const collection=dep.relation==="DimensionReference"?dep.collection:"geometric_constraints";
    const item=findById(project[collection],dep.dependent_id);
    for(const ref of item?.references??[])if(same(ref?.object_id,dep.target_id))ref.object_id=replacement;
    if(dep.relation==="ConstraintReference"&&item){item.status="NeedsSolve";item.enabled=true;}
    return;
  }
  if(dep.relation==="GroupMember"){
    const item=findById(project.groups,dep.dependent_id);
    for(const member of item?.members??[]){
      const target=member?.kind==="tube"||member?.kind==="mesh-instance"||member?.kind==="dimension"||member?.kind==="construction"?member.id:member?.tube_id;
      if(same(target,dep.target_id)){if("id" in member)member.id=replacement;else member.tube_id=replacement;}
    }
    return;
  }
  if(dep.relation==="AssemblyMember"){
    const item=findById(project.assemblies,dep.dependent_id);
    for(const member of item?.members??[]){
      const ref=member?.ref??member;
      const target=["tube","mesh-instance","dimension","construction"].includes(String(ref?.kind))?ref?.id:ref?.tube_id;
      if(same(target,dep.target_id)){if("id" in ref)ref.id=replacement;else ref.tube_id=replacement;}
    }
    return;
  }
  if(dep.relation==="ArraySource"){
    const item=findById(project.associative_arrays,dep.dependent_id);
    if(item){item.source_tube_ids=(item.source_tube_ids??[]).map(id=>same(id,dep.target_id)?replacement:id);item.status="NeedsSync";}
    return;
  }
  if(dep.relation==="MirrorSource"){
    const item=findById(project.associative_mirrors,dep.dependent_id);
    if(item){item.source_tube_id=replacement;item.status="NeedsSync";}
    return;
  }
  if(dep.relation==="TransformStackObject"){
    const item=findById(project.associative_transform_stacks,dep.dependent_id);
    if(item){item.object_id=replacement;item.state="NeedsSync";}
  }
}
function cascadeDependencies(project,dependencies,targetIds){
  const targets=idsOf(targetIds);
  const deleteTubes=new Set(),deleteDims=new Map(),deleteConstraints=new Set(),deleteArrays=new Set(),deleteMirrors=new Set(),deleteStacks=new Set();
  for(const dep of dependencies){
    if(dep.relation==="TubePort"&&!targets.has(String(dep.dependent_id)))deleteTubes.add(String(dep.dependent_id));
    else if(dep.relation==="DimensionReference"){
      const set=deleteDims.get(dep.collection)??new Set();set.add(String(dep.dependent_id));deleteDims.set(dep.collection,set);
    }else if(dep.relation==="ConstraintReference")deleteConstraints.add(String(dep.dependent_id));
    else if(dep.relation==="ArraySource")deleteArrays.add(String(dep.dependent_id));
    else if(dep.relation==="MirrorSource")deleteMirrors.add(String(dep.dependent_id));
    else if(dep.relation==="TransformStackObject")deleteStacks.add(String(dep.dependent_id));
    else detachDependency(project,dep);
  }
  if(deleteTubes.size)project.tubes=(project.tubes??[]).filter(item=>!deleteTubes.has(String(item?.id)));
  for(const [collection,set] of deleteDims)project[collection]=(project[collection]??[]).filter(item=>!set.has(String(item?.id)));
  if(deleteConstraints.size)project.geometric_constraints=(project.geometric_constraints??[]).filter(item=>!deleteConstraints.has(String(item?.id)));
  if(deleteArrays.size)project.associative_arrays=(project.associative_arrays??[]).filter(item=>!deleteArrays.has(String(item?.id)));
  if(deleteMirrors.size)project.associative_mirrors=(project.associative_mirrors??[]).filter(item=>!deleteMirrors.has(String(item?.id)));
  if(deleteStacks.size)project.associative_transform_stacks=(project.associative_transform_stacks??[]).filter(item=>!deleteStacks.has(String(item?.id)));
  return Object.freeze({
    deleted_dependent_tube_ids:Object.freeze([...deleteTubes]),
    deleted_constraint_ids:Object.freeze([...deleteConstraints])
  });
}
export function applyDeletionDependencyStrategy(project,analysis,{
  strategy="Cancel",
  replacement_by_target={}
}={}){
  if(!project||typeof project!=="object")throw new TypeError("project is required");
  const deps=analysis?.dependencies??[];
  if(!deps.length)return Object.freeze({ok:true,strategy:"None",changed:false});
  const mode=String(strategy);
  if(mode==="Cancel")return Object.freeze({ok:false,strategy:"Cancel",changed:false});
  if(mode==="Detach"){
    for(const dep of deps)detachDependency(project,dep);
    return Object.freeze({ok:true,strategy:mode,changed:true});
  }
  if(mode==="Reassign"){
    for(const dep of deps)reassignDependency(project,dep,replacementFor(dep,replacement_by_target));
    return Object.freeze({ok:true,strategy:mode,changed:true});
  }
  if(mode==="Cascade"){
    const result=cascadeDependencies(project,deps,analysis?.target_ids??[]);
    return Object.freeze({ok:true,strategy:mode,changed:true,...result});
  }
  throw new RangeError("Delete dependency strategy must be Cancel, Detach, Reassign or Cascade");
}
export function dependencySummary(analysis){
  const byRelation={};
  for(const dep of analysis?.dependencies??[])byRelation[dep.relation]=(byRelation[dep.relation]??0)+1;
  return Object.freeze({
    count:analysis?.dependencies?.length??0,
    by_relation:Object.freeze(byRelation)
  });
}
