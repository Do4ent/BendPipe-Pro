import { decodeHsfEnvelope } from "./hsf-envelope.mjs";
import {
  decodeUniqueHsfNamedSegment,
  firstIncludedLibraryReference
} from "./hsf-segment-linkage.mjs";

/**
 * Resolve exact part_number -> geometricVariation -> Include Library linkage
 * from raw W3D bytes and exact graphics-link records.
 *
 * No ordinal scanning, nearest-name fallback or byte resynchronization is used.
 */
export async function resolveRawHsfPartLinkage({
  w3d_bytes,
  source_file,
  graphics_links,
  decodeEnvelope=decodeHsfEnvelope,
  decodeSegment=decodeUniqueHsfNamedSegment
}){
  if(typeof decodeEnvelope!=="function"){
    throw new TypeError("decodeEnvelope must be a function");
  }
  if(typeof decodeSegment!=="function"){
    throw new TypeError("decodeSegment must be a function");
  }
  if(!Array.isArray(graphics_links)||graphics_links.length===0){
    throw new RangeError("graphics_links must be a non-empty array");
  }

  const unresolvedGraphics=graphics_links.filter((item)=>item?.status!=="exact");
  if(unresolvedGraphics.length){
    return Object.freeze({
      status:"blocked",
      production_ready:false,
      source_file:String(source_file??""),
      hsf_version:null,
      opcode_stream:null,
      parts:Object.freeze([]),
      blocked_parts:Object.freeze(
        unresolvedGraphics.map((item)=>Object.freeze({
          part_number:String(item?.part_number??""),
          stage:"graphics_linkage",
          blocker:"Exact graphics linkage is required before HSF segment resolution."
        }))
      ),
      blocker:"One or more part graphics links are unresolved."
    });
  }

  const envelope=await decodeEnvelope(w3d_bytes);
  if(!envelope||!(envelope.opcode_stream instanceof Uint8Array)){
    throw new TypeError("decodeEnvelope must return opcode_stream Uint8Array");
  }

  const parts=[];
  const blocked=[];
  for(const link of graphics_links){
    const partNumber=String(link.part_number??"");
    const variation=Number(link.geometric_variation);
    if(!partNumber||!Number.isInteger(variation)||variation<0){
      blocked.push(Object.freeze({
        part_number:partNumber,
        stage:"variation_segment",
        blocker:"Exact non-negative geometricVariation ID is required."
      }));
      continue;
    }

    const decoded=decodeSegment(
      envelope.opcode_stream,
      String(variation),
      {
        hsfVersion:envelope.hsf_version,
        attachSegmentPath:true,
        stopAfterRootSegmentClose:true,
        maxOpcodes:1_000_000
      }
    );
    if(!decoded||decoded.status!=="exact"||decoded.root_segment_complete!==true){
      blocked.push(Object.freeze({
        part_number:partNumber,
        stage:"variation_segment",
        blocker:
          decoded?.unsupported_variant??
          "Exact geometricVariation segment did not decode to its root close."
      }));
      continue;
    }

    const include=firstIncludedLibraryReference(decoded);
    if(include.status!=="exact"){
      blocked.push(Object.freeze({
        part_number:partNumber,
        stage:"include_library",
        blocker:
          include.status==="ambiguous"
            ?"Geometric variation contains multiple Include Library references."
            :"Geometric variation contains no exact Include Library reference."
      }));
      continue;
    }

    parts.push(Object.freeze({
      part_number:partNumber,
      graphics_node:Number(link.graphics_node),
      geometric_variation:variation,
      variation_segment:String(variation),
      variation_segment_offset:decoded.offset,
      variation_include:include.name,
      variation_include_offset:include.source_offset,
      decoded_variation_segment:decoded
    }));
  }

  return Object.freeze({
    status:blocked.length===0&&parts.length===graphics_links.length
      ?"exact"
      :"partial",
    production_ready:false,
    source_file:String(source_file??""),
    hsf_version:String(envelope.hsf_version??""),
    opcode_stream:envelope.opcode_stream,
    envelope,
    part_count:graphics_links.length,
    linked_count:parts.length,
    blocked_count:blocked.length,
    parts:Object.freeze(parts),
    blocked_parts:Object.freeze(blocked),
    blocker:blocked.length===0
      ?"Every exact geometricVariation segment resolved to one exact Include Library reference."
      :"One or more parts remain blocked; no guessed Include Library linkage was created."
  });
}
