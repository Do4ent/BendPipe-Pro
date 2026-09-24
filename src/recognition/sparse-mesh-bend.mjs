import { fitCircularArcCandidate } from "./circular-arc-candidate.mjs";

function p3(value,index){
  if(!Array.isArray(value)||value.length!==3){
    throw new TypeError(`point ${index} must be [x,y,z]`);
  }
  const point=value.map(Number);
  if(!point.every(Number.isFinite)){
    throw new RangeError(`point ${index} contains non-finite coordinates`);
  }
  return point;
}

const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const len=(a)=>Math.hypot(a[0],a[1],a[2]);
const dist=(a,b)=>len(sub(a,b));
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function unit(vector){
  const length=len(vector);
  return length>0 ? mul(vector,1/length) : null;
}

function pointSegmentDistance(point,start,end){
  const segment=sub(end,start);
  const denom=dot(segment,segment);
  if(!(denom>0)) return dist(point,start);
  const t=clamp(dot(sub(point,start),segment)/denom,0,1);
  return dist(point,add(start,mul(segment,t)));
}

function fitStraightEvidence(points){
  if(points.length<3) return null;
  const start=points[0];
  const end=points.at(-1);
  const length=dist(start,end);
  if(!(length>0)) return null;
  let maxError=0;
  for(const point of points){
    maxError=Math.max(maxError,pointSegmentDistance(point,start,end));
  }
  return {
    start,
    end,
    length,
    max_error:maxError,
    direction:unit(sub(end,start))
  };
}

function angleDeg(a,b){
  if(!a||!b) return Infinity;
  return Math.acos(clamp(dot(a,b),-1,1))*180/Math.PI;
}

function frozenPoint(point){
  return Object.freeze([...point]);
}

/**
 * Validate a sparse circular bend from an already trusted tube-mesh centerline.
 *
 * This is intentionally NOT the generic polyline recognizer. A 3- or 4-point
 * arc is accepted only when two independent straight neighborhoods bracket it
 * and the fitted arc tangents agree with those straight directions.
 *
 * The output remains derived evidence and never becomes production-ready here.
 */
export function recognizeSparseMeshBendCandidate(
  centerlinePoints,
  startIndex,
  endIndex,
  {
    straight_evidence_points=3,
    line_tolerance_mm=0.05,
    arc_radial_tolerance_mm=0.05,
    arc_plane_tolerance_mm=0.05,
    tangent_tolerance_deg=1,
    min_straight_evidence_length_mm=5
  }={}
){
  if(!Array.isArray(centerlinePoints)){
    throw new TypeError("centerlinePoints must be an array");
  }
  const points=centerlinePoints.map(p3);
  if(!Number.isInteger(startIndex)||!Number.isInteger(endIndex)){
    throw new TypeError("startIndex and endIndex must be integers");
  }
  if(startIndex<0||endIndex>=points.length||endIndex<=startIndex){
    throw new RangeError("invalid sparse bend span");
  }
  const arcPointCount=endIndex-startIndex+1;
  if(arcPointCount<3||arcPointCount>4){
    return Object.freeze({
      status:"not_applicable",
      accepted_candidate:false,
      production_ready:false,
      reason:"Sparse mesh bend validation is restricted to 3 or 4 centerline samples."
    });
  }
  if(!Number.isInteger(straight_evidence_points)||straight_evidence_points<3){
    throw new RangeError("straight_evidence_points must be an integer >= 3");
  }

  const beforeStart=startIndex-(straight_evidence_points-1);
  const afterEnd=endIndex+(straight_evidence_points-1);
  if(beforeStart<0||afterEnd>=points.length){
    return Object.freeze({
      status:"insufficient_tangent_evidence",
      accepted_candidate:false,
      production_ready:false,
      reason:"Sparse bend is not bracketed by enough source centerline samples on both sides."
    });
  }

  const incomingPoints=points.slice(beforeStart,startIndex+1);
  const outgoingPoints=points.slice(endIndex,afterEnd+1);
  const incoming=fitStraightEvidence(incomingPoints);
  const outgoing=fitStraightEvidence(outgoingPoints);

  if(
    !incoming||!outgoing||
    incoming.length<min_straight_evidence_length_mm||
    outgoing.length<min_straight_evidence_length_mm||
    incoming.max_error>line_tolerance_mm||
    outgoing.max_error>line_tolerance_mm
  ){
    return Object.freeze({
      status:"insufficient_tangent_evidence",
      accepted_candidate:false,
      production_ready:false,
      reason:"Adjacent source samples do not provide two independent straight tangent neighborhoods.",
      incoming_line_error_mm:incoming?.max_error??null,
      outgoing_line_error_mm:outgoing?.max_error??null,
      incoming_line_length_mm:incoming?.length??null,
      outgoing_line_length_mm:outgoing?.length??null
    });
  }

  const arcPoints=points.slice(startIndex,endIndex+1);
  const arc=fitCircularArcCandidate(arcPoints,{
    radial_tolerance_mm:arc_radial_tolerance_mm,
    plane_tolerance_mm:arc_plane_tolerance_mm
  });
  if(!arc.accepted_candidate){
    return Object.freeze({
      status:"arc_fit_rejected",
      accepted_candidate:false,
      production_ready:false,
      reason:arc.reason,
      arc_evidence:arc
    });
  }

  const tangentStartError=angleDeg(incoming.direction,arc.tangent_start);
  const tangentEndError=angleDeg(outgoing.direction,arc.tangent_end);
  const accepted=
    tangentStartError<=tangent_tolerance_deg &&
    tangentEndError<=tangent_tolerance_deg;

  return Object.freeze({
    status:accepted?"candidate":"tangency_rejected",
    accepted_candidate:accepted,
    production_ready:false,
    canonical_ready:false,
    truth_category:"derived",
    source_kind:"validated_tube_mesh_centerline",
    source_start_index:startIndex,
    source_end_index:endIndex,
    source_point_count:arcPointCount,
    primitive:accepted ? Object.freeze({
      type:"BEND",
      start_point:frozenPoint(arc.start_point),
      end_point:frozenPoint(arc.end_point),
      center:frozenPoint(arc.center),
      plane_normal:frozenPoint(arc.plane_normal),
      tangent_start:frozenPoint(arc.tangent_start),
      tangent_end:frozenPoint(arc.tangent_end),
      clr_mm:arc.clr_mm,
      signed_sweep_deg:arc.signed_sweep_deg
    }) : null,
    incoming_evidence:Object.freeze({
      source_start_index:beforeStart,
      source_end_index:startIndex,
      length_mm:incoming.length,
      max_fit_error_mm:incoming.max_error,
      direction:frozenPoint(incoming.direction)
    }),
    outgoing_evidence:Object.freeze({
      source_start_index:endIndex,
      source_end_index:afterEnd,
      length_mm:outgoing.length,
      max_fit_error_mm:outgoing.max_error,
      direction:frozenPoint(outgoing.direction)
    }),
    tangent_start_error_deg:tangentStartError,
    tangent_end_error_deg:tangentEndError,
    arc_radial_error_mm:arc.max_radial_error_mm,
    arc_plane_error_mm:arc.max_plane_error_mm,
    tolerances:Object.freeze({
      line_tolerance_mm,
      arc_radial_tolerance_mm,
      arc_plane_tolerance_mm,
      tangent_tolerance_deg,
      min_straight_evidence_length_mm
    }),
    reason:accepted
      ?"Sparse circular bend is independently supported by straight tangent neighborhoods on both sides; canonical topology still requires validation."
      :"Circular fit exists, but one or both endpoint tangents disagree with independent straight evidence."
  });
}

export function findSparseMeshBendCandidates(centerlinePoints,options={}){
  if(!Array.isArray(centerlinePoints)){
    throw new TypeError("centerlinePoints must be an array");
  }
  const candidates=[];
  for(let start=0;start<centerlinePoints.length;start+=1){
    for(const count of [3,4]){
      const end=start+count-1;
      if(end>=centerlinePoints.length) continue;
      const result=recognizeSparseMeshBendCandidate(
        centerlinePoints,start,end,options
      );
      if(result.accepted_candidate) candidates.push(result);
    }
  }
  return Object.freeze(candidates);
}
