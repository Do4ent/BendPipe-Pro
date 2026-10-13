// Source: TubeBender TZ 2.1 consolidated audit (2026-10-10).
// These are the 120 functional IDs; ACC and AT are separate acceptance criteria.
export const GROUP_COUNTS = Object.freeze({
  SCOPE:4, DATA:6, BODY:9, UI:10, TREE:6, VIEW:6,
  BOX:5, GEO:6, LINE:6, DOF:10, OFF:3, CHK:10,
  TECH:6, SIM:5, IMP:5, FILE:5, I18N:6, MOB:6, PERF:6
});
export const REQUIREMENT_IDS = Object.freeze(Object.entries(GROUP_COUNTS).flatMap(
  ([group,n]) => Array.from({length:n},(_,i)=>group+"-"+String(i+1).padStart(3,"0"))
));
// 'complete' may be used only where one browser scenario genuinely covers
// the exact stated requirement. Other cases give evidence, not approval.
export const BROWSER_COVERAGE = Object.freeze({
  "UI-006": "partial",
  "UI-009": "complete",
  "VIEW-006": "partial",
  "I18N-001": "partial",
  "I18N-002": "complete",
  "MOB-001": "complete",
  "PERF-005": "partial"
});
export function verifyRequirementRegister(){
  if(REQUIREMENT_IDS.length!==120)throw Error("Expected 120 functional requirement IDs");
  if(new Set(REQUIREMENT_IDS).size!==120)throw Error("Duplicate functional requirement ID");
  for(const [id,depth] of Object.entries(BROWSER_COVERAGE)){
    if(!REQUIREMENT_IDS.includes(id))throw Error("Unknown browser requirement: "+id);
    if(!["complete","partial"].includes(depth))throw Error("Invalid coverage depth: "+id);
  }
  return true;
}
verifyRequirementRegister();
