function point3(value,label){
  if(!Array.isArray(value)||value.length!==3){
    throw new TypeError(label+" must be a 3D point");
  }
  const out=value.map(Number);
  if(!out.every(Number.isFinite)){
    throw new RangeError(label+" contains non-finite coordinates");
  }
  return Object.freeze(out);
}

function finiteNumber(value,label){
  const n=Number(value);
  if(!Number.isFinite(n)){
    throw new RangeError(label+" must be finite");
  }
  return n;
}

function confidenceValue(value,{reason,method,source,truth_category="derived",confidence=1}){
  const c=Number(confidence);
  if(!Number.isFinite(c)||c<0||c>1){
    throw new RangeError("confidence must be between 0 and 1");
  }
  return Object.freeze({
    value,
    confidence:c,
    reason:reason??null,
    method:String(method),
    source:Object.freeze([...new Set((source??[]).map(String))]),
    truth_category
  });
}

function sourceRefs({part_number,include_library,mesh_source_offset,extra=[]}){
  const refs=[
    part_number?"part:"+part_number:null,
    include_library?"hsf:"+include_library:null,
    Number.isInteger(mesh_source_offset)?"w3d:offset:"+mesh_source_offset:null,
    ...extra
  ].filter(Boolean).map(String);
  return Object.freeze([...new Set(refs)]);
}

function bendRotationMap(neutral){
  const map=new Map();
  if(!neutral||!Array.isArray(neutral.bends)) return map;
  for(const bend of neutral.bends){
    if(Number.isInteger(bend.source_primitive_index)){
      map.set(bend.source_primitive_index,bend.rotation_from_previous_bend_deg??null);
    }
  }
  return map;
}

/**
 * Build schema-shaped canonical nominal geometry only after the explicit
 * canonical-promotion gate has passed. No manufacturing compensation is added.
 */
export function buildCanonicalTubeGeometry({
  tube_id,
  part_number=null,
  geometry,
  promotion,
  coordinate_frame_id="w3d-local",
  handedness,
  source_refs=[]
}){
  const tubeId=String(tube_id??"");
  if(!tubeId) throw new RangeError("tube_id is required");
  if(!geometry||geometry.status!=="geometry_candidate"){
    throw new RangeError("geometry must be a validated geometry_candidate");
  }
  if(!promotion||promotion.status!=="canonical_candidate"||promotion.canonical_ready!==true){
    throw new RangeError("canonical promotion decision must pass before building canonical geometry");
  }
  if(geometry.machine_compensation_applied!==false){
    throw new RangeError("canonical nominal geometry cannot contain machine compensation");
  }
  if(!Array.isArray(geometry.segmentation?.primitives)){
    throw new TypeError("geometry segmentation primitives are required");
  }

  const hand=handedness??promotion.polygon_handedness;
  if(hand!=="left"&&hand!=="right"){
    throw new RangeError("coordinate-frame handedness must be left or right");
  }

  const refs=sourceRefs({
    part_number,
    include_library:geometry.include_library,
    mesh_source_offset:geometry.selected_mesh_source_offset,
    extra:source_refs
  });
  const rotationByPrimitive=bendRotationMap(geometry.neutral_bend_sequence);

  const primitives=geometry.segmentation.primitives.map((entry,index)=>{
    const p=entry?.primitive??entry;
    if(!p||typeof p!=="object") throw new TypeError("primitive "+index+" is invalid");
    const evidenceSource=[
      ...refs,
      Number.isInteger(entry?.source_start_index)
        ?"centerline:index:"+entry.source_start_index+"-"+entry.source_end_index
        :null
    ].filter(Boolean);
    const common={
      reason:p.reason??"Validated from DWFx tube-mesh centerline evidence.",
      method:p.evidence_mode??"mesh_centerline_segmentation",
      source:evidenceSource,
      truth_category:"derived",
      confidence:1
    };

    if(p.type==="LINE"){
      return Object.freeze({
        type:"LINE",
        element_id:tubeId+":line:"+(index+1),
        start:confidenceValue(point3(p.start,"LINE "+index+" start"),common),
        end:confidenceValue(point3(p.end,"LINE "+index+" end"),common),
        length:confidenceValue(finiteNumber(p.length_mm,"LINE "+index+" length_mm"),common),
        direction:confidenceValue(point3(p.direction,"LINE "+index+" direction"),common)
      });
    }

    if(p.type==="BEND"){
      const rotation=rotationByPrimitive.has(index)?rotationByPrimitive.get(index):null;
      return Object.freeze({
        type:"BEND",
        element_id:tubeId+":bend:"+(index+1),
        tangent_in:confidenceValue(point3(p.start_point,"BEND "+index+" tangent_in"),common),
        tangent_out:confidenceValue(point3(p.end_point,"BEND "+index+" tangent_out"),common),
        center:confidenceValue(point3(p.center,"BEND "+index+" center"),common),
        bend_plane_normal:confidenceValue(point3(p.plane_normal,"BEND "+index+" plane_normal"),common),
        clr:confidenceValue(finiteNumber(p.clr_mm,"BEND "+index+" clr_mm"),common),
        angle:confidenceValue(finiteNumber(p.signed_sweep_deg,"BEND "+index+" signed_sweep_deg"),common),
        plane_rotation_from_previous:confidenceValue(
          rotation==null?null:finiteNumber(rotation,"BEND "+index+" rotation"),
          {
            ...common,
            reason:rotation==null
              ?"First bend has no previous bend plane."
              :"Rotation is computed from consecutive oriented bend-plane normals about the intervening straight travel direction.",
            method:"neutral_bend_sequence"
          }
        )
      });
    }

    throw new RangeError("primitive "+index+" has unsupported type "+String(p.type));
  });

  return Object.freeze({
    schema_version:"1.0.0",
    tube_id:tubeId,
    length_unit:"mm",
    angle_unit:"deg",
    coordinate_frame:Object.freeze({
      id:String(coordinate_frame_id),
      handedness:hand,
      notes:"Intrinsic nominal geometry in the decoded W3D local frame; assembly placement remains provenance and no machine compensation is applied."
    }),
    source_refs:refs,
    primitives:Object.freeze(primitives)
  });
}
