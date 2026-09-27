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

function finite(value,label){
  const n=Number(value);
  if(!Number.isFinite(n))throw new RangeError(label+" must be finite");
  return n;
}

function clamp(value,min,max){
  return Math.max(min,Math.min(max,value));
}

function unit(value,label="vector"){
  const v=point3(value,label);
  const length=Math.hypot(...v);
  if(!(length>1e-12))throw new RangeError(label+" is degenerate");
  return v.map((component)=>component/length);
}

export const AXIS_PARALLEL_TOLERANCE_DEG=0.25;
export const BEND_ANGLE_INTEGER_TOLERANCE_DEG=0.01;

export function snapDirectionToPrincipalAxis(
  direction,
  {tolerance_deg=AXIS_PARALLEL_TOLERANCE_DEG}={}
){
  const tolerance=finite(tolerance_deg,"tolerance_deg");
  if(tolerance<0||tolerance>=90){
    throw new RangeError("tolerance_deg must be in [0,90)");
  }
  const source=unit(direction,"direction");
  const candidates=[
    {axis:"X",index:0},
    {axis:"Y",index:1},
    {axis:"Z",index:2}
  ].map((candidate)=>{
    const component=source[candidate.index];
    const sign=component<0?-1:1;
    const deviation=Math.acos(
      clamp(Math.abs(component),-1,1)
    )*180/Math.PI;
    const editable=[0,0,0];
    editable[candidate.index]=sign;
    return {
      axis:(sign<0?"-":"+")+candidate.axis,
      deviation_deg:deviation,
      editable_direction:editable
    };
  }).sort((a,b)=>a.deviation_deg-b.deviation_deg);

  const nearest=candidates[0];
  const parallel=nearest.deviation_deg<=tolerance;
  const editable=parallel?[...nearest.editable_direction]:[...source];
  const changed=parallel&&nearest.deviation_deg>1e-10;

  return Object.freeze({
    status:parallel?"axis_parallel":"free_direction",
    source_direction:Object.freeze([...source]),
    editable_direction:Object.freeze(editable),
    parallel_axis:parallel?nearest.axis:null,
    deviation_deg:nearest.deviation_deg,
    tolerance_deg:tolerance,
    snapped:changed,
    source_preserved:true
  });
}

export function roundBendAngleNearInteger(
  angle_deg,
  {tolerance_deg=BEND_ANGLE_INTEGER_TOLERANCE_DEG}={}
){
  const source=finite(angle_deg,"angle_deg");
  const tolerance=finite(tolerance_deg,"tolerance_deg");
  if(tolerance<0||tolerance>=0.5){
    throw new RangeError("tolerance_deg must be in [0,0.5)");
  }
  const nearest=source<0
    ?-Math.round(Math.abs(source))
    :Math.round(source);
  const deviation=Math.abs(source-nearest);
  const rounded=deviation<=tolerance;
  const editable=rounded?nearest:source;

  return Object.freeze({
    status:rounded?"rounded_integer":"preserved_non_integer",
    source_angle_deg:source,
    editable_angle_deg:Object.is(editable,-0)?0:editable,
    nearest_integer_deg:Object.is(nearest,-0)?0:nearest,
    deviation_deg:deviation,
    tolerance_deg:tolerance,
    rounded_to_integer:rounded,
    source_preserved:true
  });
}
