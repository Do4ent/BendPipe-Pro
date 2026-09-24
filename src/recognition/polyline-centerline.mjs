function point3(value, index) {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new TypeError(`point ${index} must be [x,y,z]`);
  }
  const p = value.map(Number);
  if (!p.every(Number.isFinite)) {
    throw new RangeError(`point ${index} contains non-finite coordinates`);
  }
  return p;
}

function sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function add(a,b){return [a[0]+b[0],a[1]+b[1],a[2]+b[2]];}
function mul(a,s){return [a[0]*s,a[1]*s,a[2]*s];}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function len(a){return Math.hypot(a[0],a[1],a[2]);}
function unit(a){
  const l=len(a);
  if(!(l>0))return null;
  return [a[0]/l,a[1]/l,a[2]/l];
}
function dist(a,b){return len(sub(a,b));}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

function angleDeg(a,b){
  const ua=unit(a),ub=unit(b);
  if(!ua||!ub)return null;
  return Math.acos(clamp(dot(ua,ub),-1,1))*180/Math.PI;
}

function freezePoint(p){return Object.freeze([...p]);}

export function simplifyPolylineEvidence(
  points,
  {
    duplicate_tolerance_mm = 0.01,
    collinear_angle_tolerance_deg = 0.25
  } = {}
) {
  if (!Array.isArray(points)) {
    throw new TypeError("points must be an array");
  }
  if (!(duplicate_tolerance_mm >= 0)) {
    throw new RangeError("duplicate_tolerance_mm must be >= 0");
  }
  if (!(collinear_angle_tolerance_deg >= 0 && collinear_angle_tolerance_deg < 90)) {
    throw new RangeError("collinear_angle_tolerance_deg must be in [0,90)");
  }

  const source = points.map(point3);
  if (source.length < 2) {
    return Object.freeze({
      status:"insufficient_evidence",
      production_ready:false,
      source_point_count:source.length,
      points:Object.freeze(source.map(freezePoint)),
      segments:Object.freeze([]),
      turns:Object.freeze([])
    });
  }

  const cleaned=[];
  const sourceGroups=[];
  for(let i=0;i<source.length;i++){
    const p=source[i];
    if(!cleaned.length || dist(p,cleaned.at(-1))>duplicate_tolerance_mm){
      cleaned.push([...p]);
      sourceGroups.push([i]);
    }else{
      sourceGroups.at(-1).push(i);
    }
  }

  if(cleaned.length < 2){
    return Object.freeze({
      status:"insufficient_evidence",
      production_ready:false,
      source_point_count:source.length,
      points:Object.freeze(cleaned.map(freezePoint)),
      segments:Object.freeze([]),
      turns:Object.freeze([])
    });
  }

  // Keep endpoints and any vertex whose incoming/outgoing direction changes
  // more than the collinearity tolerance.
  const keep=[0];
  const turns=[];
  for(let i=1;i<cleaned.length-1;i++){
    const incoming=sub(cleaned[i],cleaned[i-1]);
    const outgoing=sub(cleaned[i+1],cleaned[i]);
    const angle=angleDeg(incoming,outgoing);
    if(angle===null)continue;
    if(angle>collinear_angle_tolerance_deg){
      keep.push(i);
      turns.push(Object.freeze({
        point_index:i,
        source_indices:Object.freeze([...sourceGroups[i]]),
        deflection_deg:angle,
        point:freezePoint(cleaned[i])
      }));
    }
  }
  keep.push(cleaned.length-1);

  const simplified=keep.map(i=>cleaned[i]);
  const segments=[];
  for(let i=0;i<simplified.length-1;i++){
    const a=simplified[i],b=simplified[i+1];
    const direction=unit(sub(b,a));
    const length=dist(a,b);
    segments.push(Object.freeze({
      kind:"straight_candidate",
      index:i,
      start:freezePoint(a),
      end:freezePoint(b),
      direction:freezePoint(direction),
      length_mm:length,
      confidence:1,
      truth_category:"derived",
      reason:"Derived deterministically from ordered W3D polyline evidence; not yet accepted as canonical tube geometry."
    }));
  }

  return Object.freeze({
    status:"candidate",
    production_ready:false,
    source_point_count:source.length,
    cleaned_point_count:cleaned.length,
    simplified_point_count:simplified.length,
    points:Object.freeze(simplified.map(freezePoint)),
    segments:Object.freeze(segments),
    turns:Object.freeze(turns),
    tolerances:Object.freeze({
      duplicate_tolerance_mm,
      collinear_angle_tolerance_deg
    })
  });
}
