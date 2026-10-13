import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const output=path.join(root,"dist","TubeBender_CAD_VC207R7_M1_Standalone.html");

test("question 633: standalone audit module embeds protocol state binding and health APIs",()=>{
  execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root,encoding:"utf8"});
  const html=fs.readFileSync(output,"utf8");
  const marker='data-tubebender-bundled="measurements-ui"';
  const i=html.indexOf(marker);
  assert.ok(i>=0);
  const start=html.lastIndexOf("<script",i);
  const end=html.indexOf("</script>",i);
  const block=html.slice(start,end);
  const match=block.match(/const AUDIT_DOWNLOAD_URL="data:text\/javascript;base64,([^"]+)"/);
  assert.ok(match);
  const moduleText=Buffer.from(match[1],"base64").toString("utf8");
  assert.match(moduleText,/export function dimensionAuditDownloadHistoryProtocolStateValid/);
  assert.match(moduleText,/export function dimensionAuditDownloadHistoryProtocolBinding/);
  assert.match(moduleText,/export function dimensionAuditDownloadHistoryProtocolBindingSignature/);
  assert.match(moduleText,/export function dimensionAuditDownloadHistoryHealth/);
  assert.match(moduleText,/export function dimensionAuditDownloadHistoryHealthSignature/);
});
