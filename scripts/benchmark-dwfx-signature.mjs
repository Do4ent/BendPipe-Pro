#!/usr/bin/env node
// Repeatable synthetic benchmark for the conservative DWFx cache signature.
// It measures the actual application function without imposing hardware-dependent
// timing thresholds. No claim that synthetic data equals a customer's CAD file.
import fs from "node:fs";
import vm from "node:vm";
import {performance} from "node:perf_hooks";

const source=fs.readFileSync(new URL("../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
const first=source.indexOf("  const signatureStats=");
const last=source.indexOf("  // Preserve shared imported scene",first);
if(first<0||last<first)throw new Error("DWFx signature extraction anchor missing");
const context={
  meshNow:()=>performance.now(),
  bulkSelected:new Set(),
  window:{},
  revisionSnapshot:()=>({geometry:0,display:0,selection:0})
};
vm.createContext(context);
vm.runInContext(source.slice(first,last)+"\nthis.sign=referenceSignature;",context);

function fixture(nodeCount){
  const nodes=Array.from({length:nodeCount},(_,i)=>({
    id:"node-"+i,visible:true,children:[],
    geometry_instances:[{
      asset_id:"mesh-"+(i%32),status:"exact",
      placement_matrix:[1,0,0,0,0,1,0,0,0,0,1,0,i,0,0,1]
    }]
  }));
  return {
    referenceScenes:[{id:"synthetic",visible:true,tree:nodes}],
    editable_mesh_instances:[],
    tubes:Array.from({length:Math.ceil(nodeCount/4)},(_,i)=>({
      id:"tube-"+i,partNumber:"PART-"+i,
      importEvidence:{part_number:"PART-"+i},
      rows:[{length:100,angle:0}]
    }))
  };
}

const iterations=40;
for(const n of [100,1000,5000]){
  const project=fixture(n);
  for(let i=0;i<5;i++)context.sign(project,1);
  const timings=[];
  let lastSignature="";
  for(let i=0;i<iterations;i++){
    const start=performance.now();
    lastSignature=context.sign(project,1);
    timings.push(performance.now()-start);
  }
  timings.sort((a,b)=>a-b);
  const median=(timings[19]+timings[20])/2;
  const p95=timings[Math.ceil(iterations*0.95)-1];
  const report={
    nodes:n,iterations,
    medianMs:Number(median.toFixed(3)),
    p95Ms:Number(p95.toFixed(3)),
    jsonCharacters:lastSignature.length
  };
  process.stdout.write(JSON.stringify(report)+"\n");
}
