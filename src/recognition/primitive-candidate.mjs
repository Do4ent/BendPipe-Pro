import { fitCircularArcCandidate } from "./circular-arc-candidate.mjs";

function p3(value,index){
  if(!Array.isArray(value)||value.length!==3)throw new TypeError(`point ${index} must be [x,y,z]`);
  const p=value.map(Number);
  if(!p.every(Number.isFinite))throw new RangeError(`point ${index} contains non-finite coordinates`);
  return p;
}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const len=a=>Math.hypot(a[0],a[1],a[2]);
const dist=(a,b)=>len(sub(a,b));
const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function freezePoint(p){return Object.freeze([...p]);}

function pointSegmentDistance(p,a,b){
  const ab=sub(b,a),ap=sub(p,a);
  const d=dot(ab,ab);
  if(!(d>0))return dist(p,a);
  const t=clamp(dot(ap,ab)/d,0,1);
  return dist(p,add(a,mul(ab,t)));
}

function lineFit(points){
  if(points.length<2)return null;
  const start=points[0],end=points.at(-1);
  const length=dist(start,end);
  if(!(length>0))return null;
  let maxError=0;
  for(const p of points){
    maxError=Math.max(maxError,pointSegmentDistance(p,start,end));
  }
  return {start,end,length,maxError};
}

/**
 * Classify one ordered polyline fragment as one primitive candidate.
 *
 * This function deliberately refuses mixed geometry. Segmentation into
 * multiple primitives is a separate stage with its own evidence and tests.
 */
export function recognizeSinglePrimitiveCandidate(
  points,
  {
    line_tolerance_mm=0.1,
    arc_radial_tolerance_mm=0.1,
    arc_plane_tolerance_mm=0.1
  }={}
){
  if(!Array.isArray(points))throw new TypeError("points must be an array");
  const src=points.map(p3);

  if(src.length<2){
    return Object.freeze({
      status:"insufficient_evidence",
      production_ready:false,
      primitive:null
    });
  }
  if(!(line_tolerance_mm>=0))throw new RangeError("line_tolerance_mm must be >= 0");

  const line=lineFit(src);
  if(line&&line.maxError<=line_tolerance_mm){
    const direction=sub(line.end,line.start);
    const l=len(direction);
    return Object.freeze({
      status:"candidate",
      production_ready:false,
      primitive:Object.freeze({
        type:"LINE",
        truth_category:"inferred",
        start:freezePoint(line.start),
        end:freezePoint(line.end),
        direction:freezePoint(direction.map(v=>v/l)),
        length_mm:line.length,
        max_fit_error_mm:line.maxError,
        tolerance_mm:line_tolerance_mm,
        reason:"One straight primitive fits all ordered polyline points within explicit tolerance; canonical acceptance is still required."
      })
    });
  }

  if(src.length>=3){
    const arc=fitCircularArcCandidate(src,{
      radial_tolerance_mm:arc_radial_tolerance_mm,
      plane_tolerance_mm:arc_plane_tolerance_mm
    });
    if(arc.accepted_candidate){
      return Object.freeze({
        status:"candidate",
        production_ready:false,
        primitive:Object.freeze({
          type:"BEND",
          truth_category:"inferred",
          center:arc.center,
          plane_normal:arc.plane_normal,
          start_point:arc.start_point,
          end_point:arc.end_point,
          tangent_start:arc.tangent_start,
          tangent_end:arc.tangent_end,
          clr_mm:arc.clr_mm,
          signed_sweep_deg:arc.signed_sweep_deg,
          max_radial_error_mm:arc.max_radial_error_mm,
          max_plane_error_mm:arc.max_plane_error_mm,
          reason:arc.reason
        })
      });
    }
  }

  return Object.freeze({
    status:"unresolved",
    production_ready:false,
    primitive:null,
    reason:"Polyline fragment does not fit one LINE or one circular BEND within explicit tolerances; segmentation or more source evidence is required."
  });
}
