import { prepareDwfxTubeImport } from "./tube-import-pipeline.mjs";

/**
 * Prepare a set of exactly linked DWFx tube parts without hiding partial
 * failures. Every part keeps its own stage/blocker and successful tubes remain
 * production-blocked until downstream release gates pass.
 */
export function prepareDwfxAssemblyImport({
  opcode_stream,
  descriptor,
  source_file,
  hsf_version,
  parts,
  prepareTube=prepareDwfxTubeImport
}){
  if(typeof prepareTube!=="function"){
    throw new TypeError("prepareTube must be a function");
  }
  if(!Array.isArray(parts)||parts.length===0){
    throw new RangeError("parts must be a non-empty array");
  }

  const seen=new Set();
  const duplicates=[];
  for(const part of parts){
    const number=String(part?.part_number??"");
    if(!number) throw new RangeError("every assembly part requires part_number");
    if(seen.has(number)) duplicates.push(number);
    seen.add(number);
  }
  if(duplicates.length){
    return Object.freeze({
      status:"blocked",
      editable_ready:false,
      production_ready:false,
      part_count:parts.length,
      editable_count:0,
      blocked_count:parts.length,
      duplicate_part_numbers:Object.freeze([...new Set(duplicates)]),
      results:Object.freeze([]),
      tubes:Object.freeze([]),
      blocker:"Duplicate part_number values make assembly linkage ambiguous."
    });
  }

  const results=parts.map((part)=>prepareTube({
    opcode_stream,
    decoded_variation_segment:part.decoded_variation_segment,
    include_library:part.include_library,
    descriptor,
    source_file,
    part_number:part.part_number,
    hsf_version,
    outer_diameter_mm:part.outer_diameter_mm,
    wall_thickness_mm:part.wall_thickness_mm,
    developed_length_mm:part.developed_length_mm,
    metadata:part.metadata??null,
    recognition_summary:part.recognition_summary??null
  }));

  const tubes=results
    .filter((result)=>result?.status==="legacy_tube_candidate"&&result?.tube)
    .map((result)=>result.tube);
  const blocked=results
    .map((result,index)=>({result,index,part_number:String(parts[index].part_number)}))
    .filter((entry)=>entry.result?.status!=="legacy_tube_candidate")
    .map((entry)=>Object.freeze({
      part_number:entry.part_number,
      stage:entry.result?.stage??"unknown",
      blocker:entry.result?.blocker??"Unknown import blocker."
    }));

  return Object.freeze({
    status:blocked.length===0?"assembly_candidate":"partial",
    editable_ready:blocked.length===0,
    production_ready:false,
    part_count:parts.length,
    editable_count:tubes.length,
    blocked_count:blocked.length,
    duplicate_part_numbers:Object.freeze([]),
    results:Object.freeze(results),
    tubes:Object.freeze(tubes),
    blocked_parts:Object.freeze(blocked),
    blocker:blocked.length===0
      ?"All linked tube parts are editable; production release remains a separate downstream gate."
      :"One or more linked tube parts remain blocked and were not dropped from the assembly report."
  });
}
