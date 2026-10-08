import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 819: UI fallback download-attempt signature and validation include optional permit evidence",()=>{
  assert.match(ui,/const hasPermitEvidence=value\.export_action!=null/);
  assert.match(ui,/signed\.export_action=String\(value\.export_action\?\?""\)/);
  assert.match(ui,/signed\.action_permit_signature=String\(value\.action_permit_signature\?\?""\)/);
  assert.match(ui,/signed\.action_permit_snapshot_signature=String\(value\.action_permit_snapshot_signature\?\?""\)/);
  assert.match(ui,/\["copy","download"\]\.includes\(String\(value\.export_action\?\?""\)\)/);
  assert.match(ui,/permitEvidenceValid/);
});
