function point3(value,label="vector"){
  if(!Array.isArray(value)||value.length!==3){
    throw new TypeError(label+" must be a 3D vector");
  }
  const out=value.map(Number);
  if(!out.every(Number.isFinite)){
    throw new RangeError(label+" contains non-finite values");
  }
  return out;
}

const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[
  a[1]*b[2]-a[2]*b[1],
  a[2]*b[0]-a[0]*b[2],
  a[0]*b[1]-a[1]*b[0]
];
const len=(a)=>Math.hypot(a[0],a[1],a[2]);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function unit(value,label="vector"){
  const v=point3(value,label);
  const l=len(v);
  if(!(l>1e-15)) throw new RangeError(label+" is degenerate");
  return mul(v,1/l);
}

function rotateAround(vector,axis,angleRad){
  const v=point3(vector,"rotation vector");
  const n=unit(axis,"rotation axis");
  const c=Math.cos(angleRad),s=Math.sin(angleRad);
  return add(
    add(mul(v,c),mul(cross(n,v),s)),
    mul(n,dot(n,v)*(1-c))
  );
}

export const LEGACY_PLANE_NORMALS=Object.freeze({
  XY:Object.freeze([0,0,1]),
  YZ:Object.freeze([1,0,0]),
  XZ:Object.freeze([0,-1,0])
});

export function legacyPlaneNormal(plane){
  const value=LEGACY_PLANE_NORMALS[String(plane??"").toUpperCase()];
  return value?Object.freeze([...value]):null;
}

export function effectiveLegacyBendAxis(tangent,plane="XY",rotationDeg=0){
  const t=unit(tangent,"incoming tangent");
  const raw=legacyPlaneNormal(plane);
  if(!raw) throw new RangeError("unsupported legacy bend plane "+String(plane));
  let base=sub(raw,mul(t,dot(raw,t)));
  // When the legacy plane normal is effectively parallel to the incoming\n  // tangent, its projected direction is numerically undefined. Replay can\n  // accumulate sub-nanoradian noise, so use the stable fallback before that\n  // noise is normalized into an arbitrary bend axis.\n  if(len(base)<1e-8){\n    const helper=Math.abs(t[2])<0.88?[0,0,1]:[0,1,0];
    base=cross(helper,t);
  }
  base=unit(base,"projected legacy bend axis");
  const angle=Number(rotationDeg)*Math.PI/180;
  if(!Number.isFinite(angle)) throw new RangeError("rotationDeg must be finite");
  return Object.freeze(unit(rotateAround(base,t,angle),"rotated legacy bend axis"));
}

export function signedAngleAroundAxisDeg(from,to,axis){
  const a=unit(from,"from axis");
  const b=unit(to,"to axis");
  const n=unit(axis,"rotation axis");
  const sine=dot(n,cross(a,b));
  const cosine=clamp(dot(a,b),-1,1);
  let angle=Math.atan2(sine,cosine)*180/Math.PI;
  if(Math.abs(angle)<1e-12) angle=0;
  return angle;
}

function angleBetweenDeg(a,b){
  return Math.acos(clamp(dot(unit(a),unit(b)),-1,1))*180/Math.PI;
}

function normalizeSignedDeg(value){
  let x=Number(value);
  if(!Number.isFinite(x)) throw new RangeError("angle must be finite");
  x=((x+180)%360+360)%360-180;
  if(x<=-180+1e-10) x=180;
  if(Math.abs(x)<1e-12) x=0;
  return x;
}

/**
 * Pure-JS equivalent of VC207R7 bendSettingsForTransition().
 *
 * The sign of signedAngleHintDeg is preserved; plane+rotation encode the
 * effective bend axis. targetPlaneNormal is used to disambiguate 180-degree
 * transitions and to cross-check canonical bend orientation.
 */
export function solveLegacyBendSettings({
  incoming,
  target,
  signedAngleHintDeg,
  targetPlaneNormal=null,
  preferredPlane=null,
  directionToleranceDeg=0.02,
  planeNormalToleranceDeg=0.05
}){
  const inDir=unit(incoming,"incoming");
  const outDir=unit(target,"target");
  const dotDirections=clamp(dot(inDir,outDir),-1,1);
  const magnitude=Math.acos(dotDirections)*180/Math.PI;
  if(magnitude<0.05||magnitude>180.000001){
    return Object.freeze({
      status:"unresolved",
      reason:"transition angle is outside the supported bend range"
    });
  }

  const hint=Number(signedAngleHintDeg);
  if(!Number.isFinite(hint)||Math.abs(hint)<0.05){
    return Object.freeze({
      status:"unresolved",
      reason:"signed canonical bend angle is missing"
    });
  }
  const sign=Math.sign(hint)||1;
  if(Math.abs(Math.abs(hint)-magnitude)>directionToleranceDeg){
    return Object.freeze({
      status:"blocked",
      reason:"canonical bend angle disagrees with adjacent straight directions",
      transition_angle_deg:magnitude,
      canonical_angle_deg:hint
    });
  }

  let usedAxis=cross(inDir,outDir);
  if(len(usedAxis)<1e-10){
    if(dotDirections>0){
      return Object.freeze({
        status:"unresolved",
        reason:"parallel straight directions do not define a bend axis"
      });
    }
    if(targetPlaneNormal==null){
      return Object.freeze({
        status:"unresolved",
        reason:"180-degree transition requires canonical bend-plane normal"
      });
    }
    usedAxis=mul(unit(targetPlaneNormal,"targetPlaneNormal"),sign);
  }else{
    usedAxis=unit(usedAxis,"transition bend axis");
  }

  if(targetPlaneNormal!=null){
    const canonicalActual=mul(unit(targetPlaneNormal,"targetPlaneNormal"),sign);
    const normalError=angleBetweenDeg(usedAxis,canonicalActual);
    if(normalError>planeNormalToleranceDeg){
      return Object.freeze({
        status:"blocked",
        reason:"canonical bend-plane orientation disagrees with line transition",
        plane_normal_error_deg:normalError
      });
    }
  }

  const desiredEffective=mul(usedAxis,sign);
  const planes=["XY","YZ","XZ"];
  let best=null;
  for(const plane of planes){
    const base=effectiveLegacyBendAxis(inDir,plane,0);
    const rotation=normalizeSignedDeg(
      signedAngleAroundAxisDeg(base,desiredEffective,inDir)
    );
    const rebuilt=effectiveLegacyBendAxis(inDir,plane,rotation);
    const error=angleBetweenDeg(rebuilt,desiredEffective);
    const score=
      error+
      Math.abs(rotation)*1e-5+
      (plane===preferredPlane?-1e-6:0);
    if(!best||score<best.score){
      best={plane,rotation,error,score};
    }
  }

  if(!best||best.error>0.01){
    return Object.freeze({
      status:"unresolved",
      reason:"legacy plane/rotation encoding could not reproduce bend axis"
    });
  }

  return Object.freeze({
    status:"exact",
    angle:Number((magnitude*sign).toFixed(6)),
    plane:best.plane,
    rotation:Number(best.rotation.toFixed(6)),
    axis_error_deg:best.error,
    transition_angle_deg:magnitude
  });
}

export function replayLegacyDirection(incoming,{angle,plane,rotation}){
  const dir=unit(incoming,"incoming");
  const signed=Number(angle);
  if(!Number.isFinite(signed)||Math.abs(signed)<1e-12){
    throw new RangeError("legacy bend angle must be finite and non-zero");
  }
  const effective=effectiveLegacyBendAxis(dir,plane,rotation);
  const actualAxis=mul(effective,Math.sign(signed)||1);
  return Object.freeze(unit(
    rotateAround(dir,actualAxis,Math.abs(signed)*Math.PI/180),
    "legacy outgoing direction"
  ));
}

export function angleBetweenVectorsDeg(a,b){
  return angleBetweenDeg(a,b);
}
