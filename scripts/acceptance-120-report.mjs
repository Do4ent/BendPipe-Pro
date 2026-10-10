import fs from "node:fs";
import path from "node:path";
import {REQUIREMENT_IDS,BROWSER_COVERAGE,verifyRequirementRegister} from "../acceptance/requirements-120.mjs";
verifyRequirementRegister();
const reportFile = process.env.PLAYWRIGHT_JSON_OUTPUT_FILE || "reports/browser/playwright.json";
const outDir = "reports/acceptance";
fs.mkdirSync(outDir,{recursive:true});
let report=null;
let diagnostics=[];
if(fs.existsSync(reportFile)){
  try{report=JSON.parse(fs.readFileSync(reportFile,"utf8"));}
  catch(e){diagnostics.push("Invalid Playwright JSON report: "+e.message);}
}else{
  diagnostics.push("Browser test result not found: "+reportFile);
}
const cases=new Map();
function visit(suite){
  for(const spec of suite.specs||[]){
    const m=/^\[([A-Z0-9]+-\d{3})\]/.exec(spec.title);
    if(!m)continue;
    const id=m[1];
    if(!REQUIREMENT_IDS.includes(id)){diagnostics.push("Unknown test ID: "+id);continue;}
    const tests=spec.tests||[];
    const runs=tests.flatMap(t=>t.results||[]);
    const passed=tests.length>0 && tests.every(t=>(t.results||[]).some(r=>r.status==="passed"));
    const failed=runs.some(r=>["failed","timedOut","interrupted"].includes(r.status));
    const value={id,title:spec.title,passed,failed,attempts:runs.length,
      errors:runs.flatMap(r=>(r.errors||[]).map(e=>String(e.message||e.value||e).slice(0,800)))};
    cases.set(id,[...(cases.get(id)||[]),value]);
  }
  for(const child of suite.suites||[])visit(child);
}
for(const suite of report?.suites||[])visit(suite);
const rows=REQUIREMENT_IDS.map(id=>{
  const observed=cases.get(id)||[];
  const planned=BROWSER_COVERAGE[id]||null;
  let status=planned?"NOT_EXECUTED":"NOT_AUTOMATED";
  if(observed.length){
    if(observed.some(c=>c.failed))status="FAILED";
    else if(observed.every(c=>c.passed))status=planned==="complete"?"BROWSER_PASSED":"PARTIAL_EVIDENCE";
    else status="NOT_EXECUTED";
  }
  return {id,status,coverage:planned||"none",test_count:observed.length,
    evidence:observed.map(c=>c.title),errors:observed.flatMap(c=>c.errors)};
});
const counts=Object.fromEntries([...new Set(rows.map(r=>r.status))].map(k=>[k,rows.filter(r=>r.status===k).length]));
const out={schema:"tubebender.acceptance-120.v1",generated_at:new Date().toISOString(),
  source:"TubeBender TZ 2.1 / 120 functional IDs",browser_report_present:!!report,
  counts,diagnostics,requirements:rows};
fs.writeFileSync(path.join(outDir,"requirements.json"),JSON.stringify(out,null,2)+"\n");
const quote=x=>'"'+String(x??"").replaceAll('"','""').replaceAll(/\r?\n/g," ")+'"';
const csv=["id,status,coverage,test_count,evidence,errors",...rows.map(r=>
  [r.id,r.status,r.coverage,r.test_count,r.evidence.join(" | "),r.errors.join(" | ")].map(quote).join(",")
)].join("\n")+"\n";
fs.writeFileSync(path.join(outDir,"requirements.csv"),csv);
console.log("Acceptance IDs: "+rows.length);
console.log("Statuses:",JSON.stringify(counts));
for(const d of diagnostics)console.warn(d);
if(diagnostics.some(d=>d.startsWith("Unknown test ID"))||rows.length!==120)process.exitCode=2;
