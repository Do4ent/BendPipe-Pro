function p3(v,name){
  if(!Array.isArray(v)||v.length!==3)throw new TypeError(`${name} must be [x,y,z]`);
  const p=v.map(Number);
  if(!p.every(Number.isFinite))throw new RangeError(`${name} contains non-finite values`);
  return p;
}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const len=a=>Math.hypot(a[0],a[1],a[2]);
const dist=(a,b)=>len(sub(a,b));
function unit(a){const l=len(a);return l>0?a.map(v=>v/l):null;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function angleDeg(a,b){
  const ua=unit(a),ub=unit(b);
  if(!ua||!ub)return null;
  return Math.acos(clamp(dot(ua,ub),-1,1))*180/Math.PI;
}
function startPoint(p){
  if(p.type==="LINE")return p3(p.start,"LINE.start");
  if(p.type==="BEND")return p3(p.start_point,"BEND.start_point");
  return null;
}
function endPoint(p){
  if(p.type==="LINE")return p3(p.end,"LINE.end");
  if(p.type==="BEND")return p3(p.end_point,"BEND.end_point");
  return null;
}
function startTangent(p){
  if(p.type==="LINE")return p3(p.direction,"LINE.direction");
  if(p.type==="BEND")return p3(p.tangent_start,"BEND.tangent_start");
  return null;
}
function endTangent(p){
  if(p.type==="LINE")return p3(p.direction,"LINE.direction");
  if(p.type==="BEND")return p3(p.tangent_end,"BEND.tangent_end");
  return null;
}

/**
 * Validate candidate primitive topology before canonical promotion.
 *
 * Normal TubeBender topology is LINE -> BEND -> LINE -> ...
 * This function reports concrete issues but never mutates or promotes input.
 */
export function validateCandidateTopology(
  primitives,
  {
    endpoint_tolerance_mm=0.1,
    tangent_angle_tolerance_deg=0.25
  }={}
){
  if(!Array.isArray(primitives))throw new TypeError("primitives must be an array");
  if(!(endpoint_tolerance_mm>=0))throw new RangeError("endpoint_tolerance_mm must be >= 0");
  if(!(tangent_angle_tolerance_deg>=0&&tangent_angle_tolerance_deg<180)){
    throw new RangeError("tangent_angle_tolerance_deg must be in [0,180)");
  }

  const issues=[];
  if(!primitives.length){
    issues.push({code:"EMPTY_TOPOLOGY",index:null,message:"No primitive candidates are available."});
  }else if(primitives[0]?.type!=="LINE"){
    issues.push({code:"MUST_START_WITH_LINE",index:0,message:"Tube candidate must start with a LINE primitive."});
  }

  for(let i=0;i<primitives.length;i++){
    const p=primitives[i];
    if(!p||!["LINE","BEND"].includes(p.type)){
      issues.push({code:"UNSUPPORTED_PRIMITIVE",index:i,message:`Unsupported primitive type at index ${i}.`});
    }
    if(i===0)continue;
    const prev=primitives[i-1];

    if(prev?.type===p?.type){
      issues.push({
        code:"NON_ALTERNATING_TOPOLOGY",
        index:i,
        message:`Adjacent ${p?.type||"unknown"} primitives should be merged or re-segmented.`
      });
    }

    let ep=null,sp=null,et=null,st=null;
    try{
      ep=endPoint(prev);sp=startPoint(p);et=endTangent(prev);st=startTangent(p);
    }catch(error){
      issues.push({code:"INVALID_PRIMITIVE_DATA",index:i,message:error.message});
      continue;
    }

    if(ep&&sp){
      const gap=dist(ep,sp);
      if(gap>endpoint_tolerance_mm){
        issues.push({
          code:"ENDPOINT_GAP",
          index:i,
          value:gap,
          tolerance:endpoint_tolerance_mm,
          message:`Primitive endpoint gap ${gap} mm exceeds tolerance ${endpoint_tolerance_mm} mm.`
        });
      }
    }

    if(et&&st){
      const angle=angleDeg(et,st);
      if(angle===null){
        issues.push({code:"UNDEFINED_TANGENT",index:i,message:"Primitive tangent direction is undefined."});
      }else if(angle>tangent_angle_tolerance_deg){
        issues.push({
          code:"TANGENCY_MISMATCH",
          index:i,
          value:angle,
          tolerance:tangent_angle_tolerance_deg,
          message:`Tangency mismatch ${angle} deg exceeds tolerance ${tangent_angle_tolerance_deg} deg.`
        });
      }
    }
  }

  return Object.freeze({
    status:issues.length?"violation":"candidate_valid",
    production_ready:false,
    canonical_ready:issues.length===0,
    issues:Object.freeze(issues.map(x=>Object.freeze({...x}))),
    tolerances:Object.freeze({
      endpoint_tolerance_mm,
      tangent_angle_tolerance_deg
    }),
    reason:issues.length
      ?"Candidate topology requires correction or more source evidence."
      :"Candidate topology is continuous and tangent within explicit tolerances; canonical promotion still requires provenance/confidence review."
  });
}
