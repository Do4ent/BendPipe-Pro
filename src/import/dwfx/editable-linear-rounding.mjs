function clone(value){
  return value==null ? value : JSON.parse(JSON.stringify(value));
}

function finite(value,label){
  const n=Number(value);
  if(!Number.isFinite(n))throw new RangeError(label+" must be finite");
  return n;
}

export function roundImportedLinearMm(value,increment_mm=1){
  const n=finite(value,"linear value");
  const step=finite(increment_mm,"increment_mm");
  if(!(step>0))throw new RangeError("increment_mm must be positive");
  const scaled=Math.abs(n)/step;
  const rounded=Math.round(scaled+Number.EPSILON)*step;
  const signed=n<0?-rounded:rounded;
  return Object.is(signed,-0)?0:signed;
}

function numericFormula(value){
  return String(value);
}

function recordChange(changes,path,before,after){
  if(Math.abs(Number(before)-Number(after))<=1e-12)return;
  changes.push(Object.freeze({
    path,
    source_mm:Number(before),
    editable_mm:Number(after),
    delta_mm:Number(after)-Number(before)
  }));
}

export function roundEditableTubeLinearDimensions(
  tube,
  {increment_mm=1}={}
){
  if(!tube||typeof tube!=="object")throw new TypeError("tube is required");
  if(!Array.isArray(tube.rows))throw new TypeError("tube.rows is required");

  const out=clone(tube);
  const changes=[];
  const exactOrigin={
    x:finite(out?.origin?.x??0,"origin.x"),
    y:finite(out?.origin?.y??0,"origin.y"),
    z:finite(out?.origin?.z??0,"origin.z")
  };
  const roundedOrigin={
    x:roundImportedLinearMm(exactOrigin.x,increment_mm),
    y:roundImportedLinearMm(exactOrigin.y,increment_mm),
    z:roundImportedLinearMm(exactOrigin.z,increment_mm)
  };
  for(const axis of ["x","y","z"]){
    recordChange(changes,"origin."+axis,exactOrigin[axis],roundedOrigin[axis]);
  }
  out.origin=roundedOrigin;

  out.rows=out.rows.map((row,index)=>{
    const next=clone(row);
    if(next?.type==="LINE"){
      const before=finite(next.L,"rows["+index+"].L");
      const after=roundImportedLinearMm(before,increment_mm);
      next.L=after;
      next.LFormula=numericFormula(after);
      recordChange(changes,"rows["+index+"].L",before,after);
    }else if(next?.type==="BEND"){
      const before=finite(next.clr,"rows["+index+"].clr");
      const after=roundImportedLinearMm(before,increment_mm);
      next.clr=after;
      next.clrSource="import_linear_rounding";
      recordChange(changes,"rows["+index+"].clr",before,after);
    }
    return next;
  });

  const priorSpatial=out.importEvidence?.spatialPlacement;
  if(priorSpatial&&typeof priorSpatial==="object"){
    out.importEvidence={
      ...(out.importEvidence??{}),
      spatialPlacement:{
        ...priorSpatial,
        editable_origin_mm:[
          roundedOrigin.x,
          roundedOrigin.y,
          roundedOrigin.z
        ],
        source_origin_mm:Array.isArray(priorSpatial.origin_mm)
          ? [...priorSpatial.origin_mm]
          : [exactOrigin.x,exactOrigin.y,exactOrigin.z],
        editable_origin_seeded:true,
        user_origin_override:false
      }
    };
  }

  const normalization=Object.freeze({
    status:"rounded",
    increment_mm:Number(increment_mm),
    rule:"nearest_mm_half_away_from_zero",
    source_geometry_preserved:true,
    angles_unchanged:true,
    rotations_unchanged:true,
    table_diameter_unchanged:true,
    machine_compensation_applied:false,
    source_origin_mm:Object.freeze([
      exactOrigin.x,exactOrigin.y,exactOrigin.z
    ]),
    editable_origin_mm:Object.freeze([
      roundedOrigin.x,roundedOrigin.y,roundedOrigin.z
    ]),
    changes:Object.freeze(changes)
  });

  out.importEvidence={
    ...(out.importEvidence??{}),
    linearDimensionNormalization:normalization
  };
  out.importValidation={
    ...(out.importValidation??{}),
    productionBlocked:true,
    linearDimensionsRoundedToMm:true,
    linearDimensionIncrementMm:Number(increment_mm)
  };

  return Object.freeze({
    status:"rounded",
    tube:out,
    normalization,
    changed_count:changes.length,
    production_ready:false
  });
}

export function roundDwfxAssemblyLinearDimensions(
  assembly,
  {increment_mm=1}={}
){
  if(!assembly||typeof assembly!=="object")throw new TypeError("assembly is required");
  if(!Array.isArray(assembly.tubes))throw new TypeError("assembly.tubes is required");

  const results=assembly.tubes.map((tube)=>
    roundEditableTubeLinearDimensions(tube,{increment_mm})
  );
  const rounded=Object.freeze({
    ...assembly,
    tubes:Object.freeze(results.map((result)=>result.tube)),
    linear_dimension_normalization:Object.freeze({
      status:"rounded",
      increment_mm:Number(increment_mm),
      tube_count:results.length,
      changed_count:results.reduce((sum,result)=>sum+result.changed_count,0),
      source_geometry_preserved:true,
      production_ready:false
    })
  });

  return Object.freeze({
    status:"rounded_assembly",
    assembly:rounded,
    tube_count:results.length,
    changed_count:results.reduce((sum,result)=>sum+result.changed_count,0),
    production_ready:false
  });
}
