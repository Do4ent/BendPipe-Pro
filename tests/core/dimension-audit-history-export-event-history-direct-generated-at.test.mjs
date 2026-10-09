import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const domain=fs.readFileSync(path.join(root,"src","domain","measurements","audit-download.mjs"),"utf8");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 918: history validators use canonical generated_at string directly",()=>{
  assert.match(domain,/const generatedAtText=value\.generated_at;/);
  assert.match(ui,/const text=value\.generated_at;const date=new Date\(text\)/);
});
