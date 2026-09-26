import { intakeDwfxModelResources } from "./raw-model-intake.mjs";
import { intakeDwfxLinkageXml } from "./raw-linkage-intake.mjs";
import { extractBentTubeMetadataFromContentXml } from "./raw-metadata-intake.mjs";
import { extractCopperTubeMetadataFromContentXml } from "./copper-tube-metadata.mjs";
import { resolvePartGraphicsLinks } from "./content-linkage.mjs";

/**
 * First raw-file DWFx evidence facade.
 *
 * Resolves:
 * - exact descriptor + unique W3D resource;
 * - exact Content/ReferenceNode/Instance XML resources;
 * - exact bent-tube metadata, or strict copper-tube fallback metadata, from Content Entity properties;
 * - exact part_number -> graphics node / geometric variation linkage.
 *
 * It intentionally stops before HSF Include Library linkage and geometry decode.
 */
export async function intakeRawDwfxEvidence(
  bytes,
  {
    dwfx_file,
    inflateRaw=null
  }={}
){
  const sourceFile=String(dwfx_file??"");
  if(!sourceFile) throw new RangeError("dwfx_file is required");

  const model=await intakeDwfxModelResources(bytes,{
    dwfx_file:sourceFile,
    inflateRaw
  });
  if(model.status!=="exact"){
    return Object.freeze({
      status:"blocked",
      stage:"model_resources",
      production_ready:false,
      model,
      linkage:null,
      metadata:null,
      graphics_links:null,
      blocker:model.blocker
    });
  }

  const linkage=await intakeDwfxLinkageXml(bytes,{inflateRaw});
  if(linkage.status!=="exact"){
    return Object.freeze({
      status:"blocked",
      stage:"linkage_xml",
      production_ready:false,
      model,
      linkage,
      metadata:null,
      graphics_links:null,
      blocker:linkage.blocker
    });
  }

  const bentMetadata=extractBentTubeMetadataFromContentXml(
    linkage.resources.content.xml,
    {source_file:sourceFile}
  );
  const metadata=
    bentMetadata.status==="exact"&&bentMetadata.tubes.length>0
      ? bentMetadata
      : extractCopperTubeMetadataFromContentXml(
          linkage.resources.content.xml,
          {source_file:sourceFile}
        );
  if(metadata.status!=="exact"||metadata.tubes.length===0){
    return Object.freeze({
      status:"blocked",
      stage:"tube_metadata",
      production_ready:false,
      model,
      linkage,
      metadata,
      graphics_links:null,
      blocker:
        metadata.issues?.join("; ")||
        "No exact bent-tube or copper-tube metadata was extracted."
    });
  }

  const partNumbers=metadata.tubes.map((tube)=>tube.part_number);
  const graphicsLinks=resolvePartGraphicsLinks(
    linkage.link_index,
    partNumbers
  );
  const unresolved=graphicsLinks.filter((item)=>item.status!=="exact");
  if(unresolved.length){
    return Object.freeze({
      status:"blocked",
      stage:"graphics_linkage",
      production_ready:false,
      model,
      linkage,
      metadata,
      graphics_links:graphicsLinks,
      blocker:
        "Exact graphics linkage is unresolved for: "+
        unresolved.map((x)=>x.part_number).join(", ")
    });
  }

  return Object.freeze({
    status:"exact",
    stage:"raw_evidence",
    production_ready:false,
    source_file:sourceFile,
    model,
    linkage,
    metadata,
    graphics_links:graphicsLinks,
    tube_count:metadata.tubes.length,
    blocker:
      "Raw DWFx descriptor, W3D resource, tube metadata and graphics-node linkage are exact; HSF Include Library linkage and geometry decode remain downstream stages."
  });
}
