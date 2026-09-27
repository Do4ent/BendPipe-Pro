import {
  effectiveLegacyBendAxis,
  replayLegacyDirection,
  angleBetweenVectorsDeg
} from "../../recognition/legacy-row-kinematics.mjs";
import { centerlineArcLength } from "../../domain/geometry/centerline.mjs";
import { AXIS_PARALLEL_TOLERANCE_DEG } from "./editable-geometry-normalization.mjs";

function clone(value){
  return value==null ? value : JSON.parse(JSON.stringify(value));
}

function finite(value,label){
  const n=Number(value);
  if(!Number.isFinite(n))throw new RangeError(label+" must be finite");
  return n;
}

function point3(value,label){
  if(Array.isArray(value)&&value.length===3){
    const out=value.map(Number);
    if(out.every(Number.isFinite))return out;
  }
  if(value&&typeof value==="object"){
    const out=[Number(value.x),Number(value.y),Number(value.z)];
    if(out.every(Number.isFinite))return out;
  }
  throw new TypeError(label+" must be a finite 3D point/vector");
}

function add(a,b){return [a[0]+b[0],a[1]+b[1],a[2]+b[2]];}
function sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function mul(a,s){return [a[0]*s,a[1]*s,a[2]*s];}
function cross(a,b){
  return [
    a[1]*b[2]-a[2]*b[1],
    a[2]*b[0]-a[0]*b[2],
    a[0]*b[1]-a[1]*b[0]
  ];
}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function length(a){return Math.hypot(a[0],a[1],a[2]);}
function normalize(value,label){
  const v=point3(value,label);
  const l=length(v);
  if(!(l>1e-12))throw new RangeError(label+" is degenerate");
  return v.map((item)=>item/l);
}
function rotateAround(vector,axis,angleRad){
  const v=point3(vector,"rotation vector");
  const n=normalize(axis,"rotation axis");
  const c=Math.cos(angleRad),s=Math.sin(angleRad);
  return add(
    add(mul(v,c),mul(cross(n,v),s)),
    mul(n,dot(n,v)*(1-c))
  );
}
function distance(a,b){return length(sub(a,b));}
function freeze3(value){return Object.freeze([...value]);}

function axisVector(axis){
  const text=String(axis??"").trim().toUpperCase();
  const sign=text.startsWith("-")?-1:1;
  const key=text.replace(/^[-+]/,"");
  if(key==="X")return [sign,0,0];
  if(key==="Y")return [0,sign,0];
  if(key==="Z")return [0,0,sign];
  return null;
}

function startDirection(tube){
  if(tube?.startVector!=null){
    return normalize(tube.startVector,"tube.startVector");
  }
  const fromAxis=axisVector(tube?.startAxis);
  if(fromAxis)return fromAxis;
  return [1,0,0];
}

function topologyIssue(rows){
  if(!Array.isArray(rows)||rows.length<1)return "Editable tube has no rows.";
  if(rows[0]?.type!=="LINE"||rows.at(-1)?.type!=="LINE"){
    return "Editable tube must start and end with LINE.";
  }
  for(let index=0;index<rows.length;index+=1){
    const expected=index%2===0?"LINE":"BEND";
    if(rows[index]?.type!==expected){
      return "Editable tube rows must alternate LINE/BEND/LINE.";
    }
  }
  return null;
}

function sourceAxisRecords(tube){
  const lines=tube?.importEvidence?.spatialPlacement?.axis_parallel_normalization?.lines;
  if(!Array.isArray(lines))return new Map();
  return new Map(
    lines
      .filter((item)=>Number.isInteger(Number(item?.primitive_index)))
      .map((item)=>[Number(item.primitive_index),item])
  );
}

/**
 * Rebuild the editable centerline sequentially from the final rounded rows.
 *
 * This is deliberately downstream of all import normalization. Every element
 * starts exactly where the previous one ended; bend exit tangency becomes the
 * following LINE direction. The source/canonical evidence remains untouched.
 */
export function repairRoundedTubeContinuity(
  tube,
  {
    endpoint_tolerance_mm=1e-8,
    tangency_tolerance_deg=1e-8,
    axis_parallel_tolerance_deg=AXIS_PARALLEL_TOLERANCE_DEG
  }={}
){
  if(!tube||typeof tube!=="object")throw new TypeError("tube is required");
  const rows=tube.rows;
  const topology=topologyIssue(rows);
  if(topology){
    return Object.freeze({
      status:"blocked",
      tube:null,
      blocker:topology,
      production_ready:false
    });
  }

  const endpointTolerance=finite(endpoint_tolerance_mm,"endpoint_tolerance_mm");
  const tangentTolerance=finite(tangency_tolerance_deg,"tangency_tolerance_deg");
  const axisTolerance=finite(axis_parallel_tolerance_deg,"axis_parallel_tolerance_deg");
  if(endpointTolerance<0||tangentTolerance<0||axisTolerance<0){
    throw new RangeError("integrity tolerances must be non-negative");
  }

  try{
    const out=clone(tube);
    const origin=point3(out.origin??{x:0,y:0,z:0},"tube.origin");
    const sourceStart=startDirection(out);
    const normalizedStart=normalize(sourceStart,"tube start direction");
    out.startVector={
      x:normalizedStart[0],
      y:normalizedStart[1],
      z:normalizedStart[2]
    };

    const axisRecords=sourceAxisRecords(out);
    const elements=[];
    const joins=[];
    const axisChecks=[];
    let currentPoint=[...origin];
    let currentDirection=[...normalizedStart];
    let totalLength=0;
    let maxGap=0;
    let maxTangency=0;

    for(let index=0;index<rows.length;index+=1){
      const row=rows[index];
      const elementStart=[...currentPoint];
      const tangentIn=[...currentDirection];

      if(row.type==="LINE"){
        const lineLength=finite(row.L,"rows["+index+"].L");
        if(lineLength<0)throw new RangeError("LINE length must be non-negative");
        const end=add(elementStart,mul(tangentIn,lineLength));
        const record=axisRecords.get(index);
        if(record?.status==="axis_parallel"&&Array.isArray(record.editable_direction)){
          const expectedAxis=normalize(
            record.editable_direction,
            "axis-parallel LINE "+index
          );
          const error=angleBetweenVectorsDeg(tangentIn,expectedAxis);
          axisChecks.push(Object.freeze({
            row_index:index,
            expected_axis:record.parallel_axis??null,
            expected_direction:freeze3(expectedAxis),
            replay_direction:freeze3(tangentIn),
            deviation_deg:error,
            tolerance_deg:axisTolerance,
            passed:error<=axisTolerance
          }));
          if(error>axisTolerance){
            return Object.freeze({
              status:"blocked",
              tube:null,
              blocker:
                "Rounded tube continuity would violate recognized axis alignment at LINE "+
                index+".",
              row_index:index,
              axis_deviation_deg:error,
              axis_tolerance_deg:axisTolerance,
              production_ready:false
            });
          }
        }
        elements.push(Object.freeze({
          row_index:index,
          type:"LINE",
          start:freeze3(elementStart),
          end:freeze3(end),
          direction:freeze3(tangentIn),
          length_mm:lineLength
        }));
        totalLength+=lineLength;
        currentPoint=end;
        continue;
      }

      const clr=finite(row.clr,"rows["+index+"].clr");
      const angle=finite(row.angle,"rows["+index+"].angle");
      const rotation=finite(row.rot??0,"rows["+index+"].rot");
      if(!(clr>0))throw new RangeError("BEND CLR must be positive");
      if(Math.abs(angle)<1e-12)throw new RangeError("BEND angle must be non-zero");

      const effective=effectiveLegacyBendAxis(
        tangentIn,
        row.plane,
        rotation
      );
      const actualAxis=mul(effective,Math.sign(angle)||1);
      const center=add(
        elementStart,
        mul(cross(actualAxis,tangentIn),clr)
      );
      const radialStart=sub(elementStart,center);
      const radialEnd=rotateAround(
        radialStart,
        actualAxis,
        Math.abs(angle)*Math.PI/180
      );
      const end=add(center,radialEnd);
      const tangentOut=[...replayLegacyDirection(tangentIn,{
        angle,
        plane:row.plane,
        rotation
      })];
      const tangentFromArc=normalize(
        cross(actualAxis,radialEnd),
        "BEND "+index+" arc exit tangent"
      );
      const tangencyError=angleBetweenVectorsDeg(tangentOut,tangentFromArc);
      maxTangency=Math.max(maxTangency,tangencyError);
      if(tangencyError>tangentTolerance){
        return Object.freeze({
          status:"blocked",
          tube:null,
          blocker:"Rounded BEND "+index+" failed tangency reconstruction.",
          row_index:index,
          tangency_error_deg:tangencyError,
          tangency_tolerance_deg:tangentTolerance,
          production_ready:false
        });
      }

      elements.push(Object.freeze({
        row_index:index,
        type:"BEND",
        start:freeze3(elementStart),
        end:freeze3(end),
        center:freeze3(center),
        tangent_in:freeze3(tangentIn),
        tangent_out:freeze3(tangentOut),
        bend_axis:freeze3(actualAxis),
        clr_mm:clr,
        angle_deg:angle,
        rotation_deg:rotation,
        plane:String(row.plane??""),
        arc_length_mm:centerlineArcLength(clr,angle)
      }));
      totalLength+=centerlineArcLength(clr,angle);
      currentPoint=end;
      currentDirection=tangentOut;
    }

    for(let index=1;index<elements.length;index+=1){
      const previous=elements[index-1];
      const next=elements[index];
      const gap=distance(previous.end,next.start);
      maxGap=Math.max(maxGap,gap);
      let tangency=0;
      const previousTangent=previous.type==="LINE"
        ?previous.direction
        :previous.tangent_out;
      const nextTangent=next.type==="LINE"
        ?next.direction
        :next.tangent_in;
      tangency=angleBetweenVectorsDeg(previousTangent,nextTangent);
      maxTangency=Math.max(maxTangency,tangency);
      joins.push(Object.freeze({
        join_index:index-1,
        from_row:previous.row_index,
        to_row:next.row_index,
        gap_mm:gap,
        tangency_error_deg:tangency,
        passed:
          gap<=endpointTolerance&&
          tangency<=tangentTolerance
      }));
      if(gap>endpointTolerance||tangency>tangentTolerance){
        return Object.freeze({
          status:"blocked",
          tube:null,
          blocker:"Rounded tube contains a discontinuous element join.",
          join_index:index-1,
          endpoint_gap_mm:gap,
          tangency_error_deg:tangency,
          production_ready:false
        });
      }
    }

    const integrity=Object.freeze({
      status:"continuous",
      geometry_rebuilt_from_rounded_rows:true,
      correction_rule:"sequential_replay_from_tube_start",
      single_continuous_tube:true,
      row_count:rows.length,
      element_count:elements.length,
      join_count:joins.length,
      endpoint_tolerance_mm:endpointTolerance,
      tangency_tolerance_deg:tangentTolerance,
      max_endpoint_gap_mm:maxGap,
      max_tangency_error_deg:maxTangency,
      rounded_centerline_length_mm:totalLength,
      start_point_mm:freeze3(origin),
      end_point_mm:freeze3(currentPoint),
      start_direction:freeze3(normalizedStart),
      end_direction:freeze3(currentDirection),
      axis_parallel_tolerance_deg:axisTolerance,
      axis_checks:Object.freeze(axisChecks),
      joins:Object.freeze(joins),
      elements:Object.freeze(elements),
      source_geometry_preserved:true,
      machine_compensation_applied:false
    });

    out.importEvidence={
      ...(out.importEvidence??{}),
      postNormalizationIntegrity:integrity
    };
    out.importValidation={
      ...(out.importValidation??{}),
      productionBlocked:true,
      postNormalizationIntegrityChecked:true,
      singleContinuousTube:true,
      continuityCorrectedAfterRounding:true,
      maxEndpointGapMm:maxGap,
      maxTangencyErrorDeg:maxTangency
    };

    return Object.freeze({
      status:"continuous_tube",
      tube:out,
      integrity,
      production_ready:false
    });
  }catch(error){
    return Object.freeze({
      status:"blocked",
      tube:null,
      blocker:error?.message??String(error),
      production_ready:false
    });
  }
}
