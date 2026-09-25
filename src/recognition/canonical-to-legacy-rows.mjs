import { rebaseCanonicalToTubeLocal } from "./tube-local-frame.mjs";
import {
  solveLegacyBendSettings,
  replayLegacyDirection,
  angleBetweenVectorsDeg
} from "./legacy-row-kinematics.mjs";

function wrappedValue(value,label){
  if(!value||typeof value!=="object"||!("value" in value)){
    throw new TypeError(label+" confidence wrapper is required");
  }
  return value.value;
}

function finite(value,label){
  const n=Number(value);
  if(!Number.isFinite(n)) throw new RangeError(label+" must be finite");
  return n;
}

function vector(value,label){
  if(!Array.isArray(value)||value.length!==3){
    throw new TypeError(label+" must be a 3D vector");
  }
  const out=value.map(Number);
  if(!out.every(Number.isFinite)){
    throw new RangeError(label+" contains non-finite coordinates");
  }
  return out;
}

function lineDirection(primitive,index){
  return vector(
    wrappedValue(primitive.direction,"LINE "+index+" direction"),
    "LINE "+index+" direction"
  );
}

function alternatingTopology(primitives){
  if(!Array.isArray(primitives)||primitives.length<1) return false;
  if(primitives[0]?.type!=="LINE"||primitives.at(-1)?.type!=="LINE") return false;
  return primitives.every((p,i)=>p?.type===(i%2===0?"LINE":"BEND"));
}

/**
 * Convert canonical nominal geometry into VC207R7 editable LINE/BEND rows.
 *
 * The input is first rigidly rebased into the tube-local frame. Each bend row
 * is then solved with the same plane+rotation convention as VC207R7
 * bendSettingsForTransition(). A replay check must reproduce every following
 * straight direction; otherwise no rows are returned.
 *
 * Tooling is deliberately unresolved here. Nominal CLR comes from canonical
 * geometry and is never replaced by tooling.
 */
export function canonicalToLegacyRows(
  canonicalGeometry,
  {
    direction_tolerance_deg=0.02,
    angle_tolerance_deg=0.02,
    plane_normal_tolerance_deg=0.05
  }={}
){
  const rebased=
    canonicalGeometry?.coordinate_frame?.id==="tube-local"
      ? Object.freeze({
          status:"rebased",
          canonical_geometry:canonicalGeometry,
          frame:Object.freeze({
            status:"exact",
            frame_id:"tube-local",
            legacy_start_axis:"X",
            legacy_first_bend_plane:"XY",
            rigid_rebase:true,
            reflection_applied:false,
            scale_applied:false
          }),
          production_ready:false
        })
      : rebaseCanonicalToTubeLocal(canonicalGeometry);

  if(rebased.status!=="rebased"||!rebased.canonical_geometry){
    return Object.freeze({
      status:"blocked",
      editable_ready:false,
      production_ready:false,
      rows:null,
      coordinate_mapping:rebased.frame??null,
      blocker:rebased.frame?.reason??"Canonical geometry could not be rigidly rebased to tube-local coordinates."
    });
  }

  const canonical=rebased.canonical_geometry;
  const primitives=canonical.primitives;
  if(!alternatingTopology(primitives)){
    return Object.freeze({
      status:"blocked",
      editable_ready:false,
      production_ready:false,
      rows:null,
      coordinate_mapping:rebased.frame,
      blocker:"Legacy editable rows require a continuous alternating LINE/BEND sequence that starts and ends with LINE."
    });
  }

  const firstDirection=lineDirection(primitives[0],0);
  if(angleBetweenVectorsDeg(firstDirection,[1,0,0])>direction_tolerance_deg){
    return Object.freeze({
      status:"blocked",
      editable_ready:false,
      production_ready:false,
      rows:null,
      coordinate_mapping:rebased.frame,
      blocker:"Tube-local first LINE is not aligned to +X within tolerance."
    });
  }

  const rows=[];
  let replayDirection=[1,0,0];
  for(let i=0;i<primitives.length;i+=1){
    const primitive=primitives[i];
    if(primitive.type==="LINE"){
      const expected=lineDirection(primitive,i);
      const directionError=angleBetweenVectorsDeg(replayDirection,expected);
      if(directionError>direction_tolerance_deg){
        return Object.freeze({
          status:"blocked",
          editable_ready:false,
          production_ready:false,
          rows:null,
          coordinate_mapping:rebased.frame,
          blocker:"Legacy replay direction disagrees with canonical LINE "+i+".",
          direction_error_deg:directionError
        });
      }
      const length=finite(
        wrappedValue(primitive.length,"LINE "+i+" length"),
        "LINE "+i+" length"
      );
      if(length<0){
        throw new RangeError("LINE "+i+" length must be non-negative");
      }
      rows.push(Object.freeze({
        type:"LINE",
        L:length,
        LFormula:String(length),
        elementId:primitive.element_id,
        canonicalElementId:primitive.element_id,
        geometrySource:"canonical_dwfx"
      }));
      continue;
    }

    const previous=primitives[i-1];
    const following=primitives[i+1];
    if(!previous||!following||previous.type!=="LINE"||following.type!=="LINE"){
      throw new RangeError("BEND "+i+" is not bracketed by LINE primitives");
    }
    const incoming=lineDirection(previous,i-1);
    const outgoing=lineDirection(following,i+1);
    const signedAngle=finite(
      wrappedValue(primitive.angle,"BEND "+i+" angle"),
      "BEND "+i+" angle"
    );
    const normal=vector(
      wrappedValue(primitive.bend_plane_normal,"BEND "+i+" bend_plane_normal"),
      "BEND "+i+" bend_plane_normal"
    );

    const settings=solveLegacyBendSettings({
      incoming,
      target:outgoing,
      signedAngleHintDeg:signedAngle,
      targetPlaneNormal:normal,
      preferredPlane:i===1?"XY":null,
      directionToleranceDeg:angle_tolerance_deg,
      planeNormalToleranceDeg:plane_normal_tolerance_deg
    });
    if(settings.status!=="exact"){
      return Object.freeze({
        status:"blocked",
        editable_ready:false,
        production_ready:false,
        rows:null,
        coordinate_mapping:rebased.frame,
        blocker:"BEND "+i+" cannot be encoded exactly in VC207R7 plane/rotation semantics: "+settings.reason,
        bend_settings:settings
      });
    }

    const clr=finite(
      wrappedValue(primitive.clr,"BEND "+i+" CLR"),
      "BEND "+i+" CLR"
    );
    if(!(clr>0)) throw new RangeError("BEND "+i+" CLR must be positive");

    const rebuilt=replayLegacyDirection(replayDirection,{
      angle:settings.angle,
      plane:settings.plane,
      rotation:settings.rotation
    });
    const error=angleBetweenVectorsDeg(rebuilt,outgoing);
    if(error>direction_tolerance_deg){
      return Object.freeze({
        status:"blocked",
        editable_ready:false,
        production_ready:false,
        rows:null,
        coordinate_mapping:rebased.frame,
        blocker:"BEND "+i+" legacy replay exceeds direction tolerance.",
        direction_error_deg:error
      });
    }

    rows.push(Object.freeze({
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
      geometrySource:"canonical_dwfx"
    }));
    replayDirection=rebuilt;
  }

  return Object.freeze({
    status:"legacy_rows_candidate",
    editable_ready:true,
    canonical_ready:true,
    production_ready:false,
    startAxis:"X",
    startPlane:"XY",
    startAngle:0,
    origin:Object.freeze({x:0,y:0,z:0}),
    coordinate_mapping:rebased.frame,
    rows:Object.freeze(rows),
    toolingUnresolved:true,
    toolingId:null,
    import_validation:Object.freeze({
      productionBlocked:true,
      coordinateMappingResolved:true,
      canonicalGeometryPreserved:true,
      legacyAxisPlaneDefaultsApplied:false,
      toolingResolved:false
    }),
    blocker:"Editable geometry mapping is exact, but tooling/style/machine confirmation and production release remain downstream gates."
  });
}
