import { decodeHsfOpcodePrefix } from "./hsf-envelope.mjs";

function asBytes(input){
  if(input instanceof Uint8Array)return input;
  if(input instanceof ArrayBuffer)return new Uint8Array(input);
  if(ArrayBuffer.isView(input)){
    return new Uint8Array(input.buffer,input.byteOffset,input.byteLength);
  }
  throw new TypeError("HSF display index input must be binary");
}

function printableAscii(bytes,start,end){
  let text="";
  for(let i=start;i<end;i+=1){
    const code=bytes[i];
    if(code<0x20||code>0x7e)return null;
    text+=String.fromCharCode(code);
  }
  return text;
}

/**
 * Build a display-only random-access index for named HSF segments.
 *
 * The byte scan itself is never manufacturing evidence. Every lookup is
 * validated by a synchronized opcode decode that must open the requested name
 * and reach the matching root close.
 */
export function buildDisplayHsfSegmentIndex(input){
  const bytes=asBytes(input);
  const byName=new Map();

  for(let offset=0;offset+2<=bytes.length;offset+=1){
    if(bytes[offset]!==0x28)continue; // TKE_Open_Segment
    const length=bytes[offset+1];
    if(length===0||offset+2+length>bytes.length)continue;
    const name=printableAscii(bytes,offset+2,offset+2+length);
    if(name==null)continue;
    const candidates=byName.get(name)??[];
    candidates.push(offset);
    byName.set(name,candidates);
  }

  return Object.freeze({
    status:"display_index",
    byte_length:bytes.length,
    name_count:byName.size,
    by_name:byName,
    production_ready:false,
    canonical_ready:false
  });
}

export function decodeIndexedDisplaySegment(
  input,
  index,
  name,
  {
    hsfVersion=null,
    maxOpcodes=1_000_000,
    attachSegmentPath=true
  }={}
){
  const bytes=asBytes(input);
  if(!index||!(index.by_name instanceof Map)){
    throw new TypeError("display HSF segment index is required");
  }
  const text=String(name??"");
  if(!text)throw new RangeError("display segment name is required");

  const candidates=index.by_name.get(text)??[];
  const accepted=[];
  const diagnostics=[];

  for(const offset of candidates){
    try{
      const decoded=decodeHsfOpcodePrefix(bytes.subarray(offset),{
        hsfVersion,
        maxOpcodes,
        attachSegmentPath,
        stopAfterRootSegmentClose:true
      });
      const firstOpen=decoded.entities.find(
        (entity)=>entity?.kind==="segment"&&entity.action==="open"
      );
      if(firstOpen?.name!==text||decoded.root_segment_complete!==true){
        diagnostics.push(Object.freeze({
          offset,
          status:"rejected",
          opened_name:firstOpen?.name??null,
          root_segment_complete:decoded.root_segment_complete===true,
          unsupported_opcode:decoded.unsupported_opcode??null,
          unsupported_variant:decoded.unsupported_variant??null
        }));
        continue;
      }
      accepted.push(Object.freeze({
        offset,
        decoded
      }));
    }catch(error){
      diagnostics.push(Object.freeze({
        offset,
        status:"decode_error",
        error:error?.message??String(error)
      }));
    }
  }

  if(accepted.length!==1){
    return Object.freeze({
      status:accepted.length===0?"unresolved":"ambiguous",
      name:text,
      candidate_count:candidates.length,
      validated_count:accepted.length,
      offset:null,
      entities:Object.freeze([]),
      root_segment_complete:false,
      diagnostics:Object.freeze(diagnostics),
      production_ready:false,
      canonical_ready:false
    });
  }

  const selected=accepted[0];
  const entities=Object.freeze(
    selected.decoded.entities.map((entity)=>Object.freeze({
      ...entity,
      absolute_source_offset:
        Number.isInteger(entity.source_offset)
          ? selected.offset+entity.source_offset
          : null
    }))
  );

  return Object.freeze({
    status:"exact_display",
    name:text,
    candidate_count:candidates.length,
    validated_count:1,
    offset:selected.offset,
    entities,
    root_segment_complete:true,
    next_absolute_offset:selected.offset+selected.decoded.next_offset,
    diagnostics:Object.freeze(diagnostics),
    production_ready:false,
    canonical_ready:false
  });
}
