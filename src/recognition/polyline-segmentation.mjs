import { recognizeSinglePrimitiveCandidate } from "./primitive-candidate.mjs";

function p3(value,index){
  if(!Array.isArray(value)||value.length!==3)throw new TypeError(`point ${index} must be [x,y,z]`);
  const p=value.map(Number);
  if(!p.every(Number.isFinite))throw new RangeError(`point ${index} contains non-finite coordinates`);
  return p;
}

function candidateError(primitive){
  if(!primitive)return Infinity;
  if(primitive.type==="LINE")return Number(primitive.max_fit_error_mm)||0;
  if(primitive.type==="BEND"){
    return Math.max(
      Number(primitive.max_radial_error_mm)||0,
      Number(primitive.max_plane_error_mm)||0
    );
  }
  return Infinity;
}

function better(a,b){
  if(!a)return b;
  if(!b)return a;
  if(b.count!==a.count)return b.count<a.count?b:a;
  if(Math.abs(b.error-a.error)>1e-12)return b.error<a.error?b:a;
  // Stable deterministic tie-break: prefer an earlier previous split.
  return b.prev<a.prev?b:a;
}

/**
 * Segment ordered polyline evidence into the minimum number of primitive
 * candidates that fit explicit tolerances.
 *
 * This is evidence segmentation only. The result is never production-ready
 * and does not imply canonical acceptance.
 */
export function segmentPolylineCandidates(
  points,
  {
    line_tolerance_mm=0.1,
    arc_radial_tolerance_mm=0.1,
    arc_plane_tolerance_mm=0.1,
    min_arc_points=5,
    max_primitives=64
  }={}
){
  if(!Array.isArray(points))throw new TypeError("points must be an array");
  const src=points.map(p3);
  if(src.length<2){
    return Object.freeze({
      status:"insufficient_evidence",
      production_ready:false,
      primitives:Object.freeze([])
    });
  }
  if(!Number.isInteger(min_arc_points)||min_arc_points<3){
    throw new RangeError("min_arc_points must be an integer >= 3");
  }
  if(!Number.isInteger(max_primitives)||max_primitives<1){
    throw new RangeError("max_primitives must be an integer >= 1");
  }

  const n=src.length;
  const dp=Array(n).fill(null);
  dp[0]={count:0,error:0,prev:-1,candidate:null};

  const cache=new Map();
  const classify=(i,j)=>{
    const key=`${i}:${j}`;
    if(cache.has(key))return cache.get(key);
    const span=src.slice(i,j+1);
    const result=recognizeSinglePrimitiveCandidate(span,{
      line_tolerance_mm,
      arc_radial_tolerance_mm,
      arc_plane_tolerance_mm
    });
    let candidate=null;
    if(result.status==="candidate"&&result.primitive){
      if(result.primitive.type!=="BEND"||span.length>=min_arc_points){
        candidate=Object.freeze({
          source_start_index:i,
          source_end_index:j,
          source_point_count:span.length,
          primitive:result.primitive
        });
      }
    }
    cache.set(key,candidate);
    return candidate;
  };

  for(let end=1;end<n;end++){
    let best=null;
    for(let start=0;start<end;start++){
      const prev=dp[start];
      if(!prev)continue;
      if(prev.count>=max_primitives)continue;
      const candidate=classify(start,end);
      if(!candidate)continue;
      const option={
        count:prev.count+1,
        error:prev.error+candidateError(candidate.primitive),
        prev:start,
        candidate
      };
      best=better(best,option);
    }
    dp[end]=best;
  }

  const final=dp[n-1];
  if(!final){
    return Object.freeze({
      status:"unresolved",
      production_ready:false,
      primitives:Object.freeze([]),
      reason:"No segmentation fits the configured primitive/tolerance constraints."
    });
  }

  const reversed=[];
  let cursor=n-1;
  while(cursor>0){
    const node=dp[cursor];
    if(!node?.candidate)break;
    reversed.push(node.candidate);
    cursor=node.prev;
  }
  const primitives=reversed.reverse();

  if(primitives.length>max_primitives){
    return Object.freeze({
      status:"unresolved",
      production_ready:false,
      primitives:Object.freeze([]),
      reason:"Candidate segmentation exceeds max_primitives."
    });
  }

  return Object.freeze({
    status:"candidate",
    production_ready:false,
    source_point_count:n,
    primitive_count:primitives.length,
    total_fit_error:final.error,
    primitives:Object.freeze(primitives),
    tolerances:Object.freeze({
      line_tolerance_mm,
      arc_radial_tolerance_mm,
      arc_plane_tolerance_mm,
      min_arc_points
    }),
    reason:"Polyline was segmented deterministically into evidence-level primitives; canonical topology and tangency still require validation."
  });
}
