import test from "node:test";
import fs from "node:fs";

const html=fs.readFileSync(
  new URL("../../legacy/VC207R7/TubeBender_CAD_VC207R7_Pixel_Matched_Approved_Interface_Release.html",import.meta.url),
  "utf8"
);

function slice(name,next){
  const markers=["function "+name+"(","async function "+name+"("];
  const starts=markers.map((m)=>html.indexOf(m)).filter((i)=>i>=0);
  if(!starts.length) throw new Error("missing "+name);
  const start=Math.min(...starts);
  const ends=[
    html.indexOf("\nfunction "+next+"(",start+1),
    html.indexOf("\nasync function "+next+"(",start+1)
  ].filter((i)=>i>=0);
  if(!ends.length) throw new Error("missing boundary after "+name);
  return html.slice(start,Math.min(...ends));
}

test("diagnostic: project package semantics",()=>{
  console.log("===PO_WORKSPACE_PAYLOAD===");
  console.log(slice("poWorkspacePayload","poStoreRecovery"));
  console.log("===PO_NORMALIZE_PACKAGE===");
  console.log(slice("poNormalizePackage","poSelectedProjects"));
});
