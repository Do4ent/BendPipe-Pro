import test from "node:test";
import assert from "node:assert/strict";
import {
  createSnapCandidate,
  rankSnapCandidates,
  normalizeSnapSettings
} from "../../src/domain/snapping/snap-engine.mjs";

function candidate(id,source,screen=2){
  return createSnapCandidate({
    id,type:"Endpoint",source,object_id:id,subentity_id:"end",
    point:{x:0,y:0,z:0},screen_distance_px:screen
  });
}

test("question 89: source priority order is configurable",()=>{
  const candidates=[
    candidate("tube","Tube"),
    candidate("source","SourceReference"),
    candidate("editable","Editable")
  ];
  const ranked=rankSnapCandidates(candidates,{
    source_priority:{SourceReference:0,Editable:1,Tube:2}
  });
  assert.deepEqual(ranked.map(x=>x.source),["SourceReference","Editable","Tube"]);
});

test("question 89: individual Snap sources can be disabled",()=>{
  const ranked=rankSnapCandidates([
    candidate("tube","Tube"),
    candidate("source","SourceReference"),
    candidate("mesh","MeshFitted")
  ],{
    source_enabled:{SourceReference:false,MeshFitted:false}
  });
  assert.deepEqual(ranked.map(x=>x.source),["Tube"]);
});

test("question 89: normalized settings preserve explicit source maps",()=>{
  const settings=normalizeSnapSettings({
    source_priority:{Grid:0,Editable:9},
    source_enabled:{Grid:true,Editable:false}
  });
  assert.equal(settings.source_priority.Grid,0);
  assert.equal(settings.source_priority.Editable,9);
  assert.equal(settings.source_enabled.Editable,false);
  assert.equal(settings.source_enabled.Grid,true);
});
