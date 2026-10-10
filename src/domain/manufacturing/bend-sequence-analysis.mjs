function freeze(value){
  if(Array.isArray(value))return Object.freeze(value.map(freeze));
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    for(const key of Object.keys(value))value[key]=freeze(value[key]);
    return Object.freeze(value);
  }
  return value;
}
function finite(value,defaultValue=null){
  if(value===null||value===undefined||value==="")return defaultValue;
  const n=Number(value);return Number.isFinite(n)?n:defaultValue;
}
function stepId(step,index){return String(step?.elementId??step?.bend_id??step?.bend??index+1);}

export function normalizeSequenceSteps(steps=[]){
  if(!Array.isArray(steps))throw new TypeError("steps must be an array");
  const ids=new Set();
  return freeze(steps.map((step,index)=>{
    const id=stepId(step,index);
    if(ids.has(id))throw new RangeError(`duplicate bend sequence id: ${id}`);
    ids.add(id);
    return {
      id,
      original_index:index,
      bend:Number.isFinite(Number(step?.bend))?Number(step.bend):index+1,
      feed_mm:finite(step?.Y??step?.L,0),
      rotation_deg:finite(step?.B??step?.R,0),
      nominal_angle_deg:finite(step?.C??step?.A,0),
      command_angle_deg:finite(step?.commandAngle,null),
      radius_mm:finite(step?.radius,null),
      clearance_mm:finite(step?.clearance_mm,null),
      collision:step?.collision===true,
      impossible:step?.impossible===true,
      requires_regrip:step?.requires_regrip===true,
      requires_flip:step?.requires_flip===true
    };
  }));
}

function precedenceMap(edges=[]){
  const before=new Map();
  for(const edge of edges??[]){
    const a=String(edge?.before??""),b=String(edge?.after??"");
    if(!a||!b)throw new TypeError("precedence edge requires before/after");
    if(a===b)throw new RangeError("precedence edge cannot reference the same bend");
    if(!before.has(b))before.set(b,new Set());
    before.get(b).add(a);
  }
  return before;
}
function respectsPrecedence(order,edges=[]){
  const pos=new Map(order.map((id,index)=>[String(id),index]));
  for(const edge of edges??[]){
    const a=pos.get(String(edge.before)),b=pos.get(String(edge.after));
    if(a===undefined||b===undefined||a>=b)return false;
  }
  return true;
}

export function generateSequenceCandidates(steps,{
  allow_reverse=true,
  precedence_edges=[],
  explicit_orders=[]
}={}){
  const normalized=normalizeSequenceSteps(steps);
  const forward=normalized.map((x)=>x.id);
  const candidates=[];
  const push=(name,order,source)=>{
    const normalizedOrder=order.map(String);
    if(normalizedOrder.length!==forward.length)return;
    if(new Set(normalizedOrder).size!==forward.length)return;
    if(normalizedOrder.some((id)=>!forward.includes(id)))return;
    if(!respectsPrecedence(normalizedOrder,precedence_edges))return;
    const sig=normalizedOrder.join("|");
    if(candidates.some((x)=>x.signature===sig))return;
    candidates.push(freeze({id:`sequence-${candidates.length+1}`,name,source,order:normalizedOrder,signature:sig}));
  };
  push("Forward",forward,"default");
  if(allow_reverse)push("Reverse",[...forward].reverse(),"reverse");
  for(const [index,order] of (explicit_orders??[]).entries())push(`Candidate ${index+1}`,order,"explicit");
  return freeze(candidates);
}

function orderedSteps(steps,order){
  const normalized=normalizeSequenceSteps(steps),map=new Map(normalized.map((x)=>[x.id,x]));
  return order.map((id)=>{
    const step=map.get(String(id));if(!step)throw new RangeError(`unknown bend in sequence: ${id}`);
    return step;
  });
}

export function analyzeSequence(steps,candidate,{
  machine_limits={},
  collision_check=null
}={}){
  const ordered=orderedSteps(steps,candidate.order);
  const violations=[],warnings=[];
  let regrips=0,flips=0,totalRotation=0,totalFeed=0,minClearance=null,collisions=0;
  for(let index=0;index<ordered.length;index++){
    const step=ordered[index];
    totalRotation+=Math.abs(step.rotation_deg??0);
    totalFeed+=Math.max(0,step.feed_mm??0);
    if(step.requires_regrip)regrips++;
    if(step.requires_flip)flips++;
    if(step.impossible)violations.push(`Bend ${step.bend}: marked impossible`);
    if(step.collision){collisions++;violations.push(`Bend ${step.bend}: collision`);}
    if(Number.isFinite(step.clearance_mm))minClearance=minClearance===null?step.clearance_mm:Math.min(minClearance,step.clearance_mm);
    const maxAngle=finite(machine_limits.max_bend_angle_deg??machine_limits.maxBendAngle,null);
    if(maxAngle!==null&&Math.abs(step.command_angle_deg??step.nominal_angle_deg)>maxAngle+1e-9){
      violations.push(`Bend ${step.bend}: angle exceeds machine limit`);
    }
    const rotationLimit=finite(machine_limits.rotation_limit_deg??machine_limits.rotationLimit,null);
    if(rotationLimit!==null&&Math.abs(step.rotation_deg)>rotationLimit+1e-9){
      violations.push(`Bend ${step.bend}: rotation exceeds machine limit`);
    }
    const minFeed=finite(machine_limits.min_feed_mm??machine_limits.minFeed,null);
    if(minFeed!==null&&step.feed_mm<minFeed-1e-9)warnings.push(`Bend ${step.bend}: feed below configured minimum`);
    if(typeof collision_check==="function"){
      const result=collision_check({step,index,ordered,candidate});
      if(result?.collision===true){collisions++;violations.push(result.message||`Bend ${step.bend}: collision callback failed`);}
      if(Number.isFinite(Number(result?.clearance_mm))){
        const c=Number(result.clearance_mm);minClearance=minClearance===null?c:Math.min(minClearance,c);
      }
      if(result?.warning)warnings.push(String(result.warning));
    }
  }
  return freeze({
    candidate_id:candidate.id,
    name:candidate.name,
    source:candidate.source,
    order:candidate.order,
    valid:violations.length===0,
    status:violations.length?"Invalid":warnings.length?"Conditional":"Valid",
    metrics:freeze({
      regrips,flips,total_rotation_deg:totalRotation,total_feed_mm:totalFeed,
      min_clearance_mm:minClearance,collisions
    }),
    violations:freeze([...new Set(violations)]),
    warnings:freeze([...new Set(warnings)])
  });
}

export function scoreSequence(analysis,priorities={}){
  if(!analysis.valid)return Number.POSITIVE_INFINITY;
  const w={
    regrips:finite(priorities.regrips,10),
    flips:finite(priorities.flips,8),
    rotation:finite(priorities.rotation,0.01),
    feed:finite(priorities.feed,0.0001),
    clearance:finite(priorities.clearance,5),
    warnings:finite(priorities.warnings,2)
  };
  const m=analysis.metrics;
  const clearancePenalty=Number.isFinite(m.min_clearance_mm)?1/Math.max(0.001,m.min_clearance_mm):0;
  return m.regrips*w.regrips+m.flips*w.flips+m.total_rotation_deg*w.rotation+
    m.total_feed_mm*w.feed+clearancePenalty*w.clearance+analysis.warnings.length*w.warnings;
}

export function analyzeSequenceCandidates(steps,options={}){
  const candidates=generateSequenceCandidates(steps,options);
  const analyses=candidates.map((candidate)=>analyzeSequence(steps,candidate,options));
  const scored=analyses.map((analysis)=>freeze({...analysis,score:scoreSequence(analysis,options.priorities)}));
  return freeze([...scored].sort((a,b)=>{
    const av=Number.isFinite(a.score)?a.score:Number.POSITIVE_INFINITY;
    const bv=Number.isFinite(b.score)?b.score:Number.POSITIVE_INFINITY;
    return av-bv||a.name.localeCompare(b.name);
  }).map((x,index)=>freeze({...x,suggestion_rank:index+1})));
}

export function applyChosenSequence(steps,analysis){
  if(!analysis?.valid)throw new Error("cannot apply invalid bend sequence");
  const ordered=orderedSteps(steps,analysis.order);
  return freeze({
    steps:ordered,
    chosen_sequence:freeze({
      order:analysis.order,
      candidate_id:analysis.candidate_id,
      chosen_explicitly:true
    })
  });
}
