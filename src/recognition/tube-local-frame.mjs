function point3(value,label){
  if(!Array.isArray(value)||value.length!==3){
    throw new TypeError(label+" must be a 3D vector");
  }
  const out=value.map(Number);
  if(!out.every(Number.isFinite)){
    throw new RangeError(label+" contains non-finite values");
  }
  return out;
}

const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[
  a[1]*b[2]-a[2]*b[1],
  a[2]*b[0]-a[0]*b[2],
  a[0]*b[1]-a[1]*b[0]
];
const len=(a)=>Math.hypot(a[0],a[1],a[2]);
const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];

function unit(value,label){
  const v=point3(value,label);
  const l=len(v);
  if(!(l>0)) throw new RangeError(label+" is degenerate");
  return mul(v,1/l);
}

function unwrap(value,label){
  if(!value||typeof value!=="object"||!("value" in value)){
    throw new TypeError(label+" confidence value is required");
  }
  return value.value;
}

function primitiveList(canonical){
  if(!canonical||canonical.schema_version!=="1.0.0"){
    throw new TypeError("CanonicalTubeGeometry 1.0.0 is required");
  }
  if(!Array.isArray(canonical.primitives)||canonical.primitives.length<1){
    throw new RangeError("canonical primitives are required");
  }
  return canonical.primitives;
}

function firstLineAndBend(canonical){
  const primitives=primitiveList(canonical);
  const firstLine=primitives.find((p)=>p?.type==="LINE");
  const firstBend=primitives.find((p)=>p?.type==="BEND");
  if(!firstLine) throw new RangeError("tube-local frame requires at least one LINE");
  if(!firstBend){
    return {primitives,firstLine,firstBend:null};
  }
  return {primitives,firstLine,firstBend};
}

function localComponents(vector,basis){
  return [
    dot(vector,basis.x),
    dot(vector,basis.y),
    dot(vector,basis.z)
  ];
}

/**
 * Build a rigid tube-local frame from canonical intrinsic geometry.
 *
 * origin = first LINE start
 * +X     = first LINE direction
 * +Z     = oriented first BEND plane normal
 * +Y     = Z x X
 *
 * No scaling or reflection is introduced. If the first bend plane is not
 * orthogonal to the first-line tangent within tolerance, mapping is blocked.
 */
export function deriveTubeLocalFrame(
  canonical,
  {orthogonality_tolerance=1e-6}={}
){
  const {firstLine,firstBend}=firstLineAndBend(canonical);
  if(!firstBend){
    return Object.freeze({
      status:"unresolved",
      canonical_ready:false,
      production_ready:false,
      reason:"A straight-only tube does not define a unique bend plane for legacy editable-row mapping."
    });
  }

  const origin=point3(unwrap(firstLine.start,"first LINE start"),"first LINE start");
  const x=unit(unwrap(firstLine.direction,"first LINE direction"),"first LINE direction");
  const rawNormal=unit(
    unwrap(firstBend.bend_plane_normal,"first BEND plane normal"),
    "first BEND plane normal"
  );
  const angle=Number(unwrap(firstBend.angle,"first BEND angle"));
  if(!Number.isFinite(angle)||angle===0){
    throw new RangeError("first BEND angle must be finite and non-zero");
  }

  const z=mul(rawNormal,Math.sign(angle)||1);
  const xzDot=Math.abs(dot(x,z));
  if(xzDot>orthogonality_tolerance){
    return Object.freeze({
      status:"blocked",
      canonical_ready:false,
      production_ready:false,
      reason:"First LINE direction is not orthogonal to the oriented first-bend plane normal.",
      orthogonality_error:xzDot,
      tolerance:orthogonality_tolerance
    });
  }

  const y=unit(cross(z,x),"tube-local +Y");
  const correctedZ=unit(cross(x,y),"tube-local +Z");
  const determinant=dot(x,cross(y,correctedZ));

  return Object.freeze({
    status:"exact",
    canonical_ready:true,
    production_ready:false,
    frame_id:"tube-local",
    handedness:"right",
    origin:Object.freeze(origin),
    axes:Object.freeze({
      x:Object.freeze(x),
      y:Object.freeze(y),
      z:Object.freeze(correctedZ)
    }),
    source_handedness:canonical.coordinate_frame?.handedness??null,
    first_line_element_id:firstLine.element_id??null,
    first_bend_element_id:firstBend.element_id??null,
    legacy_start_axis:"X",
    legacy_first_bend_plane:"XY",
    orthogonality_error:xzDot,
    determinant,
    rigid_rebase:true,
    reflection_applied:false,
    scale_applied:false,
    reason:"Tube-local frame is derived from intrinsic geometry by translation and proper rotation only."
  });
}

export function transformPointToTubeLocal(point,frame){
  if(!frame||frame.status!=="exact"){
    throw new RangeError("exact tube-local frame is required");
  }
  const p=point3(point,"point");
  const relative=sub(p,frame.origin);
  return Object.freeze(localComponents(relative,frame.axes));
}

export function transformVectorToTubeLocal(vector,frame){
  if(!frame||frame.status!=="exact"){
    throw new RangeError("exact tube-local frame is required");
  }
  const v=point3(vector,"vector");
  return Object.freeze(localComponents(v,frame.axes));
}

/**
 * Rebase a CanonicalTubeGeometry into the derived tube-local frame while
 * preserving confidence/provenance wrappers.
 */
export function rebaseCanonicalToTubeLocal(canonical,frame=deriveTubeLocalFrame(canonical)){
  if(frame.status!=="exact"){
    return Object.freeze({
      status:"blocked",
      canonical_geometry:null,
      frame,
      production_ready:false
    });
  }

  const mapValue=(wrapped,mapper)=>Object.freeze({
    ...wrapped,
    value:wrapped.value==null?null:mapper(wrapped.value)
  });

  const primitives=canonical.primitives.map((primitive)=>{
    if(primitive.type==="LINE"){
      return Object.freeze({
        ...primitive,
        start:mapValue(primitive.start,(v)=>transformPointToTubeLocal(v,frame)),
        end:mapValue(primitive.end,(v)=>transformPointToTubeLocal(v,frame)),
        direction:mapValue(primitive.direction,(v)=>transformVectorToTubeLocal(v,frame))
      });
    }
    if(primitive.type==="BEND"){
      return Object.freeze({
        ...primitive,
        tangent_in:mapValue(primitive.tangent_in,(v)=>transformPointToTubeLocal(v,frame)),
        tangent_out:mapValue(primitive.tangent_out,(v)=>transformPointToTubeLocal(v,frame)),
        center:mapValue(primitive.center,(v)=>transformPointToTubeLocal(v,frame)),
        bend_plane_normal:mapValue(
          primitive.bend_plane_normal,
          (v)=>transformVectorToTubeLocal(v,frame)
        )
      });
    }
    throw new RangeError("unsupported canonical primitive type "+String(primitive.type));
  });

  return Object.freeze({
    status:"rebased",
    production_ready:false,
    frame,
    canonical_geometry:Object.freeze({
      ...canonical,
      coordinate_frame:Object.freeze({
        id:"tube-local",
        handedness:"right",
        notes:"Rigidly rebased from W3D-local canonical geometry: +X first straight, +Z oriented first bend-plane normal."
      }),
      primitives:Object.freeze(primitives)
    })
  });
}
