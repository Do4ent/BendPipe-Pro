import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1559: download rebind-audit returns false when dimension is missing",()=>{
  assert.match(ui,/function downloadDimensionRebindAudit\(dimensionId\)\{\s*const dimension=savedDimensions\(\)\.find\([^;]+;\s*if\(!dimension\)return false;/);
});

test("question 1560: download rebind-audit builds snapshot before filename",()=>{
  assert.match(ui,/const snapshot=dimensionRebindAuditSnapshot\(dimension\);\s*const projectName=dimensionAuditFilenamePart/);
});

test("question 1561: rebind-audit filename includes project and dimension identifiers",()=>{
  assert.match(ui,/const stem=projectName\+"-"\+dimensionName\+"-dimension-audit"/);
});

test("question 1562: download rebind-audit delegates JSON download with generated timestamp",()=>{
  assert.match(ui,/return downloadDimensionAuditJson\(dimensionAuditJsonFilename\(stem,snapshot\.generated_at\),snapshot\)/);
});

test("question 1563: copy rebind-audit returns false when dimension is missing",()=>{
  assert.match(ui,/async function copyDimensionRebindAudit\(dimensionId\)\{\s*const dimension=savedDimensions\(\)\.find\([^;]+;\s*if\(!dimension\)return false;/);
});

test("question 1564: copy rebind-audit serializes a formatted snapshot",()=>{
  assert.match(ui,/const text=JSON\.stringify\(dimensionRebindAuditSnapshot\(dimension\),null,2\)/);
});

test("question 1565: copy rebind-audit prefers Clipboard API",()=>{
  assert.match(ui,/if\(navigator\?\.clipboard\?\.writeText\)await navigator\.clipboard\.writeText\(text\)/);
});

test("question 1566: copy rebind-audit keeps textarea fallback",()=>{
  assert.match(ui,/const area=document\.createElement\("textarea"\);area\.value=text;area\.style\.position="fixed";area\.style\.opacity="0"/);
});

test("question 1567: fitted evidence only includes Fitted references",()=>{
  assert.match(ui,/\.filter\(item=>String\(item\.ref\?\.geometry_status\?\?"\"\)==="Fitted"\)/);
});

test("question 1568: fitted evidence returns empty markup when no fitted references exist",()=>{
  assert.match(ui,/if\(!refs\.length\)return "";/);
});

test("question 1569: fitted evidence renders fitting error in mm and degrees",()=>{
  assert.match(ui,/error '\+esc\(auditNumber\(error\?\.mm\)\)\+' mm \/ '\+esc\(auditNumber\(error\?\.deg\)\)\+'°'/);
});

test("question 1570: fitted evidence includes confidence",()=>{
  assert.match(ui,/confidence '\+esc\(auditNumber\(ref\?\.confidence\)\)/);
});

test("question 1571: rebind audit safely normalizes rebound history to an array",()=>{
  assert.match(ui,/const history=Array\.isArray\(dimension\?\.rebound_history\)\?dimension\.rebound_history:\[\]/);
});

test("question 1572: rebind audit returns empty markup without history",()=>{
  assert.match(ui,/if\(!history\.length\)return "";/);
});

test("question 1573: rebind audit deduplicates previous source object ids",()=>{
  assert.match(ui,/const sources=\[\.\.\.new Set\(\(entry\?\.previous_references\?\?\[\]\)\.map\(ref=>String\(ref\?\.object_id\?\?"\"\)\)\.filter\(Boolean\)\)\]/);
});

test("question 1574: rebind audit exposes copy and download controls",()=>{
  assert.match(ui,/data-copy-rebind-audit=.*data-download-rebind-audit/);
});

test("question 1575: dimension search text includes audit geometry class",()=>{
  assert.match(ui,/dimensionAuditGeometryClass\(dimension\),\.\.\.dimensionAuditReviewReasons\(dimension\)/);
});

test("question 1576: dimension search text includes review context state health and blockers",()=>{
  assert.match(ui,/reviewContext\?\.state,reviewContext\?\.health,\.\.\.\(reviewContext\?\.blockers\?\?\[\]\)/);
});

test("question 1577: focused manager mode returns exactly the focused dimension when found",()=>{
  assert.match(ui,/if\(dimensionManagerFocusId\)\{\s*const exact=items\.find\([^;]+;\s*return exact\?\[exact\]:\[\];\s*\}/);
});

test("question 1578: stale filter selects only Stale dimensions",()=>{
  assert.match(ui,/if\(dimensionManagerFilter==="stale"\)result=items\.filter\(dimension=>String\(dimension\?\.status\?\?"\"\)==="Stale"\)/);
});

test("question 1579: rebound filter selects rebound-from-stale dimensions",()=>{
  assert.match(ui,/dimensionManagerFilter==="rebound"\)result=items\.filter\(dimension=>dimension\?\.rebound_from_stale===true\)/);
});

test("question 1580: selected filter uses current selected dimension ids",()=>{
  assert.match(ui,/dimensionManagerFilter==="selected"\)\{\s*const selectedIds=new Set\(selectedDimensionAuditIds\(\)\);\s*result=items\.filter\(dimension=>selectedIds\.has/);
});

test("question 1581: unselected filter excludes current selected dimension ids",()=>{
  assert.match(ui,/dimensionManagerFilter==="unselected"\)\{\s*const selectedIds=new Set\(selectedDimensionAuditIds\(\)\);\s*result=items\.filter\(dimension=>!selectedIds\.has/);
});

test("question 1582: section-derived filter uses section-derived predicate",()=>{
  assert.match(ui,/dimensionManagerFilter==="section-derived"\)result=items\.filter\(isSectionDerivedDimension\)/);
});

test("question 1583: exact filter uses Exact geometry class",()=>{
  assert.match(ui,/dimensionManagerFilter==="exact"\)result=items\.filter\(dimension=>dimensionAuditGeometryClass\(dimension\)==="Exact"\)/);
});

test("question 1584: fitted filter uses Fitted geometry class",()=>{
  assert.match(ui,/dimensionManagerFilter==="fitted"\)result=items\.filter\(dimension=>dimensionAuditGeometryClass\(dimension\)==="Fitted"\)/);
});

test("question 1585: unknown geometry filter uses Unknown geometry class",()=>{
  assert.match(ui,/dimensionManagerFilter==="unknown-geometry"\)result=items\.filter\(dimension=>dimensionAuditGeometryClass\(dimension\)==="Unknown"\)/);
});

test("question 1586: needs-review filter delegates to audit predicate",()=>{
  assert.match(ui,/dimensionManagerFilter==="needs-review"\)result=items\.filter\(dimensionAuditNeedsReview\)/);
});

test("question 1587: review-action filter derives one review context state",()=>{
  assert.match(ui,/dimensionManagerFilter==="review-action"\)\{\s*const reviewContextState=dimensionReviewContextState\(items,selectedDimensionAuditIds\(\)\);\s*result=items\.filter\(dimension=>dimensionReviewContext\(dimension,reviewContextState\)\.action_required===true\);/);
});

test("question 1588: text search uses normalized lowercase search text",()=>{
  assert.match(ui,/const search=String\(dimensionManagerSearch\?\?"\"\)\.trim\(\)\.toLowerCase\(\);\s*if\(search\)\{[^}]*dimensionSearchText\(dimension,reviewContextState\)\.includes\(search\)/);
});
