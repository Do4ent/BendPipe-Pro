function p3(value, index) {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new TypeError(`point ${index} must be [x,y,z]`);
  }
  const p=value.map(Number);
  if(!p.every(Number.isFinite)){
    throw new RangeError(`point ${index} contains non-finite coordinates`);
  }
  return p;
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
const len=a=>Math.hypot(a[0],a[1],a[2]);
const dist=(a,b)=>len(sub(a,b));
function unit(a){const l=len(a);return l>0?mul(a,1/l):null;}
function freezePoint(p){return Object.freeze([...p]);}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

function circumcircle3d(a,b,c,collinearTolerance){
  const u=sub(b,a),v=sub(c,a),w=cross(u,v);
  const w2=dot(w,w);
  if(!(w2>collinearTolerance*collinearTolerance))return null;

  const term1=mul(cross(v,w),dot(u,u));
  const term2=mul(cross(w,u),dot(v,v));
  const center=add(a,mul(add(term1,term2),1/(2*w2)));
  const radius=dist(center,a);
  const normal=unit(w);
  if(!(radius>0)||!Number.isFinite(radius))return null;
  return {center,radius,normal};
}

function unwrapAngles(values){
  if(!values.length)return [];
  const out=[values[0]];
  for(let i=1;i<values.length;i++){
    let a=values[i],prev=out[i-1];
    while(a-prev>Math.PI)a-=2*Math.PI;
    while(a-prev<-Math.PI)a+=2*Math.PI;
    out.push(a);
  }
  return out;
}

/**
 * Fit an ordered 3D point sequence to one circular arc candidate.
 *
 * The result is evidence only. Passing tolerances does not promote it to
 * canonical geometry or manufacturing truth.
 */
export function fitCircularArcCandidate(
  points,
  {
    radial_tolerance_mm=0.1,
    plane_tolerance_mm=0.1,
    collinear_tolerance=1e-9
  }={}
){
  if(!Array.isArray(points))throw new TypeError("points must be an array");
  if(points.length<3){
    return Object.freeze({
      status:"insufficient_evidence",
      production_ready:false,
      accepted_candidate:false,
      clr_mm:null
    });
  }
  if(!(radial_tolerance_mm>=0)||!(plane_tolerance_mm>=0)){
    throw new RangeError("fit tolerances must be >= 0");
  }

  const src=points.map(p3);
  const mid=src[Math.floor((src.length-1)/2)];
  const circle=circumcircle3d(src[0],mid,src.at(-1),collinear_tolerance);
  if(!circle){
    return Object.freeze({
      status:"not_circular",
      production_ready:false,
      accepted_candidate:false,
      clr_mm:null,
      reason:"Reference points are collinear or numerically degenerate."
    });
  }

  const {center,radius,normal}=circle;
  let maxRadialError=0,maxPlaneError=0;
  const radialVectors=[];
  for(const p of src){
    const rel=sub(p,center);
    const planeError=Math.abs(dot(rel,normal));
    const radialLen=len(rel);
    const radialError=Math.abs(radialLen-radius);
    maxPlaneError=Math.max(maxPlaneError,planeError);
    maxRadialError=Math.max(maxRadialError,radialError);
    radialVectors.push(rel);
  }

  const e1=unit(radialVectors[0]);
  const e2=unit(cross(normal,e1));
  const rawAngles=radialVectors.map(r=>Math.atan2(dot(r,e2),dot(r,e1)));
  const angles=unwrapAngles(rawAngles);
  const sweep=angles.at(-1)-angles[0];
  const sweepDeg=sweep*180/Math.PI;

  // Reject sequences that reverse angular direction inside one proposed arc.
  let direction=0,reversals=0;
  for(let i=1;i<angles.length;i++){
    const d=angles[i]-angles[i-1];
    if(Math.abs(d)<1e-12)continue;
    const s=Math.sign(d);
    if(direction===0)direction=s;
    else if(s!==direction)reversals++;
  }

  const accepted=
    maxRadialError<=radial_tolerance_mm &&
    maxPlaneError<=plane_tolerance_mm &&
    reversals===0 &&
    Math.abs(sweepDeg)>1e-9 &&
    Math.abs(sweepDeg)<360-1e-9;

  const sweepSign=Math.sign(sweep)||1;
  const radialStart=unit(sub(src[0],center));
  const radialEnd=unit(sub(src.at(-1),center));
  const tangentStart=unit(mul(cross(normal,radialStart),sweepSign));
  const tangentEnd=unit(mul(cross(normal,radialEnd),sweepSign));

  return Object.freeze({
    status:accepted?"candidate":"fit_rejected",
    production_ready:false,
    accepted_candidate:accepted,
    truth_category:"inferred",
    center:freezePoint(center),
    plane_normal:freezePoint(normal),
    start_point:freezePoint(src[0]),
    end_point:freezePoint(src.at(-1)),
    tangent_start:freezePoint(tangentStart),
    tangent_end:freezePoint(tangentEnd),
    clr_mm:accepted?radius:null,
    fitted_radius_mm:radius,
    signed_sweep_deg:sweepDeg,
    max_radial_error_mm:maxRadialError,
    max_plane_error_mm:maxPlaneError,
    angular_reversals:reversals,
    tolerances:Object.freeze({
      radial_tolerance_mm,
      plane_tolerance_mm
    }),
    reason:accepted
      ?"Circular arc candidate fits the ordered polyline evidence within explicit tolerances; canonical acceptance is still required."
      :"Polyline evidence does not satisfy one circular arc within the configured tolerances."
  });
}
