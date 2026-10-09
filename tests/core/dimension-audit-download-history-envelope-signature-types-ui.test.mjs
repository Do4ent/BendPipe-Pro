import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 938-940: UI envelope validator requires canonical signature types",()=>{
  assert.match(ui,/const embeddedIntegritySignatureValid=typeof value\.integrity_signature==="string"/);
  assert.match(ui,/const embeddedBindingSignatureValid=typeof value\.protocol_binding_signature==="string"/);
  assert.match(ui,/const envelopeSignatureTypeValid=rawEnvelopeSignature==null\|\|typeof rawEnvelopeSignature==="string"/);
});
