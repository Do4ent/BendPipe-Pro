import { fitCircularArcCandidate } from "./circular-arc-candidate.mjs";

function point3(value,label){
  if(!Array.isArray(value)||value.length!==3){
    throw new TypeError(`${label} must be [x,y,z]`);
  }
  const out=value.map(Number);
  if(!out.every(Number.isFinite)){
    throw new RangeError(`${label} contains non-finite coordinates`);
  }
  return out;
}

const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[
  a[1]*b[2]-a[2]*b[1],
  a[2]*b[0]-a[0]*b[2],
  a[0]*b[1]-a[1]*b[0]
];
const len=(a)=>Math.hypot(a[0],a[1],a[2]);
const dist=(a,b)=>len(sub(a,b));
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

function unit(vector,label="vector"){
  const length=len(vector);
  if(!(length>0)) throw new RangeError(`${label} is degenerate`);
  return mul(vector,1/length);
}

function angleDeg(a,b){
  const left=unit(a),right=unit(b);
  return Math.acos(clamp(dot(left,right),-1,1))*180/Math.PI;
}

function pointSegmentDistance(point,start,end){
  const segment=sub(end,start);
  const denom=dot(segment,segment);
  if(!(denom>0)) return dist(point,start);
  const t=clamp(dot(sub(point,start),segment)/denom,0,1);
  return dist(point,add(start,mul(segment,t)));
}

function freezePoint(point){
  return Object.freeze([...point]);
}

function lineCandidate(points,tangents,start,end,{
  line_tolerance_mm,
  tangent_tolerance_deg
}){
  const a=points[start],b=points[end];
  const direction=unit(sub(b,a),"line direction");
  let maxFitError=0;
  let maxTangentError=0;
  for(let i=start;i<=end;i+=1){
    maxFitError=Math.max(
      maxFitError,
      pointSegmentDistance(points[i],a,b)
    );
    maxTangentError=Math.max(
      maxTangentError,
      angleDeg(tangents[i],direction)
    );
  }
  if(
    maxFitError>line_tolerance_mm ||
    maxTangentError>tangent_tolerance_deg
  ) return null;

  return Object.freeze({
    source_start_index:start,
    source_end_index:end,
    source_point_count:end-start+1,
    score:Math.max(
      line_tolerance_mm>0 ? maxFitError/line_tolerance_mm : maxFitError===0?0:Infinity,
      tangent_tolerance_deg>0 ? maxTangentError/tangent_tolerance_deg : maxTangentError===0?0:Infinity
    ),
    primitive:Object.freeze({
      type:"LINE",
      truth_category:"derived",
      start:freezePoint(a),
      end:freezePoint(b),
      direction:freezePoint(direction),
      length_mm:dist(a,b),
      max_fit_error_mm:maxFitError,
      max_tangent_error_deg:maxTangentError,
      reason:"Mesh centerline points and independently derived ring tangents support one straight primitive."
    })
  });
}

function twoPointTangentBend(points,tangents,start,end,{
  arc_plane_tolerance_mm,
  tangent_tolerance_deg,
  two_point_center_tolerance_mm,
  min_bend_angle_deg,
  max_two_point_bend_angle_deg
}){
  if(end!==start+1) return null;
  const p0=points[start],p1=points[end];
  const t0=unit(tangents[start],"start tangent");
  const t1=unit(tangents[end],"end tangent");
  const tangentCross=cross(t0,t1);
  const sinTurn=len(tangentCross);
  const cosTurn=clamp(dot(t0,t1),-1,1);
  const turnDeg=Math.atan2(sinTurn,cosTurn)*180/Math.PI;
  if(
    turnDeg<min_bend_angle_deg ||
    turnDeg>max_two_point_bend_angle_deg ||
    !(sinTurn>1e-12)
  ) return null;

  const planeNormal=unit(tangentCross,"two-point bend plane");
  const radialToCenterStart=unit(
    cross(planeNormal,t0),
    "two-point start radial"
  );
  const radialToCenterEnd=unit(
    cross(planeNormal,t1),
    "two-point end radial"
  );
  const radialDelta=sub(radialToCenterStart,radialToCenterEnd);
  const denom=dot(radialDelta,radialDelta);
  if(!(denom>1e-18)) return null;

  const chord=sub(p1,p0);
  const radius=dot(chord,radialDelta)/denom;
  if(!(radius>0) || !Number.isFinite(radius)) return null;

  const centerStart=add(p0,mul(radialToCenterStart,radius));
  const centerEnd=add(p1,mul(radialToCenterEnd,radius));
  const center=mul(add(centerStart,centerEnd),0.5);
  const centerMismatch=dist(centerStart,centerEnd);
  const planeError=Math.abs(dot(chord,planeNormal));

  const radialStart=unit(sub(p0,center),"two-point radial start");
  const radialEnd=unit(sub(p1,center),"two-point radial end");
  const predictedStart=unit(
    cross(planeNormal,radialStart),
    "two-point predicted start tangent"
  );
  const predictedEnd=unit(
    cross(planeNormal,radialEnd),
    "two-point predicted end tangent"
  );
  const tangentStartError=angleDeg(predictedStart,t0);
  const tangentEndError=angleDeg(predictedEnd,t1);
  const radiusStart=dist(center,p0);
  const radiusEnd=dist(center,p1);
  const radiusMismatch=Math.abs(radiusStart-radiusEnd);

  const radialCross=cross(radialStart,radialEnd);
  const signedSweepRad=Math.atan2(
    dot(planeNormal,radialCross),
    dot(radialStart,radialEnd)
  );
  const signedSweepDeg=signedSweepRad*180/Math.PI;

  if(
    centerMismatch>two_point_center_tolerance_mm ||
    planeError>arc_plane_tolerance_mm ||
    tangentStartError>tangent_tolerance_deg ||
    tangentEndError>tangent_tolerance_deg ||
    Math.abs(signedSweepDeg)<min_bend_angle_deg ||
    Math.abs(signedSweepDeg)>max_two_point_bend_angle_deg
  ) return null;

  return Object.freeze({
    source_start_index:start,
    source_end_index:end,
    source_point_count:2,
    score:Math.max(
      two_point_center_tolerance_mm>0
        ? centerMismatch/two_point_center_tolerance_mm
        : centerMismatch===0?0:Infinity,
      arc_plane_tolerance_mm>0
        ? planeError/arc_plane_tolerance_mm
        : planeError===0?0:Infinity,
      tangent_tolerance_deg>0
        ? Math.max(tangentStartError,tangentEndError)/tangent_tolerance_deg
        : Math.max(tangentStartError,tangentEndError)===0?0:Infinity
    ),
    primitive:Object.freeze({
      type:"BEND",
      truth_category:"derived",
      evidence_mode:"two_point_ring_tangents",
      start_point:freezePoint(p0),
      end_point:freezePoint(p1),
      center:freezePoint(center),
      plane_normal:freezePoint(planeNormal),
      tangent_start:freezePoint(t0),
      tangent_end:freezePoint(t1),
      clr_mm:(radiusStart+radiusEnd)/2,
      signed_sweep_deg:signedSweepDeg,
      center_mismatch_mm:centerMismatch,
      radius_mismatch_mm:radiusMismatch,
      max_plane_error_mm:planeError,
      max_tangent_error_deg:Math.max(
        tangentStartError,
        tangentEndError
      ),
      reason:"Two adjacent mesh rings define a circular bend because their independently derived tangent planes intersect at one CLR within explicit tolerances."
    })
  });
}

function sampledBendCandidate(points,tangents,start,end,{
  arc_radial_tolerance_mm,
  arc_plane_tolerance_mm,
  tangent_tolerance_deg,
  min_bend_angle_deg
}){
  if(end-start+1<3) return null;
  const span=points.slice(start,end+1);
  const arc=fitCircularArcCandidate(span,{
    radial_tolerance_mm:arc_radial_tolerance_mm,
    plane_tolerance_mm:arc_plane_tolerance_mm
  });
  if(!arc.accepted_candidate) return null;
  if(Math.abs(arc.signed_sweep_deg)<min_bend_angle_deg) return null;

  const sweepSign=Math.sign(arc.signed_sweep_deg)||1;
  let maxTangentError=0;
  for(let i=start;i<=end;i+=1){
    const radial=unit(
      sub(points[i],arc.center),
      `arc radial ${i}`
    );
    const predicted=unit(
      mul(cross(arc.plane_normal,radial),sweepSign),
      `arc tangent ${i}`
    );
    maxTangentError=Math.max(
      maxTangentError,
      angleDeg(predicted,tangents[i])
    );
  }
  if(maxTangentError>tangent_tolerance_deg) return null;

  return Object.freeze({
    source_start_index:start,
    source_end_index:end,
    source_point_count:end-start+1,
    score:Math.max(
      arc_radial_tolerance_mm>0
        ? arc.max_radial_error_mm/arc_radial_tolerance_mm
        : arc.max_radial_error_mm===0?0:Infinity,
      arc_plane_tolerance_mm>0
        ? arc.max_plane_error_mm/arc_plane_tolerance_mm
        : arc.max_plane_error_mm===0?0:Infinity,
      tangent_tolerance_deg>0
        ? maxTangentError/tangent_tolerance_deg
        : maxTangentError===0?0:Infinity
    ),
    primitive:Object.freeze({
      type:"BEND",
      truth_category:"derived",
      evidence_mode:"sampled_arc_with_ring_tangents",
      start_point:arc.start_point,
      end_point:arc.end_point,
      center:arc.center,
      plane_normal:arc.plane_normal,
      tangent_start:arc.tangent_start,
      tangent_end:arc.tangent_end,
      clr_mm:arc.clr_mm,
      signed_sweep_deg:arc.signed_sweep_deg,
      max_radial_error_mm:arc.max_radial_error_mm,
      max_plane_error_mm:arc.max_plane_error_mm,
      max_tangent_error_deg:maxTangentError,
      reason:"Mesh ring centers fit one circular arc and all independently derived ring tangents agree with the fitted circle."
    })
  });
}

function better(current,candidate){
  if(!current) return candidate;
  if(candidate.count!==current.count){
    return candidate.count<current.count ? candidate : current;
  }
  if(Math.abs(candidate.score-current.score)>1e-12){
    return candidate.score<current.score ? candidate : current;
  }
  return candidate.prev<current.prev ? candidate : current;
}

/**
 * Segment trusted tube-mesh centerline evidence using both ring centers and
 * independent ring-plane tangents.
 *
 * This is still derived evidence and never production-ready by itself.
 */
export function segmentMeshCenterlineCandidates(
  centerlinePoints,
  centerlineTangents,
  {
    line_tolerance_mm=0.05,
    arc_radial_tolerance_mm=0.05,
    arc_plane_tolerance_mm=0.05,
    tangent_tolerance_deg=0.25,
    two_point_center_tolerance_mm=0.05,
    min_bend_angle_deg=0.5,
    max_two_point_bend_angle_deg=179,
    max_primitives=128
  }={}
){
  if(!Array.isArray(centerlinePoints)||!Array.isArray(centerlineTangents)){
    throw new TypeError("centerlinePoints and centerlineTangents must be arrays");
  }
  if(centerlinePoints.length!==centerlineTangents.length){
    throw new RangeError("centerline point/tangent counts must match");
  }
  if(centerlinePoints.length<2){
    return Object.freeze({
      status:"insufficient_evidence",
      production_ready:false,
      primitives:Object.freeze([])
    });
  }
  if(!Number.isInteger(max_primitives)||max_primitives<1){
    throw new RangeError("max_primitives must be an integer >= 1");
  }

  const points=centerlinePoints.map((point,index)=>point3(point,`point ${index}`));
  const tangents=centerlineTangents.map((tangent,index)=>
    unit(point3(tangent,`tangent ${index}`),`tangent ${index}`)
  );

  const options={
    line_tolerance_mm,
    arc_radial_tolerance_mm,
    arc_plane_tolerance_mm,
    tangent_tolerance_deg,
    two_point_center_tolerance_mm,
    min_bend_angle_deg,
    max_two_point_bend_angle_deg
  };

  const cache=new Map();
  const classify=(start,end)=>{
    const key=`${start}:${end}`;
    if(cache.has(key)) return cache.get(key);

    const line=lineCandidate(points,tangents,start,end,options);
    const bend=end===start+1
      ? twoPointTangentBend(points,tangents,start,end,options)
      : sampledBendCandidate(points,tangents,start,end,options);

    let selected=null;
    if(line&&bend){
      selected=line.score<=bend.score ? line : bend;
    }else{
      selected=line??bend;
    }
    cache.set(key,selected);
    return selected;
  };

  const n=points.length;
  const dp=Array(n).fill(null);
  dp[0]={count:0,score:0,prev:-1,candidate:null};

  for(let end=1;end<n;end+=1){
    let best=null;
    for(let start=0;start<end;start+=1){
      const previous=dp[start];
      if(!previous||previous.count>=max_primitives) continue;
      const candidate=classify(start,end);
      if(!candidate) continue;
      best=better(best,{
        count:previous.count+1,
        score:previous.score+candidate.score,
        prev:start,
        candidate
      });
    }
    dp[end]=best;
  }

  if(!dp[n-1]){
    return Object.freeze({
      status:"unresolved",
      production_ready:false,
      primitives:Object.freeze([]),
      reason:"No LINE/BEND segmentation satisfies both mesh-center and ring-tangent tolerances."
    });
  }

  const reversed=[];
  let cursor=n-1;
  while(cursor>0){
    const node=dp[cursor];
    if(!node?.candidate) break;
    reversed.push(node.candidate);
    cursor=node.prev;
  }
  const primitives=reversed.reverse();

  return Object.freeze({
    status:"candidate",
    production_ready:false,
    canonical_ready:false,
    truth_category:"derived",
    source_point_count:n,
    primitive_count:primitives.length,
    total_normalized_error:dp[n-1].score,
    primitives:Object.freeze(primitives),
    tolerances:Object.freeze({...options}),
    reason:"Mesh centerline was segmented using ring-center geometry and independent ring-plane tangents; canonical topology validation is still required."
  });
}
