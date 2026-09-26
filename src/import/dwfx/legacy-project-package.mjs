function cloneFrozen(value){
  if(value==null||typeof value!=="object") return value;
  if(Array.isArray(value)) return Object.freeze(value.map(cloneFrozen));
  const out={};
  for(const [key,item] of Object.entries(value)) out[key]=cloneFrozen(item);
  return Object.freeze(out);
}

function bboxOrNull(value){
  if(value==null) return null;
  if(!value||typeof value!=="object"){
    throw new TypeError("bbox must be an object or null");
  }
  const out={};
  for(const axis of ["x","y","z"]){
    const n=Number(value[axis]);
    if(!Number.isFinite(n)||n<=0){
      throw new RangeError("bbox."+axis+" must be a finite positive number");
    }
    out[axis]=n;
  }
  return Object.freeze(out);
}

/**
 * Build a VC207R7 project package from an assembly import candidate.
 *
 * Exact tube geometry is preserved in each tube.importEvidence. Unknown project
 * corpus dimensions remain null: legacy poNormalizePackage will keep production
 * blocked rather than inventing a frame. No tooling database is injected.
 */
export function buildLegacyProjectPackageFromAssembly({
  assembly,
  project_id="dwfx-project",
  project_name="Imported DWFx project",
  app_version="VC207R7-M1",
  schema_version="2.0",
  bbox=null,
  bbox_anchor=null,
  coordinate_offset=null,
  axis_signs=null,
  reference_scene=null
}){
  if(!assembly||typeof assembly!=="object"){
    throw new TypeError("assembly import result is required");
  }
  if(assembly.status!=="assembly_candidate"||assembly.editable_ready!==true){
    return Object.freeze({
      status:"blocked",
      production_ready:false,
      package:null,
      blocker:"Only a complete editable assembly candidate can become a project package."
    });
  }
  if(!Array.isArray(assembly.tubes)||assembly.tubes.length===0){
    throw new RangeError("assembly candidate must contain at least one tube");
  }

  const projectBbox=bboxOrNull(bbox);
  const project=Object.freeze({
    id:String(project_id),
    name:String(project_name),
    ...(projectBbox?{bbox:projectBbox}:{}),
    ...(bbox_anchor?{bboxAnchor:cloneFrozen(bbox_anchor)}:{}),
    ...(coordinate_offset?{coordinateOffset:cloneFrozen(coordinate_offset)}:{}),
    ...(axis_signs?{axisSigns:cloneFrozen(axis_signs)}:{}),
    referenceScenes:Object.freeze(reference_scene?[cloneFrozen(reference_scene)]:[]),
    tubes:Object.freeze(assembly.tubes.map(cloneFrozen))
  });

  return Object.freeze({
    status:"project_package_candidate",
    production_ready:false,
    bbox_status:projectBbox?"exact_explicit":"unresolved",
    package:Object.freeze({
      type:"TubeBenderProject",
      version:String(app_version),
      appVersion:String(app_version),
      schemaVersion:String(schema_version),
      project
    }),
    blocker:projectBbox
      ?"Project package is editable; manufacturing still requires existing tooling/style/machine production gates."
      :"Project package is editable, but project corpus dimensions are unresolved; legacy project-open must keep production blocked and must not synthesize a bbox."
  });
}
