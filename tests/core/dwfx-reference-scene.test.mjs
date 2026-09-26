import test from "node:test";
import assert from "node:assert/strict";

import { parseDwfxObjectTree } from "../../src/import/dwfx/reference-scene.mjs";
import {
  buildDisplayHsfSegmentIndex,
  decodeIndexedDisplaySegment
} from "../../src/import/dwfx/display-segment-index.mjs";

test("DWFx reference object tree preserves nested source Object order",()=>{
  const xml=`<dwf:Content xmlns:dwf="urn:test">
    <dwf:Objects>
      <dwf:Object id="root" label="Assembly">
        <dwf:Object id="a" label="Part A" entityRef="ea"/>
        <dwf:Object id="sub" label="Subassembly">
          <dwf:Object id="b" label="Part B" entityRef="eb"/>
        </dwf:Object>
      </dwf:Object>
    </dwf:Objects>
  </dwf:Content>`;

  const roots=parseDwfxObjectTree(xml);
  assert.equal(roots.length,1);
  assert.equal(roots[0].id,"root");
  assert.deepEqual(
    roots[0].children.map((node)=>node.id),
    ["a","sub"]
  );
  assert.equal(roots[0].children[1].children[0].id,"b");
  assert.equal(roots[0].children[1].children[0].entity_ref,"eb");
});

test("display-only HSF index validates a named segment by synchronized root decode",()=>{
  const name="123";
  const bytes=Uint8Array.of(
    0x28,name.length,...Buffer.from(name,"ascii"),
    0x29
  );
  const index=buildDisplayHsfSegmentIndex(bytes);
  const decoded=decodeIndexedDisplaySegment(bytes,index,name,{hsfVersion:"14.50"});

  assert.equal(decoded.status,"exact_display");
  assert.equal(decoded.root_segment_complete,true);
  assert.equal(decoded.offset,0);
  assert.equal(decoded.entities[0].kind,"segment");
  assert.equal(decoded.entities[0].name,name);
  assert.equal(decoded.production_ready,false);
  assert.equal(decoded.canonical_ready,false);
});

test("display-only HSF index refuses ambiguous duplicate named segments",()=>{
  const one=Uint8Array.of(0x28,1,0x31,0x29);
  const bytes=new Uint8Array(one.length*2);
  bytes.set(one,0);
  bytes.set(one,one.length);

  const index=buildDisplayHsfSegmentIndex(bytes);
  const decoded=decodeIndexedDisplaySegment(bytes,index,"1",{hsfVersion:"14.50"});

  assert.equal(decoded.status,"ambiguous");
  assert.equal(decoded.validated_count,2);
  assert.equal(decoded.production_ready,false);
});
