import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");

test("question 206: Dimension context menu hides generic conflicting actions",()=>{
  assert.match(ui,/if\(profile\.type==="dimension"\)/);
  assert.match(ui,/\["edit-object","transform-object","hide","show","isolate","transparent","delete"\]/);
  assert.match(ui,/if\(button\)button\.hidden=true/);
});
