import test from "node:test";
import assert from "node:assert/strict";

import { toolingCandidatesForImportedTube } from "../../src/import/dwfx/imported-tooling-candidates.mjs";

function tube({od=9.525,clrs=[15]}={}){
  return {
    toolingId:null,
    toolingUnresolved:true,
    diameterIndex:null,
    importEvidence:{
      metadata:{
        outer_diameter:{value:od}
      },
      canonicalGeometry:{
        primitives:[
          {type:"LINE"},
          ...clrs.map((clr)=>({type:"BEND",clr:{value:clr}})),
          {type:"LINE"}
        ]
      }
    }
  };
}

test("A20: compatible tooling is listed but never auto-selected",()=>{
  const result=toolingCandidatesForImportedTube(
    tube(),
    [
      {id:"tool-a",mm:9.525,Rb:15},
      {id:"tool-b",mm:9.52,Rb:15},
      {id:"wrong-radius",mm:9.525,Rb:20}
    ]
  );

  assert.equal(result.status,"candidates");
  assert.equal(result.selected_tooling_id,null);
  assert.equal(result.candidates.length,2);
  assert.equal(result.candidates[0].tooling_id,"tool-a");
  assert.equal(result.candidates[0].exact_source_od_match,true);
  assert.equal(result.candidates[0].exact_canonical_clr_match,true);
  assert.equal(result.candidates.some((x)=>x.tooling_id==="wrong-radius"),false);
});

test("A20: nearest diameter outside tolerance is not silently accepted",()=>{
  const result=toolingCandidatesForImportedTube(
    tube({od:12.7,clrs:[20]}),
    [
      {id:"nearest",mm:12.5,Rb:20},
      {id:"wrong-radius",mm:12.7,Rb:19}
    ],
    {od_tolerance_mm:0.02,clr_tolerance_mm:0.05}
  );

  assert.equal(result.status,"unresolved");
  assert.equal(result.selected_tooling_id,null);
  assert.equal(result.candidates.length,0);
});

test("A20: one tool must match every canonical bend CLR for a single-tool tube",()=>{
  const result=toolingCandidatesForImportedTube(
    tube({od:19.05,clrs:[55,55,55]}),
    [
      {id:"exact",mm:19.05,Rb:55},
      {id:"bad",mm:19.05,Rb:54.9}
    ]
  );

  assert.deepEqual(result.canonical_clrs_mm,[55,55,55]);
  assert.deepEqual(result.candidates.map((x)=>x.tooling_id),["exact"]);
  assert.equal(result.selected_tooling_id,null);
});

test("A20: mixed canonical CLR values do not coerce to one tooling radius",()=>{
  const result=toolingCandidatesForImportedTube(
    tube({od:12.7,clrs:[20,25]}),
    [
      {id:"r20",mm:12.7,Rb:20},
      {id:"r25",mm:12.7,Rb:25}
    ]
  );

  assert.equal(result.status,"unresolved");
  assert.equal(result.candidates.length,0);
  assert.equal(result.selected_tooling_id,null);
});

test("A20: missing source OD stays unresolved",()=>{
  const t=tube();
  t.importEvidence.metadata.outer_diameter=null;
  const result=toolingCandidatesForImportedTube(t,[
    {id:"tool",mm:9.525,Rb:15}
  ]);
  assert.equal(result.status,"unresolved");
  assert.equal(result.source_outer_diameter_mm,null);
  assert.equal(result.selected_tooling_id,null);
});

test("A20: candidate helper never mutates tooling assignment fields",()=>{
  const t=tube();
  const before=JSON.stringify(t);
  toolingCandidatesForImportedTube(t,[
    {id:"tool-a",mm:9.525,Rb:15}
  ]);
  assert.equal(JSON.stringify(t),before);
  assert.equal(t.toolingId,null);
  assert.equal(t.toolingUnresolved,true);
  assert.equal(t.diameterIndex,null);
});
