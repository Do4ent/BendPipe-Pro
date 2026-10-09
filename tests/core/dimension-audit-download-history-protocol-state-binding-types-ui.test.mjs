import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 930-932: UI protocol state and binding use canonical types",()=>{
  assert.match(ui,/typeof value\.protocol_signature!=="string"/);
  assert.match(ui,/typeof value\.validation_signature!=="string"/);
  assert.match(ui,/typeof value\.protocol_state_signature==="string"/);
  assert.match(ui,/value\.protocol_state_signature===dimensionAuditDownloadHistoryProtocolStateSignature\(state\)/);
});
