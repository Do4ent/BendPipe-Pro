import {
  BEND_ANGLE_INTEGER_TOLERANCE_DEG,
  roundBendAngleNearInteger
} from "./editable-geometry-normalization.mjs";

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
  {
    increment_mm=1,
    bend_angle_tolerance_deg=BEND_ANGLE_INTEGER_TOLERANCE_DEG
  }={}
){
  if(!tube||typeof tube!=="object")throw new TypeError("tube is required");
  if(!Array.isArray(tube.rows))throw new TypeError("tube.rows is required");

  const out=clone(tube);
  const changes=[];
  const angleChanges=[];
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

      const angleBefore=finite(next.angle,"rows["+index+"].angle");
      const angleNormalization=roundBendAngleNearInteger(
        angleBefore,
        {tolerance_deg:bend_angle_tolerance_deg}
      );
      next.angle=angleNormalization.editable_angle_deg;
      next.angleFormula=numericFormula(next.angle);
      if(angleNormalization.rounded_to_integer&&Math.abs(next.angle-angleBefore)>1e-12){
        angleChanges.push(Object.freeze({
          path:"rows["+index+"].angle",
          source_deg:angleBefore,
          editable_deg:next.angle,
          delta_deg:next.angle-angleBefore,
          nearest_integer_deg:angleNormalization.nearest_integer_deg,
          tolerance_deg:angleNormalization.tolerance_deg
        }));
      }
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
    bend_radius_rule:"nearest_whole_mm_half_away_from_zero",
    bend_angle_rule:"nearest_integer_deg_if_within_tolerance",
    bend_angle_integer_tolerance_deg:Number(bend_angle_tolerance_deg),
    source_geometry_preserved:true,
    angles_unchanged:angleChanges.length===0,
    rotations_unchanged:true,
    table_diameter_unchanged:true,
    machine_compensation_applied:false,
    source_origin_mm:Object.freeze([
      exactOrigin.x,exactOrigin.y,exactOrigin.z
    ]),
    editable_origin_mm:Object.freeze([
      roundedOrigin.x,roundedOrigin.y,roundedOrigin.z
    ]),
    changes:Object.freeze(changes),
    angle_changes:Object.freeze(angleChanges)
  });

  out.importEvidence={
    ...(out.importEvidence??{}),
    linearDimensionNormalization:normalization
  };
  out.importValidation={
    ...(out.importValidation??{}),
    productionBlocked:true,
    linearDimensionsRoundedToMm:true,
    linearDimensionIncrementMm:Number(increment_mm),
    bendRadiiRoundedToWholeMm:true,
    bendAnglesRoundedNearInteger:true,
    bendAngleIntegerToleranceDeg:Number(bend_angle_tolerance_deg)
  };

  return Object.freeze({
    status:"rounded",
    tube:out,
    normalization,
    changed_count:changes.length+angleChanges.length,
    linear_changed_count:changes.length,
    angle_changed_count:angleChanges.length,
    production_ready:false
  });
}

export function roundDwfxAssemblyLinearDimensions(
  assembly,
  {
    increment_mm=1,
    bend_angle_tolerance_deg=BEND_ANGLE_INTEGER_TOLERANCE_DEG
  }={}
){
  if(!assembly||typeof assembly!=="object")throw new TypeError("assembly is required");
  if(!Array.isArray(assembly.tubes))throw new TypeError("assembly.tubes is required");

  const results=assembly.tubes.map((tube)=>
    roundEditableTubeLinearDimensions(tube,{
      increment_mm,
      bend_angle_tolerance_deg
    })
  );
  const rounded=Object.freeze({
    ...assembly,
    tubes:Object.freeze(results.map((result)=>result.tube)),
    linear_dimension_normalization:Object.freeze({
      status:"rounded",
      increment_mm:Number(increment_mm),
      bend_angle_integer_tolerance_deg:Number(bend_angle_tolerance_deg),
      tube_count:results.length,
      changed_count:results.reduce((sum,result)=>sum+result.changed_count,0),
      linear_changed_count:results.reduce(
        (sum,result)=>sum+result.linear_changed_count,0
      ),
      angle_changed_count:results.reduce(
        (sum,result)=>sum+result.angle_changed_count,0
      ),
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
