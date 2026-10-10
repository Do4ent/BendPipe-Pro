import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 512: UI consumes canonical audit download protocol state",()=>{
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadProtocolState/);
  assert.match(ui,/protocol_state_schema:String\(protocolState\?\.schema\?\?""\)/);
  assert.match(ui,/protocolConsistent=protocolState\?\.protocol_consistent===true/);
});
