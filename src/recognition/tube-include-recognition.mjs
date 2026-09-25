import { decodeUniqueHsfNamedSegment } from "../import/dwfx/hsf-segment-linkage.mjs";
import { deriveTubeMeshCenterline } from "./tube-mesh-centerline.mjs";
import { segmentMeshCenterlineCandidates } from "./mesh-centerline-segmentation.mjs";
import { validateCandidateTopology } from "./topology-validation.mjs";
import { validateDevelopedLengthConsistency } from "./developed-length-consistency.mjs";
import { buildNeutralBendSequence } from "./neutral-bend-sequence.mjs";

function meshEntities(decoded){
  if(!decoded||!Array.isArray(decoded.entities)) return [];
  return decoded.entities.filter((entity)=>
    entity?.kind==="triangle_mesh" &&
    Array.isArray(entity.vertices) &&
    Array.isArray(entity.connectivity?.faces) &&
    entity.connectivity?.status==="decoded"
  );
}

function freezeFailure(mesh,error){
  return Object.freeze({
    source_offset:
      mesh?.absolute_source_offset ??
      mesh?.source_offset ??
      null,
    reason:error?.message??String(error)
  });
}

/**
 * Recognize one tube from one exact Include Library segment.
 *
 * Mesh selection is metadata-driven: every decoded mesh is tested against the
 * exact OD/wall dimensions, and exactly one mesh must yield a valid hollow-tube
 * centerline. No first-mesh, largest-mesh or ordinal fallback is allowed.
 */
export function recognizeTubeIncludeLibraryGeometry({
  opcodeStream,
  includeLibraryName,
  hsfVersion,
  outer_diameter_mm,
  wall_thickness_mm,
  developed_length_mm,
  scale_mm_per_source_unit=null,
  decodeSegment=decodeUniqueHsfNamedSegment,
  centerlineOptions={},
  segmentationOptions={},
  topologyOptions={},
  developedLengthToleranceMm=0.1
}){
  if(typeof decodeSegment!=="function"){
    throw new TypeError("decodeSegment must be a function");
  }
  const explicitScale=scale_mm_per_source_unit==null
    ? null
    : Number(scale_mm_per_source_unit);
  if(
    explicitScale!==null &&
    (!Number.isFinite(explicitScale)||explicitScale<=0)
  ){
    throw new RangeError("scale_mm_per_source_unit must be positive when provided");
  }
  if(
    explicitScale!==null &&
    centerlineOptions.scale_mm_per_source_unit!=null &&
    Math.abs(
      Number(centerlineOptions.scale_mm_per_source_unit)-explicitScale
    )>1e-12
  ){
    throw new RangeError(
      "conflicting scale_mm_per_source_unit values were provided"
    );
  }
  const name=String(includeLibraryName??"");
  if(!name.startsWith("?Include Library/")){
    throw new RangeError("includeLibraryName must be an exact ?Include Library/... segment");
  }

  const decoded=decodeSegment(
    opcodeStream,
    name,
    {
      hsfVersion,
      attachSegmentPath:true,
      stopAfterRootSegmentClose:true,
      maxOpcodes:1_000_000
    }
  );

  if(!decoded||decoded.status!=="exact"||decoded.root_segment_complete!==true){
    return Object.freeze({
      status:"unresolved",
      production_ready:false,
      canonical_ready:false,
      include_library:name,
      decoded_segment_status:decoded?.status??"invalid",
      blocker:decoded?.unsupported_variant??"Include Library segment did not decode completely.",
      mesh_candidate_count:0,
      mesh_failures:Object.freeze([])
    });
  }

  const meshes=meshEntities(decoded);
  const accepted=[];
  const failures=[];

  for(const mesh of meshes){
    try{
      const centerline=deriveTubeMeshCenterline({
        vertices:mesh.vertices,
        faces:mesh.connectivity.faces,
        outer_diameter_mm,
        wall_thickness_mm,
        ...centerlineOptions,
        ...(explicitScale===null
          ? {}
          : {scale_mm_per_source_unit:explicitScale})
      });
      if(centerline.status==="centerline_candidate"){
        accepted.push(Object.freeze({mesh,centerline}));
      }else{
        failures.push(Object.freeze({
          source_offset:
            mesh.absolute_source_offset ??
            mesh.source_offset ??
            null,
          reason:centerline.blocker??"mesh did not produce a tube centerline"
        }));
      }
    }catch(error){
      failures.push(freezeFailure(mesh,error));
    }
  }

  if(accepted.length!==1){
    return Object.freeze({
      status:"unresolved",
      production_ready:false,
      canonical_ready:false,
      include_library:name,
      decoded_segment_status:decoded.status,
      decoded_mesh_count:meshes.length,
      mesh_candidate_count:accepted.length,
      blocker:accepted.length===0
        ?"No decoded mesh matches exact tube OD/wall centerline constraints."
        :"Multiple decoded meshes match exact tube OD/wall centerline constraints.",
      mesh_failures:Object.freeze(failures)
    });
  }

  const selected=accepted[0];
  const segmentation=segmentMeshCenterlineCandidates(
    selected.centerline.centerline_points_mm,
    selected.centerline.centerline_tangents,
    segmentationOptions
  );
  if(segmentation.status!=="candidate"){
    return Object.freeze({
      status:"unresolved",
      production_ready:false,
      canonical_ready:false,
      include_library:name,
      selected_mesh_source_offset:
        selected.mesh.absolute_source_offset ??
        selected.mesh.source_offset ??
        null,
      centerline:selected.centerline,
      segmentation,
      blocker:segmentation.reason??"Tube centerline could not be segmented into LINE/BEND candidates."
    });
  }

  const primitives=segmentation.primitives.map((item)=>item.primitive);
  const topology=validateCandidateTopology(primitives,topologyOptions);
  if(topology.status!=="candidate_valid"){
    return Object.freeze({
      status:"unresolved",
      production_ready:false,
      canonical_ready:false,
      include_library:name,
      selected_mesh_source_offset:
        selected.mesh.absolute_source_offset ??
        selected.mesh.source_offset ??
        null,
      centerline:selected.centerline,
      segmentation,
      topology,
      blocker:"Segmented tube centerline failed topology/tangency validation."
    });
  }

  const lengthConsistency=validateDevelopedLengthConsistency(
    segmentation.primitives,
    developed_length_mm,
    {tolerance_mm:developedLengthToleranceMm}
  );
  if(lengthConsistency.status!=="passed"){
    return Object.freeze({
      status:"unresolved",
      production_ready:false,
      canonical_ready:false,
      include_library:name,
      selected_mesh_source_offset:
        selected.mesh.absolute_source_offset ??
        selected.mesh.source_offset ??
        null,
      centerline:selected.centerline,
      segmentation,
      topology,
      length_consistency:lengthConsistency,
      blocker:"Recognized primitive sequence does not match exact developed-length metadata."
    });
  }

  const neutralSequence=buildNeutralBendSequence(
    segmentation.primitives,
    topologyOptions
  );
  if(neutralSequence.status!=="candidate"){
    return Object.freeze({
      status:"unresolved",
      production_ready:false,
      canonical_ready:false,
      include_library:name,
      selected_mesh_source_offset:
        selected.mesh.absolute_source_offset ??
        selected.mesh.source_offset ??
        null,
      centerline:selected.centerline,
      segmentation,
      topology,
      length_consistency:lengthConsistency,
      neutral_bend_sequence:neutralSequence,
      blocker:"Machine-neutral bend sequence could not be formed."
    });
  }

  return Object.freeze({
    status:"geometry_candidate",
    production_ready:false,
    canonical_ready:false,
    truth_category:"derived",
    include_library:name,
    source_scale_mm_per_source_unit:explicitScale,
    source_scale_status:
      explicitScale===null
        ?"derived_fallback"
        :"explicit_source",
    decoded_segment_status:decoded.status,
    decoded_mesh_count:meshes.length,
    mesh_candidate_count:1,
    selected_mesh_source_offset:
      selected.mesh.absolute_source_offset ??
      selected.mesh.source_offset ??
      null,
    centerline:selected.centerline,
    segmentation,
    topology,
    length_consistency:lengthConsistency,
    neutral_bend_sequence:neutralSequence,
    machine_compensation_applied:false,
    blocker:"Geometry is validated derived evidence but still requires final provenance/transform review before canonical promotion."
  });
}
