function exactNumber(wrapper,label){
  const value=wrapper?.value;
  const n=Number(value);
  if(!Number.isFinite(n)||n<=0){
    throw new RangeError(label+" must be an exact positive metadata value");
  }
  if(wrapper?.truth_category!=="source"||Number(wrapper?.confidence)!==1){
    throw new RangeError(label+" must be exact source metadata");
  }
  return n;
}

function duplicateKeys(records,keyFn){
  const counts=new Map();
  for(const record of records){
    const key=keyFn(record);
    counts.set(key,(counts.get(key)??0)+1);
  }
  return [...counts.entries()]
    .filter(([,count])=>count>1)
    .map(([key])=>key);
}

/**
 * Join exact normalized DWFx metadata to exact variation Include Library
 * linkage by part_number only. No ordinal, label-nearest or geometry-nearest
 * matching is allowed.
 */
export function buildDwfxAssemblyImportPlan({
  metadataRecognition,
  includeLinkage
}){
  if(!metadataRecognition||!Array.isArray(metadataRecognition.tubes)){
    throw new TypeError("normalized metadataRecognition.tubes is required");
  }
  if(!includeLinkage||!Array.isArray(includeLinkage.parts)){
    throw new TypeError("includeLinkage.parts is required");
  }

  const metadataTubes=metadataRecognition.tubes;
  const links=includeLinkage.parts;
  const metadataDuplicates=duplicateKeys(
    metadataTubes,
    (tube)=>String(tube?.part_number??"")
  ).filter(Boolean);
  const linkageDuplicates=duplicateKeys(
    links,
    (link)=>String(link?.part_number??"")
  ).filter(Boolean);

  const metadataSource=String(metadataRecognition.source?.file??"");
  const linkageSource=String(includeLinkage.source_file??"");
  const sourceMismatch=
    metadataSource&&linkageSource&&metadataSource!==linkageSource;

  if(metadataDuplicates.length||linkageDuplicates.length||sourceMismatch){
    return Object.freeze({
      status:"blocked",
      production_ready:false,
      source_file:metadataSource||linkageSource||null,
      hsf_version:includeLinkage.hsf_version??null,
      parts:Object.freeze([]),
      issues:Object.freeze([
        ...(metadataDuplicates.length
          ? ["duplicate metadata part_number: "+metadataDuplicates.join(", ")]
          : []),
        ...(linkageDuplicates.length
          ? ["duplicate linkage part_number: "+linkageDuplicates.join(", ")]
          : []),
        ...(sourceMismatch
          ? ["metadata/linkage source_file mismatch"]
          : [])
      ])
    });
  }

  const linksByPart=new Map(
    links.map((link)=>[String(link.part_number),link])
  );
  const metadataParts=new Set(
    metadataTubes.map((tube)=>String(tube.part_number??""))
  );
  const issues=[];
  const parts=[];

  for(const tube of metadataTubes){
    const partNumber=String(tube?.part_number??"");
    if(!partNumber){
      issues.push("metadata tube is missing part_number");
      continue;
    }
    const link=linksByPart.get(partNumber);
    if(!link){
      issues.push("missing Include Library linkage for "+partNumber);
      continue;
    }
    const includeName=String(link.variation_include??"");
    const variationSegment=String(link.variation_segment??"");
    if(!includeName.startsWith("?Include Library/")){
      issues.push("invalid variation Include Library for "+partNumber);
      continue;
    }
    if(!/^\d+$/.test(variationSegment)){
      issues.push("invalid variation segment for "+partNumber);
      continue;
    }

    const od=exactNumber(
      tube.metadata?.outer_diameter,
      partNumber+" outer diameter"
    );
    const wall=exactNumber(
      tube.metadata?.wall_thickness,
      partNumber+" wall thickness"
    );
    const developed=exactNumber(
      tube.metadata?.developed_length,
      partNumber+" developed length"
    );

    parts.push(Object.freeze({
      part_number:partNumber,
      tube_id:String(tube.id??""),
      revision:tube.revision??null,
      quantity_in_assembly:tube.quantity_in_assembly??null,
      material:tube.material??null,
      outer_diameter_mm:od,
      wall_thickness_mm:wall,
      developed_length_mm:developed,
      variation_segment:variationSegment,
      variation_segment_offset:
        Number.isInteger(link.variation_segment_offset)
          ? link.variation_segment_offset
          : null,
      include_library:includeName,
      include_library_offset:
        Number.isInteger(link.variation_include_offset)
          ? link.variation_include_offset
          : null,
      decoded_variation_segment:null,
      requires_decoded_variation_segment:true,
      metadata:Object.freeze({
        outer_diameter_mm:od,
        wall_thickness_mm:wall,
        developed_length_mm:developed,
        revision:tube.revision??null,
        quantity_in_assembly:tube.quantity_in_assembly??null,
        material:tube.material??null
      })
    }));
  }

  for(const link of links){
    const partNumber=String(link?.part_number??"");
    if(partNumber&&!metadataParts.has(partNumber)){
      issues.push("linkage has no exact metadata tube for "+partNumber);
    }
  }

  return Object.freeze({
    status:issues.length===0&&parts.length===metadataTubes.length
      ?"exact"
      :"blocked",
    production_ready:false,
    source_file:metadataSource||linkageSource||null,
    hsf_version:includeLinkage.hsf_version??null,
    part_count:parts.length,
    parts:Object.freeze(parts),
    issues:Object.freeze(issues),
    linkage_method:"exact_part_number"
  });
}
