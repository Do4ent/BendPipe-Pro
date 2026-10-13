const DEFAULT_LIMIT=12;
const FORBIDDEN_KEY=/(^|_)(selection|selected|object|objects|objectid|object_id|tubeid|tube_id|instanceid|instance_id|groupid|group_id|assemblyid|assembly_id|base|target|point|pivot|origin|center|sceneid|scene_id|nodeid|node_id)(_|$)/i;
const FORBIDDEN_EXACT=new Set(["x","y","z","cx","cy","cz","px","py","pz","base_xyz","target_xyz","position","position_mm","origin_mm"]);

function clone(value){return value==null?value:structuredClone(value);}
function finitePrimitive(value){
  return value==null||typeof value==="string"||typeof value==="boolean"||
    (typeof value==="number"&&Number.isFinite(value));
}
export function sanitizeRepeatSettings(input={}, {depth=0}={}){
  if(depth>6)return undefined;
  if(finitePrimitive(input))return input;
  if(Array.isArray(input)){
    const out=input.map(value=>sanitizeRepeatSettings(value,{depth:depth+1})).filter(value=>value!==undefined);
    return Object.freeze(out);
  }
  if(!input||typeof input!=="object")return undefined;
  const out={};
  for(const [rawKey,value] of Object.entries(input)){
    const key=String(rawKey);
    const normalized=key.toLowerCase();
    if(FORBIDDEN_KEY.test(normalized)||FORBIDDEN_EXACT.has(normalized))continue;
    const safe=sanitizeRepeatSettings(value,{depth:depth+1});
    if(safe!==undefined)out[key]=safe;
  }
  return Object.freeze(out);
}
export function normalizeRepeatCommand(input={}){
  const id=String(input.id??"").trim();
  const label=String(input.label??id).trim();
  if(!id)throw new Error("repeat command id is required");
  if(!label)throw new Error("repeat command label is required");
  return Object.freeze({
    id,
    label,
    settings:sanitizeRepeatSettings(input.settings??{}),
    source:String(input.source??"ui"),
    timestamp:Number.isFinite(Number(input.timestamp))?Number(input.timestamp):Date.now()
  });
}
export function sameRepeatCommand(a,b){
  if(!a||!b)return false;
  return String(a.id)===String(b.id)&&JSON.stringify(a.settings??{})===JSON.stringify(b.settings??{});
}
export function pushRecentCommand(recent=[],command,{limit=DEFAULT_LIMIT}={}){
  const normalized=normalizeRepeatCommand(command);
  const max=Math.max(1,Math.trunc(Number(limit)||DEFAULT_LIMIT));
  const out=(Array.isArray(recent)?recent:[]).map(normalizeRepeatCommand);
  if(out.length&&sameRepeatCommand(out[0],normalized))out.shift();
  out.unshift(normalized);
  return Object.freeze(out.slice(0,max));
}
export function createRepeatState({recent=[],limit=DEFAULT_LIMIT}={}){
  const max=Math.max(1,Math.trunc(Number(limit)||DEFAULT_LIMIT));
  let list=pushRecentCommand([], {id:"__seed__",label:"seed",settings:{}},{limit:max}).slice(0,0);
  for(const command of [...(recent??[])].reverse()){
    try{list=pushRecentCommand(list,command,{limit:max});}catch{}
  }
  return Object.freeze({
    limit:max,
    recent:Object.freeze([...list]),
    last:list[0]??null
  });
}
export function serializeRepeatState(state){
  const recent=(state?.recent??[]).slice(0,Math.max(1,Number(state?.limit)||DEFAULT_LIMIT)).map(normalizeRepeatCommand);
  return JSON.stringify({version:1,limit:Number(state?.limit)||DEFAULT_LIMIT,recent});
}
export function parseRepeatState(text,{limit=DEFAULT_LIMIT}={}){
  if(!text)return createRepeatState({limit});
  try{
    const parsed=JSON.parse(String(text));
    return createRepeatState({recent:parsed?.recent??[],limit:parsed?.limit??limit});
  }catch{
    return createRepeatState({limit});
  }
}
export function repeatDisplayLabel(command){
  const label=String(command?.label??"").trim();
  return label?("Повторить: "+label):"Повторить команду";
}
