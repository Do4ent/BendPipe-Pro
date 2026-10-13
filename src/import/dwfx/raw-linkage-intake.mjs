import { parseZipCentralDirectory } from "./zip-directory.mjs";
import {
  extractZipEntry,
  inflateRawWithDecompressionStream
} from "./zip-entry-extractor.mjs";
import {
  parseDwfxContentObjects,
  parseDwfxReferenceNodes,
  parseDwfxInstances,
  buildDwfxGraphicsLinkIndex
} from "./content-linkage.mjs";

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

function singleCandidate(candidates,label){
  if(candidates.length!==1){
    return {
      status:"blocked",
      blocker:
        candidates.length===0
          ? "No "+label+" XML resource was identified."
          : "Multiple "+label+" XML resources were identified; selection is ambiguous."
    };
  }
  return {status:"exact",candidate:candidates[0]};
}

/**
 * Discover the three exact DWFx XML resources needed for object->graphics-node
 * linkage by parsing their actual element content, not by GUID filename.
 */
export async function intakeDwfxLinkageXml(
  bytes,
  {inflateRaw=null}={}
){
  const directory=parseZipCentralDirectory(bytes);
  const xmlEntries=directory.entries.filter((entry)=>
    /\.(?:xml|xaml)$/i.test(entry.path)
  );

  const contentCandidates=[];
  const presentationCandidates=[];
  const definitionCandidates=[];
  const diagnostics=[];

  for(const entry of xmlEntries){
    let xml;
    try{
      xml=decodeUtf8(await extractEntry(bytes,entry,inflateRaw));
    }catch(error){
      diagnostics.push(Object.freeze({
        package_path:entry.path,
        status:"extract_error",
        error:error?.message??String(error)
      }));
      continue;
    }

    let objects=[],referenceNodes=[],instances=[];
    try{ objects=parseDwfxContentObjects(xml); }catch{}
    try{ referenceNodes=parseDwfxReferenceNodes(xml); }catch{}
    try{ instances=parseDwfxInstances(xml); }catch{}

    if(objects.length>0){
      contentCandidates.push(Object.freeze({entry,xml,count:objects.length}));
    }
    if(referenceNodes.length>0){
      presentationCandidates.push(Object.freeze({entry,xml,count:referenceNodes.length}));
    }
    if(instances.length>0){
      definitionCandidates.push(Object.freeze({entry,xml,count:instances.length}));
    }

    if(objects.length||referenceNodes.length||instances.length){
      diagnostics.push(Object.freeze({
        package_path:entry.path,
        status:"candidate",
        object_count:objects.length,
        reference_node_count:referenceNodes.length,
        instance_count:instances.length
      }));
    }
  }

  const content=singleCandidate(contentCandidates,"Content/Object");
  const presentation=singleCandidate(presentationCandidates,"Presentation/ReferenceNode");
  const definition=singleCandidate(definitionCandidates,"ContentDefinition/Instance");

  const failures=[content,presentation,definition].filter((x)=>x.status!=="exact");
  if(failures.length){
    return Object.freeze({
      status:"blocked",
      production_ready:false,
      content_candidate_count:contentCandidates.length,
      presentation_candidate_count:presentationCandidates.length,
      definition_candidate_count:definitionCandidates.length,
      resources:null,
      link_index:null,
      diagnostics:Object.freeze(diagnostics),
      blocker:failures.map((x)=>x.blocker).join("; ")
    });
  }

  const linkIndex=buildDwfxGraphicsLinkIndex({
    contentXml:content.candidate.xml,
    presentationXml:presentation.candidate.xml,
    contentDefinitionXml:definition.candidate.xml
  });

  return Object.freeze({
    status:"exact",
    production_ready:false,
    content_candidate_count:1,
    presentation_candidate_count:1,
    definition_candidate_count:1,
    resources:Object.freeze({
      content:Object.freeze({
        package_path:content.candidate.entry.path,
        xml:content.candidate.xml,
        object_count:content.candidate.count
      }),
      presentation:Object.freeze({
        package_path:presentation.candidate.entry.path,
        xml:presentation.candidate.xml,
        reference_node_count:presentation.candidate.count
      }),
      content_definition:Object.freeze({
        package_path:definition.candidate.entry.path,
        xml:definition.candidate.xml,
        instance_count:definition.candidate.count
      })
    }),
    link_index:linkIndex,
    diagnostics:Object.freeze(diagnostics),
    blocker:
      "Exact DWFx linkage XML resources are resolved; part metadata and HSF segment linkage remain downstream stages."
  });
}
