function clone(v){return v==null?v:structuredClone(v);}
function freeze(value){
  if(Array.isArray(value))return Object.freeze(value.map(freeze));
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    for(const key of Object.keys(value))value[key]=freeze(value[key]);
    return Object.freeze(value);
  }
  return value;
}
function finite(value){const n=Number(value);return Number.isFinite(n)?n:null;}
function median(values=[]){
  const list=values.map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  if(!list.length)return null;
  const i=Math.floor(list.length/2);
  return list.length%2?list[i]:(list[i-1]+list[i])/2;
}
function featureDescriptor(value={}){
  const type=String(value.type??value.kind??value.primitive_type??"Geometry");
  const candidates=[
    ["radius_mm",value.radius_mm??value.clr??value.radius,"length"],
    ["diameter_mm",value.diameter_mm??value.outer_diameter_mm??value.od_mm,"length"],
    ["length_mm",value.length_mm??value.L??value.length,"length"],
    ["angle_deg",value.angle_deg??value.angle??value.sweep_deg,"angle"]
  ];
  for(const [field,raw,quantity] of candidates){
    const numeric=finite(raw);
    if(numeric!=null)return {feature_type:type,field,value:numeric,quantity};
  }
  return {feature_type:type,field:null,value:null,quantity:"none"};
}
function toleranceFor(quantity,profile={}){
  if(quantity==="angle")return Math.max(0,Number(profile.angular_tolerance_deg??0.05)||0);
  if(quantity==="length")return Math.max(0,Number(profile.linear_tolerance_mm??0.01)||0);
  return 0;
}
function keyFor(feature){return feature.feature_type+"|"+String(feature.field??"none");}

export function batchNormalizationCandidate(input,index=0){
  if(!input||typeof input!=="object")throw new TypeError("batch candidate "+index+" must be an object");
  const geometry=input.geometry??input.object??input;
  const id=String(input.id??geometry?.id??("candidate-"+(index+1)));
  const status=String(geometry?.geometry_status??geometry?.geometryStatus??(geometry?.fitted===true?"Fitted":""));
  if(status!=="Fitted")throw new Error("batch candidate "+id+" must be Fitted");
  const feature=featureDescriptor(geometry);
  return freeze({
    id,
    geometry:clone(geometry),
    feature_type:feature.feature_type,
    field:feature.field,
    source_value:feature.value,
    quantity:feature.quantity,
    label:String(input.label??geometry?.name??geometry?.label??id),
    selected:input.selected!==false
  });
}

export function buildBatchNormalizePreview(items=[],{
  tolerance_profile={},
  nominal_overrides={},
  include_unmeasured=true
}={}){
  const candidates=(items??[]).map(batchNormalizationCandidate);
  const buckets=new Map();
  for(const candidate of candidates){
    const key=keyFor(candidate);
    if(!buckets.has(key))buckets.set(key,[]);
    buckets.get(key).push(candidate);
  }
  const groups=[];
  for(const [key,members] of buckets){
    const measured=members.filter(item=>item.source_value!=null);
    if(!measured.length&&!include_unmeasured)continue;
    const autoNominal=median(measured.map(item=>item.source_value));
    const override=finite(nominal_overrides?.[key]);
    const nominal=override??autoNominal;
    const quantity=members[0]?.quantity??"none";
    const tolerance=toleranceFor(quantity,tolerance_profile);
    const rows=members.map(item=>{
      const deviation=item.source_value==null||nominal==null?null:item.source_value-nominal;
      const inTolerance=deviation==null?true:Math.abs(deviation)<=tolerance+1e-12;
      return freeze({
        ...clone(item),
        nominal_value:nominal,
        deviation,
        abs_deviation:deviation==null?null:Math.abs(deviation),
        tolerance,
        in_tolerance:inTolerance,
        out_of_tolerance:!inTolerance
      });
    });
    groups.push(freeze({
      id:"batch-group:"+key,
      key,
      feature_type:members[0]?.feature_type??"Geometry",
      field:members[0]?.field??null,
      quantity,
      nominal_value:nominal,
      tolerance,
      member_count:rows.length,
      out_of_tolerance_count:rows.filter(row=>row.out_of_tolerance).length,
      members:rows
    }));
  }
  return freeze({
    status:"Preview",
    mutates_source:false,
    candidate_count:candidates.length,
    selected_count:candidates.filter(item=>item.selected).length,
    out_of_tolerance_count:groups.reduce((sum,group)=>sum+group.out_of_tolerance_count,0),
    groups
  });
}

export function setBatchPreviewSelection(preview,ids=[],selected=true){
  if(!preview||preview.status!=="Preview")throw new TypeError("batch preview is required");
  const keys=new Set((ids??[]).map(String));
  const groups=preview.groups.map(group=>({
    ...clone(group),
    members:group.members.map(member=>keys.has(String(member.id))?{...clone(member),selected:selected===true}:clone(member))
  }));
  return freeze({
    ...clone(preview),
    selected_count:groups.flatMap(group=>group.members).filter(item=>item.selected).length,
    groups
  });
}

export function setBatchNominal(preview,groupId,nominalValue){
  if(!preview||preview.status!=="Preview")throw new TypeError("batch preview is required");
  const nominal=finite(nominalValue);
  if(nominal==null)throw new TypeError("nominal value must be finite");
  const groups=preview.groups.map(group=>{
    if(String(group.id)!==String(groupId))return clone(group);
    const members=group.members.map(member=>{
      const deviation=member.source_value==null?null:member.source_value-nominal;
      const inTolerance=deviation==null?true:Math.abs(deviation)<=group.tolerance+1e-12;
      return {...clone(member),nominal_value:nominal,deviation,abs_deviation:deviation==null?null:Math.abs(deviation),in_tolerance:inTolerance,out_of_tolerance:!inTolerance};
    });
    return {...clone(group),nominal_value:nominal,members,out_of_tolerance_count:members.filter(item=>item.out_of_tolerance).length};
  });
  return freeze({
    ...clone(preview),
    out_of_tolerance_count:groups.reduce((sum,group)=>sum+group.out_of_tolerance_count,0),
    groups
  });
}

export function batchNormalizePlan(preview){
  if(!preview||preview.status!=="Preview")throw new TypeError("batch preview is required");
  const selected=[];
  for(const group of preview.groups)for(const member of group.members){
    if(member.selected!==true)continue;
    selected.push(freeze({
      id:String(member.id),
      feature_type:member.feature_type,
      field:member.field,
      source_value:member.source_value,
      target_value:member.nominal_value,
      deviation:member.deviation,
      out_of_tolerance:member.out_of_tolerance,
      geometry:clone(member.geometry)
    }));
  }
  return freeze({
    status:"Ready",
    operation:"BatchNormalizeFittedToExact",
    selected_count:selected.length,
    source_mutation:false,
    items:selected
  });
}
