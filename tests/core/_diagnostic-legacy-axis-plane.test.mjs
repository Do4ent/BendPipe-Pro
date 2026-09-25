import test from "node:test";
import fs from "node:fs";

const html=fs.readFileSync(
  new URL("../../legacy/VC207R7/TubeBender_CAD_VC207R7_Pixel_Matched_Approved_Interface_Release.html",import.meta.url),
  "utf8"
);

function slice(name,next){
  const start=html.indexOf("function "+name+"(");
  const end=html.indexOf("\nfunction "+next+"(",start+1);
  if(start<0||end<0) throw new Error("missing "+name);
  return html.slice(start,end);
}

test("diagnostic: legacy axis/plane semantics",()=>{
  console.log("===PO_AXIS_VECTOR===");
  console.log(slice("poAxisVector","poPlaneNormal"));
  console.log("===PO_PLANE_NORMAL===");
  console.log(slice("poPlaneNormal","poRotate"));
});
