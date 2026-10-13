function cloneFrozen(value){
  if(value==null||typeof value!=="object") return value;
  if(Array.isArray(value)) return Object.freeze(value.map(cloneFrozen));
  const out={};
  for(const [key,item] of Object.entries(value)) out[key]=cloneFrozen(item);
  return Object.freeze(out);
}

/**
 * Preserve canonical 3D tube geometry inside project/import state before the
 * legacy editable-row coordinate mapping exists.
 *
 * This object is intentionally production-blocked and exposes no editable rows.
 * It prevents the project-open path from inventing axis/plane defaults while
 * still retaining the complete canonical geometry and provenance.
 */
export function createCanonicalImportEvidence({
  source_file,
  part_number,
  canonical_geometry,
  promotion,
  recognition_summary=null
}){
  const sourceFile=String(source_file??"");
  const partNumber=String(part_number??"");
  if(!sourceFile) throw new RangeError("source_file is required");
  if(!partNumber) throw new RangeError("part_number is required");
  if(
    !canonical_geometry||
    canonical_geometry.schema_version!=="1.0.0"||
    !Array.isArray(canonical_geometry.primitives)
  ){
    throw new TypeError("canonical_geometry 1.0.0 is required");
  }
  if(!promotion||promotion.status!=="canonical_candidate"){
    throw new RangeError("canonical promotion must pass before import evidence is created");
  }

  return Object.freeze({
    source:Object.freeze({
      format:"DWFx",
      file:sourceFile,
      part_number:partNumber
    }),
    geometry_status:"canonical_evidence",
    canonical_ready:true,
    production_ready:false,
    production_blocked:true,
    coordinate_mapping_status:"unresolved",
    editable_rows:null,
    editable_rows_reason:
      "Canonical geometry is preserved in its W3D-local 3D frame. Legacy row axis/plane mapping has not been proven and must not be guessed.",
    canonical_geometry:cloneFrozen(canonical_geometry),
    promotion:cloneFrozen(promotion),
    recognition_summary:cloneFrozen(recognition_summary),
    import_validation:Object.freeze({
      productionBlocked:true,
      coordinateMappingResolved:false,
      canonicalGeometryPreserved:true,
      legacyAxisPlaneDefaultsApplied:false
    })
  });
}
