function matrix16(value,label){
  if(!Array.isArray(value)||value.length!==16){
    throw new TypeError(`${label} must contain 16 matrix elements`);
  }
  const out=value.map(Number);
  if(!out.every(Number.isFinite)){
    throw new RangeError(`${label} contains non-finite values`);
  }
  return out;
}

function dot3(a,b){
  return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
}
function len3(a){
  return Math.hypot(a[0],a[1],a[2]);
}
function det3(rows){
  const [a,b,c]=rows;
  return (
    a[0]*(b[1]*c[2]-b[2]*c[1])-
    a[1]*(b[0]*c[2]-b[2]*c[0])+
    a[2]*(b[0]*c[1]-b[1]*c[0])
  );
}

export function analyzeRigidModellingMatrix(
  matrix,
  {
    axis_length_tolerance=1e-6,
    orthogonality_tolerance=1e-6,
    determinant_tolerance=1e-6
  }={}
){
  const m=matrix16(matrix,"modelling matrix");
  const rows=[
    [m[0],m[1],m[2]],
    [m[4],m[5],m[6]],
    [m[8],m[9],m[10]]
  ];
  const translation=[m[12],m[13],m[14]];
  const axisLengths=rows.map(len3);
  const axisLengthError=Math.max(...axisLengths.map((v)=>Math.abs(v-1)));
  const orthogonalityError=Math.max(
    Math.abs(dot3(rows[0],rows[1])),
    Math.abs(dot3(rows[0],rows[2])),
    Math.abs(dot3(rows[1],rows[2]))
  );
  const determinant=det3(rows);
  const determinantError=Math.abs(determinant-1);
  const affineTailError=Math.max(
    Math.abs(m[3]),
    Math.abs(m[7]),
    Math.abs(m[11]),
    Math.abs(m[15]-1)
  );
  const rigid=
    axisLengthError<=axis_length_tolerance &&
    orthogonalityError<=orthogonality_tolerance &&
    determinantError<=determinant_tolerance &&
    affineTailError<=orthogonality_tolerance;

  return Object.freeze({
    status:rigid?"rigid_proper":"non_rigid",
    rigid,
    proper_rotation:rigid && determinant>0,
    determinant,
    determinant_error:determinantError,
    axis_lengths:Object.freeze(axisLengths),
    max_axis_length_error:axisLengthError,
    max_orthogonality_error:orthogonalityError,
    affine_tail_error:affineTailError,
    translation:Object.freeze(translation),
    preserves_lengths_angles_and_orientation:rigid&&determinant>0,
    tolerances:Object.freeze({
      axis_length_tolerance,
      orthogonality_tolerance,
      determinant_tolerance
    })
  });
}

function pathKey(path){
  return JSON.stringify(Array.isArray(path)?path:[]);
}

function isPathPrefix(prefix,path){
  if(prefix.length>path.length)return false;
  for(let i=0;i<prefix.length;i+=1){
    if(prefix[i]!==path[i])return false;
  }
  return true;
}

/**
 * Review modelling-matrix provenance on the exact segment path leading to one
 * Include Library reference.
 *
 * HSF defines TKE_Modelling_Matrix as an attribute of the currently opened
 * segment. We therefore preserve matrices by segment path. For the current
 * golden case, canonical intrinsic geometry is allowed only when every
 * non-identity placement matrix on the include ancestry is a proper rigid
 * transform; no scale/shear/reflection may be hidden in placement.
 */
export function reviewIncludeTransformProvenance(
  decodedVariationSegment,
  includeLibraryName,
  options={}
){
  if(!decodedVariationSegment||!Array.isArray(decodedVariationSegment.entities)){
    throw new TypeError("decodedVariationSegment with entities is required");
  }
  const name=String(includeLibraryName??"");
  if(!name.startsWith("?Include Library/")){
    throw new RangeError("includeLibraryName must be an exact Include Library name");
  }

  const includes=decodedVariationSegment.entities.filter((entity)=>
    entity?.kind==="segment" &&
    entity.action==="include" &&
    entity.name===name
  );
  if(includes.length!==1){
    return Object.freeze({
      status:includes.length===0?"unresolved":"ambiguous",
      production_ready:false,
      canonical_ready:false,
      include_library:name,
      include_match_count:includes.length,
      transforms:Object.freeze([]),
      reason:includes.length===0
        ?"Exact Include Library reference was not found in the variation segment."
        :"Exact Include Library reference is ambiguous in the variation segment."
    });
  }

  const include=includes[0];
  const includePath=Array.isArray(include.segment_path)
    ? [...include.segment_path]
    : null;
  if(!includePath){
    return Object.freeze({
      status:"unresolved",
      production_ready:false,
      canonical_ready:false,
      include_library:name,
      include_match_count:1,
      transforms:Object.freeze([]),
      reason:"Include entity has no segment_path provenance."
    });
  }

  // One modelling matrix is an attribute value on a segment. If a segment
  // repeats the attribute, the later value replaces the earlier value for that
  // same segment. Preserve only the latest matrix per ancestor path before the
  // include reference.
  const byPath=new Map();
  const includeOffset=Number(include.source_offset);
  for(const entity of decodedVariationSegment.entities){
    if(entity?.kind!=="transform")continue;
    if(!Array.isArray(entity.segment_path))continue;
    if(Number.isFinite(includeOffset) && Number(entity.source_offset)>includeOffset)continue;
    if(!isPathPrefix(entity.segment_path,includePath))continue;
    byPath.set(pathKey(entity.segment_path),entity);
  }

  const transforms=[...byPath.values()].map((entity)=>{
    const analysis=analyzeRigidModellingMatrix(entity.matrix,options);
    return Object.freeze({
      source_offset:entity.absolute_source_offset??entity.source_offset??null,
      segment_path:Object.freeze([...entity.segment_path]),
      matrix:Object.freeze([...entity.matrix]),
      analysis
    });
  });

  const nonRigid=transforms.filter((item)=>!item.analysis.rigid);
  const improper=transforms.filter(
    (item)=>item.analysis.rigid&&!item.analysis.proper_rotation
  );
  const accepted=nonRigid.length===0&&improper.length===0;

  return Object.freeze({
    status:accepted?"rigid_placement":"blocked",
    production_ready:false,
    canonical_ready:accepted,
    include_library:name,
    include_match_count:1,
    include_source_offset:
      include.absolute_source_offset??include.source_offset??null,
    include_segment_path:Object.freeze(includePath),
    transforms:Object.freeze(transforms),
    transform_count:transforms.length,
    all_placement_transforms_proper_rigid:accepted,
    intrinsic_geometry_invariants_preserved:accepted,
    reason:accepted
      ?"Every modelling matrix on the exact include ancestry is a proper rigid transform, so local lengths, CLR, bend angles and oriented inter-plane rotations are invariant."
      :"At least one modelling matrix on the exact include ancestry contains scale, shear or reflection and blocks intrinsic-geometry promotion."
  });
}
