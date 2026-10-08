import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 610: UI audit history fallback binds and validates protocol state",()=>{
  const signature=ui.match(/function dimensionAuditDownloadAttemptHistoryAuditSignature\(snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const integrity=ui.match(/function dimensionAuditDownloadAttemptHistoryIntegrity\(snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const snapshot=ui.match(/function dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(signature,/protocol_state_signature:String\(value\.protocol_state_signature\?\?""\)/);
  assert.match(integrity,/INVALID_PROTOCOL_STATE/);
  assert.match(integrity,/INVALID_PROTOCOL_STATE_SIGNATURE/);
  assert.match(integrity,/protocol_state_valid:protocolStateValid/);
  assert.match(snapshot,/protocol_state:protocolState/);
  assert.match(snapshot,/protocol_state_signature:dimensionAuditDownloadHistoryProtocolStateSignature\(protocolState\)/);
});
