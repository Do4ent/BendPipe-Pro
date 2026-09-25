import test from "node:test";
import fs from "node:fs";
const html=fs.readFileSync(
  new URL("../../legacy/VC207R7/TubeBender_CAD_VC207R7_Pixel_Matched_Approved_Interface_Release.html",import.meta.url),
  "utf8"
);
function slice(name,next){
  const start=html.indexOf("function "+name+"(");
  if(start<0) throw new Error("missing "+name);
  const end=html.indexOf("\nfunction "+next+"(",start+1);
  return html.slice(start,end>start?end:start+7000);
}
test("diagnostic: project-open import action",()=>{
  for(const pair of [
    ["poSelectedProjects","poSelectedTubes"],
    ["poSelectedTubes","poSelectionCounts"],
    ["poImportSelected","poClose"],
    ["poApplySelection","poClose"],
    ["poCommit","poClose"]
  ]){
    try{
      console.log("===FN "+pair[0]+"===");
      console.log(slice(pair[0],pair[1]));
    }catch{}
  }
  const markers=["data-po-import","poImportBtn","Импортировать","Открыть выбранное","pkg.status==='error'","pkg.status==='ready'"];
  for(const marker of markers){
    const i=html.indexOf(marker);
    if(i>=0){
      console.log("===MARKER "+marker+"===");
      console.log(html.slice(Math.max(0,i-1800),Math.min(html.length,i+4200)));
    }
  }
});
