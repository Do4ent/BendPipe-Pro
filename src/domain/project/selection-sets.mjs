const clone=v=>v==null?v:structuredClone(v);
export const SELECTION_SET_MEMBER_KINDS=Object.freeze([
  "tube","row","mesh-instance","ref","group","project-assembly","dimension","construction"
]);
export const SELECTION_SET_TYPES=Object.freeze(["StaticSelectionSet","DynamicSelectionSet"]);
export const DYNAMIC_RULE_OPERATORS=Object.freeze(["eq","ne","in","not_in","contains","starts_with","exists","truthy"]);
function makeId(){
  const uuid=globalThis.crypto?.randomUUID?.();
  return uuid?"selection-set-"+uuid:"selection-set-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
}
export function normalizeSelectionRef(input={}){
  const kind=String(input.kind??"").trim();
  if(!SELECTION_SET_MEMBER_KINDS.includes(kind))throw new RangeError("unsupported Selection Set member kind");
  if(kind==="ref"){
    const scene_id=String(input.scene_id??input.sceneId??"").trim(),node_id=String(input.node_id??input.nodeId??"").trim();
    if(!scene_id||!node_id)throw new Error("reference member requires scene_id and node_id");
    return Object.freeze({kind,scene_id,node_id});
  }
  if(kind==="row"){
    const tube_id=String(input.tube_id??input.tubeId??"").trim(),row_index=Number(input.row_index??input.rowIndex);
    if(!tube_id||!Number.isInteger(row_index)||row_index<0)throw new Error("row member requires tube_id and row_index");
    return Object.freeze({kind,tube_id,row_index});
  }
  const id=String(input.id??input.tubeId??input.instanceId??input.groupId??input.assemblyId??input.dimensionId??input.constructionId??"").trim();
  if(!id)throw new Error(kind+" member requires id");
  return Object.freeze({kind,id});
}
export function selectionRefKey(input){
  const ref=normalizeSelectionRef(input);
  if(ref.kind==="ref")return "ref:"+ref.scene_id+"|"+ref.node_id;
  if(ref.kind==="row")return "row:"+ref.tube_id+"|"+ref.row_index;
  return ref.kind+":"+ref.id;
}
function normalizeRuleValue(value){
  if(Array.isArray(value))return Object.freeze(value.map(item=>item==null?item:String(item)));
  if(value==null||typeof value==="boolean"||typeof value==="number")return value;
  return String(value);
}
export function normalizeDynamicRule(input={}){
  const field=String(input.field??"").trim();
  if(!field)throw new Error("Dynamic Selection Set rule field is required");
  const operator=String(input.operator??"eq").trim().toLowerCase();
  if(!DYNAMIC_RULE_OPERATORS.includes(operator))throw new RangeError("unsupported Dynamic Selection Set rule operator");
  return Object.freeze({field,operator,value:normalizeRuleValue(input.value)});
}
export function normalizeDynamicRules(input={}){
  const match=String(input.match??"all").toLowerCase();
  if(!["all","any"].includes(match))throw new RangeError("Dynamic Selection Set rules.match must be all or any");
  const rules=(input.rules??input.conditions??[]).map(normalizeDynamicRule);
  return Object.freeze({match,rules:Object.freeze(rules)});
}
function readField(candidate,path){
  const parts=String(path??"").split(".").filter(Boolean);
  let value=candidate;
  for(const key of parts){
    if(value==null)return undefined;
    value=value[key];
  }
  return value;
}
function comparable(value){return typeof value==="string"?value.toLowerCase():value;}
function valuesEqual(a,b){return comparable(a)===comparable(b);}
export function dynamicRuleMatches(candidate,ruleInput){
  const rule=normalizeDynamicRule(ruleInput),actual=readField(candidate,rule.field),expected=rule.value;
  if(rule.operator==="exists")return expected===false?actual==null:actual!=null;
  if(rule.operator==="truthy")return expected===false?!actual:!!actual;
  if(rule.operator==="eq")return valuesEqual(actual,expected);
  if(rule.operator==="ne")return !valuesEqual(actual,expected);
  if(rule.operator==="contains"){
    if(Array.isArray(actual))return actual.some(value=>valuesEqual(value,expected));
    return String(actual??"").toLowerCase().includes(String(expected??"").toLowerCase());
  }
  if(rule.operator==="starts_with")return String(actual??"").toLowerCase().startsWith(String(expected??"").toLowerCase());
  const expectedList=Array.isArray(expected)?expected:[expected];
  const matches=Array.isArray(actual)
    ?actual.some(value=>expectedList.some(item=>valuesEqual(value,item)))
    :expectedList.some(item=>valuesEqual(actual,item));
  return rule.operator==="in"?matches:!matches;
}
export function dynamicRulesMatch(candidate,rulesInput={}){
  const normalized=normalizeDynamicRules(rulesInput);
  if(!normalized.rules.length)return true;
  return normalized.match==="all"
    ?normalized.rules.every(rule=>dynamicRuleMatches(candidate,rule))
    :normalized.rules.some(rule=>dynamicRuleMatches(candidate,rule));
}
export function evaluateDynamicSelectionSet(set,candidates=[]){
  if(String(set?.kind)!=="DynamicSelectionSet")throw new Error("Dynamic Selection Set is required");
  const map=new Map();
  for(const candidate of candidates??[]){
    if(!candidate?.ref)continue;
    if(!dynamicRulesMatch(candidate,set.rules??{}))continue;
    const ref=normalizeSelectionRef(candidate.ref);
    map.set(selectionRefKey(ref),{...ref});
  }
  return Object.freeze([...map.values()].map(Object.freeze));
}
export function ensureSelectionSetState(project){
  if(!project||typeof project!=="object")throw new TypeError("project is required");
  if(!Array.isArray(project.selection_sets))project.selection_sets=[];
  for(const set of project.selection_sets){
    if(!set||typeof set!=="object")continue;
    set.id=String(set.id??makeId());
    set.kind=SELECTION_SET_TYPES.includes(String(set.kind))?String(set.kind):"StaticSelectionSet";
    set.name=String(set.name??"Selection Set").trim()||"Selection Set";
    if(set.kind==="DynamicSelectionSet"){
      set.rules={...normalizeDynamicRules(set.rules??{})};
      delete set.members;
    }else{
      const map=new Map();
      for(const raw of set.members??[]){
        try{const ref=normalizeSelectionRef(raw);map.set(selectionRefKey(ref),{...ref});}catch{}
      }
      set.members=[...map.values()];
      delete set.rules;
    }
  }
  return project.selection_sets;
}
export function selectionSetById(project,id){
  return ensureSelectionSetState(project).find(set=>String(set.id)===String(id))??null;
}
function assertUniqueName(project,set){
  if(project.selection_sets.some(item=>String(item.id)!==String(set.id)&&String(item.name).toLowerCase()===String(set.name).toLowerCase()))throw new Error("Selection Set name already exists");
}
export function createSelectionSet(project,{id=null,name="Selection Set",members=[]}={}){
  ensureSelectionSetState(project);
  const set={id:String(id??makeId()),kind:"StaticSelectionSet",name:String(name??"").trim()||"Selection Set",members:[]};
  if(selectionSetById(project,set.id))throw new Error("Selection Set id already exists");
  assertUniqueName(project,set);
  project.selection_sets.push(set);
  addSelectionSetMembers(project,set.id,members);
  return set;
}
export function createDynamicSelectionSet(project,{id=null,name="Dynamic Selection Set",rules={}}={}){
  ensureSelectionSetState(project);
  const set={id:String(id??makeId()),kind:"DynamicSelectionSet",name:String(name??"").trim()||"Dynamic Selection Set",rules:{...normalizeDynamicRules(rules)}};
  if(selectionSetById(project,set.id))throw new Error("Selection Set id already exists");
  assertUniqueName(project,set);project.selection_sets.push(set);return set;
}
export function updateDynamicSelectionSetRules(project,setId,rules={}){
  const set=selectionSetById(project,setId);if(!set)throw new Error("Selection Set not found");
  if(set.kind!=="DynamicSelectionSet")throw new Error("Selection Set is not dynamic");
  set.rules={...normalizeDynamicRules(rules)};return set;
}
export function renameSelectionSet(project,setId,name){
  const set=selectionSetById(project,setId);if(!set)throw new Error("Selection Set not found");
  const next=String(name??"").trim();if(!next)throw new Error("Selection Set name is required");
  set.name=next;assertUniqueName(project,set);return set;
}
export function addSelectionSetMembers(project,setId,members=[]){
  const set=selectionSetById(project,setId);if(!set)throw new Error("Selection Set not found");
  if(set.kind!=="StaticSelectionSet")throw new Error("Dynamic Selection Set members are rule-derived");
  const map=new Map((set.members??[]).map(ref=>[selectionRefKey(ref),ref]));
  for(const raw of members){const ref=normalizeSelectionRef(raw);map.set(selectionRefKey(ref),{...ref});}
  set.members=[...map.values()];return set;
}
export function removeSelectionSetMembers(project,setId,members=[]){
  const set=selectionSetById(project,setId);if(!set)throw new Error("Selection Set not found");
  if(set.kind!=="StaticSelectionSet")throw new Error("Dynamic Selection Set members are rule-derived");
  const remove=new Set((members??[]).map(selectionRefKey));
  set.members=(set.members??[]).filter(ref=>!remove.has(selectionRefKey(ref)));return set;
}
export function deleteSelectionSet(project,setId){
  ensureSelectionSetState(project);const before=project.selection_sets.length;
  project.selection_sets=project.selection_sets.filter(set=>String(set.id)!==String(setId));
  return project.selection_sets.length!==before;
}
export function pruneSelectionSetMembers(project,exists){
  ensureSelectionSetState(project);if(typeof exists!=="function")throw new TypeError("exists predicate is required");
  const removed=[];
  for(const set of project.selection_sets){
    if(set.kind!=="StaticSelectionSet")continue;
    const keep=[];
    for(const ref of set.members??[]){
      if(exists(ref))keep.push(ref);
      else removed.push(Object.freeze({set_id:String(set.id),set_name:String(set.name),ref:Object.freeze({...ref})}));
    }
    set.members=keep;
  }
  return Object.freeze(removed);
}
export function setsContainingRef(project,member,{dynamicCandidates=[]}={}){
  const key=selectionRefKey(member),result=[];
  for(const set of ensureSelectionSetState(project)){
    const members=set.kind==="DynamicSelectionSet"?evaluateDynamicSelectionSet(set,dynamicCandidates):(set.members??[]);
    if(members.some(ref=>selectionRefKey(ref)===key))result.push(set);
  }
  return Object.freeze(result);
}
