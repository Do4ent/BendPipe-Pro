import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

function body(name,args="[^)]*"){
  return ui.match(new RegExp("function "+name+"\\("+args+"\\)\\{([\\s\\S]*?)\\n  \\}"))?.[1]??"";
}

test("question 478: all Dimension audit downloads use the bounded JSON filename helper",()=>{
  for(const [name,args] of [
    ["downloadSelectedDimensionAudits",""],
    ["downloadVisibleDimensionAudits",""],
    ["downloadAllDimensionAudits",""],
    ["downloadReviewQueueDimensionAudits",""],
    ["downloadReviewReasonDimensionAudits",""],
    ["downloadDimensionRebindAudit","dimensionId"]
  ]){
    const fn=body(name,args);
    assert.notEqual(fn,"",name+" must exist");
    assert.match(fn,/dimensionAuditJsonFilename\(stem,snapshot\.generated_at\)/,name);
  }
});
