import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 1080-1081: UI envelope builders reject non-array events",()=>{
  const envelopeStart=ui.indexOf("function dimensionAuditDownloadHistoryExportEventLogEnvelope(");
  const envelopeSnapshotStart=ui.indexOf("function dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot(");
  assert.ok(envelopeStart>=0);
  assert.ok(envelopeSnapshotStart>=0);
  assert.match(
    ui.slice(envelopeStart,envelopeStart+700),
    /if\(!Array\.isArray\(events\)\)throw new TypeError\("history export events must be an array"\)/
  );
  assert.match(
    ui.slice(envelopeSnapshotStart,envelopeSnapshotStart+700),
    /if\(!Array\.isArray\(events\)\)throw new TypeError\("history export events must be an array"\)/
  );
});
