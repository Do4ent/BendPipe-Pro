import { rebaseCanonicalToTubeLocal } from "../../recognition/tube-local-frame.mjs";
import {
  solveLegacyBendSettings,
  replayLegacyDirection,
  angleBetweenVectorsDeg
} from "../../recognition/legacy-row-kinematics.mjs";

function clone(value){
  return value==null ? value : JSON.parse(JSON.stringify(value));
}
function finite(value,label){
  const n=Number(value);
  if(!Number.isFinite(n))throw new RangeError(label+" must be finite");
  return n;
}
function point3(value,label){
  if(!Array.isArray(value)||value.length!==3)throw new TypeError(label+" must be a 3D vector");
  const out=value.map(Number);
  if(!out.every(Number.isFinite))throw new RangeError(label+" contains non-finite values");
  return out;
}
function unwrap(value,label){
  if(!value||typeof value!=="object"||!("value" in value))throw new TypeError(label+" wrapper is required");
  return value.value;
}
function matrix16(value){
  if(!Array.isArray(value)||value.length!==16)throw new TypeError("placement matrix must contain 16 values");
  const out=value.map(Number);
  if(!out.every(Number.isFinite))throw new RangeError("placement matrix contains non-finite values");
  return out;
}
function add(a,b){return [a[0]+b[0],a[1]+b[1],a[2]+b[2]];}
function mul(a,s){return [a[0]*s,a[1]*s,a[2]*s];}
function combineBasis(frame,local){
  const p=point3(local,"tube-local value");
  return [
    frame.axes.x[0]*p[0]+frame.axes.y[0]*p[1]+frame.axes.z[0]*p[2],
    frame.axes.x[1]*p[0]+frame.axes.y[1]*p[1]+frame.axes.z[1]*p[2],
    frame.axes.x[2]*p[0]+frame.axes.y[2]*p[1]+frame.axes.z[2]*p[2]
  ];
}
function rotateVector(source,matrix){
  const [x,y,z]=point3(source,"source vector");
  const m=matrix16(matrix);
  return [
    m[0]*x+m[4]*y+m[8]*z,
    m[1]*x+m[5]*y+m[9]*z,
    m[2]*x+m[6]*y+m[10]*z
  ];
}
function normalize(value,label="vector"){
  const v=point3(value,label);
  const l=Math.hypot(...v);
  if(!(l>1e-12))throw new RangeError(label+" is degenerate");
  return v.map((x)=>x/l);
}
function transformSourcePointMm(point,matrix,scale){
  const p=point3(point,"source point");
  const m=matrix16(matrix);
  return [
    m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12]*scale,
    m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13]*scale,
    m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]*scale
  ];
}
function transformSourceVector(vector,matrix){
  return normalize(rotateVector(vector,matrix),"placed vector");
}
function transformLocalPointMm(point,frame,matrix,scale){
  const source=add(point3(frame.origin,"frame origin"),combineBasis(frame,point));
  return transformSourcePointMm(source,matrix,scale);
}
function transformLocalVector(vector,frame,matrix){
  return transformSourceVector(combineBasis(frame,vector),matrix);
}
function alternating(primitives){
  return Array.isArray(primitives)&&
    primitives.length>0&&
    primitives[0]?.type==="LINE"&&
    primitives.at(-1)?.type==="LINE"&&
    primitives.every((p,i)=>p?.type===(i%2===0?"LINE":"BEND"));
}
function displayAxis(vector){
  const v=normalize(vector);
  const axes=[
    ["X",Math.abs(v[0]),v[0]],
    ["Y",Math.abs(v[1]),v[1]],
    ["Z",Math.abs(v[2]),v[2]]
  ].sort((a,b)=>b[1]-a[1]);
  return (axes[0][2]<0?"-":"")+axes[0][0];
}
function displayPlane(axis){
  const a=String(axis).replace("-","");
  if(a==="Y")return "XY";
  if(a==="Z")return "XZ";
  return "XY";
}
function nodeList(nodes,out=[]){
  for(const node of nodes??[]){
    if(node?.editable_part_number)out.push(node);
    nodeList(node?.children,out);
  }
  return out;
}
function spatialNodeByPart(referenceScene){
  const map=new Map();
  for(const node of nodeList(referenceScene?.tree)){
    const part=String(node.editable_part_number??"");
    if(!part)continue;
    if(map.has(part)){
      map.set(part,null);
      continue;
    }
    map.set(part,node);
  }
  return map;
}

export function spatiallyPlaceEditableTube({
  tube,
  reference_node,
  scale_mm_per_source_unit,
  direction_tolerance_deg=0.02,
  plane_normal_tolerance_deg=0.05
}){
  if(!tube||typeof tube!=="object")throw new TypeError("tube is required");
  const canonical=tube.importEvidence?.canonicalGeometry;
  if(!canonical||!Array.isArray(canonical.primitives)||!canonical.primitives.length){
    throw new RangeError("imported tube canonical geometry is required");
  }
  const instances=reference_node?.geometry_instances;
  if(!Array.isArray(instances)||instances.length!==1){
    return Object.freeze({
      status:"blocked",
      tube:null,
      blocker:"Exactly one source placement instance is required for editable tube "+String(tube.partNumber??tube.name??"")
    });
  }
  const matrix=matrix16(instances[0].placement_matrix);
  const scale=finite(scale_mm_per_source_unit,"scale_mm_per_source_unit");
  if(!(scale>0))throw new RangeError("scale_mm_per_source_unit must be positive");

  const primitives=canonical.primitives;
  if(!alternating(primitives)&&!(primitives.length===1&&primitives[0]?.type==="LINE")){
    return Object.freeze({
      status:"blocked",
      tube:null,
      blocker:"Placed editable tube requires alternating LINE/BEND canonical topology."
    });
  }

  let origin;
  let startVector;
  let rows=[];

  if(primitives.length===1){
    const line=primitives[0];
    origin=transformSourcePointMm(unwrap(line.start,"LINE start"),matrix,scale);
    startVector=transformSourceVector(unwrap(line.direction,"LINE direction"),matrix);
    const length=finite(unwrap(line.length,"LINE length"),"LINE length");
    rows=[{
      type:"LINE",
      L:length,
      LFormula:String(length),
      elementId:line.element_id,
      canonicalElementId:line.element_id,
      geometrySource:"canonical_dwfx_placed"
    }];
  }else{
    const rebased=rebaseCanonicalToTubeLocal(canonical);
    if(rebased.status!=="rebased"||!rebased.canonical_geometry||rebased.frame?.status!=="exact"){
      return Object.freeze({
        status:"blocked",
        tube:null,
        blocker:rebased.frame?.reason??"Tube-local rebase is required before source placement."
      });
    }
    const frame=rebased.frame;
    const local=rebased.canonical_geometry.primitives;
    origin=transformLocalPointMm([0,0,0],frame,matrix,scale);
    startVector=transformLocalVector([1,0,0],frame,matrix);
    let replay=[...startVector];

    for(let i=0;i<local.length;i+=1){
      const primitive=local[i];
      if(primitive.type==="LINE"){
        const expected=transformLocalVector(
          unwrap(primitive.direction,"LINE "+i+" direction"),
          frame,
          matrix
        );
        const directionError=angleBetweenVectorsDeg(replay,expected);
        if(directionError>direction_tolerance_deg){
          return Object.freeze({
            status:"blocked",
            tube:null,
            blocker:"Placed legacy replay disagrees with LINE "+i+".",
            direction_error_deg:directionError
          });
        }
        const length=finite(unwrap(primitive.length,"LINE "+i+" length"),"LINE "+i+" length");
        rows.push({
          type:"LINE",
          L:length,
          LFormula:String(length),
          elementId:primitive.element_id,
          canonicalElementId:primitive.element_id,
          geometrySource:"canonical_dwfx_placed"
        });
        continue;
      }

      const previous=local[i-1];
      const following=local[i+1];
      const incoming=transformLocalVector(unwrap(previous.direction,"incoming direction"),frame,matrix);
      const outgoing=transformLocalVector(unwrap(following.direction,"outgoing direction"),frame,matrix);
      const normal=transformLocalVector(unwrap(primitive.bend_plane_normal,"bend normal"),frame,matrix);
      const signedAngle=finite(unwrap(primitive.angle,"bend angle"),"bend angle");
      const settings=solveLegacyBendSettings({
        incoming,
        target:outgoing,
        signedAngleHintDeg:signedAngle,
        targetPlaneNormal:normal,
        preferredPlane:i===1?displayPlane(displayAxis(startVector)):null,
        directionToleranceDeg:direction_tolerance_deg,
        planeNormalToleranceDeg:plane_normal_tolerance_deg
      });
      if(settings.status!=="exact"){
        return Object.freeze({
          status:"blocked",
          tube:null,
          blocker:"Placed BEND "+i+" cannot be encoded exactly: "+settings.reason,
          bend_settings:settings
        });
      }
      const clr=finite(unwrap(primitive.clr,"BEND "+i+" CLR"),"BEND "+i+" CLR");
      rows.push({
        type:"BEND",
        angle:settings.angle,
        angleFormula:String(settings.angle),
        plane:settings.plane,
        rot:settings.rotation,
        rotFormula:String(settings.rotation),
        clr,
        clrSource:"recognized_canonical_geometry",
        clrToolingId:null,
        elementId:primitive.element_id,
        canonicalElementId:primitive.element_id,
        geometrySource:"canonical_dwfx_placed"
      });
      replay=[...replayLegacyDirection(replay,{
        angle:settings.angle,
        plane:settings.plane,
        rotation:settings.rotation
      })];
      const error=angleBetweenVectorsDeg(replay,outgoing);
      if(error>direction_tolerance_deg){
        return Object.freeze({
          status:"blocked",
          tube:null,
          blocker:"Placed BEND "+i+" replay exceeds direction tolerance.",
          direction_error_deg:error
        });
      }
    }
  }

  const axis=displayAxis(startVector);
  const placed=clone(tube);
  placed.rows=rows;
  placed.origin={x:origin[0],y:origin[1],z:origin[2]};
  placed.startVector={x:startVector[0],y:startVector[1],z:startVector[2]};
  placed.startAxis=axis;
  placed.startPlane=displayPlane(axis);
  placed.startAngle=0;
  placed.importEvidence={
    ...(placed.importEvidence??{}),
    spatialPlacement:{
      status:"exact",
      source_object_id:String(reference_node?.id??""),
      source_object_label:String(reference_node?.label??""),
      placement_matrix:[...matrix],
      scale_mm_per_source_unit:scale,
      origin_mm:[...origin],
      start_vector:[...startVector],
      placement_source:"dwfx_reference_scene_exact_instance",
      machine_compensation_applied:false
    }
  };
  placed.importValidation={
    ...(placed.importValidation??{}),
    productionBlocked:true,
    spatialPlacementResolved:true,
    coordinateMappingResolved:true
  };
  return Object.freeze({
    status:"placed",
    tube:placed,
    origin_mm:Object.freeze([...origin]),
    start_vector:Object.freeze([...startVector]),
    production_ready:false
  });
}

export function spatiallyPlaceDwfxAssembly({
  assembly,
  reference_scene
}){
  if(!assembly||!Array.isArray(assembly.tubes))throw new TypeError("assembly.tubes is required");
  if(!reference_scene||!Array.isArray(reference_scene.tree)){
    return Object.freeze({
      status:"blocked",
      assembly:null,
      blocker:"Reference scene hierarchy is required to preserve DWFx spatial placement."
    });
  }
  const scale=Number(reference_scene.scale_mm_per_source_unit);
  if(!Number.isFinite(scale)||scale<=0){
    return Object.freeze({
      status:"blocked",
      assembly:null,
      blocker:"Reference scene source scale is required to preserve DWFx spatial placement."
    });
  }

  const nodes=spatialNodeByPart(reference_scene);
  const placed=[];
  const blocked=[];
  for(const tube of assembly.tubes){
    const part=String(tube?.partNumber??tube?.name??"");
    const node=nodes.get(part);
    if(!node){
      blocked.push({part_number:part,blocker:"Unique reference-scene node was not found."});
      continue;
    }
    const result=spatiallyPlaceEditableTube({
      tube,
      reference_node:node,
      scale_mm_per_source_unit:scale
    });
    if(result.status!=="placed"){
      blocked.push({part_number:part,blocker:result.blocker??"Spatial placement failed."});
      continue;
    }
    placed.push(result.tube);
  }

  if(blocked.length){
    return Object.freeze({
      status:"blocked",
      assembly:null,
      blocked_parts:Object.freeze(blocked.map(Object.freeze)),
      blocker:"One or more editable DWFx tubes could not preserve exact source spatial placement."
    });
  }

  return Object.freeze({
    status:"placed_assembly",
    assembly:Object.freeze({
      ...assembly,
      tubes:Object.freeze(placed),
      spatial_placement_status:"exact_reference_scene"
    }),
    placed_count:placed.length,
    production_ready:false
  });
}
