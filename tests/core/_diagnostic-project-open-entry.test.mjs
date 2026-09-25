import test from "node:test";
import fs from "node:fs";

const html=fs.readFileSync(
  new URL("../../legacy/VC207R7/TubeBender_CAD_VC207R7_Pixel_Matched_Approved_Interface_Release.html",import.meta.url),
  "utf8"
);

test("diagnostic: project-open file entry points",()=>{
  let pos=0,index=0;
  while((pos=html.indexOf("poNormalizePackage(",pos))>=0){
    index+=1;
    const fn=html.lastIndexOf("function ",pos);
    const start=Math.max(0,fn>=0?fn:pos-1200);
    const end=Math.min(html.length,pos+2200);
    console.log("===PO_NORMALIZE_CALL_"+index+"===");
    console.log(html.slice(start,end));
    pos+=20;
  }

  for(const marker of ["input[type=\"file\"]","FileReader","arrayBuffer()","DataTransfer","drop"]){
    const i=html.indexOf(marker);
    if(i>=0){
      console.log("===MARKER "+marker+"===");
      console.log(html.slice(Math.max(0,i-1600),Math.min(html.length,i+2600)));
    }
  }
});
