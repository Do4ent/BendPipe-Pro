import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 598: UI fallback validates audit attempt outcome semantics",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptValid\(attempt\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const error=value\.error/);
  assert.match(fn,/const outcomeValid=status==="failed"\?!!error:error===null/);
  assert.match(fn,/&&outcomeValid/);
});
