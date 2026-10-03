import { evaluateCanonicalPromotion } from "./canonical-promotion.mjs";
import { buildCanonicalTubeGeometry } from "./canonical-tube-builder.mjs";

/**
 * One-way boundary from validated DWFx geometry evidence to canonical nominal
 * geometry. Callers cannot construct canonical geometry through this path
 * without first passing the explicit promotion gate.
 */
export function canonicalizeTubeCandidate({
  tube_id,
  part_number=null,
  geometry,
  descriptor,
  transform_provenance,
  coordinate_frame_id="w3d-local",
  source_refs=[]
}){
  const promotion=evaluateCanonicalPromotion({
    geometry,
    descriptor,
    transform_provenance
  });

  if(promotion.status!=="canonical_candidate"){
    return Object.freeze({
      status:"blocked",
      canonical_ready:false,
      production_ready:false,
      promotion,
      canonical_geometry:null,
      blocker:promotion.reason
    });
  }

  const canonicalGeometry=buildCanonicalTubeGeometry({
    tube_id,
    part_number,
    geometry,
    promotion,
    coordinate_frame_id,
    source_refs
  });

  return Object.freeze({
    status:"canonical_candidate",
    canonical_ready:true,
    production_ready:false,
    promotion,
    canonical_geometry:canonicalGeometry,
    blocker:"Canonical nominal geometry is built, but production release and machine compensation remain downstream gates."
  });
}
