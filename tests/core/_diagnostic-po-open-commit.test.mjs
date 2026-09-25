import test from "node:test";
import fs from "node:fs";
const html=fs.readFileSync(
  new URL("../../legacy/VC207R7/TubeBender_CAD_VC207R7_Pixel_Matched_Approved_Interface_Release.html",import.meta.url),
  "utf8"
);
test("diagnostic: poOpen commit path",()=>{
  const markers=[
    "poOpenBtn').addEventListener",
    'poOpenBtn").addEventListener',
    "poOpenBtn",
    "_poBoundsUnresolved",
    "poAllowRepair",
    "poGetMode()"
  ];
  for(const marker of markers){
    let pos=0,count=0;
    while((pos=html.indexOf(marker,pos))>=0&&count<10){
      console.log("===MARKER "+marker+"===");
      console.log(html.slice(Math.max(0,pos-2200),Math.min(html.length,pos+6000)));
      pos+=marker.length;count++;
    }
  }
});
