import { canonicalToLegacyRows } from "../../recognition/canonical-to-legacy-rows.mjs";

function deepFreezeClone(value){
  if(value==null||typeof value!=="object") return value;
  if(Array.isArray(value)) return Object.freeze(value.map(deepFreezeClone));
  const out={};
  for(const [key,item] of Object.entries(value)){
    out[key]=deepFreezeClone(item);
  }
  return Object.freeze(out);
}

/**
 * Build a VC207R7-compatible tube candidate from already promoted canonical
 * geometry. Geometry is editable, but manufacturing stays blocked until
 * tooling/style/machine gates are satisfied elsewhere.
 */
export function buildLegacyTubeCandidateFromCanonical({
  source_file,
  part_number,
  canonical_geometry,
  promotion,
  metadata=null,
  recognition_summary=null
}){
  const sourceFile=String(source_file??"");
  const partNumber=String(part_number??"");
  if(!sourceFile) throw new RangeError("source_file is required");
  if(!partNumber) throw new RangeError("part_number is required");
  if(!promotion||promotion.status!=="canonical_candidate"){
    throw new RangeError("canonical promotion must pass before legacy tube creation");
  }

  const mapped=canonicalToLegacyRows(canonical_geometry);
  if(mapped.status!=="legacy_rows_candidate"){
    return Object.freeze({
      status:"canonical_evidence_only",
      editable_ready:false,
      production_ready:false,
      tube:null,
      mapping:mapped,
      blocker:mapped.blocker
    });
  }

  const tube=Object.freeze({
    id:"dwfx:"+partNumber,
    name:partNumber,
    partNumber,
    visible:true,
    rows:mapped.rows,
    origin:mapped.origin,
    startDir:Object.freeze({az:0,el:0}),
    startAxis:mapped.startAxis,
    startPlane:mapped.startPlane,
    startAngle:mapped.startAngle,
    toolingId:null,
    toolingUnresolved:true,
    diameterIndex:null,
    importEvidence:Object.freeze({
      source:Object.freeze({
        format:"DWFx",
        file:sourceFile,
        part_number:partNumber
      }),
      canonicalGeometry:deepFreezeClone(canonical_geometry),
      canonicalPromotion:deepFreezeClone(promotion),
      coordinateMapping:deepFreezeClone(mapped.coordinate_mapping),
      metadata:deepFreezeClone(metadata),
      recognitionSummary:deepFreezeClone(recognition_summary),
      legacyRowsSource:"canonical_geometry",
      machineCompensationApplied:false
    }),
    importValidation:Object.freeze({
      productionBlocked:true,
      issues:Object.freeze([
        "Canonical geometry is mapped exactly, but tooling is intentionally unresolved."
      ]),
      coordinateMappingResolved:true,
      canonicalGeometryPreserved:true,
      legacyAxisPlaneDefaultsApplied:false,
      toolingResolved:false,
      productionSettingsConfirmed:false
    })
  });

  return Object.freeze({
    status:"legacy_tube_candidate",
    editable_ready:true,
    production_ready:false,
    mapping:mapped,
    tube,
    blocker:"Editable geometry is ready; manufacturing remains blocked until explicit tooling/style/machine confirmation."
  });
}
