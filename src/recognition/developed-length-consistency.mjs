function positive(value,label){
  const number=Number(value);
  if(!Number.isFinite(number)||number<0){
    throw new RangeError(`${label} must be a finite non-negative number`);
  }
  return number;
}

function primitiveOf(value,index){
  const primitive=value?.primitive??value;
  if(!primitive||typeof primitive!=="object"){
    throw new TypeError(`primitive ${index} must be an object`);
  }
  return primitive;
}

export function computePrimitiveDevelopedLength(primitives){
  if(!Array.isArray(primitives)){
    throw new TypeError("primitives must be an array");
  }

  const contributions=primitives.map((value,index)=>{
    const primitive=primitiveOf(value,index);
    if(primitive.type==="LINE"){
      const length=positive(primitive.length_mm,`LINE ${index} length_mm`);
      return Object.freeze({
        index,
        type:"LINE",
        length_mm:length
      });
    }
    if(primitive.type==="BEND"){
      const clr=positive(primitive.clr_mm,`BEND ${index} clr_mm`);
      if(!(clr>0)){
        throw new RangeError(`BEND ${index} clr_mm must be > 0`);
      }
      const angle=Number(primitive.signed_sweep_deg);
      if(!Number.isFinite(angle)||Math.abs(angle)<=0){
        throw new RangeError(`BEND ${index} signed_sweep_deg must be non-zero`);
      }
      const length=clr*Math.abs(angle)*Math.PI/180;
      return Object.freeze({
        index,
        type:"BEND",
        clr_mm:clr,
        signed_sweep_deg:angle,
        length_mm:length
      });
    }
    throw new RangeError(
      `primitive ${index} has unsupported type ${String(primitive.type)}`
    );
  });

  const total=contributions.reduce(
    (sum,item)=>sum+item.length_mm,
    0
  );

  return Object.freeze({
    developed_length_mm:total,
    contributions:Object.freeze(contributions),
    production_ready:false
  });
}

/**
 * Cross-check recognized LINE/BEND geometry against exact source metadata.
 *
 * Passing this check is strong evidence that the recognized sequence preserves
 * source developed length, but it does not by itself promote geometry to
 * manufacturing truth.
 */
export function validateDevelopedLengthConsistency(
  primitives,
  expectedDevelopedLengthMm,
  { tolerance_mm=0.1 }={}
){
  const expected=positive(
    expectedDevelopedLengthMm,
    "expectedDevelopedLengthMm"
  );
  const tolerance=positive(tolerance_mm,"tolerance_mm");
  const computed=computePrimitiveDevelopedLength(primitives);
  const error=computed.developed_length_mm-expected;
  const absoluteError=Math.abs(error);
  const passed=absoluteError<=tolerance;

  return Object.freeze({
    status:passed?"passed":"violation",
    production_ready:false,
    expected_developed_length_mm:expected,
    reconstructed_developed_length_mm:computed.developed_length_mm,
    signed_error_mm:error,
    absolute_error_mm:absoluteError,
    tolerance_mm:tolerance,
    primitive_count:computed.contributions.length,
    contributions:computed.contributions,
    reason:passed
      ?"Recognized LINE/BEND developed length matches exact source metadata within tolerance."
      :"Recognized LINE/BEND developed length does not match exact source metadata within tolerance."
  });
}
