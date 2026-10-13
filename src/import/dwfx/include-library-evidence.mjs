import { decodeUniqueHsfNamedSegment } from "./hsf-segment-linkage.mjs";
import { summarizeDecodedSegment } from "./part-geometry-evidence.mjs";

export function inspectIncludeLibrarySegment(
  opcodeStream,
  name,
  {
    hsfVersion = null,
    maxOpcodes = 1_000_000
  } = {}
) {
  const text=String(name??"");
  if(!text.startsWith("?Include Library/")){
    throw new RangeError("Include Library segment name is required");
  }
  const decoded=decodeUniqueHsfNamedSegment(
    opcodeStream,
    text,
    {
      hsfVersion,
      maxOpcodes,
      attachSegmentPath:true,
      stopAfterRootSegmentClose:true
    }
  );

  return Object.freeze({
    name:text,
    status:decoded.status,
    offset:decoded.offset,
    root_segment_complete:decoded.root_segment_complete===true,
    summary:summarizeDecodedSegment(decoded),
    production_ready:false
  });
}

export function comparePartIncludeLibraryEvidence(
  opcodeStream,
  partIncludeAnchors,
  { hsfVersion = null } = {}
) {
  if(!partIncludeAnchors||typeof partIncludeAnchors!=="object"){
    throw new TypeError("partIncludeAnchors is required");
  }

  const inspectChain=(chain)=>{
    if(!chain||!Array.isArray(chain.includes)||chain.includes.length===0){
      return Object.freeze({
        status:chain?.status??"not_applicable",
        libraries:Object.freeze([]),
        production_ready:false
      });
    }
    const libraries=chain.includes.map((item)=>{
      if(item.status!=="exact"){
        return Object.freeze({
          name:item.name,
          status:item.status,
          evidence:null,
          production_ready:false
        });
      }
      return Object.freeze({
        name:item.name,
        status:"exact",
        evidence:inspectIncludeLibrarySegment(
          opcodeStream,
          item.name,
          {hsfVersion}
        ),
        production_ready:false
      });
    });
    return Object.freeze({
      status:libraries.every((item)=>item.status==="exact")?"exact":"unresolved",
      libraries:Object.freeze(libraries),
      production_ready:false
    });
  };

  return Object.freeze({
    part_number:String(partIncludeAnchors.part_number??""),
    graphics_node:inspectChain(partIncludeAnchors.graphics_node),
    geometric_variation:inspectChain(partIncludeAnchors.geometric_variation),
    preferred_chain:null,
    production_ready:false
  });
}
