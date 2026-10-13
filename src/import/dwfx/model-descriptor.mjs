function decodeXml(value) {
  return String(value ?? "").replace(
    /&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g,
    (match,entity)=>{
      if(entity==="amp")return "&";
      if(entity==="lt")return "<";
      if(entity==="gt")return ">";
      if(entity==="quot")return '"';
      if(entity==="apos")return "'";
      if(entity.startsWith("#x")){
        const code=Number.parseInt(entity.slice(2),16);
        return Number.isFinite(code)?String.fromCodePoint(code):match;
      }
      if(entity.startsWith("#")){
        const code=Number.parseInt(entity.slice(1),10);
        return Number.isFinite(code)?String.fromCodePoint(code):match;
      }
      return match;
    }
  );
}

function parseAttributes(fragment) {
  const out={};
  const pattern=/([A-Za-z_][\w:.-]*)\s*=\s*(["'])(.*?)\2/gs;
  for(const match of fragment.matchAll(pattern)){
    out[match[1].split(":").at(-1)]=decodeXml(match[3]);
  }
  return out;
}

function finiteMatrix(value,label){
  const values=String(value??"")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(Number);
  if(values.length!==16||!values.every(Number.isFinite)){
    throw new RangeError(`${label} must contain exactly 16 finite numbers`);
  }
  return values;
}

const dot3=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const len3=(a)=>Math.hypot(a[0],a[1],a[2]);

export function analyzeGraphicResourceTransform(
  matrix,
  {
    relative_scale_tolerance=1e-6,
    orthogonality_tolerance=1e-6,
    affine_tolerance=1e-9
  }={}
){
  if(!Array.isArray(matrix)||matrix.length!==16){
    throw new TypeError("graphic resource matrix must contain 16 elements");
  }
  const m=matrix.map(Number);
  if(!m.every(Number.isFinite)){
    throw new RangeError("graphic resource matrix contains non-finite values");
  }
  const rows=[
    [m[0],m[1],m[2]],
    [m[4],m[5],m[6]],
    [m[8],m[9],m[10]]
  ];
  const scales=rows.map(len3);
  const meanScale=scales.reduce((a,b)=>a+b,0)/3;
  const maxRelativeScaleError=meanScale>0
    ? Math.max(...scales.map((v)=>Math.abs(v-meanScale)/meanScale))
    : Infinity;
  const normalizedOrthogonalityError=meanScale>0
    ? Math.max(
        Math.abs(dot3(rows[0],rows[1])),
        Math.abs(dot3(rows[0],rows[2])),
        Math.abs(dot3(rows[1],rows[2]))
      )/(meanScale*meanScale)
    : Infinity;
  const affineTailError=Math.max(
    Math.abs(m[3]),
    Math.abs(m[7]),
    Math.abs(m[11]),
    Math.abs(m[15]-1)
  );
  const uniformRigidScale=
    meanScale>0 &&
    maxRelativeScaleError<=relative_scale_tolerance &&
    normalizedOrthogonalityError<=orthogonality_tolerance &&
    affineTailError<=affine_tolerance;

  return Object.freeze({
    status:uniformRigidScale?"uniform_rigid_scale":"unsupported_transform",
    uniform_rigid_scale:uniformRigidScale,
    length_scale:uniformRigidScale?meanScale:null,
    axis_scales:Object.freeze(scales),
    max_relative_scale_error:maxRelativeScaleError,
    max_normalized_orthogonality_error:normalizedOrthogonalityError,
    affine_tail_error:affineTailError,
    translation:Object.freeze([m[12],m[13],m[14]])
  });
}

/**
 * Parse the DWF eModel descriptor for the single 3D streaming graphic resource.
 *
 * The resource transform is source truth for W3D source-unit -> model-unit
 * scale. OD/wall metadata remain an independent geometry validation, not a
 * scale estimator when this descriptor scale is available.
 */
export function parseDwfEModelDescriptor(xml){
  if(typeof xml!=="string")throw new TypeError("descriptor XML must be a string");

  const unitMatch=/<(?:[A-Za-z_][\w.-]*:)?Units\b([^>]*)\/?\s*>/s.exec(xml);
  if(!unitMatch)throw new RangeError("eModel Units element not found");
  const unitAttrs=parseAttributes(unitMatch[1]);
  const unit=unitAttrs.type??null;
  if(!unit)throw new RangeError("eModel Units type is missing");

  const resourcePattern=/<(?:[A-Za-z_][\w.-]*:)?GraphicResource\b([^>]*)>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?GraphicResource>/g;
  const resources=[];
  for(const match of xml.matchAll(resourcePattern)){
    const attrs=parseAttributes(match[1]);
    if(attrs.role!=="3d streaming graphics")continue;
    resources.push({attrs,body:match[2]});
  }
  if(resources.length!==1){
    throw new RangeError(
      `expected exactly one 3d streaming GraphicResource, found ${resources.length}`
    );
  }

  const {attrs,body}=resources[0];
  const transform=finiteMatrix(
    attrs.transform,
    "3d GraphicResource transform"
  );
  const transformAnalysis=analyzeGraphicResourceTransform(transform);

  const properties={};
  const propertyPattern=/<(?:[A-Za-z_][\w.-]*:)?Property\b([^>]*)\/?\s*>/g;
  for(const match of body.matchAll(propertyPattern)){
    const property=parseAttributes(match[1]);
    if(property.name)properties[property.name]=property.value??null;
  }

  const polygonHandedness=properties._PolygonHandedness??null;
  if(
    polygonHandedness!==null &&
    polygonHandedness!=="left" &&
    polygonHandedness!=="right"
  ){
    throw new RangeError(
      `unsupported _PolygonHandedness value ${polygonHandedness}`
    );
  }

  const scaleMmPerSourceUnit=
    unit==="mm" && transformAnalysis.uniform_rigid_scale
      ? transformAnalysis.length_scale
      : null;

  return Object.freeze({
    status:
      scaleMmPerSourceUnit!=null && polygonHandedness!=null
        ?"exact"
        :"unresolved",
    production_ready:false,
    model_unit:unit,
    w3d:Object.freeze({
      href:attrs.href??null,
      mime:attrs.mime??null,
      role:attrs.role,
      size:attrs.size==null?null:Number(attrs.size),
      object_id:attrs.objectId??null,
      transform:Object.freeze(transform),
      transform_analysis:transformAnalysis,
      scale_mm_per_source_unit:scaleMmPerSourceUnit,
      polygon_handedness:polygonHandedness
    }),
    blocker:
      scaleMmPerSourceUnit==null
        ?"3D GraphicResource transform is not a supported uniform source-unit to millimetre scale."
        : polygonHandedness==null
          ?"_PolygonHandedness is missing from 3D GraphicResource properties."
          :null
  });
}
