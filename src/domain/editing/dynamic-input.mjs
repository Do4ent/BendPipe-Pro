function freeze(value){
  if(Array.isArray(value))return Object.freeze(value.map(freeze));
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){for(const key of Object.keys(value))value[key]=freeze(value[key]);return Object.freeze(value);}
  return value;
}
const LENGTH_UNITS=Object.freeze({mm:1,cm:10,m:1000,in:25.4,inch:25.4});
const ANGLE_UNITS=Object.freeze({deg:1,"°":1,rad:180/Math.PI});
export const DECIMAL_SEPARATOR_PREFERENCES=Object.freeze(["auto",".",","]);
export function normalizeDecimalSeparatorPreference(value="auto"){
  const preference=String(value??"auto").trim();
  if(!DECIMAL_SEPARATOR_PREFERENCES.includes(preference))throw new RangeError("decimal_separator must be auto, . or ,");
  return preference;
}
export function detectNumericDecimalSeparator(input){
  const text=String(input??"").trim();
  const comma=/(?:^|[^\d])[-+]?\d+,\d+(?:$|[^\d])/.test(text);
  const dot=/(?:^|[^\d])[-+]?\d+\.\d+(?:$|[^\d])/.test(text);
  if(comma&&!dot)return ",";
  if(dot&&!comma)return ".";
  if(comma&&dot)return "mixed";
  return null;
}
export function resolveDecimalSeparator(preference="auto",{locale=null,input=null}={}){
  const normalized=normalizeDecimalSeparatorPreference(preference);
  if(normalized!=="auto")return normalized;
  const detected=input==null?null:detectNumericDecimalSeparator(input);
  if(detected==="."||detected===",")return detected;
  if(locale){
    try{
      const formatted=new Intl.NumberFormat(String(locale),{useGrouping:false,maximumFractionDigits:1}).format(1.1);
      if(formatted.includes(","))return ",";
    }catch{}
  }
  return ".";
}
export function formatNumericInput(value,{decimal_separator="auto",locale=null,maximumFractionDigits=6}={}){
  const n=Number(value);
  if(!Number.isFinite(n))throw new TypeError("value must be finite");
  const digits=Math.max(0,Math.min(12,Math.trunc(Number(maximumFractionDigits))));
  let text=n.toFixed(digits);
  if(text.includes("."))text=text.replace(/0+$/,"").replace(/\.$/,"");
  return resolveDecimalSeparator(decimal_separator,{locale})===","?text.replace(".",","):text;
}
function normalizeDecimal(text){return String(text??"").trim().replace(/(\d),(\d)/g,"$1.$2");}
function replaceUnits(expr,kind){
  const units=kind==="angle"?ANGLE_UNITS:LENGTH_UNITS;
  return expr.replace(/(\d+(?:\.\d+)?)(?:\s*)(mm|cm|inch|in|m|deg|rad|°)/gi,(_m,num,unit)=>{
    const key=String(unit).toLowerCase(),factor=units[key]??units[unit];
    if(factor==null)return _m;
    return "("+num+"*"+factor+")";
  });
}
function safeArithmetic(expr,variables={}){
  let text=String(expr);
  text=text.replace(/\b[A-Za-z_]\w*\b/g,(name)=>{if(!(name in variables))throw new Error("Unknown variable: "+name);const n=Number(variables[name]);if(!Number.isFinite(n))throw new Error("Variable is not finite: "+name);return "("+n+")";});
  if(!/^[0-9eE+*/().\s-]+$/.test(text))throw new Error("Unsupported expression");
  const value=Function('"use strict";return ('+text+')')();
  if(!Number.isFinite(value))throw new Error("Expression result is not finite");
  return value;
}
export function evaluateNumericInput(input,{kind="length",variables={}}={}){let expr=normalizeDecimal(input);if(!expr)throw new Error("Value is required");expr=replaceUnits(expr,kind);return safeArithmetic(expr,variables);}
export function evaluateAssociativeFormulas(formulas={},baseVariables={}){
  const source={...formulas},resolved={...baseVariables},visiting=new Set(),visited=new Set();
  function resolve(name){
    if(name in resolved&&!(name in source))return Number(resolved[name]);
    if(visited.has(name))return Number(resolved[name]);
    if(visiting.has(name))throw new Error("Formula cycle detected: "+[...visiting,name].join(" -> "));
    if(!(name in source))throw new Error("Unknown variable: "+name);
    visiting.add(name);
    const expression=normalizeDecimal(source[name]);
    const deps=[...new Set(expression.match(/\b[A-Za-z_]\w*\b/g)??[])];
    const vars={...resolved};for(const dep of deps)vars[dep]=resolve(dep);
    const value=evaluateNumericInput(expression,{kind:"length",variables:vars});
    visiting.delete(name);visited.add(name);resolved[name]=value;return value;
  }
  for(const name of Object.keys(source))resolve(name);
  return freeze(resolved);
}
function splitCoordinates(text,{decimal_separator="auto"}={}){
  const raw=String(text??"").trim(),preference=normalizeDecimalSeparatorPreference(decimal_separator);
  if(raw.includes(";"))return raw.split(";").map((x)=>x.trim());
  if(preference===",")throw new Error("With decimal comma, separate X/Y/Z coordinates using semicolons");
  return raw.split(/\s*,\s*/).map((x)=>x.trim());
}
export function parseCoordinateInput(input,{origin={x:0,y:0,z:0},variables={},decimal_separator="auto"}={}){
  let text=String(input??"").trim(),relative=false;if(text.startsWith("@")){relative=true;text=text.slice(1).trim();}
  if(text.includes("<")){
    const parts=text.split("<").map((x)=>x.trim());if(parts.length<2||parts.length>3)throw new Error("Polar input must be distance<azimuth or distance<azimuth<elevation");
    const distance=evaluateNumericInput(parts[0],{kind:"length",variables});
    const az=evaluateNumericInput(parts[1],{kind:"angle",variables})*Math.PI/180;
    const el=parts.length===3?evaluateNumericInput(parts[2],{kind:"angle",variables})*Math.PI/180:0;
    const delta={x:distance*Math.cos(el)*Math.cos(az),y:distance*Math.cos(el)*Math.sin(az),z:distance*Math.sin(el)};
    return freeze({mode:relative?"relative-polar":"absolute-polar",point:relative?{x:Number(origin.x||0)+delta.x,y:Number(origin.y||0)+delta.y,z:Number(origin.z||0)+delta.z}:delta,delta});
  }
  const parts=splitCoordinates(text,{decimal_separator});if(parts.length<2||parts.length>3)throw new Error("Coordinate input requires X,Y or X,Y,Z");
  const values=parts.map((part)=>evaluateNumericInput(part,{kind:"length",variables}));
  const raw={x:values[0],y:values[1],z:values[2]??0};
  const point=relative?{x:Number(origin.x||0)+raw.x,y:Number(origin.y||0)+raw.y,z:Number(origin.z||0)+raw.z}:raw;
  return freeze({mode:relative?"relative":"absolute",point,delta:relative?raw:null});
}
export function applyOrthoTracking(delta,{enabled=false,axis=null}={}){const d={x:Number(delta?.x)||0,y:Number(delta?.y)||0,z:Number(delta?.z)||0};if(!enabled)return freeze(d);const axes=["x","y","z"];const chosen=axis&&axes.includes(String(axis).toLowerCase())?String(axis).toLowerCase():axes.sort((a,b)=>Math.abs(d[b])-Math.abs(d[a]))[0];return freeze({x:chosen==="x"?d.x:0,y:chosen==="y"?d.y:0,z:chosen==="z"?d.z:0});}
export function applyPolarTracking(delta,{enabled=false,increment_deg=15}={}){const d={x:Number(delta?.x)||0,y:Number(delta?.y)||0,z:Number(delta?.z)||0};if(!enabled)return freeze(d);const inc=Number(increment_deg);if(!(inc>0))throw new RangeError("Polar increment must be > 0");const r=Math.hypot(d.x,d.y),angle=Math.atan2(d.y,d.x)*180/Math.PI;const snapped=Math.round(angle/inc)*inc*Math.PI/180;return freeze({x:r*Math.cos(snapped),y:r*Math.sin(snapped),z:d.z});}
export function dynamicInputPreview(input,options={}){try{return freeze({status:"Valid",...parseCoordinateInput(input,options)});}catch(error){return freeze({status:"Invalid",error:String(error?.message??error),point:null});}}