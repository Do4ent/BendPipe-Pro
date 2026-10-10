import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("PERF-001: DWFx signature telemetry includes link-array traversal",()=>{
  const source=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
  const start=source.indexOf("function referenceSignature(project,geomScale)");
  const finish=source.indexOf("function beforeParentDispose",start);
  assert.ok(start>=0&&finish>start);
  const signature=source.slice(start,finish);
  const timestamp=signature.indexOf("const started=meshNow()");
  const traversal=signature.indexOf("const sourceLinks=(project?.tubes??[]).map");
  const serialization=signature.indexOf("const signature=JSON.stringify");
  const elapsed=signature.indexOf("const elapsed=Math.max(0,meshNow()-started)");
  assert.ok(timestamp>=0&&timestamp<traversal&&traversal<serialization&&serialization<elapsed);
  assert.match(signature,/lastSignatureTimeMs=elapsed/);
  assert.match(signature,/return signature/);
});
