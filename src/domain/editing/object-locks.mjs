export const LOCK_MODES=Object.freeze(["Unlocked","Position","Object"]);

export function normalizeLockMode(value="Unlocked"){
  const mode=String(value??"Unlocked").trim();
  if(!LOCK_MODES.includes(mode))throw new RangeError("lock mode must be Unlocked, Position or Object");
  return mode;
}

export function lockStateOf(target){
  const raw=target?.lock_state;
  const mode=normalizeLockMode(
    typeof raw==="string" ? raw :
    raw?.mode ?? target?.lock_mode ?? "Unlocked"
  );
  return Object.freeze({mode,locked:mode!=="Unlocked"});
}

const ALWAYS_ALLOWED=new Set(["view","measure","snap","show","hide","transparent","isolate","compare","copy-read"]);
const POSITION_BLOCKED=new Set(["move","rotate","scale","position","orientation","transform","transform-stack"]);
const OBJECT_BLOCKED=new Set([
  "move","rotate","scale","position","orientation","transform",
  "delete","properties","geometry","technology","tooling",
  "split","mirror","array","transform-stack","dependency","break-link",
  "anchor","formula","edit","copy","detach"
]);

export function lockPermission(target,action){
  const state=lockStateOf(target);
  const key=String(action??"edit").trim().toLowerCase();
  if(ALWAYS_ALLOWED.has(key)){
    return Object.freeze({allowed:true,mode:state.mode,code:"LOCK_ALLOWED",reason:null});
  }
  const blocked=
    state.mode==="Object" ? OBJECT_BLOCKED.has(key)||key!=="view" :
    state.mode==="Position" ? POSITION_BLOCKED.has(key) :
    false;
  return Object.freeze({
    allowed:!blocked,
    mode:state.mode,
    code:blocked?"OBJECT_LOCKED":"LOCK_ALLOWED",
    reason:blocked?"Объект заблокирован":null
  });
}

export function assertLockPermission(target,action){
  const permission=lockPermission(target,action);
  if(!permission.allowed){
    const error=new Error(permission.reason);
    error.code=permission.code;
    error.lock_mode=permission.mode;
    throw error;
  }
  return permission;
}

export function setLockMode(target,mode){
  if(!target||typeof target!=="object")throw new TypeError("lock target is required");
  const normalized=normalizeLockMode(mode);
  if(normalized==="Unlocked"){
    delete target.lock_state;
    delete target.lock_mode;
  }else{
    target.lock_state={mode:normalized};
    delete target.lock_mode;
  }
  return lockStateOf(target);
}

export function mostRestrictiveLockMode(targets=[]){
  let rank=0;
  for(const target of targets??[]){
    const mode=lockStateOf(target).mode;
    rank=Math.max(rank,mode==="Object"?2:mode==="Position"?1:0);
  }
  return rank===2?"Object":rank===1?"Position":"Unlocked";
}
