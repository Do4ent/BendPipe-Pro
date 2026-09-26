import { buildDwfxAssemblyImportPlan } from "./assembly-import-plan.mjs";
import { hydrateDwfxAssemblyVariationSegments } from "./assembly-variation-hydration.mjs";
import { prepareDwfxAssemblyImport } from "./assembly-import-pipeline.mjs";
import { buildLegacyProjectPackageFromAssembly } from "./legacy-project-package.mjs";

/**
 * Compose the trusted DWFx project import path:
 * exact metadata/linkage plan -> exact variation hydration ->
 * per-tube trusted import -> VC207R7 project package.
 *
 * Every blocker remains stage-specific and no later stage is attempted after
 * an unsafe or partial result.
 */
export function prepareTrustedDwfxProjectImport({
  opcode_stream,
  metadata_recognition,
  include_linkage,
  descriptor,
  hsf_version=null,
  project_id="dwfx-project",
  project_name="Imported DWFx project",
  bbox=null,
  reference_scene=null,
  buildPlan=buildDwfxAssemblyImportPlan,
  hydrateVariations=hydrateDwfxAssemblyVariationSegments,
  prepareAssembly=prepareDwfxAssemblyImport,
  buildProjectPackage=buildLegacyProjectPackageFromAssembly
}){
  for(const [label,fn] of [
    ["buildPlan",buildPlan],
    ["hydrateVariations",hydrateVariations],
    ["prepareAssembly",prepareAssembly],
    ["buildProjectPackage",buildProjectPackage]
  ]){
    if(typeof fn!=="function") throw new TypeError(label+" must be a function");
  }

  const plan=buildPlan({
    metadataRecognition:metadata_recognition,
    includeLinkage:include_linkage
  });
  if(!plan||plan.status!=="exact"){
    return Object.freeze({
      status:"blocked",
      stage:"plan",
      editable_ready:false,
      production_ready:false,
      plan:plan??null,
      hydration:null,
      assembly:null,
      project_package:null,
      blocker:
        Array.isArray(plan?.issues)&&plan.issues.length
          ? plan.issues.join("; ")
          : "Exact DWFx assembly import plan could not be built."
    });
  }

  const hydration=hydrateVariations({
    opcode_stream,
    plan,
    hsf_version:hsf_version??plan.hsf_version??null
  });
  if(!hydration||hydration.status!=="exact"){
    return Object.freeze({
      status:"blocked",
      stage:"variation_hydration",
      editable_ready:false,
      production_ready:false,
      plan,
      hydration:hydration??null,
      assembly:null,
      project_package:null,
      blocker:
        hydration?.blocker??
        "One or more exact geometric-variation segments did not decode completely."
    });
  }

  const assembly=prepareAssembly({
    opcode_stream,
    descriptor,
    source_file:plan.source_file,
    hsf_version:hsf_version??plan.hsf_version??null,
    parts:hydration.parts
  });
  if(!assembly||assembly.status!=="assembly_candidate"||assembly.editable_ready!==true){
    return Object.freeze({
      status:"blocked",
      stage:"assembly",
      editable_ready:false,
      production_ready:false,
      plan,
      hydration,
      assembly:assembly??null,
      project_package:null,
      blocker:
        assembly?.blocker??
        "Not every linked tube part produced an editable trusted candidate."
    });
  }

  const projectPackage=buildProjectPackage({
    assembly,
    project_id,
    project_name,
    bbox,
    reference_scene
  });
  if(!projectPackage||projectPackage.status!=="project_package_candidate"){
    return Object.freeze({
      status:"blocked",
      stage:"project_package",
      editable_ready:false,
      production_ready:false,
      plan,
      hydration,
      assembly,
      project_package:projectPackage??null,
      blocker:
        projectPackage?.blocker??
        "Legacy project package could not be built."
    });
  }

  return Object.freeze({
    status:"project_import_candidate",
    stage:"complete",
    editable_ready:true,
    production_ready:false,
    plan,
    hydration,
    assembly,
    project_package:projectPackage,
    package:projectPackage.package,
    blocker:
      "DWFx project is ready for project-open as editable geometry; production release remains blocked by existing downstream gates."
  });
}
