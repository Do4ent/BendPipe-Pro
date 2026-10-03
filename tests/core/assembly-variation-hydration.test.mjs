import test from "node:test";
import assert from "node:assert/strict";

import { hydrateDwfxAssemblyVariationSegments } from "../../src/import/dwfx/assembly-variation-hydration.mjs";

function plan(){
  return {
    status:"exact",source_file:"sample.dwfx",hsf_version:"14.50",
    parts:[
      {part_number:"A",variation_segment:"101",include_library:"?Include Library/1"},
      {part_number:"B",variation_segment:"202",include_library:"?Include Library/2"}
    ]
  };
}

test("A20: exact plan variation segments hydrate by exact segment name",()=>{
  const calls=[];
  const result=hydrateDwfxAssemblyVariationSegments({
    opcode_stream:new Uint8Array(),
    plan:plan(),
    decodeSegment:(_stream,name,options)=>{
      calls.push({name,options});
      return {status:"exact",root_segment_complete:true,entities:[{kind:"segment",name}]};
    }
  });

  assert.equal(result.status,"exact");
  assert.equal(result.hydrated_count,2);
  assert.equal(result.blocked_count,0);
  assert.deepEqual(calls.map((x)=>x.name),["101","202"]);
  assert.equal(calls[0].options.hsfVersion,"14.50");
  assert.equal(calls[0].options.stopAfterRootSegmentClose,true);
  assert.equal(result.parts[0].requires_decoded_variation_segment,false);
  assert.equal(result.parts[0].decoded_variation_segment.status,"exact");
});

test("A20: incomplete exact variation segment remains explicit and is not substituted",()=>{
  const result=hydrateDwfxAssemblyVariationSegments({
    opcode_stream:new Uint8Array(),
    plan:plan(),
    decodeSegment:(_stream,name)=>name==="101"
      ? {status:"exact",root_segment_complete:true,entities:[]}
      : {status:"blocked",root_segment_complete:false,unsupported_variant:"fixture opcode blocker",entities:[]}
  });

  assert.equal(result.status,"partial");
  assert.equal(result.hydrated_count,1);
  assert.equal(result.blocked_count,1);
  assert.equal(result.parts[1].requires_decoded_variation_segment,true);
  assert.equal(result.parts[1].decoded_variation_segment.status,"blocked");
  assert.deepEqual(result.blocked_parts,[{
    part_number:"B",stage:"variation_segment",blocker:"fixture opcode blocker"
  }]);
});

test("A20: decoder exception is isolated to its part",()=>{
  const result=hydrateDwfxAssemblyVariationSegments({
    opcode_stream:new Uint8Array(),
    plan:plan(),
    decodeSegment:(_stream,name)=>{
      if(name==="202") throw new Error("bad segment");
      return {status:"exact",root_segment_complete:true,entities:[]};
    }
  });
  assert.equal(result.status,"partial");
  assert.equal(result.parts[0].requires_decoded_variation_segment,false);
  assert.equal(result.parts[1].decoded_variation_segment,null);
  assert.match(result.blocked_parts[0].blocker,/bad segment/);
});

test("A20: non-exact plan cannot be hydrated through guessed segment IDs",()=>{
  assert.throws(
    ()=>hydrateDwfxAssemblyVariationSegments({
      opcode_stream:new Uint8Array(),
      plan:{status:"blocked",parts:[]}
    }),
    /exact assembly import plan/
  );
});
