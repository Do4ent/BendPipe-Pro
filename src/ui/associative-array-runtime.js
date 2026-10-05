(()=>{
  const TRANSFORM_URL="__TB_TRANSFORM_COMMANDS_MODULE_URL__";
  const RIGID_URL="__TB_RIGID_TRANSFORM_MODULE_URL__";
  const DYNAMIC_INPUT_URL="__TB_DYNAMIC_INPUT_MODULE_URL__";
  let transforms=null,rigid=null,dynamicInput=null,installed=false,syncing=false;
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
  function add(a,b){return {x:a.x+b.x,y:a.y+b.y,z:a.z+b.z};}
  function scale(a,s){return {x:a.x*s,y:a.y*s,z:a.z*s};}
  function dot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
  function length(a){return Math.hypot(a.x,a.y,a.z);}
  function unit(a,name="vector"){const n=length(a);if(!(n>1e-12))throw new Error(name+" must be non-zero");return scale(a,1/n);}
  const FORMULA_FIELDS=Object.freeze({
    count:"scalar",step:"length",
    count_x:"scalar",count_y:"scalar",count_z:"scalar",
    step_x:"length",step_y:"length",step_z:"length",
    total_angle_deg:"angle",initial_angle_deg:"angle",radius_mm:"length"
  });
  function formulaVariables(p=project()){
    return {...(p?.formula_variables??{}),...(p?.array_formula_variables??{})};
  }
  function rawParameterValue(def,name){
    const params=def?.parameters??{};
    if(name==="count_x")return params.counts?.[0];
    if(name==="count_y")return params.counts?.[1];
    if(name==="count_z")return params.counts?.[2];
    if(name==="step_x")return params.steps?.[0];
    if(name==="step_y")return params.steps?.[1];
    if(name==="step_z")return params.steps?.[2];
    return params[name];
  }
  function evaluateFormulaFields(def,p=project()){
    const formulas=def?.parameter_formulas??{},base=formulaVariables(p),resolved={},visiting=new Set();
    const resolve=(name)=>{
      if(name in resolved)return resolved[name];
      if(visiting.has(name))throw new Error("Array formula cycle: "+[...visiting,name].join(" -> "));
      if(!(name in formulas)){
        const raw=rawParameterValue(def,name);
        if(raw!=null&&raw!==""){const n=Number(raw);if(Number.isFinite(n)){resolved[name]=n;return n;}}
        if(name in base){const n=Number(base[name]);if(Number.isFinite(n)){resolved[name]=n;return n;}}
        throw new Error("Unknown array formula variable: "+name);
      }
      visiting.add(name);
      const expression=String(formulas[name]??"").trim();
      const deps=[...new Set(expression.match(/\b[A-Za-z_]\w*\b/g)??[])];
      const vars={...base,...resolved};
      for(const dep of deps){
        if(dep===name)throw new Error("Array formula cycle: "+name+" -> "+name);
        if(dep in formulas||rawParameterValue(def,dep)!=null)vars[dep]=resolve(dep);
      }
      const kind=FORMULA_FIELDS[name]==="angle"?"angle":"length";
      const value=dynamicInput.evaluateNumericInput(expression,{kind,variables:vars});
      visiting.delete(name);resolved[name]=value;return value;
    };
    for(const name of Object.keys(formulas))if(name in FORMULA_FIELDS)resolve(name);
    return resolved;
  }
  function evaluatedParameters(def,p=project()){
    const params=clone(def?.parameters??{}),values=evaluateFormulaFields(def,p);
    const value=(name,fallback)=>name in values?values[name]:(Number(rawParameterValue(def,name))||fallback);
    if(def?.type==="Linear"){
      params.count=Math.max(1,Math.trunc(value("count",1)));
      params.step=value("step",0);
      params.direction=point(params.direction??{x:1,y:0,z:0});
    }else if(def?.type==="Matrix"){
      params.counts=[
        Math.max(1,Math.trunc(value("count_x",1))),
        Math.max(1,Math.trunc(value("count_y",1))),
        Math.max(1,Math.trunc(value("count_z",1)))
      ];
      params.steps=[value("step_x",0),value("step_y",0),value("step_z",0)];
      params.directions=(params.directions??[{x:1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1}]).map(point);
    }else if(def?.type==="Circular"){
      params.count=Math.max(1,Math.trunc(value("count",1)));
      params.total_angle_deg=value("total_angle_deg",360);
      params.initial_angle_deg=value("initial_angle_deg",0);
      const radius=value("radius_mm",NaN);params.radius_mm=Number.isFinite(radius)&&radius>=0?radius:null;
      params.center=point(params.center??{x:0,y:0,z:0});
      params.axis=point(params.axis??{x:0,y:0,z:1});
      params.clockwise=params.clockwise===true;
      params.rotate_elements=params.rotate_elements!==false;
    }
    return params;
  }
  function byId(p,id){return (p?.tubes??[]).find((t)=>String(t?.id)===String(id))??null;}
  function lockMode(object){return String(object?.lock_state?.mode??object?.lock_mode??"Unlocked");}
  function assertUnlockedObject(object){
    if(lockMode(object)==="Object"){
      const error=new Error("Объект заблокирован");error.code="OBJECT_LOCKED";throw error;
    }
  }
  function assertArrayEditable(def){assertUnlockedObject(def);}
  function assertSourcesEditable(ids,p){
    for(const id of ids){
      const tube=byId(p,id);
      if(tube)assertUnlockedObject(tube);
    }
  }
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
  function circularAngle(def,index,p=project()){
    const params=evaluatedParameters(def,p),count=params.count,total=params.total_angle_deg,initial=params.initial_angle_deg??0;
    if(!(count>=1)||!Number.isFinite(total))throw new Error("Invalid circular array parameters");
    if(index===0)return 0;
    const full=Math.abs(Math.abs(total)-360)<1e-9;
    const step=count<=1?0:total/(full?count:count-1);
    const sign=params.clockwise?-1:1;
    return sign*(initial+step*index);
  }
  function circularRadiusAdjustedSource(def,source,p=project()){
    const params=evaluatedParameters(def,p),radius=params.radius_mm;
    if(radius==null)return source;
    const center=point(params.center),axis=unit(point(params.axis),"array axis"),origin=point(source.origin);
    const relative=sub(origin,center),axial=scale(axis,dot(relative,axis)),radial=sub(relative,axial);
    let radialUnit;
    if(length(radial)>1e-9)radialUnit=unit(radial,"array radius direction");
    else{
      const helper=Math.abs(axis.x)<.9?{x:1,y:0,z:0}:{x:0,y:1,z:0};
      radialUnit=unit({x:axis.y*helper.z-axis.z*helper.y,y:axis.z*helper.x-axis.x*helper.z,z:axis.x*helper.y-axis.y*helper.x},"array radius direction");
    }
    const target=add(center,add(axial,scale(radialUnit,radius)));
    const moved=rigid.translateLegacyTubeRigid(source,sub(target,origin));
    if(moved?.status!=="exact"||!moved.tube)throw new Error(moved?.reason??"Array radius adjustment failed");
    return moved.tube;
  }
  function transformedSource(def,source,index,p=project()){
    if(index===0)return {status:"exact",tube:clone(source)};
    const params=evaluatedParameters(def,p);
    if(def.type==="Linear"){
      const matrices=transforms.linearArrayTransforms(params);
      return transformForLinearOrMatrix(source,matrices[index]);
    }
    if(def.type==="Matrix"){
      const matrices=transforms.matrixArrayTransforms(params);
      return transformForLinearOrMatrix(source,matrices[index]);
    }
    if(def.type==="Circular"){
      const center=point(params.center??{x:0,y:0,z:0});
      const axis=point(params.axis??{x:0,y:0,z:1});
      const angle=circularAngle(def,index,p),base=circularRadiusAdjustedSource(def,source,p);
      if(params.rotate_elements===false){
        const rotation=transforms.rotationMatrix({axis,center,angle_deg:angle});
        const origin=point(base.origin);
        const next=transforms.transformPoint(rotation,origin);
        return rigid.translateLegacyTubeRigid(base,sub(next,origin));
      }
      return rigid.rotateLegacyTubeRigid(base,{axis,center,angle_deg:angle});
    }
    throw new Error("Unsupported associative array type");
  }
  function memberCount(def,p=project()){
    const params=evaluatedParameters(def,p);
    if(def.type==="Linear"||def.type==="Circular")return Math.trunc(Number(params.count)||0);
    if(def.type==="Matrix"){
      const counts=params.counts??[];
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
      parameter_formulas:clone(input.parameter_formulas??{}),
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
    assertSourcesEditable(input?.source_tube_ids??[],p);
    const def=createDefinition(input);
    definitions(p).push(clone(def));
    synchronize(p);
    return def;
  }
  function definitionById(arrayId,p=project()){
    return definitions(p).find(def=>String(def?.id)===String(arrayId))??null;
  }
  function updateParameters(arrayId,patch={},options={},p=project()){
    const def=definitionById(arrayId,p);if(!def)throw new Error("Associative Array not found");
    assertArrayEditable(def);
    def.parameters={...(def.parameters??{}),...clone(patch)};
    if(patch.counts)def.parameters.counts=[...patch.counts];
    if(patch.steps)def.parameters.steps=[...patch.steps];
    if(patch.directions)def.parameters.directions=clone(patch.directions);
    if(options.formulas){
      def.parameter_formulas={...(def.parameter_formulas??{})};
      for(const [name,formula] of Object.entries(options.formulas)){
        const text=String(formula??"").trim();
        if(text)def.parameter_formulas[name]=text;else delete def.parameter_formulas[name];
      }
    }
    evaluatedParameters(def,p);
    def.status="NeedsSync";synchronize(p);
    return def;
  }
  function previewParameters(arrayId,patch={},options={},p=project()){
    const sourceDef=definitionById(arrayId,p);if(!sourceDef)throw new Error("Associative Array not found");
    const def=clone(sourceDef);def.parameters={...(def.parameters??{}),...clone(patch)};
    if(options.formulas)def.parameter_formulas={...(def.parameter_formulas??{}),...clone(options.formulas)};
    const count=memberCount(def,p),members=[];
    for(const sourceId of sourceIds(def)){
      const source=byId(p,sourceId);if(!source)continue;
      for(let index=0;index<count;index++){
        if((def.suppressed_members??[]).includes(index))continue;
        const result=transformedSource(def,source,index,p);
        if(result?.status==="exact"&&result.tube)members.push({source_tube_id:sourceId,member_index:index,origin:clone(result.tube.origin)});
      }
    }
    return Object.freeze({array_id:String(arrayId),parameters:Object.freeze(evaluatedParameters(def,p)),members:Object.freeze(members.map(Object.freeze))});
  }
  function setParameterFormula(arrayId,name,formula,p=project()){
    if(!(name in FORMULA_FIELDS))throw new Error("Unsupported Array formula parameter: "+name);
    return updateParameters(arrayId,{}, {formulas:{[name]:formula}},p);
  }

  function suppressMember(arrayId,index,suppressed=true,p=project()){
    const def=definitions(p).find((x)=>String(x.id)===String(arrayId));
    if(!def)throw new Error("Associative Array not found");
    assertArrayEditable(def);
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
    assertArrayEditable(def);
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
    [transforms,rigid,dynamicInput]=await Promise.all([import(TRANSFORM_URL),import(RIGID_URL),import(DYNAMIC_INPUT_URL)]);
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
      createDefinition,addArray,synchronize,suppressMember,detachMember,breakArray,deleteArray,
      definitionById,updateParameters,previewParameters,setParameterFormula,evaluatedParameters,
      definitions:()=>definitions(),isDerivedTube
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});
  else install().catch(console.error);
})();