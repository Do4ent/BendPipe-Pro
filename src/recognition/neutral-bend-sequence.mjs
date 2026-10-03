import { validateCandidateTopology } from "./topology-validation.mjs";

function primitiveOf(value,index){
  const primitive=value?.primitive??value;
  if(!primitive||typeof primitive!=="object"){
    throw new TypeError(`primitive ${index} must be an object`);
  }
  return primitive;
}

function point3(value,label){
  if(!Array.isArray(value)||value.length!==3){
    throw new TypeError(`${label} must be [x,y,z]`);
  }
  const point=value.map(Number);
  if(!point.every(Number.isFinite)){
    throw new RangeError(`${label} contains non-finite coordinates`);
  }
  return point;
}

const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[
  a[1]*b[2]-a[2]*b[1],
  a[2]*b[0]-a[0]*b[2],
  a[0]*b[1]-a[1]*b[0]
];
const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const len=(a)=>Math.hypot(a[0],a[1],a[2]);

function unit(value,label){
  const vector=point3(value,label);
  const length=len(vector);
  if(!(length>0)) throw new RangeError(`${label} is degenerate`);
  return vector.map((component)=>component/length);
}

function positive(value,label,{allowZero=false}={}){
  const number=Number(value);
  if(!Number.isFinite(number) || (allowZero ? number<0 : number<=0)){
    throw new RangeError(
      `${label} must be ${allowZero?"non-negative":"positive"}`
    );
  }
  return number;
}

function orientedPlaneNormal(bend,index){
  const normal=unit(bend.plane_normal,`BEND ${index} plane_normal`);
  const sweep=Number(bend.signed_sweep_deg);
  if(!Number.isFinite(sweep)||Math.abs(sweep)<=0){
    throw new RangeError(`BEND ${index} signed_sweep_deg must be non-zero`);
  }
  const sign=Math.sign(sweep)||1;
  return mul(normal,sign);
}

function signedAngleAroundAxis(from,to,axis){
  const a=unit(from,"previous bend plane");
  const b=unit(to,"current bend plane");
  const n=unit(axis,"intervening straight direction");
  const sine=dot(n,cross(a,b));
  const cosine=Math.max(-1,Math.min(1,dot(a,b)));
  let angle=Math.atan2(sine,cosine)*180/Math.PI;
  if(Math.abs(angle)<1e-12) angle=0;
  return angle;
}

/**
 * Build a machine-neutral bend sequence from validated LINE/BEND geometry.
 *
 * No springback, clamp, feed, rotation or tooling compensation is applied.
 * The output is geometric evidence only.
 */
export function buildNeutralBendSequence(
  primitiveCandidates,
  {
    endpoint_tolerance_mm=0.1,
    tangent_angle_tolerance_deg=0.25
  }={}
){
  if(!Array.isArray(primitiveCandidates)){
    throw new TypeError("primitiveCandidates must be an array");
  }
  const primitives=primitiveCandidates.map(primitiveOf);
  const topology=validateCandidateTopology(primitives,{
    endpoint_tolerance_mm,
    tangent_angle_tolerance_deg
  });

  const issues=[...topology.issues];
  if(primitives.length>0 && primitives.at(-1)?.type!=="LINE"){
    issues.push(Object.freeze({
      code:"MUST_END_WITH_LINE",
      index:primitives.length-1,
      message:"Complete tube candidate must end with a LINE primitive."
    }));
  }
  if(issues.length){
    return Object.freeze({
      status:"unresolved",
      production_ready:false,
      canonical_ready:false,
      machine_compensation_applied:false,
      issues:Object.freeze(issues),
      bends:Object.freeze([]),
      reason:"Neutral bend sequence requires one continuous alternating LINE/BEND topology that starts and ends with LINE."
    });
  }

  const bends=[];
  let previousPlane=null;
  for(let index=1;index<primitives.length;index+=2){
    const precedingLine=primitives[index-1];
    const bend=primitives[index];
    const followingLine=primitives[index+1];

    if(!followingLine||bend.type!=="BEND"){
      throw new RangeError(`unexpected primitive topology near index ${index}`);
    }

    const straightBefore=positive(
      precedingLine.length_mm,
      `LINE ${index-1} length_mm`,
      {allowZero:true}
    );
    const clr=positive(bend.clr_mm,`BEND ${index} clr_mm`);
    const signedAngle=Number(bend.signed_sweep_deg);
    if(!Number.isFinite(signedAngle)||Math.abs(signedAngle)<=0){
      throw new RangeError(`BEND ${index} signed_sweep_deg must be non-zero`);
    }

    const plane=orientedPlaneNormal(bend,index);
    const rotation=previousPlane==null
      ? null
      : signedAngleAroundAxis(
          previousPlane,
          plane,
          precedingLine.direction
        );

    bends.push(Object.freeze({
      bend_number:bends.length+1,
      source_primitive_index:index,
      straight_before_mm:straightBefore,
      clr_mm:clr,
      bend_angle_deg:Math.abs(signedAngle),
      signed_bend_angle_deg:signedAngle,
      plane_normal:Object.freeze([...plane]),
      rotation_from_previous_bend_deg:rotation,
      tangent_start:Object.freeze(
        point3(bend.tangent_start,`BEND ${index} tangent_start`)
      ),
      tangent_end:Object.freeze(
        point3(bend.tangent_end,`BEND ${index} tangent_end`)
      ),
      start_point:Object.freeze(
        point3(bend.start_point,`BEND ${index} start_point`)
      ),
      end_point:Object.freeze(
        point3(bend.end_point,`BEND ${index} end_point`)
      )
    }));
    previousPlane=plane;
  }

  const tail=positive(
    primitives.at(-1).length_mm,
    `LINE ${primitives.length-1} length_mm`,
    {allowZero:true}
  );

  return Object.freeze({
    status:"candidate",
    production_ready:false,
    canonical_ready:false,
    truth_category:"derived",
    machine_compensation_applied:false,
    primitive_count:primitives.length,
    bend_count:bends.length,
    bends:Object.freeze(bends),
    tail_length_mm:tail,
    topology,
    reason:"Neutral bend sequence contains geometry-only feed, CLR, bend-angle and inter-plane rotation evidence; machine compensation remains a separate downstream stage."
  });
}
