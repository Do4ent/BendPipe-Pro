import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 499: standalone build bundles audit download domain module",()=>{
  assert.match(build,/auditDownloadDomainPath = path\.join\(root, "src", "domain", "measurements", "audit-download\.mjs"\)/);
  assert.match(build,/const auditDownloadDomainUrl = moduleDataUrl\(auditDownloadDomainPath\)/);
  assert.match(build,/\.replace\("__TB_AUDIT_DOWNLOAD_MODULE_URL__", auditDownloadDomainUrl\)/);
});
