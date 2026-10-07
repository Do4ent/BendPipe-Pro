function freeze(value){
  if(Array.isArray(value))return Object.freeze(value.map(freeze));
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    for(const key of Object.keys(value))value[key]=freeze(value[key]);
    return Object.freeze(value);
  }
  return value;
}
function clone(value){return value===undefined?undefined:structuredClone(value);}
function text(value){return String(value??"").trim();}
function normalizeItems(items){
  if(!Array.isArray(items))throw new TypeError("review progress items must be an array");
  const seen=new Set();
  return items.map((item,index)=>{
    if(!item||typeof item!=="object")throw new TypeError(`review progress item ${index} must be an object`);
    const id=text(item.id);
    if(!id)throw new TypeError(`review progress item ${index} id must be non-empty`);
    if(seen.has(id))throw new RangeError(`duplicate review progress item id: ${id}`);
    seen.add(id);
    const reasons=[...new Set((Array.isArray(item.reasons)?item.reasons:[]).map(text).filter(Boolean))]
      .sort((a,b)=>a.localeCompare(b));
    return freeze({id,reasons});
  }).sort((a,b)=>a.id.localeCompare(b.id));
}
export const REVIEW_PROGRESS_SCHEMA="TubeBender.DimensionReviewProgress.v1";
export const REVIEW_PROGRESS_SNAPSHOT_SCHEMA="TubeBender.DimensionReviewProgressSnapshot.v1";
export const REVIEW_PROGRESS_DIAGNOSTICS_SCHEMA="TubeBender.DimensionReviewProgressDiagnostics.v1";
export const REVIEW_PROGRESS_ERROR_CODES=freeze([
  "REVIEW_REASON_COUNT_MISMATCH",
  "REVIEW_REASON_LIST_MISMATCH",
  "REVIEW_PROGRESS_MODEL_DIVERGENCE"
]);

export function buildReviewProgress({items=[],selected_ids=[]}={}){
  const normalized=normalizeItems(items);
  if(!Array.isArray(selected_ids))throw new TypeError("selected_ids must be an array");
  const selectedSet=new Set(selected_ids.map(text).filter(Boolean));
  const reasonCounts={};
  for(const item of normalized){
    for(const reason of item.reasons)reasonCounts[reason]=(reasonCounts[reason]??0)+1;
  }
  const reasonSelection={};
  for(const [reason,count] of Object.entries(reasonCounts).sort(([a],[b])=>a.localeCompare(b))){
    const ids=normalized.filter(item=>item.reasons.includes(reason)).map(item=>item.id);
    const selected=ids.filter(id=>selectedSet.has(id));
    const unselected=ids.filter(id=>!selectedSet.has(id));
    reasonSelection[reason]=freeze({
      dimension_count:count,
      selected_dimension_ids:selected,
      unselected_dimension_ids:unselected,
      selected_dimension_count:selected.length,
      unselected_dimension_count:unselected.length,
      selected_percent:count?Math.round(selected.length/count*100):0,
      selection_coverage:selected.length===0?"none":selected.length===count?"complete":"partial"
    });
  }
  const coverage={none:0,partial:0,complete:0};
  for(const entry of Object.values(reasonSelection))coverage[entry.selection_coverage]++;
  const completed=Object.entries(reasonSelection)
    .filter(([,entry])=>entry.selection_coverage==="complete").map(([reason])=>reason);
  const pending=Object.entries(reasonSelection)
    .filter(([,entry])=>entry.selection_coverage!=="complete").map(([reason])=>reason);
  const count=Object.keys(reasonCounts).length;
  const pendingCount=coverage.partial+coverage.none;
  const errors=[];
  if(coverage.complete+pendingCount!==count)errors.push("REVIEW_REASON_COUNT_MISMATCH");
  if(completed.length!==coverage.complete||pending.length!==pendingCount)errors.push("REVIEW_REASON_LIST_MISMATCH");
  return freeze({
    reason_counts:reasonCounts,
    reason_selection:reasonSelection,
    coverage,
    completed_reasons:completed,
    pending_reasons:pending,
    reason_count:count,
    pending_count:pendingCount,
    complete_percent:count?Math.round(coverage.complete/count*100):0,
    completion_state:count===0?"empty":pendingCount===0?"complete":"pending",
    errors,
    issue_count:errors.length,
    valid:errors.length===0,
    status:count===0?"empty":errors.length===0?"ok":"error"
  });
}

export function reviewProgressSignature(progress={}){
  return JSON.stringify({
    reason_count:Number(progress.reason_count??0),
    reason_counts:progress.reason_counts??{},
    reason_selection:progress.reason_selection??{},
    completed_reasons:progress.completed_reasons??[],
    pending_reasons:progress.pending_reasons??[],
    complete_percent:Number(progress.complete_percent??0),
    completion_state:String(progress.completion_state??"empty"),
    errors:progress.errors??[],
    issue_count:Number(progress.issue_count??0),
    valid:progress.valid===true,
    status:String(progress.status??"empty")
  });
}

export function reviewProgressSnapshot(progress={}){
  return freeze({
    schema:REVIEW_PROGRESS_SNAPSHOT_SCHEMA,
    reason_count:Number(progress.reason_count??0),
    reason_counts:clone(progress.reason_counts??{}),
    reason_selection:clone(progress.reason_selection??{}),
    coverage:clone(progress.coverage??{none:0,partial:0,complete:0}),
    completed_reasons:clone(progress.completed_reasons??[]),
    pending_reasons:clone(progress.pending_reasons??[]),
    pending_count:Number(progress.pending_count??0),
    complete_percent:Number(progress.complete_percent??0),
    completion_state:String(progress.completion_state??"empty"),
    errors:clone(progress.errors??[]),
    issue_count:Number(progress.issue_count??0),
    valid:progress.valid===true,
    status:String(progress.status??"empty"),
    signature:reviewProgressSignature(progress)
  });
}
