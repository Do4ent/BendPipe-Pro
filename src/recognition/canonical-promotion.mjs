function finitePositive(value,label){
  const n=Number(value);
  if(!Number.isFinite(n)||n<=0){
    throw new RangeError(`${label} must be a finite positive number`);
  }
  return n;
}

function requiredStatus(object,expected,label){
  if(!object||typeof object!=="object"){
    return `${label} is missing`;
  }
  return object.status===expected
    ? null
    : `${label} status is ${String(object.status)}, expected ${expected}`;
}

/**
 * Decide whether validated DWFx-derived geometry may be promoted from
 * evidence-level geometry_candidate to canonical_candidate.
 *
 * This gate does NOT create manufacturing geometry and never marks a result
 * production-ready. It only confirms that the source scale, intrinsic geometry,
 * topology, developed length and placement-transform provenance are mutually
 * consistent enough to allow canonical nominal geometry construction.
 */
export function evaluateCanonicalPromotion({
  geometry,
  descriptor,
  transform_provenance,
  require_exact_descriptor_scale=true
}){
  if(!geometry||typeof geometry!=="object"){
    throw new TypeError("geometry recognition result is required");
  }
  if(!descriptor||typeof descriptor!=="object"){
    throw new TypeError("DWF model descriptor is required");
  }
  if(!transform_provenance||typeof transform_provenance!=="object"){
    throw new TypeError("transform provenance review is required");
  }

  const blockers=[];

  const geometryIssue=requiredStatus(geometry,"geometry_candidate","geometry");
  if(geometryIssue) blockers.push(geometryIssue);

  const topologyIssue=requiredStatus(
    geometry.topology,
    "candidate_valid",
    "topology"
  );
  if(topologyIssue) blockers.push(topologyIssue);

  const lengthIssue=requiredStatus(
    geometry.length_consistency,
    "passed",
    "developed-length consistency"
  );
  const editableMetadataConflict=
    geometry.editable_metadata_conflict===true &&
    geometry.metadata_reconciliation?.advisory_for_editing===true;
  if(lengthIssue&&!editableMetadataConflict) blockers.push(lengthIssue);

  const neutralIssue=requiredStatus(
    geometry.neutral_bend_sequence,
    "candidate",
    "neutral bend sequence"
  );
  if(neutralIssue) blockers.push(neutralIssue);

  if(descriptor.status!=="exact"){
    blockers.push(
      `model descriptor status is ${String(descriptor.status)}, expected exact`
    );
  }

  const descriptorScale=descriptor.w3d?.scale_mm_per_source_unit;
  if(require_exact_descriptor_scale){
    if(!Number.isFinite(Number(descriptorScale))||Number(descriptorScale)<=0){
      blockers.push("exact descriptor scale_mm_per_source_unit is missing");
    }
    if(geometry.source_scale_status!=="explicit_source"){
      blockers.push(
        "geometry was not recognized using the exact descriptor source scale"
      );
    }else if(
      Number.isFinite(Number(descriptorScale)) &&
      Math.abs(
        Number(geometry.source_scale_mm_per_source_unit)-Number(descriptorScale)
      )>1e-12
    ){
      blockers.push(
        "geometry source scale does not match the exact DWF descriptor scale"
      );
    }
  }

  if(transform_provenance.status!=="rigid_placement"){
    blockers.push(
      `transform provenance status is ${String(transform_provenance.status)}, expected rigid_placement`
    );
  }
  if(transform_provenance.intrinsic_geometry_invariants_preserved!==true){
    blockers.push(
      "placement transforms do not prove preservation of intrinsic lengths, angles and orientation"
    );
  }

  if(geometry.machine_compensation_applied!==false){
    blockers.push(
      "machine/tool compensation must remain absent from canonical nominal geometry"
    );
  }

  const promoted=blockers.length===0;
  const scale=Number(descriptorScale);

  return Object.freeze({
    status:promoted?"canonical_candidate":"blocked",
    canonical_ready:promoted,
    production_ready:false,
    truth_category:"derived",
    source_scale_mm_per_source_unit:
      Number.isFinite(scale)&&scale>0 ? scale : null,
    polygon_handedness:descriptor.w3d?.polygon_handedness??null,
    geometry_include_library:geometry.include_library??null,
    primitive_count:
      Number.isInteger(geometry.segmentation?.primitive_count)
        ? geometry.segmentation.primitive_count
        : Array.isArray(geometry.segmentation?.primitives)
          ? geometry.segmentation.primitives.length
          : null,
    bend_count:
      Number.isInteger(geometry.neutral_bend_sequence?.bend_count)
        ? geometry.neutral_bend_sequence.bend_count
        : null,
    developed_length_mm:
      Number.isFinite(Number(geometry.length_consistency?.reconstructed_developed_length_mm))
        ? Number(geometry.length_consistency.reconstructed_developed_length_mm)
        : null,
    transform_count:
      Number.isInteger(transform_provenance.transform_count)
        ? transform_provenance.transform_count
        : null,
    metadata_conflict_advisory:editableMetadataConflict,
    blockers:Object.freeze(blockers),
    reason:promoted
      ?(
        editableMetadataConflict
          ?"Exact W3D geometry and proper-rigid placement permit editable canonical promotion while conflicting Content Center metadata remains an explicit production blocker."
          :"Exact DWF source scale, validated intrinsic tube geometry, developed length and proper-rigid placement provenance permit canonical nominal geometry promotion. Production release remains a separate gate."
      )
      :"Canonical promotion is blocked until every required source/provenance check passes."
  });
}
