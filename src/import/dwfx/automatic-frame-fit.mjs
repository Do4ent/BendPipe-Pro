function clone(value){
  return value==null ? value : JSON.parse(JSON.stringify(value));
}

function finite3(value,label){
  if(!Array.isArray(value)||value.length!==3){
    throw new TypeError(label+" must be a 3D array");
  }
  const out=value.map(Number);
  if(!out.every(Number.isFinite)){
    throw new RangeError(label+" contains non-finite values");
  }
  return out;
}

function pointObject(value,label){
  if(!value||typeof value!=="object"){
    throw new TypeError(label+" must be an object");
  }
  const out={
    x:Number(value.x),
    y:Number(value.y),
    z:Number(value.z)
  };
  if(!Object.values(out).every(Number.isFinite)){
    throw new RangeError(label+" contains non-finite values");
  }
  return out;
}

function subtractOffset(point,offset){
  return {
    x:Number((point.x-offset.x).toFixed(6)),
    y:Number((point.y-offset.y).toFixed(6)),
    z:Number((point.z-offset.z).toFixed(6))
  };
}

function arrayFromPoint(point){
  return [point.x,point.y,point.z];
}

export function deriveAutomaticFrameFromReferenceBounds(referenceScene){
  const bounds=referenceScene?.bounds_mm;
  if(!bounds)return Object.freeze({
    status:"unresolved",
    bbox:null,
    coordinate_offset:null,
    bbox_anchor:null,
    blocker:"Filtered DWFx reference bounds are unavailable."
  });

  const min=finite3(bounds.min,"reference bounds min");
  const max=finite3(bounds.max,"reference bounds max");
  const frameMin=min.map(Math.floor);
  const frameMax=max.map(Math.ceil);
  const size=frameMax.map((value,index)=>value-frameMin[index]);
  if(!size.every((value)=>Number.isFinite(value)&&value>0)){
    return Object.freeze({
      status:"unresolved",
      bbox:null,
      coordinate_offset:null,
      bbox_anchor:null,
      blocker:"Filtered DWFx reference bounds do not define a positive 3D frame."
    });
  }

  return Object.freeze({
    status:"exact",
    bbox:Object.freeze({
      x:size[0],
      y:size[1],
      z:size[2]
    }),
    bbox_anchor:Object.freeze({x:0,y:0,z:0}),
    coordinate_offset:Object.freeze({
      x:frameMin[0],
      y:frameMin[1],
      z:frameMin[2]
    }),
    exact_bounds_mm:Object.freeze({
      min:Object.freeze([...min]),
      max:Object.freeze([...max]),
      size:Object.freeze(max.map((value,index)=>value-min[index]))
    }),
    frame_bounds_mm:Object.freeze({
      min:Object.freeze([...frameMin]),
      max:Object.freeze([...frameMax]),
      size:Object.freeze([...size])
    }),
    rounding_rule:"floor_min_ceil_max_mm",
    source_geometry_preserved:true
  });
}

export function rebaseDwfxAssemblyToAutomaticFrame({
  assembly,
  frame
}){
  if(!assembly||typeof assembly!=="object"){
    throw new TypeError("assembly is required");
  }
  if(assembly.status!=="assembly_candidate"||assembly.editable_ready!==true){
    return Object.freeze({
      status:"blocked",
      assembly:null,
      blocker:"Only an editable assembly candidate can be rebased to an automatic frame."
    });
  }
  if(!frame||frame.status!=="exact"||!frame.coordinate_offset){
    return Object.freeze({
      status:"blocked",
      assembly:null,
      blocker:"An exact automatic frame is required for assembly rebasing."
    });
  }

  const offset=pointObject(frame.coordinate_offset,"frame coordinate_offset");
  const tubes=(assembly.tubes??[]).map((source)=>{
    const tube=clone(source);
    const sourceOrigin=pointObject(tube.origin,"tube.origin");
    const rebasedOrigin=subtractOffset(sourceOrigin,offset);
    tube.origin=rebasedOrigin;

    const evidence=tube.importEvidence??{};
    const spatial=evidence.spatialPlacement??{};
    const linear=evidence.linearDimensionNormalization??{};

    tube.importEvidence={
      ...evidence,
      spatialPlacement:{
        ...spatial,
        editable_origin_mm:arrayFromPoint(rebasedOrigin),
        project_frame_rebase:Object.freeze({
          status:"applied",
          source_editable_origin_mm:Object.freeze(arrayFromPoint(sourceOrigin)),
          coordinate_offset_mm:Object.freeze(arrayFromPoint(offset)),
          rebased_editable_origin_mm:Object.freeze(arrayFromPoint(rebasedOrigin)),
          physical_world_position_preserved:true,
          source_geometry_preserved:true
        })
      },
      ...(Object.keys(linear).length
        ? {
            linearDimensionNormalization:{
              ...linear,
              project_frame_rebased_origin_mm:arrayFromPoint(rebasedOrigin)
            }
          }
        : {})
    };
    tube.importValidation={
      ...(tube.importValidation??{}),
      automaticFrameApplied:true,
      automaticFramePhysicalPlacementPreserved:true
    };
    return tube;
  });

  return Object.freeze({
    status:"rebased_assembly",
    assembly:Object.freeze({
      ...assembly,
      tubes:Object.freeze(tubes)
    }),
    coordinate_offset:frame.coordinate_offset,
    bbox:frame.bbox,
    bbox_anchor:frame.bbox_anchor,
    production_ready:false
  });
}
