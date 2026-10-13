(()=>{
  const RIGID_URL="__TB_RIGID_TRANSFORM_MODULE_URL__";
  let rigid=null,installed=false,syncing=false;
  const api=()=>window.TubeBenderEngineering??null;
  const project=()=>{try{return api()?.activeProject?.()??null;}catch{return null;}};
  const clone=(v)=>v==null?v:structuredClone(v);

  function makeId(prefix){
    const uuid=globalThis.crypto?.randomUUID?.();
    return uuid?prefix+"-"+uuid:prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
  }
  function point(value,name){
    const x=Number(value?.x),y=Number(value?.y),z=Number(value?.z);
    if(![x,y,z].every(Number.isFinite))throw new TypeError(name+" must be a finite 3D point/vector");
    if(name==="plane_normal"&&Math.hypot(x,y,z)<=1e-12)throw new RangeError("plane_normal must be non-zero");
    return {x,y,z};
  }
  function definitions(p=project()){
    if(!p)return [];
    if(!Array.isArray(p.associative_mirrors))p.associative_mirrors=[];
    return p.associative_mirrors;
  }
  function byId(p,id){return (p?.tubes??[]).find((tube)=>String(tube?.id)===String(id))??null;}
  function detachDerivedLinks(tube){
    const copy=clone(tube);
    delete copy.mirror_member;
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
    copy.source_link_detached=true;
    if(copy.importEvidence?.spatialPlacement){
      copy.importEvidence.spatialPlacement.user_origin_override=true;
      copy.importEvidence.spatialPlacement.mirror_derived=true;
    }
    return copy;
  }
  function createDefinition(input={}){
    const sourceId=String(input.source_tube_id??"").trim();
    if(!sourceId)throw new Error("Mirror requires source_tube_id");
    const plane_point=point(input.plane_point??{x:0,y:0,z:0},"plane_point");
    const plane_normal=point(input.plane_normal,"plane_normal");
    return Object.freeze({
      id:String(input.id??makeId("mirror")),
      name:String(input.name??"Mirror"),
      source_tube_id:sourceId,
      target_tube_id:String(input.target_tube_id??makeId("mirror-tube")),
      plane_point,
      plane_normal,
      associative:true,
      status:"NeedsSync"
    });
  }
  function synchronize(p=project()){
    if(!p||!rigid||syncing)return {ok:true,changed:false};
    syncing=true;
    try{
      let changed=false;
      const keep=new Set();
      for(const def of definitions(p)){
        const source=byId(p,def.source_tube_id);
        const target=byId(p,def.target_tube_id);
        if(!source){
          def.status="LostSource";
          if(target){
            target.mirror_member={...(target.mirror_member??{}),status:"LostSource",derived_readonly:true};
            keep.add(String(target.id));
          }
          continue;
        }
        let result;
        try{
          result=rigid.mirrorLegacyTubeRigid(source,{
            plane_point:def.plane_point,
            plane_normal:def.plane_normal
          });
        }catch(error){
          def.status="Error";def.error=String(error?.message??error);
          if(target)keep.add(String(target.id));
          continue;
        }
        if(result?.status!=="exact"||!result.tube){
          def.status="Error";def.error=result?.reason??"Mirror transform failed";
          if(target)keep.add(String(target.id));
          continue;
        }
        const derived=detachDerivedLinks(result.tube);
        derived.id=def.target_tube_id;
        derived.name=(source.name??source.id)+" ["+def.name+"]";
        derived.partNumber="";
        derived.material_warning_ack_signature=null;
        derived.material_calculation_state=derived.material_profile_id?"Stale":"Missing Material";
        derived.equipment_calculation_state="Stale";
        derived.mirror_member={
          mirror_id:def.id,
          source_tube_id:String(source.id),
          status:"Valid",
          derived_readonly:true,
          reflection_reencoded_right_handed:true
        };
        derived.uiHiddenIn3D=target?.uiHiddenIn3D===true;
        derived.uiTransparentIn3D=false;
        keep.add(String(derived.id));
        if(target){
          const before=JSON.stringify(target);
          for(const key of Object.keys(target))delete target[key];
          Object.assign(target,derived);
          if(JSON.stringify(target)!==before)changed=true;
        }else{
          p.tubes.push(derived);
          changed=true;
        }
        def.status="Valid";delete def.error;
      }
      const validIds=new Set(definitions(p).map((d)=>String(d.id)));
      const filtered=(p.tubes??[]).filter((tube)=>{
        if(!tube?.mirror_member)return true;
        if(!validIds.has(String(tube.mirror_member.mirror_id)))return false;
        return keep.has(String(tube.id));
      });
      if(filtered.length!==(p.tubes??[]).length){p.tubes=filtered;changed=true;}
      return {ok:true,changed};
    }finally{syncing=false;}
  }
  function addAssociativeCopy(input,p=project()){
    if(!p)throw new Error("No active project");
    const def=createDefinition(input);
    if(!byId(p,def.source_tube_id))throw new Error("Mirror source tube not found");
    definitions(p).push(clone(def));
    synchronize(p);
    return def;
  }
  function createIndependentCopy({source_tube_id,plane_point,plane_normal,name=null}={},p=project()){
    if(!p)throw new Error("No active project");
    const source=byId(p,source_tube_id);
    if(!source)throw new Error("Mirror source tube not found");
    const result=rigid.mirrorLegacyTubeRigid(source,{plane_point,plane_normal});
    if(result?.status!=="exact"||!result.tube)throw new Error(result?.reason??"Mirror failed");
    const copy=detachDerivedLinks(result.tube);
    copy.id=makeId("tube");
    copy.name=String(name??((source.name??source.id)+" Mirror"));
    copy.partNumber="";
    copy.source_link_detached=true;
    copy.material_warning_ack_signature=null;
    copy.material_calculation_state=copy.material_profile_id?"Stale":"Missing Material";
    copy.equipment_calculation_state="Stale";
    if(Array.isArray(copy.rows)){
      copy.rows=copy.rows.map((row)=>({...row,elementId:row?.elementId?makeId("element"):row?.elementId}));
    }
    p.tubes.push(copy);
    return copy;
  }
  function mirrorOriginal({source_tube_id,plane_point,plane_normal}={},p=project()){
    if(!p)throw new Error("No active project");
    const source=byId(p,source_tube_id);
    if(!source)throw new Error("Mirror source tube not found");
    if(source?.mirror_member?.derived_readonly===true)throw new Error("Derived Mirror member cannot be mirrored as Original");
    if(source?.array_member?.derived_readonly===true)throw new Error("Derived Array member cannot be mirrored as Original");
    const result=rigid.mirrorLegacyTubeRigid(source,{plane_point,plane_normal});
    if(result?.status!=="exact"||!result.tube)throw new Error(result?.reason??"Mirror failed");
    const mirrored=clone(result.tube);
    mirrored.material_calculation_state=mirrored.material_profile_id?"Stale":"Missing Material";
    mirrored.equipment_calculation_state="Stale";
    for(const key of Object.keys(source))delete source[key];
    Object.assign(source,mirrored);
    return source;
  }
  function updateMirror(id,patch={},p=project()){
    const def=definitions(p).find((item)=>String(item.id)===String(id));
    if(!def)throw new Error("Associative Mirror not found");
    if(patch.name!=null)def.name=String(patch.name);
    if(patch.plane_point!=null)def.plane_point=point(patch.plane_point,"plane_point");
    if(patch.plane_normal!=null)def.plane_normal=point(patch.plane_normal,"plane_normal");
    def.status="NeedsSync";
    synchronize(p);
    return def;
  }
  function breakMirror(id,p=project()){
    if(!p)throw new Error("No active project");
    const index=definitions(p).findIndex((item)=>String(item.id)===String(id));
    if(index<0)throw new Error("Associative Mirror not found");
    const def=definitions(p)[index];
    const target=byId(p,def.target_tube_id);
    if(target){
      delete target.mirror_member;
      target.source_link_detached=true;
      target.mirror_handedness="right-handed-reencoded";
    }
    p.associative_mirrors.splice(index,1);
    return target??null;
  }
  function deleteMirror(id,{deleteTarget=true}={},p=project()){
    if(!p)throw new Error("No active project");
    const index=definitions(p).findIndex((item)=>String(item.id)===String(id));
    if(index<0)return false;
    const [def]=p.associative_mirrors.splice(index,1);
    if(deleteTarget)p.tubes=(p.tubes??[]).filter((tube)=>String(tube?.id)!==String(def.target_tube_id));
    else{
      const target=byId(p,def.target_tube_id);
      if(target){delete target.mirror_member;target.source_link_detached=true;}
    }
    return true;
  }
  function isDerivedTube(tube){return tube?.mirror_member?.derived_readonly===true;}

  async function install(){
    if(installed)return;installed=true;
    rigid=await import(RIGID_URL);
    try{synchronize();}catch(error){console.warn("Associative Mirror sync:",error);}
    if(typeof renderAll==="function"&&!renderAll._tbAssociativeMirrors){
      const original=renderAll;
      renderAll=function(...args){
        try{synchronize();}catch(error){console.warn("Associative Mirror sync:",error);}
        return original.apply(this,args);
      };
      renderAll._tbAssociativeMirrors=true;
    }
    window.TubeBenderAssociativeMirrors=Object.freeze({
      createDefinition,
      addAssociativeCopy,
      createIndependentCopy,
      mirrorOriginal,
      updateMirror,
      synchronize,
      breakMirror,
      deleteMirror,
      definitions:()=>definitions(),
      isDerivedTube
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});
  else install().catch(console.error);
})();
