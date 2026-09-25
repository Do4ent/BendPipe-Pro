import { recognizeTubeIncludeLibraryGeometry } from "../../recognition/tube-include-recognition.mjs";
import { reviewIncludeTransformProvenance } from "./transform-provenance.mjs";
import { canonicalizeTubeCandidate } from "../../recognition/canonicalize-tube-candidate.mjs";
import { buildLegacyTubeCandidateFromCanonical } from "./legacy-tube-candidate.mjs";

function exactMetadataValue(value,label){
  const n=Number(value);
  if(!Number.isFinite(n)||n<=0){
    throw new RangeError(label+" must be a finite positive number");
  }
  return n;
}

/**
 * End-to-end trusted import boundary for one exactly linked DWFx tube part.
 *
 * Inputs are already source-linked: exact Include Library name, exact variation
 * segment, exact DWF descriptor and exact metadata dimensions. Every stage
 * remains explicit and returns its blocker rather than falling through.
 */
export function prepareDwfxTubeImport({
  opcode_stream,
  decoded_variation_segment,
  include_library,
  descriptor,
  source_file,
  part_number,
  hsf_version,
  outer_diameter_mm,
  wall_thickness_mm,
  developed_length_mm,
  metadata=null,
  recognition_summary=null,
  recognizeGeometry=recognizeTubeIncludeLibraryGeometry,
  reviewTransforms=reviewIncludeTransformProvenance
}){
  if(typeof recognizeGeometry!=="function"){
    throw new TypeError("recognizeGeometry must be a function");
  }
  if(typeof reviewTransforms!=="function"){
    throw new TypeError("reviewTransforms must be a function");
  }
  if(!descriptor||descriptor.status!=="exact"){
    return Object.freeze({
      status:"blocked",
      production_ready:false,
      stage:"descriptor",
      blocker:"Exact DWF eModel descriptor is required.",
      geometry:null,
      transform_provenance:null,
      canonicalization:null,
      legacy:null
    });
  }

  const scale=Number(descriptor.w3d?.scale_mm_per_source_unit);
  if(!Number.isFinite(scale)||scale<=0){
    return Object.freeze({
      status:"blocked",
      production_ready:false,
      stage:"descriptor",
      blocker:"Exact positive W3D source scale is required.",
      geometry:null,
      transform_provenance:null,
      canonicalization:null,
      legacy:null
    });
  }

  const od=exactMetadataValue(outer_diameter_mm,"outer_diameter_mm");
  const wall=exactMetadataValue(wall_thickness_mm,"wall_thickness_mm");
  const developed=exactMetadataValue(developed_length_mm,"developed_length_mm");

  const geometry=recognizeGeometry({
    opcodeStream:opcode_stream,
    includeLibraryName:include_library,
    hsfVersion:hsf_version,
    outer_diameter_mm:od,
    wall_thickness_mm:wall,
    developed_length_mm:developed,
    scale_mm_per_source_unit:scale
  });

  if(!geometry||geometry.status!=="geometry_candidate"){
    return Object.freeze({
      status:"blocked",
      production_ready:false,
      stage:"geometry",
      blocker:geometry?.blocker??"Tube geometry recognition did not produce a validated candidate.",
      geometry:geometry??null,
      transform_provenance:null,
      canonicalization:null,
      legacy:null
    });
  }

  const transformProvenance=reviewTransforms(
    decoded_variation_segment,
    include_library
  );
  if(
    !transformProvenance||
    transformProvenance.status!=="rigid_placement"||
    transformProvenance.intrinsic_geometry_invariants_preserved!==true
  ){
    return Object.freeze({
      status:"blocked",
      production_ready:false,
      stage:"transform_provenance",
      blocker:transformProvenance?.reason??"Transform provenance did not prove a proper rigid placement.",
      geometry,
      transform_provenance:transformProvenance??null,
      canonicalization:null,
      legacy:null
    });
  }

  const canonicalization=canonicalizeTubeCandidate({
    tube_id:String(part_number),
    part_number:String(part_number),
    geometry,
    descriptor,
    transform_provenance:transformProvenance,
    coordinate_frame_id:"w3d-local",
    source_refs:[
      "dwfx:"+String(source_file),
      "part:"+String(part_number),
      "hsf:"+String(include_library)
    ]
  });

  if(canonicalization.status!=="canonical_candidate"){
    return Object.freeze({
      status:"blocked",
      production_ready:false,
      stage:"canonicalization",
      blocker:canonicalization.blocker,
      geometry,
      transform_provenance:transformProvenance,
      canonicalization,
      legacy:null
    });
  }

  const legacy=buildLegacyTubeCandidateFromCanonical({
    source_file,
    part_number,
    canonical_geometry:canonicalization.canonical_geometry,
    promotion:canonicalization.promotion,
    metadata:metadata??Object.freeze({
      outer_diameter_mm:od,
      wall_thickness_mm:wall,
      developed_length_mm:developed
    }),
    recognition_summary
  });

  if(legacy.status!=="legacy_tube_candidate"){
    return Object.freeze({
      status:"blocked",
      production_ready:false,
      stage:"legacy_mapping",
      blocker:legacy.blocker,
      geometry,
      transform_provenance:transformProvenance,
      canonicalization,
      legacy
    });
  }

  return Object.freeze({
    status:"legacy_tube_candidate",
    editable_ready:true,
    production_ready:false,
    stage:"complete",
    geometry,
    transform_provenance:transformProvenance,
    canonicalization,
    legacy,
    tube:legacy.tube,
    blocker:"DWFx geometry is editable, but manufacturing remains blocked until explicit downstream release gates pass."
  });
}
