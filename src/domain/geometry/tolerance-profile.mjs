const DEFAULTS=Object.freeze({
  point_tolerance_mm:0.01,
  linear_tolerance_mm:0.01,
  angular_tolerance_deg:0.05,
  coplanar_tolerance_mm:0.02,
  circle_arc_fit_tolerance_mm:0.10,
  tangent_tolerance_deg:0.05,
  cursor_capture_radius_px:12
});

export const GEOMETRY_TOLERANCE_FIELDS=Object.freeze([
  "point_tolerance_mm",
  "linear_tolerance_mm",
  "angular_tolerance_deg",
  "coplanar_tolerance_mm",
  "circle_arc_fit_tolerance_mm",
  "tangent_tolerance_deg"
]);

export const DEFAULT_GEOMETRY_TOLERANCE_PROFILE=DEFAULTS;

function finiteNonNegative(value,name,{min=0}={}){
  const n=Number(value);
  if(!Number.isFinite(n)||n<min)throw new RangeError(name+" must be finite and >= "+min);
  return n;
}

export function normalizeGeometryToleranceProfile(input={}){
  return Object.freeze({
    point_tolerance_mm:finiteNonNegative(input.point_tolerance_mm??DEFAULTS.point_tolerance_mm,"point_tolerance_mm"),
    linear_tolerance_mm:finiteNonNegative(input.linear_tolerance_mm??DEFAULTS.linear_tolerance_mm,"linear_tolerance_mm"),
    angular_tolerance_deg:finiteNonNegative(input.angular_tolerance_deg??DEFAULTS.angular_tolerance_deg,"angular_tolerance_deg"),
    coplanar_tolerance_mm:finiteNonNegative(input.coplanar_tolerance_mm??DEFAULTS.coplanar_tolerance_mm,"coplanar_tolerance_mm"),
    circle_arc_fit_tolerance_mm:finiteNonNegative(input.circle_arc_fit_tolerance_mm??DEFAULTS.circle_arc_fit_tolerance_mm,"circle_arc_fit_tolerance_mm"),
    tangent_tolerance_deg:finiteNonNegative(input.tangent_tolerance_deg??DEFAULTS.tangent_tolerance_deg,"tangent_tolerance_deg"),
    cursor_capture_radius_px:finiteNonNegative(input.cursor_capture_radius_px??DEFAULTS.cursor_capture_radius_px,"cursor_capture_radius_px",{min:1})
  });
}

export function ensureProjectGeometryToleranceProfile(project){
  if(!project||typeof project!=="object")throw new TypeError("project is required");
  const normalized=normalizeGeometryToleranceProfile(project.geometry_tolerance_profile??{});
  project.geometry_tolerance_profile={...normalized};
  return project.geometry_tolerance_profile;
}

export function mathematicalToleranceProfile(input={}){
  const profile=normalizeGeometryToleranceProfile(input);
  const out={};
  for(const key of GEOMETRY_TOLERANCE_FIELDS)out[key]=profile[key];
  return Object.freeze(out);
}

export function snapSettingsFromToleranceProfile(profileInput={},base={}){
  const profile=normalizeGeometryToleranceProfile(profileInput);
  return Object.freeze({
    ...base,
    cursor_radius_px:profile.cursor_capture_radius_px,
    point_tolerance_mm:profile.point_tolerance_mm,
    linear_tolerance_mm:profile.linear_tolerance_mm,
    angular_tolerance_deg:profile.angular_tolerance_deg,
    coplanar_tolerance_mm:profile.coplanar_tolerance_mm,
    tangent_tolerance_deg:profile.tangent_tolerance_deg
  });
}

export function recognitionSettingsFromToleranceProfile(profileInput={},base={}){
  const profile=normalizeGeometryToleranceProfile(profileInput);
  return Object.freeze({
    ...base,
    line_tolerance_mm:profile.linear_tolerance_mm,
    arc_radial_tolerance_mm:profile.circle_arc_fit_tolerance_mm,
    arc_plane_tolerance_mm:profile.coplanar_tolerance_mm
  });
}

function clamp(value,min,max){return Math.max(min,Math.min(max,value));}

export function createGeometryFitEvidence({
  mode="Fitted",
  fitting_error_mm=0,
  fitting_error_deg=0,
  tolerance_mm=null,
  tolerance_deg=null,
  confidence=null,
  evidence=[]
}={}){
  const status=String(mode);
  if(status!=="Exact"&&status!=="Fitted")throw new RangeError("mode must be Exact or Fitted");
  const errorMm=finiteNonNegative(fitting_error_mm,"fitting_error_mm");
  const errorDeg=finiteNonNegative(fitting_error_deg,"fitting_error_deg");
  const tolMm=tolerance_mm==null?null:finiteNonNegative(tolerance_mm,"tolerance_mm");
  const tolDeg=tolerance_deg==null?null:finiteNonNegative(tolerance_deg,"tolerance_deg");
  let inferredConfidence=confidence;
  if(inferredConfidence==null){
    const ratios=[];
    if(tolMm!=null&&tolMm>0)ratios.push(errorMm/tolMm);
    if(tolDeg!=null&&tolDeg>0)ratios.push(errorDeg/tolDeg);
    inferredConfidence=ratios.length?1-Math.max(...ratios):status==="Exact"?1:0.95;
  }
  const numericConfidence=Number(inferredConfidence);
  if(!Number.isFinite(numericConfidence))throw new TypeError("confidence must be finite");
  return Object.freeze({
    geometry_status:status,
    fitting_error:Object.freeze({mm:errorMm,deg:errorDeg}),
    tolerance:Object.freeze({mm:tolMm,deg:tolDeg}),
    confidence:clamp(numericConfidence,0,1),
    evidence:Object.freeze((Array.isArray(evidence)?evidence:[evidence]).filter(Boolean).map(item=>
      item&&typeof item==="object"?Object.freeze(structuredClone(item)):String(item)
    ))
  });
}

export function exactGeometryEvidence(evidence=[]){
  return createGeometryFitEvidence({mode:"Exact",confidence:1,evidence});
}
