import {inferConstraintSuggestions} from "./constraint-inference.mjs";
import {analyzeConstraintDoF} from "./constraint-dof-analysis.mjs";

const clone=(v)=>v==null?v:structuredClone(v);
const freeze=(v)=>{
  if(Array.isArray(v))return Object.freeze(v.map(freeze));
  if(v&&typeof v==="object"&&!Object.isFrozen(v)){for(const k of Object.keys(v))v[k]=freeze(v[k]);return Object.freeze(v);}
  return v;
};
function refKey(ref){return String(ref?.object_id??"")+"|"+String(ref?.subentity_id??"");}
function relationKey(type,references=[]){return String(type)+":"+references.map(refKey).sort().join("||");}
function existingKeys(project){
  return new Set((project?.geometric_constraints??[]).map(item=>relationKey(item?.type,item?.references??[])));
}
function candidateConstraint(suggestion,index){
  return {
    id:"auto-preview-"+index+"-"+String(suggestion.type),
    type:String(suggestion.type),
    name:String(suggestion.type)+" (Auto-Constrain preview)",
    references:clone(suggestion.references),
    target:null,
    enabled:true,
    driving:true,
    status:"Valid",
    tolerance:{point_mm:1e-6,direction_deg:1e-6,scalar:1e-9}
  };
}
export function buildAutoConstrainPlan({
  project={},
  references=[],
  resolved=[],
  tolerances={},
  system_relation_keys=[],
  minimum_score=.25
}={}){
  const refs=(references??[]).filter(Boolean),values=(resolved??[]);
  if(refs.length!==values.length)throw new RangeError("Auto-Constrain references/resolved length mismatch");
  const objectIds=[...new Set(refs.map(ref=>String(ref?.object_id??"")).filter(Boolean))];
  const before=analyzeConstraintDoF(project,{object_ids:objectIds});
  const existing=existingKeys(project),system=new Set((system_relation_keys??[]).map(String));
  const raw=inferConstraintSuggestions({references:refs,resolved:values})
    .filter(item=>Number(item.score)>=Number(minimum_score))
    .sort((a,b)=>Number(b.score)-Number(a.score)||String(a.type).localeCompare(String(b.type)));
  const accepted=[],skipped=[];
  let working=clone(project),analysis=before,index=0;
  if(!Array.isArray(working.geometric_constraints))working.geometric_constraints=[];
  for(const suggestion of raw){
    const key=relationKey(suggestion.type,suggestion.references);
    if(existing.has(key)){
      skipped.push({suggestion:clone(suggestion),reason:"Already constrained"});continue;
    }
    if(system.has(String(suggestion.id))||system.has(key)){
      skipped.push({suggestion:clone(suggestion),reason:"System relation"});continue;
    }
    const constraint=candidateConstraint(suggestion,index++);
    const candidateProject=clone(working);
    candidateProject.geometric_constraints=[...(candidateProject.geometric_constraints??[]),constraint];
    const next=analyzeConstraintDoF(candidateProject,{object_ids:objectIds});
    if(next.structural_rank>analysis.structural_rank){
      accepted.push({...clone(suggestion),relation_key:key,rank_gain:next.structural_rank-analysis.structural_rank});
      working=candidateProject;analysis=next;existing.add(key);
    }else{
      skipped.push({suggestion:clone(suggestion),reason:"Redundant / no DoF reduction"});
    }
  }
  return freeze({
    status:"Preview",
    references:clone(refs),
    suggestions:accepted,
    skipped,
    dof_before:before,
    dof_after:analysis,
    dof_reduction:Math.max(0,Number(before.remaining_dof)-Number(analysis.remaining_dof)),
    creates_numeric_driving_dimensions:false,
    requires_confirmation:true
  });
}
export function filterAutoConstrainPlan(plan,selectedIds=[]){
  const selected=new Set((selectedIds??[]).map(String));
  const suggestions=(plan?.suggestions??[]).filter(item=>selected.has(String(item.id)));
  return freeze({
    ...clone(plan),
    suggestions:clone(suggestions),
    requires_confirmation:true,
    creates_numeric_driving_dimensions:false
  });
}
export function relationKeyForConstraint(type,references){return relationKey(type,references);}
