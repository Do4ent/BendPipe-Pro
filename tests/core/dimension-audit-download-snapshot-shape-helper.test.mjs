import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 490: Dimension audit snapshot shape validation is centralized",()=>{
  assert.match(ui,/function dimensionAuditDownloadSnapshotShapeSupported\(snapshot\)/);
  assert.match(ui,/typeof snapshot==="object"/);
  assert.match(ui,/!Array\.isArray\(snapshot\)/);
  assert.match(ui,/if\(!dimensionAuditDownloadSnapshotShapeSupported\(snapshot\)\)/);
  assert.match(ui,/dimensionAuditDownloadSnapshotShapeSupported,dimensionAuditDownloadFilenameSupported/);
});
