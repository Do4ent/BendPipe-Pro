const EPS=1e-12;
function freeze(value){
  if(Array.isArray(value))return Object.freeze(value.map(freeze));
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    for(const key of Object.keys(value))value[key]=freeze(value[key]);
    return Object.freeze(value);
  }
  return value;
}
function num(value,name){
  // Avoid JavaScript coercions that turn missing data into plausible zeros.
  // Numeric strings are accepted only when their content is non-blank.
  if(value==null||typeof value==="boolean"||
     (typeof value==="string"&&!value.trim())||
     (typeof value!=="number"&&typeof value!=="string")){
    throw new TypeError(`${name} must be a finite number`);
  }
  const n=Number(value);
  if(!Number.isFinite(n))throw new TypeError(`${name} must be finite`);
  return n;
}
function vec(value,name="vector"){
  if(!value||typeof value!=="object")throw new TypeError(`${name} must be an object`);
  return {x:num(value.x,`${name}.x`),y:num(value.y,`${name}.y`),z:num(value.z,`${name}.z`)};
}
function add(a,b){return {x:a.x+b.x,y:a.y+b.y,z:a.z+b.z};}
function sub(a,b){return {x:a.x-b.x,y:a.y-b.y,z:a.z-b.z};}
function scale(a,s){return {x:a.x*s,y:a.y*s,z:a.z*s};}
function dot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
function cross(a,b){return {x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x};}
function length(a){return Math.hypot(a.x,a.y,a.z);}
function unit(a,name="vector"){
  const l=length(a);
  if(!(l>EPS))throw new RangeError(`${name} must be non-zero`);
  return scale(a,1/l);
}
function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
function radToDeg(v){return v*180/Math.PI;}
function degToRad(v){return v*Math.PI/180;}
function normalize360(deg){
  let v=deg%360;
  if(v<0)v+=360;
  return Math.abs(v-360)<1e-10?0:v;
}
function closestPointOnLine(point,linePoint,lineDirection){
  const p=vec(point,"point"),a=vec(linePoint,"linePoint"),d=unit(vec(lineDirection,"lineDirection"),"lineDirection");
  const t=dot(sub(p,a),d);
  return {point:add(a,scale(d,t)),parameter:t};
}
function planeInput(plane){
  if(!plane||typeof plane!=="object")throw new TypeError("plane must be an object");
  return {point:vec(plane.point,"plane.point"),normal:unit(vec(plane.normal,"plane.normal"),"plane.normal")};
}
function lineInput(line){
  if(!line||typeof line!=="object")throw new TypeError("line must be an object");
  return {point:vec(line.point,"line.point"),direction:unit(vec(line.direction,"line.direction"),"line.direction")};
}
function angleBetweenDirections(a,b){
  return Math.acos(clamp(dot(unit(a),unit(b)),-1,1));
}

export function measurePointToPoint(a,b){
  const p=vec(a,"a"),q=vec(b,"b"),delta=sub(q,p);
  return freeze({
    kind:"point-point",
    length_mm:length(delta),
    delta_mm:delta,
    direction:length(delta)>EPS?unit(delta):null
  });
}

export function measureSegment(segment){
  if(!segment||typeof segment!=="object")throw new TypeError("segment must be an object");
  const result=measurePointToPoint(segment.start,segment.end);
  return freeze({...result,kind:"segment"});
}

export function measurePolyline(points){
  if(!Array.isArray(points)||points.length<2)throw new RangeError("polyline requires at least two points");
  let total=0;
  const segments=[];
  for(let i=1;i<points.length;i++){
    const m=measurePointToPoint(points[i-1],points[i]);
    total+=m.length_mm;
    segments.push(m.length_mm);
  }
  return freeze({kind:"polyline",length_mm:total,segment_lengths_mm:segments});
}

export function measureArc({radius_mm,sweep_rad,sweep_deg}={}){
  const r=num(radius_mm,"radius_mm");
  if(!(r>0))throw new RangeError("radius_mm must be > 0");
  const sweep=sweep_rad!==undefined?num(sweep_rad,"sweep_rad"):degToRad(num(sweep_deg,"sweep_deg"));
  return freeze({
    kind:"arc",
    radius_mm:r,
    diameter_mm:2*r,
    sweep_rad:sweep,
    sweep_deg:radToDeg(sweep),
    arc_length_mm:Math.abs(r*sweep),
    // Chord length is a non-negative distance even for full/multi-turn sweeps.
    chord_length_mm:2*r*Math.abs(Math.sin(sweep/2))
  });
}

export function measurePointToLine(point,line){
  const p=vec(point,"point"),l=lineInput(line),closest=closestPointOnLine(p,l.point,l.direction);
  const delta=sub(p,closest.point);
  return freeze({
    kind:"point-line",
    distance_mm:length(delta),
    closest_point:closest.point,
    line_parameter:closest.parameter,
    delta_mm:delta
  });
}

export function measurePointToPlane(point,plane){
  const p=vec(point,"point"),pl=planeInput(plane);
  const signed=dot(sub(p,pl.point),pl.normal);
  const closest=sub(p,scale(pl.normal,signed));
  return freeze({
    kind:"point-plane",
    distance_mm:Math.abs(signed),
    signed_distance_mm:signed,
    closest_point:closest,
    plane_normal:pl.normal
  });
}

export function measureParallelPlanes(a,b){
  const p1=planeInput(a),p2=planeInput(b);
  const alignment=Math.abs(dot(p1.normal,p2.normal));
  if(Math.abs(alignment-1)>1e-9)throw new RangeError("planes are not parallel");
  const signed=dot(sub(p2.point,p1.point),p1.normal);
  return freeze({kind:"plane-plane-distance",distance_mm:Math.abs(signed),signed_distance_mm:signed});
}

export function measureLineToLine(a,b){
  const l1=lineInput(a),l2=lineInput(b),w0=sub(l1.point,l2.point);
  const aa=dot(l1.direction,l1.direction);
  const bb=dot(l1.direction,l2.direction);
  const cc=dot(l2.direction,l2.direction);
  const dd=dot(l1.direction,w0);
  const ee=dot(l2.direction,w0);
  const denom=aa*cc-bb*bb;
  let s,t;
  if(Math.abs(denom)<EPS){
    s=0;
    t=ee/cc;
  }else{
    s=(bb*ee-cc*dd)/denom;
    t=(aa*ee-bb*dd)/denom;
  }
  const p1=add(l1.point,scale(l1.direction,s));
  const p2=add(l2.point,scale(l2.direction,t));
  return freeze({
    kind:"line-line",
    distance_mm:length(sub(p1,p2)),
    closest_point_a:p1,
    closest_point_b:p2,
    parameter_a:s,
    parameter_b:t,
    parallel:Math.abs(denom)<EPS
  });
}

export function projectVector(vector,direction){
  const v=vec(vector,"vector"),d=unit(vec(direction,"direction"),"direction");
  const scalar=dot(v,d);
  return freeze({scalar_mm:scalar,length_mm:Math.abs(scalar),vector:scale(d,scalar)});
}

export function projectPointToPlane(point,plane){
  const m=measurePointToPlane(point,plane);
  return freeze({kind:"point-plane-projection",point:m.closest_point,signed_distance_mm:m.signed_distance_mm});
}

export function projectVectorToPlane(vector,planeNormal){
  const v=vec(vector,"vector"),n=unit(vec(planeNormal,"planeNormal"),"planeNormal");
  const projected=sub(v,scale(n,dot(v,n)));
  return freeze({kind:"vector-plane-projection",vector:projected,length_mm:length(projected)});
}

export function measureAngleBetweenLines(a,b,{mode="acute",normal=null}={}){
  const l1=lineInput(a),l2=lineInput(b);
  const raw=radToDeg(angleBetweenDirections(l1.direction,l2.direction));
  if(mode==="acute"){
    const acute=Math.min(raw,180-raw);
    return freeze({kind:"line-line-angle",mode,angle_deg:acute,angle_rad:degToRad(acute)});
  }
  if(mode==="unsigned"){
    return freeze({kind:"line-line-angle",mode,angle_deg:raw,angle_rad:degToRad(raw)});
  }
  if(mode==="oriented"){
    const n=unit(vec(normal,"normal"),"normal");
    const c=cross(l1.direction,l2.direction);
    const signed=radToDeg(Math.atan2(dot(n,c),dot(l1.direction,l2.direction)));
    const angle=normalize360(signed);
    return freeze({kind:"line-line-angle",mode,angle_deg:angle,angle_rad:degToRad(angle)});
  }
  throw new RangeError("unsupported angle mode");
}

export function measureThreePointAngle(a,vertex,b,{mode="unsigned",normal=null}={}){
  const va=sub(vec(a,"a"),vec(vertex,"vertex"));
  const vb=sub(vec(b,"b"),vec(vertex,"vertex"));
  const lineA={point:{x:0,y:0,z:0},direction:va};
  const lineB={point:{x:0,y:0,z:0},direction:vb};
  const result=measureAngleBetweenLines(lineA,lineB,{mode,normal});
  return freeze({...result,kind:"three-point-angle"});
}

export function measureLinePlaneAngle(line,plane){
  const l=lineInput(line),p=planeInput(plane);
  const normalAngle=angleBetweenDirections(l.direction,p.normal);
  const acuteNormal=Math.min(normalAngle,Math.PI-normalAngle);
  const angle=Math.PI/2-acuteNormal;
  return freeze({kind:"line-plane-angle",angle_rad:angle,angle_deg:radToDeg(angle)});
}

export function measurePlanePlaneAngle(a,b,{mode="acute"}={}){
  const p1=planeInput(a),p2=planeInput(b);
  const raw=radToDeg(angleBetweenDirections(p1.normal,p2.normal));
  const unsigned=Math.min(raw,180-raw);
  if(mode==="acute")return freeze({kind:"plane-plane-angle",mode,angle_deg:unsigned,angle_rad:degToRad(unsigned)});
  if(mode==="unsigned")return freeze({kind:"plane-plane-angle",mode,angle_deg:raw,angle_rad:degToRad(raw)});
  throw new RangeError("unsupported plane angle mode");
}

export function measureCentralAngle(center,a,b,{normal=null,mode="unsigned"}={}){
  return measureThreePointAngle(a,center,b,{normal,mode});
}

export function measureTangentAngle(directionA,directionB,{mode="acute",normal=null}={}){
  const result=measureAngleBetweenLines(
    {point:{x:0,y:0,z:0},direction:directionA},
    {point:{x:0,y:0,z:0},direction:directionB},
    {mode,normal}
  );
  return freeze({...result,kind:"tangent-angle"});
}

export function measureObjectRotation({source_axes,current_axes}={}){
  if(!Array.isArray(source_axes)||source_axes.length<2||!Array.isArray(current_axes)||current_axes.length<2){
    throw new RangeError("source_axes and current_axes must contain at least two directions");
  }
  const sx=unit(vec(source_axes[0],"source_axes[0]")),sy=unit(vec(source_axes[1],"source_axes[1]"));
  const sz=unit(cross(sx,sy),"source frame");
  const cx=unit(vec(current_axes[0],"current_axes[0]")),cy=unit(vec(current_axes[1],"current_axes[1]"));
  const cz=unit(cross(cx,cy),"current frame");
  const trace=dot(sx,cx)+dot(sy,cy)+dot(sz,cz);
  const angle=Math.acos(clamp((trace-1)/2,-1,1));
  return freeze({kind:"object-rotation",angle_rad:angle,angle_deg:radToDeg(angle)});
}

export function formatMeasurement(value,{decimals=1,trailingZeros=true,suffix=""}={}){
  const n=num(value,"value"),digits=Math.max(0,Math.min(12,Math.trunc(Number(decimals)||0)));
  let text=n.toFixed(digits);
  if(!trailingZeros&&text.includes("."))text=text.replace(/\.?0+$/,"");
  return text+suffix;
}

export const GeometryMeasurementMath=freeze({
  EPS,
  add,sub,scale,dot,cross,length,unit,
  degToRad,radToDeg,normalize360,
  closestPointOnLine
});
