import { intakeRawDwfxEvidence } from "./raw-dwfx-evidence.mjs";
import { resolveRawHsfPartLinkage } from "./raw-hsf-linkage.mjs";
import { prepareTrustedDwfxProjectImport } from "./trusted-project-import.mjs";

/**
 * Primary trusted import entry point for one raw DWFx file.
 *
 * raw package -> exact source evidence -> HSF linkage -> trusted project import.
 * Every stage is fail-closed and production remains blocked downstream.
 */
export async function prepareTrustedDwfxFileImport({
  bytes,
  dwfx_file,
  project_id="dwfx-project",
  project_name=null,
  bbox=null,
  inflateRaw=null,
  intakeRaw=intakeRawDwfxEvidence,
  resolveHsfLinkage=resolveRawHsfPartLinkage,
  prepareProject=prepareTrustedDwfxProjectImport
}){
  for(const [label,fn] of [
    ["intakeRaw",intakeRaw],
    ["resolveHsfLinkage",resolveHsfLinkage],
    ["prepareProject",prepareProject]
  ]){
    if(typeof fn!=="function") throw new TypeError(label+" must be a function");
  }

  const sourceFile=String(dwfx_file??"");
  if(!sourceFile) throw new RangeError("dwfx_file is required");

  const raw=await intakeRaw(bytes,{
    dwfx_file:sourceFile,
    inflateRaw
  });
  if(!raw||raw.status!=="exact"){
    return Object.freeze({
      status:"blocked",
      stage:raw?.stage??"raw_evidence",
      editable_ready:false,
      production_ready:false,
      raw:raw??null,
      hsf_linkage:null,
      project_import:null,
      package:null,
      blocker:raw?.blocker??"Raw DWFx evidence intake failed."
    });
  }

  const hsfLinkage=await resolveHsfLinkage({
    w3d_bytes:raw.model.w3d.bytes,
    source_file:sourceFile,
    graphics_links:raw.graphics_links
  });
  if(!hsfLinkage||hsfLinkage.status!=="exact"){
    return Object.freeze({
      status:"blocked",
      stage:"hsf_linkage",
      editable_ready:false,
      production_ready:false,
      raw,
      hsf_linkage:hsfLinkage??null,
      project_import:null,
      package:null,
      blocker:hsfLinkage?.blocker??"Exact HSF part linkage failed."
    });
  }

  const includeLinkage=Object.freeze({
    source_file:sourceFile,
    hsf_version:hsfLinkage.hsf_version,
    parts:Object.freeze(
      hsfLinkage.parts.map((part)=>Object.freeze({
        part_number:part.part_number,
        variation_segment:part.variation_segment,
        variation_segment_offset:part.variation_segment_offset,
        variation_include:part.variation_include,
        variation_include_offset:part.variation_include_offset
      }))
    )
  });

  const projectImport=await prepareProject({
    opcode_stream:hsfLinkage.opcode_stream,
    metadata_recognition:raw.metadata,
    include_linkage:includeLinkage,
    descriptor:raw.model.descriptor,
    hsf_version:hsfLinkage.hsf_version,
    project_id,
    project_name:project_name??sourceFile.replace(/\.dwfx$/i,""),
    bbox
  });

  if(
    !projectImport||
    projectImport.status!=="project_import_candidate"||
    projectImport.editable_ready!==true
  ){
    return Object.freeze({
      status:"blocked",
      stage:"project_import",
      editable_ready:false,
      production_ready:false,
      raw,
      hsf_linkage:hsfLinkage,
      project_import:projectImport??null,
      package:null,
      blocker:
        projectImport?.blocker??
        "Trusted project import did not produce an editable project candidate."
    });
  }

  return Object.freeze({
    status:"dwfx_project_candidate",
    stage:"complete",
    editable_ready:true,
    production_ready:false,
    source_file:sourceFile,
    raw,
    hsf_linkage:hsfLinkage,
    project_import:projectImport,
    package:projectImport.package,
    blocker:
      "DWFx file produced an editable TubeBenderProject candidate. Manufacturing remains blocked until existing tooling/style/machine and production-release gates pass."
  });
}
