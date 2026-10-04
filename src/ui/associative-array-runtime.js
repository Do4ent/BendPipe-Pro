(()=>{
  const TRANSFORM_URL="__TB_TRANSFORM_COMMANDS_MODULE_URL__";
  const RIGID_URL="__TB_RIGID_TRANSFORM_MODULE_URL__";
  let transforms=null,rigid=null,installed=false,syncing=false;
  const api=()=>window.TubeBenderEngineering??null;
  const project=()=>{try{return api()?.activeProject?.()??null;}catch{return null;}};
  const clone=(v)=>v==null?v:structuredClone(v);
  function makeId(prefix){
    const uuid=globalThis.crypto?.randomUUID?.();
    return uuid?prefix+"-"+uuid:prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
  }
  function point(v){
    const x=Number(v?.x??0),y=Number(v?.y??0),z=Number(v?.z??0);
    if(![x,y,z].every(Number.isFinite))throw new TypeError("array anchor point must be finite");
    return {x,y,z};
  }
  function sub(a,b){return {x:a.x-b.x,y:a.y-b.y,z:a.z-b.z};}
  function byId(p,id){return (p?.tubes??[]).find((t)=>String(t?.id)===String(id))??null;}
  function definitions(p=project()){
    if(!p)return [];
    if(!Array.isArray(p.associative_arrays))p.associative_arrays=[];
    return p.associative_arrays;
  }
  function sourceIds(def){return [...new Set((def?.source_tube_ids??[]).map(String).filter(Boolean))];}
  function memberKey(arrayId,sourceId,index){return String(arrayId)+"|"+String(sourceId)+"|"+String(index);}
  function existingMemberMap(p,arrayId){
    const map=new Map();
    for(const tube of p?.tubes??[]){
      const m=tube?.array_member;
      if(String(m?.array_id??"")!==String(arrayId))continue;
      map.set(memberKey(arrayId,m.source_tube_id,m.member_index),tube);
    }
    return map;
  }
  function detachDerivedLinks(tube){
    const copy=clone(tube);
    delete copy.array_member;
    delete copy.sourceGeometryId;
    delete copy.editableGeometryId;
    delete copy.source_geometry_id;
    delete copy.editable_geometry_id;
    if(copy.engineering?.ports){
      for(const port of Object.values(copy.engineering.ports)){
        if(port&&typeof port==="object"){
          port.externalRefId="";
          port.ownerObjectId="";
        }
      }
    }
    if(copy.importEvidence?.spatialPlacement){
      copy.importEvidence.spatialPlacement.user_origin_override=true;
      copy.importEvidence.spatialPlacement.array_derived=true;
    }
    return copy;
  }
  function transformForLinearOrMatrix(source,matrix){
    const origin=point(source.origin);
    const next=transforms.transformPoint(matrix,origin);
    return rigid.translateLegacyTubeRigid(source,sub(next,origin));
  }
  function circularAngle(def,index){
    const count=Math.trunc(Number(def.parameters?.count)||0);
    const total=Number(def.parameters?.total_angle_deg??360);
    if(!(count>=1)||!Number.isFinite(total))throw new Error("Invalid circular array parameters");
    if(index===0)return 0;
    const full=Math.abs(Math.abs(total)-360)<1e-9;
    const step=count<=1?0:total/(full?count:count-1);
    return step*index;
  }
  function transformedSource(def,source,index){
    if(index===0)return {status:"exact",tube:clone(source)};
    if(def.type==="Linear"){
      const matrices=transforms.linearArrayTransforms(def.parameters);
      return transformForLinearOrMatrix(source,matrices[index]);
    }
    if(def.type==="Matrix"){
      const matrices=transforms.matrixArrayTransforms(def.parameters);
      return transformForLinearOrMatrix(source,matrices[index]);
    }
    if(def.type==="Circular"){
      const center=point(def.parameters?.center??{x:0,y:0,z:0});
      const axis=point(def.parameters?.axis??{x:0,y:0,z:1});
      const angle=circularAngle(def,index);
      if(def.parameters?.rotate_elements===false){
        const rotation=transforms.rotationMatrix({axis,center,angle_deg:angle});
        const origin=point(source.origin);
        const next=transforms.transformPoint(rotation,origin);
        return rigid.translateLegacyTubeRigid(source,sub(next,origin));
      }
      return rigid.rotateLegacyTubeRigid(source,{axis,center,angle_deg:angle});
    }
    throw new Error("Unsupported associative array type");
  }
  function memberCount(def){
    if(def.type==="Linear")return Math.trunc(Number(def.parameters?.count)||0);
    if(def.type==="Circular")return Math.trunc(Number(def.parameters?.count)||0);
    if(def.type==="Matrix"){
      const counts=def.parameters?.counts??[];
      if(!Array.isArray(counts)||counts.length!==3)return 0;
      return counts.map(Number).reduce((a,b)=>a*Math.trunc(b),1);
    }
    return 0;
  }
  function createDefinition(input={}){
    const type=String(input.type??"");
    if(!["Linear","Matrix","Circular"].includes(type))throw new Error("Array type must be Linear, Matrix or Circular");
    const ids=[...new Set((input.source_tube_ids??[]).map(String).filter(Boolean))];
    if(!ids.length)throw new Error("Associative Array requires at least one source tube");
    const def={
      id:String(input.id??makeId("array")),
      type,
      name:String(input.name??(type+" Array")),
      source_tube_ids:ids,
      parameters:clone(input.parameters??{}),
      suppressed_members:[...new Set((input.suppressed_members??[]).map((x)=>Math.trunc(Number(x))).filter((x)=>Number.isInteger(x)&&x>0))].sort((a,b)=>a-b),
      member_ids:clone(input.member_ids??{}),
      associative:true,
      status:"NeedsSync"
    };
    const count=memberCount(def);
    if(count<1)throw new Error("Array member count must be >= 1");
    return Object.freeze(def);
  }
  function synchronize(p=project()){
    if(!p||!transforms||!rigid||syncing)return {ok:true,changed:false};
    syncing=true;
    try{
      const defs=definitions(p);
      let changed=false;
      const keepDerived=new Set();
      for(const def of defs){
        const sources=sourceIds(def).map((id)=>byId(p,id));
        const missing=sourceIds(def).filter((id)=>!byId(p,id));
        if(missing.length){
          def.status="LostSource";
          def.missing_source_ids=missing;
          for(const tube of p.tubes??[]){
            if(String(tube?.array_member?.array_id??"")===String(def.id)){
              tube.array_member={...tube.array_member,status:"LostSource"};
              keepDerived.add(String(tube.id));
            }
          }
          continue;
        }
        const existing=existingMemberMap(p,def.id);
        const suppressed=new Set(def.suppressed_members??[]);
        const count=memberCount(def);
        if(count<1){def.status="Error";continue;}
        for(const source of sources){
          for(let index=1;index<count;index++){
            if(suppressed.has(index))continue;
            const key=memberKey(def.id,source.id,index);
            let result;
            try{result=transformedSource(def,source,index);}
            catch(error){def.status="Error";def.error=String(error?.message??error);continue;}
            if(result?.status!=="exact"||!result.tube){
              def.status="Error";def.error=result?.reason??"Array transform failed";continue;
            }
            const previous=existing.get(key);
            const member=detachDerivedLinks(result.tube);
            const stableKey=String(source.id)+":"+String(index);
            const stableId=def.member_ids?.[stableKey]??previous?.id??makeId("array-member");
            if(!def.member_ids||typeof def.member_ids!=="object")def.member_ids={};
            def.member_ids[stableKey]=stableId;
            member.id=stableId;
            member.name=(source.name??source.id)+" ["+def.name+" "+(index+1)+"]";
            member.array_member={
              array_id:def.id,
              source_tube_id:String(source.id),
              member_index:index,
              status:"Valid",
              derived_readonly:true
            };
            member.uiHiddenIn3D=previous?.uiHiddenIn3D===true;
            member.uiTransparentIn3D=false;
            keepDerived.add(String(member.id));
            if(previous){
              const before=JSON.stringify(previous);
              for(const k of Object.keys(previous))delete previous[k];
              Object.assign(previous,member);
              if(JSON.stringify(previous)!==before)changed=true;
            }else{
              p.tubes.push(member);
              changed=true;
            }
          }
        }
        if(def.status!=="Error"){
          def.status="Valid";
          delete def.error;
          delete def.missing_source_ids;
        }
      }
      const filtered=(p.tubes??[]).filter((tube)=>{
        if(!tube?.array_member)return true;
        const arrayExists=defs.some((d)=>String(d.id)===String(tube.array_member.array_id));
        if(!arrayExists)return false;
        return keepDerived.has(String(tube.id));
      });
      if(filtered.length!==(p.tubes??[]).length){p.tubes=filtered;changed=true;}
      return {ok:true,changed};
    }finally{syncing=false;}
  }
  function addArray(input,p=project()){
    if(!p)throw new Error("No active project");
    const def=createDefinition(input);
    definitions(p).push(clone(def));
    synchronize(p);
    return def;
  }
  function suppressMember(arrayId,index,suppressed=true,p=project()){
    const def=definitions(p).find((x)=>String(x.id)===String(arrayId));
    if(!def)throw new Error("Associative Array not found");
    const i=Math.trunc(Number(index));if(!(i>0))throw new Error("Source member cannot be suppressed");
    const set=new Set(def.suppressed_members??[]);
    if(suppressed)set.add(i);else set.delete(i);
    def.suppressed_members=[...set].sort((a,b)=>a-b);
    def.status="NeedsSync";
    synchronize(p);
    return def;
  }
  function detachMember(arrayId,index,{source_tube_id=null}={},p=project()){
    if(!p)throw new Error("No active project");
    const def=definitions(p).find((x)=>String(x.id)===String(arrayId));
    if(!def)throw new Error("Associative Array not found");
    const i=Math.trunc(Number(index));if(!(i>0))throw new Error("Source member cannot be detached");
    const matches=(p.tubes??[]).filter((tube)=>{
      const m=tube?.array_member;
      if(String(m?.array_id??"")!==String(arrayId)||Number(m?.member_index)!==i)return false;
      return source_tube_id==null||String(m?.source_tube_id)===String(source_tube_id);
    });
    if(!matches.length)throw new Error("Array member not found");
    for(const tube of matches){
      delete tube.array_member;
      tube.source_link_detached=true;
      tube.array_detached_from={array_id:String(arrayId),member_index:i,source_tube_id:String(source_tube_id??"")||null};
    }
    const suppressed=new Set(def.suppressed_members??[]);suppressed.add(i);
    def.suppressed_members=[...suppressed].sort((a,b)=>a-b);
    def.status="NeedsSync";
    synchronize(p);
    return matches.map((tube)=>String(tube.id));
  }

  function breakArray(arrayId,p=project()){
    if(!p)throw new Error("No active project");
    const index=definitions(p).findIndex((x)=>String(x.id)===String(arrayId));
    if(index<0)throw new Error("Associative Array not found");
    for(const tube of p.tubes??[]){
      if(String(tube?.array_member?.array_id??"")!==String(arrayId))continue;
      delete tube.array_member;
      tube.source_link_detached=true;
    }
    const [removed]=p.associative_arrays.splice(index,1);
    return removed;
  }
  function deleteArray(arrayId,{deleteMembers=true}={},p=project()){
    if(!p)throw new Error("No active project");
    const index=definitions(p).findIndex((x)=>String(x.id)===String(arrayId));
    if(index<0)return false;
    p.associative_arrays.splice(index,1);
    if(deleteMembers){
      p.tubes=(p.tubes??[]).filter((tube)=>String(tube?.array_member?.array_id??"")!==String(arrayId));
    }else{
      for(const tube of p.tubes??[])if(String(tube?.array_member?.array_id??"")===String(arrayId))delete tube.array_member;
    }
    return true;
  }
  function isDerivedTube(tube){return tube?.array_member?.derived_readonly===true;}
  async function install(){
    if(installed)return;installed=true;
    [transforms,rigid]=await Promise.all([import(TRANSFORM_URL),import(RIGID_URL)]);
    try{synchronize();}catch(error){console.warn("Associative Array sync:",error);}
    if(typeof renderAll==="function"&&!renderAll._tbAssociativeArrays){
      const original=renderAll;
      renderAll=function(...args){
        try{synchronize();}catch(error){console.warn("Associative Array sync:",error);}
        return original.apply(this,args);
      };
      renderAll._tbAssociativeArrays=true;
    }
    window.TubeBenderAssociativeArrays=Object.freeze({
      createDefinition,addArray,synchronize,suppressMember,detachMember,breakArray,deleteArray,definitions:()=>definitions(),isDerivedTube
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});
  else install().catch(console.error);
})();