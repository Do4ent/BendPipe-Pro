const freeze=(v)=>{
  if(Array.isArray(v))return Object.freeze(v.map(freeze));
  if(v&&typeof v==="object"&&!Object.isFrozen(v)){for(const k of Object.keys(v))v[k]=freeze(v[k]);return Object.freeze(v);}
  return v;
};
const clone=(v)=>v==null?v:structuredClone(v);
const point=(v)=>{if(!v)return null;const x=Number(v.x??v[0]),y=Number(v.y??v[1]),z=Number(v.z??v[2]);return [x,y,z].every(Number.isFinite)?{x,y,z}:null;};
const vector=(v)=>{const p=point(v);if(!p)return null;const l=Math.hypot(p.x,p.y,p.z);return l>1e-12?{x:p.x/l,y:p.y/l,z:p.z/l}:null;};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const angle=(a,b)=>{const u=vector(a),v=vector(b);if(!u||!v)return null;return Math.acos(Math.max(-1,Math.min(1,dot(u,v))))*180/Math.PI;};
const opposite=(v)=>({x:-v.x,y:-v.y,z:-v.z});
const parallelError=(a,b)=>{const u=vector(a),v=vector(b);if(!u||!v)return null;return Math.min(angle(u,v),angle(u,opposite(v)));};
const scalar=(v)=>{const n=Number(v?.value??v?.length_mm??v?.length??v?.radius_mm??v?.radius);return Number.isFinite(n)?n:null;};
const radius=(v)=>{const n=Number(v?.radius_mm??v?.radius);return Number.isFinite(n)?n:null;};
const center=(v)=>point(v?.center??v?.point??v?.position);
const direction=(v)=>vector(v?.direction??v?.axis??v?.normal);
function keyRef(ref){return String(ref?.object_id??"")+"|"+String(ref?.subentity_id??"");}
export const INFERENCE_TYPES=freeze(["Coincident","Collinear","Parallel","Perpendicular","Tangent","Concentric","Equal","Horizontal","Vertical"]);
export const DEFAULT_INFERENCE_TOLERANCES=freeze({
  point_mm:.25,
  direction_deg:.35,
  equal_scalar:.05,
  tangent_mm:.25
});
export function normalizeInferenceMode(value="Suggest"){
  const mode=String(value??"Suggest");
  if(!["Off","Suggest","Auto"].includes(mode))throw new RangeError("constraint inference mode must be Off, Suggest or Auto");
  return mode;
}
function suggestion(type,references,score,evidence={}){
  return freeze({
    id:"infer:"+type+":"+references.map(keyRef).join("|"),
    type,
    references:clone(references),
    score:Number(score),
    evidence:clone(evidence),
    inferred:true,
    requires_confirmation:true
  });
}
export function inferConstraintSuggestions({
  references=[],
  resolved=[],
  tolerances={}
}={}){
  const t={...DEFAULT_INFERENCE_TOLERANCES,...tolerances};
  const refs=(references??[]).filter(Boolean),values=(resolved??[]);
  if(refs.length!==values.length||!refs.length)return freeze([]);
  const out=new Map();
  const add=(item)=>{if(!item)return;const old=out.get(item.id);if(!old||item.score>old.score)out.set(item.id,item);};
  for(let i=0;i<refs.length;i++){
    const a=values[i],pa=point(a?.point??a?.position),da=direction(a);
    if(da){
      const hx=Math.min(angle(da,{x:1,y:0,z:0}),angle(da,{x:-1,y:0,z:0}));
      const vy=Math.min(angle(da,{x:0,y:1,z:0}),angle(da,{x:0,y:-1,z:0}));
      if(hx<=t.direction_deg)add(suggestion("Horizontal",[refs[i]],1-hx/Math.max(t.direction_deg,1e-12),{angle_error_deg:hx}));
      if(vy<=t.direction_deg)add(suggestion("Vertical",[refs[i]],1-vy/Math.max(t.direction_deg,1e-12),{angle_error_deg:vy}));
    }
    for(let j=i+1;j<refs.length;j++){
      const b=values[j],pb=point(b?.point??b?.position),db=direction(b);
      if(pa&&pb){
        const d=dist(pa,pb);
        if(d<=t.point_mm)add(suggestion("Coincident",[refs[i],refs[j]],1-d/Math.max(t.point_mm,1e-12),{distance_mm:d}));
      }
      const ca=center(a),cb=center(b),ra=radius(a),rb=radius(b);
      if(ca&&cb&&ra!=null&&rb!=null){
        const cd=dist(ca,cb);
        if(cd<=t.point_mm)add(suggestion("Concentric",[refs[i],refs[j]],1-cd/Math.max(t.point_mm,1e-12),{center_distance_mm:cd}));
        const tangentError=Math.min(Math.abs(cd-(ra+rb)),Math.abs(cd-Math.abs(ra-rb)));
        if(tangentError<=t.tangent_mm)add(suggestion("Tangent",[refs[i],refs[j]],1-tangentError/Math.max(t.tangent_mm,1e-12),{tangent_error_mm:tangentError}));
      }
      if(da&&db){
        const pe=parallelError(da,db);
        if(pe<=t.direction_deg)add(suggestion("Parallel",[refs[i],refs[j]],1-pe/Math.max(t.direction_deg,1e-12),{angle_error_deg:pe}));
        const ae=angle(da,db),perp=Math.abs(90-ae);
        if(perp<=t.direction_deg)add(suggestion("Perpendicular",[refs[i],refs[j]],1-perp/Math.max(t.direction_deg,1e-12),{angle_error_deg:perp}));
        if(pa&&pb&&pe<=t.direction_deg){
          const delta={x:pb.x-pa.x,y:pb.y-pa.y,z:pb.z-pa.z};
          const cross={x:delta.y*da.z-delta.z*da.y,y:delta.z*da.x-delta.x*da.z,z:delta.x*da.y-delta.y*da.x};
          const lineError=Math.hypot(cross.x,cross.y,cross.z);
          if(lineError<=t.point_mm)add(suggestion("Collinear",[refs[i],refs[j]],1-Math.max(pe/Math.max(t.direction_deg,1e-12),lineError/Math.max(t.point_mm,1e-12)),{angle_error_deg:pe,line_error_mm:lineError}));
        }
      }
      const sa=scalar(a),sb=scalar(b);
      if(sa!=null&&sb!=null){
        const e=Math.abs(sa-sb);
        if(e<=t.equal_scalar)add(suggestion("Equal",[refs[i],refs[j]],1-e/Math.max(t.equal_scalar,1e-12),{scalar_error:e}));
      }
    }
  }
  return freeze([...out.values()].sort((a,b)=>b.score-a.score||a.type.localeCompare(b.type)));
}
export function selectInferenceSuggestion(suggestions=[],{minimum_score=.25,preferred_types=[]}={}){
  const preferred=new Map(preferred_types.map((type,index)=>[String(type),index]));
  return [...suggestions]
    .filter(item=>Number(item?.score)>=minimum_score)
    .sort((a,b)=>{
      const pa=preferred.has(a.type)?preferred.get(a.type):999,pb=preferred.has(b.type)?preferred.get(b.type):999;
      return pa-pb||Number(b.score)-Number(a.score)||String(a.id).localeCompare(String(b.id));
    })[0]??null;
}
