import { decodeUniqueHsfNamedSegment } from "./hsf-segment-linkage.mjs";

/**
 * Decode every exact geometric-variation segment referenced by an assembly
 * import plan. Segment names come only from exact source linkage.
 */
export function hydrateDwfxAssemblyVariationSegments({
  opcode_stream,
  plan,
  hsf_version=null,
  decodeSegment=decodeUniqueHsfNamedSegment
}){
  if(typeof decodeSegment!=="function"){
    throw new TypeError("decodeSegment must be a function");
  }
  if(!plan||plan.status!=="exact"||!Array.isArray(plan.parts)){
    throw new RangeError("exact assembly import plan is required");
  }

  const hydrated=[];
  const blocked=[];
  for(const part of plan.parts){
    const name=String(part?.variation_segment??"");
    if(!/^\d+$/.test(name)){
      blocked.push(Object.freeze({
        part_number:String(part?.part_number??""),
        stage:"variation_segment",
        blocker:"Exact numeric geometric-variation segment name is required."
      }));
      hydrated.push(Object.freeze({
        ...part,
        decoded_variation_segment:null,
        requires_decoded_variation_segment:true
      }));
      continue;
    }

    let decoded;
    try{
      decoded=decodeSegment(
        opcode_stream,
        name,
        {
          hsfVersion:hsf_version??plan.hsf_version??null,
          attachSegmentPath:true,
          stopAfterRootSegmentClose:true,
          maxOpcodes:1_000_000
        }
      );
    }catch(error){
      blocked.push(Object.freeze({
        part_number:String(part.part_number),
        stage:"variation_segment",
        blocker:error?.message??String(error)
      }));
      hydrated.push(Object.freeze({
        ...part,
        decoded_variation_segment:null,
        requires_decoded_variation_segment:true
      }));
      continue;
    }

    if(!decoded||decoded.status!=="exact"||decoded.root_segment_complete!==true){
      blocked.push(Object.freeze({
        part_number:String(part.part_number),
        stage:"variation_segment",
        blocker:
          decoded?.unsupported_variant??
          "Geometric-variation segment did not decode completely."
      }));
      hydrated.push(Object.freeze({
        ...part,
        decoded_variation_segment:decoded??null,
        requires_decoded_variation_segment:true
      }));
      continue;
    }

    hydrated.push(Object.freeze({
      ...part,
      decoded_variation_segment:decoded,
      requires_decoded_variation_segment:false
    }));
  }

  return Object.freeze({
    status:blocked.length===0?"exact":"partial",
    production_ready:false,
    source_file:plan.source_file??null,
    hsf_version:hsf_version??plan.hsf_version??null,
    part_count:hydrated.length,
    hydrated_count:hydrated.length-blocked.length,
    blocked_count:blocked.length,
    parts:Object.freeze(hydrated),
    blocked_parts:Object.freeze(blocked),
    blocker:blocked.length===0
      ?"Every exact variation segment decoded to its root close."
      :"One or more exact variation segments remain blocked; none were replaced by nearest-segment guesses."
  });
}
