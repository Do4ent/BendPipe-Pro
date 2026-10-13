import {
  effectiveLegacyBendAxis,
  replayLegacyDirection,
  solveLegacyBendSettings
} from "../../recognition/legacy-row-kinematics.mjs";
import {
  mirrorMatrix,
  rotationMatrix,
  transformPoint,
  transformVector
} from "./transform-commands.mjs";

function clone(value){return value==null?value:structuredClone(value);}
function finite(value,name){
  const n=Number(value);
  if(!Number.isFinite(n))throw new TypeError(`${name} must be finite`);
  return n;
}
function axisVector(axis){
  const text=String(axis??"").trim().toUpperCase();
  const sign=text.startsWith("-")?-1:1;
  const key=text.replace(/^[-+]/,"");
  if(key==="X")return [sign,0,0];
  if(key==="Y")return [0,sign,0];
  if(key==="Z")return [0,0,sign];
  return null;
}
function pointObject(value,name){
  if(Array.isArray(value)&&value.length===3){
    const [x,y,z]=value.map(Number);
    if([x,y,z].every(Number.isFinite))return {x,y,z};
  }
  if(value&&typeof value==="object"){
    const x=Number(value.x),y=Number(value.y),z=Number(value.z);
    if([x,y,z].every(Number.isFinite))return {x,y,z};
  }
  throw new TypeError(`${name} must be a finite 3D point/vector`);
}
function arrayVector(value,name){
  const p=pointObject(value,name);
  const length=Math.hypot(p.x,p.y,p.z);
  if(!(length>1e-12))throw new RangeError(`${name} must be non-zero`);
  return [p.x/length,p.y/length,p.z/length];
}
function startDirection(tube){
  if(tube?.startVector!=null)return arrayVector(tube.startVector,"tube.startVector");
  const axis=axisVector(tube?.startAxis);
  return axis??[1,0,0];
}
function asObject(v){return {x:v[0],y:v[1],z:v[2]};}
function rotatedVector(matrix,v){
  const q=transformVector(matrix,asObject(v));
  return arrayVector(q,"rotated vector");
}
function freeze(value){
  if(Array.isArray(value))return Object.freeze(value.map(freeze));
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    for(const key of Object.keys(value))value[key]=freeze(value[key]);
    return Object.freeze(value);
  }
  return value;
}

export function rotateLegacyTubeRigid(
  tube,
  {
    axis,
    center={x:0,y:0,z:0},
    angle_deg,
    direction_tolerance_deg=0.02,
    plane_tolerance_deg=0.05
  }={}
){
  if(!tube||typeof tube!=="object")throw new TypeError("tube is required");
  if(!Array.isArray(tube.rows)||!tube.rows.length)throw new RangeError("tube rows are required");
  const angle=finite(angle_deg,"angle_deg");
  const matrix=rotationMatrix({axis,center,angle_deg:angle});
  const out=clone(tube);
  const sourceOrigin=pointObject(tube.origin??{x:0,y:0,z:0},"tube.origin");
  const targetOrigin=transformPoint(matrix,sourceOrigin);
  out.origin={
    x:Number(targetOrigin.x.toFixed(9)),
    y:Number(targetOrigin.y.toFixed(9)),
    z:Number(targetOrigin.z.toFixed(9))
  };

  let sourceIncoming=startDirection(tube);
  let targetIncoming=rotatedVector(matrix,sourceIncoming);
  out.startVector={
    x:Number(targetIncoming[0].toFixed(12)),
    y:Number(targetIncoming[1].toFixed(12)),
    z:Number(targetIncoming[2].toFixed(12))
  };
  out.startAxis=null;

  const reencoded=[];
  for(let index=0;index<tube.rows.length;index+=1){
    const sourceRow=tube.rows[index];
    const targetRow=out.rows[index];
    if(sourceRow?.type==="LINE"){
      const length=finite(sourceRow.L,`rows[${index}].L`);
      if(length<0)throw new RangeError("LINE length must be non-negative");
      reencoded.push(freeze({
        row_index:index,
        type:"LINE",
        length_mm:length
      }));
      continue;
    }
    if(sourceRow?.type!=="BEND")throw new RangeError(`Unsupported row type at ${index}`);
    const signedAngle=finite(sourceRow.angle,`rows[${index}].angle`);
    const sourceRotation=finite(sourceRow.rot??0,`rows[${index}].rot`);
    const sourceEffective=[...effectiveLegacyBendAxis(
      sourceIncoming,
      sourceRow.plane,
      sourceRotation
    )];
    const sourceOutgoing=[...replayLegacyDirection(sourceIncoming,{
      angle:signedAngle,
      plane:sourceRow.plane,
      rotation:sourceRotation
    })];
    const targetOutgoing=rotatedVector(matrix,sourceOutgoing);
    const targetEffective=rotatedVector(matrix,sourceEffective);
    const solved=solveLegacyBendSettings({
      incoming:targetIncoming,
      target:targetOutgoing,
      signedAngleHintDeg:signedAngle,
      targetPlaneNormal:targetEffective,
      preferredPlane:sourceRow.plane,
      directionToleranceDeg:direction_tolerance_deg,
      planeNormalToleranceDeg:plane_tolerance_deg
    });
    if(solved.status!=="exact"){
      return freeze({
        status:"blocked",
        tube:null,
        row_index:index,
        reason:solved.reason??"Rigid rotation could not be encoded in legacy plane/rotation"
      });
    }
    targetRow.angle=signedAngle;
    targetRow.angleFormula=Number(signedAngle).toFixed(2);
    targetRow.plane=solved.plane;
    targetRow.rot=solved.rotation;
    targetRow.rotFormula=Number(solved.rotation).toFixed(2);
    reencoded.push(freeze({
      row_index:index,
      type:"BEND",
      original_plane:sourceRow.plane,
      original_rotation_deg:sourceRotation,
      target_plane:solved.plane,
      target_rotation_deg:solved.rotation,
      axis_error_deg:solved.axis_error_deg
    }));
    sourceIncoming=sourceOutgoing;
    targetIncoming=targetOutgoing;
  }

  if(out.engineering?.ports?.P1){
    out.engineering.ports.P1.position=clone(out.origin);
    out.engineering.ports.P1.direction=clone(out.startVector);
    out.engineering.ports.P1.locked=true;
  }
  if(out.engineering?.ports?.P2?.position){
    const p2=transformPoint(matrix,pointObject(out.engineering.ports.P2.position,"P2.position"));
    out.engineering.ports.P2.position={
      x:Number(p2.x.toFixed(9)),
      y:Number(p2.y.toFixed(9)),
      z:Number(p2.z.toFixed(9))
    };
    if(out.engineering.ports.P2.direction){
      const direction=rotatedVector(matrix,arrayVector(out.engineering.ports.P2.direction,"P2.direction"));
      out.engineering.ports.P2.direction=asObject(direction);
    }
  }

  return freeze({
    status:"exact",
    tube:out,
    matrix,
    angle_deg:angle,
    rows:freeze(reencoded),
    nominal_scalars_preserved:true,
    rigid_body_only:true
  });
}


export function mirrorLegacyTubeRigid(
  tube,
  {
    plane_point={x:0,y:0,z:0},
    plane_normal,
    direction_tolerance_deg=0.02,
    plane_tolerance_deg=0.05
  }={}
){
  if(!tube||typeof tube!=="object")throw new TypeError("tube is required");
  if(!Array.isArray(tube.rows)||!tube.rows.length)throw new RangeError("tube rows are required");
  const matrix=mirrorMatrix({plane_point,plane_normal});
  const out=clone(tube);
  const sourceOrigin=pointObject(tube.origin??{x:0,y:0,z:0},"tube.origin");
  const targetOrigin=transformPoint(matrix,sourceOrigin);
  out.origin={
    x:Number(targetOrigin.x.toFixed(9)),
    y:Number(targetOrigin.y.toFixed(9)),
    z:Number(targetOrigin.z.toFixed(9))
  };

  let sourceIncoming=startDirection(tube);
  let targetIncoming=rotatedVector(matrix,sourceIncoming);
  out.startVector={
    x:Number(targetIncoming[0].toFixed(12)),
    y:Number(targetIncoming[1].toFixed(12)),
    z:Number(targetIncoming[2].toFixed(12))
  };
  out.startAxis=null;

  const reencoded=[];
  for(let index=0;index<tube.rows.length;index+=1){
    const sourceRow=tube.rows[index];
    const targetRow=out.rows[index];
    if(sourceRow?.type==="LINE"){
      const length=finite(sourceRow.L,`rows[${index}].L`);
      if(length<0)throw new RangeError("LINE length must be non-negative");
      reencoded.push(freeze({
        row_index:index,
        type:"LINE",
        length_mm:length
      }));
      continue;
    }
    if(sourceRow?.type!=="BEND")throw new RangeError(`Unsupported row type at ${index}`);
    const signedAngle=finite(sourceRow.angle,`rows[${index}].angle`);
    const sourceRotation=finite(sourceRow.rot??0,`rows[${index}].rot`);
    const sourceEffective=[...effectiveLegacyBendAxis(
      sourceIncoming,
      sourceRow.plane,
      sourceRotation
    )];
    const sourceOutgoing=[...replayLegacyDirection(sourceIncoming,{
      angle:signedAngle,
      plane:sourceRow.plane,
      rotation:sourceRotation
    })];
    const targetOutgoing=rotatedVector(matrix,sourceOutgoing);

    // Plane normals / bend axes are axial vectors. Under an improper
    // reflection an axial vector transforms as det(M)*M*a = -M*a.
    const reflectedEffective=rotatedVector(matrix,sourceEffective);
    const targetEffective=reflectedEffective.map((value)=>-value);

    const solved=solveLegacyBendSettings({
      incoming:targetIncoming,
      target:targetOutgoing,
      signedAngleHintDeg:signedAngle,
      targetPlaneNormal:targetEffective,
      preferredPlane:sourceRow.plane,
      directionToleranceDeg:direction_tolerance_deg,
      planeNormalToleranceDeg:plane_tolerance_deg
    });
    if(solved.status!=="exact"){
      return freeze({
        status:"blocked",
        tube:null,
        row_index:index,
        reason:solved.reason??"Mirror could not be encoded in right-handed legacy plane/rotation"
      });
    }

    targetRow.angle=signedAngle;
    targetRow.angleFormula=Number(signedAngle).toFixed(2);
    targetRow.plane=solved.plane;
    targetRow.rot=solved.rotation;
    targetRow.rotFormula=Number(solved.rotation).toFixed(2);
    reencoded.push(freeze({
      row_index:index,
      type:"BEND",
      original_plane:sourceRow.plane,
      original_rotation_deg:sourceRotation,
      target_plane:solved.plane,
      target_rotation_deg:solved.rotation,
      axis_error_deg:solved.axis_error_deg
    }));
    sourceIncoming=sourceOutgoing;
    targetIncoming=targetOutgoing;
  }

  if(out.engineering?.ports?.P1){
    out.engineering.ports.P1.position=clone(out.origin);
    out.engineering.ports.P1.direction=clone(out.startVector);
    out.engineering.ports.P1.locked=true;
  }
  if(out.engineering?.ports?.P2?.position){
    const p2=transformPoint(matrix,pointObject(out.engineering.ports.P2.position,"P2.position"));
    out.engineering.ports.P2.position={
      x:Number(p2.x.toFixed(9)),
      y:Number(p2.y.toFixed(9)),
      z:Number(p2.z.toFixed(9))
    };
    if(out.engineering.ports.P2.direction){
      const direction=rotatedVector(matrix,arrayVector(out.engineering.ports.P2.direction,"P2.direction"));
      out.engineering.ports.P2.direction=asObject(direction);
    }
  }

  if(out.importEvidence?.spatialPlacement){
    out.importEvidence.spatialPlacement.user_origin_override=true;
    out.importEvidence.spatialPlacement.mirror_reencoded_right_handed=true;
  }
  out.mirror_handedness="right-handed-reencoded";

  return freeze({
    status:"exact",
    tube:out,
    matrix,
    plane_point:freeze(pointObject(plane_point,"plane_point")),
    plane_normal:freeze(pointObject(plane_normal,"plane_normal")),
    rows:freeze(reencoded),
    nominal_scalars_preserved:true,
    rigid_body_only:true,
    reflection_reencoded_right_handed:true
  });
}

export function translateLegacyTubeRigid(tube,delta){
  if(!tube||typeof tube!=="object")throw new TypeError("tube is required");
  const d=pointObject(delta,"delta");
  const out=clone(tube);
  const origin=pointObject(out.origin??{x:0,y:0,z:0},"tube.origin");
  out.origin={x:origin.x+d.x,y:origin.y+d.y,z:origin.z+d.z};
  if(out.engineering?.ports?.P1){
    out.engineering.ports.P1.position=clone(out.origin);
    out.engineering.ports.P1.locked=true;
  }
  if(out.engineering?.ports?.P2?.position){
    const p=pointObject(out.engineering.ports.P2.position,"P2.position");
    out.engineering.ports.P2.position={x:p.x+d.x,y:p.y+d.y,z:p.z+d.z};
  }
  return freeze({status:"exact",tube:out,delta:freeze(d),nominal_scalars_preserved:true,rigid_body_only:true});
}
