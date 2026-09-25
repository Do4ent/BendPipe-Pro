import { parseZipCentralDirectory } from "./zip-directory.mjs";
import {
  extractZipEntry,
  inflateRawWithDecompressionStream
} from "./zip-entry-extractor.mjs";
import { parseDwfEModelDescriptor } from "./model-descriptor.mjs";

function normalizePath(value){
  return String(value??"").replace(/\\/g,"/").replace(/^\/+/, "");
}

function decodeUtf8(bytes){
  return new TextDecoder("utf-8",{fatal:false}).decode(bytes).replace(/^\uFEFF/,"");
}

async function extractEntry(input,entry,inflateRaw){
  return extractZipEntry(input,entry,{
    inflateRaw:
      inflateRaw ??
      (entry.compression_method===8
        ? inflateRawWithDecompressionStream
        : undefined)
  });
}

/**
 * Resolve the single 3D streaming model directly from raw DWFx bytes.
 *
 * Safety rules:
 * - exactly one W3D resource must exist;
 * - descriptor candidates are parsed, never selected by ordinal position;
 * - exactly one exact descriptor must reference that W3D href;
 * - descriptor scale and polygon handedness must both be exact.
 */
export async function intakeDwfxModelResources(
  bytes,
  {
    dwfx_file,
    inflateRaw=null
  }={}
){
  const sourceFile=String(dwfx_file??"");
  if(!sourceFile) throw new RangeError("dwfx_file is required");

  const directory=parseZipCentralDirectory(bytes);
  const w3dEntries=directory.entries.filter((entry)=>
    entry.path.toLowerCase().endsWith(".w3d")
  );
  if(w3dEntries.length!==1){
    return Object.freeze({
      status:"blocked",
      production_ready:false,
      source_file:sourceFile,
      w3d_resource_count:w3dEntries.length,
      descriptor_candidate_count:0,
      descriptor_match_count:0,
      descriptor:null,
      w3d:null,
      blocker:
        w3dEntries.length===0
          ?"No W3D resource found in DWFx package."
          :"Multiple W3D resources are present; exact model selection is ambiguous."
    });
  }

  const w3dEntry=w3dEntries[0];
  const descriptorEntries=directory.entries.filter((entry)=>{
    const path=normalizePath(entry.path).toLowerCase();
    return path.endsWith("/descriptor.xml")||path==="descriptor.xml";
  });

  const matches=[];
  const diagnostics=[];
  for(const entry of descriptorEntries){
    try{
      const descriptorBytes=await extractEntry(bytes,entry,inflateRaw);
      const xml=decodeUtf8(descriptorBytes);
      const descriptor=parseDwfEModelDescriptor(xml);
      const href=normalizePath(descriptor.w3d?.href);
      const target=normalizePath(w3dEntry.path);
      diagnostics.push(Object.freeze({
        package_path:entry.path,
        parse_status:descriptor.status,
        w3d_href:descriptor.w3d?.href??null,
        href_matches_w3d:href===target
      }));
      if(descriptor.status==="exact"&&href===target){
        matches.push(Object.freeze({
          entry,
          descriptor,
          xml
        }));
      }
    }catch(error){
      diagnostics.push(Object.freeze({
        package_path:entry.path,
        parse_status:"error",
        error:error?.message??String(error),
        w3d_href:null,
        href_matches_w3d:false
      }));
    }
  }

  if(matches.length!==1){
    return Object.freeze({
      status:"blocked",
      production_ready:false,
      source_file:sourceFile,
      w3d_resource_count:1,
      descriptor_candidate_count:descriptorEntries.length,
      descriptor_match_count:matches.length,
      descriptor:null,
      w3d:Object.freeze({
        package_path:w3dEntry.path,
        size:w3dEntry.uncompressed_size
      }),
      diagnostics:Object.freeze(diagnostics),
      blocker:
        matches.length===0
          ?"No exact eModel descriptor uniquely references the W3D resource."
          :"Multiple exact eModel descriptors reference the same W3D resource."
    });
  }

  const selected=matches[0];
  const w3dBytes=await extractEntry(bytes,w3dEntry,inflateRaw);

  return Object.freeze({
    status:"exact",
    production_ready:false,
    source_file:sourceFile,
    descriptor_candidate_count:descriptorEntries.length,
    descriptor_match_count:1,
    descriptor_package_path:selected.entry.path,
    descriptor:selected.descriptor,
    w3d:Object.freeze({
      package_path:w3dEntry.path,
      size:w3dEntry.uncompressed_size,
      bytes:w3dBytes
    }),
    diagnostics:Object.freeze(diagnostics),
    blocker:
      "Raw DWFx model resources are resolved exactly; metadata/linkage extraction and geometry recognition remain downstream stages."
  });
}
