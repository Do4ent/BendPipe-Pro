import test from "node:test";
import fs from "node:fs";

const html=fs.readFileSync(
  new URL("../../legacy/VC207R7/TubeBender_CAD_VC207R7_Pixel_Matched_Approved_Interface_Release.html",import.meta.url),
  "utf8"
);

test("diagnostic: bbox project-open controls",()=>{
  const fnPattern=/function\s+([A-Za-z0-9_$]*bbox[A-Za-z0-9_$]*)\s*\(/gi;
  for(const match of html.matchAll(fnPattern)){
    const start=match.index;
    const next=html.indexOf("\nfunction ",start+10);
    console.log("===BBOX_FN "+match[1]+"===");
    console.log(html.slice(start,next>start?Math.min(next,start+6000):start+6000));
  }
  const markers=["poBbox","bboxX","bboxY","bboxZ","Размеры корпуса","размеры корпуса","корпуса","bboxAnchor"];
  for(const marker of markers){
    let pos=0,count=0;
    while((pos=html.indexOf(marker,pos))>=0&&count<8){
      console.log("===MARKER "+marker+"===");
      console.log(html.slice(Math.max(0,pos-1200),Math.min(html.length,pos+2500)));
      pos+=marker.length;count++;
    }
  }
});
